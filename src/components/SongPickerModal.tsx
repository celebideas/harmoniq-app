import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  currentSong: Song | null;
  onSelectSong: (song: Song) => void;
  themeMode?: 'dark' | 'light';
  customTitle?: string;
  customSubtitle?: string;
}

export const SongPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentSong,
  onSelectSong,
  themeMode,
  customTitle,
  customSubtitle,
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
    const seenIds = new Set<string>();
    const pushUnique = (song: Song) => {
      const key = `${song.artist.trim().toLowerCase()}::${song.title.trim().toLowerCase()}`;
      if (seen.has(key) || seenIds.has(song.id)) return;
      seen.add(key);
      if (song.id) seenIds.add(song.id);
      merged.push(song);
    };

    localMatches.forEach(pushUnique);
    remoteSongs.forEach(pushUnique);
    return merged;
  }, [searchTerm, remoteSongs]);

  if (!isOpen || typeof document === 'undefined') return null;

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

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-[131] w-full max-w-md rounded-3xl flex flex-col shadow-2xl overflow-hidden max-h-[85vh] bg-[#141418] border ${
          isLight
            ? 'border-[#E6E4DF] text-[#111113]'
            : 'border-white/[0.08] text-[#F5F5F7]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isLight
              ? 'bg-[#FAF9F6] border-[#E6E4DF]'
              : 'bg-[#141418] border-white/[0.08]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#111113]/[0.08] dark:bg-white/[0.10] border border-[#111113]/15 dark:border-white/15 text-[#111113] dark:text-[#F5F5F7] flex items-center justify-center">
              <Disc3 className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <h3
                className={`text-base font-heading font-bold ${
                  isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
                }`}
              >
                {customTitle || (currentSong ? 'Çalan Şarkıyı Değiştir' : 'Şarkı Ara ve Başlat')}
              </h3>
              <p className={`text-xs ${isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'}`}>
                {customSubtitle || 'Canlı odadaki parçanı seç veya link eşle'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl active:scale-[0.96] transition-transform duration-100 ease-out min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer ${
              isLight
                ? 'text-[#63636B] hover:text-[#111113] hover:bg-[#E6E4DF]'
                : 'text-[#8E8E98] hover:text-[#F5F5F7] hover:bg-[#1C1C22]'
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
              ? 'bg-white border-[#E6E4DF]'
              : 'bg-[#141418] border-white/[0.08]'
          }`}
        >
          <div className="relative">
            <Search
              className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                isLight ? 'text-[#8E847A]' : 'text-[#8E8E98]'
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
              className={`w-full pl-10 pr-20 py-2.5 rounded-xl border focus:outline-none focus:border-[#111113]/40 dark:focus:border-white/30 transition tabular-nums text-xs ${
                isLight
                  ? 'bg-[#FAF9F6] border-[#E2DFD9] text-[#111113] placeholder-[#8E847A]'
                  : 'bg-[#1C1C22] border-white/10 text-[#F5F5F7] placeholder-[#8E8E98]'
              }`}
            />
            {searchTerm.trim().length > 0 && (
              <button
                type="button"
                onClick={() => handleResolveAndPlay()}
                disabled={isResolving}
                className="studio-btn-primary absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] font-semibold text-xs active:scale-[0.96] transition-transform duration-100 ease-out flex items-center gap-1 shadow-sm cursor-pointer"
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
            <div className="text-xs text-rose-500 dark:text-rose-400 px-1 flex items-center gap-1.5">
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
                className={`w-full p-2.5 rounded-xl bg-[#111113]/[0.08] dark:bg-white/[0.10] border border-[#111113]/20 dark:border-white/20 hover:bg-[#111113]/[0.12] dark:hover:bg-white/[0.14] text-xs font-semibold flex items-center justify-between gap-2 active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
                  isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#111113] dark:text-[#F5F5F7]" />
                  <span className="truncate">
                    &ldquo;{searchTerm}&rdquo; parçasını/linkini doğrudan odaya bağla
                  </span>
                </span>
                <span className="studio-btn-primary font-semibold text-xs bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] px-2.5 py-1 rounded-md shrink-0">
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
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#111113] dark:text-[#F5F5F7]" />
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
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
                    isLight
                      ? 'bg-[#FAF9F6] border-[#E6E4DF] hover:border-[#111113]/30 dark:border-white/30 hover:bg-[#F1EFEA] text-[#111113]'
                      : 'bg-[#1C1C22] border-white/[0.08] hover:border-[#111113]/30 dark:border-white/30 hover:bg-[#24242C] text-[#F5F5F7]'
                  }`}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between px-0.5 pt-1">
            <span
              className={`text-xs font-semibold ${
                isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'
              }`}
            >
              {searchTerm.trim().length >= 2 ? 'Canlı Katalog Sonuçları:' : 'Önerilen Parçalar:'}
            </span>
            {isSearchingCatalog && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                  isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
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
                isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'
              }`}
            >
              &ldquo;{searchTerm.trim()}&rdquo; için sonuç bulunamadı. Yukarıdaki Eşle butonuyla
              doğrudan arayabilirsin.
            </div>
          )}

          {filteredSongs.map((song) => {
            const isSelected = Boolean(currentSong && song.id === currentSong.id);
            const showImage = Boolean(song.coverUrl) && !failedCovers[song.id];

            return (
              <button
                type="button"
                key={song.id}
                onClick={() => {
                  onSelectSong(song);
                  onClose();
                }}
                className={`w-full p-3 rounded-2xl flex items-center justify-between active:scale-[0.96] transition-transform duration-100 ease-out text-left border cursor-pointer ${
                  isSelected
                    ? isLight
                      ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] border-[#111113]/30 dark:border-white/30 text-[#111113]'
                      : 'bg-[#111113]/[0.08] dark:bg-white/[0.10] border-[#111113]/30 dark:border-white/30 text-[#F5F5F7]'
                    : isLight
                    ? 'bg-[#FAF9F6] border-[#E6E4DF] hover:border-[#111113]/25 dark:border-white/25 hover:bg-[#F1EFEA] text-[#111113]'
                    : 'bg-[#1C1C22] border-white/[0.07] hover:border-[#111113]/25 dark:hover:border-white/25 hover:bg-[#24242C] text-[#F5F5F7]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-sm border bg-gradient-to-br ${
                      song.coverGradient || 'from-zinc-700 to-zinc-900'
                    } ${isLight ? 'border-[#E6E4DF]' : 'border-white/10'}`}
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
                        isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
                      }`}
                    >
                      {song.title}
                    </div>
                    <div
                      className={`text-xs truncate mt-0.5 ${
                        isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'
                      }`}
                    >
                      {song.artist} · {song.genre}
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <div className="studio-btn-primary w-6 h-6 rounded-full bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] flex items-center justify-center shrink-0 shadow-sm">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <span
                    className={`text-xs font-semibold shrink-0 px-2.5 py-1 rounded-lg border ${
                      isLight
                        ? 'bg-white text-[#111113] border-[#E2DFD9]'
                        : 'bg-[#141418] text-[#8E8E98] border-white/[0.08]'
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
          className={`px-5 py-3 border-t text-xs text-center flex items-center justify-center gap-2 ${
            isLight
              ? 'bg-[#FAF9F6] border-[#E6E4DF] text-[#63636B]'
              : 'bg-[#141418] border-white/[0.08] text-[#8E8E98]'
          }`}
        >
          <Link2 className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7] shrink-0" />
          <span>YouTube Music veya Spotify linki yapıştırarak da şarkı çalabilirsiniz.</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
