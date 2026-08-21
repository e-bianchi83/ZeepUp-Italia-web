import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

// Deploy with:
//   supabase functions deploy uk-partner-registration --no-verify-jwt
// Hosted Supabase supplies SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// Configure RESEND_API_KEY and optionally EMAIL_FROM, INTERNAL_EMAIL and
// ALLOWED_ORIGINS with `supabase secrets set`.

const SOURCE = "zeepup_uk_partner_interest";
const BUCKET = "uk-partner-documents";
const DEFAULT_INTERNAL_EMAIL = "info@zeepup.com";
const DEFAULT_FROM = "ZeepUp UK <notifications@updates.zeepup.com>";
const MAX_BODY_BYTES = 22 * 1024 * 1024;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TEXT_LENGTH = 4_000;
const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const defaultOrigins = new Set([
  "https://www.zeepup.com",
  "https://zeepup.com",
]);

const configuredOrigins = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const textFields = [
  "partner_type",
  "first_name",
  "last_name",
  "email",
  "phone",
  "role",
  "town_city",
  "age_18_plus",
  "trading_name",
  "legal_operator_name",
  "business_structure",
  "company_number",
  "vat_number",
  "website_social",
  "target_start_date",
  "local_authority",
  "home_kitchen_address",
  "home_kitchen_postcode",
  "property_status",
  "home_business_permissions",
  "hmrc_status",
  "customers_enter_home",
  "venue_type",
  "venue_address",
  "venue_postcode",
  "staff_count",
  "food_hygiene_rating",
  "fhrs_url",
  "food_business_registration_status",
  "food_business_registration_date",
  "food_business_registration_reference",
  "inspection_status",
  "food_description",
  "typical_price",
  "capacity",
  "alcohol_offered",
  "alcohol_licensing_status",
  "max_home_dining_guests",
  "home_dining_safety_status",
  "pets_at_property",
  "accessibility_premises_notes",
  "food_safety_management_system",
  "food_hygiene_training",
  "allergen_process",
  "ppds_status",
  "allergen_information_confirmation",
  "ppds_labelling_confirmation",
  "public_liability_status",
  "product_liability_status",
  "employers_liability_status",
  "other_licences",
  "lawful_operation_confirmation",
  "marketplace_confirmation",
  "accuracy_confirmation",
  "terms_acceptance",
  "marketing_opt_in",
] as const;

const fileFields = new Set([
  "food_business_registration_file",
  "food_hygiene_file",
  "training_file",
  "insurance_file",
  "menu_file",
  "brand_file",
]);

const allowedMimeTypes = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type ApplicationRecord = {
  id: string;
  submission_id: string;
  partner_type: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  trading_name: string;
  town_city: string;
  local_authority: string;
  application_data: Record<string, unknown>;
  documents: Record<string, DocumentRecord>;
  applicant_email_sent: boolean;
  internal_email_sent: boolean;
  submitted_at: string;
};

type DocumentRecord = {
  path: string;
  original_name: string;
  content_type: string;
  size: number;
};

type EmailAttachment = {
  filename: string;
  content: string;
  content_type: string;
};

