'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  DisplayEffects,
  DisplayGardenAmount,
  DisplayPlaylistEntry,
  DisplayScreenId,
  DisplaySettings,
  DisplaySound,
} from '@/lib/contracts';
import {
  DEFAULT_DISPLAY_EFFECTS,
  DEFAULT_DISPLAY_PLAYLIST,
  DEFAULT_DISPLAY_SOUND,
  DISPLAY_SCREEN_IDS,
} from '@/lib/contracts';
import { useAdminSession } from './admin-shell';
import { adminApi, adminJson, getAuthErrorMessage } from './admin-api';
import { DisplayStudioPreview } from '@/components/display/preview';
import styles from './display-controls/display-controls.module.css';

type Overview = { settings: DisplaySettings; aggregate: { recognitions: number; expressionTotal: number } };
type Draft = Partial<DisplaySettings>;
type ScreenInfo = { id: DisplayScreenId; title: string; description: string; color: string };

const SCREEN_INFO: Record<DisplayScreenId, ScreenInfo> = {
  garden: { id: 'garden', title: 'Recognition Garden', description: 'The living wall of approved recognitions.', color: 'coral' },
  featured: { id: 'featured', title: 'Featured recognitions', description: 'A closer look at featured messages.', color: 'gold' },
  impact: { id: 'impact', title: 'Monthly impact', description: 'A simple view of campaign activity.', color: 'blue' },
  expressions: { id: 'expressions', title: 'Nine expressions', description: 'The nine ways people are choosing peace.', color: 'lavender' },
  'shared-expression': { id: 'shared-expression', title: 'Shared expression', description: 'A shared expression in a calm visual rhythm.', color: 'mint' },
  spotlight: { id: 'spotlight', title: 'Expression spotlight', description: 'A short teaching moment for one expression.', color: 'peach' },
  'daily-practice': { id: 'daily-practice', title: 'Daily Practice', description: 'An official external practice form.', color: 'blue' },
  'one-kind-word': { id: 'one-kind-word', title: 'One Kind Word', description: 'A rotating reminder to share a kind word.', color: 'gold' },
  'everyday-peace': { id: 'everyday-peace', title: 'Everyday Peace', description: 'A quiet invitation to carry peace into the day.', color: 'mint' },
  'peace-promise': { id: 'peace-promise', title: 'Peace Promise', description: 'An official external signature form.', color: 'lavender' },
};

const TEMPOS = [
  { id: 'calm', label: 'Calm', hint: 'More breathing room' },
  { id: 'standard', label: 'Standard', hint: 'Balanced rhythm' },
  { id: 'lively', label: 'Lively', hint: 'Brighter movement' },
] as const;

export const legacyTempo = (settings: DisplaySettings): 'calm' | 'standard' | 'lively' => {
  if (settings.tempo === 'calm' || settings.tempo === 'slow' || settings.tempo === 'gentle') return 'calm';
  if (settings.tempo === 'lively' || settings.tempo === 'fast') return 'lively';
  return 'standard';
};

export const playlistWithDefaults = (settings: DisplaySettings): DisplayPlaylistEntry[] => {
  const raw = settings.playlist;
  if (Array.isArray(raw) && raw.length > 0) return raw.map((entry) => ({ ...entry }));
  return DEFAULT_DISPLAY_PLAYLIST.map((entry) => ({ ...entry }));
};

export const effectsWithDefaults = (settings: DisplaySettings): DisplayEffects => ({
  ...DEFAULT_DISPLAY_EFFECTS,
  trails: settings.effects?.trails ?? settings.showTrails,
  constellations: settings.effects?.constellations ?? settings.showConstellations,
  ...(settings.effects?.sparkles === undefined ? {} : { sparkles: settings.effects.sparkles }),
  ...(settings.effects?.background === undefined ? {} : { background: settings.effects.background }),
});

export const soundWithDefaults = (settings: DisplaySettings): DisplaySound => ({ ...DEFAULT_DISPLAY_SOUND, ...(settings.sound ?? {}) });
export const gardenAmountWithDefaults = (settings: DisplaySettings): DisplayGardenAmount => settings.gardenAmount ?? 'all-active';
const displayName = (id: DisplayScreenId): string => SCREEN_INFO[id].title;

function sameSettingValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => sameSettingValue(value, right[index]));
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord);
    const rightKeys = Object.keys(rightRecord);
    if (leftKeys.length !== rightKeys.length || leftKeys.some((key) => !Object.prototype.hasOwnProperty.call(rightRecord, key))) return false;
    return leftKeys.every((key) => sameSettingValue(leftRecord[key], rightRecord[key]));
  }
  return false;
}

export const displayChanges = (current: DisplaySettings, next: Partial<DisplaySettings>): Partial<DisplaySettings> => {
  const changes: Partial<DisplaySettings> = {};
  for (const [key, value] of Object.entries(next)) {
    if (!sameSettingValue(current[key as keyof DisplaySettings], value)) {
      (changes as Record<string, unknown>)[key] = value;
    }
  }
  return changes;
};

function Toggle({
  label,
  hint,
  pressed,
  onChange,
  disabled = false,
}: {
  label: string;
  hint: string;
  pressed: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleText}>
        <p className={styles.toggleTitle}>{label}</p>
        <p className={styles.toggleHint}>{hint}</p>
      </div>
      <button
        type="button"
        className={`${styles.switch} ${pressed ? styles.switchOn : ''}`}
        aria-label={`Toggle ${label}`}
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onChange}
      >
        <span className={styles.switchKnob} aria-hidden="true" />
      </button>
    </div>
  );
}

