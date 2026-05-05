"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TencentCaptchaWidget } from "@/components/shared/tencent-captcha-widget";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import type { TencentCaptchaChallengePayload } from "@/types/tencent-captcha";
import {
  checkRegistrationEmailExists,
  completeRegistration,
  login,
  loginWithGoogle,
  sendRegistrationOtp,
  verifyRegistrationOtp,
} from "@/lib/services";
import { useAuthStore } from "@/store/auth-store";

interface AuthFormProps {
  locale: Locale;
  mode: "login" | "register";
}

type LoginFormValues = {
  email: string;
  password: string;
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path
        d="M21.8 12.23c0-.72-.06-1.25-.2-1.8H12.2v3.41h5.52c-.11.85-.69 2.14-1.98 3l-.02.11 2.79 2.12.19.02c1.74-1.57 2.9-3.89 2.9-6.86Z"
        fill="#4285F4"
      />
      <path
        d="M12.2 21.9c2.7 0 4.96-.87 6.61-2.36l-3.15-2.25c-.84.58-1.97.98-3.46.98-2.65 0-4.89-1.72-5.69-4.09l-.11.01-2.9 2.2-.04.1c1.64 3.18 5 5.41 8.74 5.41Z"
        fill="#34A853"
      />
      <path
        d="M6.51 14.18a5.8 5.8 0 0 1-.33-1.91c0-.66.12-1.3.31-1.91l-.01-.13-2.94-2.23-.1.04A9.77 9.77 0 0 0 2.4 12.27c0 1.42.35 2.77.98 3.98l3.13-2.07Z"
        fill="#FBBC05"
      />
      <path
        d="M12.2 6.27c1.88 0 3.15.8 3.87 1.46l2.83-2.7C17.14 3.43 14.9 2.64 12.2 2.64c-3.74 0-7.1 2.23-8.74 5.41l3.05 2.31c.82-2.37 3.06-4.09 5.69-4.09Z"
        fill="#EB4335"
      />
    </svg>
  );
}

function getRegisterFlowCopy(locale: Locale) {
  if (locale === "zh-Hant") {
    return {
      emailTitle: "先驗證你的工作信箱",
      emailHint: "先輸入信箱，我們會寄一組驗證碼給你。",
      codeTitle: "輸入信箱驗證碼",
      codeHint: "驗證碼已寄到你的信箱，驗證通過後再設定密碼。",
      passwordTitle: "最後設定登入密碼",
      passwordHint: "完成密碼設定後，你的帳號就會建立完成。",
      sendCode: "發送驗證碼",
      resendCode: "重新發送",
      verifyCode: "驗證信箱",
      createAccount: "建立帳號",
      changeEmail: "更換信箱",
      codeSent: "驗證碼已寄出，請檢查你的信箱。",
      codeVerified: "信箱已驗證完成，現在可以設定密碼了。",
      emailRequired: "請先輸入信箱。",
      codeRequired: "請輸入驗證碼。",
      passwordRequired: "請設定密碼。",
      passwordMismatch: "兩次輸入的密碼不一致。",
      passwordReuse: "請設定一組新的密碼，不要與目前密碼相同。",
      codeLabel: "驗證碼",
      emailAlreadyRegistered: "這個信箱已經註冊過了，請直接登入或使用忘記密碼。",
    };
  }

  if (locale === "zh-Hans") {
    return {
      emailTitle: "先验证你的工作邮箱",
      emailHint: "先输入邮箱，我们会寄一组验证码给你。",
      codeTitle: "输入邮箱验证码",
      codeHint: "验证码已发送到你的邮箱，验证通过后再设置密码。",
      passwordTitle: "最后设置登录密码",
      passwordHint: "完成密码设置后，你的账号就会创建完成。",
      sendCode: "发送验证码",
      resendCode: "重新发送",
      verifyCode: "验证邮箱",
      createAccount: "创建账号",
      changeEmail: "更换邮箱",
      codeSent: "验证码已发送，请检查你的邮箱。",
      codeVerified: "邮箱已验证完成，现在可以设置密码了。",
      emailRequired: "请先输入邮箱。",
      codeRequired: "请输入验证码。",
      passwordRequired: "请设置密码。",
      passwordMismatch: "两次输入的密码不一致。",
      passwordReuse: "请设置一组新的密码，不要与当前密码相同。",
      codeLabel: "验证码",
      emailAlreadyRegistered: "这个邮箱已经注册过了，请直接登录或使用忘记密码。",
    };
  }

  return {
    emailTitle: "Verify your work email first",
    emailHint: "Start with your email address. We will send you a verification code.",
    codeTitle: "Enter the verification code from your email",
    codeHint: "Check your inbox, then verify your email before setting a password.",
    passwordTitle: "Set your password to finish",
    passwordHint: "Once your password is ready, your account can go live.",
    sendCode: "Send code",
    resendCode: "Resend code",
    verifyCode: "Verify email",
    createAccount: "Create account",
    changeEmail: "Use another email",
    codeSent: "Your verification code is on the way. Check your inbox.",
    codeVerified: "Email verified. You can set your password now.",
    emailRequired: "Enter your email first.",
    codeRequired: "Enter the verification code.",
    passwordRequired: "Set your password first.",
    passwordMismatch: "Passwords do not match.",
    passwordReuse: "Choose a new password instead of reusing the current one.",
    codeLabel: "Verification code",
    emailAlreadyRegistered: "This email is already registered. Please log in or reset your password.",
  };
}

