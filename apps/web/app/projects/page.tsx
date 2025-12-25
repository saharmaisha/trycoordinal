"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        headers: {
          "x-user-id": "00000000-0000-0000-0000-000000000000", // TODO: Replace with real auth
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "00000000-0000-0000-0000-000000000000", // TODO: Replace with real auth
        },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      const newProject = await response.json();
      
      // Navigate to the new project
      router.push(`/projects/${newProject.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ marginBottom: "0.5rem" }}>Projects</h1>
          <p style={{ color: "#666" }}>Manage your construction drawing projects</p>
        </div>
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
          {showCreateForm ? "Cancel" : "New Project"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1.5rem",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "6px",
            color: "#c00",
          }}
        >
          {error}
        </div>
      )}

      {showCreateForm && (
        <form
          onSubmit={handleCreateProject}
          style={{
            padding: "1.5rem",
            marginBottom: "2rem",
            backgroundColor: "#f9f9f9",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Create New Project</h2>
          
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="name" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Project Name *
            </label>
            <input
              id="name"
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              required
              disabled={creating}
              placeholder="e.g., Downtown Office Tower"
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
            <label htmlFor="description" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Description
            </label>
            <textarea
              id="description"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              disabled={creating}
              placeholder="Optional project description..."
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
            {creating ? "Creating..." : "Create Project"}
          </button>
        </form>
      )}

      {projects.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#666" }}>
          <p>No projects yet. Create your first project to get started!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
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
              <h3 style={{ marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                {project.name}
              </h3>
              {project.description && (
                <p style={{ color: "#666", marginBottom: "0.5rem" }}>
                  {project.description}
                </p>
              )}
              <p style={{ color: "#999", fontSize: "0.875rem" }}>
                Created {new Date(project.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

