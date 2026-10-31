# Mimari Uygulama Planı: Harmoniq UX & Veri Doğruluğu

Bu doküman Harmoniq müzik deneyiminde tamamlanan adımları ve mimari standartları özetler.

---

## 1. Tamamlanan Adımlar Özeti

- **Adım 1.1 - 1.4**: Global Layout, Z-Index Çakışmaları, YouTube Music gerçek müzik/sanatçı filtreleme motoru (`isMusicArtistOrChannel`, kara liste), Canlı Odalar ve Kütüphanem uzun liste optimizasyonu.
- **Adım 1.5**: Tam Ekran Müzik Oynatıcı, Dönem Plak/Vinil animasyonu, Canlı Senkronize Sözler (Lyrics) ve Zaman Çizelgesi Patlama Noktaları (Ticks).
- **Adım 1.6**: Zenginleştirilmiş Mesajlar/Sohbet Sekmesi, Aktif Frekans Hikayeleri Şeridi, Güven Rozeti & Saniye Etiketleri, Buzkırıcı Önerileri ve Rezonans Kartı.
- **Adım 1.7 (Güncel)**: Şeffaf Güven Kalkanı (Trust Score), Haftalık Dinleme Tutarlılığı ve Profil Temizliği:
  - **Şeffaf Güven Kalkanı Rozeti & Modalı**: Kullanıcı profilinde `🛡️ Güven Puanı: 98/100 (Doğrulanmış Dinleyici)` rozeti ve 3 sütunlu (Dinleme Tutarlılığı %35, Topluluk Rezonansı %35, Sıfır İhlal %30) hesaplama ve anlık itiraz modalı.
  - **Haftalık Dinleme Tutarlılığı**: Haftada 168 saat sınırına uygun olarak aktif scrobble dinlemesi (21 saat 45 dk, 284 parça) ve "Kütüphane Toplamı: 1071 parça" birbirinden kesin olarak ayrıldı. Gerçek müzik sanatçıları (Duman, Kaan Tangöze, Adamlar, Mor ve Ötesi) zirveye yerleştirildi.
- **Adım 1.8**: Ses Motoru Yarış Durumu (Race Condition) Kilidi, Arka Plan Visibility Sayacı Koruma ve LocalStorage Kota Kalkanı (`compactSong`, `compactPlaylist`, `safeLocalStorageSet`).
- **Adım 2.1 (Güncel)**: Yıkıcı Çözüm 1 – "Aynı Ekranda 3 Oynatıcı" Tekrarını Söküp "Canlı Nabız & Gizlilik Kapsülü" Kurma:
  - **Aynı Ekranda 3 Oynatıcı Tekrarının Kaldırılması**: Canlı (Lounge) sekmesindeyken alttaki Mini Oynatıcı `translate-y-16 opacity-0 pointer-events-none max-h-0` animasyonuyla pürüzsüzce gizlendi; yalnızca Odalar, Sohbet ve Profil sekmelerinde yukarı kayarak açılıyor.
  - **Canlı Nabız & Gizlilik Kapsülü**: Üst bardaki tekrar eden şarkı hapı yerine ortada zümrüt yeşili nefes alan radar noktası, `Canlı: X Frekans` sayacı ve aktif gizlilik durumu (`🌍 Açık` / `👥 Arkadaşlar` / `👻 Hayalet`) yerleştirildi. Tek dokunuşla çalışan cam menüden sayfa değiştirmeden gizlilik modu anında değiştirilebiliyor.
