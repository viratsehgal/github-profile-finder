/**
 * Language metadata shared by the finder page, the API and the video.
 *
 * Colours follow GitHub's linguist palette; the emoji and nicknames are ours.
 */

export const LANGUAGES = {
  JavaScript: { color: "#f1e05a", emoji: "🟨" },
  TypeScript: { color: "#3178c6", emoji: "🔷" },
  Python: { color: "#3572A5", emoji: "🐍" },
  Java: { color: "#b07219", emoji: "☕" },
  C: { color: "#555555", emoji: "⚙️" },
  "C++": { color: "#f34b7d", emoji: "🧨" },
  "C#": { color: "#178600", emoji: "🎯" },
  Go: { color: "#00ADD8", emoji: "🐹" },
  Rust: { color: "#dea584", emoji: "🦀" },
  Ruby: { color: "#701516", emoji: "💎" },
  PHP: { color: "#4F5D95", emoji: "🐘" },
  Swift: { color: "#F05138", emoji: "🕊️" },
  Kotlin: { color: "#A97BFF", emoji: "🤖" },
  Dart: { color: "#00B4AB", emoji: "🎯" },
  Shell: { color: "#89e051", emoji: "🐚" },
  HTML: { color: "#e34c26", emoji: "📄" },
  CSS: { color: "#563d7c", emoji: "🎨" },
  SCSS: { color: "#c6538c", emoji: "🎨" },
  Vue: { color: "#41b883", emoji: "💚" },
  Svelte: { color: "#ff3e00", emoji: "🔥" },
  Elixir: { color: "#6e4a7e", emoji: "💧" },
  Erlang: { color: "#B83998", emoji: "☎️" },
  Haskell: { color: "#5e5086", emoji: "🧙" },
  Lua: { color: "#000080", emoji: "🌙" },
  Perl: { color: "#0298c3", emoji: "🐪" },
  Scala: { color: "#c22d40", emoji: "🔺" },
  Clojure: { color: "#db5855", emoji: "🌀" },
  OCaml: { color: "#ef7a08", emoji: "🐫" },
  Julia: { color: "#a270ba", emoji: "🧮" },
  R: { color: "#198CE7", emoji: "📊" },
  MATLAB: { color: "#e16737", emoji: "📐" },
  "Jupyter Notebook": { color: "#DA5B0B", emoji: "📓" },
  Zig: { color: "#ec915c", emoji: "⚡" },
  Nix: { color: "#7e7eff", emoji: "❄️" },
  Assembly: { color: "#6E4C13", emoji: "🔩" },
  "Objective-C": { color: "#438eff", emoji: "📱" },
  Solidity: { color: "#AA6746", emoji: "⛓️" },
  Makefile: { color: "#427819", emoji: "🔧" },
  Dockerfile: { color: "#384d54", emoji: "🐳" },
  PowerShell: { color: "#012456", emoji: "💠" },
  "Vim Script": { color: "#199f4b", emoji: "📝" },
  "Emacs Lisp": { color: "#c065db", emoji: "🧠" },
  TeX: { color: "#3D6117", emoji: "📚" },
  Markdown: { color: "#083fa1", emoji: "📝" },
  Astro: { color: "#ff5a03", emoji: "🚀" },
  Elm: { color: "#60B5CC", emoji: "🌳" },
  Nim: { color: "#ffc200", emoji: "👑" },
  Crystal: { color: "#000100", emoji: "🔮" },
  Groovy: { color: "#4298b8", emoji: "🕺" },
  "F#": { color: "#b845fc", emoji: "🎼" },
};

const FALLBACK = { color: "#8b95a1", emoji: "💾" };

export const languageColor = (name) => (LANGUAGES[name] ?? FALLBACK).color;
export const languageEmoji = (name) => (LANGUAGES[name] ?? FALLBACK).emoji;
export const languageMeta = (name) => LANGUAGES[name] ?? FALLBACK;
