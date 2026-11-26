import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Music,
  Check,
  Disc3,
  Link2,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Song } from '../types';
import { SAMPLE_SONGS } from '../data/mockData';
import { resolveMusicLinkOrQuery, searchTracks } from '../services/musicResolver';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song;
  onSelectSong: (song: Song) => void;
  themeMode?: 'dark' | 'light';
}

export const SongPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentSong,
  onSelectSong,
  themeMode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remoteSongs, setRemoteSongs] = useState<Song[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [failedCovers, setFailedCovers] = useState<Record<string, boolean>>({});

  const isLight =
    themeMode === 'light' ||
    (!themeMode &&
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('light'));

  useEffect(() => {
    if (!isOpen) {
      setRemoteSongs([]);
      setIsSearchingCatalog(false);
      return;
    }
    const q = searchTerm.trim();
    if (q.length < 2) {
      setRemoteSongs([]);
      setIsSearchingCatalog(false);
      return;
    }

    let cancelled = false;
    setIsSearchingCatalog(true);
    const timer = setTimeout(() => {
      searchTracks(q, 12)
        .then((tracks) => {
          if (!cancelled) {
            setRemoteSongs(tracks);
            setIsSearchingCatalog(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setRemoteSongs([]);
            setIsSearchingCatalog(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, searchTerm]);

  const filteredSongs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const localMatches = SAMPLE_SONGS.filter(
      (s) =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q)
    );
    if (q.length < 2) return localMatches;

    const merged: Song[] = [];
    const seen = new Set<string>();
    const pushUnique = (song: Song) => {
      const key = `${song.artist.trim().toLowerCase()}::${song.title.trim().toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(song);
    };

    localMatches.forEach(pushUnique);
    remoteSongs.forEach(pushUnique);
    return merged;
  }, [searchTerm, remoteSongs]);

  if (!isOpen) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md rounded-3xl flex flex-col shadow-2xl overflow-hidden max-h-[85vh] border ${
          isLight
            ? 'bg-white border-[#EAE4DC] text-[#181512]'
            : 'bg-[#171412] border-[#FFF0E1]/[0.08] text-[#FAF7F2]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isLight
              ? 'bg-[#FAF8F4] border-[#EAE4DC]'
              : 'bg-[#171412] border-[#FFF0E1]/[0.08]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E87A3E]/15 border border-[#E87A3E]/25 text-[#E87A3E] flex items-center justify-center">
              <Disc3 className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <h3
                className={`text-base font-heading font-bold ${
                  isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
                }`}
              >
                Çalan Şarkıyı Değiştir
              </h3>
              <p className={`text-xs ${isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'}`}>
                Canlı odadaki parçanı seç veya link eşle
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer ${
              isLight
                ? 'text-[#6B635B] hover:text-[#181512] hover:bg-[#EAE4DC]'
                : 'text-[#A39A91] hover:text-[#FAF7F2] hover:bg-[#211D1A]'
            }`}
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Link Input */}
        <div
          className={`p-4 border-b space-y-2 ${
            isLight
              ? 'bg-white border-[#EAE4DC]'
              : 'bg-[#171412] border-[#FFF0E1]/[0.08]'
          }`}
        >
          <div className="relative">
            <Search
              className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                isLight ? 'text-[#8E847A]' : 'text-[#A39A91]'
              }`}
            />
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
              className={`w-full pl-10 pr-20 py-2.5 rounded-xl border focus:outline-none focus:border-[#E87A3E] transition font-mono text-[11px] ${
                isLight
                  ? 'bg-[#FAF8F4] border-[#E2D9CE] text-[#181512] placeholder-[#8E847A]'
                  : 'bg-[#211D1A] border-[#FFF0E1]/10 text-[#FAF7F2] placeholder-[#A39A91]'
              }`}
            />
            {searchTerm.trim().length > 0 && (
              <button
                type="button"
                onClick={() => handleResolveAndPlay()}
                disabled={isResolving}
                className="studio-btn-primary absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white font-semibold text-xs transition flex items-center gap-1 shadow-sm cursor-pointer"
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
            <div className="text-[11px] text-rose-500 dark:text-rose-400 px-1 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Prompt to resolve custom query or pasted URL */}
          {searchTerm.trim().length > 2 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleResolveAndPlay()}
                disabled={isResolving}
                className={`w-full p-2.5 rounded-xl bg-[#E87A3E]/12 border border-[#E87A3E]/30 hover:bg-[#E87A3E]/20 text-xs font-semibold flex items-center justify-between gap-2 transition cursor-pointer ${
                  isLight ? 'text-[#D96B2C]' : 'text-[#F49A5E]'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#E87A3E]" />
                  <span className="truncate">
                    &ldquo;{searchTerm}&rdquo; parçasını/linkini doğrudan odaya bağla
                  </span>
                </span>
                <span className="studio-btn-primary font-semibold text-[10px] bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white px-2.5 py-1 rounded-md shrink-0">
                  {isResolving ? 'Bağlanıyor...' : 'Bağla & Çal'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Song List */}
        <div className="p-4 overflow-y-auto no-scrollbar space-y-2.5 flex-1">
          {/* Quick taste recommendations */}
          <div className="space-y-1.5 mb-1">
            <div
              className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isLight ? 'text-[#D96B2C]' : 'text-[#F49A5E]'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#E87A3E]" />
              <span>Senin Zevkine Göre Hızlı Parçalar</span>
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
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                    isLight
                      ? 'bg-[#FAF8F4] border-[#EAE4DC] hover:border-[#E87A3E]/50 hover:bg-[#F2EDE6] text-[#181512]'
                      : 'bg-[#211D1A] border-[#FFF0E1]/[0.08] hover:border-[#E87A3E]/50 hover:bg-[#2B2521] text-[#FAF7F2]'
                  }`}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between px-0.5 pt-1">
            <span
              className={`text-[11px] font-semibold ${
                isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
              }`}
            >
              {searchTerm.trim().length >= 2 ? 'Canlı Katalog Sonuçları:' : 'Önerilen Parçalar:'}
            </span>
            {isSearchingCatalog && (
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                  isLight ? 'text-[#D96B2C]' : 'text-[#F49A5E]'
                }`}
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Aranıyor...</span>
              </span>
            )}
          </div>

          {!isSearchingCatalog && searchTerm.trim().length >= 2 && filteredSongs.length === 0 && (
            <div
              className={`py-6 text-center text-xs ${
                isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
              }`}
            >
              &ldquo;{searchTerm.trim()}&rdquo; için sonuç bulunamadı. Yukarıdaki Eşle butonuyla
              doğrudan arayabilirsin.
            </div>
          )}

          {filteredSongs.map((song) => {
            const isSelected = song.id === currentSong.id;
            const showImage = Boolean(song.coverUrl) && !failedCovers[song.id];

            return (
              <button
                type="button"
                key={song.id}
                onClick={() => {
                  onSelectSong(song);
                  onClose();
                }}
                className={`w-full p-3 rounded-2xl flex items-center justify-between transition text-left border cursor-pointer ${
                  isSelected
                    ? isLight
                      ? 'bg-[#E87A3E]/12 border-[#E87A3E]/45 text-[#181512]'
                      : 'bg-[#E87A3E]/15 border-[#E87A3E]/45 text-[#FAF7F2]'
                    : isLight
                    ? 'bg-[#FAF8F4] border-[#EAE4DC] hover:border-[#E87A3E]/40 hover:bg-[#F2EDE6] text-[#181512]'
                    : 'bg-[#211D1A] border-[#FFF0E1]/[0.07] hover:border-[#E87A3E]/35 hover:bg-[#292420] text-[#FAF7F2]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-sm border bg-gradient-to-br ${
                      song.coverGradient || 'from-[#E87A3E] to-[#D97706]'
                    } ${isLight ? 'border-[#EAE4DC]' : 'border-[#FFF0E1]/10'}`}
                  >
                    {showImage ? (
                      <img
                        src={song.coverUrl}
                        alt={song.album || song.title}
                        loading="eager"
                        onError={() =>
                          setFailedCovers((prev) => ({
                            ...prev,
                            [song.id]: true,
                          }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-semibold truncate ${
                        isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
                      }`}
                    >
                      {song.title}
                    </div>
                    <div
                      className={`text-[11px] truncate mt-0.5 ${
                        isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
                      }`}
                    >
                      {song.artist} · {song.genre}
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <div className="studio-btn-primary w-6 h-6 rounded-full bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <span
                    className={`text-[10px] font-semibold shrink-0 px-2.5 py-1 rounded-lg border ${
                      isLight
                        ? 'bg-white text-[#181512] border-[#E2D9CE]'
                        : 'bg-[#171412] text-[#A39A91] border-[#FFF0E1]/[0.08]'
                    }`}
                  >
                    Seç
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t text-[11px] text-center flex items-center justify-center gap-2 ${
            isLight
              ? 'bg-[#FAF8F4] border-[#EAE4DC] text-[#6B635B]'
              : 'bg-[#171412] border-[#FFF0E1]/[0.08] text-[#A39A91]'
          }`}
        >
          <Link2 className="w-3.5 h-3.5 text-[#E87A3E] shrink-0" />
          <span>YouTube Music veya Spotify linki yapıştırarak da şarkı çalabilirsiniz.</span>
        </div>
      </div>
    </div>
  );
};
