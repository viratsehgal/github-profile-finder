import React from "react";
import { Composition } from "remotion";
import { ProfileVideo } from "./ProfileVideo.jsx";
import { SAMPLE_DATA } from "./sample-data.js";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "../lib/timeline.js";

export const RemotionRoot = () => (
  <Composition
    id="ProfileVideo"
    component={ProfileVideo}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={SAMPLE_DATA}
  />
);
