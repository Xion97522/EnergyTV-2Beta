import { useQuery } from "@tanstack/react-query";
import {
  tmdb, normalizeMovie, normalizeShow, normalizeMedia, normalizeDetail,
  type NormalizedDetail, type TMDBMovie, type TMDBShow, type TMDBMedia,
} from "@/lib/tmdb";
import { movies, tvShows, trending as staticTrending, allMedia, type Media } from "@/data/movies";

const hasKey = () => !!import.meta.env.VITE_TMDB_API_KEY;

const STALE = 5 * 60 * 1000;

function useQ<T>(key: unknown[], fn: () => Promise<T>, fallback?: T, enabled = true) {
  return useQuery<T>({
    queryKey: key,
    queryFn: fn,
    enabled: enabled && hasKey(),
    staleTime: STALE,
    retry: 1,
    placeholderData: fallback as T,
  });
}

export function useTrending() {
  return useQ<Media[]>(
    ["trending"],
    async () => {
      const d = await tmdb.trending();
      return d.results
        .filter((m) => m.poster_path && m.backdrop_path)
        .slice(0, 10)
        .map(normalizeMedia);
    },
    staticTrending
  );
}

export function usePopularMovies(page = 1) {
  return useQ<Media[]>(
    ["popularMovies", page],
    async () => (await tmdb.popularMovies(page)).results.filter((m) => m.poster_path).map(normalizeMovie),
    movies
  );
}

export function useTopRatedMovies(page = 1) {
  return useQ<Media[]>(
    ["topRatedMovies", page],
    async () => (await tmdb.topRatedMovies(page)).results.filter((m) => m.poster_path).map(normalizeMovie),
    movies.slice().sort((a, b) => b.rating - a.rating)
  );
}

export function useNowPlaying() {
  return useQ<Media[]>(
    ["nowPlaying"],
    async () => (await tmdb.nowPlaying()).results.filter((m) => m.poster_path).map(normalizeMovie),
    movies.slice(0, 6)
  );
}

export function useUpcoming() {
  return useQ<Media[]>(
    ["upcoming"],
    async () => (await tmdb.upcomingMovies()).results.filter((m) => m.poster_path).map(normalizeMovie),
    movies.slice(0, 6)
  );
}

export function usePopularTV(page = 1) {
  return useQ<Media[]>(
    ["popularTV", page],
    async () => (await tmdb.popularTV(page)).results.filter((m) => m.poster_path).map(normalizeShow),
    tvShows
  );
}

export function useTopRatedTV(page = 1) {
  return useQ<Media[]>(
    ["topRatedTV", page],
    async () => (await tmdb.topRatedTV(page)).results.filter((m) => m.poster_path).map(normalizeShow),
    tvShows.slice().sort((a, b) => b.rating - a.rating)
  );
}

export function useAiringTV() {
  return useQ<Media[]>(
    ["airingTV"],
    async () => (await tmdb.airingTV()).results.filter((m) => m.poster_path).map(normalizeShow),
    tvShows.slice(0, 6)
  );
}

export function useMediaDetail(type: "movie" | "tv", id: number) {
  return useQ<NormalizedDetail | null>(
    ["detail", type, id],
    async () => {
      const d = type === "movie" ? await tmdb.movieDetail(id) : await tmdb.tvDetail(id);
      return normalizeDetail(d, type);
    },
    null,
    id > 0
  );
}

export function useSeasonDetail(tvId: number, season: number) {
  return useQ(
    ["season", tvId, season],
    () => tmdb.seasonDetail(tvId, season),
    undefined,
    tvId > 0 && season > 0
  );
}

export function useVideos(type: "movie" | "tv", id: number) {
  return useQuery({
    queryKey: ["videos", type, id],
    queryFn: async () => {
      const d = await tmdb.videos(type, id);
      return d.results;
    },
    enabled: id > 0 && hasKey(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useSimilar(type: "movie" | "tv", id: number) {
  return useQuery<Media[]>({
    queryKey: ["similar", type, id],
    queryFn: async () => {
      const d = await tmdb.recommendations(type, id);
      return d.results
        .filter((m) => m.poster_path)
        .slice(0, 12)
        .map(normalizeMedia);
    },
    enabled: id > 0 && hasKey(),
    staleTime: STALE,
    retry: 1,
  });
}

export function useSearch(query: string, filter: "all" | "movie" | "tv" = "all") {
  return useQuery<Media[]>({
    queryKey: ["search", query, filter],
    queryFn: async () => {
      if (!query.trim()) return [];
      if (filter === "movie") {
        return (await tmdb.searchMovies(query)).results.filter((m) => m.poster_path).map(normalizeMovie);
      }
      if (filter === "tv") {
        return (await tmdb.searchTV(query)).results.filter((m: TMDBShow) => m.poster_path).map(normalizeShow);
      }
      return (await tmdb.searchMulti(query)).results
        .filter((m: TMDBMedia) => m.poster_path && (m.media_type === "movie" || m.media_type === "tv"))
        .map(normalizeMedia);
    },
    enabled: query.trim().length >= 2,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export { hasKey };
