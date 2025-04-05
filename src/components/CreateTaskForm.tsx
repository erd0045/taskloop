
import React, { useState } from 'react';
import { DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TaskType } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CreateTaskFormProps {
  onSubmit: (task: TaskType) => void;
  onCancel: () => void;
}

const CreateTaskForm = ({ onSubmit, onCancel }: CreateTaskFormProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    reward: 100,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 1 week from now
    taskType: 'normal' as 'normal' | 'joint',
    timeOfDay: '23:59' // Default to end of day
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTaskTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, taskType: value as 'normal' | 'joint' }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, deadline: date }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a deadline with the specific time of day
    const deadlineDate = new Date(formData.deadline);
    const [hours, minutes] = formData.timeOfDay.split(':').map(Number);
    deadlineDate.setHours(hours, minutes);
    
    // Create new task object
    const newTask: TaskType = {
      id: `task-${Date.now()}`,
      ...formData,
      deadline: deadlineDate,
      status: 'active',
      createdAt: new Date(),
      creatorId: 'user1', // Would come from auth context in a real app
      creatorName: 'John Doe', // Would come from auth context in a real app
      creatorRating: 4.5, // Would come from auth context in a real app
    };
    
    onSubmit(newTask);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogDescription>
          Fill in the details to create a new task.
        </DialogDescription>
      </DialogHeader>
      
      <ScrollArea className="h-[60vh] pr-4">
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Title of your task"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what needs to be done"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Where should this task be done"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="reward">Reward (₹)</Label>
            <Input
              id="reward"
              name="reward"
              type="number"
              min="1"
              value={formData.reward}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Deadline Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.deadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.deadline ? format(formData.deadline, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.deadline}
                  onSelect={handleDateSelect}
                  initialFocus
                  disabled={(date) => date < new Date()}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="timeOfDay">Completion Time</Label>
            <Input
              id="timeOfDay"
              name="timeOfDay"
              type="time"
              value={formData.timeOfDay}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-muted-foreground">Specify the exact time by which the task must be completed</p>
          </div>
          
          <div className="grid gap-2">
            <Label>Task Type</Label>
            <RadioGroup 
              value={formData.taskType} 
              onValueChange={handleTaskTypeChange}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="taskTypeNormal" />
                <Label htmlFor="taskTypeNormal">Normal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="joint" id="taskTypeJoint" />
                <Label htmlFor="taskTypeJoint">Joint</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </ScrollArea>
      
      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Task</Button>
      </DialogFooter>
    </form>
  );
};

export default CreateTaskForm;
