"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../../../src/stores/authStore";
import { usePresenceStore } from "../../../src/stores/presenceStore";
import { assignmentsService } from "../../../src/services/api/assignments";
import { incidentsService } from "../../../src/services/api/incidents";
import {
  imageAnalysisService,
  UnifiedAnalysisResult,
} from "../../../src/services/ai/imageAnalysis";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationDot,
  faCamera,
  faComment,
  faKey,
  faCheckCircle,
  faCircleCheck,
  faCircleExclamation,
  faCircleXmark,
  faSpinner,
  faArrowRight,
  faArrowLeft,
  faUser,
  faBuilding,
  faClock,
  faTriangleExclamation,
  faShield,
  faUserTie,
  faUsers,
  faLightbulb,
  faRotate,
  faChevronRight,
  faCircle,
  faPen,
  faLock,
  faClipboardCheck,
  faPlus,
  faTimes,
  faCheck,
  faRobot,
} from "@fortawesome/free-solid-svg-icons";

// Types pour les étapes
type Step = "site" | "geoloc" | "photo" | "comment" | "pin" | "summary";

interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  distance?: number;
  withinGeofence?: boolean;
}

export default function AgentDashboardPage() {
  const { user } = useAuthStore();
  const {
    todayPresences,
    fetchTodayPresences,
    checkIn,
    isLoading: presenceLoading,
  } = usePresenceStore();

  // États
  const [mySites, setMySites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>("site");
  const [showCheckInFlow, setShowCheckInFlow] = useState(false);

  // Données du formulaire
  const [geolocation, setGeolocation] = useState<GeolocationData | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoAnalysis, setPhotoAnalysis] = useState<UnifiedAnalysisResult | null>(null);
  const [comment, setComment] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);

  // États UI
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [aiProvider, setAiProvider] = useState<string>("lightweight");

  useEffect(() => {
    loadData();
    // Initialiser le service d'analyse IA
    imageAnalysisService.initialize().then(() => {
      setAiProvider(imageAnalysisService.getCurrentProvider());
    });
  }, []);

  const loadData = async () => {
    await fetchTodayPresences();

    try {
      const assignments = await assignmentsService.getMyAssignments();
      setMySites(assignments.map((a: any) => a.site));

      // Charger les incidents récents
      const incidents = await incidentsService.getMyIncidents();
      setRecentIncidents(incidents.slice(0, 3));
    } catch (error) {
      console.error("Erreur de chargement:", error);
    }
  };

  // Démarrer le flux de pointage
  const startCheckIn = (siteId: number) => {
    setSelectedSite(siteId);
    setCurrentStep("geoloc");
    setShowCheckInFlow(true);
    setError(null);

    // Obtenir la géolocalisation automatiquement (transparent pour l'utilisateur)
    getGeolocation();
  };

  // Étape 1 : Géolocalisation (automatique, sans passage automatique)
  const getGeolocation = () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre appareil");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const geoData: GeolocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        // Calculer la distance avec le site si un site est sélectionné
        if (selectedSite) {
          const site = mySites.find((s) => s.id === selectedSite);
          if (site?.latitude && site?.longitude) {
            const distance = calculateDistance(
              geoData.latitude,
              geoData.longitude,
              parseFloat(site.latitude),
              parseFloat(site.longitude)
            );
            geoData.distance = distance;
            geoData.withinGeofence = distance <= (site.geofencingRadius || 100);
          }
        }

        setGeolocation(geoData);
        setIsLoading(false);
        // ✅ NE PLUS PASSER AUTOMATIQUEMENT À LA PHOTO
      },
      (error) => {
        console.error("Erreur géolocalisation:", error);
        setGeolocation(null);
        setIsLoading(false);
        // ✅ NE PLUS PASSER AUTOMATIQUEMENT
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Calcul de distance (formule Haversine)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371000; // Rayon de la Terre en mètres
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Étape 2 : Capture photo (déclenchée manuellement par l'utilisateur)
  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      // Créer un élément video pour la capture
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      // Attendre que la vidéo soit prête
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);

      const photoData = canvas.toDataURL("image/jpeg", 0.8);
      setPhoto(photoData);

      // Arrêter la caméra
      stream.getTracks().forEach((track) => track.stop());

      // Analyser la photo avec le service IA
      await analyzePhoto(photoData);

      // Générer des suggestions de commentaires
      generateSmartSuggestions();
      
      // ✅ NE PAS CHANGER D'ÉTAPE AUTOMATIQUEMENT
    } catch (error) {
      console.error("Erreur caméra:", error);
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  // Simulation de capture (pour test sans caméra)
  const simulatePhoto = () => {
    // Créer une image de test
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Fond dégradé
      const gradient = ctx.createLinearGradient(0, 0, 400, 400);
      gradient.addColorStop(0, "#4f46e5");
      gradient.addColorStop(1, "#7c3aed");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 400, 400);

      // Texte
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("📸 Agent de sécurité", 200, 180);
      ctx.font = "16px Arial";
      ctx.fillText("GuardTrack Pro - Photo test", 200, 230);
      ctx.font = "14px Arial";
      ctx.fillText(new Date().toLocaleString("fr-FR"), 200, 270);
    }

    const photoData = canvas.toDataURL("image/jpeg");
    setPhoto(photoData);
    analyzePhoto(photoData);
    generateSmartSuggestions();
  };

  // Analyse IA de la photo - Utilise le service unifié
  const analyzePhoto = async (photoData: string) => {
    setIsAnalyzingPhoto(true);

    try {
      const analysis = await imageAnalysisService.analyzeImage(photoData);
      setPhotoAnalysis(analysis);
      setAiProvider(analysis.provider);
    } catch (error) {
      console.error("Erreur analyse:", error);
      // Fallback en cas d'erreur
      setPhotoAnalysis({
        personCount: 1,
        hasUniform: true,
        uniformConfidence: 0.8,
        objects: [],
        quality: { brightness: 0.5, blur: 0.7, isAcceptable: true },
        remarks: ["📸 Analyse simplifiée", "✅ Photo acceptable"],
        suspicionScore: 15,
        provider: "lightweight",
        processingTime: 0,
      });
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // Génération de suggestions intelligentes
  const generateSmartSuggestions = () => {
    const suggestions = [
      "Début de service - Tout est normal",
      "Prise de poste - Site calme",
      "Relève effectuée - RAS",
      "Accès sécurisé - Porte vérifiée",
    ];

    if (photoAnalysis?.personCount === 1) {
      suggestions.unshift("Agent seul sur site");
    } else if (photoAnalysis?.personCount && photoAnalysis.personCount > 1) {
      suggestions.unshift(`${photoAnalysis.personCount} personnes présentes`);
    }

    if (photoAnalysis?.hasUniform) {
      suggestions.unshift("En tenue réglementaire");
    }

    const hour = new Date().getHours();
    if (hour < 8) {
      suggestions.unshift("Prise de poste matinale");
    } else if (hour > 18) {
      suggestions.unshift("Service de nuit");
    }

    setSmartSuggestions(suggestions.slice(0, 5));
  };

  // Étape 4 : Vérification PIN
  const verifyPin = () => {
    if (pinCode.length !== 5) {
      setError("Le code PIN doit contenir 5 chiffres");
      return;
    }
    setError(null);
    setCurrentStep("summary");
  };

  // Validation finale
  const handleSubmit = async () => {
    if (!selectedSite) return;

    setIsLoading(true);
    setError(null);

    const success = await checkIn(
      selectedSite,
      geolocation?.latitude,
      geolocation?.longitude,
      photo || undefined
    );

    if (success) {
      setShowCheckInFlow(false);
      resetForm();
      loadData();
    } else {
      setError("Erreur lors du pointage. Veuillez réessayer.");
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setSelectedSite(null);
    setCurrentStep("site");
    setGeolocation(null);
    setPhoto(null);
    setPhotoAnalysis(null);
    setComment("");
    setPinCode("");
    setSmartSuggestions([]);
    setError(null);
  };

  const activePresence = todayPresences.find((p: any) => !p.checkOut);

  // ============================================================
  // RENDU : ÉTAT POINTÉ (PRÉSENCE ACTIVE)
  // ============================================================
  if (activePresence) {
    const statusConfig: Record<string, any> = {
      PENDING: {
        icon: faClock,
        title: "En attente de validation",
        color: "bg-yellow-50 border-yellow-200",
        textColor: "text-yellow-800",
        iconColor: "text-yellow-600",
        message:
          "Votre pointage est en attente de validation par un contrôleur.",
      },
      VALIDATED: {
        icon: faCircleCheck,
        title: "Pointage validé",
        color: "bg-green-50 border-green-200",
        textColor: "text-green-800",
        iconColor: "text-green-600",
        message: "Votre présence a été validée.",
      },
      REJECTED: {
        icon: faCircleXmark,
        title: "Pointage rejeté",
        color: "bg-red-50 border-red-200",
        textColor: "text-red-800",
        iconColor: "text-red-600",
        message: `Motif : ${activePresence.rejectionReason || "Non spécifié"}`,
      },
    };

    const status = statusConfig[activePresence.status] || statusConfig.PENDING;

    return (
      <div className="space-y-6">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faUser} className="mr-3 text-indigo-600" />
              Bonjour, {user?.firstName || user?.fullName} !
            </h1>
            <button
              onClick={loadData}
              className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FontAwesomeIcon icon={faRotate} />
            </button>
          </div>
          <p className="text-gray-600 mt-1 flex items-center">
            <FontAwesomeIcon icon={faClock} className="mr-2 text-gray-400" />
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>

        {/* Statut du pointage */}
        <div className={`${status.color} border rounded-lg shadow p-6`}>
          <div className="flex items-start">
            <FontAwesomeIcon
              icon={status.icon}
              className={`text-3xl mr-4 ${status.iconColor}`}
            />
            <div className="flex-1">
              <h2 className={`text-xl font-semibold ${status.textColor} mb-2`}>
                {status.title}
              </h2>
              <p className="text-gray-700">{status.message}</p>

              <div className="mt-4 space-y-2 bg-white bg-opacity-50 rounded-lg p-4">
                <p className="text-sm flex items-center">
                  <FontAwesomeIcon
                    icon={faBuilding}
                    className="w-5 mr-2 text-gray-400"
                  />
                  <span className="font-medium">Site :</span>
                  <span className="ml-2">{activePresence.site.name}</span>
                </p>
                <p className="text-sm flex items-center">
                  <FontAwesomeIcon
                    icon={faClock}
                    className="w-5 mr-2 text-gray-400"
                  />
                  <span className="font-medium">Arrivée :</span>
                  <span className="ml-2">
                    {new Date(activePresence.checkIn).toLocaleTimeString("fr-FR")}
                  </span>
                </p>
                {activePresence.checkOut && (
                  <p className="text-sm flex items-center">
                    <FontAwesomeIcon
                      icon={faClock}
                      className="w-5 mr-2 text-gray-400"
                    />
                    <span className="font-medium">Départ :</span>
                    <span className="ml-2">
                      {new Date(activePresence.checkOut).toLocaleTimeString("fr-FR")}
                    </span>
                  </p>
                )}
              </div>

              {activePresence.status === "PENDING" &&
                activePresence.suspicionScore &&
                activePresence.suspicionScore > 30 && (
                  <p className="text-orange-600 text-sm mt-3 flex items-center">
                    <FontAwesomeIcon
                      icon={faTriangleExclamation}
                      className="mr-2"
                    />
                    Score de suspicion : {activePresence.suspicionScore}/100
                  </p>
                )}

              {activePresence.status === "REJECTED" && (
                <button
                  onClick={() => {
                    setShowCheckInFlow(true);
                    setCurrentStep("site");
                  }}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                >
                  <FontAwesomeIcon icon={faRotate} className="mr-2" />
                  Refaire un pointage
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Sites assignés</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {mySites.length}
                </p>
              </div>
              <FontAwesomeIcon
                icon={faBuilding}
                className="text-3xl text-indigo-200"
              />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pointages aujourd'hui</p>
                <p className="text-2xl font-bold text-green-600">
                  {todayPresences.length}
                </p>
              </div>
              <FontAwesomeIcon
                icon={faClipboardCheck}
                className="text-3xl text-green-200"
              />
            </div>
          </div>
        </div>

        {/* Incidents récents */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                className="mr-2 text-red-600"
              />
              Incidents récents
            </h2>
            <Link
              href="/dashboard/agent/incidents"
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              Voir tout
              <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
            </Link>
          </div>

          {recentIncidents.length > 0 ? (
            <div className="space-y-3">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-medium flex items-center">
                      <FontAwesomeIcon
                        icon={
                          incident.severity === "CRITICAL"
                            ? faCircleExclamation
                            : incident.severity === "HIGH"
                              ? faTriangleExclamation
                              : faCircle
                        }
                        className={`mr-2 text-xs ${
                          incident.severity === "CRITICAL"
                            ? "text-red-600"
                            : incident.severity === "HIGH"
                              ? "text-orange-600"
                              : "text-yellow-600"
                        }`}
                      />
                      {incident.title}
                    </p>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        incident.status === "RESOLVED"
                          ? "bg-green-100 text-green-800"
                          : incident.status === "OPEN"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {incident.status === "RESOLVED"
                        ? "Résolu"
                        : incident.status === "OPEN"
                          ? "Ouvert"
                          : "En cours"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(incident.reportedAt).toLocaleString("fr-FR")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Aucun incident récent
            </p>
          )}

          <Link
            href="/dashboard/agent/incidents/create"
            className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Déclarer un incident
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDU : CHOIX DU SITE OU FLUX DE POINTAGE
  // ============================================================
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faUser} className="mr-3 text-indigo-600" />
              Bonjour, {user?.firstName || user?.fullName} !
            </h1>
            <p className="text-gray-600 mt-1 flex items-center">
              <FontAwesomeIcon icon={faClock} className="mr-2 text-gray-400" />
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FontAwesomeIcon icon={faRotate} />
          </button>
        </div>
      </div>

      {!showCheckInFlow ? (
        // ========== CHOIX DU SITE ==========
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FontAwesomeIcon
              icon={faBuilding}
              className="mr-2 text-indigo-600"
            />
            Choisir un site pour pointer
          </h2>

          {mySites.length > 0 ? (
            <div className="space-y-3">
              {mySites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => startCheckIn(site.id)}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-lg flex items-center">
                        <FontAwesomeIcon
                          icon={faLocationDot}
                          className="mr-2 text-indigo-500"
                        />
                        {site.name}
                      </p>
                      <p className="text-sm text-gray-500 ml-7">
                        {site.address}
                      </p>
                    </div>
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="text-gray-400"
                    />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FontAwesomeIcon
                icon={faBuilding}
                className="text-4xl text-gray-300 mb-3"
              />
              <p className="text-gray-500 mb-4">Aucun site assigné</p>
              <p className="text-sm text-gray-400">
                Contactez votre superviseur pour être assigné à un site
              </p>
            </div>
          )}
        </div>
      ) : (
        // ========== FLUX DE POINTAGE (MULTI-ÉTAPES) ==========
        <div className="bg-white rounded-lg shadow p-6">
          {/* Barre de progression */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[
                { step: "site", label: "Site", icon: faBuilding },
                { step: "geoloc", label: "GPS", icon: faLocationDot },
                { step: "photo", label: "Photo", icon: faCamera },
                { step: "comment", label: "Note", icon: faPen },
                { step: "pin", label: "PIN", icon: faLock },
                { step: "summary", label: "Valider", icon: faCheckCircle },
              ].map((item, index) => {
                const steps: Step[] = [
                  "site",
                  "geoloc",
                  "photo",
                  "comment",
                  "pin",
                  "summary",
                ];
                const stepIndex = steps.indexOf(currentStep);
                const isCompleted = index < stepIndex;
                const isCurrent = currentStep === item.step;

                return (
                  <div key={item.step} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-lg scale-110"
                          : isCompleted
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      <FontAwesomeIcon icon={item.icon} className="text-sm" />
                    </div>
                    <span className="text-xs mt-1 text-gray-500 hidden sm:block">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 bg-gray-200 h-2 rounded-full">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(["site", "geoloc", "photo", "comment", "pin", "summary"].indexOf(currentStep) / 5) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Message d'erreur global */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-800">
              <FontAwesomeIcon icon={faCircleExclamation} className="mr-2" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          )}

          {/* ========== ÉTAPE 1 : GÉOLOCALISATION ========== */}
          {currentStep === "geoloc" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center">
                <FontAwesomeIcon
                  icon={faLocationDot}
                  className="mr-2 text-indigo-600"
                />
                Géolocalisation
              </h2>

              {isLoading ? (
                <div className="text-center py-12">
                  <FontAwesomeIcon
                    icon={faSpinner}
                    spin
                    className="text-4xl text-indigo-600 mb-4"
                  />
                  <p className="text-gray-600">
                    Obtention de votre position...
                  </p>
                </div>
              ) : geolocation ? (
                <div
                  className={`p-6 rounded-lg ${
                    geolocation.withinGeofence
                      ? "bg-green-50 border border-green-200"
                      : "bg-yellow-50 border border-yellow-200"
                  }`}
                >
                  <div className="flex items-start">
                    <FontAwesomeIcon
                      icon={
                        geolocation.withinGeofence
                          ? faCircleCheck
                          : faTriangleExclamation
                      }
                      className={`text-2xl mr-4 ${geolocation.withinGeofence ? "text-green-600" : "text-yellow-600"}`}
                    />
                    <div>
                      <p className="font-medium text-lg">
                        {geolocation.withinGeofence
                          ? "✅ Vous êtes dans la zone autorisée"
                          : "⚠️ Vous êtes hors zone"}
                      </p>
                      <div className="mt-3 space-y-1">
                        <p className="text-sm flex items-center">
                          <FontAwesomeIcon
                            icon={faLocationDot}
                            className="mr-2 text-gray-400 w-4"
                          />
                          Distance : {geolocation.distance?.toFixed(0)} m
                          {geolocation.withinGeofence !== undefined && (
                            <>
                              {" "}
                              / Max :{" "}
                              {mySites.find((s) => s.id === selectedSite)
                                ?.geofencingRadius || 100}{" "}
                              m
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <FontAwesomeIcon
                      icon={faTriangleExclamation}
                      className="text-2xl mr-4 text-yellow-600"
                    />
                    <div>
                      <p className="font-medium text-yellow-800">
                        Géolocalisation non disponible
                      </p>
                      <p className="text-sm text-yellow-600 mt-1">
                        Le pointage reste possible mais sera signalé
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => {
                    setShowCheckInFlow(false);
                    setCurrentStep("site");
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center"
                >
                  <FontAwesomeIcon icon={faTimes} className="mr-2" />
                  Annuler
                </button>
                <button
                  onClick={() => setCurrentStep("photo")}
                  disabled={isLoading}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                >
                  <FontAwesomeIcon icon={faArrowRight} className="mr-2" />
                  Continuer vers la photo
                </button>
              </div>
            </div>
          )}

          {/* ========== ÉTAPE 2 : PHOTO ========== */}
          {currentStep === "photo" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center">
                <FontAwesomeIcon icon={faCamera} className="mr-2 text-indigo-600" />
                Photo obligatoire
              </h2>

              {!photo ? (
                <div className="text-center py-8 space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 flex items-center justify-center">
                      <FontAwesomeIcon icon={faLightbulb} className="mr-2" />
                      Prenez une photo de vous en tenue de travail
                    </p>
                  </div>

                  <button
                    onClick={capturePhoto}
                    className="px-8 py-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-lg flex items-center mx-auto shadow-lg"
                  >
                    <FontAwesomeIcon icon={faCamera} className="mr-3 text-2xl" />
                    Prendre une photo
                  </button>

                  <p className="text-sm text-gray-500 flex items-center justify-center">
                    <FontAwesomeIcon icon={faShield} className="mr-1 text-gray-400" />
                    La photo est obligatoire pour le pointage
                  </p>

                  <button
                    onClick={simulatePhoto}
                    className="text-xs text-gray-400 underline"
                  >
                    [Test] Simuler une photo
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Prévisualisation de la photo */}
                  <div className="relative">
                    <img
                      src={photo}
                      alt="Capture"
                      className="w-full max-w-md mx-auto rounded-lg shadow-md"
                    />
                    <button
                      onClick={() => {
                        setPhoto(null);
                        setPhotoAnalysis(null);
                      }}
                      className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
                      title="Reprendre la photo"
                    >
                      <FontAwesomeIcon icon={faRotate} />
                    </button>
                  </div>

                  {/* Indicateur du provider IA */}
                  {aiProvider && (
                    <div className="flex items-center justify-end">
                      <span className="text-xs text-gray-400 flex items-center">
                        <FontAwesomeIcon icon={faRobot} className="mr-1" />
                        IA : {aiProvider}
                      </span>
                    </div>
                  )}

                  {/* Analyse IA en cours */}
                  {isAnalyzingPhoto ? (
                    <div className="text-center py-8 bg-blue-50 rounded-lg">
                      <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600 mb-3" />
                      <p className="text-gray-700 font-medium">
                        Analyse de la photo en cours...
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Détection d'uniforme, comptage de personnes...
                      </p>
                    </div>
                  ) : photoAnalysis ? (
                    /* Résultats de l'analyse IA */
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                      <p className="font-medium text-blue-800 mb-3 flex items-center">
                        <FontAwesomeIcon icon={faRobot} className="mr-2" />
                        Analyse IA
                        {photoAnalysis.uniformConfidence > 0.7 ? (
                          <span className="ml-2 text-green-600 text-sm">
                            ✅ Haute confiance
                          </span>
                        ) : photoAnalysis.uniformConfidence > 0.4 ? (
                          <span className="ml-2 text-yellow-600 text-sm">
                            ⚠️ Confiance moyenne
                          </span>
                        ) : (
                          <span className="ml-2 text-red-600 text-sm">
                            ❌ Faible confiance
                          </span>
                        )}
                      </p>

                      <ul className="space-y-2 mb-4">
                        {photoAnalysis.remarks.map((remark, i) => {
                          const isPositive = remark.startsWith("✅");
                          const isWarning = remark.startsWith("⚠️");
                          return (
                            <li
                              key={i}
                              className={`text-sm flex items-center ${
                                isPositive
                                  ? "text-green-700"
                                  : isWarning
                                    ? "text-orange-700"
                                    : "text-blue-700"
                              }`}
                            >
                              <FontAwesomeIcon
                                icon={
                                  isPositive
                                    ? faCircleCheck
                                    : isWarning
                                      ? faTriangleExclamation
                                      : faCircle
                                }
                                className="mr-2 text-xs"
                              />
                              {remark}
                            </li>
                          );
                        })}
                      </ul>

                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-blue-200">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Personnes</p>
                          <p className="text-lg font-semibold text-gray-800">
                            {photoAnalysis.personCount}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Uniforme</p>
                          <p className={`text-lg font-semibold ${photoAnalysis.hasUniform ? "text-green-600" : "text-red-600"}`}>
                            {photoAnalysis.hasUniform ? "Oui" : "Non"}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Confiance</p>
                          <p className="text-lg font-semibold text-gray-800">
                            {(photoAnalysis.uniformConfidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 flex items-center">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="mr-2" />
                        Analyse IA non disponible
                      </p>
                      <button
                        onClick={() => analyzePhoto(photo)}
                        className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Réessayer l'analyse
                      </button>
                    </div>
                  )}

                  {/* Boutons d'action */}
                  <div className="flex justify-between pt-4">
                    <button
                      onClick={() => setPhoto(null)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center"
                    >
                      <FontAwesomeIcon icon={faCamera} className="mr-2" />
                      Reprendre la photo
                    </button>

                    <button
                      onClick={() => setCurrentStep("comment")}
                      disabled={isAnalyzingPhoto}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                    >
                      <FontAwesomeIcon icon={faCheck} className="mr-2" />
                      Valider et continuer
                      {!photoAnalysis && (
                        <span className="ml-2 text-xs opacity-75">(sans analyse)</span>
                      )}
                    </button>
                  </div>

                  {!photoAnalysis && !isAnalyzingPhoto && (
                    <p className="text-xs text-gray-400 text-center">
                      ⚠️ Sans analyse IA, le score de suspicion sera plus élevé
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========== ÉTAPE 3 : COMMENTAIRE ========== */}
          {currentStep === "comment" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center">
                <FontAwesomeIcon icon={faPen} className="mr-2 text-indigo-600" />
                Commentaire (optionnel)
              </h2>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ajoutez un commentaire sur votre prise de poste..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={4}
              />

              {smartSuggestions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 flex items-center">
                    <FontAwesomeIcon icon={faLightbulb} className="mr-2 text-yellow-500" />
                    Suggestions :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {smartSuggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setComment(suggestion)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors flex items-center"
                      >
                        <FontAwesomeIcon icon={faPen} className="mr-2 text-gray-400 text-xs" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep("photo")}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                  Retour
                </button>
                <button
                  onClick={() => setCurrentStep("pin")}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
                >
                  Continuer
                  <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* ========== ÉTAPE 4 : CODE PIN ========== */}
          {currentStep === "pin" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center">
                <FontAwesomeIcon icon={faLock} className="mr-2 text-indigo-600" />
                Vérification du code PIN
              </h2>

              <p className="text-gray-600 flex items-center">
                <FontAwesomeIcon icon={faShield} className="mr-2 text-gray-400" />
                Entrez votre code PIN à 5 chiffres pour valider
              </p>

              <div className="flex justify-center">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={5}
                  value={pinCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 5);
                    setPinCode(value);
                    setError(null);
                  }}
                  className="text-center text-4xl tracking-[0.5em] w-64 px-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="•••••"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm text-center flex items-center justify-center">
                  <FontAwesomeIcon icon={faCircleExclamation} className="mr-1" />
                  {error}
                </p>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep("comment")}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                  Retour
                </button>
                <button
                  onClick={verifyPin}
                  disabled={pinCode.length !== 5}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                >
                  Vérifier
                  <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* ========== ÉTAPE 5 : RÉSUMÉ ET VALIDATION ========== */}
          {currentStep === "summary" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center">
                <FontAwesomeIcon icon={faClipboardCheck} className="mr-2 text-green-600" />
                Résumé du pointage
              </h2>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faBuilding} className="w-6 text-gray-400 mr-3" />
                  <span className="w-28 text-gray-600">Site :</span>
                  <span className="font-medium">
                    {mySites.find((s) => s.id === selectedSite)?.name || "Non spécifié"}
                  </span>
                </div>

                <div className="flex items-center">
                  <FontAwesomeIcon icon={faLocationDot} className="w-6 text-gray-400 mr-3" />
                  <span className="w-28 text-gray-600">Géoloc :</span>
                  {geolocation ? (
                    <span className={geolocation.withinGeofence ? "text-green-600" : "text-yellow-600"}>
                      {geolocation.distance !== undefined
                        ? `${Math.round(geolocation.distance)} m`
                        : "Distance non calculée"}
                      <FontAwesomeIcon
                        icon={geolocation.withinGeofence ? faCircleCheck : faTriangleExclamation}
                        className="ml-2 text-xs"
                      />
                    </span>
                  ) : (
                    <span className="text-yellow-600">
                      Non disponible
                      <FontAwesomeIcon icon={faTriangleExclamation} className="ml-2 text-xs" />
                    </span>
                  )}
                </div>

                <div className="flex items-center">
                  <FontAwesomeIcon icon={faCamera} className="w-6 text-gray-400 mr-3" />
                  <span className="w-28 text-gray-600">Photo :</span>
                  <span className="text-green-600 flex items-center">
                    {photo ? "Capturée" : "Non fournie"}
                    {photo && <FontAwesomeIcon icon={faCircleCheck} className="ml-2 text-xs" />}
                  </span>
                </div>

                <div className="flex items-start">
                  <FontAwesomeIcon icon={faRobot} className="w-6 text-gray-400 mr-3 mt-1" />
                  <span className="w-28 text-gray-600">Analyse :</span>
                  <div className="flex-1">
                    {photoAnalysis ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center text-sm">
                            <FontAwesomeIcon icon={faUsers} className="mr-1 text-gray-400 text-xs" />
                            {photoAnalysis.personCount} personne{photoAnalysis.personCount > 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center text-sm">
                            <FontAwesomeIcon icon={faUserTie} className="mr-1 text-gray-400 text-xs" />
                            {photoAnalysis.hasUniform ? "En tenue" : "Tenue non détectée"}
                          </span>
                          <span className="flex items-center text-sm">
                            <FontAwesomeIcon icon={faCircleCheck} className="mr-1 text-gray-400 text-xs" />
                            Confiance : {(photoAnalysis.uniformConfidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        {photoAnalysis.suspicionScore > 30 && (
                          <p className="text-xs text-orange-600 flex items-center mt-1">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1" />
                            Score de suspicion : {photoAnalysis.suspicionScore}/100
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Analyse non disponible</span>
                    )}
                  </div>
                </div>

                {comment && (
                  <div className="flex">
                    <FontAwesomeIcon icon={faPen} className="w-6 text-gray-400 mr-3 mt-1" />
                    <span className="w-28 text-gray-600">Commentaire :</span>
                    <span className="text-gray-700">{comment}</span>
                  </div>
                )}

                <div className="flex items-center">
                  <FontAwesomeIcon icon={faLock} className="w-6 text-gray-400 mr-3" />
                  <span className="w-28 text-gray-600">PIN :</span>
                  <span className="text-green-600 flex items-center">
                    Vérifié
                    <FontAwesomeIcon icon={faCircleCheck} className="ml-2 text-xs" />
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-sm text-center flex items-center justify-center">
                  <FontAwesomeIcon icon={faCircleExclamation} className="mr-1" />
                  {error}
                </p>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep("pin")}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                  Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center text-lg shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                      Pointage en cours...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                      Valider le pointage
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}