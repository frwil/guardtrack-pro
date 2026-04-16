// app/dashboard/superviseur/assignments/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { assignmentsService } from '../../../../../src/services/api/assignments';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faEdit,
  faTrash,
  faArrowLeft,
  faUser,
  faBuilding,
  faCalendar,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faPlay,
  faStop,
  faStickyNote,
  faExchangeAlt,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadAssignment();
  }, [params.id]);

  const loadAssignment = async () => {
    setIsLoading(true);
    try {
      const data = await assignmentsService.getById(parseInt(params.id as string));
      setAssignment(data);
    } catch (error) {
      console.error('Erreur de chargement:', error);
      alert('Erreur lors du chargement de l\'affectation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      await assignmentsService.complete(assignment.id);
      await loadAssignment();
      setShowCompleteModal(false);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la complétion de l\'affectation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      await assignmentsService.cancel(assignment.id);
      router.push('/dashboard/superviseur/assignments');
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

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Affectation non trouvée</p>
        <Link href="/dashboard/superviseur/assignments" className="text-indigo-600 hover:text-indigo-800">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const statusBadge = getStatusBadge(assignment.status);

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
            <h1 className="text-2xl font-bold text-gray-900">
              Détail de l'affectation
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            {(assignment.status === 'ACTIVE' || assignment.status === 'PENDING') && (
              <>
                <Link
                  href={`/dashboard/superviseur/assignments/${assignment.id}/edit`}
                  className="px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200"
                >
                  <FontAwesomeIcon icon={faEdit} className="mr-2" />
                  Modifier
                </Link>
                {assignment.status === 'ACTIVE' && (
                  <button
                    onClick={() => setShowCompleteModal(true)}
                    className="px-4 py-2 text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
                  >
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                    Terminer
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
                >
                  <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                  Annuler
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Informations principales */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Informations générales</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${statusBadge.color}`}>
            <FontAwesomeIcon icon={statusBadge.icon} className="mr-2" />
            {statusBadge.text}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-start">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
              <FontAwesomeIcon icon={faUser} className="text-indigo-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Agent</p>
              <p className="font-medium text-gray-900 text-lg">{assignment.agent.fullName}</p>
              <p className="text-sm text-gray-600">{assignment.agent.email}</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <FontAwesomeIcon icon={faBuilding} className="text-green-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Site</p>
              <p className="font-medium text-gray-900 text-lg">{assignment.site.name}</p>
              <p className="text-sm text-gray-600">{assignment.site.address}</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <FontAwesomeIcon icon={faCalendar} className="text-blue-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Période</p>
              <p className="font-medium text-gray-900">
                Du {formatDate(assignment.startDate)}
                {assignment.endDate ? ` au ${formatDate(assignment.endDate)}` : ' (Permanent)'}
              </p>
              <p className="text-sm text-gray-600">
                Créée le {formatDateTime(assignment.createdAt)}
              </p>
            </div>
          </div>

          {assignment.replaces && (
            <div className="flex items-start">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                <FontAwesomeIcon icon={faExchangeAlt} className="text-yellow-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Remplace</p>
                <p className="font-medium text-gray-900">{assignment.replaces.agent.fullName}</p>
              </div>
            </div>
          )}
        </div>

        {assignment.notes && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-start">
              <FontAwesomeIcon icon={faStickyNote} className="text-gray-400 mr-3 mt-1" />
              <div>
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-gray-700 whitespace-pre-line">{assignment.notes}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faTimesCircle} className="text-3xl text-red-500 mr-3" />
              <h2 className="text-xl font-semibold">Confirmer l'annulation</h2>
            </div>
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir annuler cette affectation ? Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
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

      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faCheckCircle} className="text-3xl text-green-500 mr-3" />
              <h2 className="text-xl font-semibold">Terminer l'affectation</h2>
            </div>
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir marquer cette affectation comme terminée ?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCompleteModal(false)}
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
    </div>
  );
}