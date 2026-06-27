import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Plus,
  RefreshCcw,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Skeleton } from '@/components/Skeleton';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  warrantyClaimsApi,
  type WarrantyClaim,
  type WarrantyEmployee,
} from '@/features/warranties/api/warrantyClaimsApi';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { getApiErrorMessage } from '@/utils/apiError';

const statusLabels: Record<string, string> = {
  Received: 'Đã tiếp nhận',
  Inspecting: 'Đang kiểm tra',
  WaitingParts: 'Chờ linh kiện',
  Repairing: 'Đang sửa chữa',
  Completed: 'Đã sửa xong',
  Returned: 'Đã trả khách',
  Rejected: 'Từ chối tiếp nhận',
};

const statusClasses: Record<string, string> = {
  Received: 'bg-indigo-50 text-[#4338ca]',
  Inspecting: 'bg-violet-50 text-violet-700',
  WaitingParts: 'bg-amber-50 text-amber-700',
  Repairing: 'bg-orange-50 text-orange-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  Returned: 'bg-slate-100 text-slate-600',
  Rejected: 'bg-red-50 text-red-700',
};

const nextStatuses: Record<string, string[]> = {
  Received: ['Inspecting', 'Rejected'],
  Inspecting: ['WaitingParts', 'Repairing', 'Rejected'],
  WaitingParts: ['Repairing', 'Rejected'],
  Repairing: ['WaitingParts', 'Completed'],
  Completed: ['Returned'],
};

