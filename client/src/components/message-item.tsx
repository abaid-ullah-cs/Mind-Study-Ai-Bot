import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Bookmark, 
  Download, 
  MessageSquare, 
  Brain, 
  Clock,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";

interface MessageItemProps {
  message: any;
  onThreadOpen: (messageId: number) => void;
  onTooltipShow: (term: string, definition: string) => void;
}

export default function MessageItem({ message, onThreadOpen, onTooltipShow }: MessageItemProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // Get thread count
  const { data: threads } = useQuery({
    queryKey: [`/api/messages/${message.id}/threads`],
  });

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (bookmarked) {
        return await apiRequest("DELETE", `/api/messages/${message.id}/bookmark`);
      } else {
        return await apiRequest("POST", `/api/messages/${message.id}/bookmark`);
      }
    },
    onSuccess: () => {
      setBookmarked(!bookmarked);
      toast({
        title: bookmarked ? "Bookmark removed" : "Bookmark added",
        description: bookmarked ? "Article removed from bookmarks" : "Article saved to bookmarks",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update bookmark: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Submit quiz mutation
  const submitQuizMutation = useMutation({
    mutationFn: async (answers: Record<number, string>) => {
      // This would typically send answers to backend for grading
      return { score: Math.floor(Math.random() * 100) + 1 };
    },
    onSuccess: (data) => {
      setQuizSubmitted(true);
      toast({
        title: "Quiz Submitted!",
        description: `Your score: ${data.score}% - ${data.score >= 70 ? "Great job!" : "Keep studying!"}`,
      });
    },
  });

  const handleDoubleClick = async (e: React.MouseEvent) => {
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 2) {
      try {
        const response = await apiRequest("POST", "/api/ai/term-definition", {
          term: selection,
        });
        const result = await response.json();
        onTooltipShow(result.term, result.definition);
      } catch (error) {
        console.error("Failed to get definition:", error);
        onTooltipShow(selection, `Definition for "${selection}" would be fetched from educational resources.`);
      }
    }
  };

  const handleQuizSubmit = () => {
    const quiz = JSON.parse(message.content);
    const answers = quiz.questions.map((_: any, index: number) => quizAnswers[index]);
    submitQuizMutation.mutate(quizAnswers);
  };

  const renderContent = () => {
    if (message.messageType === "article") {
      const article = JSON.parse(message.content);
      return (
        <Card className="shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-study-purple rounded-full flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">StudyChat AI</span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(message.createdAt), "h:mm a")}
                  </span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Article
                  </Badge>
                </div>
                {message.aiPrompt && (
                  <div className="text-sm text-gray-600 mb-2">
                    Generated from: "{message.aiPrompt}"
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => bookmarkMutation.mutate()}
                  className={bookmarked ? "text-yellow-600" : "text-gray-500"}
                >
                  <Bookmark className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-500">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <CardContent className="p-6" onDoubleClick={handleDoubleClick}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{article.title}</h3>
            
            <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
              <p>{article.content}</p>
              
              {article.sections?.map((section: any, index: number) => (
                <div key={index} className={`p-4 rounded ${
                  section.type === "definition" ? "bg-blue-50 border-l-4 border-blue-400" :
                  section.type === "explanation" ? "bg-green-50 border-l-4 border-green-400" :
                  section.type === "example" ? "bg-orange-50 border-l-4 border-orange-400" :
                  "bg-purple-50 border-l-4 border-purple-400"
                }`}>
                  <h4 className="font-semibold mb-2">{section.title}</h4>
                  <p>{section.content}</p>
                </div>
              ))}
            </div>
            
            {/* Article Actions */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{threads?.length || 0} replies</span>
                {threads && threads.length > 0 && (
                  <>
                    <span>•</span>
                    <span>Last reply {format(new Date(threads[threads.length - 1]?.createdAt || message.createdAt), "h:mm a")}</span>
                  </>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onThreadOpen(message.id)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                View thread
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (message.messageType === "quiz") {
      const quiz = JSON.parse(message.content);
      return (
        <Card className="shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-study-cyan rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">StudyChat AI</span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(message.createdAt), "h:mm a")}
                  </span>
                  <Badge variant="secondary" className="bg-cyan-100 text-cyan-700">
                    Quiz
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">{quiz.description}</div>
              </div>
            </div>
          </div>
          
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{quiz.title}</h3>
            
            <div className="space-y-6">
              {quiz.questions?.map((question: any, qIndex: number) => (
                <div key={qIndex} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {qIndex + 1}. {question.question}
                  </h4>
                  <RadioGroup
                    value={quizAnswers[qIndex] || ""}
                    onValueChange={(value) => 
                      setQuizAnswers(prev => ({ ...prev, [qIndex]: value }))
                    }
                    disabled={quizSubmitted}
                  >
                    {question.options?.map((option: string, oIndex: number) => (
                      <div key={oIndex} className="flex items-center space-x-2">
                        <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}o${oIndex}`} />
                        <Label htmlFor={`q${qIndex}o${oIndex}`} className="text-sm">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  
                  {quizSubmitted && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-700">
                        <strong>Correct Answer:</strong> {question.options[question.correctAnswer]}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{question.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>{quiz.questions?.length || 0} questions • Estimated time: {quiz.estimatedTime || 5} minutes</span>
              </div>
              {!quizSubmitted && (
                <Button
                  onClick={handleQuizSubmit}
                  disabled={Object.keys(quizAnswers).length < (quiz.questions?.length || 0) || submitQuizMutation.isPending}
                  className="bg-study-cyan hover:bg-study-cyan/90"
                >
                  {submitQuizMutation.isPending ? "Submitting..." : "Submit Quiz"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Regular text message
    return (
      <div className="flex items-start space-x-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={message.author?.profileImageUrl || ""} />
          <AvatarFallback className="bg-study-purple text-white text-xs">
            {(message.author?.firstName?.[0] || message.author?.email?.[0] || "U").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {message.author?.firstName || message.author?.email || "User"}
            </span>
            <span className="text-xs text-gray-500">
              {format(new Date(message.createdAt), "h:mm a")}
            </span>
          </div>
          <div 
            className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-700"
            onDoubleClick={handleDoubleClick}
          >
            {message.content}
          </div>
        </div>
      </div>
    );
  };

  return <div>{renderContent()}</div>;
}
