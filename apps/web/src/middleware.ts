import { NextRequest, NextResponse } from 'next/server';

/** Rutas que NO requieren autenticación */
const PUBLIC_PATHS = ['/login', '/confirm-appointment'];

/**
 * Rutas protegidas: el Profesional no puede acceder a ellas.
 * Solo Administrador y Asistente tienen acceso.
 */
const ADMIN_ASSISTANT_ONLY = ['/clients', '/follow-ups', '/users', '/roles', '/settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pasar rutas públicas sin verificar
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Leer token desde cookies (si se persiste ahí) o desde el store serializado en localStorage
  // Como Next.js middleware no tiene acceso a localStorage, usamos una cookie auxiliar
  // que se establece al login con el rol del usuario.
  const authCookie = request.cookies.get('agendamiento-role')?.value;

  // Si no hay cookie de autenticación, redirigir al login
  if (!authCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Restricciones del Profesional
  const isProfessional = authCookie === 'Profesional';
  if (isProfessional) {
    const isRestricted = ADMIN_ASSISTANT_ONLY.some((p) => pathname.startsWith(p));
    if (isRestricted) {
      return NextResponse.redirect(new URL('/appointments', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplicar middleware a todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     * - archivos con extensión
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
