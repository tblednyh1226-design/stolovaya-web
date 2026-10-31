#!/usr/bin/env node
// Read-only dependency inventory: logs ONLY hostname, file and occurrence counts.
// Never prints request URLs, API keys, access tokens, or source code.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.css', '.sql', '.json']);
const excludeDirs = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.pages-build', '.frontend-build', 'frontend-source-chunks', 'docs']);
const known = [
  { regex: /rgluzdxikpagugpmusbp\.supabase\.co/gi, host: 'rgluzdxikpagugpmusbp.supabase.co', category: 'production_supabase' },
  { regex: /[a-z0-9.-]+\.chatgpt\.site/gi, host: '*.chatgpt.site', category: 'chatgpt_hosting' },
  { regex: /functions\.yandexcloud\.net/gi, host: 'functions.yandexcloud.net', category: 'yandex_gateway' },
  { regex: /[a-z0-9.-]+\.github\.io/gi, host: '*.github.io', category: 'github_pages' }
];
const results = [];
function visit(relative) {
  const full = path.join(root, relative);
  for (const d of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(relative, d.name);
    if (d.isDirectory()) {
      if (!excludeDirs.has(d.name)) visit(rel);
      continue;
    }
    if (!d.isFile() || !scanExtensions.has(path.extname(d.name))) continue;
    if (rel === path.join('tools', 'audit-host-dependencies.mjs')) continue;
    const source = fs.readFileSync(path.join(root, rel), 'utf8');
    for (const k of known) {
      const count = [...source.matchAll(k.regex)].length;
      k.regex.lastIndex = 0;
      if (count) results.push({ file: rel.replaceAll(path.sep, '/'), host: k.host, category: k.category, occurrences: count });
    }
  }
}
visit('');
results.sort((a, b) => a.category.localeCompare(b.category) || a.file.localeCompare(b.file));
const total = results.reduce((n, x) => n + x.occurrences, 0);
console.log(JSON.stringify({ kind: 'read_only_static_dependency_baseline', files_with_matches: new Set(results.map(x => x.file)).size, occurrences: total, findings: results }, null, 2));
const strict = process.argv.includes('--strict');
if (strict && results.some(x => ['production_supabase', 'chatgpt_hosting', 'yandex_gateway', 'github_pages'].includes(x.category))) {
  console.error('Portability gate failed: some environment-specific URLs remain.');
  process.exitCode = 1;
}
