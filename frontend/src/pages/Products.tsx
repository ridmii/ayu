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
  RotateCcw
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
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Moved codeReader inside the component with proper initialization
  const codeReader = useRef(
    new BrowserMultiFormatReader(
      new Map([[DecodeHintType.TRY_HARDER, true]])
    )
  );

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/api/products');
        setProducts(res.data);
        setError(null);
      } catch (error: any) {
        console.error('Failed to fetch products:', error.message);
        setError('Failed to load products. Please try again.');
      }
    };
    fetchProducts();
  }, []);

  // Barcode scanning
  useEffect(() => {
    if (showScanner && videoRef.current) {
      codeReader.current.decodeFromVideoDevice(
        null,  // Default camera
        videoRef.current,
        async (result, err) => {
          if (result) {
            const barcode = result.getText();
            console.log('Scanned barcode:', barcode);
            if (scannerMode === 'add') {
              try {
                // Check if product exists
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
                // 404 = new barcode, proceed
              }
              // Auto-save new product
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
              } catch (error: any) {
                console.error('Failed to auto-add product:', error.message);
                setError('Failed to add product. Please try again.');
              }
            } else if (scannerMode === 'edit' && editData) {
              setEditData({ ...editData, barcode });
            }
            setShowScanner(false);
            codeReader.current.reset();
          }
          // Only log NON-NotFound errors (suppress scan misses)
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
      setError(null);
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
      setError(null);
    } catch (error: any) {
      console.error('Failed to edit product:', error.message);
      setError('Failed to edit product. Please check your input.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/api/products/${id}`);
      setProducts(products.filter((p) => p._id !== id));
      setError(null);
    } catch (error: any) {
      console.error('Failed to delete product:', error.message);
      setError('Failed to delete product. Please try again.');
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editData) return;
    setEditData({
      ...editData,
      [e.target.name]: e.target.name === 'unitPrice' ? Number(e.target.value) : e.target.value,
    });
  };

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.productId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar removed - handled by layout */}
      
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-3 rounded-2xl shadow-lg">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-800">Product Management</h1>
                <p className="text-gray-600 mt-2">Manage your product catalog efficiently</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2">
                <div className="text-sm text-gray-500">Total Products</div>
                <div className="text-2xl font-bold text-gray-800">{products.length}</div>
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

        {/* Add Product Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <Plus className="h-6 w-6" />
              <span>Add New Product</span>
            </h2>
          </div>
          
          <div className="p-6">
            {/* Scanner Section */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => {
                  setScannerMode('add');
                  setShowScanner(true);
                }}
                className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-3 rounded-xl hover:bg-blue-600 transition-colors duration-200 shadow-md hover:shadow-lg w-full justify-center"
              >
                <Scan className="h-5 w-5" />
                <span>Scan to Add Product Automatically</span>
              </button>
            </div>

            {showScanner && scannerMode === 'add' && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Scan Product Barcode</h3>
                    <button
                      onClick={() => {
                        setShowScanner(false);
                        codeReader.current.reset();
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-4">
                    <video ref={videoRef} className="w-full rounded-lg border border-gray-200" />
                    <p className="text-sm text-gray-600 mt-2 text-center">Point camera at barcode to scan</p>
                  </div>
                  <div className="p-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowScanner(false);
                        codeReader.current.reset();
                      }}
                      className="w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>Stop Scanning</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Add Form */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Add Product Manually</span>
              </h3>
              
              <form onSubmit={handleAddSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name</label>
                    <input
                      type="text"
                      name="name"
                      value={addFormData.name}
                      onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Product ID</label>
                    <input
                      type="text"
                      name="productId"
                      value={addFormData.productId}
                      onChange={(e) => setAddFormData({ ...addFormData, productId: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter product ID"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Unit Price (LKR)</span>
                    </label>
                    <input
                      type="number"
                      name="unitPrice"
                      value={addFormData.unitPrice}
                      onChange={(e) => setAddFormData({ ...addFormData, unitPrice: Number(e.target.value) })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                      <Barcode className="h-4 w-4" />
                      <span>Barcode</span>
                    </label>
                    <input
                      type="text"
                      name="barcode"
                      value={addFormData.barcode}
                      onChange={(e) => setAddFormData({ ...addFormData, barcode: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter barcode"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <button 
                    type="submit" 
                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Add Product</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Products List Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-500 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                <Package className="h-6 w-6" />
                <span>Product Catalog</span>
                <span className="bg-white/20 px-2 py-1 rounded-full text-sm">
                  {products.length}
                </span>
              </h2>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 w-full lg:w-64"
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {searchQuery ? 'No products found' : 'No products available'}
                </h3>
                <p className="text-gray-500">
                  {searchQuery ? 'Try adjusting your search terms' : 'Start by adding your first product'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                    {filteredProducts.map((product) => (
                      <tr key={product._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                        <td className="p-4">
                          {editData && editData._id === product._id ? (
                            <input
                              type="text"
                              name="name"
                              value={editData.name}
                              onChange={handleEditChange}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Product name"
                            />
                          ) : (
                            <div className="font-medium text-gray-900">{product.name}</div>
                          )}
                        </td>
                        <td className="p-4">
                          {editData && editData._id === product._id ? (
                            <input
                              type="text"
                              name="productId"
                              value={editData.productId}
                              onChange={handleEditChange}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Product ID"
                            />
                          ) : (
                            <div className="text-gray-600 font-mono">{product.productId}</div>
                          )}
                        </td>
                        <td className="p-4">
                          {editData && editData._id === product._id ? (
                            <input
                              type="number"
                              name="unitPrice"
                              value={editData.unitPrice}
                              onChange={handleEditChange}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="0.00"
                            />
                          ) : (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-semibold text-gray-900">LKR {product.unitPrice}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {editData && editData._id === product._id ? (
                            <div className="flex space-x-2">
                              <input
                                type="text"
                                name="barcode"
                                value={editData.barcode}
                                onChange={handleEditChange}
                                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="Barcode"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setScannerMode('edit');
                                  setShowScanner(true);
                                }}
                                className="flex items-center space-x-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                              >
                                <Scan className="h-3 w-3" />
                                <span>Scan</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Barcode className="h-4 w-4 text-gray-400" />
                              <span className="font-mono text-gray-600">{product.barcode}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {editData && editData._id === product._id ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={handleEditSubmit}
                                className="flex items-center space-x-1 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200"
                              >
                                <Save className="h-3 w-3" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={() => setEditData(null)}
                                className="flex items-center space-x-1 bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setEditData(product)}
                                className="flex items-center space-x-1 bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition-colors duration-200"
                              >
                                <Edit className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(product._id)}
                                className="flex items-center space-x-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Edit Scanner Modal */}
        {showScanner && scannerMode === 'edit' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Scan Barcode for Edit</h3>
                <button
                  onClick={() => {
                    setShowScanner(false);
                    codeReader.current.reset();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4">
                <video ref={videoRef} className="w-full rounded-lg border border-gray-200" />
                <p className="text-sm text-gray-600 mt-2 text-center">Point camera at barcode to update</p>
              </div>
              <div className="p-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowScanner(false);
                    codeReader.current.reset();
                  }}
                  className="w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Stop Scanning</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;