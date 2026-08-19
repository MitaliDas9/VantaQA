const axios = require('axios');

class GitHubClient {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.owner = process.env.GITHUB_OWNER;
    this.repo = process.env.GITHUB_REPO;
    this.baseBranch = process.env.GITHUB_BASE_BRANCH || 'main';

    if (!this.token || !this.owner || !this.repo) {
      throw new Error(
        'Missing GITHUB_TOKEN, GITHUB_OWNER or GITHUB_REPO. These are required for automatic PR creation/merge.'
      );
    }

    this.http = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  }

  async createPullRequest({ head, title, body }) {
    const response = await this.http.post(`/repos/${this.owner}/${this.repo}/pulls`, {
      title,
      head,
      base: this.baseBranch,
      body
    });
    return response.data;
  }

  async getPullRequest(number) {
    const response = await this.http.get(
      `/repos/${this.owner}/${this.repo}/pulls/${number}`
    );
    return response.data;
  }

  async requestReviewers(number, reviewers = []) {
    if (!reviewers.length) return null;
    const response = await this.http.post(
      `/repos/${this.owner}/${this.repo}/pulls/${number}/requested_reviewers`,
      { reviewers }
    );
    return response.data;
  }

  async createReview({ number, body, event = 'APPROVE' }) {
    const response = await this.http.post(
      `/repos/${this.owner}/${this.repo}/pulls/${number}/reviews`,
      { body, event }
    );
    return response.data;
  }

  async getReviews(number) {
    const response = await this.http.get(
      `/repos/${this.owner}/${this.repo}/pulls/${number}/reviews`
    );
    return response.data;
  }

  async getCombinedStatus(ref) {
    const response = await this.http.get(
      `/repos/${this.owner}/${this.repo}/commits/${encodeURIComponent(ref)}/status`
    );
    return response.data;
  }

  async getCheckRuns(ref) {
    const response = await this.http.get(
      `/repos/${this.owner}/${this.repo}/commits/${encodeURIComponent(ref)}/check-runs`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    return response.data;
  }

  async mergePullRequest(number, method = 'squash') {
    const response = await this.http.put(
      `/repos/${this.owner}/${this.repo}/pulls/${number}/merge`,
      { merge_method: method, commit_title: `merge: VantaQA ${number}` }
    );
    return response.data;
  }
}

module.exports = { GitHubClient };
