import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import ChatArea from "@/components/chat-area";
import ThreadSidebar from "@/components/thread-sidebar";
import TooltipModal from "@/components/tooltip-modal";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [threadOpen, setThreadOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    term: string;
    definition: string;
    show: boolean;
  }>({ term: "", definition: "", show: false });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch workspaces
  const { data: workspaces, isLoading: workspacesLoading } = useQuery({
    queryKey: ["/api/workspaces"],
    enabled: isAuthenticated,
  });

  // Auto-select first workspace
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  // Fetch channels for selected workspace
  const { data: channels } = useQuery({
    queryKey: [`/api/workspaces/${selectedWorkspaceId}/channels`],
    enabled: !!selectedWorkspaceId,
  });

  // Auto-select first channel
  useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  const handleChannelSelect = (channelId: number) => {
    setSelectedChannelId(channelId);
    setThreadOpen(false);
    setSelectedMessageId(null);
  };

  const handleThreadOpen = (messageId: number) => {
    setSelectedMessageId(messageId);
    setThreadOpen(true);
  };

  const handleThreadClose = () => {
    setThreadOpen(false);
    setSelectedMessageId(null);
  };

  const handleTooltipShow = (term: string, definition: string) => {
    setTooltipData({ term, definition, show: true });
  };

  const handleTooltipClose = () => {
    setTooltipData(prev => ({ ...prev, show: false }));
  };

  if (isLoading || workspacesLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-study-purple mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your study workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        workspaces={workspaces || []}
        channels={channels || []}
        selectedWorkspaceId={selectedWorkspaceId}
        selectedChannelId={selectedChannelId}
        onWorkspaceSelect={setSelectedWorkspaceId}
        onChannelSelect={handleChannelSelect}
      />
      
      <div className="flex-1 flex">
        <ChatArea
          channelId={selectedChannelId}
          onThreadOpen={handleThreadOpen}
          onTooltipShow={handleTooltipShow}
        />
        
        {threadOpen && selectedMessageId && (
          <ThreadSidebar
            messageId={selectedMessageId}
            onClose={handleThreadClose}
          />
        )}
      </div>

      <TooltipModal
        term={tooltipData.term}
        definition={tooltipData.definition}
        show={tooltipData.show}
        onClose={handleTooltipClose}
      />
    </div>
  );
}
