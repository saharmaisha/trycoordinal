// ============================================================================
// CONSTANTS - Storage paths, table names, and configuration
// ============================================================================

// Supabase Table Names
export const TABLES = {
  PROJECTS: "projects",
  PACKAGES: "packages",
  DOCUMENTS: "documents",
  SHEETS: "sheets",
  COMPARISONS: "comparisons",
  SHEET_PAIRS: "sheet_pairs",
  CHANGE_ITEMS: "change_items",
  EXPORTS: "exports",
  JOBS: "jobs",
} as const;

// Supabase Storage Buckets
export const BUCKETS = {
  RAW_UPLOADS: "raw_uploads",
  SHEET_IMAGES: "sheet_images",
  ANALYSIS_ARTIFACTS: "analysis_artifacts",
  EVIDENCE_TILES: "evidence_tiles",
  EXPORTS: "exports",
} as const;

// Storage Path Conventions
export const getDocumentStoragePath = (
  userId: string,
  projectId: string,
  packageId: string,
  documentId: string,
  filename: string
): string => {
  return `${userId}/${projectId}/${packageId}/${documentId}/${filename}`;
};

export const getSheetImagePath = (
  userId: string,
  projectId: string,
  packageId: string,
  sheetId: string,
  imageType: "page" | "thumb"
): string => {
  return `${userId}/${projectId}/${packageId}/${sheetId}/${imageType}.png`;
};

// Thumbnail Configuration
export const THUMBNAIL_MAX_WIDTH = 400;
export const RENDER_SCALE = 2.0;

