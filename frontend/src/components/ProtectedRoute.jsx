import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, bootLoading } = useAuth();

  if (bootLoading) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-white">Checking session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;