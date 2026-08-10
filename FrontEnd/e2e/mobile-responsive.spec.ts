import { expect, test, type Page, type Route } from '@playwright/test';
import { API_ROUTE_PATTERN } from './config';

const mockCustomerNavigation = async (page: Page) => {
  await page.route(API_ROUTE_PATTERN, async (route: Route) => {
    const path = new URL(route.request().url()).pathname.toLowerCase();

    if (path.endsWith('/categories')) {
      await route.fulfill({ json: [{ categoryid: 1, categoryname: 'Điện thoại' }] });
      return;
    }

    if (path.endsWith('/brands')) {
      await route.fulfill({ json: [{ brandid: 1, brandname: 'Thương hiệu mẫu' }] });
      return;
    }

    if (path.endsWith('/products')) {
      await route.fulfill({
        json: [{
          productid: 1,
          productname: 'Điện thoại mẫu',
          category: { id: 1, name: 'Điện thoại' },
          brand: { id: 1, name: 'Thương hiệu mẫu' },
          variants: [],
        }],
      });
      return;
    }

    await route.fulfill({ json: [] });
  });
};

test('mobile menu keeps authentication actions and auth form transition', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockCustomerNavigation(page);
  await page.goto('/auth/login');

  await page.getByRole('button', { name: 'Mở menu' }).click();
  await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true })).toHaveAttribute('href', '/auth/login');
  await expect(page.getByRole('link', { name: 'Đăng ký', exact: true })).toHaveAttribute('href', '/auth/register');

  await page.getByRole('button', { name: 'Đóng menu' }).click();
  await page.getByRole('button', { name: 'Đăng ký miễn phí' }).click();

  await expect(page).toHaveURL(/\/auth\/register$/);
  await expect(page.locator('.auth-form-panel--register')).toHaveCSS('animation-name', 'auth-mobile-enter-left');
  await expect(page.locator('.auth-form-panel--register')).toHaveCSS('opacity', '1');
  await expect(page.locator('.auth-form-panel--login')).toHaveCSS('opacity', '0');
});

test('tablet uses the compact navigation without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await mockCustomerNavigation(page);
  await page.goto('/auth/login');

  await expect(page.getByRole('button', { name: 'Mở menu' })).toBeVisible();
  await expect(page.locator('header nav').first()).toBeHidden();

  const sizing = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));
  expect(sizing.pageWidth).toBeLessThanOrEqual(sizing.viewportWidth);
});
