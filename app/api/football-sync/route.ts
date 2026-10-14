import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_URL = "https://sportapi.ai/api";

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
    const API_KEY = process.env.SPORTAPI_API_KEY;

    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "API_FOOTBALL_KEY bulunamadÄ±.",
        },
        { status: 500 }
      );
    }

    const turkeyDate = getTurkeyDate();

    const response = await fetch(
      `${API_URL}/fixtures/date/${turkeyDate}`,
      {
        method: "GET",
        headers: {
          "X-Api-Key": API_KEY,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          ok: false,
          error: `SportAPI hata verdi: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const sportApiFixtures: any[] = Array.isArray(data?.fixtures) ? data.fixtures : Array.isArray(data?.data) ? data.data : [];

    const fixtures = sportApiFixtures.map((f: any) => {
      const rawStatus = String(f?.status ?? "").toUpperCase();
      const statusShort = rawStatus === "SCHEDULED" ? "NS" : rawStatus;
      const minuteText = String(f?.minute ?? "");
      const elapsed = Number.parseInt(minuteText.match(/\d+/)?.[0] ?? "0", 10);

      return {
        fixture: {
          id: f?.id,
          date: f?.datetime ?? (f?.date ? `${f.date}T00:00:00` : null),
          status: { short: statusShort, elapsed: Number.isFinite(elapsed) ? elapsed : 0, extra: 0 },
        },
        league: {
          id: typeof f?.league_id === "number" ? f.league_id : null,
          name: f?.league_name ?? "Bilinmeyen Lig",
          country: f?.league_zone ?? f?.league_geo ?? null,
          logo: null,
          season: f?.date ? String(f.date).slice(0, 4) : null,
        },
        teams: {
          home: {
            id: typeof f?.home_id === "number" ? f.home_id : null,
            name: f?.home_team ?? "Ev Sahibi",
            logo: f?.home_logo || null,
          },
          away: {
            id: typeof f?.away_id === "number" ? f.away_id : null,
            name: f?.away_team ?? "Deplasman",
            logo: f?.away_logo || null,
          },
        },
        goals: {
          home: typeof f?.home_score === "number" ? f.home_score : 0,
          away: typeof f?.away_score === "number" ? f.away_score : 0,
        },
      };
    });

    const normalizeLeagueText = (value: unknown) =>
      String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const legacyAllowedFixtures = fixtures.filter((fixture: any) => {
      const name = normalizeLeagueText(fixture?.league?.name);
      const country = normalizeLeagueText(fixture?.league?.country);

      if (
        name.includes("uefa champions league") ||
        name.includes("uefa europa league") ||
        name.includes("uefa europa conference league") ||
        name.includes("uefa conference league")
      ) return true;

      const isTurkey = country.includes("turkey") || country.includes("turkiye");
      if (isTurkey && (
        /^(trendyol )?super lig$/.test(name) ||
        /^(trendyol )?(tff )?1 lig$/.test(name)
      )) return true;

      if (country.includes("germany") && name === "bundesliga") return true;
      if (country.includes("france") && name === "ligue 1") return true;

      if (country.includes("spain") &&
        (name === "laliga" || name === "la liga" || name === "laliga ea sports")) return true;

      if (country.includes("england") && name === "premier league") return true;

      if ((country.includes("netherlands") || country.includes("holland")) &&
        name === "eredivisie") return true;

      if (country.includes("portugal") &&
        (name === "primeira liga" ||
         name === "liga portugal" ||
         name === "liga portugal betclic")) return true;

      return false;
    });
    const { data: leagueSettings, error: leagueSettingsError } = await supabase
      .from("sportapi_league_settings")
      .select("league_name, is_enabled");

    const hasLeagueSettings =
      !leagueSettingsError &&
      Array.isArray(leagueSettings) &&
      leagueSettings.length > 0;

    const enabledLeagueNames = new Set(
      (leagueSettings ?? [])
        .filter((row: any) => row.is_enabled)
        .map((row: any) => normalizeLeagueText(row.league_name))
        .filter(Boolean)
    );

    const allowedFixtures = hasLeagueSettings
      ? fixtures.filter((fixture: any) => {
          const name = normalizeLeagueText(fixture?.league?.name);
          return enabledLeagueNames.has(name);
        })
      : legacyAllowedFixtures;
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

    for (const fixture of allowedFixtures) {
      const fixtureId =
        typeof fixture?.fixture?.id === "number"
          ? fixture.fixture.id
          : null;

      try {
        if (!fixtureId) {
          continue;
        }

        // ---------------------------------------------------------
        // LÄ°G BÄ°LGÄ°LERÄ°
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
        // TAKIM BÄ°LGÄ°LERÄ°
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
        // MAÃ‡ BÄ°LGÄ°LERÄ°
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
        // CANLI BÄ°LGÄ°LER
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
         * 1 = ilk yarÄ± / normal maÃ§ durumu
         * 2 = ikinci yarÄ±
         * 3 = uzatma
         *
         * DB NOT NULL olduÄŸu iÃ§in hiÃ§bir durumda null/0 gÃ¶ndermiyoruz.
         */

        const livePeriod =
          statusShort === "2H"
            ? 2
            : statusShort === "ET"
            ? 3
            : 1;

        /*
         * live_seconds ÅŸu anda kullanÄ±lmÄ±yor.
         * DB CHECK ve NOT NULL yapÄ±sÄ±na uygun olarak 0 gÃ¶nderiyoruz.
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
          status = "finished";
        } else if (statusShort === "HT") {
          status = "halftime";
        } else if (isLive) {
          status = "live";
        } else if (["NS", "TBD", "PRE", "SCHEDULED"].includes(statusShort)) {
          status = "scheduled";
        }

        // ---------------------------------------------------------
        // LÄ°G EKLE / GÃœNCELLE
        // ---------------------------------------------------------

        let actualLeagueId = leagueId;

        if (leagueId) {
          const {
            data: existingLeague,
            error: leagueSelectError,
          } = await supabase
            .from("leagues")
            .select("id,logo_url")
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
            logo_url: (typeof leagueLogo === "string" && /^https?:\/\//i.test(leagueLogo)) ? leagueLogo : (existingLeague?.logo_url ?? null),
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
        // EV SAHÄ°BÄ° TAKIM EKLE / GÃœNCELLE
        // ---------------------------------------------------------

        let actualHomeTeamId = homeTeamId;

        let resolvedHomeLogo = (typeof homeLogo === "string" && /^https?:\/\//i.test(homeLogo)) ? homeLogo : null;
        let resolvedAwayLogo = (typeof awayLogo === "string" && /^https?:\/\//i.test(awayLogo)) ? awayLogo : null;

        if (homeTeamId) {
          const {
            data: existingHomeTeam,
            error: homeSelectError,
          } = await supabase
            .from("teams")
            .select("id,logo_url")
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
            logo_url: (typeof homeLogo === "string" && /^https?:\/\//i.test(homeLogo)) ? homeLogo : (existingHomeTeam?.logo_url ?? null),
            league_id: actualLeagueId,
            is_active: true,
            updated_at: new Date().toISOString(),
          };
          resolvedHomeLogo = (typeof homeLogo === "string" && /^https?:\/\//i.test(homeLogo)) ? homeLogo : (typeof homeLogo === "string" && /^espn-(\d+)\.png$/i.test(homeLogo) ? `https://a.espncdn.com/i/teamlogos/soccer/500/${homeLogo.match(/^espn-(\d+)\.png$/i)?.[1]}.png` : (homeTeamPayload.logo_url ?? (homeTeamId ? `/api/team-logo/${homeTeamId}/` : null)));

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
        // DEPLASMAN TAKIMI EKLE / GÃœNCELLE
        // ---------------------------------------------------------

        let actualAwayTeamId = awayTeamId;

        if (awayTeamId) {
          const {
            data: existingAwayTeam,
            error: awaySelectError,
          } = await supabase
            .from("teams")
            .select("id,logo_url")
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
            logo_url: (typeof awayLogo === "string" && /^https?:\/\//i.test(awayLogo)) ? awayLogo : (existingAwayTeam?.logo_url ?? null),
            league_id: actualLeagueId,
            is_active: true,
            updated_at: new Date().toISOString(),
          };
          resolvedAwayLogo = (typeof awayLogo === "string" && /^https?:\/\//i.test(awayLogo)) ? awayLogo : (typeof awayLogo === "string" && /^espn-(\d+)\.png$/i.test(awayLogo) ? `https://a.espncdn.com/i/teamlogos/soccer/500/${awayLogo.match(/^espn-(\d+)\.png$/i)?.[1]}.png` : (awayTeamPayload.logo_url ?? (awayTeamId ? `/api/team-logo/${awayTeamId}/` : null)));

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
          sportapi_fixture_id: fixtureId,

          home_team: homeName,
          away_team: awayName,

          kickoff,

          league: leagueName,

          status,

          home_score: homeScore,
          away_score: awayScore,

          schedule_confirmed: true,

          home_logo_url: resolvedHomeLogo,
          away_logo_url: resolvedAwayLogo,

          match_date: turkeyDate,

          league_id: actualLeagueId,
          home_team_id: actualHomeTeamId,
          away_team_id: actualAwayTeamId,

          is_live: isLive,

          /*
           * Bu iki kolon NOT NULL olduÄŸu iÃ§in
           * canlÄ± deÄŸilse 0 gÃ¶nderiyoruz.
           */
          live_minute: liveMinute,
          added_minute: addedMinuteValue,

          /*
           * live_period NOT NULL olduÄŸu iÃ§in
           * hiÃ§bir durumda null/0 gÃ¶ndermiyoruz.
           */
          live_period: isLive
            ? livePeriod
            : 1,

          /*
           * Åimdilik gerÃ§ek saniye hesabÄ±nÄ± kullanmÄ±yoruz.
           */
          live_seconds: liveSeconds,

          live_started_at:
            isLive && kickoff
              ? kickoff
              : null,
        };

        // ---------------------------------------------------------
        // MAÃ‡ KONTROL
        // ---------------------------------------------------------

        const {
          data: existingMatch,
          error: matchSelectError,
        } = await supabase
          .from("Matches").select("id,league_id,home_team_id,away_team_id,home_logo_url,away_logo_url").eq("sportapi_fixture_id", fixtureId).maybeSingle();

        if (matchSelectError) {
          throw new Error(
            `match_select: ${matchSelectError.message}`
          );
        }

        // ---------------------------------------------------------
        // MAÃ‡ GÃœNCELLE
        // ---------------------------------------------------------

        if (existingMatch) {
          const updatePayload = {
            ...payload,
            league_id: existingMatch.league_id ?? payload.league_id,
            home_team_id: existingMatch.home_team_id ?? payload.home_team_id,
            away_team_id: existingMatch.away_team_id ?? payload.away_team_id,
            home_logo_url: payload.home_logo_url ?? existingMatch.home_logo_url ?? null,
            away_logo_url: payload.away_logo_url ?? existingMatch.away_logo_url ?? null,
          };
          const {
            error: matchUpdateError,
          } = await supabase
            .from("Matches")
            .update(updatePayload)
            .eq("id", existingMatch.id);

          if (matchUpdateError) {
            throw new Error(
              matchUpdateError.message
            );
          }

          updated++;
        }

        // ---------------------------------------------------------
        // MAÃ‡ EKLE
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

      api_fixture_count: allowedFixtures.length,

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

