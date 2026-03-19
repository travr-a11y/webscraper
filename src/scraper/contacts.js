const COMMON_FALSE_EMAILS = new Set([
  'example@example.com', 'noreply@', 'no-reply@', 'mailer-daemon@',
  'postmaster@', 'webmaster@example.com', 'test@test.com',
  'email@example.com', 'name@example.com', 'user@example.com',
]);

const SOCIAL_PATTERNS = {
  facebook: /https?:\/\/(?:www\.)?facebook\.com\/(?!sharer|share|dialog|login|tr\?)[\w.\-/]+/gi,
  linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[\w.\-/]+/gi,
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/[\w.\-]+/gi,
  twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[\w.\-]+/gi,
  youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:channel|c|user|@)\/[\w.\-]+/gi,
};

function extractEmails(html) {
  const emails = new Set();

  // Decode common obfuscation
  let decoded = html
    .replace(/\[at\]/gi, '@')
    .replace(/\(at\)/gi, '@')
    .replace(/\[dot\]/gi, '.')
    .replace(/\(dot\)/gi, '.')
    .replace(/&#64;/g, '@')
    .replace(/&#46;/g, '.')
    .replace(/&commat;/g, '@');

  // Standard email regex
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  let match;
  while ((match = emailRegex.exec(decoded)) !== null) {
    const email = match[0].toLowerCase();
    if (!isFalsePositiveEmail(email)) {
      emails.add(email);
    }
  }

  // mailto: links
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
  while ((match = mailtoRegex.exec(html)) !== null) {
    const email = match[1].toLowerCase();
    if (!isFalsePositiveEmail(email)) {
      emails.add(email);
    }
  }

  return [...emails];
}

function isFalsePositiveEmail(email) {
  if (COMMON_FALSE_EMAILS.has(email)) return true;
  for (const prefix of ['noreply@', 'no-reply@', 'mailer-daemon@', 'postmaster@']) {
    if (email.startsWith(prefix)) return true;
  }
  // Skip image-like emails (from alt text or filenames)
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(email)) return true;
  return false;
}

function extractPhones(html) {
  const phones = new Set();

  // Australian phone formats
  const patterns = [
    /1[38]00\s?\d{3}\s?\d{3}/g,                    // 1300/1800 xxx xxx
    /\(0[2-9]\)\s?\d{4}\s?\d{4}/g,                  // (0x) xxxx xxxx
    /0[2-9]\s?\d{4}\s?\d{4}/g,                      // 0x xxxx xxxx
    /04\d{2}\s?\d{3}\s?\d{3}/g,                      // 04xx xxx xxx
    /\+61\s?\d\s?\d{4}\s?\d{4}/g,                   // +61 x xxxx xxxx
    /\+61\s?\d{3}\s?\d{3}\s?\d{3}/g,                // +61 xxx xxx xxx
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const phone = match[0].trim();
      phones.add(phone);
    }
  }

  // tel: links
  const telRegex = /href=["']tel:([^"']+)["']/gi;
  let match;
  while ((match = telRegex.exec(html)) !== null) {
    const phone = decodeURIComponent(match[1]).replace(/\s+/g, ' ').trim();
    if (phone.length >= 8) {
      phones.add(phone);
    }
  }

  return [...phones];
}

function extractSocialLinks(html) {
  const social = {};
  for (const [platform, regex] of Object.entries(SOCIAL_PATTERNS)) {
    const matches = html.match(regex);
    if (matches) {
      // Deduplicate and take first
      const unique = [...new Set(matches.map(u => u.replace(/\/+$/, '')))];
      social[platform] = unique[0];
    } else {
      social[platform] = null;
    }
  }
  return social;
}

function extractAllContacts(html) {
  return {
    emails: extractEmails(html),
    phones: extractPhones(html),
    socialLinks: extractSocialLinks(html),
  };
}

module.exports = {
  extractEmails,
  extractPhones,
  extractSocialLinks,
  extractAllContacts,
};
