#!/usr/bin/env node
/**
 * Free the app's local dev ports by terminating whatever lingers on them.
 *
 * Ports come from the root docker-compose.yml:
 *   5432 - PostgreSQL
 *   3000 - NestJS API
 *   8100 - Ionic web (Vite)
 *
 * Why this exists: `docker compose up` fails with "address already in use"
 * when a stale process is still bound to one of these ports (a Vite server
 * left behind by a crashed terminal, containers started detached, etc.).
 *
 * What it does:
 *   1. `docker compose down` — cleanly stops this project's containers.
 *      The named volume is preserved, so database data is kept.
 *   2. Finds + kills any remaining HOST processes on those ports (covers
 *      non-Docker dev servers like a plain `npm run dev` in web-trade-crm).
 *      Docker Desktop / daemon processes are never killed directly — after
 *      `docker compose down` they release their ports on their own.
 *
 * Usage: npm run kill-ports
 */
import { execSync } from "node:child_process";

const PORTS = [5432, 3000, 8100];
const isWindows = process.platform === "win32";

// Docker Desktop / daemon processes on macOS/Linux hold forwarded ports on
// behalf of containers. Never kill these: they are Docker itself, not the
// app. After `docker compose down` they release ports on their own.
const DOCKER_PROCESS =
  /com\.docker|dockerd|containerd|docker-proxy|docker(\.exe)?|runc/i;

/** Run a command and return its stdout, or "" on failure. */
function execOut(cmd) {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

/** Run a command that streams output to the terminal; true if it succeeded. */
function execOk(cmd) {
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

/** PIDs of processes listening on the given port. */
function pidsOnPort(port) {
  if (isWindows) {
    // netstat -ano: LISTENING rows end with the owning PID.
    const out = execOut(`netstat -ano | findstr :${port}`);
    return [
      ...new Set(
        out
          .split("\n")
          .filter((line) => line.includes("LISTENING"))
          .map((line) => line.trim().split(/\s+/).pop() || "")
          .filter(Boolean),
      ),
    ];
  }
  // lsof -ti tcp:PORT prints one PID per listening socket to stdout.
  const out = execOut(`lsof -ti tcp:${port}`);
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Process command name for a PID ("" if it can't be resolved). */
function commandName(pid) {
  const out = execOut(`ps -p ${pid} -o comm=`);
  const lines = out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[lines.length - 1] || "";
}

console.log("════ Freeing app ports (5432, 3000, 8100) ════\n");

// 1) Stop project containers first. Containers bind host ports via a Docker
//    proxy, so they must be stopped rather than killed at the host level.
//    This is a no-op when nothing is running.
console.log("> docker compose down");
if (execOk("docker compose down")) {
  console.log("  Containers stopped (no-op if none were running).");
} else {
  console.log("  Could not reach the Docker daemon — continuing with host processes.");
}

// 2) Kill anything still listening on the app ports.
console.log("");
let killedAny = false;
let dockerHeldAny = false;

for (const port of PORTS) {
  const pids = pidsOnPort(port);
  if (pids.length === 0) {
    console.log(`  ✓ port ${port} is free`);
    continue;
  }

  const dockerHeld = [];
  for (const pid of pids) {
    const comm = isWindows ? "" : commandName(pid);
    const display = comm ? `${pid} (${comm})` : pid;

    if (!isWindows && DOCKER_PROCESS.test(comm)) {
      dockerHeld.push(display);
      continue;
    }

    const killer = isWindows ? `taskkill /F /PID ${pid}` : `kill ${pid}`;
    if (execOk(killer)) {
      console.log(`  ✗ port ${port}: terminated ${display}`);
      killedAny = true;
    } else {
      console.warn(
        `  ✗ port ${port}: could not terminate ${display} (need elevated permissions?)`,
      );
    }
  }

  if (dockerHeld.length > 0) {
    dockerHeldAny = true;
    console.log(
      `  ! port ${port}: held by Docker-side process(es) ${dockerHeld.join(", ")}`,
    );
    console.log("    A container from another project may be using this port.");
    console.log(
      "    Find it with `docker ps --format '{{.Names}} {{.Ports}}'`, then stop it,",
    );
    console.log("    or restart Docker Desktop to release forwarded ports.");
  }
}

console.log("");
if (killedAny) {
  console.log("Done. Give Docker a moment to release sockets, then run: npm run dev");
} else if (dockerHeldAny) {
  console.log("Some ports are still held by Docker-side processes — see hints above.");
} else {
  console.log("Nothing held the app ports. Run: npm run dev");
}