export type FormTemplateStyle = "default" | "starry";

export type FormTemplateQuestionType = "text" | "email" | "tel" | "textarea" | "select";

export interface FormTemplateInputField {
  enabled: boolean;
  required: boolean;
  label: string;
  placeholder: string;
}

export interface FormTemplateHiddenField {
  enabled: boolean;
}

export interface FormTemplateQuestion {
  id: string;
  label: string;
  enabled: boolean;
  required: boolean;
  type?: FormTemplateQuestionType;
  placeholder?: string;
  options?: string[];
}

export interface FormTemplateConfig {
  webhookUrl: string;
  templateStyle?: FormTemplateStyle;
  theme: {
    bg: string;
    card: string;
    primary: string;
    primary2: string;
    text: string;
    muted: string;
    ring: string;
  };
  header: {
    headingImageUrl?: string;
    headingAlt?: string;
    descText: string;
    titleText: string;
    subtitleText?: string;
  };
  infoEvent: {
    topText: string;
    headline: string;
    motto: string;
    organizerText: string;
    bottomText: string;
    logo1Url?: string;
    logo2Url?: string;
  };
  behavior: {
    readUserIdFromQueryKey?: string;
    source?: string;
    eventName?: string;
  };
  fields: {
    full_name: FormTemplateInputField;
    phone: FormTemplateInputField;
    email: FormTemplateInputField;
    hidden: {
      user_id?: FormTemplateHiddenField;
      city?: FormTemplateHiddenField;
      role?: FormTemplateHiddenField;
      clinic?: FormTemplateHiddenField;
      full_name_nv?: FormTemplateHiddenField;
      [key: string]: FormTemplateHiddenField | undefined;
    };
  };
  questions: FormTemplateQuestion[];
  footer: {
    gradientFrom: string;
    gradientTo: string;
    textColor: string;
    dressCodeTitle: string;
    dressCodeDesc: string;
    dressDots: {
      white: string;
      whitePink: string;
      pink: string;
      black: string;
    };
    dateDay: string;
    dateMonth: string;
    dateYear: string;
    timeText: string;
    placeName: string;
    placeLine1: string;
    placeLine2: string;
  };
}

export interface FormTemplateRecord {
  slug: string;
  name: string;
  isActive: boolean;
  config: FormTemplateConfig;
}
