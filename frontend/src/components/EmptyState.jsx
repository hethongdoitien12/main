export default function EmptyState({ icon = '📭', title, body, action, actionLabel, actionHref }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center',
      gap: 12,
    }}>
      <div style={{ fontSize: 48, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#aaa' }}>{title}</div>
      {body && <div style={{ fontSize: 13, color: '#555', maxWidth: 280, lineHeight: 1.6 }}>{body}</div>}
      {(action || actionHref) && (
        actionHref
          ? <a href={actionHref} style={{
              marginTop: 8, padding: '9px 20px', background: 'linear-gradient(135deg,#6C5CE7,#a29bfe)',
              border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>{actionLabel || 'Bắt đầu'}</a>
          : <button onClick={action} style={{
              marginTop: 8, padding: '9px 20px', background: 'linear-gradient(135deg,#6C5CE7,#a29bfe)',
              border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>{actionLabel || 'Bắt đầu'}</button>
      )}
    </div>
  );
}
