// Hand-in program for make.fun's "Day one, day seven" bounty
// (post-tiktok-day-one-day-seven-20261123-0327).
//
// The entry itself is a TikTok video; this repository only has to name
// it. The program copies VIDEO.json from the repository root into the
// output directory, where the house reads the video's address and goes
// to look at the video itself. Before copying, it checks the file is
// the JSON object the gate expects — nothing more, since the house
// judges the video, never anything this program writes about it.
//
// Locally, MAKEFUN_OUTPUT_DIR points at the output directory; inside
// the grader it defaults to /output:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HAND_IN_FILE = "VIDEO.json";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(repoRoot, HAND_IN_FILE);
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const destPath = join(outputDir, HAND_IN_FILE);

// The gate reads VIDEO.json as a JSON object holding the video's
// address under "url"; fail loudly here rather than hand in a shape
// the house cannot read. An empty url is fine at this stage — the
// address is filled in once the video is posted.
const parsed: unknown = JSON.parse(readFileSync(sourcePath, "utf8"));
if (typeof parsed !== "object" || parsed === null || !("url" in parsed)) {
  throw new Error(`${HAND_IN_FILE} must be a JSON object with a "url" field`);
}

mkdirSync(outputDir, { recursive: true });
copyFileSync(sourcePath, destPath);
console.log(`${HAND_IN_FILE} copied to ${destPath}`);
