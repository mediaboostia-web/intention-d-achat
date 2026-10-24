import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/** Render a component to static HTML, as the server would send it. */
export const html = (el: ReactElement) => renderToStaticMarkup(el);

/** Visible text of a component: tags dropped, entities decoded, spaces collapsed. */
export function text(el: ReactElement): string {
  return html(el)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
