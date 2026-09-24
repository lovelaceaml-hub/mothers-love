import * as T from "three";
import type { ArrivalState } from "../arrival-director";
import {
  NEIGHBOR_ABSORBED_AT, NEIGHBOR_BEATS, NEIGHBOR_CLIPS, NEIGHBOR_HANDOFF_AT, NEIGHBOR_HEART_START,
  neighborExpression, neighborSchedule, neighborWords, type NeighborClip,
} from "../neighbor-dialogue";
import { WORLD_EXPRESSIONS, ZONES, type ZoneId } from "../world-data";
import type { DesignKitContext, KitBuilderHandle } from "../art/design-world";
import { sparklePoints } from "../art/study-materials";
import { studyTvPage } from "../art/tv-page";
import type { KitAssetId } from "./kit-manifest";
import {
  NEIGHBOR_PEOPLE, NEIGHBOR_CAST, NEIGHBOR_FACTS, NEIGHBOR_SCALE, NEIGHBOR_CARD, CARD_HEIGHT,
  NEIGHBOR_VISIBLE_PAIRS, neighborViewDistance, NEIGHBOR_HERO_DISTANCE, NEIGHBOR_HEART_HEIGHT,
  NEIGHBOR_HEART_FORWARD, type NeighborStage, NEIGHBOR_PORTRAIT_ASPECT, NEIGHBOR_STAGES,
  castNeighbor, smooth, neighborPlacement, neighborBeatLength, neighborWeights,
} from "./kit-neighbor-cast";
import {
  neighborMaterial, type NeighborRig, mergeNeighborRig, cloneRig, type CardContext,
  paintNeighborCard, cardCanvas,
} from "./kit-neighbor-rig";
import {
  type Actor, type Pair, _frustum, _matrix, _sphere, _vector, _corner, _dummy, standAt, pose,
  type FocusLike, coversFocus,
} from "./kit-neighbor-stage";

export {
  NEIGHBOR_PEOPLE, NEIGHBOR_CAST, NEIGHBOR_FACTS, NEIGHBOR_SCALE, NEIGHBOR_STANCE, NEIGHBOR_CARD,
  NEIGHBOR_BLEND, NEIGHBOR_VISIBLE_PAIRS, NEIGHBOR_VIEW_DISTANCE, neighborViewDistance,
  NEIGHBOR_HERO_DISTANCE, NEIGHBOR_HEART_HEIGHT, NEIGHBOR_HEART_FORWARD, NEIGHBOR_PORTRAIT_ASPECT,
  NEIGHBOR_STAGES, neighborAssetIds, castNeighbor, neighborStroll, neighborStrollSeconds,
  NEIGHBOR_EXCHANGE, neighborPlacement, neighborBeatLength, neighborWeights,
} from "./kit-neighbor-cast";
export type {
  NeighborPerson, NeighborStage, NeighborWalk, NeighborWeight, NeighborClipLengths,
} from "./kit-neighbor-cast";
export {
  neighborMaterial, NEIGHBOR_GARMENTS, mergeNeighborRig, NEIGHBOR_CARD_LABEL, paintNeighborCard,
} from "./kit-neighbor-rig";
export type { NeighborRig, CardContext } from "./kit-neighbor-rig";
export { neighborStagePoint, coversFocus } from "./kit-neighbor-stage";

/**
 * Rigged neighbors in the design world (WORLD-INTEGRATION section 5, coordinator ruling 2).
 *
 * Two actors per zone, 26 in all, cast so no zone repeats a person. One clock drives
 * everything: `neighborSchedule` in `neighbor-dialogue.ts` says, for the world time and a zone,
 * which beat the pair is in, what each actor plays, which card shows and where the heart is.
 * The actors' poses are a pure function of that beat (every clip time and blend weight is set
 * from the clock, then the mixer is evaluated at a zero delta), so a paused or reduced motion
 * world is one still, coherent moment and a scrubbed clock replays exactly. The speech cards
 * and the accessible sentence (`neighborDialogue`) read the same schedule, so they agree.
 *
 * Toy and hero. Every actor is built from the toy `neighbor.<name>` rig and has a hero slot:
 * a sculpted `neighbor-hero.<name>` (or `neighbor.hero-<name>`, which the current sync can
 * already name) with the same skeleton and clips takes over for close ups, when its pair is
 * the active one and the camera is near. Without a hero the toy plays every shot.
 *
 * Cost on a TV (design 5.3 and 7.2). Each rig is merged at load into one skinned mesh with its
 * materials baked into vertex attributes, all 26 actors share one material, so an actor is one
 * skinned draw. Only pairs in view and near the camera are shown, at most four (Low: the active
 * pair only); hidden pairs cost nothing. On Auto the pairs other than the active one pose on
 * alternate frames. Only the active pair casts a sun shadow.
 *
 * Owned by lane K4. The design world calls this once, with a kit, before the static batch.
 * Returning a handle means the neighbors stand in the world: the design world then marks
 * `scene.userData.studyNeighbors`, the engine reports `kitNeighbors`, and the host reads the
 * dialogue instead of the "Miniature figures" sentence. The static miniature figures they
 * replace are taken out here, before the batch. Returning `undefined` (a toy rig missing)
 * keeps the figures and the sentence, so nothing regresses.
 */
