export type SensitiveDataKind =
  | 'national-id'
  | 'payment-card'
  | 'card-security-code'
  | 'bank-account';

export interface SensitiveDataDetection {
  kind: SensitiveDataKind;
  label: string;
  start: number;
  end: number;
  replacement: string;
}

export interface SensitiveDataAnalysis {
  redactedText: string;
  detections: SensitiveDataDetection[];
}

const NUMBER_CANDIDATE = /\d(?:[\s.-]?\d){2,18}/g;

const normalizeContext = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();

const keywordDistance = (prefix: string, suffix: string, terms: string[]) => {
  let best = Number.POSITIVE_INFINITY;
  for (const term of terms) {
    const prefixIndex = prefix.lastIndexOf(term);
    if (prefixIndex >= 0) best = Math.min(best, prefix.length - prefixIndex - term.length);
    const suffixIndex = suffix.indexOf(term);
    if (suffixIndex >= 0) best = Math.min(best, suffixIndex + 8);
  }
  return best;
};

const passesLuhn = (digits: string) => {
  let sum = 0;
  let doubleDigit = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return sum > 0 && sum % 10 === 0;
};

const classifyCandidate = (digits: string, prefix: string, suffix: string): Pick<SensitiveDataDetection, 'kind' | 'label' | 'replacement'> | null => {
  const phoneDistance = keywordDistance(prefix, suffix, ['so dien thoai', 'dien thoai', 'sdt', 'phone', 'lien he']);
  const orderDistance = keywordDistance(prefix, suffix, ['ma don hang', 'ma don', 'don hang', 'order']);
  const cardSecurityDistance = keywordDistance(prefix, suffix, ['cvv', 'cvc', 'csc', 'ma bao mat', 'ma an toan']);
  const bankAccountDistance = keywordDistance(prefix, suffix, [
    'so tai khoan',
    'tai khoan ngan hang',
    'bank account',
    'stk',
    'ngan hang',
  ]);
  const cardDistance = keywordDistance(prefix, suffix, [
    'so the',
    'the ngan hang',
    'the tin dung',
    'the ghi no',
    'credit card',
    'debit card',
    'visa',
    'mastercard',
  ]);
  const nationalIdDistance = keywordDistance(prefix, suffix, [
    'cccd',
    'cmnd',
    'can cuoc',
    'chung minh nhan dan',
    'so dinh danh',
  ]);

  if (digits.length === 10 && digits.startsWith('0') && phoneDistance <= 12) return null;
  if (orderDistance <= 12) return null;

  const candidates: Array<Pick<SensitiveDataDetection, 'kind' | 'label' | 'replacement'> & { distance: number }> = [];

  if (digits.length >= 3 && digits.length <= 4 && cardSecurityDistance <= 28) {
    candidates.push({
      kind: 'card-security-code',
      label: 'Mã bảo mật thẻ (CVV/CVC)',
      replacement: '*'.repeat(digits.length),
      distance: cardSecurityDistance,
    });
  }

  if (digits.length >= 6 && digits.length <= 20 && bankAccountDistance <= 28) {
    candidates.push({
      kind: 'bank-account',
      label: 'Số tài khoản ngân hàng',
      replacement: '*'.repeat(digits.length),
      distance: bankAccountDistance,
    });
  }

  if (digits.length >= 13 && digits.length <= 19 && (cardDistance <= 28 || passesLuhn(digits))) {
    candidates.push({
      kind: 'payment-card',
      label: 'Số thẻ thanh toán',
      replacement: '*'.repeat(digits.length),
      distance: cardDistance <= 28 ? cardDistance : 40,
    });
  }

  if (digits.length === 12 || (digits.length === 9 && nationalIdDistance <= 28)) {
    candidates.push({
      kind: 'national-id',
      label: digits.length === 12 ? 'Số căn cước công dân' : 'Số chứng minh nhân dân',
      replacement: '*'.repeat(digits.length),
      distance: nationalIdDistance <= 28 ? nationalIdDistance : 40,
    });
  }

  candidates.sort((left, right) => left.distance - right.distance);
  return candidates[0] ?? null;
};

export const analyzeSensitiveData = (text: string): SensitiveDataAnalysis => {
  const detections: SensitiveDataDetection[] = [];

  for (const match of text.matchAll(NUMBER_CANDIDATE)) {
    if (match.index === undefined) continue;

    const start = match.index;
    const end = start + match[0].length;
    const digits = match[0].replace(/\D/g, '');
    const prefix = normalizeContext(text.slice(Math.max(0, start - 48), start));
    const suffix = normalizeContext(text.slice(end, Math.min(text.length, end + 48)));
    const classification = classifyCandidate(digits, prefix, suffix);
    if (!classification) continue;

    detections.push({
      ...classification,
      start,
      end,
    });
  }

  if (detections.length === 0) return { redactedText: text, detections };

  let cursor = 0;
  let redactedText = '';
  for (const detection of detections) {
    redactedText += text.slice(cursor, detection.start);
    redactedText += detection.replacement;
    cursor = detection.end;
  }
  redactedText += text.slice(cursor);

  return { redactedText, detections };
};
