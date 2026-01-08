// Firebase Yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyAvY-jFgzFqxlNdomjF0Zw8wBVZsLnm0mM",
    authDomain: "performans-app-1075b.firebaseapp.com",
    databaseURL: "https://performans-app-1075b-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "performans-app-1075b",
    storageBucket: "performans-app-1075b.firebasestorage.app",
    messagingSenderId: "286330449150",
    appId: "1:286330449150:web:13d0d82e7491e8c2e309af",
    measurementId: "G-T2J6QVK1EF"
};

// Firebase'i başlat (eğer yapılandırılmışsa)
let firebaseApp = null;
let database = null;
let useFirebase = false;

try {
    if (typeof firebase !== 'undefined') {
        console.log('Firebase SDK yüklendi, başlatılıyor...');
        firebaseApp = firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        useFirebase = true;
        console.log('✅ Firebase bağlantısı başarılı!');
        console.log('Database URL:', firebaseConfig.databaseURL);
    } else {
        console.warn('⚠️ Firebase SDK yüklenemedi, localStorage kullanılıyor.');
        console.warn('Firebase script\'lerinin HTML\'de yüklendiğinden emin olun.');
    }
} catch (error) {
    console.error('❌ Firebase başlatılamadı:', error);
    console.error('Hata detayı:', error.message);
    console.log('localStorage kullanılıyor.');
    useFirebase = false;
    database = null;
}

// Kullanıcı verileri
let userData = {
    age: null,
    height: null,
    weight: null,
    goal: null,
    planType: 'daily',
    equipment: ['none'], // Varsayılan: aletsiz
    bmi: null,
    level: null,
    points: 0,
    userLevel: 1,
    badges: [],
    completedDays: 0,
    workoutHistory: [],
    currentStreak: 0,
    longestStreak: 0,
    lastWorkoutDate: null,
    gender: null,
    activityLevel: 'moderate'
};

// Mevcut kullanıcı bilgileri
let currentUser = null;

// Basit şifre hash fonksiyonu
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// Firebase'e kullanıcı kaydetme
function saveUserToFirebase(user) {
    if (!useFirebase || !database) {
        console.warn('⚠️ Firebase mevcut değil, kullanıcı Firebase\'e kaydedilemedi');
        return false;
    }
    
    try {
        database.ref(`users/${user.id}`).set({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            createdAt: user.createdAt || new Date().toISOString()
        }, (error) => {
            if (error) {
                console.error('❌ Firebase kullanıcı kayıt hatası:', error);
                console.error('Hata kodu:', error.code);
                console.error('Hata mesajı:', error.message);
                return false;
            } else {
                console.log('✅ Kullanıcı Firebase\'e kaydedildi:', user.id, '-', user.email);
                return true;
            }
        });
        return true;
    } catch (error) {
        console.error('❌ Firebase kayıt hatası (catch):', error);
        return false;
    }
}

// Tüm kullanıcıları Firebase'e senkronize et
function syncUsersToFirebase() {
    if (!useFirebase || !database) {
        console.warn('⚠️ Firebase mevcut değil, kullanıcılar senkronize edilemedi');
        return;
    }
    
    const localUsers = getUsers();
    console.log('🔄 Kullanıcılar Firebase\'e senkronize ediliyor...', localUsers.length, 'kullanıcı');
    
    if (localUsers.length === 0) {
        console.log('⚠️ LocalStorage\'da kullanıcı yok');
        return;
    }
    
    let syncedCount = 0;
    localUsers.forEach((user, index) => {
        setTimeout(() => {
            const success = saveUserToFirebase(user);
            if (success) {
                syncedCount++;
                console.log(`✅ Kullanıcı ${syncedCount}/${localUsers.length} senkronize edildi:`, user.email);
            }
        }, index * 300); // Her kullanıcı için 300ms bekle
    });
    
    setTimeout(() => {
        console.log(`✅ Toplam ${syncedCount}/${localUsers.length} kullanıcı Firebase\'e senkronize edildi`);
    }, localUsers.length * 300 + 500);
}

// Firebase'e kullanıcı verilerini kaydetme
function saveUserDataToFirebase(userId, userDataToSave) {
    if (!useFirebase || !database || !userId) {
        console.warn('⚠️ Firebase mevcut değil veya userId yok', {
            useFirebase,
            hasDatabase: !!database,
            userId
        });
        return false;
    }
    
    try {
        console.log('🔥 Firebase\'e kaydediliyor:', userId);
        console.log('📦 Kaydedilecek veri:', userDataToSave);
        
        const userRef = database.ref(`userData/${userId}`);
        
        userRef.set(userDataToSave, (error) => {
            if (error) {
                console.error('❌ Firebase veri kayıt hatası:', error);
                console.error('Hata kodu:', error.code);
                console.error('Hata mesajı:', error.message);
                
                // Permission hatası kontrolü
                if (error.code === 'PERMISSION_DENIED') {
                    console.error('🚨 İZİN HATASI! Firebase kurallarını kontrol edin!');
                    alert('Firebase izin hatası! Lütfen Firebase Console\'da database kurallarını kontrol edin.');
                }
                return false;
            } else {
                console.log('✅ Kullanıcı verisi Firebase\'e kaydedildi:', userId);
                console.log('📍 Yol: userData/' + userId);
                console.log('📊 Puan:', userDataToSave.points);
                return true;
            }
        });
        
        return true;
    } catch (error) {
        console.error('❌ Firebase veri kayıt hatası (catch):', error);
        return false;
    }
}

// Firebase'den kullanıcı verilerini yükleme
function loadUserDataFromFirebase(userId, callback) {
    if (!useFirebase || !database || !userId) {
        if (callback) callback(null);
        return;
    }
    
    try {
        database.ref(`userData/${userId}`).once('value', (snapshot) => {
            const data = snapshot.val();
            if (callback) callback(data);
        }, (error) => {
            console.error('Firebase veri yükleme hatası:', error);
            if (callback) callback(null);
        });
    } catch (error) {
        console.error('Firebase veri yükleme hatası:', error);
        if (callback) callback(null);
    }
}

// Mevcut localStorage verilerini Firebase'e aktar
function syncLocalStorageToFirebase() {
    if (!useFirebase || !database) {
        console.warn('⚠️ Firebase mevcut değil, senkronizasyon yapılamıyor');
        return;
    }
    
    const users = getUsers();
    console.log('🔄 LocalStorage verileri Firebase\'e aktarılıyor...', users.length, 'kullanıcı');
    
    if (users.length === 0) {
        console.log('⚠️ LocalStorage\'da kullanıcı yok');
        return;
    }
    
    let syncedCount = 0;
    
    // Tüm kullanıcıları Firebase'e aktar
    users.forEach((user, index) => {
        setTimeout(() => {
            // Kullanıcı bilgilerini kaydet
            saveUserToFirebase(user);
            
            // Kullanıcı verilerini kaydet
            const userDataKey = `userData_${user.id}`;
            const localData = localStorage.getItem(userDataKey);
            
            if (localData) {
                try {
                    const data = JSON.parse(localData);
                    // userName ve userEmail ekle
                    data.userName = user.name;
                    data.userEmail = user.email;
                    data.name = user.name; // Uyumluluk için
                    data.email = user.email; // Uyumluluk için
                    
                    // Firebase'e kaydet
                    database.ref(`userData/${user.id}`).set(data, (error) => {
                        if (error) {
                            console.error(`❌ ${user.name} verileri aktarılamadı:`, error);
                        } else {
                            syncedCount++;
                            console.log(`✅ ${user.name} verileri Firebase'e aktarıldı (${syncedCount}/${users.length})`);
                            
                            // Son kullanıcı aktarıldıysa Top List'i yenile
                            if (syncedCount === users.length) {
                                console.log('✅ Tüm veriler Firebase\'e aktarıldı!');
                                // Top List'i yenile
                                if (document.getElementById('leaderboard') && document.getElementById('leaderboard').classList.contains('active')) {
                                    const activeTab = document.querySelector('.tab-btn.active');
                                    const type = activeTab ? activeTab.getAttribute('data-leaderboard') : 'all';
                                    setTimeout(() => loadLeaderboard(type), 500);
                                }
                            }
                        }
                    });
                } catch (error) {
                    console.error(`❌ ${user.name} verileri parse edilemedi:`, error);
                }
            } else {
                console.warn(`⚠️ ${user.name} için localStorage verisi yok`);
            }
        }, index * 200); // Her kullanıcı için 200ms bekle (rate limiting için)
    });
}

// Kullanıcı kayıt
function registerUser(name, phone, email, password, callback) {
    // Önce Firebase'den tüm kullanıcıları yükle ve kontrol et
    loadUsersFromFirebase((allUsers) => {
        const localUsers = getUsers();
        
        // Tüm kullanıcıları birleştir (e-posta kontrolü için)
        const usersMap = new Map();
        localUsers.forEach(u => {
            if (u && u.email) usersMap.set(u.email.toLowerCase(), u);
        });
        if (allUsers && Array.isArray(allUsers)) {
            allUsers.forEach(u => {
                if (u && u.email) usersMap.set(u.email.toLowerCase(), u);
            });
        }
        
        const allUsersList = Array.from(usersMap.values());
        
        // E-posta kontrolü (case-insensitive)
        const emailLower = email.toLowerCase().trim();
        const existingUser = allUsersList.find(u => u.email && u.email.toLowerCase().trim() === emailLower);
        
        if (existingUser) {
            alert('Bu e-posta adresi zaten kayıtlı! Lütfen farklı bir e-posta adresi kullanın.');
            if (callback) callback(false);
            return false;
        }
        
        // E-posta formatı kontrolü
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Geçersiz e-posta adresi formatı! Lütfen geçerli bir e-posta adresi girin.');
            if (callback) callback(false);
            return false;
        }
        
        const hashedPassword = hashPassword(password);
        const newUser = {
            id: Date.now().toString(),
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };
        
        // LocalStorage'a ekle
        const users = getUsers();
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        // Firebase'e kaydet
        if (useFirebase && database) {
            saveUserToFirebase(newUser);
            console.log('✅ Yeni kullanıcı Firebase\'e kaydedildi:', newUser.email);
        } else {
            console.warn('⚠️ Firebase mevcut değil, kullanıcı sadece localStorage\'a kaydedildi');
        }
        
        // Kullanıcı verilerini oluştur
        createUserData(newUser.id);
        
        if (callback) callback(true);
        return true;
    });
    
    // Async işlem olduğu için false döndürüyoruz, callback ile sonucu döndürüyoruz
    return false;
}

// Kullanıcı giriş
function loginUser(email, password) {
    const users = getUsers();
    const hashedPassword = hashPassword(password);
    
    const user = users.find(u => u.email === email && u.password === hashedPassword);
    
    if (!user) {
        alert('E-posta veya şifre hatalı!');
        return false;
    }
    
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    // Kullanıcı verilerini yükle
    loadUserData();
    
    return true;
}

// Kullanıcıları al
function getUsers() {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
}

// Kullanıcı verilerini oluştur
function createUserData(userId) {
    const userDataKey = `userData_${userId}`;
    const defaultData = {
        age: null,
        height: null,
        weight: null,
        goal: null,
        planType: 'daily',
        bmi: null,
        level: null,
        points: 0,
        userLevel: 1,
        badges: [],
        completedDays: 0,
        workoutHistory: [],
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        gender: null,
        activityLevel: 'moderate'
    };
    localStorage.setItem(userDataKey, JSON.stringify(defaultData));
}

// Çıkış yap
function logout() {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
        // Bildirim sistemini durdur
        stopNotificationSystem();
        
        currentUser = null;
        localStorage.removeItem('currentUser');
        userData = {
            age: null,
            height: null,
            weight: null,
            goal: null,
            planType: 'daily',
            equipment: ['none'],
            bmi: null,
            level: null,
            points: 0,
            userLevel: 1,
            badges: [],
            completedDays: 0,
            workoutHistory: [],
            currentStreak: 0,
            longestStreak: 0,
            lastWorkoutDate: null,
            gender: null,
            activityLevel: null
        };
        showAuthScreen();
    }
}

// Hareketler ve açıklamaları
const exercises = {
    pushup: {
        name: 'Şınav',
        target: 'Göğüs, Kol',
        equipment: 'none',
        description: 'Yüz üstü yatın, eller omuz genişliğinde. Vücudunuzu düz tutarak yukarı-aşağı hareket edin.'
    },
    diamondPushup: {
        name: 'Diamond Şınav',
        target: 'Arka Kol',
        equipment: 'none',
        description: 'Ellerinizi elmas şeklinde birleştirip şınav çekin. Bu hareket triceps kaslarını daha fazla çalıştırır.'
    },
    plankShoulderTap: {
        name: 'Plank Shoulder Tap',
        target: 'Omuz',
        equipment: 'none',
        description: 'Plank pozisyonunda, bir elinizle karşı omzunuza dokunun. Alternatif olarak her iki eli kullanın.'
    },
    chairDips: {
        name: 'Sandalye Dips',
        target: 'Triceps',
        equipment: 'none',
        description: 'Bir sandalyenin kenarına oturun, elleriniz sandalyede. Vücudunuzu aşağı-yukarı hareket ettirin.'
    },
    pikePushup: {
        name: 'Pike Push-Up',
        target: 'Omuz',
        equipment: 'none',
        description: 'Vücudunuzu V şeklinde tutun, eller yerde. Başınızı yere doğru indirip kaldırın.'
    },
    supermanHold: {
        name: 'Superman Hold',
        target: 'Sırt',
        equipment: 'none',
        description: 'Yüz üstü yatın, kollar ve bacaklar yukarıda. Bu pozisyonu 30-60 saniye tutun.'
    },
    towelCurl: {
        name: 'Towel Curl (Havlu ile)',
        target: 'Biceps',
        equipment: 'none',
        description: 'Bir havlu alın, ayakta durun. Havluyu iki elinizle tutup biceps kaslarınızı çalıştırarak çekin.'
    },
    wallPushup: {
        name: 'Duvar Şınavı',
        target: 'Göğüs, Kol',
        equipment: 'none',
        description: 'Duvara yakın durun, ellerinizi duvara koyun. Göğsünüzü duvara yaklaştırıp geri itin. Başlangıç için idealdir.'
    },
    declinePushup: {
        name: 'Eğimli Şınav',
        target: 'Göğüs, Omuz',
        equipment: 'none',
        description: 'Ayaklarınızı yüksek bir yere koyun (sandalye, yatak). Normal şınav çekin. Üst göğüs ve omuzları daha fazla çalıştırır.'
    },
    archerPushup: {
        name: 'Okçu Şınavı',
        target: 'Göğüs, Kol',
        equipment: 'none',
        description: 'Şınav pozisyonunda, bir kolunuzu yana açın. Diğer kolla şınav çekin. İleri seviye hareket.'
    },
    handstandPushup: {
        name: 'Amut Şınavı',
        target: 'Omuz, Kol',
        equipment: 'none',
        description: 'Duvara karşı amut duruşu yapın. Bu pozisyonda şınav çekin. Çok ileri seviye hareket, omuz gücü gerektirir.'
    },
    pullupAssisted: {
        name: 'Asılı Kalma (Assistli Çekme)',
        target: 'Sırt, Kol',
        equipment: 'none',
        description: 'Bar asılın, kendinizi yukarı çekmeye çalışın. Başlangıçta sadece asılı kalın, sonra hafifçe çekmeye başlayın.'
    },
    invertedRow: {
        name: 'Ters Çekme',
        target: 'Sırt, Biceps',
        equipment: 'none',
        description: 'Bir masa veya barın altına yatın. Göğsünüzü yukarı çekin. Sırt kaslarını çalıştırır.'
    },
    plank: {
        name: 'Plank (Düz Duruş)',
        target: 'Karın, Core',
        equipment: 'none',
        description: 'Şınav pozisyonunda durun, dirsekleriniz yerde. Vücudunuzu düz tutun, 30-60 saniye bu pozisyonda kalın.'
    },
    sidePlank: {
        name: 'Yan Plank',
        target: 'Yan Karın, Core',
        equipment: 'none',
        description: 'Yan yatın, bir dirseğiniz yerde. Vücudunuzu düz tutun, 30-45 saniye bu pozisyonda kalın. Her iki taraf için tekrarlayın.'
    },
    mountainClimber: {
        name: 'Dağcı (Mountain Climber)',
        target: 'Karın, Bacak',
        equipment: 'none',
        description: 'Şınav pozisyonunda durun. Dizlerinizi göğsünüze çekip hızlıca değiştirin. Kardiyovasküler antrenman.'
    },
    burpee: {
        name: 'Burpee',
        target: 'Tüm Vücut',
        equipment: 'none',
        description: 'Çömelin, şınav çekin, zıplayın. Tam vücut kardiyovasküler ve güç antrenmanı.'
    },
    jumpingJack: {
        name: 'İp Atlama Hareketi',
        target: 'Kardiyovasküler',
        equipment: 'none',
        description: 'Ayakta durun, kolları yukarı kaldırıp bacakları açın. Geri dönün. Isınma için ideal.'
    },
    tricepWallPush: {
        name: 'Duvar Triceps İtme',
        target: 'Triceps',
        equipment: 'none',
        description: 'Duvara yakın durun, ellerinizi duvara koyun. Dirseklerinizi büküp itin. Triceps kaslarını çalıştırır.'
    },
    chestFly: {
        name: 'Göğüs Açma (Havlu ile)',
        target: 'Göğüs',
        equipment: 'none',
        description: 'Sırt üstü yatın, havlu tutun. Kolları yanlara açıp göğüs kaslarını sıkın.'
    },
    lateralRaise: {
        name: 'Yan Kaldırma (Su Şişesi ile)',
        target: 'Omuz',
        equipment: 'none',
        description: 'Ayakta durun, ellerde su şişesi. Kolları yana kaldırın, omuz seviyesine kadar. Omuz kaslarını çalıştırır.'
    },
    reversePlank: {
        name: 'Ters Plank',
        target: 'Sırt, Omuz',
        equipment: 'none',
        description: 'Oturun, eller arkada yerde. Kalçayı yukarı kaldırın, vücudu düz tutun. Sırt ve omuzları güçlendirir.'
    },
    // Dambıl Hareketleri
    dumbbellChestPress: {
        name: 'Dambıl Göğüs Presi',
        target: 'Göğüs, Omuz, Triceps',
        equipment: 'dumbbell',
        description: 'Sırt üstü yatın, her iki elinizde dambıl. Kolları göğüs hizasından yukarı itin, kontrollü şekilde indirin.'
    },
    dumbbellFly: {
        name: 'Dambıl Göğüs Açma',
        target: 'Göğüs',
        equipment: 'dumbbell',
        description: 'Sırt üstü yatın, kollar yanlarda açık. Kolları göğüs üzerinde birleştirin, kontrollü şekilde açın.'
    },
    dumbbellShoulderPress: {
        name: 'Dambıl Omuz Presi',
        target: 'Omuz, Triceps',
        equipment: 'dumbbell',
        description: 'Ayakta veya oturarak, dambılları omuz hizasından yukarı itin. Kontrollü şekilde indirin.'
    },
    dumbbellLateralRaise: {
        name: 'Dambıl Yan Kaldırma',
        target: 'Omuz',
        equipment: 'dumbbell',
        description: 'Ayakta durun, dambılları yanlarda tutun. Kolları omuz hizasına kadar yana kaldırın, kontrollü indirin.'
    },
    dumbbellFrontRaise: {
        name: 'Dambıl Ön Kaldırma',
        target: 'Omuz',
        equipment: 'dumbbell',
        description: 'Ayakta durun, dambılları önünüzde tutun. Kolları omuz hizasına kadar öne kaldırın, kontrollü indirin.'
    },
    dumbbellBicepCurl: {
        name: 'Dambıl Biceps Curl',
        target: 'Biceps',
        equipment: 'dumbbell',
        description: 'Ayakta durun, dambılları yanlarda tutun. Kolları dirsekten bükerek omuza doğru kaldırın, kontrollü indirin.'
    },
    dumbbellHammerCurl: {
        name: 'Dambıl Çekiç Curl',
        target: 'Biceps, Ön Kol',
        equipment: 'dumbbell',
        description: 'Ayakta durun, dambılları yanlarda tutun (avuç içi birbirine bakacak). Kolları dirsekten bükerek kaldırın.'
    },
    dumbbellTricepExtension: {
        name: 'Dambıl Triceps Extension',
        target: 'Triceps',
        equipment: 'dumbbell',
        description: 'Ayakta veya oturarak, dambılı baş üzerinde tutun. Dirsekleri bükerek dambılı arkaya indirin, yukarı itin.'
    },
    dumbbellRow: {
        name: 'Dambıl Sırt Çekme',
        target: 'Sırt, Biceps',
        equipment: 'dumbbell',
        description: 'Bir bacağınızı yüksek bir yere koyun, öne eğilin. Dambılı aşağıdan yukarı çekin, göğse yaklaştırın.'
    },
    dumbbellSquat: {
        name: 'Dambıl Squat',
        target: 'Bacak, Kalça',
        equipment: 'dumbbell',
        description: 'Ayakta durun, dambılları omuzlarda tutun. Çömelin, kalçalarınız diz hizasına gelene kadar, sonra kalkın.'
    },
    dumbbellLunge: {
        name: 'Dambıl Lunge',
        target: 'Bacak, Kalça',
        equipment: 'dumbbell',
        description: 'Ayakta durun, dambılları yanlarda tutun. Bir ayağı öne atın, çömelin, geri dönün. Diğer ayağa geçin.'
    },
    dumbbellDeadlift: {
        name: 'Dambıl Deadlift',
        target: 'Sırt, Bacak, Kalça',
        equipment: 'dumbbell',
        description: 'Ayakta durun, dambılları önünüzde tutun. Dizleri hafifçe bükerek öne eğilin, kontrollü kalkın.'
    },
    // Halter Hareketleri
    barbellBenchPress: {
        name: 'Halter Göğüs Presi',
        target: 'Göğüs, Omuz, Triceps',
        equipment: 'barbell',
        description: 'Sırt üstü yatın, halteri göğüs hizasında tutun. Kolları yukarı itin, kontrollü şekilde indirin.'
    },
    barbellShoulderPress: {
        name: 'Halter Omuz Presi',
        target: 'Omuz, Triceps',
        equipment: 'barbell',
        description: 'Ayakta veya oturarak, halteri omuz hizasında tutun. Yukarı itin, kontrollü şekilde indirin.'
    },
    barbellBicepCurl: {
        name: 'Halter Biceps Curl',
        target: 'Biceps',
        equipment: 'barbell',
        description: 'Ayakta durun, halteri önünüzde tutun. Kolları dirsekten bükerek omuza doğru kaldırın, kontrollü indirin.'
    },
    barbellRow: {
        name: 'Halter Sırt Çekme',
        target: 'Sırt, Biceps',
        equipment: 'barbell',
        description: 'Öne eğilin, halteri aşağıda tutun. Halteri göğse doğru çekin, kontrollü şekilde indirin.'
    },
    barbellSquat: {
        name: 'Halter Squat',
        target: 'Bacak, Kalça',
        equipment: 'barbell',
        description: 'Ayakta durun, halteri omuzlarda tutun. Çömelin, kalçalarınız diz hizasına gelene kadar, sonra kalkın.'
    },
    barbellDeadlift: {
        name: 'Halter Deadlift',
        target: 'Sırt, Bacak, Kalça',
        equipment: 'barbell',
        description: 'Ayakta durun, halteri önünüzde tutun. Dizleri hafifçe bükerek öne eğilin, kontrollü kalkın.'
    },
    barbellOverheadPress: {
        name: 'Halter Baş Üstü Presi',
        target: 'Omuz, Triceps',
        equipment: 'barbell',
        description: 'Ayakta durun, halteri omuz hizasında tutun. Baş üzerine itin, kontrollü şekilde indirin.'
    }
};

