
import React from 'react';
import { TaskType, ApplicationType } from '@/lib/types';
import TaskCard from './TaskCard';
import TaskApplicationCard from './TaskApplicationCard';
import VerificationCodeCard from './VerificationCodeCard';
import { useAuth } from '@/context/AuthContext';

interface TaskGridProps {
  tasks: TaskType[];
  loading: boolean;
  emptyMessage: string;
  showApplications?: boolean;
  showVerificationCodes?: boolean;
  applications?: ApplicationType[];
  onCancel?: (taskId: string) => void;
  onEdit?: (task: TaskType) => void;
  onApply?: (taskId: string, message: string) => void;
  onApproveApplication?: (applicationId: string, taskId: string, applicantId: string) => void;
  onRejectApplication?: (applicationId: string) => void;
  onVerifyCode?: (taskId: string, code: string) => Promise<boolean>;
  onRequestRating?: () => void;
  fullWidth?: boolean;
}

const TaskGrid: React.FC<TaskGridProps> = ({ 
  tasks, 
  loading, 
  emptyMessage,
  showApplications = false,
  showVerificationCodes = false,
  applications = [],
  onCancel,
  onEdit,
  onApply,
  onApproveApplication,
  onRejectApplication,
  onVerifyCode,
  onRequestRating,
  fullWidth = false
}) => {
  const { user } = useAuth();

  if (loading) {
    return <p>Loading tasks...</p>;
  }

  if (showApplications && applications.length > 0) {
    return (
      <div className={fullWidth ? "flex flex-col space-y-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
        {applications.map(application => (
          <TaskApplicationCard
            key={application.id}
            application={application}
            onApprove={onApproveApplication}
            onReject={onRejectApplication}
          />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  if (showVerificationCodes) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {tasks.map(task => (
          <div key={task.id} className="flex flex-col space-y-4">
            <TaskCard
              task={task}
              onCancel={task.creatorId === user?.id ? onCancel : undefined}
            />
            
            {task.requestorVerificationCode && task.doerVerificationCode && (
              <VerificationCodeCard
                taskId={task.id}
                taskTitle={task.title}
                code={task.creatorId === user?.id ? task.requestorVerificationCode : task.doerVerificationCode}
                partnerId={task.creatorId === user?.id ? task.doerId || '' : task.creatorId}
                partnerName={task.creatorId === user?.id ? task.doerName || 'Task Doer' : task.creatorName}
                isDoer={task.doerId === user?.id}
                isVerified={task.creatorId === user?.id ? task.isRequestorVerified || false : task.isDoerVerified || false}
                isPartnerVerified={task.creatorId === user?.id ? task.isDoerVerified || false : task.isRequestorVerified || false}
                isRated={task.creatorId === user?.id ? task.isRequestorRated || false : task.isDoerRated || false}
                isPartnerRated={task.creatorId === user?.id ? task.isDoerRated || false : task.isRequestorRated || false}
                onVerify={onVerifyCode || (async () => false)}
                onRequestRating={onRequestRating || (() => {})}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={fullWidth ? "flex flex-col space-y-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onCancel={onCancel}
          onEdit={onEdit}
          onApply={onApply}
          applicationStatus={task.applicationStatus}
          completed={task.status === 'completed'}
        />
      ))}
    </div>
  );
};

export default TaskGrid;
