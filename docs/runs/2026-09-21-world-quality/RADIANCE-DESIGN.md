# Radiance and finesse pass: design for Sections 6 to 8

Filed by Fable on 2026-09-22 from the read-only Plan agent's design, after Anthony raised the bar ("spectacular, jaw-dropping, amazing, smooth, finesse, radiant, glory. Do not hold back."). Study path only (`?source=sample&art=design`), gated by `isWorldDesignStudy()`; classic and cinematic stay byte-identical. Goal line unchanged.

## 0. Glow architecture decision

Keep the single MSAA main pass direct to screen, then render a "glow layer" (Layers bit 1) into a half-dimension HalfFloat target, blur it with a standalone `UnrealBloomPass` (threshold 0, `renderToScreen=false`), and composite additively with one `FullScreenQuad` that converts linear to sRGB. The pearl text face is never on the glow layer; a black occluder disc plus a quarter-res "protect" mask guarantee zero glow and zero god-ray light inside every visible pearl disc.

Evidence from three 0.180 sources (node_modules/three):

| Fact | Source | Consequence |
| --- | --- | --- |
| `render(renderer, writeBuffer, readBuffer)` reads only `readBuffer.texture`; `writeBuffer` unused; with `renderToScreen=false` it ends by additively blending the composite into `readBuffer` and leaves that target bound | examples/jsm/postprocessing/UnrealBloomPass.js L305, L360-365 | Drive it standalone: pass the glow target as both buffers, then `renderer.setRenderTarget(null)` yourself |
| `renderToScreen=true` clears and copies `readBuffer` over the screen | same L292-300 | Must stay false or it erases the main pass |
| Final composite of the 5 mips lands in `renderTargetsHorizontal[0]`; internal blend uses `CopyShader` with no color conversion | same L344-346; CopyShader.js L42-46 | Composite `bloom.renderTargetsHorizontal[0].texture` with our own quad; wrap in one accessor `bloomTexture()` |
| `setSize(w,h)` halves internally; `nMips=5`; 11 HalfFloat targets; 13 quad draws per frame | same L249-250, L101, L105-129 | `bloom.setSize(glowW, glowH)` in `resize()`; 13 calls appear in `info` |
| High-pass shader calls `luminance()`, defined in the program prefix | shaders/LuminosityHighPassShader.js; webgl/WebGLProgram.js L155 | Compiles in 0.180 (the chunk-level note in study-materials.ts is about chunks only) |
| `EffectComposer` allocates two full-buffer HalfFloat targets, no MSAA, needs an `OutputPass` that tone maps everything | EffectComposer.js L69; OutputPass.js | Not used; the standalone route keeps canvas MSAA and never touches the main image |
| `FullScreenQuad.render` calls `renderer.render(mesh, camera)`; `render()` calls `info.reset()` when `info.autoReset` is true | Pass.js L166-170; WebGLRenderer.js L1612 | Study sets `renderer.info.autoReset=false` and calls `info.reset()` once per presented frame |
| Rendering into any target uses `NoToneMapping` and linear output | webgl/WebGLPrograms.js L165-171, L202 | Glow target is linear HDR; composite quad includes `<colorspace_fragment>` before additive blend |
| Lights are layer tested; `render()` resets `_currentMaterialId` so uniforms re-upload every pass; `material.allowOverride` exempts one object from `scene.overrideMaterial` | WebGLRenderer.js L1314, L1332, L1678, L1987; Material.js L436 | Glow camera on layer 1 sees no lights and runs no shadow pass; a shared `studyGlowPass` uniform flips per pass with no recompile; the god-ray mask is one render call |
| Points `scale = canvasHeight * .5` regardless of target | webgl/WebGLMaterials.js L297; renderer L2534 | Sparkle points draw at twice their relative size in the half-size glow target: free soft halos; damp with `gl_PointSize *= mix(1., .6, studyGlowPass)` if bloated |
| `background === null` clears with the renderer clear color | webgl/WebGLBackground.js L49-51 | Set `scene.background=null` and `setClearColor(0,0)` for the aux passes; restore after |

