import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { BrowserMultiFormatReader } from '@zxing/library';
import { DecodeHintType } from '@zxing/library';
import * as XLSX from 'xlsx';
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
  Sparkles,
  AlertTriangle,
  PackageCheck,
  PackageX,
  Ruler,
  Menu,
  FileSpreadsheet
} from 'lucide-react';

// Interfaces
interface ProductVariant {
  _id?: string;
  size: string;
  price: number;
  stock: number;
  barcode: string;
}

interface Product {
  _id: string;
  category: string;
  productType: string;
  variants: ProductVariant[];
  description?: string;
  lowStockThreshold?: number;
  createdAt?: string;
  updatedAt?: string;
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

// Stock Status Badge Component
const StockStatusBadge = ({ stock, lowStockThreshold = 10 }: { stock: number; lowStockThreshold?: number }) => {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
        <PackageX className="h-3 w-3 mr-1" />
        Out of Stock
      </span>
    );
  }

  if (stock <= lowStockThreshold) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Low Stock
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
      <PackageCheck className="h-3 w-3 mr-1" />
      In Stock
    </span>
  );
};

// Barcode Scanner Component
const BarcodeScanner = ({ 
  isOpen, 
  onClose, 
  onScan
}: {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const codeReader = useRef(
    new BrowserMultiFormatReader(
      new Map([[DecodeHintType.TRY_HARDER, true]])
    )
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      codeReader.current.decodeFromVideoDevice(
        null,
        videoRef.current,
        (result, err) => {
          if (result) {
            const barcode = result.getText();
            console.log('Scanned barcode:', barcode);
            
            // Add haptic feedback simulation
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
            
            onScan(barcode);
            onClose();
          }
          
          if (err && !(err.name === 'NotFoundException' || err.name === 'ChecksumException')) {
            console.error('Scan error:', err);
          }
        }
      ).catch((error) => {
        console.error('Scanner start failed:', error);
      });
    }
    
    return () => {
      if (isOpen) {
        codeReader.current.reset();
      }
    };
  }, [isOpen, onScan, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl ${isMobile ? 'w-full max-w-full mx-4' : 'max-w-md w-full'} transform animate-scale-in border border-gray-200`}>
        <div 
          className="p-6 border-b border-gray-200 flex justify-between items-center"
          style={{ background: colors.gradient }}
        >
          <h3 className="text-xl font-bold text-white">
            Scan Barcode
          </h3>
          <button
            onClick={onClose}
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
            onClick={onClose}
            className="w-full bg-red-500 text-white py-4 rounded-xl hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <X className="h-4 w-4" />
            <span className="font-semibold">Stop Scanning</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const Products = ({ socket }: { socket?: any } = {}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanningForVariant, setScanningForVariant] = useState<{modal: 'add' | 'edit', index: number} | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form states
  const [addFormData, setAddFormData] = useState({
    category: '',
    productType: '',
    description: '',
    variants: [{ size: '', price: 0, stock: 0, barcode: '' }]
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef(
    new BrowserMultiFormatReader(
      new Map([[DecodeHintType.TRY_HARDER, true]])
    )
  );

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/api/products');
        const productsData: Product[] = res.data || [];
        setProducts(productsData);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(productsData.map((p: Product) => p.category).filter(Boolean))];
        setCategories(uniqueCategories);
        
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

  // Real-time product updates
  useEffect(() => {
    if (!socket) return;
    const onCreated = (product: Product) => setProducts(prev => [...prev, product]);
    const onUpdated = (product: Product) => setProducts(prev => prev.map(p => p._id === product._id ? product : p));
    const onDeleted = ({ _id }: { _id: string }) => setProducts(prev => prev.filter(p => p._id !== _id));

    socket.on('productCreated', onCreated);
    socket.on('productUpdated', onUpdated);
    socket.on('productDeleted', onDeleted);

    return () => {
      socket.off('productCreated', onCreated);
      socket.off('productUpdated', onUpdated);
      socket.off('productDeleted', onDeleted);
    };
  }, [socket]);

  // Enhanced success toast helper
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
  };

  // Handle barcode scan
  const handleBarcodeScan = (barcode: string) => {
    if (scanningForVariant) {
      if (scanningForVariant.modal === 'add') {
        // Update specific variant in add form
        updateVariantField(scanningForVariant.index, 'barcode', barcode);
      } else if (scanningForVariant.modal === 'edit' && editingProduct) {
        // Update specific variant in edit form
        updateEditVariant(scanningForVariant.index, 'barcode', barcode);
      }
      showSuccess('Barcode scanned successfully!');
    }
    setScanningForVariant(null);
  };

  // Add variant field
  const addVariantField = () => {
    setAddFormData({
      ...addFormData,
      variants: [...addFormData.variants, { size: '', price: 0, stock: 0, barcode: '' }]
    });
  };

  // Remove variant field
  const removeVariantField = (index: number) => {
    const newVariants = addFormData.variants.filter((_, i) => i !== index);
    setAddFormData({ ...addFormData, variants: newVariants });
  };

  // Update variant field
  const updateVariantField = (index: number, field: keyof ProductVariant, value: string | number) => {
    const newVariants = [...addFormData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setAddFormData({ ...addFormData, variants: newVariants });
  };

  // Handle add product
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Filter out empty variants
      const filteredVariants = addFormData.variants.filter(v => v.size.trim() !== '');
      
      if (filteredVariants.length === 0) {
        setError('At least one variant is required');
        return;
      }

      // Validate barcodes
      for (const variant of filteredVariants) {
        if (!variant.barcode || variant.barcode.trim() === '') {
          setError('Barcode is required for all variants');
          return;
        }
      }

      const res = await api.post('/api/products', {
        ...addFormData,
        variants: filteredVariants
      });
      
      setProducts([...products, res.data]);
      setAddFormData({
        category: '',
        productType: '',
        description: '',
        variants: [{ size: '', price: 0, stock: 0, barcode: '' }]
      });
      setShowAddModal(false);
      setError(null);
      showSuccess('Product added successfully!');
    } catch (error: any) {
      console.error('Failed to add product:', error.message);
      setError(error.response?.data?.error || 'Failed to add product');
    }
  };

  // Handle edit product
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    try {
      const res = await api.put(`/api/products/${editingProduct._id}`, editingProduct);
      setProducts(products.map(p => p._id === editingProduct._id ? res.data : p));
      setShowEditModal(false);
      setEditingProduct(null);
      setError(null);
      showSuccess('Product updated successfully!');
    } catch (error: any) {
      console.error('Failed to update product:', error.message);
      setError(error.response?.data?.error || 'Failed to update product');
    }
  };

  // Handle delete product
  const handleDelete = async (id: string) => {
    setProductToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    try {
      await api.delete(`/api/products/${productToDelete}`);
      setProducts(products.filter(p => p._id !== productToDelete));
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

  // Open edit modal
  const openEditModal = (product: Product) => {
    setEditingProduct(JSON.parse(JSON.stringify(product)));
    setShowEditModal(true);
  };

  // Update variant in edit mode
  const updateEditVariant = (variantIndex: number, field: keyof ProductVariant, value: string | number) => {
    if (!editingProduct) return;
    
    const newVariants = [...editingProduct.variants];
    newVariants[variantIndex] = { ...newVariants[variantIndex], [field]: value };
    setEditingProduct({ ...editingProduct, variants: newVariants });
  };

  // Add variant in edit mode
  const addEditVariant = () => {
    if (!editingProduct) return;
    
    setEditingProduct({
      ...editingProduct,
      variants: [...editingProduct.variants, { size: '', price: 0, stock: 0, barcode: '' }]
    });
  };

  // Remove variant in edit mode
  const removeEditVariant = (variantIndex: number) => {
    if (!editingProduct) return;
    
    const newVariants = editingProduct.variants.filter((_, i) => i !== variantIndex);
    setEditingProduct({ ...editingProduct, variants: newVariants });
  };

  // Quick stock update function
  const handleQuickStockUpdate = async (productId: string, variantIndex: number, newStock: number) => {
    try {
      const product = products.find(p => p._id === productId);
      if (!product) return;

      const updatedVariants = [...product.variants];
      updatedVariants[variantIndex] = {
        ...updatedVariants[variantIndex],
        stock: Math.max(0, newStock)
      };

      const res = await api.put(`/api/products/${productId}`, {
        ...product,
        variants: updatedVariants
      });
      
      setProducts(products.map(p => p._id === productId ? res.data : p));
      showSuccess(`Stock updated to ${Math.max(0, newStock)} units`);
    } catch (error: any) {
      setError('Failed to update stock. Please try again.');
    }
  };

  // Filter products
  const filteredProducts = (products || []).filter(product => {
    if (!product) return false;
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (product.productType?.toLowerCase() || '').includes(searchLower) ||
      (product.category?.toLowerCase() || '').includes(searchLower) ||
      (product.description?.toLowerCase() || '').includes(searchLower);
    
    return matchesCategory && matchesSearch;
  });

  // Group products by category for matrix view
  const productsByCategory = (filteredProducts || []).reduce((acc, product) => {
    if (!product || !product.category) return acc;
    
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Get all unique sizes across products for matrix headers
  const allSizes = [...new Set(
    (products || [])
      .flatMap(p => (p.variants || []).map(v => v.size))
      .filter(Boolean)
  )].sort();

  // Calculate stats safely
  const totalVariants = (products || []).reduce((sum, p) => sum + (p.variants?.length || 0), 0);
  const lowStockCount = (products || [])
    .flatMap(p => p.variants || [])
    .filter(v => v.stock > 0 && v.stock <= 10).length;
  const outOfStockCount = (products || [])
    .flatMap(p => p.variants || [])
    .filter(v => v.stock === 0).length;

  // Export to Excel
  const exportToExcel = () => {
    const data = (products || []).flatMap(product => 
      (product.variants || []).map(variant => ({
        'Category': product.category || 'N/A',
        'Product Type': product.productType || 'N/A',
        'Size': variant.size || 'N/A',
        'Price (LKR)': variant.price || 0,
        'Stock': variant.stock || 0,
        'Barcode': variant.barcode || 'N/A',
        'Description': product.description || 'N/A',
        'Stock Status': 
          variant.stock === 0 ? 'Out of Stock' :
          variant.stock <= 10 ? 'Low Stock' : 'In Stock'
      }))
    );
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, 'products_inventory.xlsx');
    showSuccess('Products exported to Excel successfully!');
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

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => {
          setShowScanner(false);
          setScanningForVariant(null);
        }}
        onScan={handleBarcodeScan}
      />

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className={`bg-white rounded-2xl shadow-2xl ${isMobile ? 'w-full max-w-full mx-4' : 'max-w-4xl w-full'} max-h-[90vh] overflow-y-auto transform animate-scale-in border border-gray-200`}>
            <div 
              className="p-6 rounded-t-2xl transition-all duration-500"
              style={{ background: colors.gradient }}
            >
              <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                <Plus className="h-6 w-6" />
                <span>Add New Product</span>
              </h2>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleAddSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Category *</label>
                    <input
                      type="text"
                      value={addFormData.category}
                      onChange={(e) => setAddFormData({ ...addFormData, category: e.target.value })}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      placeholder="e.g., Kalka, Head Oil"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Product Type *</label>
                    <input
                      type="text"
                      value={addFormData.productType}
                      onChange={(e) => setAddFormData({ ...addFormData, productType: e.target.value })}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      placeholder="e.g., දෙසදුන් කල්කය, නවරත්න කල්කය"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Description</label>
                  <input
                    type="text"
                    value={addFormData.description}
                    onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                    placeholder="Optional description"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-gray-700">Variants (Sizes & Prices) *</label>
                    <button
                      type="button"
                      onClick={addVariantField}
                      className="flex items-center space-x-2 text-white px-4 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Variant</span>
                    </button>
                  </div>

                  {addFormData.variants.map((variant, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50/30">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-600">Size *</label>
                        <input
                          type="text"
                          value={variant.size}
                          onChange={(e) => updateVariantField(index, 'size', e.target.value)}
                          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          placeholder="e.g., 1kg, 500g"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-600">Price (LKR) *</label>
                        <input
                          type="number"
                          value={variant.price}
                          onChange={(e) => updateVariantField(index, 'price', Number(e.target.value))}
                          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-600">Stock</label>
                        <input
                          type="number"
                          value={variant.stock}
                          onChange={(e) => updateVariantField(index, 'stock', Number(e.target.value))}
                          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          placeholder="0"
                          min="0"
                          step="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-600">Barcode *</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={variant.barcode}
                            onChange={(e) => updateVariantField(index, 'barcode', e.target.value)}
                            className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            placeholder="Required"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setScanningForVariant({ modal: 'add', index });
                              setShowScanner(true);
                            }}
                            className="flex items-center space-x-2 text-white p-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                            style={{ backgroundColor: colors.success }}
                          >
                            <Scan className="h-4 w-4" />
                          </button>
                          {addFormData.variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVariantField(index)}
                              className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-105"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
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

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className={`bg-white rounded-2xl shadow-2xl ${isMobile ? 'w-full max-w-full mx-4' : 'max-w-4xl w-full'} max-h-[90vh] overflow-y-auto transform animate-scale-in border border-gray-200`}>
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
                    <label className="block text-sm font-semibold text-gray-700">Category *</label>
                    <input
                      type="text"
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Product Type *</label>
                    <input
                      type="text"
                      value={editingProduct.productType}
                      onChange={(e) => setEditingProduct({ ...editingProduct, productType: e.target.value })}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Description</label>
                  <input
                    type="text"
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-gray-700">Variants (Sizes & Prices) *</label>
                    <button
                      type="button"
                      onClick={addEditVariant}
                      className="flex items-center space-x-2 text-white px-4 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Variant</span>
                    </button>
                  </div>

                  {editingProduct.variants.map((variant, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50/30">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-600">Size *</label>
                        <input
                          type="text"
                          value={variant.size}
                          onChange={(e) => updateEditVariant(index, 'size', e.target.value)}
                          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-600">Price (LKR) *</label>
                        <input
                          type="number"
                          value={variant.price}
                          onChange={(e) => updateEditVariant(index, 'price', Number(e.target.value))}
                          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-600">Stock</label>
                        <input
                          type="number"
                          value={variant.stock}
                          onChange={(e) => updateEditVariant(index, 'stock', Number(e.target.value))}
                          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          min="0"
                          step="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-600">Barcode *</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={variant.barcode || ''}
                            onChange={(e) => updateEditVariant(index, 'barcode', e.target.value)}
                            className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setScanningForVariant({ modal: 'edit', index });
                              setShowScanner(true);
                            }}
                            className="flex items-center space-x-2 text-white p-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                            style={{ backgroundColor: colors.success }}
                          >
                            <Scan className="h-4 w-4" />
                          </button>
                          {editingProduct.variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEditVariant(index)}
                              className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-105"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowEditModal(false)}
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

      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Mobile Header */}
        {isMobile && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl shadow-lg" style={{ backgroundColor: colors.primary }}>
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: colors.primary }}>
                    Product Management
                  </h1>
                  <p className="text-gray-600 text-xs">Manage your product catalog</p>
                </div>
              </div>
            </div>
            
            {/* Mobile Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 text-center">
                <div className="text-xs text-gray-600">Categories</div>
                <div className="text-lg font-bold" style={{ color: colors.primary }}>
                  {categories.length}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 text-center">
                <div className="text-xs text-gray-600">Products</div>
                <div className="text-lg font-bold" style={{ color: colors.primary }}>
                  {products.length}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 text-center">
                <div className="text-xs text-gray-600">Variants</div>
                <div className="text-lg font-bold" style={{ color: colors.accent }}>
                  {totalVariants}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 text-center">
                <div className="text-xs text-gray-600">Low Stock</div>
                <div className="text-lg font-bold text-orange-600">{lowStockCount}</div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
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
                  <p className="text-gray-600 mt-2">Manage products with multiple size variants</p>
                </div>
              </div>
              
              {/* Enhanced Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div 
                  className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl hover:scale-105"
                  style={{ borderLeft: `4px solid ${colors.primary}` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500 font-medium">Categories</div>
                      <div className="text-2xl font-bold" style={{ color: colors.primary }}>{categories.length}</div>
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
                  style={{ borderLeft: `4px solid ${colors.accent}` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500 font-medium">Products</div>
                      <div className="text-2xl font-bold" style={{ color: colors.accent }}>{products.length}</div>
                    </div>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.accent}15` }}>
                      <Layers className="h-5 w-5" style={{ color: colors.accent }} />
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
                      <div className="text-sm text-gray-500 font-medium">Out of Stock</div>
                      <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-red-50">
                      <PackageX className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error Display */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl flex items-center space-x-3 animate-fade-in shadow-lg">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Mobile Action Bar */}
        {isMobile ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                />
              </div>
              
              {/* Filters Row */}
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 text-sm"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('matrix')}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      viewMode === 'matrix' 
                        ? 'bg-white shadow-sm text-white' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    style={viewMode === 'matrix' ? { backgroundColor: colors.primary } : {}}
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
              </div>

              {/* Actions Row */}
              <div className="flex space-x-3">
                <button 
                  onClick={exportToExcel}
                  className="flex items-center space-x-2 text-white px-4 py-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex-1 justify-center"
                  style={{ backgroundColor: colors.success }}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="font-semibold text-sm">Export Excel</span>
                </button>
                
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center space-x-2 text-white px-4 py-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex-1 justify-center"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Plus className="h-4 w-4" />
                  <span className="font-semibold text-sm">Add Product</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Action Bar */
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8 p-6 animate-slide-down">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search products by name, category, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                  />
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('matrix')}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      viewMode === 'matrix' 
                        ? 'bg-white shadow-sm text-white' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    style={viewMode === 'matrix' ? { backgroundColor: colors.primary } : {}}
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
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Export Button for Desktop */}
                <button 
                  onClick={exportToExcel}
                  className="flex items-center space-x-2 text-white px-4 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  style={{ backgroundColor: colors.success }}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="font-semibold text-sm">Export Excel</span>
                </button>
                
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center space-x-2 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-semibold">Add Product</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products Display */}
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
                  {filteredProducts.length} products • {totalVariants} variants
                </span>
              </h2>
              
              <div className="flex items-center space-x-2 text-white/80">
                <BarChart3 className="h-4 w-4" />
                <span>
                  {viewMode === 'matrix' ? 'Matrix View' : 'List View'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 animate-pulse">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {searchQuery || selectedCategory !== 'all' ? 'No products found' : 'No products available'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || selectedCategory !== 'all' 
                    ? 'Try adjusting your search or filter terms' 
                    : 'Start by adding your first product'
                  }
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center space-x-2 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add First Product</span>
                </button>
              </div>
            ) : viewMode === 'matrix' ? (
              // Matrix View
              <div className="space-y-8">
                {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                  <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200">
                      <h3 className="text-xl font-bold text-gray-800">{category}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="p-4 text-left text-sm font-semibold text-gray-700 min-w-[200px]">
                              Product Type
                            </th>
                            {allSizes.map(size => (
                              <th key={size} className="p-4 text-center text-sm font-semibold text-gray-700 min-w-[120px]">
                                {size}
                              </th>
                            ))}
                            <th className="p-4 text-right text-sm font-semibold text-gray-700 min-w-[100px]">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryProducts.map((product) => (
                            <tr key={product._id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors duration-150">
                              <td className="p-4">
                                <div className="font-semibold text-gray-900">{product.productType}</div>
                                {product.description && (
                                  <div className="text-sm text-gray-600 mt-1">{product.description}</div>
                                )}
                              </td>
                              {allSizes.map(size => {
                                const variant = (product.variants || []).find(v => v.size === size);
                                return (
                                  <td key={size} className="p-4 text-center">
                                    {variant ? (
                                      <div className="space-y-2">
                                        <div className="font-bold text-green-600 text-lg">
                                          LKR {variant.price.toLocaleString()}
                                        </div>
                                        <div className="flex items-center justify-center space-x-2">
                                          <span className="text-sm text-gray-500">
                                            Stock: {variant.stock}
                                          </span>
                                          <div className="flex space-x-1">
                                            <button
                                              onClick={() => handleQuickStockUpdate(product._id, product.variants.indexOf(variant), variant.stock - 1)}
                                              disabled={variant.stock <= 0}
                                              className="w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded text-xs disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                              -
                                            </button>
                                            <button
                                              onClick={() => handleQuickStockUpdate(product._id, product.variants.indexOf(variant), variant.stock + 1)}
                                              className="w-5 h-5 flex items-center justify-center bg-green-500 text-white rounded text-xs"
                                            >
                                              +
                                            </button>
                                          </div>
                                        </div>
                                        <StockStatusBadge stock={variant.stock} />
                                        <div className="text-xs text-gray-400 font-mono">
                                          {variant.barcode}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-sm">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => openEditModal(product)}
                                    className="flex items-center space-x-1 text-white px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                                    style={{ backgroundColor: colors.primary }}
                                  >
                                    <Edit className="h-3 w-3" />
                                    <span className="text-sm">Edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(product._id)}
                                    className="flex items-center space-x-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-105"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span className="text-sm">Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // List View
              <div className="space-y-6">
                {filteredProducts.map((product) => (
                  <div key={product._id} className="border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 group hover:border-blue-300">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">{product.productType}</h3>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {product.category}
                          </span>
                        </div>
                        {product.description && (
                          <p className="text-gray-600 mb-4">{product.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="flex items-center space-x-2 text-white px-4 py-2 rounded-xl transition-all duration-200 transform hover:scale-105"
                          style={{ backgroundColor: colors.primary }}
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-all duration-200 transform hover:scale-105"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(product.variants || []).map((variant, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 hover:bg-white transition-all duration-200">
                          <div className="flex justify-between items-start mb-3">
                            <span className="font-semibold text-gray-900 text-lg">{variant.size}</span>
                            <StockStatusBadge stock={variant.stock} />
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                              <span className="text-sm text-gray-600 font-medium">Price</span>
                              <span className="font-bold text-green-600">LKR {variant.price.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-200">
                              <span className="text-sm text-gray-600 font-medium">Stock</span>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-blue-600">{variant.stock}</span>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleQuickStockUpdate(product._id, index, variant.stock - 1)}
                                    disabled={variant.stock <= 0}
                                    className="w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded text-xs disabled:bg-gray-300 disabled:cursor-not-allowed"
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={() => handleQuickStockUpdate(product._id, index, variant.stock + 1)}
                                    className="w-6 h-6 flex items-center justify-center bg-green-500 text-white rounded text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
                              <span className="text-sm text-gray-600 font-medium">Barcode</span>
                              <span className="font-mono text-sm text-gray-700 bg-white px-2 py-1 rounded border">
                                {variant.barcode}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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