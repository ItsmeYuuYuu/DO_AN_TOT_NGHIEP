import { expect, test, type Route } from '@playwright/test';

const adminSession = {
  accessToken: 'e2e-admin-token',
  expiresAt: Date.now() + 60 * 60 * 1000,
  user: {
    userid: '1',
    username: 'admin_e2e',
    fullname: 'Admin E2E',
    email: 'admin.e2e@example.test',
    rolename: 'Admin',
    exp: Math.floor(Date.now() / 1000) + 3600,
  },
};

test('product detail safely renders CKEditor HTML and legacy images', async ({ page }) => {
  await page.route('https://localhost:7035/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/Products/9901/full-detail')) {
      await route.fulfill({
        json: {
          productid: 9901,
          slug: 'ckeditor-e2e',
          productname: 'Sản phẩm CKEditor E2E',
          description: [
            '<h2>Camera chuyên nghiệp</h2>',
            '<p>Ảnh chụp <strong>rõ nét</strong> trong mọi điều kiện.</p>',
            '<ul><li>Chống rung quang học</li><li>Quay video 4K</li></ul>',
            '<img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E" onerror="window.__richTextXss=true">',
            '<script>window.__richTextXss=true</script>',
            '![Ảnh mô tả cũ](data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E)',
          ].join(''),
          brand: { id: 1, name: 'E2E Brand' },
          category: { id: 1, name: 'Điện thoại' },
          productvariants: [{
            variantid: 9902,
            productid: 9901,
            sku: 'CKEDITOR-E2E',
            baseprice: 10_000_000,
            stockquantity: 1,
            productimages: [],
            attributes: [],
          }],
          reviewSummary: { avgRating: 0, totalReviews: 0, star5: 0, star4: 0, star3: 0, star2: 0, star1: 0 },
          relatedProducts: [],
        },
      });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.goto('/products/9901');

  const content = page.locator('.rich-text-content');
  await expect(content.getByRole('heading', { name: 'Camera chuyên nghiệp' })).toBeVisible();
  await expect(content.locator('strong')).toHaveText('rõ nét');
  await expect(content.getByRole('listitem')).toHaveCount(2);
  await expect(content.locator('img[alt="Ảnh mô tả cũ"]')).toBeVisible();
  await expect(content.locator('script')).toHaveCount(0);
  await expect(content.locator('img[onerror]')).toHaveCount(0);
  await expect(page.evaluate(() => Boolean((window as typeof window & { __richTextXss?: boolean }).__richTextXss))).resolves.toBe(false);
});

test('product form loads CKEditor and applies formatting', async ({ page }) => {
  await page.addInitScript(session => {
    window.localStorage.setItem('ec_session', JSON.stringify(session));
  }, adminSession);
  await page.route('https://localhost:7035/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/cart')) {
      await route.fulfill({ json: { userId: 1, items: [] } });
      return;
    }
    if (path.endsWith('/Brands')) {
      await route.fulfill({ json: [{ brandid: 1, brandname: 'E2E Brand' }] });
      return;
    }
    if (path.endsWith('/Categories')) {
      await route.fulfill({ json: [{ categoryid: 1, categoryname: 'Điện thoại' }] });
      return;
    }
    if (path.endsWith('/ProductImages/upload') && route.request().method() === 'POST') {
      await route.fulfill({
        json: [{
          fileName: 'ckeditor-e2e.png',
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          size: 68,
        }],
      });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.goto('/admin/products');
  await page.getByRole('button', { name: 'Thêm sản phẩm' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('VD: Google Pixel 8 Pro').fill('CKEditor runtime test');
  await dialog.getByRole('combobox').nth(0).selectOption('1');
  await dialog.getByRole('combobox').nth(1).selectOption('1');
  await dialog.getByPlaceholder('0').nth(0).fill('10000000');
  await dialog.getByPlaceholder('0').nth(2).fill('1');
  await dialog.getByRole('button', { name: 'Tiếp theo' }).click();

  const editor = dialog.locator('.ck-content[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Bold' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Insert table' })).toBeVisible();
  await editor.fill('Camera rõ nét');
  await editor.selectText();
  await dialog.getByRole('button', { name: 'Bold' }).click();
  await expect(editor.locator('strong')).toHaveText('Camera rõ nét');

  await dialog.locator('input[type="file"]').first().setInputFiles({
    name: 'description.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
  });
  await expect(editor.locator('img')).toBeVisible();
});
