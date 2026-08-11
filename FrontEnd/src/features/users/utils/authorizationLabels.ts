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
  Consultant: 'Nhân viên chăm sóc khách hàng',
};

export const getRoleLabel = (roleName: string): string =>
  roleLabels[roleName] ?? roleName;

const roleBadgeClasses: Record<string, string> = {
  Admin: 'border-rose-200 bg-rose-50 text-rose-700',
  Manager: 'border-violet-200 bg-violet-50 text-violet-700',
  Sales: 'border-blue-200 bg-blue-50 text-blue-700',
  Warehouse: 'border-amber-200 bg-amber-50 text-amber-700',
  Warranty: 'border-teal-200 bg-teal-50 text-teal-700',
  Content: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  Consultant: 'border-cyan-200 bg-cyan-50 text-cyan-700',
};

export const getRoleBadgeClass = (roleName: string): string =>
  roleBadgeClasses[roleName] ?? 'border-slate-200 bg-slate-50 text-slate-700';

export const createPermissionLabelMap = (
  permissions: readonly PermissionLabelSource[],
): ReadonlyMap<string, string> =>
  new Map(permissions.map(permission => [permission.code, permission.name]));

export const getPermissionLabel = (
  code: string,
  labels: ReadonlyMap<string, string>,
): string => labels.get(code) ?? 'Quyền hệ thống';
