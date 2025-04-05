
import { useState } from 'react';
import { TaskType } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

export const useRating = (tasks: TaskType[], appliedTasks: TaskType[], handleSubmitRating: (taskId: string, rating: number) => Promise<boolean>) => {
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [isEnforcedRating, setIsEnforcedRating] = useState(false);
  const [currentTaskForRating, setCurrentTaskForRating] = useState<TaskType | null>(null);
  const { user } = useAuth();

  const checkForTasksNeedingRating = () => {
    // First check if the user is a doer who needs to rate a task
    const doerTask = appliedTasks.find(task => 
      task.doerId === user?.id && 
      task.isRequestorVerified && 
      task.isDoerVerified && 
      !task.isDoerRated
    );
    
    if (doerTask) {
      setCurrentTaskForRating(doerTask);
      setIsRatingDialogOpen(true);
      setIsEnforcedRating(true);
      return true;
    }
    
    // Then check if the user is a creator who needs to rate a task
    const requestorTask = tasks.find(task => 
      task.isRequestorVerified && 
      task.isDoerVerified && 
      !task.isRequestorRated
    );
    
    if (requestorTask) {
      setCurrentTaskForRating(requestorTask);
      setIsRatingDialogOpen(true);
      setIsEnforcedRating(true);
      return true;
    }
    
    return false;
  };

  const handleRequestRating = () => {
    checkForTasksNeedingRating();
  };

  const onSubmitRating = async (rating: number) => {
    if (!currentTaskForRating) return false;
    
    const result = await handleSubmitRating(currentTaskForRating.id, rating);
    
    if (result) {
      setIsRatingDialogOpen(false);
      setCurrentTaskForRating(null);
      setIsEnforcedRating(false);
    }
    
    return result;
  };

  return {
    isRatingDialogOpen,
    setIsRatingDialogOpen,
    isEnforcedRating,
    currentTaskForRating,
    checkForTasksNeedingRating,
    handleRequestRating,
    onSubmitRating
  };
};
