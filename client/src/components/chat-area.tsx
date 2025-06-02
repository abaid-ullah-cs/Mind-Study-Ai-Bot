import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import MessageItem from "./message-item";
import { 
  Search, 
  Info, 
  Plus, 
  Paperclip, 
  Smile, 
  Send 
} from "lucide-react";

interface ChatAreaProps {
  channelId: number | null;
  onThreadOpen: (messageId: number) => void;
  onTooltipShow: (term: string, definition: string) => void;
}

export default function ChatArea({ channelId, onThreadOpen, onTooltipShow }: ChatAreaProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get channel info
  const { data: channel } = useQuery({
    queryKey: [`/api/channels/${channelId}`],
    enabled: !!channelId,
  });

  // Get messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: [`/api/channels/${channelId}/messages`],
    enabled: !!channelId,
  });

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/channels/${channelId}/messages`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/channels/${channelId}/messages`] });
      setMessage("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Generate article mutation
  const generateArticleMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/ai/generate-article", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/channels/${channelId}/messages`] });
      setIsGenerating(false);
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: "Error",
        description: "Failed to generate article: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Generate quiz mutation
  const generateQuizMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/ai/generate-quiz", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/channels/${channelId}/messages`] });
      setIsGenerating(false);
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: "Error",
        description: "Failed to generate quiz: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim() || !channelId) return;

    // Check if this is an AI request
    const lowerMessage = message.toLowerCase();
    const isAiRequest = lowerMessage.includes("explain") || 
                       lowerMessage.includes("generate") ||
                       lowerMessage.includes("create") ||
                       lowerMessage.includes("quiz") ||
                       lowerMessage.includes("test");

    if (isAiRequest) {
      setIsGenerating(true);
      
      // Determine if it's a quiz request
      const isQuizRequest = lowerMessage.includes("quiz") || 
                           lowerMessage.includes("test") ||
                           lowerMessage.includes("questions");

      if (isQuizRequest) {
        generateQuizMutation.mutate({
          topic: message,
          subject: channel?.name || "general",
          channelId: channelId,
          numQuestions: 5,
        });
      } else {
        generateArticleMutation.mutate({
          prompt: message,
          subject: channel?.name || "general",
          channelId: channelId,
        });
      }
    } else {
      // Regular message
      sendMessageMutation.mutate({
        content: message,
        messageType: "text",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const insertSuggestion = (suggestion: string) => {
    setMessage(suggestion);
  };

  const suggestions = [
    "Generate practice problems",
    "Explain with examples", 
    "Create study flashcards",
    "Show real-world applications"
  ];

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Select a channel to start studying</h2>
          <p className="text-gray-500">Choose a subject channel from the sidebar to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            # {channel?.name || "channel"}
          </h2>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-study-purple/10 text-study-purple">
              Study Channel
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              AI Assistant Active
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="default"
            className="bg-study-purple hover:bg-study-purple/90"
            onClick={() => setMessage("Generate a study article about ")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ask AI
          </Button>
          
          <Button variant="ghost" size="sm">
            <Search className="w-5 h-5" />
          </Button>
          
          <Button variant="ghost" size="sm">
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-study-purple"></div>
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onThreadOpen={onThreadOpen}
              onTooltipShow={onTooltipShow}
            />
          ))
        ) : (
          <div className="bg-gradient-to-r from-study-purple/10 to-study-cyan/10 rounded-lg p-4 border border-study-purple/20">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-study-purple rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">StudyChat AI</div>
                <div className="text-sm text-gray-700">
                  Welcome to your {channel?.name || "study"} channel! I'm here to help you understand complex concepts, 
                  generate study materials, and answer your questions. Try asking me something like "Explain Newton's Laws" 
                  or "Create a quiz on thermodynamics".
                </div>
              </div>
            </div>
          </div>
        )}
        
        {isGenerating && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-study-purple rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">StudyChat AI</div>
                <div className="text-sm text-gray-600">Generating your study content...</div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask AI about concepts, request study materials, or start a discussion..."
                className="pr-20"
                disabled={sendMessageMutation.isPending || isGenerating}
              />
              <div className="absolute right-3 top-3 flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="h-auto p-1">
                  <Paperclip className="w-4 h-4 text-gray-500" />
                </Button>
                <Button variant="ghost" size="sm" className="h-auto p-1">
                  <Smile className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            </div>
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending || isGenerating}
            className="bg-study-purple hover:bg-study-purple/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Quick Suggestions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => insertSuggestion(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
