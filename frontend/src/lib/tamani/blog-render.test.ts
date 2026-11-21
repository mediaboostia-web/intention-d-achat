import { describe, expect, it } from 'vitest';
import { docText, readMinutes, renderDoc, type BlogNode } from './blog-render';

const doc = (...content: BlogNode[]): BlogNode => ({ type: 'doc', content });
const p = (...content: BlogNode[]): BlogNode => ({ type: 'paragraph', content });
const t = (text: string, marks?: BlogNode['marks']): BlogNode =>
  marks ? { type: 'text', text, marks } : { type: 'text', text };

describe('renderDoc', () => {
  it('escapes text, never trusting what the editor stored', () => {
    const { html } = renderDoc(doc(p(t('<script>alert(1)</script> & "x"'))));
    expect(html).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;</p>');
  });

  it('renders the marks of the toolbar, nested in a stable order', () => {
    const { html } = renderDoc(
      doc(p(t('gras', [{ type: 'bold' }]), t(' et '), t('penché', [{ type: 'italic' }]))),
    );
    expect(html).toBe('<p><strong>gras</strong> et <em>penché</em></p>');
  });

  it('keeps https, http, mailto and relative links; external ones open a new tab', () => {
    const link = (href: string) => [{ type: 'link', attrs: { href } }];
    const { html } = renderDoc(
      doc(
        p(t('a', link('https://tamani.win/forfaits'))),
        p(t('b', link('https://example.com/x?y=1&z=2'))),
        p(t('c', link('mailto:bonjour@tamani.win'))),
        p(t('d', link('/blog'))),
      ),
      { siteHost: 'tamani.win' },
    );
    expect(html).toContain('<a href="https://tamani.win/forfaits">a</a>');
    expect(html).toContain(
      '<a href="https://example.com/x?y=1&amp;z=2" target="_blank" rel="noopener noreferrer">b</a>',
    );
    expect(html).toContain('<a href="mailto:bonjour@tamani.win">c</a>');
    expect(html).toContain('<a href="/blog">d</a>');
  });

  it('drops a javascript: or data: link but keeps its words', () => {
    for (const href of [
      'javascript:alert(1)',
      ' JaVaScRiPt:alert(1)',
      'data:text/html,x',
      '//evil.com',
    ]) {
      const { html } = renderDoc(doc(p(t('clic', [{ type: 'link', attrs: { href } }]))));
      expect(html).toBe('<p>clic</p>');
    }
  });

  it('gives headings stable ids and lists them in the table of contents', () => {
    const h = (level: number, text: string): BlogNode => ({
      type: 'heading',
      attrs: { level },
      content: [t(text)],
    });
    const { html, toc } = renderDoc(doc(h(2, 'Les quantités'), h(3, 'Été'), h(2, 'Les quantités')));
    expect(html).toBe(
      '<h2 id="les-quantites">Les quantités</h2><h3 id="ete">Été</h3><h2 id="les-quantites-2">Les quantités</h2>',
    );
    expect(toc).toEqual([
      { id: 'les-quantites', text: 'Les quantités', level: 2 },
      { id: 'ete', text: 'Été', level: 3 },
      { id: 'les-quantites-2', text: 'Les quantités', level: 2 },
    ]);
  });

  it('turns a level 1 heading into a level 2: the page has one title', () => {
    const { html } = renderDoc(doc({ type: 'heading', attrs: { level: 1 }, content: [t('A')] }));
    expect(html).toBe('<h2 id="a">A</h2>');
  });

  it('renders lists, quotes, separators and line breaks', () => {
    const li = (s: string): BlogNode => ({ type: 'listItem', content: [p(t(s))] });
    const { html } = renderDoc(
      doc(
        { type: 'bulletList', content: [li('un'), li('deux')] },
        { type: 'orderedList', content: [li('premier')] },
        { type: 'blockquote', content: [p(t('cité'))] },
        { type: 'horizontalRule' },
        p(t('a'), { type: 'hardBreak' }, t('b')),
      ),
    );
    expect(html).toBe(
      '<ul><li><p>un</p></li><li><p>deux</p></li></ul><ol><li><p>premier</p></li></ol><blockquote><p>cité</p></blockquote><hr><p>a<br>b</p>',
    );
  });

  it('keeps https images only, lazy, with their description', () => {
    const { html } = renderDoc(
      doc(
        { type: 'image', attrs: { src: 'https://res.cloudinary.com/x/a.jpg', alt: 'Un "carton"' } },
        { type: 'image', attrs: { src: 'http://x.com/a.jpg', alt: 'non' } },
        { type: 'image', attrs: { src: 'javascript:alert(1)' } },
      ),
    );
    expect(html).toBe(
      '<figure><img src="https://res.cloudinary.com/x/a.jpg" alt="Un &quot;carton&quot;" loading="lazy" decoding="async"></figure>',
    );
  });

  it('embeds YouTube by its id only, on the no-cookie domain', () => {
    const yt = (src: string): BlogNode => ({ type: 'youtube', attrs: { src } });
    const { html } = renderDoc(
      doc(
        yt('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
        yt('https://youtu.be/dQw4w9WgXcQ'),
        yt('https://evil.com/watch?v=dQw4w9WgXcQ"><script>'),
      ),
    );
    const frame =
      '<div class="blog-video"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="Vidéo YouTube" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
    expect(html).toBe(frame + frame);
  });

  it('drops unknown nodes and marks, and survives garbage', () => {
    expect(
      renderDoc(doc({ type: 'iframe', attrs: { src: 'x' } }, p(t('ok', [{ type: 'evil' }])))).html,
    ).toBe('<p>ok</p>');
    expect(renderDoc(null).html).toBe('');
    expect(renderDoc({ type: 'doc', content: 'x' } as unknown as BlogNode).html).toBe('');
  });
});

describe('docText and readMinutes', () => {
  const words = (n: number) => Array.from({ length: n }, () => 'mot').join(' ');
  it('reads the words of every text node', () => {
    expect(docText(doc(p(t('Bonjour')), p(t('le monde'))))).toBe('Bonjour le monde');
  });
  it('counts 200 words a minute, one minute at least', () => {
    expect(readMinutes(doc(p(t('court'))))).toBe(1);
    expect(readMinutes(doc(p(t(words(401)))))).toBe(3);
  });
});
