/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { syntheticSnapshot } from '../plan08/display-fixtures';
import { DISPLAY_SCREEN_IDS } from '../../src/lib/contracts';
const out='color-review-evidence';
const sampleNames=['Avery','Morgan','Jordan','Taylor','Casey','Robin','Jamie','Riley','Quinn'];
const sampleMessages=['Thank you for staying to help. Your kindness made the afternoon feel lighter.','You took the time to listen. Your patience meant so much.','You greeted me warmly and made room for me to join.'];
const rows=sampleNames.map((recipient,i)=>({id:`polish-synthetic-${i}`,recipient,message:sampleMessages[i%3],expressionIds:[i+1],firstPublishedAt:`2030-01-08T11:${String(59-i).padStart(2,'0')}:00.000Z`,expiresAt:'2030-01-15T11:00:00.000Z'}));
async function mock(page:Page){await page.route('**/api/**',r=>{const u=new URL(r.request().url());if(u.pathname==='/api/feed')return r.fulfill({json:{serverTime:'2030-01-08T12:00:00.000Z',items:rows}});if(u.pathname==='/api/config')return r.fulfill({json:{configured:true,collectionOpen:true}});if(u.pathname==='/api/reactions')return r.fulfill({json:{items:(u.searchParams.get('ids')?.split(',')??[]).map(id=>({id,count:4,liked:false}))}});return r.fulfill({status:503,json:{error:'Isolated synthetic review',code:'unavailable'}});});}
async function capture(page:Page,name:string,fullPage=false){mkdirSync(out,{recursive:true});await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>undefined)));});await page.screenshot({path:`${out}/${name}.png`,fullPage,animations:'disabled'});}
async function boxes(page:Page,selector:string){return page.locator(selector).evaluateAll(els=>els.filter(el=>el.getBoundingClientRect().width>0).map(el=>{const b=el.getBoundingClientRect();return {text:el.textContent,x:b.x,y:b.y,width:b.width,height:b.height};}));}
for(const [path,width,height,label] of [['/',390,844,'home-phone'],['/',1440,1000,'home-desktop'],['/recognize',390,844,'submission-phone'],['/recognize',1440,1000,'submission-desktop']] as const){
 test(`color-only geometry and contrast: ${label}`,async({page,browser})=>{
  await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});await mock(page);await page.goto(path);
  if(path==='/')await expect(page.locator('[data-recognition-id]')).toHaveCount(9);else await expect(page.getByLabel('Your name',{exact:true})).toBeVisible();
  const baseline=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});await mock(baseline);await baseline.goto(`http://127.0.0.1:3102${path}`);
  if(path==='/')await expect(baseline.locator('[data-recognition-id]')).toHaveCount(9);else await expect(baseline.getByLabel('Your name',{exact:true})).toBeVisible();
  const selector=path==='/'?'h1,h2,[data-recognition-id],a[href="/recognize"],#recent-recognitions':'h1,input,textarea,[data-testid^="expression-card-"],form';
  expect(await boxes(page,selector)).toEqual(await boxes(baseline,selector));expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  const axe=await new AxeBuilder({page:page as never}).analyze();expect(axe.violations).toEqual([]);
  await capture(page,label);await capture(baseline,`${label}-before`);
  if(path==='/recognize'){await page.getByTestId('expression-card-2').click();await page.getByTestId('expression-card-8').click();await capture(page,`${label}-full`,true);}
  await baseline.close();
 });
}
for(const id of DISPLAY_SCREEN_IDS){test(`actual app TV color scene: ${id}`,async({page})=>{
 await page.setViewportSize({width:1920,height:1080});await page.emulateMedia({reducedMotion:'reduce'});await mock(page);
 const snapshot=syntheticSnapshot({count:9,settings:{motion:'still',playlist:[{id,enabled:true}],sound:{enabled:false,volume:0,arrivalChime:false,milestoneChime:false}}});
 snapshot.recognitions=snapshot.recognitions.map((r,i)=>({...r,recipient:sampleNames[i],message:sampleMessages[i%3],expressionIds:[i+1],featured:id==='featured'}));snapshot.aggregate.expressionCounts=Array(9).fill(1);snapshot.aggregate.expressionTotal=9;
 if(id==='shared-expression')snapshot.recognitions.forEach(r=>{r.expressionIds=[...new Set([2,...r.expressionIds])];});
 await page.route('**/api/display/snapshot**',r=>r.fulfill({json:snapshot}));await page.goto('/display');const app=page.getByTestId('display-app');await expect(app).not.toHaveAttribute('data-screen','fallback');await expect(page.getByTestId('display-screen-heading')).toBeVisible();await page.waitForTimeout(500);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(1920);await capture(page,`app-tv-${id}`);
});}
test('supporting guides and sign in keep all content',async({page})=>{await page.setViewportSize({width:1440,height:1000});await mock(page);for(const [path,name] of [['/expressions','expression-guide'],['/privacy','sharing-guide'],['/admin/login','sign-in']]){await page.goto(path);await expect(page.getByRole('heading').first()).toBeVisible();await capture(page,name,true);}});
const sceneIds=[1,2,3,4,5,8,6,7,9,10,11];
for(const [index,id] of sceneIds.entries()){test(`V6 reference color screen ${index+1}`,async({page})=>{
 await page.setViewportSize({width:1920,height:1080});await page.goto(`http://127.0.0.1:3103/color-review-evidence/Mothers_Love_TV_Color_Polish.html?capture&still&screen=${id}`);await page.waitForFunction(()=>Boolean((window as any).preview));
 const state=await page.evaluate(()=>{const p=(window as any).preview;p.freeze(true);p.step(2000);p.draw();return {dwell:p.visualState().dwell,order:p.getState().order,colors:p.catalog.map((c:any)=>c.color)};});
 expect(state.dwell).toEqual({1:40,2:180,3:30,4:30,5:30,6:30,7:30,8:60,9:60,10:30,11:30});expect(new Set(state.colors).size).toBe(9);
 expect(await page.locator('.orb').evaluateAll(els=>els.every(el=>{const s=getComputedStyle(el);return s.borderRadius==='50%'&&Math.abs(parseFloat(s.width)-parseFloat(s.height))<.1}))).toBe(true);
 await capture(page,`v6-${String(index+1).padStart(2,'0')}`);writeFileSync(`${out}/v6-${index+1}-state.json`,JSON.stringify(state,null,2));
});}
test('V6 celebration styles and motion are preserved',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});await page.goto('http://127.0.0.1:3103/color-review-evidence/Mothers_Love_TV_Color_Polish.html?capture');await page.waitForFunction(()=>Boolean((window as any).preview));
 for(const n of [1,10]){const state=await page.evaluate(n=>{const p=(window as any).preview;p.reset();p.freeze(true);p.add(n);p.step(6500);p.draw();return {active:p.getState().active,single:p.visualState().singleStyles,group:p.visualState().groupStyles};},n);expect(state.single).toHaveLength(6);expect(state.group).toHaveLength(5);expect(state.active.ids).toHaveLength(n);await capture(page,`v6-arrival-${n}`);}
});
