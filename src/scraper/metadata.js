const { JSDOM } = require('jsdom');

function extractMetadata(html, sourceURL, statusCode) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  function getMeta(nameOrProperty) {
    const el =
      doc.querySelector(`meta[name="${nameOrProperty}"]`) ||
      doc.querySelector(`meta[property="${nameOrProperty}"]`);
    return el ? el.getAttribute('content') : null;
  }

  function getFavicon() {
    const link =
      doc.querySelector('link[rel="icon"]') ||
      doc.querySelector('link[rel="shortcut icon"]') ||
      doc.querySelector('link[rel="apple-touch-icon"]');
    if (link) {
      const href = link.getAttribute('href');
      if (href) {
        try {
          return new URL(href, sourceURL).toString();
        } catch {
          return href;
        }
      }
    }
    // Default favicon location
    try {
      return new URL('/favicon.ico', sourceURL).toString();
    } catch {
      return null;
    }
  }

  const htmlEl = doc.querySelector('html');

  return {
    title: doc.title || null,
    description: getMeta('description'),
    ogTitle: getMeta('og:title'),
    ogDescription: getMeta('og:description'),
    ogImage: getMeta('og:image'),
    ogUrl: getMeta('og:url'),
    ogType: getMeta('og:type'),
    ogLocale: getMeta('og:locale'),
    ogSiteName: getMeta('og:site_name'),
    favicon: getFavicon(),
    language: htmlEl ? htmlEl.getAttribute('lang') : null,
    robots: getMeta('robots'),
    generator: getMeta('generator'),
    sourceURL,
    statusCode,
    contentType: 'text/html',
  };
}

module.exports = { extractMetadata };
