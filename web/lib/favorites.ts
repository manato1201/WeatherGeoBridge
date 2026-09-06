// お気に入り地点(localStorage、ブラウザごとに保存)。

export interface FavoriteLocation {
  name: string;
  lat: number;
  lon: number;
}

const STORAGE_KEY = "weathergeobridge:favorites";

export function loadFavorites(): FavoriteLocation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is FavoriteLocation =>
        typeof f?.name === "string" &&
        typeof f?.lat === "number" &&
        typeof f?.lon === "number",
    );
  } catch {
    return [];
  }
}

function save(favorites: FavoriteLocation[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // localStorageが使えない環境(プライベートモード等)では黙って諦める。
  }
}

// 「同じ地点」かどうかは名前ではなく座標で判定する。名前は表示用の
// ラベルに過ぎず、既定の名前(緯度経度の丸め表示)が偶然一致しただけの
// 別地点を、名前一致とみなして上書きしてしまう不具合を避けるため。
function isSameLocation(a: FavoriteLocation, b: FavoriteLocation): boolean {
  return Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lon - b.lon) < 1e-4;
}

export function addFavorite(favorite: FavoriteLocation): FavoriteLocation[] {
  const current = loadFavorites();
  const next = [
    ...current.filter((f) => !isSameLocation(f, favorite)),
    favorite,
  ];
  save(next);
  return next;
}

export function removeFavorite(name: string): FavoriteLocation[] {
  const next = loadFavorites().filter((f) => f.name !== name);
  save(next);
  return next;
}
