import React from 'react';
import { linkHandler, useRoute } from '../router/useRoute';

interface Props {
  size?: 'sm' | 'md';
  /** When set, clicking the wordmark while already on "/" calls this instead
   *  of being a no-op — used to reset an in-progress report back to the
   *  landing screen, matching "logo takes you home" from anywhere in the app. */
  onHome?: () => void;
}

export function Wordmark({ size = 'md', onHome }: Props) {
  const [path] = useRoute();
  const mark = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const text = size === 'sm' ? 'text-[15px]' : 'text-lg';

  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (onHome && path === '/') {
      e.preventDefault();
      onHome();
      return;
    }
    linkHandler('/')(e);
  };

  return (
    <a
      href="/"
      onClick={handleClick}
      className="focus-ring flex items-center gap-2 shrink-0 rounded-md"
      aria-label="DocBit — go to homepage"
    >
      <span className={`${mark} shrink-0 rounded-md bg-ink-900 flex items-center justify-center`}>
        <svg width="60%" height="60%" viewBox="0 0 16 16" fill="none">
          <rect y="1" width="16" height="2.4" rx="1.2" fill="#F4F5F2" />
          <rect y="6.8" width="11" height="2.4" rx="1.2" fill="#16A34A" />
          <rect y="12.6" width="13" height="2.4" rx="1.2" fill="#F4F5F2" opacity="0.6" />
        </svg>
      </span>
      <span className={`font-display font-semibold ${text} text-ink-900 tracking-tight`}>
        DocBit<span className="text-signal-500">.</span>
      </span>
    </a>
  );
}
