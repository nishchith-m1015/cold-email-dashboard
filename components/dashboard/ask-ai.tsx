'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Loader2, CheckCircle, Shield, ChevronDown, Square, User } from 'lucide-react';
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
  const [lastQuestion, setLastQuestion] = useState(''); // Track the asked question
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false); // Track streaming state
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [openaiKey, setOpenaiKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [useStreaming, setUseStreaming] = useState(false);
  const [provider, setProvider] = useState<'openai' | 'openrouter'>('openai');
  const [statusLoading, setStatusLoading] = useState(false);
  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const [openrouterConfigured, setOpenrouterConfigured] = useState(false);
  const [hasEnvOpenAI, setHasEnvOpenAI] = useState(false);
  const [hasEnvOpenRouter, setHasEnvOpenRouter] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState<string>('gpt-4o');
  const [customModel, setCustomModel] = useState<string>('');
  const [modelsLoading, setModelsLoading] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<HTMLDivElement>(null);
  const layoutEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // For auto-scroll
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeKey = useMemo(() => {
    return provider === 'openai' ? openaiKey : openrouterKey;
  }, [provider, openaiKey, openrouterKey]);

  const hasProviderKey = useMemo(() => {
    return provider === 'openai' ? openaiConfigured || openaiKey : openrouterConfigured || openrouterKey;
  }, [provider, openaiConfigured, openrouterConfigured, openaiKey, openrouterKey]);

  const hasProviderEnv = useMemo(() => {
    return provider === 'openai' ? hasEnvOpenAI : hasEnvOpenRouter;
  }, [provider, hasEnvOpenAI, hasEnvOpenRouter]);

  const canAsk = useMemo(() => {
    return (hasProviderKey || hasProviderEnv || activeKey.trim().length > 0) && (customModel || model);
  }, [hasProviderKey, hasProviderEnv, activeKey, customModel, model]);

  const handleAsk = async (q?: string) => {
    const queryText = q || question;
    if (!queryText.trim() || loading) return;
    // Guard: if no key and no env fallback, let backend decide; we still allow ask.

    setLoading(true);
    setLastQuestion(queryText); // Store the question for display
    setAnswer('');
    setShowSuggestions(false);

    // Abort any in-flight request before starting a new one
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeKey.trim()) {
        headers['x-openai-key'] = activeKey.trim();
      }

      const chosenModel = customModel || model || (provider === 'openai' ? 'gpt-4o' : 'openrouter/auto');

      if (useStreaming) {
        setIsStreaming(true);
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers,
          body: JSON.stringify({ question: queryText, stream: true, provider, model: chosenModel }),
          signal: controller.signal,
        });
        if (!res.body) {
          setAnswer('Streaming not supported right now. Please try again without streaming.');
          setIsStreaming(false);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        
        while (true) {
          const { value, done } = await reader.read();
          if (done || controller.signal.aborted) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Parse SSE lines (data: {...})
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            if (trimmed === 'data: [DONE]') continue;
            
            try {
              const jsonStr = trimmed.slice(5).trim(); // Remove "data:" prefix
              if (!jsonStr) continue;
              const parsed = JSON.parse(jsonStr);
              // Extract content from OpenAI/OpenRouter format
              const content = parsed.choices?.[0]?.delta?.content || 
                             parsed.choices?.[0]?.message?.content || 
                             parsed.content || '';
              if (content) {
                fullText += content;
                setAnswer(fullText);
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
        
        // Process any remaining buffer
        if (buffer.trim() && buffer.trim().startsWith('data:') && buffer.trim() !== 'data: [DONE]') {
          try {
            const jsonStr = buffer.trim().slice(5).trim();
            if (jsonStr) {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content || 
                             parsed.choices?.[0]?.message?.content || 
                             parsed.content || '';
              if (content) {
                fullText += content;
              }
            }
          } catch {
            // ignore
          }
        }
        
        setAnswer(fullText || 'No answer available.');
        setIsStreaming(false);
      } else {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers,
          body: JSON.stringify({ question: queryText, provider, model: chosenModel }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const errText = await res.text();
          // Try to parse as JSON to extract answer field
          try {
            const errData = JSON.parse(errText);
            setAnswer(errData.answer || errData.error || 'Sorry, something went wrong. Please try again.');
          } catch {
            setAnswer(errText || 'No answer available.');
          }
        } else {
        const data = await res.json();
        setAnswer(data.answer || 'No answer available.');
        }
      }
    } catch (e) {
      if (controller.signal.aborted) {
        setAnswer('Response stopped.');
      } else {
      setAnswer('Sorry, something went wrong. Please try again.');
      }
      setIsStreaming(false);
    } finally {
      setLoading(false);
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
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

    // Load streaming preference and provider
    const savedStream = localStorage.getItem('ask_ai_streaming') === 'true';
    setUseStreaming(savedStream);
    const savedProvider = (localStorage.getItem('ask_ai_provider') as 'openai' | 'openrouter') || 'openai';
    setProvider(savedProvider);

    const loadStatus = async () => {
      setStatusLoading(true);
      try {
        const res = await fetch('/api/ask-key', { method: 'GET' });
        if (res.ok) {
          const data = await res.json();
          setOpenaiConfigured(Boolean(data.openaiConfigured));
          setOpenrouterConfigured(Boolean(data.openrouterConfigured));
          setHasEnvOpenAI(Boolean(data.hasEnvOpenAI));
          setHasEnvOpenRouter(Boolean(data.hasEnvOpenRouter));
        }
      } catch (_) {
        // ignore
      } finally {
        setStatusLoading(false);
      }
    };
    loadStatus();

    fetchModels();
  }, []);

  useEffect(() => {
    setCustomModel('');
    setModel(provider === 'openai' ? 'gpt-4o' : 'openrouter/auto');
    fetchModels(keyDraft ? { headerKey: keyDraft.trim() } : undefined);
  }, [provider]);

  const handleKeySave = (value: string) => {
    setKeyDraft(value);
  };

  const handleStreamingToggle = (checked: boolean) => {
    setUseStreaming(checked);
    localStorage.setItem('ask_ai_streaming', String(checked));
  };

  const handleProviderChange = (value: 'openai' | 'openrouter') => {
    setProvider(value);
    localStorage.setItem('ask_ai_provider', value);
  };

  const handleConfigureToggle = () => {
    setIsSettingsOpen((prev) => !prev);
  };

  const saveKeyToServer = async () => {
    if (!keyDraft.trim()) return;
    try {
      setSaveBusy(true);
      setSaveMessage(null);
      const res = await fetch('/api/ask-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: keyDraft.trim() }),
      });
      if (res.ok) {
        if (provider === 'openai') {
          setOpenaiKey('stored');
          setOpenaiConfigured(true);
          if (model === '') setModel('gpt-4o');
        } else {
          setOpenrouterKey('stored');
          setOpenrouterConfigured(true);
          if (model === '') setModel('openrouter/auto');
        }
        setKeyDraft('');
        setSaveMessage('Key saved & encrypted');
      } else {
        setSaveMessage('Failed to save key');
      }
    } catch (_) {
      setSaveMessage('Failed to save key');
    } finally {
      setSaveBusy(false);
    }
  };

  const deleteKeyFromServer = async () => {
    try {
      const res = await fetch(`/api/ask-key?provider=${provider}`, { method: 'DELETE' });
      if (res.ok) {
        if (provider === 'openai') {
          setOpenaiKey('');
          setOpenaiConfigured(false);
        } else {
          setOpenrouterKey('');
          setOpenrouterConfigured(false);
        }
      }
    } catch (_) {
      // ignore
    }
  };

  const fetchModels = async (opts?: { headerKey?: string }) => {
    setModelsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (opts?.headerKey) headers['x-openai-key'] = opts.headerKey;
      const res = await fetch(`/api/ask-models?provider=${provider}`, { headers });
      if (!res.ok) {
        setModels([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.models)) {
        setModels(data.models);
        if (!customModel && !model && data.models.length > 0) {
          setModel(data.models[0]);
        }
      } else {
        setModels([]);
      }
    } catch {
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    if (!isSettingsOpen) return;

    const scrollToBottom = () => {
      const cardEl = cardRef.current;
      if (!cardEl) return;
      const cardTop = cardEl.getBoundingClientRect().top + window.scrollY;
      const target = cardTop + cardEl.scrollHeight;
      window.scrollTo({ top: target, behavior: 'smooth' });
    };

    scrollToBottom();
    const rafId = requestAnimationFrame(scrollToBottom);
    const timeoutId = setTimeout(scrollToBottom, 320);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [isSettingsOpen]);

  // Auto-scroll chat to bottom when answer updates during streaming
  useEffect(() => {
    if (answer && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [answer]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card ref={cardRef} className={cn('overflow-hidden', className)}>
        <CardContent className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg overflow-hidden">
                <Image src="/logo.png" alt="AI" width={32} height={32} className="w-full h-full object-cover" />
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Ask AI</h3>
                <p className="text-xs text-text-secondary">Natural language insights</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2 text-text-secondary hover:text-text-primary hover:bg-surface-elevated/80 px-2"
              onClick={handleConfigureToggle}
            >
              <span className="text-xs font-medium">Configure</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isSettingsOpen && "rotate-180")} />
            </Button>
          </div>

          <motion.div
            ref={configRef}
            initial={false}
            animate={{ height: isSettingsOpen ? 'auto' : 0, opacity: isSettingsOpen ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="pb-4 border-b border-border/40 mb-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
              {/* Left Column: Provider & Key Connection Block */}
              <div className="h-full flex flex-col gap-3 p-4 rounded-xl bg-surface-elevated/30 border border-border/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wider block">
                      Provider
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleProviderChange('openai')}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                          provider === 'openai'
                            ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
                            : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                        )}
                      >
                        OpenAI
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProviderChange('openrouter')}
                        className={cn(
                          'px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all',
                          provider === 'openrouter'
                            ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
                            : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                        )}
                      >
                        OpenRouter
                      </button>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated border border-border/50">
                    <Shield className={cn("h-3 w-3", (provider === 'openai' ? openaiConfigured : openrouterConfigured) ? "text-green-500" : "text-text-secondary")} />
                    <span className="text-[10px] font-medium text-text-secondary uppercase">
                      {(provider === 'openai' ? openaiConfigured : openrouterConfigured) ? 'Secure' : 'Not Set'}
                    </span>
                  </div>
                </div>

                {/* Key Input Area */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={keyDraft}
                      onChange={(e) => handleKeySave(e.target.value)}
                      placeholder={provider === 'openrouter' ? 'sk-or-...' : 'sk-...'}
                      className={cn(
                        'flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2',
                        'text-xs text-text-primary placeholder:text-text-secondary/50',
                        'focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary',
                        'transition-all duration-200'
                      )}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={saveKeyToServer}
                      disabled={!keyDraft.trim() || saveBusy}
                      className="h-auto text-xs px-4"
                    >
                      {saveBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                    </Button>
                    {(provider === 'openai' ? openaiConfigured : openrouterConfigured) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={deleteKeyFromServer}
                        className="h-auto text-xs px-3 text-red-400 hover:text-red-500 hover:bg-red-400/10"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {saveMessage && <div className="text-xs text-accent-primary pl-1">{saveMessage}</div>}
                  <p className="text-[10px] text-text-secondary/70 pl-1">Your key is encrypted at rest and never shared.</p>
                </div>
              </div>

              {/* Right Column: Model only */}
              <div className="h-full flex flex-col gap-3 p-4 rounded-xl bg-surface-elevated/30 border border-border/50">
                {/* Model Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Model
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchModels(keyDraft ? { headerKey: keyDraft.trim() } : undefined)}
                      disabled={modelsLoading}
                      className="h-5 px-1.5 text-[10px] text-text-secondary hover:text-accent-primary"
                    >
                      {modelsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Refresh List'}
                    </Button>
                  </div>
                  <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      setCustomModel('');
                    }}
                    className={cn(
                      'w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs',
                      'text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary'
                    )}
                    disabled={modelsLoading}
                  >
                    {(models.length ? models : [provider === 'openai' ? 'gpt-4o' : 'openrouter/auto']).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  
                  {/* Custom Model Input */}
                  <div className="pt-1">
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => {
                        setCustomModel(e.target.value);
                        setModel('');
                      }}
                      placeholder="Or type custom model ID..."
                      className={cn(
                        'w-full rounded-lg border border-border/50 bg-surface-elevated/50 px-3 py-1.5 text-xs',
                        'text-text-primary placeholder:text-text-secondary/40',
                        'focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary',
                        'transition-all'
                      )}
                    />
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
          <div ref={layoutEndRef} />

          {/* Compact Status Indicator (when settings are closed) */}
          {!isSettingsOpen && (
            <div className="mb-2 flex items-center gap-2 text-xs text-text-secondary px-1">
              <Shield className="h-3 w-3" />
              <span>Using {provider === 'openai' ? 'OpenAI' : 'OpenRouter'} ({customModel || model || 'Default'})</span>
              {!canAsk && <span className="text-red-400 font-medium ml-1">• Setup required</span>}
            </div>
          )}

          {/* Input + Preferences inline */}
          <div className="grid grid-cols-1 md:grid-cols-[9fr_1fr] gap-3 items-stretch">
            <div className="relative w-full">
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
                  'w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 pr-12 h-full',
                  'text-sm text-text-primary placeholder:text-text-secondary/50',
                  'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary',
                  'transition-all duration-200'
                )}
                disabled={loading}
              />
              {loading ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 animate-pulse"
                  onClick={handleStop}
                >
                  <Square className="h-4 w-4 text-accent-danger" />
                </Button>
              ) : (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => handleAsk()}
                disabled={loading || !question.trim() || !canAsk}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleStreamingToggle(!useStreaming)}
              className={cn(
                'flex items-center justify-center gap-2 w-full h-full px-3 py-3 rounded-lg border transition-all',
                useStreaming
                  ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary'
                  : 'bg-surface-elevated border-border text-text-secondary hover:border-border/80'
              )}
            >
              <span className="text-xs font-medium text-center">Stream Response</span>
              <div className={cn(
                'w-10 h-5 rounded-full relative transition-colors border border-border/60',
                useStreaming ? 'bg-accent-primary' : 'bg-surface-elevated'
              )}>
                <div className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                  useStreaming ? 'translate-x-5' : 'translate-x-0'
                )} />
              </div>
            </button>
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

          {/* Chat Messages Area */}
          <AnimatePresence mode="wait">
            {(loading || answer || lastQuestion) && (
              <div className="mt-4 space-y-4">
                {/* User Message Bubble */}
                {lastQuestion && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-3 justify-end"
                  >
                    <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm text-text-primary">{lastQuestion}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  </motion.div>
                )}

                {/* AI Response Bubble */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-accent-purple" />
                  </div>
                  <div className="bg-surface-elevated border border-border rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] min-w-[120px]">
                    {loading && !answer ? (
                      /* Typing Indicator - Three Dots */
                      <div className="flex items-center gap-1.5 py-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -6, 0] }}
                            transition={{ 
                              duration: 0.6, 
                              repeat: Infinity, 
                              delay: i * 0.15,
                              ease: "easeInOut"
                            }}
                            className="w-2 h-2 rounded-full bg-accent-purple/60"
                          />
                        ))}
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
                        {/* Blinking Cursor during streaming */}
                        {isStreaming && (
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                            className="inline-block w-0.5 h-4 bg-accent-primary ml-0.5 align-middle"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

