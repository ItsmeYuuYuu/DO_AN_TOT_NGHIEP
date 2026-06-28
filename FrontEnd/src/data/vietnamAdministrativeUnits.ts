export interface WardOption {
  code: string;
  name: string;
}

export interface ProvinceOption {
  code: string;
  name: string;
  wards: WardOption[];
}

type ProvinceApiItem = {
  code?: number | string;
  name?: string;
  wards?: Array<{ code?: number | string; name?: string }>;
};

const FALLBACK_WARDS: Record<string, WardOption[]> = {
  '79': [
    { code: 'hcm-tan-dinh', name: 'Phường Tân Định' },
    { code: 'hcm-sai-gon', name: 'Phường Sài Gòn' },
    { code: 'hcm-ben-thanh', name: 'Phường Bến Thành' },
    { code: 'hcm-cho-lon', name: 'Phường Chợ Lớn' },
    { code: 'hcm-chanh-hung', name: 'Phường Chánh Hưng' },
    { code: 'hcm-binh-tan', name: 'Phường Bình Tân' },
    { code: 'hcm-thu-duc', name: 'Phường Thủ Đức' },
  ],
  '01': [
    { code: 'hn-hoan-kiem', name: 'Phường Hoàn Kiếm' },
    { code: 'hn-ba-dinh', name: 'Phường Ba Đình' },
    { code: 'hn-dong-da', name: 'Phường Đống Đa' },
    { code: 'hn-cau-giay', name: 'Phường Cầu Giấy' },
    { code: 'hn-ha-dong', name: 'Phường Hà Đông' },
  ],
  '48': [
    { code: 'dn-hai-chau', name: 'Phường Hải Châu' },
    { code: 'dn-thanh-khe', name: 'Phường Thanh Khê' },
    { code: 'dn-son-tra', name: 'Phường Sơn Trà' },
  ],
};

export const FALLBACK_PROVINCES: ProvinceOption[] = [
  { code: '01', name: 'Thành phố Hà Nội', wards: FALLBACK_WARDS['01'] },
  { code: '79', name: 'Thành phố Hồ Chí Minh', wards: FALLBACK_WARDS['79'] },
  { code: '48', name: 'Thành phố Đà Nẵng', wards: FALLBACK_WARDS['48'] },
  { code: '31', name: 'Thành phố Hải Phòng', wards: [] },
  { code: '92', name: 'Thành phố Cần Thơ', wards: [] },
  { code: '04', name: 'Tỉnh Cao Bằng', wards: [] },
  { code: '08', name: 'Tỉnh Tuyên Quang', wards: [] },
  { code: '11', name: 'Tỉnh Điện Biên', wards: [] },
  { code: '12', name: 'Tỉnh Lai Châu', wards: [] },
  { code: '14', name: 'Tỉnh Sơn La', wards: [] },
  { code: '15', name: 'Tỉnh Lào Cai', wards: [] },
  { code: '19', name: 'Tỉnh Thái Nguyên', wards: [] },
  { code: '20', name: 'Tỉnh Lạng Sơn', wards: [] },
  { code: '22', name: 'Tỉnh Quảng Ninh', wards: [] },
  { code: '24', name: 'Tỉnh Bắc Ninh', wards: [] },
  { code: '25', name: 'Tỉnh Phú Thọ', wards: [] },
  { code: '33', name: 'Tỉnh Hưng Yên', wards: [] },
  { code: '37', name: 'Tỉnh Ninh Bình', wards: [] },
  { code: '38', name: 'Tỉnh Thanh Hóa', wards: [] },
  { code: '40', name: 'Tỉnh Nghệ An', wards: [] },
  { code: '42', name: 'Tỉnh Hà Tĩnh', wards: [] },
  { code: '44', name: 'Tỉnh Quảng Trị', wards: [] },
  { code: '46', name: 'Thành phố Huế', wards: [] },
  { code: '51', name: 'Tỉnh Quảng Ngãi', wards: [] },
  { code: '52', name: 'Tỉnh Gia Lai', wards: [] },
  { code: '56', name: 'Tỉnh Khánh Hòa', wards: [] },
  { code: '66', name: 'Tỉnh Đắk Lắk', wards: [] },
  { code: '68', name: 'Tỉnh Lâm Đồng', wards: [] },
  { code: '75', name: 'Tỉnh Đồng Nai', wards: [] },
  { code: '80', name: 'Tỉnh Tây Ninh', wards: [] },
  { code: '82', name: 'Tỉnh Đồng Tháp', wards: [] },
  { code: '86', name: 'Tỉnh Vĩnh Long', wards: [] },
  { code: '91', name: 'Tỉnh An Giang', wards: [] },
  { code: '96', name: 'Tỉnh Cà Mau', wards: [] },
];

const normalizeProvinceName = (name: string) =>
  name
    .replace(/^Tỉnh Thành phố\s+/i, 'Thành phố ')
    .replace(/^Thành phố Thành phố\s+/i, 'Thành phố ')
    .trim();

export async function loadVietnamAdministrativeUnits(): Promise<ProvinceOption[]> {
  try {
    const response = await fetch('https://provinces.open-api.vn/api/v2/?depth=2');
    if (!response.ok) throw new Error('Cannot load province API');

    const data = (await response.json()) as ProvinceApiItem[];
    const provinces = data
      .filter(item => item.code && item.name)
      .map(item => ({
        code: String(item.code).padStart(2, '0'),
        name: normalizeProvinceName(item.name!),
        wards: (item.wards ?? [])
          .filter(ward => ward.code && ward.name)
          .map(ward => ({
            code: String(ward.code),
            name: ward.name!,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

    return provinces.length >= 34 ? provinces : FALLBACK_PROVINCES;
  } catch {
    return FALLBACK_PROVINCES;
  }
}
