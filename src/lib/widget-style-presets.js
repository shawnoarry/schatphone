export const OFFICIAL_WIDGET_STYLE_PRESETS = Object.freeze([
  {
    id: 'polaroid_stack',
    size: '2x2',
    preview: 'polaroid',
    icon: 'fas fa-camera-retro',
    nameZh: '拍立得叠影',
    nameEn: 'Polaroid Stack',
    code: `<style>
.sp-polaroid{width:100%;height:100%;box-sizing:border-box;padding:13px;border-radius:22px;background:linear-gradient(145deg,#f7f3ed,#d7dce0);position:relative;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#2a2e32}
.sp-polaroid span{position:absolute;border-radius:14px;background:#fff;box-shadow:0 10px 22px rgba(41,47,54,.16)}
.sp-polaroid span:nth-child(1){inset:23px 39px 38px 22px;transform:rotate(-8deg);background:linear-gradient(#fff 0 68%,#eee2d4 68% 100%)}
.sp-polaroid span:nth-child(2){inset:28px 24px 30px 44px;transform:rotate(7deg);background:linear-gradient(#fff 0 68%,#dfe6ea 68% 100%)}
.sp-polaroid strong{position:absolute;left:18px;bottom:16px;font-size:13px;letter-spacing:0}
</style><div class="sp-polaroid"><span></span><span></span><strong>{{text:caption}}</strong></div>`,
  },
  {
    id: 'glass_orb',
    size: '2x2',
    preview: 'orb',
    icon: 'fas fa-circle-notch',
    nameZh: '心情玻璃球',
    nameEn: 'Mood Glass Orb',
    code: `<style>
.sp-orb{width:100%;height:100%;display:grid;place-items:center;border-radius:24px;background:radial-gradient(circle at 48% 40%,rgba(255,255,255,.35),rgba(168,183,190,.12) 42%,rgba(66,78,86,.42));overflow:hidden}
.sp-orb div{width:70%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 32% 22%,rgba(255,255,255,.88),rgba(255,255,255,.22) 24%,rgba(129,148,156,.3) 55%,rgba(44,52,60,.32));border:1px solid rgba(255,255,255,.52);box-shadow:inset 0 0 28px rgba(255,255,255,.34),0 18px 32px rgba(23,31,39,.2);display:grid;place-items:center;color:#fff;font:800 18px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
</style><div class="sp-orb"><div>{{text:mood}}</div></div>`,
  },
  {
    id: 'island_strip',
    size: '4x1',
    preview: 'island',
    icon: 'fas fa-wave-square',
    nameZh: '灵动横条',
    nameEn: 'Island Strip',
    code: `<style>
.sp-island{width:100%;height:100%;box-sizing:border-box;padding:10px 14px;border-radius:999px;background:linear-gradient(135deg,rgba(39,45,52,.92),rgba(97,111,112,.82));color:#fff;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}
.sp-island i{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.16);font-style:normal}.sp-island strong{font-size:14px}.sp-island small{display:block;font-size:10px;opacity:.7}
</style><div class="sp-island"><i>*</i><span><strong>{{text:title}}</strong><small>{{text:subtitle}}</small></span><b>ON</b></div>`,
  },
  {
    id: 'idol_pass',
    size: '2x2',
    preview: 'pass',
    icon: 'fas fa-id-badge',
    nameZh: '小卡出入证',
    nameEn: 'Idol Pass',
    code: `<style>
.sp-pass{width:100%;height:100%;box-sizing:border-box;padding:13px;border-radius:22px;background:linear-gradient(150deg,#f4edf1,#c8d1d8);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#30343a;display:grid;grid-template-rows:1fr auto;gap:10px}
.sp-pass .photo{border-radius:17px;background:linear-gradient(135deg,#f8d9df,#869aa5);box-shadow:inset 0 0 0 1px rgba(255,255,255,.42)}
.sp-pass strong{font-size:15px}.sp-pass small{display:block;color:#69727a;font-size:10px;font-weight:800;letter-spacing:.08em}
</style><div class="sp-pass"><div class="photo" data-cw-image="photo"></div><div><strong>{{text:name}}</strong><small>ACCESS CARD</small></div></div>`,
  },
  {
    id: 'live_panel',
    size: '4x2',
    preview: 'live',
    icon: 'fas fa-heart-pulse',
    nameZh: '粉色直播面板',
    nameEn: 'Pink Live Panel',
    code: `<style>
.sp-live{width:100%;height:100%;box-sizing:border-box;padding:15px;border-radius:24px;background:linear-gradient(135deg,#ffe8ef,#d6cad2);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#5f3a47;display:grid;grid-template-columns:1fr 1.2fr;gap:12px;overflow:hidden}
.sp-live .badge{border-radius:20px;background:rgba(255,255,255,.48);display:grid;place-items:center;font-size:34px;box-shadow:inset 0 1px 0 rgba(255,255,255,.72)}
.sp-live strong{display:block;font-size:18px}.sp-live small{display:block;margin-top:4px;color:#8f6672;font-size:11px;font-weight:800}.sp-live p{margin:13px 0 0;font-size:12px;line-height:1.35}
</style><div class="sp-live"><div class="badge">♥</div><div><strong>{{text:title}}</strong><small>LIVE ROOM</small><p>{{text:note}}</p></div></div>`,
  },
  {
    id: 'magazine_cover',
    size: '4x4',
    preview: 'magazine',
    icon: 'fas fa-newspaper',
    nameZh: '杂志封面',
    nameEn: 'Magazine Cover',
    code: `<style>
.sp-cover{width:100%;height:100%;box-sizing:border-box;padding:18px;border-radius:28px;background:linear-gradient(145deg,#efede8,#9facb0);position:relative;overflow:hidden;font-family:Georgia,"Times New Roman",serif;color:#24282d}
.sp-cover:before{content:"";position:absolute;inset:72px 26px 46px;border-radius:24px;background:linear-gradient(160deg,#cfd8dc,#6f838c);box-shadow:0 18px 38px rgba(22,30,38,.2)}
.sp-cover h1{position:relative;margin:0;font-size:36px;letter-spacing:0;line-height:.9}.sp-cover p{position:absolute;left:20px;right:20px;bottom:18px;margin:0;font:700 13px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
</style><div class="sp-cover"><h1>{{text:title}}</h1><p>{{text:caption}}</p></div>`,
  },
])
