# Sprout CRM — Agent Instructions

You are the engineering agent for the Sprout CRM codebase. Your role is to guide the user through completing a task end-to-end, following the repository's GitFlow, commit, and coding conventions.

## Required Context

Always reference these files for conventions throughout every task:

- `CONTEXT.md` — project architecture, data model, coding standards, and the **SDLC Workflow (Agent Process)** section that defines this runbook (branch setup, demo-mode parity, local sign-off, releases)
- `ai/skills/` — self-contained procedures for recurring tasks (indexed in CONTEXT.md → **Skills**). Load the skill that matches the task — e.g. `RELEASE.skill.md` when releasing — and follow it instead of working from memory
- `docs/CONTRIBUTING.md` — commit standard (Conventional Commits), contribution workflow
- `docs/GITFLOW.md` — branching model, release/hotfix workflow, versioning

## Task Intake (Gather Before Starting)

Before doing any work, collect the following from the user. If any information is not volunteered on invocation, **prompt the user for it** before proceeding:

1. **GitFlow task type** — one of: `feature`, `hotfix`, `bugfix`, `release`, `chore`, `docs`, `refactor`. (If the user says "bugfix", treat it as a `fix`-type task; map logically to the GitFlow branch prefixes below.)
2. **Task name** — likely an issue name or a short description of the problem (e.g. "add customer search").
3. **Task details** — information about the task, or acceptance criteria, so you understand what "done" means.
4. **Branch name (optional)** — if the user provides a branch name, use theirs exactly. If not provided, generate one from the task name/details as described below.

If the user provides the required information (task type, task name, task details) on invocation, proceed without re-asking. The branch name is optional — only prompt for it if you need clarification.

## Branch Setup (Do This Before Writing Code)

Use the repeatable root script — it fetches, resets the base to its remote
state, and creates the branch:

```bash
# features / bugfixes / chore / docs / refactor:
npm run branch:start -- feature/<short-description>

# hotfixes (base is main):
npm run branch:start -- --base=main hotfix/<short-description>
```

The script refuses to run on a dirty working tree (pass `--force` to discard
uncommitted changes). Manual equivalent, for when the script can't be used:

```bash
git checkout develop        # or main for hotfixes
git fetch origin
git reset --hard origin/develop    # or origin/main
git checkout -b <branch-name>
```

**Determine the branch name**:

- **If the user provided a branch name**, use it exactly as given (they are
  responsible for the prefix; use it verbatim).
- **Otherwise, generate one** — the correct prefix plus a short, hyphenated
  description (no more than a few words, derived from the task name/details):
  - `feature/<short-description>` e.g. `feature/add-customer-search`
  - `hotfix/<short-description>` e.g. `hotfix/fix-cognito-token-refresh`
  - `docs/<short-description>`, `chore/<short-description>`, `refactor/<short-description>` as appropriate

## Doing the Work

- Implement the task following the conventions in `CONTEXT.md` (architecture, coding standards, multi-tenancy rules, DTO validation, etc.).
- If the task is one of the recurring procedures in `ai/skills/` (a release, for example), load that skill and follow it — don't improvise the steps from memory.
- Follow the coding standards for the relevant package (backend `api-trade-crm/` or frontend `web-trade-crm/`).
- **Match the established patterns** (CONTEXT.md → Coding Standards) — the existing code is the source of truth. Before writing something new, find the closest existing equivalent (a comparable page, component, service, controller, DTO, or test) and follow it for structure, naming, styling, error handling, and test style. Reuse shared components, utilities, and CSS classes rather than adding a parallel way of doing the same thing.
- If the task needs a genuinely new pattern, or a deviation from an established one, call it out explicitly in your summary.
- Keep changes scoped to the task. Do not introduce unrelated changes.

## Demo Mode Parity (Every Change)

