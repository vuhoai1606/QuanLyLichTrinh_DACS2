// Simple i18n System for multi-language support

class I18n {
  constructor() {
    this.currentLanguage = 'vi';
    this.translations = {};
    this.initialized = false;
  }

  // Initialize and load translations
  async init(language = null) {
    if (language) {
      this.currentLanguage = language;
    } else {
      // Try to get from localStorage or API
      this.currentLanguage = localStorage.getItem('language') || 'vi';
    }

    await this.loadTranslations(this.currentLanguage);
    this.initialized = true;
    return this;
  }

  // Load translation file
  async loadTranslations(lang) {
    try {
      const response = await fetch(`/locales/${lang}.json`);
      if (response.ok) {
        this.translations = await response.json();
        return true;
      }
    } catch (error) {
      console.error(`Failed to load translations for ${lang}:`, error);
    }
    return false;
  }

  // Get translation by key (e.g., "common.login", "tasks.addTask")
  t(key, defaultValue = '') {
    if (!this.initialized) {
      console.warn('i18n not initialized yet');
      return defaultValue || key;
    }

    const keys = key.split('.');
    let value = this.translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue || key;
      }
    }

    return value;
  }

  // Change language
  async changeLanguage(lang) {
    if (this.currentLanguage === lang) {
      return;
    }

    const loaded = await this.loadTranslations(lang);
    if (loaded) {
      this.currentLanguage = lang;
      localStorage.setItem('language', lang);
      
      // Update all elements with data-i18n attribute
      this.updatePageTranslations();
      
      // Trigger custom event for language change
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }
  }

  // Update all elements with data-i18n attribute
  updatePageTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translated = this.t(key);
      
      if (element.hasAttribute('data-i18n-placeholder')) {
        element.placeholder = translated;
      } else if (element.hasAttribute('data-i18n-title')) {
        element.title = translated;
      } else {
        element.textContent = translated;
      }
    });
  }

  // Get current language
  getLanguage() {
    return this.currentLanguage;
  }
}

// Create global instance
const i18n = new I18n();

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Get language from server settings if logged in
  try {
    const response = await fetch('/api/profile/settings', {
      credentials: 'same-origin'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.settings.language) {
        await i18n.init(data.settings.language);
      } else {
        await i18n.init();
      }
    } else {
      await i18n.init();
    }
  } catch (error) {
    console.error('Error loading language from server:', error);
    await i18n.init();
  }
  
  // Apply translations to page
  i18n.updatePageTranslations();
});

// Export for use in other scripts
window.i18n = i18n;
