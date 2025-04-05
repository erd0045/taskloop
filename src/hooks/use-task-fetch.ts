
import { useState, useEffect } from 'react';
import { TaskType, ApplicationType } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { extendedSupabase } from '@/integrations/supabase/extended-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export const useTaskFetch = () => {
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [appliedTasks, setAppliedTasks] = useState<TaskType[]>([]);
  const [applications, setApplications] = useState<ApplicationType[]>([]);
  const [jointTaskRequests, setJointTaskRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const fetchUserTasks = async () => {
    try {
      setIsLoading(true);
      if (!user) return;

      // Fetch tasks created by the user
      const { data: createdTasksData, error: createdTasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (createdTasksError) {
        console.error('Error fetching created tasks:', createdTasksError);
        throw createdTasksError;
      }

      // Fetch applications made by the user
      const { data: applications, error: applicationsError } = await extendedSupabase
        .from('task_applications')
        .select('task_id, status')
        .eq('applicant_id', user.id);
        
      if (applicationsError) {
        console.error('Error fetching applications:', applicationsError);
        throw applicationsError;
      }
      
      const appliedTaskIds = applications?.map(app => app.task_id) || [];
      
      // Fetch the tasks for which the user has applied
      let appliedTasksData = [];
      if (appliedTaskIds.length > 0) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .in('id', appliedTaskIds)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching applied tasks:', error);
          throw error;
        }
        appliedTasksData = data || [];
      }

      // Fetch applications for tasks created by the user
      const { data: taskApplications, error: taskApplicationsError } = await extendedSupabase
        .from('task_applications')
        .select('*')
        .in('task_id', createdTasksData?.map(task => task.id) || []);
        
      if (taskApplicationsError) {
        console.error('Error fetching task applications:', taskApplicationsError);
        throw taskApplicationsError;
      }
      
      // Process applications with user data
      const enhancedApplicationsPromises = (taskApplications || []).map(async (app) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', app.applicant_id)
          .single();
            
        const { data: taskData } = await supabase
          .from('tasks')
          .select('title')
          .eq('id', app.task_id)
          .single();
            
        return {
          id: app.id,
          taskId: app.task_id,
          userId: app.applicant_id,
          username: profileData?.username || 'Unknown user',
          message: app.message,
          rating: 0,
          createdAt: new Date(app.created_at),
          status: app.status,
          applicantName: profileData?.username || 'Unknown user',
          taskTitle: taskData?.title || 'Unknown task'
        } as ApplicationType;
      });
      
      const enhancedApplications = await Promise.all(enhancedApplicationsPromises);
      setApplications(enhancedApplications);

      // Process tasks created by the user
      const processedCreatedTasks = await Promise.all(
        (createdTasksData || []).map(async (task) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', task.creator_id)
            .single();
            
          let doerName;
          if (task.doer_id) {
            const { data: doerData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', task.doer_id)
              .single();
            doerName = doerData?.username || 'Unknown doer';
          }
          
          // Safely access properties that might not exist in all task records
          const isRequestorRated = task.is_requestor_rated !== undefined ? task.is_requestor_rated : false;
          const isDoerRated = task.is_doer_rated !== undefined ? task.is_doer_rated : false;

          return {
            id: task.id,
            title: task.title,
            description: task.description || '',
            location: task.location || '',
            reward: task.reward || 0,
            deadline: task.deadline ? new Date(task.deadline) : new Date(),
            taskType: (task.task_type === 'joint' ? 'joint' : 'normal') as 'normal' | 'joint',
            status: (task.status === 'active' || task.status === 'completed' ? task.status : 'active') as 'active' | 'completed',
            createdAt: new Date(task.created_at),
            creatorId: task.creator_id,
            creatorName: profileData?.username || 'Unknown user',
            creatorRating: task.creator_rating || 0,
            doerId: task.doer_id,
            doerName: doerName,
            requestorVerificationCode: task.requestor_verification_code,
            doerVerificationCode: task.doer_verification_code,
            isRequestorVerified: task.is_requestor_verified || false,
            isDoerVerified: task.is_doer_verified || false,
            isRequestorRated: isRequestorRated,
            isDoerRated: isDoerRated,
          };
        })
      );

      // Process tasks the user has applied for
      const processedAppliedTasks = await Promise.all(
        (appliedTasksData || []).map(async (task) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', task.creator_id)
            .single();

          const application = applications?.find(app => app.task_id === task.id);
          const applicationStatus = application ? application.status : 'pending';

          // Safely access properties that might not exist in all task records
          const isRequestorRated = task.is_requestor_rated !== undefined ? task.is_requestor_rated : false;
          const isDoerRated = task.is_doer_rated !== undefined ? task.is_doer_rated : false;

          return {
            id: task.id,
            title: task.title,
            description: task.description || '',
            location: task.location || '',
            reward: task.reward || 0,
            deadline: task.deadline ? new Date(task.deadline) : new Date(),
            taskType: (task.task_type === 'joint' ? 'joint' : 'normal') as 'normal' | 'joint',
            status: (task.status === 'active' || task.status === 'completed' ? task.status : 'active') as 'active' | 'completed',
            createdAt: new Date(task.created_at),
            creatorId: task.creator_id,
            creatorName: profileData?.username || 'Unknown user',
            creatorRating: task.creator_rating || 0,
            doerId: task.doer_id,
            applicationStatus: applicationStatus,
            requestorVerificationCode: task.requestor_verification_code,
            doerVerificationCode: task.doer_verification_code,
            isRequestorVerified: task.is_requestor_verified || false,
            isDoerVerified: task.is_doer_verified || false,
            isRequestorRated: isRequestorRated,
            isDoerRated: isDoerRated,
          };
        })
      );

      setTasks(processedCreatedTasks);
      setAppliedTasks(processedAppliedTasks);
      
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

  useEffect(() => {
    fetchUserTasks();
    
    const channel = supabase
      .channel('public:task_applications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'task_applications' 
        }, 
        async (payload) => {
          if (user && payload.new) {
            await fetchUserTasks();
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    tasks,
    setTasks,
    appliedTasks,
    setAppliedTasks,
    applications,
    setApplications,
    jointTaskRequests,
    isLoading,
    generateVerificationCode,
    fetchUserTasks,
  };
};
