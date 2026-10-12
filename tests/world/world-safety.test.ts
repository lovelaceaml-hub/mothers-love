import { describe, expect, it } from "vitest";
import { validateColorPolishSnapshot } from "@/lib/color-polish/validation";
import { ArrivalDirector } from "@/components/display/world/arrival-director";
import { RecognitionDirector } from "@/components/display/world/recognition-director";
import {
  WorldFeedStore,
  readingSeconds,
  sampleWorldFeed,
} from "@/components/display/world/world-feed";
import { messagePages } from "@/components/display/world/reading";
import { snapshot } from "./fixtures";
const records = sampleWorldFeed().records;
const event = {
  eventId: "1",
  recognitionId: records[0].id,
  publishedAt: records[0].firstPublishedAt!,
};

describe("verified public world feed", () => {
  it("uses a fixture accepted by the existing public contract", () => {
    expect(validateColorPolishSnapshot(snapshot())).not.toBeNull();
  });
  it("suppresses historical entrances and deduplicates a fresh delta", () => {
    const store = new WorldFeedStore();
    expect(store.accept(snapshot({ arrivals: [event] }), 0)).toBe(true);
    expect(store.view(0).arrivals).toEqual([]);
    const next = { ...event, eventId: "2" };
    store.accept(snapshot({ sync: "delta", arrivals: [next] }), 5000);
    const view = store.view(5000);
    expect(view.arrivals).toEqual([records[0].id]);
    store.confirmArrivals(view.arrivals);
    store.accept(snapshot({ sync: "delta", arrivals: [next] }), 10000);
    expect(store.view(10000).arrivals).toEqual([]);
  });
  it("removes withdrawn records and queued entrances immediately", () => {
    const store = new WorldFeedStore();
    store.accept(snapshot(), 0);
    store.accept(snapshot({ sync: "delta", arrivals: [event] }), 1);
    store.accept(snapshot({ recognitions: [], sync: "delta" }), 2);
    expect(store.view(2).records).toEqual([]);
    expect(store.view(2).arrivals).toEqual([]);
  });
  it("clears all personal content for quiet, neutral, disabled, invalid and authorization failure", () => {
    for (const mode of ["quiet", "neutral"]) {
      const store = new WorldFeedStore();
      const value = snapshot();
      store.accept(value, 0);
      store.accept(
        {
          ...value,
          settings: { ...value.settings, mode },
          recognitions: [],
          arrivals: [],
        },
        1,
      );
      expect(store.view(1).records).toEqual([]);
      expect(store.view(1).phase).toBe(mode);
    }
    const store = new WorldFeedStore();
    store.accept(snapshot(), 0);
    store.accept({ invalid: true }, 1);
    expect(store.view(1).snapshot).toBeNull();
    const value = snapshot();
    store.accept(value, 2);
    store.accept(
      { ...value, presentation: { ...value.presentation, enabled: false } },
      3,
    );
    expect(store.view(3).phase).toBe("disabled");
    store.accept(value, 4);
    store.failure(true);
    expect(store.view(4).records).toEqual([]);
  });
  it("retains planned pauses but still expires records and clears genuine failures", () => {
    const store = new WorldFeedStore();
    const value = snapshot();
    store.accept(value, 0);
    expect(store.view(600_000, true).records.length).toBeGreaterThan(0);
    expect(store.view(600_000, true).snapshot?.serverTime).toBe(value.serverTime);
    store.failure();
    expect(store.view(600_000, true).records).toEqual([]);
    const expiresAt = new Date(Date.parse(value.serverTime) + 10_000).toISOString();
    store.accept({ ...value, recognitions: [{ ...records[0], expiresAt }] }, 700_000);
    expect(store.view(710_000, true).records).toEqual([]);
  });
  it("expires offline without using the wall clock and clears at sixty seconds", () => {
    const store = new WorldFeedStore();
    const value = snapshot();
    const expires = new Date(
      Date.parse(value.serverTime) + 10000,
    ).toISOString();
    store.accept(
      { ...value, recognitions: [{ ...records[0], expiresAt: expires }] },
      1000,
    );
    store.failure();
    expect(store.view(10999).records).toHaveLength(1);
    expect(store.view(11000).records).toHaveLength(0);
    expect(store.view(61000).snapshot).toBeNull();
  });
  it("cannot rewind expiry with an older server clock", () => {
    const store = new WorldFeedStore();
    const value = snapshot();
    const expires = new Date(
      Date.parse(value.serverTime) + 10000,
    ).toISOString();
    store.accept(
      { ...value, recognitions: [{ ...records[0], expiresAt: expires }] },
      0,
    );
    store.view(11000);
    store.accept(
      { ...value, recognitions: [{ ...records[0], expiresAt: expires }] },
      12000,
    );
    expect(store.view(12000).records).toEqual([]);
  });
  it("reset and pause arrivals suppress queued work; reconnect never replays history", () => {
    const store = new WorldFeedStore();
    const value = snapshot();
    store.accept(value, 0);
    store.accept({ ...value, sync: "delta", arrivals: [event] }, 1);
    store.accept({ ...value, arrivals: [event] }, 2);
    expect(store.view(2).arrivals).toEqual([]);
    store.clear();
    store.accept({ ...value, sync: "delta", arrivals: [event] }, 3);
    expect(store.view(3).arrivals).toEqual([]);
    store.accept(
      {
        ...value,
        sync: "delta",
        settings: { ...value.settings, pauseArrivals: true },
        arrivals: [{ ...event, eventId: "2" }],
      },
      4,
    );
    expect(store.view(4).arrivals).toEqual([]);
  });
});

