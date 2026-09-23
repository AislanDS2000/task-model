// Optional user-level Cursor hook. Does not read credentials or transcripts.
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
let input='';process.stdin.setEncoding('utf8');
process.stdin.on('data',chunk=>{input+=chunk;if(input.length>1048576)process.exit(0);});
process.stdin.on('end',()=>{try{
  const e=JSON.parse(input);if(e.hook_event_name!=='stop')return;
  const dir=path.join(os.homedir(),'.task-model','cursor');fs.mkdirSync(dir,{recursive:true});
  const safe={hook_event_name:'stop',conversation_id:e.conversation_id,generation_id:e.generation_id,model:e.model,model_id:e.model_id,status:e.status,timestamp:new Date().toISOString()};
  fs.appendFileSync(path.join(dir,'events.jsonl'),JSON.stringify(safe)+'\n');
}catch{}finally{process.stdout.write('{}');}});
