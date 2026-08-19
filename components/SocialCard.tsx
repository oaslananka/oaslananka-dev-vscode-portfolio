interface SocialCardProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  owner: string;
  host: string;
  labels?: string[];
}

export default function SocialCard({
  eyebrow,
  title,
  subtitle,
  owner,
  host,
  labels = [],
}: SocialCardProps) {
  const fontSize = title.length > 70 ? 50 : title.length > 42 ? 58 : 68;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d1117',
        color: '#f0f3f6',
        fontFamily: 'sans-serif',
        padding: '64px 72px',
        borderTop: '12px solid #f9826c',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 25,
          color: '#f9826c',
          fontFamily: 'monospace',
        }}
      >
        <span>{eyebrow}</span>
        <span style={{ color: '#8b949e' }}>{host}</span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          maxWidth: 1040,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize,
            fontWeight: 700,
            lineHeight: 1.12,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: 'flex',
              color: '#b1bac4',
              fontSize: 27,
              lineHeight: 1.35,
              marginTop: 22,
              maxWidth: 960,
            }}
          >
            {subtitle.length > 150 ? `${subtitle.slice(0, 147)}...` : subtitle}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#b1bac4',
          fontSize: 26,
        }}
      >
        <span>{owner}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          {labels.slice(0, 3).map((label) => (
            <span
              key={label}
              style={{
                display: 'flex',
                padding: '8px 14px',
                border: '1px solid #30363d',
                color: '#c9d1d9',
                fontFamily: 'monospace',
                fontSize: 20,
              }}
            >
              {label.length > 18 ? `${label.slice(0, 17)}...` : label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
