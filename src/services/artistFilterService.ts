import { Song, SubscribedChannelDetail, UserPlaylist } from '../types';
import { SAMPLE_SONGS } from '../data/mockData';

// Strict expanded blacklist matching non-music educational, science, news, vlog, tech, comedy, gaming & corporate channels
export const NON_ARTIST_BLACKLIST =
  /akademik|akademiklink|evrim|bilim|tarih|felsefe|eğitim|egitim|ders|okul|hoca|prof|doktor|finans|ekonomi|haber|siyaset|spor|futbol|yemek|tarif|gezi|seyahat|komedi|standup|podcast|vlog|oyun|gaming|tech|teknoloji|inceleme|donanım|donanim|google|samsung|lg\b|apple|xiaomi|huawei|red\s*bull|magazine|uproxx|miksteyp|mixtape|bass\s*boost|cubevision|türkiye|turkey|tv\b|media|medya|channel|kanal|flu|140journos|barış\s*özcan|baris\s*ozcan|ruhi\s*çenet|ruhi\s*cenet|orkun|portal|phonebuff|jerryrig|marques|mkbhd|koray\s*birand|neo\s*&\s*toprak|thekhanate|shiftdelete|webtekno/i;

export const NON_ARTIST_BLACKLIST_REGEX = NON_ARTIST_BLACKLIST;

// Known non-music YouTube channels / educators / influencers / tech reviewers
const NON_MUSIC_CHANNEL_BLACKLIST = new Set([
  'akademiklink',
  'akademik link',
  'evrim ağacı',
  'evrim agaci',
  'flu tv',
  'flutv',
  '140journos',
  'portal',
  'bebar bilim',
  'ayhan tarakcı',
  'ayhan tarakci',
  'celal şengör',
  'celal sengor',
  'ilber ortaylı',
  'ilber ortayli',
  'diamond tema',
  'özcan show',
  'ozcan show',
  'google',
  'google türkiye',
  'google turkiye',
  'lg',
  'lg türkiye',
  'lg turkiye',
  'red bull',
  'red bull miksteyp',
  'redbull miksteyp',
  'hip-hop magazine',
  'hip hop magazine',
  'uproxx',
  'bass boost',
  'ice cube / cubevision',
  'cubevision',
  'bassboost',
  'bass boosted',
  'bassboosted',
  'marques brownlee',
  'mkbhd',
  'jerryrigeverything',
  'phonebuff',
  'techtag',
  'hardware plus',
  'hardware plus tr',
  'hwp',
  'samsung',
  'samsung türkiye',
  'samsung turkiye',
  'apple',
  'apple türkiye',
  'apple turkiye',
  'koray birand',
  'neo & toprak',
  'neo toprak',
  'taa',
  'thekhanate',
  'barış özcan',
  'baris ozcan',
  'ruhi çenet',
  'ruhi cenet',
  'enis kirazoğlu',
  'enis kirazoglu',
  'webtekno',
  'shiftdelete',
  'shiftdelete.net',
  'sdn',
  'donanım arşivi',
  'donanim arsivi',
  'mesut çevik',
  'mesut cevik',
  'linus tech tips',
  'the verge',
  'verge',
  'unbox therapy',
  'mrwhosetheboss',
  'dave2d',
  'mkbhd clips',
  'can sungur',
  'orkun ışıtmak',
  'orkun isitmak',
  'kafalar',
  'pintipanda',
  'jahrein',
  'post42',
  'baturay anar',
  'duru önver',
  'otopark.com',
  'otopark',
  'otomobil günlüklerim',
  'xiaomi',
  'xiaomi türkiye',
  'huawei',
  'huawei türkiye',
  'vox',
  'ted',
  'tedx',
  'bbc news',
  'cnn',
  'euronews',
  'habertürk',
  'sozcutv',
  'halktv',
  'youtube',
  'youtube music',
  'bilinmeyen sanatçı',
  'unknown artist',
]);

