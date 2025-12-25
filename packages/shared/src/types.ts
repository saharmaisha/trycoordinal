// ============================================================================
// NEW V1 DOMAIN MODEL - Construction Plan Delta Platform
// ============================================================================

// Enums and Status Types
export type PackageStatus = "draft" | "processing" | "ready" | "failed";
export type JobStatus = "pending" | "running" | "succeeded" | "failed";
export type JobType = "render_package" | "extract_metadata" | "align_sheets" | "detect_changes";
export type ComparisonStatus = "draft" | "processing" | "ready" | "failed";
export type PairingStatus = "auto" | "manual" | "confirmed" | "rejected";
export type ReviewerState = "pending" | "confirmed" | "dismissed";
export type ExportType = "rfi_pdf" | "csv" | "json";

// Core Domain Types
export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  project_id: string;
  created_by: string;
  label: string;
  package_date: string | null;
  notes: string | null;
  status: PackageStatus;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  package_id: string;
  discipline: string | null;
  original_filename: string;
  storage_path: string;
  page_count: number | null;
  created_at: string;
}

export interface Sheet {
  id: string;
  document_id: string;
  package_id: string;
  page_index: number;
  image_path: string | null;
  thumb_path: string | null;
  width_px: number | null;
  height_px: number | null;
  sheet_number: string | null;
  sheet_title: string | null;
  discipline_guess: string | null;
  meta_confidence: number | null;
  text_extract_path: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  project_id: string | null;
  created_by: string | null;
  type: JobType;
  status: JobStatus;
  progress: number;
  payload: Record<string, any>;
  error: string | null;
  logs_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comparison {
  id: string;
  project_id: string;
  created_by: string;
  old_package_id: string;
  new_package_id: string;
  status: ComparisonStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DEPRECATED - Legacy types from old workflow (kept for compilation)
// DO NOT USE IN NEW CODE - Will be removed in future cleanup
// ============================================================================

/** @deprecated Use new domain model instead */
export type FindingStatus = "NEW" | "CONFIRMED" | "DISMISSED" | "EXPORTED";

/** @deprecated Use Sheet.sheet_number instead */
export interface Finding {
  id: string;
  packageId: string;
  type: "GENERIC_DIFF" | "DIM_MISMATCH";
  severity: "CRITICAL" | "MODERATE" | "MINOR";
  status: FindingStatus;
  sheetLeftId: string;
  sheetRightId: string;
  bboxLeft: [number, number, number, number];
  bboxRight: [number, number, number, number];
  createdAt: string;
}

