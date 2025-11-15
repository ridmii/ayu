import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { 
  Package, 
  UserCheck, 
  Link as LinkIcon, 
  AlertCircle, 
  CheckCircle, 
  QrCode, 
  Copy, 
  Plus, 
  Users,
  Search,
  Clock,
  CheckSquare,
  BarChart3,
  Activity,
  Target,
  TrendingUp,
  Sparkles,
  User,
  ShoppingCart,
  Calendar,
  MapPin,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  ExternalLink,
  Save,
  Phone,
  Mail,
  Home,
  MoreVertical
} from 'lucide-react';

interface Packer {
  _id: string;
  name: string;
  phone?: string;
  isActive?: boolean;
  avatar?: string;
  completedOrders?: number;
  lastActive?: string;
}

interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Order {
  _id: string;
  customer: Customer;
  totalAmount: number;
  status: string;
  packerId?: string;
  packingToken?: string;
  createdAt: string;
  completedAt?: string;
  items?: Array<{ name: string; quantity: number }>;
  priority?: 'low' | 'medium' | 'high';
  shippingAddress?: {
    street: string;
    city: string;
    state?: string;
    country: string;
    zipCode?: string;
  };
}

const PackingAdmin = ({ socket }: { socket?: any }) => {
  const [packers, setPackers] = useState<Packer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [newPackerName, setNewPackerName] = useState('');
  const [newPackerPhone, setNewPackerPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedPackerId, setSelectedPackerId] = useState('');
  const [assignmentResult, setAssignmentResult] = useState<{ link: string; qrBase64: string } | null>(null);
  const [showAddPackerModal, setShowAddPackerModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedPacker, setSelectedPacker] = useState<Packer | null>(null);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, size: number, speed: number}>>([]);
  const [editingPacker, setEditingPacker] = useState<Packer | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'packer' | 'order', id: string, name: string} | null>(null);
  const [orderEditForm, setOrderEditForm] = useState({
    createdAt: '',
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    }
  });
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Professional color scheme
  const colors = {
    primary: '#065084',
    secondary: '#0F828C',
    accent: '#0AA8A7',
    light: '#F8FAFC',
    dark: '#033D6B',
    gradient: 'linear-gradient(135deg, #065084 0%, #0F828C 50%, #0AA8A7 100%)',
    gradientLight: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
    glow: '0 0 20px rgba(6, 80, 132, 0.3)'
  };

  // Phone number validation
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^0\d{9}$/;
    return phoneRegex.test(phone);
  };

  // Generate floating particles
  useEffect(() => {
    const generateParticles = () => {
      if (!containerRef.current) return;
      const newParticles = [];
      for (let i = 0; i < 15; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 2 + 1,
          speed: Math.random() * 2 + 1
        });
      }
      setParticles(newParticles);
    };

    generateParticles();
    const interval = setInterval(generateParticles, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchPackers();
    fetchOrders();
  }, []);

  // Real-time updates for packers and orders
  useEffect(() => {
    if (!socket) return;

    // Packer events - FIXED: Use consistent event names and proper state updates
    const onPackerCreated = (packer: Packer) => {
      console.log('Packer created via socket:', packer);
      setPackers(prev => [...prev, { ...packer, completedOrders: 0 }]);
    };

    const onPackerUpdated = (updated: Packer) => {
      console.log('Packer updated via socket:', updated);
      setPackers(prev => prev.map(p => p._id === updated._id ? { ...p, ...updated } : p));
      if (selectedPacker?._id === updated._id) {
        setSelectedPacker(prev => prev ? { ...prev, ...updated } : null);
      }
    };

    const onPackerDeleted = ({ _id }: { _id: string }) => {
      setPackers(prev => prev.filter(p => p._id !== _id));
      if (selectedPacker?._id === _id) setSelectedPacker(null);
    };

    // Order events
    const onOrderCreated = (order: Order) => {
      setOrders(prev => [...prev, order]);
      updateCompletedOrders([...orders, order]);
    };

    const onOrderUpdated = (updated: Order) => {
      setOrders(prev => prev.map(o => o._id === updated._id ? updated : o));
      if (selectedOrder?._id === updated._id) {
        setSelectedOrder(updated);
      }
      // Recalculate completed orders when order status changes
      if (updated.status === 'Packed' || updated.status === 'Shipped' || updated.status === 'Delivered') {
        fetchOrders(); // Refresh orders to get updated completion status
      }
    };

    const onOrderDeleted = ({ _id }: { _id: string }) => {
      setOrders(prev => prev.filter(o => o._id !== _id));
      if (selectedOrder?._id === _id) setSelectedOrder(null);
    };

    // Packing events
    const onPackingCompleted = (data: { orderId: string, packerId: string }) => {
      // Update order status to packed
      setOrders(prev => prev.map(order => 
        order._id === data.orderId ? { ...order, status: 'Packed', completedAt: new Date().toISOString() } : order
      ));
      
      // Update packer completed orders count
      setPackers(prev => prev.map(packer => 
        packer._id === data.packerId 
          ? { ...packer, completedOrders: (packer.completedOrders || 0) + 1, lastActive: new Date().toISOString() }
          : packer
      ));

      setSuccess('Order packing completed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    };

    // Socket event listeners - FIXED: Use consistent event names
    socket.on('packers:created', onPackerCreated);
    socket.on('packers:updated', onPackerUpdated);
    socket.on('packers:deleted', onPackerDeleted);
    socket.on('orders:created', onOrderCreated);
    socket.on('orders:updated', onOrderUpdated);
    socket.on('orders:deleted', onOrderDeleted);
    socket.on('packing:completed', onPackingCompleted);

    return () => {
      socket.off('packers:created', onPackerCreated);
      socket.off('packers:updated', onPackerUpdated);
      socket.off('packers:deleted', onPackerDeleted);
      socket.off('orders:created', onOrderCreated);
      socket.off('orders:updated', onOrderUpdated);
      socket.off('orders:deleted', onOrderDeleted);
      socket.off('packing:completed', onPackingCompleted);
    };
  }, [socket, selectedPacker, selectedOrder, orders]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const updateCompletedOrders = (ordersList: Order[]) => {
    const completed = ordersList.filter(order => 
      order.status === 'Packed' || order.status === 'Shipped' || order.status === 'Delivered'
    );
    setCompletedOrders(completed);
  };

  const fetchPackers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/packers');
      console.log('Packers data:', res.data);
      
      const packersWithStats = res.data.map((packer: Packer) => {
        const packerCompletedOrders = completedOrders.filter(order => order.packerId === packer._id);
        return {
          ...packer,
          completedOrders: packerCompletedOrders.length,
          lastActive: packerCompletedOrders[0]?.completedAt || packer.lastActive
        };
      });
      setPackers(packersWithStats);
    } catch (err: any) {
      console.error('Error fetching packers:', err);
      setError('Failed to load packers: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/orders?include=customer');
      console.log('All orders data with customers:', res.data);
      
      const allOrders = res.data.map((order: Order) => ({
        ...order,
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
        shippingAddress: order.shippingAddress ? order.shippingAddress : (order.customer?.address ? {
            street: order.customer.address || '',
            city: 'Colombo',
            state: 'Western Province',
            country: 'Sri Lanka',
            zipCode: '00100'
          } : {
            street: '123 Main St',
            city: 'Colombo',
            state: 'Western Province',
            country: 'Sri Lanka',
            zipCode: '00100'
          }),
        customer: {
          ...order.customer,
          address: order.customer?.address || 'No address provided',
          phone: order.customer?.phone || 'No phone provided'
        }
      }));

      setOrders(allOrders);
      updateCompletedOrders(allOrders);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.shippingAddress?.street.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (statusFilter === 'PendingPacking') {
          return order.status === 'Pending' || order.status === 'PendingPacking';
        }
        return order.status === statusFilter;
      });
    }

    setFilteredOrders(filtered);
  };

  // Packer CRUD Operations
  const addPacker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackerName.trim()) {
      setError('Packer name is required');
      return;
    }

    if (newPackerPhone && !validatePhone(newPackerPhone)) {
      setError('Phone number must be 10 digits starting with 0');
      return;
    }

    try {
      const res = await api.post('/api/packers', { 
        name: newPackerName, 
        phone: newPackerPhone 
      });
      setPackers([...packers, {...res.data, completedOrders: 0}]);
      setNewPackerName('');
      setNewPackerPhone('');
      setSuccess('Packer added successfully');
      setShowAddPackerModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to add packer: ' + (err.response?.data?.error || err.message));
    }
  };

  // FIXED: Update packer function with proper state updates
  const updatePacker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPacker) return;

    if (editingPacker.phone && !validatePhone(editingPacker.phone)) {
      setError('Phone number must be 10 digits starting with 0');
      return;
    }

    try {
      const res = await api.put(`/api/packers/${editingPacker._id}`, {
        name: editingPacker.name,
        phone: editingPacker.phone,
        isActive: editingPacker.isActive
      });
      
      // FIXED: Use functional update and ensure state is updated
      setPackers(prev => prev.map(p => p._id === editingPacker._id ? { ...p, ...res.data } : p));
      
      if (selectedPacker?._id === editingPacker._id) {
        setSelectedPacker(res.data);
      }
      
      setEditingPacker(null);
      setSuccess('Packer updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to update packer: ' + (err.response?.data?.error || err.message));
    }
  };

  const deletePacker = async (packerId: string) => {
    try {
      await api.delete(`/api/packers/${packerId}`);
      setPackers(packers.filter(p => p._id !== packerId));
      if (selectedPacker?._id === packerId) {
        setSelectedPacker(null);
      }
      setSuccess('Packer deleted successfully');
      setShowDeleteConfirmation(false);
      setItemToDelete(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to delete packer: ' + (err.response?.data?.error || err.message));
    }
  };

  // Order CRUD Operations
  // FIXED: Update order function to handle the new fields properly
  const updateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      const res = await api.put(`/api/orders/${editingOrder._id}`, {
        createdAt: orderEditForm.createdAt,
        shippingAddress: orderEditForm.shippingAddress
      });
      
      setOrders(prev => prev.map(o => o._id === editingOrder._id ? res.data : o));
      
      // Also update selected order if it's the same
      if (selectedOrder?._id === editingOrder._id) {
        setSelectedOrder(res.data);
      }
      
      setEditingOrder(null);
      setShowEditOrderModal(false);
      setSuccess('Order updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Order update error:', err);
      setError('Failed to update order: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await api.delete(`/api/orders/${orderId}`);
      setOrders(orders.filter(o => o._id !== orderId));
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(null);
      }
      setSuccess('Order deleted successfully');
      setShowDeleteConfirmation(false);
      setItemToDelete(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to delete order: ' + (err.response?.data?.error || err.message));
    }
  };

  const openEditOrderModal = (order: Order) => {
    setEditingOrder(order);
    setOrderEditForm({
      createdAt: order.createdAt ? (order.createdAt.split ? order.createdAt.split('T')[0] : new Date(order.createdAt).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
      shippingAddress: order.shippingAddress || {
        street: order.customer.address || '',
        city: '',
        state: '',
        country: '',
        zipCode: ''
      }
    });
    setShowEditOrderModal(true);
    setShowActionsMenu(null);
  };

  const showDeleteConfirmationModal = (type: 'packer' | 'order', id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setShowDeleteConfirmation(true);
    setShowActionsMenu(null);
  };

  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'packer') {
      deletePacker(itemToDelete.id);
    } else {
      deleteOrder(itemToDelete.id);
    }
  };

  const assignPacker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !selectedPackerId) {
      setError('Please select an order and packer');
      return;
    }
    try {
      setLoading(true);
      const res = await api.put(`/api/packing/${selectedOrderId}/assign`, { 
        packerId: selectedPackerId 
      });
      
      if (res.data.success) {
        const link = `${window.location.origin}/packing?token=${res.data.packingToken}`;
        setAssignmentResult({ link, qrBase64: res.data.qrBase64 });
        setSuccess('Packer assigned successfully! Share the link with the packer.');
        
        // Update order status in real-time
        setOrders(prev => prev.map(order => 
          order._id === selectedOrderId 
            ? { ...order, status: 'Packing', packerId: selectedPackerId }
            : order
        ));
        
        setSelectedOrderId('');
        setSelectedPackerId('');
      } else {
        setError(res.data.error || 'Failed to assign packer');
      }
    } catch (err: any) {
      console.error('Error assigning packer:', err);
      setError('Failed to assign packer: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (assignmentResult?.link) {
      navigator.clipboard.writeText(assignmentResult.link);
      setSuccess('Link copied to clipboard');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  const testPackerInterface = () => {
    const testLink = `${window.location.origin}/packing?token=test-${Date.now()}`;
    window.open(testLink, '_blank');
    setSuccess('Packer interface opened in new tab for testing!');
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
      case 'PendingPacking': 
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Packing': 
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Packed': 
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Shipped': 
      case 'Delivered':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default: 
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PendingPacking': return 'Pending';
      case 'Packing': return 'Packing';
      case 'Packed': return 'Packed';
      case 'Shipped': return 'Shipped';
      case 'Delivered': return 'Delivered';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  const getPackerCompletedOrders = (packerId: string) => {
    return completedOrders.filter(order => order.packerId === packerId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const refreshData = () => {
    fetchPackers();
    fetchOrders();
    setSuccess('Data refreshed successfully');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Get pending orders for assignment dropdown
  const getPendingOrders = () => {
    return orders.filter(order => 
      order.status === 'Pending' || order.status === 'PendingPacking'
    );
  };

  // Render different content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'packers':
        return renderPackersTab();
      case 'orders':
        return renderOrdersTab();
      case 'overview':
      default:
        return renderOverviewTab();
    }
  };

  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* Main Content - Left Column */}
      <div className="xl:col-span-2 space-y-8">
        {/* Packers Management */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4" style={{ background: colors.gradient }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-3">
                  <Users className="h-5 w-5" />
                  <span>Packing Team</span>
                </h2>
                <p className="text-blue-100/90 text-sm">
                  {packers.length} active packers
                </p>
              </div>
              <button
                onClick={() => setShowAddPackerModal(true)}
                className="flex items-center space-x-2 text-white px-3 py-2 rounded-lg border border-white/30 hover:border-white/50 transition-all duration-300"
              >
                <Plus className="h-4 w-4" />
                <span>Add Packer</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {packers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Packers Found</h3>
                <p className="text-gray-500 mb-4">Get started by adding your first packer</p>
                <button
                  onClick={() => setShowAddPackerModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add First Packer
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packers.map((packer) => (
                  <div
                    key={packer._id}
                    className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-md transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredCard(packer._id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => setSelectedPacker(packer)}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-600" />
                        </div>
                        {/* FIXED: Active status indicator */}
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                          packer.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-sm">{packer.name}</h3>
                        <p className="text-slate-600 text-xs">{packer.phone || 'No phone'}</p>
                        {/* FIXED: Show active status text */}
                        <p className={`text-xs font-medium ${
                          packer.isActive ? 'text-emerald-600' : 'text-slate-500'
                        }`}>
                          {packer.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">
                        {packer.completedOrders || 0} completed
                      </span>
                      <div className="flex items-center space-x-2">
                        <CheckSquare className="h-3 w-3 text-slate-600" />
                        <span className="font-bold text-slate-700">
                          {packer.completedOrders || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Orders Queue */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4" style={{ backgroundColor: colors.dark }}>
            <h2 className="text-xl font-bold text-white flex items-center space-x-3">
              <Package className="h-5 w-5" />
              <span>Orders Queue</span>
            </h2>
            <p className="text-blue-100/90 text-sm">
              {getPendingOrders().length} orders requiring attention
            </p>
          </div>
          <div className="p-6">
            {/* Filters */}
            <div className="flex space-x-3 mb-6">
              <div className="flex-1 relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
              >
                <option value="all">All Status</option>
                <option value="PendingPacking">Pending</option>
                <option value="Packing">Packing</option>
                <option value="Packed">Packed</option>
              </select>
            </div>

            {/* Orders List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredOrders.filter(order => 
                order.status === 'Pending' || order.status === 'PendingPacking' || order.status === 'Packing'
              ).length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Orders Found</h3>
                  <p className="text-gray-500">All orders have been processed or no orders match your filters</p>
                </div>
              ) : (
                filteredOrders
                  .filter(order => order.status === 'Pending' || order.status === 'PendingPacking' || order.status === 'Packing')
                  .map((order) => (
                  <div
                    key={order._id}
                    className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-md transition-all duration-300 cursor-pointer relative"
                    onClick={() => setSelectedOrder(order)}
                  >
                    {/* Priority Indicator */}
                    <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${getPriorityColor(order.priority || 'low')}`} />

                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold text-slate-900 text-sm">
                            #{order._id.slice(-6)}
                          </h3>
                          <span className="font-bold text-slate-900 text-sm">
                            LKR {order.totalAmount}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs">{order.customer.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1 text-slate-500">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(order.createdAt)}</span>
                        </span>
                        <span className="flex items-center space-x-1 text-slate-500">
                          <ShoppingCart className="h-3 w-3" />
                          <span>{order.items?.length || 0} items</span>
                        </span>
                      </div>
                      <span 
                        className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(order.status)}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </div>

                    {order.packerId && (
                      <div className="mt-2 text-xs text-slate-500 flex items-center space-x-1">
                        <UserCheck className="h-3 w-3" />
                        <span>{packers.find(p => p._id === order.packerId)?.name || 'Assigned'}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Assignment Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4" style={{ background: colors.gradient }}>
            <h2 className="text-xl font-bold text-white flex items-center space-x-3">
              <UserCheck className="h-5 w-5" />
              <span>Assign Packer</span>
            </h2>
            <p className="text-teal-100/90 text-sm">
              Assign packers to orders and generate access links for packers
            </p>
          </div>
          <div className="p-6">
            <form onSubmit={assignPacker}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select Order
                  </label>
                  <select 
                    value={selectedOrderId} 
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedOrderId(e.target.value)} 
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
                    required
                  >
                    <option value="">Choose an order</option>
                    {getPendingOrders().map(order => (
                      <option key={order._id} value={order._id}>
                        #{order._id.slice(-6)} - {order.customer.name} (LKR {order.totalAmount})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select Packer
                  </label>
                  <select 
                    value={selectedPackerId} 
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedPackerId(e.target.value)} 
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
                    required
                  >
                    <option value="">Choose a packer</option>
                    {packers.map(packer => (
                      <option key={packer._id} value={packer._id}>
                        {packer.name} ({packer.completedOrders || 0} completed)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button 
                type="submit"
                disabled={loading || !selectedOrderId || !selectedPackerId}
                className="w-full text-white py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-semibold text-sm"
                style={{ 
                  background: colors.gradient,
                }}
              >
                <UserCheck className="h-4 w-4" />
                <span>
                  {loading ? 'Assigning...' : 'Assign Packer & Generate Access'}
                </span>
              </button>
            </form>
          </div>
        </div>
        {/* Assignment Result */}
        {assignmentResult && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4" style={{ backgroundColor: colors.accent }}>
              <h2 className="text-xl font-bold text-white flex items-center space-x-3">
                <LinkIcon className="h-5 w-5" />
                <span>Packer Access Information</span>
              </h2>
              <p className="text-teal-100/90 text-sm">
                Share this information with the assigned packer
              </p>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Packing Link (Send to Packer)
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-300">
                  <input 
                    value={assignmentResult.link} 
                    readOnly 
                    className="flex-1 p-3 bg-slate-50 text-sm border-0"
                  />
                  <button 
                    onClick={copyLink} 
                    className="px-4 text-white transition-all duration-300 flex items-center space-x-2 text-sm font-semibold border-0"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
              <div className="text-center p-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  QR Code (Alternative Access)
                </label>
                <div className="bg-white p-4 rounded-lg shadow-md inline-block">
                  <img 
                    src={assignmentResult.qrBase64} 
                    alt="QR Code" 
                    className="w-40 h-40 mx-auto"
                  />
                </div>
                <p className="text-slate-600 mt-3 text-sm flex items-center justify-center space-x-2">
                  <QrCode className="h-4 w-4" />
                  <span>Scan to access packing interface</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar - Right Column */}
      <div className="space-y-8">
        {/* Performance Metrics */}
        <div className="bg-gradient-to-br rounded-2xl shadow-lg overflow-hidden" style={{ background: colors.gradient }}>
          <div className="p-6 text-white">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Performance Overview</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Orders', value: orders.length, icon: Package },
                { label: 'Pending', value: getPendingOrders().length, icon: Clock },
                { label: 'Active Packers', value: packers.filter(p => p.isActive).length, icon: Users },
                { label: 'Completed', value: completedOrders.length, icon: CheckSquare }
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mx-auto mb-2">
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-xs text-blue-100/90 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Order Details */}
        {selectedOrder && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Order Details</span>
              </h3>
              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(showActionsMenu === selectedOrder._id ? null : selectedOrder._id)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {showActionsMenu === selectedOrder._id && (
                  <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-32">
                    <button
                      onClick={() => openEditOrderModal(selectedOrder)}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => showDeleteConfirmationModal('order', selectedOrder._id, `Order #${selectedOrder._id.slice(-6)}`)}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Order ID</span>
                <span className="text-sm font-semibold">#{selectedOrder._id.slice(-6)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Customer</span>
                <span className="text-sm font-semibold">{selectedOrder.customer.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Amount</span>
                <span className="text-sm font-semibold">LKR {selectedOrder.totalAmount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <span className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusText(selectedOrder.status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Priority</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(selectedOrder.priority || 'low')}`} />
                  <span className="text-sm font-semibold capitalize">{selectedOrder.priority}</span>
                </div>
              </div>
              {selectedOrder.shippingAddress && (
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-semibold text-slate-700">Shipping Address</div>
                      <div className="text-slate-600">{selectedOrder.shippingAddress.street}</div>
                      <div className="text-slate-600">{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.country}</div>
                    </div>
                  </div>
                </div>
              )}
              {selectedOrder.customer.phone && (
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Phone className="h-3 w-3" />
                  <span>{selectedOrder.customer.phone}</span>
                </div>
              )}
              {selectedOrder.customer.email && (
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Mail className="h-3 w-3" />
                  <span>{selectedOrder.customer.email}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Performance */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Team Performance</span>
          </h3>
          <div className="space-y-4">
            {packers.slice(0, 4).map((packer) => (
              <div key={packer._id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{packer.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-700">{packer.completedOrders || 0}</div>
                  <div className="text-xs text-slate-500">completed</div>
                </div>
              </div>
            ))}
            {packers.length === 0 && (
              <div className="text-center py-4 text-slate-500">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm">No packers available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPackersTab = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* Packers List */}
      <div className="xl:col-span-2">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4" style={{ background: colors.gradient }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-3">
                  <Users className="h-5 w-5" />
                  <span>All Packers</span>
                </h2>
                <p className="text-blue-100/90 text-sm">
                  {packers.length} packers in the system
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={refreshData}
                  className="flex items-center space-x-2 text-white px-3 py-2 rounded-lg border border-white/30 hover:border-white/50 transition-all duration-300"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => setShowAddPackerModal(true)}
                  className="flex items-center space-x-2 text-white px-3 py-2 rounded-lg border border-white/30 hover:border-white/50 transition-all duration-300"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Packer</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {packers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Packers Found</h3>
                <p className="text-gray-500 mb-6">Get started by adding your first packer to the team</p>
                <button
                  onClick={() => setShowAddPackerModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add First Packer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {packers.map((packer) => (
                  <div
                    key={packer._id}
                    className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-md transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedPacker(packer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                            <User className="h-6 w-6 text-slate-600" />
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${packer.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{packer.name}</h3>
                          <p className="text-slate-600 text-sm">{packer.phone || 'No phone number'}</p>
                          <p className={`text-xs ${packer.isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {packer.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-900">{packer.completedOrders || 0}</div>
                        <div className="text-sm text-slate-600">orders completed</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Packer Details & Completed Orders */}
      <div className="space-y-6">
        {selectedPacker ? (
          <>
            {/* Packer Details */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Packer Details</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingPacker(selectedPacker)}
                    className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                    title="Edit Packer"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => showDeleteConfirmationModal('packer', selectedPacker._id, selectedPacker.name)}
                    className="p-2 text-red-500 hover:text-red-700 transition-colors"
                    title="Delete Packer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center">
                    <User className="h-8 w-8 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{selectedPacker.name}</h4>
                    <p className="text-slate-600">{selectedPacker.phone || 'No phone'}</p>
                    <p className={`text-sm font-medium ${selectedPacker.isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {selectedPacker.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{selectedPacker.completedOrders || 0}</div>
                    <div className="text-sm text-slate-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {selectedPacker.isActive ? 'Active' : 'Inactive'}
                    </div>
                    <div className="text-sm text-slate-600">Status</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Completed Orders */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Completed Orders</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getPackerCompletedOrders(selectedPacker._id).map((order) => (
                  <div key={order._id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-slate-900 text-sm">
                        #{order._id.slice(-6)}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        LKR {order.totalAmount}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs mb-2">{order.customer.name}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">
                        {order.completedAt ? formatDate(order.completedAt) : formatDate(order.createdAt)}
                      </span>
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                    </div>
                  </div>
                ))}
                {getPackerCompletedOrders(selectedPacker._id).length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p>No completed orders yet</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a Packer</h3>
            <p className="text-slate-500">Click on a packer to view their details and completed orders</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderOrdersTab = () => (
    <div className="space-y-6">
      {/* Orders Management */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4" style={{ backgroundColor: colors.dark }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-3">
                <Package className="h-5 w-5" />
                <span>All Orders</span>
              </h2>
              <p className="text-blue-100/90 text-sm">
                {orders.length} total orders • {getPendingOrders().length} pending
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm bg-white"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm bg-white"
              >
                <option value="all">All Status</option>
                <option value="PendingPacking">Pending</option>
                <option value="Packing">Packing</option>
                <option value="Packed">Packed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Orders Found</h3>
              <p className="text-gray-500">No orders match your current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Order ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Packer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-semibold text-slate-900">
                          #{order._id.slice(-6)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-slate-900">{order.customer.name}</div>
                          <div className="text-xs text-slate-500">{order.items?.length || 0} items</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">LKR {order.totalAmount}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {order.packerId ? (
                          <span className="text-sm text-slate-700">
                            {packers.find(p => p._id === order.packerId)?.name}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-600">{formatDate(order.createdAt)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditOrderModal(order)}
                            className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                            title="Edit Order"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => showDeleteConfirmationModal('order', order._id, `Order #${order._id.slice(-6)}`)}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors"
                            title="Delete Order"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {(order.status === 'Pending' || order.status === 'PendingPacking') && (
                            <button
                              onClick={() => {
                                setSelectedOrderId(order._id);
                                setActiveTab('overview');
                              }}
                              className="p-1 text-green-400 hover:text-green-600 transition-colors"
                              title="Assign Packer"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 relative overflow-hidden"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-gradient-to-r from-blue-200/20 to-cyan-200/10"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animation: `float ${particle.speed * 3}s ease-in-out ${particle.id * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div 
                className="p-4 rounded-2xl shadow-lg"
                style={{ 
                  backgroundColor: colors.primary,
                  boxShadow: '0 0 20px rgba(6, 80, 132, 0.3)'
                }}
              >
                <Package className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                  Packing Management
                </h1>
                <p className="text-slate-600 mt-1 flex items-center space-x-2">
                  <span>Manage packing operations and team performance</span>
                </p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={refreshData}
                className="flex items-center space-x-2 bg-white/80 backdrop-blur-md border border-slate-200 text-slate-700 px-4 py-3 rounded-xl hover:bg-white transition-all duration-300"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Data</span>
              </button>
              <div className="px-4 py-3 rounded-xl bg-white/80 backdrop-blur-md border border-slate-200 shadow-lg">
                <div className="flex items-center space-x-3">
                  <Activity className="h-5 w-5" style={{ color: colors.primary }} />
                  <span className="font-semibold text-slate-700 text-sm">
                    {orders.length} Orders • {packers.length} Packers
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          <div className="space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium">{error}</span>
                </div>
                <button 
                  onClick={clearMessages} 
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  ×
                </button>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium">{success}</span>
                </div>
                <button 
                  onClick={clearMessages} 
                  className="text-emerald-500 hover:text-emerald-700 transition-colors"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 p-2 bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-slate-200 w-fit">
          {['overview', 'packers', 'orders'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 capitalize ${
                activeTab === tab 
                  ? 'text-white shadow-lg' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
              style={{
                background: activeTab === tab ? colors.gradient : 'transparent'
              }}
            >
              <span className="flex items-center space-x-2">
                {tab === 'overview' && <BarChart3 className="h-4 w-4" />}
                {tab === 'packers' && <Users className="h-4 w-4" />}
                {tab === 'orders' && <Package className="h-4 w-4" />}
                <span>{tab}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Add Packer Modal */}
        {showAddPackerModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="px-6 py-4 rounded-t-2xl" style={{ background: colors.gradient }}>
                <h3 className="text-xl font-bold text-white">Add New Packer</h3>
                <p className="text-blue-100/90 text-sm">Add a new member to your packing team</p>
              </div>
              <div className="p-6">
                <form onSubmit={addPacker}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Packer Name *
                      </label>
                      <input 
                        type="text" 
                        value={newPackerName} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPackerName(e.target.value)} 
                        placeholder="Enter packer name" 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Phone Number
                      </label>
                      <input 
                        type="text" 
                        value={newPackerPhone} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPackerPhone(e.target.value)} 
                        placeholder="0712345678 (10 digits starting with 0)"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
                      />
                      {newPackerPhone && !validatePhone(newPackerPhone) && (
                        <p className="text-red-500 text-xs mt-1 flex items-center space-x-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>Phone must be 10 digits starting with 0</span>
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <button 
                        type="submit"
                        disabled={Boolean(newPackerPhone) && !validatePhone(newPackerPhone)}
                        className="flex-1 text-white py-3 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          background: colors.gradient,
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Packer</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowAddPackerModal(false)} 
                        className="flex-1 bg-slate-500 text-white py-3 rounded-lg transition-all duration-300 hover:bg-slate-600 text-sm font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Packer Modal */}
        {editingPacker && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="px-6 py-4 rounded-t-2xl" style={{ background: colors.gradient }}>
                <h3 className="text-xl font-bold text-white">Edit Packer</h3>
                <p className="text-blue-100/90 text-sm">Update packer information</p>
              </div>
              <div className="p-6">
                <form onSubmit={updatePacker}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Packer Name *
                      </label>
                      <input 
                        type="text" 
                        value={editingPacker.name} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingPacker({...editingPacker, name: e.target.value})} 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Phone Number
                      </label>
                      <input 
                        type="text" 
                        value={editingPacker.phone || ''} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingPacker({...editingPacker, phone: e.target.value})} 
                        placeholder="0712345678 (10 digits starting with 0)"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
                      />
                      {editingPacker.phone && !validatePhone(editingPacker.phone) && (
                        <p className="text-red-500 text-xs mt-1 flex items-center space-x-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>Phone must be 10 digits starting with 0</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={editingPacker.isActive || false} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingPacker({...editingPacker, isActive: e.target.checked})} 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="text-sm font-semibold text-slate-700">
                        Active Packer
                      </label>
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <button 
                        type="submit"
                        disabled={Boolean(editingPacker?.phone) && !validatePhone(editingPacker?.phone || '')}
                        className="flex-1 text-white py-3 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          background: colors.gradient,
                        }}
                      >
                        <Save className="h-4 w-4" />
                        <span>Update Packer</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingPacker(null)} 
                        className="flex-1 bg-slate-500 text-white py-3 rounded-lg transition-all duration-300 hover:bg-slate-600 text-sm font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Order Modal */}
        {showEditOrderModal && editingOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
              <div className="px-6 py-4 rounded-t-2xl" style={{ background: colors.gradient }}>
                <h3 className="text-xl font-bold text-white">Edit Order</h3>
                <p className="text-blue-100/90 text-sm">Update order date and shipping address</p>
              </div>
              <div className="p-6">
                <form onSubmit={updateOrder}>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Order Date
                      </label>
                      <input 
                        type="datetime-local" 
                        value={orderEditForm.createdAt} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderEditForm({...orderEditForm, createdAt: e.target.value})} 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
                        <Home className="h-4 w-4" />
                        <span>Shipping Address</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Street Address
                          </label>
                          <input 
                            type="text" 
                            value={orderEditForm.shippingAddress.street} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderEditForm({
                              ...orderEditForm, 
                              shippingAddress: {...orderEditForm.shippingAddress, street: e.target.value}
                            })} 
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            City
                          </label>
                          <input 
                            type="text" 
                            value={orderEditForm.shippingAddress.city} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderEditForm({
                              ...orderEditForm, 
                              shippingAddress: {...orderEditForm.shippingAddress, city: e.target.value}
                            })} 
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            State/Province
                          </label>
                          <input 
                            type="text" 
                            value={orderEditForm.shippingAddress.state} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderEditForm({
                              ...orderEditForm, 
                              shippingAddress: {...orderEditForm.shippingAddress, state: e.target.value}
                            })} 
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Country
                          </label>
                          <input 
                            type="text" 
                            value={orderEditForm.shippingAddress.country} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderEditForm({
                              ...orderEditForm, 
                              shippingAddress: {...orderEditForm.shippingAddress, country: e.target.value}
                            })} 
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            ZIP/Postal Code
                          </label>
                          <input 
                            type="text" 
                            value={orderEditForm.shippingAddress.zipCode} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderEditForm({
                              ...orderEditForm, 
                              shippingAddress: {...orderEditForm.shippingAddress, zipCode: e.target.value}
                            })} 
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-slate-400 transition-all duration-300 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button 
                        type="submit"
                        className="flex-1 text-white py-3 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 text-sm font-semibold"
                        style={{ 
                          background: colors.gradient,
                        }}
                      >
                        <Save className="h-4 w-4" />
                        <span>Update Order</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setShowEditOrderModal(false);
                          setEditingOrder(null);
                        }} 
                        className="flex-1 bg-slate-500 text-white py-3 rounded-lg transition-all duration-300 hover:bg-slate-600 text-sm font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation && itemToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="px-6 py-4 rounded-t-2xl bg-red-500">
                <h3 className="text-xl font-bold text-white">Confirm Delete</h3>
                <p className="text-red-100/90 text-sm">
                  {itemToDelete.type === 'packer' ? 'Delete Packer' : 'Delete Order'}
                </p>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-slate-800 mb-2">
                    Are you sure?
                  </h4>
                  <p className="text-slate-600">
                    {itemToDelete.type === 'packer' 
                      ? `You are about to delete packer "${itemToDelete.name}". This action cannot be undone.`
                      : `You are about to delete ${itemToDelete.name}. This action cannot be undone.`
                    }
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={handleDeleteConfirm}
                    className="flex-1 bg-red-500 text-white py-3 rounded-lg transition-all duration-300 hover:bg-red-600 text-sm font-semibold"
                  >
                    Delete
                  </button>
                  <button 
                    onClick={() => {
                      setShowDeleteConfirmation(false);
                      setItemToDelete(null);
                    }} 
                    className="flex-1 bg-slate-500 text-white py-3 rounded-lg transition-all duration-300 hover:bg-slate-600 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Animations */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
    </div>
  );
};

export default PackingAdmin;