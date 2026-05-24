import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import FileDropzone from '../../components/common/FileDropzone';
import InputField from '../../components/common/InputField';
import TextAreaField from '../../components/common/TextAreaField';
import { useTenant } from '../../context/TenantContext';
import { useFirestore } from '../../hooks/useFirestore';

const initialForm = {
  email: '',
  nombreONGCliente: '',
  descripcion: '',
  contactoTelefonico: false,
  telefono: '',
  franjaHoraria: '',
};

export default function FormularioSolicitud() {
  const navigate = useNavigate();
  const { consultoriaId } = useParams();
  const { tenant } = useTenant();
  const { createSolicitud, getConsultoriasPublicas } = useFirestore();
  const [consultorias, setConsultorias] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState({ loading: false, message: '' });

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

  const consultoria = useMemo(
    () => consultorias.find((item) => String(item.id) === String(consultoriaId)),
    [consultoriaId, consultorias],
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, message: '' });

    try {
      const formData = new FormData();
      formData.append('email', form.email);
      formData.append('nombreONGCliente', form.nombreONGCliente);
      formData.append('descripcion', form.descripcion);
      formData.append('contactoTelefonico', String(form.contactoTelefonico));
      formData.append('telefono', form.telefono);
      formData.append('franjaHoraria', form.franjaHoraria);
      formData.append('consultoriaId', consultoriaId);
      files.forEach((file) => {
        formData.append('files', file);
      });

      await createSolicitud(tenant.slug, formData);

      setStatus({
        loading: false,
        message: 'Tu solicitud fue enviada correctamente. En breve alguien de nuestro equipo se contactara contigo.',
      });

      window.setTimeout(() => {
        navigate(`/${tenant.slug}`);
      }, 1800);
    } catch (error) {
      setStatus({
        loading: false,
        message: error.message || 'No pudimos procesar la solicitud en este momento, vuelva a intentarlo mas tarde.',
      });
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel rounded-[2rem] p-8 sm:p-10">
          <Link className="text-sm text-accent-300" to={`/${tenant.slug}`}>
            Volver al catalogo
          </Link>
          <p className="mt-6 text-xs uppercase tracking-[0.3em] text-accent-300/70">Solicitud contextual</p>
          <h1 className="mt-4 text-4xl font-bold text-white">
            {consultoria?.titulo ?? 'Consultoria especializada'}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Estas solicitando asistencia a <strong>{tenant.nombre}</strong>.
          </p>

          <div className="mt-10 space-y-4 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <span className="text-slate-500">Tecnologia</span>
              <p className="mt-2 font-medium text-white">{consultoria?.titulo ?? consultoriaId}</p>
            </div>
            
          </div>
        </section>

        <form className="glass-panel rounded-[2rem] p-8 sm:p-10" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <InputField
              required
              id="email"
              label="Correo electronico"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
            <InputField
              required
              id="nombreONGCliente"
              label="Nombre de tu ONG"
              value={form.nombreONGCliente}
              onChange={(event) =>
                setForm((current) => ({ ...current, nombreONGCliente: event.target.value }))
              }
            />
          </div>

          <TextAreaField
            required
            className="mt-5"
            id="descripcion"
            label="Descripcion del problema o solicitud"
            value={form.descripcion}
            onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-200">
              <input
                checked={form.contactoTelefonico}
                type="checkbox"
                onChange={(event) =>
                  setForm((current) => ({ ...current, contactoTelefonico: event.target.checked }))
                }
              />
              Deseo que me contacten por telefono
            </label>
            <InputField
              id="telefono"
              label="Telefono"
              placeholder="+54 9..."
              value={form.telefono}
              onChange={(event) => setForm((current) => ({ ...current, telefono: event.target.value }))}
            />
          </div>

          <InputField
            className="mt-5"
            id="franjaHoraria"
            label="Franja horaria sugerida"
            placeholder="Mañana: 09:00 - 13:00"
            value={form.franjaHoraria}
            onChange={(event) => setForm((current) => ({ ...current, franjaHoraria: event.target.value }))}
          />

          <div className="mt-5">
            <FileDropzone files={files} onChange={setFiles} />
          </div>

          {status.message ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200">
              {status.message}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled={status.loading} type="submit">
              {status.loading ? 'Enviando solicitud...' : 'Enviar solicitud'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(`/${tenant.slug}`)}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
