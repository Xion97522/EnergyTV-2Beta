const BASE = "https://www.omdbapi.com";

function key() {
  return import.meta.env.VITE_OMDB_API_KEY as string | undefined;
}
export const hasKey = () => !!key();

async function get<T>(params: Record<string, string>): Promise<T> {
  const k = key();
  if (!k) throw new Error("VITE_OMDB_API_KEY not set");
  const url = new URL(BASE);
  url.searchParams.set("apikey", k);
  for (const [prop, val] of Object.entries(params)) url.searchParams.set(prop, val);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OMDB ${res.status}`);
  const data = await res.json() as Record<string, unknown>;
  if (data.Response === "False") throw new Error(String(data.Error ?? "OMDB error"));
  return data as T;
}

export type OmdbType = "movie" | "series" | "episode";

export interface OmdbSearchItem {
  Title: string; Year: string; imdbID: string; Type: OmdbType; Poster: string;
}

export interface OmdbDetail {
  imdbID: string; Title: string; Year: string; Rated: string;
  Released: string; Runtime: string; Genre: string;
  Director: string; Writer: string; Actors: string; Plot: string;
  Language: string; Country: string; Awards: string;
  Poster: string; imdbRating: string; imdbVotes: string;
  Type: OmdbType; totalSeasons: string;
  Response: "True" | "False";
}

export interface OmdbSeason {
  Title: string; Season: string; totalSeasons: string;
  Episodes: { Title: string; Released: string; Episode: string; imdbRating: string; imdbID: string }[];
  Response: "True" | "False";
}

export const omdb = {
  search: (s: string, type?: "movie" | "series", page = 1) =>
    get<{ Search: OmdbSearchItem[]; totalResults: string }>({
      s, type: type ?? "", page: String(page),
    }),
  detail: (imdbId: string) =>
    get<OmdbDetail>({ i: imdbId, plot: "full" }),
  byTitle: (t: string, type?: "movie" | "series", y?: string) =>
    get<OmdbDetail>({ t, type: type ?? "", ...(y ? { y } : {}), plot: "short" }),
  season: (imdbId: string, season: number) =>
    get<OmdbSeason>({ i: imdbId, Season: String(season) }),
};
