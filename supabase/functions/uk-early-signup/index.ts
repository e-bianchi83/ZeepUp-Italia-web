import { createClient } from "npm:@supabase/supabase-js@2";

// Deployment:
//   supabase functions deploy uk-early-signup --no-verify-jwt
// Hosted Supabase automatically provides SUPABASE_URL and a server-only
// service-role key. Configure RESEND_API_KEY, ALERT_EMAIL and ALLOWED_ORIGINS
// with `supabase secrets set` before deploying.
// Never copy any server key into uk/index.html or other browser code.

const MAX_BODY_BYTES = 4_096;
const MAX_EMAIL_LENGTH = 254;
const DEFAULT_SOURCE = "zeepup-uk";
const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

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
    "Access-Control-Allow-Headers": "content-type",
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
  return String(value)
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
      timeZone: "Europe/London",
      timeZoneName: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function buildSignupNotificationHtml(
  email: string,
  source: string,
  submittedAt: string,
): string {
  const safeEmail = escapeHtml(email);
  const safeSource = escapeHtml(source);
  const safeSubmittedAt = escapeHtml(formatSubmittedAt(submittedAt));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>New ZeepUp UK early access signup</title>
  </head>
  <body bgcolor="#ffffff" style="margin:0;padding:0;background:#ffffff;color:#111111;font-family:Arial,'Helvetica Neue',sans-serif;color-scheme:light only;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      A new person has joined the ZeepUp UK early access list.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:100%;background:#ffffff;">
      <tr>
        <td align="center" bgcolor="#ffffff" style="padding:32px 16px;background:#ffffff;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:2px solid #111111;box-shadow:10px 10px 0 #111111;">
            <tr>
              <td style="height:10px;background:#ff0066;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td bgcolor="#ffffff" style="padding:28px 32px 20px;background:#ffffff;">
                <img src="https://www.zeepup.com/assets/images/brand/zeepup-header-new.png?v=20260820-3" width="132" alt="ZeepUp" style="display:block;width:132px;max-width:100%;height:auto;border:0;background:#ffffff;">
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 30px;">
                <p style="margin:0 0 14px;color:#ff0066;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">UK early access</p>
                <h1 style="margin:0;font-size:34px;line-height:1.08;letter-spacing:-1px;font-weight:800;">New signup received<span style="color:#ff0066;">.</span></h1>
                <p style="margin:16px 0 0;color:#4c4c4c;font-size:16px;line-height:1.55;">Someone has joined the ZeepUp UK launch list. Their details are below.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:2px solid #111111;">
                  <tr>
                    <td style="padding:22px 24px;background:#fff493;border-bottom:2px solid #111111;">
                      <p style="margin:0 0 7px;font-size:11px;line-height:1.3;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Email address</p>
                      <p style="margin:0;font-size:20px;line-height:1.35;font-weight:700;word-break:break-word;"><a href="mailto:${safeEmail}" style="color:#111111;text-decoration:underline;text-decoration-color:#ff0066;">${safeEmail}</a></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 24px;background:#ffffff;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td valign="top" style="width:50%;padding:0 12px 0 0;">
                            <p style="margin:0 0 6px;color:#666666;font-size:11px;line-height:1.3;font-weight:700;letter-spacing:.8px;text-transform:uppercase;">Source</p>
                            <p style="margin:0;font-size:14px;line-height:1.5;font-weight:700;">${safeSource}</p>
                          </td>
                          <td valign="top" style="width:50%;padding:0 0 0 12px;">
                            <p style="margin:0 0 6px;color:#666666;font-size:11px;line-height:1.3;font-weight:700;letter-spacing:.8px;text-transform:uppercase;">Submitted</p>
                            <p style="margin:0;font-size:14px;line-height:1.5;font-weight:700;">${safeSubmittedAt}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px;background:#111111;color:#ffffff;">
                <p style="margin:0 0 7px;font-size:12px;line-height:1.5;font-weight:700;">ZeepUp UK signup notification</p>
                <p style="margin:0;color:#bdbdbd;font-size:11px;line-height:1.5;">This automated message was generated after a successful website signup. No reply was sent to the subscriber.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function isDuplicateError(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");

  // Requests without an approved browser origin receive no permissive CORS
  // headers. Localhost is accepted only over HTTP for local development.
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
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Allow": "POST, OPTIONS",
      },
    });
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

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse(origin, { ok: false, error: "invalid_json" }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse(origin, { ok: false, error: "invalid_request" }, 400);
  }

  const submission = payload as Record<string, unknown>;
  const honeypot = typeof submission.website === "string"
    ? submission.website.trim()
    : "";

  // Give simple bots the same response as a real registration without writing
  // to the database or sending a notification.
  if (honeypot) {
    return jsonResponse(origin, { ok: true, status: "registered" });
  }

  if (typeof submission.email !== "string") {
    return jsonResponse(origin, { ok: false, error: "invalid_email" }, 400);
  }

  const email = submission.email.trim().toLowerCase();
  if (
    email.length === 0 ||
    email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_PATTERN.test(email)
  ) {
    return jsonResponse(origin, { ok: false, error: "invalid_email" }, 400);
  }

  const source = typeof submission.source === "string"
    ? submission.source.trim()
    : "";
  if (source !== DEFAULT_SOURCE) {
    return jsonResponse(origin, { ok: false, error: "invalid_source" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("UK signup configuration error: Supabase defaults are missing.");
    return jsonResponse(origin, { ok: false, error: "server_error" }, 500);
  }

  // This key is injected by Supabase only inside the hosted function. It
  // bypasses RLS here and is never returned to or embedded in browser code.
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signup, error: insertError } = await supabase
    .from("uk_early_signups")
    .insert({ email, source })
    .select("id, email, source, created_at")
    .single();

  if (insertError) {
    if (isDuplicateError(insertError)) {
      return jsonResponse(origin, { ok: true, status: "already_registered" });
    }

    console.error("UK signup database insert failed.", { code: insertError.code });
    return jsonResponse(origin, { ok: false, error: "server_error" }, 500);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const alertEmail = Deno.env.get("ALERT_EMAIL");

  if (!resendApiKey || !alertEmail) {
    console.error("UK signup notification skipped: notification secrets are missing.");
  } else {
    try {
      const submittedAt = signup.created_at;
      const formattedSubmittedAt = formatSubmittedAt(submittedAt);
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "ZeepUp Signups <notifications@updates.zeepup.com>",
          to: [alertEmail],
          subject: "New ZeepUp UK early access signup",
          text: `New ZeepUp UK early access signup\n\nEmail: ${signup.email}\nSource: ${signup.source}\nSubmitted: ${formattedSubmittedAt}\n\nThis is an automated signup notification. No reply was sent to the subscriber.`,
          html: buildSignupNotificationHtml(
            signup.email,
            signup.source,
            submittedAt,
          ),
        }),
      });

      if (resendResponse.ok) {
        const { error: updateError } = await supabase
          .from("uk_early_signups")
          .update({ notification_sent: true })
          .eq("id", signup.id);

        if (updateError) {
          console.error("UK signup notification flag update failed.", {
            code: updateError.code,
          });
        }
      } else {
        console.error("UK signup notification request failed.", {
          status: resendResponse.status,
        });
      }
    } catch {
      console.error("UK signup notification request failed unexpectedly.");
    }
  }

  // Notification failures never discard an otherwise valid database signup.
  return jsonResponse(origin, { ok: true, status: "registered" });
});
