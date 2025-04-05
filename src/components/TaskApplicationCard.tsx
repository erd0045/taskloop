
import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApplicationType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { extendedSupabase } from '@/integrations/supabase/extended-client';
import { useAuth } from '@/context/AuthContext';
import MaskedUsername from './MaskedUsername';

interface TaskApplicationCardProps {
  application: ApplicationType;
  onApprove: (applicationId: string, taskId: string, applicantId: string) => void;
  onReject: (applicationId: string) => void;
}

const TaskApplicationCard = ({ application, onApprove, onReject }: TaskApplicationCardProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleStartChat = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to message users.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Check if a chat already exists
      const { data: existingChats, error: chatCheckError } = await extendedSupabase
        .from('chats')
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${application.userId}),and(user1_id.eq.${application.userId},user2_id.eq.${user.id})`)
        .limit(1);
        
      if (chatCheckError) throw chatCheckError;
      
      let chatId;
      
      if (existingChats && existingChats.length > 0) {
        chatId = existingChats[0].id;
      } else {
        // Create a new chat
        const { data: newChat, error: createChatError } = await extendedSupabase
          .from('chats')
          .insert({
            user1_id: user.id,
            user2_id: application.userId
          })
          .select()
          .single();
          
        if (createChatError) throw createChatError;
        chatId = newChat.id;
      }
      
      navigate('/chat', { 
        state: { 
          activeChatId: chatId,
          participant: {
            id: application.userId,
            name: application.username
          }
        }
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = () => {
    setIsProcessing(true);
    onApprove(application.id, application.taskId, application.userId);
    setIsProcessing(false);
  };

  const handleReject = () => {
    setIsProcessing(true);
    onReject(application.id);
    setIsProcessing(false);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-lg">{application.taskTitle}</h3>
            <p className="text-sm text-muted-foreground">
              From: <MaskedUsername username={application.username} />
            </p>
          </div>
        </div>
        
        <div className="border-l-4 border-muted pl-3 my-3">
          <p className="text-sm italic">{application.message}</p>
        </div>
      </CardContent>
      
      <CardFooter className="px-4 py-3 flex justify-end space-x-2 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleStartChat}
          disabled={isProcessing}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          Message
        </Button>
        
        <Button 
          variant="default" 
          size="sm" 
          className="bg-green-600 hover:bg-green-700" 
          onClick={handleApprove}
          disabled={isProcessing}
        >
          <Check className="h-4 w-4 mr-1" />
          Approve
        </Button>
        
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={handleReject}
          disabled={isProcessing}
        >
          <X className="h-4 w-4 mr-1" />
          Reject
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TaskApplicationCard;
