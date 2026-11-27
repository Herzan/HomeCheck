import { test, expect } from '@playwright/test';

test('login page shows Renter / Homeowner tabs', async ({ page }) => {
  await page.goto('/login');

  const renterBtn = page.getByRole('button', { name: /RENTER/i });
  const ownerBtn = page.getByRole('button', { name: /HOMEOWNER/i });

  await expect(renterBtn).toBeVisible();
  await expect(ownerBtn).toBeVisible();

  await expect(renterBtn).toHaveClass(/on/);

  await ownerBtn.click();
  await expect(ownerBtn).toHaveClass(/on/);
  await expect(page.getByRole('heading', { name: /Homeowner/i })).toBeVisible();

  await renterBtn.click();
  await expect(renterBtn).toHaveClass(/on/);
});

test('login form shows email + password', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByPlaceholder('user@email.com')).toBeVisible();
  await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});

test('can switch between login and register', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('link', { name: /Register as Renter/i }).click();
  await expect(page.getByRole('heading', { name: /Registration/i })).toBeVisible();

  await page.getByRole('link', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: /Login/i })).toBeVisible();
});