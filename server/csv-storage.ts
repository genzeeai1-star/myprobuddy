import { type User, type InsertUser, type Partner, type InsertPartner, type Lead, type InsertLead, type StatusHierarchy, type InsertStatusHierarchy, type ActivityLog, type InsertActivityLog } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import { createObjectCsvWriter } from "csv-writer";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Partner methods
  getPartner(id: string): Promise<Partner | undefined>;
  createPartner(Partner: InsertPartner): Promise<Partner>;
  updatePartner(id: string, Partner: Partial<Partner>): Promise<Partner | undefined>;
  deletePartner(id: string): Promise<boolean>;
  getAllPartners(): Promise<Partner[]>;
  regeneratePartnerLinks(id: string): Promise<Partner | undefined>;

  // Lead methods
  getLead(id: string): Promise<Lead | undefined>;
  getLeadByPhone(phone: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<Lead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  getAllLeads(): Promise<Lead[]>;
  getLeadsByPartner(PartnerId: string): Promise<Lead[]>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  getLeadsWithFilters(filters: any, page: number, limit: number): Promise<{ leads: Lead[], total: number, page: number, totalPages: number }>;

  // Status hierarchy methods
  getStatusHierarchy(id: string): Promise<StatusHierarchy | undefined>;
  createStatusHierarchy(status: InsertStatusHierarchy): Promise<StatusHierarchy>;
  updateStatusHierarchy(id: string, status: Partial<StatusHierarchy>): Promise<StatusHierarchy | undefined>;
  deleteStatusHierarchy(id: string): Promise<boolean>;
  getAllStatusHierarchy(): Promise<StatusHierarchy[]>;

  // Activity log methods
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getAllActivityLogs(): Promise<ActivityLog[]>;
  getActivityLogsByUser(userId: string): Promise<ActivityLog[]>;
}

