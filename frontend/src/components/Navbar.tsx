import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Package, 
  Warehouse, 
  LogOut, 
  LogIn,
  User,
  Bell,
  Box,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// API service for notifications
const notificationAPI = {
  getLowInventory: async () => {
    // Mock API call - replace with actual API
    const response = await fetch('/api/inventory/low-stock');
    return response.json();
  },
  getPackedOrders: async () => {
    // Mock API call - replace with actual API
    const response = await fetch('/api/orders/packed');
    return response.json();
  }
};

interface NotificationItem {
  id: string;
  type: 'low_inventory' | 'packed_order';
  title: string;
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  read: boolean;
}

const Navbar = () => {
  const isAuthenticated = !!localStorage.getItem('token');
  const location = useLocation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);

  // Enhanced color palette based on #0F828C
  const colors = {
    primary: '#0F828C',
    secondary: '#0A6168',
    accent: '#14A3B0',
    light: '#E6F4F6',
    dark: '#08444A',
    gradient: 'linear-gradient(135deg, #0F828C 0%, #0A6168 50%, #08444A 100%)',
    gradientHover: 'linear-gradient(135deg, #14A3B0 0%, #0F828C 50%, #0A6168 100%)'
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      // Fetch low inventory items
      const lowInventoryResponse = await notificationAPI.getLowInventory();
      const lowInventoryItems = lowInventoryResponse.map((item: any) => ({
        id: `inv-${item._id}`,
        type: 'low_inventory' as const,
        title: 'Low Stock Alert',
        message: `${item.name} is running low (${item.quantity} left)`,
        timestamp: new Date().toISOString(),
        priority: item.quantity <= 5 ? 'high' : 'medium',
        read: false
      }));

      // Fetch packed orders
      const packedOrdersResponse = await notificationAPI.getPackedOrders();
      const packedOrders = packedOrdersResponse.map((order: any) => ({
        id: `order-${order._id}`,
        type: 'packed_order' as const,
        title: 'Order Packed',
        message: `Order #${order._id.slice(-8)} is ready for shipment`,
        timestamp: new Date().toISOString(),
        priority: 'medium',
        read: false
      }));

      setNotifications([...lowInventoryItems, ...packedOrders]);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Fallback to mock data if API fails
      setNotifications(getMockNotifications());
    } finally {
      setLoading(false);
    }
  };

  // Mock data fallback
  const getMockNotifications = (): NotificationItem[] => [
    {
      id: '1',
      type: 'low_inventory',
      title: 'Low Stock Alert',
      message: 'Product XYZ is running low (3 items left)',
      timestamp: new Date().toISOString(),
      priority: 'high',
      read: false
    },
    {
      id: '2',
      type: 'packed_order',
      title: 'Order Packed',
      message: 'Order #A1B2C3D4 is ready for shipment',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      priority: 'medium',
      read: false
    },
    {
      id: '3',
      type: 'low_inventory',
      title: 'Low Stock Alert',
      message: 'Product ABC is running low (8 items left)',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
      priority: 'medium',
      read: true
    }
  ];

  useEffect(() => {
    fetchNotifications();
    
    // Refresh notifications every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const highPriorityCount = notifications.filter(n => !n.read && n.priority === 'high').length;

  const navItems = [
    { path: '/inventory', label: 'Inventory', icon: Warehouse },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/packing-admin', label: 'Packing', icon: Box },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_inventory': return <AlertTriangle className="h-4 w-4" />;
      case 'packed_order': return <CheckCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <nav 
      className="text-white shadow-2xl transition-all duration-300 relative"
      style={{ 
        background: colors.gradient,
        boxShadow: '0 4px 20px rgba(15, 130, 140, 0.3)'
      }}
    >
      {/* Animated background effect */}
      <div 
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
        style={{
          background: colors.gradientHover,
        }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex justify-between items-center py-3">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3 group">
            <div 
              className="bg-white/20 p-2 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-white/30 hover:shadow-lg"
              style={{
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <Package className="h-6 w-6" />
            </div>
            <div 
              className="text-xl font-bold tracking-tight transition-all duration-300 hover:scale-105"
              style={{ 
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                background: 'linear-gradient(135deg, #FFFFFF, #E6F4F6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
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
                    flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 transform
                    relative overflow-hidden group
                    ${isActive 
                      ? 'text-white shadow-lg scale-105' 
                      : 'text-white/90 hover:text-white hover:scale-105'
                    }
                  `}
                  style={{
                    background: isActive 
                      ? 'rgba(255,255,255,0.25)' 
                      : 'transparent',
                    backdropFilter: 'blur(10px)',
                    border: isActive ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent'
                  }}
                >
                  {/* Hover effect */}
                  <div 
                    className="absolute inset-0 bg-white/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                    style={{ background: colors.gradientHover }}
                  />
                  
                  <Icon className="h-4 w-4 relative z-10 transition-transform duration-200 group-hover:scale-110" />
                  <span className="font-medium relative z-10">{item.label}</span>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div 
                      className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-1 rounded-full transition-all duration-300"
                      style={{ backgroundColor: colors.light }}
                    />
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* User Actions - CORRECTED: Notification bell moved here */}
          <div className="flex items-center space-x-3">
            {/* Enhanced Notification Bell - Now properly placed with other user actions */}
            {isAuthenticated && (
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="flex items-center px-3 py-2 rounded-xl text-white/90 hover:text-white transition-all duration-300 transform hover:scale-105 group relative"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <Bell className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                  
                  {/* Notification badge */}
                  {unreadCount > 0 && (
                    <span 
                      className={`
                        absolute -top-1 -right-1 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center 
                        animate-pulse border-2 border-white shadow-lg
                        ${highPriorityCount > 0 ? 'bg-red-500' : 'bg-orange-500'}
                      `}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  
                  {/* Dropdown arrow */}
                  {showNotifications ? (
                    <ChevronUp className="h-3 w-3 ml-1 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="h-3 w-3 ml-1 transition-transform duration-200" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div 
                    className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 transform animate-scale-in origin-top-right z-50"
                    style={{ maxHeight: '480px' }}
                  >
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800 flex items-center space-x-2">
                          <Bell className="h-4 w-4" />
                          <span>Notifications</span>
                          {unreadCount > 0 && (
                            <span 
                              className={`px-2 py-1 rounded-full text-xs font-medium text-white ${highPriorityCount > 0 ? 'bg-red-500' : 'bg-orange-500'}`}
                            >
                              {unreadCount} new
                            </span>
                          )}
                        </h3>
                        <div className="flex space-x-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                            >
                              Mark all read
                            </button>
                          )}
                          <button
                            onClick={() => setShowNotifications(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {loading ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                          <p className="text-gray-500 text-sm mt-2">Loading notifications...</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`
                              p-4 border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 group
                              ${notification.read ? 'bg-white' : 'bg-blue-50'}
                            `}
                          >
                            <div className="flex space-x-3">
                              <div 
                                className={`
                                  p-2 rounded-lg flex-shrink-0 mt-1
                                  ${notification.read ? 'text-gray-400' : getPriorityColor(notification.priority).replace('bg-', 'text-')}
                                `}
                              >
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className={`font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                                      {notification.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-2">
                                      {formatTime(notification.timestamp)}
                                    </p>
                                  </div>
                                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    {!notification.read && (
                                      <button
                                        onClick={() => markAsRead(notification.id)}
                                        className="p-1 text-gray-400 hover:text-green-600 transition-colors duration-200"
                                        title="Mark as read"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => clearNotification(notification.id)}
                                      className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                                      title="Dismiss"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                {!notification.read && (
                                  <div 
                                    className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(notification.priority)}`}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4 border-t border-gray-100">
                      <button 
                        onClick={fetchNotifications}
                        disabled={loading}
                        className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 disabled:opacity-50"
                      >
                        {loading ? 'Refreshing...' : 'Refresh Notifications'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile and Authentication Buttons */}
            {isAuthenticated ? (
              <>
                {/* Profile */}
                <button 
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl text-white/90 hover:text-white transition-all duration-300 transform hover:scale-105 group"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <User className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                  <span className="font-medium">Profile</span>
                </button>

                {/* Logout */}
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl text-white/90 hover:text-white transition-all duration-300 transform hover:scale-105 group"
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                  <span className="font-medium">Logout</span>
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center space-x-2 px-3 py-2 rounded-xl text-white/90 hover:text-white transition-all duration-300 transform hover:scale-105 group"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <LogIn className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                <span className="font-medium">Login</span>
              </NavLink>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced CSS Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        .group:hover .group-hover\\:shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;