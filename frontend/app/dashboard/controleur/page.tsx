'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../src/stores/authStore';
import { presencesService, Presence } from '../../../src/services/api/presences';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faClock,
  faRotate,
  faCircleCheck,
  faCircleXmark,
  faTriangleExclamation,
  faLocationDot,
  faBuilding,
  faCamera,
  faImage,
  faSpinner,
  faCheck,
  faTimes,
  faChevronRight,
  faFilter,
  faSearch,
  faCalendar,
  faUserTie,
  faUsers,
  faMapPin,
  faCircle,
  faLightbulb,
  faIdCard,
  faPhone,
  faEnvelope,
  faShield,
  faClipboardCheck,
  faChartSimple,
  faEye,
  faCheckCircle,
  faExclamationTriangle,
  faArrowRight,
  faArrowLeft,
  faHistory,
} from '@fortawesome/free-solid-svg-icons';

export default function ControleurDashboardPage() {
  const { user } = useAuthStore();
  
  // États
  const [pendingPresences, setPendingPresences] = useState<Presence[]>([]);
  const [filteredPresences, setFilteredPresences] = useState<Presence[]>([]);
  const [selectedPresence, setSelectedPresence] = useState<Presence | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSite, setFilterSite] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    highSuspicion: 0,
    todayTotal: 0,
  });

  useEffect(() => {
    loadPendingPresences();
    // Polling toutes les 30 secondes
    const interval = setInterval(loadPendingPresences, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterPresences();
  }, [pendingPresences, searchTerm, filterSite]);

  const loadPendingPresences = async () => {
    try {
      const presences = await presencesService.getPending();
      setPendingPresences(presences);
      
      // Calculer les statistiques
      const highSuspicion = presences.filter(p => (p.suspicionScore || 0) > 50).length;
      const today = new Date().toDateString();
      const todayPresences = presences.filter(p => 
        new Date(p.checkIn).toDateString() === today
      ).length;
      
      setStats({
        total: presences.length,
        highSuspicion,
        todayTotal: todayPresences,
      });
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPresences = () => {
    let filtered = [...pendingPresences];
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.agent.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.site.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterSite) {
      filtered = filtered.filter(p => p.site.name === filterSite);
    }
    
    setFilteredPresences(filtered);
  };

  const handleValidate = async (id: number) => {
    setIsSubmitting(true);
    try {
      await presencesService.validate(id);
      await loadPendingPresences();
      setSelectedPresence(null);
    } catch (error) {
      console.error('Erreur de validation:', error);
      alert('Erreur lors de la validation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPresence) return;
    if (!rejectionReason.trim()) {
      alert('Veuillez préciser un motif de rejet');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await presencesService.reject(selectedPresence.id, rejectionReason);
      await loadPendingPresences();
      setSelectedPresence(null);
      setShowRejectModal(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Erreur de rejet:', error);
      alert('Erreur lors du rejet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSuspicionBadge = (score: number) => {
    if (score >= 70) {
      return { color: 'bg-red-100 text-red-800', icon: faExclamationTriangle, text: 'Critique' };
    } else if (score >= 50) {
      return { color: 'bg-orange-100 text-orange-800', icon: faTriangleExclamation, text: 'Élevé' };
    } else if (score >= 30) {
      return { color: 'bg-yellow-100 text-yellow-800', icon: faTriangleExclamation, text: 'Moyen' };
    }
    return { color: 'bg-green-100 text-green-800', icon: faCheckCircle, text: 'Faible' };
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Liste unique des sites pour le filtre
  const uniqueSites = [...new Set(pendingPresences.map(p => p.site.name))];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faClipboardCheck} className="mr-3 text-indigo-600" />
              Validation des présences
            </h1>
            <p className="text-gray-600 mt-1 flex items-center">
              <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-400" />
              Contrôleur : {user?.fullName}
            </p>
          </div>
          <button
            onClick={loadPendingPresences}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          >
            <FontAwesomeIcon icon={faRotate} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">En attente</p>
              <p className="text-3xl font-bold text-indigo-600">{stats.total}</p>
            </div>
            <FontAwesomeIcon icon={faClock} className="text-3xl text-indigo-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Suspicion élevée</p>
              <p className="text-3xl font-bold text-orange-600">{stats.highSuspicion}</p>
            </div>
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-orange-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Aujourd'hui</p>
              <p className="text-3xl font-bold text-green-600">{stats.todayTotal}</p>
            </div>
            <FontAwesomeIcon icon={faCalendar} className="text-3xl text-green-200" />
          </div>
        </div>
      </div>

      {/* Zone principale : Liste + Détail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des présences en attente */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <FontAwesomeIcon icon={faClock} className="mr-2 text-yellow-600" />
              Présences en attente
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredPresences.length})
              </span>
            </h2>
            
            {/* Filtres */}
            <div className="space-y-2">
              <div className="relative">
                <FontAwesomeIcon 
                  icon={faSearch} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"
                />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="relative">
                <FontAwesomeIcon 
                  icon={faFilter} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"
                />
                <select
                  value={filterSite}
                  onChange={(e) => setFilterSite(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                >
                  <option value="">Tous les sites</option>
                  {uniqueSites.map(site => (
                    <option key={site} value={site}>{site}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600 mb-3" />
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : filteredPresences.length === 0 ? (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faClipboardCheck} className="text-4xl text-gray-300 mb-3" />
              <p className="text-gray-500">Aucune présence en attente</p>
              <p className="text-sm text-gray-400 mt-1">Tout est à jour !</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredPresences.map((presence) => {
                const suspicienBadge = getSuspicionBadge(presence.suspicionScore || 0);
                
                return (
                  <button
                    key={presence.id}
                    onClick={() => setSelectedPresence(presence)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedPresence?.id === presence.id
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <p className="font-medium text-gray-900">{presence.agent.fullName}</p>
                          {(presence.suspicionScore || 0) > 30 && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${suspicienBadge.color}`}>
                              <FontAwesomeIcon icon={suspicienBadge.icon} className="mr-1" />
                              {presence.suspicionScore}%
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <FontAwesomeIcon icon={faBuilding} className="mr-1 text-gray-400 text-xs" />
                          {presence.site.name}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center mt-1">
                          <FontAwesomeIcon icon={faClock} className="mr-1" />
                          {formatDateTime(presence.checkIn)}
                        </p>
                      </div>
                      <FontAwesomeIcon icon={faChevronRight} className="text-gray-400 ml-2" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Détail de la présence sélectionnée */}
        <div className="lg:col-span-2">
          {selectedPresence ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <FontAwesomeIcon icon={faEye} className="mr-2 text-indigo-600" />
                  Détail de la présence
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleValidate(selectedPresence.id)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                  >
                    {isSubmitting ? (
                      <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                    ) : (
                      <FontAwesomeIcon icon={faCheck} className="mr-2" />
                    )}
                    Valider
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
                  >
                    <FontAwesomeIcon icon={faTimes} className="mr-2" />
                    Rejeter
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                {/* Informations agent */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                    <FontAwesomeIcon icon={faIdCard} className="mr-2 text-indigo-500" />
                    Agent
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Nom complet</p>
                      <p className="font-medium">{selectedPresence.agent.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Heure d'arrivée</p>
                      <p className="font-medium flex items-center">
                        <FontAwesomeIcon icon={faClock} className="mr-1 text-gray-400 text-xs" />
                        {formatTime(selectedPresence.checkIn)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informations site */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                    <FontAwesomeIcon icon={faBuilding} className="mr-2 text-indigo-500" />
                    Site
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Nom du site</p>
                      <p className="font-medium">{selectedPresence.site.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Coordonnées GPS</p>
                      <p className="font-medium text-sm">
                        {selectedPresence.gpsLatitude && selectedPresence.gpsLongitude ? (
                          <span className="flex items-center">
                            <FontAwesomeIcon icon={faMapPin} className="mr-1 text-green-500 text-xs" />
                            {parseFloat(selectedPresence.gpsLatitude).toFixed(6)}, 
                            {parseFloat(selectedPresence.gpsLongitude).toFixed(6)}
                          </span>
                        ) : (
                          <span className="text-gray-400">Non disponible</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Analyse IA / Suspicion */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                    <FontAwesomeIcon icon={faLightbulb} className="mr-2 text-yellow-500" />
                    Analyse et suspicion
                  </h3>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Score de suspicion</span>
                      <span className={`font-bold ${
                        (selectedPresence.suspicionScore || 0) >= 70 ? 'text-red-600' :
                        (selectedPresence.suspicionScore || 0) >= 50 ? 'text-orange-600' :
                        (selectedPresence.suspicionScore || 0) >= 30 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {selectedPresence.suspicionScore || 0}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          (selectedPresence.suspicionScore || 0) >= 70 ? 'bg-red-500' :
                          (selectedPresence.suspicionScore || 0) >= 50 ? 'bg-orange-500' :
                          (selectedPresence.suspicionScore || 0) >= 30 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${selectedPresence.suspicionScore || 0}%` }}
                      />
                    </div>
                  </div>
                  
                  {(selectedPresence.suspicionScore || 0) > 30 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-800 flex items-center">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                        Points d'attention :
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-orange-700">
                        {!selectedPresence.gpsLatitude && (
                          <li className="flex items-center">
                            <FontAwesomeIcon icon={faCircle} className="mr-2 text-[6px]" />
                            Géolocalisation manquante
                          </li>
                        )}
                        {!selectedPresence.hasPhoto && (
                          <li className="flex items-center">
                            <FontAwesomeIcon icon={faCircle} className="mr-2 text-[6px]" />
                            Photo non fournie
                          </li>
                        )}
                        {selectedPresence.suspicionScore && selectedPresence.suspicionScore > 50 && (
                          <li className="flex items-center">
                            <FontAwesomeIcon icon={faCircle} className="mr-2 text-[6px]" />
                            Score de suspicion élevé
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Photo */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                    <FontAwesomeIcon icon={faCamera} className="mr-2 text-indigo-500" />
                    Photo
                  </h3>
                  
                  {selectedPresence.hasPhoto ? (
                    <button
                      onClick={() => setShowPhotoModal(true)}
                      className="relative group"
                    >
                      <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                        <FontAwesomeIcon icon={faImage} className="text-4xl text-gray-400" />
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all">
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-all">
                          <FontAwesomeIcon icon={faEye} className="mr-2" />
                          Voir la photo
                        </span>
                      </div>
                    </button>
                  ) : (
                    <p className="text-gray-400 text-center py-4 flex items-center justify-center">
                      <FontAwesomeIcon icon={faCamera} className="mr-2" />
                      Aucune photo fournie
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FontAwesomeIcon icon={faClipboardCheck} className="text-5xl text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">Sélectionnez une présence</p>
              <p className="text-gray-400 text-sm mt-1">
                pour voir les détails et valider
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de rejet */}
      {showRejectModal && selectedPresence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FontAwesomeIcon icon={faCircleXmark} className="mr-2 text-red-600" />
              Rejeter la présence
            </h2>
            
            <p className="text-gray-600 mb-4">
              Vous allez rejeter la présence de <strong>{selectedPresence.agent.fullName}</strong>.
              Veuillez préciser le motif.
            </p>
            
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Motif du rejet..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              rows={3}
            />
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {isSubmitting ? (
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                ) : (
                  <FontAwesomeIcon icon={faCheck} className="mr-2" />
                )}
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'affichage de la photo */}
      {showPhotoModal && selectedPresence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative max-w-2xl w-full mx-4">
            <button
              onClick={() => setShowPhotoModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <FontAwesomeIcon icon={faTimes} className="text-2xl" />
            </button>
            <div className="bg-white rounded-lg p-4">
              <p className="text-center text-gray-500 mb-2">
                Photo de {selectedPresence.agent.fullName} - {formatDateTime(selectedPresence.checkIn)}
              </p>
              <div className="bg-gray-200 rounded-lg flex items-center justify-center min-h-[300px]">
                <FontAwesomeIcon icon={faImage} className="text-6xl text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}