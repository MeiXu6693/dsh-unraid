<h1 align="center">MeiXu's Unraid Templates</h1>

<p align="center">Unraid Community Applications templates maintained by MeiXu — one XML per app, with each image built and released in its own repository. Currently one app: <b>DSH</b>.</p>

<p align="center"><b>English</b> · <a href="README.zh-CN.md">中文说明</a></p>

<p align="center">
  <a href="https://github.com/MeiXu6693/unraid-templates/actions/workflows/validate.yml"><img src="https://github.com/MeiXu6693/unraid-templates/actions/workflows/validate.yml/badge.svg" alt="validate"></a>
  <a href="https://github.com/MeiXu6693/dsh-docker/releases"><img src="https://img.shields.io/github/v/release/MeiXu6693/dsh-docker?label=image&color=orange" alt="image"></a>
  <img src="https://img.shields.io/badge/platforms-amd64%20%7C%20arm64-lightgrey" alt="platforms">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
</p>

---

## Templates in this repository

| App | What it is | Install | Support |
|---|---|---|---|
| **DSH** | DeepSeek Harness — an open-source AI coding agent you drive from the browser, packaged for Unraid. | **Apps → DSH**, or paste [`templates/dsh.xml`](templates/dsh.xml) into *Docker → Add Container* | [Unraid forum thread](https://forums.unraid.net/topic/200908-support-dsh-deepseek-harness-ai-coding-agent-in-your-browser/) |

## DSH for Unraid

<p>The Community Applications template for <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> — a coding agent you drive from the browser, running on your Unraid server. One container, a command sandbox that works on Unraid kernels, plugins that survive an update, remote sign-in built in, updated automatically from upstream.</p>

## What you get

- **Plugins — and the command-line tools they call — survive updates.** Both live on your
  persistent data directory, not in the image, so a *force update* does not remove them:
  [Plugins](#plugins).
- **DeepSeek account sign-in from any browser.** The image ships the remote sign-in plugin
  and enables it by default — the login tab ends on a dead `127.0.0.1` page and the paste
  panel appears in the DSH page by itself. Set **Remote Sign-in** to `off` for upstream's
  loopback-only behaviour.
- **It follows upstream for you.** An hourly job resolves the newest upstream release,
  rebuilds the image and smoke-tests the built container; it is published only when every
  check passes, so your part is **force update** on the Docker tab — and `/data` +
  `/workspace` survive it ([Update](#update)).

## Install

1. Open the **Apps** tab and search for **DSH** — it is listed in Community Applications. *Feed not refreshed yet?* Use **Docker → Add Container** and paste [`templates/dsh.xml`](templates/dsh.xml) into the template editor.
2. Leave **Extra Parameters** as it is. The two `--security-opt` values are what let the agent's command sandbox work on Unraid, and `--restart=unless-stopped` brings it back after a Docker restart.
3. Apply, then open **`http://<your-server>:8080`** and log in with user `dsh` and the password from the **Password** field.

## First five minutes

1. **Change the password.** The template ships `12345678`, which is public knowledge — Docker tab → the container → *Edit* → **Password** → Apply. (Cleared, the container generates one and prints it once: `docker logs <container>`.)
2. **Point it at your project.** The agent works in `/workspace` (default `appdata/dsh/workspace`).
3. **Add a DeepSeek API key** — *Add API key* in the settings panel. A DeepSeek **account** also works from any browser: the login tab ends on a dead `127.0.0.1` page and a paste panel appears in the DSH page by itself — see the image's [docs/remote-signin.md](https://github.com/MeiXu6693/dsh-docker/blob/main/docs/remote-signin.md).

## Template fields

Full descriptions of every variable — and of the security model behind them — are in the project documentation: [settings and environment variables](https://github.com/MeiXu6693/dsh-docker#settings-you-may-need) and [the security model](https://github.com/MeiXu6693/dsh-docker/blob/main/docs/security.md).

| Field | Default | What it does |
|---|---|---|
| WebUI Port | `0.0.0.0:8080` | Host-side binding. **It must be written as `IP:port`** — Unraid mis-parses a bare port number as an IP and the container stays in `Created`. |
| Data Directory | `/mnt/user/appdata/dsh/data` | `DSH_HOME`: sessions, credentials, agent home, Caddy state. Must be persistent. |
| Workspace Directory | `/mnt/user/appdata/dsh/workspace` | The agent's working directory. |
| PUID / PGID | `1000` / `1000` | The uid/gid DSH and everything it spawns run as. **On Unraid set `99` / `100`** — appdata is normally owned by `nobody:users`; `1000:1000` is the compose/generic default. The container hands `/data` and `/workspace` over to this pair at every start, so a change needs only a restart. |
| Allowed Clients | private ranges + Tailscale | Who may reach the UI at all. Narrow it to your own network if you like; the image's own default is loopback only. |
| Username / Password | `dsh` / `12345678` | The container's built-in gate. **Change the password.** |
| Authentication Mode | `builtin` | `builtin` = the container's own password gate; `none` = an authenticating proxy or SSO in front (do not stack two logins). |
| Trusted Proxy CIDRs | empty | Only behind a reverse proxy: read `X-Forwarded-For` from these peers so the allowlist sees the real client address. |
| Public URL | empty | The origin a reverse proxy serves (`https://dsh.example.com`); empty for a trusted LAN. |
| Trusted Hosts | empty | Extra accepted authorities; only used with `Public URL`. |
| Remote Sign-in | `on` | DeepSeek **account** sign-in from a remote browser (one paste step). `off` = upstream behaviour. |
| Time Zone | `Asia/Shanghai` | Container time zone. |
| Extra Parameters | `--security-opt seccomp=unconfined --security-opt systempaths=unconfined --restart=unless-stopped` | **Do not remove the two `--security-opt` values** — see below. |

## Why those two `--security-opt` values

Unraid kernels ship without Landlock, so DSH's command sandbox has only its second rung:
bubblewrap, which the image bundles. `bwrap` then needs to create namespaces, and the
container's default seccomp profile and `/proc` mask prevent that — the two flags are
what let it through. Without them the agent's bash tool refuses to run and reports
`SANDBOX_UNAVAILABLE`.

The controlled experiments, the trade-off and the two checks that produce false alarms
are in the project's sandbox notes:
[sandbox.md](https://github.com/MeiXu6693/dsh-docker/blob/main/docs/sandbox.md).

## Update

**Docker → your container → force update** (or click the "apply update" hint). Everything in `/data` and `/workspace` survives.

| Tag | Meaning |
|---|---|
| `:latest` | Newest build, upstream prereleases included — what the template uses |
| `:0.2.1-alpha.4` | Pin an exact version |
| `:alpha` · `:rc` · `:stable` | Follow one upstream channel |

The image is rebuilt and smoke-tested automatically as soon as upstream publishes a
release, so there is nothing to configure here — just update. Release notes:
[Releases](https://github.com/MeiXu6693/dsh-docker/releases).

## Plugins

DSH plugins are installed into the profile that lives on your persistent **Data
Directory**, so they are still installed after an update:

```bash
docker exec -u <PUID> <container> dsh plugin --profile web add @scope/some-plugin
docker exec -u <PUID> <container> dsh plugin --profile web add github:owner/repo
```

Restart the container afterwards so the profile is composed again. Use `-u <PUID>` — the
same uid you set in the template (`1000` by default, `99` on Unraid): as root the package
ends up owned by root inside your appdata directory, and DSH — which runs as that PUID —
can no longer read it. A plugin that shells out to its own command-line tool
needs that tool under the data directory as well; the image README documents the two
layouts it scans at every start:
[Installing your own CLI tools](https://github.com/MeiXu6693/dsh-docker#installing-your-own-cli-tools).

The remote sign-in plugin is already in the image and on by default — this is for
everything else you want to add.

## Problems

| Symptom | Fix |
|---|---|
| A tool reports `SANDBOX_UNAVAILABLE` | The two `--security-opt` values were removed from **Extra Parameters**. Put them back. When you check: `systempaths=unconfined` never appears in `docker inspect`'s `SecurityOpt` (it shows up as empty `MaskedPaths`/`ReadonlyPaths`), and bwrap only works as a **non-root uid** — test with `docker exec -u <PUID> <container> bwrap --ro-bind / / --dev /dev --unshare-pid --proc /proc --die-with-parent -- true` (`<PUID>` = the template's PUID: `1000` by default, `99` on Unraid), which must exit 0. Run as root it always fails, which says nothing about the container. |
| The browser gets `403` | Your address is not in **Allowed Clients**. |
| “dsh web authentication required; reopen the URL printed by dsh web” | **Just reload the page** — the container renews a stale session cookie by itself (also possible by hand: `http://<host>:<port>/renew`). |
| Updated, but nothing changed | Unraid recreates a container only when the image digest changes — use **force update**. |
| `Page not found` when you open the image, or the container will not build | The GitHub account was renamed on 2026-10-24 and **the old image path is gone for good**: `ghcr.io/2220545672/dsh` now answers `manifest unknown` and its package page is a 404 (repository URLs redirect after a rename; registry paths do not). The template on `main` already installs `ghcr.io/meixu6693/dsh:latest` — the Community Applications catalogue can keep showing the old address until its next feed rebuild, so refresh the Apps page, or skip CA and paste [`templates/dsh.xml`](templates/dsh.xml) into **Docker → Add Container**. **Container already installed?** Docker tab → the container → *Edit* → set **Repository** to `ghcr.io/meixu6693/dsh:latest` → Apply. `/data` and `/workspace` are untouched. |
| Page never finishes loading | **Public URL** must match the address you actually open (scheme + host, no path). `docker logs <container> \| head -30` prints the mode it chose. |

More troubleshooting (the sign-in paste panel, Caddy/DSH internals, `docker inspect`
details) is in the [project documentation](https://github.com/MeiXu6693/dsh-docker#problems).

## Moving over from another DSH image

Switching from `ghcr.io/okxlin/deepseek-harness` (container `dsh-web`) or a similar
community image, with minimal downtime: [docs/migrate-from-another-image.md](docs/migrate-from-another-image.md).

## Support

- **Unraid forum thread:** [DSH — DeepSeek Harness, AI coding agent in your browser](https://forums.unraid.net/topic/200908-support-dsh-deepseek-harness-ai-coding-agent-in-your-browser/) — please include `docker logs DSH | head -30`, your Unraid and kernel version (`uname -r`), and how **Public URL** / **Allowed Clients** are set.
- **Bugs and requests:** [GitHub Issues](https://github.com/MeiXu6693/dsh-docker/issues).
- **Bugs in DSH itself** (models, plugins, UI): [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).

## License

MIT — see [LICENSE](LICENSE). DeepSeek Harness itself is MIT, published by DeepSeek; this packaging only adds the Unraid template, the icon and the documentation.

Community packaging: not affiliated with, endorsed by or authorised by DeepSeek or Lime Technology. The icon combines the official DSH mark with the official Unraid mark ([sources and trademark note](templates/img/src/README.md)).
