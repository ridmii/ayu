import { CheckCircle, Package, Home, ArrowLeft } from 'lucide-react';

const PackingSuccess = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-green-600 mb-2">Order Completed!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for completing the packing process. The order is now ready for shipping.
        </p>
        <div className="space-y-3">
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Home className="h-4 w-4" />
            <span>Return to Home</span>
          </button>
          <button 
            onClick={() => window.location.href = '/packing'}
            className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Packing</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackingSuccess;