import { useEffect, useState } from 'react';
import ConsultancyCard from '../../components/public/ConsultancyCard';
import PublicHero from '../../components/public/PublicHero';
import { useTenant } from '../../context/TenantContext';
import { useFirestore } from '../../hooks/useFirestore';

export default function LandingPage() {
  const { tenant } = useTenant();
  const { getConsultoriasPublicas } = useFirestore();
  const [consultorias, setConsultorias] = useState([]);

  useEffect(() => {
    if (!tenant.slug) {
      return undefined;
    }

    let ignore = false;

    async function loadConsultorias() {
      const result = await getConsultoriasPublicas(tenant.slug);
      if (!ignore) {
        setConsultorias(result);
      }
    }

    loadConsultorias();

    return () => {
      ignore = true;
    };
  }, [getConsultoriasPublicas, tenant.slug]);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <PublicHero tenant={tenant} />

        <section className="glass-panel rounded-[2rem] p-8 sm:p-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-accent-300/70">Catálogo activo</p>
              <h2 className="mt-3 text-3xl font-bold text-white">Consultorías disponibles</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-400">
              Cada tarjeta abre un formulario para solicitar la asistencia.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {consultorias.map((consultoria) => (
              <ConsultancyCard key={consultoria.id} consultoria={consultoria} ongSlug={tenant.slug} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
