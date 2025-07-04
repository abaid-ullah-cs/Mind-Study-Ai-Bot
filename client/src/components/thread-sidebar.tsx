import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { X, Send, Brain, FileText, HelpCircle, Download, ImageIcon, Zap } from "lucide-react";
import { format } from "date-fns";

interface ThreadSidebarProps {
  messageId: number;
  onClose: () => void;
}

export default function ThreadSidebar({ messageId, onClose }: ThreadSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState("");
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Get original message
  const { data: originalMessage } = useQuery({
    queryKey: [`/api/messages/${messageId}`],
  });

  // Get threads
  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: [`/api/messages/${messageId}/threads`],
  });

  // Send thread reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/messages/${messageId}/threads`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${messageId}/threads`] });
      setReplyContent("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send reply: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Generate AI response mutation
  const generateAiResponseMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/ai/thread-response", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${messageId}/threads`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate AI response: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Generate quick quiz mutation
  const generateQuickQuizMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/ai/generate-quiz", data);
    },
    onSuccess: () => {
      setIsGeneratingQuiz(false);
      toast({
        title: "Quiz Generated!",
        description: "A new quiz has been created based on this article.",
      });
    },
    onError: (error) => {
      setIsGeneratingQuiz(false);
      toast({
        title: "Error",
        description: "Failed to generate quiz: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Generate study plan mutation
  const generateStudyPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/ai/generate-study-plan", data);
    },
    onSuccess: () => {
      setIsGeneratingPlan(false);
      toast({
        title: "Study Plan Generated!",
        description: "A personalized study plan has been created.",
      });
    },
    onError: (error) => {
      setIsGeneratingPlan(false);
      toast({
        title: "Error", 
        description: "Failed to generate study plan: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendReply = () => {
    if (!replyContent.trim()) return;

    // Check if this should trigger an AI response
    const lowerReply = replyContent.toLowerCase();
    const isAiRequest = lowerReply.includes("explain") || 
                       lowerReply.includes("can you") ||
                       lowerReply.includes("help") ||
                       lowerReply.includes("example") ||
                       lowerReply.includes("diagram");

    if (isAiRequest) {
      // Send user message first
      sendReplyMutation.mutate({
        content: replyContent,
      });
      
      // Then generate AI response
      generateAiResponseMutation.mutate({
        question: replyContent,
        messageId: messageId,
        subject: "physics", // This would be dynamic based on channel
      });
    } else {
      // Regular reply
      sendReplyMutation.mutate({
        content: replyContent,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // Get summary of original message for context
  const getMessageSummary = (message: any) => {
    if (!message) return "";
    
    if (message.messageType === "article") {
      const article = JSON.parse(message.content);
      return article.title + " - " + article.content.substring(0, 100) + "...";
    }
    
    return message.content.substring(0, 100) + (message.content.length > 100 ? "..." : "");
  };

  // Get article context for quick actions
  const getArticleContext = (message: any) => {
    if (!message || message.messageType !== "article") return null;
    return JSON.parse(message.content);
  };

  // Handle quick actions
  const handleQuickQuiz = () => {
    const article = getArticleContext(originalMessage);
    if (!article) {
      toast({
        title: "Error",
        description: "Can only generate quiz from article content",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingQuiz(true);
    generateQuickQuizMutation.mutate({
      topic: article.title,
      subject: "Physics", // This would be dynamic based on channel
      channelId: 1, // This would be dynamic
      numQuestions: 3,
    });
  };

  const handleStudyPlan = () => {
    const article = getArticleContext(originalMessage);
    if (!article) {
      toast({
        title: "Error", 
        description: "Can only generate study plan from article content",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPlan(true);
    generateStudyPlanMutation.mutate({
      subject: "Physics", // This would be dynamic
      goals: `Master the concepts covered in: ${article.title}`,
      timeframe: "2 weeks",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Export PDF",
      description: "PDF export functionality will be available soon!",
    });
  };

  const handleGenerateImage = () => {
    toast({
      title: "Generate Image",
      description: "AI image generation will be available when you provide an OpenAI API key!",
    });
  };

  return (
    <div className="w-96 border-l border-gray-200 bg-gray-50 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Thread</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-1">Discussion thread</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Original message reference */}
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-3">
            <div className="text-xs text-gray-600 mb-2">Replying to:</div>
            <div className="text-sm text-gray-800">
              {getMessageSummary(originalMessage)}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Zap className="w-4 h-4 mr-2 text-study-purple" />
              Quick Actions
            </h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={handleQuickQuiz}
                disabled={isGeneratingQuiz || !getArticleContext(originalMessage)}
              >
                <HelpCircle className="w-3 h-3 mr-2" />
                {isGeneratingQuiz ? "Generating..." : "Generate Quiz"}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={handleStudyPlan}
                disabled={isGeneratingPlan || !getArticleContext(originalMessage)}
              >
                <FileText className="w-3 h-3 mr-2" />
                {isGeneratingPlan ? "Creating..." : "Study Plan"}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={handleExportPDF}
              >
                <Download className="w-3 h-3 mr-2" />
                Export PDF
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={handleGenerateImage}
              >
                <ImageIcon className="w-3 h-3 mr-2" />
                Generate Image
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Thread replies */}
        {threadsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-study-purple"></div>
          </div>
        ) : threads && threads.length > 0 ? (
          <div className="space-y-4">
            {threads.map((thread: any) => (
              <div key={thread.id} className="flex items-start space-x-2">
                {thread.isAi ? (
                  <div className="w-6 h-6 bg-study-purple rounded-full flex items-center justify-center">
                    <Brain className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={thread.author?.profileImageUrl || ""} />
                    <AvatarFallback className="bg-study-purple text-white text-xs">
                      {(thread.author?.firstName?.[0] || thread.author?.email?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium text-gray-900">
                      {thread.isAi ? "StudyChat AI" : (thread.author?.firstName || thread.author?.email || "User")}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(thread.createdAt), "h:mm a")}
                    </span>
                  </div>
                  <Card className="bg-white">
                    <CardContent className="p-3">
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">
                        {thread.content}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm py-8">
            No replies yet. Be the first to comment!
          </div>
        )}
      </div>

      {/* Thread input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <Input
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Reply to thread..."
            className="text-sm"
            disabled={sendReplyMutation.isPending || generateAiResponseMutation.isPending}
          />
          <Button
            size="sm"
            onClick={handleSendReply}
            disabled={!replyContent.trim() || sendReplyMutation.isPending || generateAiResponseMutation.isPending}
            className="bg-study-purple hover:bg-study-purple/90"
          >
            {sendReplyMutation.isPending || generateAiResponseMutation.isPending ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            ) : (
              <Send className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
