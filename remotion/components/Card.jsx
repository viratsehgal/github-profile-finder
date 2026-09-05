import React from "react";
import { C } from "../theme.js";

/** The frosted panel used for every list row, matching the site's cards. */
export const Card = ({ children, style, glow }) => (
  <div
    style={{
      background: C.panelSoft,
      border: `1px solid ${glow ?? C.border}`,
      borderRadius: 26,
      padding: "26px 32px",
      display: "flex",
      alignItems: "center",
      gap: 26,
      boxShadow: glow
        ? `0 0 0 1px ${glow}22, 0 18px 50px rgba(0,0,0,0.45)`
        : "0 18px 50px rgba(0,0,0,0.4)",
      ...style,
    }}
  >
    {children}
  </div>
);
