
import React, { ReactNode } from 'react';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface LayoutProps {
  children: ReactNode;
  onSearch?: (term: string) => void;
  requireAuth?: boolean;
}

const Layout = ({ 
  children, 
  onSearch,
  requireAuth = false
}: LayoutProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Check if authentication is required but user is not authenticated
  React.useEffect(() => {
    if (requireAuth && !loading && !user) {
      navigate('/login');
    }
  }, [requireAuth, user, loading, navigate]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // If authentication is required but user is not authenticated, don't render anything
  // The useEffect above will redirect to login
  if (requireAuth && !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar onSearch={onSearch} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;
