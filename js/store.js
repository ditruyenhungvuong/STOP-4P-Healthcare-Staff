/*
 * Lưu trữ.
 * - Guest: KHÔNG ghi gì xuống thiết bị hay máy chủ; mọi thứ chỉ ở bộ nhớ phiên (mất khi đóng/tải lại trang).
 * - Member (bản demo): dữ liệu lưu cục bộ trên thiết bị này, khóa theo hash số điện thoại (không lưu số nguyên văn).
 *   Bản production cần thay bằng API /api/me/* phía server theo đặc tả mục 10.
 */
window.STOP4P_STORE = (() => {
  const PREFIX = 'stop4p_member_';
  const SESSION_KEY = 'stop4p_active_member';
  const SALT = 'stop4p-hv-demo-v1';

  function safeGet(storage, key) { try { return storage.getItem(key); } catch (e) { return null; } }
  function safeSet(storage, key, val) { try { storage.setItem(key, val); return true; } catch (e) { return false; } }
  function safeDel(storage, key) { try { storage.removeItem(key); } catch (e) { /* bỏ qua */ } }

  async function hashPhone(e164) {
    const data = new TextEncoder().encode(SALT + '|' + e164);
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', data);
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
    }
    let h = 2166136261; // FNV-1a dự phòng
    for (const b of data) { h ^= b; h = Math.imul(h, 16777619); }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  function normalizePhone(raw) {
    let d = String(raw || '').replace(/[^\d+]/g, '');
    if (d.startsWith('+84')) d = d.slice(3);
    else if (d.startsWith('84') && d.length === 11) d = d.slice(2);
    else if (d.startsWith('0')) d = d.slice(1);
    if (!/^[35789]\d{8}$/.test(d)) return null;
    return '+84' + d;
  }
  const maskPhone = e164 => e164 ? e164.slice(0, 4) + ' ••• ••' + e164.slice(-3) : '';

  const emptyAccount = masked => ({
    created_at: new Date().toISOString(), phone_masked: masked, privacy_version: '0.1',
    consents: [], profile: null, checkins: []
  });

  function load(key) {
    const raw = safeGet(localStorage, PREFIX + key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  const save = (key, acc) => safeSet(localStorage, PREFIX + key, JSON.stringify(acc));

  return {
    hashPhone, normalizePhone, maskPhone, load, save, emptyAccount,
    remove: key => safeDel(localStorage, PREFIX + key),
    setActive: key => safeSet(sessionStorage, SESSION_KEY, key),
    getActive: () => safeGet(sessionStorage, SESSION_KEY),
    clearActive: () => safeDel(sessionStorage, SESSION_KEY)
  };
})();
