import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import api from '../api';
import jsPDF from 'jspdf';
import { BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';
import axios, { type AxiosResponse } from 'axios';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Send,
  Camera,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Package,
  ShoppingCart,
  Filter,
  Eye,
  EyeOff,
  Scan,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  MessageCircle,
  CreditCard,
  Truck,
  CheckSquare,
  PieChart
} from 'lucide-react';

// Interfaces
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
  quantity: number;
  unitPrice: number;
}

interface Order {
  _id: string;
  customer: Customer | null;
  items: OrderItem[];
  totalAmount: number;
  pendingPayments: number;
  barcode: string;
  status: string;
  personalized: boolean;
  paymentMethod: string;
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  productId: string;
  unitPrice: number;
  barcode: string;
  quantity?: number;
  rawMaterials?: any[];
}

interface OrderFormItem {
  productName: string;
  quantity: string;
  unitPrice: string;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  pendingPayments: number;
}

interface OrderFormData {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerPendingPayments: number;
  items: OrderFormItem[];
  paymentMethod: string;
  personalized: boolean;
}

interface LoadingState {
  orders: boolean;
  customers: boolean;
  products: boolean;
}

interface ConfirmationConfig {
  title: string;
  message: string;
  type: 'delete' | 'warning' | 'success' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

// Updated color palette with requested colors
const colors = {
  primary: '#053B50',     // Order Creation - Deep Teal
  secondary: '#176B87',   // Customers - Medium Teal
  accent: '#64CCC5',      // Order History - Light Teal
  success: '#10b981',     // Emerald
  warning: '#f59e0b',     // Amber
  error: '#ef4444',       // Red
  background: '#f8fafc',  // Light gray
  surface: '#ffffff',     // White
  text: {
    primary: '#1f2937',   // Gray-800
    secondary: '#6b7280', // Gray-500
    light: '#9ca3af'      // Gray-400
  }
};

const Orders = ({ socket }: { socket: Socket }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [showHiddenOrders, setShowHiddenOrders] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Enhanced state management
  const [activeTab, setActiveTab] = useState<'create' | 'customers' | 'orders'>('create');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    orders: false,
    customers: false,
    products: false
  });

  // Animation states
  const [tabTransition, setTabTransition] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  // Confirmation modal states
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationConfig, setConfirmationConfig] = useState<ConfirmationConfig>({
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  // Success message state
  const [successMessage, setSuccessMessage] = useState<{ title: string; message: string } | null>(null);

  // Product search states
  const [productSearchQuery, setProductSearchQuery] = useState<string[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<Product[][]>([]);

  const codeReader = useRef(
    new BrowserMultiFormatReader(
      new Map([[DecodeHintType.TRY_HARDER, true]])
    )
  );

  const [customerFormData, setCustomerFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    pendingPayments: 0,
  });

  const [orderFormData, setOrderFormData] = useState<OrderFormData>({
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

  const [showProductSuggestions, setShowProductSuggestions] = useState<boolean[]>([]);

  // Enhanced tab switching with smooth animation
  const handleTabChange = (tab: 'create' | 'customers' | 'orders') => {
    setTabTransition(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTimeout(() => setTabTransition(false), 300);
    }, 150);
  };

  // Enhanced success message with animations
  const showSuccessMessage = (title: string, message: string) => {
    setSuccessMessage({ title, message });
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Enhanced confirmation modal
  const showConfirmationModal = (
    title: string,
    message: string,
    type: 'delete' | 'warning' | 'success' | 'info',
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    setConfirmationConfig({
      title,
      message,
      type,
      onConfirm,
      onCancel
    });
    setShowConfirmation(true);
  };

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^0\d{9}$/;
    return phoneRegex.test(phone);
  };

  // Enhanced data fetching with loading states
  const fetchOrders = async () => {
    setLoading(prev => ({ ...prev, orders: true }));
    try {
      const response = await api.get('/api/orders');
      setOrders(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err.response?.data || err.message);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, orders: false }));
    }
  };

  const fetchCustomers = async () => {
    setLoading(prev => ({ ...prev, customers: true }));
    try {
      const response = await api.get('/api/customers');
      setCustomers(response.data);
      setFilteredCustomers(response.data);
    } catch (err: any) {
      console.error('Failed to fetch customers:', err.response?.data || err.message);
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, customers: false }));
    }
  };

  // Enhanced product fetching with better error handling
  const fetchProducts = async () => {
    setLoading(prev => ({ ...prev, products: true }));
    try {
      const response = await api.get('/api/products');
      // Ensure we have an array of products with required fields
      const productsData = response.data.map((product: Product) => ({
        ...product,
        name: product.name || '',
        productId: product.productId || product._id || '',
        unitPrice: product.unitPrice || 0,
        barcode: product.barcode || ''
      }));
      setProducts(productsData);
    } catch (err: any) {
      console.error('Failed to fetch products:', err.response?.data || err.message);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchProducts();

    if (socket) {
      socket.on('orderCreated', () => fetchOrders());
      socket.on('orderUpdated', (updatedOrder: Order) => {
        setOrders((prev) => prev.map((order) => (order._id === updatedOrder._id ? updatedOrder : order)));
      });

      return () => {
        socket.off('orderCreated');
        socket.off('orderUpdated');
      };
    }
  }, [socket]);

  // Initialize product search arrays when items change
  useEffect(() => {
    setProductSearchQuery(Array(orderFormData.items.length).fill(''));
    setProductSuggestions(Array(orderFormData.items.length).fill([]));
    setShowProductSuggestions(Array(orderFormData.items.length).fill(false));
  }, [orderFormData.items.length]);

  // Enhanced barcode scanning
  useEffect(() => {
    if (showScanner && videoRef.current) {
      codeReader.current.decodeFromVideoDevice(
        null,
        videoRef.current,
        async (result, err) => {
          if (result) {
            const barcode = result.getText();
            try {
              const response = await api.get(`/api/products/barcode/${barcode}`);
              const product = response.data;
              if (product && product.name && product.unitPrice) {
                setOrderFormData((prev) => ({
                  ...prev,
                  items: [...prev.items, { 
                    productName: product.name, 
                    quantity: '1', 
                    unitPrice: product.unitPrice.toString() 
                  }],
                }));
                setError(null);
                showSuccessMessage('Product Added', `${product.name} added to order successfully!`);
              } else {
                setError(`Product "${barcode}" not found. Please add it in Products page or enter manually.`);
              }
            } catch (err: any) {
              if (err.response?.status === 404) {
                setError(`Product "${barcode}" not found. Please add it in Products page or enter manually.`);
              } else {
                setError('Product lookup failed. Please try again.');
              }
            }
            setShowScanner(false);
            codeReader.current.reset();
          }
          if (err && !err.name.includes('NotFoundException') && err.name !== 'ChecksumException') {
            setError('Scan failed—check lighting or barcode quality.');
          }
        }
      ).catch((error) => {
        console.error('Scanner start failed:', error);
        setError('Camera access denied. Check permissions and try again.');
      });
    }
    return () => {
      if (showScanner) {
        codeReader.current.reset();
      }
    };
  }, [showScanner]);

  // Enhanced customer search with debouncing
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 1) {
      try {
        const response = await api.get(`/api/customers/search?query=${query}`);
        setFilteredCustomers(response.data);
      } catch (err: any) {
        console.error('Failed to search customers:', err.response?.data || err.message);
      }
    } else {
      setFilteredCustomers(customers);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
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

  // Enhanced product search handler
  const handleProductSearch = (index: number, query: string) => {
    const newSearchQueries = [...productSearchQuery];
    newSearchQueries[index] = query;
    setProductSearchQuery(newSearchQueries);

    const newItems = [...orderFormData.items];
    newItems[index].productName = query;
    setOrderFormData({ ...orderFormData, items: newItems });

    // Filter products based on search query
    if (query.length > 0) {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5); // Limit to 5 suggestions
      
      const newSuggestions = [...productSuggestions];
      newSuggestions[index] = filtered;
      setProductSuggestions(newSuggestions);
    } else {
      const newSuggestions = [...productSuggestions];
      newSuggestions[index] = [];
      setProductSuggestions(newSuggestions);
    }
  };

  // Enhanced product selection
  const handleProductSelect = (index: number, product: Product) => {
    const newItems = [...orderFormData.items];
    newItems[index] = {
      productName: product.name,
      quantity: newItems[index].quantity || '1',
      unitPrice: product.unitPrice.toString()
    };
    
    setOrderFormData({ ...orderFormData, items: newItems });
    
    // Clear suggestions for this index
    const newSearchQueries = [...productSearchQuery];
    newSearchQueries[index] = product.name;
    setProductSearchQuery(newSearchQueries);
    
    const newSuggestions = [...productSuggestions];
    newSuggestions[index] = [];
    setProductSuggestions(newSuggestions);

    const newShow = [...showProductSuggestions];
    newShow[index] = false;
    setShowProductSuggestions(newShow);
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerFormData.name || !customerFormData.email || !customerFormData.phone || !customerFormData.address) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!validateEmail(customerFormData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!validatePhone(customerFormData.phone)) {
      setError('Please enter a valid phone number (10 digits starting with 0).');
      return;
    }

    try {
      let response: AxiosResponse<any, any, {}>;
      if (isEditMode && editCustomerId) {
        response = await api.put(`/api/customers/${editCustomerId}`, customerFormData);
        setCustomers(customers.map((c) => (c._id === editCustomerId ? response.data : c)));
        showSuccessMessage('Customer Updated', `${customerFormData.name} has been updated successfully!`);
      } else {
        response = await api.post('/api/customers', customerFormData);
        setCustomers([...customers, response.data]);
        setOrderFormData({
          ...orderFormData,
          customerId: response.data._id,
          customerName: response.data.name,
          customerEmail: response.data.email,
          customerPhone: response.data.phone,
          customerAddress: response.data.address,
          customerPendingPayments: response.data.pendingPayments,
        });
        showSuccessMessage('Customer Created', `${customerFormData.name} has been created successfully!`);
      }
      setCustomerFormData({ name: '', email: '', phone: '', address: '', pendingPayments: 0 });
      setShowCustomerModal(false);
      setIsEditMode(false);
      setEditCustomerId(null);
      setError(null);
      fetchCustomers();
    } catch (err: any) {
      setError('Failed to save customer: ' + (err.response?.data?.error || err.message));
    }
  };

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

  const handleDeleteCustomer = async (customerId: string) => {
    const customer = customers.find(c => c._id === customerId);
    if (!customer) return;

    showConfirmationModal(
      'Delete Customer',
      `Are you sure you want to delete "${customer.name}"? This action cannot be undone.`,
      'delete',
      async () => {
        try {
          await api.delete(`/api/customers/${customerId}`);
          setCustomers(customers.filter((c) => c._id !== customerId));
          showSuccessMessage('Customer Deleted', `${customer.name} has been deleted successfully!`);
          fetchCustomers();
        } catch (err: any) {
          setError('Failed to delete customer: ' + (err.response?.data?.error || err.message));
        }
      }
    );
  };

  // Enhanced invoice generation
  const generateInvoicePDF = (order: Order) => {
    if (!order.customer) {
      setError(`Cannot generate invoice for order ${order._id}: No customer data`);
      return null;
    }
    
    const doc = new jsPDF();
    
    // Header with new color
    doc.setFillColor(5, 59, 80); // #053B50
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('INVOICE', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Order ID: ${order._id}`, 105, 30, { align: 'center' });
    
    // Customer Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Bill To:', 20, 60);
    doc.setFontSize(10);
    doc.text(order.customer.name, 20, 70);
    doc.text(order.customer.email, 20, 77);
    doc.text(order.customer.phone, 20, 84);
    doc.text(order.customer.address, 20, 91);
    
    // Order Details
    doc.setFontSize(12);
    doc.text('Order Details:', 20, 110);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 120);
    doc.text(`Payment Method: ${order.paymentMethod}`, 20, 127);
    doc.text(`Status: ${order.status}`, 20, 134);
    
    // Items Table
    doc.setFontSize(12);
    doc.text('Items', 20, 150);
    doc.text('Quantity', 120, 150);
    doc.text('Price', 160, 150);
    doc.text('Total', 190, 150);
    
    let yPos = 160;
    order.items.forEach((item, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(10);
      doc.text(item.productName, 20, yPos);
      doc.text(item.quantity.toString(), 120, yPos);
      doc.text(`LKR ${item.unitPrice}`, 160, yPos);
      doc.text(`LKR ${item.quantity * item.unitPrice}`, 190, yPos);
      yPos += 10;
    });
    
    // Totals
    yPos += 10;
    doc.setFontSize(12);
    doc.text('Subtotal:', 160, yPos);
    doc.text(`LKR ${order.totalAmount}`, 190, yPos);
    yPos += 10;
    doc.text('Pending Payments:', 160, yPos);
    doc.text(`LKR ${order.pendingPayments}`, 190, yPos);
    yPos += 10;
    doc.setFontSize(14);
    doc.setFillColor(100, 204, 197); // #64CCC5
    doc.rect(150, yPos, 50, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Grand Total:', 160, yPos + 10);
    doc.text(`LKR ${order.totalAmount + order.pendingPayments}`, 190, yPos + 10);
    
    return doc.output('blob');
  };

  const sendInvoiceViaWhatsApp = async (order: Order) => {
    if (!order.customer) {
      setError(`Cannot send invoice for order ${order._id}: No customer data`);
      return;
    }

    showConfirmationModal(
      'Send WhatsApp Invoice',
      `Send invoice for order ${order._id} to ${order.customer.name} via WhatsApp?`,
      'info',
      async () => {
        try {
          const pdfBlob = generateInvoicePDF(order);
          if (!pdfBlob) return;
          const formData = new FormData();
          formData.append('file', pdfBlob, `invoice_${order._id}.pdf`);
          const uploadResponse = await api.post('/api/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const mediaUrl = uploadResponse.data.url;

          const response = await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${import.meta.env.VITE_TWILIO_ACCOUNT_SID}/Messages.json`,
            new URLSearchParams({
              To: `whatsapp:${order.customer?.phone ?? ''}`,
              From: `whatsapp:${import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER}`,
              Body: `Invoice for Order ${order._id}`,
              MediaUrl: mediaUrl,
            }),
            {
              auth: {
                username: import.meta.env.VITE_TWILIO_ACCOUNT_SID,
                password: import.meta.env.VITE_TWILIO_AUTH_TOKEN,
              },
            }
          );

          showSuccessMessage('WhatsApp Sent', `Invoice for Order ${order._id} sent to ${order.customer.name} via WhatsApp!`);
        } catch (err: any) {
          setError('Failed to send WhatsApp invoice: ' + (err.response?.data?.error || err.message));
        }
      }
    );
  };

  const generateInvoice = (order: Order) => {
    const doc = generateInvoicePDF(order);
    if (!doc) return;
    const url = URL.createObjectURL(doc);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${order._id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccessMessage('Invoice Generated', `Invoice for order ${order._id} has been generated successfully!`);
  };

  const generateCustomerInvoices = async (customerId: string) => {
    const customer = customers.find(c => c._id === customerId);
    if (!customer) return;

    showConfirmationModal(
      'Generate All Invoices',
      `Generate invoices for all orders of ${customer.name}?`,
      'info',
      async () => {
        try {
          const response = await api.get(`/api/orders?customerId=${customerId}`);
          const customerOrders = response.data;
          if (customerOrders.length === 0) {
            setError('No orders found for this customer.');
            return;
          }
          customerOrders.forEach((order: Order) => {
            if (!order.customer) return;
            const doc = generateInvoicePDF(order);
            if (!doc) return;
            const url = URL.createObjectURL(doc);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice_${order._id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
          });
          showSuccessMessage('Invoices Generated', `${customerOrders.length} invoices generated for ${customer.name}!`);
        } catch (err: any) {
          setError('Failed to generate invoices: ' + (err.response?.data?.error || err.message));
        }
      }
    );
  };

  const addItem = () => {
    setOrderFormData({
      ...orderFormData,
      items: [...orderFormData.items, { productName: '', quantity: '', unitPrice: '' }],
    });
  };

  const removeItem = (index: number) => {
    if (orderFormData.items.length <= 1) {
      setError('Order must have at least one item.');
      return;
    }
    
    showConfirmationModal(
      'Remove Item',
      'Are you sure you want to remove this item from the order?',
      'warning',
      () => {
        setOrderFormData({
          ...orderFormData,
          items: orderFormData.items.filter((_, i) => i !== index),
        });
      }
    );
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderFormData.customerId) {
      setError('Please select a customer first.');
      return;
    }

    if (orderFormData.items.length === 0 || orderFormData.items.some(item => !item.productName || !item.quantity || !item.unitPrice)) {
      setError('Please add at least one valid order item.');
      return;
    }

    showConfirmationModal(
      'Create Order',
      `Create order for ${orderFormData.customerName} with ${orderFormData.items.length} items totaling LKR ${currentTotal.toFixed(2)}?`,
      'info',
      async () => {
        try {
          const items = orderFormData.items.map((item) => ({
            productName: item.productName,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          }));
          const response = await api.post('/api/orders', {
            customerId: orderFormData.customerId,
            items,
            personalized: orderFormData.personalized,
            paymentMethod: orderFormData.paymentMethod,
          });
          
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
          setLastCreatedOrder(response.data);
          fetchOrders();
          setError(null);
          showSuccessMessage('Order Created', `Order ${response.data._id} has been created successfully!`);
          handleTabChange('orders');
        } catch (err: any) {
          setError('Failed to create order: ' + (err.response?.data?.error || err.message));
        }
      }
    );
  };

  // Enhanced calculations
  const currentTotal = orderFormData.items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0
  );
  const grandTotal = currentTotal + orderFormData.customerPendingPayments;

  // Enhanced order statistics
  const orderStats = {
    total: orders.length,
    completed: orders.filter(o => o.status === 'completed').length,
    pending: orders.filter(o => o.status === 'pending').length,
    revenue: orders.reduce((sum, order) => sum + order.totalAmount, 0)
  };

  const getConfirmationIcon = () => {
    switch (confirmationConfig.type) {
      case 'delete':
        return <AlertTriangle className="h-12 w-12 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-12 w-12 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'info':
        return <AlertCircle className="h-12 w-12 text-blue-500" />;
      default:
        return <AlertCircle className="h-12 w-12 text-blue-500" />;
    }
  };

  const getConfirmButtonColor = () => {
    switch (confirmationConfig.type) {
      case 'delete':
        return 'bg-red-500 hover:bg-red-600';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'success':
        return 'bg-green-500 hover:bg-green-600';
      case 'info':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  const regularOrders = orders.filter((order) => !order.personalized);
  const personalizedOrders = orders.filter((order) => order.personalized);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Enhanced input focus styles using Tailwind
  const inputFocusStyle = "focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200";

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Enhanced Header Section */}
<div className="mb-8">
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-4">
      <div 
        className="p-3 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
        style={{ backgroundColor: colors.primary }}
      >
        <ShoppingCart className="h-8 w-8 text-white" />
      </div>
      <div>
        <h1 
          className="text-4xl font-bold transition-all duration-500"
          style={{ 
            color: colors.primary,
            textShadow: '0 2px 4px rgba(5, 59, 80, 0.1)'
          }}
        >
          Order Management
        </h1>
        <p className="mt-2 text-gray-600">Streamline your order processing and customer management</p>
      </div>
    </div>
    <div className="flex items-center space-x-3">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg">
        <div className="text-sm text-gray-600">Total Orders</div>
        <div className="text-2xl font-bold" style={{ color: colors.primary }}>{orderStats.total}</div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg">
        <div className="text-sm text-gray-600">Revenue</div>
        <div className="text-2xl font-bold text-green-600">LKR {orderStats.revenue.toLocaleString()}</div>
      </div>
    </div>
  </div>
</div>

        {/* Enhanced Navigation Tabs with Smooth Transitions */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2">
            <div className="flex space-x-2">
              <button
                onClick={() => handleTabChange('create')}
                onMouseEnter={() => setHoveredTab('create')}
                onMouseLeave={() => setHoveredTab(null)}
                className={`flex items-center space-x-2 px-6 py-4 rounded-xl transition-all duration-500 flex-1 justify-center relative overflow-hidden group ${
                  activeTab === 'create' 
                    ? 'text-white shadow-lg transform scale-105' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                style={{
                  background: activeTab === 'create' 
                    ? `linear-gradient(135deg, ${colors.primary}, #064e6a)`
                    : hoveredTab === 'create'
                    ? `linear-gradient(135deg, ${colors.primary}15, ${colors.primary}25)`
                    : 'transparent',
                  transform: activeTab === 'create' ? 'scale(1.05)' : hoveredTab === 'create' ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                {/* Animated background effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                <Plus className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
                <span className="font-semibold relative z-10 transition-all duration-300 group-hover:tracking-wide">Create Order</span>
                
                {/* Active indicator */}
                {activeTab === 'create' && (
                  <div 
                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-1 rounded-full transition-all duration-300"
                    style={{ backgroundColor: colors.accent }}
                  ></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('customers')}
                onMouseEnter={() => setHoveredTab('customers')}
                onMouseLeave={() => setHoveredTab(null)}
                className={`flex items-center space-x-2 px-6 py-4 rounded-xl transition-all duration-500 flex-1 justify-center relative overflow-hidden group ${
                  activeTab === 'customers' 
                    ? 'text-white shadow-lg transform scale-105' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                style={{
                  background: activeTab === 'customers' 
                    ? `linear-gradient(135deg, ${colors.secondary}, #1a7a9a)`
                    : hoveredTab === 'customers'
                    ? `linear-gradient(135deg, ${colors.secondary}15, ${colors.secondary}25)`
                    : 'transparent',
                  transform: activeTab === 'customers' ? 'scale(1.05)' : hoveredTab === 'customers' ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                {/* Animated background effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                <User className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
                <span className="font-semibold relative z-10 transition-all duration-300 group-hover:tracking-wide">Customers</span>
                
                {/* Active indicator */}
                {activeTab === 'customers' && (
                  <div 
                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-1 rounded-full transition-all duration-300"
                    style={{ backgroundColor: colors.accent }}
                  ></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('orders')}
                onMouseEnter={() => setHoveredTab('orders')}
                onMouseLeave={() => setHoveredTab(null)}
                className={`flex items-center space-x-2 px-6 py-4 rounded-xl transition-all duration-500 flex-1 justify-center relative overflow-hidden group ${
                  activeTab === 'orders' 
                    ? 'text-white shadow-lg transform scale-105' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                style={{
                  background: activeTab === 'orders' 
                    ? `linear-gradient(135deg, ${colors.accent}, #7ae0d8)`
                    : hoveredTab === 'orders'
                    ? `linear-gradient(135deg, ${colors.accent}15, ${colors.accent}25)`
                    : 'transparent',
                  transform: activeTab === 'orders' ? 'scale(1.05)' : hoveredTab === 'orders' ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                {/* Animated background effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                <Package className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
                <span className="font-semibold relative z-10 transition-all duration-300 group-hover:tracking-wide">Order History</span>
                
                {/* Active indicator */}
                {activeTab === 'orders' && (
                  <div 
                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-1 rounded-full transition-all duration-300"
                    style={{ backgroundColor: colors.primary }}
                  ></div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-2xl flex items-center space-x-3 animate-fade-in">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Action Required</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Enhanced Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-2xl animate-slide-down">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900">{successMessage.title}</p>
                <p className="text-green-700 text-sm mt-1">{successMessage.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content with Smooth Transitions */}
        <div className={`transition-all duration-500 ease-in-out ${tabTransition ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {activeTab === 'create' && (
            <div className="space-y-8 animate-fade-in">
              {/* Create Order Card */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <div 
                  className="p-6 transition-all duration-500"
                  style={{ backgroundColor: colors.primary }}
                >
                  <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                    <Plus className="h-6 w-6" />
                    <span>Create New Order</span>
                  </h2>
                </div>
                
                <div className="p-6">
                  <form onSubmit={handleOrderSubmit} className="space-y-8">
                    {/* Customer Selection */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold mb-3 text-gray-700">
                            Search Customer
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={handleSearch}
                              placeholder="Search by name, email, or phone..."
                              className={`w-full p-4 pl-12 border border-gray-300 rounded-xl bg-gray-50 ${inputFocusStyle}`}
                            />
                            <Search className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                          </div>
                          {searchQuery && filteredCustomers.length > 0 && (
                            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-scale-in">
                              {filteredCustomers.map((customer) => (
                                <div
                                  key={customer._id}
                                  onClick={() => handleCustomerSelect(customer)}
                                  className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-all duration-200 hover:translate-x-1"
                                >
                                  <div className="font-medium text-gray-900">{customer.name}</div>
                                  <div className="text-sm text-gray-600 flex items-center space-x-3 mt-1">
                                    <Mail className="h-3 w-3" />
                                    <span>{customer.email}</span>
                                    <Phone className="h-3 w-3" />
                                    <span>{customer.phone}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsEditMode(false);
                            setCustomerFormData({ name: '', email: '', phone: '', address: '', pendingPayments: 0 });
                            setShowCustomerModal(true);
                          }}
                          className="flex items-center space-x-3 text-white px-6 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl w-full justify-center transform hover:scale-105"
                          style={{ backgroundColor: colors.secondary }}
                        >
                          <User className="h-5 w-5" />
                          <span className="font-semibold">Add New Customer</span>
                        </button>
                      </div>

                      {/* Customer Details Card */}
                      <div 
                        className="rounded-2xl p-6 border transition-all duration-300 hover:shadow-lg"
                        style={{ 
                          backgroundColor: `${colors.primary}08`,
                          borderColor: `${colors.primary}30`
                        }}
                      >
                        <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                          <User className="h-5 w-5" style={{ color: colors.primary }} />
                          <span className="text-gray-800">Customer Information</span>
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 transition-all duration-300 hover:shadow-md">
                            <span className="font-medium text-gray-600">Name:</span>
                            <span className="font-semibold text-gray-900">{orderFormData.customerName || 'Not selected'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 transition-all duration-300 hover:shadow-md">
                            <span className="font-medium text-gray-600">Email:</span>
                            <span className="text-gray-900">{orderFormData.customerEmail || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 transition-all duration-300 hover:shadow-md">
                            <span className="font-medium text-gray-600">Phone:</span>
                            <span className="text-gray-900">{orderFormData.customerPhone || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 transition-all duration-300 hover:shadow-md">
                            <span className="font-medium text-gray-600">Pending Balance:</span>
                            <span className="font-semibold text-orange-600">LKR {orderFormData.customerPendingPayments}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-semibold mb-3 text-gray-700">
                          Payment Method
                        </label>
                        <div className="relative">
                          <select
                            value={orderFormData.paymentMethod}
                            onChange={(e) => setOrderFormData({ ...orderFormData, paymentMethod: e.target.value })}
                            className={`w-full p-4 border border-gray-300 rounded-xl bg-gray-50 appearance-none ${inputFocusStyle}`}
                          >
                            <option value="Cash">Cash</option>
                            <option value="Debit Card">Debit Card</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Other">Other</option>
                          </select>
                          <CreditCard className="absolute right-4 top-4 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-md">
                        <input
                          type="checkbox"
                          checked={orderFormData.personalized}
                          onChange={(e) => setOrderFormData({ ...orderFormData, personalized: e.target.checked })}
                          className="w-5 h-5 rounded focus:ring-2 focus:ring-blue-500 text-blue-600 transition-all duration-300"
                          style={{ color: colors.primary }}
                        />
                        <label className="text-sm font-semibold text-gray-700">
                          Personalized Product
                        </label>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => setShowScanner(true)}
                          className="flex items-center space-x-3 w-full text-white px-6 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl justify-center transform hover:scale-105"
                          style={{ backgroundColor: colors.accent }}
                        >
                          <Scan className="h-5 w-5" />
                          <span className="font-semibold">Scan Product</span>
                        </button>
                      </div>
                    </div>

                    {/* Order Items Section */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center space-x-3 text-gray-800">
                          <Package className="h-5 w-5" />
                          <span>Order Items</span>
                          <span 
                            className="px-3 py-1 rounded-full text-sm font-medium transition-all duration-300"
                            style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
                          >
                            {orderFormData.items.length} items
                          </span>
                        </h3>
                        <button
                          type="button"
                          onClick={addItem}
                          className="flex items-center space-x-2 text-white px-4 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                          style={{ backgroundColor: colors.success }}
                        >
                          <Plus className="h-4 w-4" />
                          <span className="font-semibold">Add Item</span>
                        </button>
                      </div>

                      {orderFormData.items.map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                            <div className="lg:col-span-5 relative">
                              <label className="block text-sm font-medium mb-2 text-gray-700">
                                Product Name *
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={item.productName}
                                  onChange={(e) => handleProductSearch(index, e.target.value)}
                                  onFocus={() => {
                                    const newShow = [...showProductSuggestions];
                                    newShow[index] = true;
                                    setShowProductSuggestions(newShow);
                                  }}
                                  className={`w-full p-3 border border-gray-300 rounded-xl ${inputFocusStyle}`}
                                  placeholder="Search or enter product name"
                                  required
                                />
                                {loading.products && (
                                  <div className="absolute right-3 top-3">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: colors.primary }}></div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Enhanced Product Suggestions */}
                              {showProductSuggestions[index] && productSuggestions[index] && productSuggestions[index].length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-scale-in">
                                  {productSuggestions[index].map((product) => (
                                    <div
                                      key={product._id}
                                      onClick={() => handleProductSelect(index, product)}
                                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-all duration-200 hover:translate-x-1 flex justify-between items-center"
                                    >
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">{product.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center space-x-2 mt-1">
                                          <span>ID: {product.productId}</span>
                                          {product.barcode && (
                                            <>
                                              <span>•</span>
                                              <span>Barcode: {product.barcode}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-semibold text-green-600">LKR {product.unitPrice?.toLocaleString()}</div>
                                        <div className="text-xs text-gray-500">
                                          Stock: {product.quantity !== undefined ? product.quantity : 'N/A'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* No products found message */}
                              {showProductSuggestions[index] && 
                              productSearchQuery[index] && 
                              productSuggestions[index] && 
                              productSuggestions[index].length === 0 && 
                              !loading.products && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center">
                                  <div className="text-gray-500 text-sm">
                                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                    <p>No products found</p>
                                    <p className="text-xs mt-1">Try a different search term or add the product in Products page</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="lg:col-span-3">
                              <label className="block text-sm font-medium mb-2 text-gray-700">
                                Quantity *
                              </label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newItems = [...orderFormData.items];
                                  newItems[index].quantity = e.target.value;
                                  setOrderFormData({ ...orderFormData, items: newItems });
                                }}
                                className={`w-full p-3 border border-gray-300 rounded-xl ${inputFocusStyle}`}
                                placeholder="0"
                                min="1"
                                required
                              />
                            </div>
                            
                            <div className="lg:col-span-3">
                              <label className="block text-sm font-medium mb-2 text-gray-700">
                                Unit Price (LKR) *
                              </label>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const newItems = [...orderFormData.items];
                                  newItems[index].unitPrice = e.target.value;
                                  setOrderFormData({ ...orderFormData, items: newItems });
                                }}
                                className={`w-full p-3 border border-gray-300 rounded-xl ${inputFocusStyle}`}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                required
                              />
                            </div>
                            
                            <div className="lg:col-span-1">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="w-full flex items-center justify-center space-x-2 bg-red-500 text-white p-3 rounded-xl hover:bg-red-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                                disabled={orderFormData.items.length <= 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Item Total */}
                          {item.quantity && item.unitPrice && Number(item.quantity) > 0 && Number(item.unitPrice) > 0 && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-green-200 transition-all duration-300 hover:shadow-md">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Item Total:</span>
                                <span className="font-semibold text-green-600">
                                  LKR {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Enhanced Totals and Submit Section */}
                    <div 
                      className="rounded-2xl p-8 border transition-all duration-300 hover:shadow-xl"
                      style={{ 
                        backgroundColor: `${colors.primary}05`,
                        borderColor: `${colors.primary}20`
                      }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="text-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md">
                          <div className="text-sm font-medium text-gray-600">Items Total</div>
                          <div className="text-2xl font-bold mt-2 text-gray-800">
                            LKR {currentTotal.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md">
                          <div className="text-sm font-medium text-gray-600">Pending Balance</div>
                          <div className="text-2xl font-bold mt-2 text-orange-600">
                            LKR {orderFormData.customerPendingPayments.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md">
                          <div className="text-sm font-medium text-gray-600">Items Count</div>
                          <div className="text-2xl font-bold mt-2" style={{ color: colors.primary }}>
                            {orderFormData.items.filter(item => item.productName).length}
                          </div>
                        </div>
                        <div 
                          className="text-center p-4 rounded-xl border shadow-lg transition-all duration-300 hover:shadow-xl"
                          style={{ 
                            backgroundColor: colors.primary,
                            borderColor: colors.primary
                          }}
                        >
                          <div className="text-sm font-medium text-white">Grand Total</div>
                          <div className="text-2xl font-bold mt-2 text-white">
                            LKR {grandTotal.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                          type="submit"
                          disabled={!orderFormData.customerId || orderFormData.items.length === 0}
                          className="flex items-center space-x-3 text-white px-8 py-4 rounded-xl transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-2xl"
                          style={{ backgroundColor: colors.success }}
                        >
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-semibold text-lg">Create Order</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-8 animate-fade-in">
              {/* Customer Management Section */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <div 
                  className="p-6 transition-all duration-500"
                  style={{ backgroundColor: colors.secondary }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                      <User className="h-6 w-6" />
                      <span>Customer Management</span>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                        {customers.length} customers
                      </span>
                    </h2>
                    
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search customers..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={`pl-10 pr-4 py-2 border border-gray-300 rounded-xl w-full lg:w-64 ${inputFocusStyle}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {loading.customers ? (
                    <div className="flex justify-center items-center py-12">
                      <div 
                        className="animate-spin rounded-full h-12 w-12 border-b-2 transition-all duration-500"
                        style={{ borderColor: colors.secondary }}
                      ></div>
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="text-center py-12">
                      <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No customers found</h3>
                      <p className="text-gray-500 mb-6">Start by adding your first customer</p>
                      <button
                        onClick={() => {
                          setIsEditMode(false);
                          setCustomerFormData({ name: '', email: '', phone: '', address: '', pendingPayments: 0 });
                          setShowCustomerModal(true);
                          handleTabChange('create');
                        }}
                        className="flex items-center space-x-2 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl mx-auto transform hover:scale-105"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add First Customer</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {customers
                        .filter(customer => 
                          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          customer.phone.includes(searchQuery)
                        )
                        .map((customer) => (
                        <div 
                          key={customer._id} 
                          className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden group"
                        >
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                                  {customer.name}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1 transition-colors duration-300 group-hover:text-gray-600">
                                  {customer.address}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 group-hover:scale-110 ${
                                  customer.pendingPayments > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                                }`}>
                                  {customer.pendingPayments > 0 ? 'Pending' : 'Clear'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center space-x-2 text-sm text-gray-600 transition-colors duration-300 group-hover:text-gray-700">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{customer.email}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-gray-600 transition-colors duration-300 group-hover:text-gray-700">
                                <Phone className="h-3 w-3" />
                                <span>{customer.phone}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm transition-colors duration-300 group-hover:text-orange-700">
                                <DollarSign className="h-3 w-3 text-orange-500" />
                                <span className="font-semibold text-orange-600">
                                  LKR {customer.pendingPayments.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
                              <button
                                onClick={() => generateCustomerInvoices(customer._id)}
                                className="flex items-center space-x-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-all duration-300 text-sm flex-1 justify-center transform hover:scale-105"
                              >
                                <Download className="h-3 w-3" />
                                <span>Invoices</span>
                              </button>
                              <button
                                onClick={() => handleEditCustomer(customer)}
                                className="flex items-center space-x-1 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-all duration-300 text-sm transform hover:scale-105"
                                style={{ backgroundColor: colors.secondary }}
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteCustomer(customer._id)}
                                className="flex items-center space-x-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-all duration-300 text-sm transform hover:scale-105"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

{activeTab === 'orders' && (
  <div className="space-y-8 animate-fade-in">
    {/* Orders Statistics */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Orders</p>
            <p className="text-2xl font-bold mt-1" style={{ color: colors.primary }}>{orderStats.total}</p>
          </div>
          <div 
            className="p-3 rounded-xl transition-all duration-300 hover:scale-110"
            style={{ backgroundColor: `${colors.primary}15` }}
          >
            <ShoppingCart className="h-6 w-6" style={{ color: colors.primary }} />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{orderStats.completed}</p>
          </div>
          <div className="p-3 rounded-xl bg-green-50 transition-all duration-300 hover:scale-110">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{orderStats.pending}</p>
          </div>
          <div className="p-3 rounded-xl bg-orange-50 transition-all duration-300 hover:scale-110">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold mt-1 text-green-600">LKR {orderStats.revenue.toLocaleString()}</p>
          </div>
          <div 
            className="p-3 rounded-xl transition-all duration-300 hover:scale-110"
            style={{ backgroundColor: `${colors.accent}15` }}
          >
            <PieChart className="h-6 w-6" style={{ color: colors.accent }} />
          </div>
        </div>
      </div>
    </div>

    {/* Orders List */}
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-2xl">
      <div 
        className="p-6 transition-all duration-500"
        style={{ backgroundColor: colors.accent }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Package className="h-6 w-6" />
            <span>Order History</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
              {orders.length} orders
            </span>
          </h2>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowHiddenOrders(!showHiddenOrders)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                showHiddenOrders 
                  ? 'bg-white text-teal-700 shadow-lg transform scale-105' 
                  : 'bg-white/20 text-white hover:bg-white/30 hover:scale-105'
              }`}
              style={{ color: showHiddenOrders ? colors.accent : 'white' }}
            >
              {showHiddenOrders ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showHiddenOrders ? 'Hide Personalized' : 'Show Personalized'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading.orders ? (
          <div className="flex justify-center items-center py-12">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 transition-all duration-500"
              style={{ borderColor: colors.accent }}
            ></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No orders found</h3>
            <p className="text-gray-500">Create your first order to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(showHiddenOrders ? orders : regularOrders).map((order) => (
              <div 
                key={order._id} 
                className={`rounded-xl border transition-all duration-300 overflow-hidden hover:shadow-lg hover:scale-102 ${
                  order.personalized 
                    ? 'border-orange-200 bg-orange-50 hover:bg-orange-100' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 flex items-center space-x-2 group-hover:text-blue-600 transition-colors duration-300">
                            <span>Order #{order._id.slice(-8)}</span>
                            {order.personalized && (
                              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium border border-orange-200 transition-all duration-300 group-hover:bg-orange-200 group-hover:scale-105">
                                Personalized
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border transition-all duration-300 group-hover:scale-105 ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 transition-colors duration-300 group-hover:text-gray-700">
                            {order.customer ? order.customer.name : 'Unknown Customer'} • {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
                          className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-all duration-300 transform hover:scale-110"
                        >
                          {expandedOrder === order._id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-100 rounded-lg transition-all duration-300 hover:bg-white hover:shadow-md">
                          <div className="text-sm text-gray-600">Items</div>
                          <div className="font-semibold text-gray-900">{order.items.length}</div>
                        </div>
                        <div className="text-center p-3 bg-gray-100 rounded-lg transition-all duration-300 hover:bg-white hover:shadow-md">
                          <div className="text-sm text-gray-600">Order Total</div>
                          <div className="font-semibold text-green-600">LKR {order.totalAmount.toLocaleString()}</div>
                        </div>
                        <div className="text-center p-3 bg-gray-100 rounded-lg transition-all duration-300 hover:bg-white hover:shadow-md">
                          <div className="text-sm text-gray-600">Pending</div>
                          <div className="font-semibold text-orange-600">LKR {order.pendingPayments.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => generateInvoice(order)}
                        disabled={!order.customer}
                        className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 text-sm transform hover:scale-105"
                      >
                        <Download className="h-3 w-3" />
                        <span>Invoice</span>
                      </button>
                      <button
                        onClick={() => sendInvoiceViaWhatsApp(order)}
                        disabled={!order.customer}
                        className="flex items-center space-x-2 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 text-sm transform hover:scale-105"
                        style={{ backgroundColor: colors.secondary }}
                      >
                        <Send className="h-3 w-3" />
                        <span>WhatsApp</span>
                      </button>
                      {/* Delete Order Button */}
                      <button
                        onClick={() => {
                          showConfirmationModal(
                            'Delete Order',
                            `Are you sure you want to delete order #${order._id.slice(-8)}? This action cannot be undone.`,
                            'delete',
                            async () => {
                              try {
                                await api.delete(`/api/orders/${order._id}`);
                                setOrders(orders.filter(o => o._id !== order._id));
                                showSuccessMessage('Order Deleted', `Order #${order._id.slice(-8)} has been deleted successfully!`);
                              } catch (err: any) {
                                setError('Failed to delete order: ' + (err.response?.data?.error || err.message));
                              }
                            }
                          );
                        }}
                        className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-300 text-sm transform hover:scale-105"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                  
                  {expandedOrder === order._id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 animate-slide-down">
                      <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div 
                            key={idx} 
                            className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 transition-all duration-300 hover:bg-gray-50 hover:shadow-md hover:translate-x-1"
                          >
                            <div>
                              <div className="font-medium text-gray-900">{item.productName}</div>
                              <div className="text-sm text-gray-600">Quantity: {item.quantity}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">LKR {item.unitPrice}</div>
                              <div className="text-sm text-green-600">LKR {(item.quantity * item.unitPrice).toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-300 hover:bg-gray-100 hover:shadow-md">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Payment Method:</span>
                          <span className="font-medium text-gray-900">{order.paymentMethod}</span>
                        </div>
                        {order.customer && (
                          <>
                            <div className="flex justify-between items-center text-sm mt-2">
                              <span className="text-gray-600">Customer Phone:</span>
                              <span className="font-medium text-gray-900">{order.customer.phone}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-2">
                              <span className="text-gray-600">Customer Email:</span>
                              <span className="font-medium text-gray-900">{order.customer.email}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)}
        </div>

        {/* Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-scale-in">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">Scan Product Barcode</h3>
                <button
                  onClick={() => {
                    setShowScanner(false);
                    codeReader.current.reset();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-110"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <video 
                  ref={videoRef} 
                  className="w-full rounded-xl border-2 border-dashed border-gray-300 transition-all duration-300 hover:border-blue-300"
                  style={{ minHeight: '300px' }}
                />
                <p className="text-sm text-gray-600 mt-4 text-center">
                  Point your camera at the product barcode to scan automatically
                </p>
              </div>
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowScanner(false);
                    codeReader.current.reset();
                  }}
                  className="w-full bg-red-500 text-white py-4 rounded-xl hover:bg-red-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 transform hover:scale-105"
                >
                  <X className="h-4 w-4" />
                  <span className="font-semibold">Stop Scanning</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Customer Modal */}
        {showCustomerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-scale-in">
              <div 
                className="p-6 rounded-t-2xl text-white transition-all duration-500"
                style={{ backgroundColor: colors.primary }}
              >
                <h3 className="text-xl font-bold flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>{isEditMode ? 'Edit Customer' : 'Add New Customer'}</span>
                </h3>
              </div>
              <form onSubmit={handleCustomerSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={customerFormData.name}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                    className={`w-full p-4 border border-gray-300 rounded-xl bg-gray-50 ${inputFocusStyle}`}
                    required
                    placeholder="Enter customer full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                    className={`w-full p-4 border border-gray-300 rounded-xl bg-gray-50 ${inputFocusStyle}`}
                    required
                    placeholder="Enter email address"
                  />
                  {customerFormData.email && !validateEmail(customerFormData.email) && (
                    <p className="text-red-500 text-sm mt-2 flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>Please enter a valid email address</span>
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={customerFormData.phone}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                    className={`w-full p-4 border border-gray-300 rounded-xl bg-gray-50 ${inputFocusStyle}`}
                    required
                    placeholder="Enter phone number (e.g., 0712345678)"
                  />
                  {customerFormData.phone && !validatePhone(customerFormData.phone) && (
                    <p className="text-red-500 text-sm mt-2 flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>Phone must be 10 digits starting with 0</span>
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={customerFormData.address}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                    className={`w-full p-4 border border-gray-300 rounded-xl bg-gray-50 ${inputFocusStyle}`}
                    required
                    placeholder="Enter full address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">
                    Pending Payments (LKR)
                  </label>
                  <input
                    type="number"
                    value={customerFormData.pendingPayments}
                    onChange={(e) =>
                      setCustomerFormData({ ...customerFormData, pendingPayments: Number(e.target.value) })
                    }
                    className={`w-full p-4 border border-gray-300 rounded-xl bg-gray-50 ${inputFocusStyle}`}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerFormData({ name: '', email: '', phone: '', address: '', pendingPayments: 0 });
                      setShowCustomerModal(false);
                      setIsEditMode(false);
                      setEditCustomerId(null);
                    }}
                    className="flex-1 bg-gray-500 text-white py-4 rounded-xl hover:bg-gray-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 text-white py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    style={{ backgroundColor: colors.success }}
                  >
                    {isEditMode ? 'Update Customer' : 'Save Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enhanced Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-scale-in">
              <div className="p-8">
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    {getConfirmationIcon()}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    {confirmationConfig.title}
                  </h3>
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    {confirmationConfig.message}
                  </p>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setShowConfirmation(false);
                      confirmationConfig.onCancel?.();
                    }}
                    className="flex-1 bg-gray-500 text-white py-4 rounded-xl hover:bg-gray-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      confirmationConfig.onConfirm();
                      setShowConfirmation(false);
                    }}
                    className={`flex-1 text-white py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 ${getConfirmButtonColor()}`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slide-down {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        .hover-scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
};

export default Orders;