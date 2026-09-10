"""Finish two rendered-contrast fixes and update the modal keyboard regression.
The script removes itself and restores read-only verification permissions.
"""
from pathlib import Path
import subprocess
assert subprocess.check_output(['git','branch','--show-current'],text=True).strip() == 'codex/home-tv-family'
f=Path('src/components/submission/SubmissionExperience.module.css')
s=f.read_text(); assert '#85713a' in s and '#7b7a5c' in s
f.write_text(s.replace('#85713a','#685629').replace('#7b7a5c','#636348'))
f=Path('tests/submission/submission.spec.ts');s=f.read_text()
old="""  await page.keyboard.press('Escape');
  await expect(preview).toBeVisible();
  await page.getByRole('button', { name: 'Close public preview' }).focus();
  await expect(page.getByRole('button', { name: 'Close public preview' })).toBeFocused();"""
new="""  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Preview public message' })).toBeFocused();
  await page.getByRole('button', { name: 'Preview public message' }).click();
  await page.getByRole('button', { name: 'Close public preview' }).focus();
  await expect(page.getByRole('button', { name: 'Close public preview' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(preview).toHaveCount(0);"""
assert old in s;f.write_text(s.replace(old,new))
f=Path('.github/workflows/mobile-recognition-review.yml');s=f.read_text()
a=s.index('      - name: Apply final rendered fixes');b=s.index('      - uses: actions/setup-node@v4',a)
s=s[:a]+s[b:]
s=s.replace('  contents: write','  contents: read').replace('          fetch-depth: 0','          fetch-depth: 0\n          persist-credentials: false')
f.write_text(s)
Path(__file__).unlink()
