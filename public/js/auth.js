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

    // Sertifikatlarni yuklash
    async loadCertificates() {
        try {
            capiwsManager.showLoading(true);
            capiwsManager.showInfo('Sertifikatlar yuklanmoqda...');

            // Disklarni ro'yxatga olish
            const disks = await capiwsManager.listDisks();
            console.log('Topilgan disklar:', disks);

            const allCertificates = [];

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

            // 3-bosqich: Challenge ni imzolash
            const signatureData = await capiwsManager.getSignature(
                challengeData.challenge,
                keyId
            );

            const { signature_hex } = signatureData;
            console.log('Imzo olingan');

            // 4-bosqich: Imzo tekshirish
            const authResult = await this.verifySignature(
                challengeData.challenge,
                signature_hex,
                certificate_64
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
    async verifySignature(challengeData64, signatureHex, certificate64) {
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                challenge_data_64: challengeData64,
                signature_hex: signatureHex,
                certificate_64: certificate64
            })
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
        capiwsManager.cleanup();

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

        capiwsManager.showInfo('Muvaffaqiyatli chiqildi');
    }
}

// Dasturni ishga tushirish
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
