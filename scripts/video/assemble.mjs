import { chromium } from '@playwright/test';
import QRCode from 'qrcode';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const FFPROBE = '/opt/homebrew/bin/ffprobe';
const TARGET_URL = 'https://mothers-love.vercel.app/recognize';

async function main() {
  // 1. Load inputs
  const narrationPath = resolve(ROOT, 'docs/video/narration.json');
  const clipsPath = resolve(ROOT, 'docs/private/video/clips/clips.json');
  const timingPath = resolve(ROOT, 'docs/private/video/audio/timing.json');
  const catalogPath = resolve(ROOT, 'src/lib/catalog.ts');

  const narration = JSON.parse(await readFile(narrationPath, 'utf8'));
  const clips = JSON.parse(await readFile(clipsPath, 'utf8'));
  const timing = JSON.parse(await readFile(timingPath, 'utf8'));
  const catalogSource = await readFile(catalogPath, 'utf8');

  const titleMatch = catalogSource.match(/CAMPAIGN_TITLE\s*=\s*"([^"]+)"/);
  const taglineMatch = catalogSource.match(/CAMPAIGN_TAGLINE\s*=\s*"([^"]+)"/);
  const CAMPAIGN_TITLE = titleMatch?.[1];
  const CAMPAIGN_TAGLINE = taglineMatch?.[1];

  if (!CAMPAIGN_TITLE) {
    console.error('Missing CAMPAIGN_TITLE from catalog.ts');
    process.exit(1);
  }
  if (!CAMPAIGN_TAGLINE) {
    console.error('Missing CAMPAIGN_TAGLINE from catalog.ts');
    process.exit(1);
  }
  if (!CAMPAIGN_TITLE.includes("'")) {
    console.error("CAMPAIGN_TITLE does not contain an apostrophe");
    process.exit(1);
  }
  if (!CAMPAIGN_TAGLINE.includes("'")) {
    console.error("CAMPAIGN_TAGLINE does not contain an apostrophe");
    process.exit(1);
  }
  if (!CAMPAIGN_TITLE.endsWith('LOVE')) {
    console.error('CAMPAIGN_TITLE does not end with "LOVE"');
    process.exit(1);
  }
  if (!CAMPAIGN_TAGLINE.endsWith('.')) {
    console.error('CAMPAIGN_TAGLINE does not end with a period');
    process.exit(1);
  }

  const GAP = Number(narration.gapSeconds ?? 0.8);
  const XFADE = 0.5;
  const LEAD = 0.4;
  const FPS = 30;

  const timeline = [];
  let accumulatedLength = 0;

  for (let idx = 0; idx < narration.beats.length; idx++) {
    const beat = narration.beats[idx];
    const i = idx + 1;
    const timingBeat = timing.beats.find(t => t.n === beat.n);
    if (!timingBeat) {
      throw new Error(`Missing timing entry for beat ${beat.n}`);
    }
    const audio_i = timingBeat.durationSeconds;
    let L_i = LEAD + audio_i + GAP + XFADE;
    if (i === 1) {
      L_i = Math.max(3 + XFADE, L_i);
    }
    if (i === 7) {
      L_i = Math.max(5 + XFADE, L_i);
    }

    const start_i = accumulatedLength - XFADE * (i - 1);
    const speech_i = start_i + LEAD;
    accumulatedLength += L_i;

    timeline.push({
      n: beat.n,
      slug: beat.slug,
      clip: beat.clip,
      start: start_i,
      length: L_i,
      speechStart: speech_i,
      audioSeconds: audio_i,
      timingFile: timingBeat.file,
      caption: beat.caption
    });
  }

  const totalLength = accumulatedLength - XFADE * 6;

  // Write timeline to assembly.json before rendering
  const outDir = resolve(ROOT, 'docs/private/video/out');
  await mkdir(outDir, { recursive: true });
  const assemblyPayload = {
    beats: timeline.map(b => ({
      n: b.n,
      slug: b.slug,
      start: Number(b.start.toFixed(3)),
      length: Number(b.length.toFixed(3)),
      speechStart: Number(b.speechStart.toFixed(3)),
      audioSeconds: Number(b.audioSeconds.toFixed(3))
    })),
    totalSeconds: Number(totalLength.toFixed(3))
  };
  await writeFile(resolve(outDir, 'assembly.json'), JSON.stringify(assemblyPayload, null, 2));

  // 2. Render cards with Playwright chromium
  const cardsHtmlPath = resolve(ROOT, 'scripts/video/cards.html');
  const cardsTemplate = await readFile(cardsHtmlPath, 'utf8');

  const qrDataUrl = await QRCode.toDataURL(TARGET_URL, {
    margin: 1,
    width: 640,
    color: { dark: '#303342', light: '#fffdf6' }
  });

  const browser = await chromium.launch({ headless: true });
  const variants = [
    { name: '16x9', width: 1920, height: 1080 },
    { name: '9x16', width: 1080, height: 1920 }
  ];

  for (const variant of variants) {
    const cardDir = resolve(ROOT, `docs/private/video/cards/${variant.name}`);
    await mkdir(cardDir, { recursive: true });

    const page = await browser.newPage({
      viewport: { width: variant.width, height: variant.height },
      deviceScaleFactor: 1
    });
    page.on('pageerror', err => console.error('Browser page error:', err));

    // Title card
    const titleData = {
      kind: 'title',
      width: variant.width,
      height: variant.height,
      title: CAMPAIGN_TITLE,
      tagline: CAMPAIGN_TAGLINE,
      lines: [],
      url: TARGET_URL,
      qrDataUrl: ''
    };
    await page.setContent(cardsTemplate.replace('__CARD_DATA__', () => JSON.stringify(titleData)), { waitUntil: 'load' });
    await page.screenshot({ path: resolve(cardDir, 'title.png') });

    // End card
    const beat7 = timeline.find(b => b.n === 7);
    const endData = {
      kind: 'end',
      width: variant.width,
      height: variant.height,
      title: '',
      tagline: '',
      lines: beat7.caption,
      url: TARGET_URL,
      qrDataUrl
    };
    await page.setContent(cardsTemplate.replace('__CARD_DATA__', () => JSON.stringify(endData)), { waitUntil: 'load' });
    await page.screenshot({ path: resolve(cardDir, 'end.png') });

    // Caption cards (1 through 7)
    for (const b of timeline) {
      const captionData = {
        kind: 'caption',
        width: variant.width,
        height: variant.height,
        title: '',
        tagline: '',
        lines: b.caption,
        url: TARGET_URL,
        qrDataUrl: ''
      };
      await page.setContent(cardsTemplate.replace('__CARD_DATA__', () => JSON.stringify(captionData)), { waitUntil: 'load' });
      await page.waitForSelector('#caption-panel', { timeout: 5000 });

      // Measure panel
      const rect = await page.evaluate(() => {
        const panel = document.getElementById('caption-panel');
        if (!panel) throw new Error('caption-panel not found');
        const r = panel.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      });

      if (rect.left < 40 || rect.top < 40 || rect.right > variant.width - 40 || rect.bottom > variant.height - 40) {
        throw new Error(`Caption panel margin violation for ${variant.name} beat ${b.n}: bounds [${rect.left}, ${rect.top}, ${rect.right}, ${rect.bottom}] in ${variant.width}x${variant.height}`);
      }

      await page.screenshot({
        path: resolve(cardDir, `caption-${b.n}.png`),
        omitBackground: true
      });
    }

    await page.close();
  }

  await browser.close();

  // Helper functions for file resolution
  function resolveAudio(b) {
    if (b.timingFile && existsSync(b.timingFile)) return b.timingFile;
    const local = resolve(ROOT, 'docs/private/video/audio', `${b.n}-${b.slug}.mp3`);
    if (existsSync(local)) return local;
    if (b.timingFile) {
      const byBase = resolve(ROOT, 'docs/private/video/audio', basename(b.timingFile));
      if (existsSync(byBase)) return byBase;
    }
    throw new Error(`Audio file not found for beat ${b.n}`);
  }

  function resolveClip(clip) {
    if (clip.file && existsSync(clip.file)) return clip.file;
    if (clip.file) {
      const byBase = resolve(ROOT, 'docs/private/video/clips', basename(clip.file));
      if (existsSync(byBase)) return byBase;
    }
    throw new Error(`Clip file not found for slug ${clip.slug}`);
  }

  // 3. Build silent video segments per beat per variant
  for (const variant of variants) {
    const workDir = resolve(ROOT, `docs/private/video/work/${variant.name}`);
    await mkdir(workDir, { recursive: true });

    for (const b of timeline) {
      const L_i = b.length;
      const segOut = resolve(workDir, `seg-${b.n}.mp4`);
      const cardDir = resolve(ROOT, `docs/private/video/cards/${variant.name}`);
      const captionPng = resolve(cardDir, `caption-${b.n}.png`);
      if (b.clip === 'card') {
        const cardPng = resolve(cardDir, b.n === 1 ? 'title.png' : 'end.png');
        const filter = `[0:v]scale=${variant.width}:${variant.height},fps=30[v]`;
        execFileSync(FFMPEG, [
          '-y',
          '-loop', '1',
          '-t', L_i.toFixed(3),
          '-i', cardPng,
          '-filter_complex', filter,
          '-map', '[v]',
          '-t', L_i.toFixed(3),
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '18',
          '-pix_fmt', 'yuv420p',
          '-r', '30',
          '-an',
          segOut
        ], { stdio: 'pipe' });
      } else if (variant.name === '16x9') {
        const clip = clips.find(c => c.n === b.n && c.variant === '16x9');
        if (!clip) throw new Error(`Missing 16x9 clip for beat ${b.n}`);
        const clipPath = resolveClip(clip);
        const available = clip.durationSeconds - clip.inSeconds;
        let baseFilter = 'scale=1920:1080,fps=30';
        if (available < L_i) {
          const deficit = L_i - available;
          baseFilter += `,tpad=stop_mode=clone:stop_duration=${(deficit + 0.5).toFixed(3)}`;
        }
        const filter = `[0:v]${baseFilter}[base];[base][1:v]overlay=enable='between(t,0.3,${(L_i - 0.3).toFixed(3)})'[v]`;
        execFileSync(FFMPEG, [
          '-y',
          '-ss', clip.inSeconds.toFixed(3),
          '-i', clipPath,
          '-loop', '1',
          '-t', L_i.toFixed(3),
          '-i', captionPng,
          '-filter_complex', filter,
          '-map', '[v]',
          '-t', L_i.toFixed(3),
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '18',
          '-pix_fmt', 'yuv420p',
          '-r', '30',
          '-an',
          segOut
        ], { stdio: 'pipe' });
      } else {
        // 9x16 route beat
        const clip9x16 = clips.find(c => c.n === b.n && c.variant === '9x16');
        if (clip9x16) {
          const clipPath = resolveClip(clip9x16);
          const available = clip9x16.durationSeconds - clip9x16.inSeconds;
          let baseFilter = 'scale=1080:1920,fps=30';
          if (available < L_i) {
            const deficit = L_i - available;
            baseFilter += `,tpad=stop_mode=clone:stop_duration=${(deficit + 0.5).toFixed(3)}`;
          }
          const filter = `[0:v]${baseFilter}[base];[base][1:v]overlay=enable='between(t,0.3,${(L_i - 0.3).toFixed(3)})'[v]`;
          execFileSync(FFMPEG, [
            '-y',
            '-ss', clip9x16.inSeconds.toFixed(3),
            '-i', clipPath,
            '-loop', '1',
            '-t', L_i.toFixed(3),
            '-i', captionPng,
            '-filter_complex', filter,
            '-map', '[v]',
            '-t', L_i.toFixed(3),
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '18',
            '-pix_fmt', 'yuv420p',
            '-r', '30',
            '-an',
            segOut
          ], { stdio: 'pipe' });
        } else {
          // TV beat on 9x16: scale desktop clip to 1080x608, overlay centered on 1080x1920 paper color
          const clipDesktop = clips.find(c => c.n === b.n && c.variant === '16x9');
          if (!clipDesktop) throw new Error(`Missing desktop clip for TV beat ${b.n}`);
          const clipPath = resolveClip(clipDesktop);
          const available = clipDesktop.durationSeconds - clipDesktop.inSeconds;
          let clipFilter = 'scale=1080:608,fps=30';
          if (available < L_i) {
            const deficit = L_i - available;
            clipFilter += `,tpad=stop_mode=clone:stop_duration=${(deficit + 0.5).toFixed(3)}`;
          }
          const filter = `[0:v]${clipFilter}[clip];[2:v][clip]overlay=x=0:y=656[fitted];[fitted][1:v]overlay=enable='between(t,0.3,${(L_i - 0.3).toFixed(3)})'[v]`;
          execFileSync(FFMPEG, [
            '-y',
            '-ss', clipDesktop.inSeconds.toFixed(3),
            '-i', clipPath,
            '-loop', '1',
            '-t', L_i.toFixed(3),
            '-i', captionPng,
            '-f', 'lavfi',
            '-i', `color=c=0xfffdf6:s=1080x1920:r=30:d=${L_i.toFixed(3)}`,
            '-filter_complex', filter,
            '-map', '[v]',
            '-t', L_i.toFixed(3),
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '18',
            '-pix_fmt', 'yuv420p',
            '-r', '30',
            '-an',
            segOut
          ], { stdio: 'pipe' });
        }
      }
    }
  }

  // 4. Calculate xfade offsets
  const offsets = [];
  let prevOffset = 0;
  for (let k = 1; k <= 6; k++) {
    if (k === 1) {
      prevOffset = timeline[0].length - 0.5;
    } else {
      prevOffset = prevOffset + timeline[k - 1].length - 0.5;
    }
    offsets.push(prevOffset);
  }

  const xfadeFilters = [];
  xfadeFilters.push(`[0:v][1:v]xfade=transition=fade:duration=0.5:offset=${offsets[0].toFixed(3)}[v1]`);
  for (let k = 2; k <= 6; k++) {
    const inPrev = `[v${k - 1}]`;
    const inNext = `[${k}:v]`;
    const out = (k === 6) ? '[v_out]' : `[v${k}]`;
    xfadeFilters.push(`${inPrev}${inNext}xfade=transition=fade:duration=0.5:offset=${offsets[k - 1].toFixed(3)}${out}`);
  }
  const xfadeFilterStr = xfadeFilters.join(';');

  // 5. Audio track
  const workCommon = resolve(ROOT, 'docs/private/video/work');
  await mkdir(workCommon, { recursive: true });
  const audioOut = resolve(workCommon, 'audio.wav');

  const audioArgs = ['-y'];
  for (const b of timeline) {
    audioArgs.push('-i', resolveAudio(b));
  }

  const musicPath = resolve(ROOT, 'docs/private/video/music/track.mp3');
  const hasMusic = existsSync(musicPath);
  if (!hasMusic) {
    console.log('music: none');
  } else {
    audioArgs.push('-stream_loop', '-1', '-i', musicPath);
  }

  const adelayFilters = [];
  for (let idx = 0; idx < timeline.length; idx++) {
    const b = timeline[idx];
    const delayMs = Math.round(b.speechStart * 1000);
    adelayFilters.push(`[${idx}:a]aformat=channel_layouts=stereo,adelay=${delayMs}|${delayMs}[d${idx}]`);
  }

  const mixInputs = timeline.map((_, idx) => `[d${idx}]`).join('');
  const filterSteps = [
    ...adelayFilters,
    `${mixInputs}amix=inputs=7:normalize=0:dropout_transition=0[narration_raw]`,
    `[narration_raw]loudnorm=I=-16:TP=-1.5:LRA=11[voice]`
  ];

  if (hasMusic) {
    const musicIdx = timeline.length;
    const fadeStart = Math.max(0, totalLength - 3);
    filterSteps.push(
      `[${musicIdx}:a]volume=-18dB,afade=t=out:st=${fadeStart.toFixed(3)}:d=3,atrim=0:${totalLength.toFixed(3)}[music_bed]`,
      `[voice][music_bed]amix=inputs=2:normalize=0:dropout_transition=0,apad,atrim=0:${totalLength.toFixed(3)}[aout]`
    );
  } else {
    filterSteps.push(`[voice]apad,atrim=0:${totalLength.toFixed(3)}[aout]`);
  }

  audioArgs.push(
    '-filter_complex', filterSteps.join(';'),
    '-map', '[aout]',
    '-t', totalLength.toFixed(3),
    audioOut
  );
  execFileSync(FFMPEG, audioArgs, { stdio: 'pipe' });

  // 6. Encode final files and contact sheets
  const sheetsDir = resolve(outDir, 'sheets');
  await mkdir(sheetsDir, { recursive: true });

  for (const variant of variants) {
    const finalMp4 = resolve(outDir, `mothers-love-commercial-${variant.name}.mp4`);
    const workDir = resolve(ROOT, `docs/private/video/work/${variant.name}`);

    const encodeArgs = ['-y'];
    for (let n = 1; n <= 7; n++) {
      encodeArgs.push('-i', resolve(workDir, `seg-${n}.mp4`));
    }
    encodeArgs.push('-i', audioOut);

    encodeArgs.push(
      '-filter_complex', xfadeFilterStr,
      '-map', '[v_out]',
      '-map', '7:a',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-c:a', 'aac',
      '-b:a', '160k',
      '-movflags', '+faststart',
      '-shortest',
      finalMp4
    );

    execFileSync(FFMPEG, encodeArgs, { stdio: 'pipe' });

    // Contact sheet
    const sheetPng = resolve(sheetsDir, `mothers-love-commercial-${variant.name}.png`);
    execFileSync(FFMPEG, [
      '-y',
      '-i', finalMp4,
      '-vf', `fps=12/${totalLength.toFixed(3)},scale=320:-1,tile=6x2`,
      '-frames:v', '1',
      sheetPng
    ], { stdio: 'pipe' });
  }

  // 7. Self-checks
  for (const exp of variants) {
    const mp4Path = resolve(outDir, `mothers-love-commercial-${exp.name}.mp4`);
    if (!existsSync(mp4Path)) {
      console.error(`Missing output file: ${mp4Path}`);
      process.exit(1);
    }

    const probeJson = execFileSync(FFPROBE, [
      '-v', 'error',
      '-show_streams',
      '-show_format',
      '-of', 'json',
      mp4Path
    ], { encoding: 'utf8' });

    const probe = JSON.parse(probeJson);
    const videoStreams = (probe.streams || []).filter(s => s.codec_type === 'video');
    const audioStreams = (probe.streams || []).filter(s => s.codec_type === 'audio');

    if (videoStreams.length !== 1 || audioStreams.length !== 1) {
      console.error(`Stream count mismatch in ${mp4Path}: video=${videoStreams.length} audio=${audioStreams.length}`);
      process.exit(1);
    }

    const v = videoStreams[0];
    const a = audioStreams[0];

    if (v.codec_name !== 'h264' || a.codec_name !== 'aac') {
      console.error(`Codec mismatch in ${mp4Path}: video=${v.codec_name} audio=${a.codec_name}`);
      process.exit(1);
    }

    if (v.width !== exp.width || v.height !== exp.height) {
      console.error(`Dimensions mismatch in ${mp4Path}: expected ${exp.width}x${exp.height}, got ${v.width}x${v.height}`);
      process.exit(1);
    }

    if (v.r_frame_rate !== '30/1') {
      console.error(`Frame rate mismatch in ${mp4Path}: expected 30/1, got ${v.r_frame_rate}`);
      process.exit(1);
    }

    const duration = parseFloat(probe.format.duration);
    if (duration < 60 || duration > 85) {
      console.error(`Duration out of bounds (60-85s): ${duration} in ${mp4Path}`);
      process.exit(1);
    }

    if (Math.abs(duration - totalLength) > 0.5) {
      console.error(`Duration ${duration} not within 0.5s of timeline ${totalLength} in ${mp4Path}`);
      process.exit(1);
    }

    // Clean decode check
    const decodeCheck = execFileSync(FFMPEG, [
      '-v', 'error',
      '-i', mp4Path,
      '-f', 'null',
      '-'
    ], { encoding: 'utf8' });

    if (decodeCheck.trim().length > 0) {
      console.error(`Decode errors in ${mp4Path}: ${decodeCheck}`);
      process.exit(1);
    }
  }

  // QR check
  const venvDir = resolve(ROOT, 'docs/private/video/.venv');
  const QR_PY = resolve(venvDir, 'bin/python');
  const QR_PIP = resolve(venvDir, 'bin/pip');

  if (!existsSync(QR_PY)) {
    execFileSync('/Library/Frameworks/Python.framework/Versions/3.13/bin/python3', [
      '-m', 'venv',
      venvDir
    ], { stdio: 'pipe' });
  }

  let cv2Ready = false;
  try {
    execFileSync(QR_PY, ['-c', 'import cv2'], { stdio: 'pipe' });
    cv2Ready = true;
  } catch {
    cv2Ready = false;
  }

  if (!cv2Ready) {
    execFileSync(QR_PIP, ['install', '--quiet', 'opencv-python-headless'], { stdio: 'inherit' });
  }

  const end16x9 = resolve(ROOT, 'docs/private/video/cards/16x9/end.png');
  const end9x16 = resolve(ROOT, 'docs/private/video/cards/9x16/end.png');

  const pyCode = [
    'import sys',
    'import cv2',
    'expected = "https://mothers-love.vercel.app/recognize"',
    'for path in sys.argv[1:]:',
    '    img = cv2.imread(path)',
    '    if img is None:',
    '        sys.exit(f"Failed to read {path}")',
    '    detector = cv2.QRCodeDetector()',
    '    val, pts, _ = detector.detectAndDecode(img)',
    '    if val != expected:',
    '        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)',
    '        val, pts, _ = detector.detectAndDecode(gray)',
    '        if val != expected:',
    '            sys.exit(f"QR decode mismatch for {path}: got \'{val}\', expected \'{expected}\'")'
  ].join('\n');

  execFileSync(QR_PY, ['-c', pyCode, end16x9, end9x16], { stdio: 'inherit' });

  // Dash check
  const DASH_REGEX = /[\u2013\u2014]/;
  for (const b of narration.beats) {
    for (const line of (b.caption || [])) {
      if (DASH_REGEX.test(line)) {
        console.error(`Dash detected in narration beat ${b.n} caption: ${line}`);
        process.exit(1);
      }
    }
  }

  for (const relFile of ['scripts/video/cards.html', 'scripts/video/assemble.mjs']) {
    const fullPath = resolve(ROOT, relFile);
    const content = readFileSync(fullPath, 'utf8');
    if (DASH_REGEX.test(content)) {
      console.error(`Dash detected in ${relFile}`);
      process.exit(1);
    }
  }

  // Print timeline
  for (const b of timeline) {
    console.log(`${b.n} ${b.slug}: start=${b.start.toFixed(3)} speechStart=${b.speechStart.toFixed(3)} length=${b.length.toFixed(3)}`);
  }

  console.log('QR OK');
  console.log('ASSEMBLE OK');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
