#!/usr/bin/env node
const key = process.argv[2];
if (!/^[A-Z][A-Z0-9]+-\d+$/.test(key || '')) {
  console.error('Usage: node scripts/create-branch-name.js SCRUM-123');
  process.exit(1);
}
console.log(`EH-${key}`);
