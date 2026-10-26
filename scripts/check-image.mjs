#!/usr/bin/env node
/**
 * Does the image the template installs actually exist?
 *
 * On 2026-10-25 it did not: the GitHub account was renamed, the old
 * `ghcr.io/2220545672/dsh` path stopped resolving ("manifest unknown"), and nothing in
 * this repository noticed — every check looked at structure, and a dead registry path
 * has the same shape as a live one. Meanwhile everyone installing from Community
 * Applications got a container that could not be built (issue #2).
 *
 * So this asks GHCR for the manifest with an anonymous pull token — no credentials, no
 * docker binary — and fails when it is not there. That also covers the CA rule this
 * template lives or dies by: a `:latest` tag that does not exist gets the entry
 * blacklisted (docs/ca-pitfalls A5).
 *
 * Network failure is a warning, not an error: this repository has to stay checkable from
 * the Chinese networks it is developed on. CI runs on GitHub's runners, where it is real.
 *
 * Usage: node scripts/check-image.mjs [templates/dsh.xml]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const file = resolve(process.argv[2] ?? 'templates/dsh.xml')
const xml = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '')
const reference = (/<Repository>([\s\S]*?)<\/Repository>/.exec(xml) ?? [, ''])[1].trim()

const image = /^ghcr\.io\/([^/:]+)\/([^/:]+)(?::([^/:]+))?$/.exec(reference)
if (image === null) {
  console.error(`${file}: <Repository> is "${reference}"; this check only understands ghcr.io/<owner>/<name>[:tag]`)
  process.exit(1)
}

const [, owner, name, tag = 'latest'] = image
const path = `${owner}/${name}`

const ACCEPT = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.v2+json',
].join(',')

try {
  const tokenResponse = await fetch(`https://ghcr.io/token?scope=repository:${path}:pull&service=ghcr.io`, {
    signal: AbortSignal.timeout(20_000),
  })
  const tokenBody = await tokenResponse.json().catch(() => ({}))
  // A path that is not a public package answers 403 + {"errors":[{"code":"DENIED"}]},
  // which is the same thing `docker pull` would fail with.
  if (typeof tokenBody.token !== 'string') {
    console.error(
      `${file}: ${reference} is not pullable — ghcr.io answered ${JSON.stringify(tokenBody.errors?.[0]?.code ?? tokenBody)}.\n` +
        'Anyone installing from Apps gets a container that cannot be built.',
    )
    process.exit(1)
  }

  const manifest = await fetch(`https://ghcr.io/v2/${path}/manifests/${tag}`, {
    method: 'HEAD',
    headers: { Authorization: `Bearer ${tokenBody.token}`, Accept: ACCEPT },
    signal: AbortSignal.timeout(20_000),
  })
  if (!manifest.ok) {
    console.error(
      `${file}: ${reference} answered HTTP ${manifest.status} (${manifest.status === 404 ? 'manifest unknown' : 'unexpected'}).\n` +
        'CA blacklists templates whose :latest tag does not exist (docs/ca-pitfalls A5), so this must not ship.',
    )
    process.exit(1)
  }
  console.log(`ok — ${reference} resolves on ghcr.io`)
} catch (error) {
  console.log(`warn: could not verify ${reference} (${error.message}) — skipped, network unreachable from here`)
}
