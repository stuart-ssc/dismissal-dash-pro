import { useEffect, useState } from "react";

const STORAGE_KEY = "impersonatedSchoolId";

export function useImpersonation() {
  const [schoolId, setSchoolId] = useState<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) setSchoolId(parsed);
    }
  }, []);

  const impersonate = (id: number | null) => {
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
      setSchoolId(null);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
      setSchoolId(id);
    }
  };

  return { impersonatedSchoolId: schoolId, setImpersonatedSchoolId: impersonate };
}
