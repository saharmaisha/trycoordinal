"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BUCKETS } from "@repo/shared";
import { createSupabaseBrowserClient } from "@repo/db";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Package {
  id: string;
  label: string;
  status: string;
  documents_count: number;
  sheets_count: number;
  created_at: string;
}

interface Sheet {
  id: string;
  document_id: string;
  package_id: string;
  page_index: number;
  image_path: string | null;
  thumb_path: string | null;
  sheet_number: string | null;
  sheet_title: string | null;
  created_at: string;
}

interface Job {
  id: string;
  type: string;
  status: string;
  progress: number;
  error: string | null;
  created_at: string;
}

export default function PackagePage() {
  const params = useParams();
  const packageId = params.id as string;

  const [packageData, setPackageData] = useState<Package | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (packageId) {
      fetchPackageData();
      fetchSheets();
      fetchJobs();

      // Poll for updates while processing
      const interval = setInterval(() => {
        fetchPackageData();
        fetchSheets();
        fetchJobs();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [packageId]);

  const fetchPackageData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/packages/${packageId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch package");
      }
      const data = await response.json();
      setPackageData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchSheets = async () => {
    try {
      const response = await fetch(`${API_URL}/api/packages/${packageId}/sheets`);
      if (!response.ok) {
        throw new Error("Failed to fetch sheets");
      }
      const data = await response.json();
      setSheets(data);
    } catch (err) {
      console.error("Error fetching sheets:", err);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/packages/${packageId}/jobs`);
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }
      const data = await response.json();
      setJobs(data);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFiles || uploadFiles.length === 0) {
      setError("Please select at least one PDF file");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        if (file) {
          formData.append("files", file);
        }
      }

      const response = await fetch(
        `${API_URL}/api/packages/${packageId}/documents/upload`,
        {
          method: "POST",
          headers: {
            "x-user-id": "00000000-0000-0000-0000-000000000000",
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();
      console.log("Upload successful:", result);

      // Reset form
      setUploadFiles(null);
      const fileInput = document.getElementById("files") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Refresh data
      await fetchPackageData();
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const getSheetImageUrl = (sheet: Sheet): string | null => {
    if (!sheet.thumb_path) return null;

    const { data } = supabase.storage
      .from(BUCKETS.SHEET_IMAGES)
      .getPublicUrl(sheet.thumb_path);

    return data.publicUrl;
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
        <p>Loading package...</p>
      </div>
    );
  }

  if (error && !packageData) {
    return (
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
        <p style={{ color: "#c00" }}>{error}</p>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
        <p>Package not found</p>
      </div>
    );
  }

  const latestJob = jobs[0];
  const isProcessing = packageData.status === "processing";

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>{packageData.label}</h1>
        <div style={{ display: "flex", gap: "2rem", color: "#666" }}>
          <span>
            Status:{" "}
            <strong
              style={{
                color:
                  packageData.status === "ready"
                    ? "#0a7e0a"
                    : packageData.status === "processing"
                    ? "#c47900"
                    : packageData.status === "failed"
                    ? "#c00"
                    : "#666",
              }}
            >
              {packageData.status}
            </strong>
          </span>
          <span>
            <strong>{packageData.documents_count}</strong> document(s)
          </span>
          <span>
            <strong>{packageData.sheets_count}</strong> sheet(s)
          </span>
        </div>
      </div>

      {/* Job Status */}
      {latestJob && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "2rem",
            backgroundColor:
              latestJob.status === "succeeded"
                ? "#e6f7e6"
                : latestJob.status === "failed"
                ? "#fee"
                : latestJob.status === "running"
                ? "#fff4e6"
                : "#f0f0f0",
            border: `1px solid ${
              latestJob.status === "succeeded"
                ? "#0a7e0a"
                : latestJob.status === "failed"
                ? "#c00"
                : latestJob.status === "running"
                ? "#c47900"
                : "#ccc"
            }`,
            borderRadius: "6px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>Job: {latestJob.type}</strong>
              <span style={{ marginLeft: "1rem", color: "#666" }}>
                Status: {latestJob.status}
              </span>
            </div>
            <span>{Math.round(latestJob.progress * 100)}%</span>
          </div>
          {latestJob.status === "running" && (
            <div
              style={{
                marginTop: "0.5rem",
                height: "4px",
                backgroundColor: "#ddd",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  backgroundColor: "#0070f3",
                  width: `${latestJob.progress * 100}%`,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}
          {latestJob.error && (
            <p style={{ marginTop: "0.5rem", color: "#c00" }}>
              Error: {latestJob.error}
            </p>
          )}
        </div>
      )}

      {/* Upload Form */}
      {!isProcessing && (
        <form
          onSubmit={handleUpload}
          style={{
            padding: "1.5rem",
            marginBottom: "2rem",
            backgroundColor: "#f9f9f9",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Upload PDFs</h2>

          {error && (
            <div
              style={{
                padding: "1rem",
                marginBottom: "1rem",
                backgroundColor: "#fee",
                border: "1px solid #fcc",
                borderRadius: "4px",
                color: "#c00",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="files"
              style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
            >
              PDF Files
            </label>
            <input
              id="files"
              type="file"
              accept=".pdf"
              multiple
              onChange={(e) => setUploadFiles(e.target.files)}
              disabled={uploading}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
              You can select multiple PDF files
            </p>
          </div>

          <button
            type="submit"
            disabled={uploading || !uploadFiles || uploadFiles.length === 0}
            style={{
              padding: "0.75rem 2rem",
              backgroundColor:
                uploading || !uploadFiles || uploadFiles.length === 0 ? "#ccc" : "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "1rem",
              cursor:
                uploading || !uploadFiles || uploadFiles.length === 0
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "500",
            }}
          >
            {uploading ? "Uploading..." : "Upload & Process"}
          </button>
        </form>
      )}

      {/* Sheets Grid */}
      <div>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem" }}>Sheet Thumbnails</h2>

        {sheets.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#666" }}>
            <p>
              {isProcessing
                ? "Processing... sheets will appear here shortly."
                : "No sheets yet. Upload PDFs to get started!"}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {sheets.map((sheet) => {
              const imageUrl = getSheetImageUrl(sheet);
              return (
                <div
                  key={sheet.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    overflow: "hidden",
                    backgroundColor: "#fff",
                  }}
                >
                  {imageUrl ? (
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        paddingTop: "141.42%",
                        backgroundColor: "#f0f0f0",
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt={sheet.sheet_title || `Page ${sheet.page_index + 1}`}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        paddingTop: "141.42%",
                        backgroundColor: "#f0f0f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ color: "#999" }}>Processing...</span>
                    </div>
                  )}
                  <div style={{ padding: "1rem" }}>
                    <p style={{ margin: 0, fontWeight: "500", fontSize: "0.875rem" }}>
                      {sheet.sheet_number && `Sheet ${sheet.sheet_number}`}
                      {sheet.sheet_number && sheet.sheet_title && " - "}
                      {sheet.sheet_title || `Page ${sheet.page_index + 1}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
