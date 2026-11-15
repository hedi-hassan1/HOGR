import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["ckb", "ar", "en"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];
  if (LOCALES.includes(first)) return NextResponse.next();

  const saved = req.cookies.get("hogr_locale")?.value;
  let locale = saved && LOCALES.includes(saved) ? saved : "ckb";
  if (!saved) {
    const accept = req.headers.get("accept-language") || "";
    if (/^en/i.test(accept)) locale = "en";
    else if (/^ar/i.test(accept)) locale = "ar";
  }
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|uploads|images|brand|pwa-icon|sw.js|favicon.ico|icon.svg|manifest.webmanifest|robots.txt).*)"],
};
