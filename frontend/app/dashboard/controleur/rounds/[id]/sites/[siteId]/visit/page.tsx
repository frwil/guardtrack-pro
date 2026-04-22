"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { roundsService } from "../../../../../../../../src/services/api/rounds";
import {
  imageAnalysisEnhancedService,
  EnhancedAnalysisResult,
} from "../../../../../../../../src/services/ai/imageAnalysisEnhanced";
import { settingsService, AppSettings } from "../../../../../../../../src/services/api/settings";
import { useAuthStore } from "../../../../../../../../src/stores/authStore";
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
  faUpload,
  faDesktop,
  faMobileAlt,
  faFolderOpen,
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

  // Store d'authentification
  const { user, loginWithPin, error: authError } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<Step>("geoloc");
  const [roundSite, setRoundSite] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paramètres de l'application
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  // Données du formulaire
  const [geolocation, setGeolocation] = useState<any>(null);
  const [qrCode, setQrCode] = useState("");
  const [qrValidated, setQrValidated] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoSource, setPhotoSource] = useState<"camera" | "gallery" | null>(null); // ✅ Source de la photo
  const [photoAnalysis, setPhotoAnalysis] = useState<EnhancedAnalysisResult | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [agentPresenceStatus, setAgentPresenceStatus] = useState<"PRESENT" | "ABSENT" | null>(null);
  const [absenceReason, setAbsenceReason] = useState("");
  const [comments, setComments] = useState("");
  const [aiProvider, setAiProvider] = useState<string>("lightweight");

  // Détection du type d'appareil
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scanner QR code avec html5-qrcode
  const [hasCamera, setHasCamera] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCamera, setCurrentCamera] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader";

  // Rayon de géorepérage (depuis les settings ou défaut)
  const geofencingRadius = appSettings?.security?.geofencingRadius || 100;
  const offSiteThreshold = 50;

  // Détection du type d'appareil
  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTabletDevice = /ipad|tablet|kindle|silk|playbook/i.test(userAgent) || 
        (navigator.maxTouchPoints > 1 && !isMobileDevice);
      
      setIsMobile(isMobileDevice);
      setIsTablet(isTabletDevice);
    };
    
    detectDevice();
  }, []);

  useEffect(() => {
    loadRoundSite();
    initializeAIService();
    loadSettings();

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

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getSettings();
      setAppSettings(settings);
    } catch (error) {
      console.error("Erreur chargement paramètres:", error);
    }
  };

  const initializeAIService = async () => {
    try {
      await imageAnalysisEnhancedService.initialize();

      try {
        const testRes = await fetch('/api/ai/analyze-image');
        const testData = await testRes.json();
        if (testData.hasKey) {
          await imageAnalysisEnhancedService.setProvider('zai');
          setAiProvider('zai');
          return;
        }
      } catch {
        // Fallback silencieux
      }

      const provider = imageAnalysisEnhancedService.getCurrentProvider();
      setAiProvider(provider);
    } catch (error) {
      console.error("Erreur initialisation IA:", error);
    }
  };

  const loadRoundSite = async () => {
    try {
      const round = await roundsService.getById(roundId);
      const site = round?.sites?.find((s: any) => s.site?.id === siteId);
      setRoundSite(site);
    } catch (error) {
      console.error("Erreur chargement ronde:", error);
    }
  };

  const isStepRequired = (step: Step): boolean => {
    if (!appSettings) return true;
    
    switch (step) {
      case "photo":
        return appSettings.security.requirePhoto;
      case "pin":
        return appSettings.security.requirePin;
      case "geoloc":
        return appSettings.security.requireGeolocation;
      default:
        return true;
    }
  };

  const getActiveSteps = (): Step[] => {
    const allSteps: Step[] = ["geoloc", "qr", "pin", "photo", "presence", "comments", "summary"];
    
    return allSteps.filter(step => {
      if (step === "geoloc" && !isStepRequired("geoloc")) return false;
      if (step === "pin" && !isStepRequired("pin")) return false;
      if (step === "photo" && !isStepRequired("photo")) return false;
      return true;
    });
  };

  const goToNextStep = () => {
    const activeSteps = getActiveSteps();
    const currentIndex = activeSteps.indexOf(currentStep);
    
    if (currentIndex < activeSteps.length - 1) {
      setCurrentStep(activeSteps[currentIndex + 1]);
    }
  };

  const goToPreviousStep = () => {
    const activeSteps = getActiveSteps();
    const currentIndex = activeSteps.indexOf(currentStep);
    
    if (currentIndex > 0) {
      setCurrentStep(activeSteps[currentIndex - 1]);
    }
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
          siteLon
        );

        setGeolocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          distance,
          withinGeofence: distance <= geofencingRadius,
        });
        setIsLoading(false);
      },
      (error) => {
        console.error("Erreur GPS:", error);
        setGeolocation(null);
        setIsLoading(false);
      }
    );
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
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
            d.label.toLowerCase().includes("environment")
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
          onScanFailure
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
          goToNextStep();
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
            onScanFailure
          )
          .then(() => setIsScanning(true));
      }
    }, 500);
  };

  // ============================================================
  // ÉTAPE 3 : CODE PIN (avec vérification via authStore)
  // ============================================================
  const verifyPin = async () => {
    if (pinCode.length !== 5) {
      setError("Le code PIN doit contenir 5 chiffres");
      return;
    }

    if (!user?.email) {
      setError("Session expirée. Veuillez vous reconnecter.");
      return;
    }

    setIsVerifyingPin(true);
    setError(null);

    try {
      const success = await loginWithPin(user.email, pinCode);

      if (success) {
        goToNextStep();
      } else {
        setError(authError || "Code PIN incorrect");
        setPinCode("");
      }
    } catch (error) {
      console.error("Erreur vérification PIN:", error);
      setError("Erreur lors de la vérification du PIN");
      setPinCode("");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // ============================================================
  // ÉTAPE 4 : PHOTO (avec analyse IA contextuelle)
  // ============================================================
  
  // Capture via caméra (mobile/tablette)
  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);

      const photoData = canvas.toDataURL("image/jpeg", 0.8);
      setPhoto(photoData);
      setPhotoSource("camera"); // ✅ Source = caméra

      stream.getTracks().forEach((track) => track.stop());

      analyzePhoto(photoData);
    } catch (error) {
      console.error("Erreur caméra:", error);
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  // Sélection de fichier (ordinateur uniquement)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Veuillez sélectionner une image valide");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const photoData = e.target?.result as string;
      setPhoto(photoData);
      setPhotoSource("gallery"); // ✅ Source = galerie
      analyzePhoto(photoData);
    };
    reader.onerror = () => {
      setError("Erreur lors de la lecture du fichier");
    };
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const analyzePhoto = async (photoData: string) => {
    setIsAnalyzingPhoto(true);

    try {
      const analysis = await imageAnalysisEnhancedService.analyzeImage(
        photoData,
        {
          context: "controller_visit",
          expectedPersonCount: 2,
          checkUniform: true,
        }
      );
      
      setPhotoAnalysis(analysis);
      setAiProvider(analysis.provider);
      
    } catch (error: any) {
      console.error("Erreur analyse:", error);
      
      try {
        const { lightweightAnalyzer } = await import('../../../../../../../../src/services/ai/lightweightAnalysis');
        const fallback = await lightweightAnalyzer.analyzeImage(photoData);
        setPhotoAnalysis({
          ...fallback,
          objects: [],
          faces: undefined,
          provider: 'lightweight',
          processingTime: 0,
          context: 'controller_visit',
          meetsExpectations: fallback.personCount >= 2 && fallback.hasUniform,
          expectationDetails: [],
        } as any);
        setAiProvider('lightweight');
      } catch (fallbackError) {
        console.error("Erreur fallback:", fallbackError);
      }
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const presenceOptions = [
    { value: "PRESENT", label: "✅ Agent présent", icon: faUserCheck, color: "bg-green-100 border-green-500" },
    { value: "ABSENT", label: "❌ Agent absent", icon: faUserXmark, color: "bg-red-100 border-red-500" },
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
  // SOUMISSION
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

      // ✅ Ajouter la source de la photo dans les commentaires si nécessaire
      let finalComments = comments?.trim() || "";
      if (photo && photoSource === "gallery") {
        const sourceNote = "📁 Photo importée depuis la galerie.";
        finalComments = finalComments ? `${finalComments}\n${sourceNote}` : sourceNote;
      }

      const visitData = {
        gpsLatitude: geolocation?.latitude ?? undefined,
        gpsLongitude: geolocation?.longitude ?? undefined,
        qrCodeScanned: qrValidated,
        pinEntered: isStepRequired("pin") ? true : (pinCode.length === 5),
        photo: isStepRequired("photo") ? (photo ?? undefined) : undefined,
        photoAnalysis: photoAnalysis ?? undefined,
        agentPresenceStatus: agentPresenceStatus,
        absenceReason: agentPresenceStatus === "ABSENT" ? absenceReason || undefined : undefined,
        comments: finalComments || undefined,
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
  
  const getStepLabels = () => {
    const labels: { label: string; step: Step }[] = [];
    
    if (isStepRequired("geoloc")) labels.push({ label: "GPS", step: "geoloc" });
    labels.push({ label: "QR", step: "qr" });
    if (isStepRequired("pin")) labels.push({ label: "PIN", step: "pin" });
    if (isStepRequired("photo")) labels.push({ label: "📸", step: "photo" });
    labels.push({ label: "👤", step: "presence" });
    labels.push({ label: "💬", step: "comments" });
    labels.push({ label: "✅", step: "summary" });
    
    return labels;
  };

  const stepLabels = getStepLabels();
  const activeSteps = getActiveSteps();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Input file caché pour la sélection de fichier (ordinateur uniquement) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/webp,image/bmp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Barre de progression dynamique */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          {stepLabels.map((item, i) => {
            const currentIndex = activeSteps.indexOf(currentStep);
            const itemIndex = activeSteps.indexOf(item.step);
            const isCompleted = itemIndex < currentIndex;
            const isCurrent = item.step === currentStep;

            return (
              <div key={i} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                  ${isCurrent ? "bg-indigo-600 text-white" : isCompleted ? "bg-green-500 text-white" : "bg-gray-200"}
                `}
                >
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contenu de l'étape */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* ÉTAPE GÉOLOCALISATION */}
        {currentStep === "geoloc" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FontAwesomeIcon icon={faLocationDot} className="mr-2 text-indigo-600" />
              Géolocalisation
              {!isStepRequired("geoloc") && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span>
              )}
            </h2>
            
            {!geolocation ? (
              <>
                <button
                  onClick={getGeolocation}
                  disabled={isLoading}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg"
                >
                  {isLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : "Obtenir ma position"}
                </button>
                
                {!isStepRequired("geoloc") && (
                  <button onClick={goToNextStep} className="w-full py-2 text-gray-500 underline text-sm">
                    Passer cette étape
                  </button>
                )}
              </>
            ) : (
              <>
                <div className={`p-4 rounded-lg ${geolocation.withinGeofence ? "bg-green-50" : "bg-yellow-50"}`}>
                  <p className="flex items-center">
                    Distance : {geolocation.distance?.toFixed(0)} m
                    {geolocation.distance > offSiteThreshold && (
                      <span className="ml-2 px-2 py-0.5 bg-orange-200 text-orange-800 text-xs rounded-full">⚠️ Hors site</span>
                    )}
                  </p>
                  <p>{geolocation.withinGeofence ? "✅ Dans la zone" : "⚠️ Hors zone"}</p>
                  <p className="text-xs text-gray-500 mt-1">Rayon configuré : {geofencingRadius}m</p>
                </div>
                
                {geolocation.distance > offSiteThreshold && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-orange-800 text-sm flex items-center">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="mr-2" />
                      Vous êtes à plus de {offSiteThreshold}m du site. La visite sera marquée comme "Hors site".
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button onClick={goToNextStep} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">
                    Continuer <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ÉTAPE QR */}
        {currentStep === "qr" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FontAwesomeIcon icon={faQrcode} className="mr-2 text-indigo-600" />
              Scan QR Code
            </h2>

            <p className="text-sm text-gray-600">Scannez le QR code affiché sur le site</p>

            {hasCamera ? (
              <div className="space-y-3">
                <div id={scannerContainerId} className="w-full rounded-lg overflow-hidden bg-black" style={{ minHeight: "300px" }} />

                {cameras.length > 1 && (
                  <div className="flex justify-center">
                    <button onClick={switchCamera} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
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
                <FontAwesomeIcon icon={faCamera} className="text-3xl text-yellow-600 mb-2" />
                <p className="text-yellow-800">Caméra non disponible</p>
                <p className="text-sm text-yellow-600 mt-1">Veuillez vérifier les permissions de la caméra</p>
              </div>
            )}

            {qrCode && (
              <div className={`p-3 rounded-lg ${qrValidated ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                {qrValidated ? (
                  <p className="text-green-600 text-sm mt-1">✅ QR Code valide - Redirection...</p>
                ) : (
                  <p className="text-red-600 text-sm mt-1">❌ QR Code invalide pour ce site</p>
                )}
              </div>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => {
                  stopScanner();
                  goToPreviousStep();
                }}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Retour
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE PIN */}
        {currentStep === "pin" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FontAwesomeIcon icon={faKey} className="mr-2 text-indigo-600" />
              Code PIN contrôleur
              {!isStepRequired("pin") && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span>
              )}
            </h2>

            <p className="text-sm text-gray-600">Entrez votre code PIN à 5 chiffres pour continuer</p>

            <div className="flex justify-center">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                value={pinCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 5);
                  setPinCode(value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pinCode.length === 5 && !isVerifyingPin) {
                    verifyPin();
                  }
                }}
                className="text-center text-4xl tracking-[0.5em] w-64 px-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                placeholder="•••••"
                autoFocus
                disabled={isVerifyingPin}
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center flex items-center justify-center">
                <FontAwesomeIcon icon={faCircleExclamation} className="mr-1" />
                {error}
              </p>
            )}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => {
                  setPinCode("");
                  setError(null);
                  goToPreviousStep();
                }}
                disabled={isVerifyingPin}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Retour
              </button>

              {!isStepRequired("pin") && (
                <button onClick={goToNextStep} className="px-4 py-2 text-gray-500 underline text-sm">
                  Passer cette étape
                </button>
              )}

              <button
                onClick={verifyPin}
                disabled={pinCode.length !== 5 || isVerifyingPin}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
              >
                {isVerifyingPin ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                    Vérification...
                  </>
                ) : (
                  <>
                    Vérifier
                    <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE PHOTO */}
        {currentStep === "photo" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FontAwesomeIcon icon={faCamera} className="mr-2 text-indigo-600" />
              Photo de vérification
              {!isStepRequired("photo") && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span>
              )}
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 flex items-center">
                <FontAwesomeIcon icon={faLightbulb} className="mr-2" />
                {isMobile || isTablet 
                  ? "Prenez une photo montrant l'agent en tenue de travail"
                  : "Sélectionnez une photo montrant l'agent en tenue de travail"}
              </p>
            </div>

            {!photo ? (
              <div className="text-center py-8 space-y-4">
                {/* Option caméra pour mobile/tablette */}
                {(isMobile || isTablet) && (
                  <button
                    onClick={capturePhoto}
                    className="px-8 py-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-lg flex items-center mx-auto shadow-lg"
                  >
                    <FontAwesomeIcon icon={faCamera} className="mr-3 text-2xl" />
                    Prendre une photo
                  </button>
                )}
                
                {/* ✅ Option upload pour ordinateur UNIQUEMENT */}
                {(!isMobile && !isTablet) && (
                  <button
                    onClick={triggerFileSelect}
                    className="px-8 py-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-lg flex items-center mx-auto shadow-lg"
                  >
                    <FontAwesomeIcon icon={faFolderOpen} className="mr-3 text-2xl" />
                    Sélectionner une photo
                  </button>
                )}
                
                <p className="text-sm text-gray-500 flex items-center justify-center">
                  <FontAwesomeIcon icon={faShield} className="mr-1 text-gray-400" />
                  {isStepRequired("photo") 
                    ? "La photo est obligatoire pour valider la visite"
                    : "La photo est optionnelle mais recommandée"}
                </p>

                {!isStepRequired("photo") && (
                  <button onClick={goToNextStep} className="w-full py-2 text-gray-500 underline text-sm">
                    Passer cette étape
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img src={photo} alt="Capture" className="w-full max-w-md mx-auto rounded-lg shadow-md" />
                  <button
                    onClick={() => {
                      setPhoto(null);
                      setPhotoAnalysis(null);
                      setPhotoSource(null);
                    }}
                    className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
                    title="Reprendre la photo"
                  >
                    <FontAwesomeIcon icon={faRotate} />
                  </button>
                </div>
                
                {/* ✅ Indicateur de source de la photo */}
                {photoSource === "gallery" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <p className="text-blue-800 text-xs flex items-center">
                      <FontAwesomeIcon icon={faFolderOpen} className="mr-1" />
                      Photo importée depuis la galerie
                    </p>
                  </div>
                )}

                {isAnalyzingPhoto ? (
                  <div className="text-center py-6 bg-blue-50 rounded-lg">
                    <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600 mb-3" />
                    <p className="text-gray-700 font-medium">Analyse de la photo en cours...</p>
                    <p className="text-sm text-gray-500 mt-1">Détection de l'agent, de l'uniforme, qualité d'image...</p>
                  </div>
                ) : photoAnalysis ? (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-blue-800 flex items-center">
                        <FontAwesomeIcon icon={faRobot} className="mr-2" />
                        Analyse IA - Contrôle
                      </p>
                      {photoAnalysis.meetsExpectations ? (
                        <span className="text-green-600 text-sm flex items-center">
                          <FontAwesomeIcon icon={faCircleCheck} className="mr-1" /> Conforme
                        </span>
                      ) : (
                        <span className="text-yellow-600 text-sm flex items-center">
                          <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1" /> Vérifier
                        </span>
                      )}
                    </div>

                    <ul className="space-y-2 mb-4">
                      {photoAnalysis.remarks.map((remark: string, i: number) => {
                        const isPositive = remark.startsWith("✅");
                        const isWarning = remark.startsWith("⚠️");
                        return (
                          <li key={i} className={`text-sm flex items-center ${isPositive ? "text-green-700" : isWarning ? "text-orange-700" : "text-blue-700"}`}>
                            <FontAwesomeIcon
                              icon={isPositive ? faCircleCheck : isWarning ? faTriangleExclamation : faCheck}
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
                    <button onClick={() => analyzePhoto(photo)} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 underline">
                      Réessayer l'analyse
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Vous pouvez continuer sans analyse, la visite sera enregistrée normalement.
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => {
                      setPhoto(null);
                      setPhotoAnalysis(null);
                      setPhotoSource(null);
                    }}
                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <FontAwesomeIcon icon={faCamera} className="mr-2" />
                    Reprendre la photo
                  </button>

                  <button onClick={goToNextStep} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center">
                    Continuer <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                  </button>
                </div>

                {!photoAnalysis && !isAnalyzingPhoto && (
                  <p className="text-xs text-gray-400 text-center">
                    ℹ️ L'analyse IA est optionnelle. Vous pouvez continuer sans analyse.
                  </p>
                )}
              </div>
            )}
            
            <div className="flex justify-start pt-2">
              <button onClick={goToPreviousStep} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Retour
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE PRESENCE */}
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
                <label className="block text-sm font-medium mb-2">Raison de l'absence</label>
                <select
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Sélectionnez une raison</option>
                  {absenceReasons.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={goToPreviousStep} className="px-4 py-2 bg-gray-100 rounded-lg">
                <FontAwesomeIcon icon={faArrowLeft} /> Retour
              </button>
              <button
                onClick={goToNextStep}
                disabled={!agentPresenceStatus || (agentPresenceStatus === "ABSENT" && !absenceReason)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE COMMENTAIRES */}
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
              <button onClick={goToPreviousStep} className="px-4 py-2 bg-gray-100 rounded-lg">
                <FontAwesomeIcon icon={faArrowLeft} /> Retour
              </button>
              <button onClick={goToNextStep} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE RÉSUMÉ */}
        {currentStep === "summary" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FontAwesomeIcon icon={faClipboardCheck} className="mr-2 text-green-600" />
              Résumé de la visite
            </h2>

            {geolocation && geolocation.distance > offSiteThreshold && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-orange-800 flex items-center text-sm">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="mr-2" />
                  Vous êtes à plus de {offSiteThreshold}m du site. La visite sera marquée comme "Hors site".
                </p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p><strong>Site :</strong> {roundSite?.site?.name}</p>
              <p className="flex items-center">
                <strong>GPS :</strong>{" "}
                {geolocation ? (
                  <span className="flex items-center ml-1">
                    {geolocation.distance?.toFixed(0)}m
                    {geolocation.distance > offSiteThreshold ? (
                      <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full flex items-center">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1 text-xs" />
                        Hors site (&gt;{offSiteThreshold}m)
                      </span>
                    ) : (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">✅ Dans la zone</span>
                    )}
                  </span>
                ) : (
                  <span className="ml-1 text-gray-500">Non disponible</span>
                )}
              </p>
              <p><strong>QR Code :</strong> {qrValidated ? <span className="text-green-600">✅ Validé</span> : <span className="text-red-600">❌ Non validé</span>}</p>
              <p>
                <strong>Photo :</strong>{" "}
                {photo ? (
                  <span className="flex items-center">
                    <span className="text-green-600">✅ Capturée</span>
                    {photoSource === "gallery" && (
                      <span className="ml-2 text-xs text-blue-600">(depuis galerie)</span>
                    )}
                    {photoAnalysis && (
                      <span className={`ml-2 text-xs ${photoAnalysis.meetsExpectations ? "text-green-600" : "text-yellow-600"}`}>
                        ({photoAnalysis.meetsExpectations ? "Analyse OK" : "À vérifier"})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-500">{isStepRequired("photo") ? "❌ Non capturée" : "⏭️ Non fournie (optionnel)"}</span>
                )}
              </p>
              <p><strong>Statut agent :</strong> {agentPresenceStatus === "PRESENT" ? <span className="text-green-600">✅ Présent</span> : <span className="text-red-600">❌ Absent</span>}</p>
              {agentPresenceStatus === "ABSENT" && <p><strong>Raison :</strong> {absenceReason}</p>}
              {comments && <p><strong>Commentaires :</strong> {comments}</p>}
              {photo && photoSource === "gallery" && !comments?.includes("Photo importée") && (
                <p className="text-xs text-blue-600 mt-1">
                  <FontAwesomeIcon icon={faFolderOpen} className="mr-1" />
                  Note : Photo importée depuis la galerie
                </p>
              )}
            </div>

            {error && <p className="text-red-600">{error}</p>}

            <div className="flex justify-between">
              <button onClick={goToPreviousStep} className="px-4 py-2 bg-gray-100 rounded-lg">
                <FontAwesomeIcon icon={faArrowLeft} /> Retour
              </button>
              <button onClick={handleSubmit} disabled={isLoading} className="px-8 py-3 bg-green-600 text-white rounded-lg">
                {isLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : "Valider la visite"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}