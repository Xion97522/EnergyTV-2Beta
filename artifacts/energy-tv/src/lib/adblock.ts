/**
 * EnergyTV Ad Blocker
 * Blocks ad/tracker network requests and suppresses popup windows.
 * Drop this at: artifacts/energy-tv/src/lib/adblock.ts
 * Then call initAdBlock() from src/main.tsx (before createRoot).
 */

// ─── Ad & tracker domains ──────────────────────────────────────────────────
// Sourced from netfilter's filter lists (urlFilter + thirdParty patterns),
// trimmed to domains most likely hit by free embed sources.
const BLOCKED_DOMAINS: ReadonlySet<string> = new Set([
  // Ad networks
  "doubleclick.net",
  "googlesyndication.com",
  "googletagmanager.com",
  "googletagservices.com",
  "adservice.google.com",
  "pagead2.googlesyndication.com",
  "tpc.googlesyndication.com",
  "adnxs.com",
  "adsrvr.org",
  "adtech.de",
  "advertising.com",
  "adblade.com",
  "adcolony.com",
  "admob.com",
  "adform.net",
  "appnexus.com",
  "criteo.com",
  "criteo.net",
  "rubiconproject.com",
  "pubmatic.com",
  "openx.net",
  "openx.com",
  "outbrain.com",
  "taboola.com",
  "revcontent.com",
  "mgid.com",
  "adf.ly",
  "ouo.io",
  "shorte.st",
  "linkvertise.com",
  "popads.net",
  "popcash.net",
  "propellerads.com",
  "exoclick.com",
  "juicyads.com",
  "trafficjunky.net",
  "trafficstars.com",
  "ero-advertising.com",
  "plugrush.com",
  "adsterra.com",
  "hilltopads.net",
  "richpush.co",
  "push.house",
  "evadav.com",
  "clickadu.com",
  "adhub.com",
  "adriver.ru",
  "mytarget.ru",
  "begun.ru",
  // Trackers
  "analytics.google.com",
  "google-analytics.com",
  "stats.g.doubleclick.net",
  "hotjar.com",
  "mixpanel.com",
  "segment.com",
  "segment.io",
  "amplitude.com",
  "fullstory.com",
  "logrocket.com",
  "intercom.io",
  "intercomcdn.com",
  "clarity.ms",
  "quantserve.com",
  "scorecardresearch.com",
  "comscore.com",
  "Nielsen.com",
  " nielsen.com",
  "facebook.com/tr",
  "connect.facebook.net",
  "bat.bing.com",
  "ad.doubleclick.net",
  "pixel.facebook.com",
  "tr.snapchat.com",
  "analytics.twitter.com",
  "t.co",
  "pin.pinterest.com",
  "ct.pinterest.com",
  // Coin miners
  "coinhive.com",
  "coin-hive.com",
  "minero.pw",
  "jsecoin.com",
  "miner.pr0gramm.com",
  "cnhv.co",
  "cryptoloot.pro",
  "webminepool.com",
  "webmine.cz",
  "crypto-loot.com",
  "gus.host",
  "ppoi.org",
  "kisshentai.net",
  "coinerra.com",
  "monerise.com",
  // Malware / phishing patterns
  "malvertising.com",
  "ad.fly",
  "adfly.us",
  // Common free-embed ad intermediaries
  "go.xyz",
  "adbull.me",
  "bcvc.me",
  "clk.ink",
  "clkwait.com",
  "link1s.com",
  "oii.io",
  "dl.dropboxusercontent.com/shortcuts",
]);

// ─── URL patterns (substring match) ──────────────────────────────────────
const BLOCKED_PATTERNS: readonly RegExp[] = [
  /\/ads?\//i,
  /\/advert(s|ising)?\//i,
  /[?&]ad[_-]?(unit|slot|id|type|placement)=/i,
  /\/pagead\//i,
  /\/adsbygoogle/i,
  /\/adservice\//i,
  /\/serve_ad/i,
  /\/(popup|popunder|interstitial)\//i,
  /\/vast\.xml/i,
  /\/ima\/(ads|.*ad_rule)/i,
  /googlevideo\.com\/videoplayback.*ctier=L/i, // ads in video streams
];

