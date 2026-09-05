import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Background } from "./components/Background.jsx";
import { Welcome } from "./scenes/Welcome.jsx";
import { Repos } from "./scenes/Repos.jsx";
import { Languages } from "./scenes/Languages.jsx";
import { Outro } from "./scenes/Outro.jsx";
import { SCENES } from "../lib/timeline.js";
import { C, FONT } from "./theme.js";

const FADE = 9;

/** Cross-fades a scene at both ends so cuts land softly on the beat. */
const SceneWrap = ({ duration, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, FADE, duration - FADE, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/** Shown when someone has no public repos yet — better than an empty screen. */
const EmptyNote = ({ emoji, text }) => (
  <AbsoluteFill style={{ fontFamily: FONT, alignItems: "center", justifyContent: "center", gap: 22 }}>
    <div style={{ fontSize: 130 }}>{emoji}</div>
    <div style={{ fontSize: 44, color: C.muted, textAlign: "center", maxWidth: 760 }}>{text}</div>
  </AbsoluteFill>
);

export const ProfileVideo = ({ user, repos = [], languages = [], windowLabel }) => (
  <AbsoluteFill style={{ backgroundColor: C.bg }}>
    <Background />
    <Audio src={staticFile("audio/soundtrack.wav")} />

    <Sequence from={SCENES.welcome.from} durationInFrames={SCENES.welcome.duration}>
      <SceneWrap duration={SCENES.welcome.duration}>
        <Welcome user={user} />
      </SceneWrap>
    </Sequence>

    <Sequence from={SCENES.repos.from} durationInFrames={SCENES.repos.duration}>
      <SceneWrap duration={SCENES.repos.duration}>
        {repos.length ? (
          <Repos repos={repos} />
        ) : (
          <EmptyNote emoji="🌱" text="No public repos yet — the best ones are still ahead." />
        )}
      </SceneWrap>
    </Sequence>

    <Sequence from={SCENES.languages.from} durationInFrames={SCENES.languages.duration}>
      <SceneWrap duration={SCENES.languages.duration}>
        {languages.length ? (
          <Languages languages={languages} windowLabel={windowLabel} />
        ) : (
          <EmptyNote emoji="🤐" text="Not enough recent code to call it — time to push something!" />
        )}
      </SceneWrap>
    </Sequence>

    <Sequence from={SCENES.outro.from} durationInFrames={SCENES.outro.duration}>
      <SceneWrap duration={SCENES.outro.duration}>
        <Outro user={user} />
      </SceneWrap>
    </Sequence>
  </AbsoluteFill>
);
