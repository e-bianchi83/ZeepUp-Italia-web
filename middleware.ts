const COUNTRY_COOKIE = "zeepup_country";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const config = {
  matcher: "/",
};

function readCountryPreference(cookieHeader: string | null): "it" | "uk" | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)zeepup_country=(it|uk)(?:;|$)/);
  return match ? (match[1] as "it" | "uk") : null;
}

function countryFromHeader(countryCode: string | null): "it" | "uk" {
  switch (countryCode?.toUpperCase()) {
    case "IT":
      return "it";
    case "GB":
      return "uk";
    default:
      return "uk";
  }
}

function redirectToCountry(request: Request, country: "it" | "uk", savePreference = false): Response {
  const destination = new URL(`/${country}`, request.url);
  const headers = new Headers({
    Location: destination.toString(),
    "Cache-Control": "private, no-store",
    Vary: "Cookie, X-Vercel-IP-Country",
  });

  if (savePreference) {
    headers.append(
      "Set-Cookie",
      `${COUNTRY_COOKIE}=${country}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax; Secure`,
    );
  }

  return new Response(null, { status: 307, headers });
}

export default function middleware(request: Request): Response {
  const url = new URL(request.url);
  const requestedCountry = url.searchParams.get("country");

  if (requestedCountry === "it" || requestedCountry === "uk") {
    return redirectToCountry(request, requestedCountry, true);
  }

  const savedCountry = readCountryPreference(request.headers.get("cookie"));
  if (savedCountry) return redirectToCountry(request, savedCountry);

  return redirectToCountry(request, countryFromHeader(request.headers.get("x-vercel-ip-country")));
}