export type KitNeighbors = KitBuilderHandle & {
  /** Every frame the world updates: the world clock, the director's zone and the arrival state. */
  update(time: number, zone: ZoneId, arrival: ArrivalState | undefined): void;
  setEffects(sparkles: boolean, trails: boolean): void;
  dispose(): void;
};

export function createKitNeighbors(context: DesignKitContext): KitNeighbors | undefined {
  const { kit, scene } = context;
  const casting = new Map(NEIGHBOR_PEOPLE.map(person => [person, castNeighbor(kit, person)]));
  if ([...casting.values()].some(cast => !cast.toy)) return undefined;

  const material = context.material(neighborMaterial());
  // PLAN-01 Section 5 step 9, TV page only: a soft pastel lift over the garments, and the
  // family pausing to look up at the bubbles while they stand together.
  const tvPage = studyTvPage();
  if (tvPage) {
    (material as T.MeshStandardMaterial).emissive.set("#ffe6ef");
    (material as T.MeshStandardMaterial).emissiveIntensity = 0.1;
  }
  const templates = new Map<KitAssetId, { root: T.Object3D; clips: ReadonlyMap<string, T.AnimationClip> }>();
  const template = (id: KitAssetId) => {
    const cached = templates.get(id);
    if (cached) return cached;
    const asset = kit.asset(id)!;
    const merged = mergeNeighborRig(asset.template, material);
    if (!merged) return null;
    context.geometry(merged.geometry);
    const built = { root: merged.root, clips: asset.clips };
    templates.set(id, built);
    return built;
  };
  for (const cast of casting.values()) if (!template(cast.toy!)) return undefined;

  const group = new T.Group();
  group.name = "Kit neighbors";
  // Nothing here may be merged by the study's static batcher: the actors move every frame.
  group.userData.dynamic = true;
  scene.add(group);

  const pairs: Pair[] = ZONES.map((zone, index) => {
    const district = context.districts.get(zone.id)!;
    const stage = NEIGHBOR_STAGES[zone.id];
    const cast = NEIGHBOR_CAST[zone.id];
    district.layout.updateWorldMatrix(true, false);
    const layout = district.layout.matrixWorld.clone();
    const root = new T.Group();
    root.name = `Neighbors: ${zone.id}`;
    standAt(root, stage, layout, false);
    root.quaternion.setFromRotationMatrix(layout).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), stage.yaw ?? 0));
    root.visible = false;
    group.add(root);
    const facts = cast.map(person => NEIGHBOR_FACTS[person]);
    const giver = facts[0];
    // The studio's spacing: the roots `heart_reach` + `heart_reach` + .15 of the giver's
    // height apart, so the two big heads never touch; the pair turns further toward each other
    // (NEIGHBOR_EXCHANGE) to pass the heart, which lines the two hands up again.
    const gap = 0.15 * giver.height;
    const actors = cast.map((person, slot) => {
      const own = casting.get(person)!;
      const toyTemplate = template(own.toy!)!;
      const toy = cloneRig(toyTemplate, toyTemplate.clips);
      const heroTemplate = own.hero ? template(own.hero) : null;
      const hero = heroTemplate ? cloneRig(heroTemplate, new Map([...toyTemplate.clips, ...heroTemplate.clips])) : null;
      const holder = new T.Group();
      holder.name = `Neighbor ${person}`;
      holder.scale.setScalar(NEIGHBOR_SCALE);
      holder.add(toy.root);
      if (hero) { hero.root.visible = false; holder.add(hero.root); }
      root.add(holder);
      const walkClip = kit.asset(own.toy!)!.entry.clips.find(clip => clip.name === "walk");
      const lengths: Partial<Record<NeighborClip, number>> = {};
      for (const name of NEIGHBOR_CLIPS) { const clip = toyTemplate.clips.get(name); if (clip) lengths[name] = clip.duration; }
      const personal = facts[slot];
      return {
        person, slot: slot as 0 | 1, side: (slot ? 1 : -1) as -1 | 1, holder, toy, hero, shown: toy, mixers: new Map(), lengths,
        meet: (personal.reach + gap / 2) * NEIGHBOR_SCALE,
        stride: (walkClip?.stride ?? personal.stride) * NEIGHBOR_SCALE,
        height: personal.height,
      } satisfies Actor;
    }) as [Actor, Actor];
    const give = kit.asset(casting.get(cast[0])!.toy!)!.entry.clips.find(clip => clip.name === "give_heart");
    return {
      zone: zone.id, index, root, stage, actors,
      handoffAt: give?.handoffAt ?? NEIGHBOR_HANDOFF_AT,
      centre: root.position.clone(),
      layout,
      portrait: false,
      top: Math.max(facts[0].height, facts[1].height),
      mean: (facts[0].height + facts[1].height) / 2,
      posed: -Infinity,
    };
  });

  // The miniature figures step aside for the neighbors, with the soft contact shadow each one
  // stood on, before the static batch merges them away.
  const shadowMaterial = context.palette.shadow;
  context.districts.forEach(district => {
    for (const figure of district.figures) {
      const parent = figure.parent;
      figure.removeFromParent();
      parent?.children.slice().forEach(child => {
        const mesh = child as T.Mesh;
        if (mesh.isMesh && mesh.material === shadowMaterial && Math.abs(mesh.position.x - figure.position.x) < 1e-6 && Math.abs(mesh.position.z - figure.position.z) < 1e-6) mesh.removeFromParent();
      });
    }
    district.figures.length = 0;
  });

  // Contact shadows: one soft disc under every shown actor, one draw for all of them.
  const maxActors = NEIGHBOR_VISIBLE_PAIRS.high * 2;
  const contactGeometry = context.geometry(new T.PlaneGeometry(1, 1));
  contactGeometry.rotateX(-Math.PI / 2);
  const contacts = new T.InstancedMesh(contactGeometry, shadowMaterial, maxActors);
  contacts.name = "Neighbor contact shadows";
  contacts.frustumCulled = false;
  contacts.count = 0;
  group.add(contacts);

  // The floating heart after the hand over (design 5.2): the kit's sculpted heart in the
  // study's own rose, which breathes on the Sanctuary's beat and reaches the glow layer, with
  // six sparkles around it.
  const heartGeometry = kit.has("core.heart" as KitAssetId)
    ? kit.geometry("core.heart" as KitAssetId)
    : context.geometry(new T.SphereGeometry(0.5, 16, 12));
  heartGeometry.computeBoundingBox();
  const heartBox = heartGeometry.boundingBox!;
  const heartSize = Math.max(heartBox.max.x - heartBox.min.x, heartBox.max.y - heartBox.min.y, 1e-3);
  const heartCentre = heartBox.getCenter(new T.Vector3());
  const hearts = new T.InstancedMesh(heartGeometry, context.palette.rose, NEIGHBOR_VISIBLE_PAIRS.high);
  hearts.name = "Neighbor floating hearts";
  hearts.frustumCulled = false;
  hearts.count = 0;
  hearts.layers.enable(1);
  group.add(hearts);
  const sparkleCount = NEIGHBOR_VISIBLE_PAIRS.high * 6;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  const sparkleGeometry = context.geometry(new T.BufferGeometry());
  sparkleGeometry.setAttribute("position", new T.BufferAttribute(sparklePositions, 3));
  sparkleGeometry.setAttribute("phase", new T.BufferAttribute(Float32Array.from({ length: sparkleCount }, (_, i) => (i % 6) / 6), 1));
  sparkleGeometry.setDrawRange(0, 0);
  const sparkleMaterial = context.material(sparklePoints(context.time, 0.34, "#fff0d6", 0.85, context.sparkleDot));
  const sparkles = new T.Points(sparkleGeometry, sparkleMaterial);
  sparkles.name = "Neighbor heart sparkles";
  sparkles.frustumCulled = false;
  group.add(sparkles);
  let sparklesOn = true;

  // Two speech cards shared by every zone, repainted when the active zone changes, so the
  // world holds two card textures however long the tour runs.
  const cards = (["greeting", "response"] as const).map(kind => {
    const painted = cardCanvas();
    const texture = painted ? context.texture(new T.CanvasTexture(painted.canvas)) : null;
    if (texture) { texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 4; }
    // Drawn over the scenery, like the words on a pearl: a drifting petal or a branch never
    // crosses the phrase. The guard below keeps it off the pearl being read.
    const cardMaterial = context.material(new T.MeshBasicMaterial({
      map: texture, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false,
    }));
    const mesh = new T.Mesh(context.geometry(new T.PlaneGeometry(NEIGHBOR_CARD.width, CARD_HEIGHT)), cardMaterial);
    mesh.name = `Neighbor ${kind} card`;
    mesh.renderOrder = 24;
    mesh.visible = false;
    // The protect mask keeps the bloom off the words, as it does for the pearl being read.
    mesh.layers.enable(3);
    group.add(mesh);
    return { kind, mesh, painted, texture, key: null as string | null };
  });
  // The Grove's pair speaks the expression its panel shows, so its cards repaint when the
  // selection changes; every other zone's words depend on the zone alone.
  const paintCards = (pair: Pair, selected: number | undefined) => {
    const expression = neighborExpression(pair.index, selected);
    const words = neighborWords(pair.index, selected);
    const accent = WORLD_EXPRESSIONS[expression].color;
    const key = `${pair.zone} ${expression}`;
    for (const card of cards) {
      if (card.key === key) continue;
      card.key = key;
      if (!card.painted || !card.texture) continue;
      const speaker = card.kind === "greeting" ? pair.actors[0] : pair.actors[1];
      const beside = pair.stage.cardLift !== undefined;
      // Beside the pair the tail points sideways at head height; above it, down at the speaker.
      const side = !beside ? "down" : pair.stage.card > 0 ? "left" : "right";
      const tail = beside
        ? 1 - ((speaker.height * NEIGHBOR_SCALE * 0.82) - pair.stage.cardLift!) / CARD_HEIGHT
        : 0.5 + (speaker.side * speaker.meet - pair.stage.card) / NEIGHBOR_CARD.width;
      paintNeighborCard(card.painted.context as unknown as CardContext, card.kind === "greeting" ? words.greeting : words.response, card.kind === "greeting" ? accent : "#d1aa6c", tail, side);
      card.texture.needsUpdate = true;
    }
  };

  let frame = 0;
  const visibleNow: Pair[] = [];
  const cameraAt = new T.Vector3();

  function update(time: number, zone: ZoneId, arrival: ArrivalState | undefined) {
    frame++;
    const camera = scene.userData.studyCamera as T.PerspectiveCamera | undefined;
    const tier = (scene.userData.studyTier as "high" | "auto" | "low" | undefined) ?? (scene.userData.lowTier === true ? "low" : "high");
    const celebrating = !!arrival && arrival.phase !== "idle";
    const activeIndex = Math.max(0, ZONES.findIndex(item => item.id === zone));
    const active = pairs[activeIndex];
    const selected = scene.userData.studyExpression as number | undefined;

    // A portrait screen steps the wide set pairs toward its middle (the stage's `portrait`).
    const portrait = !!camera && camera.aspect < NEIGHBOR_PORTRAIT_ASPECT;
    for (const pair of pairs) {
      if (pair.portrait === portrait || !pair.stage.portrait) continue;
      pair.portrait = portrait;
      standAt(pair.root, pair.stage, pair.layout, portrait);
      pair.centre.copy(pair.root.position);
    }

    // Which pairs to show: in view, near enough, the active one first, then the nearest.
    visibleNow.length = 0;
    if (camera) {
      camera.updateMatrixWorld();
      _frustum.setFromProjectionMatrix(_matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      camera.getWorldPosition(cameraAt);
    }
    const viewDistance = neighborViewDistance(tvPage, tier);
    const inView = (pair: Pair) => {
      if (!camera) return pair === active;
      if (pair.centre.distanceTo(cameraAt) > viewDistance) return false;
      _sphere.center.copy(pair.centre).setY(pair.centre.y + 1.4);
      _sphere.radius = pair.stage.walk + 3;
      return _frustum.intersectsSphere(_sphere);
    };
    const limit = NEIGHBOR_VISIBLE_PAIRS[tier];
    if (inView(active)) visibleNow.push(active);
    if (tier !== "low") {
      const others = pairs.filter(pair => pair !== active && inView(pair));
      others.sort((a, b) => a.centre.distanceToSquared(cameraAt) - b.centre.distanceToSquared(cameraAt));
      for (const pair of others) { if (visibleNow.length >= limit) break; visibleNow.push(pair); }
    }
    for (const pair of pairs) pair.root.visible = visibleNow.includes(pair);

    let contactCount = 0, heartCount = 0, sparkleUsed = 0;
    for (const pair of visibleNow) {
      const beat = neighborSchedule(time, pair.index, pair.handoffAt, selected);
      const isActive = pair === active;
      // Auto: the active pair every frame, the rest on alternate frames (design 5.3); a pair
      // that has just come into view is posed at once.
      const posing = isActive || tier !== "auto" || frame - pair.posed >= 2;
      if (posing) pair.posed = frame;
      const close = isActive && !!camera && pair.centre.distanceTo(cameraAt) < NEIGHBOR_HERO_DISTANCE;
      const previousRow = (beat.beat + NEIGHBOR_BEATS.length - 1) % NEIGHBOR_BEATS.length;
      const previousStaging = NEIGHBOR_BEATS[previousRow].staging;
      const earlierStaging = NEIGHBOR_BEATS[(previousRow + NEIGHBOR_BEATS.length - 1) % NEIGHBOR_BEATS.length].staging;
      for (const actor of pair.actors) {
        const walk = { length: pair.stage.walk, speed: actor.stride / (actor.lengths.walk ?? 1) };
        const place = neighborPlacement(beat.staging, beat.beatAge, beat.beatLength, actor.side, walk, previousStaging);
        const before = neighborPlacement(previousStaging, neighborBeatLength(previousRow), neighborBeatLength(previousRow), actor.side, walk, earlierStaging);
        const walked = pair.stage.walk;
        actor.holder.position.set(actor.side * (actor.meet + place.apart * walked), 0, 0);
        actor.holder.rotation.y = place.heading;
        const rig = close && actor.hero ? actor.hero : actor.toy;
        if (rig !== actor.shown) { actor.shown.root.visible = false; rig.root.visible = true; actor.shown = rig; }
        rig.mesh.castShadow = isActive;
        if (posing) {
          const walkLength = actor.lengths.walk ?? 1;
          const walkTime = (fraction: number) => ((fraction * walked / actor.stride) % 1) * walkLength;
          const idleTime = time + actor.slot * 1.7 + pair.index * 0.9;
          pose(actor, rig, neighborWeights(beat, actor.slot, actor.lengths, idleTime, walkTime, { now: place.walked, before: before.walked, pace: place.pace }));
          // Bones rest unrotated (glTF Y up, facing +Z), so a turn about x lifts the face.
          if (tvPage && beat.staging === "stance") {
            const look = smooth(beat.beatAge / 1.2) * smooth((beat.beatLength - beat.beatAge) / 1.2);
            rig.skeleton.getBoneByName("head")?.rotateX(-0.42 * look);
          }
        }
        if (contactCount < maxActors) {
          _vector.copy(actor.holder.position);
          pair.root.localToWorld(_vector);
          _dummy.position.set(_vector.x, _vector.y + 0.03, _vector.z);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(0.95 * NEIGHBOR_SCALE, 1, 0.6 * NEIGHBOR_SCALE);
          _dummy.updateMatrix();
          contacts.setMatrixAt(contactCount++, _dummy.matrix);
        }
      }
      // The heart the pair shared, rising between them once it has been taken to heart, and
      // fading as they part. It floats at chest height of the pair's mean (about 1.6 units for a
      // mother and child), a little in front of them, so it reads as theirs, not as a thought
      // balloon on the taller one's hair.
      const into = beat.stage === "meet" ? beat.age - NEIGHBOR_HEART_START - NEIGHBOR_ABSORBED_AT : -1;
      const leaving = beat.stage === "part" ? beat.age : -1;
      const grow = beat.heart === "floating" ? smooth(into / 0.8) : leaving >= 0 ? 1 - smooth(leaving / 0.9) : 0;
      if (grow > 0.001 && heartCount < NEIGHBOR_VISIBLE_PAIRS.high) {
        const rise = beat.stage === "part" ? leaving * 0.6 : 0;
        const base = pair.mean * NEIGHBOR_HEART_HEIGHT * NEIGHBOR_SCALE;
        const lift = beat.stage === "part" ? 1 : smooth(into / 1.4);
        _vector.set(Math.sin(time * 0.8 + pair.index) * 0.22, base + 0.45 * lift + Math.sin(time * 1.4 + pair.index) * 0.1 + rise, NEIGHBOR_HEART_FORWARD);
        pair.root.localToWorld(_vector);
        const size = (0.85 / heartSize) * grow;
        _dummy.position.copy(_vector).sub(_corner.copy(heartCentre).multiplyScalar(size));
        _dummy.rotation.set(0, time * 0.5 + pair.index, 0);
        _dummy.scale.setScalar(size);
        _dummy.updateMatrix();
        hearts.setMatrixAt(heartCount++, _dummy.matrix);
        if (sparklesOn) for (let i = 0; i < 6 && sparkleUsed < sparkleCount; i++) {
          const a = time * 0.65 + i * 1.047 + pair.index;
          _corner.set(Math.cos(a) * 0.75, ((time * 0.35 + i / 3) % 1.4) - 0.3, Math.sin(a) * 0.45).multiplyScalar(grow).add(_vector);
          sparklePositions.set([_corner.x, _corner.y, _corner.z], sparkleUsed * 3);
          sparkleUsed++;
        }
      }
    }
    contacts.count = contactCount;
    contacts.instanceMatrix.needsUpdate = true;
    hearts.count = heartCount;
    hearts.instanceMatrix.needsUpdate = true;
    sparkleGeometry.setDrawRange(0, sparkleUsed);
    sparkleGeometry.getAttribute("position").needsUpdate = true;
    sparkles.visible = sparklesOn && sparkleUsed > 0;

    // The speech card: the active pair only, while its schedule says someone is speaking.
    const beat = neighborSchedule(time, active.index, active.handoffAt, selected);
    const speaking = !celebrating && active.root.visible && beat.card !== null;
    if (speaking) paintCards(active, selected);
    for (const card of cards) {
      const on = speaking && card.kind === beat.card && !!card.texture;
      card.mesh.visible = on;
      if (!on || !camera) continue;
      const lift = (active.stage.cardLift ?? active.top * NEIGHBOR_SCALE + 0.3) + CARD_HEIGHT / 2;
      card.mesh.position.set(active.stage.card, lift, 0);
      active.root.localToWorld(card.mesh.position);
      card.mesh.quaternion.copy(camera.quaternion);
      card.mesh.updateMatrixWorld();
      // Nothing may cover the words: a card that would overlap the pearl being read steps aside.
      card.mesh.visible = !coversFocus(card.mesh, camera, scene.userData.studyFocus as FocusLike);
      // TV page: nor any recognition bubble on show, and the cards rest while the camera is in
      // close to read, where one would stand huge over the QR card and the ticker.
      if (tvPage && card.mesh.visible) {
        const discs = scene.userData.tvDiscs as FocusLike[] | undefined;
        card.mesh.visible = !((scene.userData.tvReading as number | undefined ?? 0) > 0.02
          || discs?.some((disc) => coversFocus(card.mesh, camera, disc)));
      }
    }
  }

  return {
    update,
    setEffects(sparkleSetting: boolean) {
      sparklesOn = sparkleSetting;
      sparkles.visible = sparklesOn && sparkles.visible;
    },
    dispose() {
      for (const pair of pairs) for (const actor of pair.actors) {
        actor.mixers.forEach(({ mixer }, rig) => { mixer.stopAllAction(); mixer.uncacheRoot(rig.root); });
        actor.mixers.clear();
        actor.toy.skeleton.dispose();
        actor.hero?.skeleton.dispose();
      }
      contacts.dispose();
      hearts.dispose();
      group.removeFromParent();
    },
  };
}
