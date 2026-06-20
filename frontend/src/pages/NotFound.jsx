import { Link, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0f', flexDirection: 'column', gap: 0, padding: '2rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 16, opacity: .15, fontWeight: 900, color: '#6C5CE7', letterSpacing: '-4px' }}>
          404
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
          Trang không tìm thấy
        </div>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 32, lineHeight: 1.6 }}>
          Trang bạn đang tìm kiếm không tồn tại, đã bị xóa hoặc link bị sai.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 22px', background: '#13131f', border: '1px solid #2e2e44',
              borderRadius: 9, color: '#bbb', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}
          >
            ← Quay lại
          </button>
          <Link
            to="/"
            style={{
              padding: '10px 22px', background: '#6C5CE7', border: 'none',
              borderRadius: 9, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center',
            }}
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
