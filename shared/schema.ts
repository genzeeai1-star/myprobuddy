import { z } from "zod";

// User schema
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  passwordHash: z.string(),
  role: z.enum(["Admin", "Customer success officer", "Analyst", "Operations", "Manager"]),
  email: z.string().email(),
  phone: z.string(),
});

export const insertUserSchema = userSchema.omit({ id: true });
export const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["Admin", "Customer success officer", "Analyst", "Operations", "Manager"]),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
});
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;

// Partner schema
export const PartnerSchema = z.object({
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
  qrGrant: z.string().optional(),
});

export const insertPartnerSchema = PartnerSchema.omit({ id: true, equityLink: true, grantLink: true, qrEquity: true, qrGrant: true, registrationDate: true });
export type Partner = z.infer<typeof PartnerSchema>;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;

// Lead schema
export const leadSchema = z.object({
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
  PartnerName: z.string(), // Partner name field
  createdByUserId: z.string(),
  assignedToUserId: z.string().optional(), // New field for lead assignment
});

export const insertLeadSchema = leadSchema.omit({ id: true, createdOnDate: true, lastStatusUpdatedDate: true });
export type Lead = z.infer<typeof leadSchema>;
export type InsertLead = z.infer<typeof insertLeadSchema>;

// Status hierarchy schema
export const statusHierarchySchema = z.object({
  id: z.string(),
  statusName: z.string(),
  nextStatuses: z.string(), // semicolon-separated values
  daysLimit: z.number().optional(),
  autoMoveTo: z.string().optional(),
});

export const insertStatusHierarchySchema = statusHierarchySchema.omit({ id: true });
export type StatusHierarchy = z.infer<typeof statusHierarchySchema>;
export type InsertStatusHierarchy = z.infer<typeof insertStatusHierarchySchema>;

// Activity log schema
export const activityLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  userId: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string(),
  details: z.string(),
});

export const insertActivityLogSchema = activityLogSchema.omit({ id: true, timestamp: true });
export type ActivityLog = z.infer<typeof activityLogSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginRequest = z.infer<typeof loginSchema>;

// Grant form schema
export const grantFormSchema = z.object({
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
  sourceFile: z.string().optional(),
});

export type GrantFormData = z.infer<typeof grantFormSchema>;

// Equity form schema
export const equityFormSchema = z.object({
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
  sourceFile: z.string().optional(),
});

export type EquityFormData = z.infer<typeof equityFormSchema>;

// Bulk upload schema
export const bulkUploadSchema = z.object({
  leads: z.array(z.object({
    companyName: z.string(),
    founderName: z.string(),
    contact: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    serviceType: z.enum(["Grant", "Equity"]),
    assignedToUserId: z.string().optional(),
  }))
});

export type BulkUploadData = z.infer<typeof bulkUploadSchema>;
