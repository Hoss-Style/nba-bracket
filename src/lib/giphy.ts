// Giphy API wrapper — powers the GIF picker in CommunityFeed.
// Requires NEXT_PUBLIC_GIPHY_API_KEY env var. Free tier works.

const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "";
const BASE = "https://api.giphy.com/v1/gifs";

export interface GiphyGif {
  id: string;
  url: string; // fixed_height url — good for chat
  previewUrl: string; // preview webp/gif for the picker grid
  title: string;
  width: number;
  height: number;
}

export function giphyConfigured(): boolean {
  return GIPHY_KEY.length > 0;
}

interface GiphyApiImage {
  url?: string;
  width?: string;
  height?: string;
}
interface GiphyApiItem {
  id: string;
  title?: string;
  images?: {
    fixed_height?: GiphyApiImage;
    fixed_height_small?: GiphyApiImage;
    preview_gif?: GiphyApiImage;
  };
}

function normalize(item: GiphyApiItem): GiphyGif | null {
  const fh = item.images?.fixed_height;
  const prev = item.images?.fixed_height_small || item.images?.preview_gif || fh;
  if (!fh?.url) return null;
  return {
    id: item.id,
    url: fh.url,
    previewUrl: prev?.url || fh.url,
    title: item.title || "",
    width: parseInt(fh.width || "0", 10) || 200,
    height: parseInt(fh.height || "0", 10) || 200,
  };
}

export async function getTrendingGifs(limit = 20): Promise<GiphyGif[]> {
  if (!giphyConfigured()) return [];
  try {
    const res = await fetch(
      `${BASE}/trending?api_key=${GIPHY_KEY}&limit=${limit}&rating=pg-13`
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || [])
      .map(normalize)
      .filter((g: GiphyGif | null): g is GiphyGif => g !== null);
  } catch {
    return [];
  }
}

export async function searchGifs(query: string, limit = 20): Promise<GiphyGif[]> {
  if (!giphyConfigured() || !query.trim()) return [];
  try {
    const res = await fetch(
      `${BASE}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(
        query
      )}&limit=${limit}&rating=pg-13`
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || [])
      .map(normalize)
      .filter((g: GiphyGif | null): g is GiphyGif => g !== null);
  } catch {
    return [];
  }
}

/** Detect giphy.com URLs in free text (media or view links) for auto-conversion. */
const GIPHY_URL_RE = /https?:\/\/(?:media\d?\.|i\.)?giphy\.com\/\S+?\.gif\S*/gi;
export function extractGiphyUrls(text: string): string[] {
  const matches = text.match(GIPHY_URL_RE);
  return matches ? Array.from(new Set(matches)) : [];
}
