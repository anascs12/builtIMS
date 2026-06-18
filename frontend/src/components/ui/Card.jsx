const PADDING = { sm: 'p-3', md: 'p-5', lg: 'p-7' };

export default function Card({ children, padding = 'md', hover = false, className = '', style }) {
  return (
    <div
      className={`card ${PADDING[padding] || 'p-5'} ${hover ? 'card-hover cursor-pointer' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
