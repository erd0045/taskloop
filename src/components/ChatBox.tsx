import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, File, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ChatType, MessageType, FileAttachment } from '@/lib/types';
import FileAttachmentDisplay from './FileAttachment';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChatBoxProps {
  chat: ChatType;
  messages: MessageType[];
  onSendMessage: (content: string, attachment?: FileAttachment) => void;
  isSending?: boolean;
  refreshMessages?: () => void;
}

const ChatBox = ({ chat, messages, onSendMessage, isSending = false, refreshMessages }: ChatBoxProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [filePreview, setFilePreview] = useState<FileAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localMessages, setLocalMessages] = useState<MessageType[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Update local messages when props messages change
  useEffect(() => {
    setLocalMessages(messages);
    // Scroll to bottom whenever messages update
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMessage.trim() || filePreview) {
      // Add message to local state immediately for better UX
      if (user) {
        const optimisticMessage: MessageType = {
          id: `temp-${Date.now()}`,
          senderId: user.id,
          senderName: user.email?.split('@')[0] || 'Me',
          receiverId: chat.participantId,
          content: newMessage,
          timestamp: new Date(),
          read: false,
          attachment: filePreview || undefined,
          isOptimistic: true
        };
        
        setLocalMessages(prevMessages => [...prevMessages, optimisticMessage]);
      }
      
      // Send the actual message
      await onSendMessage(newMessage, filePreview || undefined);
      
      // Reset form state
      setNewMessage('');
      setFilePreview(null);
      
      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "File size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Create unique filename to avoid collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;
      
      console.log("Attempting to upload file to chat_attachments bucket:", filePath);
      
      // Check if bucket exists before uploading
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
        throw new Error('Unable to access storage buckets');
      }
      
      const chatAttachmentsBucketExists = buckets.some(bucket => bucket.name === 'chat_attachments');
      
      if (!chatAttachmentsBucketExists) {
        console.error('chat_attachments bucket not found');
        throw new Error('Storage bucket not found. Please contact administrator.');
      }
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(filePath, file);
        
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(filePath);
        
      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error("Failed to get public URL");
      }
      
      // Create file attachment object
      const attachment: FileAttachment = {
        id: `file-${Date.now()}`,
        name: file.name,
        type: file.type,
        url: publicUrlData.publicUrl,
        size: file.size,
      };
      
      console.log("File uploaded successfully:", attachment);
      
      setFilePreview(attachment);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file. Please try again.",
        variant: "destructive"
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    if (filePreview?.url && filePreview.url.includes('supabase')) {
      // Extract the file path from the URL to delete from storage
      try {
        const url = new URL(filePreview.url);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.findIndex(part => part === 'storage') + 2; // +2 to skip 'storage/v1/'
        if (bucketIndex >= 2) {
          const filePath = pathParts.slice(bucketIndex).join('/');
          
          // Delete the file from storage
          supabase.storage
            .from('chat_attachments')
            .remove([filePath])
            .then(() => {
              console.log('Cancelled file upload, removed from storage');
            })
            .catch(err => {
              console.error("Error removing file from storage:", err);
            });
        }
      } catch (e) {
        console.error("Error parsing file URL:", e);
      }
    }
    
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Mark messages as read
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (user && localMessages.length > 0 && chat.id) {
        const unreadMessages = localMessages.filter(
          msg => !msg.read && msg.senderId !== user.id && !msg.isOptimistic
        );
        
        if (unreadMessages.length > 0) {
          const messageIds = unreadMessages.map(msg => msg.id);
          
          await supabase
            .from('messages')
            .update({ read: true })
            .in('id', messageIds);
        }
      }
    };
    
    markMessagesAsRead();
  }, [localMessages, user, chat.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  // Set up real-time message subscription
  useEffect(() => {
    if (!chat.id) return;
    
    const channel = supabase
      .channel(`chat-messages-${chat.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${chat.id}` 
        }, 
        async (payload) => {
          console.log('New message received:', payload);
          
          // If this message was from another user, add it to our local state
          if (payload.new && payload.new.sender_id !== user?.id) {
            // Fetch sender info
            const { data: senderData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', payload.new.sender_id)
              .single();
              
            let attachment: FileAttachment | undefined = undefined;
            
            if (payload.new.attachment) {
              try {
                const parsedAttachment = typeof payload.new.attachment === 'string' 
                  ? JSON.parse(payload.new.attachment) 
                  : payload.new.attachment;
                  
                attachment = {
                  id: parsedAttachment.id || `file-${Date.now()}`,
                  name: parsedAttachment.name,
                  type: parsedAttachment.type,
                  url: parsedAttachment.url,
                  size: parsedAttachment.size
                };
              } catch (e) {
                console.error("Error parsing attachment:", e);
              }
            }
            
            const newMessage: MessageType = {
              id: payload.new.id,
              senderId: payload.new.sender_id,
              senderName: senderData?.username || 'User',
              receiverId: payload.new.receiver_id,
              content: payload.new.content,
              timestamp: new Date(payload.new.timestamp),
              read: false,
              attachment: attachment
            };
            
            // Add to local state
            setLocalMessages(prevMessages => {
              // Filter out optimistic messages that match this one
              const filtered = prevMessages.filter(m => 
                !(m.isOptimistic && m.content === newMessage.content && 
                  m.senderId === newMessage.senderId)
              );
              return [...filtered, newMessage];
            });
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chat.id, user?.id]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center">
        <Avatar className="mr-3">
          {chat.participantImage ? (
            <AvatarImage src={chat.participantImage} alt={chat.participantName} />
          ) : null}
          <AvatarFallback>
            {chat.participantName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-medium">{chat.participantName}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {localMessages.length > 0 ? (
          localMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  message.senderId === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                } ${message.isOptimistic ? 'opacity-70' : ''}`}
              >
                {message.content && <p>{message.content}</p>}
                
                {message.attachment && (
                  <FileAttachmentDisplay file={message.attachment} />
                )}
                
                <div
                  className={`text-xs mt-1 ${
                    message.senderId === user?.id
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground'
                  }`}
                >
                  {format(new Date(message.timestamp), 'HH:mm')}
                  {message.isOptimistic && ' (sending...)'}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        {filePreview && (
          <div className="mb-2 p-2 bg-muted rounded flex items-center justify-between">
            <div className="flex items-center">
              <File className="h-4 w-4 mr-2 text-blue-500" />
              <span className="text-sm truncate max-w-[250px]">{filePreview.name}</span>
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0" 
              onClick={handleRemoveFile}
              disabled={isUploading || isSending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={handleFileSelect}
                  disabled={isUploading || isSending}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach file (image, PDF, DOC, TXT, ZIP)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isUploading || isSending}
          />
          
          <Button 
            type="submit" 
            size="icon" 
            disabled={((!newMessage.trim() && !filePreview) || isUploading || isSending)}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