const pdfSections = [
  {
    title: "Partner and contact",
    fields: [
      ["partner_type", "Partner type"], ["first_name", "First name"],
      ["last_name", "Last name"], ["email", "Email"], ["phone", "Mobile"],
      ["role", "Role"], ["town_city", "Town / city"], ["age_18_plus", "Age 18+ confirmed"],
    ],
  },
  {
    title: "Business details",
    fields: [
      ["trading_name", "Trading name"], ["legal_operator_name", "Legal operator name"],
      ["business_structure", "Business structure"], ["company_number", "Companies House number"],
      ["vat_number", "VAT number"], ["website_social", "Website / Instagram"],
      ["target_start_date", "Target start date"], ["local_authority", "Local authority"],
    ],
  },
  {
    title: "Home kitchen",
    fields: [
      ["home_kitchen_address", "Home kitchen address"], ["home_kitchen_postcode", "Postcode"],
      ["property_status", "Property status"], ["home_business_permissions", "Home-business permissions"],
      ["hmrc_status", "Tax / HMRC setup"], ["customers_enter_home", "Customers enter home"],
    ],
  },
  {
    title: "Chef / venue",
    fields: [
      ["venue_type", "Premises type"], ["venue_address", "Premises address"],
      ["venue_postcode", "Postcode"], ["staff_count", "Employees / workers"],
      ["food_hygiene_rating", "Food Hygiene Rating"], ["fhrs_url", "FSA rating link"],
    ],
  },
  {
    title: "Registration and offer",
    fields: [
      ["food_business_registration_status", "Registration status"],
      ["food_business_registration_date", "Registration / submission date"],
      ["food_business_registration_reference", "Registration reference"],
      ["inspection_status", "Inspection status"], ["offer_types", "ZeepUp offer"],
      ["food_description", "Food description"], ["typical_price", "Typical price"],
      ["capacity", "Daily capacity / covers"], ["alcohol_offered", "Alcohol offered"],
      ["alcohol_licensing_status", "Alcohol licensing status"],
      ["max_home_dining_guests", "Maximum home-dining guests"],
      ["home_dining_safety_status", "Premises safety review"],
      ["pets_at_property", "Pets at property"],
      ["accessibility_premises_notes", "Access / premises notes"],
    ],
  },
  {
    title: "Food safety and insurance",
    fields: [
      ["food_safety_management_system", "Food Safety Management System"],
      ["food_hygiene_training", "Food hygiene training"], ["allergen_process", "Allergen records"],
      ["ppds_status", "PPDS food"], ["allergen_information_confirmation", "Allergen confirmation"],
      ["ppds_labelling_confirmation", "PPDS labelling confirmation"],
      ["public_liability_status", "Public liability insurance"],
      ["product_liability_status", "Product liability insurance"],
      ["employers_liability_status", "Employers' liability insurance"],
      ["other_licences", "Other licences / permits"],
    ],
  },
  {
    title: "Declarations",
    fields: [
      ["lawful_operation_confirmation", "Lawful operation confirmed"],
      ["marketplace_confirmation", "Marketplace status confirmed"],
      ["accuracy_confirmation", "Accuracy confirmed"], ["terms_acceptance", "Terms accepted"],
      ["marketing_opt_in", "Marketing opt-in"],
    ],
  },
] as const;

