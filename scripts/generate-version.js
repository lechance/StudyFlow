const fs = require('fs');
const path = require('path');

const gitCommit = require('child_process')
  .execSync('git rev-parse --short HEAD 2>/dev/null || echo "unknown"')
  .toString()
  .trim();

const buildDate = new Date()
  .toISOString()
  .split('T')[0]
  .replace(/-/g, '');

const version = `v${buildDate}-${gitCommit}`;

const versionInfo = {
  version,
  buildDate,
  commit: gitCommit
};

const outputPath = path.join(__dirname, '..', 'src', 'lib', 'version.json');
fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

console.log(`Version generated: ${version}`);