// Seviye bazlı antrenman planları (her hedef için birden fazla varyasyon)
const workoutPlans = {
    beginner: {
        muscle: [
            // Varyasyon 1
            [
                { exercise: 'pushup', sets: 3, reps: 8, rest: 60 },
                { exercise: 'supermanHold', sets: 3, duration: 30, rest: 45 },
                { exercise: 'chairDips', sets: 2, reps: 6, rest: 60 },
                { exercise: 'towelCurl', sets: 2, reps: 10, rest: 45 }
            ],
            // Varyasyon 2
            [
                { exercise: 'pushup', sets: 3, reps: 10, rest: 60 },
                { exercise: 'plankShoulderTap', sets: 2, reps: 10, rest: 45 },
                { exercise: 'supermanHold', sets: 3, duration: 25, rest: 45 },
                { exercise: 'chairDips', sets: 3, reps: 5, rest: 60 }
            ],
            // Varyasyon 3
            [
                { exercise: 'diamondPushup', sets: 2, reps: 6, rest: 60 },
                { exercise: 'pushup', sets: 3, reps: 8, rest: 60 },
                { exercise: 'towelCurl', sets: 3, reps: 8, rest: 45 },
                { exercise: 'supermanHold', sets: 3, duration: 30, rest: 45 }
            ]
        ],
        strength: [
            // Varyasyon 1
            [
                { exercise: 'pushup', sets: 4, reps: 6, rest: 90 },
                { exercise: 'diamondPushup', sets: 2, reps: 5, rest: 90 },
                { exercise: 'chairDips', sets: 3, reps: 5, rest: 90 },
                { exercise: 'supermanHold', sets: 3, duration: 20, rest: 60 }
            ],
            // Varyasyon 2
            [
                { exercise: 'pushup', sets: 5, reps: 5, rest: 90 },
                { exercise: 'chairDips', sets: 4, reps: 4, rest: 90 },
                { exercise: 'diamondPushup', sets: 3, reps: 4, rest: 90 },
                { exercise: 'supermanHold', sets: 3, duration: 25, rest: 60 }
            ],
            // Varyasyon 3
            [
                { exercise: 'pushup', sets: 4, reps: 7, rest: 90 },
                { exercise: 'pikePushup', sets: 2, reps: 5, rest: 90 },
                { exercise: 'chairDips', sets: 3, reps: 6, rest: 90 },
                { exercise: 'supermanHold', sets: 4, duration: 15, rest: 60 }
            ]
        ],
        fatburn: [
            // Varyasyon 1
            [
                { exercise: 'pushup', sets: 2, reps: 10, rest: 45 },
                { exercise: 'plankShoulderTap', sets: 2, reps: 12, rest: 45 },
                { exercise: 'towelCurl', sets: 3, reps: 12, rest: 45 },
                { exercise: 'supermanHold', sets: 2, duration: 40, rest: 45 }
            ],
            // Varyasyon 2
            [
                { exercise: 'plankShoulderTap', sets: 3, reps: 10, rest: 45 },
                { exercise: 'pushup', sets: 3, reps: 8, rest: 45 },
                { exercise: 'towelCurl', sets: 4, reps: 10, rest: 45 },
                { exercise: 'chairDips', sets: 2, reps: 10, rest: 45 }
            ],
            // Varyasyon 3
            [
                { exercise: 'pushup', sets: 2, reps: 12, rest: 45 },
                { exercise: 'towelCurl', sets: 3, reps: 15, rest: 45 },
                { exercise: 'plankShoulderTap', sets: 3, reps: 8, rest: 45 },
                { exercise: 'supermanHold', sets: 3, duration: 35, rest: 45 }
            ]
        ]
    },
    intermediate: {
        muscle: [
            // Varyasyon 1
            [
                { exercise: 'pushup', sets: 4, reps: 12, rest: 60 },
                { exercise: 'diamondPushup', sets: 3, reps: 8, rest: 60 },
                { exercise: 'pikePushup', sets: 3, reps: 10, rest: 60 },
                { exercise: 'chairDips', sets: 3, reps: 10, rest: 60 },
                { exercise: 'supermanHold', sets: 3, duration: 45, rest: 45 },
                { exercise: 'towelCurl', sets: 3, reps: 12, rest: 45 }
            ],
            // Varyasyon 2
            [
                { exercise: 'diamondPushup', sets: 4, reps: 8, rest: 60 },
                { exercise: 'pushup', sets: 4, reps: 10, rest: 60 },
                { exercise: 'plankShoulderTap', sets: 3, reps: 12, rest: 60 },
                { exercise: 'chairDips', sets: 4, reps: 8, rest: 60 },
                { exercise: 'towelCurl', sets: 4, reps: 10, rest: 45 },
                { exercise: 'supermanHold', sets: 3, duration: 50, rest: 45 }
            ],
            // Varyasyon 3
            [
                { exercise: 'pikePushup', sets: 4, reps: 8, rest: 60 },
                { exercise: 'pushup', sets: 5, reps: 10, rest: 60 },
                { exercise: 'chairDips', sets: 3, reps: 12, rest: 60 },
                { exercise: 'diamondPushup', sets: 3, reps: 10, rest: 60 },
                { exercise: 'supermanHold', sets: 4, duration: 40, rest: 45 },
                { exercise: 'towelCurl', sets: 3, reps: 15, rest: 45 }
            ]
        ],
        strength: [
            // Varyasyon 1
            [
                { exercise: 'pushup', sets: 5, reps: 10, rest: 120 },
                { exercise: 'diamondPushup', sets: 4, reps: 8, rest: 120 },
                { exercise: 'pikePushup', sets: 4, reps: 8, rest: 120 },
                { exercise: 'chairDips', sets: 4, reps: 8, rest: 120 },
                { exercise: 'supermanHold', sets: 4, duration: 30, rest: 90 }
            ],
            // Varyasyon 2
            [
                { exercise: 'diamondPushup', sets: 5, reps: 7, rest: 120 },
                { exercise: 'pushup', sets: 6, reps: 8, rest: 120 },
                { exercise: 'chairDips', sets: 5, reps: 7, rest: 120 },
                { exercise: 'pikePushup', sets: 4, reps: 9, rest: 120 },
                { exercise: 'supermanHold', sets: 5, duration: 25, rest: 90 }
            ],
            // Varyasyon 3
            [
                { exercise: 'pushup', sets: 5, reps: 12, rest: 120 },
                { exercise: 'pikePushup', sets: 5, reps: 7, rest: 120 },
                { exercise: 'diamondPushup', sets: 4, reps: 9, rest: 120 },
                { exercise: 'chairDips', sets: 4, reps: 10, rest: 120 },
                { exercise: 'supermanHold', sets: 4, duration: 35, rest: 90 }
            ]
        ],
        fatburn: [
            // Varyasyon 1
            [
                { exercise: 'pushup', sets: 3, reps: 15, rest: 45 },
                { exercise: 'plankShoulderTap', sets: 3, reps: 15, rest: 45 },
                { exercise: 'towelCurl', sets: 4, reps: 15, rest: 45 },
                { exercise: 'supermanHold', sets: 3, duration: 50, rest: 45 },
                { exercise: 'chairDips', sets: 3, reps: 12, rest: 45 }
            ],
            // Varyasyon 2
            [
                { exercise: 'plankShoulderTap', sets: 4, reps: 12, rest: 45 },
                { exercise: 'pushup', sets: 4, reps: 12, rest: 45 },
                { exercise: 'towelCurl', sets: 5, reps: 12, rest: 45 },
                { exercise: 'chairDips', sets: 4, reps: 10, rest: 45 },
                { exercise: 'supermanHold', sets: 4, duration: 45, rest: 45 }
            ],
            // Varyasyon 3
            [
                { exercise: 'pushup', sets: 3, reps: 18, rest: 45 },
                { exercise: 'towelCurl', sets: 4, reps: 18, rest: 45 },
                { exercise: 'plankShoulderTap', sets: 4, reps: 12, rest: 45 },
                { exercise: 'supermanHold', sets: 3, duration: 55, rest: 45 },
                { exercise: 'diamondPushup', sets: 2, reps: 12, rest: 45 }
            ]
        ]
    },
    advanced: {
        muscle: [
            // Varyasyon 1
            [
                { exercise: 'pushup', sets: 5, reps: 15, rest: 60 },
                { exercise: 'diamondPushup', sets: 4, reps: 12, rest: 60 },
                { exercise: 'pikePushup', sets: 4, reps: 15, rest: 60 },
                { exercise: 'plankShoulderTap', sets: 4, reps: 20, rest: 60 },
                { exercise: 'chairDips', sets: 4, reps: 15, rest: 60 },
                { exercise: 'supermanHold', sets: 4, duration: 60, rest: 45 },
                { exercise: 'towelCurl', sets: 4, reps: 15, rest: 45 }
            ],
            // Varyasyon 2
            [
                { exercise: 'diamondPushup', sets: 5, reps: 12, rest: 60 },
                { exercise: 'pushup', sets: 6, reps: 12, rest: 60 },
                { exercise: 'plankShoulderTap', sets: 5, reps: 18, rest: 60 },
                { exercise: 'pikePushup', sets: 5, reps: 12, rest: 60 },
                { exercise: 'chairDips', sets: 5, reps: 12, rest: 60 },
                { exercise: 'towelCurl', sets: 5, reps: 12, rest: 45 },
                { exercise: 'supermanHold', sets: 4, duration: 65, rest: 45 }
            ],
            // Varyasyon 3
            [
                { exercise: 'pikePushup', sets: 5, reps: 14, rest: 60 },
                { exercise: 'pushup', sets: 5, reps: 18, rest: 60 },
                { exercise: 'diamondPushup', sets: 4, reps: 15, rest: 60 },
                { exercise: 'plankShoulderTap', sets: 4, reps: 22, rest: 60 },
                { exercise: 'chairDips', sets: 4, reps: 18, rest: 60 },
                { exercise: 'supermanHold', sets: 5, duration: 55, rest: 45 },
                { exercise: 'towelCurl', sets: 4, reps: 18, rest: 45 }
            ]
        ],
        strength: [
            // Varyasyon 1
            [
                { exercise: 'pushup', sets: 6, reps: 12, rest: 120 },
                { exercise: 'diamondPushup', sets: 5, reps: 10, rest: 120 },
                { exercise: 'pikePushup', sets: 5, reps: 12, rest: 120 },
                { exercise: 'chairDips', sets: 5, reps: 12, rest: 120 },
                { exercise: 'supermanHold', sets: 5, duration: 45, rest: 90 }
            ],
            // Varyasyon 2
            [
                { exercise: 'diamondPushup', sets: 6, reps: 9, rest: 120 },
                { exercise: 'pushup', sets: 7, reps: 10, rest: 120 },
                { exercise: 'pikePushup', sets: 6, reps: 10, rest: 120 },
                { exercise: 'chairDips', sets: 6, reps: 10, rest: 120 },
                { exercise: 'supermanHold', sets: 6, duration: 40, rest: 90 }
            ],
            // Varyasyon 3
            [
                { exercise: 'pushup', sets: 6, reps: 14, rest: 120 },
                { exercise: 'pikePushup', sets: 6, reps: 11, rest: 120 },
                { exercise: 'diamondPushup', sets: 5, reps: 11, rest: 120 },
                { exercise: 'chairDips', sets: 5, reps: 14, rest: 120 },
                { exercise: 'supermanHold', sets: 5, duration: 50, rest: 90 }
            ]
        ],
        fatburn: [
            // Varyasyon 1
            [
                { exercise: 'pushup', sets: 4, reps: 20, rest: 45 },
                { exercise: 'plankShoulderTap', sets: 4, reps: 20, rest: 45 },
                { exercise: 'towelCurl', sets: 5, reps: 18, rest: 45 },
                { exercise: 'supermanHold', sets: 4, duration: 60, rest: 45 },
                { exercise: 'chairDips', sets: 4, reps: 15, rest: 45 },
                { exercise: 'diamondPushup', sets: 3, reps: 15, rest: 45 }
            ],
            // Varyasyon 2
            [
                { exercise: 'plankShoulderTap', sets: 5, reps: 18, rest: 45 },
                { exercise: 'pushup', sets: 5, reps: 18, rest: 45 },
                { exercise: 'towelCurl', sets: 6, reps: 15, rest: 45 },
                { exercise: 'chairDips', sets: 5, reps: 12, rest: 45 },
                { exercise: 'diamondPushup', sets: 4, reps: 12, rest: 45 },
                { exercise: 'supermanHold', sets: 5, duration: 55, rest: 45 }
            ],
            // Varyasyon 3
            [
                { exercise: 'pushup', sets: 4, reps: 22, rest: 45 },
                { exercise: 'towelCurl', sets: 5, reps: 20, rest: 45 },
                { exercise: 'plankShoulderTap', sets: 5, reps: 18, rest: 45 },
                { exercise: 'supermanHold', sets: 4, duration: 65, rest: 45 },
                { exercise: 'chairDips', sets: 4, reps: 18, rest: 45 },
                { exercise: 'pikePushup', sets: 3, reps: 15, rest: 45 }
            ]
        ]
    }
};

// Rozetler
const badges = {
    firstWorkout: { name: '🏅 İlk Adım', description: 'İlk antrenmanınızı tamamladınız!' },
    weekWarrior: { name: '💪 Hafta Savaşçısı', description: '7 gün antrenman yaptınız!' },
    monthMaster: { name: '👑 Ay Ustası', description: '30 gün antrenman yaptınız!' },
    points100: { name: '⭐ Yıldız Toplayıcı', description: '100 puan kazandınız!' },
    points500: { name: '🌟 Süper Yıldız', description: '500 puan kazandınız!' },
    level5: { name: '🔥 Ateşli', description: 'Level 5\'e ulaştınız!' },
    level10: { name: '💎 Elmas', description: 'Level 10\'a ulaştınız!' }
};

// Sayfa yüklendiğinde
// Mouse Cursor Follower
function initCursorFollower() {
    const cursorFollower = document.querySelector('.cursor-follower');
    const cursorDot = document.querySelector('.cursor-dot');
    
    if (!cursorFollower || !cursorDot) return;
    
    let mouseX = 0;
    let mouseY = 0;
    let followerX = 0;
    let followerY = 0;
    
    // Smooth animation loop
    function animate() {
        // Faster easing factor (0.3 instead of 0.1)
        followerX += (mouseX - followerX) * 0.3;
        followerY += (mouseY - followerY) * 0.3;
        
        cursorFollower.style.left = followerX + 'px';
        cursorFollower.style.top = followerY + 'px';
        
        requestAnimationFrame(animate);
    }
    
    // Start animation loop
    animate();
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Cursor dot - immediate (no delay)
        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top = mouseY + 'px';
    });
    
    // Hover effects
    const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, .nav-item, .card');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursorFollower.style.transform = 'translate(-50%, -50%) scale(1.5)';
            cursorFollower.style.borderColor = 'rgba(99, 102, 241, 0.8)';
            cursorDot.style.transform = 'translate(-50%, -50%) scale(1.5)';
        });
        
        el.addEventListener('mouseleave', () => {
            cursorFollower.style.transform = 'translate(-50%, -50%) scale(1)';
            cursorFollower.style.borderColor = 'rgba(99, 102, 241, 0.5)';
            cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    });
}

// Welcome Screen Animation
function initWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const authScreen = document.getElementById('authScreen');
    
    if (!welcomeScreen || !authScreen) return;
    
    // Double check - don't show if user is logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        welcomeScreen.style.display = 'none';
        welcomeScreen.classList.remove('show');
        authScreen.style.display = 'none';
        return;
    }
    
    // Check if user has seen welcome screen before
    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
    
    if (hasSeenWelcome) {
        welcomeScreen.style.display = 'none';
        welcomeScreen.classList.remove('show');
        authScreen.style.display = 'flex';
        authScreen.classList.add('fade-in');
        return;
    }
    
    // Show welcome screen
    welcomeScreen.style.display = 'flex';
    welcomeScreen.classList.add('show');
    authScreen.style.display = 'none';
    
    // Show welcome screen for 3.5 seconds, then fade out and show auth screen
    setTimeout(() => {
        // Check again if user logged in during wait
        const stillNotLoggedIn = !localStorage.getItem('currentUser');
        if (!stillNotLoggedIn) {
            welcomeScreen.style.display = 'none';
            welcomeScreen.classList.remove('show');
            return;
        }
        
        welcomeScreen.classList.add('fade-out');
        
        setTimeout(() => {
            welcomeScreen.style.display = 'none';
            welcomeScreen.classList.remove('show', 'fade-out');
            authScreen.style.display = 'flex';
            authScreen.classList.add('fade-in');
            sessionStorage.setItem('hasSeenWelcome', 'true');
            
            // Re-initialize text reveal for auth form
            setTimeout(() => {
                const formGroups = document.querySelectorAll('.auth-form.active .form-group');
                formGroups.forEach((group, index) => {
                    group.style.opacity = '0';
                    group.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        group.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                        group.style.opacity = '1';
                        group.style.transform = 'translateY(0)';
                    }, index * 100);
                });
            }, 100);
        }, 800);
    }, 3500);
}

// Text Reveal Animation on Scroll
function initTextReveal() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all cards and sections
    const elementsToReveal = document.querySelectorAll('.card, .content-section, .exercise-item, .history-item');
    elementsToReveal.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Add revealed class styles
