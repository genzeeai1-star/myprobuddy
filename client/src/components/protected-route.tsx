import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-sm">MP</span>
          </div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    setLocation("/");
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => setLocation("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
