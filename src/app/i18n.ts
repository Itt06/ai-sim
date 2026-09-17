const EXACT: Record<string, string> = {
    'C I T Y   B U I L D E R': '街づくりシミュレーション',
    'Start Game': 'ゲームを始める', 'Load Game': 'ゲームを読み込む', 'No save found': 'セーブデータがありません',
    'Select / Inspect (F1)': '選択・調査（F1）', 'Road (F2)': '道路（F2）', 'Construction (F3)': '建設（F3）',
    'Bulldoze (F4)': '撤去（F4）', 'Save game (Ctrl+S)': 'ゲームを保存（Ctrl+S）',
    'Pause': '一時停止', 'Normal speed': '通常速度', 'Open city overview': '街の概要を開く',
    'City Feed': '街のニュース', 'No news yet…': 'まだニュースはありません…',
    'Construction': '建設', 'Residence': '住宅', 'Business': '事業所', 'Fire Station': '消防署',
    'Police Station': '警察署', 'Hospital': '病院', 'Landfill': 'ごみ処理場', 'Prison': '刑務所',
    'Supermarket': 'スーパーマーケット', 'School': '学校', 'Park': '公園', 'Beach': '海岸', 'Cemetery': '墓地',
    'City services': '都市サービス', 'Healthcare': '医療', 'Education': '教育', 'Police': '警察',
    'Fire protection': '消防', 'Garbage collection': 'ごみ収集', 'Jail capacity': '収容能力',
    'Vacant work building': '空き事業所', 'No business operates here.': 'ここでは事業が営業していません。',
    'Positions': '職位', 'Inventory': '在庫', 'Employees': '従業員', 'No employees yet.': '従業員はいません。',
    'Population': '人口', 'Employment': '雇用', 'Economy': '経済', 'Since this session': 'このセッションの記録',
    'Residents': '住民', 'Age': '年齢', 'Gender': '性別', 'Home': '住居', 'Homeless': '住居なし',
    'Needs': '欲求', 'Mood': '気分', 'Today': '今日', 'Work': '仕事', 'Unemployed': '無職',
    'Skills': 'スキル', 'Relationships': '人間関係', 'Possessions': '持ち物', 'Life events': '人生の出来事',
    'Now': '現在', 'Balance': '残高', 'Shift': '勤務時間', 'School basics': '基礎学力',
    'No recorded events yet.': '記録された出来事はありません。',
    'The coverage ledger has not measured the town yet.': '都市サービスの充足状況はまだ計測されていません。',
    'Open the city services overview': '都市サービスの概要を開く',
    'Dismiss (returns if another service degrades)': '閉じる（別のサービスが悪化すると再表示されます）',
    'Game saved': 'ゲームを保存しました', 'Game loaded': 'ゲームを読み込みました',
    'male': '男性', 'female': '女性', 'nonbinary': 'ノンバイナリー', 'single': '独身', 'married': '既婚',
    'hunger': '空腹', 'rest': '休息', 'company': '交流', 'fun': '楽しさ', 'hygiene': '衛生', 'comfort': '快適さ',
    'Sleeping': '睡眠中', 'Resting': '休憩中', 'Reading': '読書中', 'Wandering around': '散歩中',
    'Working the register': 'レジ業務中', 'Doing paperwork': '事務作業中', 'Doing rounds': '巡回中',
    'Working the kitchen': '調理中', 'Doing manual labor': '作業中', 'Teaching a class': '授業中',
    'Fixing equipment': '設備を修理中', 'Keeping watch': '警備中', 'Cleaning the premises': '施設を清掃中',
    'Driving a route': '運行中', 'Treating patients': '患者を治療中', 'Styling clients': '接客中',
    'Running a coaching session': '指導中', 'Drafting designs': '設計中', 'Screening a film': '映画を上映中',
    'Sitting in the park': '公園で過ごしています', 'Visiting the beach': '海岸を訪れています',
    'Spending time at the bar': 'バーで過ごしています', 'Going on a shopping trip': '買い物に出かけています',
    'Browsing a store': '店内を見ています', 'Exercising': '運動中', 'Gardening': '庭仕事中',
    'Cleaning the house': '家を掃除中', 'Cooking a meal': '料理中', 'Watching television': 'テレビを見ています',
    'Using the computer': 'パソコンを使っています', 'Studying': '勉強中', 'Working on a hobby': '趣味を楽しんでいます',
    'Caring for the children': '子どもの世話中', 'Running errands': '用事を済ませています',
    'Playing at the playground': '遊び場で遊んでいます', 'Spending time at home': '家で過ごしています',
    'Taking a walk': '散歩中', 'Listening to music': '音楽を聴いています', 'People watching': '人間観察中',
    'Math': '数学', 'Writing': '作文', 'Speaking': '会話', 'Biology': '生物学', 'Geography': '地理',
    'History': '歴史', 'Physics': '物理学', 'Chemistry': '化学', 'Digital Literacy': '情報活用',
    'Problem Solving': '問題解決', 'Physical Coordination': '身体能力', 'Music': '音楽', 'Art': '美術', 'Civics': '公民',
    'Super Market': 'スーパーマーケット', 'Restaurant': 'レストラン', 'Construction Site': '建設現場', 'Bakery': 'パン屋',
    'Café': 'カフェ', 'Pharmacy': '薬局', 'Clinic': '診療所', 'Clothing Store': '衣料品店',
    'Electronics Store': '家電店', 'Hardware Store': '金物店', 'Bank': '銀行', 'Salon': '美容院',
    'Auto Repair Shop': '自動車修理工場', 'Gym': 'スポーツジム', 'Cinema': '映画館', 'Hotel': 'ホテル',
    'Farm': '農場', 'Factory': '工場', 'Distribution Warehouse': '物流倉庫', 'Bar': 'バー',
    'Bookstore': '書店', 'Toy Store': 'おもちゃ店', 'Pet Shop': 'ペットショップ', 'Music Studio': '音楽スタジオ',
    'Art Studio': '美術スタジオ', 'Dentist Office': '歯科医院', 'Veterinary Clinic': '動物病院',
    'Laundromat': 'コインランドリー', 'Library': '図書館', 'Post Office': '郵便局', 'Church': '教会',
    'Sports Complex': 'スポーツ施設', 'County Jail': '刑務所',
    'Checkout Clerk': 'レジ係', 'Restocker': '品出し係', 'Janitor': '清掃員', 'Manager': '管理者',
    'Doctor': '医師', 'Nurse': '看護師', 'Teacher': '教師', 'Cook': '料理人', 'Waiter': '給仕',
    'Laborer': '作業員', 'Baker': 'パン職人', 'Barista': 'バリスタ', 'Sales Associate': '販売員',
    'Electronics Technician': '電子機器技術者', 'Hardware Clerk': '金物店員', 'Bank Teller': '銀行窓口係',
    'Accountant': '会計士', 'Security Guard': '警備員', 'Hairdresser': '美容師', 'Beautician': '美容施術者',
    'Mechanic': '整備士', 'Service Advisor': 'サービス担当者', 'Fitness Trainer': 'フィットネストレーナー',
    'Receptionist': '受付係', 'Projectionist': '映写技師', 'Usher': '案内係', 'Ticket Clerk': 'チケット係',
    'Housekeeper': '客室係', 'Concierge': 'コンシェルジュ', 'Pharmacist': '薬剤師', 'Delivery Driver': '配達員',
    'Engineer': '技術者', 'Architect': '建築家', 'Police Officer': '警察官', 'Corrections Officer': '刑務官',
    'Garbage Collector': 'ごみ収集員', 'Firefighter': '消防士',
    'Passed away': '亡くなりました', 'Was intimate': '親密な時間を過ごしました', 'Became pregnant': '妊娠しました',
    'Got married': '結婚しました', 'Got divorced': '離婚しました', 'Started a new job': '新しい仕事を始めました',
    'Was laid off': '解雇されました', 'Retired': '退職しました', 'Fell ill': '病気になりました',
    'Was injured in an accident': '事故でけがをしました', 'Recovered their health': '健康を取り戻しました',
    'Finished trade school': '職業学校を卒業しました', 'Qualified as a nurse': '看護師の資格を取得しました',
    'Woke up': '目を覚ましました', 'Started working': '仕事を始めました', 'Stopped working': '仕事を終えました',
    'Caught a cold': '風邪をひきました', 'Caught the flu': 'インフルエンザにかかりました',
    'Recovered from an illness': '病気から回復しました', 'Sprained an ankle': '足首を捻挫しました',
    'Got a migraine': '片頭痛になりました', 'Pulled a muscle': '筋肉を痛めました',
    'Had a routine checkup': '定期健診を受けました', 'Got vaccinated': '予防接種を受けました',
    'Started wearing glasses': '眼鏡を使い始めました', 'Had surgery': '手術を受けました',
    'Was hospitalized': '入院しました', 'Donated blood': '献血しました', 'Got food poisoning': '食中毒になりました',
    'Had a first kiss': '初めてのキスをしました', 'Developed a crush': '恋心を抱きました',
    'Was turned down': '告白を断られました', 'Started dating': '交際を始めました', 'Made it official': '正式に交際しました',
    'Eloped': '駆け落ちしました', 'Had a wedding anniversary': '結婚記念日を迎えました',
    'Broke up': '別れました', 'Got back together': '復縁しました', 'Moved in with partner': 'パートナーと同居を始めました',
    'Fell in love': '恋に落ちました', 'Fell out of love': '愛情が冷めました', 'Gave birth': '出産しました',
    'Became a parent': '親になりました', 'Adopted a child': '子どもを養子に迎えました',
    'Died in an accident': '事故で亡くなりました',
    'Died peacefully in their sleep': '眠るように穏やかに亡くなりました', 'Lost a spouse': '配偶者を亡くしました',
    'Lost a parent': '親を亡くしました', 'Lost a child': '子どもを亡くしました', 'Attended a funeral': '葬儀に参列しました',
    'Got a job': '就職しました', 'Had a first day at work': '初出勤しました', 'Got promoted': '昇進しました',
    'Got demoted': '降格しました', 'Got a raise': '昇給しました', 'Was fired': '解雇されました',
    'Quit their job': '仕事を辞めました', 'Went to work': '出勤しました', 'Finished a shift': '勤務を終えました',
    'Worked overtime': '残業しました', 'Called in sick': '病欠しました', 'Was late for work': '仕事に遅刻しました',
    'Your town has no working healthcare - the sick recover slowly, and more of them die.': 'この街には機能している医療施設がありません。病人の回復が遅くなり、死亡率も上がります。',
    'Your town has no school seats - children grow up without their basics.': 'この街には学校の定員がありません。子どもたちは基礎教育を受けられずに成長します。',
    'Your town is unpoliced - crimes go unanswered, and people learn they can get away with it.': 'この街には警察機能がありません。犯罪に対処できず、治安が悪化します。',
    'Your town has no fire protection - fires burn buildings to the ground.': 'この街には消防機能がありません。火災が建物を焼き尽くします。',
    'Your town has no garbage collection - trash piles up on the curbs.': 'この街にはごみ収集がありません。道路沿いにごみが積み上がります。',
    'Your town has no jail - sentences are served in the police station holding cell.': 'この街には刑務所がありません。受刑者は警察署の留置場に収容されます。',
};

