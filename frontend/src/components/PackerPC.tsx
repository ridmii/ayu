import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';

interface Item {
  productName: string;
  quantity: number;
  unit?: string | null;
  productId?: string;
}

const PackerPC: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return setError('Token is required');
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/packing/for-packer?token=${encodeURIComponent(token)}`);
      setAssignments(res.data.assignments || []);
    } catch (err: any) {
      console.error('Failed to fetch packer assignments:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  const markPacked = async (orderId: string) => {
    if (!token) return setError('Token missing');
    try {
      setLoading(true);
      await api.put(`/api/packing/${token}/${orderId}/packed`);
      // redirect to packing success page
      navigate('/packing-success');
    } catch (err: any) {
      console.error('Failed to mark packed:', err);
      setError(err.response?.data?.error || err.message || 'Failed to mark packed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Token missing</h2>
          <p className="text-sm text-gray-600">Open the packer link provided by your admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-2">Packer Interface (PC)</h1>
        <p className="text-sm text-gray-600 mb-4">Only packing-relevant details are shown.</p>

        {error && <div className="text-red-600 mb-4">{error}</div>}

        {loading && <div className="text-sm text-gray-600 mb-4">Loading...</div>}

        {!loading && assignments.length === 0 && (
          <div className="text-center text-gray-600">No assignments found or token expired.</div>
        )}

        {assignments.map((a) => (
          <div key={a._id} className="border rounded p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold">Order #{String(a.order?._id || '').slice(-6)}</div>
                <div className="text-sm text-gray-600">Customer: {a.order?.customer?.name || 'Unknown'}</div>
              </div>
              <div className="text-sm text-gray-500">Packer: {a.packer?.name || 'Assigned'}</div>
            </div>

            <div className="mb-3">
              <div className="font-medium text-sm mb-2">Items</div>
              <ul className="space-y-2">
                {(a.order?.items || []).map((it: Item, idx: number) => (
                  <li key={idx} className="flex justify-between bg-slate-50 p-2 rounded">
                    <div>
                      <div className="font-medium">{it.productName}</div>
                      <div className="text-xs text-gray-500">{it.unit ? String(it.unit) : ''}</div>
                    </div>
                    <div className="text-sm font-semibold">Qty: {it.quantity}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => markPacked(a.order?._id)}
                disabled={loading}
                className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
              >
                {loading ? 'Processing...' : 'Mark Packed'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PackerPC;
