import { useEffect, useRef, useState } from 'react';

export default function AnimatedNumber({value,format}:{value:number|null;format:(n:number|null)=>string}) {
  const [shown,setShown]=useState(value);
  const previous=useRef(value);
  useEffect(()=>{
    const from=previous.current;previous.current=value;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0;
    const finish=()=>{cancelAnimationFrame(frame);setShown(value);};
    if(value===null || from===null || value===from || document.hidden || reduced.matches){finish();return;}
    const start=performance.now();
    const tick=(now:number)=>{const t=Math.min(1,(now-start)/320);setShown(Math.round(from+(value-from)*(1-Math.pow(1-t,3))));if(t<1)frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);
    document.addEventListener('visibilitychange',finish);reduced.addEventListener('change',finish);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',finish);reduced.removeEventListener('change',finish);};
  },[value]);
  return <span aria-label={format(value)}><span aria-hidden="true">{format(shown)}</span></span>;
}
