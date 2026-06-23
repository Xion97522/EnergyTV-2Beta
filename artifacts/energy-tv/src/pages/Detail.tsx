import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import {
  Play, ArrowLeft, Star, Bookmark, BookmarkCheck,
  Clock, Calendar, Tv, Film, ChevronDown, ChevronUp,
  Youtube, Users, ChevronLeft, ChevronRight,
} from "lucide-react";
import { getMediaById } from "@/data/movies";
import { toggleWatchlist, isInWatchlist, addToHistory } from "@/data/watchlist";
import { IMG } from "@/lib/tmdb";
import MediaCard from "@/components/MediaCard";
import CategoryRow from "@/components/CategoryRow";
import PlayerModal from "@/components/PlayerModal";
import { SkeletonDetail } from "@/components/SkeletonCard";
import { useMediaDetail, useSeasonDetail, useVideos, useSimilar } from "@/hooks/useMedia";
import type { Media } from "@/data/movies";

const GLASS_PANEL: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)",
};

export default function Detail() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const mediaType = (type === "tv" ? "tv" : "movie") as "movie" | "tv";
  const mediaId = parseInt(id);

  const staticMedia = getMediaById(mediaId);
  const detailQ = useMediaDetail(mediaType, mediaId);
  const videosQ = useVideos(mediaType, mediaId);
  const similarQ = useSimilar(mediaType, mediaId);

  const media: Media | null = detailQ.data ?? staticMedia ?? null;

  const [inWatchlist, setInWatchlist] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerEpisode, setPlayerEpisode] = useState<{ season: number; episode: number } | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [castPage, setCastPage] = useState(0);

  const seasonQ = useSeasonDetail(mediaType === "tv" ? mediaId : 0, selectedSeason);

  useEffect(() => {
    if (media) { setInWatchlist(isInWatchlist(media.id)); addToHistory(media.id); window.scrollTo({ top: 0 }); }
  }, [media?.id]);

  if (detailQ.isLoading && !staticMedia) return <SkeletonDetail />;
  if (!media) return (
    <div className="min-h-screen bg-background pt-14 flex items-center justify-center">
      <div className="text-center p-8 rounded-3xl" style={GLASS_PANEL}>
        <p className="text-muted-foreground mb-3">Content not found</p>
        <Link href="/"><button className="text-sm font-medium" style={{ color: "hsl(112,100%,54%)" }}>← Go home</button></Link>
      </div>
    </div>
  );

  const richMedia = detailQ.data;
  const richCast = richMedia?.richCast ?? [];
  const director = richMedia?.director ?? media.director;
  const seasons = media.seasons ? Array.from({ length: media.seasons }, (_, i) => i + 1) : [1];
  const trailer = videosQ.data?.find((v) => v.type === "Trailer" && v.site === "YouTube")
    ?? videosQ.data?.find((v) => v.site === "YouTube");
  const similar = similarQ.data ?? [];

  const tmdbEpisodes = seasonQ.data?.episodes ?? [];
  const localEpisodes = (media.episodes ?? []).filter((e) => e.season === selectedSeason);
  const episodeList = tmdbEpisodes.length > 0
    ? tmdbEpisodes.map((e) => ({ season: selectedSeason, episode: e.episode_number, title: e.name, overview: e.overview, duration: e.runtime ? `${e.runtime}m` : "—", airDate: e.air_date, still: e.still_path ? `${IMG}/w300${e.still_path}` : "" }))
    : localEpisodes.map((e) => ({ ...e, still: "" }));
  const visibleEpisodes = showAllEpisodes ? episodeList : episodeList.slice(0, 5);

  const CAST_PAGE_SIZE = 5;
  const castPages = Math.ceil(richCast.length / CAST_PAGE_SIZE);
  const visibleCast = richCast.slice(castPage * CAST_PAGE_SIZE, (castPage + 1) * CAST_PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero backdrop */}
      <div className="relative h-[52vh] min-h-[320px] max-h-[480px] overflow-hidden">
        {imgError || !media.backdrop ? (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)" }}>
            {mediaType === "tv" ? <Tv className="w-20 h-20 text-muted-foreground/15" /> : <Film className="w-20 h-20 text-muted-foreground/15" />}
          </div>
        ) : (
          <img src={media.backdrop} alt="" className="w-full h-full object-cover" style={{ filter: "brightness(0.45) saturate(1.1)" }} onError={() => setImgError(true)} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, #040508 0%, rgba(4,5,8,0.08) 60%)" }} />

        {/* Back button — glass pill */}
        <div className="absolute top-16 left-4 md:left-6">
          <Link href={`/${mediaType === "movie" ? "movies" : "tv"}`}>
            <button
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-medium text-white/75 transition-all hover:text-white"
              style={{
                background: "rgba(4,5,9,0.5)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </Link>
        </div>

        {/* Poster + title */}
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 flex gap-5 items-end">
          <div className="hidden sm:block shrink-0">
            {media.poster && (
              <img
                src={media.poster}
                alt={media.title}
                className="w-28 rounded-2xl shadow-2xl"
                style={{ border: "1px solid rgba(255,255,255,0.1)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.7)" }}
              />
            )}
          </div>
          <div className="flex-1 pb-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider text-black" style={{ background: "linear-gradient(135deg,hsl(112,100%,54%),hsl(112,100%,40%))", boxShadow: "0 0 8px rgba(57,255,20,0.35)" }}>{mediaType === "tv" ? "Series" : "Movie"}</span>
              {media.quality && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white/55" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)" }}>{media.quality}</span>}
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>{media.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-current" style={{ color: "hsl(112,100%,54%)" }} />
                <span className="text-sm font-bold neon-text" style={{ color: "hsl(112,100%,54%)" }}>{media.rating}</span>
              </div>
              <span className="flex items-center gap-1 text-white/45 text-sm"><Calendar className="w-3.5 h-3.5" />{media.year}</span>
              {media.duration && <span className="flex items-center gap-1 text-white/45 text-sm"><Clock className="w-3.5 h-3.5" />{media.duration}</span>}
              {media.seasons && <span className="flex items-center gap-1 text-white/45 text-sm"><Tv className="w-3.5 h-3.5" />{media.seasons} Season{media.seasons > 1 ? "s" : ""}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 md:px-8 py-6 space-y-6 max-w-4xl">
        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { setPlayerEpisode(null); setShowPlayer(true); }}
            className="btn-neon flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm transition-all"
          >
            <Play className="w-4 h-4 fill-current" /> Play Now
          </button>
          {trailer && (
            <button
              onClick={() => setShowTrailer(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/75 transition-all hover:text-white"
              style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
              }}
            >
              <Youtube className="w-4 h-4 text-red-400" /> Trailer
            </button>
          )}
          <button
            onClick={() => setInWatchlist(toggleWatchlist(media.id))}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/75 transition-all hover:text-white"
            style={{
              background: inWatchlist ? "rgba(57,255,20,0.07)" : "rgba(255,255,255,0.05)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: `1px solid ${inWatchlist ? "rgba(57,255,20,0.2)" : "rgba(255,255,255,0.08)"}`,
              boxShadow: inWatchlist ? "inset 0 1px 0 rgba(57,255,20,0.1)" : "inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
          >
            {inWatchlist
              ? <><BookmarkCheck className="w-4 h-4" style={{ color: "hsl(112,100%,54%)" }} /> Saved</>
              : <><Bookmark className="w-4 h-4" /> Watchlist</>}
          </button>
        </div>

        {/* Genre chips */}
        <div className="flex flex-wrap gap-1.5">
          {media.genres.map((g) => (
            <span key={g} className="glass-pill text-xs px-3 py-1 rounded-full text-white/55 font-medium">{g}</span>
          ))}
        </div>

        {/* Overview */}
        <div className="rounded-2xl p-4" style={GLASS_PANEL}>
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Overview</h3>
          <p className="text-sm text-foreground/70 leading-relaxed">{media.overview}</p>
        </div>

        {/* Director + cast text */}
        {(director || (media.cast && media.cast.length > 0)) && (
          <div className="rounded-2xl p-4 space-y-2.5" style={GLASS_PANEL}>
            {director && (
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-muted-foreground w-16 shrink-0 pt-0.5">Director</span>
                <span className="text-sm text-foreground/80">{director}</span>
              </div>
            )}
            {media.cast && media.cast.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-muted-foreground w-16 shrink-0 pt-0.5 flex items-center gap-1"><Users className="w-3 h-3" />Cast</span>
                <span className="text-sm text-foreground/80">{media.cast.slice(0, 5).join(", ")}</span>
              </div>
            )}
          </div>
        )}

        {/* Rich cast carousel */}
        {richCast.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cast</h3>
              {castPages > 1 && (
                <div className="flex gap-1.5">
                  {(["left","right"] as const).map((dir) => (
                    <button key={dir} onClick={() => setCastPage((p) => dir === "left" ? Math.max(0, p-1) : Math.min(castPages-1, p+1))} disabled={(dir==="left"&&castPage===0)||(dir==="right"&&castPage===castPages-1)} className="w-6 h-6 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all" style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.07)" }}>
                      {dir==="left"?<ChevronLeft className="w-3.5 h-3.5"/>:<ChevronRight className="w-3.5 h-3.5"/>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {visibleCast.map((c) => (
                <div key={c.id} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: "68px" }}>
                  <div
                    className="w-14 h-14 rounded-2xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
                  >
                    {c.photo
                      ? <img src={c.photo} alt={c.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
                      : <div className="w-full h-full flex items-center justify-center text-lg font-black text-muted-foreground/40">{c.name[0]}</div>}
                  </div>
                  <p className="text-[10px] text-center text-foreground/75 leading-tight line-clamp-2 font-semibold">{c.name}</p>
                  <p className="text-[9px] text-center text-muted-foreground/55 line-clamp-1">{c.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Episodes */}
        {mediaType === "tv" && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Episodes</h3>
            {seasons.length > 1 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 hide-scrollbar">
                {seasons.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSelectedSeason(s); setShowAllEpisodes(false); }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0"
                    style={selectedSeason === s ? {
                      background: "linear-gradient(135deg,hsl(112,100%,54%),hsl(112,100%,40%))",
                      color: "#000",
                      boxShadow: "0 0 10px rgba(57,255,20,0.35)",
                    } : {
                      background: "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.5)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    Season {s}
                  </button>
                ))}
              </div>
            )}
            {seasonQ.isLoading ? (
              <div className="space-y-2">{[1,2,3].map((i)=><div key={i} className="h-16 rounded-2xl skeleton-shimmer" style={{background:"rgba(255,255,255,0.03)"}}/>)}</div>
            ) : episodeList.length > 0 ? (
              <div className="space-y-2">
                {visibleEpisodes.map((ep) => (
                  <EpisodeCard
                    key={`${ep.season}-${ep.episode}`}
                    ep={ep}
                    onPlay={() => { setPlayerEpisode({ season: ep.season, episode: ep.episode }); setShowPlayer(true); }}
                  />
                ))}
                {episodeList.length > 5 && (
                  <button
                    onClick={() => setShowAllEpisodes(!showAllEpisodes)}
                    className="w-full py-3 rounded-2xl text-xs font-semibold text-white/45 hover:text-white/70 flex items-center justify-center gap-1.5 transition-all"
                    style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}
                  >
                    {showAllEpisodes ? <><ChevronUp className="w-3.5 h-3.5"/>Show Less</> : <><ChevronDown className="w-3.5 h-3.5"/>Show {episodeList.length - 5} More</>}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/50 py-6 text-center">Episode list unavailable</p>
            )}
          </div>
        )}

        {/* Similar */}
        {similar.length > 0 && (
          <div className="pb-6">
            <CategoryRow title="More Like This" items={similar} cardSize="sm" />
          </div>
        )}
      </div>

      {showPlayer && (
        <PlayerModal
          media={media}
          onClose={() => setShowPlayer(false)}
          initialSeason={playerEpisode?.season}
          initialEpisode={playerEpisode?.episode}
        />
      )}

      {showTrailer && trailer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(2,3,6,0.9)", backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)" }}
          onClick={() => setShowTrailer(false)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl overflow-hidden"
            style={{ border:"1px solid rgba(255,255,255,0.09)", boxShadow:"inset 0 1.5px 0 rgba(255,255,255,0.1), 0 30px 90px rgba(0,0,0,0.8)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ aspectRatio: "16/9" }}>
              <iframe src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`} className="w-full h-full" allow="autoplay; fullscreen" title="Trailer" style={{ border:"none" }} allowFullScreen />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EpisodeCard({ ep, onPlay }: {
  ep: { season: number; episode: number; title: string; overview: string; duration: string; airDate: string; still?: string };
  onPlay: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="rounded-2xl p-3.5 transition-all cursor-pointer hover:border-white/10"
      style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.055)", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.04)" }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        {ep.still ? (
          <img src={ep.still} alt="" className="shrink-0 w-20 h-12 rounded-xl object-cover" style={{ border:"1px solid rgba(255,255,255,0.06)" }} />
        ) : (
          <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white/35" style={{ background:"rgba(255,255,255,0.05)" }}>{ep.episode}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-foreground/85 line-clamp-1">{ep.title}</p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground/50">{ep.duration}</span>
              <button onClick={(e) => { e.stopPropagation(); onPlay(); }} className="p-1.5 rounded-lg transition-all hover:scale-110" style={{ background:"rgba(57,255,20,0.12)", border:"1px solid rgba(57,255,20,0.15)" }}>
                <Play className="w-3 h-3 fill-current" style={{ color:"hsl(112,100%,54%)" }} />
              </button>
            </div>
          </div>
          {expanded && ep.overview && <p className="text-[11px] text-muted-foreground/55 mt-1.5 leading-relaxed">{ep.overview}</p>}
          {ep.airDate && <p className="text-[10px] text-muted-foreground/35 mt-0.5">{ep.airDate}</p>}
        </div>
      </div>
    </div>
  );
}
