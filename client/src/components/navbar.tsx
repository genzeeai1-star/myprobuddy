import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/ui/logo";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
    },
  });

  const navItems = [
    { path: "/dashboard", label: "Dashboard", roles: ["Admin", "Manager", "Customer success officer", "Operations", "Analyst"] },
    { path: "/Partners", label: "Partners", roles: ["Admin", "Manager", "Customer success officer"] },
    { path: "/leads", label: "Leads", roles: ["Admin", "Manager", "Customer success officer", "Operations", "Analyst"] },
    { path: "/reports", label: "Reports", roles: ["Admin", "Manager", "Analyst"] },
    { path: "/users", label: "Users", roles: ["Admin", "Manager"] },
  ];

  const visibleNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <nav className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-xl border-b border-blue-200 fixed top-0 left-0 right-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => setLocation("/dashboard")}>
            <div className="relative">
              <Logo size={32} useImage={true} imageSrc="/logo.png" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-indigo-700 transition-all duration-200">
              MyProBuddy
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {visibleNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`relative px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  location === item.path
                    ? "text-white bg-gradient-to-r from-blue-500 to-indigo-500 shadow-md"
                    : "text-blue-700 hover:text-blue-800 hover:bg-blue-100"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                {item.label}
                {location === item.path && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                )}
              </button>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              data-testid="button-notifications"
              className="relative p-2 hover:bg-blue-100 rounded-lg transition-all duration-200"
            >
              <Bell className="w-4 h-4 text-blue-600" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-3 p-2 hover:bg-blue-100 rounded-lg transition-all duration-200" 
                  data-testid="button-user-menu"
                >
                  <div className="relative">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white text-sm font-medium">
                        {user ? getInitials(user.username) : "U"}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-blue-800">
                      {user?.username || "User"}
                    </div>
                    <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      {user?.role || "Role"}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-blue-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user ? getInitials(user.username) : "U"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-800">{user?.username}</p>
                      <p className="text-xs text-blue-600">{user?.email}</p>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user?.role || "Role"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  className="text-red-600 focus:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
