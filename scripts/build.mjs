// Runs during the Cloudflare build, before deploy. Records facts about the build environment into
// src/buildinfo.json so the deployed Worker can report them. Prints and stores NO secret values.
import { writeFileSync } from 'node:fs'

const info = { built: true, builtAt: new Date().toISOString(), node: process.version }

const key = process.env.LICENSE_KEY
info.licenseVarSeenAtBuild = Boolean(key)
info.licenseVarLength = key ? key.length : 0
info.adminVarSeenAtBuild = Boolean(process.env.ADMIN_TOKEN)
info.buildEnvNames = Object.keys(process.env).filter((n) => /^(WORKERS_CI|CF_|CLOUDFLARE|LICENSE|ADMIN)/.test(n)).sort()

async function probe(label, url, init) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) })
    return { label, status: res.status }
  } catch (err) {
    return { label, error: String(err).slice(0, 120) }
  }
}

info.network = [
  await probe('license-server-health', 'https://license.littlebig.co/health'),
  // A bogus key must be refused: this is the shape the real license gate would use.
  await probe('license-gate-with-supplied-key', `https://license.littlebig.co/v1/update/formgate?license_key=${encodeURIComponent(key ?? 'none')}`),
]

try {
  const res = await fetch('https://raw.githubusercontent.com/littlebigco-dev/formgate-deploy-test/main/latest.json', { signal: AbortSignal.timeout(10000) })
  info.fetchedLatest = await res.json()
} catch (err) {
  info.fetchedLatest = { error: String(err).slice(0, 120) }
}

writeFileSync('src/buildinfo.json', JSON.stringify(info, null, 2) + '\n')
console.log('build info written (no secret values):', JSON.stringify({ ...info, buildEnvNames: info.buildEnvNames.length + ' names' }))
