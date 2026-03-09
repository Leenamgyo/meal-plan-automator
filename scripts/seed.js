#!/usr/bin/env node
/**
 * SQLite 로컬 DB 더미 데이터 시드 스크립트
 * 사용법: node scripts/seed.js [API_URL]
 * 기본 URL: http://127.0.0.1:3737/api
 *
 * 이 스크립트는 기존 데이터를 삭제 후 다시 생성합니다 (테스트용).
 * meal_data는 MealEntry 형식 { name, category_id, color } 으로 생성됩니다.
 */

const API_URL = process.argv[2] || 'http://127.0.0.1:3737/api';

const categories = [
    { name: '밥',       color: '#f08c00' },
    { name: '국/찌개',  color: '#e8590c' },
    { name: '주메뉴',   color: '#ff6b6b' },
    { name: '부메뉴',   color: '#339af0' },
    { name: '밑반찬',   color: '#20c997' },
    { name: '김치/기타', color: '#845ef7' },
];

// 메뉴 이름 → 재료 목록 (주요 메뉴만 지정, 나머지는 빈 배열)
const ingredientsMap = {
    '된장찌개':     ['된장', '두부', '애호박', '감자', '양파', '대파'],
    '김치찌개':     ['김치', '돼지고기', '두부', '대파', '고추가루'],
    '미역국':       ['미역', '소고기', '참기름', '간장'],
    '콩나물국':     ['콩나물', '대파', '간장', '고추가루'],
    '소고기무국':   ['소고기', '무', '대파', '간장', '마늘'],
    '순두부찌개':   ['순두부', '바지락', '고추가루', '계란', '대파'],
    '육개장':       ['소고기', '고사리', '숙주', '대파', '고추기름'],
    '갈비탕':       ['소갈비', '무', '대파', '마늘', '소금'],
    '제육볶음':     ['돼지고기', '고추장', '고추가루', '양파', '대파', '마늘', '생강'],
    '소불고기':     ['소고기', '간장', '설탕', '참기름', '배', '양파', '마늘'],
    '닭갈비':       ['닭고기', '고추장', '고추가루', '양파', '대파', '고구마', '양배추'],
    '오징어볶음':   ['오징어', '고추장', '양파', '당근', '대파', '마늘'],
    '고등어조림':   ['고등어', '무', '간장', '고추가루', '대파', '마늘'],
    '갈치조림':     ['갈치', '무', '고추가루', '간장', '대파'],
    '닭볶음탕':     ['닭고기', '감자', '당근', '양파', '고추장', '간장'],
    '돈까스':       ['돼지고기', '빵가루', '계란', '밀가루', '기름'],
    '보쌈':         ['돼지고기', '된장', '마늘', '생강', '대파'],
    '소갈비찜':     ['소갈비', '간장', '설탕', '당근', '밤', '은행', '마늘'],
    '카레라이스':   ['카레가루', '감자', '당근', '양파', '닭고기'],
    '계란말이':     ['계란', '당근', '대파', '소금', '식용유'],
    '계란찜':       ['계란', '멸치육수', '대파', '소금'],
    '두부조림':     ['두부', '간장', '고추가루', '대파', '참기름'],
    '어묵볶음':     ['어묵', '양파', '대파', '간장', '참기름'],
    '잡채':         ['당면', '시금치', '당근', '양파', '소고기', '간장', '참기름'],
    '시금치나물':   ['시금치', '마늘', '참기름', '간장'],
    '콩나물무침':   ['콩나물', '대파', '마늘', '참기름', '고추가루'],
    '고사리나물':   ['고사리', '간장', '마늘', '참기름', '들기름'],
    '도라지무침':   ['도라지', '고추장', '마늘', '참기름', '식초'],
    '애호박볶음':   ['애호박', '양파', '마늘', '소금', '참기름'],
    '가지볶음':     ['가지', '마늘', '간장', '참기름', '고추가루'],
    '배추김치':     ['배추', '고추가루', '마늘', '생강', '멸치액젓', '파'],
    '깍두기':       ['무', '고추가루', '마늘', '생강', '멸치액젓'],
    '열무김치':     ['열무', '고추가루', '마늘', '생강', '멸치액젓'],
    '오이소박이':   ['오이', '부추', '고추가루', '마늘', '생강'],
};

