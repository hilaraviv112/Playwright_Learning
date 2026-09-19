import { test, expect } from '@playwright/test';

test.describe('ויקיפדיה העברית', () => {
  test('חיפוש ערך אינטליגנציה מלאכותית בוויקיפדיה העברית', async ({ page }) => {
    await page.goto('https://he.wikipedia.org');

    const searchTerm = 'אינטליגנציה מלאכותית';

    await page.getByRole('searchbox').fill(searchTerm);
    await page.locator('#searchform').getByRole('button', { name: 'חיפוש' }).click();

    // החיפוש מפנה לערך הקנוני "בינה מלאכותית"
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /אינטליגנציה מלאכותית|בינה מלאכותית/,
    );
  });

  test('חיפוש ג׳יבריש מציג הודעה שלא נמצאו תוצאות', async ({ page }) => {
    await page.goto('https://he.wikipedia.org');

    await page.getByRole('searchbox').fill('asdfghjkl12345');
    await page.locator('#searchform').getByRole('button', { name: 'חיפוש' }).click();

    await expect(page.getByText('לא נמצאו תוצאות המתאימות לחיפוש.')).toBeVisible();
  });

  test('עמוד הבית מציג לוגו ותיבת חיפוש פעילה', async ({ page }) => {
    await page.goto('https://he.wikipedia.org');

    await expect(page.locator('.mw-logo')).toBeVisible();
    await expect(page.getByRole('searchbox')).toBeVisible();
    await expect(page.getByRole('searchbox')).toBeEnabled();
  });
});
