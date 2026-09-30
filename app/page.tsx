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

  // Yayıncı için olası kolon isimleri
  broadcaster?: string | null;
  broadcast_channel?: string | null;
  channel?: string | null;
  tv_channel?: string | null;
  yayinci?: string | null;
  yayinci_kanal?: string | null;

  [key: string]: unknown;
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

type ViewMode = "cards" | "list";

export default function HomePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const [matchFilter, setMatchFilter] = useState<
    "all" | "upcoming" | "finished"
  >("all");

  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

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

    setMatches((matchesResult.data || []) as Match[]);
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

    const savedView = window.localStorage.getItem(
      "futbol-tahmin-view-mode"
    );

    if (savedView === "cards" || savedView === "list") {
      setViewMode(savedView);
    }

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

  useEffect(() => {
    if (!selectedMatch) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedMatch(null);
      }
    };

    document.addEventListener("keydown", handleEscape);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedMatch]);

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

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    window.localStorage.setItem(
      "futbol-tahmin-view-mode",
      mode
    );
  };

  const getPrediction = (matchId: number) => {
    return predictions.find(
      (prediction) => prediction.match_id === matchId
    );
  };

  const openMatchDetails = (match: Match) => {
    setSelectedMatch(match);
  };

  const getBroadcaster = (match: Match) => {
    const possibleKeys = [
      "broadcaster",
      "broadcast_channel",
      "broadcast",
      "channel",
      "tv_channel",
      "tv",
      "yayinci",
      "yayinci_kanal",
      "yayinci_bilgisi",
      "yayıncı",
      "yayıncı_kanal",
    ];

    for (const key of possibleKeys) {
      const value = match[key];

      if (
        typeof value === "string" &&
        value.trim().length > 0
      ) {
        return value.trim();
      }
    }

    return null;
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

  const formatListTime = (
    date: string | null,
    matchDate?: string | null
  ) => {
    if (date) {
      const parsed = new Date(date);

      if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(parsed);
      }
    }

    if (matchDate) {
      return "—";
    }

    return "—";
  };

  const formatListDate = (
    date: string | null,
    matchDate?: string | null
  ) => {
    if (date) {
      const parsed = new Date(date);

      if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat("tr-TR", {
          day: "2-digit",
          month: "2-digit",
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

    return "";
  };

  const formatOnlyDate = (
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

    return "Tarih belli değil";
  };

  const formatOnlyTime = (
    date: string | null,
    matchDate?: string | null
  ) => {
    if (!date) return "Saat belli değil";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Saat belli değil";
    }

    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsed);
  };

  const getTeamInitial = (team: string) => {
    return team.trim().charAt(0).toUpperCase() || "⚽";
  };

  const TeamLogo = ({
    url,
    team,
    small = false,
  }: {
    url: string | null;
    team: string;
    small?: boolean;
  }) => {
    if (url) {
      return (
        <div
          className={`flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm ${
            small
              ? "h-8 w-8 p-1"
              : "h-16 w-16 p-2 sm:h-20 sm:w-20"
          }`}
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
        className={`flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-400 shadow-sm ${
          small
            ? "h-8 w-8 text-xs"
            : "h-16 w-16 text-xl sm:h-20 sm:w-20"
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

  const confirmedUpcoming = upcomingMatches.filter(
    (match) => match.schedule_confirmed && match.kickoff
  ).length;

  const groupedMatches = filteredMatches.reduce(
    (groups, match) => {
      const league = match.league || "Diğer Maçlar";

      if (!groups[league]) {
        groups[league] = [];
      }

      groups[league].push(match);

      return groups;
    },
    {} as Record<string, Match[]>
  );

  const leagueGroups = Object.entries(groupedMatches);

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

  const selectedPrediction = selectedMatch
    ? getPrediction(selectedMatch.id)
    : null;

  const selectedIsFinished =
    selectedMatch?.status === "finished";

  const selectedIsCancelled =
    selectedMatch?.status === "cancelled";

  const selectedCanPredict =
    Boolean(selectedMatch) &&
    !selectedIsFinished &&
    !selectedIsCancelled &&
    Boolean(selectedMatch?.schedule_confirmed) &&
    Boolean(selectedMatch?.kickoff);

  const selectedBroadcaster = selectedMatch
    ? getBroadcaster(selectedMatch)
    : null;

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
          box-shadow: 0 15px 45px rgba(15, 39, 71, 0.18);
        }

        .list-row {
          transition:
            background-color 0.15s ease,
            transform 0.15s ease;
          cursor: pointer;
        }

        .list-row:hover {
          background-color: #f8fafc;
        }

        .match-clickable {
          cursor: pointer;
        }

        .match-clickable:hover {
          border-color: #bfdbfe;
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
                Maça tıklayarak tarih, saat ve yayıncı bilgilerini
                görebilirsin.
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

          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <div className="px-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Görünüm
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => changeViewMode("cards")}
                className={`flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
                  viewMode === "cards"
                    ? "bg-[#0f2747] text-white shadow-sm"
                    : "text-slate-500 hover:bg-white"
                }`}
              >
                <span>▦</span>
                Kart
              </button>

              <button
                type="button"
                onClick={() => changeViewMode("list")}
                className={`flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
                  viewMode === "list"
                    ? "bg-[#0f2747] text-white shadow-sm"
                    : "text-slate-500 hover:bg-white"
                }`}
              >
                <span>☰</span>
                Liste
              </button>
            </div>
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
          ) : viewMode === "cards" ? (
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
                    onClick={() => openMatchDetails(match)}
                    className="card-shadow match-clickable overflow-hidden rounded-2xl border border-slate-200 bg-white transition"
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

                      <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <span className="text-xs">ℹ️</span>
                        <span className="text-[10px] font-bold text-slate-500">
                          Maç detayları için tıkla
                        </span>
                      </div>

                      {!isFinished && !isCancelled && (
                        <div className="mt-3">
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
                                onClick={(event) => {
                                  event.stopPropagation();
                                  window.location.href = `/tahmin?match=${match.id}`;
                                }}
                                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 sm:w-auto"
                              >
                                Tahmini Gör / Değiştir
                              </button>
                            </div>
                          ) : canPredict ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                window.location.href = `/tahmin?match=${match.id}`;
                              }}
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
          ) : (
            <div className="mt-4 space-y-4">
              {leagueGroups.map(([league, leagueMatches]) => (
                <section
                  key={league}
                  className="card-shadow overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 bg-[#0f2747] px-4 py-3.5 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm">
                        ⚽
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold uppercase tracking-wide text-white sm:text-sm">
                          {league}
                        </p>

                        <p className="mt-0.5 text-[9px] font-medium text-slate-300">
                          {leagueMatches.length} maç
                        </p>
                      </div>
                    </div>

                    <span className="hidden rounded-full bg-white/10 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-300 sm:block">
                      Maçlar
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {leagueMatches.map((match) => {
                      const prediction = getPrediction(match.id);
                      const isFinished =
                        match.status === "finished";
                      const isCancelled =
                        match.status === "cancelled";

                      const canPredict =
                        !isFinished &&
                        !isCancelled &&
                        match.schedule_confirmed &&
                        Boolean(match.kickoff);

                      return (
                        <div
                          key={match.id}
                          onClick={() => openMatchDetails(match)}
                          className="list-row px-3 py-3.5 sm:px-5 sm:py-4"
                        >
                          <div className="hidden items-center gap-4 md:grid md:grid-cols-[80px_minmax(0,1fr)_90px_minmax(0,1fr)_auto]">
                            <div className="text-center">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                Tarih
                              </p>

                              <p className="mt-1 text-xs font-bold text-[#0f2747]">
                                {formatListDate(
                                  match.kickoff,
                                  match.match_date
                                )}
                              </p>

                              <p className="mt-0.5 text-sm font-extrabold text-blue-600">
                                {formatListTime(
                                  match.kickoff,
                                  match.match_date
                                )}
                              </p>
                            </div>

                            <div className="flex min-w-0 items-center justify-end gap-3">
                              <p className="truncate text-right text-sm font-bold text-[#0f2747]">
                                {match.home_team}
                              </p>

                              <TeamLogo
                                url={match.home_logo_url}
                                team={match.home_team}
                                small
                              />
                            </div>

                            <div className="flex flex-col items-center">
                              {isFinished ? (
                                <div className="rounded-lg bg-[#0f2747] px-3 py-2">
                                  <p className="text-sm font-extrabold text-white">
                                    {match.home_score ?? "-"}
                                    <span className="mx-1 text-slate-400">
                                      -
                                    </span>
                                    {match.away_score ?? "-"}
                                  </p>
                                </div>
                              ) : isCancelled ? (
                                <span className="rounded-lg bg-red-50 px-2.5 py-2 text-[9px] font-bold text-red-600">
                                  İPTAL
                                </span>
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[9px] font-extrabold text-slate-500">
                                  VS
                                </div>
                              )}

                              {prediction && (
                                <p className="mt-1 text-[9px] font-bold text-blue-600">
                                  Tahmin {prediction.home_score}-
                                  {prediction.away_score}
                                </p>
                              )}
                            </div>

                            <div className="flex min-w-0 items-center justify-start gap-3">
                              <TeamLogo
                                url={match.away_logo_url}
                                team={match.away_team}
                                small
                              />

                              <p className="truncate text-sm font-bold text-[#0f2747]">
                                {match.away_team}
                              </p>
                            </div>

                            <div className="flex justify-end">
                              {isFinished ? (
                                prediction ? (
                                  <div className="text-right">
                                    <p
                                      className={`text-xs font-extrabold ${
                                        prediction.points > 0
                                          ? "text-emerald-600"
                                          : "text-slate-400"
                                      }`}
                                    >
                                      +{prediction.points}
                                    </p>

                                    <p className="text-[8px] font-semibold uppercase text-slate-400">
                                      Puan
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    Detay →
                                  </span>
                                )
                              ) : canPredict ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    window.location.href = `/tahmin?match=${match.id}`;
                                  }}
                                  className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-blue-700"
                                >
                                  {prediction
                                    ? "Değiştir"
                                    : "Tahmin Et"}
                                </button>
                              ) : (
                                <span className="rounded-lg bg-amber-50 px-3 py-2 text-[9px] font-bold text-amber-600">
                                  Bekliyor
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="md:hidden">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-[58px] text-center">
                                <p className="text-[9px] font-bold text-slate-400">
                                  {formatListDate(
                                    match.kickoff,
                                    match.match_date
                                  )}
                                </p>

                                <p className="mt-0.5 text-sm font-extrabold text-blue-600">
                                  {formatListTime(
                                    match.kickoff,
                                    match.match_date
                                  )}
                                </p>
                              </div>

                              <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                                <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                                  <p className="truncate text-right text-xs font-bold text-[#0f2747]">
                                    {match.home_team}
                                  </p>

                                  <TeamLogo
                                    url={match.home_logo_url}
                                    team={match.home_team}
                                    small
                                  />
                                </div>

                                <div className="flex w-12 shrink-0 flex-col items-center">
                                  {isFinished ? (
                                    <span className="rounded-lg bg-[#0f2747] px-2.5 py-1.5 text-xs font-extrabold text-white">
                                      {match.home_score ?? "-"}-
                                      {match.away_score ?? "-"}
                                    </span>
                                  ) : isCancelled ? (
                                    <span className="rounded-lg bg-red-50 px-2 py-1.5 text-[8px] font-bold text-red-600">
                                      İPTAL
                                    </span>
                                  ) : (
                                    <span className="rounded-lg bg-slate-100 px-2 py-1.5 text-[9px] font-extrabold text-slate-500">
                                      VS
                                    </span>
                                  )}
                                </div>

                                <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
                                  <TeamLogo
                                    url={match.away_logo_url}
                                    team={match.away_team}
                                    small
                                  />

                                  <p className="truncate text-xs font-bold text-[#0f2747]">
                                    {match.away_team}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <div>
                                {isFinished && prediction ? (
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">
                                      Tahmin {prediction.home_score}-
                                      {prediction.away_score}
                                    </span>

                                    <span
                                      className={`text-[10px] font-extrabold ${
                                        prediction.points > 0
                                          ? "text-emerald-600"
                                          : "text-slate-400"
                                      }`}
                                    >
                                      +{prediction.points} puan
                                    </span>
                                  </div>
                                ) : prediction ? (
                                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">
                                    Tahmin {prediction.home_score}-
                                    {prediction.away_score}
                                  </span>
                                ) : isFinished ? (
                                  <span className="text-[9px] font-semibold text-slate-400">
                                    Tahmin yapılmadı
                                  </span>
                                ) : (
                                  <span
                                    className={`text-[9px] font-semibold ${
                                      match.schedule_confirmed &&
                                      match.kickoff
                                        ? "text-emerald-600"
                                        : "text-amber-600"
                                    }`}
                                  >
                                    {match.schedule_confirmed &&
                                    match.kickoff
                                      ? "Tahmine açık"
                                      : "Saat bekleniyor"}
                                  </span>
                                )}
                              </div>

                              {!isFinished &&
                                !isCancelled &&
                                canPredict && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      window.location.href = `/tahmin?match=${match.id}`;
                                    }}
                                    className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-blue-700"
                                  >
                                    {prediction
                                      ? "Değiştir →"
                                      : "Tahmin Et →"}
                                  </button>
                                )}

                              {isCancelled && (
                                <span className="rounded-lg bg-red-50 px-3 py-2 text-[9px] font-bold text-red-600">
                                  İptal
                                </span>
                              )}

                              {!isCancelled && !canPredict && !isFinished && (
                                <span className="text-[9px] font-bold text-slate-400">
                                  Detay için dokun →
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <footer className="py-8 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            ⚽ Futbol Tahmin • Kendi tahminini yap
          </p>
        </footer>
      </div>

      {/* =========================================================
          MAÇ DETAY MODALI
      ========================================================= */}
      {selectedMatch && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setSelectedMatch(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
          >
            {/* MODAL HEADER */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                  Maç Detayları
                </p>

                <p className="mt-1 text-sm font-extrabold text-[#0f2747]">
                  {selectedMatch.league || "Futbol"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-7">
              {/* TAKIMLAR */}
              <div className="rounded-2xl bg-[#0f2747] p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                    <div className="rounded-2xl bg-white p-2 shadow-sm">
                      <TeamLogo
                        url={selectedMatch.home_logo_url}
                        team={selectedMatch.home_team}
                      />
                    </div>

                    <p className="mt-3 break-words text-sm font-extrabold leading-5 text-white sm:text-base">
                      {selectedMatch.home_team}
                    </p>

                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                      Ev Sahibi
                    </p>
                  </div>

                  <div className="flex min-w-[75px] flex-col items-center">
                    {selectedIsFinished ? (
                      <div className="rounded-xl bg-white px-4 py-3">
                        <p className="text-2xl font-extrabold text-[#0f2747]">
                          {selectedMatch.home_score ?? "-"}
                          <span className="mx-1 text-slate-400">
                            -
                          </span>
                          {selectedMatch.away_score ?? "-"}
                        </p>
                      </div>
                    ) : selectedIsCancelled ? (
                      <div className="rounded-xl bg-red-500 px-3 py-2">
                        <p className="text-xs font-extrabold text-white">
                          İPTAL
                        </p>
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                        <span className="text-xs font-extrabold text-white">
                          VS
                        </span>
                      </div>
                    )}

                    <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      {selectedIsFinished
                        ? "Maç Sonucu"
                        : selectedIsCancelled
                          ? "İptal"
                          : "Karşılaşma"}
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                    <div className="rounded-2xl bg-white p-2 shadow-sm">
                      <TeamLogo
                        url={selectedMatch.away_logo_url}
                        team={selectedMatch.away_team}
                      />
                    </div>

                    <p className="mt-3 break-words text-sm font-extrabold leading-5 text-white sm:text-base">
                      {selectedMatch.away_team}
                    </p>

                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                      Deplasman
                    </p>
                  </div>
                </div>
              </div>

              {/* TARİH / SAAT / YAYINCI */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>

                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      Tarih
                    </p>
                  </div>

                  <p className="mt-2 text-sm font-extrabold capitalize text-[#0f2747]">
                    {formatOnlyDate(
                      selectedMatch.kickoff,
                      selectedMatch.match_date
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🕐</span>

                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      Saat
                    </p>
                  </div>

                  <p className="mt-2 text-lg font-extrabold text-blue-600">
                    {formatOnlyTime(selectedMatch.kickoff)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📺</span>

                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      Yayıncı
                    </p>
                  </div>

                  <p className="mt-2 text-sm font-extrabold text-[#0f2747]">
                    {selectedBroadcaster || "Yayıncı bilgisi yok"}
                  </p>
                </div>
              </div>

              {/* DURUM */}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      Maç Durumu
                    </p>

                    <p className="mt-1 text-sm font-extrabold capitalize text-[#0f2747]">
                      {selectedMatch.status === "finished"
                        ? "Tamamlandı"
                        : selectedMatch.status === "cancelled"
                          ? "İptal edildi"
                          : selectedMatch.schedule_confirmed &&
                              selectedMatch.kickoff
                            ? "Program onaylı"
                            : "Saat bekleniyor"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${
                      selectedIsFinished
                        ? "bg-emerald-50 text-emerald-700"
                        : selectedIsCancelled
                          ? "bg-red-50 text-red-600"
                          : selectedMatch.schedule_confirmed &&
                              selectedMatch.kickoff
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {selectedIsFinished
                      ? "BİTTİ"
                      : selectedIsCancelled
                        ? "İPTAL"
                        : selectedMatch.schedule_confirmed &&
                            selectedMatch.kickoff
                          ? "ONAYLI"
                          : "BEKLİYOR"}
                  </span>
                </div>
              </div>

              {/* TAHMİN */}
              {selectedPrediction && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-blue-600">
                    Senin Tahminin
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="text-2xl font-extrabold text-[#0f2747]">
                      {selectedPrediction.home_score}
                      <span className="mx-2 text-slate-400">
                        -
                      </span>
                      {selectedPrediction.away_score}
                    </p>

                    {selectedIsFinished && (
                      <div className="text-right">
                        <p
                          className={`text-xl font-extrabold ${
                            selectedPrediction.points > 0
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }`}
                        >
                          +{selectedPrediction.points}
                        </p>

                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Kazanılan puan
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAHMİN BUTONU */}
              {selectedCanPredict && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `/tahmin?match=${selectedMatch.id}`;
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
                >
                  🎯
                  {selectedPrediction
                    ? "Tahmini Gör / Değiştir"
                    : "Bu Maçı Tahmin Et"}
                  <span>→</span>
                </button>
              )}

              {/* KAPAT */}
              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}