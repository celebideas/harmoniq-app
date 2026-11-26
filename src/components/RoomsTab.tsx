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
import { ProximityDensityMap, RadiusSlider, ALL_TURKEY_RADIUS } from './ProximityDensityMap';

interface Props {
  currentSong: Song | null;
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

type MoodTunerId = 'all' | 'energy' | 'night' | 'rock';
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
  { id: 'rock', label: 'Rock & Indie', desc: 'Türkçe Rock, alternatif gitar ve indie tınılar' },
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
  if (/rock|indie|alternatif|grunge|gitar|guitar|metal|punk|duman|mor ve ötesi|teoman|şebnem|adamlar|kurban|redd|athena|arctic monkeys|tame impala|madrigal|perdenin/i.test(combined)) {
    tags.push('rock');
  }
  if (/dark|synth|melankoli|akustik|gece|slow|post-punk|she past away|jakuzi|teoman|perdenin|dedublüman|madrigal/i.test(combined)) {
    tags.push('night');
  }
  if (/electronic|dance|rap|hip-hop|pop|upbeat|enerji|daft punk|the weeknd|athena|arctic monkeys|adamlar/i.test(combined)) {
    tags.push('energy');
  }
  if (tags.length === 0) {
    tags.push('rock', 'energy');
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
      className={`min-w-[144px] max-w-[154px] p-3.5 rounded-2xl border active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer flex flex-col items-center text-center shrink-0 group ${
        isCurrentArtist
          ? 'bg-[#111113]/[0.06] dark:bg-white/[0.08] border-[#111113]/25 dark:border-white/25'
          : 'bg-white dark:bg-[#141418] hover:bg-[#FAF9F6] dark:hover:bg-[#1C1C22] border-[#E6E4DF] dark:border-white/[0.08] shadow-[0_4px_20px_rgba(17,17,19,0.04)] dark:shadow-none'
      }`}
    >
      <div className="relative mb-2.5">
        {room.imageUrl ? (
          <img
            src={room.imageUrl}
            alt={room.artist}
            loading="lazy"
            decoding="async"
            className="w-13 h-13 rounded-xl object-cover shrink-0 border border-[#E6E4DF] dark:border-white/[0.08] bg-[#1C1C22] group-hover:scale-105 transition-transform"
          />
        ) : (
          <div
            className={`w-13 h-13 rounded-xl bg-gradient-to-tr ${room.avatarGradient} flex items-center justify-center text-white font-bold text-sm shrink-0 border border-white/[0.08] relative overflow-hidden group-hover:scale-105 transition-transform`}
          >
            <span className="relative z-10">{room.avatarSeed}</span>
          </div>
        )}
      </div>

      <span className="text-xs font-bold text-[#111113] dark:text-[#F5F5F7] truncate w-full">
        {room.artist}
      </span>
      <span className="text-[11px] text-[#63636B] dark:text-[#8E8E98] truncate w-full mt-0.5">
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
      className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 group cursor-pointer active:scale-[0.96] transition-transform duration-100 ease-out min-h-[68px] ${
        isCurrentArtist
          ? 'bg-[#111113]/[0.06] dark:bg-white/[0.08] border-[#111113]/25 dark:border-white/25'
          : 'bg-white dark:bg-[#141418] hover:bg-[#FAF9F6] dark:hover:bg-[#1C1C22] border-[#E6E4DF] dark:border-white/[0.08] shadow-[0_4px_20px_rgba(17,17,19,0.04)] dark:shadow-none'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {room.imageUrl ? (
          <img
            src={room.imageUrl}
            alt={room.artist}
            loading="lazy"
            decoding="async"
            className="w-11 h-11 rounded-xl object-cover shrink-0 border border-[#E6E4DF] dark:border-white/[0.08] bg-[#1C1C22]"
          />
        ) : (
          <div
            className={`avatar-circle w-11 h-11 rounded-xl bg-gradient-to-tr ${room.avatarGradient} flex items-center justify-center text-white font-bold text-xs shrink-0 border border-white/[0.08]`}
          >
            {room.avatarSeed}
          </div>
        )}

        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#111113] dark:text-[#F5F5F7] truncate">
            {room.artist}
          </div>
          <div className="text-xs text-[#63636B] dark:text-[#8E8E98] truncate mt-0.5">
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
              ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] shadow-sm'
              : 'bg-[#F1EFEA] dark:bg-[#1C1C22] text-[#63636B] dark:text-[#8E8E98] group-hover:bg-[#111113] dark:hover:bg-white dark:hover:text-[#0B0B0D] group-hover:text-white'
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
      className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 group cursor-pointer active:scale-[0.96] transition-transform duration-100 ease-out min-h-[68px] ${
        isCurrent
          ? 'bg-[#111113]/[0.06] dark:bg-white/[0.08] border-[#111113]/25 dark:border-white/25'
          : 'bg-white dark:bg-[#141418] hover:bg-[#FAF9F6] dark:hover:bg-[#1C1C22] border-[#E6E4DF] dark:border-white/[0.08] shadow-[0_4px_20px_rgba(17,17,19,0.04)] dark:shadow-none'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[#1C1C22] shrink-0 border border-[#E6E4DF] dark:border-white/[0.08]">
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
          <div className="text-sm font-semibold text-[#111113] dark:text-[#F5F5F7] truncate">
            {song.title}
          </div>
          <div className="text-xs text-[#63636B] dark:text-[#8E8E98] truncate mt-0.5">
            {song.artist} · <span className="font-mono tabular-nums">{formatDuration(song.durationSeconds)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-[#16A34A] dark:text-[#22C55E] tabular-nums flex items-center gap-1.5 font-mono font-medium">
          <LiveMiniEqualizer />
          <span>{listenerCount}</span>
        </span>
        <div className="w-8 h-8 rounded-full bg-[#F1EFEA] dark:bg-[#1C1C22] text-[#63636B] dark:text-[#8E8E98] group-hover:bg-[#111113] dark:hover:bg-white dark:hover:text-[#0B0B0D] group-hover:text-white flex items-center justify-center transition">
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
  const [mapRadiusKm, setMapRadiusKm] = useState<number>(ALL_TURKEY_RADIUS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodTunerId>('all');
  const [artistArtworkMap, setArtistArtworkMap] = useState<Record<string, string>>({});

  // Progressive load state for performance
  const [visibleArtistsCount, setVisibleArtistsCount] = useState<number>(8);
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

      const check = isMusicArtistOrChannel(trimmed, allUserTracks);
      if (!check.isMusic) {
        continue;
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
  }, [favoriteArtists, allUserTracks, personalTaste, artistArtworkMap]);

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

  // Search & Mood Filter for Artist Rooms
  const filteredArtistRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return artistRooms.filter((r) => {
      const matchSearch =
        q === '' ||
        r.artist.toLowerCase().includes(q) ||
        r.topSongTitle.toLowerCase().includes(q) ||
        r.genre.toLowerCase().includes(q);

      const matchMood =
        selectedMood === 'all' || r.moodTags.includes(selectedMood);

      return matchSearch && matchMood;
    });
  }, [artistRooms, searchQuery, selectedMood]);

  // Search & Mood Filter for Song Rooms
  const filteredSongRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return songRooms.filter((s) => {
      const matchSearch =
        q === '' ||
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q);

      const songMoods = inferMoodTags(s.artist, s.genre);
      const matchMood =
        selectedMood === 'all' || songMoods.includes(selectedMood);

      return matchSearch && matchMood;
    });
  }, [songRooms, searchQuery, selectedMood]);