function isLocalOrigin(origin: string): boolean {
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
      (defaultOrigins.has(origin) || configuredOrigins.has(origin) ||
        isLocalOrigin(origin)),
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

function emailShell(preheader: string, content: string, footer: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="margin:0;padding:0;background:#f2f2ee;color:#111111;font-family:Arial,'Helvetica Neue',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f2f2ee;">
      <tr>
        <td align="center" style="padding:36px 14px 48px;">
          <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;background:#ffffff;border:2px solid #111111;box-shadow:10px 10px 0 #111111;">
            <tr><td style="height:12px;background:#ff0066;font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:28px 34px 18px;">
                <img src="https://www.zeepup.com/assets/images/brand/zeepup-logo.png" width="138" alt="ZeepUp" style="display:block;width:138px;max-width:100%;height:auto;border:0;">
              </td>
            </tr>
            ${content}
            <tr>
              <td style="padding:22px 34px;background:#111111;color:#ffffff;">
                <p style="margin:0 0 6px;font-size:12px;line-height:1.5;font-weight:800;">ZeepUp UK</p>
                <p style="margin:0;color:#bdbdbd;font-size:11px;line-height:1.55;">${footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildApplicantEmail(application: ApplicationRecord): string {
  const firstName = escapeHtml(application.first_name);
  const tradingName = escapeHtml(application.trading_name);
  return emailShell(
    "Your ZeepUp UK partner interest has landed safely.",
    `<tr>
      <td style="padding:4px 34px 28px;">
        <p style="margin:0 0 12px;color:#ff0066;font-size:12px;line-height:1.4;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;">Partner interest received</p>
        <h1 style="margin:0;font-size:40px;line-height:1.04;font-weight:900;">You're on the table<span style="color:#ff0066;">.</span></h1>
        <p style="margin:18px 0 0;color:#444444;font-size:17px;line-height:1.6;">Hi ${firstName}, your application for <strong style="color:#111111;">${tradingName}</strong> has landed safely with the ZeepUp UK team.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 34px 32px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:2px solid #111111;">
          <tr><td style="padding:20px 22px;background:#fff493;border-bottom:2px solid #111111;font-size:18px;line-height:1.4;font-weight:800;">What happens next?</td></tr>
          <tr><td style="padding:22px;color:#333333;font-size:15px;line-height:1.65;">We'll review your setup, food-safety readiness and any documents you shared. If the fit looks right, we'll email you with the next onboarding step. Nothing else is needed today.</td></tr>
        </table>
        <p style="margin:22px 0 0;color:#666666;font-size:13px;line-height:1.6;">Application reference: <strong style="color:#111111;">${escapeHtml(application.id)}</strong></p>
      </td>
    </tr>`,
    "This confirmation was sent because a UK partner-interest form was submitted using this email address. Reply to this message if anything needs correcting.",
  );
}

function buildInternalEmail(application: ApplicationRecord): string {
  const data = application.application_data;
  const offers = Array.isArray(data.offer_types)
    ? data.offer_types.join(", ")
    : "Not supplied";
  const location = [application.town_city, data.venue_postcode ?? data.home_kitchen_postcode]
    .filter(Boolean).join(", ");
  const row = (label: string, value: unknown, shade = "#ffffff") =>
    `<tr><td style="padding:10px 14px;background:${shade};border-bottom:1px solid #d8d8d2;color:#666666;font-size:11px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;width:34%;">${escapeHtml(label)}</td><td style="padding:10px 14px;background:${shade};border-bottom:1px solid #d8d8d2;font-size:14px;line-height:1.45;font-weight:700;word-break:break-word;">${escapeHtml(value || "Not supplied")}</td></tr>`;

  return emailShell(
    `New UK partner application from ${application.trading_name}.`,
    `<tr>
      <td style="padding:4px 34px 26px;">
        <p style="margin:0 0 12px;color:#ff0066;font-size:12px;line-height:1.4;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;">New UK partner</p>
        <h1 style="margin:0;font-size:36px;line-height:1.05;font-weight:900;">A new cook joined the table<span style="color:#ff0066;">.</span></h1>
        <p style="margin:16px 0 0;color:#444444;font-size:16px;line-height:1.55;">Review the application summary below. The completed form PDF and all documents supplied by the applicant are attached.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 34px 32px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:2px solid #111111;border-collapse:collapse;">
          ${row("Trading name", application.trading_name, "#fff493")}
          ${row("Applicant", `${application.first_name} ${application.last_name}`)}
          ${row("Email", application.email)}
          ${row("Phone", application.phone)}
          ${row("Setup", application.partner_type === "home_chef" ? "Home chef" : "Chef / venue")}
          ${row("Location", location)}
          ${row("Local authority", application.local_authority)}
          ${row("Offer", offers)}
          ${row("Submitted", formatSubmittedAt(application.submitted_at))}
          ${row("Reference", application.id)}
        </table>
      </td>
    </tr>`,
    "Automated UK partner-registration alert. Reply directly to contact the applicant.",
  );
}

function pdfText(value: unknown): string {
  return String(value ?? "")
    .replaceAll("£", "GBP ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E\n\r\t]/g, "?");
}

function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.map(displayValue).join(", ") : "Not entered";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value ?? "").trim();
  if (!text) return "Not entered";
  const labels: Record<string, string> = {
    home_chef: "Home chef",
    chef_venue: "Chef / venue",
    collection_to_go: "To-go / collection",
    home_dining: "Home dining",
    venue_dine_in: "Dine-in",
    classes_tastings: "Classes / tastings",
    other_experience: "Other experience",
    sole_trader: "Sole trader",
    limited_company: "Limited company",
    not_set_up: "Not set up yet",
    registered: "Registered with local authority",
    submitted: "Submitted / waiting for confirmation",
    not_yet: "Not yet",
    yes: "Yes",
    no: "No",
    maybe: "Possibly later",
    unsure: "Unsure",
  };
  return labels[text] ?? text;
}

function wrapPdfText(text: string, font: { widthOfTextAtSize: (text: string, size: number) => number }, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of pdfText(text).split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        line = word;
        continue;
      }
      let fragment = "";
      for (const character of word) {
        if (font.widthOfTextAtSize(fragment + character, size) > maxWidth && fragment) {
          lines.push(fragment);
          fragment = character;
        } else {
          fragment += character;
        }
      }
      line = fragment;
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function buildApplicationPdf(application: ApplicationRecord): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 46;
  const contentWidth = pageWidth - (margin * 2);
  const pink = rgb(1, 0, 0.4);
  const butter = rgb(1, 0.957, 0.576);
  const ink = rgb(0.067, 0.067, 0.067);
  const muted = rgb(0.42, 0.4, 0.37);
  let page = document.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 66;

  const addPage = () => {
    page = document.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ x: 0, y: pageHeight - 12, width: pageWidth, height: 12, color: pink });
    page.drawText("ZEEPUP UK", { x: margin, y: pageHeight - 44, size: 12, font: bold, color: ink });
    y = pageHeight - 66;
  };

  page.drawRectangle({ x: 0, y: pageHeight - 12, width: pageWidth, height: 12, color: pink });
  page.drawText("ZEEPUP UK", { x: margin, y: y, size: 15, font: bold, color: ink });
  y -= 38;
  page.drawText("UK PARTNER REGISTRATION", { x: margin, y, size: 24, font: bold, color: ink });
  y -= 24;
  page.drawText(pdfText(application.trading_name), { x: margin, y, size: 14, font: bold, color: pink });
  y -= 20;
  page.drawText(`Submitted ${pdfText(formatSubmittedAt(application.submitted_at))}`, { x: margin, y, size: 9, font: regular, color: muted });
  y -= 30;

  for (const section of pdfSections) {
    if (y < 92) addPage();
    page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 24, color: butter });
    page.drawText(section.title.toUpperCase(), { x: margin + 9, y: y + 2, size: 9, font: bold, color: ink });
    y -= 28;

    for (const [field, label] of section.fields) {
      const lines = wrapPdfText(displayValue(application.application_data[field]), regular, 9.5, contentWidth - 18);
      const rowHeight = 17 + Math.max(lines.length, 1) * 12;
      if (y - rowHeight < 48) addPage();
      page.drawText(pdfText(label).toUpperCase(), { x: margin + 3, y, size: 7.5, font: bold, color: muted });
      y -= 13;
      for (const line of lines) {
        page.drawText(line || " ", { x: margin + 3, y, size: 9.5, font: regular, color: ink });
        y -= 12;
      }
      page.drawLine({ start: { x: margin + 3, y: y + 4 }, end: { x: pageWidth - margin - 3, y: y + 4 }, thickness: 0.5, color: rgb(0.86, 0.86, 0.83) });
      y -= 8;
    }
  }

  if (y < 110) addPage();
  page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 24, color: butter });
  page.drawText("UPLOADED DOCUMENTS", { x: margin + 9, y: y + 2, size: 9, font: bold, color: ink });
  y -= 29;
  const uploadedDocuments = Object.values(application.documents ?? {});
  const documentNames = uploadedDocuments.length
    ? uploadedDocuments.map((item) => item.original_name)
    : ["No documents uploaded"];
  for (const name of documentNames) {
    for (const line of wrapPdfText(name, regular, 9.5, contentWidth - 18)) {
      page.drawText(line, { x: margin + 3, y, size: 9.5, font: regular, color: ink });
      y -= 13;
    }
  }

  for (const currentPage of document.getPages()) {
    currentPage.drawText(`Application ${pdfText(application.id)}`, { x: margin, y: 24, size: 7.5, font: regular, color: muted });
  }
  return await document.save();
}

