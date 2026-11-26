/*
 * @feature: Professional Search Hook
 * @description: Debounces the search text (300 ms) so the API is not called on
 *               every keystroke, then loads matching professionals.
 */
import { useEffect, useState } from "react";
import { useAsync } from "@/shared/hooks/useAsync";
import { professionalService } from "../services/professionalService";
export function useProfessionals(role) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [specialty, setSpecialty] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);
  const query = useAsync(() => professionalService.list({ role, q: debounced, specialty }), [role, debounced, specialty]);
  return { ...query, search, setSearch, specialty, setSpecialty };
}
