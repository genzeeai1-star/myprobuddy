import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { loginSchema, type LoginRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/ui/logo";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.username}!`,
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 bg-white/80 backdrop-blur-sm border border-white/20 shadow-2xl">
        <CardHeader className="space-y-0 pb-6">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between mb-8">
            {/* Logo with enhanced styling */}
            <div className="flex items-center space-x-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-white p-2 rounded-xl shadow-lg border border-white/20">
                  <Logo size={32} useImage={true} imageSrc="/logo.png" />
                </div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                MyProBuddy
              </span>
            </div>

            {/* Enhanced Smart Sign-in Pill */}
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium border border-blue-200/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
              <span className="flex items-center">
                <span className="mr-1">✨</span>
                Try smart sign-in
              </span>
            </div>
          </div>

          {/* Enhanced Title and Subtitle */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Sign in</h1>
            <p className="text-gray-600 text-base">to access MyProBuddy Home</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Enhanced Email/Username Field */}
            <div className="space-y-3">
              <Label htmlFor="username" className="text-sm font-semibold text-gray-700">
                Email address or mobile number
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your email or mobile number"
                  {...form.register("username")}
                  className="w-full h-12 px-4 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  data-testid="input-username"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
              {form.formState.errors.username && (
                <p className="text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            {/* Enhanced Password Field */}
            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...form.register("password")}
                  className="w-full h-12 px-4 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  data-testid="input-password"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {/* Enhanced Login Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg border-0"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login
                </span>
              )}
            </Button>
          </form>

          {/* Enhanced Demo credentials info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200/50">
            <div className="flex items-center mb-2">
              <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-700 font-semibold">Demo Credentials</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-blue-600 font-medium">Username: <span className="font-bold">admin</span></p>
              <p className="text-xs text-blue-600 font-medium">Password: <span className="font-bold">admin123</span></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
