// app/dashboard/superviseur/assignments/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { assignmentsService } from '../../../../../../src/services/api/assignments';
import { sitesService } from '../../../../../../src/services/api/sites';
import { usersService } from '../../../../../../src/services/api/users';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faSpinner,
  faUser,
  faBuilding,
  faCalendar,
  faExclamationTriangle,
  faInfoCircle,
  faArrowLeft,
  faTrash,
  faEdit,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

interface AssignmentFormData {
  agentId: string;
  siteId: string;
  startDate: string;
  endDate: string;
  isPermanent: boolean;
  replacesId?: string;
  notes?: string;
  status: string;
}

interface Agent {
  id: number;
  fullName: string;
  email: string;
}

interface Site {
  id: number;
  name: string;
  address: string;
}

// Interface correspondant exactement à ce que retourne l'API
interface Assignment {
  id: number;
  agent: { id: number; fullName: string };
  site: { id: number; name: string; address?: string };
  startDate: string;
  endDate?: string | null;
  status: string;
  replaces?: { id: number; agent: { fullName: string } } | null;
  createdAt: string;
  // notes n'est pas retourné par l'API getById
}

export default function EditAssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = parseInt(params.id as string);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);
  const [originalAssignment, setOriginalAssignment] = useState<Assignment | null>(null);
  const [formData, setFormData] = useState<AssignmentFormData>({
    agentId: '',
    siteId: '',
    startDate: '',
    endDate: '',
    isPermanent: false,
    replacesId: '',
    notes: '',
    status: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AssignmentFormData, string>>>({});
  const [conflictWarning, setConflictWarning] = useState<string>('');
  const [selectedAgentAssignments, setSelectedAgentAssignments] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, [assignmentId]);

  useEffect(() => {
    if (formData.agentId && hasChanges) {
      checkConflicts();
      loadAgentAssignments();
    }
  }, [formData.agentId, formData.startDate, formData.endDate, formData.isPermanent]);

  useEffect(() => {
    // Vérifier si des modifications ont été apportées
    if (originalAssignment) {
      const changed = 
        formData.agentId !== originalAssignment.agent.id.toString() ||
        formData.siteId !== originalAssignment.site.id.toString() ||
        formData.startDate !== originalAssignment.startDate.split('T')[0] ||
        formData.endDate !== (originalAssignment.endDate?.split('T')[0] || '') ||
        formData.isPermanent !== !originalAssignment.endDate ||
        formData.replacesId !== (originalAssignment.replaces?.id.toString() || '') ||
        formData.status !== originalAssignment.status;
      
      setHasChanges(changed);
    }
  }, [formData, originalAssignment]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assignmentData, agentsData, sitesData, assignmentsData] = await Promise.all([
        assignmentsService.getById(assignmentId),
        usersService.getAgents(),
        sitesService.list({ isActive: true }),
        assignmentsService.list(),
      ]);

      // Vérifier si l'affectation existe
      if (!assignmentData) {
        console.error('Affectation non trouvée');
        setOriginalAssignment(null);
        setIsLoading(false);
        return;
      }

      setOriginalAssignment(assignmentData);
      setAgents(agentsData);
      setSites(sitesData);
      setExistingAssignments(assignmentsData.filter((a: any) => a.id !== assignmentId));

      // Initialiser le formulaire
      setFormData({
        agentId: assignmentData.agent.id.toString(),
        siteId: assignmentData.site.id.toString(),
        startDate: assignmentData.startDate.split('T')[0],
        endDate: assignmentData.endDate?.split('T')[0] || '',
        isPermanent: !assignmentData.endDate,
        replacesId: assignmentData.replaces?.id.toString() || '',
        notes: '', // L'API ne retourne pas les notes
        status: assignmentData.status,
      });

      // Charger les affectations de l'agent
      const agentAssignments = assignmentsData.filter(
        (a: any) => a.agent.id === assignmentData.agent.id && 
        a.id !== assignmentId &&
        (a.status === 'ACTIVE' || a.status === 'PENDING')
      );
      setSelectedAgentAssignments(agentAssignments);
    } catch (error) {
      console.error('Erreur de chargement:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAgentAssignments = () => {
    const agentId = parseInt(formData.agentId);
    const assignments = existingAssignments.filter(
      a => a.agent.id === agentId && 
      (a.status === 'ACTIVE' || a.status === 'PENDING')
    );
    setSelectedAgentAssignments(assignments);
  };

  const checkConflicts = () => {
    if (!formData.agentId || !formData.startDate) {
      setConflictWarning('');
      return;
    }

    const agentId = parseInt(formData.agentId);
    const startDate = new Date(formData.startDate);
    const endDate = formData.isPermanent ? null : (formData.endDate ? new Date(formData.endDate) : null);

    const conflicts = existingAssignments.filter(assignment => {
      if (assignment.agent.id !== agentId) return false;
      if (assignment.status === 'CANCELLED' || assignment.status === 'COMPLETED') return false;

      const existingStart = new Date(assignment.startDate);
      const existingEnd = assignment.endDate ? new Date(assignment.endDate) : null;

      if (endDate && existingEnd) {
        return (startDate <= existingEnd && endDate >= existingStart);
      } else if (!endDate && !existingEnd) {
        return true;
      } else if (!endDate && existingEnd) {
        return existingEnd >= startDate;
      } else if (endDate && !existingEnd) {
        return endDate >= existingStart;
      }
      return false;
    });

    if (conflicts.length > 0) {
      const conflictDetails = conflicts.map(c => 
        `• ${c.site.name} (du ${formatDate(c.startDate)} ${c.endDate ? `au ${formatDate(c.endDate)}` : ' - Permanent'})`
      ).join('\n');
      setConflictWarning(`Attention : Cet agent a déjà des affectations qui chevauchent cette période :\n${conflictDetails}`);
    } else {
      setConflictWarning('');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AssignmentFormData, string>> = {};

    if (!formData.agentId) {
      newErrors.agentId = 'L\'agent est requis';
    }

    if (!formData.siteId) {
      newErrors.siteId = 'Le site est requis';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'La date de début est requise';
    }

    if (!formData.isPermanent && !formData.endDate) {
      newErrors.endDate = 'La date de fin est requise pour une affectation temporaire';
    }

    if (formData.startDate && formData.endDate && !formData.isPermanent) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = 'La date de fin doit être postérieure à la date de début';
      }
    }

    if (!formData.status) {
      newErrors.status = 'Le statut est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Vérifier s'il y a des conflits et demander confirmation
    if (conflictWarning) {
      const confirmed = window.confirm(
        'Il y a des conflits avec des affectations existantes. Voulez-vous quand même modifier cette affectation ?'
      );
      if (!confirmed) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {};
      
      // Ne mettre à jour que les champs qui ont changé
      if (formData.agentId !== originalAssignment?.agent.id.toString()) {
        payload.agentId = parseInt(formData.agentId);
      }
      if (formData.siteId !== originalAssignment?.site.id.toString()) {
        payload.siteId = parseInt(formData.siteId);
      }
      if (formData.startDate !== originalAssignment?.startDate.split('T')[0]) {
        payload.startDate = formData.startDate;
      }
      
      const newEndDate = formData.isPermanent ? undefined : (formData.endDate || undefined);
      const originalEndDate = originalAssignment?.endDate || undefined;
      if (newEndDate !== originalEndDate) {
        payload.endDate = newEndDate;
      }
      
      if (formData.replacesId !== (originalAssignment?.replaces?.id.toString() || '')) {
        payload.replacesId = formData.replacesId ? parseInt(formData.replacesId) : undefined;
      }
      
      // Ne pas inclure notes dans le payload car l'API update ne l'accepte pas
      // if (formData.notes !== '') {
      //   payload.notes = formData.notes || undefined;
      // }
      
      if (formData.status !== originalAssignment?.status) {
        payload.status = formData.status;
      }

      // Si aucun changement, ne pas envoyer de requête
      if (Object.keys(payload).length === 0) {
        alert('Aucune modification détectée');
        router.push('/dashboard/superviseur/assignments');
        return;
      }

      await assignmentsService.update(assignmentId, payload);
      router.push('/dashboard/superviseur/assignments');
    } catch (error: any) {
      console.error('Erreur de modification:', error);
      alert(error.message || 'Erreur lors de la modification de l\'affectation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAssignment = async () => {
    setIsCancelling(true);
    try {
      await assignmentsService.cancel(assignmentId);
      router.push('/dashboard/superviseur/assignments');
    } catch (error: any) {
      console.error('Erreur d\'annulation:', error);
      alert(error.message || 'Erreur lors de l\'annulation de l\'affectation');
    } finally {
      setIsCancelling(false);
      setShowCancelModal(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Effacer l'erreur du champ modifié
    if (errors[name as keyof AssignmentFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const canEdit = originalAssignment && 
    (originalAssignment.status === 'ACTIVE' || originalAssignment.status === 'PENDING');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
      </div>
    );
  }

  if (!originalAssignment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Affectation non trouvée</p>
        <Link href="/dashboard/superviseur/assignments" className="text-indigo-600 hover:text-indigo-800">
          Retour à la liste
        </Link>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faEdit} className="mr-3 text-indigo-600" />
              Modification impossible
            </h1>
            <Link
              href="/dashboard/superviseur/assignments"
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Retour
            </Link>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 text-2xl mr-3 mt-1" />
            <div>
              <h2 className="font-semibold text-yellow-900 mb-2">
                Cette affectation ne peut pas être modifiée
              </h2>
              <p className="text-yellow-800">
                Seules les affectations actives ou en attente peuvent être modifiées.
                Cette affectation est actuellement <strong>{originalAssignment.status}</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/dashboard/superviseur/assignments"
              className="mr-4 text-gray-400 hover:text-gray-600"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faEdit} className="mr-3 text-indigo-600" />
              Modifier l'affectation #{assignmentId}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
            >
              <FontAwesomeIcon icon={faTrash} className="mr-2" />
              Annuler l'affectation
            </button>
          </div>
        </div>
        
        {/* Informations de création */}
        <div className="mt-4 text-sm text-gray-500">
          Créée le {formatDateTime(originalAssignment.createdAt)}
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Statut */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Statut de l'affectation
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              errors.status ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="PENDING">En attente</option>
            <option value="ACTIVE">Active</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status}</p>
          )}
        </div>

        {/* Agent */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-400" />
            Agent <span className="text-red-500">*</span>
          </label>
          <select
            name="agentId"
            value={formData.agentId}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              errors.agentId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Sélectionner un agent</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.fullName} ({agent.email})
              </option>
            ))}
          </select>
          {errors.agentId && (
            <p className="mt-1 text-sm text-red-600">{errors.agentId}</p>
          )}
        </div>

        {/* Affectations existantes de l'agent sélectionné */}
        {selectedAgentAssignments.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mr-3 mt-1" />
              <div>
                <h3 className="font-medium text-blue-900 mb-2">
                  Affectations existantes de cet agent
                </h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  {selectedAgentAssignments.map(assignment => (
                    <li key={assignment.id}>
                      • {assignment.site.name} - {formatDate(assignment.startDate)}
                      {assignment.endDate ? ` au ${formatDate(assignment.endDate)}` : ' (Permanent)'}
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                        assignment.status === 'ACTIVE' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
                      }`}>
                        {assignment.status === 'ACTIVE' ? 'Actif' : 'En attente'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Site */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FontAwesomeIcon icon={faBuilding} className="mr-2 text-gray-400" />
            Site <span className="text-red-500">*</span>
          </label>
          <select
            name="siteId"
            value={formData.siteId}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              errors.siteId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Sélectionner un site</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>
                {site.name} - {site.address}
              </option>
            ))}
          </select>
          {errors.siteId && (
            <p className="mt-1 text-sm text-red-600">{errors.siteId}</p>
          )}
        </div>

        {/* Période */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
              )}
            </div>

            {!formData.isPermanent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate || getTodayDate()}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    errors.endDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isPermanent"
              id="isPermanent"
              checked={formData.isPermanent}
              onChange={handleChange}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="isPermanent" className="ml-2 text-sm text-gray-700">
              Affectation permanente (sans date de fin)
            </label>
          </div>
        </div>

        {/* Remplacement */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Remplace un agent (optionnel)
          </label>
          <select
            name="replacesId"
            value={formData.replacesId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Aucun remplacement</option>
            {agents
              .filter(agent => agent.id.toString() !== formData.agentId)
              .map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.fullName}
                </option>
              ))}
          </select>
        </div>

        {/* Notes - Désactivé car l'API update ne supporte pas notes */}
        {/* 
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optionnel)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Informations complémentaires..."
          />
        </div>
        */}

        {/* Avertissement de conflit */}
        {conflictWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mr-3 mt-1" />
              <div className="text-sm text-yellow-800 whitespace-pre-line">
                {conflictWarning}
              </div>
            </div>
          </div>
        )}

        {/* Indicateur de modifications */}
        {hasChanges && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
              Des modifications ont été apportées. N'oubliez pas de sauvegarder.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Link
            href="/dashboard/superviseur/assignments"
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !hasChanges}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                Sauvegarde...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                Sauvegarder les modifications
              </>
            )}
          </button>
        </div>
      </form>

      {/* Modal de confirmation d'annulation */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-red-500 mr-3" />
              <h2 className="text-xl font-semibold">Confirmer l'annulation</h2>
            </div>
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir annuler définitivement cette affectation ? Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Retour
              </button>
              <button
                onClick={handleCancelAssignment}
                disabled={isCancelling}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isCancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}