// Negative keywords that disqualify a channel from being marked as a music artist
const NON_MUSIC_KEYWORDS = [
  'akademik',
  'evrim',
  'bilim',
  'tarih',
  'felsefe',
  'eğitim',
  'egitim',
  'ders',
  'okul',
  'hoca',
  'doktor',
  'finans',
  'ekonomi',
  'siyaset',
  'yemek',
  'tarif',
  'gezi',
  'seyahat',
  'tech',
  'technology',
  'teknoloji',
  'review',
  'unboxing',
  'inceleme',
  'donanım',
  'donanim',
  'vlog',
  'vlogs',
  'podcast',
  'oyun',
  'gaming',
  'gameplay',
  'gamer',
  'haber',
  'haberleri',
  'news',
  'otomobil',
  'araba',
  'car review',
  'kutu açılımı',
  'kutu acilimi',
  'yazılım',
  'yazilim',
  'kodlama',
  'software',
  'tutorial',
  'kurs',
  'fitness',
  'workout',
  'spor',
  'futbol',
  'basketbol',
  'komedi',
  'sketch',
  'standup',
  'röportaj',
  'canlı yayın kesitleri',
  'kesitler',
  'shorts kanalı',
  'telefon',
  'akıllı telefon',
  'bilgisayar',
  'laptop',
];

// Explicit music signature patterns (Positive Proof #2)
const EXPLICIT_MUSIC_SIGNATURE_REGEX =
  /(?:-\s*topic\b|\(topic\)|\bvevo\b|official\s+artist|\bmusic\b|\bmüzik\b|\bmuzik\b|\brecords\b|\brecordings\b|\bband\b|\borchestra\b|\borkestra\b|\bsoundtrack\b|\brap\b|\brock\b|\bindie\b|\bdj\b|official\s+audio|\bplak\b|\bphilharmonic\b|\bsymphony\b)/i;

