import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CheckCircle2, ShieldCheck, User } from 'lucide-react';

const roleBadgeColors = {
  FOUNDER: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  DEVELOPER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  INVESTOR: 'bg-amber-100 text-amber-800 border-amber-200',
};

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <LayoutDashboard className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                SprintFounders Dashboard
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Welcome back, <span className="font-semibold text-slate-800">{user?.name}</span>
              </p>
            </div>
          </div>

          <div>
            <span
              className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                roleBadgeColors[user?.role] || 'bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              {user?.role} Workspace
            </span>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Phase 2 — Step 3 Active: Frontend Authentication Verified
              </h2>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Your session is authenticated via JWT and stored securely. The full role-specific dashboard, startup management, developer marketplace, and AI sprint features will be connected in subsequent phases.
              </p>

              {/* User Details Table */}
              <div className="mt-6 border-t border-slate-100 pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="text-xs font-medium text-slate-500">User ID</div>
                  <div className="text-xs font-mono font-semibold text-slate-800 mt-1 truncate">
                    {user?.id}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="text-xs font-medium text-slate-500">Email</div>
                  <div className="text-xs font-semibold text-slate-800 mt-1 truncate">
                    {user?.email}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="text-xs font-medium text-slate-500">Role</div>
                  <div className="text-xs font-semibold text-slate-800 mt-1">
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
