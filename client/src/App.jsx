import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import FounderDashboard from './pages/founder/FounderDashboard';
import CreateStartup from './pages/founder/CreateStartup';
import StartupDetails from './pages/founder/StartupDetails';
import EditStartup from './pages/founder/EditStartup';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <FounderDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/startups/create"
                element={
                  <ProtectedRoute allowedRoles={['FOUNDER']}>
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
                  <ProtectedRoute allowedRoles={['FOUNDER']}>
                    <EditStartup />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
