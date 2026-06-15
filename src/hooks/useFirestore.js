import { useMemo } from 'react';
import { apiFetch } from '../lib/api';

export function useFirestore() {
  return useMemo(
    () => ({
      async getPublicOrganizations() {
        const result = await apiFetch('/api/public/organizations');
        return result.organizations;
      },

      async getConsultoriasPublicas(slug) {
        const result = await apiFetch(`/api/public/organizations/${slug}/consultorias`);
        return result.consultorias;
      },

      async getMaterialesPublicos(slug, consultoriaId) {
        const result = await apiFetch(`/api/public/organizations/${slug}/materiales/${consultoriaId}`);
        return result.materiales;
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

      async deleteConsultoria(organizationId, id) {
        await apiFetch(`/api/admin/consultorias/${id}`, {
          method: 'DELETE',
          body: JSON.stringify({ organizationId }),
        });
      },

      async getMaterialesByConsultoria(organizationId, consultoriaId) {
        const result = await apiFetch(
          `/api/admin/materiales?organizationId=${organizationId}&consultoriaId=${consultoriaId}`,
        );
        return result.materiales;
      },

      async createMaterial(organizationId, payload) {
        const formData = new FormData();
        formData.append('organizationId', organizationId);
        formData.append('consultoriaId', payload.consultoriaId);
        formData.append('titulo', payload.titulo);
        formData.append('descripcion', payload.descripcion || '');
        formData.append('file', payload.file);

        const result = await apiFetch('/api/admin/materiales', {
          method: 'POST',
          body: formData,
        });
        return result.material;
      },

      async deleteMaterial(organizationId, id) {
        await apiFetch(`/api/admin/materiales/${id}`, {
          method: 'DELETE',
          body: JSON.stringify({ organizationId }),
        });
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

      async deleteOrganization(id) {
        await apiFetch(`/api/admin/organizations/${id}`, {
          method: 'DELETE',
        });
      },
    }),
    [],
  );
}
