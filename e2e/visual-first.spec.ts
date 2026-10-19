import { expect, test } from '@playwright/test';

test('product-gallery image can be expanded and closed with Escape', async ({ page }) => {
  await page.goto('/projects/kicad-mcp-pro');
  const enlarge = page.getByRole('button', { name: /^Expand image:/ }).first();
  await expect(enlarge).toBeVisible();
  await enlarge.click();
  const dialog = page.getByRole('dialog', { name: /^Expanded image:/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img')).toHaveAttribute('alt', /\S/);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('mobile privacy notice does not obscure half the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const privacy = page.getByRole('region', { name: 'Privacy choices' });
  await expect(privacy).toBeVisible();
  const bounds = await privacy.boundingBox();
  expect(bounds?.height).toBeLessThan(200);
  await page.getByRole('button', { name: 'Essential only' }).click();
  await expect(privacy).not.toBeVisible();
});

test('projects show product imagery before domain navigation when present', async ({ page }) => {
  await page.goto('/projects');
  const visual = page.getByRole('heading', { level: 2, name: 'See the engineering interfaces' });
  const domains = page.getByRole('heading', { level: 2, name: 'Browse by engineering domain' });
  // Disposable test fixtures may predate the current production case studies.
  if (await visual.count() > 0) {
    await expect(visual).toBeVisible();
    const positions = await Promise.all([visual, domains].map(async heading =>
      heading.evaluate(el => el.getBoundingClientRect().top + (document.querySelector('main')?.scrollTop ?? 0))));
    expect(positions[0]).toBeLessThan(positions[1]);
  }
});
