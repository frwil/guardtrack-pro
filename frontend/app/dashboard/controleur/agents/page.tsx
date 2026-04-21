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
      console.log('🔍 ========== DÉBUT CHARGEMENT AGENTS ==========');
      
      // 1. Récupérer les agents
      const agentsList = await usersService.getAgents();
      console.log('📋 [1] Agents récupérés:', agentsList.length);
      console.log('📋 [1] Liste des agents:', agentsList.map(a => ({ id: a.id, name: a.fullName, email: a.email })));
      
      setAgents(agentsList);

      // 2. Récupérer les présences du jour
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      console.log('📅 [2] Date du jour:', todayStr);
      console.log('📅 [2] Date complète:', today.toString());
      console.log('📅 [2] ISO String:', today.toISOString());
      
      const presencesMap: Record<number, any> = {};
      
      // 2a. Tester l'appel API pour CHAQUE agent
      console.log('🔄 [3] Début des appels API pour chaque agent...');
      
      let successCount = 0;
      let errorCount = 0;
      let emptyCount = 0;
      
      for (const agent of agentsList) {
        try {
          const url = `${process.env.NEXT_PUBLIC_API_URL}/api/presences?agentId=${agent.id}&date=${todayStr}`;
          console.log(`🔗 [${agent.id}] URL appelée:`, url);
          
          // Appel direct fetch pour voir la réponse brute
          const token = localStorage.getItem('token');
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          const status = response.status;
          const data = await response.json();
          
          console.log(`📡 [${agent.id}] Status HTTP:`, status);
          console.log(`📡 [${agent.id}] Réponse brute:`, data);
          console.log(`📡 [${agent.id}] Nombre d'éléments:`, Array.isArray(data) ? data.length : 'N/A');
          
          if (Array.isArray(data) && data.length > 0) {
            console.log(`✅ [${agent.id}] Agent ${agent.fullName} a ${data.length} présence(s)`);
            data.forEach((p: any, i: number) => {
              console.log(`   Présence ${i+1}:`, {
                id: p.id,
                checkIn: p.checkIn,
                status: p.status,
                site: p.site?.name,
                agent: p.agent
              });
            });
            presencesMap[agent.id] = data[0];
            successCount++;
          } else {
            console.log(`❌ [${agent.id}] Agent ${agent.fullName} n'a PAS de présence pour aujourd'hui`);
            emptyCount++;
          }
          
          // Via le service (pour comparaison)
          const presencesViaService = await presencesService.list({ 
            agentId: agent.id, 
            date: todayStr 
          });
          console.log(`📦 [${agent.id}] Via service:`, presencesViaService.length, 'présence(s)');
          
        } catch (error) {
          console.error(`💥 [${agent.id}] Erreur pour agent ${agent.fullName}:`, error);
          errorCount++;
        }
      }
      
      console.log('📊 ========== RÉSUMÉ ==========');
      console.log(`✅ Succès avec présence: ${successCount}`);
      console.log(`❌ Succès sans présence: ${emptyCount}`);
      console.log(`💥 Erreurs: ${errorCount}`);
      console.log(`📊 Total agents: ${agentsList.length}`);
      
      console.log('📊 Presences map finale:', presencesMap);
      console.log('📊 Agents avec présence:', Object.keys(presencesMap).length);
      
      setTodayPresences(presencesMap);
      
    } catch (error) {
      console.error('💥 Erreur globale de chargement:', error);
    } finally {
      setIsLoading(false);
      console.log('🔍 ========== FIN CHARGEMENT ==========');
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
      filtered = filtered.filter(a => {
        const presence = todayPresences[a.id];
        return presence && (presence.status === 'VALIDATED' || presence.status === 'PENDING');
      });
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
            {agents.filter(a => {
              const p = todayPresences[a.id];
              return p && (p.status === 'VALIDATED' || p.status === 'PENDING');
            }).length}
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