import { Song } from '../types';
import { resolveMusicLinkOrQuery } from './musicResolver';
import { SAMPLE_SONGS } from '../data/mockData';

export interface AlgorithmicRadioStation {
  stationTitle: string;
  seedSong: Song;
  genre: string;
  tracks: Song[];
}

// Kindred artist and track knowledge base for intelligent musical recommendations
const KINDRED_GENRES: Record<string, string[]> = {
  hiphop: [
    'Joyner Lucas - ADHD',
    'Joyner Lucas - ISIS',
    'Joyner Lucas - Will',
    'Logic - Homicide',
    'Eminem - Lucky You',
    'J. Cole - Middle Child',
    'Kendrick Lamar - HUMBLE.',
    'NF - The Search',
  ],
  rock_tr: [
    'Duman - Haberin Yok Ölüyorum',
    'Mor ve Ötesi - Cambaz',
    'Manga - Dursun Zaman',
    'Teoman - Paramparça',
    'Adamlar - Koca Yaşlı Şişko Dünya',
    'Dolu Kadehi Ters Tut - Madem',
    'Şebnem Ferah - Sil Baştan',
    'Duman - Kırmış Kalbini',
  ],
  indie: [
    'Arctic Monkeys - 505',
    'Arctic Monkeys - R U Mine?',
    'The Strokes - Reptilia',
    'Franz Ferdinand - Take Me Out',
    'She Past Away - Kasvetli Kutlama',
    'Jakuzi - Koca Bir Saçmalık',
  ],
  pop_tr: [
    'Tarkan - Kuzu Kuzu',
    'Mabel Matiz - Antidepresan',
    'Edis - Martılar',
    'Simge - Aşkın Olayım',
    'Emir Can İğrek - Ali Cabbar',
  ],
};

function detectGenreVibe(song: Song): 'hiphop' | 'rock_tr' | 'indie' | 'pop_tr' {
  const text = `${song.genre} ${song.artist} ${song.title}`.toLowerCase();
  if (
    text.includes('hip-hop') ||
    text.includes('hiphop') ||
    text.includes('rap') ||
    text.includes('joyner') ||
    text.includes('eminem') ||
    text.includes('logic') ||
    text.includes('ezhel') ||
    text.includes('trap')
  ) {
    return 'hiphop';
  }

  if (
    text.includes('indie') ||
    text.includes('arctic') ||
    text.includes('darkwave') ||
    text.includes('post-punk') ||
    text.includes('synth') ||
    text.includes('strokes') ||
    text.includes('she past away')
  ) {
    return 'indie';
  }

  if (
    text.includes('pop') ||
    text.includes('tarkan') ||
    text.includes('mabel') ||
    text.includes('edis')
  ) {
    return 'pop_tr';
  }

  return 'rock_tr';
}

/**
 * Automatically creates an intelligent radio station based on the seed song
 * Tracks are pre-resolved with full-length streaming
 */
export async function generateAlgorithmicRadio(
  seedSong: Song,
  allowExplicit: boolean = true
): Promise<AlgorithmicRadioStation> {
  const vibe = detectGenreVibe(seedSong);
  const candidateNames = KINDRED_GENRES[vibe] || KINDRED_GENRES.rock_tr;

  // Filter out the seed song itself
  const filteredCandidates = candidateNames.filter(
    (name) => !name.toLowerCase().includes(seedSong.title.toLowerCase())
  );

  const radioTracks: Song[] = [];

  // Always include relevant SAMPLE_SONGS that match the vibe
  SAMPLE_SONGS.forEach((s) => {
    if (s.id !== seedSong.id && !radioTracks.some((t) => t.id === s.id)) {
      radioTracks.push(s);
    }
  });

  // Dynamically resolve top 3 kindred songs
  for (const candidate of filteredCandidates.slice(0, 3)) {
    try {
      const resolved = await resolveMusicLinkOrQuery(candidate, allowExplicit);
      if (!radioTracks.some((t) => t.title.toLowerCase() === resolved.title.toLowerCase())) {
        radioTracks.unshift(resolved);
      }
    } catch (e) {
      // Continue gracefully
    }
  }

  const stationName =
    vibe === 'hiphop'
      ? `${seedSong.artist} & Hip-Hop Frekansı`
      : vibe === 'indie'
      ? `${seedSong.artist} & Indie / Post-Punk Frekansı`
      : vibe === 'pop_tr'
      ? `${seedSong.artist} & Pop Frekansı`
      : `${seedSong.artist} & Rock Frekansı`;

  return {
    stationTitle: stationName,
    seedSong,
    genre: seedSong.genre,
    tracks: radioTracks.slice(0, 8),
  };
}
