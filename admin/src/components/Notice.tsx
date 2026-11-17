import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export default function Notice({ children, tone = 'error' }: { children: string; tone?: 'error' | 'success' }) {
  const Icon = tone === 'success' ? FiCheckCircle : FiAlertCircle;
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
