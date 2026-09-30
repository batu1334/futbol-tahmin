"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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

type BonusQuestion = {
  id: number;
  match_id: number;
  question: string;
  question_type: "multiple_choice" | "text";
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string | null;
  points: number;
};

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  const [matches, setMatches] = useState<Match[]>([]);
  const [bonusQuestions, setBonusQuestions] = useState<BonusQuestion[]>([]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [kickoff, setKickoff] = useState("");
  const [league, setLeague] = useState("");
  const [status, setStatus] = useState("scheduled");
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);

  const [homeLogoFile, setHomeLogoFile] = useState<File | null>(null);
  const [awayLogoFile, setAwayLogoFile] = useState<File | null>(null);
  const [homeLogoPreview, setHomeLogoPreview] = useState<string | null>(null);
  const [awayLogoPreview, setAwayLogoPreview] = useState<string | null>(null);

  const [bonusMatchId, setBonusMatchId] = useState("");
  const [bonusQuestion, setBonusQuestion] = useState("");
  const [bonusType, setBonusType] = useState<
    "multiple_choice" | "text"
  >("multiple_choice");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [bonusPoints, setBonusPoints] = useState("5");
  const [editingBonusId, setEditingBonusId] = useState<number | null>(null);

  const loadData = async () => {
    const matchesResult = await supabase
      .from("Matches")
      .select("*")
      .order("kickoff", { ascending: true });

    if (!matchesResult.error) {
      setMatches(matchesResult.data || []);
    }

    const bonusResult = await supabase
      .from("BonusQuestions")
      .select("*")
      .order("created_at", { ascending: true });

    if (!bonusResult.error) {
      setBonusQuestions(bonusResult.data || []);
    }
  };

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        window.location.replace("/login");
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!mounted) return;

      if (
        profileResult.error ||
        profileResult.data?.is_admin !== true
      ) {
        setAuthorized(false);
        setChecking(false);
        return;
      }

      setAuthorized(true);
      setChecking(false);

      await loadData();
    };

    checkAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        window.location.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setMessage("Çıkış yapılıyor...");

    try {
      await supabase.auth.signOut({
        scope: "local",
      });
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }

    window.location.replace("/login");
  };

  const resetMatchForm = () => {
    setHomeTeam("");
    setAwayTeam("");
    setKickoff("");
    setLeague("");
    setStatus("scheduled");
    setScheduleConfirmed(false);
    setEditingMatchId(null);

    setHomeLogoFile(null);
    setAwayLogoFile(null);
    setHomeLogoPreview(null);
    setAwayLogoPreview(null);
  };

  const resetBonusForm = () => {
    setBonusMatchId("");
    setBonusQuestion("");
    setBonusType("multiple_choice");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectAnswer("");
    setBonusPoints("5");
    setEditingBonusId(null);
  };

  const uploadLogo = async (
    file: File,
    teamName: string
  ): Promise<string | null> => {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "png";

    const safeTeamName = teamName
      .toLowerCase()
      .replace(/[^a-z0-9ğüşıöç]+/gi, "-")
      .replace(/^-+|-+$/g, "");

    const fileName = `${safeTeamName || "takim"}-${Date.now()}.${extension}`;

    const filePath = `${fileName}`;

    const uploadResult = await supabase.storage
      .from("team-logos")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || "image/png",
      });

    if (uploadResult.error) {
      throw new Error(
        "Logo yüklenemedi: " + uploadResult.error.message
      );
    }

    const publicUrlResult = supabase.storage
      .from("team-logos")
      .getPublicUrl(filePath);

    return publicUrlResult.data.publicUrl;
  };

  const saveMatch = async () => {
    setMessage("");

    if (!homeTeam.trim() || !awayTeam.trim()) {
      setMessage("Ev sahibi ve deplasman takımı zorunludur.");
      return;
    }

    if (!kickoff) {
      setMessage("Tarih ve saat zorunludur.");
      return;
    }

    if (homeLogoFile && !homeLogoFile.type.startsWith("image/")) {
      setMessage("Ev sahibi logosu bir resim dosyası olmalıdır.");
      return;
    }

    if (awayLogoFile && !awayLogoFile.type.startsWith("image/")) {
      setMessage("Deplasman logosu bir resim dosyası olmalıdır.");
      return;
    }

    setLoading(true);

    try {
      let homeLogoUrl: string | null = null;
      let awayLogoUrl: string | null = null;

      if (homeLogoFile) {
        homeLogoUrl = await uploadLogo(
          homeLogoFile,
          homeTeam
        );
      }

      if (awayLogoFile) {
        awayLogoUrl = await uploadLogo(
          awayLogoFile,
          awayTeam
        );
      }

      const payload: {
        home_team: string;
        away_team: string;
        kickoff: string;
        league: string | null;
        status: string;
        schedule_confirmed: boolean;
        home_logo_url?: string;
        away_logo_url?: string;
      } = {
        home_team: homeTeam.trim(),
        away_team: awayTeam.trim(),
        kickoff: new Date(kickoff).toISOString(),
        league: league.trim() || null,
        status,
        schedule_confirmed: scheduleConfirmed,
      };

      if (homeLogoUrl) {
        payload.home_logo_url = homeLogoUrl;
      }

      if (awayLogoUrl) {
        payload.away_logo_url = awayLogoUrl;
      }

      const result =
        editingMatchId !== null
          ? await supabase
              .from("Matches")
              .update(payload)
              .eq("id", editingMatchId)
          : await supabase.from("Matches").insert(payload);

      if (result.error) {
        throw new Error(result.error.message);
      }

      setMessage(
        editingMatchId !== null
          ? "Maç ve logolar güncellendi."
          : "Maç ve logolar eklendi."
      );

      resetMatchForm();
      await loadData();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Maç kaydedilemedi."
      );
    } finally {
      setLoading(false);
    }
  };

  const editMatch = (match: Match) => {
    setEditingMatchId(match.id);
    setHomeTeam(match.home_team);
    setAwayTeam(match.away_team);
    setLeague(match.league || "");
    setStatus(match.status);
    setScheduleConfirmed(match.schedule_confirmed);

    setHomeLogoFile(null);
    setAwayLogoFile(null);
    setHomeLogoPreview(match.home_logo_url || null);
    setAwayLogoPreview(match.away_logo_url || null);

    const date = new Date(match.kickoff);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    setKickoff(
      `${year}-${month}-${day}T${hours}:${minutes}`
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteMatch = async (id: number) => {
    if (!window.confirm("Bu maçı silmek istediğine emin misin?")) {
      return;
    }

    setLoading(true);

    const result = await supabase
      .from("Matches")
      .delete()
      .eq("id", id);

    setLoading(false);

    if (result.error) {
      setMessage("Silme hatası: " + result.error.message);
      return;
    }

    setMessage("Maç silindi.");
    await loadData();
  };

  const updateScore = async (
    match: Match,
    homeScore: number,
    awayScore: number
  ) => {
    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      setMessage("Geçerli bir skor gir.");
      return;
    }

    setLoading(true);

    const result = await supabase
      .from("Matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: "finished",
      })
      .eq("id", match.id);

    setLoading(false);

    if (result.error) {
      setMessage("Skor kaydedilemedi: " + result.error.message);
      return;
    }

    setMessage(
      `${match.home_team} ${homeScore} - ${awayScore} ${match.away_team} sonucu kaydedildi.`
    );

    await loadData();
  };

  const saveBonusQuestion = async () => {
    setMessage("");

    if (!bonusMatchId) {
      setMessage("Önce maç seçmelisin.");
      return;
    }

    if (!bonusQuestion.trim()) {
      setMessage("Bonus sorusu boş bırakılamaz.");
      return;
    }

    const points = Number(bonusPoints);

    if (!Number.isFinite(points) || points <= 0) {
      setMessage("Bonus puanı 0'dan büyük olmalıdır.");
      return;
    }

    if (bonusType === "multiple_choice") {
      if (
        !optionA.trim() ||
        !optionB.trim() ||
        !optionC.trim() ||
        !optionD.trim()
      ) {
        setMessage("A, B, C ve D seçeneklerini doldur.");
        return;
      }

      const answer = correctAnswer.trim().toUpperCase();

      if (!["A", "B", "C", "D"].includes(answer)) {
        setMessage("Doğru cevap A, B, C veya D olmalıdır.");
        return;
      }
    } else if (!correctAnswer.trim()) {
      setMessage("Doğru cevap boş bırakılamaz.");
      return;
    }

    setLoading(true);

    const payload = {
      match_id: Number(bonusMatchId),
      question: bonusQuestion.trim(),
      question_type: bonusType,
      option_a:
        bonusType === "multiple_choice"
          ? optionA.trim()
          : null,
      option_b:
        bonusType === "multiple_choice"
          ? optionB.trim()
          : null,
      option_c:
        bonusType === "multiple_choice"
          ? optionC.trim()
          : null,
      option_d:
        bonusType === "multiple_choice"
          ? optionD.trim()
          : null,
      correct_answer:
        bonusType === "multiple_choice"
          ? correctAnswer.trim().toUpperCase()
          : correctAnswer.trim(),
      points,
    };

    const result =
      editingBonusId !== null
        ? await supabase
            .from("BonusQuestions")
            .update(payload)
            .eq("id", editingBonusId)
        : await supabase
            .from("BonusQuestions")
            .insert(payload);

    setLoading(false);

    if (result.error) {
      setMessage(
        "Bonus sorusu kaydedilemedi: " +
          result.error.message
      );
      return;
    }

    setMessage(
      editingBonusId !== null
        ? "Bonus sorusu güncellendi."
        : "Bonus sorusu eklendi."
    );

    resetBonusForm();
    await loadData();
  };

  const editBonus = (bonus: BonusQuestion) => {
    setEditingBonusId(bonus.id);
    setBonusMatchId(String(bonus.match_id));
    setBonusQuestion(bonus.question);
    setBonusType(bonus.question_type);
    setOptionA(bonus.option_a || "");
    setOptionB(bonus.option_b || "");
    setOptionC(bonus.option_c || "");
    setOptionD(bonus.option_d || "");
    setCorrectAnswer(bonus.correct_answer || "");
    setBonusPoints(String(bonus.points));

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  };

  const deleteBonus = async (id: number) => {
    if (
      !window.confirm(
        "Bu bonus sorusunu silmek istediğine emin misin?"
      )
    ) {
      return;
    }

    setLoading(true);

    const result = await supabase
      .from("BonusQuestions")
      .delete()
      .eq("id", id);

    setLoading(false);

    if (result.error) {
      setMessage("Silme hatası: " + result.error.message);
      return;
    }

    setMessage("Bonus sorusu silindi.");
    await loadData();
  };

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));

  const getMatchName = (matchId: number) => {
    const match = matches.find((item) => item.id === matchId);

    return match
      ? `${match.home_team} - ${match.away_team}`
      : "Bilinmeyen maç";
  };

  const handleHomeLogoChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null;

    setHomeLogoFile(file);

    if (file) {
      setHomeLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleAwayLogoChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null;

    setAwayLogoFile(file);

    if (file) {
      setAwayLogoPreview(URL.createObjectURL(file));
    }
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-yellow-50">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-yellow-200 border-t-red-600" />
          <p className="mt-5 font-black text-slate-700">
            Yönetici paneli açılıyor...
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-yellow-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="text-5xl">🔒</div>

          <h1 className="mt-5 text-3xl font-black text-slate-900">
            Yetkisiz Erişim
          </h1>

          <p className="mt-3 text-slate-500">
            Bu sayfaya yalnızca yöneticiler erişebilir.
          </p>

          <button
            type="button"
            onClick={() => window.location.replace("/")}
            className="mt-7 w-full rounded-xl bg-gradient-to-r from-yellow-400 to-red-600 px-5 py-4 font-black text-white"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-red-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-yellow-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-red-600 text-2xl text-white">
              ⚙️
            </div>

            <div className="text-left">
              <h1 className="text-lg font-black">
                Yönetici Paneli
              </h1>

              <p className="text-xs font-bold text-red-600">
                Futbol Tahmin Platformu
              </p>
            </div>
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadData}
              className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-black text-yellow-800"
            >
              🔄 Yenile
            </button>

            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="rounded-xl bg-gradient-to-r from-yellow-400 to-red-600 px-4 py-3 text-sm font-black text-white"
            >
              🏠 Ana Sayfa
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-red-200 transition hover:bg-red-700"
            >
              🚪 Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 p-7 text-white shadow-xl sm:p-10">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-black">
                ⚡ Yönetim Merkezi
              </span>

              <h2 className="mt-5 text-4xl font-black">
                Futbol Tahmin
                <span className="block text-yellow-100">
                  Yönetici Paneli
                </span>
              </h2>

              <p className="mt-4 text-white/90">
                Maçları, skorları, logoları ve bonus sorularını yönet.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-black/10 p-5">
                <p className="text-sm font-bold">Toplam Maç</p>
                <p className="mt-2 text-4xl font-black">
                  {matches.length}
                </p>
              </div>

              <div className="rounded-2xl bg-black/10 p-5">
                <p className="text-sm font-bold">Bonus</p>
                <p className="mt-2 text-4xl font-black">
                  {bonusQuestions.length}
                </p>
              </div>

              <div className="rounded-2xl bg-black/10 p-5">
                <p className="text-sm font-bold">Onaylı</p>
                <p className="mt-2 text-4xl font-black">
                  {
                    matches.filter(
                      (m) => m.schedule_confirmed
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-black/10 p-5">
                <p className="text-sm font-bold">Tamamlanan</p>
                <p className="mt-2 text-4xl font-black">
                  {
                    matches.filter(
                      (m) => m.status === "finished"
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4 font-bold text-yellow-900">
            {message}
          </div>
        )}

        <section className="mt-8 rounded-3xl bg-white shadow-sm">
          <div className="border-b border-yellow-100 bg-yellow-50 px-6 py-5">
            <h2 className="text-2xl font-black">
              {editingMatchId !== null
                ? "Maçı Düzenle"
                : "Yeni Maç Ekle"}
            </h2>
          </div>

          <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-black">
                Ev Sahibi
              </label>

              <input
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                placeholder="Galatasaray"
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-black">
                Deplasman
              </label>

              <input
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                placeholder="Fenerbahçe"
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-black">
                Tarih / Saat
              </label>

              <input
                type="datetime-local"
                value={kickoff}
                onChange={(e) => setKickoff(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-black">
                Lig
              </label>

              <input
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                placeholder="Süper Lig"
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-black">
                Ev Sahibi Logosu
              </label>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleHomeLogoChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
              />

              {homeLogoPreview && (
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <img
                    src={homeLogoPreview}
                    alt="Ev sahibi logosu"
                    className="h-14 w-14 object-contain"
                  />
                  <span className="text-xs font-bold text-slate-500">
                    Logo hazır
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-black">
                Deplasman Logosu
              </label>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleAwayLogoChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
              />

              {awayLogoPreview && (
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <img
                    src={awayLogoPreview}
                    alt="Deplasman logosu"
                    className="h-14 w-14 object-contain"
                  />
                  <span className="text-xs font-bold text-slate-500">
                    Logo hazır
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-black">
                Durum
              </label>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 font-bold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              >
                <option value="scheduled">Planlandı</option>
                <option value="finished">Bitti</option>
                <option value="cancelled">İptal</option>
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
              <input
                type="checkbox"
                checked={scheduleConfirmed}
                onChange={(e) =>
                  setScheduleConfirmed(e.target.checked)
                }
                className="h-5 w-5 accent-red-600"
              />

              <span className="font-black text-yellow-900">
                Programı onayla
              </span>
            </label>

            <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
              <button
                type="button"
                onClick={saveMatch}
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-yellow-400 to-red-600 px-5 py-3.5 font-black text-white disabled:opacity-60"
              >
                {loading
                  ? "⏳ Kaydediliyor..."
                  : editingMatchId !== null
                    ? "💾 Güncelle"
                    : "➕ Maç Ekle"}
              </button>

              {editingMatchId !== null && (
                <button
                  type="button"
                  onClick={resetMatchForm}
                  className="rounded-xl border border-red-200 px-5 font-black text-red-600"
                >
                  İptal
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-5 text-2xl font-black">
            Maç Listesi
          </h2>

          <div className="grid gap-5 lg:grid-cols-2">
            {matches.map((match) => (
              <article
                key={match.id}
                className="rounded-3xl border border-yellow-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase text-red-600">
                      {match.league || "Futbol"}
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {formatDate(match.kickoff)}
                    </p>
                  </div>

                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-800">
                    {match.status === "finished"
                      ? "Bitti"
                      : match.status === "cancelled"
                        ? "İptal"
                        : "Planlandı"}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="flex flex-col items-end">
                    {match.home_logo_url ? (
                      <img
                        src={match.home_logo_url}
                        alt={match.home_team}
                        className="mb-2 h-14 w-14 object-contain"
                      />
                    ) : (
                      <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-400">
                        {match.home_team.charAt(0)}
                      </div>
                    )}

                    <p className="text-right font-black">
                      {match.home_team}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-center font-black text-red-700">
                    {match.home_score !== null &&
                    match.away_score !== null
                      ? `${match.home_score} - ${match.away_score}`
                      : "VS"}
                  </div>

                  <div className="flex flex-col items-start">
                    {match.away_logo_url ? (
                      <img
                        src={match.away_logo_url}
                        alt={match.away_team}
                        className="mb-2 h-14 w-14 object-contain"
                      />
                    ) : (
                      <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-400">
                        {match.away_team.charAt(0)}
                      </div>
                    )}

                    <p className="font-black">
                      {match.away_team}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => editMatch(match)}
                    className="rounded-xl bg-yellow-50 px-4 py-3 font-black text-yellow-800"
                  >
                    ✏️ Düzenle
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteMatch(match.id)}
                    className="rounded-xl bg-red-50 px-4 py-3 font-black text-red-700"
                  >
                    🗑️ Sil
                  </button>
                </div>

                {match.status !== "finished" &&
                  match.status !== "cancelled" && (
                    <div className="mt-4 rounded-2xl bg-red-50 p-4">
                      <p className="mb-3 text-sm font-black text-red-700">
                        Maç Sonucu
                      </p>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <input
                          id={`home-${match.id}`}
                          type="number"
                          min="0"
                          placeholder="0"
                          className="rounded-xl border border-red-200 px-3 py-3 text-center text-lg font-black"
                        />

                        <span className="font-black">-</span>

                        <input
                          id={`away-${match.id}`}
                          type="number"
                          min="0"
                          placeholder="0"
                          className="rounded-xl border border-red-200 px-3 py-3 text-center text-lg font-black"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const home = document.getElementById(
                            `home-${match.id}`
                          ) as HTMLInputElement;

                          const away = document.getElementById(
                            `away-${match.id}`
                          ) as HTMLInputElement;

                          if (
                            home.value === "" ||
                            away.value === ""
                          ) {
                            setMessage("İki skoru da gir.");
                            return;
                          }

                          updateScore(
                            match,
                            Number(home.value),
                            Number(away.value)
                          );
                        }}
                        className="mt-3 w-full rounded-xl bg-gradient-to-r from-yellow-400 to-red-600 px-4 py-3 font-black text-white"
                      >
                        🏁 Skoru Kaydet ve Maçı Bitir
                      </button>
                    </div>
                  )}

                <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold">
                  Program:
                  <span
                    className={
                      match.schedule_confirmed
                        ? "ml-2 text-emerald-600"
                        : "ml-2 text-red-600"
                    }
                  >
                    {match.schedule_confirmed
                      ? "✓ Onaylandı"
                      : "✕ Onaylanmadı"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl bg-white shadow-sm">
          <div className="border-b border-red-100 bg-red-50 px-6 py-5">
            <h2 className="text-2xl font-black">
              {editingBonusId !== null
                ? "Bonus Sorusu Düzenle"
                : "Bonus Sorusu Ekle"}
            </h2>
          </div>

          <div className="space-y-5 p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <select
                value={bonusMatchId}
                onChange={(e) => setBonusMatchId(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3.5 font-bold"
              >
                <option value="">Maç seç...</option>

                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.home_team} - {match.away_team}
                  </option>
                ))}
              </select>

              <select
                value={bonusType}
                onChange={(e) =>
                  setBonusType(
                    e.target.value as
                      | "multiple_choice"
                      | "text"
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-3.5 font-bold"
              >
                <option value="multiple_choice">
                  Çoktan Seçmeli
                </option>
                <option value="text">Serbest Metin</option>
              </select>
            </div>

            <textarea
              value={bonusQuestion}
              onChange={(e) => setBonusQuestion(e.target.value)}
              rows={3}
              placeholder="Bonus sorusu..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3.5"
            />

            {bonusType === "multiple_choice" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  placeholder="A seçeneği"
                  className="rounded-xl border border-slate-200 px-4 py-3.5"
                />

                <input
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  placeholder="B seçeneği"
                  className="rounded-xl border border-slate-200 px-4 py-3.5"
                />

                <input
                  value={optionC}
                  onChange={(e) => setOptionC(e.target.value)}
                  placeholder="C seçeneği"
                  className="rounded-xl border border-slate-200 px-4 py-3.5"
                />

                <input
                  value={optionD}
                  onChange={(e) => setOptionD(e.target.value)}
                  placeholder="D seçeneği"
                  className="rounded-xl border border-slate-200 px-4 py-3.5"
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                value={correctAnswer}
                onChange={(e) =>
                  setCorrectAnswer(e.target.value)
                }
                placeholder={
                  bonusType === "multiple_choice"
                    ? "Doğru cevap: A/B/C/D"
                    : "Doğru cevap"
                }
                className="rounded-xl border border-slate-200 px-4 py-3.5"
              />

              <input
                type="number"
                min="1"
                value={bonusPoints}
                onChange={(e) =>
                  setBonusPoints(e.target.value)
                }
                placeholder="Puan"
                className="rounded-xl border border-slate-200 px-4 py-3.5"
              />
            </div>

            <button
              type="button"
              onClick={saveBonusQuestion}
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-yellow-400 to-red-600 px-5 py-4 font-black text-white disabled:opacity-60"
            >
              {editingBonusId !== null
                ? "💾 Bonus Güncelle"
                : "➕ Bonus Sorusu Ekle"}
            </button>
          </div>
        </section>

        <section className="mt-8 pb-12">
          <h2 className="mb-5 text-2xl font-black">
            Bonus Soruları
          </h2>

          <div className="grid gap-5 lg:grid-cols-2">
            {bonusQuestions.map((bonus) => (
              <article
                key={bonus.id}
                className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-black text-red-600">
                  {getMatchName(bonus.match_id)}
                </p>

                <h3 className="mt-2 text-lg font-black">
                  {bonus.question}
                </h3>

                {bonus.question_type === "multiple_choice" && (
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <b>A:</b> {bonus.option_a}
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <b>B:</b> {bonus.option_b}
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <b>C:</b> {bonus.option_c}
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <b>D:</b> {bonus.option_d}
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-xl bg-yellow-50 p-3">
                  <span className="font-bold">
                    Puan: +{bonus.points}
                  </span>

                  <span className="ml-4 font-black text-red-600">
                    Cevap: {bonus.correct_answer || "—"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => editBonus(bonus)}
                    className="rounded-xl bg-yellow-50 px-4 py-3 font-black text-yellow-800"
                  >
                    ✏️ Düzenle
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteBonus(bonus.id)}
                    className="rounded-xl bg-red-50 px-4 py-3 font-black text-red-700"
                  >
                    🗑️ Sil
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}