const KEY = "prospect-link-clicks";
const DAY_MS = 24 * 60 * 60 * 1000;

export function getClickedLinks(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function markLinkClicked(url: string) {
  const map = getClickedLinks();
  map[url] = Date.now();
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function isRecentlyClicked(
  url: string | null | undefined,
  map: Record<string, number>
): boolean {
  if (!url) return false;
  const t = map[url];
  return !!t && Date.now() - t < DAY_MS;
}
