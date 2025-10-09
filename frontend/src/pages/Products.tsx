import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { BrowserMultiFormatReader } from '@zxing/library';
import { DecodeHintType } from '@zxing/library';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Scan,
  Camera,
  X,
  Search,
  DollarSign,
  Barcode,
  CheckCircle,
  AlertCircle,
  Save,
  RotateCcw,
  Filter,
  Download,
  Upload,
  BarChart3,
  Grid,
  List,
  Check,
  Info,
  ShoppingCart,
  TrendingUp,
  Layers,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  productId: string;
  unitPrice: number;
  barcode: string;
  quantity?: number;  
  rawMaterials?: any[];  
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
    danger: <AlertCircle className="h-6 w-6 text-white" />,
    warning: <AlertCircle className="h-6 w-6 text-white" />,
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

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [addFormData, setAddFormData] = useState({
    name: '',
    productId: '',
    unitPrice: 0,
    barcode: '',
  });
  const [editData, setEditData] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<'add' | 'edit' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'id'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Enhanced states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    averagePrice: 0,
    lowStockItems: 0
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  
  const codeReader = useRef(
    new BrowserMultiFormatReader(
      new Map([[DecodeHintType.TRY_HARDER, true]])
    )
  );

  // Enhanced success toast helper
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/api/products');
        const productsData = res.data;
        setProducts(productsData);
        
        // Calculate enhanced stats
        const totalValue = productsData.reduce((sum: number, product: Product) => sum + product.unitPrice, 0);
        const averagePrice = productsData.length > 0 ? totalValue / productsData.length : 0;
        const lowStockItems = productsData.filter((product: Product) => (product.quantity || 0) <= 10).length;
        
        setStats({
          totalProducts: productsData.length,
          totalValue,
          averagePrice,
          lowStockItems
        });
        
        setError(null);
      } catch (error: any) {
        console.error('Failed to fetch products:', error.message);
        setError('Failed to load products. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Enhanced barcode scanning
  useEffect(() => {
    if (showScanner && videoRef.current) {
      codeReader.current.decodeFromVideoDevice(
        null,
        videoRef.current,
        async (result, err) => {
          if (result) {
            const barcode = result.getText();
            console.log('Scanned barcode:', barcode);
            
            // Add haptic feedback simulation
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
            
            if (scannerMode === 'add') {
              try {
                const res = await api.get(`/api/products/barcode/${barcode}`);
                const existingProduct = res.data;
                if (existingProduct) {
                  setError(`Product with barcode ${barcode} already exists.`);
                  setShowScanner(false);
                  codeReader.current.reset();
                  return;
                }
              } catch (error: any) {
                if (error.response?.status !== 404) {
                  console.error('Product lookup failed:', error.response?.data || error.message);
                  setError('Failed to check barcode. Please try again.');
                  setShowScanner(false);
                  codeReader.current.reset();
                  return;
                }
              }
              
              const newProduct = {
                name: `Product ${barcode}`,
                productId: `PID${barcode.slice(-6)}`,
                unitPrice: 1000,
                barcode,
              };
              
              if (!window.confirm(`Add product: ${newProduct.name} (ID: ${newProduct.productId}, LKR ${newProduct.unitPrice}, Barcode: ${barcode})?`)) {
                setShowScanner(false);
                codeReader.current.reset();
                return;
              }
              
              try {
                const res = await api.post('/api/products', newProduct);
                setProducts([...products, res.data]);
                setError(null);
                showSuccess('Product added successfully via barcode scan!');
              } catch (error: any) {
                console.error('Failed to auto-add product:', error.message);
                setError('Failed to add product. Please try again.');
              }
            } else if (scannerMode === 'edit' && editData) {
              setEditData({ ...editData, barcode });
              showSuccess('Barcode updated successfully!');
            }
            setShowScanner(false);
            codeReader.current.reset();
          }
          
          if (err && err.name !== 'NotFoundException' && err.name !== 'ChecksumException') {
            console.error('Real scan error:', err);
            setError('Scan failed—check lighting or barcode quality.');
          }
        }
      ).catch((error) => {
        console.error('Scanner start failed:', error);
        setError('Camera access denied. Check permissions and try again.');
      });
    }
    
    return () => {
      if (showScanner) {
        codeReader.current.reset();
      }
    };
  }, [showScanner, scannerMode, editData, products]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/products', addFormData);
      setProducts([...products, res.data]);
      setAddFormData({ name: '', productId: '', unitPrice: 0, barcode: '' });
      setShowAddForm(false);
      setError(null);
      showSuccess('Product added successfully!');
    } catch (error: any) {
      console.error('Failed to add product:', error.message);
      setError('Failed to add product. Please check your input.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;
    try {
      const res = await api.put(`/api/products/${editData._id}`, editData);
      setProducts(products.map((p) => (p._id === res.data._id ? res.data : p)));
      setEditData(null);
      setShowEditModal(false);
      setEditingProduct(null);
      setError(null);
      showSuccess('Product updated successfully!');
    } catch (error: any) {
      console.error('Failed to edit product:', error.message);
      setError('Failed to edit product. Please check your input.');
    }
  };

  const handleDelete = async (id: string) => {
    setProductToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    try {
      await api.delete(`/api/products/${productToDelete}`);
      setProducts(products.filter((p) => p._id !== productToDelete));
      setError(null);
      showSuccess('Product deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete product:', error.message);
      setError('Failed to delete product. Please try again.');
    } finally {
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editData) return;
    setEditData({
      ...editData,
      [e.target.name]: e.target.name === 'unitPrice' ? Number(e.target.value) : e.target.value,
    });
  };

  // Open edit modal for grid items
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditData(product);
    setShowEditModal(true);
  };

  // Enhanced filtering and sorting
  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.productId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode.includes(searchQuery);
      
      if (priceFilter === 'low') return matchesSearch && product.unitPrice < 500;
      if (priceFilter === 'medium') return matchesSearch && product.unitPrice >= 500 && product.unitPrice < 2000;
      if (priceFilter === 'high') return matchesSearch && product.unitPrice >= 2000;
      
      return matchesSearch;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = a.unitPrice;
          bValue = b.unitPrice;
          break;
        case 'id':
          aValue = a.productId;
          bValue = b.productId;
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

  const toggleSort = (field: 'name' | 'price' | 'id') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div 
            className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4"
            style={{ borderColor: colors.primary }}
          ></div>
          <p className="text-gray-600 font-medium">Loading products...</p>
        </div>
      </div>
    );
  }

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
          setProductToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete Product"
        type="danger"
      />

      {/* Enhanced Edit Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full transform animate-scale-in border border-gray-200">
            <div 
              className="p-6 rounded-t-2xl transition-all duration-500"
              style={{ background: colors.gradient }}
            >
              <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                <Edit className="h-6 w-6" />
                <span>Edit Product</span>
              </h2>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Product Name</label>
                    <input
                      type="text"
                      name="name"
                      value={editData?.name || ''}
                      onChange={handleEditChange}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Product ID</label>
                    <input
                      type="text"
                      name="productId"
                      value={editData?.productId || ''}
                      onChange={handleEditChange}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      placeholder="Enter product ID"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Unit Price (LKR)</span>
                    </label>
                    <input
                      type="number"
                      name="unitPrice"
                      value={editData?.unitPrice || 0}
                      onChange={handleEditChange}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-2">
                      <Barcode className="h-4 w-4" />
                      <span>Barcode</span>
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        name="barcode"
                        value={editData?.barcode || ''}
                        onChange={handleEditChange}
                        className="flex-1 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                        placeholder="Enter barcode"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setScannerMode('edit');
                          setShowScanner(true);
                          setShowEditModal(false);
                        }}
                        className="flex items-center space-x-2 text-white px-4 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Scan className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingProduct(null);
                      setEditData(null);
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium transform hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex items-center space-x-2 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    style={{ backgroundColor: colors.success }}
                  >
                    <Save className="h-5 w-5" />
                    <span className="font-semibold">Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 max-w-7xl mx-auto">
        {/* Enhanced Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div 
                className="p-4 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                style={{ backgroundColor: colors.primary }}
              >
                <Package className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 
                  className="text-4xl font-bold transition-all duration-500"
                  style={{ 
                    color: colors.primary,
                    textShadow: '0 2px 4px rgba(15, 130, 140, 0.1)'
                  }}
                >
                  Product Management
                </h1>
                <p className="text-gray-600 mt-2">Manage your product catalog with ease and precision</p>
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
                    <div className="text-sm text-gray-500 font-medium">Total Products</div>
                    <div className="text-2xl font-bold" style={{ color: colors.primary }}>{stats.totalProducts}</div>
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
                style={{ borderLeft: `4px solid ${colors.success}` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 font-medium">Total Value</div>
                    <div className="text-2xl font-bold text-green-600">LKR {stats.totalValue.toLocaleString()}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-green-50">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl hover:scale-105"
                style={{ borderLeft: `4px solid ${colors.warning}` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 font-medium">Avg. Price</div>
                    <div className="text-2xl font-bold text-orange-600">LKR {stats.averagePrice.toFixed(2)}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-orange-50">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl hover:scale-105"
                style={{ borderLeft: `4px solid ${colors.error}` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 font-medium">Low Stock</div>
                    <div className="text-2xl font-bold text-red-600">{stats.lowStockItems}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-red-50">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl flex items-center space-x-3 animate-fade-in shadow-lg">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
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
                  placeholder="Search products by name, ID, or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                />
              </div>
              
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
              >
                <option value="all">All Prices</option>
                <option value="low">Low (&lt; LKR 500)</option>
                <option value="medium">Medium (LKR 500-2000)</option>
                <option value="high">High (&gt; LKR 2000)</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as 'name' | 'price' | 'id');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
              >
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="price-asc">Price Low-High</option>
                <option value="price-desc">Price High-Low</option>
                <option value="id-asc">ID A-Z</option>
                <option value="id-desc">ID Z-A</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-white shadow-sm text-white' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={viewMode === 'grid' ? { backgroundColor: colors.primary } : {}}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-white shadow-sm text-white' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={viewMode === 'list' ? { backgroundColor: colors.primary } : {}}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              
              <button className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl transition-all duration-200 transform hover:scale-105">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center space-x-2 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                style={{ backgroundColor: colors.primary }}
              >
                <Plus className="h-5 w-5" />
                <span className="font-semibold">Add Product</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Add Product Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8 overflow-hidden animate-slide-down">
            <div 
              className="p-6 transition-all duration-500"
              style={{ background: colors.gradient }}
            >
              <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                <Plus className="h-6 w-6" />
                <span>Add New Product</span>
              </h2>
            </div>
            
            <div className="p-6">
              {/* Quick Scan Section */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setScannerMode('add');
                    setShowScanner(true);
                  }}
                  className="flex items-center space-x-3 text-white px-6 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl w-full justify-center group"
                  style={{ backgroundColor: colors.success }}
                >
                  <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <Scan className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Quick Scan & Add</div>
                    <div className="text-sm text-white/80">Automatically add products by scanning barcodes</div>
                  </div>
                </button>
              </div>

              {/* Manual Add Form */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Add Product Manually</span>
                </h3>
                
                <form onSubmit={handleAddSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Product Name</label>
                      <input
                        type="text"
                        name="name"
                        value={addFormData.name}
                        onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                        placeholder="Enter product name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Product ID</label>
                      <input
                        type="text"
                        name="productId"
                        value={addFormData.productId}
                        onChange={(e) => setAddFormData({ ...addFormData, productId: e.target.value })}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                        placeholder="Enter product ID"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-2">
                        <DollarSign className="h-4 w-4" />
                        <span>Unit Price (LKR)</span>
                      </label>
                      <input
                        type="number"
                        name="unitPrice"
                        value={addFormData.unitPrice}
                        onChange={(e) => setAddFormData({ ...addFormData, unitPrice: Number(e.target.value) })}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-2">
                        <Barcode className="h-4 w-4" />
                        <span>Barcode</span>
                      </label>
                      <input
                        type="text"
                        name="barcode"
                        value={addFormData.barcode}
                        onChange={(e) => setAddFormData({ ...addFormData, barcode: e.target.value })}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                        placeholder="Enter barcode"
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
                      <span className="font-semibold">Add Product</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Products Display */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-fade-in">
          <div 
            className="p-6 transition-all duration-500"
            style={{ background: colors.gradient }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                <Package className="h-6 w-6" />
                <span>Product Catalog</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  {filteredAndSortedProducts.length} of {products.length}
                </span>
              </h2>
              
              <div className="flex items-center space-x-2 text-white/80">
                <BarChart3 className="h-4 w-4" />
                <span>
                  {filteredAndSortedProducts.length > 0 
                    ? `Showing ${filteredAndSortedProducts.length} products` 
                    : 'No products found'
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredAndSortedProducts.length === 0 ? (
              <div className="text-center py-12 animate-pulse">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {searchQuery || priceFilter !== 'all' ? 'No products found' : 'No products available'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || priceFilter !== 'all' 
                    ? 'Try adjusting your search or filter terms' 
                    : 'Start by adding your first product'
                  }
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setPriceFilter('all');
                    setShowAddForm(true);
                  }}
                  className="inline-flex items-center space-x-2 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add First Product</span>
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              // Enhanced Grid View
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedProducts.map((product, index) => (
                  <div 
                    key={product._id} 
                    className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 group hover:border-blue-300 animate-fade-in relative overflow-hidden"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Background accent */}
                    <div 
                      className="absolute top-0 left-0 w-full h-1 transition-all duration-300 group-hover:h-2"
                      style={{ backgroundColor: colors.primary }}
                    />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2 text-lg">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-500 font-mono mt-1 bg-gray-50 px-2 py-1 rounded-lg inline-block">
                          {product.productId}
                        </p>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 text-white rounded-lg transition-all duration-200 transform hover:scale-110"
                          style={{ backgroundColor: colors.primary }}
                          title="Edit product"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-110"
                          title="Delete product"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                        <span className="text-sm text-gray-600 font-medium">Price</span>
                        <span className="font-bold text-green-600 text-lg">LKR {product.unitPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm text-gray-600 font-medium">Barcode</span>
                        <span className="font-mono text-sm text-gray-700 bg-white px-3 py-1 rounded-lg border">
                          {product.barcode}
                        </span>
                      </div>
                    </div>

                    {/* Expandable section for future enhancements */}
                    <button
                      onClick={() => setExpandedProduct(expandedProduct === product._id ? null : product._id)}
                      className="w-full mt-4 pt-4 border-t border-gray-100 flex items-center justify-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    >
                      <span className="text-sm font-medium">Details</span>
                      {expandedProduct === product._id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              // Enhanced Table View
              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Product Details</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Product ID</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Price</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Barcode</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedProducts.map((product, index) => (
                      <tr 
                        key={product._id} 
                        className="border-b border-gray-100 hover:bg-blue-50/30 transition-all duration-150 group animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <td className="p-4">
                          <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                            {product.name}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-gray-600 font-mono text-sm bg-gray-50 px-3 py-1 rounded-lg inline-block">
                            {product.productId}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-green-50 rounded-lg">
                              <DollarSign className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="font-bold text-gray-900">LKR {product.unitPrice.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <Barcode className="h-4 w-4 text-gray-600" />
                            </div>
                            <span className="font-mono text-gray-700 text-sm bg-white px-3 py-2 rounded-lg border">
                              {product.barcode}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openEditModal(product)}
                              className="flex items-center space-x-2 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                              style={{ backgroundColor: colors.primary }}
                            >
                              <Edit className="h-3 w-3" />
                              <span className="font-medium">Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(product._id)}
                              className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-all duration-200 transform hover:scale-105"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="font-medium">Delete</span>
                            </button>
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

        {/* Enhanced Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-scale-in border border-gray-200">
              <div 
                className="p-6 border-b border-gray-200 flex justify-between items-center"
                style={{ background: colors.gradient }}
              >
                <h3 className="text-xl font-bold text-white">
                  {scannerMode === 'add' ? 'Scan New Product' : 'Update Barcode'}
                </h3>
                <button
                  onClick={() => {
                    setShowScanner(false);
                    codeReader.current.reset();
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-150 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="relative">
                  <video 
                    ref={videoRef} 
                    className="w-full rounded-xl border-2 border-gray-200 shadow-inner"
                  />
                  <div className="absolute inset-0 border-2 border-green-500 rounded-xl m-2 pointer-events-none animate-pulse"></div>
                </div>
                <p className="text-sm text-gray-600 mt-4 text-center">
                  Point your camera at the barcode. Scanning will happen automatically.
                </p>
              </div>
              <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setShowScanner(false);
                    codeReader.current.reset();
                  }}
                  className="w-full bg-red-500 text-white py-4 rounded-xl hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span className="font-semibold">Stop Scanning</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced CSS Animations */}
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
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default Products;