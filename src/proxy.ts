import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'

// Middleware que protege rutas y redirige a login si no está autenticado
export async function proxy(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Rutas públicas
  const pathname = request.nextUrl.pathname
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/tracker')

  // Si es ruta pública, permitir
  if (isPublicRoute) {
    return NextResponse.next({ request })
  }

  // Si no hay usuario y NO es ruta pública, redirigir a login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
