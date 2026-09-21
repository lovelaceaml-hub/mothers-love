"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import { CAMPAIGN_TAGLINE, EXPRESSIONS } from "@/lib/catalog";
import { DISPLAY_EXTERNAL_URLS, type Recognition } from "@/lib/contracts";
import { readingSeconds, type WorldFeed } from "./world-feed";
import { messagePages } from "./reading";
import type { ZoneId } from "./world-data";
import styles from "./WorldExperience.module.css";

export function WorldDialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const controls = [
        ...(panel.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input, select, [tabindex="0"]',
        ) ?? []),
      ].filter((node) => node.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      className={styles.dialogBackdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className={`${styles.dialog} ${wide ? styles.wideDialog : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.dialogHeader}>
          <h2>{title}</h2>
          <button onClick={onClose} aria-label={`Close ${title}`}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TrustedQR({ url, label }: { url: string; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current)
      void QRCode.toCanvas(canvas.current, url, {
        width: 108,
        margin: 1,
        color: { dark: "#533448", light: "#fffdf5" },
      }).catch(() => undefined);
  }, [url]);
  return (
    <a href={url} target="_blank" rel="noreferrer" className={styles.qr}>
      <canvas ref={canvas} role="img" aria-label={`QR code: ${label}`} />
      <span>
        {label}
        <small>Scan or open</small>
      </span>
    </a>
  );
}

export function RecognitionText({
  record,
  large = false,
  elapsed,
  minimum = 24,
}: {
  record: Recognition;
  large?: boolean;
  elapsed?: number;
  minimum?: number;
}) {
  const pages = messagePages(record.message);
  const page =
    elapsed === undefined
      ? -1
      : Math.min(
          pages.length - 1,
          Math.floor(
            Math.max(0, elapsed) /
              (readingSeconds(record.message, minimum) / pages.length),
          ),
        );
  return (
    <div className={large ? styles.largeRecognition : styles.recognitionText}>
      <h2>{record.recipient}</h2>
      <p className={styles.message}>
        {page < 0 ? record.message : pages[page]}
      </p>
      {pages.length > 1 && page >= 0 && (
        <span className={styles.pageNumber}>
          Message {page + 1} of {pages.length} · Full message in Read
          recognitions
        </span>
      )}
      <div className={styles.expressionTags}>
        {record.expressionIds.map((id) => (
          <span key={id}>
            {EXPRESSIONS.find((expression) => expression.id === id)?.phrase}
          </span>
        ))}
      </div>
    </div>
  );
}

function Calendar({ feed }: { feed: WorldFeed }) {
  const [selected, setSelected] = useState<string | null>(null);
  const days = feed.snapshot?.insights.calendar ?? [];
  const selectedDay = days.find((day) => day.periodStart === selected);
  const selectedRecords = feed.records.filter(
    (record) =>
      record.firstPublishedAt &&
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(record.firstPublishedAt)) === selected,
  );
  return (
    <>
      <div className={styles.cardLabel}>RECOGNITION CALENDAR</div>
      <h2>Kindness, day by day.</h2>
      <div className={styles.calendarDays}>
        {days.map((day) => (
          <button
            key={day.periodStart}
            aria-label={`${day.periodStart}: ${day.recognitions} recognitions`}
            aria-pressed={selected === day.periodStart}
            onClick={() => setSelected(day.periodStart)}
          >
            <span>{Number(day.periodStart.slice(-2))}</span>
            <strong>{day.recognitions}</strong>
          </button>
        ))}
      </div>
      {days.length === 0 ? (
        <p>No activity has been recorded this month yet.</p>
      ) : (
        <p className={styles.smallText}>
          {selectedDay
            ? `${selectedDay.periodStart}: ${selectedDay.recognitions} recognitions and ${selectedDay.expressionTotal} expressions of love.`
            : "Choose a day to see its expressions of love."}
        </p>
      )}
      {selectedDay && (
        <div className={styles.dayStories}>
          {selectedRecords.length ? (
            selectedRecords.map((record) => (
              <RecognitionText key={record.id} record={record} />
            ))
          ) : (
            <p className={styles.smallText}>
              No currently available messages for this day. Its kindness still
              counts.
            </p>
          )}
        </div>
      )}
    </>
  );
}

export function WorldContent({
  zone,
  feed,
  record,
  expressionId,
  onExpression,
  elapsed = 0,
}: {
  zone: ZoneId;
  feed: WorldFeed;
  record?: Recognition;
  expressionId: number;
  onExpression: (id: number) => void;
  elapsed?: number;
}) {
  const expression = EXPRESSIONS[expressionId - 1],
    insights = feed.snapshot?.insights;
  const empty = (
    <>
      <div className={styles.cardLabel}>A PLACE FOR KIND WORDS</div>
      <h2>Love begins with a word.</h2>
      <p>Recognitions will appear here as they become available.</p>
    </>
  );
  if (zone === "expressions" || zone === "practice")
    return (
      <>
        <div className={styles.cardLabel}>
          {zone === "practice"
            ? "PEACE IN DAILY LIFE"
            : `EXPRESSION ${expression.id} OF 9`}
        </div>
        <h2 className={styles.expressionPhrase}>{expression.phrase}</h2>
        <p>{zone === "practice" ? expression.example : expression.principle}</p>
        <div
          className={styles.expressionPicker}
          aria-label="Choose an expression"
        >
          {EXPRESSIONS.map((item) => (
            <button
              key={item.id}
              aria-label={`Expression ${item.id}: ${item.phrase}`}
              aria-pressed={item.id === expression.id}
              onClick={() => onExpression(item.id)}
            >
              {item.id}
            </button>
          ))}
        </div>
        {zone === "practice" && (
          <TrustedQR
            url={DISPLAY_EXTERNAL_URLS.dailyPractice}
            label="Practice a little kindness"
          />
        )}
      </>
    );
  if (zone === "calendar") return <Calendar feed={feed} />;
  if (zone === "status")
    return (
      <>
        <div className={styles.cardLabel}>OUR SHARED IMPACT</div>
        <h2>Love keeps growing.</h2>
        <div className={styles.metrics}>
          <div>
            <strong>
              {insights?.currentWeek.recognitions.toLocaleString() ?? "0"}
            </strong>
            <span>this week</span>
          </div>
          <div>
            <strong>
              {insights?.month.recognitions.toLocaleString() ?? "0"}
            </strong>
            <span>recognitions this month</span>
          </div>
          <div>
            <strong>
              {insights?.campaign.expressionTotal.toLocaleString() ?? "0"}
            </strong>
            <span>expressions across the campaign</span>
          </div>
        </div>
        <div className={styles.countBars}>
          {EXPRESSIONS.map((e, i) => (
            <div key={e.id}>
              <span>{e.id}</span>
              <progress
                aria-label={`Expression ${e.id} this month`}
                value={insights?.month.expressionCounts[i] ?? 0}
                max={Math.max(1, ...(insights?.month.expressionCounts ?? [1]))}
              />
              <strong>{insights?.month.expressionCounts[i] ?? 0}</strong>
            </div>
          ))}
        </div>
      </>
    );
  if (zone === "milestone") {
    const goal = insights?.goal;
    return (
      <>
        <div className={styles.cardLabel}>THIS WEEK&apos;S EXPRESSION GOAL</div>
        <h2>
          {goal?.achieved ? "Kindness is rising." : "Every kind word counts."}
        </h2>
        <p>{EXPRESSIONS[(goal?.expressionId ?? 1) - 1].phrase}</p>
        <div className={styles.goalNumber}>
          {goal?.value ?? 0}
          <span> / {goal?.target ?? 1}</span>
        </div>
        <progress
          aria-label="Weekly expression goal"
          max={goal?.target ?? 1}
          value={Math.min(goal?.value ?? 0, goal?.target ?? 1)}
        />
        <span className={styles.cardFoot}>
          {goal?.achieved
            ? "This week’s goal has been reached."
            : "Together, we can help this expression grow."}
        </span>
      </>
    );
  }
  if (zone === "promise")
    return (
      <>
        <div className={styles.cardLabel}>OUR PEACE PROMISE</div>
        <h2>Let love be our promise.</h2>
        <p>Carry a kind word from this world into someone&apos;s day.</p>
        <TrustedQR
          url={DISPLAY_EXTERNAL_URLS.peacePromise}
          label="Make a peace promise"
        />
      </>
    );
  if (zone === "welcome")
    return (
      <>
        <div className={styles.cardLabel}>WELCOME TO MOTHER&apos;S LOVE</div>
        <h2>A world made of kindness.</h2>
        <p>{CAMPAIGN_TAGLINE}</p>
        <p className={styles.smallText}>
          {insights?.campaign.recognitions.toLocaleString() ?? 0} recognitions
          of kindness
        </p>
        <TrustedQR
          url="https://mothers-love.vercel.app/recognize"
          label="Share a recognition"
        />
      </>
    );
  return (
    <>
      <div className={styles.cardLabel}>
        {zone === "featured"
          ? "A KINDNESS WORTH CELEBRATING"
          : zone === "heart"
            ? "LOVE EXPRESSED THROUGH ACTIONS"
            : zone === "peacemakers"
              ? "WE ARE PEACEMAKERS"
              : zone === "orbit"
                ? "A SHARED EXPRESSION"
                : zone === "live-feed"
                  ? "RECENT RECOGNITIONS"
                  : "A KINDNESS IN BLOOM"}
      </div>
      {record ? (
        <RecognitionText
          record={record}
          elapsed={elapsed}
          minimum={feed.snapshot?.settings.readingSeconds ?? 24}
        />
      ) : (
        empty
      )}
    </>
  );
}
