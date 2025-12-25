import dotenv from "dotenv";
import { createSupabaseServerClient } from "@repo/db";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import sharp from "sharp";
import { createCanvas, Image } from "canvas";
import {
  TABLES,
  BUCKETS,
  getSheetImagePath,
  THUMBNAIL_MAX_WIDTH,
  RENDER_SCALE,
  type Job,
  type Document,
  type Package as PackageType,
} from "@repo/shared";

// Fix for pdfjs-dist in Node.js environment with node-canvas
// Some PDF features (like patterns) require Image to be globally available
if (typeof global !== 'undefined' && !(global as any).Image) {
  (global as any).Image = Image;
}

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabase = createSupabaseServerClient();
const POLL_INTERVAL = 5000; // 5 seconds

// ============================================================================
// PDF RENDERING UTILITIES
// ============================================================================

/**
 * Downloads a PDF from Supabase storage
 */
async function downloadPdfFromStorage(
  bucketName: string,
  storagePath: string
): Promise<Buffer> {
  console.log(`  📥 Downloading from ${bucketName}/${storagePath}`);

  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download PDF: ${error?.message || "No data"}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Renders a single PDF page to PNG buffer using pdfjs and node-canvas
 */
async function renderPdfPageToPng(
  pdfData: Buffer,
  pageIndex: number
): Promise<{ buffer: Buffer; width: number; height: number }> {
  // Convert Buffer to Uint8Array for pdfjs-dist
  const loadingTask = pdfjsLib.getDocument({ 
    data: new Uint8Array(pdfData),
    disableWorker: true,
    verbosity: 0
  } as any);
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageIndex + 1); // pdfjs uses 1-based indexing

  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvasWidth = Math.floor(viewport.width);
  const canvasHeight = Math.floor(viewport.height);

  // Create a real canvas using node-canvas
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const context = canvas.getContext("2d");

  // Render the page
  const renderContext = {
    canvasContext: context as any,
    viewport,
  };

  try {
    await page.render(renderContext).promise;
  } catch (error) {
    console.warn(`  ⚠️  PDF rendering partial failure, continuing...`, error);
  }

  // Convert canvas to buffer
  const pngBuffer = canvas.toBuffer("image/png");

  return {
    buffer: pngBuffer,
    width: canvasWidth,
    height: canvasHeight,
  };
}

/**
 * Creates a thumbnail from a full-size image buffer
 */
async function createThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(THUMBNAIL_MAX_WIDTH, undefined, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
}

// ============================================================================
// JOB PROCESSING
// ============================================================================

/**
 * Process a single document: render all pages and create sheets
 */
