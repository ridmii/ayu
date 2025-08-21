import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import api from '../api';
import jsPDF from 'jspdf';
import { useNavigate } from 'react-router-dom';

interface Order {
  _id: string;
  customer: { _id: string; name: string; email: string; phone: string; address: string; pendingPayments: number };
  items: { productName: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
  pendingPayments: number;
  barcode: string;
  status: string;
  personalized: boolean;
  paymentMethod: string;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  pendingPayments: number;
}

interface OrderItem {
  productName: string;
  quantity: string;
  unitPrice: string;
}

const Orders = ({ socket }: { socket: Socket }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    pendingPayments: 0,
  });
  const [orderFormData, setOrderFormData] = useState({
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    customerPendingPayments: 0,
    items: [{ productName: '', quantity: '', unitPrice: '' }],
    paymentMethod: 'Cash',
    personalized: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);

  // Fetch orders and customers
  const fetchOrders = async () => {
    try {
      const res = await api.get('/api/orders');
      console.log('Fetched orders:', res.data);
      setOrders(res.data);
      setError(null);
    } catch (error: any) {
      console.error('Failed to fetch orders:', error.response?.data || error.message);
      setError('Failed to load orders. Please try again.');
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/api/customers');
      console.log('Fetched customers:', res.data);
      setCustomers(res.data);
      setFilteredCustomers(res.data);
    } catch (error: any) {
      console.error('Failed to fetch customers:', error.response?.data || error.message);
      setError('Failed to load customers. Please try again.');
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();

    socket.on('orderCreated', () => fetchOrders());
    socket.on('orderUpdated', (updatedOrder: Order) => {
      setOrders((prev) => prev.map((order) => (order._id === updatedOrder._id ? updatedOrder : order)));
    });

    return () => {
      socket.off('orderCreated');
      socket.off('orderUpdated');
    };
  }, [socket]);

  // Customer search
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        const res = await api.get(`/api/customers/search?query=${query}`);
        console.log('Search results:', res.data);
        setFilteredCustomers(res.data);
      } catch (error: any) {
        console.error('Failed to search customers:', error.response?.data || error.message);
      }
    } else {
      setFilteredCustomers(customers);
    }
  };

  // Autofill customer details
  const handleCustomerSelect = (customer: Customer) => {
    console.log('Selected customer:', customer);
    setOrderFormData({
      ...orderFormData,
      customerId: customer._id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      customerPendingPayments: customer.pendingPayments,
    });
    setSearchQuery('');
    setFilteredCustomers([]);
  };

  // Add or edit customer
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Customer form submitted with data:', customerFormData);
    if (!customerFormData.name || !customerFormData.email || !customerFormData.phone || !customerFormData.address) {
      setError('Please fill in all required fields.');
      console.log('Validation failed: Required fields missing');
      return;
    }
    try {
      let res;
      if (isEditMode && editCustomerId) {
        res = await api.put(`/api/customers/${editCustomerId}`, {
          name: customerFormData.name,
          email: customerFormData.email,
          phone: customerFormData.phone,
          address: customerFormData.address,
          pendingPayments: Number(customerFormData.pendingPayments),
        });
        console.log('Customer update response:', res.data);
        setCustomers(customers.map((c) => (c._id === editCustomerId ? res.data : c)));
      } else {
        res = await api.post('/api/customers', {
          name: customerFormData.name,
          email: customerFormData.email,
          phone: customerFormData.phone,
          address: customerFormData.address,
          pendingPayments: Number(customerFormData.pendingPayments),
        });
        console.log('Customer creation response:', res.data);
        setCustomers([...customers, res.data]);
        setOrderFormData({
          ...orderFormData,
          customerId: res.data._id,
          customerName: res.data.name,
          customerEmail: res.data.email,
          customerPhone: res.data.phone,
          customerAddress: res.data.address,
          customerPendingPayments: res.data.pendingPayments,
        });
      }
      setCustomerFormData({ name: '', email: '', phone: '', address: '', pendingPayments: 0 });
      setShowCustomerModal(false);
      setIsEditMode(false);
      setEditCustomerId(null);
      setError(null);
      console.log(isEditMode ? 'Customer updated' : 'Customer created', 'form reset');
      fetchCustomers();
    } catch (error: any) {
      console.error('Failed to save customer:', error.response?.data || error.message);
      setError('Failed to save customer: ' + (error.response?.data?.error || error.message));
    }
  };

  // Edit customer
  const handleEditCustomer = (customer: Customer) => {
    setEditCustomerId(customer._id);
    setCustomerFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      pendingPayments: customer.pendingPayments,
    });
    setIsEditMode(true);
    setShowCustomerModal(true);
  };

  // Delete customer
  const handleDeleteCustomer = async (customerId: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await api.delete(`/api/customers/${customerId}`);
      console.log('Customer deleted:', customerId);
      setCustomers(customers.filter((c) => c._id !== customerId));
      setError(null);
      fetchCustomers();
    } catch (error: any) {
      console.error('Failed to delete customer:', error.response?.data || error.message);
      setError('Failed to delete customer: ' + (error.response?.data?.error || error.message));
    }
  };

  // Generate invoice for customer orders
  const generateCustomerInvoices = async (customerId: string) => {
    try {
      const res = await api.get(`/api/orders?customerId=${customerId}`);
      const customerOrders = res.data;
      console.log('Customer orders for invoice:', customerOrders);
      if (customerOrders.length === 0) {
        setError('No orders found for this customer.');
        return;
      }
      customerOrders.forEach((order: Order) => {
        const doc = new jsPDF();
        doc.text(`Invoice for Order ${order._id}`, 10, 10);
        doc.text(`Customer: ${order.customer.name}`, 10, 20);
        doc.text(`Email: ${order.customer.email}`, 10, 30);
        doc.text(`Phone: ${order.customer.phone}`, 10, 40);
        doc.text(`Address: ${order.customer.address}`, 10, 50);
        doc.text(`Payment Method: ${order.paymentMethod}`, 10, 60);
        doc.text(`Personalized: ${order.personalized ? 'Yes' : 'No'}`, 10, 70);
        doc.text('Items:', 10, 80);
        order.items.forEach((item, index) => {
          doc.text(
            `${item.productName}: ${item.quantity} x LKR ${item.unitPrice} = LKR ${item.quantity * item.unitPrice}`,
            10,
            90 + index * 10
          );
        });
        const y = 90 + order.items.length * 10;
        doc.text(`Current Total: LKR ${order.totalAmount}`, 10, y);
        doc.text(`Pending Payments: LKR ${order.pendingPayments}`, 10, y + 10);
        doc.text(`Grand Total: LKR ${order.totalAmount + order.pendingPayments}`, 10, y + 20);
        doc.text(`Barcode: ${order.barcode}`, 10, y + 30);
        doc.save(`invoice_${order._id}.pdf`);
      });
      alert(`Invoices generated for ${customerOrders.length} orders!`);
    } catch (error: any) {
      console.error('Failed to fetch customer orders:', error.response?.data || error.message);
      setError('Failed to generate invoices: ' + (error.response?.data?.error || error.message));
    }
  };

  // Add order item
  const addItem = () => {
    setOrderFormData({
      ...orderFormData,
      items: [...orderFormData.items, { productName: '', quantity: '', unitPrice: '' }],
    });
  };

  // Handle order submission
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Order form submitted with data:', orderFormData);
    try {
      const items = orderFormData.items.map((item) => ({
        productName: item.productName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      }));
      const res = await api.post('/api/orders', {
        customerId: orderFormData.customerId,
        items,
        personalized: orderFormData.personalized,
        paymentMethod: orderFormData.paymentMethod,
      });
      console.log('Order creation response:', res.data);
      setOrderFormData({
        customerId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        customerAddress: '',
        customerPendingPayments: 0,
        items: [{ productName: '', quantity: '', unitPrice: '' }],
        paymentMethod: 'Cash',
        personalized: false,
      });
      setLastCreatedOrder(res.data);
      fetchOrders();
      setError(null);
    } catch (error: any) {
      console.error('Failed to create order:', error.response?.data || error.message);
      setError('Failed to create order: ' + (error.response?.data?.error || error.message));
    }
  };

  // Generate invoice for order
  const generateInvoice = (order: Order) => {
    const doc = new jsPDF();
    doc.text(`Invoice for Order ${order._id}`, 10, 10);
    doc.text(`Customer: ${order.customer.name}`, 10, 20);
    doc.text(`Email: ${order.customer.email}`, 10, 30);
    doc.text(`Phone: ${order.customer.phone}`, 10, 40);
    doc.text(`Address: ${order.customer.address}`, 10, 50);
    doc.text(`Payment Method: ${order.paymentMethod}`, 10, 60);
    doc.text(`Personalized: ${order.personalized ? 'Yes' : 'No'}`, 10, 70);
    doc.text('Items:', 10, 80);
    order.items.forEach((item, index) => {
      doc.text(
        `${item.productName}: ${item.quantity} x LKR ${item.unitPrice} = LKR ${item.quantity * item.unitPrice}`,
        10,
        90 + index * 10
      );
    });
    const y = 90 + order.items.length * 10;
    doc.text(`Current Total: LKR ${order.totalAmount}`, 10, y);
    doc.text(`Pending Payments: LKR ${order.pendingPayments}`, 10, y + 10);
    doc.text(`Grand Total: LKR ${order.totalAmount + order.pendingPayments}`, 10, y + 20);
    doc.text(`Barcode: ${order.barcode}`, 10, y + 30);
    doc.save(`invoice_${order._id}.pdf`);
    alert(`Invoice generated! Barcode: ${order.barcode}`);
  };

  // Calculate total
  const currentTotal = orderFormData.items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0
  );
  const grandTotal = currentTotal + orderFormData.customerPendingPayments;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-green-700">Order Management</h1>
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold text-green-700 mb-4">Create Order</h2>
        <form onSubmit={handleOrderSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Search Customer</label>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search by name, email, or phone"
              className="w-full p-2 border rounded"
            />
            {searchQuery && filteredCustomers.length > 0 && (
              <ul className="border rounded mt-2 max-h-40 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <li
                    key={customer._id}
                    onClick={() => handleCustomerSelect(customer)}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {customer.name} ({customer.email}, {customer.phone})
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditMode(false);
              setCustomerFormData({ name: '', email: '', phone: '', address: '', pendingPayments: 0 });
              setShowCustomerModal(true);
            }}
            className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
          >
            Add New Customer
          </button>
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer Name</label>
            <input
              type="text"
              value={orderFormData.customerName}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer Email</label>
            <input
              type="email"
              value={orderFormData.customerEmail}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer Phone</label>
            <input
              type="text"
              value={orderFormData.customerPhone}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer Address</label>
            <input
              type="text"
              value={orderFormData.customerAddress}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Pending Payments (LKR)</label>
            <input
              type="number"
              value={orderFormData.customerPendingPayments}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={orderFormData.paymentMethod}
              onChange={(e) => setOrderFormData({ ...orderFormData, paymentMethod: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="Cash">Cash</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Personalized Product</label>
            <input
              type="checkbox"
              checked={orderFormData.personalized}
              onChange={(e) => setOrderFormData({ ...orderFormData, personalized: e.target.checked })}
              className="p-2"
            />
          </div>
          {orderFormData.items.map((item, index) => (
            <div key={index} className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Product Name</label>
                <input
                  type="text"
                  value={item.productName}
                  onChange={(e) => {
                    const newItems = [...orderFormData.items];
                    newItems[index].productName = e.target.value;
                    setOrderFormData({ ...orderFormData, items: newItems });
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const newItems = [...orderFormData.items];
                    newItems[index].quantity = e.target.value;
                    setOrderFormData({ ...orderFormData, items: newItems });
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Unit Price (LKR)</label>
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => {
                    const newItems = [...orderFormData.items];
                    newItems[index].unitPrice = e.target.value;
                    setOrderFormData({ ...orderFormData, items: newItems });
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          ))}
          <div>
            <button
              type="button"
              onClick={addItem}
              className="bg-green-500 text-white p-2 rounded hover:bg-green-600 mr-2"
            >
              Add Item
            </button>
            <button type="submit" className="bg-green-500 text-white p-2 rounded hover:bg-green-600">
              Create Order
            </button>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Current Total: LKR {currentTotal.toFixed(2)}</p>
            <p className="text-sm font-medium text-gray-700">
              Grand Total (with pending): LKR {grandTotal.toFixed(2)}
            </p>
          </div>
          {lastCreatedOrder && (
            <div className="mt-4">
              <p className="text-sm font-medium text-green-700">Order {lastCreatedOrder._id} created successfully!</p>
              <button
                onClick={() => generateInvoice(lastCreatedOrder)}
                className="bg-green-500 text-white p-2 rounded hover:bg-green-600 mt-2"
              >
                Generate Invoice for Order {lastCreatedOrder._id}
              </button>
            </div>
          )}
        </form>
      </div>

      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold text-green-700 mb-4">{isEditMode ? 'Edit Customer' : 'Add Customer'}</h3>
            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={customerFormData.name}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={customerFormData.email}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  value={customerFormData.phone}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Pending Payments (LKR)</label>
                <input
                  type="number"
                  value={customerFormData.pendingPayments}
                  onChange={(e) =>
                    setCustomerFormData({ ...customerFormData, pendingPayments: Number(e.target.value) })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="bg-green-500 text-white p-2 rounded hover:bg-green-600">
                  {isEditMode ? 'Update Customer' : 'Save Customer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerFormData({ name: '', email: '', phone: '', address: '', pendingPayments: 0 });
                    setShowCustomerModal(false);
                    setIsEditMode(false);
                    setEditCustomerId(null);
                  }}
                  className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold text-green-700 mb-4">Customers</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-left">Address</th>
              <th className="p-2 text-left">Pending (LKR)</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer._id} className="border-b">
                <td className="p-2">{customer.name}</td>
                <td className="p-2">{customer.email}</td>
                <td className="p-2">{customer.phone}</td>
                <td className="p-2">{customer.address}</td>
                <td className="p-2">LKR {customer.pendingPayments}</td>
                <td className="p-2 flex space-x-2">
                  <button
                    onClick={() => generateCustomerInvoices(customer._id)}
                    className="bg-blue-500 text-white p-1 rounded hover:bg-blue-600"
                  >
                    Invoices
                  </button>
                  <button
                    onClick={() => handleEditCustomer(customer)}
                    className="bg-yellow-500 text-white p-1 rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(customer._id)}
                    className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-green-700 mb-4">Orders</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Items</th>
              <th className="p-2 text-left">Total</th>
              <th className="p-2 text-left">Pending</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id} className="border-b">
                <td className="p-2">{order.customer.name}</td>
                <td className="p-2">
                  {order.items.map((item) => (
                    <div key={item.productName}>
                      {item.productName}: {item.quantity} x LKR {item.unitPrice}
                    </div>
                  ))}
                </td>
                <td className="p-2">LKR {order.totalAmount}</td>
                <td className="p-2">LKR {order.pendingPayments}</td>
                <td className="p-2">{order.status}</td>
                <td className="p-2">
                  <button
                    onClick={() => generateInvoice(order)}
                    className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                  >
                    Generate Invoice
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;