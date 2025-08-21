import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-green-700">Ayurvedic System Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-green-700">Inventory</h2>
          <p>Manage raw materials and stock levels.</p>
          <button onClick={() => navigate('/inventory')} className="bg-green-500 text-white p-2 rounded hover:bg-green-600 mt-2">
            Go to Inventory
          </button>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-green-700">Orders</h2>
          <p>Create and view orders.</p>
          <button onClick={() => navigate('/orders')} className="bg-green-500 text-white p-2 rounded hover:bg-green-600 mt-2">
            Go to Orders
          </button>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-green-700">Packing</h2>
          <p>Assign packers and scan orders.</p>
          <button onClick={() => navigate('/packing')} className="bg-green-500 text-white p-2 rounded hover:bg-green-600 mt-2">
            Go to Packing
          </button>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-green-700">Analytics</h2>
          <p>View invoices and analytics.</p>
          <button onClick={() => navigate('/analytics')} className="bg-green-500 text-white p-2 rounded hover:bg-green-600 mt-2">
            Go to Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;