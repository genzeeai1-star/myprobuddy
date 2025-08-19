import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface ConversionFunnelProps {
  funnelData?: Record<string, number>;
  onPeriodChange?: (period: string) => void;
}

export default function ConversionFunnel({ funnelData: propsFunnelData, onPeriodChange }: ConversionFunnelProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("this-month");
  const funnelStages = [
    { key: "New Lead", stage: "New Leads", color: "bg-blue-500" },
    { key: "Interested", stage: "Interested", color: "bg-indigo-500" },
    { key: "Screening", stage: "Screening", color: "bg-green-500" },
    { key: "Screening Pass", stage: "Screening Pass", color: "bg-teal-500" },
    { key: "Proposal Sent", stage: "Proposal Sent", color: "bg-orange-500" },
    { key: "Paid", stage: "Payment Completed", color: "bg-purple-500" },
    { key: "Applied", stage: "Applied", color: "bg-pink-500" },
    { key: "Approved", stage: "Approved", color: "bg-emerald-500" },
  ];

  const totalLeads = propsFunnelData ? Object.values(propsFunnelData).reduce((sum, count) => sum + count, 0) : 0;
  
  const funnelData = funnelStages.map(stage => {
    const count = propsFunnelData?.[stage.key] || 0;
    const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
    return {
      ...stage,
      count,
      percentage
    };
  }).filter(stage => stage.count > 0);

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800">Conversion Funnel</CardTitle>
          <Select value={selectedPeriod} onValueChange={(value) => {
            console.log('Period changed to:', value);
            setSelectedPeriod(value);
            onPeriodChange?.(value);
          }}>
            <SelectTrigger className="w-32" data-testid="select-funnel-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {funnelData.map((stage) => (
            <div key={stage.stage} className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                <span className="text-sm font-semibold text-gray-800" data-testid={`funnel-count-${stage.stage.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stage.count.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`${stage.color} h-3 rounded-full transition-all duration-300`}
                  style={{ width: `${stage.percentage}%` }}
                  data-testid={`funnel-bar-${stage.stage.toLowerCase().replace(/\s+/g, '-')}`}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