function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let index = 0; index < bytes.length; index += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + 0x8000)));
  }
  return btoa(chunks.join(""));
}

function safeAttachmentName(value: string): string {
  return value.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "attachment";
}

async function buildInternalAttachments(
  application: ApplicationRecord,
  supabase: {
    storage: {
      from: (bucket: string) => {
        download: (path: string) => Promise<{ data: Blob | null; error: unknown }>;
      };
    };
  },
): Promise<EmailAttachment[]> {
  const pdf = await buildApplicationPdf(application);
  const attachments: EmailAttachment[] = [{
    filename: `ZeepUp-UK-partner-${application.id}.pdf`,
    content: encodeBase64(pdf),
    content_type: "application/pdf",
  }];

  for (const record of Object.values(application.documents ?? {})) {
    const { data, error } = await supabase.storage.from(BUCKET).download(record.path);
    if (error || !data) throw new Error(`document_download_failed:${record.path}`);
    attachments.push({
      filename: safeAttachmentName(record.original_name),
      content: encodeBase64(new Uint8Array(await data.arrayBuffer())),
      content_type: record.content_type,
    });
  }
  return attachments;
}

async function sendEmail(
  apiKey: string,
  idempotencyKey: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status: number }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

function value(formData: FormData, field: string): string {
  const entry = formData.get(field);
  return typeof entry === "string" ? entry.trim() : "";
}

