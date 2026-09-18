export interface Country {
  id: string;
  code: string;
  name: string;
  isEnabled: boolean;
  currency: string;
  currencySymbol: string;
  phoneCode: string;
  phoneFormat: string;
  dateFormat: string;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
  languages?: CountryLanguage[];
}

export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isActive: boolean;
  createdAt: string;
}

export interface CountryLanguage {
  id: string;
  countryId: string;
  languageId: string;
  isDefault: boolean;
  createdAt: string;
  country?: Country;
  language?: Language;
}

export interface Translation {
  id: string;
  languageId: string;
  key: string;
  value: string;
  context: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CountryConfig {
  countryCode: string;
  name: string;
  enabled: boolean;
  languages: string[];
  defaultLanguage: string;
  currency: string;
  phoneFormat: string;
  dateFormat: string;
  timeZone: string;
}
