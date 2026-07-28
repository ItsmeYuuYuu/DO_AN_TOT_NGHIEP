import { Fragment } from 'react';
import { Link } from 'react-router-dom';

interface ChatLinkifiedTextProps {
  text: string;
  linkClassName?: string;
}

const linkPattern =
  /(\[[^\]\n]+\]\((?:https?:\/\/[^\s)]+|\/products\/[A-Za-z0-9-]+)\)|https?:\/\/[^\s<]+|\/products\/[A-Za-z0-9-]+)/g;

const trailingPunctuationPattern = /[.,!?;:]+$/;

export const ChatLinkifiedText = ({
  text,
  linkClassName = 'font-black text-[#c4000b] underline underline-offset-2',
}: ChatLinkifiedTextProps) => (
  <>
    {text.split(linkPattern).map((part, index) => {
      const markdownLink = part.match(
        /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|\/products\/[A-Za-z0-9-]+)\)$/,
      );

      let href = markdownLink?.[2] ?? part;
      let suffix = '';

      if (!markdownLink && /^https?:\/\//i.test(href)) {
        const punctuation = href.match(trailingPunctuationPattern)?.[0] ?? '';
        if (punctuation) {
          href = href.slice(0, -punctuation.length);
          suffix = punctuation;
        }
      }
      const label = markdownLink?.[1] ?? href;

      if (href.startsWith('/')) {
        return (
          <Fragment key={`${part}-${index}`}>
            <Link to={href} className={linkClassName}>
              {label}
            </Link>
            {suffix}
          </Fragment>
        );
      }

      if (/^https?:\/\//i.test(href)) {
        return (
          <Fragment key={`${part}-${index}`}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName}
            >
              {label}
            </a>
            {suffix}
          </Fragment>
        );
      }

      return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
    })}
  </>
);
