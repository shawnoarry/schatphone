const createCopyRecord = (summaryZh, summaryEn) => Object.freeze({ summaryZh, summaryEn })

export const MAP_PLACE_COPY_REGISTRY = Object.freeze({
  'real-seoul-v1': Object.freeze({
    'seoul-sm-hq': createCopyRecord(
      '城东区的娱乐产业办公地标，连接艺人管理、内容制作与城市通勤动线。',
      'An entertainment-industry office landmark in Seongdong, linking artist management, content production, and city travel.',
    ),
    'seoul-hybe-hq': createCopyRecord(
      '龙山汉江大路上的音乐产业总部目的地，适合作为工作会面或活动行程坐标。',
      'A music-industry headquarters destination on Hangang-daero in Yongsan, suited to work meetings and event journeys.',
    ),
    'seoul-samsung-town': createCopyRecord(
      '瑞草核心商务区的办公楼群，以高密度企业通勤与城市服务设施为主要环境。',
      'An office cluster in central Seocho shaped by dense corporate commuting and nearby city services.',
    ),
    'seoul-station': createCopyRecord(
      '连接城际铁路、地铁与市中心道路的综合交通门户，也是抵达首尔的重要起点。',
      'A major gateway connecting intercity rail, metro lines, and central Seoul streets, often serving as a first arrival point.',
    ),
    'seoul-gwanghwamun': createCopyRecord(
      '世宗大路上的开阔城市广场，串联宫阙、公共文化设施与首尔中心区步行动线。',
      'An open civic square on Sejong-daero linking palaces, cultural institutions, and central Seoul walking routes.',
    ),
    'seoul-hongdae': createCopyRecord(
      '围绕弘益大学展开的街区目的地，聚集独立店铺、演出空间与夜间社交活动。',
      'A district around Hongik University known for independent shops, performance spaces, and late-night social activity.',
    ),
    'seoul-lotte-world': createCopyRecord(
      '蚕室的综合娱乐目的地，将主题游乐、室内活动与大型商业设施集中在同一区域。',
      'A major entertainment destination in Jamsil combining theme attractions, indoor activities, and large-scale retail.',
    ),
    'seoul-jyp-hq': createCopyRecord(
      '江东区的音乐娱乐办公地点，可作为艺人工作、访客会面或相关行程的地图坐标。',
      'A music-entertainment workplace in Gangdong that can anchor artist work, visitor meetings, and related journeys.',
    ),
    'seoul-yg-hq': createCopyRecord(
      '合井一带辨识度较高的娱乐公司办公目的地，邻近麻浦的创意与演出街区。',
      'A recognizable entertainment-company destination near Hapjeong, close to Mapo creative and performance districts.',
    ),
    'seoul-cube-hq': createCopyRecord(
      '城东区的娱乐公司办公坐标，周边是办公、制作与日常商业混合的城市街区。',
      'An entertainment-company office point in Seongdong, surrounded by a mix of production, work, and everyday retail.',
    ),
    'seoul-starship-hq': createCopyRecord(
      '清潭与三成路附近的娱乐产业办公地点，适合安排工作拜访或人物相关行程。',
      'An entertainment-industry workplace near Cheongdam and Samseong-ro for work visits or character-related journeys.',
    ),
    'seoul-fnc-hq': createCopyRecord(
      '江南北部的娱乐公司办公目的地，位于清潭一带较安静的城市道路之间。',
      'An entertainment-company destination in northern Gangnam, set among the quieter streets around Cheongdam.',
    ),
    'seoul-kbs-hq': createCopyRecord(
      '汝矣岛的公共广播制作中心，承载演播、节目制作与媒体工作行程。',
      'A public broadcasting production center in Yeouido associated with studios, programming, and media work.',
    ),
    'seoul-mbc-hq': createCopyRecord(
      '上岩数字媒体城的重要广播办公地点，周边集中电视制作与内容产业设施。',
      'A major broadcasting workplace in Sangam Digital Media City, amid television and content-production facilities.',
    ),
    'seoul-sbs-hq': createCopyRecord(
      '木洞的电视广播中心，是节目制作、录制与媒体从业者通勤的明确目的地。',
      'A television broadcasting center in Mokdong and a clear destination for production, recording, and media commutes.',
    ),
    'seoul-jtbc-hq': createCopyRecord(
      '上岩媒体产业带内的新闻与节目办公地点，适合承接采访、制作或会面行程。',
      'A news and programming workplace in Sangam media district for interviews, production, and meetings.',
    ),
    'seoul-cj-enm-center': createCopyRecord(
      '上岩的内容制作与娱乐产业中心，可作为录制、项目协作和活动日程目的地。',
      'A content-production and entertainment center in Sangam for recording, project collaboration, and event schedules.',
    ),
    'seoul-ytn-newsquare': createCopyRecord(
      '数字媒体城内的新闻广播办公坐标，周边延续上岩密集的媒体工作环境。',
      'A news-broadcasting office point in Digital Media City, within Sangam dense media-work environment.',
    ),
    'seoul-amorepacific-hq': createCopyRecord(
      '龙山站与新龙山之间的总部建筑，连接美妆产业办公、展览与城市公共空间。',
      'A headquarters building between Yongsan and Sinyongsan connecting beauty-industry work, exhibitions, and public space.',
    ),
    'seoul-sk-seorin': createCopyRecord(
      '钟路中心区的企业办公地标，靠近清溪川与首尔老城的商务步行动线。',
      'A corporate landmark in central Jongno near Cheonggyecheon and the old-city business walking network.',
    ),
    'seoul-lg-twin-towers': createCopyRecord(
      '汝矣岛汉江沿岸的双塔办公目的地，处于首尔金融与企业总部密集区。',
      'A twin-tower office destination on the Yeouido riverfront within Seoul financial and headquarters district.',
    ),
    'seoul-gyeongbokgung': createCopyRecord(
      '首尔代表性的宫阙建筑群，可沿主要宫门、庭院与山景轴线展开历史文化游览。',
      'A defining Seoul palace complex where gates, courtyards, and mountain-framed axes shape a historic visit.',
    ),
    'seoul-city-hall': createCopyRecord(
      '首尔广场旁的城市行政地标，周边连接公共服务、文化活动与中心区步行网络。',
      'A civic landmark beside Seoul Plaza, connecting public services, cultural events, and central walking routes.',
    ),
    'seoul-national-assembly': createCopyRecord(
      '汝矣岛的国家议政建筑目的地，位于宽阔道路与汉江公园之间的公共机构区。',
      'A national legislative destination in Yeouido, set between broad avenues and the Han River park network.',
    ),
    'seoul-n-tower': createCopyRecord(
      '南山顶部的城市观景地标，可从高处辨认首尔中心区、汉江与周边山体。',
      'A hilltop observation landmark on Namsan with broad views across central Seoul, the Han River, and surrounding ridges.',
    ),
    'seoul-ddp': createCopyRecord(
      '东大门的设计与展览中心，以连续曲面建筑、夜间公共空间和活动场地著称。',
      'A Dongdaemun design and exhibition center known for flowing architecture, night public space, and event venues.',
    ),
    'seoul-coex': createCopyRecord(
      '三成洞的大型会展目的地，连接展览馆、会议空间、商业设施与地铁换乘。',
      'A major convention destination in Samseong linking exhibition halls, meeting spaces, retail, and metro access.',
    ),
    'seoul-lotte-world-tower': createCopyRecord(
      '蚕室天际线中的超高层地标，集合观景、办公、住宿与大型商业空间。',
      'A defining skyscraper on the Jamsil skyline combining observation, offices, hospitality, and large-scale retail.',
    ),
    'seoul-63-square': createCopyRecord(
      '汝矣岛汉江边的金色高层地标，是城市观景、文化设施与商务活动的复合目的地。',
      'A gold-toned riverfront landmark in Yeouido combining city views, cultural facilities, and business activity.',
    ),
    'seoul-gocheok-dome': createCopyRecord(
      '九老区的大型室内球场与演出场馆，可承接棒球比赛、演唱会和大型活动。',
      'A large indoor stadium in Guro hosting baseball, concerts, and other major events.',
    ),
    'seoul-kspo-dome': createCopyRecord(
      '奥林匹克公园内的室内大型场馆，是演唱会、颁奖礼与体育活动的常见目的地。',
      'A major indoor venue within Olympic Park used for concerts, ceremonies, and sporting events.',
    ),
    'seoul-national-museum': createCopyRecord(
      '龙山的大型国家博物馆，以常设文物展览、开阔庭院和家庭文化活动为核心。',
      'A major national museum in Yongsan centered on permanent collections, open grounds, and family cultural visits.',
    ),
    'seoul-jennyhouse-cheongdam-hill': createCopyRecord(
      '清潭美容与造型街区中的预约型沙龙地点，适合安排妆发准备或造型会面。',
      'An appointment-oriented salon in the Cheongdam beauty district for hair, makeup, and styling visits.',
    ),
    'seoul-soonsoo-cheongdam': createCopyRecord(
      '岛山大路附近的清潭造型目的地，周边聚集美容工作室与时尚相关服务。',
      'A Cheongdam styling destination near Dosan-daero, amid beauty studios and fashion-related services.',
    ),
    'seoul-a-by-bom-cheongdam': createCopyRecord(
      '清潭一带的妆发造型地点，适合作为拍摄、活动或正式会面前的准备站。',
      'A hair-and-makeup destination in Cheongdam suited to preparation before shoots, events, or formal meetings.',
    ),
    'seoul-starfield-coex-mall': createCopyRecord(
      'COEX 地下商业网络中的大型购物中心，连接星空图书馆、餐饮、影院与会展动线。',
      'A large mall in the COEX underground network linking Starfield Library, dining, cinema, and convention routes.',
    ),
    'seoul-the-hyundai-seoul': createCopyRecord(
      '汝矣岛的大型百货目的地，以宽阔室内空间、品牌集合与餐饮体验为主。',
      'A major Yeouido department-store destination built around expansive interiors, brand collections, and dining.',
    ),
    'seoul-times-square': createCopyRecord(
      '永登浦站附近的综合商业中心，集合购物、餐饮、影院与室内休闲活动。',
      'A mixed commercial center near Yeongdeungpo Station combining shopping, dining, cinema, and indoor leisure.',
    ),
    'seoul-lotte-department-main': createCopyRecord(
      '明洞与乙支路之间的老牌百货目的地，适合集中购物、餐饮与市中心会面。',
      'A long-established department-store destination between Myeongdong and Euljiro for shopping, dining, and central meetings.',
    ),
    'seoul-galleria-luxury-hall': createCopyRecord(
      '狎鸥亭高端商业带的精品百货地标，以设计师品牌与精致购物体验为主。',
      'A luxury retail landmark in Apgujeong focused on designer labels and a refined shopping experience.',
    ),
    'seoul-shinsegae-gangnam': createCopyRecord(
      '高速客运站旁的大型高端百货，与交通换乘、餐饮和地下商业空间紧密相连。',
      'A major luxury department store beside the express bus terminal, closely linked to transit, dining, and underground retail.',
    ),
    'seoul-hyundai-apgujeong-main': createCopyRecord(
      '狎鸥亭核心街区的高端百货目的地，周边延伸出清潭与林荫道购物动线。',
      'A premium department-store destination in central Apgujeong, extending toward Cheongdam and Garosu-gil shopping routes.',
    ),
    'seoul-lotte-avenuel-world-tower': createCopyRecord(
      '乐天世界塔商业群内的高端购物空间，可与观景、餐饮和蚕室行程一起安排。',
      'A luxury shopping space within the Lotte World Tower complex, easily paired with observation, dining, and Jamsil visits.',
    ),
    'seoul-emart-wangsimni': createCopyRecord(
      '往十里交通节点旁的大型日常采购地点，适合食品、家居与集中补给。',
      'A large everyday shopping stop by the Wangsimni transit hub for groceries, household goods, and practical supplies.',
    ),
    'seoul-lotte-mart-seoul-station': createCopyRecord(
      '首尔站旁的综合超市，适合在铁路出发、抵达或换乘前完成集中采购。',
      'A full supermarket beside Seoul Station for stocking up before departure, after arrival, or during a transfer.',
    ),
    'seoul-homeplus-world-cup': createCopyRecord(
      '世界杯体育场片区的大型超市，为麻浦西部的日常采购与活动前补给提供落点。',
      'A large supermarket in the World Cup Stadium area serving everyday shopping and pre-event supplies in western Mapo.',
    ),
    'seoul-cu-bgf-hq': createCopyRecord(
      '德黑兰路办公区内的便利补给点，适合通勤途中购买饮品、简餐与日用品。',
      'A convenience stop in the Teheran-ro office district for drinks, quick meals, and commuting essentials.',
    ),
    'seoul-gs25-gangnam-central': createCopyRecord(
      '江南站繁忙街区中的快速补给地点，服务地铁换乘、办公与夜间出行。',
      'A quick-supply stop in the busy Gangnam Station district for metro transfers, office trips, and late outings.',
    ),
    'seoul-seven-eleven-myeongdong': createCopyRecord(
      '明洞购物街范围内的便利店坐标，可在逛街或步行途中补充饮品与小件用品。',
      'A convenience-store point in the Myeongdong shopping district for drinks and small essentials during a walking route.',
    ),
    'seoul-cakeshop': createCopyRecord(
      '梨泰院地下夜生活地点，以电子音乐与紧凑舞池氛围为主要到访理由。',
      'An underground Itaewon nightlife venue centered on electronic music and an intimate dance-floor atmosphere.',
    ),
    'seoul-club-nb2': createCopyRecord(
      '弘大夜间娱乐街区中的俱乐部坐标，适合作为深夜音乐与社交行程的一站。',
      'A club point in the Hongdae nightlife district for late-night music and social plans.',
    ),
    'seoul-club-ff': createCopyRecord(
      '弘大一带偏现场演出取向的夜间地点，连接乐队文化与小型音乐活动。',
      'A Hongdae night venue with a live-performance focus, connecting local band culture and small music events.',
    ),
    'seoul-club-aura': createCopyRecord(
      '西桥洞夜生活密集区的俱乐部地点，适合纳入弘大深夜步行与聚会路线。',
      'A club in Seogyo nightlife district that fits naturally into late-night Hongdae walking and group plans.',
    ),
    'seoul-national-university-hospital': createCopyRecord(
      '大学路的大型大学医院目的地，适合处理预约、探访与综合医疗相关行程。',
      'A major university hospital on Daehak-ro for appointments, visits, and general medical journeys.',
    ),
    'seoul-samsung-medical-center': createCopyRecord(
      '江南东南部的大型医疗中心，院区规模较大，前往时宜预留院内步行时间。',
      'A large medical center in southeastern Gangnam whose campus scale makes extra walking time worth allowing.',
    ),
    'seoul-asan-medical-center': createCopyRecord(
      '松坡汉江附近的大型综合医院，适合作为预约、检查或探访行程的明确终点。',
      'A major general hospital near the Han River in Songpa and a clear endpoint for appointments, examinations, or visits.',
    ),
    'seoul-severance-hospital': createCopyRecord(
      '延世大学新村校区旁的大型医院，与校园、地铁和西大门区交通联系紧密。',
      'A major hospital beside Yonsei Sinchon Campus with close links to the university, metro, and Seodaemun transit.',
    ),
    'seoul-id-hospital': createCopyRecord(
      '江南岛山大路沿线的整形医疗地点，适合承接已确认的咨询或复诊安排。',
      'A plastic-surgery medical destination along Dosan-daero for confirmed consultations or follow-up visits.',
    ),
    'seoul-jk-plastic-surgery': createCopyRecord(
      '论岘与狎鸥亭之间的整形外科目的地，前往前应以个人预约信息为准。',
      "A plastic-surgery destination between Nonhyeon and Apgujeong; visit details should follow the user's appointment.",
    ),
    'seoul-the-plus-plastic-surgery': createCopyRecord(
      '林荫道附近的整形外科地点，可用于安排咨询、术前或术后相关行程。',
      'A plastic-surgery destination near Garosu-gil for consultation, pre-procedure, or follow-up journeys.',
    ),
    'seoul-sillim-one-room-district': createCopyRecord(
      '新林洞大学街周边的小户型住宅片区，日常生活、通勤与社区商业距离较近。',
      'A compact-housing district around Sillim university streets, with everyday life, commuting, and neighborhood retail close together.',
    ),
    'seoul-lh-gangnam-complex-3': createCopyRecord(
      '紫谷洞一带的公共住宅社区，属于以长期居住和家庭日常为主的生活片区。',
      'A public-housing community around Jagok-dong shaped primarily by long-term residence and family routines.',
    ),
    'seoul-mokdong-apartment-district': createCopyRecord(
      '木洞新市镇的成片公寓社区，学校、公园与日常商业共同构成稳定生活圈。',
      'A broad apartment district in Mokdong New Town where schools, parks, and everyday retail form an established neighborhood.',
    ),
    'seoul-sanggye-jugong-district': createCopyRecord(
      '上溪洞的大型住宅社区群，靠近地铁、社区商业与芦原区日常公共设施。',
      'A large residential cluster in Sanggye-dong near metro access, neighborhood retail, and Nowon public services.',
    ),
    'seoul-raemian-one-bailey': createCopyRecord(
      '盘浦汉江住宅带的高端公寓项目，地点内容以片区识别和私人行程为主。',
      'A premium apartment development in the Banpo riverfront residential belt, intended for area recognition and private journeys.',
    ),
    'seoul-acro-river-park': createCopyRecord(
      '盘浦大桥附近的高端住宅项目，临近汉江公园与瑞草区主要生活设施。',
      'A premium residential development near Banpo Bridge, the Han River parks, and major Seocho amenities.',
    ),
    'seoul-hannam-the-hill': createCopyRecord(
      '汉南洞山坡上的高私密住宅项目，适合私人地址识别，不作为公共参观点介绍。',
      'A high-privacy residential development on the Hannam hillside, presented for private address recognition rather than public sightseeing.',
    ),
    'seoul-ph129-cheongdam': createCopyRecord(
      '清潭洞的高私密住宅坐标，周边连接汉江、精品商业与江南北部道路。',
      'A high-privacy residential point in Cheongdam near the Han River, luxury retail, and northern Gangnam roads.',
    ),
    'seoul-incheon-airport-t1': createCopyRecord(
      '首尔都会区主要国际航空门户之一，集合值机、入境、铁路与机场巴士换乘。',
      'A primary international air gateway for the Seoul region, combining check-in, arrivals, rail, and airport-bus transfers.',
    ),
    'seoul-gimpo-airport': createCopyRecord(
      '首尔西部的航空与轨道交通枢纽，可衔接国内航线、部分国际航线及多条地铁。',
      'An air-and-rail hub in western Seoul connecting domestic flights, selected international routes, and several metro lines.',
    ),
    'seoul-gangnam-station': createCopyRecord(
      '江南大路与德黑兰路交会处的繁忙换乘节点，周边办公、餐饮与夜间活动密集。',
      'A busy interchange where Gangnam-daero meets Teheran-ro, surrounded by offices, dining, and nightlife.',
    ),
    'seoul-express-bus-terminal': createCopyRecord(
      '连接长途客运、多条地铁和地下商业街的大型换乘枢纽，步行范围较复杂。',
      'A large interchange combining intercity buses, several metro lines, and underground retail across a complex walking area.',
    ),
    'seoul-yongsan-station': createCopyRecord(
      '龙山的铁路与地铁枢纽，与 I-Park Mall、影院和汉江大路商业设施直接相连。',
      'A Yongsan rail and metro hub directly connected to I Park Mall, cinema, and Hangang-daero retail.',
    ),
    'seoul-cheongnyangni-station': createCopyRecord(
      '首尔东北部的重要铁路换乘站，可衔接市内地铁、区域列车与东部生活圈。',
      'A major rail interchange in northeastern Seoul connecting metro services, regional trains, and eastern neighborhoods.',
    ),
    'seoul-forest': createCopyRecord(
      '城东区的大型城市绿地，以林荫步道、草地、生态空间和汉江方向的休闲路线为主。',
      'A large urban green space in Seongdong with wooded walks, lawns, ecological areas, and leisure routes toward the river.',
    ),
    'seoul-olympic-park': createCopyRecord(
      '松坡的大型公园与赛事遗产空间，分布着步道、雕塑、场馆和开阔草地。',
      'A large Songpa park and sporting-heritage site with paths, sculptures, arenas, and broad lawns.',
    ),
    'seoul-yeouido-hangang-park': createCopyRecord(
      '汝矣岛沿江的开放公园，适合散步、骑行、野餐与观看首尔汉江天际线。',
      'An open riverfront park in Yeouido for walking, cycling, picnics, and viewing the Seoul skyline.',
    ),
    'seoul-national-university': createCopyRecord(
      '冠岳山脚的大型大学校园，教学楼、图书馆和校园交通分布范围较广。',
      'A large university campus at the foot of Gwanaksan with widely distributed academic buildings, libraries, and campus transit.',
    ),
    'seoul-yonsei-university': createCopyRecord(
      '新村的历史校园目的地，以林荫主路、教学建筑与周边大学街生活圈相连。',
      'A historic Sinchon campus organized around a tree-lined central route and connected to the surrounding university district.',
    ),
    'seoul-korea-university': createCopyRecord(
      '安岩洞的大学校园，以石造建筑、校园广场和周边学生生活街区为主要印象。',
      'An Anam university campus known for stone buildings, campus squares, and the surrounding student neighborhood.',
    ),
    'seoul-four-seasons-hotel': createCopyRecord(
      '光化门附近的高端酒店目的地，便于衔接市中心商务、宫阙与文化行程。',
      'A premium hotel near Gwanghwamun with easy links to central business, palace, and cultural itineraries.',
    ),
    'seoul-shilla-hotel': createCopyRecord(
      '南山与奖忠洞之间的地标酒店，环境相对独立，适合住宿、会面与正式活动。',
      'A landmark hotel between Namsan and Jangchung-dong with a self-contained setting for stays, meetings, and formal events.',
    ),
    'seoul-signiel': createCopyRecord(
      '位于乐天世界塔高层的酒店目的地，可与蚕室观景、商务或庆祝行程组合。',
      'A high-rise hotel within Lotte World Tower that pairs naturally with observation, business, or celebration plans in Jamsil.',
    ),
    'seoul-jongno-five-pharmacy-street': createCopyRecord(
      '钟路五街周边的药房聚集区，适合在步行范围内比较日常药品与健康用品。',
      'A pharmacy cluster around Jongno 5-ga for comparing everyday medicines and health supplies within a walkable area.',
    ),
    'seoul-namdaemun-pharmacy-district': createCopyRecord(
      '南大门市场附近的药房商圈，可与市场采购和市中心步行行程一起安排。',
      'A pharmacy district near Namdaemun Market that can be combined with market shopping and central Seoul walking routes.',
    ),
    'seoul-gangnam-station-pharmacy-district': createCopyRecord(
      '江南站周边的药房密集片区，方便在通勤或就诊行程之间完成日常购药。',
      'A pharmacy-rich area around Gangnam Station for everyday medicine purchases between commutes or medical visits.',
    ),
    'seoul-jamsil-sports-complex': createCopyRecord(
      '蚕室的大型体育场馆群，可承接棒球、田径、演出与大规模观众活动。',
      'A large Jamsil sports complex for baseball, athletics, concerts, and high-capacity public events.',
    ),
    'seoul-mokdong-sports-complex': createCopyRecord(
      '木洞的综合体育设施群，为球赛、冰上活动和社区体育提供明确目的地。',
      'A multi-venue sports complex in Mokdong for games, ice activities, and community athletics.',
    ),
    'seoul-jangchung-arena': createCopyRecord(
      '南山北侧的室内体育馆，规模紧凑，适合球赛、演出与室内大型活动。',
      'A compact indoor arena north of Namsan used for sports, concerts, and other large indoor events.',
    ),
    'seoul-cgv-yongsan-ipark': createCopyRecord(
      '龙山站商业综合体内的大型影院，可直接衔接铁路、餐饮与购物行程。',
      'A major cinema inside the Yongsan Station complex with direct links to rail, dining, and shopping.',
    ),
    'seoul-megabox-coex': createCopyRecord(
      'COEX 商业与会展网络中的影院目的地，适合与展览、购物或三成洞会面组合。',
      'A cinema within the COEX retail and convention network, easy to pair with exhibitions, shopping, or Samseong meetings.',
    ),
    'seoul-lotte-cinema-world-tower': createCopyRecord(
      '乐天世界塔商业群内的多厅影院，可与蚕室购物、观景和餐饮安排衔接。',
      'A multiplex in the Lotte World Tower complex that connects with Jamsil shopping, observation, and dining plans.',
    ),
    'seoul-cgv-wangsimni': createCopyRecord(
      '往十里站综合商业空间内的影院，适合作为换乘途中或社区休闲的一站。',
      'A cinema in the Wangsimni Station complex for a transfer-time stop or neighborhood leisure visit.',
    ),
    'seoul-bank-of-korea-main': createCopyRecord(
      '南大门路的中央银行历史建筑地标，连接金融区、货币文化展示与市中心步行。',
      'A historic central-bank landmark on Namdaemun-ro linking the financial district, monetary culture, and central walks.',
    ),
    'seoul-kb-kookmin-headquarters': createCopyRecord(
      '汝矣岛金融区的银行总部办公地点，周边聚集企业、证券与商务服务。',
      'A bank headquarters workplace in Yeouido financial district, surrounded by corporate, securities, and business services.',
    ),
    'seoul-shinhan-bank-headquarters': createCopyRecord(
      '首尔站与市厅之间的银行总部目的地，适合安排正式金融或企业会面。',
      'A bank headquarters between Seoul Station and City Hall for formal financial or corporate meetings.',
    ),
    'seoul-woori-bank-headquarters': createCopyRecord(
      '小公洞商务区的银行总部地点，邻近明洞、南大门与市中心办公网络。',
      'A bank headquarters in the Sogong-dong business district near Myeongdong, Namdaemun, and central offices.',
    ),
    'seoul-national-police-agency': createCopyRecord(
      '西大门区的国家级公共安全机构地点，主要用于正式事务与公共服务行程。',
      'A national public-safety institution in Seodaemun, primarily relevant to formal business and public-service journeys.',
    ),
    'seoul-metropolitan-police-agency': createCopyRecord(
      '景福宫西侧的首尔警务机构地点，周边连接政府办公与城市公共服务区域。',
      'A Seoul police institution west of Gyeongbokgung, connected to government offices and civic-service areas.',
    ),
    'seoul-fire-disaster-headquarters': createCopyRecord(
      '中区的消防与灾害应对机构地点，用于相关公务、访问或城市安全行程。',
      'A fire and disaster-response institution in Jung-gu for official, visiting, or city-safety journeys.',
    ),
    'seoul-gangnam-fire-station': createCopyRecord(
      '德黑兰路东段的消防公共服务地点，服务江南办公区及周边社区。',
      'A fire-service location on eastern Teheran-ro serving the Gangnam office district and nearby neighborhoods.',
    ),
    'seoul-myeongdong-kyoja-main': createCopyRecord(
      '明洞步行街里的面食餐厅目的地，以刀切面、饺子等简洁菜单形成明确用餐主题。',
      'A noodle-focused restaurant destination in Myeongdong whose concise menu centers on kalguksu and dumplings.',
    ),
    'seoul-london-bagel-museum-anguk': createCopyRecord(
      '安国与北村步行范围内的贝果餐饮地点，适合纳入早餐、咖啡或街区散步行程。',
      'A bagel destination within walking distance of Anguk and Bukchon, suited to breakfast, coffee, or a neighborhood walk.',
    ),
    'seoul-knotted-cheongdam': createCopyRecord(
      '清潭商业街区中的甜点店目的地，可作为咖啡、甜品或短暂停留的一站。',
      'A dessert-shop destination in Cheongdam for coffee, sweets, or a short pause between nearby plans.',
    ),
    'seoul-kyochon-chicken-yeoksam-1': createCopyRecord(
      '驿三与江南站之间的炸鸡餐饮地点，适合下班后用餐或多人分享。',
      'A fried-chicken destination between Yeoksam and Gangnam Station for after-work meals or group sharing.',
    ),
    'seoul-eggdrop-gangnam-woosung': createCopyRecord(
      '江南大路南段的快速三明治餐饮地点，适合早餐、外带或短时间用餐。',
      'A quick sandwich destination on southern Gangnam-daero for breakfast, takeaway, or a short meal.',
    ),
  }),
  'cyber-wasteland-v1': Object.freeze({
    'waste-helix-spire': createCopyRecord(
      '协约控制的垂直科技城塞，主数据节点与严密门禁让这里成为高风险交涉地点。',
      'A Covenant-controlled vertical technocitadel whose primary data node and strict access make every meeting high-risk.',
    ),
    'waste-rust-foundry': createCopyRecord(
      '同盟的重工与车队维修核心，熔炉、燃料储罐和持续运转的工场占据地平线。',
      'The Union industrial and convoy-repair core, dominated by furnaces, fuel reservoirs, and constantly running workshops.',
    ),
    'waste-verdant-vault': createCopyRecord(
      '被封闭生态穹顶保护的种子库与净水设施，是荒原中少数仍保持绿色的区域。',
      'A sealed biosphere protecting seed banks and water systems, one of the few places in the wasteland that remains green.',
    ),
    'waste-freeband-port': createCopyRecord(
      '由拼装飞艇与载具围成的自由港，商队、修理摊和走私交易随时改变位置。',
      'A free port assembled from patched skiffs and vehicles, where caravans, repair stalls, and illicit trade constantly shift.',
    ),
    'waste-ash-market': createCopyRecord(
      '四方势力暂时停火的中立市场，物资交换、消息买卖与危险会面同时发生。',
      'A neutral market under a fragile four-faction ceasefire, where supplies, information, and dangerous meetings change hands.',
    ),
    'waste-blackrain-clinic': createCopyRecord(
      '藏在废弃磁悬站下方的地下诊所，以有限电力维持急救、修复和秘密治疗。',
      'An underground clinic beneath an abandoned maglev station, using limited power for emergency care, repairs, and covert treatment.',
    ),
    'waste-dead-grid': createCopyRecord(
      '传感器与通信同时失效的无主区，地图只能标出边界，无法保证其中任何路径。',
      'An unclaimed zone where sensors and communications fail together; the map can mark its edge but cannot promise a route within.',
    ),
  }),
})

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

