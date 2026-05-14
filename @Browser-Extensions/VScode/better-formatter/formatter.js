function formatCode(text, options = {}) {
  const {
    compactArrays = true,
    fixTrailingWhitespace = true,
    maxBlankLines = 2,
    fixSameLineBraces = true
  } = options;

  let result = text;

  // Phase 1: trailing whitespace
  if (fixTrailingWhitespace) {
    result = result.replace(/[ \t]+$/gm, '');
  }

  // Phase 2: normalize blank lines
  // maxBlankLines = 2 → allow up to \n\n\n, replace \n{4,} with \n\n\n
  if (maxBlankLines >= 0) {
    const re = new RegExp(`\\n{${maxBlankLines + 2},}`, 'g');
    const replacement = '\n'.repeat(maxBlankLines + 1);
    result = result.replace(re, replacement);
  }

  // Phase 3: compact simple multi-line arrays to single line
  if (compactArrays) {
    result = compactSimpleArrays(result);
  }

  // Phase 4: force same-line braces: ) \n { → ) {
  if (fixSameLineBraces) {
    result = result.replace(/\)\s*\n\s*\{/g, ') {');
  }

  return result;
}

function compactSimpleArrays(text) {
  // Walk through char by char, find [ … ] pairs,
  // process from innermost outward so nested cases work.
  // Returns array of { start, end, replacement }.

  const edits = [];
  const stack = [];

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') {
      stack.push(i);
    } else if (text[i] === ']') {
      if (stack.length === 0) continue;
      const start = stack.pop();
      edits.push({ start, end: i });
    }
  }

  // Sort by span length descending (innermost first)
  edits.sort((a, b) => (b.end - b.start) - (a.end - a.start));

  // Collect lines and their offsets for comment detection
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') lineStarts.push(i + 1);
  }

  function getLineNumber(pos) {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (lineStarts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  function isInComment(pos) {
    const lineIdx = getLineNumber(pos);
    const lineStart = lineStarts[lineIdx];
    // Find next \n from lineStart
    let lineEnd = text.indexOf('\n', lineStart);
    if (lineEnd === -1) lineEnd = text.length;
    const line = text.slice(lineStart, lineEnd);

    // Check if there's a // before the bracket on this line
    const bracketInLine = pos - lineStart;
    const commentIdx = line.indexOf('//');
    if (commentIdx !== -1 && commentIdx < bracketInLine) return true;

    // Check multi-line comment: find last /* without */
    const beforePos = text.slice(0, pos);
    const lastBlockComment = beforePos.lastIndexOf('/*');
    if (lastBlockComment !== -1) {
      const closeComment = beforePos.indexOf('*/', lastBlockComment);
      if (closeComment === -1 || closeComment >= pos) return true;
    }

    return false;
  }

  let result = text;

  for (const edit of edits) {
    const { start, end } = edit;
    const inner = result.slice(start + 1, end);

    // Already single-line?
    if (!inner.includes('\n')) continue;

    // Skip if bracket is inside a comment
    if (isInComment(start) || isInComment(end)) continue;

    // Collapse inner content to one line
    const lines = inner.split('\n');
    const items = lines
      .map(l => l.trim())
      .filter(l => l.length > 0);
    const flat = items.join(' ');

    // Only compact if:
    // 1. Result fits in 80 chars
    // 2. No nested [ or { in the compacted content
    if (flat.length <= 80 && !/[[{]/g.test(flat)) {
      const replacement = `[${flat}]`;
      result = result.slice(0, start) + replacement + result.slice(end + 1);
    }
  }

  return result;
}

module.exports = { formatCode };
