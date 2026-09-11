import React from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { linkHandler } from '../router/useRoute';
import { usePageMeta } from '../hooks/usePageMeta';
import { NOT_FOUND_META } from '../seo/pageMeta';

/**
 * Netlify serves index.html with a 200 status for every unmatched path so
 * client-side routing and deep links keep working (see netlify.toml). That
 * makes a true HTTP 404 impossible here, so this component is the
 * equivalent for an SPA: a clear "not found" UI plus a noindex,follow
 * robots directive so search engines don't index or credit unmatched URLs.
 */
export function NotFoundPage() {
  usePageMeta({
    ...NOT_FOUND_META,
    path: typeof window !== 'undefined' ? window.location.pathname : '/404'
  });

  return (
    <div className="min-h-screen bg-paper-50">
      <Header />

      <main className="px-5 sm:px-8 pb-24">
        <section className="max-w-md mx-auto text-center pt-20 sm:pt-28">
          <p className="text-xs font-mono uppercase tracking-[0.14em] text-blue-600 mb-3">
            404
          </p>

          <h1 className="font-display text-3xl text-ink-900 font-semibold tracking-tight">
            Page not found
          </h1>

          <p className="mt-4 text-ink-600/70 text-sm">
            The page you're looking for doesn't exist or may have moved. Try
            heading back to the homepage, or check out the Documentation.
          </p>

          <div className="mt-7 flex items-center justify-center gap-3">
            <a
              href="/"
              onClick={linkHandler('/')}
              className="focus-ring inline-flex items-center justify-center rounded-lg bg-ink-900 text-paper-50 px-5 py-2.5 text-sm font-medium hover:bg-ink-800 transition-colors"
            >
              Go to homepage
            </a>

            <a
              href="/documentation"
              onClick={linkHandler('/documentation')}
              className="focus-ring inline-flex items-center justify-center rounded-lg border border-ink-200 text-ink-900 px-5 py-2.5 text-sm font-medium hover:bg-paper-100 transition-colors"
            >
              Documentation
            </a>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
