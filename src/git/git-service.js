const { execFileSync } = require('child_process');

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
    stdio: options.silent ? ['ignore', 'pipe', 'pipe'] : 'pipe'
  }).trim();
}

class GitService {
  statusPorcelain() {
    return git(['status', '--porcelain']);
  }

  currentBranch() {
    return git(['branch', '--show-current']);
  }

  ensureClean() {
    const status = this.statusPorcelain();
    if (status) {
      throw new Error(
        'Git working tree is not clean. Commit/stash your existing changes before running Jira automation generation.'
      );
    }
  }

  prepareBranch(jiraKey) {
    const branch = `EH-${jiraKey}`;
    this.ensureClean();

    git(['fetch', 'origin', 'main']);
    git(['checkout', 'main']);
    git(['reset', '--hard', 'origin/main']);

    const localBranches = git(['branch', '--list', branch]);
    if (localBranches) {
      throw new Error(`Local branch ${branch} already exists. Delete it or use a new Jira key.`);
    }

    git(['checkout', '-b', branch]);
    return branch;
  }

  commitAndPush(branch, jiraKey) {
    git(['add', '.']);

    let staged = '';
    try {
      staged = git(['diff', '--cached', '--name-only']);
    } catch (_) {
      staged = '';
    }

    if (!staged) {
      throw new Error(`No generated changes were found for ${jiraKey}; refusing to create an empty PR.`);
    }

    git([
      '-c', 'user.name=VantaQA Automation',
      '-c', 'user.email=vantaqa-automation@users.noreply.github.com',
      'commit', '-m', `test(${jiraKey}): generate automation and STLC test coverage`
    ]);

    git(['push', '-u', 'origin', branch]);
    return branch;
  }
}

module.exports = { GitService };
