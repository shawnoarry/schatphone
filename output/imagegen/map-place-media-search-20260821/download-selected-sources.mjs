import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const batchDir = path.dirname(fileURLToPath(import.meta.url));
const selectionPath = path.join(batchDir, 'user-selection.json');
const archiveDir = path.join(batchDir, 'user-selected-source-candidates');
const sourceDir = path.join(archiveDir, 'source-candidates');
const manifestPath = path.join(archiveDir, 'download-manifest.json');
const timeoutMs = 45_000;
const maxAttempts = 2;
const interRequestDelayMs = 12_000;
const skipArchived = process.argv.includes('--skip-archived');
let lastRequestAt = 0;

const identityMismatches = new Map([
  ['seoul-incheon-airport-t1:1', 'AREX 机场铁路站台，不是 1 号航站楼主体'],
  ['seoul-incheon-airport-t1:2', 'AREX 机场铁路站厅，不是 1 号航站楼主体'],
  ['seoul-national-museum:7', '国立民俗博物馆，不是国立中央博物馆'],
  ['seoul-the-hyundai-seoul:1', 'Hyundai Motor Group 旧建筑，未证明是现代首尔商场'],
  ['seoul-the-hyundai-seoul:2', '钟路区 Hyundai 总部建筑，不是现代首尔商场'],
]);

const input = JSON.parse(fs.readFileSync(selectionPath, 'utf8'));
const records = input.records ?? [];
fs.mkdirSync(sourceDir, { recursive: true });

const existing = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : { schemaVersion: 1, batch: 'map-place-media-search-20260821', generatedAt: new Date().toISOString(), records: [] };
const bySelectionId = new Map((existing.records ?? []).map((record) => [record.selectionId, record]));
for (const record of bySelectionId.values()) {
  if (record.status === 'download_failed' && /429|too many requests/i.test(record.error ?? '')) {
    record.status = 'rate_limited';
  }
}

function extensionFor(record) {
  const mime = String(record.mimeType ?? '').toLowerCase();
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('avif')) return '.avif';
  return '.jpg';
}

function outputPathFor(record) {
  const rank = String(record.rank).padStart(2, '0');
  return path.join(sourceDir, `${record.placeId}__${rank}__${record.userDecision}${extensionFor(record)}`);
}

function metadataFor(record) {
  const identityMismatch = identityMismatches.get(record.selectionId) ?? null;
  return {
    selectionId: record.selectionId,
    placeId: record.placeId,
    placeNameZh: record.placeNameZh,
    rank: record.rank,
    userDecision: record.userDecision,
    intendedRole: record.userDecision === 'keep' ? 'primary_candidate' : 'surrounding_area_candidate',
    identityMismatch,
    eligibleForExactPlace: !identityMismatch,
    title: record.title,
    sourcePageUrl: record.sourcePageUrl,
    originalUrl: record.originalUrl,
    originalUrlWithoutQuery: String(record.originalUrl).split('?')[0],
    sourceSha1: record.sourceSha1 ?? null,
    licenseShortName: record.licenseShortName ?? null,
    licenseUrl: record.licenseUrl ?? null,
    artist: record.artist ?? null,
    dateOriginal: record.dateOriginal ?? null,
    expectedWidth: record.width ?? null,
    expectedHeight: record.height ?? null,
    expectedMimeType: record.mimeType ?? null,
    relativePath: path.relative(batchDir, outputPathFor(record)).replaceAll(path.sep, '/'),
    status: 'pending_download',
    downloaded: false,
  };
}

