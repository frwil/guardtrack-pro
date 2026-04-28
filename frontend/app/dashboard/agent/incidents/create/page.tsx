'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../../src/stores/authStore';
import { incidentsService } from '../../../../../src/services/api/incidents';
import { assignmentsService } from '../../../../../src/services/api/assignments';
import { syncManager } from '../../../../../src/services/sync/manager';

export default function CreateIncidentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mySites, setMySites] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    severity: 'MEDIUM',
    siteId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assignments, catsData] = await Promise.all([
        assignmentsService.getMyAssignments(),
        incidentsService.getCategories(),
      ]);
      setMySites(assignments.map((a: any) => a.site));
      setCategories(catsData?.categories || ['INTRUSION', 'VOL', 'DEGRADATION', 'INCENDIE', 'ACCIDENT', 'MEDICAL', 'TECHNIQUE', 'COMPORTEMENT', 'AUTRE']);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Le titre est requis';
    if (!formData.description.trim()) newErrors.description = 'La description est requise';
    if (!formData.category) newErrors.category = 'La catégorie est requise';
    if (!formData.siteId) newErrors.siteId = 'Le site est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    // Hors ligne → sauvegarde locale
    if (!navigator.onLine) {
      try {
        await syncManager.createIncident({
          ...formData,
          siteId: parseInt(formData.siteId),
        });
        router.push('/dashboard/agent/incidents?queued=1');
      } catch {
        setErrors({ submit: 'Erreur de sauvegarde locale' });
        setIsLoading(false);
      }
      return;
    }

    try {
      const result = await incidentsService.create({
        ...formData,
        siteId: parseInt(formData.siteId),
      });
      if (result) {
        router.push('/dashboard/agent/incidents');
      }
    } catch (error) {
      console.error('Erreur de création:', error);
      setErrors({ submit: 'Erreur lors de la création de l\'incident' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <span className="mr-3">🚨</span>
          Déclarer un incident
        </h1>
        <p className="text-gray-600 mt-1">
          Signalez un incident sur votre site de surveillance
        </p>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Site */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📍 Site concerné *
            </label>
            <select
              value={formData.siteId}
              onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.siteId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Sélectionnez un site</option>
              {mySites.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
            {errors.siteId && <p className="text-red-600 text-sm mt-1">{errors.siteId}</p>}
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
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Création...
                </>
              ) : (
                <>
                  <span className="mr-2">🚨</span>
                  Déclarer l'incident
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}