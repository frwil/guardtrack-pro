// app/dashboard/superviseur/assignments/create/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { assignmentsService } from '../../../../../src/services/api/assignments';
import { sitesService } from '../../../../../src/services/api/sites';
import { usersService } from '../../../../../src/services/api/users';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faTimes,
  faSpinner,
  faUser,
  faBuilding,
  faCalendar,
  faExclamationTriangle,
  faInfoCircle,
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

export default function CreateAssignmentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);
  const [formData, setFormData] = useState<AssignmentFormData>({
    agentId: '',
    siteId: '',
    startDate: '',
    endDate: '',
    isPermanent: false,
    replacesId: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AssignmentFormData, string>>>({});
  const [conflictWarning, setConflictWarning] = useState<string>('');
  const [selectedAgentAssignments, setSelectedAgentAssignments] = useState<any[]>([]);

  useEffect(() => {
    loadFormData();
  }, []);

  useEffect(() => {
    if (formData.agentId) {
      checkConflicts();
      loadAgentAssignments();
    }
  }, [formData.agentId, formData.startDate, formData.endDate, formData.isPermanent]);

  const loadFormData = async () => {
    setIsLoading(true);
    try {
      const [agentsData, sitesData, assignmentsData] = await Promise.all([
        usersService.getAgents(),
        sitesService.list({ isActive: true }),
        assignmentsService.list(),
      ]);

      setAgents(agentsData);
      setSites(sitesData);
      setExistingAssignments(assignmentsData);
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
        'Il y a des conflits avec des affectations existantes. Voulez-vous quand même créer cette affectation ?'
      );
      if (!confirmed) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Construire le payload avec undefined au lieu de null
      const payload: {
        agentId: number;
        siteId: number;
        startDate: string;
        endDate?: string;
        status: string;
        replacesId?: number;
        notes?: string;
      } = {
        agentId: parseInt(formData.agentId),
        siteId: parseInt(formData.siteId),
        startDate: formData.startDate,
        status: 'PENDING', // Par défaut en attente
      };

      // Ajouter endDate seulement si non permanent
      if (!formData.isPermanent && formData.endDate) {
        payload.endDate = formData.endDate;
      }

      // Ajouter replacesId seulement si défini
      if (formData.replacesId) {
        payload.replacesId = parseInt(formData.replacesId);
      }

      // Ajouter notes seulement si défini
      if (formData.notes) {
        payload.notes = formData.notes;
      }

      await assignmentsService.create(payload);
      router.push('/dashboard/superviseur/assignments');
    } catch (error: any) {
      console.error('Erreur de création:', error);
      alert(error.message || 'Erreur lors de la création de l\'affectation');
    } finally {
      setIsSubmitting(false);
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

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faCalendar} className="mr-3 text-indigo-600" />
            Nouvelle affectation
          </h1>
          <Link
            href="/dashboard/superviseur/assignments"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            Annuler
          </Link>
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
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
                min={getTodayDate()}
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

        {/* Notes */}
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
            disabled={isSubmitting}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                Création...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                Créer l'affectation
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}