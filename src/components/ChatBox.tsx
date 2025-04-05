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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const [openPreviewDialog, setOpenPreviewDialog] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);


  // Update local messages when props messages change
  useEffect(() => {
    setLocalMessages(messages);
    
    // Scroll to bottom when messages are loaded or chat changes
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

      try {
        // Ensure the filePreview is properly structured before sending
        let attachmentToSend = undefined;
        if (filePreview) {
          // Create a clean attachment object to prevent circular references
          attachmentToSend = {
            id: filePreview.id || `file-${Date.now()}`,
            name: filePreview.name || 'unnamed file',
            type: filePreview.type || 'application/octet-stream',
            url: filePreview.url || '',
            size: filePreview.size || 0
          };

          console.log("Prepared attachment for sending:", JSON.stringify(attachmentToSend));
        }

        // Send the actual message
        await onSendMessage(newMessage, attachmentToSend);

        console.log("Message sent successfully with attachment:", attachmentToSend);

        // Reset form state
        setNewMessage('');
        setFilePreview(null);
      } catch (error) {
        console.error("Error sending message:", error);
        // Show the actual error message if available
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast({
          title: "Error sending message",
          description: `Your message could not be sent: ${errorMessage}`,
          variant: "destructive"
        });
      }

      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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

      // Create a folder with the user's ID to organize files by user
      const filePath = `${user.id}/${fileName}`;

      console.log("Attempting to upload file:", filePath);

      // Try both storage buckets in sequence
      let fileUrl: string | null = null;
      let uploadSuccess = false;

      // First try chat_attachments bucket
      try {
        const { data: chatAttachData, error: chatAttachError } = await supabase.storage
          .from('chat_attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (!chatAttachError) {
          // Get the public URL
          const { data: publicUrlData } = await supabase.storage
            .from('chat_attachments')
            .getPublicUrl(filePath);

          fileUrl = publicUrlData.publicUrl;
          uploadSuccess = true;
          console.log('File uploaded successfully to chat_attachments bucket');
        } else {
          console.error('chat_attachments upload failed:', chatAttachError);
        }
      } catch (err) {
        console.error('Error with chat_attachments bucket:', err);
      }

      // If chat_attachments failed, try user-content bucket
      if (!uploadSuccess) {
        try {
          const userContentPath = `chat_files/${user.id}/${fileName}`;

          const { data: userContentData, error: userContentError } = await supabase.storage
            .from('user-content')
            .upload(userContentPath, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (!userContentError) {
            // Get the public URL
            const { data: publicUrlData } = await supabase.storage
              .from('user-content')
              .getPublicUrl(userContentPath);

            fileUrl = publicUrlData.publicUrl;
            uploadSuccess = true;
            console.log('File uploaded successfully to user-content bucket');
          } else {
            console.error('user-content upload failed:', userContentError);
            throw userContentError;
          }
        } catch (err) {
          console.error('Error with user-content bucket:', err);
          throw err;
        }
      }

      if (!uploadSuccess || !fileUrl) {
        throw new Error('Failed to upload file to any storage bucket');
      }

      // Create the attachment object with the file information
      const attachment: FileAttachment = {
        id: `file-${Date.now()}`,
        name: file.name,
        type: file.type,
        url: fileUrl,
        size: file.size,
      };

      console.log("File attachment created:", attachment);

      // Make sure attachment object is fully serializable
      const safeAttachment = JSON.parse(JSON.stringify(attachment));
      setFilePreview(safeAttachment);

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('Error uploading file:', error);
      let errorMessage = "Something went wrong while uploading the file";

      if (error.message) {
        if (error.message.includes('new row violates row-level security')) {
          errorMessage = "Upload failed due to security policy. Your account doesn't have permission to upload files.";
        } else if (error.message.includes('size')) {
          errorMessage = "File size exceeds the maximum allowed limit (5MB).";
        } else if (error.message.includes('not found')) {
          errorMessage = "Storage bucket not found. Please contact administrator.";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive"
      });
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

        // Determine bucket name from URL
        const bucketName = url.pathname.includes('chat_attachments') ? 'chat_attachments' : 'user-content';

        // Find the start of the actual path within the bucket
        let bucketIndex = -1;
        if (bucketName === 'chat_attachments') {
          bucketIndex = pathParts.findIndex(part => part === 'chat_attachments') + 1;
        } else {
          bucketIndex = pathParts.findIndex(part => part === 'user-content') + 1;
        }

        if (bucketIndex > 0) {
          const filePath = pathParts.slice(bucketIndex).join('/');
          console.log(`Attempting to remove file from ${bucketName}:`, filePath);

          // Delete the file from storage
          supabase.storage
            .from(bucketName)
            .remove([filePath])
            .then(({ data, error }) => {
              if (error) {
                console.error(`Error removing file from ${bucketName}:`, error);
              } else {
                console.log(`Successfully removed file from ${bucketName}:`, data);
              }
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

                {message.attachment && message.attachment.url && (
                  <div 
                    className="cursor-pointer" 
                    onClick={() => {
                      setPreviewFile(message.attachment || null);
                      setOpenPreviewDialog(true);
                    }}
                  >
                    <FileAttachmentDisplay file={message.attachment} />
                  </div>
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

      {/* File Preview Dialog */}
      <Dialog open={openPreviewDialog} onOpenChange={setOpenPreviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 p-4">
            {previewFile && (
              <>
                {previewFile.type.startsWith('image/') ? (
                  <a 
                    href={previewFile.url} 
                    download={previewFile.name}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img 
                      src={previewFile.url} 
                      alt={previewFile.name}
                      className="max-h-[500px] max-w-full object-contain rounded-md cursor-pointer hover:opacity-90"
                      title="Click to download"
                    />
                  </a>
                ) : (
                  <a 
                    href={previewFile.url} 
                    download={previewFile.name}
                    target="_blank"
                    rel="noreferrer"
                    className="cursor-pointer"
                  >
                    <div className="p-8 bg-muted rounded-md hover:bg-muted/80">
                      <FileAttachmentDisplay file={previewFile} />
                      <p className="text-center text-sm mt-2 text-muted-foreground">Click to download</p>
                    </div>
                  </a>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatBox;