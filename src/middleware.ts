import { NextRequest, NextResponse } from "next/server";

const MENU_HOST = (process.env.MENU_DOMAIN || "https://menu.elsa3dcafe.com").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
const ADMIN_HOST = (process.env.ADMIN_DOMAIN || "https://adminmenueg.elsa3dcafe.com").replace(/^https?:\/\//, "").replace(/\/.*$/, "");

const SESSION_COOKIE = "elsa3d_admin";

const ADMIN_PAGES = ["/", "/login", "/items", "/categories", "/addons", "/import", "/appearance", "/qr", "/audit", "/settings"];

function notFound(): NextResponse {
  return new NextResponse("Not Found", { status: 404 });
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0];
  const path = req.nextUrl.pathname;
  const isAdminHost = host === ADMIN_HOST && ADMIN_HOST !== "localhost";
  const isMenuHost = host === MENU_HOST && MENU_HOST !== "localhost";

  /* ── Admin host: clean URLs rewritten to /admin/* internals ── */
  if (isAdminHost) {
    // Menu-only routes must not exist here
    if (path === "/menu" || path.startsWith("/api/availability") || path.startsWith("/api/analytics")) {
      return notFound();
    }

    if (path === "/print") {
      return notFound();
    }

    // Public: login page + login API + health
    if (path === "/login") {
      return NextResponse.rewrite(new URL("/admin/login", req.url));
    }
    if (path.startsWith("/api/admin/auth/login") || path === "/api/health") {
      return NextResponse.next();
    }

    // Rewrite clean URL → /admin/<path>
    let target: string | null = null;
    if (path === "/") target = "/admin";
    else if (ADMIN_PAGES.includes(path)) target = `/admin${path}`;
    else if (path === "/print/qr") target = "/admin/qr/print";
    else if (path.startsWith("/api/admin/")) target = path;
    else if (path.startsWith("/admin/")) target = path; // internal direct access (menus link there)
    else return notFound();

    // Shallow auth gate (deep verification happens in each page/API)
    const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
    if (!hasCookie) {
      const isApi = target.startsWith("/api/");
      if (isApi) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.rewrite(url);
    }

    return NextResponse.rewrite(new URL(target + req.nextUrl.search, req.url));
  }

  /* ── Menu host (and any unknown host, e.g. localhost dev / IP) ── */
  if (isMenuHost) {
    // Hard isolation: admin surface must 404 on the public menu domain
    if (path.startsWith("/admin") || path.startsWith("/api/admin") || path === "/login" || path === "/menu") {
      return notFound();
    }
  } else {
    // Unknown host (localhost dev): block menu-only /api surface duplicates, keep admin accessible
    if (path === "/menu") return notFound();
  }

  if (path === "/") {
    return NextResponse.rewrite(new URL("/menu" + req.nextUrl.search, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static assets and Next internals
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|css|js|map|json|txt)$).*)",
  ],
};
