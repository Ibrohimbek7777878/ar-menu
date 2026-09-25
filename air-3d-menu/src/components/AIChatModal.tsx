import React, { useState, useRef, useEffect } from 'react';
import { Dish, Language } from '../types';
import { translations } from '../data/translations';
import { X, Send, Bot, Sparkles, User } from 'lucide-react';

interface AIChatModalProps {
  isOpen: boolean;
  lang: Language;
  dishes: Dish[];
  onClose: () => void;
  onOpenAR: (dish: Dish) => void;
  onAddToCart: (dish: Dish) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  suggestedDishes?: Dish[];
}

export const AIChatModal: React.FC<AIChatModalProps> = ({
  isOpen,
  lang,
  dishes,
  onClose,
  onOpenAR,
  onAddToCart
}) => {
  const t = translations[lang];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'bot',
      text: lang === 'uz' 
        ? "Assalomu alaykum! Men ARMENU virtual ofitsiantingizman. Taomlar tarkibi, achchiqlik darajasi yoki o'ziga xos milliy taomlar haqida bemalol so'rang!"
        : lang === 'ru'
        ? "Здравствуйте! Я виртуальный официант ARMENU. Спрашивайте о составе блюд, остроте или традиционных узбекских деликатесах!"
        : "Welcome! I am your ARMENU virtual waiter. Feel free to ask about dish ingredients, spice levels, or traditional Uzbek culinary pairings!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input.trim();
    if (!textToSend || isLoading) return;

    const userMsg: Message = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          lang,
          dishesContext: dishes.map(d => ({
            name: d.name[lang],
            price: d.price,
            category: d.category,
            description: d.description[lang]
          }))
        })
      });

      const data = await res.json();
      const botReply = data.reply || data.fallback || "Toshkent to'y oshi va barra achchiq-chuchuk salatini tavsiya qilaman!";

      // Intelligent match for suggested dishes
      const matched = dishes.filter(d => 
        textToSend.toLowerCase().includes('osh') || textToSend.toLowerCase().includes('plov') ? d.modelType === 'plov' :
        textToSend.toLowerCase().includes('manti') ? d.modelType === 'manti' :
        textToSend.toLowerCase().includes('somsa') ? d.modelType === 'somsa' :
        textToSend.toLowerCase().includes('shashlik') || textToSend.toLowerCase().includes('kabob') ? d.modelType === 'shashlik' :
        textToSend.toLowerCase().includes('achchiq emas') || textToSend.toLowerCase().includes('mild') ? !d.tags.includes('spicy') :
        false
      ).slice(0, 2);

      const botMsg: Message = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: botReply,
        suggestedDishes: matched.length > 0 ? matched : undefined
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.warn("AI chat fetch error, falling back locally:", err);
      let localFallback = "Bizning oshpazimiz bugun ayniqsa lahm qo'y go'shtli Toshkent to'y oshi va qarsildoq tandir somsani tavsiya qilmoqda!";
      if (lang === 'ru') {
        localFallback = "Наш шеф-повар сегодня особенно рекомендует ташкентский свадебный плов с бараниной и хрустящую тандырную самсу!";
      } else if (lang === 'en') {
        localFallback = "Our chef today specially recommends the Tashkent Wedding Plov with tender lamb and freshly baked crispy tandoor somsa!";
      }

      setMessages(prev => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          sender: 'bot',
          text: localFallback,
          suggestedDishes: [dishes[0], dishes[2]]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    t.aiPrompt1,
    t.aiPrompt2,
    t.aiPrompt3
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div 
        id="ai-chat-modal"
        className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[85vh] max-h-[680px] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg-soft)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1B4B73] text-[#C9A227] flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-[var(--text)] flex items-center gap-1.5">
                {t.aiTitle}
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
              </h3>
              <p className="text-xs text-[var(--text-soft)]">{t.aiSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-soft)] hover:text-[var(--text)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'bot' && (
                <div className="w-7 h-7 rounded-full bg-[#1B4B73] text-[#C9A227] flex-shrink-0 flex items-center justify-center text-xs mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#C75B39] text-white rounded-br-xs shadow-xs'
                    : 'bg-[var(--bg-soft)] text-[var(--text)] border border-[var(--border)] rounded-tl-xs shadow-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>

                {/* Optional Dish Recommendation Cards inside AI Response */}
                {m.suggestedDishes && m.suggestedDishes.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[var(--border)] space-y-2">
                    <p className="text-xs font-semibold text-[#1B4B73] dark:text-[#E3C158] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                      Tavsiya qilingan taomlar:
                    </p>
                    {m.suggestedDishes.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          <img src={d.imageUrl} alt={d.name[lang]} className="w-10 h-10 rounded-md object-cover" />
                          <div>
                            <p className="font-semibold text-xs text-[var(--text)] line-clamp-1">{d.name[lang]}</p>
                            <p className="text-[11px] text-[var(--text-soft)] num">{d.price.toLocaleString()} {t.currency}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {d.has3d && (
                            <button
                              onClick={() => {
                                onOpenAR(d);
                                onClose();
                              }}
                              className="px-2 py-1 text-[11px] font-semibold bg-[#1B4B73] text-[#C9A227] rounded-md border border-[#C9A227]/50"
                            >
                              3D
                            </button>
                          )}
                          <button
                            onClick={() => onAddToCart(d)}
                            className="px-2 py-1 text-[11px] font-semibold bg-[#C75B39] text-white rounded-md"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-full bg-[#E8E2D9] dark:bg-[#332C26] text-[var(--text-soft)] flex-shrink-0 flex items-center justify-center text-xs mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-full bg-[#1B4B73] text-[#C9A227] flex-shrink-0 flex items-center justify-center text-xs mt-1 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[var(--bg-soft)] rounded-2xl rounded-tl-xs p-3 border border-[var(--border)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C75B39] animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-[#C75B39] animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#C75B39] animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt suggestions */}
        <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto border-t border-[var(--border)] bg-[var(--bg)] no-scrollbar">
          {samplePrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              className="text-xs px-3 py-1.5 rounded-full bg-[var(--bg-soft)] hover:bg-[#FBEDE8] dark:hover:bg-[#2A1810] text-[var(--text-soft)] hover:text-[#C75B39] border border-[var(--border)] whitespace-nowrap transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-card)]">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t.aiPlaceholder}
              className="flex-1 h-11 px-4 text-sm rounded-xl bg-[var(--bg-soft)] text-[var(--text)] border border-[var(--border)] focus:border-[#C75B39] focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-11 px-4 rounded-xl bg-[#C75B39] hover:bg-[#E07A52] text-white disabled:opacity-40 transition-all flex items-center justify-center cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
