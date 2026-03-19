const {
  normalizeUrl,
  isSameDomain,
  isValidPageUrl,
  shouldSkipUrl,
  getUrlPriority,
  sortByPriority,
  extractLinks,
  isPrivateOrReservedHost,
} = require('../src/scraper/urlUtils');

describe('normalizeUrl', () => {
  test('lowercases hostname', () => {
    expect(normalizeUrl('https://EXAMPLE.COM/path')).toBe('https://example.com/path');
  });

  test('strips trailing slash', () => {
    expect(normalizeUrl('https://example.com/about/')).toBe('https://example.com/about');
  });

  test('keeps root slash', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
  });

  test('strips tracking params', () => {
    expect(normalizeUrl('https://example.com/page?utm_source=google&real=yes'))
      .toBe('https://example.com/page?real=yes');
  });

  test('strips fragment', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
  });

  test('strips fbclid', () => {
    expect(normalizeUrl('https://example.com/page?fbclid=abc123'))
      .toBe('https://example.com/page');
  });

  test('returns null for invalid URL', () => {
    expect(normalizeUrl('not-a-url')).toBeNull();
  });
});

describe('isSameDomain', () => {
  test('same domain returns true', () => {
    expect(isSameDomain('https://example.com', 'https://example.com/about')).toBe(true);
  });

  test('different domain returns false', () => {
    expect(isSameDomain('https://example.com', 'https://other.com/about')).toBe(false);
  });

  test('subdomain without flag returns false', () => {
    expect(isSameDomain('https://example.com', 'https://blog.example.com')).toBe(false);
  });

  test('subdomain with flag returns true', () => {
    expect(isSameDomain('https://example.com', 'https://blog.example.com', true)).toBe(true);
  });
});

describe('isValidPageUrl', () => {
  test('accepts https pages', () => {
    expect(isValidPageUrl('https://example.com/about')).toBe(true);
  });

  test('rejects non-http protocols', () => {
    expect(isValidPageUrl('ftp://example.com')).toBe(false);
    expect(isValidPageUrl('javascript:void(0)')).toBe(false);
  });

  test('rejects file extensions', () => {
    expect(isValidPageUrl('https://example.com/file.pdf')).toBe(false);
    expect(isValidPageUrl('https://example.com/image.jpg')).toBe(false);
    expect(isValidPageUrl('https://example.com/data.zip')).toBe(false);
  });
});

describe('shouldSkipUrl', () => {
  test('skips login pages', () => {
    expect(shouldSkipUrl('https://example.com/login')).toBe(true);
    expect(shouldSkipUrl('https://example.com/signin')).toBe(true);
  });

  test('skips deep pagination', () => {
    expect(shouldSkipUrl('https://example.com/blog/page/6')).toBe(true);
    expect(shouldSkipUrl('https://example.com/blog/page/3')).toBe(false);
  });

  test('allows normal pages', () => {
    expect(shouldSkipUrl('https://example.com/about')).toBe(false);
    expect(shouldSkipUrl('https://example.com/services')).toBe(false);
  });
});

describe('getUrlPriority', () => {
  test('high-value pages get priority 0', () => {
    expect(getUrlPriority('https://example.com/about')).toBe(0);
    expect(getUrlPriority('https://example.com/contact')).toBe(0);
    expect(getUrlPriority('https://example.com/services')).toBe(0);
    expect(getUrlPriority('https://example.com/team')).toBe(0);
  });

  test('normal pages get priority 1', () => {
    expect(getUrlPriority('https://example.com/random-page')).toBe(1);
    expect(getUrlPriority('https://example.com/blog/post')).toBe(1);
  });
});

describe('sortByPriority', () => {
  test('sorts high-value pages first', () => {
    const urls = [
      'https://example.com/blog',
      'https://example.com/about',
      'https://example.com/random',
      'https://example.com/contact',
    ];
    const sorted = sortByPriority(urls);
    expect(sorted[0]).toBe('https://example.com/about');
    expect(sorted[1]).toBe('https://example.com/contact');
  });
});

describe('extractLinks', () => {
  test('extracts href links from HTML', () => {
    const html = `
      <html><body>
        <a href="/about">About</a>
        <a href="https://example.com/services">Services</a>
        <a href="#section">Section</a>
      </body></html>
    `;
    const links = extractLinks(html, 'https://example.com');
    expect(links).toContain('https://example.com/about');
    expect(links).toContain('https://example.com/services');
    // Fragment-only links should be filtered (href starts with #)
  });

  test('resolves relative URLs', () => {
    const html = '<a href="/page/sub">Link</a>';
    const links = extractLinks(html, 'https://example.com');
    expect(links).toContain('https://example.com/page/sub');
  });
});

describe('isPrivateOrReservedHost (SSRF protection)', () => {
  test('blocks localhost variants', () => {
    expect(isPrivateOrReservedHost('localhost')).toBe(true);
    expect(isPrivateOrReservedHost('0.0.0.0')).toBe(true);
    expect(isPrivateOrReservedHost('::1')).toBe(true);
    expect(isPrivateOrReservedHost('[::1]')).toBe(true);
  });

  test('blocks loopback IPs', () => {
    expect(isPrivateOrReservedHost('127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedHost('127.0.0.2')).toBe(true);
  });

  test('blocks RFC1918 private ranges', () => {
    expect(isPrivateOrReservedHost('10.0.0.1')).toBe(true);
    expect(isPrivateOrReservedHost('10.255.255.255')).toBe(true);
    expect(isPrivateOrReservedHost('172.16.0.1')).toBe(true);
    expect(isPrivateOrReservedHost('172.31.255.255')).toBe(true);
    expect(isPrivateOrReservedHost('192.168.1.1')).toBe(true);
    expect(isPrivateOrReservedHost('192.168.0.100')).toBe(true);
  });

  test('blocks cloud metadata IP', () => {
    expect(isPrivateOrReservedHost('169.254.169.254')).toBe(true);
    expect(isPrivateOrReservedHost('169.254.0.1')).toBe(true);
  });

  test('allows public IPs', () => {
    expect(isPrivateOrReservedHost('8.8.8.8')).toBe(false);
    expect(isPrivateOrReservedHost('1.1.1.1')).toBe(false);
    expect(isPrivateOrReservedHost('203.0.113.1')).toBe(false);
  });

  test('allows public hostnames', () => {
    expect(isPrivateOrReservedHost('example.com')).toBe(false);
    expect(isPrivateOrReservedHost('google.com')).toBe(false);
  });

  test('blocks empty/null hostname', () => {
    expect(isPrivateOrReservedHost('')).toBe(true);
    expect(isPrivateOrReservedHost(null)).toBe(true);
    expect(isPrivateOrReservedHost(undefined)).toBe(true);
  });

  test('does not block 172.32.x.x (outside RFC1918 range)', () => {
    expect(isPrivateOrReservedHost('172.32.0.1')).toBe(false);
  });
});
