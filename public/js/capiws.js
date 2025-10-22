// E-IMZO CAPIWS integratsiyasi
class CAPIWSManager {
    constructor() {
        this.isPluginLoaded = false;
        this.selectedCertificate = null;
        this.currentKeyId = null;
        this.init();
    }

    // CAPIWS plaginini ishga tushirish
    init() {
        if (typeof CAPIWS !== 'undefined') {
            this.isPluginLoaded = true;
            console.log('✅ E-IMZO CAPIWS plagini yuklandi');
            this.setupErrorHandling();
        } else {
            console.error('❌ E-IMZO CAPIWS plagini topilmadi');
            this.showError('E-IMZO CAPIWS plagini yuklang va sahifani qayta yuklang');
        }
    }

    // Xatolik boshqarish
    setupErrorHandling() {
        CAPIWS.onError = (error) => {
            console.error('CAPIWS xatoligi:', error);
            this.showError(`CAPIWS xatoligi: ${error.message || error}`);
        };
    }

    // Xatolik ko'rsatish
    showError(message) {
        const statusDiv = document.getElementById('status');
        statusDiv.className = 'status error';
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
        
        // 5 soniyadan keyin yashirish
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }

    // Muvaffaqiyat xabari
    showSuccess(message) {
        const statusDiv = document.getElementById('status');
        statusDiv.className = 'status success';
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }

    // Ma'lumot xabari
    showInfo(message) {
        const statusDiv = document.getElementById('status');
        statusDiv.className = 'status info';
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
    }

    // Loading ko'rsatish
    showLoading(show = true) {
        const loadingDiv = document.getElementById('loading');
        loadingDiv.style.display = show ? 'block' : 'none';
    }

    // Disklarni ro'yxatga olish
    async listDisks() {
        return new Promise((resolve, reject) => {
            if (!this.isPluginLoaded) {
                reject(new Error('CAPIWS plagini yuklanmagan'));
                return;
            }

            CAPIWS.callFunction({
                plugin: "pfx",
                name: "list_disks"
            }, (event, data) => {
                if (event === 'success') {
                    console.log('Disklar topildi:', data);
                    resolve(data.disks || []);
                } else {
                    console.error('Disklar ro\'yxatga olinmadi:', data);
                    reject(new Error(data.message || 'Disklar ro\'yxatga olinmadi'));
                }
            });
        });
    }

    // Sertifikatlarni ro'yxatga olish
    async listCertificates(disk) {
        return new Promise((resolve, reject) => {
            CAPIWS.callFunction({
                plugin: "pfx",
                name: "list_certificates",
                arguments: [disk]
            }, (event, data) => {
                if (event === 'success') {
                    console.log('Sertifikatlar topildi:', data);
                    resolve(data.certificates || []);
                } else {
                    console.error('Sertifikatlar ro\'yxatga olinmadi:', data);
                    reject(new Error(data.message || 'Sertifikatlar ro\'yxatga olinmadi'));
                }
            });
        });
    }

    // Kalitni yuklash
    async loadKey(disk, path, name, alias) {
        return new Promise((resolve, reject) => {
            CAPIWS.callFunction({
                plugin: "pfx",
                name: "load_key",
                arguments: [disk, path, name, alias]
            }, (event, data) => {
                if (event === 'success') {
                    console.log('Kalit yuklandi:', data);
                    this.currentKeyId = data.keyId;
                    resolve(data);
                } else {
                    console.error('Kalit yuklanmadi:', data);
                    reject(new Error(data.message || 'Kalit yuklanmadi'));
                }
            });
        });
    }

    // Imzo olish
    async getSignature(data, keyId) {
        return new Promise((resolve, reject) => {
            CAPIWS.callFunction({
                plugin: "cryptoauth",
                name: "get_signature",
                arguments: [data, keyId]
            }, (event, data) => {
                if (event === 'success') {
                    console.log('Imzo olingan:', data);
                    resolve(data);
                } else {
                    console.error('Imzo olinmadi:', data);
                    reject(new Error(data.message || 'Imzo olinmadi'));
                }
            });
        });
    }

    // Kalitni o'chirish
    async unloadKey(keyId) {
        return new Promise((resolve, reject) => {
            CAPIWS.callFunction({
                plugin: "pfx",
                name: "unload_key",
                arguments: [keyId]
            }, (event, data) => {
                if (event === 'success') {
                    console.log('Kalit o\'chirildi');
                    this.currentKeyId = null;
                    resolve(data);
                } else {
                    console.error('Kalit o\'chirilmadi:', data);
                    reject(new Error(data.message || 'Kalit o\'chirilmadi'));
                }
            });
        });
    }

    // Sertifikatni tanlash
    selectCertificate(certificate) {
        this.selectedCertificate = certificate;
        console.log('Sertifikat tanlandi:', certificate);
    }

    // Tanlangan sertifikatni olish
    getSelectedCertificate() {
        return this.selectedCertificate;
    }

    // Joriy kalit ID
    getCurrentKeyId() {
        return this.currentKeyId;
    }

    // Tozalash
    cleanup() {
        if (this.currentKeyId) {
            this.unloadKey(this.currentKeyId).catch(console.error);
        }
        this.selectedCertificate = null;
        this.currentKeyId = null;
    }
}

// Global CAPIWS manager
window.capiwsManager = new CAPIWSManager();
