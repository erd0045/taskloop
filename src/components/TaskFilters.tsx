
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, ClipboardCheck, User, MessageSquare } from 'lucide-react';
import { TaskType, ApplicationType } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

interface TaskFiltersProps {
  tasks: TaskType[];
  appliedTasks: TaskType[];
  applications: ApplicationType[];
  defaultTab?: string;
  onTabChange?: (value: string) => void;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({ 
  tasks, 
  appliedTasks, 
  applications,
  defaultTab = 'active',
  onTabChange 
}) => {
  const { user } = useAuth();

  // Get active tasks created by the user that are not yet assigned to a doer
  const getActiveTasks = () => {
    return tasks.filter(task => 
      task.status === 'active' && 
      task.creatorId === user?.id &&
      !task.doerId
    );
  };

  // Get approved tasks (either created by user and assigned to doer, or doer is the current user)
  const getApprovedTasks = () => {
    const approvedCreatedTasks = tasks.filter(
      task => task.status === 'active' && 
      task.doerId && 
      task.creatorId === user?.id
    );
    
    const approvedDoingTasks = appliedTasks.filter(
      task => task.status === 'active' && 
      task.doerId === user?.id
    );
    
    return [...approvedCreatedTasks, ...approvedDoingTasks];
  };

  // Get tasks the user has applied for that are still pending (not rejected, not assigned to any doer)
  const getAppliedTasks = () => {
    return appliedTasks.filter(task => 
      task.status === 'active' && 
      task.applicationStatus === 'pending' &&
      !task.doerId
    );
  };

  // Get pending applications for tasks created by the user
  const getPendingApplications = () => {
    const activeTaskIds = tasks.filter(task => 
      task.status === 'active' && 
      task.creatorId === user?.id
    ).map(task => task.id);
    
    return applications.filter(app => 
      app.status === 'pending' && 
      activeTaskIds.includes(app.taskId)
    );
  };

  return (
    <TabsList className="flex-grow md:flex-grow-0">
      <TabsTrigger value="active">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>Active ({getActiveTasks().length})</span>
        </div>
      </TabsTrigger>
      <TabsTrigger value="approved">
        <div className="flex items-center gap-1">
          <ClipboardCheck className="h-4 w-4" />
          <span>Approved ({getApprovedTasks().length})</span>
        </div>
      </TabsTrigger>
      <TabsTrigger value="applied">
        <div className="flex items-center gap-1">
          <ClipboardCheck className="h-4 w-4" />
          <span>Applied ({getAppliedTasks().length})</span>
        </div>
      </TabsTrigger>
      <TabsTrigger value="requests">
        <div className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          <span>Requests ({getPendingApplications().length})</span>
        </div>
      </TabsTrigger>
    </TabsList>
  );
};

export default TaskFilters;
