import { useState, useEffect } from 'react';
import { Eye, EyeOff, LogIn, Shield, User, Lock, Building, Warehouse, Package, ShoppingCart, BarChart3, Cloud, Server, Cpu } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setError('Login bypassed for testing');
    window.location.href = '/inventory';
  };

  // Floating animation elements
  const FloatingIcon = ({ icon: Icon, delay, position }: any) => (
    <div 
      className={`absolute text-[#26667F]/10 animate-float-slow hidden sm:block ${position}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(38,102,127,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(38,102,127,0.03)_1px,transparent_1px)] bg-[size:40px_40px] sm:bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
        
        {/* Animated Orbs */}
        <div className="absolute top-1/4 -left-20 sm:-left-32 w-48 h-48 sm:w-96 sm:h-96 bg-[#26667F]/5 rounded-full blur-2xl sm:blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 -right-20 sm:-right-32 w-48 h-48 sm:w-96 sm:h-96 bg-[#124170]/5 rounded-full blur-2xl sm:blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-64 sm:h-64 bg-[#26667F]/10 rounded-full blur-xl sm:blur-2xl animate-pulse"></div>

        {/* Floating Icons */}
        <FloatingIcon icon={Warehouse} delay={0} position="top-1/4 left-1/4" />
        <FloatingIcon icon={Package} delay={1} position="top-1/3 right-1/3" />
        <FloatingIcon icon={ShoppingCart} delay={2} position="bottom-1/3 left-1/3" />
        <FloatingIcon icon={BarChart3} delay={3} position="bottom-1/4 right-1/4" />
        <FloatingIcon icon={Server} delay={4} position="top-1/2 right-1/6" />
        <FloatingIcon icon={Cloud} delay={5} position="bottom-1/2 left-1/6" />
      </div>

      <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12 lg:gap-16 z-10">
        {/* Left Side - Hero Section */}
        <div className="w-full lg:w-1/2 text-center lg:text-left space-y-6 sm:space-y-8">
          <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
{/* Logo and Brand */}
<div className="flex flex-col items-center lg:items-start gap-4 sm:gap-6">
  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
    <div className="relative">
      <div className="bg-gradient-to-br from-[#26667F] to-[#124170] p-3 sm:p-4 lg:p-5 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl transform hover:scale-105 transition-transform duration-500">
        <Cpu className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-white" />
      </div>
      <div className="absolute -inset-1 bg-gradient-to-r from-[#26667F] to-[#124170] rounded-2xl sm:rounded-3xl blur opacity-30 animate-pulse"></div>
    </div>
    <div className="mt-3 sm:mt-0">
      <div className="relative">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black bg-gradient-to-r from-[#26667F] via-[#1a4d8c] to-[#124170] bg-clip-text text-transparent leading-[1.25] tracking-normal pb-2.5">
  AyuSys Pro
</h1>

        
      </div>
      <div className="mt-2 sm:mt-3">
        <span className="text-sm sm:text-base lg:text-lg xl:text-xl font-semibold text-[#26667F] tracking-wide bg-white/80 px-2 sm:px-3 py-1 rounded-lg inline-block">
          ENTERPRISE MANAGEMENT SYSTEM
        </span>
      </div>
    </div>
  </div>
  
  <div className="space-y-4 sm:space-y-6 text-center lg:text-left w-full px-2 sm:px-0">
    <div className="space-y-2 sm:space-y-4">
      <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-800 leading-tight">
        Complete Business
      </h2>
      <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight">
        <span className="bg-gradient-to-r from-[#26667F] to-[#124170] bg-clip-text text-transparent">
          Management Suite
        </span>
      </h2>
    </div>
    <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-600 font-light max-w-2xl leading-relaxed">
      Unified platform for inventory, products, orders, and packing
    </p>
  </div>
</div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto sm:mx-0 px-2 sm:px-0">
              {[
                { icon: Warehouse, label: 'Smart Inventory', desc: 'Real-time stock tracking' },
                { icon: Package, label: 'Product Catalog', desc: 'Complete product management' },
                { icon: ShoppingCart, label: 'Order Processing', desc: 'Seamless order workflow' },
                { icon: BarChart3, label: 'Packing System', desc: 'Efficient packing workflow' }
              ].map((feature, index) => (
                <div 
                  key={feature.label}
                  className="group p-3 sm:p-4 bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-500 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100 + 500}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-[#26667F] to-[#124170] p-1 sm:p-2 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm sm:text-base">{feature.label}</div>
                      <div className="text-xs text-gray-600">{feature.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 lg:gap-8 pt-2 sm:pt-4 px-2 sm:px-0">
              {[
                { value: '99.9%', label: 'Uptime' },
                { value: '500+', label: 'Orders' },
                { value: '24/7', label: 'Support' }
              ].map((stat, index) => (
                <div key={stat.label} className="text-center animate-fade-in-up flex-1 sm:flex-none min-w-[70px] sm:min-w-[80px]" style={{ animationDelay: `${index * 100 + 800}ms` }}>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-[#26667F] to-[#124170] bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-600 font-medium mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-2/5 max-w-md sm:max-w-lg lg:max-w-md">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-white/20 overflow-hidden transform hover:shadow-2xl sm:hover:shadow-3xl transition-all duration-700 animate-scale-in">
            {/* Form Header */}
            <div className="p-6 sm:p-8 border-b border-gray-100/50">
              <div className="text-center space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#26667F] to-[#124170] bg-clip-text text-transparent">
                  Welcome Back
                </h3>
                <p className="text-gray-600 text-sm sm:text-base">Sign in to your enterprise dashboard</p>
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
              {error && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-xl sm:rounded-2xl flex items-center gap-3 animate-shake backdrop-blur-sm">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-amber-800 font-medium text-xs sm:text-sm">Demo Mode Active</p>
                    <p className="text-amber-700 text-xs sm:text-sm">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Username Field */}
                <div className="space-y-2 sm:space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <User className="h-4 w-4 text-[#26667F]" />
                    Username
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full p-3 sm:p-4 pl-10 sm:pl-12 border border-gray-200 sm:border-2 rounded-xl sm:rounded-2xl bg-white/50 focus:bg-white focus:border-[#26667F] focus:ring-2 sm:focus:ring-4 focus:ring-[#26667F]/10 transition-all duration-500 outline-none group-hover:border-[#26667F]/50 text-sm sm:text-base"
                      placeholder="Enter your username"
                    />
                    <User className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-colors duration-300 group-hover:text-[#26667F]" />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2 sm:space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Lock className="h-4 w-4 text-[#26667F]" />
                    Password
                  </label>
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 sm:p-4 pl-10 sm:pl-12 pr-10 sm:pr-12 border border-gray-200 sm:border-2 rounded-xl sm:rounded-2xl bg-white/50 focus:bg-white focus:border-[#26667F] focus:ring-2 sm:focus:ring-4 focus:ring-[#26667F]/10 transition-all duration-500 outline-none group-hover:border-[#26667F]/50 text-sm sm:text-base"
                      placeholder="Enter your password"
                    />
                    <Lock className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-colors duration-300 group-hover:text-[#26667F]" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#26667F] transition-all duration-300 hover:scale-110"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded border border-gray-300 sm:border-2 text-[#26667F] focus:ring-[#26667F] transition-colors duration-300 group-hover:border-[#26667F]" 
                      />
                    </div>
                    Remember me
                  </label>
                  <button 
                    type="button" 
                    className="text-xs sm:text-sm font-medium text-[#26667F] hover:text-[#124170] transition-all duration-300 hover:scale-105"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#26667F] to-[#124170] text-white p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl font-bold hover:from-[#1e5566] hover:to-[#0f3560] transform hover:scale-[1.02] focus:scale-[1.02] active:scale-[0.98] transition-all duration-500 shadow-lg sm:shadow-xl hover:shadow-xl sm:hover:shadow-2xl disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg sm:disabled:hover:shadow-xl flex items-center justify-center gap-2 sm:gap-3 group relative overflow-hidden text-sm sm:text-base"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 border-2 border-white border-t-transparent"></div>
                      <span className="animate-pulse">Signing in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 group-hover:scale-110 transition-transform duration-300" />
                      <span>Access Dashboard</span>
                    </>
                  )}
                </button>
              </form>

              {/* Demo Notice */}
              <div className="mt-6 sm:mt-8 p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-[#26667F]/5 to-[#124170]/5 rounded-xl sm:rounded-2xl border border-[#26667F]/10 backdrop-blur-sm">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-[#26667F] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[#26667F] font-bold text-xs sm:text-sm">Enterprise Ready</p>
                    <p className="text-[#26667F]/80 text-xs sm:text-sm mt-1">Full system access with role-based permissions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9) rotate(-1deg);
          }
          to {
            opacity: 1;
            transform: scale(1) rotate(0);
          }
        }
        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-15px) rotate(120deg);
          }
          66% {
            transform: translateY(8px) rotate(240deg);
          }
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Login;