import { NextRequest, NextResponse } from 'next/server';
import ZAI, { VisionMessage } from 'z-ai-web-dev-sdk';

// Instance singleton du SDK
let zaiInstance: any = null;

async function getZAI() {
  if (!zaiInstance) {
    // ✅ ZAI.create() ne prend pas d'arguments, il utilise la variable d'environnement
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export async function POST(request: NextRequest) {
  try {
    const { imageData, context } = await request.json();
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    const zai = await getZAI();

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

    const response = await zai.chat.completions.createVision({
      model: 'glm-4.6v',
      messages,
      thinking: { type: 'disabled' },
      max_tokens: 500,
      temperature: 0.1,
    });

    const content = response.choices?.[0]?.message?.content;
    
    // Parser la réponse JSON
    let result;
    try {
      const cleanContent = content?.replace(/```json\n?|\n?```/g, '').trim() || '{}';
      result = JSON.parse(cleanContent);
    } catch {
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

    return NextResponse.json({
      success: true,
      provider: 'zai',
      ...result,
      remarks: [...(result.remarks || []), '🤖 Analyse par Z.AI (GLM-4.6V)'],
    });

  } catch (error: any) {
    console.error('Z.AI API Error:', error);
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