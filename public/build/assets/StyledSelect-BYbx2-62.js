import{c as l}from"./createLucideIcon-CMJl856L.js";import{r as x,j as e}from"./app-ClejaeTb.js";/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],h=l("chevron-down",f);/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]],y=l("pen",m);function k({value:c,onChange:i,options:u=[],placeholder:a=null,icon:s=null,disabled:n=!1,className:d="",selectClassName:p="",...b}){const[o,t]=x.useState(!1);return e.jsxs("div",{className:`group relative inline-flex items-center rounded-2xl border transition-all duration-150 ${n?"opacity-60":"hover:shadow-sm"} ${d}`,style:{background:"#f3e4c9",borderColor:o?"#8b5e3c":"rgba(139,94,60,0.18)",boxShadow:o?"0 0 0 3px rgba(139,94,60,0.12)":void 0},children:[s&&e.jsx(s,{size:13,className:"pointer-events-none absolute left-3.5 shrink-0 transition-colors",style:{color:o?"#8b5e3c":"rgba(10,41,71,0.45)"}}),e.jsxs("select",{value:c??"",onChange:i,disabled:n,onFocus:()=>t(!0),onBlur:()=>t(!1),className:`w-full cursor-pointer appearance-none bg-transparent py-2 pr-9 text-xs font-black uppercase tracking-widest outline-none disabled:cursor-not-allowed ${s?"pl-9":"pl-4"} ${p}`,style:{color:"#0a2947"},...b,children:[a!==null&&e.jsx("option",{value:"",style:{background:"#f3e4c9",color:"#0a2947"},children:a}),u.map(r=>e.jsx("option",{value:r.value,style:{background:"#f3e4c9",color:"#0a2947"},children:r.label},r.value))]}),e.jsx(h,{size:14,className:`pointer-events-none absolute right-3 shrink-0 transition-transform duration-200 ${o?"rotate-180":""} group-hover:translate-y-[1px]`,style:{color:o?"#8b5e3c":"rgba(10,41,71,0.45)"}})]})}export{h as C,y as P,k as S};
