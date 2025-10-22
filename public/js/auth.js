// Autentifikatsiya logikasi
class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.userToken = null;
        this.userInfo = null;
        this.init();
    }

    // Dasturni ishga tushirish
    init() {
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    // Event listenerlarni sozlash
    setupEventListeners() {
        // Sertifikatlarni yuklash tugmasi
        document.getElementById('loadCertificatesBtn').addEventListener('click', () => {
            this.loadCertificates();
        });

        // Sahifani qayta yuklash tugmasi
        document.getElementById('refreshPageBtn').addEventListener('click', () => {
            window.location.reload();
        });

        // CAPIWS holatini tekshirish tugmasi
        document.getElementById('checkCAPIWSBtn').addEventListener('click', () => {
            this.checkCAPIWSStatus();
        });

        // Kirish tugmasi
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.loginWithERI();
        });

        // Chiqish tugmasi
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });
    }

    // Mavjud autentifikatsiyani tekshirish
    checkExistingAuth() {
        const token = localStorage.getItem('eri_token');
        if (token) {
            this.userToken = token;
            this.isAuthenticated = true;
            this.showUserInfo();
        }
    }

    // Sertifikatlarni yuklash (E-IMZO namuna kodiga asosan)
    async loadCertificates() {
        try {
            // capiwsManager mavjudligini tekshirish
            if (typeof capiwsManager === 'undefined') {
                throw new Error('CAPIWS Manager mavjud emas. Sahifani qayta yuklang.');
            }

            // CAPIWS mavjudligini tekshirish
            if (!capiwsManager.isPluginLoaded) {
                throw new Error('CAPIWS mavjud emas. E-IMZO dasturini ishga tushiring va sahifani qayta yuklang.');
            }

            capiwsManager.showLoading(true);
            capiwsManager.showInfo('Sertifikatlar yuklanmoqda...');

            // E-IMZO namuna kodiga asosan barcha kalitlarni olish
            let allCertificates = [];
            
            try {
                // Avval E-IMZO versiyasini tekshirish
                const version = await capiwsManager.checkVersion();
                console.log('E-IMZO versiyasi:', version);
                capiwsManager.showDebug(`E-IMZO versiyasi: ${JSON.stringify(version)}`);

                // ID-karta ulanganligini tekshirish
                let isIdCardPlugged = false;
                try {
                    isIdCardPlugged = await capiwsManager.idCardIsPluggedIn();
                    console.log('ID-karta ulangan:', isIdCardPlugged);
                    capiwsManager.showDebug(`ID-karta ulangan: ${isIdCardPlugged}`);
                } catch (error) {
                    console.warn('ID-karta holati olinmadi:', error);
                }

                // E-IMZO holatini ko'rsatish
                capiwsManager.showEIMZOStatus(version, isIdCardPlugged);

                // Barcha kalitlarni olish
                const allKeys = await capiwsManager.listAllKeys();
                console.log('Barcha kalitlar topildi:', allKeys);
                allCertificates = allKeys;
            } catch (error) {
                console.warn('Barcha kalitlar olinmadi, disklar orqali harakat qilamiz:', error);
                
                // Agar barcha kalitlar olinmasa, disklar orqali harakat qilamiz
                const disks = await capiwsManager.listDisks();
                console.log('Topilgan disklar:', disks);

                // Har bir disk uchun sertifikatlarni olish
                for (const disk of disks) {
                    try {
                        const certificates = await capiwsManager.listCertificates(disk);
                        certificates.forEach(cert => {
                            cert.disk = disk;
                            allCertificates.push(cert);
                        });
                    } catch (error) {
                        console.warn(`Disk ${disk} uchun sertifikatlar olinmadi:`, error);
                    }
                }
            }

            this.displayCertificates(allCertificates);
            capiwsManager.showSuccess(`${allCertificates.length} ta sertifikat topildi`);

        } catch (error) {
            console.error('Sertifikatlar yuklanmadi:', error);
            capiwsManager.showError('Sertifikatlar yuklanmadi: ' + error.message);
        } finally {
            capiwsManager.showLoading(false);
        }
    }

    // Sertifikatlarni ko'rsatish
    displayCertificates(certificates) {
        const certificateList = document.getElementById('certificateList');
        certificateList.innerHTML = '';

        if (certificates.length === 0) {
            certificateList.innerHTML = '<p style="color: #666; text-align: center;">Sertifikatlar topilmadi</p>';
            return;
        }

        certificates.forEach((cert, index) => {
            const certElement = document.createElement('div');
            certElement.className = 'certificate-item';
            certElement.innerHTML = `
                <div class="certificate-name">${cert.name || cert.alias || 'Noma\'lum sertifikat'}</div>
                <div class="certificate-info">
                    Disk: ${cert.disk} | 
                    Path: ${cert.path || 'N/A'} | 
                    Alias: ${cert.alias || 'N/A'}
                </div>
            `;

            certElement.addEventListener('click', () => {
                // Boshqa sertifikatlardan tanlovni olib tashlash
                document.querySelectorAll('.certificate-item').forEach(item => {
                    item.classList.remove('selected');
                });

                // Joriy sertifikatni tanlash
                certElement.classList.add('selected');
                capiwsManager.selectCertificate(cert);

                // Kirish tugmasini faollashtirish
                document.getElementById('loginBtn').disabled = false;
            });

            certificateList.appendChild(certElement);
        });
    }

    // ERI bilan kirish
    async loginWithERI() {
        // capiwsManager mavjudligini tekshirish
        if (typeof capiwsManager === 'undefined') {
            alert('CAPIWS Manager mavjud emas. Sahifani qayta yuklang.');
            return;
        }

        const selectedCert = capiwsManager.getSelectedCertificate();
        if (!selectedCert) {
            capiwsManager.showError('Sertifikat tanlanmagan');
            return;
        }

        try {
            capiwsManager.showLoading(true);
            capiwsManager.showInfo('Avtorizatsiya jarayoni boshlandi...');

            // 1-bosqich: Kalitni yuklash
            const keyData = await capiwsManager.loadKey(
                selectedCert.disk,
                selectedCert.path,
                selectedCert.name,
                selectedCert.alias
            );

            const { keyId, certificate_64 } = keyData;
            console.log('Kalit yuklandi, keyId:', keyId);

            // 2-bosqich: Challenge olish
            const challengeData = await this.fetchChallenge();
            console.log('Challenge olingan:', challengeData.challenge);

            // 3-bosqich: Challenge ni imzolash (E-IMZO hujjatlariga asosan)
            let signatureData;
            try {
                // Avval PKCS7 imzo yaratishga harakat qilamiz
                signatureData = await capiwsManager.createPKCS7(
                    keyId,
                    challengeData.challenge
                );
                console.log('PKCS7 imzo yaratildi');
            } catch (error) {
                console.warn('PKCS7 imzo yaratilmadi, oddiy imzo yaratishga harakat qilamiz:', error);
                // Agar PKCS7 ishlamasa, oddiy imzo yaratishga harakat qilamiz
                signatureData = await capiwsManager.getSignature(
                    challengeData.challenge,
                    keyId
                );
                console.log('Oddiy imzo olingan');
            }

            const { signature_hex, pkcs7 } = signatureData;
            console.log('Imzo olingan:', { signature_hex: signature_hex ? 'mavjud' : 'yo\'q', pkcs7: pkcs7 ? 'mavjud' : 'yo\'q' });

            // 4-bosqich: Imzo tekshirish
            const authResult = await this.verifySignature(
                challengeData.challenge,
                signature_hex,
                certificate_64,
                pkcs7
            );

            if (authResult.success) {
                // JWT tokenni saqlash
                this.userToken = authResult.token;
                this.userInfo = authResult.user;
                this.isAuthenticated = true;

                localStorage.setItem('eri_token', this.userToken);
                localStorage.setItem('eri_user', JSON.stringify(this.userInfo));

                capiwsManager.showSuccess('Muvaffaqiyatli avtorizatsiya qilindi!');
                this.showUserInfo();

                // Kalitni o'chirish
                await capiwsManager.unloadKey(keyId);
            } else {
                capiwsManager.showError('Avtorizatsiya muvaffaqiyatsiz: ' + authResult.message);
            }

        } catch (error) {
            console.error('Avtorizatsiya xatoligi:', error);
            capiwsManager.showError('Avtorizatsiya xatoligi: ' + error.message);
        } finally {
            capiwsManager.showLoading(false);
        }
    }

    // Challenge olish
    async fetchChallenge() {
        const response = await fetch('/api/auth/challenge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Challenge olinmadi');
        }

        return await response.json();
    }

    // Imzo tekshirish
    async verifySignature(challengeData64, signatureHex, certificate64, pkcs7 = null) {
        const requestBody = {
            challenge_data_64: challengeData64,
            signature_hex: signatureHex,
            certificate_64: certificate64
        };

        // Agar PKCS7 mavjud bo'lsa, qo'shamiz
        if (pkcs7) {
            requestBody.pkcs7 = pkcs7;
        }

        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Imzo tekshirilmadi');
        }

        return await response.json();
    }

    // Foydalanuvchi ma'lumotlarini ko'rsatish
    showUserInfo() {
        if (!this.isAuthenticated || !this.userInfo) return;

        const userInfoDiv = document.getElementById('userInfo');
        const userDetailsDiv = document.getElementById('userDetails');
        const certificateSection = document.getElementById('certificateSection');

        userDetailsDiv.innerHTML = `
            <p><strong>To'liq ism:</strong> ${this.userInfo.full_name}</p>
            <p><strong>PINFL:</strong> ${this.userInfo.pinfl}</p>
            <p><strong>Sertifikat seriyasi:</strong> ${this.userInfo.certificate_serial}</p>
            <p><strong>Avtorizatsiya vaqti:</strong> ${new Date().toLocaleString('uz-UZ')}</p>
        `;

        userInfoDiv.style.display = 'block';
        certificateSection.style.display = 'none';
    }

    // Chiqish
    logout() {
        // Kalitni tozalash
        if (typeof capiwsManager !== 'undefined') {
            capiwsManager.cleanup();
        }

        // Ma'lumotlarni tozalash
        this.isAuthenticated = false;
        this.userToken = null;
        this.userInfo = null;

        localStorage.removeItem('eri_token');
        localStorage.removeItem('eri_user');

        // UI ni qayta tiklash
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('certificateSection').style.display = 'block';
        document.getElementById('certificateList').innerHTML = '';
        document.getElementById('loginBtn').disabled = true;

        if (typeof capiwsManager !== 'undefined') {
            capiwsManager.showInfo('Muvaffaqiyatli chiqildi');
        }
    }

    // CAPIWS holatini tekshirish
    checkCAPIWSStatus() {
        console.log('CAPIWS holatini tekshirish...');
        
        const status = {
            capiwsManager: typeof capiwsManager !== 'undefined',
            capiwsPlugin: typeof CAPIWS !== 'undefined',
            isPluginLoaded: capiwsManager ? capiwsManager.isPluginLoaded : false
        };
        
        console.log('CAPIWS holati:', status);
        
        let message = 'CAPIWS holati:\n';
        message += `- CAPIWS Manager: ${status.capiwsManager ? 'mavjud' : 'mavjud emas'}\n`;
        message += `- CAPIWS Plugin: ${status.capiwsPlugin ? 'mavjud' : 'mavjud emas'}\n`;
        message += `- Plugin yuklangan: ${status.isPluginLoaded ? 'ha' : 'yo\'q'}\n`;
        
        if (status.capiwsPlugin) {
            message += '\n✅ CAPIWS mavjud va ishlamoqda!';
        } else {
            message += '\n❌ CAPIWS mavjud emas. E-IMZO dasturini ishga tushiring.';
        }
        
        alert(message);
    }
}

// Dasturni ishga tushirish
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