const style = document.createElement('style');
style.textContent = `
    .revealed {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    // Immediately hide welcome and auth screens on page load
    const welcomeScreen = document.getElementById('welcomeScreen');
    const authScreen = document.getElementById('authScreen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
        welcomeScreen.classList.remove('show', 'fade-out');
    }
    if (authScreen) {
        authScreen.style.display = 'none';
        authScreen.classList.remove('fade-in');
    }
    
    // First check if user is logged in
    checkAuth();
    
    // Only initialize welcome screen if user is NOT logged in
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
        // Initialize welcome screen only if not logged in
        initWelcomeScreen();
    } else {
        // User is logged in, ensure screens are hidden
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
            welcomeScreen.classList.remove('show');
        }
        if (authScreen) {
            authScreen.style.display = 'none';
        }
    }
    
    // Initialize text reveal on scroll
    setTimeout(() => {
        initTextReveal();
    }, 1000);
    
    setupAuthListeners();
    setupEventListeners();
    setupTabNavigation();
    setupAdminPanel();
    setupLeaderboard();
    setupDiscover();
    setupProfile();
    setupFriends();
    setupTheme();
    setupColorSettings();
    displayExercisesInfo();
});

// Auth kontrolü
function checkAuth() {
    const savedUser = localStorage.getItem('currentUser');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const authScreen = document.getElementById('authScreen');
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        
        // Hide welcome and auth screens immediately
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
            welcomeScreen.classList.remove('show', 'fade-out');
        }
        if (authScreen) {
            authScreen.style.display = 'none';
            authScreen.classList.remove('fade-in');
        }
        
        // Show app
        showApp();
        loadUserData();
        displayWorkoutHistory();
        displayProgress();
        updateUserInfo();
        loadProfile();
        
        // Arkadaşları yükle (DOM hazır olması için kısa bir gecikme ile)
        setTimeout(() => {
            loadFriends();
            loadFriendRequests();
        }, 100);
        
        // Bildirim sistemini başlat
        setTimeout(() => {
            startNotificationSystem();
        }, 2000);
        
        // İlk girişte localStorage verilerini Firebase'e aktar (her zaman)
        setTimeout(() => {
            if (useFirebase && database) {
                console.log('🔄 Veriler Firebase\'e senkronize ediliyor...');
                // Önce kullanıcıları senkronize et
                syncUsersToFirebase();
                // Sonra kullanıcı verilerini senkronize et
                syncLocalStorageToFirebase();
                // Notları da senkronize et
                syncProfileNotes();
            }
        }, 2000);
    } else {
        // User not logged in, show auth screen
        showAuthScreen();
    }
}

// Auth ekranını göster
function showAuthScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const authScreen = document.getElementById('authScreen');
    const appContainer = document.getElementById('appContainer');
    
    // Reset welcome screen if logging out
    sessionStorage.removeItem('hasSeenWelcome');
    
    // Hide app container
    if (appContainer) {
        appContainer.style.display = 'none';
    }
    
    // Hide welcome screen
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
        welcomeScreen.classList.remove('show', 'fade-out');
    }
    
    // Show auth screen
    if (authScreen) {
        authScreen.style.display = 'flex';
        authScreen.classList.add('fade-in');
    }
    
    // Initialize welcome screen if not seen before
    if (welcomeScreen && !sessionStorage.getItem('hasSeenWelcome')) {
        initWelcomeScreen();
    }
}

// Uygulamayı göster
function showApp() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const authScreen = document.getElementById('authScreen');
    const appContainer = document.getElementById('appContainer');
    
    // Hide welcome and auth screens
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
        welcomeScreen.classList.remove('show', 'fade-out');
    }
    if (authScreen) {
        authScreen.style.display = 'none';
        authScreen.classList.remove('fade-in');
    }
    
    // Show app container
    if (appContainer) {
        appContainer.style.display = 'flex';
    }
}

// Auth event listener'ları
function setupAuthListeners() {
    // Giriş formu
    document.getElementById('loginFormElement').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (loginUser(email, password)) {
            showApp();
            updateUserInfo();
            displayWorkoutHistory();
            displayProgress();
        }
    });
    
    // Kayıt formu
    document.getElementById('registerFormElement').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const phone = document.getElementById('registerPhone').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        // Loading göster
        const registerBtn = document.querySelector('#registerFormElement button[type="submit"]');
        const originalText = registerBtn ? registerBtn.textContent : '';
        if (registerBtn) {
            registerBtn.disabled = true;
            registerBtn.textContent = 'Kayıt yapılıyor...';
        }
        
        registerUser(name, phone, email, password, (success) => {
            // Loading'i kaldır
            if (registerBtn) {
                registerBtn.disabled = false;
                registerBtn.textContent = originalText;
            }
            
            if (success) {
                // Kayıt başarılı, giriş yap
                if (loginUser(email, password)) {
                    showApp();
                    updateUserInfo();
                }
            }
        });
    });
    
    // Form geçişleri
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        loginForm.classList.add('fade-out');
        setTimeout(() => {
            loginForm.classList.remove('active', 'fade-out');
            registerForm.classList.add('active');
            
            // Animate form groups
            const formGroups = registerForm.querySelectorAll('.form-group');
            formGroups.forEach((group, index) => {
                group.style.opacity = '0';
                group.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    group.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                    group.style.opacity = '1';
                    group.style.transform = 'translateY(0)';
                }, index * 100 + 200);
            });
        }, 300);
    });
    
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        registerForm.classList.add('fade-out');
        setTimeout(() => {
            registerForm.classList.remove('active', 'fade-out');
            loginForm.classList.add('active');
            
            // Animate form groups
            const formGroups = loginForm.querySelectorAll('.form-group');
            formGroups.forEach((group, index) => {
                group.style.opacity = '0';
                group.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    group.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                    group.style.opacity = '1';
                    group.style.transform = 'translateY(0)';
                }, index * 100 + 200);
            });
        }, 300);
    });
    
    // Çıkış butonu
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Kullanıcı bilgilerini güncelle
function updateUserInfo() {
    if (currentUser) {
        document.getElementById('sidebarUserName').textContent = currentUser.name;
        document.getElementById('sidebarUserEmail').textContent = currentUser.email;
    }
}

// Admin Panel Fonksiyonları
// Şifre base64 encode edilmiş (güvenlik için)
const ADMIN_PASSWORD_ENCODED = 'QWRtaW5TZWN1cmVLZXkyMDI0VXBwZXJCb2R5Q29hY2hQZXJmb3JtYW5jZUFwcA==';
function getAdminPassword() {
    return atob(ADMIN_PASSWORD_ENCODED);
}

function setupAdminPanel() {
    const adminLink = document.getElementById('adminLink');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const refreshAdminBtn = document.getElementById('refreshAdminBtn');
    
    // Admin link tıklama
    adminLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchToTab('admin');
        document.getElementById('adminContent').style.display = 'none';
        document.getElementById('adminLogin').style.display = 'block';
        document.getElementById('adminPassword').value = '';
    });
    
    // Admin giriş
    adminLoginBtn.addEventListener('click', () => {
        const password = document.getElementById('adminPassword').value;
        if (password === getAdminPassword()) {
            document.getElementById('adminLogin').style.display = 'none';
            document.getElementById('adminContent').style.display = 'block';
            loadAdminData();
        } else {
            alert('Hatalı şifre!');
            document.getElementById('adminPassword').value = '';
        }
    });
    
    // Enter tuşu ile giriş
    document.getElementById('adminPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            adminLoginBtn.click();
        }
    });
    
    // Veri export
    exportDataBtn.addEventListener('click', () => {
        exportAllData();
    });
    
    // Yenile
    refreshAdminBtn.addEventListener('click', () => {
        loadAdminData();
    });
}

// Admin verilerini yükle
function loadAdminData() {
    const users = getUsers();
    const allUserData = [];
    let totalWorkouts = 0;
    let totalPoints = 0;
    let activeUsers = 0;
    
    users.forEach(user => {
        const userDataKey = `userData_${user.id}`;
        const data = localStorage.getItem(userDataKey);
        const userData = data ? JSON.parse(data) : null;
        
        if (userData && (userData.completedDays > 0 || userData.points > 0)) {
            activeUsers++;
        }
        
        if (userData) {
            totalWorkouts += userData.completedDays || 0;
            totalPoints += userData.points || 0;
            
            allUserData.push({
                user: user,
                data: userData
            });
        }
    });
    
    // İstatistikleri göster
    document.getElementById('adminTotalUsers').textContent = users.length;
    document.getElementById('adminActiveUsers').textContent = activeUsers;
    document.getElementById('adminTotalWorkouts').textContent = totalWorkouts;
    document.getElementById('adminTotalPoints').textContent = totalPoints;
    
    // Kullanıcı tablosunu göster
    displayUsersTable(allUserData);
}

// Kullanıcı tablosunu göster
function displayUsersTable(usersData) {
    const tableDiv = document.getElementById('usersTable');
    
    if (usersData.length === 0) {
        tableDiv.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">Henüz kullanıcı verisi yok.</p>';
        return;
    }
    
    let tableHTML = `
        <table class="user-table">
            <thead>
                <tr>
                    <th>Ad Soyad</th>
                    <th>E-posta</th>
                    <th>Telefon</th>
                    <th>Puan</th>
                    <th>Level</th>
                    <th>Antrenman</th>
                    <th>İşlem</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    usersData.forEach(({ user, data }) => {
        tableHTML += `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone}</td>
                <td>${data.points || 0}</td>
                <td>${data.userLevel || 1}</td>
                <td>${data.completedDays || 0}</td>
                <td>
                    <button class="user-details-btn" onclick="showUserDetails('${user.id}')">
                        Detaylar
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    tableDiv.innerHTML = tableHTML;
}

// Kullanıcı detaylarını göster
function showUserDetails(userId) {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    const userDataKey = `userData_${userId}`;
    const data = localStorage.getItem(userDataKey);
    const userData = data ? JSON.parse(data) : null;
    
    if (!user) return;
    
    const modal = document.createElement('div');
    modal.className = 'user-details-modal active';
    modal.id = 'userDetailsModal';
    
    const goalNames = { muscle: 'Kas Geliştirme', strength: 'Güç Kazanma', fatburn: 'Yağ Yakma' };
    
    modal.innerHTML = `
        <div class="user-details-content">
            <div class="user-details-header">
                <h3>${user.name} - Detaylı Bilgiler</h3>
                <button class="close-modal" onclick="closeUserDetails()">×</button>
            </div>
            <div class="user-details-info">
                <p><strong>E-posta:</strong> ${user.email}</p>
                <p><strong>Telefon:</strong> ${user.phone}</p>
                <p><strong>Kayıt Tarihi:</strong> ${new Date(user.createdAt).toLocaleDateString('tr-TR')}</p>
                ${userData ? `
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                    <h4 style="color: var(--primary-color); margin-bottom: 15px;">Antrenman Bilgileri</h4>
                    <p><strong>Yaş:</strong> ${userData.age || '-'}</p>
                    <p><strong>Boy:</strong> ${userData.height || '-'} cm</p>
                    <p><strong>Kilo:</strong> ${userData.weight || '-'} kg</p>
                    <p><strong>BMI:</strong> ${userData.bmi || '-'}</p>
                    <p><strong>Hedef:</strong> ${userData.goal ? goalNames[userData.goal] : '-'}</p>
                    <p><strong>Seviye:</strong> ${userData.level ? getLevelName(userData.level) : '-'}</p>
                    <p><strong>Toplam Puan:</strong> ${userData.points || 0}</p>
                    <p><strong>Level:</strong> ${userData.userLevel || 1}</p>
                    <p><strong>Tamamlanan Antrenman:</strong> ${userData.completedDays || 0}</p>
                    <p><strong>Mevcut Seri:</strong> ${userData.currentStreak || 0} gün</p>
                    <p><strong>En Uzun Seri:</strong> ${userData.longestStreak || 0} gün</p>
                    <p><strong>Rozetler:</strong> ${userData.badges.length || 0} adet</p>
                    ${userData.workoutHistory && userData.workoutHistory.length > 0 ? `
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                        <h4 style="color: var(--primary-color); margin-bottom: 15px;">Son Antrenmanlar</h4>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${userData.workoutHistory.slice(0, 10).map(w => `
                                <p style="font-size: 0.9rem; margin: 5px 0;">
                                    ${w.date} - ${goalNames[w.goal] || w.goal} - ${w.points} puan
                                </p>
                            `).join('')}
                        </div>
                    ` : ''}
                ` : '<p>Henüz antrenman verisi yok.</p>'}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeUserDetails();
        }
    });
}

// Kullanıcı detaylarını kapat
function closeUserDetails() {
    const modal = document.getElementById('userDetailsModal');
    if (modal) {
        modal.remove();
    }
}

// Tüm verileri export et
function exportAllData() {
    const users = getUsers();
    const allData = {
        exportDate: new Date().toISOString(),
        totalUsers: users.length,
        users: []
    };
    
    users.forEach(user => {
        const userDataKey = `userData_${user.id}`;
        const data = localStorage.getItem(userDataKey);
        const userData = data ? JSON.parse(data) : null;
        
        allData.users.push({
            userInfo: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                createdAt: user.createdAt
            },
            workoutData: userData
        });
    });
    
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `upperbody-coach-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    alert('Veriler başarıyla indirildi!');
}

// Global fonksiyonlar (HTML'den çağrılabilmesi için)
window.showUserDetails = showUserDetails;
window.closeUserDetails = closeUserDetails;

// Tab navigasyonu ayarla
function setupTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    
    // Mobil menü toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });
    }
    
    // Overlay'e tıklayınca menüyü kapat
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        mobileMenuBtn.classList.remove('active');
    });
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Aktif tab'ı kaldır
            navItems.forEach(nav => nav.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active'));
            
            // Yeni aktif tab'ı ayarla
            const tabName = item.getAttribute('data-tab');
            item.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            // Tab'a göre verileri yükle
            if (tabName === 'friends') {
                loadFriends();
                loadFriendRequests();
            } else if (tabName === 'discover') {
                loadDiscoverNotes();
            } else if (tabName === 'profile') {
                loadProfile();
                loadProfileNotes();
            } else if (tabName === 'leaderboard') {
                loadLeaderboard('all');
            } else if (tabName === 'workout') {
                displayWorkoutPlan();
            } else if (tabName === 'exercises') {
                displayExercisesInfo();
            } else if (tabName === 'history') {
                displayWorkoutHistory();
            } else if (tabName === 'progress') {
                displayProgress();
            } else if (tabName === 'stats') {
                displayStats();
            }
            
            // Mobilde menüyü kapat
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        });
    });
    
    // Ekran boyutu değiştiğinde
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        }
    });
}

// Event listener'ları ayarla
function setupEventListeners() {
    document.getElementById('userInfoForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('completeWorkoutBtn').addEventListener('click', completeWorkout);
    document.getElementById('resetBtn').addEventListener('click', resetWorkout);
    document.getElementById('refreshWorkoutBtn').addEventListener('click', refreshWorkout);
}

// Form submit işlemi
function handleFormSubmit(e) {
    e.preventDefault();
    
    userData.gender = document.getElementById('gender').value;
    userData.age = parseInt(document.getElementById('age').value);
    userData.height = parseFloat(document.getElementById('height').value);
    userData.weight = parseFloat(document.getElementById('weight').value);
    userData.goal = document.getElementById('goal').value;
    userData.activityLevel = document.getElementById('activityLevel').value;
    userData.planType = document.getElementById('planType').value;
    
    // Ekipman seçimini al
    const equipmentCheckboxes = document.querySelectorAll('input[name="equipment"]:checked');
    userData.equipment = Array.from(equipmentCheckboxes).map(cb => cb.value);
    
    // Eğer hiçbir ekipman seçilmemişse, varsayılan olarak aletsiz seç
    if (userData.equipment.length === 0) {
        userData.equipment = ['none'];
        document.getElementById('equipmentNone').checked = true;
    }
    
    // BMI hesapla
    userData.bmi = calculateBMI(userData.height, userData.weight);
    
    // Seviye belirle
    userData.level = determineLevel(userData.bmi, userData.age);
    
    // Antrenman planı oluştur
    generateWorkoutPlan();
    
    // İstatistikleri göster
    displayStats();
    
    // Antrenman planını göster
    displayWorkoutPlan();
    
    // Antrenman sekmesine geç
    switchToTab('workout');
    
    // Verileri kaydet
    saveUserData();
    
    // Bildirim sistemini başlat
    stopNotificationSystem();
    startNotificationSystem();
}

// BMI hesaplama
function calculateBMI(height, weight) {
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
}

// Seviye belirleme
function determineLevel(bmi, age) {
    const bmiNum = parseFloat(bmi);
    
    if (bmiNum < 18.5 || bmiNum > 30 || age < 18 || age > 65) {
        return 'beginner';
    } else if (bmiNum >= 18.5 && bmiNum <= 25 && age >= 18 && age <= 50) {
        return 'advanced';
    } else {
        return 'intermediate';
    }
}

// Ekipman seçimine göre hareketleri filtrele
function filterExercisesByEquipment(plan, userEquipment) {
    if (!userEquipment || userEquipment.length === 0 || (userEquipment.length === 1 && userEquipment[0] === 'none')) {
        // Sadece aletsiz hareketler
        return plan.filter(item => {
            const exercise = exercises[item.exercise];
            return exercise && (!exercise.equipment || exercise.equipment === 'none');
        });
    }
    
    // Seçili ekipmanlara göre filtrele
    return plan.filter(item => {
        const exercise = exercises[item.exercise];
        if (!exercise) return false;
        
        // Ekipman yoksa veya 'none' ise, kullanıcı 'none' seçtiyse göster
        if (!exercise.equipment || exercise.equipment === 'none') {
            return userEquipment.includes('none');
        }
        
        // Ekipman varsa, kullanıcının seçtiği ekipmanlardan biri olmalı
        return userEquipment.includes(exercise.equipment);
    });
}

// Antrenman planı oluştur (rastgele varyasyon seçer, level'a göre değişir)
function generateWorkoutPlan() {
    if (userData.planType === 'weekly') {
        // Haftalık plan oluştur
        userData.currentWorkout = generateWeeklyPlan();
        return userData.currentWorkout;
    }
    
    // Günlük plan
    const plans = workoutPlans[userData.level][userData.goal];
    
    // Level ve tamamlanan gün sayısına göre farklı bir varyasyon seç
    const seed = (userData.userLevel || 1) + (userData.completedDays || 0);
    const planIndex = seed % plans.length;
    
    // Level'a göre belirli bir plan seç (level artınca değişir)
    const useRandom = Math.random() > 0.5;
    const selectedIndex = useRandom ? Math.floor(Math.random() * plans.length) : planIndex;
    let selectedPlan = plans[selectedIndex];
    
    // Ekipman seçimine göre filtrele
    if (userData.equipment && userData.equipment.length > 0) {
        selectedPlan = filterExercisesByEquipment(selectedPlan, userData.equipment);
        
        // Eğer filtreleme sonrası plan boşsa, tüm ekipmanları kullan
        if (selectedPlan.length === 0) {
            console.warn('⚠️ Seçili ekipmanlara uygun hareket bulunamadı, tüm hareketler kullanılıyor');
            selectedPlan = plans[selectedIndex];
        }
    }
    
    userData.currentWorkout = selectedPlan;
    return selectedPlan;
}

// Haftalık plan oluştur
function generateWeeklyPlan() {
    const plans = workoutPlans[userData.level][userData.goal];
    const weeklyPlan = [];
    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    
    for (let i = 0; i < 7; i++) {
        const dayIndex = (userData.userLevel || 1) + i;
        const planIndex = dayIndex % plans.length;
        let dayPlan = plans[planIndex];
        
        // Ekipman seçimine göre filtrele
        if (userData.equipment && userData.equipment.length > 0) {
            dayPlan = filterExercisesByEquipment(dayPlan, userData.equipment);
            
            // Eğer filtreleme sonrası plan boşsa, tüm ekipmanları kullan
            if (dayPlan.length === 0) {
                dayPlan = plans[planIndex];
            }
        }
        
        weeklyPlan.push({
            day: days[i],
            exercises: dayPlan
        });
    }
    
    return weeklyPlan;
}

// İstatistikleri göster
function displayStats() {
    document.getElementById('bmiValue').textContent = userData.bmi || '-';
    document.getElementById('levelValue').textContent = userData.level ? getLevelName(userData.level) : '-';
    document.getElementById('pointsValue').textContent = userData.points;
    document.getElementById('userLevel').textContent = userData.userLevel;
    
    // Kalori bilgilerini göster
    if (userData.age && userData.weight && userData.height && userData.gender && userData.goal && userData.activityLevel) {
        const calories = calculateDailyCalories(
            userData.weight,
            userData.height,
            userData.age,
            userData.gender,
            userData.goal,
            userData.activityLevel
        );
        
        document.getElementById('bmrValue').textContent = calories.bmr + ' kcal';
        document.getElementById('tdeeValue').textContent = calories.tdee + ' kcal';
        document.getElementById('targetCaloriesValue').textContent = calories.targetCalories + ' kcal';
        document.getElementById('proteinValue').textContent = calories.protein + ' g';
        document.getElementById('carbsValue').textContent = calories.carbs + ' g';
        document.getElementById('fatValue').textContent = calories.fat + ' g';
        
        const calorieInfoSection = document.getElementById('calorieInfo');
        if (calorieInfoSection) {
            calorieInfoSection.style.display = 'block';
        }
    } else {
        const calorieInfoSection = document.getElementById('calorieInfo');
        if (calorieInfoSection) {
            calorieInfoSection.style.display = 'none';
        }
    }
    
    displayBadges();
}

// Tab değiştirme fonksiyonu
function switchToTab(tabName) {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    
    navItems.forEach(nav => {
        if (nav.getAttribute('data-tab') === tabName) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });
    
    contentSections.forEach(section => {
        if (section.id === tabName) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });
    
    // Leaderboard sekmesine geçildiğinde veriyi yükle
    if (tabName === 'leaderboard') {
        const activeTab = document.querySelector('.tab-btn.active');
        const type = activeTab ? activeTab.getAttribute('data-leaderboard') : 'all';
        setTimeout(() => {
            loadLeaderboard(type);
        }, 100);
    }
}

// Seviye adını getir
function getLevelName(level) {
    const names = {
        beginner: 'Başlangıç',
        intermediate: 'Orta',
        advanced: 'İleri'
    };
    return names[level] || level;
}

// Antrenman planını göster
function displayWorkoutPlan() {
    const workoutPlanDiv = document.getElementById('workoutPlan');
    const workoutTitle = document.getElementById('workoutTitle');
    
    if (!workoutPlanDiv || !workoutTitle) return;
    
    workoutPlanDiv.innerHTML = '';
    
    // Kullanıcı verilerini kontrol et
    if (!userData || !userData.currentWorkout) {
        workoutPlanDiv.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--gray-600);">
                <div style="font-size: 3rem; margin-bottom: 20px;">💪</div>
                <h3 style="color: var(--dark-color); margin-bottom: 15px;">Antrenman Planınız Henüz Oluşturulmadı</h3>
                <p style="margin-bottom: 20px; line-height: 1.6;">
                    Kişisel bilgilerinizi girerek antrenman planınızı oluşturabilirsiniz.
                </p>
                <button class="btn-primary" onclick="switchToTab('userInfo')" style="width: auto; margin: 0 auto; display: inline-block; padding: 12px 30px;">
                    Kişisel Bilgileri Gir
                </button>
            </div>
        `;
        workoutTitle.textContent = 'Antrenman Planınız';
        return;
    }
    
    // Plan tipi kontrolü
    if (!userData.planType) {
        userData.planType = 'daily'; // Varsayılan günlük plan
    }
    
    // Başlık güncelle
    if (userData.planType === 'weekly') {
        workoutTitle.textContent = 'Haftalık Antrenman Planınız';
        displayWeeklyPlan(workoutPlanDiv);
    } else {
        workoutTitle.textContent = 'Günlük Antrenman Planınız';
        displayDailyPlan(workoutPlanDiv);
    }
}

