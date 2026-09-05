import React from "react";
import { AbsoluteFill, Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Confetti } from "../components/Confetti.jsx";
import { C, FONT, compact, outroQuip } from "../theme.js";

export const Outro = ({ user }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 12 } });
  const cardIn = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const tagIn = spring({ frame: frame - 30, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill style={{ fontFamily: FONT, alignItems: "center", justifyContent: "center", padding: 80 }}>
      <Confetti startFrame={2} count={70} />

      <div
        style={{
          fontSize: 96,
          fontWeight: 850,
          letterSpacing: "-0.035em",
          color: C.text,
          opacity: titleIn,
          transform: `scale(${0.85 + titleIn * 0.15})`,
        }}
      >
        That's a wrap! 🎬
      </div>

      <div
        style={{
          marginTop: 44,
          display: "flex",
          alignItems: "center",
          gap: 30,
          background: C.panelSoft,
          border: `1px solid ${C.border}`,
          borderRadius: 32,
          padding: "26px 44px 26px 26px",
          opacity: cardIn,
          transform: `translateY(${(1 - cardIn) * 34}px)`,
        }}
      >
        <Img
          src={user.avatar}
          style={{ width: 130, height: 130, borderRadius: "50%", objectFit: "cover", border: `4px solid ${C.accent}` }}
        />
        <div>
          <div style={{ fontSize: 50, fontWeight: 800, color: C.text }}>@{user.login}</div>
          <div style={{ fontSize: 30, color: C.muted, marginTop: 6 }}>
            ⭐ {compact(user.totalStars)} stars · 📦 {compact(user.publicRepos)} repos
          </div>
        </div>
      </div>

      <div style={{ marginTop: 40, fontSize: 46, fontWeight: 700, color: C.accent, opacity: tagIn }}>
        {outroQuip(user.totalStars)}
      </div>

      <div style={{ marginTop: 22, fontSize: 26, color: C.faint, opacity: tagIn }}>
        made with GitHub Profile Finder
      </div>
    </AbsoluteFill>
  );
};
