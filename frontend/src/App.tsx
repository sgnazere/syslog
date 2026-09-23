import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage }         from './pages/LoginPage';
import { DashboardPage }     from './pages/DashboardPage';
import { RequestsPage }      from './pages/RequestsPage';
import { CalendarPage }      from './pages/CalendarPage';
import { VehiclesPage }      from './pages/VehiclesPage';
import { DriversPage }       from './pages/DriversPage';
import { UsersPage }         from './pages/UsersPage';
import { EmployeesPage }     from './pages/EmployeesPage';
import { ReportsPage }       from './pages/ReportsPage';
import { HolidaysPage }      from './pages/HolidaysPage';
import { AuditPage }         from './pages/AuditPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MaintenancePage }   from './pages/MaintenancePage';
import { LicensePage }       from './pages/LicensePage';
import { WhatsAppPage }      from './pages/WhatsAppPage';

const PrivateRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="flex h-screen items-center justify-center text-slate-500 text-sm">
      Chargement…
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="requests"      element={<RequestsPage />} />
        <Route path="calendar"      element={<CalendarPage />} />
        <Route path="employees"     element={<PrivateRoute roles={['admin','manager']}><EmployeesPage /></PrivateRoute>} />
        <Route path="users"         element={<PrivateRoute roles={['admin']}><UsersPage /></PrivateRoute>} />
        <Route path="vehicles"      element={<PrivateRoute roles={['admin','manager']}><VehiclesPage /></PrivateRoute>} />
        <Route path="drivers"       element={<PrivateRoute roles={['admin','manager']}><DriversPage /></PrivateRoute>} />
        <Route path="reports"       element={<PrivateRoute roles={['admin','manager']}><ReportsPage /></PrivateRoute>} />
        <Route path="holidays"      element={<PrivateRoute roles={['admin']}><HolidaysPage /></PrivateRoute>} />
        <Route path="maintenance"   element={<PrivateRoute roles={['admin','manager']}><MaintenancePage /></PrivateRoute>} />
        <Route path="license"       element={<PrivateRoute roles={['admin']}><LicensePage /></PrivateRoute>} />
        <Route path="whatsapp"      element={<PrivateRoute roles={['admin']}><WhatsAppPage /></PrivateRoute>} />
        <Route path="audit"         element={<PrivateRoute roles={['admin']}><AuditPage /></PrivateRoute>} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
