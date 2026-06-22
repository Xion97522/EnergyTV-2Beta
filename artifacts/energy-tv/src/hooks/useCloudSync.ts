/**
 * useCloudSync.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Syncs the user's Continue Watching list (history + progress + watchlist)
 * to Google Drive's **App Data** folder — a hidden private folder that only
 * EnergyTV can read or write. The user never sees the file in their Drive.
 *
 * Strategy:
 *  - On mount (when a Drive token becomes available): PULL cloud → merge → save locally
 *  - On every saveProgress / watchlist change: PUSH local → cloud (debounced 2s)
 *
 * File in Drive appdata: energytv-data.json
 *
 * Usage:
 *   Call useCloudSync() once near the top of your app (e.g. in App.tsx or Navbar).
 *   It returns { syncing, lastSynced, error } for optional status display.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getLocalSnapshot,
  applySnapshot,
  type LocalSnapshot,
} from "@/data/watchlist";

const DRIVE_FILE_NAME = "energytv-data.json";
const APPDATA_FOLDER  = "appDataFolder";

// ─── Drive API helpers ────────────────────────────────────────────────────────

async function findFile(token: string): Promise<string | null> {
  const url =
    `https://www.googleapis.com/drive/v3/files` +
    `?spaces=${APPDATA_FOLDER}&q=name%3D%27${DRIVE_FILE_NAME}%27&fields=files(id)`;
  const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

async function readFile(token: string, fileId: string): Promise<LocalSnapshot | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  return res.json();
}

async function writeFile(
  token: string,
  snapshot: LocalSnapshot,
  existingId: string | null
): Promise<string> {
  const body = JSON.stringify(snapshot);
  const blob = new Blob([body], { type: "application/json" });

  if (existingId) {
    // Patch existing file content
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify({})], { type: "application/json" })
    );
    form.append("file", blob);
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`,
      { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: form }
    );
    const data = await res.json();
    return data.id as string;
  } else {
    // Create new file in appDataFolder
    const form = new FormData();
    form.append(
      "metadata",
      new Blob(
        [JSON.stringify({ name: DRIVE_FILE_NAME, parents: [APPDATA_FOLDER] })],
        { type: "application/json" }
      )
    );
    form.append("file", blob);
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
    );
    const data = await res.json();
    return data.id as string;
  }
}

// ─── Merge strategy ───────────────────────────────────────────────────────────
// Union watchlist, merge history (most-recent first, keep latest 20),
// merge progress (keep entry with newest updatedAt).

function mergeSnapshots(local: LocalSnapshot, cloud: LocalSnapshot): LocalSnapshot {
  const watchlist = Array.from(new Set([...local.watchlist, ...cloud.watchlist]));

  const historySet = new Map<number, number>(); // id → position
  [...local.history, ...cloud.history].forEach((id) => {
    if (!historySet.has(id)) historySet.set(id, historySet.size);
  });
  const history = [...historySet.keys()].slice(0, 20);

  const progress = { ...cloud.progress };
  for (const [key, localEntry] of Object.entries(local.progress)) {
    const id          = Number(key);
    const cloudEntry  = cloud.progress[id];
    if (!cloudEntry || new Date(localEntry.updatedAt) >= new Date(cloudEntry.updatedAt)) {
      progress[id] = localEntry;
    }
  }

  return { watchlist, history, progress };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface SyncStatus {
  syncing:    boolean;
  lastSynced: Date | null;
  error:      string | null;
  push:       () => void;  // call after any local change to trigger an immediate upload
}

export function useCloudSync(): SyncStatus {
  const { driveToken } = useAuth();

  const [syncing,    setSyncing]    = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const fileIdRef   = useRef<string | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Pull on sign-in (when driveToken first becomes available) ────────────
  useEffect(() => {
    if (!driveToken) return;

    let cancelled = false;

    (async () => {
      setSyncing(true);
      setError(null);
      try {
        const id = await findFile(driveToken);
        fileIdRef.current = id;

        if (id) {
          const cloud = await readFile(driveToken, id);
          if (cloud && !cancelled) {
            const merged = mergeSnapshots(getLocalSnapshot(), cloud);
            applySnapshot(merged);
            // Dispatch a storage event so React re-reads localStorage
            window.dispatchEvent(new Event("energytv:synced"));
          }
        }
        if (!cancelled) setLastSynced(new Date());
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Sync failed");
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [driveToken]);

  // ── Push (debounced) ─────────────────────────────────────────────────────
  const push = useCallback(() => {
    if (!driveToken) return;
    clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      setSyncing(true);
      setError(null);
      try {
        const snapshot = getLocalSnapshot();
        const id = await writeFile(driveToken, snapshot, fileIdRef.current);
        fileIdRef.current = id;
        setLastSynced(new Date());
      } catch (e: any) {
        setError(e?.message ?? "Upload failed");
      } finally {
        setSyncing(false);
      }
    }, 2000);
  }, [driveToken]);

  // ── Auto-push when anything changes in localStorage ──────────────────────
  useEffect(() => {
    const handler = () => push();
    window.addEventListener("energytv:changed", handler);
    return () => window.removeEventListener("energytv:changed", handler);
  }, [push]);

  return { syncing, lastSynced, error, push };
}
