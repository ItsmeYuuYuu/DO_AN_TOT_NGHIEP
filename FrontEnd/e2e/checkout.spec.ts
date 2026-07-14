import { expect, test, type Page, type Route } from '@playwright/test';

const cartItem = {
  variantId: 501,
  productId: 50,
  productName: 'Điện thoại E2E',
  variantName: '128GB - Đen',
  sku: 'E2E-128-BLACK',
  imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E',
  price: 9_000_000,
  quantity: 1,
};

async function mockCheckoutApi(page: Page) {
  await page.route('https://provinces.open-api.vn/**', route => route.fulfill({ json: [] }));
  await page.route('https://localhost:7035/api/**', async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/WarrantyPackages')) {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname.endsWith('/Orders') && route.request().method() === 'POST') {
      const payload = route.request().postDataJSON();
      expect(payload).toMatchObject({
        userid: null,
        customername: 'Khách E2E',
        customerphone: '0901234567',
        paymentmethod: 'COD',
        items: [{ variantid: 501, quantity: 1 }],
      });
      expect(payload.shippingaddress).toContain('Thành phố Hồ Chí Minh');
      await route.fulfill({
        status: 201,
        json: {
          orderid: 9001,
          finalamount: 9_000_000,
          paymentstatus: 'CODPending',
          checkouttype: 'Guest',
        },
      });
      return;
    }
    await route.fulfill({ json: [] });
  });
}

test('guest completes local HCMC COD checkout', async ({ page }) => {
  await page.addInitScript(item => {
    window.localStorage.setItem('ec_cart', JSON.stringify([item]));
  }, cartItem);
  await mockCheckoutApi(page);

  await page.goto('/checkout');
  await page.getByPlaceholder('Nguyễn Văn A').fill('Khách E2E');
  await page.getByPlaceholder('0901234567').fill('0901234567');
  await page.getByPlaceholder('email@example.com').fill('guest.e2e@example.test');
  await page.getByPlaceholder('Số nhà, tên đường, tòa nhà...').fill('12 Nguyễn Huệ');
  await page.getByLabel('Tỉnh / Thành phố *').selectOption('79');
  await page.getByLabel(/Phường \/ Xã/).selectOption('hcm-ben-thanh');
  await page.getByText('Thanh toán khi nhận hàng (COD)', { exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận đặt hàng' }).click();

  await expect(page.getByRole('heading', { name: 'Đặt hàng thành công' })).toBeVisible();
  await expect(page.getByText('#9001')).toBeVisible();
});
