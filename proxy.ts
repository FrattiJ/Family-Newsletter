import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { passwordStamp } from "./lib/passwordStamp";

const SESSION_COOKIE = "fn_session";

/**
 * Guards every page behind the shared family password. Server actions are
 * reachable by direct POST and are therefore checked again inside each
 * action -- see lib/session.ts.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSession(request);

  const loggedIn = session !== null;
  const hasPickedName = Boolean(session?.name);

  if (pathname === "/login") {
    if (hasPickedName) return redirectTo("/newsletter", request);
    if (loggedIn) return redirectTo("/who", request);
    return NextResponse.next();
  }

  if (!loggedIn) return redirectTo("/login", request);

  if (!hasPickedName && pathname !== "/who") {
    return redirectTo("/who", request);
  }

  if (pathname === "/") return redirectTo("/newsletter", request);

  return NextResponse.next();
}

async function readSession(
  request: NextRequest,
): Promise<{ name: string } | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  const password = process.env.FAMILY_PASSWORD;
  if (!token || !secret || !password) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    // Signed before the family password was changed: log in again.
    if (payload.pw !== (await passwordStamp(password, secret))) return null;
    return { name: typeof payload.name === "string" ? payload.name : "" };
  } catch {
    return null;
  }
}

function redirectTo(pathname: string, request: NextRequest) {
  return NextResponse.redirect(new URL(pathname, request.nextUrl.origin));
}

export const config = {
  matcher: [
    // Everything except Next's own assets and the photo route, which
    // authenticates itself with a per-photo token so email can load images.
    "/((?!_next/static|_next/image|api/photo|favicon.ico|.*\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)",
  ],
};
