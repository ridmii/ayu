import { useEffect, useState } from 'react';
import api from '../api';
import { AxiosError } from 'axios';

interface Order {
  _id: string;
  customer: { name: string };
  totalAmount: number;
  pendingPayments: number;
  status: string;
}

const Analytics = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/api/orders');
        setOrders(res.data);
      } catch (error) {
        const axiosError = error as AxiosError;
        console.error('Failed to fetch orders:', {
          message: axiosError.message,
          response: axiosError.response?.data,
          status: axiosError.response?.status,
        });
        alert('Failed to fetch orders. Please check authentication.');
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-green-700">Analytics</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-green-700">Order Summary</h2>
        {orders.length === 0 ? (
          <p>No orders found.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 text-left">Customer</th>
                <th className="p-2 text-left">Total Amount</th>
                <th className="p-2 text-left">Pending Payments</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-b">
                  <td className="p-2">{order.customer.name}</td>
                  <td className="p-2">${order.totalAmount}</td>
                  <td className="p-2">${order.pendingPayments}</td>
                  <td className="p-2">{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Analytics;