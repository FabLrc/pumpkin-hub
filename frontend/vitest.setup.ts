import "@testing-library/jest-dom/vitest";

// jsdom on Node 25+ provides a broken localStorage (null prototype, missing methods).
// Polyfill with a simple in-memory store.
if (
  typeof localStorage !== "undefined" &&
  typeof localStorage.setItem !== "function"
) {
  const store = new Map<string, string>();
  Object.assign(window, {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      get length() {
        return store.size;
      },
      key: (index: number) => [...store.keys()][index] ?? null,
    },
  });
}
