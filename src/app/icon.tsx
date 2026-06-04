import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #fe2c55 0%, #25f4ee 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 800,
          fontSize: 110,
          letterSpacing: -6,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        VS
      </div>
    ),
    size
  );
}
