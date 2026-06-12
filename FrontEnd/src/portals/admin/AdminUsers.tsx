import React, { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import axios from 'axios';
import { employeeRoles, roleLabels, roleNamesById, usersApi } from '@/features/users/api/usersApi';
import type { UserItem } from '@/features/users/api/usersApi';
import { formatDate } from '@/utils/formatters';
import { Users, UserCheck } from 'lucide-react';

const PAGE_SIZE = 10;

const roleColors: Record<string, string> = {
  Admin:    'bg-purple-50 text-purple-700 border border-purple-200',
  Manager:  'bg-indigo-50 text-indigo-700 border border-indigo-200',
  Sales:    'bg-cyan-50 text-cyan-700 border border-cyan-200',
  Warehouse:'bg-amber-50 text-amber-700 border border-amber-200',
  Warranty: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Content:  'bg-pink-50 text-pink-700 border border-pink-200',
  Consultant:'bg-teal-50 text-teal-700 border border-teal-200',
  Customer: 'bg-slate-100 text-slate-600 border border-slate-200',
};

type Tab = 'staff' | 'customer';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('staff');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<UserItem> & { passwordhash?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.getAll();
      setUsers(res.data);
    } catch {
      setError('Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Split by role
  const staffUsers    = users.filter(u => u.roleid !== 3);
  const customerUsers = users.filter(u => (u.roleid ?? 0) === 3);   // Customer

  const source = tab === 'staff' ? staffUsers : customerUsers;

  const filtered = source.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.fullname.toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    // preset roleid based on current tab
    setEditing({ isactive: true, roleid: tab === 'staff' ? 5 : 3 });
    setModalOpen(true);
  };
  const openEdit = (u: UserItem) => { setEditing({ ...u }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSave = async () => {
    if (!editing?.username?.trim() || !editing?.fullname?.trim()) return;
    setSaving(true);
    try {
      if (editing.userid) {
        await usersApi.update(editing.userid, editing);
      } else {
        if (!(editing as UserItem & { passwordhash?: string }).passwordhash?.trim()) {
          alert('Vui lòng nhập mật khẩu cho tài khoản mới.'); setSaving(false); return;
        }
        await usersApi.create(editing);
      }
      await fetchUsers();
      closeModal();
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
      alert(message ?? 'Lỗi khi lưu tài khoản.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    try { await usersApi.toggleActive(id); await fetchUsers(); }
    catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
      alert(message ?? 'Không thể thay đổi trạng thái tài khoản.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xóa tài khoản này?')) return;
    try { await usersApi.delete(id); await fetchUsers(); }
    catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
      alert(message ?? 'Không thể xóa tài khoản này.');
    }
  };

  const columns = [
    {
      key: 'userid',
      header: '#',
      render: (u: UserItem) => <span className="font-mono text-xs text-slate-400">#{u.userid}</span>,
      className: 'w-12',
    },
    {
      key: 'fullname',
      header: 'Họ tên',
      render: (u: UserItem) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
            {u.fullname.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{u.fullname}</p>
            <p className="text-xs text-slate-400">@{u.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email / SĐT',
      render: (u: UserItem) => (
        <div>
          <p className="text-sm text-slate-600">{u.email ?? '—'}</p>
          <p className="text-xs text-slate-400">{u.phone ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'roleid',
      header: 'Vai trò',
      render: (u: UserItem) => {
        const roleName = u.rolename
          ?? u.role?.rolename
          ?? roleNamesById[u.roleid ?? 0]
          ?? 'Customer';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColors[roleName] ?? 'bg-slate-100 text-slate-600'}`}>
            {roleLabels[roleName] ?? roleName}
          </span>
        );
      },
    },
    {
      key: 'isactive',
      header: 'Trạng thái',
      render: (u: UserItem) => (
        <button onClick={() => handleToggle(u.userid)} className="cursor-pointer">
          {u.isactive ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Hoạt động
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Vô hiệu
            </span>
          )}
        </button>
      ),
    },
    {
      key: 'createdat',
      header: 'Ngày tạo',
      render: (u: UserItem) => <span className="text-xs text-slate-500">{u.createdat ? formatDate(u.createdat) : '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-28',
      render: (u: UserItem) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(u)} className="px-2.5 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md font-semibold">Sửa</button>
          {u.roleid !== 1 && (
            <button onClick={() => handleDelete(u.userid)} className="px-2.5 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-md font-semibold">Xóa</button>
          )}
        </div>
      ),
    },
  ];

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">Quản lý Tài khoản</h2>
          <p className="text-sm text-slate-500">
            {staffUsers.length} nhân viên · {customerUsers.length} khách hàng
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          + Thêm {tab === 'staff' ? 'nhân viên' : 'khách hàng'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => handleTabChange('staff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'staff'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserCheck size={16} />
          Nhân Viên
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${tab === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
            {staffUsers.length}
          </span>
        </button>
        <button
          onClick={() => handleTabChange('customer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'customer'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={16} />
          Khách Hàng
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${tab === 'customer' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
            {customerUsers.length}
          </span>
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="max-w-sm">
          <Input
            placeholder={`Tìm ${tab === 'staff' ? 'nhân viên' : 'khách hàng'} theo tên, username, email...`}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <DataTable columns={columns} data={paged} keyField="userid" loading={loading} />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} itemCount={filtered.length} pageSize={PAGE_SIZE} />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing?.userid ? 'Chỉnh sửa tài khoản' : `Thêm ${tab === 'staff' ? 'nhân viên' : 'khách hàng'}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tên đăng nhập *" value={editing?.username ?? ''} onChange={e => setEditing(p => ({ ...p, username: e.target.value }))} placeholder="username" />
            {!editing?.userid && (
              <Input label="Mật khẩu *" type="password" value={(editing as { passwordhash?: string })?.passwordhash ?? ''} onChange={e => setEditing(p => ({ ...p, passwordhash: e.target.value }))} placeholder="••••••••" />
            )}
          </div>
          <Input label="Họ và tên *" value={editing?.fullname ?? ''} onChange={e => setEditing(p => ({ ...p, fullname: e.target.value }))} placeholder="Nguyễn Văn A" />
          <Input label="Email" type="email" value={editing?.email ?? ''} onChange={e => setEditing(p => ({ ...p, email: e.target.value }))} placeholder="example@email.com" />
          <Input label="Số điện thoại" value={editing?.phone ?? ''} onChange={e => setEditing(p => ({ ...p, phone: e.target.value }))} placeholder="0901234567" />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Vai trò</label>
            <select
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"
              value={editing?.roleid ?? (tab === 'staff' ? 5 : 3)}
              onChange={e => setEditing(p => ({ ...p, roleid: parseInt(e.target.value) }))}
            >
              {tab === 'staff' ? (
                <>
                  {editing?.roleid === 2 && (
                    <option value={2}>Nhân viên chung (quyền cũ)</option>
                  )}
                  {employeeRoles.map(role => (
                    <option key={role.id} value={role.id}>{role.label}</option>
                  ))}
                </>
              ) : (
                <option value={3}>Customer</option>
              )}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} isLoading={saving} className="flex-1">{editing?.userid ? 'Cập nhật' : 'Thêm mới'}</Button>
            <Button variant="secondary" onClick={closeModal} className="flex-1">Hủy</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsers;
