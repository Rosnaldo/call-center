/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, X, FileText, Download, Paperclip, Send
} from 'lucide-react';
import { Message } from '@repo/shared-types';

interface ChatAttendmentProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  hasUnreadMessage?: boolean;
  onMessagesSeen?: () => void;
  currentUserRole: 'attendant' | 'customer';
  partnerName: string;
  partnerAvatarUrl?: string;
  onSendMessage: (text: string) => void;
  onSendFile: (file: File) => void;
}

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const ChatAttendment: React.FC<ChatAttendmentProps> = ({
  isOpen,
  onClose,
  messages,
  hasUnreadMessage = false,
  onMessagesSeen,
  currentUserRole,
  partnerName,
  partnerAvatarUrl,
  onSendMessage,
  onSendFile,
}) => {
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll only the chat's own message list to bottom — scrollIntoView on a
  // bottom sentinel would also scroll ancestor containers (the whole page)
  // to bring it into view, since this panel sits absolutely positioned
  // inside a page that can itself be scrolled.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // The unread dot is only ever meant to be seen while the box is closed
  // (on the toggle button) — the moment the user opens it, it's considered
  // seen, so clear it here rather than in the toggle handler itself.
  useEffect(() => {
    if (isOpen) onMessagesSeen?.();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onSendFile(file);
    e.target.value = '';
  };

  return (
    <div className="absolute bottom-4 right-4 w-80 sm:w-96 h-[26rem] max-h-[70%] bg-white text-gray-800 rounded-2xl shadow-2xl flex flex-col z-30 border border-gray-200 overflow-hidden animate-fade-in">

      {/* Chat Header */}
      <div className="border-b border-gray-100 p-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-brand-ochre/10 rounded-lg text-brand-ochre inline-flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 tracking-tight font-display flex items-center gap-1.5">
              Chat de Atendimento
              {hasUnreadMessage && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9a86a]" />
              )}
            </h3>
            <p className="text-[9px] text-gray-400 font-mono mt-0.5">{partnerName || 'Atendimento'} • Online</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          title="Fechar Chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Messages Feed Container */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-white">

        {/* List of Messages */}
        {messages.map((msg) => {
          const isSelf = msg.sender === currentUserRole;
          if (isSelf) {
            return (
              <div
                key={msg.id}
                className="flex flex-col gap-1 max-w-[85%] self-end items-end"
              >
                <span className="text-[10px] text-gray-400 font-normal mr-1">{formatTimestamp(msg.timestamp)}</span>

                {/* Standard Text Message Bubble */}
                {msg.text && (
                  <div className="p-3 bg-brand-ochre/10 text-gray-800 rounded-2xl rounded-tr-none text-xs sm:text-sm leading-relaxed shadow-sm">
                    {msg.text}
                  </div>
                )}

                {/* File Attachment Card */}
                {msg.file && (
                  <div className="p-2.5 bg-brand-ochre/5 border border-brand-border text-gray-800 rounded-2xl rounded-tr-none flex items-center gap-2.5 shadow-sm">
                    <div className="p-1.5 bg-brand-ochre/15 border border-brand-border rounded-lg text-brand-ochre shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[11px] font-bold truncate text-gray-800">{msg.file.name}</p>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">{msg.file.size}</p>
                    </div>
                    <a
                      href={msg.file.url}
                      download={msg.file.name}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 hover:bg-brand-ochre/20 text-brand-ochre rounded-lg transition-all shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div
                key={msg.id}
                className="flex gap-2.5 items-start self-start max-w-[85%]"
              >
                <img
                  src={partnerAvatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${partnerName}`}
                  alt={partnerName}
                  className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5 animate-none"
                  referrerPolicy="no-referrer"
                />
                <div className="flex flex-col gap-1 items-start">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-brand-ochre">{partnerName}</span>
                    <span className="text-[10px] text-gray-400 font-normal">{formatTimestamp(msg.timestamp)}</span>
                  </div>

                  {/* Standard Text Message Bubble */}
                  {msg.text && (
                    <div className="p-3 bg-[#f1f3f4] text-[#202124] rounded-2xl rounded-tl-none text-xs sm:text-sm leading-relaxed shadow-sm">
                      {msg.text}
                    </div>
                  )}

                  {/* File Attachment Card */}
                  {msg.file && (
                    <div className="p-2.5 bg-[#f1f3f4] border border-gray-200 text-gray-800 rounded-2xl rounded-tl-none flex items-center gap-2.5 shadow-sm">
                      <div className="p-1.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[11px] font-bold truncate text-gray-800">{msg.file.name}</p>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">{msg.file.size}</p>
                      </div>
                      <a
                        href={msg.file.url}
                        download={msg.file.name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 hover:bg-gray-150 text-gray-500 rounded-lg transition-all shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          }
        })}
      </div>

      {/* Input Form to Send Text & Files */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Discrete Attach File Button */}
          <button
            type="button"
            onClick={handleFileUploadClick}
            className="absolute left-3.5 p-1 text-gray-400 hover:text-brand-ochre hover:bg-brand-panel/50 rounded-lg transition-colors"
            title="Anexar arquivo"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-11 py-3 text-xs sm:text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-ochre focus:ring-1 focus:ring-brand-ochre/20 transition-all shadow-sm"
          />

          {/* Send Message Button inside input */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`absolute right-3.5 p-1.5 rounded-lg transition-colors ${
              inputText.trim()
                ? 'text-brand-ochre hover:bg-brand-ochre/10'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Enviar mensagem"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};
