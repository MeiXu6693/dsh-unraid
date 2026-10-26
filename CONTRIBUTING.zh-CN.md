[English](CONTRIBUTING.md) · **中文**

# 维护者手册 —— Unraid 这一侧

本仓库只负责 DSH 的 **Community Applications 模板**：`templates/dsh.xml`、图标、CA 仓库
profile、CA 相关文档，以及检查它们的脚本。容器镜像由
[MeiXu6693/dsh-docker](https://github.com/MeiXu6693/dsh-docker) 构建与发布；模板安装的就是
它的 `:latest`。

## 仓库结构

```
.
├── templates/dsh.xml          # Community Applications 解析的文件（已是渲染后的成品）
├── templates/img/dsh.png      # 模板与 CA 展示的图标
├── templates/img/src/         # 素材与商标说明
├── icon.svg                   # 仓库图标（CA 目录结构要求；ca_profile.xml 指向它）
├── ca_profile.xml             # CA 仓库信息——<Profile> 非空是硬性提交门槛
├── scripts/                   # 模板自检、图标生成、静态闸门
└── docs/                      # 提交说明、坑位清单、迁移指南
```

## 本地检查

```bash
ALLOW_MISSING_PYTHON=1 bash scripts/check-static.sh   # 整套闸门（本机没有 python3）
node scripts/check-template.mjs templates/dsh.xml     # 只查模板
node scripts/check-repo.mjs                           # CA 仓库结构 + 占位符扫描
node scripts/check-image-contract.mjs templates/dsh.xml
node scripts/check-image.mjs templates/dsh.xml        # 模板装的镜像在 ghcr.io 上还存不存在
node scripts/make-icon-svg.mjs --out=icon.svg && git diff --exit-code icon.svg   # 图标必须可复现
```

`check-image.mjs` 是唯一需要联网的检查：它向 GHCR 要 manifest——2026-10-25 那次事故里，别的检查
全绿，唯独这一件事坏了（issue #2）。断网时降级为警告，在 GitHub runner 上是硬断言。

CI 里 `check-static.sh` **不带** `ALLOW_MISSING_PYTHON`：那里必须有 python3 才能做
XML/YAML 结构校验，不允许跳过。

## 模板

- **`templates/dsh.xml` 是渲染后的产物**，不是源文件：owner、仓库名、镜像 tag 都已经替换好了。
  `scripts/render-template.mjs` 是给 fork 用的辅助工具（`--owner=… --repo=… --tag=…`）；渲染完
  用 `check-template.mjs` 查一遍，再把成品提交上去。CA 解析的就是 `main` 上的成品。
- **`check-template.mjs` 断言的内容**：CA 的最低/推荐字段齐全；卷与 `<Config Type="Path">` 的宿主
  路径一致；Config 的文本要么为空、要么等于 `Default`（Unraid 以文本为准——两者不一致会让界面上
  显示一个值、建出来的容器却是另一个值）；`<WebUI>` 的端口确实被发布；没有 v1 的
  `<Data>`/`<Environment>` 块；`<Privileged>` 为 false；`<ExtraParams>` 里两个
  `--security-opt` 都在。
- **注释配对也在检查范围内**（正则先剥注释）：曾经有一次，某个标签只是被*注释提到*，就让一次
  查找替换把文件改坏，而所有基于正则的检查仍然通过。

## 不能随手改的东西

| 字段 | 原因 |
|---|---|
| `<Repository>` | 它就是用户安装的镜像，指向 `ghcr.io/meixu6693/dsh:latest`。 |
| `<TemplateURL>`、`<Icon>`、`<ReadMe>` | 指向本仓库 `main` 上的文件；CA 与已安装的机器都会去读。改名或挪位置会让目录条目失效。 |
| `<Registry>` | 指向 GHCR 包页面，跟着包的链接关系走。 |
| `<Support>` | CA 要求自维护容器用**论坛帖**，不是 GitHub issue。 |
| `<Name>` | 它是每台安装机器上的容器名。 |

"声明与实际不符"正是会让条目被下架的雷——这些规则的来源见
[docs/ca-pitfalls.zh-CN.md](docs/ca-pitfalls.zh-CN.md)（A6）。

## 与镜像之间的契约

两个仓库之间只有两处耦合，且都有检查或文档兜着：

1. **环境变量。** 模板里每个 `<Config Type="Variable" Target="NAME">` 都是镜像
   `docker/entrypoint.sh` 必须认识的变量。`scripts/check-image-contract.mjs` 会从 `main`
   拉取那个 entrypoint，一旦模板设置的变量在那边找不到就**报错**——它防的是一种静默失效：
   容器照常启动，而那个字段什么也不做。它需要网络；离线（国内）会退化成警告，而 validate 工作流
   在 CI 里会因为"根本没取到"直接失败，所以这条检查不会被悄悄跳过。`TZ` 是唯一一个 entrypoint
   合理地不读的变量（由基础镜像处理），已在脚本里带原因地列入白名单。
2. **`<ExtraParams>` 里的两个 `--security-opt`**，它们来自镜像的沙箱设计（
   [dsh-docker 的 docs/sandbox.zh-CN.md](https://github.com/MeiXu6693/dsh-docker/blob/main/docs/sandbox.zh-CN.md)）。
   如果镜像的 `compose.yaml` 不再带这两个参数，契约检查会给出警告。

**在镜像侧改环境变量名或删掉环境变量，对本仓库就是破坏性变更。** 要在论坛帖里公告，并同步改
`templates/dsh.xml`。

## 图标

两个产物、一个事实来源，必须一起更新：

```bash
node scripts/make-icon-svg.mjs            # → icon.svg（纯矢量，零依赖）
node scripts/make-icon.mjs                # → templates/img/dsh.png（栅格化 icon.svg，需要 sharp）
```

`icon.svg` 是版式的唯一来源；CI 会重跑生成器并与提交的版本 diff，所以**不允许手工编辑**。
素材与商标说明见 [templates/img/src/README.zh-CN.md](templates/img/src/README.zh-CN.md)。

## 改动怎么进入目录

条目在线时**不需要**重跑提交流程：`/submit/new` 会回答"already enabled in Community
Applications and does not need to be submitted"，CA 会在下一次 feed 重建时自己重新解析本仓库。
实测延迟约四小时（模板 02:00 CST 推送 → 04:11 CST 生效）。见
[docs/ca-submission.zh-CN.md](docs/ca-submission.zh-CN.md) 与 [docs/publish.zh-CN.md](docs/publish.zh-CN.md)。

⚠️ **已安装的机器永远看不到模板改动。** CA 在安装时复制模板，所以这里的改动只影响新安装与目录页。
必须让所有人都拿到的行为要放进镜像。

## 版本

本仓库没有 release。镜像的 tag 与发布说明在
[dsh-docker](https://github.com/MeiXu6693/dsh-docker/releases)；模板跟随 `:latest`，因此不需要
任何版本握手。
