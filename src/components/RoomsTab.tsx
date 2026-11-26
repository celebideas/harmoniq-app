import React, { useState, useMemo, useEffect } from 'react';
import {
  Music,
  Play,
  ChevronRight,
  Radio,
  Search,
  X,
  MapPin,
  Disc3,
} from 'lucide-react';
import { Song, UserPlaylist, PersonalMusicTaste, LoungeUser } from '../types';
import { SAMPLE_SONGS } from '../data/mockData';
import {
  isMusicArtistOrChannel,
  NON_ARTIST_BLACKLIST,
  purgeNonMusicFromLocalStorage,
  getArtistArtwork,
} from '../services/artistFilterService';
import { triggerHaptic } from '../services/themeService';
import { LiveMiniEqualizer } from './LiveMiniEqualizer';
import { ProximityDensityMap, DistanceFilter } from './ProximityDensityMap';

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
  users?: LoungeUser[];
  onSelectUser?: (user: LoungeUser) => void;
  onDirectChat?: (user: LoungeUser) => void;
  onSeekSecond?: (sec: number) => void;
  userCity?: string;
  onUpdateCity?: (city: string) => void;
  themeMode?: 'dark' | 'light';
}

type RoomFilterMode = 'all' | 'artists' | 'songs' | 'personal';
type MoodTunerId = 'all' | 'energy' | 'night' | 'rock' | 'discovery';
type ExploreLens = 'rooms' | 'map';

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
  { id: 'all', label: 'Tümü', desc: 'Tüm canlı odalar ve sanatçı frekansları' },
  { id: 'energy', label: 'Yüksek Enerji', desc: 'Yüksek BPM, elektronik ve dinamik ritimler' },
  { id: 'night', label: 'Gece', desc: 'Darkwave, synthpop ve gece tınıları' },
  { id: 'rock', label: 'Akustik & Rock', desc: 'Türkçe Rock, akustik ve alternatif gitar' },
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
      className={`min-w-[144px] max-w-[154px] p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center shrink-0 group ${
        isCurrentArtist
          ? 'bg-[#E87A3E]/10 dark:bg-[#E87A3E]/15 border-[#E87A3E]/35'
          : 'bg-white dark:bg-[#171412] hover:bg-[#FAF8F4] dark:hover:bg-[#211D1A] border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_4px_20px_rgba(24,21,18,0.04)] dark:shadow-none'
      }`}
    >
      <div className="relative mb-2.5">
        {room.imageUrl ? (
          <img
            src={room.imageUrl}
            alt={room.artist}
            loading="lazy"
            decoding="async"
            className="w-13 h-13 rounded-xl object-cover shrink-0 border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] bg-[#211D1A] group-hover:scale-105 transition-transform"
          />
        ) : (
          <div
            className={`w-13 h-13 rounded-xl bg-gradient-to-tr ${room.avatarGradient} flex items-center justify-center text-white font-bold text-sm shrink-0 border border-white/[0.08] relative overflow-hidden group-hover:scale-105 transition-transform`}
          >
            <span className="relative z-10">{room.avatarSeed}</span>
          </div>
        )}
      </div>

      <span className="text-xs font-bold text-[#181512] dark:text-[#FAF7F2] truncate w-full">
        {room.artist}
      </span>
      <span className="text-[11px] text-[#6B635B] dark:text-[#A39A91] truncate w-full mt-0.5">
        {room.topSongTitle}
      </span>

      <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-[#16A34A] dark:text-[#22C55E] font-mono tabular-nums">
        <LiveMiniEqualizer />
        <span>{room.totalLiveListeners}</span>
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
      className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 group cursor-pointer active:scale-[0.99] transition min-h-[68px] ${
        isCurrentArtist
          ? 'bg-[#E87A3E]/10 dark:bg-[#E87A3E]/15 border-[#E87A3E]/35'
          : 'bg-white dark:bg-[#171412] hover:bg-[#FAF8F4] dark:hover:bg-[#211D1A] border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_4px_20px_rgba(24,21,18,0.04)] dark:shadow-none'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {room.imageUrl ? (
          <img
            src={room.imageUrl}
            alt={room.artist}
            loading="lazy"
            decoding="async"
            className="w-11 h-11 rounded-xl object-cover shrink-0 border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] bg-[#211D1A]"
          />
        ) : (
          <div
            className={`avatar-circle w-11 h-11 rounded-xl bg-gradient-to-tr ${room.avatarGradient} flex items-center justify-center text-white font-bold text-xs shrink-0 border border-white/[0.08]`}
          >
            {room.avatarSeed}
          </div>
        )}

        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#181512] dark:text-[#FAF7F2] truncate">
            {room.artist}
          </div>
          <div className="text-xs text-[#6B635B] dark:text-[#A39A91] truncate mt-0.5">
            {room.topSongTitle} · {room.genre}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-[#16A34A] dark:text-[#22C55E] tabular-nums flex items-center gap-1.5 font-mono font-medium">
          <LiveMiniEqualizer />
          <span>{room.totalLiveListeners}</span>
        </span>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
            isCurrentArtist
              ? 'studio-btn-primary bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white shadow-sm'
              : 'bg-[#F2EDE6] dark:bg-[#211D1A] text-[#6B635B] dark:text-[#A39A91] group-hover:bg-[#E87A3E] group-hover:text-white'
          }`}
          title={`${room.artist} Odasına Gir`}
        >
          <Radio className="w-3.5 h-3.5" strokeWidth={1.75} />
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
      className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 group cursor-pointer active:scale-[0.99] transition min-h-[68px] ${
        isCurrent
          ? 'bg-[#E87A3E]/10 dark:bg-[#E87A3E]/15 border-[#E87A3E]/35'
          : 'bg-white dark:bg-[#171412] hover:bg-[#FAF8F4] dark:hover:bg-[#211D1A] border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_4px_20px_rgba(24,21,18,0.04)] dark:shadow-none'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[#211D1A] shrink-0 border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08]">
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
              <Music className="w-4 h-4 text-white" strokeWidth={1.75} />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#181512] dark:text-[#FAF7F2] truncate">
            {song.title}
          </div>
          <div className="text-xs text-[#6B635B] dark:text-[#A39A91] truncate mt-0.5">
            {song.artist} · <span className="font-mono tabular-nums">{formatDuration(song.durationSeconds)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-[#16A34A] dark:text-[#22C55E] tabular-nums flex items-center gap-1.5 font-mono font-medium">
          <LiveMiniEqualizer />
          <span>{listenerCount}</span>
        </span>
        <div className="w-8 h-8 rounded-full bg-[#F2EDE6] dark:bg-[#211D1A] text-[#6B635B] dark:text-[#A39A91] group-hover:bg-[#E87A3E] group-hover:text-white flex items-center justify-center transition">
          <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
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
  users = [],
  onSelectUser,
  onDirectChat,
  onSeekSecond,
  userCity,
  onUpdateCity,
  themeMode = 'dark',
}) => {
  const [exploreLens, setExploreLens] = useState<ExploreLens>('rooms');
  const [mapDistanceFilter, setMapDistanceFilter] = useState<DistanceFilter>('all');
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
    <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 mt-3 sm:mt-4 pb-8 max-w-2xl lg:max-w-6xl mx-auto w-full space-y-5 select-none">
      {/* 1. Studio 2-Lens Switcher (Canlı Odalar | Harita) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Keşfet görünümü"
          className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#F2EDE6] dark:bg-[#171412] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] w-full sm:w-auto sm:min-w-[290px]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={exploreLens === 'rooms'}
            onClick={() => {
              triggerHaptic(12);
              setExploreLens('rooms');
            }}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              exploreLens === 'rooms'
                ? 'bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] border border-[#E87A3E]/25'
                : 'text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] border border-transparent'
            }`}
          >
            <Disc3 className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>Canlı Odalar</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={exploreLens === 'map'}
            onClick={() => {
              triggerHaptic(12);
              setExploreLens('map');
            }}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              exploreLens === 'map'
                ? 'bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] border border-[#E87A3E]/25'
                : 'text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] border border-transparent'
            }`}
          >
            <MapPin className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>Harita</span>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
          <span className="text-[#16A34A] dark:text-[#22C55E] font-mono tabular-nums flex items-center gap-1.5 font-medium">
            <LiveMiniEqualizer />
            <span>{140 + artistRooms.length * 4} canlı dinleyici</span>
          </span>
        </div>
      </div>

      {/* LENS 2: HARİTA (Real Interactive OpenStreetMap + Leaflet ProximityDensityMap) */}
      {exploreLens === 'map' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all' as DistanceFilter, label: 'Tümü', count: users.length },
              {
                id: '1km' as DistanceFilter,
                label: '1 km',
                count: users.filter((u) => u.distanceKm <= 1).length,
              },
              {
                id: '5km' as DistanceFilter,
                label: '5 km',
                count: users.filter((u) => u.distanceKm <= 5).length,
              },
              {
                id: 'city' as DistanceFilter,
                label: '15 km',
                count: users.filter((u) => u.distanceKm <= 15).length,
              },
            ].map((f) => {
              const isSelected = mapDistanceFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMapDistanceFilter(f.id)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 transition cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] border-[#E87A3E]/25'
                      : 'bg-white dark:bg-[#171412] text-[#6B635B] dark:text-[#A39A91] border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] hover:text-[#181512] dark:hover:text-[#FAF7F2]'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="font-mono tabular-nums text-[10px] opacity-75">{f.count}</span>
                </button>
              );
            })}
          </div>

          <ProximityDensityMap
            users={users}
            activeFilter={mapDistanceFilter}
            onChangeFilter={setMapDistanceFilter}
            onSelectUser={onSelectUser || (() => {})}
            onDirectChat={onDirectChat}
            onSeekSecond={onSeekSecond}
            currentSong={currentSong}
            myCity={userCity}
            onChangeCity={onUpdateCity}
            themeMode={themeMode}
          />
        </div>
      )}

      {/* LENS 1: CANLI ODALAR */}
      {exploreLens === 'rooms' && (
        <div className="space-y-5">
          {/* Quiet 4-Chip Mood Bar (Tümü | Yüksek Enerji | Gece | Akustik & Rock) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {MOOD_TUNER_OPTIONS.map((mood) => {
              const isSelected = selectedMood === mood.id;
              return (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(12);
                    setSelectedMood(mood.id);
                  }}
                  title={mood.desc}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition whitespace-nowrap shrink-0 cursor-pointer border active:scale-95 ${
                    isSelected
                      ? 'bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] border-[#E87A3E]/25'
                      : 'bg-white dark:bg-[#171412] text-[#6B635B] dark:text-[#A39A91] border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] hover:text-[#181512] dark:hover:text-[#FAF7F2]'
                  }`}
                >
                  {mood.label}
                </button>
              );
            })}
          </div>

          {/* Kişisel Frekansın Studio Strip */}
          {onStartPersonalRadio && (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_4px_20px_rgba(24,21,18,0.04)] dark:shadow-none flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#E87A3E]/15 border border-[#E87A3E]/25 flex items-center justify-center text-[#D96B2C] dark:text-[#F49A5E] shrink-0">
                  <Radio className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#181512] dark:text-[#FAF7F2] tracking-tight truncate">
                      Kişisel Frekansın
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#16A34A] dark:text-[#22C55E] shrink-0">
                      <LiveMiniEqualizer />
                    </span>
                  </div>
                  <p className="text-xs text-[#6B635B] dark:text-[#A39A91] truncate mt-0.5">
                    {favoriteArtists.length > 0
                      ? `${favoriteArtists.filter((a) => !NON_ARTIST_BLACKLIST.test(a)).slice(0, 3).join(', ')} ve kütüphanen`
                      : 'Kişisel zevkine özel kesintisiz canlı akış'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  onStartPersonalRadio();
                }}
                className="studio-btn-primary px-4 py-2.5 min-h-[40px] rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white shadow-lg shadow-amber-950/20 font-semibold text-xs flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" strokeWidth={1.75} />
                <span>Başlat</span>
              </button>
            </div>
          )}

          {/* Sleek Search Bar */}
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#6B635B] dark:text-[#A39A91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sanatçı veya şarkı odası ara..."
              className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] focus:border-[#E87A3E]/50 rounded-xl text-xs text-[#181512] dark:text-[#FAF7F2] placeholder:text-[#6B635B] dark:placeholder:text-[#A39A91] focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] cursor-pointer"
                aria-label="Temizle"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>

          {/* Minimalist Underline Sub-Tabs */}
          <div className="flex items-center gap-6 border-b border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'artists', label: `Sanatçılar (${filteredArtistRooms.length})` },
              { id: 'songs', label: `Şarkı Odaları (${filteredSongRooms.length})` },
              { id: 'personal', label: `Listelerim (${syncedPlaylists.length})` },
            ].map((tab) => {
              const isActive = filterMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    setFilterMode(tab.id as RoomFilterMode);
                  }}
                  className={`pb-3 text-xs whitespace-nowrap transition-colors relative cursor-pointer ${
                    isActive
                      ? 'text-[#D96B2C] dark:text-[#F49A5E] font-bold'
                      : 'text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] font-medium'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E87A3E] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Understated Genre Selectors */}
          {availableGenres.length > 0 && filterMode !== 'personal' && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedGenreFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer shrink-0 border ${
                  selectedGenreFilter === 'all'
                    ? 'bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] font-semibold border-[#E87A3E]/25'
                    : 'text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] bg-[#F2EDE6] dark:bg-[#211D1A] border-transparent'
                }`}
              >
                Tümü
              </button>
              {availableGenres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenreFilter(genre)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer shrink-0 border ${
                    selectedGenreFilter === genre
                      ? 'bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] font-semibold border-[#E87A3E]/25'
                      : 'text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] bg-[#F2EDE6] dark:bg-[#211D1A] border-transparent'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          )}

          {/* SECTION A: TÜMÜ */}
          {filterMode === 'all' && (
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#181512] dark:text-[#FAF7F2]">
                      Sanatçı Frekansları
                    </span>
                    <span className="text-[#6B635B] dark:text-[#A39A91] font-mono tabular-nums">
                      ({filteredArtistRooms.length})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFilterMode('artists')}
                    className="text-[#D96B2C] dark:text-[#F49A5E] hover:underline font-semibold text-xs transition cursor-pointer"
                  >
                    Tümünü Gör →
                  </button>
                </div>

                {filteredArtistRooms.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#6B635B] dark:text-[#A39A91]">
                    Aramanıza uygun müzik sanatçısı bulunamadı.
                  </div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-0.5 scroll-smooth pr-6 [mask-image:linear-gradient(to_right,black_88%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_88%,transparent_100%)] lg:grid lg:grid-cols-3 xl:grid-cols-4 lg:overflow-visible lg:pr-0 lg:[mask-image:none] lg:[-webkit-mask-image:none]">
                    {filteredArtistRooms.slice(0, 8).map((room) => {
                      const isCurrentArtist =
                        currentSong.artist.toLowerCase() === room.artist.toLowerCase();
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

              <section className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#6B635B] dark:text-[#A39A91]">
                  <span className="font-bold text-[#181512] dark:text-[#FAF7F2]">
                    Aktif Şarkı Odaları
                  </span>
                  <span className="font-mono tabular-nums text-[11px]">
                    {Math.min(allModeSongLimit, filteredSongRooms.length)} / {filteredSongRooms.length}
                  </span>
                </div>

                {filteredSongRooms.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#6B635B] dark:text-[#A39A91]">
                    Aramanıza uygun şarkı odası bulunamadı.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
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
                      className="w-full py-2.5 rounded-xl bg-white dark:bg-[#171412] hover:bg-[#F2EDE6] dark:hover:bg-[#211D1A] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] text-xs font-semibold text-[#181512] dark:text-[#FAF7F2] transition cursor-pointer"
                    >
                      Daha Fazla Oda Göster (+{filteredSongRooms.length - allModeSongLimit})
                    </button>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* SECTION B: SANATÇI FREKANSLARI */}
          {filterMode === 'artists' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#181512] dark:text-[#FAF7F2]">
                    Tüm Sanatçı Frekansları
                  </span>
                  <span className="text-[#6B635B] dark:text-[#A39A91] font-mono tabular-nums">
                    ({filteredArtistRooms.length})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setOnlyMusicChannels(!onlyMusicChannels)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border transition cursor-pointer ${
                    onlyMusicChannels
                      ? 'bg-[#16A34A]/10 dark:bg-[#22C55E]/15 text-[#16A34A] dark:text-[#22C55E] border-[#16A34A]/25 dark:border-[#22C55E]/25'
                      : 'bg-[#F2EDE6] dark:bg-[#211D1A] text-[#6B635B] dark:text-[#A39A91] border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08]'
                  }`}
                >
                  Yalnızca Müzik Kanalları
                </button>
              </div>

              {filteredArtistRooms.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#6B635B] dark:text-[#A39A91]">
                  Aramanıza uygun müzik sanatçısı frekansı bulunamadı.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                    {filteredArtistRooms.slice(0, visibleArtistsCount).map((room) => {
                      const isCurrentArtist =
                        currentSong.artist.toLowerCase() === room.artist.toLowerCase();
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
                        className="w-full py-2.5 rounded-xl bg-white dark:bg-[#171412] hover:bg-[#F2EDE6] dark:hover:bg-[#211D1A] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] text-xs font-semibold text-[#181512] dark:text-[#FAF7F2] transition cursor-pointer min-h-[44px]"
                      >
                        Daha Fazla Sanatçı Yükle (+{filteredArtistRooms.length - visibleArtistsCount})
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* SECTION C: ŞARKI ODALARI */}
          {filterMode === 'songs' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#6B635B] dark:text-[#A39A91]">
                <span className="font-bold text-[#181512] dark:text-[#FAF7F2]">
                  Tüm Şarkı Odaları ({filteredSongRooms.length})
                </span>
                <span>Senkron dinleme</span>
              </div>

              {filteredSongRooms.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#6B635B] dark:text-[#A39A91]">
                  Aramanıza uygun şarkı odası bulunamadı.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
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
                        className="w-full py-2.5 rounded-xl bg-white dark:bg-[#171412] hover:bg-[#F2EDE6] dark:hover:bg-[#211D1A] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] text-xs font-semibold text-[#181512] dark:text-[#FAF7F2] transition cursor-pointer min-h-[44px]"
                      >
                        Daha Fazla Şarkı Odası Yükle (+{filteredSongRooms.length - visibleSongsCount})
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
                <div className="py-10 text-center text-xs text-[#6B635B] dark:text-[#A39A91] space-y-1">
                  <p>Henüz senkronize edilmiş çalma listeniz bulunmuyor.</p>
                  <p className="opacity-75">Ben sekmesinden listelerinizi bağlayabilirsiniz.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                  {syncedPlaylists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => onPlayPlaylist && onPlayPlaylist(pl)}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#171412] hover:bg-[#FAF8F4] dark:hover:bg-[#211D1A] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_4px_20px_rgba(24,21,18,0.04)] dark:shadow-none flex items-center justify-between gap-3 group cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={pl.coverUrl}
                          alt={pl.title}
                          loading="lazy"
                          decoding="async"
                          className="w-12 h-12 rounded-xl object-cover shrink-0 bg-[#211D1A] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08]"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-[#181512] dark:text-[#FAF7F2] truncate">
                            {pl.title}
                          </h4>
                          <p className="text-xs text-[#6B635B] dark:text-[#A39A91] truncate mt-0.5 font-mono tabular-nums">
                            {pl.tracks?.length || pl.trackCount} parça · {pl.duration}
                          </p>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-[#F2EDE6] dark:bg-[#211D1A] text-[#181512] dark:text-[#FAF7F2] group-hover:bg-[#E87A3E] group-hover:text-white flex items-center justify-center transition shrink-0">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" strokeWidth={1.75} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};
