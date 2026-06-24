export interface ProductLinkTarget {
  productid: number;
  slug?: string | null;
}

export const getProductPath = (product: ProductLinkTarget) =>
  `/products/${product.slug || product.productid}`;
