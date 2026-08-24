import { ImageResponse } from "next/og";
import leakage from "@/results/leakage.json";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MyoDecode: how fast can you read a hand?";

export default function OG() {
  const leaky = leakage.ladder.find((e) => e.scheme === "random_within" && e.model === "td_lda")!;
  const honest = leakage.ladder.find((e) => e.scheme === "loso" && e.model === "td_lda")!;
  const stats: [string, string, string][] = [
    [`${(leaky.accuracy * 100).toFixed(1)}%`, "reported by the naive recipe", "#e0a458"],
    [`${(honest.accuracy * 100).toFixed(1)}%`, "on a person it has never seen", "#3987e5"],
    ["4", "electrodes, 5 gestures, 8 people", "#ffffff"],
  ];

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "space-between", background: "#121211", color: "#ffffff",
        padding: "72px 80px", fontFamily: "sans-serif",
      }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{
            fontSize: 22, letterSpacing: 4, color: "#908e84", textTransform: "uppercase",
            display: "flex",
          }}>
            Surface EMG · gesture decoding
          </div>
          <div style={{ fontSize: 88, lineHeight: 1.05, marginTop: 26, display: "flex", maxWidth: 900 }}>
            How fast can you read a hand?
          </div>
        </div>

        <div style={{ display: "flex", gap: 26 }}>
          {stats.map(([v, l, c]) => (
            <div key={l} style={{
              display: "flex", flexDirection: "column", flex: 1,
              background: "#1a1a19", border: "1px solid #3a3a37", borderRadius: 16, padding: "24px 26px",
            }}>
              <div style={{ fontSize: 52, color: c, display: "flex" }}>{v}</div>
              <div style={{ fontSize: 21, color: "#c3c2b7", marginTop: 10, display: "flex" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
