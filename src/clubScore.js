'use strict';
const { EventEmitter } = require('events');

/*
 * Điểm của cảnh DJ Club, tính trong app chính (không tính trong trang overlay) để tải lại trang,
 * đổi cảnh hay mở nhiều màn hình phát vẫn giữ nguyên điểm và giống nhau ở mọi nơi.
 *
 * Mặc định (chỉnh trong tab quản trị):
 *   tim     1 điểm / tim, tối đa 60 tim được tính mỗi phút cho mỗi người (chặn tool bấm tim)
 *   quà     số xu × 100 × hệ số theo giá 1 món: 1–9 xu ×1, 10–99 ×1,1, 100–999 ×1,25, từ 1.000 ×1,5
 *   follow  +50 một lần mỗi phiên; share +20, tối đa 5 lần mỗi phiên; bình luận không tính
 * Điểm tính theo phiên live: sang phòng live khác thì về 0, mất kết nối rồi vào lại cùng phòng thì giữ.
 * Bằng điểm: ai đạt mức điểm đó trước đứng trên.
 */

const MINUTE = 60 * 1000;
const keyOf = (u) => String(u?.id || u?.uniqueId || u?.nickname || '');
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

function tierMultiplier(unitCoins) {
  if (unitCoins >= 1000) return 1.5;
  if (unitCoins >= 100) return 1.25;
  if (unitCoins >= 10) return 1.1;
  return 1;
}

class ClubScore extends EventEmitter {
  constructor(getOverlayCfg) {
    super();
    this.getCfg = getOverlayCfg;
    this.roomId = '';
    this.timer = null;
    this.reset();
  }

  reset() {
    this.users = new Map();
    this.seq = 0;
    this.session = Date.now();
    this.emitNow();
  }

  // Phòng live mới -> phiên mới. Kết nối lại cùng phòng -> giữ điểm.
  setRoom(roomId) {
    roomId = String(roomId || '');
    if (!roomId || roomId === this.roomId) return;
    this.roomId = roomId;
    this.reset();
  }

  user(u) {
    const key = keyOf(u);
    if (!key) return null;
    let r = this.users.get(key);
    if (!r) {
      r = {
        key, id: String(u?.id || ''), uniqueId: u?.uniqueId || '', nickname: u?.nickname || 'Ẩn danh',
        avatar: u?.avatar || '', points: 0, reachedAt: 0, likeWindow: 0, likeUsed: 0, followed: false, shares: 0
      };
      this.users.set(key, r);
    } else {
      if (u?.nickname) r.nickname = u.nickname;
      if (u?.avatar) r.avatar = u.avatar;
    }
    return r;
  }

  add(r, pts) {
    pts = Math.round(pts);
    if (!r || !(pts > 0)) return 0;
    r.points += pts;
    r.reachedAt = ++this.seq;
    this.schedule();
    return pts;
  }

  // Điểm của một món quà (dùng cả cho hiển thị thử)
  giftPoints(unitCoins, repeat) {
    const o = this.getCfg();
    const unit = Math.max(0, num(unitCoins));
    const n = Math.max(1, Math.round(num(repeat, 1)));
    if (unit <= 0) return n * 10 * num(o.clubPtsLike, 1); // quà miễn phí: như 10 tim
    return unit * n * num(o.clubPtsCoin, 100) * (o.clubGiftBonus ? tierMultiplier(unit) : 1);
  }

  onEvent(ev) {
    if (!ev || !ev.type) return;
    const o = this.getCfg();
    switch (ev.type) {
      case 'like': {
        const r = this.user(ev.user);
        if (!r) return;
        const now = Date.now();
        if (now - r.likeWindow >= MINUTE) { r.likeWindow = now; r.likeUsed = 0; }
        const cap = num(o.clubLikeCapMin, 60) > 0 ? num(o.clubLikeCapMin, 60) : Infinity;
        const n = Math.max(0, Math.min(Math.max(1, num(ev.count, 1)), cap - r.likeUsed));
        r.likeUsed += n;
        this.add(r, n * num(o.clubPtsLike, 1));
        return;
      }
      case 'gift': {
        const r = this.user(ev.user);
        if (r) this.add(r, this.giftPoints(ev.diamonds, ev.repeatCount));
        return;
      }
      case 'follow': {
        const r = this.user(ev.user);
        if (r && !r.followed) { r.followed = true; this.add(r, num(o.clubPtsFollow, 50)); }
        return;
      }
      case 'share': {
        const r = this.user(ev.user);
        if (r && r.shares < num(o.clubShareMax, 5)) { r.shares += 1; this.add(r, num(o.clubPtsShare, 20)); }
        return;
      }
      default:
    }
  }

  top(limit = 10) {
    return [...this.users.values()]
      .filter((r) => r.points > 0)
      .sort((a, b) => b.points - a.points || a.reachedAt - b.reachedAt)
      .slice(0, limit)
      .map((r) => ({ key: r.key, id: r.id, uniqueId: r.uniqueId, nickname: r.nickname, avatar: r.avatar, points: r.points }));
  }

  payload() {
    return { session: this.session, top: this.top(10), players: [...this.users.values()].filter((r) => r.points > 0).length };
  }

  schedule() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.emit('rank', this.payload()); }, 300);
  }

  emitNow() {
    clearTimeout(this.timer);
    this.timer = null;
    this.emit('rank', this.payload());
  }
}

module.exports = { ClubScore, tierMultiplier };
