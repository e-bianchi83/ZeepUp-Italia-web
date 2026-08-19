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
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "ZeepUp Signups <notifications@updates.zeepup.com>",
          to: [alertEmail],
          subject: "New ZeepUp UK early signup",
          text: `Email: ${signup.email}\nSource: ${signup.source}\nSubmitted: ${submittedAt}`,
          html: `<h1>New ZeepUp UK early signup</h1>
            <p><strong>Email:</strong> ${escapeHtml(signup.email)}</p>
            <p><strong>Source:</strong> ${escapeHtml(signup.source)}</p>
            <p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>`,
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
