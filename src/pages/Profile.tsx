import React, { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Edit, LogOut, User, Camera, Upload, Loader2, PlusCircle } from 'lucide-react';
import { UserType, TaskType } from '@/lib/types';
import TaskCard from '@/components/TaskCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import UserStatistics from '@/components/UserStatistics';
import CreateTaskForm from '@/components/CreateTaskForm';

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, profile, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [activeTasks, setActiveTasks] = useState<TaskType[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
  });
  const [isProfileImageDialogOpen, setIsProfileImageDialogOpen] = useState(false);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!authUser) {
        navigate('/login');
        return;
      }

      try {
        setIsLoading(true);

        if (profile) {
          const userProfileData: UserType = {
            id: authUser.id,
            username: profile.username || authUser.email?.split('@')[0] || 'User',
            email: authUser.email || '',
            requestorRating: 0,
            doerRating: 0,
            profileImage: profile.avatar_url || '',
          };

          setUserProfile(userProfileData);
          setFormData({
            username: userProfileData.username,
            email: userProfileData.email,
          });

          const { data: requestorRatingData } = await supabase
            .from('tasks')
            .select('creator_rating')
            .eq('creator_id', authUser.id)
            .not('creator_rating', 'is', null);

          const { data: doerRatingData } = await supabase
            .from('tasks')
            .select('doer_rating')
            .eq('doer_id', authUser.id)
            .not('doer_rating', 'is', null);

          if (requestorRatingData && requestorRatingData.length > 0) {
            const avgRequestorRating = requestorRatingData.reduce((sum, task) => sum + (task.creator_rating || 0), 0) / requestorRatingData.length;
            userProfileData.requestorRating = avgRequestorRating;
          }

          if (doerRatingData && doerRatingData.length > 0) {
            const avgDoerRating = doerRatingData.reduce((sum, task) => sum + (task.doer_rating || 0), 0) / doerRatingData.length;
            userProfileData.doerRating = avgDoerRating;
          }

          setUserProfile(userProfileData);
        }

        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('creator_id', authUser.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (tasksError) throw tasksError;

        if (tasksData) {
          const formattedTasks: TaskType[] = await Promise.all(tasksData.map(async (task) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', task.creator_id)
              .single();
            
            const taskType = task.task_type === 'joint' ? 'joint' as const : 'normal' as const;
            
            return {
              id: task.id,
              title: task.title,
              description: task.description || '',
              location: task.location || '',
              reward: task.reward || 0,
              deadline: task.deadline ? new Date(task.deadline) : new Date(),
              taskType: taskType,
              status: (task.status || 'active') as 'active' | 'completed',
              createdAt: new Date(task.created_at),
              creatorId: task.creator_id,
              creatorName: profileData?.username || 'Unknown user',
              creatorRating: task.creator_rating || 0,
            };
          }));

          setActiveTasks(formattedTasks);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [authUser, profile, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authUser) return;
    
    try {
      const { error } = await updateProfile({
        username: formData.username,
      });

      if (error) throw error;

      if (userProfile) {
        setUserProfile({
          ...userProfile,
          username: formData.username,
          email: formData.email,
        });
      }
      
      setIsEditing(false);
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;

    try {
      setIsUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}-avatar-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('user-content')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await updateProfile({
        avatar_url: avatarUrl,
      });

      if (updateError) throw updateError;

      if (userProfile) {
        setUserProfile({
          ...userProfile,
          profileImage: avatarUrl,
        });
      }

      setIsProfileImageDialogOpen(false);
      
      toast({
        title: "Profile image updated",
        description: "Your profile image has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile image:', error);
      toast({
        title: "Error",
        description: "Failed to update profile image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateTask = async (task: any) => {
    if (!authUser) {
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
          creator_id: authUser?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Task Created",
        description: "Your task has been created successfully."
      });
      
      setIsCreateTaskDialogOpen(false);
      
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

  if (isLoading) {
    return (
      <Layout requireAuth>
        <div className="flex justify-center items-center min-h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading profile...</span>
        </div>
      </Layout>
    );
  }

  if (!userProfile) {
    return (
      <Layout requireAuth>
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <p className="text-muted-foreground mb-4">Could not load profile. Please try again.</p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout requireAuth>
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Profile
                {!isEditing && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit size={16} />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    {userProfile.profileImage ? (
                      <AvatarImage 
                        src={userProfile.profileImage} 
                        alt={userProfile.username}
                      />
                    ) : (
                      <AvatarFallback>
                        <User className="h-12 w-12" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <Button 
                    size="icon" 
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                    onClick={() => setIsProfileImageDialogOpen(true)}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({ 
                            username: userProfile.username, 
                            email: userProfile.email 
                          });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Save</Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="text-center">
                      <h3 className="text-xl font-medium">{userProfile.username}</h3>
                      <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                    </div>
                    
                    <div className="flex justify-center space-x-6 w-full">
                      <div className="text-center">
                        <div className="flex items-center justify-center">
                          <p className="text-yellow-500 font-bold">
                            {userProfile.requestorRating > 0 
                              ? userProfile.requestorRating.toFixed(1) 
                              : "N/A"}
                          </p>
                          {userProfile.requestorRating > 0 && (
                            <Star className="h-4 w-4 text-yellow-500 ml-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Requestor Rating</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center">
                          <p className="text-green-500 font-bold">
                            {userProfile.doerRating > 0 
                              ? userProfile.doerRating.toFixed(1) 
                              : "N/A"}
                          </p>
                          {userProfile.doerRating > 0 && (
                            <Star className="h-4 w-4 text-green-500 ml-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Doer Rating</p>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="md:col-span-2">
            <Tabs defaultValue="tasks">
              <TabsList>
                <TabsTrigger value="tasks">Active Tasks</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="tasks" className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">
                    Your Active Tasks ({activeTasks.length})
                  </h3>
                </div>
                
                {activeTasks.length > 0 ? (
                  <div className="flex flex-col space-y-6">
                    {activeTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isOwner={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>You don't have any active tasks.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="stats" className="mt-4">
                {userProfile && <UserStatistics userId={userProfile.id} />}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Dialog open={isProfileImageDialogOpen} onOpenChange={setIsProfileImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change profile picture</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="flex items-center justify-center">
              <Avatar className="h-24 w-24">
                {userProfile.profileImage ? (
                  <AvatarImage 
                    src={userProfile.profileImage} 
                    alt={userProfile.username}
                  />
                ) : (
                  <AvatarFallback>
                    <User className="h-12 w-12" />
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleProfileImageChange}
              className="hidden"
            />
            <Button 
              onClick={triggerFileInput} 
              className="w-full"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload new image
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <CreateTaskForm 
            onSubmit={handleCreateTask}
            onCancel={() => setIsCreateTaskDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Profile;
