import { createContext, use } from "react";

export const ToastContext = createContext({ notify: () => {} });

// notify("Saved") or notify("Could not save", "error")
export const useToast = () => use(ToastContext);
