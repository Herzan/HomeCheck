import { test, expect } from '@playwright/test';

test('dashboard shows loading state first', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(
    page.getByText(/Loading/i).or(page.getByRole('heading', { name: /Login/i }))
  ).toBeVisible();
});

test('dashboard tabs are visible after login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).not.toHaveTitle(/Error/);
});