'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../../src/stores/authStore';
import { roundsService, Round } from '../../../../src/services/api/rounds';
import { useTranslation } from '../../../../src/contexts/I18nContext';
import Link from 'next/link';

export default function AgentRoundsPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [todayRounds, setTodayRounds] = useState<Round[]>([]);
  const [upcomingRounds, setUpcomingRounds] = useState<Round[]>([]);
  const [pastRounds, setPastRounds] = useState<Round[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past'>('today');
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [showRoundDetail, setShowRoundDetail] = useState(false);

  useEffect(() => {
    loadRounds();
  }, []);

  const loadRounds = async () => {
    setIsLoading(true);
    try {
      const [allRounds, today] = await Promise.all([
        roundsService.getMyRounds(),
        roundsService.getToday(),
      ]);
      setRounds(allRounds);
      setTodayRounds(today);
      const now = new Date();
      setUpcomingRounds(allRounds.filter(r => r.status === 'PLANNED' && new Date(r.scheduledStart) > now));
      setPastRounds(allRounds.filter(r => ['COMPLETED', 'CANCELLED'].includes(r.status)));
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string; icon: string }> = {
      PLANNED:     { color: 'bg-blue-100 text-blue-800',   text: t('agent.rounds.statusPlanned'),    icon: '📋' },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800', text: t('agent.rounds.statusInProgress'), icon: '🔄' },
      COMPLETED:   { color: 'bg-green-100 text-green-800', text: t('agent.rounds.statusDone'),       icon: '✅' },
      CANCELLED:   { color: 'bg-red-100 text-red-800',     text: t('agent.rounds.statusCancelled'),  icon: '❌' },
    };
    return badges[status] || { color: 'bg-gray-100 text-gray-800', text: status, icon: '📌' };
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const displayedRounds = activeTab === 'today' ? todayRounds
    : activeTab === 'upcoming' ? upcomingRounds
    : pastRounds;

  const handleStartRound = async (roundId: number) => {
    if (await roundsService.start(roundId)) loadRounds();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">{t('agent.rounds.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <span className="mr-3">🔄</span>
          {t('agent.rounds.title')}
        </h1>
        <p className="text-gray-600 mt-1">{t('agent.rounds.subtitle')}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{t('agent.rounds.today')}</p>
          <p className="text-2xl font-bold text-blue-600">{todayRounds.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{t('agent.rounds.upcoming')}</p>
          <p className="text-2xl font-bold text-indigo-600">{upcomingRounds.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{t('agent.rounds.past')}</p>
          <p className="text-2xl font-bold text-green-600">{pastRounds.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            {(['today', 'upcoming', 'past'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'today'    && `📅 ${t('agent.rounds.today')}`}
                {tab === 'upcoming' && `⏳ ${t('agent.rounds.upcoming')}`}
                {tab === 'past'     && `✅ ${t('agent.rounds.past')}`}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {displayedRounds.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-3 block">📋</span>
              <p className="text-gray-500">
                {activeTab === 'today'    ? t('agent.rounds.noRoundsToday')
                : activeTab === 'upcoming' ? t('agent.rounds.noRoundsUpcoming')
                : t('agent.rounds.noRoundsPast')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedRounds.map((round) => {
                const statusBadge = getStatusBadge(round.status);
                const progress = round.sitesCount > 0
                  ? Math.round((round.visitedSitesCount / round.sitesCount) * 100) : 0;

                return (
                  <div key={round.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="font-semibold text-gray-900">{round.name}</h3>
                          <span className={`ml-3 px-2 py-1 rounded-full text-xs ${statusBadge.color}`}>
                            {statusBadge.icon} {statusBadge.text}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-500">{t('agent.rounds.plannedStart')}</p>
                            <p className="text-sm">{new Date(round.scheduledStart).toLocaleString('fr-FR')}</p>
                          </div>
                          {round.scheduledEnd && (
                            <div>
                              <p className="text-xs text-gray-500">{t('agent.rounds.plannedEnd')}</p>
                              <p className="text-sm">{new Date(round.scheduledEnd).toLocaleString('fr-FR')}</p>
                            </div>
                          )}
                          {round.actualStart && (
                            <div>
                              <p className="text-xs text-gray-500">{t('agent.rounds.actualStart')}</p>
                              <p className="text-sm">{new Date(round.actualStart).toLocaleString('fr-FR')}</p>
                            </div>
                          )}
                          {round.actualEnd && (
                            <div>
                              <p className="text-xs text-gray-500">{t('agent.rounds.actualEnd')}</p>
                              <p className="text-sm">{new Date(round.actualEnd).toLocaleString('fr-FR')}</p>
                            </div>
                          )}
                        </div>

                        {round.status === 'IN_PROGRESS' && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>{t('agent.rounds.progress')}</span>
                              <span>{round.visitedSitesCount}/{round.sitesCount} {t('agent.rounds.sites')}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`${getProgressColor(progress)} h-2 rounded-full transition-all`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {round.supervisor && (
                          <p className="text-xs text-gray-500 mt-3">
                            👤 {t('agent.rounds.supervisor')} {round.supervisor.fullName}
                          </p>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col space-y-2">
                        {round.status === 'PLANNED' && (
                          <button
                            onClick={() => handleStartRound(round.id)}
                            className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            ▶️ {t('agent.rounds.start')}
                          </button>
                        )}
                        <button
                          onClick={() => { setSelectedRound(round); setShowRoundDetail(true); }}
                          className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                        >
                          👁️ {t('agent.rounds.details')}
                        </button>
                        {round.status === 'IN_PROGRESS' && (
                          <Link
                            href={`/dashboard/agent/rounds/${round.id}/visit`}
                            className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 text-center"
                          >
                            📍 {t('agent.rounds.visit')}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showRoundDetail && selectedRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{selectedRound.name}</h2>
                <button onClick={() => setShowRoundDetail(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">📍 {t('agent.rounds.sitesToVisit')}</h3>
                  <div className="space-y-2">
                    {selectedRound.sites?.map((roundSite, index) => (
                      <div key={roundSite.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{roundSite.site.name}</p>
                          <p className="text-sm text-gray-500">{roundSite.site.address}</p>
                        </div>
                        {roundSite.visitedAt
                          ? <span className="text-green-600">✅ {t('agent.rounds.visited')}</span>
                          : <span className="text-gray-400">⏳ {t('agent.rounds.pendingSite')}</span>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowRoundDetail(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
