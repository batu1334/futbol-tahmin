"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  league: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  schedule_confirmed: boolean | null;
  home_logo_url: string | null;
  away_logo_url: string | null;
};

type Prediction = {
  match_id: number;
  home_score: number;
  away_score: number;
  points: number;
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

type BonusAnswer = {
  question_id: number;
  answer: string;
  points: number;
};

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);

  const [predictions, setPredictions] = useState<
    Record<number, Prediction>
  >({});

  const [bonusQuestions, setBonusQuestions] = useState<
    BonusQuestion[]
  >([]);

  const [bonusAnswers, setBonusAnswers] = useState<
    Record<number, BonusAnswer>
  >({});

  const [bonusInput, setBonusInput] = useState<
    Record<number, string>
  >({});

  const [email, setEmail] = useState("");

  const [totalPoints, setTotalPoints] = useState(0);
  const [predictionCount, setPredictionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBonus, setSavingBonus] = useState<number | null>(
    null
  );

  const [message, setMessage] = useState("");

  const [selectedMatchId, setSelectedMatchId] = useState<
    number | null
  >(null);

  const [homePrediction, setHomePrediction] = useState("");
  const [awayPrediction, setAwayPrediction] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const matchIdText = params.get("match");

    const matchId = matchIdText
      ? Number(matchIdText)
      : null;

    if (matchId && Number.isInteger(matchId)) {
      setSelectedMatchId(matchId);
    }

    load(matchId);
  }, []);

  async function load(initialMatchId: number | null = null) {
    setLoading(true);

    const userResult = await supabase.auth.getUser();

    if (!userResult.data.user) {
      window.location.href = "/login";
      return;
    }

    const user = userResult.data.user;

    setEmail(user.email || "");

    const matchResult = await supabase
      .from("Matches")
      .select(
        "id, home_team, away_team, kickoff, league, status, home_score, away_score, schedule_confirmed, home_logo_url, away_logo_url"
      )
      .order("kickoff", { ascending: true });

    let loadedMatches: Match[] = [];

    if (!matchResult.error) {
      loadedMatches = matchResult.data || [];
      setMatches(loadedMatches);
    } else {
      console.log(
        "Maç yükleme hatası:",
        matchResult.error
      );
    }

    const predictionResult = await supabase
      .from("Predictions")
      .select(
        "match_id, home_score, away_score, points"
      )
      .eq("user_id", user.id);

    if (!predictionResult.error) {
      const predictionMap: Record<
        number,
        Prediction
      > = {};

      let points = 0;
      let correct = 0;

      for (const prediction of
        predictionResult.data || []) {
        predictionMap[prediction.match_id] =
          prediction;

        points += prediction.points || 0;

        if (prediction.points === 20) {
          correct++;
        }
      }

      setPredictions(predictionMap);

      setTotalPoints(points);

      setPredictionCount(
        predictionResult.data?.length || 0
      );

      setCorrectCount(correct);
    }

    const bonusAnswerResult = await supabase
      .from("BonusAnswers")
      .select(
        "question_id, answer, points"
      )
      .eq("user_id", user.id);

    if (!bonusAnswerResult.error) {
      const answerMap: Record<
        number,
        BonusAnswer
      > = {};

      const inputMap: Record<
        number,
        string
      > = {};

      for (const answer of
        bonusAnswerResult.data || []) {
        answerMap[answer.question_id] =
          answer;

        inputMap[answer.question_id] =
          answer.answer;
      }

      setBonusAnswers(answerMap);
      setBonusInput(inputMap);
    }

    if (
      initialMatchId !== null &&
      Number.isInteger(initialMatchId)
    ) {
      const selected = loadedMatches.find(
        (match) =>
          match.id === initialMatchId
      );

      if (selected) {
        setSelectedMatchId(initialMatchId);

        const existingPrediction =
          predictionResult.data?.find(
            (prediction) =>
              prediction.match_id ===
              initialMatchId
          );

        if (existingPrediction) {
          setHomePrediction(
            existingPrediction.home_score.toString()
          );

          setAwayPrediction(
            existingPrediction.away_score.toString()
          );
        }

        await loadBonusQuestions(
          initialMatchId
        );
      }
    }

    setLoading(false);
  }

  async function loadBonusQuestions(
    matchId: number
  ) {
    const result = await supabase.rpc(
      "get_bonus_questions_for_match",
      {
        p_match_id: matchId,
      }
    );

    if (result.error) {
      console.log(
        "Bonus soru yükleme hatası:",
        result.error
      );

      setBonusQuestions([]);
      return;
    }

    setBonusQuestions(
      (result.data || []) as BonusQuestion[]
    );
  }

  function getSelectedMatch() {
    if (selectedMatchId === null) {
      return null;
    }

    return (
      matches.find(
        (match) =>
          match.id === selectedMatchId
      ) || null
    );
  }

  function isPredictionClosed(
    match: Match
  ) {
    if (!match.schedule_confirmed) {
      return true;
    }

    const kickoffTime = new Date(
      match.kickoff
    ).getTime();

    const closeTime =
      kickoffTime -
      10 * 60 * 1000;

    return Date.now() >= closeTime;
  }

  function openPrediction(
    matchId: number
  ) {
    const match = matches.find(
      (item) => item.id === matchId
    );

    if (!match) {
      return;
    }

    if (!match.schedule_confirmed) {
      setMessage(
        "🔒 Maç saati henüz kesinleşmedi."
      );
      return;
    }

    if (isPredictionClosed(match)) {
      setMessage(
        "⏰ Bu maç için tahmin süresi sona erdi. Tahminler maçtan 10 dakika önce kapanır."
      );
      return;
    }

    setMessage("");

    const existingPrediction =
      predictions[matchId];

    if (existingPrediction) {
      setHomePrediction(
        existingPrediction.home_score.toString()
      );

      setAwayPrediction(
        existingPrediction.away_score.toString()
      );
    } else {
      setHomePrediction("");
      setAwayPrediction("");
    }

    setSelectedMatchId(matchId);

    setBonusQuestions([]);

    loadBonusQuestions(matchId);

    window.history.replaceState(
      null,
      "",
      "/tahmin?match=" + matchId
    );
  }

  async function savePrediction() {
    setMessage("");

    if (selectedMatchId === null) {
      return;
    }

    const match = getSelectedMatch();

    if (!match) {
      setMessage("Maç bulunamadı.");
      return;
    }

    if (!match.schedule_confirmed) {
      setMessage(
        "🔒 Maç saati henüz kesinleşmedi."
      );
      return;
    }

    if (match.status !== "scheduled") {
      setMessage(
        "Bu maç için tahmin yapılamaz."
      );
      return;
    }

    if (isPredictionClosed(match)) {
      setMessage(
        "⏰ Tahmin süresi sona erdi. Tahminler maçtan 10 dakika önce kapanır."
      );
      return;
    }

    if (
      homePrediction === "" ||
      awayPrediction === ""
    ) {
      setMessage(
        "Lütfen iki takım için de skor gir."
      );
      return;
    }

    const homeScore =
      Number(homePrediction);

    const awayScore =
      Number(awayPrediction);

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore)
    ) {
      setMessage(
        "Skorlar tam sayı olmalıdır."
      );
      return;
    }

    if (
      homeScore < 0 ||
      awayScore < 0
    ) {
      setMessage(
        "Skor 0'dan küçük olamaz."
      );
      return;
    }

    if (
      homeScore > 30 ||
      awayScore > 30
    ) {
      setMessage(
        "Skor 30'dan büyük olamaz."
      );
      return;
    }

    const userResult =
      await supabase.auth.getUser();

    if (!userResult.data.user) {
      window.location.href = "/login";
      return;
    }

    setSaving(true);

    const existingPrediction =
      predictions[selectedMatchId];

    let result;

    if (existingPrediction) {
      result = await supabase
        .from("Predictions")
        .update({
          home_score: homeScore,
          away_score: awayScore,
        })
        .eq(
          "user_id",
          userResult.data.user.id
        )
        .eq(
          "match_id",
          selectedMatchId
        );
    } else {
      result = await supabase
        .from("Predictions")
        .insert({
          user_id:
            userResult.data.user.id,
          match_id: selectedMatchId,
          home_score: homeScore,
          away_score: awayScore,
          points: 0,
        });
    }

    setSaving(false);

    if (result.error) {
      console.log(result.error);

      if (
        result.error.code ===
        "23505"
      ) {
        setMessage(
          "Bu maç için zaten bir tahminin var."
        );
      } else {
        setMessage(
          "Tahmin kaydedilemedi: " +
            result.error.message
        );
      }

      return;
    }

    setMessage(
      "✅ Tahminin başarıyla kaydedildi!"
    );

    await load(selectedMatchId);
  }

  async function saveBonusAnswer(
    question: BonusQuestion
  ) {
    setMessage("");

    if (selectedMatchId === null) {
      setMessage("Maç seçilmedi.");
      return;
    }

    const match = getSelectedMatch();

    if (!match) {
      setMessage("Maç bulunamadı.");
      return;
    }

    if (!match.schedule_confirmed) {
      setMessage(
        "🔒 Maç saati henüz kesinleşmedi."
      );
      return;
    }

    if (
      match.status === "finished"
    ) {
      setMessage(
        "🏁 Maç tamamlandı. Bonus cevabı artık verilemez."
      );
      return;
    }

    if (isPredictionClosed(match)) {
      setMessage(
        "⏰ Bonus cevap süresi sona erdi. Cevaplar maçtan 10 dakika önce kapanır."
      );
      return;
    }

    const answer =
      (
        bonusInput[question.id] ||
        ""
      ).trim();

    if (answer === "") {
      setMessage(
        "Lütfen bonus soruya cevap ver."
      );
      return;
    }

    if (
      question.question_type ===
        "multiple_choice" &&
      !["A", "B", "C", "D"].includes(
        answer.toUpperCase()
      )
    ) {
      setMessage(
        "Lütfen A, B, C veya D seçeneklerinden birini seç."
      );
      return;
    }

    const existingAnswer =
      bonusAnswers[question.id];

    if (existingAnswer) {
      setMessage(
        "🔒 Bu bonus soruyu zaten cevapladın."
      );
      return;
    }

    const userResult =
      await supabase.auth.getUser();

    if (!userResult.data.user) {
      window.location.href = "/login";
      return;
    }

    setSavingBonus(question.id);

    const result =
      await supabase
        .from("BonusAnswers")
        .insert({
          user_id:
            userResult.data.user.id,
          question_id: question.id,
          answer:
            question.question_type ===
            "multiple_choice"
              ? answer.toUpperCase()
              : answer,
          points: 0,
        });

    setSavingBonus(null);

    if (result.error) {
      console.log(
        "Bonus cevap kayıt hatası:",
        result.error
      );

      if (
        result.error.code ===
        "23505"
      ) {
        setMessage(
          "🔒 Bu bonus soruyu zaten cevapladın."
        );
      } else {
        setMessage(
          "Bonus cevap kaydedilemedi: " +
            result.error.message
        );
      }

      return;
    }

    setMessage(
      "✅ Bonus cevabın kaydedildi!"
    );

    await load(selectedMatchId);
  }

  function backToMatches() {
    setSelectedMatchId(null);

    setHomePrediction("");
    setAwayPrediction("");

    setBonusQuestions([]);
    setBonusInput({});

    setMessage("");

    window.history.replaceState(
      null,
      "",
      "/tahmin"
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function getTeamInitial(team: string) {
    return (
      team.trim().charAt(0).toUpperCase() ||
      "⚽"
    );
  }

  function TeamLogo({
    url,
    team,
    size = "h-20 w-20",
  }: {
    url: string | null;
    team: string;
    size?: string;
  }) {
    const [imageError, setImageError] =
      useState(false);

    if (url && !imageError) {
      return (
        <div
          className={`${size} flex items-center justify-center rounded-2xl border border-slate-700 bg-white p-2 shadow-sm`}
        >
          <img
            src={url}
            alt={`${team} logosu`}
            className="h-full w-full object-contain"
            onError={() =>
              setImageError(true)
            }
          />
        </div>
      );
    }

    return (
      <div
        className={`${size} flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-3xl font-black text-slate-400`}
      >
        {getTeamInitial(team)}
      </div>
    );
  }

  const selectedMatch =
    getSelectedMatch();

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-slate-400">
            Maçlar yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  if (
    selectedMatchId !== null &&
    selectedMatch
  ) {
    const prediction =
      predictions[selectedMatch.id];

    const confirmed =
      selectedMatch.schedule_confirmed ===
      true;

    const closed =
      isPredictionClosed(
        selectedMatch
      );

    const matchFinished =
      selectedMatch.status ===
      "finished";

    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <header className="border-b border-slate-800 bg-slate-900 p-5">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">
              ⚽ Tahmin Yap
            </h1>

            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-700 px-4 py-2"
            >
              Çıkış
            </button>
          </div>
        </header>

        <section className="mx-auto max-w-3xl px-5 py-8">
          <button
            type="button"
            onClick={backToMatches}
            className="mb-5 rounded-xl border border-slate-700 px-4 py-3 hover:bg-slate-900"
          >
            ← Maçlara Dön
          </button>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-center text-sm text-blue-400">
              {selectedMatch.league}
            </p>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <TeamLogo
                  url={
                    selectedMatch.home_logo_url
                  }
                  team={
                    selectedMatch.home_team
                  }
                  size="h-24 w-24"
                />

                <p className="mt-3 break-words font-bold">
                  {selectedMatch.home_team}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Ev Sahibi
                </p>
              </div>

              <div className="shrink-0 text-xl font-bold text-slate-500">
                VS
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <TeamLogo
                  url={
                    selectedMatch.away_logo_url
                  }
                  team={
                    selectedMatch.away_team
                  }
                  size="h-24 w-24"
                />

                <p className="mt-3 break-words font-bold">
                  {selectedMatch.away_team}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Deplasman
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-slate-400">
              🕐{" "}
              {new Date(
                selectedMatch.kickoff
              ).toLocaleString("tr-TR")}
            </p>

            {!confirmed ? (
              <div className="mt-6 rounded-2xl border border-yellow-900 bg-yellow-950 p-6 text-center">
                <p className="text-2xl">
                  🔒
                </p>

                <p className="mt-3 text-lg font-bold text-yellow-300">
                  Saat henüz kesinleşmedi
                </p>

                <p className="mt-2 text-sm text-yellow-400">
                  Admin maç saatini
                  kesinleştirdiğinde tahmin
                  yapabileceksin.
                </p>
              </div>
            ) : !matchFinished &&
              !closed ? (
              <>
                <div className="mt-6 rounded-2xl border border-blue-900 bg-blue-950 p-5 text-center">
                  <p className="font-bold text-blue-300">
                    🎯 Maç sonucunu tahmin et
                  </p>

                  <p className="mt-2 text-sm text-blue-400">
                    Tahminler maçtan 10 dakika
                    önce kapanır.
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-center text-sm text-slate-400">
                      {selectedMatch.home_team}
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={
                        homePrediction
                      }
                      onChange={(e) =>
                        setHomePrediction(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl bg-slate-950 p-5 text-center text-3xl font-bold outline-none ring-1 ring-slate-700 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-center text-sm text-slate-400">
                      {selectedMatch.away_team}
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={
                        awayPrediction
                      }
                      onChange={(e) =>
                        setAwayPrediction(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl bg-slate-950 p-5 text-center text-3xl font-bold outline-none ring-1 ring-slate-700 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {prediction && (
                  <p className="mt-4 text-center text-sm text-yellow-400">
                    ⚠️ Mevcut tahminini
                    değiştiriyorsun.
                  </p>
                )}

                <button
                  type="button"
                  onClick={
                    savePrediction
                  }
                  disabled={saving}
                  className="mt-6 w-full rounded-xl bg-blue-600 p-4 font-bold hover:bg-blue-500 disabled:bg-slate-700"
                >
                  {saving
                    ? "Kaydediliyor..."
                    : prediction
                    ? "💾 Tahmini Güncelle"
                    : "🎯 Tahmini Kaydet"}
                </button>
              </>
            ) : !matchFinished &&
              closed ? (
              <div className="mt-6 rounded-2xl border border-red-900 bg-red-950 p-6 text-center">
                <p className="text-2xl">
                  ⏰
                </p>

                <p className="mt-3 text-lg font-bold text-red-300">
                  Tahmin süresi sona erdi
                </p>

                <p className="mt-2 text-sm text-red-400">
                  Tahminler maçtan 10 dakika
                  önce kapanır.
                </p>

                {prediction && (
                  <div className="mt-5 rounded-xl bg-slate-900 p-4">
                    <p className="text-sm text-slate-400">
                      Kayıtlı tahminin
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {
                        prediction.home_score
                      }{" "}
                      -{" "}
                      {
                        prediction.away_score
                      }
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-green-900 bg-green-950 p-5 text-center">
                <p className="text-lg font-bold text-green-300">
                  🏁 Maç tamamlandı
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {
                    selectedMatch.home_score
                  }{" "}
                  -{" "}
                  {
                    selectedMatch.away_score
                  }
                </p>

                {prediction && (
                  <p className="mt-3 text-sm text-yellow-400">
                    🏆 Tahmin puanın: +
                    {
                      prediction.points
                    }
                  </p>
                )}
              </div>
            )}

            {message !== "" && (
              <div className="mt-5 rounded-xl bg-slate-950 p-4 text-center">
                {message}
              </div>
            )}

            {bonusQuestions.length > 0 && (
              <div className="mt-8 border-t border-slate-800 pt-8">
                <div className="mb-5">
                  <p className="text-2xl font-bold">
                    🎁 Bonus Sorular
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Doğru cevaplar maç
                    tamamlandıktan sonra
                    açıklanır.
                  </p>
                </div>

                <div className="space-y-5">
                  {bonusQuestions.map(
                    (
                      question,
                      index
                    ) => {
                      const existingAnswer =
                        bonusAnswers[
                          question.id
                        ];

                      const selectedAnswer =
                        bonusInput[
                          question.id
                        ] || "";

                      const isSaving =
                        savingBonus ===
                        question.id;

                      const canAnswer =
                        confirmed &&
                        !matchFinished &&
                        !closed &&
                        !existingAnswer;

                      return (
                        <div
                          key={
                            question.id
                          }
                          className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-bold">
                              {index + 1}.{" "}
                              {
                                question.question
                              }
                            </p>

                            <span className="shrink-0 rounded-full bg-yellow-950 px-3 py-1 text-xs font-bold text-yellow-400">
                              +
                              {
                                question.points
                              }{" "}
                              puan
                            </span>
                          </div>

                          {question.question_type ===
                          "multiple_choice" ? (
                            <div className="mt-5 grid gap-3">
                              {(
                                [
                                  [
                                    "A",
                                    question.option_a,
                                  ],
                                  [
                                    "B",
                                    question.option_b,
                                  ],
                                  [
                                    "C",
                                    question.option_c,
                                  ],
                                  [
                                    "D",
                                    question.option_d,
                                  ],
                                ] as Array<
                                  [
                                    string,
                                    string | null
                                  ]
                                >
                              ).map(
                                ([
                                  letter,
                                  option,
                                ]) => {
                                  if (
                                    !option
                                  ) {
                                    return null;
                                  }

                                  const isSelected =
                                    selectedAnswer ===
                                    letter;

                                  const isCorrect =
                                    matchFinished &&
                                    question.correct_answer ===
                                      letter;

                                  return (
                                    <button
                                      key={
                                        letter
                                      }
                                      type="button"
                                      disabled={
                                        !canAnswer
                                      }
                                      onClick={() => {
                                        setBonusInput(
                                          (
                                            current
                                          ) => ({
                                            ...current,
                                            [question.id]:
                                              letter,
                                          })
                                        );

                                        setMessage(
                                          ""
                                        );
                                      }}
                                      className={
                                        "rounded-xl border p-4 text-left transition " +
                                        (isCorrect
                                          ? "border-green-600 bg-green-950"
                                          : isSelected
                                          ? "border-blue-500 bg-blue-950"
                                          : "border-slate-700 bg-slate-900 hover:border-slate-500") +
                                        (!canAnswer
                                          ? " cursor-not-allowed opacity-70"
                                          : "")
                                      }
                                    >
                                      <span className="font-bold">
                                        {
                                          letter
                                        }
                                        )
                                      </span>{" "}
                                      {
                                        option
                                      }

                                      {isCorrect && (
                                        <span className="float-right text-green-400">
                                          ✅ Doğru cevap
                                        </span>
                                      )}
                                    </button>
                                  );
                                }
                              )}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={
                                selectedAnswer
                              }
                              disabled={
                                !canAnswer
                              }
                              onChange={(e) =>
                                setBonusInput(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    [question.id]:
                                      e.target.value,
                                  })
                                )
                              }
                              placeholder="Cevabını yaz..."
                              className="mt-5 w-full rounded-xl bg-slate-900 p-4 outline-none ring-1 ring-slate-700 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          )}

                          {existingAnswer ? (
                            <div className="mt-5 rounded-xl border border-blue-900 bg-blue-950 p-4">
                              <p className="text-sm text-blue-300">
                                🔒 Verdiğin
                                cevap
                              </p>

                              <p className="mt-2 font-bold">
                                {
                                  existingAnswer.answer
                                }
                              </p>

                              {matchFinished && (
                                <>
                                  <p className="mt-4 text-sm text-green-300">
                                    ✅ Doğru
                                    cevap
                                  </p>

                                  <p className="mt-2 font-bold">
                                    {question.correct_answer ||
                                      "Açıklanmadı"}
                                  </p>

                                  <p className="mt-3 font-bold text-yellow-400">
                                    🏆 +
                                    {
                                      existingAnswer.points
                                    }{" "}
                                    bonus
                                    puan
                                  </p>
                                </>
                              )}

                              {!matchFinished && (
                                <p className="mt-3 text-xs text-slate-400">
                                  Doğru cevap
                                  maç
                                  tamamlandıktan
                                  sonra
                                  açıklanacak.
                                </p>
                              )}
                            </div>
                          ) : matchFinished ? (
                            <div className="mt-5 rounded-xl border border-green-900 bg-green-950 p-4">
                              <p className="font-bold text-green-300">
                                ✅ Doğru
                                cevap
                              </p>

                              <p className="mt-2 font-bold">
                                {question.correct_answer ||
                                  "Açıklanmadı"}
                              </p>
                            </div>
                          ) : !confirmed ? (
                            <div className="mt-5 rounded-xl border border-yellow-900 bg-yellow-950 p-4 text-center">
                              <p className="font-semibold text-yellow-300">
                                🔒 Saat henüz
                                kesinleşmedi
                              </p>
                            </div>
                          ) : closed ? (
                            <div className="mt-5 rounded-xl border border-red-900 bg-red-950 p-4 text-center">
                              <p className="font-semibold text-red-300">
                                ⏰ Bonus cevap
                                süresi sona
                                erdi
                              </p>

                              <p className="mt-1 text-sm text-red-400">
                                Cevaplar
                                maçtan 10
                                dakika önce
                                kapanır.
                              </p>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                saveBonusAnswer(
                                  question
                                )
                              }
                              disabled={
                                isSaving ||
                                selectedAnswer ===
                                  ""
                              }
                              className="mt-5 w-full rounded-xl bg-yellow-500 p-4 font-bold text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                            >
                              {isSaving
                                ? "Kaydediliyor..."
                                : "🎁 Bonus Cevabını Kaydet"}
                            </button>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 p-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              ⚽ Futbol Tahmin
            </h1>

            <p className="text-sm text-slate-400">
              Maçları tahmin et, puanları topla!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/siralama"
              className="rounded-lg border border-slate-700 px-4 py-2"
            >
              🏆 Sıralama
            </a>

            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-700 px-4 py-2"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-6 rounded-2xl bg-slate-900 p-6">
          <p className="text-sm text-blue-400">
            HOŞ GELDİN 👋
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Maçını seç ve tahminini yap!
          </h2>

          {email !== "" && (
            <p className="mt-2 text-sm text-slate-400">
              👤 {email}
            </p>
          )}
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              🏆 Puanım
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-400">
              {totalPoints}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              🎯 Tahminlerim
            </p>

            <p className="mt-2 text-3xl font-bold">
              {predictionCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              ✅ Tam İsabet
            </p>

            <p className="mt-2 text-3xl font-bold text-green-400">
              {correctCount}
            </p>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">
            ⚽ Yaklaşan Maçlar
          </h2>

          <a
            href="/siralama"
            className="rounded-xl bg-yellow-500 px-4 py-3 font-bold text-black hover:bg-yellow-400"
          >
            🏆 Sıralamayı Gör
          </a>
        </div>

        {matches.length === 0 ? (
          <p className="mt-5 text-slate-400">
            Henüz maç bulunmuyor.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {matches.map((match) => {
              const prediction =
                predictions[match.id];

              const confirmed =
                match.schedule_confirmed ===
                true;

              const closed =
                isPredictionClosed(match);

              return (
                <div
                  key={match.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-blue-400">
                      {match.league}
                    </p>

                    {confirmed ? (
                      <span className="rounded-full bg-green-950 px-3 py-1 text-xs font-semibold text-green-400">
                        ✅ Saat kesin
                      </span>
                    ) : (
                      <span className="rounded-full bg-yellow-950 px-3 py-1 text-xs font-semibold text-yellow-400">
                        🔒 Saat bekleniyor
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                      <TeamLogo
                        url={match.home_logo_url}
                        team={match.home_team}
                      />

                      <p className="mt-3 break-words font-semibold">
                        {match.home_team}
                      </p>
                    </div>

                    <div className="shrink-0 font-bold text-slate-500">
                      VS
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                      <TeamLogo
                        url={match.away_logo_url}
                        team={match.away_team}
                      />

                      <p className="mt-3 break-words font-semibold">
                        {match.away_team}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-center text-sm text-slate-400">
                    🕐{" "}
                    {new Date(
                      match.kickoff
                    ).toLocaleString(
                      "tr-TR"
                    )}
                  </p>

                  {prediction ? (
                    <div className="mt-5 rounded-xl border border-green-800 bg-green-950 p-4 text-center">
                      <p className="text-sm text-green-400">
                        🔒 TAHMİNİN
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {
                          prediction.home_score
                        }{" "}
                        -{" "}
                        {
                          prediction.away_score
                        }
                      </p>

                      {match.status ===
                      "finished" ? (
                        <>
                          <p className="mt-3 text-sm text-slate-400">
                            Maç sonucu:{" "}
                            {
                              match.home_score
                            }{" "}
                            -{" "}
                            {
                              match.away_score
                            }
                          </p>

                          <p className="mt-2 font-bold text-yellow-400">
                            🏆 +
                            {
                              prediction.points
                            }{" "}
                            puan
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-slate-400">
                          Tahminin
                          kayıtlı.
                        </p>
                      )}
                    </div>
                  ) : !confirmed ? (
                    <div className="mt-5 rounded-xl border border-yellow-900 bg-yellow-950 p-4 text-center">
                      <p className="font-semibold text-yellow-300">
                        🔒 Saat henüz
                        kesinleşmedi
                      </p>

                      <p className="mt-1 text-sm text-yellow-400">
                        Admin maç saatini
                        kesinleştirdiğinde
                        tahmin açılacak.
                      </p>
                    </div>
                  ) : closed ? (
                    <div className="mt-5 rounded-xl border border-red-900 bg-red-950 p-4 text-center">
                      <p className="font-semibold text-red-300">
                        ⏰ Tahmin süresi sona
                        erdi
                      </p>

                      <p className="mt-1 text-sm text-red-400">
                        Tahminler maçtan 10
                        dakika önce kapanır.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        openPrediction(
                          match.id
                        )
                      }
                      className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-500"
                    >
                      🎯 Tahmin Yap
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}