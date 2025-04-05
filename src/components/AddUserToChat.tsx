
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extendedSupabase } from '@/integrations/supabase/extended-client';
import { useAuth } from '@/context/AuthContext';
import { UserPlus } from 'lucide-react';

interface AddUserToChatProps {
  onUserAdded: (chatId: string, userId: string, username: string) => void;
}

const AddUserToChat: React.FC<AddUserToChatProps> = ({ onUserAdded }) => {
  const [username, setUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAddUser = async () => {
    if (!username.trim() || !user) return;
    
    try {
      setIsSearching(true);
      
      // Search for user with the provided username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', username.trim())
        .limit(1);
        
      if (profileError) throw profileError;
      
      if (!profileData || profileData.length === 0) {
        toast({
          title: "User not found",
          description: "No user found with that username.",
          variant: "destructive"
        });
        return;
      }
      
      const targetUser = profileData[0];
      
      // Check if a chat already exists with this user
      const { data: existingChat, error: chatError } = await extendedSupabase
        .from('chats')
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUser.id}),and(user1_id.eq.${targetUser.id},user2_id.eq.${user.id})`)
        .limit(1);
        
      if (chatError) throw chatError;
      
      let chatId: string;
      
      if (existingChat && existingChat.length > 0) {
        // Use existing chat
        chatId = existingChat[0].id;
        
        toast({
          title: "Chat exists",
          description: "You already have a chat with this user."
        });
      } else {
        // Create a new chat
        const { data: newChat, error: createError } = await extendedSupabase
          .from('chats')
          .insert({
            user1_id: user.id,
            user2_id: targetUser.id
          })
          .select()
          .single();
          
        if (createError) throw createError;
        
        if (!newChat) {
          throw new Error('Failed to create chat');
        }
        
        chatId = newChat.id;
        
        // Send an initial greeting message
        await supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            sender_id: user.id,
            receiver_id: targetUser.id,
            content: `Hi ${targetUser.username}, I'd like to chat with you.`,
            read: false
          });
          
        toast({
          title: "Chat created",
          description: `Started a new chat with ${targetUser.username}`
        });
      }
      
      // Callback to update parent component
      onUserAdded(chatId, targetUser.id, targetUser.username);
      setIsOpen(false);
      setUsername('');
      
    } catch (error) {
      console.error('Error adding user to chat:', error);
      toast({
        title: "Error",
        description: "Failed to add user to chat. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add User to Chat</DialogTitle>
          <DialogDescription>
            Enter a username to start a new chat or continue an existing conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleAddUser} 
            disabled={!username.trim() || isSearching}
          >
            {isSearching ? 'Searching...' : 'Add User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserToChat;
