'use client';

import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCamera,
  faRotate,
  faCheck,
  faTimes,
  faSpinner,
  faLightbulb,
  faCompress,
} from '@fortawesome/free-solid-svg-icons';
import { imageOptimizer, OptimizationResult } from '../services/image/optimizer';

interface CameraCaptureProps {
  onCapture: (photoData: string, optimized: OptimizationResult) => void;
  onCancel: () => void;
  multiple?: boolean;
  maxPhotos?: number;
  title?: string;
  description?: string;
}

export function CameraCapture({
  onCapture,
  onCancel,
  multiple = false,
  maxPhotos = 5,
  title = 'Prendre une photo',
  description = 'Prenez une photo claire et bien cadrée',
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [optimizedPhotos, setOptimizedPhotos] = useState<OptimizationResult[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setError(null);
    } catch (err) {
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      console.error('Erreur caméra:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    
    const rawPhoto = canvas.toDataURL('image/jpeg', 0.9);
    
    setIsOptimizing(true);
    try {
      // Optimiser la photo
      const optimized = await imageOptimizer.optimizeStandard(rawPhoto);
      
      setCapturedPhotos(prev => [...prev, rawPhoto]);
      setOptimizedPhotos(prev => [...prev, optimized]);
      
      if (!multiple) {
        // Mode photo unique : valider automatiquement
        onCapture(optimized.dataUrl, optimized);
        stopCamera();
      }
    } catch (err) {
      console.error('Erreur optimisation:', err);
      // Fallback : utiliser la photo brute
      setCapturedPhotos(prev => [...prev, rawPhoto]);
    } finally {
      setIsOptimizing(false);
    }
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
    setOptimizedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validateMultiple = () => {
    if (optimizedPhotos.length > 0) {
      const photos = optimizedPhotos.map(p => p.dataUrl);
      // Pour la compatibilité avec l'interface existante
      onCapture(photos[0], optimizedPhotos[0]);
      stopCamera();
    }
  };

  const getTotalCompression = (): number => {
    if (optimizedPhotos.length === 0) return 0;
    const totalOriginal = optimizedPhotos.reduce((sum, p) => sum + p.originalSize, 0);
    const totalOptimized = optimizedPhotos.reduce((sum, p) => sum + p.optimizedSize, 0);
    return ((totalOriginal - totalOptimized) / totalOriginal) * 100;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* En-tête */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <button onClick={onCancel} className="text-white">
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>
        <div className="text-center">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <div className="w-8"></div>
      </div>

      {/* Zone de capture */}
      <div className="flex-1 relative bg-black">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <p className="text-center">{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Indicateur d'optimisation */}
            {isOptimizing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-center">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-4xl mb-2" />
                  <p>Optimisation de l'image...</p>
                </div>
              </div>
            )}
            
            {/* Statistiques de compression */}
            {optimizedPhotos.length > 0 && (
              <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                <FontAwesomeIcon icon={faCompress} className="mr-1" />
                -{getTotalCompression().toFixed(0)}%
              </div>
            )}
          </>
        )}
        
        {/* Canvas caché pour la capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Miniatures des photos capturées (mode multiple) */}
      {multiple && capturedPhotos.length > 0 && (
        <div className="bg-gray-900 p-2">
          <div className="flex gap-2 overflow-x-auto">
            {capturedPhotos.map((photo, index) => (
              <div key={index} className="relative flex-shrink-0">
                <img src={photo} alt={`Capture ${index + 1}`} className="w-16 h-16 object-cover rounded" />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
                {optimizedPhotos[index] && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-[10px] text-center">
                    -{optimizedPhotos[index].compressionRatio.toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barre de contrôle */}
      <div className="bg-gray-900 text-white p-6">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={switchCamera}
            className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600"
            disabled={isOptimizing}
          >
            <FontAwesomeIcon icon={faRotate} />
          </button>
          
          <button
            onClick={capturePhoto}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"
            disabled={isOptimizing || (multiple && capturedPhotos.length >= maxPhotos)}
          >
            <FontAwesomeIcon icon={faCamera} className="text-gray-900 text-3xl" />
          </button>
          
          {multiple && capturedPhotos.length > 0 && (
            <button
              onClick={validateMultiple}
              className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-500"
              disabled={isOptimizing}
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
          )}
        </div>
        
        {multiple && (
          <p className="text-center text-sm text-gray-400 mt-3">
            {capturedPhotos.length}/{maxPhotos} photo{capturedPhotos.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Astuce */}
      <div className="bg-gray-800 text-gray-400 p-3 text-center text-sm">
        <FontAwesomeIcon icon={faLightbulb} className="mr-1 text-yellow-500" />
        Les photos sont automatiquement optimisées pour économiser de l'espace
      </div>
    </div>
  );
}