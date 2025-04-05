
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { ChatType } from '@/lib/types';

interface ChatListProps {
  chats: ChatType[];
  activeChat: ChatType | null;
  onChatSelect: (chat: ChatType) => void;
  isLoading?: boolean;
  searchBarRight?: React.ReactNode;
}

const ChatList = ({
  chats,
  activeChat,
  onChatSelect,
  isLoading = false,
  searchBarRight
}: ChatListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredChats = chats.filter((chat) => 
    chat.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search chats..." 
              className="pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchBarRight}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center">
            <p className="text-muted-foreground">Loading chats...</p>
          </div>
        ) : filteredChats.length > 0 ? (
          <ul>
            {filteredChats.map(chat => (
              <li 
                key={chat.id} 
                className={`border-b p-4 hover:bg-accent/50 cursor-pointer ${activeChat?.id === chat.id ? 'bg-accent' : ''}`} 
                onClick={() => onChatSelect(chat)}
              >
                <div className="flex items-start gap-3">
                  <Avatar>
                    {chat.participantImage ? <AvatarImage src={chat.participantImage} alt={chat.participantName} /> : null}
                    <AvatarFallback>
                      {chat.participantName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium truncate">{chat.participantName}</h3>
                      {chat.lastMessageTime && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(chat.lastMessageTime), 'HH:mm')}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                  
                  {chat.unreadCount > 0 && (
                    <div className="bg-primary text-primary-foreground rounded-full h-5 min-w-5 flex items-center justify-center text-xs px-1">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No chats found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
