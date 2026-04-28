'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { roundsService, Round } from '../../../../src/services/api/rounds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faPlay,
  faEye,
  faCheckCircle,
  faClock,
  faMapPin,
  faUser,
  faSpinner,
  faChevronRight,
  faExclamationTriangle,
  faRotate,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { useTranslation } from '../../../../src/contexts/I18nContext';

export default function ControleurRoundsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [plannedRounds, setPlannedRounds] = useState<Round[]>([]);
  const [inProgressRounds, setInProgressRounds] = useState<Round[]>([]);
  const [pendingValidation, setPendingValidation] = useState<Round[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'planned' | 'in-progress' | 'pending'>('planned');

  useEffect(() => {
    loadRounds();
  }, []);

  const loadRounds = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [planned, pending] = await Promise.all([
        roundsService.getMyPlanned(),
        roundsService.getPendingValidation(),
      ]);

      // Séparer les rondes planifiées et en cours
      setPlannedRounds(planned.filter(r => r.status === 'PLANNED'));
      setInProgressRounds(planned.filter(r => r.status === 'IN_PROGRESS'));
      setPendingValidation(pending);
    } catch (error) {
      console.error('Erreur de chargement:', error);
      setError(t('controller.rounds.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRound = async (roundId: number) => {
    setIsStarting(roundId);
    try {
      const result = await roundsService.startAsController(roundId);
      if (result) {
        await loadRounds();
        router.push(`/dashboard/controleur/rounds/${roundId}`);
      }
    } catch (error) {
      console.error('Erreur démarrage:', error);
      alert(t('controller.rounds.errorStarting'));
    } finally {
      setIsStarting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string; icon: any }> = {
      PLANNED: { color: 'bg-blue-100 text-blue-800', text: t('controller.rounds.statusPlanned'), icon: faClock },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800', text: t('controller.rounds.statusInProgress'), icon: faPlay },
      COMPLETED: { color: 'bg-green-100 text-green-800', text: t('controller.rounds.statusCompleted'), icon: faCheckCircle },
      CANCELLED: { color: 'bg-red-100 text-red-800', text: t('controller.rounds.statusCancelled'), icon: faClock },
    };
    return badges[status] || { color: 'bg-gray-100 text-gray-800', text: status, icon: faClock };
  };

  const displayedRounds = activeTab === 'planned' ? plannedRounds 
    : activeTab === 'in-progress' ? inProgressRounds 
    : pendingValidation;

  const renderRoundCard = (round: Round) => {
    const statusBadge = getStatusBadge(round.status);
    const progress = round.progress || 0;
    const isStartingThis = isStarting === round.id;

    return (
      <div key={round.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <h3 className="font-semibold text-gray-900">{round.name}</h3>
              <span className={`ml-3 px-2 py-1 rounded-full text-xs flex items-center ${statusBadge.color}`}>
                <FontAwesomeIcon icon={statusBadge.icon} className="mr-1" />
                {statusBadge.text}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-3">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-400 w-4" />
                <span>{t('controller.rounds.agentLabel') + ' '}{round.agent?.fullName || t('controller.rounds.notAssigned')}</span>
              </div>
              <div className="flex items-center">
                <FontAwesomeIcon icon={faClock} className="mr-2 text-gray-400 w-4" />
                <span>{new Date(round.scheduledStart).toLocaleString('fr-FR')}</span>
              </div>
              <div className="flex items-center col-span-2">
                <FontAwesomeIcon icon={faMapPin} className="mr-2 text-gray-400 w-4" />
                <span>{round.sitesCount} {t('controller.rounds.sitesToVisit')}</span>
              </div>
            </div>

            {/* Progression */}
            {round.status === 'IN_PROGRESS' && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">{t('controller.rounds.progress')}</span>
                  <span className="font-medium">{round.visitedSitesCount}/{round.sitesCount} {t('controller.rounds.sites')}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Information validation en attente */}
            {activeTab === 'pending' && round.validatedSitesCount !== undefined && (
              <div className="mt-3 text-sm">
                <span className="text-yellow-600">
                  {round.validatedSitesCount || 0}/{round.sitesCount} sites validés
                </span>
              </div>
            )}
          </div>

          <div className="ml-4 flex flex-col space-y-2">
            {round.status === 'PLANNED' && (
              <button
                onClick={() => handleStartRound(round.id)}
                disabled={isStartingThis}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center whitespace-nowrap"
              >
                {isStartingThis ? (
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-1" />
                ) : (
                  <FontAwesomeIcon icon={faPlay} className="mr-1" />
                )}
                {t('controller.rounds.start')}
              </button>
            )}
            {round.status === 'IN_PROGRESS' && (
              <Link
                href={`/dashboard/controleur/rounds/${round.id}`}
                className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center whitespace-nowrap"
              >
                <FontAwesomeIcon icon={faPlay} className="mr-1" />
                {t('controller.rounds.continue')}
              </Link>
            )}
            <Link
              href={`/dashboard/controleur/rounds/${round.id}`}
              className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center whitespace-nowrap"
            >
              <FontAwesomeIcon icon={faEye} className="mr-1" />
              {t('controller.rounds.details')}
            </Link>
          </div>
        </div>
      </div>
    );
  };

  // ✅ Affichage de l'erreur
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="mr-3">🔄</span>
            {t('controller.rounds.title')}
          </h1>
        </div>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl text-red-500 mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadRounds}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center mx-auto"
          >
            <FontAwesomeIcon icon={faRotate} className="mr-2" />
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  // ✅ Affichage du chargement
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="mr-3">🔄</span>
            {t('controller.rounds.title')}
          </h1>
        </div>
        <div className="bg-white rounded-lg shadow p-12 flex items-center justify-center">
          <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
          <span className="ml-3 text-gray-600">{t('controller.rounds.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="mr-3">🔄</span>
            {t('controller.rounds.title')}
          </h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadRounds}
              className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Actualiser"
            >
              <FontAwesomeIcon icon={faRotate} />
            </button>
            <Link
              href="/dashboard/controleur/rounds/create"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              {t('controller.rounds.newRound')}
            </Link>
          </div>
        </div>
        
        {/* Résumé */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-sm text-blue-600">Planifiées</p>
            <p className="text-2xl font-bold text-blue-700">{plannedRounds.length}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-sm text-yellow-600">En cours</p>
            <p className="text-2xl font-bold text-yellow-700">{inProgressRounds.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-sm text-green-600">À valider</p>
            <p className="text-2xl font-bold text-green-700">{pendingValidation.length}</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('planned')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'planned'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {`📋 ${t('controller.rounds.tabPlanned')} (${plannedRounds.length})`}
            </button>
            <button
              onClick={() => setActiveTab('in-progress')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'in-progress'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {`▶️ ${t('controller.rounds.tabInProgress')} (${inProgressRounds.length})`}
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 text13 font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {`✅ ${t('controller.rounds.tabPending')} (${pendingValidation.length})`}
            </button>
          </div>
        </div>

        {/* Liste des rondes */}
        <div className="p-6">
          {displayedRounds.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-3 block">📋</span>
              <p className="text-gray-500">
                {activeTab === 'planned' && t('controller.rounds.noPlanned')}
                {activeTab === 'in-progress' && t('controller.rounds.noInProgress')}
                {activeTab === 'pending' && t('controller.rounds.noPending')}
              </p>
              {activeTab === 'planned' && (
                <Link
                  href="/dashboard/controleur/rounds/create"
                  className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  {t('controller.rounds.createRound')}
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {displayedRounds.map(renderRoundCard)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}