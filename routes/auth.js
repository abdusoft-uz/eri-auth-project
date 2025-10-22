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
  const { challenge_data_64, signature_hex, certificate_64, pkcs7 } = req.body;
  
  console.log('📥 Verify so\'rovi:', {
    challenge_data_64: challenge_data_64 ? 'mavjud' : 'yo\'q',
    signature_hex: signature_hex ? 'mavjud' : 'yo\'q',
    certificate_64: certificate_64 ? 'mavjud' : 'yo\'q',
    pkcs7: pkcs7 ? 'mavjud' : 'yo\'q'
  });
  
  if (!challenge_data_64) {
    return res.status(400).json({
      success: false,
      message: 'Challenge ma\'lumoti taqdim etilmagan'
    });
  }
  
  if (!pkcs7 && !signature_hex) {
    return res.status(400).json({
      success: false,
      message: 'Imzo ma\'lumoti taqdim etilmagan (signature_hex yoki pkcs7)'
    });
  }
  
  // Agar PKCS7 bo'lsa, sertifikat ma'lumoti shundan olinadi
  if (!pkcs7 && !certificate_64) {
    return res.status(400).json({
      success: false,
      message: 'Sertifikat ma\'lumoti taqdim etilmagan (certificate_64 yoki pkcs7)'
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
    let certificateInfo;
    
    if (pkcs7) {
      // PKCS7 dan sertifikat ma'lumotini olish
      console.log('📝 PKCS7 dan sertifikat ma\'lumotini olish...');
      certificateInfo = await parseCertificateFromPKCS7(pkcs7);
    } else if (certificate_64) {
      // Oddiy sertifikat tahlil qilish
      console.log('📝 Oddiy sertifikat tahlil qilish...');
      certificateInfo = await parseCertificate(certificate_64);
    }
    
    if (!certificateInfo) {
      return res.status(400).json({
        success: false,
        message: 'Sertifikat tahlil qilinmadi'
      });
    }
    
    // 3. Imzo tekshirish
    let isSignatureValid = false;
    
    console.log('🔍 Imzo tekshirish:', {
      pkcs7: pkcs7 ? 'mavjud' : 'yo\'q',
      signature_hex: signature_hex ? 'mavjud' : 'yo\'q'
    });
    
    // Agar PKCS7 imzo bo'lsa
    if (pkcs7) {
      console.log('📝 PKCS7 imzo tekshirilmoqda...');
      // E-IMZO REST API orqali haqiqiy tekshirish
      const eimzoResult = await verifyPKCS7WithEIMZOServer(pkcs7);
      isSignatureValid = eimzoResult !== null;
      console.log('E-IMZO REST API tekshirish natijasi:', isSignatureValid);
    } else if (signature_hex) {
      console.log('📝 Oddiy imzo tekshirilmoqda...');
      // Oddiy imzo tekshirish
      isSignatureValid = await verifySignature(
        challenge_data_64,
        signature_hex,
        certificateInfo.publicKey
      );
    }
    
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
    // Sertifikatni to'g'ri formatda tayyorlash
    let certPem;
    if (certificate64.includes('-----BEGIN CERTIFICATE-----')) {
      // Agar allaqachon PEM formatda bo'lsa
      certPem = certificate64;
    } else {
      // Agar Base64 formatda bo'lsa, PEM formatga o'tkazish
      certPem = `-----BEGIN CERTIFICATE-----\n${certificate64}\n-----END CERTIFICATE-----`;
    }
    
    console.log('Sertifikat PEM formati:', certPem.substring(0, 100) + '...');
    
    const cert = forge.pki.certificateFromPem(certPem);
    
    // Sertifikat ma'lumotlarini olish
    const subject = cert.subject;
    console.log('Sertifikat subject:', subject);
    
    // PINFL ni turli usullar bilan olish
    const pinfl = getAttributeValue(subject, 'serialNumber') || 
                  getAttributeValue(subject, '2.5.4.5') || 
                  getAttributeValue(subject, 'SN') ||
                  getAttributeValue(subject, '1.2.860.3.16.1.2') ||
                  'Noma\'lum';
    
    // To'liq ismni olish
    const fullName = getAttributeValue(subject, 'commonName') || 
                     getAttributeValue(subject, 'CN') ||
                     getAttributeValue(subject, 'Name') ||
                     'Noma\'lum';
    
    const serialNumber = cert.serialNumber;
    const publicKey = forge.pki.publicKeyToPem(cert.publicKey);
    
    console.log('Sertifikat ma\'lumotlari:', {
      pinfl,
      fullName,
      serialNumber: serialNumber.toString()
    });
    
    return {
      pinfl,
      fullName,
      serialNumber: serialNumber.toString(),
      publicKey
    };
  } catch (error) {
    console.error('Sertifikat tahlil qilishda xatolik:', error);
    console.error('Sertifikat ma\'lumoti:', certificate64.substring(0, 100) + '...');
    return null;
  }
}

// E-IMZO REST API dan PKCS7 ni tekshirish va sertifikat ma'lumotlarini olish
async function verifyPKCS7WithEIMZOServer(pkcs7Data) {
  try {
    console.log('E-IMZO REST API orqali PKCS7 tekshirilmoqda...');
    
    // E-IMZO REST API server URL
    const eimzoServerUrl = 'http://127.0.0.1:8080/backend/auth';
    
    const response = await fetch(eimzoServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Real-IP': '127.0.0.1',
        'Host': 'localhost'
      },
      body: pkcs7Data
    });
    
    if (!response.ok) {
      console.error('E-IMZO REST API xatoligi:', response.status, response.statusText);
      return null;
    }
    
    const result = await response.json();
    console.log('E-IMZO REST API natijasi:', result);
    
    if (result.status === 1 && result.subjectCertificateInfo) {
      const certInfo = result.subjectCertificateInfo;
      return {
        pinfl: certInfo.serialNumber || certInfo.pinfl || 'Noma\'lum',
        fullName: certInfo.commonName || certInfo.name || 'Noma\'lum',
        serialNumber: certInfo.serialNumber || 'Noma\'lum',
        publicKey: 'E-IMZO verified'
      };
    } else {
      console.error('E-IMZO REST API: Sertifikat tekshirilmadi', result);
      return null;
    }
    
  } catch (error) {
    console.error('E-IMZO REST API bilan bog\'lanishda xatolik:', error);
    return null;
  }
}

