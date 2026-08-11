import { expect, test, type Page, type Route } from '@playwright/test';
import { API_ROUTE_PATTERN } from './config';

const mockCustomerNavigation = async (page: Page) => {
  await page.route(API_ROUTE_PATTERN, async (route: Route) => {
    const path = new URL(route.request().url()).pathname.toLowerCase();

    if (path.endsWith('/auth/refresh')) {
      await route.fulfill({ status: 401, json: { message: 'No active session' } });
      return;
    }

    if (path.endsWith('/auth/login')) {
      await route.fulfill({
        json: {
          accessToken: 'mobile-profile-test-token',
          expiresIn: 3600,
          userid: 1,
          username: 'mobile-test@example.com',
          fullname: 'Người dùng kiểm thử',
          email: 'mobile-test@example.com',
          rolename: 'Customer',
          roleids: [],
          rolenames: ['Customer'],
          permissions: [],
        },
      });
      return;
    }

    if (path.endsWith('/cart') || path.includes('/cart/')) {
      await route.fulfill({ json: { userId: 1, items: [] } });
      return;
    }

    if (path.endsWith('/profile/me')) {
      await route.fulfill({
        json: {
          userid: 1,
          username: 'mobile-test@example.com',
          fullname: 'Người dùng kiểm thử',
          email: 'mobile-test@example.com',
          phone: '0900000000',
          rolename: 'Customer',
        },
      });
      return;
    }

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
  await expect(page.locator('#customer-mobile-menu a[href="/"]')).toHaveCount(1);
  await expect(page.locator('#customer-mobile-menu a[href*="sort=newest"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true })).toHaveAttribute('href', '/auth/login');
  await expect(page.getByRole('link', { name: 'Đăng ký', exact: true })).toHaveAttribute('href', '/auth/register');

  await page.getByRole('button', { name: 'Đóng menu' }).click();
  await page.getByRole('button', { name: 'Đăng ký miễn phí' }).click();

  await expect(page).toHaveURL(/\/auth\/register$/);
  await expect(page.locator('.auth-form-panel--register')).toHaveCSS('animation-name', 'auth-mobile-enter-left');
  await expect(page.locator('.auth-form-panel--register')).toHaveCSS('opacity', '1');
  await expect(page.locator('.auth-form-panel--login')).toHaveCSS('opacity', '0');

  const registrationOrder = await page.evaluate(() => ({
    email: document.querySelector<HTMLInputElement>('input[name="email"]')?.getBoundingClientRect().top ?? 0,
    code: document.querySelector<HTMLInputElement>('input[name="verificationCode"]')?.getBoundingClientRect().top ?? 0,
    username: document.querySelector<HTMLInputElement>('input[name="username"]')?.getBoundingClientRect().top ?? 0,
  }));
  expect(registrationOrder.email).toBeLessThan(registrationOrder.username);
  expect(registrationOrder.code).toBeLessThan(registrationOrder.username);
});

test('chat widget limits account-only actions and removes inactive customer UI', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockCustomerNavigation(page);
  await page.goto('/');

  await expect(page.locator('header nav a[href="/"]')).toHaveCount(1);
  await expect(page.locator('header nav a[href*="sort=newest"]')).toHaveCount(0);
  await expect(page.locator('header nav')).toHaveCSS('border-top-width', '0px');

  await expect(page.getByRole('navigation').getByText('So sánh bằng AI', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Nhận tin mới', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /Hỏi AI chọn máy/i }).click();
  await expect(page.getByText('Chăm sóc khách hàng', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lịch sử', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mở lịch sử', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Gặp tư vấn/i })).toHaveCount(0);

  await page.goto('/auth/login');
  await page.getByPlaceholder('Ví dụ: nguyenvana hoặc email@gmail.com').fill('mobile-test@example.com');
  await page.getByPlaceholder('Nhập mật khẩu').fill('Mobile@123');
  await page.getByRole('button', { name: 'Đăng nhập ngay' }).click();
  await expect(page).toHaveURL('/');
  await page.getByRole('button', { name: /Hỏi AI chọn máy/i }).click();

  await expect(page.getByRole('button', { name: 'Lịch sử', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mở lịch sử', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Gặp tư vấn|Đã chuyển/i })).toBeVisible();
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

test('profile keeps its content inside the mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockCustomerNavigation(page);
  await page.goto('/auth/login');
  await page.getByPlaceholder('Ví dụ: nguyenvana hoặc email@gmail.com').fill('mobile-test@example.com');
  await page.getByPlaceholder('Nhập mật khẩu').fill('Mobile@123');
  await page.getByRole('button', { name: 'Đăng nhập ngay' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/profile');

  await expect(page.getByRole('heading', { name: 'Tài khoản của tôi' })).toBeVisible();
  await expect(page.getByLabel('Bộ lọc lịch sử đơn hàng')).toBeVisible();

  const sizing = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));
  expect(sizing.pageWidth).toBeLessThanOrEqual(sizing.viewportWidth);
});
