**English** · [中文](publish.zh-CN.md)

# Publishing a template from this library (and forking the whole thing)

This repository is **MeiXu's Unraid template library**: one Community Applications
template per app under `templates/`, plus the CA repository profile, the checks and the
documentation around them. It currently ships DSH only. The container image is built,
smoke-tested and published by [MeiXu6693/dsh-docker](https://github.com/MeiXu6693/dsh-docker)
— there is no Dockerfile here and this repository produces no releases or image tags. (The
two Releases left over from the pre-2026-10-16 publishing chain were deleted on 2026-10-17,
so the Releases page being empty is the intended state and not an abandoned project —
see the image repository's [releases](https://github.com/MeiXu6693/dsh-docker/releases).)

This document is the runbook for a fork, and for the maintainer's own changes to a
template.

## 1. Fork: what you have to change

Create a public repository (CA requires public readability, and the icon URL must be
public too), then render the template for your own namespace:

```bash
node scripts/render-template.mjs --owner=<your-username> --repo=<your-repo> --tag=latest \
  --out=templates/dsh.xml
node scripts/check-template.mjs templates/dsh.xml
node scripts/check-repo.mjs
ALLOW_MISSING_PYTHON=1 bash scripts/check-static.sh        # CI runs it without that variable
git add -A && git commit -m "chore: point the template at my namespace" && git push
```

The committed `templates/dsh.xml` is **rendered output** — CA parses exactly what is on
`main`, so the concrete owner/repo/tag values are what matter.

Two more things a fork must decide:

- **`ca_profile.xml`** — the `<Profile>` text and the `<WebPage>`/`<Icon>`/`<Forum>` URLs
  describe *your* repository. A non-empty `<Profile>` is a hard submission gate.
- **`<Support>`** in the template — CA requires an Unraid **forum thread** for a container
  you maintain yourself. Open one before submitting (see
  [ca-submission.md](ca-submission.md) §3 for what it has to cover).

If you also want to build your own image, fork
[dsh-docker](https://github.com/MeiXu6693/dsh-docker) instead and point `<Repository>`
at your image. Its `CONTRIBUTING.md` covers the GHCR package settings (workflow
permissions, package visibility, and the *Manage Actions access* grant a build needs when
it runs in a repository the package is not linked to).

## 2. Repository settings

| Setting | Where | Why |
|---|---|---|
| Public repository + OSI license | repository settings | CA's Submission Help lists both as hard requirements |
| `ca_profile.xml` with a non-empty `<Profile>` | repository root | CA blocks submission finalization without it |
| No Actions secrets needed | — | the validate workflow only reads this repository |

## 3. How a change reaches the catalogue

While the entry is live you do **not** re-run the submission flow. `/submit/new` answers
"already enabled in Community Applications and does not need to be submitted", and CA
re-parses this repository at its next feed rebuild. Measured on 2026-10-16: template
pushed 02:00 CST, live in the feed 04:11 CST (no manual scan at any point).

The feed to check is the one CA actually serves —
`https://ca.unraid.net/assets/feed/applicationFeed.json`; its `/cdn/` sibling lags about
a day behind.

⚠️ **A template change never reaches a machine that already installed it.** CA copies
`templates/dsh.xml` to `templates-user/my-DSH.xml` at install time, so this repository
only affects new installs and the catalogue page. Behaviour that must reach everybody
belongs in the image; the consequences of getting this wrong are in
[ca-pitfalls.md](ca-pitfalls.md) (B1, B2).

## 4. What the checks do, and what they cannot

`bash scripts/check-static.sh` runs, in order: shell and node syntax; XML/YAML/JSON
well-formedness (python3); the CA repository requirements (`check-repo.mjs`); the template
self-check (`check-template.mjs`); the cross-repository image contract
(`check-image-contract.mjs`); and the icon's reproducibility.

What none of them can see:

- **whether the image still behaves the way the template describes** — the contract check
  only proves the environment variable *names* still exist in the entrypoint. Renaming a
  variable's meaning, or changing a default, is invisible here; announce it in the forum
  thread and update both sides together;
- **how Unraid actually resolves a field.** Two behaviours were measured by hand and are
  encoded in `check-template.mjs` (a non-empty element text wins over `Default`; `Mask`
  only affects the GUI);
- **whether the CA feed picked the change up** — that is the feed, not this repository.

## 5. Community Applications is the last step

Only once the image pulls, the template installs and the sandbox works does the
submission flow come into play: [ca-submission.md](ca-submission.md) (the bar and the
process) and [ca-pitfalls.md](ca-pitfalls.md) (real cases of delisting, deprecation and
template changes that never flowed back).
