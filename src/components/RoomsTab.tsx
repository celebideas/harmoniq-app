import React, { useState, useMemo, useEffect } from 'react';
import {
  Music,
  Users,
  Play,
  ChevronRight,
  Radio,
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import { Song, UserPlaylist, PersonalMusicTaste } from '../types';
import { SAMPLE_SONGS } from '../data/mockData';
import {
  isMusicArtistOrChannel,
  NON_ARTIST_BLACKLIST,
  purgeNonMusicFromLocalStorage,
  getArtistArtwork,
} from '../services/artistFilterService';
import { triggerHaptic } from '../services/themeService';

interface Props {
  currentSong: Song;
  onSelectRoom: (song: Song) => void;
  syncedPlaylists?: UserPlaylist[];
  onPlayPlaylist?: (playlist: UserPlaylist) => void;
  onStartPersonalRadio?: () => void;
  favoriteArtists?: string[];
  favoriteSongs?: Song[];
  personalTaste?: PersonalMusicTaste;
  onStartArtistRadio?: (artistName: string) => void;
}

type RoomFilterMode = 'all' | 'artists' | 'songs' | 'personal';
type MoodTunerId = 'all' | 'energy' | 'night' | 'rock' | 'discovery';

interface ArtistRoomInfo {
  artist: string;
  genre: string;
  totalLiveListeners: number;
  topSongTitle: string;
  songObj: Song;
  avatarGradient: string;
  avatarSeed: string;
  isPersonalFavorite: boolean;
  imageUrl?: string;
  moodTags: MoodTunerId[];
}

const GRADIENTS = [
  'from-zinc-800 to-zinc-950',
  'from-neutral-800 to-stone-950',
  'from-stone-800 to-neutral-950',
  'from-zinc-700 to-zinc-900',
  'from-neutral-700 to-neutral-950',
  'from-stone-700 to-stone-900',
];

const CURATED_DEFAULT_ARTISTS = [
  { artist: 'Duman', genre: 'Türkçe Rock · Grunge', song: SAMPLE_SONGS[0] },
  { artist: 'Mor ve Ötesi', genre: 'Alternatif Rock', song: SAMPLE_SONGS[1] },
  { artist: 'Arctic Monkeys', genre: 'Indie Rock · Post-Punk', song: SAMPLE_SONGS[2] },
  { artist: 'She Past Away', genre: 'Darkwave · Post-Punk', song: SAMPLE_SONGS[5] },
  { artist: 'Teoman', genre: 'Türkçe Rock · Akustik', song: SAMPLE_SONGS[4] },
  { artist: 'Jakuzi', genre: 'Synthpop · Dark Synth', song: SAMPLE_SONGS[3] },
  { artist: 'Adamlar', genre: 'Alternatif Rock · Indie', song: null },
  { artist: 'Perdenin Ardındakiler', genre: 'Alternatif · Indie Pop', song: null },
  { artist: 'Madrigal', genre: 'Alternatif Rock · Indie', song: null },
  { artist: 'Şebnem Ferah', genre: 'Türkçe Rock', song: null },
  { artist: 'Daft Punk', genre: 'Electronic · French Touch', song: null },
  { artist: 'The Weeknd', genre: 'Synthwave · R&B', song: null },
  { artist: 'Tame Impala', genre: 'Psychedelic Rock · Indie', song: null },
];

const MOOD_TUNER_OPTIONS: { id: MoodTunerId; label: string; desc: string }[] = [
  { id: 'energy', label: '⚡ Yüksek Enerji', desc: 'Yüksek BPM, elektronik ve dinamik ritimler' },
  { id: 'night', label: '🌙 Gece & Melankoli', desc: 'Darkwave, synthpop, akustik ve gece tınıları' },
  { id: 'rock', label: '🎸 Gitar & Rock', desc: 'Türkçe Rock, grunge ve alternatif gitar rifleri' },
  { id: 'discovery', label: '🔮 Derin Keşif', desc: 'Saykodelik, post-punk ve bağımsız sahne' },
];

function inferArtistGenre(artistName: string, fallbackGenre?: string): string {
  const lower = artistName.toLowerCase();
  if (/duman|mor ve ötesi|teoman|şebnem ferah|pilli bebek|kurban|redd|model|athena|adamlar|madrigal|dedublüman|perdenin/i.test(lower)) {
    return 'Türkçe Rock · Alternatif';
  }
  if (/jakuzi|she past away|gaye su akyol|büyük ev ablukada|lin pehlivan/i.test(lower)) {
    return 'Darkwave · Synthpop';
  }
  if (/arctic monkeys|the strokes|interpol|radiohead|nirvana|muse|placebo|the cure/i.test(lower)) {
    return 'Indie Rock · Post-Punk';
  }
  if (/daft punk|the weeknd|justice|kavinsky|gesaffelstein|depeche mode/i.test(lower)) {
    return 'Synthwave · Electronic';
  }
  if (/tame impala|beach house|cigaratte|khruangbin|alt-j/i.test(lower)) {
    return 'Psychedelic · Indie';
  }
  if (/ezhel|ceza|sagopa|şam|motive|uzi|gazapizm|no\.1/i.test(lower)) {
    return 'Türkçe Rap · Hip-Hop';
  }
  if (fallbackGenre && fallbackGenre !== 'Genel' && fallbackGenre !== 'YouTube Music') {
    return fallbackGenre;
  }
  return 'Alternatif · Indie';
}

function inferMoodTags(artistName: string, genre: string): MoodTunerId[] {
  const combined = `${artistName} ${genre}`.toLowerCase();
  const tags: MoodTunerId[] = [];
  if (/rock|grunge|gitar|guitar|metal|punk|duman|mor ve ötesi|teoman|şebnem|adamlar|kurban|redd|athena|arctic monkeys/i.test(combined)) {
    tags.push('rock');
  }
  if (/dark|synth|melankoli|akustik|gece|slow|post-punk|she past away|jakuzi|teoman|perdenin|dedublüman|madrigal/i.test(combined)) {
    tags.push('night');
  }
  if (/electronic|dance|rap|hip-hop|pop|upbeat|enerji|daft punk|the weeknd|athena|arctic monkeys|adamlar/i.test(combined)) {
    tags.push('energy');
  }
  if (/psychedelic|indie|alternatif|synth|post-punk|tame impala|jakuzi|she past away|madrigal/i.test(combined)) {
    tags.push('discovery');
  }
  if (tags.length === 0) {
    tags.push('discovery', 'energy');
  }
  return tags;
}

/**
 * Memoized Compact Horizontal Artist Card (Carousel in 'all' mode)
 */
const ArtistCardCompact: React.FC<{
  room: ArtistRoomInfo;
  isCurrentArtist: boolean;
  onEnter: () => void;
}> = React.memo(({ room, isCurrentArtist, onEnter }) => {
  return (
    <div
      onClick={onEnter}
      className={`min-w-[144px] max-w-[154px] p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center shrink-0 group ${
        isCurrentArtist
          ? 'bg-purple-500/10 border-purple-500/40 shadow-lg shadow-purple-500/10'
          : 'bg-white/95 dark:bg-[#14121E]/90 hover:bg-zinc-100/90 dark:hover:bg-[#1E1B2E]/90 border-[#E4E2EC] dark:border-white/[0.08]'
      }`}
    >
      <div className="relative mb-2.5">
        {room.imageUrl ? (
          <img
            src={room.imageUrl}
            alt={room.artist}
            loading="lazy"
            decoding="async"
            className="w-13 h-13 rounded-2xl object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-white/15 bg-zinc-900 group-hover:scale-105 transition-transform"
          />
        ) : (
          <div
            className={`w-13 h-13 rounded-2xl bg-gradient-to-tr ${room.avatarGradient} flex items-center justify-center text-white font-bold text-sm shrink-0 border border-white/[0.08] relative overflow-hidden group-hover:scale-105 transition-transform`}
          >
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-40">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="relative z-10">{room.avatarSeed}</span>
          </div>
        )}
        {isCurrentArtist && (
          <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-white flex items-center gap-0.5 shadow-md">
            <span className="w-0.5 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-0.5 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-0.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors truncate w-full">
        {room.artist}
      </span>
      <span className="text-[10px] text-zinc-500 dark:text-[#9E9AA8] truncate w-full mt-0.5">
        {room.topSongTitle}
      </span>

      <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono tabular-nums px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>{room.totalLiveListeners} dinleyici</span>
      </div>
    </div>
  );
});

/**
 * Memoized Artist Room Vertical Row
 */
const ArtistRoomRow: React.FC<{
  room: ArtistRoomInfo;
  isCurrentArtist: boolean;
  onEnter: () => void;
}> = React.memo(({ room, isCurrentArtist, onEnter }) => {
  return (
    <div
      onClick={onEnter}
      className="py-3 px-2.5 -mx-2 rounded-xl flex items-center justify-between gap-4 group cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-white/[0.03] active:scale-[0.99] transition min-h-[58px]"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {room.imageUrl ? (
          <img
            src={room.imageUrl}
            alt={room.artist}
            loading="lazy"
            decoding="async"
            className="w-11 h-11 rounded-xl object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-white/10 bg-zinc-900"
          />
        ) : (
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${room.avatarGradient} flex items-center justify-center text-white font-bold text-xs shrink-0 border border-white/[0.08] relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-40">
              <Music className="w-4 h-4 text-white" />
            </div>
            <span className="relative z-10">{room.avatarSeed}</span>
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate group-hover:text-purple-500 dark:group-hover:text-purple-400 transition">
              {room.artist}
            </span>
            {room.isPersonalFavorite && (
              <span className="text-[11px] text-zinc-500">· Takip ediliyor</span>
            )}
            {isCurrentArtist && (
              <div className="flex items-end gap-0.5 h-3 ml-0.5">
                <span className="w-0.5 bg-purple-500 h-2 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-0.5 bg-fuchsia-500 h-3 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-0.5 bg-pink-500 h-1.5 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
          <div className="text-xs text-zinc-500 dark:text-[#9E9AA8] truncate mt-0.5">
            {room.topSongTitle} <span className="text-zinc-400 dark:text-zinc-600">•</span> {room.genre}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums flex items-center gap-1 font-mono">
          <Users className="w-3.5 h-3.5 text-emerald-500" />
          <span>{room.totalLiveListeners}</span>
        </span>
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
            isCurrentArtist
              ? 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white shadow-sm'
              : 'bg-zinc-200/70 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-300 group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-500 group-hover:text-white'
          }`}
          title={`${room.artist} Odasına Gir`}
        >
          <Radio className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
});

/**
 * Memoized Song Room Vertical Row
 */
const SongRoomRow: React.FC<{
  song: Song;
  isCurrent: boolean;
  listenerCount: number;
  onSelect: () => void;
  formatDuration: (secs: number) => string;
}> = React.memo(({ song, isCurrent, listenerCount, onSelect, formatDuration }) => {
  return (
    <div
      onClick={onSelect}
      className="py-3 px-2.5 -mx-2 rounded-xl flex items-center justify-between gap-4 group cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-white/[0.03] active:scale-[0.99] transition min-h-[58px]"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-zinc-900 shrink-0 border border-zinc-200 dark:border-white/[0.08]">
          {song.coverUrl ? (
            <img
              src={song.coverUrl}
              alt={song.album}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-tr ${song.coverGradient} flex items-center justify-center`}>
              <Music className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-white group-hover:text-purple-500 dark:group-hover:text-purple-400 transition truncate">
              {song.title}
            </span>
            {isCurrent && (
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-purple-500 h-2 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-0.5 bg-fuchsia-500 h-3 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-0.5 bg-pink-500 h-1.5 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
          <div className="text-xs text-zinc-500 dark:text-[#9E9AA8] truncate mt-0.5">
            {song.artist} <span className="text-zinc-400 dark:text-zinc-600">•</span> {formatDuration(song.durationSeconds)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums flex items-center gap-1 font-mono">
          <Users className="w-3.5 h-3.5 text-emerald-500" />
          <span>{listenerCount}</span>
        </span>
        <div className="w-8 h-8 rounded-full bg-zinc-200/70 dark:bg-white/[0.04] group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-500 text-zinc-600 dark:text-zinc-400 group-hover:text-white flex items-center justify-center transition">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
});

export const RoomsTab: React.FC<Props> = ({
  currentSong,
  onSelectRoom,
  syncedPlaylists = [],
  onPlayPlaylist,
  onStartPersonalRadio,
  favoriteArtists = [],
  favoriteSongs = [],
  personalTaste,
  onStartArtistRadio,
}) => {
  const [filterMode, setFilterMode] = useState<RoomFilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('all');
  const [selectedMood, setSelectedMood] = useState<MoodTunerId>('all');
  const [onlyMusicChannels, setOnlyMusicChannels] = useState<boolean>(true);
  const [artistArtworkMap, setArtistArtworkMap] = useState<Record<string, string>>({});

  // Progressive load state for performance
  const [visibleArtistsCount, setVisibleArtistsCount] = useState<number>(12);
  const [visibleSongsCount, setVisibleSongsCount] = useState<number>(12);
  const [allModeSongLimit, setAllModeSongLimit] = useState<number>(6);

  // Collect all known user library tracks for matching
  const allUserTracks = useMemo(() => {
    const list: Song[] = [...favoriteSongs];
    for (const pl of syncedPlaylists) {
      if (pl.tracks && pl.tracks.length > 0) {
        list.push(...pl.tracks);
      }
    }
    return list;
  }, [favoriteSongs, syncedPlaylists]);

  // Purge corporate/magazine channels from localStorage on mount
  useEffect(() => {
    purgeNonMusicFromLocalStorage(allUserTracks);
  }, [allUserTracks]);

  // Dynamically compute Artist Rooms tailored directly to user preferences & strictly sanitized against NON_ARTIST_BLACKLIST
  const artistRooms: ArtistRoomInfo[] = useMemo(() => {
    const artistSources = [
      ...favoriteArtists,
      ...allUserTracks.map((t) => t.artist).filter(Boolean),
      ...(personalTaste?.topArtists || []),
    ];

    const uniqueCandidates: string[] = [];
    const seen = new Set<string>();

    for (const a of artistSources) {
      if (!a || typeof a !== 'string') continue;
      const trimmed = a.trim();
      const lower = trimmed.toLowerCase();
      if (
        !trimmed ||
        lower === 'youtube music' ||
        lower === 'bilinmeyen sanatçı' ||
        lower === 'youtube' ||
        seen.has(lower)
      ) {
        continue;
      }

      // Always enforce corporate/magazine/tech blacklist (Google Türkiye, LG Türkiye, Red Bull Miksteyp, UPROXX, etc.)
      if (NON_ARTIST_BLACKLIST.test(trimmed)) {
        continue;
      }

      if (onlyMusicChannels) {
        const check = isMusicArtistOrChannel(trimmed, allUserTracks);
        if (!check.isMusic) {
          continue;
        }
      }

      seen.add(lower);
      uniqueCandidates.push(trimmed);
    }

    // Blend curated defaults
    for (const cur of CURATED_DEFAULT_ARTISTS) {
      const lower = cur.artist.toLowerCase();
      if (!seen.has(lower) && !NON_ARTIST_BLACKLIST.test(cur.artist)) {
        seen.add(lower);
        uniqueCandidates.push(cur.artist);
      }
    }

    return uniqueCandidates.map((artist, idx) => {
      const lowerArtist = artist.toLowerCase();
      const matchingDefault = CURATED_DEFAULT_ARTISTS.find(
        (c) => c.artist.toLowerCase() === lowerArtist
      );
      const matchingSampleSong = SAMPLE_SONGS.find(
        (s) => s.artist.toLowerCase() === lowerArtist
      );
      const matchingLibrarySong = allUserTracks.find(
        (s) => s.artist.toLowerCase() === lowerArtist
      );

      // Genuine song belonging strictly to this artist
      const genuineArtistSong =
        matchingLibrarySong || matchingSampleSong || matchingDefault?.song || null;

      const genre = inferArtistGenre(
        artist,
        matchingDefault?.genre || genuineArtistSong?.genre
      );

      // Never assign another band's hardcoded song title (like "505" or "Koca Bir Saçmalık")
      const topSongTitle = genuineArtistSong
        ? genuineArtistSong.title
        : `Canlı Sanatçı Radyosu`;

      const fallbackSongObj: Song = genuineArtistSong || {
        ...SAMPLE_SONGS[idx % SAMPLE_SONGS.length],
        id: `artist-radio-${lowerArtist}`,
        title: `${artist} Canlı Radyosu`,
        artist,
        genre,
      };

      const totalLiveListeners = Math.max(
        12,
        Math.floor((artist.length * 7 + idx * 11) % 48) + 14
      );

      const isPersonalFavorite = favoriteArtists.some(
        (f) => f.toLowerCase() === lowerArtist
      );

      const initials = artist
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const imageUrl =
        artistArtworkMap[lowerArtist] || genuineArtistSong?.coverUrl;

      return {
        artist,
        genre,
        totalLiveListeners,
        topSongTitle,
        songObj: fallbackSongObj,
        avatarGradient: GRADIENTS[idx % GRADIENTS.length],
        avatarSeed: initials || artist.slice(0, 2).toUpperCase(),
        isPersonalFavorite,
        imageUrl,
        moodTags: inferMoodTags(artist, genre),
      };
    });
  }, [favoriteArtists, allUserTracks, personalTaste, onlyMusicChannels, artistArtworkMap]);

  // Fetch real high-res portraits for visible artists
  useEffect(() => {
    let cancelled = false;
    const missing = artistRooms
      .slice(0, 18)
      .filter((r) => !r.imageUrl && !artistArtworkMap[r.artist.toLowerCase()]);

    if (missing.length === 0) return;

    (async () => {
      for (const room of missing) {
        if (cancelled) break;
        const art = await getArtistArtwork(room.artist);
        if (art && !cancelled) {
          setArtistArtworkMap((prev) => ({
            ...prev,
            [room.artist.toLowerCase()]: art,
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [artistRooms, artistArtworkMap]);

  // Song rooms constructed from sample tracks and user playlists (excluding any corporate/blacklisted channels)
  const songRooms: Song[] = useMemo(() => {
    const combined: Song[] = [...SAMPLE_SONGS];
    const seen = new Set<string>(SAMPLE_SONGS.map((s) => s.id));

    for (const track of allUserTracks) {
      if (
        track &&
        track.id &&
        !seen.has(track.id) &&
        !NON_ARTIST_BLACKLIST.test(track.artist || '') &&
        !NON_ARTIST_BLACKLIST.test(track.title || '')
      ) {
        seen.add(track.id);
        combined.push(track);
      }
    }
    return combined;
  }, [allUserTracks]);

  // Dynamic Genres extracted from artist rooms
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    artistRooms.forEach((r) => {
      const parts = r.genre.split(/[·,\/]/);
      parts.forEach((p) => {
        const clean = p.trim();
        if (clean && clean.length > 2 && set.size < 6) {
          set.add(clean);
        }
      });
    });
    return Array.from(set);
  }, [artistRooms]);

  // Search, Genre, and Mood Filter for Artist Rooms
  const filteredArtistRooms = useMemo(() => {
    return artistRooms.filter((r) => {
      const matchSearch =
        searchQuery === '' ||
        r.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.topSongTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.genre.toLowerCase().includes(searchQuery.toLowerCase());

      const matchGenre =
        selectedGenreFilter === 'all' ||
        r.genre.toLowerCase().includes(selectedGenreFilter.toLowerCase());

      const matchMood =
        selectedMood === 'all' || r.moodTags.includes(selectedMood);

      return matchSearch && matchGenre && matchMood;
    });
  }, [artistRooms, searchQuery, selectedGenreFilter, selectedMood]);

  // Search, Genre, and Mood Filter for Song Rooms
  const filteredSongRooms = useMemo(() => {
    return songRooms.filter((s) => {
      const matchSearch =
        searchQuery === '' ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.genre.toLowerCase().includes(searchQuery.toLowerCase());

      const matchGenre =
        selectedGenreFilter === 'all' ||
        s.genre.toLowerCase().includes(selectedGenreFilter.toLowerCase());

      const songMoods = inferMoodTags(s.artist, s.genre);
      const matchMood =
        selectedMood === 'all' || songMoods.includes(selectedMood);

      return matchSearch && matchGenre && matchMood;
    });
  }, [songRooms, searchQuery, selectedGenreFilter, selectedMood]);

  const handleEnterArtistRoom = (room: ArtistRoomInfo) => {
    triggerHaptic(15);
    if (onStartArtistRadio) {
      onStartArtistRadio(room.artist);
    } else {
      onSelectRoom(room.songObj);
    }
  };

  const handleSelectMoodTuner = (moodId: MoodTunerId) => {
    triggerHaptic(15);
    const nextMood = selectedMood === moodId ? 'all' : moodId;
    setSelectedMood(nextMood);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 py-5 max-w-2xl mx-auto w-full space-y-5 select-none">
      {/* 1. Editorial Header */}
      <div className="flex items-baseline justify-between border-b border-zinc-200 dark:border-white/[0.06] pb-3.5">
        <div>
          <h1 className="text-xl font-heading font-bold text-zinc-900 dark:text-white tracking-tight">
            Canlı Odalar
          </h1>
          <p className="text-xs text-zinc-500 dark:text-[#9E9AA8] mt-0.5">
            Senkronize müzik frekansları ve ortak dinleyiciler
          </p>
        </div>
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono tabular-nums flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{140 + artistRooms.length * 4} canlı frekans</span>
        </span>
      </div>

      {/* 2. Kişisel Frekansın Hero Kartı + 4'lü Ruh Hali Seçici (Mood Tuner) */}
      <div className="p-4 rounded-3xl bg-white/95 dark:bg-[#14121E]/90 border border-[#E4E2EC] dark:border-white/[0.08] shadow-xl space-y-3.5 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-500 dark:text-purple-400 shrink-0 shadow-inner">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-heading font-bold text-zinc-900 dark:text-white tracking-tight">
                  Kişisel Frekansın
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  Canlı Akış
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-[#9E9AA8] truncate mt-0.5">
                {favoriteArtists.length > 0
                  ? `${favoriteArtists.filter((a) => !NON_ARTIST_BLACKLIST.test(a)).slice(0, 3).join(', ')} ve senin kütüphanen`
                  : 'Kişisel zevkine özel kesintisiz canlı frekans'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 relative z-10">
            {onStartPersonalRadio && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  onStartPersonalRadio();
                }}
                className="px-4 py-2.5 min-h-[42px] rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer shadow-lg shadow-purple-500/25"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Frekansa Gir</span>
              </button>
            )}
          </div>
        </div>

        {/* 4'lü Ruh Hali Seçici (Mood Tuner) */}
        <div className="pt-2.5 border-t border-zinc-200/80 dark:border-white/[0.06] relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-[#9E9AA8]">
              Frekans Akışı & Ruh Hali (Mood Tuner):
            </span>
            {selectedMood !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedMood('all')}
                className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                Tümünü Göster
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MOOD_TUNER_OPTIONS.map((mood) => {
              const isSelected = selectedMood === mood.id;
              return (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => handleSelectMoodTuner(mood.id)}
                  title={mood.desc}
                  className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer border active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white border-transparent shadow-md shadow-purple-500/20'
                      : 'bg-[#ECEAF2]/80 dark:bg-[#1E1B2E]/75 hover:bg-zinc-200/80 dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-200 border-[#DFDCE8] dark:border-white/[0.07]'
                  }`}
                >
                  <span className="truncate">{mood.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Sleek Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Sanatçı veya şarkı ara..."
          className="w-full pl-10 pr-9 py-2.5 bg-white/95 dark:bg-[#14121E]/90 border border-[#E4E2EC] dark:border-white/[0.08] focus:border-purple-500/50 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4. Minimalist Underline Navigation Tabs */}
      <div className="flex items-center gap-6 border-b border-zinc-200 dark:border-white/[0.06] overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'Tümü' },
          { id: 'artists', label: `Sanatçı Frekansları (${filteredArtistRooms.length})` },
          { id: 'songs', label: `Şarkı Odaları (${filteredSongRooms.length})` },
          { id: 'personal', label: `Listelerim (${syncedPlaylists.length})` },
        ].map((tab) => {
          const isActive = filterMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic(10);
                setFilterMode(tab.id as RoomFilterMode);
              }}
              className={`pb-3 text-xs font-medium whitespace-nowrap transition-colors relative cursor-pointer ${
                isActive
                  ? 'text-zinc-900 dark:text-white font-bold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* 5. Understated Genre Selectors */}
      {availableGenres.length > 0 && filterMode !== 'personal' && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-xs">
          <button
            type="button"
            onClick={() => setSelectedGenreFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              selectedGenreFilter === 'all'
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-200/60 dark:bg-white/[0.04]'
            }`}
          >
            Tümü
          </button>
          {availableGenres.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => setSelectedGenreFilter(genre)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                selectedGenreFilter === genre
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-200/60 dark:bg-white/[0.04]'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* SECTION A: "TÜMÜ" MODE — YATAY SANATÇI KARUSELİ & İLK 6 ŞARKI ODASI */}
      {filterMode === 'all' && (
        <div className="space-y-6">
          {/* A1. Sanatçı Frekansları (Yatay Kaydırılabilir Snap-Scroll Kartlar) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-900 dark:text-white">Sanatçı Frekansları</span>
                <span className="text-zinc-500 font-mono">({filteredArtistRooms.length})</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyMusicChannels(!onlyMusicChannels)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition cursor-pointer ${
                    onlyMusicChannels
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-zinc-200/70 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-white/[0.08]'
                  }`}
                  title="Kurumsal ve müzik dışı kanallar filtrelendi"
                >
                  <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="hidden xs:inline">Yalnızca Müzik Sanatçıları</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterMode('artists')}
                  className="text-purple-600 dark:text-purple-400 hover:underline font-semibold text-xs transition cursor-pointer flex items-center gap-0.5"
                >
                  <span>Tümünü Gör ({filteredArtistRooms.length})</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {filteredArtistRooms.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                Aramanıza uygun müzik sanatçısı bulunamadı.
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-0.5 scroll-smooth">
                {filteredArtistRooms.map((room) => {
                  const isCurrentArtist = currentSong.artist.toLowerCase() === room.artist.toLowerCase();
                  return (
                    <ArtistCardCompact
                      key={room.artist}
                      room={room}
                      isCurrentArtist={isCurrentArtist}
                      onEnter={() => handleEnterArtistRoom(room)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* A2. Aktif Şarkı Odaları (İlk 6 Oda + "Daha Fazla Göster" Butonu) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-900 dark:text-white">Aktif Şarkı Odaları</span>
                <span>• Senkron dinleme</span>
              </div>
              <span className="font-mono text-[11px] text-zinc-500">
                {Math.min(allModeSongLimit, filteredSongRooms.length)} / {filteredSongRooms.length} oda
              </span>
            </div>

            {filteredSongRooms.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                Aramanıza uygun şarkı odası bulunamadı.
              </div>
            ) : (
              <div className="divide-y divide-zinc-200/80 dark:divide-white/[0.06] border-y border-zinc-200/80 dark:border-white/[0.06]">
                {filteredSongRooms.slice(0, allModeSongLimit).map((song, index) => {
                  const isCurrent = song.id === currentSong.id;
                  const listenerCount = [19, 14, 22, 8, 11, 16, 27, 9][index % 8];
                  return (
                    <SongRoomRow
                      key={song.id || index}
                      song={song}
                      isCurrent={isCurrent}
                      listenerCount={listenerCount}
                      onSelect={() => {
                        triggerHaptic(15);
                        onSelectRoom(song);
                      }}
                      formatDuration={formatDuration}
                    />
                  );
                })}
              </div>
            )}

            {filteredSongRooms.length > allModeSongLimit && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    setAllModeSongLimit((prev) => prev + 6);
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/90 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.07] border border-zinc-200 dark:border-white/[0.06] text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Daha Fazla Oda Göster (+{filteredSongRooms.length - allModeSongLimit})</span>
                  <span>↓</span>
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* SECTION B: "SANATÇI FREKANSLARI" TEK BAŞINA SEÇİLDİYSE */}
      {filterMode === 'artists' && (
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-900 dark:text-white">Tüm Sanatçı Frekansları</span>
              <span className="text-zinc-500 font-mono">({filteredArtistRooms.length})</span>
            </div>

            <button
              type="button"
              onClick={() => setOnlyMusicChannels(!onlyMusicChannels)}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto ${
                onlyMusicChannels
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-zinc-200/70 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-white/[0.08]'
              }`}
            >
              <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>Yalnızca Müzik Kanalları</span>
            </button>
          </div>

          {filteredArtistRooms.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Aramanıza uygun müzik sanatçısı frekansı bulunamadı.
            </div>
          ) : (
            <>
              <div className="divide-y divide-zinc-200/80 dark:divide-white/[0.06] border-y border-zinc-200/80 dark:border-white/[0.06]">
                {filteredArtistRooms.slice(0, visibleArtistsCount).map((room) => {
                  const isCurrentArtist = currentSong.artist.toLowerCase() === room.artist.toLowerCase();
                  return (
                    <ArtistRoomRow
                      key={room.artist}
                      room={room}
                      isCurrentArtist={isCurrentArtist}
                      onEnter={() => handleEnterArtistRoom(room)}
                    />
                  );
                })}
              </div>

              {filteredArtistRooms.length > visibleArtistsCount && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setVisibleArtistsCount((prev) => prev + 12);
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/90 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.07] border border-zinc-200 dark:border-white/[0.06] text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Daha Fazla Sanatçı Yükle (+{filteredArtistRooms.length - visibleArtistsCount})</span>
                    <span>↓</span>
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* SECTION C: "ŞARKI ODALARI" TEK BAŞINA SEÇİLDİYSE */}
      {filterMode === 'songs' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-bold text-zinc-900 dark:text-white">Tüm Şarkı Odaları ({filteredSongRooms.length})</span>
            <span>Senkron dinleme</span>
          </div>

          {filteredSongRooms.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Aramanıza uygun şarkı odası bulunamadı.
            </div>
          ) : (
            <>
              <div className="divide-y divide-zinc-200/80 dark:divide-white/[0.06] border-y border-zinc-200/80 dark:border-white/[0.06]">
                {filteredSongRooms.slice(0, visibleSongsCount).map((song, index) => {
                  const isCurrent = song.id === currentSong.id;
                  const listenerCount = [19, 14, 22, 8, 11, 16, 27, 9][index % 8];
                  return (
                    <SongRoomRow
                      key={song.id || index}
                      song={song}
                      isCurrent={isCurrent}
                      listenerCount={listenerCount}
                      onSelect={() => {
                        triggerHaptic(15);
                        onSelectRoom(song);
                      }}
                      formatDuration={formatDuration}
                    />
                  );
                })}
              </div>

              {filteredSongRooms.length > visibleSongsCount && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setVisibleSongsCount((prev) => prev + 12);
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/90 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.07] border border-zinc-200 dark:border-white/[0.06] text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Daha Fazla Şarkı Odası Yükle (+{filteredSongRooms.length - visibleSongsCount})</span>
                    <span>↓</span>
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* SECTION D: PERSONAL PLAYLISTS */}
      {filterMode === 'personal' && (
        <section className="space-y-4">
          {syncedPlaylists.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500 space-y-1">
              <p>Henüz senkronize edilmiş çalma listeniz bulunmuyor.</p>
              <p className="text-zinc-400">Kütüphanem sekmesinden listelerinizi bağlayabilirsiniz.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200/80 dark:divide-white/[0.06] border-y border-zinc-200/80 dark:border-white/[0.06]">
              {syncedPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => onPlayPlaylist && onPlayPlaylist(pl)}
                  className="py-3.5 flex items-center justify-between gap-3 group cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-white/[0.02] px-2 -mx-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={pl.coverUrl}
                      alt={pl.title}
                      loading="lazy"
                      decoding="async"
                      className="w-12 h-12 rounded-xl object-cover shrink-0 bg-zinc-900 border border-zinc-200 dark:border-white/[0.08]"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-white truncate group-hover:text-purple-500 dark:group-hover:text-purple-400 transition">
                        {pl.title}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-[#9E9AA8] truncate mt-0.5">
                        {pl.tracks?.length || pl.trackCount} parça • {pl.duration}
                      </p>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-zinc-200/70 dark:bg-white/[0.04] group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-500 text-zinc-600 dark:text-zinc-400 group-hover:text-white flex items-center justify-center transition shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
