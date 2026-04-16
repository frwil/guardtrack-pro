'use client';

import { useEffect, useState } from 'react';
import { usersService } from '../../../../src/services/api/users';
import { presencesService } from '../../../../src/services/api/presences';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faUserCheck,
  faUserXmark,
  faClock,
  faMapPin,
  faSpinner,
  faSearch,
  faPhone,
  faEnvelope,
} from '@fortawesome/free-solid-svg-icons';
import { User } from '../../../../src/types';
import Link from 'next/link';

export default function ControleurAgentsPage() {
  const [agents, setAgents] = useState<User[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<User[]>([]);
  const [todayPresences, setTodayPresences] = useState<Record<number, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAgents();
  }, [agents, searchTerm, filter, todayPresences]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agentsList] = await Promise.all([
        usersService.getAgents(),
      ]);

      setAgents(agentsList);

      // Charger les présences du jour pour chaque agent
      const presencesMap: Record<number, any> = {};
      await Promise.all(
        agentsList.map(async (agent) => {
          try {
            const presences = await presencesService.list({ agentId: agent.id, date: new Date().toISOString().split('T')[0] });
            presencesMap[agent.id] = presences[0] || null;
          } catch (error) {
            console.error(`Erreur présences pour ${agent.id}:`, error);
          }
        })
      );
      setTodayPresences(presencesMap);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAgents = () => {
    let filtered = [...agents];

    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter === 'present') {
      filtered = filtered.filter(a => todayPresences[a.id]?.status === 'VALIDATED' || todayPresences[a.id]?.status === 'PENDING');
    } else if (filter === 'absent') {
      filtered = filtered.filter(a => !todayPresences[a.id]);
    }

    setFilteredAgents(filtered);
  };

  const getPresenceStatus = (agentId: number) => {
    const presence = todayPresences[agentId];
    if (!presence) return { label: 'Non pointé', color: 'bg-gray-100 text-gray-800', icon: faUserXmark };
    if (presence.status === 'VALIDATED') return { label: 'Présent', color: 'bg-green-100 text-green-800', icon: faUserCheck };
    if (presence.status === 'PENDING') return { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: faClock };
    if (presence.status === 'REJECTED') return { label: 'Rejeté', color: 'bg-red-100 text-red-800', icon: faUserXmark };
    return { label: presence.status, color: 'bg-gray-100 text-gray-800', icon: faUser };
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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <span className="mr-3">👥</span>
          Agents
        </h1>
        <p className="text-gray-600 mt-1">
          {filteredAgents.length} agent{filteredAgents.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total agents</p>
          <p className="text-2xl font-bold text-indigo-600">{agents.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Présents aujourd'hui</p>
          <p className="text-2xl font-bold text-green-600">
            {agents.filter(a => todayPresences[a.id]?.status === 'VALIDATED' || todayPresences[a.id]?.status === 'PENDING').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Absents aujourd'hui</p>
          <p className="text-2xl font-bold text-red-600">
            {agents.filter(a => !todayPresences[a.id]).length}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilter('present')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'present' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✅ Présents
            </button>
            <button
              onClick={() => setFilter('absent')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'absent' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ❌ Absents
            </button>
          </div>
        </div>
      </div>

      {/* Liste des agents */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Aucun agent trouvé</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredAgents.map((agent) => {
              const presence = todayPresences[agent.id];
              const status = getPresenceStatus(agent.id);

              return (
                <div key={agent.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium mr-3">
                        {agent.firstName?.[0]}{agent.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium">{agent.fullName}</p>
                        <div className="flex items-center text-sm text-gray-500 space-x-3">
                          <span className="flex items-center">
                            <FontAwesomeIcon icon={faEnvelope} className="mr-1 text-gray-400 text-xs" />
                            {agent.email}
                          </span>
                          {agent.phone && (
                            <span className="flex items-center">
                              <FontAwesomeIcon icon={faPhone} className="mr-1 text-gray-400 text-xs" />
                              {agent.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-xs flex items-center ${status.color}`}>
                        <FontAwesomeIcon icon={status.icon} className="mr-1" />
                        {status.label}
                      </span>

                      {presence && (
                        <div className="text-sm text-gray-500">
                          <FontAwesomeIcon icon={faClock} className="mr-1" />
                          {new Date(presence.checkIn).toLocaleTimeString('fr-FR')}
                          {presence.site && (
                            <span className="ml-2 flex items-center">
                              <FontAwesomeIcon icon={faMapPin} className="mr-1 text-gray-400" />
                              {presence.site.name}
                            </span>
                          )}
                        </div>
                      )}

                      <Link
                        href={`/dashboard/controleur/agents/${agent.id}`}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        Voir détails →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}