import { useEffect, useMemo, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';

const emptyCreateForm = {
  nombre: '',
  slug: '',
  adminEmail: '',
  adminPassword: '',
  telegramChatId: '',
  telegramBotToken: '',
};

export default function OrganizacionesAdmin() {
  const {
    currentUser,
    organizations,
    refreshSession,
    selectedOrganization,
    setSelectedOrganizationId,
  } = useAuth();
  const { createOrganization, updateOrganization } = useFirestore();
  const [editForm, setEditForm] = useState({
    nombre: '',
    slug: '',
    adminEmail: '',
    adminPassword: '',
    telegramChatId: '',
    telegramBotToken: '',
  });
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const isSuperadmin = currentUser?.role === 'superadmin';

  useEffect(() => {
    if (!selectedOrganization) {
      return;
    }

    setEditForm({
      nombre: selectedOrganization.nombre || '',
      slug: selectedOrganization.slug || '',
      adminEmail: selectedOrganization.adminEmail || '',
      adminPassword: '',
      telegramChatId: selectedOrganization.telegramChatId || '',
      telegramBotToken: '',
    });
  }, [selectedOrganization]);

  const tokenHelper = useMemo(() => {
    if (selectedOrganization?.telegramBotConfigured) {
      return 'Hay un token cargado. Deja el campo vacio para conservarlo o escribe uno nuevo para reemplazarlo.';
    }

    return 'Aun no hay un token configurado para esta organizacion.';
  }, [selectedOrganization?.telegramBotConfigured]);

  async function handleUpdate(event) {
    event.preventDefault();
    if (!selectedOrganization?.id) {
      return;
    }

    setSaving(true);
    setStatus('');

    try {
      await updateOrganization(selectedOrganization.id, editForm);
      await refreshSession();
      setSelectedOrganizationId(String(selectedOrganization.id));
      setEditForm((current) => ({ ...current, adminPassword: '', telegramBotToken: '' }));
      setStatus('Configuracion actualizada correctamente.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setStatus('');

    try {
      await createOrganization(createForm);
      await refreshSession();
      setCreateForm(emptyCreateForm);
      setStatus('Nueva organizacion creada correctamente.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Organizaciones y configuracion"
      description="Agrega, edita y configura las oganizaciones"
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <form
          className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6"
          onSubmit={handleUpdate}
        >
          <h2 className="text-lg font-semibold text-white">Organizacion seleccionada</h2>
          <div className="mt-5 space-y-4">
            <InputField
              required
              id="edit-nombre"
              label="Nombre de la ONG"
              value={editForm.nombre}
              onChange={(event) => setEditForm((current) => ({ ...current, nombre: event.target.value }))}
            />
            <InputField
              required
              id="edit-slug"
              label="Slug publico"
              value={editForm.slug}
              onChange={(event) => setEditForm((current) => ({ ...current, slug: event.target.value }))}
            />
            <InputField
              id="edit-admin-email"
              label="Correo del administrador"
              type="email"
              value={editForm.adminEmail}
              onChange={(event) => setEditForm((current) => ({ ...current, adminEmail: event.target.value }))}
            />
            <InputField
              id="edit-admin-password"
              label="Nueva contrasena del administrador"
              type="password"
              placeholder="Dejar vacio para no cambiar"
              value={editForm.adminPassword}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, adminPassword: event.target.value }))
              }
            />
            <InputField
              id="edit-telegram-chat"
              label="Chat ID de Telegram"
              value={editForm.telegramChatId}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, telegramChatId: event.target.value }))
              }
            />
            <div>
              <InputField
                id="edit-telegram-token"
                label="Token del bot de Telegram"
                type="password"
                placeholder="Dejar vacio para conservar el token actual"
                value={editForm.telegramBotToken}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, telegramBotToken: event.target.value }))
                }
              />
              <p className="mt-2 text-xs text-slate-400">{tokenHelper}</p>
            </div>
            <Button disabled={saving || !selectedOrganization?.id} type="submit">
              {saving ? 'Guardando...' : 'Guardar configuracion'}
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          {isSuperadmin ? (
            <form
              className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6"
              onSubmit={handleCreate}
            >
              <h2 className="text-lg font-semibold text-white">Alta de nueva ONG</h2>
              <div className="mt-5 space-y-4">
                <InputField
                  required
                  id="create-nombre"
                  label="Nombre de la ONG"
                  value={createForm.nombre}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, nombre: event.target.value }))
                  }
                />
                <InputField
                  required
                  id="create-slug"
                  label="Slug publico"
                  value={createForm.slug}
                  onChange={(event) => setCreateForm((current) => ({ ...current, slug: event.target.value }))}
                />
                <InputField
                  required
                  id="create-admin-email"
                  label="Correo del administrador"
                  type="email"
                  value={createForm.adminEmail}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, adminEmail: event.target.value }))
                  }
                />
                <InputField
                  required
                  id="create-admin-password"
                  label="Contraseña inicial"
                  type="password"
                  value={createForm.adminPassword}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, adminPassword: event.target.value }))
                  }
                />
                <InputField
                  id="create-telegram-chat"
                  label="Chat ID de Telegram"
                  value={createForm.telegramChatId}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, telegramChatId: event.target.value }))
                  }
                />
                <InputField
                  id="create-telegram-token"
                  label="Token del bot de Telegram"
                  type="password"
                  value={createForm.telegramBotToken}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, telegramBotToken: event.target.value }))
                  }
                />
                <Button disabled={saving} type="submit">
                  {saving ? 'Creando...' : 'Crear ONG'}
                </Button>
              </div>
            </form>
          ) : null}

          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white">Organizaciones cargadas</h2>
            <div className="mt-5 space-y-3">
              {organizations.map((organization) => (
                <article
                  key={organization.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/30 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-medium text-white">{organization.nombre}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        /{organization.slug} · {organization.adminEmail || 'sin correo visible'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{organization.telegramBotConfigured ? 'Telegram configurado' : 'Sin Telegram'}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setSelectedOrganizationId(String(organization.id))}
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {status ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200">
              {status}
            </div>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}
