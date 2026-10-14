import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_URL = "https://sportapi.ai/api";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

const API_KEY = process.env.SPORTAPI_API_KEY!;

const LIVE_STATUSES = new Set([
  "1H",
  "2H",
  "HT",
  "ET",
  "BT",
  "P",
  "LIVE",
]);

const FINISHED_STATUSES = new Set([
  "FT",
  "AET",
  "PEN",
]);

type ApiPlayer = {
  id?: number;
  name?: string;
  photo?: string | null;
  number?: number | null;
  pos?: string | null;
  grid?: string | null;
};

type ApiLineup = {
  team?: {
    id?: number;
    name?: string;
    logo?: string | null;
  };
  formation?: string | null;
  startXI?: Array<{
    player?: ApiPlayer;
  }>;
  substitutes?: Array<{
    player?: ApiPlayer;
  }>;
};

type MatchRow = {
  id: number;
  api_fixture_id: number | null;
  sportapi_fixture_id: number | null;
  status: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_team: string | null;
  away_team: string | null;
  kickoff: string | null;
};

function normalizePosition(
  position: string | null | undefined
) {
  if (!position) return null;

  const value = position.toUpperCase();

  if (value === "G") return "GK";
  if (value === "D") return "DEF";
  if (value === "M") return "MID";
  if (value === "F") return "FWD";

  return position;
}

async function fetchLineups(
  fixtureId: number,
  homeTeam: string | null,
  awayTeam: string | null
) {
  const response = await fetch(
    `${API_URL}/fixtures/${fixtureId}/lineups`,
    {
      method: "GET",
      headers: { "X-Api-Key": API_KEY },
      cache: "no-store",
    }
  );

  if (response.status === 429) {
    throw new Error("RATE_LIMIT_429");
  }

  if (!response.ok) {
    throw new Error(
      `SportAPI lineups ${fixtureId}: HTTP ${response.status}`
    );
  }

  type SportPlayer = {
    name?: string;
    position?: string;
    shirt?: number | null;
  };

  type SportTeamLineup = {
    starters?: SportPlayer[];
    subs?: SportPlayer[];
  };

  const payload = (await response.json()) as {
    success?: boolean;
    available?: boolean;
    data?: {
      home?: SportTeamLineup;
      away?: SportTeamLineup;
    } | null;
  };

  if (
    payload.available !== true ||
    !payload.data?.home ||
    !payload.data?.away
  ) {
    return {
      success: payload.success,
      available: payload.available,
      data: [] as ApiLineup[],
    };
  }

  function makePlayer(
    player: SportPlayer,
    teamName: string | null
  ): ApiPlayer {
    const stableText =
      `${(teamName || "").trim().toLocaleLowerCase("en-US")}:` +
      `${(player.name || "").trim().toLocaleLowerCase("en-US")}`;

    let hash = 2166136261;

    for (let i = 0; i < stableText.length; i++) {
      hash = Math.imul(hash ^ stableText.charCodeAt(i), 16777619) >>> 0;
    }

    return {
      id: -((hash % 2000000000) + 1),
      name: player.name,
      number: player.shirt ?? null,
      pos: player.position ?? null,
      photo: null,
    };
  }

  function convertTeam(
    side: "home" | "away",
    teamName: string | null,
    source: SportTeamLineup
  ): ApiLineup {
    return {
      team: {
        name: teamName || (side === "home" ? "home" : "away"),
      },
      formation: null,
      startXI: (source.starters || []).map((player) => ({
        player: makePlayer(player, teamName),
      })),
      substitutes: (source.subs || []).map((player) => ({
        player: makePlayer(player, teamName),
      })),
    };
  }

  return {
    success: payload.success,
    available: payload.available,
    data: [
      convertTeam("home", homeTeam, payload.data.home),
      convertTeam("away", awayTeam, payload.data.away),
    ] as ApiLineup[],
  };
}
async function fetchLineupsBatch(fixtureIds: number[]) {
  if (fixtureIds.length === 0) {
    return [];
  }

  const ids = fixtureIds.join("-");

  const response = await fetch(
    `${API_URL}/fixtures?ids=${ids}`,
    {
      method: "GET",
      headers: {
        "x-apisports-key": API_KEY,
      },
      cache: "no-store",
    }
  );

  if (response.status === 429) {
    throw new Error("HTTP 429");
  }

  if (!response.ok) {
    throw new Error(
      `API fixtures batch: HTTP ${response.status}`
    );
  }

  const data = (await response.json()) as {
    response?: Array<{
      fixture?: {
        id?: number;
      };
      lineups?: ApiLineup[];
    }>;
  };

  return Array.isArray(data.response)
    ? data.response
    : [];
}
async function findPlayer(apiPlayerId: number) {
  const result = await supabase
    .from("players")
    .select("id")
    .eq("api_player_id", apiPlayerId)
    .maybeSingle();

  if (result.error) {
    throw new Error(
      `Oyuncu sorgusu: ${result.error.message}`
    );
  }

  return result.data?.id || null;
}

