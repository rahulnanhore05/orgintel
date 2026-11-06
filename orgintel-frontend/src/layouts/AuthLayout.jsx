import { Outlet } from "react-router-dom";
import { ToastContainer } from "../components/feedback/ToastContainer";
import orgIntelLogo from "../assets/OrgIntelLogo.png";

export function AuthLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-app)",
        backgroundImage:
          "radial-gradient(circle at 50% 0%, #eff6ff 0%, #f8fafc 60%)",
      }}
    >
      <header
        style={{
          padding: "var(--space-6) var(--space-8)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <div
          onClick={() => navigate(ROUTES.DOCUMENTS)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            cursor: "pointer",
          }}
          aria-label="Go to Documents Dashboard"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              navigate(ROUTES.DOCUMENTS);
            }
          }}
        >
          <img
            src={orgIntelLogo}
            alt="OrgIntel Logo"
            style={{
              height: "32px",
              width: "auto",
              display: "block",
              objectFit: "contain",
            }}
          />
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-6)",
        }}
      >
        <div style={{ maxWidth: 440, width: "100%" }}>
          <Outlet />
        </div>
      </main>

      <footer
        style={{
          padding: "var(--space-4)",
          textAlign: "center",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          borderTop: "1px solid var(--border-light)",
        }}
      >
        OrgIntel &bull; Enterprise Document Intelligence Platform &bull; Strict
        Grounding & Multi-Tenancy
      </footer>

      <ToastContainer />
    </div>
  );
}
