const shimmer = `
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
`;

if (!document.getElementById('skeleton-style')) {
  const s = document.createElement('style');
  s.id = 'skeleton-style';
  s.textContent = shimmer;
  document.head.appendChild(s);
}

const base = {
  background: 'linear-gradient(90deg, #1a1a28 25%, #22223a 50%, #1a1a28 75%)',
  backgroundSize: '600px 100%',
  animation: 'shimmer 1.4s infinite linear',
  borderRadius: 6,
};

export function SkeletonBox({ w = '100%', h = 16, radius = 6, style = {} }) {
  return <div style={{ ...base, width: w, height: h, borderRadius: radius, flexShrink: 0, ...style }} />;
}

export function SkeletonText({ lines = 3, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox key={i} h={13} w={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonCard({ style = {} }) {
  return (
    <div style={{ background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.25rem', ...style }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <SkeletonBox w={40} h={40} radius={20} />
        <div style={{ flex: 1 }}>
          <SkeletonBox h={14} w="60%" style={{ marginBottom: 6 }} />
          <SkeletonBox h={11} w="40%" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div style={{ background: '#0e0e17', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.1rem 1.25rem' }}>
      <SkeletonBox h={11} w="50%" style={{ marginBottom: 10 }} />
      <SkeletonBox h={28} w="70%" />
    </div>
  );
}

export function SkeletonGrid({ count = 4, Component = SkeletonCard, columns = 'repeat(auto-fill,minmax(240px,1fr))', gap = 14, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns},1fr)` : columns, gap }}>
      {children || Array.from({ length: count }).map((_, i) => <Component key={i} />)}
    </div>
  );
}

export function SkeletonRow({ style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #111', ...style }}>
      <SkeletonBox w={36} h={36} radius={18} />
      <div style={{ flex: 1 }}>
        <SkeletonBox h={13} w="50%" style={{ marginBottom: 5 }} />
        <SkeletonBox h={10} w="30%" />
      </div>
      <SkeletonBox h={13} w={60} />
    </div>
  );
}
