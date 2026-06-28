const DEFAULT_DESCRIPTION =
  'Cuồng Điện Thoại giúp khách hàng tìm smartphone phù hợp theo nhu cầu, ngân sách, thông số và tư vấn AI.';

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const buildSeoDescription = (value?: string, fallback = DEFAULT_DESCRIPTION) => {
  const text = stripHtml(value ?? fallback);
  return text.length > 160 ? `${text.slice(0, 157).trim()}...` : text;
};
