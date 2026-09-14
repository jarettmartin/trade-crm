#!/usr/bin/env node
/**
 * Start a GitFlow release branch the repeatable way.
 *
 *   1. Sync `develop` with origin and create `release/v<version>`.
 *   2. Bump the version(s) in api-trade-crm/ and/or web-trade-crm/
 *      (package.json + package-lock.json) — version bumps happen on release
 *      branches, never on feature branches.
 *   3. Commit the bump: `chore(release): bump versions to <version>`.
 *
 * The bump commit on the release branch is exactly the commit the release
 * git tags (`api-v<version>` / `web-v<version>`) will point at afterwards
 * (see `npm run release:tag`).
 *
 * Bumps the API and web packages together by default (the project's
 * established release pattern). Pass `--api-only` or `--web-only` if only one
 * deployable changed.
 *
 * Usage:
 *   npm run release:start                 # next minor, e.g. 0.4.0
 *   npm run release:start -- 0.5.0        # explicit version
 *   npm run release:start -- --patch      # next patch, e.g. 0.3.1
 *   npm run release:start -- --major      # next major, e.g. 1.0.0
 *   npm run release:start -- --web-only   # bump only the web package
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

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

const ROOT = repoRoot();
process.chdir(ROOT);

const args = process.argv.slice(2);

function parseArgs() {
  let type = "minor";
  let explicit = null;
  let api = true;
  let web = true;
  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: npm run release:start [version] [--patch | --minor | --major] [--api-only | --web-only]",
      );
      process.exit(0);
    } else if (arg === "--patch") {
      type = "patch";
    } else if (arg === "--minor") {
      type = "minor";
    } else if (arg === "--major") {
      type = "major";
    } else if (arg === "--api-only") {
      web = false;
    } else if (arg === "--web-only") {
      api = false;
    } else if (!arg.startsWith("-")) {
      explicit = arg;
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }
  return { type, explicit, api, web };
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

function readVersion(pkg) {
  return JSON.parse(readFileSync(path.join(ROOT, pkg, "package.json"), "utf8"))
    .version;
}

function bumpVersion(v, type) {
  const [maj, min, pat] = v.split(".").map(Number);
  if (type === "patch") return `${maj}.${min}.${pat + 1}`;
  if (type === "major") return `${maj + 1}.0.0`;
  return `${maj}.${min + 1}.0`;
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

const { type, explicit, api, web } = parseArgs();

if (!api && !web) {
  console.error("--api-only and --web-only can't both be set.");
  process.exit(1);
}

// Decide the version. Reference the api package by default (the project bumps
// both deployables together); use the web package when only web is included.
const reference = api ? "api-trade-crm" : "web-trade-crm";
const current = readVersion(reference);
const version = explicit ?? bumpVersion(current, type);

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid SemVer version: '${version}'`);
  process.exit(1);
}

const which = api && web ? "versions" : api ? "api version" : "web version";
const commitMessage = `chore(release): bump ${which} to ${version}`;
const releaseBranch = `release/v${version}`;

console.log(`═══ GitFlow release start → ${releaseBranch} (from ${current}) ═══`);

// 1) Working tree must be clean.
const dirty = out("git status --porcelain");
if (dirty) {
  console.error("Working tree is not clean. Commit or stash your changes first.");
  console.error(dirty.split("\n").slice(0, 10).map((l) => `  ${l}`).join("\n"));
  process.exit(1);
}

// 2) Refuse to re-open an existing branch or tag.
if (hasRef(`refs/heads/${releaseBranch}`)) {
  console.error(`Branch '${releaseBranch}' already exists.`);
  process.exit(1);
}
if (api && hasRef(`refs/tags/api-v${version}`)) {
  console.error(`Tag 'api-v${version}' already exists — pick a new version.`);
  process.exit(1);
}
if (web && hasRef(`refs/tags/web-v${version}`)) {
  console.error(`Tag 'web-v${version}' already exists — pick a new version.`);
  process.exit(1);
}

// 3) Sync develop from origin, then branch off it.
run("git fetch origin");
run("git checkout develop");
run("git reset --hard origin/develop");
run(`git checkout -b ${releaseBranch}`);

// 4) Bump versions in code (no extra git commit by npm itself).
for (const pkg of [api && "api-trade-crm", web && "web-trade-crm"]) {
  if (!pkg) continue;
  console.log(`> npm version --no-git-tag-version ${version} (in ${pkg})`);
  execSync(`npm version --no-git-tag-version ${version}`, {
    cwd: path.join(ROOT, pkg),
    stdio: "inherit",
  });
}

// 5) Commit the bump. This commit is what the release tags will reference.
run("git add -A");
run(`git commit -m "${commitMessage}"`);
const bumpSha = out("git rev-parse HEAD") || "this commit";

console.log(`\n✓ Release branch '${releaseBranch}' ready — bump commit ${bumpSha}`);
console.log("  That commit is the one the release tags will point at.");
console.log("");
console.log(`Next steps for the user:`);
console.log(`  1. git push -u origin ${releaseBranch}   (then open a PR: ${releaseBranch} → main)`);
console.log(`  2. After the PR merges: npm run release:tag  (tags api-v${version} / web-v${version} at the bump commit)`);
console.log(`  3. Open a second PR: ${releaseBranch} → develop (keeps the version bump on develop)`);
console.log(`  4. If this version should be deployed: ./scripts/deploy.sh  (+ ./scripts/deploy-frontend.sh)`);
