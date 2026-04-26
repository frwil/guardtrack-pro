'use client';

import { useAppSettings } from '../../../../src/contexts/AppSettingsContext';

const KPI_CARDS = [
  { label: 'Chiffre d\'affaires (mois)',  key: 'revenue',  color: 'green',  icon: '📈', value: null },
  { label: 'Charges salariales',          key: 'payroll',  color: 'orange', icon: '👥', value: null },
  { label: 'Solde net',                   key: 'balance',  color: 'blue',   icon: '💳', value: null },
  { label: 'Factures en attente',         key: 'pending',  color: 'red',    icon: '⏳', value: null },
];

const COLOR_CLASSES: Record<string, string> = {
  green:  'bg-green-50 border-green-200 text-green-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  blue:   'bg-blue-50 border-blue-200 text-blue-700',
  red:    'bg-red-50 border-red-200 text-red-700',
};

export default function FinancePage() {
  const { currency, currencySymbol } = useAppSettings();

  const fmt = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(amount) +
    ' ' + currencySymbol;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span>💰</span>
            Finance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivi financier — devise : <strong>{currency}</strong> ({currencySymbol})
          </p>
        </div>
        <span className="text-3xl font-mono text-gray-300">{currencySymbol}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_CARDS.map(({ label, key, color, icon }) => (
          <div
            key={key}
            className={`rounded-lg border p-5 flex flex-col gap-2 ${COLOR_CLASSES[color]}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xl">{icon}</span>
            </div>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs opacity-70">Données à venir</p>
          </div>
        ))}
      </div>

      {/* Placeholder modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tableau des factures */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📄 Factures récentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Référence</th>
                  <th className="pb-2 pr-4">Client</th>
                  <th className="pb-2 pr-4">Montant</th>
                  <th className="pb-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    Aucune facture enregistrée
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tableau des salaires */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">👥 Charges salariales</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Agent</th>
                  <th className="pb-2 pr-4">Heures</th>
                  <th className="pb-2 pr-4">Taux</th>
                  <th className="pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    Aucune donnée salariale
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Note de configuration */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
        <span className="text-2xl mt-0.5">💱</span>
        <div>
          <p className="text-sm font-medium text-indigo-800">Configuration de la devise</p>
          <p className="text-sm text-indigo-600 mt-0.5">
            La devise active est <strong>{currency} ({currencySymbol})</strong>.
            Pour la modifier, rendez-vous dans{' '}
            <a href="/dashboard/admin/settings" className="underline font-medium">
              Paramètres → Général
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