// Günlük plan göster
function displayDailyPlan(container) {
    if (!container || !userData || !userData.currentWorkout) {
        console.error('displayDailyPlan: Gerekli veriler eksik');
        return;
    }
    
    // currentWorkout'un bir array olduğundan emin ol
    if (!Array.isArray(userData.currentWorkout)) {
        console.error('displayDailyPlan: currentWorkout bir array değil', userData.currentWorkout);
        container.innerHTML = '<p style="color: red; padding: 20px;">Antrenman planı verisi hatalı. Lütfen yeni bir plan oluşturun.</p>';
        return;
    }
    
    if (userData.currentWorkout.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--gray-600);">Antrenman planı boş. Lütfen yeni bir plan oluşturun.</p>';
        return;
    }
    
    userData.currentWorkout.forEach((item, index) => {
        if (!item || !item.exercise) {
            console.warn('displayDailyPlan: Geçersiz antrenman öğesi', item);
            return;
        }
        
        const exercise = exercises[item.exercise];
        if (!exercise) {
            console.warn('displayDailyPlan: Hareket bulunamadı', item.exercise);
            return;
        }
        
        const exerciseDiv = document.createElement('div');
        exerciseDiv.className = 'exercise-item';
        exerciseDiv.id = `exercise-${index}`;
        
        let detailsHTML = '';
        if (item.reps) {
            detailsHTML = `<div class="exercise-detail"><strong>Set:</strong> ${item.sets || '-'}</div>
                          <div class="exercise-detail"><strong>Tekrar:</strong> ${item.reps}</div>
                          <div class="exercise-detail"><strong>Dinlenme:</strong> ${item.rest || 0} sn</div>`;
        } else if (item.duration) {
            detailsHTML = `<div class="exercise-detail"><strong>Set:</strong> ${item.sets || '-'}</div>
                          <div class="exercise-detail"><strong>Süre:</strong> ${item.duration} sn</div>
                          <div class="exercise-detail"><strong>Dinlenme:</strong> ${item.rest || 0} sn</div>`;
        } else {
            detailsHTML = '<div class="exercise-detail">Detaylar belirtilmemiş</div>';
        }
        
        exerciseDiv.innerHTML = `
            <div class="exercise-header">
                <span class="exercise-name">${exercise.name || 'Bilinmeyen Hareket'}</span>
                <span class="exercise-target">${exercise.target || ''}</span>
            </div>
            <div class="exercise-details">
                ${detailsHTML}
            </div>
        `;
        
        container.appendChild(exerciseDiv);
    });
}

// Haftalık plan göster
function displayWeeklyPlan(container) {
    userData.currentWorkout.forEach((dayPlan, dayIndex) => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'weekly-day';
        dayDiv.innerHTML = `<h3 class="day-title">${dayPlan.day}</h3>`;
        
        dayPlan.exercises.forEach((item, index) => {
            const exercise = exercises[item.exercise];
            const exerciseDiv = document.createElement('div');
            exerciseDiv.className = 'exercise-item';
            
            let detailsHTML = '';
            if (item.reps) {
                detailsHTML = `<div class="exercise-detail"><strong>Set:</strong> ${item.sets}</div>
                              <div class="exercise-detail"><strong>Tekrar:</strong> ${item.reps}</div>
                              <div class="exercise-detail"><strong>Dinlenme:</strong> ${item.rest} sn</div>`;
            } else if (item.duration) {
                detailsHTML = `<div class="exercise-detail"><strong>Set:</strong> ${item.sets}</div>
                              <div class="exercise-detail"><strong>Süre:</strong> ${item.duration} sn</div>
                              <div class="exercise-detail"><strong>Dinlenme:</strong> ${item.rest} sn</div>`;
            }
            
            exerciseDiv.innerHTML = `
                <div class="exercise-header">
                    <span class="exercise-name">${exercise.name}</span>
                    <span class="exercise-target">${exercise.target}</span>
                </div>
                <div class="exercise-details">
                    ${detailsHTML}
                </div>
            `;
            
            dayDiv.appendChild(exerciseDiv);
        });
        
        container.appendChild(dayDiv);
    });
}

// Hareket açıklamalarını göster
function displayExercisesInfo() {
    const exercisesListDiv = document.getElementById('exercisesList');
    const searchInput = document.getElementById('exerciseSearchInput');
    
    // Arama input'una event listener ekle
    if (searchInput && !searchInput.hasAttribute('data-listener-added')) {
        searchInput.setAttribute('data-listener-added', 'true');
        searchInput.addEventListener('input', (e) => {
            filterExercises(e.target.value);
        });
    }
    
    // İlk yükleme
    filterExercises('');
}

function filterExercises(searchTerm) {
    const exercisesListDiv = document.getElementById('exercisesList');
    if (!exercisesListDiv) return;
    
    exercisesListDiv.innerHTML = '';
    
    const searchLower = searchTerm.toLowerCase().trim();
    let filteredExercises = Object.values(exercises);
    
    // Arama terimi varsa filtrele
    if (searchLower) {
        filteredExercises = filteredExercises.filter(exercise => {
            const nameMatch = exercise.name.toLowerCase().includes(searchLower);
            const targetMatch = exercise.target.toLowerCase().includes(searchLower);
            const descMatch = exercise.description.toLowerCase().includes(searchLower);
            const equipmentMatch = exercise.equipment && exercise.equipment.toLowerCase().includes(searchLower);
            const equipmentName = exercise.equipment === 'dumbbell' ? 'dambıl' : 
                                 exercise.equipment === 'barbell' ? 'halter' : '';
            const equipmentNameMatch = equipmentName && equipmentName.includes(searchLower);
            
            return nameMatch || targetMatch || descMatch || equipmentMatch || equipmentNameMatch;
        });
    }
    
    if (filteredExercises.length === 0) {
        exercisesListDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--gray-500);">🔍 Arama sonucu bulunamadı. Farklı bir terim deneyin.</p>';
        return;
    }
    
    // Ekipman seçimine göre filtrele (eğer kullanıcı bilgileri varsa)
    if (userData && userData.equipment && userData.equipment.length > 0) {
        const userEquipment = userData.equipment;
        
        // Eğer sadece 'none' seçiliyse, sadece aletsiz hareketleri göster
        if (userEquipment.length === 1 && userEquipment[0] === 'none') {
            filteredExercises = filteredExercises.filter(ex => !ex.equipment || ex.equipment === 'none');
        } else if (!userEquipment.includes('none')) {
            // 'none' seçili değilse, sadece seçili ekipmanlara uygun hareketleri göster
            filteredExercises = filteredExercises.filter(ex => {
                if (!ex.equipment || ex.equipment === 'none') return false;
                return userEquipment.includes(ex.equipment);
            });
        }
        // Eğer hem 'none' hem de diğer ekipmanlar seçiliyse, hepsini göster
    }
    
    filteredExercises.forEach(exercise => {
        const exerciseDiv = document.createElement('div');
        exerciseDiv.className = 'exercise-info';
        
        // Ekipman etiketi
        let equipmentBadge = '';
        if (exercise.equipment) {
            const equipmentNames = {
                'none': '💪 Aletsiz',
                'dumbbell': '🏋️ Dambıl',
                'barbell': '⚖️ Halter'
            };
            equipmentBadge = `<span style="display: inline-block; background: var(--primary-gradient); color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; margin-left: 10px;">${equipmentNames[exercise.equipment] || exercise.equipment}</span>`;
        }
        
        exerciseDiv.innerHTML = `
            <h4>${exercise.name} - ${exercise.target}${equipmentBadge}</h4>
            <p>${exercise.description}</p>
        `;
        exercisesListDiv.appendChild(exerciseDiv);
    });
}

// Antrenmanı tamamla
function completeWorkout() {
    // Puan ekle
    const basePoints = userData.planType === 'weekly' ? 350 : 50; // Haftalık plan 7x puan
    const levelMultiplier = { beginner: 1, intermediate: 1.5, advanced: 2 };
    const pointsEarned = Math.floor(basePoints * levelMultiplier[userData.level]);
    const oldLevel = userData.userLevel;
    
    userData.points += pointsEarned;
    
    // Tamamlanan gün sayısını artır
    userData.completedDays += 1;
    
    // Seri takibi
    const today = new Date().toDateString();
    if (userData.lastWorkoutDate === today) {
        // Bugün zaten antrenman yapılmış
    } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (userData.lastWorkoutDate === yesterday.toDateString()) {
            userData.currentStreak += 1;
        } else {
            userData.currentStreak = 1;
        }
        if (userData.currentStreak > userData.longestStreak) {
            userData.longestStreak = userData.currentStreak;
        }
        userData.lastWorkoutDate = today;
    }
    
    // Antrenman geçmişine ekle
    userData.workoutHistory.unshift({
        date: today,
        goal: userData.goal,
        planType: userData.planType,
        points: pointsEarned,
        level: userData.level
    });
    
    // Son 30 kaydı tut
    if (userData.workoutHistory.length > 30) {
        userData.workoutHistory = userData.workoutHistory.slice(0, 30);
    }
    
    // Level hesapla (her 100 puanda bir level)
    userData.userLevel = Math.floor(userData.points / 100) + 1;
    
    // Rozet kontrolü
    checkBadges();
    
    // İstatistikleri güncelle
    displayStats();
    displayWorkoutHistory();
    displayProgress();
    
    // Top List'i yenile (eğer sekme aktifse)
    if (document.getElementById('leaderboard') && document.getElementById('leaderboard').classList.contains('active')) {
        const activeTab = document.querySelector('.tab-btn.active');
        const type = activeTab ? activeTab.getAttribute('data-leaderboard') : 'all';
        loadLeaderboard(type);
    }
    
    // Level artışı kontrolü
    let levelUpMessage = '';
    if (userData.userLevel > oldLevel) {
        levelUpMessage = `\n\n🎊 LEVEL ATLADINIZ! Yeni Level: ${userData.userLevel}\nYeni antrenman planınız hazırlandı!`;
        // Level artınca yeni antrenman planı oluştur (farklı hareketlerle)
        setTimeout(() => {
            generateWorkoutPlan();
            displayWorkoutPlan();
            switchToTab('workout');
        }, 1000);
    }
    
    // Başarı mesajı
    alert(`🎉 Tebrikler! Antrenmanınızı tamamladınız!\n\nKazandığınız puan: ${pointsEarned}\nToplam puan: ${userData.points}\nLevel: ${userData.userLevel}\nSeri: ${userData.currentStreak} gün${levelUpMessage}`);
    
    // Antrenman öğelerini tamamlandı olarak işaretle
    if (userData.planType === 'daily') {
        userData.currentWorkout.forEach((item, index) => {
            const exerciseDiv = document.getElementById(`exercise-${index}`);
            if (exerciseDiv) {
                exerciseDiv.classList.add('completed');
            }
        });
    }
    
    saveUserData();
}

// Rozet kontrolü
function checkBadges() {
    // İlk antrenman
    if (userData.completedDays === 1 && !userData.badges.includes('firstWorkout')) {
        userData.badges.push('firstWorkout');
    }
    
    // 7 gün
    if (userData.completedDays === 7 && !userData.badges.includes('weekWarrior')) {
        userData.badges.push('weekWarrior');
    }
    
    // 30 gün
    if (userData.completedDays === 30 && !userData.badges.includes('monthMaster')) {
        userData.badges.push('monthMaster');
    }
    
    // 100 puan
    if (userData.points >= 100 && !userData.badges.includes('points100')) {
        userData.badges.push('points100');
    }
    
    // 500 puan
    if (userData.points >= 500 && !userData.badges.includes('points500')) {
        userData.badges.push('points500');
    }
    
    // Level 5
    if (userData.userLevel >= 5 && !userData.badges.includes('level5')) {
        userData.badges.push('level5');
    }
    
    // Level 10
    if (userData.userLevel >= 10 && !userData.badges.includes('level10')) {
        userData.badges.push('level10');
    }
}

// Rozetleri göster
function displayBadges() {
    const badgesListDiv = document.getElementById('badgesList');
    badgesListDiv.innerHTML = '';
    
    if (userData.badges.length === 0) {
        badgesListDiv.innerHTML = '<p style="color: #999;">Henüz rozet kazanmadınız. Antrenman yaparak rozet kazanın!</p>';
        return;
    }
    
    userData.badges.forEach(badgeKey => {
        const badge = badges[badgeKey];
        const badgeDiv = document.createElement('div');
        badgeDiv.className = 'badge';
        badgeDiv.innerHTML = badge.name;
        badgeDiv.title = badge.description;
        badgesListDiv.appendChild(badgeDiv);
    });
}

// Antrenman planını yenile (aynı bilgilerle farklı plan)
function refreshWorkout() {
    if (!userData.level || !userData.goal) {
        alert('Önce antrenman planınızı oluşturun!');
        switchToTab('userInfo');
        return;
    }
    
    // Yeni bir antrenman planı oluştur (farklı hareketlerle)
    generateWorkoutPlan();
    displayWorkoutPlan();
}

// Antrenmanı sıfırla
function resetWorkout() {
    if (confirm('Yeni bir antrenman planı oluşturmak istediğinizden emin misiniz?')) {
        document.getElementById('userInfoForm').reset();
        userData.currentWorkout = null;
        switchToTab('userInfo');
    }
}

// Antrenman geçmişini göster
function displayWorkoutHistory() {
    const historyDiv = document.getElementById('workoutHistory');
    if (!historyDiv) return;
    
    historyDiv.innerHTML = '';
    
    if (!userData || !userData.workoutHistory || userData.workoutHistory.length === 0) {
        historyDiv.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Henüz antrenman geçmişiniz yok.</p>';
        return;
    }
    
    userData.workoutHistory.forEach(workout => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        const goalNames = { muscle: 'Kas Geliştirme', strength: 'Güç Kazanma', fatburn: 'Yağ Yakma' };
        historyItem.innerHTML = `
            <div class="history-date">${workout.date}</div>
            <div class="history-details">
                <span class="history-goal">${goalNames[workout.goal]}</span>
                <span class="history-type">${workout.planType === 'weekly' ? 'Haftalık' : 'Günlük'}</span>
                <span class="history-points">+${workout.points} puan</span>
            </div>
        `;
        historyDiv.appendChild(historyItem);
    });
}

// İlerleme takibini göster
function displayProgress() {
    if (!userData) {
        console.warn('displayProgress: userData yok');
        return;
    }
    
    const totalWorkoutsEl = document.getElementById('totalWorkouts');
    const totalPointsEl = document.getElementById('totalPoints');
    const avgPerformanceEl = document.getElementById('avgPerformance');
    const longestStreakEl = document.getElementById('longestStreak');
    
    if (totalWorkoutsEl) totalWorkoutsEl.textContent = userData.completedDays || 0;
    if (totalPointsEl) totalPointsEl.textContent = userData.points || 0;
    
    const avgPoints = (userData.completedDays && userData.completedDays > 0) ? Math.floor((userData.points || 0) / userData.completedDays) : 0;
    if (avgPerformanceEl) avgPerformanceEl.textContent = avgPoints > 0 ? `${avgPoints} puan/antrenman` : '-';
    if (longestStreakEl) longestStreakEl.textContent = `${userData.longestStreak || 0} gün`;
    
    // Haftalık ilerleme grafiği
    displayWeeklyChart();
}

// Haftalık ilerleme grafiği
function displayWeeklyChart() {
    const chartDiv = document.getElementById('weeklyProgress');
    if (!chartDiv) return;
    
    chartDiv.innerHTML = '';
    
    if (!userData) {
        chartDiv.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Veri yok.</p>';
        return;
    }
    
    // Son 7 günün verilerini al
    const last7Days = [];
    const workoutHistory = userData.workoutHistory || [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        const workout = workoutHistory.find(w => w && w.date === dateStr);
        last7Days.push({
            day: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][date.getDay()],
            points: workout ? (workout.points || 0) : 0
        });
    }
    
    const maxPoints = Math.max(...last7Days.map(d => d.points), 1);
    
    last7Days.forEach(day => {
        const barDiv = document.createElement('div');
        barDiv.className = 'chart-bar';
        const height = (day.points / maxPoints) * 100;
        barDiv.innerHTML = `
            <div class="bar-value" style="height: ${height}%"></div>
            <div class="bar-label">${day.day}</div>
            <div class="bar-points">${day.points}</div>
        `;
        chartDiv.appendChild(barDiv);
    });
}