const PHRASES: Array<[RegExp, string]> = [
    [/^(\d+)× speed$/, '$1倍速'], [/^(.+) — overview$/, '$1 — 街の概要'], [/^Casa (.+)$/, '$1家'],
    [/^size (\d+)$/, '規模 $1'], [/^(\d+) open$/, '空き $1'], [/^… (\d+) more$/, '…ほか$1件'],
    [/^(\d+) more abilities$/, 'ほか$1個の能力'], [/^contains (\d+)$/, '$1個を収納'],
    [/^Save failed: (.+)$/, '保存に失敗しました: $1'], [/^Load failed: (.+)$/, '読み込みに失敗しました: $1'],
    [/^Residents on the map:/, 'マップ上の住民:'], [/^Households:/, '世帯数:'], [/^Homeless:/, '住居なし:'],
    [/^Genealogy pool:/, '系譜プール:'], [/^Employed adults:/, '就業中の成人:'], [/^Unemployed adults:/, '無職の成人:'],
    [/^Open positions:/, '空き職:'], [/^Vacant work buildings:/, '空き事業所:'], [/^In the red:/, '赤字の事業所:'],
    [/^By line of work:/, '業種別:'], [/^Aggregate household wealth:/, '世帯の総資産:'],
    [/^Aggregate business balance:/, '事業所の総残高:'], [/^Households in arrears:/, '滞納中の世帯:'],
    [/^Births:/, '出生:'], [/Deaths:/g, '死亡:'], [/^Bankruptcies:/, '倒産:'], [/Evictions:/g, '立ち退き:'],
    [/ living \/ /g, '人存命 / 全'], [/ total$/g, '人'], [/ household\(s\)/g, '世帯'], [/ people\)/g, '人）'],
    [/^Build: /, '建設: '], [/^Last P&L:/, '直近の損益:'], [/ filled$/g, '人就業'],
    [/^since /, '習得時期 '], [/ earlier entries$/g, '件の過去の記録'], [/^a house$/, '住宅'], [/^a building$/, '建物'],
    [/^Year (\d+), (\d+)\/(\d+)/, '$1年 $2月$3日'], [/^Became friends with (.+)$/, '$1と友人になりました'],
    [/^Had a falling-out with (.+)$/, '$1と仲違いしました'], [/^Went on a first date with (.+)$/, '$1と初めてデートしました'],
    [/^Asked (.+) out$/, '$1をデートに誘いました'], [/^Got engaged to (.+)$/, '$1と婚約しました'],
];

