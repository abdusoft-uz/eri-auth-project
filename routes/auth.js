const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const forge = require('node-forge');
const { pool } = require('../db');

const router = express.Router();

// Challenge generatsiya qilish
router.post('/challenge', async (req, res) => {
  try {
    // 32 baytli tasodifiy ma'lumot generatsiya qilish
    const challengeData = crypto.randomBytes(32);
    const challengeData64 = challengeData.toString('base64');
    
    // Challenge muddati (5 daqiqa)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    // Ma'lumotlar bazasiga saqlash
    const result = await pool.query(
      'INSERT INTO auth_challenges (challenge_data, expires_at) VALUES ($1, $2) RETURNING id',
      [challengeData64, expiresAt]
    );
    
    console.log(`✅ Challenge yaratildi: ID ${result.rows[0].id}`);
    
    res.json({
      success: true,
      challenge: challengeData64,
      expires_at: expiresAt.toISOString()
    });
    
  } catch (error) {
    console.error('❌ Challenge yaratishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Challenge yaratishda xatolik'
    });
  }
});

// Imzo tekshirish va avtorizatsiya
router.post('/verify', async (req, res) => {
  const { challenge_data_64, signature_hex, certificate_64 } = req.body;
  
  if (!challenge_data_64 || !signature_hex || !certificate_64) {
    return res.status(400).json({
      success: false,
      message: 'Barcha kerakli ma\'lumotlar taqdim etilmagan'
    });
  }
  
  try {
    // 1. Challenge tekshirish
    const challengeResult = await pool.query(
      'SELECT * FROM auth_challenges WHERE challenge_data = $1 AND expires_at > NOW() AND is_used = FALSE',
      [challenge_data_64]
    );
    
    if (challengeResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Challenge amal qilmagan yoki avval ishlatilgan'
      });
    }
    
    // Challenge ni ishlatilgan deb belgilash
    await pool.query(
      'UPDATE auth_challenges SET is_used = TRUE WHERE challenge_data = $1',
      [challenge_data_64]
    );
    
    // 2. Sertifikatni tahlil qilish
    const certificateInfo = await parseCertificate(certificate_64);
    if (!certificateInfo) {
      return res.status(400).json({
        success: false,
        message: 'Sertifikat tahlil qilinmadi'
      });
    }
    
    // 3. Imzo tekshirish
    const isSignatureValid = await verifySignature(
      challenge_data_64,
      signature_hex,
      certificateInfo.publicKey
    );
    
    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Imzo haqiqiy emas'
      });
    }
    
    // 4. Foydalanuvchini topish yoki yaratish
    let user = await findOrCreateUser(certificateInfo);
    
    // 5. JWT token generatsiya qilish
    const token = jwt.sign(
      { 
        userId: user.id, 
        pinfl: user.pinfl,
        fullName: user.full_name 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log(`✅ Foydalanuvchi avtorizatsiya qilindi: ${user.full_name} (${user.pinfl})`);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        pinfl: user.pinfl,
        full_name: user.full_name,
        certificate_serial: user.certificate_serial
      }
    });
    
  } catch (error) {
    console.error('❌ Imzo tekshirishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Imzo tekshirishda xatolik'
    });
  }
});

// Sertifikatni tahlil qilish funksiyasi
async function parseCertificate(certificate64) {
  try {
    const certPem = `-----BEGIN CERTIFICATE-----\n${certificate64}\n-----END CERTIFICATE-----`;
    const cert = forge.pki.certificateFromPem(certPem);
    
    // Sertifikat ma'lumotlarini olish
    const subject = cert.subject;
    const pinfl = getAttributeValue(subject, 'serialNumber') || 
                  getAttributeValue(subject, '2.5.4.5') || 
                  getAttributeValue(subject, 'SN');
    
    const fullName = getAttributeValue(subject, 'commonName') || 
                     getAttributeValue(subject, 'CN') ||
                     'Noma\'lum';
    
    const serialNumber = cert.serialNumber;
    const publicKey = forge.pki.publicKeyToPem(cert.publicKey);
    
    return {
      pinfl,
      fullName,
      serialNumber,
      publicKey
    };
  } catch (error) {
    console.error('Sertifikat tahlil qilishda xatolik:', error);
    return null;
  }
}

// Sertifikat atributlaridan qiymat olish
function getAttributeValue(subject, attributeName) {
  const attribute = subject.getField(attributeName);
  return attribute ? attribute.value : null;
}

// Imzo tekshirish funksiyasi
async function verifySignature(challengeData64, signatureHex, publicKeyPem) {
  try {
    // Challenge ma'lumotini dekodlash
    const challengeData = Buffer.from(challengeData64, 'base64');
    
    // Imzoni hex dan buffer ga o'tkazish
    const signature = Buffer.from(signatureHex, 'hex');
    
    // GOST algoritmi uchun imzo tekshirish
    // Bu yerda GOST algoritmini tekshirish logikasi bo'lishi kerak
    // Hozircha oddiy tekshirish qilamiz
    return true; // Haqiqiy loyihada GOST algoritmi bilan tekshirish kerak
    
  } catch (error) {
    console.error('Imzo tekshirishda xatolik:', error);
    return false;
  }
}

// Foydalanuvchini topish yoki yaratish
async function findOrCreateUser(certificateInfo) {
  try {
    // Avval foydalanuvchini topish
    let userResult = await pool.query(
      'SELECT * FROM users WHERE pinfl = $1',
      [certificateInfo.pinfl]
    );
    
    if (userResult.rows.length > 0) {
      // Foydalanuvchi mavjud, ma'lumotlarini yangilash
      await pool.query(
        'UPDATE users SET full_name = $1, certificate_serial = $2, updated_at = CURRENT_TIMESTAMP WHERE pinfl = $3',
        [certificateInfo.fullName, certificateInfo.serialNumber, certificateInfo.pinfl]
      );
      return userResult.rows[0];
    } else {
      // Yangi foydalanuvchi yaratish
      const newUserResult = await pool.query(
        'INSERT INTO users (pinfl, full_name, certificate_serial) VALUES ($1, $2, $3) RETURNING *',
        [certificateInfo.pinfl, certificateInfo.fullName, certificateInfo.serialNumber]
      );
      return newUserResult.rows[0];
    }
  } catch (error) {
    console.error('Foydalanuvchi bilan ishlashda xatolik:', error);
    throw error;
  }
}

module.exports = router;
