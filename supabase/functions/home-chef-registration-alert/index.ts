import { createClient } from "npm:@supabase/supabase-js@2";

// Deployment:
//   supabase functions deploy home-chef-registration-alert
// Hosted Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// RESEND_API_KEY and ALLOWED_ORIGINS are shared with uk-early-signup.

const MAX_BODY_BYTES = 1_024;
const APPLICATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALERT_EMAIL = "info@zeepup.com";

const configuredOrigins = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function isLocalDevelopmentOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string | null): origin is string {
  return Boolean(
    origin &&
      (configuredOrigins.has(origin) || isLocalDevelopmentOrigin(origin)),
  );
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(
  origin: string,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatSubmittedAt(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Rome",
      timeZoneName: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

type Registration = {
  id: string;
  user_id: string;
  full_name: string;
  business_name: string | null;
  email: string;
  country_region: string;
  city: string;
  postal_code: string;
  created_at: string;
};

function buildNotificationHtml(registration: Registration): string {
  const storeName = registration.business_name || registration.full_name;
  const location = [
    registration.city,
    registration.postal_code,
    registration.country_region,
  ].filter(Boolean).join(", ");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>New ZeepUp store registration</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f0;color:#111111;font-family:Arial,'Helvetica Neue',sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f4f0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:2px solid #111111;box-shadow:10px 10px 0 #111111;">
            <tr><td style="height:10px;background:#ff0066;font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:28px 32px 20px;">
                <img src="https://www.zeepup.com/assets/images/brand/zeepup-logo.png" width="132" alt="ZeepUp" style="display:block;width:132px;max-width:100%;height:auto;border:0;">
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 26px;">
                <p style="margin:0 0 14px;color:#ff0066;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Italy partner registration</p>
                <h1 style="margin:0;font-size:34px;line-height:1.08;letter-spacing:-1px;font-weight:800;">New store registered<span style="color:#ff0066;">.</span></h1>
                <p style="margin:16px 0 0;color:#4c4c4c;font-size:16px;line-height:1.55;">A new partner application has been saved on ZeepUp.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:2px solid #111111;">
                  <tr><td style="padding:18px 22px;background:#fff493;border-bottom:2px solid #111111;"><strong>Store</strong><br>${escapeHtml(storeName)}</td></tr>
                  <tr><td style="padding:18px 22px;border-bottom:1px solid #dddddd;"><strong>Contact</strong><br>${escapeHtml(registration.full_name)}</td></tr>
                  <tr><td style="padding:18px 22px;border-bottom:1px solid #dddddd;"><strong>Email</strong><br><a href="mailto:${escapeHtml(registration.email)}" style="color:#111111;text-decoration-color:#ff0066;">${escapeHtml(registration.email)}</a></td></tr>
                  <tr><td style="padding:18px 22px;border-bottom:1px solid #dddddd;"><strong>Location</strong><br>${escapeHtml(location)}</td></tr>
                  <tr><td style="padding:18px 22px;"><strong>Submitted</strong><br>${escapeHtml(formatSubmittedAt(registration.created_at))}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px;background:#111111;color:#ffffff;">
                <p style="margin:0;color:#bdbdbd;font-size:11px;line-height:1.5;">Application ID: ${escapeHtml(registration.id)}. This automated alert contains no tax details or uploaded documents.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");

  if (!isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({ ok: false, error: "origin_not_allowed" }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return jsonResponse(origin, { ok: false, error: "method_not_allowed" }, 405);
  }

  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return jsonResponse(origin, { ok: false, error: "unsupported_media_type" }, 415);
  }

  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonResponse(origin, { ok: false, error: "request_too_large" }, 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonResponse(origin, { ok: false, error: "invalid_request" }, 400);
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return jsonResponse(origin, { ok: false, error: "request_too_large" }, 413);
  }

  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid payload");
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(origin, { ok: false, error: "invalid_json" }, 400);
  }

  const applicationId = typeof payload.applicationId === "string"
    ? payload.applicationId.trim()
    : "";
  if (!APPLICATION_ID_PATTERN.test(applicationId)) {
    return jsonResponse(origin, { ok: false, error: "invalid_application_id" }, 400);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return jsonResponse(origin, { ok: false, error: "unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    console.error("Store alert configuration is incomplete.");
    return jsonResponse(origin, { ok: false, error: "server_error" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const accessToken = authorization.slice("Bearer ".length);
  const { data: userData, error: userError } = await supabase.auth.getUser(
    accessToken,
  );

  if (userError || !userData.user) {
    return jsonResponse(origin, { ok: false, error: "unauthorized" }, 401);
  }

  const { data: registration, error: registrationError } = await supabase
    .from("home_chef_registration_italia")
    .select(
      "id, user_id, full_name, business_name, email, country_region, city, postal_code, created_at",
    )
    .eq("id", applicationId)
    .eq("user_id", userData.user.id)
    .eq("status", "submitted")
    .maybeSingle<Registration>();

  if (registrationError) {
    console.error("Store alert registration lookup failed.", {
      code: registrationError.code,
    });
    return jsonResponse(origin, { ok: false, error: "server_error" }, 500);
  }

  if (!registration) {
    return jsonResponse(origin, { ok: false, error: "registration_not_found" }, 404);
  }

  const storeName = registration.business_name || registration.full_name;
  const submittedAt = formatSubmittedAt(registration.created_at);
  const location = [
    registration.city,
    registration.postal_code,
    registration.country_region,
  ].filter(Boolean).join(", ");

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ZeepUp Registrations <notifications@updates.zeepup.com>",
        to: [ALERT_EMAIL],
        subject: `New ZeepUp store registration: ${storeName}`,
        text: `New ZeepUp store registration\n\nStore: ${storeName}\nContact: ${registration.full_name}\nEmail: ${registration.email}\nLocation: ${location}\nSubmitted: ${submittedAt}\nApplication ID: ${registration.id}\n\nNo tax details or uploaded documents are included in this alert.`,
        html: buildNotificationHtml(registration),
      }),
    });

    if (!resendResponse.ok) {
      console.error("Store alert email request failed.", {
        status: resendResponse.status,
      });
      return jsonResponse(origin, { ok: false, error: "email_failed" }, 502);
    }
  } catch {
    console.error("Store alert email request failed unexpectedly.");
    return jsonResponse(origin, { ok: false, error: "email_failed" }, 502);
  }

  return jsonResponse(origin, { ok: true, status: "sent" });
});
