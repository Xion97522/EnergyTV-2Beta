/**
 * PlayerModal.tsx  (slimmed — picker + "open in new tab" only)
 * ────────────────────────────────────────────────────────────────────────────
 * Changes from the iframe-player version:
 *  - Removed the embedded iframe player entirely (no more sandboxed embed,
 *    source switcher, load/timeout handling, or simulated progress timer).
 *  - Movies: no modal at all. Calling the component for a movie immediately
 *    opens the source URL in a new tab, marks progress complete, and closes.
 *  - TV: modal still shows Season → Episode picker. Picking an episode opens
 *    that episode's URL in a new tab, marks progress complete for that
 *    episode, then closes the modal.
 *  - Progress: since we can no longer observe real playback (no iframe to
 *    time), we mark the opened item as 100% watched at the moment the tab
 *    is opened, and still push to cloud sync via the energytv:changed event.
 */

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ExternalLink, Tv, Play } from "lucide-react";
import { Media } from "@/data/movies";
import { saveProgress } from "@/data/watchlist";
import { useCloudSync } from "@/hooks/useCloudSync";

interface PlayerModalProps {
  media:          Media;
  onClose:        () => void;
  initialSeason?: number;
  initialEpisode?: number;
}

/* ── Single source used to build the "open in new tab" URL ────────────── */
const SOURCE = {
  movie: (id: number) => `https://vidsrc.to/embed/movie/${id}`,
  tv:    (id: number, s: number, e: number) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
};

const GLASS_BTN: React.CSSProperties = {
  background:          "rgba(255,255,255,0.055)",
  backdropFilter:      "blur(12px)",
  WebkitBackdropFilter:"blur(12px)",
  border:              "1px solid rgba(255,255,255,0.09)",
  boxShadow:           "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.3)",
};

export default function PlayerModal({
  media,
  onClose,
  initialSeason  = 1,
  initialEpisode = 1,
}: PlayerModalProps) {
  const isTV       = media.type === "tv";
  const maxSeasons = media.seasons ?? 1;

  const [season,  setSeason]  = useState(initialSeason);
  const [step,    setStep]    = useState<"season" | "episode">("season");

  const { push: pushToCloud } = useCloudSync();
  const openedMovieRef = useRef(false);

  /** Mark progress complete + sync, for either a movie or a specific episode */
  const markWatchedAndSync = (opts?: { season?: number; episode?: number }) => {
    saveProgress(media.id, 100, {
      season:  isTV ? opts?.season  : undefined,
      episode: isTV ? opts?.episode : undefined,
    });
    window.dispatchEvent(new Event("energytv:changed"));
    pushToCloud();
  };

  // Movies: no modal — open immediately in a new tab, mark watched, close.
  useEffect(() => {
    if (!isTV && !openedMovieRef.current) {
      openedMovieRef.current = true;
      window.open(SOURCE.movie(media.tmdbId), "_blank", "noopener");
      markWatchedAndSync();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTV]);

  if (!isTV) return null;

  const handleClose = () => onClose();

  const openEpisode = (ep: number) => {
    const url = SOURCE.tv(media.tmdbId, season, ep);
    window.open(url, "_blank", "noopener");
    markWatchedAndSync({ season, episode: ep });
    onClose();
  };

  const allSeasons = Array.from({ length: maxSeasons }, (_, i) => i + 1);
  const localEps   = (media.episodes ?? []).filter((e) => e.season === season);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
      style={{
        background:          "rgba(2,3,6,0.88)",
        backdropFilter:      "blur(32px) saturate(180%)",
        WebkitBackdropFilter:"blur(32px) saturate(180%)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative w-full max-w-4xl rounded-3xl overflow-hidden"
        style={{
          background:          "rgba(6,8,13,0.82)",
          backdropFilter:      "blur(48px) saturate(200%)",
          WebkitBackdropFilter:"blur(48px) saturate(200%)",
          border:              "1px solid rgba(255,255,255,0.09)",
          boxShadow:
            "inset 0 1.5px 0 rgba(255,255,255,0.1), 0 30px 90px rgba(0,0,0,0.8), 0 0 0 1px rgba(57,255,20,0.06)",
        }}
      >
        {/* Specular top edge */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.12) 35%,rgba(57,255,20,0.12) 65%,transparent)" }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.055)" }}
        >
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="p-1.5 rounded-xl transition-all hover:scale-105" style={GLASS_BTN}>
              <X className="w-4 h-4 text-white/70" />
            </button>
            <p className="text-sm font-bold text-foreground line-clamp-1 leading-none">{media.title}</p>
          </div>
          <button
            onClick={() => window.open(SOURCE.tv(media.tmdbId, season, initialEpisode), "_blank", "noopener")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/60 transition-all hover:text-white/90"
            style={GLASS_BTN}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Tab
          </button>
        </div>

        {/* ── Season picker ─────────────────────────────────── */}
        {step === "season" && (
          <div className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-4">Select Season</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
              {allSeasons.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSeason(s); setStep("episode"); }}
                  className="py-3.5 rounded-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                  style={
                    s === season
                      ? { background: "linear-gradient(135deg,hsl(112,100%,54%),hsl(112,100%,38%))", color: "#000", boxShadow: "0 0 18px rgba(57,255,20,0.4)", border: "none" }
                      : { ...GLASS_BTN, color: "rgba(255,255,255,0.55)" }
                  }
                >S{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── Episode picker ───────────────────────────────── */}
        {step === "episode" && (
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep("season")} className="p-1.5 rounded-xl transition-all" style={GLASS_BTN}>
                <ChevronLeft className="w-4 h-4 text-white/60" />
              </button>
              <p className="text-sm font-bold text-foreground">Season {season}</p>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto hide-scrollbar">
              {(localEps.length > 0
                ? localEps.map((ep) => ({ num: ep.episode, title: ep.title, dur: ep.duration }))
                : Array.from({ length: 12 }, (_, i) => ({ num: i + 1, title: `Episode ${i + 1}`, dur: "" }))
              ).map((ep) => (
                <button
                  key={ep.num}
                  onClick={() => openEpisode(ep.num)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all group/ep"
                  style={{
                    ...GLASS_BTN,
                    background:  "rgba(255,255,255,0.03)",
                    borderColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
                  >{ep.num}</div>
                  <p className="flex-1 text-xs font-semibold text-foreground/80 line-clamp-1">{ep.title}</p>
                  {ep.dur && <span className="text-[10px] text-muted-foreground/40 shrink-0">{ep.dur}</span>}
                  <Play className="w-4 h-4 shrink-0 opacity-0 group-hover/ep:opacity-100 transition-opacity" style={{ color: "hsl(112,100%,54%)" }} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}>
              <Tv className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <span className="text-xs text-muted-foreground/40">Pick an episode to open it in a new tab</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
