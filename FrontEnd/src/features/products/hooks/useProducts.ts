import { useState, useEffect } from 'react';
import { productsApi } from '../api/productsApi';
import type { CreateFullProduct, Product } from '../api/productsApi';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productsApi.getAll();
      setProducts(res.data);
    } catch {
      setError('Không thể tải danh sách sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const deleteProduct = async (id: number) => {
    await productsApi.delete(id);
    setProducts((prev) => prev.filter((p) => p.productid !== id));
  };

  const createFullProduct = async (data: CreateFullProduct) => {
    await productsApi.createFull(data);
    await fetchProducts();
  };

  return { products, loading, error, refetch: fetchProducts, deleteProduct, createFullProduct };
};