- **Adım 2.2**: Yıkıcı Çözüm 2 – Canlı Sayfasındaki Gereksiz Alt Harita Kutusunu Kaldırıp "Canlı Anlık Tepki Duvarı (Live Vibe Bar)" Koyma:
  - **Gereksiz Alt Harita Kutusunun Kaldırılması**: Üstteki `[Zaman Çizelgesi | Yoğunluk Haritası]` sekmesiyle mükerrer olan alt tanıtım kutusu tamamen kaldırıldı.
  - **"Şarkının Bu Saniyesinde Bırakılan Frekans Notları" (Live Vibe Stream)**: Dinleyicilerin şarkının saniyelerine bıraktığı zaman damgalı kartlar (`DK • 01:42 — Gitar solosu tüyleri diken diken etti 🎸`, `ET • 02:15`, `SY • 00:28`) yatay kaydırılabilir cam kartlar halinde entegre edildi. Herhangi bir nota tıklandığında şarkı doğrudan o saniyeye sarılıyor (`onSeekSecond`) ve dinleyici profil/sohbet aksiyonu açılıyor.
  - **"Anı Yakala Barı" (Live Vibe Bar)**: `⚡ Tüyler Diken`, `🔥 Efsane Solo`, `🎸 Ritim Harika`, `🖤 Tam Modum` ve `✍️ Saniyeye Not Bırak` butonları eklendi. Tek dokunuşla o an çalan saniyeye not fırlatılıyor, zaman çizelgesi üzerinde yukarı doğru süzülen mikro animasyon (`.animate-float-up`) ve haptik bildirim tetikleniyor.
- **Adım 2.3**: Yıkıcı Çözüm 3 – Zaman Çizelgesi Üzerinde "Senkron Dinleme (Sync-Listen)" ve "Sıradaki Şarkıyı Fısılda":
  - **"Frekansı Eşitle (Sync-Listen / Canlı Kilitlenme)"**:
    - Zaman çizelgesindeki dinleyici avatarına tıklandığında açılan kartta `🔗 Frekansı Eşitle (02:18'e Katıl)` butonu eklendi.
    - Tıklandığında kullanıcının oynatıcısı o dinleyicinin saniyesine kilitlenir (`onSeekSecond`), zaman çizelgesi rayı üzerinde kullanıcının "Sen" ibresiyle dinleyicinin ibresi arasında parlayan neon lazer bağı (laser/wave link) çizilir ve `⚡ [Kullanıcı] seninle aynı saniyeye kilitlendi` bildirimi tetiklenir.
    - Zaman çizelgesi başlığında `🔗 [Kullanıcı] ile senkronize dinleniyor` durumu ve tek tıkla `Ayır ✕` seçeneği sunulur.
  - **"Sıradaki Şarkıyı Öner (Whisper Next Track)" Buzkırıcısı**:
    - Dinleyici kartında `🎧 Sıradaki Şarkıyı Öner` aksiyonu ile açılan akordeon menüde kullanıcının beğenilen şarkılarından veya şarkı radyosundan 3 parça listelenir.
    - `"Bu şarkı bittiğinde şuna geçmelisin"` notuyla tek tıkla parçayı fısıldama, kart içi anlık onay (`✨ [Şarkı] fısıldandı!`), sistem toast bildirimi ve sohbet konuşmasına doğrudan ekleme mekanizması kuruldu.
- **Adım 2.4**: Yıkıcı Çözüm 4 – Tam Ekran Oynatıcıda "Dokunmatik Dönen Plak (Turntable)" ve İlerleme Çubuğu Sıcak Noktaları:
  - **İlerleme Çubuğu Üzerinde "Müzikal Yoğunluk & Solo Sıcak Noktaları (Audio Hotspots)"**: 48 barlık akustik enerji dalgası, parlayan elmas sıcak noktaları (`00:28 Giriş`, `01:25 Nakarat`, `01:42 Gitar Solosu`) ve anlık bölüm geçiş rozeti.
  - **Gerçekçi Dokunmatik Plak (Interactive Vinyl Turntable) Modu**: Dinamik alt ışık (ambient platter glow), gerçekçi plak olukları (grooves) ve şarkı çalarken inip durunca kalkan mekanik pikap kolu (tonearm).
- **Adım 2.5**: Yıkıcı Çözüm 5 – Profildeki Ayar Kutularını Kaldırıp "Paylaşılabilir Müzikal Aura Hikaye Kartı" Kurma:
  - **Hantal Ayar Kutularını Ana Ekrandan Söküp Çekmeceye Taşıma**: Profil başlığına `⚙️ Ayarlar & Hesap` butonu entegre edildi. Tema, Google/YouTube senkronizasyonu ve görünürlük kontrolleri cam alt çekmeceye alındı.
  - **Müzikal Aura & Frekans Kimlik Kartı (Shareable Story Card)**: 9:16 oranında Instagram Story / Spotify Wrapped formatında kart, HTML5 Canvas 1080x1920 PNG çıktısı ve Web Share API desteği kuruldu.
