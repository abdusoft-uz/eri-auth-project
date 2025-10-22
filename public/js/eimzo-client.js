/**
 * EIMZOClient - E-IMZO CAPIWS uchun maxsus kutubxona
 * Namuna kodga asosan yaratilgan
 */

var EIMZOClient = {
    NEW_API: false,
    NEW_API2: false,
    NEW_API3: false,
    API_KEYS: [
        'localhost', '96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B',
        '127.0.0.1', 'A7BCFA5D490B351BE0754130DF03A068F855DB4333D43921125B9CF2670EF6A40370C646B90401955E1F7BC9CDBF59CE0B2C5467D820BE189C845D0B79CFC96F'
    ],

    // E-IMZO versiyasini tekshirish
    checkVersion: function(success, fail) {
        if (typeof CAPIWS === 'undefined') {
            fail('CAPIWS mavjud emas', null);
            return;
        }
        
        CAPIWS.version(function (event, data) {
            if (data.success === true) {
                if (data.major && data.minor) {
                    var installedVersion = parseInt(data.major) * 100 + parseInt(data.minor);
                    EIMZOClient.NEW_API = installedVersion >= 336;
                    EIMZOClient.NEW_API2 = installedVersion >= 412;
                    EIMZOClient.NEW_API3 = installedVersion >= 486;
                    console.log('E-IMZO versiyasi tekshirildi:', data.major, data.minor, 'NEW_API:', EIMZOClient.NEW_API);
                    success(data.major, data.minor);
                } else {
                    fail(null, 'E-IMZO Version is undefined');
                }
            } else {
                fail(null, data.reason);
            }
        }, function (e) {
            fail(e, null);
        });
    },

    // API kalitlarini o'rnatish
    installApiKeys: function(success, fail) {
        if (typeof CAPIWS === 'undefined') {
            fail('CAPIWS mavjud emas', null);
            return;
        }
        
        CAPIWS.apikey(EIMZOClient.API_KEYS, function (event, data) {
            if (data.success) {
                success();
            } else {
                fail(null, data.reason);
            }
        }, function (e) {
            fail(e, null);
        });
    },

    // Barcha foydalanuvchi kalitlarini ro'yxatga olish
    listAllUserKeys: function(itemIdGen, itemUiGen, success, fail) {
        var items = [];
        var errors = [];
        
        console.log('listAllUserKeys chaqirildi, NEW_API:', EIMZOClient.NEW_API);
        
        if (!EIMZOClient.NEW_API) {
            console.log('E-IMZO versiyasi yetarli emas, NEW_API:', EIMZOClient.NEW_API);
            fail(null, 'E-IMZO yangi versiyasini o\'rnating');
        } else {
            if (EIMZOClient.NEW_API2) {
                EIMZOClient._findPfxs2(itemIdGen, itemUiGen, items, errors, function (firstItmId2) {
                    if (items.length === 0 && errors.length > 0) {
                        fail(errors[0].e, errors[0].r);
                    } else {
                        var firstId = null;
                        if (items.length === 1) {
                            firstId = items[0].id;
                        } else if (items.length > 1) {
                            firstId = firstItmId2;
                        }
                        success(items, firstId);
                    }
                });
            } else {
                EIMZOClient._findPfxs2(itemIdGen, itemUiGen, items, errors, function (firstItmId2) {
                    EIMZOClient._findTokens2(itemIdGen, itemUiGen, items, errors, function (firstItmId3) {
                        if (items.length === 0 && errors.length > 0) {
                            fail(errors[0].e, errors[0].r);
                        } else {
                            var firstId = null;
                            if (items.length === 1) {
                                firstId = items[0].id;
                            } else if (items.length > 1) {
                                firstId = firstItmId2 || firstItmId3;
                            }
                            success(items, firstId);
                        }
                    });
                });
            }
        }
    },

    // ID-karta ulanganligini tekshirish
    idCardIsPLuggedIn: function(success, fail) {
        if (!EIMZOClient.NEW_API2) {
            console.log("E-IMZO versiyasi 4.12 yoki yangiroq bo'lishi kerak");
            success(false);
        } else {
            CAPIWS.callFunction({plugin: "idcard", name: "list_readers"}, function (event, data) {
                if (data.success) {
                    success(data.readers && data.readers.length > 0);
                } else {
                    success(false);
                }
            }, function (e) {
                fail(e, null);
            });
        }
    },

    // BAIK Token ulanganligini tekshirish
    isBAIKTokenPLuggedIn: function(success, fail) {
        if (!EIMZOClient.NEW_API3) {
            console.log("E-IMZO versiyasi 4.86 yoki yangiroq bo'lishi kerak");
            success(false);
        } else {
            CAPIWS.callFunction({plugin: "baikey", name: "list_tokens"}, function (event, data) {
                if (data.success) {
                    success(data.tokens && data.tokens.length > 0);
                } else {
                    success(false);
                }
            }, function (e) {
                fail(e, null);
            });
        }
    },

    // CKC ulanganligini tekshirish
    isCKCPLuggedIn: function(success, fail) {
        if (!EIMZOClient.NEW_API3) {
            console.log("E-IMZO versiyasi 4.86 yoki yangiroq bo'lishi kerak");
            success(false);
        } else {
            CAPIWS.callFunction({plugin: "ckc", name: "list_ckc"}, function (event, data) {
                if (data.success) {
                    success(data.ckcs && data.ckcs.length > 0);
                } else {
                    success(false);
                }
            }, function (e) {
                fail(e, null);
            });
        }
    },

    // Kalitni yuklash
    loadKey: function(itemObject, success, fail, verifyPassword) {
        if (itemObject) {
            var vo = itemObject;
            if (vo.type === "pfx") {
                CAPIWS.callFunction({
                    plugin: "pfx", 
                    name: "load_key", 
                    arguments: [vo.disk, vo.path, vo.name, vo.alias]
                }, function (event, data) {
                    if (data.success) {
                        var id = data.keyId;
                        if (verifyPassword) {
                            CAPIWS.callFunction({
                                name: "verify_password", 
                                plugin: "pfx", 
                                arguments: [id]
                            }, function (event, data) {
                                if (data.success) {
                                    success(id);
                                } else {
                                    fail(null, data.reason);
                                }
                            }, function (e) {
                                fail(e, null);
                            });
                        } else {
                            success(id);
                        }
                    } else {
                        fail(null, data.reason);
                    }
                }, function (e) {
                    fail(e, null);
                });
            } else if (vo.type === "ftjc") {
                CAPIWS.callFunction({
                    plugin: "ftjc", 
                    name: "load_key", 
                    arguments: [vo.cardUID]
                }, function (event, data) {
                    if (data.success) {
                        success(data.keyId);
                    } else {
                        fail(null, data.reason);
                    }
                }, function (e) {
                    fail(e, null);
                });
            }
        } else {
            fail(null, 'Kalit obyekti mavjud emas');
        }
    },

    // PKCS7 imzo yaratish
    createPkcs7: function(id, data, timestamper, success, fail, detached, isDataBase64Encoded) {
        var data64;
        if (isDataBase64Encoded === true) {
            data64 = data;
        } else {
            data64 = btoa(data); // Base64 encoding
        }
        
        if (detached === true) {
            detached = 'yes';
        } else {
            detached = 'no';
        }
        
        CAPIWS.callFunction({
            plugin: "pkcs7", 
            name: "create_pkcs7", 
            arguments: [data64, id, detached]
        }, function (event, data) {
            if (data.success) {
                var pkcs7 = data.pkcs7_64;
                success(pkcs7);
            } else {
                fail(null, data.reason);
            }
        }, function (e) {
            fail(e, null);
        });
    },

    // X500 nomidan qiymat olish
    _getX500Val: function(x500name, key) {
        if (!x500name) return '';
        var parts = x500name.split(',');
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i].trim();
            if (part.toLowerCase().indexOf(key.toLowerCase()) === 0) {
                var eqIndex = part.indexOf('=');
                if (eqIndex !== -1) {
                    return part.substring(eqIndex + 1).trim();
                }
            }
        }
        return '';
    },

    // PFX kalitlarini topish
    _findPfxs2: function(itemIdGen, itemUiGen, items, errors, callback) {
        console.log('_findPfxs2 chaqirildi');
        CAPIWS.callFunction({plugin: "pfx", name: "list_all_certificates"}, function (event, data) {
            console.log('list_all_certificates natijasi:', data);
            if (data.success) {
                var firstId = null;
                for (var i = 0; i < data.certificates.length; i++) {
                    var el = data.certificates[i];
                    var x500name_ex = el.alias.toUpperCase();
                    x500name_ex = x500name_ex.replace("1.2.860.3.16.1.1=", "INN=");
                    x500name_ex = x500name_ex.replace("1.2.860.3.16.1.2=", "PINFL=");
                    var vo = {
                        disk: el.disk,
                        path: el.path,
                        name: el.name,
                        alias: el.alias,
                        serialNumber: EIMZOClient._getX500Val(x500name_ex, "SERIALNUMBER"),
                        validFrom: new Date(EIMZOClient._getX500Val(x500name_ex, "VALIDFROM").replace(/\./g, "-").replace(" ", "T")),
                        validTo: new Date(EIMZOClient._getX500Val(x500name_ex, "VALIDTO").replace(/\./g, "-").replace(" ", "T")),
                        CN: EIMZOClient._getX500Val(x500name_ex, "CN"),
                        TIN: (EIMZOClient._getX500Val(x500name_ex, "INN") ? EIMZOClient._getX500Val(x500name_ex, "INN") : EIMZOClient._getX500Val(x500name_ex, "UID")),
                        UID: EIMZOClient._getX500Val(x500name_ex, "UID"),
                        PINFL: EIMZOClient._getX500Val(x500name_ex, "PINFL"),
                        O: EIMZOClient._getX500Val(x500name_ex, "O"),
                        T: EIMZOClient._getX500Val(x500name_ex, "T"),
                        type: 'pfx'
                    };
                    if (!vo.TIN && !vo.PINFL) continue;
                    
                    var itmkey = itemIdGen(vo, i);
                    var itm = itemUiGen(itmkey, vo);
                    items.push(itm);
                    if (!firstId) firstId = itmkey;
                }
                callback(firstId);
            } else {
                console.error('list_all_certificates xatoligi:', data.reason);
                errors.push({e: null, r: data.reason});
                callback(null);
            }
        }, function (e) {
            console.error('list_all_certificates chaqirishda xatolik:', e);
            errors.push({e: e, r: null});
            callback(null);
        });
    },

    // Token kalitlarini topish
    _findTokens2: function(itemIdGen, itemUiGen, items, errors, callback) {
        CAPIWS.callFunction({plugin: "ftjc", name: "list_cards"}, function (event, data) {
            if (data.success) {
                var firstId = null;
                for (var i = 0; i < data.cards.length; i++) {
                    var el = data.cards[i];
                    var x500name_ex = el.alias;
                    var vo = {
                        cardUID: el.cardUID,
                        statusInfo: el.statusInfo,
                        ownerName: el.ownerName,
                        info: el.info,
                        serialNumber: EIMZOClient._getX500Val(x500name_ex, "SERIALNUMBER"),
                        validFrom: new Date(EIMZOClient._getX500Val(x500name_ex, "VALIDFROM")),
                        validTo: new Date(EIMZOClient._getX500Val(x500name_ex, "VALIDTO")),
                        CN: EIMZOClient._getX500Val(x500name_ex, "CN"),
                        TIN: (EIMZOClient._getX500Val(x500name_ex, "INN") ? EIMZOClient._getX500Val(x500name_ex, "INN") : EIMZOClient._getX500Val(x500name_ex, "UID")),
                        UID: EIMZOClient._getX500Val(x500name_ex, "UID"),
                        PINFL: EIMZOClient._getX500Val(x500name_ex, "PINFL"),
                        O: EIMZOClient._getX500Val(x500name_ex, "O"),
                        T: EIMZOClient._getX500Val(x500name_ex, "T"),
                        type: 'ftjc'
                    };
                    if (!vo.TIN && !vo.PINFL) continue;
                    
                    var itmkey = itemIdGen(vo, i);
                    var itm = itemUiGen(itmkey, vo);
                    items.push(itm);
                    if (!firstId) firstId = itmkey;
                }
                callback(firstId);
            } else {
                errors.push({e: null, r: data.reason});
                callback(null);
            }
        }, function (e) {
            errors.push({e: e, r: null});
            callback(null);
        });
    }
};
