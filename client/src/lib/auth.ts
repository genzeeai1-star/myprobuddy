import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

export interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: "Admin" | "Customer success officer" | "Analyst" | "Operations" | "Manager";
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const login = async (credentials: { username: string; password: string }) => {
    const response = await apiRequest("POST", "/api/auth/login", credentials);
    const data = await response.json();
    queryClient.setQueryData(["/api/auth/me"], data.user);
    return data;
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.clear();
  };

  const hasRole = (roles: string[]) => {
    return user && roles.includes(user.role);
  };

  const hasPermission = (action: string, resource: string) => {
    if (!user) return false;

    const permissions = {
      Admin: {
        users: ["create", "read", "update", "delete"],
        Partners: ["create", "read", "update", "delete"],
        leads: ["create", "read", "update", "delete"],
        reports: ["read", "export"],
        config: ["read", "update"],
      },
      Manager: {
        Partners: ["create", "read", "update"],
        leads: ["create", "read", "update"],
        reports: ["read", "export"],
      },
      "Customer success officer": {
        Partners: ["read", "update"],
        leads: ["read", "update"],
        reports: ["read"],
      },
      Operations: {
        Partners: ["read", "update"],
        leads: ["read", "update"],
        reports: ["read"],
      },
      Analyst: {
        leads: ["read"],
        reports: ["read", "export"],
      },
    };

    const rolePermissions = permissions[user.role as keyof typeof permissions];
    return rolePermissions?.[resource as keyof typeof rolePermissions]?.includes(action) || false;
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    login,
    logout,
    hasRole,
    hasPermission,
  };
}

export const ROLES = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  CUSTOMER_SUCCESS_OFFICER: "Customer success officer",
  OPERATIONS: "Operations",
  ANALYST: "Analyst",
} as const;

export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 5,
  [ROLES.MANAGER]: 4,
  [ROLES.CUSTOMER_SUCCESS_OFFICER]: 3,
  [ROLES.OPERATIONS]: 2,
  [ROLES.ANALYST]: 1,
};

export function canAccessResource(userRole: string, requiredRole: string): boolean {
  return ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] >= 
         ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY];
}
