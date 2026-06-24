import { useEffect, useRef } from "react";
import { X, Tv } from "lucide-react";
import { Media } from "@/data/movies";
import { saveProgress } from "@/data/watchlist";
import { useCloudSync } from "@/hooks/useCloudSync";

interface PlayerModalProps {
  media: Media;
  onClose: () => void;
  initialSeason?: number;
  initialEpisode?: number;
}

export default function PlayerModal({
  media,
  onClose,
  initialSeason,
  initialEpisode,
}: PlayerModalProps) {
  const { push: pushToCloud } = useCloudSync();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isTV = media.type === "tv";

  const getEmbedUrl = () => {
    const tmdbId = media.tmdbId || media.id;
    if (!isTV) {
      return `https://vidlink.pro/embed/movie/${tmdbId}`;
    }
    const season = initialSeason ?? 1;
    const episode = initialEpisode ?? 1;
    return `https://vidlink.pro/embed/tv/${tmdbId}/${season}/${episode}`;
  };

  const markAsWatched = () => {
    saveProgress(media.id, 100, {
      season: isTV ? initialSeason : undefined,
      episode: isTV ? initialEpisode : undefined,
    });
    pushToCloud();
  };

  useEffect(() => {
    markAsWatched(); // Mark as watched when player opens
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-2"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-3 rounded-full bg-black/70 hover:bg-black transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Player Title */}
        <div className="absolute top-4 left-4 z-10 bg-black/70 px-4 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-2">
          <Tv className="w-4 h-4" />
          {media.title}
          {isTV && initialSeason && ` - S${initialSeason} E${initialEpisode}`}
        </div>

        {/* Vidlink Iframe */}
        <iframe
          ref={iframeRef}
          src={getEmbedUrl()}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="no-referrer"
          onLoad={() => console.log("[EnergyTV] Vidlink player loaded")}
        />

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black to-transparent flex items-center justify-center text-xs text-white/60">
          Powered by vidlink.pro • Progress synced via Supabase
        </div>
      </div>
    </div>
  );
}
