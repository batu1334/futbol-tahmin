import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_URL = "https://v3.football.api-sports.io";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

const API_KEY = process.env.API_FOOTBALL_KEY!;

type ApiPlayer = {
  id?: number;
  name?: string;
  number?: number | null;
  pos?: string | null;
  grid?: string | null;
  photo?: string | null;
};

type ApiLineup = {
  team?: {
    id?: number;
    name?: string;
    logo?: string;
  };
  formation?: string | null;
  startXI?: Array<{
    player?: ApiPlayer;
  }>;
  substitutes?: Array<{
    player?: ApiPlayer;
  }>;
  coach?: {
    id?: number;
    name?: string;
    photo?: string;
  };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStatus(fixture: any) {
  return fixture?.fixture?.status?.short ?? "";
}

function isRelevantStatus(status: string) {
  return [
    "NS",
    "1H",
    "HT",
    "2H",
    "ET",
    "BT",
    "P",
    "LIVE",
    "FT",
    "AET",
    "PEN",
  ].includes(status);
}

function getTeamSide(
  teamId: number,
  homeTeamId: number,
  awayTeamId: number
): "home" | "away" | null {
  if (teamId === homeTeamId) return "home";
  if (teamId === awayTeamId) return "away";
  return null;
}

export async function GET() {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "API_FOOTBALL_KEY bulunamadı.",
        },
        { status: 500 }
      );
    }

    /*
     * Önce Matches tablosundan bugünle bağlantılı
     * ve kadro alınabilecek maçları buluyoruz.
     */
    const { data: matches, error: matchesError } = await supabase
      .from("Matches")
      .select(
        `
        id,
        api_fixture_id,
        kickoff,
        status,
        home_team,
        away_team,
        home_team_id,
        away_team_id
      `
      )
      .not("api_fixture_id", "is", null)
      .order("kickoff", { ascending: true })
      .limit(200);

    if (matchesError) {
      throw new Error(
        `Matches okunamadı: ${matchesError.message}`
      );
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        ok: true,
        matches_found: 0,
        matches_selected: 0,
        matches_processed: 0,
        matches_with_lineups: 0,
        players_created: 0,
        players_updated: 0,
        lineup_rows_inserted: 0,
        error_count: 0,
        errors: [],
      });
    }

    /*
     * Öncelik:
     * 1. Canlı maçlar
     * 2. Başlamış / bitmiş maçlar
     * 3. Yaklaşan maçlar
     *
     * Böylece aynı maçları sürekli ilk sıradan çekmek yerine
     * otomasyonda daha anlamlı bir sıra kullanıyoruz.
     */
    const now = Date.now();

    const selectedMatches = [...matches]
      .filter((match) => {
        if (!match.api_fixture_id) return false;

        const status = String(match.status ?? "");

        if (isRelevantStatus(status)) return true;

        if (match.kickoff) {
          const kickoffTime = new Date(match.kickoff).getTime();

          // Başlamasına 2 saat kalan maçlar
          if (
            kickoffTime >= now &&
            kickoffTime - now <= 2 * 60 * 60 * 1000
          ) {
            return true;
          }
        }

        return false;
      })
      .sort((a, b) => {
        const aStatus = String(a.status ?? "");
        const bStatus = String(b.status ?? "");

        const liveStatuses = new Set([
          "1H",
          "HT",
          "2H",
          "ET",
          "BT",
          "P",
          "LIVE",
        ]);

        const aLive = liveStatuses.has(aStatus) ? 0 : 1;
        const bLive = liveStatuses.has(bStatus) ? 0 : 1;

        if (aLive !== bLive) {
          return aLive - bLive;
        }

        return (
          new Date(a.kickoff).getTime() -
          new Date(b.kickoff).getTime()
        );
      })
      .slice(0, 8);

    let matchesProcessed = 0;
    let matchesWithLineups = 0;
    let playersCreated = 0;
    let playersUpdated = 0;
    let lineupRowsInserted = 0;

    const errors: string[] = [];

    for (const match of selectedMatches) {
      try {
        matchesProcessed++;

        const fixtureId = Number(match.api_fixture_id);

        /*
         * API-Football:
         * /fixtures?id=...
         *
         * Bu cevap içinde fixture,
         * events,
         * lineups,
         * statistics ve players
         * gibi detaylar bulunabilir.
         */
        const response = await fetch(
          `${API_URL}/fixtures?id=${fixtureId}`,
          {
            method: "GET",
            headers: {
              "x-apisports-key": API_KEY,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (response.status === 429) {
          errors.push(
            `Fixture ${fixtureId}: API 429 rate limit`
          );

          break;
        }

        if (!response.ok) {
          errors.push(
            `Fixture ${fixtureId}: HTTP ${response.status}`
          );

          await sleep(1500);
          continue;
        }

        const apiData = await response.json();

        const fixture = apiData?.response?.[0];

        if (!fixture) {
          errors.push(
            `Fixture ${fixtureId}: API'den maç bulunamadı`
          );

          await sleep(1500);
          continue;
        }

        const lineups: ApiLineup[] = Array.isArray(
          fixture.lineups
        )
          ? fixture.lineups
          : [];

        /*
         * Kadrolar henüz yayınlanmadıysa
         * hata saymıyoruz.
         */
        if (lineups.length === 0) {
          await sleep(1500);
          continue;
        }

        matchesWithLineups++;

        const homeApiTeamId = Number(
          fixture?.teams?.home?.id
        );

        const awayApiTeamId = Number(
          fixture?.teams?.away?.id
        );

        /*
         * Her iki takımın API kadrosunu işliyoruz.
         */
        for (const lineup of lineups) {
          const apiTeamId = Number(lineup?.team?.id);

          if (!apiTeamId) continue;

          const teamSide = getTeamSide(
            apiTeamId,
            homeApiTeamId,
            awayApiTeamId
          );

          if (!teamSide) continue;

          const apiTeamName =
            lineup?.team?.name ??
            (teamSide === "home"
              ? match.home_team
              : match.away_team);

          const apiTeamLogo =
            lineup?.team?.logo ??
            null;

          /*
           * İlk 11 + yedekleri tek listeye alıyoruz.
           */
          const starters = Array.isArray(
            lineup?.startXI
          )
            ? lineup.startXI
            : [];

          const substitutes = Array.isArray(
            lineup?.substitutes
          )
            ? lineup.substitutes
            : [];

          /*
           * Önce oyuncuları oluştur/güncelle.
           */
          const allPlayers = [
            ...starters.map((item) => ({
              item,
              status: "starting" as const,
            })),
            ...substitutes.map((item) => ({
              item,
              status: "substitute" as const,
            })),
          ];

          const lineupPlayerIds: string[] = [];

          for (const entry of allPlayers) {
            const apiPlayer = entry.item?.player;

            if (!apiPlayer?.id) {
              continue;
            }

            const apiPlayerId = Number(apiPlayer.id);

            const playerName =
              apiPlayer.name?.trim() ||
              `Oyuncu ${apiPlayerId}`;

            /*
             * Aynı API oyuncusunu daha önce
             * kaydetmiş miyiz?
             */
            const { data: existingPlayer, error: playerFindError } =
              await supabase
                .from("players")
                .select("id")
                .eq("api_player_id", apiPlayerId)
                .maybeSingle();

            if (playerFindError) {
              throw new Error(
                `Oyuncu aranamadı (${playerName}): ${playerFindError.message}`
              );
            }

            const playerPayload = {
              api_player_id: apiPlayerId,
              name: playerName,
              photo_url: apiPlayer.photo ?? null,
              jersey_number:
                typeof apiPlayer.number === "number"
                  ? apiPlayer.number
                  : null,
              position: apiPlayer.pos ?? null,
              team: apiTeamName,
              team_logo: apiTeamLogo,
              cuurent_team_id: apiTeamId,
              active: true,
            };

            if (existingPlayer?.id) {
              const { error: updatePlayerError } =
                await supabase
                  .from("players")
                  .update(playerPayload)
                  .eq("id", existingPlayer.id);

              if (updatePlayerError) {
                throw new Error(
                  `Oyuncu güncellenemedi (${playerName}): ${updatePlayerError.message}`
                );
              }

              playersUpdated++;

              lineupPlayerIds.push(existingPlayer.id);

              /*
               * Bu oyuncunun lineup kaydını güncelle.
               */
              const { data: existingLineup } =
                await supabase
                  .from("match_lineups")
                  .select("id")
                  .eq("match_id", match.id)
                  .eq("player_id", existingPlayer.id)
                  .maybeSingle();

              if (existingLineup?.id) {
                const { error: lineupUpdateError } =
                  await supabase
                    .from("match_lineups")
                    .update({
                      team: teamSide,
                      status: entry.status,
                      absence_reason: null,
                    })
                    .eq("id", existingLineup.id);

                if (lineupUpdateError) {
                  throw new Error(
                    `Kadro güncellenemedi (${playerName}): ${lineupUpdateError.message}`
                  );
                }
              } else {
                const { error: lineupInsertError } =
                  await supabase
                    .from("match_lineups")
                    .insert({
                      match_id: match.id,
                      player_id: existingPlayer.id,
                      team: teamSide,
                      status: entry.status,
                      absence_reason: null,
                    });

                if (lineupInsertError) {
                  throw new Error(
                    `Kadro eklenemedi (${playerName}): ${lineupInsertError.message}`
                  );
                }

                lineupRowsInserted++;
              }
            } else {
              const { data: newPlayer, error: insertPlayerError } =
                await supabase
                  .from("players")
                  .insert(playerPayload)
                  .select("id")
                  .single();

              if (insertPlayerError || !newPlayer) {
                throw new Error(
                  `Oyuncu eklenemedi (${playerName}): ${
                    insertPlayerError?.message ??
                    "Bilinmeyen hata"
                  }`
                );
              }

              playersCreated++;

              lineupPlayerIds.push(newPlayer.id);

              const { error: lineupInsertError } =
                await supabase
                  .from("match_lineups")
                  .insert({
                    match_id: match.id,
                    player_id: newPlayer.id,
                    team: teamSide,
                    status: entry.status,
                    absence_reason: null,
                  });

              if (lineupInsertError) {
                throw new Error(
                  `Kadro eklenemedi (${playerName}): ${lineupInsertError.message}`
                );
              }

              lineupRowsInserted++;
            }
          }

          /*
           * Formasyonu Matches tablosunda tutmuyoruz çünkü
           * mevcut şemada formation alanı yok.
           *
           * Kullanıcı tarafındaki mevcut diziliş sistemi
           * match_lineups kayıtlarını kullanmaya devam edecek.
           *
           * API'nin grid bilgisi daha sonra kullanıcı tarafında
           * görsel saha yerleşiminde kullanılabilir.
           */
        }

        /*
         * Aynı API çağrısında lineups geldiyse
         * bir sonraki maça geçiyoruz.
         */
        await sleep(1500);
      } catch (error: any) {
        errors.push(
          `Match ${match.id}: ${
            error?.message ?? "Bilinmeyen hata"
          }`
        );

        await sleep(1500);
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      matches_found: matches.length,
      matches_selected: selectedMatches.length,
      matches_processed: matchesProcessed,
      matches_with_lineups: matchesWithLineups,
      players_created: playersCreated,
      players_updated: playersUpdated,
      lineup_rows_inserted: lineupRowsInserted,
      error_count: errors.length,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ??
          "Lineup otomasyonu sırasında bilinmeyen hata.",
      },
      { status: 500 }
    );
  }
}