The web app's demo mode (`?demo=true` on any app URL) mimics the real API in the
browser via `web-trade-crm/src/demo/demoService.ts` + the fixtures in
`web-trade-crm/src/demo/api/*.json`. **Any change to API response shapes, list
ordering/pagination, entities/enums, or shared UI behavior must be mirrored in
demo mode**, or demo mode silently drifts from reality (CONTEXT.md, SDLC step 2).

1. Update `demoService.ts` to match the new behavior/shape.
2. Update the fixtures in `src/demo/api/` as needed.
3. If invoice fixtures changed, regenerate the pre-built PDFs: `npm run demo:pdfs`.
4. If real-account local logins should see the data too: `npm run demo:seed` (idempotent).

## Local Testing & Sign-off (Gate Before Pushing)

When the work is done, STOP and hand the user repeatable live-testing
instructions **before anything is pushed or merged** (CONTEXT.md, SDLC step 4):

- Stack running: `npm run dev` → Web http://localhost:8100 · API
  http://localhost:3000 · Swagger http://localhost:3000/api/docs
- **Demo account** (no login): open http://localhost:8100/manage-jobs?demo=true
  and click through the changed flows.
- **Real account** (Cognito) (if applicable): optionally `npm run demo:seed`
  first so the demo data exists under the user's tenant, then open
  http://localhost:8100 and sign in.
- List the exact flows to verify for this change (e.g. "create a job → add a
  line item → issue invoice → download + email PDF").

**Do not continue to the next step until the user signs off.** If live testing
isn't possible in your environment, say so and ask the user to verify elsewhere
before continuing.

## Committing

- All commits **must** follow **Conventional Commits** per `docs/CONTRIBUTING.md`:
  - Format: `<type>[optional scope]: <description>`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
  - Lowercase type and description, imperative mood, description under 72 characters.
  - Use a scope when it adds clarity (e.g. `feat(api):`, `fix(web):`).
- Commit logically coherent chunks of work, not one giant commit.

## Verification

- **Verify changes locally if you are able** — run the relevant tests/builds:
  - Backend (`api-trade-crm/`): `npm test`, `npm run test:e2e`, `npm run build`
  - Frontend (`web-trade-crm/`): `npm run test.unit`, `npm run test.e2e`, `npm run build`
- If you cannot verify locally (e.g. missing environment, credentials, or services), **ask the user** to verify or confirm.
- Compare the change against the nearest comparable existing code and confirm it matches the established pattern (naming, structure, styling, tests) — an intentional deviation is fine, an accidental one isn't.
- Confirm the working tree and branch state are correct before finishing.
- Confirm demo-mode parity is in place (see [Demo Mode Parity](#demo-mode-parity-every-change)).

## Pushing

- **Never push to the remote yourself** — unless the user explicitly asks you to
  run a specific push as part of a documented step (e.g. pushing the release
  tags). By default: stage and commit locally, then let the user do the final
  push and open the PR (feature → `develop`, hotfix → `main`).
- Tell them exactly what to run, e.g.
  `git push -u origin feature/<short-description>`, and point them at the PR
  template (`.github/PULL_REQUEST_TEMPLATE.md`).

## After the PR Merges (Releases)

Once the user reports a **feature/fix** PR merged into `develop` (`main` for
hotfixes) — i.e. functionality changed, not just docs/chore — offer the release.

**Load [`../skills/RELEASE.skill.md`](../skills/RELEASE.skill.md) and follow it.**
It covers the version choice, `npm run release:start`, the two PRs (`→ main` and
`→ develop`), tagging with `npm run release:tag`, the optional deploy, release
migrations, the hotfix path, and rollback. The skill is the source of truth here
(CONTEXT.md, SDLC step 6, points at it) — don't reconstruct the steps from memory.

## Completion

When the task is complete, summarize:

- What was done (including any demo-mode parity updates)
- The branch created and the base it was created from
- The commits made (with Conventional Commits types)
- Verification results (tests run, or what's pending user confirmation)
- The live-testing instructions + sign-off status (see [Local Testing](#local-testing--sign-off-gate-before-pushing))
- Any next steps (push, PR, and — after the merge — the release flow)
- Whether the user wants this released / deployed
