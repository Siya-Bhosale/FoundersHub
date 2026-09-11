import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Rocket, LogOut, LayoutDashboard, User } from 'lucide-react';

const roleBadgeStyles = {
  FOUNDER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DEVELOPER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INVESTOR: 'bg-amber-50 text-amber-700 border-amber-200',
};

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-slate-900 tracking-tight hover:opacity-90 transition">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Rocket className="w-5 h-5" />
          </div>
          <span>Sprint<span className="text-indigo-600">Founders</span></span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-3 sm:gap-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isActive('/dashboard')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-slate-500" />
                <span>Dashboard</span>
              </Link>

              {/* User Pill */}
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="flex flex-col text-right leading-tight">
                  <span className="text-xs font-semibold text-slate-800">{user?.name}</span>
                  <span className="text-[11px] text-slate-500">{user?.email}</span>
                </div>
                {user?.role && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${
                      roleBadgeStyles[user.role] || 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {user.role}
                  </span>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isActive('/login')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-100 transition"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
