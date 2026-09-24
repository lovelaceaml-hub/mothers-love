import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ZONES } from "../../src/components/display/world/world-data";
import { snapshot } from "./fixtures";

test.use({
  launchOptions: {
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  },
});
// These journeys were written for the cinematic world, which was the preview's default. Since
// Plan 28 Section 5 the world lives at `/world` with the design look as its default, so they
// ask for the cinematic look explicitly and keep testing what they always tested.
const path = "/world";
const canvas = (page: Page) =>
  page.locator('canvas[aria-label^="A continuous"]');
async function open(page: Page, live = false) {
  if (process.env.WORLD_PREVIEW_ACCESS)
    await page.goto(`${process.env.WORLD_PREVIEW_ACCESS}&source=sample`);
  await page.goto(path + (live ? "?source=live&art=cinematic" : "?source=sample&art=cinematic"));
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 60000 },
  );
}
async function smallCanvas(page: Page) {
  await canvas(page).evaluate((c) => {
    c.style.width = "320px";
    c.style.height = "180px";
  });
}

for (const reducedMotion of ["no-preference", "reduce"] as const)
  test(`TV bubbles and automatic tour without clicks: ${reducedMotion}`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.emulateMedia({ reducedMotion });
    const response = snapshot();
    response.recognitions.forEach((record) => {
      record.message = "Thank you for welcoming everyone with a kind smile.";
      record.featured = true;
    });
    await page.route("**/api/display/color-polish*", (route) =>
      route.fulfill({ json: response }),
    );
    await open(page, true);
    await smallCanvas(page);
    const world = page.getByTestId("world-preview");
    const bubble = page.getByRole("region", {
      name: "Recognition in the world",
      exact: true,
    });
    await expect
      .poll(async () => Number(await world.getAttribute("data-world-bubbles")))
      .toBeGreaterThan(0);
    await expect(
      page.getByRole("complementary", { name: "World content" }),
    ).toHaveCount(0);
    await expect(world).toHaveAttribute("data-world-bubble-position", /-?\d/);
    const initialCamera = await world.getAttribute("data-camera-position");
    const initialProjection = await world.getAttribute(
      "data-world-bubble-screen",
    );
    const firstName = await bubble.getByRole("heading").textContent();
    if (reducedMotion === "no-preference") {
      await expect
        .poll(() => world.getAttribute("data-camera-position"), {
          timeout: 8000,
        })
        .not.toBe(initialCamera);
      await expect
        .poll(() => world.getAttribute("data-world-bubble-screen"), {
          timeout: 8000,
        })
        .not.toBe(initialProjection);
    }
    // No clicks, key presses or time overrides: the old 180-second Garden must advance on its own.
    await expect(world).toHaveAttribute("data-zone", "featured", {
      timeout: 55000,
    });
    await expect(bubble.getByRole("heading")).not.toHaveText(firstName!);
  });

