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
  Scale
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
}

const processTypes = ['Wash and Dry', 'Purifying', 'Grinding', 'Extracting'];
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

  useEffect(() => {
    const fetchRawMaterials = async () => {
      try {
        const res = await api.get('/api/raw-materials');
        setRawMaterials(res.data);
        setError(null);
      } catch (error: any) {
        console.error('Failed to fetch raw materials:', error.response?.data || error.message);
        setError('Failed to load raw materials. Please try again.');
      }
    };
    fetchRawMaterials();
  }, []);

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
      });
      setRawMaterials([...rawMaterials, res.data]);
      setAddFormData({ name: '', initialQuantity: 0, unit: '', lowStockThreshold: 0 });
      setError(null);
      setSuccess('Raw material added successfully!');
      setTimeout(() => setSuccess(null), 3000);
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
      });
      setRawMaterials(rawMaterials.map((rm) => (rm._id === res.data._id ? res.data : rm)));
      setProcessData({ materialId: '', processType: '', processedQuantity: 0 });
      setError(null);
      setSuccess('Raw material processed successfully!');
      setTimeout(() => setSuccess(null), 3000);
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
      });
      setRawMaterials(rawMaterials.map((rm) => (rm._id === res.data._id ? res.data : rm)));
      setEditData(null);
      setError(null);
      setSuccess('Raw material updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Failed to edit raw material:', error.response?.data || error.message);
      setError('Failed to edit raw material: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this raw material?')) return;
    try {
      await api.delete(`/api/raw-materials/${id}`);
      setRawMaterials(rawMaterials.filter((rm) => rm._id !== id));
      setError(null);
      setSuccess('Raw material deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Failed to delete raw material:', error.response?.data || error.message);
      setError('Failed to delete raw material: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editData) return;
    setEditData({
      ...editData,
      [e.target.name]: Number(e.target.value),
    });
  };

  // Filter materials based on search and low stock
  const filteredMaterials = rawMaterials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isLowStock = lowStockFilter ? material.usableQuantity <= material.lowStockThreshold : true;
    return matchesSearch && isLowStock;
  });

  // Calculate statistics
  const totalMaterials = rawMaterials.length;
  const lowStockCount = rawMaterials.filter(rm => rm.usableQuantity <= rm.lowStockThreshold).length;
  const totalWastage = rawMaterials.reduce((sum, rm) => sum + rm.wastage, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-200">
                <Warehouse className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-800">Inventory Management</h1>
                <p className="text-slate-600 mt-2">Manage raw materials and track stock levels</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-2">
                <div className="text-sm text-slate-500">Total Materials</div>
                <div className="text-2xl font-bold text-slate-800">{totalMaterials}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-2">
                <div className="text-sm text-slate-500">Low Stock</div>
                <div className="text-2xl font-bold text-amber-600">{lowStockCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>{success}</span>
          </div>
        )}

        {/* Add Raw Material Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <Plus className="h-6 w-6" />
              <span>Add New Raw Material</span>
            </h2>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleAddSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Material Name</label>
                  <input
                    type="text"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter material name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Initial Quantity</label>
                  <input
                    type="number"
                    value={addFormData.initialQuantity}
                    onChange={(e) => setAddFormData({ ...addFormData, initialQuantity: Number(e.target.value) })}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Unit</label>
                  <div className="relative">
                    <select
                      value={addFormData.unit}
                      onChange={(e) => setAddFormData({ ...addFormData, unit: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none"
                      required
                    >
                      <option value="">Select Unit</option>
                      {unitTypes.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                    <Scale className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Low Stock Threshold</label>
                  <input
                    type="number"
                    value={addFormData.lowStockThreshold}
                    onChange={(e) => setAddFormData({ ...addFormData, lowStockThreshold: Number(e.target.value) })}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-center">
                <button 
                  type="submit" 
                  className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Add Raw Material</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Process Raw Material Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-violet-500 p-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <TrendingUp className="h-6 w-6" />
              <span>Process Raw Material</span>
            </h2>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleProcessSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Material</label>
                  <select
                    value={processData.materialId}
                    onChange={(e) => setProcessData({ ...processData, materialId: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="">Select Material</option>
                    {rawMaterials.map((rm) => (
                      <option key={rm._id} value={rm._id}>
                        {rm.name} ({rm.usableQuantity} {rm.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Process Type</label>
                  <select
                    value={processData.processType}
                    onChange={(e) => setProcessData({ ...processData, processType: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
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

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Processed Quantity</label>
                  <input
                    type="number"
                    value={processData.processedQuantity}
                    onChange={(e) => setProcessData({ ...processData, processedQuantity: Number(e.target.value) })}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-center">
                <button 
                  type="submit" 
                  className="flex items-center space-x-2 bg-violet-600 text-white px-6 py-3 rounded-xl hover:bg-violet-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-semibold">Process Material</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Raw Materials List Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                <Package className="h-6 w-6" />
                <span>Raw Materials Inventory</span>
                <span className="bg-white/20 px-2 py-1 rounded-full text-sm">
                  {rawMaterials.length}
                </span>
              </h2>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 w-full sm:w-64"
                  />
                </div>
                
                <button
                  onClick={() => setLowStockFilter(!lowStockFilter)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                    lowStockFilter 
                      ? 'bg-amber-500 text-white shadow-lg' 
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Low Stock Only</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredMaterials.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  {searchQuery || lowStockFilter ? 'No materials found' : 'No raw materials available'}
                </h3>
                <p className="text-slate-500">
                  {searchQuery ? 'Try adjusting your search terms' : 
                   lowStockFilter ? 'No low stock items found' : 'Start by adding your first raw material'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 text-left text-sm font-semibold text-slate-700">Material</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700">Initial Qty</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700">Processed Qty</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700">Wastage</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700">Usable Qty</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700">Unit</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700">Threshold</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700">Status</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterials.map((rm) => {
                      const isLowStock = rm.usableQuantity <= rm.lowStockThreshold;
                      const wastagePercentage = rm.initialQuantity > 0 ? (rm.wastage / rm.initialQuantity) * 100 : 0;
                      
                      return (
                        <tr key={rm._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150">
                          <td className="p-4">
                            <div className="font-medium text-slate-900">{rm.name}</div>
                          </td>
                          
                          <td className="p-4">
                            {editData && editData._id === rm._id ? (
                              <input
                                type="number"
                                name="initialQuantity"
                                value={editData.initialQuantity}
                                onChange={handleEditChange}
                                className="w-20 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                min="0"
                                step="0.01"
                              />
                            ) : (
                              <div className="text-slate-600">{rm.initialQuantity}</div>
                            )}
                          </td>
                          
                          <td className="p-4">
                            {editData && editData._id === rm._id ? (
                              <input
                                type="number"
                                name="processedQuantity"
                                value={editData.processedQuantity}
                                onChange={handleEditChange}
                                className="w-20 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                min="0"
                                step="0.01"
                              />
                            ) : (
                              <div className="text-slate-600">{rm.processedQuantity}</div>
                            )}
                          </td>
                          
                          <td className="p-4">
                            {editData && editData._id === rm._id ? (
                              <input
                                type="number"
                                name="wastage"
                                value={editData.wastage}
                                onChange={handleEditChange}
                                className="w-20 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                min="0"
                                step="0.01"
                              />
                            ) : (
                              <div className="flex items-center space-x-1">
                                <span className="text-red-600">{rm.wastage}</span>
                                <span className="text-xs text-slate-500">({wastagePercentage.toFixed(1)}%)</span>
                              </div>
                            )}
                          </td>
                          
                          <td className="p-4">
                            <div className={`font-semibold ${
                              isLowStock ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {rm.usableQuantity}
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="text-slate-600 font-medium">{rm.unit}</div>
                          </td>
                          
                          <td className="p-4">
                            <div className="text-slate-600">{rm.lowStockThreshold}</div>
                          </td>
                          
                          <td className="p-4">
                            {isLowStock ? (
                              <div className="flex items-center space-x-1 text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm font-medium">Low Stock</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1 text-emerald-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">In Stock</span>
                              </div>
                            )}
                          </td>
                          
                          <td className="p-4">
                            {editData && editData._id === rm._id ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={handleEditSubmit}
                                  className="flex items-center space-x-1 bg-emerald-500 text-white px-3 py-2 rounded-lg hover:bg-emerald-600 transition-colors duration-200"
                                >
                                  <Save className="h-3 w-3" />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={() => setEditData(null)}
                                  className="flex items-center space-x-1 bg-slate-500 text-white px-3 py-2 rounded-lg hover:bg-slate-600 transition-colors duration-200"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditData(rm)}
                                  className="flex items-center space-x-1 bg-amber-500 text-white px-3 py-2 rounded-lg hover:bg-amber-600 transition-colors duration-200"
                                >
                                  <Edit className="h-3 w-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(rm._id)}
                                  className="flex items-center space-x-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Delete</span>
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
    </div>
  );
};

export default Inventory;