const rawMenus = {
    '밥': [
        '쌀밥', '현미밥', '흑미밥', '기장밥', '콩밥', '잡곡밥', '볶음밥', '비빔밥', '보리밥', '완두콩밥',
        '수수밥', '귀리밥', '밤밥', '나물밥', '곤드레나물밥', '취나물밥', '무밥', '콩나물밥', '영양돌솥밥', '버섯밥',
    ],
    '국/찌개': [
        '된장찌개', '김치찌개', '미역국', '콩나물국', '소고기무국', '시금치된장국', '순두부찌개', '부대찌개', '청국장', '감자탕',
        '뼈해장국', '어묵국', '계란국', '홍합탕', '동태찌개', '육개장', '갈비탕', '설렁탕', '곰탕', '삼계탕',
        '북엇국', '오징어국', '꽃게탕', '아욱국', '배추된장국', '떡국', '만둣국', '수제비', '칼국수', '우거지해장국',
        '선지해장국', '황태해장국', '차돌된장찌개', '해물순두부', '알탕', '동죽조개탕', '대구탕', '매생이굴국', '다슬기국', '김칫국',
    ],
    '주메뉴': [
        '제육볶음', '소불고기', '닭갈비', '오징어볶음', '고등어조림', '갈치조림', '꽁치김치조림', '닭볶음탕', '간장찜닭', '돈까스',
        '탕수육', '보쌈', '족발', '삼겹살구이', '훈제오리', '소갈비찜', '돼지갈비찜', '해물찜', '아귀찜', '코다리조림',
        '마파두부', '쭈꾸미볶음', '낙지볶음', '고추장불고기', '간장불고기', '깐풍기', '고등어구이', '삼치구이', '가자미구이', '조기구이',
        '갈치구이', '떡갈비', '함박스테이크', '오리주물럭', '돼지고기김치찜', '카레라이스', '짜장밥', '마라샹궈', '유산슬', '팔보채',
        '동파육', '깐쇼새우', '찹스테이크', '소세지야채볶음', '치즈닭갈비',
    ],
    '부메뉴': [
        '계란말이', '계란찜', '두부부침', '두부조림', '어묵볶음', '떡볶이', '스팸구이', '베이컨숙주볶음', '진미채볶음', '멸치볶음',
        '쥐포볶음', '마늘쫑새우볶음', '메추리알장조림', '소고기장조림', '돼지고기장조림', '분홍소시지전', '동그랑땡', '생선까스', '감자채볶음', '단호박범벅',
        '잡채', '콘치즈', '마카로니샐러드', '야채튀김', '고구마튀김', '김말이튀김', '새우튀김', '오징어튀김', '너비아니구이', '두부김치',
        '도토리묵무침', '청포묵무침', '오꼬노미야끼', '순대볶음', '만두탕수', '고추잡채', '연어구이', '참치김치볶음', '새송이버섯전', '애호박전',
        '김치전', '해물파전', '부추전', '건새우볶음', '연근조림', '우엉조림', '오징어초무침', '골뱅이무침', '비엔나소시지볶음', '맛살볶음',
    ],
    '밑반찬': [
        '시금치나물', '콩나물무침', '숙주나물', '고사리나물', '도라지무침', '미나리무침', '취나물볶음', '참나물무침', '유채나물', '무생채',
        '오이무침', '가지볶음', '가지무침', '애호박볶음', '미역줄기볶음', '파래무침', '톳무침', '오이고추된장무침', '마늘쫑무침', '마늘장아찌',
        '깻잎장아찌', '양파장아찌', '고추장아찌', '건가지나물', '무말랭이무침',
    ],
    '김치/기타': [
        '배추김치', '깍두기', '열무김치', '총각김치', '파김치', '갓김치', '동치미', '백김치', '나박김치', '부추김치',
        '오이소박이', '겉절이', '볶음김치', '물김치', '깻잎김치', '고들빼기김치', '묵은지볶음', '보쌈김치', '석박지', '단무지무침',
    ],
};

// ========== Helper ==========

function pickRandom(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, arr.length));
}

