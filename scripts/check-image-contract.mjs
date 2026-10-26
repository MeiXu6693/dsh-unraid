#!/usr/bin/env node
/**
 * Cross-repository check: does the template still describe the image it installs?
 *
 * The template and the image now live in two repositories
 * (MeiXu6693/unraid-templates and MeiXu6693/dsh-docker). The contract between them is
 * small but silently breakable: every `<Config Type="Variable" Target="NAME">` in
 * the template is an environment variable that the image's entrypoint has to
 * understand. Rename one on the image side and the template keeps handing the
 * container a variable nobody reads — the container starts, looks fine, and the
 * operator's setting does nothing. Nothing else in either repository would notice.
 *
 * So this fetches the image repository's entrypoint (main branch) and asserts that
 * every variable the template sets is mentioned there. The reverse direction is not
 * a failure: an image variable that no template field exposes is a legitimate
 * choice (as long as the default is sensible), and it is reported as a note.
 *
 * A network failure is a warning, not an error: this offline-friendly repository
 * must stay checkable on a host that cannot reach raw.githubusercontent.com (China
 * blocks it for some networks — the icon URL in ca_profile.xml goes through a proxy
 * for that reason). CI runs on GitHub's runners, where the fetch works, so the
 * check is real where it matters.
 *
 * Usage: node scripts/check-image-contract.mjs [templates/dsh.xml]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const file = resolve(process.argv[2] ?? 'templates/dsh.xml')
const xml = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '')

const IMAGE_REPO = process.env.IMAGE_REPO ?? 'MeiXu6693/dsh-docker'
// Overridable so a fork can point at its own image repository, and so this check can
// be exercised from a network that cannot reach raw.githubusercontent.com directly
// (the Chinese networks this project is developed on route it through gh-proxy.com:
// IMAGE_RAW_BASE=https://gh-proxy.com/https://raw.githubusercontent.com).
const RAW_BASE = process.env.IMAGE_RAW_BASE ?? 'https://raw.githubusercontent.com'
const ENTRYPOINT_URL = `${RAW_BASE}/${IMAGE_REPO}/main/docker/entrypoint.sh`
const COMPOSE_URL = `${RAW_BASE}/${IMAGE_REPO}/main/compose.yaml`

/**
 * Variables the template sets that the entrypoint legitimately does not read.
 * `TZ` is consumed by the base image and Node (the container has a real
 * /etc/localtime from it), not by the entrypoint script, so its absence there says
 * nothing. Anything added here needs a reason of the same kind.
 */
const NOT_ENTRYPOINT_BUSINESS = new Map([['TZ', 'handled by the base image / Node, not the entrypoint']])

const targets = [...xml.matchAll(/<Config\s([^>]*)>/g)]
  .map((match) => Object.fromEntries([...match[1].matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1], a[2]])))
  .filter((attrs) => attrs.Type === 'Variable')
  .map((attrs) => attrs.Target)

if (targets.length === 0) {
  console.error(`${file}: no <Config Type="Variable"> entries found — is this the template?`)
  process.exit(1)
}

const warnings = []
const errors = []

const fetchText = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } catch (error) {
    warnings.push(`could not fetch ${url}: ${error.message}`)
    return null
  }
}

const entrypoint = await fetchText(ENTRYPOINT_URL)

if (entrypoint === null) {
  console.log(`checked ${file} against ${IMAGE_REPO} (entrypoint unreachable, contract unchecked)`)
} else {
  for (const name of targets) {
    if (NOT_ENTRYPOINT_BUSINESS.has(name)) {
      console.log(`  note: ${name} is not the entrypoint's business (${NOT_ENTRYPOINT_BUSINESS.get(name)})`)
      continue
    }
    if (!new RegExp(`\\b${name}\\b`).test(entrypoint)) {
      errors.push(
        `<Config Target="${name}"> sets an environment variable the image entrypoint never reads (${IMAGE_REPO}/docker/entrypoint.sh) — the field would silently do nothing`,
      )
    }
  }
  // Only the `${NAME:-default}` form: those are the image's documented knobs. A bare
  // `${NAME}` is usually an internal variable the entrypoint assigns itself.
  const imageVars = [...new Set([...entrypoint.matchAll(/\$\{([A-Z][A-Z0-9_]{2,}):-/g)].map((m) => m[1]))]
  const undocumented = imageVars.filter(
    (name) => !targets.includes(name) && !/^(PATH|HOME|TMPDIR|PORT|DSH_INTERNAL_PORT|APP_UID|APP_GID)$/.test(name),
  )
  console.log(`  note: image reads ${imageVars.length} variables with defaults; template exposes ${targets.length}`)
  if (undocumented.length > 0) {
    console.log(`  note: image-side variables the template does not expose: ${undocumented.join(', ')}`)
  }
}

const compose = await fetchText(COMPOSE_URL)
if (compose !== null) {
  for (const flag of ['seccomp=unconfined', 'systempaths=unconfined']) {
    if (!compose.includes(flag)) {
      warnings.push(
        `${IMAGE_REPO}/compose.yaml no longer carries --security-opt ${flag}; the template's ExtraParams still does — check whether the image stopped needing it`,
      )
    }
  }
}

console.log(`checked ${file} against ${IMAGE_REPO}`)
for (const warning of warnings) console.log(`  warn: ${warning}`)
for (const error of errors) console.log(`  ERROR: ${error}`)
if (errors.length > 0) {
  console.error(`\n${errors.length} contract error(s): the template and the image have drifted apart`)
  process.exit(1)
}
console.log('ok — every template variable is understood by the image it installs')
