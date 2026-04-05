import { ToastType } from '../../hooks/useToast';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const styles: Record<ToastType, string> = {
  success: 'bg-secondary-500 text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-primary-500 text-white',
};

export function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div role="alert" className={`flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${styles[type]}`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-auto text-white/80 hover:text-white">✕</button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: { toasts: Array<{ id: string; message: string; type: ToastType }>; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => onRemove(t.id)} />
      ))}
    </div>
  );
}
