import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ColorPolishRenderer } from '../../src/components/display/color-polish/renderer';

describe('TV study source boundary', () => {
  it('never selects the study document for a live source', () => {
    const html = renderToStaticMarkup(<ColorPolishRenderer snapshot={null} nowMs={0} status="unavailable" source="live" designStudy />);
    expect(html).toContain('src="/color-polish/renderer.html"');
    expect(html).not.toContain('/tv-pearl-study/renderer.html');
  });
  it('requires both explicit study selection and sample source', () => {
    const ordinary = renderToStaticMarkup(<ColorPolishRenderer snapshot={null} nowMs={0} status="unavailable" source="sample" />);
    const study = renderToStaticMarkup(<ColorPolishRenderer snapshot={null} nowMs={0} status="unavailable" source="sample" designStudy />);
    expect(ordinary).toContain('src="/color-polish/renderer.html"');
    expect(study).toContain('src="/tv-pearl-study/renderer.html"');
  });
});
