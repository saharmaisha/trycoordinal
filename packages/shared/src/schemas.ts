import { z } from "zod";
import type { Finding } from "./types";

export const DisciplineSchema = z.enum(["ARCH", "STRUCT", "MEP", "LS"]);

export const PackageStatusSchema = z.enum([
  "UPLOADED",
  "PROCESSING",
  "READY",
  "FAILED",
]);

export const FindingStatusSchema = z.enum([
  "NEW",
  "CONFIRMED",
  "DISMISSED",
  "EXPORTED",
]);

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const PackageSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  status: PackageStatusSchema,
  createdAt: z.string(),
});

export const DocumentSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  discipline: DisciplineSchema,
  fileUrl: z.string(),
});

export const SheetSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  sheetNumber: z.string().nullable(),
  sheetTitle: z.string().nullable(),
  pageIndex: z.number(),
  imageUrl: z.string(),
});

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

