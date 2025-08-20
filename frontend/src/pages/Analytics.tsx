import { useEffect, useState } from 'react';
import api from '../api';

interface Invoice {
  _id: string;
  order: { customer: { name: string } };
  total: number;
  paymentStatus: string;
}

const Analytics = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await api.get('/api/invoices/admin');
        console.log('Invoices:', res.data); // Debug
        setInvoices(res.data);
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
      }
    };
    fetchInvoices();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Invoices</h2>
        {invoices.length === 0 ? (
          <p>No invoices found.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 text-left">Invoice ID</th>
                <th className="p-2 text-left">Customer</th>
                <th className="p-2 text-left">Total</th>
                <th className="p-2 text-left">Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice._id} className="border-b">
                  <td className="p-2">{invoice._id}</td>
                  <td className="p-2">{invoice.order.customer.name}</td>
                  <td className="p-2">${invoice.total}</td>
                  <td className="p-2">{invoice.paymentStatus}</td>
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
