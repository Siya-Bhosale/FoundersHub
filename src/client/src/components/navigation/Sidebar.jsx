import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Rocket,
  LayoutDashboard,
  Brain,
  ListChecks,
  Bot,
  Sparkles,
  SquareCheck,
  Activity,
  CalendarDays,
  GitBranch,
  Users,
  ShieldAlert,
  DollarSign,
  Workflow,
  ChartNoAxesCombined,
  Handshake,
  Presentation,
  Compass,
  User,
  Settings,
  LogOut,
  X,
  Clock,
  Building2,
  Briefcase,
  Send,
  MessageSquare,
} from 'lucide-react';

const ROLE_BADGES = {
  FOUNDER: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
  DEVELOPER: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
  INVESTOR: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [comingSoonModal, setComingSoonModal] = useState(null);

  const userRole = user?.role?.toUpperCase() || 'FOUNDER';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (!path) return false;
    const cleanPath = path.split('#')[0];
    if (cleanPath === '/dashboard' && location.pathname === '/dashboard') return true;
    const prefixes = [
      '/startups/',
      '/tasks/',
      '/sprint-planner/',
      '/execution/',
      '/risk-analysis/',
      '/ai-analyzer/',
      '/ai-mentor/',
      '/pitch/',
      '/team/',
      '/funding-interest/',
      '/finance/',
      '/investor/',
      '/developer/startups/',
      '/developer/my-startups',
      '/chat',
    ];
    for (const p of prefixes) {
      if (cleanPath.startsWith(p) && location.pathname.startsWith(p)) return true;
    }
    if (cleanPath !== '/dashboard' && location.pathname === cleanPath) return true;
    return false;
  };

  // Define navigation groups by role
  const getNavSections = () => {
    let storedActive = null;
    try {
      storedActive = localStorage.getItem('sprintfounders_active_startup');
    } catch (e) {}

    const toolRoutes = [
      '/startups/',
      '/developer/startups/',
      '/tasks/',
      '/kanban/',
      '/sprint-planner/',
      '/execution/',
      '/execution-intelligence/',
      '/risk-analysis/',
      '/finance/',
      '/ai-analyzer/',
      '/ai-mentor/',
      '/pitch/',
      '/team/',
      '/funding-interest/',
      '/investor-interest/',
      '/chat/',
    ];

    let urlStartupId = null;
    for (const prefix of toolRoutes) {
      if (location.pathname.startsWith(prefix)) {
        const seg = location.pathname.slice(prefix.length).split('/')[0];
        if (seg) {
          urlStartupId = seg;
          break;
        }
      }
    }

    const activeStartupId = urlStartupId || storedActive || null;
    const targetStartupId = activeStartupId || '';

    if (userRole === 'DEVELOPER') {
      const devStartupPrefix = targetStartupId ? `/developer/startups/${targetStartupId}` : '/developer/my-startups';

      return [
        {
          title: 'CORE',
          items: [
            { label: 'Overview', icon: LayoutDashboard, path: targetStartupId ? `${devStartupPrefix}` : '/dashboard' },
            { label: 'My Startups', icon: Briefcase, path: '/developer/my-startups' },
            { label: 'Discover Startups', icon: Compass, path: '/startups/discover' },
            { label: 'My Profile', icon: User, path: '/developer/profile' },
          ],
        },
        {
          title: 'EXECUTION',
          items: [
            { label: 'My Tasks', icon: SquareCheck, path: targetStartupId ? `${devStartupPrefix}/tasks` : '/developer/my-startups' },
            { label: 'Execution', icon: Activity, path: targetStartupId ? `${devStartupPrefix}/execution` : '/developer/my-startups' },
            { label: 'Sprint', icon: CalendarDays, path: targetStartupId ? `${devStartupPrefix}/sprint` : '/developer/my-startups' },
            { label: 'Team', icon: Users, path: targetStartupId ? `${devStartupPrefix}/team` : '/developer/my-startups' },
          ],
        },
        {
          title: 'COMMUNICATION',
          items: [
            { label: 'Department Chat', icon: MessageSquare, path: targetStartupId ? `${devStartupPrefix}/chat` : '/developer/my-startups' },
          ],
        },
        {
          title: 'AI TOOLS',
          items: [
            { label: 'AI Mentor', icon: Bot, path: targetStartupId ? `${devStartupPrefix}/ai-mentor` : '/developer/my-startups' },
            { label: 'Startup Analyzer', icon: Sparkles, path: targetStartupId ? `${devStartupPrefix}/analyzer` : '/developer/my-startups' },
            { label: 'Risk Analysis', icon: ShieldAlert, path: targetStartupId ? `${devStartupPrefix}/risk-analysis` : '/developer/my-startups' },
          ],
        },
      ];
    }

    if (userRole === 'INVESTOR') {
      return [
        {
          title: 'CORE',
          items: [
            { label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
            { label: 'Discover Startups', icon: Compass, path: '/investor/startups' },
          ],
        },
        {
          title: 'INSIGHTS',
          items: [
            { label: 'Startup Analyzer', icon: Sparkles, comingSoon: true, description: 'Venture scoring and market viability models' },
          ],
        },
        {
          title: 'FUNDING',
          items: [
            { label: 'Investor Matching', icon: Handshake, path: '/investor/startups' },
            { label: 'My Interests', icon: Send, path: '/investor/interests' },
            { label: 'Pitch Generator', icon: Presentation, comingSoon: true, description: 'AI-generated pitch decks and investment teasers' },
          ],
        },
      ];
    }

    // Default: FOUNDER
    return [
      {
        title: 'CORE',
        items: [
          { label: 'Overview', icon: LayoutDashboard, path: targetStartupId ? `/startups/${targetStartupId}` : '/dashboard' },
          { label: 'My Startups', icon: Briefcase, path: '/dashboard' },
          { label: 'My Profile', icon: User, path: '/dashboard' },
        ],
      },
      {
        title: 'EXECUTION',
        items: [
          { label: 'Sprint', icon: ListChecks, path: targetStartupId ? `/sprint-planner/${targetStartupId}` : '/dashboard' },
          { label: 'Tasks', icon: SquareCheck, path: targetStartupId ? `/tasks/${targetStartupId}` : '/dashboard' },
          { label: 'Execution', icon: Activity, path: targetStartupId ? `/execution/${targetStartupId}` : '/dashboard' },
          { label: 'Team', icon: Users, path: targetStartupId ? `/team/${targetStartupId}` : '/dashboard' },
        ],
      },
      {
        title: 'COMMUNICATION',
        items: [
          { label: 'Department Chats', icon: MessageSquare, path: targetStartupId ? `/startups/${targetStartupId}/chat` : '/dashboard' },
        ],
      },
      {
        title: 'AI TOOLS',
        items: [
          { label: 'Startup Analyzer', icon: Sparkles, path: targetStartupId ? `/ai-analyzer/${targetStartupId}` : '/dashboard' },
          { label: 'AI Mentor', icon: Bot, path: targetStartupId ? `/ai-mentor/${targetStartupId}` : '/dashboard' },
          { label: 'Risk Analysis', icon: ShieldAlert, path: targetStartupId ? `/risk-analysis/${targetStartupId}` : '/dashboard' },
          { label: 'Pitch', icon: Presentation, path: targetStartupId ? `/pitch/${targetStartupId}` : '/dashboard' },
        ],
      },
      {
        title: 'FUNDING',
        items: [
          { label: 'Finance', icon: DollarSign, path: targetStartupId ? `/finance/${targetStartupId}` : '/finance' },
          { label: 'Investors', icon: Building2, path: '/investor-matching' },
          { label: 'Funding Interest', icon: Handshake, path: targetStartupId ? `/funding-interest/${targetStartupId}` : '/dashboard' },
        ],
      },
    ];
  };

  const navSections = getNavSections();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#11141C] border-r border-[#232735] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-[#232735] flex items-center justify-between shrink-0">
          <Link
            to="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5 font-bold text-lg text-white tracking-tight hover:opacity-90 transition"
          >
            <img src="/assets/foundershub-logo.png" alt="FoundersHub" className="h-8 w-8 object-contain shrink-0" />
            <div className="flex flex-col">
              <div className="leading-tight text-white font-bold text-base tracking-tight">
                Founders<span className="text-violet-400">Hub</span>
              </div>
              <div className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase">
                FOUND TO BUILD
              </div>
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#171A24] transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {section.title}
              </div>

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = !item.comingSoon && isActive(item.path);

                  if (item.comingSoon) {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setComingSoonModal(item);
                          if (window.innerWidth < 1024) onClose();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-300 hover:bg-[#171A24]/60 transition group text-left"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-300 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#171A24] text-slate-400 border border-[#2A2F42] uppercase tracking-wider shrink-0">
                          Soon
                        </span>
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                        active
                          ? 'bg-[#171A24] text-white border-l-2 border-indigo-500 pl-2.5 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-[#171A24]/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active ? 'text-indigo-400' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Section: User Profile & Actions */}
        <div className="p-3 border-t border-[#232735] bg-[#11141C] shrink-0 space-y-2">
          <div className="p-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="text-xs font-bold text-white truncate">
                  {user?.name || 'User'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {user?.email || ''}
                </div>
              </div>
            </div>

            <span
              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${
                ROLE_BADGES[userRole] || 'bg-[#171A24] text-slate-400 border-[#2A2F42]'
              }`}
            >
              {userRole}
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <button
              onClick={() => {
                setComingSoonModal({
                  label: 'Account Settings',
                  description: 'Profile settings, notifications, and team preferences.',
                });
              }}
              type="button"
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-[#171A24] hover:text-white transition"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>

            <button
              onClick={handleLogout}
              type="button"
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Coming Soon Feature Modal */}
      {comingSoonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#11141C] max-w-sm w-full rounded-2xl border border-[#232735] p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">
                {comingSoonModal.label}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {comingSoonModal.description}
              </p>
              <span className="inline-block mt-2 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                Roadmap Feature
              </span>
            </div>

            <button
              type="button"
              onClick={() => setComingSoonModal(null)}
              className="w-full py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
