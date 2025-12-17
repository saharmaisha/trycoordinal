import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import { createSupabaseServerClient } from "@repo/db";
import type { Discipline } from "@repo/shared";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createSupabaseServerClient();

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// POST /projects
const createProjectSchema = z.object({
  name: z.string().min(1),
});

app.post("/projects", async (req: Request, res: Response) => {
  try {
    const body = createProjectSchema.parse(req.body);
    
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: body.name })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request body", details: error.errors });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /packages
const createPackageSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  compareToPackageId: z.string().uuid().optional(),
});

app.post("/packages", async (req: Request, res: Response) => {
  try {
    const body = createPackageSchema.parse(req.body);
    
    const insertData: Record<string, unknown> = {
      project_id: body.projectId,
      name: body.name,
      status: "UPLOADED",
    };

    if (body.date) {
      insertData.date = body.date;
    }
    if (body.compareToPackageId) {
      insertData.compare_to_package_id = body.compareToPackageId;
    }

    const { data, error } = await supabase
      .from("packages")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request body", details: error.errors });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /documents
const createDocumentSchema = z.object({
  packageId: z.string().uuid(),
  discipline: z.enum(["ARCH", "STRUCT", "MEP", "LS"]),
  pdfFileUrl: z.string().url(),
});

app.post("/documents", async (req: Request, res: Response) => {
  try {
    const body = createDocumentSchema.parse(req.body);
    
    const { data, error } = await supabase
      .from("documents")
      .insert({
        package_id: body.packageId,
        discipline: body.discipline,
        file_url: body.pdfFileUrl,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request body", details: error.errors });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /packages/:id
app.get("/packages/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get the package
    const { data: packageData, error: packageError } = await supabase
      .from("packages")
      .select("*")
      .eq("id", id)
      .single();

    if (packageError || !packageData) {
      return res.status(404).json({ error: "Package not found" });
    }

    // Get document count
    const { count: documentsCount } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("package_id", id);

    // Get sheets count (through documents)
    const { data: documents } = await supabase
      .from("documents")
      .select("id")
      .eq("package_id", id);

    const documentIds = documents?.map((d) => d.id) || [];
    const { count: sheetsCount } = documentIds.length > 0
      ? await supabase
          .from("sheets")
          .select("*", { count: "exact", head: true })
          .in("document_id", documentIds)
      : { count: 0 };

    // Get discrepancies count
    const { count: discrepanciesCount } = await supabase
      .from("discrepancies")
      .select("*", { count: "exact", head: true })
      .eq("package_id", id);

    res.json({
      ...packageData,
      documents_count: documentsCount || 0,
      sheets_count: sheetsCount || 0,
      discrepancies_count: discrepanciesCount || 0,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /packages/:id/run
app.post("/packages/:id/run", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify package exists
    const { data: packageData, error: packageError } = await supabase
      .from("packages")
      .select("id")
      .eq("id", id)
      .single();

    if (packageError || !packageData) {
      return res.status(404).json({ error: "Package not found" });
    }

    // Create job
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        package_id: id,
        job_type: "analyze_package",
        status: "queued",
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

