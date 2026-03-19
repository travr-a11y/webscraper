const { htmlToMarkdown } = require('../src/scraper/markdown');

describe('htmlToMarkdown', () => {
  test('converts headings', () => {
    const html = '<html><body><article><h1>Title</h1><p>Content here.</p></article></body></html>';
    const md = htmlToMarkdown(html, 'https://example.com');
    expect(md).toContain('# Title');
    expect(md).toContain('Content here.');
  });

  test('converts lists', () => {
    const html = '<html><body><article><ul><li>Item 1</li><li>Item 2</li></ul></article></body></html>';
    const md = htmlToMarkdown(html, 'https://example.com');
    expect(md).toContain('Item 1');
    expect(md).toContain('Item 2');
  });

  test('converts links', () => {
    const html = '<html><body><article><a href="https://example.com/about">About us</a></article></body></html>';
    const md = htmlToMarkdown(html, 'https://example.com');
    expect(md).toContain('[About us]');
    expect(md).toContain('https://example.com/about');
  });

  test('strips script and style tags', () => {
    const html = `
      <html><body>
        <article>
          <h1>Page</h1>
          <p>Real content</p>
        </article>
        <script>alert("bad")</script>
        <style>.foo{color:red}</style>
      </body></html>
    `;
    const md = htmlToMarkdown(html, 'https://example.com');
    expect(md).not.toContain('alert');
    expect(md).not.toContain('.foo');
    expect(md).toContain('Real content');
  });

  test('collapses excessive whitespace', () => {
    const html = '<html><body><article><p>Hello</p><br><br><br><br><p>World</p></article></body></html>';
    const md = htmlToMarkdown(html, 'https://example.com');
    // Should not have more than 2 consecutive newlines
    expect(md).not.toMatch(/\n{3,}/);
  });

  test('handles empty/minimal HTML gracefully', () => {
    const html = '<html><body></body></html>';
    const md = htmlToMarkdown(html, 'https://example.com');
    expect(typeof md).toBe('string');
  });

  test('uses fallback when Readability fails', () => {
    // Minimal HTML that Readability will likely reject
    const html = '<html><body><main><p>Fallback content here</p></main></body></html>';
    const md = htmlToMarkdown(html, 'https://example.com');
    expect(md).toContain('Fallback content');
  });
});
