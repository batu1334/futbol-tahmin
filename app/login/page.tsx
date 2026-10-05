"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [forgotPassword, setForgotPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session && !forgotPassword) {
        window.location.replace("/");
        return;
      }

      setChecking(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (
          session &&
          event !== "PASSWORD_RECOVERY" &&
          !forgotPassword
        ) {
          window.location.replace("/");
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [forgotPassword]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanNickname = nickname.trim();

    if (!cleanEmail || !password) {
      setMessage("E-posta ve şifre zorunludur.");
      return;
    }

    if (isRegister && !cleanNickname) {
      setMessage("Lakap zorunludur. Lütfen bir lakap yaz.");
      return;
    }

    if (isRegister && cleanNickname.length < 2) {
      setMessage("Lakap en az 2 karakter olmalıdır.");
      return;
    }

    if (cleanNickname.length > 30) {
      setMessage("Lakap en fazla 30 karakter olabilir.");
      return;
    }

    if (password.length < 6) {
      setMessage("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setLoading(true);

    if (isRegister) {
      const result = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: cleanNickname,
          },
        },
      });

      if (result.error) {
        setLoading(false);
        setMessage(
          "Kayıt oluşturulamadı: " +
            result.error.message
        );
        return;
      }

      if (!result.data.session) {
        setLoading(false);
        setMessage(
          "Kayıt başarılı. E-posta adresini doğrula ve ardından giriş yap."
        );
        return;
      }

      window.location.replace("/");
      return;
    }

    const result =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (result.error) {
      setLoading(false);
      setMessage(
        "E-posta veya şifre hatalı. Lütfen tekrar dene."
      );
      return;
    }

    window.location.replace("/");
  };

  const handleForgotPassword = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage("Lütfen e-posta adresini gir.");
      return;
    }

    setLoading(true);

    const redirectUrl =
      `${window.location.origin}/sifre-yenile`;

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: redirectUrl,
        }
      );

    setLoading(false);

    if (error) {
      setMessage(
        "Şifre yenileme maili gönderilemedi: " +
          error.message
      );
      return;
    }

    setMessage(
      "Şifre yenileme bağlantısı e-posta adresine gönderildi. Mail kutunu ve spam klasörünü kontrol et."
    );
  };

  const switchMode = (register: boolean) => {
    setIsRegister(register);
    setForgotPassword(false);
    setMessage("");

    if (!register) {
      setNickname("");
    }
  };

  const openForgotPassword = () => {
    setForgotPassword(true);
    setIsRegister(false);
    setPassword("");
    setMessage("");
  };

  const backToLogin = () => {
    setForgotPassword(false);
    setMessage("");
    setPassword("");
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

          <p className="mt-5 font-black text-slate-700">
            Kontrol ediliyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-md">

        {/* ÜST LOGO VE BAŞLIK */}
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-blue-900 text-4xl text-white shadow-xl shadow-blue-200">
            ⚽
          </div>

          <h1 className="mt-5 text-3xl font-black text-slate-900">
            Futbol Tahmin
          </h1>

          <p className="mt-2 font-semibold text-slate-500">
            {forgotPassword
              ? "Şifreni yenile"
              : isRegister
                ? "Yeni hesabını oluştur"
                : "Hesabına giriş yap"}
          </p>
        </div>

        {/* KAYIT TANITIMI */}
        {isRegister && !forgotPassword && (
          <div className="mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 p-6 text-center shadow-xl shadow-blue-100">
            <div className="mb-3 text-3xl">
              ⚽🏆
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Futbol Tahmin Uygulaması
            </h2>

            <p className="mt-4 text-sm font-semibold leading-6 text-blue-50 sm:text-base">
              Avrupa Futbolunun Kalbindeki Maçların
              <br />
              Skorlarını Doğru Tahmin Et,
              <br />
              Puanları Topla, Sıralama&apos;da Yüksel!
            </p>

            <div className="mx-auto my-4 h-px w-24 bg-white/30" />

            <p className="text-base font-black italic text-white sm:text-lg">
              Sende Bu Rekabetin İçerisinde Ol :)
            </p>
          </div>
        )}

        <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100 sm:p-8">

          {/* ŞİFRE UNUTULDU */}
          {forgotPassword ? (
            <>
              <div className="mb-6 rounded-2xl bg-blue-50 p-5 text-center">
                <div className="text-4xl">
                  🔐
                </div>

                <h2 className="mt-3 text-xl font-black text-slate-900">
                  Şifremi Unuttum
                </h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Hesabına kayıtlı e-posta adresini
                  gir. Şifreni yenileyebilmen için
                  sana bir bağlantı göndereceğiz.
                </p>
              </div>

              <form
                onSubmit={handleForgotPassword}
                className="space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    E-posta
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="ornek@mail.com"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {message && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-800">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-4 font-black text-white shadow-lg shadow-blue-200 transition hover:from-blue-500 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Mail gönderiliyor..."
                    : "Şifre Yenileme Maili Gönder"}
                </button>

                <button
                  type="button"
                  onClick={backToLogin}
                  className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-600 transition hover:bg-slate-50"
                >
                  ← Giriş Yap
                </button>
              </form>
            </>
          ) : (
            <>
              {/* GİRİŞ / KAYIT SEKMELERİ */}
              <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => switchMode(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                    !isRegister
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Giriş Yap
                </button>

                <button
                  type="button"
                  onClick={() => switchMode(true)}
                  className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                    isRegister
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Kayıt Ol
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* LAKAP */}
                {isRegister && (
                  <div>
                    <label className="mb-2 block text-sm font-black text-slate-700">
                      Lakap
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <input
                      type="text"
                      value={nickname}
                      onChange={(event) =>
                        setNickname(event.target.value)
                      }
                      placeholder="Örn: KralBatuhan"
                      maxLength={30}
                      autoComplete="nickname"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />

                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      2-30 karakter arasında olmalıdır.
                    </p>
                  </div>
                )}

                {/* E-POSTA */}
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    E-posta
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="ornek@mail.com"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {/* ŞİFRE */}
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Şifre
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
                      autoComplete={
                        isRegister
                          ? "new-password"
                          : "current-password"
                      }
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
                </div>

                {/* ŞİFREMİ UNUTTUM */}
                {!isRegister && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="text-sm font-black text-blue-600 transition hover:text-blue-800 hover:underline"
                    >
                      Şifremi Unuttum?
                    </button>
                  </div>
                )}

                {/* MESAJ */}
                {message && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-800">
                    {message}
                  </div>
                )}

                {/* GÖNDER */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-4 font-black text-white shadow-lg shadow-blue-200 transition hover:from-blue-500 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Lütfen bekle..."
                    : isRegister
                      ? "Kayıt Ol"
                      : "Giriş Yap"}
                </button>
              </form>

              <button
                type="button"
                onClick={() =>
                  (window.location.href = "/")
                }
                className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-600 transition hover:bg-slate-50"
              >
                ← Ana Sayfaya Dön
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}