test("thirteen resident locations, full reading browser, source isolation and keyboard controls", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const api: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) api.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await smallCanvas(page);
  await canvas(page).evaluate((c) => {
    (window as unknown as { worldCanvas: HTMLCanvasElement }).worldCanvas =
      c as HTMLCanvasElement;
  });
  for (const zone of ZONES) {
    await page.getByRole("button", { name: "World map", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: new RegExp(zone.name) })
      .click();
    await expect(page.getByTestId("world-preview")).toHaveAttribute(
      "data-zone",
      zone.id,
    );
    await expect(
      page.getByRole("heading", { name: zone.name, exact: true }),
    ).toBeVisible();
    expect(
      await canvas(page).evaluate(
        (c) =>
          (window as unknown as { worldCanvas: HTMLCanvasElement })
            .worldCanvas === c,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("button", { name: "Read recognitions", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator("article")).toHaveCount(9);
  await page
    .getByRole("combobox", { name: "Expression", exact: true })
    .selectOption("6");
  await expect(page.getByRole("dialog").locator("article")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Linger with this recognition" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Jordan", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue reading tour" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Close World controls" }),
  ).toBeFocused();
  await page.getByLabel("Picture quality").selectOption("low");
  await page.getByText("Rendering details", { exact: true }).click();
  await expect(
    page.getByRole("definition").filter({ hasText: /^Low$/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Settings", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Hide details", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Current world location" }),
  ).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("region", { name: "Current world location" }),
  ).toBeVisible();
  expect(api).toEqual([]);
  expect(errors).toEqual([]);
});

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
  { width: 390, height: 844 },
])
  test(`readable pearl world at ${viewport.width}`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    for (const [name, id] of [
      ["01 Garden", "garden"],
      ["02 Sanctuary", "heart"],
      ["03 Expressions", "expressions"],
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      await expect(page.getByTestId("world-preview")).toHaveAttribute(
        "data-zone",
        id,
      );
      if (id === "expressions") {
        const reading = await page
          .getByRole("complementary", { name: "World content" })
          .boundingBox();
        const footer = await page.locator("footer").boundingBox();
        expect(reading!.y).toBeGreaterThan(0);
        expect(reading!.y + reading!.height).toBeLessThan(footer!.y);
      } else {
        await expect(page.getByTestId("world-preview")).toHaveAttribute(
          "data-world-bubble-position",
          /-?\d/,
        );
        if (viewport.width === 390) {
          const story = await page
            .getByRole("region", { name: "Current world location" })
            .boundingBox();
          const controls = await page
            .locator('[aria-label="Recognition controls"]')
            .boundingBox();
          const footer = await page.locator("footer").boundingBox();
          expect(controls!.y).toBeGreaterThanOrEqual(story!.y + story!.height);
          expect(controls!.y + controls!.height).toBeLessThan(footer!.y);
        }
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (process.env.WORLD_SCREENSHOTS)
        await page.screenshot({
          path: `${process.env.WORLD_SCREENSHOTS}/${id}-${viewport.width}.png`,
        });
    }
    const results = await new AxeBuilder({ page: page as never })
      .include('[data-testid="world-preview"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

test("single entrance settles into a quiet readable bubble and pauses without advancing", async ({
  page,
}) => {
  test.setTimeout(90000);
  await open(page);
  await smallCanvas(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Preview grand entrance" }).click();
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-arrival",
    "approach",
    { timeout: 10000 },
  );
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-arrival",
    "reading",
    { timeout: 30000 },
  );
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-arrival-in-world",
    "true",
  );
  await expect(
    page
      .getByRole("region", { name: "Recognition arrival" })
      .getByRole("heading", { name: "Alex", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause tour", exact: true }).click();
  const elapsed = await page
    .getByTestId("world-preview")
    .getAttribute("data-elapsed");
  await page.waitForTimeout(1200);
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-elapsed",
    elapsed!,
  );
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-arrival",
    "reading",
  );
});

test("live projection replaces samples, responds to privacy settings, and never writes", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let response = snapshot();
  response.recognitions[0].recipient = "Fictional Live Friend";
  const writes: string[] = [];
  await page.route("**/api/display/color-polish*", (route) =>
    route.fulfill({ json: response }),
  );
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (
      url.origin === new URL(page.url()).origin &&
      url.pathname.startsWith("/api/") &&
      !["GET", "HEAD", "OPTIONS"].includes(r.method())
    )
      writes.push(r.method());
  });
  await open(page, true);
  await smallCanvas(page);
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-feed-phase",
    "live",
  );
  await expect(
    page.getByRole("heading", { name: "Fictional Live Friend", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-arrival",
    "idle",
  );
  response = {
    ...response,
    settings: { ...response.settings, mode: "quiet" },
    recognitions: [],
    arrivals: [],
  };
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-feed-phase",
    "quiet",
    { timeout: 12000 },
  );
  await expect(
    page.getByText("Fictional Live Friend", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "A quiet moment." }),
  ).toBeVisible();
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-world-bubbles",
    "0",
  );
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-world-textures",
    "0",
  );
  expect(writes).toEqual([]);
});

test("no WebGL and context loss keep recognitions available", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await smallCanvas(page);
  await canvas(page).evaluate((c) =>
    (c as HTMLCanvasElement)
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext(),
  );
  await expect(
    page.getByText("Still world preview", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Read recognitions", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator("article")).toHaveCount(9);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Try 3D again" }).click();
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 60000 },
  );
  expect(await canvas(page).count()).toBe(1);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes("webgl")) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.reload();
  await expect(
    page.getByText("Still world preview", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Alex", exact: true }),
  ).toBeVisible();
});

test("automatic tour waits for reading, then travels without replacing its renderer", async ({
  page,
}) => {
  test.setTimeout(80000);
  const response = snapshot();
  response.presentation.playlist.forEach((entry) => {
    entry.durationSeconds = 12;
  });
  await page.route("**/api/display/color-polish*", (route) =>
    route.fulfill({ json: response }),
  );
  await open(page, true);
  await smallCanvas(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Tour speed").selectOption("2");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-traveling",
    "true",
    { timeout: 45000 },
  );
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-zone",
    "featured",
    { timeout: 20000 },
  );
  await expect(canvas(page)).toHaveCount(1);
});