Hand-rolled alternative rejected: a 2-mip separable Gaussian saves 8 draw calls but loses the wide soft tails. Fallback if the call ceiling binds: 2 mips of the same `_getSeparableBlurMaterial` shader (5 quads).

### Per-frame sequence (`StudyRadiance.render`, replaces the single `renderer.render` in `tick()`)

1. `info.reset()`; `setRenderTarget(null)`; main render, camera layer 0, MSAA, NeutralToneMapping.
2. Glow: `scene.background=null`; `fog.color` to black (uniform only); `studyGlowPass.value=1`; `camera.layers.set(1)`; `setClearColor(0,0)`; render into `glowRT`.
3. Protect: `camera.layers.set(3)`; `scene.overrideMaterial=whiteBasic`; render into `protectRT` (only pearl occluder discs live on layer 3).
4. Rays mask (only if `sunWeight>0`): `camera.layers.set(2)`; `scene.overrideMaterial=blackBasic({fog:false, opacity:0})`; the rays sun sprite has `allowOverride=false`; render into `maskRT`.
5. Restore: `camera.layers.set(0)`, background, fog color, `overrideMaterial=null`, `studyGlowPass.value=0`, clear color.
6. `bloom.render(renderer, glowRT, glowRT, 0, false)`.
7. Radial blur quad into `raysRT` (if sun visible).
8. `setRenderTarget(null)`; composite quad, `AdditiveBlending`, `depthTest:false`, `depthWrite:false`: `out = (bloom * glowTint * glowStrength + rays * rayTint * rayStrength * sunWeight) * (1 - protect)`, then `#include <colorspace_fragment>`.
9. `frameCount++`, `windowFrames++`, `dirty=false` exactly as today, so `data-frames` still counts presented frames and every still frame includes glow.

Sizing: `glowRT = min(1920, round(bufferW/2))` by aspect, HalfFloat RGBA, depth buffer on; `protectRT`, `maskRT`, `raysRT` at half of that. `resize()` calls `radiance.resize(renderer.getDrawingBufferSize())`. Memory at 4K High about 60 MB; 1080p Auto about 15 MB. Gate creation on `renderer.extensions.has("EXT_color_buffer_float")`; otherwise today's single pass.

## Section 6: Radiance (glow, god rays, living air)

Prerequisite: Sections 4 and 5 landed. Writer budget about 2 hours.

### Files and functions
- New `prototype/study-radiance.ts`: `class StudyRadiance { constructor(renderer, scene); resize(size); setTier(tier); render(scene, camera); dispose() }` plus pure helpers `glowTargetSize(w,h)`, `sunScreenWeight(ndc, facing)`, `bloomTexture(pass)`.
- `prototype/study-materials.ts`: shared uniforms `STUDY_GLOW_PASS = {value:0}` and `STUDY_SUN_VIEW = {value: new Vector3(1,0,0)}`; new `studyGlow(material, key, colorGlsl, alphaGlsl?)` chaining `onBeforeCompile` like `studyRim`, injecting before `#include <opaque_fragment>`: `outgoingLight = mix(outgoingLight, (COLOR), studyGlowPass); diffuseColor.a = mix(diffuseColor.a, (ALPHA), studyGlowPass);`, key `${previous}|study-glow-${key}`. Add `rate` and `calm` to `sparklePoints` (key `study-sparkle-v2`).
- `prototype/design-mode.ts`: `studyRadiance(query)` returning false for `?radiance=off` (A/B captures and the text-parity check).
- `world-engine.ts` study block only: construct radiance after `studyEnvironment`; `renderer.info.autoReset=false`; `present()` at the render site; `resize()` hook; `dispose()` hook; `report()` unchanged.
- `prototype/design-world.ts`: layer flags after `batch()` (by material identity); rays sun sprite; sky glow band; living air objects; `studyGlow` on waterfalls (crest only, via a `glowPass` branch in the `fall` shader).
- `prototype/pearl-skin.ts`: occluder disc; layer flags; `studyGlow` on `studyGlass` (rim only, alpha `pearlRim*.9`) and on the skin's `gold` (medallion rims).
- `prototype/arrival-stages.ts`: `layers.enable(1)` on bloom `halo`, `core`, `beam`; ribbon `glowSprite`; constellation `lights`, `glow`, `flash`; `studyGlow(studySilk, "silk", "vec3(1.,.80,.88)*silkF*.55", "silkF*.6")`.
- New `prototype/study-air.ts`: pure layouts `petalField(seed, count)`, `moteCloud(seed, count)`, `skyStars(seed, count)`, `butterflyRoutes()`; builders take the registrars.
- Tests: new `tests/world/study-radiance.test.ts`, `tests/world/study-air.test.ts`; extend `design-mode.test.ts`.

