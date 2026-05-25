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
])
