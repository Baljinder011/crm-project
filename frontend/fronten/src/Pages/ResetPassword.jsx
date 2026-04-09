import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import AuthField from '../components/AuthField';
import { authApi } from '../services/authApi';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get('token') || '', [params]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors = {};

    if (!token) {
      nextErrors.token = 'Reset token is missing from the URL.';
    }

    if (!password || password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);
      setServerError('');
      setSuccessMessage('');
      const response = await authApi.resetPassword({
        token,
        newPassword: password,
      });
      setSuccessMessage(response.message || 'Password reset successful.');

      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err) {
      setServerError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Choose a new password for your CRM account"
      footer={
        <Link to="/" className="font-semibold text-cyan-300 hover:text-cyan-200">
          Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.token ? (
          <div className="rounded-2xl border border-rose-300/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {errors.token}
          </div>
        ) : null}

        <AuthField
          type={showPassword ? 'text' : 'password'}
          name="password"
          placeholder="Enter new password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrors((prev) => ({ ...prev, password: '' }));
            setServerError('');
          }}
          error={errors.password}
          icon={<Lock size={18} />}
          rightNode={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-slate-400 transition hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <AuthField
          type={showConfirmPassword ? 'text' : 'password'}
          name="confirmPassword"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setErrors((prev) => ({ ...prev, confirmPassword: '' }));
            setServerError('');
          }}
          error={errors.confirmPassword}
          icon={<Lock size={18} />}
          rightNode={
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="text-slate-400 transition hover:text-slate-600"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        {serverError ? (
          <div className="rounded-2xl border border-rose-300/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {serverError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-300/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            {successMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-[#2596be] to-[#670bb8] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-950/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;