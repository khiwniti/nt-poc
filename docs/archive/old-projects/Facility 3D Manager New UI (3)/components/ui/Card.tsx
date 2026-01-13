
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm ${className}`}>
      {title && (
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm tracking-tight">{title}</h3>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-4 flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
};
