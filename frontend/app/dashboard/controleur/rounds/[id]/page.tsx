'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { roundsService, Round, RoundSite } from '../../../../../src/services/api/rounds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPlay,
  faCheckCircle,
  faClock,
  faMapPin,
  faUser,
  faSpinner,
  faCircleCheck,
  faCircle,
  faChevronRight,
  faCheck,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

export default function ControleurRoundDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  // ✅ Validation et parsing sécurisé de l'ID
  const rawId = params.id as string;
  const roundId = rawId && rawId !== 'undefined' && rawId !== 'NaN' && !isNaN(parseInt(rawId)) 
    ? parseInt(rawId) 
    : null;

  const [round, setRound] = useState<Round | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isValidatingAll, setIsValidatingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roundId) {
      loadRound();
    } else {
      setError('ID de ronde invalide');
      setIsLoading(false);
    }
  }, [roundId]);

  const loadRound = async () => {
    if (!roundId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await roundsService.getById(roundId);
      setRound(data);
    } catch (error) {
      console.error('Erreur de chargement:', error);
      setError('Ronde non trouvée ou inaccessible');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRound = async () => {
    if (!roundId) return;
    
    setIsStarting(true);
    try {
      const result = await roundsService.startAsController(roundId);
      if (result) {
        await loadRound();
      }
    } catch (error) {
      console.error('Erreur démarrage:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleValidateAll = async () => {
    if (!roundId) return;
    if (!confirm('Valider toutes les visites de cette ronde ?')) return;
    
    setIsValidatingAll(true);
    try {
      const result = await roundsService.validateAll(roundId);
      if (result) {
        await loadRound();
      }
    } catch (error) {
      console.error('Erreur validation:', error);
    } finally {
      setIsValidatingAll(false);
    }
  };

  const getSiteStatusIcon = (site: RoundSite) => {
    if (!site.visitedAt) {
      return <FontAwesomeIcon icon={faCircle} className="text-gray-400" />;
    }
    if (site.isValidated) {
      return <FontAwesomeIcon icon={faCircleCheck} className="text-green-500" />;
    }
    return <FontAwesomeIcon icon={faClock} className="text-yellow-500" />;
  };

  const canVisitSite = (site: RoundSite, index: number): boolean => {
    if (!round) return false;
    if (site.visitedAt && site.isValidated) return false;
    
    // Vérifier que tous les sites précédents sont visités et validés
    const previousSites = round.sites?.slice(0, index) || [];
    return previousSites.every(s => s.visitedAt && s.isValidated);
  };

  const pendingValidationCount = round?.sites?.filter(s => s.visitedAt && !s.isValidated).length || 0;

  // ✅ Gestion de l'état de chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
      </div>
    );
  }

  // ✅ Gestion des erreurs
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => router.push('/dashboard/controleur/rounds')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Retour aux rondes
        </button>
      </div>
    );
  }

  // ✅ Gestion de l'absence de ronde
  if (!round) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500 mb-4">Ronde non trouvée</p>
        <button
          onClick={() => router.push('/dashboard/controleur/rounds')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Retour aux rondes
        </button>
      </div>
    );
  }

  const statusBadge = {
    PLANNED: { color: 'bg-blue-100 text-blue-800', text: 'Planifiée' },
    IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800', text: 'En cours' },
    COMPLETED: { color: 'bg-green-100 text-green-800', text: 'Terminée' },
    CANCELLED: { color: 'bg-red-100 text-red-800', text: 'Annulée' },
  }[round.status] || { color: 'bg-gray-100 text-gray-800', text: round.status };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/dashboard/controleur/rounds')}
              className="mr-4 text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{round.name}</h1>
            <span className={`ml-3 px-3 py-1 rounded-full text-sm ${statusBadge.color}`}>
              {statusBadge.text}
            </span>
          </div>
          
          <div className="flex space-x-3">
            {round.status === 'PLANNED' && (
              <button
                onClick={handleStartRound}
                disabled={isStarting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {isStarting ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPlay} className="mr-2" />}
                Démarrer la ronde
              </button>
            )}
            {pendingValidationCount > 0 && round.status !== 'PLANNED' && (
              <button
                onClick={handleValidateAll}
                disabled={isValidatingAll}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
              >
                {isValidatingAll ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />}
                Valider tout ({pendingValidationCount})
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-400" />
            <span className="text-gray-600">Agent : <strong>{round.agent?.fullName || 'Non assigné'}</strong></span>
          </div>
          <div className="flex items-center">
            <FontAwesomeIcon icon={faClock} className="mr-2 text-gray-400" />
            <span className="text-gray-600">Début : <strong>{new Date(round.scheduledStart).toLocaleString('fr-FR')}</strong></span>
          </div>
          <div className="flex items-center">
            <FontAwesomeIcon icon={faMapPin} className="mr-2 text-gray-400" />
            <span className="text-gray-600">Sites : <strong>{round.visitedSitesCount}/{round.sitesCount}</strong></span>
          </div>
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-gray-400" />
            <span className="text-gray-600">Validés : <strong>{round.validatedSitesCount || 0}/{round.sitesCount}</strong></span>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-indigo-600 h-3 rounded-full transition-all"
              style={{ width: `${round.progress || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Liste des sites à visiter */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">📍 Sites à visiter</h2>
          <p className="text-sm text-gray-500 mt-1">
            Les sites doivent être visités dans l'ordre
          </p>
        </div>

        <div className="divide-y">
          {round.sites?.map((site, index) => {
            const isVisited = !!site.visitedAt;
            const isValidated = site.isValidated;
            const canVisit = canVisitSite(site, index) && round.status === 'IN_PROGRESS';
            const isBlocked = !canVisit && !isVisited && round.status === 'IN_PROGRESS';

            return (
              <div key={site.id} className={`p-4 ${isBlocked ? 'bg-gray-50 opacity-60' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-medium mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{site.site.name}</p>
                      <p className="text-sm text-gray-500">{site.site.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {isVisited ? (
                      <>
                        <span className="text-sm text-gray-500">
                          {new Date(site.visitedAt!).toLocaleTimeString('fr-FR')}
                        </span>
                        {getSiteStatusIcon(site)}
                        {isValidated ? (
                          <span className="text-green-600 text-sm">Validé</span>
                        ) : (
                          <span className="text-yellow-600 text-sm">En attente</span>
                        )}
                      </>
                    ) : (
                      <>
                        {isBlocked && (
                          <span className="text-gray-400 text-sm mr-2">🔒 Site précédent requis</span>
                        )}
                        {canVisit && (
                          <Link
                            href={`/dashboard/controleur/rounds/${roundId}/visit/${site.site.id}`}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center"
                          >
                            Visiter
                            <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Détails de la visite si déjà effectuée */}
                {isVisited && (
                  <div className="ml-11 mt-2 text-sm text-gray-600">
                    {site.agentPresenceStatus && (
                      <p className="flex items-center">
                        <span className="mr-2">👤 Agent :</span>
                        <span className={site.agentPresenceStatus === 'PRESENT' ? 'text-green-600' : 'text-red-600'}>
                          {site.agentPresenceStatus === 'PRESENT' ? 'Présent' : 'Absent'}
                        </span>
                        {site.absenceReason && <span className="ml-2 text-gray-500">({site.absenceReason})</span>}
                      </p>
                    )}
                    {site.comments && (
                      <p className="mt-1">💬 {site.comments}</p>
                    )}
                    {site.hasPhoto && (
                      <p className="mt-1 text-green-600">📸 Photo disponible</p>
                    )}
                    {!isValidated && (
                      <div className="mt-2 flex space-x-2">
                        <button
                          onClick={async () => {
                            if (!roundId) return;
                            try {
                              await roundsService.validateSite(roundId, site.site.id);
                              await loadRound();
                            } catch (error) {
                              console.error('Erreur validation:', error);
                            }
                          }}
                          className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
                        >
                          <FontAwesomeIcon icon={faCheck} className="mr-1" />
                          Valider
                        </button>
                        <button
                          onClick={async () => {
                            if (!roundId) return;
                            const reason = prompt('Motif du rejet :');
                            if (reason) {
                              try {
                                await roundsService.rejectSite(roundId, site.site.id, reason);
                                await loadRound();
                              } catch (error) {
                                console.error('Erreur rejet:', error);
                              }
                            }
                          }}
                          className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                        >
                          <FontAwesomeIcon icon={faTimes} className="mr-1" />
                          Rejeter
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}