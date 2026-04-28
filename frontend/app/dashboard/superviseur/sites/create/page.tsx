'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '../../../../../src/stores/authStore';
import { sitesService, CreateSiteData, Site } from '../../../../../src/services/api/sites';
import { clientsService } from '../../../../../src/services/api/clients';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSave,
  faSpinner,
  faBuilding,
  faMapPin,
  faUser,
  faLocationDot,
  faCircle,
  faInfoCircle,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

interface Client {
  id: number;
  name: string;
}

export default function CreateEditSitePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const siteId = params.id ? parseInt(params.id as string) : null;
  const isEdit = !!siteId;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [parentSites, setParentSites] = useState<Site[]>([]);
  const [formData, setFormData] = useState<CreateSiteData>({
    name: '',
    clientId: 0,
    type: 'PRINCIPAL',
    address: '',
    latitude: null,
    longitude: null,
    geofencingRadius: 100,
    parentId: null,
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [useGeolocation, setUseGeolocation] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const siteTypes = [
    { value: 'PRINCIPAL', label: '🏢 Site Principal' },
    { value: 'SECONDAIRE', label: '🏪 Site Secondaire' },
    { value: 'ENTREPOT', label: '📦 Entrepôt' },
    { value: 'PARKING', label: '🅿️ Parking' },
    { value: 'BUREAU', label: '📋 Bureau' },
    { value: 'AUTRE', label: '📍 Autre' },
  ];

  useEffect(() => {
    loadData();
  }, [siteId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const clientsList = await clientsService.list({ isActive: true });
      setClients(clientsList);

      const sitesList = await sitesService.list({ isActive: true });
      setParentSites(sitesList);

      if (isEdit && siteId) {
        const site = await sitesService.getById(siteId);
        if (site) {
          setFormData({
            name: site.name,
            clientId: site.client?.id || 0,
            type: site.type,
            address: site.address,
            latitude: site.latitude ? parseFloat(site.latitude) : null,
            longitude: site.longitude ? parseFloat(site.longitude) : null,
            geofencingRadius: site.geofencingRadius ?? 100,
            parentId: site.parent?.id || null,
            isActive: site.isActive,
          });
        }
      }
    } catch (error) {
      console.error('Erreur de chargement:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsGettingLocation(false);
        setUseGeolocation(false);
      },
      (error) => {
        console.error('Erreur géolocalisation:', error);
        alert('Impossible d\'obtenir votre position');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du site est requis';
    }
    if (!formData.clientId) {
      newErrors.clientId = 'Veuillez sélectionner un client';
    }
    if (!formData.type) {
      newErrors.type = 'Veuillez sélectionner un type';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'L\'adresse est requise';
    }
    if ((formData.geofencingRadius ?? 100) < 10) {
      newErrors.geofencingRadius = 'Le rayon minimum est de 10 mètres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!navigator.onLine) {
      alert('📵 Vous êtes hors ligne. Reconnectez-vous pour enregistrer ce site.');
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && siteId) {
        await sitesService.update(siteId, formData);
        alert('✅ Site mis à jour avec succès');
      } else {
        const result = await sitesService.create(formData);
        if (result) {
          alert('✅ Site créé avec succès');
        }
      }
      goBack();
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      setErrors({ submit: 'Erreur lors de la sauvegarde du site' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!siteId || !isAdmin) return;
    
    setIsDeleting(true);
    try {
      await sitesService.delete(siteId);
      alert('✅ Site supprimé avec succès');
      goBack();
    } catch (error: any) {
      console.error('Erreur de suppression:', error);
      alert(error?.message || 'Erreur lors de la suppression du site');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const goBack = () => {
    if (isAdmin) {
      router.push('/dashboard/admin/sites');
    } else {
      router.push('/dashboard/superviseur/sites');
    }
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
          <div className="flex items-center">
            <button
              onClick={goBack}
              className="mr-4 text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEdit ? 'Modifier le site' : 'Créer un nouveau site'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEdit ? 'Modifiez les informations du site' : 'Remplissez les informations pour créer un nouveau site'}
              </p>
            </div>
          </div>
          
          {/* ✅ Bouton supprimer (admin/superadmin uniquement, en mode édition) */}
          {isEdit && isAdmin && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
            >
              <FontAwesomeIcon icon={faTrash} className="mr-2" />
              Supprimer
            </button>
          )}
        </div>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom du site */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faBuilding} className="mr-2" />
              Nom du site *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Afriland First Bank - Agence Centrale"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faUser} className="mr-2" />
              Client *
            </label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: parseInt(e.target.value) })}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.clientId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="0">Sélectionnez un client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            {errors.clientId && <p className="text-red-600 text-sm mt-1">{errors.clientId}</p>}
          </div>

          {/* Type de site */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faBuilding} className="mr-2" />
              Type de site *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.type ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {siteTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.type && <p className="text-red-600 text-sm mt-1">{errors.type}</p>}
          </div>

          {/* Adresse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faMapPin} className="mr-2" />
              Adresse *
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Adresse complète du site"
              rows={3}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                errors.address ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address}</p>}
          </div>

          {/* Coordonnées GPS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faLocationDot} className="mr-2" />
              Coordonnées GPS
            </label>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude ?? ''}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || null })}
                  placeholder="Latitude"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude ?? ''}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || null })}
                  placeholder="Longitude"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setUseGeolocation(true)}
              className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
            >
              <FontAwesomeIcon icon={faLocationDot} className="mr-1" />
              Utiliser ma position actuelle
            </button>
          </div>

          {/* Rayon de géorepérage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faCircle} className="mr-2" />
              Rayon de géorepérage (mètres)
            </label>
            <input
              type="number"
              min="10"
              max="1000"
              value={formData.geofencingRadius ?? 100}
              onChange={(e) => setFormData({ ...formData, geofencingRadius: parseInt(e.target.value) || 100 })}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.geofencingRadius ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.geofencingRadius && (
              <p className="text-red-600 text-sm mt-1">{errors.geofencingRadius}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
              Distance maximale autorisée pour le pointage
            </p>
          </div>

          {/* Site parent (hiérarchie) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faBuilding} className="mr-2" />
              Site parent (optionnel)
            </label>
            <select
              value={formData.parentId ?? ''}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Aucun</option>
              {parentSites
                .filter(s => s.id !== siteId)
                .map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({typeof site.client === 'string' ? site.client : site.client?.name})
                  </option>
                ))}
            </select>
          </div>

          {/* Statut actif */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive ?? true}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="ml-2 text-gray-700">
              Site actif
            </label>
          </div>

          {/* Erreur de soumission */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{errors.submit}</p>
            </div>
          )}

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={goBack}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {isSaving ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  {isEdit ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  {isEdit ? 'Mettre à jour' : 'Créer le site'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal confirmation suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold text-red-600 mb-4">⚠️ Confirmer la suppression</h2>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer définitivement ce site ?<br />
              <strong>Cette action est irréversible.</strong>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal géolocalisation */}
      {useGeolocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold mb-4">Obtenir la position</h2>
            <p className="text-gray-600 mb-6">
              {isGettingLocation ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Obtention de votre position...
                </>
              ) : (
                'Cliquez sur le bouton ci-dessous pour utiliser votre position actuelle comme coordonnées du site.'
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setUseGeolocation(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleGetCurrentLocation}
                disabled={isGettingLocation}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isGettingLocation ? 'Patientez...' : 'Obtenir ma position'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}