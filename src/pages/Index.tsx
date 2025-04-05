
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import TaskCard from '@/components/TaskCard';
import { TaskType } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { extendedSupabase } from '@/integrations/supabase/extended-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import CreateTaskForm from '@/components/CreateTaskForm';

const Index = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Fetch profile information separately for each task
        const tasksWithProfiles: TaskType[] = await Promise.all(
          data.map(async (task) => {
            // Get the creator's profile
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', task.creator_id)
              .single();
            
            // Ensure the status is either 'active' or 'completed'
            const status = task.status === 'active' || task.status === 'completed' 
              ? task.status as 'active' | 'completed'
              : 'active'; // Default to 'active' if it's neither
              
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
              creatorName: profileData?.username || 'Unknown user',
              creatorRating: task.creator_rating || 0,
            };
          })
        );

        // If user is logged in, filter out tasks they've already applied for
        if (user) {
          const { data: applications } = await extendedSupabase
            .from('task_applications')
            .select('task_id')
            .eq('applicant_id', user.id);
          
          const appliedTaskIds = applications?.map(app => app.task_id) || [];
          
          const filteredTasksForUser = tasksWithProfiles.filter(
            task => !appliedTaskIds.includes(task.id) && task.creatorId !== user.id
          );
          
          setTasks(filteredTasksForUser);
          setFilteredTasks(filteredTasksForUser);
        } else {
          setTasks(tasksWithProfiles);
          setFilteredTasks(tasksWithProfiles);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: "Error",
          description: "Failed to fetch tasks. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();

    // Set up real-time subscription for task applications
    const channel = supabase
      .channel('public:task_applications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'task_applications' 
        }, 
        (payload) => {
          if (user && payload.new && payload.new.applicant_id === user.id) {
            // If the current user created this application, filter out the task
            setTasks(currentTasks => 
              currentTasks.filter(task => task.id !== payload.new.task_id)
            );
            setFilteredTasks(currentFiltered => 
              currentFiltered.filter(task => task.id !== payload.new.task_id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, user]);

  const handleSearch = (term: string) => {
    const lowerCaseTerm = term.toLowerCase();
    setSearchTerm(lowerCaseTerm);
    
    const filtered = tasks.filter(task => 
      task.title.toLowerCase().includes(lowerCaseTerm) || 
      task.description.toLowerCase().includes(lowerCaseTerm) || 
      task.location.toLowerCase().includes(lowerCaseTerm)
    );
    
    setFilteredTasks(filtered);
  };

  // Add task application handler
  const handleApplyForTask = async (taskId: string, message: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to apply for tasks.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Check if user has already applied
      const { data: existingApplications, error: checkError } = await extendedSupabase
        .from('task_applications')
        .select('*')
        .eq('task_id', taskId)
        .eq('applicant_id', user.id)
        .limit(1);
        
      if (checkError) throw checkError;
      
      if (existingApplications && existingApplications.length > 0) {
        toast({
          title: "Already Applied",
          description: "You have already applied for this task",
          variant: "destructive"
        });
        return;
      }
      
      // Submit the application
      const { error } = await extendedSupabase
        .from('task_applications')
        .insert({
          task_id: taskId,
          applicant_id: user.id,
          message: message
        });

      if (error) throw error;
      
      toast({
        title: "Application Submitted",
        description: "Your application has been sent to the task creator."
      });
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCreateTask = async (task: TaskType) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create tasks.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description,
          location: task.location,
          reward: task.reward,
          deadline: task.deadline.toISOString(),
          task_type: task.taskType,
          creator_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Task Created",
        description: "Your task has been created successfully."
      });
      
      setIsCreateDialogOpen(false);
      
      // Refresh tasks list
      window.location.href = '/task';
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again later.",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout onSearch={handleSearch} requireAuth>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold text-primary">Available Tasks</h1>
          <Button 
            className="flex items-center gap-2"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <PlusCircle size={20} />
            Create Task
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="sm:max-w-[550px]">
              <CreateTaskForm 
                onSubmit={handleCreateTask} 
                onCancel={() => setIsCreateDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <p>Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-2xl font-semibold text-gray-500">No tasks found</h2>
            <p className="mt-2 text-gray-400">Try adjusting your search or create a new task</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            {filteredTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                isOwner={user?.id === task.creatorId}
                onApply={handleApplyForTask}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;
