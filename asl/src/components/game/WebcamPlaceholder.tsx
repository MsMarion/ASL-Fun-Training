"use client";

export function WebcamPlaceholder() {
  return (
    <div
      className="flex items-center justify-center rounded-lg border-2 border-dashed"
      style={{
        borderColor: "#22d3ee",
        boxShadow: "0 0 15px rgba(34,211,238,0.3), inset 0 0 15px rgba(34,211,238,0.1)",
        width: "240px",
        height: "180px",
        background: "rgba(34,211,238,0.05)",
      }}
    >
      <span
        className="text-sm font-mono opacity-70"
        style={{ color: "#22d3ee" }}
      >
        WebCam
      </span>
    </div>
  );
}
