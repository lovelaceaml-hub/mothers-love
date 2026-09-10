import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const base='df88a5db68feb2ba209a9753a7ca3ecad6b27f86';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'});
const paths=git('diff','--name-only',base,'HEAD','--','src').trim().split('\n').filter(Boolean);
const allowed=new Set(['color','background','background-image','background-color','border-color','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow','text-shadow','filter','opacity','outline-color','text-decoration-color']);
const records=[];
for(const path of paths){
 const next=readFileSync(path,'utf8');
 if(path==='src/styles/campaign-colors.css'){records.push({path,kind:'new presentation tokens'});continue;}
 const old=git('show',`${base}:${path}`);
 if(path==='src/lib/catalog.ts'){
  const strip=s=>s.replace(/color: "#[0-9A-Fa-f]{6}"/g,'color: "COLOR"');
  if(strip(old)!==strip(next))throw new Error(`Non-color catalog change: ${path}`);
  records.push({path,kind:'existing color values only; content and structure identical'});continue;
 }
 if(path==='src/app/layout.tsx'){
  if(next.replace('import "@/styles/campaign-colors.css";\n','')!==old)throw new Error('Unexpected layout change');
  records.push({path,kind:'stylesheet import only'});continue;
 }
 if(!path.endsWith('.css'))throw new Error(`Unexpected executable source change: ${path}`);
 if(!next.startsWith(old))throw new Error(`Existing stylesheet rules were modified: ${path}`);
 const added=next.slice(old.length);
 if(/@keyframes|animation\s*:|transition\s*:|transform\s*:|font\s*:/.test(added))throw new Error(`Non-color behavior declaration in ${path}`);
 const declarations=[...added.matchAll(/(?:[;{])\s*([\w-]+)\s*:/g)].map(m=>m[1]);
 for(const prop of declarations){if(!allowed.has(prop)&&!prop.startsWith('--'))throw new Error(`Nonvisual property ${prop} in ${path}`);}
 records.push({path,kind:'visual declarations appended; original rules and keyframes identical',declarations:declarations.length});
}
const original=readFileSync('prototypes/tv-v6/Mothers_Love_TV_Prototype_v6.html');
const hash=createHash('sha256').update(original).digest('hex');
if(hash!=='9fd625cea86eebd6d8cf342b375cb86b65bb9466ec49726d55e208f78707d45e')throw new Error('Original V6 changed');
mkdirSync('color-review-evidence',{recursive:true});
writeFileSync('color-review-evidence/source-boundary.json',JSON.stringify({baseline:base,reviewedCommit:git('rev-parse','HEAD').trim(),passed:true,sourceChanges:records,originalPrototypeSha256:hash,backendChanges:0,animationLogicChanges:0,layoutOrTypographyChanges:0},null,2));
console.log('PASS: color-only application source boundary, unchanged original animation rules and prototype.');
