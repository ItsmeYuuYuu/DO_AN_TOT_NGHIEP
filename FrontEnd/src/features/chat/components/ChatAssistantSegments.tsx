import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChatLinkifiedText } from './ChatLinkifiedText';

interface ChatAssistantSegmentsProps {
  content: string;
  progressive?: boolean;
  compact?: boolean;
  delayMs?: number;
  children?: ReactNode;
}

const splitAssistantSegments = (content: string) => {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const segments: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    const isProductTitle = /^\d+\.\s+/.test(line);
    const isClosing = line.startsWith('Bạn có thể bổ sung') || line.startsWith('Nếu anh/chị muốn');

    if ((isProductTitle || isClosing) && current.length > 0) {
      segments.push(current);
      current = [];
    }

    current.push(line);

    if (isClosing) {
      segments.push(current);
      current = [];
    }
  }

  if (current.length > 0) segments.push(current);
  return segments.length > 0 ? segments : [[content]];
};

export const ChatAssistantSegments = ({
  content,
  progressive = false,
  compact = false,
  delayMs = 500,
  children,
}: ChatAssistantSegmentsProps) => {
  const segments = useMemo(() => splitAssistantSegments(content), [content]);
  const [visibleCount, setVisibleCount] = useState(progressive ? 1 : segments.length);

  useEffect(() => {
    setVisibleCount(progressive ? 1 : segments.length);
  }, [progressive, segments.length, content]);

  useEffect(() => {
    if (!progressive || visibleCount >= segments.length) return;
    const timer = window.setTimeout(() => {
      setVisibleCount(count => Math.min(count + 1, segments.length));
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, progressive, segments.length, visibleCount]);

  const textSize = compact ? 'text-[13px] leading-6' : 'text-sm leading-7';
  const bubbleClass = compact
    ? 'rounded-2xl border border-[#e5e7eb] bg-white px-3 py-2 shadow-sm'
    : 'rounded-[22px] border border-white bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]';

  return (
    <div className="space-y-3">
      {segments.slice(0, visibleCount).map((segment, segmentIndex) => (
        <div key={`${segment.join('|')}-${segmentIndex}`} className={`${bubbleClass} ${textSize} text-slate-700`}>
          <div className="space-y-2">
            {segment.map((line, lineIndex) => {
              const normalized = line.toLowerCase();
              const isReason = normalized.startsWith('lý do gợi ý:') || normalized.startsWith('lã½ do gá»£i ý:');
              const isProductTitle = /^\d+\.\s+/.test(line);
              const isVariantLine = /^-\s+/.test(line);

              if (isReason) {
                return (
                  <div
                    key={`${line}-${lineIndex}`}
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-900"
                  >
                    <ChatLinkifiedText text={line} />
                  </div>
                );
              }

              return (
                <div
                  key={`${line}-${lineIndex}`}
                  className={
                    isProductTitle
                      ? 'font-black text-slate-950'
                      : isVariantLine
                        ? 'pl-3 text-slate-700'
                        : 'text-slate-700'
                  }
                >
                  <ChatLinkifiedText text={line} />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {progressive && visibleCount < segments.length && (
        <div className={`${bubbleClass} inline-flex items-center gap-2 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
          <span className="text-xs font-bold text-slate-500">Em đang lọc thêm chi tiết...</span>
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#e30613]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#e30613] [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#e30613] [animation-delay:300ms]" />
        </div>
      )}

      {visibleCount >= segments.length && children}
    </div>
  );
};
