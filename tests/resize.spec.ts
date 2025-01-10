import { test, expect } from "@playwright/test";
import { RESIZE_DIRECTIONS } from "@components/board/constants";

test.describe("resize", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("resize group by top", async ({ page }) => {
    const group = page.locator("[data-group]");

    const container = page.locator("[data-container]");
    const containerBox = await container.boundingBox();
    if (!containerBox) return;

    const resizeHandler = group.locator(`[data-direction="${RESIZE_DIRECTIONS.TOP}"]`);

    const prevGroupBox = await group.boundingBox();
    if (!prevGroupBox) return;
    const prevGroupHeight = prevGroupBox.height;

    const resizeHandlerBox = await resizeHandler.boundingBox();
    if (resizeHandlerBox) {
      await page.mouse.move(resizeHandlerBox.x, resizeHandlerBox.y);
      await page.mouse.down();
      await page.mouse.move(resizeHandlerBox.x, resizeHandlerBox.y - 1000);
    }

    const nextGroupBox = await group.boundingBox();
    if (!nextGroupBox) return;
    const nextGroupHeight = nextGroupBox.height;

    expect(nextGroupHeight).toBeGreaterThan(prevGroupHeight);
    expect(prevGroupHeight + prevGroupBox.y - containerBox.y).toEqual(nextGroupHeight);
  });

  test.afterEach(async ({ page }) => {
    await page.mouse.up();
    await page.close();
  });
});
