# 🔍 SEO Kurulum Rehberi - UpperBody Coach

Bu dokümanda sitenizin Google ve diğer arama motorlarında görünmesi için yapılan SEO iyileştirmeleri açıklanmaktadır.

## ✅ Yapılan İyileştirmeler

### 1. Meta Etiketleri
- ✅ SEO açıklaması (description)
- ✅ Anahtar kelimeler (keywords)
- ✅ Robots meta etiketi (index, follow)
- ✅ Dil ayarı (Turkish)
- ✅ Canonical URL

### 2. Sosyal Medya Etiketleri
- ✅ Open Graph etiketleri (Facebook, LinkedIn için)
- ✅ Twitter Card etiketleri
- ✅ Sosyal medya görsel boyutları

### 3. Structured Data (JSON-LD)
- ✅ WebApplication schema
- ✅ SoftwareApplication schema
- ✅ FAQPage schema (Google'da sık sorulan sorular bölümü)

### 4. Dosyalar
- ✅ robots.txt (Arama motoru botları için)
- ✅ sitemap.xml (Site haritası)

## 🔧 Yapılması Gerekenler

### ÖNEMLİ: Domain URL'lerini Güncelleme

`index.html` dosyasında şu yerlerde **"https://yourdomain.com"** yazan URL'leri kendi domain adresinizle değiştirin:

1. **Canonical URL** (satır 20)
2. **Open Graph URL** (satır 24)
3. **Open Graph Image** (satır 27)
4. **Twitter Card URL** ve Image
5. **Structured Data JSON-LD** içindeki tüm URL'ler
6. **robots.txt** dosyasındaki sitemap URL'i
7. **sitemap.xml** dosyasındaki tüm URL'ler

### Örnek Değişiklik:
```html
<!-- ÖNCE -->
<link rel="canonical" href="https://yourdomain.com/">

<!-- SONRA (kendi domain'inizle) -->
<link rel="canonical" href="https://www.upperbodycoach.com/">
```

## 📸 Görsel Ekleme (Önerilen)

### 1. Open Graph Görseli
1200x630 piksel boyutunda bir görsel oluşturun ve sunucunuza yükleyin:
- Dosya adı: `og-image.jpg` veya `og-image.png`
- Boyut: 1200x630 piksel
- İçerik: Sitenizin görsel temsili (logo, antrenman görseli vb.)

### 2. Favicon
- `favicon.png` (32x32 veya 16x16)
- `apple-touch-icon.png` (180x180)

## 🚀 Google'a Bildirme

### Google Search Console
1. [Google Search Console](https://search.google.com/search-console) adresine gidin
2. Sitenizi ekleyin ve doğrulayın
3. Sitemap'inizi gönderin: `https://stwo-ci-gym.vercel.app/sitemap.xml`

### Google Indexleme Hızlandırma
1. Search Console'da "URL Inspection" aracını kullanın
2. Ana sayfanızın URL'sini girin
3. "Request Indexing" butonuna tıklayın

## 📊 İzleme ve Optimizasyon

### Google Analytics (Önerilen)
Sitenizin ziyaretçi istatistiklerini takip etmek için Google Analytics ekleyin.

### Performans Testi
- [Google PageSpeed Insights](https://pagespeed.web.dev/) ile sitenizi test edin
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly) ile mobil uyumluluğu kontrol edin

## 🔑 Anahtar Kelimeler (Mevcut)

Siteniz şu anahtar kelimelerle optimize edilmiştir:
- üst vücut antrenmanı
- evde antrenman
- aletsiz egzersiz
- vücut geliştirme
- şınav
- plank
- antrenman programı
- BMI hesaplama
- kişisel antrenör

## ⚡ Hızlı Kontrol Listesi

- [ ] Domain URL'lerini güncelle
- [ ] Open Graph görselini ekle (og-image.jpg)
- [ ] Favicon ekle
- [ ] Google Search Console'a kayıt ol
- [ ] Sitemap'i Google'a gönder
- [ ] İlk indexleme isteğini yap
- [ ] Mobil uyumluluğu test et
- [ ] Sayfa hızını test et

## 📝 Notlar

- Google'ın sitenizi indexlemesi 1-7 gün arasında sürebilir
- İlk görünürlük için birkaç hafta bekleyin
- Düzenli içerik güncellemeleri SEO'yu olumlu etkiler
- Sosyal medyada paylaşımlar da arama sonuçlarını etkiler

## 🆘 Sorun mu yaşıyorsunuz?

Eğer siteniz Google'da görünmüyorsa:
1. Search Console'da hata mesajlarını kontrol edin
2. robots.txt dosyasının doğru çalıştığından emin olun
3. Sitemap'in doğru formatta olduğunu kontrol edin
4. Domain'in doğru DNS ayarlarına sahip olduğundan emin olun
