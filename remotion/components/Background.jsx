import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme.js";

/**
 * The drifting gradient from the website, rebuilt frame-by-frame.
 *
 * CSS animations can't be used here: Remotion renders by seeking to a frame and
 * screenshotting, so every moving value has to be a pure function of `frame`.
 */
export const Background = ({ shift = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps + shift;

  const blobs = [
    { color: C.accent, x: 18 + Math.sin(t * 0.27) * 16, y: 14 + Math.cos(t * 0.21) * 13, size: 82, alpha: 0.36 },
    { color: C.violet, x: 78 + Math.cos(t * 0.19) * 15, y: 26 + Math.sin(t * 0.24) * 14, size: 70, alpha: 0.3 },
    { color: C.teal, x: 46 + Math.sin(t * 0.16 + 1.5) * 20, y: 84 + Math.cos(t * 0.23) * 12, size: 76, alpha: 0.24 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.size}%`,
            height: `${b.size}%`,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: `radial-gradient(circle at 50% 50%, ${b.color}, transparent 66%)`,
            opacity: b.alpha,
          }}
        />
      ))}
      {/* Vignette keeps the centre readable no matter where the blobs drift. */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 50% 45%, transparent 38%, rgba(5,8,12,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
