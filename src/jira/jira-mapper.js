function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(adfToText).join(' ');
  if (typeof node === 'object') {
    const own = node.text || '';
    const children = node.content ? adfToText(node.content) : '';
    return `${own} ${children}`.trim();
  }
  return '';
}

function normalizeIssue(issue) {
  const fields = issue.fields || {};
  return {
    key: issue.key,
    summary: fields.summary || '',
    description: adfToText(fields.description),
    issueType: fields.issuetype?.name || '',
    project: fields.project?.key || '',
    priority: fields.priority?.name || '',
    labels: fields.labels || [],
    components: (fields.components || []).map(c => c.name),
    subtasks: (fields.subtasks || []).map(s => ({ key: s.key, summary: s.fields?.summary }))
  };
}

module.exports = { normalizeIssue };
