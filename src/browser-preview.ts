// Explicit browser-only demo: never reads or modifies the desktop database.
if (new URLSearchParams(location.search).has('preview') && !window.taskModel) {
  let paused = false;
  const rows = [
    { provider:'Codex', id:'demo-1', title:'Trocar o título da página inicial', model:'gpt-6-luna', effort:'low', category:'Texto', input:12400, cache:10400, output:320, calls:2, outcome:'pending', updated:new Date().toISOString(), context:6200, contextLimit:128000, signal:{state:'completed',reason:'Codex encerrou a resposta. O funcionamento ainda não foi confirmado.'} },
    { provider:'Claude Code', id:'demo-2', title:'Ajustar o layout dos cards de comparação', model:'claude-demo-model', effort:'medium', category:'Interface', input:28600, cache:18000, output:2400, calls:5, outcome:'first', updated:new Date(Date.now()-3600000).toISOString(), context:12000, contextLimit:128000 },
  ];
  window.taskModel = {
    saveManual:async data=>{
      type Editable = (typeof rows)[number] & {originalModel?:string;manualModel?:string;origin?:string};
      if(data.id){const row=rows.find(r=>r.id===data.id) as Editable|undefined;if(!row)throw Error('Registro não encontrado');if(data.restore){row.model=row.originalModel || row.model;delete row.manualModel;}else{row.originalModel ||= row.model;row.model=data.model || row.model;row.manualModel=row.model;}return;}
      throw new Error('Prévia visual: o formulário está disponível; novos registros são salvos na versão desktop.');
    },
    snapshot:async () => ({rows:rows.map(r=>({...r})),groups:[],observations:rows.map(r=>({provider:r.provider,category:r.category,model:r.model,effort:r.effort,count:1,medianTokens:r.input+r.output,cacheRate:r.cache/r.input,positive:0,negative:0})),connected:true,paused,busy:false,error:'',lastScan:null,fileCount:0,categories:['Texto','Interface','Correção','Testes','Pesquisa','Outros'],quota:null}),
    connect:async()=>{}, pause:async()=>{paused=!paused;},
    evaluate:async(id,outcome,category)=>{const row=rows.find(r=>r.id===id);if(row){row.outcome=outcome;if(category)row.category=category;}},
    compact:async(value)=>{location.hash=value?'companion':'companion-full';},
    exportSkill:async()=>{throw new Error('Prévia visual: exporte a skill pelo aplicativo desktop.');},
    hide:async()=>{},minimize:async()=>{},
  };
}
