import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Download,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  Radio,
  QrCode,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess: () => void;
  onCheckForUpdates?: () => Promise<boolean>;
  isCheckingUpdates?: boolean;
}

export const InstallAppModal: React.FC<Props> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess,
  onCheckForUpdates,
  isCheckingUpdates = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeOsTab, setActiveOsTab] = useState<'android' | 'ios'>('android');
  const [isStandalone, setIsStandalone] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);

  // Public Shared App URL (Accessible on any mobile phone without Google Cloud 403 Forbidden login)
  const PUBLIC_APP_URL = 'https://ais-pre-s47peuj6c7jqizv66k3tps-689522803659.europe-west1.run.app/';

  // Compute clean URL: automatically convert any ais-dev- domain into ais-pre-
  const cleanPublicUrl =
    typeof window !== 'undefined' && window.location.href && !window.location.href.includes('about:')
      ? window.location.href.split('#')[0].replace('ais-dev-', 'ais-pre-')
      : PUBLIC_APP_URL;

  const [customUrl, setCustomUrl] = useState<string>('');
  const [useCustomUrl, setUseCustomUrl] = useState<boolean>(false);

  // Active URL to scan or copy: always default to the public 403-free ais-pre URL
  const activeUrl = useCustomUrl && customUrl.trim() ? customUrl.trim() : cleanPublicUrl;

  useEffect(() => {
    // Detect OS
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) {
      setActiveOsTab('ios');
    } else {
      setActiveOsTab('android');
    }

    // Check if running as standalone PWA
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Generate REAL scannable QR Code
    QRCode.toDataURL(activeUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate real QR code:', err));
  }, [isOpen, activeUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDirectInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        onInstallSuccess();
        onClose();
      }
    }
  };

  const handleCheckUpdates = async () => {
    if (onCheckForUpdates) {
      setUpdateFeedback('Güncellemeler kontrol ediliyor...');
      const hasLatest = await onCheckForUpdates();
      if (hasLatest) {
        setUpdateFeedback('Uygulama sunucuyla senkronize ve güncel! ✨');
      } else {
        setUpdateFeedback('Uygulama en son sürümde.');
      }
      setTimeout(() => setUpdateFeedback(null), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-500 text-neutral-950 flex items-center justify-center shadow-lg shrink-0">
            <Smartphone className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-lg font-heading font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Telefona Yükle</span>
              <span className="px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-400 text-[10px] font-bold">
                Mobil Uygulama
              </span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Harmoniq'i akıllı telefonunda tam ekran, reklamsız ve bağımsız uygulama olarak kullanın.
            </p>
          </div>
        </div>

        {/* Status: Standalone Mode */}
        {isStandalone ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-emerald-300 block">
                Uygulama Zaten Ana Ekranınızda!
              </span>
              <span className="text-neutral-300">
                Şu anda bağımsız mobil modda çalışıyorsunuz. Kesintisiz müzik ve odalar hazır.
              </span>
            </div>
          </div>
        ) : (
          /* Direct 1-Click Install Button if supported by browser */
          deferredPrompt && (
            <button
              onClick={handleDirectInstall}
              className="w-full py-3.5 px-4 rounded-2xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-heading font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-lime-400/20 transition group"
            >
              <Download className="w-5 h-5 stroke-[2.5] group-hover:translate-y-0.5 transition-transform" />
              <span>Tek Tıkla Telefona Kur</span>
            </button>
          )
        )}

        {/* 2. REAL SCANNABLE QR CODE & DIRECT LINK ZONE */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-200 font-bold flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-lime-400" />
              <span>Telefon Kamerasıyla Tara & Başlat:</span>
            </span>
            <span className="text-[11px] text-lime-400 font-medium">Canlı QR Kod</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 bg-neutral-900/80 p-3 rounded-2xl border border-neutral-800/80">
            {/* Real scannable QR Code image */}
            <div className="p-2 bg-white rounded-2xl shadow-xl shrink-0 flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Harmoniq Uygulaması QR Kodu"
                  className="w-36 h-36 object-contain"
                />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center text-neutral-500 text-xs">
                  QR Hazırlanıyor...
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2.5 text-center sm:text-left w-full">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Telefonunuzun <strong>kamerasını</strong> bu QR koda tutun veya aşağıdaki butona tıklayarak bağlantıyı doğrudan kopyalayın:
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCopyLink}
                  className="w-full py-2.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-neutral-950" />
                      <span>Bağlantı Panoya Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Uygulama Linkini Kopyala</span>
                    </>
                  )}
                </button>

                <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-400 truncate max-w-full text-left">
                  {activeUrl}
                </div>

                {/* Custom URL Option for Shared Links */}
                <div className="pt-1">
                  <button
                    onClick={() => setUseCustomUrl(!useCustomUrl)}
                    className="text-[11px] text-neutral-400 hover:text-lime-400 underline transition"
                  >
                    {useCustomUrl ? 'Geliştirme Linkine Dön' : 'Farklı Bir Paylaşım Linki mi Kullanıyorsunuz? (QR Değiştir)'}
                  </button>

                  {useCustomUrl && (
                    <div className="mt-2 space-y-1.5">
                      <input
                        type="url"
                        placeholder="Örn: AI Studio Share Linkini Yapıştırın"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400"
                      />
                      <span className="text-[10px] text-neutral-400 block text-left">
                        Yapıştırdığınız linke göre QR kod anında yeniden üretilecektir.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. OS Platform Installation Steps */}
        <div className="space-y-3">
          <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800">
            <button
              onClick={() => setActiveOsTab('android')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                activeOsTab === 'android'
                  ? 'bg-neutral-800 text-lime-400 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Android (Chrome / Samsung)
            </button>
            <button
              onClick={() => setActiveOsTab('ios')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                activeOsTab === 'ios'
                  ? 'bg-neutral-800 text-lime-400 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              iPhone / iPad (Safari)
            </button>
          </div>

          {/* Android Steps */}
          {activeOsTab === 'android' && (
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-3 text-xs">
              <span className="text-neutral-300 font-bold block">
                Android'de 2 Adımda Ana Ekrana Ekleme:
              </span>
              <ol className="space-y-2.5 text-neutral-400">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-lime-400 text-neutral-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <span>
                    Chrome veya tarayıcınızın sağ üstündeki{' '}
                    <strong className="text-white">üç nokta (⋮)</strong> menüsüne dokunun.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-lime-400 text-neutral-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <span>
                    Açılan listeden{' '}
                    <strong className="text-white">"Uygulamayı Yükle"</strong> veya{' '}
                    <strong className="text-white">"Ana Ekrana Ekle"</strong> butonuna dokunun.
                  </span>
                </li>
              </ol>
            </div>
          )}

          {/* iOS Steps */}
          {activeOsTab === 'ios' && (
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-3 text-xs">
              <span className="text-neutral-300 font-bold block">
                iOS Safari'de 2 Adımda Ana Ekrana Ekleme:
              </span>
              <ol className="space-y-2.5 text-neutral-400">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-lime-400 text-neutral-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span>Safari'nin alt menüsündeki</span>
                    <strong className="text-white flex items-center gap-1">
                      <Share2 className="w-3.5 h-3.5 text-lime-400 inline" />
                      Paylaş
                    </strong>
                    <span>butonuna dokunun.</span>
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-lime-400 text-neutral-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span>Açılan menüde aşağı kaydırıp</span>
                    <strong className="text-white flex items-center gap-1">
                      <PlusSquare className="w-3.5 h-3.5 text-lime-400 inline" />
                      Ana Ekrana Ekle
                    </strong>
                    <span>seçeneğini seçin.</span>
                  </span>
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <div className="pt-1">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition"
          >
            Anladım, Uygulamaya Devam Et
          </button>
        </div>
      </div>
    </div>
  );
};
