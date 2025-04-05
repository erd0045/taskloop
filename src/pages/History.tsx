
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import TaskCard from '@/components/TaskCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { TaskType } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const History = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchCompletedTasks = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Fetch completed tasks where the user is either the creator or doer
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'completed')
          .or(`creator_id.eq.${user.id},doer_id.eq.${user.id}`)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Process tasks
        const processedTasks = await Promise.all(
          (data || []).map(async (task) => {
            // Get the creator's profile
            const { data: creatorProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', task.creator_id)
              .single();
            
            // Get the doer's profile if exists
            let doerName = undefined;
            if (task.doer_id) {
              const { data: doerProfile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', task.doer_id)
                .single();
              
              doerName = doerProfile?.username;
            }
            
            // Ensure the status is either 'active' or 'completed'
            const status = task.status === 'active' || task.status === 'completed'
              ? task.status as 'active' | 'completed'
              : 'completed'; // Default to 'completed' since we're in history
            
            // Ensure taskType is either 'normal' or 'joint'
            const taskType = task.task_type === 'joint' ? 'joint' : 'normal';
            
            return {
              id: task.id,
              title: task.title,
              description: task.description || '',
              location: task.location || '',
              reward: task.reward,
              deadline: task.deadline ? new Date(task.deadline) : new Date(),
              taskType: taskType as 'normal' | 'joint',
              status: status,
              createdAt: new Date(task.created_at),
              creatorId: task.creator_id,
              creatorName: creatorProfile?.username || 'Unknown user',
              creatorRating: 0,
              doerId: task.doer_id,
              doerName: doerName,
              doerRating: 0,
            };
          })
        );
        
        setTasks(processedTasks);
      } catch (error) {
        console.error('Error fetching task history:', error);
        toast({
          title: "Error",
          description: "Failed to fetch task history. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCompletedTasks();
  }, [user, toast]);
  
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.location.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const createdTasks = filteredTasks.filter(task => task.creatorId === user?.id);
  const completedTasks = filteredTasks.filter(task => task.doerId === user?.id);

  return (
    <Layout requireAuth>
      <div className="container mx-auto py-8">
        <h1 className="text-xl font-semibold text-primary mb-6">Task History</h1>
        
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks by name, description, or location..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <p className="text-muted-foreground">Loading task history...</p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Tasks ({filteredTasks.length})</TabsTrigger>
              <TabsTrigger value="created">Created Tasks ({createdTasks.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed Tasks ({completedTasks.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <div className="flex flex-col space-y-6">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      isOwner={task.creatorId === user?.id}
                      isCompleted={true}
                    />
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No completed tasks found matching your search.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="created">
              <div className="flex flex-col space-y-6">
                {createdTasks.length > 0 ? (
                  createdTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      isOwner={true}
                      isCompleted={true}
                    />
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No created tasks found matching your search.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="completed">
              <div className="flex flex-col space-y-6">
                {completedTasks.length > 0 ? (
                  completedTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      isOwner={false}
                      isCompleted={true}
                    />
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No completed tasks found matching your search.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default History;