// Verileri kaydet (LocalStorage + Firebase) - Kullanıcı bazlı
function saveUserData() {
    if (!currentUser) {
        console.warn('⚠️ Kullanıcı oturumu yok, veri kaydedilemiyor');
        return;
    }
    
    const userDataKey = `userData_${currentUser.id}`;
    const dataToSave = {
        age: userData.age,
        height: userData.height,
        weight: userData.weight,
        goal: userData.goal,
        planType: userData.planType,
        equipment: userData.equipment || ['none'],
        bmi: userData.bmi,
        level: userData.level,
        points: userData.points,
        userLevel: userData.userLevel,
        badges: userData.badges,
        completedDays: userData.completedDays,
        workoutHistory: userData.workoutHistory,
        currentStreak: userData.currentStreak,
        longestStreak: userData.longestStreak,
        lastWorkoutDate: userData.lastWorkoutDate,
        gender: userData.gender,
        activityLevel: userData.activityLevel,
        // Leaderboard için gerekli ek bilgiler
        userName: currentUser.name,
        userEmail: currentUser.email,
        name: currentUser.name, // Eski kod uyumluluğu için
        email: currentUser.email // Eski kod uyumluluğu için
    };
    
    // LocalStorage'a kaydet
    localStorage.setItem(userDataKey, JSON.stringify(dataToSave));
    console.log('💾 Veriler localStorage\'a kaydedildi');
    
    // Firebase'e kaydet (tüm kullanıcılar görebilsin diye)
    if (useFirebase && database) {
        console.log('🔥 Veriler Firebase\'e kaydediliyor...');
        console.log('👤 Kullanıcı ID:', currentUser.id);
        console.log('📦 Veri:', dataToSave);
        
        const success = saveUserDataToFirebase(currentUser.id, dataToSave);
        
        if (success) {
            // Firebase'e kaydedildikten sonra Top List'i yenile (eğer aktifse)
            setTimeout(() => {
                if (document.getElementById('leaderboard') && document.getElementById('leaderboard').classList.contains('active')) {
                    const activeTab = document.querySelector('.tab-btn.active');
                    const type = activeTab ? activeTab.getAttribute('data-leaderboard') : 'all';
                    loadLeaderboard(type);
                }
            }, 1000);
        }
    } else {
        console.warn('⚠️ Firebase mevcut değil, sadece localStorage\'a kaydedildi');
        console.warn('Firebase durumu:', { useFirebase, hasDatabase: !!database });
    }
}

// Verileri yükle (LocalStorage + Firebase) - Kullanıcı bazlı
function loadUserData() {
    if (!currentUser) return;
    
    // Önce Firebase'den yüklemeyi dene
    if (useFirebase && database) {
        loadUserDataFromFirebase(currentUser.id, (firebaseData) => {
            if (firebaseData) {
                // Firebase'den veri geldi, kullan
                applyUserData(firebaseData);
                
                // LocalStorage'ı da senkronize et
                const userDataKey = `userData_${currentUser.id}`;
                localStorage.setItem(userDataKey, JSON.stringify(firebaseData));
            } else {
                // Firebase'de veri yok, localStorage'dan yükle
                loadUserDataFromLocalStorage();
            }
        });
    } else {
        // Firebase yoksa localStorage'dan yükle
        loadUserDataFromLocalStorage();
    }
}

// UserData'yı uygula
function applyUserData(data) {
    userData.age = data.age || null;
    userData.height = data.height || null;
    userData.weight = data.weight || null;
    userData.goal = data.goal || null;
    userData.planType = data.planType || 'daily';
    userData.equipment = data.equipment || ['none'];
    userData.bmi = data.bmi || null;
    userData.level = data.level || null;
    userData.points = data.points || 0;
    userData.userLevel = data.userLevel || 1;
    userData.badges = data.badges || [];
    userData.completedDays = data.completedDays || 0;
    userData.workoutHistory = data.workoutHistory || [];
    userData.currentStreak = data.currentStreak || 0;
    userData.longestStreak = data.longestStreak || 0;
    userData.lastWorkoutDate = data.lastWorkoutDate || null;
    userData.gender = data.gender || null;
    userData.activityLevel = data.activityLevel || 'moderate';
    
    // Form değerlerini doldur
    if (userData.age) {
        if (document.getElementById('gender')) document.getElementById('gender').value = userData.gender || '';
        document.getElementById('age').value = userData.age;
        document.getElementById('height').value = userData.height;
        document.getElementById('weight').value = userData.weight;
        document.getElementById('goal').value = userData.goal;
        if (document.getElementById('activityLevel')) document.getElementById('activityLevel').value = userData.activityLevel || 'moderate';
        document.getElementById('planType').value = userData.planType;
        
        // Ekipman checkbox'larını işaretle
        if (userData.equipment && Array.isArray(userData.equipment)) {
            document.querySelectorAll('input[name="equipment"]').forEach(cb => {
                cb.checked = userData.equipment.includes(cb.value);
            });
        }
    }
    
    // Eğer veri varsa istatistikleri göster
    if (userData.points > 0 || userData.bmi) {
        displayStats();
    }
    
    // Eğer kullanıcı bilgileri varsa antrenman planını göster
    if (userData.level && userData.goal) {
        generateWorkoutPlan();
        displayWorkoutPlan();
    }
}

// LocalStorage'dan veri yükleme
function loadUserDataFromLocalStorage() {
    const userDataKey = `userData_${currentUser.id}`;
    const savedData = localStorage.getItem(userDataKey);
    
    if (savedData) {
        const data = JSON.parse(savedData);
        applyUserData(data);
    } else {
        // Yeni kullanıcı için varsayılan veriler
        createUserData(currentUser.id);
        
    }
}

// Top List Fonksiyonları
function setupLeaderboard() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.getAttribute('data-leaderboard');
            loadLeaderboard(type);
        });
    });
    
    // İlk yükleme
    if (document.querySelector('.tab-btn')) {
        loadLeaderboard('all');
    }
}

function loadLeaderboard(type) {
    console.log('🏆 Top List yükleniyor, tip:', type);
    console.log('Firebase durumu:', useFirebase, 'Database:', database ? 'Mevcut' : 'Yok');
    
    // Önce Firebase'den yüklemeyi dene
    if (useFirebase && database) {
        console.log('🔥 Firebase\'den yükleniyor...');
        loadLeaderboardFromFirebase(type);
        return;
    }
    
    // Firebase çalışmazsa localStorage'dan yükle
    console.log('💾 localStorage\'dan yükleniyor...');
    loadLeaderboardFromLocalStorage(type);
}

