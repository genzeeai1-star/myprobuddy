import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { equityFormSchema, type EquityFormData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface EquityFormProps {
  PartnerId: string;
  onSuccess?: () => void;
}

export default function EquityForm({ PartnerId, onSuccess }: EquityFormProps) {
  const { toast } = useToast();

  const form = useForm<EquityFormData & { founderName: string; contact: string; email: string }>({
    resolver: zodResolver(equityFormSchema.extend({
      founderName: z.string().min(1, "Founder name is required"),
      contact: z.string().min(1, "Contact is required"),
      email: z.string().email("Valid email is required"),
    })),
    defaultValues: {
      founderName: "",
      contact: "",
      email: "",
      foundersLinkedin: "",
      address: "",
      companyName: "",
      registrationType: "",
      problemSolution: "",
      website: "",
      keyTeam: "",
      pastGrants: "",
      incubationAccelerator: "",
      industry: "",
      businessStage: "",
      certifications: "",
      competitors: "",
      lastYearRevenue: 0,
      revenueProjections: 0,
      profitability: "",
      ebitda: 0,
      gmv: 0,
      margins: 0,
      expenses: 0,
      runway: 0,
      liabilities: 0,
      fundingAmount: 0,
      purpose: "",
      valuation: 0,
      equityWillingness: "yes",
      percentageEquity: 0,
      cac: 0,
      ltv: 0,
      nps: 0,
      milestones: "",
      threeToFiveYearVision: "",
      exitStrategy: "",
      pastAcquisitionInterest: "no",
      fundingType: "",
      source: "",
      sourceFile: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/submit/${PartnerId}/equity`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Equity application submitted successfully!",
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
        <h1 className="text-3xl font-bold text-gray-800">Equity Investment Application</h1>
        <p className="text-gray-600 mt-2">
          Please provide comprehensive information about your business for equity investment consideration.
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="founderName">Founder Name *</Label>
              <Input
                id="founderName"
                {...form.register("founderName")}
                placeholder="Enter founder name"
                data-testid="input-founder-name"
              />
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number *</Label>
              <Input
                id="contact"
                {...form.register("contact")}
                placeholder="Enter contact number"
                data-testid="input-contact"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="foundersLinkedin">Founder's LinkedIn</Label>
              <Input
                id="foundersLinkedin"
                type="url"
                {...form.register("foundersLinkedin")}
                placeholder="https://linkedin.com/in/..."
                data-testid="input-founders-linkedin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                {...form.register("website")}
                placeholder="https://example.com"
                data-testid="input-website"
              />
            </div>
          </CardContent>
        </Card>

        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="registrationType">Registration Type</Label>
                <Input
                  id="registrationType"
                  {...form.register("registrationType")}
                  placeholder="e.g., Private Limited, LLP"
                  data-testid="input-registration-type"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  {...form.register("industry")}
                  placeholder="e.g., FinTech, HealthTech"
                  data-testid="input-industry"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessStage">Business Stage</Label>
                <Input
                  id="businessStage"
                  {...form.register("businessStage")}
                  placeholder="e.g., Seed, Series A"
                  data-testid="input-business-stage"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="incubationAccelerator">Incubation/Accelerator</Label>
                <Input
                  id="incubationAccelerator"
                  {...form.register("incubationAccelerator")}
                  placeholder="Name of incubator/accelerator"
                  data-testid="input-incubation"
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
              <Label htmlFor="problemSolution">Problem & Solution</Label>
              <Textarea
                id="problemSolution"
                {...form.register("problemSolution")}
                placeholder="Describe the problem you solve and your solution"
                rows={4}
                data-testid="textarea-problem-solution"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyTeam">Key Team Members</Label>
              <Textarea
                id="keyTeam"
                {...form.register("keyTeam")}
                placeholder="Brief description of key team members"
                rows={3}
                data-testid="textarea-key-team"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitors">Competitors</Label>
              <Textarea
                id="competitors"
                {...form.register("competitors")}
                placeholder="List main competitors and your competitive advantage"
                rows={3}
                data-testid="textarea-competitors"
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
                data-testid="input-last-year-revenue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenueProjections">Revenue Projections (INR)</Label>
              <Input
                id="revenueProjections"
                type="number"
                min="0"
                {...form.register("revenueProjections", { valueAsNumber: true })}
                data-testid="input-revenue-projections"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ebitda">EBITDA (INR)</Label>
              <Input
                id="ebitda"
                type="number"
                {...form.register("ebitda", { valueAsNumber: true })}
                data-testid="input-ebitda"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gmv">GMV (INR)</Label>
              <Input
                id="gmv"
                type="number"
                min="0"
                {...form.register("gmv", { valueAsNumber: true })}
                data-testid="input-gmv"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="margins">Margins (%)</Label>
              <Input
                id="margins"
                type="number"
                min="0"
                max="100"
                {...form.register("margins", { valueAsNumber: true })}
                data-testid="input-margins"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenses">Monthly Expenses (INR)</Label>
              <Input
                id="expenses"
                type="number"
                min="0"
                {...form.register("expenses", { valueAsNumber: true })}
                data-testid="input-expenses"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="runway">Runway (months)</Label>
              <Input
                id="runway"
                type="number"
                min="0"
                {...form.register("runway", { valueAsNumber: true })}
                data-testid="input-runway"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="liabilities">Liabilities (INR)</Label>
              <Input
                id="liabilities"
                type="number"
                min="0"
                {...form.register("liabilities", { valueAsNumber: true })}
                data-testid="input-liabilities"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profitability">Profitability Status</Label>
              <Input
                id="profitability"
                {...form.register("profitability")}
                placeholder="e.g., Profitable, Break-even, Loss-making"
                data-testid="input-profitability"
              />
            </div>
          </CardContent>
        </Card>

        {/* Funding Information */}
        <Card>
          <CardHeader>
            <CardTitle>Funding Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fundingAmount">Funding Amount Required (INR)</Label>
                <Input
                  id="fundingAmount"
                  type="number"
                  min="0"
                  {...form.register("fundingAmount", { valueAsNumber: true })}
                  data-testid="input-funding-amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valuation">Company Valuation (INR)</Label>
                <Input
                  id="valuation"
                  type="number"
                  min="0"
                  {...form.register("valuation", { valueAsNumber: true })}
                  data-testid="input-valuation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="percentageEquity">Equity Percentage (%)</Label>
                <Input
                  id="percentageEquity"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  {...form.register("percentageEquity", { valueAsNumber: true })}
                  data-testid="input-percentage-equity"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equityWillingness">Willing to Give Equity?</Label>
                <Select onValueChange={(value) => form.setValue("equityWillingness", value as any)}>
                  <SelectTrigger data-testid="select-equity-willingness">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundingType">Funding Type</Label>
                <Input
                  id="fundingType"
                  {...form.register("fundingType")}
                  placeholder="e.g., Seed, Series A, Debt"
                  data-testid="input-funding-type"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pastGrants">Past Grants</Label>
                <Input
                  id="pastGrants"
                  {...form.register("pastGrants")}
                  placeholder="Any previous grants received"
                  data-testid="input-past-grants"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Funding Purpose</Label>
              <Textarea
                id="purpose"
                {...form.register("purpose")}
                placeholder="How will you use the funding?"
                rows={3}
                data-testid="textarea-purpose"
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Business Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="cac">Customer Acquisition Cost (INR)</Label>
              <Input
                id="cac"
                type="number"
                min="0"
                {...form.register("cac", { valueAsNumber: true })}
                data-testid="input-cac"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ltv">Lifetime Value (INR)</Label>
              <Input
                id="ltv"
                type="number"
                min="0"
                {...form.register("ltv", { valueAsNumber: true })}
                data-testid="input-ltv"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nps">Net Promoter Score</Label>
              <Input
                id="nps"
                type="number"
                min="-100"
                max="100"
                {...form.register("nps", { valueAsNumber: true })}
                data-testid="input-nps"
              />
            </div>
          </CardContent>
        </Card>

        {/* Vision & Strategy */}
        <Card>
          <CardHeader>
            <CardTitle>Vision & Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="milestones">Key Milestones</Label>
              <Textarea
                id="milestones"
                {...form.register("milestones")}
                placeholder="List your key achievements and future milestones"
                rows={3}
                data-testid="textarea-milestones"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="threeToFiveYearVision">3-5 Year Vision</Label>
              <Textarea
                id="threeToFiveYearVision"
                {...form.register("threeToFiveYearVision")}
                placeholder="Where do you see your company in 3-5 years?"
                rows={3}
                data-testid="textarea-vision"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exitStrategy">Exit Strategy</Label>
              <Textarea
                id="exitStrategy"
                {...form.register("exitStrategy")}
                placeholder="What is your exit strategy?"
                rows={3}
                data-testid="textarea-exit-strategy"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pastAcquisitionInterest">Past Acquisition Interest?</Label>
                <Select onValueChange={(value) => form.setValue("pastAcquisitionInterest", value as any)}>
                  <SelectTrigger data-testid="select-acquisition-interest">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications</Label>
                <Input
                  id="certifications"
                  {...form.register("certifications")}
                  placeholder="Any relevant certifications"
                  data-testid="input-certifications"
                />
              </div>
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
            data-testid="button-submit-equity"
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Equity Application"}
          </Button>
        </div>
      </form>
    </div>
  );
}
