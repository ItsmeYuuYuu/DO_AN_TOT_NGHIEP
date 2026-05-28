import { useState, useEffect } from 'react';
import { auditLogsApi } from '@/features/system/api/auditLogsApi';
import type { AuditLog, GetAuditLogsParams } from '@/features/system/api/auditLogsApi';
import { DataTable } from '@/components/DataTable';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Pagination } from '@/components/Pagination';
import { formatDateTime } from '@/utils/formatters';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filterUserId, setFilterUserId] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterTableName, setFilterTableName] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: GetAuditLogsParams = { page, pageSize };
      if (filterUserId) params.userId = parseInt(filterUserId);
      if (filterAction) params.action = filterAction;
      if (filterTableName) params.tableName = filterTableName;
      if (filterFromDate) params.fromDate = new Date(filterFromDate).toISOString();
      if (filterToDate) params.toDate = new Date(filterToDate).toISOString();

      const result = await auditLogsApi.getLogs(params);
      setLogs(result.items);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.Message || 'Lỗi khi tải nhật ký hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleReset = () => {
    setFilterUserId('');
    setFilterAction('');
    setFilterTableName('');
    setFilterFromDate('');
    setFilterToDate('');
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const getActionColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('INSERT')) return 'bg-emerald-100 text-emerald-700';
    if (act.includes('UPDATE') || act.includes('EDIT')) return 'bg-blue-100 text-blue-700';
    if (act.includes('DELETE') || act.includes('REMOVE')) return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Nhật Ký Hệ Thống</h1>
        <p className="text-sm text-slate-500 mt-1">Giám sát các thao tác cập nhật, thêm mới, xóa từ quản trị viên</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-4">
        <Input 
          label="User ID" 
          type="number" 
          value={filterUserId} 
          onChange={(e: any) => setFilterUserId(e.target.value)} 
          placeholder="Ví dụ: 12"
        />
        <Input 
          label="Thao tác" 
          value={filterAction} 
          onChange={(e: any) => setFilterAction(e.target.value)} 
          placeholder="CREATE, UPDATE..."
        />
        <Input 
          label="Bảng (Entity)" 
          value={filterTableName} 
          onChange={(e: any) => setFilterTableName(e.target.value)} 
          placeholder="Products..."
        />
        <Input 
          label="Từ ngày" 
          type="date" 
          value={filterFromDate} 
          onChange={(e: any) => setFilterFromDate(e.target.value)} 
        />
        <Input 
          label="Đến ngày" 
          type="date" 
          value={filterToDate} 
          onChange={(e: any) => setFilterToDate(e.target.value)} 
        />
        <div className="md:col-span-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleReset}>Khôi phục</Button>
          <Button onClick={handleSearch}>Lọc dữ liệu</Button>
        </div>
      </div>

      <DataTable
        columns={[
          { key: 'logid', header: 'ID', render: (l: any) => <span className="font-mono text-xs text-slate-500">#{l.logid}</span> },
          { 
            key: 'user', 
            header: 'Người dùng', 
            render: (l: any) => (
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">{l.fullName || 'Hệ thống'}</span>
                {l.userid && <span className="text-xs text-slate-500">ID: {l.userid}</span>}
              </div>
            )
          },
          { 
            key: 'action', 
            header: 'Thao tác', 
            render: (l: any) => (
              <span className={`px-2 py-1 rounded text-xs font-bold ${getActionColor(l.action)}`}>
                {l.action}
              </span>
            )
          },
          { key: 'tablename', header: 'Bảng / Đối tượng', render: (l: any) => <span className="font-mono text-xs">{l.tablename || '-'}</span> },
          { key: 'recordid', header: 'Record ID', render: (l: any) => <span className="font-mono text-xs">{l.recordid || '-'}</span> },
          { key: 'createdat', header: 'Thời gian', render: (l: any) => <span className="text-sm">{formatDateTime(l.createdat)}</span> },
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
