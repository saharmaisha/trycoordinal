"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Package {
  id: string;
  label: string;
  package_date: string | null;
  status: string;
  created_at: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPackageLabel, setNewPackageLabel] = useState("");
  const [newPackageDate, setNewPackageDate] = useState("");
  const [newPackageNotes, setNewPackageNotes] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchPackages();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch project");
      }
      const data = await response.json();
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/packages`);
      if (!response.ok) {
        throw new Error("Failed to fetch packages");
      }
      const data = await response.json();
      setPackages(data);
    } catch (err) {
      console.error("Error fetching packages:", err);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/packages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "00000000-0000-0000-0000-000000000000",
        },
        body: JSON.stringify({
          label: newPackageLabel,
          package_date: newPackageDate || undefined,
          notes: newPackageNotes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create package");
      }

      const newPackage = await response.json();
      router.push(`/packages/${newPackage.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
        <p>Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
        <p style={{ color: "#c00" }}>{error || "Project not found"}</p>
        <Link href="/projects" style={{ color: "#0070f3" }}>
          ← Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link href="/projects" style={{ color: "#0070f3", marginBottom: "1rem", display: "inline-block" }}>
          ← Back to Projects
        </Link>
        <h1 style={{ marginBottom: "0.5rem" }}>{project.name}</h1>
        {project.description && (
          <p style={{ color: "#666", marginBottom: "0.5rem" }}>{project.description}</p>
        )}
        <p style={{ color: "#999", fontSize: "0.875rem" }}>
          Created {new Date(project.created_at).toLocaleDateString()}
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem" }}>Drawing Packages</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
          {showCreateForm ? "Cancel" : "New Package"}
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleCreatePackage}
          style={{
            padding: "1.5rem",
            marginBottom: "2rem",
            backgroundColor: "#f9f9f9",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <h3 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Create New Package</h3>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="label" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Package Label *
            </label>
            <input
              id="label"
              type="text"
              value={newPackageLabel}
              onChange={(e) => setNewPackageLabel(e.target.value)}
              required
              disabled={creating}
              placeholder="e.g., Issued for Bid - Rev 3"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "1rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="date" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Package Date
            </label>
            <input
              id="date"
              type="date"
              value={newPackageDate}
              onChange={(e) => setNewPackageDate(e.target.value)}
              disabled={creating}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "1rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="notes" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Notes
            </label>
            <textarea
              id="notes"
              value={newPackageNotes}
              onChange={(e) => setNewPackageNotes(e.target.value)}
              disabled={creating}
              placeholder="Optional notes..."
              rows={3}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "1rem",
                fontFamily: "inherit",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            style={{
              padding: "0.75rem 2rem",
              backgroundColor: creating ? "#ccc" : "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "1rem",
              cursor: creating ? "not-allowed" : "pointer",
              fontWeight: "500",
            }}
          >
            {creating ? "Creating..." : "Create Package"}
          </button>
        </form>
      )}

      {packages.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#666" }}>
          <p>No packages yet. Create your first package to upload drawings!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {packages.map((pkg) => (
            <Link
              key={pkg.id}
              href={`/packages/${pkg.id}`}
              style={{
                display: "block",
                padding: "1.5rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
                textDecoration: "none",
                color: "inherit",
                backgroundColor: "#fff",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#0070f3";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,112,243,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#ddd";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <h3 style={{ marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                    {pkg.label}
                  </h3>
                  {pkg.package_date && (
                    <p style={{ color: "#666", marginBottom: "0.5rem" }}>
                      Date: {new Date(pkg.package_date).toLocaleDateString()}
                    </p>
                  )}
                  <p style={{ color: "#999", fontSize: "0.875rem" }}>
                    Created {new Date(pkg.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "12px",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    backgroundColor:
                      pkg.status === "ready"
                        ? "#e6f7e6"
                        : pkg.status === "processing"
                        ? "#fff4e6"
                        : pkg.status === "failed"
                        ? "#fee"
                        : "#f0f0f0",
                    color:
                      pkg.status === "ready"
                        ? "#0a7e0a"
                        : pkg.status === "processing"
                        ? "#c47900"
                        : pkg.status === "failed"
                        ? "#c00"
                        : "#666",
                  }}
                >
                  {pkg.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

