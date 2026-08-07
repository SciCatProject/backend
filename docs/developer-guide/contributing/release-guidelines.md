# Release Versioning Guide

When code lands on the `release` branch, a workflow reads the commit messages
since the last tag and bumps the version automatically.

---

## The rules

| Commit message                     | Bump                | Example                                  |
| ---------------------------------- | ------------------- | ---------------------------------------- |
| Anything else                      | **patch** (default) | `chore: update deps` → `1.2.3` → `1.2.4` |
| `fix: ...`                         | **patch**           | `1.2.3` → `1.2.4`                        |
| `feat: ...`                        | **minor**           | `1.2.3` → `1.3.0`                        |
| `BREAKING CHANGE:` in the **body** | **major**           | `1.2.3` → `2.0.0`                        |

Patch is the fallback. If nothing in the batch matches a rule, you still get a
patch bump — never nothing.

The highest match wins. A batch containing three `fix:` and one `feat:` gives a
minor bump.

---

## How to make a major release

The `BREAKING CHANGE:` footer in the commit **body** is what triggers the bump.
Mark the title with `!` as well (`feat!: ...`) — it's the convention for
signalling a breaking change, even though the footer does the actual work.

When squash-merging a PR, GitHub shows two fields. Put the type in the
**Commit message** box and the footer in the **Extended description** box:

```
┌─ Commit message ──────────────────────────────────────┐
│ feat!: some major change                              │
└───────────────────────────────────────────────────────┘

┌─ Extended description ────────────────────────────────┐
│ BREAKING CHANGE: this will trigger release major bump │
│                                                       │
│                                                       │
└───────────────────────────────────────────────────────┘

           [ Confirm merge ]   [ Cancel ]
```

GitHub inserts the blank line between the two fields for you, producing:

```
feat!: some major change

BREAKING CHANGE: this will trigger release major bump
```

### From the command line

```bash
git commit \
  -m "feat!: some major change" \
  -m "BREAKING CHANGE: this will trigger release major bump"
```

Two `-m` flags produce the subject and body with the blank line between them.

---

## Footer formatting

The footer must be on its own line, flush left, with a blank line above it.

✅ Correct:

```
feat: new API

BREAKING CHANGE: removed the old endpoint
```

❌ These all fail silently and give you a minor bump:

```
feat: new API BREAKING CHANGE: removed old endpoint      ← same line as subject
```

```
feat: new API

- BREAKING CHANGE: removed old endpoint                  ← bullet prefix
```

```
feat: new API

  BREAKING CHANGE: removed old endpoint                  ← indented
```

```
feat: new API

BREAKING CHANGES: removed old endpoint                   ← plural
```

Also never use it as the title — `BREAKING CHANGE: fix the thing` has a space in
the type position, so the whole message fails to parse and falls back to patch.

---

## Fixing a PR that was merged without the footer

Someone merged a breaking change but forgot the `BREAKING CHANGE:` footer. Push
an empty commit to `master` before releasing:

```bash
git checkout master
git pull
git commit --allow-empty \
  -m "feat: some major change" \
  -m "BREAKING CHANGE: this will trigger release major bump"
git push origin master
```

The workflow scans **every** commit since the last tag, so one qualifying commit
anywhere in the batch is enough. No force push, no rewritten history.

Then merge master into release as usual.

⚠️ Do this **before** pushing to `release`. Once the workflow runs it creates the
tag, the GitHub release, and the Docker images — and those can't be corrected
without deleting a published version.

---

## Releasing

```bash
git checkout release
git pull origin release
git merge --no-ff master
git push origin release
```

**Never squash master into release.** Squashing collapses every commit into one
and throws away all the conventional-commit metadata — including any
`BREAKING CHANGE:` footers.

The PR title for a master → release PR doesn't matter. The individual commits
from master are what get parsed.

---

## Checking before you release

Merge locally — **without pushing** — and check what the version would be:

```bash
git checkout release
git pull origin release
git fetch --tags
git merge --no-ff master -m "Merge branch 'master' into release"

npx -p conventional-recommended-bump -p conventional-changelog-angular \
  conventional-recommended-bump -p angular
```

It prints `major`, `minor`, or `patch` — the same result the workflow will get.

Not what you expected? Throw the local merge away:

```bash
git reset --hard origin/release
```

Then fix the commit messages on master (or add an empty commit with the footer)
and check again.
