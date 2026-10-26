<h1 align="center">MeiXu 的 Unraid 模板库</h1>

<p align="center">MeiXu 维护的 Unraid Community Applications 模板：每个应用一个 XML，镜像在各自仓库构建与发布。目前收录一个应用：<b>DSH</b>。</p>

<p align="center"><a href="README.md">English</a> · <b>中文说明</b></p>

<p align="center">
  <a href="https://github.com/MeiXu6693/unraid-templates/actions/workflows/validate.yml"><img src="https://github.com/MeiXu6693/unraid-templates/actions/workflows/validate.yml/badge.svg" alt="validate"></a>
  <a href="https://github.com/MeiXu6693/dsh-docker/releases"><img src="https://img.shields.io/github/v/release/MeiXu6693/dsh-docker?label=image&color=orange" alt="image"></a>
  <img src="https://img.shields.io/badge/platforms-amd64%20%7C%20arm64-lightgrey" alt="platforms">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
</p>

---

## 这个库里的模板

| 应用 | 是什么 | 安装 | 支持 |
|---|---|---|---|
| **DSH** | DeepSeek Harness——浏览器里用的开源 AI 编程智能体，为 Unraid 打包。 | **Apps → DSH**，或把 [`templates/dsh.xml`](templates/dsh.xml) 粘进 *Docker → Add Container* | [Unraid 论坛帖](https://forums.unraid.net/topic/200908-support-dsh-deepseek-harness-ai-coding-agent-in-your-browser/) |

## DSH for Unraid

<p><a href="https://forums.unraid.net/topic/200908-support-dsh-deepseek-harness-ai-coding-agent-in-your-browser/">Community Applications</a> 上的 DSH（<a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>，浏览器里用的 AI 编程智能体）模板：一个容器、命令沙箱在 Unraid 内核上直接可用、装的插件跨更新存活、内置远程登录、跟随上游自动更新。</p>

## 这个模板的优势

- **插件（以及插件要调用的命令行工具）跨更新存活。** 两者都在你的持久数据目录里、不在镜像里，所以 *force update* 不会把它们删掉：[装插件](#装插件)。
- **DeepSeek 账号登录在任何浏览器上都可用。** 镜像内置远程登录插件并默认开启——登录标签页停在打不开的 `127.0.0.1` 页面后，粘贴面板会自己出现在 DSH 页面里。把模板里的 **Remote Sign-in** 设为 `off` 就回到上游「仅回环」的行为。
- **上游更新由它替你跟。** 每小时的任务解析上游最新版本、重建镜像并在构建出的容器上跑冒烟；全部通过才发布——你要做的只是 Docker 页上的 **force update**，而 `/data` 与 `/workspace` 不会被它动到（[更新](#更新)）。

## 安装

1. 打开 **Apps** 标签页搜索 **DSH**——已收录进 Community Applications。*feed 还没刷新？* 用 **Docker → Add Container**，把 [`templates/dsh.xml`](templates/dsh.xml) 的内容粘进模板编辑器。
2. **Extra Parameters 不要动**——那两个 `--security-opt` 是智能体的沙箱能在 Unraid 上工作的前提；`--restart=unless-stopped` 让它在 Docker 重启后自动回来。
3. 点 Apply，然后打开 **`http://<你的服务器>:8080`**，用户名 `dsh`，口令用 **Password** 字段里的值。

## 头五分钟

1. **先改口令。** 模板自带 `12345678`，这是公开值：Docker 页 → 该容器 → *Edit* → **Password** → Apply。（模板会一直提供默认值 `12345678`；builtin 模式下没有口令容器会拒绝启动。）
2. **指向你的项目。** 智能体在 `/workspace` 里干活（默认 `appdata/dsh/workspace`）。
3. **填 DeepSeek API Key**：设置面板里的 *Add API key*。用 DeepSeek **账号**登录从任何浏览器也能完成：登录标签页停在打不开的 `127.0.0.1` 页面时，页面里会自动出现粘贴框——详见镜像仓库的 [docs/remote-signin.zh-CN.md](https://github.com/MeiXu6693/dsh-docker/blob/main/docs/remote-signin.zh-CN.md)。

## 模板字段

每个变量的完整说明（以及它背后的安全模型）见项目文档：[设置与环境变量](https://github.com/MeiXu6693/dsh-docker/blob/main/README.zh-CN.md#可能会用到的设置) 与 [安全模型](https://github.com/MeiXu6693/dsh-docker/blob/main/docs/security.zh-CN.md)。

**PUID、PGID、UMASK、数据目录以及代理/登录细节在「显示更多设置」里**——默认安装显示端口、用户名、口令、认证方式和工作目录。

| 字段 | 默认 | 作用 |
|---|---|---|
| WebUI Port | `0.0.0.0:8080` | 宿主侧绑定。**必须写成 `IP:端口`**——Unraid 会把裸端口号误解析成 IP，容器会卡在 `Created`。 |
| Data Directory | `/mnt/user/appdata/dsh/data` | `DSH_HOME`：会话、凭据、智能体主目录、Caddy 状态。必须持久化。 |
| Workspace Directory | `/mnt/user/appdata/dsh/workspace` | 智能体的工作目录。 |
| PUID / PGID | `99` / `100` | DSH 及其派生的所有进程以哪个 uid/gid 运行。Unraid 的 appdata 属主通常是 `nobody:users`，所以模板默认 `99` / `100`；compose / 通用部署可用 `1000` / `1000`。容器每次启动都会把 `/data`、`/workspace` 与 HOME 的属主交给这对值，改完重启即可。 |
| UMASK | `022` | 新建文件的权限掩码（文件 `644`、目录 `755`）。`002` 会让新文件同组可写；不要用 `000`。 |
| Allowed Clients | 私有网段 + Tailscale | 谁能访问界面。想收紧就删掉多余网段；**镜像自身的默认值是仅回环**。 |
| Username / Password | `dsh` / `12345678` | 容器自带门禁的账号口令。**务必改掉口令。** |
| Authentication Mode | `builtin` | `builtin` = 容器自带口令门禁；`none` = 交给前面的反向代理 / SSO（别叠两层登录）。 |
| Trusted Proxy CIDRs | 空 | 仅当前面有反向代理：只对这些来源读取 `X-Forwarded-For`，让白名单看到真实客户端地址。 |
| Public URL | 空 | 反向代理对外提供的 origin（`https://dsh.example.com`）；纯内网留空。 |
| Remote Sign-in | `on` | 远程浏览器用 DeepSeek **账号**登录（多一步粘贴）。`off` = 上游行为。 |
| Time Zone | `Asia/Shanghai` | 容器时区。 |
| Extra Parameters | `--security-opt seccomp=unconfined --security-opt systempaths=unconfined --restart=unless-stopped` | **不要删掉那两个 `--security-opt`**，原因见下。 |

## 为什么需要那两个 `--security-opt`

Unraid 内核没有编入 Landlock，DSH 的命令沙箱只剩第二梯队：镜像内置的 bubblewrap。而
`bwrap` 要创建命名空间，容器默认的 seccomp 配置与 `/proc` 掩码会挡住它——这两个参数就是
放行的东西。没有它们，智能体的 bash 工具会拒绝执行并报 `SANDBOX_UNAVAILABLE`。

对照实验、取舍，以及两种会误报的自查方式都在项目的沙箱说明里：
[docs/sandbox.zh-CN.md](https://github.com/MeiXu6693/dsh-docker/blob/main/docs/sandbox.zh-CN.md)。

## 更新

**Docker → 你的容器 → force update**（或点「apply update」提示）。`/data` 与 `/workspace` 里的东西都不会动。

| 标签 | 含义 |
|---|---|
| `:latest` | 最新构建（含上游预发布版）——模板用的就是它 |
| `:0.2.1-alpha.4` | 钉住某个确切版本 |
| `:alpha` · `:rc` · `:stable` | 跟随某个上游通道 |

镜像在上游一发版就自动重建并冒烟测试，这里不需要任何配置——更新即可。发布说明见
[Releases](https://github.com/MeiXu6693/dsh-docker/releases)。

## 装插件

DSH 插件装在你持久 **Data Directory** 里的 profile 目录下，所以更新之后依然在：

```bash
docker exec -u <PUID> <容器名> dsh plugin --profile web add @scope/some-plugin
docker exec -u <PUID> <容器名> dsh plugin --profile web add github:owner/repo
```

装完请重启容器，让 profile 重新组合。务必带 `-u <PUID>`——就是模板里设的那个 uid（Unraid 默认 `99`，compose 用 `1000`）：用 root 装，包在 appdata 里属 root，之后以该 PUID 运行的 DSH 就读不到了。如果插件还要调自己的命令行工具，那个工具也得装在数据目录下——镜像 README 写了它在每次启动时会扫的两种布局：[自己装命令行工具](https://github.com/MeiXu6693/dsh-docker/blob/main/README.zh-CN.md#自己装命令行工具)。

远程登录插件已经在镜像里且默认开启——这一节是给你自己加别的东西用的。

## 常见问题

| 现象 | 处理 |
|---|---|
| 工具报 `SANDBOX_UNAVAILABLE` | **Extra Parameters** 里的两个 `--security-opt` 被删了，补回去。自查时注意：`systempaths=unconfined` **不会**出现在 `docker inspect` 的 `SecurityOpt` 里（它表现为 `MaskedPaths`/`ReadonlyPaths` 变空），而 bwrap **只在非 root 的 uid 下可用**——用 `docker exec -u <PUID> <容器> bwrap --ro-bind / / --dev /dev --unshare-pid --proc /proc --die-with-parent -- true` 测（`<PUID>` 就是模板里的 PUID：Unraid 默认 `99`，compose 用 `1000`），必须 exit 0。用 root 测必然失败，那不能说明容器有问题。 |
| 浏览器拿到 `403` | 你的地址不在 **Allowed Clients** 里。 |
| 页面提示 “dsh web authentication required; reopen the URL printed by dsh web” | **刷新页面即可**——容器会自己把失效的会话 Cookie 换新（也可手动打开 `http://<主机>:<端口>/renew`）。 |
| 更新了却没变化 | Unraid 只在镜像 digest 变化时重建容器——用 **force update**。 |
| 镜像报 `Page not found`、或容器建不起来 | 2026-10-24 改过 GitHub 用户名，**旧镜像地址已经彻底失效**：`ghcr.io/2220545672/dsh` 现在回 `manifest unknown`，它的包页面是 404（仓库地址改名后会跳转，**镜像路径不会**）。`main` 上的模板已经指向 `ghcr.io/meixu6693/dsh:latest`；Community Applications 的目录条目要到下一次 feed 重建才会更新，所以先刷新 Apps 页，或者干脆跳过 CA、把 [`templates/dsh.xml`](templates/dsh.xml) 的内容粘进 **Docker → Add Container**。**容器已经装过？** Docker 页 → 该容器 → *Edit* → 把 **Repository** 改成 `ghcr.io/meixu6693/dsh:latest` → Apply，`/data` 与 `/workspace` 都不受影响。 |
| 页面一直转圈 | **Public URL** 必须与你实际打开的地址一致（协议 + 主机，不带路径）。`docker logs <容器名> \| head -30` 会打印它选定的模式。 |

更多排障（登录粘贴面板、Caddy/DSH 内部、`docker inspect` 细节）见
[项目文档](https://github.com/MeiXu6693/dsh-docker/blob/main/README.zh-CN.md#常见问题)。

## 从别的 DSH 镜像迁过来

从 `ghcr.io/okxlin/deepseek-harness`（容器常叫 `dsh-web`）等社区镜像切过来、把停机时间压到最小：
[docs/migrate-from-another-image.zh-CN.md](docs/migrate-from-another-image.zh-CN.md)。

## 支持

- **Unraid 论坛帖：**[DSH — DeepSeek Harness, AI coding agent in your browser](https://forums.unraid.net/topic/200908-support-dsh-deepseek-harness-ai-coding-agent-in-your-browser/)——请附上 `docker logs DSH | head -30`、Unraid 与内核版本（`uname -r`）、以及 **Public URL** / **Allowed Clients** 的设置。
- **Bug 与建议：**[GitHub Issues](https://github.com/MeiXu6693/dsh-docker/issues)。
- **DSH 自身的问题**（模型、插件、界面）：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)。

## 许可

MIT，见 [LICENSE](LICENSE)。DeepSeek Harness 本身由 DeepSeek 以 MIT 发布；这份打包只多了 Unraid 模板、图标与文档。

社区打包项目：与 DeepSeek、Lime Technology 均无隶属或授权关系。图标由官方 DSH 标识与官方 Unraid 标识合成（[来源与商标说明](templates/img/src/README.md)）。
