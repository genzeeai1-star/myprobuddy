import { useState } from "react";
import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, BarChart3, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";

export default function Reports() {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExport = async (reportType: string, format: 'csv' | 'pdf') => {
    setIsExporting(`${reportType}-${format}`);
    
    try {
      const endpoint = `/api/reports/${reportType}?format=${format}`;
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to export ${reportType} report`);
      }

      if (format === 'csv') {
        // Handle CSV download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-report.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export Successful",
          description: `${reportType} report exported as CSV successfully`,
        });
      } else if (format === 'pdf') {
        // Generate PDF using html2pdf.js
        const data = await response.json();
        
        // Create HTML content for PDF
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .subtitle { font-size: 14px; color: #666; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #333; }
              .summary-item { margin: 5px 0; }
              .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .table th { background-color: #f2f2f2; font-weight: bold; }
              .table tr:nth-child(even) { background-color: #f9f9f9; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</div>
              <div class="subtitle">Generated on: ${new Date().toLocaleDateString()}</div>
            </div>
            
            <div class="section">
              <div class="section-title">Report Data</div>
              <pre>${JSON.stringify(data, null, 2)}</pre>
            </div>
          </body>
          </html>
        `;
        
        // Create a temporary div to hold the HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        document.body.appendChild(tempDiv);
        
        // Generate PDF
        const opt = {
          margin: 1,
          filename: `${reportType}-report.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        
        try {
          await html2pdf().set(opt).from(tempDiv).save();
          toast({
            title: "Export Successful",
            description: `${reportType} report exported as PDF successfully`,
          });
        } catch (error) {
          toast({
            title: "Export Failed",
            description: "Failed to generate PDF. Please try again.",
            variant: "destructive",
          });
        } finally {
          document.body.removeChild(tempDiv);
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: `Failed to export ${reportType} report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <i className="fas fa-chart-bar text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-600 bg-clip-text text-transparent">
                  Reports & Analytics
                </h1>
                <p className="text-slate-600 mt-1">
                  Generate comprehensive reports and export data for analysis
                </p>
              </div>
            </div>
          </div>

          {/* Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300 border border-slate-300 hover:border-indigo-300 hover:scale-[1.02] backdrop-blur-sm">
                             <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b border-blue-300">
                <CardTitle className="flex items-center text-blue-800">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  Lead Analytics Report
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-600 mb-6 font-medium">
                  Comprehensive analysis of lead performance, conversion rates, and status distribution.
                </p>
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-700 hover:text-blue-800 font-medium shadow-sm hover:shadow-md transition-all duration-200" 
                    variant="outline" 
                    data-testid="button-export-lead-csv"
                    onClick={() => handleExport('leads', 'csv')}
                    disabled={isExporting === 'leads-csv'}
                  >
                    {isExporting === 'leads-csv' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {isExporting === 'leads-csv' ? 'Exporting...' : 'Export CSV'}
                  </Button>
                  <Button 
                    className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border-indigo-200 text-indigo-700 hover:text-indigo-800 font-medium shadow-sm hover:shadow-md transition-all duration-200" 
                    variant="outline" 
                    data-testid="button-export-lead-pdf"
                    onClick={() => handleExport('leads', 'pdf')}
                    disabled={isExporting === 'leads-pdf'}
                  >
                    {isExporting === 'leads-pdf' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    {isExporting === 'leads-pdf' ? 'Exporting...' : 'Export PDF'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-xl transition-all duration-300 border border-slate-300 hover:border-emerald-300 hover:scale-[1.02] backdrop-blur-sm">
                             <CardHeader className="bg-gradient-to-r from-emerald-100 to-teal-100 border-b border-emerald-300">
                <CardTitle className="flex items-center text-emerald-800">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center mr-3">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  Partner Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-600 mb-6 font-medium">
                  Detailed Partner activity, lead submissions, and conversion metrics.
                </p>
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-emerald-200 text-emerald-700 hover:text-emerald-800 font-medium shadow-sm hover:shadow-md transition-all duration-200" 
                    variant="outline" 
                    data-testid="button-export-partner-csv"
                    onClick={() => handleExport('partners', 'csv')}
                    disabled={isExporting === 'partners-csv'}
                  >
                    {isExporting === 'partners-csv' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {isExporting === 'partners-csv' ? 'Exporting...' : 'Export CSV'}
                  </Button>
                  <Button 
                    className="w-full bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 border-teal-200 text-teal-700 hover:text-teal-800 font-medium shadow-sm hover:shadow-md transition-all duration-200" 
                    variant="outline" 
                    data-testid="button-export-partner-pdf"
                    onClick={() => handleExport('partners', 'pdf')}
                    disabled={isExporting === 'partners-pdf'}
                  >
                    {isExporting === 'partners-pdf' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    {isExporting === 'partners-pdf' ? 'Exporting...' : 'Export PDF'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 hover:shadow-xl transition-all duration-300 border border-slate-300 hover:border-purple-300 hover:scale-[1.02] backdrop-blur-sm">
                             <CardHeader className="bg-gradient-to-r from-purple-100 to-violet-100 border-b border-purple-300">
                <CardTitle className="flex items-center text-purple-800">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg flex items-center justify-center mr-3">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  Activity Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-600 mb-6 font-medium">
                  Complete audit trail of all system activities and user actions.
                </p>
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 border-purple-200 text-purple-700 hover:text-purple-800 font-medium shadow-sm hover:shadow-md transition-all duration-200" 
                    variant="outline" 
                    data-testid="button-export-activity-csv"
                    onClick={() => handleExport('activity', 'csv')}
                    disabled={isExporting === 'activity-csv'}
                  >
                    {isExporting === 'activity-csv' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {isExporting === 'activity-csv' ? 'Exporting...' : 'Export CSV'}
                  </Button>
                  <Button 
                    className="w-full bg-gradient-to-r from-violet-50 to-fuchsia-50 hover:from-violet-100 hover:to-fuchsia-100 border-violet-200 text-violet-700 hover:text-violet-800 font-medium shadow-sm hover:shadow-md transition-all duration-200" 
                    variant="outline" 
                    data-testid="button-export-activity-pdf"
                    onClick={() => handleExport('activity', 'pdf')}
                    disabled={isExporting === 'activity-pdf'}
                  >
                    {isExporting === 'activity-pdf' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    {isExporting === 'activity-pdf' ? 'Exporting...' : 'Export PDF'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
