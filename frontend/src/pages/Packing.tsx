import { useState, useEffect } from 'react';
import api from '../api';
import { Package, UserCheck, Link as LinkIcon, AlertCircle, CheckCircle, QrCode, Copy, Plus, Users } from 'lucide-react';

interface Packer {
  _id: string;
  name: string;
  phone?: string;
}

interface Order {
  _id: string;
  customer: { name: string };
  totalAmount: number;
  status: string;
  packerId?: string;
  packingToken?: string;
}

const PackingAdmin = () => {
  const [packers, setPackers] = useState<Packer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [newPackerName, setNewPackerName] = useState('');
  const [newPackerPhone, setNewPackerPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedPackerId, setSelectedPackerId] = useState('');
  const [assignmentResult, setAssignmentResult] = useState<{ link: string; qrBase64: string } | null>(null);
  const [showAddPackerModal, setShowAddPackerModal] = useState(false);

  useEffect(() => {
    fetchPackers();
    fetchPendingOrders();
  }, []);

  const fetchPackers = async () => {
    try {
      const res = await api.get('/api/packers');
      setPackers(res.data);
    } catch (err) {
      setError('Failed to load packers');
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const res = await api.get('/api/orders?status=PendingPacking');
      setOrders(res.data);
    } catch (err) {
      setError('Failed to load orders');
    }
  };

  const addPacker = async () => {
    try {
      const res = await api.post('/api/packers', { name: newPackerName, phone: newPackerPhone });
      setPackers([...packers, res.data]);
      setNewPackerName('');
      setNewPackerPhone('');
      setSuccess('Packer added successfully');
      setShowAddPackerModal(false);
      fetchPackers();
    } catch (err) {
      setError('Failed to add packer');
    }
  };

  const assignPacker = async () => {
    if (!selectedOrderId || !selectedPackerId) {
      setError('Please select an order and packer');
      return;
    }
    try {
      const res = await api.put(`/api/orders/${selectedOrderId}/assign-packer`, { packerId: selectedPackerId });
      const link = `${window.location.origin}/packing?token=${res.data.packingToken}`;
      setAssignmentResult({ link, qrBase64: res.data.qrBase64 }); // Assume backend returns qrBase64
      setSuccess('Packer assigned! Share the link or QR code.');
      fetchPendingOrders();
    } catch (err) {
      setError('Failed to assign packer');
    }
  };

  const copyLink = () => {
    if (assignmentResult?.link) {
      navigator.clipboard.writeText(assignmentResult.link);
      setSuccess('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-3 rounded-2xl shadow-lg">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-800">Packing Management</h1>
                <p className="text-gray-600 mt-2">Assign and manage packing tasks efficiently</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>{success}</span>
          </div>
        )}

        {/* Packers Management Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <Users className="h-6 w-6" />
              <span>Packers</span>
            </h2>
          </div>
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowAddPackerModal(true)}
                className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
              >
                <Plus className="h-4 w-4" />
                <span>Add Packer</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {packers.map((packer) => (
                    <tr key={packer._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-900">{packer.name}</td>
                      <td className="p-4 text-gray-600">{packer.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Assignment Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-500 p-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <UserCheck className="h-6 w-6" />
              <span>Assign Packer</span>
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Order</label>
                <select 
                  value={selectedOrderId} 
                  onChange={(e) => setSelectedOrderId(e.target.value)} 
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Choose an order</option>
                  {orders.map(order => (
                    <option key={order._id} value={order._id}>
                      Order {order._id} - {order.customer.name} (LKR {order.totalAmount})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Packer</label>
                <select 
                  value={selectedPackerId} 
                  onChange={(e) => setSelectedPackerId(e.target.value)} 
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Choose a packer</option>
                  {packers.map(packer => (
                    <option key={packer._id} value={packer._id}>{packer.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button 
              onClick={assignPacker} 
              className="w-full bg-green-500 text-white py-3 rounded-xl hover:bg-green-600 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <UserCheck className="h-5 w-5" />
              <span>Assign & Generate Access</span>
            </button>
          </div>
        </div>

        {/* Assignment Result */}
        {assignmentResult && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-500 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                <LinkIcon className="h-6 w-6" />
                <span>Share Access</span>
              </h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Link</label>
                <div className="flex">
                  <input 
                    value={assignmentResult.link} 
                    readOnly 
                    className="flex-1 p-3 border border-gray-300 rounded-l-xl"
                  />
                  <button 
                    onClick={copyLink} 
                    className="bg-blue-500 text-white px-4 rounded-r-xl hover:bg-blue-600"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="text-center">
                <label className="block text-sm font-semibold text-gray-700 mb-2">QR Code</label>
                <img 
                  src={`data:image/png;base64,${assignmentResult.qrBase64}`} 
                  alt="QR Code" 
                  className="mx-auto max-w-xs"
                />
                <p className="text-gray-600 mt-2">Scan or share this QR code with the packer</p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Orders Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <Package className="h-6 w-6" />
              <span>Pending Packing Orders</span>
            </h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Order ID</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Customer</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Total</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Assigned Packer</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 font-mono">{order._id}</td>
                      <td className="p-4">{order.customer.name}</td>
                      <td className="p-4">LKR {order.totalAmount}</td>
                      <td className="p-4">{order.status}</td>
                      <td className="p-4">{order.packerId ? packers.find(p => p._id === order.packerId)?.name : 'Unassigned'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add Packer Modal */}
        {showAddPackerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Add New Packer</h3>
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={newPackerName} 
                  onChange={(e) => setNewPackerName(e.target.value)} 
                  placeholder="Packer Name" 
                  className="w-full p-3 border border-gray-300 rounded-xl"
                />
                <input 
                  type="text" 
                  value={newPackerPhone} 
                  onChange={(e) => setNewPackerPhone(e.target.value)} 
                  placeholder="Phone (optional)" 
                  className="w-full p-3 border border-gray-300 rounded-xl"
                />
                <div className="flex space-x-3">
                  <button 
                    onClick={addPacker} 
                    className="flex-1 bg-blue-500 text-white py-3 rounded-xl hover:bg-blue-600"
                  >
                    Add Packer
                  </button>
                  <button 
                    onClick={() => setShowAddPackerModal(false)} 
                    className="flex-1 bg-gray-500 text-white py-3 rounded-xl hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackingAdmin;