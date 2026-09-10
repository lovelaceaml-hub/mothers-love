from pathlib import Path
p=Path('tests/feed/home-design.spec.ts')
s=p.read_text()
marker='// Compare decoded pixels after the same settled state.'
assert marker in s
s=s[:s.index(marker)].replace("import sharp from 'sharp';\n",'')
s+='''// The approved color pass intentionally changes pixels on these routes.
// Preserve the stronger nonvisual contract: same complete text and geometry.
test('supporting routes preserve baseline content and geometry after color polish', async ({ browser }) => {
  test.skip(!process.env.HOME_BASELINE_URL, 'Baseline server is supplied by review CI.');
  const before = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const after = await browser.newPage({ baseURL: process.env.PLAYWRIGHT_BASE_URL, viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await before.clock.setFixedTime(new Date(serverTime));
  await after.clock.setFixedTime(new Date(serverTime));
  await mock(before); await mock(after);
  mkdirSync('home-review-evidence', { recursive: true });
  const checks = [];
  for (const route of ['/expressions', '/privacy', '/admin/login', '/display']) {
    await before.goto(process.env.HOME_BASELINE_URL! + route); await after.goto(route);
    for (const page of [before, after]) {
      if (['/expressions', '/privacy'].includes(route)) await expect(page.getByRole('button', { name: 'Like recognition for Avery', exact: true })).toBeEnabled();
      await page.evaluate(async () => { await document.fonts.ready; });
      await page.waitForTimeout(500);
    }
    const measure = (page: Page) => page.locator('h1,h2,h3,p,label,input,textarea,button,a').evaluateAll(els => els.filter(el => el.getBoundingClientRect().width > 0).map(el => {
      const r=el.getBoundingClientRect(); return { text:el.textContent, x:r.x,y:r.y,width:r.width,height:r.height };
    }));
    expect(await measure(after)).toEqual(await measure(before));
    checks.push({route, contentAndGeometryUnchanged:true});
  }
  writeFileSync('home-review-evidence/protected-routes.json', JSON.stringify(checks,null,2));
  await before.close(); await after.close();
});
'''
p.write_text(s)
Path(__file__).unlink()
