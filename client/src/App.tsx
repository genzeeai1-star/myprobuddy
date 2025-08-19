import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Welcome from "@/pages/welcome";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Partners from "@/pages/Partners";
import Leads from "@/pages/leads";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import ProtectedRoute from "@/components/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard">
        <ProtectedRoute allowedRoles={["Admin", "Manager", "Customer success officer", "Operations", "Analyst"]}>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/Partners">
        <ProtectedRoute allowedRoles={["Admin", "Manager", "Customer success officer"]}>
          <Partners />
        </ProtectedRoute>
      </Route>
      <Route path="/leads">
        <ProtectedRoute allowedRoles={["Admin", "Manager", "Customer success officer", "Operations", "Analyst"]}>
          <Leads />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute allowedRoles={["Admin", "Manager", "Analyst"]}>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute allowedRoles={["Admin"]}>
          <Users />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
