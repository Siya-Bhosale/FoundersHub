import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CheckCircle2 } from 'lucide-react';

const roleBadgeColors = {
  FOUNDER: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
  DEVELOPER: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
  INVESTOR: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
};

const Dashboard = () => {
  const { user } = useAuth();
  const normalizedRole = user?.role?.toUpperCase();

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#11141C] p-6 sm:p-8 rounded-2xl border border-[#232735] shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
              <LayoutDashboard className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                FoundersHub Dashboard
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Welcome back, <span className="font-semibold text-slate-200">{user?.name}</span>
              </p>
            </div>
          </div>

          <div>
            <span
              className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                roleBadgeColors[normalizedRole] || 'bg-[#171A24] text-slate-300 border-[#2A2F42]'
              }`}
            >
              {normalizedRole} Workspace
            </span>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-[#11141C] p-6 sm:p-8 rounded-2xl border border-[#232735] shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Workspace Authenticated & Connected
              </h2>
              <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                Your session is authenticated via JWT and secured. You have direct access to your startup pipeline, team matching, and AI validation analysis.
              </p>

              {/* User Details Table */}
              <div className="mt-6 border-t border-[#232735] pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42]">
                  <div className="text-xs font-medium text-slate-500">User ID</div>
                  <div className="text-xs font-mono font-semibold text-slate-300 mt-1 truncate">
                    {user?.id}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42]">
                  <div className="text-xs font-medium text-slate-500">Email</div>
                  <div className="text-xs font-semibold text-slate-300 mt-1 truncate">
                    {user?.email}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42]">
                  <div className="text-xs font-medium text-slate-500">Role</div>
                  <div className="text-xs font-semibold text-slate-300 mt-1">
                    {user?.role}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
