**English** · [中文](migrate-from-another-image.zh-CN.md)

# Migrating from another DSH image

If you are running one of the community DSH images (for example `ghcr.io/okxlin/deepseek-harness`, whose container is often called `dsh-web`) and want to switch to `ghcr.io/<owner>/dsh`, this document lays out the "minimal downtime" approach.

The placeholders below stand for your own environment: `<old-container>` = the existing container name, `<your.domain>` = the domain the reverse proxy serves, `<appdata>` = `/mnt/user/appdata/<your app directory>`.

## Three things to settle first

1. **The container name may change.** Unraid takes the container name from the template's `<Name>` (this template uses `DSH`). If your reverse proxy (SWAG and friends) resolves its upstream by **container name**, renaming the container means a 502. Two ways out:
   - Point the reverse proxy upstream at the new name, then `docker exec <proxy> nginx -t && docker exec <proxy> nginx -s reload`;
   - or set `<Name>` to `<old-container>` by hand when creating the new container, and the reverse proxy needs no changes at all.
   > The reverse proxy and the container must be on the same docker network, otherwise the container name will not resolve.
2. **Data can be reused in place.** This template points `/data` at `/mnt/user/appdata/dsh/data` by default; if your existing data is elsewhere (for example `<appdata>/data`), **point the template's two Path fields back at the old paths** and your sessions and credentials carry over unchanged. If you want the new paths, `mv` the data over and keep the owner at the `PUID`/`PGID` you set (`99:100` on Unraid, `1000:1000` for compose).
3. **Cutting over interrupts a session in progress.** Stopping the old container = the browser drops the connection. Start a new container alongside first and verify it, then switch the port and the reverse proxy, and delete the old container last — do **not** run `docker rm -f <old-container>` from inside the current session; use something detached from the session, or the GUI.

## Migration steps (minimal downtime)

### 1. Create the new container first (leave the old one alone)

Unraid `Docker → Add Container` → import `templates/dsh.xml`, then adjust as needed:

| Field | Suggested value | Why |
|---|---|---|
| Name | `DSH` (or keep `<old-container>`) | Decides the container name, see point 1 above |
| Port | Move to a different host port first (for example `127.0.0.1:3081`) | Avoids the port the old container occupies, so you can verify in parallel |
| `/data` | The old data directory | No data to move; an empty directory is fine too, it is initialized on first start |
| `/workspace` | The old workspace directory | Same as above |
| `PUBLIC_URL` | `https://<your.domain>` | Runs edge mode (reverse proxy + authentication in front); leave empty on a pure LAN |
| Extra Parameters | **Keep the default** (both `--security-opt` values) | Otherwise the bash tool is unusable on Unraid, see [the sandbox notes](https://github.com/MeiXu6693/dsh-docker/blob/main/docs/sandbox.md) |

### 2. Verify

```bash
docker ps --filter name=DSH --format "{{.Names}} {{.Status}} {{.Ports}}"
docker logs --tail 40 DSH
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:<new-port>/healthz      # expect 200
```

Open `http://<host-ip>:<new-port>` in a browser: you should reach the interface, and having it run any command (for example `pwd`) should come back **without `SANDBOX_UNAVAILABLE`** — only this step really proves the bubblewrap sandbox works.

### 3. Cut over

1. Change the new container's port back to the one you exposed before (edit the container in the GUI → change the port → Apply).
2. If the container name changed, update the reverse proxy upstream and reload; grep the reverse proxy configuration for the container name so no site is missed.
3. Verify `https://<your.domain>` in the browser: your login, session history and model settings should all be there.
4. Delete the old container only after that checks out. If the old container was not created from a template in the first place (no `net.unraid.docker.managed=dockerman` label), it never had an update entry on the Docker page anyway, so deleting it leaves things cleaner.
5. The new container is created from the template and carries the `dockerman` label, so the Docker page shows its **update entry** as usual.

### 4. Rollback

Before you delete the old container, rollback = point the reverse proxy upstream back + start the old container. After deleting it, you can still rebuild it from the old container's template XML (`templates-user/my-*.xml`) as long as you kept it — note that it points at the old image.

## On every upstream release afterwards

This image **tracks upstream automatically**: every hour it checks the highest version of `@deepseek-ai/dsh` on npm (alpha/rc included), and when a new version appears it builds, smoke-tests and pushes it, then creates a `dsh-v<version>` tag and a Release (the `v` matches upstream's own release tags). All you do is click **force update** once on the Unraid Docker page (or wait for the apply update hint); no configuration changes are needed.
