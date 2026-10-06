const fs = require('fs');
const path = require('path');

const pages = [
  'index.html',
  'projects/index.html',
  'contact/index.html',
  'projects/koto-running/index.html',
  'projects/meridian/index.html',
  'projects/haus/index.html',
  'projects/arkfield/index.html',
  'projects/bloom/index.html',
  'projects/forma-labs/index.html',
  'projects/norde/index.html',
  'projects/velt-studio/index.html'
];

let totalIssues = 0;

pages.forEach(p => {
  const fullPath = path.join(__dirname, p);
  const dir = path.dirname(fullPath);
  const content = fs.readFileSync(fullPath, 'utf8');

  // Check remaining framerusercontent URLs
  const remainingExternal = content.match(/https:\/\/(?:framerusercontent\.com|fonts\.gstatic\.com)[^\s"'()<>]+/g) || [];
  const nonMjs = remainingExternal.filter(u => !u.endsWith('.mjs') && !u.endsWith('.js') && !u.includes('searchIndex'));
  if (nonMjs.length > 0) {
    console.warn(`[${p}] Remaining external media/fonts (${nonMjs.length}):`, nonMjs.slice(0, 3));
    totalIssues += nonMjs.length;
  }

  // Check local assets referenced
  const localRefs = content.match(/(?:\.\/|\.\.\/)+assets\/(?:images|fonts|css|js)\/[a-zA-Z0-9_.-]+/g) || [];
  let missingCount = 0;
  localRefs.forEach(ref => {
    const assetPath = path.resolve(dir, ref);
    if (!fs.existsSync(assetPath)) {
      console.warn(`[${p}] Missing asset: ${ref} -> ${assetPath}`);
      missingCount++;
      totalIssues++;
    }
  });
  console.log(`[${p}] OK! Referenced ${localRefs.length} local assets, ${missingCount} missing.`);
});

console.log(`\nVerification complete. Total issues found: ${totalIssues}`);
