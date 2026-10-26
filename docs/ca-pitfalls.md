**English** · [中文](ca-pitfalls.zh-CN.md)

# Pitfalls others have already hit — the checklist to avoid before submitting to CA

There are two kinds of sources: **official documentation** (`ca.unraid.net` Submit → Docs, retrieved 2026-10-15) and **forum evidence** (posts by maintainers and by the CA author, including concrete consequences).
Every entry also states how this repository handles it: ✅ already avoided / ⚠️ you need to pay attention / ❓ you need to decide.

---

## A. Hard requirements (if unmet, the submission flow cannot proceed)

| # | Pitfall | Basis | Our handling |
|---|---|---|---|
| A1 | **The repository root must have `ca_profile.xml` with a non-empty `<Profile>`**, otherwise "CA will block submission finalization" | Official "Repository Information XML" | ✅ added [`ca_profile.xml`](../ca_profile.xml) (contains Profile / Icon / WebPage, `<Forum>` left commented out pending) |
| A2 | The repository must be **public and active**, with an **OSI-approved license** at the root | Official "Submission Help" | ✅ public repository + MIT `LICENSE` |
| A3 | Every application entry must have `<Repository>` (Docker) or `<PluginURL>` (plugin) | Official "Repository XML Format" | ✅ `<Repository>` points to `ghcr.io/meixu6693/dsh:latest` |
| A4 | Run **Validate / Scan** when submitting; the docs also say "after every meaningful XML change" | Official "Submission Help" | ⚠️ that wording only bites for a **new** submission: `/submit/new` refuses an already-listed repository ("already enabled … no action required"), and CA re-parses the repository on its next feed rebuild (measured 2026-10-16: push 02:00 CST → live 04:11 CST). See [ca-submission.md](ca-submission.md) |
| A5 | **A `:latest` tag that does not exist gets you blacklisted** (example: `ntop/ntopng is blacklisted with ":Latest tag does not exist"`) | Forum | ✅ the pipeline **always** pushes both `:latest` and `:<version>`; do not change it to push only version tags |
| A6 | **A declaration that does not match reality gets you delisted**: Unspin was removed from CA because its `PluginURL` did not match the declaration inside the .plg, and after fixing it **a moderator still had to re-list it by hand**, which took several days | Forum | ⚠️ `<Repository>`/`<TemplateURL>`/`<Registry>`/`<Icon>` must all point to stable, real locations that will not move in the short term; **once submitted, do not change the image or repository name** |
| A6b | **A registry path does not follow an account rename.** Measured on 2026-10-26: the owner had been renamed `2220545672` → `MeiXu6693` and every file here was updated, but GitHub redirects unevenly — `github.com/2220545672/…` answers 301 and `raw.githubusercontent.com/2220545672/…` still serves the new content, while `ghcr.io/2220545672/dsh` answers `manifest unknown` and its package page is a 404. Every machine installing from Apps got a container that could not be built ([issue #2](https://github.com/MeiXu6693/dsh-unraid/issues/2)), and every other check stayed green. | Local measurement + issue #2 | ✅ `scripts/check-image.mjs` now asks GHCR for the manifest on every gate run (it also covers A5); the template on `main` points at the new path. ⚠️ Installs made before the rename keep the old URL in `templates-user/my-DSH.xml` — CA copies the template at install time — so those users have to set **Repository** back to `ghcr.io/meixu6693/dsh:latest` by hand (README → Problems). |
| A7 | **`Mask="true"` only affects the GUI display**: the value is still passed to the container and still stored in the template file (measured: `Mask="true"` + `my-own-secret-99` → the container received `DSH_PASSWORD=my-own-secret-99`; the template still held that value too). ⚠️ This entry previously read "masking makes the variable disappear" — that was **our own check script** truncating `DSH_PASSWORD` (12 characters) with `printf "%.11s"` so the comparison never held and the difference was missed; corrected | Local controlled experiment (Mask true/false, two rebuilds) + direct `grep '^DSH_PASSWORD'` | ✅ "Access password" uses `Mask="true"` (dots in the UI) and the value is written only in `Default`; `scripts/check-template.mjs` no longer forbids Mask, it only records this lesson in a comment |
| A8 | **Config value rules**: **when the element text is non-empty it wins**, **when the text is empty it falls back to `Default`**. Measured twice: port field text `0.0.0.0:8080` + Default `0.0.0.0:3082` → the container really bound to **8080**; password field with empty text + Default `12345678` → the container really received **12345678** | Measured locally with two rebuilds | ✅ `scripts/check-template.mjs` asserts "the text is either empty or equal to Default" (an inconsistency makes people read the config file and believe one value while the container holds another) |

## B. Things you only find out after listing — and then it is too late

| # | Pitfall | Basis | Our handling |
|---|---|---|---|
| B1 | **Template changes do not reach machines that already installed it**: at install time CA **copies** the template to `templates-user/my-*.xml`, "Nothing you change updates existing installations. Installing makes a copy of what it was at that time, done." | Forum (post by the CA author) | ⚠️ Therefore: ① critical behaviour that must persist has to live in the **image**, not in template fields; ② the only critical item currently depending on a template field is the two `--security-opt` in `ExtraParams` — **if they ever need changing, existing users will not get it automatically**, so when the sandbox is unavailable the image must produce an actionable error (currently `SANDBOX_UNAVAILABLE` + a documentation link); ③ if the template really must change, announce it in the support thread first |
| B2 | Even **purely informational fields** get pinned: after the maintainer updated `<Overview>`, CA showed the new text, but **the Docker page on machines that had already installed it still showed the old wording** (`my-*.xml` holds the copy from the moment of installation) | Forum (measured by the PassForge maintainer) | ⚠️ So `<Overview>` must not contain things that go stale such as "the latest version is X"; we leave version information to image tags and Releases |
| B3 | **The CA central feed stalls**: from 2026-09-13 to 09-15 the central feed was not rebuilt, so maintainers' template changes were not visible in CA (not your fault) | Forum | ⚠️ If it does not show up for a long time after submission, first check "Last Change To Application Feed" on the CA status panel; do not rush to keep changing the template |
| B4 | **Review is manual and has a queue**: the Claude Code plugin was "sent in the application last night" and only appeared the next day; OpenClaw spent a long time "still waiting on approval" | Forum | ⚠️ Allow several days; do not submit repeatedly during that time |
| B5 | **Being marked deprecated = users lose security updates**: the Paperclip template was deprecated for no longer being maintained, and the author stated plainly "you won't receive updates, including security fixes" | Forum | ✅ our version-tracking pipeline checks upstream every day and builds and pushes automatically; the maintenance cost is squeezed down to "automatic as soon as upstream releases" |

## C. Points reviewers watch (especially for AI-type applications)

| # | Pitfall | Basis | Our handling |
|---|---|---|---|
| C1 | **"AI-generated, lacking human review" is an explicit minus**: the original words of a CA community developer — "both plugins give me a very solid sense of 'this was AI-coded without a substantial human review / understanding of what it does'", and he pointed out that not following the conventions triggers "quality/safety" concerns | Forum (Community Developer) | ✅ small and explainable code base on both sides: this repository is a template plus four check scripts, and the image (built in [dsh-docker](https://github.com/MeiXu6693/dsh-docker)) is a Dockerfile + two Caddyfiles + one entrypoint + three scripts, with smoke tests, template self-checks and documented sandbox controlled experiments. **You personally must be able to explain every part** (especially the two `--security-opt`) |
| C2 | **"Someone else will review the code for me" is a wrong expectation**: "It's your plugin. You write it, not the CA team… This expectation that someone else will do a code review for you is wrong." | Forum | ⚠️ once listed, it is your responsibility; the support thread must give a troubleshooting path |
| C3 | **Containers are encouraged more than plugins**: "Plugins which are better suited as a docker application are not eligible for inclusion in CA", and containers are "better from a security/safety standpoint" | Forum (Community Developer relaying CA policy) | ✅ we take the Docker template route (the correct one) |
| C4 | **root / docker.sock / `/boot` / credentials in the template** are review focal points: the community explicitly lists `/boot` and `/var/run/docker.sock` as host paths that should be excluded; another post stresses "Claude Code running as root has unrestricted ability…" | Forum | ✅ inside the container we initialize as root and then drop to **a non-root identity (`PUID`/`PGID`, 1000 by default)**; no docker socket, no `/boot`; **the template requires no API key** (model credentials are managed by DSH itself under `/data`) |
| C5 | **Downloading executables at runtime will be flagged for rework**: to comply with CA standards, OpenClaw changed to "Homebrew no longer automatically downloaded" | Forum | ✅ all external binaries (Caddy, Node dependencies) are fetched at **build time**; at container startup only existing files are read |
| C6 | **CVEs and dependency surface** will be used to challenge you (three MCP-related CVEs were cited repeatedly) | Forum | ⚠️ our dependency surface is the closed dependency tree of the official npm package `@deepseek-ai/dsh` + the official Caddy release; the image enables `sbom` and `provenance` attestations, which can be given in the support thread |

## D. One thing you need to decide

| # | Item | Recommendation |
|---|---|---|
| D1 | Whether to mark `<Beta>true</Beta>` | The official field description says `<Beta>` is a "Legacy beta marker. Only true survives"; **upstream DSH currently publishes alpha/rc version numbers** (we track the highest semver), and **this packaging itself is stable**. My recommendation: **do not mark it for now**; the support thread and `<Overview>` state that the image follows the newest upstream version. If a reviewer suggests marking Beta, change it then (note B1: changing the template does not affect already-installed machines, but it does affect new users) |

---

## Self-check commands before submitting

```bash
# 1. Official requirements: ca_profile.xml exists with a non-empty <Profile>; the template carries all minimum/recommended fields
node scripts/check-template.mjs templates/dsh.xml

# 2. Render a "release" template and check it again (this is how the release assets are generated)
node scripts/render-template.mjs --owner=meixu6693 --repo=dsh-unraid --tag=latest --out=/tmp/dsh.xml
node scripts/check-template.mjs /tmp/dsh.xml

# 3. Image anonymously pullable + multi-architecture
curl -s "https://ghcr.io/token?scope=repository:meixu6693/dsh:pull&service=ghcr.io" | head -c 80

# 4. The icon must be reachable from China (raw and jsdelivr both fail, see docs/ca-submission.md)
curl -sI "https://gh-proxy.com/https://raw.githubusercontent.com/MeiXu6693/dsh-unraid/main/templates/img/dsh.png" | head -1
```
