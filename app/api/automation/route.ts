import { NextResponse } from "next/server";
export const maxDuration = 300;
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

async function runRoute(path: string) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: "Bearer " + (process.env.CRON_SECRET || "") },
    });

    const text = await response.text();

    let data: unknown = text;

    try {
      data = JSON.parse(text);
    } catch {
      // JSON deÃ„Å¸ilse metin olarak bÃ„Â±rak
    }

    return {
      path,
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      path,
      status: 500,
      ok: false,
      data: {
        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen hata",
      },
    };
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const startedAt = Date.now();

  const results = [];

  // 1. Maçları SportAPI üzerinden senkronize et
  results.push(
    await runRoute("/api/football-sync")
  );
// 2. MaÃƒÂ§ olaylarÃ„Â±
  results.push(
    await runRoute("/api/football-events-sync")
  );

  // 3. Ã„Â°lk 11 + yedekler
  results.push(
    await runRoute("/api/football-lineups-sync")
  );

  return NextResponse.json({
    ok: results.every((result) => result.ok),
    automation: "SKOR DURAGI otomasyon sistemi",
    started_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    results,
  });
}



