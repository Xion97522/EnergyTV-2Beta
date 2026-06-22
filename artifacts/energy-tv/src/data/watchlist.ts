/**
 * watchlist.ts  (updated — adds real progress tracking)
 * -------------------------------------------------------
 * Progress entries now store:
 *   - percent  : 0-100 (how far through the content)
 *   - updatedAt: ISO timestamp
 *   - season / episode (for TV)
 */

const STORAGE_KEY   = "energytv_watchlist";
const HISTORY_KEY   = "energytv_history";
const PROGRESS_KEY  = "energytv_progress";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProgressEntry {
  percent:    number;   // 0–100
  updatedAt:  string;   // ISO 8601
  season?:    number;   // TV only
  episode?:   number;   // TV only
}

export type ProgressMap = Record<number, ProgressEntry>; // keyed by media id

// ─── Watchlist ───────────────────────────────────────────────────────────────

export function getWatchlist(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToWatchlist(id: number): void {
  const list = getWatchlist();
  if (!list.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...list, id]));
  }
}

export function removeFromWatchlist(id: number): void {
  const list = getWatchlist().filter((i) => i !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function isInWatchlist(id: number): boolean {
  return getWatchlist().includes(id);
}

export function toggleWatchlist(id: number): boolean {
  if (isInWatchlist(id)) {
    removeFromWatchlist(id);
    return false;
  } else {
    addToWatchlist(id);
    return true;
  }
}

// ─── Watch history ────────────────────────────────────────────────────────────

export function getHistory(): number[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(id: number): void {
  const list = getHistory().filter((i) => i !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([id, ...list].slice(0, 20)));
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export function getProgressMap(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getProgress(id: number): ProgressEntry | null {
  return getProgressMap()[id] ?? null;
}

export function saveProgress(
  id: number,
  percent: number,
  opts?: { season?: number; episode?: number }
): void {
  const map = getProgressMap();
  map[id] = {
    percent: Math.min(100, Math.max(0, Math.round(percent))),
    updatedAt: new Date().toISOString(),
    ...(opts?.season  !== undefined ? { season:  opts.season  } : {}),
    ...(opts?.episode !== undefined ? { episode: opts.episode } : {}),
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));

  // Also keep the history list in sync
  addToHistory(id);
}

// ─── Cloud sync helpers ───────────────────────────────────────────────────────
// These return plain JS objects so the cloud sync hook can merge them.

export interface LocalSnapshot {
  watchlist: number[];
  history:   number[];
  progress:  ProgressMap;
}

export function getLocalSnapshot(): LocalSnapshot {
  return {
    watchlist: getWatchlist(),
    history:   getHistory(),
    progress:  getProgressMap(),
  };
}

export function applySnapshot(snap: LocalSnapshot): void {
  localStorage.setItem(STORAGE_KEY,  JSON.stringify(snap.watchlist));
  localStorage.setItem(HISTORY_KEY,  JSON.stringify(snap.history));
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(snap.progress));
}
