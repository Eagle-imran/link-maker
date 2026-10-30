export type SavedLink = {
  code: string;
  shortUrl: string;
  statsUrl: string;
  target: string;
  createdAt: string;
};

const STORAGE_KEY = "linkmaker:links";

export function loadSaved(): SavedLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSaved(list: SavedLink[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {}
}