// Firebase'den Top List yükleme
function loadLeaderboardFromFirebase(type) {
    if (!useFirebase || !database) {
        console.log('Firebase mevcut değil, localStorage kullanılıyor');
        loadLeaderboardFromLocalStorage(type);
        return;
    }
    
    // Loading göster
    const container = document.getElementById('leaderboardContent');
    if (container) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">📡 Yükleniyor...</p>';
    }
    
    try {
        console.log('🔥 Firebase\'den Top List yükleniyor...');
        database.ref('userData').once('value', (snapshot) => {
            const allUserData = snapshot.val();
            const leaderboardData = [];
            
            console.log('📊 Firebase\'den gelen veri:', allUserData);
            
            if (!allUserData || Object.keys(allUserData).length === 0) {
                console.log('⚠️ Firebase\'de veri yok, localStorage\'dan yükleniyor...');
                loadLeaderboardFromLocalStorage(type);
                return;
            }
            
            // Firebase'den gelen tüm kullanıcı verilerini işle
            Object.keys(allUserData).forEach(userId => {
                const userData = allUserData[userId];
                
                if (!userData) {
                    console.warn('⚠️ Boş userData:', userId);
                    return;
                }
                
                let points = 0;
                
                if (type === 'all') {
                    points = userData.points || 0;
                } else if (type === 'daily') {
                    // Bugünkü puanları hesapla
                    const today = new Date().toDateString();
                    if (userData.workoutHistory && Array.isArray(userData.workoutHistory)) {
                        points = userData.workoutHistory
                            .filter(w => w && w.date === today)
                            .reduce((sum, w) => sum + (w.points || 0), 0);
                    }
                } else if (type === 'weekly') {
                    // Bu haftaki puanları hesapla
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    if (userData.workoutHistory && Array.isArray(userData.workoutHistory)) {
                        points = userData.workoutHistory
                            .filter(w => {
                                if (!w || !w.date) return false;
                                const workoutDate = new Date(w.date);
                                return workoutDate >= weekAgo;
                            })
                            .reduce((sum, w) => sum + (w.points || 0), 0);
                    }
                }
                
                // type === 'all' ise 0 puanlı kullanıcıları da göster
                if (points >= 0 || type === 'all') {
                    const userName = userData.userName || userData.name || 'İsimsiz';
                    console.log(`📊 Kullanıcı bulundu: ${userName} - ${points} puan`);
                    leaderboardData.push({
                        id: userId,
                        name: userName,
                        email: userData.userEmail || userData.email || '',
                        points: points,
                        level: userData.userLevel || 1,
                        completedDays: userData.completedDays || 0
                    });
                }
            });
            
            console.log(`✅ ${leaderboardData.length} kullanıcı bulundu`);
            
            // Puanlara göre sırala
            leaderboardData.sort((a, b) => b.points - a.points);
            
            displayLeaderboard(leaderboardData);
        }, (error) => {
            console.error('❌ Firebase Top List yükleme hatası:', error);
            console.error('Hata kodu:', error.code);
            console.error('Hata mesajı:', error.message);
            
            // Permission hatası kontrolü
            if (error.code === 'PERMISSION_DENIED') {
                console.error('🚨 İZİN HATASI! Firebase kurallarını güncelleyin!');
                console.error('📋 FIREBASE-KURALLARI-UYGULA.md dosyasındaki talimatları takip edin');
                console.error('📋 Veya Firebase Console\'da Realtime Database > Rules sekmesine gidin');
                console.error('📋 Kuralları şu şekilde ayarlayın: { "rules": { ".read": true, ".write": true } }');
                
                const container = document.getElementById('leaderboardContent');
                if (container) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 30px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #856404; margin-bottom: 15px;">⚠️ Firebase İzin Hatası</h3>
                            <p style="color: #856404; margin-bottom: 20px; line-height: 1.6;">
                                Top List'i görmek için Firebase kurallarını güncellemeniz gerekiyor.
                            </p>
                            <p style="color: #856404; margin-bottom: 20px; font-weight: 600;">
                                <strong>FIREBASE-KURALLARI-UYGULA.md</strong> dosyasındaki adımları takip edin.
                            </p>
                            <button class="btn-primary" onclick="window.open('https://console.firebase.google.com/project/performans-app-1075b/database/performans-app-1075b-default-rtdb/rules', '_blank')" style="width: auto; margin: 0 auto; display: inline-block;">
                                🔥 Firebase Console'u Aç
                            </button>
                            <p style="color: #856404; margin-top: 20px; font-size: 0.9rem;">
                                Geçici olarak localStorage verileri gösteriliyor...
                            </p>
                        </div>
                    `;
                }
            }
            
            console.log('⚠️ localStorage\'dan yükleniyor...');
            // Hata durumunda localStorage'dan yükle
            loadLeaderboardFromLocalStorage(type);
        });
    } catch (error) {
        console.error('❌ Firebase Top List yükleme hatası:', error);
        console.log('⚠️ localStorage\'dan yükleniyor...');
        loadLeaderboardFromLocalStorage(type);
    }
}

// LocalStorage'dan Top List yükleme (fallback)
function loadLeaderboardFromLocalStorage(type) {
    console.log('💾 localStorage\'dan Top List yükleniyor...');
    const users = getUsers();
    const leaderboardData = [];
    
    console.log('👥 localStorage\'da', users.length, 'kullanıcı bulundu');
    
    users.forEach(user => {
        const userDataKey = `userData_${user.id}`;
        const data = localStorage.getItem(userDataKey);
        const userData = data ? JSON.parse(data) : null;
        
        if (userData) {
            let points = 0;
            
            if (type === 'all') {
                points = userData.points || 0;
            } else if (type === 'daily') {
                // Bugünkü puanları hesapla
                const today = new Date().toDateString();
                if (userData.workoutHistory) {
                    points = userData.workoutHistory
                        .filter(w => w.date === today)
                        .reduce((sum, w) => sum + (w.points || 0), 0);
                }
            } else if (type === 'weekly') {
                // Bu haftaki puanları hesapla
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                if (userData.workoutHistory) {
                    points = userData.workoutHistory
                        .filter(w => {
                            const workoutDate = new Date(w.date);
                            return workoutDate >= weekAgo;
                        })
                        .reduce((sum, w) => sum + (w.points || 0), 0);
                }
            }
            
            // type === 'all' ise 0 puanlı kullanıcıları da göster
            if (points >= 0 || type === 'all') {
                leaderboardData.push({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    points: points,
                    level: userData.userLevel || 1,
                    completedDays: userData.completedDays || 0
                });
            }
        }
    });
    
    console.log(`✅ ${leaderboardData.length} kullanıcı localStorage'dan yüklendi`);
    
    // Puanlara göre sırala
    leaderboardData.sort((a, b) => b.points - a.points);
    
    displayLeaderboard(leaderboardData);
}

function displayLeaderboard(data, isEmpty = false) {
    const container = document.getElementById('leaderboardContent');
    if (!container) {
        console.error('❌ leaderboardContent elementi bulunamadı!');
        return;
    }
    
    console.log('📋 Top List gösteriliyor:', data.length, 'kullanıcı');
    
    if (data.length === 0) {
        if (isEmpty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #999;">
                    <p style="font-size: 1.2rem; margin-bottom: 10px;">📊 Henüz veri yok</p>
                    <p style="font-size: 0.9rem; opacity: 0.7;">İlk antrenmanınızı yaparak listede görün!</p>
                </div>
            `;
        } else {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">Henüz veri yok.</p>';
        }
        return;
    }
    
    let html = '';
    data.forEach((user, index) => {
        const rank = index + 1;
        let rankClass = '';
        if (rank === 1) rankClass = 'top1';
        else if (rank === 2) rankClass = 'top2';
        else if (rank === 3) rankClass = 'top3';
        
        html += `
            <div class="leaderboard-item">
                <div class="leaderboard-rank ${rankClass}">${rank}</div>
                <div class="leaderboard-user">
                    <div class="leaderboard-name">${user.name || 'İsimsiz'}</div>
                    <div class="leaderboard-stats">
                        <span>Level: ${user.level || 1}</span>
                        <span>Antrenman: ${user.completedDays || 0}</span>
                    </div>
                </div>
                <div class="leaderboard-points">
                    ${user.points || 0} puan
                    <button class="leaderboard-profile-btn" onclick="viewFriendProfile('${user.id}')">Profil</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    console.log('✅ Top List gösterildi!');
}

// Topluluk Fonksiyonları - KALDIRILDI

// Profil Fonksiyonları
function setupProfile() {
    const profilePhotoInput = document.getElementById('profilePhotoInput');
    const shareNoteBtn = document.getElementById('shareNoteBtn');
    
    if (!profilePhotoInput) return;
    
    // Profil fotoğrafı yükleme
    profilePhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                saveProfilePhoto(event.target.result);
                document.getElementById('profilePhoto').src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Not paylaşma
    if (shareNoteBtn) {
        shareNoteBtn.addEventListener('click', shareProfileNote);
    }
    
    // Profil verilerini yükle
    loadProfile();
    loadProfileNotes();
}

function loadProfile() {
    if (!currentUser) return;
    
    const profileNameEl = document.getElementById('profileName');
    const profileEmailEl = document.getElementById('profileEmail');
    const profilePhoneEl = document.getElementById('profilePhone');
    
    if (profileNameEl) profileNameEl.textContent = currentUser.name;
    if (profileEmailEl) profileEmailEl.textContent = currentUser.email;
    if (profilePhoneEl) profilePhoneEl.textContent = currentUser.phone || '-';
    
    // Kullanıcı verilerini yükle
    const userDataKey = `userData_${currentUser.id}`;
    const data = localStorage.getItem(userDataKey);
    if (data) {
        const userData = JSON.parse(data);
        const profilePointsEl = document.getElementById('profilePoints');
        const profileLevelEl = document.getElementById('profileLevel');
        const profileWorkoutsEl = document.getElementById('profileWorkouts');
        
        if (profilePointsEl) profilePointsEl.textContent = userData.points || 0;
        if (profileLevelEl) profileLevelEl.textContent = userData.userLevel || 1;
        if (profileWorkoutsEl) profileWorkoutsEl.textContent = userData.completedDays || 0;
    }
    
    // Profil fotoğrafını yükle
    const profilePhoto = getProfilePhoto();
    const profilePhotoEl = document.getElementById('profilePhoto');
    if (profilePhotoEl && profilePhoto) {
        profilePhotoEl.src = profilePhoto;
    }
}

function saveProfilePhoto(photoData) {
    if (!currentUser) return;
    const photoKey = `profilePhoto_${currentUser.id}`;
    localStorage.setItem(photoKey, photoData);
}

function getProfilePhoto() {
    if (!currentUser) return null;
    const photoKey = `profilePhoto_${currentUser.id}`;
    return localStorage.getItem(photoKey);
}

function shareProfileNote() {
    if (!currentUser) return;
    
    const imageInput = document.getElementById('profileNoteImageInput');
    const file = imageInput && imageInput.files && imageInput.files[0] ? imageInput.files[0] : null;
    
    // Fotoğraf zorunlu
    if (!file) {
        alert('Lütfen bir fotoğraf seçin! Profilde sadece fotoğraf paylaşabilirsiniz.');
        return;
    }
    
    const noteInput = document.getElementById('profileNoteInput');
    const noteText = noteInput ? noteInput.value.trim() : '';
    
    const saveNote = (imageData) => {
        const notes = getProfileNotes();
        const newNote = {
            id: Date.now().toString(),
            userId: currentUser.id,
            userName: currentUser.name,
            userPhoto: getProfilePhoto() || '',
            note: noteText, // Opsiyonel açıklama
            timestamp: new Date().toISOString(),
            likes: [],
            comments: [],
            isPublic: false, // Profilde paylaşılanlar keşfet'e gitmez
            image: imageData,
            type: 'profile' // Profil notu
        };
        
        notes.unshift(newNote);
        // Son 50 notu tut
        if (notes.length > 50) {
            notes.splice(50);
        }
        
        localStorage.setItem('profileNotes', JSON.stringify(notes));
        
        // Firebase'e de kaydet (farklı cihazlardan görünsün)
        saveProfileNotesToFirebase(notes);
        
        if (noteInput) noteInput.value = '';
        if (imageInput) imageInput.value = '';
        
        loadProfileNotes();
        alert('Fotoğrafınız paylaşıldı!');
    };
    
    const reader = new FileReader();
    reader.onload = (e) => {
        saveNote(e.target.result);
    };
    reader.readAsDataURL(file);
}

// Keşfet'te not paylaşma (yazı opsiyonel, fotoğraf opsiyonel)
function shareDiscoverNote() {
    if (!currentUser) return;
    
    const noteInput = document.getElementById('discoverNoteInput');
    const noteText = noteInput ? noteInput.value.trim() : '';
    const imageInput = document.getElementById('discoverNoteImageInput');
    const file = imageInput && imageInput.files && imageInput.files[0] ? imageInput.files[0] : null;
    
    // En az bir şey olmalı (yazı veya fotoğraf)
    if (!noteText && !file) {
        alert('Lütfen bir not yazın veya fotoğraf ekleyin!');
        return;
    }
    
    const saveNote = (imageData) => {
        const notes = getProfileNotes();
        const newNote = {
            id: Date.now().toString(),
            userId: currentUser.id,
            userName: currentUser.name,
            userPhoto: getProfilePhoto() || '',
            note: noteText || '',
            timestamp: new Date().toISOString(),
            likes: [],
            comments: [],
            isPublic: true, // Keşfet'te paylaşılanlar herkese açık
            image: imageData || '',
            type: 'discover' // Keşfet notu
        };
        
        notes.unshift(newNote);
        // Son 50 notu tut
        if (notes.length > 50) {
            notes.splice(50);
        }
        
        localStorage.setItem('profileNotes', JSON.stringify(notes));
        
        // Firebase'e de kaydet (farklı cihazlardan görünsün)
        saveProfileNotesToFirebase(notes);
        
        if (noteInput) noteInput.value = '';
        if (imageInput) imageInput.value = '';
        
        loadDiscoverNotes();
        alert('Notunuz keşfet\'te paylaşıldı! Tüm cihazlardan görünecek.');
    };
    
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            saveNote(e.target.result);
        };
        reader.readAsDataURL(file);
    } else {
        saveNote('');
    }
}

// Firebase'e not kaydetme
function saveProfileNotesToFirebase(notes) {
    if (!useFirebase || !database) {
        console.warn('⚠️ Firebase mevcut değil, notlar sadece localStorage\'a kaydedildi');
        return false;
    }
    
    try {
        database.ref('profileNotes').set(notes, (error) => {
            if (error) {
                console.error('❌ Firebase not kayıt hatası:', error);
                console.error('Hata kodu:', error.code);
                console.error('Hata mesajı:', error.message);
                
                // Permission hatası kontrolü
                if (error.code === 'PERMISSION_DENIED') {
                    console.error('🚨 İZİN HATASI! Firebase kurallarını kontrol edin!');
                    console.error('📋 Firebase Console\'da Realtime Database > Rules bölümüne gidin');
                    console.error('📋 firebase-rules.txt dosyasındaki kuralları yapıştırın');
                    alert('Firebase izin hatası!\n\nLütfen Firebase Console\'da database kurallarını güncelleyin.\n\nfirebase-rules.txt dosyasındaki kuralları kullanın.');
                }
                return false;
            } else {
                console.log('✅ Notlar Firebase\'e kaydedildi:', notes.length, 'not');
                return true;
            }
        });
        return true;
    } catch (error) {
        console.error('❌ Firebase not kayıt hatası (catch):', error);
        return false;
    }
}

// Firebase'den notları yükleme
function loadProfileNotesFromFirebase(callback) {
    if (!useFirebase || !database) {
        console.warn('⚠️ Firebase mevcut değil, localStorage\'dan yükleniyor');
        if (callback) callback([]);
        return;
    }
    
    try {
        database.ref('profileNotes').once('value', (snapshot) => {
            const notes = snapshot.val();
            if (notes && Array.isArray(notes)) {
                console.log('✅ Firebase\'den notlar yüklendi:', notes.length, 'not');
                if (callback) callback(notes);
            } else {
                console.log('⚠️ Firebase\'de not yok');
                if (callback) callback([]);
            }
        }, (error) => {
            console.error('❌ Firebase not yükleme hatası:', error);
            console.error('Hata kodu:', error.code);
            console.error('Hata mesajı:', error.message);
            
            // Permission hatası kontrolü
            if (error.code === 'PERMISSION_DENIED') {
                console.error('🚨 İZİN HATASI! Firebase kurallarını kontrol edin!');
                console.error('📋 Firebase Console\'da Realtime Database > Rules bölümüne gidin');
                console.error('📋 firebase-rules.txt dosyasındaki kuralları yapıştırın');
            }
            
            if (callback) callback([]);
        });
    } catch (error) {
        console.error('❌ Firebase not yükleme hatası (catch):', error);
        if (callback) callback([]);
    }
}

// Notları birleştir (localStorage + Firebase)
function mergeNotes(localNotes, firebaseNotes) {
    // Tüm notları birleştir (id'ye göre benzersiz)
    const notesMap = new Map();
    
    // Önce localStorage notları ekle
    if (localNotes && Array.isArray(localNotes)) {
        localNotes.forEach(note => {
            if (note && note.id) {
                notesMap.set(note.id, note);
            }
        });
    }
    
    // Sonra Firebase notlarını ekle (daha yeni olanları önceliklendir)
    if (firebaseNotes && Array.isArray(firebaseNotes)) {
        firebaseNotes.forEach(note => {
            if (note && note.id) {
                const existingNote = notesMap.get(note.id);
                if (!existingNote || new Date(note.timestamp) > new Date(existingNote.timestamp)) {
                    notesMap.set(note.id, note);
                }
            }
        });
    }
    
    // Map'i array'e çevir ve tarihe göre sırala
    const mergedNotes = Array.from(notesMap.values());
    mergedNotes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return mergedNotes;
}

function getProfileNotes() {
    // Önce localStorage'dan yükle (hızlı erişim için)
    const localNotes = localStorage.getItem('profileNotes');
    const localNotesArray = localNotes ? JSON.parse(localNotes) : [];
    
    return localNotesArray;
}

// Notları senkronize et (localStorage + Firebase)
function syncProfileNotes() {
    // Önce localStorage'dan yükle
    const localNotes = getProfileNotes();
    
    // Firebase'den yükle ve birleştir
    loadProfileNotesFromFirebase((firebaseNotes) => {
        const mergedNotes = mergeNotes(localNotes, firebaseNotes);
        
        // Birleştirilmiş notları localStorage'a kaydet
        localStorage.setItem('profileNotes', JSON.stringify(mergedNotes));
        
        // Eğer Firebase'de daha yeni notlar varsa, onları Firebase'e geri kaydet
        if (firebaseNotes && firebaseNotes.length > 0) {
            // Her iki kaynaktan da en güncel verileri Firebase'e kaydet
            saveProfileNotesToFirebase(mergedNotes);
        }
        
        // Keşfet notlarını yenile
        if (document.getElementById('discoverNotesList')) {
            loadDiscoverNotes();
        }
        
        // Profil notlarını yenile
        if (document.getElementById('profileNotesList')) {
            loadProfileNotes();
        }
    });
}

function setupDiscover() {
    // Keşfet not paylaşma butonunu bağla
    const shareDiscoverNoteBtn = document.getElementById('shareDiscoverNoteBtn');
    if (shareDiscoverNoteBtn) {
        shareDiscoverNoteBtn.addEventListener('click', shareDiscoverNote);
    }
    
    // Notları senkronize et (Firebase'den yükle)
    syncProfileNotes();
    
    // Keşfet notlarını yükle
    loadDiscoverNotes();
    
    // Her 5 saniyede bir Firebase'den yeni notları kontrol et
    setInterval(() => {
        syncProfileNotes();
    }, 5000);
}

function loadDiscoverNotes() {
    const container = document.getElementById('discoverNotesList');
    if (!container) return;
    
    // Önce localStorage'dan yükle (hızlı görüntüleme için)
    const localNotes = getProfileNotes();
    
    // Firebase'den de yükle ve birleştir (arka planda)
    loadProfileNotesFromFirebase((firebaseNotes) => {
        const mergedNotes = mergeNotes(localNotes, firebaseNotes);
        localStorage.setItem('profileNotes', JSON.stringify(mergedNotes));
        
        // Birleştirilmiş notları göster
        displayDiscoverNotes(mergedNotes);
        
        // Firebase'e güncel veriyi kaydet
        if (mergedNotes.length > 0) {
            saveProfileNotesToFirebase(mergedNotes);
        }
    });
    
    // Hemen localStorage'dan göster (hızlı yükleme için)
    displayDiscoverNotes(localNotes);
}

function displayDiscoverNotes(notes) {
    const container = document.getElementById('discoverNotesList');
    if (!container) return;
    
    // Keşfet notları: type: 'discover' veya isPublic: true
    const publicNotes = notes
        .filter(n => n && (n.type === 'discover' || n.isPublic))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (publicNotes.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">Henüz keşfette not yok.</p>';
        return;
    }
    
    let html = '';
    publicNotes.forEach(note => {
        const date = new Date(note.timestamp);
        const likeUsers = Array.isArray(note.likes) ? note.likes : [];
        const likeCount = likeUsers.length;
        const isLikedByCurrent = currentUser && likeUsers.includes(currentUser.id);
        const comments = Array.isArray(note.comments) ? note.comments : [];
        const commentCount = comments.length;
        
        html += `
            <div class="profile-note-item discover-note-item">
                <div class="note-header">
                    ${note.userPhoto ? `<img src="${note.userPhoto}" class="note-user-photo clickable-profile-photo" alt="${note.userName}" onclick="viewFriendProfile('${note.userId}')" style="cursor: pointer;" title="${note.userName} profilini gör">` : `<div class="note-user-photo-placeholder clickable-profile-photo" onclick="viewFriendProfile('${note.userId}')" style="cursor: pointer;" title="${note.userName} profilini gör">👤</div>`}
                    <div class="note-user-info">
                        <strong>${note.userName}</strong>
                        <span class="note-time">${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}</span>
                    </div>
                </div>
                <div class="note-content">${note.note}</div>
                ${note.image ? `<div class="note-image-wrapper"><img src="${note.image}" alt="Not görseli"></div>` : ''}
                <div class="note-actions">
                    <button class="note-like-btn ${isLikedByCurrent ? 'liked' : ''}" onclick="likeProfileNote('${note.id}')">
                        ❤️ ${likeCount > 0 ? likeCount : ''}
                    </button>
                    <button class="note-comment-btn" onclick="toggleComments('${note.id}')">
                        💬 ${commentCount > 0 ? commentCount : ''}
                    </button>
                </div>
                <div class="note-comments-section" id="comments-section-${note.id}" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--light-color);">
                    <div class="comments-list" id="comments-list-${note.id}">
                        ${renderComments(comments)}
                    </div>
                    <div class="comment-input-area" style="margin-top: 10px; display: flex; gap: 10px;">
                        <input type="text" id="comment-input-${note.id}" placeholder="Yorum yazın..." class="comment-input" style="flex: 1; padding: 8px 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 0.9rem;" onkeypress="if(event.key === 'Enter') addComment('${note.id}')">
                        <button class="btn-primary" onclick="addComment('${note.id}')" style="padding: 8px 16px; width: auto; margin: 0; min-height: auto;">Yorum Yap</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderComments(comments) {
    if (!comments || comments.length === 0) {
        return '<p style="color: #999; font-size: 0.9rem; padding: 10px;">Henüz yorum yok.</p>';
    }
    
    let html = '';
    comments.forEach(comment => {
        const commentDate = new Date(comment.timestamp);
        const commentUserPhoto = getProfilePhotoByUserId(comment.userId);
        html += `
            <div class="comment-item" style="display: flex; gap: 10px; margin-bottom: 12px; padding: 10px; background: var(--light-color); border-radius: 8px;">
                ${commentUserPhoto ? `<img src="${commentUserPhoto}" class="comment-user-photo clickable-profile-photo" alt="${comment.userName}" onclick="viewFriendProfile('${comment.userId}')" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; cursor: pointer; flex-shrink: 0;" title="${comment.userName} profilini gör">` : `<div class="comment-user-photo-placeholder clickable-profile-photo" onclick="viewFriendProfile('${comment.userId}')" style="width: 35px; height: 35px; border-radius: 50%; background: var(--primary-color); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.9rem; cursor: pointer; flex-shrink: 0;" title="${comment.userName} profilini gör">👤</div>`}
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                        <strong style="font-size: 0.9rem; color: var(--dark-color);">${comment.userName}</strong>
                        <span style="font-size: 0.75rem; color: #999;">${commentDate.toLocaleDateString('tr-TR')} ${commentDate.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--dark-color); line-height: 1.4;">${comment.text}</div>
                </div>
            </div>
        `;
    });
    return html;
}

function toggleComments(noteId) {
    const commentsSection = document.getElementById(`comments-section-${noteId}`);
    if (!commentsSection) return;
    
    if (commentsSection.style.display === 'none') {
        commentsSection.style.display = 'block';
    } else {
        commentsSection.style.display = 'none';
    }
}

function addComment(noteId) {
    if (!currentUser) {
        alert('Yorum yapmak için giriş yapmalısınız.');
        return;
    }
    
    const commentInput = document.getElementById(`comment-input-${noteId}`);
    if (!commentInput) return;
    
    const commentText = commentInput.value.trim();
    if (!commentText) {
        alert('Lütfen yorum yazın!');
        return;
    }
    
    const notes = getProfileNotes();
    const index = notes.findIndex(n => n.id === noteId);
    if (index === -1) return;
    
    const note = notes[index];
    if (!Array.isArray(note.comments)) {
        note.comments = [];
    }
    
    const newComment = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        text: commentText,
        timestamp: new Date().toISOString()
    };
    
    note.comments.push(newComment);
    notes[index] = note;
    localStorage.setItem('profileNotes', JSON.stringify(notes));
    
    // Firebase'e de kaydet
    saveProfileNotesToFirebase(notes);
    
    // Yorum inputunu temizle
    commentInput.value = '';
    
    // Yorumları yeniden yükle
    const commentsList = document.getElementById(`comments-list-${noteId}`);
    if (commentsList) {
        commentsList.innerHTML = renderComments(note.comments);
    }
    
    // Keşfet listesini güncelle (yorum sayısını göstermek için)
    loadDiscoverNotes();
}

function loadProfileNotes() {
    if (!currentUser) return;
    
    // Sadece kullanıcının kendi profil notlarını göster (type: 'profile' veya type yok ve isPublic: false)
    const notes = getProfileNotes().filter(n => 
        n.userId === currentUser.id && 
        (n.type === 'profile' || (!n.type && !n.isPublic))
    );
    const container = document.getElementById('profileNotesList');
    if (!container) return;
    
    if (notes.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">Henüz fotoğraf paylaşılmamış.</p>';
        return;
    }
    
    let html = '';
    notes.forEach(note => {
        const date = new Date(note.timestamp);
        const isOwn = note.userId === currentUser.id;
        const likeUsers = Array.isArray(note.likes) ? note.likes : [];
        const likeCount = likeUsers.length;
        const isLikedByCurrent = likeUsers.includes(currentUser.id);
        
        html += `
            <div class="profile-note-item ${isOwn ? 'own-note' : ''}">
                <div class="note-header">
                    ${note.userPhoto ? `<img src="${note.userPhoto}" class="note-user-photo clickable-profile-photo" alt="${note.userName}" onclick="viewFriendProfile('${note.userId}')" style="cursor: pointer;" title="${note.userName} profilini gör">` : `<div class="note-user-photo-placeholder clickable-profile-photo" onclick="viewFriendProfile('${note.userId}')" style="cursor: pointer;" title="${note.userName} profilini gör">👤</div>`}
                    <div class="note-user-info">
                        <strong>${note.userName}</strong>
                        <span class="note-time">${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}</span>
                    </div>
                </div>
                ${note.image ? `<div class="note-image-wrapper"><img src="${note.image}" alt="Paylaşılan fotoğraf" style="max-width: 100%; border-radius: 8px; margin-bottom: 10px;"></div>` : ''}
                ${note.note ? `<div class="note-content">${note.note}</div>` : ''}
                <div class="note-actions">
                    <button class="note-like-btn ${isLikedByCurrent ? 'liked' : ''}" onclick="likeProfileNote('${note.id}')">
                        ❤️ ${likeCount > 0 ? likeCount : ''}
                    </button>
                    ${isOwn ? `<button class="note-delete-btn" onclick="deleteProfileNote('${note.id}')">Sil</button>` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function likeProfileNote(noteId) {
    if (!currentUser) return;
    
    const notes = getProfileNotes();
    const index = notes.findIndex(n => n.id === noteId);
    if (index === -1) return;
    
    const note = notes[index];
    if (!Array.isArray(note.likes)) {
        note.likes = [];
    }
    
    if (note.likes.includes(currentUser.id)) {
        // beğeniyi kaldır
        note.likes = note.likes.filter(id => id !== currentUser.id);
    } else {
        note.likes.push(currentUser.id);
    }
    
    notes[index] = note;
    localStorage.setItem('profileNotes', JSON.stringify(notes));
    
    // Firebase'e de kaydet
    saveProfileNotesToFirebase(notes);
    
    // Hem profil hem keşfet listelerini güncelle
    if (document.getElementById('profileNotesList')) {
        loadProfileNotes();
    }
    if (document.getElementById('discoverNotesList')) {
        loadDiscoverNotes();
    }
}

// Global fonksiyonlar - window'a ekle
window.toggleComments = toggleComments;
window.addComment = addComment;
window.renderComments = renderComments;

function deleteProfileNote(noteId) {
    if (!currentUser) return;
    
    const notes = getProfileNotes();
    const note = notes.find(n => n.id === noteId);
    if (!note || note.userId !== currentUser.id) {
        alert('Yalnızca kendi notlarınızı silebilirsiniz.');
        return;
    }
    
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return;
    
    const updatedNotes = notes.filter(n => n.id !== noteId);
    localStorage.setItem('profileNotes', JSON.stringify(updatedNotes));
    
    // Firebase'e de kaydet
    saveProfileNotesToFirebase(updatedNotes);
    
    if (document.getElementById('profileNotesList')) {
        loadProfileNotes();
    }
    if (document.getElementById('discoverNotesList')) {
        loadDiscoverNotes();
    }
}

// Arkadaş Fonksiyonları
function setupFriends() {
    const searchFriendBtn = document.getElementById('searchFriendBtn');
    const friendSearchInput = document.getElementById('friendSearchInput');
    
    if (!searchFriendBtn) return;
    
    searchFriendBtn.addEventListener('click', searchFriend);
    
    if (friendSearchInput) {
        friendSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchFriend();
            }
        });
    }
    
    // İlk yüklemede senkronize et
    syncFriends();
    syncFriendRequests();
    
    // Periyodik senkronizasyon (her 5 saniyede bir)
    setInterval(() => {
        syncFriends();
        syncFriendRequests();
    }, 5000);
}

// Firebase'den kullanıcıları yükleme
function loadUsersFromFirebase(callback) {
    if (!useFirebase || !database) {
        // Firebase yoksa localStorage'dan yükle
        if (callback) callback(getUsers());
        return;
    }
    
    try {
        database.ref('users').once('value', (snapshot) => {
            const firebaseUsers = snapshot.val();
            const usersArray = [];
            
            if (firebaseUsers) {
                // Firebase'den gelen kullanıcıları array'e çevir
                Object.keys(firebaseUsers).forEach(userId => {
                    const user = firebaseUsers[userId];
                    if (user) {
                        usersArray.push(user);
                    }
                });
            }
            
            // localStorage'dan da yükle ve birleştir
            const localUsers = getUsers();
            const allUsersMap = new Map();
            
            // Önce localStorage kullanıcılarını ekle
            localUsers.forEach(user => {
                if (user && user.id) {
                    allUsersMap.set(user.id, user);
                }
            });
            
            // Sonra Firebase kullanıcılarını ekle (daha güncel olanlar)
            usersArray.forEach(user => {
                if (user && user.id) {
                    const existing = allUsersMap.get(user.id);
                    // E-posta varsa güncelle
                    if (!existing || (user.email && !existing.email)) {
                        allUsersMap.set(user.id, user);
                    } else if (existing && user.email) {
                        // Mevcut kullanıcıyı güncelle ama password'u koru
                        allUsersMap.set(user.id, { ...existing, ...user, password: existing.password });
                    }
                }
            });
            
            const mergedUsers = Array.from(allUsersMap.values());
            console.log('✅ Toplam kullanıcı yüklendi:', mergedUsers.length, '(LocalStorage:', localUsers.length, '+ Firebase:', usersArray.length, ')');
            
            if (callback) callback(mergedUsers);
        }, (error) => {
            console.error('❌ Firebase kullanıcı yükleme hatası:', error);
            // Hata durumunda localStorage'dan yükle
            if (callback) callback(getUsers());
        });
    } catch (error) {
        console.error('❌ Firebase kullanıcı yükleme hatası (catch):', error);
        if (callback) callback(getUsers());
    }
}

function searchFriend() {
    const searchInput = document.getElementById('friendSearchInput');
    if (!searchInput || !currentUser) return;
    
    const email = searchInput.value.trim();
    if (!email) {
        alert('Lütfen bir e-posta adresi girin!');
        return;
    }
    
    if (email === currentUser.email) {
        alert('Kendinizi arkadaş olarak ekleyemezsiniz!');
        return;
    }
    
    // Loading göster
    const container = document.getElementById('friendsList');
    if (container) {
        const oldContent = container.innerHTML;
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">🔍 Aranıyor...</p>';
    }
    
    // Önce localStorage'dan ara (hızlı)
    const localUsers = getUsers();
    const localFriend = localUsers.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    
    if (localFriend) {
        showFriendSearchResult(localFriend);
        if (container) container.innerHTML = '';
        return;
    }
    
    // Firebase'den de ara
    loadUsersFromFirebase((allUsers) => {
        // E-posta ile ara (case insensitive)
        const friend = allUsers.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
        
        if (!friend) {
            alert('Bu e-posta adresine kayıtlı kullanıcı bulunamadı!\n\nNot: Farklı cihazlardaki kullanıcıları görmek için Firebase kurallarının güncel olduğundan emin olun.');
            if (container) container.innerHTML = '';
            return;
        }
        
        // Kullanıcı bilgilerini göster
        showFriendSearchResult(friend);
        if (container) container.innerHTML = '';
    });
}

// Arama sonucunu göster (modal)
function showFriendSearchResult(friend) {
    const userData = getUserDataById(friend.id);
    const friendPhoto = getProfilePhotoByUserId(friend.id);
    
    // Zaten arkadaş mı kontrol et
    const friends = getFriends();
    const isAlreadyFriend = friends.find(f => f.id === friend.id);
    
    // Zaten istek gönderilmiş mi kontrol et
    const requests = getFriendRequests();
    const hasPendingRequest = requests.find(r => r.fromId === currentUser.id && r.toId === friend.id);
    
    // Modal oluştur
    const modal = document.createElement('div');
    modal.className = 'user-details-modal active';
    modal.id = 'friendSearchResultModal';
    
    let actionButton = '';
    if (isAlreadyFriend) {
        actionButton = '<button class="btn-secondary" onclick="closeFriendSearchResult(); viewFriendProfile(\'' + friend.id + '\')">Profili Görüntüle</button>';
    } else if (hasPendingRequest) {
        actionButton = '<button class="btn-secondary" disabled style="opacity: 0.6; cursor: not-allowed;">İstek Gönderildi</button>';
    } else {
        actionButton = '<button class="btn-primary" onclick="sendFriendRequestFromSearch(\'' + friend.id + '\')">Arkadaşlık İsteği Gönder</button>';
    }
    
    modal.innerHTML = `
        <div class="user-details-content" style="max-width: 600px;">
            <div class="user-details-header">
                <h3>👤 Kullanıcı Bilgileri</h3>
                <button class="close-modal" onclick="closeFriendSearchResult()">×</button>
            </div>
            <div class="friend-profile-content">
                <div class="friend-profile-photo" style="text-align: center; margin-bottom: 20px;">
                    ${friendPhoto ? `<img src="${friendPhoto}" alt="${friend.name}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin: 0 auto; display: block; border: 4px solid var(--primary-color);">` : '<div style="width: 120px; height: 120px; border-radius: 50%; background: var(--primary-gradient); display: flex; align-items: center; justify-content: center; font-size: 3rem; margin: 0 auto; color: white;">👤</div>'}
                </div>
                <div class="friend-profile-info" style="text-align: center; margin-bottom: 25px;">
                    <h3 style="margin-bottom: 10px; color: var(--dark-color);">${friend.name}</h3>
                    <p style="color: var(--gray-600); margin-bottom: 15px;"><strong>E-posta:</strong> ${friend.email}</p>
                    ${friend.phone ? `<p style="color: var(--gray-600); margin-bottom: 15px;"><strong>Telefon:</strong> ${friend.phone}</p>` : ''}
                    ${userData ? `
                        <div style="display: flex; justify-content: center; gap: 20px; margin-top: 20px; flex-wrap: wrap;">
                            <div style="background: var(--primary-gradient); color: white; padding: 10px 20px; border-radius: 8px; min-width: 100px;">
                                <div style="font-size: 0.85rem; opacity: 0.9;">Puan</div>
                                <div style="font-size: 1.5rem; font-weight: bold;">${userData.points || 0}</div>
                            </div>
                            <div style="background: var(--secondary-gradient); color: white; padding: 10px 20px; border-radius: 8px; min-width: 100px;">
                                <div style="font-size: 0.85rem; opacity: 0.9;">Level</div>
                                <div style="font-size: 1.5rem; font-weight: bold;">${userData.userLevel || 1}</div>
                            </div>
                            ${userData.completedDays ? `
                            <div style="background: var(--accent-purple); color: white; padding: 10px 20px; border-radius: 8px; min-width: 100px;">
                                <div style="font-size: 0.85rem; opacity: 0.9;">Antrenman</div>
                                <div style="font-size: 1.5rem; font-weight: bold;">${userData.completedDays}</div>
                            </div>
                            ` : ''}
                        </div>
                    ` : '<p style="color: var(--gray-500); margin-top: 15px;">Henüz antrenman verisi yok.</p>'}
                </div>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                    ${actionButton}
                    <button class="btn-secondary" onclick="closeFriendSearchResult(); viewFriendProfile('${friend.id}')">Detaylı Profil</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Modal dışına tıklanınca kapat
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFriendSearchResult();
        }
    });
}

function closeFriendSearchResult() {
    const modal = document.getElementById('friendSearchResultModal');
    if (modal) {
        modal.remove();
    }
}

function sendFriendRequestFromSearch(toUserId) {
    // Zaten arkadaş mı kontrol et
    const friends = getFriends();
    if (friends.find(f => f.id === toUserId)) {
        alert('Bu kullanıcı zaten arkadaş listenizde!');
        closeFriendSearchResult();
        return;
    }
    
    // Zaten istek gönderilmiş mi kontrol et
    const requests = getFriendRequests();
    if (requests.find(r => r.fromId === currentUser.id && r.toId === toUserId)) {
        alert('Bu kullanıcıya zaten arkadaşlık isteği gönderdiniz!');
        closeFriendSearchResult();
        return;
    }
    
    // Arkadaşlık isteği gönder
    sendFriendRequest(toUserId);
    closeFriendSearchResult();
    
    const searchInput = document.getElementById('friendSearchInput');
    if (searchInput) searchInput.value = '';
    
    alert('Arkadaşlık isteği gönderildi!');
    loadFriendRequests();
}

function sendFriendRequest(toUserId) {
    if (!currentUser) {
        console.error('❌ Kullanıcı oturumu yok, arkadaşlık isteği gönderilemedi');
        return false;
    }
    
    const requests = getFriendRequests();
    
    // ID'leri string'e çevir (tutarlılık için)
    const fromIdStr = String(currentUser.id || '');
    const toIdStr = String(toUserId || '');
    
    const newRequest = {
        id: Date.now().toString(),
        fromId: fromIdStr,
        fromName: currentUser.name || '',
        fromEmail: currentUser.email || '',
        fromPhoto: getProfilePhoto() || '',
        toId: toIdStr,
        timestamp: new Date().toISOString()
    };
    
    // Zaten bu istek var mı kontrol et (string karşılaştırması ile)
    const existingRequest = requests.find(r => {
        const rFromId = String(r.fromId || '');
        const rToId = String(r.toId || '');
        return rFromId === fromIdStr && rToId === toIdStr;
    });
    if (existingRequest) {
        console.warn('⚠️ Bu kullanıcıya zaten istek gönderilmiş');
        return false;
    }
    
    requests.push(newRequest);
    localStorage.setItem('friendRequests', JSON.stringify(requests));
    
    // Firebase'e kaydet
    saveFriendRequestsToFirebase(requests);
    
    console.log('✅ Arkadaşlık isteği gönderildi:', newRequest);
    console.log('📍 Alıcı ID:', toIdStr, '(Type:', typeof toIdStr, ')');
    console.log('📍 Gönderen ID:', fromIdStr, '(Type:', typeof fromIdStr, ')');
    console.log('📍 Toplam istek sayısı:', requests.length);
    console.log('📍 İstek detayı:', JSON.stringify(newRequest, null, 2));
    
    // Firebase'e kaydettikten sonra kısa bir gecikme ile kontrol et
    setTimeout(() => {
        loadFriendRequestsFromFirebase((firebaseRequests) => {
            if (firebaseRequests && Array.isArray(firebaseRequests)) {
                const savedRequest = firebaseRequests.find(r => r.id === newRequest.id);
                if (savedRequest) {
                    console.log('✅ İstek Firebase\'e başarıyla kaydedildi');
                    console.log('📍 Kaydedilen toId:', savedRequest.toId, '(Type:', typeof savedRequest.toId, ')');
                } else {
                    console.warn('⚠️ İstek Firebase\'de bulunamadı!');
                }
            }
        });
    }, 2000);
    
    return true;
}

// Firebase'e arkadaşlık isteklerini kaydet
function saveFriendRequestsToFirebase(requests) {
    if (!useFirebase || !database) {
        console.warn('⚠️ Firebase mevcut değil, arkadaşlık istekleri sadece localStorage\'a kaydedildi');
        return false;
    }
    
    if (!Array.isArray(requests)) {
        console.error('❌ Arkadaşlık istekleri bir array değil:', requests);
        return false;
    }
    
    try {
        console.log('🔥 Firebase\'e arkadaşlık istekleri kaydediliyor:', requests.length, 'istek');
        database.ref('friendRequests').set(requests, (error) => {
            if (error) {
                console.error('❌ Firebase arkadaşlık isteği kayıt hatası:', error);
                console.error('Hata kodu:', error.code);
                console.error('Hata mesajı:', error.message);
                return false;
            } else {
                console.log('✅ Arkadaşlık istekleri Firebase\'e kaydedildi:', requests.length, 'istek');
                console.log('📍 İstekler:', requests);
                return true;
            }
        });
        return true;
    } catch (error) {
        console.error('❌ Firebase arkadaşlık isteği kayıt hatası (catch):', error);
        return false;
    }
}

// Firebase'den arkadaşlık isteklerini yükle
function loadFriendRequestsFromFirebase(callback) {
    if (!useFirebase || !database) {
        console.warn('⚠️ Firebase mevcut değil, arkadaşlık istekleri localStorage\'dan yükleniyor');
        if (callback) callback([]);
        return;
    }
    
    try {
        console.log('🔥 Firebase\'den arkadaşlık istekleri yükleniyor...');
        database.ref('friendRequests').once('value', (snapshot) => {
            const firebaseRequests = snapshot.val();
            console.log('📦 Firebase\'den gelen veri:', firebaseRequests);
            
            if (firebaseRequests && Array.isArray(firebaseRequests)) {
                console.log('✅ Firebase\'den arkadaşlık istekleri yüklendi:', firebaseRequests.length, 'istek');
                if (currentUser) {
                    // String/number karşılaştırması için toString() kullan
                    const currentUserId = String(currentUser.id || '');
                    const myRequests = firebaseRequests.filter(r => {
                        if (!r || !r.toId) return false;
                        return String(r.toId) === currentUserId;
                    });
                    console.log('📍 Bana gelen istekler:', myRequests.length, 'istek');
                    myRequests.forEach(req => {
                        console.log('  -', req.fromName, '(ID:', req.fromId, ') -> Benim ID:', currentUser.id, '| toId:', req.toId);
                        console.log('    Karşılaştırma:', String(req.toId), '===', currentUserId, '=', String(req.toId) === currentUserId);
                    });
                }
                if (callback) callback(firebaseRequests);
            } else if (firebaseRequests === null) {
                console.log('⚠️ Firebase\'de arkadaşlık isteği yok (null)');
                if (callback) callback([]);
            } else {
                console.warn('⚠️ Firebase\'den gelen veri array değil:', typeof firebaseRequests, firebaseRequests);
                if (callback) callback([]);
            }
        }, (error) => {
            console.error('❌ Firebase arkadaşlık isteği yükleme hatası:', error);
            console.error('Hata kodu:', error.code);
            console.error('Hata mesajı:', error.message);
            if (callback) callback([]);
        });
    } catch (error) {
        console.error('❌ Firebase arkadaşlık isteği yükleme hatası (catch):', error);
        if (callback) callback([]);
    }
}

function getFriendRequests() {
    const requests = localStorage.getItem('friendRequests');
    return requests ? JSON.parse(requests) : [];
}

// Arkadaşlık isteklerini senkronize et (localStorage + Firebase)
function syncFriendRequests() {
    if (!currentUser) return;
    
    // Önce arkadaşları yükle (kontrol için)
    loadFriendsFromFirebase((firebaseFriends) => {
        const localFriends = getFriends();
        const allFriends = [...(localFriends || []), ...(firebaseFriends || [])];
        const friendsMap = new Map();
        allFriends.forEach(f => {
            if (f && f.id) friendsMap.set(f.id, f);
        });
        const friends = Array.from(friendsMap.values());
        
        // Şimdi istekleri yükle
        loadFriendRequestsFromFirebase((firebaseRequests) => {
            const localRequests = getFriendRequests();
            
            // İstekleri birleştir (id'ye göre benzersiz)
            const requestsMap = new Map();
            
            // Önce local istekleri ekle
            if (Array.isArray(localRequests)) {
                localRequests.forEach(req => {
                    if (req && req.id) {
                        requestsMap.set(req.id, req);
                    }
                });
            }
            
            // Sonra Firebase isteklerini ekle (daha yeni olanları override eder)
            if (firebaseRequests && Array.isArray(firebaseRequests)) {
                firebaseRequests.forEach(req => {
                    if (req && req.id) {
                        const existing = requestsMap.get(req.id);
                        // Eğer Firebase'deki daha yeni ise veya yoksa ekle
                        if (!existing || (req.timestamp && existing.timestamp && req.timestamp > existing.timestamp)) {
                            requestsMap.set(req.id, req);
                        }
                    }
                });
            }
            
            // Tüm istekleri birleştirilmiş haliyle Firebase'e kaydet (filtrelenmeden önce)
            const allMergedRequests = Array.from(requestsMap.values());
            
            // Firebase'e TÜM istekleri kaydet (eğer değişiklik varsa)
            const localStr = JSON.stringify(localRequests);
            const mergedStr = JSON.stringify(allMergedRequests);
            if (localStr !== mergedStr) {
                saveFriendRequestsToFirebase(allMergedRequests);
                console.log('✅ Tüm istekler Firebase\'e kaydedildi:', allMergedRequests.length, 'istek');
            }
            
            // localStorage'a da TÜM istekleri kaydet (UI için değil, veri bütünlüğü için)
            localStorage.setItem('friendRequests', JSON.stringify(allMergedRequests));
            
            // Sadece bana gelen ve henüz arkadaş olmadığım kullanıcılardan gelen istekleri göster
            const finalRequests = allMergedRequests.filter(req => {
                // String/number karşılaştırması için toString() kullan
                const reqToId = String(req.toId || '');
                const currentUserId = String(currentUser.id || '');
                
                // Sadece bana gelen istekleri göster
                if (reqToId !== currentUserId) {
                    return false;
                }
                
                // Eğer bu kullanıcı zaten arkadaşsa isteği gösterme
                const reqFromId = String(req.fromId || '');
                if (reqFromId && friends.find(f => String(f.id || '') === reqFromId)) {
                    console.log('⚠️ Zaten arkadaş, istek gösterilmeyecek:', reqFromId);
                    return false;
                }
                
                return true;
            });
            
            console.log('📍 Toplam istek sayısı:', allMergedRequests.length);
            console.log('📍 Bana gelen istek sayısı:', finalRequests.length);
            finalRequests.forEach(req => {
                console.log('  - İstek:', req.fromName, '(ID:', req.fromId, ') -> Benim ID:', currentUser.id);
            });
            
            // UI'ı güncelle (sadece bana gelen istekleri göster)
            displayFriendRequests(finalRequests);
        });
    });
}

function displayFriendRequests(requests) {
    if (!currentUser) return;
    
    const container = document.getElementById('friendRequestsList');
    if (!container) return;
    
    // Bana gelen istekler (zaten filtrelenmiş geliyor ama yine de kontrol edelim)
    const currentUserId = String(currentUser.id || '');
    const incomingRequests = requests.filter(r => {
        if (!r || !r.toId) return false;
        return String(r.toId) === currentUserId;
    });
    
    if (incomingRequests.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">Henüz arkadaşlık isteği yok.</p>';
        return;
    }
    
    let html = '';
    incomingRequests.forEach(request => {
        html += `
            <div class="friend-request-item">
                <div class="request-user-info">
                    ${request.fromPhoto ? `<img src="${request.fromPhoto}" class="request-user-photo" alt="${request.fromName}">` : '<div class="request-user-photo-placeholder">👤</div>'}
                    <div>
                        <strong>${request.fromName || 'İsimsiz'}</strong>
                        <div style="font-size: 0.85rem; color: #666;">${request.fromEmail || ''}</div>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn-success" onclick="acceptFriendRequest('${request.id}')">Kabul Et</button>
                    <button class="btn-secondary" onclick="rejectFriendRequest('${request.id}')">Reddet</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function loadFriendRequests() {
    if (!currentUser) return;
    
    // Önce senkronize et, sonra göster
    syncFriendRequests();
}

function acceptFriendRequest(requestId) {
    if (!currentUser) return;
    
    console.log('✅ İstek kabul ediliyor:', requestId);
    
    const requests = getFriendRequests();
    const request = requests.find(r => r.id === requestId);
    
    // String karşılaştırması ile kontrol et
    const requestToId = String(request?.toId || '');
    const currentUserId = String(currentUser.id || '');
    
    if (!request || requestToId !== currentUserId) {
        console.error('❌ İstek bulunamadı veya bu istek size ait değil');
        console.error('📍 İstek toId:', requestToId, '| Benim ID:', currentUserId);
        console.error('📍 İstek detayı:', request);
        return;
    }
    
    // Firebase'den gönderen kullanıcıyı yükle
    loadUsersFromFirebase((allUsers) => {
        const fromUser = allUsers.find(u => u.id === request.fromId);
        
        if (!fromUser) {
            console.error('❌ Gönderen kullanıcı bulunamadı:', request.fromId);
            alert('Kullanıcı bulunamadı!');
            return;
        }
        
        console.log('✅ Gönderen kullanıcı bulundu:', fromUser.name);
        
        // Mevcut arkadaşları yükle
        loadFriendsFromFirebase((firebaseFriends) => {
            const localFriends = getFriends();
            
            // Arkadaşları birleştir
            const friendsMap = new Map();
            if (Array.isArray(localFriends)) {
                localFriends.forEach(f => {
                    if (f && f.id) friendsMap.set(f.id, f);
                });
            }
            if (Array.isArray(firebaseFriends)) {
                firebaseFriends.forEach(f => {
                    if (f && f.id) friendsMap.set(f.id, f);
                });
            }
            
            const friends = Array.from(friendsMap.values());
            
            // Yeni arkadaşı ekle (eğer yoksa)
            if (!friends.find(f => f.id === fromUser.id)) {
                const newFriend = {
                    id: fromUser.id,
                    name: fromUser.name || request.fromName,
                    email: fromUser.email || request.fromEmail,
                    photo: fromUser.photo || request.fromPhoto || '',
                    addedAt: new Date().toISOString()
                };
                friends.push(newFriend);
                console.log('✅ Yeni arkadaş eklendi:', newFriend.name);
            }
            
            // Kendi arkadaş listeme kaydet
            saveFriends(friends);
            saveFriendsToFirebase(friends);
            
            // Diğer kullanıcının arkadaş listesine de ekle
            loadFriendsFromFirebaseByUserId(request.fromId, (otherUserFriends) => {
                const otherFriends = otherUserFriends || [];
                
                if (!otherFriends.find(f => f.id === currentUser.id)) {
                    otherFriends.push({
                        id: currentUser.id,
                        name: currentUser.name,
                        email: currentUser.email,
                        photo: getProfilePhoto() || '',
                        addedAt: new Date().toISOString()
                    });
                    
                    saveFriendsByUserId(request.fromId, otherFriends);
                    console.log('✅ Diğer kullanıcının listesine eklendi:', request.fromId);
                }
                
                // İsteği sil
                const updatedRequests = requests.filter(r => r.id !== requestId);
                localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));
                
                // Firebase'e kaydet (isteği sil)
                saveFriendRequestsToFirebase(updatedRequests);
                console.log('✅ İstek silindi ve Firebase\'e kaydedildi');
                
                // UI'ı güncelle
                setTimeout(() => {
                    syncFriends();
                    syncFriendRequests();
                    alert('Arkadaşlık isteği kabul edildi! ' + fromUser.name + ' artık arkadaşınız.');
                }, 500);
            });
        });
    });
}

// Belirli bir kullanıcının arkadaşlarını Firebase'den yükle
function loadFriendsFromFirebaseByUserId(userId, callback) {
    if (!useFirebase || !database) {
        if (callback) callback([]);
        return;
    }
    
    try {
        const friendsKey = `friends_${userId}`;
        database.ref('friends').child(friendsKey).once('value', (snapshot) => {
            const firebaseFriends = snapshot.val();
            if (firebaseFriends && Array.isArray(firebaseFriends)) {
                if (callback) callback(firebaseFriends);
            } else {
                if (callback) callback([]);
            }
        }, (error) => {
            console.error('❌ Firebase arkadaş yükleme hatası (userId):', error);
            if (callback) callback([]);
        });
    } catch (error) {
        console.error('❌ Firebase arkadaş yükleme hatası (catch, userId):', error);
        if (callback) callback([]);
    }
}

function rejectFriendRequest(requestId) {
    if (!currentUser) return;
    
    const requests = getFriendRequests();
    const updatedRequests = requests.filter(r => r.id !== requestId);
    localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));
    
    // Firebase'e kaydet
    saveFriendRequestsToFirebase(updatedRequests);
    
    loadFriendRequests();
}

function getFriends() {
    if (!currentUser) return [];
    const friendsKey = `friends_${currentUser.id}`;
    const friends = localStorage.getItem(friendsKey);
    return friends ? JSON.parse(friends) : [];
}

function saveFriends(friends) {
    if (!currentUser) return;
    const friendsKey = `friends_${currentUser.id}`;
    localStorage.setItem(friendsKey, JSON.stringify(friends));
}

function getFriendsByUserId(userId) {
    const friendsKey = `friends_${userId}`;
    const friends = localStorage.getItem(friendsKey);
    return friends ? JSON.parse(friends) : [];
}

function saveFriendsByUserId(userId, friends) {
    const friendsKey = `friends_${userId}`;
    localStorage.setItem(friendsKey, JSON.stringify(friends));
    // Firebase'e de kaydet
    saveFriendsToFirebaseByUserId(userId, friends);
}

function getProfilePhotoByUserId(userId) {
    const photoKey = `profilePhoto_${userId}`;
    return localStorage.getItem(photoKey);
}

// Firebase'e arkadaşları kaydet
function saveFriendsToFirebase(friends) {
    if (!currentUser || !useFirebase || !database) return;
    
    try {
        const friendsKey = `friends_${currentUser.id}`;
        database.ref('friends').child(friendsKey).set(friends, (error) => {
            if (error) {
                console.error('❌ Firebase arkadaş kayıt hatası:', error);
            } else {
                console.log('✅ Arkadaşlar Firebase\'e kaydedildi:', friends.length, 'arkadaş');
            }
        });
    } catch (error) {
        console.error('❌ Firebase arkadaş kayıt hatası (catch):', error);
    }
}

// Belirli bir kullanıcının arkadaşlarını Firebase'e kaydet
function saveFriendsToFirebaseByUserId(userId, friends) {
    if (!useFirebase || !database) return;
    
    try {
        const friendsKey = `friends_${userId}`;
        database.ref('friends').child(friendsKey).set(friends, (error) => {
            if (error) {
                console.error('❌ Firebase arkadaş kayıt hatası (userId):', error);
            } else {
                console.log('✅ Kullanıcı arkadaşları Firebase\'e kaydedildi:', userId, friends.length, 'arkadaş');
            }
        });
    } catch (error) {
        console.error('❌ Firebase arkadaş kayıt hatası (catch, userId):', error);
    }
}

// Firebase'den arkadaşları yükle
function loadFriendsFromFirebase(callback) {
    if (!currentUser || !useFirebase || !database) {
        if (callback) callback([]);
        return;
    }
    
    try {
        const friendsKey = `friends_${currentUser.id}`;
        database.ref('friends').child(friendsKey).once('value', (snapshot) => {
            const firebaseFriends = snapshot.val();
            if (firebaseFriends && Array.isArray(firebaseFriends)) {
                console.log('✅ Firebase\'den arkadaşlar yüklendi:', firebaseFriends.length, 'arkadaş');
                if (callback) callback(firebaseFriends);
            } else {
                if (callback) callback([]);
            }
        }, (error) => {
            console.error('❌ Firebase arkadaş yükleme hatası:', error);
            if (callback) callback([]);
        });
    } catch (error) {
        console.error('❌ Firebase arkadaş yükleme hatası (catch):', error);
        if (callback) callback([]);
    }
}

// Arkadaşları senkronize et (localStorage + Firebase)
function syncFriends() {
    if (!currentUser) return;
    
    loadFriendsFromFirebase((firebaseFriends) => {
        const localFriends = getFriends();
        
        // Arkadaşları birleştir (id'ye göre benzersiz)
        const friendsMap = new Map();
        
        // Önce local arkadaşları ekle
        if (Array.isArray(localFriends)) {
            localFriends.forEach(friend => {
                if (friend && friend.id) {
                    friendsMap.set(friend.id, friend);
                }
            });
        }
        
        // Sonra Firebase arkadaşlarını ekle
        if (firebaseFriends && Array.isArray(firebaseFriends)) {
            firebaseFriends.forEach(friend => {
                if (friend && friend.id) {
                    friendsMap.set(friend.id, friend);
                }
            });
        }
        
        const mergedFriends = Array.from(friendsMap.values());
        
        // localStorage'ı güncelle
        saveFriends(mergedFriends);
        
        // Firebase'e kaydet (eğer değişiklik varsa)
        if (JSON.stringify(localFriends) !== JSON.stringify(mergedFriends)) {
            saveFriendsToFirebase(mergedFriends);
        }
        
        // UI'ı güncelle
        displayFriends(mergedFriends);
    });
}

function displayFriends(friends) {
    if (!currentUser) return;
    
    const container = document.getElementById('friendsList');
    if (!container) return;
    
    if (friends.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">Henüz arkadaşınız yok. Arkadaş eklemek için yukarıdaki arama kutusunu kullanın.</p>';
        return;
    }
    
    let html = '';
    friends.forEach(friend => {
        const userData = getUserDataById(friend.id);
        html += `
            <div class="friend-item">
                <div class="friend-photo">
                    ${friend.photo ? `<img src="${friend.photo}" alt="${friend.name}">` : '<div class="friend-photo-placeholder">👤</div>'}
                </div>
                <div class="friend-info">
                    <strong>${friend.name}</strong>
                    <div style="font-size: 0.85rem; color: #666;">${friend.email}</div>
                    ${userData ? `<div style="font-size: 0.8rem; color: #999; margin-top: 5px;">Puan: ${userData.points || 0} | Level: ${userData.userLevel || 1}</div>` : ''}
                </div>
                <div class="friend-actions">
                    <button class="btn-secondary" onclick="viewFriendProfile('${friend.id}')">Profil</button>
                    <button class="btn-secondary" onclick="removeFriend('${friend.id}')">Kaldır</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function getUserDataById(userId) {
    const userDataKey = `userData_${userId}`;
    const data = localStorage.getItem(userDataKey);
    return data ? JSON.parse(data) : null;
}

function viewFriendProfile(friendId) {
    const users = getUsers();
    const friend = users.find(u => u.id === friendId);
    if (!friend) return;
    
    const userData = getUserDataById(friendId);
    const friendPhoto = getProfilePhotoByUserId(friendId);
    const friendNotes = getProfileNotes().filter(n => n.userId === friendId).slice(0, 5);
    
    const modal = document.createElement('div');
    modal.className = 'user-details-modal active';
    modal.id = 'friendProfileModal';
    
    modal.innerHTML = `
        <div class="user-details-content" style="max-width: 700px;">
            <div class="user-details-header">
                <h3>${friend.name} - Profil</h3>
                <button class="close-modal" onclick="closeFriendProfile()">×</button>
            </div>
            <div class="friend-profile-content">
                <div class="friend-profile-photo">
                    ${friendPhoto ? `<img src="${friendPhoto}" alt="${friend.name}" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin: 0 auto; display: block;">` : '<div style="width: 150px; height: 150px; border-radius: 50%; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 3rem; margin: 0 auto;">👤</div>'}
                </div>
                <div class="friend-profile-info">
                    <p><strong>E-posta:</strong> ${friend.email}</p>
                    <p><strong>Telefon:</strong> ${friend.phone || '-'}</p>
                    ${userData ? `
                        <p><strong>Toplam Puan:</strong> ${userData.points || 0}</p>
                        <p><strong>Level:</strong> ${userData.userLevel || 1}</p>
                        <p><strong>Tamamlanan Antrenman:</strong> ${userData.completedDays || 0}</p>
                        <p><strong>Mevcut Seri:</strong> ${userData.currentStreak || 0} gün</p>
                    ` : ''}
                </div>
                ${friendNotes.length > 0 ? `
                    <div class="friend-notes-section">
                        <h4>Son Notlar</h4>
                        ${friendNotes.map(note => `
                            <div class="profile-note-item" style="margin-bottom: 15px;">
                                <div class="note-content">${note.note}</div>
                                <div style="font-size: 0.8rem; color: #999; margin-top: 5px;">
                                    ${new Date(note.timestamp).toLocaleDateString('tr-TR')}
                                    ${Array.isArray(note.likes) && note.likes.length > 0 ? ` • ❤️ ${note.likes.length}` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFriendProfile();
        }
    });
}

function removeFriend(friendId) {
    if (!confirm('Bu arkadaşı listeden kaldırmak istediğinizden emin misiniz?')) return;
    
    const friends = getFriends();
    const updatedFriends = friends.filter(f => f.id !== friendId);
    saveFriends(updatedFriends);
    
    loadFriends();
    alert('Arkadaş listeden kaldırıldı.');
}

function closeFriendProfile() {
    const modal = document.getElementById('friendProfileModal');
    if (modal) {
        modal.remove();
    }
}

// Theme Yönetimi
function setupTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    // Kaydedilmiş tema tercihini yükle
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedColors = JSON.parse(localStorage.getItem('customColors') || '{}');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.checked = true;
    }
    
    if (Object.keys(savedColors).length > 0) {
        applyCustomColors(savedColors);
    }
    
    themeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    });
}

