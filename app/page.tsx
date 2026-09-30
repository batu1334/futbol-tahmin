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
  home_logo_url: string | null;
  away_logo_url: string | null;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [matchFilter, setMatchFilter] = useState<
    "all" | "upcoming" | "finished"
  >("all");

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

  const goTo = (path: string) => {
    setMenuOpen(false);
    window.location.href = path;
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

  const formatShortDate = (date: string) => {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getTeamInitial = (team: string) => {
    return team.trim().charAt(0).toUpperCase() || "⚽";
  };

  const TeamLogo = ({
    url,
    team,
    size = "normal",
  }: {
    url: string | null;
    team: string;
    size?: "normal" | "small";
  }) => {
    const logoClass =
      size === "small" ? "h-14 w-14" : "h-20 w-20";

    if (url) {
      return (
        <div
          className={`flex ${logoClass} items-center justify-center rounded-2xl border border-slate-100 bg-white p-2 shadow-sm`}
        >
          <img
            src={url}
            alt={`${team} logosu`}
            className="h-full w-full object-contain"
          />
        </div>
      );
    }

    return (
      <div
        className={`flex ${logoClass} items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 font-black text-slate-400 ${
          size === "small" ? "text-xl" : "text-2xl"
        }`}
      >
        {getTeamInitial(team)}
      </div>
    );
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

  const filteredMatches =
    matchFilter === "upcoming"
      ? upcomingMatches
      : matchFilter === "finished"
        ? finishedMatches
        : matches;

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
      {menuOpen && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-black/40"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white">
              ⚽
            </div>

            <div>
              <p className="font-black text-slate-900">
                Futbol Tahmin
              </p>

              <p className="text-xs font-bold text-blue-600">
                Menü
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl font-black text-slate-600 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Hesap
          </p>

          <p className="mt-1 truncate font-black text-slate-900">
            {profile.display_name || "Oyuncu"}
          </p>

          <p className="mt-1 truncate text-sm text-slate-500">
            {email}
          </p>
        </div>

        <nav className="flex-1 px-4 py-5">
          <button
            type="button"
            onClick={() => goTo("/")}
            className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-blue-50 px-4 py-4 text-left font-black text-blue-700"
          >
            <span className="text-xl">🏠</span>
            <span>Ana Sayfa</span>
          </button>

          <button
            type="button"
            onClick={() => goTo("/tahmin")}
            className="mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left font-black text-slate-700 hover:bg-slate-100"
          >
            <span className="text-xl">⚽</span>
            <span>Tahminler</span>
          </button>

          <button
            type="button"
            onClick={() => goTo("/siralama")}
            className="mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left font-black text-slate-700 hover:bg-slate-100"
          >
            <span className="text-xl">🏆</span>
            <span>Sıralama</span>
          </button>

          <button
            type="button"
            onClick={() => goTo("/profil")}
            className="mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left font-black text-slate-700 hover:bg-slate-100"
          >
            <span className="text-xl">👤</span>
            <span>Profil</span>
          </button>

          {profile.is_admin && (
            <button
              type="button"
              onClick={() => goTo("/admin")}
              className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-red-50 px-4 py-4 text-left font-black text-red-700 hover:bg-red-100"
            >
              <span className="text-xl">⚙️</span>
              <span>Admin Paneli</span>
            </button>
          )}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-4 font-black text-white hover:bg-red-700"
          >
            <span>🚪</span>
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      <header className="border-b border-blue-100 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menüyü aç"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-2xl font-black text-slate-700 hover:bg-slate-200"
            >
              ☰
            </button>

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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                Maç Merkezi
              </p>

              <h2 className="mt-1 text-3xl font-black text-slate-900">
                Maçlar
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Tüm maçları ve tahminlerini buradan takip edebilirsin.
              </p>
            </div>

            <button
              type="button"
              onClick={() => (window.location.href = "/tahmin")}
              className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700"
            >
              🎯 Tahmin Sayfası
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-white p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setMatchFilter("all")}
              className={`rounded-xl px-3 py-3 text-sm font-black transition ${
                matchFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Tümü
              <span className="ml-1 opacity-80">
                ({matches.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMatchFilter("upcoming")}
              className={`rounded-xl px-3 py-3 text-sm font-black transition ${
                matchFilter === "upcoming"
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Yaklaşan
              <span className="ml-1 opacity-80">
                ({upcomingMatches.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMatchFilter("finished")}
              className={`rounded-xl px-3 py-3 text-sm font-black transition ${
                matchFilter === "finished"
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Biten
              <span className="ml-1 opacity-80">
                ({finishedMatches.length})
              </span>
            </button>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="mt-5 rounded-3xl bg-white p-10 text-center shadow-sm">
              <div className="text-5xl">⚽</div>

              <p className="mt-4 font-bold text-slate-500">
                Bu kategoride maç bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {filteredMatches.map((match) => {
                const prediction = getPrediction(match.id);
                const isFinished = match.status === "finished";
                const isCancelled = match.status === "cancelled";

                return (
                  <article
                    key={match.id}
                    className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                            {match.league || "Futbol"}
                          </span>

                          {isFinished && (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                              Tamamlandı
                            </span>
                          )}

                          {isCancelled && (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                              İptal
                            </span>
                          )}

                          {!isFinished && !isCancelled && (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                match.schedule_confirmed
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {match.schedule_confirmed
                                ? "Onaylı"
                                : "Bekliyor"}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm font-bold text-slate-500">
                          {formatDate(match.kickoff)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Maç Saati
                        </p>

                        <p className="mt-1 font-black text-blue-700">
                          {formatShortDate(match.kickoff)}
                        </p>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
                        <div className="flex min-w-0 flex-col items-center text-center">
                          <TeamLogo
                            url={match.home_logo_url}
                            team={match.home_team}
                          />

                          <p className="mt-3 w-full break-words font-black text-slate-900">
                            {match.home_team}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-400">
                            Ev Sahibi
                          </p>
                        </div>

                        <div className="text-center">
                          {isFinished ? (
                            <div>
                              <div className="rounded-2xl bg-slate-100 px-5 py-3 text-2xl font-black text-slate-900">
                                {match.home_score ?? "-"}{" "}
                                -{" "}
                                {match.away_score ?? "-"}
                              </div>

                              {prediction && (
                                <div className="mt-2">
                                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                                    Tahmin:{" "}
                                    {prediction.home_score} -{" "}
                                    {prediction.away_score}
                                  </span>

                                  <p className="mt-2 text-xs font-black text-emerald-600">
                                    +{prediction.points} puan
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-xl bg-blue-50 px-4 py-3 font-black text-blue-600">
                              VS
                            </div>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-col items-center text-center">
                          <TeamLogo
                            url={match.away_logo_url}
                            team={match.away_team}
                          />

                          <p className="mt-3 w-full break-words font-black text-slate-900">
                            {match.away_team}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-400">
                            Deplasman
                          </p>
                        </div>
                      </div>

                      {!isFinished && !isCancelled && (
                        <div className="mt-5">
                          {prediction ? (
                            <div className="flex flex-col gap-3 rounded-2xl bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-black uppercase tracking-wider text-blue-500">
                                  Senin Tahminin
                                </p>

                                <p className="mt-1 text-xl font-black text-blue-800">
                                  {prediction.home_score} -{" "}
                                  {prediction.away_score}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  (window.location.href =
                                    `/tahmin?match=${match.id}`)
                                }
                                className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700"
                              >
                                Tahmini Gör / Değiştir
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                (window.location.href =
                                  `/tahmin?match=${match.id}`)
                              }
                              className="w-full rounded-xl bg-blue-600 px-4 py-3.5 font-black text-white hover:bg-blue-700"
                            >
                              🎯 Bu Maçı Tahmin Et
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}