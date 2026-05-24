import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';

const AuthContext = createContext(null);
const SELECTED_ORG_KEY = 'portal-selected-organization';

export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    initialized: true,
    user: null,
    organizations: [],
  });
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);

  async function refreshSession() {
    const result = await apiFetch('/api/auth/session');
    setSession(result);

    const availableIds = result.organizations.map((organization) => String(organization.id));
    const storedId = window.localStorage.getItem(SELECTED_ORG_KEY);
    const nextId =
      (storedId && availableIds.includes(storedId) && storedId) ||
      availableIds[0] ||
      '';

    setSelectedOrganizationId(nextId);
    if (nextId) {
      window.localStorage.setItem(SELECTED_ORG_KEY, nextId);
    } else {
      window.localStorage.removeItem(SELECTED_ORG_KEY);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const result = await apiFetch('/api/auth/session');
        if (ignore) {
          return;
        }

        setSession(result);

        const availableIds = result.organizations.map((organization) => String(organization.id));
        const storedId = window.localStorage.getItem(SELECTED_ORG_KEY);
        const nextId =
          (storedId && availableIds.includes(storedId) && storedId) ||
          availableIds[0] ||
          '';

        setSelectedOrganizationId(nextId);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      ignore = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      currentUser: session.user,
      initialized: session.initialized,
      organizations: session.organizations,
      selectedOrganizationId,
      selectedOrganization:
        session.organizations.find((organization) => String(organization.id) === String(selectedOrganizationId)) ||
        null,
      loading,
      setSelectedOrganizationId: (organizationId) => {
        setSelectedOrganizationId(String(organizationId));
        window.localStorage.setItem(SELECTED_ORG_KEY, String(organizationId));
      },
      refreshSession,
      signIn: async (email, password) => {
        await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        await refreshSession();
      },
      initializeSetup: async (payload) => {
        await apiFetch('/api/setup', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        await refreshSession();
      },
      logout: async () => {
        await apiFetch('/api/auth/logout', { method: 'POST' });
        setSession((current) => ({ ...current, user: null, organizations: [] }));
        setSelectedOrganizationId('');
        window.localStorage.removeItem(SELECTED_ORG_KEY);
      },
    }),
    [loading, selectedOrganizationId, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
