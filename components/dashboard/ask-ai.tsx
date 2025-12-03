'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AskAIProps {
  className?: string;
}

const SUGGESTIONS = [
  'How did reply rates change this week?',
  'What\'s my LLM cost breakdown?',
  'Show me opt-out trends',
  'Which campaign performs best?',
];

export function AskAI({ className }: AskAIProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAsk = async (q?: string) => {
    const queryText = q || question;
    if (!queryText.trim() || loading) return;

    setLoading(true);
    setAnswer('');
    setShowSuggestions(false);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText }),
      });
      const data = await res.json();
      setAnswer(data.answer || 'No answer available.');
    } catch {
      setAnswer('Sorry, something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuestion(suggestion);
    handleAsk(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-purple">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Ask AI</h3>
              <p className="text-xs text-text-secondary">Natural language insights</p>
            </div>
          </div>

          {/* Input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (e.target.value === '') setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your metrics..."
              className={cn(
                'w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 pr-12',
                'text-sm text-text-primary placeholder:text-text-secondary/50',
                'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary',
                'transition-all duration-200'
              )}
              disabled={loading}
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => handleAsk()}
              disabled={loading || !question.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Suggestions */}
          <AnimatePresence>
            {showSuggestions && !answer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex flex-wrap gap-2"
              >
                {SUGGESTIONS.map((suggestion, index) => (
                  <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-full',
                      'bg-surface-elevated text-text-secondary',
                      'hover:bg-accent-primary/10 hover:text-accent-primary',
                      'border border-border hover:border-accent-primary/30',
                      'transition-all duration-200'
                    )}
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Answer */}
          <AnimatePresence mode="wait">
            {(loading || answer) && (
              <motion.div
                key={loading ? 'loading' : 'answer'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 rounded-xl bg-surface-elevated border border-border p-4"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
                    <span className="text-sm text-text-secondary">Analyzing your data...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <div 
                      className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: answer
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/•/g, '<span class="text-accent-primary">•</span>')
                      }}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

