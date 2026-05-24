import { useEffect, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import TextAreaField from '../../components/common/TextAreaField';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';

const emptyForm = {
  id: '',
  titulo: '',
  descripcion: '',
  activo: true,
};

export default function ConsultoriasAdmin() {
  const { selectedOrganization } = useAuth();
  const { getConsultoriasByOng, saveConsultoria } = useFirestore();
  const [consultorias, setConsultorias] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedOrganization?.id) {
      setConsultorias([]);
      return undefined;
    }

    let ignore = false;

    async function loadConsultorias() {
      const result = await getConsultoriasByOng(selectedOrganization.id);
      if (!ignore) {
        setConsultorias(result);
      }
    }

    loadConsultorias();

    return () => {
      ignore = true;
    };
  }, [getConsultoriasByOng, selectedOrganization?.id]);

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleEdit(consultoria) {
    setForm({
      id: consultoria.id,
      titulo: consultoria.titulo,
      descripcion: consultoria.descripcion,
      activo: consultoria.activo,
    });
  }

  function handleCancel() {
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedOrganization?.id) {
      return;
    }

    setSaving(true);

    try {
      const savedConsultoria = await saveConsultoria(selectedOrganization.id, {
        id: form.id || undefined,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        activo: form.activo,
      });

      setConsultorias((current) => {
        const exists = current.some((item) => item.id === savedConsultoria.id);
        if (exists) {
          return current.map((item) => (item.id === savedConsultoria.id ? savedConsultoria : item));
        }

        return [...current, savedConsultoria];
      });

      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(consultoria) {
    if (!selectedOrganization?.id) {
      return;
    }

    const savedConsultoria = await saveConsultoria(selectedOrganization.id, {
      ...consultoria,
      activo: !consultoria.activo,
    });

    setConsultorias((current) =>
      current.map((item) => (item.id === savedConsultoria.id ? savedConsultoria : item)),
    );
  }

  return (
    <AdminShell
      title="Gestion de consultorias"
      description="Gestiona el catalogo activo de la organizacion y controla que servicios se publican."
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form
          className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-semibold text-white">
            {form.id ? 'Editar consultoria' : 'Nueva consultoria'}
          </h2>
          <div className="mt-5 space-y-4">
            <InputField
              required
              id="titulo"
              label="Titulo"
              placeholder="Google Sheets"
              value={form.titulo}
              onChange={(event) => handleChange('titulo', event.target.value)}
            />
            <TextAreaField
              required
              id="descripcion"
              label="Descripcion"
              placeholder="Breve descripcion orientada a la asistencia."
              value={form.descripcion}
              onChange={(event) => handleChange('descripcion', event.target.value)}
            />

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3 text-sm text-slate-200">
              <input
                checked={form.activo}
                className="h-4 w-4 accent-[#2cb191]"
                type="checkbox"
                onChange={(event) => handleChange('activo', event.target.checked)}
              />
              Visible en la landing publica
            </label>

            <div className="flex flex-wrap gap-3">
              <Button disabled={saving || !selectedOrganization?.id} type="submit">
                {saving ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Crear consultoria'}
              </Button>
              {form.id ? (
                <Button disabled={saving} type="button" variant="secondary" onClick={handleCancel}>
                  Cancelar edicion
                </Button>
              ) : null}
            </div>
          </div>
        </form>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold text-white">Servicios configurados</h2>
          <div className="mt-5 space-y-3">
            {consultorias.map((consultoria) => (
              <article
                key={consultoria.id}
                className="rounded-2xl border border-white/10 bg-slate-950/30 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="font-medium text-white">{consultoria.titulo}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{consultoria.descripcion}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-accent-400/30 px-3 py-1 text-xs text-accent-300">
                      {consultoria.activo ? 'Activo' : 'Oculto'}
                    </span>
                    <Button type="button" variant="secondary" onClick={() => handleEdit(consultoria)}>
                      Editar
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => handleToggle(consultoria)}>
                      {consultoria.activo ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
