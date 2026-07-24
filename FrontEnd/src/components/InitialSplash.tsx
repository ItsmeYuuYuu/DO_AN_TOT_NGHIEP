import { useEffect, useState } from 'react';

const SPLASH_SESSION_KEY = 'cuong-dien-thoai:splash-seen';
const SPLASH_DURATION_MS = 800;

export function InitialSplash({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(
    () => sessionStorage.getItem(SPLASH_SESSION_KEY) !== 'true',
  );

  useEffect(() => {
    if (!isVisible) return;

    sessionStorage.setItem(SPLASH_SESSION_KEY, 'true');
    const timer = window.setTimeout(() => setIsVisible(false), SPLASH_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [isVisible]);

  return (
    <>
      {children}
      {isVisible && (
        <div className="initial-splash" role="status" aria-label="Đang tải Cuồng Điện Thoại">
          <div className="brand-loader" aria-hidden="true" />
          <span>CUỒNG ĐIỆN THOẠI</span>
        </div>
      )}
    </>
  );
}
