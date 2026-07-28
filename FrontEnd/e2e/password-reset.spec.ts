import { expect, test, type Route } from '@playwright/test';
import { API_ROUTE_PATTERN } from './config';

test('customer requests a one-time code and resets the password', async ({ page }) => {
  await page.route(API_ROUTE_PATTERN, async (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path.endsWith('/auth/forgot-password')) {
      expect(request.postDataJSON()).toEqual({ email: 'customer@example.test' });
      await route.fulfill({
        json: { message: 'Mã khôi phục đã được gửi.' },
      });
      return;
    }

    if (path.endsWith('/auth/reset-password')) {
      expect(request.postDataJSON()).toEqual({
        email: 'customer@example.test',
        verificationCode: '123456',
        newPassword: 'Recovered@123',
        confirmPassword: 'Recovered@123',
      });
      await route.fulfill({
        json: { message: 'Đặt lại mật khẩu thành công.' },
      });
      return;
    }

    await route.fulfill({ json: [] });
  });

  await page.goto('/forgot-password');
  await page.getByPlaceholder('Nhập địa chỉ email *').fill('customer@example.test');
  await page.getByRole('button', { name: 'Gửi mã khôi phục' }).click();

  await expect(page.getByRole('heading', { name: 'Đặt mật khẩu mới' })).toBeVisible();
  await page.getByPlaceholder('Mã khôi phục 6 chữ số *').fill('123456');
  await page.getByPlaceholder('Mật khẩu mới *', { exact: true }).fill('Recovered@123');
  await page.getByPlaceholder('Xác nhận mật khẩu mới *').fill('Recovered@123');
  await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();

  await expect(page.getByRole('heading', { name: 'Khôi phục thành công' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Đăng nhập ngay' })).toHaveAttribute('href', '/auth/login');
});
