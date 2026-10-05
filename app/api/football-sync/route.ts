import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_URL = "https://v3.football.api-sports.io";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

function getTurkeyDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET() {
  try {
    const API_KEY = process.env.API_FOOTBALL_KEY;

    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "API_FOOTBALL_KEY bulunamadı.",
        },
        { status: 500 }
      );
    }

    const turkeyDate = getTurkeyDate();

    const response = await fetch(
      `${API_URL}/fixtures?date=${turkeyDate}`,
      {
        method: "GET",
        headers: {
          "x-apisports-key": API_KEY,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          ok: false,
          error: `API-Football hata verdi: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const fixtures = Array.isArray(data?.response)
      ? data.response
      : [];

    let inserted = 0;
    let updated = 0;

    let leaguesCreated = 0;
    let leaguesUpdated = 0;

    let teamsCreated = 0;
    let teamsUpdated = 0;

    const errors: Array<{
      fixture_id: number | null;
      step: string;
      error: string;
    }> = [];

    const finishedStatuses = new Set([
      "FT",
      "AET",
      "PEN",
    ]);

    const liveStatuses = new Set([
      "1H",
      "2H",
      "ET",
      "P",
      "LIVE",
      "HT",
      "BT",
    ]);

    for (const fixture of fixtures) {
      const fixtureId =
        typeof fixture?.fixture?.id === "number"
          ? fixture.fixture.id
          : null;

      try {
        if (!fixtureId) {
          continue;
        }

        // ---------------------------------------------------------
        // LİG BİLGİLERİ
        // ---------------------------------------------------------

        const leagueId =
          typeof fixture?.league?.id === "number"
            ? fixture.league.id
            : null;

        const leagueName =
          fixture?.league?.name ??
          "Bilinmeyen Lig";

        const leagueCountry =
          fixture?.league?.country ??
          null;

        const leagueLogo =
          fixture?.league?.logo ??
          null;

        const season =
          fixture?.league?.season != null
            ? String(fixture.league.season)
            : null;

        // ---------------------------------------------------------
        // TAKIM BİLGİLERİ
        // ---------------------------------------------------------

        const homeTeamId =
          typeof fixture?.teams?.home?.id === "number"
            ? fixture.teams.home.id
            : null;

        const awayTeamId =
          typeof fixture?.teams?.away?.id === "number"
            ? fixture.teams.away.id
            : null;

        const homeName =
          fixture?.teams?.home?.name ??
          "Ev Sahibi";

        const awayName =
          fixture?.teams?.away?.name ??
          "Deplasman";

        const homeLogo =
          fixture?.teams?.home?.logo ??
          null;

        const awayLogo =
          fixture?.teams?.away?.logo ??
          null;

        // ---------------------------------------------------------
        // MAÇ BİLGİLERİ
        // ---------------------------------------------------------

        const kickoff =
          fixture?.fixture?.date ??
          null;

        const statusShort =
          fixture?.fixture?.status?.short ??
          "";

        const homeScore =
          typeof fixture?.goals?.home === "number"
            ? fixture.goals.home
            : 0;

        const awayScore =
          typeof fixture?.goals?.away === "number"
            ? fixture.goals.away
            : 0;

        const isLive =
          liveStatuses.has(statusShort);

        const isFinished =
          finishedStatuses.has(statusShort);

        // ---------------------------------------------------------
        // CANLI BİLGİLER
        // ---------------------------------------------------------

        const elapsedMinute =
          typeof fixture?.fixture?.status?.elapsed === "number"
            ? fixture.fixture.status.elapsed
            : 0;

        const addedMinute =
          typeof fixture?.fixture?.status?.extra === "number"
            ? fixture.fixture.status.extra
            : 0;

        /*
         * live_period:
         *
         * 1 = ilk yarı / normal maç durumu
         * 2 = ikinci yarı
         * 3 = uzatma
         *
         * DB NOT NULL olduğu için hiçbir durumda null/0 göndermiyoruz.
         */

        const livePeriod =
          statusShort === "2H"
            ? 2
            : statusShort === "ET"
            ? 3
            : 1;

        /*
         * live_seconds şu anda kullanılmıyor.
         * DB CHECK ve NOT NULL yapısına uygun olarak 0 gönderiyoruz.
         */

        const liveSeconds = 0;

        const liveMinute =
          isLive
            ? elapsedMinute
            : 0;

        const addedMinuteValue =
          isLive
            ? addedMinute
            : 0;

        // ---------------------------------------------------------
        // DURUM
        // ---------------------------------------------------------

        let status = statusShort;

        if (isFinished) {
          status = "FT";
        } else if (isLive) {
          status = "LIVE";
        }

        // ---------------------------------------------------------
        // LİG EKLE / GÜNCELLE
        // ---------------------------------------------------------

        let actualLeagueId = leagueId;

        if (leagueId) {
          const {
            data: existingLeague,
            error: leagueSelectError,
          } = await supabase
            .from("leagues")
            .select("id")
            .eq("id", leagueId)
            .maybeSingle();

          if (leagueSelectError) {
            throw new Error(
              `league_select: ${leagueSelectError.message}`
            );
          }

          const leaguePayload = {
            id: leagueId,
            name: leagueName,
            country: leagueCountry,
            logo_url: leagueLogo,
            season,
            is_active: true,
            updated_at: new Date().toISOString(),
          };

          if (existingLeague) {
            const {
              error: leagueUpdateError,
            } = await supabase
              .from("leagues")
              .update(leaguePayload)
              .eq("id", leagueId);

            if (leagueUpdateError) {
              throw new Error(
                `league_update: ${leagueUpdateError.message}`
              );
            }

            leaguesUpdated++;
          } else {
            const {
              error: leagueInsertError,
            } = await supabase
              .from("leagues")
              .insert({
                ...leaguePayload,
                created_at: new Date().toISOString(),
              });

            if (leagueInsertError) {
              throw new Error(
                `league_insert: ${leagueInsertError.message}`
              );
            }

            leaguesCreated++;
          }
        }

        // ---------------------------------------------------------
        // EV SAHİBİ TAKIM EKLE / GÜNCELLE
        // ---------------------------------------------------------

        let actualHomeTeamId = homeTeamId;

        if (homeTeamId) {
          const {
            data: existingHomeTeam,
            error: homeSelectError,
          } = await supabase
            .from("teams")
            .select("id")
            .eq("id", homeTeamId)
            .maybeSingle();

          if (homeSelectError) {
            throw new Error(
              `home_team_select: ${homeSelectError.message}`
            );
          }

          const homeTeamPayload = {
            id: homeTeamId,
            name: homeName,
            short_name: homeName,
            logo_url: homeLogo,
            league_id: actualLeagueId,
            is_active: true,
            updated_at: new Date().toISOString(),
          };

          if (existingHomeTeam) {
            const {
              error: homeUpdateError,
            } = await supabase
              .from("teams")
              .update(homeTeamPayload)
              .eq("id", homeTeamId);

            if (homeUpdateError) {
              throw new Error(
                `home_team_update: ${homeUpdateError.message}`
              );
            }

            teamsUpdated++;
          } else {
            const {
              error: homeInsertError,
            } = await supabase
              .from("teams")
              .insert({
                ...homeTeamPayload,
                created_at: new Date().toISOString(),
              });

            if (homeInsertError) {
              throw new Error(
                `home_team_insert: ${homeInsertError.message}`
              );
            }

            teamsCreated++;
          }
        }

        // ---------------------------------------------------------
        // DEPLASMAN TAKIMI EKLE / GÜNCELLE
        // ---------------------------------------------------------

        let actualAwayTeamId = awayTeamId;

        if (awayTeamId) {
          const {
            data: existingAwayTeam,
            error: awaySelectError,
          } = await supabase
            .from("teams")
            .select("id")
            .eq("id", awayTeamId)
            .maybeSingle();

          if (awaySelectError) {
            throw new Error(
              `away_team_select: ${awaySelectError.message}`
            );
          }

          const awayTeamPayload = {
            id: awayTeamId,
            name: awayName,
            short_name: awayName,
            logo_url: awayLogo,
            league_id: actualLeagueId,
            is_active: true,
            updated_at: new Date().toISOString(),
          };

          if (existingAwayTeam) {
            const {
              error: awayUpdateError,
            } = await supabase
              .from("teams")
              .update(awayTeamPayload)
              .eq("id", awayTeamId);

            if (awayUpdateError) {
              throw new Error(
                `away_team_update: ${awayUpdateError.message}`
              );
            }

            teamsUpdated++;
          } else {
            const {
              error: awayInsertError,
            } = await supabase
              .from("teams")
              .insert({
                ...awayTeamPayload,
                created_at: new Date().toISOString(),
              });

            if (awayInsertError) {
              throw new Error(
                `away_team_insert: ${awayInsertError.message}`
              );
            }

            teamsCreated++;
          }
        }

        // ---------------------------------------------------------
        // MATCH PAYLOAD
        // ---------------------------------------------------------

        const payload = {
          api_fixture_id: fixtureId,

          home_team: homeName,
          away_team: awayName,

          kickoff,

          league: leagueName,

          status,

          home_score: homeScore,
          away_score: awayScore,

          schedule_confirmed: true,

          home_logo_url: homeLogo,
          away_logo_url: awayLogo,

          match_date: turkeyDate,

          league_id: actualLeagueId,
          home_team_id: actualHomeTeamId,
          away_team_id: actualAwayTeamId,

          is_live: isLive,

          /*
           * Bu iki kolon NOT NULL olduğu için
           * canlı değilse 0 gönderiyoruz.
           */
          live_minute: liveMinute,
          added_minute: addedMinuteValue,

          /*
           * live_period NOT NULL olduğu için
           * hiçbir durumda null/0 göndermiyoruz.
           */
          live_period: isLive
            ? livePeriod
            : 1,

          /*
           * Şimdilik gerçek saniye hesabını kullanmıyoruz.
           */
          live_seconds: liveSeconds,

          live_started_at:
            isLive && kickoff
              ? kickoff
              : null,
        };

        // ---------------------------------------------------------
        // MAÇ KONTROL
        // ---------------------------------------------------------

        const {
          data: existingMatch,
          error: matchSelectError,
        } = await supabase
          .from("Matches")
          .select("id")
          .eq("api_fixture_id", fixtureId)
          .maybeSingle();

        if (matchSelectError) {
          throw new Error(
            `match_select: ${matchSelectError.message}`
          );
        }

        // ---------------------------------------------------------
        // MAÇ GÜNCELLE
        // ---------------------------------------------------------

        if (existingMatch) {
          const {
            error: matchUpdateError,
          } = await supabase
            .from("Matches")
            .update(payload)
            .eq("id", existingMatch.id);

          if (matchUpdateError) {
            throw new Error(
              matchUpdateError.message
            );
          }

          updated++;
        }

        // ---------------------------------------------------------
        // MAÇ EKLE
        // ---------------------------------------------------------

        else {
          const {
            error: matchInsertError,
          } = await supabase
            .from("Matches")
            .insert(payload);

          if (matchInsertError) {
            throw new Error(
              matchInsertError.message
            );
          }

          inserted++;
        }
      } catch (error) {
        errors.push({
          fixture_id: fixtureId,
          step: "match_update",
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,

      date: turkeyDate,

      api_fixture_count: fixtures.length,

      inserted,
      updated,

      leagues_created: leaguesCreated,
      leagues_updated: leaguesUpdated,

      teams_created: teamsCreated,
      teams_updated: teamsUpdated,

      error_count: errors.length,

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