// supabase-client.js
const SUPABASE_URL = 'https://bevqedqidrgmzpufvtmx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wVFdRIlgyM_HCTr6sw6Uzw_y_tZ2iep';

console.log('🔄 Loading Supabase client...');

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==============================================================
//  SupabaseDB - قاعدة بيانات عبر Supabase مع Realtime
//  الإصدار 2.1 - مع تحسين التزامن الفوري بين التبويبات والأجهزة
// ==============================================================

class SupabaseDB {
    constructor() {
        this.subscriptions = [];
        this.listeners = {};
        this.isConnected = false;
        this.cache = {
            services: [],
            staff: [],
            appointments: [],
            settings: {}
        };
        this._broadcastChannel = null;
        this._initPromise = null;
    }

    async init() {
        if (this._initPromise) return this._initPromise;
        
        this._initPromise = (async () => {
            try {
                await this.loadAllData();
                this.setupRealtime();
                this.setupBroadcastListener();
                this.isConnected = true;
                console.log('✅ Supabase connected successfully');
                return true;
            } catch (e) {
                console.error('❌ Supabase init error:', e);
                this.isConnected = false;
                return false;
            }
        })();
        
        return this._initPromise;
    }

    async loadAllData() {
        try {
            const [services, staff, appointments, settings] = await Promise.all([
                this.getServices(),
                this.getStaff(),
                this.getAppointments(),
                this.getSettings()
            ]);
            
            this.cache.services = services || [];
            this.cache.staff = staff || [];
            this.cache.appointments = appointments || [];
            this.cache.settings = settings || {};
            
            console.log('📦 Data loaded:', {
                services: this.cache.services.length,
                staff: this.cache.staff.length,
                appointments: this.cache.appointments.length
            });
            
            return this.cache;
        } catch (e) {
            console.error('Error loading all data:', e);
            if (!this.cache.services.length) {
                this.cache = this.getDefaultData();
            }
            return this.cache;
        }
    }

    // ===== تحميل جدول محدد =====
    async loadTable(table) {
        try {
            switch(table) {
                case 'services':
                    this.cache.services = await this.getServices();
                    break;
                case 'staff':
                    this.cache.staff = await this.getStaff();
                    break;
                case 'appointments':
                    this.cache.appointments = await this.getAppointments();
                    break;
                case 'settings':
                    this.cache.settings = await this.getSettings();
                    break;
                default:
                    await this.loadAllData();
            }
            console.log(`📦 Table "${table}" reloaded`);
        } catch (e) {
            console.error('Error loading table:', table, e);
        }
    }

    // ===== SERVICES =====
    async getServices() {
        try {
            console.log('🔄 Fetching services...');
            const { data, error } = await supabaseClient
                .from('services')
                .select('*')
                .order('category');
            if (error) throw error;
            console.log('✅ Services fetched:', data?.length || 0);
            return data || [];
        } catch (e) {
            console.error('Error getting services:', e);
            return this.cache.services || [];
        }
    }

    async addService(service) {
        try {
            const { data, error } = await supabaseClient
                .from('services')
                .insert(service)
                .select()
                .single();
            if (error) throw error;
            this.cache.services.push(data);
            this.broadcastUpdate('services');
            return data;
        } catch (e) {
            console.error('Error adding service:', e);
            throw e;
        }
    }

    async updateService(id, updates) {
        try {
            const { data, error } = await supabaseClient
                .from('services')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            const index = this.cache.services.findIndex(s => s.id === id);
            if (index !== -1) this.cache.services[index] = data;
            this.broadcastUpdate('services');
            return data;
        } catch (e) {
            console.error('Error updating service:', e);
            throw e;
        }
    }

    async deleteService(id) {
        try {
            const { error } = await supabaseClient
                .from('services')
                .delete()
                .eq('id', id);
            if (error) throw error;
            this.cache.services = this.cache.services.filter(s => s.id !== id);
            this.broadcastUpdate('services');
            return true;
        } catch (e) {
            console.error('Error deleting service:', e);
            throw e;
        }
    }

    // ===== STAFF =====
    async getStaff() {
        try {
            console.log('🔄 Fetching staff...');
            const { data, error } = await supabaseClient
                .from('staff')
                .select('*')
                .order('name_ar');
            if (error) throw error;
            console.log('✅ Staff fetched:', data?.length || 0);
            return data || [];
        } catch (e) {
            console.error('Error getting staff:', e);
            return this.cache.staff || [];
        }
    }

