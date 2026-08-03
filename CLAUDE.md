# Sprout CRM — Agent Instructions

You are the engineering agent for the Sprout CRM codebase. Your role is to guide the user through completing a task end-to-end, following the repository's GitFlow, commit, and coding conventions.

## Required Context

Always reference these files for conventions throughout every task:

- `docs/AI_CONTEXT.md` — project architecture, data model, coding standards, deployment
- `docs/CONTRIBUTING.md` — commit standard (Conventional Commits), contribution workflow
- `docs/GITFLOW.md` — branching model, release/hotfix workflow, versioning

## Task Intake (Gather Before Starting)

Before doing any work, collect the following from the user. If any information is not volunteered on invocation, **prompt the user for it** before proceeding:

1. **GitFlow task type** — one of: `feature`, `hotfix`, `bugfix`, `release`, `chore`, `docs`, `refactor`. (If the user says "bugfix", treat it as a `fix`-type task; map logically to the GitFlow branch prefixes below.)
2. **Task name** — likely an issue name or a short description of the problem (e.g. "add customer search").
3. **Task details** — information about the task, or acceptance criteria, so you understand what "done" means.

If the user provides all three on invocation, proceed without re-asking.

## Branch Setup (Do This Before Writing Code)

1. **Determine the correct base branch** from the task type:
   - `feature/*`, `bugfix`, `chore`, `docs`, `refactor`, `release/*` → base is **`develop`**
   - `hotfix/*` → base is **`main`**
2. **Switch to the base branch**:
   ```bash
   git checkout develop        # or main for hotfixes
   ```
3. **Fetch the latest** so you're working from the remote state:
   ```bash
   git fetch origin
   ```
4. **Reset the base branch to the origin state** to ensure a clean, up-to-date starting point:
   ```bash
   git reset --hard origin/develop    # or origin/main for hotfixes
   ```
5. **Generate a branch name** — the correct prefix plus a short, hyphenated description (no more than a few words, derived from the task name/details):
   - `feature/<short-description>` e.g. `feature/add-customer-search`
   - `hotfix/<short-description>` e.g. `hotfix/fix-cognito-token-refresh`
   - `release/v<version>` e.g. `release/v0.1.1`
   - `docs/<short-description>`, `chore/<short-description>`, `refactor/<short-description>` as appropriate
6. **Create and switch to the branch**:
   ```bash
   git checkout -b feature/<short-description>
   ```

## Doing the Work

- Implement the task following the conventions in `docs/AI_CONTEXT.md` (architecture, coding standards, multi-tenancy rules, DTO validation, etc.).
- Follow the coding standards for the relevant package (backend `api-trade-crm/` or frontend `web-trade-crm/`).
- Keep changes scoped to the task. Do not introduce unrelated changes.

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
- Confirm the working tree and branch state are correct before finishing.

## Pushing

- **Do NOT push unless the user explicitly instructs you to.**
- When the user asks to push, push the branch and (optionally) open a PR against the correct base branch (`develop` for features, `main` for hotfixes).

## Completion

When the task is complete, summarize:

- What was done
- The branch created and the base it was created from
- The commits made (with Conventional Commits types)
- Verification results (tests run, or what's pending user confirmation)
- Any next steps (e.g. push, PR, testing needed)
