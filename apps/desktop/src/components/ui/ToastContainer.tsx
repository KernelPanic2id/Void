import { useToast } from '../../context/ToastContext';
import { UserPlus, UserMinus, Info } from 'lucide-react';

const iconMap = {
    join: <UserPlus size={14} className="text-cyan-400" />,
    leave: <UserMinus size={14} className="text-rose-400" />,
    info: <Info size={14} className="text-purple-400" />,
};

const borderMap = {
    join: 'border-l-cyan-500',
    leave: 'border-l-rose-500',
    info: 'border-l-purple-500',
};

export const ToastContainer = () => {
    const { toasts } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl glass-heavy border-l-4 ${borderMap[toast.type]} animate-[slideIn_0.3s_ease-out,fadeOut_0.3s_ease-in_3.2s_forwards]`}
                >
                    {iconMap[toast.type]}
                    <span className="text-sm text-cyan-100/80 font-medium">{toast.message}</span>
                </div>
            ))}
        </div>
    );
};

