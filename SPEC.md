# Harmoniq - Canlı Frekans Odaları (Lounge) & Evrensel Müzik Eşleşme
## Ürün Gereksinim Dokümanı (PRD) & Mimari Şartname

### 1. Stratejik Analiz: Makromusic'in Hataları, Çıkarılacaklar ve Eklenecekler

Rakip analizi yaparken temel hedefimiz, kullanıcıyı yoran ve "para tuzağı" hissi veren tüm fazlalıkları atıp, müziğin **o anki duygusunu** paylaşmayı merkeze koymaktır.

| Kriter | Makromusic'in Düştüğü Hatalar | Bizim Uygulamamızın Çözümü |
| --- | --- | --- |
| **Platform Desteği** | Sadece Spotify API'sine bağımlı; YouTube Music ve diğer platform kullanıcılarını dışarıda bırakıyor veya düzgün senkronize edemiyor. | **Evrensel Medya Algılama:** Android `MediaSession` / `NotificationListener` ile YouTube Music, Spotify, Apple Music ve Deezer'da çalan her şarkıyı anında yakalar. |
| **Aktiflik & Canlılık** | Kullanıcı şarkıyı açıp uygulamadan çıkıyor; içerisi cevap vermeyen "hayalet profillerle" doluyor. | **Heartbeat (Nabız) Sistemi:** Müzik durduğunda veya 45 saniye sinyal kesildiğinde kullanıcı canlı odadan otomatik düşer. İçerideki herkes %100 o an müziği dinleyen kişilerdir. |
| **Eşleşme Mekaniği** | Tinder kopyası sağa/sola kaydırma (swipe) mantığı; müziği arka plana atıp dış görünüş odaklı sığ bir yapı yaratıyor. | **Canlı Frekans Odaları (Lounge):** Kaydırma yok. Aynı şarkıyı veya sanatçıyı dinleyenler anlık ortak odaya düşer, şarkının zaman çizelgesi (timeline) üzerinde birbirini görür. |
| **Kullanım Zorunluluğu** | Eşleşmek için uygulamaya girip özel olarak eşleşme aramak gerekiyor. | **Arka Plan Entegrasyonu:** Sen sadece YouTube Music'i açıp müziğini dinlersin; uygulama arka planda profilini canlı tutar ve aynı frekanstaki insanları bildirimle veya odada buluşturur. |
| **Gelir Modeli (Paywall)** | "Seni kim beğendi", "Mesaj atma hakkı", "Geri alma" gibi en temel iletişim özelliklerini fahiş fiyatlarla satıyor. | **Adil Freemium (Discord Nitro Modeli):** Odalara girmek, eşleşmek ve mesajlaşmak tamamen ücretsiz. Sadece profil kozmetikleri, özel plak çerçeveleri ve "Birlikte Dinle" gibi ekstra özellikler ücretli. |

---

### 2. Uygulamadan Tamamen Çıkarılan (Gereksiz) Kısımlar

* **Sağa / Sola Kaydırma (Swipe) Ekranı:** Kullanıcıları katalog gibi gezme mantığı tamamen kaldırıldı.
* **Bulanıklaştırılmış "Seni Beğenenler" Tuzağı:** Kullanıcıyı merakta bırakıp zorla abonelik aldıran karanlık tasarım (dark pattern) öğeleri yok.
* **Kredi / Jeton / Süper Beğeni Satışı:** İletişim kurmayı paraya bağlayan hiçbir bariyer yok.
* **Uygulama İçi Hantal Müzik Çalar:** Uygulamanın kendisi müzik çalar olmayacak; doğrudan telefonun kendi müzik çalarlarıyla (YouTube Music, Spotify vb.) senkronize bir sosyal katman olarak çalışır.
* **Gereksiz Forum / Blog Akışı:** Konudan bağımsız metin paylaşımları yerine yalnızca o an çalan müzikle tetiklenen anlık durumlar yer alır.

---

### 3. Uygulamaya Eklenen Vurucu Özellikler

* **Senkronize Zaman Çizelgesi (Timeline Matching):** Şarkının ilerleme çubuğu üzerinde o an aynı şarkıyı dinleyen diğer kullanıcıların avatarlarının akması. Örneğin şarkının 02:15'teki gitar solosunda olan iki kişinin birbirini saniyesi saniyesine görmesi.
* **Esnek Kümeleme (Akıllı Oda Birleştirme):** Kullanıcı çok niş bir şarkı dinliyorsa ve o an o şarkıda kimse yoksa, uygulama onu boş bir ekranda bekletmez; otomatik olarak **"Aynı Sanatçıyı Dinleyenler"** veya **"Aynı Türü (Örn: Türkçe Alternatif) Dinleyenler"** odasına bağlar.
* **Müzikal Buzkırıcılar (Icebreakers):** Klişe "Selam" mesajları yerine; tek dokunuşla *"Sıradaki Şarkıyı Öner"*, *"Şarkının Bu Saniyesini Gönder"* veya *"Frekans Gönder"* butonları.
* **Otomatik Tanışma Bağlamı:** İki kişi eşleşip sohbet açıldığında en üstte otomatik oluşan hatıra kartı: *"İkiniz de YouTube Music'te Duman - Kırmış Kalbini dinlerken (01:42'de) aynı frekansta buluştunuz."*
* **Canlı Tepkiler & Durum Baloncukları:** Frekans odasında şarkının can alıcı yerlerinde uçuşan tepkiler (`🔥`, `🎸`, `💔`, `⚡`) ve avatarların üstünde beliren mini durumlar.

---

### 4. Teknoloji Yığını (Tech Stack)

* **Mobil İstemci:** Flutter & React Native / Modern Web
* **Arka Plan Dinleme:** Android `MediaSessionManager` & `NotificationListenerService` (YouTube Music, Spotify, Apple Music, Deezer)
* **Gerçek Zamanlı Senkron:** Firebase Realtime Database (`rooms/{track_id}`, `timeline/{timestamp}`)
* **Kalıcı Veri:** Cloud Firestore & Auth
