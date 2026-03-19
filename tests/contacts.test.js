const {
  extractEmails,
  extractPhones,
  extractSocialLinks,
  extractAllContacts,
} = require('../src/scraper/contacts');

describe('extractEmails', () => {
  test('extracts standard emails', () => {
    const html = '<p>Contact us at info@company.com.au or support@company.com</p>';
    const emails = extractEmails(html);
    expect(emails).toContain('info@company.com.au');
    expect(emails).toContain('support@company.com');
  });

  test('extracts mailto links', () => {
    const html = '<a href="mailto:sales@example.com">Email us</a>';
    const emails = extractEmails(html);
    expect(emails).toContain('sales@example.com');
  });

  test('decodes obfuscated emails', () => {
    const html = '<p>info[at]company[dot]com</p>';
    const emails = extractEmails(html);
    expect(emails).toContain('info@company.com');
  });

  test('decodes HTML entity emails', () => {
    const html = '<p>info&#64;company&#46;com</p>';
    const emails = extractEmails(html);
    expect(emails).toContain('info@company.com');
  });

  test('filters false positives', () => {
    const html = '<p>example@example.com noreply@company.com real@company.com</p>';
    const emails = extractEmails(html);
    expect(emails).not.toContain('example@example.com');
    expect(emails).not.toContain('noreply@company.com');
    expect(emails).toContain('real@company.com');
  });

  test('deduplicates emails', () => {
    const html = '<p>info@company.com</p><footer>info@company.com</footer>';
    const emails = extractEmails(html);
    expect(emails.length).toBe(1);
  });
});

describe('extractPhones', () => {
  test('extracts 1300 numbers', () => {
    const html = '<p>Call 1300 556 369</p>';
    const phones = extractPhones(html);
    expect(phones.some(p => p.includes('1300'))).toBe(true);
  });

  test('extracts 1800 numbers', () => {
    const html = '<p>Free call 1800 123 456</p>';
    const phones = extractPhones(html);
    expect(phones.some(p => p.includes('1800'))).toBe(true);
  });

  test('extracts mobile numbers', () => {
    const html = '<p>Mobile: 0412 345 678</p>';
    const phones = extractPhones(html);
    expect(phones.length).toBeGreaterThan(0);
  });

  test('extracts +61 format', () => {
    const html = '<p>+61 2 9876 5432</p>';
    const phones = extractPhones(html);
    expect(phones.some(p => p.includes('+61'))).toBe(true);
  });

  test('extracts tel: links', () => {
    const html = '<a href="tel:1300556369">Call us</a>';
    const phones = extractPhones(html);
    expect(phones.length).toBeGreaterThan(0);
  });

  test('extracts (0x) format', () => {
    const html = '<p>Phone: (02) 9876 5432</p>';
    const phones = extractPhones(html);
    expect(phones.length).toBeGreaterThan(0);
  });
});

describe('extractSocialLinks', () => {
  test('extracts Facebook link', () => {
    const html = '<a href="https://www.facebook.com/mycompany">Facebook</a>';
    const social = extractSocialLinks(html);
    expect(social.facebook).toBe('https://www.facebook.com/mycompany');
  });

  test('extracts LinkedIn company link', () => {
    const html = '<a href="https://www.linkedin.com/company/mycompany">LinkedIn</a>';
    const social = extractSocialLinks(html);
    expect(social.linkedin).toBe('https://www.linkedin.com/company/mycompany');
  });

  test('extracts Instagram link', () => {
    const html = '<a href="https://www.instagram.com/mycompany">Insta</a>';
    const social = extractSocialLinks(html);
    expect(social.instagram).toBe('https://www.instagram.com/mycompany');
  });

  test('extracts Twitter/X link', () => {
    const html = '<a href="https://x.com/mycompany">Twitter</a>';
    const social = extractSocialLinks(html);
    expect(social.twitter).toBe('https://x.com/mycompany');
  });

  test('returns null for missing platforms', () => {
    const html = '<a href="https://www.facebook.com/mycompany">FB</a>';
    const social = extractSocialLinks(html);
    expect(social.linkedin).toBeNull();
    expect(social.instagram).toBeNull();
  });

  test('ignores Facebook share/dialog links', () => {
    const html = '<a href="https://www.facebook.com/sharer/sharer.php?u=test">Share</a>';
    const social = extractSocialLinks(html);
    expect(social.facebook).toBeNull();
  });
});

describe('extractAllContacts', () => {
  test('returns combined contacts object', () => {
    const html = `
      <p>info@company.com</p>
      <p>1300 556 369</p>
      <a href="https://facebook.com/company">FB</a>
    `;
    const contacts = extractAllContacts(html);
    expect(contacts.emails).toContain('info@company.com');
    expect(contacts.phones.length).toBeGreaterThan(0);
    expect(contacts.socialLinks.facebook).toBeTruthy();
  });
});
