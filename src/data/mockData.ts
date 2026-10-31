import { Song, LoungeUser, LoungeConversation, PlatformType, ComplaintSolution } from '../types';

export const MAKROMUSIC_COMPLAINT_SOLUTIONS: ComplaintSolution[] = [
  {
    id: 'comp-1',
    category: 'ban',
    badgeText: 'Şikayetvar #1 Şikayet: Açıklamasız Kalıcı Ban',
    problemTitle: 'Haksız & Açıklamasız Hesap Yasaklamaları',
    makroProblem: 'Makromusic kullanıcıları, hiçbir kural ihlali yapmadıkları halde aniden kalıcı ban aldıklarını, satın aldıkları premium hakların yandığını ve muhatap bulamadıklarını belirtiyor.',
    harmoniqSolution: 'Harmoniq "Şeffaf Güven Kalkanı": Her hesabın şeffaf 100 üzerinden Güvenlik Skoru vardır. İhlal veya şikayet durumunda doğrudan bildirim ve 48 saat içinde incelenen insan destekli İtiraz Sistemi mevcuttur.'
  },
  {
    id: 'comp-2',
    category: 'bots',
    badgeText: 'Kullanıcı Eleştirisi: Hayalet Hesaplar & Sahte Eşleşmeler',
    problemTitle: 'Bot Profiller ve Aylardır Girmeyen Kullanıcılar',
    makroProblem: 'Uygulamayı indirenlerin en büyük can sıkıntısı: Kullanıcıya jeton aldırmak için sahte beğeni bildirimleri atılması ve 6 aydır uygulamayı açmamış ölü profillerin eşleşmeye düşmesi.',
    harmoniqSolution: 'Harmoniq "Heartbeat (Nabız) & Sadece Canlı Dinleyenler": 30s nabız sinyali; 45s kesintide odadan otomatik çıkarılır. Yalnızca şu an gerçekten müzik dinleyen kişiler listelenir. Sahte botlar imkansızdır.'
  },
  {
    id: 'comp-3',
    category: 'intent',
    badgeText: 'Topluluk Sorunu: Flört vs Konser/Müzik Kargaşası',
    problemTitle: 'Niyet Uyuşmazlığı ve İstenmeyen Taciz',
    makroProblem: 'Bir taraf sadece indie rock grubu kurmak veya konser arkadaşı bulmak isterken, diğer tarafın kaba flört/tinder tavırlarıyla yaklaşması ve uygulamanın amaç karmaşası yaşaması.',
    harmoniqSolution: 'Harmoniq "Canlı Frekans Odaları & Buzkırıcılar": Tinder usulü kaydırma tamamen kaldırıldı. Müzikal zaman çizelgesi üzerinden tek dokunuşla "Sıradaki Şarkıyı Öner" gibi doğal müzik iletişimi kurulur.'
  },
  {
    id: 'comp-4',
    category: 'chat',
    badgeText: 'Teknik Hata: Sohbet Silinmesi & Şarkı Çalamama',
    problemTitle: 'Sohbetlerin Kaybolması & Kopuk Mesajlaşma',
    makroProblem: 'Makromusic\'te eşleşmeler ve mesaj geçmişi ansızın siliniyor; sohbet içinde şarkı önizlemesi dinlenemiyor ve Spotify bağlantısı sürekli kopuyor.',
    harmoniqSolution: 'Harmoniq "Otomatik Tanışma Bağlamı & Kalıcı Sohbet": Mesaj geçmişiniz asla kaybolmaz. Hangi şarkıda, hangi saniyede karşılaştığınız otomatik sohbet kartı olarak saklanır.'
  },
  {
    id: 'comp-5',
    category: 'matching',
    badgeText: 'Yüzeysel Algoritma: Tek Şarkılık Tesadüfler',
    problemTitle: 'Yüzeysel Tek-Şarkı Eşleşmesi',
    makroProblem: 'Sadece o saniyede tesadüfen aynı popüler şarkıyı dinleyen iki kişiyi eşleştiriyor; fakat iki tarafın genel müzik zevkleri tamamen alakasız çıkıyor ve sohbet 2 dakikada tıkanıyor.',
    harmoniqSolution: 'Harmoniq "Zaman Çizelgesi & Esnek Kümeleme": Şarkı odasında tek kişi kalırsan otomatik Sanatçı Odasına veya Tür Odasına bağlanırsın; derin müzikal bağ kurulur.'
  },
  {
    id: 'comp-6',
    category: 'paywall',
    badgeText: 'Agresif Model: Her Ekranda 30sn Reklam & Jeton Tuzağı',
    problemTitle: 'Agresif Paywall & Jeton Tuzakları',
    makroProblem: 'Her kaydırmada geçilmeyen reklamlar, eşleşmeyi görmek için para ödemeye zorlama ve haksız kesilen abonelik yenilemeleri.',
    harmoniqSolution: 'Harmoniq "Discord Nitro Modeli (Adil Freemium)": Odalara girmek, eşleşmek ve mesajlaşmak tamamen ücretsizdir. Asla jeton veya mesaj hakkı satılmaz.'
  }
];


