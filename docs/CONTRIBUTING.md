# Contributing to Sprout CRM

This document defines the contribution workflow and commit standard for the Sprout CRM repository.

## Branching & Releases

This repository follows the **GitFlow** branching model. See [docs/GITFLOW.md](GITFLOW.md) for the full workflow.

- `main` — production-ready code (protected)
- `develop` — integration branch (protected)
- `feature/*` — new features / non-urgent work (branch from `develop`)
- `release/*` — release preparation (branch from `develop`)
- `hotfix/*` — urgent production fixes (branch from `main`)

## Commit Standard: Conventional Commits

All commit messages **must** follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                                   | Example                                  |
| ---------- | ------------------------------------------------------------- | ---------------------------------------- |
| `feat`     | A new feature                                                 | `feat: add customer search`              |
| `fix`      | A bug fix                                                     | `fix: correct invoice total calculation` |
| `docs`     | Documentation only changes                                    | `docs: update deployment guide`          |
| `style`    | Formatting, whitespace, missing semicolons (no logic change)  | `style: run prettier on auth module`     |
| `refactor` | Code change that neither fixes a bug nor adds a feature       | `refactor: extract pdf service`          |
| `perf`     | Performance improvement                                       | `perf: cache pdf lookups`                |
| `test`     | Adding or correcting tests                                    | `test: add invoice e2e coverage`         |
| `build`    | Build system or external dependency changes                   | `build: bump typeorm to 0.3`             |
| `ci`       | CI configuration and scripts                                  | `ci: add github actions workflow`        |
| `chore`    | Other changes that don't modify src or test (tooling, config) | `chore: update eslint config`            |

### Rules

- **Lowercase** type and description.
- **Imperative mood** in the description (e.g. "add", not "adds" or "added").
- Keep the description **under 72 characters**.
- Use a **scope** in parentheses when it adds clarity (e.g. `feat(api):`, `fix(web):`).
- Add a **body** for larger changes explaining the _why_, not just the _what_.
- Use footers for breaking changes (`BREAKING CHANGE:`) and issue references (`Fixes #123`).

### Examples

```bash
# Simple feature
git commit -m "feat: add customer search"

# With scope
git commit -m "feat(web): add invoice status dropdown"

# With body and footer
git commit -m "fix(invoices): recompute totals on line item removal

Line items were not recalculated after deletion, causing stale totals
to persist in the invoice snapshot.

Fixes #88"
```

### Why it matters

- Enables automatic changelog generation and semantic versioning.
- Makes history greppable and scannable.
- Supports `git log` filtering, e.g. `git log --grep="^feat"`.

## Pull Requests

All changes to `main` and `develop` must go through a pull request (enforced by branch protection).

- Feature branches are merged into `develop` via PR.
- Release and hotfix branches are merged into `main` **and** `develop` via PR.
- Use the provided [pull request template](../.github/PULL_REQUEST_TEMPLATE.md).

### PR checklist

- [ ] Branch is based on the correct parent (`develop` for features, `main` for hotfixes).
- [ ] Branch name follows the GitFlow convention.
- [ ] Commit messages follow Conventional Commits.
- [ ] Tests pass (`npm test` / `npm run test:e2e` in `api-trade-crm/`, `npm run test.unit` / `npm run test.e2e` in `web-trade-crm/`).
- [ ] No secrets or credentials committed.
- [ ] Migrations included if the schema changed.
- [ ] README / docs updated if applicable.

## Code Owners

The [CODEOWNERS](../.github/CODEOWNERS) file defines who is automatically requested for review on PRs. Currently all code is owned by `@jarettmartin`.

## Development Workflow

1. **Branch** from `develop`:
   ```bash
   git checkout develop
   git checkout -b feature/my-feature
   ```
2. **Commit** using Conventional Commits (see above).
3. **Push** and open a PR against `develop`:
   ```bash
   git push -u origin feature/my-feature
   ```
4. **Review** — address code owner feedback, keep tests green.
5. **Merge** — squash or merge once approved.

For hotfixes, branch from `main` instead and target `main` (and `develop`).

## Versioning

API and web are versioned independently (see [docs/GITFLOW.md](GITFLOW.md)). Version bumps happen on `release/*` branches. Do not bump versions on feature branches.
