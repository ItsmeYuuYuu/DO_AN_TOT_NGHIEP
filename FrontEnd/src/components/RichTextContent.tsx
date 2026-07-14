import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { normalizeLegacyRichText } from '@/utils/richText';

interface RichTextContentProps {
  html: string;
  className?: string;
}

/** Safely renders HTML produced by CKEditor, including legacy Markdown images. */
export const RichTextContent = ({ html, className = '' }: RichTextContentProps) => {
  const sanitizedHtml = useMemo(
    () => DOMPurify.sanitize(normalizeLegacyRichText(html), {
      USE_PROFILES: { html: true },
    }),
    [html],
  );

  return (
    <div
      className={`rich-text-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