    async addStaff(staff) {
        try {
            const { data, error } = await supabaseClient
                .from('staff')
                .insert(staff)
                .select()
                .single();
            if (error) throw error;
            this.cache.staff.push(data);
            this.broadcastUpdate('staff');
            return data;
        } catch (e) {
            console.error('Error adding staff:', e);
            throw e;
        }
    }

    async updateStaff(id, updates) {
        try {
            const { data, error } = await supabaseClient
                .from('staff')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            const index = this.cache.staff.findIndex(s => s.id === id);
            if (index !== -1) this.cache.staff[index] = data;
            this.broadcastUpdate('staff');
            return data;
        } catch (e) {
            console.error('Error updating staff:', e);
            throw e;
        }
    }

    async deleteStaff(id) {
        try {
            const { error } = await supabaseClient
                .from('staff')
                .delete()
                .eq('id', id);
            if (error) throw error;
            this.cache.staff = this.cache.staff.filter(s => s.id !== id);
            this.broadcastUpdate('staff');
            return true;
        } catch (e) {
            console.error('Error deleting staff:', e);
            throw e;
        }
    }

    // ===== APPOINTMENTS =====
    async getAppointments() {
        try {
            const { data, error } = await supabaseClient
                .from('appointments')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Error getting appointments:', e);
            return this.cache.appointments || [];
        }
    }

    async getAppointmentsByDate(date) {
        try {
            const { data, error } = await supabaseClient
                .from('appointments')
                .select('*')
                .eq('date', date)
                .order('queue_number', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Error getting appointments by date:', e);
            return this.cache.appointments.filter(a => a.date === date) || [];
        }
    }

    async getAppointmentsByUser(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('appointments')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Error getting appointments by user:', e);
            return this.cache.appointments.filter(a => a.user_id === userId) || [];
        }
    }

    async addAppointment(appointment) {
        try {
            const { data, error } = await supabaseClient
                .from('appointments')
                .insert(appointment)
                .select()
                .single();
            if (error) throw error;
            this.cache.appointments.unshift(data);
            this.broadcastUpdate('appointments');
            return data;
        } catch (e) {
            console.error('Error adding appointment:', e);
            throw e;
        }
    }

    async updateAppointment(id, updates) {
        try {
            const { data, error } = await supabaseClient
                .from('appointments')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            const index = this.cache.appointments.findIndex(a => a.id === id);
            if (index !== -1) this.cache.appointments[index] = data;
            this.broadcastUpdate('appointments');
            return data;
        } catch (e) {
            console.error('Error updating appointment:', e);
            throw e;
        }
    }

    async deleteAppointment(id) {
        try {
            const { error } = await supabaseClient
                .from('appointments')
                .delete()
                .eq('id', id);
            if (error) throw error;
            this.cache.appointments = this.cache.appointments.filter(a => a.id !== id);
            this.broadcastUpdate('appointments');
            return true;
        } catch (e) {
            console.error('Error deleting appointment:', e);
            throw e;
        }
    }

    async getNextQueueNumber(date) {
        try {
            const { data, error } = await supabaseClient
                .from('appointments')
                .select('queue_number')
                .eq('date', date)
                .order('queue_number', { ascending: false })
                .limit(1);
            if (error) throw error;
            return (data && data.length > 0) ? data[0].queue_number + 1 : 1;
        } catch (e) {
            console.error('Error getting next queue number:', e);
            const appointments = this.cache.appointments.filter(a => a.date === date);
            let maxNum = 0;
            appointments.forEach(a => {
                if (a.queue_number && a.queue_number > maxNum) maxNum = a.queue_number;
            });
            return maxNum + 1;
        }
    }

    // ===== SETTINGS =====
    async getSettings() {
        try {
            const { data, error } = await supabaseClient
                .from('settings')
                .select('*');
            if (error) throw error;
            const settings = {};
            data.forEach(item => {
                settings[item.key] = item.value;
            });
            return settings;
        } catch (e) {
            console.error('Error getting settings:', e);
            return this.cache.settings || { workStart: '09:00', workEnd: '22:00' };
        }
    }

    async updateSettings(settings) {
        try {
            const updates = Object.entries(settings).map(([key, value]) => ({
                key,
                value
            }));
            const { error } = await supabaseClient
                .from('settings')
                .upsert(updates, { onConflict: 'key' });
            if (error) throw error;
            this.cache.settings = { ...this.cache.settings, ...settings };
            this.broadcastUpdate('settings');
            return true;
        } catch (e) {
            console.error('Error updating settings:', e);
            throw e;
        }
    }

