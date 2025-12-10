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

export const GustavChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hallo! Ich bin Gustav, dein freundlicher Glasfaser-Assistent! 🦔 Wie kann ich dir heute helfen? Du kannst mir Fragen zu unseren Tarifen, Verfügbarkeit oder Services stellen.',
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // TODO: Integrate with AI backend
    // For now, show a placeholder response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Danke für deine Nachricht! Ich bin gerade noch in der Einrichtungsphase. Bald kann ich dir alle Fragen zu COM-IN Glasfaser beantworten. Möchtest du in der Zwischenzeit lieber mit einem echten Menschen sprechen? Klicke dazu auf "Rückruf anfordern".',
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleCallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Send callback request to backend
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
      {/* Chat Bubble */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        aria-label="Chat mit Gustav öffnen"
      >
        <div className="relative group">
          <div className="absolute -inset-1 bg-accent/30 rounded-full blur-lg group-hover:bg-accent/50 transition-all" />
          <div className="relative w-16 h-16 rounded-full bg-card shadow-card border-2 border-accent/20 overflow-hidden hover:scale-110 transition-transform">
            <img
              src={gustavMascot}
              alt="Gustav - COM-IN Maskottchen"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
            <MessageCircle className="w-3 h-3 text-accent-foreground" />
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
          {/* Header */}
          <div className="bg-primary p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-card overflow-hidden border-2 border-accent/30">
              <img
                src={gustavMascot}
                alt="Gustav"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-primary-foreground">Gustav</h3>
              <p className="text-sm text-primary-foreground/70">
                Dein Glasfaser-Assistent
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
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
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
                  <div className="flex justify-start">
                    <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
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
                  Rückruf anfordern
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
                      Wir rufen dich so schnell wie möglich zurück!
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
