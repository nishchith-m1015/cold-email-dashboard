import { pagesCatalog } from '@/lib/search-pages';

describe('pagesCatalog', () => {
  it('includes core navigation targets', () => {
    const ids = pagesCatalog.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['overview', 'analytics', 'contacts', 'settings', 'billing']));
  });

  it('has URLs for every entry', () => {
    pagesCatalog.forEach((p) => {
      expect(p.url).toMatch(/^\//);
    });
  });
});







