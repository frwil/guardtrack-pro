// app/dashboard/superviseur/sites/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { sitesService, Site } from '../../../../../src/services/api/sites';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faArrowLeft,
  faEdit,
  faBuilding,
  faMapMarkerAlt,
  faUser,
  faQrcode,
  faCalendar,
  faToggleOn,
  faToggleOff,
  faUsers,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faPlay,
  faStop,
  faLayerGroup,
  faLocationDot,
  faCircle,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

interface SiteStats {
  totalAssignments: number;
  activeAssignments: number;
  totalPresences: number;
  validatedPresences: number;
  pendingPresences: number;
  rejectedPresences: number;
}

export default function SuperviseurSiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = parseInt(params.id as string);

  const [site, setSite] = useState<Site | null>(null);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [children, setChildren] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'children' | 'qr'>('overview');
  const [showQrModal, setShowQrModal] = useState(false);

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
        router.push('/dashboard/superviseur/sites');
        return;
      }

      setSite(siteData);
      setAssignments(assignmentsData);
      setChildren(childrenData);

      // Calculer les statistiques
      setStats({
        totalAssignments: assignmentsData.length,
        activeAssignments: assignmentsData.filter((a: any) => 
          a.status === 'ACTIVE' || a.status === 'PENDING'
        ).length,
        totalPresences: 0,
        validatedPresences: 0,
        pendingPresences: 0,
        rejectedPresences: 0,
      });
    } catch (error) {
      console.error('Erreur de chargement:', error);
      alert('Erreur lors du chargement des données du site');
    } finally {
      setIsLoading(false);
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
        <Link href="/dashboard/superviseur/sites" className="text-indigo-600 hover:text-indigo-800">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/dashboard/superviseur/sites"
              className="mr-4 text-gray-400 hover:text-gray-600"
            >
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
                <span className="text-sm text-gray-600">
                  {siteTypes[site.type] || site.type}
                </span>
                <span className="text-sm text-gray-600">
                  Client : {site.client?.name || 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowQrModal(true)}
              className="px-4 py-2 text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
            >
              <FontAwesomeIcon icon={faQrcode} className="mr-2" />
              QR Code
            </button>
            <Link
              href={`/dashboard/superviseur/sites/${siteId}/edit`}
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
            <p className="text-2xl font-bold text-orange-600">
              {site.qrCode ? '✓' : '✗'}
            </p>
          </div>
        </div>
      )}

      {/* Onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {(['overview', 'assignments', 'children', 'qr'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'overview' && 'Vue d\'ensemble'}
                {tab === 'assignments' && `Affectations (${assignments.length})`}
                {tab === 'children' && `Sites enfants (${children.length})`}
                {tab === 'qr' && 'QR Code'}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Vue d'ensemble */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations générales */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faBuilding} className="mr-2 text-indigo-600" />
                  Informations générales
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Nom du site</p>
                    <p className="font-medium text-gray-900">{site.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="text-gray-900">{siteTypes[site.type] || site.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Client</p>
                    <p className="text-gray-900">{site.client?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date de création</p>
                    <p className="text-gray-900 flex items-center">
                      <FontAwesomeIcon icon={faCalendar} className="mr-2 text-gray-400" />
                      {formatDateTime(site.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Adresse et GPS */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-indigo-600" />
                  Localisation
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Adresse</p>
                    <p className="text-gray-900">{site.address}</p>
                  </div>
                  {(site.latitude && site.longitude) && (
                    <div>
                      <p className="text-sm text-gray-500">Coordonnées GPS</p>
                      <p className="text-gray-900 font-mono">
                        <FontAwesomeIcon icon={faLocationDot} className="mr-1 text-gray-400" />
                        {parseFloat(site.latitude).toFixed(6)}, {parseFloat(site.longitude).toFixed(6)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Rayon de géorepérage</p>
                    <p className="text-gray-900 flex items-center">
                      <FontAwesomeIcon icon={faCircle} className="mr-2 text-gray-400" />
                      {site.geofencingRadius} mètres
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faQrcode} className="mr-2 text-indigo-600" />
                  QR Code
                </h3>
                <div className="text-center">
                  {site.qrCode ? (
                    <>
                      <div className="bg-white p-3 rounded-lg inline-block mb-3">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${site.qrCode}`}
                          alt="QR Code"
                          className="w-32 h-32"
                        />
                      </div>
                      <p className="text-xs text-gray-500 break-all">{site.qrCode}</p>
                    </>
                  ) : (
                    <p className="text-gray-500">Aucun QR Code généré</p>
                  )}
                </div>
              </div>

              {/* Hiérarchie */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faLayerGroup} className="mr-2 text-indigo-600" />
                  Hiérarchie
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Sites enfants</p>
                    {children.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {children.slice(0, 3).map((child) => (
                          <li key={child.id}>
                            <Link
                              href={`/dashboard/superviseur/sites/${child.id}`}
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              • {child.name}
                            </Link>
                          </li>
                        ))}
                        {children.length > 3 && (
                          <li className="text-sm text-gray-500">
                            Et {children.length - 3} autre(s)...
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-gray-500">Aucun site enfant</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Affectations */}
          {activeTab === 'assignments' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Affectations sur ce site</h3>
                <Link
                  href={`/dashboard/superviseur/assignments/create?siteId=${siteId}`}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                >
                  Nouvelle affectation
                </Link>
              </div>
              
              {assignments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune affectation pour ce site</p>
              ) : (
                <div className="space-y-2">
                  {assignments.map((assignment) => {
                    const statusBadge = getStatusBadge(assignment.status);
                    return (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-3" />
                          <div>
                            <p className="font-medium">{assignment.agent?.fullName || 'N/A'}</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(assignment.startDate)}
                              {assignment.endDate && ` → ${formatDate(assignment.endDate)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded-full text-xs flex items-center ${statusBadge.color}`}>
                            <FontAwesomeIcon icon={statusBadge.icon} className="mr-1" />
                            {statusBadge.text}
                          </span>
                          <Link
                            href={`/dashboard/superviseur/assignments/${assignment.id}`}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            Voir
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sites enfants */}
          {activeTab === 'children' && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Sites enfants</h3>
              
              {children.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun site enfant</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/dashboard/superviseur/sites/${child.id}`}
                      className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faBuilding} className="text-indigo-600 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">{child.name}</p>
                            <p className="text-sm text-gray-600 truncate max-w-xs">{child.address}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          child.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {child.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* QR Code (onglet) */}
          {activeTab === 'qr' && (
            <div className="text-center">
              {site.qrCode ? (
                <>
                  <div className="bg-gray-100 p-6 rounded-lg inline-block mb-4">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${site.qrCode}`}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="text-lg font-mono mb-2">{site.qrCode}</p>
                  <p className="text-sm text-gray-500">
                    Scannez ce QR code pour pointer sur ce site
                  </p>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${site.qrCode}`;
                      link.download = `qr-code-${site.name}.png`;
                      link.click();
                    }}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Télécharger le QR Code
                  </button>
                </>
              ) : (
                <p className="text-gray-500 py-8">Aucun QR Code généré pour ce site</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal QR Code */}
      {showQrModal && site.qrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">
              QR Code - {site.name}
            </h2>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${site.qrCode}`}
                alt="QR Code"
                className="mx-auto"
              />
            </div>
            <p className="text-sm text-gray-500 mb-4 break-all">
              {site.qrCode}
            </p>
            <button
              onClick={() => setShowQrModal(false)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}