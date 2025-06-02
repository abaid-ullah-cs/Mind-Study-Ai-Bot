import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronDown, 
  Hash, 
  Plus, 
  BookOpen, 
  Zap, 
  FileText, 
  Download, 
  Settings,
  Users
} from "lucide-react";

interface SidebarProps {
  workspaces: any[];
  channels: any[];
  selectedWorkspaceId: number | null;
  selectedChannelId: number | null;
  onWorkspaceSelect: (id: number) => void;
  onChannelSelect: (id: number) => void;
}

export default function Sidebar({
  workspaces,
  channels,
  selectedWorkspaceId,
  selectedChannelId,
  onWorkspaceSelect,
  onChannelSelect,
}: SidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showWorkspaceDialog, setShowWorkspaceDialog] = useState(false);
  const [showChannelDialog, setShowChannelDialog] = useState(false);

  // Get study progress
  const { data: studyProgress } = useQuery({
    queryKey: ["/api/study-progress"],
  });

  // Workspace form
  const workspaceForm = useForm({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Channel form
  const channelForm = useForm({
    defaultValues: {
      name: "",
      description: "",
      type: "subject",
    },
  });

  // Create workspace mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/workspaces", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      setShowWorkspaceDialog(false);
      workspaceForm.reset();
      toast({
        title: "Success",
        description: "Workspace created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create workspace: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/workspaces/${selectedWorkspaceId}/channels`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${selectedWorkspaceId}/channels`] });
      setShowChannelDialog(false);
      channelForm.reset();
      toast({
        title: "Success",
        description: "Channel created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create channel: " + error.message,
        variant: "destructive",
      });
    },
  });

  const onWorkspaceSubmit = (data: any) => {
    createWorkspaceMutation.mutate(data);
  };

  const onChannelSubmit = (data: any) => {
    createChannelMutation.mutate(data);
  };

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  // Calculate today's progress
  const todayProgress = studyProgress?.[0]?.progress;
  const progressPercentage = todayProgress 
    ? Math.min((todayProgress.topicsStudied / todayProgress.dailyGoal) * 100, 100)
    : 0;

  return (
    <div className="w-80 bg-slack-aubergine text-white flex flex-col">
      {/* Workspace Header */}
      <div className="p-4 border-b border-purple-800">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">StudyChat</h1>
          <Dialog open={showWorkspaceDialog} onOpenChange={setShowWorkspaceDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 hover:bg-purple-800">
                <ChevronDown className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white text-black">
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
              </DialogHeader>
              <form onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    {...workspaceForm.register("name", { required: true })}
                    placeholder="Final Exams 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...workspaceForm.register("description")}
                    placeholder="Workspace for exam preparation"
                  />
                </div>
                <Button type="submit" disabled={createWorkspaceMutation.isPending}>
                  {createWorkspaceMutation.isPending ? "Creating..." : "Create Workspace"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          <span className="text-sm">{user?.firstName || user?.email || "User"}</span>
        </div>
      </div>

      {/* Study Progress Overview */}
      {todayProgress && (
        <div className="p-4 bg-purple-900/50">
          <h3 className="text-sm font-semibold mb-2">Today's Progress</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Study Goal</span>
              <span>{todayProgress.topicsStudied}/{todayProgress.dailyGoal} topics</span>
            </div>
            <div className="w-full bg-purple-800 rounded-full h-2">
              <div 
                className="bg-study-cyan h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1 mb-6">
          <div className="flex items-center justify-between px-2 py-1 text-sm text-purple-200">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4" />
              <span>Workspaces</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-purple-800"
              onClick={() => setShowWorkspaceDialog(true)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          
          {workspaces.map((workspace) => (
            <div key={workspace.id} className="ml-6">
              <Button
                variant="ghost"
                className={`flex items-center space-x-2 w-full px-2 py-1 text-sm justify-start hover:bg-purple-800 ${
                  selectedWorkspaceId === workspace.id ? "bg-purple-800" : ""
                }`}
                onClick={() => onWorkspaceSelect(workspace.id)}
              >
                <Users className="w-4 h-4" />
                <span className="truncate">{workspace.name}</span>
                <Badge variant="secondary" className="ml-auto bg-purple-700 text-white">
                  {workspace.memberCount || 1}
                </Badge>
              </Button>
              
              {/* Subject Channels */}
              {selectedWorkspaceId === workspace.id && (
                <div className="ml-6 mt-2 space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 text-xs text-purple-300">
                    <span>Channels</span>
                    <Dialog open={showChannelDialog} onOpenChange={setShowChannelDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-purple-800"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white text-black">
                        <DialogHeader>
                          <DialogTitle>Create New Channel</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={channelForm.handleSubmit(onChannelSubmit)} className="space-y-4">
                          <div>
                            <Label htmlFor="channelName">Channel Name</Label>
                            <Input
                              id="channelName"
                              {...channelForm.register("name", { required: true })}
                              placeholder="physics"
                            />
                          </div>
                          <div>
                            <Label htmlFor="channelDescription">Description</Label>
                            <Textarea
                              id="channelDescription"
                              {...channelForm.register("description")}
                              placeholder="Physics study materials and discussions"
                            />
                          </div>
                          <Button type="submit" disabled={createChannelMutation.isPending}>
                            {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {channels.map((channel) => (
                    <Button
                      key={channel.id}
                      variant="ghost"
                      className={`flex items-center space-x-2 w-full px-2 py-1 text-sm justify-start hover:bg-purple-800 ${
                        selectedChannelId === channel.id ? "bg-purple-800" : ""
                      }`}
                      onClick={() => onChannelSelect(channel.id)}
                    >
                      <Hash className="w-4 h-4 text-purple-300" />
                      <span className="truncate">{channel.name}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2 px-2 py-1 text-sm text-purple-200">
            <Zap className="w-4 h-4" />
            <span>Quick Actions</span>
          </div>
          
          <Button
            variant="ghost"
            className="flex items-center space-x-2 w-full px-2 py-1 text-sm justify-start hover:bg-purple-800 ml-6"
            onClick={() => {
              toast({
                title: "Coming Soon",
                description: "Study plan generation will be available soon!",
              });
            }}
          >
            <FileText className="w-4 h-4" />
            <span>Study Plan</span>
          </Button>
          
          <Button
            variant="ghost"
            className="flex items-center space-x-2 w-full px-2 py-1 text-sm justify-start hover:bg-purple-800 ml-6"
            onClick={() => {
              if (selectedChannelId) {
                const channelName = selectedChannel?.name || "quiz";
                // This would trigger the quiz generation in the chat area
                toast({
                  title: "Quick Quiz",
                  description: `Ask the AI to create a quiz about ${channelName} in the chat!`,
                });
              }
            }}
          >
            <BookOpen className="w-4 h-4" />
            <span>Quick Quiz</span>
          </Button>
          
          <Button
            variant="ghost"
            className="flex items-center space-x-2 w-full px-2 py-1 text-sm justify-start hover:bg-purple-800 ml-6"
            onClick={() => {
              toast({
                title: "Export",
                description: "PDF export functionality coming soon!",
              });
            }}
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </Button>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-purple-800">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.profileImageUrl || ""} />
            <AvatarFallback className="bg-study-purple text-white">
              {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="text-sm font-medium">{user?.firstName || user?.email || "User"}</div>
            <div className="text-xs text-purple-300">Study Assistant</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 hover:bg-purple-800"
            onClick={() => window.location.href = "/api/logout"}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
