/** The pearl skin's kit dressing: swapping in the kit's pieces and placing its medallions and stars. The skin calls these with itself as `this`. */
import * as T from "three";
import { WORLD_EXPRESSIONS } from "../world-data";
import { studyGlass, studyGlow } from "./study-materials";
import {
  MEDALLION_ORB_RADIUS, PEARL_FILM_INNER, PEARL_FILM_OUTER, PEARL_FILM_ALPHA,
  MEDALLION_VEIL_OPACITY, type StudyPearlTwinkle, SHIMMER_BEAD_COUNT, PEARL_STAR_COUNT,
  PEARL_STAR_AIR, medallionAngle, PEARL_BEAD_RADIUS, type PearlMedallion, type PearlKitDressing,
} from "./pearl-skin-measures";
import type { StudyPearlSkin } from "./pearl-skin";

/**
 * Put the kit on this pearl, once, on the first update. Each piece is independent: whatever
 * the kit lacks stays procedural, and without a kit nothing here runs at all.
 */
export function dressPearlSkin(this: StudyPearlSkin) {
  this.kitResolved = true;
  const kit = this.kitSource?.();
  const parts = kit ? this.assets.kitParts(kit) : undefined;
  if (!parts) return;
  const dressing: PearlKitDressing = {};
  if (parts.rim) {
    // The shell file's gold rim ring and bead band: a setting for the pearl, outside the face.
    // Rings 1 and 2 give way to it; ring 0 stays, since a resident shows it alone.
    //
    // Visual review found the band dull khaki and flat lit in the translucent medallion rim
    // gold, so the setting is solid: a polished gold that takes the environment's light, and
    // the travelling pearls' own white pearl for every other bead.
    const rimGold = this.material(new T.MeshPhysicalMaterial({
      color: "#f2cb80", metalness: 1, roughness: .17, clearcoat: .6, clearcoatRoughness: .12, envMapIntensity: 1.45,
    }));
    const rim = new T.Mesh(parts.rim, rimGold);
    rim.name = "pearl kit rim band"; rim.visible = false;
    this.root.add(rim); dressing.rim = rim;
    if (parts.rimPearls) {
      const pearls = new T.Mesh(parts.rimPearls, this.beadPearl);
      pearls.name = "pearl kit rim pearls"; pearls.visible = false;
      this.root.add(pearls); dressing.rimPearls = pearls;
    }
    // The thin film at the edge of the bubble: blue violet at ten o'clock, mint below it,
    // peach at four and rose above it, in fine fringes that drift with the clock. It lies
    // between the face and the gold setting, so the beads sit on it, and it never reaches
    // inside PEARL_FILM_INNER of the face, so no pixel of the words or their frame changes.
    const film = new T.Mesh(this.geometry(new T.RingGeometry(PEARL_FILM_INNER, PEARL_FILM_OUTER, 160, 3)), this.material(new T.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: false, toneMapped: false,
      uniforms: { time: this.clock },
      vertexShader: "varying vec2 filmP;void main(){filmP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 filmP;uniform float time;
          float filmLobe(float t, float at){return pow(max(0., cos(t - at)), 2.);}
          void main(){float r=length(filmP),a=atan(filmP.y,filmP.x);
            float inside=smoothstep(${PEARL_FILM_INNER.toFixed(3)},.995,r);
            float outside=1.-smoothstep(1.02,${PEARL_FILM_OUTER.toFixed(3)},r);
            float t=a+sin((r-1.)*38.+time*.12)*.45;
            float violet=filmLobe(t,2.618),mint=filmLobe(t,4.189),peach=filmLobe(t,-.524),rose=filmLobe(t,1.047);
            vec3 film=(vec3(.40,.36,1.)*violet+vec3(.28,.88,.58)*mint+vec3(1.,.54,.28)*peach+vec3(1.,.40,.70)*rose)
              /max(.001,violet+mint+peach+rose);
            float fringe=.5+.5*sin((r-1.)*70.-time*.4+sin(a*3.+time*.1)*.8);
            gl_FragColor=vec4(film,inside*outside*(${PEARL_FILM_ALPHA.base.toFixed(2)}+${PEARL_FILM_ALPHA.fringe.toFixed(2)}*fringe));
            #include <colorspace_fragment>
          }`,
    })));
    film.name = "pearl kit film"; film.position.z = .02; film.renderOrder = 4; film.visible = false;
    this.root.add(film); dressing.film = film;
  }
  if (parts.orbit) {
    // The kit wire and its dots on both lanes, one draw in place of the two tubes.
    this.orbitTubes.forEach(tube => this.orbits.remove(tube));
    const orbit = new T.Mesh(parts.orbit, this.gold);
    orbit.name = "pearl kit orbit";
    this.orbits.add(orbit); dressing.orbit = orbit;
  }
  if (parts.medallion) {
    // One instanced draw each for the backs, the orbs and the bezels of every medallion shown,
    // placed where the medallion roots are. The canonical icon disc and the glint stay in
    // each root; the tint disc, glass ball and rim torus they replace come out.
    // The bowl is seen from inside, so both faces draw; `forceSinglePass` keeps that one draw,
    // where three would otherwise split a transparent double sided material into two.
    const backs = new T.InstancedMesh(parts.medallion.back, this.material(new T.MeshBasicMaterial({
      color: "#ffffff", toneMapped: false, transparent: true, opacity: .96, depthWrite: false, side: T.DoubleSide,
      forceSinglePass: true,
    })), WORLD_EXPRESSIONS.length);
    backs.name = "pearl kit medallion backs"; backs.renderOrder = 3;
    this.medallions.forEach((item, slot) => backs.setColorAt(slot, item.tint));
    // The orb glass over the canonical icon is a pastel veil (visual review: the flat campaign
    // icons read as hard emoji on the pearl orbs), so the icon is seen through tinted glass.
    const veil = studyGlow(studyGlass(MEDALLION_VEIL_OPACITY), "medallion", "vec3(1., .93, .86) * pearlRim * 1.15", "pearlRim * .9");
    veil.color.set("#f6e7f1");
    const orbs = new T.InstancedMesh(parts.medallion.glass, this.material(veil), WORLD_EXPRESSIONS.length);
    orbs.name = "pearl kit medallion orbs"; orbs.renderOrder = 5; orbs.layers.enable(1);
    const bezels = new T.InstancedMesh(parts.medallion.bezel, this.gold, WORLD_EXPRESSIONS.length);
    bezels.name = "pearl kit medallion bezels"; bezels.layers.enable(1);
    for (const mesh of [backs, orbs, bezels]) {
      mesh.frustumCulled = false; mesh.visible = false; mesh.count = 0;
      this.root.add(mesh);
    }
    this.medallions.forEach(item => item.procedural.forEach(part => item.root.remove(part)));
    dressing.medallions = { backs, orbs, bezels };
  }
  if (parts.star) {
    // The head of the shimmer becomes the kit's star; the four trailing points stay points.
    const stars = new T.InstancedMesh(parts.star.geometry, this.material(new T.MeshBasicMaterial({
      color: "#fff3d6", transparent: true, opacity: .95, depthWrite: false, fog: false, toneMapped: false,
    })), PEARL_STAR_COUNT);
    stars.name = "pearl kit stars"; stars.renderOrder = 5; stars.frustumCulled = false; stars.visible = false;
    stars.layers.enable(1);
    this.root.add(stars);
    this.shimmer.geometry.setDrawRange(1, SHIMMER_BEAD_COUNT - 1);
    dressing.stars = stars; dressing.twinkle = parts.star.twinkle;
  }
  if (parts.beads) {
    // The travelling beads take the kit ring's own pearl and bead sizes; the two draws and
    // their CPU motion are unchanged.
    this.beadScales = [parts.beads.pearl / PEARL_BEAD_RADIUS, parts.beads.gold / PEARL_BEAD_RADIUS];
  }
  this.dressing = dressing;
}

/** Every medallion shown takes the next instance of each kit draw, at its root's place and size. */
export function placePearlKitMedallions(this: StudyPearlSkin, kit: NonNullable<PearlKitDressing["medallions"]>, shown: readonly PearlMedallion[]) {
  const { backs, orbs, bezels } = kit;
  shown.forEach((item, slot) => {
    this.matrixScratch.compose(item.root.position, this.noTurn, item.root.scale);
    backs.setMatrixAt(slot, this.matrixScratch);
    orbs.setMatrixAt(slot, this.matrixScratch);
    bezels.setMatrixAt(slot, this.matrixScratch);
    backs.setColorAt(slot, item.tint);
  });
  for (const mesh of [backs, orbs, bezels]) {
    mesh.count = shown.length;
    mesh.visible = shown.length > 0;
    mesh.instanceMatrix.needsUpdate = true;
  }
  if (backs.instanceColor) backs.instanceColor.needsUpdate = true;
}

/**
 * The head star rides the shimmer's place on the outer gold ring. The others ride the
 * medallion ellipse a little further out, each at the midpoint of a gap between two
 * neighbouring medallions shown, with the medallions' own angle formula, so they turn with
 * the ring and keep their gaps for the whole reading. There are as many as there are gaps,
 * up to four, spread evenly over the gaps when there are more.
 *
 * No star ever paints over a canonical symbol (design 3.1). Neither the stars nor the icon
 * disc writes depth, and the stars draw after it, so the guarantee is geometric: each star
 * shrinks to keep its whole extent outside every shown orb plus `PEARL_STAR_AIR`, and is
 * gone while it passes one. The gap stars always clear at full size; only the head star,
 * whose lane crosses the medallion ring, ever dips, and it does so smoothly. Every pose is
 * a function of the clock.
 */
export function placePearlKitStars(this: StudyPearlSkin, stars: T.InstancedMesh, twinkle: StudyPearlTwinkle | undefined, time: number, shown: boolean, medallions: readonly PearlMedallion[], radiusX: number, radiusY: number, size: number) {
  stars.visible = shown;
  if (!shown) return;
  const count = medallions.length;
  const gapStars = Math.min(PEARL_STAR_COUNT - 1, count);
  stars.count = 1 + gapStars;
  for (let k = 0; k <= gapStars; k++) {
    if (k === 0) {
      const a = time * .42;
      this.placeScratch.set(Math.cos(a) * 1.37, Math.sin(a) * 1.26, Math.sin(a * 2) * .12 - .08).applyAxisAngle(this.orbitAxis, .38);
    } else {
      // The gap after medallion `gap`, halfway to the next one round the ring.
      const gap = Math.floor((k - 1) * count / gapStars);
      const a = medallionAngle(time, gap + .5, count);
      this.placeScratch.set(Math.cos(a) * radiusX * 1.07, Math.sin(a) * radiusY * 1.07, .09);
    }
    if (twinkle) twinkle(time + this.starPhases[k], this.turnScratch, this.sizeScratch);
    else { this.turnScratch.identity(); this.sizeScratch.set(1, 1, 1); }
    this.turnScratch.premultiply(this.starRolls[k]);
    this.sizeScratch.multiplyScalar(this.starSizes[k] * (k ? size : 1));
    // The star's geometry has planar radius 1 and the twinkle and roll turn it about the view
    // axis only, so its half extent on the pearl's plane is its largest planar scale.
    const half = Math.max(this.sizeScratch.x, this.sizeScratch.y);
    let room = Infinity;
    for (const item of medallions) {
      const reach = (MEDALLION_ORB_RADIUS + PEARL_STAR_AIR) * item.root.scale.x;
      room = Math.min(room, Math.hypot(this.placeScratch.x - item.root.position.x, this.placeScratch.y - item.root.position.y) - reach);
    }
    // Full size from one and a half extents of room, nothing at none. Smoothstep's slope never
    // passes 1.5, so the shrinking star never outgrows the room it has.
    if (room < 1.5 * half) this.sizeScratch.multiplyScalar(T.MathUtils.smoothstep(room, 0, 1.5 * half));
    this.matrixScratch.compose(this.placeScratch, this.turnScratch, this.sizeScratch);
    stars.setMatrixAt(k, this.matrixScratch);
  }
  stars.instanceMatrix.needsUpdate = true;
}