// Verified known music artist pool (Positive Proof #3)
const VERIFIED_MUSIC_ARTISTS = new Set<string>([
  ...SAMPLE_SONGS.map((s) => s.artist.trim().toLowerCase()).filter(Boolean),
  // Turkish Rock / Indie / Alternative / Synth / Pop / Rap / Classic
  'duman',
  'mor ve ötesi',
  'mor ve otesi',
  'teoman',
  'mabel matiz',
  'tarkan',
  'sezen aksu',
  'şebnem ferah',
  'sebnem ferah',
  'yüzyüzeyken konuşuruz',
  'yuzyuzeyken konusuruz',
  'büyük ev ablukada',
  'buyuk ev ablukada',
  'adamlar',
  'madrigal',
  'dolu kadehi ters tut',
  'pinhani',
  'model',
  'manga',
  'athena',
  'pilli bebek',
  'she past away',
  'jakuzi',
  'palmiyeler',
  'lin pesto',
  'gaye su akyol',
  'altın gün',
  'altin gun',
  'cem karaca',
  'barış manço',
  'baris manco',
  'erkin koray',
  'mfö',
  'mfo',
  'sertab erener',
  'kalben',
  'melike şahin',
  'melike sahin',
  'can ozan',
  'emir can iğrek',
  'emir can igrek',
  'dedublüman',
  'dedubluman',
  'köfn',
  'kofn',
  'ezhel',
  'ceza',
  'sagopa kajmer',
  'şanışer',
  'saniser',
  'gazapizm',
  'motive',
  'uzi',
  'lvbel c5',
  'semicenk',
  'mert demir',
  'simge',
  'gülşen',
  'gulsen',
  'hadise',
  'zeynep bastık',
  'zeynep bastik',
  'kenan doğulu',
  'kenan dogulu',
  'yalın',
  'yalin',
  'sıla',
  'sila',
  'göksel',
  'goksel',
  'hayko cepkin',
  'pentagram',
  'kurban',
  'redd',
  'seksendört',
  'seksendort',
  'zakkum',
  'gripin',
  'yüksek sadakat',
  'yuksek sadakat',
  'vega',
  'yeni türkü',
  'yeni turku',
  'bülent ortaçgil',
  'bulent ortacgil',
  'ezginin günlüğü',
  'ezginin gunlugu',
  'kardeş türküler',
  'kardes turkuler',
  'evdeki saat',
  'son feci bisiklet',
  'yaşlı amca',
  'yasli amca',
  'kaan boşnak',
  'kaan bosnak',
  'sena şener',
  'sena sener',
  'emir taha',
  'nova norda',
  'karsu',
  'fazıl say',
  'fazil say',
  'feridun düzağaç',
  'feridun duzagac',
  'emre aydın',
  'emre aydin',
  'müslüm gürses',
  'muslum gurses',
  'ahmet kaya',
  'neşet ertaş',
  'neset ertas',
  'selda bağcan',
  'selda bagcan',
  'ajda pekkan',
  'nil karaibrahimgil',
  'ceylan ertem',
  'cem adrian',
  'can bonomo',
  'batuhan mutlugil',
  'kaan tangöze',
  'kaan tangoze',
  'maNga'.toLowerCase(),
  'norm ender',
  'ben fero',
  'khontkar',
  'hidra',
  'allame',
  'contra',
  'şehinşah',
  'sehinsah',
  'defkhan',
  'fuat',
  'kayra',
  'farazi',
  'farazi v kayra',
  'saian',
  'karaçalı',
  'karacali',
  'mode xl',
  'stabil',
  'baneva',
  'çakal',
  'cakal',
  'reckol',
  'blok3',
  'atalay',
  'manifest',
  // Global verified artists
  'arctic monkeys',
  'radiohead',
  'pink floyd',
  'tame impala',
  'the weeknd',
  'daft punk',
  'coldplay',
  'lana del rey',
  'billie eilish',
  'taylor swift',
  'drake',
  'kendrick lamar',
  'travis scott',
  'kanye west',
  'ye',
  'frank ocean',
  'tyler, the creator',
  'tyler the creator',
  'sza',
  'the strokes',
  'nirvana',
  'metallica',
  'queen',
  'the beatles',
  'david bowie',
  'gorillaz',
  'cigarettes after sex',
  'mac demarco',
  'depeche mode',
  'the smiths',
  'the cure',
  'joy division',
  'interpol',
  'muse',
  'oasis',
  'blur',
  'linkin park',
  'red hot chili peppers',
  'foo fighters',
  'system of a down',
  'rammstein',
  'massive attack',
  'portishead',
  'bonobo',
  'khruangbin',
  'fred again..',
  'fred again',
  'disclosure',
  'kaytranada',
  'rüfüs du sol',
  'rufus du sol',
  'odesza',
  'hans zimmer',
  'ludovico einaudi',
  'nils frahm',
  'ólafur arnalds',
  'olafur arnalds',
  'amy winehouse',
  'adele',
  'dua lipa',
  'harry styles',
  'bruno mars',
  'rihanna',
  'beyoncé',
  'beyonce',
  'eminem',
  '2pac',
  'tupac',
  'the notorious b.i.g.',
  'nas',
  'j. cole',
  'metro boomin',
  'playboi carti',
  'a$ap rocky',
  'asap rocky',
  'post malone',
  'doja cat',
  'sabrina carpenter',
  'charli xcx',
  'olivia rodrigo',
  'hozier',
  'mitski',
  'phoebe bridgers',
  'clairo',
  'beach house',
  'mazzy star',
  'slowdive',
  'my bloody valentine',
  'nine inch nails',
  'tool',
  'led zeppelin',
  'fleetwood mac',
  'ac/dc',
  'guns n\' roses',
  'the rolling stones',
  'bob dylan',
  'jimi hendrix',
  'miles davis',
  'john coltrane',
  'chet baker',
  'nina simone',
  'stevie wonder',
  'marvin gaye',
  'bob marley',
  'stromae',
  'indila',
  'rosalía',
  'rosalia',
  'bad bunny',
  'the neighbourhood',
  'chase atlantic',
  'glass animals',
  'foster the people',
  'mgmt',
  'alt-j',
  'the xx',
  'jamie xx',
  'four tet',
  'floating points',
  'thom yorke',
  'the smile',
  'king gizzard & the lizard wizard',
  'fontaines d.c.',
  'idles',
  'cage the elephant',
  'vampire weekend',
  'arcade fire',
  'florence + the machine',
  'lorde',
  'the 1975',
  'twenty one pilots',
  'imagine dragons',
  'maroon 5',
  'ed sheeran',
  'shawn mendes',
  'justin bieber',
  'ariana grande',
  'selena gomez',
  'lady gaga',
  'katy perry',
  'shakira',
  'elton john',
  'michael jackson',
  'prince',
  'madonna',
  'frank sinatra',
  'elvis presley',
  'johnny cash',
  'iron maiden',
  'black sabbath',
  'megadeth',
  'slayer',
  'slipknot',
  'korn',
  'deftones',
  'pearl jam',
  'soundgarden',
  'alice in chains',
  'smashing pumpkins',
  'green day',
  'blink-182',
  'paramore',
  'my chemical romance',
  'fall out boy',
  'bring me the horizon',
  'evanescence',
  'disturbed',
  'avenged sevenfold',
  'gojira',
  'opeth',
  'porcupine tree',
  'steven wilson',
  'anathema',
  'katatonia',
  'molchat doma',
  'lebanon hanover',
  'boy harsher',
  'kavinsky',
  'gesaffelstein',
  'justice',
  'm83',
  'chromeo',
  'parcels',
  'l\'impératrice',
  'jungle',
  'metronomy',
  'phoenix',
  'air',
  'moderat',
  'apparat',
  'bicep',
  'peggy gou',
  'charlotte de witte',
  'amelie lens',
  'anyma',
  'tale of us',
  'solomun',
  'black coffee',
  'keinemusik',
  'rampa',
  '&me',
  'adam port',
  'carl cox',
  'tiësto',
  'tiesto',
  'calvin harris',
  'david guetta',
  'avicii',
  'martin garrix',
  'skrillex',
  'deadmau5',
  'flume',
  'porter robinson',
  'madeon',
  'san holo',
  'illenium',
  'kygo',
  'alan walker',
  'marshmello',
  'the chainsmokers',
  'zayn',
  'sam smith',
  'lewis capaldi',
  'tom odell',
  'james arthur',
  'john mayer',
  'jack johnson',
  'ben howard',
  'bon iver',
  'sufjan stevens',
  'elliott smith',
  'nick drake',
  'jeff buckley',
  'leonard cohen',
  'nick cave',
  'tom waits',
  'pj harvey',
  'björk',
  'bjork',
  'fka twigs',
  'james blake',
  'sampha',
  'anderson .paak',
  'thundercat',
  'flying lotus',
  'mf doom',
  'madlib',
  'j dilla',
  'nujabes',
  'childish gambino',
  'kid cudi',
  'mac miller',
  'juice wrld',
  'xxxtentacion',
  'lil peep',
  'lil uzi vert',
  'future',
  '21 savage',
  'young thug',
  'gunna',
  'lil baby',
  'lil wayne',
  'jay-z',
  'snoop dogg',
  'dr. dre',
  'ice cube',
  '50 cent',
  'outkast',
  'a tribe called quest',
  'wu-tang clan',
  'run the jewels',
  'danny brown',
  'jpegmafia',
  'earl sweatshirt',
  'vince staples',
  'joey bada$$',
  'denzel curry',
  'jid',
  'baby keem',
  'central cee',
  'dave',
  'stormzy',
  'skepta',
  'little simz',
  'jorja smith',
  'kali uchis',
  'daniel caesar',
  'steve lacy',
  'omar apollo',
  'brent faiyaz',
  'giveon',
  'summer walker',
  'h.e.r.',
  'alicia keys',
  'john legend',
  'usher',
  'chris brown',
  'ne-yo',
  'justin timberlake',
  'pharrell williams',
  'timbaland',
]);

