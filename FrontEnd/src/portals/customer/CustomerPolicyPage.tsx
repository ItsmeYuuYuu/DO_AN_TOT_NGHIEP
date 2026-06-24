import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RefreshCcw, ShieldCheck, Truck } from 'lucide-react';

interface PolicySection {
  title: string;
  items: string[];
}

interface PolicyContent {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  sections: PolicySection[];
  note: string;
}

const policyContent: Record<string, PolicyContent> = {
  '/policy': {
    eyebrow: 'Chính sách bảo hành',
    title: 'Bảo hành theo IMEI và lịch sử xử lý rõ ràng',
    description:
      'Cuồng Điện Thoại tiếp nhận bảo hành dựa trên IMEI, tình trạng máy và thời hạn bảo hành được kích hoạt sau khi đơn hàng hoàn tất.',
    icon: <ShieldCheck size={30} />,
    sections: [
      {
        title: 'Điều kiện được bảo hành',
        items: [
          'Sản phẩm còn thời hạn bảo hành trên hệ thống và có IMEI trùng với đơn hàng đã mua.',
          'Lỗi phát sinh từ phần cứng, linh kiện hoặc quá trình sử dụng bình thường theo điều kiện bảo hành của cửa hàng.',
          'Máy không bị can thiệp phần cứng bởi bên thứ ba, không mất tem hoặc thay đổi IMEI.',
        ],
      },
      {
        title: 'Trường hợp không áp dụng bảo hành miễn phí',
        items: [
          'Máy bị rơi vỡ, cong sườn, vào nước, cháy nổ, chập nguồn do sử dụng sai cách.',
          'Lỗi do phần mềm không chính thức, root/jailbreak hoặc tự ý can thiệp hệ điều hành.',
          'Phụ kiện tiêu hao như cáp, củ sạc, ốp lưng áp dụng theo thời hạn riêng nếu có ghi trên đơn hàng.',
        ],
      },
      {
        title: 'Quy trình tiếp nhận',
        items: [
          'Khách hàng cung cấp số điện thoại, mã đơn hoặc IMEI để nhân viên tra cứu.',
          'Bộ phận bảo hành kiểm tra tình trạng máy, ghi nhận mô tả lỗi và hình ảnh nếu cần.',
          'Sau khi có kết luận, hệ thống cập nhật trạng thái: tiếp nhận, kiểm tra, sửa chữa, chờ linh kiện hoặc hoàn tất.',
        ],
      },
    ],
    note: 'Thời gian xử lý bảo hành phụ thuộc tình trạng lỗi và linh kiện. Nhân viên sẽ thông báo chi phí trước nếu phát sinh sửa chữa ngoài phạm vi bảo hành.',
  },
  '/shipping': {
    eyebrow: 'Chính sách vận chuyển',
    title: 'Giao hàng minh bạch, theo dõi được trạng thái đơn',
    description:
      'Đơn hàng sau khi xác nhận sẽ được chuyển sang bộ phận kho để xuất IMEI, đóng gói và tạo vận đơn demo phục vụ theo dõi.',
    icon: <Truck size={30} />,
    sections: [
      {
        title: 'Phạm vi giao hàng',
        items: [
          'Hỗ trợ giao hàng toàn quốc theo thông tin người nhận đã cung cấp khi đặt hàng.',
          'Khu vực nội thành có thể được ưu tiên xử lý nhanh tùy tình trạng kho và lịch giao.',
          'Địa chỉ, số điện thoại và tên người nhận cần chính xác để tránh giao thất bại hoặc hoàn hàng.',
        ],
      },
      {
        title: 'Thanh toán và đặt cọc',
        items: [
          'Khách hàng đã đăng nhập có thể chọn COD, ví điện tử, VNPay hoặc chuyển khoản theo cấu hình thanh toán demo.',
          'Khách vãng lai không dùng COD; cần thanh toán trước hoặc đặt cọc theo tỷ lệ hệ thống yêu cầu.',
          'Đơn chưa thanh toán đủ điều kiện có thể bị hủy hoặc hoàn tồn kho sau khi hết thời gian giữ hàng.',
        ],
      },
      {
        title: 'Theo dõi vận đơn',
        items: [
          'Sau khi kho xuất máy, hệ thống ghi nhận đơn vị vận chuyển, mã vận đơn và trạng thái giao hàng.',
          'Khách hàng có thể tra cứu đơn bằng mã đơn, số điện thoại hoặc thông tin nhận hàng.',
          'Các trạng thái vận chuyển gồm chờ giao, đang giao, giao thành công, giao thất bại hoặc hoàn hàng.',
        ],
      },
    ],
    note: 'Đây là quy trình vận chuyển demo cho khóa luận, chưa kết nối trực tiếp với hãng vận chuyển thật.',
  },
  '/return': {
    eyebrow: 'Đổi trả và hoàn tiền',
    title: 'Đổi trả theo IMEI, đơn hàng và lịch sử tiếp nhận',
    description:
      'Quy trình đổi trả giúp kiểm soát đúng thiết bị đã bán, tình trạng hàng hoàn và phương án hoàn tiền hoặc đổi máy.',
    icon: <RefreshCcw size={30} />,
    sections: [
      {
        title: 'Điều kiện gửi yêu cầu',
        items: [
          'Sản phẩm thuộc đơn hàng đã hoàn tất và còn trong thời hạn đổi trả theo chính sách cửa hàng.',
          'IMEI gửi đổi trả phải trùng với IMEI đã xuất trong đơn hàng.',
          'Khách hàng cần mô tả lý do, tình trạng máy và cung cấp hình ảnh nếu được yêu cầu.',
        ],
      },
      {
        title: 'Các phương án xử lý',
        items: [
          'Đổi sang máy cùng loại nếu sản phẩm lỗi đủ điều kiện và kho còn hàng thay thế.',
          'Hoàn tiền một phần hoặc toàn bộ tùy tình trạng máy, lý do đổi trả và phương thức thanh toán ban đầu.',
          'Chuyển sang quy trình bảo hành nếu lỗi cần kiểm tra kỹ thuật hoặc không đủ điều kiện đổi ngay.',
        ],
      },
      {
        title: 'Quy trình kiểm tra',
        items: [
          'Nhân viên tiếp nhận yêu cầu và duyệt hoặc từ chối dựa trên thông tin ban đầu.',
          'Kho nhận lại máy, kiểm tra đúng IMEI, tình trạng ngoại hình và khả năng nhập lại kho.',
          'Sau khi hoàn tất, hệ thống lưu lịch sử xử lý và cập nhật giao dịch hoàn tiền nếu có.',
        ],
      },
    ],
    note: 'Các yêu cầu đổi trả không hợp lệ, sai IMEI hoặc có dấu hiệu can thiệp thiết bị có thể bị từ chối sau khi kiểm tra.',
  },
};

