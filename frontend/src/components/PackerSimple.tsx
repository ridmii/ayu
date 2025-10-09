import { useState, useEffect } from 'react';
import api from '../api';
import { CheckCircle, AlertCircle, Package, User, ShoppingCart, MapPin, Mail, Phone } from 'lucide-react';

const PackerSimple = ({ socket }: { socket?: any } = {}) => {
  const [assignment, setAssignment] = useState<any | null>(null);
  const [packer, setPacker] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Accept token from URL or sessionStorage so refresh preserves packer-only view
  const urlToken = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') : null;
  const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('packer_token') : null;
  const token = urlToken || sessionToken;
  
  // persist URL token on first load so refresh keeps packer-only UI
  if (typeof window !== 'undefined' && urlToken) {
    sessionStorage.setItem('packer_token', urlToken);
  }

  useEffect(() => {
    const fetchAssignment = async () => {
      if (!token) {
        setError('No access token found. Please use the link provided by your manager.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await api.get(`/api/packing/${token}`);
        if (res.data && res.data.assignments && res.data.assignments.length > 0) {
          const a = res.data.assignments[0];
          setAssignment(a.orderId || null);
          setPacker(a.packerId || null);
          setError('');
        } else {
          setError('No active assignments for this token.');
        }
      } catch (err: any) {
        console.error('Error fetching assignment:', err);
        setError(err?.response?.data?.error || 'Invalid or expired token');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [token]);

  // Optional real-time updates for packer assignment (if socket provided)
  useEffect(() => {
    if (!socket) return;
    const onAssignmentUpdated = (payload: any) => {
      try {
        const t = urlToken || sessionToken;
        if (!t) return;
        // If updated payload contains this token's assignment, refresh
        if (payload?.token === t || payload?.assignment?.token === t) {
          // simple refresh
          (async () => {
            const res = await api.get(`/api/packing/${t}`);
            if (res.data?.assignments?.length) {
              const a = res.data.assignments[0];
              setAssignment(a.orderId || null);
              setPacker(a.packerId || null);
              setError('');
            }
          })();
        }
      } catch (e) { console.warn(e); }
    };

    socket.on('packers:updated', onAssignmentUpdated);
    socket.on('packers:deleted', onAssignmentUpdated);

    return () => {
      socket.off('packers:updated', onAssignmentUpdated);
      socket.off('packers:deleted', onAssignmentUpdated);
    };
  }, [socket, urlToken, sessionToken]);

  const markPacked = async () => {
    if (!assignment || !token) return;
    try {
      setIsCompleting(true);
      const res = await api.put(`/api/packing/${token}/${assignment._id}/packed`);
      if (res.data && res.data.success) {
        setAssignment({ ...assignment, status: 'Packed' });
      }
    } catch (err: any) {
      console.error('Failed to mark packed:', err);
      setError('Failed to update order status.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <div className="animate-bounce rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-teal-800 font-medium">Loading your packing assignment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center animate-scale-in">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => (window.location.href = '/')} 
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10 animate-slide-down">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-teal-600 p-2 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-300">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Packing Assignment</h1>
                <p className="text-gray-600 text-sm">Complete your packing task</p>
              </div>
            </div>
            {packer && (
              <div className="text-right bg-teal-50 px-4 py-2 rounded-lg sm:self-auto self-stretch border border-teal-100 animate-fade-in">
                <p className="text-sm text-teal-600">Packer</p>
                <p className="font-semibold text-teal-800">{packer.name}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6">
        {assignment && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Assignment Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transform hover:shadow-xl transition-all duration-300">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <h2 className="text-lg font-bold text-gray-800">Your Assignment</h2>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium animate-pulse ${assignment.status === 'Packed' ? 'bg-teal-100 text-teal-800 border border-teal-200' : 'bg-orange-100 text-orange-800 border border-orange-200'}`}>
                    {assignment.status === 'Packed' ? 'Completed' : 'Ready to Pack'}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <div className="p-3 bg-teal-50 rounded-lg text-center border border-teal-100 transform hover:scale-105 transition-transform duration-200">
                    <p className="text-sm text-teal-600 mb-1">Order ID</p>
                    <p className="font-bold text-teal-800 text-sm truncate">#{assignment._id}</p>
                  </div>
                  <div className="p-3 bg-teal-50 rounded-lg text-center border border-teal-100 transform hover:scale-105 transition-transform duration-200">
                    <p className="text-sm text-teal-600 mb-1">Total Amount</p>
                    <p className="font-bold text-teal-800 text-sm">
                      {assignment.totalAmount ? new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(assignment.totalAmount) : '-'}
                    </p>
                  </div>
                  <div className="p-3 bg-teal-50 rounded-lg text-center border border-teal-100 transform hover:scale-105 transition-transform duration-200">
                    <p className="text-sm text-teal-600 mb-1">Order Date</p>
                    <p className="font-bold text-teal-800 text-sm">
                      {assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                  <div className="bg-teal-50 px-4 py-3 border-b border-teal-100">
                    <h3 className="font-semibold text-teal-800 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Items to Pack
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {assignment.items?.map((it: any, idx: number) => {
                      const itemName = it.name || it.productName || (it.product && (it.product.name || it.product.productName)) || (it.productId && it.productId.name) || 'Product';
                      const qty = it.quantity ?? it.qty ?? it.count ?? '-';
                      const price = it.price ?? it.unitPrice ?? null;
                      return (
                        <div 
                          key={idx} 
                          className="p-4 hover:bg-teal-50 transition-all duration-200 transform hover:translate-x-1 animate-fade-in"
                          style={{ animationDelay: `${idx * 100}ms` }}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800 text-sm sm:text-base">{itemName}</p>
                              <p className="text-sm text-teal-600">Quantity: {qty}</p>
                            </div>
                            <p className="font-semibold text-teal-800 text-sm sm:text-base">
                              {price ? new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(price) : '-'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-6 flex items-center justify-center">
                  {assignment.status !== 'Packed' ? (
                    <button 
                      onClick={markPacked} 
                      disabled={isCompleting}
                      className="bg-teal-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl w-full sm:w-auto min-w-[200px] animate-pulse"
                    >
                      {isCompleting ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Completing...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Mark as Packed
                        </div>
                      )}
                    </button>
                  ) : (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center w-full sm:w-auto animate-scale-in">
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-6 w-6 text-teal-500 animate-bounce" />
                        <div className="font-semibold text-teal-800">Order Packed Successfully</div>
                      </div>
                      <p className="text-teal-600 text-sm mt-1">This order has been completed</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information Section */}
            {(assignment.shippingAddress || assignment.customerInfo) && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 transform hover:shadow-xl transition-all duration-300 animate-fade-in-up">
                <h3 className="font-semibold text-teal-800 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {assignment.shippingAddress && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-teal-600">
                        <MapPin className="h-4 w-4" />
                        <span className="font-medium">Shipping Address</span>
                      </div>
                      <div className="text-sm text-gray-700 pl-6 space-y-1">
                        {assignment.shippingAddress.street && (
                          <p className="flex items-center gap-2 transform hover:translate-x-1 transition-transform duration-200">
                            {assignment.shippingAddress.street}
                          </p>
                        )}
                        {assignment.shippingAddress.city && <p>{assignment.shippingAddress.city}</p>}
                        {assignment.shippingAddress.country && <p>{assignment.shippingAddress.country}</p>}
                        {assignment.shippingAddress.postalCode && <p>{assignment.shippingAddress.postalCode}</p>}
                      </div>
                    </div>
                  )}
                  
                  {assignment.customerInfo && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-teal-600">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Customer Details</span>
                      </div>
                      <div className="text-sm text-gray-700 pl-6 space-y-2">
                        {assignment.customerInfo.name && (
                          <p className="flex items-center gap-2 transform hover:translate-x-1 transition-transform duration-200">
                            <User className="h-3 w-3 text-teal-500" /> {assignment.customerInfo.name}
                          </p>
                        )}
                        {assignment.customerInfo.email && (
                          <p className="flex items-center gap-2 transform hover:translate-x-1 transition-transform duration-200">
                            <Mail className="h-3 w-3 text-teal-500" /> {assignment.customerInfo.email}
                          </p>
                        )}
                        {assignment.customerInfo.phone && (
                          <p className="flex items-center gap-2 transform hover:translate-x-1 transition-transform duration-200">
                            <Phone className="h-3 w-3 text-teal-500" /> {assignment.customerInfo.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer - Now properly positioned at the bottom */}
      <footer className="bg-white border-t mt-auto animate-fade-in">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 text-center">
          <p className="text-teal-600 text-sm">Packing System • {new Date().getFullYear()}</p>
        </div>
      </footer>

      {/* Add custom animations to your global CSS */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out; }
        .animate-slide-down { animation: slide-down 0.5s ease-out; }
        .animate-scale-in { animation: scale-in 0.4s ease-out; }
      `}</style>
    </div>
  );
};

export default PackerSimple;