**English** · [中文](README.zh-CN.md)

# Icon asset provenance and trademark notice

`dsh.png` (the app icon used by CA) is composed by `scripts/make-icon.mjs` from the two upstream SVGs below:

| File | Source | License / notes |
|---|---|---|
| `dsh-mark.svg` | DeepSeek Harness official brand asset (the logo SVG supplied by the maintainers, `viewBox="0 0 23.16 17.04"`) | The original file uses `currentColor`; this repository pins it to the brand blue **#4D6BFE**. This is the horizontal official mark |
| `unraid-mark.svg` | `static/img/un-mark-gradient.svg` in the `unraid/docs` repository | Unraid official brand asset (the orange bar-shaped "U" mark) |

## Trademark and non-affiliation notice

This repository is a **community packaging** effort and is **not affiliated with, partnered with, or authorized by** either DeepSeek (深度求索) or Lime Technology (Unraid). The icon places the two upstream marks side by side purely to say "what this app is and what platform it runs on"; it does not represent endorsement by either party.

The official DSH [brand asset usage guidelines](https://github.com/deepseek-ai/deepseek-harness/blob/master/BRAND_GUIDELINES.zh.md) require that: descriptive text may truthfully explain the relationship to DeepSeek Harness, but the **project name** should use the abbreviation **DSH**, avoiding direct use of the full trademark. The template (and the app entry it installs) is therefore named `dsh`; the repository is the neutral template library `unraid-templates`, and "DeepSeek Harness" appears only in descriptions.

If either party asks for an adjustment, replace these two files and re-run `node scripts/make-icon.mjs`.

## Regenerating

The two artifacts share the same set of source assets and must be updated together:

| Artifact | Command | Dependency |
|---|---|---|
| `icon.svg` (repository root, required by the CA layout, vector) | `node scripts/make-icon-svg.mjs` | none (pure string composition) |
| `templates/img/dsh.png` (Docker template icon) | `node scripts/make-icon.mjs` | requires `sharp` |

```bash
node scripts/make-icon-svg.mjs --out=icon.svg
pnpm add -D sharp          # or point at an existing copy
node scripts/make-icon.mjs --out=templates/img/dsh.png
node scripts/make-icon.mjs --flatten='#f4f4f6' --out=/tmp/preview-light.png   # check how it looks on a light card
node scripts/make-icon.mjs --flatten='#111827' --out=/tmp/preview-dark.png    # check how it looks on a dark card
```
