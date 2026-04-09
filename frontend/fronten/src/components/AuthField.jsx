import React from 'react';

function AuthField({ icon, rightNode, error, className = '', ...props }) {
  return (
    <div>
      <div className={`relative ${className}`}>
        {icon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        ) : null}
        <input
          {...props}
          className={`w-full rounded-2xl border bg-white/95 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
            icon ? 'pl-12' : 'pl-4'
          } ${rightNode ? 'pr-12' : 'pr-4'} ${error ? 'border-rose-300' : 'border-white/20'}`}
        />
        {rightNode ? <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightNode}</div> : null}
      </div>
      {error ? <p className="mt-1.5 text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}

export default AuthField;