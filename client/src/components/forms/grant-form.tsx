import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { grantFormSchema, type GrantFormData } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface GrantFormProps {
  PartnerId: string;
  onSuccess?: () => void;
}

export default function GrantForm({ PartnerId, onSuccess }: GrantFormProps) {
  const { toast } = useToast();

  const form = useForm<GrantFormData & { companyName: string; founderName: string; contact: string; email: string }>({
    resolver: zodResolver(grantFormSchema.extend({
      companyName: z.string().min(1, "Company name is required"),
      founderName: z.string().min(1, "Founder name is required"),
      contact: z.string().min(1, "Contact is required"),
      email: z.string().email("Valid email is required"),
    })),
    defaultValues: {
      companyName: "",
      founderName: "",
      contact: "",
      email: "",
      websiteLink: "",
      isRegistered: "yes",
      trademarkRegistered: "no",
      address: "",
      dpiitRegistered: "no",
      companyType: "",
      startupSector: "",
      numberOfFounders: 1,
      linkedProfile: "",
      gender: "",
      area: "",
      womenEntrepreneurs: "no",
      oneLiner: "",
      keyFocusArea: "",
      linkedinProfile: "",
      companyAge: 0,
      lastYearRevenue: 0,
      fundingRequirement: 0,
      angelInvestorStartup: "no",
      debtRaise: "no",
      source: "",
      sourceFile: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/submit/${PartnerId}/grant`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grant application submitted successfully!",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    submitMutation.mutate(data);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Grant Application Form</h1>
        <p className="text-gray-600 mt-2">
          Please fill out all the required information for your grant application.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                {...form.register("companyName")}
                placeholder="Enter company name"
                data-testid="input-company-name"
              />
              {form.formState.errors.companyName && (
                <p className="text-sm text-red-600">{form.formState.errors.companyName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="founderName">Founder Name *</Label>
              <Input
                id="founderName"
                {...form.register("founderName")}
                placeholder="Enter founder name"
                data-testid="input-founder-name"
              />
              {form.formState.errors.founderName && (
                <p className="text-sm text-red-600">{form.formState.errors.founderName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
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
              <Label htmlFor="contact">Contact Number *</Label>
              <Input
                id="contact"
                {...form.register("contact")}
                placeholder="Enter contact number"
                data-testid="input-contact"
              />
              {form.formState.errors.contact && (
                <p className="text-sm text-red-600">{form.formState.errors.contact.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="websiteLink">Website Link</Label>
                <Input
                  id="websiteLink"
                  type="url"
                  {...form.register("websiteLink")}
                  placeholder="https://example.com"
                  data-testid="input-website"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isRegistered">Is Company Registered? *</Label>
                <Select onValueChange={(value) => form.setValue("isRegistered", value as any)}>
                  <SelectTrigger data-testid="select-is-registered">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trademarkRegistered">Trademark Registered?</Label>
                <Select onValueChange={(value) => form.setValue("trademarkRegistered", value as any)}>
                  <SelectTrigger data-testid="select-trademark">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dpiitRegistered">DPIIT Registered?</Label>
                <Select onValueChange={(value) => form.setValue("dpiitRegistered", value as any)}>
                  <SelectTrigger data-testid="select-dpiit">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyType">Company Type</Label>
                <Input
                  id="companyType"
                  {...form.register("companyType")}
                  placeholder="e.g., Private Limited, LLP"
                  data-testid="input-company-type"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startupSector">Startup Sector</Label>
                <Input
                  id="startupSector"
                  {...form.register("startupSector")}
                  placeholder="e.g., FinTech, HealthTech"
                  data-testid="input-startup-sector"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberOfFounders">Number of Founders</Label>
                <Input
                  id="numberOfFounders"
                  type="number"
                  min="1"
                  {...form.register("numberOfFounders", { valueAsNumber: true })}
                  data-testid="input-number-founders"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyAge">Company Age (years)</Label>
                <Input
                  id="companyAge"
                  type="number"
                  min="0"
                  {...form.register("companyAge", { valueAsNumber: true })}
                  data-testid="input-company-age"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Company Address</Label>
              <Textarea
                id="address"
                {...form.register("address")}
                placeholder="Enter complete address"
                rows={3}
                data-testid="textarea-address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="oneLiner">Company One Liner</Label>
              <Textarea
                id="oneLiner"
                {...form.register("oneLiner")}
                placeholder="Brief description of your company"
                rows={2}
                data-testid="textarea-one-liner"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyFocusArea">Key Focus Area</Label>
              <Input
                id="keyFocusArea"
                {...form.register("keyFocusArea")}
                placeholder="Main focus area of your business"
                data-testid="input-focus-area"
              />
            </div>
          </CardContent>
        </Card>

        {/* Founder Information */}
        <Card>
          <CardHeader>
            <CardTitle>Founder Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Input
                id="gender"
                {...form.register("gender")}
                placeholder="Gender"
                data-testid="input-gender"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area/Location</Label>
              <Input
                id="area"
                {...form.register("area")}
                placeholder="City, State"
                data-testid="input-area"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="womenEntrepreneurs">Women Entrepreneurs?</Label>
              <Select onValueChange={(value) => form.setValue("womenEntrepreneurs", value as any)}>
                <SelectTrigger data-testid="select-women-entrepreneurs">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedinProfile">LinkedIn Profile</Label>
              <Input
                id="linkedinProfile"
                type="url"
                {...form.register("linkedinProfile")}
                placeholder="https://linkedin.com/in/..."
                data-testid="input-linkedin"
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="lastYearRevenue">Last Year's Revenue (INR)</Label>
              <Input
                id="lastYearRevenue"
                type="number"
                min="0"
                {...form.register("lastYearRevenue", { valueAsNumber: true })}
                placeholder="0"
                data-testid="input-last-year-revenue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fundingRequirement">Funding Requirement (INR)</Label>
              <Input
                id="fundingRequirement"
                type="number"
                min="0"
                {...form.register("fundingRequirement", { valueAsNumber: true })}
                placeholder="0"
                data-testid="input-funding-requirement"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="angelInvestorStartup">Angel Investor Startup?</Label>
              <Select onValueChange={(value) => form.setValue("angelInvestorStartup", value as any)}>
                <SelectTrigger data-testid="select-angel-investor">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="debtRaise">Looking for Debt Raise?</Label>
              <Select onValueChange={(value) => form.setValue("debtRaise", value as any)}>
                <SelectTrigger data-testid="select-debt-raise">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                {...form.register("source")}
                placeholder="How did you hear about us?"
                data-testid="input-source"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceFile">Source File</Label>
              <Input
                id="sourceFile"
                {...form.register("sourceFile")}
                placeholder="Reference file if any"
                data-testid="input-source-file"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            data-testid="button-reset-form"
          >
            Reset Form
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={submitMutation.isPending}
            data-testid="button-submit-grant"
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Grant Application"}
          </Button>
        </div>
      </form>
    </div>
  );
}
