import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_URL = "https://sportapi.ai/api";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

const API_KEY = process.env.SPORTAPI_API_KEY!;

type ApiEvent = {
  time?: {
    elapsed?: number | null;
    extra?: number | null;
  };
  team?: {
    id?: number | null;
    name?: string | null;
  };
  player?: {
    id?: number | null;
    name?: string | null;
  };
  assist?: {
    id?: number | null;
    name?: string | null;
  };
  type?: string | null;
  detail?: string | null;
  comments?: string | null;
};

type MatchRow = {
  id: number;
  api_fixture_id: number | null;
  sportapi_fixture_id: number | null;
  home_team: string | null;
  away_team: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  status: string | null;
  kickoff: string | null;
};

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function eventKey(event: {
  event_type?: string | null;
  team?: string | null;
  player_name?: string | null;
  player_out?: string | null;
  player_in?: string | null;
  minute?: number | null;
  added_minute?: number | null;
  assist_player_name?: string | null;
  card_reason?: string | null;
}) {
  return [
    normalize(event.event_type),
    normalize(event.team),
    normalize(event.player_name),
    normalize(event.player_out),
    normalize(event.player_in),
    Number(event.minute ?? 0),
    Number(event.added_minute ?? 0),
    normalize(event.assist_player_name),
    normalize(event.card_reason),
  ].join("|");
}

function isFinishedStatus(status: string | null) {
  return ["FT", "AET", "PEN"].includes(
    String(status ?? "").toUpperCase()
  );
}

function isLiveStatus(status: string | null) {
  return [
    "1H",
    "2H",
    "HT",
    "ET",
    "P",
    "LIVE",
    "BT",
  ].includes(
    String(status ?? "").toUpperCase()
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getApiEvents(
  fixtureId: number,
  homeTeam: string | null,
  awayTeam: string | null
): Promise<ApiEvent[]> {
  const response = await fetch(`${API_URL}/fixtures/${fixtureId}/events`, {
    method: "GET",
    headers: { "X-Api-Key": API_KEY },
    cache: "no-store",
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    throw new Error(
      retryAfter
        ? `RATE_LIMIT_429|retry-after=${retryAfter}`
        : "RATE_LIMIT_429"
    );
  }

  if (!response.ok) {
    throw new Error(`SportAPI events isteği başarısız: ${response.status}`);
  }

  const json = await response.json();
  if (json?.success !== true || !Array.isArray(json?.data)) return [];

  return json.data
    .filter((item: any) => {
      const type = String(item?.event_type ?? "").toLowerCase();
      return type.includes("goal") || type.includes("card");
    })
    .map((item: any): ApiEvent => {
      const side = String(item?.team_side ?? "").toLowerCase();
      const rawMinute = String(item?.minute ?? "0");
      const parsedMinute = Number.parseInt(rawMinute, 10);
      const rawType = String(item?.event_type ?? "").toLowerCase();
      const detail = String(item?.extra_info ?? rawType);

      return {
        time: {
          elapsed: Number.isFinite(parsedMinute) ? parsedMinute : 0,
          extra: 0,
        },
        team: {
          name: side === "home" ? homeTeam : side === "away" ? awayTeam : null,
        },
        player: { name: item?.player_name ?? null },
        assist: { name: item?.assist_name ?? null },
        type: rawType.includes("card") ? "Card" : "Goal",
        detail,
        comments: detail,
      };
    });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "API_FOOTBALL_KEY bulunamadÃ„Â±.",
        },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SECRET_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "SUPABASE_SECRET_KEY bulunamadÃ„Â±.",
        },
        { status: 500 }
      );
    }

    const { data: matches, error: matchesError } =
      await supabase
        .from("Matches")
        .select(
          `
          id,
          api_fixture_id,
          sportapi_fixture_id,
          home_team,
          away_team,
          home_team_id,
          away_team_id,
          status,
          kickoff
        `
        )
        .not("sportapi_fixture_id", "is", null)
        .order("kickoff", {
          ascending: true,
        });

    if (matchesError) {
      throw new Error(
        `Matches okunamadÃ„Â±: ${matchesError.message}`
      );
    }

    const allMatches =
      (matches ?? []) as MatchRow[];

    /*
     * Sadece canlÃ„Â± veya bitmiÃ…Å¸ maÃƒÂ§larÃ„Â± alÃ„Â±yoruz.
     * Gelecekteki maÃƒÂ§lara events isteÃ„Å¸i atÃ„Â±lmÃ„Â±yor.
     */
    const eligibleMatches = allMatches.filter(
      (match) =>
        isLiveStatus(match.status) ||
        isFinishedStatus(match.status)
    );

    /*
     * API limitine takÃ„Â±lmamak iÃƒÂ§in bir ÃƒÂ§alÃ„Â±Ã…Å¸tÃ„Â±rmada
     * en fazla 8 maÃƒÂ§ iÃ…Å¸leniyor.
     */
    const liveMatches = eligibleMatches.filter(
  (match) => isLiveStatus(match.status)
);

