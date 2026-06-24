// EnergyTV AdBlock + Tracker Interceptor
// Only vidlink.pro allowed as player source

const BLOCKED_DOMAINS = [
  // Major ad networks & trackers (blocked everywhere)
  'doubleclick.net',
  'googleadservices.com',
  'googlesyndication.com',
  'googletagmanager.com',
  'googletagservices.com',
  'adform.net',
  'adsafeprotected.com',
  'adservice.google.com',
  'pagead2.googlesyndication.com',
  'amazon-adsystem.com',
  'taboola.com',
  'outbrain.com',
  'criteo.net',
  'scorecardresearch.com',
  'quantserve.com',
  'facebook.net',
  'facebook.com/tr',
  // Add more as needed
];

const ALLOWED_PLAYER_DOMAINS = [
  'vidlink.pro',           // ONLY player source we allow
  'tmdb.org',
  'themoviedb.org',
  'image.tmdb.org',        // posters & backdrops
];

export function setupAdBlock() {
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const hostname = new URL(url.startsWith('http') ? url : window.location.origin + url).hostname;

    // Block known ad/tracker domains
    if (BLOCKED_DOMAINS.some(domain => hostname.includes(domain))) {
      console.log(`[EnergyTV AdBlock] Blocked: ${hostname}`);
      return new Response('{}', { status: 204 });
    }

    // Only allow vidlink.pro for actual video playback
    if (url.includes('/embed/') && !ALLOWED_PLAYER_DOMAINS.some(d => hostname.includes(d))) {
      console.warn(`[EnergyTV] Blocked unauthorized player: ${hostname}`);
      return new Response('{}', { status: 403 });
    }

    return originalFetch(input, init);
  };

  // Also block XHR
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method: string, url: string) {
    const hostname = new URL(url.startsWith('http') ? url : window.location.origin + url).hostname;
    
    if (BLOCKED_DOMAINS.some(domain => hostname.includes(domain))) {
      console.log(`[EnergyTV AdBlock] Blocked XHR: ${hostname}`);
      return;
    }
    
    return originalXHROpen.apply(this, [method, url] as any);
  } as any;
}

// Auto-init
if (typeof window !== 'undefined') {
  setupAdBlock();
}

export { BLOCKED_DOMAINS, ALLOWED_PLAYER_DOMAINS };
