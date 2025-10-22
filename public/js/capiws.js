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
        this.showDebug('CAPIWS Manager ishga tushirilmoqda...');
        
        // CAPIWS mavjudligini tekshirish
        this.checkCAPIWS();
    }

    // CAPIWS mavjudligini tekshirish (namuna kodga asosan)
    checkCAPIWS() {
        this.showDebug('CAPIWS mavjudligini tekshirish...');
        
        if (typeof CAPIWS !== 'undefined') {
            this.isPluginLoaded = true;
            this.showDebug('✅ CAPIWS mavjud');
            this.setupErrorHandling();
        } else {
            this.showDebug('❌ CAPIWS mavjud emas, kutish...');
            // CAPIWS yuklanishini kutish
            this.waitForCAPIWS();
        }
    }

    // CAPIWS yuklanishini kutish (namuna kodga asosan)
    waitForCAPIWS() {
        let attempts = 0;
        const maxAttempts = 100; // 10 soniya kutish
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            if (typeof CAPIWS !== 'undefined') {
                clearInterval(checkInterval);
                this.isPluginLoaded = true;
                this.showDebug('✅ CAPIWS yuklandi');
                this.setupErrorHandling();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                this.showDebug('❌ CAPIWS yuklanmadi');
                this.showError('CAPIWS mavjud emas. E-IMZO dasturini ishga tushiring va sahifani qayta yuklang.');
            }
        }, 100);
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
        
        console.error('CAPIWS Xatolik:', message);
        
        // 10 soniyadan keyin yashirish
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 10000);
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

    // Debug ma'lumotlarini ko'rsatish
    showDebug(message) {
        const debugDiv = document.getElementById('debugInfo');
        const debugText = document.getElementById('debugText');
        
        if (debugDiv && debugText) {
            debugText.innerHTML += new Date().toLocaleTimeString() + ': ' + message + '<br>';
            debugDiv.style.display = 'block';
        }
        
        console.log(message);
    }

    // E-IMZO holatini ko'rsatish
    showEIMZOStatus(version, idCardStatus) {
        const versionInfo = document.getElementById('versionInfo');
        const idcardInfo = document.getElementById('idcardInfo');
        
        if (versionInfo) {
            versionInfo.textContent = `E-IMZO versiyasi: ${version || 'Noma\'lum'}`;
        }
        
        if (idcardInfo) {
            idcardInfo.textContent = `ID-karta: ${idCardStatus ? 'ulangan' : 'ulangan emas'}`;
        }
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
                this.showDebug('CAPIWS yuklanmagan, kutish...');
                // CAPIWS yuklanishini kutish
                const checkInterval = setInterval(() => {
                    if (this.isPluginLoaded) {
                        clearInterval(checkInterval);
                        this.listDisks().then(resolve).catch(reject);
                    }
                }, 100);
                
                setTimeout(() => {
                    clearInterval(checkInterval);
                    reject(new Error('CAPIWS yuklanmadi'));
                }, 5000);
                return;
            }

            this.showDebug('Disklarni ro\'yxatga olish...');
            
            CAPIWS.callFunction({
                plugin: "pfx",
                name: "list_disks"
            }, (event, data) => {
                if (event === 'success') {
                    console.log('Disklar topildi:', data);
                    this.showDebug(`Disklar topildi: ${JSON.stringify(data)}`);
                    resolve(data.disks || []);
                } else {
                    console.error('Disklar ro\'yxatga olinmadi:', data);
                    this.showDebug('Disklar ro\'yxatga olinmadi: ' + JSON.stringify(data));
                    reject(new Error(data.message || 'Disklar ro\'yxatga olinmadi'));
                }
            });
        });
    }

    // Sertifikatlarni ro'yxatga olish
    async listCertificates(disk) {
        return new Promise((resolve, reject) => {
            this.showDebug(`Sertifikatlarni ro'yxatga olish: ${disk}`);
            
            CAPIWS.callFunction({
                plugin: "pfx",
                name: "list_certificates",
                arguments: [disk]
            }, (event, data) => {
                if (event === 'success') {
                    console.log('Sertifikatlar topildi:', data);
                    this.showDebug(`Sertifikatlar topildi: ${JSON.stringify(data)}`);
                    resolve(data.certificates || []);
                } else {
                    console.error('Sertifikatlar ro\'yxatga olinmadi:', data);
                    this.showDebug('Sertifikatlar ro\'yxatga olinmadi: ' + JSON.stringify(data));
                    reject(new Error(data.message || 'Sertifikatlar ro\'yxatga olinmadi'));
                }
            });
        });
    }

    // Barcha kalitlarni ro'yxatga olish (E-IMZO namuna kodiga asosan)
    async listAllKeys() {
        return new Promise((resolve, reject) => {
            this.showDebug('Barcha kalitlarni ro\'yxatga olish...');
            
            CAPIWS.callFunction({
                plugin: "pfx",
                name: "list_all_keys"
            }, (event, data) => {
                if (event === 'success') {
                    console.log('Barcha kalitlar topildi:', data);
                    this.showDebug(`Barcha kalitlar topildi: ${JSON.stringify(data)}`);
                    resolve(data.keys || []);
                } else {
                    console.error('Kalitlar ro\'yxatga olinmadi:', data);
                    this.showDebug('Kalitlar ro\'yxatga olinmadi: ' + JSON.stringify(data));
                    reject(new Error(data.message || 'Kalitlar ro\'yxatga olinmadi'));
                }
            });
        });
    }

    // E-IMZO versiyasini tekshirish (namuna kodiga asosan)
    async checkVersion() {
        return new Promise((resolve, reject) => {
            this.showDebug('E-IMZO versiyasini tekshirish...');
            
            CAPIWS.callFunction({
                plugin: "system",
                name: "get_version"
            }, (event, data) => {
                if (event === 'success') {
                    console.log('E-IMZO versiyasi:', data);
                    this.showDebug(`E-IMZO versiyasi: ${JSON.stringify(data)}`);
                    resolve(data);
                } else {
                    console.error('Versiya olinmadi:', data);
                    this.showDebug('Versiya olinmadi: ' + JSON.stringify(data));
                    reject(new Error(data.message || 'Versiya olinmadi'));
                }
            });
        });
    }

    // ID-karta ulanganligini tekshirish (namuna kodiga asosan)
    async idCardIsPluggedIn() {
        return new Promise((resolve, reject) => {
            this.showDebug('ID-karta ulanganligini tekshirish...');
            
            CAPIWS.callFunction({
                plugin: "idcard",
                name: "is_plugged_in"
            }, (event, data) => {
                if (event === 'success') {
                    console.log('ID-karta holati:', data);
                    this.showDebug(`ID-karta holati: ${JSON.stringify(data)}`);
                    resolve(data.isPlugged || false);
                } else {
                    console.error('ID-karta holati olinmadi:', data);
                    this.showDebug('ID-karta holati olinmadi: ' + JSON.stringify(data));
                    reject(new Error(data.message || 'ID-karta holati olinmadi'));
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

    // Imzo olish (E-IMZO hujjatlariga asosan)
    async getSignature(data, keyId) {
        return new Promise((resolve, reject) => {
            this.showDebug(`Imzo olish: ${data.substring(0, 50)}...`);
            
            CAPIWS.callFunction({
                plugin: "cryptoauth",
                name: "get_signature",
                arguments: [data, keyId]
            }, (event, data) => {
                if (event === 'success') {
                    console.log('Imzo olingan:', data);
                    this.showDebug('Imzo muvaffaqiyatli olingan');
                    resolve(data);
                } else {
                    console.error('Imzo olinmadi:', data);
                    this.showDebug('Imzo olinmadi: ' + JSON.stringify(data));
                    reject(new Error(data.message || 'Imzo olinmadi'));
                }
            });
        });
    }

    // PKCS7 imzo yaratish (E-IMZO hujjatlariga asosan)
    async createPKCS7(keyId, challenge) {
        return new Promise((resolve, reject) => {
            this.showDebug(`PKCS7 imzo yaratish: ${challenge.substring(0, 50)}...`);
            
            CAPIWS.callFunction({
                plugin: "cryptoauth",
                name: "create_pkcs7",
                arguments: [keyId, challenge]
            }, (event, data) => {
                if (event === 'success') {
                    console.log('PKCS7 imzo yaratildi:', data);
                    this.showDebug('PKCS7 imzo muvaffaqiyatli yaratildi');
                    resolve(data);
                } else {
                    console.error('PKCS7 imzo yaratilmadi:', data);
                    this.showDebug('PKCS7 imzo yaratilmadi: ' + JSON.stringify(data));
                    reject(new Error(data.message || 'PKCS7 imzo yaratilmadi'));
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