function PlaylistEditor({
  playlist,
  durationOverrides,
  setPlaylist,
  setDurationOverrides,
}: {
  playlist: DisplayPlaylistEntry[];
  durationOverrides: NonNullable<DisplaySettings['durationOverrides']>;
  setPlaylist: (next: DisplayPlaylistEntry[]) => void;
  setDurationOverrides: (next: NonNullable<DisplaySettings['durationOverrides']>) => void;
}) {
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const activeCount = playlist.filter((entry) => entry.enabled).length;
  const available = DISPLAY_SCREEN_IDS.filter((id) => !playlist.some((entry) => entry.id === id));

  const remove = (id: DisplayScreenId) => {
    const next = playlist.filter((entry) => entry.id !== id);
    if (!next.some((entry) => entry.enabled)) {
      setPlaylistError('Keep at least one screen enabled. Restore another screen before removing this one.');
      return;
    }
    setPlaylistError(null);
    setPlaylist(next);
  };

  const restore = (id: DisplayScreenId) => {
    setPlaylistError(null);
    setPlaylist([...playlist, { id, enabled: true }]);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= playlist.length) return;
    const next = [...playlist];
    [next[index], next[target]] = [next[target], next[index]];
    setPlaylist(next);
  };

  const toggle = (entry: DisplayPlaylistEntry) => {
    if (entry.enabled && activeCount === 1) {
      setPlaylistError('Keep at least one screen enabled. Remove this screen instead if you want it out of the playlist.');
      return;
    }
    setPlaylistError(null);
    setPlaylist(playlist.map((candidate) => candidate.id === entry.id ? { ...candidate, enabled: !candidate.enabled } : candidate));
  };

  const updateDuration = (id: DisplayScreenId, raw: string) => {
    if (raw === '') {
      const next = { ...durationOverrides };
      delete next[id];
      setDurationOverrides(next);
      return;
    }
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < 12 || value > 120) return;
    setDurationOverrides({ ...durationOverrides, [id]: value });
  };

  return (
    <div className={styles.playlistEditor}>
      <div className={styles.playlistHeader}><div><p className={styles.eyebrow}>Fixed playlist</p><h2 className={styles.sectionTitle}>What the display can show</h2><p className={styles.sectionHint}>Choose the screens, their order, and any safe reading-time adjustments. The Garden returns between enabled screens to keep the TV View garden-led. One screen must stay enabled.</p></div><span className={styles.countPill}>{activeCount} active</span></div>
      {playlistError ? <div className={styles.inlineError} role="alert">{playlistError}</div> : null}
      <ol className={styles.playlistList} aria-label="Display playlist">
        {playlist.map((entry, index) => {
          const screen = SCREEN_INFO[entry.id];
          const override = durationOverrides[entry.id];
          const swatchClass = styles[`swatch${screen.color[0].toUpperCase()}${screen.color.slice(1)}` as keyof typeof styles];
          return (
            <li key={entry.id} className={`${styles.playlistItem} ${entry.enabled ? '' : styles.playlistItemOff}`}>
              <div className={`${styles.screenSwatch} ${swatchClass}`} aria-hidden="true"><span>{String(index + 1).padStart(2, '0')}</span></div>
              <div className={styles.playlistDetails}>
                <div className={styles.playlistItemTitleRow}><div><h3 className={styles.playlistItemTitle}>{screen.title}</h3><p className={styles.playlistItemDescription}>{screen.description}</p></div><span className={entry.enabled ? styles.enabledPill : styles.offPill}>{entry.enabled ? 'Included' : 'Paused'}</span></div>
                <div className={styles.playlistActions}>
                  <button type="button" className={styles.textButton} onClick={() => toggle(entry)} aria-pressed={entry.enabled}>{entry.enabled ? 'Pause screen' : 'Include screen'}</button>
                  <label className={styles.durationControl} htmlFor={`duration-${entry.id}`}><span>Seconds</span><input id={`duration-${entry.id}`} className={styles.durationInput} type="number" min={12} max={120} step={1} value={override ?? ''} placeholder="Default" aria-label={`${screen.title} duration override in seconds`} onChange={(event) => updateDuration(entry.id, event.target.value)} /></label>
                  <button type="button" className={styles.iconButton} onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${screen.title} up`} title="Move up">↑</button>
                  <button type="button" className={styles.iconButton} onClick={() => move(index, 1)} disabled={index === playlist.length - 1} aria-label={`Move ${screen.title} down`} title="Move down">↓</button>
                  <button type="button" className={styles.textButtonDanger} onClick={() => remove(entry.id)} aria-label={`Remove ${screen.title}`}>Remove</button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {available.length > 0 ? <div className={styles.restorePanel}><p className={styles.restoreTitle}>Restore a removed screen</p><div className={styles.restoreButtons}>{available.map((id) => <button key={id} type="button" className={styles.restoreButton} onClick={() => restore(id)}>+ {displayName(id)}</button>)}</div></div> : null}
    </div>
  );
}

export function DisplayControls() {
  const session = useAdminSession();
  const [settings, setSettings] = useState<DisplaySettings | null>(null);
  const [aggregate, setAggregate] = useState<Overview['aggregate'] | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<'sample' | 'approved'>('sample');
  const [gardenInput, setGardenInput] = useState('');
  const [gardenInputError, setGardenInputError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi<Overview>('/api/admin/overview');
      setSettings(response.settings);
      setAggregate(response.aggregate);
      setDraft({});
      setGardenInput(response.settings.gardenAmount && response.settings.gardenAmount !== 'all-active' ? String(response.settings.gardenAmount) : '');
      setGardenInputError(null);
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const effective = useMemo(() => {
    if (!settings) return null;
    return {
      mode: draft.mode ?? settings.mode,
      pauseArrivals: draft.pauseArrivals ?? settings.pauseArrivals,
      pauseRotation: draft.pauseRotation ?? settings.pauseRotation,
      gardenAmount: draft.gardenAmount ?? gardenAmountWithDefaults(settings),
      playlist: draft.playlist ?? playlistWithDefaults(settings),
      tempo: draft.tempo ? legacyTempo({ ...settings, tempo: draft.tempo }) : legacyTempo(settings),
      durationOverrides: draft.durationOverrides ?? settings.durationOverrides ?? {},
      effects: draft.effects ?? effectsWithDefaults(settings),
      sound: draft.sound ?? soundWithDefaults(settings),
    };
  }, [draft, settings]);

  const changes = useMemo(() => settings ? displayChanges(settings, draft) : {}, [draft, settings]);
  const setValue = <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!settings || !Object.keys(changes).length || gardenInputError) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await adminJson<DisplaySettings>('/api/admin/settings', { expectedVersion: settings.version, changes });
      setSettings(updated);
      setDraft({});
      setGardenInput(updated.gardenAmount && updated.gardenAmount !== 'all-active' ? String(updated.gardenAmount) : '');
      setNotice('Settings saved. Open TV View screens apply them when they refresh.');
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const setPlaylist = (playlist: DisplayPlaylistEntry[]) => setValue('playlist', playlist);
  const setDurationOverrides = (durationOverrides: NonNullable<DisplaySettings['durationOverrides']>) => setValue('durationOverrides', durationOverrides);
  const setEffects = (key: keyof DisplayEffects) => {
    const current = effective?.effects ?? DEFAULT_DISPLAY_EFFECTS;
    setValue('effects', { ...current, [key]: !current[key] });
  };
  const setSound = (key: keyof DisplaySound, value?: boolean | number) => {
    const current = effective?.sound ?? DEFAULT_DISPLAY_SOUND;
    const nextValue = value ?? !current[key];
    setValue('sound', { ...current, [key]: nextValue } as DisplaySound);
  };

  const chooseGardenAmount = (value: DisplayGardenAmount) => {
    setGardenInputError(null);
    if (value === 'all-active') setGardenInput('');
    setValue('gardenAmount', value);
  };

  const changeGardenInput = (value: string) => {
    setGardenInput(value);
    if (value === '') {
      setGardenInputError('Enter a positive whole number or choose All active.');
      return;
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      setGardenInputError('Use a positive whole number. There is no display amount cap.');
      return;
    }
    setGardenInputError(null);
    chooseGardenAmount(parsed);
  };

  if (loading) return <div className={styles.skeleton} aria-label="Loading display controls" />;
  if (error && !settings) return <div className={styles.error} role="alert">{error} <button type="button" className={styles.retryButton} onClick={() => void load()}>Try again</button></div>;
  if (!settings || !effective) return null;

  const modeLabel = effective.mode[0].toUpperCase() + effective.mode.slice(1);
  const sound = effective.sound;
  const effects = effective.effects;
  const previewSettings = { ...settings, ...effective, gardenAmount: effective.gardenAmount, playlist: effective.playlist, tempo: effective.tempo, effects, sound } as DisplaySettings;

  return (
    <div className={styles.studio}>
      {notice ? <div className={styles.success} role="status">{notice}</div> : null}
      {error ? <div className={styles.error} role="alert">{error}</div> : null}

      <section className={styles.heroGrid} aria-label="Display studio overview">
        <article className={styles.heroCard}>
          <div className={styles.heroHeader}><div><p className={styles.eyebrow}>Owner display studio</p><h2 className={styles.heroTitle}>Shape the living wall</h2><p className={styles.heroDescription}>Tune a fixed set of campaign screens for open TV View displays. Your changes stay within the approved campaign experience.</p></div><span className={styles.modeBadge}>{modeLabel}</span></div>
          <DisplayStudioPreview aggregate={aggregate} settings={previewSettings} source={preview} sessionKey={session?.id ?? null} onSourceChange={setPreview} />
        </article>
        <article className={styles.statusCard}>
          <div className={styles.cardHeader}><div><p className={styles.eyebrow}>Approved settings</p><h2 className={styles.sectionTitle}>Current display state</h2><p className={styles.sectionHint}>These are the current global settings for open TV View screens.</p></div><span className={styles.approvedPill}>{modeLabel}</span></div>
          <div className={styles.statusList}><div><span>Screen updates</span><strong>{effective.pauseRotation ? 'Paused' : 'Enabled'}</strong></div><div><span>New arrivals</span><strong>{effective.pauseArrivals ? 'Paused' : 'Enabled'}</strong></div><div><span>Current campaign totals</span><strong>{aggregate?.recognitions ?? 0} recognitions · {aggregate?.expressionTotal ?? 0} expressions</strong></div></div>
          <p className={styles.statusNote}>The preview shows the selected TV screen. Current approved content is read-only and never changes the live display.</p>
          <button type="button" className={styles.quietButton} onClick={() => void load()} disabled={loading}>Refresh global settings</button>
        </article>
      </section>

      <section className={styles.controlGrid} aria-label="Display settings">
        <article className={styles.controlCard}>
          <div className={styles.cardHeader}><div><p className={styles.eyebrow}>Playback rhythm</p><h2 className={styles.sectionTitle}>Global tempo</h2><p className={styles.sectionHint}>Choose the movement pace for every screen.</p></div></div>
          <div className={styles.tempoGroup} role="group" aria-label="Global tempo">{TEMPOS.map((tempo) => <button key={tempo.id} type="button" className={`${styles.tempoButton} ${effective.tempo === tempo.id ? styles.tempoButtonActive : ''}`} aria-pressed={effective.tempo === tempo.id} onClick={() => setValue('tempo', tempo.id)}><span>{tempo.label}</span><small>{tempo.hint}</small></button>)}</div>
          <div className={styles.settingDivider} />
          <Toggle label="Pause new arrivals" hint="Stops arrival interruptions while the campaign remains available." pressed={effective.pauseArrivals} onChange={() => setValue('pauseArrivals', !effective.pauseArrivals)} />
          <Toggle label="Pause rotation" hint="Keeps the current display state from advancing." pressed={effective.pauseRotation} onChange={() => setValue('pauseRotation', !effective.pauseRotation)} />
          <div className={styles.legacyModeControl}><p className={styles.fieldLabel}>Display mode</p><div className={styles.modeGroup} role="group" aria-label="Display mode">{(['normal', 'quiet', 'neutral'] as const).map((mode) => <button key={mode} type="button" className={`${styles.modeButton} ${effective.mode === mode ? styles.modeButtonActive : ''}`} aria-pressed={effective.mode === mode} onClick={() => setValue('mode', mode)}>{mode[0].toUpperCase() + mode.slice(1)}</button>)}</div><p className={styles.fieldHint}>{effective.mode === 'neutral' ? 'Neutral hides personal content immediately.' : effective.mode === 'quiet' ? 'Quiet keeps the screen calm and suppresses arrival emphasis.' : 'Normal allows approved content and arrivals.'}</p></div>
        </article>

        <article className={styles.controlCard}>
          <div className={styles.cardHeader}><div><p className={styles.eyebrow}>Recognition Garden</p><h2 className={styles.sectionTitle}>Garden amount</h2><p className={styles.sectionHint}>Choose all active recognitions or a positive number. Available content still controls the fair rotation.</p></div></div>
          <div className={styles.amountChoices} role="group" aria-label="Garden amount"><button type="button" className={`${styles.amountButton} ${effective.gardenAmount === 'all-active' ? styles.amountButtonActive : ''}`} aria-pressed={effective.gardenAmount === 'all-active'} onClick={() => chooseGardenAmount('all-active')}><span className={styles.amountValue}>All active</span><span>Let the Garden include every approved recognition.</span></button><label className={`${styles.amountButton} ${effective.gardenAmount !== 'all-active' ? styles.amountButtonActive : ''}`}><span className={styles.amountValue}>Custom amount</span><input className={styles.amountInput} type="number" min={1} step={1} inputMode="numeric" value={gardenInput} placeholder="For example, 12" aria-label="Custom Garden amount" aria-invalid={gardenInputError ? 'true' : 'false'} onChange={(event) => changeGardenInput(event.target.value)} /><span>No user-facing maximum.</span></label></div>
          {gardenInputError ? <p className={styles.fieldError} role="alert">{gardenInputError}</p> : null}
          <div className={styles.amountCallout}><span className={styles.calloutIcon} aria-hidden="true">✦</span><p>Numbers above the available approved content stay fair and bounded on the display. They do not create empty bubbles.</p></div>
        </article>

        <article className={`${styles.controlCard} ${styles.controlCardWide}`}><PlaylistEditor playlist={effective.playlist} durationOverrides={effective.durationOverrides} setPlaylist={setPlaylist} setDurationOverrides={setDurationOverrides} /></article>

        <article className={styles.controlCard}>
          <div className={styles.cardHeader}><div><p className={styles.eyebrow}>Atmosphere</p><h2 className={styles.sectionTitle}>Visual effects</h2><p className={styles.sectionHint}>Keep decoration supportive of readable messages.</p></div></div>
          <Toggle label="Show trails" hint="Decorative trails remain behind readable text." pressed={effects.trails} onChange={() => setEffects('trails')} />
          <Toggle label="Show constellations" hint="Links correspond to shared expressions." pressed={effects.constellations} onChange={() => setEffects('constellations')} />
          <Toggle label="Show sparkles" hint="Adds a restrained shimmer to the garden." pressed={Boolean(effects.sparkles)} onChange={() => setEffects('sparkles')} />
          <Toggle label="Background decoration" hint="Adds the soft color field behind each screen." pressed={Boolean(effects.background)} onChange={() => setEffects('background')} />
          <div className={styles.effectsNote} role="status"><span className={styles.statusDot} aria-hidden="true" />Owner effects: {effects.background && effects.sparkles && effects.trails && effects.constellations ? 'all selected effects are enabled.' : 'the selected effect set is applied exactly as configured.'}</div>
        </article>

        <article className={styles.controlCard}>
          <div className={styles.cardHeader}><div><p className={styles.eyebrow}>Gentle sound</p><h2 className={styles.sectionTitle}>Sound and chimes</h2><p className={styles.sectionHint}>Sound remains optional and quiet. Arrival and milestone chimes are independent.</p></div><span className={sound.enabled ? styles.soundBadge : styles.offPill}>{sound.enabled ? 'Enabled' : 'Off'}</span></div>
          <Toggle label="Enable sound" hint="Allow soft display audio where the TV supports it." pressed={sound.enabled} onChange={() => setSound('enabled')} />
          <div className={styles.volumeField}><label className={styles.fieldLabel} htmlFor="display-volume">Volume</label><div className={styles.volumeRow}><input id="display-volume" className={styles.volumeRange} type="range" min={0} max={0.4} step={0.01} value={sound.volume} aria-valuetext={`${Math.round(sound.volume * 100)} percent`} onChange={(event) => setSound('volume', Number(event.target.value))} /><output htmlFor="display-volume" className={styles.volumeValue}>{Math.round(sound.volume * 100)}%</output></div><p className={styles.fieldHint}>Gentle volume is capped for the shared room.</p></div>
          <Toggle label="Arrival chime" hint="A soft note when a new approved recognition joins." pressed={sound.arrivalChime} onChange={() => setSound('arrivalChime')} disabled={!sound.enabled} />
          <Toggle label="Milestone chime" hint="A soft note for every 25 approved recognitions." pressed={sound.milestoneChime} onChange={() => setSound('milestoneChime')} disabled={!sound.enabled} />
        </article>
      </section>

      <section className={styles.collectionCard}><div><p className={styles.eyebrow}>Campaign availability</p><h2 className={styles.sectionTitle}>{settings.collectionOpen ? 'Collection is open' : 'Collection is closed'}</h2><p className={styles.sectionHint}>Missing configuration or an unhealthy cleanup service keeps collection closed.</p></div><div className={styles.collectionActions}><span className={session?.role === 'owner' ? styles.ownerPill : styles.offPill}>{session?.role === 'owner' ? 'Owner only' : 'Owner required'}</span><Toggle label="Toggle collection availability" hint={session?.role === 'owner' ? 'This changes whether the public form accepts new recognitions.' : 'A moderator can operate display settings but cannot change collection availability.'} pressed={settings.collectionOpen} disabled={session?.role !== 'owner'} onChange={() => setValue('collectionOpen', !settings.collectionOpen)} /></div></section>

      <div className={styles.saveBar}><div><p className={styles.saveTitle}>{Object.keys(changes).length ? 'Unsaved studio changes' : 'All studio changes saved'}</p><p className={styles.saveHint}>Save when the preview and playlist feel right. Open TV View screens use the next refresh.</p></div><div className={styles.saveActions}><button type="button" className={styles.saveButton} onClick={() => void save()} disabled={saving || !Object.keys(changes).length || Boolean(gardenInputError)}>{saving ? 'Saving...' : 'Save display settings'}</button><button type="button" className={styles.cancelButton} onClick={() => { setDraft({}); setGardenInput(settings.gardenAmount && settings.gardenAmount !== 'all-active' ? String(settings.gardenAmount) : ''); setGardenInputError(null); }}>Cancel</button></div></div>
    </div>
  );
}