- **Adım 2.6 (Güncel)**: Yıkıcı Çözüm 6 – Sohbet İçinde "Canlı Ortak Dinleme Kutusu (Co-Listening Bar)":
  - **Sohbet Üstü "Canlı Ortak Frekans Çubuğu (Co-Listening Bar)"**:
    - Sohbet detay penceresinin üst başlığının hemen altına kompakt cam dokulu ortak frekans barı yerleştirildi.
    - Karşılaşılan şarkı ve tam saniye (`🎵 [Şarkı Adı] • [01:42]'de karşılaştınız`) ve `Ortak Frekans / Tanışma Anı` rozeti konumlandırıldı.
    - **`▶ Birlikte Dinle`** butonu eklendi; tıklandığında o şarkı tam karşılaşılan saniyeden iki kullanıcı için eşzamanlı çalınır ve buton `⚡ Birlikte Dinleniyor` animasyonlu dalgasına dönüşür.
  - **Sohbet İçi İnteraktif Şarkı ve Saniye Kartları**:
    - Mesaj yazma alanının solundaki `Saniye Paylaş (+/🎵)` butonuna tıklandığında açılan "Canlı Saniye & Ses Kartı Gönder" sahnesi eklendi.
    - O an dinlenen şarkının spesifik saniyesini interaktif scrubber veya hızlı sıcak nokta etiketleriyle (`00:28 Giriş`, `01:25 Nakarat`, `01:42 Gitar Solosu`) seçme ve `"🎸 Bu şarkının 01:42 saniyesini dinle!"` notuyla gönderme desteği getirildi.
    - Sohbet akışında bu mesajlar mini dalga boyu göstergeli ve tek tıkla o saniyeden çalan **İnteraktif Ses Kartı** olarak render edilir.

---

## 2. Kritik Hata Düzeltmeleri & Çözüm Bölümleri

### Bölüm 1 – Aydınlık Modda "Siyah Zemin Üzerinde Siyah Yazı" Hatasının Kökten Çözümü (Tamamlandı):
- **Sorun**: Güneş (`☀️`) ikonuna basıldığında yazı renkleri siyaha (`text-zinc-900`) dönüştüğü halde sayfa ve kart arka planlarının (`bg-[#09090B]`, `bg-[#09090B]/90`, `bg-zinc-950/80`, `bg-zinc-900/60`, vb.) Tailwind v4 opaklık varyantları sebebiyle siyah kalması ve Profil, Odalar, Sohbet, Harita ekranlarındaki tüm metinlerin görünmez olması.
- **Çözüm**:
  1. `src/App.tsx`: Kök container ve ana içerik sütununa `resolveEffectiveTheme(themeMode) === 'light'` kontrolüyle dinamik `#F8F9FA` / `#FFFFFF` stüdyo zemin sınıfları bağlandı; siyah zemin kanaması tamamen kesildi.
  2. `src/index.css`: Tüm Tailwind v4 opaklık sınıflarını (`[class*="bg-zinc-950"]`, `[class*="bg-zinc-900"]`, `[class*="bg-[#09090B]"]`, `[class*="bg-black/"]`) kapsayan kapsamlı wildcard seçicileri kuruldu.
  3. Koyu gradyan durakları (`from-zinc-950`, `via-zinc-950`, `to-zinc-950`) temiz açık stüdyo gradyanlarına çevrildi.
  4. Kart sınırları (`border-white/`, `border-zinc-800`), ayırıcılar (`divide-white/`) ve hafif cam vurguları (`bg-white/` -> `rgba(0, 0, 0, 0.04)`) açık tema için kalibre edildi.
  5. Dolgulu yeşil/renkli aksiyon butonlarında ve rozetlerde (`bg-emerald-500`, vb.) beyaz metinlerin okunabilirliği (`color: #FFFFFF !important`) korundu.
  6. Sonuç: Aydınlık modda tüm ekranlar (Profil, Odalar, Sohbet, Harita, Tam Ekran Oynatıcı) Apple Music / stüdyo kalitesinde tertemiz, yüksek kontrastlı ve okunabilir hale getirildi; Karanlık modun imzası olan mat obsidyen zemin bozulmadan korundu.
