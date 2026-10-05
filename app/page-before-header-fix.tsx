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
  live_minute: number | null;
  added_minute: number | null;
  live_started_at: string | null;
  live_period: number | null;
  schedule_confirmed: boolean;
  home_logo_url: string | null;
  away_logo_url: string | null;

  broadcaster?: string | null;
  broadcast_channel?: string | null;
  channel?: string | null;
  tv_channel?: string | null;
  yayinci?: string | null;
  yayinci_kanal?: string | null;

  [key: string]: unknown;
};

type MatchEvent = {
  id: number;
  match_id: number;
  event_type: "goal" | "substitution" | "yellow_card" | "red_card";
  team: "home" | "away" | null;
  player_name: string | null;
  player_out: string | null;
  player_in: string | null;
  minute: number;
  added_minute: number;
  created_at: string;
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

type BonusQuestion = {
  id: number;
  question: string;
  options: string[] | null;
  correct_answer?: string | null;
  points: number;
  is_active: boolean;
  answer_revealed?: boolean;
  match_id?: number | null;
  created_at?: string;
};

type PollAnswer = {
  id: number;
  question_id: number;
  answer: string;
  points: number;
};

type Survey = {
  id: number;
  question: string;
  options: string[] | null;
  correct_answer?: string | null;
  points: number;
  is_active: boolean;
  created_at?: string;
};

type Profile = {
  display_name: string | null;
  is_admin: boolean;
};

type Player = {
  id: string;
  name: string;
  photo_url: string | null;
  jersey_number: number | null;
  position: string | null;
  goals: number;
  assists: number;
  team: string | null;
};

type MatchLineup = {
  id: number;
  match_id: number;
  player_id: string;
  team: "home" | "away";
  status: "starting" | "substitute" | "absent";
  absence_reason: string | null;
};

type RewardRow = {
  points: number | null;
  created_at?: string | null;
};

type WheelOption = {
  slot: number;
  points: number | null;
  is_active: boolean;
};

type ManualPointRow = {
  points: number | null;
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
  const [selectedDate, setSelectedDate] = useState<string>("all");

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const [profile, setProfile] = useState<Profile>({
    display_name: "Oyuncu",
    is_admin: false,
  });

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matchLineups, setMatchLineups] = useState<MatchLineup[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [bonusAnswers, setBonusAnswers] = useState<BonusAnswer[]>([]);
  const [bonusQuestions, setBonusQuestions] = useState<BonusQuestion[]>([]);
  const [bonusSelected, setBonusSelected] = useState<Record<number, string>>({});
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusMessage, setBonusMessage] = useState("");
  const [pollAnswers, setPollAnswers] = useState<PollAnswer[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveyMessage, setSurveyMessage] = useState("");
  const [surveySelected, setSurveySelected] = useState<Record<number, string>>({});

  // Bonus kodu ve ödül çarkı puanları
  const [bonusCodeRedemptions, setBonusCodeRedemptions] = useState<
    RewardRow[]
  >([]);

  const [wheelSpins, setWheelSpins] = useState<RewardRow[]>([]);
  const [wheelOptions, setWheelOptions] = useState<WheelOption[]>([]);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelMessage, setWheelMessage] = useState("");
  const [wheelResult, setWheelResult] = useState<number | null>(null);
  const [manualPointAdjustments, setManualPointAdjustments] = useState<ManualPointRow[]>([]);
  const [manualUserPoints, setManualUserPoints] = useState<ManualPointRow[]>([]);

  // Bonus kodu kullanma
  const [bonusCode, setBonusCode] = useState("");
  const [bonusCodeLoading, setBonusCodeLoading] = useState(false);
  const [bonusCodeMessage, setBonusCodeMessage] = useState("");
  const [bonusCodeSuccess, setBonusCodeSuccess] = useState(false);

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  const loadData = async (currentUserId: string) => {
    const [
      matchesResult,
      matchEventsResult,
      playersResult,
      matchLineupsResult,
      predictionsResult,
      bonusResult,
      bonusQuestionResult,
      surveyResult,
      pollAnswerResult,
      profileResult,
      bonusCodeResult,
      wheelResult,
      wheelOptionsResult,
      manualPointsResult,
      manualUserPointsResult,
    ] = await Promise.all([
      supabase
        .from("Matches")
        .select("*")
        .order("kickoff", { ascending: true }),

      supabase
        .from("MatchEvents")
        .select("*")
        .order("minute", { ascending: true }),

      supabase
        .from("players")
        .select("id,name,photo_url,jersey_number,position,goals,assists,team")
        .order("name", { ascending: true }),

      supabase
        .from("match_lineups")
        .select("id,match_id,player_id,team,status,absence_reason")
        .order("id", { ascending: true }),

      supabase
        .from("Predictions")
        .select("*")
        .eq("user_id", currentUserId),

      supabase
        .from("BonusAnswers")
        .select("*")
        .eq("user_id", currentUserId),

      supabase
        .from("BonusQuestions")
        .select("id,question,options,points,is_active,answer_revealed,match_id,created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),

      supabase
        .from("PollQuestions")
        .select("id, question, options, points, is_active, answer_revealed, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),

      supabase
        .from("PollAnswers")
        .select("id, question_id, answer, points")
        .eq("user_id", currentUserId),

      supabase
        .from("profiles")
        .select("display_name, is_admin")
        .eq("id", currentUserId)
        .maybeSingle(),

      supabase
        .from("bonus_code_redemptions")
        .select("points")
        .eq("user_id", currentUserId),

      supabase
        .from("reward_wheel_spins")
        .select("points,created_at")
        .eq("user_id", currentUserId),

      supabase
        .from("reward_wheel_options")
        .select("slot,points,is_active")
        .eq("is_active", true)
        .order("slot", { ascending: true }),

      supabase
        .from("admin_point_adjustments")
        .select("points")
        .eq("user_id", currentUserId),

      supabase
        .from("admin_manual_points")
        .select("points")
        .eq("user_id", currentUserId),
    ]);

    if (matchesResult.error) {
      console.error("Matches:", matchesResult.error);
    }

    if (playersResult.error) {
      console.error("players:", playersResult.error);
    }

    if (predictionsResult.error) {
      console.error("Predictions:", predictionsResult.error);
    }

    if (bonusResult.error) {
      console.error("BonusAnswers:", bonusResult.error);
    }

    if (bonusQuestionResult.error) {
      console.error("BonusQuestions:", bonusQuestionResult.error);
    }

    if (pollAnswerResult.error) {
      console.error("PollAnswers:", pollAnswerResult.error);
    }

    if (surveyResult.error) {
      console.error("PollQuestions:", surveyResult.error);
    }

    if (profileResult.error) {
      console.error("profiles:", profileResult.error);
    }

    if (bonusCodeResult.error) {
      console.error("bonus_code_redemptions:", bonusCodeResult.error);
    }

    if (wheelResult.error) {
      console.error("reward_wheel_spins:", wheelResult.error);
    }

    if (wheelOptionsResult.error) {
      console.error("reward_wheel_options:", wheelOptionsResult.error);
    }

    if (manualPointsResult.error) {
      console.error("admin_point_adjustments:", manualPointsResult.error);
    }

    if (manualUserPointsResult.error) {
      console.error("admin_manual_points:", manualUserPointsResult.error);
    }

    const defaultWheelOptions: WheelOption[] = [
      { slot: 1, points: 5, is_active: true },
      { slot: 2, points: 10, is_active: true },
      { slot: 3, points: 15, is_active: true },
      { slot: 4, points: 20, is_active: true },
      { slot: 5, points: 25, is_active: true },
      { slot: 6, points: 30, is_active: true },
      { slot: 7, points: 10, is_active: true },
      { slot: 8, points: 20, is_active: true },
      { slot: 9, points: null, is_active: true },
      { slot: 10, points: null, is_active: true },
    ];

    setWheelOptions(
      wheelOptionsResult.data && wheelOptionsResult.data.length > 0
        ? (wheelOptionsResult.data as WheelOption[])
        : defaultWheelOptions
    );

    if (matchEventsResult.error) {
      console.error("MatchEvents yüklenemedi:", matchEventsResult.error);
    }

    if (matchLineupsResult.error) {
      console.error("match_lineups yüklenemedi:", matchLineupsResult.error);
    }

    setMatches((matchesResult.data || []) as Match[]);
    setMatchEvents((matchEventsResult.data || []) as MatchEvent[]);
    setPlayers((playersResult.data || []) as Player[]);
    setMatchLineups((matchLineupsResult.data || []) as MatchLineup[]);
    setPredictions((predictionsResult.data || []) as Prediction[]);
    setBonusAnswers((bonusResult.data || []) as BonusAnswer[]);
    setBonusQuestions((bonusQuestionResult.data || []) as BonusQuestion[]);
    setPollAnswers((pollAnswerResult.data || []) as PollAnswer[]);
    setSurveys((surveyResult.data || []) as Survey[]);

    setBonusCodeRedemptions(
      ((bonusCodeResult.data || []) as RewardRow[]).map((item) => ({
        points: Number(item.points) || 0,
      }))
    );

    setWheelSpins(
      ((wheelResult.data || []) as RewardRow[]).map((item) => ({
        points: Number(item.points) || 0,
        created_at: item.created_at || null,
      }))
    );

    setManualPointAdjustments(
      ((manualPointsResult.data || []) as ManualPointRow[]).map((item) => ({
        points: Number(item.points) || 0,
      }))
    );

    setManualUserPoints(
      ((manualUserPointsResult.data || []) as ManualPointRow[]).map((item) => ({
        points: Number(item.points) || 0,
      }))
    );

    if (profileResult.data) {
      setProfile({
        display_name: profileResult.data.display_name || "Oyuncu",
        is_admin: Boolean(profileResult.data.is_admin),
      });
    }
  };

  const getLiveScoreText = (match: Match) =>
    `${match.home_score ?? 0} - ${match.away_score ?? 0}`;

  const getLiveMinuteText = (match: Match) => {
    const added = Math.max(0, Number(match.added_minute ?? 0));
    const period = Number(match.live_period ?? 1);
    const savedMinute = Math.max(0, Number(match.live_minute ?? 0));

    if (match.status !== "live" || !match.live_started_at) {
      return `${savedMinute}${added > 0 ? `+${added}` : ""}'`;
    }

    const started = new Date(match.live_started_at).getTime();
    if (!Number.isFinite(started)) {
      return `${savedMinute}${added > 0 ? `+${added}` : ""}'`;
    }

    const elapsedMinutes = Math.max(0, Math.floor((currentTime - started) / 60000));
    const baseMinute = period === 2
      ? Math.min(90, 45 + elapsedMinutes)
      : Math.min(45, elapsedMinutes);

    if (period === 1 && baseMinute >= 45 && added > 0) return `45+${added}'`;
    if (period === 2 && baseMinute >= 90 && added > 0) return `90+${added}'`;
    return `${baseMinute}'`;
  };

  const getEventMinuteText = (event: MatchEvent) => {
    const minute = Math.max(0, Number(event.minute ?? 0));
    const added = Math.max(0, Number(event.added_minute ?? 0));

    if (added > 0 && (minute === 45 || minute === 90)) {
      return `${minute}+${added}'`;
    }

    return `${minute}'`;
  };

  const getEventLabel = (event: MatchEvent) => {
    const minute = getEventMinuteText(event);
    const team = event.team === "home" ? "Ev" : event.team === "away" ? "Dep" : "";

    if (event.event_type === "goal") {
      return `⚽ ${minute} ${event.player_name || "Gol"}${team ? ` (${team})` : ""}`;
    }

    if (event.event_type === "substitution") {
      return `🔄 ${minute} ${event.player_out || "Oyuncu"} → ${event.player_in || "Oyuncu"}${team ? ` (${team})` : ""}`;
    }

    if (event.event_type === "yellow_card") {
      return `🟨 ${minute} ${event.player_name || "Oyuncu"}${team ? ` (${team})` : ""}`;
    }

    return `🟥 ${minute} ${event.player_name || "Oyuncu"}${team ? ` (${team})` : ""}`;
  };

  const getMatchEvents = (matchId: number) =>
    matchEvents
      .filter((event) => event.match_id === matchId)
      .sort((a, b) => {
        const aMinute = Number(a.minute || 0) * 100 + Number(a.added_minute || 0);
        const bMinute = Number(b.minute || 0) * 100 + Number(b.added_minute || 0);
        if (aMinute !== bMinute) return aMinute - bMinute;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

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

  // Canlı maç kontrolü
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  // Supabase realtime
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
        (payload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const nextMatch = payload.new as Partial<Match> & { id?: number };
            if (nextMatch.id != null) {
              setMatches((current) =>
                current.map((item) =>
                  item.id === nextMatch.id
                    ? ({ ...item, ...nextMatch } as Match)
                    : item
                )
              );
              setSelectedMatch((current) =>
                current && current.id === nextMatch.id
                  ? ({ ...current, ...nextMatch } as Match)
                  : current
              );
            }
          }
          void loadData(userId);
        }
      )
      .subscribe();

    const eventsChannel = supabase
      .channel("home-match-events")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "MatchEvents",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMatchEvents((current) => {
              const incoming = payload.new as MatchEvent;
              if (current.some((event) => event.id === incoming.id)) return current;
              return [...current, incoming];
            });
          } else if (payload.eventType === "UPDATE") {
            setMatchEvents((current) =>
              current.map((event) =>
                event.id === (payload.new as MatchEvent).id
                  ? (payload.new as MatchEvent)
                  : event
              )
            );
          } else if (payload.eventType === "DELETE") {
            setMatchEvents((current) =>
              current.filter((event) => event.id !== (payload.old as MatchEvent).id)
            );
          }
        }
      )
      .subscribe();

    const playersChannel = supabase
      .channel("home-players")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        () => {
          loadData(userId);
        }
      )
      .subscribe();

    const lineupsChannel = supabase
      .channel("home-match-lineups")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_lineups" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const incoming = payload.new as MatchLineup;
            setMatchLineups((current) =>
              current.some((row) => row.id === incoming.id)
                ? current
                : [...current, incoming]
            );
          } else if (payload.eventType === "UPDATE") {
            const incoming = payload.new as MatchLineup;
            setMatchLineups((current) =>
              current.map((row) => row.id === incoming.id ? incoming : row)
            );
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<MatchLineup>;
            setMatchLineups((current) =>
              current.filter((row) => row.id !== oldRow.id)
            );
          }
          void loadData(userId);
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

    const surveyChannel = supabase
      .channel("home-surveys")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "BonusQuestions" },
        () => { loadData(userId); }
      )
      .subscribe();

    const bonusCodeChannel = supabase
      .channel("home-bonus-code")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bonus_code_redemptions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadData(userId);
        }
      )
      .subscribe();

    const wheelChannel = supabase
      .channel("home-wheel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reward_wheel_spins",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadData(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(lineupsChannel);
      supabase.removeChannel(predictionsChannel);
      supabase.removeChannel(bonusChannel);
      supabase.removeChannel(surveyChannel);
      supabase.removeChannel(bonusCodeChannel);
      supabase.removeChannel(wheelChannel);
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

  // BONUS KODU KULLAN
  const useBonusCode = async () => {
    const code = bonusCode.trim();

    if (!code) {
      setBonusCodeSuccess(false);
      setBonusCodeMessage("Lütfen bonus kodunu gir.");
      return;
    }

    if (!userId) {
      setBonusCodeSuccess(false);
      setBonusCodeMessage(
        "Oturum bulunamadı. Lütfen tekrar giriş yap."
      );
      return;
    }

    setBonusCodeLoading(true);
    setBonusCodeMessage("");
    setBonusCodeSuccess(false);

    const { data, error } = await supabase.rpc("redeem_bonus_code", {
      p_code: code,
    });

    setBonusCodeLoading(false);

    if (error) {
      console.error("Bonus kodu:", error);

      setBonusCodeSuccess(false);
      setBonusCodeMessage(error.message);
      return;
    }

    const points = Number(data?.points || 0);

    setBonusCode("");
    setBonusCodeSuccess(true);

    setBonusCodeMessage(
      points > 0
        ? `Başarılı! +${points} puan hesabına eklendi.`
        : "Bonus kodu başarıyla kullanıldı."
    );

    await loadData(userId);
  };

  const formatRemainingTime = (milliseconds: number) => {
    const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} saat ${minutes} dakika`;
  };

  const spinRewardWheel = async () => {
    if (!userId || wheelSpinning) return;

    const lastSpin = wheelSpins
      .map((spin) => (spin.created_at ? new Date(spin.created_at).getTime() : 0))
      .filter((time) => Number.isFinite(time) && time > 0)
      .sort((a, b) => b - a)[0] || 0;

    const remaining = lastSpin + 24 * 60 * 60 * 1000 - Date.now();
    if (remaining > 0) {
      setWheelMessage(`⏳ Çarkı tekrar çevirmek için ${formatRemainingTime(remaining)} beklemelisin.`);
      return;
    }

    setWheelSpinning(true);
    setWheelMessage("");
    setWheelResult(null);

    const { data, error } = await supabase.rpc("spin_reward_wheel");

    if (error) {
      console.error("Çark:", error);
      setWheelSpinning(false);
      setWheelMessage(error.message);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    const slot = Number(result?.slot);
    const points = Number(result?.points || 0);

    if (!slot || slot < 1 || slot > 10) {
      setWheelSpinning(false);
      setWheelMessage("Çark sonucu alınamadı.");
      return;
    }

    const segmentCenter = (slot - 0.5) * 36;
    const targetRotation = wheelRotation + 360 * 5 + (360 - segmentCenter);

    setWheelRotation(targetRotation);

    window.setTimeout(async () => {
      setWheelSpinning(false);
      setWheelResult(points);
      setWheelMessage(
        points > 0
          ? `🎉 Tebrikler! Çarktan +${points} puan kazandın.`
          : "😅 Bu kez boş geldi. Bir sonraki çarkta bol şans!"
      );

      await loadData(userId);
    }, 4200);
  };

  const submitBonusAnswer = async (question: BonusQuestion, answer: string) => {
    if (!userId || bonusLoading) return;

    const alreadyAnswered = bonusAnswers.some((item) => item.question_id === question.id);
    if (alreadyAnswered) {
      setBonusMessage("Bu bonus sorusuna daha önce cevap verdin.");
      return;
    }

    setBonusLoading(true);
    setBonusMessage("");
    setBonusSelected((prev) => ({ ...prev, [question.id]: answer }));

    const { data, error } = await supabase.rpc("submit_bonus_answer", {
      p_question_id: question.id,
      p_answer: answer,
    });

    setBonusLoading(false);

    if (error) {
      console.error("Bonus answer:", error);
      setBonusMessage(error.message || "Bonus cevabı kaydedilemedi.");
      await loadData(userId);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    const earnedPoints = Number(result?.points || 0);

    setBonusMessage(
      earnedPoints > 0
        ? `Doğru cevap! +${earnedPoints} puan kazandın.`
        : "Cevabın kaydedildi. Doğru cevap açıklandığında puanın hesaplanacak."
    );

    await loadData(userId);
  };

  const submitSurvey = async (survey: Survey, answer: string) => {
    if (!userId || surveyLoading) return;

    const alreadyAnswered = pollAnswers.some((item) => item.question_id === survey.id);
    if (alreadyAnswered) {
      setSurveyMessage("Bu ankete daha önce cevap verdin.");
      return;
    }

    setSurveyLoading(true);
    setSurveyMessage("");
    setSurveySelected((prev) => ({ ...prev, [survey.id]: answer }));

    const { data, error } = await supabase.rpc("submit_poll_answer", {
      p_question_id: survey.id,
      p_answer: answer,
    });

    const earnedPoints = Number(data?.points || 0);

    setSurveyLoading(false);

    if (error) {
      console.error("Poll answer:", error);
      setSurveyMessage(error.message || "Anket cevabı kaydedilemedi.");
      await loadData(userId);
      return;
    }

    setSurveyMessage(
      earnedPoints > 0
        ? `Doğru cevap! +${earnedPoints} puan kazandın.`
        : "Cevabın kaydedildi. Bu sorudan puan kazanamadın."
    );

    await loadData(userId);
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

  const formatOnlyTime = (date: string | null) => {
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

  /*
   * MEVCUT MAÇ PUANLAMA MANTIĞI AYNEN KORUNDU.
   */
  const matchPoints = predictions.reduce(
    (sum, prediction) => sum + (prediction.points || 0),
    0
  );

  const bonusPoints = bonusAnswers.reduce(
    (sum, answer) => sum + (answer.points || 0),
    0
  );

  /*
   * BONUS KODU PUANLARI
   */
  const bonusCodePoints = bonusCodeRedemptions.reduce(
    (sum, item) => sum + (Number(item.points) || 0),
    0
  );

  /*
   * ÇARK PUANLARI
   */
  const wheelPoints = wheelSpins.reduce(
    (sum, item) => sum + (Number(item.points) || 0),
    0
  );

  const manualPoints = manualPointAdjustments.reduce(
    (sum, item) => sum + (Number(item.points) || 0),
    0
  );

  const manualUserPointsTotal = manualUserPoints.reduce(
    (sum, item) => sum + (Number(item.points) || 0),
    0
  );

  /*
   * TOPLAM TAHMİN PUANI
   *
   * Maç + Bonus Soru + Bonus Kod + Çark
   */
  const totalPoints =
    matchPoints +
    bonusPoints +
    bonusCodePoints +
    wheelPoints +
    manualPoints +
    manualUserPointsTotal;

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

  const baseFilteredMatches =
    matchFilter === "upcoming"
      ? upcomingMatches
      : matchFilter === "finished"
        ? finishedMatches
        : matches;

  const getMatchDateKey = (match: Match) => {
    if (match.match_date) {
      const value = String(match.match_date).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
      }
    }

    if (match.kickoff) {
      const parsed = new Date(match.kickoff);
      if (!Number.isNaN(parsed.getTime())) {
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Istanbul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(parsed);

        const year = parts.find((item) => item.type === "year")?.value;
        const month = parts.find((item) => item.type === "month")?.value;
        const day = parts.find((item) => item.type === "day")?.value;

        if (year && month && day) {
          return `${year}-${month}-${day}`;
        }
      }
    }

    return "unknown";
  };

  const dateOptions = Array.from(
    new Set(
      matches
        .map((match) => getMatchDateKey(match))
        .filter((key) => key !== "unknown")
    )
  ).sort();

  const formatDateChip = (dateKey: string) => {
    const parsed = new Date(`${dateKey}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      return { day: "--", weekday: "Tarih" };
    }

    return {
      day: new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "2-digit",
      }).format(parsed),
      weekday: new Intl.DateTimeFormat("tr-TR", {
        weekday: "short",
      }).format(parsed),
    };
  };

  const filteredMatches =
    selectedDate === "all"
      ? baseFilteredMatches
      : baseFilteredMatches.filter(
          (match) => getMatchDateKey(match) === selectedDate
        );

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

  const getMatchLineups = (matchId: number) =>
    matchLineups.filter((row) => row.match_id === matchId);

  const getLineupPlayers = (matchId: number, team: "home" | "away", status: MatchLineup["status"]) => {
    const rows = getMatchLineups(matchId).filter((row) => row.team === team && row.status === status);
    return rows
      .map((row) => {
        const player = players.find((item) => String(item.id) === String(row.player_id));
        return player ? { ...row, player } : null;
      })
      .filter((item): item is MatchLineup & { player: Player } => Boolean(item));
  };

  const selectedPrediction = selectedMatch
    ? getPrediction(selectedMatch.id)
    : null;

  const selectedIsFinished =
    selectedMatch?.status === "finished";

  const selectedIsCancelled =
    selectedMatch?.status === "cancelled";

  const selectedIsLive = selectedMatch?.status === "live";
  const selectedIsHalftime = selectedMatch?.status === "halftime";

  const selectedCanPredict =
    Boolean(selectedMatch) &&
    !selectedIsFinished &&
    !selectedIsCancelled &&
    !selectedIsLive &&
    !selectedIsHalftime &&
    Boolean(selectedMatch?.schedule_confirmed) &&
    Boolean(selectedMatch?.kickoff);

  const selectedBroadcaster = selectedMatch
    ? getBroadcaster(selectedMatch)
    : null;

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,#eaf3ff_0%,#f5f8fc_34%,#f8fafc_70%)] text-slate-900"
      style={{
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <style jsx>{`
        * { box-sizing: border-box; }
        button { -webkit-tap-highlight-color: transparent; }

        :global(html) { scroll-behavior: smooth; }
        :global(body) {
          margin: 0;
          background: #f7f9fc;
          color: #10233f;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .app-shell { position: relative; min-height: 100vh; }
        .app-shell::before {
          content: "";
          position: fixed;
          inset: 64px 0 auto 0;
          height: 420px;
          pointer-events: none;
          z-index: -1;
          background:
            radial-gradient(circle at 8% 10%, rgba(37,99,235,.07), transparent 28%),
            radial-gradient(circle at 92% 5%, rgba(16,185,129,.055), transparent 25%);
        }

        .page-title { letter-spacing: -.045em; }
        .nav-shadow { box-shadow: 0 1px 0 rgba(15,39,71,.07), 0 12px 35px rgba(15,39,71,.07); }
        .card-shadow { box-shadow: 0 12px 34px rgba(15,39,71,.065), 0 2px 8px rgba(15,39,71,.025); }

        .modern-card,
        .section-panel {
          border: 1px solid #e7edf5 !important;
          background: rgba(255,255,255,.98) !important;
          border-radius: 24px !important;
          box-shadow: 0 14px 45px rgba(15,39,71,.055) !important;
        }

        header.sticky {
          background: rgba(7,27,50,.97) !important;
          border-bottom: 1px solid rgba(255,255,255,.10) !important;
          box-shadow: 0 10px 32px rgba(5,20,38,.18) !important;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        header.sticky h1,
        header.sticky .text-\[\#0f2747\] { color: #fff !important; }
        header.sticky .bg-slate-100 { background: rgba(255,255,255,.09) !important; color: #fff !important; }
        header.sticky .border-slate-200 { border-color: rgba(255,255,255,.13) !important; }

        .hero-modern {
          min-height: 290px;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.10) !important;
          background:
            radial-gradient(circle at 85% 15%, rgba(59,130,246,.34), transparent 25%),
            radial-gradient(circle at 12% 95%, rgba(16,185,129,.15), transparent 30%),
            linear-gradient(135deg,#071b33 0%,#0b2b50 52%,#0e477e 100%) !important;
          box-shadow: 0 30px 85px rgba(7,29,55,.25) !important;
        }
        .hero-modern::after {
          content: "⚽";
          position: absolute;
          right: 4%;
          bottom: -52px;
          font-size: 215px;
          line-height: 1;
          opacity: .035;
          transform: rotate(-12deg);
          pointer-events: none;
        }
        .hero-modern .page-title { text-shadow: 0 5px 24px rgba(0,0,0,.20); }
        .hero-modern button { min-height: 50px; border-radius: 16px !important; }

        .stat-card {
          position: relative;
          min-height: 136px;
          overflow: hidden;
          border: 1px solid #e8eef5 !important;
          border-radius: 22px !important;
          background: #fff !important;
          box-shadow: 0 12px 32px rgba(15,39,71,.055) !important;
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }
        .stat-card::before {
          content: "";
          position: absolute;
          left: 0; right: 0; top: 0;
          height: 4px;
          background: linear-gradient(90deg,#0b2748,#2563eb,#10b981);
        }
        .stat-card::after {
          content: "";
          position: absolute;
          right: -35px; bottom: -40px;
          width: 110px; height: 110px;
          border-radius: 999px;
          background: rgba(37,99,235,.045);
        }
        .stat-card:hover { transform: translateY(-5px); box-shadow: 0 22px 48px rgba(15,39,71,.10) !important; }

        .date-strip {
          border: 1px solid #e5ebf3 !important;
          background: rgba(255,255,255,.96) !important;
          border-radius: 22px !important;
          box-shadow: 0 12px 35px rgba(15,39,71,.05) !important;
          backdrop-filter: blur(16px);
        }
        .date-chip {
          min-height: 68px;
          border-radius: 17px !important;
          border-color: #e5ebf3 !important;
          background: #f8fafc !important;
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background-color .16s ease;
        }
        .date-chip:hover { transform: translateY(-2px); border-color: #93c5fd !important; background: #eff6ff !important; }
        .date-chip[class*="bg-blue-600"] {
          background: linear-gradient(135deg,#0b2748,#2563eb) !important;
          border-color: #2563eb !important;
          color: #fff !important;
          box-shadow: 0 10px 26px rgba(37,99,235,.22) !important;
        }

        .match-card {
          position: relative;
          overflow: hidden;
          border: 1px solid #e7edf5 !important;
          border-radius: 24px !important;
          background: #fff !important;
          box-shadow: 0 13px 38px rgba(15,39,71,.06) !important;
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }
        .match-card::before {
          content: "";
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 4px;
          background: linear-gradient(180deg,#2563eb,#0b2748);
          border-radius: 24px 0 0 24px;
        }
        .match-card:hover { transform: translateY(-5px); border-color: #cbdcf3 !important; box-shadow: 0 24px 60px rgba(15,39,71,.11) !important; }
        .match-card img { filter: drop-shadow(0 7px 11px rgba(15,39,71,.10)); transition: transform .2s ease; }
        .match-card:hover img { transform: scale(1.045); }

        .list-row { cursor: pointer; transition: background-color .16s ease, transform .16s ease; }
        .list-row:hover { background: #f8fbff !important; }
        .match-clickable { cursor: pointer; }
        .match-clickable:hover { border-color: #bfdbfe !important; }

        /* Yeşil vurgu: canlı durum, olumlu puan ve başarı alanları */
        .text-emerald-600, .text-green-600 { color: #059669 !important; }
        .bg-emerald-50, .bg-green-50 { background: #ecfdf5 !important; }
        .border-emerald-200, .border-green-200 { border-color: #a7f3d0 !important; }

        button {
          transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease, border-color .18s ease;
        }
        button:not(:disabled):active { transform: scale(.985); }
        button:disabled { cursor: not-allowed; }

        input, select { border-radius: 14px !important; }
        input:focus, select:focus {
          outline: none !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 4px rgba(59,130,246,.10) !important;
        }
        .score-input { appearance: none; -moz-appearance: textfield; }
        .score-input::-webkit-inner-spin-button,
        .score-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

        .mobile-bottom-nav {
          padding-bottom: env(safe-area-inset-bottom);
          border-top: 1px solid rgba(255,255,255,.08) !important;
          background: rgba(7,27,50,.98) !important;
          box-shadow: 0 -14px 42px rgba(5,20,38,.18) !important;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        .mobile-bottom-nav button { color: #94a3b8 !important; border-radius: 15px !important; }
        .mobile-bottom-nav button:hover { background: rgba(255,255,255,.07) !important; color: #fff !important; }

        /* Drawer */
        aside.fixed {
          border-right: 1px solid #e7edf5;
          box-shadow: 24px 0 70px rgba(7,27,50,.14) !important;
        }

        /* Modal */
        .fixed.inset-0.z-50 > div,
        .fixed.inset-0.z-\[80\] > div,
        .fixed.inset-0.z-\[100\] > div {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .fixed.inset-0.z-\[100\] .rounded-\[30px\],
        .fixed.inset-0.z-\[100\] .rounded-\[32px\] {
          box-shadow: 0 40px 110px rgba(2,12,27,.32) !important;
        }

        @media (max-width: 639px) {
          .page-content-bottom { padding-bottom: 94px; }
          .hero-modern { min-height: 255px; border-radius: 23px !important; }
          .hero-modern::after { right: -25px; bottom: -25px; font-size: 135px; }
          .stat-card { min-height: 114px; padding: 15px !important; border-radius: 19px !important; }
          .stat-card p.text-3xl { font-size: 1.8rem !important; }
          .match-card { border-radius: 21px !important; }
        }
        @media (min-width: 640px) { .mobile-bottom-nav { display: none; } }
        @media (max-width: 639px) { .mobile-bottom-nav { display: flex; } }

        /* ===== PREMIUM UI V3 ===== */
        :global(body) {
          background: #f4f7fb !important;
          color: #10243f !important;
        }
        :global(::selection) { background: #0f2747; color: #fff; }
        .app-shell { background: linear-gradient(180deg,#f8fafc 0%,#f3f6fa 55%,#eef3f8 100%); }
        .app-shell::before {
          inset: 64px 0 auto 0;
          height: 520px;
          background:
            radial-gradient(circle at 12% 0%,rgba(37,99,235,.10),transparent 24%),
            radial-gradient(circle at 88% 4%,rgba(16,185,129,.09),transparent 23%),
            linear-gradient(180deg,rgba(255,255,255,.55),transparent 75%);
        }
        header.sticky {
          background: rgba(5,24,47,.94) !important;
          border-bottom: 1px solid rgba(255,255,255,.12) !important;
          box-shadow: 0 12px 40px rgba(4,22,43,.22) !important;
        }
        header.sticky > div { min-height: 72px !important; }
        header.sticky button { transition: transform .18s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease; }
        header.sticky button:hover { transform: translateY(-1px); }
        header.sticky h1 { letter-spacing: -.035em; font-size: 17px !important; }
        header.sticky .text-blue-200 { color: #9fc4ff !important; }

        .page-content-bottom { padding-top: 26px !important; }
        .hero-modern {
          min-height: 330px !important;
          border: 1px solid rgba(255,255,255,.12) !important;
          border-radius: 32px !important;
          background:
            radial-gradient(circle at 78% 15%,rgba(67,130,255,.38),transparent 24%),
            radial-gradient(circle at 18% 88%,rgba(34,197,94,.18),transparent 27%),
            linear-gradient(135deg,#06172c 0%,#0b2748 48%,#0c4371 100%) !important;
          box-shadow: 0 28px 80px rgba(6,30,57,.24),inset 0 1px 0 rgba(255,255,255,.10) !important;
        }
        .hero-modern::before {
          content:""; position:absolute; inset:auto -12% -65% auto; width:520px;height:520px;border-radius:50%;
          border:1px solid rgba(255,255,255,.07); box-shadow:0 0 0 45px rgba(255,255,255,.018),0 0 0 90px rgba(255,255,255,.012);
          pointer-events:none;
        }
        .hero-modern .page-title { font-size: clamp(32px,5vw,54px) !important; line-height:1.02 !important; letter-spacing:-.055em !important; }
        .hero-modern button { border-radius: 15px !important; box-shadow:0 12px 28px rgba(0,0,0,.15); }
        .hero-modern button:first-of-type { background:#fff !important;color:#09213e !important; }
        .hero-modern button:first-of-type:hover { background:#eaf1f8 !important; }

        .modern-card,.section-panel {
          border:1px solid #e3eaf2 !important;
          background:rgba(255,255,255,.96) !important;
          border-radius:26px !important;
          box-shadow:0 18px 55px rgba(15,39,71,.065),0 2px 8px rgba(15,39,71,.025) !important;
        }
        .modern-card:hover,.section-panel:hover { border-color:#d6e1ed !important; }

        .stat-card {
          min-height:148px !important;
          border:1px solid #e1e9f2 !important;
          border-radius:24px !important;
          background:linear-gradient(145deg,#fff 0%,#f8fbfe 100%) !important;
          box-shadow:0 15px 38px rgba(15,39,71,.065) !important;
          transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease !important;
        }
        .stat-card:hover { transform:translateY(-4px);box-shadow:0 22px 45px rgba(15,39,71,.10) !important;border-color:#cbd9e8 !important; }
        .stat-card::after { content:"";position:absolute;right:-38px;bottom:-48px;width:130px;height:130px;border-radius:50%;background:rgba(15,39,71,.035); }

        .date-strip {
          border:1px solid #dde6ef !important;
          border-radius:24px !important;
          background:rgba(255,255,255,.90) !important;
          box-shadow:0 12px 34px rgba(15,39,71,.055) !important;
        }
        .date-strip button { transition:all .18s ease !important; }
        .date-strip button:hover { transform:translateY(-2px);background:#eef5fb !important; }

        .match-card {
          border:1px solid #e0e8f1 !important;
          border-radius:24px !important;
          background:#fff !important;
          box-shadow:0 13px 35px rgba(15,39,71,.06) !important;
          overflow:hidden;
          transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease !important;
        }
        .match-card:hover { transform:translateY(-4px);border-color:#c8d7e6 !important;box-shadow:0 22px 48px rgba(15,39,71,.105) !important; }
        .match-card button { transition:all .18s ease !important; }
        .match-card button:hover { transform:translateY(-1px); }

        .section-panel > div:first-child { border-radius:25px 25px 0 0 !important; }
        .section-panel .bg-gradient-to-r { background:linear-gradient(110deg,#071b33,#0d3158 58%,#0d5a57) !important; }
        .section-panel .bg-gradient-to-r p { color:#b8d0e8 !important; }

        input,select,textarea {
          border-radius:14px !important;
          border-color:#dce5ee !important;
          background:#fff !important;
          color:#10243f !important;
          transition:border-color .18s ease,box-shadow .18s ease !important;
        }
        input:focus,select:focus,textarea:focus {
          outline:none !important;border-color:#1d6fd6 !important;box-shadow:0 0 0 4px rgba(29,111,214,.10) !important;
        }
        button { font-family:inherit; }

        .mobile-bottom-nav {
          background:rgba(255,255,255,.96) !important;
          border-top:1px solid #dfe7ef !important;
          box-shadow:0 -12px 35px rgba(15,39,71,.12) !important;
          backdrop-filter:blur(18px);
          -webkit-backdrop-filter:blur(18px);
        }
        .mobile-bottom-nav button { transition:all .18s ease !important; }
        .mobile-bottom-nav button:hover { transform:translateY(-2px); }

        .fixed.inset-0.z-\[100\] { background:rgba(3,15,29,.78) !important; }
        .fixed.inset-0.z-\[80\] { background:rgba(3,15,29,.68) !important; }
        .fixed.inset-0.z-\[100\] > div,.fixed.inset-0.z-\[80\] > div {
          border:1px solid rgba(255,255,255,.10) !important;
          box-shadow:0 35px 90px rgba(0,0,0,.34) !important;
        }

        @media (max-width: 767px) {
          .page-content-bottom { padding:16px 10px 92px !important; }
          .hero-modern { min-height:360px !important;border-radius:24px !important; }
          .hero-modern .page-title { font-size:34px !important; }
          .modern-card,.section-panel { border-radius:21px !important; }
          .stat-card { min-height:124px !important;border-radius:19px !important; }
          .date-strip { border-radius:19px !important; }
          .match-card { border-radius:20px !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          *,*::before,*::after { scroll-behavior:auto !important; transition:none !important; animation:none !important; }
        }

        /* SPORTS APP UI V4 — STRUCTURAL VISUAL REDESIGN */
        .app-shell {
          background:
            radial-gradient(circle at 10% 0%, rgba(29,78,216,.07), transparent 28%),
            radial-gradient(circle at 90% 15%, rgba(16,185,129,.055), transparent 24%),
            #f4f7fb !important;
        }
        .app-shell::before { display:none !important; }
        .nav-shadow { box-shadow:0 1px 0 rgba(15,39,71,.06),0 12px 34px rgba(15,39,71,.06) !important; }
        header.sticky { background:rgba(255,255,255,.92) !important; border-color:#e5ebf2 !important; }
        header.sticky .page-title { letter-spacing:-.04em !important; }
        header.sticky button { transition:transform .18s ease,box-shadow .18s ease,background .18s ease !important; }
        header.sticky button:hover { transform:translateY(-2px); box-shadow:0 10px 24px rgba(15,39,71,.10); }
        .hero-modern {
          min-height:330px !important;
          border-radius:32px !important;
          background:radial-gradient(circle at 85% 20%,rgba(59,130,246,.42),transparent 25%),radial-gradient(circle at 15% 100%,rgba(16,185,129,.20),transparent 30%),linear-gradient(135deg,#061a31 0%,#0b3157 58%,#0d4770 100%) !important;
          box-shadow:0 28px 70px rgba(7,26,49,.20) !important;
        }
        .hero-modern::after { content:"⚽" !important; position:absolute !important; right:3% !important; bottom:-12% !important; font-size:clamp(150px,22vw,280px) !important; line-height:1 !important; opacity:.055 !important; filter:grayscale(1) !important; transform:rotate(-12deg) !important; }
        .hero-modern .page-title { font-size:clamp(36px,5vw,62px) !important; font-weight:950 !important; letter-spacing:-.065em !important; }
        .hero-modern button { min-height:52px !important; border-radius:16px !important; }
        .stat-card { position:relative !important; min-height:145px !important; overflow:hidden !important; border:1px solid #e4ebf3 !important; border-radius:24px !important; background:rgba(255,255,255,.94) !important; box-shadow:0 12px 35px rgba(15,39,71,.065) !important; transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease !important; }
        .stat-card::before { content:"" !important; position:absolute !important; left:0 !important; top:0 !important; width:100% !important; height:4px !important; background:linear-gradient(90deg,#0f2747,#2563eb,#10b981) !important; }
        .stat-card::after { content:"" !important; position:absolute !important; width:110px !important; height:110px !important; right:-45px !important; bottom:-45px !important; border-radius:50% !important; background:rgba(37,99,235,.06) !important; }
        .stat-card:hover { transform:translateY(-6px) !important; box-shadow:0 22px 48px rgba(15,39,71,.12) !important; border-color:#cddbea !important; }
        .modern-card,.section-panel { border-color:#e3eaf2 !important; border-radius:24px !important; box-shadow:0 12px 34px rgba(15,39,71,.055) !important; }
        .date-strip { border-radius:24px !important; box-shadow:0 10px 30px rgba(15,39,71,.05) !important; }
        .date-chip { border-radius:16px !important; min-height:64px !important; }
        .match-card { position:relative !important; border:1px solid #e1e8f0 !important; border-radius:26px !important; background:#fff !important; box-shadow:0 12px 34px rgba(15,39,71,.06) !important; transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease !important; }
        .match-card::before { content:"" !important; position:absolute !important; inset:0 0 auto 0 !important; height:3px !important; background:linear-gradient(90deg,#0f2747,#2563eb,#10b981) !important; z-index:1 !important; }
        .match-card:hover { transform:translateY(-7px) !important; box-shadow:0 26px 58px rgba(15,39,71,.13) !important; border-color:#c7d6e6 !important; }
        .match-card img { filter:drop-shadow(0 8px 14px rgba(15,39,71,.12)); }
        .match-card button { border-radius:14px !important; font-weight:900 !important; transition:all .18s ease !important; }
        .match-card button:hover { transform:translateY(-2px) !important; }
        .mobile-bottom-nav { border-top:1px solid rgba(226,232,240,.9) !important; background:rgba(255,255,255,.94) !important; box-shadow:0 -14px 38px rgba(15,39,71,.10) !important; }
        .mobile-bottom-nav button { border-radius:16px !important; }
        .match-detail-overlay { animation:detailFade .18s ease-out both; }
        .match-detail-page { animation:detailUp .24s ease-out both; }
        .match-detail-page .sticky.top-0 { box-shadow:0 8px 28px rgba(0,0,0,.16); }
        .match-detail-page section { box-shadow:0 12px 34px rgba(15,39,71,.07); }
        @keyframes detailFade { from{opacity:0} to{opacity:1} }
        @keyframes detailUp { from{transform:translateY(18px);opacity:.85} to{transform:none;opacity:1} }
        @media (max-width:639px) {
          .hero-modern { min-height:310px !important; border-radius:25px !important; }
          .hero-modern .page-title { font-size:36px !important; }
          .stat-card { min-height:122px !important; border-radius:20px !important; }
          .match-card { border-radius:21px !important; }
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
                Skor Durağı
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
      <header
        className="sticky top-0 z-[100] w-full border-b border-slate-200 bg-white shadow-sm"
        style={{ display: "block", visibility: "visible", opacity: 1 }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">

          <div className="flex min-w-0 items-center gap-3">

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menüyü aç"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f2747] text-xl font-bold text-white shadow-sm"
            >
              ☰
            </button>

            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f2747] text-xl">
                ⚽
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-base font-extrabold tracking-tight text-[#0f2747] sm:text-xl">
                  SKOR DURAĞI
                </h1>

                <p className="truncate text-[9px] font-bold uppercase tracking-[0.18em] text-blue-600">
                  Tahmin Platformu
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

          </div>
        </div>
      </header>

      <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pt-2 shadow-[0_-10px_35px_rgba(15,39,71,.08)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-md items-center justify-around">
          <button type="button" onClick={() => goTo("/")} className="flex min-w-[68px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-extrabold text-[#0f2747]">
            <span className="text-lg leading-none">🏠</span><span>Ana Sayfa</span>
          </button>
          <button type="button" onClick={() => goTo("/tahmin")} className="flex min-w-[68px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-extrabold text-blue-600">
            <span className="text-lg leading-none">🎯</span><span>Tahmin</span>
          </button>
          <button type="button" onClick={() => goTo("/siralama")} className="flex min-w-[68px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-extrabold text-slate-500">
            <span className="text-lg leading-none">🏆</span><span>Sıralama</span>
          </button>
          <button type="button" onClick={() => goTo("/profil")} className="flex min-w-[68px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-extrabold text-slate-500">
            <span className="text-lg leading-none">👤</span><span>Profil</span>
          </button>
        </div>
      </nav>

      <div className="app-shell page-content-bottom mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-7 lg:px-8">
        <section className="hero-shadow hero-modern relative overflow-hidden rounded-[28px] bg-[#0a2342] sm:rounded-[34px]">
          <div className="relative px-5 py-8 sm:px-9 sm:py-11 lg:px-12 lg:py-12">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />

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

              <p className="mt-2 max-w-2xl text-2xl font-black tracking-tight text-white sm:text-4xl">
                Maçını seç, tahminini yap.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Maçları takip et, doğru skorları yakala ve puan
                tablosunda yüksel.
              </p>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => (window.location.href = "/tahmin")}
                  className="rounded-2xl bg-white px-5 py-3.5 text-sm font-extrabold text-[#0f2747] shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  🎯 Tahmin Yap
                </button>

                <button
                  type="button"
                  onClick={() => (window.location.href = "/siralama")}
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3.5 text-sm font-extrabold text-white backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white/15"
                >
                  🏆 Sıralamayı Gör
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-4">
          <div className="modern-card stat-card rounded-[22px] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Toplam Puan
              </p>
              <span className="text-lg">⚡</span>
            </div>

            <p className="mt-3 text-3xl font-black tracking-tight text-[#0f2747] sm:text-4xl">
              {totalPoints}
            </p>

            <p className="mt-1 text-[10px] font-medium text-blue-600">
              Tahmin puanı
            </p>
          </div>

          <div className="modern-card stat-card rounded-[22px] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tahmin
              </p>
              <span className="text-lg">🎯</span>
            </div>

            <p className="mt-3 text-3xl font-black tracking-tight text-[#0f2747] sm:text-4xl">
              {predictions.length}
            </p>

            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Yapılan tahmin
            </p>
          </div>

          <div className="modern-card stat-card rounded-[22px] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tam İsabet
              </p>
              <span className="text-lg">🎯</span>
            </div>

            <p className="mt-3 text-3xl font-black tracking-tight text-[#0f2747] sm:text-4xl">
              {exactScores}
            </p>

            <p className="mt-1 text-[10px] font-medium text-slate-400">
              20 puanlık skor
            </p>
          </div>

          <div className="modern-card stat-card rounded-[22px] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Bonus
              </p>
              <span className="text-lg">🔥</span>
            </div>

            <p className="mt-3 text-3xl font-black tracking-tight text-[#0f2747] sm:text-4xl">
              {bonusPoints + bonusCodePoints + wheelPoints}
            </p>

            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Bonus ve ödül puanı
            </p>
          </div>
        </section>

        {/* ====================================================== */}
        {/* ====================================================== */}
        {/* ====================================================== */}
        {/* BONUS SORULARI */}
        {/* ====================================================== */}
        <section className="mt-5">
          <div className="section-panel overflow-hidden rounded-[24px] border border-amber-100 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-[#0f2747] to-blue-700 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">🎯</div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Ekstra Puan</p>
                  <h2 className="mt-1 text-lg font-extrabold text-white sm:text-xl">Bonus Soruları</h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-5 text-blue-100/80">Bonus sorularını cevapla ve doğru bildiğinde ekstra puan kazan.</p>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              {bonusQuestions.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center"><p className="text-sm font-semibold text-slate-500">Şu anda aktif bonus sorusu bulunmuyor.</p></div>
              ) : (
                bonusQuestions.map((question) => {
                  const answered = bonusAnswers.find((item) => item.question_id === question.id);
                  const selected = bonusSelected[question.id] || answered?.answer || "";
                  const resultPoints = answered?.points ?? null;
                  return (
                    <article key={question.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="text-[9px] font-bold uppercase tracking-widest text-amber-600">Bonus • {question.points} Puan</p><h3 className="mt-1 text-base font-extrabold leading-6 text-[#0f2747]">{question.question}</h3></div>
                        {answered && <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold text-emerald-700">Cevaplandı</span>}
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {(question.options || []).map((option, index) => {
                          const isSelected = selected === option;
                          return (
                            <button key={`${question.id}-${index}`} type="button" disabled={Boolean(answered) || bonusLoading} onClick={() => submitBonusAnswer(question, option)} className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${isSelected ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/10" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/50"} ${answered ? "cursor-default" : ""}`}>
                              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-extrabold text-slate-500">{String.fromCharCode(65 + index)}</span>{option}
                            </button>
                          );
                        })}
                      </div>
                      {answered && <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-bold ${resultPoints && resultPoints > 0 ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-white text-slate-500"}`}>{resultPoints && resultPoints > 0 ? `✓ Doğru cevap! +${resultPoints} puan` : "✓ Cevabın kaydedildi."}</div>}
                    </article>
                  );
                })
              )}
              {bonusMessage && <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">{bonusMessage}</div>}
            </div>
          </div>
        </section>

        {/* ANKETLER */}
        {/* ====================================================== */}
        <section className="mt-5">
          <div className="section-panel overflow-hidden rounded-[24px] border border-purple-100 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-[#0f2747] to-blue-700 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">📊</div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Ekstra Puan</p>
                  <h2 className="mt-1 text-lg font-extrabold text-white sm:text-xl">Anketler</h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-5 text-blue-100/80">Soruyu cevapla, doğru bilirsen belirtilen puanı kazan.</p>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              {surveys.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <p className="text-sm font-semibold text-slate-500">Şu anda aktif anket bulunmuyor.</p>
                </div>
              ) : (
                surveys.map((survey) => {
                  const answered = pollAnswers.find((item) => item.question_id === survey.id);
                  const selected = surveySelected[survey.id] || answered?.answer || "";
                  const resultPoints = answered?.points ?? null;

                  return (
                    <article key={survey.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-purple-600">Anket • {survey.points} Puan</p>
                          <h3 className="mt-1 text-base font-extrabold leading-6 text-[#0f2747]">{survey.question}</h3>
                        </div>
                        {answered && <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold text-emerald-700">Cevaplandı</span>}
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {(survey.options || []).map((option, index) => {
                          const isSelected = selected === option;
                          return (
                            <button
                              key={`${survey.id}-${index}`}
                              type="button"
                              disabled={Boolean(answered) || surveyLoading}
                              onClick={() => submitSurvey(survey, option)}
                              className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/10"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/50"
                              } ${answered ? "cursor-default" : ""}`}
                            >
                              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-extrabold text-slate-500">{String.fromCharCode(65 + index)}</span>
                              {option}
                            </button>
                          );
                        })}
                      </div>

                      {answered && (
                        <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-bold ${resultPoints && resultPoints > 0 ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-white text-slate-500"}`}>
                          {resultPoints && resultPoints > 0 ? `✓ Doğru cevap! +${resultPoints} puan` : "✓ Cevabın kaydedildi."}
                        </div>
                      )}
                    </article>
                  );
                })
              )}

              {surveyMessage && <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">{surveyMessage}</div>}
            </div>
          </div>
        </section>

        {/* BONUS KODU KULLAN */}
        {/* ====================================================== */}

        <section className="mt-5">
          <div className="section-panel overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-[#0f2747] to-blue-700 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">
                  🎁
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
                    Ekstra Puan
                  </p>

                  <h2 className="mt-1 text-lg font-extrabold text-white sm:text-xl">
                    Bonus Kodu Kullan
                  </h2>
                </div>
              </div>

              <p className="mt-3 text-sm leading-5 text-blue-100/80">
                Sana verilen bonus kodunu aşağıya girerek ekstra puan
                kazanabilirsin.
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={bonusCode}
                  onChange={(event) => {
                    setBonusCode(event.target.value);
                    setBonusCodeMessage("");
                    setBonusCodeSuccess(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      useBonusCode();
                    }
                  }}
                  placeholder="Örn. Futbol100"
                  disabled={bonusCodeLoading}
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-[#0f2747] outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={useBonusCode}
                  disabled={bonusCodeLoading || !bonusCode.trim()}
                  className="rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[140px]"
                >
                  {bonusCodeLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Kullanılıyor
                    </span>
                  ) : (
                    "Kodu Kullan"
                  )}
                </button>
              </div>

              {bonusCodeMessage && (
                <div
                  className={`mt-4 rounded-xl px-4 py-3 ${
                    bonusCodeSuccess
                      ? "border border-emerald-100 bg-emerald-50"
                      : "border border-red-100 bg-red-50"
                  }`}
                >
                  <p
                    className={`text-xs font-bold ${
                      bonusCodeSuccess
                        ? "text-emerald-700"
                        : "text-red-600"
                    }`}
                  >
                    {bonusCodeSuccess ? "✓ " : "⚠ "}
                    {bonusCodeMessage}
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Bonus Kodundan Kazanılan
                  </p>

                  <p className="mt-1 text-lg font-extrabold text-[#0f2747]">
                    +{bonusCodePoints} puan
                  </p>
                </div>

                <span className="text-2xl">⚡</span>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* ÖDÜL ÇARKI */}
        {/* ====================================================== */}
        <section className="mt-5">
          <div className="section-panel overflow-hidden rounded-[24px] border border-pink-100 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-[#0f2747] via-indigo-700 to-fuchsia-600 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">🎡</div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-pink-200">Şansını Dene</p>
                  <h2 className="mt-1 text-lg font-extrabold text-white sm:text-xl">Ödül Çarkı</h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-5 text-blue-100/80">Çarkı çevir, 5–30 puan arasında ödül kazan veya boş dilime denk gel.</p>
            </div>

            <div className="p-5 sm:p-7">
              {wheelOptions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="text-4xl">🎡</div>
                  <p className="mt-3 text-sm font-extrabold text-slate-600">Çark henüz hazırlanmadı.</p>
                  <p className="mt-1 text-xs text-slate-400">Admin panelinden çark dilimleri ayarlanabilir.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="relative h-[290px] w-[290px] sm:h-[330px] sm:w-[330px]">
                    <div className="absolute left-1/2 top-[-8px] z-20 -translate-x-1/2 text-3xl drop-shadow-md">▼</div>

                    <div
                      className="absolute inset-2 rounded-full border-[10px] border-white shadow-2xl transition-transform duration-[4200ms] ease-[cubic-bezier(0.12,0.72,0.12,1)]"
                      style={{
                        transform: `rotate(${wheelRotation}deg)`,
                        background: "conic-gradient(#06b6d4 0deg 36deg, #8b5cf6 36deg 72deg, #ec4899 72deg 108deg, #f59e0b 108deg 144deg, #10b981 144deg 180deg, #3b82f6 180deg 216deg, #a855f7 216deg 252deg, #14b8a6 252deg 288deg, #64748b 288deg 324deg, #334155 324deg 360deg)",
                      }}
                    >
                      {Array.from({ length: 10 }, (_, index) => {
                        const option = wheelOptions.find((item) => item.slot === index + 1);
                        const angle = index * 36 + 18;
                        const radius = 38;
                        const x = 50 + Math.sin((angle * Math.PI) / 180) * radius;
                        const y = 50 - Math.cos((angle * Math.PI) / 180) * radius;

                        return (
                          <span
                            key={index + 1}
                            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center text-[10px] font-black text-white drop-shadow-md sm:text-xs"
                            style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) rotate(${-wheelRotation}deg)` }}
                          >
                            {option?.points == null ? "BOŞ" : `+${option.points}`}
                          </span>
                        );
                      })}

                      <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#0f2747] shadow-xl sm:h-24 sm:w-24">
                        <span className="text-2xl">⚡</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={spinRewardWheel}
                    disabled={wheelSpinning}
                    className="mt-5 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {wheelSpinning ? "🎡 Çark Dönüyor..." : "🎡 ÇARKI ÇEVİR"}
                  </button>

                  {wheelMessage && (
                    <div className={`mt-4 w-full max-w-md rounded-2xl px-4 py-3 text-center text-sm font-extrabold ${wheelResult && wheelResult > 0 ? "border border-emerald-100 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-slate-50 text-slate-600"}`}>
                      {wheelMessage}
                    </div>
                  )}

                  <div className="mt-4 grid w-full max-w-md grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Çark Kazancı</p>
                      <p className="mt-1 text-lg font-black text-[#0f2747]">+{wheelPoints}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Ödül Aralığı</p>
                      <p className="mt-1 text-lg font-black text-pink-600">5–30</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* OYUNCULAR */}
        {/* ====================================================== */}
        <section className="mt-8 sm:mt-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-600">Oyuncu Merkezi</p>
              <h2 className="page-title mt-1 text-2xl font-extrabold text-[#0f2747] sm:text-3xl">Oyuncular</h2>
              <p className="mt-1 text-sm text-slate-500">Oyuncunun üstüne dokun veya incele butonuna basarak istatistiklerini gör.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {players.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:col-span-2 lg:col-span-3">
                <div className="text-4xl">👤</div>
                <p className="mt-3 text-sm font-bold text-slate-500">Henüz oyuncu eklenmedi.</p>
              </div>
            ) : (
              players.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setSelectedPlayer(player)}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                >
                  <div className="flex items-center gap-4 p-4 sm:p-5">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                      {player.photo_url ? (
                        <img src={player.photo_url} alt={player.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl">👤</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-extrabold text-[#0f2747]">{player.name}</h3>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {player.team ? `${player.team} • ` : ""}
                        {player.jersey_number != null ? `#${player.jersey_number}` : "Forma yok"}
                        {player.position ? ` • ${player.position}` : ""}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-extrabold text-emerald-700">⚽ {player.goals} Gol</span>
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-extrabold text-blue-700">🎯 {player.assists} Asist</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-center text-xs font-extrabold text-blue-600 transition group-hover:bg-blue-50">
                    Oyuncuyu İncele →
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* ====================================================== */}
        {/* MAÇ MERKEZİ */}
        {/* ====================================================== */}

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

          <div className="date-strip mt-5 rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Maç günü
                </p>
                <p className="mt-0.5 text-xs font-bold text-[#0f2747]">
                  Gün seç, o günün maçlarını göster
                </p>
              </div>
              {selectedDate !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedDate("all")}
                  className="rounded-full bg-blue-50 px-3 py-1.5 text-[9px] font-extrabold text-blue-700 transition hover:bg-blue-100"
                >
                  Tüm tarihler
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setSelectedDate("all")}
                className={`date-chip min-w-[82px] shrink-0 rounded-2xl border px-3 py-2.5 text-center transition ${
                  selectedDate === "all"
                    ? "border-[#0f2747] bg-[#0f2747] text-white shadow-md"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-200 hover:bg-blue-50"
                }`}
              >
                <span className="block text-[9px] font-extrabold uppercase tracking-wide opacity-70">
                  Tüm maçlar
                </span>
                <span className="mt-1 block text-xs font-black">
                  {matches.length} maç
                </span>
              </button>

              {dateOptions.map((dateKey) => {
                const chip = formatDateChip(dateKey);
                const count = matches.filter(
                  (match) => getMatchDateKey(match) === dateKey
                ).length;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelectedDate(dateKey)}
                    className={`min-w-[82px] shrink-0 rounded-xl border px-3 py-2.5 text-center transition ${
                      selectedDate === dateKey
                        ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    <span className="block text-[10px] font-black">
                      {chip.day}
                    </span>
                    <span className="mt-0.5 block text-[9px] font-extrabold capitalize opacity-70">
                      {chip.weekday}
                    </span>
                    <span className="mt-1 block text-[8px] font-bold opacity-60">
                      {count} maç
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
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

                const isLive = match.status === "live";
                const isHalftime = match.status === "halftime";

                const canPredict =
                  !isFinished &&
                  !isCancelled &&
                  !isLive &&
                  !isHalftime &&
                  match.schedule_confirmed &&
                  Boolean(match.kickoff);

                return (
                  <article
                    key={match.id}
                    onClick={() => openMatchDetails(match)}
                    className="modern-card match-card match-clickable overflow-hidden rounded-[26px]"
                  >
                    <div className="border-b border-slate-100/80 bg-white/70 px-4 py-4 sm:px-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                              {match.league || "Futbol"}
                            </span>

                            {isLive && (
                              <span className="flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-[10px] font-extrabold text-red-600">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                                CANLI OYNANIYOR
                              </span>
                            )}

                            {isHalftime && (
                              <span className="rounded-md bg-orange-50 px-2.5 py-1 text-[10px] font-extrabold text-orange-700">
                                ⏸ DEVRE ARASI
                              </span>
                            )}

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
                                {match.schedule_confirmed && match.kickoff
                                  ? "Program Onaylı"
                                  : ""}
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
                            Tarih
                          </p>

                          <p className="mt-1 text-sm font-bold text-[#0f2747]">
                            {formatOnlyDate(match.kickoff, match.match_date)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-6 sm:px-7 sm:py-8">
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
                          {isFinished || isLive || isHalftime ? (
                            <>
                              <div className={`rounded-2xl px-4 py-3 shadow-lg sm:px-6 ${isLive || isHalftime ? "bg-gradient-to-br from-red-600 to-red-500" : "bg-gradient-to-br from-[#0f2747] to-[#164d86]"}`}>
                                <p className="text-xl font-extrabold text-white sm:text-2xl">
                                  {getLiveScoreText(match)}
                                </p>
                                {(isLive || isHalftime) && (
                                  <p className="mt-1 text-center text-sm font-black text-white">
                                    {getLiveMinuteText(match)}
                                  </p>
                                )}
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

                      {(getMatchEvents(match.id).length > 0 || isLive || isHalftime || isFinished) && (
                        <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-extrabold uppercase tracking-wider text-[#0f2747]">
                              Maç Olayları
                            </p>
                            {(isLive || isHalftime) && (
                              <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-extrabold text-red-600">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                                CANLI
                              </span>
                            )}
                          </div>

                          {getMatchEvents(match.id).length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                              {([
                                { side: "home", label: match.home_team, align: "left" },
                                { side: "away", label: match.away_team, align: "right" },
                              ] as const).map((teamSide) => {
                                const teamEvents = getMatchEvents(match.id).filter(
                                  (event) => event.team === teamSide.side
                                );

                                return (
                                  <div
                                    key={teamSide.side}
                                    className={`min-h-[64px] rounded-2xl border p-2.5 sm:p-3 ${
                                      teamSide.side === "home"
                                        ? "border-blue-100 bg-blue-50/50"
                                        : "border-slate-200 bg-slate-50/70"
                                    }`}
                                  >
                                    {teamEvents.length > 0 ? (
                                      <div className="space-y-2">
                                        {teamEvents.map((event) => (
                                          <div
                                            key={event.id}
                                            className={`flex items-center gap-2 rounded-xl border border-white/80 bg-white px-2.5 py-2 shadow-sm ${
                                              teamSide.align === "right"
                                                ? "justify-end text-right"
                                                : "justify-start text-left"
                                            }`}
                                          >
                                            <span className="shrink-0 text-base">
                                              {event.event_type === "goal"
                                                ? "⚽"
                                                : event.event_type === "yellow_card"
                                                  ? "🟨"
                                                  : event.event_type === "red_card"
                                                    ? "🟥"
                                                    : "🔄"}
                                            </span>
                                            <div className="min-w-0">
                                              <p className="truncate text-[10px] font-extrabold text-[#0f2747] sm:text-xs">
                                                {event.event_type === "substitution"
                                                  ? `${event.player_out || "Oyuncu"} → ${event.player_in || "Oyuncu"}`
                                                  : event.player_name || "Oyuncu"}
                                              </p>
                                              <p className="mt-0.5 text-[9px] font-black text-blue-600">
                                                {getEventMinuteText(event)}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="rounded-xl bg-slate-50 px-3 py-3 text-center text-xs font-bold text-slate-400">
                              Henüz maç olayı eklenmedi.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-blue-100/70 bg-gradient-to-r from-blue-50/70 to-slate-50 px-4 py-3.5">
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

                      const isLive = match.status === "live";
                      const isHalftime = match.status === "halftime";

                      const canPredict =
                        !isFinished &&
                        !isCancelled &&
                        !isLive &&
                        !isHalftime &&
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
                              {isFinished || isLive || isHalftime ? (
                                <div className={`rounded-lg px-3 py-2 ${isLive || isHalftime ? "bg-red-600" : "bg-[#0f2747]"}`}>
                                  <p className="text-sm font-extrabold text-white">
                                    {getLiveScoreText(match)}
                                  </p>
                                  {(isLive || isHalftime) && (
                                    <p className="mt-0.5 text-center text-[10px] font-black text-white">
                                      {getLiveMinuteText(match)}
                                    </p>
                                  )}
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

                              {isLive && (
                                <span className="mt-2 flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[8px] font-extrabold text-red-600">
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                                  CANLI
                                </span>
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
                                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-[10px] font-extrabold text-white shadow-md shadow-blue-600/20 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700"
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
                                  {isFinished || isLive || isHalftime ? (
                                    <span className={`rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-white ${isLive || isHalftime ? "bg-red-600" : "bg-[#0f2747]"}`}>
                                      {getLiveScoreText(match)}
                                      {(isLive || isHalftime) && (
                                        <span className="ml-1 text-[9px] font-black">
                                          {getLiveMinuteText(match)}
                                        </span>
                                      )}
                                    </span>
                                  ) : isCancelled ? (
                                    <span className="rounded-lg bg-red-50 px-2 py-1.5 text-[8px] font-bold text-red-600">
                                      İPTAL
                                    </span>
                                  ) : (
                                    <span className="rounded-xl bg-slate-100 px-2.5 py-1.5 text-[9px] font-extrabold text-slate-500">
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
                                {isLive ? (
                                  <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 text-[9px] font-extrabold text-red-600">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                                    CANLI OYNANIYOR
                                  </span>
                                ) : isFinished && prediction ? (
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
                                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-[10px] font-extrabold text-white shadow-md shadow-blue-600/20 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700"
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

                              {!isCancelled &&
                                !canPredict &&
                                !isFinished && (
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
            ⚽ Skor Durağı • Kendi tahminini yap
          </p>
        </footer>
      </div>

      {selectedPlayer && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#071a2f]/70 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <button type="button" aria-label="Kapat" onClick={() => setSelectedPlayer(null)} className="absolute inset-0 h-full w-full cursor-default" />
          <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="bg-gradient-to-r from-[#0f2747] to-blue-700 px-5 py-5 text-white sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                    {selectedPlayer.photo_url ? (
                      <img src={selectedPlayer.photo_url} alt={selectedPlayer.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">👤</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Oyuncu Profili</p>
                    <h2 className="mt-1 truncate text-2xl font-extrabold">{selectedPlayer.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-blue-100">
                      {selectedPlayer.jersey_number != null ? `#${selectedPlayer.jersey_number}` : ""}
                      {selectedPlayer.position ? `${selectedPlayer.jersey_number != null ? " • " : ""}${selectedPlayer.position}` : ""}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedPlayer(null)} className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-lg font-bold text-white hover:bg-white/20">×</button>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center">
                  <p className="text-3xl">⚽</p>
                  <p className="mt-2 text-3xl font-black text-emerald-600">{selectedPlayer.goals}</p>
                  <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-emerald-700">Gol</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
                  <p className="text-3xl">🎯</p>
                  <p className="mt-2 text-3xl font-black text-blue-600">{selectedPlayer.assists}</p>
                  <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-blue-700">Asist</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-500">Mevki</span>
                  <span className="text-sm font-extrabold text-[#0f2747]">{selectedPlayer.position || "Belirtilmedi"}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                  <span className="text-sm font-bold text-slate-500">Forma</span>
                  <span className="text-sm font-extrabold text-[#0f2747]">{selectedPlayer.jersey_number != null ? `#${selectedPlayer.jersey_number}` : "Belirtilmedi"}</span>
                </div>
              </div>

              <button type="button" onClick={() => setSelectedPlayer(null)} className="mt-5 w-full rounded-xl bg-[#0f2747] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#183a63]">Kapat</button>
            </div>
          </div>
        </div>
      )}

      {selectedMatch && (
        <div
          className="match-detail-overlay fixed inset-0 z-[100] flex items-stretch justify-center bg-[#061425]"
          onClick={() => setSelectedMatch(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="match-detail-page relative h-full w-full overflow-y-auto bg-[#f5f7fb] shadow-2xl"
          >
            {/* DETAY ÜST BAR */}
            <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#071a31]/95 px-4 py-3.5 text-white backdrop-blur-xl sm:px-8 sm:py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">
                    Maç Merkezi
                  </p>
                </div>
                <p className="mt-1 truncate text-sm font-extrabold">
                  {selectedMatch.league || "Futbol"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                aria-label="Maç detayını kapat"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg font-bold text-white transition hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            <div className="mx-auto max-w-6xl p-3 sm:p-6 lg:p-8">
              {/* SKOR SAHNESİ */}
              <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071a31] via-[#0f3158] to-[#124f86] p-5 text-white shadow-xl sm:p-8">
                <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-blue-400/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />

                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-blue-100">
                    {selectedIsLive || selectedIsHalftime ? (
                      <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> CANLI</>
                    ) : selectedIsFinished ? (
                      <>✓ MAÇ SONU</>
                    ) : selectedIsCancelled ? (
                      <>✕ İPTAL</>
                    ) : (
                      <>PROGRAM</>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-white/50">{formatOnlyDate(selectedMatch.kickoff, selectedMatch.match_date)}</span>
                </div>

                <div className="relative mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
                  <div className="flex min-w-0 flex-col items-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white p-3 shadow-lg sm:h-24 sm:w-24">
                      <TeamLogo url={selectedMatch.home_logo_url} team={selectedMatch.home_team} />
                    </div>
                    <p className="mt-4 max-w-[150px] break-words text-sm font-black leading-5 sm:max-w-[230px] sm:text-lg">
                      {selectedMatch.home_team}
                    </p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">Ev sahibi</p>
                  </div>

                  <div className="flex min-w-[92px] flex-col items-center text-center sm:min-w-[125px]">
                    {selectedIsFinished || selectedIsLive || selectedIsHalftime ? (
                      <div className={`rounded-[22px] border px-5 py-3 shadow-lg sm:px-7 sm:py-4 ${selectedIsLive || selectedIsHalftime ? "border-red-400/30 bg-red-500/90" : "border-white/10 bg-white"}`}>
                        <p className={`text-3xl font-black tracking-tight sm:text-4xl ${selectedIsLive || selectedIsHalftime ? "text-white" : "text-[#0b1d35]"}`}>
                          {getLiveScoreText(selectedMatch)}
                        </p>
                        {(selectedIsLive || selectedIsHalftime) && (
                          <p className="mt-1 text-xs font-black text-white/90">{getLiveMinuteText(selectedMatch)}</p>
                        )}
                      </div>
                    ) : selectedIsCancelled ? (
                      <div className="rounded-[18px] bg-red-500 px-4 py-3 text-xs font-black">İPTAL</div>
                    ) : (
                      <div className="rounded-[18px] border border-white/15 bg-white/10 px-5 py-3 text-lg font-black">VS</div>
                    )}
                    <p className="mt-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">
                      {selectedMatch.kickoff ? formatOnlyTime(selectedMatch.kickoff) : "Saat bekleniyor"}
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-col items-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white p-3 shadow-lg sm:h-24 sm:w-24">
                      <TeamLogo url={selectedMatch.away_logo_url} team={selectedMatch.away_team} />
                    </div>
                    <p className="mt-4 max-w-[150px] break-words text-sm font-black leading-5 sm:max-w-[230px] sm:text-lg">
                      {selectedMatch.away_team}
                    </p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">Deplasman</p>
                  </div>
                </div>
              </section>

              {/* HIZLI BİLGİLER */}
              <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tarih</p>
                  <p className="mt-1.5 text-xs font-extrabold text-[#0f2747] sm:text-sm">{formatOnlyDate(selectedMatch.kickoff, selectedMatch.match_date)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Saat</p>
                  <p className="mt-1.5 text-xs font-extrabold text-blue-600 sm:text-sm">{selectedMatch.kickoff ? formatOnlyTime(selectedMatch.kickoff) : "—"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Yayın</p>
                  <p className="mt-1.5 truncate text-xs font-extrabold text-[#0f2747] sm:text-sm">{selectedBroadcaster || "Belirtilmedi"}</p>
                </div>
              </div>

              {/* DURUM */}
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:mt-4 sm:px-5">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Maç durumu</p>
                  <p className="mt-1 text-sm font-black text-[#0f2747]">
                    {selectedIsFinished ? "Maç tamamlandı" : selectedIsCancelled ? "Maç iptal edildi" : selectedIsLive ? "Karşılaşma devam ediyor" : selectedIsHalftime ? "Devre arası" : selectedMatch.schedule_confirmed && selectedMatch.kickoff ? "Program onaylı" : "Saat bekleniyor"}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-[8px] font-black ${selectedIsFinished ? "bg-emerald-50 text-emerald-700" : selectedIsCancelled ? "bg-red-50 text-red-600" : selectedIsLive ? "bg-red-50 text-red-600" : selectedIsHalftime ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
                  {selectedIsFinished ? "MAÇ SONU" : selectedIsCancelled ? "İPTAL" : selectedIsLive ? "CANLI" : selectedIsHalftime ? "DEVRE" : "PROGRAM"}
                </span>
              </div>

              {/* OLAYLAR */}
              {getMatchEvents(selectedMatch.id).length > 0 && (
                <section className="mt-3 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm sm:mt-4">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.18em] text-blue-600">Maç akışı</p>
                      <h3 className="mt-1 text-base font-black text-[#0f2747]">Maç Olayları</h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[8px] font-black text-slate-500">
                      {getMatchEvents(selectedMatch.id).length} olay
                    </span>
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-slate-100">
                    {(["home", "away"] as const).map((side) => {
                      const events = getMatchEvents(selectedMatch.id).filter((event) => event.team === side);
                      const isHome = side === "home";
                      return (
                        <div key={side} className={`min-w-0 p-3 sm:p-5 ${isHome ? "bg-blue-50/30" : "bg-slate-50/40"}`}>
                          <div className={`mb-3 flex items-center gap-2 ${isHome ? "justify-start" : "justify-end"}`}>
                            <div className={`h-2 w-2 rounded-full ${isHome ? "bg-blue-500" : "bg-slate-400"}`} />
                            <p className="max-w-[120px] truncate text-[9px] font-black uppercase tracking-wider text-[#0f2747] sm:max-w-[220px]">
                              {isHome ? selectedMatch.home_team : selectedMatch.away_team}
                            </p>
                          </div>

                          {events.length > 0 ? (
                            <div className="space-y-2">
                              {events.map((event) => {
                                const icon = event.event_type === "goal" ? "⚽" : event.event_type === "yellow_card" ? "🟨" : event.event_type === "red_card" ? "🟥" : "🔄";
                                const title = event.event_type === "substitution" ? `${event.player_out || "Oyuncu"} → ${event.player_in || "Oyuncu"}` : event.player_name || "Oyuncu";
                                return (
                                  <div key={event.id} className={`flex items-center gap-2 rounded-2xl border border-white bg-white px-2.5 py-2.5 shadow-sm ${isHome ? "text-left" : "justify-end text-right"}`}>
                                    {isHome && <span className="shrink-0 text-sm">{icon}</span>}
                                    <div className="min-w-0 flex-1">
                                      <p className="break-words text-[10px] font-black leading-4 text-[#0f2747] sm:text-xs">{title}</p>
                                      <p className={`mt-0.5 text-[9px] font-black text-blue-600 ${isHome ? "text-left" : "text-right"}`}>{getEventMinuteText(event)}</p>
                                    </div>
                                    {!isHome && <span className="shrink-0 text-sm">{icon}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex min-h-[110px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 px-2 text-center">
                              <p className="text-[9px] font-bold text-slate-400">Bu takımda henüz olay yok</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* KADRO */}
              {(() => {
                const homeStarting = getLineupPlayers(selectedMatch.id, "home", "starting");
                const homeSubstitutes = getLineupPlayers(selectedMatch.id, "home", "substitute");
                const homeUnavailable = getLineupPlayers(selectedMatch.id, "home", "absent");
                const awayStarting = getLineupPlayers(selectedMatch.id, "away", "starting");
                const awaySubstitutes = getLineupPlayers(selectedMatch.id, "away", "substitute");
                const awayUnavailable = getLineupPlayers(selectedMatch.id, "away", "absent");
                const hasLineup = homeStarting.length + homeSubstitutes.length + homeUnavailable.length + awayStarting.length + awaySubstitutes.length + awayUnavailable.length > 0;

                const PlayerRow = ({ row }: { row: MatchLineup & { player: Player } }) => (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm">
                      {row.player.photo_url ? (
                        <img src={row.player.photo_url} alt={row.player.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg">👤</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-[#0f2747]">{row.player.name}</p>
                      <p className="mt-0.5 text-[9px] font-bold text-slate-400">
                        {row.player.jersey_number != null ? `#${row.player.jersey_number}` : ""}
                        {row.player.jersey_number != null && row.player.position ? " • " : ""}
                        {row.player.position || "Mevki belirtilmedi"}
                      </p>
                      {row.status === "absent" && row.absence_reason && (
                        <p className="mt-1 text-[9px] font-extrabold text-red-600">{row.absence_reason}</p>
                      )}
                    </div>
                  </div>
                );

                const TeamLineup = ({ team, name, logo, starting, substitutes, unavailable }: {
                  team: "home" | "away";
                  name: string;
                  logo: string | null;
                  starting: Array<MatchLineup & { player: Player }>;
                  substitutes: Array<MatchLineup & { player: Player }>;
                  unavailable: Array<MatchLineup & { player: Player }>;
                }) => (
                  <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 p-1">
                        <TeamLogo url={logo} team={name} small />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-blue-600">{team === "home" ? "Ev sahibi" : "Deplasman"}</p>
                        <h4 className="truncate text-sm font-black text-[#0f2747]">{name}</h4>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">🟢 İlk 11</p>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-black text-emerald-700">{starting.length}</span>
                      </div>
                      <div className="mt-2 space-y-2">
                        {starting.length > 0 ? starting.map((row) => <PlayerRow key={row.id} row={row} />) : <p className="rounded-xl bg-slate-50 p-3 text-center text-[9px] font-bold text-slate-400">İlk 11 henüz girilmedi.</p>}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black uppercase tracking-wider text-amber-600">🟡 Yedekler</p>
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-[8px] font-black text-amber-700">{substitutes.length}</span>
                      </div>
                      <div className="mt-2 space-y-2">
                        {substitutes.length > 0 ? substitutes.map((row) => <PlayerRow key={row.id} row={row} />) : <p className="rounded-xl bg-slate-50 p-3 text-center text-[9px] font-bold text-slate-400">Yedek oyuncu girilmedi.</p>}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black uppercase tracking-wider text-red-600">🔴 Eksikler</p>
                        <span className="rounded-full bg-red-50 px-2 py-1 text-[8px] font-black text-red-700">{unavailable.length}</span>
                      </div>
                      <div className="mt-2 space-y-2">
                        {unavailable.length > 0 ? unavailable.map((row) => <PlayerRow key={row.id} row={row} />) : <p className="rounded-xl bg-slate-50 p-3 text-center text-[9px] font-bold text-slate-400">Eksik oyuncu yok.</p>}
                      </div>
                    </div>
                  </div>
                );

                return (
                  <section className="mt-3 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50/60 p-4 shadow-sm sm:mt-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-600">Maç kadrosu</p>
                        <h3 className="mt-1 text-base font-black text-[#0f2747]">İlk 11, Yedekler ve Eksikler</h3>
                      </div>
                      {hasLineup && <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-[8px] font-black text-cyan-700">Kadrolar açıklandı</span>}
                    </div>

                    {hasLineup ? (
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <TeamLineup team="home" name={selectedMatch.home_team} logo={selectedMatch.home_logo_url} starting={homeStarting} substitutes={homeSubstitutes} unavailable={homeUnavailable} />
                        <TeamLineup team="away" name={selectedMatch.away_team} logo={selectedMatch.away_logo_url} starting={awayStarting} substitutes={awaySubstitutes} unavailable={awayUnavailable} />
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                        <div className="text-3xl">👥</div>
                        <p className="mt-2 text-sm font-black text-[#0f2747]">Kadrolar henüz açıklanmadı</p>
                        <p className="mt-1 text-[10px] font-semibold text-slate-400">İlk 11, yedekler ve eksikler admin panelinden girildiğinde burada görünecek.</p>
                      </div>
                    )}
                  </section>
                );
              })()}

              {/* TAHMİN */}
              {selectedPrediction && (
                <section className="mt-3 overflow-hidden rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm sm:mt-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.18em] text-blue-600">Senin tahminin</p>
                      <p className="mt-1 text-sm font-black text-[#0f2747]">Bu maç için seçtiğin skor</p>
                    </div>
                    {selectedIsFinished && (
                      <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm">
                        <p className={`text-lg font-black ${selectedPrediction.points > 0 ? "text-emerald-600" : "text-slate-400"}`}>+{selectedPrediction.points}</p>
                        <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">Puan</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-5">
                    <span className="text-xs font-bold text-slate-500">{selectedMatch.home_team}</span>
                    <div className="rounded-2xl bg-[#0f2747] px-5 py-3 text-2xl font-black text-white shadow-lg">
                      {selectedPrediction.home_score} - {selectedPrediction.away_score}
                    </div>
                    <span className="text-xs font-bold text-slate-500">{selectedMatch.away_team}</span>
                  </div>
                </section>
              )}

              {/* AKSİYONLAR */}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {selectedCanPredict && (
                  <button
                    type="button"
                    onClick={() => { window.location.href = `/tahmin?match=${selectedMatch.id}`; }}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0f2747] px-5 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-[#17385f]"
                  >
                    🎯 {selectedPrediction ? "Tahmini Gör / Değiştir" : "Bu Maçı Tahmin Et"} <span>→</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedMatch(null)}
                  className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}




