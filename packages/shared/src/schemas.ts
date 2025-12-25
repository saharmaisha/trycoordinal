import { z } from "zod";

// ============================================================================
// NEW V1 SCHEMAS - Construction Plan Delta Platform
// ============================================================================

// Status Enums
export const PackageStatusSchema = z.enum(["draft", "processing", "ready", "failed"]);
export const JobStatusSchema = z.enum(["pending", "running", "succeeded", "failed"]);
export const JobTypeSchema = z.enum(["render_package", "extract_metadata", "align_sheets", "detect_changes"]);

// Core Domain Schemas
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PackageSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  created_by: z.string().uuid(),
  label: z.string(),
  package_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: PackageStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  package_id: z.string().uuid(),
  discipline: z.string().nullable().optional(),
  original_filename: z.string(),
  storage_path: z.string(),
  page_count: z.number().nullable().optional(),
  created_at: z.string(),
});

export const SheetSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  package_id: z.string().uuid(),
  page_index: z.number(),
  image_path: z.string().nullable().optional(),
  thumb_path: z.string().nullable().optional(),
  width_px: z.number().nullable().optional(),
  height_px: z.number().nullable().optional(),
  sheet_number: z.string().nullable().optional(),
  sheet_title: z.string().nullable().optional(),
  discipline_guess: z.string().nullable().optional(),
  meta_confidence: z.number().nullable().optional(),
  text_extract_path: z.string().nullable().optional(),
  created_at: z.string(),
});

export const JobSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  type: JobTypeSchema,
  status: JobStatusSchema,
  progress: z.number().min(0).max(1),
  payload: z.record(z.any()),
  error: z.string().nullable().optional(),
  logs_path: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

// API Request/Response Schemas
export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const CreatePackageRequestSchema = z.object({
  project_id: z.string().uuid(),
  label: z.string().min(1),
  package_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
});

export const UploadDocumentsResponseSchema = z.object({
  package_id: z.string().uuid(),
  document_ids: z.array(z.string().uuid()),
  job_id: z.string().uuid(),
});

// ============================================================================
// DEPRECATED SCHEMAS - Legacy (kept for compilation)
// ============================================================================

/** @deprecated */
export const FindingStatusSchema = z.enum(["NEW", "CONFIRMED", "DISMISSED", "EXPORTED"]);

/** @deprecated */
export const FindingSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  type: z.enum(["GENERIC_DIFF", "DIM_MISMATCH"]),
  severity: z.enum(["CRITICAL", "MODERATE", "MINOR"]),
  status: FindingStatusSchema,
  sheetLeftId: z.string(),
  sheetRightId: z.string(),
  bboxLeft: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  bboxRight: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  createdAt: z.string(),
});

export type FindingSchemaType = z.infer<typeof FindingSchema>;

