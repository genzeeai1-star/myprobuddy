import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/navbar";
import StatsCards from "@/components/charts/stats-cards";
import LeadsStatusChart from "@/components/charts/leads-status-chart";
import ConversionFunnel from "@/components/charts/conversion-funnel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, TrendingUp, Calendar, Eye, Edit, Trash2, BarChart3, PieChart, Target, Filter, Download } from "lucide-react";
import { useAuth, type User } from "@/lib/auth";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

// Error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Error caught by boundary:', error);
      setError(error.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
        <h3 className="text-lg font-bold text-red-800 mb-2">Error Detected</h3>
        <p className="text-red-700 mb-2">Error: {error?.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Reload Page
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [mounted, setMounted] = useState(false);
  
  // Status overview filters
  const [statusDateFrom, setStatusDateFrom] = useState("");
  const [statusDateTo, setStatusDateTo] = useState("");
  const [statusUserFilter, setStatusUserFilter] = useState("");
  const [statusPartnerFilter, setStatusPartnerFilter] = useState("");
  const [statusLeadTypeFilter, setStatusLeadTypeFilter] = useState("");
  const [statusTypeFilter, setStatusTypeFilter] = useState<"all" | "active" | "inactive">("all");
  
  // Conversion funnel period
  const [funnelPeriod, setFunnelPeriod] = useState("this-month");
  
  const handlePeriodChange = (period: string) => {
    console.log('Dashboard: Period changed to:', period);
    setFunnelPeriod(period);
  };
  
  useEffect(() => {
    setMounted(true);
  }, []);
  

  
  // Type guard to check if user exists and has required properties
  const isUserValid = (user: any): user is User => {
    return user && typeof user === 'object' && 'username' in user && 'role' in user;
  };
  
  const { data: stats, isLoading, error: statsError } = useQuery<any>({
    queryKey: ["/api/dashboard/stats", funnelPeriod],
    queryFn: async () => {
      console.log('Dashboard: Fetching stats for period:', funnelPeriod);
      const response = await fetch(`/api/dashboard/stats?period=${funnelPeriod}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      const data = await response.json();
      console.log('Dashboard: Received stats:', data);
      return data;
    },
    retry: 3
  });

  const { data: recentActivity, error: activityError } = useQuery<any>({
    queryKey: ["/api/activity-logs"],
    retry: 3,
    enabled: isUserValid(user) && (user.role === "Admin" || user.role === "Manager" || user.role === "Operations")
  });

  const { data: userStats, isLoading: userStatsLoading } = useQuery<any>({
    queryKey: ["/api/users/statistics"],
    retry: 3,
    enabled: isUserValid(user) && (user.role === "Admin" || user.role === "Operations")
  });

  // Fetch partners for filter
  const { data: partners } = useQuery<any>({
    queryKey: ["/api/partners"],
    retry: 3,
    enabled: isUserValid(user)
  });

  // Status overview data
  const { data: statusOverviewData, isLoading: statusOverviewLoading } = useQuery<any>({
    queryKey: ["/api/leads/status-overview", statusDateFrom, statusDateTo, statusUserFilter, statusPartnerFilter, statusLeadTypeFilter, statusTypeFilter],
    queryFn: async () => {
              const params = new URLSearchParams();
        if (statusDateFrom) params.append("dateFrom", statusDateFrom);
        if (statusDateTo) params.append("dateTo", statusDateTo);
        if (statusUserFilter) params.append("assignedToUserId", statusUserFilter);
        if (statusPartnerFilter) params.append("partnerId", statusPartnerFilter);
        if (statusLeadTypeFilter) params.append("leadType", statusLeadTypeFilter);
        if (statusTypeFilter !== "all") params.append("statusType", statusTypeFilter);
      
      const response = await fetch(`/api/leads/status-overview?${params}`);
      if (!response.ok) throw new Error("Failed to fetch status overview");
      return response.json();
    },
    enabled: isUserValid(user),
    retry: 3
  });

  // Handle tab click
  const handleTabClick = (tabName: string) => {
    setActiveTab(tabName);
  };

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

  // Prepare chart data for user statistics
  const prepareStatusDistributionData = () => {
    if (!userStats?.userStatistics) return [];
    
    const statusCounts: { [key: string]: number } = {};
    userStats.userStatistics.forEach((user: any) => {
      Object.entries(user.statusDistribution).forEach(([status, count]) => {
        statusCounts[status] = (statusCounts[status] || 0) + (count as number);
      });
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
    }));
  };

  const prepareUserPerformanceData = () => {
    if (!userStats?.userStatistics) return [];
    
    return userStats.userStatistics
      .filter((user: any) => user.totalLeads > 0)
      .map((user: any) => ({
        name: user.username,
        totalLeads: user.totalLeads,
        activeLeads: user.activeLeads,
        conversionRate: user.conversionRate,
        rnrLeads: user.rnrLeads,
        rejectRnrLeads: user.rejectRnrLeads,
        proposalSent: user.proposalSentLeads,
      }));
  };

  const prepareActiveInactiveData = () => {
    if (!userStats?.userStatistics) return [];
    
    const totalActive = userStats.userStatistics.reduce((sum: number, user: any) => sum + user.activeLeads, 0);
    const totalInactive = userStats.userStatistics.reduce((sum: number, user: any) => sum + user.inactiveLeads, 0);
    
    return [
      { name: 'Active Leads', value: totalActive, color: '#00C49F' },
      { name: 'Inactive Leads', value: totalInactive, color: '#FF8042' },
    ];
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-gradient-to-r from-rose-100 to-red-100 text-rose-800 border border-rose-200";
      case "Manager":
        return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200";
      case "Customer success officer":
        return "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200";
      case "Operations":
        return "bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border border-orange-200";
      case "Analyst":
        return "bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border border-purple-200";
      default:
        return "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border border-slate-200";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="h-12 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-xl w-80 mb-6"></div>
              <div className="h-6 bg-gradient-to-r from-purple-200 to-pink-200 rounded-lg w-96 mb-12"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-40 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl border border-blue-200"></div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Enhanced Page Header */}
            <div className="mb-12">
              <div className="flex items-center space-x-6 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                    <i className="fas fa-chart-line text-white text-2xl"></i>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <i className="fas fa-bolt text-white text-xs"></i>
                  </div>
                </div>
                <div>
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    Dashboard
                  </h1>
                  <p className="text-xl text-indigo-700 font-medium">
                    Welcome back, <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent font-bold">{isUserValid(user) ? user.username : 'User'}</span>! 
                    <span className="block text-lg text-indigo-600 mt-1">Here's what's happening with your leads and Partners.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Tabs Navigation */}
            <div className="mb-12">

              
              {/* Custom Tab Navigation */}
              <div className="flex w-full max-w-4xl bg-white/80 backdrop-blur-sm border border-indigo-200 rounded-2xl p-2 shadow-lg mb-8 gap-2" style={{ position: 'relative', zIndex: 10 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTabClick("overview");
                  }}
                  className={`px-4 py-2 rounded-xl transition-all duration-300 font-medium cursor-pointer ${
                    activeTab === "overview"
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                      : "text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTabClick("analytics");
                  }}
                  className={`px-4 py-2 rounded-xl transition-all duration-300 font-medium cursor-pointer ${
                    activeTab === "analytics"
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                      : "text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                  }`}
                >
                  Analytics
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTabClick("activity");
                  }}
                  className={`px-4 py-2 rounded-xl transition-all duration-300 font-medium cursor-pointer ${
                    activeTab === "activity"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                      : "text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                  }`}
                >
                  Activity
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTabClick("status-overview");
                  }}
                  className={`px-4 py-2 rounded-xl transition-all duration-300 font-medium cursor-pointer ${
                    activeTab === "status-overview"
                      ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
                      : "text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                  }`}
                >
                  Status Overview
                </button>
                {isUserValid(user) && (user.role === "Admin" || user.role === "Operations") && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleTabClick("users");
                    }}
                    className={`px-4 py-2 rounded-xl transition-all duration-300 font-medium cursor-pointer ${
                      activeTab === "users"
                        ? "bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg"
                        : "text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                    }`}
                  >
                    Users
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="mt-8">
                {activeTab === "overview" && (
                  <div className="space-y-12">
                    {/* Enhanced Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <Card data-testid="card-total-leads" className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-xl hover:shadow-blue-500/25 transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                          <CardTitle className="text-lg font-bold text-blue-800">Total Leads</CardTitle>
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                            <Activity className="h-6 w-6 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <div className="text-4xl font-bold text-blue-900 mb-2">{stats?.totalLeads || 0}</div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse flex-shrink-0"></div>
                            <p className="text-sm text-blue-700 font-medium break-words">
                              +{stats?.leadsThisMonth || 0} this month
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card data-testid="card-active-leads" className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 shadow-xl hover:shadow-emerald-500/25 transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                          <CardTitle className="text-lg font-bold text-emerald-800">Active Leads</CardTitle>
                          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                            <TrendingUp className="h-6 w-6 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <div className="text-4xl font-bold text-emerald-900 mb-2">{stats?.activeLeads || 0}</div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse flex-shrink-0"></div>
                            <p className="text-sm text-emerald-700 font-medium break-words">
                              {stats?.conversionRate || 0}% conversion rate
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card data-testid="card-Partners" className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 shadow-xl hover:shadow-purple-500/25 transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                          <CardTitle className="text-lg font-bold text-purple-800">Partners</CardTitle>
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <div className="text-4xl font-bold text-purple-900 mb-2">{stats?.totalPartners || 0}</div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full animate-pulse flex-shrink-0"></div>
                            <p className="text-sm text-purple-700 font-medium break-words">
                              Avg {stats?.avgLeadsPerPartner || 0} leads each
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card data-testid="card-revenue" className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 shadow-xl hover:shadow-orange-500/25 transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                          <CardTitle className="text-lg font-bold text-orange-800">Estimated Revenue</CardTitle>
                          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                            <Calendar className="h-6 w-6 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <div className="text-4xl font-bold text-orange-900 mb-2">₹{stats?.estimatedRevenue || 0}</div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-pulse flex-shrink-0"></div>
                            <p className="text-sm text-orange-700 font-medium break-words">
                              From {stats?.approvedLeads || 0} approved leads
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Enhanced Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-xl hover:shadow-blue-500/25 transition-all duration-500">
                        <LeadsStatusChart leadsByStatus={stats?.leadsByStatus || {}} period={funnelPeriod} />
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-6 shadow-xl hover:shadow-purple-500/25 transition-all duration-500">
                        <ConversionFunnel 
                          funnelData={stats?.funnelData || {}} 
                          onPeriodChange={handlePeriodChange}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "analytics" && (
                  <div className="space-y-12">
                    {/* Enhanced Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <Card data-testid="card-approval-rate" className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 shadow-xl hover:shadow-emerald-500/25 transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-emerald-400/20 to-teal-500/20 border-b border-emerald-200 rounded-t-2xl px-6 py-4">
                          <CardTitle className="text-lg font-bold text-emerald-800 flex items-center">
                            <i className="fas fa-award w-5 h-5 mr-2 text-emerald-500"></i>
                            Approval Rate
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="text-4xl font-bold text-emerald-600 mb-4">
                            {stats?.approvalRate || 0}%
                          </div>
                          <div className="text-sm text-emerald-700 font-medium break-words">
                            {stats?.approvedLeads || 0} of {stats?.totalLeads || 0} leads approved
                          </div>
                        </CardContent>
                      </Card>

                      <Card data-testid="card-rejection-rate" className="bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200 shadow-xl hover:shadow-rose-500/25 transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-rose-400/20 to-red-500/20 border-b border-rose-200 rounded-t-2xl px-6 py-4">
                          <CardTitle className="text-lg font-bold text-rose-800 flex items-center">
                            <i className="fas fa-target w-5 h-5 mr-2 text-rose-500"></i>
                            Rejection Rate
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="text-4xl font-bold text-rose-600 mb-4">
                            {stats?.rejectionRate || 0}%
                          </div>
                          <div className="text-sm text-rose-700 font-medium break-words">
                            {stats?.rejectedLeads || 0} of {stats?.totalLeads || 0} leads rejected
                          </div>
                        </CardContent>
                      </Card>

                      <Card data-testid="card-processing-rate" className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-xl hover:shadow-blue-500/25 transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-blue-400/20 to-indigo-500/20 border-b border-blue-200 rounded-t-2xl px-6 py-4">
                          <CardTitle className="text-lg font-bold text-blue-800 flex items-center">
                            <i className="fas fa-bolt w-5 h-5 mr-2 text-blue-500"></i>
                            In Process
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="text-4xl font-bold text-blue-600 mb-4">
                            {((stats?.activeLeads || 0) / Math.max(stats?.totalLeads || 1, 1) * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-blue-700 font-medium break-words">
                            {stats?.activeLeads || 0} leads being processed
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Enhanced Service Type Distribution */}
                    <Card data-testid="card-service-distribution" className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 shadow-xl hover:shadow-purple-500/25 transition-all duration-500 rounded-2xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-purple-400/20 to-violet-500/20 border-b border-purple-200 rounded-t-2xl px-6 py-4">
                        <CardTitle className="text-xl font-bold text-purple-800">Service Type Distribution</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-6">
                          {Object.entries(stats?.leadsByType || {}).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-purple-200">
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-violet-500 rounded-full flex-shrink-0"></div>
                                <span className="text-purple-800 font-medium truncate">{type}</span>
                              </div>
                              <Badge className="bg-gradient-to-r from-purple-400 to-violet-500 text-white border-0 px-4 py-2 rounded-full font-bold flex-shrink-0 ml-3">
                                {count as number}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === "activity" && (
                  <div className="space-y-8">
                    {/* Enhanced Recent Activity */}
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-xl hover:shadow-blue-500/25 transition-all duration-500 rounded-2xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-blue-400/20 to-indigo-500/20 border-b border-blue-200 rounded-t-2xl px-6 py-4">
                        <CardTitle className="text-xl font-bold text-blue-800">Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {recentActivity?.slice(0, 10).map((activity: any, index: number) => (
                            <div key={index} className="flex items-center space-x-4 p-4 bg-white/50 rounded-xl border border-blue-200 hover:bg-white/70 transition-all duration-300">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <Activity className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-blue-800 font-medium break-words">{activity.description}</p>
                                <p className="text-blue-600 text-sm">{formatDate(activity.timestamp)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === "status-overview" && (
                  <div className="space-y-8">
                    {/* Status Overview Filters */}
                    <Card className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-orange-800">
                          <Filter className="w-5 h-5" />
                          <span>Status Overview Filters</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-orange-700 mb-2">Date From</label>
                            <input
                              type="date"
                              value={statusDateFrom}
                              onChange={(e) => setStatusDateFrom(e.target.value)}
                              className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-orange-700 mb-2">Date To</label>
                            <input
                              type="date"
                              value={statusDateTo}
                              onChange={(e) => setStatusDateTo(e.target.value)}
                              className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-orange-700 mb-2">User</label>
                            <select
                              value={statusUserFilter}
                              onChange={(e) => setStatusUserFilter(e.target.value)}
                              className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            >
                              <option value="">All Users</option>
                              {userStats?.userStatistics?.map((user: any) => (
                                <option key={user.userId} value={user.userId}>{user.username}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-orange-700 mb-2">Partner</label>
                            <select
                              value={statusPartnerFilter}
                              onChange={(e) => setStatusPartnerFilter(e.target.value)}
                              className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            >
                              <option value="">All Partners</option>
                              {partners?.map((partner: any) => (
                                <option key={partner.id} value={partner.id}>{partner.businessName}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-orange-700 mb-2">Lead Type</label>
                            <select
                              value={statusLeadTypeFilter}
                              onChange={(e) => setStatusLeadTypeFilter(e.target.value)}
                              className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            >
                              <option value="">All Types</option>
                              <option value="equity">Equity</option>
                              <option value="grants">Grants</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-orange-700 mb-2">Status Type</label>
                            <select
                              value={statusTypeFilter}
                              onChange={(e) => setStatusTypeFilter(e.target.value as "all" | "active" | "inactive")}
                              className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            >
                              <option value="all">All Statuses</option>
                              <option value="active">Active Statuses</option>
                              <option value="inactive">Inactive Statuses</option>
                            </select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Status Overview Cards */}
                    {statusOverviewLoading ? (
                      <div className="animate-pulse space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Active Statuses */}
                        <div>
                          <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span>Active Statuses</span>
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                              { name: "New Lead", description: "Fresh lead submission", color: "from-blue-50 to-indigo-50", border: "border-blue-200", text: "text-blue-800" },
                              { name: "RNR", description: "Ring No Response (6-day limit)", color: "from-yellow-50 to-amber-50", border: "border-yellow-200", text: "text-yellow-800" },
                              { name: "Call Back", description: "Lead requested callback (6-day limit)", color: "from-orange-50 to-red-50", border: "border-orange-200", text: "text-orange-800" },
                              { name: "Not Interested", description: "Lead expressed disinterest", color: "from-gray-50 to-slate-50", border: "border-gray-200", text: "text-gray-800" },
                              { name: "Interested", description: "Lead showed interest in proceeding", color: "from-green-50 to-emerald-50", border: "border-green-200", text: "text-green-800" },
                              { name: "Screening Pass", description: "Lead passed initial screening", color: "from-teal-50 to-cyan-50", border: "border-teal-200", text: "text-teal-800" },
                              { name: "Proposal to be Sent", description: "Ready to send proposal", color: "from-purple-50 to-violet-50", border: "border-purple-200", text: "text-purple-800" },
                              { name: "Proposal Sent", description: "Proposal has been sent", color: "from-indigo-50 to-blue-50", border: "border-indigo-200", text: "text-indigo-800" },
                              { name: "Payment Link Sent", description: "Payment link provided", color: "from-pink-50 to-rose-50", border: "border-pink-200", text: "text-pink-800" },
                              { name: "Not Paid", description: "Payment not completed", color: "from-red-50 to-pink-50", border: "border-red-200", text: "text-red-800" },
                              { name: "Paid", description: "Payment received", color: "from-emerald-50 to-green-50", border: "border-emerald-200", text: "text-emerald-800" },
                              { name: "To Apply", description: "Ready to apply", color: "from-blue-50 to-cyan-50", border: "border-blue-200", text: "text-blue-800" },
                              { name: "Applied", description: "Application submitted", color: "from-violet-50 to-purple-50", border: "border-violet-200", text: "text-violet-800" },
                              { name: "Approved", description: "Lead successfully approved", color: "from-green-50 to-teal-50", border: "border-green-200", text: "text-green-800" }
                            ].map((status) => (
                              <Card key={status.name} className={`bg-gradient-to-br ${status.color} border ${status.border} hover:shadow-lg transition-all duration-200`}>
                                <CardHeader className="pb-2">
                                  <CardTitle className={`text-sm font-medium ${status.text}`}>{status.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-2xl font-bold text-gray-900">
                                    {statusOverviewData?.activeStatuses?.[status.name] || 0}
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">{status.description}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>

                        {/* Inactive Statuses */}
                        <div>
                          <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span>Inactive/Rejection Statuses</span>
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                              { name: "Reject - RNR", description: "Auto-rejected after 6 days of no response", color: "from-red-50 to-pink-50", border: "border-red-200", text: "text-red-800" },
                              { name: "Reject - Not Attend", description: "Auto-rejected after 6 days of no callback attendance", color: "from-red-50 to-orange-50", border: "border-red-200", text: "text-red-800" },
                              { name: "Reject - Not Interested", description: "Lead explicitly not interested", color: "from-gray-50 to-slate-50", border: "border-gray-200", text: "text-gray-800" },
                              { name: "Reject - Screening Fail", description: "Failed screening process", color: "from-red-50 to-pink-50", border: "border-red-200", text: "text-red-800" },
                              { name: "Reject - Payment Not Done", description: "Payment not completed within timeframe", color: "from-red-50 to-pink-50", border: "border-red-200", text: "text-red-800" },
                              { name: "Final Reject", description: "Final rejection after application review", color: "from-red-50 to-pink-50", border: "border-red-200", text: "text-red-800" },
                              { name: "Rules Reject", description: "Rejected due to business rules (e.g., company age > 3 years)", color: "from-red-50 to-pink-50", border: "border-red-200", text: "text-red-800" },
                              { name: "Rejected", description: "General rejection status", color: "from-red-50 to-pink-50", border: "border-red-200", text: "text-red-800" }
                            ].map((status) => (
                              <Card key={status.name} className={`bg-gradient-to-br ${status.color} border ${status.border} hover:shadow-lg transition-all duration-200`}>
                                <CardHeader className="pb-2">
                                  <CardTitle className={`text-sm font-medium ${status.text}`}>{status.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-2xl font-bold text-gray-900">
                                    {statusOverviewData?.inactiveStatuses?.[status.name] || 0}
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">{status.description}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "users" && isUserValid(user) && (user.role === "Admin" || user.role === "Operations") && (
                  <div className="space-y-8">
                    {userStatsLoading ? (
                      <div className="animate-pulse space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                          ))}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="h-80 bg-gray-200 rounded-lg"></div>
                          <div className="h-80 bg-gray-200 rounded-lg"></div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Overall Statistics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-blue-600">Total Users</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-blue-900">{userStats?.overallStats?.totalUsers || 0}</div>
                              <p className="text-xs text-blue-600 mt-1">Active team members</p>
                            </CardContent>
                          </Card>

                          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-green-600">Total Leads</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-green-900">{userStats?.overallStats?.totalLeads || 0}</div>
                              <p className="text-xs text-green-600 mt-1">All leads in system</p>
                            </CardContent>
                          </Card>

                          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-purple-600">Assigned Leads</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-purple-900">{userStats?.overallStats?.assignedLeads || 0}</div>
                              <p className="text-xs text-purple-600 mt-1">Leads with assigned users</p>
                            </CardContent>
                          </Card>

                          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-orange-600">Avg Conversion</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-orange-900">
                                {userStats?.overallStats?.averageConversionRate?.toFixed(1) || 0}%
                              </div>
                              <p className="text-xs text-orange-600 mt-1">Team average</p>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Status Distribution Pie Chart */}
                          <Card className="bg-white shadow-lg">
                            <CardHeader>
                              <CardTitle className="flex items-center space-x-2">
                                <PieChart className="w-5 h-5 text-indigo-600" />
                                <span>Lead Status Distribution</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={300}>
                                <RechartsPieChart>
                                  <Pie
                                    data={prepareStatusDistributionData()}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {prepareStatusDistributionData().map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </RechartsPieChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>

                          {/* Active vs Inactive Pie Chart */}
                          <Card className="bg-white shadow-lg">
                            <CardHeader>
                              <CardTitle className="flex items-center space-x-2">
                                <Target className="w-5 h-5 text-green-600" />
                                <span>Active vs Inactive Leads</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={300}>
                                <RechartsPieChart>
                                  <Pie
                                    data={prepareActiveInactiveData()}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {prepareActiveInactiveData().map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </RechartsPieChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </div>

                        {/* User Performance Bar Chart */}
                        <Card className="bg-white shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <BarChart3 className="w-5 h-5 text-blue-600" />
                              <span>User Performance Overview</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                              <BarChart data={prepareUserPerformanceData()}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="totalLeads" fill="#8884d8" name="Total Leads" />
                                <Bar dataKey="activeLeads" fill="#82ca9d" name="Active Leads" />
                                        <Bar dataKey="rnrLeads" fill="#ffc658" name="RNR Leads" />
        <Bar dataKey="rejectRnrLeads" fill="#ff6b6b" name="Reject - RNR" />
        <Bar dataKey="proposalSent" fill="#ff7300" name="Proposal Sent" />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        {/* User Statistics Table */}
                        <Card className="bg-white shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Users className="w-5 h-5 text-purple-600" />
                              <span>Detailed User Statistics</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Total Leads</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Active</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">RNR</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Reject - RNR</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Proposal Sent</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Conversion Rate</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {userStats?.userStatistics?.map((user: any) => (
                                    <tr key={user.userId} className="border-b border-gray-100 hover:bg-gray-50">
                                      <td className="py-3 px-4">
                                        <div className="font-medium text-gray-900">{user.username}</div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                                      </td>
                                      <td className="py-3 px-4 font-medium text-gray-900">{user.totalLeads}</td>
                                      <td className="py-3 px-4">
                                        <span className="text-green-600 font-medium">{user.activeLeads}</span>
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="text-yellow-600 font-medium">{user.rnrLeads}</span>
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="text-red-600 font-medium">{user.rejectRnrLeads}</span>
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="text-blue-600 font-medium">{user.proposalSentLeads}</span>
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className={`font-medium ${user.conversionRate >= 50 ? 'text-green-600' : user.conversionRate >= 25 ? 'text-yellow-600' : 'text-red-600'}`}>
                                          {user.conversionRate}%
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </div>
                )}


              </div>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
