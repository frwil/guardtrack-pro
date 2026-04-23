import { NextRequest, NextResponse } from 'next/server';

const ZAI_BASE_URL = 'https://api.z.ai/api/paas/v4';

export async function POST(request: NextRequest) {
  console.log('📡 [Z.AI] ========== NOUVELLE REQUÊTE ==========');
  
  try {
    // ✅ LIRE LE CORPS BRUT AVANT DE PARSER
    let rawBody: string;
    try {
      rawBody = await request.text();
      console.log('📡 [Z.AI] Corps brut reçu, longueur:', rawBody.length);
    } catch (textError: any) {
      console.error('❌ [Z.AI] Erreur lecture corps:', textError.message);
      return NextResponse.json(
        { error: 'Failed to read request body', fallback: true },
        { status: 400 }
      );
    }
    
    if (!rawBody || rawBody.length === 0) {
      console.error('❌ [Z.AI] Corps de requête vide');
      return NextResponse.json(
        { error: 'Empty request body', fallback: true },
        { status: 400 }
      );
    }
    
    // ✅ PARSER LE JSON
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError: any) {
      console.error('❌ [Z.AI] Erreur parsing JSON:', parseError.message);
      console.error('❌ [Z.AI] Raw body (premiers 100 chars):', rawBody.substring(0, 100));
      console.error('❌ [Z.AI] Raw body (derniers 100 chars):', rawBody.substring(Math.max(0, rawBody.length - 100)));
      return NextResponse.json(
        { error: 'Invalid JSON in request body', fallback: true },
        { status: 400 }
      );
    }
    
    const { imageData, context } = body;
    
    console.log('📡 [Z.AI] Contexte:', context);
    console.log('📡 [Z.AI] Image data reçue:', imageData ? `${Math.round(imageData.length / 1024)} KB` : 'NULL');
    
    if (!imageData) {
      console.error('❌ [Z.AI] Pas d\'image fournie');
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ZAI_API_KEY;
    if (!apiKey) {
      throw new Error('ZAI_API_KEY is not defined in environment variables');
    }

    const prompt = context === 'controller_visit'
      ? `Analyze this security inspection photo. The photo should show the security agent and the controller (2 people). Check if the agent is wearing proper security uniform (dark blue/black, badge, tactical vest). Return ONLY a JSON object with: personCount (number), hasUniform (boolean), uniformConfidence (number 0-1), objects (array of strings), faces (number), quality ({ brightness: number, blur: number, isAcceptable: boolean }), remarks (array of strings), suspicionScore (number 0-100).`
      : `Analyze this security agent check-in photo. The photo should show the agent alone (1 person). Check if the agent is wearing proper security uniform. Return ONLY a JSON object with: personCount (number), hasUniform (boolean), uniformConfidence (number 0-1), objects (array of strings), faces (number), quality ({ brightness: number, blur: number, isAcceptable: boolean }), remarks (array of strings), suspicionScore (number 0-100).`;

    console.log('📡 [Z.AI] Envoi de la requête à Z.AI...');
    const startTime = performance.now();

    const response = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4.6v-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Z.AI API error ${response.status}: ${errText.substring(0, 200)}`);
    }

    const duration = Math.round(performance.now() - startTime);
    console.log(`✅ [Z.AI] Réponse reçue en ${duration}ms`);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
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

export const maxDuration = 30;
export const dynamic = 'force-dynamic';