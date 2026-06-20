const STORAGE_KEY = "energytv_watchlist";
const HISTORY_KEY = "energytv_history";

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
