import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { encodeHeaderUtf8 } from "@/lib/http/safe-header";
import { generateTraceId } from "@/lib/logger/trace-id";
import { isAllowedFrontendRequest } from "@/lib/api/api-security";
import { stripLocalePrefix, withLocalePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const protectedPaths = ["/builder", "/admin"];
const authPaths = ["/auth/signin", "/auth/signup"];

function withTraceHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  if (!headers.get("x-trace-id")) {
    headers.set("x-trace-id", generateTraceId());
  }
  const user = request.auth?.user;
  if (user?.id) {
    headers.set("x-user-id", user.id);
  }
  if (user?.email) {
    headers.set("x-user-email", user.email);
  }
  if (user?.name) {
    headers.set("x-user-name", encodeHeaderUtf8(user.name));
  }
  if (user?.role) {
    headers.set("x-user-role", user.role);
  }
  return headers;
}

function nextWithTrace(request: NextRequest, response: NextResponse): NextResponse {
  const traceId = request.headers.get("x-trace-id") ?? generateTraceId();
  response.headers.set("x-trace-id", traceId);
  return response;
}

export default auth((request) => {
  const traceHeaders = withTraceHeaders(request);
  const tracedRequest = new NextRequest(request, { headers: traceHeaders });

  const { pathname } = tracedRequest.nextUrl;
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

      if (mustValidateFrontend && !isAllowedFrontendRequest(tracedRequest)) {
        return nextWithTrace(
          tracedRequest,
          NextResponse.json(
            { error: "Forbidden: request not allowed from this origin" },
            { status: 403 },
          ),
        );
      }
    }

    return nextWithTrace(tracedRequest, NextResponse.next({ request: tracedRequest }));
  }

  const intlResponse = intlMiddleware(tracedRequest);
  const { locale, pathname: barePath } = stripLocalePrefix(pathname);

  const isLoggedIn = Boolean(request.auth);
  const isAdmin = request.auth?.user?.role === "ADMIN";
  const isBanned = Boolean(request.auth?.user?.banned) && !isAdmin;

  if (isBanned && barePath.startsWith("/builder")) {
    return nextWithTrace(
      tracedRequest,
      NextResponse.redirect(new URL(withLocalePath("/", locale), tracedRequest.url)),
    );
  }

  if (barePath.startsWith("/admin") && !isAdmin) {
    return nextWithTrace(
      tracedRequest,
      NextResponse.redirect(
        new URL(withLocalePath("/auth/signin", locale), tracedRequest.url),
      ),
    );
  }

  if (protectedPaths.some((path) => barePath.startsWith(path)) && !isLoggedIn) {
    const signInUrl = new URL(withLocalePath("/auth/signin", locale), tracedRequest.url);
    signInUrl.searchParams.set("callbackUrl", barePath);
    return nextWithTrace(tracedRequest, NextResponse.redirect(signInUrl));
  }

  if (authPaths.some((path) => barePath.startsWith(path)) && isLoggedIn) {
    return nextWithTrace(
      tracedRequest,
      NextResponse.redirect(new URL(withLocalePath("/", locale), tracedRequest.url)),
    );
  }

  return nextWithTrace(tracedRequest, intlResponse);
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/api/:path*",
  ],
};
