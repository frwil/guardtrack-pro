"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Correction des icônes Leaflet avec Next.js
const iconDefault = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Icône personnalisée pour les sites visités
const visitedIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Icône personnalisée pour les sites validés
const validatedIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface Site {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: "visited" | "pending" | "validated";
  visitedAt?: string;
  isValidated?: boolean;
  roundSiteId: number;
}

interface RoundSitesMapProps {
  sites: Site[];
  roundId: number;
}

export default function RoundSitesMap({ sites, roundId }: RoundSitesMapProps) {
  const router = useRouter();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || sites.length === 0) return;

    // Initialiser la carte
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(
        [sites[0].latitude, sites[0].longitude],
        13
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);
    }

    // Nettoyer les anciens marqueurs
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    // Ajouter les marqueurs pour chaque site
    sites.forEach((site) => {
      if (!site.latitude || !site.longitude) return;

      const latLng = L.latLng(site.latitude, site.longitude);
      bounds.extend(latLng);

      // Choisir l'icône selon le statut
      let icon = iconDefault;
      let statusText = "";
      let statusColor = "";

      if (site.status === "validated") {
        icon = validatedIcon;
        statusText = "✅ Validé";
        statusColor = "text-green-600";
      } else if (site.status === "visited") {
        icon = visitedIcon;
        statusText = "⏳ Visité - En attente validation";
        statusColor = "text-yellow-600";
      } else {
        statusText = "📍 À visiter";
        statusColor = "text-gray-600";
      }

      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <h3 class="font-semibold text-gray-900">${site.name}</h3>
          <p class="text-sm text-gray-600 mt-1">${site.address}</p>
          <p class="text-sm ${statusColor} mt-2">${statusText}</p>
          ${site.visitedAt ? `<p class="text-xs text-gray-400 mt-1">Visité le ${new Date(site.visitedAt).toLocaleString("fr-FR")}</p>` : ""}
          ${site.status === "pending" ? `
            <button 
              class="visit-btn mt-3 w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
              data-site-id="${site.id}"
            >
              Visiter ce site
            </button>
          ` : ""}
        </div>
      `;

      const marker = L.marker(latLng, { icon })
        .bindPopup(popupContent)
        .addTo(mapRef.current!);

      marker.on("popupopen", () => {
        const visitBtn = document.querySelector(`.visit-btn[data-site-id="${site.id}"]`);
        if (visitBtn) {
          visitBtn.addEventListener("click", () => {
            router.push(`/dashboard/controleur/rounds/${roundId}/sites/${site.id}/visit`);
          });
        }
      });

      markersRef.current.push(marker);
    });

    // Ajuster la vue pour voir tous les marqueurs
    if (bounds.isValid() && sites.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      // Nettoyage
    };
  }, [sites, roundId, router]);

  return (
    <div className="relative">
      <div ref={mapContainerRef} className="h-[500px] w-full" />
      
      {/* Légende */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Légende</h4>
        <div className="space-y-1">
          <div className="flex items-center">
            <img 
              src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" 
              alt="À visiter" 
              className="w-4 h-6 mr-2"
            />
            <span className="text-xs text-gray-600">À visiter</span>
          </div>
          <div className="flex items-center">
            <img 
              src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png" 
              alt="Visité" 
              className="w-4 h-6 mr-2"
            />
            <span className="text-xs text-gray-600">Visité</span>
          </div>
          <div className="flex items-center">
            <img 
              src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png" 
              alt="Validé" 
              className="w-4 h-6 mr-2"
            />
            <span className="text-xs text-gray-600">Validé</span>
          </div>
        </div>
      </div>
    </div>
  );
}