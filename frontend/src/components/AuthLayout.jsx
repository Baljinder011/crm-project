import React from 'react';

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[url('/logbg.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-950/75 to-slate-950/95" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto h-18 w-18 rounded-3xl bg-gradient-to-br from-[#2596be] to-[#670bb8] p-[1px] shadow-[0_12px_40px_rgba(103,11,184,0.28)]">
            <div className="flex h-full w-full items-center justify-center rounded-3xl bg-slate-950/85 text-lg font-bold tracking-[0.25em]">
              CRM
            </div>
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-3xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-white/70">{subtitle}</p>
          </div>

          <div className="mt-8">{children}</div>

          {footer ? <div className="mt-6 text-center text-sm text-white/70">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;