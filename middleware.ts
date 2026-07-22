import createMiddleware from 'next-intl/middleware';
import { routing } from './lib/routing';
 
export default createMiddleware(routing);
 
export const config = {
  // Match every path except API routes, Next internals, and static files
  // (anything with a dot). Unprefixed paths like /booking previously fell
  // outside the matcher and 404'd instead of redirecting to /he/booking.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};