// Cache for iTunes / YouTube artist image lookups to prevent duplicate network calls
const artistArtworkCache = new Map<string, string>();

function normalizeArtistToken(value: string): string {
  return value
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\s*\(topic\)$/i, '')
    .replace(/\s*vevo$/i, '')
    .replace(/\s*official$/i, '')
    .trim()
    .toLowerCase();
}

function extractArtistsFromSongs(userSongsList: Song[] = []): Set<string> {
  const set = new Set<string>();
  for (const s of userSongsList || []) {
    if (!s?.artist) continue;
    const raw = s.artist.trim().toLowerCase();
    if (raw) {
      set.add(raw);
      set.add(normalizeArtistToken(raw));
      // Also split featured/collaborative artist strings (e.g. "Duman, Teoman" or "X feat. Y")
      raw
        .split(/\s*(?:,|&|feat\.?|ft\.?|x|with)\s+/i)
        .map((part) => normalizeArtistToken(part))
        .filter((part) => part.length >= 2)
        .forEach((part) => set.add(part));
    }
  }
  return set;
}

/**
 * Whitelist-First Music Artist & Channel Validator.
 *
 * Step 0: Reject immediately if matched by expanded NON_ARTIST_BLACKLIST, channel blacklist, or negative keywords.
 * Then requires AT LEAST ONE of 3 positive proofs:
 *  1) Matches an artist in the user's liked songs / playlists (userSongsOrArtists)
 *  2) Contains an explicit music signature (- Topic, VEVO, Official Artist, Music, Müzik, Records, Band, Orchestra, Soundtrack, Rap, Rock, Indie, DJ)
 *  3) Exists in the verified music artist pool
 * If none of the 3 positive proofs hold -> returns { isMusic: false }.
 */
