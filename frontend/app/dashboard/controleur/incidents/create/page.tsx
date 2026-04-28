'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../../src/stores/authStore';
import { incidentsService } from '../../../../../src/services/api/incidents';
import { syncManager } from '../../../../../src/services/sync/manager';
import { sitesService } from '../../../../../src/services/api/sites';
import { imageOptimizer, OptimizationResult } from '../../../../../src/services/image/optimizer';
import { CameraCapture } from '../../../../../src/components/CameraCapture';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCamera,
  faSpinner,
  faTriangleExclamation,
  faCircleExclamation,
  faCircle,
  faImage,
  faTrash,
  faPlus,
  faSearch,
  faCompress,
} from '@fortawesome/free-solid-svg-icons';

export default function ControleurCreateIncidentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [allSites, setAllSites] = useState<any[]>([]);
  const [filteredSites, setFilteredSites] = useState<any[]>([]);
  const [searchSite, setSearchSite] = useState('');
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [showSiteSelector, setShowSiteSelector] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    severity: 'MEDIUM',
    siteId: '',
  });
  const [photos, setPhotos] = useState<{ dataUrl: string; optimized: OptimizationResult }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterSites();
  }, [searchSite, allSites]);

  const loadData = async () => {
    setIsLoadingSites(true);
    try {
      // ✅ Récupérer TOUS les sites actifs (pas seulement ceux assignés)
      const sites = await sitesService.list({ isActive: true });
      setAllSites(sites);
      setFilteredSites(sites);

      // Récupérer les catégories
      const catsData = await incidentsService.getCategories();
      setCategories(catsData?.categories || [
        'INTRUSION', 'VOL', 'DEGRADATION', 'INCENDIE', 'ACCIDENT',
        'MEDICAL', 'TECHNIQUE', 'COMPORTEMENT', 'AUTRE'
      ]);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoadingSites(false);
    }
  };

  const filterSites = () => {
    if (!searchSite.trim()) {
      setFilteredSites(allSites);
      return;
    }
    
    const filtered = allSites.filter(site => 
      site.name.toLowerCase().includes(searchSite.toLowerCase()) ||
      site.address.toLowerCase().includes(searchSite.toLowerCase()) ||
      site.client?.name?.toLowerCase().includes(searchSite.toLowerCase())
    );
    setFilteredSites(filtered);
  };

  const handleSelectSite = (site: any) => {
    setSelectedSite(site);
    setFormData({ ...formData, siteId: site.id.toString() });
    setShowSiteSelector(false);
    setErrors({ ...errors, siteId: '' });
  };

  const handlePhotoCapture = (photoData: string, optimized: OptimizationResult) => {
    setPhotos(prev => [...prev, { dataUrl: photoData, optimized }]);
    setShowCamera(false);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Le titre est requis';
    if (!formData.description.trim()) newErrors.description = 'La description est requise';
    if (!formData.category) newErrors.category = 'La catégorie est requise';
    if (!formData.siteId) newErrors.siteId = 'Le site est requis';
    if (photos.length === 0) newErrors.photos = 'Au moins une photo est requise';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const finalPhotos = photos.map(p => p.optimized.dataUrl);
    const payload = { ...formData, siteId: parseInt(formData.siteId), photos: finalPhotos };

    if (!navigator.onLine) {
      try {
        await syncManager.createIncident(payload);
        router.push('/dashboard/controleur/incidents?queued=1');
      } catch {
        setErrors({ submit: 'Erreur de sauvegarde locale' });
        setIsLoading(false);
      }
      return;
    }

    try {
      const result = await incidentsService.create(payload);
      if (result) router.push('/dashboard/controleur/incidents');
    } catch (error) {
      console.error('Erreur de création:', error);
      setErrors({ submit: 'Erreur lors de la création de l\'incident' });
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalPhotosSize = (): string => {
    const total = photos.reduce((sum, p) => sum + p.optimized.optimizedSize, 0);
    if (total < 1024) return `${total.toFixed(1)} Ko`;
    return `${(total / 1024).toFixed(2)} Mo`;
  };

  const getCompressionStats = (): string => {
    if (photos.length === 0) return '';
    const totalOriginal = photos.reduce((sum, p) => sum + p.optimized.originalSize, 0);
    const totalOptimized = photos.reduce((sum, p) => sum + p.optimized.optimizedSize, 0);
    const ratio = ((totalOriginal - totalOptimized) / totalOriginal) * 100;
    return `${ratio.toFixed(0)}%`;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="mr-3">🚨</span>
              Déclarer un incident
            </h1>
            <p className="text-gray-600 mt-1">
              Signalez un incident sur n'importe quel site de surveillance
            </p>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Site - Sélecteur amélioré */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📍 Site concerné *
            </label>
            
            {selectedSite ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedSite.name}</p>
                    <p className="text-sm text-gray-500">{selectedSite.address}</p>
                    {selectedSite.client && (
                      <p className="text-xs text-gray-400 mt-1">
                        Client : {selectedSite.client.name}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSite(null);
                      setFormData({ ...formData, siteId: '' });
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Changer
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setShowSiteSelector(true)}
                  className={`w-full px-4 py-3 border rounded-lg text-left flex items-center justify-between hover:border-indigo-500 ${
                    errors.siteId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <span className="text-gray-500">Sélectionnez un site</span>
                  <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                </button>
                {errors.siteId && <p className="text-red-600 text-sm mt-1">{errors.siteId}</p>}
              </div>
            )}
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 Titre *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Intrusion détectée"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Catégorie et Sévérité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏷️ Catégorie *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Sélectionnez une catégorie</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ⚠️ Sévérité
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="LOW">🟢 Faible</option>
                <option value="MEDIUM">🟡 Moyenne</option>
                <option value="HIGH">🟠 Élevée</option>
                <option value="CRITICAL">🔴 Critique</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📄 Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez l'incident en détail..."
              rows={5}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📸 Photos *
            </label>
            
            {photos.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {photos.length} photo{photos.length > 1 ? 's' : ''} 
                    ({getTotalPhotosSize()})
                  </span>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    <FontAwesomeIcon icon={faCompress} className="mr-1" />
                    Économie {getCompressionStats()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo.dataUrl}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
                  >
                    <FontAwesomeIcon icon={faPlus} className="text-xl mb-1" />
                    <span className="text-xs">Ajouter</span>
                  </button>
                </div>
              </div>
            )}

            {photos.length === 0 && (
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="w-full py-12 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
              >
                <FontAwesomeIcon icon={faCamera} className="text-4xl mb-3" />
                <span className="font-medium">Prendre des photos</span>
                <span className="text-sm mt-1">Les photos sont obligatoires</span>
              </button>
            )}
            
            {errors.photos && <p className="text-red-600 text-sm mt-1">{errors.photos}</p>}
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Création...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faTriangleExclamation} className="mr-2" />
                  Déclarer l'incident
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal sélecteur de site */}
      {showSiteSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Sélectionner un site</h2>
                <button
                  onClick={() => setShowSiteSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="mt-3 relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un site..."
                  value={searchSite}
                  onChange={(e) => setSearchSite(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {isLoadingSites ? (
                <div className="text-center py-8">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-gray-400" />
                </div>
              ) : filteredSites.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucun site trouvé</p>
              ) : (
                <div className="space-y-2">
                  {filteredSites.map((site) => (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => handleSelectSite(site)}
                      className="w-full text-left p-4 border rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                    >
                      <p className="font-medium">{site.name}</p>
                      <p className="text-sm text-gray-500">{site.address}</p>
                      {site.client && (
                        <p className="text-xs text-gray-400 mt-1">
                          Client : {site.client.name}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t">
              <button
                onClick={() => setShowSiteSelector(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal caméra */}
      {showCamera && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          onCancel={() => setShowCamera(false)}
          multiple={true}
          maxPhotos={10}
          title="Photos de l'incident"
          description="Prenez plusieurs photos pour documenter l'incident"
        />
      )}
    </div>
  );
}