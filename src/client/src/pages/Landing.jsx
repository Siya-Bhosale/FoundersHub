import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Rocket,
  Code2,
  TrendingUp,
  ArrowRight,
  Zap,
  Sparkles,
  Users,
  ListChecks,
  Activity,
  DollarSign,
  Compass,
  Handshake,
  CheckCircle2,
} from 'lucide-react';

const LIFECYCLE_STEPS = [
  { step: '01', title: 'IDEA', desc: 'Define problem & product solution', icon: Sparkles },
  { step: '02', title: 'AI ANALYSIS', desc: 'Gemini feasibility & market audit', icon: Zap },
  { step: '03', title: 'TEAM', desc: 'Recruit verified builder talent', icon: Users },
  { step: '04', title: 'SPRINT', desc: 'Structured 14-day roadmap planner', icon: ListChecks },
  { step: '05', title: 'EXECUTION', desc: 'Deterministic score & risk intelligence', icon: Activity },
  { step: '06', title: 'FINANCE', desc: 'Cash, runway & financial ledger', icon: DollarSign },
  { step: '07', title: 'INVESTORS', desc: 'Deterministic match engine (30/20/20/10/20)', icon: Compass },
  { step: '08', title: 'FUNDING', desc: 'Pitch decks, copilot & check allocation', icon: Handshake },
];

const Landing = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] text-[#F3F4F6]">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        {/* Ambient Glow background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 text-xs font-semibold">
            <img src="/assets/foundershub-logo.png" alt="FoundersHub" className="w-4 h-4 object-contain" />
            <span>FoundersHub • FOUND TO BUILD</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight sm:leading-none max-w-4xl mx-auto">
            Build your startup with your team,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
              execute with AI,
            </span>{' '}
            and connect with the right investors.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The all-in-one startup operating platform for ambitious founders, elite developers, and venture capital syndicates.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
              >
                <span>Go to Dashboard ({user?.name})</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl font-semibold text-slate-300 bg-[#11141C] border border-[#232735] hover:bg-[#171A24] hover:text-white shadow-xl transition"
                >
                  Explore Platform
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Product Flow Section: 8-Stage Lifecycle */}
      <section className="py-16 bg-[#0E1017] border-y border-[#232735]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-indigo-950/70 text-indigo-400 border border-indigo-800/60 tracking-wider">
              The Complete Venture Engine
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              From Idea → Execution → Funding
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              A systematic, transparent workflow that bridges validation, delivery cadence, and capital allocation.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {LIFECYCLE_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="p-5 rounded-2xl bg-[#11141C] border border-[#232735] hover:border-indigo-900/60 transition group space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold font-mono text-indigo-400/80">
                      {item.step}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-[#171A24] border border-[#2A2F42] flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Role Pillars Section */}
      <section className="py-16 bg-[#0B0D12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Tailored Workspaces for Every Role
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Whether you are pitching an idea, writing code, or allocating capital, FoundersHub powers your workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Founder Card */}
            <div className="p-7 rounded-2xl border border-[#232735] bg-[#11141C] hover:border-indigo-900/60 shadow-xl transition space-y-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center">
                <Rocket className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">For Founders</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Launch ventures, discover technical developers, review join requests, run AI viability assessments, generate AI pitch decks, and consult your contextual AI Mentor.
              </p>
            </div>

            {/* Developer Card */}
            <div className="p-7 rounded-2xl border border-[#232735] bg-[#11141C] hover:border-emerald-900/60 shadow-xl transition space-y-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">For Developers</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Discover high-conviction startups, showcase verified tech stacks and availability, manage sprint Kanban tasks, and build ventures alongside ambitious founders.
              </p>
            </div>

            {/* Investor Card */}
            <div className="p-7 rounded-2xl border border-[#232735] bg-[#11141C] hover:border-amber-900/60 shadow-xl transition space-y-4">
              <div className="w-11 h-11 rounded-xl bg-amber-950/60 border border-amber-800/40 text-amber-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">For Investors</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Filter deal-flow with a transparent 5-component match score (30/20/20/10/20), diagnose thesis alignment with Gemini, and express direct funding interests to founders.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
