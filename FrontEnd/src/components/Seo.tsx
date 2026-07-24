import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { buildSeoDescription } from '@/utils/seoUtils';

const SITE_NAME = 'Cuồng Điện Thoại';
const DEFAULT_TITLE = 'Cuồng Điện Thoại - Tư vấn smartphone bằng AI';
const DEFAULT_DESCRIPTION =
  'Cuồng Điện Thoại giúp khách hàng tìm smartphone phù hợp theo nhu cầu, ngân sách, thông số và tư vấn AI.';
const DEFAULT_IMAGE = '/favicon.svg';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  canonicalPath?: string;
}

const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const upsertCanonical = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

const toAbsoluteUrl = (value: string, siteUrl: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.startsWith('/') ? value : `/${value}`, siteUrl).toString();
};

export const Seo = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  type = 'website',
  noIndex = false,
  canonicalPath,
}: SeoProps) => {
  const location = useLocation();

  useEffect(() => {
    const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined) || window.location.origin;
    const canonicalUrl = toAbsoluteUrl(canonicalPath ?? `${location.pathname}${location.search}`, siteUrl);
    const imageUrl = toAbsoluteUrl(image, siteUrl);
    const safeDescription = buildSeoDescription(description);

    document.documentElement.lang = 'vi';
    document.title = title;

    upsertMeta('name', 'description', safeDescription);
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('name', 'theme-color', '#e30613');

    upsertMeta('property', 'og:locale', 'vi_VN');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', safeDescription);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', imageUrl);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', safeDescription);
    upsertMeta('name', 'twitter:image', imageUrl);

    upsertCanonical(canonicalUrl);
  }, [canonicalPath, description, image, location.pathname, location.search, noIndex, title, type]);

  return null;
};
