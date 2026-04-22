import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Capturer les en-têtes originaux
  const requestHeaders = new Headers(request.headers);

  // Clone la requête pour les rewrites
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Routes API internes Next.js (ex: /api/ai/*) : ne pas toucher aux headers
  // pour éviter de perdre content-length et vider le body
  if (request.nextUrl.pathname.startsWith('/api/ai/')) {
    return NextResponse.next();
  }

  // Copier tous les en-têtes sensibles pour les rewrites d'API vers le backend externe
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Copier les en-têtes personnalisés en préservant content-length
    const forwardHeaders = new Headers();
    requestHeaders.forEach((value, key) => {
      if (key.toLowerCase().startsWith('x-') ||
          ['authorization', 'content-type', 'accept', 'content-length'].includes(key.toLowerCase())) {
        forwardHeaders.set(key, value);
      }
    });

    // Retourner avec les en-têtes préservés
    return NextResponse.next({
      request: {
        headers: forwardHeaders,
      },
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Inclure les routes API
    '/api/:path*',
    // Exclure les fichiers statiques
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
