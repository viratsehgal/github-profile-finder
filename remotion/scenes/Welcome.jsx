import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Confetti } from "../components/Confetti.jsx";
import { C, FONT, compact, tenureQuip } from "../theme.js";

export const Welcome = ({ user }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const avatarIn = spring({ frame, fps, config: { damping: 11, mass: 0.9, stiffness: 110 } });
  const nameIn = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const handleIn = spring({ frame: frame - 20, fps, config: { damping: 15 } });
  const quipIn = spring({ frame: frame - 30, fps, config: { damping: 16 } });

  // Long display names shrink to fit rather than wrapping or overflowing.
  const nameSize = Math.min(88, Math.max(38, Math.floor(1560 / Math.max(user.name.length + 3, 9))));

  // A slow breathing pulse on the avatar ring, so the frame never feels static.
  const pulse = 1 + Math.sin(frame / 9) * 0.02;
  const ringSpin = frame * 0.9;

  return (
    <AbsoluteFill style={{ fontFamily: FONT, alignItems: "center", justifyContent: "center", padding: 80 }}>
      <Confetti startFrame={4} count={52} />

      <div style={{ position: "relative", marginBottom: 52, transform: `scale(${avatarIn * pulse})` }}>
        <div
          style={{
            position: "absolute",
            inset: -18,
            borderRadius: "50%",
            background: `conic-gradient(from ${ringSpin}deg, ${C.accent}, ${C.violet}, ${C.teal}, ${C.accent})`,
            filter: "blur(2px)",
          }}
        />
        <Img
          src={user.avatar}
          style={{
            position: "relative",
            width: 320,
            height: 320,
            borderRadius: "50%",
            border: `10px solid ${C.bg}`,
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>

      <div
        style={{
          textAlign: "center",
          opacity: nameIn,
          transform: `translateY(${(1 - nameIn) * 40}px)`,
        }}
      >
        <div style={{ fontSize: 46, fontWeight: 600, color: C.muted, letterSpacing: "-0.01em" }}>Welcome,</div>
        <div
          style={{
            fontSize: nameSize,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            color: C.text,
            lineHeight: 1.08,
            marginTop: 4,
            whiteSpace: "nowrap",
          }}
        >
          {/* A non-breaking space keeps the wave attached to the name. */}
          {user.name}&nbsp;👋
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          fontSize: 42,
          fontWeight: 600,
          color: C.accent,
          opacity: handleIn,
          transform: `translateY(${(1 - handleIn) * 26}px)`,
        }}
      >
        @{user.login}
      </div>

      <div
        style={{
          marginTop: 26,
          fontSize: 34,
          color: C.muted,
          textAlign: "center",
          opacity: quipIn,
          transform: `translateY(${(1 - quipIn) * 20}px)`,
        }}
      >
        {tenureQuip(user.createdAt)}
      </div>

      <div style={{ display: "flex", gap: 22, marginTop: 44, opacity: quipIn }}>
        {[
          ["Followers", user.followers, "👥"],
          ["Repos", user.publicRepos, "📦"],
          ["Stars", user.totalStars, "⭐"],
        ].map(([label, value, emoji], i) => {
          const pop = spring({ frame: frame - 34 - i * 6, fps, config: { damping: 12 } });
          const shown = Math.round(interpolate(pop, [0, 1], [0, value]));
          return (
            <div
              key={label}
              style={{
                background: C.panelSoft,
                border: `1px solid ${C.border}`,
                borderRadius: 22,
                padding: "18px 30px",
                textAlign: "center",
                transform: `scale(${pop})`,
              }}
            >
              <div style={{ fontSize: 44, fontWeight: 800, color: C.text }}>
                {emoji} {compact(shown)}
              </div>
              <div style={{ fontSize: 22, color: C.faint, marginTop: 2 }}>{label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
