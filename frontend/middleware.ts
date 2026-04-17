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

  // Copier tous les en-têtes sensibles pour les rewrites d'API
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Préserver les en-têtes critiques pour les requêtes API
    const headers = new Headers();

    // En-têtes d'authentification
    if (request.headers.has('authorization')) {
      headers.set('authorization', request.headers.get('authorization')!);
    }

    // En-têtes de contenu
    if (request.headers.has('content-type')) {
      headers.set('content-type', request.headers.get('content-type')!);
    }

    // En-têtes Accept
    if (request.headers.has('accept')) {
      headers.set('accept', request.headers.get('accept')!);
    }

    // Copier les en-têtes personnalisés
    const forwardHeaders = new Headers();
    requestHeaders.forEach((value, key) => {
      if (key.toLowerCase().startsWith('x-') ||
          ['authorization', 'content-type', 'accept'].includes(key.toLowerCase())) {
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
