import React from 'react';
import { X, Code2, Server, Smartphone, CheckCircle2, Layers, Cpu, Radio } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const RoadmapModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const stages = [
    {
      num: '01',
      title: 'Temel Altyapı & Evrensel Medya Motoru',
      tech: 'Flutter + Kotlin NotificationListenerService + MediaSessionManager',
      desc: 'YouTube Music, Spotify ve Apple Music’ten çalan parçanın başlığını, sanatçısını ve anlık oynatma saniyesini yerel Android köprüsüyle yakalar.'
    },
    {
      num: '02',
      title: 'Parça Normalizasyonu & Kanonik ID Resolver',
      tech: 'Cloud Functions + Regex Clean Engine',
      desc: '"Duman - Kırmış Kalbini (Official Video) 4K" gibi kirli başlıkları standart "duman : kirmis kalbini" formatına ve tekil trk_ kanonik ID\'ye dönüştürür.'
    },
    {
      num: '03',
      title: 'Gerçek Zamanlı Frekans Odaları & Heartbeat',
      tech: 'Firebase Realtime Database (rooms/{track_id})',
      desc: '30 saniyede bir nabız sinyali; müzik durduğunda veya 45s sinyal kesilince odadan otomatik çıkarma (onDisconnect). 0 hayalet profil.'
    },
    {
      num: '04',
      title: 'Senkronize Timeline & Sosyal Katman',
      tech: 'Flutter CustomPainter / Web Canvas',
      desc: 'Şarkının ilerleme çubuğu üzerinde aynı saniyedeki dinleyici avatarları, uçuşan emoji tepkileri ve tek dokunuşla müzikal buzkırıcılar.'
    },
    {
      num: '05',
      title: 'Arka Plan Optimizasyonu & Adil Freemium',
      tech: 'RevenueCat + Discord Nitro Modeli',
      desc: 'Tüm eşleşmeler, mesajlaşmalar ve odalar ücretsiz. Sadece özel plak kozmetikleri ve ekstra profil temaları ücretli.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                MİMARİ & 5 AŞAMALI YOL HARİTASI
              </h3>
              <p className="text-[11px] text-neutral-400">
                Flutter + Firebase Realtime DB + Android Kotlin Bridge
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Tech Stack Banner */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2 bg-neutral-900/60 rounded-xl">
              <Smartphone className="w-4 h-4 text-lime-400 mx-auto mb-1" />
              <div className="text-[10px] text-neutral-400">Frontend</div>
              <div className="font-bold text-white text-xs mt-0.5">Flutter / Dart</div>
            </div>
            <div className="p-2 bg-neutral-900/60 rounded-xl">
              <Cpu className="w-4 h-4 text-red-400 mx-auto mb-1" />
              <div className="text-[10px] text-neutral-400">Yerel Köprü</div>
              <div className="font-bold text-white text-xs mt-0.5">Android Kotlin</div>
            </div>
            <div className="p-2 bg-neutral-900/60 rounded-xl">
              <Radio className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-[10px] text-neutral-400">Canlı Senkron</div>
              <div className="font-bold text-white text-xs mt-0.5">Realtime DB</div>
            </div>
            <div className="p-2 bg-neutral-900/60 rounded-xl">
              <Server className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <div className="text-[10px] text-neutral-400">Kalıcı Veri</div>
              <div className="font-bold text-white text-xs mt-0.5">Firestore</div>
            </div>
          </div>

          {/* Stages */}
          <div className="space-y-3 pt-2">
            {stages.map((st) => (
              <div
                key={st.num}
                className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700 transition space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lime-400 font-bold text-xs">
                    AŞAMA {st.num}: {st.title}
                  </span>
                  <span className="text-[10px] text-neutral-500">{st.tech}</span>
                </div>
                <p className="text-neutral-300 font-sans text-xs leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs">
          <span className="text-neutral-500">SPEC.md projenin kök dizininde hazır.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-lime-400 text-neutral-950 font-bold text-xs hover:bg-lime-300 transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
