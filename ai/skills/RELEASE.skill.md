# Release Skill

Cutting and shipping a Sprout CRM release: version bump → release PRs → tags →
deploy. In the SDLC this is **step 6** (`../CONTEXT.md`) — it runs after a
feature/fix PR has merged into `develop`.

**Load this skill** when the task is to release, ship, deploy, tag, bump a
version, or roll one back.

Related docs: `docs/GITFLOW.md` (branch model + tagging), `docs/CONTRIBUTING.md`
(commits), `../CONTEXT.md` (SDLC workflow, production infrastructure).

## Preconditions

- The work is merged: feature/fix → `develop`, hotfix → `main`.
- Local checks green on the merged code:
  - API (`api-trade-crm/`): `npm test`, `npm run build`
  - Web (`web-trade-crm/`): `npm run test.unit`, `npm run build`
- Clean working tree. The scripts below fetch and reset the base branch
  themselves — don't hand-roll those git steps.
- **The release only contains what is on `origin/develop`.** `release:start`
  resets `develop` to `origin/develop`, so unpushed commits there — and work
  sitting on unmerged local branches — are silently left out of the release.
  Push and merge first.
- **Agents never push or merge** — unless the user explicitly asks for a specific
  push as part of this flow (pushing the release tags, say). By default: prepare
  everything, verify it, then hand the user the exact commands.

## 1. Decide the version

API and web are versioned **independently** (SemVer in each `package.json`) and
tagged per package (`api-vX.Y.Z` / `web-vX.Y.Z`), because they are separate
deployables.

Read the truth from the code — never from a doc that can drift:

```bash
node -p "require('./api-trade-crm/package.json').version"
node -p "require('./web-trade-crm/package.json').version"
git tag -l | tail
```

- Bump api + web **together** by default (the established pattern). Use
  `--api-only` / `--web-only` when only one deployable changed.
- Size: `--patch` for a fix, minor (the default) for a feature, `--major` for a
  breaking change.
- Versions are bumped **only** on a `release/*` branch — never on a feature
  branch.

## 2. Start the release

```bash
npm run release:start                    # next minor, e.g. 0.4.0 → 0.5.0
npm run release:start -- 0.5.0           # explicit version
npm run release:start -- --patch         # next patch, e.g. 0.4.1
npm run release:start -- --web-only      # only the web deployable
```

It syncs `develop` with origin, creates `release/vX.Y.Z`, bumps the version(s) in
code (`package.json` + `package-lock.json`), and commits
`chore(release): bump versions to X.Y.Z`.

**The bump commit is exactly what the release tags will point at** — don't
amend, rebase, or squash it away.

- **Stabilising the release?** Add those commits (final docs, release-blocking
  fixes) before opening the PRs — but be aware they land *after* the bump, so the
  tagged commit is no longer the tip of `main`. That's accepted here (the tag
  anchors the version, and `release:tag` only ever tags the bump commit); if a
  post-bump fix genuinely must be covered by the tag, create it by hand instead
  (step 4).
- **Wrong version?** The script refuses to reuse an existing `release/vX.Y.Z`
  branch. Delete it — `git checkout develop && git branch -D release/vX.Y.Z`
  (plus the remote branch, if you already pushed it) — and run `release:start`
  again.

## 3. Get it merged (two PRs)

Hand the user:

```bash
git push -u origin release/vX.Y.Z
```

- **PR 1** — `release/vX.Y.Z → main` (use `.github/PULL_REQUEST_TEMPLATE.md`).
- **PR 2** — `release/vX.Y.Z → develop`, so the version bump stays on `develop`.
  Skip it and the next release starts from a stale version.

## 4. Tag the release

After PR 1 merges to `main`:

```bash
npm run release:tag -- --dry-run         # show what would be tagged (safe)
npm run release:tag                      # tags the bump commit on main
git push origin api-vX.Y.Z web-vX.Y.Z    # the script prints the exact command
```

- The script syncs `main`, finds the latest `chore(release): bump` commit, and
  creates annotated `api-vX.Y.Z` / `web-vX.Y.Z` tags — only for the packages that
  bump commit touched. Tags that already exist are skipped.
