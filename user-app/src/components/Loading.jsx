import React from 'react'
import { SpinLoading } from 'antd-mobile'
import { useTranslation } from 'react-i18next'
import styles from './Loading.module.css'

export default function Loading({ text, size = 'medium', className = '' }) {
  const { t } = useTranslation()
  
  return (
    <div className={`${styles.loading} ${className}`}>
      <div className={styles.spinner}>
        <SpinLoading 
          color='var(--accent-blue)' 
          size={size}
        />
      </div>
      <div className={styles.text}>
        {text || t('common.loading')}
      </div>
    </div>
  )
}