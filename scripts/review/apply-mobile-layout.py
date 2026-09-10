"""One-time, review-branch-only migration of the two scoped UI files.
Run by the review workflow, then removed. No network or production data access.
"""
from pathlib import Path
import subprocess

assert subprocess.check_output(['git','branch','--show-current'],text=True).strip() == 'codex/home-tv-family'
p=Path('.')
f=p/'src/components/feed/FeedHome.tsx';s=f.read_text()
assert 'ExpressionDrift' not in s
s=s.replace("import type { PublicFeedItem } from './feed-types';", "import type { PublicFeedItem } from './feed-types';\nimport { ExpressionDrift } from '@/components/campaign/ExpressionDrift';")
s=s.replace('          <WelcomeArt />\n        </header>','          <WelcomeArt />\n          <ExpressionDrift className={styles.mobileExpressions} />\n        </header>')
s=s.replace('        <footer className={styles.footer}>','        <div className={styles.mobileShareDock}>\n          <Link className={styles.primaryAction} href="/recognize">Share a recognition<Arrow diagonal /></Link>\n        </div>\n        <footer className={styles.footer}>')
f.write_text(s)
f=p/'src/components/feed/HomeExperience.module.css'
f.write_text(f.read_text()+'\n'+(p/'scripts/review/mobile-home.fragment.css').read_text())
f=p/'src/components/submission/SubmissionForm.tsx';s=f.read_text()
assert 'SubmissionExperience' not in s
s=s.replace("import styles from './SubmissionForm.module.css';", "import baseStyles from './SubmissionForm.module.css';\nimport experienceStyles from './SubmissionExperience.module.css';\nimport { ExpressionDrift } from '@/components/campaign/ExpressionDrift';\n\n// Retain existing bouquet and receipt animation classes.\nconst styles = { ...baseStyles, ...experienceStyles };")
a=s.index('function ExpressionScene(');b=s.index('\nfunction ExpressionCluster',a)
s=s[:a]+'''function ExpressionScene({ id }: { id: number }) {
  return (
    <span className={styles.expressionScene} data-testid="expression-scene" data-scene-id={id} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/home-art/icon${id}.webp`} width="56" height="56" alt="" draggable="false" />
    </span>
  );
}
'''+s[b:]
s=s.replace('  error,\n}: {\n  expression:', '  error,\n  disabled,\n}: {\n  expression:')
s=s.replace('  error?: string;\n}) {','  error?: string;\n  disabled?: boolean;\n}) {',1)
s=s.replace('        onClick={onToggle}\n','        onClick={onToggle}\n        disabled={disabled}\n',1)
a=s.index('function Header(');b=s.index('\nfunction ClosedState',a)
s=s[:a]+'''function Header() {
  return (
    <header className={styles.header}>
      <h1>{CAMPAIGN_TITLE}</h1>
      <h2 className={styles.pageTitle}>Share a<br className={styles.desktopBreak} /> recognition</h2>
      <p className={styles.tagline}>{CAMPAIGN_TAGLINE}</p>
      <ExpressionDrift className={styles.headerExpressions} />
      <div className={styles.headerArt} aria-hidden="true">
        <span />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home-art/community.webp" alt="" width="1000" height="340" draggable="false" />
      </div>
      <p className={styles.invitation}>A small word of encouragement.</p>
    </header>
  );
}
'''+s[b:]
s=s.replace("function Preview({ draft, onClose }: { draft: Draft; onClose: () => void }) {\n  const selected", "function Preview({ draft, onClose }: { draft: Draft; onClose: () => void }) {\n  const dialogRef = useRef<HTMLDialogElement>(null);\n  useEffect(() => {\n    const dialog = dialogRef.current;\n    dialog?.showModal();\n    return () => { if (dialog?.open) dialog.close(); };\n  }, []);\n  const selected")
s=s.replace('    <section className={styles.previewPanel} aria-labelledby="preview-title">','    <dialog ref={dialogRef} className={styles.previewPanel} aria-labelledby="preview-title" onCancel={onClose}>\n      <section role="region" aria-labelledby="preview-title">',1)
s=s.replace('    </section>\n  );\n}\n\nfunction Receipt','      </section>\n    </dialog>\n  );\n}\n\nfunction Receipt',1)
s=s.replace("  const held = status === 'held';\n\n  return (", "  const held = status === 'held';\n  const receiptRef = useRef<HTMLElement>(null);\n  useEffect(() => { receiptRef.current?.focus(); }, []);\n\n  return (",1)
s=s.replace('aria-labelledby="receipt-title" data-testid="submission-receipt">','aria-labelledby="receipt-title" data-testid="submission-receipt" ref={receiptRef} tabIndex={-1}>')
s=s.replace('  const [config, setConfig]', '  const [motionPaused, setMotionPaused] = useState(false);\n  const sendingRef = useRef(false);\n  const [config, setConfig]',1)
s=s.replace("if (viewState === 'sending') return;", "if (sendingRef.current || viewState === 'sending') return;")
s=s.replace("    setViewState('sending');\n\n    try", "    sendingRef.current = true;\n    setViewState('sending');\n\n    try")
s=s.replace('      setReceiptStatus(result.status);', "      // HTTP success alone is not confirmation of receipt or publication.\n      if (!result || typeof result.id !== 'string' || !result.id ||\n          !['published', 'held'].includes(result.status) ||\n          typeof result.expiresAt !== 'string' || !Number.isFinite(Date.parse(result.expiresAt))) {\n        throw new Error('We could not confirm the response.');\n      }\n      setShowPreview(false);\n      setReceiptStatus(result.status);")
s=s.replace("        setViewState('editing');\n      }\n    }\n  }\n\n  function resetForm", "        setViewState('editing');\n      }\n    } finally {\n      sendingRef.current = false;\n    }\n  }\n\n  function resetForm")
s=s.replace("window.scrollTo({ top: 0, behavior: 'smooth' });", "window.scrollTo({ top: 0, behavior: motionPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });")
s=s.replace('''    <main className={styles.page}>
      <DecorativeGarden />
      <div className={styles.shell}>
        <Header />
        <CompactPublicFeed />''','''    <main className={styles.page} data-submission-experience data-motion-paused={motionPaused}>
      <DecorativeGarden />
      <nav className={styles.topbar} aria-label="Recognition navigation">
        <Link className={styles.backLink} href="/"><span aria-hidden="true">←</span>Back to live recognitions</Link>
        <button className={styles.motionToggle} type="button" aria-pressed={motionPaused} onClick={() => setMotionPaused(value => !value)}>{motionPaused ? 'Resume animation' : 'Pause animation'}</button>
      </nav>
      <div className={styles.shell}>
        <Header />
        <div className={styles.formColumn}>
        <div className={styles.liveFeed}><CompactPublicFeed /></div>''')
