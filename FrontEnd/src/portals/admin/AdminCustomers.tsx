import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import apiClient from '@/api/apiClient';
import { formatDate } from '@/utils/formatters';

const PAGE_SIZE = 10;

interface Customer {
  customerid: number;
  fullname: string;
  email?: string;
  phone?: string;
  address?: string;
  createdat?: string;
}

const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    apiClient.get<Customer[]>('/Customers')
      .then(res => setCustomers(res.data))
      .catch(() => setError('Không thể tải danh sách khách hàng.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    c.fullname.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = [
    {
      key: 'customerid',
      header: '#',
      render: (c: Customer) => <span className="font-mono text-xs text-slate-400">#{c.customerid}</span>,
      className: 'w-12',
    },
    {
      key: 'fullname',
      header: 'Khách hàng',
      render: (c: Customer) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
            {c.fullname.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{c.fullname}</p>
            <p className="text-xs text-slate-400">{c.email ?? ''}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Số điện thoại',
      render: (c: Customer) => <span className="text-sm text-slate-600 font-mono">{c.phone ?? '—'}</span>,
    },
    {
      key: 'address',
      header: 'Địa chỉ',
      render: (c: Customer) => <span className="text-sm text-slate-500 line-clamp-1">{c.address ?? '—'}</span>,
    },
    {
      key: 'createdat',
      header: 'Ngày đăng ký',
      render: (c: Customer) => <span className="text-xs text-slate-500">{c.createdat ? formatDate(c.createdat) : '—'}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-800">Quản lý Khách hàng</h2>
        <p className="text-sm text-slate-500">{filtered.length} khách hàng đã đăng ký</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="max-w-sm">
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 placeholder:text-slate-400"
            placeholder="Tìm tên, số điện thoại, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <DataTable columns={columns} data={paged} keyField="customerid" loading={loading} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} itemCount={filtered.length} pageSize={PAGE_SIZE} />
    </div>
  );
};

export default AdminCustomers;
