import { useEffect, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import StatsCard from '../../components/admin/StatsCard';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';

export default function Dashboard() {
  const { selectedOrganization } = useAuth();
  const { getDashboardSummary } = useFirestore();
  const [summary, setSummary] = useState({
    consultoriasActivas: 0,
    solicitudesPendientes: 0,
    solicitudesTotales: 0,
  });

  useEffect(() => {
    if (!selectedOrganization?.id) {
      setSummary({
        consultoriasActivas: 0,
        solicitudesPendientes: 0,
        solicitudesTotales: 0,
      });
      return undefined;
    }

    let ignore = false;

    async function loadSummary() {
      const result = await getDashboardSummary(selectedOrganization.id);
      if (!ignore) {
        setSummary(result);
      }
    }

    loadSummary();

    return () => {
      ignore = true;
    };
  }, [getDashboardSummary, selectedOrganization?.id]);

  return (
    <AdminShell
      title="Panel principal"
      description="Resumen del estado de las consultorias y solicitudes de la organizacion."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          helper="Servicios visibles en la landing publica."
          label="Consultorias activas"
          value={summary.consultoriasActivas}
        />
        <StatsCard
          helper="Requieren seguimiento prioritario."
          label="Solicitudes pendientes"
          value={summary.solicitudesPendientes}
        />
        <StatsCard
          helper="Historico total registrado."
          label="Solicitudes totales"
          value={summary.solicitudesTotales}
        />
      </div>
    </AdminShell>
  );
}
