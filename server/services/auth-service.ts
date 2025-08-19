import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import type { User, InsertUser } from "@shared/schema";

export interface AuthConfig {
  saltRounds: number;
  sessionSecret: string;
  sessionMaxAge: number;
}

export class AuthService {
  private config: AuthConfig;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = {
      saltRounds: config.saltRounds || 10,
      sessionSecret: config.sessionSecret || process.env.SESSION_SECRET || "default-secret-key",
      sessionMaxAge: config.sessionMaxAge || 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.saltRounds);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await this.hashPassword(userData.passwordHash);
    
    const user: User = {
      id: randomUUID(),
      username: userData.username,
      passwordHash: hashedPassword,
      role: userData.role,
      email: userData.email,
      phone: userData.phone,
    };

    return user;
  }

  validateUserRole(role: string): boolean {
    const validRoles = ["Admin", "Manager", "Customer success officer", "Analyst", "Operations"];
    return validRoles.includes(role);
  }

  hasPermission(userRole: string, action: string, resource: string): boolean {
    const permissions = {
      Admin: {
        users: ["create", "read", "update", "delete"],
        Partners: ["create", "read", "update", "delete"],
        leads: ["create", "read", "update", "delete"],
        reports: ["read", "export"],
        config: ["read", "update"],
        logs: ["read"],
      },
      Manager: {
        Partners: ["create", "read", "update"],
        leads: ["create", "read", "update"],
        reports: ["read", "export"],
        logs: ["read"],
      },
      "Customer success officer": {
        Partners: ["read", "update"],
        leads: ["read", "update"],
        reports: ["read"],
      },
      Operations: {
        leads: ["read", "update"],
        reports: ["read"],
      },
      Analyst: {
        leads: ["read"],
        reports: ["read", "export"],
      },
    };

    const rolePermissions = permissions[userRole as keyof typeof permissions];
    return rolePermissions?.[resource as keyof typeof rolePermissions]?.includes(action) || false;
  }

  canAccessResource(userRole: string, targetResource: string, targetUserId?: string, currentUserId?: string): boolean {
    // Admin can access everything
    if (userRole === "Admin") {
      return true;
    }

    // Managers can access Partner and lead resources
    if (userRole === "Manager" && ["Partners", "leads"].includes(targetResource)) {
      return true;
    }

    // Customer success officers can access Partner and lead resources
    if (userRole === "Customer success officer" && ["Partners", "leads"].includes(targetResource)) {
      return true;
    }

    // Operations can access lead resources only
    if (userRole === "Operations" && ["leads"].includes(targetResource)) {
      return true;
    }

    // Analysts have read-only access to leads and reports
    if (userRole === "Analyst" && ["leads", "reports"].includes(targetResource)) {
      return true;
    }

    return false;
  }

  generateSessionData(user: User) {
    const { passwordHash, ...userWithoutPassword } = user;
    return {
      userId: user.id,
      user: userWithoutPassword,
      loginTime: new Date().toISOString(),
    };
  }

  sanitizeUser(user: User) {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  validateSession(sessionData: any): boolean {
    if (!sessionData || !sessionData.userId || !sessionData.loginTime) {
      return false;
    }

    const loginTime = new Date(sessionData.loginTime);
    const now = new Date();
    const timeDiff = now.getTime() - loginTime.getTime();

    // Check if session has expired
    return timeDiff < this.config.sessionMaxAge;
  }

  getConfig(): AuthConfig {
    return { ...this.config };
  }
}

export const authService = new AuthService({
  saltRounds: 10,
  sessionSecret: process.env.SESSION_SECRET || "myprobuddy-secret-key",
  sessionMaxAge: 24 * 60 * 60 * 1000, // 24 hours
});
