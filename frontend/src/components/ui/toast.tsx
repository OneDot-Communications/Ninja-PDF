'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'error' | 'warning';

type Position =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

interface ToastData {
  id: string;
  title: string;
  message?: string;
  variant: Variant;
  position: Position;
  duration?: number;
  onDismiss?: () => void;
  highlightTitle?: boolean;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
  };
}

export interface ToasterRef {
  show: (data: Omit<ToastData, 'id'>) => void;
}

const Toast = ({ toast, onClose }: { toast: ToastData; onClose: (id: string) => void }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    if (toast.duration) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(toast.id), 300);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.id, onClose]);

  const getIcon = () => {
    // Custom minimalist icons
    const iconClass = "h-5 w-5 fill-black text-white";

    switch (toast.variant) {
      case 'success':
        return <CheckCircle className={iconClass} />;
      case 'error':
        return <AlertCircle className={iconClass} />;
      case 'warning':
        return <AlertTriangle className={iconClass} />;
      default:
        // Default is usually Info, using AlertCircle for general notifications as per user image vibe
        return <AlertCircle className={iconClass} />;
    }
  };

  const getPositionClasses = () => {
    switch (toast.position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div
      className={cn(
        'fixed z-50 max-w-sm w-auto min-w-[300px] bg-white border border-slate-100 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] p-3 transition-all duration-300 flex items-center gap-3',
        getPositionClasses(),
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className={cn('text-sm font-medium text-slate-800', toast.highlightTitle && 'text-primary')}>
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-[13px] text-slate-500 leading-tight mt-0.5">{toast.message}</p>
        )}
      </div>

      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(toast.id), 300);
        }}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors ml-2"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

const Toaster = forwardRef<ToasterRef>((props, ref) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useImperativeHandle(ref, () => ({
    show: (data: Omit<ToastData, 'id'>) => {
      const id = Math.random().toString(36).substr(2, 9);
      const toast: ToastData = {
        ...data,
        duration: data.duration || 3000, // Default to 3000ms if not provided or 0
        id
      };
      setToasts((prev) => [...prev, toast]);
    },
  }));

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </>
  );
});

Toaster.displayName = 'Toaster';

export default Toaster;