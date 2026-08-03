# GitFlow Branching Strategy

This repository follows the **GitFlow** branching model to manage development, releases, and hotfixes in a predictable, production-safe way.

## Branch Overview

| Branch      | Purpose                                            | Base      | Merges Into          |
| ----------- | -------------------------------------------------- | --------- | -------------------- |
| `main`      | Production-ready code. Always releasable.          | —         | —                    |
| `develop`   | Integration branch. All completed work lands here. | `main`    | `main` (via release) |
| `feature/*` | New features / non-urgent work.                    | `develop` | `develop`            |
| `release/*` | Preparing a new production release.                | `develop` | `main` + `develop`   |
| `hotfix/*`  | Urgent production fixes.                           | `main`    | `main` + `develop`   |

```
main:        ────────────────────────●────────────────────────
                                     │
develop:     ────●────────●──────────●────────────────────────
                │        │          │
feature/*:       ●────●   │          │
                         │          │
release/*:               ●──────────●
```

## Workflow Rules

### `main` (Production)

- Contains only production-ready, tested code.
- Every commit on `main` is tagged with a release version (e.g. `api-v0.1.0`, `web-v0.1.0`).
- Never commit directly to `main`. Changes arrive only via `release/*` or `hotfix/*` merges.

### `develop` (Integration)

- Default working branch for day-to-day development.
- Integration point where completed `feature/*` branches are merged.
- Never commit directly to `develop` for production work — always use a `feature/*` branch.

### `feature/*` (New work)

- Branch from: `develop`
- Merge back to: `develop`
- Naming: `feature/<short-description>`, e.g. `feature/invoice-pdf-download`
- A feature branch is for a single logical unit of work. Keep it small and merge promptly to avoid drift.

### `release/*` (Release prep)

- Branch from: `develop`
- Merge to: `main` **and** `develop`
- Naming: `release/v<version>`, e.g. `release/v0.1.0`
- Used to stabilize a release: bump versions, update docs, run final tests, fix release-blocking bugs.
- After merging to `main`, tag the release. Then merge back into `develop` so the version bump is preserved on `develop`.

### `hotfix/*` (Urgent fixes)

- Branch from: `main`
- Merge to: `main` **and** `develop`
- Naming: `hotfix/<short-description>`, e.g. `hotfix/cognito-token-refresh`
- For urgent production fixes that cannot wait for a full release cycle.
- After merging to `main`, tag a patch release. Then merge back into `develop`.

## Versioning

The API and web frontend are **versioned independently** because they are separate deployables with separate release lifecycles:

| Package      | Location         | Version ref    | Tag prefix |
| ------------ | ---------------- | -------------- | ---------- |
| API (NestJS) | `api-trade-crm/` | `package.json` | `api-v`    |
| Web (Ionic)  | `web-trade-crm/` | `package.json` | `web-v`    |

- Semantic Versioning (`MAJOR.MINOR.PATCH`) is used.
- Each package's `package.json` (and `package-lock.json`) holds its version.
- Release tags are prefixed per package so they don't collide in the shared git repo:
  - `api-v0.1.0`, `api-v0.1.1`, `api-v0.2.0`, ...
  - `web-v0.1.0`, `web-v0.1.1`, `web-v0.2.0`, ...
- A single release may cut tags for both packages, or only one — depending on what changed.

## Typical Flow

### 1. Start a feature

```bash
git checkout develop
git checkout -b feature/my-feature
# ... implement, commit ...
```

### 2. Finish a feature (merge into develop)

```bash
git checkout develop
git merge --no-ff feature/my-feature
git branch -d feature/my-feature
```

### 3. Prepare a release

```bash
git checkout -b release/v0.1.0 develop
# ... bump versions, finalize docs, run tests ...
git checkout main
git merge --no-ff release/v0.1.0
git tag api-v0.1.0        # or web-v0.1.0, or both
git tag web-v0.1.0
git checkout develop
git merge --no-ff release/v0.1.0
git branch -d release/v0.1.0
```

### 4. Ship a hotfix

```bash
git checkout -b hotfix/urgent-fix main
# ... fix, commit ...
git checkout main
git merge --no-ff hotfix/urgent-fix
git tag api-v0.1.1
git checkout develop
git merge --no-ff hotfix/urgent-fix
git branch -d hotfix/urgent-fix
```

## Git Tags

List all tags:

```bash
git tag -l
```

Create an annotated tag (preferred — includes message + author):

```bash
git tag -a api-v0.1.0 -m "API v0.1.0"
```

Push tags to remote:

```bash
git push origin --tags
```
