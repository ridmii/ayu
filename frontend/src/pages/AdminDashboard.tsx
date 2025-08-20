const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">System Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold">Inventory</h2>
          <p>Manage raw materials and stock levels.</p>
          <a href="/inventory" className="text-green-500 hover:underline">Go to Inventory</a>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold">Orders</h2>
          <p>Create and view orders.</p>
          <a href="/orders" className="text-green-500 hover:underline">Go to Orders</a>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold">Analytics</h2>
          <p>View invoices and analytics.</p>
          <a href="/analytics" className="text-green-500 hover:underline">Go to Analytics</a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
