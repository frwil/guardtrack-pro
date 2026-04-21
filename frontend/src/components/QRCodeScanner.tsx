// src/components/QRCodeScanner.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faSpinner,
  faRotate,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";

// Import dynamique pour éviter les erreurs SSR
let jsQR: any = null;

interface QRCodeScannerProps {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
}

export function QRCodeScanner({ onScan, onError }: QRCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [isLoading, setIsLoading] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Charger jsQR dynamiquement
    import("jsqr").then((module) => {
      jsQR = module.default;
    });

    startCamera();

    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    setIsLoading(true);
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
      onError?.("Impossible d'accéder à la caméra");
    } finally {
      setIsLoading(false);
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
          // Vérifier si la torche est supportée
          const capabilities = videoTrack.getCapabilities();
          if ("torch" in capabilities) {
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

    if (!video || !canvas || !jsQR) {
      requestAnimationFrame(scanQRCode);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      requestAnimationFrame(scanQRCode);
      return;
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        onScan(code.data);
        stopCamera();
        return;
      }
    }

    requestAnimationFrame(scanQRCode);
  };

  if (!hasCamera) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <FontAwesomeIcon
          icon={faCamera}
          className="text-3xl text-yellow-600 mb-2"
        />
        <p className="text-yellow-800">Caméra non disponible</p>
        <p className="text-sm text-yellow-600 mt-1">
          Veuillez utiliser la saisie manuelle
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="relative bg-black rounded-lg overflow-hidden"
        style={{ minHeight: "300px" }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <FontAwesomeIcon
              icon={faSpinner}
              spin
              className="text-3xl text-white"
            />
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full"
          style={{ display: isLoading ? "none" : "block" }}
        />

        <canvas ref={canvasRef} className="hidden" />

        {/* Zone de scan */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 border-2 border-indigo-500 m-8 rounded-lg opacity-50" />
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-500 animate-pulse" />
        </div>
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
  );
}
