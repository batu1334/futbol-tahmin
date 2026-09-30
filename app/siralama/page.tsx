"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Player = {
  rank: number;
  user_id: string;
  display_name: string;
  total_points: number;
  prediction_count: number;
};

type SortMode = "rank" | "points" | "predictions";

export default function SiralamaPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myUserId, setMyUserId] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("rank");

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const userResult = await supabase.auth.getUser();

    if (!userResult.data.user) {
      window.location.href = "/login";
      return;
    }

    const currentUserId = userResult.data.user.id;

    setMyUserId(currentUserId);

    const result = await supabase.rpc("get_leaderboard");

    if (result.error) {
      console.error("Leaderboard error:", result.error);

      setPlayers([]);

      setLoading(false);
      setRefreshing(false);

      return;
    }

    setPlayers((result.data || []) as Player[]);

    setLoading(false);
    setRefreshing(false);
  }

  const myPlayer = useMemo(
    () =>
      players.find(
        (player) => player.user_id === myUserId
      ),
    [players, myUserId]
  );

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");

    let result = [...players];

    if (query) {
      result = result.filter((player) =>
        player.display_name
          .toLocaleLowerCase("tr-TR")
          .includes(query)
      );
    }

    if (sortMode === "points") {
      result.sort((a, b) => {
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points;
        }

        return a.rank - b.rank;
      });
    }

    if (sortMode === "predictions") {
      result.sort((a, b) => {
        if (
          b.prediction_count !==
          a.prediction_count
        ) {
          return (
            b.prediction_count -
            a.prediction_count
          );
        }

        return a.rank - b.rank;
      });
    }

    if (sortMode === "rank") {
      result.sort((a, b) => a.rank - b.rank);
    }

    return result;
  }, [players, search, sortMode]);

  const topThree = useMemo(() => {
    return {
      first: players.find(
        (player) => player.rank === 1
      ),
      second: players.find(
        (player) => player.rank === 2
      ),
      third: players.find(
        (player) => player.rank === 3
      ),
    };
  }, [players]);

  const totalPredictions = useMemo(
    () =>
      players.reduce(
        (sum, player) =>
          sum + (player.prediction_count || 0),
        0
      ),
    [players]
  );

  const averagePoints =
    players.length > 0
      ? Math.round(
          players.reduce(
            (sum, player) =>
              sum + (player.total_points || 0),
            0
          ) / players.length
        )
      : 0;

  return (
    <main
      className="min-h-screen bg-[#f4f7fb] text-slate-900"
      style={{
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .title {
          letter-spacing: -0.04em;
        }

        .card-shadow {
          box-shadow:
            0 2px 8px rgba(15, 39, 71, 0.04),
            0 12px 35px rgba(15, 39, 71, 0.06);
        }

        .hero-shadow {
          box-shadow:
            0 18px 50px rgba(15, 39, 71, 0.16);
        }

        .player-row {
          transition:
            background-color 0.15s ease,
            transform 0.15s ease;
        }

        .player-row:hover {
          background: #f8fafc;
        }
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f2747] text-xl shadow-lg">
              ⚽
            </div>

            <div className="min-w-0 text-left">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-blue-600">
                FOOTBALL
              </p>

              <p className="title truncate text-lg font-black text-[#0f2747] sm:text-xl">
                TAHMİN
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadLeaderboard(true)}
              disabled={refreshing}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:opacity-50"
              title="Yenile"
            >
              {refreshing ? "⏳" : "↻"}
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="rounded-xl bg-[#0f2747] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#16355e] sm:text-sm"
            >
              ← Ana Sayfa
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        {/* HERO */}
        <section className="hero-shadow overflow-hidden rounded-2xl bg-[#0f2747] sm:rounded-3xl">
          <div className="relative px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-blue-200">
                🏆 Liderlik Tablosu
              </div>

              <h1 className="title mt-4 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
                Puan Sıralaması
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Tahminlerden kazandığın puanlarla diğer
                oyuncularla sıralamadaki yerini takip et.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300">
                    Oyuncu
                  </p>

                  <p className="mt-1 text-xl font-extrabold text-white">
                    {players.length}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300">
                    Toplam Tahmin
                  </p>

                  <p className="mt-1 text-xl font-extrabold text-white">
                    {totalPredictions}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300">
                    Ortalama Puan
                  </p>

                  <p className="mt-1 text-xl font-extrabold text-white">
                    {averagePoints}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-400/20 bg-blue-500/20 px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-blue-200">
                    Senin Puanın
                  </p>

                  <p className="mt-1 text-xl font-extrabold text-white">
                    {myPlayer?.total_points ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="mt-6 space-y-4">
            <div className="h-72 animate-pulse rounded-3xl bg-white shadow-sm" />

            <div className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />

            <div className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />

            <div className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
          </section>
        ) : players.length === 0 ? (
          <section className="card-shadow mt-6 rounded-3xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
              🏆
            </div>

            <h2 className="mt-5 text-xl font-black text-[#0f2747]">
              Henüz sıralama yok
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              İlk tahminleri yaparak puan kazanmaya
              başlayabilirsin.
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/tahmin";
              }}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              🎯 Tahmin Yap
            </button>
          </section>
        ) : (
          <>
            {/* TOP 3 */}
            <section className="mt-7 sm:mt-9">
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                  Zirve
                </p>

                <h2 className="title mt-1 text-2xl font-extrabold text-[#0f2747] sm:text-3xl">
                  Liderler
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  En yüksek puana sahip oyuncular
                </p>
              </div>

              <div className="grid items-end gap-3 md:grid-cols-3 md:gap-5">
                {/* SECOND */}
                {topThree.second && (
                  <div
                    className={`order-2 rounded-2xl border bg-white p-5 text-center card-shadow md:order-1 md:mb-5 ${
                      topThree.second.user_id === myUserId
                        ? "border-blue-300 ring-4 ring-blue-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
                      🥈
                    </div>

                    <p className="mt-4 truncate text-lg font-extrabold text-[#0f2747]">
                      {topThree.second.display_name}
                    </p>

                    {topThree.second.user_id === myUserId && (
                      <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-[9px] font-extrabold text-blue-600">
                        SEN
                      </span>
                    )}

                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <p className="text-3xl font-extrabold text-[#0f2747]">
                        {topThree.second.total_points}
                      </p>

                      <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Puan
                      </p>
                    </div>

                    <p className="mt-3 text-xs font-semibold text-slate-400">
                      🎯 {topThree.second.prediction_count} tahmin
                    </p>
                  </div>
                )}

                {/* FIRST */}
                {topThree.first && (
                  <div
                    className={`order-1 rounded-3xl border bg-white p-6 text-center card-shadow md:order-2 ${
                      topThree.first.user_id === myUserId
                        ? "border-blue-300 ring-4 ring-blue-50"
                        : "border-blue-100"
                    }`}
                  >
                    <div className="relative mx-auto w-fit">
                      <div className="absolute -right-4 -top-4 text-xl">
                        ✨
                      </div>

                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 text-5xl shadow-lg">
                        👑
                      </div>
                    </div>

                    <p className="mt-5 truncate text-2xl font-extrabold text-[#0f2747]">
                      {topThree.first.display_name}
                    </p>

                    {topThree.first.user_id === myUserId && (
                      <span className="mt-2 inline-flex rounded-full bg-blue-600 px-3 py-1 text-[9px] font-extrabold text-white">
                        SEN
                      </span>
                    )}

                    <div className="mt-5 rounded-2xl bg-[#0f2747] p-5 text-white">
                      <p className="text-4xl font-extrabold">
                        {topThree.first.total_points}
                      </p>

                      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-blue-200">
                        Toplam Puan
                      </p>
                    </div>

                    <p className="mt-4 text-xs font-semibold text-slate-400">
                      🎯 {topThree.first.prediction_count} tahmin
                    </p>

                    <div className="mt-4 inline-flex rounded-full bg-yellow-50 px-4 py-2 text-[10px] font-extrabold text-yellow-600">
                      🥇 1. SIRA
                    </div>
                  </div>
                )}

                {/* THIRD */}
                {topThree.third && (
                  <div
                    className={`order-3 rounded-2xl border bg-white p-5 text-center card-shadow ${
                      topThree.third.user_id === myUserId
                        ? "border-blue-300 ring-4 ring-blue-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-3xl">
                      🥉
                    </div>

                    <p className="mt-4 truncate text-lg font-extrabold text-[#0f2747]">
                      {topThree.third.display_name}
                    </p>

                    {topThree.third.user_id === myUserId && (
                      <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-[9px] font-extrabold text-blue-600">
                        SEN
                      </span>
                    )}

                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <p className="text-3xl font-extrabold text-[#0f2747]">
                        {topThree.third.total_points}
                      </p>

                      <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Puan
                      </p>
                    </div>

                    <p className="mt-3 text-xs font-semibold text-slate-400">
                      🎯 {topThree.third.prediction_count} tahmin
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* MY POSITION */}
            {myPlayer && (
              <section className="mt-7">
                <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white card-shadow">
                  <div className="bg-blue-600 px-4 py-2.5">
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-white">
                      Senin Durumun
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f2747] text-lg font-extrabold text-white">
                        {myPlayer.rank}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-lg font-extrabold text-[#0f2747]">
                          {myPlayer.display_name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          🎯 {myPlayer.prediction_count} tahmin
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-3xl font-extrabold text-blue-600">
                        {myPlayer.total_points}
                      </p>

                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        toplam puan
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* PLAYER LIST */}
            <section className="mt-8">
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                  Sıralama
                </p>

                <h2 className="title mt-1 text-2xl font-extrabold text-[#0f2747] sm:text-3xl">
                  Tüm Oyuncular
                </h2>
              </div>

              {/* SEARCH + SORT */}
              <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    🔎
                  </span>

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Oyuncu ara..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium outline-none transition focus:border-blue-400 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setSortMode("rank")}
                    className={`rounded-lg px-3 py-2 text-[10px] font-extrabold transition sm:text-xs ${
                      sortMode === "rank"
                        ? "bg-[#0f2747] text-white shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    Sıra
                  </button>

                  <button
                    type="button"
                    onClick={() => setSortMode("points")}
                    className={`rounded-lg px-3 py-2 text-[10px] font-extrabold transition sm:text-xs ${
                      sortMode === "points"
                        ? "bg-[#0f2747] text-white shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    Puan
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSortMode("predictions")
                    }
                    className={`rounded-lg px-3 py-2 text-[10px] font-extrabold transition sm:text-xs ${
                      sortMode === "predictions"
                        ? "bg-[#0f2747] text-white shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    Tahmin
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white card-shadow">
                {/* DESKTOP HEADER */}
                <div className="hidden grid-cols-[80px_1fr_150px_150px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 md:grid">
                  <div>Sıra</div>

                  <div>Oyuncu</div>

                  <div className="text-center">
                    Tahmin
                  </div>

                  <div className="text-right">
                    Puan
                  </div>
                </div>

                {filteredPlayers.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="text-3xl">
                      🔎
                    </div>

                    <p className="mt-3 text-sm font-bold text-slate-500">
                      Oyuncu bulunamadı.
                    </p>
                  </div>
                ) : (
                  filteredPlayers.map((player) => {
                    const isMe =
                      player.user_id === myUserId;

                    const isTopThree =
                      player.rank <= 3;

                    return (
                      <div
                        key={player.user_id}
                        className={`player-row grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-3 py-4 last:border-b-0 md:grid-cols-[80px_1fr_150px_150px] md:gap-4 md:px-5 ${
                          isMe
                            ? "bg-blue-50/80"
                            : "bg-white"
                        }`}
                      >
                        {/* RANK */}
                        <div>
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold ${
                              player.rank === 1
                                ? "bg-yellow-100 text-yellow-700"
                                : player.rank === 2
                                  ? "bg-slate-200 text-slate-600"
                                  : player.rank === 3
                                    ? "bg-orange-100 text-orange-700"
                                    : isMe
                                      ? "bg-blue-600 text-white"
                                      : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {player.rank === 1
                              ? "🥇"
                              : player.rank === 2
                                ? "🥈"
                                : player.rank === 3
                                  ? "🥉"
                                  : player.rank}
                          </div>
                        </div>

                        {/* PLAYER */}
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <p
                              className={`truncate text-sm font-extrabold ${
                                isMe
                                  ? "text-blue-700"
                                  : "text-[#0f2747]"
                              }`}
                            >
                              {player.display_name}
                            </p>

                            {isMe && (
                              <span className="shrink-0 rounded-full bg-blue-600 px-2 py-1 text-[8px] font-extrabold text-white">
                                SEN
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-[10px] text-slate-400 md:hidden">
                            🎯 {player.prediction_count} tahmin
                          </p>
                        </div>

                        {/* PREDICTIONS */}
                        <div className="hidden text-center md:block">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500">
                            🎯 {player.prediction_count}
                          </span>
                        </div>

                        {/* POINTS */}
                        <div className="text-right">
                          <p
                            className={`text-xl font-extrabold ${
                              isMe
                                ? "text-blue-600"
                                : "text-[#0f2747]"
                            }`}
                          >
                            {player.total_points}
                          </p>

                          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                            puan
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* SCORING INFO */}
            <section className="mt-7">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 card-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                    🎯
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-[#0f2747]">
                      Puanlama Sistemi
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Maç tahminlerinde skor doğruluğuna göre
                      puan kazanırsın.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-emerald-50 p-3 text-center">
                    <p className="text-xl font-extrabold text-emerald-600">
                      20
                    </p>

                    <p className="mt-1 text-[9px] font-bold text-emerald-700">
                      TAM SKOR
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-3 text-center">
                    <p className="text-xl font-extrabold text-blue-600">
                      10
                    </p>

                    <p className="mt-1 text-[9px] font-bold text-blue-700">
                      1 FARK
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-50 p-3 text-center">
                    <p className="text-xl font-extrabold text-amber-600">
                      5
                    </p>

                    <p className="mt-1 text-[9px] font-bold text-amber-700">
                      2 FARK
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* FOOTER */}
        <footer className="py-8 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            ⚽ Futbol Tahmin
          </p>

          <p className="mt-1 text-[10px] text-slate-400">
            Tahmin et • Puan kazan • Sıralamada yüksel
          </p>
        </footer>
      </div>
    </main>
  );
}