import { useNavigate } from 'react-router-dom';
import { Search, Bell, LogOut } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();

  // Sample data matching the screenshot
  const recentOrders = [
    { id: 'ORD-2023-001', customer: 'Ayush Wellness Center', date: '2023-10-15', total: 'LKR 12,500', status: 'delivered' },
    { id: 'ORD-2023-002', customer: 'Veda Ayurveda', date: '2023-10-16', total: 'LKR 8,750', status: 'packed' },
    { id: 'ORD-2023-003', customer: 'Natural Life Store', date: '2023-10-16', total: 'LKR 15,200', status: 'in production' },
    { id: 'ORD-2023-004', customer: 'Herbal Haven', date: '2023-10-17', total: 'LKR 6,300', status: 'pending' }
  ];

  const lowStockAlerts = [
    { material: 'Ashwagandha Root', currentStock: '5 kg', minRequired: '10 kg', status: 'low' },
    { material: 'Brahmi Leaves', currentStock: '8 kg', minRequired: '15 kg', status: 'low' },
    { material: 'Turmeric Powder', currentStock: '12 kg', minRequired: '20 kg', status: 'low' }
  ];

  const orderStatusCounts = [
    { status: 'Pending', count: 3 },
    { status: 'In Production', count: 8 },
    { status: 'Packed', count: 3 },
    { status: 'Delivered', count: 12 }
  ];

  const stats = [
    { label: 'Total Orders', value: '128', change: '12%', icon: '📦' },
    { label: 'Raw Materials', value: '45', change: '', icon: '🌿' },
    { label: 'Products', value: '24', change: '', icon: '⚗️' },
    { label: 'Active Customers', value: '37', change: '', icon: '👥' }
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'packed': return 'bg-blue-100 text-blue-800';
      case 'in production': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleLogout = () => {
    // Add logout logic here
    console.log('Logging out...');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-600 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Brand */}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-white">Ayurveda Admin</h1>
            </div>

            {/* Center - Navigation */}
            <nav className="hidden md:flex items-center space-x-1 mx-8 flex-1 justify-center">
              <button 
                onClick={() => handleNavigation('/dashboard')}
                className="px-4 py-2 text-white font-medium rounded-lg bg-green-700 hover:bg-green-800 transition-all duration-200 transform hover:scale-105 shadow-md"
              >
                Dashboard
              </button>
              <button 
                onClick={() => handleNavigation('/inventory')}
                className="px-4 py-2 text-green-100 hover:text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200 hover:shadow-md"
              >
                Inventory
              </button>
              <button 
                onClick={() => handleNavigation('/products')}
                className="px-4 py-2 text-green-100 hover:text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200 hover:shadow-md"
              >
                Products
              </button>
              <button 
                onClick={() => handleNavigation('/orders')}
                className="px-4 py-2 text-green-100 hover:text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200 hover:shadow-md"
              >
                Orders
              </button>
              <button 
                onClick={() => handleNavigation('/customers')}
                className="px-4 py-2 text-green-100 hover:text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200 hover:shadow-md"
              >
                Customers
              </button>
              <button 
                onClick={() => handleNavigation('/packing')}
                className="px-4 py-2 text-green-100 hover:text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200 hover:shadow-md"
              >
                Packing
              </button>
            </nav>

            {/* Right side - Search, Notifications, and Logout */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 bg-green-500 border border-green-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent w-64 text-white placeholder-green-200"
                />
              </div>
              
              <div className="relative">
                <button className="p-2 text-green-100 hover:text-white relative transition-all duration-200 hover:bg-green-700 rounded-lg">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">3</span>
                </button>
              </div>
              
              <button 
                onClick={handleLogout}
                className="flex items-center space-x-2 text-green-100 hover:text-white font-medium transition-all duration-200 hover:bg-green-700 px-3 py-2 rounded-lg"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, Admin</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <div className="flex items-baseline mt-1">
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                    {stat.change && (
                      <span className="ml-2 text-sm font-medium text-green-600">{stat.change}</span>
                    )}
                  </div>
                </div>
                <div className="text-3xl">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Orders and Low Stock Alert Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Recent Orders - Takes 2/3 width on xl screens */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Recent Orders</h2>
                <button 
                  onClick={() => handleNavigation('/orders')}
                  className="text-green-600 hover:text-green-800 font-medium transition-colors"
                >
                  View All →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">ORDER ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">CUSTOMER</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">DATE</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">TOTAL</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-gray-900 font-medium">{order.id}</td>
                        <td className="py-3 px-4 text-gray-900">{order.customer}</td>
                        <td className="py-3 px-4 text-gray-600">{order.date}</td>
                        <td className="py-3 px-4 font-semibold text-gray-900">{order.total}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Low Stock Alert - Takes 1/3 width on xl screens */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Low Stock Alert</h2>
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">3 items</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">MATERIAL</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">CURRENT STOCK</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">MIN REQUIRED</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockAlerts.map((alert, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-gray-900 font-medium">{alert.material}</td>
                        <td className="py-3 px-4 text-gray-600">{alert.currentStock}</td>
                        <td className="py-3 px-4 text-gray-600">{alert.minRequired}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                            {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center">
                <input 
                  type="checkbox" 
                  id="whatsapp-notification" 
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded" 
                />
                <label htmlFor="whatsapp-notification" className="ml-2 text-sm text-gray-600">
                  WhatsApp notifications sent to owner
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Tracker */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Status Tracker</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {orderStatusCounts.map((status, index) => (
              <div key={status.status} className="flex flex-col items-center p-4 border border-gray-200 rounded-lg text-center hover:border-green-300 transition-colors">
                <span className="text-3xl font-bold text-gray-900 mb-2">{index + 1}</span>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">{status.status}</h3>
                <p className="text-sm text-gray-600">{status.count} orders</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;