describe("grand entrances and fair reading", () => {
  it("does not start over a paused or unfinished reading interval", () => {
    const director = new ArrivalDirector();
    director.enqueue([records[0].id]);
    expect(director.update(0, records, true, 24, false).phase).toBe("idle");
    expect(director.update(1, records, true, 24, false, false).phase).toBe(
      "idle",
    );
    expect(director.update(1, records, true, 24, false, true).phase).toBe(
      "approach",
    );
  });
  it("gives all five arrivals a full reading phase, then returns", () => {
    const director = new ArrivalDirector();
    director.enqueue(records.slice(0, 5).map((r) => r.id));
    const read = new Map<string, number>();
    let returned = false;
    for (let n = 0; n < 250; n++) {
      const state = director.update(1, records, true, 24, false);
      if (state.phase === "reading")
        read.set(state.id!, (read.get(state.id!) ?? 0) + 1);
      if (state.phase === "return") returned = true;
    }
    expect([...read.keys()]).toEqual(records.slice(0, 5).map((r) => r.id));
    expect([...read.values()].every((value) => value >= 24)).toBe(true);
    expect(returned).toBe(true);
    expect(director.state().phase).toBe("idle");
  });
  it("removal and owner pause cancel active personal content", () => {
    const director = new ArrivalDirector();
    director.enqueue([records[0].id]);
    director.update(1, records, true, 24, false);
    expect(director.update(1, [], true, 24, false).id).toBeNull();
    director.update(1, records, false, 24, false);
    expect(director.state().phase).toBe("idle");
  });
  it("reduced motion skips approach and reveal", () => {
    const director = new ArrivalDirector();
    director.enqueue([records[0].id]);
    expect(director.update(1, records, true, 24, true).phase).toBe("reading");
  });
  it("fairly visits every record, freezes when held, prunes removed IDs", () => {
    const director = new RecognitionDirector(),
      seen = new Set<string | null>();
    for (let i = 0; i < records.length; i++) {
      director.update(90, records, 24, false);
      seen.add(director.id);
    }
    expect(seen.size).toBe(records.length);
    const id = director.id;
    director.update(100, records, 24, true);
    expect(director.id).toBe(id);
    director.update(0, [], 24, true);
    expect(director.id).toBeNull();
  });
  it("preserves every character while paging long and multiline messages", () => {
    for (const text of [
      "A warm word. ".repeat(42),
      "Kindness\n".repeat(55),
      "好".repeat(500),
      "👨‍👩‍👧‍👦 é ".repeat(90),
    ]) {
      const pages = messagePages(text);
      expect(pages.join("")).toBe(text);
      expect(
        pages.every(
          (page) =>
            [
              ...new Intl.Segmenter(undefined, {
                granularity: "grapheme",
              }).segment(page),
            ].length <= 220,
        ),
      ).toBe(true);
      expect(pages.every((page) => page.split("\n").length <= 6)).toBe(true);
    }
    expect(readingSeconds("word ".repeat(100), 20)).toBeGreaterThan(49);
  });
});

