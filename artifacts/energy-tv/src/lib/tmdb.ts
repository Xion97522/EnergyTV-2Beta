export const IMG = "https://image.tmdb.org/t/p";
const BASE = "https://api.themoviedb.org/3";

export function poster(path: string | null, size = "w500"): string {
  return path ? `${IMG}/${size}${path}` : "";
}
export function backdrop(path: string | null, size = "w1280"): string {
  return path ? `${IMG}/${size}${path}` : "";
}
export function year(d?: string): number {
  return d ? new Date(d).getFullYear() : 0;
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = import.meta.env.VITE_TMDB_API_KEY as string;
  if (!key) throw new Error("VITE_TMDB_API_KEY not set");
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json() as Promise<T>;
}

export interface TMDBMovie {
  id: number; title: string; poster_path: string | null;
  backdrop_path: string | null; vote_average: number;
  release_date: string; overview: string; genre_ids: number[];
  runtime?: number;
}
export interface TMDBShow {
  id: number; name: string; poster_path: string | null;
  backdrop_path: string | null; vote_average: number;
  first_air_date: string; overview: string; genre_ids: number[];
  number_of_seasons?: number;
}
export interface TMDBMedia {
  id: number; title?: string; name?: string;
  poster_path: string | null; backdrop_path: string | null;
  vote_average: number; release_date?: string; first_air_date?: string;
  overview: string; genre_ids: number[]; media_type?: "movie" | "tv";
}
export interface TMDBCastMember {
  id: number; name: string; character: string;
  profile_path: string | null; order: number;
}
export interface TMDBCrewMember {
  id: number; name: string; job: string; department: string; profile_path: string | null;
}
export interface TMDBDetail {
  id: number; title?: string; name?: string;
  poster_path: string | null; backdrop_path: string | null;
  vote_average: number; overview: string;
  release_date?: string; first_air_date?: string;
  genres: { id: number; name: string }[];
  runtime?: number; number_of_seasons?: number;
  credits?: { cast: TMDBCastMember[]; crew: TMDBCrewMember[] };
  seasons?: { season_number: number; episode_count: number; name: string }[];
}
export interface TMDBEpisode {
  id: number; episode_number: number; name: string;
  overview: string; runtime: number | null; air_date: string; still_path: string | null;
}
export interface Page<T> {
  results: T[]; total_pages: number; total_results: number; page: number;
}

export const tmdb = {
  trending:        ()           => get<Page<TMDBMedia>>("/trending/all/week"),
  popularMovies:   (page = 1)  => get<Page<TMDBMovie>>("/movie/popular",    { page: String(page) }),
  topRatedMovies:  (page = 1)  => get<Page<TMDBMovie>>("/movie/top_rated",  { page: String(page) }),
  nowPlaying:      ()           => get<Page<TMDBMovie>>("/movie/now_playing"),
  upcomingMovies:  ()           => get<Page<TMDBMovie>>("/movie/upcoming"),
  popularTV:       (page = 1)  => get<Page<TMDBShow>>("/tv/popular",        { page: String(page) }),
  topRatedTV:      (page = 1)  => get<Page<TMDBShow>>("/tv/top_rated",      { page: String(page) }),
  airingTV:        ()           => get<Page<TMDBShow>>("/tv/on_the_air"),
  movieDetail:     (id: number) => get<TMDBDetail>(`/movie/${id}`,          { append_to_response: "credits" }),
  tvDetail:        (id: number) => get<TMDBDetail>(`/tv/${id}`,             { append_to_response: "credits" }),
  seasonDetail:    (tvId: number, s: number) =>
    get<{ season_number: number; episodes: TMDBEpisode[] }>(`/tv/${tvId}/season/${s}`),
  searchMulti:     (q: string, page = 1) =>
    get<Page<TMDBMedia>>("/search/multi",  { query: q, page: String(page) }),
  searchMovies:    (q: string) => get<Page<TMDBMovie>>("/search/movie",     { query: q }),
  searchTV:        (q: string) => get<Page<TMDBShow>>("/search/tv",         { query: q }),
  videos:          (type: "movie" | "tv", id: number) =>
    get<{ results: { key: string; site: string; type: string; name: string }[] }>(`/${type}/${id}/videos`),
  recommendations: (type: "movie" | "tv", id: number) =>
    get<Page<TMDBMedia>>(`/${type}/${id}/recommendations`),
};

export const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action", 10765: "Sci-Fi", 10764: "Reality", 10768: "War",
};

import type { Media, Episode } from "@/data/movies";

export interface CastMember {
  id: number; name: string; character: string; photo: string;
}

export interface NormalizedDetail extends Omit<Media, "cast"> {
  cast?: string[];
  richCast: CastMember[];
  director?: string;
  realEpisodes?: Episode[];
}

export function normalizeMovie(m: TMDBMovie): Media {
  return {
    id: m.id, tmdbId: m.id, title: m.title,
    poster: poster(m.poster_path),
    backdrop: backdrop(m.backdrop_path),
    year: year(m.release_date),
    rating: Math.round(m.vote_average * 10) / 10,
    type: "movie",
    genres: (m.genre_ids ?? []).map((id) => GENRE_MAP[id]).filter(Boolean),
    overview: m.overview,
    duration: m.runtime ? `${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m` : undefined,
    quality: m.vote_average >= 8 ? "4K" : "HD",
  };
}

export function normalizeShow(m: TMDBShow): Media {
  return {
    id: m.id, tmdbId: m.id, title: m.name,
    poster: poster(m.poster_path),
    backdrop: backdrop(m.backdrop_path),
    year: year(m.first_air_date),
    rating: Math.round(m.vote_average * 10) / 10,
    type: "tv",
    genres: (m.genre_ids ?? []).map((id) => GENRE_MAP[id]).filter(Boolean),
    overview: m.overview,
    seasons: m.number_of_seasons,
    quality: m.vote_average >= 8 ? "4K" : "HD",
  };
}

export function normalizeMedia(m: TMDBMedia): Media {
  if (m.title !== undefined) return normalizeMovie(m as TMDBMovie);
  return normalizeShow(m as TMDBShow);
}

export function normalizeDetail(d: TMDBDetail, type: "movie" | "tv"): NormalizedDetail {
  const richCast: CastMember[] = (d.credits?.cast ?? [])
    .slice(0, 20)
    .map((c) => ({ id: c.id, name: c.name, character: c.character, photo: poster(c.profile_path, "w185") }));
  const director = d.credits?.crew.find((c) => c.job === "Director")?.name
    ?? d.credits?.crew.find((c) => c.department === "Directing")?.name;
  return {
    id: d.id, tmdbId: d.id,
    title: d.title ?? d.name ?? "",
    poster: poster(d.poster_path),
    backdrop: backdrop(d.backdrop_path),
    year: year(type === "movie" ? d.release_date : d.first_air_date),
    rating: Math.round(d.vote_average * 10) / 10,
    type,
    genres: (d.genres ?? []).map((g) => g.name),
    overview: d.overview,
    duration: d.runtime ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m` : undefined,
    seasons: d.number_of_seasons,
    quality: d.vote_average >= 8 ? "4K" : "HD",
    cast: richCast.map((c) => c.name),
    richCast,
    director,
  };
}
