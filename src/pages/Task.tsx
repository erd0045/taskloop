
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import TaskGrid from '@/components/TaskGrid';
import TaskFilters from '@/components/TaskFilters';
import CreateTaskForm from '@/components/CreateTaskForm';
import RatingDialog from '@/components/RatingDialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useTaskFetch } from '@/hooks/use-task-fetch';
import { useTaskActions } from '@/hooks/use-task-actions';
import { useRating } from '@/hooks/use-rating';
import { useAuth } from '@/context/AuthContext';

const Task = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState('active');
  const { user } = useAuth();
  
  // Fetch task data
  const { 
    tasks, 
    setTasks, 
    appliedTasks, 
    setAppliedTasks, 
    applications, 
    setApplications, 
    isLoading, 
    generateVerificationCode,
    fetchUserTasks
  } = useTaskFetch();

  // Task action handlers
  const { 
    handleCreateTask, 
    handleCancelTask, 
    handleEditTask, 
    handleApplyForTask,
    handleJoinJointTask,
    handleApproveApplication,
    handleRejectApplication,
    handleVerifyCode,
    handleSubmitRating 
  } = useTaskActions({
    tasks,
    setTasks,
    appliedTasks,
    setAppliedTasks,
    applications,
    setApplications,
    generateVerificationCode,
    fetchUserTasks
  });

  // Rating management
  const {
    isRatingDialogOpen,
    setIsRatingDialogOpen,
    isEnforcedRating,
    currentTaskForRating,
    checkForTasksNeedingRating,
    handleRequestRating,
    onSubmitRating
  } = useRating(tasks, appliedTasks, handleSubmitRating);

  // Check for tasks needing rating on initial render and when task data updates
  useEffect(() => {
    if (!isLoading && tasks.length > 0) {
      checkForTasksNeedingRating();
    }
  }, [tasks, appliedTasks, isLoading]);

  // Filter functions for task categories
  const getActiveTasks = () => {
    // Only show tasks created by user that don't have a doer assigned yet
    return tasks.filter(task => 
      task.status === 'active' && 
      task.creatorId === user?.id &&
      !task.doerId
    );
  };

  const getApprovedTasks = () => {
    // Tasks created by user that have a doer assigned
    const approvedCreatedTasks = tasks.filter(
      task => task.status === 'active' && 
      task.doerId && 
      task.creatorId === user?.id
    );
    
    // Tasks where the current user is the doer
    const approvedDoingTasks = appliedTasks.filter(
      task => task.status === 'active' && 
      task.doerId === user?.id
    );
    
    return [...approvedCreatedTasks, ...approvedDoingTasks];
  };

  const getAppliedTasks = () => {
    // Only show tasks that user has applied for, are still pending, and not assigned to any doer
    return appliedTasks.filter(task => 
      task.status === 'active' && 
      task.applicationStatus === 'pending' &&
      !task.doerId
    );
  };

  const getPendingApplications = () => {
    // Get all active task IDs created by the user
    const activeTaskIds = tasks.filter(task => 
      task.status === 'active' && 
      task.creatorId === user?.id
    ).map(task => task.id);
    
    // Get pending applications for those tasks
    return applications.filter(app => 
      app.status === 'pending' && 
      activeTaskIds.includes(app.taskId)
    );
  };

  const onTabChange = (newTab: string) => {
    setCurrentTab(newTab);
  };

  const onCreateTask = async (task: any) => {
    const success = await handleCreateTask(task);
    if (success) {
      setIsCreateDialogOpen(false);
    }
  };

  // Render appropriate content based on current tab
  const renderTabContent = () => {
    switch (currentTab) {
      case 'active':
        return (
          <TaskGrid 
            tasks={getActiveTasks()}
            loading={isLoading}
            emptyMessage="No active tasks found."
            onCancel={handleCancelTask}
            onEdit={handleEditTask}
            fullWidth={true}
          />
        );
      case 'approved':
        return (
          <TaskGrid 
            tasks={getApprovedTasks()}
            loading={isLoading}
            emptyMessage="No approved tasks found."
            showVerificationCodes={true}
            onCancel={handleCancelTask}
            onVerifyCode={handleVerifyCode}
            onRequestRating={handleRequestRating}
          />
        );
      case 'applied':
        return (
          <TaskGrid 
            tasks={getAppliedTasks()}
            loading={isLoading}
            emptyMessage="You haven't applied to any tasks yet."
            onApply={handleApplyForTask}
            fullWidth={true}
          />
        );
      case 'requests':
        return (
          <TaskGrid 
            tasks={[]}
            applications={getPendingApplications()}
            loading={isLoading}
            showApplications={true}
            emptyMessage="No pending applications for your tasks."
            onApproveApplication={handleApproveApplication}
            onRejectApplication={handleRejectApplication}
            fullWidth={true}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Layout requireAuth>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
            <Tabs value={currentTab} onValueChange={onTabChange} className="w-full">
              <div className="flex flex-col md:flex-row items-center gap-4 justify-between w-full">
                <TaskFilters 
                  tasks={tasks}
                  appliedTasks={appliedTasks}
                  applications={applications}
                  defaultTab={currentTab}
                  onTabChange={onTabChange}
                />
                <Button 
                  className="flex items-center gap-2 ml-auto"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <PlusCircle size={18} />
                  Create Task
                </Button>
              </div>
              
              {/* Render the appropriate content for the current tab */}
              <div className="mt-6">
                {renderTabContent()}
              </div>
            </Tabs>
          </div>
        </div>
      </div>
      
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <CreateTaskForm 
            onSubmit={onCreateTask} 
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <RatingDialog
        isOpen={isRatingDialogOpen}
        onClose={() => setIsRatingDialogOpen(false)}
        taskTitle={currentTaskForRating?.title || ''}
        partnerName={
          currentTaskForRating?.doerId === user?.id 
            ? currentTaskForRating?.creatorName || 'Task Creator' 
            : currentTaskForRating?.doerName || 'Task Doer'
        }
        onSubmit={onSubmitRating}
        isDoer={currentTaskForRating?.doerId === user?.id}
        enforcedOpen={isEnforcedRating}
      />
    </Layout>
  );
};

export default Task;
