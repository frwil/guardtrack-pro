"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { roundsService } from "../../../../../../../src/services/api/rounds";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationDot,
  faQrcode,
  faKey,
  faCamera,
  faUser,
  faUserCheck,
  faUserXmark,
  faPen,
  faClipboardCheck,
  faArrowRight,
  faArrowLeft,
  faSpinner,
  faCircleCheck,
  faTriangleExclamation,
  faRobot,
  faUsers,
  faUserTie,
  faRotate,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";

// Import dynamique pour jsQR
let jsQR: any = null;

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
  const [photoAnalysis, setPhotoAnalysis] = useState<any>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [agentPresenceStatus, setAgentPresenceStatus] = useState<
    "PRESENT" | "ABSENT" | null
  >(null);
  const [absenceReason, setAbsenceReason] = useState("");
  const [comments, setComments] = useState("");
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);

  // Scanner QR code
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  useEffect(() => {
    loadRoundSite();
    
    // Charger jsQR dynamiquement
    import("jsqr")
      .then((module) => {
        jsQR = module.default;
        console.log('✅ jsQR chargé avec succès');
      })
      .catch((err) => {
        console.error('❌ Erreur chargement jsQR:', err);
      });

    return () => {
      stopCamera();
      if (scanIntervalRef.current) {
        cancelAnimationFrame(scanIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentStep === "qr") {
      startCamera();
    } else {
      stopCamera();
    }
  }, [currentStep, facingMode]);

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
          withinGeofence: distance <= (roundSite?.site?.geofencingRadius || 100),
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
  // ÉTAPE 2 : SCAN QR CODE
  // ============================================================
  const startCamera = async () => {
    setIsCameraLoading(true);
    try {
      const constraints: MediaTrackConstraints = {
        facingMode: facingMode,
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
      }
      setHasCamera(true);
      setIsScanning(true);
      scanQRCode();
    } catch (err) {
      console.error("Erreur caméra:", err);
      setHasCamera(false);
    } finally {
      setIsCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const toggleTorch = async () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities();
          if ('torch' in capabilities) {
            await videoTrack.applyConstraints({
              advanced: [{ torch: !torchEnabled } as any],
            });
            setTorchEnabled(!torchEnabled);
          } else {
            console.warn("Torche non supportée sur cet appareil");
          }
        } catch (err) {
          console.error("Erreur torche:", err);
        }
      }
    }
  };

  const switchCamera = () => {
    stopCamera();
    setFacingMode(facingMode === "environment" ? "user" : "environment");
  };

  const scanQRCode = () => {
    if (!isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      scanIntervalRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    if (typeof jsQR !== 'function') {
      scanIntervalRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      scanIntervalRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        if (code && code.data) {
          console.log('QR Code détecté:', code.data);
          setQrCode(code.data);
          if (code.data === roundSite?.site?.qrCode) {
            setQrValidated(true);
            setError(null);
          } else {
            setQrValidated(false);
            setError("QR code invalide pour ce site");
          }
          stopCamera();
          return;
        }
      } catch (err) {
        console.error('Erreur décodage QR:', err);
      }
    }

    scanIntervalRef.current = requestAnimationFrame(scanQRCode);
  };

  const validateQrCode = () => {
    if (qrCode === roundSite?.site?.qrCode) {
      setQrValidated(true);
      setError(null);
    } else {
      setError("QR code invalide pour ce site");
    }
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
  // ÉTAPE 4 : PHOTO
  // ============================================================
  const capturePhoto = async () => {
    // À implémenter
  };

  // ============================================================
  // ÉTAPE 5 : STATUT DE PRÉSENCE
  // ============================================================
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

            {/* Scanner de QR code */}
            {hasCamera ? (
              <div className="space-y-3">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: "300px" }}>
                  {isCameraLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                      <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-white" />
                    </div>
                  )}
                  
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    style={{ display: isCameraLoading ? "none" : "block" }}
                    playsInline
                    muted
                  />
                  
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Zone de scan */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 border-2 border-indigo-500 m-8 rounded-lg opacity-50" />
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-500 animate-pulse" />
                  </div>
                  
                  {/* Indicateur de scan */}
                  {isScanning && (
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                      <span className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                        <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                        Recherche de QR code...
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={switchCamera}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    title="Changer de caméra"
                  >
                    <FontAwesomeIcon icon={faRotate} />
                  </button>
                  <button
                    onClick={toggleTorch}
                    className={`px-4 py-2 rounded-lg ${
                      torchEnabled 
                        ? "bg-yellow-500 text-white hover:bg-yellow-600" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    title="Torche"
                  >
                    <FontAwesomeIcon icon={faLightbulb} />
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 text-center">
                  Placez le QR code dans le cadre pour le scanner automatiquement
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <FontAwesomeIcon icon={faCamera} className="text-3xl text-yellow-600 mb-2" />
                <p className="text-yellow-800">Caméra non disponible</p>
                <p className="text-sm text-yellow-600 mt-1">
                  Veuillez utiliser la saisie manuelle ci-dessous
                </p>
              </div>
            )}

            {/* Option de saisie manuelle (toujours visible) */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Ou saisissez le code manuellement :
              </p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  placeholder="Ex: SITE-12345"
                  className="flex-1 px-4 py-2 border rounded-lg"
                />
                <button
                  onClick={validateQrCode}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Valider
                </button>
              </div>
            </div>

            {/* Affichage du QR code scanné */}
            {qrCode && (
              <div className={`p-3 rounded-lg ${qrValidated ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className="text-sm text-gray-600">Code détecté :</p>
                <p className="font-mono text-sm break-all">{qrCode}</p>
                {qrValidated ? (
                  <p className="text-green-600 text-sm mt-1">✅ QR Code valide</p>
                ) : (
                  <p className="text-yellow-600 text-sm mt-1">⚠️ QR Code non valide pour ce site</p>
                )}
              </div>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => {
                  stopCamera();
                  setCurrentStep("geoloc");
                }}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Retour
              </button>
              {qrValidated && (
                <button
                  onClick={() => {
                    stopCamera();
                    setCurrentStep("pin");
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Continuer <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                </button>
              )}
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
              Photo du site
            </h2>
            <p className="text-gray-500 text-center py-8">
              Capture photo à implémenter
            </p>
            <div className="flex justify-between">
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
                {photo ? "✅ Capturée" : "❌ Non capturée"}
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