const StaffWarranties: React.FC = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [employees, setEmployees] = useState<WarrantyEmployee[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<WarrantyClaim | null>(null);
  const [imei, setImei] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [nextStatus, setNextStatus] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [finalCost, setFinalCost] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [note, setNote] = useState('');

  const canAssign = user?.rolename === 'Admin' || user?.rolename === 'Manager';
  const canCreate = user?.rolename === 'Admin' || user?.rolename === 'Warranty';
  const currentUserId = Number(user?.userid);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await warrantyClaimsApi.getAll(statusFilter || undefined);
      setClaims(response.data);
      setSelected(current =>
        current
          ? response.data.find(item => item.claimid === current.claimid) ?? null
          : current,
      );
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tải danh sách phiếu bảo hành.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  useEffect(() => {
    if (!canAssign) return;
    warrantyClaimsApi.getEmployees()
      .then(response => setEmployees(response.data))
      .catch(() => setEmployees([]));
  }, [canAssign]);

  const stats = useMemo(() => ({
    total: claims.length,
    waiting: claims.filter(item => item.status === 'Received').length,
    processing: claims.filter(item =>
      ['Inspecting', 'WaitingParts', 'Repairing'].includes(item.status)).length,
    completed: claims.filter(item => ['Completed', 'Returned'].includes(item.status)).length,
  }), [claims]);
  const statCards = [
    { label: 'Tổng phiếu', value: stats.total, Icon: FileText, color: 'text-slate-700' },
    { label: 'Chờ tiếp nhận', value: stats.waiting, Icon: Clock3, color: 'text-[#4f46e5]' },
    { label: 'Đang xử lý', value: stats.processing, Icon: Wrench, color: 'text-orange-600' },
    { label: 'Đã hoàn tất', value: stats.completed, Icon: CheckCircle2, color: 'text-emerald-600' },
  ];

  const resetWorkflowForm = (claim?: WarrantyClaim) => {
    setNextStatus(claim ? (nextStatuses[claim.status]?.[0] ?? '') : '');
    setEstimatedCost(claim?.estimatedcost?.toString() ?? '');
    setFinalCost(claim?.finalcost?.toString() ?? '');
    setConclusion(claim?.conclusion ?? '');
    setNote('');
  };

  const openDetail = (claim: WarrantyClaim) => {
    setSelected(claim);
    resetWorkflowForm(claim);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError('');
    try {
      const uploaded = files.length > 0
        ? (await warrantyClaimsApi.uploadImages(files)).data.map(image => image.url)
        : [];
      await warrantyClaimsApi.create({
        imei: imei.trim(),
        faultdescription: faultDescription.trim(),
        imageurls: uploaded,
      });
      setCreateOpen(false);
      setImei('');
      setFaultDescription('');
      setFiles([]);
      await loadClaims();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tạo phiếu bảo hành.'));
    } finally {
      setWorking(false);
    }
  };

  const runClaimAction = async (action: () => Promise<{ data: WarrantyClaim }>) => {
    setWorking(true);
    setError('');
    try {
      const response = await action();
      setSelected(response.data);
      resetWorkflowForm(response.data);
      await loadClaims();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật phiếu bảo hành.'));
    } finally {
      setWorking(false);
    }
  };

  const handleStatusUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !nextStatus) return;
    await runClaimAction(() => warrantyClaimsApi.updateStatus(selected.claimid, {
      status: nextStatus,
      estimatedcost: estimatedCost ? Number(estimatedCost) : undefined,
      finalcost: finalCost ? Number(finalCost) : undefined,
      conclusion: conclusion.trim() || undefined,
      note: note.trim() || undefined,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="ops-hero flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 className="ops-hero-title">Trung tâm bảo hành</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadClaims} className="border-red-100 bg-white text-[#c4000b] hover:bg-red-50">
            <RefreshCcw size={16} className="mr-2" /> Làm mới
          </Button>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)} className="bg-[#e30613] hover:bg-[#c4000b]">
              <Plus size={16} className="mr-2" /> Tạo phiếu
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
              </div>
              <Icon size={24} className={color} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <h2 className="font-black text-slate-800">Phiếu tiếp nhận</h2>
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Phiếu / IMEI</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Lỗi tiếp nhận</th>
                <th className="px-4 py-3">Phụ trách</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                    Chưa có phiếu bảo hành phù hợp.
                  </td>
                </tr>
              ) : claims.map(claim => (
                <tr key={claim.claimid} className="hover:bg-indigo-50/40/70">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-800">#{claim.claimid}</p>
                    <p className="text-xs font-medium text-slate-500">{claim.imei}</p>
                    <p className="mt-1 text-xs text-slate-400">{claim.productname ?? claim.variantsku}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-slate-700">{claim.customername}</p>
                    <p className="text-xs text-slate-400">{claim.customerphone}</p>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-sm text-slate-600">
                    <p className="line-clamp-2">{claim.faultdescription}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {claim.assignedusername ?? <span className="italic text-slate-400">Chưa phân công</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[claim.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {statusLabels[claim.status] ?? claim.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openDetail(claim)}>
                      <Eye size={15} className="mr-1.5" /> Chi tiết
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={createOpen} onClose={() => !working && setCreateOpen(false)} title="Tiếp nhận bảo hành" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">IMEI thiết bị</label>
            <input
              required
              value={imei}
              onChange={event => setImei(event.target.value)}
              placeholder="Quét hoặc nhập IMEI của máy đã bán"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#4f46e5]"
            />
            <p className="mt-1 text-xs text-slate-400">Khách hàng và thời hạn bảo hành được tra tự động từ đơn đã hoàn tất.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Mô tả lỗi</label>
            <textarea
              required
              rows={5}
              value={faultDescription}
              onChange={event => setFaultDescription(event.target.value)}
              placeholder="Tình trạng máy, lỗi khách phản ánh, phụ kiện bàn giao..."
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#4f46e5]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Ảnh thiết bị (tối đa 6 ảnh)</label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-500 hover:border-indigo-300 hover:bg-indigo-50">
              <Camera size={20} />
              Chọn ảnh từ máy
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={event => setFiles(Array.from(event.target.files ?? []).slice(0, 6))}
              />
            </label>
            {files.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-3">
                {files.map(file => (
                  <div key={`${file.name}-${file.lastModified}`} className="truncate rounded-2xl bg-slate-50 px-3 py-2">
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button type="submit" isLoading={working} disabled={!imei.trim() || !faultDescription.trim()}>
              Tạo phiếu tiếp nhận
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={selected !== null}
        onClose={() => !working && setSelected(null)}
        title={selected ? `Phiếu bảo hành #${selected.claimid}` : 'Chi tiết phiếu'}
        size="xl"
      >
        {selected && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Thiết bị</p>
                    <p className="mt-1 font-black text-slate-900">{selected.productname ?? 'Thiết bị'}</p>
                    <p className="text-sm text-slate-500">IMEI: {selected.imei}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses[selected.status] ?? 'bg-slate-100'}`}>
                    {statusLabels[selected.status] ?? selected.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div><span className="text-slate-400">Khách hàng:</span> <b>{selected.customername}</b></div>
                  <div><span className="text-slate-400">Điện thoại:</span> <b>{selected.customerphone}</b></div>
                  <div><span className="text-slate-400">Bảo hành:</span> <b>{selected.coverage === 'InWarranty' ? 'Trong hạn' : 'Ngoài hạn'}</b></div>
                  <div><span className="text-slate-400">Phụ trách:</span> <b>{selected.assignedusername ?? 'Chưa có'}</b></div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-800">Lỗi tiếp nhận</h3>
                <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-100 p-4 text-sm text-slate-600">
                  {selected.faultdescription}
                </p>
              </div>

              {selected.imageurls.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-black text-slate-800">Ảnh thiết bị</h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {selected.imageurls.map(url => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="Tình trạng thiết bị" className="h-28 w-full rounded-xl border border-slate-200 object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-3 text-sm font-black text-slate-800">Lịch sử xử lý</h3>
                <div className="space-y-3 border-l-2 border-slate-100 pl-4">
                  {selected.histories.map(history => (
                    <div key={history.historyid} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />
                      <p className="text-sm font-bold text-slate-700">
                        {statusLabels[history.tostatus] ?? history.tostatus}
                      </p>
                      <p className="text-xs text-slate-400">
                        {history.username ?? 'Hệ thống'} · {formatDateTime(history.createdat)}
                      </p>
                      {history.note && <p className="mt-1 text-sm text-slate-500">{history.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {!selected.assigneduserid && user?.rolename === 'Warranty' && (
                <Button
                  fullWidth
                  isLoading={working}
                  onClick={() => runClaimAction(() => warrantyClaimsApi.claim(selected.claimid))}
                >
                  <UserCheck size={16} className="mr-2" /> Nhận xử lý phiếu này
                </Button>
              )}

              {canAssign && !['Returned', 'Rejected'].includes(selected.status) && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <label className="mb-2 block text-sm font-black text-slate-800">Phân công nhân viên</label>
                  <select
                    value={selected.assigneduserid ?? ''}
                    onChange={event => {
                      const employeeId = Number(event.target.value);
                      if (employeeId) {
                        runClaimAction(() => warrantyClaimsApi.assign(selected.claimid, employeeId));
                      }
                    }}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Chọn nhân viên bảo hành</option>
                    {employees.map(employee => (
                      <option key={employee.userid} value={employee.userid}>{employee.fullname}</option>
                    ))}
                  </select>
                </div>
              )}

              {(canAssign || selected.assigneduserid === currentUserId) && nextStatuses[selected.status] && (
                <form onSubmit={handleStatusUpdate} className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <h3 className="font-black text-slate-800">Cập nhật xử lý</h3>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Trạng thái tiếp theo</label>
                    <select
                      value={nextStatus}
                      onChange={event => setNextStatus(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {nextStatuses[selected.status].map(status => (
                        <option key={status} value={status}>{statusLabels[status]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Dự kiến</label>
                      <input
                        type="number"
                        min="0"
                        value={estimatedCost}
                        onChange={event => setEstimatedCost(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Thực tế</label>
                      <input
                        type="number"
                        min="0"
                        value={finalCost}
                        onChange={event => setFinalCost(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  {nextStatus === 'Completed' && (
                    <textarea
                      required
                      rows={3}
                      value={conclusion}
                      onChange={event => setConclusion(event.target.value)}
                      placeholder="Kết luận sửa chữa bắt buộc"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  )}
                  <textarea
                    rows={2}
                    value={note}
                    onChange={event => setNote(event.target.value)}
                    placeholder="Ghi chú cho lần cập nhật này"
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <Button type="submit" fullWidth isLoading={working} disabled={!nextStatus}>
                    Cập nhật trạng thái
                  </Button>
                </form>
              )}

              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Chi phí dự kiến</span>
                  <b>{formatCurrency(selected.estimatedcost ?? 0)}</b>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Chi phí thực tế</span>
                  <b>{formatCurrency(selected.finalcost ?? 0)}</b>
                </div>
                {selected.conclusion && (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="text-xs font-bold uppercase text-slate-400">Kết luận</p>
                    <p className="mt-1 text-slate-700">{selected.conclusion}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StaffWarranties;
