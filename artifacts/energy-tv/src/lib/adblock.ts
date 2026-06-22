/**
 * EnergyTV Ad Blocker  (v2 — playback-safe)
 * ─────────────────────────────────────────────────────────────────────────────
 * Key changes from v1:
 *  • BLOCKED_PATTERNS removed the false-positive /ads?\// regex that was
 *    matching embed URLs containing "ad" as a substring (e.g. /embed/, /load/)
 *  • window.open now only blocks when the destination is a confirmed ad domain;
 *    it no longer blocks popups that have a features string — embed players
 *    legitimately use window.open with features for their internal UI layers.
 *  • The cosmetic CSS selector list has been narrowed to avoid accidentally
 *    hiding the player's own overlay elements.
 *  • A PLAYER_DOMAINS allowlist ensures requests to known embed sources are
 *    never blocked regardless of path.
 */

// ─── Embed source allowlist ───────────────────────────────────────────────
// These domains are the actual players. Never block anything from them.
const PLAYER_DOMAINS: ReadonlySet<string> = new Set([
  "vidsrc.to",
  "vidsrc.me",
  "vidsrc.xyz",
  "vidsrc.net",
  "vidsrc.in",
  "vidlink.pro",
  "embed.su",
  "autoembed.co",
  "2embed.cc",
  "multiembed.mov",
  "multiembed.me",
  // CDN / delivery domains the above players pull from
  "cdn.jwplayer.com",
  "cdn.plyr.io",
  "cdnjs.cloudflare.com",
  "player.vimeo.com",
  "www.youtube.com",
  "youtube.com",
  "googlevideo.com",     // YouTube/GDrive video delivery
  "storage.googleapis.com",
  "api.themoviedb.org",
  "image.tmdb.org",
  "accounts.google.com", // Google One-Tap / OAuth
  "googleapis.com",
  "gstatic.com",
  "www.gstatic.com",
]);

function isPlayerDomain(hostname: string): boolean {
  for (const domain of PLAYER_DOMAINS) {
    if (hostname === domain || hostname.endsWith("." + domain)) return true;
  }
  return false;
}

// ─── Ad & tracker domains ─────────────────────────────────────────────────
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
  // Coin miners
  "coinhive.com",
  "coin-hive.com",
  "minero.pw",
  "jsecoin.com",
  "cryptoloot.pro",
  "webminepool.com",
  "crypto-loot.com",
  // Common free-embed ad intermediaries (NOT the player domains above)
  "adbull.me",
  "bcvc.me",
  "clk.ink",
  "clkwait.com",
  "link1s.com",
  "oii.io",
]);

// ─── URL patterns ─────────────────────────────────────────────────────────
// IMPORTANT: these must be specific enough to not match player paths.
// "/ad/" false-positives on "/embed/", "/load/", "/read/" etc — removed.
const BLOCKED_PATTERNS: readonly RegExp[] = [
  /[?&]ad[_-]?(unit|slot|id|type|placement)=/i,  // ad query params (specific)
  /\/pagead\//i,
  /\/adsbygoogle/i,
  /\/adservice\//i,
  /\/serve_ad\b/i,
  /\/vast\.xml/i,
  /\/ima\/ads/i,
  // Block video ad streams: googlevideo with ad tier markers
  // Only block if it's clearly an ad segment, not regular playback
  /googlevideo\.com\/videoplayback\?.*&adi=/i,
  /googlevideo\.com\/videoplayback\?.*ctier=L&/i,
];

function isDomainBlocked(hostname: string): boolean {
  // Never block player/CDN domains regardless of anything else
  if (isPlayerDomain(hostname)) return false;

  for (const domain of BLOCKED_DOMAINS) {
    if (hostname === domain || hostname.endsWith("." + domain)) return true;
  }
  return false;
}

