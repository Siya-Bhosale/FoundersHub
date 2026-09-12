import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Rocket, Mail, Lock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.message || '');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    try {
      const data = await login(formData.email.trim(), formData.password);
      setSuccess('Login successful! Redirecting...');

      const role = data.user?.role?.toUpperCase();
      let targetPath = '/dashboard';
      if (role === 'FOUNDER' || role === 'DEVELOPER' || role === 'INVESTOR') {
        targetPath = '/dashboard';
      }

      const from = location.state?.from?.pathname || targetPath;

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#0B0D12]">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-600/20 mb-4">
            <Rocket className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to access your SprintFounders workspace.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#11141C] py-8 px-6 sm:px-10 rounded-2xl border border-[#232735] shadow-2xl">
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-start gap-3 text-sm text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start gap-3 text-sm text-red-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  id="email"
                  required
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  name="password"
                  id="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
