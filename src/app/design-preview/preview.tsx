'use client';
import { useState } from 'react';
import { DisplayExperience } from '@/components/display/DisplayExperience';
import { createSamplePreviewSnapshot } from '@/components/display/preview/preview-model';
import type { DisplaySnapshot } from '@/lib/contracts';
export function LocalDesignPreview() {
  const [snapshot, setSnapshot] = useState<DisplaySnapshot>(() => {
    const sample = createSamplePreviewSnapshot();
    const now = Date.now();
    return { ...sample, serverTime: new Date(now).toISOString(),
      recognitions: sample.recognitions.map((item, index) => ({ ...item,
        createdAt: new Date(now - (index + 1) * 60000).toISOString(),
        firstPublishedAt: new Date(now - (index + 1) * 60000).toISOString(),
        expiresAt: new Date(now + 86400000 * 30).toISOString(),
      })),
      settings: { ...sample.settings, motion: 'lively', pauseRotation: false, pauseArrivals: false, sound: { ...sample.settings.sound!, enabled: false } },
      submissionUrl: '', cursor: 'local-sample', sync: 'reset', arrivals: [],
    };
  });
  const addRecognition = () => setSnapshot((previous) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const item = { ...previous.recognitions[0], id, recipient: 'Sample friend', message: 'Thank you for noticing I needed help and making time to listen. Your kindness made today brighter.', expressionIds: [6, 8], createdAt: now, firstPublishedAt: now };
    return { ...previous, revision: previous.revision + 1, recognitions: [...previous.recognitions, item],
      aggregate: { ...previous.aggregate, revision: previous.revision + 1, recognitions: previous.aggregate.recognitions + 1, expressionTotal: previous.aggregate.expressionTotal + 2, expressionCounts: previous.aggregate.expressionCounts.map((count, index) => count + ([5, 7].includes(index) ? 1 : 0)) },
      arrivals: [{ eventId: id, recognitionId: id, publishedAt: now }],
    };
  });
  return <DisplayExperience previewSnapshot={snapshot} onNewRecognition={addRecognition} />;
}
