# 🔥 Firebase Realtime Database Kuralları - HEMEN UYGULAYIN!

## ⚠️ ÖNEMLİ: Bu hatayı görüyorsanız:
```
❌ permission_denied at /userData: Client doesn't have permission to access the desired data.
```

**ÇÖZÜM:** Aşağıdaki adımları takip edin!

---

## 📋 ADIM ADIM UYGULAMA

### 1️⃣ Firebase Console'a Gidin
1. Tarayıcınızda şu adrese gidin:
   ```
   https://console.firebase.google.com/
   ```

2. Google hesabınızla giriş yapın

3. **performans-app-1075b** projesini seçin

### 2️⃣ Realtime Database Kurallarına Gidin
1. Sol menüden **"Realtime Database"** tıklayın
2. Üst menüden **"Rules"** sekmesine tıklayın

### 3️⃣ Aşağıdaki Kuralları Kopyalayıp Yapıştırın

**TÜMÜNÜ SİLİP AŞAĞIDAKİNİ YAPIŞTIRIN:**

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**VEYA DAHA DETAYLI VERSİYON (Önerilen):**

```json
{
  "rules": {
    "users": {
      ".read": true,
      ".write": true
    },
    "userData": {
      ".read": true,
      ".write": true
    },
    "profileNotes": {
      ".read": true,
      ".write": true
    },
    "test": {
      ".read": true,
      ".write": true
    },
    "$other": {
      ".read": true,
      ".write": true
    }
  }
}
```

### 4️⃣ Kaydedin
1. **"Publish"** (Yayınla) butonuna tıklayın
2. Onay mesajını kabul edin
3. **"OK"** tıklayın

### 5️⃣ Test Edin
1. Uygulamanıza geri dönün
2. Sayfayı yenileyin (F5)
3. Top List ve diğer özellikler çalışmalı

---

## 🔍 Kontrol Listesi

- [ ] Firebase Console'a giriş yaptım
- [ ] Doğru projeyi seçtim (performans-app-1075b)
- [ ] Realtime Database > Rules sekmesine gittim
- [ ] Eski kuralları sildim
- [ ] Yeni kuralları yapıştırdım
- [ ] "Publish" butonuna tıkladım
- [ ] Onayladım
- [ ] Sayfayı yeniledim

---

## ❌ Sorun Devam Ediyorsa

1. Tarayıcı konsolunu açın (F12)
2. Hata mesajlarını kontrol edin
3. Firebase Console'da "Usage" sekmesinden bağlantıyı kontrol edin
4. Kuralların doğru uygulandığından emin olun (Rules sekmesinde kontrol edin)

---

## 🔒 Güvenlik Notu

Bu kurallar **herkese açık** erişim sağlar. Uygulamanız test aşamasındaysa sorun değil. 

Daha güvenli kurallar için ileride Firebase Authentication ekleyebiliriz.

---

## 📞 Hızlı Bağlantılar

- **Firebase Console**: https://console.firebase.google.com/
- **Projeniz**: https://console.firebase.google.com/project/performans-app-1075b
- **Database Rules**: https://console.firebase.google.com/project/performans-app-1075b/database/performans-app-1075b-default-rtdb/rules
