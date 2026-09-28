import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { UserRole } from './types';
import { hasRole } from './lib/constants';

// Chaque écran est chargé à la demande (bundle initial plus léger)
const page = <K extends string>(loader: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => loader().then(m => ({ default: m[name] })));

const DashboardPage     = page(() => import('./pages/DashboardPage'),     'DashboardPage');
const RequestsPage      = page(() => import('./pages/RequestsPage'),      'RequestsPage');
const CalendarPage      = page(() => import('./pages/CalendarPage'),      'CalendarPage');
const VehiclesPage      = page(() => import('./pages/VehiclesPage'),      'VehiclesPage');
const DriversPage       = page(() => import('./pages/DriversPage'),       'DriversPage');
const UsersPage         = page(() => import('./pages/UsersPage'),         'UsersPage');
const EmployeesPage     = page(() => import('./pages/EmployeesPage'),     'EmployeesPage');
const ReportsPage       = page(() => import('./pages/ReportsPage'),       'ReportsPage');
const HolidaysPage      = page(() => import('./pages/HolidaysPage'),      'HolidaysPage');
const AuditPage         = page(() => import('./pages/AuditPage'),         'AuditPage');
const NotificationsPage = page(() => import('./pages/NotificationsPage'), 'NotificationsPage');
const MaintenancePage   = page(() => import('./pages/MaintenancePage'),   'MaintenancePage');
const LicensePage       = page(() => import('./pages/LicensePage'),       'LicensePage');
const WhatsAppPage      = page(() => import('./pages/WhatsAppPage'),      'WhatsAppPage');

const Loading = () => (
  <div className="flex h-full min-h-[50vh] items-center justify-center text-slate-500 text-sm">
    Chargement…
  </div>
);

const PrivateRoute = ({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen"><Loading /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !hasRole(user.role, roles)) return <Navigate to="/" replace />;
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
};

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="requests"      element={<PrivateRoute><RequestsPage /></PrivateRoute>} />
        <Route path="calendar"      element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
        <Route path="notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
        <Route path="employees"     element={<PrivateRoute roles={['admin', 'manager']}><EmployeesPage /></PrivateRoute>} />
        <Route path="vehicles"      element={<PrivateRoute roles={['admin', 'manager']}><VehiclesPage /></PrivateRoute>} />
        <Route path="drivers"       element={<PrivateRoute roles={['admin', 'manager']}><DriversPage /></PrivateRoute>} />
        <Route path="maintenance"   element={<PrivateRoute roles={['admin', 'manager']}><MaintenancePage /></PrivateRoute>} />
        <Route path="reports"       element={<PrivateRoute roles={['admin', 'manager']}><ReportsPage /></PrivateRoute>} />
        <Route path="users"         element={<PrivateRoute roles={['admin']}><UsersPage /></PrivateRoute>} />
        <Route path="holidays"      element={<PrivateRoute roles={['admin']}><HolidaysPage /></PrivateRoute>} />
        <Route path="audit"         element={<PrivateRoute roles={['admin']}><AuditPage /></PrivateRoute>} />
        <Route path="license"       element={<PrivateRoute roles={['admin']}><LicensePage /></PrivateRoute>} />
        <Route path="whatsapp"      element={<PrivateRoute roles={['admin']}><WhatsAppPage /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