function validateApplication(
  formData: FormData,
): { ok: true; data: Record<string, unknown> } | { ok: false; field: string } {
  const required = [
    "partner_type", "first_name", "last_name", "email", "phone", "role",
    "town_city", "age_18_plus", "trading_name", "legal_operator_name",
    "business_structure", "target_start_date", "local_authority",
    "food_business_registration_status", "inspection_status",
    "food_description", "alcohol_offered", "food_safety_management_system",
    "food_hygiene_training", "allergen_process", "ppds_status",
    "allergen_information_confirmation", "public_liability_status",
    "product_liability_status", "lawful_operation_confirmation",
    "marketplace_confirmation", "accuracy_confirmation", "terms_acceptance",
  ];

  for (const field of required) {
    if (!value(formData, field)) return { ok: false, field };
  }

  const email = value(formData, "email").toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, field: "email" };
  }

  const partnerType = value(formData, "partner_type");
  if (!new Set(["home_chef", "chef_venue"]).has(partnerType)) {
    return { ok: false, field: "partner_type" };
  }

  const conditionalRequired: string[] = [];
  if (partnerType === "home_chef") {
    conditionalRequired.push(
      "home_kitchen_address", "home_kitchen_postcode", "property_status",
      "home_business_permissions", "hmrc_status", "customers_enter_home",
    );
  } else {
    conditionalRequired.push("venue_type", "venue_address", "venue_postcode");
  }
  if (["limited_company", "llp"].includes(value(formData, "business_structure"))) {
    conditionalRequired.push("company_number");
  }
  if (["yes", "maybe"].includes(value(formData, "alcohol_offered"))) {
    conditionalRequired.push("alcohol_licensing_status");
  }
  if (value(formData, "ppds_status") === "yes") {
    conditionalRequired.push("ppds_labelling_confirmation");
  }
  const offers = formData.getAll("offer_types")
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (offers.length === 0) return { ok: false, field: "offer_types" };
  if (offers.includes("home_dining")) {
    conditionalRequired.push("max_home_dining_guests", "home_dining_safety_status");
  }
  if (partnerType === "chef_venue" && Number(value(formData, "staff_count")) > 0) {
    conditionalRequired.push("employers_liability_status");
  }
  for (const field of conditionalRequired) {
    if (!value(formData, field)) return { ok: false, field };
  }

  const data: Record<string, unknown> = {};
  for (const field of textFields) {
    const fieldValue = value(formData, field);
    if (fieldValue.length > MAX_TEXT_LENGTH) return { ok: false, field };
    data[field] = field === "email" ? fieldValue.toLowerCase() : fieldValue;
  }
  data.offer_types = offers;
  data.marketing_opt_in = value(formData, "marketing_opt_in") === "yes";

  return { ok: true, data };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ ok: false, error: "origin_not_allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return jsonResponse(origin, { ok: false, error: "method_not_allowed" }, 405);
  }

  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonResponse(origin, { ok: false, error: "request_too_large" }, 413);
  }
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return jsonResponse(origin, { ok: false, error: "unsupported_media_type" }, 415);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse(origin, { ok: false, error: "invalid_form_data" }, 400);
  }

  if (value(formData, "company_fax")) {
    return jsonResponse(origin, { ok: true, status: "registered" });
  }
  if (value(formData, "source") !== SOURCE) {
    return jsonResponse(origin, { ok: false, error: "invalid_source" }, 400);
  }
  const submissionId = value(formData, "submission_id");
  if (!UUID_PATTERN.test(submissionId)) {
    return jsonResponse(origin, { ok: false, error: "invalid_submission_id" }, 400);
  }

  const validation = validateApplication(formData);
  if (!validation.ok) {
    return jsonResponse(origin, { ok: false, error: "invalid_field", field: validation.field }, 400);
  }

  const files = new Map<string, File>();
  let totalFileBytes = 0;
  for (const field of fileFields) {
    const entry = formData.get(field);
    if (!(entry instanceof File) || entry.size === 0) continue;
    if (entry.size > MAX_FILE_BYTES || !allowedMimeTypes.has(entry.type)) {
      return jsonResponse(origin, { ok: false, error: "invalid_file", field }, 400);
    }
    totalFileBytes += entry.size;
    files.set(field, entry);
  }
  if (totalFileBytes > MAX_TOTAL_FILE_BYTES) {
    return jsonResponse(origin, { ok: false, error: "files_too_large" }, 413);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const internalEmail = Deno.env.get("INTERNAL_EMAIL") || DEFAULT_INTERNAL_EMAIL;
  const emailFrom = Deno.env.get("EMAIL_FROM") || DEFAULT_FROM;
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    console.error("UK partner registration configuration is incomplete.");
    return jsonResponse(origin, { ok: false, error: "server_error" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const selectFields = "id, submission_id, partner_type, first_name, last_name, email, phone, role, trading_name, town_city, local_authority, application_data, documents, applicant_email_sent, internal_email_sent, submitted_at";

  let { data: application, error: lookupError } = await supabase
    .from("uk_partner_registrations")
    .select(selectFields)
    .eq("submission_id", submissionId)
    .maybeSingle<ApplicationRecord>();
  if (lookupError) {
    console.error("UK partner registration lookup failed.", { code: lookupError.code });
    return jsonResponse(origin, { ok: false, error: "server_error" }, 500);
  }

  if (application && application.email !== validation.data.email) {
    return jsonResponse(origin, { ok: false, error: "submission_conflict" }, 409);
  }
  if (!application) {
    const { data: inserted, error: insertError } = await supabase
      .from("uk_partner_registrations")
      .insert({
        submission_id: submissionId,
        source: SOURCE,
        partner_type: validation.data.partner_type,
        first_name: validation.data.first_name,
        last_name: validation.data.last_name,
        email: validation.data.email,
        phone: validation.data.phone,
        role: validation.data.role,
        trading_name: validation.data.trading_name,
        town_city: validation.data.town_city,
        local_authority: validation.data.local_authority,
        application_data: validation.data,
      })
      .select(selectFields)
      .single<ApplicationRecord>();
    if (insertError || !inserted) {
      console.error("UK partner registration insert failed.", { code: insertError?.code });
      return jsonResponse(origin, { ok: false, error: "server_error" }, 500);
    }
    application = inserted;
  }

  const documents = { ...(application.documents ?? {}) };
  for (const [field, file] of files) {
    if (documents[field]) continue;
    const extension = allowedMimeTypes.get(file.type)!;
    const path = `${application.id}/${field}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("UK partner document upload failed.", { field, message: uploadError.message });
      return jsonResponse(origin, { ok: false, error: "upload_failed", field }, 502);
    }
    documents[field] = {
      path,
      original_name: file.name.slice(0, 180),
      content_type: file.type,
      size: file.size,
    };
  }
  if (JSON.stringify(documents) !== JSON.stringify(application.documents ?? {})) {
    const { error: documentUpdateError } = await supabase
      .from("uk_partner_registrations")
      .update({ documents, updated_at: new Date().toISOString() })
      .eq("id", application.id);
    if (documentUpdateError) {
      console.error("UK partner document metadata update failed.", { code: documentUpdateError.code });
      return jsonResponse(origin, { ok: false, error: "server_error" }, 500);
    }
    application.documents = documents;
  }

  let applicantEmailSent = application.applicant_email_sent;
  let internalEmailSent = application.internal_email_sent;
  const emailErrors: string[] = [];

  if (!applicantEmailSent) {
    const result = await sendEmail(resendApiKey, `uk-partner-applicant-${application.id}`, {
      from: emailFrom,
      to: [application.email],
      reply_to: internalEmail,
      subject: "You're on the ZeepUp UK table",
      text: `Hi ${application.first_name},\n\nYour partner-interest application for ${application.trading_name} has landed safely with ZeepUp UK. We'll review your setup and contact you with the next onboarding step.\n\nApplication reference: ${application.id}\n\nZeepUp UK`,
      html: buildApplicantEmail(application),
    });
    applicantEmailSent = result.ok;
    if (!result.ok) emailErrors.push(`applicant:${result.status}`);
  }

  if (!internalEmailSent) {
    try {
      const attachments = await buildInternalAttachments(application, supabase);
      const partnerLabel = application.partner_type === "home_chef" ? "home chef" : "chef/venue";
      const result = await sendEmail(resendApiKey, `uk-partner-internal-${application.id}`, {
        from: emailFrom,
        to: [internalEmail],
        reply_to: application.email,
        subject: `NEW UK partner registration - ${partnerLabel}`,
        text: `New ZeepUp UK partner application\n\nTrading name: ${application.trading_name}\nApplicant: ${application.first_name} ${application.last_name}\nEmail: ${application.email}\nPhone: ${application.phone}\nTown / city: ${application.town_city}\nLocal authority: ${application.local_authority}\nReference: ${application.id}\nSubmitted: ${formatSubmittedAt(application.submitted_at)}\n\nThe completed form PDF and all uploaded documents are attached.`,
        html: buildInternalEmail(application),
        attachments,
      });
      internalEmailSent = result.ok;
      if (!result.ok) emailErrors.push(`internal:${result.status}`);
    } catch (error) {
      console.error("UK partner email attachment preparation failed.", {
        applicationId: application.id,
        message: error instanceof Error ? error.message : "unknown_error",
      });
      emailErrors.push("internal:attachment_failed");
    }
  }

  const { error: emailStatusError } = await supabase
    .from("uk_partner_registrations")
    .update({
      applicant_email_sent: applicantEmailSent,
      internal_email_sent: internalEmailSent,
      email_last_error: emailErrors.length ? emailErrors.join(",") : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", application.id);
  if (emailStatusError) {
    console.error("UK partner email status update failed.", { code: emailStatusError.code });
  }

  if (!applicantEmailSent || !internalEmailSent) {
    console.error("UK partner email delivery failed.", { applicationId: application.id, emailErrors });
    return jsonResponse(origin, {
      ok: false,
      error: "email_failed",
      application_id: application.id,
    }, 502);
  }

  return jsonResponse(origin, {
    ok: true,
    status: "registered",
    application_id: application.id,
  });
});