s=s.replace('            <form className={styles.formCard} onSubmit={submit} noValidate>', '            <form className={styles.formCard} onSubmit={submit} noValidate aria-busy={viewState === \'sending\'}>\n              <div className={styles.sectionIntro}><span>01</span><h2>A kindness worth recognizing</h2></div>')
s=s.replace('              <div className={styles.formSection}>\n                <label className={styles.label} htmlFor="submitter">', '              <div className={styles.nameFields}>\n              <div className={styles.formSection}>\n                <label className={styles.label} htmlFor="submitter">',1)
s=s.replace('              <fieldset className={`${styles.formSection} ${styles.expressionFieldset}`}', '              </div>\n              <fieldset className={`${styles.formSection} ${styles.expressionFieldset}`}',1)
s=s.replace('<legend className={styles.label}>Which expression(s) did they practice?</legend>', '<legend className={styles.label}><span className={styles.sectionNumber}>02</span>Which expression(s) did they practice?</legend>')
s=s.replace('                      error={fieldErrors.expressions}\n', '                      error={fieldErrors.expressions}\n                      disabled={viewState === \'sending\'}\n')
s=s.replace('                  type="text"\n', '                  type="text"\n                  disabled={viewState === \'sending\'}\n')
s=s.replace('                  name="message"\n', '                  name="message"\n                  disabled={viewState === \'sending\'}\n')
s=s.replace('<label className={styles.label} htmlFor="message">Share your appreciation</label>', '<label className={styles.label} htmlFor="message"><span className={styles.sectionNumber} aria-hidden="true">03</span>Share your appreciation</label>')
s=s.replace('disabled={!draft.recipient.trim()', 'disabled={viewState === \'sending\' || !draft.recipient.trim()')
s=s.replace('      </div>\n    </main>\n  );\n}\n', '        </div>\n      </div>\n    </main>\n  );\n}\n')
f.write_text(s)
# Change only superseded visual expectations, retaining all functional tests.
f=p/'tests/feed/home-design.spec.ts';s=f.read_text()
s=s.replace("page.getByRole('link', { name: 'Read the sharing guide' })", "page.getByRole('link', { name: width <= 560 ? 'Sharing guide' : 'Read the sharing guide', exact: true })")
s=s.replace("['/recognize', '/expressions', '/privacy', '/admin/login', '/display']", "['/expressions', '/privacy', '/admin/login', '/display']")
f.write_text(s)
for name in ['tests/submission/plan08/submission-form-refresh.spec.ts','tests/interview/submission-experience.spec.ts']:
 f=p/name;s=f.read_text().replace('rgb(255, 128, 120)','rgb(255, 242, 200)')
 s=s.replace("expect(selectedStyles.transform).not.toBe('none');", "expect(selectedStyles.transform).toBe('none');")
 s=s.replace("toContain('rgba(168, 88, 66')", "toContain('rgba(150, 117, 40')")
 f.write_text(s)
(p/'scripts/review/mobile-home.fragment.css').unlink()
Path(__file__).unlink()
