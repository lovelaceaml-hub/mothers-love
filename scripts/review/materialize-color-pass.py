from pathlib import Path
import re
root = Path.cwd()
source = root / 'scripts/review/color-materials.css'
if not source.exists():
    raise SystemExit('Color materials already committed.')
blocks = re.split(r'/\* TARGET: ([A-Za-z0-9/._-]+) \*/\n', source.read_text())
allowed = {'src/components/feed/HomeExperience.module.css','src/components/campaign/ExpressionDrift.module.css','src/components/submission/SubmissionExperience.module.css','src/components/display/DisplayExperience.module.css','src/components/display/garden/Garden.module.css','src/components/display/insights/DisplayInsights.module.css','src/components/display/teaching/TeachingScreens.module.css','src/app/expressions/expressions.module.css','src/app/privacy/privacy.module.css','src/components/admin/admin.module.css'}
assert set(blocks[1::2]) == allowed
for path, css in zip(blocks[1::2], blocks[2::2]):
    target = root / path
    assert '/* Reference-board color material pass. */' not in target.read_text()
    target.write_text(target.read_text()+'\n\n/* Reference-board color material pass. */\n'+css.strip()+'\n')
p = root/'src/lib/catalog.ts'
s = p.read_text()
old = ['#8ED6F5','#FFD86A','#FFAF70','#FF8E86','#EF747B','#CBB9F4','#CDEB76','#9DD99F','#A5C9FF']
new = ['#FF977C','#FFD05F','#FFAD69','#F582AF','#82B0ED','#CE927E','#B293E7','#EF7A96','#BE9CEB']
for a,b in zip(old,new):
    assert s.count(f'color: "{a}"') == 1
    s = s.replace(f'color: "{a}"', f'color: "{b}"')
p.write_text(s)
p = root/'src/app/layout.tsx'
s = p.read_text()
assert 'import "./globals.css";' in s
p.write_text(s.replace('import "./globals.css";', 'import "./globals.css";\nimport "@/styles/campaign-colors.css";'))
source.unlink()
Path(__file__).unlink()
print('Materialized only color, lighting and material styles; all behavior retained.')
