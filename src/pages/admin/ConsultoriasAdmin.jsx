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
  const {
    createMaterial,
    deleteConsultoria,
    deleteMaterial,
    getConsultoriasByOng,
    getMaterialesByConsultoria,
    saveConsultoria,
  } = useFirestore();
  const [consultorias, setConsultorias] = useState([]);
  const [materialesByConsultoria, setMaterialesByConsultoria] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [materialForm, setMaterialForm] = useState({
    consultoriaId: '',
    titulo: '',
    descripcion: '',
    file: null,
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

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
        if (!materialForm.consultoriaId && result[0]?.id) {
          setMaterialForm((current) => ({ ...current, consultoriaId: result[0].id }));
        }

        const entries = await Promise.all(
          result.map(async (consultoria) => [
            consultoria.id,
            await getMaterialesByConsultoria(selectedOrganization.id, consultoria.id),
          ]),
        );

        if (!ignore) {
          setMaterialesByConsultoria(Object.fromEntries(entries));
        }
      }
    }

    loadConsultorias();

    return () => {
      ignore = true;
    };
  }, [getConsultoriasByOng, getMaterialesByConsultoria, materialForm.consultoriaId, selectedOrganization?.id]);

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
      setStatus('Consultoria guardada correctamente.');
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

  async function handleDeleteConsultoria(consultoria) {
    if (!selectedOrganization?.id) {
      return;
    }

    const confirmed = window.confirm(`Eliminar la consultoria "${consultoria.titulo}" y sus materiales?`);
    if (!confirmed) {
      return;
    }

    await deleteConsultoria(selectedOrganization.id, consultoria.id);
    setConsultorias((current) => current.filter((item) => item.id !== consultoria.id));
    setMaterialesByConsultoria((current) => {
      const next = { ...current };
      delete next[consultoria.id];
      return next;
    });
    setStatus('Consultoria eliminada correctamente.');
  }

  async function handleMaterialSubmit(event) {
    event.preventDefault();
    if (!selectedOrganization?.id || !materialForm.file) {
      return;
    }

    setSaving(true);
    setStatus('');

    try {
      const savedMaterial = await createMaterial(selectedOrganization.id, materialForm);
      setMaterialesByConsultoria((current) => ({
        ...current,
        [savedMaterial.consultoriaId]: [
          savedMaterial,
          ...(current[savedMaterial.consultoriaId] || []),
        ],
      }));
      setMaterialForm((current) => ({
        ...current,
        titulo: '',
        descripcion: '',
        file: null,
      }));
      event.target.reset();
      setStatus('Material cargado correctamente.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMaterial(material) {
    if (!selectedOrganization?.id) {
      return;
    }

    const confirmed = window.confirm(`Eliminar el material "${material.titulo}"?`);
    if (!confirmed) {
      return;
    }

    await deleteMaterial(selectedOrganization.id, material.id);
    setMaterialesByConsultoria((current) => ({
      ...current,
      [material.consultoriaId]: (current[material.consultoriaId] || []).filter(
        (item) => item.id !== material.id,
      ),
    }));
    setStatus('Material eliminado correctamente.');
  }

  return (
    <AdminShell
      title="Gestion de consultorias"
      description="Gestiona el catalogo activo de la organizacion y controla que servicios se publican."
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
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

          <form
            className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6"
            onSubmit={handleMaterialSubmit}
          >
            <h2 className="text-lg font-semibold text-white">Materiales de ayuda</h2>
            <div className="mt-5 space-y-4">
              <label className="flex flex-col gap-2 text-sm text-slate-200" htmlFor="material-consultoria">
                <span className="font-medium text-slate-100">Consultoria</span>
                <select
                  required
                  id="material-consultoria"
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
                  value={materialForm.consultoriaId}
                  onChange={(event) =>
                    setMaterialForm((current) => ({ ...current, consultoriaId: event.target.value }))
                  }
                >
                  <option value="">Seleccionar consultoria</option>
                  {consultorias.map((consultoria) => (
                    <option key={consultoria.id} value={consultoria.id}>
                      {consultoria.titulo}
                    </option>
                  ))}
                </select>
              </label>

              <InputField
                required
                id="material-titulo"
                label="Titulo del material"
                placeholder="Guia rapida para empezar"
                value={materialForm.titulo}
                onChange={(event) =>
                  setMaterialForm((current) => ({ ...current, titulo: event.target.value }))
                }
              />
              <TextAreaField
                id="material-descripcion"
                label="Descripcion"
                placeholder="Opcional: indica para que sirve este recurso."
                value={materialForm.descripcion}
                onChange={(event) =>
                  setMaterialForm((current) => ({ ...current, descripcion: event.target.value }))
                }
              />
              <label className="flex cursor-pointer flex-col rounded-2xl border border-dashed border-white/15 bg-slate-950/20 px-4 py-4 text-sm text-slate-300">
                <span className="font-medium text-slate-100">Archivo</span>
                <span className="mt-1 text-xs text-slate-400">
                  PDF, DOC, PPT, imagenes, videos u otros recursos.
                </span>
                <input
                  required
                  className="mt-3 text-sm text-slate-300"
                  type="file"
                  onChange={(event) =>
                    setMaterialForm((current) => ({
                      ...current,
                      file: event.target.files?.[0] || null,
                    }))
                  }
                />
              </label>

              <Button disabled={saving || !selectedOrganization?.id} type="submit">
                {saving ? 'Subiendo...' : 'Subir material'}
              </Button>
            </div>
          </form>

          {status ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200">
              {status}
            </div>
          ) : null}
        </div>

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
                    <Button type="button" variant="ghost" onClick={() => handleDeleteConsultoria(consultoria)}>
                      Eliminar
                    </Button>
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Materiales</p>
                  <div className="mt-3 space-y-2">
                    {(materialesByConsultoria[consultoria.id] || []).map((material) => (
                      <div
                        key={material.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{material.titulo}</p>
                          <p className="mt-1 text-xs text-slate-400">{material.originalName}</p>
                        </div>
                        <Button type="button" variant="ghost" onClick={() => handleDeleteMaterial(material)}>
                          Eliminar material
                        </Button>
                      </div>
                    ))}
                    {!(materialesByConsultoria[consultoria.id] || []).length ? (
                      <p className="text-sm text-slate-500">Sin materiales cargados.</p>
                    ) : null}
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
