import { Building2, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ConsultancyCard from '../../components/public/ConsultancyCard';
import PublicHero from '../../components/public/PublicHero';
import { useTenant } from '../../context/TenantContext';
import { useFirestore } from '../../hooks/useFirestore';

export default function LandingPage() {
  const { ongSlug } = useParams();
  const { tenant, loadingTenant } = useTenant();
  const { getConsultoriasPublicas, getPublicOrganizations } = useFirestore();
  const [consultorias, setConsultorias] = useState([]);
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    if (ongSlug || tenant.slug) {
      return undefined;
    }

    let ignore = false;

    async function loadOrganizations() {
      const result = await getPublicOrganizations();
      if (!ignore) {
        setOrganizations(result);
      }
    }

    loadOrganizations();

    return () => {
      ignore = true;
    };
  }, [getPublicOrganizations, ongSlug, tenant.slug]);

  useEffect(() => {
    if (!tenant.slug || !ongSlug) {
      setConsultorias([]);
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
  }, [getConsultoriasPublicas, ongSlug, tenant.slug]);

  if (!ongSlug) {
    return (
      <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <section className="glass-panel rounded-[2rem] p-8 sm:p-12">
            <p className="text-xs uppercase tracking-[0.35em] text-accent-300/80">
              Portal de asistencia especializada
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Elegi la ONG con la que queres trabajar
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Cada organizacion tiene sus propias consultorias, materiales y canales de asistencia.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {organizations.map((organization) => (
              <Link
                key={organization.id}
                to={`/${organization.slug}`}
                className="group rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-accent-400/50 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-500 text-slate-950">
                      <Building2 size={20} />
                    </span>
                    <div>
                      <h2 className="text-xl font-semibold text-white">{organization.nombre}</h2>
                      <p className="mt-2 text-sm text-slate-400">
                        /{organization.slug} - {organization.consultoriasCount} consultorias activas
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="mt-2 text-accent-300 transition group-hover:translate-x-1" size={20} />
                </div>
              </Link>
            ))}
          </section>
        </div>
      </div>
    );
  }

  if (loadingTenant) {
    return (
      <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-slate-300">
          Cargando organizacion...
        </div>
      </div>
    );
  }

  if (!tenant.id) {
    return (
      <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
          <h1 className="text-2xl font-semibold text-white">Organizacion no encontrada</h1>
          <p className="mt-3 text-slate-400">Revisa el slug o vuelve al listado principal.</p>
          <Link className="mt-6 inline-flex text-accent-300" to="/">
            Ver organizaciones
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <PublicHero tenant={tenant} />

        <section className="glass-panel rounded-[2rem] p-8 sm:p-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-accent-300/70">Catalogo activo</p>
              <h2 className="mt-3 text-3xl font-bold text-white">Tecnologias disponibles</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-400">
              Cada tecnologia tiene materiales propios y un formulario de asistencia especifico.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {consultorias.map((consultoria) => (
              <ConsultancyCard key={consultoria.id} consultoria={consultoria} ongSlug={tenant.slug} />
            ))}
          </div>

          {!consultorias.length ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
              Esta organizacion todavia no tiene consultorias activas.
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
