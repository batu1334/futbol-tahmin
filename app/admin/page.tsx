"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string | null;
  match_date: string | null;
  league: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  schedule_confirmed: boolean;
  home_logo_url: string | null;
  away_logo_url: string | null;
  broadcast_channel: string | null;
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
  correct_answer: string | null;
  points: number;
  created_at: string;
};

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

const selectClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(date: string | null) {
  if (!date) return "Tarih belirtilmedi";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatKickoff(kickoff: string | null) {
  if (!kickoff) return "Saat henüz belli değil";

  const parsed = new Date(kickoff);

  if (Number.isNaN(parsed.getTime())) return "Saat bilgisi yok";

  return parsed.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function teamLogo(
  url: string | null,
  team: string,
  size = "h-14 w-14"
) {
  if (url) {
    return (
      <img
        src={url}
        alt={`${team} logosu`}
        className={`${size} rounded-full border border-slate-200 bg-white object-contain p-1 shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${size} flex items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 text-xl shadow-sm`}
    >
      ⚽
    </div>
  );
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [matches, setMatches] = useState<Match[]>([]);
  const [bonusQuestions, setBonusQuestions] = useState<BonusQuestion[]>([]);

  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [editingBonusId, setEditingBonusId] = useState<number | null>(null);

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [league, setLeague] = useState("");
  const [broadcastChannel, setBroadcastChannel] = useState("");
  const [homeLogoUrl, setHomeLogoUrl] = useState("");
  const [awayLogoUrl, setAwayLogoUrl] = useState("");
  const [matchStatus, setMatchStatus] = useState("scheduled");
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);

  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  const [bonusMatchId, setBonusMatchId] = useState("");
  const [bonusQuestion, setBonusQuestion] = useState("");
  const [bonusType, setBonusType] = useState("multiple_choice");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [bonusPoints, setBonusPoints] = useState("5");
  const [correctAnswer, setCorrectAnswer] = useState("");

  const [uploadingHomeLogo, setUploadingHomeLogo] = useState(false);
  const [uploadingAwayLogo, setUploadingAwayLogo] = useState(false);

  const scheduledMatches = useMemo(
    () => matches.filter((match) => match.status !== "finished").length,
    [matches]
  );

  const finishedMatches = useMemo(
    () => matches.filter((match) => match.status === "finished").length,
    [matches]
  );

  const confirmedMatches = useMemo(
    () => matches.filter((match) => match.schedule_confirmed).length,
    [matches]
  );

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const aTime = a.kickoff
        ? new Date(a.kickoff).getTime()
        : a.match_date
          ? new Date(`${a.match_date}T23:59:59`).getTime()
          : 0;

      const bTime = b.kickoff
        ? new Date(b.kickoff).getTime()
        : b.match_date
          ? new Date(`${b.match_date}T23:59:59`).getTime()
          : 0;

      return bTime - aTime;
    });
  }, [matches]);

  async function loadData() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.is_admin) {
        window.location.href = "/";
        return;
      }

      const [matchesResult, bonusResult] = await Promise.all([
        supabase
          .from("Matches")
          .select("*")
          .order("match_date", { ascending: false })
          .order("kickoff", { ascending: false }),

        supabase
          .from("BonusQuestions")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (matchesResult.error) {
        throw matchesResult.error;
      }

      if (bonusResult.error) {
        throw bonusResult.error;
      }

      setMatches((matchesResult.data || []) as Match[]);
      setBonusQuestions((bonusResult.data || []) as BonusQuestion[]);
    } catch (error) {
      console.error(error);
      setMessage("Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetMatchForm() {
    setEditingMatchId(null);
    setHomeTeam("");
    setAwayTeam("");
    setMatchDate("");
    setMatchTime("");
    setLeague("");
    setBroadcastChannel("");
    setHomeLogoUrl("");
    setAwayLogoUrl("");
    setMatchStatus("scheduled");
    setScheduleConfirmed(false);
    setHomeScore("");
    setAwayScore("");
  }

  function resetBonusForm() {
    setEditingBonusId(null);
    setBonusMatchId("");
    setBonusQuestion("");
    setBonusType("multiple_choice");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setBonusPoints("5");
    setCorrectAnswer("");
  }

  function editMatch(match: Match) {
    setEditingMatchId(match.id);
    setHomeTeam(match.home_team);
    setAwayTeam(match.away_team);
    setMatchDate(match.match_date || "");
    setLeague(match.league || "");
    setBroadcastChannel(match.broadcast_channel || "");
    setHomeLogoUrl(match.home_logo_url || "");
    setAwayLogoUrl(match.away_logo_url || "");
    setMatchStatus(match.status || "scheduled");
    setScheduleConfirmed(Boolean(match.schedule_confirmed));

    if (match.kickoff) {
      const date = new Date(match.kickoff);

      if (!Number.isNaN(date.getTime())) {
        setMatchDate(
          match.match_date ||
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
              2,
              "0"
            )}-${String(date.getDate()).padStart(2, "0")}`
        );

        setMatchTime(
          `${String(date.getHours()).padStart(2, "0")}:${String(
            date.getMinutes()
          ).padStart(2, "0")}`
        );
      }
    } else {
      setMatchTime("");
    }

    setHomeScore(
      match.home_score === null || match.home_score === undefined
        ? ""
        : String(match.home_score)
    );

    setAwayScore(
      match.away_score === null || match.away_score === undefined
        ? ""
        : String(match.away_score)
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editBonus(question: BonusQuestion) {
    setEditingBonusId(question.id);
    setBonusMatchId(String(question.match_id));
    setBonusQuestion(question.question);
    setBonusType(question.question_type);
    setOptionA(question.option_a || "");
    setOptionB(question.option_b || "");
    setOptionC(question.option_c || "");
    setOptionD(question.option_d || "");
    setBonusPoints(String(question.points));
    setCorrectAnswer(question.correct_answer || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadLogo(
    file: File,
    side: "home" | "away"
  ) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Lütfen bir görsel dosyası seç.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Logo dosyası en fazla 5 MB olabilir.");
      return;
    }

    if (side === "home") {
      setUploadingHomeLogo(true);
    } else {
      setUploadingAwayLogo(true);
    }

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const fileName = `${crypto.randomUUID()}.${extension}`;
      const path = `team-logos/${fileName}`;

      const { error } = await supabase.storage
        .from("team-logos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage
        .from("team-logos")
        .getPublicUrl(path);

      if (side === "home") {
        setHomeLogoUrl(data.publicUrl);
      } else {
        setAwayLogoUrl(data.publicUrl);
      }

      setMessage("Logo başarıyla yüklendi.");
    } catch (error) {
      console.error(error);
      setMessage(
        "Logo yüklenemedi. Supabase Storage içinde team-logos bucket'ını kontrol et."
      );
    } finally {
      if (side === "home") {
        setUploadingHomeLogo(false);
      } else {
        setUploadingAwayLogo(false);
      }
    }
  }

  async function saveMatch(event: React.FormEvent) {
    event.preventDefault();

    if (!homeTeam.trim() || !awayTeam.trim()) {
      setMessage("Ev sahibi ve deplasman takımını gir.");
      return;
    }

    if (!matchDate) {
      setMessage("Maç tarihini gir.");
      return;
    }

    if (homeTeam.trim().toLowerCase() === awayTeam.trim().toLowerCase()) {
      setMessage("Ev sahibi ve deplasman takımı aynı olamaz.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      let kickoff: string | null = null;

      if (matchTime) {
        kickoff = `${matchDate}T${matchTime}:00`;
      }

      const confirmed = Boolean(kickoff) && scheduleConfirmed;

      const payload = {
        home_team: homeTeam.trim(),
        away_team: awayTeam.trim(),
        match_date: matchDate,
        kickoff,
        league: league.trim() || null,
        broadcast_channel: broadcastChannel.trim() || null,
        home_logo_url: homeLogoUrl.trim() || null,
        away_logo_url: awayLogoUrl.trim() || null,
        status: matchStatus,
        schedule_confirmed: confirmed,
      };

      if (editingMatchId) {
        const { error } = await supabase
          .from("Matches")
          .update(payload)
          .eq("id", editingMatchId);

        if (error) {
          throw error;
        }

        setMessage("Maç başarıyla güncellendi.");
      } else {
        const { error } = await supabase.from("Matches").insert(payload);

        if (error) {
          throw error;
        }

        setMessage("Maç başarıyla eklendi.");
      }

      resetMatchForm();
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Maç kaydedilirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMatch(id: number) {
    const confirmed = window.confirm(
      "Bu maçı ve ilişkili verileri silmek istediğine emin misin?"
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("Matches")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setMessage("Maç silindi.");
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage(
        "Maç silinemedi. İlişkili kayıtlar nedeniyle silme işlemi engellenmiş olabilir."
      );
    } finally {
      setSaving(false);
    }
  }

  async function finishMatch(id: number) {
    if (homeScore === "" || awayScore === "") {
      setMessage("Önce maç skorunu gir.");
      return;
    }

    const parsedHome = Number(homeScore);
    const parsedAway = Number(awayScore);

    if (
      !Number.isInteger(parsedHome) ||
      !Number.isInteger(parsedAway) ||
      parsedHome < 0 ||
      parsedAway < 0
    ) {
      setMessage("Skorlar 0 veya daha büyük tam sayı olmalı.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("Matches")
        .update({
          home_score: parsedHome,
          away_score: parsedAway,
          status: "finished",
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      setMessage(
        "Maç bitirildi. Tahmin ve bonus puanları otomatik hesaplanacaktır."
      );

      setHomeScore("");
      setAwayScore("");

      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Maç sonucu kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function saveBonus(event: React.FormEvent) {
    event.preventDefault();

    if (!bonusMatchId) {
      setMessage("Bonus sorusu için maç seç.");
      return;
    }

    if (!bonusQuestion.trim()) {
      setMessage("Bonus sorusunu gir.");
      return;
    }

    const parsedPoints = Number(bonusPoints);

    if (!Number.isInteger(parsedPoints) || parsedPoints <= 0) {
      setMessage("Bonus puanı 0'dan büyük bir tam sayı olmalı.");
      return;
    }

    if (
      bonusType === "multiple_choice" &&
      (!optionA.trim() ||
        !optionB.trim() ||
        !optionC.trim() ||
        !optionD.trim())
    ) {
      setMessage("Çoktan seçmeli soruda dört seçenek de gerekli.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const selectedMatch = matches.find(
        (match) => match.id === Number(bonusMatchId)
      );

      const answer =
        selectedMatch?.status === "finished" && correctAnswer.trim()
          ? correctAnswer.trim()
          : null;

      const payload = {
        match_id: Number(bonusMatchId),
        question: bonusQuestion.trim(),
        question_type: bonusType,
        option_a:
          bonusType === "multiple_choice" ? optionA.trim() || null : null,
        option_b:
          bonusType === "multiple_choice" ? optionB.trim() || null : null,
        option_c:
          bonusType === "multiple_choice" ? optionC.trim() || null : null,
        option_d:
          bonusType === "multiple_choice" ? optionD.trim() || null : null,
        correct_answer: answer,
        points: parsedPoints,
      };

      if (editingBonusId) {
        const { error } = await supabase
          .from("BonusQuestions")
          .update(payload)
          .eq("id", editingBonusId);

        if (error) {
          throw error;
        }

        setMessage("Bonus sorusu güncellendi.");
      } else {
        const { error } = await supabase
          .from("BonusQuestions")
          .insert(payload);

        if (error) {
          throw error;
        }

        setMessage("Bonus sorusu başarıyla eklendi.");
      }

      resetBonusForm();
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Bonus sorusu kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBonus(id: number) {
    const confirmed = window.confirm(
      "Bu bonus sorusunu silmek istediğine emin misin?"
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("BonusQuestions")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setMessage("Bonus sorusu silindi.");
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Bonus sorusu silinemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCorrectAnswer(question: BonusQuestion) {
    const selectedMatch = matches.find(
      (match) => match.id === question.match_id
    );

    if (!selectedMatch || selectedMatch.status !== "finished") {
      setMessage(
        "Doğru cevap yalnızca maç tamamlandıktan sonra girilebilir."
      );
      return;
    }

    if (!correctAnswer.trim()) {
      setMessage("Önce doğru cevabı gir.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("BonusQuestions")
        .update({
          correct_answer: correctAnswer.trim(),
        })
        .eq("id", question.id);

      if (error) {
        throw error;
      }

      setMessage(
        "Doğru cevap kaydedildi. Bonus puanları otomatik hesaplanacaktır."
      );

      setCorrectAnswer("");
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Doğru cevap kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-3xl shadow-2xl shadow-blue-500/30">
              ⚽
            </div>
            <p className="text-lg font-bold">Admin paneli hazırlanıyor...</p>
            <p className="mt-2 text-sm text-slate-400">
              Veriler yükleniyor
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-xl shadow-lg shadow-blue-500/25">
                ⚽
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  Futbol Tahmin
                </p>
                <h1 className="text-lg font-black text-white sm:text-xl">
                  Yönetim Merkezi
                </h1>
              </div>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scrollToSection("mac-formu")}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Maç Ekle
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("bonus-formu")}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Bonus Ekle
              </button>

              <a
                href="/"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15"
              >
                Siteye Dön
              </a>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-6 shadow-2xl shadow-black/20 sm:p-8">
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300">
                  <span className="h-2 w-2 rounded-full bg-cyan-300" />
                  ADMIN PANELİ
                </div>

                <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                  Futbol tahmin sistemini
                  <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                    buradan yönet.
                  </span>
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                  Maçları, yayın bilgilerini, takım logolarını, skorları ve
                  bonus sorularını tek merkezden kontrol et.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs font-semibold text-slate-400">
                    Toplam maç
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {matches.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs font-semibold text-slate-400">
                    Bekleyen
                  </p>
                  <p className="mt-2 text-2xl font-black text-cyan-300">
                    {scheduledMatches}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs font-semibold text-slate-400">
                    Tamamlanan
                  </p>
                  <p className="mt-2 text-2xl font-black text-emerald-300">
                    {finishedMatches}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs font-semibold text-slate-400">
                    Programı onaylı
                  </p>
                  <p className="mt-2 text-2xl font-black text-violet-300">
                    {confirmedMatches}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
            <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 shadow-sm">
              <span className="text-lg">ℹ️</span>
              <span>{message}</span>
            </div>
          </div>
        )}

        <section
          id="mac-formu"
          className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-10 sm:px-6 lg:px-8"
        >
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/20">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/60 px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                    <span>01</span>
                    <span className="h-px w-8 bg-blue-200" />
                    Maç Yönetimi
                  </div>

                  <h2 className="text-2xl font-black text-slate-950">
                    {editingMatchId ? "Maçı Düzenle" : "Yeni Maç Ekle"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Tarih belli, saat belli değilse saat alanını boş
                    bırakabilirsin.
                  </p>
                </div>

                {editingMatchId && (
                  <button
                    type="button"
                    onClick={resetMatchForm}
                    className={secondaryButton}
                  >
                    ✕ Düzenlemeyi İptal Et
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={saveMatch} className="p-6 sm:p-8">
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Ev sahibi takım
                  </label>
                  <input
                    value={homeTeam}
                    onChange={(event) => setHomeTeam(event.target.value)}
                    className={inputClass}
                    placeholder="Örn. Galatasaray"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Deplasman takımı
                  </label>
                  <input
                    value={awayTeam}
                    onChange={(event) => setAwayTeam(event.target.value)}
                    className={inputClass}
                    placeholder="Örn. Fenerbahçe"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Maç tarihi
                  </label>
                  <input
                    type="date"
                    value={matchDate}
                    onChange={(event) => setMatchDate(event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Maç saati
                    <span className="ml-2 text-xs font-medium text-slate-400">
                      (opsiyonel)
                    </span>
                  </label>
                  <input
                    type="time"
                    value={matchTime}
                    onChange={(event) => setMatchTime(event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Lig / organizasyon
                  </label>
                  <input
                    value={league}
                    onChange={(event) => setLeague(event.target.value)}
                    className={inputClass}
                    placeholder="Örn. Süper Lig"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Yayın kanalı
                  </label>
                  <input
                    value={broadcastChannel}
                    onChange={(event) =>
                      setBroadcastChannel(event.target.value)
                    }
                    className={inputClass}
                    placeholder="Örn. beIN Sports 1"
                  />
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4">
                  <h3 className="font-black text-slate-900">
                    Takım logoları
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    PNG, JPG veya WebP. Maksimum 5 MB.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-3">
                      {teamLogo(homeLogoUrl, homeTeam || "Ev sahibi")}
                      <div>
                        <p className="text-sm font-black text-slate-800">
                          Ev sahibi logosu
                        </p>
                        <p className="text-xs text-slate-400">
                          {homeTeam || "Takım seçilmedi"}
                        </p>
                      </div>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          uploadLogo(file, "home");
                        }
                      }}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    />

                    {uploadingHomeLogo && (
                      <p className="mt-2 text-xs font-bold text-blue-600">
                        Logo yükleniyor...
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-3">
                      {teamLogo(awayLogoUrl, awayTeam || "Deplasman")}
                      <div>
                        <p className="text-sm font-black text-slate-800">
                          Deplasman logosu
                        </p>
                        <p className="text-xs text-slate-400">
                          {awayTeam || "Takım seçilmedi"}
                        </p>
                      </div>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          uploadLogo(file, "away");
                        }
                      }}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    />

                    {uploadingAwayLogo && (
                      <p className="mt-2 text-xs font-bold text-blue-600">
                        Logo yükleniyor...
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Maç durumu
                  </label>

                  <select
                    value={matchStatus}
                    onChange={(event) => setMatchStatus(event.target.value)}
                    className={selectClass}
                  >
                    <option value="scheduled">Planlandı</option>
                    <option value="live">Canlı</option>
                    <option value="finished">Bitti</option>
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Program onayı
                  </label>

                  <label className="flex min-h-[50px] cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                    <input
                      type="checkbox"
                      checked={scheduleConfirmed}
                      onChange={(event) =>
                        setScheduleConfirmed(event.target.checked)
                      }
                      disabled={!matchTime}
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />

                    <span>
                      <span className="block text-sm font-bold text-slate-800">
                        Maç programını onaylıyorum
                      </span>
                      <span className="block text-xs text-slate-500">
                        Saat girilmeden tahminler açılmaz.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving || uploadingHomeLogo || uploadingAwayLogo}
                  className={primaryButton}
                >
                  {saving
                    ? "Kaydediliyor..."
                    : editingMatchId
                      ? "✓ Maçı Güncelle"
                      : "＋ Maçı Kaydet"}
                </button>

                <button
                  type="button"
                  onClick={resetMatchForm}
                  className={secondaryButton}
                >
                  Formu Temizle
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-400">
                <span>02</span>
                <span className="h-px w-8 bg-cyan-400/40" />
                Maçlar
              </div>

              <h2 className="text-2xl font-black text-white sm:text-3xl">
                Maç Merkezi
              </h2>
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300">
              {matches.length} maç
            </div>
          </div>

          {sortedMatches.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-3xl">
                📅
              </div>
              <p className="font-bold text-white">Henüz maç yok.</p>
              <p className="mt-1 text-sm text-slate-400">
                Yukarıdaki formdan ilk maçı ekleyebilirsin.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {sortedMatches.map((match) => (
                <article
                  key={match.id}
                  className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600" />

                  <div className="p-5 sm:p-6">
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {match.league && (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                              {match.league}
                            </span>
                          )}

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black ${
                              match.status === "finished"
                                ? "bg-emerald-50 text-emerald-700"
                                : match.status === "live"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {match.status === "finished"
                              ? "BİTTİ"
                              : match.status === "live"
                                ? "CANLI"
                                : "PLANLANDI"}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black ${
                              match.schedule_confirmed
                                ? "bg-cyan-50 text-cyan-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {match.schedule_confirmed
                              ? "PROGRAM ONAYLI"
                              : "PROGRAM BEKLİYOR"}
                          </span>
                        </div>

                        <p className="mt-3 text-xs font-semibold text-slate-400">
                          {formatDate(match.match_date)}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-600">
                          {formatKickoff(match.kickoff)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          ID
                        </p>
                        <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                          #{match.id}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-blue-50/70 p-5">
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="min-w-0 text-center">
                          <div className="mb-3 flex justify-center">
                            {teamLogo(
                              match.home_logo_url,
                              match.home_team,
                              "h-16 w-16"
                            )}
                          </div>

                          <p className="truncate text-sm font-black text-slate-900">
                            {match.home_team}
                          </p>
                        </div>

                        <div className="text-center">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                            VS
                          </span>

                          {match.status === "finished" &&
                            match.home_score !== null &&
                            match.away_score !== null && (
                              <p className="mt-1 text-2xl font-black text-slate-950">
                                {match.home_score} - {match.away_score}
                              </p>
                            )}
                        </div>

                        <div className="min-w-0 text-center">
                          <div className="mb-3 flex justify-center">
                            {teamLogo(
                              match.away_logo_url,
                              match.away_team,
                              "h-16 w-16"
                            )}
                          </div>

                          <p className="truncate text-sm font-black text-slate-900">
                            {match.away_team}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Yayın
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {match.broadcast_channel || "Belirtilmedi"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Tahmin durumu
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {match.schedule_confirmed
                            ? "Program onaylı"
                            : "Kapalı"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => editMatch(match)}
                        className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                      >
                        ✏️ Düzenle
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteMatch(match.id)}
                        disabled={saving}
                        className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        🗑️ Sil
                      </button>
                    </div>

                    {match.status !== "finished" && (
                      <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="mb-3 text-xs font-black uppercase tracking-wider text-emerald-700">
                          Maç Sonucunu Gir
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            min="0"
                            value={
                              editingMatchId === match.id
                                ? homeScore
                                : ""
                            }
                            onChange={(event) => {
                              setEditingMatchId(match.id);
                              setHomeScore(event.target.value);
                            }}
                            className={inputClass}
                            placeholder={match.home_team}
                          />

                          <input
                            type="number"
                            min="0"
                            value={
                              editingMatchId === match.id
                                ? awayScore
                                : ""
                            }
                            onChange={(event) => {
                              setEditingMatchId(match.id);
                              setAwayScore(event.target.value);
                            }}
                            className={inputClass}
                            placeholder={match.away_team}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => finishMatch(match.id)}
                          disabled={
                            saving ||
                            editingMatchId !== match.id ||
                            homeScore === "" ||
                            awayScore === ""
                          }
                          className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          ✓ Maçı Bitir ve Sonucu Kaydet
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section
          id="bonus-formu"
          className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-10 sm:px-6 lg:px-8"
        >
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/20">
            <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                    <span>03</span>
                    <span className="h-px w-8 bg-violet-200" />
                    Bonus Sistemi
                  </div>

                  <h2 className="text-2xl font-black text-slate-950">
                    {editingBonusId
                      ? "Bonus Sorusunu Düzenle"
                      : "Yeni Bonus Sorusu"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Doğru cevap maç bitmeden kullanıcıya gösterilmez.
                  </p>
                </div>

                {editingBonusId && (
                  <button
                    type="button"
                    onClick={resetBonusForm}
                    className={secondaryButton}
                  >
                    ✕ Düzenlemeyi İptal Et
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={saveBonus} className="p-6 sm:p-8">
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Bağlı maç
                  </label>

                  <select
                    value={bonusMatchId}
                    onChange={(event) => setBonusMatchId(event.target.value)}
                    className={selectClass}
                  >
                    <option value="">Maç seç...</option>

                    {matches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.home_team} - {match.away_team}
                        {match.status === "finished"
                          ? " • Bitti"
                          : " • Devam ediyor"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Puan
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={bonusPoints}
                    onChange={(event) => setBonusPoints(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Soru
                </label>

                <textarea
                  value={bonusQuestion}
                  onChange={(event) => setBonusQuestion(event.target.value)}
                  className={`${inputClass} min-h-28 resize-y`}
                  placeholder="Örn. İlk golü hangi takım atar?"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Soru tipi
                </label>

                <select
                  value={bonusType}
                  onChange={(event) => setBonusType(event.target.value)}
                  className={selectClass}
                >
                  <option value="multiple_choice">
                    Çoktan seçmeli
                  </option>
                  <option value="text">Metin cevabı</option>
                </select>
              </div>

              {bonusType === "multiple_choice" && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      A seçeneği
                    </label>
                    <input
                      value={optionA}
                      onChange={(event) => setOptionA(event.target.value)}
                      className={inputClass}
                      placeholder="A)"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      B seçeneği
                    </label>
                    <input
                      value={optionB}
                      onChange={(event) => setOptionB(event.target.value)}
                      className={inputClass}
                      placeholder="B)"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      C seçeneği
                    </label>
                    <input
                      value={optionC}
                      onChange={(event) => setOptionC(event.target.value)}
                      className={inputClass}
                      placeholder="C)"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      D seçeneği
                    </label>
                    <input
                      value={optionD}
                      onChange={(event) => setOptionD(event.target.value)}
                      className={inputClass}
                      placeholder="D)"
                    />
                  </div>
                </div>
              )}

              {editingBonusId && (
                <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end">
                    <div className="flex-1">
                      <label className="mb-2 block text-sm font-black text-amber-900">
                        Doğru cevap
                      </label>

                      <input
                        value={correctAnswer}
                        onChange={(event) =>
                          setCorrectAnswer(event.target.value)
                        }
                        className={inputClass}
                        placeholder="Maç bittikten sonra gir"
                      />

                      <p className="mt-2 text-xs leading-5 text-amber-700">
                        Doğru cevap yalnızca maç tamamlandıktan sonra
                        belirlenmelidir. Kaydedildiğinde bonus cevaplarının
                        puanları otomatik hesaplanır.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const question = bonusQuestions.find(
                          (item) => item.id === editingBonusId
                        );

                        if (question) {
                          saveCorrectAnswer(question);
                        }
                      }}
                      disabled={
                        saving ||
                        !correctAnswer.trim() ||
                        !matches.find(
                          (match) =>
                            match.id === Number(bonusMatchId) &&
                            match.status === "finished"
                        )
                      }
                      className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ✓ Doğru Cevabı Kaydet
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className={primaryButton}
                >
                  {saving
                    ? "Kaydediliyor..."
                    : editingBonusId
                      ? "✓ Bonus Soruyu Güncelle"
                      : "＋ Bonus Soruyu Kaydet"}
                </button>

                <button
                  type="button"
                  onClick={resetBonusForm}
                  className={secondaryButton}
                >
                  Formu Temizle
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-violet-400">
                <span>04</span>
                <span className="h-px w-8 bg-violet-400/40" />
                Bonuslar
              </div>

              <h2 className="text-2xl font-black text-white sm:text-3xl">
                Bonus Soru Merkezi
              </h2>
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300">
              {bonusQuestions.length} soru
            </div>
          </div>

          {bonusQuestions.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-3xl">
                🎯
              </div>

              <p className="font-bold text-white">
                Henüz bonus sorusu yok.
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Bonus formundan ilk soruyu oluşturabilirsin.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {bonusQuestions.map((question) => {
                const relatedMatch = matches.find(
                  (match) => match.id === question.match_id
                );

                return (
                  <article
                    key={question.id}
                    className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white shadow-xl shadow-black/10"
                  >
                    <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />

                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-[11px] font-black text-violet-700">
                            +{question.points} PUAN
                          </span>

                          <p className="mt-3 text-xs font-bold text-slate-400">
                            {relatedMatch
                              ? `${relatedMatch.home_team} - ${relatedMatch.away_team}`
                              : "Maç bulunamadı"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black ${
                            question.correct_answer
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {question.correct_answer
                            ? "CEVAP BELİRLİ"
                            : "CEVAP BEKLİYOR"}
                        </span>
                      </div>

                      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm font-black leading-6 text-slate-900">
                          {question.question}
                        </p>
                      </div>

                      {question.question_type === "multiple_choice" && (
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {[
                            ["A", question.option_a],
                            ["B", question.option_b],
                            ["C", question.option_c],
                            ["D", question.option_d],
                          ].map(([letter, option]) => (
                            <div
                              key={letter}
                              className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600"
                            >
                              <span className="mr-2 font-black text-violet-600">
                                {letter})
                              </span>
                              {option || "-"}
                            </div>
                          ))}
                        </div>
                      )}

                      {question.correct_answer && (
                        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                            Doğru cevap
                          </p>

                          <p className="mt-1 text-sm font-black text-emerald-800">
                            {question.correct_answer}
                          </p>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => editBonus(question)}
                          className="flex-1 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-black text-violet-700 transition hover:bg-violet-100"
                        >
                          ✏️ Düzenle
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteBonus(question.id)}
                          disabled={saving}
                          className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          🗑️ Sil
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="border-t border-white/10 bg-slate-950 px-4 py-8 text-center">
          <p className="text-xs font-semibold text-slate-500">
            ⚽ Futbol Tahmin • Yönetim Merkezi
          </p>
        </footer>
      </div>
    </main>
  );
}