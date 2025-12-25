import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { z } from "zod";
import { createSupabaseServerClient } from "@repo/db";
import {
  CreateProjectRequestSchema,
  CreatePackageRequestSchema,
  UploadDocumentsResponseSchema,
  TABLES,
  BUCKETS,
  getDocumentStoragePath,
} from "@repo/shared";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Supabase client with service role
const supabase = createSupabaseServerClient();

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// ============================================================================
// PROJECTS
// ============================================================================

// POST /api/projects - Create a new project
app.post("/api/projects", async (req: Request, res: Response) => {
  try {
    const body = CreateProjectRequestSchema.parse(req.body);
    
    // TODO: Get user_id from auth session; for now using a placeholder
    const userId = req.headers["x-user-id"] as string || "00000000-0000-0000-0000-000000000000";
    
    const { data, error } = await supabase
      .from(TABLES.PROJECTS)
      .insert({
        owner_id: userId,
        name: body.name,
        description: body.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request body", details: error.errors });
    }
    console.error("Error in POST /api/projects:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/projects - List all projects (for the user)
app.get("/api/projects", async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string || "00000000-0000-0000-0000-000000000000";

    const { data, error } = await supabase
      .from(TABLES.PROJECTS)
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
      return res.status(400).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error("Error in GET /api/projects:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/projects/:projectId - Get a specific project
app.get("/api/projects/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from(TABLES.PROJECTS)
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error in GET /api/projects/:projectId:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// PACKAGES
// ============================================================================

// POST /api/projects/:projectId/packages - Create a package
app.post("/api/projects/:projectId/packages", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.headers["x-user-id"] as string || "00000000-0000-0000-0000-000000000000";
    
    // Validate project exists
    const { data: project, error: projectError } = await supabase
      .from(TABLES.PROJECTS)
      .select("id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const body = CreatePackageRequestSchema.parse({
      ...req.body,
      project_id: projectId,
    });
    
    const { data, error } = await supabase
      .from(TABLES.PACKAGES)
      .insert({
        project_id: body.project_id,
        created_by: userId,
        label: body.label,
        package_date: body.package_date || null,
        notes: body.notes || null,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating package:", error);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request body", details: error.errors });
    }
    console.error("Error in POST /api/projects/:projectId/packages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/projects/:projectId/packages - List packages for a project
app.get("/api/projects/:projectId/packages", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from(TABLES.PACKAGES)
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching packages:", error);
      return res.status(400).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error("Error in GET /api/projects/:projectId/packages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/packages/:packageId - Get package details with counts
app.get("/api/packages/:packageId", async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;

    const { data: packageData, error: packageError } = await supabase
      .from(TABLES.PACKAGES)
      .select("*")
      .eq("id", packageId)
      .single();

    if (packageError || !packageData) {
      return res.status(404).json({ error: "Package not found" });
    }

    // Get documents count
    const { count: documentsCount } = await supabase
      .from(TABLES.DOCUMENTS)
      .select("*", { count: "exact", head: true })
      .eq("package_id", packageId);

    // Get sheets count
    const { count: sheetsCount } = await supabase
      .from(TABLES.SHEETS)
      .select("*", { count: "exact", head: true })
      .eq("package_id", packageId);

    res.json({
      ...packageData,
      documents_count: documentsCount || 0,
      sheets_count: sheetsCount || 0,
    });
  } catch (error) {
    console.error("Error in GET /api/packages/:packageId:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// DOCUMENT UPLOAD
// ============================================================================

// POST /api/packages/:packageId/documents/upload - Upload PDFs and queue render job
app.post(
  "/api/packages/:packageId/documents/upload",
  upload.array("files"),
  async (req: Request, res: Response) => {
    try {
      const { packageId } = req.params;
      const userId = req.headers["x-user-id"] as string || "00000000-0000-0000-0000-000000000000";
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      // Validate package exists and get project_id
      const { data: packageData, error: packageError } = await supabase
        .from(TABLES.PACKAGES)
        .select("id, project_id")
        .eq("id", packageId)
        .single();

      if (packageError || !packageData) {
        return res.status(404).json({ error: "Package not found" });
      }

      const projectId = packageData.project_id;
      const documentIds: string[] = [];

      // Process each uploaded file
      for (const file of files) {
        if (file.mimetype !== "application/pdf") {
          return res.status(400).json({ error: `File ${file.originalname} is not a PDF` });
        }

        // 1. Check if document with this name already exists in this package
        const { data: existingDoc } = await supabase
          .from(TABLES.DOCUMENTS)
          .select("id")
          .eq("package_id", packageId)
          .eq("original_filename", file.originalname)
          .maybeSingle();

        let documentId: string;

        if (existingDoc) {
          // Reuse existing document ID
          documentId = existingDoc.id;
          console.log(`Reusing existing document record: ${documentId}`);

          // Clear old sheets for this document to prevent duplicates in UI
          await supabase.from(TABLES.SHEETS).delete().eq("document_id", documentId);
        } else {
          // Create new document record
          const { data: docData, error: docError } = await supabase
            .from(TABLES.DOCUMENTS)
            .insert({
              package_id: packageId,
              discipline: req.body.discipline || null,
              original_filename: file.originalname,
              storage_path: "", // Will update after upload
            })
            .select()
            .single();

          if (docError || !docData) {
            console.error("Error creating document:", docError);
            return res.status(400).json({ error: "Failed to create document record" });
          }
          documentId = docData.id;
        }

        // 2. Upload to storage (upsert: true to overwrite if same documentId)
        const storagePath = getDocumentStoragePath(
          userId,
          projectId,
          packageId,
          documentId,
          file.originalname
        );

        const { error: uploadError } = await supabase.storage
          .from(BUCKETS.RAW_UPLOADS)
          .upload(storagePath, file.buffer, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          console.error("Error uploading file:", uploadError);
          if (!existingDoc) {
            await supabase.from(TABLES.DOCUMENTS).delete().eq("id", documentId);
          }
          return res.status(400).json({ error: `Failed to upload ${file.originalname}` });
        }

        // 3. Update document with storage_path
        const { error: updateError } = await supabase
          .from(TABLES.DOCUMENTS)
          .update({ storage_path: storagePath })
          .eq("id", documentId);

        if (updateError) {
          console.error("Error updating document storage_path:", updateError);
        }

        documentIds.push(documentId);
      }

      // Create a render job
      const { data: jobData, error: jobError } = await supabase
        .from(TABLES.JOBS)
        .insert({
          project_id: projectId,
          created_by: userId,
          type: "render_package",
          status: "pending",
          progress: 0,
          payload: { packageId },
        })
        .select()
        .single();

      if (jobError || !jobData) {
        console.error("Error creating job:", jobError);
        return res.status(400).json({ error: "Failed to create render job" });
      }

      // Update package status to processing
      await supabase
        .from(TABLES.PACKAGES)
        .update({ status: "processing" })
        .eq("id", packageId);

      const response = UploadDocumentsResponseSchema.parse({
        package_id: packageId,
        document_ids: documentIds,
        job_id: jobData.id,
      });

      res.status(201).json(response);
    } catch (error) {
      console.error("Error in POST /api/packages/:packageId/documents/upload:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ============================================================================
// SHEETS
// ============================================================================

// GET /api/packages/:packageId/sheets - Get all sheets for a package
app.get("/api/packages/:packageId/sheets", async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;

    const { data: sheets, error: sheetsError } = await supabase
      .from(TABLES.SHEETS)
      .select("*")
      .eq("package_id", packageId)
      .order("document_id", { ascending: true })
      .order("page_index", { ascending: true });

    if (sheetsError) {
      console.error("Error fetching sheets:", sheetsError);
      return res.status(400).json({ error: sheetsError.message });
    }

    res.json(sheets || []);
  } catch (error) {
    console.error("Error in GET /api/packages/:packageId/sheets:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// JOBS
// ============================================================================

// GET /api/packages/:packageId/jobs - Get jobs for a package
app.get("/api/packages/:packageId/jobs", async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;

    // Get project_id from package
    const { data: packageData, error: packageError } = await supabase
      .from(TABLES.PACKAGES)
      .select("project_id")
      .eq("id", packageId)
      .single();

    if (packageError || !packageData) {
      return res.status(404).json({ error: "Package not found" });
    }

    // Get jobs for this project where payload contains packageId
    const { data: jobs, error: jobsError } = await supabase
      .from(TABLES.JOBS)
      .select("*")
      .eq("project_id", packageData.project_id)
      .order("created_at", { ascending: false });

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
      return res.status(400).json({ error: jobsError.message });
    }

    // Filter jobs that reference this packageId in payload
    const relevantJobs = (jobs || []).filter(
      (job: any) => job.payload?.packageId === packageId
    );

    res.json(relevantJobs);
  } catch (error) {
    console.error("Error in GET /api/packages/:packageId/jobs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ API server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL || "not set"}`);
});
