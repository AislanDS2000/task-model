import {describe,expect,it} from 'vitest';import {metrics,recommendation} from './analytics';import type {Trial} from './types';
const base:Trial={id:'1',createdAt:'2026-01-01',model:'Luna',effort:'low',category:'Código',description:'x',complexity:2,outcome:'first',attempts:1};
describe('analytics',()=>{it('calcula métricas',()=>expect(metrics([base,{...base,id:'2',outcome:'failed',attempts:3}])).toEqual({success:50,first:50,attempts:2,total:2}));it('não recomenda com pouca evidência real',()=>expect(recommendation([{...base,demo:true}]).title).toContain('formando'))});
