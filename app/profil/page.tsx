"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProfilPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const userResult = await supabase.auth.getUser();

    if (!userResult.data.user) {
      window.location.href = "/login";
      return;
    }

    const user = userResult.data.user;

    setEmail(user.email || "");

    const profileResult = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    if (profileResult.error) {
      console.log(profileResult.error);
    }

    if (profileResult.data) {
      setDisplayName(
        profileResult.data.display_name || ""
      );
    }

    setLoading(false);
  }

  async function saveProfile() {
    const newName = displayName.trim();

    setMessage("");
    setMessageType("");

    if (newName === "") {
      setMessage("Kullanıcı adı boş bırakılamaz.");
      setMessageType("error");
      return;
    }

    if (newName.length < 3) {
      setMessage("Kullanıcı adı en az 3 karakter olmalı.");
      setMessageType("error");
      return;
    }

    if (newName.length > 20) {
      setMessage("Kullanıcı adı en fazla 20 karakter olabilir.");
      setMessageType("error");
      return;
    }

    setSaving(true);

    const userResult = await supabase.auth.getUser();

    if (!userResult.data.user) {
      window.location.href = "/login";
      return;
    }

    const userId = userResult.data.user.id;

    const result = await supabase
      .from("profiles")
      .update({
        display_name: newName,
      })
      .eq("id", userId)
      .select("display_name")
      .single();

    if (result.error) {
      console.log(result.error);

      setSaving(false);
      setMessage(
        "Kaydetme hatası: " + result.error.message
      );
      setMessageType("error");
      return;
    }

    setDisplayName(result.data.display_name);

    setSaving(false);
    setMessage("Kullanıcı adın başarıyla güncellendi!");
    setMessageType("success");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-3xl px-5 py-10">
          <div className="animate-pulse rounded-3xl bg-white p-8 shadow-sm">
            <div className="h-8 w-40 rounded-lg bg-slate-200" />
            <div className="mt-6 h-14 rounded-xl bg-slate-100" />
            <div className="mt-4 h-14 rounded-xl bg-slate-100" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
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

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
          >
            ← Ana Sayfa
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8 md:py-10">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 p-7 text-white shadow-2xl shadow-blue-200 md:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl backdrop-blur">
              👤
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
              Profilim
            </h1>

            <p className="mt-2 text-sm text-blue-100 md:text-base">
              Hesap bilgilerini ve kullanıcı adını buradan yönet.
            </p>
          </div>
        </section>

        {/* PROFILE CARD */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* ACCOUNT */}
          <div className="border-b border-slate-100 p-6 md:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
                ✉️
              </div>

              <div>
                <h2 className="font-black text-slate-950">
                  Hesap Bilgileri
                </h2>

                <p className="text-xs text-slate-400">
                  Hesabına ait temel bilgiler
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                E-posta
              </label>

              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-lg">📧</span>

                <p className="min-w-0 truncate text-sm font-semibold text-slate-700">
                  {email}
                </p>

                <span className="ml-auto shrink-0 rounded-full bg-slate-200 px-3 py-1 text-[10px] font-black text-slate-500">
                  HESAP
                </span>
              </div>
            </div>
          </div>

          {/* USERNAME */}
          <div className="p-6 md:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
                ✏️
              </div>

              <div>
                <h2 className="font-black text-slate-950">
                  Kullanıcı Adı
                </h2>

                <p className="text-xs text-slate-400">
                  Sıralamada ve uygulamada görünecek adın
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label
                htmlFor="displayName"
                className="text-xs font-black uppercase tracking-wider text-slate-400"
              >
                Kullanıcı adın
              </label>

              <div className="relative mt-2">
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  maxLength={20}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setMessage("");
                    setMessageType("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !saving) {
                      saveProfile();
                    }
                  }}
                  placeholder="Kullanıcı adını yaz"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 pr-16 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300">
                  {displayName.length}/20
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  3-20 karakter arasında olmalıdır.
                </p>

                {displayName.trim().length >= 3 && (
                  <span className="text-xs font-bold text-emerald-500">
                    ✓ Uygun
                  </span>
                )}
              </div>
            </div>

            {/* MESSAGE */}
            {message !== "" && (
              <div
                className={
                  "mt-5 rounded-2xl border p-4 text-sm font-semibold " +
                  (messageType === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-600")
                }
              >
                {messageType === "success" ? "✓ " : "⚠️ "}
                {message}
              </div>
            )}

            {/* SAVE */}
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 p-4 font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {saving ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Kaydediliyor...
                </>
              ) : (
                <>💾 Kullanıcı Adını Kaydet</>
              )}
            </button>
          </div>
        </section>

        {/* INFO */}
        <section className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex gap-3">
            <div className="text-xl">💡</div>

            <div>
              <p className="font-black text-blue-900">
                Kullanıcı adın nerelerde görünür?
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-700">
                Kullanıcı adın sıralama tablosunda, profilinde ve
                tahmin uygulamasındaki oyuncu bilgilerinde kullanılır.
              </p>
            </div>
          </div>
        </section>

        {/* BACK */}
        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
          className="mt-6 w-full rounded-2xl border border-slate-200 bg-white p-4 font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
        >
          ← Ana Sayfaya Dön
        </button>

        <footer className="py-8 text-center">
          <p className="font-black text-slate-800">
            ⚽ FUTBOL TAHMİN
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Tahmin et • Puan kazan • Sıralamada yüksel
          </p>
        </footer>
      </div>
    </main>
  );
}