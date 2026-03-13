import { http, HttpResponse } from "msw";

const API_BASE = "http://localhost:8080/api/v1";

export const handlers = [
  http.get(`${API_BASE}/search/suggest`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const limit = Number(url.searchParams.get("limit") ?? "5");

    const suggestions = Array.from({ length: Math.max(0, limit) }, (_, i) => ({
      value: `${q}-suggestion-${i + 1}`,
    }));

    return HttpResponse.json(suggestions);
  }),
];
