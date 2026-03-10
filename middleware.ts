import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Run locale middleware — handles locale detection and redirects
  const intlResponse = intlMiddleware(request);

  // If next-intl is redirecting (locale normalization), return immediately
  if (
    intlResponse.headers.get("x-middleware-rewrite") === null &&
    intlResponse.status !== 200
  ) {
    return intlResponse;
  }

  // Pass the request through Supabase auth session refresh on every non-redirect request
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
