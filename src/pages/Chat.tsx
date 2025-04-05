import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ChatList from '@/components/ChatList';
import ChatBox from '@/components/ChatBox';
import AddUserToChat from '@/components/AddUserToChat';
import { ChatType, MessageType, FileAttachment } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { extendedSupabase } from '@/integrations/supabase/extended-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const Chat = () => {
  const [chats, setChats] = useState<ChatType[]>([]);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [activeChat, setActiveChat] = useState<ChatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChats = async () => {
      try {
        if (!user) return;

        setIsLoading(true);

        const { data: chatsData, error: chatsError } = await extendedSupabase
          .from('chats')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (chatsError) {
          console.error('Error fetching chats:', chatsError);
          throw chatsError;
        }

        const processedChats: ChatType[] = await Promise.all(
          (chatsData || []).map(async (chat) => {
            const isUser1 = chat.user1_id === user.id;
            const participantId = isUser1 ? chat.user2_id : chat.user1_id;

            const { data: participantData, error: participantError } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', participantId)
              .single();

            if (participantError) {
              console.error('Error fetching participant data:', participantError);
            }

            const participantName = participantData?.username || 'Unknown User';

            const { data: lastMessageData, error: lastMessageError } = await supabase
              .from('messages')
              .select('content, timestamp, read')
              .eq('chat_id', chat.id)
              .order('timestamp', { ascending: false })
              .limit(1);

            if (lastMessageError) {
              console.error('Error fetching last message:', lastMessageError);
            }

            const { data: unreadCountData, error: unreadCountError } = await supabase
              .from('messages')
              .select('id', { count: 'exact' })
              .eq('chat_id', chat.id)
              .eq('receiver_id', user.id)
              .eq('read', false);

            if (unreadCountError) {
              console.error('Error counting unread messages:', unreadCountError);
            }

            const unreadCount = unreadCountData?.length || 0;

            return {
              id: chat.id,
              participantId,
              participantName,
              lastMessage: lastMessageData && lastMessageData.length > 0 ? lastMessageData[0].content : undefined,
              lastMessageTime: lastMessageData && lastMessageData.length > 0 ? new Date(lastMessageData[0].timestamp) : undefined,
              unreadCount,
            };
          })
        );

        setChats(processedChats);

        if (location.state && location.state.activeChatId) {
          const chatFromState = processedChats.find(
            chat => chat.id === location.state.activeChatId
          );

          if (chatFromState) {
            setActiveChat(chatFromState);
            fetchMessages(chatFromState.id);
          }
        } else if (processedChats.length > 0) {
          setActiveChat(processedChats[0]);
          fetchMessages(processedChats[0].id);
        }
      } catch (error) {
        console.error('Error in fetchChats:', error);
        toast({
          title: "Error",
          description: "Failed to load chats. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();

    const chatChannel = supabase
      .channel('public:chats')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chats',
          filter: `user1_id=eq.${user?.id}` 
        }, 
        () => {
          fetchChats();
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chats',
          filter: `user2_id=eq.${user?.id}` 
        }, 
        () => {
          fetchChats();
        }
      )
      .subscribe();

    const messageChannel = supabase
      .channel('public:messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, 
        (payload) => {
          // Only fetch chats list (avoid refreshing the entire message list)
          fetchChats();

          // If we're in the active chat where a new message arrived,
          // the ChatBox component will handle showing it via its own subscription
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [user, toast, location]);

  const fetchMessages = async (chatId: string) => {
    try {
      if (!user) return;

      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const messagePromises = (messagesData || []).map(async (message: any) => {
        const { data: senderData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', message.sender_id)
          .single();

        let attachment: FileAttachment | undefined = undefined;

        if (message.attachment || message.attachment_url) {
          try {
            // Try to parse the attachment if it's a JSON string
            if (message.attachment) {
              const parsedAttachment = typeof message.attachment === 'string' 
                ? JSON.parse(message.attachment) 
                : message.attachment;

              attachment = {
                id: parsedAttachment.id || `file-${Date.now()}`,
                name: parsedAttachment.name || message.attachment_name || 'file',
                type: parsedAttachment.type || message.attachment_type || 'application/octet-stream',
                url: parsedAttachment.url || message.attachment_url || '',
                size: parsedAttachment.size || message.attachment_size || 0
              };
            } 
            // If attachment JSON parsing failed, try to use individual fields
            else if (message.attachment_url) {
              attachment = {
                id: `file-${Date.now()}`,
                name: message.attachment_name || 'file',
                type: message.attachment_type || 'application/octet-stream',
                url: message.attachment_url,
                size: message.attachment_size || 0
              };
            }
          } catch (e) {
            console.error("Error parsing attachment:", e);
            // If JSON parsing fails, try to use the individual fields
            if (message.attachment_url) {
              attachment = {
                id: `file-${Date.now()}`,
                name: message.attachment_name || 'file',
                type: message.attachment_type || 'application/octet-stream',
                url: message.attachment_url,
                size: message.attachment_size || 0
              };
            }
          }
        }

        return {
          id: message.id,
          senderId: message.sender_id,
          senderName: senderData?.username || 'Unknown User',
          receiverId: message.receiver_id,
          content: message.content,
          timestamp: new Date(message.timestamp),
          read: message.read || false,
          attachment: attachment
        };
      });

      const formattedMessages = await Promise.all(messagePromises);
      setMessages(formattedMessages);

      const unreadMessages = messagesData
        .filter(msg => !msg.read && msg.sender_id !== user.id)
        .map(msg => msg.id);

      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true })
          .in('id', unreadMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleChatSelect = (chat: ChatType) => {
    setActiveChat(chat);
    fetchMessages(chat.id);
  };

  const handleSendMessage = async (content: string, attachment?: FileAttachment) => {
    try {
      if (!user || !activeChat) return;

      setIsSending(true);

      const newMessage: any = {
        chat_id: activeChat.id,
        sender_id: user.id,
        receiver_id: activeChat.participantId,
        content: content,
        read: false,
      };

      if (attachment) {
        try {
          // Store attachment as a clean object to avoid JSON parsing issues
          const cleanAttachment = {
            id: attachment.id,
            name: attachment.name,
            type: attachment.type,
            url: attachment.url,
            size: attachment.size
          };

          // Store the clean attachment object directly (Supabase will handle JSONB conversion)
          newMessage.attachment = cleanAttachment;
          // Also store fields separately for easier querying
          newMessage.attachment_name = cleanAttachment.name;
          newMessage.attachment_type = cleanAttachment.type;
          newMessage.attachment_url = cleanAttachment.url;
          newMessage.attachment_size = cleanAttachment.size;

          console.log("Sending message with attachment:", JSON.stringify(newMessage));
        } catch (err) {
          console.error("Error preparing attachment:", err);
          throw new Error("Failed to prepare attachment data");
        }
      }

      try {
        const { data, error } = await supabase
          .from('messages')
          .insert(newMessage)
          .select();

      if (error) {
          console.error('Error details:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        console.log("Message inserted successfully:", data);

        // Only refresh the chats list to update last message
        // The new message will be added via real-time subscription in ChatBox
      } catch (innerError) {
        console.error('Database operation failed:', innerError);
        throw innerError; // Re-throw to be caught by the outer try-catch
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleUserAdded = (chatId: string, userId: string, username: string) => {
    const newChat: ChatType = {
      id: chatId,
      participantId: userId,
      participantName: username,
      unreadCount: 0
    };

    setChats(prevChats => [newChat, ...prevChats]);
    setActiveChat(newChat);
    fetchMessages(chatId);
  };

  return (
    <Layout requireAuth>
      <div className="container mx-auto px-4 py-8">
        <div className="flex h-[calc(100vh-200px)] bg-background border rounded-lg overflow-hidden">
          <div className="w-1/3 border-r">
            <ChatList 
              chats={chats}
              activeChat={activeChat}
              onChatSelect={handleChatSelect}
              isLoading={isLoading}
              searchBarRight={<AddUserToChat onUserAdded={handleUserAdded} />}
            />
          </div>

          <div className="w-2/3">
            {activeChat ? (
              <ChatBox 
                chat={activeChat} 
                messages={messages} 
                onSendMessage={handleSendMessage}
                isSending={isSending}
                refreshMessages={() => activeChat && fetchMessages(activeChat.id)}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">
                  {chats.length > 0 
                    ? 'Select a conversation to start chatting' 
                    : 'No conversations yet. Add a user to start chatting!'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;