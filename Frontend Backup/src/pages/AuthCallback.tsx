import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, refreshFromToken } = useAuth();

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get("token");

      if (!token) {
        logout();
        navigate("/auth", { replace: true });
        return;
      }

      // Store JWT so subsequent requests can use it
      localStorage.setItem("crm_token", token);

      // Immediately hydrate user from backend so the app
      // treats this session as authenticated without reload.
      await refreshFromToken(token);

      navigate("/", { replace: true });
    };

    run();
  }, [location.search, navigate, logout, refreshFromToken]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

