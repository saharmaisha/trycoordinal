export type Discipline = "ARCH" | "STRUCT" | "MEP" | "LS";

export type PackageStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "READY"
  | "FAILED";

export type FindingStatus =
  | "NEW"
  | "CONFIRMED"
  | "DISMISSED"
  | "EXPORTED";

export interface Project {
  id: string;
  name: string;
}

export interface Package {
  id: string;
  projectId: string;
  name: string;
  status: PackageStatus;
  createdAt: string;
}

export interface Document {
  id: string;
  packageId: string;
  discipline: Discipline;
  fileUrl: string;
}

export interface Sheet {
  id: string;
  documentId: string;
  sheetNumber: string | null;
  sheetTitle: string | null;
  pageIndex: number;
  imageUrl: string;
}

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