const resolveAuthoredCopy = (place = {}) => {
  const summaryZh = normalizeText(place.summaryZh || place.descriptionZh)
  const summaryEn = normalizeText(place.summaryEn || place.descriptionEn)
  if (!summaryZh && !summaryEn) return null
  return {
    summaryZh: summaryZh || summaryEn,
    summaryEn: summaryEn || summaryZh,
    source: 'place_record',
  }
}

const resolveRegisteredCopy = (place = {}, mapPackId = '') => {
  const placeId = normalizeText(place.placeId || place.id)
  const record = MAP_PLACE_COPY_REGISTRY[mapPackId]?.[placeId]
  return record ? { ...record, source: 'map_copy_registry' } : null
}

const createContextualFallback = (place = {}, categoryVisual = {}) => {
  const nameZh = normalizeText(place.nameZh || place.label || place.nameEn) || '这个地点'
  const nameEn = normalizeText(place.nameEn || place.label || place.nameZh) || 'This place'
  const detailZh = normalizeText(place.detailZh || place.detail)
  const detailEn = normalizeText(place.detailEn || place.detail)
  const categoryZh = normalizeText(categoryVisual.descriptionZh) || '地图中的地点'
  const categoryEn = normalizeText(categoryVisual.descriptionEn) || 'a place on the map'
  const isUserPlace = place.source === 'user'

  if (isUserPlace) {
    return {
      summaryZh: detailZh
        ? `你保存的“${nameZh}”，位置备注为${detailZh}。可从这里继续安排前往或现场互动。`
        : `你保存的“${nameZh}”，属于${categoryZh}。可从这里继续安排前往或现场互动。`,
      summaryEn: detailEn
        ? `Your saved place “${nameEn}” has the location note ${detailEn}. Continue here to plan a journey or interact onsite.`
        : `Your saved place “${nameEn}” is ${categoryEn}. Continue here to plan a journey or interact onsite.`,
      source: 'user_place_context',
    }
  }

  return {
    summaryZh: `${nameZh}是${categoryZh}。卡片仅使用现有地点记录，不补充未经核实的营业或服务信息。`,
    summaryEn: `${nameEn} is ${categoryEn}. This card uses only the saved place record and adds no unverified hours or services.`,
    source: 'bounded_context_fallback',
  }
}

export const resolveMapPlaceCopy = (place = {}, mapPackId = '', categoryVisual = {}) =>
  resolveAuthoredCopy(place) ||
  resolveRegisteredCopy(place, mapPackId) ||
  createContextualFallback(place, categoryVisual)
