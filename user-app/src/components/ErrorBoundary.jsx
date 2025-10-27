import React from 'react'
import { Button } from 'antd-mobile'
import { withTranslation } from 'react-i18next'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const lang = this.props.i18n?.language
      const d = (zh, en, es) => (lang === 'en-US' ? en : (lang === 'es-ES' ? es : zh))
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '40px 20px',
          background: 'var(--primary-bg)',
          color: 'var(--text-primary)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '60px',
            marginBottom: '20px'
          }}>
            💥
          </div>
          
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 0 16px 0',
            color: 'var(--text-primary)'
          }}>
            {this.props.t('errorBoundary.title', d('应用出现错误','An error occurred','Se produjo un error'))}
          </h2>
          
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            lineHeight: '1.5',
            margin: '0 0 30px 0',
            maxWidth: '300px'
          }}>
            {this.props.t('errorBoundary.description', d('抱歉，应用遇到了意外错误。请尝试刷新页面。','Sorry, something went wrong. Please try refreshing the page.','Lo sentimos, algo salió mal. Intente actualizar la página.'))}
          </p>
          
          <Button 
            color='primary'
            onClick={this.handleReload}
            style={{
              background: 'var(--accent-gradient)',
              border: 'none',
              fontWeight: '600',
              minWidth: '120px'
            }}
          >
            {this.props.t('errorBoundary.reload', d('刷新页面','Refresh Page','Actualizar página'))}
          </Button>
          
          {process.env.NODE_ENV === 'development' && (
            <details style={{
              marginTop: '40px',
              padding: '20px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              maxWidth: '80%',
              textAlign: 'left'
            }}>
              <summary style={{
                cursor: 'pointer',
                fontWeight: 'bold',
                marginBottom: '10px',
                color: 'var(--text-primary)'
              }}>
                {this.props.t('errorBoundary.detailsDev', d('错误详情 (开发模式)','Error Details (Dev)','Detalles del error (Dev)'))}
              </summary>
              <pre style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default withTranslation()(ErrorBoundary)
