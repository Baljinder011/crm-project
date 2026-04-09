import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import AuthField from '../components/AuthField';
import { authApi } from '../services/authApi';
import { useAuth } from '../context/AuthContext';
import { isValidEmail } from '../utils/validators';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError('');
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.name || form.name.trim().length < 2) {
      nextErrors.name = 'Name must be at least 2 characters.';
    }

    if (!isValidEmail(form.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!form.password || form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
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
      const response = await authApi.register(form);
      login({ token: response.token, user: response.user });
      navigate('/dashboard');
    } catch (error) {
      setServerError(error.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Start your CRM workspace with email and password"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          type="text"
          name="name"
          placeholder="Enter your full name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          icon={<User size={18} />}
        />

        <AuthField
          type="email"
          name="email"
          placeholder="Enter your email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          icon={<Mail size={18} />}
        />

        <AuthField
          type={showPassword ? 'text' : 'password'}
          name="password"
          placeholder="Create a password"
          value={form.password}
          onChange={handleChange}
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

        {serverError ? (
          <div className="rounded-2xl border border-rose-300/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {serverError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-[#2596be] to-[#670bb8] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-950/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Register;