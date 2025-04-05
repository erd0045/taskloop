
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, KeyRound, Check } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

// Define form validation schemas
const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

const ForgotPassword = () => {
  const [step, setStep] = useState<'email' | 'otp' | 'newPassword'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Setup query parameters for when we return from password reset link
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const type = queryParams.get('type');
    
    if (type === 'recovery') {
      setStep('newPassword');
    }
  }, [location]);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const handleSendResetLink = async (values: EmailFormValues) => {
    setLoading(true);
    setEmail(values.email);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/forgot-password?type=recovery`,
      });
      
      if (error) throw error;
      
      setSuccess(true);
      toast({
        title: "Reset Link Sent!",
        description: `Instructions have been sent to ${values.email}`,
      });
      
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (values: PasswordFormValues) => {
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password Reset Successfully!",
        description: "You can now login with your new password",
      });
      
      // Redirect to login page
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <Form {...emailForm}>
      <form onSubmit={emailForm.handleSubmit(handleSendResetLink)} className="space-y-4">
        <FormField
          control={emailForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="name@example.com"
                  className="input-dark"
                  disabled={loading || success}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={loading || success}
        >
          {loading ? (
            <>
              <Mail className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : success ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Email Sent
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send Reset Link
            </>
          )}
        </Button>
        
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            <p className="font-medium">Check your email</p>
            <p className="mt-1">We've sent you a link to reset your password. Please check your inbox and spam folder.</p>
          </div>
        )}
      </form>
    </Form>
  );

  const renderNewPasswordStep = () => (
    <Form {...passwordForm}>
      <form onSubmit={passwordForm.handleSubmit(handleResetPassword)} className="space-y-4">
        <FormField
          control={passwordForm.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  placeholder="Must have at least 8 characters"
                  className="input-dark"
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={passwordForm.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  placeholder="Confirm your new password"
                  className="input-dark"
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <KeyRound className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <KeyRound className="mr-2 h-4 w-4" />
              Reset Password
            </>
          )}
        </Button>
      </form>
    </Form>
  );

  return (
    <div className="flex flex-col items-center min-h-screen bg-background">
      <div className="w-full text-center py-12">
        <h1 className="text-5xl font-bold text-primary">TaskLoop</h1>
      </div>

      <div className="w-full max-w-md px-4 md:px-0">
        <div className="border-border bg-card p-6 rounded-lg shadow-md space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-accent"></div>
          
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-center">Reset Password</h2>
            <p className="text-center text-muted-foreground text-sm">
              {step === 'email' && "Enter your email to receive a reset link"}
              {step === 'newPassword' && "Create a new password for your account"}
            </p>
          </div>
          
          <div className="space-y-6">
            {step === 'email' && renderEmailStep()}
            {step === 'newPassword' && renderNewPasswordStep()}
            
            <div className="text-center text-sm">
              Remember your password?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
