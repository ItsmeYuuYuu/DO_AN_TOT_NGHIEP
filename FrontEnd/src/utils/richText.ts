const escapeHtmlAttribute = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

/** Convert descriptions created before CKEditor from Markdown images to HTML. */
export const normalizeLegacyRichText = (value: string): string => value.replace(
  /!\[([^\]]*)\]\(([^)]+)\)/g,
  (_, alt: string, url: string) => (
    `<figure class="image"><img src="${escapeHtmlAttribute(url.trim())}" alt="${escapeHtmlAttribute(alt.trim())}" /></figure>`
  ),
);

/** Remove an uploaded image from CKEditor HTML and legacy Markdown content. */
export const removeImageFromRichText = (value: string, imageUrl: string): string => {
  const legacyPatterns = [
    `\n![Hình ảnh sản phẩm](${imageUrl})\n`,
    `![Hình ảnh sản phẩm](${imageUrl})`,
  ];
  let next = legacyPatterns.reduce((content, pattern) => content.replaceAll(pattern, ''), value);

  const document = new DOMParser().parseFromString(next, 'text/html');
  document.querySelectorAll('img').forEach(image => {
    if (image.getAttribute('src') !== imageUrl) return;
    const wrapper = image.closest('figure, p');
    (wrapper ?? image).remove();
  });
  next = document.body.innerHTML;
  return next;
};
