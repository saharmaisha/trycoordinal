import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
          Plan Delta
        </h1>
        <p style={{ marginBottom: "2rem", color: "#666", fontSize: "1.1rem" }}>
          Construction Drawing Set Revision Analysis
        </p>

        <div className={styles.ctas}>
          <Link
            href="/projects"
            style={{
              appearance: "none",
              borderRadius: "128px",
              height: "48px",
              padding: "0 24px",
              fontFamily: "var(--font-geist-sans)",
              border: "1px solid transparent",
              transition: "background 0.2s, color 0.2s, border-color 0.2s",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              lineHeight: "20px",
              fontWeight: "500",
              background: "var(--foreground)",
              color: "var(--background)",
              textDecoration: "none",
            }}
          >
            View Projects
          </Link>
        </div>
      </main>
    </div>
  );
}
