
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'lg', 
  className = '',
  showCloseButton = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Small delay to allow render before animating opacity
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered) return null;

  const sizeClasses = {
    sm: 'max-w-md',   // 448px
    md: 'max-w-lg',   // 512px
    lg: 'max-w-2xl',  // 672px
    xl: 'max-w-4xl',  // 896px (Was 5xl/1024px)
    '2xl': 'max-w-6xl', // 1152px (Was 7xl/1280px)
    full: 'max-w-[95vw] h-[90vh]'
  };

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content - Light Theme */}
      <div className={`
        relative bg-white/95 border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden
        transform transition-all duration-300 origin-center text-slate-800
        ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}
        ${sizeClasses[size]}
        ${className}
        w-full
      `}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-xl shrink-0 z-10">
            <div className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              {title}
            </div>
            {showCloseButton && (
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-slate-800 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
