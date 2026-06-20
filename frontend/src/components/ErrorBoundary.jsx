import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Intentionally suppressed: avoid console pollution in production
    void error; void info;
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a0a0f', padding: '2rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 16, opacity: .12, fontWeight: 900, color: '#ff6b6b', letterSpacing: '-4px' }}>
              500
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
              Đã xảy ra lỗi
            </div>
            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 28 }}>
              Ứng dụng gặp sự cố không mong muốn. Vui lòng thử lại hoặc về trang chủ.
            </div>
            {this.state.error?.message && (
              <div style={{
                background: '#13131f', border: '1px solid #2e2e44', borderRadius: 8,
                padding: '10px 14px', marginBottom: 24, fontFamily: 'monospace',
                fontSize: 12, color: '#ff6b6b', textAlign: 'left', wordBreak: 'break-all',
              }}>
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 28px', background: '#6C5CE7', border: 'none',
                borderRadius: 9, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Về trang chủ
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
