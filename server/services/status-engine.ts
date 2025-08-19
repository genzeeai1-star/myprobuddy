import { storage } from "../csv-storage";
import type { Lead, StatusHierarchy, ActivityLog } from "@shared/schema";
import { randomUUID } from "crypto";

export class StatusEngine {
  private isRunning = false;

  async processAutomaticStatusChanges(): Promise<void> {
    if (this.isRunning) {
      // Status engine is already running, skipping
      return;
    }

    this.isRunning = true;
    
    try {
      // Starting automatic status change processing
      
      const [leads, statusHierarchy] = await Promise.all([
        storage.getAllLeads(),
        storage.getAllStatusHierarchy()
      ]);

      const now = new Date();
      const changesLog: ActivityLog[] = [];
      let processedCount = 0;

      // Process each lead for automatic status transitions
      for (const lead of leads) {
        const currentStatusConfig = statusHierarchy.find(
          status => status.statusName === lead.currentStatus
        );

        if (!currentStatusConfig || !currentStatusConfig.daysLimit || !currentStatusConfig.autoMoveTo) {
          continue; // No automatic transition configured
        }

        const lastStatusUpdate = new Date(lead.lastStatusUpdatedDate);
        const daysSinceUpdate = Math.floor(
          (now.getTime() - lastStatusUpdate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceUpdate >= currentStatusConfig.daysLimit) {
          // Update the lead status
          const updatedLead: Partial<Lead> = {
            currentStatus: currentStatusConfig.autoMoveTo,
            lastStatus: lead.currentStatus,
            lastStatusUpdatedDate: now.toISOString()
          };

          await storage.updateLead(lead.id, updatedLead);

          // Log the automatic change
          const activityLog: ActivityLog = {
            id: randomUUID(),
            timestamp: now.toISOString(),
            userId: "system",
            action: "auto_status_change",
            entity: "lead",
            entityId: lead.id,
            details: `Automatically moved from "${lead.currentStatus}" to "${currentStatusConfig.autoMoveTo}" after ${currentStatusConfig.daysLimit} days`
          };

          changesLog.push(activityLog);
          processedCount++;

          // Lead moved from current status to auto move status
        }
      }

      // Batch write all activity logs
      if (changesLog.length > 0) {
        for (const log of changesLog) {
          await storage.createActivityLog(log);
        }
      }

      // Automatic status processing completed
    } catch (error) {
      console.error("Error during automatic status processing:", error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async validateStatusTransition(currentStatus: string, newStatus: string): Promise<boolean> {
    const statusHierarchy = await storage.getAllStatusHierarchy();
    
    const currentStatusConfig = statusHierarchy.find(
      status => status.statusName === currentStatus
    );

    if (!currentStatusConfig) {
      return false; // Current status not found in hierarchy
    }

    const allowedNextStatuses = currentStatusConfig.nextStatuses
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return allowedNextStatuses.includes(newStatus);
  }

  async getAvailableTransitions(currentStatus: string): Promise<string[]> {
    // getAvailableTransitions called for status
    const statusHierarchy = await storage.getAllStatusHierarchy();
          // Status hierarchy loaded
    
    const currentStatusConfig = statusHierarchy.find(
      status => status.statusName === currentStatus
    );
          // Current status config found

    if (!currentStatusConfig) {
              // No status config found for current status
      return [];
    }

          // Next statuses raw
    const transitions = currentStatusConfig.nextStatuses
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0);
          // Parsed transitions
    
    return transitions;
  }

  async getStatusHierarchy(): Promise<StatusHierarchy[]> {
    return await storage.getAllStatusHierarchy();
  }

  async addStatusHierarchy(status: Omit<StatusHierarchy, "id">): Promise<StatusHierarchy> {
    return await storage.createStatusHierarchy(status);
  }

  async updateStatusHierarchy(id: string, updates: Partial<StatusHierarchy>): Promise<boolean> {
    const result = await storage.updateStatusHierarchy(id, updates);
    return result !== undefined;
  }

  async deleteStatusHierarchy(id: string): Promise<boolean> {
    return await storage.deleteStatusHierarchy(id);
  }

  startScheduledProcessing(intervalHours = 24): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    // Starting scheduled status processing
    
    // Run immediately
    this.processAutomaticStatusChanges().catch(console.error);
    
    // Schedule recurring processing
    setInterval(() => {
      this.processAutomaticStatusChanges().catch(console.error);
    }, intervalMs);
  }

  async getLeadsRequiringAttention(): Promise<Array<Lead & { daysSinceUpdate: number; suggestedAction: string }>> {
    const [leads, statusHierarchy] = await Promise.all([
      storage.getAllLeads(),
      storage.getAllStatusHierarchy()
    ]);

    const now = new Date();
    const attentionLeads = [];

    for (const lead of leads) {
      const statusConfig = statusHierarchy.find(
        status => status.statusName === lead.currentStatus
      );

      if (!statusConfig || !statusConfig.daysLimit) {
        continue;
      }

      const lastUpdate = new Date(lead.lastStatusUpdatedDate);
      const daysSinceUpdate = Math.floor(
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceUpdate >= statusConfig.daysLimit - 1) { // Alert 1 day before auto-transition
        let suggestedAction = "Review lead status";
        
        if (statusConfig.autoMoveTo) {
          if (daysSinceUpdate >= statusConfig.daysLimit) {
            suggestedAction = `Will be automatically moved to "${statusConfig.autoMoveTo}"`;
          } else {
            suggestedAction = `Will be moved to "${statusConfig.autoMoveTo}" in ${statusConfig.daysLimit - daysSinceUpdate} day(s)`;
          }
        }

        attentionLeads.push({
          ...lead,
          daysSinceUpdate,
          suggestedAction
        });
      }
    }

    return attentionLeads;
  }
}

export const statusEngine = new StatusEngine();

// Initialize default status hierarchy if it doesn't exist
export async function initializeStatusHierarchy(): Promise<void> {
  try {
    const existing = await storage.getAllStatusHierarchy();
    
    if (existing.length === 0) {
      const defaultStatuses = [
        { statusName: "New Lead", nextStatuses: "RNR;Call Back;Not Interested;Interested", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "RNR", nextStatuses: "Interested;Reject - RNR", daysLimit: 6, autoMoveTo: "Reject - RNR" },
        { statusName: "Call Back", nextStatuses: "Interested;Reject - Not Attend", daysLimit: 6, autoMoveTo: "Reject - Not Attend" },
        { statusName: "Not Interested", nextStatuses: "Reject - Not Interested", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Interested", nextStatuses: "Reject - Screening Fail;Screening Pass", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Screening Pass", nextStatuses: "Proposal to be Sent", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Proposal to be Sent", nextStatuses: "Proposal Sent", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Proposal Sent", nextStatuses: "Not Interested;Payment Link Sent", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Payment Link Sent", nextStatuses: "Not Paid;Paid", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Not Paid", nextStatuses: "Reject - Payment Not Done", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Paid", nextStatuses: "To Apply", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "To Apply", nextStatuses: "Applied", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Applied", nextStatuses: "Rejected;Approved", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Rejected", nextStatuses: "Final Reject", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Approved", nextStatuses: "", daysLimit: undefined, autoMoveTo: undefined },
        // Reject statuses (final states)
        { statusName: "Reject - RNR", nextStatuses: "", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Reject - Not Attend", nextStatuses: "", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Reject - Not Interested", nextStatuses: "", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Reject - Screening Fail", nextStatuses: "", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Reject - Payment Not Done", nextStatuses: "", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Final Reject", nextStatuses: "", daysLimit: undefined, autoMoveTo: undefined },
        { statusName: "Rules Reject", nextStatuses: "", daysLimit: undefined, autoMoveTo: undefined },
      ];

      for (const status of defaultStatuses) {
        await statusEngine.addStatusHierarchy(status);
      }

      // Default status hierarchy initialized
    }
  } catch (error) {
    console.error("Failed to initialize status hierarchy:", error);
  }
}
