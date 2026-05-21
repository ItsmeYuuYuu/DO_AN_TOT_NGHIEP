# ECommerce - One-Pass Execution Spec For Antigravity

**Project root:** `D:\LuanVan\ECommerce`
**Date:** 2026-05-16
**Primary objective:** Normalize FE/BE contract, eliminate critical runtime mismatches, introduce DTO architecture, and stabilize core e-commerce flows.

---

## 1) Current State Summary

### 1.1 What is already working

#### Backend
- .NET Web API bootstrapped with JWT auth, CORS, Swagger.
- Seed data exists for roles/users/categories/brands/products/variants/customers/orders/banners/sliders.
- Global async audit logging exists (background queue + action filter).
- Many entity CRUD controllers already exist.
- Auth login/me/change-password exists and uses BCrypt + JWT.

#### Frontend
- Role-based routing and guard are implemented.
- Login + session storage + global 401 interceptor are implemented.
- Shared UI components are already reusable.
- Admin screens exist for dashboard/products/orders/users/customers/category-brand.
- Customer screens exist for home/product detail/cart/checkout/profile.
- Cart context with localStorage persistence exists.

### 1.2 What is missing / incomplete
- Multiple links/routes are referenced but not implemented as pages/routes.
- Core order workflow is not fully domain-correct (items, inventory deduction, discount computation, rollback logic).
- No automated tests found (unit/integration/e2e).
- DTO + validation standardization is incomplete.
- DB migration/versioning workflow is not clearly established.

---

## 2) Critical FE/BE Mismatches To Fix First (P0 blockers)

1. FE calls `PUT /Products/{id}` but BE `ProductsController` has no PUT endpoint.
2. Product API response is too thin (`ToListAsync` / `FindAsync`) while FE expects `brand`, `category`, `productvariants`, `productimages`.
3. Route mismatch: FE links to `/products/:id` while app route currently uses `/product/:id`.
4. FE calls `/auth/logout` but BE has no logout endpoint.
5. Admin user create sends plain password into `passwordhash` semantics; BE login verifies BCrypt hash -> new users can fail login.
6. Checkout payload sends `shippingaddress` / `note` and does not align with BE `Order` model and complete order creation requirements.
7. Profile uses `user.userid` to query orders, but BE filter endpoint uses `Order.Customerid` domain.
8. Most business controllers are not protected with `[Authorize]` + role policies.
9. Sensitive credentials/secrets are hardcoded in repository.

---

## 3) Target Architecture (DTO-first)

### 3.1 DTO folders
Create:

```text
BackEnd/ECommerceBackend/DTOs/
  Common/
  Auth/
  Users/
  Products/
  Orders/
  Categories/
  Brands/
```

### 3.2 DTO definitions

#### Common
- `LookupDto`:
  - `int Id`
  - `string Name`
- `ApiMessageDto`:
  - `string Message`
- `ApiErrorDto`:
  - `string Message`
  - `Dictionary<string, string[]>? Errors`

#### Auth
- `LoginRequestDto`: `Username`, `Password`
- `LoginResponseDto`: `Userid`, `Username`, `Fullname`, `Email`, `Roleid`, `Rolename`, `AccessToken`, `ExpiresIn`
- `MeResponseDto`: `Userid`, `Username`, `Fullname`, `Email`, `Roleid`, `Rolename`
- `ChangePasswordRequestDto`: `Userid`, `OldPassword`, `NewPassword`

#### Users
- `UserListItemDto`: `Userid`, `Username`, `Fullname`, `Email`, `Phone`, `Roleid`, `Rolename`, `Isactive`, `Createdat`
- `CreateUserRequestDto`: `Username`, `Password`, `Fullname`, `Email`, `Phone`, `Roleid`, `Isactive`
- `UpdateUserRequestDto`: `Fullname`, `Email`, `Phone`, `Roleid`, `Isactive`, `NewPassword`
- `ToggleUserActiveResponseDto`: `Userid`, `Isactive`