export function AuthForm({ locale, mode }: AuthFormProps) {
  const t = getMessages(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams?.get("next") ?? "";
  const safeNextPath = nextPath.startsWith("/") ? nextPath : withLocale(locale, "/dashboard");
  const loginHref = `${withLocale(locale, "/login")}?next=${encodeURIComponent(safeNextPath)}`;
  const registerHref = `${withLocale(locale, "/register")}?next=${encodeURIComponent(safeNextPath)}`;
  const forgotPasswordHref = `${withLocale(locale, "/forgot-password")}?next=${encodeURIComponent(safeNextPath)}`;
  const externalAuthError = searchParams?.get("authError") ?? "";
  const authNotice = searchParams?.get("authNotice") ?? "";
  const setSession = useAuthStore((state) => state.setSession);
  const [submitError, setSubmitError] = useState("");
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [registerStage, setRegisterStage] = useState<"email" | "code" | "password">("email");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerAgreeTerms, setRegisterAgreeTerms] = useState(false);
  const [registerNotice, setRegisterNotice] = useState("");
  const [registerBusy, setRegisterBusy] = useState<"send" | "verify" | "create" | null>(null);
  const [registerExistingEmail, setRegisterExistingEmail] = useState(false);
  const [loginCaptcha, setLoginCaptcha] = useState<TencentCaptchaChallengePayload | null>(null);
  const [loginCaptchaKey, setLoginCaptchaKey] = useState(0);
  const [registerCaptcha, setRegisterCaptcha] = useState<TencentCaptchaChallengePayload | null>(null);
  const [registerCaptchaKey, setRegisterCaptchaKey] = useState(0);
  const captchaAppId = process.env.NEXT_PUBLIC_TENCENT_CAPTCHA_APP_ID?.trim() || null;
  const copy = getRegisterFlowCopy(locale);

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email("Please enter a valid email."),
        password: z.string().min(6, "Password must be at least 6 characters."),
      }),
    [],
  );

  const {
    register: registerLoginField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema) as never,
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const captchaVerifyError =
    locale === "zh-Hant" ? "請先完成驗證。" : locale === "zh-Hans" ? "请先完成验证。" : "Please complete the verification first.";

  const onLoginSubmit = async (values: LoginFormValues) => {
    setSubmitError("");

    if (captchaAppId && !loginCaptcha) {
      setSubmitError(captchaVerifyError);
      return;
    }

    try {
      const result = await login({ email: values.email, password: values.password, locale, captcha: loginCaptcha });
      setSession(result);
      router.push(safeNextPath);
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      // Reset captcha so user must re-verify before retrying
      if (captchaAppId) {
        setLoginCaptcha(null);
        setLoginCaptchaKey((k) => k + 1);
      }
    }
  };

  async function handleSendRegistrationCode() {
    setSubmitError("");
    setRegisterNotice("");
    setRegisterExistingEmail(false);

    if (!registerEmail.trim()) {
      setSubmitError(copy.emailRequired);
      return;
    }

    setRegisterBusy("send");

    try {
      const normalizedEmail = registerEmail.trim().toLowerCase();
      const { exists } = await checkRegistrationEmailExists({ email: normalizedEmail });

      if (exists) {
        setRegisterExistingEmail(true);
        setSubmitError(copy.emailAlreadyRegistered);
        return;
      }

      if (captchaAppId && !registerCaptcha) {
        setSubmitError(captchaVerifyError);
        return;
      }

      await sendRegistrationOtp({ email: normalizedEmail, locale, captcha: registerCaptcha });
      setRegisterStage("code");
      setRegisterNotice(copy.codeSent);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      if (captchaAppId) {
        setRegisterCaptcha(null);
        setRegisterCaptchaKey((k) => k + 1);
      }
    } finally {
      setRegisterBusy(null);
    }
  }

  async function handleVerifyRegistrationCode() {
    setSubmitError("");
    setRegisterNotice("");

    if (!registerCode.trim()) {
      setSubmitError(copy.codeRequired);
      return;
    }

    setRegisterBusy("verify");

    try {
      await verifyRegistrationOtp({
        email: registerEmail.trim(),
        verificationCode: registerCode.trim(),
      });
      setRegisterStage("password");
      setRegisterNotice(copy.codeVerified);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setRegisterBusy(null);
    }
  }

  async function handleCompleteRegistration() {
    setSubmitError("");
    setRegisterNotice("");

    if (!registerPassword.trim()) {
      setSubmitError(copy.passwordRequired);
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setSubmitError(copy.passwordMismatch);
      return;
    }

    if (!registerAgreeTerms) {
      setSubmitError(locale === "en" ? "Please accept the terms." : locale === "zh-Hant" ? "請先同意條款。" : "请先同意条款。");
      return;
    }

    setRegisterBusy("create");

    try {
      const result = await completeRegistration({
        password: registerPassword,
        locale,
      });
      setSession(result);
      router.push(safeNextPath);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      const normalizedMessage = message.toLowerCase();

      if (normalizedMessage.includes("already registered")) {
        setRegisterExistingEmail(true);
        setSubmitError(copy.emailAlreadyRegistered);
      } else if (
        normalizedMessage.includes("different from the old password") ||
        normalizedMessage.includes("new password should be different")
      ) {
        setSubmitError(copy.passwordReuse);
      } else {
        setSubmitError(message);
      }
    } finally {
      setRegisterBusy(null);
    }
  }

  function resetRegistrationEmail() {
    setSubmitError("");
    setRegisterNotice("");
    setRegisterStage("email");
    setRegisterCode("");
    setRegisterPassword("");
    setRegisterConfirmPassword("");
    setRegisterAgreeTerms(false);
    setRegisterExistingEmail(false);
  }

  async function handleGoogleLogin() {
    setSubmitError("");
    setGoogleSubmitting(true);

    try {
      await loginWithGoogle(locale, safeNextPath);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t.auth.googleError);
      setGoogleSubmitting(false);
    }
  }

  const termsAgreementContent =
    locale === "en" ? (
      <>
        I agree to the{" "}
        <Link href={withLocale(locale, "/terms")} className="font-medium text-sky-700 underline-offset-4 hover:underline">
          {t.home.footerLinks.terms}
        </Link>{" "}
        and{" "}
        <Link href={withLocale(locale, "/privacy")} className="font-medium text-sky-700 underline-offset-4 hover:underline">
          {t.home.footerLinks.privacy}
        </Link>
      </>
    ) : (
      <>
        我同意{" "}
        <Link href={withLocale(locale, "/terms")} className="font-medium text-sky-700 underline-offset-4 hover:underline">
          {t.home.footerLinks.terms}
        </Link>{" "}
        {locale === "zh-Hant" ? "與" : "与"}{" "}
        <Link href={withLocale(locale, "/privacy")} className="font-medium text-sky-700 underline-offset-4 hover:underline">
          {t.home.footerLinks.privacy}
        </Link>
      </>
    );

  return (
    <div className="auth-form-fade w-full rounded-[30px] border border-[rgba(196,210,228,0.5)] bg-white/92 p-6 shadow-[0_24px_50px_rgba(31,55,92,0.08)] backdrop-blur-xl md:p-9">
      <div className="mb-7 space-y-3">
        <div className="inline-flex rounded-full border border-sky-100 bg-sky-50/80 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-sky-700">
          {mode === "login"
            ? locale === "zh-Hant"
              ? "歡迎回來"
              : locale === "zh-Hans"
                ? "欢迎回来"
                : "WELCOME BACK"
            : locale === "zh-Hant"
              ? "免費開始"
              : locale === "zh-Hans"
                ? "免费开始"
                : "START FREE"}
        </div>
        <h1 className="text-balance text-[34px] font-semibold leading-[1.15] text-slate-900">
          {mode === "login"
            ? locale === "zh-Hant"
              ? "輸入你的工作信箱"
              : locale === "zh-Hans"
                ? "输入你的工作邮箱"
                : "Enter your work email"
            : locale === "zh-Hant"
              ? "建立你的工作帳號"
              : locale === "zh-Hans"
                ? "创建你的工作账号"
                : "Create your work account"}
        </h1>
        <p className="text-sm leading-6 text-slate-500">{mode === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle}</p>
      </div>

      {mode === "login" ? (
        <>
          <Button
            type="button"
            variant="secondary"
            className="h-12 w-full rounded-[14px] text-base"
            disabled={googleSubmitting}
            onClick={handleGoogleLogin}
            icon={<GoogleMark />}
          >
            {t.auth.googleAction}
          </Button>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[rgba(190,206,226,0.55)]" />
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{t.auth.orDivider}</span>
            <div className="h-px flex-1 bg-[rgba(190,206,226,0.55)]" />
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-500">{googleSubmitting ? t.common.loading : t.auth.googleHelper}</p>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit(onLoginSubmit)}>
            <Input
              label={t.auth.email}
              type="email"
              placeholder="name@company.com"
              error={errors.email?.message?.toString()}
              className="h-12 rounded-[14px]"
              {...registerLoginField("email")}
            />
            <Input
              label={t.auth.password}
              type="password"
              placeholder="******"
              error={errors.password?.message?.toString()}
              className="h-12 rounded-[14px]"
              {...registerLoginField("password")}
            />
            {captchaAppId ? (
              <TencentCaptchaWidget
                key={loginCaptchaKey}
                appId={captchaAppId}
                action="login"
                onVerified={setLoginCaptcha}
              />
            ) : null}
            <Button className="h-12 w-full rounded-[12px] text-base" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.common.loading : t.auth.loginAction}
            </Button>
          </form>
        </>
      ) : (
        <div className="space-y-4">
          <Button
            type="button"
            variant="secondary"
            className="h-12 w-full rounded-[14px] text-base"
            disabled={googleSubmitting}
            onClick={handleGoogleLogin}
            icon={<GoogleMark />}
          >
            {t.auth.googleAction}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[rgba(190,206,226,0.55)]" />
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{t.auth.orDivider}</span>
            <div className="h-px flex-1 bg-[rgba(190,206,226,0.55)]" />
          </div>

          <p className="text-xs leading-6 text-slate-500">{googleSubmitting ? t.common.loading : t.auth.googleHelper}</p>

          <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4">
            <div className="text-sm font-semibold text-slate-900">
              {registerStage === "email" ? copy.emailTitle : registerStage === "code" ? copy.codeTitle : copy.passwordTitle}
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {registerStage === "email" ? copy.emailHint : registerStage === "code" ? copy.codeHint : copy.passwordHint}
            </p>
          </div>

          <Input
            label={t.auth.email}
            type="email"
            placeholder="name@company.com"
            value={registerEmail}
            onChange={(event) => {
              setRegisterEmail(event.target.value);
              setRegisterExistingEmail(false);
            }}
            readOnly={registerStage !== "email"}
            className="h-12 rounded-[14px]"
          />

          {registerStage === "email" ? (
            <>
              {captchaAppId ? (
                <TencentCaptchaWidget
                  key={registerCaptchaKey}
                  appId={captchaAppId}
                  action="register_send_code"
                  onVerified={setRegisterCaptcha}
                />
              ) : null}
              <Button
                className="h-12 w-full rounded-[12px] text-base"
                type="button"
                disabled={registerBusy === "send"}
                onClick={handleSendRegistrationCode}
              >
                {registerBusy === "send" ? t.common.loading : copy.sendCode}
              </Button>
            </>
          ) : null}

          {registerStage !== "email" ? (
            <div className="rounded-[18px] border border-slate-200 bg-white/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-700">{registerEmail}</div>
                <button type="button" onClick={resetRegistrationEmail} className="text-sm font-medium text-sky-700">
                  {copy.changeEmail}
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <Input
                  label={copy.codeLabel}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="12345678"
                  value={registerCode}
                  onChange={(event) => setRegisterCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="h-12 rounded-[14px] tracking-[0.2em]"
                />

                {registerStage === "code" ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      className="h-12 flex-1 rounded-[12px] text-base"
                      type="button"
                      disabled={registerBusy === "verify"}
                      onClick={handleVerifyRegistrationCode}
                    >
                      {registerBusy === "verify" ? t.common.loading : copy.verifyCode}
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-12 rounded-[12px] text-base sm:min-w-[140px]"
                      type="button"
                      disabled={registerBusy === "send"}
                      onClick={handleSendRegistrationCode}
                    >
                      {registerBusy === "send" ? t.common.loading : copy.resendCode}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {registerStage === "password" ? (
            <>
              <div className="rounded-[18px] border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
                {copy.codeVerified}
              </div>
              <Input
                label={t.auth.password}
                type="password"
                placeholder="******"
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                className="h-12 rounded-[14px]"
              />
              <Input
                label={t.auth.confirmPassword}
                type="password"
                placeholder="******"
                value={registerConfirmPassword}
                onChange={(event) => setRegisterConfirmPassword(event.target.value)}
                className="h-12 rounded-[14px]"
              />
              <label className="flex items-start gap-3 rounded-[16px] border border-slate-200 bg-slate-50/85 px-4 py-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                  checked={registerAgreeTerms}
                  onChange={(event) => setRegisterAgreeTerms(event.target.checked)}
                />
                <span>{termsAgreementContent}</span>
              </label>
              <Button
                className="h-12 w-full rounded-[12px] text-base"
                type="button"
                disabled={registerBusy === "create"}
                onClick={handleCompleteRegistration}
              >
                {registerBusy === "create" ? t.common.loading : copy.createAccount}
              </Button>
            </>
          ) : null}
        </div>
      )}

      {submitError || externalAuthError ? <p className="mt-4 text-sm text-rose-600">{submitError || externalAuthError}</p> : null}
      {!externalAuthError && registerExistingEmail ? (
        <div className="mt-3 flex flex-col gap-2 text-sm md:flex-row md:items-center md:gap-4">
          <Link href={loginHref} className="font-medium text-sky-700">
            {t.auth.toLogin}
          </Link>
          <Link href={forgotPasswordHref} className="font-medium text-sky-700">
            {t.auth.forgotPassword}
          </Link>
        </div>
      ) : null}
      {!submitError && !externalAuthError && (authNotice || registerNotice) ? (
        <p className="mt-4 text-sm text-emerald-600">{authNotice || registerNotice}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:flex-wrap md:items-center md:justify-between">
        {mode === "login" ? (
          <>
            <Link href={forgotPasswordHref} className="font-medium text-sky-700">
              {t.auth.forgotPassword}
            </Link>
            <Link
              href={registerHref}
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-600 transition hover:text-slate-900 md:w-auto md:border-0 md:bg-transparent md:px-0 md:py-0 md:text-sky-700"
            >
              {t.auth.toRegister}
            </Link>
          </>
        ) : (
          <>
            <span>{t.auth.helper}</span>
            <Link
              href={loginHref}
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-600 transition hover:text-slate-900 md:w-auto md:border-0 md:bg-transparent md:px-0 md:py-0 md:text-sky-700"
            >
              {t.auth.toLogin}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
