import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
  const cookie = request.cookies.get('session')
 
  // If the user is trying to access the admin page without a session cookie,
  // redirect them to the login page.
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
    if (!cookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // If the user is on the login page but already has a session cookie,
  // redirect them to the admin dashboard.
  if(request.nextUrl.pathname.startsWith('/admin/login')) {
      if(cookie) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
  }
 
  return NextResponse.next()
}