export function isMusicArtistOrChannel(
  channelOrName:
    | string
    | { name?: string; cleanTitle?: string; rawTitle?: string; description?: string; [key: string]: any },
  descriptionOrUserSongs: string | Song[] | string[] = [],
  userLibraryArtistsArg: Song[] | string[] = []
): { isMusic: boolean; reason: string } {
  const rawTitle =
    typeof channelOrName === 'string'
      ? channelOrName
      : channelOrName.rawTitle || channelOrName.cleanTitle || channelOrName.name || '';
  const name =
    typeof channelOrName === 'string'
      ? channelOrName
      : channelOrName.name || channelOrName.cleanTitle || channelOrName.rawTitle || '';
  const description =
    typeof descriptionOrUserSongs === 'string'
      ? descriptionOrUserSongs
      : typeof channelOrName === 'object' && channelOrName?.description
      ? String(channelOrName.description)
      : '';

  // Support both (channel, Song[]) and (channelName, description, userLibraryArtists) signatures
  const rawLibraryInput =
    typeof descriptionOrUserSongs === 'string'
      ? userLibraryArtistsArg
      : descriptionOrUserSongs;

  const userLibraryArtists = new Set<string>();
  if (Array.isArray(rawLibraryInput)) {
    if (rawLibraryInput.length > 0 && typeof rawLibraryInput[0] === 'string') {
      for (const item of rawLibraryInput as string[]) {
        if (!item) continue;
        const norm = normalizeArtistToken(item);
        if (norm) userLibraryArtists.add(norm);
        userLibraryArtists.add(item.trim().toLowerCase());
      }
    } else {
      const fromSongs = extractArtistsFromSongs(rawLibraryInput as Song[]);
      fromSongs.forEach((a) => userLibraryArtists.add(a));
    }
  }
  if (Array.isArray(userLibraryArtistsArg) && typeof descriptionOrUserSongs !== 'string') {
    if (userLibraryArtistsArg.length > 0 && typeof userLibraryArtistsArg[0] === 'string') {
      for (const item of userLibraryArtistsArg as string[]) {
        if (!item) continue;
        userLibraryArtists.add(normalizeArtistToken(item));
      }
    } else {
      extractArtistsFromSongs(userLibraryArtistsArg as Song[]).forEach((a) =>
        userLibraryArtists.add(a)
      );
    }
  }

  if (!name || !name.trim()) {
    return { isMusic: false, reason: 'Boş sanatçı adı' };
  }

  const cleanName = name.trim();
  const lowerName = cleanName.toLowerCase();
  const lowerRaw = rawTitle.trim().toLowerCase();
  const normalizedName = normalizeArtistToken(cleanName);
  const normalizedRaw = normalizeArtistToken(rawTitle);
  const combinedText = `${cleanName} ${rawTitle} ${description}`.trim();
  const combinedLower = combinedText.toLowerCase();

  // 0. Hard Blacklist Check (takes absolute precedence over everything)
  if (
    NON_MUSIC_CHANNEL_BLACKLIST.has(lowerName) ||
    NON_MUSIC_CHANNEL_BLACKLIST.has(lowerRaw) ||
    NON_MUSIC_CHANNEL_BLACKLIST.has(normalizedName) ||
    NON_ARTIST_BLACKLIST.test(cleanName) ||
    NON_ARTIST_BLACKLIST.test(rawTitle) ||
    (description && NON_ARTIST_BLACKLIST.test(description))
  ) {
    return { isMusic: false, reason: 'Müzik dışı kanal (Kara liste)' };
  }

  const hasNegativeKeyword = NON_MUSIC_KEYWORDS.some(
    (kw) => lowerName.includes(kw) || lowerRaw.includes(kw) || (description && combinedLower.includes(kw))
  );
  if (hasNegativeKeyword) {
    return { isMusic: false, reason: 'Müzik dışı anahtar kelime tespit edildi' };
  }

  // Positive Proof #1: Matches a real artist in the user's own liked songs / music playlists
  if (
    userLibraryArtists.has(lowerName) ||
    userLibraryArtists.has(normalizedName) ||
    userLibraryArtists.has(normalizedRaw)
  ) {
    return { isMusic: true, reason: 'Kütüphanenizdeki şarkılarla eşleşti' };
  }

  // Positive Proof #2: Explicit music signature in channel name, raw title, or description
  if (
    EXPLICIT_MUSIC_SIGNATURE_REGEX.test(rawTitle) ||
    EXPLICIT_MUSIC_SIGNATURE_REGEX.test(cleanName) ||
    (description && EXPLICIT_MUSIC_SIGNATURE_REGEX.test(description))
  ) {
    return { isMusic: true, reason: 'Resmi müzik sinyali doğrulandı' };
  }

  // Positive Proof #3: Present in the verified known music artist pool
  if (
    VERIFIED_MUSIC_ARTISTS.has(lowerName) ||
    VERIFIED_MUSIC_ARTISTS.has(normalizedName) ||
    VERIFIED_MUSIC_ARTISTS.has(normalizedRaw)
  ) {
    return { isMusic: true, reason: 'Doğrulanmış müzik sanatçısı' };
  }

  // Whitelist-First Default: Reject any unverified channel (e.g. education, science, vlog, commentary)
  return { isMusic: false, reason: 'Doğrulanmış müzik sanatçısı sinyali bulunamadı' };
}

