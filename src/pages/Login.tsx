
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  // Check for verification pending status
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const verification = queryParams.get('verification');
    
    if (verification === 'pending') {
      setShowVerificationAlert(true);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    const { error } = await signIn(email, password);
    
    if (!error) {
      // If login was successful, navigate to home
      navigate('/home');
    }
    
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-background">
      <div className="w-full text-center py-12">
        <h1 className="text-5xl font-bold text-primary">TaskLoop</h1>
      </div>
      
      <div className="w-full max-w-md px-4 md:px-0">
        <div className="border-border bg-card p-6 rounded-lg shadow-md space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-accent"></div>
          
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-center">Welcome Back</h2>
            <p className="text-center text-muted-foreground text-sm">
              Sign in to continue using TaskLoop
            </p>
          </div>
          
          {showVerificationAlert && (
            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertTitle>Verification Email Sent</AlertTitle>
              <AlertDescription>
                Please check your email inbox and verify your account before logging in.
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  className="input-dark" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your password" 
                  className="input-dark" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe} 
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    disabled={loading}
                  />
                  <label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Remember for 30 days
                  </label>
                </div>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
            
            <div className="text-center text-sm">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <Link to="/" className="text-sm text-primary hover:underline">
                Back to Home
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
