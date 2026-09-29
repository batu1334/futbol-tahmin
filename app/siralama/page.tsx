"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Player = {
  rank: number;
  user_id: string;
  display_name: string;
  total_points: number;
  prediction_count: number;
};

export default function SiralamaPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState("");

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    const userResult = await supabase.auth.getUser();

    if (!userResult.data.user) {
      window.location.href = "/login";
      return;
    }

    setMyUserId(userResult.data.user.id);

    const result = await supabase.rpc("get_leaderboard");

    if (result.error) {
      console.log(result.error);
      setLoading(false);
      return;
    }

    setPlayers(result.data || []);
    setLoading(false);
  }

  const first = players.find((player) => player.rank === 1);
  const second = players.find((player) => player.rank === 2);
  const third = players.find((player) => player.rank === 3);

  const remainingPlayers = players.filter(
    (player) => player.rank > 3
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-lg shadow-blue-200">
              ⚽
            </div>

            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600">
                FOOTBALL
              </p>

              <p className="text-xl font-black tracking-tight text-slate-950">
                TAHMİN
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
          >
            ← Ana Sayfa
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 md:py-10">
        {/* TITLE */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 p-7 text-white shadow-2xl shadow-blue-200 md:p-10">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur">
              <span>🏆</span>
              LİDERLİK TABLOSU
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
              Sıralama
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 md:text-base">
              Tahminlerinden kazandığın toplam puana göre oyuncuların
              sıralamasını görüntüle.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs text-blue-100">
                  Oyuncu
                </p>

                <p className="mt-1 text-xl font-black">
                  {players.length}
                </p>
              </div>

              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs text-blue-100">
                  Senin Puanın
                </p>

                <p className="mt-1 text-xl font-black">
                  {players.find(
                    (player) =>
                      player.user_id === myUserId
                  )?.total_points ?? 0}
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="mt-8 space-y-4">
            <div className="h-64 animate-pulse rounded-3xl bg-white shadow-sm" />

            <div className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
            <div className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
            <div className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
          </section>
        ) : players.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
              🏆
            </div>

            <h2 className="mt-5 text-xl font-black">
              Henüz sıralama yok
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              İlk tahminleri yaparak sıralamayı başlatabilirsin.
            </p>
          </section>
        ) : (
          <>
            {/* PODIUM */}
            <section className="mt-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="h-8 w-1.5 rounded-full bg-blue-600" />

                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Zirve
                  </h2>

                  <p className="text-sm text-slate-400">
                    En yüksek puana sahip oyuncular
                  </p>
                </div>
              </div>

              <div className="grid items-end gap-4 md:grid-cols-3">
                {/* 2ND */}
                {second && (
                  <div
                    className={
                      "order-2 rounded-3xl border bg-white p-5 text-center shadow-sm md:order-1 md:mb-5 " +
                      (second.user_id === myUserId
                        ? "border-blue-300 ring-4 ring-blue-50"
                        : "border-slate-200")
                    }
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-slate-200 bg-slate-100 text-3xl">
                      🥈
                    </div>

                    <div className="mt-4">
                      <p className="truncate text-lg font-black text-slate-900">
                        {second.display_name}
                      </p>

                      {second.user_id === myUserId && (
                        <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">
                          SEN
                        </span>
                      )}
                    </div>

                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                      <p className="text-3xl font-black text-slate-950">
                        {second.total_points}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        PUAN
                      </p>
                    </div>

                    <p className="mt-4 text-xs font-medium text-slate-400">
                      🎯 {second.prediction_count} tahmin
                    </p>
                  </div>
                )}

                {/* 1ST */}
                {first && (
                  <div
                    className={
                      "order-1 rounded-[2rem] border bg-white p-6 text-center shadow-xl md:order-2 " +
                      (first.user_id === myUserId
                        ? "border-blue-300 ring-4 ring-blue-50"
                        : "border-blue-100")
                    }
                  >
                    <div className="relative mx-auto w-fit">
                      <div className="absolute -right-5 -top-5 text-2xl">
                        ✨
                      </div>

                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 text-5xl shadow-lg shadow-yellow-200">
                        👑
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="text-2xl font-black text-slate-950">
                        {first.display_name}
                      </p>

                      {first.user_id === myUserId && (
                        <span className="mt-2 inline-flex rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
                          SEN
                        </span>
                      )}
                    </div>

                    <div className="mt-5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg shadow-blue-200">
                      <p className="text-4xl font-black">
                        {first.total_points}
                      </p>

                      <p className="mt-1 text-xs font-bold tracking-wider text-blue-100">
                        TOPLAM PUAN
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-slate-400">
                      <span>🎯</span>
                      {first.prediction_count} tahmin
                    </div>

                    <div className="mt-4 inline-flex rounded-full bg-yellow-50 px-4 py-2 text-xs font-black text-yellow-600">
                      🥇 1. SIRA
                    </div>
                  </div>
                )}

                {/* 3RD */}
                {third && (
                  <div
                    className={
                      "order-3 rounded-3xl border bg-white p-5 text-center shadow-sm md:mb-0 " +
                      (third.user_id === myUserId
                        ? "border-blue-300 ring-4 ring-blue-50"
                        : "border-slate-200")
                    }
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-orange-200 bg-orange-50 text-3xl">
                      🥉
                    </div>

                    <div className="mt-4">
                      <p className="truncate text-lg font-black text-slate-900">
                        {third.display_name}
                      </p>

                      {third.user_id === myUserId && (
                        <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">
                          SEN
                        </span>
                      )}
                    </div>

                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                      <p className="text-3xl font-black text-slate-950">
                        {third.total_points}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        PUAN
                      </p>
                    </div>

                    <p className="mt-4 text-xs font-medium text-slate-400">
                      🎯 {third.prediction_count} tahmin
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* OTHER PLAYERS */}
            {remainingPlayers.length > 0 && (
              <section className="mt-10">
                <div className="mb-5 flex items-center gap-3">
                  <div className="h-8 w-1.5 rounded-full bg-blue-600" />

                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Oyuncular
                    </h2>

                    <p className="text-sm text-slate-400">
                      Diğer sıralamalar
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  {/* TABLE HEADER */}
                  <div className="hidden grid-cols-[70px_1fr_140px_130px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 md:grid">
                    <div>Sıra</div>
                    <div>Oyuncu</div>
                    <div className="text-center">
                      Tahmin
                    </div>
                    <div className="text-right">
                      Puan
                    </div>
                  </div>

                  <div>
                    {remainingPlayers.map((player) => {
                      const isMe =
                        player.user_id === myUserId;

                      return (
                        <div
                          key={player.user_id}
                          className={
                            "grid grid-cols-[48px_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 md:grid-cols-[70px_1fr_140px_130px] md:gap-4 md:px-5 " +
                            (isMe
                              ? "bg-blue-50"
                              : "bg-white hover:bg-slate-50")
                          }
                        >
                          {/* RANK */}
                          <div>
                            <div
                              className={
                                "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black " +
                                (isMe
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-500")
                              }
                            >
                              {player.rank}
                            </div>
                          </div>

                          {/* PLAYER */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-black text-slate-900">
                                {player.display_name}
                              </p>

                              {isMe && (
                                <span className="shrink-0 rounded-full bg-blue-600 px-2 py-1 text-[9px] font-black text-white">
                                  SEN
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-slate-400 md:hidden">
                              🎯 {player.prediction_count} tahmin
                            </p>
                          </div>

                          {/* PREDICTIONS */}
                          <div className="hidden text-center md:block">
                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
                              🎯 {player.prediction_count}
                            </span>
                          </div>

                          {/* POINTS */}
                          <div className="text-right">
                            <p className="text-xl font-black text-blue-600">
                              {player.total_points}
                            </p>

                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              puan
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* MY POSITION */}
            {(() => {
              const myPlayer = players.find(
                (player) =>
                  player.user_id === myUserId
              );

              if (!myPlayer) {
                return null;
              }

              return (
                <section className="mt-8">
                  <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-5 shadow-sm md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-200">
                          {myPlayer.rank}
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-blue-500">
                            Senin Sıran
                          </p>

                          <p className="mt-1 text-lg font-black text-slate-950">
                            {myPlayer.display_name}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black text-blue-600">
                          {myPlayer.total_points}
                        </p>

                        <p className="text-xs font-semibold text-slate-400">
                          toplam puan
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })()}
          </>
        )}

        {/* FOOTER */}
        <footer className="mt-10 border-t border-slate-200 py-8 text-center">
          <p className="font-black text-slate-800">
            ⚽ FUTBOL TAHMİN
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Tahmin et • Puan kazan • Sıralamada yüksel
          </p>
        </footer>
      </div>
    </main>
  );
}