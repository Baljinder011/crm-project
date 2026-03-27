import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [flow, setFlow] = useState('login');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const isLogin = flow === 'login';
  const isForgotEmail = flow === 'forgotEmail';
  const isForgotOtp = flow === 'forgotOtp';

  const handlePrimaryAction = () => {
    if (isLogin) {
      navigate('/Dashboard');
      return;
    }
    if (isForgotEmail) {
      setFlow('forgotOtp');
      return;
    }
    setFlow('login');
    setOtp('');
    setEmail('');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[url('/logbg.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/70 to-slate-950/90" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto h-28 w-28 rounded-full border border-white/30 bg-white/10 p-3 shadow-[0_0_35px_rgba(59,130,246,0.35)] backdrop-blur">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white/90 text-slate-700">
              <User size={42} />
            </div>
          </div>

          <div className="mt-6">
            <h1 className="text-2xl font-semibold tracking-[0.2em]">
              {isLogin ? 'LOGIN' : 'FORGOT PASSWORD'}
            </h1>
            <p className="mt-2 text-xs uppercase tracking-[0.35em] text-white/70">
              {isLogin ? 'Welcome' : isForgotEmail ? 'Enter your email' : 'Enter OTP'}
            </p>
          </div>

          <form className="mt-8 space-y-4">
            {isLogin && (
              <>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="USER NAME"
                    className="w-full rounded-full border border-white/30 bg-white/95 py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="PASSWORD"
                    className="w-full rounded-full border border-white/30 bg-white/95 py-3 pl-11 pr-12 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-white/70">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/40 bg-white/20 text-indigo-500 focus:ring-indigo-300"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => setFlow('forgotEmail')}
                    className="hover:text-white transition"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            {isForgotEmail && (
              <>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="EMAIL ADDRESS"
                    className="w-full rounded-full border border-white/30 bg-white/95 py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <p className="text-xs text-white/70">
                  We will send a one-time password to your email.
                </p>
              </>
            )}

            {isForgotOtp && (
              <>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="ENTER OTP"
                    className="w-full rounded-full border border-white/30 bg-white/95 py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <p className="text-xs text-white/70">
                  Enter the 6-digit OTP sent to your email.
                </p>
              </>
            )}

            <button
              type="button"
              onClick={handlePrimaryAction}
              className="mt-2 w-full rounded-full border border-white/40 bg-white/10 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white shadow-sm hover:bg-white/20 transition"
            >
              {isLogin ? 'Login' : isForgotEmail ? 'Send OTP' : 'Verify OTP'}
            </button>
          </form>

          {isLogin ? (
            <button className="mt-6 text-xs uppercase tracking-[0.3em] text-white/70 hover:text-white transition">
              Create Account
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setFlow('login')}
              className="mt-6 text-xs uppercase tracking-[0.3em] text-white/70 hover:text-white transition"
            >
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