### Glow layer membership (Layers bit 1, keep bit 0 unless noted)
- Sun halo sprites (both); new sky glow band sprite, layer 1 only, scale 420x140, `#ffd9b8`, opacity .14, at the sun position.
- Pearl: halo plane, sparkles, shell (rim only via `studyGlow`), medallion rims and medallion glass; never the face, rings, orbits, icons or tint discs.
- Occluder disc per slot: `CircleGeometry(1,64)`, `MeshBasicMaterial({color:0, fog:false})`, `layers.set(1); layers.enable(3)`, child of `slot.root` at z 0, `renderOrder 1`; writes depth in the glow pass and white in the protect pass; visibility follows `slot.root.visible`.
- Arrival stages as listed; waterfall crests via the `glowPass` branch: `gl_FragColor = vec4(vec3(1.,.97,.9)*crest*edge*fade*.8, 1.)`.
- Section 7 adds gold, heart, water glitter, lanterns, bead, glints, heart sparkles, water halo.

### God rays (screen-space radial blur)
- Rays sun sprite: layer 2 only, `allowOverride=false`, softDot 64, `#ffe9cc`, opacity 1, scale 64, at `STUDY_SUN.direction * 330`.
- Occluders on layer 2 (keep 0): merged ivory, stone and edge meshes per district, the merged bridge deck, the entry terrace. Cotton crowns excluded.
- `sunScreenWeight`: project the sun world point; weight 0 if `cameraForward.dot(sunDir) <= 0`; else `1 - smoothstep(1.0, 1.35, max(|ndc.x|, |ndc.y|))`. Skip passes 4 and 7 when 0.
- Radial blur `ShaderMaterial` with `defines.SAMPLES` 48 (High) or 32 (Auto): `step=(uv-sun)/SAMPLES*density; illum=1; loop: uv-=step; sum+=tex(uv).rgb*illum*weight; illum*=decay`. Start values: density .92, decay .968, weight .045, exposure .32. Composite: `rayTint #ffe3c2`, `rayStrength .5`.

### Living air (each one draw call)
- Petals: `InstancedMesh(farPetal, petalField material, 560)`, seeded 3313; per instance attribute `petalSeed vec4(phase, fallSpeed .25 to .55, spinRate .4 to 1.2, spanY 10 to 16)`; base position radius 3 to 16 around each zone center, y 2 to 18, size .35 to .7; tints `#f7b8cc #fbd3dc #e9a7c4` via instance color. Material `MeshPhysicalMaterial({vertexColors, sheen 1, sheenColor #fff0df, roughness .4, side DoubleSide})` plus `studyRim("#fff0e0", 2.5, .3)`, patched: tumble in `<begin_vertex>` and `<beginnormal_vertex>` (Rodrigues about the per-instance axis), world drift after `instanceMatrix` in a replaced `<project_vertex>`, distance fade `transformed *= 1 - smoothstep(55., 85., viewDistance)`. Opaque, `frustumCulled=false`, no shadows, key `study-petal-field-v1`. Trail-class.
- Motes: `Points(200)`, seeded 611, 24-unit cube wrapped around a `moteCenter` uniform set to the camera position each frame, size .09, `#fff3dc`, opacity .38, additive, layers 0 and 1. Sparkle-class.
- Stars: `Points(300)` on radius 380, y above .3, seeded 913, `sparklePoints(time, 3.2, "#fff6e6", .55, dot, rate .7)`, `material.fog=false`, layers 0 and 1. Sparkle-class.
- Butterflies: 8 (16 `farPetal` instances), opaque copy of the ribbon wing material, Lissajous routes over the Garden, Sanctuary and Expressions flower beds (radius 3 to 5, height .9 to 2.4 above terrace), flap 6 Hz, CPU matrices. Trail-class.

