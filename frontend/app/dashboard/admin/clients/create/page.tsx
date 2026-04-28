// app/dashboard/admin/clients/create/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { clientsService, Client } from '../../../../../src/services/api/clients';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSave,
  faSpinner,
  faBuilding,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faFileContract,
  faEuroSign,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { useAppSettings } from '../../../../../src/contexts/AppSettingsContext';

// Type aligné sur l'interface Client
type ClientFormData = Partial<Client> & {
  billingRate: string;
};

export default function CreateEditClientPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id ? parseInt(params.id as string) : null;
  const { currencySymbol } = useAppSettings();
  const isEdit = !!clientId;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    siret: '',
    billingRate: '15.00',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEdit && clientId) {
      loadClient();
    }
  }, [clientId]);

  const loadClient = async () => {
    setIsLoading(true);
    try {
      const client = await clientsService.getById(clientId!);
      if (client) {
        setFormData({
          name: client.name,
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          siret: client.siret || '',
          billingRate: client.billingRate,
          isActive: client.isActive,
        });
      }
    } catch (error) {
      console.error('Erreur de chargement:', error);
      alert('Erreur lors du chargement du client');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Le nom du client est requis';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    if (formData.siret && !/^\d{14}$/.test(formData.siret.replace(/\s/g, ''))) {
      newErrors.siret = 'Le SIRET doit contenir 14 chiffres';
    }
    if (!formData.billingRate || parseFloat(formData.billingRate) < 0) {
      newErrors.billingRate = 'Le taux de facturation doit être positif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!navigator.onLine) {
      setErrors({ submit: 'Vous êtes hors ligne. Reconnectez-vous pour enregistrer ce client.' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        siret: formData.siret || null,
        billingRate: formData.billingRate,
        isActive: formData.isActive,
      };

      if (isEdit && clientId) {
        await clientsService.update(clientId, payload);
        alert('✅ Client mis à jour avec succès');
      } else {
        await clientsService.create(payload);
        alert('✅ Client créé avec succès');
      }
      router.push('/dashboard/admin/clients');
    } catch (error: any) {
      console.error('Erreur de sauvegarde:', error);
      setErrors({ submit: error.message || 'Erreur lors de la sauvegarde du client' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <Link
            href="/dashboard/admin/clients"
            className="mr-4 text-gray-400 hover:text-gray-600"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Modifier le client' : 'Nouveau client'}
          </h1>
        </div>
        <p className="text-gray-600 mt-2 ml-10">
          {isEdit ? 'Modifiez les informations du client' : 'Remplissez les informations pour créer un nouveau client'}
        </p>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom du client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faBuilding} className="mr-2 text-indigo-600" />
              Nom du client <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              placeholder="Ex: Société Générale de Surveillance"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* SIRET */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faFileContract} className="mr-2 text-indigo-600" />
              SIRET
            </label>
            <input
              type="text"
              name="siret"
              value={formData.siret || ''}
              onChange={handleChange}
              placeholder="14 chiffres"
              maxLength={14}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.siret ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.siret && <p className="text-red-600 text-sm mt-1">{errors.siret}</p>}
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-indigo-600" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                placeholder="contact@client.com"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faPhone} className="mr-2 text-indigo-600" />
                Téléphone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                placeholder="01 23 45 67 89"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Adresse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-indigo-600" />
              Adresse
            </label>
            <textarea
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              placeholder="Adresse complète"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Facturation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faEuroSign} className="mr-2 text-indigo-600" />
              Taux de facturation ({currencySymbol}/heure) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="billingRate"
              value={formData.billingRate || '15.00'}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.billingRate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.billingRate && <p className="text-red-600 text-sm mt-1">{errors.billingRate}</p>}
          </div>

          {/* Statut */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              id="isActive"
              checked={formData.isActive ?? true}
              onChange={handleChange}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="ml-2 text-gray-700">
              Client actif
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
            <Link
              href="/dashboard/admin/clients"
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {isSaving ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  {isEdit ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  {isEdit ? 'Mettre à jour' : 'Créer le client'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}