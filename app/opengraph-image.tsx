import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #07111F 0%, #0C1D35 45%, #16365F 100%)",
          color: "#DCEBFF",
          padding: "54px",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "32px",
            borderRadius: "34px",
            border: "1px solid rgba(255,255,255,0.16)"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "420px",
            height: "420px",
            right: "-120px",
            top: "-80px",
            borderRadius: "999px",
            border: "24px solid rgba(77,163,255,0.72)"
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", zIndex: 1 }}>
          <div style={{ fontSize: 24, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8EA9C9" }}>
            Обучение от тети Аннушки
          </div>
          <div style={{ fontSize: 72, fontWeight: 800, maxWidth: "760px", lineHeight: 1.02 }}>
            Методички по программированию без логина и с быстрыми файлами
          </div>
          <div style={{ fontSize: 28, maxWidth: "760px", color: "#C8DBF4" }}>
            40 модулей, публичные уроки, PDF/CSV/TXT и комментарии с anti-spam защитой.
          </div>
        </div>
      </div>
    ),
    size
  );
}
