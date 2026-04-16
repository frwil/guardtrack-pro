// app/dashboard/admin/sites/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { sitesService, Site } from '../../../../../src/services/api/sites';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner, faArrowLeft, faEdit, faTrash, faBuilding,
  faMapMarkerAlt, faQrcode, faCalendar, faToggleOn, faToggleOff,
  faUsers, faClock, faCheckCircle, faTimesCircle, faPlay,
  faLayerGroup, faLocationDot, faCircle, faExclamationTriangle,
  faChartBar,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

export default function AdminSiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = parseInt(params.id as string);

  const [site, setSite] = useState<Site | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [children, setChildren] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'children' | 'qr'>('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadSiteData();
  }, [siteId]);

  const loadSiteData = async () => {
    setIsLoading(true);
    try {
      const [siteData, assignmentsData, childrenData] = await Promise.all([
        sitesService.getById(siteId),
        sitesService.getAssignments(siteId),
        sitesService.getChildren(siteId),
      ]);

      if (!siteData) {
        router.push('/dashboard/admin/sites');
        return;
      }

      setSite(siteData);
      setAssignments(assignmentsData);
      setChildren(childrenData);

      setStats({
        totalAssignments: assignmentsData.length,
        activeAssignments: assignmentsData.filter((a: any) => 
          a.status === 'ACTIVE' || a.status === 'PENDING'
        ).length,
      });
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!site) return;

    setIsDeleting(true);
    try {
      await sitesService.delete(site.id);
      router.push('/dashboard/admin/sites');
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string; icon: any }> = {
      ACTIVE: { color: 'bg-green-100 text-green-800', text: 'Actif', icon: faPlay },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', text: 'En attente', icon: faClock },
      COMPLETED: { color: 'bg-blue-100 text-blue-800', text: 'Terminé', icon: faCheckCircle },
      CANCELLED: { color: 'bg-red-100 text-red-800', text: 'Annulé', icon: faTimesCircle },
    };
    return badges[status] || { color: 'bg-gray-100 text-gray-800', text: status, icon: faClock };
  };

  const siteTypes: Record<string, string> = {
    'PRINCIPAL': '🏢 Site Principal',
    'SECONDAIRE': '🏪 Site Secondaire',
    'ENTREPOT': '📦 Entrepôt',
    'PARKING': '🅿️ Parking',
    'BUREAU': '📋 Bureau',
    'AUTRE': '📍 Autre',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Site non trouvé</p>
        <Link href="/dashboard/admin/sites" className="text-indigo-600 hover:text-indigo-800">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* En-tête avec bouton Supprimer */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard/admin/sites" className="mr-4 text-gray-400 hover:text-gray-600">
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FontAwesomeIcon icon={faBuilding} className="mr-3 text-indigo-600" />
                {site.name}
              </h1>
              <div className="flex items-center mt-1 space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  site.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  <FontAwesomeIcon icon={site.isActive ? faToggleOn : faToggleOff} className="mr-1" />
                  {site.isActive ? 'Site actif' : 'Site inactif'}
                </span>
                <span className="text-sm text-gray-600">{siteTypes[site.type] || site.type}</span>
                <span className="text-sm text-gray-600">Client : {site.client?.name || 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
            >
              <FontAwesomeIcon icon={faTrash} className="mr-2" />
              Supprimer
            </button>
            <Link
              href={`/dashboard/admin/sites/${siteId}/edit`}
              className="px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200"
            >
              <FontAwesomeIcon icon={faEdit} className="mr-2" />
              Modifier
            </Link>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Affectations actives</p>
            <p className="text-2xl font-bold text-green-600">{stats.activeAssignments}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total affectations</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalAssignments}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Sites enfants</p>
            <p className="text-2xl font-bold text-purple-600">{children.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">QR Code</p>
            <p className="text-2xl font-bold text-orange-600">{site.qrCode ? '✓' : '✗'}</p>
          </div>
        </div>
      )}

      {/* Onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {(['overview', 'assignments', 'children'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'overview' && 'Vue d\'ensemble'}
                {tab === 'assignments' && `Affectations (${assignments.length})`}
                {tab === 'children' && `Sites enfants (${children.length})`}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Informations générales</h3>
                <div className="space-y-3">
                  <div><p className="text-sm text-gray-500">Nom</p><p className="font-medium">{site.name}</p></div>
                  <div><p className="text-sm text-gray-500">Type</p><p>{siteTypes[site.type] || site.type}</p></div>
                  <div><p className="text-sm text-gray-500">Client</p><p>{site.client?.name || 'N/A'}</p></div>
                  <div><p className="text-sm text-gray-500">Créé le</p><p>{formatDateTime(site.createdAt)}</p></div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Localisation</h3>
                <div className="space-y-3">
                  <div><p className="text-sm text-gray-500">Adresse</p><p>{site.address}</p></div>
                  {(site.latitude && site.longitude) && (
                    <div><p className="text-sm text-gray-500">GPS</p><p className="font-mono">{parseFloat(site.latitude).toFixed(6)}, {parseFloat(site.longitude).toFixed(6)}</p></div>
                  )}
                  <div><p className="text-sm text-gray-500">Géorepérage</p><p>{site.geofencingRadius} mètres</p></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div>
              {assignments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune affectation</p>
              ) : (
                <div className="space-y-2">
                  {assignments.map((assignment) => {
                    const statusBadge = getStatusBadge(assignment.status);
                    return (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faUsers} className="text-gray-400 mr-3" />
                          <div>
                            <p className="font-medium">{assignment.agent?.fullName || 'N/A'}</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(assignment.startDate)}
                              {assignment.endDate && ` → ${formatDate(assignment.endDate)}`}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${statusBadge.color}`}>
                          <FontAwesomeIcon icon={statusBadge.icon} className="mr-1" />
                          {statusBadge.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'children' && (
            <div>
              {children.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun site enfant</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {children.map((child) => (
                    <Link key={child.id} href={`/dashboard/admin/sites/${child.id}`} className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{child.name}</p>
                          <p className="text-sm text-gray-600 truncate">{child.address}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${child.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {child.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-red-500 mr-3" />
              <h2 className="text-xl font-semibold">Confirmer la suppression</h2>
            </div>
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir supprimer définitivement le site <strong>{site.name}</strong> ?<br />
              <span className="text-red-600 text-sm">Cette action est irréversible.</span>
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}