import { ReactNode } from 'react';

export default interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional width class override (defaults to 'w-[450px]') */
  widthClass?: string;
  /** Optional footer content */
  footer?: ReactNode;
}