  const handleEnterArtistRoom = (room: ArtistRoomInfo) => {
    triggerHaptic(15);
    if (onStartArtistRadio) {
      onStartArtistRadio(room.artist);
    } else {
      onSelectRoom(room.songObj);
    }
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
          className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#F1EFEA] dark:bg-[#141418] border border-[#E2DFD9] dark:border-white/[0.08] w-full sm:w-auto sm:min-w-[290px]"
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
                ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-[#F5F5F7] border border-[#111113]/15 dark:border-white/15'
                : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] border border-transparent'
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
                ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-[#F5F5F7] border border-[#111113]/15 dark:border-white/15'
                : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] border border-transparent'
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
          <RadiusSlider
            radiusKm={mapRadiusKm}
            onChangeRadiusKm={setMapRadiusKm}
            listenerCount={
              mapRadiusKm >= ALL_TURKEY_RADIUS
                ? users.length
                : users.filter((u) => u.distanceKm <= mapRadiusKm).length
            }
            themeMode={themeMode}
          />

          <ProximityDensityMap
            users={users}
            radiusKm={mapRadiusKm}
            onChangeRadiusKm={setMapRadiusKm}
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

      {/* LENS 1: CANLI ODALAR (Subtraction-First: 2 Clean Control Rows -> Immediate Rooms) */}
      {exploreLens === 'rooms' && (
        <div className="space-y-4">
          {/* Row 2: Single Search Input + Single Row of 4 Mood/Genre Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="relative flex-1 min-w-0">
              <Search
                className="w-4 h-4 text-[#63636B] dark:text-[#8E8E98] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sanatçı veya şarkı odası ara..."
                className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] focus:border-[#111113]/30 dark:border-white/30 rounded-xl text-xs text-[#111113] dark:text-[#F5F5F7] placeholder:text-[#63636B] dark:placeholder:text-[#8E8E98] focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] cursor-pointer"
                  aria-label="Temizle"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
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
                    className={`px-3 py-2 text-xs font-semibold rounded-xl transition whitespace-nowrap shrink-0 cursor-pointer border active:scale-95 ${
                      isSelected
                        ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-[#F5F5F7] border-[#111113]/15 dark:border-white/15'
                        : 'bg-white dark:bg-[#141418] text-[#63636B] dark:text-[#8E8E98] border-[#E6E4DF] dark:border-white/[0.08] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
                    }`}
                  >
                    {mood.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compact Single-Line Personal Frequency Strip */}
          {onStartPersonalRadio && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(18);
                onStartPersonalRadio();
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#141418] hover:bg-[#FAF9F6] dark:hover:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.08] flex items-center justify-between gap-3 transition active:scale-[0.99] cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="studio-btn-primary w-7 h-7 rounded-lg bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] flex items-center justify-center shrink-0 shadow-sm">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" strokeWidth={1.85} />
                </span>
                <span className="text-xs font-bold text-[#111113] dark:text-[#F5F5F7] truncate">
                  Kişisel Frekansına Gir
                </span>
                <span className="hidden sm:inline text-xs text-[#63636B] dark:text-[#8E8E98] truncate">
                  ·{' '}
                  {favoriteArtists.length > 0
                    ? favoriteArtists
                        .filter((a) => !NON_ARTIST_BLACKLIST.test(a))
                        .slice(0, 2)
                        .join(', ')
                    : 'Zevkine özel canlı akış'}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#63636B] dark:text-[#8E8E98] group-hover:text-[#111113] dark:text-[#F5F5F7] transition shrink-0" />
            </button>
          )}

          {/* Direct Section 1: Aktif Şarkı Odaları */}
          <section className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#63636B] dark:text-[#8E8E98]">
              <span className="font-bold text-[#111113] dark:text-[#F5F5F7]">
                Aktif Şarkı Odaları
              </span>
              <span className="font-mono tabular-nums text-[11px]">
                {Math.min(allModeSongLimit, filteredSongRooms.length)} / {filteredSongRooms.length}
              </span>
            </div>

            {filteredSongRooms.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#63636B] dark:text-[#8E8E98]">
                Aramanıza uygun şarkı odası bulunamadı.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                {filteredSongRooms.slice(0, allModeSongLimit).map((song, index) => {
                  const isCurrent = Boolean(currentSong && song.id === currentSong.id);
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
                  className="w-full py-2.5 rounded-xl bg-white dark:bg-[#141418] hover:bg-[#F1EFEA] dark:hover:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.08] text-xs font-semibold text-[#111113] dark:text-[#F5F5F7] transition cursor-pointer"
                >
                  Daha Fazla Oda Göster (+{filteredSongRooms.length - allModeSongLimit})
                </button>
              </div>
            )}
          </section>

          {/* Direct Section 2: Sanatçı Frekansları */}
          <section className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#111113] dark:text-[#F5F5F7]">
                  Sanatçı Frekansları
                </span>
                <span className="text-[#63636B] dark:text-[#8E8E98] font-mono tabular-nums">
                  ({filteredArtistRooms.length})
                </span>
              </div>
              {filteredArtistRooms.length > visibleArtistsCount && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    setVisibleArtistsCount((prev) => prev + 12);
                  }}
                  className="text-[#111113] dark:text-[#F5F5F7] hover:underline font-semibold text-xs transition cursor-pointer"
                >
                  Daha Fazla (+{filteredArtistRooms.length - visibleArtistsCount})
                </button>
              )}
            </div>

            {filteredArtistRooms.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#63636B] dark:text-[#8E8E98]">
                Aramanıza uygun müzik sanatçısı bulunamadı.
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-0.5 scroll-smooth pr-6 [mask-image:linear-gradient(to_right,black_88%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_88%,transparent_100%)] lg:grid lg:grid-cols-3 xl:grid-cols-4 lg:overflow-visible lg:pr-0 lg:[mask-image:none] lg:[-webkit-mask-image:none]">
                {filteredArtistRooms.slice(0, visibleArtistsCount).map((room) => {
                  const isCurrentArtist = Boolean(
                    currentSong && currentSong.artist.toLowerCase() === room.artist.toLowerCase()
                  );
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
        </div>
      )}
    </div>
  );
};