### Cost and tiers
- Adds per presented frame: glow pass about 30 calls at Garden, protect 10, rays mask about 25, bloom 13, rays blur 1, composite 1; main pass plus 4 (air).
- High: all on, glow half dims capped 1920 wide, 48 samples. Auto: all on, 32 samples, `glowStrength .45`. Low (explicit or auto-lowered): radiance skipped, petals `count=160`, motes hidden, stars on.
- Reduced motion and Still: shaders read the frozen `time` uniform, rays depend only on the camera; one presented frame is complete and static.

### Verification and checkpoint
- typecheck; `npx vitest run tests/world`; build; harness stills, quality and tour with output `s6`; `cmp` of classic and cinematic captures against the Drive D1 folder.
- Text parity: capture Garden with and without `&radiance=off` and compare the pearl disc interior (identical pixels except the bilinear edge).
- Checkpoint: Garden 1920x1080 and 4K beside `01_Recognition_Pearl_Target.jpeg`; `arrival-bloom.png` for the beam glow.

## Section 7: Finesse (water, pearl, heart, architecture)

Writer budget about 2 hours. Uses `studyGlow` and the shared uniforms from Section 6.

### Water glory
- Mirrored sky: `water.envMapIntensity 1.35`, `metalness .22`, keep Section 5's `#8fd3d6`, roughness .12, clearcoat .85.
- Glitter into the glow layer: water `layers.enable(1)`, `studyGlow(water, "glitter", "vec3(1.,.93,.78) * pow(max(0., dot(reflect(-normalize(vViewPosition), normal), studySunView)), 320.) * .6")`.
- Halo under the focal pearl: `class StudyWaterHalo` in new `prototype/study-glory.ts`, one `PlaneGeometry` at y -4.97, scale 9 by 14 stretched toward the camera, the pearl halo shader plus a vertical streak `exp(-abs(u-.5)*6.)`, opacity .3, additive, layers 0 and 1; `WorldRecognitionBubbles` constructs it when `designStudy` and calls `update(focused position, camera, time)`; opacity lerps with tau .6 s.
- Caustics on undersides: chain onto Section 5's `stone`: `vWorldPosition` varying, band `wl = smoothstep(-5.9,-3.2,localY)*(1.-smoothstep(-2.6,-1.4,localY))`, `caustic = pow(saturate(n(p.xz*.55 + t*.06) * n(p.xz*.9 - t*.045) * 2.2), 2.5)`, `outgoingLight += vec3(.55,.88,.92) * caustic * wl * .45`. Key `study-stone-caustic-v1`.

