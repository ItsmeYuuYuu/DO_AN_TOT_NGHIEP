import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { SensitiveDataDetection } from '@/features/chat/utils/sensitiveDataProtection';

interface SensitiveDataWarningModalProps {
  isOpen: boolean;
  detections: SensitiveDataDetection[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function SensitiveDataWarningModal({
  isOpen,
  detections,
  onCancel,
  onConfirm,
}: SensitiveDataWarningModalProps) {
  const labels = [...new Set(detections.map(item => item.label))];

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Cảnh báo bảo mật" size="sm">
      <div className="space-y-4">
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={22} />
          <p className="text-sm font-semibold leading-6">
            Cửa hàng không bao giờ yêu cầu CCCD/CMND, số thẻ, mã CVV/CVC hoặc số tài khoản
            ngân hàng qua trò chuyện.
          </p>
        </div>

        <div>
          <p className="text-sm font-bold text-slate-800">Tin nhắn có thể chứa:</p>
          <ul className="mt-2 space-y-2">
            {labels.map(label => (
              <li key={label} className="flex items-center gap-2 text-sm text-slate-600">
                <ShieldCheck size={16} className="shrink-0 text-[#e30613]" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          Nếu tiếp tục, hệ thống sẽ thay toàn bộ dãy số nhạy cảm bằng dấu * trước khi gửi.
          Sau đó, bạn cần nhấn nút Gửi thêm một lần để xác nhận.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Không gửi
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-xl bg-[#e30613] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#c4000b]"
          >
            Ẩn thông tin và tiếp tục
          </button>
        </div>
      </div>
    </Modal>
  );
}