const finishedMatches = eligibleMatches.filter(
  (match) => isFinishedStatus(match.status)
);

const matchesToProcess = [
  ...liveMatches,
  ...finishedMatches,
].slice(0, 8);

    let matchesProcessed = 0;
    let matchesWithEvents = 0;
    let inserted = 0;
    let skipped = 0;
    let rateLimited = false;

    const errors: Array<{
      match_id: number;
      api_fixture_id: number;
      error: string;
    }> = [];

    for (
      let index = 0;
      index < matchesToProcess.length;
      index++
    ) {
      const match = matchesToProcess[index];

      const fixtureId = Number(match.sportapi_fixture_id);

      if (!fixtureId) {
        continue;
      }

      /*
       * API'yi arka arkaya boÃ„Å¸mamak iÃƒÂ§in
       * istekler arasÃ„Â±nda bekliyoruz.
       */
      if (index > 0) {
        await sleep(8000);
      }

      matchesProcessed++;

      try {
        const apiEvents =
          (await getApiEvents(fixtureId, match.home_team, match.away_team)) as ApiEvent[];

        if (apiEvents.length > 0) {
          matchesWithEvents++;
        }

        const {
          data: existingEvents,
          error: existingError,
        } = await supabase
          .from("MatchEvents")
          .select(
            `
            id,
            event_type,
            team,
            player_name,
            player_out,
            player_in,
            minute,
            added_minute,
            assist_player_name,
            card_reason,
            team_name
          `
          )
          .eq("match_id", match.id);

        if (existingError) {
          throw new Error(
            `Mevcut eventler okunamadÃ„Â±: ${existingError.message}`
          );
        }

        const existingKeys = new Set(
          (existingEvents ?? []).map((event) =>
            eventKey(event)
          )
        );

        const rowsToInsert: Array<{
          match_id: number;
          event_type: string;
          team: string | null;
          player_name: string | null;
          player_out: string | null;
          player_in: string | null;
          minute: number;
          added_minute: number;
          created_at: string;
          assist_player_name: string | null;
          card_reason: string | null;
          team_name: string | null;
        }> = [];

        for (const event of apiEvents) {
          const elapsed =
            typeof event.time?.elapsed === "number"
              ? event.time.elapsed
              : 0;

          const extra =
            typeof event.time?.extra === "number"
              ? event.time.extra
              : 0;

          const apiTeamId =
            typeof event.team?.id === "number"
              ? event.team.id
              : null;

          const apiTeamName =
            event.team?.name ?? null;

          const isHome =
            apiTeamId !== null &&
            Number(match.home_team_id) ===
              apiTeamId;

          const isAway =
            apiTeamId !== null &&
            Number(match.away_team_id) ===
              apiTeamId;

          let team: string | null = null;

          if (isHome) {
            team = "home";
          } else if (isAway) {
            team = "away";
          } else {
            const eventTeamName =
              normalize(apiTeamName);

            if (
              eventTeamName &&
              eventTeamName ===
                normalize(match.home_team)
            ) {
              team = "home";
            } else if (
              eventTeamName &&
              eventTeamName ===
                normalize(match.away_team)
            ) {
              team = "away";
            }
          }

          const apiType =
            normalize(event.type);

          let eventType = "";

          let playerName: string | null =
            null;

          let playerOut: string | null =
            null;

          let playerIn: string | null =
            null;

          let assistPlayerName: string | null =
            null;

          let cardReason: string | null =
            null;

          /*
           * GOL
           */
          if (apiType === "goal") {
            eventType = "goal";

            playerName =
              event.player?.name ?? null;

            assistPlayerName =
              event.assist?.name ?? null;
          }

          /*
           * KART
           */
          else if (apiType === "card") {
            const detailText =
              event.detail ??
              event.comments ??
              "";

            const detailNormalized =
              normalize(detailText);

            if (
              detailNormalized.includes(
                "second yellow"
              )
            ) {
              eventType = "red_card";
            } else if (
              detailNormalized.includes(
                "red"
              )
            ) {
              eventType = "red_card";
            } else {
              eventType = "yellow_card";
            }

            playerName =
              event.player?.name ?? null;

            cardReason =
              event.comments ??
              event.detail ??
              null;
          }

          /*
           * OYUNCU DEÃ„ÂÃ„Â°Ã…ÂÃ„Â°KLÃ„Â°Ã„ÂÃ„Â°
           */
          else if (
            apiType === "subst" ||
            apiType === "substitution"
          ) {
            eventType =
              "substitution";

            playerOut =
              event.player?.name ?? null;

            playerIn =
              event.assist?.name ?? null;

            /*
             * BazÃ„Â± API cevaplarÃ„Â±nda oyuna giren
             * oyuncu comments/detail iÃƒÂ§inde gelebiliyor.
             */
            if (
              !playerIn &&
              event.comments
            ) {
              const comment =
                event.comments;

              const inMatch =
                comment.match(
                  /(?:in|girdi|oyuna giren)\s*[:\-]?\s*(.+)/i
                );

              if (inMatch?.[1]) {
                playerIn =
                  inMatch[1].trim();
              }
            }
          } else {
            continue;
          }

          const row = {
            match_id: Number(match.id),

            event_type: eventType,

            team,

            player_name:
              eventType ===
              "substitution"
                ? null
                : playerName,

            player_out:
              eventType ===
              "substitution"
                ? playerOut
                : null,

            player_in:
              eventType ===
              "substitution"
                ? playerIn
                : null,

            minute: elapsed,

            added_minute: extra,

            created_at:
              new Date().toISOString(),

            assist_player_name:
              eventType === "goal"
                ? assistPlayerName
                : null,

            card_reason:
              eventType ===
                "yellow_card" ||
              eventType ===
                "red_card"
                ? cardReason
                : null,

            team_name:
              apiTeamName,
          };

          const key = eventKey(row);

          if (existingKeys.has(key)) {
            skipped++;
            continue;
          }

          rowsToInsert.push(row);

          existingKeys.add(key);
        }

        if (rowsToInsert.length > 0) {
          const {
            error: insertError,
          } = await supabase
            .from("MatchEvents")
            .insert(rowsToInsert);

          if (insertError) {
            throw new Error(
              `Eventler eklenemedi: ${insertError.message}`
            );
          }

          inserted +=
            rowsToInsert.length;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(error);

        /*
         * 429 geldiyse artÃ„Â±k diÃ„Å¸er maÃƒÂ§lara
         * istek atmÃ„Â±yoruz.
         */
        if (
          errorMessage.startsWith(
            "RATE_LIMIT_429"
          )
        ) {
          rateLimited = true;

          errors.push({
            match_id: Number(match.id),
            api_fixture_id: fixtureId,
            error: errorMessage,
          });

          break;
        }

        errors.push({
          match_id: Number(match.id),
          api_fixture_id: fixtureId,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      ok:
        errors.length === 0,

      matches_found:
        allMatches.length,

      eligible_matches:
        eligibleMatches.length,

      matches_selected:
        matchesToProcess.length,

      matches_processed:
        matchesProcessed,

      matches_with_events:
        matchesWithEvents,

      events_inserted:
        inserted,

      events_skipped_existing:
        skipped,

      rate_limited:
        rateLimited,

      remaining_eligible_matches:
        Math.max(
          eligibleMatches.length -
            matchesProcessed,
          0
        ),

      error_count:
        errors.length,

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




