'use client';

import { useEffect, useState } from 'react';
import { roundsService, Round } from '../../../../src/services/api/rounds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendar,
  faChevronLeft,
  faChevronRight,
  faClock,
  faMapPin,
  faUser,
  faSpinner,
  faCircle,
  faCircleCheck,
  faPlay,
  faEye,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { useTranslation } from '../../../../src/contexts/I18nContext';

export default function ControleurPlanningPage() {
  const { t } = useTranslation();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [showRoundModal, setShowRoundModal] = useState(false);

  useEffect(() => {
    loadRounds();
    generateWeekDays(selectedDate);
  }, [selectedDate]);

  const loadRounds = async () => {
    setIsLoading(true);
    try {
      const data = await roundsService.getMyPlanned();
      setRounds(data);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWeekDays = (date: Date) => {
    const days: Date[] = [];
    const startOfWeek = new Date(date);
    // Ajuster pour que la semaine commence le lundi
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(date.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    setWeekDays(days);
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const getRoundsForDate = (date: Date): Round[] => {
    const dateStr = date.toISOString().split('T')[0];
    return rounds.filter(r => r.scheduledStart.split('T')[0] === dateStr);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string; icon: any }> = {
      PLANNED: { color: 'bg-blue-100 text-blue-800', text: t('controller.planning.legendPlanned'), icon: faCalendar },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800', text: t('controller.planning.legendInProgress'), icon: faPlay },
      COMPLETED: { color: 'bg-green-100 text-green-800', text: t('controller.planning.legendCompleted'), icon: faCircleCheck },
      CANCELLED: { color: 'bg-red-100 text-red-800', text: 'Annulée', icon: faCircle },
    };
    return badges[status] || { color: 'bg-gray-100 text-gray-800', text: status, icon: faCircle };
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const handleRoundClick = (round: Round) => {
    setSelectedRound(round);
    setShowRoundModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
      </div>
    );
  }

  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const totalRoundsThisWeek = rounds.filter(r => {
    const roundDate = new Date(r.scheduledStart);
    return roundDate >= weekStart && roundDate <= weekEnd;
  }).length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FontAwesomeIcon icon={faCalendar} className="mr-3 text-indigo-600" />
          {t('controller.planning.title')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('controller.planning.subtitle')}
        </p>
      </div>

      {/* Résumé de la semaine */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow p-6 text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-indigo-100 text-sm">{t('controller.planning.week')}</p>
            <p className="text-xl font-semibold">
              {weekStart?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - 
              {weekEnd?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          <div>
            <p className="text-indigo-100 text-sm">{t('controller.planning.roundsThisWeek')}</p>
            <p className="text-3xl font-bold">{totalRoundsThisWeek}</p>
          </div>
          <div>
            <p className="text-indigo-100 text-sm">{t('controller.planning.inProgressOrPlanned')}</p>
            <p className="text-3xl font-bold">
              {rounds.filter(r => ['IN_PROGRESS', 'PLANNED'].includes(r.status)).length}
            </p>
          </div>
          <div>
            <p className="text-indigo-100 text-sm">{t('controller.planning.completed')}</p>
            <p className="text-3xl font-bold">
              {rounds.filter(r => r.status === 'COMPLETED').length}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation semaine */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeWeek('prev')}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
            {t('controller.planning.previousWeek')}
          </button>
          
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
          >
            {t('controller.planning.today')}
          </button>
          
          <button
            onClick={() => changeWeek('next')}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          >
            {t('controller.planning.nextWeek')}
            <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
          </button>
        </div>
      </div>

      {/* Grille de la semaine */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* En-têtes des jours */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {weekDays.map((date, index) => (
            <div
              key={index}
              className={`p-3 text-center border-r last:border-r-0 ${
                isToday(date) ? 'bg-indigo-50' : ''
              } ${isWeekend(date) ? 'bg-gray-100' : ''}`}
            >
              <p className="text-sm font-medium text-gray-600">
                {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </p>
              <p className={`text-lg font-semibold ${
                isToday(date) ? 'text-indigo-600' : 'text-gray-800'
              }`}>
                {date.getDate()}
              </p>
              <p className="text-xs text-gray-400">
                {date.toLocaleDateString('fr-FR', { month: 'short' })}
              </p>
            </div>
          ))}
        </div>

        {/* Contenu des jours */}
        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDays.map((date, index) => {
            const dayRounds = getRoundsForDate(date);
            const isWeekendDay = isWeekend(date);

            return (
              <div
                key={index}
                className={`p-2 border-r last:border-r-0 border-b ${
                  isToday(date) ? 'bg-indigo-50/30' : ''
                } ${isWeekendDay ? 'bg-gray-50/50' : ''}`}
              >
                {isWeekendDay ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-400 text-sm text-center">
                      {date.getDay() === 0 ? `😴 ${t('controller.planning.sunday')}` : `😴 ${t('controller.planning.saturday')}`}
                      <br />
                      <span className="text-xs">{t('controller.planning.rest')}</span>
                    </p>
                  </div>
                ) : dayRounds.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-300 text-sm text-center">
                      {t('controller.planning.noRound')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayRounds.map((round) => {
                      const statusBadge = getStatusBadge(round.status);
                      const progress = round.progress || 0;

                      return (
                        <button
                          key={round.id}
                          onClick={() => handleRoundClick(round)}
                          className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                            round.status === 'IN_PROGRESS'
                              ? 'border-yellow-300 bg-yellow-50'
                              : round.status === 'COMPLETED'
                              ? 'border-green-300 bg-green-50'
                              : round.status === 'PLANNED'
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm truncate">
                              {round.name}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${statusBadge.color}`}>
                              <FontAwesomeIcon icon={statusBadge.icon} className="text-xs" />
                            </span>
                          </div>
                          
                          <div className="text-xs text-gray-600 space-y-1">
                            <p className="flex items-center">
                              <FontAwesomeIcon icon={faClock} className="mr-1 w-3" />
                              {new Date(round.scheduledStart).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <p className="flex items-center">
                              <FontAwesomeIcon icon={faMapPin} className="mr-1 w-3" />
                              {round.sitesCount} {t('controller.planning.sitesCount')}
                            </p>
                            {round.agent && (
                              <p className="flex items-center">
                                <FontAwesomeIcon icon={faUser} className="mr-1 w-3" />
                                {round.agent.fullName}
                              </p>
                            )}
                          </div>

                          {/* Progression pour les rondes en cours */}
                          {round.status === 'IN_PROGRESS' && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-indigo-600 h-1.5 rounded-full"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {round.visitedSitesCount}/{round.sitesCount} {t('controller.planning.sitesCount')}
                              </p>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">{t('controller.planning.legend')}</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded mr-2"></div>
            <span className="text-sm text-gray-600">{t('controller.planning.legendPlanned')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
            <span className="text-sm text-gray-600">{t('controller.planning.legendInProgress')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
            <span className="text-sm text-gray-600">{t('controller.planning.legendCompleted')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded mr-2"></div>
            <span className="text-sm text-gray-600">{t('controller.planning.legendWeekend')}</span>
          </div>
        </div>
      </div>

      {/* Liste des rondes à venir */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{`📋 ${t('controller.planning.upcomingRounds')}`}</h2>
        </div>
        <div className="divide-y">
          {rounds
            .filter(r => r.status === 'PLANNED')
            .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
            .slice(0, 5)
            .map((round) => (
              <div key={round.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <p className="font-medium">{round.name}</p>
                      <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {t('controller.planning.legendPlanned')}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-sm text-gray-600">
                      <p className="flex items-center">
                        <FontAwesomeIcon icon={faCalendar} className="mr-2 w-4" />
                        {new Date(round.scheduledStart).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="flex items-center">
                        <FontAwesomeIcon icon={faClock} className="mr-2 w-4" />
                        {new Date(round.scheduledStart).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="flex items-center">
                        <FontAwesomeIcon icon={faLocationDot} className="mr-2 w-4" />
                        {round.sitesCount} {t('controller.planning.sitesCount')}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/controleur/rounds/${round.id}`}
                    className="ml-4 px-3 py-2 bg-indigo-100 text-indigo-700 text-sm rounded-lg hover:bg-indigo-200"
                  >
                    <FontAwesomeIcon icon={faEye} className="mr-1" />
                    {t('controller.planning.see')}
                  </Link>
                </div>
              </div>
            ))}
          {rounds.filter(r => r.status === 'PLANNED').length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {t('controller.planning.noPlannedRounds')}
            </div>
          )}
        </div>
      </div>

      {/* Modal détails ronde */}
      {showRoundModal && selectedRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{selectedRound.name}</h2>
                <button
                  onClick={() => setShowRoundModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">{t('controller.planning.status')}</p>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(selectedRound.status).color}`}>
                      {getStatusBadge(selectedRound.status).text}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('controller.planning.assignedAgent')}</p>
                    <p className="font-medium">{selectedRound.agent?.fullName || t('controller.planning.notAssigned')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('controller.planning.plannedStart')}</p>
                    <p>{new Date(selectedRound.scheduledStart).toLocaleString('fr-FR')}</p>
                  </div>
                  {selectedRound.scheduledEnd && (
                    <div>
                      <p className="text-xs text-gray-500">{t('controller.planning.plannedEnd')}</p>
                      <p>{new Date(selectedRound.scheduledEnd).toLocaleString('fr-FR')}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">{t('controller.planning.sitesToVisit')}</p>
                  <div className="space-y-2">
                    {selectedRound.sites?.map((site, idx) => (
                      <div key={site.id} className="flex items-center p-2 bg-gray-50 rounded">
                        <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{site.site.name}</p>
                          <p className="text-xs text-gray-500">{site.site.address}</p>
                        </div>
                        {site.visitedAt && (
                          <span className="ml-auto text-green-600 text-xs">✅ {t('controller.planning.visited')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedRound.status === 'IN_PROGRESS' && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('controller.planning.progress')}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${selectedRound.progress || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedRound.visitedSitesCount}/{selectedRound.sitesCount} {t('controller.planning.sitesVisited')}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowRoundModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  {t('controller.planning.close')}
                </button>
                <Link
                  href={`/dashboard/controleur/rounds/${selectedRound.id}`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {t('controller.planning.seeFullDetails')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}