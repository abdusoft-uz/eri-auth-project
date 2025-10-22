# ERI Autentifikatsiya Tizimi

O'zbekiston E-IMZO CAPIWS plaginidan foydalangan holda, foydalanuvchini ERI kaliti bilan tasdiqlash (autentifikatsiya) va avtorizatsiya qilish tizimi.

## 🚀 Xususiyatlar

- **E-IMZO CAPIWS integratsiyasi** - O'zbekiston ERI kalitlari bilan ishlash
- **Challenge-Response sxemasi** - Xavfsiz avtorizatsiya
- **PostgreSQL ma'lumotlar bazasi** - Foydalanuvchi ma'lumotlarini saqlash
- **JWT tokenlar** - Xavfsiz sessiya boshqaruvi
- **Modern UI** - Responsive va foydalanuvchi-do'st interfeys

## 📋 Talablar

- Node.js 16+ 
- PostgreSQL 12+
- E-IMZO CAPIWS plagin (brauzer uchun)
- Windows operatsion tizimi (E-IMZO uchun)

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

## 📞 Yordam

Agar muammolar bo'lsa, quyidagi ma'lumotlarni yuboring:
- Xatolik xabari
- Brauzer konsoli loglari
- Server loglari
- Operatsion tizim ma'lumotlari

## 📄 Litsenziya

MIT Litsenziya
