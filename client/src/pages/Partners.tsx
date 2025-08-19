import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPartnerSchema, type InsertPartner, type Partner } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Phone, Link, QrCode, Edit, Trash, Copy, ExternalLink, Download } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef } from "react";

export default function Partners() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLinksDialogOpen, setIsLinksDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [qrCodeUrls, setQrCodeUrls] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/partners"],
  });

  const form = useForm<InsertPartner>({
    resolver: zodResolver(insertPartnerSchema),
    defaultValues: {
      name: "",
      businessName: "",
      contactPerson: "",
      email: "",
      phone: "",
      companyDetails: "",
      businessType: "",
      type: "Grant",
    },
  });

  const editForm = useForm<InsertPartner>({
    resolver: zodResolver(insertPartnerSchema),
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (data: InsertPartner) => {
      const response = await apiRequest("POST", "/api/partners", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Partner created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Partner> }) => {
      const response = await apiRequest("PUT", `/api/partners/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setIsEditDialogOpen(false);
      setSelectedPartner(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Partner updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePartnerMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/partners/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      toast({
        title: "Success",
        description: "Partner deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const regenerateLinksMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/partners/${id}/regenerate-links`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      toast({
        title: "Success",
        description: "Links and QR codes regenerated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPartner) => {
    createPartnerMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertPartner) => {
    if (selectedPartner) {
      updatePartnerMutation.mutate({ id: selectedPartner.id, data });
    }
  };

  const handleEdit = (partner: Partner) => {
    setSelectedPartner(partner);
    editForm.reset({
      name: partner.name,
      businessName: partner.businessName,
      contactPerson: partner.contactPerson,
      email: partner.email,
      phone: partner.phone,
      companyDetails: partner.companyDetails,
      businessType: partner.businessType,
      type: partner.type,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (partner: Partner) => {
    setPartnerToDelete(partner);
    setIsDeleteDialogOpen(true);
  };

  const handleViewLinks = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsLinksDialogOpen(true);
  };

  const handleViewQR = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsQRDialogOpen(true);
    // Generate QR codes when dialog opens
    generatePartnerQRCodes(partner);
  };

  const handleRegenerateLinks = (partner: Partner) => {
    if (confirm(`Are you sure you want to regenerate links and QR codes for ${partner.name}? This will invalidate the existing links.`)) {
      regenerateLinksMutation.mutate(partner.id);
    }
  };

  const generateQRCode = async (text: string, key: string) => {
    try {
      const url = await QRCode.toDataURL(text, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrls(prev => ({ ...prev, [key]: url }));
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const generatePartnerQRCodes = async (partner: Partner) => {
    if (partner.type === "Grant" || partner.type === "Both") {
      await generateQRCode(partner.grantLink || "", `grant-${partner.id}`);
    }
    if (partner.type === "Equity" || partner.type === "Both") {
      await generateQRCode(partner.equityLink || "", `equity-${partner.id}`);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const openLink = (url: string) => {
    window.open(url, '_blank');
  };

  const downloadQRCode = async (qrCodeUrl: string, filename: string) => {
    try {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Success",
        description: "QR code downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive",
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Grant":
        return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200";
      case "Equity":
        return "bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border border-purple-200";
      case "Both":
        return "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border border-emerald-200";
      default:
        return "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border border-slate-200";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <Navbar />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <i className="fas fa-handshake text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-600 bg-clip-text text-transparent">
                  Partner Management
                </h1>
                <p className="text-slate-600 mt-1">
                  Manage partner onboarding and submission links
                </p>
              </div>
            </div>
                          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200" data-testid="button-add-partner">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Partner
                  </Button>
                </DialogTrigger>
                             <DialogContent className="max-w-md bg-gradient-to-br from-blue-50 to-indigo-50 border border-slate-300">
                 <DialogHeader className="bg-gradient-to-r from-indigo-100 to-purple-100 border-b border-slate-300 rounded-t-lg -mt-6 -mx-6 px-6 py-4">
                   <DialogTitle className="text-slate-800">Add New Partner</DialogTitle>
                 </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Partner Name</Label>
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder="Enter partner name"
                      data-testid="input-partner-name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      {...form.register("businessName")}
                      placeholder="Enter business name"
                      data-testid="input-business-name"
                    />
                    {form.formState.errors.businessName && (
                      <p className="text-sm text-red-600">{form.formState.errors.businessName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      {...form.register("contactPerson")}
                      placeholder="Enter contact person name"
                      data-testid="input-contact-person"
                    />
                    {form.formState.errors.contactPerson && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.contactPerson.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder="Enter email address"
                      data-testid="input-email"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      {...form.register("phone")}
                      placeholder="Enter phone number"
                      data-testid="input-phone"
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Service Type</Label>
                    <Select
                      onValueChange={(value) => form.setValue("type", value as any)}
                      defaultValue="Grant"
                    >
                      <SelectTrigger data-testid="select-type">
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Grant">Grant Only</SelectItem>
                        <SelectItem value="Equity">Equity Only</SelectItem>
                        <SelectItem value="Both">Both Grant & Equity</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.type && (
                      <p className="text-sm text-red-600">{form.formState.errors.type.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyDetails">Company Details</Label>
                    <Textarea
                      id="companyDetails"
                      {...form.register("companyDetails")}
                      placeholder="Enter company details"
                      rows={3}
                      data-testid="textarea-company-details"
                    />
                    {form.formState.errors.companyDetails && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.companyDetails.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business Type</Label>
                    <Input
                      id="businessType"
                      {...form.register("businessType")}
                      placeholder="Enter business type"
                      data-testid="input-business-type"
                    />
                    {form.formState.errors.businessType && (
                      <p className="text-sm text-red-600">{form.formState.errors.businessType.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createPartnerMutation.isPending}
                      data-testid="button-save-partner"
                    >
                      {createPartnerMutation.isPending ? "Creating..." : "Create Partner"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit Partner Dialog */}
                     <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
             <DialogContent className="max-w-md bg-gradient-to-br from-emerald-50 to-teal-50 border border-slate-300">
               <DialogHeader className="bg-gradient-to-r from-emerald-100 to-teal-100 border-b border-slate-300 rounded-t-lg -mt-6 -mx-6 px-6 py-4">
                 <DialogTitle className="text-slate-800">Edit Partner</DialogTitle>
               </DialogHeader>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Partner Name</Label>
                  <Input
                    id="edit-name"
                    {...editForm.register("name")}
                    placeholder="Enter partner name"
                    data-testid="input-edit-partner-name"
                  />
                  {editForm.formState.errors.name && (
                    <p className="text-sm text-red-600">{editForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-businessName">Business Name</Label>
                  <Input
                    id="edit-businessName"
                    {...editForm.register("businessName")}
                    placeholder="Enter business name"
                    data-testid="input-edit-business-name"
                  />
                  {editForm.formState.errors.businessName && (
                    <p className="text-sm text-red-600">{editForm.formState.errors.businessName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-contactPerson">Contact Person</Label>
                  <Input
                    id="edit-contactPerson"
                    {...editForm.register("contactPerson")}
                    placeholder="Enter contact person name"
                    data-testid="input-edit-contact-person"
                  />
                  {editForm.formState.errors.contactPerson && (
                    <p className="text-sm text-red-600">
                      {editForm.formState.errors.contactPerson.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    {...editForm.register("email")}
                    placeholder="Enter email address"
                    data-testid="input-edit-email"
                  />
                  {editForm.formState.errors.email && (
                    <p className="text-sm text-red-600">{editForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    {...editForm.register("phone")}
                    placeholder="Enter phone number"
                    data-testid="input-edit-phone"
                  />
                  {editForm.formState.errors.phone && (
                    <p className="text-sm text-red-600">{editForm.formState.errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-type">Service Type</Label>
                  <Select
                    onValueChange={(value) => editForm.setValue("type", value as any)}
                    defaultValue={selectedPartner?.type || "Grant"}
                  >
                    <SelectTrigger data-testid="select-edit-type">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Grant">Grant Only</SelectItem>
                      <SelectItem value="Equity">Equity Only</SelectItem>
                      <SelectItem value="Both">Both Grant & Equity</SelectItem>
                    </SelectContent>
                  </Select>
                  {editForm.formState.errors.type && (
                    <p className="text-sm text-red-600">{editForm.formState.errors.type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-companyDetails">Company Details</Label>
                  <Textarea
                    id="edit-companyDetails"
                    {...editForm.register("companyDetails")}
                    placeholder="Enter company details"
                    rows={3}
                    data-testid="textarea-edit-company-details"
                  />
                  {editForm.formState.errors.companyDetails && (
                    <p className="text-sm text-red-600">
                      {editForm.formState.errors.companyDetails.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-businessType">Business Type</Label>
                  <Input
                    id="edit-businessType"
                    {...editForm.register("businessType")}
                    placeholder="Enter business type"
                    data-testid="input-edit-business-type"
                  />
                  {editForm.formState.errors.businessType && (
                    <p className="text-sm text-red-600">{editForm.formState.errors.businessType.message}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updatePartnerMutation.isPending}
                    data-testid="button-save-edit"
                  >
                    {updatePartnerMutation.isPending ? "Updating..." : "Update Partner"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Links Dialog */}
                     <Dialog open={isLinksDialogOpen} onOpenChange={setIsLinksDialogOpen}>
             <DialogContent className="max-w-md bg-gradient-to-br from-blue-50 to-indigo-50 border border-slate-300">
               <DialogHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b border-slate-300 rounded-t-lg -mt-6 -mx-6 px-6 py-4">
                 <DialogTitle className="text-slate-800">Submission Links - {selectedPartner?.name}</DialogTitle>
               </DialogHeader>
              <div className="space-y-4">
                {selectedPartner?.type === "Grant" || selectedPartner?.type === "Both" ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Grant Submission Link</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={selectedPartner?.grantLink || ""}
                        readOnly
                        className="flex-1"
                        data-testid="input-grant-link"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(selectedPartner?.grantLink || "", "Grant link")}
                        data-testid="button-copy-grant-link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openLink(selectedPartner?.grantLink || "")}
                        data-testid="button-open-grant-link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}

                {selectedPartner?.type === "Equity" || selectedPartner?.type === "Both" ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Equity Submission Link</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={selectedPartner?.equityLink || ""}
                        readOnly
                        className="flex-1"
                        data-testid="input-equity-link"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(selectedPartner?.equityLink || "", "Equity link")}
                        data-testid="button-copy-equity-link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openLink(selectedPartner?.equityLink || "")}
                        data-testid="button-open-equity-link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="flex justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsLinksDialogOpen(false)}
                    data-testid="button-close-links"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* QR Codes Dialog */}
                     <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
             <DialogContent className="max-w-md bg-gradient-to-br from-purple-50 to-violet-50 border border-slate-300">
               <DialogHeader className="bg-gradient-to-r from-purple-100 to-violet-100 border-b border-slate-300 rounded-t-lg -mt-6 -mx-6 px-6 py-4">
                 <DialogTitle className="text-slate-800">QR Codes - {selectedPartner?.name}</DialogTitle>
               </DialogHeader>
              <div className="space-y-4">
                {selectedPartner?.type === "Grant" || selectedPartner?.type === "Both" ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Grant QR Code</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={selectedPartner?.qrGrant || ""}
                        readOnly
                        className="flex-1"
                        data-testid="input-grant-qr"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(selectedPartner?.qrGrant || "", "Grant QR code")}
                        data-testid="button-copy-grant-qr"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadQRCode(qrCodeUrls[`grant-${selectedPartner?.id}`] || "", `grant-${selectedPartner?.id}.png`)}
                        data-testid="button-download-grant-qr"
                        disabled={!qrCodeUrls[`grant-${selectedPartner?.id}`]}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateQRCode(selectedPartner?.grantLink || "", `grant-${selectedPartner?.id}`)}
                        data-testid="button-refresh-grant-qr"
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                      {qrCodeUrls[`grant-${selectedPartner?.id}`] ? (
                        <img 
                          src={qrCodeUrls[`grant-${selectedPartner?.id}`]} 
                          alt="Grant QR Code"
                          className="w-32 h-32 mx-auto"
                        />
                      ) : (
                        <>
                          <QrCode className="w-32 h-32 mx-auto text-gray-400" />
                          <p className="text-sm text-gray-600 mt-2">Generating QR Code...</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {selectedPartner?.type === "Equity" || selectedPartner?.type === "Both" ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Equity QR Code</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={selectedPartner?.qrEquity || ""}
                        readOnly
                        className="flex-1"
                        data-testid="input-equity-qr"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(selectedPartner?.qrEquity || "", "Equity QR code")}
                        data-testid="button-copy-equity-qr"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadQRCode(qrCodeUrls[`equity-${selectedPartner?.id}`] || "", `equity-${selectedPartner?.id}.png`)}
                        data-testid="button-download-equity-qr"
                        disabled={!qrCodeUrls[`equity-${selectedPartner?.id}`]}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateQRCode(selectedPartner?.equityLink || "", `equity-${selectedPartner?.id}`)}
                        data-testid="button-refresh-equity-qr"
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                      {qrCodeUrls[`equity-${selectedPartner?.id}`] ? (
                        <img 
                          src={qrCodeUrls[`equity-${selectedPartner?.id}`]} 
                          alt="Equity QR Code"
                          className="w-32 h-32 mx-auto"
                        />
                      ) : (
                        <>
                          <QrCode className="w-32 h-32 mx-auto text-gray-400" />
                          <p className="text-sm text-gray-600 mt-2">Generating QR Code...</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="flex justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsQRDialogOpen(false)}
                    data-testid="button-close-qr"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
                     <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
             <DialogContent className="max-w-md bg-gradient-to-br from-rose-50 to-red-50 border border-slate-300">
               <DialogHeader className="bg-gradient-to-r from-rose-100 to-red-100 border-b border-slate-300 rounded-t-lg -mt-6 -mx-6 px-6 py-4">
                 <DialogTitle className="text-slate-800">Delete Partner</DialogTitle>
               </DialogHeader>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Are you sure you want to delete <strong>{partnerToDelete?.name}</strong>? 
                  This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDeleteDialogOpen(false);
                      setPartnerToDelete(null);
                    }}
                    data-testid="button-cancel-delete"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (partnerToDelete) {
                        deletePartnerMutation.mutate(partnerToDelete.id);
                        setIsDeleteDialogOpen(false);
                        setPartnerToDelete(null);
                      }
                    }}
                    disabled={deletePartnerMutation.isPending}
                    data-testid="button-confirm-delete"
                  >
                    {deletePartnerMutation.isPending ? "Deleting..." : "Delete Partner"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Partners Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners && partners.length > 0 ? (
              partners.map((partner: Partner) => (
                                 <Card key={partner.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300 border border-slate-300 hover:border-indigo-300 hover:scale-[1.02] backdrop-blur-sm">
                                        <CardHeader className="pb-3 bg-gradient-to-r from-indigo-100 to-purple-100 border-b border-slate-300">
                     <div className="flex items-start justify-between">
                       <div>
                         <CardTitle className="text-lg text-slate-800 font-bold">{partner.name}</CardTitle>
                         <p className="text-sm text-slate-600 mt-1 font-medium">{partner.contactPerson}</p>
                       </div>
                       <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${getTypeColor(partner.type)}`}>
                         {partner.type}
                       </span>
                     </div>
                   </CardHeader>
                   <CardContent className="p-6">
                     <div className="space-y-3 mb-6">
                       <div className="flex items-center text-sm bg-gradient-to-r from-blue-100 to-indigo-100 p-3 rounded-lg border border-blue-200">
                         <Mail className="w-4 h-4 mr-3 text-indigo-600" />
                         <span className="truncate text-slate-800 font-medium">{partner.email}</span>
                       </div>
                       <div className="flex items-center text-sm bg-gradient-to-r from-emerald-100 to-teal-100 p-3 rounded-lg border border-emerald-200">
                         <Phone className="w-4 h-4 mr-3 text-emerald-600" />
                         <span className="text-slate-800 font-medium">{partner.phone}</span>
                       </div>
                     </div>

                                         <div className="flex items-center space-x-2 mb-4">
                       <Button
                         variant="outline"
                         size="sm"
                         className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-700 hover:text-blue-800 font-medium"
                         onClick={() => handleViewLinks(partner)}
                         data-testid={`button-view-links-${partner.id}`}
                       >
                         <Link className="w-4 h-4 mr-1" />
                         Links
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         className="flex-1 bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 border-purple-200 text-purple-700 hover:text-purple-800 font-medium"
                         onClick={() => handleViewQR(partner)}
                         data-testid={`button-view-qr-${partner.id}`}
                       >
                         <QrCode className="w-4 h-4 mr-1" />
                         QR Codes
                       </Button>
                     </div>

                     <div className="flex items-center space-x-2 mb-4">
                       <Button
                         variant="outline"
                         size="sm"
                         className="flex-1 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-emerald-200 text-emerald-700 hover:text-emerald-800 font-medium"
                         onClick={() => handleEdit(partner)}
                         data-testid={`button-edit-partner-${partner.id}`}
                       >
                         <Edit className="w-4 h-4 mr-1" />
                         Edit
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         className="bg-gradient-to-r from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100 border-rose-200 text-rose-700 hover:text-rose-800 font-medium"
                         onClick={() => handleDelete(partner)}
                         data-testid={`button-delete-partner-${partner.id}`}
                       >
                         <Trash className="w-4 h-4" />
                       </Button>
                     </div>

                     <div className="flex items-center space-x-2">
                       <Button
                         variant="outline"
                         size="sm"
                         className="flex-1 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-amber-200 text-amber-700 hover:text-amber-800 font-medium"
                         onClick={() => handleRegenerateLinks(partner)}
                         disabled={regenerateLinksMutation.isPending}
                         data-testid={`button-regenerate-links-${partner.id}`}
                       >
                         <Link className="w-4 h-4 mr-1" />
                         {regenerateLinksMutation.isPending ? "Regenerating..." : "Regenerate Links"}
                       </Button>
                     </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <div className="text-gray-400 mb-4">
                  <QrCode className="w-16 h-16" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No partners found</h3>
                <p className="text-gray-500 text-center max-w-sm">
                  Get started by adding your first partner to begin managing lead submissions.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                  data-testid="button-add-first-partner"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Partner
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 