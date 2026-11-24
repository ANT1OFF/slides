// Build check: a deck must be one self-contained file. Fails the build if the output still
// references anything that would be fetched over the network when the deck is opened, and warns
// when the file gets large (usually video).
import type { Plugin } from "vite";

const MB = 1024 * 1024;

// What a browser fetches: src/poster/srcset/data attributes or props, CSS url() and @import, <link href>.
const REMOTE: [RegExp, string][] = [
  [/\b(?:src|poster|srcSet|srcset|data)\s*[:=]\s*\{?\s*["'`]((?:https?:)?\/\/[^"'`\s]+)/g, "src/poster/srcset"],
  // SVG <image>, <use> and <feImage> fetch their href; links (<a href>) don't, so they are left alone.
  [/<(?:image|use|feImage)\b[^>]*\b(?:href|xlink:href)\s*=\s*["']((?:https?:)?\/\/[^"']+)/g, "SVG href"],
  [/["'`](?:image|use|feImage)["'`]\s*,\s*\{[^}]*?\b(?:href|xlinkHref)\s*:\s*["'`]((?:https?:)?\/\/[^"'`\s]+)/g, "SVG href"],
  [/url\(\s*["']?((?:https?:)?\/\/[^"')\s]+)/g, "CSS url()"],
  // A relative url() the build couldn't resolve (e.g. a font file that was deleted) is left as is,
  // and the browser would try to fetch it when the deck opens.
  [/url\(\s*["']?((?!data:|#|%23|https?:|\/\/|blob:)[^"')\s]+)/g, "CSS url() to a file that wasn't found"],
  [/@import\s+(?:url\()?\s*["']((?:https?:)?\/\/[^"']+)/g, "CSS @import"],
  [/<link\b[^>]*\bhref\s*=\s*["']((?:https?:)?\/\/[^"']+)/g, "<link href>"],
  [/<script\b[^>]*\bsrc\s*=\s*["']((?:https?:)?\/\/[^"']+)/g, "<script src>"],
  // A media or font URL anywhere in the code, e.g. from a data file: `<img src={data.values.logo}>`.
  // Links to web pages stay allowed; only files a slide would load are refused.
  [
    /["'`]((?:https?:)?\/\/[^"'`\s]+\.(?:png|jpe?g|gif|webp|avif|svg|mp4|webm|mov|mp3|wav|ogg|m4a|woff2?|ttf|otf))(?:[?#][^"'`\s]*)?["'`]/g,
    "a media or font URL",
  ],
  // A plain path to a media file (e.g. src="/photo.jpg" from public/) is not inlined either.
  [
    /\b(?:src|poster)\s*[:=]\s*["'`]((?!data:|blob:|https?:|\/\/)[^"'`\s]+\.(?:png|jpe?g|gif|webp|avif|svg|mp4|webm|mov|mp3|wav|ogg|m4a))["'`]/g,
    "a file path",
  ],
];

export function selfContained({ warnAtMB = 15 } = {}): Plugin {
  return {
    name: "slides:self-contained",
    apply: "build",
    enforce: "post",
    // After vite-plugin-singlefile has inlined everything into the HTML.
    writeBundle(_options, bundle) {
      const problems: string[] = [];
      for (const [file, chunk] of Object.entries(bundle)) {
        if (!file.endsWith(".html")) {
          // Anything still emitted next to the HTML was not inlined and would be missing.
          problems.push(`${file} was emitted as a separate file instead of being inlined`);
          continue;
        }
        const text = chunk.type === "asset" ? String(chunk.source) : chunk.code;
        for (const [re, what] of REMOTE) {
          for (const m of text.matchAll(re)) {
            problems.push(`${what} points at ${m[1].slice(0, 120)}`);
          }
        }
        const size = Buffer.byteLength(text);
        if (size > warnAtMB * MB) {
          this.warn(`${file} is ${(size / MB).toFixed(1)} MB. Large media is inlined as base64 (+33%); compress or trim it.`);
        }
      }
      if (problems.length) {
        this.error(
          `The deck would not be self-contained:\n  - ${[...new Set(problems)].join("\n  - ")}\n` +
            `Import files instead of linking them (import clip from "./clip.mp4"), so they are inlined into the HTML.\n` +
            `If it's text, such as a code sample that shows a URL, write it so it doesn't look like one: "https:/" + "/example.com".`,
        );
      }
    },
  };
}