it("converts an active entrance to still reading without dropping queued recognitions", () => {
  const director = new ArrivalDirector();
  director.enqueue(records.slice(0, 2).map((record) => record.id));
  director.update(1, records, true, 24, false);
  director.reduceMotion(records, 24);
  expect(director.state().phase).toBe("reading");
  expect(director.state().id).toBe(records[0].id);
  director.update(24, records, true, 24, true);
  director.update(1, records, true, 24, true);
  expect(director.state().phase).toBe("reading");
  expect(director.state().id).toBe(records[1].id);
});

it("does not mark or advance invisible recognitions, and retains fairness across filtered scenes", () => {
  const director = new RecognitionDirector();
  director.update(100, records, 24, false, false, records);
  expect(director.id).toBeNull();
  director.update(0, records, 24, false, true, records);
  expect(director.id).toBe(records[0].id);
  director.update(8, records, 24, false, true, records);
  director.update(100, records, 24, true, false, records);
  expect(director.age).toBe(8);
  director.update(0, [records[1]], 24, true, true, records);
  director.next(records);
  expect(director.id).toBe(records[2].id);
});

it("sample calendar and campaign insights are derived from the displayed fictional stories", () => {
  const feed = sampleWorldFeed();
  expect(feed.snapshot!.insights.month.recognitions).toBe(feed.records.length);
  for (const day of feed.snapshot!.insights.calendar) {
    const matching = feed.records.filter(
      (record) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(record.firstPublishedAt!)) === day.periodStart,
    );
    expect(day.recognitions).toBe(matching.length);
    expect(day.expressionTotal).toBe(
      matching.reduce((sum, record) => sum + record.expressionIds.length, 0),
    );
  }
});

it("withdrawal of the current arrival preserves the other eligible wave members", () => {
  for (const stillConversion of [false, true]) {
    const director = new ArrivalDirector();
    director.enqueue(records.slice(0, 5).map((record) => record.id));
    director.update(1, records, true, 24, false);
    const eligible = records.slice(1);
    if (stillConversion) director.reduceMotion(eligible, 24);
    else director.update(0, eligible, true, 24, false);
    expect(director.state().id).toBeNull();
    const read = new Set<string>();
    for (let i = 0; i < 240; i++) {
      const state = director.update(1, eligible, true, 24, stillConversion);
      if (state.phase === "reading") read.add(state.id!);
    }
    expect([...read]).toEqual(records.slice(1, 5).map((record) => record.id));
    expect(director.state().phase).toBe("idle");
  }
});

it("permanently removes a withdrawn unshown wave member before a later restoration", () => {
  const director = new ArrivalDirector();
  director.enqueue(records.slice(0, 3).map((record) => record.id));
  director.update(1, records, true, 24, true);
  director.update(
    0,
    records.filter((record) => record.id !== records[1].id),
    true,
    24,
    true,
  );
  expect(director.state().waveSize).toBe(2);
  const read = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const state = director.update(1, records, true, 24, true);
    if (state.phase === "reading") read.add(state.id!);
  }
  expect([...read]).toEqual([records[0].id, records[2].id]);
});

it("restarts a full arrival reading interval after content or reading settings change", () => {
  for (const changedContent of [false, true]) {
    const director = new ArrivalDirector();
    director.enqueue([records[0].id]);
    director.update(1, records, true, 24, true);
    director.update(23, records, true, 24, true);
    const revised = changedContent
      ? [
          { ...records[0], message: "Kindness ".repeat(55) },
          ...records.slice(1),
        ]
      : records;
    const minimum = changedContent ? 24 : 60;
    const reset = director.update(0, revised, true, minimum, true);
    expect(reset.phase).toBe("reading");
    expect(reset.age).toBe(0);
    expect(
      director.update(
        readingSeconds(revised[0].message, minimum) - 1,
        revised,
        true,
        minimum,
        true,
      ).phase,
    ).toBe("reading");
    expect(director.update(1, revised, true, minimum, true).phase).toBe(
      "settle",
    );
  }
});

