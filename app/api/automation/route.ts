import { NextResponse } from "next/server";
export const maxDuration = 300;
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

async function runRoute(path: string) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      cache: "no-store",
    });

    const text = await response.text();

    let data: unknown = text;

    try {
      data = JSON.parse(text);
    } catch {
      // JSON deÄŸilse metin olarak bÄ±rak
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

export async function GET() {
  const startedAt = Date.now();

  const results = [];

  // 1. GÃ¼nlÃ¼k maÃ§lar + skorlar
  results.push(
    await runRoute("/api/football-sync")
  );

  // 2. MaÃ§ olaylarÄ±
  results.push(
    await runRoute("/api/football-events-sync")
  );

  // 3. Ä°lk 11 + yedekler
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