#### Products
- `ProductImageDto`: `Imageid`, `Imageurl`, `Ismain`
- `ConditionDto`: `Conditionid`, `Conditionname`
- `ProductVariantDto`: `Variantid`, `Productid`, `Sku`, `Baseprice`, `Saleprice`, `Condition`, `Productimages`
- `ProductListItemDto`: `Productid`, `Productname`, `Description`, `Createdat`, `Brand`, `Category`, `Productvariants`
- `ProductDetailDto`: same as list but full detail payload
- `CreateProductRequestDto`: `Productname`, `Description`, `Categoryid`, `Brandid`
- `UpdateProductRequestDto`: `Productname`, `Description`, `Categoryid`, `Brandid`

#### Orders
- `CustomerLiteDto`: `Customerid`, `Fullname`, `Phone`, `Email`
- `OrderItemDto`: `Orderitemid`, `Orderid`, `Imei`, `Sellingprice`, `Warrantyprice`, `Packageid`
- `OrderListItemDto`: `Orderid`, `Customerid`, `Orderdate`, `Orderstatus`, `Totalamount`, `Discountamount`, `Finalamount`, `Paymentmethod`, `Customer`, `Orderitems`
- `OrderDetailDto`: expands `OrderListItemDto`
- `CreateOrderItemRequestDto`: `Variantid`, `Quantity`
- `CreateOrderRequestDto`: `Customerid`, `Paymentmethod`, `Vouchercode`, `Items`, `Shippingaddress?`, `Note?`
- `UpdateOrderRequestDto`: optional editable order fields (non-destructive)
- `UpdateOrderStatusRequestDto`: `Status`
- `UpdateOrderStatusResponseDto`: `Orderid`, `Orderstatus`

#### Categories / Brands
- `CategoryDto`, `CreateCategoryRequestDto`, `UpdateCategoryRequestDto`
- `BrandDto`, `CreateBrandRequestDto`, `UpdateBrandRequestDto`

---

## 4) Endpoint-to-DTO Mapping (must follow)

### AuthController
- `POST /api/auth/login` -> `LoginRequestDto` -> `LoginResponseDto`
- `GET /api/auth/me` -> `MeResponseDto`
- `POST /api/auth/change-password` -> `ChangePasswordRequestDto` -> `ApiMessageDto`
- `POST /api/auth/logout` (add) -> `ApiMessageDto`

### UsersController
- `GET /api/users` -> `List<UserListItemDto>`
- `GET /api/users/{id}` -> `UserListItemDto`
- `POST /api/users` -> `CreateUserRequestDto` -> `UserListItemDto`
- `PUT /api/users/{id}` -> `UpdateUserRequestDto` -> `UserListItemDto`
- `PATCH /api/users/{id}/toggle-active` -> `ToggleUserActiveResponseDto`
- `DELETE /api/users/{id}` -> `204`

### ProductsController
- `GET /api/products` -> `List<ProductListItemDto>`
- `GET /api/products/{id}` -> `ProductDetailDto`
- `POST /api/products` -> `CreateProductRequestDto` -> `ProductDetailDto`
- `PUT /api/products/{id}` (add) -> `UpdateProductRequestDto` -> `ProductDetailDto`
- `DELETE /api/products/{id}` -> `204`

### ProductVariantsController
- `GET /api/productvariants` -> `List<ProductVariantDto>`
- `GET /api/productvariants/{id}` -> `ProductVariantDto`
- `GET /api/productvariants/product/{productId}` -> `List<ProductVariantDto>`
- `POST /api/productvariants` -> request DTO -> `ProductVariantDto`
- `PUT /api/productvariants/{id}` -> request DTO -> `ProductVariantDto`
- `DELETE /api/productvariants/{id}` -> `204`

### OrdersController
- `GET /api/orders` -> `List<OrderListItemDto>`
- `GET /api/orders/{id}` -> `OrderDetailDto`
- `GET /api/orders/customer/{customerId}` -> `List<OrderListItemDto>`
- `POST /api/orders` -> `CreateOrderRequestDto` -> `OrderDetailDto`
- `PUT /api/orders/{id}` -> `UpdateOrderRequestDto` -> `OrderDetailDto`
- `PATCH /api/orders/{id}/status` -> `UpdateOrderStatusRequestDto` -> `UpdateOrderStatusResponseDto`
- `DELETE /api/orders/{id}` -> `204`

