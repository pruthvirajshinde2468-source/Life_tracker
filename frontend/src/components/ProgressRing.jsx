export default function ProgressRing({ percent = 0, color = '#6366f1', size = 80, strokeWidth = 7, children }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e1e35" strokeWidth={strokeWidth} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="progress-ring-track"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children || <span className="text-sm font-bold text-white">{Math.round(percent)}%</span>}
      </div>
    </div>
  );
}
