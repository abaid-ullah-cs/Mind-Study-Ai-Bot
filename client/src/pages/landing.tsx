import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Brain, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slack-aubergine via-purple-900 to-study-purple">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            StudyChat
          </h1>
          <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
            The AI-powered learning platform that transforms how you study. 
            Generate study materials, engage in threaded discussions, and track your progress.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            size="lg"
            className="bg-study-cyan hover:bg-study-cyan/90 text-white px-8 py-3 text-lg"
          >
            Get Started
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="bg-white/10 border-purple-300/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Brain className="w-12 h-12 text-study-cyan mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">AI Study Assistant</h3>
              <p className="text-purple-200 text-sm">
                Generate comprehensive study articles and explanations tailored to your needs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-purple-300/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-study-cyan mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Threaded Discussions</h3>
              <p className="text-purple-200 text-sm">
                Engage in focused conversations with follow-up questions and collaborative learning
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-purple-300/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <BookOpen className="w-12 h-12 text-study-cyan mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Study Workspaces</h3>
              <p className="text-purple-200 text-sm">
                Organize your subjects into dedicated channels and track your progress
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-purple-300/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Zap className="w-12 h-12 text-study-cyan mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Smart Tools</h3>
              <p className="text-purple-200 text-sm">
                Interactive quizzes, smart tooltips, and export functionality for complete learning
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="bg-white/5 border-purple-300/20 backdrop-blur-sm max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                Ready to revolutionize your studying?
              </h2>
              <p className="text-purple-200 mb-6">
                Join thousands of students who are already using StudyChat to achieve their academic goals.
              </p>
              <Button 
                onClick={() => window.location.href = '/api/login'}
                size="lg"
                className="bg-study-cyan hover:bg-study-cyan/90 text-white"
              >
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
