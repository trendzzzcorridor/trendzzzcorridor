// ==================== BEGINNER-FRIENDLY CSS FORMATTING START ====================
// Optional utility; it changes whitespace only. Run node scripts/format-css.mjs.
import { readdir, readFile, writeFile } from 'node:fs/promises';
const folder = new URL('../css/', import.meta.url);
for (const file of await readdir(folder)) {
  if (!file.endsWith('.css')) continue;
  const source = await readFile(new URL(file, folder), 'utf8');
  const lines = [];
  let buffer = '', indent = 0, quote = '', parentheses = 0;
  function flush(suffix = '') {
    const text = buffer.trim();
    if (text || suffix) lines.push('  '.repeat(indent) + text.replace(/^([\w-]+):\s*/, '$1: ') + suffix);
    buffer = '';
  }
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (quote) {
      buffer += character;
      if (character === '\\') buffer += source[++index] || '';
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") { quote = character; buffer += character; continue; }
    if (character === '/' && source[index + 1] === '*') {
      flush();
      const end = source.indexOf('*/', index + 2);
      lines.push('', source.slice(index, end + 2), '');
      index = end + 1; continue;
    }
    if (character === '(') parentheses++;
    if (character === ')') parentheses--;
    if (parentheses === 0 && character === '{') { flush(' {'); indent++; }
    else if (parentheses === 0 && character === '}') { if (buffer.trim()) flush(';'); indent = Math.max(0, indent - 1); lines.push('  '.repeat(indent) + '}', ''); }
    else if (parentheses === 0 && character === ';') flush(';');
    else buffer += character;
  }
  flush();
  await writeFile(new URL(file, folder), lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n');
}
console.log('CSS formatted.');
// ==================== BEGINNER-FRIENDLY CSS FORMATTING END ====================
