/**
 * PlayerModal.tsx  (updated — tracks real watch progress)
 * ────────────────────────────────────────────────────────────────────────────
 * Changes from original:
 *  + Imports saveProgress from watchlist
 *  + Tracks elapsed time with setInterval (simulated, since embed iframes
 *    can't report currentTime cross-origin)
 *  + On unmount / close saves the progress entry and fires energytv:changed
 *    so the cloud sync hook picks it up
 *
 * Progress simulation:
 *   We can't read playback position from the third-party iframe.
 *   So we start a timer when the player loads and increment progress by
 *   ~1% per estimated minute of content (defaulting to 90-min movies /
 *   42-min episodes).  This gives a reasonable "how far did I get" bar.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Play, ChevronLeft, ExternalLink, Tv, Layers,
  AlertTriangle, RefreshCw, Loader2, Cloud,
} from "lucide-react";
import { Media } from "@/data/movies";
import { saveProgress, getProgress } from "@/data/watchlist";
import { useCloudSync } from "@/hooks/useCloudSync";

interface PlayerModalProps {
  media:          Media;
  onClose:        () => void;
  initialSeason?: number;
  initialEpisode?: number;
}

/* ── Embed sources ─────────────────────────────────────────────────── */
const SOURCES = [
  {
    id:    "vidsrc",
    label: "VidSrc",
    movie: (id: number) => `https://vidsrc.to/embed/movie/${id}`,
    tv:    (id: number, s: number, e: number) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    id:    "vidlink",
    label: "VidLink",
    movie: (id: number) => `https://vidlink.pro/movie/${id}`,
    tv:    (id: number, s: number, e: number) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },
  {
    id:    "embedsu",
    label: "Embed.su",
    movie: (id: number) => `https://embed.su/embed/movie/${id}`,
    tv:    (id: number, s: number, e: number) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    id:    "autoembed",
    label: "AutoEmbed",
    movie: (id: number) => `https://autoembed.co/movie/tmdb/${id}`,
    tv:    (id: number, s: number, e: number) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`,
  },
  {
    id:    "2embed",
    label: "2Embed",
    movie: (id: number) => `https://www.2embed.cc/embed/${id}`,
    tv:    (id: number, s: number, e: number) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
  },
  {
    id:    "multiembed",
    label: "MultiEmbed",
    movie: (id: number) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    tv:    (id: number, s: number, e: number) =>
      `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },
] as const;

const GLASS_BTN: React.CSSProperties = {
  background:          "rgba(255,255,255,0.055)",
  backdropFilter:      "blur(12px)",
  WebkitBackdropFilter:"blur(12px)",
  border:              "1px solid rgba(255,255,255,0.09)",
  boxShadow:           "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.3)",
};

/** Estimated duration in minutes for progress simulation */
function estimatedMinutes(media: Media): number {
  if (media.runtime) return media.runtime;
  return media.type === "tv" ? 42 : 90;
}

export default function PlayerModal({
  media,
  onClose,
  initialSeason  = 1,
  initialEpisode = 1,
}: PlayerModalProps) {
  const isTV       = media.type === "tv";
  const maxSeasons = media.seasons ?? 1;

  const [sourceIdx, setSourceIdx] = useState(0);
  const [season,    setSeason]    = useState(initialSeason);
  const [episode,   setEpisode]   = useState(initialEpisode);
  const [step,      setStep]      = useState<"season" | "episode" | "player">(
    isTV ? "season" : "player"
  );
  const [loading,   setLoading]   = useState(true);
  const [timedOut,  setTimedOut]  = useState(false);

  // Progress tracking
  const progressRef    = useRef<number>(0);
  const playTimerRef   = useRef<ReturnType<typeof setInterval>>();
  const iframeKey      = useRef(0);
  const timeoutRef     = useRef<ReturnType<typeof setTimeout>>();

  const { push: pushToCloud } = useCloudSync();

  // Restore previous progress on open
  useEffect(() => {
    const prev = getProgress(media.id);
    if (prev) progressRef.current = prev.percent;
  }, [media.id]);

  // Start/stop the progress simulation timer
  const startProgressTimer = useCallback(() => {
    clearInterval(playTimerRef.current);
    const durMins    = estimatedMinutes(media);
    // 1% per (duration / 100) minutes → completes in roughly one duration
    const tickMs     = (durMins * 60 * 1000) / 100;
    playTimerRef.current = setInterval(() => {
      progressRef.current = Math.min(99, progressRef.current + 1);
    }, tickMs);
  }, [media]);

  const stopProgressTimer = useCallback(() => {
    clearInterval(playTimerRef.current);
  }, []);

  // Save progress + push to cloud on close
  const handleClose = useCallback(() => {
    stopProgressTimer();
    if (progressRef.current > 0) {
      saveProgress(media.id, progressRef.current, {
        season:  isTV ? season  : undefined,
        episode: isTV ? episode : undefined,
      });
      window.dispatchEvent(new Event("energytv:changed"));
      pushToCloud();
    }
    onClose();
  }, [stopProgressTimer, media.id, isTV, season, episode, pushToCloud, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressTimer();
      clearTimeout(timeoutRef.current);
    };
  }, [stopProgressTimer]);

  const source   = SOURCES[sourceIdx];
  const embedUrl = isTV
    ? source.tv(media.tmdbId, season, episode)
    : source.movie(media.tmdbId);

  const resetPlayer = useCallback(() => {
    setLoading(true);
    setTimedOut(false);
    iframeKey.current += 1;
    stopProgressTimer();
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setTimedOut(true), 12000);
  }, [stopProgressTimer]);

  useEffect(() => {
    if (step === "player") resetPlayer();
    return () => clearTimeout(timeoutRef.current);
  }, [step, sourceIdx, season, episode, resetPlayer]);

  const handleIframeLoad = useCallback(() => {
    setLoading(false);
    clearTimeout(timeoutRef.current);
    startProgressTimer();
  }, [startProgressTimer]);

  const nextSource = () => {
    const next = (sourceIdx + 1) % SOURCES.length;
    setSourceIdx(next);
  };

  const openExternal = () => window.open(embedUrl, "_blank", "noopener");

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
            <div>
              <p className="text-sm font-bold text-foreground line-clamp-1 leading-none">{media.title}</p>
              {isTV && step === "player" && (
                <p className="text-xs text-muted-foreground mt-0.5">Season {season} · Episode {episode}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isTV && step === "player" && (
              <button
                onClick={() => setStep("episode")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/60 transition-all"
                style={GLASS_BTN}
              >
                <Tv className="w-3.5 h-3.5" /> Episodes
              </button>
            )}
            <button
              onClick={openExternal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/60 transition-all hover:text-white/90"
              style={GLASS_BTN}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Tab
            </button>
          </div>
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
                  onClick={() => { setEpisode(ep.num); setStep("player"); }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all group/ep"
                  style={{
                    ...GLASS_BTN,
                    background:   episode === ep.num ? "rgba(57,255,20,0.08)"  : "rgba(255,255,255,0.03)",
                    borderColor:  episode === ep.num ? "rgba(57,255,20,0.2)"   : "rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                    style={{
                      background: episode === ep.num ? "rgba(57,255,20,0.2)" : "rgba(255,255,255,0.06)",
                      color:      episode === ep.num ? "hsl(112,100%,54%)"   : "rgba(255,255,255,0.45)",
                    }}
                  >{ep.num}</div>
                  <p className="flex-1 text-xs font-semibold text-foreground/80 line-clamp-1">{ep.title}</p>
                  {ep.dur && <span className="text-[10px] text-muted-foreground/40 shrink-0">{ep.dur}</span>}
                  <Play className="w-4 h-4 shrink-0 opacity-0 group-hover/ep:opacity-100 transition-opacity" style={{ color: "hsl(112,100%,54%)" }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Player ───────────────────────────────────────── */}
        {step === "player" && (
          <>
            <div className="relative" style={{ aspectRatio: "16/9", background: "#000" }}>
              {/* Loading overlay */}
              {loading && !timedOut && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
                  style={{ background: "rgba(4,5,9,0.92)" }}
                >
                  <div className="relative w-12 h-12">
                    <Loader2 className="w-12 h-12 animate-spin" style={{ color: "hsl(112,100%,54%)" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-5 h-5 fill-current" style={{ color: "hsl(112,100%,54%)" }} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/60">
                    Loading <span className="font-semibold text-foreground/60">{source.label}</span>…
                  </p>
                </div>
              )}

              {/* Timed-out / blocked banner */}
              {timedOut && loading && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 p-6"
                  style={{ background: "rgba(4,5,9,0.95)" }}
                >
                  <AlertTriangle className="w-10 h-10" style={{ color: "hsl(112,100%,54%)" }} />
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground/80">{source.label} might be blocked</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">Try a different source or open in a new tab</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={nextSource}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black transition-all hover:scale-105"
                      style={{ background: "linear-gradient(135deg,hsl(112,100%,54%),hsl(112,100%,40%))", boxShadow: "0 0 16px rgba(57,255,20,0.4)" }}
                    >
                      <RefreshCw className="w-4 h-4" /> Try Next Source
                    </button>
                    <button
                      onClick={openExternal}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white/70 transition-all"
                      style={GLASS_BTN}
                    >
                      <ExternalLink className="w-4 h-4" /> Open in Tab
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/30">
                    Source {sourceIdx + 1} of {SOURCES.length} · {source.label}
                  </p>
                </div>
              )}

              <iframe
                key={iframeKey.current}
                src={embedUrl}
                className="w-full h-full"
                style={{ border: "none" }}
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-fullscreen allow-presentation allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                referrerPolicy="origin-when-cross-origin"
                title={media.title}
                onLoad={handleIframeLoad}
              />
            </div>

            {/* Source switcher bar */}
            <div
              className="flex items-center gap-2 px-4 py-3 flex-wrap"
              style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}
            >
              <Layers className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <span className="text-xs text-muted-foreground/40 mr-auto">Source</span>
              <div className="flex flex-wrap gap-1.5">
                {SOURCES.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setSourceIdx(i)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={
                      i === sourceIdx
                        ? { background: "linear-gradient(135deg,hsl(112,100%,54%),hsl(112,100%,38%))", color: "#000", boxShadow: "0 0 10px rgba(57,255,20,0.35)", border: "none" }
                        : { ...GLASS_BTN, color: "rgba(255,255,255,0.45)" }
                    }
                  >{s.label}</button>
                ))}
              </div>
              {isTV && (
                <button
                  onClick={() => setStep("episode")}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white/45 ml-1"
                  style={GLASS_BTN}
                >
                  <Tv className="w-3 h-3" /> Eps
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
