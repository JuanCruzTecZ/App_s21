import { Download, ExternalLink, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import { useTenant } from '../../context/TenantContext';
import { useFirestore } from '../../hooks/useFirestore';

function formatSize(size) {
  if (!size) {
    return '0 KB';
  }

  if (size < 1024 * 1024) {
    return `${Math.ceil(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MaterialesPage() {
  const { consultoriaId } = useParams();
  const { tenant } = useTenant();
  const { getConsultoriasPublicas, getMaterialesPublicos } = useFirestore();
  const [consultorias, setConsultorias] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant.slug || !consultoriaId) {
      return undefined;
    }

    let ignore = false;

    async function loadData() {
      setLoading(true);
      const [consultoriasResult, materialesResult] = await Promise.all([
        getConsultoriasPublicas(tenant.slug),
        getMaterialesPublicos(tenant.slug, consultoriaId),
      ]);

      if (!ignore) {
        setConsultorias(consultoriasResult);
        setMateriales(materialesResult);
        setLoading(false);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [consultoriaId, getConsultoriasPublicas, getMaterialesPublicos, tenant.slug]);

  const consultoria = useMemo(
    () => consultorias.find((item) => String(item.id) === String(consultoriaId)),
    [consultoriaId, consultorias],
  );

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="glass-panel rounded-[2rem] p-8 sm:p-10">
          <Link className="text-sm text-accent-300" to={`/${tenant.slug}`}>
            Volver al catalogo
          </Link>
          <p className="mt-6 text-xs uppercase tracking-[0.3em] text-accent-300/70">
            Materiales de consulta
          </p>
          <h1 className="mt-4 text-4xl font-bold text-white">
            {consultoria?.titulo || 'Tecnologia seleccionada'}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Recursos cargados por {tenant.nombre}. Podes abrirlos para consultarlos o descargarlos.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {materiales.map((material) => (
            <article
              key={material.id}
              className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-500 text-slate-950">
                  <FileText size={20} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-white">{material.titulo}</h2>
                  <p className="mt-1 truncate text-sm text-slate-400">{material.originalName}</p>
                  {material.descripcion ? (
                    <p className="mt-3 text-sm leading-6 text-slate-300">{material.descripcion}</p>
                  ) : null}
                  <p className="mt-3 text-xs text-slate-500">{formatSize(material.size)}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={`/api/public/organizations/${tenant.slug}/materiales/${material.id}/open`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Button type="button" variant="secondary" className="gap-2">
                    <ExternalLink size={17} />
                    Abrir
                  </Button>
                </a>
                <a href={`/api/public/organizations/${tenant.slug}/materiales/${material.id}/download`}>
                  <Button type="button" className="gap-2">
                    <Download size={17} />
                    Descargar
                  </Button>
                </a>
              </div>
            </article>
          ))}
        </section>

        {!loading && !materiales.length ? (
          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-300">
            Todavia no hay materiales cargados para esta consultoria.
          </div>
        ) : null}
      </div>
    </div>
  );
}
