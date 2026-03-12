import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "@/lib/utils";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Run locale middleware — handles locale detection and rewrites
  const response = intlMiddleware(request);

  if (!hasEnvVars) return response;

  // Always refresh the Supabase auth session — even on locale redirects.
  // Mobile browsers often have a different Accept-Language header which
  // triggers intlMiddleware redirects; skipping the session refresh on
  // those hops caused auth cookies to go stale on mobile.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If next-intl is redirecting (locale normalization), return with
  // refreshed auth cookies attached to the redirect response.
  if (response.status !== 200) {
    return response;
  }

  // Strip locale prefix to normalize path checks.
  // Default locale "he" has no prefix (localePrefix: "as-needed").
  const pathname = request.nextUrl.pathname;
  const pathnameWithoutLocale = pathname.replace(/^\/th(?=\/|$)/, "") || "/";

  if (
    pathnameWithoutLocale !== "/" &&
    !user &&
    !pathnameWithoutLocale.startsWith("/login") &&
    !pathnameWithoutLocale.startsWith("/auth")
  ) {
    const localePrefix = pathname !== pathnameWithoutLocale
      ? pathname.slice(0, pathname.length - pathnameWithoutLocale.length)
      : "";
    const url = request.nextUrl.clone();
    url.pathname = `${localePrefix}/auth/login`;
    url.searchParams.set("returnTo", pathnameWithoutLocale);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
