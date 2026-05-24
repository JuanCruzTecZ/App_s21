import { useMemo } from 'react';
import { apiFetch } from '../lib/api';

export function useFirestore() {
  return useMemo(
    () => ({
      async getConsultoriasPublicas(slug) {
        const result = await apiFetch(`/api/public/organizations/${slug}/consultorias`);
        return result.consultorias;
      },

      async createSolicitud(slug, formData) {
        const result = await apiFetch(`/api/public/organizations/${slug}/solicitudes`, {
          method: 'POST',
          body: formData,
        });
        return result.solicitud;
      },

      async getConsultoriasByOng(organizationId) {
        const result = await apiFetch(`/api/admin/consultorias?organizationId=${organizationId}`);
        return result.consultorias;
      },

      async saveConsultoria(organizationId, payload) {
        const result = await apiFetch('/api/admin/consultorias', {
          method: 'POST',
          body: JSON.stringify({
            organizationId,
            ...payload,
          }),
        });
        return result.consultoria;
      },

      async getDashboardSummary(organizationId) {
        return apiFetch(`/api/admin/dashboard?organizationId=${organizationId}`);
      },

      async getSolicitudesByOng(organizationId) {
        const result = await apiFetch(`/api/admin/solicitudes?organizationId=${organizationId}`);
        return result.solicitudes;
      },

      async updateSolicitudEstado(id, estado, organizationId) {
        await apiFetch(`/api/admin/solicitudes/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ estado, organizationId }),
        });
      },

      async getOrganizations() {
        const result = await apiFetch('/api/admin/organizations');
        return result.organizations;
      },

      async createOrganization(payload) {
        await apiFetch('/api/admin/organizations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      },

      async updateOrganization(id, payload) {
        await apiFetch(`/api/admin/organizations/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      },
    }),
    [],
  );
}