test("long Unicode recognition pages retain the full message in the reading browser", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = snapshot();
  const message =
    "Thank you for sharing kindness and encouragement. "
      .repeat(10)
      .slice(0, 490) + " 💗";
  response.recognitions = [
    {
      ...response.recognitions[0],
      recipient: "A fictional friend with a long display name",
      message,
    },
  ];
  await page.route("**/api/display/color-polish*", (route) =>
    route.fulfill({ json: response }),
  );
  await open(page, true);
  await page.getByRole("button", { name: "Hold this recognition" }).click();
  await expect(
    page.getByRole("region", { name: "Recognition in the world", exact: true }),
  ).toContainText(message);
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-world-bubbles",
    /[1-9]/,
  );
  await expect(
    page.getByRole("complementary", { name: "World content" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Read recognitions", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").locator("article p").first(),
  ).toHaveText(message);
});

test("switching an active entrance to still keeps its reading celebration", async ({
  page,
}) => {
  test.setTimeout(60000);
  await open(page);
  await smallCanvas(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Preview grand entrance" }).click();
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-arrival",
    "approach",
    { timeout: 10000 },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-arrival",
    "reading",
  );
  await expect(
    page
      .getByRole("region", { name: "Recognition arrival" })
      .getByRole("heading", { name: "Alex", exact: true }),
  ).toBeVisible();
});

test("owner still settles travel and malformed successful JSON clears personal text", async ({
  page,
}) => {
  test.setTimeout(60000);
  let response = snapshot(),
    invalid = false;
  await page.route("**/api/display/color-polish*", (route) =>
    invalid
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "{",
        })
      : route.fulfill({ json: response }),
  );
  await open(page, true);
  await smallCanvas(page);
  await page.getByRole("button", { name: "02 Sanctuary", exact: true }).click();
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-traveling",
    "true",
  );
  response = {
    ...response,
    settings: { ...response.settings, motion: "still" },
  };
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-traveling",
    "false",
    { timeout: 12000 },
  );
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-zone",
    "heart",
  );
  invalid = true;
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-feed-phase",
    "unavailable",
    { timeout: 12000 },
  );
  await expect(
    page.getByRole("heading", { name: "Alex", exact: true }),
  ).toHaveCount(0);
});

test("owner pause holds reading and selecting a story respects disabled Garden", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = snapshot();
  response.settings.pauseRotation = true;
  response.presentation.playlist.find((item) => item.id === "garden")!.enabled =
    false;
  await page.route("**/api/display/color-polish*", (route) =>
    route.fulfill({ json: response }),
  );
  await open(page, true);
  await smallCanvas(page);
  await expect(
    page.getByRole("button", { name: "01 Garden", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Read recognitions", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Jordan", exact: true }) })
    .getByRole("button", { name: "Linger with this recognition" })
    .click();
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-zone",
    "heart",
  );
  await expect(
    page.getByRole("heading", { name: "Jordan", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue reading tour" }).click();
  const remaining = await page
    .getByTestId("world-preview")
    .getAttribute("data-reading-remaining");
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-reading-remaining",
    remaining!,
  );
  response.sync = "delta";
  response.arrivals = [
    {
      eventId: "101",
      recognitionId: response.recognitions[0].id,
      publishedAt: response.recognitions[0].firstPublishedAt!,
    },
  ];
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-arrival",
    "reading",
    { timeout: 12000 },
  );
});

test("an unbroken eighty-character recipient wraps on a phone", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = snapshot();
  response.recognitions = [
    { ...response.recognitions[0], recipient: "A".repeat(80) },
  ];
  await page.route("**/api/display/color-polish*", (route) =>
    route.fulfill({ json: response }),
  );
  await open(page, true);
  const heading = page.getByRole("heading", {
    name: "A".repeat(80),
    exact: true,
  });
  await expect(heading).toBeVisible();
  expect(
    await heading.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
});

test("manual map navigation works under owner pause without reduced motion", async ({
  page,
}) => {
  const response = snapshot();
  response.settings.pauseRotation = true;
  await page.route("**/api/display/color-polish*", (route) =>
    route.fulfill({ json: response }),
  );
  await open(page, true);
  await smallCanvas(page);
  await page.getByRole("button", { name: "World map", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Heart Sanctuary/ })
    .click();
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-zone",
    "heart",
  );
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-traveling",
    "false",
  );
});