### CategoriesController
- `GET /api/categories` -> `List<CategoryDto>`
- `GET /api/categories/{id}` -> `CategoryDto`
- `POST /api/categories` -> `CreateCategoryRequestDto` -> `CategoryDto`
- `PUT /api/categories/{id}` -> `UpdateCategoryRequestDto` -> `CategoryDto`
- `DELETE /api/categories/{id}` -> `204`

### BrandsController
- `GET /api/brands` -> `List<BrandDto>`
- `GET /api/brands/{id}` -> `BrandDto`
- `POST /api/brands` -> `CreateBrandRequestDto` -> `BrandDto`
- `PUT /api/brands/{id}` -> `UpdateBrandRequestDto` -> `BrandDto`
- `DELETE /api/brands/{id}` -> `204`

---

## 5) Execution Plan By Priority

## P0 - Contract Sync + Runtime blockers (mandatory first)

### P0.1 Routing alignment
- Unify product detail route: choose one convention and apply globally (`/product/:id` OR `/products/:id`).
- Implement missing routes/pages or disable dead links:
  - `/products`
  - `/search`
  - `/news`
  - `/order-lookup`
  - `/promotions`
  - `/forgot-password`
  - `/auth/register`
  - `/admin/vouchers`
  - `/staff/inventory`
  - `/staff/purchase-orders`
  - `/staff/warranties`

### P0.2 API contract fixes
- Add `PUT /api/products/{id}`.
- Enrich products GET/list/detail payload with related brand/category/variants/images.
- Add `POST /api/auth/logout` or remove FE call (choose one consistent approach).

### P0.3 User creation correctness
- On user create/update, hash password server-side with BCrypt (`Password`/`NewPassword` fields), never trust FE `passwordhash` literal.

### P0.4 Checkout/profile flow correctness
- Define one identity mapping strategy for Customer vs User.
- Ensure checkout sends complete valid order payload (`Customerid`, `Items`, `Paymentmethod`, `Totalamount`, `Finalamount`, etc.).
- Ensure profile query uses correct customer key.

### P0 acceptance criteria
- Admin product update succeeds from UI without 404/405.
- Product list/detail renders brand/category/variant/image reliably.
- Login/logout flow has no dead API call.
- Newly created user can login immediately.
- Checkout creates valid order with items; profile displays orders for correct account.

---

## P1 - Security + Data integrity

### P1.1 Authorization
- Apply `[Authorize]` on business controllers.
- Apply role policies (`Admin`, `Staff`, `Customer`) per endpoint.

### P1.2 DTO + validation
- Replace direct entity binding with request DTOs for POST/PUT/PATCH.
- Add validation attributes and consistent `400` error body (`ApiErrorDto`).

### P1.3 Secret management
- Move DB credentials + JWT secret to env/user-secrets.
- Rotate compromised demo secrets.
- Remove plain credentials from README if repository is shared/public.

### P1 acceptance criteria
- Unauthorized requests are blocked consistently.
- Validation errors return standardized schema.
- No hardcoded secrets remain in runtime config tracked by git.

---

## P2 - Core e-commerce domain completion

### P2.1 Order domain workflow
- Implement robust order creation pipeline:
  - Validate stock
  - Reserve/deduct inventory atomically
  - Apply voucher
  - Compute `Discountamount` and `Finalamount` server-side
  - Persist order + orderitems transactionally
- Implement status transitions + rollback rules (e.g., cancel restores stock when applicable).

### P2.2 Feature completeness
- Deliver missing portals/pages (products listing, search, news, order lookup, vouchers admin, staff modules).
- Introduce service layer for business logic; keep controllers thin.

### P2 acceptance criteria
- End-to-end order flow matches business rules.
- Inventory remains consistent after create/cancel transitions.
- Missing portals are available and connected to real APIs.

---

## P3 - Quality and operations

