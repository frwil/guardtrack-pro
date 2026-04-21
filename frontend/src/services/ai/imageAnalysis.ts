import { settingsService } from "../api/settings";
import {
  tensorflowAnalyzer,
  TensorFlowAnalysisResult,
} from "./tensorflowAnalysis";
import {
  lightweightAnalyzer,
  LightweightAnalysisResult,
} from "./lightweightAnalysis";

export interface UnifiedAnalysisResult {
  personCount: number;
  hasUniform: boolean;
  uniformConfidence: number;
  objects: Array<{ class: string; confidence: number }>;
  faces?: number;
  quality: {
    brightness: number;
    blur: number;
    isAcceptable: boolean;
  };
  remarks: string[];
  suspicionScore: number;
  provider:
    | "tensorflow"
    | "lightweight"
    | "zai"
    | "openai"
    | "google"
    | "custom";
  processingTime: number;
}

export type AnalysisContext = 'agent_checkin' | 'controller_visit';

class ImageAnalysisService {
  private currentProvider: string = "lightweight";
  private settings: any = null;
  private currentContext: AnalysisContext = 'agent_checkin'; // ✅ Ajouté

  async initialize(): Promise<void> {
    try {
      this.settings = await settingsService.getSettings();
      this.currentProvider = this.settings?.ai?.provider || "lightweight";
    } catch (error) {
      console.warn(
        "Impossible de charger les paramètres, utilisation du mode local",
      );
      this.currentProvider = "lightweight";
    }
  }

  /**
   * ✅ Définir le contexte d'analyse
   */
  setContext(context: AnalysisContext): void {
    this.currentContext = context;
  }

  async analyzeImage(imageData: string): Promise<UnifiedAnalysisResult> {
    const startTime = performance.now();

    // S'assurer que les paramètres sont chargés
    if (!this.settings) {
      await this.initialize();
    }

    let result: UnifiedAnalysisResult;

    switch (this.currentProvider) {
      case "tensorflow":
        result = await this.analyzeWithTensorFlow(imageData);
        break;

      case "zai":
        result = await this.analyzeWithZAI(imageData);
        break;

      case "openai":
        result = await this.analyzeWithOpenAI(imageData);
        break;

      case "google":
        result = await this.analyzeWithGoogleVision(imageData);
        break;

      case "custom":
        result = await this.analyzeWithCustomAPI(imageData);
        break;

      case "lightweight":
      default:
        result = await this.analyzeWithLightweight(imageData);
        break;
    }

    result.processingTime = performance.now() - startTime;
    return result;
  }

  private async analyzeWithTensorFlow(
    imageData: string,
  ): Promise<UnifiedAnalysisResult> {
    try {
      const result = await tensorflowAnalyzer.analyzeImage(imageData);
      return {
        personCount: result.personCount,
        hasUniform: result.hasUniform,
        uniformConfidence: result.uniformConfidence,
        objects: result.objects,
        faces: result.faces,
        quality: result.quality,
        remarks: result.remarks,
        suspicionScore: result.suspicionScore,
        provider: "tensorflow",
        processingTime: 0,
      };
    } catch (error) {
      console.error("Erreur TensorFlow, fallback vers lightweight:", error);
      return this.analyzeWithLightweight(imageData);
    }
  }

  private async analyzeWithLightweight(
    imageData: string,
  ): Promise<UnifiedAnalysisResult> {
    const result = await lightweightAnalyzer.analyzeImage(imageData);

    return {
      personCount: result.personCount,
      hasUniform: result.hasUniform,
      uniformConfidence: result.uniformConfidence,
      objects: [],
      quality: {
        brightness: result.brightness,
        blur: result.blur,
        isAcceptable: result.isAcceptable,
      },
      remarks: result.remarks,
      suspicionScore: result.suspicionScore,
      provider: "lightweight",
      processingTime: 0,
    };
  }

