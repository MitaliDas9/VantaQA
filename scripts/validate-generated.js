const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const roots = [
  path.join(process.cwd(), 'tests', 'shared'),
  path.join(process.cwd(), 'tests', 'jira')
];

const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
}
roots.forEach(walk);

let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    console.error(`SYNTAX ERROR: ${file}`);
    console.error((result.stderr || result.stdout || '').trim());
  }
}
if (failed) process.exit(1);
console.log(`Validated ${files.length} generated JavaScript file(s).`);