export function normalizeTrackTitle(raw: string): { artist: string; title: string; canonicalId: string } {
  // Strip off (Official Video), [4K], (Remastered), (Canlı), etc.
  let cleaned = raw
    .replace(/\s*[\(\[](official\s*video|official\s*audio|4k|hd|remastered|lyrics|klip|video|audio|canlı|live)[\)\]]/gi, '')
    .trim();

  // Split by hyphen or colon
  const parts = cleaned.split(/\s*[-–—:]\s*/);
  if (parts.length >= 2) {
    const artist = parts[0].trim();
    const title = parts.slice(1).join(' - ').trim();
    const canonicalId = `trk_${artist.toLowerCase().replace(/[^a-z0-9]/g, '')}_${title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    return { artist, title, canonicalId };
  }

  const canonicalId = `trk_${cleaned.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  return { artist: 'Bilinmeyen Sanatçı', title: cleaned, canonicalId };
}

export const SAMPLE_SONGS: Song[] = [
  {
    id: 'song-duman',
    title: 'Kırmış Kalbini',
    artist: 'Duman',
    album: 'Belki Alışman Lazım',
    genre: 'Türkçe Rock / Grunge',
    rawMediaTitle: 'Duman - Kırmış Kalbini (Official Audio) [Remastered]',
    coverGradient: 'from-amber-700 via-orange-900 to-neutral-950',
    coverUrl: '/covers/duman.jpg',
    durationSeconds: 252,
    bpm: 114,
    keyNote: 'Dm',
    catalogNumber: 'CAT: DMN-2002-BAL',
    releaseYear: 2002,
    soundType: 'rock',
    youtubeVideoId: 'J23BBMHcOJQ',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/59/8e/91/598e919a-4c29-2c48-0d6e-d46deffde722/mzaf_8827767020373773566.plus.aac.p.m4a',
    timelineMarkers: [
      { second: 28, label: 'Giriş Melodisi', emoji: '⚡' },
      { second: 85, label: 'Nakarat', emoji: '🔥' },
      { second: 142, label: 'Gitar Solosu', emoji: '🎸' },
      { second: 215, label: 'Kapanış', emoji: '✨' }
    ],
    lyrics: [
      { second: 0, text: '♪ [Giriş Akorları & Grunge Riff] ♪' },
      { second: 28, text: 'Kırmış kalbini bir zalim...' },
      { second: 45, text: 'Düşmüş yollara garip garip' },
      { second: 60, text: 'Ağlar durur geceleri...' },
      { second: 72, text: 'İçer içer de dertlenir' },
      { second: 85, text: 'O zalim seni hiç sevmedi mi?' },
      { second: 102, text: 'Gözlerinin içine gülmedi mi?' },
      { second: 120, text: 'Bir yabancı gibi çekip gitti mi?' },
      { second: 135, text: 'Kırmış kalbini bir zalim...' },
      { second: 142, text: '♪ [Batu Mutlugil - Distorsiyonlu Gitar Solosu] ♪' },
      { second: 180, text: 'Bırak dönsün devran, aksın zaman...' },
      { second: 205, text: 'Yine seversin bir gün elbet' },
      { second: 215, text: 'Kırmış kalbini, kırmış kalbini...' },
      { second: 240, text: '♪ [Outro & Feedback Fade] ♪' }
    ]
  },
  {
    id: 'song-morveotesi',
    title: 'Bir Derdim Var',
    artist: 'Mor ve Ötesi',
    album: 'Dünya Yalan Söylüyor',
    genre: 'Alternatif Rock',
    rawMediaTitle: 'Mor ve Ötesi - Bir Derdim Var (Official Video) 4K',
    coverGradient: 'from-rose-700 via-indigo-900 to-black',
    coverUrl: '/covers/morveotesi.jpg',
    durationSeconds: 215,
    bpm: 110,
    keyNote: 'Dm',
    catalogNumber: 'CAT: DYS-2004-LP',
    releaseYear: 2004,
    soundType: 'rock',
    youtubeVideoId: '7RW8n4iXZbA',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/33/da/d3/33dad302-c771-3459-d42e-9b3f688a0fec/mzaf_14484681529289379423.plus.aac.p.m4a',
    timelineMarkers: [
      { second: 32, label: 'Vokal Giriş', emoji: '🎙️' },
      { second: 78, label: 'Patlama', emoji: '💥' },
      { second: 135, label: 'Solonun Zirvesi', emoji: '🎸' },
      { second: 185, label: 'Akustik Köprü', emoji: '🌊' }
    ],
    lyrics: [
      { second: 0, text: '♪ [Distorsiyon Bas & Ritim] ♪' },
      { second: 32, text: 'Bir derdim var artık tutamam içimde' },
      { second: 48, text: 'Gitsem nereye kadar, kalsam neye yarar' },
      { second: 64, text: 'Hiç anlatamadım, hiç anlamadılar' },
      { second: 78, text: 'Herkes bir şey aldı, benden geriye ne kaldı?' },
      { second: 95, text: 'Bir derdim var artık tutamam içimde...' },
      { second: 135, text: '♪ [Kerem Özyeğen - İkonik Zirve Solo] ♪' },
      { second: 185, text: 'Bak bu son perde, oyun bitti' },
      { second: 200, text: 'Güneş battı, ay doğdu...' }
    ]
  },
  {
    id: 'song-arctic',
    title: '505',
    artist: 'Arctic Monkeys',
    album: 'Favourite Worst Nightmare',
    genre: 'Indie Rock / Post-Punk',
    rawMediaTitle: 'Arctic Monkeys - 505 (Official Audio)',
    coverGradient: 'from-neutral-800 via-zinc-900 to-amber-950',
    coverUrl: '/covers/arctic.jpg',
    durationSeconds: 253,
    bpm: 140,
    keyNote: 'Dm',
    catalogNumber: 'CAT: WIG-2007-UK',
    releaseYear: 2007,
    soundType: 'indie',
    youtubeVideoId: 'CKI8iQTgZKU',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e5/69/9b/e5699b1f-19bb-1e1b-ccd7-f8e5113edd5a/mzaf_11259426210084492241.plus.aac.p.m4a',
    timelineMarkers: [
      { second: 45, label: 'Organ Girişi', emoji: '🎹' },
      { second: 120, label: 'Sözler', emoji: '🖤' },
      { second: 165, label: 'Büyük Patlama', emoji: '🔥' },
      { second: 220, label: 'Yavaşlama', emoji: '✨' }
    ],
    lyrics: [
      { second: 0, text: '♪ [Ennio Morricone Organ Akoru] ♪' },
      { second: 45, text: "I'm goin' back to 505" },
      { second: 60, text: "If it's a seven-hour flight or a forty-five-minute drive" },
      { second: 85, text: "In my imagination, you're waitin' lyin' on your side" },
      { second: 110, text: "With your hands between your thighs" },
      { second: 135, text: "Stop and wait a sec, when you look at me like that" },
      { second: 165, text: "♪ [Büyük Davul Patlaması & Gitarlar] ♪" },
      { second: 180, text: "I'd probably still adore you with your hands around my neck" },
      { second: 215, text: "Or at least did the first time..." }
    ]
  },
  {
    id: 'song-jakuzi',
    title: 'Koca Bir Saçmalık',
    artist: 'Jakuzi',
    album: 'Fantezi Müzik',
    genre: 'Synthpop / New Wave',
    rawMediaTitle: 'Jakuzi - Koca Bir Saçmalık (Official Music Video)',
    coverGradient: 'from-teal-800 via-cyan-950 to-neutral-950',
    coverUrl: '/covers/jakuzi.jpg',
    durationSeconds: 198,
    bpm: 120,
    keyNote: 'Am',
    catalogNumber: 'CAT: CITY-2017-FM',
    releaseYear: 2017,
    soundType: 'synthwave',
    youtubeVideoId: 'KCHfypkdUL0',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/73/b5/cb/73b5cb98-9123-41e8-8c12-46dfadba4a8d/mzaf_11172729444973815896.plus.aac.p.m4a',
    timelineMarkers: [
      { second: 20, label: 'Synth Beat', emoji: '🕹️' },
      { second: 65, label: 'Nakarat', emoji: '💫' },
      { second: 130, label: 'Bass Groove', emoji: '⚡' }
    ],
    lyrics: [
      { second: 0, text: '♪ [Retro Analog Synth Bassline] ♪' },
      { second: 20, text: 'Koca bir saçmalık bu hayat...' },
      { second: 40, text: 'Herkes bir şeylerin peşinde koşuyor' },
      { second: 65, text: 'Zaman akıp gidiyor avuçlarımızdan' },
      { second: 90, text: 'Biz hala aynı köşe başında, aynı frekansta' },
      { second: 130, text: '♪ [80s Arpeggiator & Reverb Snare Solo] ♪' },
      { second: 165, text: 'Koca bir saçmalık ama güzel...' }
    ]
  },
  {
    id: 'song-teoman',
    title: 'Paramparça',
    artist: 'Teoman',
    album: '17',
    genre: 'Türkçe Rock',
    rawMediaTitle: 'Teoman - Paramparça (Official Audio)',
    coverGradient: 'from-blue-900 via-slate-900 to-neutral-950',
    coverUrl: '/covers/teoman.jpg',
    durationSeconds: 278,
    bpm: 118,
    keyNote: 'Em',
    catalogNumber: 'CAT: TEO-2000-17',
    releaseYear: 2000,
    soundType: 'rock',
    youtubeVideoId: 'lh4lMzVcM8A',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/91/3f/2f/913f2f44-ab23-5d9d-dab4-b36f062db221/mzaf_3786517908689198432.plus.aac.p.m4a',
    timelineMarkers: [
      { second: 35, label: 'Giriş', emoji: '🎸' },
      { second: 95, label: 'Nakarat', emoji: '💥' },
      { second: 170, label: 'Akustik Solo', emoji: '✨' }
    ],
    lyrics: [
      { second: 0, text: '♪ [Akustik Akor & Yaylı Giriş] ♪' },
      { second: 35, text: 'Bugün benim doğum günüm...' },
      { second: 55, text: 'Hem sarhoşum hem yastayım' },
      { second: 75, text: 'Bir bar taburesi üstünde' },
      { second: 95, text: 'Babamın öldüğü yaştayım...' },
      { second: 125, text: 'Paramparça, paramparça...' },
      { second: 170, text: '♪ [Akustik & Elektrik Solo Buluşması] ♪' },
      { second: 220, text: 'Gittikçe yalnızlaşıyor insan...' }
    ]
  },
  {
    id: 'song-shepastaway',
    title: 'Kasvetli Kutlama',
    artist: 'She Past Away',
    album: 'Belirdi Gece',
    genre: 'Darkwave / Post-Punk',
    rawMediaTitle: 'She Past Away - Kasvetli Kutlama',
    coverGradient: 'from-purple-950 via-zinc-950 to-black',
    coverUrl: '/covers/shepastaway.jpg',
    durationSeconds: 236,
    bpm: 132,
    keyNote: 'Am',
    catalogNumber: 'CAT: SPA-2012-BG',
    releaseYear: 2012,
    soundType: 'indie',
    youtubeVideoId: 'oy2x_kHCy4w',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/bc/b5/d8/bcb5d81e-6e54-8c6c-e90d-a5273d364167/mzaf_7284464701847033178.plus.aac.p.m4a',
    timelineMarkers: [
      { second: 15, label: 'Gothic Bass', emoji: '🦇' },
      { second: 80, label: 'Vokal', emoji: '🎙️' },
      { second: 150, label: 'Synth Wave', emoji: '⚡' }
    ],
    lyrics: [
      { second: 0, text: '♪ [Darkwave Drum Machine & Chorus Bass] ♪' },
      { second: 40, text: 'Karanlık odada soluk ışıklar...' },
      { second: 80, text: 'Gölgen duvarda dans edercesine titrer' },
      { second: 120, text: 'Bu kasvetli kutlama bizim için' },
      { second: 150, text: '♪ [Coldwave Synth & Goth Guitar Hook] ♪' },
      { second: 190, text: 'Geriye kalan sadece sessizlik...' }
    ]
  }
];

// Curated Radio Stations generator based on current playing track
export function generateRadioForSong(song: Song): {
  stationName: string;
  description: string;
  tracks: Song[];
} {
  // Related tracks from catalog or variations
  const otherSongs = SAMPLE_SONGS.filter((s) => s.id !== song.id);
  
  // Custom bonus radio tracks suited for rock/indie
  const bonusRadioTracks: Song[] = [
    {
      id: 'radio-duman-bebek',
      title: 'Bebek',
      artist: 'Duman',
      album: 'Belki Alışman Lazım',
      genre: 'Türkçe Rock',
      rawMediaTitle: 'Duman - Bebek (Official Audio)',
      coverGradient: 'from-amber-800 to-neutral-950',
      coverUrl: '/covers/duman.jpg',
      durationSeconds: 244,
      bpm: 112,
      keyNote: 'Am',
      catalogNumber: 'CAT: DMN-2002-02',
      releaseYear: 2002,
      soundType: 'rock',
      timelineMarkers: [{ second: 30, label: 'Akustik Giriş', emoji: '🎸' }],
      lyrics: [{ second: 30, text: 'Aman bebek, canım bebek...' }]
    },
    {
      id: 'radio-morveotesi-cambaz',
      title: 'Cambaz',
      artist: 'Mor ve Ötesi',
      album: 'Dünya Yalan Söylüyor',
      genre: 'Alternatif Rock',
      rawMediaTitle: 'Mor ve Ötesi - Cambaz (Official Video)',
      coverGradient: 'from-rose-800 to-neutral-950',
      coverUrl: '/covers/morveotesi.jpg',
      durationSeconds: 231,
      bpm: 130,
      keyNote: 'Em',
      catalogNumber: 'CAT: DYS-2004-03',
      releaseYear: 2004,
      soundType: 'rock',
      timelineMarkers: [{ second: 25, label: 'Vokal', emoji: '🎙️' }],
      lyrics: [{ second: 25, text: 'Ne habersin be cambaz...' }]
    },
    {
      id: 'radio-arctic-r-u-mine',
      title: 'R U Mine?',
      artist: 'Arctic Monkeys',
      album: 'AM',
      genre: 'Garage Rock',
      rawMediaTitle: 'Arctic Monkeys - R U Mine? (Official Video)',
      coverGradient: 'from-zinc-800 to-black',
      coverUrl: '/covers/arctic.jpg',
      durationSeconds: 201,
      bpm: 144,
      keyNote: 'F#m',
      catalogNumber: 'CAT: AM-2013-02',
      releaseYear: 2013,
      soundType: 'indie',
      timelineMarkers: [{ second: 20, label: 'Riff', emoji: '⚡' }],
      lyrics: [{ second: 20, text: 'I go crazy cause here isn\'t where I wanna be...' }]
    }
  ];

  return {
    stationName: `${song.artist} Radyosu`,
    description: `${song.artist} ve benzer frekanstaki Türkçe Rock & Indie sanatçılarının canlı radyo akışı.`,
    tracks: [song, ...otherSongs, ...bonusRadioTracks]
  };
}

export const INITIAL_FRIEND_REQUESTS: { id: string; fromUser: LoungeUser; timestamp: string; songContext: string; status: 'pending' | 'accepted' | 'declined' }[] = [
  {
    id: 'req-mert',
    fromUser: {
      id: 'user-mert',
      name: 'Mert Aksoy',
      age: 26,
      city: 'İstanbul (Kadıköy)',
      avatarSeed: 'MA',
      avatarGradient: 'from-amber-500 to-orange-700',
      platform: 'spotify',
      currentSecond: 142,
      topArtists: ['Duman', 'Teoman', 'Mor ve Ötesi'],
      bio: 'Rock konserlerinde ön sıra müdavimi. Analog pedallar ve plak koleksiyonu.',
      trustScore: 97,
      lastHeartbeatAgoSeconds: 20,
      isOnline: true,
      distanceKm: 1.8,
      privacyMode: 'friends_only',
      friendStatus: 'pending'
    },
    timestamp: '10 dk önce',
    songContext: 'Duman - Kırmış Kalbini dinlerken sana arkadaşlık isteği gönderdi',
    status: 'pending'
  }
];

export const INITIAL_LOUNGE_USERS: LoungeUser[] = [
  {
    id: 'user-defne',
    name: 'Defne Kaya',
    age: 23,
    city: 'İstanbul (Moda)',
    avatarSeed: 'DK',
    avatarGradient: 'from-amber-500 to-rose-600',
    platform: 'youtube_music',
    currentSecond: 142, // Exactly on Duman Guitar Solo!
    statusBubble: '01:42 solosunda tüyler diken diken 🎸',
    statusLikesCount: 14,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Mor ve Ötesi', 'She Past Away', 'The Cure'],
    bio: 'Kadıköy plak dükkanları, gece sürüşü ve canlı performanslar.',
    trustScore: 99,
    lastHeartbeatAgoSeconds: 4,
    isOnline: true,
    distanceKm: 2.1,
    privacyMode: 'public',
    friendStatus: 'none'
  },
  {
    id: 'user-mert',
    name: 'Mert Aksoy',
    age: 26,
    city: 'İstanbul (Kadıköy)',
    avatarSeed: 'MA',
    avatarGradient: 'from-amber-500 to-orange-700',
    platform: 'youtube_music',
    currentSecond: 142,
    statusBubble: 'Batu Mutlugil solosu ve overdrive pedalları efsane.',
    statusLikesCount: 9,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Teoman', 'Mor ve Ötesi'],
    bio: 'Rock konserlerinde ön sıra müdavimi. Analog pedallar ve plak koleksiyonu.',
    trustScore: 97,
    lastHeartbeatAgoSeconds: 6,
    isOnline: true,
    distanceKm: 1.8,
    privacyMode: 'public',
    friendStatus: 'none'
  },
  {
    id: 'user-can',
    name: 'Can Demirel',
    age: 25,
    city: 'İstanbul (Beşiktaş)',
    avatarSeed: 'CD',
    avatarGradient: 'from-cyan-500 to-blue-700',
    platform: 'spotify',
    currentSecond: 138, // Close to guitar solo!
    statusBubble: 'Kulaklığı takıp dünyayı kapattım.',
    statusLikesCount: 6,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Büyük Ev Ablukada', 'Jakuzi', 'Erkin Koray'],
    bio: 'Bas gitarist, analog pedallar ve saykodelik rock meraklısı.',
    trustScore: 96,
    lastHeartbeatAgoSeconds: 12,
    isOnline: true,
    distanceKm: 4.5,
    privacyMode: 'friends_only',
    friendStatus: 'friends' // Arkadaş
  },
  {
    id: 'user-eren',
    name: 'Eren Tunç',
    age: 24,
    city: 'İzmir (Alsancak)',
    avatarSeed: 'ET',
    avatarGradient: 'from-emerald-500 to-teal-800',
    platform: 'youtube_music',
    currentSecond: 85, // Chorus
    statusBubble: 'Bu nakarat asla eskimez 🔥',
    statusLikesCount: 11,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Arctic Monkeys', 'She Past Away'],
    bio: 'Müzik dinlemeden gün geçiremeyen bir ses mühendisi adayı.',
    trustScore: 98,
    lastHeartbeatAgoSeconds: 8,
    isOnline: true,
    distanceKm: 320,
    privacyMode: 'public',
    friendStatus: 'none'
  },
  {
    id: 'user-selin',
    name: 'Selin Yılmaz',
    age: 22,
    city: 'Ankara (Çankaya)',
    avatarSeed: 'SY',
    avatarGradient: 'from-violet-500 to-purple-800',
    platform: 'youtube_music',
    currentSecond: 28, // Intro
    statusBubble: 'Şarkının başındaki riff beni benden alıyor.',
    statusLikesCount: 7,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Mor ve Ötesi', 'Radiohead'],
    bio: 'Yağmurlu günlerde kahve ve rock playlistleri.',
    trustScore: 95,
    lastHeartbeatAgoSeconds: 15,
    isOnline: true,
    distanceKm: 410,
    privacyMode: 'private',
    friendStatus: 'none'
  },
  {
    id: 'user-burak',
    name: 'Burak Çetin',
    age: 27,
    city: 'İstanbul (Cihangir)',
    avatarSeed: 'BÇ',
    avatarGradient: 'from-rose-600 to-orange-700',
    platform: 'youtube_music',
    currentSecond: 145,
    statusBubble: 'Kaan Tangöze vokali ve Fender amfi sıcaklığı ⚡',
    statusLikesCount: 8,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Adamlar', 'The White Stripes'],
    bio: 'Analog fotoğrafçılık ve 90lar grunge rock.',
    trustScore: 94,
    lastHeartbeatAgoSeconds: 10,
    isOnline: true,
    distanceKm: 5.2,
    privacyMode: 'public',
    friendStatus: 'none'
  },
  {
    id: 'user-melis',
    name: 'Melis Arslan',
    age: 21,
    city: 'Eskişehir (Tepebaşı)',
    avatarSeed: 'MA',
    avatarGradient: 'from-fuchsia-500 to-pink-700',
    platform: 'youtube_music',
    currentSecond: 215,
    statusBubble: 'Kapanış melodisi ruhuma iyi geliyor ✨',
    statusLikesCount: 5,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Yüzyüzeyken Konuşuruz', 'Jakuzi'],
    bio: 'Edebiyat öğrencisi, plak toplayıcısı ve konser aşığı.',
    trustScore: 97,
    lastHeartbeatAgoSeconds: 18,
    isOnline: true,
    distanceKm: 280,
    privacyMode: 'public',
    friendStatus: 'none'
  },
  {
    id: 'user-kaan',
    name: 'Kaan Yıldız',
    age: 28,
    city: 'İstanbul (Kadıköy Rıhtım)',
    avatarSeed: 'KY',
    avatarGradient: 'from-blue-600 to-indigo-800',
    platform: 'spotify',
    currentSecond: 142,
    statusBubble: 'Kadıköy sokaklarında gece yürüyüşü...',
    statusLikesCount: 4,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Teoman', 'Nirvana'],
    bio: 'Yazılımcı, gece kuşu ve Duman konserlerinin gediklisi.',
    trustScore: 93,
    lastHeartbeatAgoSeconds: 5,
    isOnline: true,
    distanceKm: 1.4,
    privacyMode: 'public',
    friendStatus: 'none'
  },
  {
    id: 'user-deniz',
    name: 'Deniz Korkmaz',
    age: 24,
    city: 'İstanbul (Karaköy)',
    avatarSeed: 'DK',
    avatarGradient: 'from-teal-500 to-emerald-700',
    platform: 'youtube_music',
    currentSecond: 85,
    statusBubble: 'O zalim seni hiç sevmedi mi derken eşlik etmek 🖤',
    statusLikesCount: 12,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Mor ve Ötesi', 'Depeche Mode'],
    bio: 'Tasarımcı, vintage posterler ve lo-fi ritimler.',
    trustScore: 98,
    lastHeartbeatAgoSeconds: 22,
    isOnline: true,
    distanceKm: 3.8,
    privacyMode: 'public',
    friendStatus: 'none'
  },
  {
    id: 'user-cem',
    name: 'Cem Öztürk',
    age: 26,
    city: 'Bursa (Nilüfer)',
    avatarSeed: 'CÖ',
    avatarGradient: 'from-amber-600 to-yellow-700',
    platform: 'youtube_music',
    currentSecond: 110,
    statusBubble: 'Uzun yolda arabada son ses dinlenir!',
    statusLikesCount: 3,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Erkin Koray', 'Barış Manço'],
    bio: 'Otomobil ve Anadolu Rock tutkunu.',
    trustScore: 91,
    lastHeartbeatAgoSeconds: 30,
    isOnline: true,
    distanceKm: 140,
    privacyMode: 'public',
    friendStatus: 'none'
  },
  {
    id: 'user-zeynep',
    name: 'Zeynep Aktaş',
    age: 23,
    city: 'İstanbul (Şişli)',
    avatarSeed: 'ZA',
    avatarGradient: 'from-purple-600 to-indigo-900',
    platform: 'youtube_music',
    currentSecond: 142,
    statusBubble: 'Batu solosuna geldim, gitmiyorum 🎶',
    statusLikesCount: 10,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Arctic Monkeys', 'The Strokes'],
    bio: 'Psikoloji öğrencisi, indie rock ve festival kampçısı.',
    trustScore: 96,
    lastHeartbeatAgoSeconds: 7,
    isOnline: true,
    distanceKm: 7.1,
    privacyMode: 'private',
    friendStatus: 'none'
  },
  {
    id: 'user-tolga',
    name: 'Tolga Vural',
    age: 29,
    city: 'Antalya (Muratpaşa)',
    avatarSeed: 'TV',
    avatarGradient: 'from-orange-500 to-red-700',
    platform: 'spotify',
    currentSecond: 50,
    statusBubble: 'Deniz kenarında gün batımı ve Duman.',
    statusLikesCount: 6,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Kurban', 'Pentagram'],
    bio: 'Elektro gitar, dalış ve Akdeniz rüzgarı.',
    trustScore: 95,
    lastHeartbeatAgoSeconds: 14,
    isOnline: true,
    distanceKm: 510,
    privacyMode: 'public',
    friendStatus: 'none'
  },
  {
    id: 'user-beren',
    name: 'Beren Koç',
    age: 22,
    city: 'İstanbul (Üsküdar)',
    avatarSeed: 'BK',
    avatarGradient: 'from-pink-500 to-rose-700',
    platform: 'youtube_music',
    currentSecond: 142,
    statusBubble: 'Vapurda kulaklıkta çalan tek şarkı.',
    statusLikesCount: 15,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Mor ve Ötesi', 'Büyük Ev Ablukada'],
    bio: 'Boğaz manzarası, şiir ve alternatif rock.',
    trustScore: 99,
    lastHeartbeatAgoSeconds: 3,
    isOnline: true,
    distanceKm: 4.0,
    privacyMode: 'public',
    friendStatus: 'none'
  },
  {
    id: 'user-sinan',
    name: 'Sinan Erdem',
    age: 25,
    city: 'İstanbul (Kadıköy)',
    avatarSeed: 'SE',
    avatarGradient: 'from-lime-600 to-emerald-800',
    platform: 'spotify',
    currentSecond: 142,
    statusBubble: 'Gitar solosu her dinleyişte bambaşka hissettiriyor.',
    statusLikesCount: 8,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Teoman', 'Daft Punk'],
    bio: 'DJ, prodüksiyon ve canlı miks denemeleri.',
    trustScore: 94,
    lastHeartbeatAgoSeconds: 9,
    isOnline: true,
    distanceKm: 2.3,
    privacyMode: 'public',
    friendStatus: 'none'
  },
  {
    id: 'user-arda',
    name: 'Arda Güler',
    age: 23,
    city: 'İstanbul (Kadıköy Bahariye)',
    avatarSeed: 'AG',
    avatarGradient: 'from-lime-500 to-green-700',
    platform: 'youtube_music',
    currentSecond: 142,
    statusBubble: 'Bahariye caddesinde kulaklıkta Duman yankılanıyor ⚡',
    statusLikesCount: 19,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Mor ve Ötesi', 'Son Feci Bisiklet'],
    bio: 'Kadıköy sokak müzisyeni ve indie gitaristi.',
    trustScore: 99,
    lastHeartbeatAgoSeconds: 2,
    isOnline: true,
    distanceKm: 0.7,
    privacyMode: 'public',
    friendStatus: 'none'
  },
  {
    id: 'user-ece',
    name: 'Ece Aydın',
    age: 22,
    city: 'İstanbul (Kadıköy Çarşı)',
    avatarSeed: 'EA',
    avatarGradient: 'from-amber-400 to-rose-600',
    platform: 'spotify',
    currentSecond: 140,
    statusBubble: 'Çarşıda kafede kahve ve Kaan Tangöze.',
    statusLikesCount: 11,
    hasLikedStatus: false,
    topArtists: ['Duman', 'Teoman', 'Jakuzi'],
    bio: 'Fotoğrafçılık ve canlı müzik tutkunu.',
    trustScore: 98,
    lastHeartbeatAgoSeconds: 5,
    isOnline: true,
    distanceKm: 0.9,
    privacyMode: 'public',
    friendStatus: 'none'
  }
];

export const INITIAL_LOUNGE_CONVERSATIONS: LoungeConversation[] = [
  {
    matchId: 'conv-defne',
    user: INITIAL_LOUNGE_USERS[0],
    matchedTrack: SAMPLE_SONGS[0],
    matchedSecond: 102,
    matchedPlatform: 'youtube_music',
    contextBanner: 'İkiniz de YouTube Music\'te Duman - Kırmış Kalbini dinlerken (01:42\'de) aynı frekansta buluştunuz.',
    lastMessage: 'Ben de tam o solo girdiği anda frekans gönderdim, harika zamanlama!',
    lastMessageTime: '14:32',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-1',
        senderId: 'user-defne',
        text: '🎸 Bu şarkının 01:42 gitar solosunu dinle! Tam bu saniyede karşılaştık.',
        timestamp: '14:30'
      },
      {
        id: 'msg-2',
        senderId: 'me',
        text: 'Selam Defne! İnanılmaz bir tesadüf, o soloyu her dinleyişimde tüylerim diken diken oluyor.',
        timestamp: '14:31'
      },
      {
        id: 'msg-3',
        senderId: 'user-defne',
        text: 'Ben de tam o solo girdiği anda frekans gönderdim, harika zamanlama!',
        timestamp: '14:32'
      }
    ]
  }
];
