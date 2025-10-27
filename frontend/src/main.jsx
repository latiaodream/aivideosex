import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import esES from 'antd/locale/es_ES'
import jaJP from 'antd/locale/ja_JP'
import koKR from 'antd/locale/ko_KR'
import ptPT from 'antd/locale/pt_PT'

import App from './App'
import i18n from './i18n'
import './index.css'
import { I18nextProvider, useTranslation } from 'react-i18next'

// Ant Design 语言映射
const antdLocales = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'es-ES': esES,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'pt-PT': ptPT
}

// 绑定 i18n.language，确保切换语言时 ConfigProvider 跟随变更
function AppWithProviders() {
  const { i18n: i18next } = useTranslation()
  const currentLocale = antdLocales[i18next.language] || zhCN

  return (
    <ConfigProvider
      locale={currentLocale}
      theme={{
        token: { colorPrimary: '#1890ff' },
        components: { Layout: { headerBg: '#fff', siderBg: '#fff' } }
      }}
    >
      <App />
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <AppWithProviders />
    </I18nextProvider>
  </React.StrictMode>
)
