import { Finding, FindingSchema } from "@repo/shared";

// Compile-only test to verify @repo/shared imports work
const test: Finding = {
  id: "test",
  packageId: "test",
  type: "DIM_MISMATCH",
  severity: "MODERATE",
  status: "NEW",
  sheetLeftId: "test",
  sheetRightId: "test",
  bboxLeft: [0, 0, 200, 200],
  bboxRight: [0, 0, 200, 200],
  createdAt: new Date().toISOString(),
};

export {};

