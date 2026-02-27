export const dummyCategories = [
    { id: "cat-rice", name: "밥", color: "#f08c00" }, /* Darker yellow/orange for Rice */
    { id: "cat-soup", name: "국/찌개", color: "#e8590c" }, /* Darker orange/red for Soup */
    { id: "cat-main", name: "주메뉴", color: "#ff6b6b" },
    { id: "cat-sub", name: "부메뉴", color: "#339af0" },
    { id: "cat-side", name: "밑반찬", color: "#20c997" },
    { id: "cat-kimchi", name: "김치/기타", color: "#845ef7" },
];

const rawMenus = {
    "cat-rice": [
        "쌀밥", "현미밥", "흑미밥", "기장밥", "콩밥", "잡곡밥", "볶음밥", "비빔밥", "보리밥", "완두콩밥",
        "수수밥", "귀리밥", "밤밥", "나물밥", "곤드레나물밥", "취나물밥", "무밥", "콩나물밥", "영양돌솥밥", "버섯밥"
    ],
    "cat-soup": [
        "된장찌개", "김치찌개", "미역국", "콩나물국", "소고기무국", "시금치된장국", "순두부찌개", "부대찌개", "청국장", "감자탕",
        "뼈해장국", "어묵국", "계란국", "홍합탕", "동태찌개", "육개장", "갈비탕", "설렁탕", "곰탕", "삼계탕",
        "북엇국", "오징어국", "꽃게탕", "아욱국", "배추된장국", "떡국", "만둣국", "수제비", "칼국수", "우거지해장국",
        "선지해장국", "황태해장국", "차돌된장찌개", "해물순두부", "알탕", "동죽조개탕", "대구탕", "매생이굴국", "다슬기국", "김칫국"
    ],
    "cat-main": [
        "제육볶음", "소불고기", "닭갈비", "오징어볶음", "고등어조림", "갈치조림", "꽁치김치조림", "닭볶음탕", "간장찜닭", "돈까스",
        "탕수육", "보쌈", "족발", "삼겹살구이", "훈제오리", "소갈비찜", "돼지갈비찜", "해물찜", "아귀찜", "코다리조림",
        "마파두부", "쭈꾸미볶음", "낙지볶음", "고추장불고기", "간장불고기", "깐풍기", "고등어구이", "삼치구이", "가자미구이", "조기구이",
        "갈치구이", "떡갈비", "함박스테이크", "오리주물럭", "돼지고기김치찜", "카레라이스", "짜장밥", "마라샹궈", "유산슬", "팔보채",
        "동파육", "깐쇼새우", "찹스테이크", "소세지야채볶음", "치즈닭갈비"
    ],
    "cat-sub": [
        "계란말이", "계란찜", "두부부침", "두부조림", "어묵볶음", "떡볶이", "스팸구이", "베이컨숙주볶음", "진미채볶음", "멸치볶음",
        "쥐포볶음", "마늘쫑새우볶음", "메추리알장조림", "소고기장조림", "돼지고기장조림", "분홍소시지전", "동그랑땡", "생선까스", "감자채볶음", "단호박범벅",
        "잡채", "콘치즈", "마카로니샐러드", "야채튀김", "고구마튀김", "김말이튀김", "새우튀김", "오징어튀김", "너비아니구이", "두부김치",
        "도토리묵무침", "청포묵무침", "오꼬노미야끼", "순대볶음", "만두탕수", "고추잡채", "연어구이", "참치김치볶음", "새송이버섯전", "애호박전",
        "김치전", "해물파전", "부추전", "건새우볶음", "연근조림", "우엉조림", "오징어초무침", "골뱅이무침", "비엔나소시지볶음", "맛살볶음"
    ],
    "cat-side": [
        "시금치나물", "콩나물무침", "숙주나물", "고사리나물", "도라지무침", "미나리무침", "취나물볶음", "참나물무침", "유채나물", "무생채",
        "오이무침", "가지볶음", "가지무침", "애호박볶음", "미역줄기볶음", "파래무침", "톳무침", "오이고추된장무침", "마늘쫑무침", "마늘장아찌",
        "깻잎장아찌", "양파장아찌", "고추장아찌", "건가지나물", "무말랭이무침", "콩자반", "땅콩조림", "견과류멸치볶음", "브로콜리숙회", "양배추찜",
        "호박잎쌈", "청경채볶음", "얼갈이된장무침", "고구마순볶음", "죽순볶음", "알감자조림", "우엉채볶음", "연근샐러드", "감자샐러드", "게맛살샐러드",
        "단호박조림", "꽈리고추찜", "꽈리고추멸치볶음", "생김구이", "쌈다시마", "꼬시래기무침", "세발나물무침", "비름나물", "참외장아찌무침", "오이지무침",
        "버섯볶음", "표고버섯볶음", "느타리버섯볶음", "팽이버섯전", "더덕구이", "도라지볶음", "방풍나물무침", "참비름나물", "돌나물무침", "냉이무침", "달래무침"
    ],
    "cat-kimchi": [
        "배추김치", "깍두기", "열무김치", "총각김치", "파김치", "갓김치", "동치미", "백김치", "나박김치", "부추김치",
        "오이소박이", "겉절이", "볶음김치", "물김치", "깻잎김치", "고들빼기김치", "묵은지볶음", "보쌈김치", "석박지", "단무지무침"
    ]
};

export function generateDummyMenus() {
    let idCounter = 1;
    const items = [];
    for (const [catId, menuArr] of Object.entries(rawMenus)) {
        for (const name of menuArr) {
            items.push({
                id: `dummy_${idCounter++}`,
                name: name,
                category: catId,
                ingredients: []
            });
        }
    }
    return items;
}

export function generateRandomMealPlan(year: number, month: number, menuItems: any[]) {
    const mealData: Record<string, string[]> = {};
    const daysInMonth = new Date(year, month, 0).getDate();

    // Group menus by category
    const byCategory: Record<string, string[]> = {};
    menuItems.forEach(m => {
        if (!byCategory[m.category]) byCategory[m.category] = [];
        byCategory[m.category].push(m.name);
    });

    const getRandom = (arr: string[]) => arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
    const getRandomMultiple = (arr: string[], count: number) => {
        if (!arr || arr.length === 0) return [];
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    };

    for (let d = 1; d <= daysInMonth; d++) {
        // month is 1-indexed here natively, but Date uses 0-indexed month
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        // Skip weekends
        const isWeekend = new Date(year, month - 1, d).getDay() % 6 === 0;
        if (isWeekend) continue;

        const dailyMenu = [];
        const rice = getRandom(byCategory["cat-rice"]);
        if (rice) dailyMenu.push(rice);

        const soup = getRandom(byCategory["cat-soup"]);
        if (soup) dailyMenu.push(soup);

        const main = getRandom(byCategory["cat-main"]);
        if (main) dailyMenu.push(main);

        const subs = getRandomMultiple(byCategory["cat-sub"], 2);
        dailyMenu.push(...subs);

        const sides = getRandomMultiple(byCategory["cat-side"], 3);
        dailyMenu.push(...sides);

        const kimchi = getRandom(byCategory["cat-kimchi"]);
        if (kimchi) dailyMenu.push(kimchi);

        mealData[dateStr] = dailyMenu;
    }

    return mealData;
}
