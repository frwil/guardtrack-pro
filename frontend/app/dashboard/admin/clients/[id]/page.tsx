// app/dashboard/admin/clients/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { clientsService, Client } from '../../../../../src/services/api/clients';
import { sitesService } from '../../../../../src/services/api/sites';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faArrowLeft,
  faEdit,
  faBuilding,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faFileContract,
  faEuroSign,
  faToggleOn,
  faToggleOff,
  faPlus,
  faEye,
  faCalendar,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = parseInt(params.id as string);

  const [client, setClient] = useState<Client | null>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    setIsLoading(true);
    try {
      const [clientData, sitesData] = await Promise.all([
        clientsService.getById(clientId),
        clientsService.getSites(clientId),
      ]);

      setClient(clientData);
      setSites(sitesData);
    } catch (error) {
      console.error('Erreur de chargement:', error);
      alert('Erreur lors du chargement des données du client');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(numAmount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Client non trouvé</p>
        <Link href="/dashboard/admin/clients" className="text-indigo-600 hover:text-indigo-800">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/dashboard/admin/clients"
              className="mr-4 text-gray-400 hover:text-gray-600"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FontAwesomeIcon icon={faBuilding} className="mr-3 text-indigo-600" />
                {client.name}
              </h1>
              <div className="flex items-center mt-1 space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  client.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  <FontAwesomeIcon icon={client.isActive ? faToggleOn : faToggleOff} className="mr-1" />
                  {client.isActive ? 'Client actif' : 'Client inactif'}
                </span>
                {client.siret && (
                  <span className="text-sm text-gray-600">
                    <FontAwesomeIcon icon={faFileContract} className="mr-1" />
                    SIRET: {client.siret}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/dashboard/admin/clients/${clientId}/edit`}
              className="px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200"
            >
              <FontAwesomeIcon icon={faEdit} className="mr-2" />
              Modifier
            </Link>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informations générales */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FontAwesomeIcon icon={faBuilding} className="mr-2 text-indigo-600" />
            Informations générales
          </h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Nom du client</p>
              <p className="font-medium text-gray-900">{client.name}</p>
            </div>
            
            {client.siret && (
              <div>
                <p className="text-sm text-gray-500">SIRET</p>
                <p className="text-gray-900">{client.siret}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-gray-500">Date de création</p>
              <p className="text-gray-900 flex items-center">
                <FontAwesomeIcon icon={faCalendar} className="mr-2 text-gray-400" />
                {formatDate(client.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-indigo-600" />
            Contact
          </h2>
          
          <div className="space-y-4">
            {client.email && (
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-900 flex items-center">
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-gray-400" />
                  {client.email}
                </p>
              </div>
            )}
            
            {client.phone && (
              <div>
                <p className="text-sm text-gray-500">Téléphone</p>
                <p className="text-gray-900 flex items-center">
                  <FontAwesomeIcon icon={faPhone} className="mr-2 text-gray-400" />
                  {client.phone}
                </p>
              </div>
            )}
            
            {client.address && (
              <div>
                <p className="text-sm text-gray-500">Adresse</p>
                <p className="text-gray-900 flex items-start">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-gray-400 mt-1" />
                  <span>{client.address}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Facturation */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FontAwesomeIcon icon={faEuroSign} className="mr-2 text-indigo-600" />
            Facturation
          </h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Taux de facturation</p>
              <p className="text-2xl font-bold text-indigo-600">
                {formatCurrency(client.billingRate)}
                <span className="text-sm font-normal text-gray-500"> /heure</span>
              </p>
            </div>
          </div>
        </div>

        {/* Sites */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faBuilding} className="mr-2 text-indigo-600" />
              Sites
            </h2>
            <Link
              href={`/dashboard/admin/sites/create?clientId=${clientId}`}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-1" />
              Nouveau site
            </Link>
          </div>
          
          {sites.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucun site pour ce client</p>
          ) : (
            <div className="space-y-2">
              {sites.slice(0, 5).map((site) => (
                <div key={site.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faBuilding} className="text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium">{site.name}</p>
                      <p className="text-sm text-gray-600 truncate max-w-xs">{site.address}</p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/admin/sites/${site.id}`}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <FontAwesomeIcon icon={faEye} className="mr-1" />
                    Voir
                  </Link>
                </div>
              ))}
              {sites.length > 5 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  Et {sites.length - 5} autre(s) site(s)
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}