### Pearl finesse
- Internal caustic in the finishing shader: rotated 2D value noise, gated to `smoothstep(.84,.90,r)*(1.-smoothstep(.96,1.,r))` (outermost text pixel sits at r .81); alpha plus `.07`, color toward `#fff8e6`.
- Breathing halo: `breath = .85 + .15*(.5+.5*sin(time*1.0472))` inside the halo shader (6 s period).
- Ring shimmer bead: `Points(5)` with `sparklePoints(clock, .10, "#fff1c8", .95, dot)`, head at `a = time*.42` on orbit lane 0 plus 4 trailing points at `a - k*.06`, `applyAxisAngle(orbitAxis, .38)`, layers 0 and 1. Sparkle-class.
- Medallion glints: one sprite per medallion (softDot 32, scale .16, `#fffaf0`, additive), local (.07,.09,.12), `opacity = pow(max(0., sin(time*.55 + id*1.3)), 30.)*.9`, layers 0 and 1. Sparkle-class.
- Sun-side rim: `studyGlass` v2 with `uniform vec3 pearlSunView = STUDY_SUN_VIEW`; `pearlTint = mix(pearlTint, vec3(1.,.87,.60), smoothstep(-.1,.8, dot(normal, pearlSunView))*.6)`; `StudyRadiance` sets `STUDY_SUN_VIEW` from `STUDY_SUN.direction` transformed by `camera.matrixWorldInverse` once per frame. Key `study-glass-v2-${opacity}`.

### Heart glory
- Pulse: `rose.emissive.set("#ff5a86")`; `rose.emissiveIntensity = .05 + .13*(.5+.5*sin(t*1.2566))` (5 s); mirror into a `studyHeartPulse` uniform.
- Glow: GLB meshes `layers.enable(1)` in the loader callback; `studyGlow(rose, "heart", "vec3(1.,.36,.53)*studyHeartPulse*1.4 + vec3(1.,.72,.80)*pow(1.-saturate(dot(normalize(normal),normalize(vViewPosition))),2.5)*.35")`.
- Halo: sprite child of `heartRoot`, layer 1 only, local scale 5.2, `#ffb3c6`, opacity .30, local (0,0,-.3).
- 12 orbiting sparkles: `Points(12)` `sparklePoints(time, .42, "#fff0d8", .9, dot)`, two tilted rings r 5.4 and 6.6 around (0, 8.7, 0), rates .18 and -.14 rad/s, bob .8, layers 0 and 1. Sparkle-class.

### Architecture at dusk
- Gold: `gold.emissive.set("#ffcc7a")`, `emissiveIntensity = .12 + .06*(.5+.5*sin(t*.31))`; merged gold meshes `layers.enable(1)`; `studyGlow(gold, "gold", "vec3(1.,.80,.48)*(.22 + .5*saturate(dot(normalize(normal), studySunView)))")`.
- Merges: all 26 rail tubes into one mesh, all 31 waterfall planes into one (`depthWrite:false` so order is harmless), the 13 bridge decks into one. Merge before `batch()`; merged meshes get layers 1 (gold) or 2 (deck).
- Lanterns: `Points(about 290)` from `lanternLayout(rails, arches)`: every 6th rail sample raised .35, plus each arch keystone; plain `PointsMaterial` softDot, size .55, `#ffd9a0`, opacity .9, additive, layers 0 and 1. Steady light, one draw.

### Verification and checkpoint
- Same command set with output `s7`; parity `cmp`; pearl-skin tests extended (bead and glints hidden when `sparkles=false`, occluder on layers 1 and 3 only, face never on layer 1).
- Checkpoint: Sanctuary still beside the D1 `design-heart.png`; Garden 4K crop of the pearl rim, bead and a glint; `phone-garden.png`.

## Section 8: Smoothness and performance

Writer budget about 2 hours.