  private async analyzeWithZAI(imageData: string): Promise<UnifiedAnalysisResult> {
    const provider = this.settings?.ai?.providers?.find((p: any) => p.id === 'zai');
    
    if (!provider?.enabled) {
      console.warn('Z.AI non activé, fallback vers lightweight');
      return this.analyzeWithLightweight(imageData);
    }

    try {
      // Appeler l'API Route Next.js
      const response = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          context: this.currentContext, // ✅ Utilise le contexte actuel
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Z.AI API error');
      }

      const result = await response.json();
      
      return {
        personCount: result.personCount || 1,
        hasUniform: result.hasUniform || false,
        uniformConfidence: result.uniformConfidence || 0.8,
        objects: result.objects || [],
        faces: result.faces || result.personCount,
        quality: {
          brightness: result.quality?.brightness ?? 0.5,
          blur: result.quality?.blur ?? 0.7,
          isAcceptable: result.quality?.isAcceptable !== false,
        },
        remarks: result.remarks || [],
        suspicionScore: result.suspicionScore || 30,
        provider: 'zai',
        processingTime: 0,
      };
    } catch (error) {
      console.error('Erreur Z.AI:', error);
      return this.analyzeWithLightweight(imageData);
    }
  }

  private async analyzeWithOpenAI(
    imageData: string,
  ): Promise<UnifiedAnalysisResult> {
    const provider = this.settings?.ai?.providers?.find(
      (p: any) => p.id === "openai",
    );

    if (!provider?.apiKey) {
      return this.analyzeWithLightweight(imageData);
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model || "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: this.currentContext === 'controller_visit'
                      ? "Analyze this security inspection photo. The photo should show 2 people (agent and controller). Check if the agent is wearing a security uniform. Return JSON with: personCount, hasUniform, confidence (0-1), remarks (array)."
                      : "Analyze this security agent check-in photo. The photo should show 1 person (the agent). Check if wearing security uniform. Return JSON with: personCount, hasUniform, confidence (0-1), remarks (array).",
                  },
                  {
                    type: "image_url",
                    image_url: { url: imageData },
                  },
                ],
              },
            ],
            max_tokens: 300,
            response_format: { type: "json_object" },
          }),
        },
      );

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const result = JSON.parse(content || "{}");

      return {
        personCount: result.personCount || 1,
        hasUniform: result.hasUniform || false,
        uniformConfidence: result.confidence || 0.8,
        objects: [],
        quality: { brightness: 0.5, blur: 0.7, isAcceptable: true },
        remarks: [...(result.remarks || []), "🤖 Analyse par OpenAI"],
        suspicionScore: this.calculateSuspicionScore(
          result.personCount,
          result.hasUniform,
          null,
        ),
        provider: "openai",
        processingTime: 0,
      };
    } catch (error) {
      console.error("Erreur OpenAI:", error);
      return this.analyzeWithLightweight(imageData);
    }
  }

  private async analyzeWithGoogleVision(
    imageData: string,
  ): Promise<UnifiedAnalysisResult> {
    const provider = this.settings?.ai?.providers?.find(
      (p: any) => p.id === "google",
    );

    if (!provider?.apiKey) {
      return this.analyzeWithLightweight(imageData);
    }

    try {
      const base64Image = imageData.split(",")[1];

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${provider.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: base64Image },
                features: [
                  { type: "OBJECT_LOCALIZATION", maxResults: 20 },
                  { type: "LABEL_DETECTION", maxResults: 20 },
                  { type: "FACE_DETECTION", maxResults: 10 },
                ],
              },
            ],
          }),
        },
      );

      const data = await response.json();
      const annotations = data.responses?.[0];

      const personCount =
        annotations?.faceAnnotations?.length ||
        annotations?.objectAnnotations?.filter((o: any) => o.name === "Person")
          .length ||
        0;

      const uniformLabels = [
        "Uniform",
        "Military uniform",
        "Police",
        "Security guard",
      ];
      const hasUniform =
        annotations?.labelAnnotations?.some((l: any) =>
          uniformLabels.includes(l.description),
        ) || false;

      const remarks: string[] = [];
      if (personCount === 0) remarks.push("⚠️ Aucune personne détectée");
      else if (personCount === 1) remarks.push("✅ Une personne détectée");
      else remarks.push(`⚠️ ${personCount} personnes détectées`);

      if (hasUniform) remarks.push("✅ Tenue de travail identifiée");
      remarks.push("🤖 Analyse par Google Vision");

      return {
        personCount,
        hasUniform,
        uniformConfidence: 0.85,
        objects:
          annotations?.objectAnnotations?.map((o: any) => ({
            class: o.name,
            confidence: o.score,
          })) || [],
        faces: annotations?.faceAnnotations?.length || 0,
        quality: { brightness: 0.5, blur: 0.7, isAcceptable: true },
        remarks,
        suspicionScore: this.calculateSuspicionScore(
          personCount,
          hasUniform,
          null,
        ),
        provider: "google",
        processingTime: 0,
      };
    } catch (error) {
      console.error("Erreur Google Vision:", error);
      return this.analyzeWithLightweight(imageData);
    }
  }

  private async analyzeWithCustomAPI(
    imageData: string,
  ): Promise<UnifiedAnalysisResult> {
    const provider = this.settings?.ai?.providers?.find(
      (p: any) => p.id === "custom",
    );

    if (!provider?.endpoint) {
      return this.analyzeWithLightweight(imageData);
    }

    try {
      const response = await fetch(provider.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(provider.apiKey && {
            Authorization: `Bearer ${provider.apiKey}`,
          }),
        },
        body: JSON.stringify({ 
          image: imageData,
          context: this.currentContext 
        }),
      });

      const data = await response.json();

      return {
        personCount: data.personCount || 1,
        hasUniform: data.hasUniform || false,
        uniformConfidence: data.confidence || 0.8,
        objects: data.objects || [],
        quality: data.quality || {
          brightness: 0.5,
          blur: 0.7,
          isAcceptable: true,
        },
        remarks: [...(data.remarks || []), "🤖 Analyse par API custom"],
        suspicionScore: this.calculateSuspicionScore(
          data.personCount,
          data.hasUniform,
          data.quality,
        ),
        provider: "custom",
        processingTime: 0,
      };
    } catch (error) {
      console.error("Erreur API custom:", error);
      return this.analyzeWithLightweight(imageData);
    }
  }

  private calculateSuspicionScore(
    personCount: number,
    hasUniform: boolean,
    quality: any,
  ): number {
    let score = 0;
    if (personCount === 0) score += 40;
    else if (personCount > 1) score += 20;
    if (!hasUniform) score += 30;
    if (quality && !quality.isAcceptable) score += 20;
    return Math.min(score, 100);
  }

  getCurrentProvider(): string {
    return this.currentProvider;
  }

  async setProvider(provider: string): Promise<void> {
    this.currentProvider = provider;
  }
}

export const imageAnalysisService = new ImageAnalysisService();