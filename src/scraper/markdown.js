const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const TurndownService = require('turndown');

function createTurndownService() {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // Keep tables
  turndown.addRule('table', {
    filter: ['table'],
    replacement: function (content, node) {
      return '\n\n' + tableToMarkdown(node) + '\n\n';
    },
  });

  return turndown;
}

function tableToMarkdown(tableNode) {
  const rows = tableNode.querySelectorAll('tr');
  if (!rows.length) return '';

  const result = [];
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll('th, td');
    const row = [...cells].map(c => c.textContent.trim().replace(/\|/g, '\\|')).join(' | ');
    result.push('| ' + row + ' |');

    // Add header separator after first row
    if (i === 0) {
      const sep = [...cells].map(() => '---').join(' | ');
      result.push('| ' + sep + ' |');
    }
  }
  return result.join('\n');
}

function htmlToMarkdown(html, url) {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // Try Readability first
  let cleanedHtml = null;
  try {
    const clone = doc.cloneNode(true);
    const reader = new Readability(clone);
    const article = reader.parse();
    if (article && article.content && article.content.length > 100) {
      cleanedHtml = article.content;
    }
  } catch {
    // Readability failed, use fallback
  }

  // Fallback: extract main content manually
  if (!cleanedHtml) {
    cleanedHtml = fallbackClean(doc);
  }

  // Convert to markdown
  const turndown = createTurndownService();
  let markdown = turndown.turndown(cleanedHtml);

  // Clean up
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n')           // Collapse excessive newlines
    .replace(/^#+\s*$/gm, '')              // Remove empty headings
    .replace(/\n{3,}/g, '\n\n')           // Re-collapse after heading removal
    .trim();

  return markdown;
}

function fallbackClean(doc) {
  // Try <main> first, then <body>
  const main = doc.querySelector('main') || doc.querySelector('[role="main"]') || doc.body;
  if (!main) return '<p>No content found</p>';

  // Clone to avoid modifying original
  const clone = main.cloneNode(true);

  // Remove unwanted elements
  const selectors = [
    'nav', 'header', 'footer', 'script', 'style', 'noscript', 'iframe',
    '[class*="cookie"]', '[class*="consent"]', '[class*="popup"]', '[class*="modal"]',
    '[class*="banner"]', '[id*="cookie"]', '[id*="consent"]', '[id*="popup"]',
    '[class*="nav"]', '[class*="sidebar"]', '[class*="menu"]',
    '[class*="advertisement"]', '[class*="ad-"]', '[class*="social-share"]',
  ];

  for (const selector of selectors) {
    try {
      const els = clone.querySelectorAll(selector);
      els.forEach(el => el.remove());
    } catch {
      // Invalid selector, skip
    }
  }

  return clone.innerHTML;
}

module.exports = { htmlToMarkdown };