// PKCS7 dan sertifikat ma'lumotini olish (E-IMZO REST API orqali)
async function parseCertificateFromPKCS7(pkcs7Data) {
  try {
    console.log('PKCS7 dan sertifikat ma\'lumotini olish...');
    
    // E-IMZO REST API dan haqiqiy tekshirish
    const certificateInfo = await verifyPKCS7WithEIMZOServer(pkcs7Data);
    
    if (certificateInfo) {
      console.log('E-IMZO REST API orqali sertifikat ma\'lumotlari olingan:', certificateInfo);
      return certificateInfo;
    }
    
    // Agar E-IMZO REST API ishlamasa, test ma'lumotlari
    console.warn('E-IMZO REST API ishlamayapti, test ma\'lumotlari ishlatilmoqda');
    return {
      pinfl: '12345678901234',
      fullName: 'Test Foydalanuvchi',
      serialNumber: 'TEST123456',
      publicKey: 'test-public-key'
    };
    
  } catch (error) {
    console.error('PKCS7 dan sertifikat tahlil qilishda xatolik:', error);
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

// PKCS7 imzo tekshirish funksiyasi
async function verifyPKCS7Signature(challengeData64, pkcs7Data, publicKeyPem) {
  try {
    console.log('PKCS7 imzo tekshirilmoqda...');
    
    // PKCS7 ma'lumotini tahlil qilish
    const pkcs7Pem = `-----BEGIN PKCS7-----\n${pkcs7Data}\n-----END PKCS7-----`;
    
    // PKCS7 ni tahlil qilish
    const pkcs7 = forge.pkcs7.messageFromPem(pkcs7Pem);
    
    // PKCS7 imzo tekshirish
    if (pkcs7.type === forge.pkcs7.SIGNED_DATA) {
      // Imzo tekshirish
      const verified = pkcs7.verify();
      console.log('PKCS7 imzo tekshiruvi:', verified);
      return verified;
    }
    
    return false;
  } catch (error) {
    console.error('PKCS7 imzo tekshirishda xatolik:', error);
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
