import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
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
  ChevronUp,
  Menu,
} from "lucide-react";


const notificationAPI = {
  getLowInventory: async () => {
    const response = await fetch("/api/inventory/low-stock");
    return response.json();
  },
  getPackedOrders: async () => {
    const response = await fetch("/api/orders/packed");
    return response.json();
  },
};

interface NotificationItem {
  id: string;
  type: "low_inventory" | "packed_order";
  title: string;
  message: string;
  timestamp: string;
  priority: "high" | "medium" | "low";
  read: boolean;
}

const Navbar = () => {
  const isAuthenticated = !!localStorage.getItem("token");
  const location = useLocation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const colors = {
    primary: "#0F828C",
    secondary: "#0A6168",
    accent: "#14A3B0",
    light: "#E6F4F6",
    dark: "#08444A",
    gradient: "linear-gradient(135deg, #0F828C 0%, #0A6168 50%, #08444A 100%)",
    gradientHover:
      "linear-gradient(135deg, #14A3B0 0%, #0F828C 50%, #0A6168 100%)",
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const lowInventoryResponse = await notificationAPI.getLowInventory();
      const lowInventoryItems = lowInventoryResponse.map((item: any) => ({
        id: `inv-${item._id}`,
        type: "low_inventory" as const,
        title: "Low Stock Alert",
        message: `${item.name} is running low (${item.quantity} left)`,
        timestamp: new Date().toISOString(),
        priority: item.quantity <= 5 ? "high" : "medium",
        read: false,
      }));

      const packedOrdersResponse = await notificationAPI.getPackedOrders();
      const packedOrders = packedOrdersResponse.map((order: any) => ({
        id: `order-${order._id}`,
        type: "packed_order" as const,
        title: "Order Packed",
        message: `Order #${order._id.slice(-8)} is ready for shipment`,
        timestamp: new Date().toISOString(),
        priority: "medium",
        read: false,
      }));

      setNotifications([...lowInventoryItems, ...packedOrders]);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setNotifications(getMockNotifications());
    } finally {
      setLoading(false);
    }
  };

  const getMockNotifications = (): NotificationItem[] => [
    {
      id: "1",
      type: "low_inventory",
      title: "Low Stock Alert",
      message: "Product XYZ is running low (3 items left)",
      timestamp: new Date().toISOString(),
      priority: "high",
      read: false,
    },
    {
      id: "2",
      type: "packed_order",
      title: "Order Packed",
      message: "Order #A1B2C3D4 is ready for shipment",
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      priority: "medium",
      read: false,
    },
  ];

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const markAsRead = (id: string) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

  const markAllAsRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const clearNotification = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const unreadCount = notifications.filter((n) => !n.read).length;
  const highPriorityCount = notifications.filter(
    (n) => !n.read && n.priority === "high"
  ).length;

  const navItems = [
    { path: "/inventory", label: "Inventory", icon: Warehouse },
    { path: "/products", label: "Products", icon: Package },
    { path: "/orders", label: "Orders", icon: ShoppingCart },
    { path: "/packing-admin", label: "Packing", icon: Box },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-orange-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "low_inventory":
        return <AlertTriangle className="h-4 w-4" />;
      case "packed_order":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <nav
      className="text-white shadow-2xl transition-all duration-300 relative"
      style={{
        background: colors.gradient,
        boxShadow: "0 4px 20px rgba(15, 130, 140, 0.3)",
      }}
    >
      {/* Hover gradient overlay */}
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
        style={{ background: colors.gradientHover }}
      />

      {/* Main container */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex justify-between items-center py-3">
          {/* Logo */}
          <div className="flex items-center space-x-3 group">
            <div
              className="bg-white/20 p-2 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-white/30 hover:shadow-lg"
              style={{
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <Package className="h-6 w-6" />
            </div>
            <div
              className="text-xl font-bold tracking-tight transition-all duration-300 hover:scale-105"
              style={{
                textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                background: "linear-gradient(135deg, #FFFFFF, #E6F4F6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Aura
            </div>
          </div>

          {/* Web Navigation */}
          <div className="hidden lg:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 transform relative overflow-hidden group ${
                    active
                      ? "text-white shadow-lg scale-105"
                      : "text-white/90 hover:text-white hover:scale-105"
                  }`}
                  style={{
                    background: active
                      ? "rgba(255,255,255,0.25)"
                      : "transparent",
                    backdropFilter: "blur(10px)",
                    border: active
                      ? "1px solid rgba(255,255,255,0.3)"
                      : "1px solid transparent",
                  }}
                >
                  <div
                    className="absolute inset-0 bg-white/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                    style={{ background: colors.gradientHover }}
                  />
                  <Icon className="h-4 w-4 relative z-10" />
                  <span className="font-medium relative z-10">
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu className="h-6 w-6 text-white" />
          </button>

          {/* User Actions (web) */}
          <div className="hidden lg:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                {/* Notification + Profile + Logout */}
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-300"
                >
                  <Bell className="h-5 w-5 text-white" />
                  {unreadCount > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 text-xs rounded-full h-5 w-5 flex items-center justify-center text-white border-2 border-white ${
                        highPriorityCount > 0 ? "bg-red-500" : "bg-orange-500"
                      }`}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
                  <User className="h-4 w-4 inline-block mr-1" /> Profile
                </button>
                <ThemeToggle />
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-white transition"
                >
                  <LogOut className="h-4 w-4 inline-block mr-1" /> Logout
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <LogIn className="h-4 w-4" />
                <span className="font-medium">Login</span>
              </NavLink>
            )}
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="lg:hidden animate-scale-in bg-white/10 rounded-2xl p-4 space-y-3 backdrop-blur-lg border border-white/20">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl ${
                    active
                      ? "bg-white/20 text-white"
                      : "text-white/90 hover:bg-white/10"
                  } transition-all`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <div className="pt-3 border-t border-white/10">
              {isAuthenticated ? (
                <>
                  <button
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </button>
                  <button
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                  <div className="mt-2">
                    <ThemeToggle compact />
                  </div>
                </>
              ) : (
                <NavLink
                  to="/login"
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </NavLink>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </nav>
  );
};

export default Navbar;
