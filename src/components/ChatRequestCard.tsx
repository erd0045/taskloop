
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ChatRequestCardProps {
  username: string;
  image?: string;
  requestorRating?: number;
  doerRating?: number;
  timestamp: Date;
  onAccept: () => void;
  onReject: () => void;
}

const ChatRequestCard = ({ 
  username, 
  image, 
  requestorRating, 
  doerRating, 
  timestamp, 
  onAccept, 
  onReject 
}: ChatRequestCardProps) => {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar>
              {image ? <AvatarImage src={image} alt={username} /> : null}
              <AvatarFallback>
                {username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{username}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(timestamp), 'MMM d, yyyy • HH:mm')}
              </p>
            </div>
          </div>
          
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm mb-2">Chat request from <span className="font-semibold">{username}</span></p>
            
            <div className="flex gap-4 mb-3">
              {requestorRating !== undefined && (
                <div className="flex flex-col items-center">
                  <Badge variant="outline" className="mb-1">Requestor</Badge>
                  <span className="text-sm">{requestorRating.toFixed(1)} ★</span>
                </div>
              )}
              
              {doerRating !== undefined && (
                <div className="flex flex-col items-center">
                  <Badge variant="outline" className="mb-1">Doer</Badge>
                  <span className="text-sm">{doerRating.toFixed(1)} ★</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={onReject}>
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button size="sm" onClick={onAccept}>
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatRequestCard;
