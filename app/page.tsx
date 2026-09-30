"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string | null;
  match_date?: string | null;
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

    if (matchesResult.error) console.error(matchesResult.error);
    if (predictionsResult.error) console.error(predictionsResult.error);
    if (bonusResult.error) console.error(bonusResult.error);

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

  const formatDate = (
    date: string | null,
    matchDate?: string | null
  ) => {
    if (date) {
      const parsed = new Date(date);

      if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat("tr-TR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(parsed);
      }
    }

    if (matchDate) {
      const parsed = new Date(`${matchDate}T00:00:00`);

      if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat("tr-TR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(parsed);
      }
    }

    return "Tarih henüz belli değil";
  };

  const formatShortDate = (
    date: string | null,
    matchDate?: string | null
  ) => {
    if (date) {
      const parsed = new Date(date);

      if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(parsed);
      }
    }

    if (matchDate) {
      const parsed = new Date(`${matchDate}T00:00:00`);

      if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat("tr-TR", {
          day: "2-digit",
          month: "2-digit",
        }).format(parsed);
      }
    }

    return "Saat yok";
  };

  const getTeamInitial = (team: string) => {
    return team.trim().charAt(0).toUpperCase() || "⚽";
  };

  const TeamLogo = ({
    url,
    team,
  }: {
    url: string | null;
    team: string;
  }) => {
    if (url) {
      return (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:h-20 sm:w-20">
          <img
            src={url}
            alt={`${team} logosu`}
            className="h-full w-full object-contain"
          />
        </div>
      );
    }

    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-xl font-bold text-slate-400 shadow-sm sm:h-20 sm:w-20">
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

  const confirmedUpcoming = upcomingMatches.filter(
    (match) => match.schedule_confirmed && match.kickoff
  ).length;

  if (loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900"
        style={{
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f2747] text-3xl shadow-lg">
            ⚽
          </div>

          <div className="mx-auto mt-5 h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
          </div>

          <p className="mt-4 text-xs font-semibold tracking-widest text-slate-400">
            YÜKLENİYOR
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[#f4f7fb] text-slate-900"
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

        .page-title {
          letter-spacing: -0.035em;
        }

        .nav-shadow {
          box-shadow: 0 1px 0 rgba(15, 39, 71, 0.08);
        }

        .card-shadow {
          box-shadow:
            0 2px 8px rgba(15, 39, 71, 0.04),
            0 12px 35px rgba(15, 39, 71, 0.06);
        }

        .hero-shadow {
          box-shadow:
            0 15px 45px rgba(15, 39, 71, 0.18);
        }
      `}</style>

      {menuOpen && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[290px] max-w-[88vw] flex-col bg-white shadow-2xl transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f2747] text-xl">
              ⚽
            </div>

            <div>
              <p className="page-title text-base font-extrabold text-[#0f2747]">
                Futbol Tahmin
              </p>

              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-blue-600">
                Tahmin Platformu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-semibold text-slate-500"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-slate-100 p-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Oyuncu
            </p>

            <p className="mt-2 truncate text-base font-bold text-[#0f2747]">
              {profile.display_name || "Oyuncu"}
            </p>

            <p className="mt-1 truncate text-xs text-slate-400">
              {email}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-5">
          <button
            type="button"
            onClick={() => goTo("/")}
            className="mb-1 flex w-full items-center gap-3 rounded-xl bg-[#0f2747] px-4 py-3.5 text-left text-sm font-bold text-white"
          >
            <span>🏠</span>
            <span>Ana Sayfa</span>
          </button>

          <button
            type="button"
            onClick={() => goTo("/tahmin")}
            className="mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <span>🎯</span>
            <span>Tahminler</span>
          </button>

          <button
            type="button"
            onClick={() => goTo("/siralama")}
            className="mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <span>🏆</span>
            <span>Sıralama</span>
          </button>

          <button
            type="button"
            onClick={() => goTo("/profil")}
            className="mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <span>👤</span>
            <span>Profil</span>
          </button>

          {profile.is_admin && (
            <button
              type="button"
              onClick={() => goTo("/admin")}
              className="mb-1 flex w-full items-center gap-3 rounded-xl bg-red-50 px-4 py-3.5 text-left text-sm font-semibold text-red-600"
            >
              <span>⚙️</span>
              <span>Admin Paneli</span>
            </button>
          )}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-red-700"
          >
            <span>🚪</span>
            Çıkış Yap
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 nav-shadow backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menüyü aç"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl font-bold text-[#0f2747]"
            >
              ☰
            </button>

            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f2747] text-xl sm:flex">
                ⚽
              </div>

              <div className="min-w-0">
                <h1 className="page-title truncate text-base font-extrabold text-[#0f2747] sm:text-lg">
                  FUTBOL TAHMİN
                </h1>

                <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-blue-600">
                  Tahmin platformu
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => (window.location.href = "/tahmin")}
              className="rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 sm:px-4 sm:text-sm"
            >
              🎯 Tahmin
            </button>

            <button
              type="button"
              onClick={() => (window.location.href = "/siralama")}
              className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 sm:block"
            >
              🏆 Sıralama
            </button>

            <button
              type="button"
              onClick={() => (window.location.href = "/profil")}
              className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 sm:block"
            >
              👤 Profil
            </button>

            {profile.is_admin && (
              <button
                type="button"
                onClick={() => (window.location.href = "/admin")}
                className="hidden rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 md:block"
              >
                ⚙️ Admin
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white sm:block"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-7 lg:px-8">
        <section className="hero-shadow overflow-hidden rounded-2xl bg-[#0f2747] sm:rounded-3xl">
          <div className="relative px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <div className="absolute right-[-80px] top-[-100px] h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-200">
                  Hoş Geldin
                </span>

                {confirmedUpcoming > 0 && (
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-[10px] font-bold text-emerald-200">
                    {confirmedUpcoming} maç tahmine açık
                  </span>
                )}
              </div>

              <h2 className="page-title mt-4 max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
                {profile.display_name || "Oyuncu"}
              </h2>

              <p className="mt-2 text-2xl font-bold text-blue-300 sm:text-3xl">
                Maçını seç, tahminini yap.
              </p>

              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                Maçları takip et, doğru skorları yakala ve puan
                tablosunda yüksel.
              </p>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => (window.location.href = "/tahmin")}
                  className="rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#0f2747] shadow-sm transition hover:bg-slate-100"
                >
                  🎯 Tahmin Yap
                </button>

                <button
                  type="button"
                  onClick={() => (window.location.href = "/siralama")}
                  className="rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  🏆 Sıralamayı Gör
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:grid-cols-4">
          <div className="card-shadow rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Toplam Puan
              </p>

              <span className="text-lg">⚡</span>
            </div>

            <p className="mt-3 text-2xl font-extrabold text-[#0f2747] sm:text-3xl">
              {totalPoints}
            </p>

            <p className="mt-1 text-[10px] font-medium text-blue-600">
              Genel skor
            </p>
          </div>

          <div className="card-shadow rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tahmin
              </p>

              <span className="text-lg">🎯</span>
            </div>

            <p className="mt-3 text-2xl font-extrabold text-[#0f2747] sm:text-3xl">
              {predictions.length}
            </p>

            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Yapılan tahmin
            </p>
          </div>

          <div className="card-shadow rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tam İsabet
              </p>

              <span className="text-lg">🎯</span>
            </div>

            <p className="mt-3 text-2xl font-extrabold text-[#0f2747] sm:text-3xl">
              {exactScores}
            </p>

            <p className="mt-1 text-[10px] font-medium text-slate-400">
              20 puanlık skor
            </p>
          </div>

          <div className="card-shadow rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Bonus
              </p>

              <span className="text-lg">🔥</span>
            </div>

            <p className="mt-3 text-2xl font-extrabold text-[#0f2747] sm:text-3xl">
              {bonusPoints}
            </p>

            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Bonus puanı
            </p>
          </div>
        </section>

        <section className="mt-8 sm:mt-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                Maç Merkezi
              </p>

              <h2 className="page-title mt-1 text-2xl font-extrabold text-[#0f2747] sm:text-3xl">
                Maçlar
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Maçları ve tahminlerini buradan takip edebilirsin.
              </p>
            </div>

            <button
              type="button"
              onClick={() => (window.location.href = "/tahmin")}
              className="self-start rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 sm:self-auto"
            >
              Tüm tahminler →
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setMatchFilter("all")}
              className={`rounded-lg px-2 py-3 text-xs font-bold transition sm:text-sm ${
                matchFilter === "all"
                  ? "bg-[#0f2747] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Tümü
              <span className="ml-1 opacity-70">
                ({matches.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMatchFilter("upcoming")}
              className={`rounded-lg px-2 py-3 text-xs font-bold transition sm:text-sm ${
                matchFilter === "upcoming"
                  ? "bg-[#0f2747] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Yaklaşan
              <span className="ml-1 opacity-70">
                ({upcomingMatches.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMatchFilter("finished")}
              className={`rounded-lg px-2 py-3 text-xs font-bold transition sm:text-sm ${
                matchFilter === "finished"
                  ? "bg-[#0f2747] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Biten
              <span className="ml-1 opacity-70">
                ({finishedMatches.length})
              </span>
            </button>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="card-shadow mt-4 rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                ⚽
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-500">
                Bu kategoride maç bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {filteredMatches.map((match) => {
                const prediction = getPrediction(match.id);
                const isFinished = match.status === "finished";
                const isCancelled = match.status === "cancelled";

                const canPredict =
                  !isFinished &&
                  !isCancelled &&
                  match.schedule_confirmed &&
                  Boolean(match.kickoff);

                return (
                  <article
                    key={match.id}
                    className="card-shadow overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                              {match.league || "Futbol"}
                            </span>

                            {isFinished && (
                              <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                ✓ Tamamlandı
                              </span>
                            )}

                            {isCancelled && (
                              <span className="rounded-md bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600">
                                ✕ İptal
                              </span>
                            )}

                            {!isFinished && !isCancelled && (
                              <span
                                className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${
                                  match.schedule_confirmed &&
                                  match.kickoff
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {match.schedule_confirmed &&
                                match.kickoff
                                  ? "Program Onaylı"
                                  : "Saat Bekleniyor"}
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-xs font-medium capitalize text-slate-400">
                            {formatDate(
                              match.kickoff,
                              match.match_date
                            )}
                          </p>
                        </div>

                        <div className="self-start rounded-xl bg-slate-50 px-3.5 py-2.5 text-left sm:self-auto sm:text-center">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Maç zamanı
                          </p>

                          <p className="mt-1 text-sm font-bold text-[#0f2747]">
                            {formatShortDate(
                              match.kickoff,
                              match.match_date
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-5 sm:px-7 sm:py-7">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-8">
                        <div className="flex min-w-0 flex-col items-center text-center">
                          <TeamLogo
                            url={match.home_logo_url}
                            team={match.home_team}
                          />

                          <p className="mt-3 w-full break-words text-sm font-bold leading-5 text-[#0f2747] sm:text-base">
                            {match.home_team}
                          </p>

                          <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                            Ev Sahibi
                          </p>
                        </div>

                        <div className="flex min-w-[52px] flex-col items-center pt-3 text-center sm:pt-5">
                          {isFinished ? (
                            <>
                              <div className="rounded-xl bg-[#0f2747] px-3.5 py-2.5 sm:px-5">
                                <p className="text-xl font-extrabold text-white sm:text-2xl">
                                  {match.home_score ?? "-"}
                                  <span className="mx-1 text-slate-400">
                                    -
                                  </span>
                                  {match.away_score ?? "-"}
                                </p>
                              </div>

                              {prediction && (
                                <div className="mt-3 text-center">
                                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold text-blue-700">
                                    Tahmin {prediction.home_score}-
                                    {prediction.away_score}
                                  </span>

                                  <p
                                    className={`mt-2 text-xs font-bold ${
                                      prediction.points > 0
                                        ? "text-emerald-600"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    +{prediction.points} puan
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[11px] font-extrabold text-slate-500 sm:h-11 sm:w-11">
                              VS
                            </div>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-col items-center text-center">
                          <TeamLogo
                            url={match.away_logo_url}
                            team={match.away_team}
                          />

                          <p className="mt-3 w-full break-words text-sm font-bold leading-5 text-[#0f2747] sm:text-base">
                            {match.away_team}
                          </p>

                          <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                            Deplasman
                          </p>
                        </div>
                      </div>

                      {!isFinished && !isCancelled && (
                        <div className="mt-6">
                          {prediction ? (
                            <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-blue-600">
                                  Senin Tahminin
                                </p>

                                <p className="mt-1 text-xl font-extrabold text-[#0f2747]">
                                  {prediction.home_score}
                                  <span className="mx-1 text-slate-400">
                                    -
                                  </span>
                                  {prediction.away_score}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  (window.location.href =
                                    `/tahmin?match=${match.id}`)
                                }
                                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 sm:w-auto"
                              >
                                Tahmini Gör / Değiştir
                              </button>
                            </div>
                          ) : canPredict ? (
                            <button
                              type="button"
                              onClick={() =>
                                (window.location.href =
                                  `/tahmin?match=${match.id}`)
                              }
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                            >
                              🎯 Bu Maçı Tahmin Et
                              <span>→</span>
                            </button>
                          ) : (
                            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3.5 text-center">
                              <p className="text-xs font-bold text-amber-700">
                                ⏳ Maç saati henüz onaylanmadı
                              </p>

                              <p className="mt-1 text-[10px] font-medium text-amber-600/70">
                                Tahminler maç saati kesinleşince açılacak.
                              </p>
                            </div>
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

        <footer className="py-8 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            ⚽ Futbol Tahmin • Kendi tahminini yap
          </p>
        </footer>
      </div>
    </main>
  );
}