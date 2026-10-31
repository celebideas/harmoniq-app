import React, { useState } from 'react';
import { X, Search, Music, Check, Disc3, Link2, Loader2, Sparkles } from 'lucide-react';
import { Song } from '../types';
import { SAMPLE_SONGS } from '../data/mockData';
import { resolveMusicLinkOrQuery } from '../services/musicResolver';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song;
  onSelectSong: (song: Song) => void;
}

export const SongPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentSong,
  onSelectSong,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredSongs = SAMPLE_SONGS.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.genre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleResolveAndPlay = async (queryText?: string) => {
    const text = (queryText || searchTerm).trim();
    if (!text) return;

    setIsResolving(true);
    setErrorMsg(null);

    try {
      const resolved = await resolveMusicLinkOrQuery(text);
      onSelectSong(resolved);
      setIsResolving(false);
      onClose();
    } catch (err: any) {
      setIsResolving(false);
      setErrorMsg(err?.message || 'Şarkı veya link bulunamadı.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center">
              <Disc3 className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-white">Çalan Şarkıyı Değiştir</h3>
              <p className="text-xs text-neutral-400">Canlı odadaki parçanı seç veya link eşle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Link Input */}
        <div className="p-4 border-b border-neutral-800/80 bg-neutral-950/40 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleResolveAndPlay();
                }
              }}
              placeholder="YouTube Music linki veya şarkı/sanatçı ara..."
              className="w-full pl-10 pr-20 py-2.5 bg-neutral-950 border border-neutral-700/80 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400 transition font-mono text-[11px]"
            />
            {searchTerm.trim().length > 0 && (
              <button
                type="button"
                onClick={() => handleResolveAndPlay()}
                disabled={isResolving}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs transition flex items-center gap-1 shadow"
              >
                {isResolving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Link2 className="w-3 h-3" />
                    <span>Eşle</span>
                  </>
                )}
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="text-[11px] text-rose-400 px-1">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Prompt to resolve custom query or pasted URL if not found in mock */}
          {searchTerm.trim().length > 2 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleResolveAndPlay()}
                disabled={isResolving}
                className="w-full p-2.5 rounded-xl bg-lime-400/10 border border-lime-400/30 hover:bg-lime-400/20 text-lime-300 text-xs font-semibold flex items-center justify-between transition"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-lime-400" />
                  <span className="truncate">"{searchTerm}" parçasını/linkini doğrudan odaya bağla</span>
                </span>
                <span className="font-bold text-[10px] bg-lime-400 text-neutral-950 px-2 py-0.5 rounded-md shrink-0">
                  {isResolving ? 'Bağlanıyor...' : 'Bağla & Çal'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Song List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {/* Quick taste recommendations */}
          <div className="space-y-1 mb-2">
            <div className="text-[10px] font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Senin Zevkine Göre Hızlı Parçalar:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Mor ve Ötesi - Cambaz',
                'Adamlar - Biri Var',
                'Madrigal - Dip',
                'Duman - Kırmış Kalbini',
                'Jakuzi - Koca Bir Saçmalık',
              ].map((query) => (
                <button
                  key={query}
                  type="button"
                  onClick={() => handleResolveAndPlay(query)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-lime-400/50 hover:bg-neutral-850 text-neutral-300 hover:text-white text-[10px] font-medium transition cursor-pointer"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] font-semibold text-neutral-400 px-1 mb-1">
            Önerilen Parçalar:
          </div>

          {filteredSongs.map((song) => {
            const isSelected = song.id === currentSong.id;
            return (
              <button
                key={song.id}
                onClick={() => {
                  onSelectSong(song);
                  onClose();
                }}
                className={`w-full p-3 rounded-2xl flex items-center justify-between transition text-left ${
                  isSelected
                    ? 'bg-lime-400/15 border border-lime-400/40 text-white'
                    : 'bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-800/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700/80 flex items-center justify-center text-white shrink-0 shadow`}
                  >
                    {song.coverUrl ? (
                      <img
                        src={song.coverUrl}
                        alt={song.album}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-tr ${song.coverGradient} flex items-center justify-center`}
                      >
                        <Music className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {song.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {song.artist} · <span className="text-neutral-500">{song.genre}</span>
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-lime-400 text-neutral-950 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <span className="text-[10px] text-neutral-400 font-medium shrink-0 px-2 py-1 bg-neutral-800 rounded-lg">
                    Seç
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950/70 text-[11px] text-neutral-400 text-center flex items-center justify-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-lime-400" />
          <span>YouTube Music veya Spotify linki yapıştırarak da şarkı çalabilirsiniz.</span>
        </div>
      </div>
    </div>
  );
};