async function fetchAllRecords(endpoint) {
    try {
        const res = await fetch(`${API_URL}/${endpoint}`);
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

async function deleteAllRecords(endpoint, idField = 'id') {
    const records = await fetchAllRecords(endpoint);
    if (!records || records.length === 0) {
        console.log('  (비어있음)');
        return 0;
    }
    let deleted = 0;
    for (const r of records) {
        const res = await fetch(`${API_URL}/${endpoint}/${r[idField]}`, { method: 'DELETE' });
        if (res.ok) deleted++;
    }
    console.log(`  🗑️ ${deleted}/${records.length}개 삭제`);
    return deleted;
}

// ========== Main ==========

async function main() {
    console.log(`🔌 API URL: ${API_URL}`);

    // Health check
    try {
        const res = await fetch(`${API_URL}/categories`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        console.log('✅ 로컬 API 서버 연결 성공\n');
    } catch (err) {
        console.error('❌ 로컬 API 서버에 연결할 수 없습니다:', err.message);
        console.error('먼저 앱을 실행하세요: npm start');
        process.exit(1);
    }

    // Step 1: 기존 데이터 삭제
    console.log('🧹 기존 데이터 삭제 중...');
    console.log('  [meal-data]');
    await deleteAllRecords('meal-data', 'date');
    console.log('  [menu-items]');
    await deleteAllRecords('menu-items');
    console.log('  [categories]');
    await deleteAllRecords('categories');

    // Step 2: 카테고리 생성
    console.log('\n📁 카테고리 생성 중...');
    const catMap = {}; // name → { id, color }
    for (const cat of categories) {
        try {
            const res = await fetch(`${API_URL}/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cat),
            });
            const data = await res.json();
            if (res.ok) {
                catMap[cat.name] = { id: data.id, color: cat.color };
                console.log(`  ✅ ${cat.name} → id: ${data.id}`);
            } else {
                console.log(`  ⚠️ ${cat.name}: ${JSON.stringify(data)}`);
            }
        } catch (err) {
            console.error(`  ❌ ${cat.name}: ${err.message}`);
        }
    }

    // Step 3: 메뉴 생성
    console.log('\n🍽️ 메뉴 생성 중...');
    // menuPool: MealEntry 형식으로 meal_data 시드에서 재사용
    const menuPool = {}; // catName → MealEntry[]
    let total = 0;
    let success = 0;

    for (const [catName, menus] of Object.entries(rawMenus)) {
        const catInfo = catMap[catName];
        if (!catInfo) {
            console.log(`  ⚠️ 카테고리 "${catName}" ID를 찾을 수 없음, 건너뜀`);
            continue;
        }
        menuPool[catName] = [];

        for (const name of menus) {
            total++;
            try {
                const res = await fetch(`${API_URL}/menu-items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        category_id: catInfo.id,
                        ingredients: ingredientsMap[name] ?? [],
                    }),
                });
                if (res.ok) {
                    success++;
                    menuPool[catName].push({
                        name,
                        category_id: catInfo.id,
                        color: catInfo.color,
                    });
                } else {
                    const data = await res.text();
                    console.log(`  ⚠️ ${name}: ${data}`);
                }
            } catch (err) {
                console.error(`  ❌ ${name}: ${err.message}`);
            }
        }
        console.log(`  📦 ${catName}: ${menus.length}개 처리`);
    }
    console.log(`  → 메뉴 ${success}/${total}개 생성 완료`);

    // Step 4: 식단 데이터 생성 (MealEntry 형식, 최근 30일 평일)
    console.log('\n📅 식단 데이터 생성 중...');
    const today = new Date();
    let mealCount = 0;

    for (let i = 1; i <= 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);

        // 주말 스킵 (급식 기준)
        const dow = d.getDay();
        if (dow === 0 || dow === 6) continue;

        const dateStr = d.toISOString().slice(0, 10);

        const menus = [
            ...pickRandom(menuPool['밥']       ?? [], 1),
            ...pickRandom(menuPool['국/찌개']   ?? [], 1),
            ...pickRandom(menuPool['주메뉴']    ?? [], 1),
            ...pickRandom(menuPool['부메뉴']    ?? [], 2),
            ...pickRandom(menuPool['밑반찬']    ?? [], 1),
            ...pickRandom(menuPool['김치/기타'] ?? [], 1),
        ];

        try {
            await fetch(`${API_URL}/meal-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateStr, menus }),
            });
            mealCount++;
        } catch (err) {
            console.error(`  ❌ ${dateStr}: ${err.message}`);
        }
    }
    console.log(`  ✅ ${mealCount}일치 식단 데이터 생성 완료`);

    console.log(`\n🎉 시드 완료!`);
    console.log(`   카테고리 ${Object.keys(catMap).length}개`);
    console.log(`   메뉴 ${success}/${total}개`);
    console.log(`   식단 데이터 ${mealCount}일`);
}

main();
