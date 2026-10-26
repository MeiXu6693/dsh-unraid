[English](migrate-from-another-image.md) · **中文**

# 从别的 DSH 镜像迁移过来

如果你现在跑的是社区里的其它 DSH 镜像（例如 `ghcr.io/okxlin/deepseek-harness`，容器名常叫 `dsh-web`），想换成 `ghcr.io/<owner>/dsh`，这份文档讲清"最小中断"的做法。

下面用占位符表示你自己的环境：`<old-container>` = 现有容器名，`<your.domain>` = 反代对外域名，`<appdata>` = `/mnt/user/appdata/<你的应用目录>`。

## 先想清楚三件事

1. **容器名可能变**。Unraid 的容器名取自模板的 `<Name>`（本模板是 `DSH`）。如果你的反向代理（SWAG 等）是按**容器名**解析上游的，容器一改名就会 502。两种做法：
   - 改反代的上游指向，然后 `docker exec <proxy> nginx -t && docker exec <proxy> nginx -s reload`；
   - 或者新建容器时把 `<Name>` 手动改成 `<old-container>`，反代就完全不用动。
   > 反代与容器必须在同一个 docker 网络上，否则容器名解析不了。
2. **数据可以原地复用**。本模板默认把 `/data` 指到 `/mnt/user/appdata/dsh/data`；若你原来的数据在别处（例如 `<appdata>/data`），**把模板里两个 Path 改回旧路径即可**，会话与凭据原样保留。想用新路径就 `mv` 过去，并保持属主为你设置的 `PUID`/`PGID`（Unraid 默认 `99:100`，compose 用 `1000:1000`）。
3. **切换会中断正在进行的会话**。停掉旧容器 = 浏览器断线。建议先并行起一个新容器验证，确认无误再切端口与反代，最后删旧容器——**不要**在当前会话里直接 `docker rm -f <old-container>`，用脱离会话的方式或由 GUI 操作。

## 迁移步骤（最小中断）

### 1. 先建新容器（不动旧的）

Unraid `Docker → Add Container` → 导入 `templates/dsh.xml`，然后按需调整：

| 字段 | 建议值 | 理由 |
|---|---|---|
| 名称 | `DSH`（或沿用 `<old-container>`） | 决定容器名，见上文第 1 点 |
| 端口 | 先换一个宿主端口（例如 `127.0.0.1:3081`） | 避开旧容器占用的端口，可并行验证 |
| `/data` | 旧的数据目录 | 免搬数据；空目录也可以在，首次启动会自动初始化 |
| `/workspace` | 旧的工作区目录 | 同上 |
| `PUBLIC_URL` | `https://<your.domain>` | 走 edge 模式（前置反代 + 鉴权）；纯内网可留空 |
| Extra Parameters | **保持默认**（两个 `--security-opt`） | 否则 bash 工具在 Unraid 上不可用，见[沙箱说明](https://github.com/MeiXu6693/dsh-docker/blob/main/docs/sandbox.zh-CN.md) |

### 2. 验证

```bash
docker ps --filter name=DSH --format "{{.Names}} {{.Status}} {{.Ports}}"
docker logs --tail 40 DSH
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:<新端口>/healthz      # 期望 200
```

浏览器打开 `http://<宿主IP>:<新端口>`：能进界面，并且随便让它跑一条命令（例如 `pwd`）**不报 `SANDBOX_UNAVAILABLE`** —— 这一步才真正验证了 bubblewrap 沙箱可用。

### 3. 切换

1. 把新容器的端口改回你原来对外用的那个（GUI 里编辑容器 → 改端口 → Apply）。
2. 若容器名变了，改反代上游并 reload；用容器名 grep 一下反代配置里所有引用，别漏站点。
3. 浏览器验证 `https://<your.domain>`，确认登录、会话历史、模型设置都在。
4. 确认无误后再删旧容器。如果旧容器当初不是用模板创建的（没有 `net.unraid.docker.managed=dockerman` 标签），它本来在 Docker 页里就没有更新入口，删掉反而更干净。
5. 新容器由模板创建，自带 `dockerman` 标签，Docker 页会正常显示 **更新入口**。

### 4. 回滚

删旧容器之前，回滚 = 把反代上游改回去 + 启动旧容器。删掉之后，只要你保留了旧容器的模板 XML（`templates-user/my-*.xml`），仍可用它重建——注意那指向的是旧镜像。

## 之后每次上游发版

本镜像**自动跟版**：每小时检查 npm 上 `@deepseek-ai/dsh` 的最高版本（含 alpha/rc），有新版本就构建、冒烟、推送，并建 `dsh-v<版本>` 标签与 Release（那个 `v` 与上游自己的 release tag 命名一致）。你只需要在 Unraid 的 Docker 页点一次 **force update**（或等它提示 apply update），不需要改任何配置。
