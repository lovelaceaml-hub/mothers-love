import { expect, test } from "@playwright/test";
import { WORLD_RETIRED } from "../../src/lib/world-retired";

// While the 3D world is retired, its addresses answer with the home page and no world loads.
test.skip(!WORLD_RETIRED, "The 3D world is open again.");

for (const address of ["/world", "/world?source=sample&art=design", "/display/world-preview?source=sample"])
  test(`${address} opens the home page while the world is retired`, async ({ page }) => {
    await page.goto(address);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("world-preview")).toHaveCount(0);
  });
