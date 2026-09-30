import { isGaId } from "@/lib/safe-url";

/**
 * Google Analytics, loaded only on the production hosts (same snippet as the static site).
 * The id is validated before it is interpolated; an invalid id renders nothing.
 */
export function Analytics({ gaId }: { gaId: string }) {
  if (!isGaId(gaId)) return null;
  const snippet = `(() => {
      const isProdHost = window.location.hostname === 'cura.aero' || window.location.hostname === 'www.cura.aero';
      if (!isProdHost) return;

      window.dataLayer = window.dataLayer || [];
      window.gtag = (...args) => { window.dataLayer.push(args); };
      window.gtag('js', new Date());
      window.gtag('config', '${gaId}');

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=${gaId}';
      document.head.appendChild(script);
    })();`;
  return <script dangerouslySetInnerHTML={{ __html: snippet }} />;
}
