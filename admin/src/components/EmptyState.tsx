import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { FiInbox } from 'react-icons/fi';

export default function EmptyState({ title, description, icon: Icon = FiInbox, compact = false, children }: {
  title: string;
  description: string;
  icon?: IconType;
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`empty-state${compact ? ' empty-state-compact' : ''}`} role="status">
      <span className="empty-state-icon"><Icon aria-hidden="true" /></span>
      <div className="empty-state-copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {children && <div className="empty-state-action">{children}</div>}
    </div>
  );
}
