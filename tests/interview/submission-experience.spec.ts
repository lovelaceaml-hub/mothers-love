import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const syntheticFeed = {
  serverTime: '2030-01-08T00:00:00.000Z',
  items: [],
};

const expressionDetails = [
  {
    id: '01',
    phrase: 'How Are You?',
    principle: 'The first phrase to peace',
    example: 'Start with a friendly hello to a neighbor, a classmate, or someone serving your community.',
  },
  {
    id: '02',
    phrase: "Thank you. It's all thanks to you. You've worked hard.",
    principle: 'Express gratitude even for small efforts and acts of kindness',
    example: 'Thank someone for an everyday kindness, such as preparing a meal or helping you travel safely.',
  },
  {
    id: '03',
    phrase: "I'm sorry. It must have been hard on you.",
    principle: "A phrase that melts the heart by understanding the other's feelings first",
    example: 'Consider how your words affected the other person. Acknowledge your mistake and take the first step toward reconciliation.',
  },
  {
    id: '04',
    phrase: "It's okay. I understand.",
    principle: 'A phrase of forgiveness that embraces faults',
    example: 'Respond gently when someone makes a mistake, and help them move forward without embarrassment.',
  },
  {
    id: '05',
    phrase: 'Please, after you.',
    principle: 'When feeling impatient, take a breath and yield to others',
    example: 'Make room for someone else when a queue or busy journey tests your patience.',
  },
  {
    id: '06',
    phrase: "I'd love to hear more about your thoughts.",
    principle: 'When opinions differ, listen carefully to others',
    example: 'Give a different opinion your full attention before replying. Listening helps people feel respected.',
  },
  {
    id: '07',
    phrase: "I'll pray (or root) for you. Everything will go well.",
    principle: 'Offer sincere support and encouragement',
    example: 'Encourage someone facing a difficult moment, and remind them that they have your support.',
  },
  {
    id: '08',
    phrase: 'Can I give you a hand with anything?',
    principle: 'Consideration begins with paying attention to those around you',
    example: 'Notice who could use practical help, then offer a manageable act of kindness.',
  },
  {
    id: '09',
    phrase: "You're amazing. You're doing great!",
    principle: 'Warm compliments bring happiness to both sides',
    example: "Recognize someone's effort or progress with a thoughtful compliment that brightens their day.",
  },
];

async function openCollection(page: Page) {
  await page.route('**/api/config', async (route) => {
    await route.fulfill({ json: { collectionOpen: true, configured: true } });
  });
  await page.route('**/api/feed', async (route) => {
    await route.fulfill({ json: syntheticFeed });
  });
  await page.goto('/recognize');
  await expect(page.getByRole('heading', { name: "THE WORDS OF MOTHER'S LOVE" })).toBeVisible();
}

async function fillSyntheticDraft(page: Page) {
  await page.getByLabel('Your name').fill('Synthetic Sender');
  await page.getByLabel('Who would you like to recognize?').fill('Synthetic Recipient');
  await page.getByRole('button', { name: /^Select expression 02:/ }).click();
  await page.getByRole('button', { name: /^Select expression 06:/ }).click();
  await page.getByRole('button', { name: /^Select expression 08:/ }).click();
  await page.getByLabel('Share your appreciation').fill('Synthetic thanks for a thoughtful act of kindness.');
}

