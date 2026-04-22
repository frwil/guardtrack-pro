import { NextRequest, NextResponse } from 'next/server';
import ZAI, { VisionMessage } from 'z-ai-web-dev-sdk';

// Instance singleton du SDK
let zaiInstance: any = null;

async function getZAI() {
  if (!zaiInstance) {
    console.log('🔵 [Z.AI] Création de l\'instance SDK...');
    console.log('🔵 [Z.AI] ZAI_API_KEY existe ?', !!process.env.ZAI_API_KEY);
    console.log('🔵 [Z.AI] ZAI_API_KEY longueur:', process.env.ZAI_API_KEY?.length || 0);
    
    if (!process.env.ZAI_API_KEY) {
      throw new Error('ZAI_API_KEY is not defined in environment variables');
    }
    
    try {
      // ✅ ZAI.create() ne prend pas d'arguments, il utilise la variable d'environnement
      zaiInstance = await ZAI.create();
      console.log('✅ [Z.AI] Instance SDK créée avec succès');
    } catch (error: any) {
      console.error('❌ [Z.AI] Erreur création instance SDK:', error.message);
      throw error;
    }
  }
  return zaiInstance;
}

export async function POST(request: NextRequest) {
  console.log('📡 [Z.AI] ========== NOUVELLE REQUÊTE ==========');
  
  try {
    const { imageData, context } = await request.json();
    
    console.log('📡 [Z.AI] Contexte:', context);
    console.log('📡 [Z.AI] Image data reçue:', imageData ? `${Math.round(imageData.length / 1024)} KB` : 'NULL');
    
    if (!imageData) {
      console.error('❌ [Z.AI] Pas d\'image fournie');
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    console.log('📡 [Z.AI] Obtention de l\'instance SDK...');
    const zai = await getZAI();
    console.log('✅ [Z.AI] Instance SDK obtenue');

    // Préparer le message pour l'analyse
    const messages: VisionMessage[] = [
      {
        role: 'assistant',
        content: [
          { 
            type: 'text', 
            text: 'Output only valid JSON, no markdown, no extra text.' 
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: context === 'controller_visit' 
              ? `Analyze this security inspection photo. The photo should show the security agent and the controller (2 people). 
                 Check if the agent is wearing proper security uniform (dark blue/black, badge, tactical vest).
                 Return a JSON with:
                 - personCount: number of people detected (expecting 2)
                 - hasUniform: boolean (true if agent has security uniform)
                 - uniformConfidence: number 0-1
                 - objects: array of detected objects
                 - faces: number of faces detected
                 - quality: { brightness: 0-1, blur: 0-1, isAcceptable: boolean }
                 - remarks: array of observations
                 - suspicionScore: number 0-100`
              : `Analyze this security agent check-in photo. The photo should show the agent alone (1 person).
                 Check if the agent is wearing proper security uniform.
                 Return a JSON with:
                 - personCount: number of people detected (expecting 1)
                 - hasUniform: boolean
                 - uniformConfidence: number 0-1
                 - objects: array of detected objects
                 - faces: number of faces detected
                 - quality: { brightness: 0-1, blur: 0-1, isAcceptable: boolean }
                 - remarks: array of observations
                 - suspicionScore: number 0-100`
          },
          {
            type: 'image_url',
            image_url: { url: imageData }
          }
        ]
      }
    ];

    console.log('📡 [Z.AI] Envoi de la requête à Z.AI...');
    const startTime = performance.now();

    const response = await zai.chat.completions.createVision({
      model: 'glm-4.6v',
      messages,
      thinking: { type: 'disabled' },
      max_tokens: 500,
      temperature: 0.1,
    });

    const duration = Math.round(performance.now() - startTime);
    console.log(`✅ [Z.AI] Réponse reçue en ${duration}ms`);

    const content = response.choices?.[0]?.message?.content;
    console.log('📡 [Z.AI] Contenu brut:', content?.substring(0, 200) + '...');
    
    // Parser la réponse JSON
    let result;
    try {
      const cleanContent = content?.replace(/```json\n?|\n?```/g, '').trim() || '{}';
      result = JSON.parse(cleanContent);
      console.log('✅ [Z.AI] JSON parsé avec succès:', result);
    } catch (parseError) {
      console.warn('⚠️ [Z.AI] Erreur parsing JSON, utilisation du fallback');
      result = {
        personCount: context === 'controller_visit' ? 2 : 1,
        hasUniform: content?.toLowerCase().includes('uniform') || false,
        uniformConfidence: 0.7,
        objects: [],
        faces: context === 'controller_visit' ? 2 : 1,
        quality: { brightness: 0.5, blur: 0.7, isAcceptable: true },
        remarks: ['Analyse Z.AI - Format non standard'],
        suspicionScore: 30
      };
    }

    console.log('✅ [Z.AI] Analyse terminée avec succès');
    console.log('📡 [Z.AI] ========== FIN REQUÊTE ==========');

    return NextResponse.json({
      success: true,
      provider: 'zai',
      ...result,
      remarks: [...(result.remarks || []), '🤖 Analyse par Z.AI (GLM-4.6V)'],
    });

  } catch (error: any) {
    console.error('❌ [Z.AI] ========== ERREUR ==========');
    console.error('❌ [Z.AI] Message:', error.message);
    console.error('❌ [Z.AI] Stack:', error.stack);
    
    // Vérifier si c'est une erreur d'authentification
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      console.error('❌ [Z.AI] Erreur d\'authentification - Vérifier ZAI_API_KEY');
    }
    
    console.error('❌ [Z.AI] ========== FIN ERREUR ==========');
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        fallback: true 
      },
      { status: 500 }
    );
  }
}

// ✅ Route de test pour vérifier la configuration
export async function GET() {
  console.log('📡 [Z.AI] Test de configuration...');
  
  return NextResponse.json({
    hasKey: !!process.env.ZAI_API_KEY,
    keyLength: process.env.ZAI_API_KEY?.length || 0,
    keyPrefix: process.env.ZAI_API_KEY ? process.env.ZAI_API_KEY.substring(0, 10) + '...' : 'none',
    nodeEnv: process.env.NODE_ENV,
  });
}