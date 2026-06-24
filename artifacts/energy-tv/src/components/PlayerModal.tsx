import { useEffect } from "react";
import { X, ExternalLink, Tv, Play } from "lucide-react";
import { Media } from "@/data/movies";
import { saveProgress } from "@/data/watchlist";
import { useCloudSync } from "@/hooks/useCloudSync";

interface PlayerModalProps {
  media:          Media;
  onClose:        () => void;
  initialSeason?: number;
  initialEpisode?: number;
}

export default function PlayerModal({
  media,
  onClose,
  initialSeason,
  initialEpisode,
}: PlayerModalProps) {
  const isTV = media.type === "tv";
  const { push: pushToCloud } = useCloudSync();

  const getVidlinkUrl = () => {
    const id = media.tmdbId || media.id;
    if (!isTV) {
      return `https://vidlink.pro/embed/movie/${id}`;
    }
    const season = initialSeason ?? 1;
    const episode = initialEpisode ?? 1;
    return `https://vidlink.pro/embed/tv/${id}/${season}/${episode}`;
  };

  const openInNewTab = () => {
    const url = getVidlinkUrl();
    window.open(url, "_blank", "noopener,noreferrer");
    
    // Mark as watched + sync to Supabase
    saveProgress(media.id, 100, {
      season: isTV ? initialSeason : undefined,
      episode: isTV ? initialEpisode : undefined,
    });
    pushToCloud();
    
    onClose();
  };

  // Auto open on mount (for movies and direct episode clicks)
  useEffect(() => {
    openInNewTab();
  }, []);

  // For TV shows when season/episode picker is needed
  if (isTV && initialEpisode === undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
        <div className="bg-zinc-950 rounded-3xl p-8 max-w-md w-full text-center">
          <Tv className="w-16 h-16 mx-auto mb-6 text-green-400" />
          <h2 className="text-2xl font-bold mb-2">{media.title}</h2>
          <p className="text-zinc-400 mb-8">Pick season & episode to open in new tab</p>
          
          <button
            onClick={openInNewTab}
            className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-black font-bold text-lg flex items-center justify-center gap-3"
          >
            <Play className="w-6 h-6" /> Open Vidlink in New Tab
          </button>

          <button
            onClick={onClose}
            className="mt-4 text-zinc-500 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return null; // Auto-closes after opening tab
}
