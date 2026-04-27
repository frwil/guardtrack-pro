'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usersService } from '../../../../../src/services/api/users';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSpinner,
  faEnvelope,
  faPhone,
  faUserShield,
  faCheckCircle,
  faClock,
  faTimesCircle,
  faBuilding,
  faCalendarCheck,
  faMapPin,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import { Presence } from '../../../../../src/services/api/presences';
import { User } from '../../../../../src/types';

export default function ControleurAgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const [agent, setAgent] = useState<User | null>(null);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    setNotFound(false);
    try {
      const [agentData, presencesData, assignmentsData] = await Promise.all([
        usersService.getById(id),
        usersService.getPresences(id, 30),
        usersService.getAssignments(id),
      ]);

      if (!agentData) {
        setNotFound(true);
        return;
      }

      setAgent(agentData);
      setPresences(presencesData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Erreur chargement agent:', error);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  // --- computed values ---

  const today = new Date().toISOString().split('T')[0];

  const todayPresence = presences.find(
    (p) => new Date(p.checkIn).toISOString().split('T')[0] === today
  );

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthPresences = presences.filter((p) => {
    const d = new Date(p.checkIn);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const validatedCount = monthPresences.filter((p) => p.status === 'VALIDATED').length;
  const pendingCount = monthPresences.filter((p) => p.status === 'PENDING').length;

  const last20 = presences.slice(0, 20);

  // --- helpers ---

  const getTodayStatusChip = () => {
    if (!todayPresence) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
          <FontAwesomeIcon icon={faTimesCircle} className="mr-1.5 text-gray-500" />
          Non pointé
        </span>
      );
    }
    if (todayPresence.status === 'VALIDATED') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5" />
          Présent
        </span>
      );
    }
    if (todayPresence.status === 'PENDING') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          <FontAwesomeIcon icon={faClock} className="mr-1.5" />
          En attente
        </span>
      );
    }
    if (todayPresence.status === 'REJECTED') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <FontAwesomeIcon icon={faTimesCircle} className="mr-1.5" />
          Rejeté
        </span>
      );
    }
    return null;
  };

  const getStatusBadge = (status: Presence['status']) => {
    switch (status) {
      case 'VALIDATED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
            Validé
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FontAwesomeIcon icon={faClock} className="mr-1" />
            En attente
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <FontAwesomeIcon icon={faTimesCircle} className="mr-1" />
            Rejeté
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (user: User) => {
    const first = user.firstName?.[0] ?? '';
    const last = user.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || user.email[0].toUpperCase();
  };

  // --- render states ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600 mb-4" />
          <p className="text-gray-600">Chargement de l'agent...</p>
        </div>
      </div>
    );
  }

  if (notFound || !agent) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-xl font-semibold text-gray-700">Agent introuvable</p>
        <p className="text-gray-500">L'agent demandé n'existe pas ou n'est plus disponible.</p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 text-sm"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Retour
          </button>

          {getTodayStatusChip()}
        </div>

        <div className="mt-5 flex items-center space-x-5">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xl font-bold flex-shrink-0">
            {getInitials(agent)}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {agent.fullName}
            </h1>

            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center">
                <FontAwesomeIcon icon={faEnvelope} className="mr-1.5 text-gray-400 text-xs" />
                {agent.email}
              </span>
              {agent.phone && (
                <span className="flex items-center">
                  <FontAwesomeIcon icon={faPhone} className="mr-1.5 text-gray-400 text-xs" />
                  {agent.phone}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                <FontAwesomeIcon icon={faUserShield} className="mr-1" />
                {agent.role}
              </span>
              {agent.isActive ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Actif
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Inactif
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards — 2x2 on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 flex items-center">
            <FontAwesomeIcon icon={faCalendarCheck} className="mr-1.5 text-indigo-400" />
            Pointages ce mois
          </p>
          <p className="mt-1 text-3xl font-bold text-indigo-600">{monthPresences.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 flex items-center">
            <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5 text-green-400" />
            Validés
          </p>
          <p className="mt-1 text-3xl font-bold text-green-600">{validatedCount}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 flex items-center">
            <FontAwesomeIcon icon={faClock} className="mr-1.5 text-yellow-400" />
            En attente
          </p>
          <p className="mt-1 text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 flex items-center">
            <FontAwesomeIcon icon={faMapPin} className="mr-1.5 text-blue-400" />
            Sites assignés
          </p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{assignments.length}</p>
        </div>
      </div>

      {/* Historique des présences */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Historique des présences
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">20 derniers pointages</p>
        </div>

        {last20.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <FontAwesomeIcon icon={faCalendarCheck} className="text-3xl text-gray-300 mb-3" />
            <p>Aucun pointage enregistré</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arrivée
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Départ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score suspicion
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {last20.map((presence) => (
                  <tr key={presence.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(presence.checkIn).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {presence.site?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {formatTime(presence.checkIn)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {formatTime(presence.checkOut)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(presence.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {presence.suspicionScore !== undefined && presence.suspicionScore !== null ? (
                        <span
                          className={`inline-flex items-center text-xs font-medium ${
                            presence.suspicionScore >= 70
                              ? 'text-red-600'
                              : presence.suspicionScore >= 40
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        >
                          {presence.suspicionScore >= 70 && (
                            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                          )}
                          {presence.suspicionScore}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sites assignés */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Sites assignés</h2>
        </div>

        {assignments.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <FontAwesomeIcon icon={faBuilding} className="text-3xl text-gray-300 mb-3" />
            <p>Aucun site assigné</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((assignment: any) => (
              <div
                key={assignment.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <FontAwesomeIcon icon={faBuilding} className="text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {assignment.site?.name ?? assignment.siteName ?? '—'}
                    </p>
                    {(assignment.site?.address ?? assignment.siteAddress) && (
                      <p className="text-sm text-gray-500 flex items-start mt-0.5">
                        <FontAwesomeIcon icon={faMapPin} className="mr-1 mt-0.5 flex-shrink-0 text-gray-400 text-xs" />
                        <span className="truncate">
                          {assignment.site?.address ?? assignment.siteAddress}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
