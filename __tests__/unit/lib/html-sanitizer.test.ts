import { sanitizeHtml, hasMissingNameVariable } from '@/lib/html-sanitizer';

describe('HTML Sanitizer', () => {
  it('strips script tags', () => {
    const dirty = '<p>Hello</p><script>alert("xss")</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).toContain('<p>Hello</p>');
  });

  it('preserves safe formatting', () => {
    const safe = '<b>Bold</b> and <i>Italic</i>';
    expect(sanitizeHtml(safe)).toBe(safe);
  });

  it('handles null input', () => {
    expect(sanitizeHtml(null)).toBe('');
  });

  it('handles undefined input', () => {
    expect(sanitizeHtml(undefined)).toBe('');
  });

  it('strips iframe tags', () => {
    const dirty = '<p>Content</p><iframe src="evil.com"></iframe>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<iframe');
    expect(clean).toContain('<p>Content</p>');
  });

  it('strips form and input tags', () => {
    const dirty = '<p>Text</p><form><input type="text"></form>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<form');
    expect(clean).not.toContain('<input');
  });

  it('preserves paragraph and break tags', () => {
    const safe = '<p>First paragraph</p><br /><p>Second</p>';
    const clean = sanitizeHtml(safe);
    expect(clean).toContain('<p>');
    expect(clean).toContain('<br');
  });

  it('preserves links with href', () => {
    const safe = '<a href="https://example.com">Link</a>';
    const clean = sanitizeHtml(safe);
    expect(clean).toContain('<a');
    expect(clean).toContain('href="https://example.com"');
  });
});

describe('Missing Name Detector', () => {
  it('detects "Hey ," pattern', () => {
    expect(hasMissingNameVariable('Hey , how are you?')).toBe(true);
  });

  it('detects "Hi ," pattern', () => {
    expect(hasMissingNameVariable('Hi , nice to meet you')).toBe(true);
  });

  it('detects "Hello ," pattern', () => {
    expect(hasMissingNameVariable('Hello , welcome!')).toBe(true);
  });

  it('detects "Dear ," pattern', () => {
    expect(hasMissingNameVariable('Dear , I hope this email finds you well')).toBe(true);
  });

  it('ignores correct names', () => {
    expect(hasMissingNameVariable('Hey John,')).toBe(false);
  });

  it('ignores text with proper greeting', () => {
    expect(hasMissingNameVariable('Hi Sarah, how are you?')).toBe(false);
  });

  it('handles null input', () => {
    expect(hasMissingNameVariable(null)).toBe(false);
  });

  it('handles undefined input', () => {
    expect(hasMissingNameVariable(undefined)).toBe(false);
  });

  it('handles empty string', () => {
    expect(hasMissingNameVariable('')).toBe(false);
  });
});
