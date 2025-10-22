# ERI Autentifikatsiya Tizimi

O'zbekiston E-IMZO CAPIWS plaginidan foydalangan holda, foydalanuvchini ERI kaliti bilan tasdiqlash (autentifikatsiya) va avtorizatsiya qilish tizimi.

## 🚀 Xususiyatlar

- **E-IMZO CAPIWS integratsiyasi** - O'zbekiston ERI kalitlari bilan ishlash
- **EIMZOClient kutubxonasi** - Namuna kodga asosan yaratilgan maxsus kutubxona
- **Challenge-Response sxemasi** - Xavfsiz avtorizatsiya
- **PKCS7 imzo qo'llab-quvvatlash** - E-IMZO hujjatlariga asosan
- **Muddati tugagan sertifikatlar** - Avtomatik aniqlash va belgilash
- **PostgreSQL ma'lumotlar bazasi** - Foydalanuvchi ma'lumotlarini saqlash
- **JWT tokenlar** - Xavfsiz sessiya boshqaruvi
- **Modern UI** - Responsive va foydalanuvchi-do'st interfeys
- **Debug rejimi** - Batafsil loglar va xatolik tahlili

## 📋 Talablar

- Node.js 16+ 
- PostgreSQL 12+
- **E-IMZO dasturi** (CAPIWS uchun)
- Windows operatsion tizimi (E-IMZO uchun)

## 🔧 CAPIWS ni qayerdan olish

### 1. **Native CAPIWS Kutubxonasi** ✅
Bizning loyihada **CAPIWS native kutubxonasi** mavjud:
- **`public/js/capiws-native.js`** - Namuna kodga asosan yaratilgan to'liq CAPIWS implementatsiyasi
- **WebSocket orqali E-IMZO bilan aloqa** - `ws://127.0.0.1:64646` yoki `wss://127.0.0.1:64443`
- **Base64 kutubxonasi** - Kriptografik operatsiyalar uchun
- **Avtomatik yuklash** - Sahifa yuklanganda avtomatik ravishda ishga tushadi

### 2. **E-IMZO dasturini o'rnatish**
1. E-IMZO dasturini yuklab oling: https://e-imzo.uz/main/downloads/
2. Dasturni o'rnating va ishga tushiring
3. CAPIWS avtomatik ravishda mavjud bo'ladi: https://127.0.0.1:64443/apidoc.html

### 3. **CAPIWS holatini tekshirish**
- Sahifada "CAPIWS holatini tekshirish" tugmasini bosing
- Brauzer konsolini oching (F12) va debug ma'lumotlarini ko'ring
- E-IMZO dasturi ishlamoqda ekanligini tekshiring: https://127.0.0.1:64443/apidoc.html

## 🛠️ O'rnatish

### 1. Loyihani klonlash
```bash
git clone <repository-url>
cd eri-auth-project
```

### 2. Paketlarni o'rnatish
```bash
npm install
```

### 3. Ma'lumotlar bazasini sozlash
PostgreSQL ma'lumotlar bazasini yarating va `config.env` faylini sozlang:

```env
POSTGRES_USER=zukko_dev_user
POSTGRES_PASSWORD=0dscQp79FL85
POSTGRES_DB=mero_eri_db
POSTGRES_PORT=5433
POSTGRES_HOST=localhost
```

### 4. Ma'lumotlar bazasini ishga tushirish
```bash
npm run init-db
```

### 5. Serverni ishga tushirish
```bash
npm start
```

Development rejimida:
```bash
npm run dev
```

## 🌐 Ishlatish

1. Brauzerda `http://localhost:3000` ga o'ting
2. E-IMZO CAPIWS plaginini o'rnating (agar o'rnatilmagan bo'lsa)
3. "Sertifikatlarni yuklash" tugmasini bosing
4. Kerakli sertifikatni tanlang
5. "ERI bilan kirish" tugmasini bosing
6. PIN kodini kiriting
7. Muvaffaqiyatli avtorizatsiya!

## 📁 Loyiha struktura

```
eri-auth-project/
├── public/                 # Frontend fayllar
│   ├── index.html         # Asosiy sahifa
│   └── js/
│       ├── capiws.js      # E-IMZO CAPIWS integratsiyasi
│       └── auth.js        # Autentifikatsiya logikasi
├── routes/
│   └── auth.js            # Autentifikatsiya API yo'nalishlari
├── db.js                  # Ma'lumotlar bazasi ulanishi
├── server.js              # Asosiy server fayli
├── package.json           # Node.js paketlari
└── config.env             # Konfiguratsiya fayli
```

## 🔧 API Yo'nalishlari

### POST /api/auth/challenge
Challenge generatsiya qilish
```json
{
  "success": true,
  "challenge": "base64_encoded_challenge",
  "expires_at": "2024-01-01T12:00:00.000Z"
}
```

### POST /api/auth/verify
Imzo tekshirish va avtorizatsiya
```json
{
  "challenge_data_64": "base64_challenge",
  "signature_hex": "hex_signature",
  "certificate_64": "base64_certificate"
}
```

## 🔒 Xavfsizlik

- **Challenge-Response sxemasi** - Replay attacklardan himoya
- **JWT tokenlar** - Xavfsiz sessiya boshqaruvi
- **CORS sozlamalari** - Xavfsiz cross-origin so'rovlar
- **Kalit tozalash** - Avtorizatsiyadan keyin kalitni o'chirish

## 🐛 Xatoliklar bilan ishlash

### E-IMZO CAPIWS xatoliklari
- Plagin to'g'ri o'rnatilganligini tekshiring
- Brauzer E-IMZO ni qo'llab-quvvatlaydiganligini tekshiring
- Windows operatsion tizimida ishlayotganligini tekshiring

### Ma'lumotlar bazasi xatoliklari
- PostgreSQL ishlamoqda ekanligini tekshiring
- Ulanish ma'lumotlarini tekshiring
- Ma'lumotlar bazasi mavjudligini tekshiring

### Server xatoliklari
- Port band emasligini tekshiring
- Barcha paketlar o'rnatilganligini tekshiring
- Konfiguratsiya fayli to'g'ri sozlanganligini tekshiring

## 📚 E-IMZO Hujjatlari

Loyiha [E-IMZO integratsiya hujjatlariga](https://github.com/qo0p/e-imzo-doc) va namuna kodlarga asoslanib yaratilgan.

### E-IMZO Funksiyalari:
- `list_all_keys()` - Barcha kalitlarni ro'yxatga olish
- `load_key()` - Kalitni yuklash
- `create_pkcs7()` - PKCS7 imzo yaratish
- `get_signature()` - Oddiy imzo olish
- `get_version()` - E-IMZO versiyasini olish
- `is_plugged_in()` - ID-karta ulanganligini tekshirish

### Namuna Kod Tahlili:
- ✅ E-IMZO versiya tekshiruvi
- ✅ ID-karta holati tekshiruvi
- ✅ Barcha kalitlarni ro'yxatga olish
- ✅ PKCS7 imzo yaratish
- ✅ Xatolik boshqaruvi

## 📞 Yordam

Agar muammolar bo'lsa, quyidagi ma'lumotlarni yuboring:
- Xatolik xabari
- Brauzer konsoli loglari
- Server loglari
- Operatsion tizim ma'lumotlari
- Debug ma'lumotlari (sahifada ko'rsatiladi)

## 📄 Litsenziya

MIT Litsenziya
