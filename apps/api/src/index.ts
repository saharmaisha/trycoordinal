import { Finding, FindingSchema } from "@repo/shared";

// Compile-only test to verify @repo/shared imports work
const test: Finding = {
  id: "test",
  packageId: "test",
  type: "GENERIC_DIFF",
  severity: "CRITICAL",
  status: "NEW",
  sheetLeftId: "test",
  sheetRightId: "test",
  bboxLeft: [0, 0, 100, 100],
  bboxRight: [0, 0, 100, 100],
  createdAt: new Date().toISOString(),
};

export {};

