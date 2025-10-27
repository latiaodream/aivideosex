import React, { useEffect } from 'react'
import { ConfigProvider } from 'antd-mobile'
import { useTranslation } from 'react-i18next'

// Components
import ErrorBoundary from './components/ErrorBoundary'
import SearchApp from './components/SearchApp'

function App() {
  const { i18n } = useTranslation()
  // Ensure default language is Spanish on first load
  useEffect(() => {
    const key = 'ai-video-search-lang'
    const current = localStorage.getItem(key)
    if (!current) {
      try { localStorage.setItem(key, 'es-ES') } catch (e) {}
      if (i18n.language !== 'es-ES') {
        i18n.changeLanguage('es-ES')
      }
    }
  }, [])
  useEffect(() => {
    const lang = i18n.language || 'zh-CN'
    const metaMap = {
      'zh-CN': {
        title: 'AI成人视频搜索',
        desc: 'AI成人视频搜索 - 智能视频内容发现平台'
      },
      'en-US': {
        title: 'AI Adult Video Search',
        desc: 'AI Adult Video Search - Intelligent video discovery platform'
      },
      'es-ES': {
        title: 'Búsqueda de Video para Adultos con IA',
        desc: 'Búsqueda de video para adultos con IA - Plataforma inteligente de descubrimiento'
      },
      'pt-PT': {
        title: 'Pesquisa de Vídeos Adultos com IA',
        desc: 'Pesquisa de vídeos adultos com IA - Plataforma inteligente de descoberta'
      },
      'ja-JP': {
        title: 'AIアダルト動画検索',
        desc: 'AIアダルト動画検索 - インテリジェントな動画発見プラットフォーム'
      },
      'ko-KR': {
        title: 'AI 성인 영상 검색',
        desc: 'AI 성인 영상 검색 - 지능형 영상 탐색 플랫폼'
      }
    }

    const metaConfig = metaMap[lang] || metaMap['en-US']
    const { title, desc } = metaConfig
    document.title = title
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', desc)

    // Open Graph tags
    const ensureOg = (property, content) => {
      let tag = document.querySelector(`meta[property="${property}"]`)
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('property', property)
        document.head.appendChild(tag)
      }
      tag.setAttribute('content', content)
    }
    ensureOg('og:title', title)
    ensureOg('og:description', desc)
  }, [i18n.language])
  
  return (
    <ErrorBoundary>
      <ConfigProvider>
        <div className="app-container">
          <SearchApp />
        </div>
      </ConfigProvider>
    </ErrorBoundary>
  )
}

export default App
