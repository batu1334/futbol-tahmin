"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function PasswordResetPage() {
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordAgain, setShowPasswordAgain] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkRecoverySession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session) {
        setChecking(false);
        return;
      }

      setMessage(
        "Şifre yenileme bağlantısı geçersiz veya süresi dolmuş. Lütfen tekrar şifre yenileme maili iste."
      );

      setChecking(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (
          event === "PASSWORD_RECOVERY" &&
          session
        ) {
          setChecking(false);
        }
      }
    );

    checkRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    if (password.length < 6) {
      setMessage(
        "Yeni şifre en az 6 karakter olmalıdır."
      );
      return;
    }

    if (password !== passwordAgain) {
      setMessage("Şifreler aynı değil.");
      return;
    }

    setLoading(true);

    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    setLoading(false);

    if (error) {
      setMessage(
        "Şifre değiştirilemedi: " +
          error.message
      );
      return;
    }

    setSuccess(true);
    setMessage(
      "Şifren başarıyla değiştirildi. Artık yeni şifrenle giriş yapabilirsin."
    );

    setPassword("");
    setPasswordAgain("");

    await supabase.auth.signOut();

    setTimeout(() => {
      window.location.replace("/login");
    }, 2000);
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

          <p className="mt-5 font-black text-slate-700">
            Şifre yenileme bağlantısı kontrol ediliyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-md">

        {/* LOGO */}
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-blue-900 text-4xl text-white shadow-xl shadow-blue-200">
            🔐
          </div>

          <h1 className="mt-5 text-3xl font-black text-slate-900">
            Yeni Şifre Belirle
          </h1>

          <p className="mt-2 font-semibold text-slate-500">
            Hesabın için yeni bir şifre oluştur
          </p>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100 sm:p-8">

          {!success ? (
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* BİLGİ */}
              <div className="rounded-2xl bg-blue-50 p-5">
                <p className="text-center text-sm font-semibold leading-6 text-blue-800">
                  Yeni şifreni aşağıdaki alanlara
                  girerek hesabını güncelleyebilirsin.
                </p>
              </div>

              {/* YENİ ŞİFRE */}
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Yeni Şifre
                </label>

                <div className="relative">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="En az 6 karakter"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pr-20 font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-2 text-xs font-black text-blue-600 hover:bg-blue-50"
                  >
                    {showPassword
                      ? "Gizle"
                      : "Göster"}
                  </button>
                </div>

                <p className="mt-2 text-xs font-semibold text-slate-400">
                  En az 6 karakter kullanmalısın.
                </p>
              </div>

              {/* ŞİFRE TEKRAR */}
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Yeni Şifre Tekrar
                </label>

                <div className="relative">
                  <input
                    type={
                      showPasswordAgain
                        ? "text"
                        : "password"
                    }
                    value={passwordAgain}
                    onChange={(event) =>
                      setPasswordAgain(
                        event.target.value
                      )
                    }
                    placeholder="Yeni şifreni tekrar gir"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pr-20 font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswordAgain(
                        (value) => !value
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-2 text-xs font-black text-blue-600 hover:bg-blue-50"
                  >
                    {showPasswordAgain
                      ? "Gizle"
                      : "Göster"}
                  </button>
                </div>
              </div>

              {/* MESAJ */}
              {message && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-800">
                  {message}
                </div>
              )}

              {/* ŞİFREYİ DEĞİŞTİR */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-4 font-black text-white shadow-lg shadow-blue-200 transition hover:from-blue-500 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Şifre değiştiriliyor..."
                  : "Şifremi Değiştir"}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                ✅
              </div>

              <h2 className="mt-5 text-2xl font-black text-slate-900">
                Şifren Değiştirildi!
              </h2>

              <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                Yeni şifren başarıyla kaydedildi.
                Giriş sayfasına yönlendiriliyorsun...
              </p>
            </div>
          )}

          {!success && (
            <button
              type="button"
              onClick={() =>
                window.location.replace("/login")
              }
              className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-600 transition hover:bg-slate-50"
            >
              ← Giriş Sayfasına Dön
            </button>
          )}
        </div>
      </div>
    </main>
  );
}