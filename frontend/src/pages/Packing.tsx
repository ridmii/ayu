import { useEffect, useState } from 'react';
import api from '../api';
import { AxiosError } from 'axios';
import { Socket } from 'socket.io-client';

interface Order {
  _id: string;
  customer: { name: string };
  items: { rawMaterial: { name: string; unit: string }; quantity: number; unitPrice: number }[];
  totalAmount: number;
  pendingPayments: number;
  barcode: string;
  status: string;
  packer?: string;
}

interface PackingProps {
  socket: Socket;
}

const packers = ['John Smith', 'Jane Doe', 'Mike Johnson'];

const Packing = ({ socket }: PackingProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [assignPacker, setAssignPacker] = useState<{ orderId: string; packer: string }>({ orderId: '', packer: '' });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/api/orders');
        console.log('Orders:', res.data);
        setOrders(res.data.filter((order: Order) => order.status === 'Pending' || order.status === 'Packed'));
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

    socket.on('orderCreated', (order: Order) => {
      if (order.status === 'Pending') {
        setOrders((prev) => [...prev, order]);
      }
    });

    socket.on('orderUpdated', (updatedOrder: Order) => {
      setOrders((prev) =>
        prev.map((order) => (order._id === updatedOrder._id ? updatedOrder : order)).filter((order) => order.status === 'Pending' || order.status === 'Packed')
      );
    });

    return () => {
      socket.off('orderCreated');
      socket.off('orderUpdated');
    };
  }, [socket]);

  const handleAssignPacker = async (orderId: string) => {
    if (!assignPacker.packer) {
      alert('Please select a packer.');
      return;
    }
    try {
      const res = await api.put(`/api/orders/${orderId}/status`, {
        status: 'Pending',
        packer: assignPacker.packer,
      });
      setOrders((prev) => prev.map((order) => (order._id === res.data._id ? res.data : order)));
      setAssignPacker({ orderId: '', packer: '' });
    } catch (error) {
      console.error('Failed to assign packer:', error);
      alert('Failed to assign packer.');
    }
  };

  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const order = orders.find((o) => o.barcode === barcodeInput);
      if (!order) {
        alert('Order not found.');
        return;
      }
      const res = await api.put(`/api/orders/${order._id}/status`, {
        status: 'Packed',
        packer: order.packer,
      });
      setOrders((prev) =>
        prev.map((o) => (o._id === res.data._id ? { ...o, status: 'Packed! Ready to deliver!' } : o))
      );
      setBarcodeInput('');
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-green-700">Packing Management</h1>
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4 text-green-700">Scan Barcode</h2>
        <form onSubmit={handleBarcodeScan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Barcode</label>
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter or scan barcode"
            />
          </div>
          <button type="submit" className="bg-green-500 text-white p-2 rounded hover:bg-green-600">
            Mark as Packed
          </button>
        </form>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-green-700">Pending Orders</h2>
        {orders.length === 0 ? (
          <p>No pending orders found.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 text-left">Customer</th>
                <th className="p-2 text-left">Items</th>
                <th className="p-2 text-left">Barcode</th>
                <th className="p-2 text-left">Packer</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-b">
                  <td className="p-2">{order.customer.name}</td>
                  <td className="p-2">
                    {order.items.map((item) => (
                      <div key={item.rawMaterial._id}>
                        {item.rawMaterial.name}: {item.quantity} {item.rawMaterial.unit}
                      </div>
                    ))}
                  </td>
                  <td className="p-2">{order.barcode}</td>
                  <td className="p-2">{order.packer || 'Not Assigned'}</td>
                  <td className="p-2">{order.status}</td>
                  <td className="p-2">
                    {!order.packer && (
                      <div className="flex space-x-2">
                        <select
                          value={assignPacker.orderId === order._id ? assignPacker.packer : ''}
                          onChange={(e) =>
                            setAssignPacker({ orderId: order._id, packer: e.target.value })
                          }
                          className="p-1 border rounded"
                        >
                          <option value="">Select Packer</option>
                          {packers.map((packer) => (
                            <option key={packer} value={packer}>
                              {packer}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssignPacker(order._id)}
                          className="bg-green-500 text-white p-1 rounded hover:bg-green-600"
                        >
                          Assign
                        </button>
                      </div>
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

export default Packing;