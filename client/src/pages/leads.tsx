import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, FileText, X, ArrowRight, Clock, AlertTriangle, Save, Trash2, ChevronRight, Search, Filter, Upload, UserPlus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

export default function Leads() {
  // Leads component rendered
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [availableTransitions, setAvailableTransitions] = useState<string[]>([]);
  const [detailedQuestions, setDetailedQuestions] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");

  // Debug filter states
  // Current filter states on render

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Increased from 300ms to 500ms

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debug filter dialog state
  useEffect(() => {
    // Filter dialog state changed
  }, [isFilterDialogOpen]);

  // Debug filter states changes
  useEffect(() => {
    // Filter states changed
  }, [statusFilter, serviceTypeFilter, assignedToFilter, dateFromFilter, dateToFilter]);
  
  // Bulk upload states
  const [bulkUploadData, setBulkUploadData] = useState("");
  const [bulkUploadErrors, setBulkUploadErrors] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const currentUser = user as any;

  // Build query parameters for filtering
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    // Only add search term if it's at least 2 characters or empty
    if (debouncedSearchTerm && debouncedSearchTerm.length >= 2) {
      params.append("search", debouncedSearchTerm);
    } else if (debouncedSearchTerm === "") {
      // If search is cleared, don't add search parameter
    }
    if (statusFilter) params.append("status", statusFilter);
    if (serviceTypeFilter) params.append("serviceType", serviceTypeFilter);
    if (assignedToFilter) params.append("assignedToUserId", assignedToFilter);
    if (dateFromFilter) params.append("dateFrom", dateFromFilter);
    if (dateToFilter) params.append("dateTo", dateToFilter);
    
    // For Admin users, show all leads. For other users, filter by assigned leads
    if (currentUser?.role === "Admin") {
      // Admin sees all leads
      params.append("page", currentPage.toString());
      params.append("limit", "10");
    } else {
      // Other users see only their assigned leads
      params.append("assignedToUserId", currentUser?.id);
      params.append("page", currentPage.toString());
      params.append("limit", "10");
    }
    
    const queryString = params.toString();
      // Query parameters updated
  // Filter states
    return queryString;
  }, [debouncedSearchTerm, statusFilter, serviceTypeFilter, assignedToFilter, dateFromFilter, dateToFilter, currentPage, currentUser?.id, currentUser?.role]);

  const { data: leadsData, isLoading } = useQuery<any>({
    queryKey: ["/api/leads/filter", queryParams],
    queryFn: async () => {
      // Fetching leads with query params
      const response = await fetch(`/api/leads/filter?${queryParams}`);
      if (!response.ok) throw new Error("Failed to fetch leads");
      const data = await response.json();
      // Leads query result
      return data;
    },
  });

  const { data: attentionLeads } = useQuery<any[]>({
    queryKey: ["/api/leads/requiring-attention"],
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Filter leads based on user role
  const filteredLeads = useMemo(() => {
    const allLeads = leadsData?.leads || [];
    
    // For Operations users, the server already filters by assignedToUserId
    // For other users, return all leads
    return allLeads;
  }, [leadsData?.leads]);

  // Define active and inactive statuses
  const activeStatuses = [
    "New Lead",
    "RNR", 
    "Call Back",
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
    "Not Interested"
  ];

  // Filter leads based on active tab
  const leads = useMemo(() => {
    const allLeads = filteredLeads;
    
    if (activeTab === "active") {
      return allLeads.filter((lead: any) => activeStatuses.includes(lead.currentStatus));
    } else {
      return allLeads.filter((lead: any) => inactiveStatuses.includes(lead.currentStatus));
    }
  }, [filteredLeads, activeTab]);

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update lead");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/filter"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/requiring-attention"] });
      toast({
        title: "Success",
        description: "Lead updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedLead(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update lead",
        variant: "destructive",
      });
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      // changeStatusMutation called
      const response = await fetch(`/api/leads/${id}/change-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStatus }),
      });
              // Change status response
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Change status error:", errorData);
        throw new Error(errorData.message || "Failed to change status");
      }
      
      const result = await response.json();
      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/filter"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/requiring-attention"] });
      
      let description = "Status changed successfully";
      if (variables.newStatus === "Screening Pass") {
        description = "Status changed to Screening Pass. Lead has been automatically assigned to a Manager.";
      }
      
      toast({
        title: "Success",
        description,
      });
      setIsStatusDialogOpen(false);
      setSelectedLead(null);
    },
    onError: (error) => {
      console.error("Change status mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to change status",
        variant: "destructive",
      });
    },
  });

  const updateQuestionsMutation = useMutation({
    mutationFn: async ({ leadId, data }: { leadId: string; data: any }) => {
      const response = await fetch(`/api/leads/${leadId}/update-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update questions");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/filter"] });
      toast({
        title: "Success",
        description: "Detailed questions updated successfully",
      });
      setIsFormDialogOpen(false);
      setSelectedLead(null);
      setDetailedQuestions(null);
      setFormData({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update detailed questions",
        variant: "destructive",
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete lead");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/filter"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/requiring-attention"] });
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedLead(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      });
    },
  });

  const assignLeadMutation = useMutation({
    mutationFn: async ({ leadId, assignedToUserId }: { leadId: string; assignedToUserId: string }) => {
      const response = await fetch(`/api/leads/${leadId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToUserId }),
      });
      if (!response.ok) throw new Error("Failed to assign lead");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/filter"] });
      toast({
        title: "Success",
        description: "Lead assigned successfully",
      });
      setIsAssignDialogOpen(false);
      setSelectedLead(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign lead",
        variant: "destructive",
      });
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (leads: any[]) => {
      const response = await fetch("/api/leads/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads }),
      });
      if (!response.ok) throw new Error("Failed to upload leads");
      return response.json();
    },
    onSuccess: (data) => {
      // Bulk upload success
      queryClient.invalidateQueries({ queryKey: ["/api/leads/filter"] });
      
      if (data.errors && data.errors.length > 0) {
        toast({
          title: "Upload Completed with Errors",
          description: `Bulk upload completed. ${data.createdLeads.length} leads created, ${data.errors.length} errors. Check the error details below.`,
          variant: "destructive",
        });
        setBulkUploadErrors(data.errors || []);
      } else {
        toast({
          title: "Success",
          description: `Bulk upload completed. ${data.createdLeads.length} leads created successfully.`,
        });
        setIsBulkUploadDialogOpen(false);
        setBulkUploadData("");
        setBulkUploadErrors([]);
      }
      
      // Force refetch leads data
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/leads/filter"] });
      }, 1000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload leads",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    if (status.includes("Reject")) return "bg-gradient-to-r from-rose-100 to-red-100 text-rose-800 border border-rose-200";
    if (status === "New Lead") return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200";
    if (status === "Screening") return "bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border border-orange-200";
    if (status === "Approved") return "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200";
    if (status === "RNR" || status === "Call Back") return "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-200";
    if (status === "Interested") return "bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border border-purple-200";
    if (status === "Proposal Sent" || status === "Payment Link Sent") return "bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-800 border border-indigo-200";
    if (status === "Rules Reject") return "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200";
    return "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border border-slate-200";
  };

  const getServiceTypeColor = (type: string) => {
    return type === "Grant" ? "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200" : "bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border border-purple-200";
  };

  const handleViewLead = (lead: any) => {
    setSelectedLead(lead);
    setIsViewDialogOpen(true);
  };

  const handleEditLead = (lead: any) => {
    setSelectedLead(lead);
    setIsEditDialogOpen(true);
  };

  const handleViewForm = async (lead: any) => {
    setSelectedLead(lead);
    setIsLoadingQuestions(true);
    setIsFormDialogOpen(true);
    
    try {
      const endpoint = lead.deliveryType === "Grant" ? "grant-questions" : "equity-questions";
      const response = await fetch(`/api/leads/${lead.id}/${endpoint}`);
      const data = await response.json();
      
      setDetailedQuestions(data);
      
      // Load existing form data
      const existingData = parseFormData(lead.formDataJSON);
      setFormData(existingData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load detailed questions",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleDeleteLead = (lead: any) => {
    setSelectedLead(lead);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedLead) {
      deleteLeadMutation.mutate(selectedLead.id);
    }
  };

  // Download lead details as CSV
  const handleDownloadLeads = async () => {
    setIsDownloading(true);
    try {
      // Get all leads with current filters
      const response = await fetch(`/api/leads/filter?${queryParams}&limit=1000`);
      if (!response.ok) throw new Error("Failed to fetch leads");
      const data = await response.json();
      
      // Get users for assigned user names
      const usersResponse = await fetch('/api/users');
      if (!usersResponse.ok) throw new Error("Failed to fetch users");
      const users = await usersResponse.json();
      
      // Create CSV content
      const headers = [
        'ID',
        'Company Name',
        'Partner Name',
        'Founder Name',
        'Contact Person',
        'Email',
        'Phone',
        'Service Type',
        'Current Status',
        'Assigned To',
        'Created Date',
        'Last Updated',
        'Partner ID'
      ];
      
      const csvRows = [headers.join(',')];
      
      data.leads.forEach((lead: any) => {
        const assignedUser = users.find((user: any) => user.id === lead.assignedToUserId);
        const assignedUserName = assignedUser ? assignedUser.username : 'Unassigned';
        
        const row = [
          lead.id,
          `"${lead.companyName || ''}"`,
          `"${lead.PartnerName || ''}"`,
          `"${lead.founderName || ''}"`,
          `"${lead.contact || ''}"`,
          `"${lead.email || ''}"`,
          `"${lead.phone || ''}"`,
          `"${lead.serviceType || ''}"`,
          `"${lead.currentStatus || ''}"`,
          `"${assignedUserName}"`,
          `"${lead.createdOnDate || ''}"`,
          `"${lead.lastStatusUpdatedDate || ''}"`,
          `"${lead.PartnerId || ''}"`
        ];
        
        csvRows.push(row.join(','));
      });
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leads-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Successful",
        description: `${data.leads.length} leads exported to CSV`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download leads",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAssignLead = (lead: any) => {
    setSelectedLead(lead);
    setIsAssignDialogOpen(true);
  };

  const handleConfirmAssign = (assignedToUserId: string) => {
    if (selectedLead) {
      assignLeadMutation.mutate({ leadId: selectedLead.id, assignedToUserId });
    }
  };

  const handleBulkUpload = () => {
    try {
      // Processing CSV data
      
      // Handle different line endings and clean the data
      const cleanData = bulkUploadData.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = cleanData.split('\n').filter(line => line.trim() !== '');
      
              // CSV lines
      
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row');
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
              // CSV headers
      
      // Validate required headers
      const requiredHeaders = ['companyName', 'founderName', 'contact', 'email', 'serviceType', 'PartnerName'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }
      
      const leads = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
                  // Processing line ${i + 1}
        
        // Handle quoted values properly
        const values: string[] = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim()); // Add the last value
        
        const lead: any = {};
        
        headers.forEach((header, index) => {
          let value = values[index] || '';
          // Remove quotes from the value
          value = value.replace(/^"/, '').replace(/"$/, '');
          lead[header] = value;
        });
        
                  // Parsed lead ${i}
        leads.push(lead);
      }

              // Total leads to upload
      
      if (leads.length === 0) {
        throw new Error('No valid leads found in CSV data');
      }
      
      bulkUploadMutation.mutate(leads);
    } catch (error) {
      console.error('CSV parsing error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid CSV format",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setBulkUploadData(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setBulkUploadData(content);
        };
        reader.readAsText(file);
      } else {
        toast({
          title: "Error",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleExportTemplate = () => {
    const template = "companyName,founderName,contact,email,phone,serviceType,PartnerName,assignedToUserId\nExample Corp,John Doe,+1234567890,john@example.com,+1234567890,Grant,TechStart Solutions,manager\n";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    // Clearing all filters
    setSearchTerm("");
    setStatusFilter("");
    setServiceTypeFilter("");
    setAssignedToFilter("");
    setDateFromFilter("");
    setDateToFilter("");
    setCurrentPage(1);
    // All filters cleared
  };

  const handleChangeStatus = async (lead: any) => {
    // handleChangeStatus called for lead
    setSelectedLead(lead);
    try {
              // Fetching available transitions for lead ID
      const response = await fetch(`/api/leads/${lead.id}/available-transitions`);
              // Available transitions response
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
              // Available transitions data
      setAvailableTransitions(data.availableTransitions);
      setIsStatusDialogOpen(true);
    } catch (error) {
      console.error("Error in handleChangeStatus:", error);
      toast({
        title: "Error",
        description: "Failed to fetch available transitions",
        variant: "destructive",
      });
    }
  };

  const handleUpdateLead = (data: any) => {
    if (selectedLead) {
      updateLeadMutation.mutate({ id: selectedLead.id, data });
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (selectedLead) {
      changeStatusMutation.mutate({ id: selectedLead.id, newStatus });
    }
  };

  const parseFormData = (formDataJSON: string) => {
    try {
      return JSON.parse(formDataJSON);
    } catch {
      return {};
    }
  };

  const isLeadRequiringAttention = (leadId: string) => {
    return attentionLeads?.some(attentionLead => attentionLead.id === leadId);
  };

  const formatFieldName = (fieldName: string): string => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const getSectionData = (formData: any, sectionName: string, serviceType: string) => {
    const sectionFields: Record<string, any> = {};
    
    if (serviceType === "Grant") {
      switch (sectionName) {
        case "Company Information":
          const companyFields = [
            'websiteLink', 'isRegistered', 'trademarkRegistered', 'address', 'dpiitRegistered',
            'companyType', 'startupSector', 'numberOfFounders', 'linkedProfile', 'gender',
            'area', 'womenEntrepreneurs', 'oneLiner', 'keyFocusArea', 'linkedinProfile', 'companyAge'
          ];
          companyFields.forEach(field => {
            if (formData[field] !== undefined) {
              sectionFields[field] = formData[field];
            }
          });
          break;
        case "Financial Information":
          const financialFields = ['lastYearRevenue', 'fundingRequirement', 'angelInvestorStartup', 'debtRaise'];
          financialFields.forEach(field => {
            if (formData[field] !== undefined) {
              sectionFields[field] = formData[field];
            }
          });
          break;
        case "Meta Information":
          const metaFields = ['source', 'sourceFile'];
          metaFields.forEach(field => {
            if (formData[field] !== undefined) {
              sectionFields[field] = formData[field];
            }
          });
          break;
      }
    } else if (serviceType === "Equity") {
      switch (sectionName) {
        case "Company & Founders":
          const companyFields = [
            'foundersLinkedin', 'address', 'companyName', 'registrationType', 'problemSolution',
            'website', 'keyTeam', 'pastGrants', 'incubationAccelerator', 'industry',
            'businessStage', 'certifications', 'competitors'
          ];
          companyFields.forEach(field => {
            if (formData[field] !== undefined) {
              sectionFields[field] = formData[field];
            }
          });
          break;
        case "Financial Information":
          const financialFields = [
            'lastYearRevenue', 'revenueProjections', 'profitability', 'ebitda', 'gmv',
            'margins', 'expenses', 'runway', 'liabilities'
          ];
          financialFields.forEach(field => {
            if (formData[field] !== undefined) {
              sectionFields[field] = formData[field];
            }
          });
          break;
        case "Funding Information":
          const fundingFields = [
            'fundingAmount', 'purpose', 'valuation', 'equityWillingness', 'percentageEquity',
            'cac', 'ltv', 'nps', 'milestones', 'threeToFiveYearVision', 'exitStrategy',
            'pastAcquisitionInterest', 'fundingType'
          ];
          fundingFields.forEach(field => {
            if (formData[field] !== undefined) {
              sectionFields[field] = formData[field];
            }
          });
          break;
        case "Meta Information":
          const metaFields = ['source', 'sourceFile'];
          metaFields.forEach(field => {
            if (formData[field] !== undefined) {
              sectionFields[field] = formData[field];
            }
          });
          break;
      }
    }
    
    return sectionFields;
  };

  const renderFormField = (fieldName: string, fieldConfig: any, value: any) => {
    const handleChange = (newValue: any) => {
      setFormData((prev: any) => ({ ...prev, [fieldName]: newValue }));
    };

    switch (fieldConfig.type) {
      case "text":
        return (
          <Input
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${fieldConfig.label.toLowerCase()}`}
          />
        );
      
      case "textarea":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${fieldConfig.label.toLowerCase()}`}
            rows={3}
          />
        );
      
      case "number":
        return (
          <Input
            type="number"
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            min={fieldConfig.min}
            max={fieldConfig.max}
            placeholder={`Enter ${fieldConfig.label.toLowerCase()}`}
          />
        );
      
      case "currency":
        return (
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">₹</span>
            <Input
              type="number"
              value={value || ""}
              onChange={(e) => handleChange(e.target.value)}
              className="pl-8"
              placeholder="0"
            />
          </div>
        );
      
      case "percentage":
        return (
          <div className="relative">
            <Input
              type="number"
              value={value || ""}
              onChange={(e) => handleChange(e.target.value)}
              min={0}
              max={100}
              className="pr-8"
              placeholder="0"
            />
            <span className="absolute right-3 top-3 text-gray-500">%</span>
          </div>
        );
      
      case "url":
        return (
          <Input
            type="url"
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${fieldConfig.label.toLowerCase()}`}
          />
        );
      
      case "select":
        return (
          <Select value={value || ""} onValueChange={handleChange}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${fieldConfig.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {fieldConfig.options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      default:
        return (
          <Input
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${fieldConfig.label.toLowerCase()}`}
          />
        );
    }
  };

  const handleSubmitQuestions = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLead) {
      updateQuestionsMutation.mutate({ leadId: selectedLead.id, data: formData });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-x-hidden">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <i className="fas fa-users text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Lead Management
                </h1>
                <p className="text-blue-600 mt-1">
                  {hasRole(["Operations"]) === true 
                    ? "View and manage your assigned leads. Form access until Screening Pass."
                    : "View and manage all lead submissions and their status"
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <Card className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by company name, founder, email, or contact..."
                      value={searchTerm}
                      onChange={(e) => {
                        // Search input changed
                        setSearchTerm(e.target.value);
                      }}
                      className="pl-10 border-blue-200 focus:border-blue-500"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Filter button clicked
                      // Current filter states before opening dialog
                      setIsFilterDialogOpen(true);
                      // Filter dialog state set to true
                    }}
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                  {currentUser?.role === "Admin" && (
                    <Button
                      variant="outline"
                      onClick={() => setIsBulkUploadDialogOpen(true)}
                      className="border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Bulk Upload
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleExportTemplate}
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Template
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadLeads}
                    disabled={isDownloading}
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    {isDownloading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download Leads
                      </>
                    )}
                  </Button>
                </div>

                {/* Active Filters */}
                {(searchTerm || statusFilter || serviceTypeFilter || assignedToFilter || dateFromFilter || dateToFilter) && (
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="text-sm text-gray-600">Active filters:</span>
                    {searchTerm && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Search: {searchTerm}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSearchTerm("")} />
                      </Badge>
                    )}
                    {statusFilter && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Status: {statusFilter}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setStatusFilter("")} />
                      </Badge>
                    )}
                    {serviceTypeFilter && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        Type: {serviceTypeFilter}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setServiceTypeFilter("")} />
                      </Badge>
                    )}
                    {assignedToFilter && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        Assigned: {users?.find(u => u.id === assignedToFilter)?.username || assignedToFilter}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setAssignedToFilter("")} />
                      </Badge>
                    )}
                    {(dateFromFilter || dateToFilter) && (
                      <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                        Date: {dateFromFilter} - {dateToFilter}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => { setDateFromFilter(""); setDateToFilter(""); }} />
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Clear All
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attention Leads Alert */}
          {attentionLeads && attentionLeads.length > 0 && (
            <Card className="mb-6 border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <div>
                    <h3 className="font-semibold text-orange-800">
                      {attentionLeads.length} Lead{attentionLeads.length > 1 ? 's' : ''} Requiring Attention
                    </h3>
                    <p className="text-orange-700 text-sm">
                      Some leads are approaching their automatic status transition deadlines.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leads Table */}
          <div className="overflow-hidden">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 backdrop-blur-sm border border-slate-300 shadow-xl">
                         <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-200 border-b border-slate-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <i className="fas fa-table text-white text-sm"></i>
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-800">Lead Management</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-indigo-100 text-indigo-800 px-3 py-1">
                    {currentUser?.role === "Admin" 
                      ? `${leads.length} ${activeTab === "active" ? "Active" : "Inactive"} Leads`
                      : `${leads.length} ${activeTab === "active" ? "Active" : "Inactive"} Assigned Leads`
                    }
                  </Badge>
                </div>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex space-x-1 mt-4">
                <button
                  onClick={() => setActiveTab("active")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === "active"
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Active Leads</span>
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      {filteredLeads.filter((lead: any) => activeStatuses.includes(lead.currentStatus)).length}
                    </Badge>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("inactive")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === "inactive"
                      ? "bg-red-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span>Inactive Leads</span>
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      {filteredLeads.filter((lead: any) => inactiveStatuses.includes(lead.currentStatus)).length}
                    </Badge>
                  </div>
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {leads && leads.length > 0 ? (
                <div className="overflow-x-hidden">
                  <table className="w-full table-fixed">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gradient-to-r from-slate-100 to-slate-200 border-b border-slate-300">
                        <th className="text-left py-3 px-2 font-semibold text-slate-700 uppercase tracking-wide w-[14%]">Company</th>
                        <th className="text-left py-3 px-2 font-semibold text-slate-700 uppercase tracking-wide w-[12%]">Partner Name</th>
                        <th className="text-left py-3 px-2 font-semibold text-slate-700 uppercase tracking-wide w-[8%]">Founder</th>
                        <th className="text-left py-3 px-2 font-semibold text-slate-700 uppercase tracking-wide w-[8%]">Contact</th>
                        <th className="text-left py-3 px-2 font-semibold text-slate-700 uppercase tracking-wide w-[5%]">Type</th>
                        <th className="text-left py-3 px-2 font-semibold text-slate-700 uppercase tracking-wide w-[8%]">Status</th>
                        {currentUser?.role === "Admin" && (
                          <th className="text-left py-3 px-2 font-semibold text-slate-700 uppercase tracking-wide w-[10%]">Assigned To</th>
                        )}
                        <th className="text-left py-3 px-2 font-semibold text-slate-700 uppercase tracking-wide w-[8%]">Created</th>
                        <th className="text-left py-3 px-2 font-semibold text-slate-700 uppercase tracking-wide w-[12%]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads?.map((lead: any) => (
                        <tr key={lead.id} className={`border-b border-slate-100 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 ${isLeadRequiringAttention(lead.id) ? 'bg-gradient-to-r from-amber-50 to-rose-50 border-l-4 border-l-amber-400' : ''}`}>
                          <td className="py-3 px-2">
                            <div>
                              <div className="font-medium text-slate-900 truncate">{lead.companyName}</div>
                              <div className="text-sm text-slate-500 truncate">{lead.email}</div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-slate-700 font-medium truncate">{lead.PartnerName || "Unknown Partner"}</td>
                          <td className="py-3 px-2 text-slate-900 font-medium truncate">{lead.founderName}</td>
                          <td className="py-3 px-2 text-slate-600 truncate">{lead.contact}</td>
                          <td className="py-3 px-2">
                            <Badge className={`${getServiceTypeColor(lead.serviceType)} px-1.5 py-0.5 text-xs font-semibold`}>
                              {lead.serviceType}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center space-x-2">
                              <Badge className={`${getStatusColor(lead.currentStatus)} px-1.5 py-0.5 text-xs font-semibold`}>
                                {lead.currentStatus}
                              </Badge>
                              {isLeadRequiringAttention(lead.id) && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3 text-amber-500" />
                                  <span className="text-xs text-amber-600 font-medium">Attention</span>
                                </div>
                              )}
                            </div>
                          </td>
                          {currentUser?.role === "Admin" && (
                            <td className="py-3 px-2">
                              {lead.assignedToUserId ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">
                                      {users?.find(u => u.id === lead.assignedToUserId)?.username?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium text-slate-700 truncate">
                                    {users?.find(u => u.id === lead.assignedToUserId)?.username || 'Unknown User'}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                    <UserPlus className="w-3 h-3 text-gray-400" />
                                  </div>
                                  <span className="text-sm text-gray-500">Unassigned</span>
                                </div>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-2 text-slate-600">
                            <div className="flex flex-col">
                              <span className="font-medium text-xs">{new Date(lead.createdOnDate).toLocaleDateString()}</span>
                              <span className="text-xs text-slate-400">{new Date(lead.createdOnDate).toLocaleTimeString()}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center space-x-0.5">
                              {/* View button - visible to all roles */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewLead(lead)}
                                data-testid={`button-view-lead-${lead.id}`}
                                className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-700 hover:text-blue-800 shadow-sm hover:shadow-md transition-all duration-200 p-0.5 h-7 w-7"
                                title="View Lead Details"
                              >
                                <Eye className="w-2.5 h-2.5" />
                              </Button>
                              
                              {/* Status Change button - visible to all roles */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleChangeStatus(lead)}
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0 hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all duration-200 p-0.5 h-7 w-7"
                                title="Change Status"
                              >
                                <ChevronRight className="w-2.5 h-2.5" />
                              </Button>
                              
                              {/* Form button - visible to all roles for all leads */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewForm(lead)}
                                data-testid={`button-view-form-${lead.id}`}
                                className="bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 border-purple-200 text-purple-700 hover:text-purple-800 shadow-sm hover:shadow-md transition-all duration-200 p-0.5 h-7 w-7"
                                title="View/Edit Form Data"
                              >
                                <FileText className="w-2.5 h-2.5" />
                              </Button>
                              
                              {/* Edit button - visible to Admin and Manager only */}
                              {hasRole(["Operations"]) !== true && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditLead(lead)}
                                  data-testid={`button-edit-lead-${lead.id}`}
                                  className="bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-emerald-200 text-emerald-700 hover:text-emerald-800 shadow-sm hover:shadow-md transition-all duration-200 p-0.5 h-7 w-7"
                                  title="Edit Lead"
                                >
                                  <Edit className="w-2.5 h-2.5" />
                                </Button>
                              )}
                              
                              {/* Assign and Delete buttons - Admin only */}
                              {currentUser?.role === "Admin" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAssignLead(lead)}
                                    className="bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 border-cyan-200 text-cyan-700 hover:text-cyan-800 shadow-sm hover:shadow-md transition-all duration-200 p-0.5 h-7 w-7"
                                    title="Assign Lead"
                                  >
                                    <UserPlus className="w-2.5 h-2.5" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteLead(lead)}
                                    className="bg-gradient-to-r from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100 border-rose-200 text-rose-700 hover:text-rose-800 shadow-sm hover:shadow-md transition-all duration-200 p-0.5 h-7 w-7"
                                    title="Delete Lead"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No {activeTab === "active" ? "active" : "inactive"} {currentUser?.role === "Admin" ? "leads" : "assigned leads"} found
                  </h3>
                  <p className="text-gray-500">
                    {currentUser?.role === "Admin" ? (
                      activeTab === "active" 
                        ? "Active leads will appear here. These are leads that require attention and follow-up."
                        : "Inactive leads will appear here. These are leads that have been rejected or completed."
                    ) : (
                      activeTab === "active" 
                        ? "Active assigned leads will appear here. These are leads assigned to you that require attention and follow-up."
                        : "Inactive assigned leads will appear here. These are leads assigned to you that have been rejected or completed."
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          </div>

          {/* Pagination */}
          {leadsData && leadsData.totalPages > 1 && (
            <Card className="mt-6 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {currentUser?.role === "Admin" ? (
                      <>
                        Showing {((leadsData.page - 1) * 10) + 1} to {Math.min(leadsData.page * 10, leads.length)} of {leads.length} {activeTab === "active" ? "active" : "inactive"} leads
                        <span className="ml-2 font-medium">(Page {leadsData.page} of {leadsData.totalPages})</span>
                      </>
                    ) : (
                      <>
                        Showing {((leadsData.page - 1) * 10) + 1} to {Math.min(leadsData.page * 10, leads.length)} of {leads.length} {activeTab === "active" ? "active" : "inactive"} assigned leads
                        <span className="ml-2 font-medium">(Page {leadsData.page} of {leadsData.totalPages})</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, leadsData.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(leadsData.totalPages - 4, currentPage - 2)) + i;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={currentPage === pageNum ? "bg-blue-500 text-white" : "border-gray-300 hover:bg-gray-50"}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(leadsData.totalPages, currentPage + 1))}
                      disabled={currentPage === leadsData.totalPages}
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* View Lead Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader className="border-b pb-4 flex-shrink-0">
            <DialogTitle className="flex items-center text-xl">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                <i className="fas fa-eye text-white text-xl"></i>
              </div>
              <div>
                <div className="font-bold">Lead Details</div>
                <div className="text-sm text-gray-500 font-normal">{selectedLead?.companyName}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-6 pb-8">
                <div className="space-y-8">
                  {/* Basic Information Section */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mr-3">
                        <i className="fas fa-info-circle text-white text-lg"></i>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">Basic Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company Name</Label>
                        <p className="text-lg font-bold text-gray-900 mt-1">{selectedLead.companyName}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Founder Name</Label>
                        <p className="text-lg font-bold text-gray-900 mt-1">{selectedLead.founderName}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</Label>
                        <p className="text-lg text-gray-900 mt-1 break-all">{selectedLead.email}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</Label>
                        <p className="text-lg text-gray-900 mt-1">{selectedLead.contact}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Service Type</Label>
                        <div className="mt-1">
                          <Badge className={`${getServiceTypeColor(selectedLead.serviceType)} text-sm font-semibold px-3 py-1`}>
                            {selectedLead.serviceType}
                          </Badge>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Status</Label>
                        <div className="mt-1">
                          <Badge className={`${getStatusColor(selectedLead.currentStatus)} text-sm font-semibold px-3 py-1`}>
                            {selectedLead.currentStatus}
                          </Badge>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Created Date</Label>
                        <p className="text-lg text-gray-900 mt-1">{new Date(selectedLead.createdOnDate).toLocaleDateString()}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Updated</Label>
                        <p className="text-lg text-gray-900 mt-1">{new Date(selectedLead.lastStatusUpdatedDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Form Data Section */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200 shadow-sm">
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                        <i className="fas fa-file-alt text-white text-lg"></i>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">Detailed Form Data</h3>
                    </div>
                    {selectedLead.formDataJSON ? (
                      <div className="space-y-6">
                        {(() => {
                          try {
                            const formData = JSON.parse(selectedLead.formDataJSON);
                            const sections = selectedLead.serviceType === "Grant" ? 
                              ["Company Information", "Financial Information", "Meta Information"] :
                              ["Company & Founders", "Financial Information", "Funding Information", "Meta Information"];
                            
                            return sections.map(section => {
                              const sectionData = getSectionData(formData, section, selectedLead.serviceType);
                              if (Object.keys(sectionData).length === 0) return null;
                              
                              return (
                                <div key={section} className="bg-white border border-purple-200 rounded-xl p-6 shadow-sm">
                                  <div className="flex items-center mb-4">
                                    <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-md flex items-center justify-center mr-3">
                                      <i className="fas fa-folder text-white text-xs"></i>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-800">{section}</h4>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(sectionData).map(([key, value]) => (
                                      <div key={key} className="bg-gray-50 p-3 rounded-lg">
                                        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                          {formatFieldName(key)}
                                        </Label>
                                        <p className="text-sm text-gray-900 mt-1 font-medium">
                                          {value || (
                                            <span className="text-gray-400 italic">Not provided</span>
                                          )}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            });
                          } catch (error) {
                            return (
                              <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <i className="fas fa-file-alt text-gray-400 text-xl"></i>
                                </div>
                                <p className="text-gray-600 font-medium">No detailed form data available</p>
                                <p className="text-sm text-gray-500 mt-2">
                                  Use the Form button to add detailed information
                                </p>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <i className="fas fa-file-alt text-gray-400 text-xl"></i>
                        </div>
                        <p className="text-gray-600 font-medium">No detailed form data available</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Use the Form button to add detailed information
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="border-t bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex justify-end flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                  className="px-6"
                >
                  <i className="fas fa-times mr-2"></i>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center text-xl">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                <i className="fas fa-edit text-white text-xl"></i>
              </div>
              <div>
                <div className="font-bold">Edit Lead</div>
                <div className="text-sm text-gray-500 font-normal">{selectedLead?.companyName}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = {
                companyName: formData.get('companyName') as string,
                founderName: formData.get('founderName') as string,
                email: formData.get('email') as string,
                contact: formData.get('contact') as string,
                currentStatus: formData.get('currentStatus') as string,
              };
              handleUpdateLead(data);
            }} className="space-y-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                    <i className="fas fa-info-circle text-white text-sm"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700">
                      Company Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      defaultValue={selectedLead.companyName}
                      required
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="founderName" className="text-sm font-semibold text-gray-700">
                      Founder Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="founderName"
                      name="founderName"
                      defaultValue={selectedLead.founderName}
                      required
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={selectedLead.email}
                      required
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact" className="text-sm font-semibold text-gray-700">
                      Contact <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="contact"
                      name="contact"
                      defaultValue={selectedLead.contact}
                      required
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="currentStatus" className="text-sm font-semibold text-gray-700">
                      Current Status <span className="text-red-500">*</span>
                    </Label>
                    <Select name="currentStatus" defaultValue={selectedLead.currentStatus}>
                      <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New Lead">New Lead</SelectItem>
                        <SelectItem value="RNR">RNR</SelectItem>
                        <SelectItem value="Call Back">Call Back</SelectItem>
                        <SelectItem value="Not Interested">Not Interested</SelectItem>
                        <SelectItem value="Interested">Interested</SelectItem>
                        <SelectItem value="Screening Pass">Screening Pass</SelectItem>
                        <SelectItem value="Proposal to be Sent">Proposal to be Sent</SelectItem>
                        <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
                        <SelectItem value="Payment Link Sent">Payment Link Sent</SelectItem>
                        <SelectItem value="Not Paid">Not Paid</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="To Apply">To Apply</SelectItem>
                        <SelectItem value="Applied">Applied</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Reject - RNR">Reject - RNR</SelectItem>
                        <SelectItem value="Reject - Not Attend">Reject - Not Attend</SelectItem>
                        <SelectItem value="Reject - Not Interested">Reject - Not Interested</SelectItem>
                        <SelectItem value="Reject - Screening Fail">Reject - Screening Fail</SelectItem>
                        <SelectItem value="Reject - Payment Not Done">Reject - Payment Not Done</SelectItem>
                        <SelectItem value="Final Reject">Final Reject</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="border-t bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex justify-between items-center -mx-6 -mb-6">
                <div className="text-sm text-gray-600 flex items-center">
                  <i className="fas fa-info-circle mr-2 text-green-500"></i>
                  All fields marked with <span className="text-red-500 font-bold">*</span> are required
                </div>
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    className="px-6 border-gray-300 hover:bg-gray-50"
                  >
                    <i className="fas fa-times mr-2"></i>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateLeadMutation.isPending}
                    className="px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
                  >
                    {updateLeadMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        Update Lead
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center text-xl">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                <i className="fas fa-exchange-alt text-white text-xl"></i>
              </div>
              <div>
                <div className="font-bold">Change Lead Status</div>
                <div className="text-sm text-gray-500 font-normal">{selectedLead?.companyName}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6">
              {/* Current Status Section */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mr-3">
                    <i className="fas fa-info-circle text-white text-sm"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Current Status</h3>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={`${getStatusColor(selectedLead.currentStatus)} text-sm font-semibold px-4 py-2 text-base`}>
                    {selectedLead.currentStatus}
                  </Badge>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent"></div>
                </div>
              </div>
              
              {/* Available Transitions Section */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                    <i className="fas fa-arrow-right text-white text-sm"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Available Transitions</h3>
                </div>
                
                {availableTransitions.length > 0 ? (
                  <div className="space-y-3">
                    {availableTransitions.map((status) => (
                      <Button
                        key={status}
                        variant="outline"
                        className="w-full justify-start h-12 bg-white hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:border-green-300 hover:text-green-700 transition-all duration-200 group"
                        onClick={() => handleStatusChange(status)}
                        disabled={changeStatusMutation.isPending}
                      >
                        <div className="flex items-center w-full">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-200">
                            <ChevronRight className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-semibold">{status}</span>
                          {changeStatusMutation.isPending && (
                            <div className="ml-auto">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent"></div>
                            </div>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-lock text-gray-400 text-xl"></i>
                    </div>
                    <p className="text-gray-600 font-medium">No Available Transitions</p>
                    <p className="text-sm text-gray-500 mt-2">
                      This status cannot be changed at the moment
                    </p>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="border-t bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex justify-between items-center -mx-6 -mb-6">
                <div className="text-sm text-gray-600 flex items-center">
                  <i className="fas fa-info-circle mr-2 text-blue-500"></i>
                  Status changes are tracked and logged
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStatusDialogOpen(false)}
                  className="px-6"
                >
                  <i className="fas fa-times mr-2"></i>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detailed Questions Form Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
          <DialogHeader className="border-b pb-4 flex-shrink-0">
            <DialogTitle className="flex items-center text-xl">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                <i className="fas fa-file-alt text-white text-xl"></i>
              </div>
              <div>
                <div className="font-bold">
                  {detailedQuestions ? `${detailedQuestions.formType === 'grant' ? 'Grant' : 'Equity'} Detailed Questions` : 'Loading...'}
                </div>
                <div className="text-sm text-gray-500 font-normal">
                  {detailedQuestions?.companyName || 'Company Details'}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingQuestions ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
                <span className="text-gray-600 font-medium">Loading detailed questions...</span>
              </div>
            </div>
          ) : detailedQuestions ? (
            <form onSubmit={handleSubmitQuestions} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-6 pb-8">
                <div className="space-y-8">
                  {Object.entries(detailedQuestions.questions).map(([sectionName, sectionFields]: [string, any]) => (
                    <div key={sectionName} className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-center mb-6">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                          <i className="fas fa-folder text-white text-sm"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 capitalize">
                          {sectionName.replace(/([A-Z])/g, ' $1').trim()}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {Object.entries(sectionFields).map(([fieldName, fieldConfig]: [string, any]) => (
                          <div key={fieldName} className="group">
                            <div className="mb-3">
                              <Label className="text-sm font-semibold text-gray-700 flex items-center">
                                {fieldConfig.label}
                                {fieldConfig.required && (
                                  <span className="text-red-500 ml-1 text-lg">*</span>
                                )}
                              </Label>
                              {fieldConfig.description && (
                                <p className="text-xs text-gray-500 mt-1 italic">{fieldConfig.description}</p>
                              )}
                            </div>
                            <div className="relative">
                              {renderFormField(fieldName, fieldConfig, formData[fieldName])}
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-1 h-8 bg-gradient-to-b from-purple-200 to-pink-200 rounded-full"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex justify-between items-center flex-shrink-0">
                <div className="text-sm text-gray-600 flex items-center">
                  <i className="fas fa-info-circle mr-2 text-blue-500"></i>
                  All fields marked with <span className="text-red-500 font-bold">*</span> are required
                </div>
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFormDialogOpen(false)}
                    className="px-6 border-gray-300 hover:bg-gray-50"
                  >
                    <i className="fas fa-times mr-2"></i>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateQuestionsMutation.isPending}
                    className="px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                  >
                    {updateQuestionsMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Questions
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
              </div>
              <p className="text-gray-600 font-medium">Failed to load detailed questions</p>
              <p className="text-sm text-gray-500 mt-2">Please try again or contact support</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                <i className="fas fa-exclamation-triangle text-white text-xl"></i>
              </div>
              <div>
                <div className="font-bold text-red-600">Delete Lead</div>
                <div className="text-sm text-gray-500 font-normal">This action cannot be undone</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-gray-700">
                  Are you sure you want to delete the lead for <strong>{selectedLead.companyName}</strong>?
                </p>
                <p className="text-sm text-red-600 mt-2">
                  This will permanently remove all lead data including form submissions.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteLeadMutation.isPending}
                  className="px-6 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg"
                >
                  {deleteLeadMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Lead
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Lead Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center text-xl">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold">Assign Lead</div>
                <div className="text-sm text-gray-500 font-normal">{selectedLead?.companyName}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-4 rounded-xl border border-cyan-200">
                <p className="text-gray-700">
                  Assign this lead to a team member for follow-up and management.
                </p>
              </div>
              
              <div className="space-y-4">
                <Label className="text-sm font-semibold text-gray-700">
                  Select User <span className="text-red-500">*</span>
                </Label>
                <Select onValueChange={handleConfirmAssign}>
                  <SelectTrigger className="border-gray-300 focus:border-cyan-500 focus:ring-cyan-500">
                    <SelectValue placeholder="Choose a user to assign this lead to" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span>{user.username}</span>
                          <Badge variant="secondary" className="ml-auto">
                            {user.role}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="border-t bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex justify-between items-center -mx-6 -mb-6">
                <div className="text-sm text-gray-600 flex items-center">
                  <i className="fas fa-info-circle mr-2 text-cyan-500"></i>
                  Assigned leads will be tracked and managed by the selected user
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAssignDialogOpen(false)}
                  className="px-6"
                >
                  <i className="fas fa-times mr-2"></i>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="border-b pb-4 flex-shrink-0">
            <DialogTitle className="flex items-center text-xl">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold">Bulk Upload Leads</div>
                <div className="text-sm text-gray-500 font-normal">Upload multiple leads from CSV format</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-6 pb-8">
              <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                      <i className="fas fa-info-circle text-white text-sm"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Upload Instructions</h3>
                  </div>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>• Download the template to see the required format</p>
                    <p>• Required fields: companyName, founderName, contact, email, serviceType, PartnerName</p>
                    <p>• Optional fields: phone, assignedToUserId</p>
                    <p>• serviceType must be either "Grant" or "Equity"</p>
                    <p>• assignedToUserId can be a username (e.g., "manager") or user ID</p>
                    <p>• Leave assignedToUserId empty for unassigned leads</p>
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-gray-700">
                    Upload CSV File <span className="text-red-500">*</span>
                  </Label>
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-file-input"
                    />
                    <label htmlFor="csv-file-input" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="text-green-600 font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">CSV files only</p>
                    </label>
                  </div>
                </div>

                {/* CSV Input (Alternative) */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-gray-700">
                    Or Paste CSV Data
                  </Label>
                  <Textarea
                    value={bulkUploadData}
                    onChange={(e) => setBulkUploadData(e.target.value)}
                    placeholder="Paste your CSV data here (including headers)..."
                    rows={10}
                    className="font-mono text-sm border-gray-300 focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                {/* Errors Display */}
                {bulkUploadErrors.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-800 mb-2">Upload Errors:</h4>
                    <div className="space-y-1">
                      {bulkUploadErrors.map((error, index) => (
                        <p key={index} className="text-sm text-red-700">{error}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex justify-between items-center flex-shrink-0">
              <div className="text-sm text-gray-600 flex items-center">
                <i className="fas fa-info-circle mr-2 text-green-500"></i>
                All leads will be created with "New Lead" status
              </div>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportTemplate}
                  className="px-6 border-gray-300 hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBulkUploadDialogOpen(false)}
                  className="px-6 border-gray-300 hover:bg-gray-50"
                >
                  <i className="fas fa-times mr-2"></i>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleBulkUpload}
                  disabled={bulkUploadMutation.isPending || !bulkUploadData.trim()}
                  className="px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
                >
                  {bulkUploadMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Leads
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog - Custom Modal */}
      {isFilterDialogOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            minWidth: '500px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '16px'
              }}>
                <Filter style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#1f2937' }}>
                  Filter Leads
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  Apply filters to narrow down your search
                </p>
              </div>
            </div>

            {/* Filter Content */}
            <div style={{ marginBottom: '24px' }}>
              {/* Status Filter */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  Status
                </label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => {
                                            // Status filter changed
                    setStatusFilter(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="New Lead">New Lead</option>
                  <option value="RNR">RNR</option>
                  <option value="Call Back">Call Back</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Interested">Interested</option>
                  <option value="Screening">Screening</option>
                  <option value="Screening Pass">Screening Pass</option>
                  <option value="Proposal to be Sent">Proposal to be Sent</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Payment Link Sent">Payment Link Sent</option>
                  <option value="Not Paid">Not Paid</option>
                  <option value="Paid">Paid</option>
                  <option value="To Apply">To Apply</option>
                  <option value="Applied">Applied</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Approved">Approved</option>
                  <option value="Reject - RNR">Reject - RNR</option>
                  <option value="Reject - Not Attend">Reject - Not Attend</option>
                  <option value="Reject - Not Interested">Reject - Not Interested</option>
                  <option value="Reject - Screening Fail">Reject - Screening Fail</option>
                  <option value="Reject - Payment Not Done">Reject - Payment Not Done</option>
                  <option value="Final Reject">Final Reject</option>
                </select>
              </div>

              {/* Service Type Filter */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  Service Type
                </label>
                <select 
                  value={serviceTypeFilter} 
                  onChange={(e) => {
                                            // Service type filter changed
                    setServiceTypeFilter(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">All Types</option>
                  <option value="Grant">Grant</option>
                  <option value="Equity">Equity</option>
                </select>
              </div>

              {/* Assigned To Filter (Admin Only) */}
              {currentUser?.role === "Admin" && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Assigned To
                  </label>
                  <select 
                    value={assignedToFilter} 
                    onChange={(e) => {
                                              // Assigned to filter changed
                      setAssignedToFilter(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">All Users</option>
                    <option value="unassigned">Unassigned</option>
                    {users?.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Range Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Date From
                  </label>
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => {
                                              // Date from filter changed
                      setDateFromFilter(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Date To
                  </label>
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => {
                                              // Date to filter changed
                      setDateToFilter(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={clearFilters}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Clear All Filters
              </button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setIsFilterDialogOpen(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setIsFilterDialogOpen(false)}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
