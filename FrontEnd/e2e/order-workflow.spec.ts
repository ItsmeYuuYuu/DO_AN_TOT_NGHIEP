import { expect, test, type Page, type Route } from '@playwright/test';

const adminSession = {
  accessToken: 'e2e-admin-token',
  expiresAt: Date.now() + 60 * 60 * 1000,
  user: {
    userid: '1',
    username: 'admin.e2e',
    fullname: 'Admin E2E',
    email: 'admin.e2e@example.test',
    rolename: 'Admin',
    exp: Math.floor(Date.now() / 1000) + 3600,
  },
};

async function authenticateAsAdmin(page: Page) {
  await page.addInitScript(session => {
    window.localStorage.setItem('ec_session', JSON.stringify(session));
  }, adminSession);
}

const guestCodOrder = {
  orderid: 33,
  orderdate: '2026-07-18T06:52:00',
  orderstatus: 'Processing',
  paymentmethod: 'COD',
  paymentstatus: 'CODPending',
  finalamount: 25_990_000,
  paidamount: 0,
  checkouttype: 'Guest',
  shippingname: 'Khách vãng lai E2E',
  shippingphone: '0901234567',
  shippingaddress: '180 Cao Lỗ, Phường An Hội Đông, Thành phố Hồ Chí Minh',
  itemcount: 1,
  devices: [{
    orderitemid: 3301,
    imei: 'DEMO-E2E-GUEST-01',
    productname: 'Google Pixel 9 Pro',
    variantsku: 'PIX9P-256-NEW',
    inventorystatus: 'Reserved',
  }],
  assignment: {
    assignmentid: 100,
    orderid: 33,
    department: 'Warehouse',
    assigneduserid: 1,
    assigneduser: 'Admin E2E',
    status: 'Assigned',
  },
};

test('guest COD order can be handed off by Sales', async ({ page }) => {
  await authenticateAsAdmin(page);
  await page.route('https://localhost:7035/api/**', async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/OrderAssignments/queue/Sales')) {
      await route.fulfill({
        json: [{
          ...guestCodOrder,
          orderstatus: 'Pending',
          assignment: undefined,
          devices: [],
        }],
      });
      return;
    }
    if (url.pathname.endsWith('/OrderAssignments/employees/Sales')) {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname.endsWith('/cart')) {
      await route.fulfill({ json: { userId: 1, items: [] } });
      return;
    }
    await route.fulfill({ json: {} });
  });

  await page.goto('/admin/sales-orders');
  await expect(page.getByRole('button', { name: /Bàn giao sang kho/i })).toBeVisible();
});

test('guest warehouse shipment uses internal HCMC store delivery', async ({ page }) => {
  await authenticateAsAdmin(page);
  let shipped = false;

  await page.route('https://localhost:7035/api/**', async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/OrderAssignments/queue/Warehouse')) {
      await route.fulfill({ json: shipped ? [] : [guestCodOrder] });
      return;
    }
    if (url.pathname.endsWith('/OrderAssignments/employees/Warehouse')) {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname.endsWith('/OrderAssignments/33/mark-shipped')) {
      const payload = route.request().postDataJSON();
      expect(payload).toMatchObject({
        carrier: 'STORE_DELIVERY',
        imeis: ['DEMO-E2E-GUEST-01'],
      });
      shipped = true;
      await route.fulfill({ json: { ...guestCodOrder, orderstatus: 'Shipped' } });
      return;
    }
    if (url.pathname.endsWith('/cart')) {
      await route.fulfill({ json: { userId: 1, items: [] } });
      return;
    }
    await route.fulfill({ json: {} });
  });

  await page.goto('/admin/warehouse-orders');
  await page.getByRole('button', { name: /Kiểm tra IMEI/i }).click();

  const carrier = page.getByLabel(/Đơn vị vận chuyển/i);
  await expect(carrier).toHaveValue('STORE_DELIVERY');
  await expect(carrier).toBeDisabled();
  await expect(carrier.locator('option:checked')).toHaveText('Cửa hàng giao nội thành TP.HCM');

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Xác nhận xuất giao/i }).click();
  await expect(page.getByText(/Hiện không có công việc nào trong hàng đợi/i)).toBeVisible();
});