// Renk Ayarları
function setupColorSettings() {
    const colorSettingsBtn = document.getElementById('colorSettingsBtn');
    const closeColorSettings = document.getElementById('closeColorSettings');
    const colorModal = document.getElementById('colorSettingsModal');
    const presetItems = document.querySelectorAll('.preset-item');
    const applyCustomBtn = document.getElementById('applyCustomColors');
    
    if (!colorSettingsBtn) return;
    
    colorSettingsBtn.addEventListener('click', () => {
        colorModal.style.display = 'flex';
    });
    
    if (closeColorSettings) {
        closeColorSettings.addEventListener('click', () => {
            colorModal.style.display = 'none';
        });
    }
    
    colorModal.addEventListener('click', (e) => {
        if (e.target === colorModal) {
            colorModal.style.display = 'none';
        }
    });
    
    // Preset renkler
    const colorPresets = {
        default: { primary: '#6366f1', secondary: '#8b5cf6' },
        ocean: { primary: '#0ea5e9', secondary: '#06b6d4' },
        sunset: { primary: '#f97316', secondary: '#ec4899' },
        forest: { primary: '#10b981', secondary: '#059669' },
        royal: { primary: '#8b5cf6', secondary: '#6366f1' },
        fire: { primary: '#ef4444', secondary: '#f97316' }
    };
    
    presetItems.forEach(item => {
        item.addEventListener('click', () => {
            const preset = item.getAttribute('data-preset');
            const colors = colorPresets[preset];
            if (colors) {
                applyCustomColors(colors);
                localStorage.setItem('customColors', JSON.stringify(colors));
                localStorage.setItem('colorPreset', preset);
            }
        });
    });
    
    if (applyCustomBtn) {
        applyCustomBtn.addEventListener('click', () => {
            const primaryColor = document.getElementById('primaryColorPicker').value;
            const secondaryColor = document.getElementById('secondaryColorPicker').value;
            const colors = { primary: primaryColor, secondary: secondaryColor };
            applyCustomColors(colors);
            localStorage.setItem('customColors', JSON.stringify(colors));
            localStorage.removeItem('colorPreset');
        });
    }
    
    // Kaydedilmiş preset'i yükle
    const savedPreset = localStorage.getItem('colorPreset');
    if (savedPreset && colorPresets[savedPreset]) {
        applyCustomColors(colorPresets[savedPreset]);
    }
}