function isDomainBlocked(hostname: string): boolean {
  // exact or subdomain match
  for (const domain of BLOCKED_DOMAINS) {
    if (hostname === domain || hostname.endsWith("." + domain)) return true;
  }
  return false;
}

function isUrlBlocked(url: string): boolean {
  try {
    const u = new URL(url);
    if (isDomainBlocked(u.hostname)) return true;
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(u.href)) return true;
    }
  } catch {
    // relative URL or parse error — not blocked
  }
  return false;
}

// ─── Fetch interceptor ────────────────────────────────────────────────────
function patchFetch(): void {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    if (isUrlBlocked(url)) {
      return new Response(null, { status: 200, statusText: "OK (blocked by EnergyTV AdBlock)" });
    }
    return originalFetch(input, init);
  };
}

// ─── XHR interceptor ─────────────────────────────────────────────────────
function patchXHR(): void {
  const OriginalXHR = window.XMLHttpRequest;
  class BlockingXHR extends OriginalXHR {
    private _blocked = false;
    open(method: string, url: string | URL, ...args: any[]): void {
      const urlStr = typeof url === "string" ? url : url.href;
      if (isUrlBlocked(urlStr)) {
        this._blocked = true;
        return;
      }
      // @ts-expect-error overload spread
      super.open(method, url, ...args);
    }
    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      if (this._blocked) return;
      super.send(body);
    }
  }
  (window as any).XMLHttpRequest = BlockingXHR;
}

// ─── Popup / window.open blocker ─────────────────────────────────────────
function patchWindowOpen(): void {
  const allowedFeatures = new Set(["noopener", "noreferrer", "noopener,noreferrer"]);
  const originalOpen = window.open.bind(window);

  window.open = (url?: string | URL, target?: string, features?: string): WindowProxy | null => {
    // Always allow blank target explicitly opened by EnergyTV itself
    // (the "Open Tab" button uses target="_blank" via <a>, not window.open)
    if (!url) return originalOpen(url, target, features);

    const urlStr = typeof url === "string" ? url : url.href;

    // Block if the destination is an ad domain
    if (isUrlBlocked(urlStr)) return null;

    // Block popups with no meaningful target (classic ad popup pattern)
    if (!target || target === "_blank" || target === "") {
      // Allow only if features string is absent (plain link behaviour)
      if (features && !allowedFeatures.has(features.replace(/\s/g, "").toLowerCase())) {
        return null;
      }
    }

    return originalOpen(url, target, features);
  };
}

// ─── Redirect domains (link shorteners / ad gates) ───────────────────────
// These should NEVER be allowed to navigate the top-level page.
const REDIRECT_DOMAINS: ReadonlySet<string> = new Set([
  // URL shorteners used as ad gates
  "adf.ly",
  "adfly.us",
  "ouo.io",
  "ouo.press",
  "shorte.st",
  "linkvertise.com",
  "link1s.com",
  "clk.ink",
  "clkwait.com",
  "oii.io",
  "adbull.me",
  "bcvc.me",
  "go.xyz",
  "shrink.pe",
  "shrinkme.io",
  "shrinkforearn.in",
  "earnwithmobile.com",
  "gplinks.co",
  "za.gl",
  "fc.lc",
  "shrinkearn.com",
  "inshorturl.com",
  "oke.io",
  "short.pe",
  "cutwin.com",
  "exe.io",
  "adshrink.it",
  "adshort.me",
  "shorturllink.in",
  "ultrashort.in",
  "droplink.co",
  "useree.com",
  "cpmlink.pro",
  "cpm.gg",
  "paid4.link",
  "link.tl",
  "linkpoi.me",
  "srt.am",
  "ur.ly",
  "cutt.us",
  "bom.so",
  "clicky.me",
  "cpalead.com",
  "cpabuild.com",
  "cpagrip.com",
  "ogads.com",
  "d0o.us",
  "mrf.io",
  // Ad redirect intermediaries seen on free embed sites
  "go2speed.org",
  "xxxshake.com",
  "clicksfly.com",
  "gainl.ink",
  "za.gl",
  "loot-link.com",
  "lootlinks.co",
  "rekonise.com",
  "social-unlock.com",
  "viralnova.link",
]);

