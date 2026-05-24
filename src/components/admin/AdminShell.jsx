import {
  Building2,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  PanelsTopLeft,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/consultorias', label: 'Consultorias', icon: PanelsTopLeft },
  { to: '/admin/solicitudes', label: 'Solicitudes', icon: MessagesSquare },
  { to: '/admin/organizaciones', label: 'Organizaciones', icon: Building2 },
];

export default function AdminShell({ title, description, children }) {
  const location = useLocation();
  const {
    currentUser,
    logout,
    organizations,
    selectedOrganization,
    selectedOrganizationId,
    setSelectedOrganizationId,
  } = useAuth();

  return (
    <div className="min-h-screen bg-surface-950 p-4 sm:p-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="glass-panel rounded-[2rem] p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent-300/70">Admin ONG</p>
            <h2 className="mt-4 text-2xl font-bold text-white">
              {selectedOrganization?.nombre || 'Sin organizacion seleccionada'}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Gestion privada de consultorias, solicitudes y configuracion institucional.
            </p>
          </div>

          {organizations.length ? (
            <div className="mt-6">
              <label className="flex flex-col gap-2 text-sm text-slate-200" htmlFor="organizationSelector">
                <span className="font-medium text-slate-100">Organizacion activa</span>
                <select
                  id="organizationSelector"
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
                  value={selectedOrganizationId}
                  onChange={(event) => setSelectedOrganizationId(event.target.value)}
                >
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <nav className="mt-8 flex flex-col gap-2">
            {links.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                    active
                      ? 'bg-accent-500 text-slate-950'
                      : 'bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3 text-sm text-slate-300">
            <p className="font-medium text-white">{currentUser?.email}</p>
            <p className="mt-1 text-slate-400">
              {currentUser?.role === 'superadmin' ? 'Superadmin global' : 'Administrador de organizacion'}
            </p>
          </div>

          <button
            className="mt-4 inline-flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.05]"
            type="button"
            onClick={logout}
          >
            <LogOut size={18} />
            Cerrar sesion
          </button>
        </aside>

        <main className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            <p className="mt-2 text-slate-400">{description}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
