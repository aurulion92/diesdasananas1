import { useState, useRef, useEffect } from 'react';
import { X, Send, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import gustavMascot from '@/assets/gustav-mascot.png';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
}

interface CallbackFormData {
  name: string;
  phone: string;
  preferredTime: string;
  message: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gustav-chat`;

export const GustavChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hey! Ich bin Gustav – dein Glasfaserkabel auf Lichtgeschwindigkeit! ⚡🚀 Was kann ich für dich tun? Frag mich nach unseren Tarifen, Aktionen oder ob Glasfaser bei dir verfügbar ist!',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCallbackForm, setShowCallbackForm] = useState(false);
  const [callbackData, setCallbackData] = useState<CallbackFormData>({
    name: '',
    phone: '',
    preferredTime: '',
    message: '',
  });
  const [callbackSubmitted, setCallbackSubmitted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const streamChat = async (userMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || 'Fehler bei der Anfrage');
    }

    if (!resp.body) throw new Error('Keine Antwort erhalten');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantContent = '';
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last.id.startsWith('streaming-')) {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [
                ...prev,
                { id: `streaming-${Date.now()}`, role: 'assistant', content: assistantContent },
              ];
            });
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    // Finalize message ID
    setMessages((prev) =>
      prev.map((m) =>
        m.id.startsWith('streaming-') ? { ...m, id: Date.now().toString() } : m
      )
    );
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      await streamChat(newMessages);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'Oh nein, da ist etwas schiefgelaufen! 🦔 Bitte versuche es nochmal oder fordere einen Rückruf an.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Callback request:', callbackData);
    setCallbackSubmitted(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Animated Chat Bubble */}
      <button
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        aria-label="Chat mit Gustav öffnen"
      >
        <div className="relative group">
          {/* Glow effect */}
          <div className="absolute -inset-2 bg-accent/20 rounded-full blur-xl animate-pulse" />
          
          {/* Gustav container with animations */}
          <div 
            className={`relative w-20 h-20 rounded-full bg-card shadow-card border-2 border-accent/30 overflow-hidden transition-all duration-300 ${
              isHovered ? 'scale-110 border-accent' : 'animate-bounce-slow'
            }`}
          >
            <img
              src={gustavMascot}
              alt="Gustav - COM-IN Maskottchen"
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isHovered ? 'scale-110' : ''
              }`}
            />
          </div>
          
          {/* Speech bubble hint */}
          <div 
            className={`absolute -top-12 right-0 bg-card rounded-xl px-3 py-2 shadow-card border border-border transition-all duration-300 whitespace-nowrap ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <p className="text-sm font-medium text-foreground">Hallo! Kann ich helfen? 🦔</p>
            <div className="absolute bottom-0 right-6 translate-y-1/2 rotate-45 w-3 h-3 bg-card border-r border-b border-border" />
          </div>
          
          {/* Notification dot */}
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center animate-pulse">
            <MessageCircle className="w-3.5 h-3.5 text-accent-foreground" />
          </div>
        </div>
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] transition-all duration-300 ${
          isOpen
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-95 opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden flex flex-col max-h-[600px]">
          {/* Header with animated Gustav */}
          <div className="bg-primary p-4 flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-card overflow-hidden border-2 border-accent/50 animate-wiggle">
                <img
                  src={gustavMascot}
                  alt="Gustav"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-success rounded-full border-2 border-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-primary-foreground">Gustav</h3>
              <p className="text-sm text-primary-foreground/70 flex items-center gap-1">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                Online & bereit zu helfen
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
              aria-label="Chat schließen"
            >
              <X className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>

          {/* Messages */}
          {!showCallbackForm ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    } animate-fade-in`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-accent/10 overflow-hidden mr-2 flex-shrink-0">
                        <img src={gustavMascot} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-accent text-accent-foreground rounded-br-md'
                          : 'bg-secondary text-secondary-foreground rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.source && (
                        <a
                          href={message.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs mt-2 block opacity-70 hover:opacity-100 underline"
                        >
                          Quelle: {message.source}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="w-8 h-8 rounded-full bg-accent/10 overflow-hidden mr-2 flex-shrink-0 animate-wiggle">
                      <img src={gustavMascot} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2 mb-3">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Schreib mir eine Nachricht..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="bg-accent hover:bg-accent/90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowCallbackForm(true)}
                  className="w-full gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Lieber mit einem Menschen sprechen?
                </Button>
              </div>
            </>
          ) : (
            /* Callback Form */
            <div className="p-4 min-h-[300px]">
              {!callbackSubmitted ? (
                <form onSubmit={handleCallbackSubmit} className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      Rückruf anfordern
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Wir melden uns so schnell wie möglich bei dir!
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Input
                      placeholder="Dein Name *"
                      value={callbackData.name}
                      onChange={(e) =>
                        setCallbackData({ ...callbackData, name: e.target.value })
                      }
                      required
                    />
                    <Input
                      type="tel"
                      placeholder="Telefonnummer *"
                      value={callbackData.phone}
                      onChange={(e) =>
                        setCallbackData({ ...callbackData, phone: e.target.value })
                      }
                      required
                    />
                    <Input
                      placeholder="Bevorzugte Uhrzeit (optional)"
                      value={callbackData.preferredTime}
                      onChange={(e) =>
                        setCallbackData({
                          ...callbackData,
                          preferredTime: e.target.value,
                        })
                      }
                    />
                    <textarea
                      placeholder="Worum geht es? (optional)"
                      value={callbackData.message}
                      onChange={(e) =>
                        setCallbackData({ ...callbackData, message: e.target.value })
                      }
                      className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCallbackForm(false)}
                      className="flex-1"
                    >
                      Zurück
                    </Button>
                    <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90">
                      Absenden
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                    <Phone className="w-8 h-8 text-success" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">
                    Anfrage erhalten!
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Wir melden uns so schnell wie möglich bei dir.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCallbackForm(false);
                      setCallbackSubmitted(false);
                      setCallbackData({
                        name: '',
                        phone: '',
                        preferredTime: '',
                        message: '',
                      });
                    }}
                  >
                    Zurück zum Chat
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
