import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_URL = "https://v3.football.api-sports.io";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase ortam değişkenleri eksik.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET() {
  try {
    const apiKey = process.env.API_FOOTBALL_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "API_FOOTBALL_KEY bulunamadı.",
        },
        { status: 500 }
      );
    }

    const supabase = getServerSupabase();

    const today = new Date().toISOString().slice(0, 10);

    const response = await fetch(
      `${API_URL}/fixtures?date=${today}`,
      {
        method: "GET",
        headers: {
          "x-apisports-key": apiKey,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "API-Football isteği başarısız.",
          details: data,
        },
        { status: response.status }
      );
    }

    const fixtures = data.response ?? [];

    let inserted = 0;
    let updated = 0;
    const errors: unknown[] = [];

    for (const item of fixtures) {
      const fixture = item.fixture;
      const league = item.league;
      const teams = item.teams;
      const goals = item.goals;

      if (!fixture?.id || !teams?.home?.name || !teams?.away?.name) {
        continue;
      }

      const kickoff = fixture.date
        ? new Date(fixture.date).toISOString()
        : null;

      const statusShort = fixture.status?.short ?? "NS";

      const finishedStatuses = [
        "FT",
        "AET",
        "PEN",
      ];

      const liveStatuses = [
        "1H",
        "2H",
        "ET",
        "P",
        "LIVE",
        "HT",
        "BT",
      ];

      const isFinished = finishedStatuses.includes(statusShort);
      const isLive = liveStatuses.includes(statusShort);

      const homeScore =
        typeof goals?.home === "number"
          ? goals.home
          : null;

      const awayScore =
        typeof goals?.away === "number"
          ? goals.away
          : null;

      const payload = {
        api_fixture_id: fixture.id,
        home_team: teams.home.name,
        away_team: teams.away.name,
        kickoff,
        league: league?.name ?? "Bilinmeyen Lig",
        status: isFinished
          ? "FT"
          : isLive
          ? "LIVE"
          : statusShort,
        home_score: homeScore,
        away_score: awayScore,
        home_logo_url: teams.home.logo ?? null,
        away_logo_url: teams.away.logo ?? null,
        match_date: today,
        league_id:
          typeof league?.id === "number"
            ? league.id
            : null,
        home_team_id:
          typeof teams.home.id === "number"
            ? teams.home.id
            : null,
        away_team_id:
          typeof teams.away.id === "number"
            ? teams.away.id
            : null,
        is_live: isLive,
      };

      const { data: existing, error: findError } =
        await supabase
          .from("Matches")
          .select("id")
          .eq("api_fixture_id", fixture.id)
          .maybeSingle();

      if (findError) {
        errors.push({
          fixture_id: fixture.id,
          step: "find",
          error: findError.message,
        });
        continue;
      }

      if (existing?.id) {
        const { error: updateError } =
          await supabase
            .from("Matches")
            .update(payload)
            .eq("id", existing.id);

        if (updateError) {
          errors.push({
            fixture_id: fixture.id,
            step: "update",
            error: updateError.message,
          });
        } else {
          updated++;
        }
      } else {
        const { error: insertError } =
          await supabase
            .from("Matches")
            .insert(payload);

        if (insertError) {
          errors.push({
            fixture_id: fixture.id,
            step: "insert",
            error: insertError.message,
          });
        } else {
          inserted++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      date: today,
      api_fixture_count: fixtures.length,
      inserted,
      updated,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}