/**
 * Filters an array of artist names to keep only whitelist-verified music artists.
 */
export function cleanNonMusicArtists(
  artists: string[],
  userSongs: Song[] = [],
  extraLibraryArtists: string[] = []
): string[] {
  const seen = new Set<string>();
  const cleanList: string[] = [];

  for (const a of artists) {
    if (!a || typeof a !== 'string') continue;
    const trimmed = a.trim();
    const lower = trimmed.toLowerCase();
    if (!trimmed || seen.has(lower)) continue;

    const check = isMusicArtistOrChannel(trimmed, userSongs, extraLibraryArtists);
    if (check.isMusic) {
      seen.add(lower);
      cleanList.push(trimmed);
    }
  }

  return cleanList;
}

/**
 * Filters subscribed channels to evaluate and annotate genuine music artists.
 */
export function cleanNonMusicChannels(
  channels: SubscribedChannelDetail[],
  userSongs: Song[] = []
): SubscribedChannelDetail[] {
  return channels.map((ch) => {
    const check = isMusicArtistOrChannel(ch, userSongs);
    return {
      ...ch,
      isMusicArtist: check.isMusic,
      reason: check.reason,
    };
  });
}

/**
 * Automatically purges non-music channels (e.g. AkademikLink, science, education, tech, vlog)
 * from ALL localStorage caches on app boot using the strict Whitelist-First filter.
 */