export class CSVStorage implements IStorage {
  private dataDir: string;
  private users: User[] = [];
  private partners: Partner[] = [];
  private leads: Lead[] = [];
  private statusHierarchy: StatusHierarchy[] = [];
  private activityLogs: ActivityLog[] = [];
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.dataDir = path.join(process.cwd(), "data");
    this.ensureDataDirectory();
    // Initialize immediately but don't await in constructor
    this.initializationPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.loadAllData();
      await this.initializeDefaultData();
      this.initialized = true;
    } catch (error) {
      console.error("Error initializing CSV storage:", error);
      // If initialization fails, try to recreate files
      await this.recreateFiles();
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      if (this.initializationPromise) {
        await this.initializationPromise;
      } else {
        await this.initialize();
      }
    }
  }

  private async recreateFiles(): Promise<void> {
    // Recreating CSV files due to corruption
    try {
      // Clear all data
      this.users = [];
      this.partners = [];
      this.leads = [];
      this.statusHierarchy = [];
      this.activityLogs = [];
      
      // Delete existing files
      const files = ['users.csv', 'partners.csv', 'leads.csv', 'status-hierarchy.csv', 'activity-logs.csv'];
      for (const file of files) {
        const filePath = this.getFilePath(file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      // Reinitialize
      await this.initializeDefaultData();
      this.initialized = true;
      // CSV files recreated successfully
    } catch (error) {
      console.error("Error recreating CSV files:", error);
      throw error;
    }
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private getFilePath(filename: string): string {
    return path.join(this.dataDir, filename);
  }

  private async loadCSV<T>(filename: string, transform?: (row: any) => T): Promise<T[]> {
    const filePath = this.getFilePath(filename);
    if (!fs.existsSync(filePath)) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const results: T[] = [];
      const stream = fs.createReadStream(filePath);
      
      stream
        .pipe(csvParser({ headers: true }))
        .on('data', (row) => {
          try {
            // Raw row from ${filename}: ${row}
            
            // Skip header rows by checking if the first value contains header-like text
            const firstValue = Object.values(row)[0];
            if (firstValue && typeof firstValue === 'string' && 
                (firstValue === 'id' || firstValue.includes('id') || firstValue.includes('username'))) {
              // Skipping header row in ${filename}
              return;
            }
            
            // Skip empty rows
            const hasData = Object.values(row).some(value => {
              const strValue = String(value);
              return strValue && strValue !== '';
            });
            if (!hasData) {
              // Skipping empty row in ${filename}
              return;
            }
            
            if (transform) {
              const transformed = transform(row);
              results.push(transformed);
            } else {
              results.push(row as T);
            }
          } catch (error) {
            console.error(`Error processing row in ${filename}:`, error);
            // Continue processing other rows
          }
        })
        .on('end', () => {
          // Finished loading ${filename}, found ${results.length} rows
          resolve(results);
        })
        .on('error', (error) => {
          console.error(`Error reading CSV file ${filename}:`, error);
          reject(error);
        });
    });
  }

  private async saveCSV<T extends Record<string, any>>(filename: string, data: T[], headers: string[]): Promise<void> {
    const filePath = this.getFilePath(filename);
    const tempFilePath = filePath + '.tmp';
    
    try {
      // Write to temporary file first
      const csvWriter = createObjectCsvWriter({
        path: tempFilePath,
        header: headers.map(header => ({ id: header, title: header }))
      });

      await csvWriter.writeRecords(data);
      
      // Atomic move operation
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      fs.renameSync(tempFilePath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      console.error(`Error saving CSV file ${filePath}:`, error);
      throw error;
    }
  }

  private async loadAllData() {
    try {
      // Load users
      this.users = await this.loadCSV<User>("users.csv", (row) => {
        // Map numeric keys to proper column names
        const user = {
          id: row._0 || row.id,
          username: row._1 || row.username,
          passwordHash: row._2 || row.passwordHash,
                     role: (row._3 || row.role) as "Admin" | "Manager" | "Customer success officer" | "Analyst" | "Operations",
          email: row._4 || row.email,
          phone: row._5 || row.phone
        };
        return user;
      }).catch(() => []);

      // Load partners
      this.partners = await this.loadCSV<Partner>("partners.csv", (row) => ({
        id: row._0 || row.id,
        name: row._1 || row.name,
        businessName: row._2 || row.businessName,
        contactPerson: row._3 || row.contactPerson,
        email: row._4 || row.email,
        phone: row._5 || row.phone,
        companyDetails: row._6 || row.companyDetails,
        businessType: row._7 || row.businessType,
        gstNumber: row._8 || row.gstNumber,
        panNumber: row._9 || row.panNumber,
        registrationDate: row._11 || row.registrationDate,
        status: row._10 || row.status,
        type: (row._12 || row.type) as "Grant" | "Equity" | "Both",
        equityLink: row._13 || row.equityLink,
        grantLink: row._14 || row.grantLink,
        qrEquity: row._15 || row.qrEquity,
        qrGrant: row._16 || row.qrGrant
      })).catch(() => []);

             // Load leads
       this.leads = await this.loadCSV<Lead>("leads.csv", (row) => {
         // Loading lead row: ${row}
         return {
           id: row.id || row._0,
           createdOnDate: row.createdOnDate || row._1,
           companyName: row.companyName || row._2,
           founderName: row.founderName || row._3,
           ownerName: row.ownerName || row._4,
           contact: row.contact || row._5,
           email: row.email || row._6,
           phone: row.phone || row._7,
           deliveryType: (row.deliveryType || row._8) as "Grant" | "Equity",
           serviceType: (row.serviceType || row._9) as "Grant" | "Equity",
           formDataJSON: row.formDataJSON || row._10,
           lastStatus: row.lastStatus || row._11,
           lastStatusUpdatedDate: row.lastStatusUpdatedDate || row._12,
           currentStatus: row.currentStatus || row._13,
           PartnerId: row.PartnerId || row._14,
           PartnerName: row.PartnerName || row._15 || "Unknown Partner",
           createdByUserId: row.createdByUserId || row._16,
           assignedToUserId: row.assignedToUserId || row._17
         };
       }).catch((error) => {
         console.error('Error loading leads:', error);
         return [];
       });

      // Load status hierarchy
      this.statusHierarchy = await this.loadCSV<StatusHierarchy>("status-hierarchy.csv", (row) => ({
        id: row._0 || row.id,
        statusName: row._1 || row.statusName,
        nextStatuses: row._2 || row.nextStatuses,
        daysLimit: (row._3 || row.daysLimit) ? parseInt(row._3 || row.daysLimit) : undefined,
        autoMoveTo: row._4 || row.autoMoveTo
      })).catch(() => []);

      // Load activity logs
      this.activityLogs = await this.loadCSV<ActivityLog>("activity-logs.csv", (row) => ({
        id: row._0 || row.id,
        timestamp: row._1 || row.timestamp,
        userId: row._2 || row.userId,
        action: row._3 || row.action,
        entity: row._4 || row.entity,
        entityId: row._5 || row.entityId,
        details: row._6 || row.details
      })).catch(() => []);
      
    } catch (error) {
      console.error("Error loading CSV data:", error);
      // If loading fails, clear all data and let initializeDefaultData recreate
      this.users = [];
      this.partners = [];
      this.leads = [];
      this.statusHierarchy = [];
      this.activityLogs = [];
    }
  }

  private async saveAllData() {
    try {
      // Save users
      await this.saveCSV("users.csv", this.users, [
        "id", "username", "passwordHash", "role", "email", "phone"
      ]).catch(error => {
        console.error("Error saving users.csv:", error);
        throw error;
      });

      // Save partners
      await this.saveCSV("partners.csv", this.partners, [
        "id", "name", "businessName", "contactPerson", "email", "phone", 
        "companyDetails", "businessType", "gstNumber", "panNumber", "status", 
        "registrationDate", "type", "equityLink", "grantLink", "qrEquity", "qrGrant"
      ]).catch(error => {
        console.error("Error saving partners.csv:", error);
        throw error;
      });

             // Save leads
       await this.saveCSV("leads.csv", this.leads, [
         "id", "createdOnDate", "companyName", "founderName", "ownerName", "contact",
         "email", "phone", "deliveryType", "serviceType", "formDataJSON", "lastStatus",
         "lastStatusUpdatedDate", "currentStatus", "PartnerId", "PartnerName", "createdByUserId", "assignedToUserId"
       ]).catch(error => {
         console.error("Error saving leads.csv:", error);
         throw error;
       });

      // Save status hierarchy
      await this.saveCSV("status-hierarchy.csv", this.statusHierarchy, [
        "id", "statusName", "nextStatuses", "daysLimit", "autoMoveTo"
      ]).catch(error => {
        console.error("Error saving status-hierarchy.csv:", error);
        throw error;
      });

      // Save activity logs
      await this.saveCSV("activity-logs.csv", this.activityLogs, [
        "id", "timestamp", "userId", "action", "entity", "entityId", "details"
      ]).catch(error => {
        console.error("Error saving activity-logs.csv:", error);
        throw error;
      });
    } catch (error) {
      console.error("Error saving CSV data:", error);
      throw error;
    }
  }

  private async initializeDefaultData() {
    // Only initialize if no data exists
    if (this.users.length === 0) {
      // Create default admin user
      const adminUser: User = {
        id: randomUUID(),
        username: "admin",
        passwordHash: await bcrypt.hash("admin123", 10),
        role: "Admin",
        email: "admin@myprobuddy.com",
        phone: "+91 9876543210"
      };
      this.users.push(adminUser);

      // Create sample manager user
      const managerUser: User = {
        id: randomUUID(),
        username: "manager",
        passwordHash: await bcrypt.hash("manager123", 10),
        role: "Manager",
        email: "manager@myprobuddy.com",
        phone: "+91 9876543211"
      };
      this.users.push(managerUser);

      // Create sample customer success officer user
      const customerSuccessUser: User = {
        id: randomUUID(),
        username: "customer_success",
        passwordHash: await bcrypt.hash("customer123", 10),
        role: "Customer success officer",
        email: "customer@myprobuddy.com",
        phone: "+91 9876543212"
      };
      this.users.push(customerSuccessUser);

      // Create sample operations user
      const operationsUser: User = {
        id: randomUUID(),
        username: "operations",
        passwordHash: await bcrypt.hash("operations123", 10),
        role: "Operations",
        email: "operations@myprobuddy.com",
        phone: "+91 9876543213"
      };
      this.users.push(operationsUser);

      // Create sample partners
      const partner1: Partner = {
        id: randomUUID(),
        name: "TechStart Solutions",
        businessName: "TechStart Solutions Pvt Ltd",
        contactPerson: "John Smith",
        email: "john@techstart.com",
        phone: "+91 9876543210",
        companyDetails: "Technology startup specializing in AI solutions",
        businessType: "Technology",
        gstNumber: "22ABCDE1234F1Z5",
        panNumber: "ABCDE1234F",
        registrationDate: new Date().toISOString(),
        status: "Active",
        type: "Both",
        equityLink: `http://localhost:5000/submit/${randomUUID()}/equity`,
        grantLink: `http://localhost:5000/submit/${randomUUID()}/grant`,
        qrEquity: `qr-equity-${randomUUID()}`,
        qrGrant: `qr-grant-${randomUUID()}`
      };
      this.partners.push(partner1);

      const partner2: Partner = {
        id: randomUUID(),
        name: "GreenEco Ventures",
        businessName: "GreenEco Ventures Limited",
        contactPerson: "Sarah Johnson",
        email: "sarah@greeneco.com",
        phone: "+91 9876543213",
        companyDetails: "Eco-friendly solutions and consulting",
        businessType: "Environment",
        gstNumber: "22FGHIJ5678K2M3",
        panNumber: "FGHIJ5678K",
        registrationDate: new Date().toISOString(),
        status: "Active",
        type: "Grant",
        equityLink: `http://localhost:5000/submit/${randomUUID()}/equity`,
        grantLink: `http://localhost:5000/submit/${randomUUID()}/grant`,
        qrEquity: `qr-equity-${randomUUID()}`,
        qrGrant: `qr-grant-${randomUUID()}`
      };
      this.partners.push(partner2);

             // Create sample leads
       const lead1: Lead = {
         id: randomUUID(),
         PartnerId: partner1.id,
         PartnerName: partner1.name,
         companyName: "InnovateTech Corp",
         founderName: "Mike Wilson",
         ownerName: "Mike Wilson",
         contact: "+91 9876543214",
         email: "mike@innovatetech.com",
         phone: "+91 9876543214",
         deliveryType: "Grant",
         serviceType: "Grant",
         currentStatus: "New Lead",
         lastStatus: "",
         createdOnDate: new Date().toISOString(),
         lastStatusUpdatedDate: new Date().toISOString(),
         createdByUserId: adminUser.id,
         formDataJSON: JSON.stringify({
           companyType: "Private Limited",
           industry: "Technology",
           fundingAmount: "50000000",
           businessDescription: "AI-powered automation solutions"
         })
       };
      this.leads.push(lead1);

      // Initialize status hierarchy
      const statuses = [
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
      ];

      for (const status of statuses) {
        const statusObj: StatusHierarchy = {
          id: randomUUID(),
          ...status,
        };
        this.statusHierarchy.push(statusObj);
      }

      // Save initial data
      await this.saveAllData();
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return this.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return this.users.find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return this.users.find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureInitialized();
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.push(user);
    await this.saveCSV("users.csv", this.users, [
      "id", "username", "passwordHash", "role", "email", "phone"
    ]);
    return user;
  }

  async updateUser(id: string, userUpdate: Partial<User>): Promise<User | undefined> {
    await this.ensureInitialized();
    const index = this.users.findIndex(user => user.id === id);
    if (index === -1) return undefined;
    
    this.users[index] = { ...this.users[index], ...userUpdate };
    await this.saveCSV("users.csv", this.users, [
      "id", "username", "passwordHash", "role", "email", "phone"
    ]);
    return this.users[index];
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const index = this.users.findIndex(user => user.id === id);
    if (index === -1) return false;
    
    this.users.splice(index, 1);
    await this.saveCSV("users.csv", this.users, [
      "id", "username", "passwordHash", "role", "email", "phone"
    ]);
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return this.users;
  }

  // Partner methods
  async getPartner(id: string): Promise<Partner | undefined> {
    await this.ensureInitialized();
    return this.partners.find(partner => partner.id === id);
  }

  async createPartner(insertPartner: InsertPartner): Promise<Partner> {
    await this.ensureInitialized();
    const id = randomUUID();
    const partner: Partner = { 
      ...insertPartner, 
      id,
      registrationDate: new Date().toISOString(),
      equityLink: `${process.env.BASE_URL || 'http://localhost:5000'}/submit/${id}/equity`,
      grantLink: `${process.env.BASE_URL || 'http://localhost:5000'}/submit/${id}/grant`,
      qrEquity: `qr-equity-${id}`,
      qrGrant: `qr-grant-${id}`
    };
    this.partners.push(partner);
    await this.saveCSV("partners.csv", this.partners, [
      "id", "name", "businessName", "contactPerson", "email", "phone", 
      "companyDetails", "businessType", "gstNumber", "panNumber", "status", 
      "registrationDate", "type", "equityLink", "grantLink", "qrEquity", "qrGrant"
    ]);
    return partner;
  }

  async updatePartner(id: string, partnerUpdate: Partial<Partner>): Promise<Partner | undefined> {
    await this.ensureInitialized();
    const index = this.partners.findIndex(partner => partner.id === id);
    if (index === -1) return undefined;
    
    this.partners[index] = { ...this.partners[index], ...partnerUpdate };
    await this.saveCSV("partners.csv", this.partners, [
      "id", "name", "businessName", "contactPerson", "email", "phone", 
      "companyDetails", "businessType", "gstNumber", "panNumber", "status", 
      "registrationDate", "type", "equityLink", "grantLink", "qrEquity", "qrGrant"
    ]);
    return this.partners[index];
  }

  async deletePartner(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const index = this.partners.findIndex(partner => partner.id === id);
    if (index === -1) return false;
    
    this.partners.splice(index, 1);
    await this.saveCSV("partners.csv", this.partners, [
      "id", "name", "businessName", "contactPerson", "email", "phone", "companyDetails",
      "businessType", "gstNumber", "panNumber", "status", "registrationDate", "type",
      "equityLink", "grantLink", "qrEquity", "qrGrant"
    ]);
    return true;
  }

  async regeneratePartnerLinks(id: string): Promise<Partner | undefined> {
    await this.ensureInitialized();
    const index = this.partners.findIndex(partner => partner.id === id);
    if (index === -1) return undefined;
    
    const partner = this.partners[index];
    
    // Generate new links and QR codes
    const equityLink = `http://localhost:5000/submit/${id}/equity`;
    const grantLink = `http://localhost:5000/submit/${id}/grant`;
    const qrEquity = `qr-equity-${id}`;
    const qrGrant = `qr-grant-${id}`;
    
    // Update partner with new links and QR codes
    this.partners[index] = {
      ...partner,
      equityLink,
      grantLink,
      qrEquity,
      qrGrant
    };
    
    await this.saveCSV("partners.csv", this.partners, [
      "id", "name", "businessName", "contactPerson", "email", "phone", "companyDetails",
      "businessType", "gstNumber", "panNumber", "status", "registrationDate", "type",
      "equityLink", "grantLink", "qrEquity", "qrGrant"
    ]);
    
    return this.partners[index];
  }

  async getAllPartners(): Promise<Partner[]> {
    await this.ensureInitialized();
    return this.partners;
  }

  // Lead methods
  async getLead(id: string): Promise<Lead | undefined> {
    await this.ensureInitialized();
    return this.leads.find(lead => lead.id === id);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    await this.ensureInitialized();
    const id = randomUUID();
    const now = new Date().toISOString();
    const lead: Lead = { 
      ...insertLead, 
      id,
      createdOnDate: now,
      lastStatusUpdatedDate: now,
      currentStatus: insertLead.lastStatus || "New Lead"
    };
    this.leads.push(lead);
    await this.saveCSV("leads.csv", this.leads, [
      "id", "createdOnDate", "companyName", "founderName", "ownerName", "contact",
      "email", "phone", "deliveryType", "serviceType", "formDataJSON", "lastStatus",
      "lastStatusUpdatedDate", "currentStatus", "PartnerId", "PartnerName", "createdByUserId", "assignedToUserId"
    ]);
    return lead;
  }

  async updateLead(id: string, leadUpdate: Partial<Lead>): Promise<Lead | undefined> {
    await this.ensureInitialized();
    const index = this.leads.findIndex(lead => lead.id === id);
    if (index === -1) return undefined;
    
    const updatedLead = { ...this.leads[index], ...leadUpdate };
    if (leadUpdate.currentStatus && leadUpdate.currentStatus !== this.leads[index].currentStatus) {
      updatedLead.lastStatusUpdatedDate = new Date().toISOString();
    }
    this.leads[index] = updatedLead;
    await this.saveCSV("leads.csv", this.leads, [
      "id", "createdOnDate", "companyName", "founderName", "ownerName", "contact",
      "email", "phone", "deliveryType", "serviceType", "formDataJSON", "lastStatus",
      "lastStatusUpdatedDate", "currentStatus", "PartnerId", "PartnerName", "createdByUserId", "assignedToUserId"
    ]);
    return updatedLead;
  }

  async deleteLead(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const index = this.leads.findIndex(lead => lead.id === id);
    if (index === -1) return false;
    
    this.leads.splice(index, 1);
    await this.saveCSV("leads.csv", this.leads, [
      "id", "createdOnDate", "companyName", "founderName", "ownerName", "contact",
      "email", "phone", "deliveryType", "serviceType", "formDataJSON", "lastStatus",
      "lastStatusUpdatedDate", "currentStatus", "PartnerId", "PartnerName", "createdByUserId", "assignedToUserId"
    ]);
    return true;
  }

  async getAllLeads(): Promise<Lead[]> {
    await this.ensureInitialized();
    return this.leads;
  }

  async getLeadByPhone(phone: string): Promise<Lead | undefined> {
    await this.ensureInitialized();
    return this.leads.find(lead => lead.phone === phone);
  }

  async getLeadsByPartner(PartnerId: string): Promise<Lead[]> {
    await this.ensureInitialized();
    return this.leads.filter(lead => lead.PartnerId === PartnerId);
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    await this.ensureInitialized();
    return this.leads.filter(lead => lead.currentStatus === status);
  }

  async getLeadsWithFilters(filters: any, page: number = 1, limit: number = 50): Promise<{ leads: Lead[], total: number, page: number, totalPages: number }> {
    await this.ensureInitialized();
    
    // getLeadsWithFilters called with: ${JSON.stringify({ filters, page, limit })}
    // Total leads before filtering: ${this.leads.length}
    
    let filteredLeads = [...this.leads];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredLeads = filteredLeads.filter(lead => 
        lead.companyName.toLowerCase().includes(searchTerm) ||
        lead.founderName.toLowerCase().includes(searchTerm) ||
        lead.email.toLowerCase().includes(searchTerm) ||
        lead.contact.toLowerCase().includes(searchTerm)
      );
      // After search filter: ${filteredLeads.length} leads
    }

    // Apply status filter
    if (filters.status) {
      filteredLeads = filteredLeads.filter(lead => lead.currentStatus === filters.status);
      // After status filter: ${filteredLeads.length} leads
    }

    // Apply service type filter
    if (filters.serviceType) {
      filteredLeads = filteredLeads.filter(lead => lead.serviceType === filters.serviceType);
      // After service type filter: ${filteredLeads.length} leads
    }

    // Apply assigned user filter
    if (filters.assignedToUserId) {
      if (filters.assignedToUserId === "unassigned") {
        filteredLeads = filteredLeads.filter(lead => !lead.assignedToUserId);
      } else {
        filteredLeads = filteredLeads.filter(lead => lead.assignedToUserId === filters.assignedToUserId);
      }
    }

    // Apply partner filter
    if (filters.partnerId) {
      filteredLeads = filteredLeads.filter(lead => lead.PartnerId === filters.partnerId);
    }

    // Apply date range filters
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      filteredLeads = filteredLeads.filter(lead => new Date(lead.createdOnDate) >= dateFrom);
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999); // End of day
      filteredLeads = filteredLeads.filter(lead => new Date(lead.createdOnDate) <= dateTo);
    }

    // Sort by creation date (newest first)
    filteredLeads.sort((a, b) => new Date(b.createdOnDate).getTime() - new Date(a.createdOnDate).getTime());

    // Apply pagination
    const total = filteredLeads.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

    return {
      leads: paginatedLeads,
      total,
      page,
      totalPages
    };
  }

  // Status hierarchy methods
  async getStatusHierarchy(id: string): Promise<StatusHierarchy | undefined> {
    await this.ensureInitialized();
    return this.statusHierarchy.find(status => status.id === id);
  }

  async createStatusHierarchy(insertStatus: InsertStatusHierarchy): Promise<StatusHierarchy> {
    await this.ensureInitialized();
    const id = randomUUID();
    const status: StatusHierarchy = { ...insertStatus, id };
    this.statusHierarchy.push(status);
    await this.saveCSV("status-hierarchy.csv", this.statusHierarchy, [
      "id", "statusName", "nextStatuses", "daysLimit", "autoMoveTo"
    ]);
    return status;
  }

  async updateStatusHierarchy(id: string, statusUpdate: Partial<StatusHierarchy>): Promise<StatusHierarchy | undefined> {
    await this.ensureInitialized();
    const index = this.statusHierarchy.findIndex(status => status.id === id);
    if (index === -1) return undefined;
    
    this.statusHierarchy[index] = { ...this.statusHierarchy[index], ...statusUpdate };
    await this.saveCSV("status-hierarchy.csv", this.statusHierarchy, [
      "id", "statusName", "nextStatuses", "daysLimit", "autoMoveTo"
    ]);
    return this.statusHierarchy[index];
  }

  async deleteStatusHierarchy(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const index = this.statusHierarchy.findIndex(status => status.id === id);
    if (index === -1) return false;
    
    this.statusHierarchy.splice(index, 1);
    await this.saveCSV("status-hierarchy.csv", this.statusHierarchy, [
      "id", "statusName", "nextStatuses", "daysLimit", "autoMoveTo"
    ]);
    return true;
  }

  async getAllStatusHierarchy(): Promise<StatusHierarchy[]> {
    await this.ensureInitialized();
    return this.statusHierarchy;
  }

  // Activity log methods
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    await this.ensureInitialized();
    const id = randomUUID();
    const log: ActivityLog = { 
      ...insertLog, 
      id,
      timestamp: new Date().toISOString()
    };
    this.activityLogs.push(log);
    await this.saveCSV("activity-logs.csv", this.activityLogs, [
      "id", "timestamp", "userId", "action", "entity", "entityId", "details"
    ]);
    return log;
  }

  async getAllActivityLogs(): Promise<ActivityLog[]> {
    await this.ensureInitialized();
    return this.activityLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getActivityLogsByUser(userId: string): Promise<ActivityLog[]> {
    await this.ensureInitialized();
    return this.activityLogs
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Debug method to force reinitialize
  async forceReinitialize(): Promise<void> {
    // Force reinitializing CSV storage
    this.initialized = false;
    this.initializationPromise = null;
    await this.initialize();
  }
}

export const storage = new CSVStorage(); 