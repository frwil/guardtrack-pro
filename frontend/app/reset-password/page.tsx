'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '../../src/services/api/auth';
import { useAppSettings } from '../../src/contexts/AppSettingsContext';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { companyName, companyLogo } = useAppSettings();

  const [step, setStep] = useState<'validating' | 'form' | 'done' | 'invalid'>('validating');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setStep('invalid'); return; }
    authService.validateResetToken(token).then((res) => {
      if (res?.valid) { setEmail(res.email ?? ''); setStep('form'); }
      else setStep('invalid');
    });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }

    setIsLoading(true);
    setError('');
    try {
      const res = await authService.resetPassword(token, password);
      if (res?.message) setStep('done');
      else setError('Une erreur est survenue. Veuillez réessayer.');
    } catch { setError('Une erreur est survenue.'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {companyLogo
            ? <img src={companyLogo} alt={companyName} className="h-14 object-contain mx-auto" />
            : <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center mx-auto"><span className="text-white text-2xl">🛡️</span></div>
          }
          <h2 className="mt-4 text-2xl font-bold text-gray-900">{companyName}</h2>
          <p className="text-sm text-gray-500 mt-1">Réinitialisation du mot de passe</p>
        </div>

        <div className="bg-white rounded-xl shadow p-8">
          {step === 'validating' && (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-3 text-gray-500 text-sm">Vérification du lien…</p>
            </div>
          )}

          {step === 'invalid' && (
            <div className="text-center py-6">
              <p className="text-4xl mb-4">❌</p>
              <h3 className="text-lg font-semibold text-gray-900">Lien invalide ou expiré</h3>
              <p className="text-sm text-gray-500 mt-2">Ce lien de réinitialisation est invalide ou a expiré (valable 1 heure).</p>
              <button onClick={() => router.push('/login')} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                Retour à la connexion
              </button>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Définissez un nouveau mot de passe pour <span className="font-medium text-indigo-600">{email}</span>.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-12"
                    placeholder="8 caractères minimum"
                    required
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showPwd ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {password && (
                  <div className="mt-1.5 flex gap-1">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= i * 3
                          ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-orange-400' : i <= 3 ? 'bg-yellow-400' : 'bg-green-500'
                          : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                    confirm && confirm !== password ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder="Répétez le mot de passe"
                  required
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button type="submit" disabled={isLoading}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {isLoading ? '⏳ Enregistrement…' : '✅ Définir le mot de passe'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center py-6">
              <p className="text-4xl mb-4">✅</p>
              <h3 className="text-lg font-semibold text-gray-900">Mot de passe mis à jour</h3>
              <p className="text-sm text-gray-500 mt-2">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <button onClick={() => router.push('/login')} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                Se connecter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}