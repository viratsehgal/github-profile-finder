import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Card } from "../components/Card.jsx";
import { SceneTitle } from "../components/SceneTitle.jsx";
import { ITEM_DELAY, ITEM_STAGGER } from "../../lib/timeline.js";
import { languageColor, languageEmoji } from "../../lib/languages.js";
import { C, FONT, compact, repoQuip } from "../theme.js";

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

export const Repos = ({ repos }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ fontFamily: FONT, padding: "70px 64px", justifyContent: "center" }}>
      <div style={{ marginBottom: 44 }}>
        <SceneTitle title="Your greatest hits 🎸" subtitle="the repos people actually starred" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {repos.map((repo, i) => {
          const enter = spring({
            frame: frame - ITEM_DELAY - i * ITEM_STAGGER,
            fps,
            config: { damping: 13, mass: 0.8 },
          });
          const color = languageColor(repo.language);
          return (
            <Card
              key={repo.name}
              glow={i === 0 ? C.star : undefined}
              style={{
                opacity: enter,
                transform: `translateX(${(1 - enter) * -70}px) scale(${0.94 + enter * 0.06})`,
              }}
            >
              <div style={{ fontSize: 52, width: 66, flexShrink: 0, textAlign: "center" }}>{MEDALS[i]}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 44,
                    fontWeight: 750,
                    color: C.text,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {repo.name}
                </div>
                <div style={{ fontSize: 26, color: C.muted, marginTop: 6 }}>{repoQuip(repo.stars, i)}</div>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 46, fontWeight: 800, color: C.star }}>⭐ {compact(repo.stars)}</div>
                {repo.language ? (
                  <div
                    style={{
                      fontSize: 24,
                      color: C.muted,
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      justifyContent: "flex-end",
                    }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: color, display: "inline-block" }} />
                    {languageEmoji(repo.language)} {repo.language}
                  </div>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
