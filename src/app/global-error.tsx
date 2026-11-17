"use client";

/** Shown instead of a blank crash page when the whole site can't load (for example, no database yet). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f7f7f5", color: "#202427", margin: 0 }}>
        <main style={{ maxWidth: 560, margin: "12vh auto", padding: "0 20px" }}>
          <h1 style={{ fontSize: 26 }}>HOGR CO. can’t load right now</h1>
          <p style={{ color: "#5f6468", lineHeight: 1.6 }}>
            The site couldn’t start. If it was just put online, the database is probably not connected yet.
          </p>
          <p style={{ lineHeight: 1.6 }}>
            Open <a href="/api/status" style={{ color: "#a07a3f" }}>/api/status</a> to see what is missing.
          </p>
          {error.digest && <p style={{ color: "#9a9a95", fontSize: 13 }}>Code: {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 12, padding: "10px 18px", borderRadius: 8, border: 0, background: "#202427", color: "#fff", cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
