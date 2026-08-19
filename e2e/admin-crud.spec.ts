import { expect, type Page, test } from '@playwright/test';
import { Pool } from 'pg';

import { CONTACT_NOTIFICATION_MAX_ATTEMPTS } from '../lib/contact-notification-policy';

import { E2E_ADMIN_PASSWORD } from './constants';

const disposableDatabaseEnabled =
  process.env.DATABASE_DRIVER === 'node-postgres' &&
  Boolean(process.env.DATABASE_URL);
const runId = Date.now().toString(36);

async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

test.describe('admin CRUD with disposable PostgreSQL', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(
    !disposableDatabaseEnabled,
    'Requires DATABASE_DRIVER=node-postgres and a disposable DATABASE_URL.',
  );

  test('creates, edits, publishes, and deletes a project', async ({ page }) => {
    const slug = `e2e-project-${runId}`;
    const title = `E2E Project ${runId}`;
    const updatedTitle = `${title} Updated`;
    const updatedSlug = `${slug}-updated`;

    await login(page);
    await page.goto('/admin/projects/new');

    const form = page.locator('form').filter({ has: page.locator('[name="title"]') });
    await form.locator('[name="title"]').fill(title);
    await form.locator('[name="slug"]').fill(slug);
    await form.locator('[name="description"]').fill('Disposable PostgreSQL project created by Playwright.');
    await form.locator('[name="longDescription"]').fill('This record exists only for the isolated E2E run.');
    await form.locator('[name="tags"]').fill('e2e, postgres, playwright');
    await form.locator('[name="link"]').fill('https://example.com/e2e-project');
    await form.locator('[name="repo"]').fill('https://github.com/example/e2e-project');
    await form.locator('[name="featured"]').check();
    await form.getByRole('button', { name: 'Create project' }).click();

    await expect(page).toHaveURL(/\/admin\/projects$/);
    let row = page.getByRole('row').filter({ hasText: title });
    await expect(row).toContainText(slug);
    await expect(row).toContainText('Featured');

    await row.getByRole('link', { name: 'Edit' }).click();
    const editForm = page.locator('form').filter({ has: page.locator('input[name="id"]') });
    await editForm.locator('input[name="title"]').fill(updatedTitle);
    await editForm.locator('input[name="slug"]').fill(updatedSlug);
    await editForm.locator('textarea[name="description"]').fill('Updated by the Playwright CRUD test.');
    await editForm.getByRole('button', { name: 'Save changes' }).click();

    await expect(page).toHaveURL(/\/admin\/projects$/);
    row = page.getByRole('row').filter({ hasText: updatedTitle });
    await expect(row).toContainText(updatedSlug);

    await page.goto(`/projects/${slug}`);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();

    await page.goto(`/projects/${updatedSlug}`);
    await expect(page.getByRole('heading', { level: 1, name: updatedTitle })).toBeVisible();

    await page.goto('/admin/projects');
    row = page.getByRole('row').filter({ hasText: updatedTitle });
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('row').filter({ hasText: updatedTitle })).toHaveCount(0);
  });

  test('creates, edits, publishes, and deletes a blog post', async ({ page }) => {
    const slug = `e2e-post-${runId}`;
    const title = `E2E Post ${runId}`;
    const updatedTitle = `${title} Updated`;
    const updatedSlug = `${slug}-updated`;

    await login(page);
    await page.goto('/admin/posts/new');

    const form = page.locator('form').filter({ has: page.locator('[name="title"]') });
    await form.locator('[name="title"]').fill(title);
    await form.locator('[name="slug"]').fill(slug);
    await form.locator('[name="excerpt"]').fill('A disposable article created by the admin E2E suite.');
    await form.locator('[name="body"]').fill('# E2E Article\n\nThis content is stored only in the temporary test database.');
    await form.locator('[name="tags"]').fill('e2e, playwright');
    await form.locator('[name="published"]').check();
    await form.getByRole('button', { name: 'Create post' }).click();

    await expect(page).toHaveURL(/\/admin\/posts$/);
    let row = page.getByRole('row').filter({ hasText: title });
    await expect(row).toContainText('Published');

    await row.getByRole('link', { name: 'Edit' }).click();
    const editForm = page.locator('form').filter({ has: page.locator('input[name="id"]') });
    await editForm.locator('input[name="title"]').fill(updatedTitle);
    await editForm.locator('input[name="slug"]').fill(updatedSlug);
    await editForm.locator('textarea[name="excerpt"]').fill('Updated by the Playwright CRUD test.');
    await editForm.getByRole('button', { name: 'Save changes' }).click();

    await expect(page).toHaveURL(/\/admin\/posts$/);
    row = page.getByRole('row').filter({ hasText: updatedTitle });
    await expect(row).toContainText(updatedSlug);

    await page.goto(`/articles/${slug}`);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();

    await page.goto(`/articles/${updatedSlug}`);
    await expect(page.getByRole('heading', { level: 1, name: updatedTitle })).toBeVisible();

    await page.goto('/admin/posts');
    row = page.getByRole('row').filter({ hasText: updatedTitle });
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('row').filter({ hasText: updatedTitle })).toHaveCount(0);
  });

  test('creates and updates singleton profile and settings records', async ({ page }) => {
    const profileName = `E2E Admin ${runId}`;
    const siteTitle = `E2E Portfolio ${runId}`;

    await login(page);
    await page.goto('/admin/profile');
    await page.locator('[name="name"]').fill(profileName);
    await page.locator('[name="role"]').fill('Test Engineer');
    await page.locator('[name="tagline"]').fill('Disposable admin profile');
    await page.locator('[name="heroDescription"]').fill('Created in an isolated PostgreSQL E2E environment.');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile saved.')).toBeVisible();

    await page.reload();
    await expect(page.locator('[name="name"]')).toHaveValue(profileName);

    await page.goto('/admin/settings');
    const settingsForm = page.locator('form').filter({ has: page.locator('input[name="siteTitle"]') });
    await settingsForm.locator('input[name="siteTitle"]').fill(siteTitle);
    await settingsForm.locator('textarea[name="siteDescription"]').fill('Disposable settings record for CI.');
    await settingsForm.locator('input[name="keywords"]').fill('e2e, postgres, ci');
    await settingsForm.locator('select[name="defaultTheme"]').selectOption('dracula');
    await settingsForm.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByText('Settings saved.')).toBeVisible();

    await page.reload();
    await expect(page.locator('[name="siteTitle"]')).toHaveValue(siteTitle);
    await expect(page.locator('[name="defaultTheme"]')).toHaveValue('dracula');

    await page.goto('/admin');
    await expect(page.getByText(`Welcome back, ${profileName}.`)).toBeVisible();
  });

  test('shows terminal notification failure and supports manual reset', async ({ page }) => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const sender = `Terminal Sender ${runId}`;
    const email = `terminal-${runId}@example.com`;
    const now = new Date();
    const inserted = await pool.query<{ id: number }>(
      `INSERT INTO contact_messages (
         name, email, inquiry_type, organization, message,
         notification_status, notification_attempts,
         notification_last_error, notification_last_attempt_at,
         notification_next_attempt_at, retention_expires_at
       ) VALUES ($1, $2, 'other', '', $3, 'failed', $4, $5, $6, $6, $7)
       RETURNING id`,
      [
        sender,
        email,
        `Terminal delivery message ${runId}`,
        CONTACT_NOTIFICATION_MAX_ATTEMPTS,
        'Provider rejected request',
        now,
        new Date(now.getTime() + 24 * 60 * 60 * 1000),
      ],
    );
    const messageId = inserted.rows[0]!.id;

    try {
      await login(page);
      await page.goto('/admin/messages');
      let card = page.locator('main > div').filter({ hasText: sender }).first();
      await expect(card).toContainText('Terminal failure');
      await expect(card).toContainText(
        `${CONTACT_NOTIFICATION_MAX_ATTEMPTS} attempts`,
      );
      await expect(card).toContainText('Provider rejected request');
      await expect(card).toContainText('Last attempt:');

      await card.getByRole('button', { name: 'Retry notification' }).click();
      card = page.locator('main > div').filter({ hasText: sender }).first();
      await expect(card).toContainText('Notification: disabled');
      await expect(card).toContainText('0 attempts');
      await expect(card).not.toContainText('Terminal failure');
      await expect(card).not.toContainText('Provider rejected request');
    } finally {
      await pool.query('DELETE FROM contact_messages WHERE id = $1', [messageId]);
      await pool.end();
    }
  });

  test('stores, marks, and deletes a contact message', async ({ page }) => {
    const sender = `E2E Sender ${runId}`;
    const email = `e2e-${runId}@example.com`;
    const organization = `E2E Labs ${runId}`;
    const message = `Disposable contact message ${runId} created by Playwright.`;

    await page.goto('/contact');
    await page.getByLabel('Name').fill(sender);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('What can I help with?').selectOption('role');
    await page.getByLabel(/Organization/).fill(organization);
    await page.getByLabel('Message').fill(message);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Thanks — your message has been sent.')).toBeVisible();

    await login(page);
    await page.goto('/admin/messages');
    const card = page.locator('main > div').filter({ hasText: sender }).filter({ hasText: email }).first();
    await expect(card).toContainText(message);
    await expect(card).toContainText(`Organization: ${organization}`);
    await expect(card).toContainText('role');
    await expect(card).toContainText('Notification: disabled');
    await expect(card).toContainText('New');

    await card.getByRole('button', { name: 'Mark read' }).click();
    const readCard = page.locator('main > div').filter({ hasText: sender }).first();
    await expect(readCard.getByRole('button', { name: 'Mark unread' })).toBeVisible();

    await readCard.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(sender)).toHaveCount(0);
  });
});
