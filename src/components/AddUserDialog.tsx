
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extendedSupabase } from '@/integrations/supabase/extended-client';
import MaskedUsername from './MaskedUsername';

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendRequest: (username: string, displayName?: string) => void;
}

const AddUserDialog = ({
  open,
  onOpenChange,
  onSendRequest
}: AddUserDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search Error",
        description: "Please enter a username to search",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setSearchPerformed(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchTerm}%`)
        .limit(5);
        
      if (error) throw error;
      
      setSearchResults(data || []);
      
      if (data?.length === 0) {
        toast({
          title: "No Results",
          description: "No users found with that username",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error searching for users:', error);
      toast({
        title: "Search Error",
        description: "Failed to search for users. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleDirectAdd = () => {
    if (searchTerm.trim()) {
      onSendRequest(searchTerm);
      setSearchTerm('');
      onOpenChange(false);
    }
  };

  const handleResultClick = (result: any) => {
    onSendRequest(result.id, result.username);
    setSearchTerm('');
    setSearchResults([]);
    setSearchPerformed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add User to Chat</DialogTitle>
          <DialogDescription>
            Search for a user by username or enter their username to start a chat.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center gap-2">
              <Input
                id="username"
                placeholder="Search by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button 
                type="button" 
                size="icon" 
                onClick={handleSearch}
                disabled={isLoading}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {searchPerformed && (
            <div className="mt-2">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  <Label>Search Results</Label>
                  <ul className="border rounded-md overflow-hidden">
                    {searchResults.map((result) => (
                      <li
                        key={result.id}
                        className="px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                        onClick={() => handleResultClick(result)}
                      >
                        <MaskedUsername username={result.username} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No users found. You can still add a user directly by their username.
                </p>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleDirectAdd} disabled={!searchTerm.trim() || isLoading}>
            Add User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
