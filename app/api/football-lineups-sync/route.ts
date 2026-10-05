import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_URL = "https://v3.football.api-sports.io";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

const API_KEY = process.env.API_FOOTBALL_KEY!;

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

async function fetchLineups(fixtureId: number) {
  const response = await fetch(
    `${API_URL}/fixtures/lineups?fixture=${fixtureId}`,
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
      `API lineups ${fixtureId}: HTTP ${response.status}`
    );
  }

  return (await response.json()) as {
    response?: ApiLineup[];
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
        `Oyuncu gÃ¼ncelleme: ${updated.error.message}`
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

  if (!apiTeamId) {
    return {
      starting: 0,
      substitutes: 0,
      team: null,
    };
  }

  const homeById =
    Number(match.home_team_id) ===
    Number(apiTeamId);

  const awayById =
    Number(match.away_team_id) ===
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
        `Ä°lk 11 kayÄ±t: ${result.error.message}`
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
        `Yedek kayÄ±t: ${result.error.message}`
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

export async function GET() {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "API_FOOTBALL_KEY bulunamadÄ±.",
        },
        { status: 500 }
      );
    }

    const matchesResult = await supabase
      .from("Matches")
      .select(
        "id,api_fixture_id,status,home_team_id,away_team_id,home_team,away_team"
      )
      .not("api_fixture_id", "is", null)
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

    const eligibleMatches = matches.filter(
      (match) => {
        const status = String(
          match.status || ""
        ).toUpperCase();

        return (
          LIVE_STATUSES.has(status) ||
          FINISHED_STATUSES.has(status)
        );
      }
    );

    /*
     * Daha Ã¶nce kadrosu kaydedilmiÅŸ maÃ§larÄ± bul.
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
     * Kadrosu olmayan maÃ§lar her zaman Ã¶nce iÅŸlenir.
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
     * Kadro senkronizasyonunda öncelik:
     *
     * 1. Canlı ve kadrosu olmayan maçlar
     * 2. Başlamasına 90 dakika veya daha az kalan maçlar
     * 3. Diğer kadrosuz maçlar
     * 4. Kadrosu olan maçlar
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
      Number(match.api_fixture_id);

    if (!fixtureId) {
      continue;
    }

    const lineupData =
      await fetchLineups(fixtureId);

    const lineups =
      Array.isArray(lineupData.response)
        ? lineupData.response
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










