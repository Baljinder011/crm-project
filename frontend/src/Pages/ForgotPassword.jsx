import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import AuthField from '../components/AuthField';
import { authApi } from '../services/authApi';
import { isValidEmail } from '../utils/validators';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setServerError('');
    setSuccessMessage('');

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const response = await authApi.forgotPassword({ email });
      setSuccessMessage(response.message || 'Reset link request sent.');
    } catch (err) {
      setServerError(err.message || 'Failed to process request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="We will send a reset link to your email"
      footer={
        <Link to="/" className="font-semibold text-cyan-300 hover:text-cyan-200">
          Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          type="email"
          name="email"
          placeholder="Enter your email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError('');
            setServerError('');
            setSuccessMessage('');
          }}
          error={error}
          icon={<Mail size={18} />}
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
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;