async function savePlayer(
  player: ApiPlayer,
  teamName: string | null,
  teamLogo: string | null
) {
  if (!player.id || !player.name) {
    return null;
  }

  const existingId = await findPlayer(player.id);

  const data = {
    api_player_id: player.id,
    name: player.name,
    photo_url: player.photo || null,
    jersey_number:
      typeof player.number === "number"
        ? player.number
        : null,
    position: normalizePosition(player.pos),
    team: teamName,
    team_logo: teamLogo,
    active: true,
  };

  if (existingId) {
    const updated = await supabase
      .from("players")
      .update(data)
      .eq("id", existingId)
      .select("id")
      .single();

    if (updated.error) {
      throw new Error(
        `Oyuncu gÃƒÂ¼ncelleme: ${updated.error.message}`
      );
    }

    return updated.data.id;
  }

  const inserted = await supabase
    .from("players")
    .insert(data)
    .select("id")
    .single();

  if (inserted.error) {
    throw new Error(
      `Oyuncu ekleme: ${inserted.error.message}`
    );
  }

  return inserted.data.id;
}

async function saveLineup(
  match: MatchRow,
  lineup: ApiLineup
) {
  const apiTeamId =
    typeof lineup.team?.id === "number"
      ? lineup.team.id
      : null;

  const teamName = lineup.team?.name || null;
  const teamLogo = lineup.team?.logo || null;

const homeById =
    apiTeamId !== null && Number(match.home_team_id) ===
    Number(apiTeamId);

  const awayById =
    apiTeamId !== null && Number(match.away_team_id) ===
    Number(apiTeamId);

  const homeByName =
    String(match.home_team || "")
      .trim()
      .toLowerCase() ===
    String(teamName || "")
      .trim()
      .toLowerCase();

  const awayByName =
    String(match.away_team || "")
      .trim()
      .toLowerCase() ===
    String(teamName || "")
      .trim()
      .toLowerCase();

  let team: "home" | "away" | null = null;

  if (homeById || homeByName) {
    team = "home";
  } else if (awayById || awayByName) {
    team = "away";
  }

  if (!team) {
    return {
      starting: 0,
      substitutes: 0,
      team: null,
    };
  }

  let starting = 0;
  let substitutes = 0;

  const starters = Array.isArray(lineup.startXI)
    ? lineup.startXI
    : [];

  const bench = Array.isArray(lineup.substitutes)
    ? lineup.substitutes
    : [];

  for (const item of starters) {
    const player = item.player;

    if (!player?.id || !player.name) {
      continue;
    }

    const playerId = await savePlayer(
      player,
      teamName,
      teamLogo
    );

    if (!playerId) continue;

    const result = await supabase
      .from("match_lineups")
      .upsert(
        {
          match_id: match.id,
          player_id: playerId,
          team,
          status: "starting",
          absence_reason: null,
        },
        {
          onConflict: "match_id,player_id",
        }
      );

    if (result.error) {
      throw new Error(
        `Ã„Â°lk 11 kayÃ„Â±t: ${result.error.message}`
      );
    }

    starting++;
  }

  for (const item of bench) {
    const player = item.player;

    if (!player?.id || !player.name) {
      continue;
    }

    const playerId = await savePlayer(
      player,
      teamName,
      teamLogo
    );

    if (!playerId) continue;

    const result = await supabase
      .from("match_lineups")
      .upsert(
        {
          match_id: match.id,
          player_id: playerId,
          team,
          status: "substitute",
          absence_reason: null,
        },
        {
          onConflict: "match_id,player_id",
        }
      );

    if (result.error) {
      throw new Error(
        `Yedek kayÃ„Â±t: ${result.error.message}`
      );
    }

    substitutes++;
  }

  return {
    starting,
    substitutes,
    team,
    formation: lineup.formation || null,
  };
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
          error: "SPORTAPI_API_KEY bulunamadı.",
        },
        { status: 500 }
      );
    }

    const matchesResult = await supabase
      .from("Matches")
      .select(
        "id,api_fixture_id,sportapi_fixture_id,status,home_team_id,away_team_id,home_team,away_team,kickoff"
      )
      .not("sportapi_fixture_id", "is", null)
      .order("kickoff", {
        ascending: true,
      });

    if (matchesResult.error) {
      return NextResponse.json(
        {
          ok: false,
          error: matchesResult.error.message,
        },
        { status: 500 }
      );
    }

    const matches =
      (matchesResult.data || []) as MatchRow[];

    const eligibleMatches = matches.filter((match) => {
      const status = String(match.status || "").toUpperCase();
      const kickoffTime = match.kickoff
        ? new Date(match.kickoff).getTime()
        : NaN;
      const isUpcoming =
        Number.isFinite(kickoffTime) &&
        kickoffTime >= Date.now() &&
        !["PST", "CANC", "ABD", "AWD", "WO"].includes(status);

      return (
        LIVE_STATUSES.has(status) ||
        FINISHED_STATUSES.has(status) ||
        isUpcoming
      );
    });

    /*
     * Daha ÃƒÂ¶nce kadrosu kaydedilmiÃ…Å¸ maÃƒÂ§larÃ„Â± bul.
     */
    const lineupMatchIds = new Set<number>();

    if (eligibleMatches.length > 0) {
      const eligibleIds =
        eligibleMatches.map(
          (match) => match.id
        );

      const existingLineups =
        await supabase
          .from("match_lineups")
          .select("match_id")
          .in("match_id", eligibleIds);

      if (existingLineups.error) {
        return NextResponse.json(
          {
            ok: false,
            error:
              existingLineups.error.message,
          },
          { status: 500 }
        );
      }

      for (const row of existingLineups.data ||
        []) {
        lineupMatchIds.add(
          Number(row.match_id)
        );
      }
    }

    /*
     * Kadrosu olmayan maÃƒÂ§lar her zaman ÃƒÂ¶nce iÃ…Å¸lenir.
     */
    const withoutLineups =
      eligibleMatches.filter(
        (match) =>
          !lineupMatchIds.has(match.id)
      );

    const withLineups =
      eligibleMatches.filter(
        (match) =>
          lineupMatchIds.has(match.id)
      );

    /*
     * Kadro senkronizasyonunda Ã¶ncelik:
     *
     * 1. CanlÄ± ve kadrosu olmayan maÃ§lar
     * 2. BaÅŸlamasÄ±na 90 dakika veya daha az kalan maÃ§lar
     * 3. DiÄŸer kadrosuz maÃ§lar
     * 4. Kadrosu olan maÃ§lar
     */
    const now = Date.now();

    const liveWithoutLineups = withoutLineups.filter(
      (match) => {
        const status = String(
          match.status || ""
        ).toUpperCase();

        return LIVE_STATUSES.has(status);
      }
    );

    const soonWithoutLineups = withoutLineups
      .filter((match) => {
        const status = String(
          match.status || ""
        ).toUpperCase();

        if (LIVE_STATUSES.has(status)) {
          return false;
        }

        if (!match.kickoff) {
          return false;
        }

        const kickoffTime = new Date(
          match.kickoff
        ).getTime();

        const minutesUntilKickoff =
          (kickoffTime - now) / 60000;

        return (
          minutesUntilKickoff >= 0 &&
          minutesUntilKickoff <= 90
        );
      })
      .sort(
        (a, b) =>
          new Date(a.kickoff || 0).getTime() -
          new Date(b.kickoff || 0).getTime()
      );

    const otherWithoutLineups =
      withoutLineups.filter(
        (match) =>
          !liveWithoutLineups.some(
            (item) => item.id === match.id
          ) &&
          !soonWithoutLineups.some(
            (item) => item.id === match.id
          )
      );

    const selectedMatches = [
      ...liveWithoutLineups,
      ...soonWithoutLineups,
      ...otherWithoutLineups,
      ...withLineups,
    ].slice(0, 8);

    let matchesProcessed = 0;
let matchesWithLineups = 0;
let startingPlayers = 0;
let substitutePlayers = 0;
let rateLimited = false;

const errors: string[] = [];

    

for (const match of selectedMatches) {
  try {
    const fixtureId =
      Number(match.sportapi_fixture_id);

    if (!fixtureId) {
      continue;
    }

    const lineupData =
      await fetchLineups(fixtureId, match.home_team, match.away_team);

    const lineups: ApiLineup[] =
      lineupData.available === false
        ? []
        : Array.isArray(lineupData.data)
          ? lineupData.data
          : [];
    matchesProcessed++;

    if (lineups.length === 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, 3000)
      );

      continue;
    }

    let matchHasLineup = false;

    for (const lineup of lineups) {
      const result =
        await saveLineup(
          match,
          lineup
        );

      if (
        result.starting > 0 ||
        result.substitutes > 0
      ) {
        matchHasLineup = true;
      }

      startingPlayers +=
        result.starting;

      substitutePlayers +=
        result.substitutes;
    }

    if (matchHasLineup) {
      matchesWithLineups++;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 3000)
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    if (message.includes("429")) {
      rateLimited = true;

      errors.push(
        `Match ${match.id}: API rate limit (429)`
      );

      break;
    }

    errors.push(
      `Match ${match.id}: ${message}`
    );
  }
}
return NextResponse.json({
      ok:
        errors.length === 0 ||
        (rateLimited &&
          matchesProcessed > 0),

      matches_found:
        matches.length,

      eligible_matches:
        eligibleMatches.length,

      matches_without_lineups:
        withoutLineups.length,

      matches_selected:
        selectedMatches.length,

      matches_processed:
        matchesProcessed,

      matches_with_lineups:
        matchesWithLineups,

      starting_players:
        startingPlayers,

      substitute_players:
        substitutePlayers,

      remaining_without_lineups:
        Math.max(
          0,
          withoutLineups.length -
            matchesProcessed
        ),

      rate_limited:
        rateLimited,

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















