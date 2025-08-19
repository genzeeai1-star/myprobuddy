import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface LeadsStatusChartProps {
  leadsByStatus: Record<string, number>;
  period?: string;
}

export default function LeadsStatusChart({ leadsByStatus, period = "this-month" }: LeadsStatusChartProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-purple-500",
    "bg-red-500",
    "bg-yellow-500",
  ];

  const statusEntries = Object.entries(leadsByStatus || {});
  const total = statusEntries.reduce((sum, [, count]) => sum + count, 0);

  const handleDownload = async () => {
    console.log('Download button clicked!');
    console.log('Current data:', leadsByStatus);
    console.log('Period:', period);
    console.log('Status entries:', statusEntries);
    console.log('Total:', total);
    
    if (isDownloading) {
      console.log('Already downloading, ignoring click');
      return;
    }
    
    // Check if there's data to download
    if (!leadsByStatus || Object.keys(leadsByStatus).length === 0) {
      alert('No data available to download.');
      return;
    }
    
    setIsDownloading(true);
    console.log('Starting download process...');
    
    // Simple direct approach - try server download first
    try {
      console.log('Attempting server-side download...');
      const serverUrl = `/api/export/leads-by-status?period=${period}`;
      console.log('Server URL:', serverUrl);
      
      // Use fetch to get the CSV data with authentication
      const response = await fetch(serverUrl, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Accept': 'text/csv',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const csvContent = await response.text();
      console.log('Received CSV from server:', csvContent.substring(0, 100) + '...');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `leads-by-status-${new Date().toISOString().split('T')[0]}.csv`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      console.log('Link added to DOM, clicking...');
      
      link.click();
      console.log('Click triggered');
      
      // Show success message
      alert('Download started! Check your downloads folder.');
      
      // Cleanup
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          console.log('Link removed from DOM');
        } catch (e) {
          console.log('Cleanup error:', e);
        }
      }, 1000);
      
          } catch (error) {
        console.error('Server download failed:', error);
        console.log('Error details:', error.message);
        
        // Fallback to client-side download
        try {
          console.log('Attempting client-side download...');
          
          const csvContent = `Status,Count,Percentage\n${statusEntries.map(([status, count]) => 
            `"${status}",${count},${total > 0 ? ((count / total) * 100).toFixed(1) : '0'}%`
          ).join('\n')}`;
          
          console.log('CSV content:', csvContent);
          
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = `leads-by-status-${new Date().toISOString().split('T')[0]}.csv`;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 1000);
          
          console.log('Client-side download completed');
          alert('Download completed using client-side method!');
          
        } catch (clientError) {
         console.error('Client download also failed:', clientError);
         
         // Last resort: Open in new tab
         try {
           const csvContent = `Status,Count,Percentage\n${statusEntries.map(([status, count]) => 
             `"${status}",${count},${total > 0 ? ((count / total) * 100).toFixed(1) : '0'}%`
           ).join('\n')}`;
           
           const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
           const newWindow = window.open(dataUrl, '_blank');
           if (newWindow) {
             newWindow.focus();
             alert('Data opened in new tab. You can save it manually.');
           } else {
             alert('Download failed. Please allow popups and try again.');
           }
         } catch (finalError) {
           console.error('All download methods failed:', finalError);
           alert('Download failed. Please check browser settings and try again.');
         }
       }
    } finally {
      setIsDownloading(false);
      console.log('Download process finished');
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800">Leads by Status</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              data-testid="button-download-chart" 
              onClick={handleDownload}
              disabled={isDownloading}
              className={`${isDownloading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 hover:text-blue-600"} transition-all duration-200`}
              title="Download leads by status as CSV"
              style={{ cursor: isDownloading ? 'not-allowed' : 'pointer' }}
            >
              <Download className={`w-4 h-4 ${isDownloading ? "text-blue-500 animate-pulse" : "text-gray-400"}`} />
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-chart-options">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart Placeholder */}
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg mb-4">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <PieChart className="w-12 h-12 text-white" />
            </div>
            <p className="text-gray-600">Interactive Chart Placeholder</p>
            <p className="text-sm text-gray-500">Total Leads: {total}</p>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-4">
          {statusEntries.map(([status, count], index) => (
            <div key={status} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
              <span className="text-sm text-gray-600" data-testid={`legend-${status.toLowerCase().replace(/\s+/g, '-')}`}>
                {status} ({count})
              </span>
            </div>
          ))}
        </div>
        
        {/* Debug info - only show in development */}
        {import.meta.env.DEV && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
            <div>Debug: {statusEntries.length} statuses, {total} total leads</div>
            <div>Period: {period}</div>
            <div>Data: {JSON.stringify(leadsByStatus)}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
