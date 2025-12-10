'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

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
    switch (toast.variant) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
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
        'fixed z-50 max-w-sm w-full bg-card border border-border rounded-lg shadow-lg p-4 transition-all duration-300',
        getPositionClasses(),
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <h4 className={cn('text-sm font-semibold', toast.highlightTitle && 'text-primary')}>
            {toast.title}
          </h4>
          {toast.message && (
            <p className="text-sm text-muted-foreground mt-1">{toast.message}</p>
          )}
          {toast.actions && (
            <button
              onClick={toast.actions.onClick}
              className={cn(
                'mt-2 text-xs px-2 py-1 rounded',
                toast.actions.variant === 'outline'
                  ? 'border border-border hover:bg-muted'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              {toast.actions.label}
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(toast.id), 300);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
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