### Camera finesse: keep `camera-director.ts` untouched, post-process in the study
- New `prototype/camera-finesse.ts`: `class StudyCameraFinesse { apply(camera, input: {dt, moving, traveling, arrivalPhase, position, target, elapsed}) }`, pure Three math, node-testable.
- Identity rule: when `!moving` (paused, reduced motion, Still) copy the director pose exactly and reset state, so every still capture frames as today.
- Look-at lag: `lagTarget += (target - lagTarget) * (1 - exp(-dt * .9))` (tau 1.1 s; 2.5 during `reading`).
- Breathing dolly: `forward * .10 * sin(elapsed*.70) + up * .04 * sin(elapsed*.47)`; halved while an arrival is active.
- Roll: yaw rate from successive forward vectors; `rollTarget = clamp(-yawRate*.30, -1.5deg, 1.5deg)` smoothed with tau .4 s; applied as `camera.rotateZ(roll)` after `lookAt`; capped at .8 deg during arrivals.
- Anticipation: on the `traveling` rising edge, `forward * -.45 * sin(pi * clamp(age/1.2, 0, 1))`. Settle: on the falling edge, `forward * .28 * exp(-1.9*age) * sin(2.4*age)`.
- Engine hook after the director pose, gated: `finesse.apply(...)`, then `updateMatrixWorld()`; `report()` keeps `director.position` so `data-camera-position` is unchanged.
- Optional director change: one public field `ease: (t:number)=>number = smoothstep` on `CameraDirector`; the engine sets `director.ease = easeInOutCubic` under the study gate. Default behavior and camera-director tests unaffected.

### Transitions
- Exposure envelope `studyMood`: target 1.0 parked, .94 traveling, .93 during arrival `approach`; on the `reveal` to `reading` edge add `flourish(t) = .08 * (t<1 ? smoothstep(t) : 1 - smoothstep((t-1)/3))`; smoothed with tau .9 s; frozen at 1.0 when `!moving`.
- Applied three ways, never to the text: `renderer.toneMappingExposure = STUDY_TONE.exposure * value`; a shared `studyExposure` uniform multiplied into the sky and cloud fragment outputs; `radiance.glowStrength *= .9 + .1*value`.
- Haze during travel: `fog.far` 250 to 215 and `fog.near` 22 to 18, lerped with the same tau; sun halo sprites scale times `1 + .12*travel`.
- Hush: `scene.userData.studyHush` 0 to 1 over the approach; `recede()` uses resident opacity `.9 - .12*hush`; `sparklePoints` `calm` uniform drops twinkle amplitude .65 to .25 and rate by half; all bloom back over 3 s after reading begins.

### Performance tiers and budget
- Tier resolver in the engine: High (`quality==="high"`), Auto (`auto` and not lowered), Low (`low` or lowered); `resize()` calls `radiance.setTier`, sets `scene.userData.lowTier`, and on Low resizes the sun shadow to 1024.
- Shadow cadence: `renderer.shadowMap.autoUpdate=false`; `needsUpdate=true` on every 6th moving frame and on every non-moving dirty render. Only the heart bobs.
- Main-pass draw-call polish: pearl beads into 2 `InstancedMesh`, grove bead and torus into 2 instanced meshes, shared skin and hair materials across figures.
- Auto drop order if `lowered` flips: rays off, glow off, petals 160, motes off, shadow 1024, pixel budget 1.05M. The existing 3-window under-25-fps rule stays the only trigger.

Frame budget (estimates, to be replaced by measurements; per presented frame):

| Pass | 3840x2160 High, TV-class GPU | 1920x1080 Auto, good laptop |
| --- | --- | --- |
| Main pass (opaque, transparent, PCFSoft) | 15 to 19 ms | 4 to 6 ms |
| Shadow map 2048, 1 frame in 6 | .4 ms amortized | .2 ms |
| Glow pass | .9 ms | .3 ms |
| Protect and rays mask | .8 ms | .3 ms |
| Bloom, 13 quads | .8 ms | .3 ms |
| Rays blur | .5 ms | .2 ms |
| Composite | .6 ms | .15 ms |
| Living air | .3 ms | .2 ms |
| Total | about 20 to 24 ms (30 FPS needs 33.3) | about 6 to 8 ms (60 FPS needs 16.7) |

Draw-call accounting, paused Garden, High, worst-case frame with shadow pass (today 385 calls, 1.2M triangles): merges and instancing -97, new main objects +11, glow about 41, protect 10, rays mask about 25, bloom 13, rays blur 1, composite 1, total about 390. Triangles about 1.6M on a shadow frame and about 1.1M otherwise; first lever if over is cotton `SphereGeometry(18,12)` to `(14,10)`.

