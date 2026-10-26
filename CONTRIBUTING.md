**English** · [中文](CONTRIBUTING.zh-CN.md)

# Maintainer handbook — the Unraid side

This repository owns the **Community Applications template** for DSH and nothing else:
`templates/dsh.xml`, the icon, the CA repository profile, the CA documentation and the
scripts that check them. The container image is built and published by
[MeiXu6693/dsh-docker](https://github.com/MeiXu6693/dsh-docker); the template installs
that image's `:latest` tag.

## Repository layout

```
.
├── templates/dsh.xml          # the file Community Applications parses (already rendered)
├── templates/img/dsh.png      # the icon the template and CA show
├── templates/img/src/         # source assets + the trademark note
├── icon.svg                   # repository icon (CA layout requirement; ca_profile.xml points at it)
├── ca_profile.xml             # CA repository info — a non-empty <Profile> is a hard submission gate
├── scripts/                   # template self-checks, icon generation, static gate
└── docs/                      # submission notes, pitfalls, migration guide
```

## Local checks

```bash
ALLOW_MISSING_PYTHON=1 bash scripts/check-static.sh   # the whole gate (this host has no python3)
node scripts/check-template.mjs templates/dsh.xml     # the template alone
node scripts/check-repo.mjs                           # CA repository layout + placeholder sweep
node scripts/check-image-contract.mjs templates/dsh.xml
node scripts/check-image.mjs templates/dsh.xml        # does the image the template installs still exist on ghcr.io
node scripts/make-icon-svg.mjs --out=icon.svg && git diff --exit-code icon.svg   # icon must be reproducible
```

`check-image.mjs` is the only check that needs the network — it asks GHCR for the manifest, which
is the one thing that silently broke on 2026-10-25 while every other check stayed green (issue #2).
Offline it degrades to a warning; on GitHub's runners it is real.

In CI `check-static.sh` runs without `ALLOW_MISSING_PYTHON`: python3 is required there
for the XML/YAML well-formedness pass, and skipping is not allowed.

## The template

- **`templates/dsh.xml` is rendered output**, not a source file: owner, repository name
  and image tag are already substituted. `scripts/render-template.mjs` is the helper for
  a fork (`--owner=… --repo=… --tag=…`); after rendering, check it with
  `check-template.mjs` and commit the concrete file. CA parses exactly what is on `main`.
- **Assertions `check-template.mjs` makes**: CA's minimum/recommended fields are present,
  the volumes and the `<Config Type="Path">` entries agree on the host paths, a Config's
  text is either empty or equal to its `Default` (Unraid uses the text — a mismatch shows
  one value in the GUI and creates the container with another), `<WebUI>`'s port is
  actually published, no v1 `<Data>`/`<Environment>` blocks, `<Privileged>` is false, and
  both `--security-opt` values are in `<ExtraParams>`.
- **Comment pairing is checked** (the regexes strip comments first), because a tag merely
  *mentioned* in a comment once fooled a search-and-replace into producing a broken file
  that every regex-based check still accepted.

## What must not change casually

| Field | Why |
|---|---|
| `<Repository>` | It is the image users install. It points at `ghcr.io/meixu6693/dsh:latest`. |
| `<TemplateURL>`, `<Icon>`, `<ReadMe>` | They point at files on this repository's `main` branch; CA and installed machines re-read them. A rename or a move breaks the catalogue entry. |
| `<Registry>` | Points at the GHCR package page. It follows wherever the package is linked. |
| `<Support>` | CA requires a **forum thread** for a self-maintained container, not a GitHub issue tracker. |
| `<Name>` | It is the container name on every machine that installs it. |

A declaration that does not match reality is what gets an entry delisted — see
[docs/ca-pitfalls.md](docs/ca-pitfalls.md) (A6) for the cases this rule comes from.

## The image contract

Two things couple this repository to the image, and both are checked or documented:

1. **Environment variables.** Every `<Config Type="Variable" Target="NAME">` is a variable
   the image's `docker/entrypoint.sh` must understand. `scripts/check-image-contract.mjs`
   fetches that entrypoint from `main` and fails when a variable the template sets is not
   mentioned there — the failure mode it prevents is silent: the container starts, the
   field does nothing. It needs the network; offline (China) it degrades to a warning, and
   the validate workflow fails in CI if the fetch did not happen, so the check cannot be
   skipped by accident. `TZ` is the one variable the entrypoint legitimately does not read
   (the base image handles it), and it is allowlisted in the script with that reason.
2. **The two `--security-opt` flags** in `<ExtraParams>`, which come with the image's
   sandbox design ([docs/sandbox.md in dsh-docker](https://github.com/MeiXu6693/dsh-docker/blob/main/docs/sandbox.md)).
   The contract check warns if the image's `compose.yaml` stops carrying them.

**Renaming or removing an environment variable in the image is a breaking change here.**
Announce it in the forum thread and update `templates/dsh.xml` in the same breath.

## Icons

Two artifacts, one source of truth — they are updated together:

```bash
node scripts/make-icon-svg.mjs            # → icon.svg (pure vector, no dependencies)
node scripts/make-icon.mjs                # → templates/img/dsh.png (rasterizes icon.svg, needs sharp)
```

`icon.svg` is the single source of truth for the layout; CI re-runs the generator and
diffs it against what was committed, so **hand edits are not allowed**. Source assets and
the trademark note are in [templates/img/src/README.md](templates/img/src/README.md).

## Getting a change into the catalogue

While the entry is live you do **not** re-run the submission flow: `/submit/new` answers
"already enabled in Community Applications and does not need to be submitted", and CA
re-parses this repository on its own at the next feed rebuild. The measured lag was about
four hours (template pushed 02:00 CST → live 04:11 CST). See
[docs/ca-submission.md](docs/ca-submission.md) and [docs/publish.md](docs/publish.md).

⚠️ **Installed machines never see template changes.** CA copies the template at install
time, so a change here reaches new installs and the catalogue page only. Anything that has
to reach everybody belongs in the image.

## Versioning

This repository has no releases. The image's tags and release notes live in
[dsh-docker](https://github.com/MeiXu6693/dsh-docker/releases); the template follows
`:latest` and therefore needs no version handshake.
