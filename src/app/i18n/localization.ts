import { Injectable, computed, signal } from "@angular/core";
import {
  Diagnostic,
  LanguagePreference,
  MessageKey,
  Parameters,
  formatMessage,
  resolveLanguage,
  validPreference,
} from "./messages";
const storageKey = "azdo-sprint-timeline.language";
@Injectable({ providedIn: "root" })
export class Localization {
  readonly preference = signal<LanguagePreference>(this.savedPreference());
  private readonly culture = signal(navigator.language);
  readonly language = computed(() =>
    resolveLanguage(this.preference(), this.culture()),
  );
  constructor() {
    this.applyDocumentLanguage();
  }
  private savedPreference(): LanguagePreference {
    try {
      return validPreference(localStorage.getItem(storageKey));
    } catch {
      return "auto";
    }
  }
  setCulture(culture?: string) {
    if (culture) this.culture.set(culture);
    this.applyDocumentLanguage();
  }
  select(value: string) {
    this.preference.set(validPreference(value));
    try {
      localStorage.setItem(storageKey, this.preference());
    } catch {
      /* Storage may be blocked in an iframe. */
    }
    this.applyDocumentLanguage();
  }
  private applyDocumentLanguage() {
    document.documentElement.lang = this.language();
  }
  readonly t = (key: MessageKey, params?: Parameters) =>
    formatMessage({ key, params }, this.language());
  readonly format = (value: Diagnostic) =>
    formatMessage(value, this.language());
}
