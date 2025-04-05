
import { useState } from 'react';
import { TaskType } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { extendedSupabase } from '@/integrations/supabase/extended-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface TaskActionsProps {
  tasks: TaskType[];
  setTasks: React.Dispatch<React.SetStateAction<TaskType[]>>;
  appliedTasks: TaskType[];
  setAppliedTasks: React.Dispatch<React.SetStateAction<TaskType[]>>;
  applications: any[];
  setApplications: React.Dispatch<React.SetStateAction<any[]>>;
  generateVerificationCode: () => string;
  fetchUserTasks: () => Promise<void>;
}

export const useTaskActions = ({
  tasks,
  setTasks,
  appliedTasks,
  setAppliedTasks,
  applications,
  setApplications,
  generateVerificationCode,
  fetchUserTasks,
}: TaskActionsProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTask = async (task: TaskType) => {
    if (tasks.filter(t => t.status === 'active').length >= 3) {
      toast({
        title: "Limit Reached",
        description: "You can only have 3 active tasks at a time.",
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
          creator_id: user?.id,
          is_requestor_rated: false,
          is_doer_rated: false
        })
        .select()
        .single();

      if (error) throw error;

      const newTask: TaskType = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        location: data.location || '',
        reward: data.reward,
        deadline: new Date(data.deadline),
        taskType: data.task_type === 'normal' ? 'normal' : 'joint',
        status: 'active',
        createdAt: new Date(data.created_at),
        creatorId: data.creator_id,
        creatorName: user?.email || 'Unknown user',
        creatorRating: 0,
        isRequestorRated: false,
        isDoerRated: false
      };
      
      setTasks([newTask, ...tasks]);
      toast({
        title: "Task Created",
        description: "Your task has been created successfully."
      });
      return true;
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again later.",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: 'completed' } 
          : task
      ));
      
      toast({
        title: "Task Cancelled",
        description: "Your task has been cancelled."
      });
    } catch (error) {
      console.error('Error cancelling task:', error);
      toast({
        title: "Error",
        description: "Failed to cancel task. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleEditTask = async (updatedTask: TaskType) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          location: updatedTask.location,
          reward: updatedTask.reward,
          deadline: updatedTask.deadline.toISOString(),
        })
        .eq('id', updatedTask.id);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === updatedTask.id 
          ? updatedTask 
          : task
      ));
      
      toast({
        title: "Task Updated",
        description: "Your task has been updated successfully."
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleApplyForTask = async (taskId: string, message: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to apply for tasks.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
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
        setIsSubmitting(false);
        return;
      }
      
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
      
      // Refresh task data after application
      await fetchUserTasks();
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  const handleJoinJointTask = (taskId: string, needs: string, reward: number) => {
    toast({
      title: "Feature not implemented",
      description: "Joint task requests will be available soon.",
    });
  };

  const handleApproveApplication = async (applicationId: string, taskId: string, applicantId: string) => {
    try {
      // Generate verification codes
      const requestorCode = generateVerificationCode();
      const doerCode = generateVerificationCode();
      
      // Update the task with the doer and verification codes
      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update({
          doer_id: applicantId,
          requestor_verification_code: requestorCode,
          doer_verification_code: doerCode,
          is_requestor_verified: false,
          is_doer_verified: false,
          is_requestor_rated: false,
          is_doer_rated: false
        })
        .eq('id', taskId);
        
      if (taskUpdateError) throw taskUpdateError;
      
      // Update the application status
      const { error: applicationUpdateError } = await extendedSupabase
        .from('task_applications')
        .update({
          status: 'approved'
        })
        .eq('id', applicationId);
        
      if (applicationUpdateError) throw applicationUpdateError;
      
      // Reject all other applications for this task
      const { error: rejectOthersError } = await extendedSupabase
        .from('task_applications')
        .update({
          status: 'rejected'
        })
        .eq('task_id', taskId)
        .neq('id', applicationId);
        
      if (rejectOthersError) throw rejectOthersError;
      
      // Update the applications state
      setApplications(applications.map(app => {
        if (app.id === applicationId) {
          return { ...app, status: 'approved' };
        } else if (app.taskId === taskId) {
          return { ...app, status: 'rejected' };
        }
        return app;
      }));
      
      // Update the tasks state
      setTasks(tasks.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            doerId: applicantId,
            requestorVerificationCode: requestorCode,
            doerVerificationCode: doerCode,
            isRequestorVerified: false,
            isDoerVerified: false,
            isRequestorRated: false,
            isDoerRated: false
          };
        }
        return task;
      }));
      
      toast({
        title: "Application Approved",
        description: "The applicant has been assigned to this task."
      });
    } catch (error) {
      console.error("Error approving application:", error);
      toast({
        title: "Error",
        description: "Failed to approve application. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    try {
      const { error } = await extendedSupabase
        .from('task_applications')
        .update({
          status: 'rejected'
        })
        .eq('id', applicationId);
        
      if (error) throw error;
      
      setApplications(applications.map(app => 
        app.id === applicationId 
          ? { ...app, status: 'rejected' } 
          : app
      ));
      
      toast({
        title: "Application Rejected",
        description: "The application has been rejected."
      });
    } catch (error) {
      console.error("Error rejecting application:", error);
      toast({
        title: "Error",
        description: "Failed to reject application. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleVerifyCode = async (taskId: string, code: string) => {
    try {
      // First, find the task
      const task = [...tasks, ...appliedTasks].find(t => t.id === taskId);
      
      if (!task) {
        throw new Error("Task not found");
      }
      
      const isDoer = task.doerId === user?.id;
      const expectedCode = isDoer ? task.requestorVerificationCode : task.doerVerificationCode;
      
      // Check if the code matches
      if (code !== expectedCode) {
        return false;
      }
      
      // Update the verification status
      const updateData = isDoer 
        ? { is_doer_verified: true }
        : { is_requestor_verified: true };
        
      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);
        
      if (error) throw error;
      
      // Check if both parties are verified
      const { data: updatedTask, error: fetchError } = await supabase
        .from('tasks')
        .select('is_requestor_verified, is_doer_verified')
        .eq('id', taskId)
        .single();
        
      if (fetchError || !updatedTask) {
        throw new Error("Could not retrieve updated task verification status");
      }
        
      // Update the tasks state
      if (isDoer) {
        // Update in applied tasks
        setAppliedTasks(appliedTasks.map(t => 
          t.id === taskId 
            ? { 
                ...t, 
                isDoerVerified: true, 
                isRequestorVerified: updatedTask.is_requestor_verified 
              } 
            : t
        ));
      } else {
        // Update in created tasks
        setTasks(tasks.map(t => 
          t.id === taskId 
            ? { 
                ...t, 
                isRequestorVerified: true, 
                isDoerVerified: updatedTask.is_doer_verified 
              } 
            : t
        ));
      }
      
      return true;
    } catch (error) {
      console.error("Error verifying code:", error);
      toast({
        title: "Error",
        description: "Failed to verify code. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleSubmitRating = async (taskId: string, rating: number) => {
    if (!user) return false;
    
    try {
      // Find the task
      const taskFromCreated = tasks.find(t => t.id === taskId);
      const taskFromApplied = appliedTasks.find(t => t.id === taskId);
      const currentTask = taskFromCreated || taskFromApplied;
      
      if (!currentTask) {
        throw new Error("Task not found");
      }

      const isDoer = currentTask.doerId === user.id;
      
      if (isDoer) {
        // Update the requestor's profile with the rating
        const { data: profileData } = await supabase
          .from('profiles')
          .select('requestor_rating')
          .eq('id', currentTask.creatorId)
          .single();
          
        if (profileData) {
          // Update the profile with the new rating
          await supabase
            .from('profiles')
            .update({
              requestor_rating: rating
            })
            .eq('id', currentTask.creatorId);
        }
        
        // Mark doer as having rated the task
        await supabase
          .from('tasks')
          .update({
            is_doer_rated: true
          })
          .eq('id', currentTask.id);
        
        // Update local state
        setAppliedTasks(appliedTasks.map(task => 
          task.id === currentTask.id 
            ? { ...task, isDoerRated: true } 
            : task
        ));
      } else {
        // Update the doer's profile with the rating
        const { data: profileData } = await supabase
          .from('profiles')
          .select('doer_rating')
          .eq('id', currentTask.doerId || '')
          .single();
          
        if (profileData) {
          // Update the profile with the new rating
          await supabase
            .from('profiles')
            .update({
              doer_rating: rating
            })
            .eq('id', currentTask.doerId || '');
        }
        
        // Mark requestor as having rated the task
        await supabase
          .from('tasks')
          .update({
            is_requestor_rated: true
          })
          .eq('id', currentTask.id);
        
        // Update local state
        setTasks(tasks.map(task => 
          task.id === currentTask.id 
            ? { ...task, isRequestorRated: true } 
            : task
        ));
      }
      
      // If both parties have rated, mark task as fully completed
      const { data: taskData } = await supabase
        .from('tasks')
        .select('is_requestor_rated, is_doer_rated')
        .eq('id', currentTask.id)
        .single();
        
      if (taskData && taskData.is_requestor_rated && taskData.is_doer_rated) {
        await supabase
          .from('tasks')
          .update({ status: 'completed' })
          .eq('id', currentTask.id);
          
        // Update local state for completion
        setTasks(tasks.map(task => 
          task.id === currentTask.id 
            ? { ...task, status: 'completed' } 
            : task
        ));
        
        setAppliedTasks(appliedTasks.map(task => 
          task.id === currentTask.id 
            ? { ...task, status: 'completed' } 
            : task
        ));
      }
      
      toast({
        title: "Rating Submitted",
        description: "Thank you for your feedback!"
      });
      
      return true;
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    isSubmitting,
    handleCreateTask,
    handleCancelTask,
    handleEditTask,
    handleApplyForTask,
    handleJoinJointTask,
    handleApproveApplication,
    handleRejectApplication,
    handleVerifyCode,
    handleSubmitRating,
  };
};
