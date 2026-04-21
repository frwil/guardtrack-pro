// src/services/ai/imageAnalysisEnhanced.ts

import { imageAnalysisService, UnifiedAnalysisResult } from './imageAnalysis';

export type AnalysisContext = 'agent_checkin' | 'controller_visit';

export interface EnhancedAnalysisOptions {
  context: AnalysisContext;
  expectedPersonCount?: number;      // 1 pour agent, 2 pour contrôleur
  checkUniform?: boolean;            // true par défaut
  strictMode?: boolean;              // Mode strict = plus de suspicion
}

export interface EnhancedAnalysisResult extends UnifiedAnalysisResult {
  context: AnalysisContext;
  meetsExpectations: boolean;        // Répond aux critères attendus ?
  expectationDetails: string[];      // Détails des écarts
}

class ImageAnalysisEnhancedService {
  
  /**
   * Initialise le service (délègue au service de base)
   */
  async initialize(): Promise<void> {
    await imageAnalysisService.initialize();
  }
  
  /**
   * Analyse une image avec contexte
   */
  async analyzeImage(
    imageData: string,
    options: EnhancedAnalysisOptions
  ): Promise<EnhancedAnalysisResult> {
    // Analyse de base via le service existant
    const baseResult = await imageAnalysisService.analyzeImage(imageData);
    
    // Déterminer les attentes selon le contexte
    const expectedPersonCount = options.expectedPersonCount ?? this.getDefaultExpectedCount(options.context);
    
    // Enrichir avec le contexte
    const contextRemarks = this.generateContextualRemarks(baseResult, options.context, expectedPersonCount);
    const allRemarks = [...baseResult.remarks, ...contextRemarks];
    
    // Vérifier si les attentes sont satisfaites
    const { meetsExpectations, expectationDetails } = this.checkExpectations(
      baseResult,
      options.context,
      expectedPersonCount,
      options.checkUniform ?? true
    );
    
    // Recalculer le score de suspicion avec le contexte
    const suspicionScore = this.calculateContextualSuspicionScore(
      baseResult,
      options.context,
      expectedPersonCount
    );
    
    return {
      ...baseResult,
      remarks: allRemarks,
      suspicionScore,
      context: options.context,
      meetsExpectations,
      expectationDetails,
    };
  }
  
  private getDefaultExpectedCount(context: AnalysisContext): number {
    switch (context) {
      case 'agent_checkin': return 1;
      case 'controller_visit': return 2;
      default: return 1;
    }
  }
  
  private generateContextualRemarks(
    result: UnifiedAnalysisResult,
    context: AnalysisContext,
    expectedCount: number
  ): string[] {
    const remarks: string[] = [];
    const { personCount, hasUniform, quality } = result;
    
    switch (context) {
      case 'agent_checkin':
        if (personCount === 0) {
          remarks.push('⚠️ [AGENT] Agent non visible sur la photo');
        } else if (personCount === 1) {
          remarks.push('✅ [AGENT] Agent identifié');
        } else {
          remarks.push(`⚠️ [AGENT] ${personCount} personnes détectées - seul l'agent devrait être présent`);
        }
        break;
        
      case 'controller_visit':
        if (personCount < 2) {
          remarks.push('⚠️ [CONTRÔLE] Agent et contrôleur doivent être visibles tous les deux');
        } else if (personCount === 2) {
          remarks.push('✅ [CONTRÔLE] Agent et contrôleur identifiés');
        } else {
          remarks.push(`⚠️ [CONTRÔLE] ${personCount} personnes détectées - situation inhabituelle`);
        }
        
        // Vérification spécifique de la tenue de l'agent
        if (!hasUniform) {
          remarks.push('⚠️ [CONTRÔLE] Tenue de l\'agent non conforme ou non détectée');
        } else {
          remarks.push('✅ [CONTRÔLE] Agent en tenue réglementaire');
        }
        break;
    }
    
    // Vérification qualité spécifique au contexte
    if (!quality.isAcceptable) {
      if (context === 'controller_visit') {
        remarks.push('📸 [CONTRÔLE] Qualité photo insuffisante - peut affecter la validation');
      }
    }
    
    return remarks;
  }
  
  private checkExpectations(
    result: UnifiedAnalysisResult,
    context: AnalysisContext,
    expectedCount: number,
    checkUniform: boolean
  ): { meetsExpectations: boolean; expectationDetails: string[] } {
    const details: string[] = [];
    let meets = true;
    
    // Vérification du nombre de personnes
    if (result.personCount < expectedCount) {
      meets = false;
      details.push(`Nombre de personnes insuffisant (${result.personCount}/${expectedCount})`);
    } else if (result.personCount > expectedCount && context === 'agent_checkin') {
      // Pour l'agent, plus d'une personne est suspect
      meets = false;
      details.push(`Trop de personnes détectées (${result.personCount}/${expectedCount})`);
    }
    
    // Vérification de l'uniforme
    if (checkUniform && !result.hasUniform) {
      meets = false;
      details.push('Tenue réglementaire non détectée');
    }
    
    // Vérification de la qualité (informative seulement, non bloquante)
    if (!result.quality.isAcceptable) {
      details.push('Qualité photo insuffisante (informatif)');
    }
    
    return { meetsExpectations: meets, expectationDetails: details };
  }
  
  private calculateContextualSuspicionScore(
    result: UnifiedAnalysisResult,
    context: AnalysisContext,
    expectedCount: number
  ): number {
    let score = result.suspicionScore;
    
    // Ajustements contextuels
    switch (context) {
      case 'agent_checkin':
        if (result.personCount > 1) score += 20;
        if (result.personCount === 0) score += 30;
        break;
        
      case 'controller_visit':
        if (result.personCount < 2) score += 15;
        if (result.personCount > 2) score += 10;
        if (!result.hasUniform) score += 20; // Plus critique pour le contrôleur
        break;
    }
    
    return Math.min(score, 100);
  }
  
  /**
   * Retourne le provider actuel (délègue au service de base)
   */
  getCurrentProvider(): string {
    return imageAnalysisService.getCurrentProvider();
  }
  
  /**
   * Change le provider (délègue au service de base)
   */
  async setProvider(provider: string): Promise<void> {
    await imageAnalysisService.setProvider(provider);
  }
}

export const imageAnalysisEnhancedService = new ImageAnalysisEnhancedService();