/** The pearl skin's per frame update. The skin calls it with itself as `this`. */
import type { StudyPearlFrame } from "./pearl-face";
import { SHIMMER_BEAD_COUNT, medallionAngle } from "./pearl-skin-measures";
import type { StudyPearlSkin } from "./pearl-skin";

export function updatePearlSkin(this: StudyPearlSkin, time: number, ids: readonly number[], detailed: boolean, frame: StudyPearlFrame) {
  if (!this.kitResolved) this.dress();
  this.clock.value = time;
  // A resident pearl keeps only its glass shell and one gold ring: two extra draws.
  this.finish.visible = this.halo.visible = detailed;
  // Where the zone draws its own orbits, the pearl's lanes and their beads stand down.
  this.orbits.visible = detailed && frame.lanes !== false;
  // The occluder always blocks the glow layer behind this disc. Only the pearl being read
  // joins the protect mask, which carries no scene depth of its own.
  this.occluder.visible = true;
  if (detailed) this.occluder.layers.enable(3); else this.occluder.layers.disable(3);
  // A resident steps back into the scenery, so it keeps its shell but leaves the glow layer.
  // One message at a time carries the eye, and the glow pass drops a dozen draws with it.
  if (detailed) this.shell.layers.enable(1); else this.shell.layers.disable(1);
  this.sparkles.visible = detailed && frame.sparkles;
  // Sparkle class, like the dust: the bead and the medallion glints follow the owner's switch.
  this.shimmer.visible = detailed && frame.sparkles;
  if (this.shimmer.visible) {
    for (let i = 0; i < SHIMMER_BEAD_COUNT; i++) {
      const a = time * .42 - i * .06;
      this.shimmerScratch.set(Math.cos(a) * 1.37, Math.sin(a) * 1.26, Math.sin(a * 2) * .12 - .08);
      this.shimmerScratch.applyAxisAngle(this.orbitAxis, .38);
      this.shimmerPlaces[i * 3] = this.shimmerScratch.x;
      this.shimmerPlaces[i * 3 + 1] = this.shimmerScratch.y;
      this.shimmerPlaces[i * 3 + 2] = this.shimmerScratch.z;
    }
    this.shimmer.geometry.getAttribute("position").needsUpdate = true;
  }
  const dressing = this.dressing;
  this.rings.forEach((ring, index) => { ring.visible = index === 0 || (detailed && !dressing?.rim); });
  for (const part of [dressing?.rim, dressing?.rimPearls, dressing?.film]) if (part) part.visible = detailed;
  // The arriving pearl's setting and symbols join the protect mask with its occluder, so the
  // arrival's glow never lands on them. Every other pearl keeps them off that layer.
  const shield = detailed && frame.shield === true;
  const shielded = [dressing?.rim, dressing?.rimPearls, dressing?.medallions?.orbs, dressing?.medallions?.bezels];
  for (const part of shielded) if (part) { if (shield) part.layers.enable(3); else part.layers.disable(3); }
  this.orbitBeads.forEach((beads, group) => {
    const size = this.beadScales[group];
    this.orbitBeadIndices[group].forEach((i, slot) => {
      const lane = i % 2, a = i * 2.399 + time * .035;
      this.beadDummy.position
        .set(Math.cos(a) * (1.37 + lane * .11), Math.sin(a) * (1.26 + lane * .055), Math.sin(a * 2 + lane) * .12 - .08)
        .applyAxisAngle(this.orbitAxis, lane ? -.46 : .38);
      this.beadDummy.scale.setScalar(size);
      this.beadDummy.updateMatrix();
      beads.setMatrixAt(slot, this.beadDummy.matrix);
    });
    beads.instanceMatrix.needsUpdate = true;
  });
  const selected = this.medallions.filter(item => ids.includes(item.id));
  this.medallions.forEach(item => {
    item.root.visible = detailed && ids.includes(item.id);
    item.glint.visible = frame.sparkles;
    // A narrow power keeps each glint to a brief catch of light rather than a steady lamp,
    // and the per symbol phase means no two of them flash together.
    item.glint.material.opacity = Math.pow(Math.max(0, Math.sin(time * .55 + item.id * 1.3)), 30) * .9;
  });
  // A narrow viewport pulls the ring in and shrinks the symbols, so none of them leaves the frame.
  const radiusX = (frame.portrait ? 1.06 : 1.36) * frame.orbitScale;
  const radiusY = (frame.portrait ? 1.44 : 1.28) * frame.orbitScale;
  const size = frame.portrait ? .9 : frame.orbitScale;
  selected.forEach((item, i) => {
    const a = medallionAngle(time, i, selected.length);
    item.root.position.set(Math.cos(a) * radiusX, Math.sin(a) * radiusY, .09 + Math.sin(a * 2) * .055);
    item.root.scale.setScalar(size);
  });
  if (dressing?.medallions) this.placeKitMedallions(dressing.medallions, detailed ? selected : []);
  if (dressing?.stars) this.placeKitStars(dressing.stars, dressing.twinkle, time, detailed && frame.sparkles, detailed ? selected : [], radiusX, radiusY, size);
}
