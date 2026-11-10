# Plan 001: Make CI build the Worker and run the tests

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before the next step. If a STOP condition occurs, stop and report. Do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 2d3bfef..HEAD -- .github/workflows/ci.yml package.json scripts tests`
> Earlier plans in `plans/README.md` can change these files. If a file changed, compare the "Current state" excerpts with the live code. If the excerpted code is different, treat this as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `2d3bfef`, 2026-11-10

## Why this matters

CI runs only lint and typecheck, so a broken production build or a broken Listing flow can pass. The only tests need a running site, and nobody starts one in CI. After this plan, one command builds the Worker, runs it locally against an empty temporary database, and runs the tests. CI runs the same command. Later plans use this command as their check.

## Current state

- `.github/workflows/ci.yml` ends with these steps (lines 27-34):

```yaml
      - name: Install dependencies
        run: pnpm install

      - name: Lint
        run: pnpm run lint

      - name: Typecheck
        run: pnpm run typecheck
```

- `package.json` has `"test": "node --test tests/*.test.mjs"`.
- `tests/site.test.mjs` skips all tests unless `MADORI_TEST_URL` and `MADORI_TEST_PASSWORD` are set.
- `wrangler.jsonc` runs `.output/server/index.mjs`. Its top-level bindings are `DB` and `LISTING_IMAGES`.
- The local Worker accepts secrets with `--var NAME:value`. The local Worker build was seen to accept `NUXT_ADMIN_PASSWORD` this way.
- There is no `scripts/` directory.

Repository conventions: Nuxt 4 with Cloudflare Workers, antfu ESLint style (no semicolons, single quotes), no code comments unless they explain a constraint. User-facing text is Traditional Chinese. Vocabulary from `CONTEXT.md`: **Owner** is the logged-in agent, **Customer** is a visitor, **Listing** is a home, **Draft** and **Published Listing** are its states, **Property photo** and **Floor plan** are its images.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Worker tests (new) | `pnpm test:worker` | exit 0, 3 tests pass, 0 skipped |

## Scope

**In scope**: `scripts/test-worker.sh` (create), `package.json`, `.github/workflows/ci.yml`.

**Out of scope**: `wrangler.jsonc`, application code, the test cases in `tests/site.test.mjs`, and the developer's `.wrangler/state` database. The script must use its own temporary state directory.

## Git workflow

- This repository commits directly on `main`, by the maintainer's instruction. Do not create a branch.
- Use one Conventional Commits message, for example `test: run the built Worker and tests in CI`.
- Do NOT push or deploy unless the operator tells you to.
- Do not stage `docs/research/screenshots/`. These files are untracked on purpose.
- Never print or commit the values of `.env` or `.dev.vars`.

## Steps

### Step 1: Create `scripts/test-worker.sh`

Create the file with this content and make it executable with `chmod +x`:

```sh
#!/usr/bin/env bash
set -euo pipefail

port=3011
url="http://localhost:$port"
log="${TMPDIR:-/tmp}/madori-worker.log"
state="$(mktemp -d)"
password="$(openssl rand -hex 24)"
session="$(openssl rand -hex 32)"

cleanup() {
  pkill -f "wrangler dev --local --persist-to $state" || true
  rm -rf "$state"
}
trap cleanup EXIT

if ! pnpm build > "$log" 2>&1; then
  tail -40 "$log"
  exit 1
fi
pnpm exec wrangler d1 migrations apply DB --local --persist-to "$state" > /dev/null

WRANGLER_SEND_METRICS=false pnpm exec wrangler dev --local --persist-to "$state" \
  --port "$port" --inspector-port 9239 --log-level warn \
  --var "NUXT_ADMIN_PASSWORD:$password" --var "NUXT_SESSION_PASSWORD:$session" > "$log" 2>&1 &

ready=0
for _ in $(seq 1 90); do
  if [ "$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$url/api/properties" || true)" = 200 ]; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" != 1 ]; then
  tail -40 "$log"
  exit 1
fi

MADORI_TEST_URL="$url" MADORI_TEST_PASSWORD="$password" pnpm test
```

The loop polls an explicit readiness condition. Do not replace it with a fixed delay.

**Verify**: `bash -n scripts/test-worker.sh` -> exit 0.

### Step 2: Add the package script

In `package.json`, add this line after `"test"`: `"test:worker": "bash scripts/test-worker.sh",`

**Verify**: `pnpm test:worker 2>&1 | grep -E '^ℹ (tests|pass|fail|skipped)'` -> `tests 3`, `pass 3`, `fail 0`, `skipped 0`. Port 3011 must be free before you run this.

### Step 3: Add the CI step

Add this step at the end of `.github/workflows/ci.yml`, after Typecheck:

```yaml

      - name: Build and test the Worker
        run: pnpm run test:worker
```

**Verify**: `python3 -I -c "import yaml;s=yaml.safe_load(open('.github/workflows/ci.yml'))['jobs']['ci']['steps'];print(s[-1]['run'])"` -> `pnpm run test:worker`. If PyYAML is not installed, use `tail -3 .github/workflows/ci.yml` and confirm the step.

## Test plan

This plan adds no test case. It makes the existing 3 tests run against the production Worker build.

## Done criteria

- [ ] `pnpm lint` and `pnpm typecheck` exit 0
- [ ] `pnpm test:worker` exits 0 with 3 passed and 0 skipped
- [ ] After the run, `lsof -nP -iTCP:3011 -sTCP:LISTEN` shows no listener
- [ ] `git status --short` shows only the in-scope files and the untracked `docs/research/screenshots/`
- [ ] `plans/README.md` status row updated

## STOP conditions

- A test fails on the Worker build. The tests have passed only against `pnpm dev`, so a failure can be a real Worker defect. Report the failing assertion and the end of the log file. Do not change the test or the application.
- Port 3011 is in use by a process that you did not start.
- The script needs a change to `wrangler.jsonc`.

## Maintenance notes

- The script always builds, so it takes as long as `pnpm build`. Do not add a separate CI build step.
- Tests run against a fresh database each time. A test that assumes earlier data will fail here.
