const { quoteProp, sortedObjectEntries } = require('./schema.cjs');

function docBlock(doc, indent = '  ') {
  if (!doc) return '';
  const lines = Array.isArray(doc) ? doc.filter(Boolean) : [doc];
  if (lines.length === 0) return '';
  return [
    `${indent}/**`,
    ...lines.map((line) => `${indent} * ${line}`),
    `${indent} */`
  ].join('\n');
}

function fieldDocs(info) {
  const docs = [];
  if (info.docs) docs.push(...(Array.isArray(info.docs) ? info.docs : [info.docs]));
  if (info.doc) docs.push(info.doc);
  if (info.optional && String(info.type).split(' | ').includes('null')) docs.push('omit to leave unchanged; null to clear.');
  return docs.filter(Boolean);
}

function interfaceBlock(name, fields, indent = '  ', doc) {
  const lines = [];
  const blockDoc = docBlock(doc, indent);
  if (blockDoc) lines.push(blockDoc);
  lines.push(`${indent}export interface ${name} {`);
  const entries = sortedObjectEntries(fields);
  if (entries.length === 0) lines.push(`${indent}  [key: string]: unknown;`);
  for (const [key, info] of entries) {
    const docs = docBlock(fieldDocs(info), `${indent}  `);
    if (docs) lines.push(docs);
    lines.push(`${indent}  ${quoteProp(key)}${info.optional ? '?' : ''}: ${info.type};`);
  }
  lines.push(`${indent}}`);
  return lines.join('\n');
}

module.exports = {
  docBlock,
  interfaceBlock
};
