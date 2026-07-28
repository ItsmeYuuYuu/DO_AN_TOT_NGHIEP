export const FREE_SHIPPING_THRESHOLD = 2_000_000;
export const HO_CHI_MINH_INNER_FEE = 30_000;
export const STANDARD_SHIPPING_FEE = 50_000;

export type ShippingZone = 'free' | 'hcm-inner' | 'hcm-outer' | 'outside-hcm' | 'estimate';

const normalize = (value?: string) => (value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\u0111/g, 'd')
  .toLowerCase()
  .trim();

const outerHoChiMinhKeywords = [
  'cu chi', 'hoc mon', 'binh chanh', 'nha be', 'can gio',
  'ba ria', 'vung tau', 'binh duong', 'thu dau mot', 'di an',
  'thuan an', 'ben cat', 'tan uyen', 'phu my',
];

export const calculateShippingFee = (
  merchandiseAmount: number,
  provinceName?: string,
  wardName?: string,
): { fee: number; zone: ShippingZone } => {
  if (merchandiseAmount >= FREE_SHIPPING_THRESHOLD) return { fee: 0, zone: 'free' };
  if (!provinceName) return { fee: HO_CHI_MINH_INNER_FEE, zone: 'estimate' };

  const province = normalize(provinceName);
  if (!province.includes('ho chi minh')) {
    return { fee: STANDARD_SHIPPING_FEE, zone: 'outside-hcm' };
  }

  const address = `${province} ${normalize(wardName)}`;
  return outerHoChiMinhKeywords.some(keyword => address.includes(keyword))
    ? { fee: STANDARD_SHIPPING_FEE, zone: 'hcm-outer' }
    : { fee: HO_CHI_MINH_INNER_FEE, zone: 'hcm-inner' };
};

export const getShippingZoneLabel = (zone: ShippingZone) => ({
  free: 'Mi\u1ec5n ph\u00ed giao h\u00e0ng',
  'hcm-inner': 'N\u1ed9i th\u00e0nh TP.HCM',
  'hcm-outer': 'Ngo\u1ea1i th\u00e0nh TP.HCM',
  'outside-hcm': 'Ngo\u00e0i TP.HCM',
  estimate: 'D\u1ef1 ki\u1ebfn n\u1ed9i th\u00e0nh TP.HCM',
})[zone];
