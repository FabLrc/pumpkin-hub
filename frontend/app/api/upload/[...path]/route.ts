import http from "node:http";
import { type NextRequest, NextResponse } from "next/server";

// Uses Next.js server-side HTTP to bypass Chrome + Docker Desktop WSL2
// cross-origin large body limitation (ERR_CONNECTION_ABORTED above ~1 MB).
// The browser uploads to the same origin (localhost:3000) which Next.js
// then proxies to the internal Docker network (api-dev:8080).
const BACKEND = process.env.NEXT_INTERNAL_API_URL ?? "http://localhost:8080";
const BACKEND_PARSED = new URL(BACKEND);

type Params = { path: string[] };

/**
 * Validates that every path segment is safe to forward to the upstream API.
 * Rejects empty segments, directory traversal (".."), and segments containing
 * path separators, preventing SSRF path-traversal attacks.
 */
function isValidProxyPath(segments: string[]): boolean {
  return (
    segments.length > 0 &&
    segments.every(
      (segment) =>
        segment.length > 0 &&
        segment !== ".." &&
        segment !== "." &&
        !/[/\\]/.test(segment),
    )
  );
}

/**
 * Low-level HTTP POST proxy.
 *
 * Node.js native `fetch()` throws EPIPE when the upstream server (Axum) closes
 * the TCP connection after sending an early response (e.g. 401) while the body
 * is still being written.  `http.request()` separates the "response" and "error"
 * event streams, so we can capture the response even if the write side fails.
 */
function httpPost(
  path: string,
  body: Buffer,
  headers: Record<string, string>
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (status: number, text: string) => {
      if (!settled) {
        settled = true;
        resolve({ status, text });
      }
    };

    const req = http.request(
      {
        hostname: BACKEND_PARSED.hostname,
        port: Number(BACKEND_PARSED.port) || 80,
        path: `/api/v1/${path}`,
        method: "POST",
        headers: { ...headers, "content-length": String(body.length) },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => { data += chunk; });
        res.on("end", () => settle(res.statusCode ?? 500, data));
        // Partial response on connection reset — return whatever we have.
        res.on("error", () => settle(res.statusCode ?? 502, data));
      }
    );

    // EPIPE / ECONNRESET: Axum responded early and closed the connection while
    // we were still writing the body.  The 'response' callback above already
    // captured the response in that case (it fires before the server RST).
    // Any other error (e.g. ECONNREFUSED) is a real failure.
    req.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EPIPE" || err.code === "ECONNRESET") {
        // Response event fires before close, so `settled` should be true.
        // If not (very unlikely race), surface as 502.
        settle(502, '{"error":"Upstream closed connection unexpectedly"}');
      } else if (!settled) {
        reject(err);
      }
    });

    req.write(body);
    req.end();
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse> {
  const { path } = await params;

  if (!isValidProxyPath(path)) {
    return new NextResponse(JSON.stringify({ error: "Invalid path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cookie = req.headers.get("cookie") ?? "";
  const contentType = req.headers.get("content-type") ?? "";

  const body = Buffer.from(await req.arrayBuffer());
  const { status, text } = await httpPost(path.join("/"), body, {
    cookie,
    "content-type": contentType,
  });

  return new NextResponse(text, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse> {
  const { path } = await params;

  if (!isValidProxyPath(path)) {
    return new NextResponse(JSON.stringify({ error: "Invalid path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { search } = new URL(req.url);
  const cookie = req.headers.get("cookie") ?? "";

  const upstream = await fetch(
    `${BACKEND}/api/v1/${path.join("/")}${search}`,
    { headers: { cookie } }
  );

  const responseBody = await upstream.text();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
