import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { currentUser, initialized, initializeSetup, loading, signIn } = useAuth();
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [setupForm, setSetupForm] = useState({
    organizationName: '',
    organizationSlug: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && currentUser) {
    return <Navigate replace to="/admin/dashboard" />;
  }

  async function handleLogin(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await signIn(loginForm.email, loginForm.password);
      navigate('/admin/dashboard');
    } catch (submitError) {
      setError(submitError.message || 'No fue posible iniciar sesion.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetup(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await initializeSetup(setupForm);
      navigate('/admin/dashboard');
    } catch (submitError) {
      setError(submitError.message || 'No fue posible completar la configuracion inicial.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-6 text-slate-300">
        Cargando configuracion...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-6">
      <div className="glass-panel w-full max-w-lg rounded-[2rem] p-8 sm:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-300/70">Administracion privada</p>
        <h1 className="mt-4 text-3xl font-bold text-white">
          {initialized ? 'Acceso del equipo gestor' : 'Configuracion inicial segura'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {initialized
            ? 'Inicio de sesion propio del sistema.'
            : 'Crea la primera organizacion y el primer usuario superadmin para activar el portal.'}
        </p>

        {initialized ? (
          <form className="mt-8 space-y-5" onSubmit={handleLogin}>
            <InputField
              required
              id="email"
              label="Correo"
              type="email"
              value={loginForm.email}
              onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
            />
            <InputField
              required
              id="password"
              label="Contraseña"
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
            />
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <Button className="w-full" disabled={submitting} type="submit">
              {submitting ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSetup}>
            <InputField
              required
              id="organizationName"
              label="Nombre de la primera ONG"
              value={setupForm.organizationName}
              onChange={(event) =>
                setSetupForm((current) => ({ ...current, organizationName: event.target.value }))
              }
            />
            <InputField
              required
              id="organizationSlug"
              label="Slug publico"
              value={setupForm.organizationSlug}
              onChange={(event) =>
                setSetupForm((current) => ({ ...current, organizationSlug: event.target.value }))
              }
            />
            <InputField
              required
              id="setupEmail"
              label="Correo superadmin"
              type="email"
              value={setupForm.email}
              onChange={(event) => setSetupForm((current) => ({ ...current, email: event.target.value }))}
            />
            <InputField
              required
              id="setupPassword"
              label="Contraseña superadmin"
              type="password"
              value={setupForm.password}
              onChange={(event) =>
                setSetupForm((current) => ({ ...current, password: event.target.value }))
              }
            />
            <p className="text-xs leading-5 text-slate-400">
              Usa al menos 10 caracteres y combina letras con numeros.
            </p>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <Button className="w-full" disabled={submitting} type="submit">
              {submitting ? 'Configurando...' : 'Crear portal'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
