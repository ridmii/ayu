import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';

interface Order {
  _id: string;
  customer: { name: string };
  status: string;
}

const Packing = ({ socket }: { socket: Socket }) => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/api/orders/${orderId}`);
        console.log('Order:', res.data); // Debug
        setOrder(res.data);
      } catch (error) {
        console.error('Failed to fetch order:', error);
      }
    };
    fetchOrder();

    socket.on('packingUpdate', (data) => {
      if (data.orderId === orderId) {
        setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));
      }
    });

    return () => {
      socket.off('packingUpdate');
    };
  }, [socket, orderId]);

  const handleConfirm = async () => {
    try {
      await api.post('/api/packing/confirm', { orderId });
      socket.emit('packingConfirmed', orderId);
    } catch (error) {
      console.error('Failed to confirm packing:', error);
      alert('Failed to confirm packing');
    }
  };

  if (!order) return <div className="min-h-screen bg-gray-100 p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Packing Order</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Order Details</h2>
        <p>Order ID: {order._id}</p>
        <p>Customer: {order.customer.name}</p>
        <p>Status: {order.status}</p>
        <div className="my-4">
          <h3 className="text-lg font-medium">QR Code</h3>
          <QRCodeSVG value={`http://localhost:5173/packing/${order._id}`} />
        </div>
        {order.status === 'pending' && (
          <button
            onClick={handleConfirm}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Confirm Packing
          </button>
        )}
      </div>
    </div>
  );
};

export default Packing;
