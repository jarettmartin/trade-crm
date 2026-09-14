#!/usr/bin/env node
/**
 * Tag a merged release at its version-bump commit.
 *
 * Run AFTER the `release/vX.Y.Z` PR has merged into `main`:
 *
 *   1. git fetch origin, sync `main` with origin/main.
 *   2. Find the release's version-bump commit
 *      (`chore(release): bump ...`), or use an explicit commit you pass in.
 *   3. Create annotated tags `api-vX.Y.Z` / `web-vX.Y.Z` at that commit —
 *      per GitFlow, the tag points at the release commit itself (in this repo
 *      that's the version bump commit, exactly as `release:start` made it).
 *
 * Only packages the release actually bumped are tagged (inferred from the
 * files the bump commit touched).
 *
 * Usage:
 *   npm run release:tag              # auto-detect the latest bump commit on main
 *   npm run release:tag -- <sha>     # tag at an explicit commit
 *   npm run release:tag -- --dry-run # show what would be tagged, change nothing
 */
import { execSync } from "node:child_process";

/**
 * The git repo this script operates on: the top-level git dir of the current
 * working directory (works from any clone/cwd), falling back to cwd.
 */
function repoRoot() {
  try {
    const root = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
    }).trim();
    if (root) return root;
  } catch {
    /* not a git repo — fall back to cwd */
  }
  return process.cwd();
}

process.chdir(repoRoot());

const args = process.argv.slice(2);

let explicitSha = null;
let dryRun = false;
for (const arg of args) {
  if (arg === "--help" || arg === "-h") {
    console.log(
      "Usage: npm run release:tag [<sha>] [--dry-run]\n" +
        "  Detects the latest 'chore(release): bump' commit on main and tags it.\n" +
        "  Pass an explicit <sha> to tag that commit instead.",
    );
    process.exit(0);
  } else if (arg === "--dry-run") {
    dryRun = true;
  } else if (!arg.startsWith("-")) {
    explicitSha = arg;
  } else {
    console.error(`Unknown option: ${arg}`);
    process.exit(1);
  }
}

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function out(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/** true if a git ref (branch/tag) exists — checked via exit code, not output. */
function hasRef(ref) {
  try {
    execSync(`git rev-parse --verify --quiet ${ref}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

console.log("═══ GitFlow release tagging ═══");

// 1) Sync main from origin.
run("git fetch origin");
run("git checkout main");
run("git reset --hard origin/main");

// 2) Find the bump commit.
let sha;
let logLine;
let autoDetected = false;
if (explicitSha) {
  sha = out(`git rev-parse --verify --quiet ${explicitSha}^{commit}`);
  if (!sha) {
    console.error(`Commit '${explicitSha}' not found.`);
    process.exit(1);
  }
} else {
  logLine = out(
    `git log origin/main --format=%H%x09%s --grep="^chore(release): bump" -1`,
  );
  if (logLine) {
    const [s, subject] = logLine.split("\t");
    sha = s;
    autoDetected = true;
    console.log(`  Bump commit: ${s.slice(0, 12)} — ${subject}`);
  } else {
    sha = out("git rev-parse --verify --quiet origin/main");
    console.warn(
      "  No 'chore(release): bump' commit found in main history — tagging origin/main HEAD instead.\n" +
        "  (This can happen if the release PR was squash-merged. Pass the bump commit explicitly if this is wrong.)",
    );
  }
}

if (autoDetected) {
  // sanity: bump commit must be reachable from main
  let ancestor = true;
  try {
    execSync(`git merge-base --is-ancestor ${sha} main`, { stdio: "ignore" });
  } catch {
    ancestor = false;
  }
  if (!ancestor) {
    console.error(`Bump commit ${sha} is not an ancestor of main.`);
    process.exit(1);
  }
}

// 3) Determine the version + which packages were bumped from that commit.
const subject = logLine ? logLine.split("\t")[1] : "";
const match = subject.match(/\d+\.\d+\.\d+/);
if (!match && !explicitSha) {
  console.error(`Could not parse a SemVer version from: '${subject}'`);
  process.exit(1);
}
const version = match ? match[0] : null;
if (!version) {
  console.error(
    `Could not parse a SemVer version from '${subject}' (or the given commit).`,
  );
  process.exit(1);
}

const touched = out(`git diff-tree --no-commit-id --name-only -r ${sha}`);
const apiBumped = touched.includes("api-trade-crm/package.json");
const webBumped = touched.includes("web-trade-crm/package.json");

const tags = [];
if (apiBumped) tags.push({ tag: `api-v${version}`, label: `API v${version}` });
if (webBumped) tags.push({ tag: `web-v${version}`, label: `Web v${version}` });
if (tags.length === 0) {
  console.error(
    "The bump commit didn't touch api-trade-crm/package.json or web-trade-crm/package.json.",
  );
  process.exit(1);
}

// 4) Create the annotated tags at the bump commit (skip existing).
const created = [];
console.log(`\nTagging at commit ${sha.slice(0, 12)} (v${version}):`);
for (const { tag, label } of tags) {
  if (hasRef(`refs/tags/${tag}`)) {
    console.warn(`  ! tag '${tag}' already exists — skipping`);
    continue;
  }
  if (dryRun) {
    console.log(`  → would create ${tag}  (${label})`);
    continue;
  }
  run(`git tag -a ${tag} ${sha} -m "${label}"`);
  created.push(tag);
}

if (dryRun) {
  console.log("\n(dry run — no tags created)");
  process.exit(0);
}
if (created.length === 0) {
  console.log("\nNo new tags created.");
  process.exit(0);
}

console.log(`\n✓ Tags created: ${created.join(", ")} at ${sha.slice(0, 12)}`);
console.log(`Push them when ready: git push origin ${created.join(" ")}`);
