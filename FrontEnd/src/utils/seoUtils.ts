const DEFAULT_DESCRIPTION =
  'Cuong Dien Thoai giup khach hang tim smartphone phu hop theo nhu cau, ngan sach, thong so va tu van AI.';

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const buildSeoDescription = (value?: string, fallback = DEFAULT_DESCRIPTION) => {
  const text = stripHtml(value ?? fallback);
  return text.length > 160 ? `${text.slice(0, 157).trim()}...` : text;
};
