#!/usr/bin/env node
/**
 * Start a GitFlow task branch the repeatable way.
 *
 * Aligns the base branch with the remote, then creates the task branch:
 *
 *   1. Refuse to run if the working tree is dirty (unless --force).
 *   2. git fetch origin
 *   3. git checkout <base>             (default: develop)
 *   4. git reset --hard origin/<base>  (discard local drift on the base)
 *   5. git checkout -b <branch>
 *
 * Usage:
 *   npm run branch:start -- feature/add-search
 *   npm run branch:start -- --base=main hotfix/urgent-fix
 *   npm run branch:start -- --force feature/redo
 *
 * Notes:
 *   - `<branch>` is used verbatim (e.g. feature/<short-description>).
 *   - `--force` discards uncommitted changes before starting (use carefully).
 *   - Any unpushed commits on the base branch are discarded by the reset.
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

function parseArgs() {
  let base = "develop";
  let force = false;
  let branch = null;
  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: npm run branch:start -- <branch-name> [--base=<branch>] [--force]\n" +
          "  e.g. npm run branch:start -- feature/add-search\n" +
          "       npm run branch:start -- --base=main hotfix/urgent-fix",
      );
      process.exit(0);
    } else if (arg.startsWith("--base=")) {
      base = arg.slice("--base=".length);
    } else if (arg === "--force") {
      force = true;
    } else if (!arg.startsWith("-")) {
      branch = arg;
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }
  return { base, force, branch };
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

const { base, force, branch } = parseArgs();

if (!branch) {
  console.error(
    "Usage: npm run branch:start -- <branch-name> [--base=<branch>] [--force]\n" +
      "  e.g. npm run branch:start -- feature/add-search\n" +
      "       npm run branch:start -- --base=main hotfix/urgent-fix",
  );
  process.exit(1);
}

console.log(`═══ GitFlow branch start → '${branch}' (base: ${base}) ═══`);

// 1) Working tree must be clean so the reset never eats real work.
const dirty = out("git status --porcelain");
if (dirty && !force) {
  console.error(
    "Working tree is not clean. Commit or stash your changes first (or pass --force to discard them):",
  );
  console.error(dirty.split("\n").slice(0, 10).map((l) => `  ${l}`).join("\n"));
  process.exit(1);
}

// 2) Refuse to reuse an existing local branch.
if (hasRef(`refs/heads/${branch}`)) {
  console.error(`Branch '${branch}' already exists locally. Pick a different name.`);
  process.exit(1);
}

// 3) Sync the base from origin.
run("git fetch origin");
run(`git checkout ${base}`);
run(`git reset --hard origin/${base}`);

// 4) Create the task branch.
run(`git checkout -b ${branch}`);

console.log(`\n✓ On branch '${branch}', based on origin/${base}.`);
