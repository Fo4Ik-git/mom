import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { isAllowedFrontendRequest } from "@/lib/api/api-security";
import { stripLocalePrefix, withLocalePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const protectedPaths = ["/builder", "/admin"];
const authPaths = ["/auth/signin", "/auth/signup"];

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isAuthApi = pathname.startsWith("/api/auth/");
  const isSignupApi = pathname === "/api/auth/signup";

  if (isApi) {
    if (!isAuthApi) {
      const mustValidateFrontend =
        request.method !== "GET" ||
        pathname.startsWith("/api/calculators") ||
        pathname.startsWith("/api/admin") ||
        isSignupApi;

      if (mustValidateFrontend && !isAllowedFrontendRequest(request)) {
        return NextResponse.json(
          { error: "Forbidden: request not allowed from this origin" },
          { status: 403 },
        );
      }
    }

    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(request);
  const { locale, pathname: barePath } = stripLocalePrefix(pathname);

  const isLoggedIn = Boolean(request.auth);
  const isAdmin = request.auth?.user?.role === "ADMIN";
  const isBanned = Boolean(request.auth?.user?.banned) && !isAdmin;

  if (isBanned && barePath.startsWith("/builder")) {
    return NextResponse.redirect(
      new URL(withLocalePath("/", locale), request.url),
    );
  }

  if (barePath.startsWith("/admin") && !isAdmin) {
    return NextResponse.redirect(
      new URL(withLocalePath("/auth/signin", locale), request.url),
    );
  }

  if (protectedPaths.some((path) => barePath.startsWith(path)) && !isLoggedIn) {
    const signInUrl = new URL(withLocalePath("/auth/signin", locale), request.url);
    signInUrl.searchParams.set("callbackUrl", barePath);
    return NextResponse.redirect(signInUrl);
  }

  if (authPaths.some((path) => barePath.startsWith(path)) && isLoggedIn) {
    return NextResponse.redirect(
      new URL(withLocalePath("/", locale), request.url),
    );
  }

  return intlResponse;
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/api/:path*",
  ],
};
