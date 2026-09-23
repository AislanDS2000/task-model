import React, { useEffect, useState } from 'react';import{createRoot}from'react-dom/client';import App from './App';import Companion from './Companion';import'./styles.css';
import './browser-preview';
function Root() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => { const change = () => setHash(location.hash); addEventListener('hashchange', change); return () => removeEventListener('hashchange', change); }, []);
  const companion = hash.startsWith('#companion') || (!!window.taskModel && hash !== '#journal');
  return companion ? <Companion/> : <>{window.taskModel && <a href="#companion-full" style={{position:'fixed',bottom:12,right:20,zIndex:2000,background:'#6856df',color:'white',padding:'10px 16px',borderRadius:12,fontSize:12}}>Abrir acompanhamento local</a>}<App/></>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Root/></React.StrictMode>);
