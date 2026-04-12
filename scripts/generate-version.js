const fs = require('fs');
const path = require('path');

const gitCommit = require('child_process')
  .execSync('git rev-parse --short HEAD 2>/dev/null || echo "unknown"')
  .toString()
  .trim();

const gitCommits = require('child_process')
  .execSync('git rev-list --count HEAD 2>/dev/null || echo "0"')
  .toString()
  .trim();

const buildDate = new Date()
  .toISOString()
  .split('T')[0]
  .replace(/-/g, '');

const version = `v${gitCommits}.${gitCommit}`;

const versionInfo = {
  version,
  buildDate,
  commit: gitCommit,
  commits: parseInt(gitCommits, 10)
};

const outputPath = path.join(__dirname, '..', 'src', 'lib', 'version.json');
fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

console.log(`Version generated: ${version} (${gitCommits} commits, build ${buildDate})`);
