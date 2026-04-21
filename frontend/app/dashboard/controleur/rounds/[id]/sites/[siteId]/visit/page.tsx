"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { roundsService } from "../../../../../../../../src/services/api/rounds";
import { imageAnalysisEnhancedService, EnhancedAnalysisResult } from "../../../../../../../../src/services/ai/imageAnalysisEnhanced";
import { CameraCapture } from "../../../../../../../../src/components/CameraCapture";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationDot,
  faQrcode,
  faKey,
  faCamera,
  faUserCheck,
  faUserXmark,
  faPen,
  faClipboardCheck,
  faArrowRight,
  faArrowLeft,
  faSpinner,
  faRotate,
  faCheckCircle,
  faTriangleExclamation,
  faCircleExclamation,
  faRobot,
  faLightbulb,
  faShield,
  faCircleCheck,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { Html5Qrcode } from "html5-qrcode";

type Step =
  | "geoloc"
  | "qr"
  | "pin"
  | "photo"
  | "presence"
  | "comments"
  | "summary";

export default function ControllerVisitPage() {
  const params = useParams();
  const router = useRouter();
  const roundId = parseInt(params.id as string);
  const siteId = parseInt(params.siteId as string);

  const [currentStep, setCurrentStep] = useState<Step>("geoloc");
  const [roundSite, setRoundSite] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Données du formulaire
  const [geolocation, setGeolocation] = useState<any>(null);
  const [qrCode, setQrCode] = useState("");
  const [qrValidated, setQrValidated] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoAnalysis, setPhotoAnalysis] = useState<EnhancedAnalysisResult | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [agentPresenceStatus, setAgentPresenceStatus] = useState<
    "PRESENT" | "ABSENT" | null
  >(null);
  const [absenceReason, setAbsenceReason] = useState("");
  const [comments, setComments] = useState("");
  const [aiProvider, setAiProvider] = useState<string>("lightweight");

  // Scanner QR code avec html5-qrcode
  const [hasCamera, setHasCamera] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCamera, setCurrentCamera] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader";

  useEffect(() => {
    loadRoundSite();
    initializeAIService();

    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (currentStep !== "qr") {
      stopScanner();
      return;
    }

    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [currentStep]);

  const initializeAIService = async () => {
    await imageAnalysisEnhancedService.initialize();
    setAiProvider(imageAnalysisEnhancedService.getCurrentProvider());
  };

  const loadRoundSite = async () => {
    const round = await roundsService.getById(roundId);
    const site = round?.sites?.find((s: any) => s.site?.id === siteId);
    setRoundSite(site);
  };

  // ============================================================
  // ÉTAPE 1 : GÉOLOCALISATION
  // ============================================================
  const getGeolocation = () => {
    setIsLoading(true);
    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const siteLat = parseFloat(roundSite?.site?.latitude || "0");
        const siteLon = parseFloat(roundSite?.site?.longitude || "0");
        const distance = calculateDistance(
          position.coords.latitude,
          position.coords.longitude,
          siteLat,
          siteLon,
        );

        setGeolocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          distance,
          withinGeofence:
            distance <= (roundSite?.site?.geofencingRadius || 100),
        });
        setIsLoading(false);
      },
      (error) => {
        console.error("Erreur GPS:", error);
        setGeolocation(null);
        setIsLoading(false);
      },
    );
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371000;
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

  // ============================================================
  // ÉTAPE 2 : SCAN QR CODE (html5-qrcode)
  // ============================================================
  const startScanner = async () => {
    const element = document.getElementById(scannerContainerId);
    if (!element) {
      console.warn("Élément scanner non trouvé, nouvelle tentative...");
      return;
    }

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(scannerContainerId);
    }

    try {
      const devices = await Html5Qrcode.getCameras();

      if (devices && devices.length > 0) {
        setCameras(devices);
        const backCamera = devices.find(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("arrière") ||
            d.label.toLowerCase().includes("environment"),
        );
        const cameraId = backCamera?.id || devices[0].id;
        setCurrentCamera(cameraId);
        setHasCamera(true);

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await scannerRef.current.start(
          cameraId,
          config,
          onScanSuccess,
          onScanFailure,
        );

        setIsScanning(true);
      } else {
        setHasCamera(false);
      }
    } catch (err) {
      console.error("Erreur démarrage scanner:", err);
      setHasCamera(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Erreur arrêt scanner:", err);
      }
    }
  };

  const onScanSuccess = (decodedText: string) => {
    console.log("QR Code scanné:", decodedText);
    setQrCode(decodedText);

    try {
      const qrData = JSON.parse(decodedText);

      if (qrData.siteId === siteId) {
        setQrValidated(true);
        setError(null);

        stopScanner();

        setTimeout(() => {
          setCurrentStep("pin");
        }, 800);
      } else {
        setQrValidated(false);
        setError(`QR code incorrect`);
      }
    } catch (err) {
      setQrValidated(false);
      setError("Format de QR code invalide. Assurez-vous de scanner le QR code affiché sur le site.");
    }
  };

  const onScanFailure = (error: string) => {
    // Ignorer les erreurs silencieusement pendant le scan
  };

  const switchCamera = async () => {
    if (cameras.length < 2) return;

    const currentIndex = cameras.findIndex((c) => c.id === currentCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex].id;

    await stopScanner();
    setCurrentCamera(nextCamera);

    setTimeout(() => {
      if (scannerRef.current) {
        scannerRef.current
          .start(
            nextCamera,
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            onScanSuccess,
            onScanFailure,
          )
          .then(() => setIsScanning(true));
      }
    }, 500);
  };

  // ============================================================
  // ÉTAPE 3 : CODE PIN
  // ============================================================
  const validatePin = () => {
    if (pinCode.length === 5) {
      setCurrentStep("photo");
    } else {
      setError("Code PIN invalide");
    }
  };

  // ============================================================
  // ÉTAPE 4 : PHOTO (avec analyse IA contextuelle)
  // ============================================================
  const handlePhotoCapture = async (photoData: string) => {
    setPhoto(photoData);
    setShowCamera(false);
    
    // Analyse IA contextuelle pour le contrôleur
    setIsAnalyzingPhoto(true);
    try {
      const analysis = await imageAnalysisEnhancedService.analyzeImage(photoData, {
        context: 'controller_visit',
        expectedPersonCount: 2,
        checkUniform: true,
      });
      setPhotoAnalysis(analysis);
      setAiProvider(analysis.provider);
    } catch (error) {
      console.error("Erreur analyse photo:", error);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const presenceOptions = [
    {
      value: "PRESENT",
      label: "✅ Agent présent",
      icon: faUserCheck,
      color: "bg-green-100 border-green-500",
    },
    {
      value: "ABSENT",
      label: "❌ Agent absent",
      icon: faUserXmark,
      color: "bg-red-100 border-red-500",
    },
  ];

  const absenceReasons = [
    { value: "CONGE", label: "Congé / Repos" },
    { value: "MALADIE", label: "Maladie" },
    { value: "RETARD", label: "Retard" },
    { value: "ABSENCE_INJUSTIFIEE", label: "Absence injustifiée" },
    { value: "INCONNUE", label: "Raison inconnue" },
    { value: "AUTRE", label: "Autre" },
  ];

  // ============================================================
  // ÉTAPE 7 : SOUMISSION
  // ============================================================
  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!agentPresenceStatus) {
        setError("Veuillez sélectionner le statut de l'agent");
        setIsLoading(false);
        return;
      }

      if (agentPresenceStatus === "ABSENT" && !absenceReason) {
        setError("Veuillez sélectionner une raison d'absence");
        setIsLoading(false);
        return;
      }

      const visitData = {
        gpsLatitude: geolocation?.latitude ?? undefined,
        gpsLongitude: geolocation?.longitude ?? undefined,
        qrCodeScanned: qrValidated,
        pinEntered: true,
        photo: photo ?? undefined,
        photoAnalysis: photoAnalysis ?? undefined,
        agentPresenceStatus: agentPresenceStatus,
        absenceReason:
          agentPresenceStatus === "ABSENT"
            ? absenceReason || undefined
            : undefined,
        comments: comments?.trim() || undefined,
        distanceFromSite: geolocation?.distance ?? undefined,
      };

      await roundsService.controllerVisitSite(roundId, siteId, visitData);
      router.push(`/dashboard/controleur/rounds/${roundId}`);
    } catch (error) {
      console.error("Erreur soumission:", error);
      setError("Erreur lors de l'enregistrement");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Modal Camera */}
      {showCamera && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          onCancel={() => setShowCamera(false)}
          title="Photo de vérification"
          description="Prenez une photo montrant l'agent en tenue"
        />
      )}

      {/* Barre de progression */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          {["GPS", "QR", "PIN", "📸", "👤", "💬", "✅"].map((label, i) => {
            const steps: Step[] = [
              "geoloc",
              "qr",
              "pin",
              "photo",
              "presence",
              "comments",
              "summary",
            ];
            const isCompleted = i < steps.indexOf(currentStep);
            const isCurrent = steps[i] === currentStep;

            return (
              <div key={i} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                  ${isCurrent ? "bg-indigo-600 text-white" : isCompleted ? "bg-green-500 text-white" : "bg-gray-200"}
                `}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contenu de l'étape */}
      <div className="bg-white rounded-lg shadow p-6">
        {currentStep === "geoloc" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FontAwesomeIcon
                icon={faLocationDot}
                className="mr-2 text-indigo-600"
              />
              Géolocalisation
            </h2>
            {!geolocation ? (
              <button
                onClick={getGeolocation}
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg"
              >
                {isLoading ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  "Obtenir ma position"
                )}
              </button>
            ) : (
              <div
                className={`p-4 rounded-lg ${geolocation.withinGeofence ? "bg-green-50" : "bg-yellow-50"}`}
              >
                <p>Distance : {geolocation.distance?.toFixed(0)} m</p>
                <p>
                  {geolocation.withinGeofence
                    ? "✅ Dans la zone"
                    : "⚠️ Hors zone"}
                </p>
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep("qr")}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Continuer{" "}
                <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {currentStep === "qr" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FontAwesomeIcon
                icon={faQrcode}
                className="mr-2 text-indigo-600"
              />
              Scan QR Code
            </h2>

            <p className="text-sm text-gray-600">
              Scannez le QR code affiché sur le site
            </p>

            {hasCamera ? (
              <div className="space-y-3">
                <div
                  id={scannerContainerId}
                  className="w-full rounded-lg overflow-hidden bg-black"
                  style={{ minHeight: "300px" }}
                />

                {cameras.length > 1 && (
                  <div className="flex justify-center">
                    <button
                      onClick={switchCamera}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      <FontAwesomeIcon icon={faRotate} className="mr-2" />
                      Changer de caméra
                    </button>
                  </div>
                )}

                {isScanning && (
                  <p className="text-xs text-gray-500 text-center">
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-1" />
                    Recherche de QR code...
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <FontAwesomeIcon
                  icon={faCamera}
                  className="text-3xl text-yellow-600 mb-2"
                />
                <p className="text-yellow-800">Caméra non disponible</p>
                <p className="text-sm text-yellow-600 mt-1">
                  Veuillez vérifier les permissions de la caméra
                </p>
              </div>
            )}

            {qrCode && (
              <div
                className={`p-3 rounded-lg ${qrValidated ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
              >
                {qrValidated ? (
                  <p className="text-green-600 text-sm mt-1">
                    ✅ QR Code valide - Redirection...
                  </p>
                ) : (
                  <p className="text-red-600 text-sm mt-1">
                    ❌ QR Code invalide pour ce site
                  </p>
                )}
              </div>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => {
                  stopScanner();
                  setCurrentStep("geoloc");
                }}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Retour
              </button>
            </div>
          </div>
        )}

        {currentStep === "pin" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FontAwesomeIcon icon={faKey} className="mr-2 text-indigo-600" />
              Code PIN contrôleur
            </h2>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={pinCode}
              onChange={(e) =>
                setPinCode(e.target.value.replace(/\D/g, "").slice(0, 5))
              }
              className="w-full text-center text-3xl tracking-widest px-4 py-3 border rounded-lg"
              placeholder="•••••"
            />
            {error && (
              <p className="text-red-600 text-sm flex items-center">
                <FontAwesomeIcon icon={faCircleExclamation} className="mr-1" />
                {error}
              </p>
            )}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep("qr")}
                className="px-4 py-2 bg-gray-100 rounded-lg"
              >
                <FontAwesomeIcon icon={faArrowLeft} /> Retour
              </button>
              <button
                onClick={validatePin}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {currentStep === "photo" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FontAwesomeIcon
                icon={faCamera}
                className="mr-2 text-indigo-600"
              />
              Photo de vérification
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 flex items-center">
                <FontAwesomeIcon icon={faLightbulb} className="mr-2" />
                Prenez une photo montrant l'agent en tenue de travail
              </p>
            </div>

            {!photo ? (
              <div className="text-center py-8 space-y-4">
                <button
                  onClick={() => setShowCamera(true)}
                  className="px-8 py-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-lg flex items-center mx-auto shadow-lg"
                >
                  <FontAwesomeIcon icon={faCamera} className="mr-3 text-2xl" />
                  Prendre une photo
                </button>
                <p className="text-sm text-gray-500 flex items-center justify-center">
                  <FontAwesomeIcon icon={faShield} className="mr-1 text-gray-400" />
                  La photo permet de vérifier la présence et la tenue de l'agent
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Prévisualisation */}
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

                {/* Provider IA */}
                {aiProvider && !isAnalyzingPhoto && (
                  <div className="flex items-center justify-end">
                    <span className="text-xs text-gray-400 flex items-center">
                      <FontAwesomeIcon icon={faRobot} className="mr-1" />
                      IA : {aiProvider}
                    </span>
                  </div>
                )}

                {/* Analyse en cours */}
                {isAnalyzingPhoto ? (
                  <div className="text-center py-6 bg-blue-50 rounded-lg">
                    <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600 mb-3" />
                    <p className="text-gray-700 font-medium">
                      Analyse de la photo en cours...
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Détection de l'agent, de l'uniforme, qualité d'image...
                    </p>
                  </div>
                ) : photoAnalysis ? (
                  /* Résultats de l'analyse */
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-blue-800 flex items-center">
                        <FontAwesomeIcon icon={faRobot} className="mr-2" />
                        Analyse IA - Contrôle
                      </p>
                      {photoAnalysis.meetsExpectations ? (
                        <span className="text-green-600 text-sm flex items-center">
                          <FontAwesomeIcon icon={faCircleCheck} className="mr-1" />
                          Conforme
                        </span>
                      ) : (
                        <span className="text-yellow-600 text-sm flex items-center">
                          <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1" />
                          Vérifier
                        </span>
                      )}
                    </div>

                    <ul className="space-y-2 mb-4">
                      {photoAnalysis.remarks.map((remark: string, i: number) => {
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
                                    : faCheck
                              }
                              className="mr-2 text-xs"
                            />
                            {remark}
                          </li>
                        );
                      })}
                    </ul>

                    <div className="grid grid-cols-4 gap-2 pt-3 border-t border-blue-200">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Personnes</p>
                        <p className={`text-lg font-semibold ${photoAnalysis.personCount >= 2 ? "text-green-600" : "text-orange-600"}`}>
                          {photoAnalysis.personCount}/2
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Uniforme</p>
                        <p className={`text-lg font-semibold ${photoAnalysis.hasUniform ? "text-green-600" : "text-red-600"}`}>
                          {photoAnalysis.hasUniform ? "Oui" : "Non"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Qualité</p>
                        <p className={`text-lg font-semibold ${photoAnalysis.quality.isAcceptable ? "text-green-600" : "text-yellow-600"}`}>
                          {photoAnalysis.quality.isAcceptable ? "OK" : "⚠️"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Suspicion</p>
                        <p className={`text-lg font-semibold ${photoAnalysis.suspicionScore > 50 ? "text-red-600" : "text-gray-800"}`}>
                          {photoAnalysis.suspicionScore}/100
                        </p>
                      </div>
                    </div>

                    {!photoAnalysis.meetsExpectations && (
                      <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
                        <FontAwesomeIcon icon={faLightbulb} className="mr-1" />
                        {photoAnalysis.expectationDetails.join(" • ")}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 flex items-center">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="mr-2" />
                      Analyse IA non disponible
                    </p>
                    <button
                      onClick={() => handlePhotoCapture(photo)}
                      className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Réessayer l'analyse
                    </button>
                  </div>
                )}

                {!photoAnalysis && !isAnalyzingPhoto && (
                  <p className="text-xs text-gray-400 text-center">
                    ⚠️ Sans analyse IA, la visite sera enregistrée mais pourra être vérifiée ultérieurement
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep("pin")}
                className="px-4 py-2 bg-gray-100 rounded-lg"
              >
                <FontAwesomeIcon icon={faArrowLeft} /> Retour
              </button>
              <button
                onClick={() => setCurrentStep("presence")}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {currentStep === "presence" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Statut de l'agent</h2>
            <div className="grid grid-cols-2 gap-4">
              {presenceOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAgentPresenceStatus(opt.value as any)}
                  className={`p-4 border-2 rounded-lg ${agentPresenceStatus === opt.value ? opt.color : "border-gray-200"}`}
                >
                  <FontAwesomeIcon icon={opt.icon} className="text-2xl mb-2" />
                  <p className="font-medium">{opt.label}</p>
                </button>
              ))}
            </div>

            {agentPresenceStatus === "ABSENT" && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">
                  Raison de l'absence
                </label>
                <select
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Sélectionnez une raison</option>
                  {absenceReasons.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep("photo")}
                className="px-4 py-2 bg-gray-100 rounded-lg"
              >
                <FontAwesomeIcon icon={faArrowLeft} /> Retour
              </button>
              <button
                onClick={() => setCurrentStep("comments")}
                disabled={
                  !agentPresenceStatus ||
                  (agentPresenceStatus === "ABSENT" && !absenceReason)
                }
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {currentStep === "comments" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FontAwesomeIcon icon={faPen} className="mr-2" />
              Commentaires
            </h2>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg"
              rows={4}
              placeholder="Ajoutez vos observations..."
            />
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep("presence")}
                className="px-4 py-2 bg-gray-100 rounded-lg"
              >
                <FontAwesomeIcon icon={faArrowLeft} /> Retour
              </button>
              <button
                onClick={() => setCurrentStep("summary")}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {currentStep === "summary" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FontAwesomeIcon
                icon={faClipboardCheck}
                className="mr-2 text-green-600"
              />
              Résumé de la visite
            </h2>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p>
                <strong>Site :</strong> {roundSite?.site?.name}
              </p>
              <p>
                <strong>GPS :</strong>{" "}
                {geolocation
                  ? `${geolocation.distance?.toFixed(0)}m`
                  : "Non disponible"}
              </p>
              <p>
                <strong>QR Code :</strong>{" "}
                {qrValidated ? "✅ Validé" : "❌ Non validé"}
              </p>
              <p>
                <strong>Photo :</strong>{" "}
                {photo ? (
                  <span className="flex items-center">
                    ✅ Capturée
                    {photoAnalysis && (
                      <span className={`ml-2 text-xs ${photoAnalysis.meetsExpectations ? 'text-green-600' : 'text-yellow-600'}`}>
                        ({photoAnalysis.meetsExpectations ? 'Analyse OK' : 'À vérifier'})
                      </span>
                    )}
                  </span>
                ) : "❌ Non capturée"}
              </p>
              <p>
                <strong>Statut agent :</strong>{" "}
                {agentPresenceStatus === "PRESENT" ? "✅ Présent" : "❌ Absent"}
              </p>
              {agentPresenceStatus === "ABSENT" && (
                <p>
                  <strong>Raison :</strong> {absenceReason}
                </p>
              )}
              {comments && (
                <p>
                  <strong>Commentaires :</strong> {comments}
                </p>
              )}
            </div>

            {error && <p className="text-red-600">{error}</p>}

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep("comments")}
                className="px-4 py-2 bg-gray-100 rounded-lg"
              >
                <FontAwesomeIcon icon={faArrowLeft} /> Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-8 py-3 bg-green-600 text-white rounded-lg"
              >
                {isLoading ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  "Valider la visite"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}