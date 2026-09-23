// USD per million text tokens, checked against official provider pages on 2026-09-22.
// These are standard API reference prices, not Codex/Claude Code/Cursor plan charges.
export type Price = { input: number; cached: number; output: number; cacheWrite?: number; source: string; checked: string };
const checked = '22/09/2026';
const openai = 'https://developers.openai.com/api/docs/pricing';
const anthropic = 'https://platform.claude.com/docs/en/about-claude/pricing';
const prices: Record<string, Price> = {
  'gpt-6-astra': { input: 10, cached: 1, cacheWrite: 12.5, output: 50, source: openai, checked },
  'gpt-6-sol': { input: 2, cached: .2, cacheWrite: 2.5, output: 10, source: openai, checked },
  'gpt-6-luna': { input: .1, cached: .01, cacheWrite: .125, output: .5, source: openai, checked },
  'gpt-5.6-sol': { input: 4, cached: .4, cacheWrite: 5, output: 20, source: openai, checked },
  'gpt-5.6-terra': { input: 2, cached: .2, cacheWrite: 2.5, output: 12, source: 'https://developers.openai.com/api/docs/models/gpt-5.6-terra', checked },
  'gpt-5.6-luna': { input: .2, cached: .02, cacheWrite: .25, output: 1.2, source: 'https://developers.openai.com/api/docs/models/gpt-5.6-luna', checked },
  'claude-fable-5-1': { input: 10, cached: .25, cacheWrite: 12.5, output: 50, source: anthropic, checked },
  'claude-opus-5-5': { input: 4, cached: .2, cacheWrite: 5, output: 20, source: anthropic, checked },
  'claude-opus-5': { input: 5, cached: .5, cacheWrite: 6.25, output: 25, source: anthropic, checked },
  'claude-sonnet-5': { input: 2, cached: .2, cacheWrite: 2.5, output: 10, source: anthropic, checked },
  'claude-haiku-4-5-20251001': { input: 1, cached: .1, cacheWrite: 1.25, output: 5, source: anthropic, checked },
};
export function priceFor(provider: string, model: string): Price | null {
  if (provider === 'Codex' && model.startsWith('gpt-')) return prices[model] || null;
  if (provider === 'Claude Code' && model.startsWith('claude-')) return prices[model] || null;
  return null;
}
export type Usage = { input: number | null; output: number | null; cache: number | null; cacheWrite?: number | null };
export function referenceCost(rows: Usage[], price: Price): { usd: number; count: number } | null {
  const complete = rows.filter(r => r.input !== null && r.output !== null && r.cache !== null && r.cache <= r.input && (r.cacheWrite === undefined || r.cacheWrite !== null) && (r.cacheWrite === undefined || r.input >= r.cache + r.cacheWrite!));
  if (!complete.length) return null;
  const usd = complete.reduce((sum, r) => sum + ((r.input! - r.cache! - (r.cacheWrite || 0)) * price.input + r.cache! * price.cached + r.output! * price.output + (r.cacheWrite || 0) * (price.cacheWrite || price.input)) / 1_000_000, 0);
  return { usd, count: complete.length };
}
export const usd = (value: number) => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'USD',minimumFractionDigits: value < 1 ? 4 : 2,maximumFractionDigits: value < 1 ? 4 : 2}).format(value);
