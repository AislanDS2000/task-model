export type Model='Luna'|'Terra'|'Sol'|'Astra';
export type Effort='none'|'low'|'medium'|'high'|'xhigh'|'max';
export type Outcome='first'|'adjusted'|'failed';
export interface Trial {id:string;createdAt:string;model:Model;effort:Effort;category:string;description:string;complexity:number;outcome:Outcome;attempts:number;minutes?:number;tokens?:number;notes?:string;demo?:boolean}
export interface Store {version:1;trials:Trial[]}
