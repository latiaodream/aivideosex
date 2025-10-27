import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// 导入语言文件
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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    
    // 支持的语言
    supportedLngs: ['zh-CN', 'en-US', 'es-ES', 'ja-JP', 'ko-KR', 'pt-PT'],
    
    // 语言检测配置
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    interpolation: {
      escapeValue: false
    },
    
    // 嵌套分隔符
    keySeparator: '.',
    nsSeparator: false
  })

export default i18n

// 语言选项配置
export const languageOptions = [
  { value: 'zh-CN', label: '简体中文', icon: '🇨🇳' },
  { value: 'en-US', label: 'English', icon: '🇺🇸' },
  { value: 'es-ES', label: 'Español', icon: '🇪🇸' },
  { value: 'ja-JP', label: '日本語', icon: '🇯🇵' },
  { value: 'ko-KR', label: '한국어', icon: '🇰🇷' },
  { value: 'pt-PT', label: 'Português', icon: '🇵🇹' }
]