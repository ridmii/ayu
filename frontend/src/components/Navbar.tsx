import { NavLink, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  Warehouse, 
  LogOut, 
  LogIn,
  User,
  Bell,
  Box
} from 'lucide-react';

const Navbar = () => {
  const isAuthenticated = !!localStorage.getItem('token');
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const navItems = [
    { path: '/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/inventory', label: 'Inventory', icon: Warehouse },
    { path: '/packing', label: 'Packing', icon: Box },
  ];

  // Mock notification count
  const notificationCount = 3;

  return (
    <nav className="bg-gradient-to-r from-teal-600 via-indigo-600 to-violet-700 text-white shadow-lg transition-all duration-300 hover:shadow-xl">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg transition-transform duration-200 hover:scale-105">
              <Package className="h-6 w-6" />
            </div>
            <div className="text-xl font-bold tracking-tight transition-all duration-200 hover:text-white/90">
              AyuSys Pro
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 transform
                    ${isActive 
                      ? 'bg-white/20 text-white shadow-md scale-105' 
                      : 'text-white/90 hover:bg-white/10 hover:text-white hover:scale-105'
                    }
                  `}
                >
                  <Icon className="h-4 w-4 transition-transform duration-200" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {/* Notification Bell always visible */}
            <div className="relative">
              <button className="flex items-center px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200 transform hover:scale-105 group">
                <Bell className="h-4 w-4 transition-transform duration-200 group-hover:shake" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {notificationCount}
                  </span>
                )}
              </button>
            </div>

            {isAuthenticated ? (
              <>
                {/* Profile */}
                <button className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200 transform hover:scale-105 group">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Profile</span>
                </button>

                {/* Logout */}
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/90 hover:bg-red-500/20 hover:text-white transition-all duration-200 transform hover:scale-105 group"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="font-medium">Logout</span>
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200 transform hover:scale-105"
              >
                <LogIn className="h-4 w-4" />
                <span className="font-medium">Login</span>
              </NavLink>
            )}
          </div>
        </div>
      </div>

      {/* Move CSS to normal <style> */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-6deg); }
          75% { transform: rotate(6deg); }
        }
        .group-hover\\:shake:hover {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
