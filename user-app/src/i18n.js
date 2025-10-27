import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import language files
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'
import esES from './locales/es-ES.json'
import jaJP from './locales/ja-JP.json'
import koKR from './locales/ko-KR.json'
import ptPT from './locales/pt-PT.json'

const resources = {
  'zh-CN': { translation: zhCN },
  'en-US': { translation: enUS },
  'es-ES': { translation: esES },
  'ja-JP': { translation: jaJP },
  'ko-KR': { translation: koKR },
  'pt-PT': { translation: ptPT }
}

// Force default to Spanish on first load
const LANG_KEY = 'ai-video-search-lang'
try {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LANG_KEY, 'es-ES')
  }
} catch {}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es-ES',
    debug: process.env.NODE_ENV === 'development',

    // Language detection options: prioritize localStorage only
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: LANG_KEY,
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    react: {
      useSuspense: false,
    },
  })

export default i18n
