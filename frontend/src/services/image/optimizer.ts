export interface OptimizationOptions {
  maxWidth?: number;      // Largeur maximale (défaut: 1200)
  maxHeight?: number;     // Hauteur maximale (défaut: 1200)
  quality?: number;       // Qualité JPEG (0-1, défaut: 0.8)
  format?: 'jpeg' | 'webp'; // Format de sortie (défaut: jpeg)
}

export interface OptimizationResult {
  originalSize: number;   // Taille originale en Ko
  optimizedSize: number;  // Taille optimisée en Ko
  compressionRatio: number; // Ratio de compression (%)
  dataUrl: string;        // Image optimisée en base64
  width: number;          // Largeur finale
  height: number;         // Hauteur finale
}

class ImageOptimizer {
  private defaultOptions: OptimizationOptions = {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.75,
    format: 'jpeg',
  };

  /**
   * Optimise une image à partir d'un fichier ou d'une dataURL
   */
  async optimize(
    source: File | string,
    options: Partial<OptimizationOptions> = {}
  ): Promise<OptimizationResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Charger l'image
    const img = await this.loadImage(source);
    
    // Calculer les dimensions optimisées
    const dimensions = this.calculateDimensions(
      img.width,
      img.height,
      opts.maxWidth!,
      opts.maxHeight!
    );
    
    // Créer le canvas et dessiner l'image
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
    
    // Convertir en dataURL optimisé
    const mimeType = opts.format === 'webp' ? 'image/webp' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mimeType, opts.quality);
    
    // Calculer les tailles
    const originalSize = await this.getSourceSize(source);
    const optimizedSize = this.getBase64Size(dataUrl);
    
    return {
      originalSize,
      optimizedSize,
      compressionRatio: ((originalSize - optimizedSize) / originalSize) * 100,
      dataUrl,
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  /**
   * Optimise une image pour les miniatures (très petite taille)
   */
  async optimizeThumbnail(source: File | string): Promise<string> {
    const result = await this.optimize(source, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.6,
      format: 'jpeg',
    });
    return result.dataUrl;
  }

  /**
   * Optimise une image pour l'affichage standard
   */
  async optimizeStandard(source: File | string): Promise<OptimizationResult> {
    return this.optimize(source, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.75,
      format: 'jpeg',
    });
  }

  /**
   * Optimise une image pour l'archivage (qualité réduite)
   */
  async optimizeArchive(source: File | string): Promise<OptimizationResult> {
    return this.optimize(source, {
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.5,
      format: 'jpeg',
    });
  }

  private loadImage(source: File | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      
      if (typeof source === 'string') {
        img.src = source;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target?.result as string; };
        reader.onerror = reject;
        reader.readAsDataURL(source);
      }
    });
  }

  private calculateDimensions(
    srcWidth: number,
    srcHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let width = srcWidth;
    let height = srcHeight;
    
    // Redimensionner si nécessaire
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
    
    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }
    
    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  private async getSourceSize(source: File | string): Promise<number> {
    if (typeof source === 'string') {
      // Pour une dataURL, calculer la taille approximative
      return this.getBase64Size(source);
    } else {
      // Pour un File
      return source.size / 1024; // Convertir en Ko
    }
  }

  private getBase64Size(dataUrl: string): number {
    // Enlever l'en-tête data:image/...;base64,
    const base64 = dataUrl.split(',')[1];
    // Taille en Ko (base64 fait ~4/3 de la taille binaire)
    return (base64.length * 0.75) / 1024;
  }

  /**
   * Convertit une dataURL en Blob pour l'upload
   */
  dataURLToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const mime = parts[0].split(':')[1].split(';')[0];
    const binary = atob(parts[1]);
    
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    
    return new Blob([array], { type: mime });
  }

  /**
   * Valide si une image est trop grande (> 5 Mo)
   */
  isTooLarge(source: File | string): boolean {
    if (typeof source === 'string') {
      return this.getBase64Size(source) > 5120; // 5 Mo
    }
    return source.size > 5 * 1024 * 1024;
  }
}

export const imageOptimizer = new ImageOptimizer();