function applyCustomColors(colors) {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', colors.primary);
    root.style.setProperty('--primary-dark', adjustBrightness(colors.primary, -20));
    root.style.setProperty('--primary-light', adjustBrightness(colors.primary, 20));
    root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`);
    root.style.setProperty('--secondary-color', colors.secondary);
    root.style.setProperty('--secondary-dark', adjustBrightness(colors.secondary, -20));
    root.style.setProperty('--secondary-light', adjustBrightness(colors.secondary, 20));
    root.style.setProperty('--secondary-gradient', `linear-gradient(135deg, ${colors.secondary} 0%, ${adjustBrightness(colors.secondary, 10)} 100%)`);
    root.style.setProperty('--shadow-glow', `0 0 20px ${hexToRgba(colors.primary, 0.3)}`);
}

function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Kalori Hesaplama Fonksiyonları
function calculateBMR(weight, height, age, gender) {
    // Mifflin-St Jeor Denklemi
    // BMR (Bazal Metabolizma Hızı) - Dinlenirken yakılan kalori
    if (gender === 'male' || gender === 'erkek') {
        return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
}

function calculateTDEE(bmr, activityLevel) {
    // TDEE (Total Daily Energy Expenditure) - Günlük toplam enerji harcaması
    const activityMultipliers = {
        sedentary: 1.2,      // Hareketsiz
        light: 1.375,        // Hafif aktif (haftada 1-3 gün)
        moderate: 1.55,      // Orta aktif (haftada 3-5 gün)
        active: 1.725,       // Aktif (haftada 6-7 gün)
        veryActive: 1.9      // Çok aktif (günde 2 kez antrenman)
    };
    
    const multiplier = activityMultipliers[activityLevel] || activityMultipliers.moderate;
    return Math.round(bmr * multiplier);
}

function calculateDailyCalories(weight, height, age, gender, goal, activityLevel) {
    const bmr = calculateBMR(weight, height, age, gender);
    const tdee = calculateTDEE(bmr, activityLevel);
    
    // Hedefe göre kalori ayarlaması
    let targetCalories = tdee;
    if (goal === 'muscle') {
        // Kas geliştirme: +300-500 kalori fazlası
        targetCalories = tdee + 400;
    } else if (goal === 'fatburn') {
        // Yağ yakma: -500 kalori açığı
        targetCalories = tdee - 500;
    } else if (goal === 'strength') {
        // Güç kazanma: +200-300 kalori fazlası
        targetCalories = tdee + 250;
    }
    
    return {
        bmr: Math.round(bmr),
        tdee: tdee,
        targetCalories: Math.round(targetCalories),
        protein: Math.round(targetCalories * 0.3 / 4), // %30 protein, 1g = 4 kalori
        carbs: Math.round(targetCalories * 0.45 / 4),  // %45 karbonhidrat
        fat: Math.round(targetCalories * 0.25 / 9)      // %25 yağ, 1g = 9 kalori
    };
}

// Bildirim Sistemi
let notificationInterval = null;
const motivationalMessages = [
    { message: '💪 Bugün antrenman yapmayı unutma! Güçlü kal!', type: 'workout' },
    { message: '🔥 Hedefine ulaşmak için her gün küçük adımlar at!', type: 'motivation' },
    { message: '🏋️ Güç, disiplinle gelir. Devam et!', type: 'motivation' },
    { message: '💧 Su içmeyi unutma! Günde en az 2-3 litre su iç.', type: 'health' },
    { message: '🥗 Dengeli beslenme, antrenmanın yarısıdır!', type: 'nutrition' },
    { message: '😴 Uykunu al! İyi bir gece uykusu performansı artırır.', type: 'health' },
    { message: '⚡ Dinlenme günleri de önemli! Vücudunu dinle.', type: 'rest' },
    { message: '🎯 Bugünkü antrenmanını tamamladın mı?', type: 'workout' },
    { message: '🌟 Her antrenman seni hedefe bir adım daha yaklaştırır!', type: 'motivation' },
    { message: '💪 Kasların büyümesi için protein alımına dikkat et!', type: 'nutrition' },
    { message: '🔥 Seri devam ediyor mu? Güzel bir seri yakala!', type: 'motivation' },
    { message: '🏆 Top list\'te yükselmek için devam et!', type: 'motivation' },
    { message: '💎 Level atlamak için bir antrenman daha yap!', type: 'progress' },
    { message: '🌱 Sağlıklı atıştırmalıklar tercih et!', type: 'nutrition' },
    { message: '⚖️ Günlük kalori hedefini takip et!', type: 'nutrition' },
    { message: '🔋 Vücudunu dinle, aşırı yorgunsan dinlen!', type: 'health' },
    { message: '🎊 Rozet kazanmak için antrenman yapmayı unutma!', type: 'progress' },
    { message: '💪 Güçlü olmak istiyorsan, düzenli antrenman şart!', type: 'workout' }
];

function showNotification(message, type = 'info') {
    const notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Otomatik kapanma (5 saniye)
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
    
    // Animasyon ile göster
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out';
    }, 10);
}

function startNotificationSystem() {
    // İlk bildirimi hemen göster
    setTimeout(() => {
        if (currentUser && userData.age && userData.weight && userData.height) {
            const calories = calculateDailyCalories(
                userData.weight,
                userData.height,
                userData.age,
                userData.gender || 'male',
                userData.goal || 'muscle',
                userData.activityLevel || 'moderate'
            );
            showNotification(`🔥 Günlük kalori hedefin: ${calories.targetCalories} kcal | Protein: ${calories.protein}g | Karbonhidrat: ${calories.carbs}g`, 'nutrition');
        } else {
            const randomMsg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
            showNotification(randomMsg.message, randomMsg.type);
        }
    }, 3000);
    
    // Her 2-3 dakikada bir bildirim göster (rastgele 120-180 saniye arası)
    notificationInterval = setInterval(() => {
        if (!currentUser) return;
        
        // Rastgele mesaj seç
        const randomMsg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        
        // Kullanıcı verileri varsa kalori bilgisi ekle
        if (userData.age && userData.weight && userData.height && Math.random() > 0.5) {
            const calories = calculateDailyCalories(
                userData.weight,
                userData.height,
                userData.age,
                userData.gender || 'male',
                userData.goal || 'muscle',
                userData.activityLevel || 'moderate'
            );
            
            const calorieMessages = [
                `⚖️ Günlük kalori hedefin: ${calories.targetCalories} kcal`,
                `🥗 Bugün ${calories.protein}g protein almayı unutma!`,
                `💪 BMR: ${calories.bmr} kcal | TDEE: ${calories.tdee} kcal`,
                `🔥 Günlük hedef: ${calories.targetCalories} kcal (Yağ: ${calories.fat}g)`
            ];
            
            const calorieMsg = calorieMessages[Math.floor(Math.random() * calorieMessages.length)];
            showNotification(calorieMsg, 'nutrition');
        } else {
            showNotification(randomMsg.message, randomMsg.type);
        }
    }, 120000 + Math.random() * 60000); // 120-180 saniye arası rastgele
}

function stopNotificationSystem() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
}

// Firebase Test Fonksiyonu
function testFirebaseWrite() {
    if (!currentUser) {
        alert('Önce giriş yapın!');
        return;
    }
    
    if (!useFirebase || !database) {
        alert('Firebase bağlantısı yok!');
        console.error('Firebase durumu:', { useFirebase, hasDatabase: !!database });
        return;
    }
    
    console.log('🧪 Firebase yazma testi başlatılıyor...');
    
    // Test verisi
    const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Bu bir test verisidir'
    };
    
    // Test yazma
    database.ref('test/writeTest').set(testData, (error) => {
        if (error) {
            console.error('❌ Test yazma başarısız!', error);
            alert('❌ Firebase\'e yazılamadı!\n\nHata: ' + error.code + ' - ' + error.message + '\n\nLütfen Firebase Console\'da Rules sekmesini kontrol edin!');
        } else {
            console.log('✅ Test yazma başarılı!');
            alert('✅ Firebase\'e yazma başarılı!\n\nŞimdi userData\'yı test ediyoruz...');
            
            // userData yazma testi
            if (userData && currentUser) {
                const dataToSave = {
                    test: true,
                    userName: currentUser.name,
                    userEmail: currentUser.email,
                    points: userData.points || 0,
                    timestamp: new Date().toISOString()
                };
                
                database.ref(`userData/${currentUser.id}`).set(dataToSave, (error) => {
                    if (error) {
                        console.error('❌ userData yazma başarısız!', error);
                        alert('❌ userData\'ya yazılamadı!\n\nHata: ' + error.code + ' - ' + error.message);
                    } else {
                        console.log('✅ userData yazma başarılı!');
                        alert('✅ userData\'ya yazma başarılı!\n\nFirebase Console\'da kontrol edin!');
                        
                        // Firebase Console'u aç
                        setTimeout(() => {
                            if (confirm('Firebase Console\'u açmak ister misiniz?')) {
                                window.open('https://console.firebase.google.com/project/performans-app-1075b/database/performans-app-1075b-default-rtdb/data', '_blank');
                            }
                        }, 500);
                    }
                });
            }
        }
    });
}

// Global fonksiyonlar (HTML'den çağrılabilmesi için)
window.showUserDetails = showUserDetails;
window.closeUserDetails = closeUserDetails;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.viewFriendProfile = viewFriendProfile;
window.removeFriend = removeFriend;
window.closeFriendProfile = closeFriendProfile;
window.closeFriendSearchResult = closeFriendSearchResult;
window.sendFriendRequestFromSearch = sendFriendRequestFromSearch;
window.likeProfileNote = likeProfileNote;
window.deleteProfileNote = deleteProfileNote;
window.showNotification = showNotification;
// Firebase test ve senkronize fonksiyonları window'dan kaldırıldı (artık kullanılmıyor)
// Otomatik senkronizasyon hala çalışıyor