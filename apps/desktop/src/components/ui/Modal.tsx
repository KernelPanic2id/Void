import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ModalProps from '../../models/ui/modalProps.model';

/**
 * Reusable glass-style modal shell rendered via a portal.
 * Provides the overlay, container, glow, header and optional footer.
 */
export const Modal = ({ isOpen, onClose, title, children, widthClass = 'w-[450px]', footer }: ModalProps) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#000000]/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`${widthClass} glass-modal rounded-2xl overflow-hidden text-cyan-100 relative`}>
        {/* Top glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 flex justify-center">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 blur-[4px]" />
          <div className="absolute w-1/2 h-full bg-cyan-200 blur-[2px]" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 glass-heavy border-b border-cyan-500/10">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tracking-wider">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-cyan-500/50 hover:text-cyan-300 hover:scale-110 transition-all duration-200 focus:outline-none"
          >
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer (optional) */}
        {footer && (
          <div className="px-6 py-4 border-t border-cyan-500/10 flex justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

