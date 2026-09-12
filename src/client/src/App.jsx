import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/navigation/Sidebar';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import FounderDashboard from './pages/founder/FounderDashboard';
import CreateStartup from './pages/founder/CreateStartup';
import StartupDetails from './pages/founder/StartupDetails';
import EditStartup from './pages/founder/EditStartup';
import FinanceDashboard from './pages/founder/FinanceDashboard';
import DeveloperProfilePage from './pages/developer/DeveloperProfilePage';
import DiscoverStartups from './pages/developer/DiscoverStartups';
import DeveloperRequestsPage from './pages/developer/DeveloperRequestsPage';
import DeveloperDashboard from './pages/developer/DeveloperDashboard';
import MyStartupsPage from './pages/developer/MyStartupsPage';
import DeveloperStartupOverview from './pages/developer/DeveloperStartupOverview';
import DeveloperTasksPage from './pages/developer/DeveloperTasksPage';
import DeveloperAIMentorPage from './pages/developer/DeveloperAIMentorPage';
import DeveloperExecutionPage from './pages/developer/DeveloperExecutionPage';
import DeveloperSprintPage from './pages/developer/DeveloperSprintPage';
import DeveloperTeamPage from './pages/developer/DeveloperTeamPage';
import DeveloperAnalyzerPage from './pages/developer/DeveloperAnalyzerPage';
import DeveloperRiskPage from './pages/developer/DeveloperRiskPage';
import InvestorDashboard from './pages/investor/InvestorDashboard';
import InvestorStartupDiscovery from './pages/investor/InvestorStartupDiscovery';
import InvestorInterestsPage from './pages/investor/InvestorInterestsPage';
import PitchGeneratorPage from './pages/founder/PitchGeneratorPage';
import AIMentorPage from './pages/founder/AIMentorPage';
import TasksPage from './pages/founder/TasksPage';
import ExecutionPage from './pages/founder/ExecutionPage';
import RiskAnalysisPage from './pages/founder/RiskAnalysisPage';
import SprintPlannerPage from './pages/founder/SprintPlannerPage';
import StartupAnalyzerPage from './pages/founder/StartupAnalyzerPage';
import TeamPage from './pages/founder/TeamPage';
import DepartmentWorkspacePage from './pages/founder/DepartmentWorkspacePage';
import DepartmentChatPage from './pages/chat/DepartmentChatPage';
import InvestorInterestPage from './pages/founder/InvestorInterestPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

const DashboardRouter = () => {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  if (role === 'DEVELOPER') {
    return <DeveloperDashboard />;
  }
  if (role === 'INVESTOR') {
    return <InvestorDashboard />;
  }
  return <FounderDashboard />;
};

const RootRoute = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Landing />;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#0B0D12] text-[#F3F4F6] font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Global SaaS Sidebar for authenticated sessions */}
      {isAuthenticated && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area: offset with lg:pl-64 on desktop when authenticated */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          isAuthenticated ? 'lg:pl-64' : ''
        }`}
      >
        <Navbar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/profile"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DeveloperProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/startups/discover"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER', 'INVESTOR']}>
                  <DiscoverStartups />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/requests"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DeveloperRequestsPage />
                </ProtectedRoute>
              }
            />

            {/* Developer "My Startups" & Startup Workspace */}
            <Route
              path="/developer/my-startups"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <MyStartupsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/startups/:startupId"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DeveloperStartupOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/startups/:startupId/tasks"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DeveloperTasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/startups/:startupId/ai-mentor"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DeveloperAIMentorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/startups/:startupId/execution"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DeveloperExecutionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/startups/:startupId/sprint"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DeveloperSprintPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/startups/:startupId/team"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DeveloperTeamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/startups/:startupId/chat"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DepartmentChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/startups/:startupId/chat/:departmentId"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DepartmentChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/startups/:startupId/departments/:departmentId"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DepartmentWorkspacePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/startups/:startupId/analyzer"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DeveloperAnalyzerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/startups/:startupId/risk-analysis"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DeveloperRiskPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/startups/create"
              element={
                <ProtectedRoute
                  allowedRoles={['FOUNDER']}
                  message="Startup creation is strictly reserved for Founder accounts."
                >
                  <CreateStartup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/startups/:id"
              element={
                <ProtectedRoute>
                  <StartupDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/startups/:id/edit"
              element={
                <ProtectedRoute
                  allowedRoles={['FOUNDER']}
                  message="Editing startup details is strictly reserved for Founder accounts."
                >
                  <EditStartup />
                </ProtectedRoute>
              }
            />

            {/* Phase 9: Investor Routes */}
            <Route
              path="/investor/startups"
              element={
                <ProtectedRoute allowedRoles={['INVESTOR']}>
                  <InvestorStartupDiscovery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/investor/interests"
              element={
                <ProtectedRoute allowedRoles={['INVESTOR']}>
                  <InvestorInterestsPage />
                </ProtectedRoute>
              }
            />

            {/* Phase 8: Finance Routes */}
            <Route
              path="/finance"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER']}>
                  <FinanceDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/:startupId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER']}>
                  <FinanceDashboard />
                </ProtectedRoute>
              }
            />

            {/* Phase 10: AI Pitch & Mentor Routes */}
            <Route
              path="/pitch/:startupId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER']}>
                  <PitchGeneratorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-mentor/:startupId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER']}>
                  <AIMentorPage />
                </ProtectedRoute>
              }
            />

            {/* Dedicated Tool Routes (One Tool = One Page) */}
            <Route
              path="/tasks/:startupId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER', 'DEVELOPER']}>
                  <TasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kanban/:startupId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER', 'DEVELOPER']}>
                  <TasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/execution/:startupId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER']}>
                  <ExecutionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/execution-intelligence/:startupId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER']}>
                  <ExecutionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/risk-analysis/:startupId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER']}>
                  <RiskAnalysisPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sprint-planner/:startupId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER']}>
                  <SprintPlannerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-analyzer/:startupId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER']}>
                  <StartupAnalyzerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team/:startupId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER', 'DEVELOPER']}>
                  <TeamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/startups/:startupId/departments/:departmentId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER', 'DEVELOPER']}>
                  <DepartmentWorkspacePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments/:startupId/:departmentId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER', 'DEVELOPER']}>
                  <DepartmentWorkspacePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/startups/:startupId/chat"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER', 'DEVELOPER']}>
                  <DepartmentChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/startups/:startupId/chat/:departmentId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER', 'DEVELOPER']}>
                  <DepartmentChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:startupId"
              element={
                <ProtectedRoute>
                  <DepartmentChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:startupId/:departmentId"
              element={
                <ProtectedRoute>
                  <DepartmentChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/funding-interest/:startupId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER']}>
                  <InvestorInterestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/investor-interest/:startupId"
              element={
                <ProtectedRoute allowedRoles={['FOUNDER']}>
                  <InvestorInterestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/investors/matches"
              element={
                <ProtectedRoute allowedRoles={['INVESTOR']}>
                  <InvestorStartupDiscovery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/investor-matching"
              element={
                <ProtectedRoute allowedRoles={['INVESTOR']}>
                  <InvestorStartupDiscovery />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
