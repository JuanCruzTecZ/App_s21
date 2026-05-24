import { useEffect, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';

const states = ['pendiente', 'en_proceso', 'finalizada'];

export default function SolicitudesAdmin() {
  const { selectedOrganization } = useAuth();
  const { getSolicitudesByOng, updateSolicitudEstado } = useFirestore();
  const [solicitudes, setSolicitudes] = useState([]);
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    if (!selectedOrganization?.id) {
      setSolicitudes([]);
      return undefined;
    }

    let ignore = false;

    async function loadSolicitudes() {
      const result = await getSolicitudesByOng(selectedOrganization.id);
      if (!ignore) {
        setSolicitudes(result);
      }
    }

    loadSolicitudes();

    return () => {
      ignore = true;
    };
  }, [getSolicitudesByOng, selectedOrganization?.id]);

  async function handleStatusChange(id, estado) {
    if (!selectedOrganization?.id) {
      return;
    }

    setSavingId(id);
    await updateSolicitudEstado(id, estado, selectedOrganization.id);
    setSolicitudes((current) =>
      current.map((item) => (item.id === id ? { ...item, estado } : item)),
    );
    setSavingId('');
  }

  return (
    <AdminShell
      title="Bandeja de solicitudes"
      description="Gestion de tickets de asistencia."
    >
      <div className="space-y-4">
        {solicitudes.map((solicitud) => (
          <article
            key={solicitud.id}
            className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.3em] text-accent-300/70">
                  {solicitud.nombreConsultoria}
                </p>
                <h2 className="mt-3 text-xl font-semibold text-white">{solicitud.nombreONGCliente}</h2>
                <p className="mt-2 text-sm text-slate-400">{solicitud.email}</p>
                <p className="mt-4 text-sm leading-6 text-slate-300">{solicitud.descripcion}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                  {solicitud.contactoTelefonico ? <span>Prefiere contacto telefonico</span> : null}
                  {solicitud.telefono ? <span>Telefono: {solicitud.telefono}</span> : null}
                  {solicitud.franjaHoraria ? <span>Franja: {solicitud.franjaHoraria}</span> : null}
                  {solicitud.archivos?.length ? <span>Adjuntos: {solicitud.archivos.length}</span> : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {states.map((state) => (
                  <Button
                    key={state}
                    disabled={savingId === solicitud.id}
                    type="button"
                    variant={solicitud.estado === state ? 'primary' : 'secondary'}
                    onClick={() => handleStatusChange(solicitud.id, state)}
                  >
                    {state}
                  </Button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
