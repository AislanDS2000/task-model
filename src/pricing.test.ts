import {describe, expect, it} from 'vitest';
import {priceFor, referenceCost} from './pricing';

describe('API price references', () => {
  it('matches only exact models within their provider', () => {
    expect(priceFor('Codex', 'gpt-6-luna')?.input).toBe(.1);
    expect(priceFor('Codex', 'gpt-6-luna-experimental')).toBeNull();
    expect(priceFor('Cursor', 'gpt-6-luna')).toBeNull();
  });
  it('counts cached input and cache writes once and ignores incomplete rows', () => {
    const price = priceFor('Claude Code', 'claude-opus-5-5')!;
    expect(referenceCost([{input:1000, cache:600, cacheWrite:100, output:200}], price)).toEqual({usd:(300*4 + 600*.2 + 100*5 + 200*20)/1_000_000,count:1});
    expect(referenceCost([{input:1000, cache:null, cacheWrite:100, output:200}], price)).toBeNull();
  });
});
