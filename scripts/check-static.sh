#!/usr/bin/env bash
#
# The static gate for this repository: the Community Applications template.
#
# This repository used to build the container image too. The image moved to
# MeiXu6693/dsh-docker, and the checks that belong to it (shell/node syntax of the
# entrypoint, hadolint, `caddy validate`, the image smoke test) moved with it. What
# is left is what a *template* repository has to guarantee, plus one
# cross-repository check: the environment variables the template hands the container
# must still exist in that image's entrypoint.
#
# Usage: bash scripts/check-static.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo '== shell syntax =='
for file in scripts/*.sh; do
  bash -n "${file}"
  printf 'bash -n ok: %s\n' "${file}"
done

echo
echo '== node syntax =='
for file in scripts/*.mjs; do
  node --check "${file}"
  printf 'node --check ok: %s\n' "${file}"
done

echo
echo '== xml, yaml and json well-formedness =='
if ! command -v python3 >/dev/null 2>&1; then
  # CI runners always have python3; a developer box may not. The gate stays strict
  # unless ALLOW_MISSING_PYTHON=1 is set explicitly, so a pipeline can never
  # silently lose this check.
  if [ "${ALLOW_MISSING_PYTHON:-0}" = "1" ]; then
    echo 'SKIPPED: python3 not found and ALLOW_MISSING_PYTHON=1'
  else
    echo 'python3 is required for the well-formedness check (set ALLOW_MISSING_PYTHON=1 to skip locally)' >&2
    exit 1
  fi
else
  if ! python3 -c 'import yaml' >/dev/null 2>&1; then
    python3 -m pip install --quiet --disable-pip-version-check pyyaml
  fi
  python3 - <<'PY'
import glob
import json
import sys
import xml.dom.minidom

import yaml

failures = []
for path in glob.glob('templates/**/*.xml', recursive=True) + glob.glob('*.xml') + glob.glob('*.svg'):
    try:
        xml.dom.minidom.parse(path)
        print(f'xml ok: {path}')
    except Exception as error:  # noqa: BLE001
        failures.append(f'{path}: {error}')
for path in glob.glob('**/*.yml', recursive=True) + glob.glob('**/*.yaml', recursive=True):
    try:
        with open(path, encoding='utf-8') as handle:
            yaml.safe_load(handle)
        print(f'yaml ok: {path}')
    except Exception as error:  # noqa: BLE001
        failures.append(f'{path}: {error}')
for path in glob.glob('**/*.json', recursive=True):
    try:
        with open(path, encoding='utf-8') as handle:
            json.load(handle)
        print(f'json ok: {path}')
    except Exception as error:  # noqa: BLE001
        failures.append(f'{path}: {error}')
if failures:
    print('\n'.join(failures), file=sys.stderr)
    sys.exit(1)
PY
fi

echo
echo '== Community Apps requirements =='
node scripts/check-repo.mjs
node scripts/check-template.mjs templates/dsh.xml

echo
echo '== the template still matches the image it installs =='
node scripts/check-image-contract.mjs templates/dsh.xml

echo
echo '== the image the template installs exists =='
# Every check above reads structure, and a dead registry path has the same shape as a
# live one: after the 2026-10-24 account rename this gate was fully green while
# ghcr.io/2220545672/dsh answered "manifest unknown" and nobody could install (issue #2).
node scripts/check-image.mjs templates/dsh.xml

echo
echo '== icon reproducibility =='
committed="$(mktemp)"
trap 'rm -f "${committed}"' EXIT
cp icon.svg "${committed}"
node scripts/make-icon-svg.mjs --out=icon.svg
diff -u "${committed}" icon.svg
echo 'icon.svg matches what scripts/make-icon-svg.mjs produces'

echo
echo 'static gate passed'
