import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import api from '../api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  PieChart,
  Lock,
  Menu,
  Layers
} from 'lucide-react';

let sinhalaFontsReady = true;

// Simple initialization for jsPDF (no font loading needed)
const initializePDFMake = async () => {
  console.log('✅ [PDF Init] Using jsPDF - Sinhala fonts supported natively');
};

    
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
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
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
  pendingPaid: boolean;
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
  pendingPaid: boolean;
}

interface Product {
  _id: string;
  name: string;
  productId: string;
  unitPrice: number;
  barcode: string;
  quantity?: number;
  lowStockThreshold?: number;
  unit?: string;
  rawMaterials?: any[];  
}

interface OrderFormItem {
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  unit?: string;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  pendingPayments: number;
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

// Updated color palette
const colors = {
  primary: '#053B50',
  secondary: '#176B87',
  accent: '#64CCC5',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#f8fafc',
  surface: '#ffffff',
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    light: '#9ca3af'
  }
};

// Security credentials
const PERSONALIZED_ORDERS_PASSWORD = "odsee12";
const DELETE_ORDER_PIN = "0713";

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
  const [productsFlat, setProductsFlat] = useState<any[]>([]);
  
  // Enhanced state management
  const [activeTab, setActiveTab] = useState<'create' | 'customers' | 'orders'>('create');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    orders: false,
    customers: false,
    products: false
  });

  // NEW STATE: Track pdfMake initialization
  const [pdfMakeInitialized, setPdfMakeInitialized] = useState(false);

  // Mobile state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Order search state
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Customer filter state
  const [customerFilter, setCustomerFilter] = useState<'all' | 'pending' | 'clear'>('all');

  // Security states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pendingDeleteOrderId, setPendingDeleteOrderId] = useState<string | null>(null);

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
    items: [{ productId: '', productName: '', quantity: '', unitPrice: '', unit: '' }],
    paymentMethod: 'Cash',
    personalized: false,
    pendingPaid: false,
  });

  const [showProductSuggestions, setShowProductSuggestions] = useState<boolean[]>([]);

  // Initialize pdfMake with Sinhala fonts when component mounts - NEW CODE
  useEffect(() => {
    const initPDF = async () => {
      await initializePDFMake();
      setPdfMakeInitialized(true);
    };
    
    initPDF();
  }, []);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Enhanced tab switching with smooth animation
  const handleTabChange = (tab: 'create' | 'customers' | 'orders') => {
    setTabTransition(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTimeout(() => setTabTransition(false), 300);
    }, 150);
    setMobileMenuOpen(false);
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

  // Password verification for personalized orders
  const handleShowPersonalizedOrders = () => {
    setShowPasswordModal(true);
  };

  const verifyPassword = () => {
    if (passwordInput === PERSONALIZED_ORDERS_PASSWORD) {
      setShowHiddenOrders(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      showSuccessMessage('Access Granted', 'You can now view personalized orders');
    } else {
      setError('Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  // PIN verification for order deletion
  const handleDeleteOrderClick = (orderId: string) => {
    setPendingDeleteOrderId(orderId);
    setShowPinModal(true);
  };

  const verifyPin = () => {
    if (pinInput === DELETE_ORDER_PIN) {
      if (pendingDeleteOrderId) {
        showConfirmationModal(
          'Delete Order',
          `Are you sure you want to delete order #${pendingDeleteOrderId.slice(-8)}? This action cannot be undone.`,
          'delete',
          async () => {
            try {
              await api.delete(`/api/orders/${pendingDeleteOrderId}`);
              setOrders(orders.filter(o => o._id !== pendingDeleteOrderId));
              showSuccessMessage('Order Deleted', `Order #${pendingDeleteOrderId.slice(-8)} has been deleted successfully!`);
            } catch (err: any) {
              setError('Failed to delete order: ' + (err.response?.data?.error || err.message));
            }
          }
        );
      }
      setShowPinModal(false);
      setPinInput('');
      setPendingDeleteOrderId(null);
    } else {
      setError('Incorrect PIN. Please try again.');
      setPinInput('');
    }
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
      const productsData = response.data.map((product: Product) => ({
        ...product,
        name: product.name || '',
        productId: product.productId || product._id || '',
        unitPrice: product.unitPrice || 0,
        barcode: product.barcode || '',
        quantity: product.quantity || 0,
        unit: product.unit || ''
      }));
      setProducts(productsData);
      const flat: any[] = [];
      response.data.forEach((product: any) => {
        const pt = product.productType || '';
        const cat = product.category || '';
        const variants = Array.isArray(product.variants) ? product.variants : [];
        variants.forEach((v: any, idx: number) => {
          const size = v.size || '';
          const displayName = `${pt} ${size}`.trim();
          flat.push({
            productId: product._id,
            productType: pt,
            category: cat,
            variantIndex: idx,
            displayName,
            size,
            price: Number(v.price || 0),
            stock: Number(v.stock || 0),
            barcode: v.barcode || '',
            rawProduct: product
          });
        });
      });
      setProductsFlat(flat);
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
      
      socket.on('productUpdated', (updatedProduct: Product) => {
        setProducts((prev) => prev.map((product) => 
          product._id === updatedProduct._id ? updatedProduct : product
        ));
      });

      return () => {
        socket.off('orderCreated');
        socket.off('orderUpdated');
        socket.off('productUpdated');
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
                    productId: product._id,
                    productName: product.name, 
                    quantity: '1', 
                    unitPrice: product.unitPrice.toString(),
                    unit: product.unit || ''
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

  // Order search handler
  const handleOrderSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrderSearchQuery(e.target.value);
  };

  // Filter customers based on pending/clear filter
  const filteredCustomersByPayment = customers.filter(customer => {
    if (customerFilter === 'pending') {
      return customer.pendingPayments > 0;
    } else if (customerFilter === 'clear') {
      return customer.pendingPayments === 0;
    }
    return true;
  });

  // Order filtering function
  const filterOrders = (orders: Order[], query: string) => {
    if (!query) return orders;
    
    const lowerQuery = query.toLowerCase();
    return orders.filter(order => {
      if (order._id.toLowerCase().includes(lowerQuery)) return true;
      
      if (order.customer) {
        if (
          order.customer.name.toLowerCase().includes(lowerQuery) ||
          order.customer.email.toLowerCase().includes(lowerQuery) ||
          order.customer.phone.includes(lowerQuery)
        ) return true;
      }
      
      if (order.items.some(item => 
        item.productName.toLowerCase().includes(lowerQuery)
      )) return true;
      
      if (order.status.toLowerCase().includes(lowerQuery)) return true;
      
      if (order.paymentMethod.toLowerCase().includes(lowerQuery)) return true;
      
      const orderDate = new Date(order.createdAt).toLocaleDateString();
      if (orderDate.includes(query)) return true;
      
      return false;
    });
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
      pendingPaid: false,
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
    newItems[index].productId = '';
    newItems[index].unit = '';
    setOrderFormData({ ...orderFormData, items: newItems });

    const normalize = (s: string) => s ? s.toString().toLowerCase().replace(/\s+/g, ' ').trim() : '';
    if (query.length > 0) {
      const q = normalize(query);
      const filtered = productsFlat.filter(p => {
        const hay = [p.displayName, p.productType, p.category, p.size, p.barcode].map(normalize).join(' ');
        return hay.includes(q);
      }).slice(0, 8);

      const newSuggestions = [...productSuggestions];
      newSuggestions[index] = filtered;
      setProductSuggestions(newSuggestions);
    } else {
      const newSuggestions = [...productSuggestions];
      newSuggestions[index] = [];
      setProductSuggestions(newSuggestions);
    }
  };

  // When a flattened variant is selected
  const handleVariantSelect = (index: number, variant: any) => {
    const newItems = [...orderFormData.items];
    newItems[index] = {
      productId: variant.productId,
      productName: variant.displayName,
      quantity: newItems[index].quantity || '1',
      unitPrice: variant.price ? variant.price.toString() : '0',
      unit: variant.size || ''
    };
    setOrderFormData({ ...orderFormData, items: newItems });

    const newSuggestions = [...productSuggestions];
    newSuggestions[index] = [];
    setProductSuggestions(newSuggestions);
    const newShow = [...showProductSuggestions];
    newShow[index] = false;
    setShowProductSuggestions(newShow);
  };

  // Enhanced product selection
  const handleProductSelect = (index: number, product: Product) => {
    const newItems = [...orderFormData.items];
    newItems[index] = {
      productId: product._id,
      productName: product.name,
      quantity: newItems[index].quantity || '1',
      unitPrice: product.unitPrice.toString(),
      unit: product.unit || ''
    };
    
    setOrderFormData({ ...orderFormData, items: newItems });
    
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
          pendingPaid: false,
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
const generateInvoiceWithPDFMake = async (order: Order) => {
  try {
    if (!order.customer) {
      setError(`Cannot generate invoice for order ${order._id}: No customer data`);
      return null;
    }

    const pendingPaid = order.pendingPaid ?? false;
    const pendingAmount = order.pendingPayments || 0;
    const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    // Create HTML invoice element
    const invoiceHTML = `
      <div style="padding: 20px; font-family: 'Times New Roman', serif; color: #000;">
        <h1 style="text-align: center; margin-bottom: 10px;">AURA Ayurvedic Products</h1>
        <div style="text-align: center; font-size: 12px; margin-bottom: 20px;">
          No.376, Dadigamuwa, Sri Lanka<br/>
          Tel: 011 342 6186 / 0714788327<br/>
          Email: Auraayurvedaproducts2014@gmail.com<br/>
          Reg No: 06/02/01/01/137
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <h2 style="margin: 0;">INVOICE</h2>
          <h3 style="margin: 0;">#AUR${order._id.slice(-6).toUpperCase()}</h3>
        </div>
        
        <h3 style="margin: 10px 0 5px 0;">CUSTOMER INFORMATION</h3>
        <div style="border: 1px solid #ccc; padding: 10px; background-color: #f0f0f0; margin-bottom: 20px;">
          <strong>${order.customer.name}</strong><br/>
          Email: ${order.customer.email}<br/>
          Phone: ${order.customer.phone}<br/>
          Address: ${order.customer.address}
        </div>
        
        <h3 style="margin: 10px 0 5px 0;">ORDER ITEMS</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #165740; color: white;">
              <th style="border: 1px solid #165740; padding: 8px; text-align: left;">#</th>
              <th style="border: 1px solid #165740; padding: 8px; text-align: left;">DESCRIPTION</th>
              <th style="border: 1px solid #165740; padding: 8px; text-align: center;">QTY</th>
              <th style="border: 1px solid #165740; padding: 8px; text-align: right;">PRICE</th>
              <th style="border: 1px solid #165740; padding: 8px; text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((item, index) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.productName}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">LKR ${item.unitPrice.toLocaleString()}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">LKR ${(item.quantity * item.unitPrice).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-bottom: 20px; text-align: right;">
          <div style="margin-bottom: 5px; font-size: 14px;"><strong>Subtotal:</strong> <strong>LKR ${subtotal.toLocaleString()}</strong></div>
          ${pendingAmount > 0 ? `
            <div style="margin-bottom: 5px; font-size: 14px;">
              <strong>Pending Payment:</strong> 
              <strong style="color: ${pendingPaid ? 'green' : 'red'};">LKR ${pendingAmount.toLocaleString()} ${pendingPaid ? '(PAID)' : '(NOT PAID)'}</strong>
            </div>
          ` : ''}
          <div style="margin-bottom: 10px; padding-top: 10px; border-top: 2px solid #165740; font-size: 16px; color: #165740;">
            <strong>TOTAL: LKR ${(pendingPaid ? (subtotal + pendingAmount) : subtotal).toLocaleString()}</strong>
          </div>
          ${pendingAmount > 0 && !pendingPaid ? `<div style="font-size: 12px; color: red;"><strong>Due Amount: LKR ${pendingAmount.toLocaleString()}</strong></div>` : ''}
        </div>
        
        <div style="text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
          Thank you for your business!
        </div>
      </div>
    `;

    // Create a temporary container
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = invoiceHTML;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '210mm'; // A4 width
    tempDiv.style.height = 'auto';
    document.body.appendChild(tempDiv);

    // Convert HTML to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Create PDF from canvas
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 10; // 5mm margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);

    // Clean up
    document.body.removeChild(tempDiv);

    // Return a mock PDF object with download method
    return {
      download: (filename: string) => {
        pdf.save(filename);
      }
    };
  } catch (error) {
    console.error('Error generating invoice:', error);
    setError('Failed to generate invoice');
    return null;
  }
};

  const generateInvoice = async (order: Order) => {
  // Force re-initialization to ensure fonts are loaded
  if (!pdfMakeInitialized) {
    await initializePDFMake();
  }

  if (!order.customer) {
    setError(`Cannot generate invoice for order ${order._id}: No customer data`);
    return;
  }

  console.log('🚀 [PDF Gen] Generating invoice using jsPDF+html2canvas');

  try {
    const pdfDoc = await generateInvoiceWithPDFMake(order);
    
    if (!pdfDoc) {
      setError('Failed to create PDF document');
      return;
    }

    console.log('✅ [PDF Gen] PDF document created, starting download...');
    pdfDoc.download(`invoice_${order._id}.pdf`);
    showSuccessMessage('Invoice Generated', `Invoice for order ${order._id} has been generated successfully!`);
  } catch (error) {
    console.error('❌ [PDF Gen] Error generating PDF:', error);
    setError('Failed to generate invoice. Please try again.');
  }
};


// Add this inside your component, before the return statement

  const sendInvoiceViaWhatsApp = async (order: Order) => {
    if (!order.customer) {
      setError(`Cannot send invoice for order ${order._id}: No customer data`);
      return;
    }

    // For now, just download the invoice
    // Full WhatsApp integration can be added later
    try {
      const pdfDoc = await generateInvoiceWithPDFMake(order);
      if (pdfDoc) {
        pdfDoc.download(`invoice_${order._id}.pdf`);
        showSuccessMessage('Invoice Generated', `Invoice for order ${order._id} has been generated successfully!`);
      }
    } catch (err: any) {
      setError('Failed to generate invoice: ' + (err.message || 'Unknown error'));
    }
  };

  const testOrderData = async (orderId: string) => {
    try {
      const response = await api.get(`/api/orders/${orderId}`);
      const order = response.data;
      console.log('🧪 BACKEND ORDER DATA TEST:', {
        orderId: order._id,
        totalAmount: order.totalAmount,
        pendingPaid: order.pendingPaid,
        pendingPayments: order.pendingPayments,
        items: order.items.map((item: any) => ({
          name: item.productName,
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.quantity * item.unitPrice
        })),
        itemsTotal: order.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0),
        calculatedTotal: order.pendingPaid 
          ? order.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) + (order.pendingPayments || 0)
          : order.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0)
      });
    } catch (error) {
      console.error('Failed to test order data:', error);
    }
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
          
          for (const order of customerOrders) {
            if (!order.customer) continue;
            const pdfDoc = await generateInvoiceWithPDFMake(order);
            if (!pdfDoc) continue;
            pdfDoc.download(`invoice_${order._id}.pdf`);
          }
          
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
      items: [...orderFormData.items, { 
        productId: '', 
        productName: '', 
        quantity: '', 
        unitPrice: '',
        unit: ''
      }],
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

    const itemsWithMissingProductId = orderFormData.items.filter(item => !item.productId);
    if (itemsWithMissingProductId.length > 0) {
      setError('Please select valid products from the list for all items. Product selection is required for stock management.');
      return;
    }

    if (orderFormData.items.length === 0 || orderFormData.items.some(item => !item.productName || !item.quantity || !item.unitPrice)) {
      setError('Please add at least one valid order item.');
      return;
    }

    // Check stock availability before submitting
    try {
      for (const item of orderFormData.items) {
        const variant = productsFlat.find(v => v.productId === item.productId && v.displayName === item.productName);
        if (variant) {
          const currentStock = variant.stock || 0;
          const requestedQuantity = Number(item.quantity);
          if (currentStock < requestedQuantity) {
            setError(`Insufficient stock for ${item.productName}. Available: ${currentStock}, Requested: ${requestedQuantity}`);
            return;
          }
        }
      }
    } catch (err: any) {
      setError('Failed to check stock availability. Please try again.');
      return;
    }

    showConfirmationModal(
      'Create Order',
      `Create order for ${orderFormData.customerName} with ${orderFormData.items.length} items totaling LKR ${currentTotal.toLocaleString()}?${
        orderFormData.pendingPaid && orderFormData.customerPendingPayments > 0 
          ? `\n\nPending payment of LKR ${orderFormData.customerPendingPayments.toLocaleString()} will be collected.`
          : ''
      }`,
      'info',
      async () => {
        try {
          const items = orderFormData.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            unit: item.unit || '',
          }));

          console.log('📤 Sending to backend:', {
            pendingPaid: orderFormData.pendingPaid,
            customerPendingPayments: orderFormData.customerPendingPayments,
            itemsCount: items.length
          });
          
          const response = await api.post('/api/orders', {
            customerId: orderFormData.customerId,
            items,
            personalized: orderFormData.personalized,
            paymentMethod: orderFormData.paymentMethod,
            pendingPaid: orderFormData.pendingPaid,
          });
          
          console.log('🔄 ORDER CREATION RESPONSE:', {
            pendingPaid: response.data.pendingPaid,
            totalAmount: response.data.totalAmount,
            orderId: response.data._id
          });
          
          setOrderFormData({
            customerId: '',
            customerName: '',
            customerEmail: '',
            customerPhone: '',
            customerAddress: '',
            customerPendingPayments: 0,
            items: [{ productId: '', productName: '', quantity: '', unitPrice: '', unit: '' }],
            paymentMethod: 'Cash',
            personalized: false,
            pendingPaid: false,
          });
          setLastCreatedOrder(response.data);
          fetchOrders();
          fetchCustomers();
          fetchProducts();
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
  const grandTotal = currentTotal + (orderFormData.pendingPaid ? orderFormData.customerPendingPayments : 0);

  // Enhanced order statistics
  const regularOrders = orders.filter((order) => !order.personalized);
  const personalizedOrders = orders.filter((order) => order.personalized);
  
  // Filter orders based on search and showHiddenOrders
  const displayedOrders = filterOrders(
    showHiddenOrders ? orders : regularOrders, 
    orderSearchQuery
  );

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

  // Function to get stock status for a product
  const getStockStatus = (product: Product) => {
    if (product.quantity === undefined || product.quantity === null) {
      return { text: 'No Stock', color: 'text-red-500', bg: 'bg-red-50' };
    }
    if (product.quantity === 0) {
      return { text: 'Out of Stock', color: 'text-red-500', bg: 'bg-red-50' };
    }
    if (product.quantity <= (product.lowStockThreshold || 10)) {
      return { text: 'Low Stock', color: 'text-orange-500', bg: 'bg-orange-50' };
    }
    return { text: 'In Stock', color: 'text-green-500', bg: 'bg-green-50' };
  };

  // Enhanced input focus styles using Tailwind
  const inputFocusStyle = "focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200";

  // Mobile Customer Row Component
  const MobileCustomerRow = ({ customer }: { customer: Customer }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">{customer.name}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
            <Phone className="h-3 w-3" />
            <span>{customer.phone}</span>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          customer.pendingPayments > 0 
            ? 'bg-orange-100 text-orange-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {customer.pendingPayments > 0 ? 'Pending' : 'Clear'}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <Mail className="h-3 w-3" />
          <span className="truncate">{customer.email}</span>
        </div>
        <div className="flex items-start space-x-2">
          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{customer.address}</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
        <div>
          <span className="text-sm font-semibold text-orange-600">
            LKR {customer.pendingPayments.toLocaleString()}
          </span>
          <div className="text-xs text-gray-500">Pending</div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => generateCustomerInvoices(customer._id)}
            className="flex items-center space-x-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Invoices</span>
          </button>
          <button
            onClick={() => handleEditCustomer(customer)}
            className="flex items-center space-x-1 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
            style={{ backgroundColor: colors.secondary }}
          >
            <Edit className="h-3 w-3" />
          </button>
          <button
            onClick={() => handleDeleteCustomer(customer._id)}
            className="flex items-center space-x-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );

  // Mobile Order Card Component
  const MobileOrderCard = ({ order }: { order: Order }) => (
    <div className={`bg-white rounded-lg border transition-all duration-300 mb-4 ${
      order.personalized ? 'border-orange-200' : 'border-gray-200'
    }`}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-gray-900">
                Order #{order._id.slice(-8)}
              </h3>
              {order.personalized && (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                  Personalized
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              <span className="text-sm text-gray-600">
                {formatDate(order.createdAt)}
              </span>
            </div>
            {order.customer && (
              <p className="text-sm text-gray-700">
                {order.customer.name}
              </p>
            )}
          </div>
          <button
            onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
          >
            {expandedOrder === order._id ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 bg-gray-100 rounded-lg">
            <div className="text-xs text-gray-600">Items</div>
            <div className="font-semibold text-sm">{order.items.length}</div>
          </div>
          <div className="text-center p-2 bg-gray-100 rounded-lg">
            <div className="text-xs text-gray-600">Total</div>
            <div className="font-semibold text-sm text-green-600">
              LKR {order.totalAmount.toLocaleString()}
            </div>
          </div>
          <div className="text-center p-2 bg-gray-100 rounded-lg">
            <div className="text-xs text-gray-600">Pending</div>
            <div className="font-semibold text-sm text-orange-600">
              LKR {order.pendingPayments.toLocaleString()}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => generateInvoice(order)}
            disabled={!order.customer}
            className="flex items-center justify-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors text-sm"
          >
            <Download className="h-3 w-3" />
            <span>Download Invoice</span>
          </button>
          <button
            onClick={() => sendInvoiceViaWhatsApp(order)}
            disabled={!order.customer}
            className="flex items-center justify-center space-x-2 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors text-sm"
            style={{ backgroundColor: colors.secondary }}
          >
            <Send className="h-3 w-3" />
            <span>Send via WhatsApp</span>
          </button>
          <button
            onClick={() => handleDeleteOrderClick(order._id)}
            className="flex items-center justify-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete Order</span>
          </button>
        </div>
        
        {expandedOrder === order._id && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">{item.productName}</div>
                    <div className="text-xs text-gray-600">Qty: {item.quantity}</div>
                    {item.unit && (
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <Layers className="h-3 w-3 mr-1" />
                        {item.unit}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 text-sm">LKR {item.unitPrice}</div>
                    <div className="text-xs text-green-600">
                      LKR {(item.quantity * item.unitPrice).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium">{order.paymentMethod}</span>
                </div>
                {order.customer && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{order.customer.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{order.customer.email}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`p-4 lg:p-6 max-w-7xl mx-auto ${isMobile ? 'mobile-container' : ''}`}>
        {/* Mobile Header */}
        {isMobile && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl shadow-lg" style={{ backgroundColor: colors.primary }}>
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: colors.primary }}>
                    Order Management
                  </h1>
                  <p className="text-gray-600 text-xs">Streamline your order processing</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-white shadow-sm border border-gray-200"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            
            {/* Mobile Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 text-center">
                <div className="text-xs text-gray-600">Total Orders</div>
                <div className="text-lg font-bold" style={{ color: colors.primary }}>
                  {orderStats.total}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 text-center">
                <div className="text-xs text-gray-600">Revenue</div>
                <div className="text-lg font-bold text-green-600">
                  LKR {orderStats.revenue.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
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
        )}

        {/* Mobile Navigation */}
        {isMobile && (
          <div className="mb-6">
            <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-1 ${mobileMenuOpen ? 'block' : 'hidden'}`}>
              <div className="space-y-1">
                {['create', 'customers', 'orders'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab as any)}
                    className={`flex items-center space-x-3 w-full p-4 rounded-lg transition-all duration-300 ${
                      activeTab === tab 
                        ? 'text-white shadow-lg' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    style={{
                      background: activeTab === tab ? `linear-gradient(135deg, ${colors.primary}, #064e6a)` : 'transparent'
                    }}
                  >
                    {tab === 'create' && <Plus className="h-5 w-5" />}
                    {tab === 'customers' && <User className="h-5 w-5" />}
                    {tab === 'orders' && <Package className="h-5 w-5" />}
                    <span className="font-semibold capitalize">
                      {tab === 'create' ? 'New Order' : tab}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Mobile Tab Indicators */}
            <div className="flex justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-1">
              {['create', 'customers', 'orders'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab as any)}
                  className={`flex-1 py-3 text-center text-sm font-medium rounded-lg transition-all duration-300 ${
                    activeTab === tab 
                      ? 'text-white' 
                      : 'text-gray-600'
                  }`}
                  style={{
                    background: activeTab === tab ? colors.primary : 'transparent'
                  }}
                >
                  {tab === 'create' ? 'New' : tab === 'customers' ? 'Customers' : 'Orders'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Desktop Navigation */}
        {!isMobile && (
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
                  <Plus className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
                  <span className="font-semibold relative z-10 transition-all duration-300 group-hover:tracking-wide">Create Order</span>
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
                  <User className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
                  <span className="font-semibold relative z-10 transition-all duration-300 group-hover:tracking-wide">Customers</span>
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
                  <Package className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
                  <span className="font-semibold relative z-10 transition-all duration-300 group-hover:tracking-wide">Order History</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-3 animate-fade-in">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">Action Required</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="p-1 hover:bg-red-100 rounded-lg transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Enhanced Success Message */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl animate-slide-down">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900 text-sm">{successMessage.title}</p>
                <p className="text-green-700 text-xs mt-1">{successMessage.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className={`transition-all duration-500 ease-in-out ${tabTransition ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {activeTab === 'create' && (
            <div className="space-y-6 animate-fade-in">
              {/* Mobile Create Order */}
              {isMobile ? (
                <div className="space-y-4">
                  {/* Customer Selection */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <h3 className="font-semibold mb-3 text-gray-800">Customer Selection</h3>
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={handleSearch}
                          placeholder="Search customers..."
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>
                      
                      <button
                        onClick={() => {
                          setIsEditMode(false);
                          setCustomerFormData({ name: '', email: '', phone: '', address: '', pendingPayments: 0 });
                          setShowCustomerModal(true);
                        }}
                        className="flex items-center justify-center space-x-2 text-white w-full py-3 rounded-lg transition-all duration-300"
                        style={{ backgroundColor: colors.secondary }}
                      >
                        <User className="h-4 w-4" />
                        <span className="font-semibold">Add New Customer</span>
                      </button>
                    </div>

                    {/* Selected Customer Info */}
                    {orderFormData.customerName && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-blue-900">{orderFormData.customerName}</div>
                            <div className="text-sm text-blue-700">{orderFormData.customerPhone}</div>
                          </div>
                          <button
                            onClick={() => {
                              setOrderFormData({
                                ...orderFormData,
                                customerId: '',
                                customerName: '',
                                customerEmail: '',
                                customerPhone: '',
                                customerAddress: '',
                                customerPendingPayments: 0,
                                pendingPaid: false,
                              });
                            }}
                            className="p-1 hover:bg-blue-100 rounded"
                          >
                            <X className="h-4 w-4 text-blue-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Configuration */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <h3 className="font-semibold mb-3 text-gray-800">Order Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">
                          Payment Method
                        </label>
                        <select
                          value={orderFormData.paymentMethod}
                          onChange={(e) => setOrderFormData({ ...orderFormData, paymentMethod: e.target.value })}
                          className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                        >
                          <option value="Cash">Cash</option>
                          <option value="Debit Card">Debit Card</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={orderFormData.personalized}
                          onChange={(e) => setOrderFormData({ ...orderFormData, personalized: e.target.checked })}
                          className="w-5 h-5 rounded focus:ring-2 focus:ring-blue-500 text-blue-600"
                        />
                        <label className="text-sm font-medium text-gray-700">
                          Personalized Product
                        </label>
                      </div>

                      {/* Pending Payment Collection Checkbox */}
                      {orderFormData.customerPendingPayments > 0 && (
                        <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <input
                            type="checkbox"
                            checked={orderFormData.pendingPaid}
                            onChange={(e) => setOrderFormData({ ...orderFormData, pendingPaid: e.target.checked })}
                            className="w-5 h-5 rounded focus:ring-2 focus:ring-orange-500 text-orange-600"
                            id="pendingPaidMobile"
                          />
                          <label htmlFor="pendingPaidMobile" className="text-sm font-medium text-orange-800">
                            Collect pending payment (LKR {orderFormData.customerPendingPayments.toLocaleString()})
                          </label>
                        </div>
                      )}

                      <button
                        onClick={() => setShowScanner(true)}
                        className="flex items-center justify-center space-x-2 w-full text-white py-3 rounded-lg transition-all duration-300"
                        style={{ backgroundColor: colors.accent }}
                      >
                        <Scan className="h-4 w-4" />
                        <span className="font-semibold">Scan Product</span>
                      </button>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-800">Order Items</h3>
                      <button
                        onClick={addItem}
                        className="flex items-center space-x-1 text-white px-3 py-2 rounded-lg text-sm"
                        style={{ backgroundColor: colors.success }}
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Item</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {orderFormData.items.map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium mb-1 text-gray-700">
                                Product Name
                              </label>
                              <input
                                type="text"
                                value={item.productName}
                                onChange={(e) => handleProductSearch(index, e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                                placeholder="Enter product name"
                                required
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">
                                  Quantity
                                </label>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newItems = [...orderFormData.items];
                                    newItems[index].quantity = e.target.value;
                                    setOrderFormData({ ...orderFormData, items: newItems });
                                  }}
                                  className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                                  placeholder="0"
                                  min="1"
                                  required
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">
                                  Unit Price
                                </label>
                                <input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => {
                                    const newItems = [...orderFormData.items];
                                    newItems[index].unitPrice = e.target.value;
                                    setOrderFormData({ ...orderFormData, items: newItems });
                                  }}
                                  className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  required
                                />
                              </div>
                            </div>
                            
                            {item.quantity && item.unitPrice && Number(item.quantity) > 0 && Number(item.unitPrice) > 0 && (
                              <div className="p-2 bg-green-50 rounded border border-green-200">
                                <div className="flex justify-between text-sm">
                                  <span className="text-green-800">Item Total:</span>
                                  <span className="font-semibold text-green-900">
                                    LKR {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            <button
                              onClick={() => removeItem(index)}
                              disabled={orderFormData.items.length <= 1}
                              className="w-full bg-red-500 text-white py-2 rounded-lg disabled:bg-gray-300 transition-colors"
                            >
                              Remove Item
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <h3 className="font-semibold mb-4 text-gray-800">Order Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Items Total:</span>
                        <span className="font-semibold">LKR {currentTotal.toLocaleString()}</span>
                      </div>
                      
                      {orderFormData.customerPendingPayments > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pending Balance:</span>
                            <span className="font-semibold text-orange-600">
                              LKR {orderFormData.customerPendingPayments.toLocaleString()}
                            </span>
                          </div>
                          {orderFormData.pendingPaid && (
                            <div className="flex justify-between bg-green-50 p-2 rounded-lg border border-green-200">
                              <span className="text-green-700 text-sm">Pending payment collected</span>
                              <span className="font-semibold text-green-700 text-sm">
                                + LKR {orderFormData.customerPendingPayments.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200">
                        <span>Grand Total:</span>
                        <span style={{ color: colors.primary }}>
                          LKR {grandTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleOrderSubmit}
                      disabled={!orderFormData.customerId || orderFormData.items.length === 0}
                      className="w-full mt-4 text-white py-3 rounded-lg disabled:bg-gray-300 transition-all duration-300 font-semibold"
                      style={{ backgroundColor: colors.success }}
                    >
                      Create Order
                    </button>
                  </div>
                </div>
              ) : (
                /* Desktop Create Order */
                <div className="space-y-8">
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
                                <span className="font-semibold text-orange-600">LKR {orderFormData.customerPendingPayments.toLocaleString()}</span>
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

                          {/* Pending Payment Collection Checkbox */}
                          {orderFormData.customerPendingPayments > 0 && (
                            <div className="flex items-center space-x-3 p-4 bg-orange-50 rounded-xl border border-orange-200 transition-all duration-300 hover:shadow-md">
                              <input
                                type="checkbox"
                                checked={orderFormData.pendingPaid}
                                onChange={(e) => setOrderFormData({ ...orderFormData, pendingPaid: e.target.checked })}
                                className="w-5 h-5 rounded focus:ring-2 focus:ring-orange-500 text-orange-600 transition-all duration-300"
                                id="pendingPaidDesktop"
                              />
                              <label htmlFor="pendingPaidDesktop" className="text-sm font-semibold text-orange-800">
                                Collect pending payment of LKR {orderFormData.customerPendingPayments.toLocaleString()}
                              </label>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => setShowScanner(true)}
                            className="flex items-center space-x-3 text-white px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl justify-center transform hover:scale-105"
                            style={{ backgroundColor: colors.accent }}
                          >
                            <Scan className="h-5 w-5" />
                            <span className="font-semibold">Scan Product</span>
                          </button>
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
                                  
                                  {/* Enhanced Product Suggestions with Stock Info */}
                                  {showProductSuggestions[index] && productSuggestions[index] && productSuggestions[index].length > 0 && (
                                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-scale-in">
                                      {productSuggestions[index].map((product: any) => {
                                        const isVariant = !!(product && product.rawProduct);
                                        const displayName = isVariant ? product.displayName : (product.name || product.productType || 'Product');
                                        const pid = isVariant ? product.productId : (product._id || product.productId);
                                        const unit = isVariant ? product.size : (product.unit || '');
                                        const barcode = isVariant ? product.barcode : (product.barcode || '');
                                        const price = isVariant ? product.price : (product.unitPrice || 0);
                                        const qty = isVariant ? product.stock : (product.quantity || 0);
                                        const stockStatus = getStockStatus(isVariant ? { quantity: qty, lowStockThreshold: 10 } : (product as any));
                                        return (
                                          <div
                                            key={isVariant ? `${pid}_${product.variantIndex}` : (product._id || pid)}
                                            onClick={() => isVariant ? handleVariantSelect(index, product) : handleProductSelect(index, product)}
                                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-all duration-200 hover:translate-x-1 flex justify-between items-center"
                                          >
                                            <div className="flex-1">
                                              <div className="font-medium text-gray-900">{displayName}</div>
                                              <div className="text-xs text-gray-500 flex items-center space-x-2 mt-1">
                                                <span>ID: {pid}</span>
                                                {unit && (
                                                  <>
                                                    <span>•</span>
                                                    <span className="flex items-center">
                                                      <Layers className="h-3 w-3 mr-1" />
                                                      {unit}
                                                    </span>
                                                  </>
                                                )}
                                                {barcode && (
                                                  <>
                                                    <span>•</span>
                                                    <span>Barcode: {barcode}</span>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="font-semibold text-green-600">LKR {price?.toLocaleString()}</div>
                                              <div className={`text-xs ${stockStatus.color} ${stockStatus.bg} px-2 py-1 rounded-full mt-1`}>
                                                {stockStatus.text}: {qty}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
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
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-6 animate-fade-in">
              {/* Mobile Customers View */}
              {isMobile ? (
                <div className="space-y-4">
                  {/* Search and Filter */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search customers..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>
                      
                      <div className="flex space-x-2">
                        {['all', 'pending', 'clear'].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setCustomerFilter(filter as any)}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                              customerFilter === filter
                                ? 'text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                            style={{
                              backgroundColor: customerFilter === filter ? colors.primary : undefined
                            }}
                          >
                            {filter === 'all' ? 'All' : filter === 'pending' ? 'Pending' : 'Clear'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Customers List */}
                  <div>
                    {loading.customers ? (
                      <div className="flex justify-center items-center py-12">
                        <div 
                          className="animate-spin rounded-full h-8 w-8 border-b-2"
                          style={{ borderColor: colors.secondary }}
                        ></div>
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-xl p-6">
                        <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">No customers found</h3>
                        <p className="text-gray-500 mb-4">Start by adding your first customer</p>
                        <button
                          onClick={() => {
                            setIsEditMode(false);
                            setCustomerFormData({ name: '', email: '', phone: '', address: '', pendingPayments: 0 });
                            setShowCustomerModal(true);
                          }}
                          className="flex items-center space-x-2 text-white px-4 py-2 rounded-lg mx-auto"
                          style={{ backgroundColor: colors.primary }}
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add First Customer</span>
                        </button>
                      </div>
                    ) : (
                      <div>
                        {filteredCustomersByPayment
                          .filter(customer => 
                            customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            customer.phone.includes(searchQuery)
                          )
                          .map((customer) => (
                            <MobileCustomerRow key={customer._id} customer={customer} />
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Desktop Customers View */
                <div className="space-y-8">
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
                            {filteredCustomersByPayment.length} customers
                          </span>
                        </h2>
                        
                        <div className="flex items-center space-x-4">
                          {/* Customer Filter Buttons */}
                          <div className="flex bg-white/20 rounded-lg p-1">
                            <button
                              onClick={() => setCustomerFilter('all')}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-300 ${
                                customerFilter === 'all' 
                                  ? 'bg-white text-gray-800 shadow-sm' 
                                  : 'text-white hover:bg-white/10'
                              }`}
                            >
                              All
                            </button>
                            <button
                              onClick={() => setCustomerFilter('pending')}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-300 ${
                                customerFilter === 'pending' 
                                  ? 'bg-orange-500 text-white shadow-sm' 
                                  : 'text-white hover:bg-white/10'
                              }`}
                            >
                              Pending
                            </button>
                            <button
                              onClick={() => setCustomerFilter('clear')}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-300 ${
                                customerFilter === 'clear' 
                                  ? 'bg-green-500 text-white shadow-sm' 
                                  : 'text-white hover:bg-white/10'
                              }`}
                            >
                              Clear
                            </button>
                          </div>

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
                        <div className="overflow-hidden rounded-xl border border-gray-200">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-900">Customer</th>
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-900">Contact</th>
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-900">Address</th>
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-900">Status</th>
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-900">Pending Amount</th>
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-900">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {filteredCustomersByPayment
                                .filter(customer => 
                                  customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  customer.phone.includes(searchQuery)
                                )
                                .map((customer) => (
                                <tr 
                                  key={customer._id} 
                                  className="bg-white hover:bg-gray-50 transition-colors duration-200"
                                >
                                  <td className="py-4 px-6">
                                    <div>
                                      <div className="font-semibold text-gray-900">{customer.name}</div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <Mail className="h-3 w-3" />
                                        <span>{customer.email}</span>
                                      </div>
                                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <Phone className="h-3 w-3" />
                                        <span>{customer.phone}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="text-sm text-gray-600 max-w-xs">
                                      {customer.address}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      customer.pendingPayments > 0 
                                        ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                                        : 'bg-green-100 text-green-800 border border-green-200'
                                    }`}>
                                      {customer.pendingPayments > 0 ? 'Pending' : 'Clear'}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="text-sm font-semibold text-orange-600">
                                      LKR {customer.pendingPayments.toLocaleString()}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => generateCustomerInvoices(customer._id)}
                                        className="flex items-center space-x-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-all duration-300 text-sm transform hover:scale-105"
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
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fade-in">
              {/* Mobile Orders View */}
              {isMobile ? (
                <div className="space-y-4">
                  {/* Search and Filter */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search orders..."
                          value={orderSearchQuery}
                          onChange={handleOrderSearch}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                        />
                        {orderSearchQuery && (
                          <button
                            onClick={() => setOrderSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </button>
                        )}
                      </div>
                      
                      <button
                        onClick={showHiddenOrders ? () => setShowHiddenOrders(false) : handleShowPersonalizedOrders}
                        className={`w-full py-3 rounded-lg transition-colors font-medium ${
                          showHiddenOrders 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {showHiddenOrders ? 'Hide Personalized' : 'Show Personalized'}
                      </button>
                    </div>
                  </div>

                  {/* Orders List */}
                  <div>
                    {loading.orders ? (
                      <div className="flex justify-center items-center py-12">
                        <div 
                          className="animate-spin rounded-full h-8 w-8 border-b-2"
                          style={{ borderColor: colors.accent }}
                        ></div>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-xl p-6">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">No orders found</h3>
                        <p className="text-gray-500">Create your first order to get started</p>
                      </div>
                    ) : displayedOrders.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-xl p-6">
                        <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">No orders found</h3>
                        <p className="text-gray-500 mb-4">
                          No orders matching "<span className="font-semibold">{orderSearchQuery}</span>"
                        </p>
                        <button
                          onClick={() => setOrderSearchQuery('')}
                          className="flex items-center space-x-2 text-white px-4 py-2 rounded-lg mx-auto"
                          style={{ backgroundColor: colors.primary }}
                        >
                          <X className="h-4 w-4" />
                          <span>Clear Search</span>
                        </button>
                      </div>
                    ) : (
                      <div>
                        {displayedOrders.map((order) => (
                          <MobileOrderCard key={order._id} order={order} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Desktop Orders View */
                <div className="space-y-8">
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
                            {displayedOrders.length} of {orders.length} orders
                          </span>
                        </h2>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Search Input */}
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              placeholder="Search orders..."
                              value={orderSearchQuery}
                              onChange={handleOrderSearch}
                              className={`pl-10 pr-4 py-2 border border-gray-300 rounded-xl w-full lg:w-64 ${inputFocusStyle}`}
                            />
                            {orderSearchQuery && (
                              <button
                                onClick={() => setOrderSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              >
                                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              </button>
                            )}
                          </div>
                          
                          <button
                            onClick={showHiddenOrders ? () => setShowHiddenOrders(false) : handleShowPersonalizedOrders}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                              showHiddenOrders 
                                ? 'bg-white text-teal-700 shadow-lg transform scale-105' 
                                : 'bg-white/20 text-white hover:bg-white/30 hover:scale-105'
                            }`}
                            style={{ color: showHiddenOrders ? colors.accent : 'white' }}
                          >
                            {showHiddenOrders ? <EyeOff className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            <span>{showHiddenOrders ? 'Hide Personalized' : 'Show Personalized'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Search Tips */}
                      {orderSearchQuery && (
                        <div className="mt-4 text-white/80 text-sm">
                          Searching in: Order ID, Customer Name, Email, Phone, Products, Status, Payment Method, Date
                        </div>
                      )}
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
                      ) : displayedOrders.length === 0 ? (
                        <div className="text-center py-12">
                          <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-600 mb-2">No orders found</h3>
                          <p className="text-gray-500 mb-4">
                            No orders matching "<span className="font-semibold">{orderSearchQuery}</span>"
                          </p>
                          <button
                            onClick={() => setOrderSearchQuery('')}
                            className="flex items-center space-x-2 text-white px-4 py-2 rounded-xl transition-all duration-300 mx-auto transform hover:scale-105"
                            style={{ backgroundColor: colors.primary }}
                          >
                            <X className="h-4 w-4" />
                            <span>Clear Search</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {displayedOrders.map((order) => (
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
                                    {/* Delete Order Button with PIN protection */}
                                    <button
                                      onClick={() => handleDeleteOrderClick(order._id)}
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
                                            {item.unit && (
                                              <div className="text-xs text-gray-500 flex items-center mt-1">
                                                <Layers className="h-3 w-3 mr-1" />
                                                {item.unit}
                                              </div>
                                            )}
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
          )}
        </div>

        {/* Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`bg-white rounded-2xl shadow-2xl ${isMobile ? 'w-full max-w-full' : 'max-w-md w-full'} transform animate-scale-in`}>
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
                  style={{ minHeight: isMobile ? '250px' : '300px' }}
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
            <div className={`bg-white rounded-2xl shadow-2xl ${isMobile ? 'w-full max-w-full' : 'max-w-md w-full'} transform animate-scale-in`}>
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
            <div className={`bg-white rounded-2xl shadow-2xl ${isMobile ? 'w-full max-w-full' : 'max-w-md w-full'} transform animate-scale-in`}>
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

        {/* Password Modal for Personalized Orders */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`bg-white rounded-2xl shadow-2xl ${isMobile ? 'w-full max-w-full' : 'max-w-md w-full'} transform animate-scale-in`}>
              <div 
                className="p-6 rounded-t-2xl text-white transition-all duration-500"
                style={{ backgroundColor: colors.primary }}
              >
                <h3 className="text-xl font-bold flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Enter Password</span>
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">
                    Password Required
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Please enter the password to view personalized orders.
                  </p>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className={`w-full p-4 border border-gray-300 rounded-xl bg-gray-50 ${inputFocusStyle}`}
                    placeholder="Enter password"
                    autoFocus
                  />
                </div>
                
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordInput('');
                    }}
                    className="flex-1 bg-gray-500 text-white py-4 rounded-xl hover:bg-gray-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={verifyPassword}
                    className="flex-1 text-white py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    style={{ backgroundColor: colors.success }}
                  >
                    Verify
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* PIN Modal for Order Deletion */}
        {showPinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`bg-white rounded-2xl shadow-2xl ${isMobile ? 'w-full max-w-full' : 'max-w-md w-full'} transform animate-scale-in`}>
              <div 
                className="p-6 rounded-t-2xl text-white transition-all duration-500"
                style={{ backgroundColor: colors.error }}
              >
                <h3 className="text-xl font-bold flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Enter PIN</span>
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">
                    PIN Required
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Please enter the PIN to delete this order.
                  </p>
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className={`w-full p-4 border border-gray-300 rounded-xl bg-gray-50 ${inputFocusStyle}`}
                    placeholder="Enter PIN"
                    autoFocus
                    maxLength={4}
                  />
                </div>
                
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={() => {
                      setShowPinModal(false);
                      setPinInput('');
                      setPendingDeleteOrderId(null);
                    }}
                    className="flex-1 bg-gray-500 text-white py-4 rounded-xl hover:bg-gray-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={verifyPin}
                    className="flex-1 text-white py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    style={{ backgroundColor: colors.error }}
                  >
                    Verify & Delete
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

        /* Mobile Responsive Styles */
        @media (max-width: 768px) {
          .mobile-container {
            padding: 1rem !important;
          }
          
          .mobile-hidden {
            display: none;
          }
          
          input, select, textarea {
            font-size: 16px; /* Prevents zoom on iOS */
          }
          
          button, .clickable {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
};

export default Orders;