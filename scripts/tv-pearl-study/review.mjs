import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const base=process.env.TV_STUDY_URL||'http://127.0.0.1:5679';
const out=process.env.TV_STUDY_EVIDENCE||'/private/tmp/tv-pearl-evidence';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const sourceSha=process.env.TV_STUDY_SOURCE_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const report={base,sourceSha,started:new Date().toISOString(),checks:[],errors:[],apiReads:[],captures:[]};
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const page=await context.newPage();
page.on('pageerror',e=>report.errors.push(e.message));
page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))report.apiReads.push(r.url());});
async function ready(){await page.locator('[data-ready=true]').waitFor(); const f=page.frames().find(f=>/\/tv-pearl-study\/renderer.html$/.test(f.url()));if(f)await f.locator('#stage .message').first().waitFor();return f;}
for(const view of ['current','design']){
  await page.goto(`${base}/display/tv-design-preview?view=${view}&capture=1`);
  await ready();
  const f=page.frames().find(f=>f.url().endsWith('/renderer.html'));
  await f.locator('#stage .message').first().waitFor();
  await f.evaluate(()=>{window.colorPolishRuntime.setPlaying(false);});
  await page.screenshot({path:path.join(out,`${view}-hd.png`)});
  report.captures.push(`${view}-hd.png`);
  const bounds=await f.locator('#stage .orb-slot').evaluateAll(els=>els.map(el=>{
    const r=el.getBoundingClientRect(),message=el.querySelector('.message'),m=message.getBoundingClientRect(),thanks=el.querySelector('.thanks').getBoundingClientRect(),name=el.querySelector('.recipient').getBoundingClientRect();
    return {width:r.width,height:r.height,messageSize:getComputedStyle(message).fontSize,messageInside:m.top>=r.top&&m.bottom<=r.bottom&&m.left>=r.left&&m.right<=r.right,thanksAboveName:thanks.bottom<=name.top+1};
  }));
  report.checks.push({name:`${view} HD bounds`,passed:bounds.every(x=>x.messageInside&&x.thanksAboveName),bounds});
  if(view==='design'){
    await page.setViewportSize({width:3840,height:2160});
    await page.screenshot({path:path.join(out,'design-4k.png')});report.captures.push('design-4k.png');
    await page.setViewportSize({width:1920,height:1080});
  }
}
await page.goto(`${base}/display/tv-design-preview`);await ready();
await page.getByRole('button',{name:'Pause motion'}).click();
await page.screenshot({path:path.join(out,'comparison.png'),fullPage:true});report.captures.push('comparison.png');
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:path.join(out,'phone-review.png'),fullPage:true});report.captures.push('phone-review.png');
report.checks.push({name:'Phone review controls fit',passed:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)});
await context.close();

const motion=await browser.newContext({viewport:{width:1440,height:1110},deviceScaleFactor:1,reducedMotion:'no-preference',recordVideo:{dir:out,size:{width:1440,height:1110}}});
const film=await motion.newPage();
film.on('pageerror',e=>report.errors.push(e.message));
film.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))report.apiReads.push(r.url());});
await film.goto(`${base}/display/tv-design-preview?view=design`);
await film.getByRole('button',{name:'Preview arrival'}).waitFor();
await film.locator('[data-ready=true]').waitFor();
const frame=film.frames().find(f=>f.url().endsWith('/tv-pearl-study/renderer.html'));
await frame.locator('#stage .message').first().waitFor();
const screen=await film.locator('iframe').boundingBox();report.videoCrop=screen;
const events=[];const began=Date.now();
await film.waitForTimeout(2000);
await film.getByRole('button',{name:'Preview arrival'}).click();
for(let i=0;i<80;i++){
  const s=await frame.evaluate(()=>window.colorPolishRuntime.getState());
  const phase=s.active?.phase||null;
  if(events.at(-1)?.phase!==phase)events.push({atMs:Date.now()-began,phase,state:s.active});
  if(phase==='reading'&&!report.arrivalStill){await frame.locator('.event-orb').first().waitFor();await film.screenshot({path:path.join(out,'arrival.png'),clip:screen});report.arrivalStill=true;}
  if(i>15&&events.some(e=>e.phase==='reading')&&!phase)break;
  await film.waitForTimeout(250);
}
await film.waitForTimeout(1800);
report.arrivalEvents=events;
report.checks.push({name:'Normal-speed director reaches reading and completion',passed:events.some(e=>e.phase==='reading')&&events.at(-1)?.phase===null});
await motion.close();report.video=await film.video().path();
await browser.close();
report.checks.push({name:'No page errors or app API reads',passed:report.errors.length===0&&report.apiReads.length===0});
report.finished=new Date().toISOString();
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({checks:report.checks,errors:report.errors,video:report.video,events},null,2));
if(report.checks.some(c=>!c.passed))process.exitCode=1;
