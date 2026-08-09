export interface PermissionLabelSource {
  code: string;
  name: string;
}

export const roleLabels: Record<string, string> = {
  Admin: 'Quản trị viên',
  Customer: 'Khách hàng',
  Manager: 'Quản lý cửa hàng',
  Sales: 'Nhân viên bán hàng',
  Warehouse: 'Nhân viên kho',
  Warranty: 'Nhân viên bảo hành',
  Content: 'Nhân viên nội dung',
  Consultant: 'Nhân viên tư vấn AI',
};

export const getRoleLabel = (roleName: string): string =>
  roleLabels[roleName] ?? roleName;

export const createPermissionLabelMap = (
  permissions: readonly PermissionLabelSource[],
): ReadonlyMap<string, string> =>
  new Map(permissions.map(permission => [permission.code, permission.name]));

export const getPermissionLabel = (
  code: string,
  labels: ReadonlyMap<string, string>,
): string => labels.get(code) ?? 'Quyền hệ thống';
