import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import VoiceNavigator from './components/VoiceNavigator';
import './i18n/index.js';

// Auth
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';

// Patient
import PatientLayout from './pages/patient/Layout';
import PatientDashboard from './pages/patient/Dashboard';
import Medicines from './pages/patient/Medicines';
import DietChart from './pages/patient/DietChart';
import Reports from './pages/patient/Reports';
import Progress from './pages/patient/Progress';
import SOS from './pages/patient/SOS';
import PatientProfile from './pages/patient/Profile';
import Reminders from './pages/patient/Reminders';

// Caregiver
import CaregiverLayout from './pages/caregiver/Layout';
import CaregiverDashboard from './pages/caregiver/Dashboard';
import CaregiverAlerts from './pages/caregiver/Alerts';
import CaregiverProfile from './pages/caregiver/Profile';

// Doctor
import DoctorLayout from './pages/doctor/Layout';
import DoctorPatients from './pages/doctor/Patients';
import PatientDetail from './pages/doctor/PatientDetail';
import DoctorProfile from './pages/doctor/Profile';

// Loading spinner
const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
    <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

// Role guard
const RoleRoute = ({ role, children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />;
  return children;
};

// Caregiver shared pages (reuse patient ones with data from patient)
const CGMedicines = () => <Medicines />;
const CGDiet = () => <DietChart />;
const CGReports = () => <Reports />;
const CGProgress = () => <Progress />;
const CGReminders = () => <Reminders />;

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Patient */}
      <Route path="/patient" element={<RoleRoute role="patient"><PatientLayout /></RoleRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="medicines" element={<Medicines />} />
        <Route path="diet" element={<DietChart />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="reports" element={<Reports />} />
        <Route path="progress" element={<Progress />} />
        <Route path="sos" element={<SOS />} />
        <Route path="profile" element={<PatientProfile />} />
      </Route>

      {/* Caregiver */}
      <Route path="/caregiver" element={<RoleRoute role="caregiver"><CaregiverLayout /></RoleRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CaregiverDashboard />} />
        <Route path="medicines" element={<CGMedicines />} />
        <Route path="diet" element={<CGDiet />} />
        <Route path="reminders" element={<CGReminders />} />
        <Route path="reports" element={<CGReports />} />
        <Route path="progress" element={<CGProgress />} />
        <Route path="alerts" element={<CaregiverAlerts />} />
        <Route path="profile" element={<CaregiverProfile />} />
      </Route>

      {/* Doctor */}
      <Route path="/doctor" element={<RoleRoute role="doctor"><DoctorLayout /></RoleRoute>}>
        <Route index element={<Navigate to="patients" replace />} />
        <Route path="patients" element={<DoctorPatients />} />
        <Route path="patients/:id" element={<PatientDetail />} />
        <Route path="profile" element={<DoctorProfile />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={
        user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <Navigate to="/signup" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AlertProvider>
          <BrowserRouter>
            <AppRoutes />
            <VoiceNavigator language="en-US" />
          </BrowserRouter>
        </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
