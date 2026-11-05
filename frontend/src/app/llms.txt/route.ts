import { LANDING_DESCRIPTION, LANDING_FAQ, trimBase } from '@/lib/tamani/landing';

// /llms.txt (lot 12, spec §8.5): a short plain-text card for AI assistants,
// saying what Tamani is, for whom, and where the pages are. Not a ranking
// trick: it only repeats what the pages already say.
export const runtime = 'nodejs';
export const dynamic = 'force-static';

export function GET(): Response {
  const base = trimBase(process.env.APP_URL ?? 'http://localhost:3000');
  const intro = LANDING_FAQ[0]?.answer ?? LANDING_DESCRIPTION;
  const body = [
    '# Tamani',
    '',
    `> ${intro}`,
    '',
    "Pour les grossistes, importateurs et vendeurs en ligne d'Afrique francophone.",
    'Les clients répondent en moins de 30 secondes, sans application ni compte.',
    '',
    '## Pages',
    '',
    `- [Accueil](${base}/) : ce que fait Tamani, comment ça marche, les bénéfices`,
    `- [Forfaits](${base}/forfaits) : l'essai gratuit et les pass, payés par Mobile Money`,
    `- [Questions fréquentes](${base}/#faq) : les réponses courtes aux questions des vendeurs`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
