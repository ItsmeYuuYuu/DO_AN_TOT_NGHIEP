import { useEffect, useState } from 'react';
import axios from 'axios';
import { LockKeyhole, LockOpen, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/Button';
import { DataTable } from '@/components/DataTable';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { Pagination } from '@/components/Pagination';
import { rolesApi, usersApi } from '@/features/users/api/usersApi';
import type { RoleItem, UserItem } from '@/features/users/api/usersApi';
import { roleLabels } from '@/features/users/utils/authorizationLabels';
import { formatDate } from '@/utils/formatters';
import { confirmAction, notifyError } from '@/utils/notifications';

const PAGE_SIZE = 10;
const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 10);

type UserDraft = Partial<UserItem> & { passwordhash?: string };

const AdminUsers = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<UserDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void rolesApi.getAll()
      .then(response => {
        if (active) setRoles(response.data.filter(role => role.rolename !== 'Customer'));
      })
      .catch(() => {
        if (active) notifyError('Không thể tải danh sách vai trò.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await usersApi.getAll({
          query: search.trim() || undefined,
          roleId: roleFilter ? Number(roleFilter) : undefined,
          isActive: statusFilter ? statusFilter === 'active' : undefined,
          page,
          pageSize: PAGE_SIZE,
        }, controller.signal);
        if (controller.signal.aborted) return;

        const nextTotalPages = Math.max(1, response.data.totalPages);
        setUsers(response.data.items);
        setTotalCount(response.data.totalCount);
        setTotalPages(nextTotalPages);
        if (page > nextTotalPages) setPage(nextTotalPages);
      } catch {
        if (!controller.signal.aborted) notifyError('Không thể tải danh sách nhân viên.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [page, refreshKey, roleFilter, search, statusFilter]);

  const refreshUsers = () => setRefreshKey(current => current + 1);

  const toggleDraftRole = (roleid: number) => {
    setEditing(current => {
      const selected = new Set(current?.roleids ?? (current?.roleid ? [current.roleid] : []));
      if (selected.has(roleid)) selected.delete(roleid); else selected.add(roleid);
      return { ...current, roleids: [...selected], roleid: [...selected][0] };
    });
  };

  const save = async () => {
    if (!editing?.username?.trim() || !editing.fullname?.trim()) {
      notifyError('Vui lòng nhập đầy đủ tên đăng nhập và họ tên.'); return;
    }
    if (!(editing.roleids?.length || editing.roleid)) {
      notifyError('Vui lòng chọn ít nhất một vai trò.'); return;
    }
    if (!editing.userid && !editing.passwordhash?.trim()) {
      notifyError('Vui lòng nhập mật khẩu cho tài khoản mới.'); return;
    }

    setSaving(true);
    try {
      if (editing.userid) await usersApi.update(editing.userid, editing);
      else await usersApi.create(editing);
      setEditing(null);
      refreshUsers();
    } catch (error) {
      notifyError(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể lưu tài khoản.' : 'Không thể lưu tài khoản.');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserStatus = async (user: UserItem) => {
    const willActivate = user.isactive !== true;
    const confirmed = await confirmAction(
      willActivate
        ? `Mở khóa tài khoản của ${user.fullname}?`
        : `Khóa tài khoản của ${user.fullname}? Nhân viên sẽ không thể đăng nhập nhưng lịch sử nghiệp vụ vẫn được giữ lại.`,
      {
        title: willActivate ? 'Mở khóa tài khoản' : 'Khóa tài khoản nhân viên',
        confirmLabel: willActivate ? 'Mở khóa' : 'Khóa tài khoản',
        danger: !willActivate,
      },
    );
    if (!confirmed) return;

    try {
      await usersApi.toggleActive(user.userid);
      refreshUsers();
    } catch (error) {
      notifyError(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể đổi trạng thái.' : 'Không thể đổi trạng thái.');
    }
  };

  const columns = [
    { key: 'userid', header: '#', render: (user: UserItem) => <span className="text-xs text-slate-400">#{user.userid}</span> },
    { key: 'fullname', header: 'Nhân viên', render: (user: UserItem) => <div><p className="font-bold text-slate-800">{user.fullname}</p>{!user.username.includes('@') && <p className="text-xs text-slate-400">@{user.username}</p>}</div> },
    { key: 'contact', header: 'Liên hệ', render: (user: UserItem) => <div><p className="text-sm text-slate-600">{user.email ?? (user.username.includes('@') ? user.username : '—')}</p><p className="text-xs text-slate-400">{user.phone ?? ''}</p></div> },
    { key: 'roles', header: 'Vai trò', render: (user: UserItem) => <div className="flex max-w-md flex-wrap gap-1.5">{(user.rolenames?.length ? user.rolenames : [user.rolename ?? 'Chưa gán']).map(role => <span key={role} className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-[#c4000b]">{roleLabels[role] ?? role}</span>)}</div> },
    { key: 'isactive', header: 'Trạng thái', render: (user: UserItem) => <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${user.isactive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{user.isactive ? 'Hoạt động' : 'Đã khóa'}</span> },
    { key: 'createdat', header: 'Ngày tạo', render: (user: UserItem) => <span className="text-xs text-slate-500">{user.createdat ? formatDate(user.createdat) : '—'}</span> },
    { key: 'actions', header: 'Thao tác', render: (user: UserItem) => <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditing({ ...user, roleids: user.roleids ?? (user.roleid ? [user.roleid] : []) })} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-[#c4000b]">Sửa</button><button type="button" onClick={() => void toggleUserStatus(user)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${user.isactive ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'}`}>{user.isactive ? <LockKeyhole size={14} /> : <LockOpen size={14} />}{user.isactive ? 'Khóa' : 'Mở khóa'}</button></div> },
  ];

  return <div className="space-y-5">
    <section className="ops-hero flex flex-wrap items-center justify-between gap-4 p-6">
      <div><h1 className="ops-hero-title">Quản lý nhân viên</h1><p className="mt-1 text-sm text-slate-500">Mỗi nhân viên có thể mang nhiều vai trò; khách hàng tự đăng ký ở cổng mua sắm.</p></div>
      <Button size="sm" onClick={() => setEditing({ isactive: true, roleids: roles[0] ? [roles[0].roleid] : [] })}>+ Thêm nhân viên</Button>
    </section>
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_240px_200px]">
      <Input placeholder="Tìm theo tên, username, email, SĐT hoặc vai trò..." value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <select aria-label="Lọc theo vai trò" value={roleFilter} onChange={event => { setRoleFilter(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100">
        <option value="">Tất cả vai trò</option>
        {roles.map(role => <option key={role.roleid} value={role.roleid}>{roleLabels[role.rolename] ?? role.rolename}</option>)}
      </select>
      <select aria-label="Lọc theo trạng thái" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100">
        <option value="">Tất cả trạng thái</option>
        <option value="active">Đang hoạt động</option>
        <option value="inactive">Đã khóa</option>
      </select>
    </div>
    <DataTable columns={columns} data={users} keyField="userid" loading={loading} />
    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} itemCount={totalCount} pageSize={PAGE_SIZE} />

    <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing?.userid ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên'}>
      {editing && <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2"><Input label="Tên đăng nhập *" disabled={!!editing.userid} value={editing.username ?? ''} onChange={event => setEditing(current => ({ ...current, username: event.target.value }))} />{!editing.userid && <Input label="Mật khẩu *" type="password" value={editing.passwordhash ?? ''} onChange={event => setEditing(current => ({ ...current, passwordhash: event.target.value }))} />}</div>
        <Input label="Họ và tên *" value={editing.fullname ?? ''} onChange={event => setEditing(current => ({ ...current, fullname: event.target.value }))} />
        <Input label="Email" type="email" value={editing.email ?? ''} onChange={event => setEditing(current => ({ ...current, email: event.target.value }))} />
        <Input label="Số điện thoại" value={editing.phone ?? ''} onChange={event => setEditing(current => ({ ...current, phone: digitsOnly(event.target.value) }))} />
        <fieldset><legend className="mb-2 text-sm font-bold text-slate-700">Vai trò được gán *</legend><div className="grid gap-2 sm:grid-cols-2">{roles.map(role => { const checked = (editing.roleids ?? []).includes(role.roleid); return <label key={role.roleid} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}><input type="checkbox" className="mt-1" checked={checked} onChange={() => toggleDraftRole(role.roleid)} /><span><span className="block text-sm font-bold text-slate-700">{roleLabels[role.rolename] ?? role.rolename}</span><span className="text-xs text-slate-400">{role.permissions.length} quyền</span></span></label>; })}</div></fieldset>
        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500"><ShieldCheck size={15} className="mr-1 inline" />Quyền thực tế là hợp của tất cả vai trò được chọn.</div>
        <div className="flex gap-3"><Button className="flex-1" onClick={save} isLoading={saving}>Lưu</Button><Button className="flex-1" variant="secondary" onClick={() => setEditing(null)}>Hủy</Button></div>
      </div>}
    </Modal>
  </div>;
};

export default AdminUsers;
