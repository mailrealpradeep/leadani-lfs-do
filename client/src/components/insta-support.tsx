import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Send, Sparkles, MessageCircle, HelpCircle, Bot, User } from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  domain?: string;
  timestamp: Date;
}

interface InstaSupportResponse {
  answer: string;
  domain: string;
  intent: string;
  error?: string;
}

const SUGGESTED_QUESTIONS = [
  "Why is lead highlighted pink?",
  "Why didn't I get PowerScore points?",
  "How does round-robin allocation work?",
  "What are highlighting rules?",
  "Why is Pending filter showing 0 leads?",
];

export function InstaSupport() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      return await apiRequest<InstaSupportResponse>("POST", "/api/insta-support", { question });
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        domain: data.domain,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error: any) => {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error.message || "Sorry, I couldn't process your question. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || askMutation.isPending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    askMutation.mutate(inputValue.trim());
    setInputValue("");
  };

  const handleSuggestionClick = (question: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    askMutation.mutate(question);
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Insta Support
            <Badge variant="secondary" className="ml-2">AI Powered</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ask any question about Leadani features, rules, or why things work the way they do
          </p>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">How can I help you?</h3>
                <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                  I can explain why leads are highlighted, why filters show no results, 
                  how PowerScore works, and much more!
                </p>
                
                <div className="w-full max-w-md">
                  <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleSuggestionClick(q)}
                        disabled={askMutation.isPending}
                        data-testid={`button-suggestion-${i}`}
                      >
                        <HelpCircle className="h-3 w-3 mr-1" />
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                      data-testid={`message-${message.role}-${message.id}`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.domain && message.role === 'assistant' && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {message.domain}
                        </Badge>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                
                {askMutation.isPending && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          
          <div className="p-4 border-t flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question... (e.g., Why is lead 9876543210 pink?)"
                disabled={askMutation.isPending}
                maxLength={500}
                data-testid="input-question"
              />
              <Button 
                type="submit" 
                disabled={!inputValue.trim() || askMutation.isPending}
                data-testid="button-send"
              >
                {askMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Powered by Sarvam AI
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function InstaSupportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50"
      data-testid="button-insta-support"
    >
      <MessageCircle className="h-5 w-5" />
    </Button>
  );
}

export function InstaSupportDrawer({ 
  open, 
  onClose 
}: { 
  open: boolean; 
  onClose: () => void;
}) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute bottom-0 right-0 w-full sm:w-[400px] h-[600px] sm:h-[500px] sm:bottom-20 sm:right-4 sm:rounded-lg overflow-hidden shadow-xl">
        <div className="h-full bg-background border rounded-lg">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">Insta Support</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-drawer">
              Close
            </Button>
          </div>
          <div className="h-[calc(100%-52px)]">
            <InstaSupport />
          </div>
        </div>
      </div>
    </div>
  );
}
