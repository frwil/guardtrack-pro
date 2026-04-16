export interface LightweightAnalysisResult {
  personCount: number;
  hasUniform: boolean;
  uniformConfidence: number;
  brightness: number;
  blur: number;
  isAcceptable: boolean;
  remarks: string[];
  suspicionScore: number;
}

class LightweightImageAnalyzer {
  /**
   * Analyse une image sans dépendances externes (100% local)
   */
  async analyzeImage(imageData: string): Promise<LightweightAnalysisResult> {
    const img = await this.createImageFromData(imageData);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Redimensionner pour l'analyse (max 400px pour la performance)
    const maxDim = 400;
    const scale = Math.min(maxDim / img.width, maxDim / img.height);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Analyses parallèles
    const brightness = this.analyzeBrightness(imageDataObj);
    const blur = this.analyzeBlur(imageDataObj);
    const colorAnalysis = this.analyzeColors(imageDataObj);
    
    // Détection de personnes (estimation basée sur les couleurs chair)
    const personCount = this.estimatePersonCount(imageDataObj, colorAnalysis);
    
    // Détection d'uniforme (basée sur les couleurs dominantes)
    const uniformResult = this.detectUniformByColors(colorAnalysis);
    
    // Qualité acceptable
    const isAcceptable = brightness > 0.15 && brightness < 0.9 && blur > 0.25;
    
    // Générer les remarques
    const remarks = this.generateRemarks(personCount, uniformResult, { brightness, blur, isAcceptable });
    
    // Calculer le score de suspicion
    const suspicionScore = this.calculateSuspicionScore(personCount, uniformResult, { brightness, blur, isAcceptable });
    
    return {
      personCount,
      hasUniform: uniformResult.hasUniform,
      uniformConfidence: uniformResult.confidence,
      brightness,
      blur,
      isAcceptable,
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

  /**
   * Analyse la luminosité moyenne (0 = noir, 1 = blanc)
   */
  private analyzeBrightness(imageData: ImageData): number {
    const data = imageData.data;
    let totalBrightness = 0;
    const pixelCount = data.length / 4;
    
    // Échantillonner pour performance
    const step = Math.max(1, Math.floor(pixelCount / 1000));
    
    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Formule de luminosité perceptuelle
      totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
    }
    
    const sampledPixels = Math.floor(pixelCount / step);
    return totalBrightness / sampledPixels / 255;
  }

  /**
   * Détection du flou par variance des gradients
   * Retourne une valeur entre 0 (très flou) et 1 (très net)
   */
  private analyzeBlur(imageData: ImageData): number {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    let totalGradient = 0;
    let pixelCount = 0;
    
    // Échantillonner pour performance
    const step = Math.max(2, Math.floor(Math.min(width, height) / 50));
    
    for (let y = 1; y < height - 1; y += step) {
      for (let x = 1; x < width - 1; x += step) {
        const idx = (y * width + x) * 4;
        
        // Convertir en niveaux de gris
        const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
        const bottom = (data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]) / 3;
        
        // Calculer le gradient (différence avec les pixels voisins)
        totalGradient += Math.abs(center - right) + Math.abs(center - bottom);
        pixelCount++;
      }
    }
    
    const avgGradient = totalGradient / (pixelCount * 2);
    // Normaliser : un gradient > 20 est considéré comme net
    return Math.min(1, avgGradient / 25);
  }

  /**
   * Analyse des couleurs dominantes et ratios
   */
  private analyzeColors(imageData: ImageData): any {
    const data = imageData.data;
    let skinPixels = 0;
    let darkPixels = 0;
    let uniformPixels = 0;
    const totalPixels = data.length / 4;
    
    // Échantillonner pour performance
    const step = Math.max(1, Math.floor(totalPixels / 3000));
    
    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Détection de peau (espace RGB simplifié)
      if (this.isSkinColor(r, g, b)) {
        skinPixels++;
      }
      
      // Détection de couleurs sombres (uniforme)
      const brightness = (r + g + b) / 3;
      if (brightness < 100) {
        darkPixels++;
      }
      
      // Détection de couleurs d'uniforme (bleu marine, noir, gris foncé)
      if (this.isUniformColor(r, g, b)) {
        uniformPixels++;
      }
    }
    
    const sampledPixels = Math.floor(totalPixels / step);
    
