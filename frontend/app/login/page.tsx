"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../src/stores/authStore";
import { apiConfig } from "../../src/services/api/config";
import { ApiConfigModal } from "../../src/components/ApiConfigModal";
import { useAppSettings } from "../../src/contexts/AppSettingsContext";
import { useTranslation } from "../../src/contexts/I18nContext";
import { LanguageSwitcher } from "../../src/components/LanguageSwitcher";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithPin, isLoading, error, clearError } = useAuthStore();
  const { companyName, companyLogo } = useAppSettings();
  const { t } = useTranslation();

  const [mode, setMode] = useState<"password" | "pin">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [currentApiUrl, setCurrentApiUrl] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setCurrentApiUrl(apiConfig.getApiUrl());
    const savedEmail = localStorage.getItem("guardtrack_saved_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    setIsOffline(!navigator.onLine);
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Sauvegarder l'email si "remember me" est coché
    if (rememberMe) {
      localStorage.setItem("guardtrack_saved_email", email);
    } else {
      localStorage.removeItem("guardtrack_saved_email");
    }

    // En mode hors ligne, le mot de passe ne peut pas être vérifié — forcer le PIN
    if (isOffline && mode === "password") {
      switchMode("pin");
      return;
    }

    let success = false;
    if (mode === "password") {
      success = await login(email, password);
    } else {
      success = await loginWithPin(email, pin);
    }

    if (success) {
      const { user } = useAuthStore.getState();

      // Rediriger selon le rôle
      switch (user?.role) {
        case "AGENT":
          router.push("/dashboard/agent");
          break;
        case "CONTROLEUR":
          router.push("/dashboard/controleur");
          break;
        case "SUPERVISEUR":
          router.push("/dashboard/superviseur");
          break;
        case "ADMIN":
        case "SUPERADMIN":
          router.push("/dashboard/admin");
          break;
        default:
          router.push("/dashboard");
      }
    }
  };

  const handleConfigSuccess = () => {
    setShowConfig(false);
    setCurrentApiUrl(apiConfig.getApiUrl());
    clearError();
  };

  const switchMode = (newMode: "password" | "pin") => {
    setMode(newMode);
    clearError();
    if (newMode === "password") {
      setPin("");
    } else {
      setPassword("");
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher variant="full" />
        </div>
        <div className="max-w-md w-full space-y-8">
          {/* En-tête */}
          <div>
            <div className="flex justify-center">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="h-16 object-contain" />
              ) : (
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">🛡️</span>
                </div>
              )}
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {companyName}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('auth.subtitle')}
            </p>

            {/* Affichage de l'URL API */}
            <div className="mt-2 text-center">
              <button
                onClick={() => setShowConfig(true)}
                className="text-xs text-gray-400 hover:text-indigo-600 transition-colors underline decoration-dotted"
                title="Modifier l'URL de l'API"
              >
                🔧 API: {currentApiUrl.replace("/api", "")}
              </button>
            </div>
          </div>

          {/* Bannière mode hors ligne */}
          {isOffline && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
              📴 {t('auth.offlineBanner')}
            </div>
          )}

          {/* Sélecteur de mode */}
          <div className="flex justify-center space-x-2 bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => switchMode("password")}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === "password"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🔐 {t('auth.passwordMode')}
            </button>
            <button
              type="button"
              onClick={() => switchMode("pin")}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === "pin"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📱 {t('auth.pinMode')}
            </button>
          </div>

          {/* Formulaire */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Champ Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">📧</span>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError();
                    }}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                    placeholder={t('auth.emailPlaceholder')}
                  />
                </div>
              </div>

              {/* Champ Mot de passe */}
              {mode === "password" && (
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t('auth.password')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400">🔒</span>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearError();
                      }}
                      className="appearance-none block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>
              )}

              {/* Champ PIN */}
              {mode === "pin" && (
                <div>
                  <label
                    htmlFor="pin"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t('auth.pin')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400">🔢</span>
                    </div>
                    <input
                      id="pin"
                      name="pin"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{5}"
                      maxLength={5}
                      autoComplete="off"
                      required
                      value={pin}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 5);
                        setPin(value);
                        clearError();
                      }}
                      className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow text-center text-2xl tracking-widest"
                      placeholder="•••••"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {t('auth.pinHint')}
                  </p>
                </div>
              )}
            </div>

            {/* Options supplémentaires */}
            {mode === "password" && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    {t('auth.rememberMe')}
                  </label>
                </div>

                <div className="text-sm">
                  <a
                    href="#"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {t('auth.forgotPassword')}
                  </a>
                </div>
              </div>
            )}

            {/* Message d'erreur */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-600">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bouton de connexion */}
            <div>
              <button
                type="submit"
                disabled={isLoading || (mode === "pin" && pin.length !== 5)}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                {isLoading ? (
                  <>
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </span>
                    {t('auth.signingIn')}
                  </>
                ) : (
                  t('auth.signIn')
                )}
              </button>
            </div>
          </form>

          {/* Informations de test */}
          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500">
              <button
                onClick={() => {
                  setEmail("superadmin@guardtrack.pro");
                  setPassword("password123");
                  setMode("password");
                }}
                className="text-indigo-600 hover:text-indigo-800 underline decoration-dotted"
              >
                🧪 SuperAdmin
              </button>
              {" • "}
              <button
                onClick={() => {
                  setEmail("agent@guardtrack.pro");
                  setPin("12345");
                  setMode("pin");
                }}
                className="text-indigo-600 hover:text-indigo-800 underline decoration-dotted"
              >
                🧪 Agent (PIN)
              </button>
            </p>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400">
            <p>GuardTrack Pro v1.0.0</p>
            <p className="mt-1">
              Mode {mode === "password" ? "mot de passe" : "PIN"}
            </p>
          </div>
        </div>
      </div>

      {/* Modal de configuration API */}
      <ApiConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        onSuccess={handleConfigSuccess}
      />
    </>
  );
}
