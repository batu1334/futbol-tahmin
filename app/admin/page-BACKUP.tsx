"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";


function getPlayerPhotoUrl(photoUrl: string | null | undefined) {
  if (!photoUrl) return null;

  const value = photoUrl.trim();

  if (!value) return null;

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  const cleanPath = value
    .replace(/^\/+/, "")
    .replace(/^player-photos\//, "");

  return supabase.storage
    .from("player-photos")
    .getPublicUrl(cleanPath)
    .data.publicUrl;
}
type Match = {
  id: number;
  league: string | null;
  home_team: string;
  away_team: string;
  kickoff: string | null;
  match_date: string | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  live_minute: number | null;
  added_minute: number | null;
  schedule_confirmed: boolean | null;
  home_logo_url: string | null;
  away_logo_url: string | null;
  broadcaster: string | null;
};

type BonusQuestion = {
  id: number;
  question: string;
  options: string[] | null;
  correct_answer: string | null;
  points: number;
  is_active: boolean;
  created_at: string;
  answer_revealed?: boolean;
};

type Survey = {
  id: number;
  question: string;
  options: string[] | null;
  correct_answer: string | null;
  points: number;
  is_active: boolean;
  answer_revealed?: boolean;
  created_at: string;
};

type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_admin: boolean;
  favorite_team: string | null;
  created_at: string;
};

type BonusCode = {
  id: number;
  code: string;
  points: number;
  is_active: boolean;
  usage_count: number;
  created_at: string;
};

type RewardWheelOption = {
  slot: number;
  points: number | null;
  is_active: boolean;
};

type Player = {
  id: string;
  name: string;
  photo_url: string | null;
  created_at: string;
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
  player?: Player;
};

type UserActivity = {
  id: string;
  user_id: string;
  type: "prediction" | "bonus" | "survey" | "wheel" | "code";
  title: string;
  detail: string;
  points: number | null;
  created_at: string;
  record_id: string | number;
};


