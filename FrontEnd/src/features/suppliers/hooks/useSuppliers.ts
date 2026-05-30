import { useState, useEffect } from 'react';
import { suppliersApi } from '../api/suppliersApi';
import type { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '../api/suppliersApi';

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await suppliersApi.getAll();
      setSuppliers(res.data);
    } catch {
      setError('Không thể tải danh sách nhà cung cấp.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const createSupplier = async (data: CreateSupplierRequest) => {
    const res = await suppliersApi.create(data);
    setSuppliers(prev => [...prev, res.data]);
    return res.data;
  };

  const updateSupplier = async (id: number, data: UpdateSupplierRequest) => {
    const res = await suppliersApi.update(id, data);
    setSuppliers(prev => prev.map(s => s.supplierid === id ? res.data : s));
    return res.data;
  };

  const deleteSupplier = async (id: number) => {
    await suppliersApi.delete(id);
    setSuppliers(prev => prev.filter(s => s.supplierid !== id));
  };

  return { suppliers, loading, error, refetch: fetchSuppliers, createSupplier, updateSupplier, deleteSupplier };
};
