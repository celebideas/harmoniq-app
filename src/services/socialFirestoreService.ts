import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  serverTimestamp,
  increment,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  ChatMessage,
  FriendStatus,
  LoungeConversation,
  LoungeUser,
  PrivacyMode,
  Song,
} from '../types';

export interface PublicProfileDoc {
  uid: string;
  displayName: string;
  handle: string;
  avatarUrl?: string;
  avatarSeed: string;
  avatarGradient: string;
  city: string;
  bio: string;
  topGenres: string[];
  currentSongId: string;
  currentSongTitle: string;
  currentSongArtist: string;
  currentSecond: number;
  statusBubble?: string;
  trustScore: number;
  isDiscoverable: boolean;
  isOnline: boolean;
  lastSeenAt: unknown;
  lastSeenAtMs: number;
}

export interface CloudFriendRequest {
  pairId: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  fromAvatarUrl?: string;
  fromAvatarSeed: string;
  fromAvatarGradient: string;
  fromCity: string;
  songContext: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: unknown;
  updatedAt: unknown;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface CloudFriendship {
  pairId: string;
  uidA: string;
  uidB: string;
  acceptedBy: string;
  createdAt: unknown;
  createdAtMs: number;
}

export interface CloudParticipantSummary {
  uid: string;
  name: string;
  avatarUrl?: string;
  avatarSeed: string;
  avatarGradient: string;
  city: string;
}

export interface CloudConversationDoc {
  pairId: string;
  uidA: string;
  uidB: string;
  participantA: CloudParticipantSummary;
  participantB: CloudParticipantSummary;
  matchedTrackId: string;
  matchedTrackTitle: string;
  matchedTrackArtist: string;
  matchedTrackCoverUrl?: string;
  matchedTrackCoverGradient: string;
  matchedTrackDuration: number;
  matchedSecond: number;
  lastMessage: string;
  lastMessageAt: unknown;
  lastMessageAtMs: number;
  lastSenderId: string;
  unreadCountA: number;
  unreadCountB: number;
}

export function sortPair(uid1: string, uid2: string): [string, string] {
  return uid1 < uid2 ? [uid1, uid2] : [uid2, uid1];
}

export function getPairId(uid1: string, uid2: string): string {
  const [a, b] = sortPair(uid1, uid2);
  return `${a}_${b}`;
}

function clampStr(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const s = (val ?? '').trim();
  if (!s) return fallback.slice(0, maxLen);
  return s.slice(0, maxLen);
}

function clampNum(val: number | undefined | null, min: number, max: number, fallback = 0): number {
  const n = typeof val === 'number' && Number.isFinite(val) ? Math.round(val) : fallback;
  return Math.max(min, Math.min(max, n));
}

function tsToMs(ts: unknown): number {
  if (!ts) return Date.now();
  if (ts instanceof Timestamp) return ts.toMillis();
  if (typeof (ts as { toMillis?: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  if (typeof ts === 'number') return ts;
  return Date.now();
}

export function formatCloudTimestamp(ts: unknown): string {
  const ms = tsToMs(ts);
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 45) return 'Şimdi';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa`;
  const d = new Date(ms);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}`;
}

function formatClockTurkishTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function cleanHandle(rawHandle: string | undefined, fallbackName: string): string {
  const base = (rawHandle || fallbackName || 'dinleyici')
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._-]/g, '');
  return `@${base || 'dinleyici'}`.slice(0, 40);
}

function buildParticipantSummary(p: {
  uid: string;
  name: string;
  avatarUrl?: string;
  avatarSeed?: string;
  avatarGradient?: string;
  city?: string;
}): CloudParticipantSummary {
  const name = clampStr(p.name, 60, 'Müzik Kaşifi');
  const seed = clampStr(
    p.avatarSeed ||
      name
        .split(' ')
        .map((s) => s[0])
        .join('')
        .toUpperCase(),
    4,
    'MK'
  );
  const summary: CloudParticipantSummary = {
    uid: p.uid,
    name,
    avatarSeed: seed,
    avatarGradient: clampStr(p.avatarGradient, 120, 'from-emerald-500 to-teal-700'),
    city: clampStr(p.city, 80, 'İstanbul, Kadıköy'),
  };
  const url = clampStr(p.avatarUrl, 500, '');
  if (url) summary.avatarUrl = url;
  return summary;
}

export function publicProfileToLoungeUser(
  p: PublicProfileDoc,
  friendStatus: FriendStatus = 'none',
  friendDirection?: 'incoming' | 'outgoing'
): LoungeUser {
  const now = Date.now();
  const effectiveStatus: FriendStatus =
    friendStatus === 'pending' && friendDirection === 'incoming'
      ? 'pending_received'
      : friendStatus;

  const isFreshOnline = p.isOnline && now - p.lastSeenAtMs < 120000;
  const trackSong: Song | undefined = p.currentSongTitle
    ? {
        id: p.currentSongId || `cloud-${p.uid}`,
        title: p.currentSongTitle,
        artist: p.currentSongArtist || 'Sanatçı',
        album: 'Harmoniq Canlı',
        genre: p.topGenres[0] || 'Müzik',
        rawMediaTitle: `${p.currentSongArtist} - ${p.currentSongTitle}`,
        coverGradient: 'from-purple-700 to-zinc-950',
        durationSeconds: 240,
        bpm: 118,
        keyNote: 'Am',
        catalogNumber: 'LIVE',
        releaseYear: new Date().getFullYear(),
        soundType: 'rock',
        timelineMarkers: [],
      }
    : undefined;

  return {
    id: p.uid,
    uid: p.uid,
    name: p.displayName,
    handle: p.handle,
    age: 24,
    city: p.city,
    avatarSeed: p.avatarSeed,
    avatarGradient: p.avatarGradient,
    avatarUrl: p.avatarUrl,
    platform: 'youtube_music',
    currentSecond: p.currentSecond,
    statusBubble: p.statusBubble,
    topArtists: p.topGenres.length > 0 ? p.topGenres : [p.currentSongArtist || 'Rock'],
    topGenres: p.topGenres,
    bio: p.bio,
    trustScore: p.trustScore || 98,
    lastHeartbeatAgoSeconds: Math.max(0, Math.floor((now - p.lastSeenAtMs) / 1000)),
    isOnline: isFreshOnline,
    distanceKm: 1.2,
    privacyMode: p.isDiscoverable ? 'public' : 'private',
    friendStatus: effectiveStatus,
    friendDirection,
    compatibilityScore: 95,
    currentSong: trackSong,
    isRealUser: true,
  };
}

export function cloudConversationToLoungeConversation(
  c: CloudConversationDoc,
  myUid: string,
  profileMap: Map<string, PublicProfileDoc>,
  friendUidSet: Set<string>,
  messages: ChatMessage[]
): LoungeConversation {
  const iAmA = c.uidA === myUid;
  const otherSummary = iAmA ? c.participantB : c.participantA;
  const liveProfile = profileMap.get(otherSummary.uid);
  const friendStatus: FriendStatus = friendUidSet.has(otherSummary.uid) ? 'friends' : 'none';

  const otherUser: LoungeUser = liveProfile
    ? publicProfileToLoungeUser(liveProfile, friendStatus)
    : {
        id: otherSummary.uid,
        uid: otherSummary.uid,
        name: otherSummary.name,
        age: 24,
        city: otherSummary.city,
        avatarSeed: otherSummary.avatarSeed,
        avatarGradient: otherSummary.avatarGradient,
        avatarUrl: otherSummary.avatarUrl,
        platform: 'youtube_music',
        currentSecond: c.matchedSecond,
        topArtists: [c.matchedTrackArtist],
        bio: 'Harmoniq üyesi',
        trustScore: 98,
        lastHeartbeatAgoSeconds: 30,
        isOnline: false,
        distanceKm: 1.5,
        friendStatus,
        isRealUser: true,
      };

  const matchedTrack: Song = {
    id: c.matchedTrackId || `track-${c.pairId}`,
    title: c.matchedTrackTitle,
    artist: c.matchedTrackArtist,
    album: 'Ortak Frekans',
    genre: 'Müzik',
    rawMediaTitle: `${c.matchedTrackArtist} - ${c.matchedTrackTitle}`,
    coverGradient: c.matchedTrackCoverGradient || 'from-zinc-800 to-zinc-950',
    coverUrl: c.matchedTrackCoverUrl,
    durationSeconds: c.matchedTrackDuration || 240,
    bpm: 118,
    keyNote: 'Am',
    catalogNumber: 'CLD',
    releaseYear: new Date().getFullYear(),
    soundType: 'rock',
    timelineMarkers: [],
  };

  return {
    matchId: c.pairId,
    user: otherUser,
    matchedTrack,
    matchedSecond: c.matchedSecond,
    matchedPlatform: 'youtube_music',
    contextBanner: `${c.matchedTrackArtist} - ${c.matchedTrackTitle}`,
    lastMessage: c.lastMessage,
    lastMessageTime: formatCloudTimestamp(c.lastMessageAt),
    unreadCount: iAmA ? c.unreadCountA : c.unreadCountB,
    messages,
    isCloudConversation: true,
    cloudPairId: c.pairId,
    cloudUidA: c.uidA,
    cloudUidB: c.uidB,
  };
}

export async function syncUserProfileToFirestore(params: {
  firebaseUser: User;
  displayName: string;
  handle?: string;
  avatarUrl?: string;
  avatarSeed?: string;
  avatarGradient?: string;
  city: string;
  bio: string;
  topGenres: string[];
  currentSong: Song;
  currentSecond: number;
  statusBubble?: string;
  privacyMode: PrivacyMode;
}): Promise<void> {
  const user = params.firebaseUser;
  const uid = user.uid;
  const profilePath = `publicProfiles/${uid}`;
  const privatePath = `users/${uid}/private/account`;

  const displayName = clampStr(params.displayName || user.displayName, 60, 'Müzik Kaşifi');
  const handle = cleanHandle(params.handle || user.email?.split('@')[0], displayName);
  const avatarUrl = clampStr(params.avatarUrl || user.photoURL || '', 500, '');
  const avatarSeed = clampStr(
    params.avatarSeed ||
      displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase(),
    4,
    'MK'
  );
  const avatarGradient = clampStr(params.avatarGradient, 120, 'from-purple-600 to-emerald-600');
  const city = clampStr(params.city, 80, 'İstanbul, Kadıköy');
  const bio = clampStr(params.bio, 240, 'Müzik ruhun gerçek frekansıdır.');
  const topGenres = (params.topGenres || [])
    .map((g) => clampStr(g, 40))
    .filter(Boolean)
    .slice(0, 6);
  const statusBubble = clampStr(params.statusBubble, 160, '');
  const isDiscoverable = params.privacyMode !== 'private';

  try {
    const profileRef = doc(db, 'publicProfiles', uid);
    const existingSnap = await getDoc(profileRef);

    const editableFields: Record<string, unknown> = {
      displayName,
      handle,
      avatarSeed,
      avatarGradient,
      city,
      bio,
      topGenres,
      currentSongId: clampStr(params.currentSong.id, 128, 'song-duman'),
      currentSongTitle: clampStr(params.currentSong.title, 140, 'Kırmış Kalbini'),
      currentSongArtist: clampStr(params.currentSong.artist, 140, 'Duman'),
      currentSecond: clampNum(params.currentSecond, 0, 7200, 0),
      isDiscoverable,
      isOnline: true,
      lastSeenAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (avatarUrl) editableFields.avatarUrl = avatarUrl;
    if (statusBubble) editableFields.statusBubble = statusBubble;

    if (existingSnap.exists()) {
      await updateDoc(profileRef, editableFields);
    } else {
      await setDoc(profileRef, {
        uid,
        trustScore: 98,
        ...editableFields,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, profilePath);
  }

  try {
    const privateRef = doc(db, 'users', uid, 'private', 'account');
    const existingPrivate = await getDoc(privateRef);
    const email = clampStr(user.email || '', 160, '');

    if (existingPrivate.exists()) {
      await updateDoc(privateRef, {
        email,
        privacyMode: params.privacyMode,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(privateRef, {
        uid,
        email,
        privacyMode: params.privacyMode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }
}

export async function updateLiveListeningPresence(params: {
  uid: string;
  currentSong: Song;
  currentSecond: number;
  statusBubble?: string;
  isOnline?: boolean;
}): Promise<void> {
  try {
    const profileRef = doc(db, 'publicProfiles', params.uid);
    const payload: Record<string, unknown> = {
      currentSongId: clampStr(params.currentSong.id, 128, 'song-duman'),
      currentSongTitle: clampStr(params.currentSong.title, 140, 'Kırmış Kalbini'),
      currentSongArtist: clampStr(params.currentSong.artist, 140, 'Duman'),
      currentSecond: clampNum(params.currentSecond, 0, 7200, 0),
      isOnline: params.isOnline !== false,
      lastSeenAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const bubble = clampStr(params.statusBubble, 160, '');
    if (bubble) payload.statusBubble = bubble;
    await updateDoc(profileRef, payload);
  } catch {
    // Heartbeat failures are non-fatal
  }
}

export async function markProfileOffline(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'publicProfiles', uid), {
      isOnline: false,
      lastSeenAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal on sign-out
  }
}

export function subscribeDiscoverableProfiles(
  myUid: string,
  onUpdate: (profiles: PublicProfileDoc[]) => void
): Unsubscribe {
  const q = query(collection(db, 'publicProfiles'), where('isDiscoverable', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: PublicProfileDoc[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        if (!d || d.uid === myUid) return;
        list.push({
          uid: d.uid,
          displayName: d.displayName || 'Müzik Kaşifi',
          handle: d.handle || '@dinleyici',
          avatarUrl: d.avatarUrl || undefined,
          avatarSeed: d.avatarSeed || 'MK',
          avatarGradient: d.avatarGradient || 'from-purple-600 to-emerald-600',
          city: d.city || 'İstanbul',
          bio: d.bio || 'Harmoniq dinleyicisi',
          topGenres: Array.isArray(d.topGenres) ? d.topGenres : [],
          currentSongId: d.currentSongId || '',
          currentSongTitle: d.currentSongTitle || '',
          currentSongArtist: d.currentSongArtist || '',
          currentSecond: typeof d.currentSecond === 'number' ? d.currentSecond : 0,
          statusBubble: d.statusBubble || undefined,
          trustScore: typeof d.trustScore === 'number' ? d.trustScore : 98,
          isDiscoverable: Boolean(d.isDiscoverable),
          isOnline: Boolean(d.isOnline),
          lastSeenAt: d.lastSeenAt,
          lastSeenAtMs: tsToMs(d.lastSeenAt),
        });
      });
      list.sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs);
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'publicProfiles')
  );
}

export function subscribeFriendRequests(
  myUid: string,
  onUpdate: (res: { incoming: CloudFriendRequest[]; outgoing: CloudFriendRequest[] }) => void
): Unsubscribe {
  let incomingList: CloudFriendRequest[] = [];
  let outgoingList: CloudFriendRequest[] = [];

  const emit = () => {
    onUpdate({
      incoming: [...incomingList].sort((a, b) => b.updatedAtMs - a.updatedAtMs),
      outgoing: [...outgoingList].sort((a, b) => b.updatedAtMs - a.updatedAtMs),
    });
  };

  const mapDoc = (id: string, d: Record<string, unknown>): CloudFriendRequest => ({
    pairId: id,
    fromUid: String(d.fromUid || ''),
    toUid: String(d.toUid || ''),
    fromName: String(d.fromName || 'Dinleyici'),
    fromAvatarUrl: d.fromAvatarUrl ? String(d.fromAvatarUrl) : undefined,
    fromAvatarSeed: String(d.fromAvatarSeed || 'MK'),
    fromAvatarGradient: String(d.fromAvatarGradient || 'from-purple-600 to-emerald-600'),
    fromCity: String(d.fromCity || 'İstanbul'),
    songContext: String(d.songContext || ''),
    status: (d.status as 'pending' | 'accepted' | 'declined') || 'pending',
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    createdAtMs: tsToMs(d.createdAt),
    updatedAtMs: tsToMs(d.updatedAt),
  });

  const qIn = query(collection(db, 'friendRequests'), where('toUid', '==', myUid));
  const qOut = query(collection(db, 'friendRequests'), where('fromUid', '==', myUid));

  const unsubIn = onSnapshot(
    qIn,
    (snap) => {
      incomingList = [];
      snap.forEach((docSnap) => {
        const mapped = mapDoc(docSnap.id, docSnap.data());
        if (mapped.status === 'pending') incomingList.push(mapped);
      });
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'friendRequests')
  );

  const unsubOut = onSnapshot(
    qOut,
    (snap) => {
      outgoingList = [];
      snap.forEach((docSnap) => {
        const mapped = mapDoc(docSnap.id, docSnap.data());
        if (mapped.status === 'pending') outgoingList.push(mapped);
      });
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'friendRequests')
  );

  return () => {
    unsubIn();
    unsubOut();
  };
}

export function subscribeFriendships(
  myUid: string,
  onUpdate: (friendships: CloudFriendship[]) => void
): Unsubscribe {
  const mapA = new Map<string, CloudFriendship>();
  const mapB = new Map<string, CloudFriendship>();

  const emit = () => {
    const merged = new Map<string, CloudFriendship>();
    mapA.forEach((v, k) => merged.set(k, v));
    mapB.forEach((v, k) => merged.set(k, v));
    onUpdate(Array.from(merged.values()).sort((a, b) => b.createdAtMs - a.createdAtMs));
  };

  const mapDoc = (id: string, d: Record<string, unknown>): CloudFriendship => ({
    pairId: id,
    uidA: String(d.uidA || ''),
    uidB: String(d.uidB || ''),
    acceptedBy: String(d.acceptedBy || ''),
    createdAt: d.createdAt,
    createdAtMs: tsToMs(d.createdAt),
  });

  const qA = query(collection(db, 'friendships'), where('uidA', '==', myUid));
  const qB = query(collection(db, 'friendships'), where('uidB', '==', myUid));

  const unsubA = onSnapshot(
    qA,
    (snap) => {
      mapA.clear();
      snap.forEach((docSnap) => mapA.set(docSnap.id, mapDoc(docSnap.id, docSnap.data())));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'friendships')
  );

  const unsubB = onSnapshot(
    qB,
    (snap) => {
      mapB.clear();
      snap.forEach((docSnap) => mapB.set(docSnap.id, mapDoc(docSnap.id, docSnap.data())));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'friendships')
  );

  return () => {
    unsubA();
    unsubB();
  };
}

export function subscribeConversations(
  myUid: string,
  onUpdate: (conversations: CloudConversationDoc[]) => void
): Unsubscribe {
  const mapA = new Map<string, CloudConversationDoc>();
  const mapB = new Map<string, CloudConversationDoc>();

  const emit = () => {
    const merged = new Map<string, CloudConversationDoc>();
    mapA.forEach((v, k) => merged.set(k, v));
    mapB.forEach((v, k) => merged.set(k, v));
    onUpdate(Array.from(merged.values()).sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs));
  };

  const mapDoc = (id: string, d: Record<string, unknown>): CloudConversationDoc => ({
    pairId: id,
    uidA: String(d.uidA || ''),
    uidB: String(d.uidB || ''),
    participantA: d.participantA as CloudParticipantSummary,
    participantB: d.participantB as CloudParticipantSummary,
    matchedTrackId: String(d.matchedTrackId || ''),
    matchedTrackTitle: String(d.matchedTrackTitle || 'Kırmış Kalbini'),
    matchedTrackArtist: String(d.matchedTrackArtist || 'Duman'),
    matchedTrackCoverUrl: d.matchedTrackCoverUrl ? String(d.matchedTrackCoverUrl) : undefined,
    matchedTrackCoverGradient: String(d.matchedTrackCoverGradient || 'from-zinc-800 to-zinc-950'),
    matchedTrackDuration: typeof d.matchedTrackDuration === 'number' ? d.matchedTrackDuration : 240,
    matchedSecond: typeof d.matchedSecond === 'number' ? d.matchedSecond : 0,
    lastMessage: String(d.lastMessage || ''),
    lastMessageAt: d.lastMessageAt,
    lastMessageAtMs: tsToMs(d.lastMessageAt),
    lastSenderId: String(d.lastSenderId || ''),
    unreadCountA: typeof d.unreadCountA === 'number' ? d.unreadCountA : 0,
    unreadCountB: typeof d.unreadCountB === 'number' ? d.unreadCountB : 0,
  });

  const qA = query(collection(db, 'conversations'), where('uidA', '==', myUid));
  const qB = query(collection(db, 'conversations'), where('uidB', '==', myUid));

  const unsubA = onSnapshot(
    qA,
    (snap) => {
      mapA.clear();
      snap.forEach((docSnap) => mapA.set(docSnap.id, mapDoc(docSnap.id, docSnap.data())));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'conversations')
  );

  const unsubB = onSnapshot(
    qB,
    (snap) => {
      mapB.clear();
      snap.forEach((docSnap) => mapB.set(docSnap.id, mapDoc(docSnap.id, docSnap.data())));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'conversations')
  );

  return () => {
    unsubA();
    unsubB();
  };
}

export function subscribeConversationMessages(
  pairId: string,
  uidA: string,
  _uidB: string,
  myUid: string,
  onUpdate: (messages: ChatMessage[]) => void
): Unsubscribe {
  const path = `conversations/${pairId}/messages`;
  const filterField = myUid === uidA ? 'uidA' : 'uidB';
  const q = query(collection(db, 'conversations', pairId, 'messages'), where(filterField, '==', myUid));

  return onSnapshot(
    q,
    (snap) => {
      const items: { createdAtMs: number; msg: ChatMessage }[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const createdAtMs = tsToMs(d.createdAt);
        let sharedSong: Song | undefined;
        if (d.sharedSongTitle) {
          sharedSong = {
            id: String(d.sharedSongId || `shared-${docSnap.id}`),
            title: String(d.sharedSongTitle),
            artist: String(d.sharedSongArtist || 'Sanatçı'),
            album: 'Paylaşılan Parça',
            genre: 'Müzik',
            rawMediaTitle: `${d.sharedSongArtist || ''} - ${d.sharedSongTitle}`,
            coverGradient: String(d.sharedSongCoverGradient || 'from-zinc-800 to-zinc-950'),
            coverUrl: d.sharedSongCoverUrl ? String(d.sharedSongCoverUrl) : undefined,
            durationSeconds: typeof d.sharedSongDuration === 'number' ? d.sharedSongDuration : 220,
            bpm: 118,
            keyNote: 'Am',
            catalogNumber: 'CLD-01',
            releaseYear: new Date().getFullYear(),
            soundType: 'rock',
            timelineMarkers: [],
            audioUrl: d.sharedSongAudioUrl ? String(d.sharedSongAudioUrl) : undefined,
            youtubeVideoId: d.sharedSongYoutubeId ? String(d.sharedSongYoutubeId) : undefined,
          };
        }

        items.push({
          createdAtMs,
          msg: {
            id: docSnap.id,
            senderId: d.senderId === myUid ? 'me' : String(d.senderId),
            text: String(d.text || ''),
            timestamp: formatClockTurkishTime(createdAtMs),
            isIcebreaker: Boolean(d.isIcebreaker),
            sharedTimestampSecond:
              typeof d.sharedTimestampSecond === 'number' ? d.sharedTimestampSecond : undefined,
            sharedSong,
          },
        });
      });

      items.sort((a, b) => a.createdAtMs - b.createdAtMs);
      onUpdate(items.map((i) => i.msg));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function sendCloudFriendRequest(params: {
  myUid: string;
  myName: string;
  myAvatarUrl?: string;
  myAvatarSeed: string;
  myAvatarGradient: string;
  myCity: string;
  targetUid: string;
  songContext: string;
}): Promise<void> {
  const pairId = getPairId(params.myUid, params.targetUid);
  const path = `friendRequests/${pairId}`;
  try {
    const reqRef = doc(db, 'friendRequests', pairId);
    const existing = await getDoc(reqRef);
    if (existing.exists()) {
      const data = existing.data();
      if (data.status === 'pending' || data.status === 'accepted') return;
      await deleteDoc(reqRef);
    }

    const payload: Record<string, unknown> = {
      fromUid: params.myUid,
      toUid: params.targetUid,
      fromName: clampStr(params.myName, 60, 'Müzik Kaşifi'),
      fromAvatarSeed: clampStr(params.myAvatarSeed, 4, 'MK'),
      fromAvatarGradient: clampStr(params.myAvatarGradient, 120, 'from-purple-600 to-emerald-600'),
      fromCity: clampStr(params.myCity, 80, 'İstanbul, Kadıköy'),
      songContext: clampStr(params.songContext, 160, 'Harmoniq Frekansı'),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const url = clampStr(params.myAvatarUrl, 500, '');
    if (url) payload.fromAvatarUrl = url;

    await setDoc(reqRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function acceptCloudFriendRequest(
  pairId: string,
  fromUid: string,
  myUid: string
): Promise<void> {
  const reqPath = `friendRequests/${pairId}`;
  try {
    const [uidA, uidB] = sortPair(fromUid, myUid);
    const batch = writeBatch(db);
    batch.update(doc(db, 'friendRequests', pairId), {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'friendships', pairId), {
      uidA,
      uidB,
      acceptedBy: myUid,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, reqPath);
  }
}

export async function declineCloudFriendRequest(pairId: string): Promise<void> {
  const path = `friendRequests/${pairId}`;
  try {
    await updateDoc(doc(db, 'friendRequests', pairId), {
      status: 'declined',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function cancelCloudFriendRequest(pairId: string): Promise<void> {
  const path = `friendRequests/${pairId}`;
  try {
    await deleteDoc(doc(db, 'friendRequests', pairId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function removeCloudFriendship(pairId: string): Promise<void> {
  const path = `friendships/${pairId}`;
  try {
    await deleteDoc(doc(db, 'friendships', pairId));
    try {
      await deleteDoc(doc(db, 'friendRequests', pairId));
    } catch {
      // ignore if already absent
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function sendOrStartCloudMessage(params: {
  myUid: string;
  myName: string;
  myAvatarUrl?: string;
  myAvatarSeed: string;
  myAvatarGradient: string;
  myCity: string;
  targetUser: LoungeUser;
  text: string;
  currentSong: Song;
  currentSecond: number;
  isIcebreaker?: boolean;
  sharedSong?: Song;
  sharedTimestampSecond?: number;
}): Promise<string> {
  const targetUid = params.targetUser.uid || params.targetUser.id;
  const [uidA, uidB] = sortPair(params.myUid, targetUid);
  const pairId = `${uidA}_${uidB}`;
  const convPath = `conversations/${pairId}`;
  const cleanText = clampStr(params.text, 1000, 'Selam!');
  const previewText = clampStr(
    params.sharedSong
      ? `🎵 ${params.sharedSong.title}${
          params.sharedTimestampSecond !== undefined
            ? ` (${Math.floor(params.sharedTimestampSecond / 60)}:${Math.floor(
                params.sharedTimestampSecond % 60
              )
                .toString()
                .padStart(2, '0')})`
            : ''
        }`
      : cleanText,
    500,
    cleanText
  );

  try {
    const convRef = doc(db, 'conversations', pairId);
    const convSnap = await getDoc(convRef);
    const batch = writeBatch(db);
    const iAmA = params.myUid === uidA;

    if (!convSnap.exists()) {
      const meSummary = buildParticipantSummary({
        uid: params.myUid,
        name: params.myName,
        avatarUrl: params.myAvatarUrl,
        avatarSeed: params.myAvatarSeed,
        avatarGradient: params.myAvatarGradient,
        city: params.myCity,
      });
      const otherSummary = buildParticipantSummary({
        uid: targetUid,
        name: params.targetUser.name,
        avatarUrl: params.targetUser.avatarUrl,
        avatarSeed: params.targetUser.avatarSeed,
        avatarGradient: params.targetUser.avatarGradient,
        city: params.targetUser.city,
      });
      const convPayload: Record<string, unknown> = {
        uidA,
        uidB,
        participantA: iAmA ? meSummary : otherSummary,
        participantB: iAmA ? otherSummary : meSummary,
        matchedTrackId: clampStr(params.currentSong.id, 128, 'song-duman'),
        matchedTrackTitle: clampStr(params.currentSong.title, 140, 'Kırmış Kalbini'),
        matchedTrackArtist: clampStr(params.currentSong.artist, 140, 'Duman'),
        matchedTrackCoverGradient: clampStr(
          params.currentSong.coverGradient,
          120,
          'from-zinc-800 to-zinc-950'
        ),
        matchedTrackDuration: clampNum(params.currentSong.durationSeconds, 0, 7200, 240),
        matchedSecond: clampNum(params.currentSecond, 0, 7200, 0),
        lastMessage: previewText,
        lastMessageAt: serverTimestamp(),
        lastSenderId: params.myUid,
        unreadCountA: iAmA ? 0 : 1,
        unreadCountB: iAmA ? 1 : 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const coverUrl = clampStr(params.currentSong.coverUrl, 500, '');
      if (coverUrl) convPayload.matchedTrackCoverUrl = coverUrl;
      batch.set(convRef, convPayload);
    } else {
      batch.update(convRef, {
        lastMessage: previewText,
        lastMessageAt: serverTimestamp(),
        lastSenderId: params.myUid,
        unreadCountA: iAmA ? 0 : increment(1),
        unreadCountB: iAmA ? increment(1) : 0,
        updatedAt: serverTimestamp(),
      });
    }

    const msgRef = doc(collection(db, 'conversations', pairId, 'messages'));
    const msgPayload: Record<string, unknown> = {
      uidA,
      uidB,
      senderId: params.myUid,
      text: cleanText,
      isIcebreaker: Boolean(params.isIcebreaker),
      createdAt: serverTimestamp(),
    };

    if (params.sharedSong) {
      msgPayload.sharedSongId = clampStr(params.sharedSong.id, 128, 'song');
      msgPayload.sharedSongTitle = clampStr(params.sharedSong.title, 140, 'Şarkı');
      msgPayload.sharedSongArtist = clampStr(params.sharedSong.artist, 140, 'Sanatçı');
      msgPayload.sharedSongCoverGradient = clampStr(
        params.sharedSong.coverGradient,
        120,
        'from-zinc-800 to-zinc-950'
      );
      msgPayload.sharedSongDuration = clampNum(params.sharedSong.durationSeconds, 0, 7200, 220);
      const sCover = clampStr(params.sharedSong.coverUrl, 500, '');
      if (sCover) msgPayload.sharedSongCoverUrl = sCover;
      const sAudio = clampStr(params.sharedSong.audioUrl, 500, '');
      if (sAudio) msgPayload.sharedSongAudioUrl = sAudio;
      const sYt = clampStr(params.sharedSong.youtubeVideoId, 32, '');
      if (sYt) msgPayload.sharedSongYoutubeId = sYt;
      if (params.sharedTimestampSecond !== undefined) {
        msgPayload.sharedTimestampSecond = clampNum(params.sharedTimestampSecond, 0, 7200, 0);
      }
    }

    batch.set(msgRef, msgPayload);
    await batch.commit();
    return pairId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, convPath);
  }
}

export async function markCloudConversationRead(
  pairId: string,
  uidA: string,
  myUid: string
): Promise<void> {
  try {
    const field = myUid === uidA ? 'unreadCountA' : 'unreadCountB';
    await updateDoc(doc(db, 'conversations', pairId), {
      [field]: 0,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal if offline
  }
}
