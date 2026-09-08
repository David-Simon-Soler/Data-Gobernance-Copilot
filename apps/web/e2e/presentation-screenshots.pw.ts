import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const screenshotDirectory = join(
  __dirname,
  "../test-results/presentation",
);

async function capture(page: Page, name: string) {
  await page.screenshot({
    path: join(screenshotDirectory, `${name}.png`),
    animations: "disabled",
    caret: "hide",
  });
}

async function expectNoBodyOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function analyzeSample(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
  });

  const analysisResponse = page.waitForResponse(
    (response) =>
      response.url() === "http://127.0.0.1:8000/api/v1/analyze" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Try the sample dataset" }).click();
  expect((await analysisResponse).status()).toBe(200);

  await expect(
    page.getByRole("heading", { name: "customer-operations-sample.xlsx" }),
  ).toBeVisible();
  await expect(page.getByText("50 rows", { exact: true })).toBeVisible();
  await expect(page.getByText("13 columns", { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function showSection(
  page: Page,
  linkName: string,
  headingName: string,
) {
  const navigation = page.getByRole("navigation", { name: "Result sections" });
  await navigation.getByRole("link", { name: linkName, exact: true }).click();
  const heading = page.getByRole("heading", {
    name: headingName,
    exact: true,
  });
  await expect(heading).toBeInViewport();
  await expect
    .poll(async () => {
      const headingBox = await heading.boundingBox();
      const navigationBox = await navigation.boundingBox();
      if (!headingBox || !navigationBox) return false;
      return headingBox.y >= navigationBox.y + navigationBox.height - 1;
    })
    .toBe(true);
}

test.beforeAll(async () => {
  await rm(screenshotDirectory, { recursive: true, force: true });
  await mkdir(screenshotDirectory, { recursive: true });
});

test.describe("desktop presentation set", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("captures the canonical desktop product journey", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Understand the quality and governance signals in your dataset.",
      }),
    ).toBeVisible();
    await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = "auto";
      await document.fonts.ready;
    });
    await capture(page, "landing-desktop");
    await expectNoBodyOverflow(page);

    await analyzeSample(page);
    await capture(page, "overview-desktop");

    await showSection(page, "Quality", "Quality");
    await capture(page, "quality-desktop");

    await showSection(page, "Governance", "Governance");
    await capture(page, "governance-desktop");

    await showSection(page, "Recommendations", "Recommendations");
    await capture(page, "recommendations-desktop");

    await showSection(page, "Columns", "Column inventory");
    await page
      .getByRole("combobox", { name: "Classification", exact: true })
      .selectOption({ label: "Potential Personal Data" });
    await expect(page.getByText("4 of 13 columns", { exact: true })).toBeVisible();
    await capture(page, "columns-desktop");

    await page.getByRole("button", { name: "Inspect email", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "email" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Classifications" }),
    ).toBeVisible();
    await capture(page, "column-detail-desktop");
    await expectNoBodyOverflow(page);
  });
});

test.describe("mobile presentation set", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("captures readable results and column detail on mobile", async ({ page }) => {
    await analyzeSample(page);
    await showSection(page, "Overview", "Overview");
    await capture(page, "results-mobile");
    await expectNoBodyOverflow(page);

    await showSection(page, "Columns", "Column inventory");
    await page
      .getByRole("combobox", { name: "Classification", exact: true })
      .selectOption({ label: "Potential Personal Data" });
    await expect(page.getByText("4 of 13 columns", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Inspect email", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "email" });
    await expect(dialog).toBeVisible();
    const classifications = dialog
      .locator("section[aria-labelledby=column-classifications-title]")
      .getByRole("list")
      .first();
    await expect(
      classifications.getByText("Contact Information", { exact: true }),
    ).toBeVisible();
    await expect(
      classifications.getByText("Potential Personal Data", { exact: true }),
    ).toBeVisible();
    await capture(page, "column-detail-mobile");
    await expectNoBodyOverflow(page);
  });
});

for (const viewport of [
  { name: "compact desktop", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 800 },
]) {
  test.describe(`${viewport.name} presentation check`, () => {
    test.use({ viewport });

    test("keeps navigation and result content contained", async ({ page }) => {
      await analyzeSample(page);
      await showSection(page, "Recommendations", "Recommendations");
      await expectNoBodyOverflow(page);
      await showSection(page, "Columns", "Column inventory");
      await expectNoBodyOverflow(page);

      const navigation = page.getByRole("navigation", {
        name: "Result sections",
      });
      const navigationBox = await navigation.boundingBox();
      expect(navigationBox).not.toBeNull();
      expect(navigationBox?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect(
        (navigationBox?.x ?? 0) + (navigationBox?.width ?? 0),
      ).toBeLessThanOrEqual(viewport.width);
    });
  });
}
