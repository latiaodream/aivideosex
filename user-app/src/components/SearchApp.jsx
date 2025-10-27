import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'

import { Button, ImageUploader, Toast, CenterPopup, Modal, DotLoading } from 'antd-mobile'
import { useTranslation } from 'react-i18next'
import apiClient, { searchAPI, authAPI, planAPI, orderAPI, bannerAPI, reviewAPI, textBlockAPI, paymentsAPI } from '../utils/api'
import styles from './SearchApp.module.css'

const LANGUAGE_SUFFIX_MAP = {
  'zh-CN': 'zh',
  'en-US': 'en',
  'es-ES': 'es',
  'pt-PT': 'pt',
  'ja-JP': 'ja',
  'ko-KR': 'ko'
}

const LANGUAGE_FALLBACKS = {
  'es-ES': ['es', 'en'],
  'en-US': ['en', 'es', 'zh'],
  'zh-CN': ['zh', 'en'],
  'pt-PT': ['pt', 'en'],
  'ja-JP': ['ja', 'en'],
  'ko-KR': ['ko', 'en']
}

const normalizeLanguage = (lang = 'zh-CN') => {
  const value = (lang || '').toLowerCase()
  if (value.startsWith('en')) return 'en-US'
  if (value.startsWith('es')) return 'es-ES'
  if (value.startsWith('pt')) return 'pt-PT'
  if (value.startsWith('ja')) return 'ja-JP'
  if (value.startsWith('ko')) return 'ko-KR'
  return 'zh-CN'
}

const getLocalizedField = (record, baseKey, preferredLang) => {
  if (!record || !baseKey) return ''

  const targetLang = normalizeLanguage(preferredLang)
  const preferredSuffix = LANGUAGE_SUFFIX_MAP[targetLang]
  const fallbacks = LANGUAGE_FALLBACKS[targetLang] || [preferredSuffix, 'en']

  // 严格按当前语言+预设回退顺序，不再按记录自身 language 回退，避免西语界面出现中文
  const candidateSuffixes = []
  if (preferredSuffix) candidateSuffixes.push(preferredSuffix)
  fallbacks.forEach(s => { if (s && !candidateSuffixes.includes(s)) candidateSuffixes.push(s) })

  for (const suffix of candidateSuffixes) {
    const key = `${baseKey}_${suffix}`
    if (record[key]) return record[key]
  }
  return record[baseKey] || ''
}

const filterByLanguageStrict = (items, lang) => {
  if (!Array.isArray(items)) return []
  const normalized = normalizeLanguage(lang)
  return items.filter(item => normalizeLanguage(item?.language) === normalized)
}

const filterByLanguageFallback = (items, lang) => {
  if (!Array.isArray(items)) return []
  const normalized = normalizeLanguage(lang)
  const filtered = items.filter(item => {
    if (!item?.language) return true
    return normalizeLanguage(item.language) === normalized
  })
  return filtered.length > 0 ? filtered : items
}

