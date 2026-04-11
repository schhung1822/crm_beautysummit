import type {
  FormTemplateConfig,
  FormTemplateHiddenField,
  FormTemplateInputField,
  FormTemplateQuestion,
  FormTemplateQuestionType,
  FormTemplateRecord,
  FormTemplateStyle,
} from "@/lib/form-template/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_TEMPLATE_NAME = "Event Check-in";

const DEFAULT_FORM_TEMPLATE_CONFIG: FormTemplateConfig = {
  webhookUrl: "",
  templateStyle: "default",
  theme: {
    bg: "#fde7f1",
    card: "rgba(255,255,255,.92)",
    primary: "#ec5fa4",
    primary2: "#f7a1c4",
    text: "#7a2b4b",
    muted: "#b06a8c",
    ring: "rgba(236,95,164,.35)",
  },
  header: {
    headingImageUrl: "",
    headingAlt: "Event heading",
    descText: "We cordially invite",
    titleText: "Check in su kien",
    subtitleText: "",
  },
  infoEvent: {
    topText: "Welcome to the event",
    headline: "Beauty Summit",
    motto: "Check in and receive your gift",
    organizerText: "Organized by the host team",
    bottomText: "See you at the event",
    logo1Url: "",
    logo2Url: "",
  },
  behavior: {
    readUserIdFromQueryKey: "userid",
    source: "zalo_webview_form",
    eventName: "",
  },
  fields: {
    full_name: { enabled: true, required: true, label: "Ho va ten", placeholder: "VD: Nguyen Van A" },
    phone: { enabled: true, required: true, label: "So dien thoai", placeholder: "VD: 0912345678" },
    email: { enabled: true, required: false, label: "Email", placeholder: "VD: abc@email.com" },
    hidden: {
      user_id: { enabled: true },
      city: { enabled: false },
      role: { enabled: false },
      clinic: { enabled: false },
      full_name_nv: { enabled: false },
    },
  },
  questions: [],
  footer: {
    gradientFrom: "#f7a1c4",
    gradientTo: "#ec5fa4",
    textColor: "#ffffff",
    dressCodeTitle: "DRESS CODE",
    dressCodeDesc: "Please wear formal attire",
    dressDots: {
      white: "#ffffff",
      whitePink: "#fbcfe8",
      pink: "#ec4899",
      black: "#111827",
    },
    dateDay: "20",
    dateMonth: "12",
    dateYear: "2024",
    timeText: "14:00 - 17:00",
    placeName: "New World Hotel",
    placeLine1: "76 Le Lai, Ben Thanh",
    placeLine2: "District 1, Ho Chi Minh City",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function getBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function getTemplateStyle(value: unknown, fallback: FormTemplateStyle): FormTemplateStyle {
  return value === "starry" || value === "default" ? value : fallback;
}

function getQuestionType(value: unknown): FormTemplateQuestionType | undefined {
  return value === "text" || value === "email" || value === "tel" || value === "textarea" || value === "select"
    ? value
    : undefined;
}

function mergeInputField(input: unknown, fallback: FormTemplateInputField): FormTemplateInputField {
  if (!isRecord(input)) {
    return fallback;
  }

  return {
    enabled: getBoolean(input.enabled, fallback.enabled),
    required: getBoolean(input.required, fallback.required),
    label: getString(input.label, fallback.label),
    placeholder: getString(input.placeholder, fallback.placeholder),
  };
}

function mergeHiddenFields(input: unknown, fallback: Record<string, FormTemplateHiddenField | undefined>) {
  const merged: Record<string, FormTemplateHiddenField | undefined> = { ...fallback };

  if (!isRecord(input)) {
    return merged;
  }

  for (const [key, value] of Object.entries(input)) {
    if (!isRecord(value)) {
      continue;
    }

    merged[key] = {
      enabled: getBoolean(value.enabled, merged[key]?.enabled ?? false),
    };
  }

  return merged;
}

function mergeQuestion(input: unknown, index: number): FormTemplateQuestion | null {
  if (!isRecord(input)) {
    return null;
  }

  const id = getString(input.id, `q${index + 1}`);
  const label = getString(input.label, `Question ${index + 1}`);

  return {
    id,
    label,
    enabled: getBoolean(input.enabled, true),
    required: getBoolean(input.required, false),
    type: getQuestionType(input.type),
    placeholder: typeof input.placeholder === "string" ? input.placeholder : undefined,
    options: Array.isArray(input.options)
      ? input.options.filter((item): item is string => typeof item === "string")
      : undefined,
  };
}

// eslint-disable-next-line complexity
function mergeConfig(rawConfig: unknown): FormTemplateConfig {
  if (!isRecord(rawConfig)) {
    return DEFAULT_FORM_TEMPLATE_CONFIG;
  }

  const theme = isRecord(rawConfig.theme) ? rawConfig.theme : {};
  const header = isRecord(rawConfig.header) ? rawConfig.header : {};
  const infoEvent = isRecord(rawConfig.infoEvent) ? rawConfig.infoEvent : {};
  const behavior = isRecord(rawConfig.behavior) ? rawConfig.behavior : {};
  const fields = isRecord(rawConfig.fields) ? rawConfig.fields : {};
  const hiddenFields = isRecord(fields.hidden) ? fields.hidden : undefined;
  const footer = isRecord(rawConfig.footer) ? rawConfig.footer : {};
  const questions = Array.isArray(rawConfig.questions)
    ? rawConfig.questions.map(mergeQuestion).filter((item): item is FormTemplateQuestion => item !== null)
    : DEFAULT_FORM_TEMPLATE_CONFIG.questions;

  return {
    webhookUrl: getString(rawConfig.webhookUrl, DEFAULT_FORM_TEMPLATE_CONFIG.webhookUrl),
    templateStyle: getTemplateStyle(rawConfig.templateStyle, DEFAULT_FORM_TEMPLATE_CONFIG.templateStyle ?? "default"),
    theme: {
      bg: getString(theme.bg, DEFAULT_FORM_TEMPLATE_CONFIG.theme.bg),
      card: getString(theme.card, DEFAULT_FORM_TEMPLATE_CONFIG.theme.card),
      primary: getString(theme.primary, DEFAULT_FORM_TEMPLATE_CONFIG.theme.primary),
      primary2: getString(theme.primary2, DEFAULT_FORM_TEMPLATE_CONFIG.theme.primary2),
      text: getString(theme.text, DEFAULT_FORM_TEMPLATE_CONFIG.theme.text),
      muted: getString(theme.muted, DEFAULT_FORM_TEMPLATE_CONFIG.theme.muted),
      ring: getString(theme.ring, DEFAULT_FORM_TEMPLATE_CONFIG.theme.ring),
    },
    header: {
      headingImageUrl:
        typeof header.headingImageUrl === "string"
          ? header.headingImageUrl
          : DEFAULT_FORM_TEMPLATE_CONFIG.header.headingImageUrl,
      headingAlt: getString(header.headingAlt, DEFAULT_FORM_TEMPLATE_CONFIG.header.headingAlt ?? ""),
      descText: getString(header.descText, DEFAULT_FORM_TEMPLATE_CONFIG.header.descText),
      titleText: getString(header.titleText, DEFAULT_FORM_TEMPLATE_CONFIG.header.titleText),
      subtitleText:
        typeof header.subtitleText === "string"
          ? header.subtitleText
          : DEFAULT_FORM_TEMPLATE_CONFIG.header.subtitleText,
    },
    infoEvent: {
      topText: getString(infoEvent.topText, DEFAULT_FORM_TEMPLATE_CONFIG.infoEvent.topText),
      headline: getString(infoEvent.headline, DEFAULT_FORM_TEMPLATE_CONFIG.infoEvent.headline),
      motto: getString(infoEvent.motto, DEFAULT_FORM_TEMPLATE_CONFIG.infoEvent.motto),
      organizerText: getString(infoEvent.organizerText, DEFAULT_FORM_TEMPLATE_CONFIG.infoEvent.organizerText),
      bottomText: getString(infoEvent.bottomText, DEFAULT_FORM_TEMPLATE_CONFIG.infoEvent.bottomText),
      logo1Url:
        typeof infoEvent.logo1Url === "string" ? infoEvent.logo1Url : DEFAULT_FORM_TEMPLATE_CONFIG.infoEvent.logo1Url,
      logo2Url:
        typeof infoEvent.logo2Url === "string" ? infoEvent.logo2Url : DEFAULT_FORM_TEMPLATE_CONFIG.infoEvent.logo2Url,
    },
    behavior: {
      readUserIdFromQueryKey:
        typeof behavior.readUserIdFromQueryKey === "string"
          ? behavior.readUserIdFromQueryKey
          : DEFAULT_FORM_TEMPLATE_CONFIG.behavior.readUserIdFromQueryKey,
      source: typeof behavior.source === "string" ? behavior.source : DEFAULT_FORM_TEMPLATE_CONFIG.behavior.source,
      eventName:
        typeof behavior.eventName === "string" ? behavior.eventName : DEFAULT_FORM_TEMPLATE_CONFIG.behavior.eventName,
    },
    fields: {
      full_name: mergeInputField(fields.full_name, DEFAULT_FORM_TEMPLATE_CONFIG.fields.full_name),
      phone: mergeInputField(fields.phone, DEFAULT_FORM_TEMPLATE_CONFIG.fields.phone),
      email: mergeInputField(fields.email, DEFAULT_FORM_TEMPLATE_CONFIG.fields.email),
      hidden: mergeHiddenFields(hiddenFields, DEFAULT_FORM_TEMPLATE_CONFIG.fields.hidden),
    },
    questions,
    footer: {
      gradientFrom: getString(footer.gradientFrom, DEFAULT_FORM_TEMPLATE_CONFIG.footer.gradientFrom),
      gradientTo: getString(footer.gradientTo, DEFAULT_FORM_TEMPLATE_CONFIG.footer.gradientTo),
      textColor: getString(footer.textColor, DEFAULT_FORM_TEMPLATE_CONFIG.footer.textColor),
      dressCodeTitle: getString(footer.dressCodeTitle, DEFAULT_FORM_TEMPLATE_CONFIG.footer.dressCodeTitle),
      dressCodeDesc: getString(footer.dressCodeDesc, DEFAULT_FORM_TEMPLATE_CONFIG.footer.dressCodeDesc),
      dressDots: {
        white: getString(
          isRecord(footer.dressDots) ? footer.dressDots.white : undefined,
          DEFAULT_FORM_TEMPLATE_CONFIG.footer.dressDots.white,
        ),
        whitePink: getString(
          isRecord(footer.dressDots) ? footer.dressDots.whitePink : undefined,
          DEFAULT_FORM_TEMPLATE_CONFIG.footer.dressDots.whitePink,
        ),
        pink: getString(
          isRecord(footer.dressDots) ? footer.dressDots.pink : undefined,
          DEFAULT_FORM_TEMPLATE_CONFIG.footer.dressDots.pink,
        ),
        black: getString(
          isRecord(footer.dressDots) ? footer.dressDots.black : undefined,
          DEFAULT_FORM_TEMPLATE_CONFIG.footer.dressDots.black,
        ),
      },
      dateDay: getString(footer.dateDay, DEFAULT_FORM_TEMPLATE_CONFIG.footer.dateDay),
      dateMonth: getString(footer.dateMonth, DEFAULT_FORM_TEMPLATE_CONFIG.footer.dateMonth),
      dateYear: getString(footer.dateYear, DEFAULT_FORM_TEMPLATE_CONFIG.footer.dateYear),
      timeText: getString(footer.timeText, DEFAULT_FORM_TEMPLATE_CONFIG.footer.timeText),
      placeName: getString(footer.placeName, DEFAULT_FORM_TEMPLATE_CONFIG.footer.placeName),
      placeLine1: getString(footer.placeLine1, DEFAULT_FORM_TEMPLATE_CONFIG.footer.placeLine1),
      placeLine2: getString(footer.placeLine2, DEFAULT_FORM_TEMPLATE_CONFIG.footer.placeLine2),
    },
  };
}

function parseIsActiveFlag(value: string | null): boolean {
  if (!value) {
    return true;
  }

  return !["0", "false", "inactive", "disabled"].includes(value.trim().toLowerCase());
}

function parseTemplateConfig(configJson: string | null): FormTemplateConfig {
  if (!configJson) {
    return DEFAULT_FORM_TEMPLATE_CONFIG;
  }

  try {
    return mergeConfig(JSON.parse(configJson));
  } catch (error) {
    console.error("Failed to parse form template config:", error);
    return DEFAULT_FORM_TEMPLATE_CONFIG;
  }
}

export async function getTemplateBySlug(slug: string): Promise<FormTemplateRecord | null> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return null;
  }

  try {
    const template = await prisma.formTemplate.findFirst({
      where: { slug: normalizedSlug },
    });

    if (!template) {
      return {
        slug: normalizedSlug,
        name: DEFAULT_TEMPLATE_NAME,
        isActive: true,
        config: DEFAULT_FORM_TEMPLATE_CONFIG,
      };
    }

    if (!parseIsActiveFlag(template.isActive)) {
      return null;
    }

    return {
      slug: template.slug ?? normalizedSlug,
      name: template.name ?? DEFAULT_TEMPLATE_NAME,
      isActive: true,
      config: parseTemplateConfig(template.configJson),
    };
  } catch (error) {
    console.error("Failed to load form template:", error);

    return {
      slug: normalizedSlug,
      name: DEFAULT_TEMPLATE_NAME,
      isActive: true,
      config: DEFAULT_FORM_TEMPLATE_CONFIG,
    };
  }
}

export async function ensureDefaultTemplate(slug: string): Promise<FormTemplateRecord | null> {
  return getTemplateBySlug(slug);
}
