'use client';

import { useEffect, useState } from 'react';
import { assignmentsService, AssignmentListItem } from '../../../../src/services/api/assignments';
import { sitesService } from '../../../../src/services/api/sites';
import { usersService } from '../../../../src/services/api/users';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faSearch,
  faFilter,
  faSpinner,
  faRotate,
  faEye,
  faEdit,
  faTrash,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faUser,
  faBuilding,
  faCalendar,
  faExclamationTriangle,
  faPlay,
  faStop,
  faCheck,
  faTimes,
  faWarning,
  faExchangeAlt,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

// Définition du type Assignment complet qui étend AssignmentListItem
// On utilise Omit pour enlever le site et le redéfinir avec address optionnel
interface Assignment extends Omit<AssignmentListItem, 'site'> {
  site: {
    id: number;
    name: string;
    address?: string;
  };
}

export default function SuperviseurAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<string>('');
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    completed: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAssignments();
  }, [assignments, searchTerm, statusFilter, siteFilter, agentFilter]);

  // Fonction pour vérifier les conflits d'affectation
  const checkAssignmentConflict = (
    agentId: number,
    startDate: string,
    endDate?: string | null,
    excludeAssignmentId?: number
  ): { hasConflict: boolean; conflictingAssignments: Assignment[] } => {
    const newStart = new Date(startDate);
    const newEnd = endDate ? new Date(endDate) : null;

    const conflictingAssignments = assignments.filter(assignment => {
      // Ignorer l'affectation en cours de modification
      if (excludeAssignmentId && assignment.id === excludeAssignmentId) {
        return false;
      }

      // Vérifier si c'est le même agent
      if (assignment.agent.id !== agentId) {
        return false;
      }

      // Ignorer les affectations annulées ou terminées
      if (assignment.status === 'CANCELLED' || assignment.status === 'COMPLETED') {
        return false;
      }

      const existingStart = new Date(assignment.startDate);
      const existingEnd = assignment.endDate ? new Date(assignment.endDate) : null;

      // Vérifier le chevauchement des périodes
      if (newEnd && existingEnd) {
        // Les deux ont des dates de fin
        return (
          (newStart <= existingEnd && newEnd >= existingStart) ||
          (existingStart <= newEnd && existingEnd >= newStart)
        );
      } else if (!newEnd && !existingEnd) {
        // Aucune n'a de date de fin (affectations permanentes)
        return true;
      } else if (!newEnd && existingEnd) {
        // Nouvelle affectation sans date de fin
        return existingEnd >= newStart;
      } else if (newEnd && !existingEnd) {
        // Affectation existante sans date de fin
        return newEnd >= existingStart;
      }

      return false;
    });

    return {
      hasConflict: conflictingAssignments.length > 0,
      conflictingAssignments,
    };
  };

  // Fonction pour formater le message de conflit
  const formatConflictMessage = (conflictingAssignments: Assignment[]): string => {
    const conflicts = conflictingAssignments.map(assignment => {
      const siteName = assignment.site.name;
      const period = assignment.endDate 
        ? `du ${formatDate(assignment.startDate)} au ${formatDate(assignment.endDate)}`
        : `depuis le ${formatDate(assignment.startDate)} (permanent)`;
      return `• Site "${siteName}" ${period}`;
    });

    return `Cet agent est déjà assigné sur les périodes suivantes :\n${conflicts.join('\n')}`;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assignmentsData, sitesData, agentsData] = await Promise.all([
        assignmentsService.list(),
        sitesService.list({ isActive: true }),
        usersService.getAgents(),
      ]);

      // Ajouter des adresses fictives si nécessaire pour la démo
      const assignmentsWithAddress = (assignmentsData as any[]).map(assignment => ({
        ...assignment,
        site: {
          ...assignment.site,
          address: assignment.site.address || 'Adresse non spécifiée'
        }
      }));

      setAssignments(assignmentsWithAddress as Assignment[]);
      setSites(sitesData);
      setAgents(agentsData);

      // Calculer les statistiques
      setStats({
        total: assignmentsData.length,
        active: assignmentsData.filter((a: any) => a.status === 'ACTIVE').length,
        pending: assignmentsData.filter((a: any) => a.status === 'PENDING').length,
        completed: assignmentsData.filter((a: any) => a.status === 'COMPLETED').length,
      });

      // Vérifier les conflits existants dans les données chargées
      checkExistingConflicts(assignmentsWithAddress as Assignment[]);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour vérifier les conflits dans les données existantes
  const checkExistingConflicts = (assignmentsData: Assignment[]) => {
    const agentAssignments = new Map<number, Assignment[]>();
    
    // Grouper les affectations par agent
    assignmentsData.forEach(assignment => {
      if (assignment.status === 'ACTIVE' || assignment.status === 'PENDING') {
        const agentId = assignment.agent.id;
        if (!agentAssignments.has(agentId)) {
          agentAssignments.set(agentId, []);
        }
        agentAssignments.get(agentId)!.push(assignment);
      }
    });

    // Vérifier les conflits pour chaque agent
    let hasConflicts = false;
    agentAssignments.forEach((agentAssignmentsList, agentId) => {
      for (let i = 0; i < agentAssignmentsList.length; i++) {
        for (let j = i + 1; j < agentAssignmentsList.length; j++) {
          const assignment1 = agentAssignmentsList[i];
          const assignment2 = agentAssignmentsList[j];
          
          if (haveOverlappingPeriods(assignment1, assignment2)) {
            hasConflicts = true;
            console.warn(`Conflit détecté pour l'agent ${assignment1.agent.fullName} entre les affectations ${assignment1.id} et ${assignment2.id}`);
          }
        }
      }
    });

    if (hasConflicts) {
      console.warn('Des conflits d\'affectation ont été détectés dans les données existantes.');
    }
  };

  // Fonction utilitaire pour vérifier le chevauchement de périodes
  const haveOverlappingPeriods = (a1: Assignment, a2: Assignment): boolean => {
    const start1 = new Date(a1.startDate);
    const end1 = a1.endDate ? new Date(a1.endDate) : null;
    const start2 = new Date(a2.startDate);
    const end2 = a2.endDate ? new Date(a2.endDate) : null;

    if (end1 && end2) {
      return (start1 <= end2 && (end1 ?? start1) >= start2);
    } else if (!end1 && !end2) {
      return true;
    } else if (!end1 && end2) {
      return end2 >= start1;
    } else if (end1 && !end2) {
      return end1 >= start2;
    }

    return false;
  };

  const filterAssignments = () => {
    let filtered = [...assignments];

    if (searchTerm) {
      filtered = filtered.filter(a =>
        a.agent.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.site.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    if (siteFilter) {
      filtered = filtered.filter(a => a.site.id.toString() === siteFilter);
    }

    if (agentFilter) {
      filtered = filtered.filter(a => a.agent.id.toString() === agentFilter);
    }

    // Trier par date de début (plus récent d'abord)
    filtered.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    setFilteredAssignments(filtered);
  };

  const handleComplete = async () => {
    if (!selectedAssignment) return;

    setIsProcessing(true);
    try {
      await assignmentsService.complete(selectedAssignment.id);
      await loadData();
      setShowCompleteModal(false);
      setSelectedAssignment(null);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la complétion de l\'affectation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedAssignment) return;

    setIsProcessing(true);
    try {
      await assignmentsService.cancel(selectedAssignment.id);
      await loadData();
      setShowDeleteModal(false);
      setSelectedAssignment(null);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'annulation de l\'affectation');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string; icon: any }> = {
      ACTIVE: { color: 'bg-green-100 text-green-800', text: 'Actif', icon: faPlay },
      INACTIVE: { color: 'bg-gray-100 text-gray-800', text: 'Inactif', icon: faStop },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', text: 'En attente', icon: faClock },
      COMPLETED: { color: 'bg-blue-100 text-blue-800', text: 'Terminé', icon: faCheckCircle },
      CANCELLED: { color: 'bg-red-100 text-red-800', text: 'Annulé', icon: faTimesCircle },
    };
    return badges[status] || { color: 'bg-gray-100 text-gray-800', text: status, icon: faClock };
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faCalendar} className="mr-3 text-indigo-600" />
              Gestion des affectations
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredAssignments.length} affectation{filteredAssignments.length > 1 ? 's' : ''} trouvée{filteredAssignments.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faRotate} className="mr-2" />
              Actualiser
            </button>
            
            {/* Bouton Switch Intelligent */}
            <Link
              href="/dashboard/superviseur/assignments/smart-switch"
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 flex items-center shadow-md hover:shadow-lg transition-all"
              title="Switch Intelligent - Échange ou remplacement rapide d'agents"
            >
              <FontAwesomeIcon icon={faExchangeAlt} className="mr-2" />
              Switch Intelligent
            </Link>
            
            <Link
              href="/dashboard/superviseur/assignments/create"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Nouvelle affectation
            </Link>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Actives</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">En attente</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Terminées</p>
          <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">Actives</option>
              <option value="PENDING">En attente</option>
              <option value="COMPLETED">Terminées</option>
              <option value="CANCELLED">Annulées</option>
            </select>
          </div>

          <div className="relative">
            <FontAwesomeIcon icon={faBuilding} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Tous les sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <FontAwesomeIcon icon={faUser} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Tous les agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.fullName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des affectations */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Aucune affectation trouvée
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment) => {
                  const statusBadge = getStatusBadge(assignment.status);
                  
                  // Vérifier si cette affectation a des conflits
                  const conflict = checkAssignmentConflict(
                    assignment.agent.id,
                    assignment.startDate,
                    assignment.endDate,
                    assignment.id
                  );

                  return (
                    <tr key={assignment.id} className={`hover:bg-gray-50 ${conflict.hasConflict ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                            <FontAwesomeIcon icon={faUser} className="text-indigo-600" />
                          </div>
                          <div>
                            <div className="flex items-center">
                              <p className="font-medium text-gray-900">{assignment.agent.fullName}</p>
                              {conflict.hasConflict && (
                                <button
                                  onClick={() => {
                                    setConflictMessage(formatConflictMessage(conflict.conflictingAssignments));
                                    setShowConflictModal(true);
                                  }}
                                  className="ml-2 text-red-500 hover:text-red-700"
                                  title="Conflit d'affectation détecté"
                                >
                                  <FontAwesomeIcon icon={faWarning} />
                                </button>
                              )}
                            </div>
                            {assignment.replaces && (
                              <p className="text-xs text-gray-500">
                                Remplace : {assignment.replaces.agent.fullName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{assignment.site.name}</p>
                        <p className="text-sm text-gray-500">
                          {assignment.site.address ? assignment.site.address.substring(0, 30) + '...' : 'Adresse non disponible'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">
                          <FontAwesomeIcon icon={faCalendar} className="mr-1 text-gray-400" />
                          {formatDate(assignment.startDate)}
                        </p>
                        {assignment.endDate && (
                          <p className="text-sm text-gray-600">
                            → {formatDate(assignment.endDate)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit ${statusBadge.color}`}>
                          <FontAwesomeIcon icon={statusBadge.icon} className="mr-1" />
                          {statusBadge.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link
                          href={`/dashboard/superviseur/assignments/${assignment.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Voir"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </Link>
                        <Link
                          href={`/dashboard/superviseur/assignments/${assignment.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </Link>
                        {assignment.status === 'ACTIVE' && (
                          <button
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowCompleteModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Terminer"
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </button>
                        )}
                        {(assignment.status === 'ACTIVE' || assignment.status === 'PENDING') && (
                          <button
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Annuler"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmation d'annulation */}
      {showDeleteModal && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-red-500 mr-3" />
              <h2 className="text-xl font-semibold">Confirmer l'annulation</h2>
            </div>
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir annuler l'affectation de <strong>{selectedAssignment.agent.fullName}</strong> sur le site <strong>{selectedAssignment.site.name}</strong> ?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAssignment(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isProcessing ? 'Annulation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de complétion */}
      {showCompleteModal && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faCheckCircle} className="text-3xl text-green-500 mr-3" />
              <h2 className="text-xl font-semibold">Terminer l'affectation</h2>
            </div>
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir marquer comme terminée l'affectation de <strong>{selectedAssignment.agent.fullName}</strong> sur le site <strong>{selectedAssignment.site.name}</strong> ?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setSelectedAssignment(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleComplete}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessing ? 'Terminaison...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'affichage des conflits */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faWarning} className="text-3xl text-red-500 mr-3" />
              <h2 className="text-xl font-semibold">Conflit d'affectation détecté</h2>
            </div>
            <div className="text-gray-700 mb-6 whitespace-pre-line">
              {conflictMessage}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowConflictModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}