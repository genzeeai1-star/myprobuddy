var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import fs2 from "fs";
import path2 from "path";

// server/csv-storage.ts
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import { createObjectCsvWriter } from "csv-writer";
var CSVStorage = class {
  dataDir;
  users = [];
  partners = [];
  leads = [];
  statusHierarchy = [];
  activityLogs = [];
  initialized = false;
  initializationPromise = null;
  constructor() {
    this.dataDir = path.join(process.cwd(), "data");
    this.ensureDataDirectory();
    this.initializationPromise = this.initialize();
  }
  async initialize() {
    if (this.initialized) return;
    try {
      await this.loadAllData();
      await this.initializeDefaultData();
      this.initialized = true;
    } catch (error) {
      console.error("Error initializing CSV storage:", error);
      await this.recreateFiles();
    }
  }
  async ensureInitialized() {
    if (!this.initialized) {
      if (this.initializationPromise) {
        await this.initializationPromise;
      } else {
        await this.initialize();
      }
    }
  }
  async recreateFiles() {
    try {
      this.users = [];
      this.partners = [];
      this.leads = [];
      this.statusHierarchy = [];
      this.activityLogs = [];
      const files = ["users.csv", "partners.csv", "leads.csv", "status-hierarchy.csv", "activity-logs.csv"];
      for (const file of files) {
        const filePath = this.getFilePath(file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      await this.initializeDefaultData();
      this.initialized = true;
    } catch (error) {
      console.error("Error recreating CSV files:", error);
      throw error;
    }
  }
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }
  getFilePath(filename) {
    return path.join(this.dataDir, filename);
  }
  async loadCSV(filename, transform) {
    const filePath = this.getFilePath(filename);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = fs.createReadStream(filePath);
      stream.pipe(csvParser({ headers: true })).on("data", (row) => {
        try {
          const firstValue = Object.values(row)[0];
          if (firstValue && typeof firstValue === "string" && (firstValue === "id" || firstValue.includes("id") || firstValue.includes("username"))) {
            return;
          }
          const hasData = Object.values(row).some((value) => {
            const strValue = String(value);
            return strValue && strValue !== "";
          });
          if (!hasData) {
            return;
          }
          if (transform) {
            const transformed = transform(row);
            results.push(transformed);
          } else {
            results.push(row);
          }
        } catch (error) {
          console.error(`Error processing row in ${filename}:`, error);
        }
      }).on("end", () => {
        resolve(results);
      }).on("error", (error) => {
        console.error(`Error reading CSV file ${filename}:`, error);
        reject(error);
      });
    });
  }
  async saveCSV(filename, data, headers) {
    const filePath = this.getFilePath(filename);
    const tempFilePath = filePath + ".tmp";
    try {
      const csvWriter = createObjectCsvWriter({
        path: tempFilePath,
        header: headers.map((header) => ({ id: header, title: header }))
      });
      await csvWriter.writeRecords(data);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      fs.renameSync(tempFilePath, filePath);
    } catch (error) {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      console.error(`Error saving CSV file ${filePath}:`, error);
      throw error;
    }
  }
  async loadAllData() {
    try {
      this.users = await this.loadCSV("users.csv", (row) => {
        const user = {
          id: row._0 || row.id,
          username: row._1 || row.username,
          passwordHash: row._2 || row.passwordHash,
          role: row._3 || row.role,
          email: row._4 || row.email,
          phone: row._5 || row.phone
        };
        return user;
      }).catch(() => []);
      this.partners = await this.loadCSV("partners.csv", (row) => ({
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
        type: row._12 || row.type,
        equityLink: row._13 || row.equityLink,
        grantLink: row._14 || row.grantLink,
        qrEquity: row._15 || row.qrEquity,
        qrGrant: row._16 || row.qrGrant
      })).catch(() => []);
      this.leads = await this.loadCSV("leads.csv", (row) => {
        return {
          id: row.id || row._0,
          createdOnDate: row.createdOnDate || row._1,
          companyName: row.companyName || row._2,
          founderName: row.founderName || row._3,
          ownerName: row.ownerName || row._4,
          contact: row.contact || row._5,
          email: row.email || row._6,
          phone: row.phone || row._7,
          deliveryType: row.deliveryType || row._8,
          serviceType: row.serviceType || row._9,
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
        console.error("Error loading leads:", error);
        return [];
      });
      this.statusHierarchy = await this.loadCSV("status-hierarchy.csv", (row) => ({
        id: row._0 || row.id,
        statusName: row._1 || row.statusName,
        nextStatuses: row._2 || row.nextStatuses,
        daysLimit: row._3 || row.daysLimit ? parseInt(row._3 || row.daysLimit) : void 0,
        autoMoveTo: row._4 || row.autoMoveTo
      })).catch(() => []);
      this.activityLogs = await this.loadCSV("activity-logs.csv", (row) => ({
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
      this.users = [];
      this.partners = [];
      this.leads = [];
      this.statusHierarchy = [];
      this.activityLogs = [];
    }
  }
  async saveAllData() {
    try {
      await this.saveCSV("users.csv", this.users, [
        "id",
        "username",
        "passwordHash",
        "role",
        "email",
        "phone"
      ]).catch((error) => {
        console.error("Error saving users.csv:", error);
        throw error;
      });
      await this.saveCSV("partners.csv", this.partners, [
        "id",
        "name",
        "businessName",
        "contactPerson",
        "email",
        "phone",
        "companyDetails",
        "businessType",
        "gstNumber",
        "panNumber",
        "status",
        "registrationDate",
        "type",
        "equityLink",
        "grantLink",
        "qrEquity",
        "qrGrant"
      ]).catch((error) => {
        console.error("Error saving partners.csv:", error);
        throw error;
      });
      await this.saveCSV("leads.csv", this.leads, [
        "id",
        "createdOnDate",
        "companyName",
        "founderName",
        "ownerName",
        "contact",
        "email",
        "phone",
        "deliveryType",
        "serviceType",
        "formDataJSON",
        "lastStatus",
        "lastStatusUpdatedDate",
        "currentStatus",
        "PartnerId",
        "PartnerName",
        "createdByUserId",
        "assignedToUserId"
      ]).catch((error) => {
        console.error("Error saving leads.csv:", error);
        throw error;
      });
      await this.saveCSV("status-hierarchy.csv", this.statusHierarchy, [
        "id",
        "statusName",
        "nextStatuses",
        "daysLimit",
        "autoMoveTo"
      ]).catch((error) => {
        console.error("Error saving status-hierarchy.csv:", error);
        throw error;
      });
      await this.saveCSV("activity-logs.csv", this.activityLogs, [
        "id",
        "timestamp",
        "userId",
        "action",
        "entity",
        "entityId",
        "details"
      ]).catch((error) => {
        console.error("Error saving activity-logs.csv:", error);
        throw error;
      });
    } catch (error) {
      console.error("Error saving CSV data:", error);
      throw error;
    }
  }
  async initializeDefaultData() {
    if (this.users.length === 0) {
      const adminUser = {
        id: randomUUID(),
        username: "admin",
        passwordHash: await bcrypt.hash("admin123", 10),
        role: "Admin",
        email: "admin@myprobuddy.com",
        phone: "+91 9876543210"
      };
      this.users.push(adminUser);
      const managerUser = {
        id: randomUUID(),
        username: "manager",
        passwordHash: await bcrypt.hash("manager123", 10),
        role: "Manager",
        email: "manager@myprobuddy.com",
        phone: "+91 9876543211"
      };
      this.users.push(managerUser);
      const customerSuccessUser = {
        id: randomUUID(),
        username: "customer_success",
        passwordHash: await bcrypt.hash("customer123", 10),
        role: "Customer success officer",
        email: "customer@myprobuddy.com",
        phone: "+91 9876543212"
      };
      this.users.push(customerSuccessUser);
      const operationsUser = {
        id: randomUUID(),
        username: "operations",
        passwordHash: await bcrypt.hash("operations123", 10),
        role: "Operations",
        email: "operations@myprobuddy.com",
        phone: "+91 9876543213"
      };
      this.users.push(operationsUser);
      const partner1 = {
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
        registrationDate: (/* @__PURE__ */ new Date()).toISOString(),
        status: "Active",
        type: "Both",
        equityLink: `http://localhost:5000/submit/${randomUUID()}/equity`,
        grantLink: `http://localhost:5000/submit/${randomUUID()}/grant`,
        qrEquity: `qr-equity-${randomUUID()}`,
        qrGrant: `qr-grant-${randomUUID()}`
      };
      this.partners.push(partner1);
      const partner2 = {
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
        registrationDate: (/* @__PURE__ */ new Date()).toISOString(),
        status: "Active",
        type: "Grant",
        equityLink: `http://localhost:5000/submit/${randomUUID()}/equity`,
        grantLink: `http://localhost:5000/submit/${randomUUID()}/grant`,
        qrEquity: `qr-equity-${randomUUID()}`,
        qrGrant: `qr-grant-${randomUUID()}`
      };
      this.partners.push(partner2);
      const lead1 = {
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
        createdOnDate: (/* @__PURE__ */ new Date()).toISOString(),
        lastStatusUpdatedDate: (/* @__PURE__ */ new Date()).toISOString(),
        createdByUserId: adminUser.id,
        formDataJSON: JSON.stringify({
          companyType: "Private Limited",
          industry: "Technology",
          fundingAmount: "50000000",
          businessDescription: "AI-powered automation solutions"
        })
      };
      this.leads.push(lead1);
      const statuses = [
        { statusName: "New Lead", nextStatuses: "RNR;Call Back;Not Interested;Interested", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "RNR", nextStatuses: "Interested;Reject - RNR", daysLimit: 6, autoMoveTo: "Reject - RNR" },
        { statusName: "Call Back", nextStatuses: "Interested;Reject - Not Attend", daysLimit: 6, autoMoveTo: "Reject - Not Attend" },
        { statusName: "Not Interested", nextStatuses: "Reject - Not Interested", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Interested", nextStatuses: "Reject - Screening Fail;Screening Pass", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Screening Pass", nextStatuses: "Proposal to be Sent", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Proposal to be Sent", nextStatuses: "Proposal Sent", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Proposal Sent", nextStatuses: "Not Interested;Payment Link Sent", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Payment Link Sent", nextStatuses: "Not Paid;Paid", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Not Paid", nextStatuses: "Reject - Payment Not Done", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Paid", nextStatuses: "To Apply", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "To Apply", nextStatuses: "Applied", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Applied", nextStatuses: "Rejected;Approved", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Rejected", nextStatuses: "Final Reject", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Approved", nextStatuses: "", daysLimit: void 0, autoMoveTo: void 0 },
        // Reject statuses (final states)
        { statusName: "Reject - RNR", nextStatuses: "", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Reject - Not Attend", nextStatuses: "", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Reject - Not Interested", nextStatuses: "", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Reject - Screening Fail", nextStatuses: "", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Reject - Payment Not Done", nextStatuses: "", daysLimit: void 0, autoMoveTo: void 0 },
        { statusName: "Final Reject", nextStatuses: "", daysLimit: void 0, autoMoveTo: void 0 }
      ];
      for (const status of statuses) {
        const statusObj = {
          id: randomUUID(),
          ...status
        };
        this.statusHierarchy.push(statusObj);
      }
      await this.saveAllData();
    }
  }
  // User methods
  async getUser(id) {
    await this.ensureInitialized();
    return this.users.find((user) => user.id === id);
  }
  async getUserByUsername(username) {
    await this.ensureInitialized();
    return this.users.find((user) => user.username === username);
  }
  async getUserByEmail(email) {
    await this.ensureInitialized();
    return this.users.find((user) => user.email === email);
  }
  async createUser(insertUser) {
    await this.ensureInitialized();
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.push(user);
    await this.saveCSV("users.csv", this.users, [
      "id",
      "username",
      "passwordHash",
      "role",
      "email",
      "phone"
    ]);
    return user;
  }
  async updateUser(id, userUpdate) {
    await this.ensureInitialized();
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) return void 0;
    this.users[index] = { ...this.users[index], ...userUpdate };
    await this.saveCSV("users.csv", this.users, [
      "id",
      "username",
      "passwordHash",
      "role",
      "email",
      "phone"
    ]);
    return this.users[index];
  }
  async deleteUser(id) {
    await this.ensureInitialized();
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) return false;
    this.users.splice(index, 1);
    await this.saveCSV("users.csv", this.users, [
      "id",
      "username",
      "passwordHash",
      "role",
      "email",
      "phone"
    ]);
    return true;
  }
  async getAllUsers() {
    await this.ensureInitialized();
    return this.users;
  }
  // Partner methods
  async getPartner(id) {
    await this.ensureInitialized();
    return this.partners.find((partner) => partner.id === id);
  }
  async createPartner(insertPartner) {
    await this.ensureInitialized();
    const id = randomUUID();
    const partner = {
      ...insertPartner,
      id,
      registrationDate: (/* @__PURE__ */ new Date()).toISOString(),
      equityLink: `${process.env.BASE_URL || "http://localhost:5000"}/submit/${id}/equity`,
      grantLink: `${process.env.BASE_URL || "http://localhost:5000"}/submit/${id}/grant`,
      qrEquity: `qr-equity-${id}`,
      qrGrant: `qr-grant-${id}`
    };
    this.partners.push(partner);
    await this.saveCSV("partners.csv", this.partners, [
      "id",
      "name",
      "businessName",
      "contactPerson",
      "email",
      "phone",
      "companyDetails",
      "businessType",
      "gstNumber",
      "panNumber",
      "status",
      "registrationDate",
      "type",
      "equityLink",
      "grantLink",
      "qrEquity",
      "qrGrant"
    ]);
    return partner;
  }
  async updatePartner(id, partnerUpdate) {
    await this.ensureInitialized();
    const index = this.partners.findIndex((partner) => partner.id === id);
    if (index === -1) return void 0;
    this.partners[index] = { ...this.partners[index], ...partnerUpdate };
    await this.saveCSV("partners.csv", this.partners, [
      "id",
      "name",
      "businessName",
      "contactPerson",
      "email",
      "phone",
      "companyDetails",
      "businessType",
      "gstNumber",
      "panNumber",
      "status",
      "registrationDate",
      "type",
      "equityLink",
      "grantLink",
      "qrEquity",
      "qrGrant"
    ]);
    return this.partners[index];
  }
  async deletePartner(id) {
    await this.ensureInitialized();
    const index = this.partners.findIndex((partner) => partner.id === id);
    if (index === -1) return false;
    this.partners.splice(index, 1);
    await this.saveCSV("partners.csv", this.partners, [
      "id",
      "name",
      "businessName",
      "contactPerson",
      "email",
      "phone",
      "companyDetails",
      "businessType",
      "gstNumber",
      "panNumber",
      "status",
      "registrationDate",
      "type",
      "equityLink",
      "grantLink",
      "qrEquity",
      "qrGrant"
    ]);
    return true;
  }
  async regeneratePartnerLinks(id) {
    await this.ensureInitialized();
    const index = this.partners.findIndex((partner2) => partner2.id === id);
    if (index === -1) return void 0;
    const partner = this.partners[index];
    const equityLink = `http://localhost:5000/submit/${id}/equity`;
    const grantLink = `http://localhost:5000/submit/${id}/grant`;
    const qrEquity = `qr-equity-${id}`;
    const qrGrant = `qr-grant-${id}`;
    this.partners[index] = {
      ...partner,
      equityLink,
      grantLink,
      qrEquity,
      qrGrant
    };
    await this.saveCSV("partners.csv", this.partners, [
      "id",
      "name",
      "businessName",
      "contactPerson",
      "email",
      "phone",
      "companyDetails",
      "businessType",
      "gstNumber",
      "panNumber",
      "status",
      "registrationDate",
      "type",
      "equityLink",
      "grantLink",
      "qrEquity",
      "qrGrant"
    ]);
    return this.partners[index];
  }
  async getAllPartners() {
    await this.ensureInitialized();
    return this.partners;
  }
  // Lead methods
  async getLead(id) {
    await this.ensureInitialized();
    return this.leads.find((lead) => lead.id === id);
  }
  async createLead(insertLead) {
    await this.ensureInitialized();
    const id = randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const lead = {
      ...insertLead,
      id,
      createdOnDate: now,
      lastStatusUpdatedDate: now,
      currentStatus: insertLead.lastStatus || "New Lead"
    };
    this.leads.push(lead);
    await this.saveCSV("leads.csv", this.leads, [
      "id",
      "createdOnDate",
      "companyName",
      "founderName",
      "ownerName",
      "contact",
      "email",
      "phone",
      "deliveryType",
      "serviceType",
      "formDataJSON",
      "lastStatus",
      "lastStatusUpdatedDate",
      "currentStatus",
      "PartnerId",
      "PartnerName",
      "createdByUserId",
      "assignedToUserId"
    ]);
    return lead;
  }
  async updateLead(id, leadUpdate) {
    await this.ensureInitialized();
    const index = this.leads.findIndex((lead) => lead.id === id);
    if (index === -1) return void 0;
    const updatedLead = { ...this.leads[index], ...leadUpdate };
    if (leadUpdate.currentStatus && leadUpdate.currentStatus !== this.leads[index].currentStatus) {
      updatedLead.lastStatusUpdatedDate = (/* @__PURE__ */ new Date()).toISOString();
    }
    this.leads[index] = updatedLead;
    await this.saveCSV("leads.csv", this.leads, [
      "id",
      "createdOnDate",
      "companyName",
      "founderName",
      "ownerName",
      "contact",
      "email",
      "phone",
      "deliveryType",
      "serviceType",
      "formDataJSON",
      "lastStatus",
      "lastStatusUpdatedDate",
      "currentStatus",
      "PartnerId",
      "PartnerName",
      "createdByUserId",
      "assignedToUserId"
    ]);
    return updatedLead;
  }
  async deleteLead(id) {
    await this.ensureInitialized();
    const index = this.leads.findIndex((lead) => lead.id === id);
    if (index === -1) return false;
    this.leads.splice(index, 1);
    await this.saveCSV("leads.csv", this.leads, [
      "id",
      "createdOnDate",
      "companyName",
      "founderName",
      "ownerName",
      "contact",
      "email",
      "phone",
      "deliveryType",
      "serviceType",
      "formDataJSON",
      "lastStatus",
      "lastStatusUpdatedDate",
      "currentStatus",
      "PartnerId",
      "PartnerName",
      "createdByUserId",
      "assignedToUserId"
    ]);
    return true;
  }
  async getAllLeads() {
    await this.ensureInitialized();
    return this.leads;
  }
  async getLeadByPhone(phone) {
    await this.ensureInitialized();
    return this.leads.find((lead) => lead.phone === phone);
  }
  async getLeadsByPartner(PartnerId) {
    await this.ensureInitialized();
    return this.leads.filter((lead) => lead.PartnerId === PartnerId);
  }
  async getLeadsByStatus(status) {
    await this.ensureInitialized();
    return this.leads.filter((lead) => lead.currentStatus === status);
  }
  async getLeadsWithFilters(filters, page = 1, limit = 50) {
    await this.ensureInitialized();
    let filteredLeads = [...this.leads];
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredLeads = filteredLeads.filter(
        (lead) => lead.companyName.toLowerCase().includes(searchTerm) || lead.founderName.toLowerCase().includes(searchTerm) || lead.email.toLowerCase().includes(searchTerm) || lead.contact.toLowerCase().includes(searchTerm)
      );
    }
    if (filters.status) {
      filteredLeads = filteredLeads.filter((lead) => lead.currentStatus === filters.status);
    }
    if (filters.serviceType) {
      filteredLeads = filteredLeads.filter((lead) => lead.serviceType === filters.serviceType);
    }
    if (filters.assignedToUserId) {
      if (filters.assignedToUserId === "unassigned") {
        filteredLeads = filteredLeads.filter((lead) => !lead.assignedToUserId);
      } else {
        filteredLeads = filteredLeads.filter((lead) => lead.assignedToUserId === filters.assignedToUserId);
      }
    }
    if (filters.partnerId) {
      filteredLeads = filteredLeads.filter((lead) => lead.PartnerId === filters.partnerId);
    }
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      filteredLeads = filteredLeads.filter((lead) => new Date(lead.createdOnDate) >= dateFrom);
    }
    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filteredLeads = filteredLeads.filter((lead) => new Date(lead.createdOnDate) <= dateTo);
    }
    filteredLeads.sort((a, b) => new Date(b.createdOnDate).getTime() - new Date(a.createdOnDate).getTime());
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
  async getStatusHierarchy(id) {
    await this.ensureInitialized();
    return this.statusHierarchy.find((status) => status.id === id);
  }
  async createStatusHierarchy(insertStatus) {
    await this.ensureInitialized();
    const id = randomUUID();
    const status = { ...insertStatus, id };
    this.statusHierarchy.push(status);
    await this.saveCSV("status-hierarchy.csv", this.statusHierarchy, [
      "id",
      "statusName",
      "nextStatuses",
      "daysLimit",
      "autoMoveTo"
    ]);
    return status;
  }
  async updateStatusHierarchy(id, statusUpdate) {
    await this.ensureInitialized();
    const index = this.statusHierarchy.findIndex((status) => status.id === id);
    if (index === -1) return void 0;
    this.statusHierarchy[index] = { ...this.statusHierarchy[index], ...statusUpdate };
    await this.saveCSV("status-hierarchy.csv", this.statusHierarchy, [
      "id",
      "statusName",
      "nextStatuses",
      "daysLimit",
      "autoMoveTo"
    ]);
    return this.statusHierarchy[index];
  }
  async deleteStatusHierarchy(id) {
    await this.ensureInitialized();
    const index = this.statusHierarchy.findIndex((status) => status.id === id);
    if (index === -1) return false;
    this.statusHierarchy.splice(index, 1);
    await this.saveCSV("status-hierarchy.csv", this.statusHierarchy, [
      "id",
      "statusName",
      "nextStatuses",
      "daysLimit",
      "autoMoveTo"
    ]);
    return true;
  }
  async getAllStatusHierarchy() {
    await this.ensureInitialized();
    return this.statusHierarchy;
  }
  // Activity log methods
  async createActivityLog(insertLog) {
    await this.ensureInitialized();
    const id = randomUUID();
    const log2 = {
      ...insertLog,
      id,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.activityLogs.push(log2);
    await this.saveCSV("activity-logs.csv", this.activityLogs, [
      "id",
      "timestamp",
      "userId",
      "action",
      "entity",
      "entityId",
      "details"
    ]);
    return log2;
  }
  async getAllActivityLogs() {
    await this.ensureInitialized();
    return this.activityLogs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  async getActivityLogsByUser(userId) {
    await this.ensureInitialized();
    return this.activityLogs.filter((log2) => log2.userId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  // Debug method to force reinitialize
  async forceReinitialize() {
    this.initialized = false;
    this.initializationPromise = null;
    await this.initialize();
  }
};
var storage = new CSVStorage();

// server/services/status-engine.ts
import { randomUUID as randomUUID2 } from "crypto";
var StatusEngine = class {
  isRunning = false;
  async processAutomaticStatusChanges() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    try {
      const [leads, statusHierarchy] = await Promise.all([
        storage.getAllLeads(),
        storage.getAllStatusHierarchy()
      ]);
      const now = /* @__PURE__ */ new Date();
      const changesLog = [];
      let processedCount = 0;
      for (const lead of leads) {
        const currentStatusConfig = statusHierarchy.find(
          (status) => status.statusName === lead.currentStatus
        );
        if (!currentStatusConfig || !currentStatusConfig.daysLimit || !currentStatusConfig.autoMoveTo) {
          continue;
        }
        const lastStatusUpdate = new Date(lead.lastStatusUpdatedDate);
        const daysSinceUpdate = Math.floor(
          (now.getTime() - lastStatusUpdate.getTime()) / (1e3 * 60 * 60 * 24)
        );
        if (daysSinceUpdate >= currentStatusConfig.daysLimit) {
          const updatedLead = {
            currentStatus: currentStatusConfig.autoMoveTo,
            lastStatus: lead.currentStatus,
            lastStatusUpdatedDate: now.toISOString()
          };
          await storage.updateLead(lead.id, updatedLead);
          const activityLog = {
            id: randomUUID2(),
            timestamp: now.toISOString(),
            userId: "system",
            action: "auto_status_change",
            entity: "lead",
            entityId: lead.id,
            details: `Automatically moved from "${lead.currentStatus}" to "${currentStatusConfig.autoMoveTo}" after ${currentStatusConfig.daysLimit} days`
          };
          changesLog.push(activityLog);
          processedCount++;
        }
      }
      if (changesLog.length > 0) {
        for (const log2 of changesLog) {
          await storage.createActivityLog(log2);
        }
      }
    } catch (error) {
      console.error("Error during automatic status processing:", error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
  async validateStatusTransition(currentStatus, newStatus) {
    const statusHierarchy = await storage.getAllStatusHierarchy();
    const currentStatusConfig = statusHierarchy.find(
      (status) => status.statusName === currentStatus
    );
    if (!currentStatusConfig) {
      return false;
    }
    const allowedNextStatuses = currentStatusConfig.nextStatuses.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
    return allowedNextStatuses.includes(newStatus);
  }
  async getAvailableTransitions(currentStatus) {
    const statusHierarchy = await storage.getAllStatusHierarchy();
    const currentStatusConfig = statusHierarchy.find(
      (status) => status.statusName === currentStatus
    );
    if (!currentStatusConfig) {
      return [];
    }
    const transitions = currentStatusConfig.nextStatuses.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
    return transitions;
  }
  async getStatusHierarchy() {
    return await storage.getAllStatusHierarchy();
  }
  async addStatusHierarchy(status) {
    return await storage.createStatusHierarchy(status);
  }
  async updateStatusHierarchy(id, updates) {
    const result = await storage.updateStatusHierarchy(id, updates);
    return result !== void 0;
  }
  async deleteStatusHierarchy(id) {
    return await storage.deleteStatusHierarchy(id);
  }
  startScheduledProcessing(intervalHours = 24) {
    const intervalMs = intervalHours * 60 * 60 * 1e3;
    this.processAutomaticStatusChanges().catch(console.error);
    setInterval(() => {
      this.processAutomaticStatusChanges().catch(console.error);
    }, intervalMs);
  }
  async getLeadsRequiringAttention() {
    const [leads, statusHierarchy] = await Promise.all([
      storage.getAllLeads(),
      storage.getAllStatusHierarchy()
    ]);
    const now = /* @__PURE__ */ new Date();
    const attentionLeads = [];
    for (const lead of leads) {
      const statusConfig = statusHierarchy.find(
        (status) => status.statusName === lead.currentStatus
      );
      if (!statusConfig || !statusConfig.daysLimit) {
        continue;
      }
      const lastUpdate = new Date(lead.lastStatusUpdatedDate);
      const daysSinceUpdate = Math.floor(
        (now.getTime() - lastUpdate.getTime()) / (1e3 * 60 * 60 * 24)
      );
      if (daysSinceUpdate >= statusConfig.daysLimit - 1) {
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
};
var statusEngine = new StatusEngine();

// shared/schema.ts
import { z } from "zod";
var userSchema = z.object({
  id: z.string(),
  username: z.string(),
  passwordHash: z.string(),
  role: z.enum(["Admin", "Customer success officer", "Analyst", "Operations", "Manager"]),
  email: z.string().email(),
  phone: z.string()
});
var insertUserSchema = userSchema.omit({ id: true });
var createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["Admin", "Customer success officer", "Analyst", "Operations", "Manager"]),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required")
});
var PartnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  businessName: z.string(),
  contactPerson: z.string(),
  email: z.string().email(),
  phone: z.string(),
  companyDetails: z.string(),
  businessType: z.string(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  status: z.string().default("Active"),
  registrationDate: z.string(),
  type: z.enum(["Grant", "Equity", "Both"]),
  equityLink: z.string().optional(),
  grantLink: z.string().optional(),
  qrEquity: z.string().optional(),
  qrGrant: z.string().optional()
});
var insertPartnerSchema = PartnerSchema.omit({ id: true, equityLink: true, grantLink: true, qrEquity: true, qrGrant: true, registrationDate: true });
var leadSchema = z.object({
  id: z.string(),
  createdOnDate: z.string(),
  companyName: z.string(),
  founderName: z.string(),
  ownerName: z.string(),
  contact: z.string(),
  email: z.string().email(),
  phone: z.string(),
  deliveryType: z.enum(["Grant", "Equity"]),
  serviceType: z.enum(["Grant", "Equity"]),
  formDataJSON: z.string(),
  lastStatus: z.string(),
  lastStatusUpdatedDate: z.string(),
  currentStatus: z.string(),
  PartnerId: z.string(),
  PartnerName: z.string(),
  // Partner name field
  createdByUserId: z.string(),
  assignedToUserId: z.string().optional()
  // New field for lead assignment
});
var insertLeadSchema = leadSchema.omit({ id: true, createdOnDate: true, lastStatusUpdatedDate: true });
var statusHierarchySchema = z.object({
  id: z.string(),
  statusName: z.string(),
  nextStatuses: z.string(),
  // semicolon-separated values
  daysLimit: z.number().optional(),
  autoMoveTo: z.string().optional()
});
var insertStatusHierarchySchema = statusHierarchySchema.omit({ id: true });
var activityLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  userId: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string(),
  details: z.string()
});
var insertActivityLogSchema = activityLogSchema.omit({ id: true, timestamp: true });
var loginSchema = z.object({
  username: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required")
});
var grantFormSchema = z.object({
  websiteLink: z.string().url().optional(),
  isRegistered: z.enum(["yes", "no"]),
  trademarkRegistered: z.enum(["yes", "no"]).optional(),
  address: z.string(),
  dpiitRegistered: z.enum(["yes", "no"]).optional(),
  companyType: z.string(),
  startupSector: z.string(),
  numberOfFounders: z.number(),
  linkedProfile: z.string().optional(),
  gender: z.string(),
  area: z.string(),
  womenEntrepreneurs: z.enum(["yes", "no"]).optional(),
  oneLiner: z.string(),
  keyFocusArea: z.string(),
  linkedinProfile: z.string().url().optional(),
  companyAge: z.number(),
  lastYearRevenue: z.number().optional(),
  fundingRequirement: z.number(),
  angelInvestorStartup: z.enum(["yes", "no"]).optional(),
  debtRaise: z.enum(["yes", "no"]).optional(),
  source: z.string(),
  sourceFile: z.string().optional()
});
var equityFormSchema = z.object({
  foundersLinkedin: z.string().url().optional(),
  address: z.string(),
  companyName: z.string(),
  registrationType: z.string(),
  problemSolution: z.string(),
  website: z.string().url().optional(),
  keyTeam: z.string(),
  pastGrants: z.string().optional(),
  incubationAccelerator: z.string().optional(),
  industry: z.string(),
  businessStage: z.string(),
  certifications: z.string().optional(),
  competitors: z.string(),
  lastYearRevenue: z.number().optional(),
  revenueProjections: z.number(),
  profitability: z.string(),
  ebitda: z.number().optional(),
  gmv: z.number().optional(),
  margins: z.number().optional(),
  expenses: z.number(),
  runway: z.number(),
  liabilities: z.number().optional(),
  fundingAmount: z.number(),
  purpose: z.string(),
  valuation: z.number(),
  equityWillingness: z.enum(["yes", "no"]),
  percentageEquity: z.number(),
  cac: z.number().optional(),
  ltv: z.number().optional(),
  nps: z.number().optional(),
  milestones: z.string(),
  threeToFiveYearVision: z.string(),
  exitStrategy: z.string(),
  pastAcquisitionInterest: z.enum(["yes", "no"]).optional(),
  fundingType: z.string(),
  source: z.string(),
  sourceFile: z.string().optional()
});
var bulkUploadSchema = z.object({
  leads: z.array(z.object({
    companyName: z.string(),
    founderName: z.string(),
    contact: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    serviceType: z.enum(["Grant", "Equity"]),
    assignedToUserId: z.string().optional()
  }))
});

// server/routes.ts
import { z as z2 } from "zod";
import bcrypt2 from "bcrypt";
import session from "express-session";
async function registerRoutes(app2) {
  const sessionsDir = path2.join(process.cwd(), "data", "sessions");
  if (!fs2.existsSync(sessionsDir)) {
    fs2.mkdirSync(sessionsDir, { recursive: true });
  } else {
    try {
      const files = fs2.readdirSync(sessionsDir);
      files.forEach((file) => {
        if (file.endsWith(".json")) {
          fs2.unlinkSync(path2.join(sessionsDir, file));
        }
      });
    } catch (error) {
      console.warn("Could not clear session files:", error instanceof Error ? error.message : "Unknown error");
    }
  }
  app2.use(session({
    secret: process.env.SESSION_SECRET || "myprobuddy-secret-key",
    resave: false,
    saveUninitialized: false,
    // Use memory store (default) - sessions won't persist across server restarts
    // but this avoids Windows file permission issues
    cookie: {
      secure: false,
      // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    }
  }));
  const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };
  const requireRole = (roles) => {
    return async (req, res, next) => {
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
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isValid = await bcrypt2.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.userId = user.id;
      req.session.user = { ...user, passwordHash: void 0 };
      await storage.createActivityLog({
        userId: user.id,
        action: "login",
        entity: "user",
        entityId: user.id,
        details: `User ${user.username} logged in`
      });
      res.json({ user: { ...user, passwordHash: void 0 } });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });
  app2.post("/api/auth/logout", requireAuth, async (req, res) => {
    const userId = req.session.userId;
    try {
      await new Promise((resolve, reject) => {
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
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ ...user, passwordHash: void 0 });
  });
  app2.get("/api/users", requireRole(["Admin", "Manager", "Customer success officer"]), async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users.map((u) => ({ ...u, passwordHash: void 0 })));
  });
  app2.post("/api/users", requireRole(["Admin"]), async (req, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      const hashedPassword = await bcrypt2.hash(userData.password, 10);
      const user = await storage.createUser({
        username: userData.username,
        passwordHash: hashedPassword,
        role: userData.role,
        email: userData.email,
        phone: userData.phone
      });
      await storage.createActivityLog({
        userId: req.session.userId,
        action: "create",
        entity: "user",
        entityId: user.id,
        details: `Created user ${user.username}`
      });
      res.json({ ...user, passwordHash: void 0 });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(400).json({ message: "Invalid user data" });
      }
    }
  });
  app2.put("/api/users/:id", requireRole(["Admin"]), async (req, res) => {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      if (updateData.password) {
        updateData.passwordHash = await bcrypt2.hash(updateData.password, 10);
        delete updateData.password;
      }
      const user = await storage.updateUser(userId, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.createActivityLog({
        userId: req.session.userId,
        action: "update",
        entity: "user",
        entityId: user.id,
        details: `Updated user ${user.username}`
      });
      res.json({ ...user, passwordHash: void 0 });
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });
  app2.delete("/api/users/:id", requireRole(["Admin"]), async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (userId === req.session.userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.createActivityLog({
        userId: req.session.userId,
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
  app2.get("/api/partners", requireRole(["Admin", "Manager", "Customer success officer", "Operations", "Analyst"]), async (req, res) => {
    const partners = await storage.getAllPartners();
    res.json(partners);
  });
  app2.post("/api/partners", requireRole(["Admin", "Manager"]), async (req, res) => {
    try {
      const PartnerData = insertPartnerSchema.parse(req.body);
      const Partner = await storage.createPartner(PartnerData);
      await storage.createActivityLog({
        userId: req.session.userId,
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
  app2.get("/api/partners/:id", requireRole(["Admin", "Manager", "Partner"]), async (req, res) => {
    const partner = await storage.getPartner(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }
    res.json(partner);
  });
  app2.put("/api/partners/:id", requireRole(["Admin", "Manager"]), async (req, res) => {
    try {
      const Partner = await storage.updatePartner(req.params.id, req.body);
      if (!Partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      await storage.createActivityLog({
        userId: req.session.userId,
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
  app2.delete("/api/partners/:id", requireRole(["Admin"]), async (req, res) => {
    const success = await storage.deletePartner(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Partner not found" });
    }
    await storage.createActivityLog({
      userId: req.session.userId,
      action: "delete",
      entity: "Partner",
      entityId: req.params.id,
      details: `Deleted Partner`
    });
    res.json({ message: "Partner deleted successfully" });
  });
  app2.post("/api/partners/:id/regenerate-links", requireRole(["Admin", "Manager"]), async (req, res) => {
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
        userId: req.session.userId,
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
  app2.get("/api/leads", requireRole(["Admin", "Manager", "Customer success officer", "Operations", "Analyst"]), async (req, res) => {
    const user = await storage.getUser(req.session.userId);
    let leads = await storage.getAllLeads();
    if (user?.role === "Partner") {
      const Partners = await storage.getAllPartners();
      const userPartner = Partners.find((m) => m.email === user.email);
      if (userPartner) {
        leads = leads.filter((lead) => lead.PartnerId === userPartner.id);
      } else {
        leads = [];
      }
    }
    res.json(leads);
  });
  app2.get("/api/leads/filter", requireRole(["Admin", "Manager", "Customer success officer", "Operations", "Analyst"]), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
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
      const filters = {};
      if (search) {
        filters.search = search;
      }
      if (status) {
        filters.status = status;
      }
      if (serviceType) {
        filters.serviceType = serviceType;
      }
      if (assignedToUserId) {
        filters.assignedToUserId = assignedToUserId;
      }
      if (dateFrom) {
        filters.dateFrom = dateFrom;
      }
      if (dateTo) {
        filters.dateTo = dateTo;
      }
      if (user?.role === "Partner") {
        const Partners = await storage.getAllPartners();
        const userPartner = Partners.find((m) => m.email === user.email);
        if (userPartner) {
          filters.partnerId = userPartner.id;
        } else {
          res.json({ leads: [], total: 0, page: parseInt(page), totalPages: 0 });
          return;
        }
      }
      const leads = await storage.getLeadsWithFilters(filters, parseInt(page), parseInt(limit));
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to filter leads" });
    }
  });
  app2.get("/api/leads/requiring-attention", requireAuth, async (req, res) => {
    try {
      const attentionLeads = await statusEngine.getLeadsRequiringAttention();
      res.json(attentionLeads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads requiring attention" });
    }
  });
  app2.get("/api/leads/status-overview", requireRole(["Admin", "Manager", "Customer success officer", "Operations", "Analyst"]), async (req, res) => {
    try {
      const { dateFrom, dateTo, assignedToUserId, partnerId, leadType, statusType } = req.query;
      let leads = await storage.getAllLeads();
      if (dateFrom || dateTo) {
        leads = leads.filter((lead) => {
          const leadDate = new Date(lead.createdOnDate);
          const fromDate = dateFrom ? /* @__PURE__ */ new Date(dateFrom + "T00:00:00") : null;
          const toDate = dateTo ? /* @__PURE__ */ new Date(dateTo + "T23:59:59") : null;
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
      if (assignedToUserId) {
        leads = leads.filter((lead) => lead.assignedToUserId === assignedToUserId);
      }
      if (partnerId) {
        const partners = await storage.getAllPartners();
        const partner = partners.find((p) => p.id === partnerId);
        if (partner) {
          leads = leads.filter((lead) => lead.PartnerName === partner.businessName);
        }
      }
      if (leadType) {
        leads = leads.filter((lead) => {
          if (leadType === "equity" && (lead.deliveryType === "Equity" || lead.serviceType === "Equity")) {
            return true;
          }
          if (leadType === "grants" && (lead.deliveryType === "Grant" || lead.serviceType === "Grant")) {
            return true;
          }
          return false;
        });
      }
      const activeStatuses = [
        "New Lead",
        "RNR",
        "Call Back",
        "Not Interested",
        "Interested",
        "Screening Pass",
        "Proposal to be Sent",
        "Proposal Sent",
        "Payment Link Sent",
        "Not Paid",
        "Paid",
        "To Apply",
        "Applied",
        "Approved"
      ];
      const inactiveStatuses = [
        "Reject - RNR",
        "Reject - Not Attend",
        "Reject - Not Interested",
        "Reject - Screening Fail",
        "Reject - Payment Not Done",
        "Final Reject",
        "Rules Reject",
        "Rejected"
      ];
      if (statusType === "active") {
        leads = leads.filter((lead) => activeStatuses.includes(lead.currentStatus));
      } else if (statusType === "inactive") {
        leads = leads.filter((lead) => inactiveStatuses.includes(lead.currentStatus));
      }
      const activeStatusesCount = {};
      const inactiveStatusesCount = {};
      leads.forEach((lead) => {
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
        totalActive: Object.values(activeStatusesCount).reduce((a, b) => a + b, 0),
        totalInactive: Object.values(inactiveStatusesCount).reduce((a, b) => a + b, 0)
      };
      res.json(result);
    } catch (error) {
      console.error("Error fetching status overview:", error);
      res.status(500).json({ message: "Failed to fetch status overview" });
    }
  });
  app2.get("/api/leads/:id", requireRole(["Admin", "Manager", "Customer success officer", "Operations", "Analyst"]), async (req, res) => {
    const lead = await storage.getLead(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    const user = await storage.getUser(req.session.userId);
    if (user?.role === "Partner") {
      const Partners = await storage.getAllPartners();
      const userPartner = Partners.find((m) => m.email === user.email);
      if (!userPartner || lead.PartnerId !== userPartner.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }
    res.json(lead);
  });
  app2.post("/api/leads", requireRole(["Admin", "Manager", "Partner"]), async (req, res) => {
    try {
      const leadData = insertLeadSchema.parse(req.body);
      const existingLeadWithPhone = await storage.getLeadByPhone(leadData.phone);
      if (existingLeadWithPhone) {
        return res.status(400).json({
          message: "A lead with this phone number already exists",
          details: `Phone number ${leadData.phone} is already used by ${existingLeadWithPhone.companyName}`
        });
      }
      const lead = await storage.createLead(leadData);
      await storage.createActivityLog({
        userId: req.session.userId,
        action: "create",
        entity: "lead",
        entityId: lead.id,
        details: `Created lead for ${lead.companyName}`
      });
      res.json(lead);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(400).json({ message: "Invalid lead data" });
      }
    }
  });
  app2.put("/api/leads/:id", requireRole(["Admin", "Manager"]), async (req, res) => {
    try {
      const existingLead = await storage.getLead(req.params.id);
      if (!existingLead) {
        return res.status(404).json({ message: "Lead not found" });
      }
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
      if (req.body.currentStatus && req.body.currentStatus !== existingLead.currentStatus) {
        await storage.createActivityLog({
          userId: req.session.userId,
          action: "status_change",
          entity: "lead",
          entityId: lead.id,
          details: `Changed status from "${existingLead.currentStatus}" to "${req.body.currentStatus}" for ${lead.companyName}`
        });
      } else {
        await storage.createActivityLog({
          userId: req.session.userId,
          action: "update",
          entity: "lead",
          entityId: lead.id,
          details: `Updated lead for ${lead.companyName}`
        });
      }
      res.json(lead);
    } catch (error) {
      res.status(400).json({ message: "Invalid lead data" });
    }
  });
  app2.delete("/api/leads/:id", requireRole(["Admin"]), async (req, res) => {
    const lead = await storage.getLead(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    const success = await storage.deleteLead(req.params.id);
    if (!success) {
      return res.status(400).json({ message: "Failed to delete lead" });
    }
    await storage.createActivityLog({
      userId: req.session.userId,
      action: "delete",
      entity: "lead",
      entityId: req.params.id,
      details: `Deleted lead for ${lead.companyName}`
    });
    res.json({ message: "Lead deleted successfully" });
  });
  app2.get("/api/status-hierarchy", requireAuth, async (req, res) => {
    try {
      const statusHierarchy = await statusEngine.getStatusHierarchy();
      res.json(statusHierarchy);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch status hierarchy" });
    }
  });
  app2.get("/api/leads/:id/available-transitions", requireAuth, async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      const availableTransitions = await statusEngine.getAvailableTransitions(lead.currentStatus);
      console.log(`Available transitions for "${lead.currentStatus}":`, availableTransitions);
      res.json({ availableTransitions });
    } catch (error) {
      console.error("Error in available-transitions endpoint:", error);
      res.status(500).json({ message: "Failed to fetch available transitions" });
    }
  });
  app2.get("/api/debug/status-hierarchy", requireRole(["Admin"]), async (req, res) => {
    try {
      const statusHierarchy = await storage.getAllStatusHierarchy();
      res.json({ statusHierarchy });
    } catch (error) {
      console.error("Error fetching status hierarchy:", error);
      res.status(500).json({ message: "Failed to fetch status hierarchy" });
    }
  });
  app2.post("/api/debug/reinitialize-status-hierarchy", requireRole(["Admin"]), async (req, res) => {
    try {
      const existingStatuses = await storage.getAllStatusHierarchy();
      for (const status of existingStatuses) {
        await storage.deleteStatusHierarchy(status.id);
      }
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
  app2.post("/api/leads/:id/change-status", requireRole(["Admin", "Manager", "Customer success officer", "Operations"]), async (req, res) => {
    try {
      const { newStatus } = req.body;
      if (!newStatus) {
        return res.status(400).json({ message: "New status is required" });
      }
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      const isValidTransition = await statusEngine.validateStatusTransition(lead.currentStatus, newStatus);
      if (!isValidTransition) {
        return res.status(400).json({ message: "Invalid status transition" });
      }
      const updatedLead = await storage.updateLead(req.params.id, {
        lastStatus: lead.currentStatus,
        currentStatus: newStatus,
        lastStatusUpdatedDate: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (!updatedLead) {
        return res.status(500).json({ message: "Failed to update lead status" });
      }
      if (newStatus === "Screening Pass") {
        const allUsers = await storage.getAllUsers();
        const managerUser = allUsers.find((user) => user.role === "Manager");
        if (managerUser) {
          await storage.updateLead(req.params.id, {
            assignedToUserId: managerUser.id
          });
          await storage.createActivityLog({
            userId: req.session.userId,
            action: "auto_assign",
            entity: "lead",
            entityId: lead.id,
            details: `Auto-assigned lead ${lead.companyName} to Manager ${managerUser.username} after status change to Screening Pass`
          });
        }
      }
      await storage.createActivityLog({
        userId: req.session.userId,
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
  app2.post("/api/status-engine/process-automatic", requireRole(["Admin"]), async (req, res) => {
    try {
      await statusEngine.processAutomaticStatusChanges();
      res.json({ message: "Automatic status processing completed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process automatic status changes" });
    }
  });
  app2.get("/submit/:PartnerId/grant", async (req, res) => {
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
                      <span class="absolute left-3 top-3 text-gray-500">\u20B9</span>
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
                      <option value="Technology">\u{1F680} Technology</option>
                      <option value="Healthcare">\u{1F3E5} Healthcare</option>
                      <option value="Education">\u{1F4DA} Education</option>
                      <option value="Finance">\u{1F4B0} Finance</option>
                      <option value="Manufacturing">\u{1F3ED} Manufacturing</option>
                      <option value="Retail">\u{1F6CD}\uFE0F Retail</option>
                      <option value="Agriculture">\u{1F33E} Agriculture</option>
                      <option value="Other">\u{1F527} Other</option>
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
  app2.get("/submit/:PartnerId/equity", async (req, res) => {
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
                      <span class="absolute left-3 top-3 text-gray-500">\u20B9</span>
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
                    <option value="Technology">\u{1F680} Technology</option>
                    <option value="Healthcare">\u{1F3E5} Healthcare</option>
                    <option value="Education">\u{1F4DA} Education</option>
                    <option value="Finance">\u{1F4B0} Finance</option>
                    <option value="Manufacturing">\u{1F3ED} Manufacturing</option>
                    <option value="Retail">\u{1F6CD}\uFE0F Retail</option>
                    <option value="Agriculture">\u{1F33E} Agriculture</option>
                    <option value="Other">\u{1F527} Other</option>
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
  app2.post("/api/submit/:PartnerId/grant", async (req, res) => {
    try {
      const PartnerId = req.params.PartnerId;
      const Partner = await storage.getPartner(PartnerId);
      if (!Partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      const { companyName, founderName, contact, email, businessDescription, fundingAmount, industry, companyAge } = req.body;
      if (!companyName || !founderName || !contact || !email || !businessDescription || !fundingAmount || !industry) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }
      const lead = await storage.createLead({
        companyName,
        founderName,
        ownerName: founderName,
        contact,
        email,
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
        details: `Grant application submitted for ${lead.companyName}${(parseInt(companyAge) || 0) > 3 ? ` - Automatically moved to Rules Reject due to company age (${companyAge} years)` : ""}`
      });
      res.json({ message: "Grant application submitted successfully", leadId: lead.id });
    } catch (error) {
      console.error("Grant submission error:", error);
      res.status(400).json({ message: "Invalid form data" });
    }
  });
  app2.post("/api/submit/:PartnerId/equity", async (req, res) => {
    try {
      const PartnerId = req.params.PartnerId;
      const Partner = await storage.getPartner(PartnerId);
      if (!Partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      const { companyName, founderName, contact, email, businessDescription, equityPercentage, valuation, industry } = req.body;
      if (!companyName || !founderName || !contact || !email || !businessDescription || !equityPercentage || !valuation || !industry) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }
      const lead = await storage.createLead({
        companyName,
        founderName,
        ownerName: founderName,
        contact,
        email,
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
  app2.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    const { period = "this-month" } = req.query;
    console.log("Server: Dashboard stats requested for period:", period);
    const user = await storage.getUser(req.session.userId);
    const Partners = await storage.getAllPartners();
    const leads = await storage.getAllLeads();
    const users = await storage.getAllUsers();
    const activityLogs = await storage.getAllActivityLogs();
    console.log("Server: Total leads before filtering:", leads.length);
    let periodFilteredLeads = leads;
    const now = /* @__PURE__ */ new Date();
    if (period === "this-month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      periodFilteredLeads = leads.filter((lead) => new Date(lead.createdOnDate) >= startOfMonth);
    } else if (period === "last-month") {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      periodFilteredLeads = leads.filter((lead) => {
        const leadDate = new Date(lead.createdOnDate);
        return leadDate >= startOfLastMonth && leadDate <= endOfLastMonth;
      });
    } else if (period === "this-quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      periodFilteredLeads = leads.filter((lead) => new Date(lead.createdOnDate) >= startOfQuarter);
    }
    console.log("Server: Period filtered leads:", periodFilteredLeads.length);
    let filteredLeads = periodFilteredLeads;
    let filteredPartners = Partners;
    if (user?.role === "Partner") {
      const userPartner = Partners.find((m) => m.email === user.email);
      if (userPartner) {
        filteredLeads = periodFilteredLeads.filter((lead) => lead.PartnerId === userPartner.id);
        filteredPartners = [userPartner];
      } else {
        filteredLeads = [];
        filteredPartners = [];
      }
    }
    const totalLeads = filteredLeads.length;
    const activeLeads = filteredLeads.filter((lead) => !lead.currentStatus.includes("Reject") && lead.currentStatus !== "Approved").length;
    const approvedLeads = filteredLeads.filter((lead) => lead.currentStatus === "Approved").length;
    const rejectedLeads = filteredLeads.filter((lead) => lead.currentStatus.includes("Reject")).length;
    const userStats = users.map((u) => {
      const userLogs = activityLogs.filter((log2) => log2.userId === u.id);
      const userLeads = filteredLeads.filter(
        (lead) => userLogs.some((log2) => log2.entityId === lead.id && log2.entity === "lead")
      );
      return {
        userId: u.id,
        username: u.username,
        role: u.role,
        totalActions: userLogs.length,
        leadsCreated: userLogs.filter((log2) => log2.action === "create" && log2.entity === "lead").length,
        leadsUpdated: userLogs.filter((log2) => log2.action === "update" && log2.entity === "lead").length,
        PartnersManaged: userLogs.filter((log2) => log2.entity === "Partner").length,
        lastActivity: userLogs.length > 0 ? userLogs[userLogs.length - 1].timestamp : null
      };
    });
    const funnelData = {
      "New Lead": filteredLeads.filter((l) => l.currentStatus === "New Lead").length,
      "Interested": filteredLeads.filter((l) => l.currentStatus === "Interested").length,
      "Screening": filteredLeads.filter((l) => l.currentStatus === "Screening").length,
      "Screening Pass": filteredLeads.filter((l) => l.currentStatus === "Screening Pass").length,
      "Proposal Sent": filteredLeads.filter((l) => l.currentStatus === "Proposal Sent").length,
      "Paid": filteredLeads.filter((l) => l.currentStatus === "Paid").length,
      "Applied": filteredLeads.filter((l) => l.currentStatus === "Applied").length,
      "Approved": approvedLeads
    };
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
    const recentLeads = filteredLeads.filter((lead) => new Date(lead.createdOnDate) >= last30Days);
    const leadsByStatus = filteredLeads.reduce((acc, lead) => {
      acc[lead.currentStatus] = (acc[lead.currentStatus] || 0) + 1;
      return acc;
    }, {});
    const leadsByType = filteredLeads.reduce((acc, lead) => {
      acc[lead.deliveryType] = (acc[lead.deliveryType] || 0) + 1;
      return acc;
    }, {});
    const stats = {
      // Basic metrics
      totalPartners: filteredPartners.length,
      totalLeads,
      activeLeads,
      approvedLeads,
      rejectedLeads,
      // Performance metrics
      conversionRate: totalLeads > 0 ? (approvedLeads / totalLeads * 100).toFixed(1) : "0.0",
      approvalRate: totalLeads > 0 ? (approvedLeads / totalLeads * 100).toFixed(1) : "0.0",
      rejectionRate: totalLeads > 0 ? (rejectedLeads / totalLeads * 100).toFixed(1) : "0.0",
      // Revenue estimation (based on approved leads)
      estimatedRevenue: (approvedLeads * 5e4).toLocaleString(),
      // Avg 50k per approved lead
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
      activeUsers: user?.role === "Admin" ? userStats.filter((u) => u.lastActivity && new Date(u.lastActivity) >= last30Days).length : 0,
      // Recent data
      recentLeads: filteredLeads.slice(-10).reverse(),
      recentActivity: activityLogs.slice(-20).reverse()
    };
    res.json(stats);
  });
  app2.get("/api/activity-logs", requireRole(["Admin", "Manager", "Operations"]), async (req, res) => {
    const logs = await storage.getAllActivityLogs();
    res.json(logs.slice(-50).reverse());
  });
  app2.get("/api/export/leads-by-status", requireAuth, async (req, res) => {
    try {
      const { period = "this-month" } = req.query;
      const user = await storage.getUser(req.session.userId);
      const Partners = await storage.getAllPartners();
      const leads = await storage.getAllLeads();
      let periodFilteredLeads = leads;
      const now = /* @__PURE__ */ new Date();
      if (period === "this-month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        periodFilteredLeads = leads.filter((lead) => new Date(lead.createdOnDate) >= startOfMonth);
      } else if (period === "last-month") {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        periodFilteredLeads = leads.filter((lead) => {
          const leadDate = new Date(lead.createdOnDate);
          return leadDate >= startOfLastMonth && leadDate <= endOfLastMonth;
        });
      } else if (period === "this-quarter") {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
        periodFilteredLeads = leads.filter((lead) => new Date(lead.createdOnDate) >= startOfQuarter);
      }
      let filteredLeads = periodFilteredLeads;
      if (user?.role === "Partner") {
        const userPartner = Partners.find((m) => m.email === user.email);
        if (userPartner) {
          filteredLeads = periodFilteredLeads.filter((lead) => lead.PartnerId === userPartner.id);
        } else {
          filteredLeads = [];
        }
      }
      const leadsByStatus = filteredLeads.reduce((acc, lead) => {
        acc[lead.currentStatus] = (acc[lead.currentStatus] || 0) + 1;
        return acc;
      }, {});
      const total = Object.values(leadsByStatus).reduce((sum, count) => sum + count, 0);
      const csvHeader = "Status,Count,Percentage\n";
      const csvRows = Object.entries(leadsByStatus).map(
        ([status, count]) => `"${status.replace(/"/g, '""')}",${count},${total > 0 ? (count / total * 100).toFixed(1) : "0"}%`
      ).join("\n");
      const csvContent = "\uFEFF" + csvHeader + csvRows;
      res.setHeader("Content-Type", "text/csv;charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="leads-by-status-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv"`);
      res.send(csvContent);
      await storage.createActivityLog({
        userId: req.session.userId,
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
  app2.get("/api/export/leads", requireRole(["Admin", "Manager", "Analyst"]), async (req, res) => {
    const user = await storage.getUser(req.session.userId);
    let leads = await storage.getAllLeads();
    if (user?.role === "Partner") {
      const Partners = await storage.getAllPartners();
      const userPartner = Partners.find((m) => m.email === user.email);
      if (userPartner) {
        leads = leads.filter((lead) => lead.PartnerId === userPartner.id);
      } else {
        leads = [];
      }
    }
    const csvData = leads.map((lead) => ({
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
      userId: req.session.userId,
      action: "export",
      entity: "leads",
      entityId: "bulk",
      details: `Exported ${leads.length} leads to CSV`
    });
    res.json({ data: csvData, filename: `leads-export-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv` });
  });
  app2.get("/api/export/Partners", requireRole(["Admin", "Manager"]), async (req, res) => {
    const Partners = await storage.getAllPartners();
    const csvData = Partners.map((Partner) => ({
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
      userId: req.session.userId,
      action: "export",
      entity: "Partners",
      entityId: "bulk",
      details: `Exported ${Partners.length} Partners to CSV`
    });
    res.json({ data: csvData, filename: `Partners-export-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv` });
  });
  app2.get("/api/reports/summary", requireRole(["Admin", "Manager", "Analyst"]), async (req, res) => {
    const user = await storage.getUser(req.session.userId);
    const Partners = await storage.getAllPartners();
    const leads = await storage.getAllLeads();
    const activityLogs = await storage.getAllActivityLogs();
    let filteredLeads = leads;
    if (user?.role === "Partner") {
      const userPartner = Partners.find((m) => m.email === user.email);
      if (userPartner) {
        filteredLeads = leads.filter((lead) => lead.PartnerId === userPartner.id);
      } else {
        filteredLeads = [];
      }
    }
    const report = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      generatedBy: user?.username,
      period: "All Time",
      summary: {
        totalPartners: Partners.length,
        totalLeads: filteredLeads.length,
        activeLeads: filteredLeads.filter((lead) => !lead.currentStatus.includes("Reject") && lead.currentStatus !== "Approved").length,
        approvedLeads: filteredLeads.filter((lead) => lead.currentStatus === "Approved").length,
        rejectedLeads: filteredLeads.filter((lead) => lead.currentStatus.includes("Reject")).length,
        conversionRate: filteredLeads.length > 0 ? (filteredLeads.filter((lead) => lead.currentStatus === "Approved").length / filteredLeads.length * 100).toFixed(2) : "0.00"
      },
      leadsByStatus: filteredLeads.reduce((acc, lead) => {
        acc[lead.currentStatus] = (acc[lead.currentStatus] || 0) + 1;
        return acc;
      }, {}),
      leadsByType: filteredLeads.reduce((acc, lead) => {
        acc[lead.deliveryType] = (acc[lead.deliveryType] || 0) + 1;
        return acc;
      }, {}),
      topPartners: Partners.map((Partner) => {
        const PartnerLeads = filteredLeads.filter((lead) => lead.PartnerId === Partner.id);
        return {
          name: Partner.businessName,
          totalLeads: PartnerLeads.length,
          approvedLeads: PartnerLeads.filter((lead) => lead.currentStatus === "Approved").length,
          conversionRate: PartnerLeads.length > 0 ? (PartnerLeads.filter((lead) => lead.currentStatus === "Approved").length / PartnerLeads.length * 100).toFixed(2) : "0.00"
        };
      }).sort((a, b) => b.totalLeads - a.totalLeads).slice(0, 10),
      recentActivity: activityLogs.slice(-20).reverse()
    };
    await storage.createActivityLog({
      userId: req.session.userId,
      action: "generate_report",
      entity: "reports",
      entityId: "summary",
      details: "Generated summary report"
    });
    res.json(report);
  });
  app2.get("/api/leads/:leadId/grant-questions", requireAuth, async (req, res) => {
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
  app2.get("/api/leads/:leadId/equity-questions", requireAuth, async (req, res) => {
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
  app2.post("/api/leads/:leadId/update-questions", requireAuth, async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      const formData = req.body;
      const existingData = JSON.parse(lead.formDataJSON || "{}");
      const updatedData = { ...existingData, ...formData };
      let statusChange = null;
      let statusChangeReason = "";
      if (lead.serviceType === "Grant" && formData.companyAge !== void 0) {
        const companyAge = parseInt(formData.companyAge) || 0;
        if (companyAge > 3 && lead.currentStatus !== "Rules Reject") {
          statusChange = "Rules Reject";
          statusChangeReason = `Automatically moved to Rules Reject due to company age (${companyAge} years)`;
        }
      }
      await storage.updateLead(req.params.leadId, {
        formDataJSON: JSON.stringify(updatedData),
        ...statusChange && {
          currentStatus: statusChange,
          lastStatus: lead.currentStatus,
          lastStatusUpdatedDate: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      await storage.createActivityLog({
        userId: req.session.userId,
        action: "update_questions",
        entity: "lead",
        entityId: lead.id,
        details: `Updated detailed questions for ${lead.companyName}${statusChangeReason ? ` - ${statusChangeReason}` : ""}`
      });
      res.json({ message: "Questions updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update questions" });
    }
  });
  app2.put("/api/leads/:leadId/assign", requireRole(["Admin"]), async (req, res) => {
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
        userId: req.session.userId,
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
  app2.post("/api/leads/bulk-upload", requireRole(["Admin"]), async (req, res) => {
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
          if (!leadData.companyName || !leadData.founderName || !leadData.contact || !leadData.email || !leadData.serviceType || !leadData.PartnerName) {
            const missingFields = [];
            if (!leadData.companyName) missingFields.push("companyName");
            if (!leadData.founderName) missingFields.push("founderName");
            if (!leadData.contact) missingFields.push("contact");
            if (!leadData.email) missingFields.push("email");
            if (!leadData.serviceType) missingFields.push("serviceType");
            if (!leadData.PartnerName) missingFields.push("PartnerName");
            const errorMsg = `Row ${i + 1}: Missing required fields: ${missingFields.join(", ")}`;
            errors.push(errorMsg);
            continue;
          }
          if (leadData.serviceType !== "Grant" && leadData.serviceType !== "Equity") {
            const errorMsg = `Row ${i + 1}: Invalid serviceType "${leadData.serviceType}". Must be "Grant" or "Equity"`;
            errors.push(errorMsg);
            continue;
          }
          let actualUserId = leadData.assignedToUserId;
          if (leadData.assignedToUserId) {
            let user = await storage.getUser(leadData.assignedToUserId);
            if (!user) {
              user = await storage.getUserByUsername(leadData.assignedToUserId);
              if (user) {
                actualUserId = user.id;
              }
            }
            if (!user) {
              const errorMsg = `Row ${i + 1}: Assigned user not found (ID or username): ${leadData.assignedToUserId}`;
              errors.push(errorMsg);
              continue;
            }
          }
          const phoneNumber = leadData.phone || leadData.contact;
          const existingLeadWithPhone = await storage.getLeadByPhone(phoneNumber);
          if (existingLeadWithPhone) {
            const errorMsg = `Row ${i + 1}: Phone number ${phoneNumber} already exists (used by ${existingLeadWithPhone.companyName})`;
            errors.push(errorMsg);
            continue;
          }
          const newLead = await storage.createLead({
            companyName: leadData.companyName,
            founderName: leadData.founderName,
            ownerName: leadData.founderName,
            // Using founder name as owner name
            contact: leadData.contact,
            email: leadData.email,
            phone: leadData.phone || "",
            deliveryType: leadData.serviceType,
            serviceType: leadData.serviceType,
            formDataJSON: "{}",
            lastStatus: "New Lead",
            currentStatus: "New Lead",
            PartnerId: "bulk-upload",
            // Default partner ID for bulk uploads
            PartnerName: leadData.PartnerName,
            createdByUserId: req.session.userId,
            assignedToUserId: actualUserId || void 0
          });
          createdLeads.push(newLead);
          await storage.createActivityLog({
            userId: req.session.userId,
            action: "bulk_create_lead",
            entity: "lead",
            entityId: newLead.id,
            details: `Bulk created lead for ${leadData.companyName}`
          });
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
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
  app2.get("/api/debug/leads", requireRole(["Admin"]), async (req, res) => {
    try {
      const allLeads = await storage.getAllLeads();
      const partners = await storage.getAllPartners();
      const users = await storage.getAllUsers();
      const fs4 = __require("fs");
      const path5 = __require("path");
      const csvPath = path5.join(process.cwd(), "data", "leads.csv");
      let csvContent = "File not found";
      if (fs4.existsSync(csvPath)) {
        csvContent = fs4.readFileSync(csvPath, "utf8");
      }
      res.json({
        totalLeads: allLeads.length,
        totalPartners: partners.length,
        totalUsers: users.length,
        sampleLead: allLeads[0] || null,
        samplePartner: partners[0] || null,
        sampleUser: users[0] || null,
        leadsData: allLeads.slice(0, 3),
        // Show first 3 leads for debugging
        csvContent: csvContent.split("\n").slice(0, 3)
        // Show first 3 lines of CSV
      });
    } catch (error) {
      res.status(500).json({ message: "Debug failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app2.get("/api/reports/leads", requireRole(["Admin", "Manager", "Analyst"]), async (req, res) => {
    try {
      const { format = "csv" } = req.query;
      const leads = await storage.getAllLeads();
      const users = await storage.getAllUsers();
      const partners = await storage.getAllPartners();
      const totalLeads = leads.length;
      const statusDistribution = leads.reduce((acc, lead) => {
        acc[lead.currentStatus] = (acc[lead.currentStatus] || 0) + 1;
        return acc;
      }, {});
      const serviceTypeDistribution = leads.reduce((acc, lead) => {
        acc[lead.serviceType] = (acc[lead.serviceType] || 0) + 1;
        return acc;
      }, {});
      const assignedLeads = leads.filter((lead) => lead.assignedToUserId).length;
      const unassignedLeads = totalLeads - assignedLeads;
      const reportData = {
        summary: {
          totalLeads,
          assignedLeads,
          unassignedLeads,
          statusDistribution,
          serviceTypeDistribution
        },
        leads: leads.map((lead) => ({
          id: lead.id,
          companyName: lead.companyName,
          founderName: lead.founderName,
          email: lead.email,
          contact: lead.contact,
          serviceType: lead.serviceType,
          currentStatus: lead.currentStatus,
          assignedTo: users.find((u) => u.id === lead.assignedToUserId)?.username || "Unassigned",
          createdDate: lead.createdOnDate,
          lastUpdated: lead.lastStatusUpdatedDate
        }))
      };
      if (format === "csv") {
        const csvHeader = "ID,Company Name,Founder Name,Email,Contact,Service Type,Status,Assigned To,Created Date,Last Updated\n";
        const csvRows = reportData.leads.map(
          (lead) => `"${lead.id}","${lead.companyName}","${lead.founderName}","${lead.email}","${lead.contact}","${lead.serviceType}","${lead.currentStatus}","${lead.assignedTo}","${lead.createdDate}","${lead.lastUpdated}"`
        ).join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="lead-analytics-report.csv"');
        res.send(csvHeader + csvRows);
      } else if (format === "pdf") {
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
  app2.get("/api/reports/partners", requireRole(["Admin", "Manager", "Analyst"]), async (req, res) => {
    try {
      const { format = "csv" } = req.query;
      const leads = await storage.getAllLeads();
      const partners = await storage.getAllPartners();
      const partnerPerformance = partners.map((partner) => {
        const partnerLeads = leads.filter((lead) => lead.PartnerId === partner.id);
        const totalLeads = partnerLeads.length;
        const statusDistribution = partnerLeads.reduce((acc, lead) => {
          acc[lead.currentStatus] = (acc[lead.currentStatus] || 0) + 1;
          return acc;
        }, {});
        const conversionRate = totalLeads > 0 ? ((statusDistribution["Approved"] || 0) + (statusDistribution["Paid"] || 0)) / totalLeads * 100 : 0;
        return {
          partnerId: partner.id,
          partnerName: partner.name,
          partnerEmail: partner.email,
          totalLeads,
          statusDistribution,
          conversionRate: Math.round(conversionRate * 100) / 100,
          lastActivity: partnerLeads.length > 0 ? Math.max(...partnerLeads.map((l) => new Date(l.createdOnDate).getTime())) : null
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
      if (format === "csv") {
        const csvHeader = "Partner ID,Partner Name,Partner Email,Total Leads,Conversion Rate (%),Last Activity\n";
        const csvRows = reportData.partnerPerformance.map(
          (partner) => `"${partner.partnerId}","${partner.partnerName}","${partner.partnerEmail}","${partner.totalLeads}","${partner.conversionRate}","${partner.lastActivity ? new Date(partner.lastActivity).toISOString() : "N/A"}"`
        ).join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="partner-performance-report.csv"');
        res.send(csvHeader + csvRows);
      } else if (format === "pdf") {
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
  app2.get("/api/users/statistics", requireRole(["Admin", "Manager", "Analyst", "Operations"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const leads = await storage.getAllLeads();
      const userStatistics = users.map((user) => {
        const userLeads = leads.filter((lead) => lead.assignedToUserId === user.id);
        const totalLeads = userLeads.length;
        const statusDistribution = userLeads.reduce((acc, lead) => {
          acc[lead.currentStatus] = (acc[lead.currentStatus] || 0) + 1;
          return acc;
        }, {});
        const activeLeads = userLeads.filter(
          (lead) => !lead.currentStatus.startsWith("Reject") && lead.currentStatus !== "Final Reject"
        ).length;
        const inactiveLeads = totalLeads - activeLeads;
        const rnrLeads = statusDistribution["RNR"] || 0;
        const rejectRnrLeads = statusDistribution["Reject - RNR"] || 0;
        const proposalSentLeads = statusDistribution["Proposal Sent"] || 0;
        const newLeads = statusDistribution["New Lead"] || 0;
        const interestedLeads = statusDistribution["Interested"] || 0;
        const screeningLeads = statusDistribution["Screening"] || 0;
        const screeningPassLeads = statusDistribution["Screening Pass"] || 0;
        const proposalToBeSentLeads = statusDistribution["Proposal to be Sent"] || 0;
        const approvedLeads = statusDistribution["Approved"] || 0;
        const rejectedLeads = statusDistribution["Rejected"] || 0;
        const conversionRate = totalLeads > 0 ? (approvedLeads + proposalSentLeads) / totalLeads * 100 : 0;
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
          lastActivity: userLeads.length > 0 ? Math.max(...userLeads.map((l) => new Date(l.lastStatusUpdatedDate).getTime())) : null
        };
      });
      const overallStats = {
        totalUsers: users.length,
        totalLeads: leads.length,
        assignedLeads: leads.filter((lead) => lead.assignedToUserId).length,
        unassignedLeads: leads.filter((lead) => !lead.assignedToUserId).length,
        averageConversionRate: userStatistics.reduce((sum, user) => sum + user.conversionRate, 0) / users.length,
        topPerformers: userStatistics.filter((user) => user.totalLeads > 0).sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 5)
      };
      res.json({
        userStatistics,
        overallStats
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate user statistics" });
    }
  });
  app2.get("/api/reports/activity", requireRole(["Admin", "Manager", "Analyst"]), async (req, res) => {
    try {
      const { format = "csv" } = req.query;
      const activityLogs = await storage.getAllActivityLogs();
      const users = await storage.getAllUsers();
      const reportData = {
        summary: {
          totalActivities: activityLogs.length,
          uniqueUsers: new Set(activityLogs.map((log2) => log2.userId)).size,
          dateRange: {
            start: activityLogs.length > 0 ? Math.min(...activityLogs.map((log2) => new Date(log2.timestamp).getTime())) : null,
            end: activityLogs.length > 0 ? Math.max(...activityLogs.map((log2) => new Date(log2.timestamp).getTime())) : null
          }
        },
        activities: activityLogs.map((log2) => ({
          id: log2.id,
          userId: log2.userId,
          username: users.find((u) => u.id === log2.userId)?.username || "Unknown User",
          action: log2.action,
          entity: log2.entity,
          entityId: log2.entityId,
          details: log2.details,
          timestamp: log2.timestamp
        }))
      };
      if (format === "csv") {
        const csvHeader = "ID,User ID,Username,Action,Entity,Entity ID,Details,Timestamp\n";
        const csvRows = reportData.activities.map(
          (activity) => `"${activity.id}","${activity.userId}","${activity.username}","${activity.action}","${activity.entity}","${activity.entityId}","${activity.details}","${activity.timestamp}"`
        ).join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="activity-logs-report.csv"');
        res.send(csvHeader + csvRows);
      } else if (format === "pdf") {
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
  app2.get("/api/test/download", requireAuth, async (req, res) => {
    try {
      const csvContent = 'Status,Count,Percentage\n"New Lead",18,90.0%\n"Screening Pass",1,5.0%\n"Rules Reject",1,5.0%';
      res.setHeader("Content-Type", "text/csv;charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="test-download.csv"');
      res.send("\uFEFF" + csvContent);
    } catch (error) {
      res.status(500).json({ message: "Test download failed" });
    }
  });
  app2.post("/api/debug/reinitialize", requireRole(["Admin"]), async (req, res) => {
    try {
      await storage.forceReinitialize();
      const allLeads = await storage.getAllLeads();
      res.json({
        message: "Storage reinitialized successfully",
        totalLeads: allLeads.length,
        sampleLead: allLeads[0] || null
      });
    } catch (error) {
      res.status(500).json({ message: "Reinitialize failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app2.use((err, req, res, next) => {
    if (res.headersSent) {
      console.error("Headers already sent error:", err.message);
      return next(err);
    }
    console.error("Global error handler:", err);
    try {
      res.status(500).json({ message: "Internal server error" });
    } catch (sendError) {
      console.error("Failed to send error response:", sendError);
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
