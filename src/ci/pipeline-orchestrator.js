const { spawnSync } = require('child_process');
const fs = require('fs');

function run(command, args, options = {}) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  });

  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}

function runPlaywright(issueKey) {
  const args = ['playwright', 'test'];

  if (issueKey) {
    const sharedLoginSpec = `tests/shared/tests/login.spec.js`;
    const ticketSpec = `tests/jira/${issueKey}/specs/${issueKey}.spec.js`;

    if (fs.existsSync(ticketSpec)) args.push(ticketSpec);
    else if (fs.existsSync(sharedLoginSpec)) args.push(sharedLoginSpec);
  }

  run(process.platform === 'win32' ? 'npx.cmd' : 'npx', args);
}

module.exports = { runPlaywright };
