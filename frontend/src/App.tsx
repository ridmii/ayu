import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import Navbar from './components/Navbar';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Login from './pages/Login';
import ErrorBoundary from './components/ErrorBoundary';
import PackingAdmin from './pages/Packing';  // Admin interface
import PackingSuccess from './components/PackingSuccess';
import PackerSimple from './components/PackerSimple';  // Packer interface
import PackerPC from './components/PackerPC';
import Footer from './components/Footer';

function AppRoutes() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/packing';
  // Check token in URL and in sessionStorage so a refresh keeps the user locked to the packer view
  const tokenInURL = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('token');
  const storedToken = typeof window !== 'undefined' ? sessionStorage.getItem('packer_token') : null;
  // If token present in URL, persist it so refreshes keep packer-only UI
  if (typeof window !== 'undefined' && tokenInURL) {
    const t = new URLSearchParams(window.location.search).get('token');
    if (t) sessionStorage.setItem('packer_token', t);
  }
  const tokenPresent = !!tokenInURL || !!storedToken;
  const [socket] = useState<Socket>(() => 
    io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000')
  );
  // If a packer token is present in the URL, expose only the packer UI and nothing else
  if (tokenPresent) {
    const pathname = window.location.pathname || '';
    // If the URL uses the packer PC path, show PC interface; otherwise show simple mobile interface
    if (pathname.startsWith('/for-packer')) {
      return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
          <ErrorBoundary>
            <Routes>
                <Route path="/for-packer" element={<PackerPC />} />
                <Route path="/packing-success" element={<PackingSuccess />} />
                <Route path="*" element={<PackerPC />} />
            </Routes>
          </ErrorBoundary>
          <Footer />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100">
        <ErrorBoundary>
          <Routes>
              <Route path="/packing" element={<PackerSimple socket={socket} />} />
            <Route path="/packing-success" element={<PackingSuccess />} />
            {/* Redirect any other path to packing to avoid accidental navigation */}
              <Route path="*" element={<PackerSimple socket={socket} />} />
          </Routes>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {!hideNavbar && <Navbar />}
      <ErrorBoundary>
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/orders" element={<Orders socket={socket} />} />
            <Route path="/products" element={<Products socket={socket} />} />
            
            {/* ADMIN PACKING MANAGEMENT */}
            <Route path="/packing-admin" element={<PackingAdmin socket={socket} />} />
            
            {/* PACKER SIMPLE INTERFACE */}
            <Route path="/packing" element={<PackerSimple socket={socket} />} />
            
            <Route path="/packing-success" element={<PackingSuccess />} />
            <Route path="/" element={<Inventory />} />
        </Routes>
      </ErrorBoundary>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;