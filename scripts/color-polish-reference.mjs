import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const browser = await chromium.launch({headless:true});
const scenes = [[1,'welcome'],[2,'garden'],[4,'featured'],[5,'calendar'],[8,'peacemakers'],[6,'status'],[7,'expressions'],[9,'peace-in-practice'],[10,'orbit'],[11,'milestone']];
try {
 for(const width of [1920,3840]) {
  const page=await browser.newPage({viewport:{width,height:width*9/16}});
  await page.route('**/*',route => /^(file:|data:)/.test(route.request().url())?route.continue():route.abort());
  await page.addInitScript(()=>{let seed=7301;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};});
  await page.goto(`file://${root}/docs/design/color-polish-v6/approved.html?capture`);
  await page.evaluate(()=>window.preview.freeze(true));
  if(width===1920) await writeFile(`${root}/docs/design/color-polish-v6/fixtures.json`,JSON.stringify(await page.evaluate(()=>({records:window.preview.records(),state:window.preview.getState()})),null,2)+'\n');
  for(const [id,name] of scenes){
   await page.evaluate(id=>{window.preview.reset();window.preview.freeze(true);window.preview.go(id);window.preview.step(14000);},id);
   await page.locator('#tv').screenshot({path:`${root}/docs/design/color-polish-v6/references/${name}-${width}-14s.png`});
  }
  await page.close();
 }
 console.log('Captured 20 fictional scene references and source fixture.');
} finally {await browser.close();}