export function ja(value: string): string {
    const leading = value.match(/^\s*/)?.[0] ?? '';
    const trailing = value.match(/\s*$/)?.[0] ?? '';
    const trimmed = value.trim();
    let result = EXACT[trimmed] ?? trimmed;
    for (const [pattern, replacement] of PHRASES) result = result.replace(pattern, replacement);
    return leading + result + trailing;
}

function localizeNode(root: Node): void {
    const translateText = (node: Node): void => {
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
            const localized = ja(node.nodeValue);
            if (localized !== node.nodeValue) node.nodeValue = localized;
        }
    };
    translateText(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) translateText(node);
    const elements = root instanceof Element ? [root, ...root.querySelectorAll('*')] : [];
    for (const element of elements) for (const attr of ['title', 'aria-label', 'placeholder']) {
        const value = element.getAttribute(attr);
        if (value) {
            const localized = ja(value);
            if (localized !== value) element.setAttribute(attr, localized);
        }
    }
}

export function installJapaneseLocalization(): void {
    document.documentElement.lang = 'ja';
    localizeNode(document.body);
    new MutationObserver(records => records.forEach(record => {
        if (record.type === 'characterData') localizeNode(record.target);
        record.addedNodes.forEach(localizeNode);
    })).observe(document.body, { childList: true, subtree: true, characterData: true });
}
