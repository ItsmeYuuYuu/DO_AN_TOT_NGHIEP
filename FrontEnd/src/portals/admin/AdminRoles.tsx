import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { rolesApi } from '@/features/users/api/usersApi';
import type { PermissionItem, RoleItem } from '@/features/users/api/usersApi';
import {
  createPermissionLabelMap,
  getPermissionLabel,
  getRoleLabel,
} from '@/features/users/utils/authorizationLabels';
import { confirmAction, notifyError, notifySuccess } from '@/utils/notifications';

const AdminRoles = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [editing, setEditing] = useState<RoleItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [roleResponse, permissionResponse] = await Promise.all([rolesApi.getAll(), rolesApi.getPermissions()]);
      setRoles(roleResponse.data);
      setPermissions(permissionResponse.data);
    } catch { notifyError('Không thể tải ma trận vai trò và quyền.'); }
  };
  useEffect(() => { void load(); }, []);

  const groups = useMemo(() => Object.entries(permissions.reduce<Record<string, PermissionItem[]>>((result, permission) => {
    (result[permission.groupname] ??= []).push(permission); return result;
  }, {})), [permissions]);
  const permissionLabels = useMemo(() => createPermissionLabelMap(permissions), [permissions]);

  const startCreate = () => { setCreating(true); setEditing({ roleid: 0, rolename: '', permissions: [] }); };
  const togglePermission = (code: string) => setEditing(current => current ? ({ ...current, permissions: current.permissions.includes(code) ? current.permissions.filter(item => item !== code) : [...current.permissions, code] }) : current);
  const save = async () => {
    if (!editing?.rolename.trim()) { notifyError('Vui lòng nhập tên vai trò.'); return; }
    setSaving(true);
    try {
      const payload = { rolename: editing.rolename.trim(), permissions: editing.permissions };
      if (creating) await rolesApi.create(payload); else await rolesApi.update(editing.roleid, payload);
      notifySuccess('Đã cập nhật vai trò và quyền. Nhân viên cần đăng nhập lại để nhận JWT mới.');
      setEditing(null); setCreating(false); await load();
    } catch (error) { notifyError(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể lưu vai trò.' : 'Không thể lưu vai trò.'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-5">
    <section className="ops-hero flex flex-wrap items-center justify-between gap-4 p-6"><div><h1 className="ops-hero-title">Vai trò và phân quyền</h1><p className="mt-1 text-sm text-slate-500">Gom quyền theo vai trò, sau đó có thể gán nhiều vai trò cho một nhân viên.</p></div><Button size="sm" onClick={startCreate}><Plus size={16} /> Tạo vai trò</Button></section>
    <div className="grid gap-4 lg:grid-cols-2">{roles.map(role => <article key={role.roleid} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="rounded-xl bg-red-50 p-3 text-[#c4000b]"><ShieldCheck size={22} /></span><div><h2 className="font-black text-slate-800">{getRoleLabel(role.rolename)}</h2><p className="text-xs text-slate-400">{role.rolename === 'Admin' ? 'Toàn quyền hệ thống' : `${role.permissions.length} quyền`}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => { setCreating(false); setEditing({ ...role, permissions: [...role.permissions] }); }} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Cấu hình</button>{!['Admin', 'Customer'].includes(role.rolename) && <button type="button" onClick={async () => { if (await confirmAction(`Xóa vai trò ${getRoleLabel(role.rolename)}?`, { danger: true, confirmLabel: 'Xóa' })) { try { await rolesApi.delete(role.roleid); await load(); } catch (error) { notifyError(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Không thể xóa vai trò.' : 'Không thể xóa vai trò.'); } } }} className="rounded-xl bg-red-50 p-2 text-red-600"><Trash2 size={16} /></button>}</div></div><div className="mt-4 flex flex-wrap gap-1.5">{role.rolename === 'Admin' ? <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-[#c4000b]">Toàn quyền</span> : role.permissions.slice(0, 8).map(code => <span key={code} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{getPermissionLabel(code, permissionLabels)}</span>)}{role.permissions.length > 8 && <span className="text-xs text-slate-400">+{role.permissions.length - 8}</span>}</div></article>)}</div>

    <Modal isOpen={editing !== null} onClose={() => { setEditing(null); setCreating(false); }} title={creating ? 'Tạo vai trò' : `Phân quyền: ${getRoleLabel(editing?.rolename ?? '')}`} size="xl">
      {editing && <div className="space-y-5"><Input label="Tên vai trò" disabled={!creating && ['Admin', 'Customer'].includes(editing.rolename)} value={editing.rolename} onChange={event => setEditing(current => current ? ({ ...current, rolename: event.target.value }) : current)} />
        {editing.rolename === 'Admin' ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-[#c4000b]"><KeyRound size={17} className="mr-2 inline" />Quản trị viên luôn có toàn quyền và không thể giới hạn.</div> : <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-2">{groups.map(([group, items]) => <fieldset key={group}><legend className="mb-2 font-black text-slate-700">{group}</legend><div className="grid gap-2 sm:grid-cols-2">{items.map(permission => <label key={permission.code} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${editing.permissions.includes(permission.code) ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}><input type="checkbox" className="mt-1" checked={editing.permissions.includes(permission.code)} onChange={() => togglePermission(permission.code)} /><span className="text-sm font-bold text-slate-700">{getPermissionLabel(permission.code, permissionLabels)}</span></label>)}</div></fieldset>)}</div>}
        <div className="flex gap-3"><Button className="flex-1" onClick={save} isLoading={saving}>Lưu phân quyền</Button><Button className="flex-1" variant="secondary" onClick={() => { setEditing(null); setCreating(false); }}>Hủy</Button></div></div>}
    </Modal>
  </div>;
};

export default AdminRoles;
