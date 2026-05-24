import { Navigate, Route, Routes } from 'react-router-dom';
import PrivateRoute from './components/common/PrivateRoute';
import Dashboard from './pages/admin/Dashboard';
import Login from './pages/admin/Login';
import ConsultoriasAdmin from './pages/admin/ConsultoriasAdmin';
import OrganizacionesAdmin from './pages/admin/OrganizacionesAdmin';
import SolicitudesAdmin from './pages/admin/SolicitudesAdmin';
import FormularioSolicitud from './pages/public/FormularioSolicitud';
import LandingPage from './pages/public/LandingPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/siglo21" replace />} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/consultorias"
        element={
          <PrivateRoute>
            <ConsultoriasAdmin />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/solicitudes"
        element={
          <PrivateRoute>
            <SolicitudesAdmin />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/organizaciones"
        element={
          <PrivateRoute>
            <OrganizacionesAdmin />
          </PrivateRoute>
        }
      />
      <Route path="/:ongSlug" element={<LandingPage />} />
      <Route path="/:ongSlug/solicitud/:consultoriaId" element={<FormularioSolicitud />} />
    </Routes>
  );
}

export default App;
