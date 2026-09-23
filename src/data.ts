import type {Effort,Model,Outcome,Store,Trial} from './types';
export const MODELS:Model[]=['Luna','Terra','Sol','Astra'];
export const EFFORTS:Effort[]=['none','low','medium','high','xhigh','max'];
export const CATEGORIES=['Código','Debug','Arquitetura','Pesquisa','Escrita','Análise de dados','Automação','Outro'];
export const OUTCOMES:Record<Outcome,string>={first:'Funcionou de primeira',adjusted:'Funcionou com ajustes',failed:'Não funcionou'};
export const MODEL_META:Record<Model,{tag:string;desc:string}>={Luna:{tag:'Ágil',desc:'Iterações rápidas e tarefas diretas'},Terra:{tag:'Equilíbrio',desc:'Trabalho cotidiano com bom alcance'},Sol:{tag:'Profundidade',desc:'Problemas exigentes e agentivos'},Astra:{tag:'Fronteira',desc:'Complexidade máxima e ampla ambição'}};
const key='model-compass:data:v1';
export const load=():Store=>{try{const v=localStorage.getItem(key);if(!v)return {version:1,trials:[]};const p=JSON.parse(v);return p.version===1&&Array.isArray(p.trials)?p:{version:1,trials:[]}}catch{return {version:1,trials:[]}}};
export const save=(s:Store)=>localStorage.setItem(key,JSON.stringify(s));
const ago=(days:number)=>new Date(Date.now()-days*864e5).toISOString();
export const DEMO:Trial[]=[
 {id:'demo-1',createdAt:ago(1),model:'Luna',effort:'low',category:'Código',description:'Ajustar estilos de um componente',complexity:2,outcome:'first',attempts:1,minutes:6,tokens:2100,notes:'Mudança pontual e bem especificada.',demo:true},
 {id:'demo-2',createdAt:ago(3),model:'Terra',effort:'medium',category:'Debug',description:'Encontrar causa de estado duplicado',complexity:3,outcome:'adjusted',attempts:2,minutes:22,tokens:7800,demo:true},
 {id:'demo-3',createdAt:ago(5),model:'Sol',effort:'high',category:'Arquitetura',description:'Planejar migração do módulo de filas',complexity:5,outcome:'first',attempts:1,minutes:31,tokens:14200,demo:true},
 {id:'demo-4',createdAt:ago(8),model:'Astra',effort:'xhigh',category:'Pesquisa',description:'Comparar abordagens para sincronização offline',complexity:5,outcome:'adjusted',attempts:2,minutes:48,tokens:24600,demo:true},
 {id:'demo-5',createdAt:ago(11),model:'Luna',effort:'none',category:'Debug',description:'Diagnosticar corrida assíncrona',complexity:4,outcome:'failed',attempts:3,minutes:27,tokens:9800,demo:true},
 {id:'demo-6',createdAt:ago(15),model:'Terra',effort:'high',category:'Automação',description:'Criar fluxo de validação e relatório',complexity:4,outcome:'first',attempts:1,minutes:18,tokens:9100,demo:true}
];
export function validTrial(v:any):v is Trial{return v&&typeof v.id==='string'&&MODELS.includes(v.model)&&EFFORTS.includes(v.effort)&&CATEGORIES.includes(v.category)&&typeof v.description==='string'&&[1,2,3,4,5].includes(Number(v.complexity))&&['first','adjusted','failed'].includes(v.outcome)&&Number(v.attempts)>=1}
