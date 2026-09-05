import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../theme.js";

/** The heading that springs in at the top of each scene. */
export const SceneTitle = ({ title, subtitle, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame: frame - delay, fps, config: { damping: 13, mass: 0.7 } });
  // Long headings would otherwise wrap and shove the list off the bottom.
  const size = title.length > 26 ? 62 : title.length > 20 ? 70 : 78;
  const subEnter = spring({ frame: frame - delay - 7, fps, config: { damping: 15, mass: 0.8 } });

  return (
    <div style={{ textAlign: "center", fontFamily: FONT }}>
      <div
        style={{
          fontSize: size,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: C.text,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 46}px) scale(${0.9 + enter * 0.1})`,
          lineHeight: 1.1,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            marginTop: 14,
            fontSize: 34,
            fontWeight: 500,
            color: C.muted,
            opacity: subEnter,
            transform: `translateY(${(1 - subEnter) * 22}px)`,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
};
