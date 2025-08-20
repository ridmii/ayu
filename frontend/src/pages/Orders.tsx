import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import api from '../api';

interface Order {
  _id: string;
  customer: { name: string };
  items: { productId: { name: string }; quantity: number }[];
  personalizedItems: { name: string; quantity: number; price: number }[];
  status: string;
}

interface Product {
  _id: string;
  name: string;
}

interface Customer {
  _id: string;
  name: string;
}

const Orders = ({ socket }: { socket: Socket }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formData, setFormData] = useState({
    customerId: '',
    items: [{ productId: '', quantity: 0 }],
    personalizedItems: [{ name: '', quantity: 0, price: 0 }],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, productsRes, customersRes] = await Promise.all([
          api.get('/api/orders'),
          api.get('/api/products'),
          api.get('/api/customers'),
        ]);
        console.log('Orders:', ordersRes.data); // Debug
        setOrders(ordersRes.data);
        setProducts(productsRes.data);
        setCustomers(customersRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();

    socket.on('packingUpdate', (data) => {
      setOrders((prev) =>
        prev.map((order) =>
          order._id === data.orderId ? { ...order, status: data.status } : order,
        ),
      );
    });

    return () => {
      socket.off('packingUpdate');
    };
  }, [socket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/orders', formData);
      setOrders([...orders, res.data]);
      setFormData({
        customerId: '',
        items: [{ productId: '', quantity: 0 }],
        personalizedItems: [{ name: '', quantity: 0, price: 0 }],
      });
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to create order');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Order Management</h1>
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Create Order</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Customer</label>
            <select
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Standard Items</label>
            {formData.items.map((item, index) => (
              <div key={index} className="flex space-x-2">
                <select
                  value={item.productId}
                  onChange={(e) => {
                    const newItems = [...formData.items];
                    newItems[index].productId = e.target.value;
                    setFormData({ ...formData, items: newItems });
                  }}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Product</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const newItems = [...formData.items];
                    newItems[index].quantity = Number(e.target.value);
                    setFormData({ ...formData, items: newItems });
                  }}
                  className="w-20 p-2 border rounded"
                  placeholder="Qty"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium">Personalized Items</label>
            {formData.personalizedItems.map((item, index) => (
              <div key={index} className="flex space-x-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => {
                    const newItems = [...formData.personalizedItems];
                    newItems[index].name = e.target.value;
                    setFormData({ ...formData, personalizedItems: newItems });
                  }}
                  className="w-full p-2 border rounded"
                  placeholder="Item Name"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const newItems = [...formData.personalizedItems];
                    newItems[index].quantity = Number(e.target.value);
                    setFormData({ ...formData, personalizedItems: newItems });
                  }}
                  className="w-20 p-2 border rounded"
                  placeholder="Qty"
                />
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => {
                    const newItems = [...formData.personalizedItems];
                    newItems[index].price = Number(e.target.value);
                    setFormData({ ...formData, personalizedItems: newItems });
                  }}
                  className="w-20 p-2 border rounded"
                  placeholder="Price"
                />
              </div>
            ))}
          </div>
          <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            Create Order
          </button>
        </form>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Orders</h2>
        {orders.length === 0 ? (
          <p>No orders found.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 text-left">Customer</th>
                <th className="p-2 text-left">Items</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-b">
                  <td className="p-2">{order.customer.name}</td>
                  <td className="p-2">
                    {order.items.map((item, i) => (
                      <span key={i}>
                        {item.productId.name} (x{item.quantity})
                        {i < order.items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                    {order.personalizedItems.map((item, i) => (
                      <span key={i}>
                        {item.name} (x{item.quantity}, ${item.price})
                        {i < order.personalizedItems.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </td>
                  <td className="p-2">
                    {order.status}
                    {order.status === 'pending' && (
                      <a href={`/packing/${order._id}`} className="text-blue-500 hover:underline ml-2">
                        Pack
                      </a>
                    )}
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

export default Orders;
