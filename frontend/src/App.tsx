import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/AdminDashboard';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Packing from './pages/Packing';
import Analytics from './pages/Analytics';

const socket = io(import.meta.env.VITE_API_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    socket.on('connect', () => console.log('Connected to Socket.io'));
    socket.on('connect_error', (err) => console.log('Socket.io error:', err));
    socket.on('packingUpdate', (data) => console.log('Packing update:', data));

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('packingUpdate');
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {isAuthenticated && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
        <Route
          path="/"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/inventory"
          element={isAuthenticated ? <Inventory /> : <Navigate to="/login" />}
        />
        <Route
          path="/orders"
          element={isAuthenticated ? <Orders socket={socket} /> : <Navigate to="/login" />}
        />
        <Route
          path="/packing/:orderId"
          element={isAuthenticated ? <Packing socket={socket} /> : <Navigate to="/login" />}
        />
        <Route
          path="/analytics"
          element={isAuthenticated ? <Analytics /> : <Navigate to="/login" />}
        />
      </Routes>
    </div>
  );
};

export default App;
