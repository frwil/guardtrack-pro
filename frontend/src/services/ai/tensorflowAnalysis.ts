import type { ObjectDetection } from '@tensorflow-models/coco-ssd';
import type { MobileNet } from '@tensorflow-models/mobilenet';

export interface TensorFlowAnalysisResult {
  personCount: number;
  hasUniform: boolean;
  uniformConfidence: number;
  objects: Array<{ class: string; confidence: number }>;
  faces: number;
  quality: {
    brightness: number;
    blur: number;
    isAcceptable: boolean;
  };
  remarks: string[];
  suspicionScore: number;
}

class TensorFlowAnalyzer {
  private cocoModel: ObjectDetection | null = null;
  private mobileModel: MobileNet | null = null;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * Charge les modèles de manière différée (lazy loading)
   */
  async loadModels(): Promise<void> {
    // Si déjà chargé, retourner
    if (this.cocoModel && this.mobileModel) return;
    
    // Si en cours de chargement, attendre
    if (this.loadPromise) return this.loadPromise;
    
    this.loadPromise = this.doLoadModels();
    return this.loadPromise;
  }

  private async doLoadModels(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Importer dynamiquement pour réduire le bundle initial
      const [cocoSsd, mobilenet, tf] = await Promise.all([
        import('@tensorflow-models/coco-ssd'),
        import('@tensorflow-models/mobilenet'),
        import('@tensorflow/tfjs'),
      ]);
      
      // Configuration pour utiliser WebGL si disponible, sinon CPU
      await tf.ready();
      console.log('TensorFlow backend:', tf.getBackend());
      
      // Charger les modèles en parallèle
      [this.cocoModel, this.mobileModel] = await Promise.all([
        cocoSsd.load({ base: 'mobilenet_v2' }),
        mobilenet.load({ version: 2, alpha: 1.0 }),
      ]);
      
      console.log('✅ Modèles TensorFlow chargés');
    } catch (error) {
      console.error('Erreur chargement modèles:', error);
      throw error;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Analyse une image avec TensorFlow
   */
  async analyzeImage(imageData: string): Promise<TensorFlowAnalysisResult> {
    // Charger les modèles si nécessaire
    await this.loadModels();
    
    if (!this.cocoModel || !this.mobileModel) {
      throw new Error('Modèles non disponibles');
    }
    
    // Créer l'image
    const img = await this.createImageFromData(imageData);
    
    // Analyses parallèles
    const [objects, classifications, quality] = await Promise.all([
      this.cocoModel.detect(img),
      this.mobileModel.classify(img),
      this.analyzeImageQuality(img),
    ]);
    
    // Compter les personnes
    const personDetections = objects.filter(obj => obj.class === 'person');
    const personCount = personDetections.length;
    
    // Détecter l'uniforme via les classifications
    const uniformResult = this.detectUniform(classifications);
    
    // Détecter les visages (via COCO)
    const faceCount = objects.filter(obj => 
      obj.class === 'person' && obj.score > 0.7
    ).length;
    
    // Générer les remarques
    const remarks = this.generateRemarks(personCount, uniformResult, quality, faceCount);
    
    // Calculer le score de suspicion
    const suspicionScore = this.calculateSuspicionScore(personCount, uniformResult, quality);
    
    return {
      personCount,
      hasUniform: uniformResult.hasUniform,
      uniformConfidence: uniformResult.confidence,
      objects: objects.map(obj => ({
        class: obj.class,
        confidence: obj.score,
      })),
      faces: faceCount,
      quality,
      remarks,
      suspicionScore,
    };
  }

  private createImageFromData(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  private detectUniform(classifications: Array<{ className: string; probability: number }>): { hasUniform: boolean; confidence: number } {
    const uniformKeywords = [
      'uniform', 'suit', 'jacket', 'vest', 'security', 'police',
      'military', 'guard', 'workwear', 'shirt', 'tie', 'blazer',
      'coat', 'attire', 'clothing', 'apparel', 'outfit',
    ];
    
    let maxConfidence = 0;
    let hasUniform = false;
    
    for (const pred of classifications) {
      const className = pred.className.toLowerCase();
      for (const keyword of uniformKeywords) {
        if (className.includes(keyword) && pred.probability > 0.25) {
          hasUniform = true;
          maxConfidence = Math.max(maxConfidence, pred.probability);
        }
      }
    }
    
    return { hasUniform, confidence: maxConfidence };
  }

  private analyzeImageQuality(img: HTMLImageElement): { brightness: number; blur: number; isAcceptable: boolean } {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Redimensionner pour l'analyse (performance)
    const maxDim = 200;
    const scale = Math.min(maxDim / img.width, maxDim / img.height);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Luminosité
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const brightness = totalBrightness / (data.length / 4) / 255;
    
    // Détection de flou (simplifiée)
    let blurScore = 0;
    const step = 4;
    for (let y = 1; y < canvas.height - 1; y += step) {
      for (let x = 1; x < canvas.width - 1; x += step) {
        const idx = (y * canvas.width + x) * 4;
        const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
        const bottom = (data[idx + canvas.width * 4] + data[idx + canvas.width * 4 + 1] + data[idx + canvas.width * 4 + 2]) / 3;
        
        blurScore += Math.abs(center - right) + Math.abs(center - bottom);
      }
    }
    const pixelCount = ((canvas.width - 2) / step) * ((canvas.height - 2) / step);
    const avgGradient = blurScore / (pixelCount * 2);
    const blur = Math.min(1, avgGradient / 30);
    
    const isAcceptable = brightness > 0.1 && brightness < 0.9 && blur > 0.25;
    
    return { brightness, blur, isAcceptable };
  }

  private generateRemarks(
    personCount: number,
    uniformResult: { hasUniform: boolean; confidence: number },
    quality: { brightness: number; blur: number; isAcceptable: boolean },
    faceCount: number
  ): string[] {
    const remarks: string[] = [];
    
    if (personCount === 0) {
      remarks.push('⚠️ Aucune personne détectée');
    } else if (personCount === 1) {
      remarks.push('✅ Une personne détectée');
    } else {
      remarks.push(`⚠️ ${personCount} personnes détectées - Vérifier qui est présent`);
    }
    
    if (uniformResult.hasUniform) {
      remarks.push(`✅ Tenue de travail identifiée (${Math.round(uniformResult.confidence * 100)}%)`);
    } else {
      remarks.push('⚠️ Tenue de travail non détectée');
    }
    
    if (faceCount === 0 && personCount > 0) {
      remarks.push('⚠️ Visage non visible');
    } else if (faceCount > 0) {
      remarks.push(`👤 Visage(s) détecté(s)`);
    }
    
    if (!quality.isAcceptable) {
      if (quality.brightness < 0.1) remarks.push('🌑 Image trop sombre');
      else if (quality.brightness > 0.9) remarks.push('☀️ Image trop lumineuse');
      if (quality.blur < 0.25) remarks.push('📸 Image floue - Reprenez la photo');
    } else {
      remarks.push('📸 Bonne qualité d\'image');
    }
    
    return remarks;
  }

  private calculateSuspicionScore(
    personCount: number,
    uniformResult: { hasUniform: boolean; confidence: number },
    quality: { brightness: number; blur: number; isAcceptable: boolean }
  ): number {
    let score = 0;
    
    if (personCount === 0) score += 40;
    else if (personCount > 2) score += 25;
    else if (personCount === 2) score += 15;
    
    if (!uniformResult.hasUniform) score += 30;
    else if (uniformResult.confidence < 0.5) score += 15;
    
    if (!quality.isAcceptable) score += 20;
    if (quality.blur < 0.25) score += 10;
    if (quality.brightness < 0.1 || quality.brightness > 0.9) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Vérifie si les modèles sont chargés
   */
  isModelLoaded(): boolean {
    return this.cocoModel !== null && this.mobileModel !== null;
  }

  /**
   * Libère la mémoire
   */
  async dispose(): Promise<void> {
    const tf = await import('@tensorflow/tfjs');
    tf.disposeVariables();
    this.cocoModel = null;
    this.mobileModel = null;
    this.loadPromise = null;
  }
}

export const tensorflowAnalyzer = new TensorFlowAnalyzer();