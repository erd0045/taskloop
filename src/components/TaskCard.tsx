
import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Edit, Trash, MapPin, CalendarClock, MessageCircle, Plus, Send, UserPlus, UserCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { TaskType } from '@/lib/types';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { extendedSupabase } from '@/integrations/supabase/extended-client';
import { useAuth } from '@/context/AuthContext';
import MaskedUsername from './MaskedUsername';

interface TaskCardProps {
  task: TaskType;
  isOwner?: boolean;
  isCompleted?: boolean;
  completed?: boolean;
  applicationStatus?: string;
  onCancel?: (taskId: string) => void;
  onEdit?: (task: TaskType) => void;
  onJoinJointTask?: (taskId: string, needs: string, reward: number) => void;
  onApproveJointRequestor?: (taskId: string, userId: string) => void;
  onRejectJointRequestor?: (taskId: string, userId: string) => void;
  onApproveDoer?: (taskId: string, userId: string) => void;
  onRejectDoer?: (taskId: string, userId: string) => void;
  onApply?: (taskId: string, message: string) => void;
  showActions?: boolean;
}

const TaskCard = ({ 
  task, 
  isOwner = false, 
  isCompleted = false,
  applicationStatus,
  onCancel,
  onEdit,
  onJoinJointTask,
  onApproveJointRequestor,
  onRejectJointRequestor,
  onApproveDoer,
  onRejectDoer,
  onApply
}: TaskCardProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [isJoinJointDialogOpen, setIsJoinJointDialogOpen] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [jointTaskNeeds, setJointTaskNeeds] = useState('');
  const [jointTaskReward, setJointTaskReward] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCancel = () => {
    if (onCancel) {
      onCancel(task.id);
    }
  };

  const handleEditSubmit = (updatedTask: TaskType) => {
    if (onEdit) {
      onEdit(updatedTask);
      setIsEditDialogOpen(false);
    }
  };

  const handleCardClick = () => {
    if (!isOwner) {
      setIsDetailsDialogOpen(true);
    }
  };

  const handleApply = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to apply for tasks.",
        variant: "destructive"
      });
      return;
    }

    if (!applicationMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to the task creator.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (onApply) {
        await onApply(task.id, applicationMessage);
      } else {
        const { data: existingApplications, error: checkError } = await extendedSupabase
          .from('task_applications')
          .select('*')
          .eq('task_id', task.id)
          .eq('applicant_id', user.id)
          .limit(1);
          
        if (checkError) throw checkError;
        
        if (existingApplications && existingApplications.length > 0) {
          toast({
            title: "Already Applied",
            description: "You have already applied for this task",
            variant: "destructive"
          });
          setIsApplyDialogOpen(false);
          setIsSubmitting(false);
          return;
        }
        
        const { error } = await extendedSupabase
          .from('task_applications')
          .insert({
            task_id: task.id,
            applicant_id: user.id,
            message: applicationMessage
          });

        if (error) throw error;

        toast({
          title: "Application Submitted",
          description: "Your application has been sent to the task creator."
        });
      }

      setApplicationMessage('');
      setIsApplyDialogOpen(false);
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinJointTask = () => {
    if (onJoinJointTask && jointTaskNeeds.trim() && jointTaskReward > 0) {
      onJoinJointTask(task.id, jointTaskNeeds, jointTaskReward);
      setJointTaskNeeds('');
      setJointTaskReward(100);
      setIsJoinJointDialogOpen(false);
      toast({
        title: "Join Request Submitted",
        description: "Your request to join this joint task has been sent."
      });
    }
  };

  const handleAddToChat = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to message users.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: existingChats, error: chatCheckError } = await extendedSupabase
        .from('chats')
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${task.creatorId}),and(user1_id.eq.${task.creatorId},user2_id.eq.${user.id})`)
        .limit(1);
        
      if (chatCheckError) throw chatCheckError;
      
      let chatId;
      
      if (existingChats && existingChats.length > 0) {
        chatId = existingChats[0].id;
      } else {
        const { data: newChat, error: createChatError } = await extendedSupabase
          .from('chats')
          .insert({
            user1_id: user.id,
            user2_id: task.creatorId
          })
          .select()
          .single();
          
        if (createChatError) throw createChatError;
        chatId = newChat.id;
      }
      
      await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          receiver_id: task.creatorId,
          content: `Hi, I'm interested in your task: ${task.title}`,
          read: false
        });
      
      setIsDetailsDialogOpen(false);
      
      navigate('/chat', { 
        state: { 
          activeChatId: chatId,
          participant: {
            id: task.creatorId,
            name: task.creatorName
          }
        }
      });
      
      toast({
        title: "Chat Started",
        description: "A chat has been started with the task owner."
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFullyCompleted = () => {
    return (
      task.status === 'completed' || 
      isCompleted || 
      (task.isRequestorVerified && task.isDoerVerified && task.isRequestorRated && task.isDoerRated)
    );
  };

  const getStatusInfo = () => {
    if (isFullyCompleted()) {
      return {
        color: 'text-red-500',
        bgColor: 'bg-red-500',
        text: 'Done',
        variant: 'destructive' as const
      };
    } else if (task.isRequestorVerified && task.isDoerVerified) {
      return {
        color: 'text-blue-500',
        bgColor: 'bg-blue-500',
        text: 'Verification Complete',
        variant: 'default' as const
      };
    } else if (task.doerId) {
      return {
        color: 'text-green-500',
        bgColor: 'bg-green-500',
        text: 'Active',
        variant: 'default' as const
      };
    } else {
      return {
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500',
        text: 'Live',
        variant: 'secondary' as const
      };
    }
  };

  const hasApplied = applicationStatus !== undefined;

  const getApplicationStatusBadge = () => {
    if (!hasApplied) return null;
    
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
    let text = applicationStatus || '';
    
    switch (applicationStatus) {
      case 'approved':
        badgeVariant = "default";
        break;
      case 'pending':
        badgeVariant = "secondary";
        break;
      case 'rejected':
        badgeVariant = "destructive";
        break;
      default:
        break;
    }
    
    return <Badge variant={badgeVariant} className="ml-2">{text.charAt(0).toUpperCase() + text.slice(1)}</Badge>;
  };

  const statusInfo = getStatusInfo();
  const fullCompletion = isFullyCompleted();

  return (
    <>
      <Card 
        className={`w-full ${!isOwner && !fullCompletion ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
        onClick={!isOwner && !fullCompletion ? handleCardClick : undefined}
      >
        <CardContent className="p-4 flex-1">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center">
              <h3 className="font-semibold text-lg">{task.title}</h3>
              {getApplicationStatusBadge()}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <div className={`h-2.5 w-2.5 rounded-full ${statusInfo.bgColor} mr-2 animate-pulse`}></div>
                <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.text}</span>
              </div>
              <div className="text-lg font-bold">₹{task.reward}</div>
            </div>
          </div>
          
          <p className="text-muted-foreground mb-4 text-sm">{task.description}</p>
          
          <div className="flex items-center text-xs text-muted-foreground mb-2">
            <MapPin className="h-3 w-3 mr-1" />
            <span>{task.location}</span>
          </div>
          
          <div className="flex flex-col gap-1 mb-4">
            <div className="flex items-center text-xs text-muted-foreground">
              <CalendarClock className="h-3 w-3 mr-1" />
              <span>Due: {format(new Date(task.deadline), 'MMM d, yyyy')} at {format(new Date(task.deadline), 'h:mm a')}</span>
            </div>
          </div>
          
          {task.taskType === 'joint' && (
            <Badge variant="outline" className="mb-4">Joint Task</Badge>
          )}
          
          <div className="mt-auto flex justify-between items-center">
            <div className="text-sm"><MaskedUsername username={task.creatorName} /></div>
            <div className="flex items-center">
              <span className="text-yellow-500 font-medium">{task.creatorRating.toFixed(1)}</span>
              <Star className="h-4 w-4 text-yellow-500 ml-1" fill="currentColor" />
            </div>
          </div>
        </CardContent>
        
        {isOwner && !fullCompletion && (
          <CardFooter className="p-4 pt-0 flex justify-end space-x-2">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <div>Edit Task Form Placeholder</div>
              </DialogContent>
            </Dialog>
            
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              <Trash className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </CardFooter>
        )}
      </Card>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{task.title}</DialogTitle>
            <DialogDescription className="flex items-center mt-2">
              <Badge variant={statusInfo.variant} className="mr-2">
                {statusInfo.text}
              </Badge>
              <span className="font-bold">₹{task.reward}</span>
              {getApplicationStatusBadge()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p>{task.description}</p>
            
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{task.location}</span>
            </div>
            
            <div className="flex items-center text-sm">
              <CalendarClock className="h-4 w-4 mr-2" />
              <span>Due: {format(new Date(task.deadline), 'MMM d, yyyy')} at {format(new Date(task.deadline), 'h:mm a')}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <span className="font-medium mr-2">Posted by:</span> 
                <MaskedUsername username={task.creatorName} />
                <span className="flex items-center ml-2">
                  <span className="text-yellow-500 font-medium">{task.creatorRating.toFixed(1)}</span>
                  <Star className="h-4 w-4 text-yellow-500 ml-1" fill="currentColor" />
                </span>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2">
            {!fullCompletion && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleAddToChat} 
                  className="flex items-center"
                  disabled={isSubmitting}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
                
                {!hasApplied && task.taskType === 'joint' ? (
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsJoinJointDialogOpen(true)} 
                      className="flex items-center"
                      disabled={isSubmitting}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                    <Button 
                      onClick={() => setIsApplyDialogOpen(true)}
                      className="flex items-center"
                      disabled={isSubmitting}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Join
                    </Button>
                  </div>
                ) : !hasApplied ? (
                  <Button 
                    onClick={() => setIsApplyDialogOpen(true)}
                    className="flex items-center"
                    disabled={isSubmitting}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Apply
                  </Button>
                ) : (
                  <Button disabled className="flex items-center">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Applied
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Apply for Task</DialogTitle>
            <DialogDescription>
              Send a message to the task creator explaining why you're a good fit for this task.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="application-message">Your Message</Label>
              <Textarea 
                id="application-message" 
                placeholder="Explain why you're interested in this task and your qualifications..."
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleApply} 
              disabled={!applicationMessage.trim() || isSubmitting}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isJoinJointDialogOpen} onOpenChange={setIsJoinJointDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Join as Task Requestor</DialogTitle>
            <DialogDescription>
              Describe what you need help with and how much you're willing to pay.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="joint-task-needs">What do you need?</Label>
              <Textarea 
                id="joint-task-needs" 
                placeholder="Describe what you need help with..."
                value={jointTaskNeeds}
                onChange={(e) => setJointTaskNeeds(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="joint-task-reward">Reward (₹)</Label>
              <Input 
                id="joint-task-reward" 
                type="number"
                min="1"
                value={jointTaskReward}
                onChange={(e) => setJointTaskReward(parseInt(e.target.value))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsJoinJointDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleJoinJointTask} 
              disabled={!jointTaskNeeds.trim() || jointTaskReward <= 0 || isSubmitting}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskCard;