it("gives an edited ordinary story a fresh full reading interval", () => {
  const director = new RecognitionDirector();
  director.update(0, records, 24, false);
  director.update(20, records, 24, false);
  const revised = [
    { ...records[0], message: "Kindness ".repeat(55) },
    ...records.slice(1),
  ];
  director.update(0, revised, 24, false);
  expect(director.age).toBe(0);
  expect(director.id).toBe(records[0].id);
  director.update(20, revised, 24, false);
  director.update(0, revised, 60, true);
  expect(director.age).toBe(0);
  expect(director.remaining(revised, 60)).toBe(60);
});

it("clears reading change trackers when personal content is removed", () => {
  const arrival = new ArrivalDirector();
  arrival.enqueue([records[0].id]);
  arrival.update(1, records, true, 24, true);
  arrival.cancel();
  expect(JSON.stringify(arrival)).not.toContain(records[0].message);
  const reading = new RecognitionDirector();
  reading.update(0, records, 24, false);
  reading.update(1, records, 24, false);
  reading.update(0, [], 24, true, false, []);
  expect(JSON.stringify(reading)).not.toContain(records[0].message);
});

it("reopens full reading when visible content changes during arrival settlement", () => {
  for (const changedContent of [true, false]) {
    const director = new ArrivalDirector();
    director.enqueue([records[0].id]);
    director.update(1, records, true, 24, false);
    director.update(5, records, true, 24, false);
    director.update(5, records, true, 24, false);
    director.update(
      readingSeconds(records[0].message, 24),
      records,
      true,
      24,
      false,
    );
    expect(director.state().phase).toBe("settle");
    const revised = changedContent
      ? [
          {
            ...records[0],
            recipient: "Updated fictional friend",
            message: "Kindness ".repeat(55),
          },
          ...records.slice(1),
        ]
      : records;
    const minimum = changedContent ? 24 : 60;
    const state = director.update(0, revised, true, minimum, false);
    expect(state.phase).toBe("reading");
    expect(state.age).toBe(0);
    expect(
      director.update(
        readingSeconds(revised[0].message, minimum) - 1,
        revised,
        true,
        minimum,
        false,
      ).phase,
    ).toBe("reading");
  }
});

it("uses the replacement reading duration when a message or minimum becomes shorter", () => {
  const director = new ArrivalDirector();
  const long = [
    { ...records[0], message: "Kindness ".repeat(55) },
    ...records.slice(1),
  ];
  director.enqueue([records[0].id]);
  director.update(1, long, true, 60, true);
  director.update(30, long, true, 60, true);
  director.update(0, records, true, 8, true);
  const duration = readingSeconds(records[0].message, 8);
  expect(director.update(duration - 1, records, true, 8, true).phase).toBe(
    "reading",
  );
  expect(director.update(1, records, true, 8, true).phase).toBe("settle");
});

it("finishes a departing story without selecting an unseen replacement or losing fairness", () => {
  const director = new RecognitionDirector();
  director.update(0, records, 60, false);
  director.finishReading();
  expect(director.id).toBeNull();
  director.update(100, records, 60, true, false, records);
  expect(director.id).toBeNull();
  director.update(0, records, 60, false, true, records);
  expect(director.id).toBe(records[1].id);
  expect(director.age).toBe(0);
});

it("counts a completed new arrival before choosing among older unseen stories", () => {
  const director = new RecognitionDirector();
  director.select(records[0].id, records);
  director.noteCompletedArrival(records[records.length - 1].id, records);
  director.finishReading();
  const newestFirst = [records[records.length - 1], ...records.slice(0, -1)];
  director.update(0, newestFirst, 24, false);
  expect(director.id).toBe(records[1].id);
});
