import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');

const now = Date.now();

export const FEED_ITEMS = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    recipient: 'David K.',
    message: 'Thank you for your steady encouragement during practice. Your warm words helped our whole group find confidence.',
    expressionIds: [2, 6, 8],
    firstPublishedAt: new Date(now - 15 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    recipient: 'Sarah M.',
    message: 'Your cheerful greeting at the door every morning brings comfort and a smile to everyone walking in.',
    expressionIds: [1, 4],
    firstPublishedAt: new Date(now - 45 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    recipient: 'James T.',
    message: 'Thank you for taking time to listen when things were complicated. Your thoughtful guidance meant a great deal.',
    expressionIds: [3, 7],
    firstPublishedAt: new Date(now - 90 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    recipient: 'Elena R.',
    message: 'When things felt overwhelming earlier this week, your gentle patience and warm encouragement helped me pause, take a breath, and keep moving forward with peace in my heart. Thank you for always listening so carefully and reminding everyone around you that they are deeply valued and appreciated.',
    expressionIds: [5, 9],
    firstPublishedAt: new Date(now - 135 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    recipient: 'Marcus B.',
    message: 'I really appreciated your help moving the supplies yesterday. You noticed what was needed and stepped right in.',
    expressionIds: [2, 8],
    firstPublishedAt: new Date(now - 180 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    recipient: 'Chloe H.',
    message: 'Your kind reassurance reminded me that mistakes happen and that we can always learn and grow together.',
    expressionIds: [4, 7],
    firstPublishedAt: new Date(now - 225 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    recipient: 'Daniel S.',
    message: 'Thank you for your sincere prayers and thoughtful support during our preparation. It made a real difference.',
    expressionIds: [3, 7, 9],
    firstPublishedAt: new Date(now - 270 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    recipient: 'Grace L.',
    message: 'Thank you for helping set up the hall and welcoming everyone with such warmth and joy.',
    expressionIds: [2, 8],
    firstPublishedAt: new Date(now - 315 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000009',
    recipient: 'Samuel W.',
    message: 'Your thoughtful question helped us understand each other better during our discussion.',
    expressionIds: [1, 6],
    firstPublishedAt: new Date(now - 340 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    recipient: 'Maya C.',
    message: 'You did an incredible job organizing the event materials. Thank you for your hard work and care.',
    expressionIds: [2, 9],
    firstPublishedAt: new Date(now - 355 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const REACTION_COUNTS = {
  '00000000-0000-4000-8000-000000000001': 5,
  '00000000-0000-4000-8000-000000000002': 3,
  '00000000-0000-4000-8000-000000000003': 7,
  '00000000-0000-4000-8000-000000000004': 4,
  '00000000-0000-4000-8000-000000000005': 8,
  '00000000-0000-4000-8000-000000000006': 2,
  '00000000-0000-4000-8000-000000000007': 6,
  '00000000-0000-4000-8000-000000000008': 9,
  '00000000-0000-4000-8000-000000000009': 1,
  '00000000-0000-4000-8000-000000000010': 4,
};

export const RECEIPT = {
  id: 'video-fixture-1',
  status: 'published',
  expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

function laDay(isoString) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(isoString));
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(day, amount) {
  const value = new Date(`${day}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function weekStart(day) {
  const value = new Date(`${day}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - value.getUTCDay());
  return value.toISOString().slice(0, 10);
}

export function buildDisplayFixture() {
  const serverTime = new Date().toISOString();
  const day = laDay(serverTime);
  const start = weekStart(day);
  const monthStart = `${day.slice(0, 7)}-01`;
  const campaignStart = '2026-08-30' <= monthStart ? '2026-08-30' : monthStart;

  const currentCounts = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const currentAggregate = {
    periodStart: start,
    periodEnd: day,
    recognitions: 4,
    expressionCounts: currentCounts,
    expressionTotal: 36,
    revision: 6,
  };
  const monthAggregate = {
    periodStart: monthStart,
    periodEnd: day,
    recognitions: 6,
    expressionCounts: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    expressionTotal: 45,
    revision: 9,
  };
  const calendarAggregate = {
    periodStart: day,
    periodEnd: day,
    recognitions: 2,
    expressionCounts: [0, 1, 1, 0, 0, 0, 0, 0, 0],
    expressionTotal: 2,
    revision: 8,
  };
  const presentation = {
    version: 'color-polish-v6',
    enabled: true,
    playlist: [
      ['welcome', 30],
      ['garden', 180],
      ['featured', 30],
      ['calendar', 30],
      ['peacemakers', 60],
      ['status', 30],
      ['expressions', 30],
      ['peace-in-practice', 60],
      ['orbit', 30],
      ['milestone', 30],
    ].map(([id, durationSeconds]) => ({ id, enabled: true, durationSeconds })),
  };
  const settings = {
    version: 7,
    mode: 'normal',
    motion: 'standard',
    pauseArrivals: false,
    pauseRotation: false,
    collectionOpen: true,
    lowActivityMinutes: 20,
    readingSeconds: 20,
    maxBubbles: 4,
    showTrails: true,
    showConstellations: true,
  };

  const displayRecognitions = FEED_ITEMS.map((item) => ({
    id: item.id,
    recipient: item.recipient,
    message: item.message,
    expressionIds: [...item.expressionIds],
    createdAt: item.firstPublishedAt,
    firstPublishedAt: item.firstPublishedAt,
    expiresAt: item.expiresAt,
    version: 1,
    status: 'published',
    featured: false,
  }));

  return {
    ok: true,
    serverTime,
    revision: 12,
    recognitions: displayRecognitions,
    aggregate: monthAggregate,
    settings,
    submissionUrl: 'https://mothers-love.vercel.app/recognize',
    cursor: '12.1789063200',
    sync: 'reset',
    arrivals: [],
    presentation,
    insights: {
      calendar: [calendarAggregate],
      currentWeek: currentAggregate,
      previousWeek: {
        periodStart: addDays(start, -7),
        periodEnd: addDays(start, -1),
        recognitions: 3,
        expressionCounts: [2, 2, 2, 2, 2, 2, 2, 2, 2],
        expressionTotal: 18,
        revision: 5,
      },
      month: monthAggregate,
      campaign: {
        periodStart: campaignStart,
        periodEnd: day,
        recognitions: 9,
        expressionCounts: [2, 3, 4, 5, 6, 7, 8, 9, 10],
        expressionTotal: 54,
        revision: 10,
      },
      goal: {
        weekStart: start,
        weekEnd: addDays(start, 6),
        expressionId: 1,
        value: 0,
        target: 6,
        achieved: false,
      },
    },
  };
}
