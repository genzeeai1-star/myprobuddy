import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function Welcome() {
  const [, setLocation] = useLocation();

  const handleSignIn = () => {
    setLocation("/login");
  };

  const handleSignUp = () => {
    // Navigate to sign up page (would be implemented separately)
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md text-center relative z-10">
        {/* Logo with enhanced styling */}
        <div className="mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-white p-4 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-sm">
                <Logo size={72} useImage={true} imageSrc="/logo.png" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            MyProBuddy
          </h1>
          <p className="text-gray-600 text-sm font-medium">Lead Management System</p>
        </div>

        {/* Enhanced heading with better typography */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Welcome to MyProBuddy
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Log in to access your personalized dashboard and manage your leads efficiently.
          </p>
        </div>

        {/* Enhanced Sign In Button */}
        <div className="mb-8">
          <Button
            onClick={handleSignIn}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 px-8 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg border-0"
            data-testid="button-signin"
          >
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              SIGN IN
            </span>
          </Button>
        </div>

        {/* Enhanced Sign Up Link */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
          <p className="text-gray-700 mb-3">
            New to MyProBuddy?
          </p>
          <button
            onClick={handleSignUp}
            className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors duration-200 text-base"
            data-testid="link-signup"
          >
            Create your account now →
          </button>
        </div>
      </div>

      {/* Enhanced Footer */}
      <footer className="absolute bottom-6 text-center">
        <div className="bg-white/40 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
          <p className="text-sm text-gray-600 font-medium">
            © 2025, MyProBuddy Pvt. Ltd. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