function isUrlBlocked(url: string): boolean {
  try {
    const u = new URL(url);
    // Player domains are always safe
    if (isPlayerDomain(u.hostname)) return false;
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
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.href
        : (input as Request).url;
    if (isUrlBlocked(url)) {
      if (import.meta.env.DEV) console.info("[EnergyTV AdBlock] fetch blocked:", url);
      return new Response(null, { status: 200, statusText: "OK (blocked)" });
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
        if (import.meta.env.DEV) console.info("[EnergyTV AdBlock] XHR blocked:", urlStr);
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
// v2: Only block if destination is a confirmed ad domain.
// Do NOT block based on the features string — embed players open their own
// UI layers (quality pickers, subtitle menus, fullscreen helpers) using
// window.open with a features string, and killing those breaks playback.
function patchWindowOpen(): void {
  const originalOpen = window.open.bind(window);

  window.open = (url?: string | URL, target?: string, features?: string): WindowProxy | null => {
    if (!url) return originalOpen(url, target, features);

    const urlStr = typeof url === "string" ? url : url.href;

    // Only block if the destination is a known ad domain
    if (isUrlBlocked(urlStr)) {
      if (import.meta.env.DEV) console.info("[EnergyTV AdBlock] window.open blocked:", urlStr);
      return null;
    }

    return originalOpen(url, target, features);
  };
}

// ─── Redirect domain list ─────────────────────────────────────────────────
const REDIRECT_DOMAINS: ReadonlySet<string> = new Set([
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
  "shrink.pe",
  "shrinkme.io",
  "gainl.ink",
  "loot-link.com",
  "lootlinks.co",
  "rekonise.com",
  "social-unlock.com",
  "cpalead.com",
  "cpabuild.com",
  "cpagrip.com",
  "ogads.com",
  "go2speed.org",
  "clicksfly.com",
]);

const REDIRECT_PATTERNS: readonly RegExp[] = [
  /[?&]redirect(?:_to|_url|uri)?=https?:\/\//i,
  /[?&]r=https?:\/\//i,
  /[?&]goto=https?:\/\//i,
  /[?&]out=https?:\/\//i,
];

function isRedirectBlocked(url: string): boolean {
  try {
    const u = new URL(url, location.href);
    if (u.origin === location.origin) return false;
    // Never block player domains
    if (isPlayerDomain(u.hostname)) return false;
    for (const domain of REDIRECT_DOMAINS) {
      if (u.hostname === domain || u.hostname.endsWith("." + domain)) return true;
    }
    for (const pattern of REDIRECT_PATTERNS) {
      if (pattern.test(u.href)) return true;
    }
    if (isUrlBlocked(url)) return true;
  } catch {
    // unparseable — don't block
  }
  return false;
}

// ─── Location / navigation hijack blocker ────────────────────────────────
function patchLocation(): void {
  try {
    const proto = window.Location.prototype;
    const originalDescriptor = Object.getOwnPropertyDescriptor(proto, "href");
    if (originalDescriptor?.set) {
      const originalSetter = originalDescriptor.set;
      Object.defineProperty(proto, "href", {
        ...originalDescriptor,
        set(url: string) {
          if (isRedirectBlocked(url)) {
            if (import.meta.env.DEV) console.warn("[EnergyTV AdBlock] Blocked location.href →", url);
            return;
          }
          originalSetter.call(this, url);
        },
      });
    }

    const originalAssign = proto.assign;
    Object.defineProperty(proto, "assign", {
      value(url: string) {
        if (isRedirectBlocked(url)) return;
        originalAssign.call(this, url);
      },
      writable: true,
      configurable: true,
    });

    const originalReplace = proto.replace;
    Object.defineProperty(proto, "replace", {
      value(url: string) {
        if (isRedirectBlocked(url)) return;
        originalReplace.call(this, url);
      },
      writable: true,
      configurable: true,
    });
  } catch { /* Location prototype patching failed */ }

  const originalPush = history.pushState.bind(history);
  history.pushState = (state: any, title: string, url?: string | URL | null) => {
    if (url && isRedirectBlocked(String(url))) return;
    originalPush(state, title, url);
  };

  const originalReplaceState = history.replaceState.bind(history);
  history.replaceState = (state: any, title: string, url?: string | URL | null) => {
    if (url && isRedirectBlocked(String(url))) return;
    originalReplaceState(state, title, url);
  };
}

// ─── Meta refresh watcher ─────────────────────────────────────────────────
function watchMetaRefresh(): void {
  const stripMeta = () => {
    document.querySelectorAll<HTMLMetaElement>('meta[http-equiv="refresh"]').forEach((el) => {
      const content = el.getAttribute("content") ?? "";
      const match = content.match(/url=(.+)/i);
      if (match) {
        const dest = match[1].trim().replace(/['"]/g, "");
        if (isRedirectBlocked(dest)) el.remove();
      }
    });
  };
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
      }
    },
    true
  );
}

// ─── Cosmetic DOM hiding ──────────────────────────────────────────────────
// Narrowed in v2 — removed broad selectors that could hide player elements.
const AD_SELECTORS = [
  "[class*='adsbygoogle']",
  "[class*='ad-banner']",
  "[class*='advertisement']",
  "[class*='sponsored-content']",
  "[id='google-ads']",
  "[id='ad-block-modal']",
  "[id='adContainer']",
  "[id='onetrust-banner-sdk']",
  "[id='onetrust-consent-sdk']",
  "[id='CybotCookiebotDialogBodyUnderlay']",
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
  try { patchFetch();       } catch { /* ignore */ }
  try { patchXHR();         } catch { /* ignore */ }
  try { patchWindowOpen();  } catch { /* ignore */ }
  try { patchLocation();    } catch { /* ignore */ }
  try { patchLinkClicks();  } catch { /* ignore */ }

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
    console.info("[EnergyTV AdBlock] v2 active — player domains allowlisted");
  }
}

export { isUrlBlocked };
