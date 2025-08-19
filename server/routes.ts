import type { Express } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import { storage } from "./csv-storage";
import { statusEngine } from "./services/status-engine";
import { loginSchema, insertPartnerSchema, insertLeadSchema, grantFormSchema, equityFormSchema, createUserSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import session from "express-session";
import { authService } from "./services/auth-service";



declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: any;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure sessions directory exists and clear any corrupted files
  const sessionsDir = path.join(process.cwd(), 'data', 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  } else {
    // Clear any existing session files to prevent decryption errors
    try {
      const files = fs.readdirSync(sessionsDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(sessionsDir, file));
        }
      });
    } catch (error) {
      console.warn('Could not clear session files:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Session configuration - use memory store to avoid Windows permission issues
  app.use(session({
    secret: process.env.SESSION_SECRET || 'myprobuddy-secret-key',
    resave: false,
    saveUninitialized: false,
    // Use memory store (default) - sessions won't persist across server restarts
    // but this avoids Windows file permission issues
    cookie: { 
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  const requireRole = (roles: string[]) => {
    return async (req: any, res: any, next: any) => {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      req.user = user;
      next();
    };
  };

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      // Try to find user by username first, then by email
      let user = await storage.getUserByUsername(username);
      
      if (!user) {
        // If not found by username, try by email
        user = await storage.getUserByEmail(username);
      }
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      req.session.user = { ...user, passwordHash: undefined };

      await storage.createActivityLog({
        userId: user.id,
        action: "login",
        entity: "user",
        entityId: user.id,
        details: `User ${user.username} logged in`
      });

      res.json({ user: { ...user, passwordHash: undefined } });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    const userId = req.session.userId;
    
    try {
      await new Promise<void>((resolve, reject) => {
        req.session.destroy((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      if (userId) {
        await storage.createActivityLog({
          userId,
          action: "logout",
          entity: "user",
          entityId: userId,
          details: "User logged out"
        });
      }

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Could not log out" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ ...user, passwordHash: undefined });
  });

  // User management routes
  app.get("/api/users", requireRole(["Admin", "Manager", "Customer success officer"]), async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users.map(u => ({ ...u, passwordHash: undefined })));
  });

  app.post("/api/users", requireRole(["Admin"]), async (req, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({
        username: userData.username,
        passwordHash: hashedPassword,
        role: userData.role,
        email: userData.email,
        phone: userData.phone
      });

      await storage.createActivityLog({
        userId: req.session.userId!,
        action: "create",
        entity: "user",
        entityId: user.id,
        details: `Created user ${user.username}`
      });

      res.json({ ...user, passwordHash: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(400).json({ message: "Invalid user data" });
      }
    }
  });

  app.put("/api/users/:id", requireRole(["Admin"]), async (req, res) => {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      
      // If password is provided, hash it
      if (updateData.password) {
        updateData.passwordHash = await bcrypt.hash(updateData.password, 10);
        delete updateData.password;
      }
      
      const user = await storage.updateUser(userId, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.createActivityLog({
        userId: req.session.userId!,
        action: "update",
        entity: "user",
        entityId: user.id,
        details: `Updated user ${user.username}`
      });

      res.json({ ...user, passwordHash: undefined });
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.delete("/api/users/:id", requireRole(["Admin"]), async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent deleting the current user
      if (userId === req.session.userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.createActivityLog({
        userId: req.session.userId!,
        action: "delete",
        entity: "user",
        entityId: userId,
        details: `Deleted user ${user.username}`
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete user" });
    }
  });

  // Partner routes
  app.get("/api/partners", requireRole(["Admin", "Manager", "Customer success officer", "Operations", "Analyst"]), async (req, res) => {
    const partners = await storage.getAllPartners();
    res.json(partners);
  });

  app.post("/api/partners", requireRole(["Admin", "Manager"]), async (req, res) => {
    try {
      const PartnerData = insertPartnerSchema.parse(req.body);
      const Partner = await storage.createPartner(PartnerData);

      await storage.createActivityLog({
        userId: req.session.userId!,
        action: "create",
        entity: "Partner",
        entityId: Partner.id,
        details: `Created Partner ${Partner.name}`
      });

      res.json(Partner);
    } catch (error) {
      res.status(400).json({ message: "Invalid Partner data" });
    }
  });

  app.get("/api/partners/:id", requireRole(["Admin", "Manager", "Partner"]), async (req, res) => {
    const partner = await storage.getPartner(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }
    res.json(partner);
  });

  app.put("/api/partners/:id", requireRole(["Admin", "Manager"]), async (req, res) => {
    try {
      const Partner = await storage.updatePartner(req.params.id, req.body);
      if (!Partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      await storage.createActivityLog({
        userId: req.session.userId!,
        action: "update",
        entity: "Partner",
        entityId: Partner.id,
        details: `Updated Partner ${Partner.name}`
      });

      res.json(Partner);
    } catch (error) {
      res.status(400).json({ message: "Invalid Partner data" });
    }
  });

  app.delete("/api/partners/:id", requireRole(["Admin"]), async (req, res) => {
    const success = await storage.deletePartner(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Partner not found" });
    }

    await storage.createActivityLog({
      userId: req.session.userId!,
      action: "delete",
      entity: "Partner",
      entityId: req.params.id,
      details: `Deleted Partner`
    });

    res.json({ message: "Partner deleted successfully" });
  });

  app.post("/api/partners/:id/regenerate-links", requireRole(["Admin", "Manager"]), async (req, res) => {
    try {
      const partner = await storage.getPartner(req.params.id);
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      const updatedPartner = await storage.regeneratePartnerLinks(req.params.id);
      if (!updatedPartner) {
        return res.status(500).json({ message: "Failed to regenerate links" });
      }

      await storage.createActivityLog({
        userId: req.session.userId!,
        action: "regenerate_links",
        entity: "Partner",
        entityId: partner.id,
        details: `Regenerated links for Partner ${partner.name}`
      });

      res.json(updatedPartner);
    } catch (error) {
      res.status(500).json({ message: "Failed to regenerate links" });
    }
  });

  // Lead routes
  app.get("/api/leads", requireRole(["Admin", "Manager", "Customer success officer", "Operations", "Analyst"]), async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    let leads = await storage.getAllLeads();

    // Filter leads based on role
    if (user?.role === "Partner") {
      // Partners can only see their own leads
      const Partners = await storage.getAllPartners();
      const userPartner = Partners.find(m => m.email === user.email);
      if (userPartner) {
        leads = leads.filter(lead => lead.PartnerId === userPartner.id);
      } else {
        leads = [];
      }
    }

    res.json(leads);
  });

  // Get leads with filters - MUST be before /api/leads/:id to avoid route conflict
  app.get("/api/leads/filter", requireRole(["Admin", "Manager", "Customer success officer", "Operations", "Analyst"]), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const { 
        search, 
        status, 
        serviceType, 
        assignedToUserId, 
        dateFrom, 
        dateTo,
        page = 1,
        limit = 50
      } = req.query;

      // Filter endpoint called with query params

      const filters: any = {};
      
      if (search) {
        filters.search = search as string;
      }
      if (status) {
        filters.status = status as string;
      }
      if (serviceType) {
        filters.serviceType = serviceType as string;
      }
      if (assignedToUserId) {
        filters.assignedToUserId = assignedToUserId as string;
      }
      if (dateFrom) {
        filters.dateFrom = dateFrom as string;
      }
      if (dateTo) {
        filters.dateTo = dateTo as string;
      }

              // Applied filters

      // Filter leads based on role
      if (user?.role === "Partner") {
        // Partners can only see their own leads
        const Partners = await storage.getAllPartners();
        const userPartner = Partners.find(m => m.email === user.email);
        if (userPartner) {
          filters.partnerId = userPartner.id;
        } else {
          // If no partner found, return empty results
          res.json({ leads: [], total: 0, page: parseInt(page as string), totalPages: 0 });
          return;
        }
      }

      const leads = await storage.getLeadsWithFilters(filters, parseInt(page as string), parseInt(limit as string));
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to filter leads" });
    }
  });

  // Get leads requiring attention - MUST be before /api/leads/:id to avoid route conflict
  app.get("/api/leads/requiring-attention", requireAuth, async (req, res) => {
    try {
      const attentionLeads = await statusEngine.getLeadsRequiringAttention();
      res.json(attentionLeads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads requiring attention" });
    }
  });

  // Status overview - must be before /api/leads/:id to avoid route conflict
  app.get("/api/leads/status-overview", requireRole(["Admin", "Manager", "Customer success officer", "Operations", "Analyst"]), async (req, res) => {
    try {
      const { dateFrom, dateTo, assignedToUserId, partnerId, leadType, statusType } = req.query;
      
      let leads = await storage.getAllLeads();
      

      
      // Filter by date range if provided
      if (dateFrom || dateTo) {
        leads = leads.filter((lead: any) => {
          const leadDate = new Date(lead.createdOnDate);
          const fromDate = dateFrom ? new Date(dateFrom as string + 'T00:00:00') : null;
          const toDate = dateTo ? new Date(dateTo as string + 'T23:59:59') : null;
          

          
          if (fromDate && toDate) {
            return leadDate >= fromDate && leadDate <= toDate;
          } else if (fromDate) {
            return leadDate >= fromDate;
          } else if (toDate) {
            return leadDate <= toDate;
          }
          return true;
        });
      }
      
      // Filter by assigned user if provided
      if (assignedToUserId) {
        leads = leads.filter((lead: any) => lead.assignedToUserId === assignedToUserId);
      }
      
      // Filter by partner if provided
      if (partnerId) {
        // First get the partner name from the partner ID
        const partners = await storage.getAllPartners();
        const partner = partners.find((p: any) => p.id === partnerId);
        if (partner) {
          leads = leads.filter((lead: any) => lead.PartnerName === partner.businessName);
        }
      }
      
      // Filter by lead type if provided
      if (leadType) {
        leads = leads.filter((lead: any) => {
          // Map deliveryType/serviceType to leadType
          if (leadType === "equity" && (lead.deliveryType === "Equity" || lead.serviceType === "Equity")) {
            return true;
          }
          if (leadType === "grants" && (lead.deliveryType === "Grant" || lead.serviceType === "Grant")) {
            return true;
          }
          return false;
        });
      }
      
      // Define active and inactive statuses
      const activeStatuses = [
        "New Lead", "RNR", "Call Back", "Not Interested", "Interested", "Screening Pass",
        "Proposal to be Sent", "Proposal Sent", "Payment Link Sent", "Not Paid", "Paid", "To Apply", "Applied", "Approved"
      ];
      
      const inactiveStatuses = [
        "Reject - RNR", "Reject - Not Attend", "Reject - Not Interested", "Reject - Screening Fail",
        "Reject - Payment Not Done", "Final Reject", "Rules Reject", "Rejected"
      ];
      
      // Filter by status type if provided
      if (statusType === "active") {
        leads = leads.filter((lead: any) => activeStatuses.includes(lead.currentStatus));
      } else if (statusType === "inactive") {
        leads = leads.filter((lead: any) => inactiveStatuses.includes(lead.currentStatus));
      }
      

      
      // Count leads by status
      const activeStatusesCount: { [key: string]: number } = {};
      const inactiveStatusesCount: { [key: string]: number } = {};
      
      leads.forEach((lead: any) => {
        if (activeStatuses.includes(lead.currentStatus)) {
          activeStatusesCount[lead.currentStatus] = (activeStatusesCount[lead.currentStatus] || 0) + 1;
        } else if (inactiveStatuses.includes(lead.currentStatus)) {
          inactiveStatusesCount[lead.currentStatus] = (inactiveStatusesCount[lead.currentStatus] || 0) + 1;
        }
      });
      
      const result = {
        activeStatuses: activeStatusesCount,
        inactiveStatuses: inactiveStatusesCount,
        totalLeads: leads.length,
        totalActive: Object.values(activeStatusesCount).reduce((a: number, b: number) => a + b, 0),
        totalInactive: Object.values(inactiveStatusesCount).reduce((a: number, b: number) => a + b, 0)
      };
      

      
      res.json(result);
    } catch (error) {
      console.error("Error fetching status overview:", error);
      res.status(500).json({ message: "Failed to fetch status overview" });
    }
  });

  app.get("/api/leads/:id", requireRole(["Admin", "Manager", "Customer success officer", "Operations", "Analyst"]), async (req, res) => {
    const lead = await storage.getLead(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const user = await storage.getUser(req.session.userId!);
    
    // Check permissions
    if (user?.role === "Partner") {
      const Partners = await storage.getAllPartners();
      const userPartner = Partners.find(m => m.email === user.email);
      if (!userPartner || lead.PartnerId !== userPartner.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.json(lead);
  });

  app.post("/api/leads", requireRole(["Admin", "Manager", "Partner"]), async (req, res) => {
    try {
      const leadData = insertLeadSchema.parse(req.body);
      
      // Check for duplicate phone number
      const existingLeadWithPhone = await storage.getLeadByPhone(leadData.phone);
      
      if (existingLeadWithPhone) {
        return res.status(400).json({ 
          message: "A lead with this phone number already exists",
          details: `Phone number ${leadData.phone} is already used by ${existingLeadWithPhone.companyName}`
        });
      }
      
      const lead = await storage.createLead(leadData);

      await storage.createActivityLog({
        userId: req.session.userId!,
        action: "create",
        entity: "lead",
        entityId: lead.id,
        details: `Created lead for ${lead.companyName}`
      });

      res.json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(400).json({ message: "Invalid lead data" });
      }
    }
  });

  app.put("/api/leads/:id", requireRole(["Admin", "Manager"]), async (req, res) => {
    try {
      const existingLead = await storage.getLead(req.params.id);
      if (!existingLead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check for duplicate phone number if phone is being updated
      if (req.body.phone && req.body.phone !== existingLead.phone) {
        const existingLeadWithPhone = await storage.getLeadByPhone(req.body.phone);
        
        if (existingLeadWithPhone && existingLeadWithPhone.id !== req.params.id) {
          return res.status(400).json({ 
            message: "A lead with this phone number already exists",
            details: `Phone number ${req.body.phone} is already used by ${existingLeadWithPhone.companyName}`
          });
        }
      }

      const lead = await storage.updateLead(req.params.id, req.body);

      // Log status change if status was updated
      if (req.body.currentStatus && req.body.currentStatus !== existingLead.currentStatus) {
        await storage.createActivityLog({
          userId: req.session.userId!,
          action: "status_change",
          entity: "lead",
          entityId: lead!.id,
          details: `Changed status from "${existingLead.currentStatus}" to "${req.body.currentStatus}" for ${lead!.companyName}`
        });
      } else {
        await storage.createActivityLog({
          userId: req.session.userId!,
          action: "update",
          entity: "lead",
          entityId: lead!.id,
          details: `Updated lead for ${lead!.companyName}`
        });
      }

      res.json(lead);
    } catch (error) {
      res.status(400).json({ message: "Invalid lead data" });
    }
  });

  app.delete("/api/leads/:id", requireRole(["Admin"]), async (req, res) => {
    const lead = await storage.getLead(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const success = await storage.deleteLead(req.params.id);
    if (!success) {
      return res.status(400).json({ message: "Failed to delete lead" });
    }

    await storage.createActivityLog({
      userId: req.session.userId!,
      action: "delete",
      entity: "lead",
      entityId: req.params.id,
      details: `Deleted lead for ${lead.companyName}`
    });

    res.json({ message: "Lead deleted successfully" });
  });

  // Status management endpoints
  app.get("/api/status-hierarchy", requireAuth, async (req, res) => {
    try {
      const statusHierarchy = await statusEngine.getStatusHierarchy();
      res.json(statusHierarchy);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch status hierarchy" });
    }
  });

  app.get("/api/leads/:id/available-transitions", requireAuth, async (req, res) => {
    try {
      // Available transitions endpoint called for lead ID
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        // Lead not found for ID
        return res.status(404).json({ message: "Lead not found" });
      }

      // Lead found and available transitions returned
      const availableTransitions = await statusEngine.getAvailableTransitions(lead.currentStatus);
      console.log(`Available transitions for "${lead.currentStatus}":`, availableTransitions);
      res.json({ availableTransitions });
    } catch (error) {
      console.error("Error in available-transitions endpoint:", error);
      res.status(500).json({ message: "Failed to fetch available transitions" });
    }
  });

  // Debug endpoint to check current status hierarchy
  app.get("/api/debug/status-hierarchy", requireRole(["Admin"]), async (req, res) => {
    try {
      const statusHierarchy = await storage.getAllStatusHierarchy();
      res.json({ statusHierarchy });
    } catch (error) {
      console.error("Error fetching status hierarchy:", error);
      res.status(500).json({ message: "Failed to fetch status hierarchy" });
    }
  });

  // Force reinitialize status hierarchy
  app.post("/api/debug/reinitialize-status-hierarchy", requireRole(["Admin"]), async (req, res) => {
    try {
      // Clear existing status hierarchy
      const existingStatuses = await storage.getAllStatusHierarchy();
      for (const status of existingStatuses) {
        await storage.deleteStatusHierarchy(status.id);
      }
      
      // Reinitialize with default status hierarchy
      await initializeStatusHierarchy();
      
      const newStatusHierarchy = await storage.getAllStatusHierarchy();
      res.json({ 
        message: "Status hierarchy reinitialized successfully", 
        statusHierarchy: newStatusHierarchy 
      });
    } catch (error) {
      console.error("Error reinitializing status hierarchy:", error);
      res.status(500).json({ message: "Failed to reinitialize status hierarchy" });
    }
  });

  app.post("/api/leads/:id/change-status", requireRole(["Admin", "Manager", "Customer success officer", "Operations"]), async (req, res) => {
    try {
      const { newStatus } = req.body;
      if (!newStatus) {
        return res.status(400).json({ message: "New status is required" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Validate the status transition
      const isValidTransition = await statusEngine.validateStatusTransition(lead.currentStatus, newStatus);
      if (!isValidTransition) {
        return res.status(400).json({ message: "Invalid status transition" });
      }

      // Update the lead status
      const updatedLead = await storage.updateLead(req.params.id, {
        lastStatus: lead.currentStatus,
        currentStatus: newStatus,
        lastStatusUpdatedDate: new Date().toISOString()
      });

      if (!updatedLead) {
        return res.status(500).json({ message: "Failed to update lead status" });
      }

      // Auto-assign to Manager when status becomes "Screening Pass"
      if (newStatus === "Screening Pass") {
        const allUsers = await storage.getAllUsers();
        const managerUser = allUsers.find(user => user.role === "Manager");
        if (managerUser) {
          await storage.updateLead(req.params.id, {
            assignedToUserId: managerUser.id
          });
          
          // Log the auto-assignment
          await storage.createActivityLog({
            userId: req.session.userId!,
            action: "auto_assign",
            entity: "lead",
            entityId: lead.id,
            details: `Auto-assigned lead ${lead.companyName} to Manager ${managerUser.username} after status change to Screening Pass`
          });
        }
      }

      // Log the status change
      await storage.createActivityLog({
        userId: req.session.userId!,
        action: "status_change",
        entity: "lead",
        entityId: lead.id,
        details: `Changed status from "${lead.currentStatus}" to "${newStatus}" for ${lead.companyName}`
      });

      res.json({ message: "Status updated successfully", lead: updatedLead });
    } catch (error) {
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.post("/api/status-engine/process-automatic", requireRole(["Admin"]), async (req, res) => {
    try {
      await statusEngine.processAutomaticStatusChanges();
      res.json({ message: "Automatic status processing completed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process automatic status changes" });
    }
  });

  // Lead submission routes (public)
  // GET routes to serve the submission forms
  app.get("/submit/:PartnerId/grant", async (req, res) => {
    try {
      const PartnerId = req.params.PartnerId;
      const Partner = await storage.getPartner(PartnerId);
      
      if (!Partner) {
        return res.status(404).send(`
          <html>
            <head><title>Partner Not Found</title></head>
            <body>
              <h1>404 - Partner Not Found</h1>
              <p>The partner link you're trying to access does not exist.</p>
            </body>
          </html>
        `);
      }

      // Serve a simple grant form HTML for lead creation
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Grant Application - ${Partner.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
          <style>
            .gradient-bg {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .form-input:focus {
              box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            .btn-primary {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              transition: all 0.3s ease;
            }
            .btn-primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
            }
            .card-shadow {
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            }
          </style>
        </head>
        <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
          <div class="container mx-auto px-4 py-8 max-w-4xl">
            <!-- Header -->
            <div class="text-center mb-8">
              <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4">
                <i class="fas fa-hand-holding-usd text-white text-2xl"></i>
              </div>
              <h1 class="text-4xl font-bold text-gray-900 mb-2">Grant Application</h1>
              <p class="text-xl text-gray-600">${Partner.name}</p>
              <div class="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto mt-4 rounded-full"></div>
            </div>
            
            <!-- Form Card -->
            <div class="bg-white rounded-2xl card-shadow p-8">
              <div class="mb-6">
                <h2 class="text-2xl font-semibold text-gray-900 mb-2">Business Information</h2>
                <p class="text-gray-600">Please provide your business details to help us understand your funding needs.</p>
              </div>
              
              <form id="grantForm" class="space-y-6">
                <!-- Company Information -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">
                      <i class="fas fa-building text-blue-500 mr-2"></i>Company Name
                    </label>
                    <input type="text" name="companyName" required 
                           class="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                           placeholder="Enter your company name">
                  </div>
                  
                  <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">
                      <i class="fas fa-user text-blue-500 mr-2"></i>Founder Name
                    </label>
                    <input type="text" name="founderName" required 
                           class="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                           placeholder="Enter founder's name">
                  </div>
                </div>

                <!-- Contact Information -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">
                      <i class="fas fa-phone text-blue-500 mr-2"></i>Contact Number
                    </label>
                    <input type="tel" name="contact" required 
                           class="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                           placeholder="+91 98765 43210">
                  </div>
                  
                  <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">
                      <i class="fas fa-envelope text-blue-500 mr-2"></i>Email Address
                    </label>
                    <input type="email" name="email" required 
                           class="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                           placeholder="founder@company.com">
                  </div>
                </div>

                <!-- Business Description -->
                <div class="space-y-2">
                  <label class="block text-sm font-semibold text-gray-700">
                    <i class="fas fa-lightbulb text-blue-500 mr-2"></i>Business Description
                  </label>
                  <textarea name="businessDescription" rows="4" required 
                            class="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none"
                            placeholder="Describe your business idea, mission, and what makes it unique..."></textarea>
                </div>

                <!-- Funding and Industry -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">
                      <i class="fas fa-rupee-sign text-blue-500 mr-2"></i>Funding Amount Required
                    </label>
                    <div class="relative">
                      <span class="absolute left-3 top-3 text-gray-500">₹</span>
                      <input type="number" name="fundingAmount" required 
                             class="form-input w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                             placeholder="5000000">
                    </div>
                  </div>
                  
                  <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">
                      <i class="fas fa-industry text-blue-500 mr-2"></i>Industry
                    </label>
                    <select name="industry" required 
                            class="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                      <option value="">Select Industry</option>
                      <option value="Technology">🚀 Technology</option>
                      <option value="Healthcare">🏥 Healthcare</option>
                      <option value="Education">📚 Education</option>
                      <option value="Finance">💰 Finance</option>
                      <option value="Manufacturing">🏭 Manufacturing</option>
                      <option value="Retail">🛍️ Retail</option>
                      <option value="Agriculture">🌾 Agriculture</option>
                      <option value="Other">🔧 Other</option>
                    </select>
                  </div>
                </div>

                <!-- Submit Button -->
                <div class="pt-6">
                  <button type="submit" 
                          class="btn-primary w-full text-white py-4 px-6 rounded-lg font-semibold text-lg focus:outline-none focus:ring-4 focus:ring-blue-300">
                    <i class="fas fa-paper-plane mr-2"></i>
                    Submit Grant Application
                  </button>
                </div>
              </form>
              
              <!-- Success Message -->
              <div id="successMessage" class="hidden mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <i class="fas fa-check-circle text-green-500 text-2xl"></i>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-lg font-semibold text-green-800">Application Submitted Successfully!</h3>
                    <p class="text-green-700 mt-1">We've received your application and will contact you within 2-3 business days.</p>
                  </div>
                </div>
              </div>
              
              <!-- Error Message -->
              <div id="errorMessage" class="hidden mt-6 p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-lg font-semibold text-red-800">Error Submitting Application</h3>
                    <p id="errorText" class="text-red-700 mt-1"></p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="text-center mt-8 text-gray-500">
              <p>Powered by MyProBuddy - Empowering Entrepreneurs</p>
            </div>
          </div>
          
          <script>
            document.getElementById('grantForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const submitBtn = e.target.querySelector('button[type="submit"]');
              const originalText = submitBtn.innerHTML;
              submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
              submitBtn.disabled = true;
              
              const formData = new FormData(e.target);
              const data = Object.fromEntries(formData.entries());
              
              try {
                const response = await fetch('/api/submit/${PartnerId}/grant', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(data)
                });
                
                if (response.ok) {
                  document.getElementById('successMessage').classList.remove('hidden');
                  document.getElementById('grantForm').classList.add('hidden');
                } else {
                  const errorData = await response.json();
                  document.getElementById('errorText').textContent = errorData.message || 'An error occurred while submitting your application.';
                  document.getElementById('errorMessage').classList.remove('hidden');
                  submitBtn.innerHTML = originalText;
                  submitBtn.disabled = false;
                }
              } catch (error) {
                document.getElementById('errorText').textContent = 'Network error occurred. Please check your connection and try again.';
                document.getElementById('errorMessage').classList.remove('hidden');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
              }
            });
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      res.status(500).send(`
        <html>
          <head><title>Server Error</title></head>
          <body>
            <h1>500 - Server Error</h1>
            <p>An error occurred while loading the form.</p>
          </body>
        </html>
      `);
    }
  });

  app.get("/submit/:PartnerId/equity", async (req, res) => {
    try {
      const PartnerId = req.params.PartnerId;
      const Partner = await storage.getPartner(PartnerId);
      
      if (!Partner) {
        return res.status(404).send(`
          <html>
            <head><title>Partner Not Found</title></head>
            <body>
              <h1>404 - Partner Not Found</h1>
              <p>The partner link you're trying to access does not exist.</p>
            </body>
          </html>
        `);
      }

      // Serve a simple equity form HTML for lead creation
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Equity Application - ${Partner.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
          <style>
            .gradient-bg {
              background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            }
            .form-input:focus {
              box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
            }
            .btn-primary {
              background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
              transition: all 0.3s ease;
            }
            .btn-primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 25px rgba(139, 92, 246, 0.3);
            }
            .card-shadow {
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            }
          </style>
        </head>
        <body class="bg-gradient-to-br from-purple-50 to-pink-100 min-h-screen">
          <div class="container mx-auto px-4 py-8 max-w-4xl">
            <!-- Header -->
            <div class="text-center mb-8">
              <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-4">
                <i class="fas fa-chart-line text-white text-2xl"></i>
              </div>
              <h1 class="text-4xl font-bold text-gray-900 mb-2">Equity Application</h1>
              <p class="text-xl text-gray-600">${Partner.name}</p>
              <div class="w-24 h-1 bg-gradient-to-r from-purple-500 to-pink-600 mx-auto mt-4 rounded-full"></div>
            </div>
            
            <!-- Form Card -->
            <div class="bg-white rounded-2xl card-shadow p-8">
              <div class="mb-6">
                <h2 class="text-2xl font-semibold text-gray-900 mb-2">Investment Information</h2>
                <p class="text-gray-600">Please provide your business details to help us understand your investment opportunity.</p>
              </div>
              
              <form id="equityForm" class="space-y-6">
                <!-- Company Information -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">
                      <i class="fas fa-building text-purple-500 mr-2"></i>Company Name
                    </label>
                    <input type="text" name="companyName" required 
                           class="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                           placeholder="Enter your company name">
                  </div>
                  
                  <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">
                      <i class="fas fa-user text-purple-500 mr-2"></i>Founder Name
                    </label>
                    <input type="text" name="founderName" required 
                           class="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                           placeholder="Enter founder's name">
                  </div>
                </div>

                <!-- Contact Information -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">
                      <i class="fas fa-phone text-purple-500 mr-2"></i>Contact Number
                    </label>
                    <input type="tel" name="contact" required 
                           class="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                           placeholder="+91 98765 43210">
                  </div>
                  
                  <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">
                      <i class="fas fa-envelope text-purple-500 mr-2"></i>Email Address
                    </label>
                    <input type="email" name="email" required 
                           class="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                           placeholder="founder@company.com">
                  </div>
                </div>

                <!-- Business Description -->
                <div class="space-y-2">
                  <label class="block text-sm font-semibold text-gray-700">
                    <i class="fas fa-lightbulb text-purple-500 mr-2"></i>Business Description
                  </label>
                  <textarea name="businessDescription" rows="4" required 
                            class="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 resize-none"
                            placeholder="Describe your business model, growth potential, and investment opportunity..."></textarea>
                </div>

                <!-- Investment Details -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">
                      <i class="fas fa-percentage text-purple-500 mr-2"></i>Equity Percentage Offered
                    </label>
                    <div class="relative">
                      <input type="number" name="equityPercentage" min="1" max="100" required 
                             class="form-input w-full pr-8 pl-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                             placeholder="25">
                      <span class="absolute right-3 top-3 text-gray-500">%</span>
                    </div>
                  </div>
                  
                  <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">
                      <i class="fas fa-rupee-sign text-purple-500 mr-2"></i>Company Valuation
                    </label>
                    <div class="relative">
                      <span class="absolute left-3 top-3 text-gray-500">₹</span>
                      <input type="number" name="valuation" required 
                             class="form-input w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                             placeholder="10000000">
                    </div>
                  </div>
                </div>

                <!-- Industry -->
                <div class="space-y-2">
                  <label class="block text-sm font-semibold text-gray-700">
                    <i class="fas fa-industry text-purple-500 mr-2"></i>Industry
                  </label>
                  <select name="industry" required 
                          class="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200">
                    <option value="">Select Industry</option>
                    <option value="Technology">🚀 Technology</option>
                    <option value="Healthcare">🏥 Healthcare</option>
                    <option value="Education">📚 Education</option>
                    <option value="Finance">💰 Finance</option>
                    <option value="Manufacturing">🏭 Manufacturing</option>
                    <option value="Retail">🛍️ Retail</option>
                    <option value="Agriculture">🌾 Agriculture</option>
                    <option value="Other">🔧 Other</option>
                  </select>
                </div>

                <!-- Submit Button -->
                <div class="pt-6">
                  <button type="submit" 
                          class="btn-primary w-full text-white py-4 px-6 rounded-lg font-semibold text-lg focus:outline-none focus:ring-4 focus:ring-purple-300">
                    <i class="fas fa-paper-plane mr-2"></i>
                    Submit Equity Application
                  </button>
                </div>
              </form>
              
              <!-- Success Message -->
              <div id="successMessage" class="hidden mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <i class="fas fa-check-circle text-green-500 text-2xl"></i>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-lg font-semibold text-green-800">Application Submitted Successfully!</h3>
                    <p class="text-green-700 mt-1">We've received your application and will contact you within 2-3 business days.</p>
                  </div>
                </div>
              </div>
              
              <!-- Error Message -->
              <div id="errorMessage" class="hidden mt-6 p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-lg font-semibold text-red-800">Error Submitting Application</h3>
                    <p id="errorText" class="text-red-700 mt-1"></p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="text-center mt-8 text-gray-500">
              <p>Powered by MyProBuddy - Empowering Entrepreneurs</p>
            </div>
          </div>
          
          <script>
            document.getElementById('equityForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const submitBtn = e.target.querySelector('button[type="submit"]');
              const originalText = submitBtn.innerHTML;
              submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
              submitBtn.disabled = true;
              
              const formData = new FormData(e.target);
              const data = Object.fromEntries(formData.entries());
              
              try {
                const response = await fetch('/api/submit/${PartnerId}/equity', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(data)
                });
                
                if (response.ok) {
                  document.getElementById('successMessage').classList.remove('hidden');
                  document.getElementById('equityForm').classList.add('hidden');
                } else {
                  const errorData = await response.json();
                  document.getElementById('errorText').textContent = errorData.message || 'An error occurred while submitting your application.';
                  document.getElementById('errorMessage').classList.remove('hidden');
                  submitBtn.innerHTML = originalText;
                  submitBtn.disabled = false;
                }
              } catch (error) {
                document.getElementById('errorText').textContent = 'Network error occurred. Please check your connection and try again.';
                document.getElementById('errorMessage').classList.remove('hidden');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
              }
            });
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      res.status(500).send(`
        <html>
          <head><title>Server Error</title></head>
          <body>
            <h1>500 - Server Error</h1>
            <p>An error occurred while loading the form.</p>
          </body>
        </html>
      `);
    }
  });

  app.post("/api/submit/:PartnerId/grant", async (req, res) => {
    try {
      const PartnerId = req.params.PartnerId;
      const Partner = await storage.getPartner(PartnerId);
      
      if (!Partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      // Validate required fields without strict schema
      const { companyName, founderName, contact, email, businessDescription, fundingAmount, industry, companyAge } = req.body;
      
      if (!companyName || !founderName || !contact || !email || !businessDescription || !fundingAmount || !industry) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }
      
      const lead = await storage.createLead({
        companyName: companyName,
        founderName: founderName,
        ownerName: founderName,
        contact: contact,
        email: email,
        phone: contact,
        deliveryType: "Grant",
        serviceType: "Grant",
        formDataJSON: JSON.stringify({
          companyName,
          founderName,
          contact,
          email,
          businessDescription,
          fundingAmount: parseInt(fundingAmount),
          industry,
          // Add additional fields with default values for compatibility
          websiteLink: "",
          isRegistered: "no",
          address: "",
          companyType: "Private Limited",
          startupSector: industry,
          numberOfFounders: 1,
          gender: "Not Specified",
          area: "Not Specified",
          oneLiner: businessDescription,
          keyFocusArea: industry,
          companyAge: parseInt(companyAge) || 0,
          fundingRequirement: parseInt(fundingAmount),
          source: "Web Form"
        }),
        lastStatus: "New Lead",
        currentStatus: (parseInt(companyAge) || 0) > 3 ? "Rules Reject" : "New Lead",
        PartnerId,
        createdByUserId: "system"
      });

      await storage.createActivityLog({
        userId: "system",
        action: "submit",
        entity: "lead",
        entityId: lead.id,
        details: `Grant application submitted for ${lead.companyName}${(parseInt(companyAge) || 0) > 3 ? ` - Automatically moved to Rules Reject due to company age (${companyAge} years)` : ''}`
      });

      res.json({ message: "Grant application submitted successfully", leadId: lead.id });
    } catch (error) {
      console.error("Grant submission error:", error);
      res.status(400).json({ message: "Invalid form data" });
    }
  });

  app.post("/api/submit/:PartnerId/equity", async (req, res) => {
    try {
      const PartnerId = req.params.PartnerId;
      const Partner = await storage.getPartner(PartnerId);
      
      if (!Partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      // Validate required fields without strict schema
      const { companyName, founderName, contact, email, businessDescription, equityPercentage, valuation, industry } = req.body;
      
      if (!companyName || !founderName || !contact || !email || !businessDescription || !equityPercentage || !valuation || !industry) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }
      
      const lead = await storage.createLead({
        companyName: companyName,
        founderName: founderName,
        ownerName: founderName,
        contact: contact,
        email: email,
        phone: contact,
        deliveryType: "Equity",
        serviceType: "Equity",
        formDataJSON: JSON.stringify({
          companyName,
          founderName,
          contact,
          email,
          businessDescription,
          equityPercentage: parseInt(equityPercentage),
          valuation: parseInt(valuation),
          industry,
          // Add additional fields with default values for compatibility
          address: "",
          registrationType: "Private Limited",
          problemSolution: businessDescription,
          keyTeam: founderName,
          businessStage: "Early Stage",
          competitors: "Not Specified",
          revenueProjections: 0,
          profitability: "Not Specified",
          expenses: 0,
          runway: 12,
          fundingAmount: parseInt(valuation) * (parseInt(equityPercentage) / 100),
          purpose: "Business Growth",
          equityWillingness: "yes",
          percentageEquity: parseInt(equityPercentage),
          milestones: "Not Specified",
          threeToFiveYearVision: "Not Specified",
          exitStrategy: "Not Specified",
          fundingType: "Equity",
          source: "Web Form"
        }),
        lastStatus: "New Lead",
        currentStatus: "New Lead",
        PartnerId,
        createdByUserId: "system"
      });

      await storage.createActivityLog({
        userId: "system",
        action: "submit",
        entity: "lead",
        entityId: lead.id,
        details: `Equity application submitted for ${lead.companyName}`
      });

      res.json({ message: "Equity application submitted successfully", leadId: lead.id });
    } catch (error) {
      console.error("Equity submission error:", error);
      res.status(400).json({ message: "Invalid form data" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    const { period = "this-month" } = req.query;
    console.log('Server: Dashboard stats requested for period:', period);
    
    const user = await storage.getUser(req.session.userId!);
    const Partners = await storage.getAllPartners();
    const leads = await storage.getAllLeads();
    const users = await storage.getAllUsers();
    const activityLogs = await storage.getAllActivityLogs();
    
    console.log('Server: Total leads before filtering:', leads.length);

    // Filter leads based on period
    let periodFilteredLeads = leads;
    const now = new Date();
    
    if (period === "this-month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      periodFilteredLeads = leads.filter(lead => new Date(lead.createdOnDate) >= startOfMonth);
    } else if (period === "last-month") {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      periodFilteredLeads = leads.filter(lead => {
        const leadDate = new Date(lead.createdOnDate);
        return leadDate >= startOfLastMonth && leadDate <= endOfLastMonth;
      });
    } else if (period === "this-quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      periodFilteredLeads = leads.filter(lead => new Date(lead.createdOnDate) >= startOfQuarter);
    }
    
    console.log('Server: Period filtered leads:', periodFilteredLeads.length);

    // Filter data based on role
    let filteredLeads = periodFilteredLeads;
    let filteredPartners = Partners;

    if (user?.role === "Partner") {
      const userPartner = Partners.find(m => m.email === user.email);
      if (userPartner) {
        filteredLeads = periodFilteredLeads.filter(lead => lead.PartnerId === userPartner.id);
        filteredPartners = [userPartner];
      } else {
        filteredLeads = [];
        filteredPartners = [];
      }
    }

    // Calculate comprehensive statistics
    const totalLeads = filteredLeads.length;
    const activeLeads = filteredLeads.filter(lead => !lead.currentStatus.includes("Reject") && lead.currentStatus !== "Approved").length;
    const approvedLeads = filteredLeads.filter(lead => lead.currentStatus === "Approved").length;
    const rejectedLeads = filteredLeads.filter(lead => lead.currentStatus.includes("Reject")).length;
    
    // User-wise statistics
    const userStats = users.map(u => {
      const userLogs = activityLogs.filter(log => log.userId === u.id);
      const userLeads = filteredLeads.filter(lead => 
        userLogs.some(log => log.entityId === lead.id && log.entity === "lead")
      );
      
      return {
        userId: u.id,
        username: u.username,
        role: u.role,
        totalActions: userLogs.length,
        leadsCreated: userLogs.filter(log => log.action === "create" && log.entity === "lead").length,
        leadsUpdated: userLogs.filter(log => log.action === "update" && log.entity === "lead").length,
        PartnersManaged: userLogs.filter(log => log.entity === "Partner").length,
        lastActivity: userLogs.length > 0 ? userLogs[userLogs.length - 1].timestamp : null
      };
    });

    // Lead conversion funnel
    const funnelData = {
      "New Lead": filteredLeads.filter(l => l.currentStatus === "New Lead").length,
      "Interested": filteredLeads.filter(l => l.currentStatus === "Interested").length,
      "Screening": filteredLeads.filter(l => l.currentStatus === "Screening").length,
      "Screening Pass": filteredLeads.filter(l => l.currentStatus === "Screening Pass").length,
      "Proposal Sent": filteredLeads.filter(l => l.currentStatus === "Proposal Sent").length,
      "Paid": filteredLeads.filter(l => l.currentStatus === "Paid").length,
      "Applied": filteredLeads.filter(l => l.currentStatus === "Applied").length,
      "Approved": approvedLeads
    };

    // Time-based analytics
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentLeads = filteredLeads.filter(lead => new Date(lead.createdOnDate) >= last30Days);
    
    // Status distribution
    const leadsByStatus = filteredLeads.reduce((acc, lead) => {
      acc[lead.currentStatus] = (acc[lead.currentStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Service type distribution
    const leadsByType = filteredLeads.reduce((acc, lead) => {
      acc[lead.deliveryType] = (acc[lead.deliveryType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stats = {
      // Basic metrics
      totalPartners: filteredPartners.length,
      totalLeads,
      activeLeads,
      approvedLeads,
      rejectedLeads,
      
      // Performance metrics
      conversionRate: totalLeads > 0 ? ((approvedLeads / totalLeads) * 100).toFixed(1) : "0.0",
      approvalRate: totalLeads > 0 ? ((approvedLeads / totalLeads) * 100).toFixed(1) : "0.0",
      rejectionRate: totalLeads > 0 ? ((rejectedLeads / totalLeads) * 100).toFixed(1) : "0.0",
      
      // Revenue estimation (based on approved leads)
      estimatedRevenue: (approvedLeads * 50000).toLocaleString(), // Avg 50k per approved lead
      
      // Time-based metrics
      leadsThisMonth: recentLeads.length,
      avgLeadsPerPartner: filteredPartners.length > 0 ? (totalLeads / filteredPartners.length).toFixed(1) : "0",
      
      // Distribution data
      leadsByStatus,
      leadsByType,
      funnelData,
      
      // User analytics
      userStats: user?.role === "Admin" ? userStats : [],
      totalUsers: user?.role === "Admin" ? users.length : 0,
      activeUsers: user?.role === "Admin" ? userStats.filter(u => u.lastActivity && new Date(u.lastActivity) >= last30Days).length : 0,
      
      // Recent data
      recentLeads: filteredLeads.slice(-10).reverse(),
      recentActivity: activityLogs.slice(-20).reverse()
    };

    res.json(stats);
  });

  // Activity logs
  app.get("/api/activity-logs", requireRole(["Admin", "Manager", "Operations"]), async (req, res) => {
    const logs = await storage.getAllActivityLogs();
    res.json(logs.slice(-50).reverse()); // Return last 50 logs in reverse order
  });



  // Export routes
  app.get("/api/export/leads-by-status", requireAuth, async (req, res) => {
    try {
      const { period = "this-month" } = req.query;
      const user = await storage.getUser(req.session.userId!);
      const Partners = await storage.getAllPartners();
      const leads = await storage.getAllLeads();

      // Filter leads based on period (same logic as dashboard)
      let periodFilteredLeads = leads;
      const now = new Date();
      
      if (period === "this-month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        periodFilteredLeads = leads.filter(lead => new Date(lead.createdOnDate) >= startOfMonth);
      } else if (period === "last-month") {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        periodFilteredLeads = leads.filter(lead => {
          const leadDate = new Date(lead.createdOnDate);
          return leadDate >= startOfLastMonth && leadDate <= endOfLastMonth;
        });
      } else if (period === "this-quarter") {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
        periodFilteredLeads = leads.filter(lead => new Date(lead.createdOnDate) >= startOfQuarter);
      }

      // Filter data based on role
      let filteredLeads = periodFilteredLeads;
      if (user?.role === "Partner") {
        const userPartner = Partners.find(m => m.email === user.email);
        if (userPartner) {
          filteredLeads = periodFilteredLeads.filter(lead => lead.PartnerId === userPartner.id);
        } else {
          filteredLeads = [];
        }
      }

      // Calculate status distribution
      const leadsByStatus = filteredLeads.reduce((acc, lead) => {
        acc[lead.currentStatus] = (acc[lead.currentStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = Object.values(leadsByStatus).reduce((sum, count) => sum + count, 0);

      // Create CSV content
      const csvHeader = 'Status,Count,Percentage\n';
      const csvRows = Object.entries(leadsByStatus).map(([status, count]) => 
        `"${status.replace(/"/g, '""')}",${count},${total > 0 ? ((count / total) * 100).toFixed(1) : '0'}%`
      ).join('\n');
      
      const csvContent = '\uFEFF' + csvHeader + csvRows; // BOM + content

      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="leads-by-status-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);

      await storage.createActivityLog({
        userId: req.session.userId!,
        action: "export",
        entity: "leads-status",
        entityId: "chart",
        details: `Exported leads by status chart for period: ${period}`
      });

    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export leads by status" });
    }
  });

  app.get("/api/export/leads", requireRole(["Admin", "Manager", "Analyst"]), async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    let leads = await storage.getAllLeads();

    // Filter leads based on role
    if (user?.role === "Partner") {
      const Partners = await storage.getAllPartners();
      const userPartner = Partners.find(m => m.email === user.email);
      if (userPartner) {
        leads = leads.filter(lead => lead.PartnerId === userPartner.id);
      } else {
        leads = [];
      }
    }

    // Format leads for CSV export
    const csvData = leads.map(lead => ({
      ID: lead.id,
      Company: lead.companyName,
      Owner: lead.ownerName,
      Email: lead.email,
      Phone: lead.phone,
      Type: lead.deliveryType,
      Status: lead.currentStatus,
      "Last Status": lead.lastStatus,
      "Created Date": new Date(lead.createdOnDate).toLocaleDateString(),
      "Last Updated": new Date(lead.lastStatusUpdatedDate).toLocaleDateString(),
      "Partner ID": lead.PartnerId
    }));

    await storage.createActivityLog({
      userId: req.session.userId!,
      action: "export",
      entity: "leads",
      entityId: "bulk",
      details: `Exported ${leads.length} leads to CSV`
    });

    res.json({ data: csvData, filename: `leads-export-${new Date().toISOString().split('T')[0]}.csv` });
  });

  app.get("/api/export/Partners", requireRole(["Admin", "Manager"]), async (req, res) => {
    const Partners = await storage.getAllPartners();

    const csvData = Partners.map(Partner => ({
      ID: Partner.id,
      "Business Name": Partner.businessName,
      "Contact Person": Partner.contactPerson,
      Email: Partner.email,
      Phone: Partner.phone,
      "Business Type": Partner.businessType,
      "GST Number": Partner.gstNumber,
      "PAN Number": Partner.panNumber,
      Status: Partner.status,
      "Registration Date": new Date(Partner.registrationDate).toLocaleDateString(),
      "Grant Link": Partner.grantLink,
      "Equity Link": Partner.equityLink
    }));

    await storage.createActivityLog({
      userId: req.session.userId!,
      action: "export",
      entity: "Partners",
      entityId: "bulk",
      details: `Exported ${Partners.length} Partners to CSV`
    });

    res.json({ data: csvData, filename: `Partners-export-${new Date().toISOString().split('T')[0]}.csv` });
  });

  // Reports
  app.get("/api/reports/summary", requireRole(["Admin", "Manager", "Analyst"]), async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    const Partners = await storage.getAllPartners();
    const leads = await storage.getAllLeads();
    const activityLogs = await storage.getAllActivityLogs();

    // Filter data based on role
    let filteredLeads = leads;
    if (user?.role === "Partner") {
      const userPartner = Partners.find(m => m.email === user.email);
      if (userPartner) {
        filteredLeads = leads.filter(lead => lead.PartnerId === userPartner.id);
      } else {
        filteredLeads = [];
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      generatedBy: user?.username,
      period: "All Time",
      summary: {
        totalPartners: Partners.length,
        totalLeads: filteredLeads.length,
        activeLeads: filteredLeads.filter(lead => !lead.currentStatus.includes("Reject") && lead.currentStatus !== "Approved").length,
        approvedLeads: filteredLeads.filter(lead => lead.currentStatus === "Approved").length,
        rejectedLeads: filteredLeads.filter(lead => lead.currentStatus.includes("Reject")).length,
        conversionRate: filteredLeads.length > 0 ? ((filteredLeads.filter(lead => lead.currentStatus === "Approved").length / filteredLeads.length) * 100).toFixed(2) : "0.00"
      },
      leadsByStatus: filteredLeads.reduce((acc, lead) => {
        acc[lead.currentStatus] = (acc[lead.currentStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      leadsByType: filteredLeads.reduce((acc, lead) => {
        acc[lead.deliveryType] = (acc[lead.deliveryType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      topPartners: Partners.map(Partner => {
        const PartnerLeads = filteredLeads.filter(lead => lead.PartnerId === Partner.id);
        return {
          name: Partner.businessName,
          totalLeads: PartnerLeads.length,
          approvedLeads: PartnerLeads.filter(lead => lead.currentStatus === "Approved").length,
          conversionRate: PartnerLeads.length > 0 ? ((PartnerLeads.filter(lead => lead.currentStatus === "Approved").length / PartnerLeads.length) * 100).toFixed(2) : "0.00"
        };
      }).sort((a, b) => b.totalLeads - a.totalLeads).slice(0, 10),
      recentActivity: activityLogs.slice(-20).reverse()
    };

    await storage.createActivityLog({
      userId: req.session.userId!,
      action: "generate_report",
      entity: "reports",
      entityId: "summary",
      details: "Generated summary report"
    });

    res.json(report);
  });

  // Detailed question forms for leads
  app.get("/api/leads/:leadId/grant-questions", requireAuth, async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json({
        leadId: lead.id,
        companyName: lead.companyName,
        formType: "grant",
        questions: {
          companyInfo: {
            websiteLink: { type: "url", label: "Website Link", required: false },
            isRegistered: { type: "select", label: "Is Registered?", options: ["yes", "no"], required: true },
            trademarkRegistered: { type: "select", label: "Trademark Registered", options: ["yes", "no"], required: false },
            address: { type: "textarea", label: "Address", required: true },
            dpiitRegistered: { type: "select", label: "DPIIT Registered?", options: ["yes", "no"], required: false },
            companyType: { type: "select", label: "Company Type", options: ["Private Limited", "Public Limited", "Partnership", "Proprietorship", "LLP", "Other"], required: true },
            startupSector: { type: "select", label: "Startup Sector", options: ["Technology", "Healthcare", "Education", "Finance", "Manufacturing", "Retail", "Agriculture", "E-commerce", "Real Estate", "Transportation", "Other"], required: true },
            numberOfFounders: { type: "number", label: "Number of Founders", min: 1, max: 10, required: true },
            linkedProfile: { type: "url", label: "Linked Profile", required: false },
            gender: { type: "select", label: "Gender", options: ["Male", "Female", "Other", "Prefer not to say"], required: true },
            area: { type: "text", label: "Area", required: true },
            womenEntrepreneurs: { type: "select", label: "Women Entrepreneurs?", options: ["yes", "no"], required: false },
            oneLiner: { type: "text", label: "One Liner", required: true },
            keyFocusArea: { type: "text", label: "Key Focus Area", required: true },
            linkedinProfile: { type: "url", label: "LinkedIn Profile", required: false },
            companyAge: { type: "number", label: "Company Age (Years)", min: 0, max: 50, required: true }
          },
          financial: {
            lastYearRevenue: { type: "currency", label: "Last Year's Revenue", required: false },
            fundingRequirement: { type: "currency", label: "Funding Requirement", required: true },
            angelInvestorStartup: { type: "select", label: "Angel Investor Startup?", options: ["yes", "no"], required: false },
            debtRaise: { type: "select", label: "Debt Raise?", options: ["yes", "no"], required: false }
          },
          meta: {
            source: { type: "text", label: "Source", required: true },
            sourceFile: { type: "file", label: "Source File", required: false }
          }
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to load grant questions" });
    }
  });

  app.get("/api/leads/:leadId/equity-questions", requireAuth, async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json({
        leadId: lead.id,
        companyName: lead.companyName,
        formType: "equity",
        questions: {
          companyFounders: {
            foundersLinkedin: { type: "url", label: "Founders LinkedIn", required: false },
            address: { type: "textarea", label: "Address", required: true },
            companyName: { type: "text", label: "Company Name", required: true },
            registrationType: { type: "select", label: "Registration Type", options: ["Private Limited", "Public Limited", "Partnership", "Proprietorship", "LLP", "Other"], required: true },
            problemSolution: { type: "textarea", label: "Problem & Solution", required: true },
            website: { type: "url", label: "Website", required: false },
            keyTeam: { type: "text", label: "Key Team", required: true },
            pastGrants: { type: "text", label: "Past Grants", required: false },
            incubationAccelerator: { type: "text", label: "Incubation/Accelerator", required: false },
            industry: { type: "select", label: "Industry", options: ["Technology", "Healthcare", "Education", "Finance", "Manufacturing", "Retail", "Agriculture", "E-commerce", "Real Estate", "Transportation", "Other"], required: true },
            businessStage: { type: "select", label: "Business Stage", options: ["Idea Stage", "Early Stage", "Growth Stage", "Mature Stage", "Scale-up"], required: true },
            certifications: { type: "text", label: "Certifications", required: false },
            competitors: { type: "text", label: "Competitors", required: true }
          },
          financial: {
            lastYearRevenue: { type: "currency", label: "Last Year's Revenue", required: false },
            revenueProjections: { type: "currency", label: "Revenue Projections", required: true },
            profitability: { type: "text", label: "Profitability", required: true },
            ebitda: { type: "currency", label: "EBITDA", required: false },
            gmv: { type: "currency", label: "GMV", required: false },
            margins: { type: "percentage", label: "Margins", required: false },
            expenses: { type: "currency", label: "Expenses", required: true },
            runway: { type: "number", label: "Runway (Months)", min: 1, max: 60, required: true },
            liabilities: { type: "currency", label: "Liabilities", required: false }
          },
          funding: {
            fundingAmount: { type: "currency", label: "Funding Amount", required: true },
            purpose: { type: "text", label: "Purpose", required: true },
            valuation: { type: "currency", label: "Valuation", required: true },
            equityWillingness: { type: "select", label: "Equity Willingness", options: ["yes", "no"], required: true },
            percentageEquity: { type: "percentage", label: "% Equity", required: true },
            cac: { type: "currency", label: "CAC", required: false },
            ltv: { type: "currency", label: "LTV", required: false },
            nps: { type: "number", label: "NPS", min: -100, max: 100, required: false },
            milestones: { type: "textarea", label: "Milestones", required: true },
            threeToFiveYearVision: { type: "textarea", label: "3-5 Year Vision", required: true },
            exitStrategy: { type: "textarea", label: "Exit Strategy", required: true },
            pastAcquisitionInterest: { type: "select", label: "Past Acquisition Interest", options: ["yes", "no"], required: false },
            fundingType: { type: "select", label: "Funding Type", options: ["Seed", "Series A", "Series B", "Series C", "Series D", "Growth", "Bridge", "Other"], required: true }
          },
          meta: {
            source: { type: "text", label: "Source", required: true },
            sourceFile: { type: "file", label: "Source File", required: false }
          }
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to load equity questions" });
    }
  });

  app.post("/api/leads/:leadId/update-questions", requireAuth, async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const formData = req.body;
      const existingData = JSON.parse(lead.formDataJSON || "{}");
      const updatedData = { ...existingData, ...formData };

      // Check if this is a grant form and company age is being updated
      let statusChange = null;
      let statusChangeReason = "";
      
      if (lead.serviceType === "Grant" && formData.companyAge !== undefined) {
        const companyAge = parseInt(formData.companyAge) || 0;
        if (companyAge > 3 && lead.currentStatus !== "Rules Reject") {
          statusChange = "Rules Reject";
          statusChangeReason = `Automatically moved to Rules Reject due to company age (${companyAge} years)`;
        }
      }

      await storage.updateLead(req.params.leadId, {
        formDataJSON: JSON.stringify(updatedData),
        ...(statusChange && {
          currentStatus: statusChange,
          lastStatus: lead.currentStatus,
          lastStatusUpdatedDate: new Date().toISOString()
        })
      });

      await storage.createActivityLog({
        userId: req.session.userId!,
        action: "update_questions",
        entity: "lead",
        entityId: lead.id,
        details: `Updated detailed questions for ${lead.companyName}${statusChangeReason ? ` - ${statusChangeReason}` : ''}`
      });

      res.json({ message: "Questions updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update questions" });
    }
  });

  // Assign lead to user
  app.put("/api/leads/:leadId/assign", requireRole(["Admin"]), async (req, res) => {
    try {
      const { assignedToUserId } = req.body;
      
      if (!assignedToUserId) {
        return res.status(400).json({ message: "User ID is required for assignment" });
      }

      const lead = await storage.getLead(req.params.leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const user = await storage.getUser(assignedToUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateLead(req.params.leadId, {
        assignedToUserId
      });

      await storage.createActivityLog({
        userId: req.session.userId!,
        action: "assign_lead",
        entity: "lead",
        entityId: lead.id,
        details: `Assigned lead ${lead.companyName} to user ${user.username}`
      });

      res.json({ message: "Lead assigned successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to assign lead" });
    }
  });

  // Bulk upload leads
  app.post("/api/leads/bulk-upload", requireRole(["Admin"]), async (req, res) => {
    try {
      const { leads } = req.body;
      
      if (!Array.isArray(leads) || leads.length === 0) {
        return res.status(400).json({ message: "Leads array is required and cannot be empty" });
      }

      const createdLeads = [];
      const errors = [];

      for (let i = 0; i < leads.length; i++) {
        const leadData = leads[i];
        try {
          // Processing lead ${i + 1}
          
          // Validate required fields
          if (!leadData.companyName || !leadData.founderName || !leadData.contact || !leadData.email || !leadData.serviceType || !leadData.PartnerName) {
            const missingFields = [];
            if (!leadData.companyName) missingFields.push('companyName');
            if (!leadData.founderName) missingFields.push('founderName');
            if (!leadData.contact) missingFields.push('contact');
            if (!leadData.email) missingFields.push('email');
            if (!leadData.serviceType) missingFields.push('serviceType');
            if (!leadData.PartnerName) missingFields.push('PartnerName');
            
            const errorMsg = `Row ${i + 1}: Missing required fields: ${missingFields.join(', ')}`;
            // Error: Missing required fields
            errors.push(errorMsg);
            continue;
          }

          // Validate serviceType
          if (leadData.serviceType !== 'Grant' && leadData.serviceType !== 'Equity') {
            const errorMsg = `Row ${i + 1}: Invalid serviceType "${leadData.serviceType}". Must be "Grant" or "Equity"`;
            // Error: Invalid service type
            errors.push(errorMsg);
            continue;
          }

          // Check if user exists if assignedToUserId is provided
          let actualUserId = leadData.assignedToUserId;
          if (leadData.assignedToUserId) {
            // First try to find by ID
            let user = await storage.getUser(leadData.assignedToUserId);
            
            // If not found by ID, try to find by username
            if (!user) {
              user = await storage.getUserByUsername(leadData.assignedToUserId);
              if (user) {
                actualUserId = user.id;
                // Found user by username, using ID
              }
            }
            
            if (!user) {
              const errorMsg = `Row ${i + 1}: Assigned user not found (ID or username): ${leadData.assignedToUserId}`;
              // Error: Assigned user not found
              errors.push(errorMsg);
              continue;
            }
          }

          // Check for duplicate phone number
          const phoneNumber = leadData.phone || leadData.contact; // Use contact as phone if phone not provided
          const existingLeadWithPhone = await storage.getLeadByPhone(phoneNumber);
          
          if (existingLeadWithPhone) {
            const errorMsg = `Row ${i + 1}: Phone number ${phoneNumber} already exists (used by ${existingLeadWithPhone.companyName})`;
            errors.push(errorMsg);
            continue;
          }

          const newLead = await storage.createLead({
            companyName: leadData.companyName,
            founderName: leadData.founderName,
            ownerName: leadData.founderName, // Using founder name as owner name
            contact: leadData.contact,
            email: leadData.email,
            phone: leadData.phone || "",
            deliveryType: leadData.serviceType,
            serviceType: leadData.serviceType,
            formDataJSON: "{}",
            lastStatus: "New Lead",
            currentStatus: "New Lead",
            PartnerId: "bulk-upload", // Default partner ID for bulk uploads
            PartnerName: leadData.PartnerName,
            createdByUserId: req.session.userId!,
            assignedToUserId: actualUserId || undefined,
          });

          createdLeads.push(newLead);

          await storage.createActivityLog({
            userId: req.session.userId!,
            action: "bulk_create_lead",
            entity: "lead",
            entityId: newLead.id,
            details: `Bulk created lead for ${leadData.companyName}`
          });

        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({
        message: `Bulk upload completed. ${createdLeads.length} leads created, ${errors.length} errors.`,
        createdLeads,
        errors
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process bulk upload" });
    }
  });

  // Debug endpoint to check leads
  app.get("/api/debug/leads", requireRole(["Admin"]), async (req, res) => {
    try {
      const allLeads = await storage.getAllLeads();
      const partners = await storage.getAllPartners();
      const users = await storage.getAllUsers();
      
      // Also check the raw CSV file
      const fs = require('fs');
      const path = require('path');
      const csvPath = path.join(process.cwd(), "data", "leads.csv");
      let csvContent = "File not found";
      if (fs.existsSync(csvPath)) {
        csvContent = fs.readFileSync(csvPath, 'utf8');
      }
      
      res.json({
        totalLeads: allLeads.length,
        totalPartners: partners.length,
        totalUsers: users.length,
        sampleLead: allLeads[0] || null,
        samplePartner: partners[0] || null,
        sampleUser: users[0] || null,
        leadsData: allLeads.slice(0, 3), // Show first 3 leads for debugging
        csvContent: csvContent.split('\n').slice(0, 3) // Show first 3 lines of CSV
      });
    } catch (error) {
      res.status(500).json({ message: "Debug failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Report endpoints
  app.get("/api/reports/leads", requireRole(["Admin", "Manager", "Analyst"]), async (req, res) => {
    try {
      const { format = 'csv' } = req.query;
      const leads = await storage.getAllLeads();
      const users = await storage.getAllUsers();
      const partners = await storage.getAllPartners();

      // Calculate analytics
      const totalLeads = leads.length;
      const statusDistribution = leads.reduce((acc: any, lead) => {
        acc[lead.currentStatus] = (acc[lead.currentStatus] || 0) + 1;
        return acc;
      }, {});
      
      const serviceTypeDistribution = leads.reduce((acc: any, lead) => {
        acc[lead.serviceType] = (acc[lead.serviceType] || 0) + 1;
        return acc;
      }, {});

      const assignedLeads = leads.filter(lead => lead.assignedToUserId).length;
      const unassignedLeads = totalLeads - assignedLeads;

      const reportData = {
        summary: {
          totalLeads,
          assignedLeads,
          unassignedLeads,
          statusDistribution,
          serviceTypeDistribution
        },
        leads: leads.map(lead => ({
          id: lead.id,
          companyName: lead.companyName,
          founderName: lead.founderName,
          email: lead.email,
          contact: lead.contact,
          serviceType: lead.serviceType,
          currentStatus: lead.currentStatus,
          assignedTo: users.find(u => u.id === lead.assignedToUserId)?.username || 'Unassigned',
          createdDate: lead.createdOnDate,
          lastUpdated: lead.lastStatusUpdatedDate
        }))
      };

      if (format === 'csv') {
        // Generate CSV
        const csvHeader = 'ID,Company Name,Founder Name,Email,Contact,Service Type,Status,Assigned To,Created Date,Last Updated\n';
        const csvRows = reportData.leads.map(lead => 
          `"${lead.id}","${lead.companyName}","${lead.founderName}","${lead.email}","${lead.contact}","${lead.serviceType}","${lead.currentStatus}","${lead.assignedTo}","${lead.createdDate}","${lead.lastUpdated}"`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="lead-analytics-report.csv"');
        res.send(csvHeader + csvRows);
      } else if (format === 'pdf') {
        // For now, return JSON with a message about PDF generation
        res.json({
          message: "PDF generation is being implemented. Please use CSV export for now.",
          data: reportData,
          format: "json"
        });
      } else {
        res.json(reportData);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to generate lead analytics report" });
    }
  });

  app.get("/api/reports/partners", requireRole(["Admin", "Manager", "Analyst"]), async (req, res) => {
    try {
      const { format = 'csv' } = req.query;
      const leads = await storage.getAllLeads();
      const partners = await storage.getAllPartners();

      // Calculate partner performance
      const partnerPerformance = partners.map(partner => {
        const partnerLeads = leads.filter(lead => lead.PartnerId === partner.id);
        const totalLeads = partnerLeads.length;
        const statusDistribution = partnerLeads.reduce((acc: any, lead) => {
          acc[lead.currentStatus] = (acc[lead.currentStatus] || 0) + 1;
          return acc;
        }, {});
        
        const conversionRate = totalLeads > 0 ? 
          ((statusDistribution['Approved'] || 0) + (statusDistribution['Paid'] || 0)) / totalLeads * 100 : 0;

        return {
          partnerId: partner.id,
          partnerName: partner.name,
          partnerEmail: partner.email,
          totalLeads,
          statusDistribution,
          conversionRate: Math.round(conversionRate * 100) / 100,
          lastActivity: partnerLeads.length > 0 ? 
            Math.max(...partnerLeads.map(l => new Date(l.createdOnDate).getTime())) : null
        };
      });

      const reportData = {
        summary: {
          totalPartners: partners.length,
          totalLeads: leads.length,
          averageConversionRate: partnerPerformance.reduce((sum, p) => sum + p.conversionRate, 0) / partners.length
        },
        partnerPerformance
      };

      if (format === 'csv') {
        // Generate CSV
        const csvHeader = 'Partner ID,Partner Name,Partner Email,Total Leads,Conversion Rate (%),Last Activity\n';
        const csvRows = reportData.partnerPerformance.map(partner => 
          `"${partner.partnerId}","${partner.partnerName}","${partner.partnerEmail}","${partner.totalLeads}","${partner.conversionRate}","${partner.lastActivity ? new Date(partner.lastActivity).toISOString() : 'N/A'}"`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="partner-performance-report.csv"');
        res.send(csvHeader + csvRows);
      } else if (format === 'pdf') {
        // For now, return JSON with a message about PDF generation
        res.json({
          message: "PDF generation is being implemented. Please use CSV export for now.",
          data: reportData,
          format: "json"
        });
      } else {
        res.json(reportData);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to generate partner performance report" });
    }
  });

  app.get("/api/users/statistics", requireRole(["Admin", "Manager", "Analyst", "Operations"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const leads = await storage.getAllLeads();

      const userStatistics = users.map(user => {
        const userLeads = leads.filter(lead => lead.assignedToUserId === user.id);
        const totalLeads = userLeads.length;
        
        // Status distribution
        const statusDistribution = userLeads.reduce((acc: any, lead) => {
          acc[lead.currentStatus] = (acc[lead.currentStatus] || 0) + 1;
          return acc;
        }, {});

        // Active vs Inactive leads
        const activeLeads = userLeads.filter(lead => 
          !lead.currentStatus.startsWith('Reject') && 
          lead.currentStatus !== 'Final Reject'
        ).length;
        const inactiveLeads = totalLeads - activeLeads;

        // Specific status counts
        const rnrLeads = statusDistribution['RNR'] || 0;
        const rejectRnrLeads = statusDistribution['Reject - RNR'] || 0;
        const proposalSentLeads = statusDistribution['Proposal Sent'] || 0;
        const newLeads = statusDistribution['New Lead'] || 0;
        const interestedLeads = statusDistribution['Interested'] || 0;
        const screeningLeads = statusDistribution['Screening'] || 0;
        const screeningPassLeads = statusDistribution['Screening Pass'] || 0;
        const proposalToBeSentLeads = statusDistribution['Proposal to be Sent'] || 0;
        const approvedLeads = statusDistribution['Approved'] || 0;
        const rejectedLeads = statusDistribution['Rejected'] || 0;

        // Conversion rate
        const conversionRate = totalLeads > 0 ? 
          ((approvedLeads + proposalSentLeads) / totalLeads * 100) : 0;

        return {
          userId: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          totalLeads,
          activeLeads,
          inactiveLeads,
          statusDistribution,
          rnrLeads,
          rejectRnrLeads,
          proposalSentLeads,
          newLeads,
          interestedLeads,
          screeningLeads,
          screeningPassLeads,
          proposalToBeSentLeads,
          approvedLeads,
          rejectedLeads,
          conversionRate: Math.round(conversionRate * 100) / 100,
          lastActivity: userLeads.length > 0 ? 
            Math.max(...userLeads.map(l => new Date(l.lastStatusUpdatedDate).getTime())) : null
        };
      });

      const overallStats = {
        totalUsers: users.length,
        totalLeads: leads.length,
        assignedLeads: leads.filter(lead => lead.assignedToUserId).length,
        unassignedLeads: leads.filter(lead => !lead.assignedToUserId).length,
        averageConversionRate: userStatistics.reduce((sum, user) => sum + user.conversionRate, 0) / users.length,
        topPerformers: userStatistics
          .filter(user => user.totalLeads > 0)
          .sort((a, b) => b.conversionRate - a.conversionRate)
          .slice(0, 5)
      };

      res.json({
        userStatistics,
        overallStats
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate user statistics" });
    }
  });

  app.get("/api/reports/activity", requireRole(["Admin", "Manager", "Analyst"]), async (req, res) => {
    try {
      const { format = 'csv' } = req.query;
      const activityLogs = await storage.getAllActivityLogs();
      const users = await storage.getAllUsers();

      const reportData = {
        summary: {
          totalActivities: activityLogs.length,
          uniqueUsers: new Set(activityLogs.map(log => log.userId)).size,
          dateRange: {
            start: activityLogs.length > 0 ? Math.min(...activityLogs.map(log => new Date(log.timestamp).getTime())) : null,
            end: activityLogs.length > 0 ? Math.max(...activityLogs.map(log => new Date(log.timestamp).getTime())) : null
          }
        },
        activities: activityLogs.map(log => ({
          id: log.id,
          userId: log.userId,
          username: users.find(u => u.id === log.userId)?.username || 'Unknown User',
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          details: log.details,
          timestamp: log.timestamp
        }))
      };

      if (format === 'csv') {
        // Generate CSV
        const csvHeader = 'ID,User ID,Username,Action,Entity,Entity ID,Details,Timestamp\n';
        const csvRows = reportData.activities.map(activity => 
          `"${activity.id}","${activity.userId}","${activity.username}","${activity.action}","${activity.entity}","${activity.entityId}","${activity.details}","${activity.timestamp}"`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="activity-logs-report.csv"');
        res.send(csvHeader + csvRows);
      } else if (format === 'pdf') {
        // For now, return JSON with a message about PDF generation
        res.json({
          message: "PDF generation is being implemented. Please use CSV export for now.",
          data: reportData,
          format: "json"
        });
      } else {
        res.json(reportData);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to generate activity logs report" });
    }
  });

  // Test endpoint for download functionality
  app.get("/api/test/download", requireAuth, async (req, res) => {
    try {
      const csvContent = "Status,Count,Percentage\n\"New Lead\",18,90.0%\n\"Screening Pass\",1,5.0%\n\"Rules Reject\",1,5.0%";
      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="test-download.csv"');
      res.send('\uFEFF' + csvContent);
    } catch (error) {
      res.status(500).json({ message: "Test download failed" });
    }
  });

  // Debug endpoint to force reinitialize
  app.post("/api/debug/reinitialize", requireRole(["Admin"]), async (req, res) => {
    try {
      await storage.forceReinitialize();
      const allLeads = await storage.getAllLeads();
      res.json({
        message: "Storage reinitialized successfully",
        totalLeads: allLeads.length,
        sampleLead: allLeads[0] || null
      });
    } catch (error) {
      res.status(500).json({ message: "Reinitialize failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Global error handler to prevent "Cannot set headers after they are sent" errors
  app.use((err: any, req: any, res: any, next: any) => {
    if (res.headersSent) {
      console.error('Headers already sent error:', err.message);
      return next(err);
    }
    
    console.error('Global error handler:', err);
    
    try {
      res.status(500).json({ message: "Internal server error" });
    } catch (sendError) {
      console.error('Failed to send error response:', sendError);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
