const axios = require('axios');

class JiraClient {
  constructor() {
    this.baseUrl = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
    this.auth = {
      username: process.env.JIRA_EMAIL,
      password: process.env.JIRA_API_TOKEN
    };

    if (!this.baseUrl || !this.auth.username || !this.auth.password) {
      throw new Error(
        'Missing JIRA_BASE_URL, JIRA_EMAIL or JIRA_API_TOKEN in environment.'
      );
    }

    this.http = axios.create({
      baseURL: `${this.baseUrl}/rest/api/3`,
      auth: this.auth,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
    });
  }

  async getIssue(issueKey) {
    const response = await this.http.get(`/issue/${encodeURIComponent(issueKey)}`, {
      params: {
        fields: 'summary,description,issuetype,project,priority,labels,components,issuelinks,subtasks'
      }
    });
    return response.data;
  }

  async createSubtask(parentKey, summary, description) {
    const projectKey = process.env.JIRA_PROJECT_KEY;
    const issueTypeName = process.env.JIRA_TEST_SUBTASK_ISSUE_TYPE || 'Sub-task';

    const payload = {
      fields: {
        project: { key: projectKey },
        parent: { key: parentKey },
        issuetype: { name: issueTypeName },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: description }]
            }
          ]
        }
      }
    };

    const response = await this.http.post('/issue', payload);
    return response.data;
  }
}

module.exports = { JiraClient };
