"use client";

export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#0a0a0a",
          color: "#ffffff",
          fontFamily: "monospace",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          margin: 0,
          textAlign: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "120px",
              fontWeight: "bold",
              lineHeight: 1,
              color: "rgba(248, 113, 113, 0.2)",
            }}
          >
            500
          </div>
          <h1 style={{ fontSize: "24px", marginTop: "16px" }}>
            Critical Error
          </h1>
          <p style={{ fontSize: "14px", color: "#a3a3a3", marginTop: "12px" }}>
            The application encountered a critical error.
          </p>
          {error.digest && (
            <p style={{ fontSize: "10px", color: "#525252", marginTop: "8px" }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "24px",
              padding: "10px 20px",
              background: "#f97316",
              color: "#000",
              border: "none",
              fontSize: "12px",
              fontWeight: "bold",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