export function purgeNonMusicFromLocalStorage(
  userSongs: Song[] = [],
  userPlaylists: UserPlaylist[] = []
): {
  removedArtists: string[];
  cleanArtists: string[];
} {
  if (typeof window === 'undefined') return { removedArtists: [], cleanArtists: [] };

  const removed: string[] = [];
  const clean: string[] = [];

  // Aggregate all real library songs (including persisted songs & playlists in localStorage)
  const combinedSongs: Song[] = [
    ...(userSongs || []),
    ...(userPlaylists || []).flatMap((p) => p.tracks || []),
  ];

  try {
    const savedSongsRaw = localStorage.getItem('harmoniq_user_favorite_songs');
    if (savedSongsRaw) {
      const parsedSongs = JSON.parse(savedSongsRaw);
      if (Array.isArray(parsedSongs)) combinedSongs.push(...parsedSongs);
    }
    const savedPlaylistsRaw = localStorage.getItem('harmoniq_user_playlists');
    if (savedPlaylistsRaw) {
      const parsedPls = JSON.parse(savedPlaylistsRaw);
      if (Array.isArray(parsedPls)) {
        for (const pl of parsedPls) {
          if (Array.isArray(pl?.tracks)) combinedSongs.push(...pl.tracks);
        }
      }
    }
  } catch {
    // ignore storage read errors
  }

  try {
    // 1. Purge harmoniq_user_favorite_artists
    const rawArtists = localStorage.getItem('harmoniq_user_favorite_artists');
    if (rawArtists) {
      const parsed: string[] = JSON.parse(rawArtists);
      if (Array.isArray(parsed)) {
        for (const a of parsed) {
          const check = isMusicArtistOrChannel(a, combinedSongs);
          if (check.isMusic) {
            clean.push(a);
          } else {
            removed.push(a);
          }
        }

        if (removed.length > 0 || clean.length !== parsed.length) {
          localStorage.setItem('harmoniq_user_favorite_artists', JSON.stringify(clean));
        }
      }
    }

    // 2. Purge harmoniq_yt_synced_library (Persistent YouTube Library cache)
    const rawYtLib = localStorage.getItem('harmoniq_yt_synced_library');
    if (rawYtLib) {
      const parsedLib = JSON.parse(rawYtLib);
      if (parsedLib && Array.isArray(parsedLib.favoriteArtists)) {
        const libSongs: Song[] = [
          ...combinedSongs,
          ...(Array.isArray(parsedLib.favoriteSongs) ? parsedLib.favoriteSongs : []),
          ...(Array.isArray(parsedLib.playlists)
            ? parsedLib.playlists.flatMap((p: UserPlaylist) => p?.tracks || [])
            : []),
        ];
        const nextLibArtists = cleanNonMusicArtists(parsedLib.favoriteArtists, libSongs);
        if (nextLibArtists.length !== parsedLib.favoriteArtists.length) {
          localStorage.setItem(
            'harmoniq_yt_synced_library',
            JSON.stringify({ ...parsedLib, favoriteArtists: nextLibArtists })
          );
        }
      }
    }

    // 3. Re-evaluate & purge harmoniq_user_subscribed_channels
    const rawChannels = localStorage.getItem('harmoniq_user_subscribed_channels');
    if (rawChannels) {
      const parsedChannels: SubscribedChannelDetail[] = JSON.parse(rawChannels);
      if (Array.isArray(parsedChannels)) {
        const nextChannels = parsedChannels
          .filter((ch) => {
            const name = ch.name || ch.rawTitle || '';
            return (
              !NON_ARTIST_BLACKLIST.test(name) &&
              !NON_MUSIC_CHANNEL_BLACKLIST.has(name.trim().toLowerCase())
            );
          })
          .map((ch) => {
            const check = isMusicArtistOrChannel(ch, combinedSongs);
            return {
              ...ch,
              isMusicArtist: check.isMusic,
              reason: check.reason,
            };
          });
        localStorage.setItem('harmoniq_user_subscribed_channels', JSON.stringify(nextChannels));
      }
    }
  } catch {
    // ignore parsing errors
  }

  return { removedArtists: removed, cleanArtists: clean };
}

/**
 * Fetches high-resolution artist artwork from iTunes API or channel thumbnail cache.
 */
export async function getArtistArtwork(
  artistName: string,
  channels: SubscribedChannelDetail[] = []
): Promise<string | null> {
  if (!artistName) return null;
  const key = artistName.trim().toLowerCase();

  if (artistArtworkCache.has(key)) {
    return artistArtworkCache.get(key) || null;
  }

  const matchedChannel = channels.find(
    (c) => c.name.toLowerCase() === key || c.rawTitle.toLowerCase() === key
  );
  if (matchedChannel?.thumbnailUrl) {
    artistArtworkCache.set(key, matchedChannel.thumbnailUrl);
    return matchedChannel.thumbnailUrl;
  }

  try {
    const songRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&limit=1`
    );
    if (songRes.ok) {
      const data = await songRes.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const art = item.artworkUrl100
          ? item.artworkUrl100.replace('100x100bb', '300x300bb')
          : item.artworkUrl60;
        if (art) {
          artistArtworkCache.set(key, art);
          return art;
        }
      }
    }

    const albumRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=album&limit=1`
    );
    if (albumRes.ok) {
      const data = await albumRes.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const art = item.artworkUrl100
          ? item.artworkUrl100.replace('100x100bb', '300x300bb')
          : item.artworkUrl60;
        if (art) {
          artistArtworkCache.set(key, art);
          return art;
        }
      }
    }
  } catch {
    // ignore network errors
  }

  return null;
}
