/**
 * AuthManager - EIMZOClient yordamida autentifikatsiya
 * Namuna kodga asosan yaratilgan
 */

class AuthManager {
    constructor() {
        this.selectedCertificate = null;
        this.userInfo = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // HTML elementlari yuklanguncha kutish
        const checkElements = () => {
        const loadBtn = document.getElementById('loadCertificatesBtn');
        const loginBtn = document.getElementById('loginBtn');

            if (loadBtn && loginBtn) {
                // Sertifikatlarni yuklash tugmasi
                loadBtn.addEventListener('click', () => {
                    this.loadCertificates();
                });

                // ERI bilan kirish tugmasi
                loginBtn.addEventListener('click', () => {
                    this.loginWithERI();
                });


                console.log('Event listenerlar o\'rnatildi');
            } else {
                // Agar elementlar hali yuklanmagan bo'lsa, qisqa vaqt kutib qayta urinish
                setTimeout(checkElements, 100);
            }
        };

        checkElements();
    }

    // Sertifikatlarni yuklash (EIMZOClient yordamida)
    async loadCertificates() {
        try {
            // EIMZOClient mavjudligini tekshirish
            if (typeof EIMZOClient === 'undefined') {
                throw new Error('EIMZOClient kutubxonasi mavjud emas. Sahifani qayta yuklang.');
            }
            if (typeof CAPIWS === 'undefined') {
                throw new Error('CAPIWS mavjud emas. E-IMZO dasturini ishga tushiring va sahifani qayta yuklang.');
            }

            this.showLoading(true);
            this.showInfo('Sertifikatlar yuklanmoqda...');

            // Avval E-IMZO versiyasini tekshirish va API kalitlarini o'rnatish
            await new Promise((resolve, reject) => {
                EIMZOClient.checkVersion(
                    function(major, minor) {
                        console.log('E-IMZO versiyasi:', major, minor);
                        EIMZOClient.installApiKeys(
                            function() {
                                console.log('API kalitlari o\'rnatildi');
                                resolve();
                            },
                            function(e, r) {
                                console.error('API kalitlari o\'rnatilmadi:', e, r);
                                reject(new Error(e || r));
                            }
                        );
                    },
                    function(e, r) {
                        console.error('E-IMZO versiyasi tekshirilmadi:', e, r);
                        reject(new Error(e || r));
                    }
                );
            });

            // EIMZOClient yordamida sertifikatlarni yuklash
            const certificates = await new Promise((resolve, reject) => {
                try {
                    EIMZOClient.listAllUserKeys(
                        function(o, i) {
                            return "itm-" + o.serialNumber + "-" + i;
                        },
                        function(itemId, v) {
                            // Muddati tugagan sertifikatlarni belgilash
                            var now = new Date();
                            var expired = v.validTo && new Date(v.validTo) < now;
                            
                            return {
                                id: itemId,
                                value: v,
                                text: v.CN + (expired ? ' (muddati tugagan)' : ''),
                                expired: expired,
                                pinfl: v.PINFL,
                                serialNumber: v.serialNumber,
                                validFrom: v.validFrom,
                                validTo: v.validTo,
                                type: v.type,
                                style: expired ? 'color: gray;' : ''
                            };
                        },
                        function(items, firstId) {
                            console.log('EIMZOClient orqali sertifikatlar topildi:', items);
                            resolve(items);
                        },
                        function(e, r) {
                            console.error('EIMZOClient xatoligi:', e, r);
                            reject(new Error(e || r));
                        }
                    );
                } catch (error) {
                    console.error('EIMZOClient chaqirishda xatolik:', error);
                    reject(error);
                }
            });

            this.displayCertificates(certificates);
            this.showSuccess(`${certificates.length} ta sertifikat topildi`);

        } catch (error) {
            console.error('Sertifikatlar yuklanmadi:', error);
            this.showError('Sertifikatlar yuklanmadi: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // Sertifikatlarni ko'rsatish
    displayCertificates(certificates) {
        const container = document.getElementById('certificateList');
        if (!container) {
            console.error('certificateList element topilmadi');
            return;
        }
        
        container.innerHTML = '';

        if (certificates.length === 0) {
            container.innerHTML = `
                <div class="certificate-item" style="text-align: center; padding: 40px;">
                    <h4 style="color: #718096; margin-bottom: 10px;">📋 Sertifikatlar topilmadi</h4>
                    <p style="color: #a0aec0;">E-IMZO dasturida sertifikatlar mavjud emas yoki ular yuklanmagan</p>
                </div>
            `;
            return;
        }

        certificates.forEach((cert, index) => {
            const certElement = document.createElement('div');
            certElement.className = 'certificate-item slide-in';
            certElement.style.cssText = cert.style || '';
            certElement.style.animationDelay = `${index * 0.1}s`;
            
            const statusIcon = cert.expired ? '⚠️' : '✅';
            const statusText = cert.expired ? 'Muddati tugagan' : 'Faol';
            const statusColor = cert.expired ? '#e53e3e' : '#48bb78';
            
            certElement.innerHTML = `
                <div class="cert-info">
                    <h4>${statusIcon} ${cert.text}</h4>
                    <p><strong>📋 PINFL:</strong> ${cert.pinfl || 'Noma\'lum'}</p>
                    <p><strong>🔢 Seriya:</strong> ${cert.serialNumber || 'Noma\'lum'}</p>
                    <p><strong>📅 Amal qilish muddati:</strong> ${cert.validTo ? new Date(cert.validTo).toLocaleDateString('uz-UZ') : 'Noma\'lum'}</p>
                    <p><strong>📊 Holat:</strong> <span style="color: ${statusColor}; font-weight: 600;">${statusText}</span></p>
                </div>
                <button class="select-btn" onclick="authManager.selectCertificate('${cert.id}', ${JSON.stringify(cert.value).replace(/"/g, '&quot;')})" ${cert.expired ? 'disabled' : ''}>
                    ${cert.expired ? '❌ Muddati tugagan' : '✅ Tanlash'}
                </button>
            `;
            container.appendChild(certElement);
        });
    }

    // Sertifikatni tanlash
    selectCertificate(certId, certData) {
        this.selectedCertificate = {
            id: certId,
            data: certData
        };
        
        console.log('Tanlangan sertifikat:', this.selectedCertificate);
        this.showSuccess('Sertifikat tanlandi: ' + certData.CN);
        
        // Kirish tugmasini faollashtirish
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'ERI bilan kirish';
        }
    }

    // ERI bilan kirish
    async loginWithERI() {
        if (!this.selectedCertificate) {
            this.showError('Avval sertifikatni tanlang');
            return;
        }

        try {
            this.showLoading(true);
            this.showInfo('ERI bilan kirish jarayoni...');

            // 1-bosqich: Kalitni yuklash
            const keyId = await new Promise((resolve, reject) => {
                EIMZOClient.loadKey(
                    this.selectedCertificate.data,
                    function(id) {
                        console.log('Kalit yuklandi:', id);
                        resolve(id);
                    },
                    function(e, r) {
                        console.error('Kalit yuklanmadi:', e, r);
                        reject(new Error(e || r));
                    },
                    false // verifyPassword
                );
            });

            // 2-bosqich: Challenge olish
            const challengeResponse = await fetch('/api/auth/challenge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!challengeResponse.ok) {
                throw new Error(`Challenge olinmadi: ${challengeResponse.status}`);
            }

            const challengeData = await challengeResponse.json();
            console.log('Challenge olingan:', challengeData);

            // 3-bosqich: Challenge ni imzolash (PKCS7)
            const signatureData = await new Promise((resolve, reject) => {
                EIMZOClient.createPkcs7(
                    keyId,
                    challengeData.challenge,
                    null, // timestamper
                    function(pkcs7) {
                        console.log('PKCS7 imzo yaratildi');
                        resolve({ pkcs7: pkcs7 });
                    },
                    function(e, r) {
                        console.error('PKCS7 imzo yaratilmadi:', e, r);
                        reject(new Error(e || r));
                    },
                    false, // detached
                    true  // isDataBase64Encoded
                );
            });

            // 4-bosqich: Imzo tekshirish
            const authResult = await this.verifySignature(
                challengeData.challenge,
                null, // signature_hex
                null, // certificate_64 - PKCS7 dan olinadi
                signatureData.pkcs7
            );

            if (authResult.success) {
                this.showSuccess('Muvaffaqiyatli kirish!');
                this.userInfo = authResult.user;
                this.showUserInfo();
                
                // Kalitni o'chirish
                this.unloadKey(keyId);
            } else {
                this.showError('Kirish muvaffaqiyatsiz: ' + authResult.message);
            }

        } catch (error) {
            console.error('ERI bilan kirishda xatolik:', error);
            this.showError('ERI bilan kirishda xatolik: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // Imzo tekshirish
    async verifySignature(challenge, signature_hex, certificate_64, pkcs7) {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    challenge_data_64: challenge,
                    signature_hex: signature_hex,
                    certificate_64: certificate_64,
                    pkcs7: pkcs7
                })
            });

            if (!response.ok) {
                throw new Error(`Server xatoligi: ${response.status}`);
            }

            const result = await response.json();
            console.log('Imzo tekshirish natijasi:', result);
            return result;

        } catch (error) {
            console.error('Imzo tekshirishda xatolik:', error);
            return { success: false, message: error.message };
        }
    }

    // Kalitni o'chirish
    unloadKey(keyId) {
        if (typeof CAPIWS !== 'undefined') {
            CAPIWS.callFunction({
                plugin: "pfx",
                name: "unload_key",
                arguments: [keyId]
            }, function(event, data) {
                console.log('Kalit o\'chirildi:', data);
            }, function(error) {
                console.error('Kalit o\'chirilmadi:', error);
            });
        }
    }


    // Foydalanuvchi ma'lumotlarini ko'rsatish
    showUserInfo() {
        if (this.userInfo) {
            const userInfoDiv = document.getElementById('userInfo');
            userInfoDiv.innerHTML = `
                <h3>🎉 Muvaffaqiyatli avtorizatsiya!</h3>
                <div class="user-details">
                    <p><strong>👤 Ism:</strong> ${this.userInfo.full_name}</p>
                    <p><strong>🆔 PINFL:</strong> ${this.userInfo.pinfl}</p>
                    <p><strong>🔢 Sertifikat seriyasi:</strong> ${this.userInfo.certificate_serial}</p>
                    <p><strong>⏰ Kirish vaqti:</strong> ${new Date().toLocaleString('uz-UZ')}</p>
                </div>
            `;
            userInfoDiv.style.display = 'block';
            userInfoDiv.classList.add('fade-in');
        }
    }

    // UI yordamchi funksiyalari
    showLoading(show) {
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) {
            loadingDiv.style.display = show ? 'block' : 'none';
        }
    }

    showInfo(message) {
        this.showStatus(message, 'info');
    }

    showSuccess(message) {
        this.showStatus(message, 'success');
    }

    showError(message) {
        this.showStatus(message, 'error');
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `status ${type}`;
            statusDiv.style.display = 'block';
            
            // 3 soniyadan keyin yashirish
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }
}

// AuthManager ni ishga tushirish
let authManager;
document.addEventListener('DOMContentLoaded', function() {
    authManager = new AuthManager();
});
