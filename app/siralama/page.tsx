"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Player = {
  id: string;
  display_name: string;
  score: number;
  predictions: number;
  polls: number;
};

export default function RankingPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.rpc("get_leaderboard");

    if (error) {
      console.error("Leaderboard error:", error);
      setError("Sıralama yüklenemedi: " + error.message);
      setLoading(false);
      return;
    }

    const ranking: Player[] = (data || []).map(
      (user: {
        id: string;
        display_name: string | null;
        score: number | string | null;
        predictions: number | string | null;
        polls: number | string | null;
      }) => ({
        id: user.id,
        display_name: user.display_name || "Oyuncu",
        score: Number(user.score) || 0,
        predictions: Number(user.predictions) || 0,
        polls: Number(user.polls) || 0,
      })
    );

    setPlayers(ranking);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b18] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-cyan-400/20 border-t-cyan-400 animate-spin" />

          <p className="font-black text-lg">
            Sıralama yükleniyor...
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Puanlar hesaplanıyor
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#070b18] text-white px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6">
            <h1 className="text-xl font-black">
              Sıralama yüklenemedi
            </h1>

            <p className="mt-2 text-sm text-red-200">
              {error}
            </p>

            <button
              onClick={loadRanking}
              className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:scale-[1.02]"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070b18] text-white px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#111a38] via-[#0d1530] to-[#070b18] p-6 sm:p-8 shadow-2xl">

          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative">

            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-black text-yellow-300">
              🏆 LİDERLİK TABLOSU
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Liderlik Tablosu
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              Tüm oyuncuların toplam puanlarına göre güncel sıralaması.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-4 py-2 text-xs font-bold text-cyan-300">
              ⚡ Toplam puana göre sıralanır
            </div>

          </div>
        </div>


        {/* EMPTY */}
        {players.length === 0 && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <div className="text-5xl">🏆</div>

            <h2 className="mt-4 text-xl font-black">
              Henüz oyuncu yok
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              İlk oyuncular puan kazandığında burada görünecek.
            </p>
          </div>
        )}


        {/* TOP 3 */}
        {players.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">

            {/* 1 */}
            {players[0] && (
              <div className="relative overflow-hidden rounded-3xl border border-yellow-400/30 bg-gradient-to-br from-yellow-400/20 via-orange-500/10 to-white/5 p-5 shadow-xl sm:order-2">

                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-yellow-400/10 blur-2xl" />

                <div className="relative text-center">

                  <div className="text-4xl">
                    🥇
                  </div>

                  <div className="mt-3 truncate text-lg font-black">
                    {players[0].display_name}
                  </div>

                  <div className="mt-2 text-3xl font-black text-yellow-300">
                    {players[0].score}
                  </div>

                  <div className="text-xs font-bold text-yellow-200/60">
                    PUAN
                  </div>

                </div>
              </div>
            )}


            {/* 2 */}
            {players[1] && (
              <div className="relative overflow-hidden rounded-3xl border border-slate-400/20 bg-white/5 p-5 sm:order-1">

                <div className="text-center">

                  <div className="text-4xl">
                    🥈
                  </div>

                  <div className="mt-3 truncate text-lg font-black">
                    {players[1].display_name}
                  </div>

                  <div className="mt-2 text-3xl font-black text-slate-200">
                    {players[1].score}
                  </div>

                  <div className="text-xs font-bold text-slate-500">
                    PUAN
                  </div>

                </div>
              </div>
            )}


            {/* 3 */}
            {players[2] && (
              <div className="relative overflow-hidden rounded-3xl border border-orange-400/20 bg-white/5 p-5 sm:order-3">

                <div className="text-center">

                  <div className="text-4xl">
                    🥉
                  </div>

                  <div className="mt-3 truncate text-lg font-black">
                    {players[2].display_name}
                  </div>

                  <div className="mt-2 text-3xl font-black text-orange-300">
                    {players[2].score}
                  </div>

                  <div className="text-xs font-bold text-orange-200/50">
                    PUAN
                  </div>

                </div>
              </div>
            )}

          </div>
        )}


        {/* ALL PLAYERS */}
        {players.length > 0 && (
          <div className="mt-8">

            <div className="mb-4 flex items-center justify-between">

              <div>
                <h2 className="text-xl font-black">
                  Tüm Oyuncular
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {players.length} oyuncu
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-400">
                TOPLAM PUAN
              </div>

            </div>


            <div className="space-y-3">

              {players.map((player, index) => {

                const isFirst = index === 0;
                const isSecond = index === 1;
                const isThird = index === 2;

                return (
                  <div
                    key={player.id}
                    className={`
                      group
                      relative
                      overflow-hidden
                      rounded-2xl
                      border
                      p-4
                      sm:p-5
                      transition-all
                      duration-200
                      hover:-translate-y-0.5
                      hover:bg-white/[0.07]

                      ${
                        isFirst
                          ? "border-yellow-400/30 bg-gradient-to-r from-yellow-400/10 to-orange-500/5"
                          : isSecond
                            ? "border-slate-400/20 bg-white/[0.045]"
                            : isThird
                              ? "border-orange-400/20 bg-white/[0.045]"
                              : "border-white/10 bg-white/[0.035]"
                      }
                    `}
                  >

                    <div className="flex items-center gap-3 sm:gap-4">

                      {/* POSITION */}
                      <div
                        className={`
                          flex
                          h-11
                          w-11
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          text-sm
                          font-black

                          ${
                            isFirst
                              ? "bg-gradient-to-br from-yellow-300 to-orange-500 text-black"
                              : isSecond
                                ? "bg-gradient-to-br from-slate-200 to-slate-500 text-black"
                                : isThird
                                  ? "bg-gradient-to-br from-orange-300 to-orange-600 text-black"
                                  : "bg-gradient-to-br from-cyan-400 to-violet-500 text-white"
                          }
                        `}
                      >
                        {index + 1}
                      </div>


                      {/* PLAYER */}
                      <div className="min-w-0 flex-1">

                        <h3 className="truncate text-base font-black sm:text-lg">
                          {player.display_name}
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500 sm:text-xs">

                          <span>
                            🎯 {player.predictions} tahmin
                          </span>

                          <span className="hidden text-slate-700 sm:inline">
                            •
                          </span>

                          <span>
                            🔥 {player.polls} anket
                          </span>

                        </div>

                      </div>


                      {/* SCORE */}
                      <div className="shrink-0 text-right">

                        <div
                          className={`
                            text-2xl
                            font-black
                            sm:text-3xl

                            ${
                              isFirst
                                ? "text-yellow-300"
                                : "text-cyan-300"
                            }
                          `}
                        >
                          {player.score}
                        </div>

                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          puan
                        </div>

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>
          </div>
        )}

      </div>
    </main>
  );
}