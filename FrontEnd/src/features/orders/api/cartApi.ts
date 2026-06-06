import apiClient from '@/api/apiClient';
import type { CartItem } from '../context/CartContext';

export interface CartResponse {
  userId: number;
  items: CartItem[];
}

export const cartApi = {
  getCart: () => apiClient.get<CartResponse>('/cart'),
  
  addToCart: (variantId: number, quantity: number = 1) => 
    apiClient.post<CartResponse>('/cart/add', { variantId, quantity }),
    
  updateQuantity: (variantId: number, quantity: number) => 
    apiClient.put<CartResponse>('/cart/update-quantity', { variantId, quantity }),
    
  removeFromCart: (variantId: number) => 
    apiClient.delete<CartResponse>(`/cart/remove/${variantId}`),
    
  mergeCart: (items: { variantId: number; quantity: number }[]) => 
    apiClient.post<CartResponse>('/cart/merge', { items }),
    
  clearCart: () => apiClient.delete<CartResponse>('/cart/clear'),
};
