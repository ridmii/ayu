import { useState, useEffect } from 'react';
import api from '../api';
import {
  Package,
  CheckCircle,
  User,
  MapPin,
  ShoppingCart,
  Calendar,
  AlertCircle,
  Phone,
  Mail,
  Home
} from 'lucide-react';

const PackerInterface = () => {
  const [order, setOrder] = useState<any>(null);
  const [packer, setPacker] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

  // Mock data for testing
  const mockOrder = {
    _id: 'test_order_123456',
    customer: {
      name: 'Sanduni Perera',
      email: 'sanduni@example.com',
      phone: '+94 77 123 4567'
    },
    totalAmount: 15750,
    status: 'Packing',
    createdAt: new Date().toISOString(),
    items: [
      { name: 'Organic Lavender Essential Oil', quantity: 2, price: 4500 },
      { name: 'Tea Tree Therapeutic Shampoo', quantity: 1, price: 3200 },
      { name: 'Peppermint Lip Balm', quantity: 3, price: 850 },
      { name: 'Lemon Grass Soap Bar', quantity: 4, price: 600 }
    ],
    shippingAddress: {
      street: '123 Galle Road',
      city: 'Colombo 03',
      state: 'Western Province',
      zipCode: '00300',
      country: 'Sri Lanka'
    },
    notes: 'Please handle with care - fragile glass bottles. Include free sample as discussed.'
  };

  const mockPacker = {
    _id: 'test_packer_001',
    name: 'Kamal Silva',
    phone: '+94 76 555 1234'
  };

  // Get token from URL
  const getTokenFromURL = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
  };

  useEffect(() => {
    const token = getTokenFromURL();
    
    // Check if this is a test token
    if (token && token.startsWith('test-')) {
      setIsTestMode(true);
      setLoading(true);
      
      // Simulate API call delay
      setTimeout(() => {
        setOrder(mockOrder);
        setPacker(mockPacker);
        setLoading(false);
      }, 1500);
      return;
    }

    // Real token handling would go here
    if (token) {
      // Your actual API call for real tokens
      fetchRealAssignment(token);
    } else {
      setError('No access token found in URL');
      setLoading(false);
    }
  }, []);

  const fetchRealAssignment = async (token: string) => {
    try {
      setLoading(true);
      // This would be your real API call
      // const res = await api.get(`/api/packing/${token}`);
      // setOrder(res.data.order);
      // setPacker(res.data.packer);
      
      // For now, we'll use mock data but you can replace this
      setTimeout(() => {
        setOrder(mockOrder);
        setPacker(mockPacker);
        setLoading(false);
      }, 1500);
    } catch (err: any) {
      setError('Invalid or expired access token');
      setLoading(false);
    }
  };

  const markAsCompleted = async () => {
    if (!order) return;

    try {
      setIsCompleting(true);
      
      if (isTestMode) {
        // Simulate API call for test mode
        await new Promise(resolve => setTimeout(resolve, 2000));
        setSuccess('✅ Order marked as completed successfully! (Test Mode)');
        setOrder({ ...order, status: 'Packed' });
      } else {
        // Real API call would go here
        // await api.put(`/api/orders/${order._id}/complete-packing`);
        setSuccess('Order marked as completed successfully!');
        setOrder({ ...order, status: 'Packed' });
      }
      
      setTimeout(() => {
        setSuccess('');
      }, 4000);
    } catch (err: any) {
      setError('Failed to mark order as completed');
    } finally {
      setIsCompleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-800 font-medium">Loading your packing assignment...</p>
          {isTestMode && <p className="text-blue-600 text-sm mt-2">Test Mode</p>}
        </div>
      </div>
    );
  }

  if (error && !isTestMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 mx-auto"
          >
            <Home className="h-4 w-4" />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Packing Interface
                  {isTestMode && <span className="ml-2 text-sm bg-yellow-500 text-white px-2 py-1 rounded">TEST MODE</span>}
                </h1>
                <p className="text-gray-600">
                  Order #{order?._id.slice(-8).toUpperCase()}
                  {isTestMode && ' • Demonstration Only'}
                </p>
              </div>
            </div>
            {packer && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Assigned to</p>
                <p className="font-semibold text-gray-800">{packer.name}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Alert Messages */}
        <div className="space-y-3 mb-6">
          {error && isTestMode && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-3">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center space-x-3">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          {isTestMode && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <strong>Test Mode Active</strong>
                  <p className="text-sm mt-1">This is a demonstration of the packer interface. No real orders are being processed.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {order && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Status */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Order Status</h2>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'Packed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {order.status === 'Packed' ? 'Completed' : 'Ready to Pack'}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Order placed</p>
                    <p className="font-semibold text-gray-800">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total amount</p>
                    <p className="font-semibold text-gray-800">{formatCurrency(order.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Items count</p>
                    <p className="font-semibold text-gray-800">{order.items?.length || 0} items</p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Customer Information</h2>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-800">{order.customer.name}</p>
                      <p className="text-sm text-gray-600">Customer</p>
                    </div>
                  </div>
                  
                  {order.customer.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-semibold text-gray-800">{order.customer.email}</p>
                        <p className="text-sm text-gray-600">Email</p>
                      </div>
                    </div>
                  )}
                  
                  {order.customer.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-semibold text-gray-800">{order.customer.phone}</p>
                        <p className="text-sm text-gray-600">Phone</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              {order.shippingAddress && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Shipping Address</span>
                  </h2>
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-800">{order.shippingAddress.street}</p>
                    <p className="text-gray-600">
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </p>
                    <p className="text-gray-600">{order.shippingAddress.country}</p>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Order Items</span>
                </h2>
                <div className="space-y-3">
                  {order.items?.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-gray-800">{formatCurrency(item.price)}</p>
                    </div>
                  ))}
                  {order.items && order.items.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="font-bold text-gray-800">Total</p>
                      <p className="font-bold text-gray-800">{formatCurrency(order.totalAmount)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Instructions */}
              {order.notes && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Special Instructions</h2>
                  <p className="text-gray-700 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar - Actions */}
            <div className="space-y-6">
              {/* Completion Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Packing Actions</h2>
                
                {order.status === 'Packed' ? (
                  <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Order Completed</h3>
                    <p className="text-green-600">This order has been packed and is ready for shipping.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-blue-800 mb-2">Ready to Complete?</h3>
                      <p className="text-blue-600 text-sm">
                        Once you've finished packing all items, mark this order as completed.
                      </p>
                    </div>
                    
                    <button
                      onClick={markAsCompleted}
                      disabled={isCompleting}
                      className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      {isCompleting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Completing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          <span>Mark as Completed</span>
                        </>
                      )}
                    </button>
                    
                    <div className="text-xs text-gray-500 text-center">
                      This will notify the system that the order is ready for shipping
                    </div>
                  </div>
                )}
              </div>

              {/* Packing Checklist */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Packing Checklist</h2>
                <div className="space-y-3">
                  {[
                    'Verify all items are present',
                    'Check item conditions',
                    'Use appropriate packaging',
                    'Include packing slip',
                    'Seal package securely',
                    'Apply shipping label'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-green-500 hidden" />
                      </div>
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackerInterface;