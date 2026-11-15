"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en"><body style={{ fontFamily: "system-ui", background: "#f7f4ee", color: "#121c2b", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
      <div style={{ textAlign: "center", padding: 24 }}><h1>Something went wrong.</h1><button onClick={reset} style={{ marginTop: 16, padding: "10px 18px", background: "#142238", color: "#fff", border: 0, borderRadius: 6 }}>Try again</button></div>
    </body></html>
  );
}
