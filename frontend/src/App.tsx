import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import Navbar from './components/Navbar';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Login from './pages/Login';
import ErrorBoundary from './components/ErrorBoundary';
import Packing from './pages/Packing';  // ADD

function App() {
  const [socket] = useState<Socket>(() => 
    io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000')
  );

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/orders" element={<Orders socket={socket} />} />
            <Route path="/products" element={<Products />} />
            <Route path="/packing" element={<Packing />} />  // ADD
            <Route path="/" element={<Inventory />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </Router>
  );
}

export default App;