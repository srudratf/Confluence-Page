// #region agent log
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import os from 'node:os'

const LOG_PATH = 'debug-d028c2.log'
const require = createRequire(import.meta.url)

function log(hypothesisId, location, message, data) {
  appendFileSync(
    LOG_PATH,
    JSON.stringify({
      sessionId: 'd028c2',
      runId: process.env.DEBUG_RUN_ID ?? 'post-fix',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }) + '\n',
  )
}

function safe(fn) {
  try {
    return fn()
  } catch (error) {
    return { error: String(error?.message ?? error) }
  }
}

const newestNpmLog = safe(() => {
  const dir = path.join(os.homedir(), 'AppData', 'Local', 'npm-cache', '_logs')
  if (!existsSync(dir)) return null
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.log'))
    .map((f) => ({ f, m: statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)
  for (const { f } of files.slice(0, 8)) {
    const text = readFileSync(path.join(dir, f), 'utf8')
    if (/verbose argv "install"\s*$/m.test(text) || /verbose argv "install"\n/.test(text)) {
      return { file: f, text }
    }
  }
  return files[0] ? { file: files[0].f, text: readFileSync(path.join(dir, files[0].f), 'utf8') } : null
})

const npmText = newestNpmLog?.text ?? ''

log('A', 'scripts/debug-install-check.mjs:npmlog', 'did npm run node-gyp for better-sqlite3', {
  npmLogFile: newestNpmLog?.file ?? null,
  ranBetterSqliteInstallScript: /info run better-sqlite3@\S+ install/.test(npmText),
  ranNodeGypRebuild: /node-gyp rebuild/.test(npmText),
  allowScriptsBlocked: /allow-scripts/.test(npmText),
  npmExitLine: (npmText.match(/verbose exit \d+/) ?? [null])[0],
})

const vswhere = String.raw`C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe`
log('B', 'scripts/debug-install-check.mjs:vs', 'Visual Studio toolchain state (should be irrelevant now)', {
  vsInstalls: safe(() => {
    if (!existsSync(vswhere)) return 'vswhere-missing'
    return JSON.parse(
      execFileSync(vswhere, ['-all', '-products', '*', '-format', 'json'], { encoding: 'utf8' }) || '[]',
    ).map((i) => ({ version: i.installationVersion, isComplete: i.isComplete }))
  }),
})

const pkgDir = 'node_modules/better-sqlite3'
log('C', 'scripts/debug-install-check.mjs:prebuild', 'prebuild presence and native load', {
  installed: existsSync(`${pkgDir}/package.json`),
  version: safe(() => JSON.parse(readFileSync(`${pkgDir}/package.json`, 'utf8')).version),
  prebuilds: existsSync(`${pkgDir}/prebuilds`) ? readdirSync(`${pkgDir}/prebuilds`) : null,
  compiledFromSource: existsSync(`${pkgDir}/build`),
  loadResult: safe(() => {
    const Database = require('better-sqlite3')
    const db = new Database(':memory:')
    db.exec('create table probe(a integer)')
    db.prepare('insert into probe values (?)').run(7)
    const row = db.prepare('select a from probe').get()
    db.close()
    return { ok: true, row }
  }),
})

log('D', 'scripts/debug-install-check.mjs:eperm', 'EPERM cleanup warnings in npm log', {
  epermCount: (npmText.match(/EPERM/g) ?? []).length,
  installSucceeded: /verbose exit 0/.test(npmText),
})

console.log('[debug-install-check] wrote runtime evidence to', LOG_PATH)
// #endregion
