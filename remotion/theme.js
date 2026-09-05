/** Palette lifted from the finder page so the video feels like the same product. */
export const C = {
  bg: "#0d1117",
  panel: "#161b22",
  panelSoft: "rgba(22, 27, 34, 0.82)",
  border: "#2b3440",
  text: "#e6edf3",
  muted: "#9aa7b4",
  faint: "#7d8896",
  accent: "#4c8bf5",
  violet: "#9e68f5",
  teal: "#23beb4",
  star: "#e3b341",
};

export const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif';

export { compact } from "../lib/format.js";

/**
 * A little commentary, scaled to how famous the repo is.
 *
 * Several variants per tier, picked by position, so a list of similarly-starred
 * repos doesn't print the same line five times.
 */
const QUIPS = [
  [100_000, ["casually changed computing 🌍", "a genuine piece of history 🏛️", "the whole industry runs on this 🌐"]],
  [10_000, ["certified internet famous ⭐", "everybody's starred this one 🌟", "a bona fide classic 📀"]],
  [1_000, ["a genuine crowd favourite 🔥", "four figures of appreciation 🙌", "people really love this one 💫"]],
  [100, ["quietly excellent ✨", "a well-kept secret 🤫", "punching above its weight 🥊"]],
  [10, ["a solid little gem 💎", "small but mighty 🐜", "doing honest work 🛠️"]],
  [1, ["someone starred it! 🎉", "off the mark 🥳", "the first star is the sweetest ⭐"]],
];

export const repoQuip = (stars, index = 0) => {
  for (const [threshold, options] of QUIPS) {
    if (stars >= threshold) return options[index % options.length];
  }
  return "built with love 💜";
};

/** Headline for the welcome card, based on how long they have been around. */
export const tenureQuip = (createdAt) => {
  const years = (Date.now() - new Date(createdAt).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (years >= 15) return `${Math.floor(years)} years on GitHub. A true veteran 🏛️`;
  if (years >= 10) return `${Math.floor(years)} years of shipping 🚢`;
  if (years >= 5) return `${Math.floor(years)} years deep in the code ⛏️`;
  if (years >= 2) return `${Math.floor(years)} years and counting 📈`;
  if (years >= 1) return "One year in. Just getting started 🌱";
  return "Fresh on the scene 🐣";
};

/** Closing line, because every good video needs a sign-off. */
export const outroQuip = (totalStars) => {
  if (totalStars >= 10_000) return "Absolute legend. 👑";
  if (totalStars >= 1_000) return "Certified builder. 🛠️";
  if (totalStars >= 100) return "Keep shipping! 🚀";
  return "Onwards and upwards! 🌟";
};
