import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Rocket, LogOut, LayoutDashboard, User, Compass, FileText, Layers, Menu, DollarSign } from 'lucide-react';

const roleBadgeStyles = {
  FOUNDER: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
  DEVELOPER: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
  INVESTOR: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
};

const Navbar = ({ onToggleSidebar }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  const userRole = user?.role?.toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#11141C]/95 backdrop-blur-md border-b border-[#232735]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Mobile Sidebar Toggle */}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button
              onClick={onToggleSidebar}
              type="button"
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#171A24] transition focus:outline-hidden"
              aria-label="Toggle navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-[#F3F4F6] tracking-tight hover:opacity-90 transition">
            <img src="/assets/foundershub-logo.png" alt="FoundersHub" className="h-8 w-8 object-contain" />
            <span className="font-bold tracking-tight text-xl text-white">
              Founders<span className="text-violet-400">Hub</span>
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  isActive('/dashboard')
                    ? 'bg-[#171A24] text-white border border-[#2A2F42]'
                    : 'text-slate-400 hover:text-white hover:bg-[#171A24]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-slate-400" />
                <span>Dashboard</span>
              </Link>

              {userRole === 'FOUNDER' && (
                <>
                  <Link
                    to="/dashboard"
                    className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                      location.pathname === '/dashboard' && location.search === ''
                        ? 'text-white'
                        : 'text-slate-400 hover:text-white hover:bg-[#171A24]'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span>My Startups</span>
                  </Link>

                  <Link
                    to="/finance"
                    className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                      location.pathname.startsWith('/finance')
                        ? 'bg-[#171A24] text-white border border-[#2A2F42]'
                        : 'text-slate-400 hover:text-white hover:bg-[#171A24]'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <span>Finance</span>
                  </Link>
                </>
              )}

              {userRole === 'DEVELOPER' && (
                <>
                  <Link
                    to="/developer/profile"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                      isActive('/developer/profile')
                        ? 'bg-[#171A24] text-white border border-[#2A2F42]'
                        : 'text-slate-400 hover:text-white hover:bg-[#171A24]'
                    }`}
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/startups/discover"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                      isActive('/startups/discover')
                        ? 'bg-[#171A24] text-white border border-[#2A2F42]'
                        : 'text-slate-400 hover:text-white hover:bg-[#171A24]'
                    }`}
                  >
                    <Compass className="w-4 h-4 text-slate-400" />
                    <span>Discover Startups</span>
                  </Link>

                  <Link
                    to="/developer/requests"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                      isActive('/developer/requests')
                        ? 'bg-[#171A24] text-white border border-[#2A2F42]'
                        : 'text-slate-400 hover:text-white hover:bg-[#171A24]'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>My Requests</span>
                  </Link>
                </>
              )}

              {/* User Pill */}
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#232735]">
                <div className="flex flex-col text-right leading-tight">
                  <span className="text-xs font-semibold text-slate-200">{user?.name}</span>
                  <span className="text-[11px] text-slate-400">{user?.email}</span>
                </div>
                {userRole && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${
                      roleBadgeStyles[userRole] || 'bg-[#171A24] text-slate-300 border-[#232735]'
                    }`}
                  >
                    {userRole}
                  </span>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition"
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
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                  isActive('/login')
                    ? 'bg-[#171A24] text-white border border-[#2A2F42]'
                    : 'text-slate-400 hover:text-white hover:bg-[#171A24]'
                }`}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
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
