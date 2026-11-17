const STORAGE_KEY = 'country-search-history';
const LIMIT = 10;

export function readSearchHistory(): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    if (!Array.isArray(value)) return [];
    return [
      ...new Set(
        value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ].slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function saveSearchHistory(history: string[], query: string): string[] {
  const text = query.trim();
  if (!text) return history;
  const next = [text, ...history.filter((item) => item !== text)].slice(
    0,
    LIMIT,
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Search and in-memory history still work when storage is unavailable.
  }
  return next;
}