test.describe('interview completion submission experience', () => {
  test('makes each expression a single full-card pointer and keyboard target', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openCollection(page);

    const cards = page.getByRole('article');
    await expect(cards).toHaveCount(9);
    await expect(page.getByTestId('expression-scene')).toHaveCount(9);
    await expect(page.getByTestId('expression-cluster')).toHaveCount(9);

    for (const detail of expressionDetails) {
      const card = page.getByTestId(`expression-card-${Number(detail.id)}`);
      await expect(card).toContainText(detail.phrase);
      await expect(card).toContainText(detail.principle);
      await expect(card).toContainText(detail.example);
      expect(await card.locator('button, input, a, textarea, select').count()).toBe(1);
    }

    const sceneClasses = await page.getByTestId('expression-scene').evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-scene-id') ?? ''),
    );
    expect(new Set(sceneClasses).size).toBe(9);

    const expressionColors = await cards.evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).getPropertyValue('--expression-color').trim()),
    );
    expect(new Set(expressionColors).size).toBe(9);

    const firstCard = page.getByTestId('expression-card-1');
    const firstChoice = firstCard.getByRole('button', { name: /^Select expression 01:/ });
    const unselectedStyles = await firstCard.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage };
    });
    expect(unselectedStyles.backgroundColor).toBe('rgb(255, 253, 246)');
    expect(unselectedStyles.backgroundImage).toBe('none');

    await firstChoice.click({ position: { x: 24, y: 56 } });
    await expect(firstCard.getByRole('button', { name: /^Selected expression 01:/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('growing-bouquet')).toHaveAttribute('data-selected-count', '1');

    const selectedStyles = await firstCard.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backgroundImage: style.backgroundImage, transform: style.transform, boxShadow: style.boxShadow };
    });
    expect(selectedStyles.backgroundImage).toContain('linear-gradient');
    expect(selectedStyles.backgroundImage).toContain('rgb(255, 242, 200)');
    expect(selectedStyles.transform).toBe('none');
    await expect.poll(async () => firstCard.evaluate((element) => getComputedStyle(element).boxShadow)).toContain('rgba(150, 117, 40');

    const secondCard = page.getByTestId('expression-card-2');
    const secondChoice = secondCard.getByRole('button', { name: /^Select expression 02:/ });
    await secondChoice.focus();
    await expect(secondChoice).toBeFocused();
    await page.keyboard.press('Space');
    await expect(secondCard.getByRole('button', { name: /^Selected expression 02:/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('growing-bouquet')).toHaveAttribute('data-selected-count', '2');
    await page.keyboard.press('Enter');
    await expect(secondCard.getByRole('button', { name: /^Select expression 02:/ })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('growing-bouquet')).toHaveAttribute('data-selected-count', '1');
  });

  test('keeps synthetic held and published receipts honest while showing the seed journey', async ({ page }) => {
    await openCollection(page);
    let status: 'published' | 'held' = 'published';
    await page.route('**/api/recognitions', async (route) => {
      await route.fulfill({
        status: 201,
        json: { id: `synthetic-${status}`, status, expiresAt: '2030-01-15T00:00:00.000Z' },
      });
    });

    await fillSyntheticDraft(page);
    await page.getByRole('button', { name: 'Send recognition' }).click();
    const receipt = page.getByTestId('submission-receipt');
    await expect(receipt).toContainText('ready to appear on the home page and TV');
    await expect(receipt).toContainText('thank-you seed is floating toward the recognition garden');
    await expect(page.getByTestId('seed-orbit')).toHaveCount(1);
    expect(await page.getByTestId('seed-orbit').evaluate((element) => getComputedStyle(element).animationName)).toContain('seedFloat');
    expect(await page.getByTestId('seed-trail').evaluate((element) => getComputedStyle(element).animationName)).toContain('seedTrailDraw');

    await page.getByRole('button', { name: 'Recognize Someone Else' }).click();
    status = 'held';
    await fillSyntheticDraft(page);
    await page.getByRole('button', { name: 'Send recognition' }).click();
    await expect(receipt).toContainText('Some messages are reviewed before appearing.');
    await expect(receipt).toContainText('It is not on the home page or TV yet');
    await expect(receipt).toContainText('thank-you seed is resting safely while it is reviewed');
    await expect(receipt).not.toContainText('ready to appear on the home page and TV');
    expect(await page.getByTestId('seed-orbit').evaluate((element) => getComputedStyle(element).animationName)).toContain('seedRest');
    expect(await page.getByTestId('seed-trail').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  });

  test('keeps one expression per row inside phone bounds and passes axe at phone and desktop sizes', async ({ page }) => {
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { collectionOpen: true, configured: true } });
    });
    await page.route('**/api/feed', async (route) => {
      await route.fulfill({ json: syntheticFeed });
    });

    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/recognize');
      await expect(page.getByTestId('expression-card-1')).toBeVisible();

      const bounds = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.viewportWidth);

      const cardBoxes = await page.getByRole('article').evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width) };
        }),
      );
      expect(new Set(cardBoxes.map((box) => box.left)).size).toBe(1);
      expect(cardBoxes.every((box) => box.left >= 0 && box.right <= viewport.width && box.width <= viewport.width)).toBe(true);

      const results = await new AxeBuilder({ page: page as never }).analyze();
      expect(results.violations).toEqual([]);
    }
  });
});