    // ===== REALTIME =====
    setupRealtime() {
        try {
            this.subscriptions.forEach(channel => {
                supabaseClient.removeChannel(channel);
            });
            this.subscriptions = [];

            const appointmentsChannel = supabaseClient
                .channel('appointments_changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'appointments' },
                    (payload) => this.handleRealtimeUpdate('appointments', payload)
                )
                .subscribe((status) => {
                    console.log('📡 Appointments channel:', status);
                });

            const servicesChannel = supabaseClient
                .channel('services_changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'services' },
                    (payload) => this.handleRealtimeUpdate('services', payload)
                )
                .subscribe((status) => {
                    console.log('📡 Services channel:', status);
                });

            const staffChannel = supabaseClient
                .channel('staff_changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'staff' },
                    (payload) => this.handleRealtimeUpdate('staff', payload)
                )
                .subscribe((status) => {
                    console.log('📡 Staff channel:', status);
                });

            const settingsChannel = supabaseClient
                .channel('settings_changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'settings' },
                    (payload) => this.handleRealtimeUpdate('settings', payload)
                )
                .subscribe((status) => {
                    console.log('📡 Settings channel:', status);
                });

            this.subscriptions = [appointmentsChannel, servicesChannel, staffChannel, settingsChannel];
        } catch (e) {
            console.error('Error setting up realtime:', e);
        }
    }

