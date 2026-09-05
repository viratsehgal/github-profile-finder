import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneTitle } from "../components/SceneTitle.jsx";
import { ITEM_DELAY, ITEM_STAGGER } from "../../lib/timeline.js";
import { languageColor, languageEmoji } from "../../lib/languages.js";
import { C, FONT } from "../theme.js";

export const Languages = ({ languages, windowLabel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const widest = Math.max(...languages.map((l) => l.percent), 1);

  return (
    <AbsoluteFill style={{ fontFamily: FONT, padding: "70px 70px", justifyContent: "center" }}>
      <div style={{ marginBottom: 52 }}>
        <SceneTitle title="What you've been speaking 🗣️" subtitle={windowLabel} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {languages.map((lang, i) => {
          const delay = ITEM_DELAY + i * ITEM_STAGGER;
          const enter = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.8 } });
          // The bar grows on its own, slightly slower curve than the row fade-in.
          const grow = spring({ frame: frame - delay - 3, fps, config: { damping: 18, mass: 1.1 } });
          const width = (lang.percent / widest) * 100 * grow;
          const shownPercent = interpolate(grow, [0, 1], [0, lang.percent]);
          const color = languageColor(lang.name);

          return (
            <div key={lang.name} style={{ opacity: enter, transform: `translateX(${(1 - enter) * -50}px)` }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 40, fontWeight: 700, color: C.text }}>
                  {languageEmoji(lang.name)} {lang.name}
                </div>
                <div style={{ fontSize: 38, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
                  {shownPercent.toFixed(1)}%
                </div>
              </div>
              <div style={{ height: 30, borderRadius: 15, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${width}%`,
                    height: "100%",
                    borderRadius: 15,
                    background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                    boxShadow: `0 0 26px ${color}66`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
