import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  getLocalSnapshot,
  applySnapshot,
  type LocalSnapshot,
} from "@/data/watchlist";

function mergeSnapshots(local: LocalSnapshot, cloud: LocalSnapshot): LocalSnapshot {
  const watchlist = Array.from(new Set([...local.watchlist, ...cloud.watchlist]));

  const historySet = new Map<number, number>();
  [...local.history, ...cloud.history].forEach((id) => {
    if (!historySet.has(id)) historySet.set(id, historySet.size);
  });
  const history = [...historySet.keys()].slice(0, 20);

  const progress = { ...cloud.progress };
  for (const [key, localEntry] of Object.entries(local.progress)) {
    const id = Number(key);
    const cloudEntry = cloud.progress[id];
    if (!cloudEntry || new Date(localEntry.updatedAt) >= new Date(cloudEntry.updatedAt)) {
      progress[id] = localEntry;
    }
  }

  return { watchlist, history, progress };
}

export interface SyncStatus {
  syncing:    boolean;
  lastSynced: Date | null;
  error:      string | null;
  push:       () => void;
}

export function useCloudSync(): SyncStatus {
  const { user } = useAuth();

  const [syncing,    setSyncing]    = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const pushTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Pull on sign-in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setSyncing(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("user_data")
          .select("snapshot")
          .eq("user_id", user.id)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

        if (data?.snapshot && !cancelled) {
          const merged = mergeSnapshots(getLocalSnapshot(), data.snapshot as LocalSnapshot);
          applySnapshot(merged);
          window.dispatchEvent(new Event("energytv:synced"));
        }
        if (!cancelled) setLastSynced(new Date());
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Sync failed");
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  // Push (debounced)
  const push = useCallback(() => {
    if (!user) return;
    clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      setSyncing(true);
      setError(null);
      try {
        const snapshot = getLocalSnapshot();
        const { error: upsertError } = await supabase
          .from("user_data")
          .upsert({ user_id: user.id, snapshot }, { onConflict: "user_id" });
        if (upsertError) throw upsertError;
        setLastSynced(new Date());
      } catch (e: any) {
        setError(e?.message ?? "Upload failed");
      } finally {
        setSyncing(false);
      }
    }, 2000);
  }, [user]);

  useEffect(() => {
    const handler = () => push();
    window.addEventListener("energytv:changed", handler);
    return () => window.removeEventListener("energytv:changed", handler);
  }, [push]);

  return { syncing, lastSynced, error, push };
}
