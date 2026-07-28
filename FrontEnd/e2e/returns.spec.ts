import { expect, test, type Page, type Route } from '@playwright/test';
import { API_ROUTE_PATTERN } from './config';

const session = {
  accessToken: 'e2e-mocked-token',
  expiresAt: Date.now() + 60 * 60 * 1000,
  user: {
    userid: '101',
    username: 'customer_e2e',
    fullname: 'Khách hàng E2E',
    email: 'customer.e2e@example.test',
    rolename: 'Customer',
    exp: Math.floor(Date.now() / 1000) + 3600,
  },
};

const completedOrder = {
  orderid: 7001,
  userid: 101,
  orderdate: new Date().toISOString(),
  orderstatus: 'Completed',
  totalamount: 10_000_000,
  discountamount: 1_000_000,
  finalamount: 9_000_000,
  paymentmethod: 'COD',
  paymentstatus: 'Paid',
  shipment: {
    shipmentid: 1,
    status: 'Delivered',
    deliveredat: new Date().toISOString(),
  },
  orderitems: [
    {
      orderitemid: 7101,
      orderid: 7001,
      imei: 'E2E-IMEI-7001',
      sellingprice: 10_000_000,
      productname: 'Điện thoại E2E',
      variantsku: 'E2E-128-BLACK',
    },
  ],
};

async function mockReturnsApi(page: Page, initialRequests: unknown[] = []) {
  let requests: unknown[] = initialRequests;
  await page.route(API_ROUTE_PATTERN, async (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname.endsWith('/cart')) {
      await route.fulfill({ json: { userId: 101, items: [] } });
      return;
    }
    if (url.pathname.endsWith('/ReturnRequests/mine')) {
      await route.fulfill({ json: requests });
      return;
    }
    if (url.pathname.endsWith('/Orders/user/101')) {
      await route.fulfill({ json: [completedOrder] });
      return;
    }
    if (url.pathname.endsWith('/ReturnRequests') && method === 'POST') {
      const payload = route.request().postDataJSON();
      expect(payload).toMatchObject({
        orderid: 7001,
        requesttype: 'Return',
        reasoncategory: 'ChangeOfMind',
        reason: 'Không còn nhu cầu sử dụng',
        orderitemids: [7101],
        refunddestination: { method: 'CASH', confirmed: true },
      });
      const created = {
        returnrequestid: 8001,
        orderid: 7001,
        requestedbyuserid: 101,
        requesttype: 'Return',
        reasoncategory: payload.reasoncategory,
        reason: payload.reason,
        description: payload.description,
        status: 'PendingReview',
        imageurls: [],
        requestedrefundamount: 8_100_000,
        refundstatus: 'Pending',
        policyversion: '2026.07',
        requestedat: new Date().toISOString(),
        items: [{
          returnitemid: 8101,
          orderitemid: 7101,
          imei: 'E2E-IMEI-7001',
          productname: 'Điện thoại E2E',
          sku: 'E2E-128-BLACK',
          refundamount: 8_100_000,
          originalpaidamount: 9_000_000,
          deductionamount: 900_000,
        }],
        histories: [{
          historyid: 1,
          fromstatus: '',
          tostatus: 'PendingReview',
          note: 'Khách hàng gửi yêu cầu đổi trả.',
          createdat: new Date().toISOString(),
        }],
        refundtransactions: [],
      };
      requests = [created];
      await route.fulfill({ status: 201, json: created });
      return;
    }
    if (url.pathname.endsWith('/ReturnRequests/8002/confirm-assessment') && method === 'POST') {
      const payload = route.request().postDataJSON();
      expect(payload).toMatchObject({ accepted: true });
      const updated = { ...(requests[0] as Record<string, unknown>), status: 'RefundPending', refundstatus: 'Pending' };
      requests = [updated];
      await route.fulfill({ json: updated });
      return;
    }
    await route.fulfill({ json: [] });
  });
}

test('customer creates a cash return request from a completed order', async ({ page }) => {
  await page.addInitScript(storedSession => {
    window.localStorage.setItem('ec_session', JSON.stringify(storedSession));
  }, session);
  await mockReturnsApi(page);

  await page.goto('/returns');
  await page.getByRole('button', { name: 'Tạo yêu cầu' }).click();
  await page.getByLabel('Đơn hàng').selectOption('7001');
  await page.getByText('Điện thoại E2E', { exact: true }).click();
  await page.getByPlaceholder('Ví dụ: sản phẩm lỗi, không đúng mô tả...').fill('Không còn nhu cầu sử dụng');
  await page.getByPlaceholder('Tình trạng máy, phụ kiện và hộp khi gửi lại...').fill('Máy còn nguyên hộp');
  await page.getByText('Tôi đã kiểm tra và xác nhận thông tin nhận tiền hoàn là chính xác.').click();
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();

  await expect(page.getByRole('heading', { name: 'Trả hàng: Không còn nhu cầu sử dụng' })).toBeVisible();
  await expect(page.getByText('Hoàn dự kiến:')).toContainText('8.100.000');
  await expect(page.getByText('Lịch sử xử lý (1)')).toBeVisible();
});

test('customer accepts the final refund assessment before payment', async ({ page }) => {
  await page.addInitScript(storedSession => {
    window.localStorage.setItem('ec_session', JSON.stringify(storedSession));
  }, session);
  await mockReturnsApi(page, [{
    returnrequestid: 8002,
    orderid: 7001,
    requestedbyuserid: 101,
    requesttype: 'Return',
    reasoncategory: 'ChangeOfMind',
    reason: 'Không còn nhu cầu sử dụng',
    status: 'AwaitingCustomerConfirmation',
    imageurls: [],
    requestedrefundamount: 8_100_000,
    approvedrefundamount: 7_020_000,
    refundstatus: 'AwaitingConfirmation',
    policyversion: '2026.07',
    refundcalculation: {
      policyversion: '2026.07',
      deliverydate: new Date().toISOString(),
      dayssincedelivery: 5,
      totaldeductionamount: 1_980_000,
      items: [{
        orderitemid: 7101,
        imei: 'E2E-IMEI-7001',
        originalpaidamount: 9_000_000,
        inspectiongrade: 'Grade98',
        faultresponsibility: 'NoFault',
        timedeductionrate: 10,
        conditiondeductionrate: 5,
        missingboxrate: 2,
        missingaccessoryrate: 5,
        totaldeductionrate: 22,
        deductionamount: 1_980_000,
        refundamount: 7_020_000,
      }],
    },
    requestedat: new Date().toISOString(),
    items: [{
      returnitemid: 8102,
      orderitemid: 7101,
      imei: 'E2E-IMEI-7001',
      productname: 'Điện thoại E2E',
      refundamount: 7_020_000,
      originalpaidamount: 9_000_000,
      deductionamount: 1_980_000,
      inspectiongrade: 'Grade98',
      faultresponsibility: 'NoFault',
    }],
    histories: [],
    refundtransactions: [],
  }]);

  await page.goto('/returns');
  await expect(page.getByText('Xác nhận kết quả kiểm định')).toBeVisible();
  await expect(page.getByText('7.020.000 ₫', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đồng ý mức hoàn' }).click();
  await expect(page.getByText('Chờ hoàn tiền')).toBeVisible();
});