// These patterns in the destination URL signal a redirect chain
const REDIRECT_PATTERNS: readonly RegExp[] = [
  /[?&]redirect(?:_to|_url|uri)?=/i,
  /[?&]r=https?:\/\//i,
  /[?&]url=https?:\/\//i,
  /[?&]goto=https?:\/\//i,
  /[?&]out=https?:\/\//i,
  /[?&]link=https?:\/\//i,
  /[?&]ref(?:er(?:rer)?)?=https?:\/\//i,
  /\/(?:go|out|redirect|redir|track|click|jump)\//i,
  /\/(?:go|out|redirect|redir|track|click|jump)\?/i,
];

function isRedirectBlocked(url: string): boolean {
  try {
    const u = new URL(url, location.href);
    // Same-origin navigations are always fine
    if (u.origin === location.origin) return false;
    // Block known redirect domains
    for (const domain of REDIRECT_DOMAINS) {
      if (u.hostname === domain || u.hostname.endsWith("." + domain)) return true;
    }
    // Block known redirect patterns
    for (const pattern of REDIRECT_PATTERNS) {
      if (pattern.test(u.href)) return true;
    }
    // Also block if the destination is an ad domain
    if (isUrlBlocked(url)) return true;
  } catch {
    // unparseable — don't block
  }
  return false;
}

// ─── Location / navigation hijack blocker ────────────────────────────────
function patchLocation(): void {
  // NOTE: window.location is a special platform object — its properties are
  // non-configurable in Firefox and Safari, so Object.defineProperty on
  // window.location throws a TypeError in those browsers. We patch the
  // *prototype* instead (which is configurable everywhere) and wrap each
  // method/setter with a try/catch so a failure never prevents React from
  // mounting.

  try {
    const proto = window.Location.prototype;

    // Intercept location.href setter via prototype
    const originalDescriptor = Object.getOwnPropertyDescriptor(proto, "href");
    if (originalDescriptor?.set) {
      const originalSetter = originalDescriptor.set;
      Object.defineProperty(proto, "href", {
        ...originalDescriptor,
        set(url: string) {
          if (isRedirectBlocked(url)) {
            if (import.meta.env.DEV) console.warn("[EnergyTV AdBlock] Blocked location.href redirect →", url);
            return;
          }
          originalSetter.call(this, url);
        },
      });
    }

    // Intercept location.assign via prototype
    const originalAssign = proto.assign;
    Object.defineProperty(proto, "assign", {
      value(url: string) {
        if (isRedirectBlocked(url)) {
          if (import.meta.env.DEV) console.warn("[EnergyTV AdBlock] Blocked location.assign →", url);
          return;
        }
        originalAssign.call(this, url);
      },
      writable: true,
      configurable: true,
    });

    // Intercept location.replace via prototype
    const originalReplace = proto.replace;
    Object.defineProperty(proto, "replace", {
      value(url: string) {
        if (isRedirectBlocked(url)) {
          if (import.meta.env.DEV) console.warn("[EnergyTV AdBlock] Blocked location.replace →", url);
          return;
        }
        originalReplace.call(this, url);
      },
      writable: true,
      configurable: true,
    });
  } catch {
    // Location prototype patching failed (extremely locked-down environment).
    // Fall through — link-click interception still provides redirect blocking.
  }

  // Intercept history.pushState / replaceState to catch SPA-style redirects
  const originalPush = history.pushState.bind(history);
  history.pushState = (state: any, title: string, url?: string | URL | null) => {
    if (url && isRedirectBlocked(String(url))) {
      if (import.meta.env.DEV) console.warn("[EnergyTV AdBlock] Blocked history.pushState →", url);
      return;
    }
    originalPush(state, title, url);
  };

  const originalReplaceState = history.replaceState.bind(history);
  history.replaceState = (state: any, title: string, url?: string | URL | null) => {
    if (url && isRedirectBlocked(String(url))) {
      if (import.meta.env.DEV) console.warn("[EnergyTV AdBlock] Blocked history.replaceState →", url);
      return;
    }
    originalReplaceState(state, title, url);
  };
}

