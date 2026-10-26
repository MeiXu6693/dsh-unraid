[English](publish.md) · **中文**

# 从模板库发布模板（以及整体 fork）

本仓库是 **MeiXu 的 Unraid 模板库**：`templates/` 下每个应用一个 Community Applications
模板，外加 CA 仓库 profile、检查脚本与文档。目前只收录 DSH。容器镜像由
[MeiXu6693/dsh-docker](https://github.com/MeiXu6693/dsh-docker) 构建、冒烟测试并
发布——这里没有 Dockerfile，本仓库也不产出任何 release 或镜像 tag。（2026-10-16 拆分之前那条
发布链留下的两个 Release 已于 2026-10-17 删除：Releases 页为空是**预期状态**，不代表项目停更——
镜像的 release 见 [dsh-docker 的 releases](https://github.com/MeiXu6693/dsh-docker/releases)。）

这份文档是 fork 的操作手册，也是维护者改模板时的 checklist。

## 1. fork 之后要改什么

建一个**公开**仓库（CA 要求可公开读取，图标 URL 也必须是公网可达的），然后按你自己的命名空间
渲染模板：

```bash
node scripts/render-template.mjs --owner=<你的用户名> --repo=<你的仓库> --tag=latest \
  --out=templates/dsh.xml
node scripts/check-template.mjs templates/dsh.xml
node scripts/check-repo.mjs
ALLOW_MISSING_PYTHON=1 bash scripts/check-static.sh        # CI 里不带这个变量
git add -A && git commit -m "chore: point the template at my namespace" && git push
```

提交进仓库的 `templates/dsh.xml` 是**渲染后的成品**——CA 解析的就是 `main` 上的成品，所以真正
起作用的是里面具体的 owner/repo/tag 值。

fork 还要决定两件事：

- **`ca_profile.xml`**：`<Profile>` 文案，以及 `<WebPage>`/`<Icon>`/`<Forum>` 三个 URL 描述的是
  *你的*仓库。`<Profile>` 非空是硬性提交门槛。
- **模板里的 `<Support>`**：CA 要求自维护容器用 Unraid **论坛帖**。提交前先开帖（要覆盖哪些内容见
  [ca-submission.zh-CN.md](ca-submission.zh-CN.md) §3）。

如果你想连镜像也自己构建，那就去 fork
[dsh-docker](https://github.com/MeiXu6693/dsh-docker)，并把 `<Repository>` 指向你的镜像。它的
`CONTRIBUTING.md` 讲了 GHCR 包设置（工作流权限、包可见性，以及构建跑在"包未链接的仓库"时需要的
*Manage Actions access* 授权）。

## 2. 仓库设置

| 设置 | 位置 | 原因 |
|---|---|---|
| 公开仓库 + OSI 许可 | 仓库设置 | CA 的 Submission Help 把两条都列为硬性要求 |
| 根目录 `ca_profile.xml` 且 `<Profile>` 非空 | 仓库根 | 没有它 CA 会拒绝完成提交 |
| 不需要任何 Actions 密钥 | — | validate 工作流只读本仓库 |

## 3. 改动怎么进入目录

条目在线时**不需要**重跑提交流程。`/submit/new` 会回"already enabled in Community
Applications and does not need to be submitted"，CA 会在下一次 feed 重建时自己重新解析本仓库。
2026-10-16 实测：模板 02:00 CST 推送，04:11 CST 出现在 feed 里（全程没有手动 scan）。

要查的是 CA 真正对外提供的那份 feed：`https://ca.unraid.net/assets/feed/applicationFeed.json`；
同目录的 `/cdn/` 副本会晚约一天。

⚠️ **模板改动永远到不了已经安装过的机器。** CA 在安装时把 `templates/dsh.xml` 复制成
`templates-user/my-DSH.xml`，所以本仓库只影响新安装与目录页。必须让所有人都拿到的行为要放进镜像；
搞错的后果见 [ca-pitfalls.zh-CN.md](ca-pitfalls.zh-CN.md)（B1、B2）。

## 4. 这些检查做了什么、看不见什么

`bash scripts/check-static.sh` 依次跑：shell 与 node 语法；XML/YAML/JSON 结构正确性（python3）；
CA 仓库要求（`check-repo.mjs`）；模板自检（`check-template.mjs`）；跨仓库的镜像契约
（`check-image-contract.mjs`）；以及图标可复现性。

它们**看不见**的东西：

- **镜像的行为是否还与模板描述一致**——契约检查只能证明环境变量的*名字*仍存在于 entrypoint。
  改变量的语义、改默认值，在这里都是隐形的；要在论坛帖里公告，并同步改两侧；
- **Unraid 到底怎么解析某个字段**。两条行为是手工实测后写进 `check-template.mjs` 的
  （元素文本非空时以文本为准；`Mask` 只影响界面显示）；
- **CA feed 有没有取到这次改动**——那是 feed 的事，不是本仓库能保证的。

## 5. Community Applications 是最后一步

只有镜像能拉、模板能装、沙箱能用之后，才轮到提交流程：[ca-submission.zh-CN.md](ca-submission.zh-CN.md)
（门槛与流程）与 [ca-pitfalls.zh-CN.md](ca-pitfalls.zh-CN.md)（被下架、被弃用、模板改动传不到用户
手里的真实案例）。