export default function SearchApp() {
  const { t, i18n } = useTranslation()
  const d = (zh, en, es) => (i18n.language === 'en-US' ? en : (i18n.language === 'es-ES' ? es : zh))
  const currentLanguage = useMemo(() => normalizeLanguage(i18n.language), [i18n.language])
  const getBannerText = (banner, field) => getLocalizedField(banner, field, currentLanguage)
  const getReviewContent = (review) => getLocalizedField(review, 'content', currentLanguage)
  const getPlanName = (plan) => getLocalizedField(plan, 'name', currentLanguage) || plan?.name
  const getOrderPlanName = (order, fallbackPlan) => {
    if (!order) return fallbackPlan ? getPlanName(fallbackPlan) : '-'
    const suffix = LANGUAGE_SUFFIX_MAP[currentLanguage]
    if (order.planNames && suffix && order.planNames[suffix]) {
      return order.planNames[suffix]
    }
    if (order.plan && suffix) {
      const localized = getLocalizedField(order.plan, 'name', currentLanguage)
      if (localized) return localized
    }
    return order.planName || (fallbackPlan ? getPlanName(fallbackPlan) : '-')
  }
  const [uploadedImages, setUploadedImages] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0) // 当前推荐的套餐索引
  const [searchHistory, setSearchHistory] = useState([]) // 已使用的套餐记录
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false) // 显示升级提示
  const [user, setUser] = useState(null) // 用户信息
  const [plans, setPlans] = useState([]) // 从后台获取的套餐数据
  const [currentOrder, setCurrentOrder] = useState(null) // 当前订单
  const [isInitialized, setIsInitialized] = useState(false) // 防止重复初始化
  const [banners, setBanners] = useState([]) // 轮播图数据
  const [reviews, setReviews] = useState([]) // 评价数据
  const [textBlocks, setTextBlocks] = useState([]) // 文本区块数据
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0) // 当前轮播图索引
  const [isMobile, setIsMobile] = useState(false)
  const bannerIntervalRef = useRef(null) // 轮播图定时器
  const refreshIntervalRef = useRef(null) // 数据刷新定时器

  // 支付相关状态
  const [showPaymentModal, setShowPaymentModal] = useState(false) // 支付弹窗
  const [paymentChain, setPaymentChain] = useState('TRC20') // 支付链路

  // 结果弹窗状态
  const [showResultModal, setShowResultModal] = useState(false)
  const [resultData, setResultData] = useState(null) // { planName, text, html, link, image, video }

  const resultContinueResolverRef = useRef(null)
  const chainTimerRef = useRef(null)
  const paymentStatusTimerRef = useRef(null)
  const isPaymentCheckingRef = useRef(false)
  const continueAfterResult = () => {
    // 若有排队中的“下一档”定时器，立刻触发，无需等待

    if (chainTimerRef.current) {
      try { clearTimeout(chainTimerRef.current) } catch (e) {}
      chainTimerRef.current = null
      // 直接进入下一档付款
      const nextIndex = currentPlanIndex + 1
      if (nextIndex < plans.length) {
        const nextPlan = plans[nextIndex]
        setShowResultModal(false)
        setCurrentPlanIndex(nextIndex)
        setCurrentOrder(null)
        setShowPaymentModal(true)
        createPaymentOrder(nextPlan, paymentChain)
      } else {
        setShowResultModal(false)
      }
      return
    }
    setShowResultModal(false)
    if (resultContinueResolverRef.current) {
      try { resultContinueResolverRef.current() } catch (e) {}
      resultContinueResolverRef.current = null
    }
  }

  // 提示时长与串联等待（可按需调整）
  const TOAST_SUCCESS_MS = 10000         // “支付成功”提示时长（10秒）
  const TOAST_POSTPAY_MS = 10000         // “付费后提示语”展示时长（10秒）
  const CHAIN_DELAY_MS = 10000           // 串联到下一套餐的等待时长（10秒）

  // 自适应二维码尺寸（移动端优化）
  const qrSize = Math.min(240, Math.max(160, Math.floor((typeof window !== 'undefined' ? window.innerWidth : 320) * 0.7)))

  // 检索动效覆盖层（每一档均显示，内容按套餐变化）
  const [showSearchOverlay, setShowSearchOverlay] = useState(false)
  const [searchProgress, setSearchProgress] = useState(0)
  const [overlaySteps, setOverlaySteps] = useState([])
  const [overlayTitle, setOverlayTitle] = useState(t('overlay.generalTitle'))
  const [overlayGradient, setOverlayGradient] = useState('linear-gradient(90deg,#3b82f6,#8b5cf6)')
  const [overlayIcon, setOverlayIcon] = useState('🔎')
  // 飘评单条轮播控制（函数外，组件级）
  const [floatingIdx, setFloatingIdx] = useState(0)
  const [floatingTopIdx, setFloatingTopIdx] = useState(0)
  const floatingTops = ['15vh','25vh','35vh','20vh','30vh']
  useEffect(() => { setFloatingIdx(0); setFloatingTopIdx(0) }, [reviews])
  useEffect(() => {
    if (reviews.length === 0) return
    const durationMs = 20000
    const timer = setTimeout(() => {
      setFloatingIdx((i) => (i + 1) % reviews.length)
      setFloatingTopIdx((i) => (i + 1) % floatingTops.length)
    }, durationMs + 300)
    return () => clearTimeout(timer)
  }, [reviews, floatingIdx])

  const progressTimerRef = useRef(null)

  const getOverlayDesign = (code = 'GEN') => {
    const map = {
      ADV: {
        title: t('overlay.adv.title'), icon: '🔎',
        steps: [t('overlay.steps.parseImg'), t('overlay.steps.recallStd'), t('overlay.steps.filterCoarse'), t('overlay.steps.genPreview')],
        gradient: 'linear-gradient(90deg,#3b82f6,#8b5cf6)'
      },
      SUP: {
        title: t('overlay.sup.title'), icon: '⚡',
        steps: [t('overlay.steps.parseImg'), t('overlay.steps.multichannel'), t('overlay.steps.multimodal'), t('overlay.steps.boostRelevance'), t('overlay.steps.genPreview')],
        gradient: 'linear-gradient(90deg,#a855f7,#ec4899)'
      },
      ULT: {
        title: t('overlay.ult.title'), icon: '💎',
        steps: [t('overlay.steps.parseImg'), t('overlay.steps.deepScan'), t('overlay.steps.rerank'), t('overlay.steps.simFilter'), t('overlay.steps.qualityAssess'), t('overlay.steps.genPreview')],
        gradient: 'linear-gradient(90deg,#06b6d4,#3b82f6)'
      },
      SUPR: {
        title: t('overlay.supr.title'), icon: '👑',
        steps: [t('overlay.steps.fastLane'), t('overlay.steps.humanReview'), t('overlay.steps.highConfBackcheck'), t('overlay.steps.resultMerge'), t('overlay.steps.genPreview')],
        gradient: 'linear-gradient(90deg,#f59e0b,#ef4444)'
      },
      GEN: {
        title: t('overlay.generalTitle'), icon: '🔎',
        steps: [t('overlay.steps.parseUpload'), t('overlay.steps.extractSemantic'), t('overlay.steps.vectorRecall'), t('overlay.steps.rerank'), t('overlay.steps.simFilter'), t('overlay.steps.qualityAssess'), t('overlay.steps.genPreview')],
        gradient: 'linear-gradient(90deg,#3b82f6,#8b5cf6)'
      }
    }
    return map[code] || map.GEN
  }

  const beginSearchOverlay = (durationMs = 8000, design = getOverlayDesign()) => {
    return new Promise((resolve) => {
      const d = design || getOverlayDesign()
      setOverlayTitle(d.title)
      setOverlaySteps(d.steps)
      setOverlayGradient(d.gradient)
      setOverlayIcon(d.icon)
      try { document.body.style.overflow = 'hidden' } catch (e) {}
      setShowSearchOverlay(true)
      setSearchProgress(0)
      const start = Date.now()
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      progressTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - start
        const pct = Math.min(99, Math.floor((elapsed / durationMs) * 100))
        setSearchProgress(pct)
      }, 120)
      setTimeout(() => {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current)
        setSearchProgress(100)
        setShowSearchOverlay(false)
        try { document.body.style.overflow = '' } catch (e) {}
        resolve()
      }, durationMs)
    })
  }

  // 调试：观察支付弹窗状态变化
  useEffect(() => {
    console.log('[Payment] showPaymentModal =', showPaymentModal, 'currentOrder =', currentOrder)
  }, [showPaymentModal, currentOrder])
  useEffect(() => {
    console.log('[Payment] showPaymentModal =', showPaymentModal)
  }, [showPaymentModal])


  // 支付链选项
  const paymentChains = [
    {
      code: 'TRC20',
      name: 'TRON (TRC20)',
      shortName: 'TRC20',
      icon: '🟢',
      desc: t('chains.trc20.desc'),
      fee: '~1 USDT'
    },
    {
      code: 'BSC',
      name: 'BSC (BEP20)',
      shortName: 'BEP20',
      icon: '🟡',
      desc: t('chains.bsc.desc'),
      fee: '~0.5 USDT'
    }
  ]

  const currentPlan = useMemo(() => {
    if (!currentOrder) return null
    return plans.find(plan => plan.id === currentOrder.planId) || null
  }, [currentOrder, plans])

  const paymentChainInfo = paymentChains.find(chain => chain.code === paymentChain)

  // 文件上传引用
  const fileInputRef = useRef(null)

  // 组件加载时自动注册用户并获取套餐
  useEffect(() => {
    if (!isInitialized) {
      initializeApp()
    }
  }, [isInitialized])

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return
      setIsMobile(window.innerWidth <= 640)
    }
    handleResize()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  useEffect(() => {
    if (!isInitialized) return

    const syncLocalizedContent = async () => {
      try {
        const lang = currentLanguage
        const [bannersData, reviewsData] = await Promise.all([
          bannerAPI.getPublicBanners(lang),
          reviewAPI.getPublicReviews(lang)
        ])
        setBanners(filterByLanguageFallback(bannersData, lang))
        setReviews(filterByLanguageStrict(reviewsData, lang))
      } catch (error) {
        console.error('更新多语言内容失败:', error)
      }
    }

    syncLocalizedContent()
  }, [currentLanguage, isInitialized])

  // 定时刷新数据（每30秒检查一次轮播图更新）
  useEffect(() => {
    if (isInitialized) {
      refreshIntervalRef.current = setInterval(() => {
        refreshBannersData()
      }, 30000) // 30秒刷新一次

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [isInitialized, currentLanguage])

  // 轮播图自动切换
  useEffect(() => {
    if (banners.length > 1) {
      bannerIntervalRef.current = setInterval(() => {
        setCurrentBannerIndex(prev => (prev + 1) % banners.length)
      }, 5000) // 5秒切换一次

      return () => {
        if (bannerIntervalRef.current) {
          clearInterval(bannerIntervalRef.current)
        }
      }
    }
  }, [banners.length])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (bannerIntervalRef.current) {
        clearInterval(bannerIntervalRef.current)
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  // 避免 Modal/Toast 等导致 body 锁滚动
  useEffect(() => {
    const shouldUnlock = showUpgradePrompt || showPaymentModal
    if (shouldUnlock) {
      try {
        document.body.style.overflow = 'auto'
      } catch (e) {}
    } else {
      try {
        document.body.style.overflow = ''
      } catch (e) {}
    }
    return () => {
      try { document.body.style.overflow = '' } catch (e) {}
    }
  }, [showUpgradePrompt, showPaymentModal])

  // 刷新轮播图数据
  const refreshBannersData = async () => {
    try {
      const lang = currentLanguage
      const bannersData = await bannerAPI.getPublicBanners(lang)
      const localized = filterByLanguage(bannersData, lang)
      console.log('获取到轮播图数据:', localized)
      console.log('轮播图数量:', localized?.length || 0)
      console.log('当前轮播图状态:', banners)
      if (JSON.stringify(localized) !== JSON.stringify(banners)) {
        setBanners(localized)
        console.log('轮播图数据已更新:', localized)
        if (localized && localized.length > 0) {
          console.log('第一个轮播图图片URL:', localized[0].imageUrl)
        }
      } else {
        console.log('轮播图数据无变化')
      }
    } catch (error) {
      console.error('刷新轮播图数据失败:', error)
    }
  }

  // 根据套餐代码获取功能描述
  const getFeaturesForPlan = (code) => {
    const featureMap = {
      'ADV': [
        t('plans.adv.f1', d('基础AI搜索','Basic AI search','Búsqueda IA básica')),
        t('plans.adv.f2', d('标准匹配精度','Standard matching accuracy','Precisión de coincidencia estándar')),
        t('plans.adv.f3', d('100点数包','100-credit pack','Paquete de 100 créditos')),
      ],
      'SUP': [
        t('plans.sup.f1', d('高精度搜索','High-precision search','Búsqueda de alta precisión')),
        t('plans.sup.f2', d('多模态检索','Multimodal retrieval','Búsqueda multimodal')),
        t('plans.sup.f3', d('250点数包','250-credit pack','Paquete de 250 créditos')),
      ],
      'ULT': [
        t('plans.ult.f1', d('最优质通道','Premium channel','Canal premium')),
        t('plans.ult.f2', d('多模型重排','Multi-model re-ranking','Reordenamiento multi-modelo')),
        t('plans.ult.f3', d('400点数包','400-credit pack','Paquete de 400 créditos')),
      ],
      'SUPR': [
        t('plans.supr.f1', d('人工辅助','Human-assisted','Asistencia humana')),
        t('plans.supr.f2', d('专线检索','Dedicated fast-lane','Vía rápida dedicada')),
        t('plans.supr.f3', d('700点数包','700-credit pack','Paquete de 700 créditos')),
      ],
    }
    return featureMap[code] || [ t('plans.defaultFeature', d('智能搜索功能','Smart search','Búsqueda inteligente')) ]
  }

  const initializeApp = async () => {
    if (isInitialized) return // 防止重复初始化

    try {
      // 1. 自动注册用户
      const userData = await authAPI.autoRegister()
      setUser(userData)
      console.log('用户注册成功:', userData)

      // 2. 获取套餐列表
      const plansData = await planAPI.getPublicPlans()
      // 生产/标准模式下按后端公开接口返回为准，不做额外合并
      const plansWithFeatures = plansData.map(plan => ({
        ...plan,
        features: getFeaturesForPlan(plan.code)
      }))

      setPlans(plansWithFeatures)
      console.log('套餐获取成功（已合并后台提示语）:', plansWithFeatures)

      // 3. 获取轮播图数据
      const bannerLanguage = currentLanguage
      const bannersData = await bannerAPI.getPublicBanners(bannerLanguage)
      const localizedBanners = filterByLanguageFallback(bannersData, bannerLanguage)
      setBanners(localizedBanners)
      console.log('轮播图获取成功:', localizedBanners)
      console.log('轮播图数量:', localizedBanners?.length || 0)
      if (localizedBanners && localizedBanners.length > 0) {
        console.log('第一个轮播图:', localizedBanners[0])
        console.log('第一个轮播图图片URL:', localizedBanners[0].imageUrl)
      }

      // 4. 获取评价数据（按当前语言从服务端筛选，并在前端再次过滤兜底）
      const reviewsData = await reviewAPI.getPublicReviews(currentLanguage)
      const localizedReviews = filterByLanguage(reviewsData, currentLanguage)
      setReviews(localizedReviews)
      console.log('评价获取成功:', localizedReviews)

      // 5. 获取文本区块
      const textBlocksData = await textBlockAPI.getPublicTextBlocks()
      setTextBlocks(textBlocksData)
      console.log('文本区块获取成功:', textBlocksData)

      setIsInitialized(true)
    } catch (error) {
      console.error('初始化失败:', error)
      Toast.show(t('toast.serviceUnavailable'))
      // 不使用离线模式，等待后端恢复
      setIsInitialized(false)
    }
  }

  const handleImageSearch = async () => {
    console.log('[Search] 点击开始搜索，uploadedImages.length =', uploadedImages.length)
    if (uploadedImages.length === 0) {
      Toast.show(t('toast.uploadFirst'))
      return
    }

    // 立即打开支付弹窗
    setShowPaymentModal(true)
    Toast.show(t('toast.openingPayment'))
    setIsSearching(true)

    try {
      if (plans.length > 0 && user) {
        const firstPlan = plans[0]
        setCurrentPlanIndex(0)
        console.log('准备创建订单，套餐:', firstPlan)
        const order = await createPaymentOrder(firstPlan)
        console.log('订单创建结果:', order)
        if (!order) {
          Toast.show(t('toast.orderCreateFailed'))
        }
      } else {
        console.log('套餐或用户信息缺失')
        Toast.show(t('toast.initializing'))
      }
    } finally {
      setIsSearching(false)
    }
  }

  const handleUpgradeConfirm = async () => {
    setShowUpgradePrompt(false)
    const plan = plans[currentPlanIndex]

    // 直接选择推荐套餐
    await handlePlanSelect(plan)
    setShowPaymentModal(true)
  }

  const handleUpgradeCancel = () => {
    setShowUpgradePrompt(false)
    // 显示所有套餐选择
    setShowPaymentModal(true)
    Toast.show(t('toast.choosePlan'))
  }

  // 原生文件上传处理
  const handleNativeFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    console.log('原生文件上传:', file)

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      Toast.show(t('toast.chooseImage'))
      return
    }

    // 检查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      Toast.show(t('toast.fileTooLarge'))
      return
    }

    // 读取文件
    const reader = new FileReader()
    reader.onload = () => {
      const imageData = {
        url: reader.result
      }
      console.log('图片读取成功:', imageData.url?.substring(0, 100) + '...')
      setUploadedImages([imageData])
      Toast.show(t('toast.uploadSuccess'))
    }
    reader.onerror = (error) => {
      console.error('图片读取失败:', error)
      Toast.show(t('toast.imageReadFailed'))
    }
    reader.readAsDataURL(file)
  }

  // 点击上传区域
  const handleUploadZoneClick = () => {
    console.log('点击上传区域，触发文件选择')
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // 拖拽上传处理
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      console.log('拖拽上传文件:', file)

      // 模拟文件输入事件
      const event = {
        target: {
          files: [file]
        }
      }
      handleNativeFileUpload(event)
    }
  }

  const handleImageUpload = async (file) => {
    console.log('开始上传图片:', file)

    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = () => {
          console.log('图片读取成功:', reader.result?.substring(0, 100) + '...')
          Toast.show(t('toast.uploadSuccess'))
          resolve({
            url: reader.result
          })
        }

        reader.onerror = (error) => {
          console.error('图片读取失败:', error)
          Toast.show(t('toast.imageReadFailed'))
          reject(error)
        }

        reader.readAsDataURL(file)
      })
    } catch (error) {
      console.error('上传图片错误:', error)
      Toast.show(t('toast.uploadFailed'))
      throw error
    }
  }

  const handleUpgrade = () => {
    // 点击升级按钮时显示升级提示
    if (currentPlanIndex < plans.length - 1) {
      setCurrentPlanIndex(currentPlanIndex + 1)
      setShowUpgradePrompt(true)
    } else {
      Toast.show(t('toast.alreadyTopPlan'))
    }
  }

  // 获取搜索按钮文案
  const getSearchButtonText = () => {
    if (plans.length === 0) return t('common.loading', d('加载中...','Loading...','Cargando...'))
    if (uploadedImages.length === 0) return t('toast.uploadFirst', d('请先上传图片','Please upload an image','Primero suba una imagen'))
    return t('search.startButton', d('🔍 开始AI智能搜索','🔍 Start AI Search','🔍 Iniciar búsqueda con IA'))
  }

  // 处理支付链路切换
  const handleChainChange = async (newChain) => {
    setPaymentChain(newChain)

    // 如果有当前订单，重新创建订单以获取新的支付地址
    if (currentOrder && plans[currentPlanIndex]) {
      const plan = plans[currentPlanIndex]
      Toast.show(t('toast.switchingNetwork'))
      const newOrder = await createPaymentOrder(plan, newChain)
      if (!newOrder) {
        // 如果创建失败，恢复原来的链路
        setPaymentChain(currentOrder.chain)
        Toast.show(t('toast.switchFailed'))
      }
    }
  }

  // 处理套餐选择
  const handlePlanSelect = async (plan) => {
    setCurrentPlanIndex(plans.findIndex(p => p.id === plan.id))
    const order = await createPaymentOrder(plan)
    // 简化提示，避免中间多余的Toast
  }

  // 从套餐对象里提取“后台设置的付费后展示模板/结果”（JSON优先，兼容老字段）
  const extractPlanResult = (plan) => {
    if (!plan) return null
    const preferredLang = normalizeLanguage(i18n?.language || 'zh-CN')

    // 1) afterPay JSON 优先（支持字符串或对象，自动匹配语言并提供兜底）
    const afterPayRaw = getLocalizedField(plan, 'afterPay', preferredLang)
      || plan.afterPay
      || plan.afterpay

    let afterPay = null
    if (afterPayRaw) {
      try {
        afterPay = typeof afterPayRaw === 'string' ? JSON.parse(afterPayRaw) : afterPayRaw
      } catch (e) {
        // 忽略JSON解析错误，走兜底字段
        afterPay = null
      }
    }

    if (afterPay && (afterPay.title || afterPay.text || afterPay.subtitle || afterPay.image || afterPay.video || afterPay.link)) {
      return {
        title: afterPay.title,
        subtitle: afterPay.subtitle,
        text: afterPay.text,
        bullets: Array.isArray(afterPay.bullets) ? afterPay.bullets : null,
        image: afterPay.image,
        video: afterPay.video,
        link: afterPay.link,
        cta: afterPay.cta,
        nextUpsellShow: afterPay.nextUpsell?.show !== false, // 默认true
      }
    }

    // 2) 兼容老字段（文本/HTML/链接/图片/视频）+ 语言兜底（优先当前语言，取不到则回退其它语种）
    const textFallbacks = [
      getLocalizedField(plan, 'postpay', preferredLang),
      getLocalizedField(plan, 'upsell', preferredLang),
      getLocalizedField(plan, 'result', preferredLang),
      getLocalizedField(plan, 'resultText', preferredLang),
      plan.postpay_zh,
      plan.postpay_en,
      plan.postpay_es,
      plan.resultText,
      plan.result
    ]
    const candidates = {
      html: ['resultHtml', 'result_html'],
      link: ['resultUrl', 'result_url', 'demoUrl'],
      image: ['resultImage', 'result_image'],
      video: ['resultVideo', 'result_video'],
    }
    const pick = (keys) => keys.map(k => plan[k]).find(v => v !== undefined && v !== null && v !== '')
    const primaryText = textFallbacks.find(Boolean)
    const rd = {
      text: primaryText,
      html: pick(candidates.html),
      link: pick(candidates.link),
      image: pick(candidates.image),
      video: pick(candidates.video),
      upsell: getLocalizedField(plan, 'upsell', preferredLang) || null,
    }
    if (!rd.text && !rd.html && !rd.link && !rd.image && !rd.video) return null
    return rd
  }


  // 创建订单
  const createPaymentOrder = async (plan, chain = paymentChain) => {
    if (!user) {
      Toast.show(t('toast.userLoading'))
      return null
    }

    if (!plan) return null

    setShowPaymentModal(true)
    setCurrentOrder(null)

    try {
      const orderData = await orderAPI.createOrder(user.userId, plan.id, chain)
      setCurrentOrder(orderData.order)
      console.log('订单创建成功:', orderData.order)
      return orderData.order
    } catch (error) {
      console.error('创建订单失败:', error)
      Toast.show(t('toast.orderCreateFailed'))
      setShowPaymentModal(false)
      return null
    }
  }

  const clearPaymentPolling = () => {
    if (paymentStatusTimerRef.current) {
      clearInterval(paymentStatusTimerRef.current)
      paymentStatusTimerRef.current = null
    }
  }

  // 支付成功后：展示提示与结果，并自动串行下一套餐；最后开始搜索
  const checkPaymentStatus = async (showPendingToast = false) => {
    if (!currentOrder || isPaymentCheckingRef.current) return

    isPaymentCheckingRef.current = true
    try {
      let statusData = await orderAPI.getOrderStatus(currentOrder.orderNo)
      let order = statusData.order

      if (!['confirmed', 'credited', 'expired'].includes(order.status)) {
        try { await paymentsAPI.forceCheck(currentOrder.orderNo) } catch (e) {}
        for (let i = 0; i < 4; i++) {
          await new Promise((r) => setTimeout(r, 700))
          statusData = await orderAPI.getOrderStatus(currentOrder.orderNo)
          order = statusData.order
          if (['confirmed', 'credited', 'expired'].includes(order.status)) break
        }
      }

      if (order.status === 'confirmed' || order.status === 'credited') {
        clearPaymentPolling()
        setShowPaymentModal(false)

        const plan = plans[currentPlanIndex]
        const rd = extractPlanResult(plan)

        const hasNext = currentPlanIndex + 1 < plans.length
        const shouldChain = rd ? rd.nextUpsellShow !== false : true

        if (hasNext && shouldChain) {
          const design = getOverlayDesign(plan?.code)
          await beginSearchOverlay(8000, design)
          if (rd) {
            setResultData({ planName: getPlanName(plan), ...rd })
            setShowResultModal(true)
          }

          chainTimerRef.current = setTimeout(async () => {
            try {
              setShowResultModal(false)
              const nextIndex = currentPlanIndex + 1
              const nextPlan = plans[nextIndex]
              setCurrentPlanIndex(nextIndex)
              setCurrentOrder(null)
              setShowPaymentModal(true)
              await createPaymentOrder(nextPlan, paymentChain)
            } catch (e) {
              console.error('进入下一套餐失败：', e)
              Toast.show(t('toast.nextPlanFailed'))
            } finally {
              chainTimerRef.current = null
            }
          }, CHAIN_DELAY_MS)
        } else {
          setCurrentOrder(null)
          const design = getOverlayDesign(plan?.code)
          await beginSearchOverlay(8000, design)
          setTimeout(() => {
            performActualSearch()
          }, 50)
        }
      } else if (order.status === 'expired') {
        clearPaymentPolling()
        setShowPaymentModal(false)
        setCurrentOrder(null)
        Toast.show(t('toast.orderExpired'))
      } else if (showPendingToast) {
        Toast.show(t('toast.paymentNotDetected'))
      }
    } catch (error) {
      console.error('检查支付状态失败:', error)
      Toast.show(t('toast.checkPaymentFailed'))
    } finally {
      isPaymentCheckingRef.current = false
    }
  }

  useEffect(() => {
    clearPaymentPolling()
    if (!currentOrder?.orderNo) return

    checkPaymentStatus()
    paymentStatusTimerRef.current = setInterval(() => {
      checkPaymentStatus()
    }, 4000)

    return () => {
      clearPaymentPolling()
    }
  }, [currentOrder?.orderNo])

  useEffect(() => () => clearPaymentPolling(), [])

  // 执行真正的搜索
  const performActualSearch = async () => {
    if (uploadedImages.length === 0) {
      Toast.show(t('toast.uploadFirst'))
      return
    }

    const currentPlan = plans[currentPlanIndex]
    setIsSearching(true)

    try {
      const imageData = uploadedImages[0].url
      // 同步展示动效与发起搜索，至少显示8秒
      const pSearch = searchAPI.imageSearch(imageData, {
        userId: user?.userId,
        planId: currentPlan.id
      })
      await beginSearchOverlay(8000)
      const result = await pSearch

      console.log('搜索结果:', result)

      if (result.success && result.resultCount > 0) {
        // 有结果 - 仅记录与后续展示，避免重复Toast干扰体验
        setSearchHistory([...searchHistory, { plan: currentPlan, success: true, resultCount: result.resultCount }])
      } else {
        // 无结果
        setSearchHistory([...searchHistory, { plan: currentPlan, success: false }])
        // 保留失败提醒
        Toast.show(t('toast.noResult'))
      }
    } catch (error) {
      Toast.show(t('toast.searchFailed'))
      console.error('搜索错误:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // 模拟支付（测试用）
  // 轮播图手动切换
  const handleBannerChange = (index) => {
    setCurrentBannerIndex(index)
    // 重置自动切换定时器
    if (bannerIntervalRef.current) {
      clearInterval(bannerIntervalRef.current)
      bannerIntervalRef.current = setInterval(() => {
        setCurrentBannerIndex(prev => (prev + 1) % banners.length)
      }, 5000)
    }
  }

  // 获取文本区块内容
  const getTextBlock = (key) => {
    return textBlocks.find(block => block.key === key)
  }

  // 生成付款 URI（用于二维码和复制），尽量带上金额
  const getPaymentUri = (chain, toAddress, amount) => {
    const amt = Number(amount)
    if (!toAddress) return ''
    if ((chain || '').toUpperCase() === 'BSC' || (chain || '').toUpperCase() === 'BEP20') {
      // EIP-681 token transfer on BSC (chainId 56), USDT contract 18 decimals
      const usdtBsc = '0x55d398326f99059fF775485246999027B3197955'
      const wei = BigInt(Math.round(amt * 1e18)).toString()
      return `ethereum:${usdtBsc}@56/transfer?address=${toAddress}&uint256=${wei}`
    }
    // TRON TRC20 USDT (contract base58)
    const usdtTron = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    // Many wallets accept tron:<to>?amount=...&token=TRC20&contract=...
    return `tron:${toAddress}?amount=${amt}&token=TRC20&contract=${usdtTron}`
  }

  // 渲染星级
  const renderStars = (stars) => {
    return Array(5).fill(0).map((_, index) => (
      <span key={index} className={index < stars ? styles.starFilled : styles.starEmpty}>
        ★
      </span>
    ))
  }

  // 获取评价来源角标
  const getSourceBadge = (sourceType) => {
    const badges = {
      demo: t('badge.demo'),
      beta: t('badge.beta'),
      real: t('badge.real')
    }
    return badges[sourceType] || t('badge.unknown')
  }


  return (
    <div className={styles.searchApp}>
      {/* 右上角语言选择 */}
      <div style={{ position: 'fixed', top: 8, right: 8, zIndex: 10003, background: 'rgba(0,0,0,0.45)', borderRadius: 18, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#fff', fontSize: 12 }}>🌐</span>
        <select
          value={i18n.language}
          onChange={(e) => { const lang = e.target.value; try { localStorage.setItem('ai-video-search-lang', lang) } catch (e) {}; i18n.changeLanguage(lang) }}
          style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', fontSize: 12 }}
        >
          <option value="zh-CN">🇨🇳 简体中文</option>
          <option value="en-US">🇺🇸 English</option>
          <option value="es-ES">🇪🇸 Español</option>
          <option value="pt-PT">🇵🇹 Português</option>
          <option value="ja-JP">🇯🇵 日本語</option>
          <option value="ko-KR">🇰🇷 한국어</option>
        </select>
      </div>
      {/* 搜索动效覆盖层 */}
      {showSearchOverlay && createPortal(
        (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,7,18,0.72)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
            <div style={{ width: 'min(560px, 92vw)', borderRadius: 14, padding: 18, background: '#0b1220', color: '#e5e7eb', border: '1px solid rgba(148,163,184,0.2)', boxShadow: '0 10px 30px rgba(0,0,0,.35)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <DotLoading color='primary' />
                <div style={{ fontWeight: 600 }}>{overlayIcon} {overlayTitle}</div>
              </div>
              <div style={{ marginTop: 10, height: 8, background: '#1f2937', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: `${searchProgress}%`, height: '100%', background: overlayGradient, transition: 'width .12s linear' }} />
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#93a3b8' }}>{overlaySteps[Math.min(Math.max(overlaySteps.length-1,0), Math.floor((searchProgress/100)*(overlaySteps.length||1)))]}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>{t('overlay.eta', { seconds: 8 })}</div>
            </div>
          </div>
        ),
        document.body
      )}
      {/* 飘屏评论：一次只飘一个，顺序轮播 */}
      {reviews.length > 0 && createPortal(
        <div className={styles.floatingReviews}>
          {(() => {
            const review = reviews[floatingIdx % reviews.length]
            const top = floatingTops[floatingTopIdx % floatingTops.length]
            return (
              <div
                key={review.id}
                className={styles.floatingReview}
                style={{ top, animation: 'floatingSlideRightToLeft 20s linear 1 forwards' }}
              >
                <div className={styles.floatingReviewIcon}>⭐</div>
                <div className={styles.floatingReviewContent}>
                  <div className={styles.floatingReviewHeader}>
                    <span className={styles.floatingReviewName}>{review.displayName}</span>
                    <div className={styles.floatingStars}>{renderStars(review.stars)}</div>
                  </div>
                  <div className={styles.floatingReviewText}>
                    {(() => {
                      const preview = getReviewContent(review)
                      if (!preview) return ''
                      return preview.length > 45 ? `${preview.slice(0, 45)}...` : preview
                    })()}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>,
        document.body
      )}

      {/* 轮播图区域 */}
      {banners.length > 0 ? (
        <div className={styles.bannerSection}>
          <div className={styles.bannerContainer}>
            {banners.map((banner, index) => {
              console.log(`渲染轮播图 ${index}:`, banner.imageUrl)
              const title = getBannerText(banner, 'title') || t('home.title', d('AI成人视频搜索', 'AI Adult Video Search', 'Búsqueda de Video AI para Adultos'))
              const description = getBannerText(banner, 'desc') || t('home.subtitle', d('智能视频内容发现平台', 'Intelligent Video Content Discovery', 'Plataforma inteligente de descubrimiento de videos'))
              const ctaText = getBannerText(banner, 'ctaText')

              return (
                <div
                  key={banner.id}
                  className={`${styles.bannerSlide} ${index === currentBannerIndex ? styles.bannerActive : ''}`}
                  style={{ backgroundImage: `url(${banner.imageUrl})` }}
                >
                  <div className={styles.bannerOverlay}>
                    <div className={styles.bannerContent}>
                      {title && <h2 className={styles.bannerTitle}>{title}</h2>}
                      {description && <p className={styles.bannerDesc}>{description}</p>}
                      {ctaText && banner.ctaLink && (
                        <Button
                          className={styles.bannerCta}
                          onClick={() => window.open(banner.ctaLink, '_blank')}
                        >
                          {ctaText}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* 轮播图指示器 */}
            <div className={styles.bannerIndicators}>
              {banners.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.bannerIndicator} ${index === currentBannerIndex ? styles.bannerIndicatorActive : ''}`}
                  onClick={() => handleBannerChange(index)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', background: '#f5f5f5', margin: '20px 0' }}>
          <p>{t('home.bannersLoading', d('轮播图加载中...','Loading banners...','Cargando banners...'))} (banners.length: {banners.length})</p>
        </div>
      )}

      {/* Hero营销区域 */}
      <div className={styles.heroSection}>
        <div className={styles.heroBackground}></div>
        <div className={styles.heroContent}>
          <div className={styles.logoIcon}>🔍</div>
          <h1 className={styles.mainTitle}>{t('home.heroTitle', d('全球最强AI成人视频搜索引擎','The Most Powerful AI Adult Video Search Engine','El motor de búsqueda de video para adultos con IA más potente'))}</h1>
          <p className={styles.heroSubtitle}>{t('home.heroSubtitle','革命性视觉AI技术 • 10亿+视频资源库 • 毫秒级精准匹配')}</p>

          {/* 数据化指标 */}
          <div className={styles.statsSection}>
            <div className={styles.stat}>
              <div className={styles.statNumber}>{t('home.stats.usersNumber', d('500万+','5M+','5M+'))}</div>
              <div className={styles.statLabel}>{t('home.statUsers', d('全球用户','Global Users','Usuarios globales'))}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>99.9%</div>
              <div className={styles.statLabel}>{t('footer.stats.accuracy', d('识别准确率','Accuracy','Precisión'))}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>{t('home.stats.dailyNumber', d('100万+','1M+','1M+'))}</div>
              <div className={styles.statLabel}>{t('home.stats.daily', d('日处理量','Daily volume','Volumen diario'))}</div>
            </div>
          </div>

          {/* 信任标识 */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>{t('home.trustBadge1', d('🏆 好莱坞制片公司指定','🏆 Trusted by Hollywood studios','🏆 Con la confianza de estudios de Hollywood'))}</div>
            <div className={styles.trustBadge}>{t('home.trustBadge2', d('🛡️ 企业级安全保障','🛡️ Enterprise-grade security','🛡️ Seguridad de nivel empresarial'))}</div>
            <div className={styles.trustBadge}>{t('home.trustBadge3', d('⚡ 独创深度学习算法','⚡ Proprietary deep learning','⚡ Aprendizaje profundo propio'))}</div>
          </div>
        </div>
      </div>


      {/* 主搜索区域 */}


      {/* 顶部运维工具已移除（避免暴露调试入口） */}

      <div className={styles.searchSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('home.sectionTitle', d('立即体验AI成人视频搜索','Experience AI Adult Video Search Now','Prueba ahora la búsqueda de video para adultos con IA'))}</h2>
          <p className={styles.sectionSubtitle}>{t('home.sectionSubtitle', d('上传任意图片，AI将为您找到最相似的视频内容','Upload any image and we will find the most similar videos','Sube cualquier imagen y encontraremos los videos más similares'))}</p>
        </div>

        <div className={styles.uploadCard}>
          <div className={styles.uploadHeader}>
            <h3 className={styles.uploadTitle}>{t('home.uploadTitle', d('🔍 智能图片识别搜索','🔍 Intelligent Image Search','🔍 Búsqueda inteligente por imagen'))}</h3>
            <p className={styles.uploadSubtitle}>{t('home.uploadSubtitle', d('支持 JPG、PNG、WebP 格式，最大 10MB • 毫秒级AI分析','Supports JPG/PNG/WebP, up to 10MB • Millisecond AI analysis','Compatible con JPG/PNG/WebP, hasta 10MB • Análisis de IA en milisegundos'))}</p>
          </div>

          <div className={styles.uploadArea}>
            {/* 原生文件上传 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleNativeFileUpload}
              style={{ display: 'none' }}
            />

            {/* 显示已上传的图片 */}
            {uploadedImages.length > 0 ? (
              <div className={styles.uploadedImageContainer}>
                <img
                  src={uploadedImages[0].url}
                  alt={t('home.uploadedImageAlt','上传的图片')}
                  className={styles.uploadedImage}
                />
                <div className={styles.imageActions}>
                  <Button
                    size="small"
                    color="danger"
                    onClick={() => {
                      setUploadedImages([])
                      Toast.show(t('toast.imageDeleted'))
                    }}
                  >
                    {t('common.deleteImage', d('删除图片','Delete Image','Eliminar imagen'))}
                  </Button>
                  <Button
                    size="small"
                    color="primary"
                    onClick={handleUploadZoneClick}
                  >
                  {t('home.reupload','重新上传')}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={styles.uploadZone}
                onClick={handleUploadZoneClick}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className={styles.uploadIcon}>📷</div>
                <div className={styles.uploadText}>
                  <p className={styles.uploadMainText}>{t('home.uploadClickOrDrag','点击或拖拽上传图片')}</p>
                  <p className={styles.uploadHintText}>{t('home.uploadFlow', d('🧠 深度AI分析 → 🔍 精准匹配 → 🎯 即时结果','🧠 Deep AI Analysis → 🔍 Precise Match → 🎯 Instant Result','🧠 Análisis IA profundo → 🔍 Coincidencia precisa → 🎯 Resultado al instante'))}</p>
                </div>
              </div>
            )}

            {/* 备用：antd-mobile ImageUploader */}
            <div style={{ display: 'none' }}>
              <ImageUploader
                value={uploadedImages}
                onChange={(files) => {
                  console.log('ImageUploader onChange:', files)
                  setUploadedImages(files)
                }}
                upload={handleImageUpload}
                multiple={false}
                maxCount={1}
                className={styles.imageUploader}
                accept="image/*"
                onDelete={(item) => {
                  console.log('删除图片:', item)
                  return true
                }}
                beforeUpload={(file) => {
                  console.log('beforeUpload:', file)
                  return file
                }}
              />
            </div>
          </div>

          <Button
            color='primary'
            size='large'
            onClick={handleImageSearch}
            loading={isSearching}
            disabled={uploadedImages.length === 0}
            className={styles.searchButton}
            block
          >
            {isSearching ? t('search.searching', d('🔍 AI深度分析中...','🔍 AI analyzing...','🔍 IA analizando...')) : getSearchButtonText()}
          </Button>

          {/* 搜索提示 */}
          <div className={styles.searchHints}>
            <div className={styles.searchHint}>{t('search.hint1', d('💡 支持人物、场景、物体等多种内容识别','💡 Recognizes people, scenes and objects','💡 Reconoce personas, escenas y objetos'))}</div>
            <div className={styles.searchHint}>{t('search.hint2', d('⭐ 成功率高达99.9%，已服务500万+用户','⭐ 99.9% success rate, trusted by 5M+ users','⭐ 99.9% de éxito, 5M+ usuarios'))}</div>
          </div>
        </div>
      </div>

      {/* 核心技术优势区域 */}
      <div className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('features.title', d('为什么选择我们？','Why choose us?','¿Por qué elegirnos?'))}</h2>
          <p className={styles.sectionSubtitle}>{t('home.sectionSubtitle1', d('领先全球的AI视频识别技术，为您提供无与伦比的搜索体验','World-leading AI video recognition delivering unmatched search experience','Tecnología líder de reconocimiento de video con IA, experiencia de búsqueda incomparable'))}</p>
        </div>

        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🧠</div>
            <h3 className={styles.featureTitle}>{t('features.title1', d('深度神经网络','Deep neural networks','Redes neuronales profundas'))}</h3>
            <p className={styles.featureDesc}>{t('features.desc1', d('采用最新Transformer架构，能够理解复杂视觉语义，识别准确率高达99.9%','Latest Transformer architecture understands complex semantics with up to 99.9% accuracy','Arquitectura Transformer que entiende semántica compleja con hasta 99.9% de precisión'))}</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h3 className={styles.featureTitle}>{t('features.title2', d('毫秒级响应','Millisecond response','Respuesta en milisegundos'))}</h3>
            <p className={styles.featureDesc}>{t('features.desc2', d('分布式GPU集群加速，平均响应时间小于50ms，比竞品快10倍以上','Distributed GPU clusters, avg. response < 50ms, 10x faster','Clústeres GPU distribuidos, respuesta < 50ms, 10x más rápido'))}</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🌍</div>
            <h3 className={styles.featureTitle}>{t('features.title3', d('海量数据库','Massive database','Base de datos masiva'))}</h3>
            <p className={styles.featureDesc}>{t('features.desc3', d('覆盖全球主流平台10亿+视频资源，每日新增100万+高质量内容','1B+ videos across platforms, 1M+ new contents daily','Más de 1B videos, +1M contenidos diarios'))}</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🛡️</div>
            <h3 className={styles.featureTitle}>{t('features.title4', d('企业级安全','Enterprise-grade security','Seguridad de nivel empresarial'))}</h3>
            <p className={styles.featureDesc}>{t('features.desc4', d('采用端到端加密，符合GDPR/SOC2标准，保护您的隐私和数据安全','End-to-end encryption, GDPR/SOC2 compliant','Cifrado de extremo a extremo, cumple GDPR/SOC2'))}</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🎯</div>
            <h3 className={styles.featureTitle}>{t('features.title5', d('多模态识别','Multimodal recognition','Reconocimiento multimodal'))}</h3>
            <p className={styles.featureDesc}>{t('features.desc5', d('同时分析图像、音频、文本多种特征，实现全方位精准匹配','Analyzes image/audio/text features for precise matching','Analiza imagen/audio/texto para coincidencia precisa'))}</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🚀</div>
            <h3 className={styles.featureTitle}>{t('features.title6', d('持续进化','Continuous improvement','Mejora continua'))}</h3>
          <p className={styles.featureDesc}>{t('home.featureDesc1', d('AI模型每日自动优化学习，搜索精度和速度持续提升','AI models auto-improve daily, boosting accuracy and speed','Los modelos de IA mejoran a diario, aumentando precisión y velocidad'))}</p>
          </div>
        </div>
      </div>

      {/* 成功案例区域 */}
      <div className={styles.casesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('cases.title', d('全球顶级企业都在使用','Used by top global companies','Usado por empresas líderes mundiales'))}</h2>
          <p className={styles.sectionSubtitle}>{t('home.sectionSubtitle2', d('已获得全球500万+专业用户信赖，处理搜索请求超过10亿次','Trusted by 5M+ users, over 1B searches processed','Con la confianza de 5M+ usuarios, más de 1B búsquedas procesadas'))}</p>
        </div>

        <div className={styles.casesGrid}>
          <div className={styles.caseCard}>
            <div className={styles.caseIcon}>🎬</div>
            <h4 className={styles.caseTitle}>{t('cases.case1.title', d('好莱坞制片公司','Hollywood Studios','Estudios de Hollywood'))}</h4>
            <p className={styles.caseDesc}>{t('cases.case1.desc', d('每日使用我们的AI技术检索版权素材，效率提升300%，节省制作成本数百万美元','Uses our AI daily for rights clearance, +300% efficiency, saving millions','Usa nuestra IA a diario para derechos, +300% eficiencia, ahorra millones'))}</p>
          </div>

          <div className={styles.caseCard}>
            <div className={styles.caseIcon}>📺</div>
            <h4 className={styles.caseTitle}>{t('cases.case2.title', d('全球流媒体平台','Global Streaming Platform','Plataforma de streaming global'))}</h4>
            <p className={styles.caseDesc}>{t('cases.case2.desc', d('采用我们的技术优化内容推荐算法，用户观看时长增长45%，订阅转化率提升60%','Optimized recommendations; +45% watch time, +60% conversions','Recomendaciones optimizadas; +45% tiempo de visualización, +60% conversiones'))}</p>
          </div>

          <div className={styles.caseCard}>
            <div className={styles.caseIcon}>🛡️</div>
            <h4 className={styles.caseTitle}>{t('cases.case3.title', d('内容审核机构','Content Moderation','Agencias de moderación'))}</h4>
            <p className={styles.caseDesc}>{t('cases.case3.desc', d('使用我们的AI快速识别违规内容，审核效率提升500%，准确率达到99.8%','Detects violations rapidly; +500% efficiency, 99.8% accuracy','Detecta violaciones rápidamente; +500% eficiencia, 99.8% precisión'))}</p>
          </div>
        </div>
      </div>

      {/* 用户评价区域 */}
      <div className={styles.reviewsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('reviews.title', d('用户真实评价','Real User Reviews','Opiniones reales de usuarios'))}</h2>
          <p className={styles.sectionSubtitle}>{t('reviews.subtitle', d('来看看其他用户怎么说','See what other users say','Mira lo que opinan otros usuarios'))}</p>
        </div>

        <div className={styles.reviewsGrid}>
          {reviews.slice(0, 6).map((review) => (
            <div key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewAvatar}>
                  {review.avatarUrl ? (
                    <img src={review.avatarUrl} alt={review.displayName} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>{review.displayName[0]}</div>
                  )}
                </div>
                <div className={styles.reviewUser}>
                  <div className={styles.reviewName}>
                    {review.displayName}
                    {review.verified && (
                      <span className={styles.verifiedBadge}>
                        ✓{t('reviews.verified', d('已验证','Verified','Verificado'))}
                      </span>
                    )}
                  </div>
                  <div className={styles.reviewMeta}>
                    <div className={styles.reviewStars}>{renderStars(review.stars)}</div>
                    <div className={styles.reviewSource}>{getSourceBadge(review.sourceType)}</div>
                  </div>
                </div>
              </div>
              <div className={styles.reviewContent}>
                {getReviewContent(review)}
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* 常见问题解答 */}
      <div className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('faq.title', d('常见问题解答','Frequently Asked Questions','Preguntas frecuentes'))}</h2>
          <p className={styles.sectionSubtitle}>{t('faq.subtitle', d('解答您关心的问题','Answers to common questions','Respuestas a las dudas frecuentes'))}</p>
        </div>

        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>{t('faq.q1', d('🤔 搜索准确率真的有99.9%吗？','🤔 Is the 99.9% accuracy real?','🤔 ¿Es real el 99.9% de precisión?'))}</h4>
            <p className={styles.faqAnswer}>{t('faq.a1', d('是的！我们采用最新的深度学习技术，经过全球5亿+图片训练，在标准测试集上达到99.9%的准确率。实际使用中，对于清晰的图片，准确率通常都在95%以上。','Yes! Powered by state-of-the-art deep learning trained on 500M+ images, achieving 99.9% on standard benchmarks. In real scenarios with clear images, accuracy is typically 95%+.','¡Sí! Con tecnología de última generación entrenada en 500M+ imágenes, 99.9% en benchmarks. En uso real con imágenes claras, suele superar el 95%.'))}</p>
          </div>

          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>{t('faq.q2', d('⚡ 为什么搜索速度这么快？','⚡ Why is it so fast?','⚡ ¿Por qué es tan rápido?'))}</h4>
            <p className={styles.faqAnswer}>{t('faq.a2', d('我们在全球部署了数百台GPU服务器，采用先进的分布式计算架构。图片上传后会被并行处理，通常在50毫秒内就能返回结果。','We deploy hundreds of GPU servers worldwide with advanced distributed computing. Images are processed in parallel and results often return within 50ms.','Desplegamos cientos de servidores GPU globalmente con cómputo distribuido. Las imágenes se procesan en paralelo y suelen devolver resultados en 50 ms.'))}</p>
          </div>

          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>{t('faq.q3', d('🛡️ 我的隐私安全吗？','🛡️ Is my privacy safe?','🛡️ ¿Mi privacidad está a salvo?'))}</h4>
            <p className={styles.faqAnswer}>{t('faq.a3', d('绝对安全！我们采用端到端加密，上传的图片仅用于AI分析，不会被存储或分享。符合GDPR、CCPA等国际隐私保护标准。','Absolutely. We use end-to-end encryption. Uploaded images are used only for AI analysis and are not stored or shared. Compliant with GDPR/CCPA.','Absolutamente. Usamos cifrado de extremo a extremo. Las imágenes se usan sólo para análisis y no se almacenan ni comparten. Cumple GDPR/CCPA.'))}</p>
          </div>

          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>{t('faq.q4', d('💰 为什么要收费？','💰 Why does it cost money?','💰 ¿Por qué tiene coste?'))}</h4>
            <p className={styles.faqAnswer}>{t('faq.a4', d('AI分析需要消耗大量计算资源。我们维护着全球最大的视频数据库，每天的服务器成本超过10万美元。合理的收费能保证服务的高质量和可持续性。','AI analysis consumes significant compute. We maintain one of the largest video databases and spend over $100k/day on servers. Reasonable pricing ensures quality and sustainability.','El análisis de IA consume muchos recursos. Mantenemos una gran base de videos y gastamos más de $100k/día. Un precio razonable asegura calidad y sostenibilidad.'))}</p>
          </div>

          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>{t('faq.q5', d('🔄 搜索失败了怎么办？','🔄 What if the search fails?','🔄 ¿Qué hago si falla la búsqueda?'))}</h4>
            <p className={styles.faqAnswer}>{t('faq.a5', d('如果某个套餐搜索失败，系统会自动推荐升级到更高级的套餐。更高级的套餐有更强的AI算法和更大的数据库，成功率更高。','If a plan fails, the system suggests upgrading to a higher plan with stronger models and larger databases for higher success rates.','Si un plan falla, el sistema sugiere subir a un plan superior con mejores modelos y bases más grandes para mayor éxito.'))}</p>
          </div>

          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>{t('faq.q6', d('📞 如何联系客服？','📞 How can I contact support?','📞 ¿Cómo contacto con soporte?'))}</h4>
            <p className={styles.faqAnswer}>{t('faq.a6', d('我们提供24/7在线客服支持。您可以通过页面右下角的客服按钮，或发邮件到 support@aisearch.com 联系我们。','We offer 24/7 support. Use the chat button or email support@aisearch.com.','Ofrecemos soporte 24/7. Use el chat o escriba a support@aisearch.com.'))}</p>
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <div className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerInfo}>
            <h3>{t('footer.brandTitle', d('🔍 AI成人视频搜索','🔍 AI Adult Video Search','🔍 Búsqueda de Video para Adultos con IA'))}</h3>
            <p>{t('footer.brandSubtitle', d('全球领先的AI视频识别技术 • 已服务500万+用户 • 日处理100万+搜索请求','World-leading AI video recognition • 5M+ users • 1M+ daily requests','Tecnología líder de reconocimiento de video • 5M+ usuarios • 1M+ solicitudes diarias'))}</p>
          </div>

          <div className={styles.footerStats}>
            <div className={styles.footerStat}>
              <div className={styles.footerStatNumber}>{t('footer.stats.videosNumber', d('10亿+','1B+','1B+'))}</div>
              <div className={styles.footerStatLabel}>{t('footer.stats.videos', d('视频资源','Video Library','Recursos de video'))}</div>
            </div>
            <div className={styles.footerStat}>
              <div className={styles.footerStatNumber}>99.9%</div>
              <div className={styles.footerStatLabel}>{t('footer.stats.accuracy', d('识别准确率','Accuracy','Precisión'))}</div>
            </div>
            <div className={styles.footerStat}>
              <div className={styles.footerStatNumber}>50ms</div>
              <div className={styles.footerStatLabel}>{t('footer.stats.responseTime', d('平均响应时间','Avg. Response Time','Tiempo de respuesta medio'))}</div>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>{t('footer.copyright', d('© 2025 AI成人视频搜索 - 全球领先的视频内容发现平台 | 专业 · 精准 · 高效','© 2025 AI Adult Video Search — Leading video content discovery | Professional · Precise · Efficient','© 2025 Búsqueda de Video para Adultos con IA — Plataforma líder de descubrimiento de contenido | Profesional · Preciso · Eficiente'))}</p>
        </div>
      </div>



      {/* 升级提示Modal */}
      {/* 已禁用的升级提示弹窗，避免与支付弹窗冲突 */}
      {/*
      <Modal
        visible={false}
        onClose={() => setShowUpgradePrompt(false)}
        title="选择搜索套餐"
        closeOnAction={false}
        closeOnMaskClick
        getContainer={() => document.body}
        showCloseButton
        disableBodyScroll={false}
        className={styles.upgradeModal}
      >
        <div style={{ padding: 16 }}>此弹窗已禁用</div>
      </Modal>
      */}

      {/* 支付弹窗（使用自定义覆盖层以确保显示可靠） */}
      {showPaymentModal && createPortal((console.log('[Payment] render overlay, currentOrder =', currentOrder),
        <div
          className={`${styles.payOverlay} ${isMobile ? styles.payOverlayMobile : ''}`}
        >
          <div
            className={`${styles.payPanel} ${isMobile ? styles.payPanelMobile : ''}`}
          >
            <div className={styles.payHeader}>
              <div>
                <div className={styles.payTitle}>{t('payment.usdtTitle', d('💳 USDT 支付','💳 USDT Payment','💳 Pago USDT'))}</div>
                <div className={styles.paySubtitle}>{t('payment.scanTip', d('请使用钱包扫码支付','Please scan with your wallet to pay','Escanee con su monedero para pagar'))}</div>
              </div>
              <button
                type='button'
                className={styles.payCloseButton}
                onClick={() => {
                  clearPaymentPolling()
                  setShowPaymentModal(false)
                  setCurrentOrder(null)
                }}
              >
                ×
              </button>
            </div>

            {currentOrder ? (
              <div>
                <div className={styles.paySummary}>
                  <div className={styles.paySummaryItem}>
                    <span className={styles.paySummaryLabel}>{t('payment.planName', d('套餐','Plan','Plan'))}</span>
                    <span className={styles.paySummaryValue}>{getOrderPlanName(currentOrder, currentPlan)}</span>
                  </div>
                  <div className={styles.paySummaryItem}>
                    <span className={styles.paySummaryLabel}>{t('pay.amountLabel', d('支付金额','Amount','Importe'))}</span>
                    <span className={styles.payAmountValue}><span>{currentOrder.amountUSDT}</span> USDT</span>
                  </div>
                </div>

                <div className={styles.payChainToggle}>
                  {paymentChains.map(chain => (
                    <button
                      key={chain.code}
                      type='button'
                      className={`${styles.payChainButton} ${paymentChain === chain.code ? styles.payChainButtonActive : ''}`}
                      onClick={() => handleChainChange(chain.code)}
                    >
                      <span className={styles.payChainIcon}>{chain.icon}</span>
                      <span className={styles.payChainText}>{chain.shortName || chain.name}</span>
                    </button>
                  ))}
                </div>

                <div className={styles.payQrCard}>
                  <div className={styles.payQrWrapper}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(getPaymentUri(currentOrder.chain || paymentChain, currentOrder.paymentAddress, currentOrder.amountUSDT))}`}
                      alt={t('payment.qrAlt', d('付款二维码','Payment QR','QR de pago'))}
                    />
                  </div>
                  <div className={styles.payQrTip}>
                    {t('payment.currentNetwork', d('当前网络：','Current Network:','Red actual:'))}
                    <span>{paymentChainInfo?.name || paymentChain}</span>
                  </div>
                </div>

                <div className={styles.payInfoCard}>
                  <div className={styles.payInfoLabel}>{t('payment.addressLabel', d('收款地址','Payment Address','Dirección de pago'))}</div>
                  <div className={styles.payInfoValue}>{currentOrder.paymentAddress}</div>
                  <div className={styles.payActionGrid}>
                    <Button
                      size={isMobile ? 'large' : 'small'}
                      color='primary'
                      fill='solid'
                      className={styles.payActionButton}
                      onClick={() => { navigator.clipboard.writeText(currentOrder.paymentAddress); Toast.show(t('toast.addressCopied')) }}
                    >
                      {t('common.copyAddress','复制地址')}
                    </Button>
                    <Button
                      size={isMobile ? 'large' : 'small'}
                      color='primary'
                      fill='outline'
                      className={styles.payActionButton}
                      onClick={() => { navigator.clipboard.writeText(String(currentOrder.amountUSDT)); Toast.show(t('pay.copiedAmount', d('金额已复制','Amount copied','Importe copiado'))) }}
                    >
                      {t('pay.copyAmount', d('复制金额','Copy Amount','Copiar importe'))}
                    </Button>
                  </div>
                </div>
                <div className={styles.payNotice + ' ' + styles.payNoticeWarn}>
                  {t(
                    'payment.detectDelayTip',
                    d(
                      '链上确认与到账检测通常需要 2–5 分钟，请耐心等待。如已付款未到账，请联系在线客服。',
                      'On-chain detection and confirmation typically take 2–5 minutes. Please wait. If paid but not credited, please contact support.',
                      'La detección en cadena y la confirmación suelen tardar 2–5 minutos. Por favor, espere. Si ya pagó y no se acredita, contacte al soporte.'
                    )
                  )}
                </div>

              </div>
            ) : (
              <div className={styles.payLoadingState}>
                {t('payment.creating', d('正在创建订单…','Creating order…','Creando orden…'))}
                <Button
                  size={isMobile ? 'large' : 'small'}
                  style={{ width: isMobile ? '100%' : 'auto' }}
                  onClick={() => plans[0] && createPaymentOrder(plans[0])}
                >
                  {t('payment.retryCreate', d('重试创建订单','Retry creating order','Reintentar crear orden'))}
                </Button>
              </div>
            )}
          </div>
        </div>), document.body)}

      {/* 结果弹窗（自定义覆盖层，始终居中）*/}
      {showResultModal && (
        <div className={styles.resultOverlay} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }} onClick={() => setShowResultModal(false)}>
          <div className={styles.resultPanel}
               style={{ width: 'min(520px, 92vw)', maxHeight: '80vh', overflowY: 'auto', background: '#0f172a', color: '#e5e7eb', borderRadius: 12, padding: 16, boxShadow: '0 6px 24px rgba(0,0,0,.3)' }}
               onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: '#fff' }}>{resultData?.title || t('result.titleDefault', d('🎯 套餐结果','🎯 Plan Result','🎯 Resultado del plan'))}</h3>
              {resultData?.subtitle && <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 6 }}>{resultData.subtitle}</div>}
              {resultData?.planName && <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{t('result.from', d('来自：','From:','De:'))}{resultData.planName}</div>}
            </div>

            {resultData?.text && (
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 12 }}>{resultData.text}</div>
            )}

            {resultData?.upsell && (
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#93c5fd', fontWeight: 600, marginBottom: 4 }}>{t('result.upgradeTitle', d('💡 升级建议','💡 Upgrade Suggestion','💡 Sugerencia de actualización'))}</div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{resultData.upsell}</div>
              </div>
            )}

            {Array.isArray(resultData?.bullets) && resultData.bullets.length > 0 && (
              <ul style={{ margin: '8px 0 12px', paddingLeft: 18 }}>
                {resultData.bullets.map((b, i) => (
                  <li key={i} style={{ lineHeight: 1.6 }}>{b}</li>
                ))}
              </ul>
            )}

            {resultData?.html && (
              <div style={{ marginBottom: 12, color: '#e5e7eb' }} dangerouslySetInnerHTML={{ __html: resultData.html }} />
            )}

            {resultData?.image && (
              <div style={{ marginBottom: 12 }}>
                <img src={resultData.image} alt="result" style={{ maxWidth: '100%', borderRadius: 8 }} />
              </div>
            )}

            {resultData?.video && (
              <div style={{ marginBottom: 12 }}>
                <video src={resultData.video} style={{ width: '100%', borderRadius: 8 }} controls />
              </div>
            )}

            {resultData?.link && (
              <div style={{ marginBottom: 12 }}>
                <a href={resultData.link} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>{resultData.link}</a>
              </div>
            )}

            {!resultData && (
              <div style={{ textAlign: 'center', color: '#999' }}>{t('result.empty', d('暂无结果配置','No result configured','Sin resultado configurado'))}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8, paddingBottom: 'env(safe-area-inset-bottom)' }}>
              {resultData?.cta?.text && resultData?.cta?.url ? (
                <Button size='small' color='primary' onClick={() => window.open(resultData.cta.url, '_blank')}>{resultData.cta.text}</Button>
              ) : null}
              <Button size='small' color='primary' onClick={continueAfterResult}>{resultData?.cta?.text && !resultData?.cta?.url ? resultData.cta.text : t('common.continue', d('继续','Continue','Continuar'))}</Button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
