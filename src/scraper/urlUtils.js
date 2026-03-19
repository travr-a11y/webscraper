const { URL } = require('url');
const net = require('net');

const PRIVATE_IP_RANGES = [
  /^127\./,                          // loopback
  /^10\./,                           // RFC1918
  /^172\.(1[6-9]|2\d|3[01])\./,     // RFC1918
  /^192\.168\./,                     // RFC1918
  /^169\.254\./,                     // link-local / cloud metadata
  /^0\./,                            // current network
  /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./, // carrier-grade NAT
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

function isPrivateOrReservedHost(hostname) {
  if (!hostname) return true;
  const lower = hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(lower)) return true;

  // Strip brackets for IPv6
  const bare = lower.startsWith('[') ? lower.slice(1, -1) : lower;

  // Check IPv4 ranges
  if (net.isIPv4(bare)) {
    return PRIVATE_IP_RANGES.some(re => re.test(bare));
  }

  // Block all IPv6 except public (conservative — block by default)
  if (net.isIPv6(bare)) return true;

  return false;
}

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'gad_source', 'mc_cid', 'mc_eid',
  'msclkid', 'twclid', 'igshid', 'ref', 'source',
]);

const SKIP_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',
  '.mp4', '.mp3', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.zip', '.rar', '.tar', '.gz', '.7z',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.css', '.js', '.json', '.xml', '.rss', '.atom',
  '.woff', '.woff2', '.ttf', '.eot',
]);

const HIGH_VALUE_PATHS = [
  '/about', '/team', '/our-team', '/staff', '/people',
  '/services', '/our-services', '/what-we-do',
  '/contact', '/contact-us', '/get-in-touch',
  '/case-studies', '/projects', '/portfolio', '/work', '/our-work',
  '/clients', '/testimonials', '/reviews',
];

function normalizeUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    url.hostname = url.hostname.toLowerCase();
    // Strip tracking params
    for (const param of TRACKING_PARAMS) {
      url.searchParams.delete(param);
    }
    // Strip fragment
    url.hash = '';
    // Strip trailing slash (but keep root /)
    let path = url.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    url.pathname = path;
    return url.toString();
  } catch {
    return null;
  }
}

function isSameDomain(baseUrl, testUrl, includeSubdomains = false) {
  try {
    const base = new URL(baseUrl);
    const test = new URL(testUrl);
    if (includeSubdomains) {
      return test.hostname === base.hostname || test.hostname.endsWith('.' + base.hostname);
    }
    return test.hostname === base.hostname;
  } catch {
    return false;
  }
}

function isValidPageUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const ext = getExtension(url.pathname);
    if (ext && SKIP_EXTENSIONS.has(ext)) return false;
    return true;
  } catch {
    return false;
  }
}

function getExtension(pathname) {
  const lastDot = pathname.lastIndexOf('.');
  if (lastDot === -1) return null;
  const lastSlash = pathname.lastIndexOf('/');
  if (lastDot < lastSlash) return null;
  return pathname.slice(lastDot).toLowerCase();
}

function shouldSkipUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const path = url.pathname.toLowerCase();
    // Skip login/auth pages
    if (/\/(login|signin|sign-in|auth|register|signup|sign-up|logout|password|reset)/.test(path)) return true;
    // Skip search results
    if (/\/search/.test(path) && url.searchParams.has('q')) return true;
    // Skip deep pagination (page > 5)
    const pageMatch = path.match(/\/page\/(\d+)/);
    if (pageMatch && parseInt(pageMatch[1]) > 5) return true;
    const pageParam = url.searchParams.get('page') || url.searchParams.get('p');
    if (pageParam && parseInt(pageParam) > 5) return true;
    return false;
  } catch {
    return true;
  }
}

function getUrlPriority(urlStr) {
  try {
    const url = new URL(urlStr);
    const path = url.pathname.toLowerCase();
    for (const highValue of HIGH_VALUE_PATHS) {
      if (path === highValue || path.startsWith(highValue + '/') || path.startsWith(highValue + '-')) {
        return 0; // High priority
      }
    }
    return 1; // Normal priority
  } catch {
    return 2;
  }
}

function sortByPriority(urls) {
  return [...urls].sort((a, b) => getUrlPriority(a) - getUrlPriority(b));
}

function extractLinks(html, baseUrl) {
  const links = new Set();
  // Match href attributes in anchor tags
  const regex = /<a[^>]+href=["']([^"'#][^"']*)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl).toString();
      const normalized = normalizeUrl(resolved);
      if (normalized) links.add(normalized);
    } catch {
      // skip invalid URLs
    }
  }
  return [...links];
}

module.exports = {
  normalizeUrl,
  isSameDomain,
  isValidPageUrl,
  shouldSkipUrl,
  getUrlPriority,
  sortByPriority,
  extractLinks,
  isPrivateOrReservedHost,
  TRACKING_PARAMS,
  SKIP_EXTENSIONS,
};
