export const OFFICIAL_WIDGET_STYLE_PRESETS = Object.freeze([
  {
    id: 'mood_charm',
    size: '1x1',
    preview: 'charm',
    icon: 'fas fa-heart',
    nameZh: '心情徽章',
    nameEn: 'Mood Charm',
    code: `<style>
.sp-charm{width:100%;height:100%;box-sizing:border-box;border-radius:22px;padding:9px;background:linear-gradient(145deg,#fff4f7,#c9d7dc 72%);position:relative;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#674b55;display:grid;place-items:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.72)}
.sp-charm:before{content:"";position:absolute;inset:-18px;background:radial-gradient(circle at 26% 18%,rgba(255,255,255,.94) 0 10%,transparent 11%),radial-gradient(circle at 72% 18%,rgba(238,177,190,.66) 0 7%,transparent 8%),radial-gradient(circle at 20% 78%,rgba(175,194,201,.54) 0 8%,transparent 9%)}
.sp-charm .orb{position:relative;width:78%;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 30% 22%,rgba(255,255,255,.95),rgba(255,255,255,.32) 28%,rgba(204,151,162,.38) 62%,rgba(91,107,116,.22));border:1px solid rgba(255,255,255,.66);box-shadow:inset 0 0 18px rgba(255,255,255,.38),0 14px 24px rgba(80,92,104,.18)}
.sp-charm strong{display:block;font-size:23px;line-height:.9;letter-spacing:0}
.sp-charm small{display:block;margin-top:2px;font-size:8px;font-weight:850;text-transform:uppercase;letter-spacing:.08em;opacity:.68}
</style><div class="sp-charm"><div class="orb"><span><strong>82</strong><small>mood</small></span></div></div>`,
  },
  {
    id: 'index_capsule',
    size: '2x1',
    preview: 'capsule',
    icon: 'fas fa-chart-simple',
    nameZh: '指数胶囊',
    nameEn: 'Index Capsule',
    code: `<style>
.sp-index{width:100%;height:100%;box-sizing:border-box;padding:8px 10px;border-radius:999px;background:linear-gradient(135deg,rgba(252,246,247,.96),rgba(238,213,218,.92) 54%,rgba(216,229,232,.96));position:relative;overflow:hidden;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#8a5d67;box-shadow:0 8px 18px rgba(137,98,107,.2),inset 0 1px 0 rgba(255,255,255,.82)}
.sp-index:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 21% 23%,#efb8c2 0 3px,transparent 4px),radial-gradient(circle at 35% 80%,#d9a9b3 0 3px,transparent 4px),radial-gradient(circle at 73% 22%,#f1c4cc 0 4px,transparent 5px),radial-gradient(circle at 90% 70%,#d0a3ad 0 3px,transparent 4px);opacity:.62}
.sp-index .avatar{position:relative;width:42px;height:42px;border-radius:50%;background:linear-gradient(145deg,#fff,#e6b8c2);box-shadow:inset 0 0 0 2px rgba(255,255,255,.82),0 4px 10px rgba(126,88,98,.18)}
.sp-index .copy{position:relative;min-width:0}.sp-index small{display:block;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;opacity:.68}.sp-index strong{display:block;margin-top:1px;font-size:21px;line-height:1;font-weight:900;color:#cf8793;text-shadow:0 1px 0 rgba(255,255,255,.72)}
.sp-index b{position:relative;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.48);font-size:12px;color:#b77784}
</style><div class="sp-index"><div class="avatar"></div><div class="copy"><small>dream index</small><strong>91%</strong></div><b>+</b></div>`,
  },
  {
    id: 'diary_card',
    size: '2x2',
    preview: 'diary',
    icon: 'fas fa-note-sticky',
    nameZh: '日记小卡',
    nameEn: 'Diary Card',
    code: `<style>
.sp-diary{width:100%;height:100%;box-sizing:border-box;border-radius:24px;position:relative;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20282f;background:linear-gradient(160deg,#d9e4e7,#f6e4ea)}
.sp-diary:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 74% 22%,rgba(255,255,255,.78) 0 13%,transparent 14%),linear-gradient(135deg,rgba(255,255,255,.22),rgba(91,116,125,.16))}
.sp-diary .glass{position:absolute;inset:9px;border-radius:20px;background:rgba(255,255,255,.38);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);box-shadow:inset 0 1px 0 rgba(255,255,255,.74)}
.sp-diary .content{position:relative;height:100%;box-sizing:border-box;padding:16px 14px 12px;display:grid;grid-template-rows:auto 1fr auto}
.sp-diary h3{margin:0;font-size:30px;line-height:.92;letter-spacing:0;font-weight:850}.sp-diary p{align-self:center;margin:0;font-size:12px;line-height:1.35;font-weight:700;color:rgba(32,40,47,.72)}
.sp-diary .pill{min-height:44px;border-radius:999px;display:grid;grid-template-columns:30px 1fr;align-items:center;gap:9px;padding:0 12px;background:rgba(255,255,255,.6);box-shadow:inset 0 1px 0 rgba(255,255,255,.72)}
.sp-diary .dot{width:30px;height:30px;border-radius:50%;background:linear-gradient(145deg,#e8b5c0,#7f9aa3)}.sp-diary small{font-size:11px;font-weight:800;color:rgba(32,40,47,.68)}
</style><div class="sp-diary"><div class="glass"></div><div class="content"><h3>icity</h3><p>cloudy walk, soft notes, saved for tonight</p><div class="pill"><span class="dot"></span><small>May 25 · Monday</small></div></div></div>`,
  },
  {
    id: 'island_strip',
    size: '4x1',
    preview: 'island_v2',
    icon: 'fas fa-wave-square',
    nameZh: '灵动横条',
    nameEn: 'Island Strip',
    code: `<style>
.sp-island{width:100%;height:100%;box-sizing:border-box;padding:8px 13px;border-radius:999px;background:linear-gradient(135deg,#6f5962,#242b31 68%);color:#fff;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 10px 24px rgba(29,35,42,.2),inset 0 1px 0 rgba(255,255,255,.2);overflow:hidden}
.sp-island .avatar{width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 32% 25%,#fff,rgba(255,255,255,.22) 31%,#b58c99 32% 58%,#5b7077);border:1px solid rgba(255,255,255,.34);box-shadow:0 4px 10px rgba(0,0,0,.16)}
.sp-island .copy{min-width:0}.sp-island strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:1.1}.sp-island small{display:block;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:800;color:rgba(255,255,255,.66)}
.sp-island b{width:34px;height:24px;border-radius:999px;display:grid;place-items:center;background:rgba(255,255,255,.16);font-size:10px}
</style><div class="sp-island"><span class="avatar"></span><span class="copy"><strong>Night Drive</strong><small>soft radio · city lights</small></span><b>ON</b></div>`,
  },
  {
    id: 'day_panel',
    size: '4x2',
    preview: 'day',
    icon: 'fas fa-list-check',
    nameZh: '今日面板',
    nameEn: 'Day Panel',
    code: `<style>
.sp-day{width:100%;height:100%;box-sizing:border-box;padding:16px;border-radius:26px;background:linear-gradient(140deg,#f7edf1,#cfdce0);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#30343a;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.35fr);gap:14px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.72)}
.sp-day .date{border-radius:22px;background:rgba(255,255,255,.52);display:grid;align-content:center;justify-items:center;gap:4px;box-shadow:inset 0 1px 0 rgba(255,255,255,.76)}
.sp-day .date strong{font-size:44px;line-height:.9;color:#836570}.sp-day .date small{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#8a6b76}
.sp-day .list{min-width:0;display:grid;align-content:center;gap:8px}.sp-day h3{margin:0 0 2px;font-size:18px;line-height:1.1}.sp-day p{margin:0;border-radius:14px;padding:8px 10px;background:rgba(255,255,255,.42);font-size:12px;font-weight:750;color:#5d6770;display:flex;justify-content:space-between;gap:8px}.sp-day em{font-style:normal;color:#a57682;font-weight:900}
</style><div class="sp-day"><div class="date"><strong>25</strong><small>Monday</small></div><div class="list"><h3>Today</h3><p><span>coffee note</span><em>09:30</em></p><p><span>theme draft</span><em>14:00</em></p></div></div>`,
  },
  {
    id: 'theme_board',
    size: '4x3',
    preview: 'board',
    icon: 'fas fa-layer-group',
    nameZh: '主题大卡',
    nameEn: 'Theme Board',
    code: `<style>
.sp-board{width:100%;height:100%;box-sizing:border-box;padding:18px;border-radius:28px;background:linear-gradient(145deg,#f7edf2,#c8d8dc);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#2f363c;display:grid;grid-template-rows:1fr auto;gap:13px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.72)}
.sp-board .stage{position:relative;border-radius:24px;background:linear-gradient(155deg,#eef4f4,#8da5ac);overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.58)}
.sp-board .stage:before{content:"";position:absolute;left:18px;top:18px;width:104px;height:126px;border-radius:24px;background:linear-gradient(150deg,#fff7f9,#d7a7b2);box-shadow:0 16px 28px rgba(95,101,110,.18);transform:rotate(-6deg)}
.sp-board .stage:after{content:"";position:absolute;right:18px;bottom:18px;width:142px;height:88px;border-radius:24px;background:rgba(255,255,255,.42);box-shadow:inset 0 1px 0 rgba(255,255,255,.78)}
.sp-board .rings{position:absolute;right:34px;top:26px;width:74px;height:74px;border-radius:50%;background:radial-gradient(circle,#fff 0 18%,rgba(255,255,255,.2) 19% 36%,#7f979f 37% 62%,transparent 63%);box-shadow:0 12px 24px rgba(41,51,58,.18)}
.sp-board .meta{display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px}.sp-board h3{margin:0;font-size:22px;line-height:1.05}.sp-board p{margin:4px 0 0;font-size:12px;line-height:1.25;font-weight:750;color:#637079}
.sp-board small{border-radius:999px;padding:8px 11px;background:rgba(255,255,255,.58);font-size:10px;font-weight:900;color:#7d6670;text-transform:uppercase;letter-spacing:.08em}
</style><div class="sp-board"><div class="stage"><span class="rings"></span></div><div class="meta"><div><h3>Theme Board</h3><p>photos, colors, and soft notes</p></div><small>4x3</small></div></div>`,
  },
  {
    id: 'magazine_cover',
    size: '4x4',
    preview: 'magazine',
    icon: 'fas fa-newspaper',
    nameZh: '杂志封面',
    nameEn: 'Magazine Cover',
    code: `<style>
.sp-cover{width:100%;height:100%;box-sizing:border-box;padding:20px;border-radius:30px;background:linear-gradient(145deg,#efede8,#a7b5b7);position:relative;overflow:hidden;font-family:Georgia,"Times New Roman",serif;color:#22292e;box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}
.sp-cover:before{content:"";position:absolute;inset:84px 24px 58px;border-radius:26px;background:linear-gradient(160deg,#d8e0e2,#6f858c);box-shadow:0 20px 42px rgba(22,30,38,.22)}
.sp-cover:after{content:"";position:absolute;right:-42px;top:48px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.24)}
.sp-cover h1{position:relative;z-index:1;margin:0;font-size:42px;letter-spacing:0;line-height:.86;font-weight:900}.sp-cover p{position:absolute;z-index:1;left:22px;right:22px;bottom:20px;margin:0;font:800 13px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#253039}
.sp-cover small{position:absolute;z-index:1;top:22px;right:22px;border-radius:999px;padding:5px 9px;background:rgba(255,255,255,.5);font:900 10px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.08em;text-transform:uppercase}
</style><div class="sp-cover"><small>issue 05</small><h1>VIBE<br>BOOK</h1><p>quiet photos, saved words, and one soft home screen</p></div>`,
  },
  {
    id: 'liquid_prism_drop',
    collectionId: 'liquid-prism',
    size: '1x1',
    preview: 'liquid-drop',
    icon: 'fas fa-droplet',
    nameZh: '彩光状态',
    nameEn: 'Chromatic Status',
    code: `<style>
.lp-drop{width:100%;height:100%;box-sizing:border-box;border-radius:24px;position:relative;overflow:hidden;display:grid;place-items:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#414248;background:radial-gradient(circle at 27% 16%,rgba(255,255,255,.99) 0 6%,transparent 17%),radial-gradient(circle at 78% 84%,rgba(219,205,224,.2),transparent 48%),radial-gradient(circle at 12% 82%,rgba(235,223,209,.14),transparent 42%),linear-gradient(145deg,rgba(255,255,255,.76),rgba(244,244,243,.4) 54%,rgba(226,226,228,.38));border:1px solid rgba(255,255,255,.9);box-shadow:inset 1px 1px 0 rgba(255,255,255,.98),inset -3px -4px 12px rgba(69,69,76,.13),0 12px 24px rgba(45,45,51,.18)}
.lp-drop:after{content:"";position:absolute;inset:5px;border-radius:20px;border:1px solid rgba(174,170,181,.24);box-shadow:inset 0 -8px 14px rgba(139,125,154,.06)}
.lp-drop span{position:relative;z-index:1;text-align:center}.lp-drop strong{display:block;font-size:25px;line-height:1;font-weight:850;letter-spacing:0}.lp-drop small{display:block;margin-top:3px;font-size:8px;font-weight:800;letter-spacing:0;text-transform:uppercase;color:rgba(65,66,72,.62)}
</style><div class="lp-drop"><span><strong>82</strong><small>FLOW</small></span></div>`,
  },
  {
    id: 'liquid_prism_capsule',
    collectionId: 'liquid-prism',
    size: '2x1',
    preview: 'liquid-capsule',
    icon: 'fas fa-wave-square',
    nameZh: '彩光胶囊',
    nameEn: 'Chromatic Capsule',
    code: `<style>
.lp-capsule{width:100%;height:100%;box-sizing:border-box;border-radius:999px;padding:8px 11px;position:relative;overflow:hidden;display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:9px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#414248;background:radial-gradient(circle at 14% 10%,rgba(255,255,255,.98),transparent 24%),radial-gradient(circle at 90% 86%,rgba(218,204,224,.18),transparent 38%),linear-gradient(135deg,rgba(255,255,255,.72),rgba(244,244,243,.38) 48%,rgba(227,225,228,.36));border:1px solid rgba(255,255,255,.88);box-shadow:inset 1px 1px 0 rgba(255,255,255,.96),inset -3px -4px 11px rgba(69,69,76,.12),0 10px 22px rgba(45,45,51,.18)}
.lp-capsule:after{content:"";position:absolute;inset:4px;border-radius:999px;border:1px solid rgba(174,170,181,.22)}.lp-capsule .orb{position:relative;z-index:1;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,rgba(255,255,255,.86),rgba(221,220,222,.4));border:1px solid rgba(255,255,255,.86);box-shadow:inset 0 1px 0 #fff,0 5px 12px rgba(45,45,51,.16);font-size:18px;font-weight:800}.lp-capsule .copy{position:relative;z-index:1;min-width:0}.lp-capsule strong,.lp-capsule small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:0}.lp-capsule strong{font-size:13px}.lp-capsule small{margin-top:2px;font-size:9px;color:rgba(65,66,72,.62)}.lp-capsule b{position:relative;z-index:1;font-size:10px;color:#625d69}
</style><div class="lp-capsule"><span class="orb">+</span><span class="copy"><strong>Clear focus</strong><small>one quiet task</small></span><b>ON</b></div>`,
  },
  {
    id: 'liquid_prism_day',
    collectionId: 'liquid-prism',
    size: '2x2',
    preview: 'liquid-day',
    icon: 'fas fa-calendar-day',
    nameZh: '彩光今日',
    nameEn: 'Chromatic Day',
    code: `<style>
.lp-day{width:100%;height:100%;box-sizing:border-box;border-radius:26px;padding:13px;position:relative;overflow:hidden;display:grid;grid-template-rows:auto 1fr auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#3f4046;background:radial-gradient(circle at 18% 8%,rgba(255,255,255,.99),transparent 28%),radial-gradient(circle at 88% 88%,rgba(218,204,224,.19),transparent 46%),radial-gradient(circle at 8% 78%,rgba(235,223,209,.12),transparent 38%),linear-gradient(150deg,rgba(255,255,255,.73),rgba(244,244,243,.38) 55%,rgba(226,226,228,.36));border:1px solid rgba(255,255,255,.9);box-shadow:inset 1px 1px 0 rgba(255,255,255,.97),inset -4px -5px 14px rgba(67,67,74,.12),0 14px 28px rgba(44,44,50,.18)}
.lp-day:after{content:"";position:absolute;inset:5px;border-radius:22px;border:1px solid rgba(174,170,181,.22)}.lp-day .top,.lp-day .date,.lp-day .note{position:relative;z-index:1}.lp-day .top{display:flex;align-items:center;justify-content:space-between;font-size:9px;font-weight:800;color:rgba(63,64,70,.62)}.lp-day .top i{width:8px;height:8px;border-radius:50%;background:#8c8990;box-shadow:0 0 0 4px rgba(140,137,144,.14)}.lp-day .date{align-self:center}.lp-day .date strong{display:block;font-size:48px;line-height:.85;letter-spacing:0}.lp-day .date small{display:block;margin-top:7px;font-size:11px;font-weight:800;letter-spacing:0;color:#625d69}.lp-day .note{border-radius:999px;padding:8px 10px;background:rgba(255,255,255,.4);border:1px solid rgba(255,255,255,.6);font-size:9px;font-weight:750;color:rgba(63,64,70,.7)}
</style><div class="lp-day"><div class="top"><span>AUGUST</span><i></i></div><div class="date"><strong>26</strong><small>Wednesday</small></div><div class="note">20:00 · Night Flight</div></div>`,
  },
  {
    id: 'liquid_prism_music',
    collectionId: 'liquid-prism',
    size: '4x1',
    preview: 'liquid-music',
    icon: 'fas fa-play',
    nameZh: '彩光播放条',
    nameEn: 'Chromatic Player',
    code: `<style>
.lp-player{width:100%;height:100%;box-sizing:border-box;border-radius:999px;padding:8px 13px;position:relative;overflow:hidden;display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:11px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#3f4046;background:radial-gradient(circle at 12% 0,rgba(255,255,255,.99),transparent 22%),radial-gradient(circle at 88% 88%,rgba(218,204,224,.18),transparent 38%),linear-gradient(135deg,rgba(255,255,255,.72),rgba(244,244,243,.38) 48%,rgba(226,226,228,.36));border:1px solid rgba(255,255,255,.88);box-shadow:inset 1px 1px 0 rgba(255,255,255,.97),inset -4px -4px 13px rgba(67,67,74,.12),0 12px 26px rgba(44,44,50,.18)}
.lp-player:after{content:"";position:absolute;inset:4px;border-radius:999px;border:1px solid rgba(174,170,181,.22)}.lp-player .disc{position:relative;z-index:1;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#fafafa 0 12%,#777980 13% 18%,rgba(255,255,255,.58) 19% 42%,#aaa8ad 43% 60%,rgba(255,255,255,.54) 61%);box-shadow:0 5px 12px rgba(45,45,51,.18)}.lp-player .copy{position:relative;z-index:1;min-width:0}.lp-player strong,.lp-player small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:0}.lp-player strong{font-size:13px}.lp-player small{margin-top:2px;font-size:9px;color:rgba(63,64,70,.62)}.lp-player .controls{position:relative;z-index:1;display:flex;gap:6px}.lp-player b{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.46);border:1px solid rgba(255,255,255,.6);font-size:10px;color:#55575f}
</style><div class="lp-player"><span class="disc"></span><span class="copy"><strong>Afterlight</strong><small>Daily Mix · 2:41</small></span><span class="controls"><b>Ⅱ</b><b>›</b></span></div>`,
  },
  {
    id: 'liquid_prism_agenda',
    collectionId: 'liquid-prism',
    size: '4x2',
    preview: 'liquid-agenda',
    icon: 'fas fa-list-check',
    nameZh: '彩光日程板',
    nameEn: 'Chromatic Agenda',
    code: `<style>
.lp-agenda{width:100%;height:100%;box-sizing:border-box;border-radius:28px;padding:15px;position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,.72fr) minmax(0,1.4fr);gap:13px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#3f4046;background:radial-gradient(circle at 12% 5%,rgba(255,255,255,.99),transparent 26%),radial-gradient(circle at 90% 86%,rgba(218,204,224,.18),transparent 44%),radial-gradient(circle at 8% 82%,rgba(235,223,209,.12),transparent 38%),linear-gradient(145deg,rgba(255,255,255,.72),rgba(244,244,243,.38) 54%,rgba(226,226,228,.36));border:1px solid rgba(255,255,255,.9);box-shadow:inset 1px 1px 0 rgba(255,255,255,.97),inset -5px -6px 16px rgba(67,67,74,.11),0 16px 32px rgba(44,44,50,.18)}
.lp-agenda:after{content:"";position:absolute;inset:5px;border-radius:24px;border:1px solid rgba(174,170,181,.22)}.lp-agenda .hero,.lp-agenda .list{position:relative;z-index:1}.lp-agenda .hero{border-radius:21px;display:grid;align-content:center;justify-items:center;background:rgba(255,255,255,.3);border:1px solid rgba(255,255,255,.56)}.lp-agenda .hero small{font-size:9px;font-weight:800;color:rgba(63,64,70,.6)}.lp-agenda .hero strong{font-size:42px;line-height:.9;letter-spacing:0}.lp-agenda .list{display:grid;align-content:center;gap:7px}.lp-agenda h3{margin:0 0 2px;font-size:15px;letter-spacing:0}.lp-agenda p{margin:0;border-radius:14px;padding:8px 9px;display:grid;grid-template-columns:auto 1fr;gap:8px;background:rgba(255,255,255,.36);border:1px solid rgba(255,255,255,.48);font-size:9px;font-weight:750;color:rgba(63,64,70,.72)}.lp-agenda em{font-style:normal;color:#625d69;font-weight:850}
</style><div class="lp-agenda"><div class="hero"><small>WED</small><strong>26</strong></div><div class="list"><h3>Today</h3><p><em>09:30</em><span>Morning notes</span></p><p><em>14:00</em><span>Theme review</span></p><p><em>20:00</em><span>Night Flight</span></p></div></div>`,
  },
  {
    id: 'cream_shell_status',
    collectionId: 'cream-shell',
    size: '1x1',
    preview: 'cream-status',
    icon: 'fas fa-sun',
    nameZh: '奶油状态',
    nameEn: 'Cream Status',
    code: `<style>
.cs-status{width:100%;height:100%;box-sizing:border-box;border-radius:25px;position:relative;overflow:hidden;display:grid;place-items:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#625d59;background:linear-gradient(180deg,#fffaf0,#fff4e4);border:1px solid rgba(121,104,84,.06);box-shadow:none}
.cs-status span{position:relative;z-index:1;text-align:center}.cs-status strong{display:block;font-size:25px;line-height:1;font-weight:760}.cs-status small{display:block;margin-top:4px;font-size:8px;font-weight:750;letter-spacing:.08em;text-transform:uppercase;color:rgba(98,93,89,.64)}
</style><div class="cs-status"><span><strong>24°</strong><small>soft day</small></span></div>`,
  },
  {
    id: 'cream_shell_focus',
    collectionId: 'cream-shell',
    size: '2x1',
    preview: 'cream-focus',
    icon: 'fas fa-circle-check',
    nameZh: '奶油专注',
    nameEn: 'Cream Focus',
    code: `<style>
.cs-focus{width:100%;height:100%;box-sizing:border-box;border-radius:999px;padding:8px 11px;position:relative;overflow:hidden;display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:9px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#625d59;background:linear-gradient(180deg,#fffaf0,#fff4e4);border:1px solid rgba(121,104,84,.06);box-shadow:none}
.cs-focus .mark{position:relative;z-index:1;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#f9ead7;border:1px solid rgba(121,104,84,.06);box-shadow:none;font-size:17px;color:#8a6d5d}.cs-focus .copy{position:relative;z-index:1;min-width:0}.cs-focus strong,.cs-focus small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cs-focus strong{font-size:13px}.cs-focus small{margin-top:2px;font-size:9px;color:rgba(98,93,89,.64)}.cs-focus b{position:relative;z-index:1;font-size:9px;letter-spacing:.08em;color:#8a6d5d}
</style><div class="cs-focus"><span class="mark">✓</span><span class="copy"><strong>One gentle thing</strong><small>keep today light</small></span><b>ON</b></div>`,
  },
  {
    id: 'cream_shell_day',
    collectionId: 'cream-shell',
    size: '2x2',
    preview: 'cream-day',
    icon: 'fas fa-calendar-day',
    nameZh: '奶油今日',
    nameEn: 'Cream Day',
    code: `<style>
.cs-day{width:100%;height:100%;box-sizing:border-box;border-radius:28px;padding:14px;position:relative;overflow:hidden;display:grid;grid-template-rows:auto 1fr auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#625d59;background:linear-gradient(180deg,#fffaf0,#fff4e4);border:1px solid rgba(121,104,84,.06);box-shadow:none}
.cs-day .top,.cs-day .date,.cs-day .note{position:relative;z-index:1}.cs-day .top{display:flex;justify-content:space-between;font-size:9px;font-weight:760;letter-spacing:.08em;color:rgba(98,93,89,.6)}.cs-day .top i{width:8px;height:8px;border-radius:50%;background:#e6bda7}.cs-day .date{align-self:center}.cs-day .date strong{display:block;font-size:48px;line-height:.84;font-weight:760}.cs-day .date small{display:block;margin-top:7px;font-size:11px;font-weight:720;color:#7b675c}.cs-day .note{border-radius:999px;padding:8px 10px;background:rgba(249,234,215,.7);border:1px solid rgba(121,104,84,.05);font-size:9px;font-weight:680;color:rgba(98,93,89,.72)}
</style><div class="cs-day"><div class="top"><span>AUGUST</span><i></i></div><div class="date"><strong>27</strong><small>Thursday</small></div><div class="note">19:30 · quiet evening</div></div>`,
  },
  {
    id: 'cream_shell_player',
    collectionId: 'cream-shell',
    size: '4x1',
    preview: 'cream-player',
    icon: 'fas fa-play',
    nameZh: '奶油播放条',
    nameEn: 'Cream Player',
    code: `<style>
.cs-player{width:100%;height:100%;box-sizing:border-box;border-radius:999px;padding:8px 13px;position:relative;overflow:hidden;display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:11px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#625d59;background:linear-gradient(180deg,#fffaf0,#fff4e4);border:1px solid rgba(121,104,84,.06);box-shadow:none}
.cs-player .disc{position:relative;z-index:1;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#fff5ec 0 12%,#8a7062 13% 17%,#f8dfcb 18% 47%,#e8c5b0 48% 64%,#fff0e4 65%);box-shadow:none}.cs-player .copy{position:relative;z-index:1;min-width:0}.cs-player strong,.cs-player small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cs-player strong{font-size:13px}.cs-player small{margin-top:2px;font-size:9px;color:rgba(98,93,89,.64)}.cs-player .controls{position:relative;z-index:1;display:flex;gap:6px}.cs-player b{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#f9ead7;border:1px solid rgba(121,104,84,.05);font-size:10px;color:#785f52}
</style><div class="cs-player"><span class="disc"></span><span class="copy"><strong>Vanilla Sky</strong><small>Soft Notes · 2:41</small></span><span class="controls"><b>Ⅱ</b><b>›</b></span></div>`,
  },
  {
    id: 'cream_shell_agenda',
    collectionId: 'cream-shell',
    size: '4x2',
    preview: 'cream-agenda',
    icon: 'fas fa-list-check',
    nameZh: '奶油日程板',
    nameEn: 'Cream Agenda',
    code: `<style>
.cs-agenda{width:100%;height:100%;box-sizing:border-box;border-radius:30px;padding:15px;position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,.72fr) minmax(0,1.4fr);gap:13px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#625d59;background:linear-gradient(180deg,#fffaf0,#fff4e4);border:1px solid rgba(121,104,84,.06);box-shadow:none}
.cs-agenda .hero,.cs-agenda .list{position:relative;z-index:1}.cs-agenda .hero{border-radius:22px;display:grid;align-content:center;justify-items:center;background:#f9ead7;border:1px solid rgba(121,104,84,.05);box-shadow:none}.cs-agenda .hero small{font-size:9px;font-weight:760;letter-spacing:.08em;color:rgba(98,93,89,.6)}.cs-agenda .hero strong{font-size:42px;line-height:.9;font-weight:760}.cs-agenda .list{display:grid;align-content:center;gap:7px}.cs-agenda h3{margin:0 0 2px;font-size:15px}.cs-agenda p{margin:0;border-radius:15px;padding:8px 9px;display:grid;grid-template-columns:auto 1fr;gap:8px;background:rgba(249,234,215,.64);border:1px solid rgba(121,104,84,.05);font-size:9px;font-weight:680;color:rgba(98,93,89,.72)}.cs-agenda em{font-style:normal;color:#7b6153;font-weight:800}
</style><div class="cs-agenda"><div class="hero"><small>THU</small><strong>27</strong></div><div class="list"><h3>Today</h3><p><em>09:30</em><span>slow breakfast</span></p><p><em>14:00</em><span>theme review</span></p><p><em>19:30</em><span>quiet evening</span></p></div></div>`,
  },
])

export const WIDGET_STYLE_PRESET_COLLECTIONS = Object.freeze([
  Object.freeze({
    id: 'liquid-prism',
    labelZh: '彩光玻璃',
    labelEn: 'Chromatic Glass',
  }),
  Object.freeze({
    id: 'cream-shell',
    labelZh: '奶油软壳',
    labelEn: 'Cream Shell',
  }),
])

export const getWidgetStylePresetsByCollection = (collectionId = '') => {
  const normalizedId = typeof collectionId === 'string' ? collectionId.trim() : ''
  if (!normalizedId) return []
  return OFFICIAL_WIDGET_STYLE_PRESETS.filter(
    (preset) => preset.collectionId === normalizedId,
  )
}
