import { useState } from 'react';
import { ChevronUp } from 'lucide-react';

export default function VoteButton({ votes = 0, hasVoted = false, onVote, disabled = false }) {
  const [animating, setAnimating] = useState(false);

  const handleClick = async () => {
    if (disabled || !onVote) return;
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
    await onVote();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium transition-all duration-150"
      style={{
        background:   hasVoted ? 'var(--accent-dim)' : 'var(--bg-hover)',
        border:       `1px solid ${hasVoted ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
        color:        hasVoted ? 'var(--accent)' : 'var(--text-secondary)',
        transform:    animating ? 'scale(0.9)' : 'scale(1)',
        cursor:       disabled ? 'not-allowed' : 'pointer',
        opacity:      disabled ? 0.5 : 1,
      }}
    >
      <ChevronUp size={14} strokeWidth={2} />
      <span>{votes}</span>
    </button>
  );
}
