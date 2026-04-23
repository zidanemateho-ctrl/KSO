import { HelmetProvider } from "react-helmet-async";

import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { AppRouter } from "./routes/AppRouter";

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}
