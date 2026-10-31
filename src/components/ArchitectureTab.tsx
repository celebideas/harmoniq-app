import React, { useState } from 'react';
import { Code2, Server, Smartphone, CheckCircle2, Copy, Check, FileText } from 'lucide-react';

export const ArchitectureTab: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<'kotlin' | 'firebase' | 'functions'>('kotlin');
  const [copied, setCopied] = useState(false);

  const kotlinCode = `// Android Native Bridge: MediaNotificationListener.kt
package com.harmoniq.app.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.media.session.MediaSessionManager
import android.media.MediaMetadata

class MediaNotificationListener : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        // Sadece desteklenen müzik uygulamalarını dinle
        if (packageName in listOf("com.google.android.apps.youtube.music", "com.spotify.music")) {
            val extras = sbn.notification.extras
            val trackTitle = extras.getString("android.title") ?: ""
            val artist = extras.getString("android.text") ?: ""
            
            // Flutter tarafına MethodChannel ile fırlat
            HarmoniqFlutterBridge.sendMediaUpdate(
                rawTitle = trackTitle,
                artist = artist,
                platform = packageName
            )
        }
    }
}`;

  const firebaseSchema = `// Firebase Realtime Database Structure
{
  "rooms": {
    "trk_duman_kirmiskalbini": {
      "track_id": "trk_duman_kirmiskalbini",
      "canonical_title": "Duman - Kırmış Kalbini",
      "duration_sec": 252,
      "listeners": {
        "user_defne": {
          "user_id": "user_defne",
          "name": "Defne Kaya",
          "platform": "youtube_music",
          "current_second": 142,
          "status_bubble": "01:42 solosunda tüyler diken diken 🎸",
          "last_heartbeat": 1728892400
        },
        "user_can": {
          "user_id": "user_can",
          "name": "Can Demirel",
          "platform": "spotify",
          "current_second": 138,
          "last_heartbeat": 1728892395
        }
      }
    }
  }
}`;

  const functionsCode = `// Cloud Functions: trackResolver.ts
export function resolveCanonicalTrack(rawTitle: string): CanonicalTrack {
  // Regex ile gereksiz video/audio takılarını temizle
  const cleanTitle = rawTitle
    .replace(/\\s*[\\[\\(](official\\s*(video|audio)|4k|hd|remastered|live)[\\]\\)]/gi, '')
    .trim();

  const [artist, song] = cleanTitle.split(/\\s*-\\s*/);
  const canonicalId = \`trk_\${slugify(artist)}_\${slugify(song)}\`;
  
  return {
    canonicalId,
    artist: artist.trim(),
    song: song.trim()
  };
}`;

  const handleCopy = () => {
    const textToCopy =
      activeCodeTab === 'kotlin'
        ? kotlinCode
        : activeCodeTab === 'firebase'
        ? firebaseSchema
        : functionsCode;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-5 text-xs">
      {/* Title */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-2">
        <div className="flex items-center gap-2.5">
          <Code2 className="w-5 h-5 text-lime-400" />
          <h2 className="text-base font-heading font-bold text-white tracking-tight">
            Şartname & Kod Mimarisi
          </h2>
        </div>
        <p className="text-neutral-400 text-xs leading-relaxed">
          Uygulamanın Flutter, Kotlin Android yerel köprüsü, Firebase Realtime Database şeması ve Cloud Functions parça normalizasyon motorunun kod yapısı projenin <strong className="text-lime-400 font-medium">SPEC.md</strong> dosyasında derlenmiştir.
        </p>
      </div>

      {/* Code Snippet Tabs */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2.5 bg-neutral-950">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCodeTab('kotlin')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeCodeTab === 'kotlin'
                  ? 'bg-neutral-800 text-lime-400'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Kotlin Service (Android)
            </button>
            <button
              onClick={() => setActiveCodeTab('firebase')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeCodeTab === 'firebase'
                  ? 'bg-neutral-800 text-lime-400'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Firebase Realtime DB
            </button>
            <button
              onClick={() => setActiveCodeTab('functions')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeCodeTab === 'functions'
                  ? 'bg-neutral-800 text-lime-400'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Track Normalizer (Regex)
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-bold transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-lime-400" />
                <span>Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Kodu Kopyala</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-5 text-[11px] font-mono leading-relaxed overflow-x-auto text-neutral-300 bg-[#07080a]">
          {activeCodeTab === 'kotlin' && kotlinCode}
          {activeCodeTab === 'firebase' && firebaseSchema}
          {activeCodeTab === 'functions' && functionsCode}
        </pre>
      </div>

      {/* 5 Stages Summary */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-lime-400" />
          <span>5 AŞAMALI YOL HARİTASI İLERLEMESİ</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80">
            <span className="text-lime-400 font-bold">Aşama 1:</span> Evrensel Medya Motoru & MediaSession
            <p className="text-neutral-400 mt-1 font-sans">
              Android Kotlin NotificationListenerService ile YouTube Music & Spotify anlık yakalama.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80">
            <span className="text-lime-400 font-bold">Aşama 2:</span> Parça Normalizasyonu
            <p className="text-neutral-400 mt-1 font-sans">
              Kirli başlıkları temizleyip tekil trk_ kanonik ID altında buluşturma.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80">
            <span className="text-lime-400 font-bold">Aşama 3:</span> Frekans Odaları & Heartbeat
            <p className="text-neutral-400 mt-1 font-sans">
              30s nabız sinyali; 45s kesintide otomatik çıkarma. %100 canlı dinleyici garantisi.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80">
            <span className="text-lime-400 font-bold">Aşama 4:</span> Senkronize Timeline Matching
            <p className="text-neutral-400 mt-1 font-sans">
              Şarkının 01:42 gitar solosundaki dinleyicilerin saniyesi saniyesine birbirini görmesi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
