"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string | null;
  match_date?: string | null;
  league: string | null;
  status: string;
  home_score?: number | null;
  away_score?: number | null;
  home_logo_url?: string | null;
  away_logo_url?: string | null;
  broadcast_channel?: string | null;
};

type Prediction = {
  match_id: number;
  home_score: number;
  away_score: number;
};

type BonusQuestion = {
  id: number;
  match_id: number;
  question: string;
  question_type: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  points: number;
};

function formatKickoff(kickoff: string | null) {
  if (!kickoff) return "Saat henüz belli değil";

  const date = new Date(kickoff);

  if (Number.isNaN(date.getTime())) {
    return "Saat bilgisi yok";
  }

  return date.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(match: Match) {
  if (match.match_date) {
    const date = new Date(`${match.match_date}T12:00:00`);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("tr-TR", {
        timeZone: "Europe/Istanbul",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }

  if (match.kickoff) {
    const date = new Date(match.kickoff);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("tr-TR", {
        timeZone: "Europe/Istanbul",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }

  return "Tarih belirtilmedi";
}

function canPredict(kickoff: string | null) {
  if (!kickoff) return false;

  const kickoffDate = new Date(kickoff);

  if (Number.isNaN(kickoffDate.getTime())) {
    return false;
  }

  const deadline = kickoffDate.getTime() - 10 * 60 * 1000;

  return Date.now() < deadline;
}

function getPredictionStatus(kickoff: string | null) {
  if (!kickoff) return "Saat bilgisi bekleniyor";

  const kickoffDate = new Date(kickoff);

  if (Number.isNaN(kickoffDate.getTime())) {
    return "Saat bilgisi yok";
  }

  const deadline = kickoffDate.getTime() - 10 * 60 * 1000;

  if (Date.now() >= kickoffDate.getTime()) {
    return "Maç başladı / sona erdi";
  }

  if (Date.now() >= deadline) {
    return "Tahmin süresi kapandı";
  }

  return "Tahmin yapılabilir";
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<
    Record<number, Prediction>
  >({});

  const [bonusQuestions, setBonusQuestions] = useState<
    Record<number, BonusQuestion>
  >({});

  const [bonusAnswers, setBonusAnswers] = useState<
    Record<number, string>
  >({});

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);

    const userResult = await supabase.auth.getUser();

    if (userResult.data.user) {
      setUserEmail(userResult.data.user.email || "");
    }

    await Promise.all([
      loadMatches(),
      loadPredictions(),
      loadBonusQuestions(),
    ]);

    setLoading(false);
  }

  async function loadMatches() {
    const result = await supabase
      .from("Matches")
      .select(
        `
        id,
        home_team,
        away_team,
        kickoff,
        match_date,
        league,
        status,
        home_score,
        away_score,
        home_logo_url,
        away_logo_url,
        broadcast_channel
        `
      )
      .order("kickoff", {
        ascending: true,
      });

    if (result.error) {
      console.log("Maçları yükleme hatası:", result.error);
      return;
    }

    setMatches(result.data || []);
  }

  async function loadPredictions() {
    const userResult = await supabase.auth.getUser();

    if (!userResult.data.user) {
      return;
    }

    const result = await supabase
      .from("Predictions")
      .select("match_id, home_score, away_score")
      .eq("user_id", userResult.data.user.id);

    if (result.error) {
      console.log("Tahminleri yükleme hatası:", result.error);
      return;
    }

    const predictionMap: Record<number, Prediction> = {};

    for (const prediction of result.data || []) {
      predictionMap[prediction.match_id] = prediction;
    }

    setPredictions(predictionMap);
  }

  async function loadBonusQuestions() {
    const result = await supabase
      .from("BonusQuestions")
      .select(
        `
        id,
        match_id,
        question,
        question_type,
        option_a,
        option_b,
        option_c,
        option_d,
        points
        `
      );

    if (result.error) {
      console.log("Bonus soruları yükleme hatası:", result.error);
      return;
    }

    const questionMap: Record<number, BonusQuestion> = {};

    for (const question of result.data || []) {
      questionMap[question.match_id] = question;
    }

    setBonusQuestions(questionMap);
  }

  function openPrediction(match: Match) {
    setMessage("");
    setMessageType("");

    if (!canPredict(match.kickoff)) {
      setMessage(
        "Bu maç için tahmin süresi kapanmış. Tahminler maçtan 10 dakika öncesine kadar yapılabilir."
      );
      setMessageType("error");
      return;
    }

    const existingPrediction = predictions[match.id];

    if (existingPrediction) {
      setHomeScore(String(existingPrediction.home_score));
      setAwayScore(String(existingPrediction.away_score));
    } else {
      setHomeScore("");
      setAwayScore("");
    }

    setSelectedMatch(match);
  }

  async function savePrediction() {
    if (!selectedMatch) return;

    setMessage("");
    setMessageType("");

    const home = Number(homeScore);
    const away = Number(awayScore);

    if (
      homeScore.trim() === "" ||
      awayScore.trim() === "" ||
      !Number.isInteger(home) ||
      !Number.isInteger(away)
    ) {
      setMessage("Lütfen geçerli bir skor gir.");
      setMessageType("error");
      return;
    }

    if (home < 0 || away < 0) {
      setMessage("Skor 0'dan küçük olamaz.");
      setMessageType("error");
      return;
    }

    if (home > 30 || away > 30) {
      setMessage("Lütfen gerçekçi bir skor gir.");
      setMessageType("error");
      return;
    }

    if (!canPredict(selectedMatch.kickoff)) {
      setMessage("Bu maç için tahmin süresi kapanmış.");
      setMessageType("error");
      return;
    }

    setSaving(true);

    const userResult = await supabase.auth.getUser();

    if (!userResult.data.user) {
      setSaving(false);
      window.location.href = "/login";
      return;
    }

    const userId = userResult.data.user.id;

    const result = await supabase
      .from("Predictions")
      .upsert(
        {
          user_id: userId,
          match_id: selectedMatch.id,
          home_score: home,
          away_score: away,
        },
        {
          onConflict: "user_id,match_id",
        }
      )
      .select("match_id, home_score, away_score")
      .single();

    if (result.error) {
      console.log("Tahmin kaydetme hatası:", result.error);

      setSaving(false);
      setMessage(
        "Tahmin kaydedilemedi: " + result.error.message
      );
      setMessageType("error");
      return;
    }

    setPredictions((previous) => ({
      ...previous,
      [selectedMatch.id]: result.data,
    }));

    setSaving(false);

    setMessage("Tahminin başarıyla kaydedildi! ⚽");
    setMessageType("success");

    setTimeout(() => {
      setSelectedMatch(null);
      setMessage("");
      setMessageType("");
    }, 1200);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function getStatusClass(match: Match) {
    if (!match.kickoff) {
      return "bg-slate-100 text-slate-500";
    }

    if (canPredict(match.kickoff)) {
      return "bg-emerald-50 text-emerald-700";
    }

    return "bg-red-50 text-red-600";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-5xl px-5 py-10">
          <div className="animate-pulse">
            <div className="h-20 rounded-3xl bg-white" />

            <div className="mt-6 h-48 rounded-3xl bg-white" />

            <div className="mt-6 h-48 rounded-3xl bg-white" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
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

          <div className="flex items-center gap-2">
            {userEmail ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/profil";
                  }}
                  className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-600 sm:block"
                >
                  👤 Profil
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700"
                >
                  Çıkış
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/login";
                }}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Giriş Yap
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="px-5 pt-6">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 p-7 text-white shadow-2xl shadow-blue-200 md:p-10">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

            <div className="relative max-w-3xl">
              <div className="mb-5 inline-flex rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">
                ⚽ Avrupa Futbol Tahminleri
              </div>

              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Maçları tahmin et,
                <br />
                puanlarını topla!
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100 md:text-base">
                Maç sonuçlarını tahmin et, doğru skorlarla daha fazla puan
                kazan. Tahminler maç başlamadan 10 dakika öncesine kadar
                açıktır.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <div className="mx-auto max-w-6xl px-5 py-8">
        {/* INFO */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-2xl">🎯</div>

            <h3 className="mt-3 font-black">
              Tam skor
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Tam skor tahmini: <strong>20 puan</strong>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-2xl">🔥</div>

            <h3 className="mt-3 font-black">
              Yakın tahmin
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              1 fark: <strong>10 puan</strong> · 2 fark:{" "}
              <strong>5 puan</strong>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-2xl">⏰</div>

            <h3 className="mt-3 font-black">
              Son 10 dakika
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Tahminler maçtan 10 dakika önce kapanır.
            </p>
          </div>
        </div>

        {/* MATCHES */}
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                MAÇLAR
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight">
                Tahminlerini yap
              </h2>
            </div>

            <div className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm">
              {matches.length} maç
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="text-5xl">⚽</div>

              <h3 className="mt-4 text-xl font-black">
                Henüz maç eklenmedi
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Admin panelinden maçlar eklendiğinde burada görünecek.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {matches.map((match) => {
                const prediction = predictions[match.id];
                const bonus = bonusQuestions[match.id];
                const available = canPredict(match.kickoff);

                return (
                  <article
                    key={match.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    {/* MATCH TOP */}
                    <div className="border-b border-slate-100 px-5 py-4 md:px-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-600">
                            {match.league || "Avrupa Futbolu"}
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-500">
                            {formatDate(match)}
                          </p>
                        </div>

                        <div
                          className={`rounded-xl px-3 py-2 text-xs font-black ${getStatusClass(
                            match
                          )}`}
                        >
                          {getPredictionStatus(match.kickoff)}
                        </div>
                      </div>
                    </div>

                    {/* TEAMS */}
                    <div className="px-5 py-6 md:px-8 md:py-8">
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-8">
                        {/* HOME */}
                        <div className="text-center">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-3xl">
                            {match.home_logo_url ? (
                              <img
                                src={match.home_logo_url}
                                alt={match.home_team}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              "⚽"
                            )}
                          </div>

                          <p className="mt-3 text-sm font-black md:text-base">
                            {match.home_team}
                          </p>
                        </div>

                        {/* TIME */}
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-400">
                            TÜRKİYE SAATİ
                          </p>

                          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                            {match.kickoff
                              ? new Date(match.kickoff).toLocaleTimeString(
                                  "tr-TR",
                                  {
                                    timeZone: "Europe/Istanbul",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                  }
                                )
                              : "--:--"}
                          </p>

                          <div className="my-2 text-xs font-black text-slate-300">
                            VS
                          </div>
                        </div>

                        {/* AWAY */}
                        <div className="text-center">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-3xl">
                            {match.away_logo_url ? (
                              <img
                                src={match.away_logo_url}
                                alt={match.away_team}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              "⚽"
                            )}
                          </div>

                          <p className="mt-3 text-sm font-black md:text-base">
                            {match.away_team}
                          </p>
                        </div>
                      </div>

                      {/* BROADCAST */}
                      {match.broadcast_channel && (
                        <div className="mt-5 text-center">
                          <span className="inline-flex rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                            📺 {match.broadcast_channel}
                          </span>
                        </div>
                      )}

                      {/* PREDICTION */}
                      <div className="mt-6">
                        {prediction ? (
                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-black uppercase tracking-wider text-emerald-600">
                                  TAHMİNİN
                                </p>

                                <p className="mt-1 text-2xl font-black text-emerald-800">
                                  {prediction.home_score} -{" "}
                                  {prediction.away_score}
                                </p>
                              </div>

                              {available && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openPrediction(match)
                                  }
                                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                                >
                                  Tahmini Değiştir
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPrediction(match)}
                            disabled={!available}
                            className={`w-full rounded-2xl px-5 py-4 text-sm font-black transition ${
                              available
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                                : "cursor-not-allowed bg-slate-100 text-slate-400"
                            }`}
                          >
                            {available
                              ? "⚽ Tahmin Yap"
                              : "🔒 Tahmin Süresi Kapandı"}
                          </button>
                        )}
                      </div>

                      {/* BONUS QUESTION */}
                      {bonus && (
                        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-5">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">⭐</div>

                            <div className="flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="font-black text-amber-900">
                                  Bonus Soru
                                </h3>

                                <span className="rounded-lg bg-amber-200 px-2 py-1 text-[10px] font-black text-amber-800">
                                  +{bonus.points} PUAN
                                </span>
                              </div>

                              <p className="mt-2 text-sm font-bold leading-6 text-amber-900">
                                {bonus.question}
                              </p>

                              {bonus.question_type === "multiple_choice" && (
                                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                  {[
                                    {
                                      key: "A",
                                      value: bonus.option_a,
                                    },
                                    {
                                      key: "B",
                                      value: bonus.option_b,
                                    },
                                    {
                                      key: "C",
                                      value: bonus.option_c,
                                    },
                                    {
                                      key: "D",
                                      value: bonus.option_d,
                                    },
                                  ]
                                    .filter(
                                      (option) => option.value
                                    )
                                    .map((option) => (
                                      <button
                                        key={option.key}
                                        type="button"
                                        disabled={!available}
                                        onClick={() => {
                                          setBonusAnswers(
                                            (previous) => ({
                                              ...previous,
                                              [match.id]:
                                                option.key,
                                            })
                                          );
                                        }}
                                        className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                                          bonusAnswers[match.id] ===
                                          option.key
                                            ? "border-blue-500 bg-blue-50 text-blue-700"
                                            : "border-amber-200 bg-white text-slate-700 hover:border-blue-300"
                                        } ${
                                          !available
                                            ? "cursor-not-allowed opacity-60"
                                            : ""
                                        }`}
                                      >
                                        <span className="mr-2 font-black">
                                          {option.key}.
                                        </span>

                                        {option.value}
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          </div>
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

      {/* PREDICTION MODAL */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-blue-700 to-blue-800 p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-200">
                    TAHMİNİNİ GİR
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    {selectedMatch.home_team}
                    <span className="mx-2 text-blue-300">
                      vs
                    </span>
                    {selectedMatch.away_team}
                  </h2>

                  <p className="mt-2 text-sm text-blue-100">
                    🇹🇷{" "}
                    {formatKickoff(selectedMatch.kickoff)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMatch(null)}
                  className="rounded-xl bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <p className="mb-4 text-center text-sm font-bold text-slate-500">
                Maç sonucunu tahmin et
              </p>

              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                <div>
                  <label className="mb-2 block text-center text-xs font-black text-slate-500">
                    {selectedMatch.home_team}
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={homeScore}
                    onChange={(event) =>
                      setHomeScore(event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-3xl font-black outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="0"
                  />
                </div>

                <div className="pb-4 text-xl font-black text-slate-300">
                  -
                </div>

                <div>
                  <label className="mb-2 block text-center text-xs font-black text-slate-500">
                    {selectedMatch.away_team}
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={awayScore}
                    onChange={(event) =>
                      setAwayScore(event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-3xl font-black outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-xs font-bold text-slate-500">
                  Puanlama
                </p>

                <div className="mt-2 flex justify-center gap-4 text-sm font-black">
                  <span className="text-blue-600">
                    Tam skor: 20
                  </span>

                  <span className="text-emerald-600">
                    1 fark: 10
                  </span>

                  <span className="text-amber-600">
                    2 fark: 5
                  </span>
                </div>
              </div>

              {message && (
                <div
                  className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${
                    messageType === "success"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={savePrediction}
                disabled={saving}
                className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Kaydediliyor..."
                  : "Tahminimi Kaydet"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMatch(null);
                  setMessage("");
                  setMessageType("");
                }}
                className="mt-2 w-full rounded-2xl px-5 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}