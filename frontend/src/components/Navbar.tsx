import { Link, useNavigate } from 'react-router-dom';

interface Props {
  setIsAuthenticated: (value: boolean) => void;
}

const Navbar = ({ setIsAuthenticated }: Props) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <nav className="bg-green-500 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="space-x-4">
          <Link to="/" className="text-white hover:text-gray-200">Dashboard</Link>
          <Link to="/inventory" className="text-white hover:text-gray-200">Inventory</Link>
          <Link to="/orders" className="text-white hover:text-gray-200">Orders</Link>
          <Link to="/packing" className="text-white hover:text-gray-200">Packing</Link>
          <Link to="/analytics" className="text-white hover:text-gray-200">Analytics</Link>
        </div>
        <button onClick={handleLogout} className="text-white hover:text-gray-200">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;