import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (!user && (path.startsWith('/admin') || path.startsWith('/artist'))) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user && path.startsWith('/auth')) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    const dest = profile?.role === 'admin' ? '/admin' : '/artist/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  if (user && (path.startsWith('/admin') || path.startsWith('/artist'))) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (path.startsWith('/admin') && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/artist/dashboard', request.url))
    }
    if (path.startsWith('/artist') && profile?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/artist/:path*', '/auth/:path*'],
}