    // ===== معالجة تحديث Realtime مع بث للتبويبات الأخرى =====
    handleRealtimeUpdate(table, payload) {
        console.log(`🔄 Realtime update on ${table}:`, payload.eventType);
        
        try {
            if (table === 'appointments') {
                if (payload.eventType === 'INSERT') {
                    const exists = this.cache.appointments.some(a => a.id === payload.new.id);
                    if (!exists) this.cache.appointments.unshift(payload.new);
                } else if (payload.eventType === 'UPDATE') {
                    const index = this.cache.appointments.findIndex(a => a.id === payload.new.id);
                    if (index !== -1) {
                        this.cache.appointments[index] = payload.new;
                    } else {
                        this.cache.appointments.unshift(payload.new);
                    }
                } else if (payload.eventType === 'DELETE') {
                    this.cache.appointments = this.cache.appointments.filter(a => a.id !== payload.old.id);
                }
            } else if (table === 'services') {
                if (payload.eventType === 'INSERT') {
                    const exists = this.cache.services.some(s => s.id === payload.new.id);
                    if (!exists) this.cache.services.push(payload.new);
                } else if (payload.eventType === 'UPDATE') {
                    const index = this.cache.services.findIndex(s => s.id === payload.new.id);
                    if (index !== -1) {
                        this.cache.services[index] = payload.new;
                    } else {
                        this.cache.services.push(payload.new);
                    }
                } else if (payload.eventType === 'DELETE') {
                    this.cache.services = this.cache.services.filter(s => s.id !== payload.old.id);
                }
            } else if (table === 'staff') {
                if (payload.eventType === 'INSERT') {
                    const exists = this.cache.staff.some(s => s.id === payload.new.id);
                    if (!exists) this.cache.staff.push(payload.new);
                } else if (payload.eventType === 'UPDATE') {
                    const index = this.cache.staff.findIndex(s => s.id === payload.new.id);
                    if (index !== -1) {
                        this.cache.staff[index] = payload.new;
                    } else {
                        this.cache.staff.push(payload.new);
                    }
                } else if (payload.eventType === 'DELETE') {
                    this.cache.staff = this.cache.staff.filter(s => s.id !== payload.old.id);
                }
            } else if (table === 'settings') {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    this.cache.settings[payload.new.key] = payload.new.value;
                } else if (payload.eventType === 'DELETE') {
                    delete this.cache.settings[payload.old.key];
                }
            }

            // بث التحديث للتبويبات الأخرى مع اسم الجدول
            this.broadcastUpdate(table);

            // تشغيل المستمعين المسجلين لهذا الجدول
            if (this.listeners[table]) {
                this.listeners[table].forEach(cb => {
                    try { cb(payload, this.cache[table]); } catch (e) {}
                });
            }
            // تشغيل المستمعين العامين
            if (this.listeners['*']) {
                this.listeners['*'].forEach(cb => {
                    try { cb(table, payload, this.cache); } catch (e) {}
                });
            }

        } catch (e) {
            console.error('Error handling realtime update:', e);
        }
    }

    on(table, callback) {
        if (!this.listeners[table]) {
            this.listeners[table] = [];
        }
        this.listeners[table].push(callback);
        return () => {
            this.listeners[table] = this.listeners[table].filter(cb => cb !== callback);
        };
    }

    // ===== BROADCAST CHANNEL (للتزامن بين التبويبات) =====
    broadcastUpdate(tableName) {
        try {
            if (this._broadcastChannel) {
                this._broadcastChannel.postMessage({
                    type: 'DATA_UPDATED',
                    table: tableName,
                    timestamp: new Date().toISOString()
                });
                console.log(`📢 Broadcast update sent for table: ${tableName}`);
            }
        } catch (e) {
            // غير مدعوم في بعض المتصفحات
        }
    }

    setupBroadcastListener() {
        try {
            if (this._broadcastChannel) {
                this._broadcastChannel.close();
            }
            this._broadcastChannel = new BroadcastChannel('saloni_updates');
            this._broadcastChannel.onmessage = async (event) => {
                if (event.data.type === 'DATA_UPDATED') {
                    const table = event.data.table;
                    console.log(`📢 Update received from another tab: ${table}`);
                    // إعادة تحميل الجدول المحدث
                    await this.loadTable(table);
                    // تشغيل المستمعين المسجلين لهذا الجدول
                    if (this.listeners[table]) {
                        this.listeners[table].forEach(cb => {
                            try { cb(null, this.cache[table]); } catch (e) {}
                        });
                    }
                    // تشغيل المستمعين العامين
                    if (this.listeners['*']) {
                        this.listeners['*'].forEach(cb => {
                            try { cb(table, null, this.cache); } catch (e) {}
                        });
                    }
                }
            };
            console.log('📡 BroadcastChannel listener ready');
        } catch (e) {
            console.log('BroadcastChannel not supported');
        }
    }

    unsubscribeAll() {
        this.subscriptions.forEach(channel => {
            supabaseClient.removeChannel(channel);
        });
        this.subscriptions = [];
        if (this._broadcastChannel) {
            this._broadcastChannel.close();
            this._broadcastChannel = null;
        }
        this.listeners = {};
    }

    getCache() {
        return this.cache;
    }

    getDefaultData() {
        return {
            services: [
                { id: 's1', name_ar: 'حلاقة شعر', name_en: 'Haircut', name_ur: 'بال کٹوانا', price: 25,
                    category: 'حلاقة', active: true },
                { id: 's2', name_ar: 'حلاقة دقن', name_en: 'Beard Trim', name_ur: 'داڑھی تراشنا', price: 10,
                    category: 'حلاقة', active: true },
                { id: 's3', name_ar: 'صبغة شعر', name_en: 'Hair Dye', name_ur: 'بالوں کا رنگ', price: 35,
                    category: 'صبغة', active: true },
                { id: 's4', name_ar: 'حمام زيت', name_en: 'Oil Bath', name_ur: 'تیل حمام', price: 25,
                    category: 'عناية', active: true },
                { id: 's5', name_ar: 'تجهيز العريس', name_en: 'Groom Package', name_ur: 'دولہا پیکج', price: 115,
                    category: 'مناسبات', active: true }
            ],
            staff: [
                { id: 'st1', name_ar: 'أحمد', name_en: 'Ahmed', name_ur: 'احمد', active: true },
                { id: 'st2', name_ar: 'سعيد', name_en: 'Saeed', name_ur: 'سعید', active: true },
                { id: 'st3', name_ar: 'خالد', name_en: 'Khalid', name_ur: 'خالد', active: true },
                { id: 'st4', name_ar: 'محمد', name_en: 'Mohammed', name_ur: 'محمد', active: true }
            ],
            appointments: [],
            settings: { workStart: '09:00', workEnd: '22:00' },
            updatedAt: new Date().toISOString()
        };
    }
}

const db = new SupabaseDB();
window.db = db;

console.log('✅ Supabase client loaded successfully');
console.log('🔑 db available:', typeof db);

// اختبار الاتصال التلقائي
(async function testConnection() {
    try {
        const connected = await db.init();
        if (connected) {
            console.log('✅ Initial connection test passed');
        } else {
            console.warn('⚠️ Initial connection test failed');
        }
    } catch (e) {
        console.error('❌ Connection test error:', e);
    }
})();
