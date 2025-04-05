
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Award, 
  Clock, 
  CheckCircle, 
  RadioTower,
  Users 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserStatisticsProps {
  userId: string;
}

const UserStatistics = ({ userId }: UserStatisticsProps) => {
  const [stats, setStats] = useState({
    username: '',
    tasksCreated: 0,
    tasksCompleted: 0,
    tasksInProgress: 0,
    rating: 4.5, // Default rating until we implement actual ratings
    reviewsCount: 0,
    joinDate: new Date(),
    responseRate: 85, // Default until implemented
    completionRate: 92, // Default until implemented
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        setIsLoading(true);
        
        // Fetch user profile for username and join date
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, created_at')
          .eq('id', userId)
          .single();
          
        if (profileError) throw profileError;

        // Fetch tasks created by user
        const { data: createdTasks, error: createdError } = await supabase
          .from('tasks')
          .select('id, status')
          .eq('creator_id', userId);
          
        if (createdError) throw createdError;

        // Fetch tasks completed by user (where user is doer and status is completed)
        const { data: completedTasks, error: completedError } = await supabase
          .from('tasks')
          .select('id')
          .eq('doer_id', userId)
          .eq('status', 'completed');
          
        if (completedError) throw completedError;

        // Fetch tasks in progress for this user
        const { data: inProgressTasks, error: inProgressError } = await supabase
          .from('tasks')
          .select('id')
          .eq('doer_id', userId)
          .eq('status', 'active');
          
        if (inProgressError) throw inProgressError;

        // Calculate statistics
        const tasksCreated = createdTasks.length;
        const tasksCompleted = completedTasks.length;
        const tasksInProgress = inProgressTasks.length;

        setStats({
          username: profileData.username || 'User',
          tasksCreated,
          tasksCompleted,
          tasksInProgress,
          rating: 4.5, // Placeholder until we implement real ratings
          reviewsCount: tasksCompleted, // Using completed tasks as proxy for now
          joinDate: new Date(profileData.created_at),
          responseRate: 85, // Placeholder
          completionRate: tasksCreated > 0 ? Math.round((tasksCompleted / tasksCreated) * 100) : 0,
        });
      } catch (error) {
        console.error('Error fetching user statistics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUserStats();
    }
  }, [userId]);

  // Calculate membership duration
  const memberSince = stats.joinDate 
    ? `${stats.joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    : 'Unknown';

  // Determine user level based on tasks completed
  const getUserLevel = (completed: number) => {
    if (completed >= 50) return { level: 'Expert', badge: 'Gold', color: 'bg-yellow-500' };
    if (completed >= 20) return { level: 'Pro', badge: 'Silver', color: 'bg-gray-400' };
    if (completed >= 5) return { level: 'Regular', badge: 'Bronze', color: 'bg-amber-600' };
    return { level: 'Beginner', badge: 'New', color: 'bg-blue-500' };
  };

  const userLevel = getUserLevel(stats.tasksCompleted);

  if (isLoading) {
    return <div className="text-center py-8">Loading statistics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* User Level Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Award className="mr-2 h-5 w-5 text-primary" />
            User Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-2xl font-bold">{userLevel.level}</p>
              <p className="text-sm text-muted-foreground">Member since {memberSince}</p>
            </div>
            <Badge className={`${userLevel.color} text-white`}>{userLevel.badge}</Badge>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress to next level</span>
              <span>{stats.tasksCompleted} / {userLevel.level === 'Beginner' ? 5 : userLevel.level === 'Regular' ? 20 : userLevel.level === 'Pro' ? 50 : 100}</span>
            </div>
            <Progress 
              value={
                userLevel.level === 'Beginner' 
                  ? (stats.tasksCompleted / 5) * 100 
                  : userLevel.level === 'Regular' 
                    ? (stats.tasksCompleted / 20) * 100 
                    : userLevel.level === 'Pro' 
                      ? (stats.tasksCompleted / 50) * 100 
                      : (stats.tasksCompleted / 100) * 100
              } 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <RadioTower className="h-8 w-8 text-primary mb-2" />
              <p className="text-3xl font-bold">{stats.tasksCreated}</p>
              <p className="text-sm text-muted-foreground">Tasks Created</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
              <p className="text-3xl font-bold">{stats.tasksCompleted}</p>
              <p className="text-sm text-muted-foreground">Tasks Completed</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <Clock className="h-8 w-8 text-orange-500 mb-2" />
              <p className="text-3xl font-bold">{stats.tasksInProgress}</p>
              <p className="text-sm text-muted-foreground">Tasks In Progress</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserStatistics;
