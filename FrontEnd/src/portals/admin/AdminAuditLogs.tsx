import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Activity, Database, Download, Filter, RotateCcw, ShieldCheck, Table2, UserRound } from 'lucide-react';
import { auditLogsApi } from '@/features/system/api/auditLogsApi';
import type { AuditLog, AuditLogStats, GetAuditLogsParams } from '@/features/system/api/auditLogsApi';
import { DataTable } from '@/components/DataTable';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Pagination } from '@/components/Pagination';
import { formatDateTime } from '@/utils/formatters';
import { getApiErrorMessage } from '@/utils/apiError';
import { notifyError, notifySuccess } from '@/utils/notifications';

const emptyStats: AuditLogStats = {
  totalLogs: 0,
  todayLogs: 0,
  createLogs: 0,
  updateLogs: 0,
  deleteLogs: 0,
  topUser: 'Chưa có dữ liệu',
  topUserCount: 0,
  topEntity: 'Chưa có dữ liệu',
  topEntityCount: 0,
};

const escapeCsvValue = (value: string | number | null | undefined) => {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename: string, rows: (string | number | null | undefined)[][]) => {
  const csv = rows.map(row => row.map(escapeCsvValue).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const StatCard = ({
  label,
  value,
  hint,
  icon,
  tone = 'red',
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
  tone?: 'red' | 'amber' | 'slate';
}) => {
  const tones = {
    red: 'bg-red-50 text-red-600 shadow-red-100',
    amber: 'bg-amber-50 text-amber-600 shadow-amber-100',
    slate: 'bg-slate-100 text-slate-700 shadow-slate-100',
  };

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <p className="mt-3 truncate text-3xl font-black text-slate-900">{value}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{hint}</p>
        </div>
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-lg ${tones[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<AuditLogStats>(emptyStats);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filterUserId, setFilterUserId] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterTableName, setFilterTableName] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  const buildFilterParams = useCallback((): GetAuditLogsParams => {
    const params: GetAuditLogsParams = {};
    if (filterUserId) params.userId = parseInt(filterUserId);
    if (filterAction) params.action = filterAction;
    if (filterTableName) params.tableName = filterTableName;
    if (filterFromDate) params.fromDate = new Date(filterFromDate).toISOString();
    if (filterToDate) params.toDate = new Date(filterToDate).toISOString();
    return params;
  }, [filterAction, filterFromDate, filterTableName, filterToDate, filterUserId]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await auditLogsApi.getLogs({ ...buildFilterParams(), page, pageSize });
      setLogs(result.items);
      setTotalCount(result.totalCount);
    } catch (error) {
      notifyError(getApiErrorMessage(error, 'Lỗi khi tải nhật ký hệ thống.'));
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams, page, pageSize]);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const result = await auditLogsApi.getStats(buildFilterParams());
      setStats(result);
    } catch (error) {
      notifyError(getApiErrorMessage(error, 'Lỗi khi tải thống kê nhật ký.'));
    } finally {
      setStatsLoading(false);
    }
  }, [buildFilterParams]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
    fetchStats();
  };

  const handleReset = () => {
    setFilterUserId('');
    setFilterAction('');
    setFilterTableName('');
    setFilterFromDate('');
    setFilterToDate('');
    setPage(1);
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const result = await auditLogsApi.getLogs({ ...buildFilterParams(), page: 1, pageSize: 10000 });
      const rows = [
        ['ID', 'User ID', 'Người dùng', 'Thao tác', 'Bảng / Đối tượng', 'Record ID', 'Thời gian'],
        ...result.items.map(item => [
          item.logid,
          item.userid ?? '',
          item.fullName || 'Hệ thống',
          item.action,
          item.tablename || '',
          item.recordid || '',
          formatDateTime(item.createdat),
        ]),
      ];

      downloadCsv(`audit_logs_${new Date().toISOString().slice(0, 10)}.csv`, rows);
      notifySuccess(`Đã xuất ${result.items.length} dòng nhật ký.`);
    } catch (error) {
      notifyError(getApiErrorMessage(error, 'Không thể xuất CSV nhật ký hệ thống.'));
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const getActionColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('tạo') || act.includes('create') || act.includes('insert')) {
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
    }
    if (act.includes('cập') || act.includes('update') || act.includes('edit')) {
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-100';
    }
    if (act.includes('xóa') || act.includes('delete') || act.includes('remove')) {
      return 'bg-red-50 text-red-700 ring-1 ring-red-100';
    }
    return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  };

  return (
    <div className="space-y-6">
      <div className="ops-hero flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">System Audit</p>
          <h1 className="ops-hero-title mt-2">Nhật ký hệ thống</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">
            Theo dõi thao tác thêm, sửa, xóa và các thay đổi quan trọng trong khu vực quản trị.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={handleReset}
            className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <RotateCcw size={16} className="mr-2" /> Reset lọc
          </Button>
          <Button
            onClick={handleExportCsv}
            isLoading={exporting}
            disabled={totalCount === 0}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            <Download size={16} className="mr-2" /> Xuất CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng nhật ký"
          value={statsLoading ? '...' : stats.totalLogs}
          hint="Theo bộ lọc hiện tại"
          icon={<Activity size={22} />}
          tone="red"
        />
        <StatCard
          label="Hôm nay"
          value={statsLoading ? '...' : stats.todayLogs}
          hint="Phát sinh trong ngày"
          icon={<ShieldCheck size={22} />}
          tone="amber"
        />
        <StatCard
          label="Người thao tác nhiều"
          value={statsLoading ? '...' : stats.topUser}
          hint={`${stats.topUserCount} thao tác`}
          icon={<UserRound size={22} />}
          tone="slate"
        />
        <StatCard
          label="Bảng tác động nhiều"
          value={statsLoading ? '...' : stats.topEntity}
          hint={`${stats.topEntityCount} thao tác`}
          icon={<Table2 size={22} />}
          tone="red"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-red-50 text-red-600">
              <Filter size={18} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">Bộ lọc nhật ký</h2>
              <p className="text-sm font-semibold text-slate-500">Lọc theo người dùng, hành động, bảng và khoảng thời gian.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Input
              label="User ID"
              type="number"
              value={filterUserId}
              onChange={e => setFilterUserId(e.target.value)}
              placeholder="Ví dụ: 12"
            />
            <Input
              label="Thao tác"
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              placeholder="Tạo mới, cập nhật..."
            />
            <Input
              label="Bảng / Entity"
              value={filterTableName}
              onChange={e => setFilterTableName(e.target.value)}
              placeholder="products, orders..."
            />
            <Input
              label="Từ ngày"
              type="date"
              value={filterFromDate}
              onChange={e => setFilterFromDate(e.target.value)}
            />
            <Input
              label="Đến ngày"
              type="date"
              value={filterToDate}
              onChange={e => setFilterToDate(e.target.value)}
            />
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={handleSearch} className="bg-slate-900 text-white hover:bg-red-600">
              <Filter size={16} className="mr-2" /> Lọc dữ liệu
            </Button>
          </div>
        </div>

        <div className="rounded-[22px] border border-red-100 bg-gradient-to-br from-red-50 via-white to-amber-50 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-100">
              <Database size={20} />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-500">Tỷ lệ thao tác</p>
              <h3 className="text-lg font-black text-slate-900">Audit mix</h3>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {[
              { label: 'Tạo mới', value: stats.createLogs, color: 'bg-emerald-500' },
              { label: 'Cập nhật', value: stats.updateLogs, color: 'bg-blue-500' },
              { label: 'Xóa', value: stats.deleteLogs, color: 'bg-red-500' },
            ].map(item => {
              const percent = stats.totalLogs > 0 ? Math.round((item.value / stats.totalLogs) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm font-bold text-slate-700">
                    <span>{item.label}</span>
                    <span>{item.value} lượt</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DataTable
        columns={[
          { key: 'logid', header: 'ID', render: (l: AuditLog) => <span className="font-mono text-xs text-slate-500">#{l.logid}</span> },
          {
            key: 'user',
            header: 'Người dùng',
            render: (l: AuditLog) => (
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">{l.fullName || 'Hệ thống'}</span>
                {l.userid && <span className="text-xs text-slate-500">ID: {l.userid}</span>}
              </div>
            ),
          },
          {
            key: 'action',
            header: 'Thao tác',
            render: (l: AuditLog) => (
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${getActionColor(l.action)}`}>
                {l.action}
              </span>
            ),
          },
          { key: 'tablename', header: 'Bảng / Đối tượng', render: (l: AuditLog) => <span className="font-mono text-xs">{l.tablename || '-'}</span> },
          { key: 'recordid', header: 'Record ID', render: (l: AuditLog) => <span className="font-mono text-xs">{l.recordid || '-'}</span> },
          { key: 'createdat', header: 'Thời gian', render: (l: AuditLog) => <span className="text-sm">{formatDateTime(l.createdat)}</span> },
        ]}
        data={logs}
        keyField="logid"
        loading={loading}
      />

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          itemCount={totalCount}
          pageSize={pageSize}
        />
      )}
    </div>
  );
}
