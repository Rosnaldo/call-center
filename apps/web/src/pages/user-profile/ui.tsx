/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Header } from '../../components/header/Header.tsx';
import { Title } from '../../components/Title.tsx';
import { Edit2, Check, UploadCloud, ShieldAlert } from 'lucide-react';
import { OnlineUserState } from '@/src/states/online-users/state.ts';
import { useLogout } from '../../hooks/auth/useLogout.ts';
import { mytoast } from '@/src/components/toast.tsx';
import { handleRequestError } from '@/src/utils/utils.ts';

interface UserProfilePageProps {
  fileError: string | null;
  avatarUrl: string | null;
  users: OnlineUserState[];
  currentUser: OnlineUserState | null;
  navigate: (path: string) => void;
  processFile: (file: File) => Promise<void>;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  fileError,
  avatarUrl,
  users,
  currentUser,
  navigate,
  processFile,
}) => {
  const onLogout = useLogout();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-brand-canvas flex flex-col items-center justify-center p-6">
        <div className="bg-white border border-brand-border rounded-2xl p-8 max-w-md w-full text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-brand-dark font-display mb-2">Desconectado</h2>
          <p className="text-xs text-brand-muted mb-6">Por favor, conecte-se com um dos usuários de teste no simulador.</p>
          <button
            onClick={() => navigate('login')}
            className="w-full bg-brand-ochre hover:bg-brand-ochre-hover text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [isDragging, setIsDragging] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleCancel = () => {
    setName(currentUser.name);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      navigate(currentUser.role === 'customer' ? 'customer' : 'attendant');
    }, 1500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const loadingToast = mytoast('Alterando avatar...');
      try {
        await processFile(file);
      } catch (error) {
        console.log("Error in handleFileChange:", error);
        handleRequestError(error);
      } finally {
        mytoast.dismiss(loadingToast);
      }
    };
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const loadingToast = mytoast('Alterando avatar...');
    try {
      await processFile(file);
    } catch (error) {
      handleRequestError(error);
    } finally {
      mytoast.dismiss(loadingToast);
    }
  };

  const initials = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '?';

  return (
    <div id="user-profile-page-view" className="min-h-screen bg-brand-canvas pb-16 font-sans">
      <Header users={users} onLogout={onLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-8">

        {/* Back link */}
        <div className="mb-8">
          <button
            onClick={() => navigate(currentUser.role === 'customer' ? 'customer' : 'attendant')}
            className="flex items-center gap-1 text-xs font-medium text-brand-muted hover:text-brand-ochre transition-colors group cursor-pointer"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>Voltar para a área de {currentUser.role === 'customer' ? 'Cliente' : 'Agente'}</span>
          </button>
        </div>

        <Title label="Profile" />

        {/* 2-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

          {/* LEFT: identity details */}
          <div className="flex flex-col h-full">
            <div className="bg-white border border-brand-border rounded-2xl p-5 flex flex-col h-full">

              <div className="flex justify-between items-start mb-5">
                <div>
                  <div className="text-[10px] font-bold font-mono text-brand-ochre tracking-widest uppercase mb-1">
                    — §01 Identity
                  </div>
                  <h3 className="text-xl font-bold font-display text-brand-dark">Your details</h3>
                </div>

                {!isEditing ? (
                  <button
                    id="edit-profile-btn"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-panel hover:bg-brand-panel/80 border border-brand-border rounded-xl text-xs font-bold text-brand-dark cursor-pointer transition-all focus:outline-none"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-brand-muted" />
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      id="save-profile-btn"
                      onClick={handleSave}
                      disabled={saveSuccess}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white rounded-xl text-xs font-bold cursor-pointer transition-all focus:outline-none disabled:opacity-70"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {saveSuccess ? 'Salvo!' : 'Save'}
                    </button>
                    <button
                      id="cancel-profile-btn"
                      onClick={handleCancel}
                      className="px-3.5 py-1.5 bg-brand-panel hover:bg-brand-panel/80 border border-brand-border rounded-xl text-xs font-bold text-brand-muted cursor-pointer transition-all focus:outline-none"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4 flex-grow">
                {/* Full Name */}
                <div className="border-b border-brand-border/40 pb-3">
                  <label className="block text-[10px] font-mono tracking-wider text-brand-muted uppercase mb-1.5">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={50}
                      placeholder="Seu nome visível..."
                      className="w-full bg-brand-panel/35 border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre"
                    />
                  ) : (
                    <p className="text-sm font-bold text-brand-dark">{currentUser.name}</p>
                  )}
                </div>

                {/* Email (read-only) */}
                <div className="border-b border-brand-border/40 pb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-[10px] font-mono tracking-wider text-brand-muted uppercase">
                      Email
                    </label>
                    <span className="px-1.5 py-0.5 bg-brand-panel text-[8px] font-mono text-brand-muted rounded uppercase font-bold tracking-widest border border-brand-border/40">
                      read-only
                    </span>
                  </div>
                  <p className="text-sm text-brand-muted font-mono">{currentUser.email}</p>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT: avatar upload */}
          <div className="flex flex-col h-full">
            <div
              id="avatar-photo-upload-card"
              className={`bg-white border rounded-2xl p-5 flex flex-col items-center justify-center text-center h-full min-h-[260px] relative transition-all duration-300 ${
                isDragging ? 'border-dashed border-brand-ochre bg-brand-panel/20 scale-[1.01]' : 'border-brand-border'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="relative group mb-4">
                <div className="w-24 h-24 rounded-full border border-brand-border overflow-hidden flex items-center justify-center bg-brand-ochre text-white shadow-md relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-3xl font-extrabold tracking-tight font-display text-white select-none">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 w-24 h-24 rounded-full bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer pointer-events-none">
                  <UploadCloud className="w-5 h-5 text-white" />
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                id="photo-upload-selector-btn"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-brand-panel hover:bg-brand-panel/80 border border-brand-border rounded-xl text-xs font-bold text-brand-dark cursor-pointer transition-all focus:outline-none mb-3.5"
              >
                Upload photo
              </button>

              <span className="text-[10px] tracking-wide text-brand-muted leading-relaxed max-w-[180px]">
                Qualquer formato de imagem, máx 2 MB · arraste para enviar
              </span>

              {fileError && (
                <div className="mt-4 p-2 bg-red-50 border border-red-100 rounded-xl text-[10px] text-red-600 font-medium">
                  {fileError}
                </div>
              )}

              {isDragging && (
                <div className="absolute inset-0 bg-brand-canvas/70 backdrop-blur-[1px] rounded-2xl flex flex-col items-center justify-center p-4 select-none pointer-events-none">
                  <div className="p-3 bg-white border border-brand-border rounded-2xl shrink-0 mb-3 shadow-md">
                    <UploadCloud className="w-8 h-8 text-brand-ochre animate-bounce" />
                  </div>
                  <span className="text-xs font-bold text-brand-dark font-display">Solte sua imagem aqui</span>
                  <span className="text-[9px] text-brand-muted mt-1">Solte para atualizar seu avatar</span>
                </div>
              )}
            </div>
          </div>

        </div>


      </main>
    </div>
  );
};
