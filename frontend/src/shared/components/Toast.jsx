/*
 * @feature: Toast Notifications
 * @description: Lightweight global feedback messages (success/error). Wrap the
 *               app in <ToastProvider> and call useToast().notify("Saved").
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Icon } from "./Icon";
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const notify = useCallback((message, tone = "success") => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, message, tone }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3500);
  }, []);
  const api = useMemo(() => ({ notify }), [notify]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${t.tone === "success" ? "bg-navy" : "bg-red-600"}`}
          >
            <Icon name={t.tone === "success" ? "check" : "x"} size={18} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