const emptyPlayerForm = {
  name: "",
  jersey_number: "",
  position: "",
  goals: "0",
  assists: "0",
  team: "",
  photo_url: "",
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [activeSection, setActiveSection] = useState<
    "matches" | "bonus" | "surveys" | "users" | "codes" | "players" | "wheel" | "activity" | "predictions" | "userBonus" | "userSurveys" | "userWheel" | "userCodes"
  >("matches");

  const [matches, setMatches] = useState<Match[]>([]);
  const [bonusQuestions, setBonusQuestions] = useState<BonusQuestion[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [bonusCodes, setBonusCodes] = useState<BonusCode[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matchLineups, setMatchLineups] = useState<MatchLineup[]>([]);
  const [lineupModal, setLineupModal] = useState<Match | null>(null);
  const [lineupRows, setLineupRows] = useState<Record<string, { team: "home" | "away"; status: "starting" | "substitute" | "absent"; absence_reason: string }>>({});
  const [lineupSaving, setLineupSaving] = useState(false);
  const [wheelOptions, setWheelOptions] = useState<RewardWheelOption[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState<"all" | UserActivity["type"]>("all");
  const [wheelSavingSlot, setWheelSavingSlot] = useState<number | null>(null);

  const [manualPoints, setManualPoints] = useState<Record<string, number>>({});
  const [pointModalUser, setPointModalUser] = useState<AdminUser | null>(null);
  const [pointForm, setPointForm] = useState({ points: "", reason: "" });
  const [pointSaving, setPointSaving] = useState(false);
  const [rankingPoints, setRankingPoints] = useState<Record<string, number>>({});
  const [rankingModalUser, setRankingModalUser] = useState<AdminUser | null>(null);
  const [rankingForm, setRankingForm] = useState({ points: "", reason: "" });
  const [rankingSaving, setRankingSaving] = useState(false);
  const [activityEdit, setActivityEdit] = useState<UserActivity | null>(null);
  const [activityForm, setActivityForm] = useState({ home_score: "", away_score: "", answer: "", points: "" });
  const [activitySaving, setActivitySaving] = useState(false);

  const [matchModal, setMatchModal] = useState(false);
  const [bonusModal, setBonusModal] = useState(false);
  const [surveyModal, setSurveyModal] = useState(false);
  const [codeModal, setCodeModal] = useState(false);
  const [playerModal, setPlayerModal] = useState(false);

  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editingBonus, setEditingBonus] =
    useState<BonusQuestion | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const [saving, setSaving] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState<
    "home" | "away" | null
  >(null);

  const [codeSavingId, setCodeSavingId] = useState<number | null>(null);
  const [uploadingPlayerPhoto, setUploadingPlayerPhoto] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [matchForm, setMatchForm] = useState({
    league: "",
    home_team: "",
    away_team: "",
    kickoff: "",
    match_date: "",
    home_score: "",
    away_score: "",
    broadcaster: "",
    schedule_confirmed: true,
    home_logo_url: "",
    away_logo_url: "",
  });

  const [surveyForm, setSurveyForm] = useState({
    question: "",
    options: "",
    correct_answer: "",
    points: "5",
    is_active: true,
  });

  const [bonusForm, setBonusForm] = useState({
    question: "",
    options: "",
    correct_answer: "",
    points: "10",
    is_active: true,
  });

  const [codeForm, setCodeForm] = useState({
    code: "",
    points: "10",
    is_active: true,
  });

  const [playerForm, setPlayerForm] = useState({
    name: "",
    jersey_number: "",
    position: "",
    goals: "0",
    assists: "0",
    team: "",
    photo_url: "",
  });

  const showMessage = (text: string) => {
    setMessage(text);
    setError("");

    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  const showError = (text: string) => {
    setError(text);
    setMessage("");

    window.setTimeout(() => {
      setError("");
    }, 5000);
  };

  /* =========================================================
     VERİLER
  ========================================================= */

  const loadWheelOptions = async () => {
    const { data, error } = await supabase.rpc("admin_get_reward_wheel_options");

    if (error) {
      console.error("reward wheel options:", error);
      showError("Çark seçenekleri yüklenemedi: " + error.message);
      return;
    }

    setWheelOptions((data || []).map((row: RewardWheelOption) => ({
      slot: Number(row.slot),
      points: row.points === null ? null : Number(row.points),
      is_active: Boolean(row.is_active),
    })));
  };

  const saveWheelSlot = async (slot: number, points: number | null) => {
    if (points !== null && (!Number.isInteger(points) || points < 5 || points > 30)) {
      return showError("Çark puanı 5 ile 30 arasında olmalı.");
    }

    setWheelSavingSlot(slot);

    const { error } = await supabase.rpc("admin_set_reward_wheel_slot", {
      p_slot: slot,
      p_points: points,
    });

    setWheelSavingSlot(null);

    if (error) {
      return showError("Çark seçeneği kaydedilemedi: " + error.message);
    }

    await loadWheelOptions();
    showMessage(points === null ? `${slot}. dilim boş olarak ayarlandı.` : `${slot}. dilim +${points} puan olarak ayarlandı.`);
  };

  const loadMatches = async () => {
    const { data, error } = await supabase
      .from("Matches")
      .select("*")
      .order("kickoff", { ascending: true });

    if (error) {
      console.error(error);
      showError("Maçlar yüklenemedi.");
      return;
    }

    setMatches((data || []) as Match[]);
  };

  const openLineupManager = async (match: Match) => {
    setLineupModal(match);
    setLineupSaving(false);

    const { data, error } = await supabase
      .from("match_lineups")
      .select("id,match_id,player_id,team,status,absence_reason")
      .eq("match_id", match.id);

    if (error) {
      console.error(error);
      showError("Maç kadrosu yüklenemedi: " + error.message);
      return;
    }

    const rows: Record<string, { team: "home" | "away"; status: "starting" | "substitute" | "absent"; absence_reason: string }> = {};
    (data || []).forEach((row: any) => {
      rows[String(row.player_id)] = {
        team: row.team,
        status: row.status,
        absence_reason: row.absence_reason || "",
      };
    });

    setMatchLineups((data || []) as MatchLineup[]);
    setLineupRows(rows);
  };

  const updateLineupRow = (playerId: string, patch: Partial<{ team: "home" | "away"; status: "starting" | "substitute" | "absent"; absence_reason: string }>) => {
    setLineupRows((prev) => {
      const current = prev[playerId] || { team: "home", status: "substitute", absence_reason: "" };
      const next = { ...current, ...patch };
      if (next.status !== "absent") next.absence_reason = "";
      return { ...prev, [playerId]: next };
    });
  };

  const saveMatchLineups = async () => {
    if (!lineupModal) return;

    const rows = Object.entries(lineupRows).map(([player_id, value]) => ({
      match_id: lineupModal.id,
      player_id,
      team: value.team,
      status: value.status,
      absence_reason: value.status === "absent" ? (value.absence_reason.trim() || null) : null,
    }));

    const homeStarting = rows.filter((r) => r.team === "home" && r.status === "starting").length;
    const awayStarting = rows.filter((r) => r.team === "away" && r.status === "starting").length;

    if (homeStarting > 11 || awayStarting > 11) {
      return showError("Bir takımda en fazla 11 ilk 11 oyuncusu olabilir.");
    }

    setLineupSaving(true);

    const { error: deleteError } = await supabase
      .from("match_lineups")
      .delete()
      .eq("match_id", lineupModal.id);

    if (deleteError) {
      setLineupSaving(false);
      return showError("Eski kadro temizlenemedi: " + deleteError.message);
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("match_lineups")
        .insert(rows);

      if (insertError) {
        setLineupSaving(false);
        return showError("Kadro kaydedilemedi: " + insertError.message);
      }
    }

    setLineupSaving(false);
    setMatchLineups(rows.map((row, index) => ({ ...row, id: index + 1 })) as MatchLineup[]);
    setLineupModal(null);
    showMessage("Maç kadrosu başarıyla kaydedildi.");
  };

  const loadBonusQuestions = async () => {
    const { data, error } = await supabase
      .from("BonusQuestions")
      .select("id, question, options, correct_answer, points, is_active, answer_revealed, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      showError("Bonus soruları yüklenemedi: " + error.message);
      return;
    }

    setBonusQuestions((data || []) as BonusQuestion[]);
  };

  const loadSurveys = async () => {
    const { data, error } = await supabase
      .from("PollQuestions")
      .select("id, question, options, correct_answer, points, is_active, answer_revealed, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      showError("Anketler yüklenemedi: " + error.message);
      return;
    }

    setSurveys((data || []) as Survey[]);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase.rpc(
      "admin_get_users"
    );

    if (error) {
      console.error(error);
      showError(
        "Kullanıcılar yüklenemedi: " + error.message
      );
      return;
    }

    setUsers((data || []) as AdminUser[]);
  };

  const loadManualPoints = async () => {
    const { data, error } = await supabase
      .from("admin_manual_points")
      .select("user_id, points");

    if (error) {
      console.error(error);
      showError("Manuel puanlar yüklenemedi: " + error.message);
      return;
    }

    const map: Record<string, number> = {};
    (data || []).forEach((row: { user_id: string; points: number }) => {
      map[row.user_id] = Number(row.points) || 0;
    });
    setManualPoints(map);
  };

  const loadRankingPoints = async () => {
    const [pred, bonus, survey, wheel, codes, adjustments] = await Promise.all([
      supabase.from("Predictions").select("user_id,points"),
      supabase.from("BonusAnswers").select("user_id,points"),
      supabase.from("PollAnswers").select("user_id,points"),
      supabase.from("reward_wheel_spins").select("user_id,points"),
      supabase.from("bonus_code_redemptions").select("user_id,points"),
      supabase.from("admin_point_adjustments").select("user_id,points"),
    ]);
    const map: Record<string, number> = {};
    for (const result of [pred, bonus, survey, wheel, codes, adjustments]) {
      if (result.error) { console.error("Sıralama puanı sorgusu:", result.error); continue; }
      for (const row of (result.data || []) as any[]) {
        if (!row.user_id) continue;
        map[String(row.user_id)] = (map[String(row.user_id)] || 0) + (Number(row.points) || 0);
      }
    }
    setRankingPoints(map);
  };

  const loadBonusCodes = async () => {
    const { data, error } = await supabase.rpc(
      "admin_get_bonus_codes"
    );

    if (error) {
      console.error(error);
      showError(
        "Bonus kodları yüklenemedi: " + error.message
      );
      return;
    }

    setBonusCodes((data || []) as BonusCode[]);
  };

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("id,name,photo_url,created_at,jersey_number,position,goals,assists,team")
      .order("name", { ascending: true });
    if (error) {
      console.error(error);
      showError("Oyuncular yüklenemedi: " + error.message);
      return;
    }
    setPlayers((data || []) as Player[]);
  };

  const loadUserActivities = async () => {
    setActivityLoading(true);
    try {
      const [pred, bonus, survey, wheel, codes] = await Promise.all([
        supabase.from("Predictions").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("BonusAnswers").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("PollAnswers").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("reward_wheel_spins").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("bonus_code_redemptions").select("*").order("created_at", { ascending: false }).limit(500),
      ]);

      const rows: UserActivity[] = [];
      const add = (data: any[] | null, type: UserActivity["type"], title: string, detailFn: (r: any) => string, pointsFn: (r: any) => number | null) => {
        (data || []).forEach((r, i) => {
          if (!r.user_id) return;
          rows.push({ id: `${type}-${r.id ?? i}-${r.user_id}`, record_id: r.id ?? i, user_id: String(r.user_id), type, title, detail: detailFn(r), points: pointsFn(r), created_at: r.created_at || r.updated_at || new Date().toISOString() });
        });
      };

      add(pred.data as any[], "prediction", "⚽ Maç tahmini", (r) => `Maç #${r.match_id} • Tahmin: ${r.home_score ?? "-"} - ${r.away_score ?? "-"}`, (r) => r.points == null ? null : Number(r.points));
      add(bonus.data as any[], "bonus", "🎯 Bonus soru", (r) => `Soru #${r.question_id ?? "-"} • Cevap: ${r.answer ?? r.selected_answer ?? "-"}`, (r) => r.points == null ? null : Number(r.points));
      add(survey.data as any[], "survey", "📊 Anket", (r) => `Anket #${r.question_id ?? "-"} • Cevap: ${r.answer ?? "-"}`, (r) => r.points == null ? null : Number(r.points));
      add(wheel.data as any[], "wheel", "🎡 Çark çevirme", (r) => `Dilim: ${r.slot ?? r.result ?? "-"}`, (r) => r.points == null ? null : Number(r.points));
      add(codes.data as any[], "code", "🔑 Bonus kodu", (r) => `Kod: ${r.code ?? r.bonus_code ?? r.code_id ?? "-"}`, (r) => r.points == null ? null : Number(r.points));

      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setActivities(rows);
      [pred, bonus, survey, wheel, codes].forEach((x) => { if (x.error) console.error("Aktivite sorgusu:", x.error); });
    } finally {
      setActivityLoading(false);
    }
  };

  const checkAdmin = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.replace("/login");
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !profile?.is_admin) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    setAuthorized(true);

    await Promise.all([
      loadMatches(),
      loadBonusQuestions(),
      loadSurveys(),
      loadUsers(),
      loadBonusCodes(),
      loadPlayers(),
      loadWheelOptions(),
      loadManualPoints(),
      loadRankingPoints(),
      loadUserActivities(),
    ]);

    setLoading(false);
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!authorized) return;

    const channel = supabase
      .channel("admin-panel-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Matches",
        },
        () => {
          loadMatches();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "BonusQuestions",
        },
        () => {
          loadBonusQuestions();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bonus_codes",
        },
        () => {
          loadBonusCodes();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bonus_code_redemptions" },
        () => { loadBonusCodes(); loadUserActivities(); loadRankingPoints(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Predictions" },
        () => { loadUserActivities(); loadRankingPoints(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "BonusAnswers" },
        () => { loadUserActivities(); loadRankingPoints(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "PollAnswers" },
        () => { loadUserActivities(); loadRankingPoints(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reward_wheel_spins" },
        () => { loadUserActivities(); loadRankingPoints(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_point_adjustments" },
        () => { loadRankingPoints(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorized]);

  /* =========================================================
     MAÇ
  ========================================================= */

  const openNewMatch = () => {
    setEditingMatch(null);

    setMatchForm({
      league: "",
      home_team: "",
      away_team: "",
      kickoff: "",
      match_date: "",
      home_score: "",
      away_score: "",
      broadcaster: "",
      schedule_confirmed: true,
      home_logo_url: "",
      away_logo_url: "",
    });

    setMatchModal(true);
  };

  const openEditMatch = (match: Match) => {
    setEditingMatch(match);

    let localKickoff = "";

    if (match.kickoff) {
      const date = new Date(match.kickoff);

      if (!Number.isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");

        localKickoff =
          `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    }

    setMatchForm({
      league: match.league || "",
      home_team: match.home_team || "",
      away_team: match.away_team || "",
      kickoff: localKickoff,
      match_date: match.match_date || (localKickoff ? localKickoff.slice(0, 10) : ""),
      home_score:
        match.home_score === null
          ? ""
          : String(match.home_score),
      away_score:
        match.away_score === null
          ? ""
          : String(match.away_score),
      broadcaster: match.broadcaster || "",
      schedule_confirmed: Boolean(match.schedule_confirmed),
      home_logo_url: match.home_logo_url || "",
      away_logo_url: match.away_logo_url || "",
    });

    setMatchModal(true);
  };

  const uploadTeamLogo = async (
    event: React.ChangeEvent<HTMLInputElement>,
    side: "home" | "away"
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Lütfen bir görsel dosyası seç.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError("Logo dosyası en fazla 5 MB olabilir.");
      return;
    }

    setUploadingLogo(side);

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "png";

    const safeName =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.${extension}`;

    const path = `team-logos/${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("team-logos")
      .upload(path, file, {
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error(uploadError);
      setUploadingLogo(null);
      showError(
        "Logo yüklenemedi. team-logos bucket'ını kontrol et."
      );
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("team-logos")
      .getPublicUrl(path);

    if (side === "home") {
      setMatchForm((prev) => ({
        ...prev,
        home_logo_url: publicUrl,
      }));
    } else {
      setMatchForm((prev) => ({
        ...prev,
        away_logo_url: publicUrl,
      }));
    }

    setUploadingLogo(null);
    showMessage(
      `${side === "home" ? "Ev sahibi" : "Deplasman"} logosu yüklendi.`
    );
  };

  const saveMatch = async (event: FormEvent) => {
    event.preventDefault();

    if (
      !matchForm.home_team.trim() ||
      !matchForm.away_team.trim()
    ) {
      showError(
        "Ev sahibi ve deplasman takımı zorunludur."
      );
      return;
    }

    setSaving(true);

    const matchDate = matchForm.match_date || null;
    const kickoff = matchForm.kickoff
      ? `${matchForm.kickoff}:00+03:00`
      : null;

    const payload = {
      league: matchForm.league.trim() || null,
      home_team: matchForm.home_team.trim(),
      away_team: matchForm.away_team.trim(),
      kickoff,
      match_date: matchDate,
      home_score:
        matchForm.home_score === ""
          ? null
          : Number(matchForm.home_score),
      away_score:
        matchForm.away_score === ""
          ? null
          : Number(matchForm.away_score),
      broadcaster:
        matchForm.broadcaster.trim() || null,
      schedule_confirmed:
        matchForm.schedule_confirmed,
      home_logo_url:
        matchForm.home_logo_url.trim() || null,
      away_logo_url:
        matchForm.away_logo_url.trim() || null,
    };

    let result;

    if (editingMatch) {
      result = await supabase
        .from("Matches")
        .update(payload)
        .eq("id", editingMatch.id);
    } else {
      result = await supabase
        .from("Matches")
        .insert(payload);
    }

    setSaving(false);

    if (result.error) {
      console.error(result.error);
      showError(result.error.message);
      return;
    }

    setMatchModal(false);

    await loadMatches();

    showMessage(
      editingMatch
        ? "Maç güncellendi."
        : "Maç başarıyla eklendi."
    );
  };

  const deleteMatch = async (match: Match) => {
    const confirmed = window.confirm(
      `${match.home_team} - ${match.away_team} maçını silmek istediğine emin misin?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("Matches")
      .delete()
      .eq("id", match.id);

    if (error) {
      console.error(error);
      showError("Maç silinemedi.");
      return;
    }

    await loadMatches();
    showMessage("Maç silindi.");
  };

  const finishMatch = async (match: Match) => {
    const homeScore = window.prompt(
      `${match.home_team} kaç gol attı?`,
      match.home_score === null
        ? ""
        : String(match.home_score)
    );

    if (homeScore === null) return;

    const awayScore = window.prompt(
      `${match.away_team} kaç gol attı?`,
      match.away_score === null
        ? ""
        : String(match.away_score)
    );

    if (awayScore === null) return;

    const home = Number(homeScore);
    const away = Number(awayScore);

    if (
      !Number.isInteger(home) ||
      !Number.isInteger(away) ||
      home < 0 ||
      away < 0
    ) {
      showError("Geçerli bir skor gir.");
      return;
    }

    const { error } = await supabase
      .from("Matches")
      .update({
        home_score: home,
        away_score: away,
        status: "finished",
      })
      .eq("id", match.id);

    if (error) {
      console.error(error);
      showError("Maç tamamlanamadı.");
      return;
    }

    await loadMatches();
    showMessage("Maç tamamlandı.");
  };

  const setMatchStatus = async (match: Match, status: "live" | "halftime" | "finished") => {
    let home: number | null = match.home_score;
    let away: number | null = match.away_score;

    if (status === "finished") {
      const homeScore = window.prompt(`${match.home_team} kaç gol attı?`, home === null ? "" : String(home));
      if (homeScore === null) return;
      const awayScore = window.prompt(`${match.away_team} kaç gol attı?`, away === null ? "" : String(away));
      if (awayScore === null) return;
      home = Number(homeScore);
      away = Number(awayScore);
      if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) return showError("Geçerli bir skor gir.");
    }

    const { error } = await supabase.from("Matches").update({ status, home_score: home, away_score: away }).eq("id", match.id);
    if (error) return showError("Maç durumu güncellenemedi: " + error.message);
    await loadMatches();
    showMessage(status === "live" ? "Maç CANLI yapıldı." : status === "halftime" ? "Maç DEVRE ARASI yapıldı." : "Maç tamamlandı.");
  };

  const updateLiveControl = async (match: Match, patch: { live_minute?: number; added_minute?: number; home_score?: number; away_score?: number; status?: string }) => {
    const { error } = await supabase
      .from("Matches")
      .update(patch)
      .eq("id", match.id);

    if (error) {
      console.error(error);
      showError("Canlı maç bilgisi güncellenemedi: " + error.message);
      return;
    }

    await loadMatches();
  };

  const setLiveMinute = async (match: Match) => {
    const value = window.prompt("Canlı dakika (örn. 37 veya 90):", String(match.live_minute ?? 0));
    if (value === null) return;
    const minute = Number(value);
    if (!Number.isInteger(minute) || minute < 0 || minute > 120) {
      showError("Dakika 0 ile 120 arasında tam sayı olmalı.");
      return;
    }
    await updateLiveControl(match, { live_minute: minute });
  };

  const setAddedMinute = async (match: Match) => {
    const value = window.prompt("Uzatma dakikası (örn. 4):", String(match.added_minute ?? 0));
    if (value === null) return;
    const minute = Number(value);
    if (!Number.isInteger(minute) || minute < 0 || minute > 30) {
      showError("Uzatma 0 ile 30 arasında tam sayı olmalı.");
      return;
    }
    await updateLiveControl(match, { added_minute: minute });
  };

  const changeLiveScore = async (match: Match, side: "home" | "away", delta: number) => {
    const current = side === "home" ? (match.home_score ?? 0) : (match.away_score ?? 0);
    const next = current + delta;
    if (next < 0) return;
    await updateLiveControl(match, side === "home" ? { home_score: next } : { away_score: next });
  };

  const reopenMatch = async (match: Match) => {
    const { error } = await supabase
      .from("Matches")
      .update({
        status: "scheduled",
      })
      .eq("id", match.id);

    if (error) {
      console.error(error);
      showError("Maç yeniden açılamadı.");
      return;
    }

    await loadMatches();
    showMessage("Maç yeniden açıldı.");
  };

  /* =========================================================
     BONUS SORULAR
  ========================================================= */

  const openNewBonus = () => {
    setEditingBonus(null);

    setBonusForm({
      question: "",
      options: "",
      correct_answer: "",
      points: "10",
      is_active: true,
    });

    setBonusModal(true);
  };

  const openEditBonus = (bonus: BonusQuestion) => {
    setEditingBonus(bonus);

    setBonusForm({
      question: bonus.question || "",
      options: (bonus.options || []).join("\n"),
      correct_answer: bonus.correct_answer || "",
      points: String(bonus.points ?? 10),
      is_active: Boolean(bonus.is_active),
    });

    setBonusModal(true);
  };

  const saveBonus = async (event: FormEvent) => {
    event.preventDefault();

    const question = bonusForm.question.trim();
    const options = bonusForm.options.split("\n").map((item) => item.trim()).filter(Boolean);
    const correct = bonusForm.correct_answer.trim();
    const points = Number(bonusForm.points);

    if (!question) return showError("Bonus sorusu boş bırakılamaz.");
    if (options.length < 2) return showError("En az 2 seçenek gir.");
    if (correct && !options.includes(correct)) return showError("Doğru cevap seçeneklerden biri olmalı.");
    if (!Number.isInteger(points) || points < 0) return showError("Geçerli bir puan gir.");

    setSaving(true);

    const result = editingBonus
      ? await supabase
          .from("BonusQuestions")
          .update({ question, options, correct_answer: correct, points, is_active: bonusForm.is_active })
          .eq("id", editingBonus.id)
      : await supabase
          .from("BonusQuestions")
          .insert({ question, options, correct_answer: correct, points, is_active: bonusForm.is_active });

    setSaving(false);

    if (result.error) {
      console.error(result.error);
      showError("Bonus sorusu kaydedilemedi: " + result.error.message);
      return;
    }

    setBonusModal(false);
    await loadBonusQuestions();
    showMessage(editingBonus ? "Bonus sorusu güncellendi." : "Bonus sorusu başarıyla eklendi.");
  };

  const revealBonus = async (bonus: BonusQuestion) => {
    if (!window.confirm("Doğru cevap açıklansın ve doğru cevaplayanlara puan verilsin mi?")) return;

    const { error } = await supabase.rpc("admin_reveal_bonus_question", {
      p_question_id: bonus.id,
    });

    if (error) {
      console.error(error);
      showError("Bonus sonucu açıklanamadı: " + error.message);
      return;
    }

    await loadBonusQuestions();
    showMessage("Doğru cevap açıklandı ve puanlar işlendi.");
  };

  const deleteBonus = async (bonus: BonusQuestion) => {
    if (!window.confirm("Bu bonus sorusunu silmek istediğine emin misin?")) return;

    const { error } = await supabase.from("BonusQuestions").delete().eq("id", bonus.id);

    if (error) {
      console.error(error);
      showError("Bonus sorusu silinemedi: " + error.message);
      return;
    }

    await loadBonusQuestions();
    showMessage("Bonus sorusu silindi.");
  };

  const toggleBonus = async (bonus: BonusQuestion) => {
    const { error } = await supabase
      .from("BonusQuestions")
      .update({ is_active: !bonus.is_active })
      .eq("id", bonus.id);

    if (error) {
      console.error(error);
      showError("Bonus sorusu güncellenemedi: " + error.message);
      return;
    }

    await loadBonusQuestions();
    showMessage(bonus.is_active ? "Bonus sorusu pasif yapıldı." : "Bonus sorusu aktif yapıldı.");
  };

  const openNewSurvey = () => {
    setEditingSurvey(null);
    setSurveyForm({ question: "", options: "", correct_answer: "", points: "5", is_active: true });
    setSurveyModal(true);
  };

  const openEditSurvey = (survey: Survey) => {
    setEditingSurvey(survey);
    setSurveyForm({
      question: survey.question || "",
      options: (survey.options || []).join("\n"),
      correct_answer: survey.correct_answer || "",
      points: String(survey.points ?? 5),
      is_active: Boolean(survey.is_active),
    });
    setSurveyModal(true);
  };

  const saveSurvey = async (event: FormEvent) => {
    event.preventDefault();

    const question = surveyForm.question.trim();
    const options = surveyForm.options.split("\n").map((item) => item.trim()).filter(Boolean);
    const correct = surveyForm.correct_answer.trim();
    const points = Number(surveyForm.points);

    if (!question) return showError("Anket sorusu boş bırakılamaz.");
    if (options.length < 2) return showError("En az 2 seçenek gir.");
    if (correct && !options.includes(correct)) return showError("Doğru cevap seçeneklerden biri olmalı.");
    if (!Number.isInteger(points) || points <= 0) return showError("Puan 0'dan büyük olmalı.");

    setSaving(true);

    const result = editingSurvey
      ? await supabase
          .from("PollQuestions")
          .update({ question, options, correct_answer: correct || null, points, is_active: surveyForm.is_active })
          .eq("id", editingSurvey.id)
      : await supabase
          .from("PollQuestions")
          .insert({ question, options, correct_answer: correct || null, points, is_active: surveyForm.is_active });

    setSaving(false);

    if (result.error) {
      console.error(result.error);
      showError("Anket kaydedilemedi: " + result.error.message);
      return;
    }

    setSurveyModal(false);
    await loadSurveys();
    showMessage(editingSurvey ? "Anket güncellendi." : "Anket başarıyla eklendi.");
  };

  const revealSurvey = async (survey: Survey) => {
    if (!window.confirm("Doğru cevap açıklansın ve doğru cevaplayanlara puan verilsin mi?")) return;

    const { error } = await supabase.rpc("admin_reveal_poll_question", {
      p_question_id: survey.id,
    });

    if (error) {
      console.error(error);
      showError("Anket sonucu açıklanamadı: " + error.message);
      return;
    }

    await loadSurveys();
    showMessage("Anket cevabı açıklandı ve puanlar işlendi.");
  };

  const deleteSurvey = async (survey: Survey) => {
    if (!window.confirm("Bu anket silinsin mi?")) return;

    const { error } = await supabase.from("PollQuestions").delete().eq("id", survey.id);

    if (error) {
      console.error(error);
      showError("Anket silinemedi: " + error.message);
      return;
    }

    await loadSurveys();
    showMessage("Anket silindi.");
  };

  const toggleSurvey = async (survey: Survey) => {
    const { error } = await supabase
      .from("PollQuestions")
      .update({ is_active: !survey.is_active })
      .eq("id", survey.id);

    if (error) {
      console.error(error);
      showError("Anket güncellenemedi: " + error.message);
      return;
    }

    await loadSurveys();
    showMessage(survey.is_active ? "Anket pasif yapıldı." : "Anket aktif yapıldı.");
  };

  /* =========================================================
     BONUS KODLARI
  ========================================================= */

  const openRankingModal = (user: AdminUser) => {
    setRankingModalUser(user);
    setRankingForm({ points: "", reason: "" });
  };

  const applyRankingAdjustment = async (mode: "add" | "remove" | "reset") => {
    if (!rankingModalUser) return;
    const current = Number(rankingPoints[rankingModalUser.id] || 0);
    let delta = 0;
    if (mode === "reset") {
      if (!window.confirm(`${rankingModalUser.display_name || "Bu kullanıcı"} adlı kullanıcının sıralama puanı 0 yapılsın mı?`)) return;
      delta = -current;
    } else {
      const amount = Number(rankingForm.points);
      if (!Number.isInteger(amount) || amount <= 0) return showError("1 veya daha büyük tam sayı puan gir.");
      if (!rankingForm.reason.trim()) return showError("İşlem nedeni gir.");
      delta = mode === "add" ? amount : -amount;
    }
    if (delta === 0) {
      setRankingModalUser(null);
      return showMessage("Sıralama puanı zaten 0.");
    }
    setRankingSaving(true);
    let { error } = await supabase.from("admin_point_adjustments").insert({ user_id: rankingModalUser.id, points: delta, reason: rankingForm.reason.trim() || (mode === "reset" ? "Admin tarafından sıralama puanı sıfırlandı" : "Admin puan düzeltmesi") });
    if (error) {
      const fallback = await supabase.from("admin_point_adjustments").insert({ user_id: rankingModalUser.id, points: delta });
      error = fallback.error;
    }
    setRankingSaving(false);
    if (error) return showError("Sıralama puanı güncellenemedi: " + error.message);
    await loadRankingPoints();
    const next = current + delta;
    setRankingModalUser(null);
    showMessage(`${rankingModalUser.display_name || "Kullanıcı"} sıralama puanı ${next} oldu.`);
  };

  const openActivityEdit = (activity: UserActivity) => {
    setActivityEdit(activity);
    setActivityForm({ home_score: "", away_score: "", answer: "", points: activity.points == null ? "0" : String(activity.points) });
    if (activity.type === "prediction") {
      const match = activity.detail.match(/Tahmin:\s*(-?\d+)\s*-\s*(-?\d+)/);
      setActivityForm((p) => ({ ...p, home_score: match?.[1] || "0", away_score: match?.[2] || "0" }));
    } else {
      const answer = activity.detail.split("• Cevap: ")[1] || "";
      setActivityForm((p) => ({ ...p, answer }));
    }
  };

  const saveActivityEdit = async () => {
    if (!activityEdit) return;
    setActivitySaving(true);
    let result: any;
    const id = activityEdit.record_id;
    const points = Number(activityForm.points);
    if (!Number.isFinite(points)) { setActivitySaving(false); return showError("Geçerli bir puan gir."); }
    if (activityEdit.type === "prediction") {
      const home = Number(activityForm.home_score), away = Number(activityForm.away_score);
      if (!Number.isInteger(home) || home < 0 || !Number.isInteger(away) || away < 0) { setActivitySaving(false); return showError("Skorlar 0 veya daha büyük tam sayı olmalı."); }
      result = await supabase.from("Predictions").update({ home_score: home, away_score: away, points }).eq("id", id);
    } else if (activityEdit.type === "bonus") {
      result = await supabase.from("BonusAnswers").update({ answer: activityForm.answer, points }).eq("id", id);
    } else if (activityEdit.type === "survey") {
      result = await supabase.from("PollAnswers").update({ answer: activityForm.answer, points }).eq("id", id);
    } else if (activityEdit.type === "wheel") {
      result = await supabase.from("reward_wheel_spins").update({ points }).eq("id", id);
    } else {
      result = await supabase.from("bonus_code_redemptions").update({ points }).eq("id", id);
    }
    setActivitySaving(false);
    if (result.error) return showError("Kullanıcı işlemi güncellenemedi: " + result.error.message);
    setActivityEdit(null);
    await Promise.all([loadUserActivities(), loadRankingPoints()]);
    showMessage("Kullanıcı işlemi güncellendi.");
  };

  const deleteActivity = async (activity: UserActivity) => {
    if (!window.confirm("Bu kullanıcı işlemi silinsin mi? Bu işlem ilgili puanı da toplamdan düşürür.")) return;
    const table = activity.type === "prediction" ? "Predictions" : activity.type === "bonus" ? "BonusAnswers" : activity.type === "survey" ? "PollAnswers" : activity.type === "wheel" ? "reward_wheel_spins" : "bonus_code_redemptions";
    const { error } = await supabase.from(table).delete().eq("id", activity.record_id);
    if (error) return showError("Kullanıcı işlemi silinemedi: " + error.message);
    await Promise.all([loadUserActivities(), loadRankingPoints()]);
    showMessage("Kullanıcı işlemi silindi.");
  };

  const openPointModal = (user: AdminUser) => {
    setPointModalUser(user);
    setPointForm({ points: "", reason: "" });
  };

  const applyUserPoints = async (mode: "add" | "remove" | "reset") => {
    if (!pointModalUser) return;

    if (mode === "reset") {
      const ok = window.confirm(
        `${pointModalUser.display_name || "Bu kullanıcı"} adlı kullanıcının manuel puanı sıfırlansın mı?`
      );
      if (!ok) return;
    }

    let amount = 0;
    if (mode === "reset") {
      amount = 0;
    } else {
      amount = Number(pointForm.points);
      if (!Number.isInteger(amount) || amount <= 0) {
        return showError("1 veya daha büyük tam sayı puan gir.");
      }
      if (!pointForm.reason.trim()) {
        return showError("İşlem nedeni gir.");
      }
    }

    setPointSaving(true);
    const current = Number(manualPoints[pointModalUser.id] || 0);
    const next = mode === "reset" ? 0 : mode === "add" ? current + amount : current - amount;

    const { error } = await supabase
      .from("admin_manual_points")
      .upsert(
        {
          user_id: pointModalUser.id,
          points: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    setPointSaving(false);
    if (error) {
      return showError("Puan işlemi başarısız: " + error.message);
    }

    await loadManualPoints();
    const name = pointModalUser.display_name || "Kullanıcı";
    setPointModalUser(null);
    setPointForm({ points: "", reason: "" });
    showMessage(
      mode === "reset"
        ? `${name} manuel puanı sıfırlandı.`
        : `${name} için ${mode === "add" ? "+" : "-"}${amount} puan uygulandı. Yeni manuel puan: ${next}`
    );
  };

  const openNewCode = () => {
    setCodeForm({
      code: "",
      points: "10",
      is_active: true,
    });

    setCodeModal(true);
  };

  const saveBonusCode = async (event: FormEvent) => {
    event.preventDefault();

    const code = codeForm.code.trim();

    if (!code) {
      showError("Bonus kodu boş bırakılamaz.");
      return;
    }

    const points = Number(codeForm.points);

    if (!Number.isInteger(points) || points < 0) {
      showError("Geçerli bir puan gir.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "admin_create_bonus_code",
      {
        p_code: code,
        p_points: points,
        p_is_active: codeForm.is_active,
      }
    );

    setSaving(false);

    if (error) {
      console.error(error);
      showError(error.message);
      return;
    }

    setCodeModal(false);

    await loadBonusCodes();

    showMessage("Bonus kodu başarıyla eklendi.");
  };

  const toggleBonusCode = async (code: BonusCode) => {
    setCodeSavingId(code.id);

    const { error } = await supabase.rpc(
      "admin_set_bonus_code_status",
      {
        p_code_id: code.id,
        p_is_active: !code.is_active,
      }
    );

    setCodeSavingId(null);

    if (error) {
      console.error(error);
      showError(error.message);
      return;
    }

    await loadBonusCodes();

    showMessage(
      `${code.code} ${
        code.is_active ? "pasif" : "aktif"
      } yapıldı.`
    );
  };

  /* =========================================================
     GENEL
  ========================================================= */

  const openNewPlayer = () => {
    setEditingPlayer(null);
    setPlayerForm({ ...emptyPlayerForm });
    setPlayerModal(true);
  };

  const openEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setPlayerForm({
      name: player.name || "",
      jersey_number: player.jersey_number == null ? "" : String(player.jersey_number),
      position: player.position || "",
      goals: String(player.goals ?? 0),
      assists: String(player.assists ?? 0),
      team: player.team || "",
      photo_url: player.photo_url || "",
    });
    setPlayerModal(true);
  };

  const uploadPlayerPhoto = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return showError("Lütfen bir görsel dosyası seç.");
    }

    if (file.size > 5 * 1024 * 1024) {
      return showError(
        "Oyuncu fotoğrafı en fazla 5 MB olabilir."
      );
    }

    try {
      setUploadingPlayerPhoto(true);

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const path =
        `players/${crypto.randomUUID()}.${extension}`;

      console.log("FOTOĞRAF YÜKLENİYOR:", path);

      const { error: uploadError } =
        await supabase.storage
          .from("player-photos")
          .upload(path, file, {
            upsert: false,
            contentType: file.type,
          });

      if (uploadError) {
        console.error(
          "FOTOĞRAF UPLOAD HATASI:",
          uploadError
        );

        return showError(
          "Fotoğraf yüklenemedi: " +
            uploadError.message
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("player-photos")
        .getPublicUrl(path);

      if (!publicUrl) {
        return showError(
          "Fotoğraf URL'si oluşturulamadı."
        );
      }

      console.log(
        "FOTOĞRAF URL:",
        publicUrl
      );

      /*
       * Eğer mevcut oyuncu düzenleniyorsa,
       * fotoğraf URL'sini doğrudan veritabanına yazıyoruz.
       * Böylece React state'e bağlı kalmıyoruz.
       */
      if (editingPlayer) {
        const { error: photoDbError } =
          await supabase
            .from("players")
            .update({
              photo_url: publicUrl,
            })
            .eq("id", editingPlayer.id);

        if (photoDbError) {
          console.error(
            "PHOTO_URL DB HATASI:",
            photoDbError
          );

          return showError(
            "Fotoğraf yüklendi ancak oyuncuya kaydedilemedi: " +
              photoDbError.message
          );
        }

        console.log(
          "PHOTO_URL VERİTABANINA KAYDEDİLDİ:",
          publicUrl
        );
      }

      setPlayerForm((prev) => ({
        ...prev,
        photo_url: publicUrl,
      }));

      showMessage(
        editingPlayer
          ? "Oyuncu fotoğrafı kaydedildi."
          : "Oyuncu fotoğrafı yüklendi."
      );
    } catch (error) {
      console.error(
        "OYUNCU FOTOĞRAF HATASI:",
        error
      );

      showError(
        error instanceof Error
          ? error.message
          : "Oyuncu fotoğrafı yüklenemedi."
      );
    } finally {
      setUploadingPlayerPhoto(false);
    }
  };
  const savePlayer = async (event: FormEvent) => {
    event.preventDefault();

    const name = playerForm.name.trim();
    const goals = Number(playerForm.goals);
    const assists = Number(playerForm.assists);

    const jerseyNumber =
      playerForm.jersey_number.trim() === ""
        ? null
        : Number(playerForm.jersey_number);

    if (!name) {
      return showError(
        "Oyuncu adı zorunludur."
      );
    }

    if (!Number.isInteger(goals) || goals < 0) {
      return showError(
        "Gol sayısı 0 veya daha büyük bir tam sayı olmalıdır."
      );
    }

    if (!Number.isInteger(assists) || assists < 0) {
      return showError(
        "Asist sayısı 0 veya daha büyük bir tam sayı olmalıdır."
      );
    }

    if (
      jerseyNumber !== null &&
      (
        !Number.isInteger(jerseyNumber) ||
        jerseyNumber < 0 ||
        jerseyNumber > 99
      )
    ) {
      return showError(
        "Forma numarası 0-99 arasında olmalıdır."
      );
    }

    setSaving(true);

    const photoUrl =
      playerForm.photo_url.trim();

    const payload = {
      name,
      photo_url: photoUrl || null,
      jersey_number: jerseyNumber,
      position:
        playerForm.position.trim() || null,
      goals,
      assists,
      team:
        playerForm.team.trim() || null,
    };

    console.log(
      "OYUNCU KAYIT PAYLOAD:",
      payload
    );

    const result = editingPlayer
      ? await supabase
          .from("players")
          .update(payload)
          .eq("id", editingPlayer.id)
      : await supabase
          .from("players")
          .insert(payload);

    setSaving(false);

    if (result.error) {
      console.error(
        "OYUNCU KAYIT HATASI:",
        result.error
      );

      return showError(
        "Oyuncu kaydedilemedi: " +
          result.error.message
      );
    }

    console.log(
      "OYUNCU KAYDEDİLDİ:",
      payload
    );

    setPlayerModal(false);

    await loadPlayers();

    showMessage(
      editingPlayer
        ? "Oyuncu güncellendi."
        : "Oyuncu başarıyla eklendi."
    );
  };
  const deletePlayer = async (player: Player) => {
    if (!window.confirm(`${player.name} oyuncusunu silmek istediğine emin misin?`)) return;
    const { error } = await supabase.from("players").delete().eq("id", player.id);
    if (error) return showError("Oyuncu silinemedi: " + error.message);
    await loadPlayers();
    showMessage("Oyuncu silindi.");
  };

  const logout = async () => {
    await supabase.auth.signOut({
      scope: "local",
    });

    window.location.replace("/login");
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const stats = useMemo(() => {
    const finished = matches.filter(
      (match) => match.status === "finished"
    ).length;

    const scheduled = matches.filter(
      (match) =>
        match.status !== "finished" &&
        match.status !== "cancelled"
    ).length;

    const totalCodeUses = bonusCodes.reduce(
      (sum, code) =>
        sum + Number(code.usage_count || 0),
      0
    );

    return {
      totalMatches: matches.length,
      finished,
      scheduled,
      users: users.length,
      bonusQuestions: bonusQuestions.length,
      totalCodes: bonusCodes.length,
      totalCodeUses,
      players: players.length,
    };
  }, [
    matches,
    users,
    bonusQuestions,
    bonusCodes,
    players,
  ]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f2747] text-3xl">
            ⚙️
          </div>

          <p className="mt-4 text-sm font-bold text-slate-500">
            Admin paneli yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-5">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
            🔒
          </div>

          <h1 className="mt-5 text-2xl font-extrabold text-[#0f2747]">
            Yetkisiz Erişim
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Bu sayfayı görüntülemek için admin yetkisine sahip
            olmalısın.
          </p>

          <button
            type="button"
            onClick={() =>
              (window.location.href = "/")
            }
            className="mt-6 w-full rounded-xl bg-[#0f2747] px-5 py-3.5 text-sm font-bold text-white"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                (window.location.href = "/")
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f2747] text-lg"
            >
              ⚽
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold tracking-tight text-[#0f2747] sm:text-xl">
                Admin Paneli
              </h1>

              <p className="text-[9px] font-bold uppercase tracking-widest text-blue-600">
                Futbol Tahmin Yönetimi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                (window.location.href = "/")
              }
              className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 sm:block"
            >
              ← Ana Sayfa
            </button>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white sm:text-sm"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {message && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            ⚠ {error}
          </div>
        )}

        {/* İSTATİSTİKLER */}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Maç
            </p>
            <p className="mt-2 text-2xl font-extrabold text-[#0f2747]">
              {stats.totalMatches}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Planlanan
            </p>
            <p className="mt-2 text-2xl font-extrabold text-blue-600">
              {stats.scheduled}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Tamamlanan
            </p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-600">
              {stats.finished}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Kullanıcı
            </p>
            <p className="mt-2 text-2xl font-extrabold text-[#0f2747]">
              {stats.users}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Bonus Soru
            </p>
            <p className="mt-2 text-2xl font-extrabold text-purple-600">
              {stats.bonusQuestions}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Bonus Kod
            </p>
            <p className="mt-2 text-2xl font-extrabold text-orange-600">
              {stats.totalCodes}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Kod Kullanımı
            </p>
            <p className="mt-2 text-2xl font-extrabold text-pink-600">
              {stats.totalCodeUses}
            </p>
          </div>
        </section>

        {/* MENÜ */}

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["matches", "⚽ Maçlar"],
            ["bonus", "🎯 Bonus Soruları"],
    ["surveys", "📊 Anketler"],
            ["users", "👥 Kullanıcılar"],
            ["codes", "🎁 Bonus Kodları"],
    ["players", "👤 Oyuncular"],
            ["wheel", "🎡 Çark"],
            ["activity", "📋 Kullanıcı Hareketleri"],
            ["predictions", "🎯 Kullanıcı Tahminleri"],
            ["userBonus", "🎁 Kullanıcı Bonus"],
            ["userSurveys", "📊 Kullanıcı Anket"],
            ["userWheel", "🎡 Kullanıcı Çark"],
            ["userCodes", "🔑 Kod Kullanımları"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setActiveSection(
                  key as
                    | "matches"
                    | "bonus"
                    | "users"
                    | "codes"
                    | "players"
                    | "wheel"
                )
              }
              className={`rounded-xl px-3 py-3 text-xs font-extrabold sm:text-sm ${
                activeSection === key
                  ? "bg-[#0f2747] text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* =====================================================
            MAÇLAR
        ===================================================== */}

        {activeSection === "matches" && <section className="mt-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Maç Yönetimi</p><h2 className="mt-1 text-2xl font-extrabold text-[#0f2747]">Maçlar</h2></div><button type="button" onClick={openNewMatch} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white">+ Yeni Maç</button></div><div className="mt-4 space-y-3">{matches.length === 0 ? <Empty text="Henüz maç yok." /> : matches.map((match) => <div key={match.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">{match.league || "Futbol"}</span><span className={`rounded-md px-2 py-1 text-[9px] font-bold ${match.status === "finished" ? "bg-emerald-50 text-emerald-700" : match.status === "live" ? "bg-red-50 text-red-700" : match.status === "halftime" ? "bg-orange-50 text-orange-700" : match.status === "cancelled" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{match.status === "finished" ? "Maç Sonu" : match.status === "live" ? "CANLI" : match.status === "halftime" ? "Devre Arası" : match.status === "cancelled" ? "İptal" : "Planlandı"}</span></div><h3 className="mt-3 text-lg font-extrabold text-[#0f2747]">{match.home_team} <span className="mx-1 text-slate-300">-</span> {match.away_team}</h3><p className="mt-1 text-xs font-semibold text-slate-400">{formatDate(match.kickoff)}{match.broadcaster ? ` • ${match.broadcaster}` : ""}</p>{(match.status === "live" || match.status === "halftime" || match.status === "finished") && <div className="mt-2"><p className="text-xl font-black text-[#0f2747]">{match.home_score ?? 0} - {match.away_score ?? 0}</p>{(match.status === "live" || match.status === "halftime") && <p className="mt-1 text-sm font-black text-red-600">{match.live_minute ?? 0}{(match.added_minute ?? 0) > 0 ? `+${match.added_minute}` : ""}'</p>}</div>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openLineupManager(match)} className="rounded-xl bg-cyan-600 px-3 py-2.5 text-xs font-bold text-white">Kadro</button><button type="button" onClick={() => openEditMatch(match)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Düzenle</button>{(match.status === "live" || match.status === "halftime") ? <><button type="button" onClick={() => setLiveMinute(match)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">⏱ Dakika</button><button type="button" onClick={() => setAddedMinute(match)} className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white">➕ Uzatma</button><button type="button" onClick={() => changeLiveScore(match, "home", 1)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">⚽ Ev +1</button><button type="button" onClick={() => changeLiveScore(match, "away", 1)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">⚽ Dep +1</button><button type="button" onClick={() => changeLiveScore(match, "home", -1)} className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white">Ev −1</button><button type="button" onClick={() => changeLiveScore(match, "away", -1)} className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white">Dep −1</button></> : null}{match.status === "scheduled" || !match.status ? <button type="button" onClick={() => setMatchStatus(match, "live")} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">🔴 CANLI</button> : null}{match.status === "live" ? <button type="button" onClick={() => setMatchStatus(match, "halftime")} className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white">⏸ Devre Arası</button> : null}{match.status === "halftime" ? <button type="button" onClick={() => setMatchStatus(match, "live")} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">▶ CANLI</button> : null}{match.status === "live" || match.status === "halftime" ? <button type="button" onClick={() => setMatchStatus(match, "finished")} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">🏁 Maç Sonu</button> : null}{match.status === "finished" ? <button type="button" onClick={() => reopenMatch(match)} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white">Yeniden Aç</button> : null}<button type="button" onClick={() => deleteMatch(match)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">Sil</button></div></div></div>)}</div></section>}

        {activeSection === "bonus" && <section className="mt-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-purple-600">Bonus Yönetimi</p><h2 className="mt-1 text-2xl font-extrabold text-[#0f2747]">Bonus Soruları</h2></div><button type="button" onClick={openNewBonus} className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-extrabold text-white">+ Yeni Soru</button></div><div className="mt-4 space-y-3">{bonusQuestions.length === 0 ? <Empty text="Henüz bonus sorusu yok." /> : bonusQuestions.map((bonus) => <div key={bonus.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex-1"><div className="flex flex-wrap gap-2"><span className={`rounded-md px-2 py-1 text-[9px] font-bold ${bonus.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{bonus.is_active ? "Aktif" : "Pasif"}</span><span className="rounded-md bg-purple-50 px-2 py-1 text-[9px] font-bold text-purple-700">{bonus.points} puan</span><span className={`rounded-md px-2 py-1 text-[9px] font-bold ${bonus.answer_revealed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{bonus.answer_revealed ? "Cevap Açıklandı" : "Cevap Gizli"}</span></div><h3 className="mt-3 font-extrabold text-[#0f2747]">{bonus.question}</h3><div className="mt-2 space-y-1 text-xs text-slate-500">{(bonus.options || []).map((option) => <p key={option}>• {option}</p>)}</div><p className="mt-3 text-xs font-bold text-emerald-600">Doğru cevap: {bonus.correct_answer || "Belirlenmedi"}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openEditBonus(bonus)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Düzenle</button><button type="button" onClick={() => toggleBonus(bonus)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">{bonus.is_active ? "Pasifleştir" : "Aktifleştir"}</button>{!bonus.answer_revealed && <button type="button" onClick={() => revealBonus(bonus)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Cevabı Açıkla + Puanla</button>}<button type="button" onClick={() => deleteBonus(bonus)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">Sil</button></div></div></div>)}</div></section>}

        {activeSection === "surveys" && (
          <section className="mt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Anket Yönetimi</p>
                <h2 className="mt-1 text-2xl font-extrabold text-[#0f2747]">Anketler</h2>
                <p className="mt-1 text-sm text-slate-500">Kullanıcıların cevaplayacağı anketleri buradan ekle ve yönet.</p>
              </div>
              <button type="button" onClick={openNewSurvey} className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-extrabold text-white">+ Yeni Anket</button>
            </div>
            <div className="mt-4 space-y-3">
              {surveys.length === 0 ? <Empty text="Henüz anket yok." /> : surveys.map((survey) => (
                <div key={survey.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-md px-2 py-1 text-[9px] font-bold ${survey.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{survey.is_active ? "Aktif" : "Pasif"}</span>
                        <span className="rounded-md bg-purple-50 px-2 py-1 text-[9px] font-bold text-purple-700">{survey.points} puan</span>
                      </div>
                      <h3 className="mt-3 font-extrabold text-[#0f2747]">{survey.question}</h3>
                      <div className="mt-2 space-y-1 text-xs text-slate-500">{(survey.options || []).map((option) => <p key={option}>• {option}</p>)}</div>
                      <p className="mt-3 text-xs font-bold text-emerald-600">Doğru cevap: {survey.correct_answer || "Belirlenmedi"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openEditSurvey(survey)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Düzenle</button>
                      <button type="button" onClick={() => toggleSurvey(survey)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">{survey.is_active ? "Pasifleştir" : "Aktifleştir"}</button>
                      {!survey.answer_revealed && <button type="button" onClick={() => revealSurvey(survey)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Cevabı Açıkla + Puanla</button>}
                      <button type="button" onClick={() => deleteSurvey(survey)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">Sil</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {(["activity", "predictions", "userBonus", "userSurveys", "userWheel", "userCodes"] as const).includes(activeSection as any) && (
          <section className="mt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Kullanıcı Aktivitesi</p>
                <h2 className="mt-1 text-2xl font-extrabold text-[#0f2747]">{activeSection === "activity" ? "Tüm Kullanıcı Hareketleri" : activeSection === "predictions" ? "Kullanıcı Tahminleri" : activeSection === "userBonus" ? "Kullanıcı Bonus Soruları" : activeSection === "userSurveys" ? "Kullanıcı Anket Cevapları" : activeSection === "userWheel" ? "Kullanıcı Çark Çevirme" : "Kod Kullanımları"}</h2>
                <p className="mt-1 text-sm text-slate-500">Kullanıcıların yaptığı işlemleri tarih sırasıyla görebilirsin.</p>
              </div>
              <button type="button" onClick={loadUserActivities} className="rounded-xl bg-[#0f2747] px-4 py-2.5 text-xs font-extrabold text-white">↻ Yenile</button>
            </div>

            {activeSection === "activity" && (
              <div className="mt-4 flex flex-wrap gap-2">{[["all","Tümü"],["prediction","Tahminler"],["bonus","Bonus"],["survey","Anket"],["wheel","Çark"],["code","Kod"]].map(([key,label]) => <button key={key} type="button" onClick={() => setActivityFilter(key as any)} className={`rounded-xl px-3 py-2 text-xs font-extrabold ${activityFilter === key ? "bg-[#0f2747] text-white" : "bg-white text-slate-500 border border-slate-200"}`}>{label}</button>)}</div>
            )}

            {activityLoading ? <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-400">Aktiviteler yükleniyor...</div> : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-[850px] w-full text-left">
                    <thead className="bg-slate-50"><tr><th className="px-4 py-3 text-xs font-extrabold text-slate-500">Tarih</th><th className="px-4 py-3 text-xs font-extrabold text-slate-500">Kullanıcı</th><th className="px-4 py-3 text-xs font-extrabold text-slate-500">İşlem</th><th className="px-4 py-3 text-xs font-extrabold text-slate-500">Detay</th><th className="px-4 py-3 text-xs font-extrabold text-slate-500">Puan</th><th className="px-4 py-3 text-xs font-extrabold text-slate-500">İşlem</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {activities.filter((a) => { if (activeSection === "activity") return activityFilter === "all" || a.type === activityFilter; if (activeSection === "predictions") return a.type === "prediction"; if (activeSection === "userBonus") return a.type === "bonus"; if (activeSection === "userSurveys") return a.type === "survey"; if (activeSection === "userWheel") return a.type === "wheel"; return a.type === "code"; }).map((a) => { const u = users.find((x) => x.id === a.user_id); return <tr key={a.id}><td className="px-4 py-4 text-xs font-bold text-slate-500">{new Intl.DateTimeFormat("tr-TR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }).format(new Date(a.created_at))}</td><td className="px-4 py-4"><p className="text-sm font-extrabold text-[#0f2747]">{u?.display_name || "İsimsiz"}</p><p className="text-[10px] text-slate-400">{u?.email || a.user_id}</p></td><td className="px-4 py-4 text-sm font-extrabold text-[#0f2747]">{a.title}</td><td className="max-w-[420px] px-4 py-4 text-xs font-semibold text-slate-500">{a.detail}</td><td className="px-4 py-4">{a.points == null ? <span className="text-xs text-slate-400">-</span> : <span className={`rounded-lg px-2.5 py-1.5 text-xs font-black ${a.points > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{a.points > 0 ? "+" : ""}{a.points}</span>}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openActivityEdit(a)} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-extrabold text-white">✏ Düzenle</button><button type="button" onClick={() => deleteActivity(a)} className="rounded-lg bg-red-600 px-2.5 py-1.5 text-[10px] font-extrabold text-white">🗑 Sil</button></div></td></tr>; })}
                      {activities.filter((a) => activeSection === "activity" ? (activityFilter === "all" || a.type === activityFilter) : activeSection === "predictions" ? a.type === "prediction" : activeSection === "userBonus" ? a.type === "bonus" : activeSection === "userSurveys" ? a.type === "survey" : activeSection === "userWheel" ? a.type === "wheel" : a.type === "code").length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm font-bold text-slate-400">Henüz kayıt bulunmuyor.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === "users" && <section className="mt-5"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Kullanıcı Yönetimi</p><h2 className="mt-1 text-2xl font-extrabold text-[#0f2747]">Kullanıcılar</h2><p className="mt-1 text-sm text-slate-500">Kullanıcıların manuel puanlarını buradan ekleyebilir, silebilir veya tamamen sıfırlayabilirsin.</p></div><div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-left"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-xs font-extrabold text-slate-500">Kullanıcı</th><th className="px-4 py-3 text-xs font-extrabold text-slate-500">E-posta</th><th className="px-4 py-3 text-xs font-extrabold text-slate-500">Takım</th><th className="px-4 py-3 text-xs font-extrabold text-slate-500">Sıralama Puanı</th><th className="px-4 py-3 text-xs font-extrabold text-slate-500">Manuel Puan</th><th className="px-4 py-3 text-xs font-extrabold text-slate-500">Admin</th><th className="px-4 py-3 text-xs font-extrabold text-slate-500">İşlem</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => { const points = Number(manualPoints[user.id] || 0); return <tr key={user.id}><td className="px-4 py-4 text-sm font-bold text-[#0f2747]">{user.display_name || "İsimsiz"}</td><td className="px-4 py-4 text-sm text-slate-500">{user.email || "-"}</td><td className="px-4 py-4 text-sm text-slate-500">{user.favorite_team || "-"}</td><td className="px-4 py-4"><span className={`rounded-lg px-3 py-1.5 text-sm font-black ${(rankingPoints[user.id] || 0) >= 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>{(rankingPoints[user.id] || 0) > 0 ? "+" : ""}{rankingPoints[user.id] || 0}</span></td><td className="px-4 py-4"><span className={`rounded-lg px-3 py-1.5 text-sm font-black ${points >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{points > 0 ? "+" : ""}{points}</span></td><td className="px-4 py-4 text-sm">{user.is_admin ? <span className="rounded-md bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700">Admin</span> : <span className="text-slate-400">Kullanıcı</span>}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openRankingModal(user)} className="rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-extrabold text-white">🏆 Sıralama Puanı</button><button type="button" onClick={() => openPointModal(user)} className="rounded-xl bg-[#0f2747] px-3 py-2.5 text-xs font-extrabold text-white">⚙ Manuel Puan</button></div></td></tr>; })}</tbody></table>{users.length === 0 && <div className="p-10 text-center text-sm font-semibold text-slate-400">Henüz kullanıcı yok.</div>}</div></div></section>}

        {activeSection === "codes" && <section className="mt-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Ödül Yönetimi</p><h2 className="mt-1 text-2xl font-extrabold text-[#0f2747]">Bonus Kodları</h2></div><button type="button" onClick={openNewCode} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white">+ Yeni Kod</button></div><div className="mt-4 grid gap-3 md:grid-cols-2">{bonusCodes.length === 0 ? <Empty text="Henüz bonus kodu yok." /> : bonusCodes.map((code) => <div key={code.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xl font-black tracking-wider text-[#0f2747]">{code.code}</p><p className="mt-1 text-sm font-bold text-orange-600">+{code.points} puan</p><p className="mt-1 text-xs text-slate-400">Kullanım: {code.usage_count}</p></div><span className={`rounded-md px-2 py-1 text-[9px] font-bold ${code.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{code.is_active ? "Aktif" : "Pasif"}</span></div><button type="button" disabled={codeSavingId === code.id} onClick={() => toggleBonusCode(code)} className="mt-4 w-full rounded-xl bg-[#0f2747] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{codeSavingId === code.id ? "Kaydediliyor..." : code.is_active ? "Pasifleştir" : "Aktifleştir"}</button></div>)}</div></section>}

        {activeSection === "wheel" && (
          <section className="mt-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-pink-600">Ödül Yönetimi</p>
                  <h2 className="mt-1 text-2xl font-extrabold text-[#0f2747]">🎡 Ödül Çarkı</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Toplam 10 dilim vardır. 8 dilime 5–30 puan arasında ödül, 2 dilime ise boş sonuç verebilirsin.</p>
                </div>
                <div className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-pink-500">Dilim</p>
                  <p className="mt-1 text-xl font-black text-pink-700">10 / 10</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((slot) => {
                  const option = wheelOptions.find((item) => item.slot === slot);
                  const current = option?.points ?? null;
                  const saving = wheelSavingSlot === slot;

                  return (
                    <div key={slot} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-[#0f2747] px-2.5 py-1 text-[10px] font-black text-white">#{slot}</span>
                        <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${current === null ? "bg-slate-200 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
                          {current === null ? "BOŞ" : `+${current} PUAN`}
                        </span>
                      </div>

                      <select
                        value={current === null ? "empty" : String(current)}
                        disabled={saving}
                        onChange={(e) => {
                          const value = e.target.value === "empty" ? null : Number(e.target.value);
                          saveWheelSlot(slot, value);
                        }}
                        className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-extrabold text-slate-800 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 disabled:opacity-50"
                      >
                        <option value="empty">BOŞ</option>
                        {Array.from({ length: 26 }, (_, i) => i + 5).map((points) => (
                          <option key={points} value={points}>
                            +{points} puan
                          </option>
                        ))}
                      </select>

                      {saving && <p className="mt-2 text-[10px] font-bold text-pink-600">Kaydediliyor...</p>}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-extrabold text-blue-700">Nasıl çalışır?</p>
                <p className="mt-1 text-xs leading-5 text-blue-600">Kullanıcı çarkı çevirdiğinde aktif 10 dilimden biri rastgele seçilir. Seçilen dilim boşsa puan kazanılmaz. Puanlar sadece 5–30 arasında olabilir.</p>
              </div>
            </div>
          </section>
        )}

        {activeSection === "players" && <section className="mt-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-600">Oyuncu Yönetimi</p><h2 className="mt-1 text-2xl font-extrabold text-[#0f2747]">Oyuncular</h2><p className="mt-1 text-sm text-slate-500">Gol ve asist sayılarını istediğin zaman güncelleyebilirsin.</p></div><button type="button" onClick={openNewPlayer} className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-extrabold text-white">+ Oyuncu Ekle</button></div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{players.length === 0 ? <div className="sm:col-span-2 lg:col-span-3"><Empty text="Henüz oyuncu eklenmedi." /></div> : players.map((player) => <div key={player.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex gap-4 p-5"><div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">{player.photo_url ? <img src={getPlayerPhotoUrl(player.photo_url) || "/placeholder-player.png"} alt={player.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-3xl">👤</div>}</div><div className="min-w-0 flex-1"><h3 className="truncate text-lg font-extrabold text-[#0f2747]">{player.name}</h3><p className="mt-1 text-xs font-bold text-slate-400">{player.team ? `${player.team} • ` : ""}{player.jersey_number != null ? `#${player.jersey_number}` : "Forma yok"}{player.position ? ` • ${player.position}` : ""}</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-2"><p className="text-[9px] font-bold uppercase text-slate-400">Gol</p><p className="text-xl font-black text-emerald-600">{player.goals}</p></div><div className="rounded-xl bg-slate-50 p-2"><p className="text-[9px] font-bold uppercase text-slate-400">Asist</p><p className="text-xl font-black text-blue-600">{player.assists}</p></div></div></div></div><div className="flex gap-2 border-t border-slate-100 p-4"><button type="button" onClick={() => openEditPlayer(player)} className="flex-1 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white">Düzenle / İstatistik Güncelle</button><button type="button" onClick={() => deletePlayer(player)} className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white">Sil</button></div></div>)}</div></section>}
      </div>

      {lineupModal && (
        <Modal title={`Maç Kadrosu • ${lineupModal.home_team} - ${lineupModal.away_team}`} onClose={() => setLineupModal(null)}>
          <div className="space-y-5">
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
              <p className="text-sm font-extrabold text-cyan-800">Kadroyu belirle</p>
              <p className="mt-1 text-xs leading-5 text-cyan-700">Oyuncunun hangi takımda olduğunu ve İlk 11, Yedek veya Eksik durumunu seç. Eksik oyuncularda nedenini de yazabilirsin.</p>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {players.length === 0 ? (
                <Empty text="Önce Oyuncular bölümünden oyuncu eklemelisin." />
              ) : players.map((player) => {
                const row = lineupRows[player.id] || { team: "home" as const, status: "substitute" as const, absence_reason: "" };
                return (
                  <div key={player.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {player.photo_url ? <img src={getPlayerPhotoUrl(player.photo_url) || "/placeholder-player.png"} alt={player.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xl">👤</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-[#0f2747]">{player.name}</p>
                        <p className="mt-0.5 text-[10px] font-bold text-slate-400">{player.team || "Takım belirtilmemiş"}{player.jersey_number != null ? ` • #${player.jersey_number}` : ""}{player.position ? ` • ${player.position}` : ""}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <select value={row.team} onChange={(e) => updateLineupRow(player.id, { team: e.target.value as "home" | "away" })} className={inputClass}>
                        <option value="home">🏠 {lineupModal.home_team}</option>
                        <option value="away">✈️ {lineupModal.away_team}</option>
                      </select>
                      <select value={row.status} onChange={(e) => updateLineupRow(player.id, { status: e.target.value as "starting" | "substitute" | "absent" })} className={inputClass}>
                        <option value="starting">🟢 İlk 11</option>
                        <option value="substitute">🟡 Yedek</option>
                        <option value="absent">🔴 Eksik</option>
                      </select>
                    </div>

                    {row.status === "absent" && (
                      <input value={row.absence_reason} onChange={(e) => updateLineupRow(player.id, { absence_reason: e.target.value })} className={`${inputClass} mt-2`} placeholder="Eksiklik nedeni: Sakat, cezalı..." />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setLineupModal(null)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-600">İptal</button>
              <button type="button" disabled={lineupSaving} onClick={saveMatchLineups} className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50">{lineupSaving ? "Kaydediliyor..." : "Kadroyu Kaydet"}</button>
            </div>
          </div>
        </Modal>
      )}

      {matchModal && <Modal title={editingMatch ? "Maçı Düzenle" : "Yeni Maç"} onClose={() => setMatchModal(false)}><form onSubmit={saveMatch} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Lig"><input value={matchForm.league} onChange={(e) => setMatchForm((p) => ({ ...p, league: e.target.value }))} className={inputClass} placeholder="Premier League" /></Field><Field label="Yayıncı"><input value={matchForm.broadcaster} onChange={(e) => setMatchForm((p) => ({ ...p, broadcaster: e.target.value }))} className={inputClass} placeholder="beIN Sports" /></Field><Field label="Ev sahibi"><input required value={matchForm.home_team} onChange={(e) => setMatchForm((p) => ({ ...p, home_team: e.target.value }))} className={inputClass} /></Field><Field label="Deplasman"><input required value={matchForm.away_team} onChange={(e) => setMatchForm((p) => ({ ...p, away_team: e.target.value }))} className={inputClass} /></Field><Field label="Maç tarihi"><input type="date" value={matchForm.match_date} onChange={(e) => setMatchForm((p) => ({ ...p, match_date: e.target.value, kickoff: p.kickoff && p.kickoff.includes("T") ? `${e.target.value}T${p.kickoff.slice(11, 16)}` : "" }))} className={inputClass} /></Field><Field label="Saat (isteğe bağlı)"><input type="time" value={matchForm.kickoff ? matchForm.kickoff.slice(11, 16) : ""} onChange={(e) => setMatchForm((p) => ({ ...p, kickoff: e.target.value ? `${p.match_date}T${e.target.value}` : "" }))} className={inputClass} /></Field><Field label="Ev sahibi skor"><input type="number" min="0" value={matchForm.home_score} onChange={(e) => setMatchForm((p) => ({ ...p, home_score: e.target.value }))} className={inputClass} /></Field><Field label="Deplasman skor"><input type="number" min="0" value={matchForm.away_score} onChange={(e) => setMatchForm((p) => ({ ...p, away_score: e.target.value }))} className={inputClass} /></Field><div className="flex items-end"><label className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input type="checkbox" checked={matchForm.schedule_confirmed} onChange={(e) => setMatchForm((p) => ({ ...p, schedule_confirmed: e.target.checked }))} /> Fikstür kesinleşti</label></div></div><div className="grid gap-4 sm:grid-cols-2"><LogoUpload label="Ev sahibi logosu" value={matchForm.home_logo_url} uploading={uploadingLogo === "home"} onChange={(e) => uploadTeamLogo(e, "home")} /><LogoUpload label="Deplasman logosu" value={matchForm.away_logo_url} uploading={uploadingLogo === "away"} onChange={(e) => uploadTeamLogo(e, "away")} /></div><ModalButtons saving={saving} onCancel={() => setMatchModal(false)} submitText={editingMatch ? "Güncelle" : "Maçı Kaydet"} /></form></Modal>}

      {surveyModal && (
        <Modal title={editingSurvey ? "Anketi Düzenle" : "Yeni Anket"} onClose={() => setSurveyModal(false)}>
          <form onSubmit={saveSurvey} className="space-y-4">
            <Field label="Anket sorusu"><textarea required value={surveyForm.question} onChange={(e) => setSurveyForm((p) => ({ ...p, question: e.target.value }))} className={`${inputClass} min-h-24`} /></Field>
            <Field label="Seçenekler (her satıra bir seçenek)"><textarea required value={surveyForm.options} onChange={(e) => setSurveyForm((p) => ({ ...p, options: e.target.value }))} className={`${inputClass} min-h-28`} placeholder={'A\nB\nC\nD'} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Doğru cevap (istersen şimdi, istersen daha sonra)"><input value={surveyForm.correct_answer} onChange={(e) => setSurveyForm((p) => ({ ...p, correct_answer: e.target.value }))} className={inputClass} /></Field>
              <Field label="Puan"><input type="number" min="1" value={surveyForm.points} onChange={(e) => setSurveyForm((p) => ({ ...p, points: e.target.value }))} className={inputClass} /></Field>
            </div>
            <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={surveyForm.is_active} onChange={(e) => setSurveyForm((p) => ({ ...p, is_active: e.target.checked }))} /> Aktif</label>
            <ModalButtons saving={saving} onCancel={() => setSurveyModal(false)} submitText={editingSurvey ? "Güncelle" : "Anketi Kaydet"} />
          </form>
        </Modal>
      )}

      {bonusModal && <Modal title={editingBonus ? "Bonus Sorusunu Düzenle" : "Yeni Bonus Sorusu"} onClose={() => setBonusModal(false)}><form onSubmit={saveBonus} className="space-y-4"><Field label="Soru"><textarea required value={bonusForm.question} onChange={(e) => setBonusForm((p) => ({ ...p, question: e.target.value }))} className={`${inputClass} min-h-24`} /></Field><Field label="Seçenekler (her satıra bir seçenek)"><textarea value={bonusForm.options} onChange={(e) => setBonusForm((p) => ({ ...p, options: e.target.value }))} className={`${inputClass} min-h-28`} placeholder={'A\nB\nC\nD'} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Doğru cevap (istersen şimdi, istersen maç sonu)"><input value={bonusForm.correct_answer} onChange={(e) => setBonusForm((p) => ({ ...p, correct_answer: e.target.value }))} className={inputClass} /></Field><Field label="Puan"><input type="number" min="0" value={bonusForm.points} onChange={(e) => setBonusForm((p) => ({ ...p, points: e.target.value }))} className={inputClass} /></Field></div><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={bonusForm.is_active} onChange={(e) => setBonusForm((p) => ({ ...p, is_active: e.target.checked }))} /> Aktif</label><ModalButtons saving={saving} onCancel={() => setBonusModal(false)} submitText={editingBonus ? "Güncelle" : "Soruyu Kaydet"} /></form></Modal>}

      {rankingModalUser && <Modal title={`${rankingModalUser.display_name || "Kullanıcı"} — Sıralama Puanı`} onClose={() => setRankingModalUser(null)}><div className="space-y-4"><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-blue-500">Mevcut sıralama puanı</p><p className="mt-1 text-3xl font-black text-[#0f2747]">{rankingPoints[rankingModalUser.id] || 0}</p><p className="mt-1 text-xs font-semibold text-blue-600">Bu değer maç + bonus + anket + çark + kod + admin düzeltmelerinin toplamıdır.</p></div><Field label="Puan"><input type="number" min="1" step="1" value={rankingForm.points} onChange={(e) => setRankingForm((p) => ({ ...p, points: e.target.value }))} className={inputClass} placeholder="Örn. 50" /></Field><Field label="İşlem nedeni"><input value={rankingForm.reason} onChange={(e) => setRankingForm((p) => ({ ...p, reason: e.target.value }))} className={inputClass} placeholder="Ödül, düzeltme, ceza..." /></Field><div className="grid gap-2 sm:grid-cols-3"><button type="button" disabled={rankingSaving} onClick={() => applyRankingAdjustment("add")} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">➕ Puan Ekle</button><button type="button" disabled={rankingSaving} onClick={() => applyRankingAdjustment("remove")} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">➖ Puan Azalt</button><button type="button" disabled={rankingSaving} onClick={() => applyRankingAdjustment("reset")} className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">🔄 Sıfırla</button></div><p className="text-[11px] font-semibold text-slate-400">Sıfırlama geçmiş kayıtları silmez; mevcut toplamı 0'a getiren admin düzeltmesi oluşturur.</p></div></Modal>}

      {activityEdit && <Modal title={`${activityEdit.title} — Düzenle`} onClose={() => setActivityEdit(null)}><div className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">Kullanıcı</p><p className="mt-1 font-extrabold text-[#0f2747]">{users.find((u) => u.id === activityEdit.user_id)?.display_name || "İsimsiz"}</p><p className="mt-1 text-xs text-slate-500">{activityEdit.detail}</p></div>{activityEdit.type === "prediction" ? <div className="grid gap-3 sm:grid-cols-2"><Field label="Ev sahibi skoru"><input type="number" min="0" value={activityForm.home_score} onChange={(e) => setActivityForm((p) => ({ ...p, home_score: e.target.value }))} className={inputClass} /></Field><Field label="Deplasman skoru"><input type="number" min="0" value={activityForm.away_score} onChange={(e) => setActivityForm((p) => ({ ...p, away_score: e.target.value }))} className={inputClass} /></Field></div> : activityEdit.type !== "wheel" && activityEdit.type !== "code" ? <Field label="Cevap"><input value={activityForm.answer} onChange={(e) => setActivityForm((p) => ({ ...p, answer: e.target.value }))} className={inputClass} /></Field> : null}<Field label="Puan"><input type="number" step="1" value={activityForm.points} onChange={(e) => setActivityForm((p) => ({ ...p, points: e.target.value }))} className={inputClass} /></Field><div className="flex gap-2"><button type="button" disabled={activitySaving} onClick={saveActivityEdit} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">{activitySaving ? "Kaydediliyor..." : "Kaydet"}</button><button type="button" onClick={() => setActivityEdit(null)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-600">İptal</button></div></div></Modal>}

      {pointModalUser && <Modal title={`${pointModalUser.display_name || "Kullanıcı"} — Puan Yönetimi`} onClose={() => setPointModalUser(null)}><div className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Kullanıcı</p><p className="mt-1 text-lg font-extrabold text-[#0f2747]">{pointModalUser.display_name || "İsimsiz"}</p><p className="text-xs text-slate-500">{pointModalUser.email || "-"}</p><p className="mt-3 text-sm font-bold text-slate-600">Mevcut manuel puan: <span className="text-[#0f2747]">{manualPoints[pointModalUser.id] || 0}</span></p></div><Field label="Puan"><input type="number" min="1" step="1" value={pointForm.points} onChange={(e) => setPointForm((p) => ({ ...p, points: e.target.value }))} className={inputClass} placeholder="Örn. 50" /></Field><Field label="İşlem nedeni"><input value={pointForm.reason} onChange={(e) => setPointForm((p) => ({ ...p, reason: e.target.value }))} className={inputClass} placeholder="Ödül, düzeltme, etkinlik..." /></Field><div className="grid gap-2 sm:grid-cols-3"><button type="button" disabled={pointSaving} onClick={() => applyUserPoints("add")} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">➕ Puan Ekle</button><button type="button" disabled={pointSaving} onClick={() => applyUserPoints("remove")} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">➖ Puan Sil</button><button type="button" disabled={pointSaving} onClick={() => applyUserPoints("reset")} className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">🔄 Sıfırla</button></div><p className="text-[11px] font-semibold text-slate-400">Not: Bu işlemler manuel puanı değiştirir; maç tahminlerinden kazanılan puanları silmez.</p></div></Modal>}

      {codeModal && <Modal title="Yeni Bonus Kodu" onClose={() => setCodeModal(false)}><form onSubmit={saveBonusCode} className="space-y-4"><Field label="Kod"><input required value={codeForm.code} onChange={(e) => setCodeForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} className={inputClass} placeholder="FUTBOL10" /></Field><Field label="Puan"><input type="number" min="0" value={codeForm.points} onChange={(e) => setCodeForm((p) => ({ ...p, points: e.target.value }))} className={inputClass} /></Field><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={codeForm.is_active} onChange={(e) => setCodeForm((p) => ({ ...p, is_active: e.target.checked }))} /> Aktif</label><ModalButtons saving={saving} onCancel={() => setCodeModal(false)} submitText="Bonus Kodunu Kaydet" /></form></Modal>}

      {playerModal && <Modal title={editingPlayer ? "Oyuncuyu Düzenle" : "Oyuncu Ekle"} onClose={() => setPlayerModal(false)}><form onSubmit={savePlayer} className="space-y-4"><Field label="Oyuncu adı"><input required value={playerForm.name} onChange={(e) => setPlayerForm((p) => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="Kylian Mbappé" /></Field><Field label="Takım"><input value={playerForm.team} onChange={(e) => setPlayerForm((p) => ({ ...p, team: e.target.value }))} className={inputClass} placeholder="Real Madrid" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Forma numarası"><input type="number" min="0" max="99" value={playerForm.jersey_number} onChange={(e) => setPlayerForm((p) => ({ ...p, jersey_number: e.target.value }))} className={inputClass} placeholder="9" /></Field><Field label="Mevki"><select value={playerForm.position} onChange={(e) => setPlayerForm((p) => ({ ...p, position: e.target.value }))} className={inputClass}><option value="">Seçiniz</option><option value="Kaleci">Kaleci</option><option value="Defans">Defans</option><option value="Orta Saha">Orta Saha</option><option value="Kanat">Kanat</option><option value="Forvet">Forvet</option></select></Field><Field label="Gol"><input type="number" min="0" value={playerForm.goals} onChange={(e) => setPlayerForm((p) => ({ ...p, goals: e.target.value }))} className={inputClass} /></Field><Field label="Asist"><input type="number" min="0" value={playerForm.assists} onChange={(e) => setPlayerForm((p) => ({ ...p, assists: e.target.value }))} className={inputClass} /></Field></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="mb-2 text-xs font-extrabold text-slate-500">Oyuncu fotoğrafı</p>{playerForm.photo_url && <img src={playerForm.photo_url} alt="Oyuncu" className="mb-3 h-28 w-28 rounded-2xl object-cover" />}<input type="file" accept="image/*" onChange={uploadPlayerPhoto} className="block w-full text-sm" />{uploadingPlayerPhoto && <p className="mt-2 text-xs font-bold text-blue-600">Fotoğraf yükleniyor...</p>}<p className="mt-2 text-[11px] text-slate-400">İstersen fotoğraf URL'sini de aşağıdaki alana yapıştırabilirsin.</p><input value={playerForm.photo_url} onChange={(e) => setPlayerForm((p) => ({ ...p, photo_url: e.target.value }))} className={`${inputClass} mt-2`} placeholder="https://..." /></div><ModalButtons saving={saving} onCancel={() => setPlayerModal(false)} submitText={editingPlayer ? "Güncelle" : "Oyuncuyu Kaydet"} /></form></Modal>}
    </main>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><p className="text-sm font-semibold text-slate-400">{text}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-extrabold text-slate-500">{label}</span>{children}</label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4"><h2 className="text-xl font-extrabold text-[#0f2747]">{title}</h2><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">✕</button></div><div className="p-5 sm:p-6">{children}</div></div></div>;
}

function ModalButtons({ saving, onCancel, submitText }: { saving: boolean; onCancel: () => void; submitText: string }) {
  return <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600">İptal</button><button type="submit" disabled={saving} className="rounded-xl bg-[#0f2747] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50">{saving ? "Kaydediliyor..." : submitText}</button></div>;
}

function LogoUpload({ label, value, uploading, onChange }: { label: string; value: string; uploading: boolean; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="mb-2 text-xs font-extrabold text-slate-500">{label}</p>{value && <img src={value} alt="Logo" className="mb-3 h-16 w-16 rounded-xl object-contain bg-white" />}<input type="file" accept="image/*" onChange={onChange} className="block w-full text-xs" />{uploading && <p className="mt-2 text-xs font-bold text-blue-600">Yükleniyor...</p>}</div>;
}