test("context loss during an entrance keeps fallback navigation and reading usable", async ({
  page,
}) => {
  await open(page);
  await smallCanvas(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Preview grand entrance", exact: true })
    .click();
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-arrival",
    "approach",
    { timeout: 10000 },
  );
  await canvas(page).evaluate((c) =>
    (c as HTMLCanvasElement)
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext(),
  );
  await expect(
    page.getByText("Still world preview", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-arrival",
    "idle",
  );
  await page.getByRole("button", { name: "World map", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Heart Sanctuary/ })
    .click();
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-zone",
    "heart",
  );
  await page
    .getByRole("button", { name: "Read recognitions", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .locator("article")
    .first()
    .getByRole("button", { name: "Linger with this recognition" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Alex", exact: true }),
  ).toBeVisible();
});

test("live fallback keeps its chosen location across feed publications", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = snapshot();
  await page.route("**/api/display/color-polish*", (route) =>
    route.fulfill({ json: response }),
  );
  await open(page, true);
  await smallCanvas(page);
  await canvas(page).evaluate((c) =>
    (c as HTMLCanvasElement)
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext(),
  );
  await expect(
    page.getByText("Still world preview", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "World map", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Heart Sanctuary/ })
    .click();
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-zone",
    "heart",
  );
  await page.waitForTimeout(6000);
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-zone",
    "heart",
  );
  response.settings.mode = "quiet";
  response.recognitions = [];
  response.arrivals = [];
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-feed-phase",
    "quiet",
    { timeout: 10000 },
  );
  await expect(
    page.getByRole("heading", { name: "Alex", exact: true }),
  ).toHaveCount(0);
});

test("a sixty-second reading advances to another story after automatic travel", async ({
  page,
}) => {
  test.setTimeout(110000);
  const response = snapshot();
  response.settings.readingSeconds = 60;
  response.recognitions.forEach((record) => {
    record.featured = true;
  });
  response.presentation.playlist.forEach((entry) => {
    entry.durationSeconds = 12;
  });
  await page.route("**/api/display/color-polish*", (route) =>
    route.fulfill({ json: response }),
  );
  await open(page, true);
  await smallCanvas(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Tour speed").selectOption("2");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", {
      name: response.recognitions[0].recipient,
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-traveling",
    "true",
    { timeout: 75000 },
  );
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-zone",
    "featured",
    { timeout: 20000 },
  );
  await expect(
    page.getByRole("heading", {
      name: response.recognitions[1].recipient,
      exact: true,
    }),
  ).toBeVisible();
});

test("arrival return resumes fair selection after a completed reading", async ({
  page,
}) => {
  test.setTimeout(130000);
  const response = snapshot();
  response.settings.readingSeconds = 24;
  response.recognitions.forEach((record) => {
    record.featured = true;
  });
  response.presentation.playlist.forEach((entry) => {
    entry.durationSeconds = 12;
  });
  const expectedNext = response.recognitions[1].recipient;
  const arriving = response.recognitions.pop()!;
  await page.route("**/api/display/color-polish*", (route) =>
    route.fulfill({ json: response }),
  );
  await open(page, true);
  await smallCanvas(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Tour speed").selectOption("2");
  await page.keyboard.press("Escape");
  response.recognitions.unshift(arriving);
  response.sync = "delta";
  response.arrivals = [
    {
      eventId: "101",
      recognitionId: arriving.id,
      publishedAt: arriving.firstPublishedAt!,
    },
  ];
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-arrival",
    "approach",
    { timeout: 35000 },
  );
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-arrival",
    "idle",
    { timeout: 60000 },
  );
  await expect(page.getByTestId("world-preview")).toHaveAttribute(
    "data-zone",
    "featured",
    { timeout: 20000 },
  );
  await expect(
    page.getByRole("heading", {
      name: expectedNext,
      exact: true,
    }),
  ).toBeVisible();
});

test("a recognition bubble can be selected inside the environment", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const world = page.getByTestId("world-preview");
  await expect(world).toHaveAttribute("data-world-bubble-screen", /-?\d/);
  const point = (await world.getAttribute("data-world-bubble-screen"))!
    .split(",")
    .map(Number);
  const bounds = (await canvas(page).boundingBox())!;
  expect(Math.abs(point[0])).toBeLessThan(1);
  expect(Math.abs(point[1])).toBeLessThan(1);
  await page.mouse.click(
    bounds.x + ((point[0] + 1) * bounds.width) / 2,
    bounds.y + ((1 - point[1]) * bounds.height) / 2,
  );
  await expect(
    page.getByRole("button", { name: "Continue reading tour", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("complementary", { name: "World content" }),
  ).toHaveCount(0);
});