- If it can't find or parse a bump commit (the release PR was **squash-merged**,
  or you're tagging a hotfix with no bump commit), tag by hand — keeping the tag
  on a commit that is an ancestor of `main`:

```bash
git tag -a api-vX.Y.Z <sha> -m "API vX.Y.Z"
git tag -a web-vX.Y.Z <sha> -m "Web vX.Y.Z"
```

## 5. Deploy (optional)

Skipping the deploy is fine — but then don't tag the release as shipped.

**API (Lightsail):**

```bash
cp .env.production.example .env.production   # first time only — fill in secrets
SSH_KEY=~/.ssh/id_ed25519 ./scripts/deploy.sh
```

`deploy.sh` rsyncs the repo to the `sprout-crm-prod` instance and runs
`docker compose -f docker-compose.prod.yml up -d --build` — building the API
image, running `migration:run`, seeding, and starting the stack.

**Web (S3 + CloudFront):**

```bash
./scripts/deploy-frontend.sh
```

Builds the SPA (reads `VITE_API_BASE` from `web-trade-crm/.env.production`),
syncs `dist/` to the `sprout-crm-web` bucket, and invalidates CloudFront.

**Verify after deploying:**

- https://sprout-crm.com and https://api.sprout-crm.com/api/docs both load.
- Sign in and exercise the flow this release changed.
- The instance reports no pending migrations (`migration:run` at container start).

## Migrations on a release

- Prod runs `migration:run` on every API container start, so a deploy applies
  pending migrations automatically.
- **Order is by migration filename timestamp — not merge or commit order.**
  Merging branches in any order is safe as long as the timestamps are unique and
  the migrations touch different objects. Applied migrations are recorded in the
  `migrations` table.
- Never rename or re-timestamp an applied migration — it will re-run or be
  skipped. Generate new ones with `npm run migration:create` /
  `migration:generate`, so the timestamp sorts after the current high-water mark.
- Migrations are forward-only in practice: rolling back code needs either the
  migration's `down()` (`npm run migration:revert`, local or via SSH) or a new
  migration that undoes it — never an edit by hand.

## Hotfix path

```bash
npm run branch:start -- --base=main hotfix/<short-description>
# fix + commit, then PR to main, and a second PR back to develop
```

Then tag a **patch** version (step 4 — a hotfix normally has no bump commit, so
tag by hand) and deploy as in step 5.

## Production operations (manual)

**Run migrations by hand** (they normally run at container start):

```bash
ssh ubuntu@<public_ip>
cd ~/trade-crm
docker compose -f docker-compose.prod.yml exec api \
  node node_modules/typeorm/cli.js migration:run -d dist/config/data-source.js
```

**Database access:**

```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d trade_crm
```

For a GUI client, forward the port (Postgres is bound to localhost only):

```bash
ssh -L 5432:127.0.0.1:5432 ubuntu@<public_ip>
```

**Backups:** daily at 1am Eastern via cron on the instance (`scripts/backup-db.sh`,
installed with `scripts/install-backup-cron.sh`), landing in
`s3://sprout-crm-backups/sprout-crm-db-<unix-ms>.sql.gz`; anything older than
7 days is pruned.

## Pitfalls

- **Tagging the wrong commit** — tags belong on the version-bump commit on
  `main`, never on a feature branch or a local `develop`.
- **Skipping PR 2** (`release/* → develop`) — the bump is lost, and the next
  release starts from a stale version.
- **Bumping versions on a feature branch** — release branches only.
- **Tagging a release you didn't ship** (or shipping one you didn't tag) —
  decide, then keep the tag list honest.
- **Re-timestamping an applied migration** — it re-runs or gets skipped.

## Handing off

Report: the version(s), the bump commit, the release branch, the two PRs to open,
the tag command, and whether a deploy is intended. The user pushes, merges, tags,
and deploys — the agent prepares and verifies. Confirm current state from the
repo (`git tag -l`, each `package.json`) rather than trusting the examples above.