### P3.1 Automated testing
- Add unit tests (services/calculations).
- Add integration tests (API contracts/auth/authorization).
- Add e2e tests for login/cart/checkout/profile.

### P3.2 DB lifecycle
- Introduce EF Core migration workflow and version control.
- Remove reliance on ad-hoc scaffold + `EnsureCreated` for production-like environments.

### P3.3 Observability and standards
- Structured error handling and logging standards.
- CI checks for build/test/lint.

### P3 acceptance criteria
- CI pipeline validates build + tests.
- Migration scripts are deterministic across environments.

---

## P4 - Feature completion for placeholder routes

### P4.1 Scope
Replace all "Feature under development" placeholder pages/routes with working modules and real API integrations.

### P4.2 Priority order
1. **Customer-facing modules first**
   - `/products`
   - `/search`
   - `/news`
   - `/promotions`
   - `/order-lookup`
2. **Auth support modules**
   - `/auth/register`
   - `/forgot-password`
3. **Backoffice modules**
   - `/admin/vouchers`
   - `/staff/inventory`
   - `/staff/purchase-orders`
   - `/staff/warranties`

### P4.3 Backend/API requirements
- Add missing endpoints required by these screens.
- Reuse DTO-first contract and `ApiErrorDto` standards from P1/P2/P3.
- Keep authorization/role matrix enforced for Admin/Staff/Customer flows.
- Do not introduce major DB schema changes without approval.

### P4.4 Frontend requirements
- Remove placeholder mappings and wire real pages/components.
- Connect each page to real APIs with loading/error/empty states.
- Ensure route consistency and no dead links.

### P4 acceptance criteria
- No target route in section P4.2 shows placeholder content.
- Customer routes are usable end-to-end with real data.
- Backoffice routes perform expected CRUD/actions with correct role permissions.
- Build passes for backend/frontend and smoke tests for each new route are documented.

---

## 6) Implementation Order For DTO Work (recommended)

1. **Users DTOs first**
   - Fix password handling and account lifecycle.
2. **Products DTOs second**
   - Fix list/detail payload mismatch immediately visible to FE.
3. **Orders DTOs third**
   - Fix checkout/profile and status update payloads.
4. **Auth DTOs fourth**
   - Standardize final auth contract.

---

## 7) Non-Negotiable Engineering Rules

1. Do not expose EF entities directly in API responses.
2. Do not bind EF entities directly from request body in create/update endpoints.
3. Password hashing must happen server-side only.
4. Monetary totals (`Totalamount`, `Discountamount`, `Finalamount`) are server-authoritative.
5. Use transactional boundaries for inventory + order writes.
6. Keep response contract stable once FE consumes DTOs.

---

## 8) Deliverables Checklist (Antigravity must produce)

- [ ] DTO folder tree created under `BackEnd/ECommerceBackend/DTOs`.
- [ ] DTO classes implemented for Auth/Users/Products/Orders/Categories/Brands/Common.
- [ ] Controllers mapped to DTOs per section 4.
- [ ] Product update endpoint added and wired.
- [ ] Route/link mismatches resolved.
- [ ] Checkout/profile identity mismatch resolved.
- [ ] User create/update password hashing fixed.
- [ ] Authorization policies applied to business endpoints.
- [ ] Hardcoded secrets removed from tracked config.
- [ ] Build passes for backend and frontend.
- [ ] Smoke test log/report included.

---

## 9) Suggested Smoke Test Matrix (minimum)

1. Login as Admin -> receive token and role.
2. Access protected admin endpoint without token -> 401.
3. Create user via admin -> user can login.
4. Product list/detail returns brand/category/variants/images.
5. Product update from admin UI succeeds.
6. Add to cart + checkout creates order with items.
7. Profile shows orders for the correct customer identity.
8. Update order status from staff/admin UI succeeds.

---

## 10) Final Completion Definition

Task is considered complete only when:
1. All P0 acceptance criteria are satisfied.
2. DTO mapping is implemented for targeted controllers.
3. No critical FE/BE mismatch remains in core flows.
4. Security baseline (P1 core items) is in place.

