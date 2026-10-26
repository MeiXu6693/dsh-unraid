#!/usr/bin/env node
/**
 * Render templates/dsh.xml into a publishable Unraid template.
 *
 * The template is the only artifact that has to name a concrete registry
 * namespace, so the repository stays namespace-free and the release workflow
 * injects `github.repository_owner`. Placeholders:
 *
 *   __GHCR_OWNER__   GitHub owner (user or org) that publishes the image
 *   __IMAGE_TAG__    image tag the template pins (version, or `latest`)
 *   __DSH_VERSION__  upstream DeepSeek Harness version the tag was built from
 *   __REPO__         repository name, for the icon and support URLs
 *   __YEAR__         copyright year in the template's <Description>
 *
 * Usage:
 *   node scripts/render-template.mjs --owner=meixu --tag=0.2.1-alpha.3 \
 *     --version=0.2.1-alpha.3 --repo=unraid-templates --out=dist/dsh.xml
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (hit === undefined) return fallback
  const [, value] = hit.split('=')
  return value === undefined ? '' : value
}

const owner = flag('owner', process.env.GITHUB_REPOSITORY_OWNER ?? '')
const repo = flag('repo', process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'unraid-templates')
const tag = flag('tag', 'latest')
const version = flag('version', tag)
const source = resolve(flag('template', 'templates/dsh.xml'))
const out = resolve(flag('out', 'dist/dsh.xml'))
const year = flag('year', String(new Date().getUTCFullYear()))

if (owner === '') {
  console.error('render-template: --owner (or GITHUB_REPOSITORY_OWNER) is required')
  process.exit(2)
}

const replacements = {
  __GHCR_OWNER__: owner,
  __IMAGE_TAG__: tag,
  __DSH_VERSION__: version,
  __REPO__: repo,
  __YEAR__: year,
}

let xml = await readFile(source, 'utf8')
for (const [placeholder, value] of Object.entries(replacements)) {
  xml = xml.replaceAll(placeholder, value)
}

const leftover = [...xml.matchAll(/__[A-Z0-9_]+__/g)].map((match) => match[0])
if (leftover.length > 0) {
  console.error(`render-template: unsubstituted placeholders remain: ${[...new Set(leftover)].join(', ')}`)
  process.exit(1)
}

await mkdir(dirname(out), { recursive: true })
await writeFile(out, xml, 'utf8')
process.stdout.write(`${out}\n`)