function persistManifest() {
  const ordered = records.map((record) => bySelectionId.get(record.selectionId)).filter(Boolean);
  const manifest = {
    schemaVersion: 1,
    batch: 'map-place-media-search-20260821',
    generatedAt: existing.generatedAt ?? new Date().toISOString(),
    sourceSelection: 'user-selection.json',
    sourceReview: 'source-review.json',
    records: ordered,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

for (const record of records) {
  if (!bySelectionId.has(record.selectionId)) bySelectionId.set(record.selectionId, metadataFor(record));
}
persistManifest();
if (process.argv.includes('--manifest-only')) {
  console.log(`Manifest prepared for ${records.length} selected candidates.`);
  process.exit(0);
}

async function download(record, targetPath) {
  const url = String(record.originalUrl).split('?')[0];
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const tempPath = `${targetPath}.part`;
    try {
      const waitMs = Math.max(0, interRequestDelayMs - (Date.now() - lastRequestAt));
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      lastRequestAt = Date.now();
      fs.rmSync(tempPath, { force: true });
      await new Promise((resolve, reject) => {
        const child = spawn('curl.exe', [
          '--fail', '--location', '--silent', '--show-error',
          '--connect-timeout', '20', '--max-time', String(Math.ceil(timeoutMs / 1000)),
          '--retry', '0',
          '--user-agent', 'SchatPhone-map-media-source-archive/1.0',
          '--output', tempPath, url,
        ], { windowsHide: true });
        let stderr = '';
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        child.once('error', reject);
        child.once('exit', (code, signal) => {
          if (code === 0) resolve();
          else reject(new Error(`curl exit ${code ?? 'null'}${signal ? ` (${signal})` : ''}: ${stderr.trim()}`));
        });
      });
      const hash256 = crypto.createHash('sha256');
      const hash1 = crypto.createHash('sha1');
      let bytes = 0;
      for await (const chunk of fs.createReadStream(tempPath)) {
        hash256.update(chunk);
        hash1.update(chunk);
        bytes += chunk.length;
      }
      fs.renameSync(tempPath, targetPath);
      return {
        downloaded: true,
        bytes,
        mimeType: record.mimeType ?? null,
        sha256: hash256.digest('hex'),
        sha1: hash1.digest('hex'),
        attempts: attempt,
        url,
      };
    } catch (error) {
      lastError = error;
      try { fs.rmSync(tempPath, { force: true }); } catch {}
      if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 1_000 * attempt));
    }
  }
  throw lastError;
}

for (const [index, record] of records.entries()) {
  const targetPath = outputPathFor(record);
  const prior = bySelectionId.get(record.selectionId);
  if (skipArchived && prior?.status === 'downloaded') {
    console.log(`[${index + 1}/${records.length}] defer ${record.placeNameZh} #${record.rank} (archived source)`);
    continue;
  }
  if (prior?.downloaded && fs.existsSync(targetPath)) {
    console.log(`[${index + 1}/${records.length}] skip ${record.placeNameZh} #${record.rank}`);
    continue;
  }
  process.stdout.write(`[${index + 1}/${records.length}] ${record.placeNameZh} #${record.rank} ... `);
  const identityMismatch = identityMismatches.get(record.selectionId) ?? null;
  const base = {
    ...metadataFor(record),
    downloadedAt: new Date().toISOString(),
  };
  try {
    const result = await download(record, targetPath);
    bySelectionId.set(record.selectionId, {
      ...base,
      ...result,
      sourceSha1Matches: Boolean(record.sourceSha1) && result.sha1 === record.sourceSha1,
      status: 'downloaded',
    });
    console.log(`ok ${result.bytes} bytes${identityMismatch ? ' [identity mismatch]' : ''}`);
  } catch (error) {
    const rateLimited = /429|too many requests/i.test(String(error?.stack ?? error));
    bySelectionId.set(record.selectionId, {
      ...base,
      status: rateLimited ? 'rate_limited' : 'download_failed',
      downloaded: false,
      error: String(error?.stack ?? error),
    });
    console.log(`${rateLimited ? 'paused (rate limited)' : 'failed'} ${error?.message ?? error}`);
    if (rateLimited) {
      persistManifest();
      break;
    }
  }
  persistManifest();
}

persistManifest();
const downloaded = [...bySelectionId.values()].filter((record) => record.status === 'downloaded').length;
const failed = [...bySelectionId.values()].filter((record) => record.status === 'download_failed').length;
const mismatches = [...bySelectionId.values()].filter((record) => record.identityMismatch).length;
console.log(`\nCompleted: ${downloaded} downloaded, ${failed} failed, ${mismatches} identity mismatches recorded.`);
