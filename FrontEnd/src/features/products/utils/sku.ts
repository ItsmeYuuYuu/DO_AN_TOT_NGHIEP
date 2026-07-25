export const normalizeSkuSegment = (value: string, maxLength?: number) => {
  const normalized = value
    .trim()
    .replace(/[đĐ]/g, letter => letter === 'đ' ? 'd' : 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');

  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

export const normalizeSku = (value: string) =>
  value
    .split('-')
    .map(segment => normalizeSkuSegment(segment))
    .filter(Boolean)
    .join('-');

export const buildProductVariantSku = (
  productName: string,
  optionValues: string[],
) => [
  normalizeSkuSegment(productName, 5),
  ...optionValues.map(value => normalizeSkuSegment(value)),
].filter(Boolean).join('-');