async function processDocument(
  document: Document,
  packageData: PackageType,
  userId: string
): Promise<void> {
  console.log(`  📄 Processing document ${document.id}`);
  console.log(`     File: ${document.original_filename}`);

  // Download PDF from storage
  const pdfData = await downloadPdfFromStorage(
    BUCKETS.RAW_UPLOADS,
    document.storage_path
  );

  // Get page count - convert Buffer to Uint8Array
  const loadingTask = pdfjsLib.getDocument({ 
    data: new Uint8Array(pdfData),
    disableWorker: true,
    verbosity: 0
  } as any);
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  console.log(`     Pages: ${numPages}`);

  // Update document with page count
  await supabase
    .from(TABLES.DOCUMENTS)
    .update({ page_count: numPages })
    .eq("id", document.id);

  // DELETE existing sheets for this document to avoid unique constraint violations on retry
  console.log(`     🧹 Clearing existing sheets for document ${document.id}`);
  const { error: deleteError } = await supabase
    .from(TABLES.SHEETS)
    .delete()
    .eq("document_id", document.id);
  
  if (deleteError) {
    console.warn(`     ⚠️  Failed to clear existing sheets: ${deleteError.message}`);
  }

  // Process each page
  for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
    console.log(`     ├─ Page ${pageIndex + 1}/${numPages}`);

    try {
      // Create sheet record first to get sheet_id
      const { data: sheetData, error: sheetError } = await supabase
        .from(TABLES.SHEETS)
        .insert({
          document_id: document.id,
          package_id: document.package_id,
          page_index: pageIndex,
        })
        .select()
        .single();

      if (sheetError || !sheetData) {
        console.error(`     │  ❌ Failed to create sheet record:`, sheetError);
        continue;
      }

      const sheetId = sheetData.id;

      // Render page to PNG
      const { buffer: pngBuffer, width, height } = await renderPdfPageToPng(
        pdfData,
        pageIndex
      );
      console.log(`     │  🎨 Rendered ${width}x${height}px`);

      // Create thumbnail
      const thumbBuffer = await createThumbnail(pngBuffer);
      console.log(`     │  🖼️  Created thumbnail`);

      // Upload full image
      const imagePath = getSheetImagePath(
        userId,
        packageData.project_id,
        document.package_id,
        sheetId,
        "page"
      );

      const { error: imageUploadError } = await supabase.storage
        .from(BUCKETS.SHEET_IMAGES)
        .upload(imagePath, pngBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (imageUploadError) {
        console.error(`     │  ❌ Image upload failed:`, imageUploadError);
        continue;
      }

      // Upload thumbnail
      const thumbPath = getSheetImagePath(
        userId,
        packageData.project_id,
        document.package_id,
        sheetId,
        "thumb"
      );

      const { error: thumbUploadError } = await supabase.storage
        .from(BUCKETS.SHEET_IMAGES)
        .upload(thumbPath, thumbBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (thumbUploadError) {
        console.error(`     │  ❌ Thumbnail upload failed:`, thumbUploadError);
      }

      // Update sheet with paths and dimensions
      const { error: updateError } = await supabase
        .from(TABLES.SHEETS)
        .update({
          image_path: imagePath,
          thumb_path: thumbPath,
          width_px: width,
          height_px: height,
        })
        .eq("id", sheetId);

      if (updateError) {
        console.error(`     │  ❌ Sheet update failed:`, updateError);
      } else {
        console.log(`     │  ✅ Sheet created successfully`);
      }
    } catch (error) {
      console.error(`     │  ❌ Error processing page ${pageIndex + 1}:`, error);
      // Continue with next page
    }
  }

  console.log(`  ✅ Document ${document.id} complete`);
}

/**
 * Process a render_package job
 */
async function processRenderPackageJob(job: Job): Promise<void> {
  const { packageId } = job.payload;

  if (!packageId) {
    throw new Error("Job payload missing packageId");
  }

  console.log(`📦 Processing package ${packageId}`);

  // Get package data
  const { data: packageData, error: packageError } = await supabase
    .from(TABLES.PACKAGES)
    .select("*")
    .eq("id", packageId)
    .single();

  if (packageError || !packageData) {
    throw new Error(`Package not found: ${packageError?.message}`);
  }

  const userId = packageData.created_by;

  // Update package status
  await supabase
    .from(TABLES.PACKAGES)
    .update({ status: "processing" })
    .eq("id", packageId);

  // Get all documents for this package
  const { data: documents, error: documentsError } = await supabase
    .from(TABLES.DOCUMENTS)
    .select("*")
    .eq("package_id", packageId)
    .order("created_at", { ascending: true });

  if (documentsError) {
    throw new Error(`Failed to fetch documents: ${documentsError.message}`);
  }

  if (!documents || documents.length === 0) {
    throw new Error("No documents found for package");
  }

  console.log(`Found ${documents.length} document(s) to process`);

  // Process each document
  for (let i = 0; i < documents.length; i++) {
    const document = documents[i] as any as Document;
    console.log(`\n[${i + 1}/${documents.length}]`);

    try {
      await processDocument(document, packageData as any, userId);

      // Update job progress
      const progress = (i + 1) / documents.length;
      await supabase
        .from(TABLES.JOBS)
        .update({ progress })
        .eq("id", job.id);
    } catch (error) {
      console.error(`❌ Error processing document ${document.id}:`, error);
      // Continue with next document
    }
  }

  // Update package status to ready
  await supabase
    .from(TABLES.PACKAGES)
    .update({ status: "ready" })
    .eq("id", packageId);

  console.log(`\n✅ Package ${packageId} processing complete\n`);
}

// ============================================================================
// MAIN WORKER LOOP
// ============================================================================

/**
 * Main worker loop: polls for jobs and processes them
 */
async function workerLoop(): Promise<void> {
  console.log("🚀 Worker started, polling for jobs...\n");

  while (true) {
    try {
      // Find a pending job
      const { data: jobs, error: fetchError } = await supabase
        .from(TABLES.JOBS)
        .select("*")
        .eq("status", "pending")
        .eq("type", "render_package")
        .order("created_at", { ascending: true })
        .limit(1);

      if (fetchError) {
        console.error("❌ Error fetching jobs:", fetchError);
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        continue;
      }

      if (!jobs || jobs.length === 0) {
        // No jobs available
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        continue;
      }

      const job = jobs[0] as any as Job;
      console.log(`\n${"=".repeat(60)}`);
      console.log(`🎯 Found job ${job.id}`);
      console.log(`   Type: ${job.type}`);
      console.log(`   Created: ${job.created_at}`);
      console.log(`${"=".repeat(60)}\n`);

      // Mark job as running
      await supabase
        .from(TABLES.JOBS)
        .update({ status: "running", progress: 0 })
        .eq("id", job.id);

      try {
        // Process the job based on type
        if (job.type === "render_package") {
          await processRenderPackageJob(job);
        } else {
          throw new Error(`Unknown job type: ${job.type}`);
        }

        // Mark job as succeeded
        await supabase
          .from(TABLES.JOBS)
          .update({ status: "succeeded", progress: 1 })
          .eq("id", job.id);

        console.log(`✅ Job ${job.id} completed successfully\n`);
      } catch (error) {
        console.error(`❌ Job ${job.id} failed:`, error);

        // Mark job as failed
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        await supabase
          .from(TABLES.JOBS)
          .update({
            status: "failed",
            error: errorMessage,
          })
          .eq("id", job.id);

        // Update package status to failed
        if (job.payload?.packageId) {
          await supabase
            .from(TABLES.PACKAGES)
            .update({ status: "failed" })
            .eq("id", job.payload.packageId);
        }
      }
    } catch (error) {
      console.error("❌ Error in worker loop:", error);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}

// ============================================================================
// START WORKER
// ============================================================================

workerLoop().catch((error) => {
  console.error("💥 Fatal error in worker:", error);
  process.exit(1);
});
