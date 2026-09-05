import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme.js";

const COLORS = [C.accent, C.violet, C.teal, C.star, "#ff6b9d", "#7ee787"];

/** Deterministic hash -> [0,1). Same particle layout on every render. */
const rnd = (i, salt) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const PARTICLES = Array.from({ length: 70 }, (_, i) => ({
  x: rnd(i, 1) * 100,
  delay: rnd(i, 2) * 26,
  fall: 0.55 + rnd(i, 3) * 1.15,
  spin: (rnd(i, 4) - 0.5) * 26,
  size: 9 + rnd(i, 5) * 13,
  drift: (rnd(i, 6) - 0.5) * 42,
  color: COLORS[Math.floor(rnd(i, 7) * COLORS.length)],
  round: rnd(i, 8) > 0.6,
}));

export const Confetti = ({ startFrame = 0, count = PARTICLES.length }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      {PARTICLES.slice(0, count).map((p, i) => {
        const life = frame - startFrame - p.delay;
        if (life < 0) return null;

        const y = -12 + life * p.fall * 1.5;
        if (y > 118) return null;

        // Fade out over the last stretch of the fall rather than vanishing.
        const opacity = Math.min(1, life / 6) * (y > 88 ? Math.max(0, (118 - y) / 30) : 1);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x + Math.sin(life / 18) * (p.drift / 10)}%`,
              top: `${y}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              borderRadius: p.round ? "50%" : 3,
              backgroundColor: p.color,
              opacity,
              transform: `rotate(${life * p.spin}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
