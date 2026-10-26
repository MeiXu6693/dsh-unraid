[English](README.md) · **中文**

# 图标素材出处与商标说明

`dsh.png`（CA 用的应用图标）由 `scripts/make-icon.mjs` 从下面两个上游 SVG 合成：

| 文件 | 来源 | 许可 / 说明 |
|---|---|---|
| `dsh-mark.svg` | DeepSeek Harness 官方品牌素材（维护者提供的 logo SVG，`viewBox="0 0 23.16 17.04"`） | 原文件用 `currentColor`，本仓库固定为品牌蓝 **#4D6BFE**；这是横向的正式标记 |
| `unraid-mark.svg` | `unraid/docs` 仓库的 `static/img/un-mark-gradient.svg` | Unraid 官方品牌素材（橙色条状 "U" 标） |

## 商标与非官方声明

本仓库是**社区打包**，与 DeepSeek（深度求索）及 Lime Technology（Unraid）**均无隶属、合作或授权关系**。图标把两个上游标记并列，仅用于说明"这是什么应用、跑在什么平台上"，不代表任何一方的背书。

DSH 官方 [品牌素材使用规范](https://github.com/deepseek-ai/deepseek-harness/blob/master/BRAND_GUIDELINES.zh.md) 的要求是：描述性文字里可以如实说明与 DeepSeek Harness 的关系，但**项目名**建议使用缩写 **DSH**、避免直接使用完整商标。因此模板（以及它安装的应用条目）用 `dsh` 命名，仓库则是中性的模板库 `unraid-templates`，描述里才出现 "DeepSeek Harness"。

如果任何一方要求调整，替换这两个文件并重跑 `node scripts/make-icon.mjs` 即可。

## 重新生成

两个产物共用同一套素材，必须一起更新：

| 产物 | 命令 | 依赖 |
|---|---|---|
| `icon.svg`（仓库根目录，CA 布局要求，矢量） | `node scripts/make-icon-svg.mjs` | 无（纯字符串合成） |
| `templates/img/dsh.png`（Docker 模板图标） | `node scripts/make-icon.mjs` | 需要 `sharp` |

```bash
node scripts/make-icon-svg.mjs --out=icon.svg
pnpm add -D sharp          # 或指定已有副本
node scripts/make-icon.mjs --out=templates/img/dsh.png
node scripts/make-icon.mjs --flatten='#f4f4f6' --out=/tmp/preview-light.png   # 看浅色卡片上的观感
node scripts/make-icon.mjs --flatten='#111827' --out=/tmp/preview-dark.png    # 看深色卡片上的观感
```
