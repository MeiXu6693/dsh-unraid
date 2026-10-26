[English](ca-pitfalls.md) · **中文**

# 前人踩过的坑 —— 提交 CA 之前必须规避的清单

来源有两类：**官方文档**（`ca.unraid.net` Submit → Docs，2026-10-15 抓取）与**论坛实证**（维护者与 CA 作者的帖子，含具体后果）。
每条都标注了对本仓库的处置：✅ 已规避 / ⚠️ 需要你注意 / ❓ 需要你决定。

---

## A. 硬性门槛（不满足就是提交流程走不下去）

| # | 坑 | 依据 | 我们的处置 |
|---|---|---|---|
| A1 | **仓库根目录必须有 `ca_profile.xml`，且 `<Profile>` 非空**，否则"CA will block submission finalization" | 官方《Repository Information XML》 | ✅ 已补 [`ca_profile.xml`](../ca_profile.xml)（含 Profile / Icon / WebPage，`<Forum>` 留注释待填） |
| A2 | 仓库必须**公开、活跃**，且根目录有 **OSI 认可许可证** | 官方《Submission Help》 | ✅ 公开仓库 + MIT `LICENSE` |
| A3 | 每个应用条目必须有 `<Repository>`（Docker）或 `<PluginURL>`（插件） | 官方《Repository XML Format》 | ✅ `<Repository>` 指向 `ghcr.io/meixu6693/dsh:latest` |
| A4 | 提交时要跑 **Validate / Scan**，官方另写"每次有意义的 XML 改动后都要重跑" | 官方《Submission Help》 | ⚠️ 那句只对**新提交**成立：已收录仓库会被 `/submit/new` 拒绝（回"already enabled … no action required"），模板改动由 CA 在下一次 feed 重建时自动重解析（2026-10-16 实测：02:00 CST 推送 → 04:11 CST 生效）。见 [ca-submission.md](ca-submission.zh-CN.md) |
| A5 | **`:latest` 标签不存在会被拉黑**（实例：`ntop/ntopng is blacklisted with ":Latest tag does not exist"`） | 论坛 | ✅ 流水线**永远**同时推 `:latest` 与 `:<版本>`；不要改成只推版本号 |
| A6 | **声明与实际不符会被下架**：Unspin 因 `PluginURL` 与 .plg 内声明不一致被 CA 移除，修好后**仍需 moderator 手工重新上架**，等了数天 | 论坛 | ⚠️ `<Repository>`/`<TemplateURL>`/`<Registry>`/`<Icon>` 一律指向稳定、真实、短期内不会迁移的位置；**镜像与仓库名一旦提交就不要改**（受控例外：在同一次窗口里把本文件、模板 URL 与 CA 的 Repository URL 一起改掉） |
| A6b | **镜像路径不跟账号改名走。** 2026-10-26 实测：owner 从 `2220545672` 改成 `MeiXu6693`、本仓库全部引用都改了，但 GitHub 的重定向并不一致——`github.com/2220545672/…` 返回 301、`raw.githubusercontent.com/2220545672/…` 仍能给新内容，而 `ghcr.io/2220545672/dsh` 回 `manifest unknown`、它的包页面是 404。从 Apps 装的用户拿到的容器建不起来（[issue #2](https://github.com/MeiXu6693/unraid-templates/issues/2)），而其它检查全是绿的。 | 本机实测 + issue #2 | ✅ `scripts/check-image.mjs` 现在每次闸门都向 GHCR 要 manifest（顺带覆盖 A5）；`main` 上的模板已指向新路径。⚠️ 改名**之前**装过的机器，`templates-user/my-DSH.xml` 里仍留着旧 URL（CA 安装时拷一份模板就不再看上游），这些用户得自己把 **Repository** 改回 `ghcr.io/meixu6693/dsh:latest`（README → 常见问题）。 |
| A7 | **`Mask="true"` 只影响 GUI 显示**：值照样传给容器、也照样存在模板文件里（实测：`Mask="true"` + `my-own-secret-99` → 容器拿到 `DSH_PASSWORD=my-own-secret-99`；模板里也仍是这个值）。⚠️ 此前本条曾写成"遮蔽会让变量丢失"，那是**我们自己的检查脚本**用 `printf "%.11s"` 截断 `DSH_PASSWORD`（12 字符）导致比较永不成立而看漏的，已订正 | 本机对照实验（Mask true/false 两次重建）+ 直接 `grep '^DSH_PASSWORD'` | ✅ **Password** 字段用 `Mask="true"`（界面圆点）且值只写在 `Default` 里；`scripts/check-template.mjs` 不再禁止 Mask，只在注释里记录这段教训 |
| A8 | **Config 取值规则**：元素**文本非空时以文本为准**，**文本为空时回退 `Default`**。实测两次：端口字段文本 `0.0.0.0:8080` + Default `0.0.0.0:3082` → 容器真的绑到 **8080**；口令字段文本清空 + Default `12345678` → 容器真的拿到 **12345678** | 本机两次重建实测 | ✅ `scripts/check-template.mjs` 断言"文本要么为空、要么等于 Default"（不一致会让人看配置文件以为是一个值、容器里却是另一个值） |

## B. 上架之后才发现就晚了

| # | 坑 | 依据 | 我们的处置 |
|---|---|---|---|
| B1 | **模板改动不会同步到已安装的机器**：CA 安装时把模板**拷贝**一份到 `templates-user/my-*.xml`，"Nothing you change updates existing installations. Installing makes a copy of what it was at that time, done." | 论坛（CA 作者帖） | ⚠️ 因此：① 需要长期存在的关键行为必须落在**镜像**里，而不是模板字段；② 目前唯一依赖模板字段的关键项是 `ExtraParams` 里那两个 `--security-opt`——**万一将来要改，老用户不会自动获得**，所以镜像在沙箱不可用时必须给出可执行的报错（现在是 `SANDBOX_UNAVAILABLE` + 文档链接）；③ 真要改模板时，先在支持帖里发公告 |
| B2 | 连**纯信息字段**也会被钉住：维护者更新 `<Overview>` 后，CA 里显示新的，但已安装机器的 **Docker 页面仍显示旧文案**（`my-*.xml` 里是安装那一刻的副本） | 论坛（PassForge 维护者实测） | ⚠️ 所以 `<Overview>` 不要写"最新版本是 X"这类会过期的内容；我们把版本信息交给镜像标签与 Release |
| B3 | **CA 中心 feed 会停摆**：2026-09-13→09-15 中心 feed 未重建，维护者改了模板在 CA 里看不到（不是你的错） | 论坛 | ⚠️ 若提交后长时间不出现，先查 CA 状态面板的 "Last Change To Application Feed"，别急着反复改模板 |
| B4 | **审核是人工的，且有等待**：Claude Code 插件"sent in the application last night"次日才出现；OpenClaw 长时间"still waiting on approval" | 论坛 | ⚠️ 预留数天；这期间不要反复提交 |
| B5 | **被标记废弃 = 用户失去安全更新**：Paperclip 模板因停止维护被 deprecated，作者明说"you won't receive updates, including security fixes" | 论坛 | ✅ 我们的跟版流水线每天检查上游并自动构建推送；维护成本被压到"上游发版即自动" |

## C. 审核者会盯的点（AI 类应用尤其）

| # | 坑 | 依据 | 我们的处置 |
|---|---|---|---|
| C1 | **"AI 生成、缺少人工审查"是明确的扣分项**：CA 社区开发者原话——"both plugins give me a very solid sense of 'this was AI-coded without a substantial human review / understanding of what it does'"，并指出不符合约定会引发"quality/safety"担忧 | 论坛（Community Developer） | ✅ 两侧代码量都小且可解释：本仓库是模板 + 四个检查脚本；镜像（在 [dsh-docker](https://github.com/MeiXu6693/dsh-docker) 构建）是 Dockerfile + 两个 Caddyfile + 一个 entrypoint + 三个脚本，另有冒烟测试、模板自检与沙箱对照实验文档。**你本人要能讲清每一处**（尤其两个 `--security-opt`） |
| C2 | **"别人会替我审代码"是错误预期**："It's your plugin. You write it, not the CA team… This expectation that someone else will do a code review for you is wrong." | 论坛 | ⚠️ 上架即你负责；支持帖要给出排障路径 |
| C3 | **容器比插件更被鼓励**："Plugins which are better suited as a docker application are not eligible for inclusion in CA"，且容器"better from a security/safety standpoint" | 论坛（Community Developer 转述 CA 政策） | ✅ 我们走 Docker 模板路线（正确的那条） |
| C4 | **root / docker.sock / `/boot` / 模板里的凭据**是审核重点：社区明确列出 `/boot`、`/var/run/docker.sock` 属于应当排除的宿主路径；另一帖强调"Claude Code running as root has unrestricted ability…" | 论坛 | ✅ 容器内先 root 初始化再降权到 **非 root 身份（`PUID`/`PGID`，默认 1000）**；不挂 docker socket、不挂 `/boot`；**模板里不要求任何 API key**（模型凭据由 DSH 自己在 `/data` 里管理） |
| C5 | **运行时下载可执行文件会被要求整改**：OpenClaw 为符合 CA 标准改成"Homebrew no longer automatically downloaded" | 论坛 | ✅ 所有外部二进制（Caddy、Node 依赖）都在**构建期**获取；容器启动时只读现有文件 |
| C6 | **CVE 与依赖面**会被拿来质疑（MCP 相关三枚 CVE 被反复引用） | 论坛 | ⚠️ 我们的依赖面是官方 npm 包 `@deepseek-ai/dsh` 的封闭依赖树 + Caddy 官方 release；镜像开启 `sbom` 与 `provenance` 证明，可在支持帖里给出 |

## D. 需要你决定的一件事

| # | 事项 | 建议 |
|---|---|---|
| D1 | 是否标记 `<Beta>true</Beta>` | 官方字段说明里 `<Beta>` 是"Legacy beta marker. Only true survives"；**上游 DSH 目前发布的版本号是 alpha/rc**（我们跟的是最高 semver），但**这个打包本身是稳定的**。我的建议：**先不标**，支持帖与 `<Overview>` 里说明镜像跟随上游最新版即可。若审核者建议标 Beta，再改（注意 B1：改模板不影响已安装机器，但影响新用户） |

---

## 提交前的自查命令

```bash
# 1. 官方门槛：ca_profile.xml 存在且 <Profile> 非空；模板带齐 minimum/recommended 字段
node scripts/check-template.mjs templates/dsh.xml

# 2. 渲染一份"发布用"模板并再查一遍（release 资产就是这么生成的）
node scripts/render-template.mjs --owner=meixu6693 --repo=unraid-templates --tag=latest --out=/tmp/dsh.xml
node scripts/check-template.mjs /tmp/dsh.xml

# 3. 镜像匿名可拉 + 多架构
curl -s "https://ghcr.io/token?scope=repository:meixu6693/dsh:pull&service=ghcr.io" | head -c 80

# 4. 图标必须国内可达（raw 与 jsdelivr 都不行，见 docs/ca-submission.md）
curl -sI "https://gh-proxy.com/https://raw.githubusercontent.com/MeiXu6693/unraid-templates/main/templates/img/dsh.png" | head -1
```