const CustomerPolicyPage: React.FC = () => {
  const location = useLocation();
  const content = policyContent[location.pathname] ?? policyContent['/policy'];

  return (
    <div className="customer-shell min-h-screen pb-16">
      <section className="border-b customer-rule bg-white px-4 py-10">
        <div className="customer-container">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#c4000b]">
            <ArrowLeft size={15} /> Về trang chủ
          </Link>
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.5fr] lg:items-center">
            <div className="customer-panel-soft flex h-36 w-36 items-center justify-center rounded-[34px] text-[#c4000b]">
              {content.icon}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#c4000b]">{content.eyebrow}</p>
              <h1 className="customer-display mt-3 max-w-4xl text-4xl font-bold leading-tight text-[#1f2937] md:text-5xl">
                {content.title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500">{content.description}</p>
            </div>
          </div>
        </div>
      </section>

      <main className="customer-container px-4 py-10">
        <div className="grid gap-5 lg:grid-cols-3">
          {content.sections.map(section => (
            <article key={section.title} className="customer-panel p-6">
              <h2 className="text-xl font-black text-[#1f2937]">{section.title}</h2>
              <ul className="mt-5 space-y-4">
                {section.items.map(item => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={17} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="customer-panel-soft mt-8 p-6">
          <p className="text-sm font-bold leading-7 text-[#1f2937]">{content.note}</p>
        </div>
      </main>
    </div>
  );
};

export default CustomerPolicyPage;
