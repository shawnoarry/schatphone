# App 语义命名目录

## 目的

SchatPhone 支持系统语言切换，但 App 的英文名并不都适合逐字互译。品牌名负责识别和氛围，功能语义负责让系统、帮助文案和跨模块关联理解这个 App 主要做什么。

因此，项目需要维护的是“名称＋功能语义”目录，而不是一张简单的中英文翻译表。

## 命名规则

- Home、App Store 和主要导航保留已确定的品牌名或产品名。
- 语言切换只改变用户可读的名称和描述，不把品牌缩写强行翻译成中文。
- 每个 App 额外拥有稳定的 `primaryFunction` 语义，供帮助、搜索、跨 App 提示、AI 上下文和产品文档使用。
- 品牌名可以改变视觉表达，但不能改变 `primaryFunction` 或所有权边界。
- `S1`、`S2`、`S3`、`Event Runtime`、`Owner Store` 等工程阶段术语不属于用户可见名称。

## 当前壳子

| 产品名 | 主要功能 | 英文语义 | 当前边界 |
| --- | --- | --- | --- |
| Mail / Daon Mail | 机构来信、预约通知、本地草稿 | institutional mail and reservation notices | 当前以本地邮件预览为主，Mail 的 Receive 是明确批准的入口例外 |
| Prism Browser | 世界资料、帮助和外部网络入口 | world sources, help, and web paths | 公开资料与本地详情；不可用来源必须如实显示 |
| Ripple | 公共社区动态、媒体和观点 | public community and media feed | 可浏览和保存，不能据此授予发布权限 |
| Ondam Care | 医疗机构、服务、模拟预约和报告 | care services, appointments, and reports | 不做真实诊断或真实医疗 intake |
| Jari | 房源、住处收藏和看房准备 | housing listings and viewing plans | 不创建真实房源坐标、合同或租赁记录 |
| Work Hub | 组织团队协作、工作确认和排期提案 | organization workplace and schedule proposals | 不等于个人生活工作台；排期提案不自动成为 Calendar 事实 |
| Aster | 艺人社区、公开日程和粉丝内容 | artist fandom and public schedules | 不授予艺人发布权限，不复制 Community 所有者记录 |
| GATE | 演出、电影、展览和入场意向 | tickets and admission discovery | 不能声称订单、支付、座位、抽签或有效票券 |
| ROAM | 旅行目的地、住宿和住宿意向 | travel stays and lodging discovery | 不能声称预订、付款、房间锁定或 Calendar 住宿 |
| VIA | 火车、航班、巴士、渡轮和城际出行意向 | intercity transport comparison | 只能比较交通选项并保存本机意向草稿 |
| CREDO | 作品、创作者角色、权利份额和版税 | creator rights and royalty records | 不能声称版权登记、认证、签署或结算完成 |
| POSTA | 包裹状态、物流消息和寄件准备 | parcel tracking and delivery | 不能声称真实寄件、取件、签收或退款 |
| NEXT | 工作、试镜、邀约和申请准备 | career opportunities and applications | 不能声称投递、机构回执、面试或录用 |

## 相关系统功能

| 名称 | 主要功能 | 与其他模块的关系 |
| --- | --- | --- |
| Calendar | 已确认的长期日程和日期事实 | 接收用户确认后的正式安排 |
| Agenda | Calendar 内的日程视图 | 不是第二个长期规划 App |
| Agenda Journey | 今天和近期安排的执行 | 负责出发、抵达和活动完成，不拥有长期日历事实 |
| Map Journey | 路线、出发、移动和抵达 | 负责地图侧的旅行事实 |
| Reminders | 尚未确认的提醒、待办和跟进线索 | 不应被误认为正式 Calendar 事件 |
| Notification Center | 聚合显示各 App 通知 | 只改变通知呈现，不创建业务记录 |
| World Hub | 事件、关系记忆和世界状态审查 | 是控制/审查入口，不是日记或个人工作台 |

## 讨论格式

后续讨论统一采用：

```text
产品名（主要功能）
```

例如：`VIA（城际交通比较）`、`Work Hub（组织团队协作）`、`Agenda Journey（近期行程执行）`。

这样可以保留品牌的视觉性，同时避免在设计、开发和系统语言切换时失去功能含义。
