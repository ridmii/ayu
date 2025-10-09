import { useState, useEffect } from 'react';
import api from '../api';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Save,
  RotateCcw,
  Warehouse,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Bell,
  BarChart3,
  Scale,
  X,
  Download,
  Upload,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calculator,
  Recycle,
  ArrowUpDown
} from 'lucide-react';



interface RawMaterial {
  _id: string;
  name: string;
  initialQuantity: number;
  processedQuantity: number;
  wastage: number;
  usableQuantity: number;
  unit: string;
  lowStockThreshold: number;
  lastUpdated?: string;
  status?: 'optimal' | 'low' | 'critical';
}

// Enhanced color palette
const colors = {
  primary: '#0F828C',
  secondary: '#0A6168',
  accent: '#14A3B0',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#f8fafc',
  surface: '#ffffff',
  gradient: 'linear-gradient(135deg, #0F828C 0%, #0A6168 50%, #08444A 100%)',
  gradientHover: 'linear-gradient(135deg, #14A3B0 0%, #0F828C 50%, #0A6168 100%)'
};

// Enhanced Confirmation Modal Component
const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger"
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "success";
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    danger: "bg-red-500",
    warning: "bg-yellow-500",
    success: "bg-green-500"
  };

  const typeIcons = {
    danger: <AlertTriangle className="h-6 w-6 text-white" />,
    warning: <AlertTriangle className="h-6 w-6 text-white" />,
    success: <CheckCircle className="h-6 w-6 text-white" />
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-scale-in border border-gray-200">
        <div className={`p-6 ${typeStyles[type]} rounded-t-2xl`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              {typeIcons[type]}
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>
        
        <div className="p-6 border-t border-gray-100 flex space-x-3 justify-end bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium transform hover:scale-105"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-3 text-white rounded-xl transition-all duration-200 font-medium transform hover:scale-105 ${
              type === 'danger' 
                ? 'bg-red-500 hover:bg-red-600 shadow-lg hover:shadow-xl' 
                : type === 'warning'
                ? 'bg-yellow-500 hover:bg-yellow-600 shadow-lg hover:shadow-xl'
                : 'bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-xl'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Success Toast Component
const SuccessToast = ({ message, isVisible, onClose }: {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-2xl shadow-2xl flex items-center space-x-3 max-w-sm border border-green-200">
        <div className="p-1 bg-white/20 rounded-lg">
          <CheckCircle className="h-5 w-5" />
        </div>
        <span className="font-medium flex-1">{message}</span>
        <button 
          onClick={onClose} 
          className="text-white/80 hover:text-white transition-colors duration-200 p-1 rounded-lg hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const processTypes = ['Wash and Dry', 'Purifying', 'Grinding', 'Extracting', 'Mixing', 'Packaging'];
const unitTypes = ['kg', 'g', 'lb', 'oz', 'L', 'mL', 'pieces', 'packets'];

const Inventory = () => {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [addFormData, setAddFormData] = useState({
    name: '',
    initialQuantity: 0,
    unit: '',
    lowStockThreshold: 0,
  });
  const [processData, setProcessData] = useState({
    materialId: '',
    processType: '',
    processedQuantity: 0,
  });
  const [editData, setEditData] = useState<RawMaterial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProcessForm, setShowProcessForm] = useState(false);
  const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Enhanced success handler
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
  };

  useEffect(() => {
    const fetchRawMaterials = async () => {
      try {
        const res = await api.get('/api/raw-materials');
        const materialsWithStatus = res.data.map((material: RawMaterial) => ({
          ...material,
          status: getMaterialStatus(material),
          lastUpdated: material.lastUpdated || new Date().toISOString()
        }));
        setRawMaterials(materialsWithStatus);
        setError(null);
      } catch (error: any) {
        console.error('Failed to fetch raw materials:', error.response?.data || error.message);
        setError('Failed to load raw materials. Please try again.');
      }
    };
    fetchRawMaterials();
  }, []);

  const getMaterialStatus = (material: RawMaterial): 'optimal' | 'low' | 'critical' => {
    const usagePercentage = (material.usableQuantity / material.lowStockThreshold) * 100;
    if (usagePercentage <= 25) return 'critical';
    if (usagePercentage <= 50) return 'low';
    return 'optimal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'low': return 'bg-yellow-500';
      case 'optimal': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'critical': return 'Critical';
      case 'low': return 'Low Stock';
      case 'optimal': return 'Optimal';
      default: return 'Unknown';
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!addFormData.name || addFormData.initialQuantity <= 0 || !addFormData.unit || addFormData.lowStockThreshold < 0) {
        setError('Please fill in all fields correctly.');
        return;
      }
      const res = await api.post('/api/raw-materials', {
        ...addFormData,
        processedQuantity: addFormData.initialQuantity,
        wastage: 0,
        usableQuantity: addFormData.initialQuantity,
        lastUpdated: new Date().toISOString()
      });
      
      const newMaterial = {
        ...res.data,
        status: getMaterialStatus(res.data)
      };
      
      setRawMaterials([...rawMaterials, newMaterial]);
      setAddFormData({ name: '', initialQuantity: 0, unit: '', lowStockThreshold: 0 });
      setShowAddForm(false);
      setError(null);
      showSuccessMessage('Raw material added successfully!');
    } catch (error: any) {
      console.error('Failed to add raw material:', error.response?.data || error.message);
      setError('Failed to add raw material: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!processData.materialId || !processData.processType || processData.processedQuantity <= 0) {
        setError('Please select a material, process type, and valid quantity.');
        return;
      }
      const res = await api.post('/api/raw-materials/process', {
        materialId: processData.materialId,
        processedQuantity: processData.processedQuantity,
        processType: processData.processType
      });
      
      const updatedMaterial = {
        ...res.data,
        status: getMaterialStatus(res.data)
      };
      
      setRawMaterials(rawMaterials.map((rm) => (rm._id === res.data._id ? updatedMaterial : rm)));
      setProcessData({ materialId: '', processType: '', processedQuantity: 0 });
      setShowProcessForm(false);
      setError(null);
      showSuccessMessage('Raw material processed successfully!');
    } catch (error: any) {
      console.error('Failed to process raw material:', error.response?.data || error.message);
      setError('Failed to process raw material: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;
    try {
      if (editData.initialQuantity < 0 || editData.processedQuantity < 0 || editData.wastage < 0) {
        setError('Quantities cannot be negative.');
        return;
      }
      const res = await api.put(`/api/raw-materials/${editData._id}`, {
        ...editData,
        usableQuantity: editData.processedQuantity,
        wastage: editData.initialQuantity - editData.processedQuantity,
        lastUpdated: new Date().toISOString()
      });
      
      const updatedMaterial = {
        ...res.data,
        status: getMaterialStatus(res.data)
      };
      
      setRawMaterials(rawMaterials.map((rm) => (rm._id === res.data._id ? updatedMaterial : rm)));
      setEditData(null);
      setError(null);
      showSuccessMessage('Raw material updated successfully!');
    } catch (error: any) {
      console.error('Failed to edit raw material:', error.response?.data || error.message);
      setError('Failed to edit raw material: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id: string) => {
    setMaterialToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!materialToDelete) return;
    
    try {
      await api.delete(`/api/raw-materials/${materialToDelete}`);
      setRawMaterials(rawMaterials.filter((rm) => rm._id !== materialToDelete));
      setError(null);
      showSuccessMessage('Raw material deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete raw material:', error.response?.data || error.message);
      setError('Failed to delete raw material: ' + (error.response?.data?.error || error.message));
    } finally {
      setShowDeleteModal(false);
      setMaterialToDelete(null);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editData) return;
    setEditData({
      ...editData,
      [e.target.name]: Number(e.target.value),
    });
  };

  // Enhanced filtering and sorting
  const filteredAndSortedMaterials = rawMaterials
    .filter(material => {
      const matchesSearch = material.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isLowStock = lowStockFilter ? material.status !== 'optimal' : true;
      return matchesSearch && isLowStock;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'quantity':
          aValue = a.usableQuantity;
          bValue = b.usableQuantity;
          break;
        case 'status':
          // Critical -> Low -> Optimal
          const statusOrder = { critical: 0, low: 1, optimal: 2 };
          aValue = statusOrder[a.status || 'optimal'];
          bValue = statusOrder[b.status || 'optimal'];
          break;
        case 'name':
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const toggleSort = (field: 'name' | 'quantity' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Calculate enhanced statistics
  const totalMaterials = rawMaterials.length;
  const lowStockCount = rawMaterials.filter(rm => rm.status === 'low').length;
  const criticalStockCount = rawMaterials.filter(rm => rm.status === 'critical').length;
  const totalWastage = rawMaterials.reduce((sum, rm) => sum + rm.wastage, 0);
  const totalUsable = rawMaterials.reduce((sum, rm) => sum + rm.usableQuantity, 0);
  const wastagePercentage = totalUsable > 0 ? (totalWastage / (totalUsable + totalWastage)) * 100 : 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      {/* Success Toast */}
      <SuccessToast 
        message={successMessage} 
        isVisible={showSuccessToast} 
        onClose={() => setShowSuccessToast(false)} 
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMaterialToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Raw Material"
        message="Are you sure you want to delete this raw material? This action cannot be undone."
        confirmText="Delete Material"
        type="danger"
      />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Enhanced Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div 
                className="p-4 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                style={{ backgroundColor: colors.primary }}
              >
                <Warehouse className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 
                  className="text-4xl font-bold transition-all duration-500"
                  style={{ 
                    color: colors.primary,
                    textShadow: '0 2px 4px rgba(15, 130, 140, 0.1)'
                  }}
                >
                  Inventory Management
                </h1>
                <p className="text-gray-600 mt-2">Manage raw materials and track stock levels with precision</p>
              </div>
            </div>
            
            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl hover:scale-105"
                style={{ borderLeft: `4px solid ${colors.primary}` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 font-medium">Total Materials</div>
                    <div className="text-2xl font-bold" style={{ color: colors.primary }}>{totalMaterials}</div>
                  </div>
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${colors.primary}15` }}
                  >
                    <Package className="h-5 w-5" style={{ color: colors.primary }} />
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl hover:scale-105"
                style={{ borderLeft: `4px solid ${colors.warning}` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 font-medium">Low Stock</div>
                    <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-orange-50">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl hover:scale-105"
                style={{ borderLeft: `4px solid ${colors.error}` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 font-medium">Critical</div>
                    <div className="text-2xl font-bold text-red-600">{criticalStockCount}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-red-50">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl hover:scale-105"
                style={{ borderLeft: `4px solid ${colors.success}` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 font-medium">Wastage</div>
                    <div className="text-2xl font-bold text-green-600">{totalWastage.toFixed(2)}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-green-50">
                    <Recycle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl flex items-center space-x-3 animate-fade-in shadow-lg">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Enhanced Action Bar */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8 p-6 animate-slide-down">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[300px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search materials by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                />
              </div>
              
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as 'name' | 'quantity' | 'status');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
              >
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="quantity-asc">Quantity Low-High</option>
                <option value="quantity-desc">Quantity High-Low</option>
                <option value="status-asc">Status Critical-First</option>
                <option value="status-desc">Status Optimal-First</option>
              </select>

              <button
                onClick={() => setLowStockFilter(!lowStockFilter)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                  lowStockFilter 
                    ? 'text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={lowStockFilter ? { backgroundColor: colors.warning } : {}}
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Low Stock Only</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl transition-all duration-200 transform hover:scale-105">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              
              <button 
                onClick={() => setShowProcessForm(!showProcessForm)}
                className="flex items-center space-x-2 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                style={{ backgroundColor: colors.accent }}
              >
                <TrendingUp className="h-5 w-5" />
                <span className="font-semibold">Process Material</span>
              </button>
              
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center space-x-2 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                style={{ backgroundColor: colors.primary }}
              >
                <Plus className="h-5 w-5" />
                <span className="font-semibold">Add Material</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Add Material Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8 overflow-hidden animate-slide-down">
            <div 
              className="p-6 transition-all duration-500"
              style={{ background: colors.gradient }}
            >
              <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                <Plus className="h-6 w-6" />
                <span>Add New Raw Material</span>
              </h2>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleAddSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Material Name</label>
                    <input
                      type="text"
                      value={addFormData.name}
                      onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      placeholder="Enter material name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Initial Quantity</label>
                    <input
                      type="number"
                      value={addFormData.initialQuantity}
                      onChange={(e) => setAddFormData({ ...addFormData, initialQuantity: Number(e.target.value) })}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      placeholder="0"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Unit</label>
                    <div className="relative">
                      <select
                        value={addFormData.unit}
                        onChange={(e) => setAddFormData({ ...addFormData, unit: e.target.value })}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-gray-50/50"
                        required
                      >
                        <option value="">Select Unit</option>
                        {unitTypes.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                      <Scale className="absolute right-4 top-4 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Low Stock Threshold</label>
                    <input
                      type="number"
                      value={addFormData.lowStockThreshold}
                      onChange={(e) => setAddFormData({ ...addFormData, lowStockThreshold: Number(e.target.value) })}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      placeholder="0"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium transform hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex items-center space-x-2 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    style={{ backgroundColor: colors.success }}
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Add Material</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enhanced Process Material Form */}
        {showProcessForm && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8 overflow-hidden animate-slide-down">
            <div 
              className="p-6 transition-all duration-500"
              style={{ background: colors.gradientHover }}
            >
              <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                <TrendingUp className="h-6 w-6" />
                <span>Process Raw Material</span>
              </h2>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleProcessSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Select Material</label>
                    <select
                      value={processData.materialId}
                      onChange={(e) => setProcessData({ ...processData, materialId: e.target.value })}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      required
                    >
                      <option value="">Select Material</option>
                      {rawMaterials.map((rm) => (
                        <option key={rm._id} value={rm._id}>
                          {rm.name} ({rm.usableQuantity} {rm.unit}) - {getStatusText(rm.status || 'optimal')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Process Type</label>
                    <select
                      value={processData.processType}
                      onChange={(e) => setProcessData({ ...processData, processType: e.target.value })}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      required
                    >
                      <option value="">Select Process</option>
                      {processTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Processed Quantity</label>
                    <input
                      type="number"
                      value={processData.processedQuantity}
                      onChange={(e) => setProcessData({ ...processData, processedQuantity: Number(e.target.value) })}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      placeholder="0"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowProcessForm(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium transform hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex items-center space-x-2 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <TrendingUp className="h-5 w-5" />
                    <span className="font-semibold">Process Material</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enhanced Materials Display */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-fade-in">
          <div 
            className="p-6 transition-all duration-500"
            style={{ background: colors.gradient }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                <Package className="h-6 w-6" />
                <span>Raw Materials Inventory</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  {filteredAndSortedMaterials.length} of {rawMaterials.length}
                </span>
              </h2>
              
              <div className="flex items-center space-x-2 text-white/80">
                <BarChart3 className="h-4 w-4" />
                <span>
                  {filteredAndSortedMaterials.length > 0 
                    ? `Showing ${filteredAndSortedMaterials.length} materials` 
                    : 'No materials found'
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredAndSortedMaterials.length === 0 ? (
              <div className="text-center py-12 animate-pulse">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {searchQuery || lowStockFilter ? 'No materials found' : 'No raw materials available'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery 
                    ? 'Try adjusting your search terms' 
                    : lowStockFilter 
                    ? 'No low stock items found' 
                    : 'Start by adding your first raw material'
                  }
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setLowStockFilter(false);
                    setShowAddForm(true);
                  }}
                  className="inline-flex items-center space-x-2 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add First Material</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Material</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Initial Qty</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Processed Qty</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Wastage</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Usable Qty</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Unit</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Threshold</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Last Updated</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedMaterials.map((rm, index) => {
                      const wastagePercentage = rm.initialQuantity > 0 ? (rm.wastage / rm.initialQuantity) * 100 : 0;
                      const isLowStock = rm.status !== 'optimal';
                      
                      return (
                        <tr 
                          key={rm._id} 
                          className={`border-b border-gray-100 hover:bg-blue-50/30 transition-all duration-150 group ${
                            isLowStock ? 'bg-red-50/50' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                              {rm.name}
                            </div>
                          </td>
                          
                          <td className="p-4">
                            {editData && editData._id === rm._id ? (
                              <input
                                type="number"
                                name="initialQuantity"
                                value={editData.initialQuantity}
                                onChange={handleEditChange}
                                className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                                min="0"
                                step="0.01"
                              />
                            ) : (
                              <div className="text-gray-600 font-medium">{rm.initialQuantity}</div>
                            )}
                          </td>
                          
                          <td className="p-4">
                            {editData && editData._id === rm._id ? (
                              <input
                                type="number"
                                name="processedQuantity"
                                value={editData.processedQuantity}
                                onChange={handleEditChange}
                                className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                                min="0"
                                step="0.01"
                              />
                            ) : (
                              <div className="text-gray-600 font-medium">{rm.processedQuantity}</div>
                            )}
                          </td>
                          
                          <td className="p-4">
                            {editData && editData._id === rm._id ? (
                              <input
                                type="number"
                                name="wastage"
                                value={editData.wastage}
                                onChange={handleEditChange}
                                className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                                min="0"
                                step="0.01"
                              />
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="text-red-600 font-medium">{rm.wastage.toFixed(2)}</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {wastagePercentage.toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </td>
                          
                          <td className="p-4">
                            <div className={`font-bold text-lg ${
                              rm.status === 'critical' ? 'text-red-600' :
                              rm.status === 'low' ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {rm.usableQuantity.toFixed(2)}
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-lg inline-block">
                              {rm.unit}
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="text-gray-600 font-medium">{rm.lowStockThreshold}</div>
                          </td>
                          
                          <td className="p-4">
                            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                              rm.status === 'critical' ? 'bg-red-100 text-red-800' :
                              rm.status === 'low' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                            }`}>
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(rm.status || 'optimal')}`} />
                              <span>{getStatusText(rm.status || 'optimal')}</span>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="text-sm text-gray-500">
                              {rm.lastUpdated ? formatDate(rm.lastUpdated) : 'N/A'}
                            </div>
                          </td>
                          
                          <td className="p-4">
                            {editData && editData._id === rm._id ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={handleEditSubmit}
                                  className="flex items-center space-x-1 text-white px-3 py-2 rounded-xl hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                                  style={{ backgroundColor: colors.success }}
                                >
                                  <Save className="h-3 w-3" />
                                  <span className="font-medium">Save</span>
                                </button>
                                <button
                                  onClick={() => setEditData(null)}
                                  className="flex items-center space-x-1 bg-gray-500 text-white px-3 py-2 rounded-xl hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span className="font-medium">Cancel</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditData(rm)}
                                  className="flex items-center space-x-1 text-white px-3 py-2 rounded-xl hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                                  style={{ backgroundColor: colors.primary }}
                                >
                                  <Edit className="h-3 w-3" />
                                  <span className="font-medium">Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(rm._id)}
                                  className="flex items-center space-x-1 bg-red-500 text-white px-3 py-2 rounded-xl hover:bg-red-600 transition-all duration-200 transform hover:scale-105"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span className="font-medium">Delete</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add CSS animations to global styles or use inline styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-down {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Inventory;