    return {
      skinRatio: skinPixels / sampledPixels,
      darkRatio: darkPixels / sampledPixels,
      uniformRatio: uniformPixels / sampledPixels,
    };
  }

  /**
   * Détection de couleur de peau (plage RGB)
   */
  private isSkinColor(r: number, g: number, b: number): boolean {
    // Conditions pour les tons de peau (toutes carnations)
    return r > 60 && g > 30 && b > 20 &&
           r > g && r > b &&
           Math.abs(r - g) > 15 &&
           r < 250 && g < 230 && b < 210;
  }

  /**
   * Détection de couleurs d'uniforme (bleu marine, noir, gris foncé)
   */
  private isUniformColor(r: number, g: number, b: number): boolean {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    // Couleurs sombres avec faible saturation
    if (max > 120) return false;
    if (diff > 60) return false;
    
    // Détection du bleu marine (b > r et b > g)
    if (b > r && b > g && b - r > 10 && b - g > 10) return true;
    
    // Détection du noir/gris foncé
    if (max < 80 && diff < 30) return true;
    
    return false;
  }

  /**
   * Estimation du nombre de personnes (basée sur les pixels de peau)
   */
  private estimatePersonCount(imageData: ImageData, colorAnalysis: any): number {
    const { skinRatio } = colorAnalysis;
    
    // Estimation heuristique basée sur le ratio de pixels de peau
    // Une personne occupe environ 2-8% de l'image en pixels de peau (visage + mains)
    if (skinRatio < 0.005) return 0;
    if (skinRatio < 0.04) return 1;
    if (skinRatio < 0.10) return 1;
    if (skinRatio < 0.18) return 2;
    if (skinRatio < 0.28) return 3;
    return 4;
  }

  /**
   * Détection d'uniforme basée sur les couleurs
   */
  private detectUniformByColors(colorAnalysis: any): { hasUniform: boolean; confidence: number } {
    const { uniformRatio, darkRatio } = colorAnalysis;
    
    let confidence = 0;
    
    // Forte proportion de couleurs d'uniforme
    if (uniformRatio > 0.25) {
      confidence += 0.6;
    } else if (uniformRatio > 0.15) {
      confidence += 0.4;
    } else if (uniformRatio > 0.08) {
      confidence += 0.2;
    }
    
    // Présence de couleurs sombres
    if (darkRatio > 0.35) {
      confidence += 0.3;
    } else if (darkRatio > 0.20) {
      confidence += 0.15;
    }
    
    const hasUniform = confidence > 0.35;
    
    return {
      hasUniform,
      confidence: Math.min(1, hasUniform ? Math.max(0.6, confidence) : confidence),
    };
  }

  private generateRemarks(
    personCount: number,
    uniformResult: { hasUniform: boolean; confidence: number },
    quality: { brightness: number; blur: number; isAcceptable: boolean }
  ): string[] {
    const remarks: string[] = [];
    
    // Personnes détectées
    if (personCount === 0) {
      remarks.push('⚠️ Aucune personne détectée');
    } else if (personCount === 1) {
      remarks.push('✅ Une personne détectée');
    } else {
      remarks.push(`⚠️ Environ ${personCount} personnes détectées`);
    }
    
    // Uniforme
    if (uniformResult.hasUniform) {
      if (uniformResult.confidence > 0.7) {
        remarks.push(`✅ Tenue de travail identifiée (haute confiance)`);
      } else {
        remarks.push(`✅ Tenue sombre détectée (${Math.round(uniformResult.confidence * 100)}%)`);
      }
    } else {
      remarks.push('⚠️ Tenue de travail non détectée');
    }
    
    // Qualité d'image
    if (!quality.isAcceptable) {
      if (quality.brightness < 0.15) {
        remarks.push('🌑 Image trop sombre - Activez le flash');
      } else if (quality.brightness > 0.9) {
        remarks.push('☀️ Image trop lumineuse - Évitez le contre-jour');
      }
      if (quality.blur < 0.25) {
        remarks.push('📸 Image floue - Stabilisez l\'appareil');
      }
    } else {
      remarks.push('📸 Bonne qualité d\'image');
    }
    
    // Suggestion basée sur l'heure
    const hour = new Date().getHours();
    if (hour < 8) {
      remarks.push('🌅 Prise de poste matinale');
    } else if (hour > 18) {
      remarks.push('🌙 Service de nuit');
    }
    
    return remarks;
  }

  private calculateSuspicionScore(
    personCount: number,
    uniformResult: { hasUniform: boolean; confidence: number },
    quality: { brightness: number; blur: number; isAcceptable: boolean }
  ): number {
    let score = 0;
    
    // Score basé sur le nombre de personnes
    if (personCount === 0) {
      score += 45;  // Très suspect
    } else if (personCount > 2) {
      score += 25;  // Plusieurs personnes
    } else if (personCount === 2) {
      score += 15;  // Deux personnes
    }
    
    // Score basé sur l'uniforme
    if (!uniformResult.hasUniform) {
      score += 35;  // Pas d'uniforme détecté
    } else if (uniformResult.confidence < 0.5) {
      score += 15;  // Faible confiance
    }
    
    // Score basé sur la qualité d'image
    if (!quality.isAcceptable) {
      score += 15;
    }
    if (quality.blur < 0.25) {
      score += 10;  // Image floue
    }
    if (quality.brightness < 0.12 || quality.brightness > 0.92) {
      score += 10;  // Luminosité extrême
    }
    
    return Math.min(score, 100);
  }
}

export const lightweightAnalyzer = new LightweightImageAnalyzer();