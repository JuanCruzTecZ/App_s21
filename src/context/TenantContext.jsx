import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/api';

const TenantContext = createContext(null);

const emptyTenant = {
  id: '',
  slug: '',
  nombre: '',
  telegramChatId: '',
};

export function TenantProvider({ children }) {
  const location = useLocation();
  const [tenant, setTenant] = useState(emptyTenant);
  const [loadingTenant, setLoadingTenant] = useState(false);

  useEffect(() => {
    const firstSegment = location.pathname.split('/').filter(Boolean)[0];
    if (!firstSegment || firstSegment === 'admin') {
      setTenant(emptyTenant);
      setLoadingTenant(false);
      return undefined;
    }

    let ignore = false;

    async function loadTenant() {
      setLoadingTenant(true);

      try {
        const result = await apiFetch(`/api/public/organizations/${firstSegment}`);
        if (!ignore) {
          setTenant(result.organization);
        }
      } catch (_error) {
        if (!ignore) {
          setTenant({ ...emptyTenant, slug: firstSegment });
        }
      } finally {
        if (!ignore) {
          setLoadingTenant(false);
        }
      }
    }

    loadTenant();

    return () => {
      ignore = true;
    };
  }, [location.pathname]);

  const value = useMemo(
    () => ({
      tenant,
      loadingTenant,
    }),
    [tenant, loadingTenant],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
