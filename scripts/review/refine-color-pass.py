from pathlib import Path
p=Path('src/app/expressions/expressions.module.css')
p.write_text(p.read_text()+'''

/* Readable expression identity surfaces, matched to the new catalog palette. */
.card1 { --guide-expression:#FF977C; }
.card2 { --guide-expression:#FFD05F; }
.card3 { --guide-expression:#FFAD69; }
.card4 { --guide-expression:#F582AF; }
.card5 { --guide-expression:#82B0ED; }
.card6 { --guide-expression:#CE927E; }
.card7 { --guide-expression:#B293E7; }
.card8 { --guide-expression:#EF7A96; }
.card9 { --guide-expression:#BE9CEB; }
.expressionCard { background:linear-gradient(125deg,color-mix(in srgb,var(--guide-expression) 26%,#FFFEFB),#FFFEFB 74%); box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--guide-expression) 60%,white),0 8px 18px #486B7D12; }
.expressionCard h3, .expressionCard .principle, .expressionCard .cardLabel, .expressionCard .example p { color:#2D463E; }
.cardNumber { background:color-mix(in srgb,var(--guide-expression) 58%,white); color:#293F45; box-shadow:inset 0 1px 0 #fffb; }
.example { background:#FFFEF9D9; border-color:color-mix(in srgb,var(--guide-expression) 40%,#D9DED3); }
.card9 { background:linear-gradient(130deg,#F0E6FA,#FFFEFB 65%,#FFE7DE); }
.content, .sourceCard { background:#FFFEFBF2; border-color:#D5E0D2; box-shadow:0 18px 48px #456F731C; }
''')
p=Path('tests/interview/submission-experience.spec.ts');s=p.read_text()
assert "expect(unselectedStyles.backgroundColor).toBe('rgb(255, 253, 246)');" in s
s=s.replace("expect(unselectedStyles.backgroundColor).toBe('rgb(255, 253, 246)');", "expect(unselectedStyles.backgroundImage).toContain('linear-gradient');")
s=s.replace("expect(unselectedStyles.backgroundImage).toBe('none');", "expect(unselectedStyles.backgroundImage).toContain('rgb(255, 254, 251)');")
s=s.replace('rgb(255, 242, 200)','rgb(255, 233, 164)').replace('rgba(150, 117, 40','rgba(164, 119, 34')
p.write_text(s)
p=Path('tests/submission/plan08/submission-form-refresh.spec.ts');s=p.read_text();assert 'rgb(255, 242, 200)' in s;p.write_text(s.replace('rgb(255, 242, 200)','rgb(255, 233, 164)'))
Path(__file__).unlink()
