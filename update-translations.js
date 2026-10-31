const fs = require('fs');
const path = require('path');

const transDir = path.join(__dirname, 'data', 'translations');
const manifestPath = path.join(__dirname, 'data', 'translations-manifest.json');
const opJsPath = path.join(__dirname, 'operator', 'operator.js');

if (!fs.existsSync(transDir)) {
  console.error('Hindi nahanap ang folder na: ' + transDir);
  process.exit(1);
}

// 1. I-scan ang lahat ng .json translations sa folder
const files = fs.readdirSync(transDir).filter(f => f.toLowerCase().endsWith('.json'));

let manifest = files.map(file => {
  const nameWithoutExt = file.replace(/\.json$/i, '');
  return {
    id: nameWithoutExt,
    name: nameWithoutExt,
    file: file
  };
});

// Siguraduhing una sa listahan ang "ANG DATING BIBLIA"
manifest.sort((a, b) => {
  const isA = a.name.toUpperCase().includes('ANG DATING BIBLIA');
  const isB = b.name.toUpperCase().includes('ANG DATING BIBLIA');
  if (isA && !isB) return -1;
  if (!isA && isB) return 1;
  return a.name.localeCompare(b.name);
});

// 2. Isulat ang updated translations-manifest.json
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log('✓ Matagumpay na naitala ang ' + manifest.length + ' translations sa manifest!');

// 3. Siguraduhing ligtas ang pag-fetch sa filenames na may spaces sa operator.js
if (fs.existsSync(opJsPath)) {
  let opJs = fs.readFileSync(opJsPath, 'utf8');

  // I-encode ang filename para sa URL (hal. "ANG DATING BIBLIA" -> "ANG%20DATING%20BIBLIA")
  opJs = opJs.replace(
    /fetch\('\.\.\/data\/translations\/' \+ transId \+ '\.json'\)/g,
    "fetch('../data/translations/' + encodeURIComponent(transId) + '.json')"
  );

  fs.writeFileSync(opJsPath, opJs, 'utf8');
  console.log('✓ Na-update ang operator.js para sa space-safe file fetching!');
}