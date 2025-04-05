import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MaskedUsername from '@/components/MaskedUsername';

interface LeaderboardUser {
  id: string;
  username: string;
  avatar_url: string | null;
  rating: number;
  tasksCount: number;
  reward: number;
}

const Leaderboard = () => {
  const [topCreators, setTopCreators] = useState<LeaderboardUser[]>([]);
  const [topDoers, setTopDoers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setIsLoading(true);

        // Fetch tasks for creators data (including completed tasks)
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('creator_id, creator_rating, status')
          .not('creator_rating', 'is', null);

        if (tasksError) throw tasksError;

        // Process and aggregate the creator data manually
        const creatorMap = new Map<string, {
          id: string;
          rating: number;
          tasksCount: number;
          reward: number;
        }>();

        if (tasksData) {
          tasksData.forEach(task => {
            if (!task.creator_id || typeof task.creator_rating !== 'number') return;
            
            if (creatorMap.has(task.creator_id)) {
              // Update existing entry
              const existing = creatorMap.get(task.creator_id)!;
              if (task.status === 'completed') {
                existing.tasksCount += 1;
                existing.reward += 100; // Assuming 100 per task
              }
              // We keep the highest rating
              if (task.creator_rating > existing.rating) {
                existing.rating = task.creator_rating;
              }
            } else {
              // Create new entry
              creatorMap.set(task.creator_id, {
                id: task.creator_id,
                rating: task.creator_rating,
                tasksCount: task.status === 'completed' ? 1 : 0,
                reward: task.status === 'completed' ? 100 : 0,
              });
            }
          });
        }

        // Fetch user data for each creator
        const creators: LeaderboardUser[] = [];
        
        for (const [id, data] of creatorMap.entries()) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', id)
            .single();
            
          creators.push({
            id,
            username: profileData?.username || 'Unknown User',
            avatar_url: profileData?.avatar_url,
            rating: data.rating,
            tasksCount: data.tasksCount,
            reward: data.reward
          });
        }

        // Sort by reward and then by rating
        const topCreators = creators
          .sort((a, b) => {
            if (b.reward !== a.reward) return b.reward - a.reward;
            return b.rating - a.rating;
          })
          .slice(0, 10);

        setTopCreators(topCreators);

        // Fetch tasks for doers data
        const { data: doersData, error: doersError } = await supabase
          .from('tasks')
          .select('doer_id, doer_rating, status')
          .not('doer_id', 'is', null)
          .not('doer_rating', 'is', null);

        if (doersError) throw doersError;

        // Process and aggregate the doer data manually
        const doerMap = new Map<string, {
          id: string;
          rating: number;
          tasksCount: number;
          reward: number;
        }>();

        if (doersData) {
          doersData.forEach(task => {
            if (!task.doer_id || typeof task.doer_rating !== 'number') return;
            
            if (doerMap.has(task.doer_id)) {
              // Update existing entry
              const existing = doerMap.get(task.doer_id)!;
              if (task.status === 'completed') {
                existing.tasksCount += 1;
                existing.reward += 100; // Assuming 100 per task
              }
              // We keep the highest rating
              if (task.doer_rating > existing.rating) {
                existing.rating = task.doer_rating;
              }
            } else {
              // Create new entry
              doerMap.set(task.doer_id, {
                id: task.doer_id,
                rating: task.doer_rating,
                tasksCount: task.status === 'completed' ? 1 : 0,
                reward: task.status === 'completed' ? 100 : 0,
              });
            }
          });
        }

        // Fetch user data for each doer
        const doers: LeaderboardUser[] = [];
        
        for (const [id, data] of doerMap.entries()) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', id)
            .single();
            
          doers.push({
            id,
            username: profileData?.username || 'Unknown User',
            avatar_url: profileData?.avatar_url,
            rating: data.rating,
            tasksCount: data.tasksCount,
            reward: data.reward
          });
        }

        // Sort by reward and then by rating
        const topDoers = doers
          .sort((a, b) => {
            if (b.reward !== a.reward) return b.reward - a.reward;
            return b.rating - a.rating;
          })
          .slice(0, 10);

        setTopDoers(topDoers);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  const renderLeaderboardTable = (users: LeaderboardUser[], isCreators: boolean) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">No data available</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Rank</TableHead>
            <TableHead>User</TableHead>
            <TableHead>{isCreators ? 'Tasks Created' : 'Tasks Completed'}</TableHead>
            <TableHead>Reward</TableHead>
            <TableHead className="text-right">Rating</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user, index) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {index === 0 ? (
                  <Trophy className="h-5 w-5 text-yellow-500" />
                ) : index === 1 ? (
                  <Trophy className="h-5 w-5 text-gray-400" />
                ) : index === 2 ? (
                  <Trophy className="h-5 w-5 text-amber-700" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {user.avatar_url ? (
                      <AvatarImage src={user.avatar_url} alt={user.username} />
                    ) : (
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <MaskedUsername username={user.username} />
                </div>
              </TableCell>
              <TableCell>{user.tasksCount}</TableCell>
              <TableCell>₹{user.reward.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <Badge variant="outline" className={`ml-auto font-medium ${isCreators ? "text-yellow-500" : "text-green-500"}`}>
                  {user.rating.toFixed(1)} ★
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Community Leaderboard</h1>
        
        <Tabs defaultValue="creators" className="max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="creators">Top Creators</TabsTrigger>
              <TabsTrigger value="doers">Top Doers</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="creators">
            <div className="max-w-4xl mx-auto">
              {renderLeaderboardTable(topCreators, true)}
            </div>
          </TabsContent>
          
          <TabsContent value="doers">
            <div className="max-w-4xl mx-auto">
              {renderLeaderboardTable(topDoers, false)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Leaderboard;
