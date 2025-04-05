
import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, MessageCircle, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { extendedSupabase } from '@/integrations/supabase/extended-client';

interface VerificationCodeCardProps {
  taskId: string;
  taskTitle: string;
  code: string;
  partnerId: string;
  partnerName: string;
  isDoer: boolean;
  isVerified: boolean;
  isPartnerVerified: boolean;
  isRated: boolean;
  isPartnerRated: boolean;
  onVerify: (taskId: string, code: string) => Promise<boolean>;
  onRequestRating: () => void;
}

const VerificationCodeCard: React.FC<VerificationCodeCardProps> = ({
  taskId,
  taskTitle,
  code,
  partnerId,
  partnerName,
  isDoer,
  isVerified,
  isPartnerVerified,
  isRated,
  isPartnerRated,
  onVerify,
  onRequestRating
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCodeCopy = () => {
    navigator.clipboard.writeText(code);
    toast({
      description: "Verification code copied to clipboard"
    });
  };

  const handleShareViaChat = async () => {
    setIsProcessing(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        throw new Error("User not authenticated");
      }
      
      // Check for existing chat
      const { data: existingChats, error: chatError } = await extendedSupabase
        .from('chats')
        .select('*')
        .or(`and(user1_id.eq.${userId},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${userId})`)
        .limit(1);
        
      if (chatError) throw chatError;
      
      let chatId;
      
      if (existingChats && existingChats.length > 0) {
        chatId = existingChats[0].id;
      } else {
        // Create a new chat
        const { data: newChat, error: createError } = await extendedSupabase
          .from('chats')
          .insert({
            user1_id: userId,
            user2_id: partnerId
          })
          .select()
          .single();
          
        if (createError) throw createError;
        chatId = newChat.id;
      }
      
      // Send the verification code via chat
      await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: userId,
          receiver_id: partnerId,
          content: `My verification code for task "${taskTitle}" is: ${code}`,
          read: false
        });
      
      toast({
        title: "Code Shared",
        description: "Verification code was shared via chat."
      });
      
      // Navigate to chat with this user
      navigate('/chat', { 
        state: { 
          activeChatId: chatId,
          participant: {
            id: partnerId,
            name: partnerName
          }
        }
      });
      
    } catch (error) {
      console.error("Error sharing code via chat:", error);
      toast({
        title: "Error",
        description: "Failed to share code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter the verification code.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const success = await onVerify(taskId, verificationCode);
      
      if (success) {
        toast({
          title: "Verification Successful",
          description: "The code has been verified successfully."
        });
        setVerificationCode('');
      } else {
        toast({
          title: "Verification Failed",
          description: "The code you entered is incorrect.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      toast({
        title: "Error",
        description: "Failed to verify code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStatus = () => {
    if (isVerified && isPartnerVerified) {
      if (!isRated) {
        return (
          <div className="text-yellow-600 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" /> 
            <span>Please rate your partner to complete this task</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2" 
              onClick={onRequestRating}
            >
              Rate now
            </Button>
          </div>
        );
      } else if (!isPartnerRated) {
        return <span className="text-yellow-600">Waiting for your partner to rate you</span>;
      } else {
        return <span className="text-green-600 flex items-center"><Check className="h-4 w-4 mr-1" /> Task fully completed</span>;
      }
    } else if (isVerified) {
      return <span className="text-yellow-600">Waiting for {isDoer ? "creator" : "doer"} confirmation</span>;
    } else if (isPartnerVerified) {
      return <span className="text-yellow-600">{isDoer ? "Creator" : "Doer"} has verified. Please verify to continue.</span>;
    } else {
      return <span className="text-muted-foreground">Task in progress. Verify codes to complete.</span>;
    }
  };

  const verificationInstructions = isDoer 
    ? "Enter the verification code from the task creator to verify completion" 
    : "Enter the verification code from the task doer to verify completion";

  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <CardTitle className="text-lg">{taskTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Your Verification Code:</p>
            <div className="flex">
              <div className="bg-muted p-2 rounded-l-md border border-r-0 font-mono text-center flex-1">
                {code}
              </div>
              <Button
                variant="outline"
                className="rounded-l-none"
                onClick={handleCodeCopy}
                disabled={isProcessing}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Share this code with the {isDoer ? "task creator" : "task doer"} to verify task completion
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">{isDoer ? "Enter Creator's Code:" : "Enter Doer's Code:"}</p>
            <div className="flex">
              <Input
                placeholder={verificationInstructions}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="rounded-r-none"
                disabled={isVerified || isProcessing}
              />
              <Button
                variant="default"
                className="rounded-l-none"
                onClick={handleVerifyCode}
                disabled={isVerified || isProcessing || !verificationCode.trim()}
              >
                Verify
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm">{renderStatus()}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleShareViaChat}
          disabled={isProcessing}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Share Code via Chat
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VerificationCodeCard;
