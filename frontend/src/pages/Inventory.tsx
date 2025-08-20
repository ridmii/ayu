import { useEffect, useState } from 'react';
import api from '../api';

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

  useEffect(() => {
    const fetchRawMaterials = async () => {
      try {
        const res = await api.get('/api/raw-materials');
        console.log('Raw materials:', res.data); // Debug
        setRawMaterials(res.data);
      } catch (error) {
        console.error('Failed to fetch raw materials:', error);
        alert('Failed to fetch raw materials. Please check authentication.');
      }
    };
    fetchRawMaterials();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/raw-materials', {
        ...addFormData,
        processedQuantity: addFormData.initialQuantity,
        wastage: 0,
        usableQuantity: addFormData.initialQuantity,
      });
      setRawMaterials([...rawMaterials, res.data]);
      setAddFormData({ name: '', initialQuantity: 0, unit: '', lowStockThreshold: 0 });
    } catch (error) {
      console.error('Failed to add raw material:', error);
      alert('Failed to add raw material. Please check authentication.');
    }
  };

  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/raw-materials/process', {
        materialId: processData.materialId,
        processedQuantity: processData.processedQuantity,
      });
      setRawMaterials(rawMaterials.map((rm) => (rm._id === res.data._id ? res.data : rm)));
      setProcessData({ materialId: '', processType: '', processedQuantity: 0 });
    } catch (error) {
      console.error('Failed to process raw material:', error);
      alert('Failed to process raw material. Please check authentication.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;
    try {
      const res = await api.put(`/api/raw-materials/${editData._id}`, {
        ...editData,
        usableQuantity: editData.processedQuantity,
        wastage: editData.initialQuantity - editData.processedQuantity,
      });
      setRawMaterials(rawMaterials.map((rm) => (rm._id === res.data._id ? res.data : rm)));
      setEditData(null);
    } catch (error) {
      console.error('Failed to edit raw material:', error);
      alert('Failed to edit raw material. Please check authentication.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/raw-materials/${id}`);
      setRawMaterials(rawMaterials.filter((rm) => rm._id !== id));
    } catch (error) {
      console.error('Failed to delete raw material:', error);
      alert('Failed to delete raw material. Please check authentication.');
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editData) return;
    setEditData({
      ...editData,
      [e.target.name]: Number(e.target.value),
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Inventory Management</h1>
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Add Raw Material</h2>
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              type="text"
              value={addFormData.name}
              onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Initial Quantity</label>
            <input
              type="number"
              value={addFormData.initialQuantity}
              onChange={(e) => setAddFormData({ ...addFormData, initialQuantity: Number(e.target.value) })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Unit</label>
            <input
              type="text"
              value={addFormData.unit}
              onChange={(e) => setAddFormData({ ...addFormData, unit: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Reorder Threshold</label>
            <input
              type="number"
              value={addFormData.lowStockThreshold}
              onChange={(e) => setAddFormData({ ...addFormData, lowStockThreshold: Number(e.target.value) })}
              className="w-full p-2 border rounded"
            />
          </div>
          <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            Add Raw Material
          </button>
        </form>
      </div>
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Process Raw Material</h2>
        <form onSubmit={handleProcessSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Select Raw Material</label>
            <select
              value={processData.materialId}
              onChange={(e) => setProcessData({ ...processData, materialId: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Material</option>
              {rawMaterials.map((rm) => (
                <option key={rm._id} value={rm._id}>
                  {rm.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Process Type</label>
            <select
              value={processData.processType}
              onChange={(e) => setProcessData({ ...processData, processType: e.target.value })}
              className="w-full p-2 border rounded"
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
            <label className="block text-sm font-medium">After Process Amount</label>
            <input
              type="number"
              value={processData.processedQuantity}
              onChange={(e) => setProcessData({ ...processData, processedQuantity: Number(e.target.value) })}
              className="w-full p-2 border rounded"
            />
          </div>
          <button type="submit" className="bg-green-500 text-white p-2 rounded hover:bg-green-600">
            Process Raw Material
          </button>
        </form>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Raw Materials</h2>
        {rawMaterials.length === 0 ? (
          <p>No raw materials found.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Initial Quantity</th>
                <th className="p-2 text-left">Processed Quantity</th>
                <th className="p-2 text-left">Wastage</th>
                <th className="p-2 text-left">Usable Quantity</th>
                <th className="p-2 text-left">Unit</th>
                <th className="p-2 text-left">Threshold</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rawMaterials.map((rm) => (
                <tr key={rm._id} className="border-b">
                  <td className="p-2">{rm.name}</td>
                  <td className="p-2">
                    {editData && editData._id === rm._id ? (
                      <input
                        type="number"
                        name="initialQuantity"
                        value={editData.initialQuantity}
                        onChange={handleEditChange}
                        className="w-full p-1 border rounded"
                      />
                    ) : (
                      rm.initialQuantity
                    )}
                  </td>
                  <td className="p-2">
                    {editData && editData._id === rm._id ? (
                      <input
                        type="number"
                        name="processedQuantity"
                        value={editData.processedQuantity}
                        onChange={handleEditChange}
                        className="w-full p-1 border rounded"
                      />
                    ) : (
                      rm.processedQuantity
                    )}
                  </td>
                  <td className="p-2">
                    {editData && editData._id === rm._id ? (
                      <input
                        type="number"
                        name="wastage"
                        value={editData.wastage}
                        onChange={handleEditChange}
                        className="w-full p-1 border rounded"
                      />
                    ) : (
                      rm.wastage
                    )}
                  </td>
                  <td className="p-2">{rm.usableQuantity}</td>
                  <td className="p-2">{rm.unit}</td>
                  <td className="p-2">{rm.lowStockThreshold}</td>
                  <td className="p-2 flex space-x-2">
                    {editData && editData._id === rm._id ? (
                      <>
                        <button
                          onClick={handleEditSubmit}
                          className="bg-green-500 text-white p-1 rounded hover:bg-green-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditData(null)}
                          className="bg-gray-500 text-white p-1 rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditData(rm)}
                        className="bg-yellow-500 text-white p-1 rounded hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(rm._id)}
                      className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Inventory;
