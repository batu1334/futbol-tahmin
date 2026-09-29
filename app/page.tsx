"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  league: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  schedule_confirmed: boolean;
};

type Prediction = {
  id: number;
  match_id: number;
  home_score: number;
  away_score: number;
  points: number;
};

type BonusAnswer = {
  id: number;
  question_id: number;
  answer: string;
  points: number;
};

type Profile = {
  display_name: string | null;
  is_admin: boolean;
};

export default function HomePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile>({
    display_name: "Oyuncu",
    is_admin: false,
  });

  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [bonusAnswers, setBonusAnswers] = useState<BonusAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (currentUserId: string) => {
    const [matchesResult, predictionsResult, bonusResult, profileResult] =
      await Promise.all([
        supabase
          .from("Matches")
          .select("*")
          .order("kickoff", { ascending: true }),

        supabase
          .from("Predictions")
          .select("*")
          .eq("user_id", currentUserId),

        supabase
          .from("BonusAnswers")
          .select("*")
          .eq("user_id", currentUserId),

        supabase
          .from("profiles")
          .select("display_name, is_admin")
          .eq("id", currentUserId)
          .maybeSingle(),
      ]);

    if (matchesResult.error) {
      console.error(matchesResult.error);
    }

    if (predictionsResult.error) {
      console.error(predictionsResult.error);
    }

    if (bonusResult.error) {
      console.error(bonusResult.error);
    }

    setMatches(matchesResult.data || []);
    setPredictions(predictionsResult.data || []);
    setBonusAnswers(bonusResult.data || []);

    if (profileResult.data) {
      setProfile({
        display_name: profileResult.data.display_name || "Oyuncu",
        is_admin: Boolean(profileResult.data.is_admin),
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        window.location.replace("/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      await loadData(user.id);

      if (mounted) {
        setLoading(false);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    const matchesChannel = supabase
      .channel("home-matches")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Matches",
        },
        () => {
          loadData(userId);
        }
      )
      .subscribe();

    const predictionsChannel = supabase
      .channel("home-predictions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Predictions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadData(userId);
        }
      )
      .subscribe();

    const bonusChannel = supabase
      .channel("home-bonus")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "BonusAnswers",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadData(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(predictionsChannel);
      supabase.removeChannel(bonusChannel);
    };
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut({
      scope: "local",
    });

    window.location.replace("/login");
  };

  const getPrediction = (matchId: number) => {
    return predictions.find(
      (prediction) => prediction.match_id === matchId
    );
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const matchPoints = predictions.reduce(
    (sum, prediction) => sum + (prediction.points || 0),
    0
  );

  const bonusPoints = bonusAnswers.reduce(
    (sum, answer) => sum + (answer.points || 0),
    0
  );

  const totalPoints = matchPoints + bonusPoints;

  const exactScores = predictions.filter(
    (prediction) => prediction.points === 20
  ).length;

  const upcomingMatches = matches.filter(
    (match) =>
      match.status !== "finished" &&
      match.status !== "cancelled"
  );

  const finishedMatches = matches.filter(
    (match) => match.status === "finished"
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="mt-4 font-bold text-slate-600">
            Yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <header className="border-b border-blue-100 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white">
              ⚽
            </div>

            <div>
              <h1 className="font-black text-slate-900">
                Futbol Tahmin
              </h1>
              <p className="text-xs font-bold text-blue-600">
                Tahmin Platformu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (window.location.href = "/tahmin")}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700"
            >
              🎯 Tahmin
            </button>

            <button
              type="button"
              onClick={() => (window.location.href = "/siralama")}
              className="hidden rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 hover:bg-blue-100 sm:block"
            >
              🏆 Sıralama
            </button>

            <button
              type="button"
              onClick={() => (window.location.href = "/profil")}
              className="hidden rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-200 sm:block"
            >
              👤 Profil
            </button>

            {profile.is_admin && (
              <button
                type="button"
                onClick={() => (window.location.href = "/admin")}
                className="hidden rounded-xl bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 hover:bg-red-100 md:block"
              >
                ⚙️ Admin
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-900 p-7 text-white shadow-xl sm:p-10">
          <p className="text-sm font-bold text-blue-200">
            Hoş geldin
          </p>

          <h2 className="mt-2 text-4xl font-black">
            {profile.display_name || "Oyuncu"}
          </h2>

          <p className="mt-2 text-sm text-blue-100">
            {email}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-5">
              <p className="text-xs font-bold text-blue-200">
                Toplam Puan
              </p>
              <p className="mt-2 text-3xl font-black">
                {totalPoints}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5">
              <p className="text-xs font-bold text-blue-200">
                Tahmin
              </p>
              <p className="mt-2 text-3xl font-black">
                {predictions.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5">
              <p className="text-xs font-bold text-blue-200">
                Tam İsabet
              </p>
              <p className="mt-2 text-3xl font-black">
                {exactScores}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5">
              <p className="text-xs font-bold text-blue-200">
                Bonus Puanı
              </p>
              <p className="mt-2 text-3xl font-black">
                {bonusPoints}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                Maç Programı
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">
                Yaklaşan Maçlar
              </h2>
            </div>

            <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-black text-blue-700">
              {upcomingMatches.length} maç
            </span>
          </div>

          {upcomingMatches.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <div className="text-5xl">⚽</div>
              <p className="mt-4 font-bold text-slate-500">
                Şu anda yaklaşan maç bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {upcomingMatches.map((match) => {
                const prediction = getPrediction(match.id);

                return (
                  <article
                    key={match.id}
                    className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm"
                  >
                    <div className="border-b border-blue-50 bg-blue-50/60 px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black text-blue-600">
                            {match.league || "Futbol"}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {formatDate(match.kickoff)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-black ${
                            match.schedule_confirmed
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {match.schedule_confirmed
                            ? "Onaylı"
                            : "Bekliyor"}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="text-right">
                          <p className="font-black text-slate-900">
                            {match.home_team}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Ev Sahibi
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-100 px-4 py-3 font-black text-blue-600">
                          VS
                        </div>

                        <div>
                          <p className="font-black text-slate-900">
                            {match.away_team}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Deplasman
                          </p>
                        </div>
                      </div>

                      {prediction ? (
                        <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-blue-700">
                              Tahminin
                            </span>

                            <span className="rounded-xl bg-white px-4 py-2 font-black text-blue-700">
                              {prediction.home_score} -{" "}
                              {prediction.away_score}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            (window.location.href =
                              `/tahmin?match=${match.id}`)
                          }
                          className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-black text-white hover:bg-blue-700"
                        >
                          🎯 Tahmin Yap
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10 pb-10">
          <h2 className="text-2xl font-black text-slate-900">
            Tamamlanan Maçlar
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {finishedMatches.slice(0, 6).map((match) => {
              const prediction = getPrediction(match.id);

              return (
                <div
                  key={match.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-900">
                        {match.home_team}
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-400">
                        {match.away_team}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-black">
                        {match.home_score} - {match.away_score}
                      </p>

                      {prediction && (
                        <p className="mt-1 text-xs font-black text-blue-600">
                          +{prediction.points} puan
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {finishedMatches.length === 0 && (
            <div className="mt-5 rounded-2xl bg-white p-8 text-center">
              <p className="font-bold text-slate-500">
                Henüz tamamlanan maç yok.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}