### Measurement
- Quality mode: keep the 120 RAF interval sample at 1920x1080 High; add the same at 3840x2160 High and at Low; record `renderingDetails` after each; report median, p95 and the fraction of intervals above 33.3 ms.
- With `info.autoReset` false in the study, `calls` and `triangles` sum every pass of the presented frame; record that meaning.
- Software runs remain functional evidence only; the TV number comes from Anthony's 10 minute check in the promotion plan, where the world page should default to `auto`.

### Verification and checkpoint
- Tests: `camera-finesse.test.ts` (identity when still, offsets under .6 units and 1.5 deg, converges within 4 s of travel end, deterministic), envelope table for `flourish`, tier resolver table. Full command set with output `s8`; parity `cmp`.
- Tour recording reviewed for the anticipation, roll and settle by eye; Garden to Sanctuary exposure dip visible in the video.
- Checkpoint: quality report numbers against the table; 4K Garden capture.

## Hard-constraint map
- Classic and cinematic: every change sits in `prototype/*`, under `isWorldDesignStudy()` in `world-engine.ts` and `designStudy` in `world-recognitions.ts`, or behind a director field defaulting to `smoothstep`; parity proven by `cmp`.
- Text: face material untouched (`toneMapped:false`, `depthWrite:true`), never on layer 1, composite multiplies by `(1 - protect)`; caustic gated outside r .84.
- Privacy: the glow, protect and mask targets contain only occluder discs, sprites, points and scenery; the face never renders into any target; `?radiance=off` proves it pixel for pixel.
- Reduced motion and Still: frozen `time` uniform, camera-only rays, finesse identity, exposure 1.0.
- `setEffects`: sparkle-class (motes, stars, bead, glints, heart sparkles, pearl sparkles) and trail-class (petals, butterflies) gates listed per object.
- Determinism and disposal: every layout takes a `seededRandom` seed; every object goes through the registrars or `StudyRadiance.dispose()`; every patched material has a unique `customProgramCacheKey`.

## Checkpoint corrections (recorded after Sections 6 and 7 landed, 2026-09-22)

The numbers above are the design's starting values. The shipped values were tuned down at the capture checkpoints because the study palette already sits near white and additive light saturated the frame; each constant carries a comment in the code saying so.

| Item | Design | Shipped |
| --- | --- | --- |
| Composite blend | additive | screen (CustomBlending, OneMinusDstColor, One), output clamped |
| glowStrength High / Auto | .62 / .45 | .22 / .16 |
| Bloom strength / radius | 1.05 / .62 | .8 / .55 |
| rayStrength / rays exposure | .5 / .32 | .12 / .20 |
| Glow tint / ray tint | white | (1, .88, .84) / (1, .87, .74) |
| Sky glow band opacity | .14 | .05 |
| Sun halo sprites on the glow layer | yes | no (already additive and large) |
| Protect mask contributors | every pearl | only the pearl being read (hero and arrival); occluder radius .985; mask softened with smoothstep(.15, .85) and LinearFilter |
| Water glitter glow | .6 | .3 |
| Water halo opacity | .30 | .18 |
| Heart glow pulse / rim | 1.4 / .35 | .32 / .13 |
| Heart halo local scale / opacity | 5.2 / .30 | 3.2 / .12 (the design missed heartRoot's own 3.25 scale) |
| Heart sparkle opacity | .9 | .6 |
| Gold glow | .22 + .5 sun | .06 + .16 sun |
| Lantern opacity | .9 | .58 |
| Stone caustic band | full at lathe y -3.2 to -2.6 | full -1.9 to -.9, fading at -2.6 and -.35; gain 2.6, exponent 3.2 (only the keel's top bulge is ever visible) |
| Water color | #8fd3d6 | #6ec9cf (Section 5's tuned value) |
| Caustic varying name | vWorldPosition | studyStoneWorld (avoids three's own conditional varying) |