// ─── <meta http-equiv="refresh"> watcher ─────────────────────────────────
function watchMetaRefresh(): void {
  const stripMeta = () => {
    document.querySelectorAll<HTMLMetaElement>('meta[http-equiv="refresh"]').forEach((el) => {
      const content = el.getAttribute("content") ?? "";
      // content is like "0; url=https://..." or just "5"
      const match = content.match(/url=(.+)/i);
      if (match) {
        const dest = match[1].trim().replace(/['"]/g, "");
        if (isRedirectBlocked(dest)) {
          el.remove();
          if (import.meta.env.DEV) console.warn("[EnergyTV AdBlock] Removed meta refresh →", dest);
        }
      }
    });
  };

  // Run immediately and watch for dynamically injected meta tags
  stripMeta();
  const observer = new MutationObserver(stripMeta);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// ─── Link click redirect interceptor ─────────────────────────────────────
function patchLinkClicks(): void {
  document.addEventListener(
    "click",
    (e: MouseEvent) => {
      const target = (e.target as Element).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      if (isRedirectBlocked(href)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (import.meta.env.DEV) console.warn("[EnergyTV AdBlock] Blocked link click →", href);
      }
    },
    true // capture phase — fires before the link is followed
  );
}

// ─── Cosmetic DOM hiding ──────────────────────────────────────────────────
const AD_SELECTORS = [
  // Generic ad containers
  "[id*='ad-']",
  "[id*='_ad_']",
  "[class*='ad-slot']",
  "[class*='adsbygoogle']",
  "[class*='ad-banner']",
  "[class*='ad-container']",
  "[class*='ad-wrapper']",
  "[class*='advertisement']",
  "[class*='sponsored-content']",
  "[id='google-ads']",
  "[id='ad-block-modal']",
  "[id='adContainer']",
  "[id='player-ads']",
  // Overlay / popup patterns from netfilter's content.css
  "[id='onetrust-banner-sdk']",
  "[id='onetrust-consent-sdk']",
  "[id='CybotCookiebotDialogBodyUnderlay']",
  "[id='popup-modal']",
  "[id='newsletter-floating']",
  // Iframes that look like ads (no src, or src matches ad domain)
  "iframe[src*='doubleclick']",
  "iframe[src*='googlesyndication']",
  "iframe[src*='adnxs']",
  "iframe[src*='exoclick']",
  "iframe[src*='propellerads']",
  "iframe[src*='popads']",
  "iframe[src*='adsterra']",
];

function injectCosmeticCSS(): void {
  if (document.getElementById("energytv-adblock-css")) return;
  const style = document.createElement("style");
  style.id = "energytv-adblock-css";
  style.textContent = AD_SELECTORS.map((s) => `${s} { display: none !important; }`).join("\n");
  document.head.appendChild(style);
}

// ─── Public init ──────────────────────────────────────────────────────────
export function initAdBlock(): void {
  // Each patch is wrapped individually so a failure in one never prevents
  // the others (or React mounting) from running.
  try { patchFetch(); } catch { /* ignore */ }
  try { patchXHR(); } catch { /* ignore */ }
  try { patchWindowOpen(); } catch { /* ignore */ }
  try { patchLocation(); } catch { /* ignore */ }
  try { patchLinkClicks(); } catch { /* ignore */ }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      injectCosmeticCSS();
      watchMetaRefresh();
    }, { once: true });
  } else {
    injectCosmeticCSS();
    watchMetaRefresh();
  }

  if (import.meta.env.DEV) {
    console.info("[EnergyTV AdBlock] Active — fetch, XHR, window.open, location, links, meta refresh patched");
  }
}

export { isUrlBlocked };
