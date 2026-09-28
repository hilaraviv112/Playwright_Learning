import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';

const APP_URL = pathToFileURL(path.join(__dirname, '..', 'task-app', 'index.html')).href;
const tid = (id: string) => `[data-test="${id}"]`;

const USER = { name: 'הילה', email: 'hila@example.com', password: 'Passw0rd!' };

async function register(page: Page, user = USER) {
  await page.goto(`${APP_URL}#register`);
  await page.locator(tid('register-name')).fill(user.name);
  await page.locator(tid('register-email')).fill(user.email);
  await page.locator(tid('register-password')).fill(user.password);
  await page.locator(tid('register-confirm')).fill(user.password);
  await page.locator(tid('register-button')).click();
  await expect(page.locator(tid('tasks-view'))).toBeVisible();
}

async function addTask(page: Page, title: string, opts: { due?: string; priority?: string } = {}) {
  await page.locator(tid('task-title')).fill(title);
  if (opts.due) await page.locator(tid('task-due')).fill(opts.due);
  if (opts.priority) await page.locator(tid('task-priority')).selectOption(opts.priority);
  await page.locator(tid('task-submit')).click();
}

test.describe('Task App - הרשמה והתחברות', () => {
  test('ולידציות על שדות ריקים בהתחברות', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator(tid('login-button')).click();
    await expect(page.locator(tid('login-email-error'))).toHaveText('יש להזין אימייל');
    await expect(page.locator(tid('login-password-error'))).toHaveText('יש להזין סיסמה');
  });

  test('אימייל לא תקין מציג שגיאה', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator(tid('login-email')).fill('not-an-email');
    await page.locator(tid('login-password')).fill('whatever');
    await page.locator(tid('login-button')).click();
    await expect(page.locator(tid('login-email-error'))).toHaveText('כתובת אימייל לא תקינה');
  });

  test('סיסמה חלשה וסיסמאות לא תואמות בהרשמה', async ({ page }) => {
    await page.goto(`${APP_URL}#register`);
    await page.locator(tid('register-name')).fill('הילה');
    await page.locator(tid('register-email')).fill('hila@example.com');
    await page.locator(tid('register-password')).fill('abc');
    await page.locator(tid('register-confirm')).fill('abcd');
    await page.locator(tid('register-button')).click();

    await expect(page.locator(tid('register-password-error'))).toHaveText('הסיסמה אינה עומדת בכל הדרישות');
    await expect(page.locator(tid('register-confirm-error'))).toHaveText('הסיסמאות אינן תואמות');
    await expect(page.locator('.password-rules li[data-rule="lower"]')).toHaveClass(/ok/);
    await expect(page.locator('.password-rules li[data-rule="length"]')).not.toHaveClass(/ok/);
  });

  test('הרשמה, התנתקות והתחברות מחדש', async ({ page }) => {
    await register(page);
    await expect(page.locator(tid('welcome'))).toHaveText(`שלום, ${USER.name}`);

    await page.locator(tid('logout-button')).click();
    await expect(page.locator(tid('login-view'))).toBeVisible();

    await page.locator(tid('login-email')).fill(USER.email);
    await page.locator(tid('login-password')).fill('Wrong123!');
    await page.locator(tid('login-button')).click();
    await expect(page.locator(tid('login-error'))).toHaveText('אימייל או סיסמה שגויים');

    await page.locator(tid('login-password')).fill(USER.password);
    await page.locator(tid('login-button')).click();
    await expect(page.locator(tid('tasks-view'))).toBeVisible();
  });

  test('לא ניתן להירשם פעמיים עם אותו אימייל', async ({ page }) => {
    await register(page);
    await page.locator(tid('logout-button')).click();

    await page.locator(tid('go-to-register')).click();
    await page.locator(tid('register-name')).fill('משתמש אחר');
    await page.locator(tid('register-email')).fill(USER.email.toUpperCase());
    await page.locator(tid('register-password')).fill(USER.password);
    await page.locator(tid('register-confirm')).fill(USER.password);
    await page.locator(tid('register-button')).click();
    await expect(page.locator(tid('register-email-error'))).toHaveText('כתובת האימייל כבר רשומה במערכת');
  });
});

test.describe('Task App - משימות', () => {
  test.beforeEach(async ({ page }) => {
    await register(page);
  });

  test('הוספה, עריכה, סימון ומחיקה של משימה', async ({ page }) => {
    const items = page.locator(tid('task-item'));

    await page.locator(tid('task-submit')).click();
    await expect(page.locator(tid('task-error'))).toHaveText('יש להזין כותרת למשימה');

    await addTask(page, 'לקנות חלב', { due: '2099-12-31', priority: 'high' });
    await expect(items).toHaveCount(1);
    await expect(items.first().locator(tid('task-priority-text'))).toHaveText('עדיפות: גבוהה');
    await expect(items.first().locator(tid('task-due-text'))).toHaveText('יעד: 31/12/2099');

    await items.first().locator(tid('task-edit')).click();
    await page.locator(tid('task-title')).fill('לקנות חלב ולחם');
    await page.locator(tid('task-submit')).click();
    await expect(items.first().locator(tid('task-title-text'))).toHaveText('לקנות חלב ולחם');

    await items.first().locator(tid('task-toggle')).check();
    await expect(items.first()).toHaveClass(/done/);

    await items.first().locator(tid('task-delete')).click();
    await items.first().locator(tid('task-delete-cancel')).click();
    await expect(items).toHaveCount(1);

    await items.first().locator(tid('task-delete')).click();
    await items.first().locator(tid('task-delete-confirm')).click();
    await expect(items).toHaveCount(0);
    await expect(page.locator(tid('empty-state'))).toBeVisible();
  });

  test('סינון וחיפוש', async ({ page }) => {
    const titles = page.locator(tid('task-title-text'));
    await addTask(page, 'לכתוב טסטים');
    await addTask(page, 'לעשות כביסה');
    await addTask(page, 'לכתוב סיכום');

    await page.locator(tid('task-item')).filter({ hasText: 'לעשות כביסה' }).locator(tid('task-toggle')).check();

    await page.locator(tid('filter-active')).click();
    await expect(titles).toHaveText(['לכתוב טסטים', 'לכתוב סיכום']);

    await page.locator(tid('filter-done')).click();
    await expect(titles).toHaveText(['לעשות כביסה']);

    await page.locator(tid('filter-all')).click();
    await page.locator(tid('search')).fill('לכתוב');
    await expect(titles).toHaveCount(2);

    await expect(page.locator(tid('counter'))).toHaveText('2 פעילות · 1 הושלמו · 3 סה"כ');
  });

  test('המשימות נשמרות אחרי רענון', async ({ page }) => {
    await addTask(page, 'משימה שנשמרת');
    await page.reload();
    await expect(page.locator(tid('task-title-text'))).toHaveText(['משימה שנשמרת']);
  });
});
