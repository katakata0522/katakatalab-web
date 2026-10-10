/**
 * Speed Reader - Comprehension Evolution
 * 高速表示ゲームの楽しさは残しつつ、「どこまで内容を追えたか」を一緒に確かめる。
 */
(() => {
    'use strict';

    const SPEED_READER_EVOLUTION_CONFIG = Object.freeze({
        QUIZ_COUNT: 3,
        STORAGE_KEY: 'pikalab_speed_reader_comprehension_v1',
        SLOWDOWN_STEP: 50,
        LABELS: Object.freeze({
            TITLE: '⚡ スピード × 内容チェック',
            CUSTOM_TITLE: '🧠 内容まで追えた？',
            CLOSE: '結果を閉じる',
            NEXT: '次の問題 →',
            RESULT: '結果を見る'
        })
    });

    const QUIZZES = Object.freeze({
        'ももたろう': Object.freeze([
            { q: 'おばあさんは、どこでせんたくをしていた？', o: ['山', '川', '海'], a: 1, e: '川でせんたくをしていると、大きなももが流れてきたね。' },
            { q: '川を流れてきたものは？', o: ['大きなもも', '大きなおむすび', '宝箱'], a: 0, e: '「ドンブラコ、ドンブラコ」と大きなももが流れてきたよ。' },
            { q: 'おばあさんは、ももをどうしようと思った？', o: ['その場で食べる', '家に持ち帰る', '川へ戻す'], a: 1, e: '家に持って帰って、おじいさんと食べようと考えたんだ。' }
        ]),
        'おむすび ころりん': Object.freeze([
            { q: 'おじいさんは山へ何をしに行った？', o: ['木をきりに', '魚をつりに', '畑をたがやしに'], a: 0, e: '山へ木をきりに行ったところから始まるよ。' },
            { q: '手からすべったおむすびは、最後にどこへ入った？', o: ['川', '木の上', '地面の穴'], a: 2, e: 'コロコロころがって、地面の穴の中へ落ちたね。' },
            { q: '穴の中から聞こえてきたのは？', o: ['かわいい歌', '雷の音', 'おじいさんの声'], a: 0, e: '「おむすび コロリン…」という歌が聞こえてきたよ。' }
        ]),
        'かさじぞう': Object.freeze([
            { q: 'おじいさんが作ったすげがさは、いくつ？', o: ['3つ', '5つ', '10こ'], a: 1, e: '作ったかさは5つだったね。' },
            { q: 'おじいさんは、かさを売って何を買いたかった？', o: ['おもち', '新しい服', '魚'], a: 0, e: 'お正月をむかえるおもちを買いたかったんだ。' },
            { q: 'まちへ行ったあと、かさはどうなった？', o: ['全部売れた', '1つだけ売れた', 'だれも買ってくれなかった'], a: 2, e: '雪が降るなか、だれもかさを買ってくれなかったね。' }
        ]),
        'うらしま たろう': Object.freeze([
            { q: '浦島太郎の仕事は？', o: ['りょうし', 'お医者さん', 'おとのさま'], a: 0, e: '太郎は海で魚をとる「りょうし」だったよ。' },
            { q: '浜辺で亀をいじめていたのは？', o: ['子供たち', '漁師たち', '鳥たち'], a: 0, e: '子供たちが亀をいじめていて、太郎が助けたんだ。' },
            { q: '数日後、太郎を竜宮城へ誘ったのは？', o: ['助けた亀', '大きな魚', '村のおじいさん'], a: 0, e: '助けた亀が再び現れて、竜宮城へ誘ったね。' }
        ]),
        '手袋を買いに': Object.freeze([
            { q: '物語の季節は？', o: ['春', '夏', '冬'], a: 2, e: '冷たい雪が森を白く包む冬のお話だよ。' },
            { q: 'お母さん狐は、子狐の手を何の形に変えた？', o: ['鳥の羽', '人間の子供の手', '犬の足'], a: 1, e: '町で買い物ができるよう、人間の子供の手の形に変えたんだ。' },
            { q: '子狐が町へ買いに行くものは？', o: ['手袋', '帽子', '靴'], a: 0, e: '冷たい手のために、手袋を買いに行くところだね。' }
        ]),
        'したきりすずめ': Object.freeze([
            { q: 'おじいさんが助けた雀の名前は？', o: ['おちょん', 'ごん', 'ちゅんた'], a: 0, e: 'おじいさんは雀を「おちょん」と名付けたよ。' },
            { q: '雀を大切に育てたのは？', o: ['おじいさん', 'おばあさん', '村の子供'], a: 0, e: '優しいおじいさんが、けがをした雀を助けて育てたね。' },
            { q: 'おばあさんが雀に怒ったきっかけは？', o: ['糊をなめた', 'お米を運んだ', '外へ飛んだ'], a: 0, e: '雀が糊をなめてしまったことで、おばあさんが怒ったんだ。' }
        ]),
        'ごん狐': Object.freeze([
            { q: '語り手がこの話を聞いた相手は？', o: ['茂平というおじいさん', '中山さま', 'ごん'], a: 0, e: '語り手は、小さいころ茂平というおじいさんから聞いたと言っているよ。' },
            { q: 'ごんはどんな狐として紹介された？', o: ['一人ぼっちの小狐', '大きな群れの親分', '城で飼われた狐'], a: 0, e: 'ごんは一人ぼっちの小狐として登場するね。' },
            { q: 'ごんが住んでいたのは？', o: ['しだのしげった森の穴', 'お城の中', '川辺の小屋'], a: 0, e: 'しだがいっぱいしげった森の中に穴をほって住んでいたよ。' }
        ]),
        '雨ニモマケズ': Object.freeze([
            { q: '詩の中で「マケズ」と並んでいるものは？', o: ['雨・風・雪・夏の暑さ', '海・山・川・空', '朝・昼・夜・夢'], a: 0, e: '雨、風、雪、夏の暑さにも負けない姿が描かれているね。' },
            { q: '一日に食べるものとして書かれているのは？', o: ['玄米四合・味噌・少しの野菜', 'パン・肉・牛乳', '魚と果物だけ'], a: 0, e: '玄米四合と味噌と少しの野菜、と書かれているよ。' },
            { q: '人物の様子として近いのは？', o: ['いつも静かに笑っている', 'いつも大声で怒っている', '何も見聞きしない'], a: 0, e: '「決して怒らず、いつも静かに笑っている」という姿だね。' }
        ]),
        '注文の多い料理店': Object.freeze([
            { q: '山奥を歩いていたのは何人？', o: ['1人', '2人', '5人'], a: 1, e: '二人の若い紳士が歩いていたね。' },
            { q: '二人が連れていた動物は？', o: ['白熊のような犬を2匹', '馬を1頭', '猫を2匹'], a: 0, e: '白熊のような犬を二匹連れていたよ。' },
            { q: '二人は山で何をしたがっていた？', o: ['鳥や獣を撃ちたい', '花を集めたい', '道を作りたい'], a: 0, e: '「早くタンタアーンと、やって見たい」と狩りをしたがっていたね。' }
        ]),
        'よだかの星': Object.freeze([
            { q: 'よだかの顔は、何をつけたようにまだら？', o: ['味噌', '雪', '金'], a: 0, e: '顔は「味噌をつけたように」まだらだと書かれているよ。' },
            { q: 'よだかのくちばしはどんな形？', o: ['ひらたくて耳までさけている', '細くて長い', '丸くて小さい'], a: 0, e: 'ひらたく、耳までさけているようだと描かれているね。' },
            { q: 'ほかの鳥たちは、よだかをどう見ていた？', o: ['顔を見るだけでもいやだと思っていた', '一番美しいと思っていた', '王様だと思っていた'], a: 0, e: 'ほかの鳥から好かれていない様子が強く描かれているよ。' }
        ]),
        'セロ弾きのゴーシュ': Object.freeze([
            { q: 'ゴーシュの仕事は？', o: ['活動写真館でセロを弾く', '学校で歌を教える', '山で木を切る'], a: 0, e: '町の活動写真館でセロを弾く係だったね。' },
            { q: 'ゴーシュは、なぜ楽長にいじめられていた？', o: ['あまり上手ではなかった', 'いつも遅刻した', 'セロを持っていなかった'], a: 0, e: 'あまり上手ではないため、いつも楽長にいじめられていたとあるよ。' },
            { q: '夜の練習中に入ってきたのは？', o: ['大きな三毛猫', '狐', '小さな犬'], a: 0, e: 'トマトを持った大きな三毛猫が入ってきたね。' }
        ]),
        'ツェねずみ': Object.freeze([
            { q: 'ツェねずみは、どんなねずみ？', o: ['ずるいねずみ', 'とても臆病なねずみ', '何でも返すねずみ'], a: 0, e: '借りたものを自分のものにしたり、責任から逃げたりする「ずるいねずみ」だね。' },
            { q: 'ツェねずみが盗んで食べたものは？', o: ['大麦', 'りんご', 'チーズ'], a: 0, e: 'いたちの家から、おいしい大麦を盗んで食べたよ。' },
            { q: '見つかりそうになったとき、誰のせいにした？', o: ['となりのもぐら', 'いたち', '自分'], a: 0, e: '自分ではなく、となりのもぐらのせいにしたんだ。' }
        ]),
        '走れメロス': Object.freeze([
            { q: 'メロスの仕事は？', o: ['村の牧人', '王の兵士', '商人'], a: 0, e: 'メロスは村の牧人で、笛を吹き羊と暮らしていたね。' },
            { q: 'メロスが「除かなければならぬ」と決意した相手は？', o: ['邪智暴虐の王', '親友', '村長'], a: 0, e: '邪智暴虐の王を除かなければならないと決意しているよ。' },
            { q: 'メロスがやって来た市の名前は？', o: ['シラクス', '洛陽', '京都'], a: 0, e: '村から十里はなれたシラクスの市へやって来たね。' }
        ]),
        '蜘蛛の糸': Object.freeze([
            { q: '御釈迦様が歩いていた場所は？', o: ['極楽の蓮池のふち', '山の中', '羅生門の下'], a: 0, e: '極楽の蓮池のふちを一人で歩いていたところから始まるよ。' },
            { q: '蓮の花の色は？', o: ['まっ白', '真っ赤', '青'], a: 0, e: '蓮の花は玉のようにまっ白だと描かれているね。' },
            { q: '御釈迦様は、蓮の葉の間からどこを見た？', o: ['下', '空', '遠くの山'], a: 0, e: '蓮の葉の間から、ふと下の様子を見たんだ。' }
        ]),
        'トロッコ': Object.freeze([
            { q: '工事が始まったとき、良平は何歳？', o: ['8歳', '12歳', '18歳'], a: 0, e: '良平が八つの年に工事が始まったと書かれているよ。' },
            { q: '何の工事を見物していた？', o: ['小田原・熱海間の軽便鉄道', '大きな橋', '港'], a: 0, e: '小田原・熱海間の軽便鉄道を敷く工事だね。' },
            { q: '良平が特に面白がっていたのは？', o: ['トロッコで土を運ぶこと', '汽車の切符を売ること', '石を磨くこと'], a: 0, e: '工事そのものより、トロッコで土を運ぶ面白さに見とれていたよ。' }
        ]),
        '高瀬舟': Object.freeze([
            { q: '高瀬舟が行き来していた川は？', o: ['京都の高瀬川', '隅田川', '淀川だけ'], a: 0, e: '京都の高瀬川を上下する小舟として紹介されているよ。' },
            { q: '徳川時代、高瀬舟で運ばれたのは？', o: ['遠島を言い渡された罪人', '旅をする商人だけ', '武士の馬'], a: 0, e: '遠島を申し渡された罪人が大阪へ回されると説明されているね。' },
            { q: '罪人を護送する役目は？', o: ['町奉行の配下の同心', '村の子供', '船大工'], a: 0, e: '京都町奉行の配下にいる同心が護送したと書かれているよ。' }
        ]),
        '杜子春': Object.freeze([
            { q: '杜子春が立っていたのはどこ？', o: ['洛陽の西の門の下', 'シラクスの市', '鎌倉の海岸'], a: 0, e: '唐の都・洛陽の西の門の下に立っていたね。' },
            { q: '杜子春は、もともとどんな家の息子？', o: ['お金持ち', '漁師', '農家'], a: 0, e: 'もともとはお金持ちの息子だったと書かれているよ。' },
            { q: '今は貧乏になった主な理由として書かれているのは？', o: ['贅沢の限りを尽くした', '家を火事で失った', '旅に出た'], a: 0, e: '贅沢の限りを尽くして、着るものにも困るほどになったんだ。' }
        ]),
        '走れメロス（激闘篇）': Object.freeze([
            { q: 'メロスの身代わりとして待っている親友は？', o: ['セリヌンティウス', '李徴', '杜子春'], a: 0, e: '親友セリヌンティウスが身代わりとなって待っているね。' },
            { q: 'メロスの行く手を最初に大きく阻んだものは？', o: ['濁流になった川', '雪山', '大火事'], a: 0, e: '橋が流された濁流の川が行く手を阻んだよ。' },
            { q: '川を泳ぎ切ったあとに現れたのは？', o: ['山賊の群れ', '王の兵士', '大きな犬'], a: 0, e: '対岸へ上がった直後、今度は山賊の群れが襲いかかってきたね。' }
        ]),
        '山月記': Object.freeze([
            { q: '文章の中心人物は？', o: ['李徴', '下人', '先生'], a: 0, e: '隴西の李徴について語られている文章だね。' },
            { q: '李徴は官を退いたあと、何に打ち込んだ？', o: ['詩作', '商売', '狩り'], a: 0, e: '人との交わりを絶って、ひたすら詩作にふけったとあるよ。' },
            { q: '李徴が望んでいたことに近いのは？', o: ['詩人として名を後世に残す', '大官の前で長く働く', 'すぐ故郷を離れる'], a: 0, e: '下吏として屈するより、詩家としての名を死後百年に残そうとしたんだ。' }
        ]),
        '羅生門': Object.freeze([
            { q: '下人が羅生門の下でしていたことは？', o: ['雨やみを待っていた', '人を待っていた', '眠っていた'], a: 0, e: 'ある日の暮方、下人は雨がやむのを待っていたね。' },
            { q: '門の下にいた人間は何人？', o: ['下人ひとり', '三人', '大勢'], a: 0, e: 'この男のほかには誰もいない、と繰り返されているよ。' },
            { q: '大きな円柱にとまっていたものは？', o: ['蟋蟀（こおろぎ）', '雀', '蝶'], a: 0, e: '丹塗りのはげた円柱に蟋蟀が一匹とまっていたね。' }
        ]),
        'こころ': Object.freeze([
            { q: '語り手は、その人をいつも何と呼ぶ？', o: ['先生', '兄さん', '博士'], a: 0, e: '語り手はその人を常に「先生」と呼んでいるよ。' },
            { q: '本名を書かない一番の理由として近いのは？', o: ['「先生」と呼ぶ方が自然だから', '本名を忘れたから', '名前を知らないから'], a: 0, e: '世間への遠慮より、その方が自分にとって自然だからだと説明しているね。' },
            { q: '語り手が先生と知り合った場所は？', o: ['鎌倉', '京都', 'ベルリン'], a: 0, e: '先生と知り合ったのは鎌倉だと最後に書かれているよ。' }
        ]),
        '吾輩は猫である': Object.freeze([
            { q: '語り手は何者？', o: ['猫', '犬', '書生'], a: 0, e: '最初の一文から「吾輩は猫である」だね。' },
            { q: '語り手の名前は？', o: ['まだ無い', 'ごん', '先生'], a: 0, e: '「名前はまだ無い」とはっきり書かれているよ。' },
            { q: '猫が初めて見た人間は？', o: ['書生', '漁師', 'おとのさま'], a: 0, e: '薄暗い場所で、初めて「書生」という人間を見たと語っているね。' }
        ]),
        '檸檬': Object.freeze([
            { q: '語り手の心を圧えていたものは、どう表現されている？', o: ['えたいの知れない不吉な塊', '明るい光', '楽しい音楽'], a: 0, e: '冒頭で「えたいの知れない不吉な塊」と表現されているよ。' },
            { q: '果物屋で買ったものは？', o: ['檸檬', '桃', 'りんご'], a: 0, e: '語り手は一個の檸檬を買ったね。' },
            { q: '檸檬の何が心地よさを与えた？', o: ['冷たさと鮮やかな黄色', '重さと黒い色', '強い甘さ'], a: 0, e: '手のひらの冷たさと、鮮やかな黄色が心地よさを与えたんだ。' }
        ]),
        '舞姫': Object.freeze([
            { q: '語り手が来ている都市は？', o: ['ベルリン', 'パリ', 'ローマ'], a: 0, e: 'シベリアを越え、ベルリンの都に来たと語っているね。' },
            { q: 'この地に来てから、どのくらい経ったと書かれている？', o: ['三年', '三日', '十年'], a: 0, e: '「早くも三年の歳月」とあるよ。' },
            { q: '学問の日々の裏にあった気持ちは？', o: ['寂しさと祖国への思い', '怒りだけ', '何の感情もない'], a: 0, e: '講義や読書の裏に、寂しさと祖国への思慕があったと描かれているね。' }
        ])
    });

    const PIKALAB_ADAPTATION_TITLES = new Set(['走れメロス（激闘篇）']);

    function calculateAttemptWpm(app) {
        if (typeof app?.getAttemptStats === 'function') return app.getAttemptStats().actualWpm;
        const totalElapsedMs = Number(app?.state?.totalElapsedTime) || 0;
        const activeElapsedMs = app?.state?.startTime != null ? Math.max(0, Date.now() - app.state.startTime) : 0;
        const elapsedSeconds = Math.max(0, (totalElapsedMs + activeElapsedMs) / 1000);
        const wordCount = Number(app?.state?.totalWordCount) || Number(app?.state?.words?.length) || 0;
        return wordCount > 0 && elapsedSeconds > 0 ? Math.round((wordCount / elapsedSeconds) * 60) : 0;
    }

    function loadComprehensionHistory() {
        try {
            const parsed = JSON.parse(localStorage.getItem(SPEED_READER_EVOLUTION_CONFIG.STORAGE_KEY) || '[]');
            return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object'
                && typeof item.title === 'string' && Number.isFinite(item.wpm) && item.wpm >= 0
                && Number.isInteger(item.total) && item.total > 0 && item.total <= SPEED_READER_EVOLUTION_CONFIG.QUIZ_COUNT
                && Number.isInteger(item.score) && item.score >= 0 && item.score <= item.total).slice(-100) : [];
        } catch (error) {
            console.warn('Speed Reader comprehension history could not be loaded:', error);
            return [];
        }
    }

    function saveComprehensionAttempt(attempt) {
        try {
            const history = loadComprehensionHistory();
            history.push(attempt);
            localStorage.setItem(SPEED_READER_EVOLUTION_CONFIG.STORAGE_KEY, JSON.stringify(history.slice(-100)));
        } catch (error) {
            console.warn('Speed Reader comprehension history could not be saved:', error);
        }
    }

    function getBestUnderstoodWpm() {
        const perfectAttempts = loadComprehensionHistory().filter((attempt) => attempt.total > 0 && attempt.score === attempt.total);
        return perfectAttempts.reduce((max, attempt) => Math.max(max, Number(attempt.wpm) || 0), 0);
    }

    let activeDialogApp = null;

    function finishDialog() {
        const app = activeDialogApp;
        activeDialogApp = null;
        if (!app) return;
        app.resetReader?.();
        app.els?.mainPlayBtn?.focus?.();
    }

    function createDialog() {
        let dialog = document.getElementById('speed-reader-comprehension-modal');
        if (dialog) return dialog;

        dialog = document.createElement('dialog');
        dialog.id = 'speed-reader-comprehension-modal';
        dialog.className = 'p-0 rounded-3xl shadow-2xl w-[min(92vw,34rem)] m-auto overflow-hidden border-0 bg-white';
        dialog.setAttribute('aria-labelledby', 'speed-reader-comprehension-title');
        // 横向きの小画面でも、内容チェック全体を通常のスクロールで読めるようにする。
        dialog.style.overflowY = 'auto';
        document.body.appendChild(dialog);
        dialog.addEventListener('close', () => {
            // closeイベントは非同期。再表示した別の結果を古い通知で閉じない。
            if (!dialog.open) finishDialog();
        });
        dialog.addEventListener('cancel', event => {
            event.preventDefault();
            closeDialog(dialog);
        });
        dialog.addEventListener('click', event => {
            if (event.target !== dialog) return;
            const rect = dialog.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
                closeDialog(dialog);
            }
        });

        if (!document.getElementById('speed-reader-comprehension-style')) {
            const style = document.createElement('style');
            style.id = 'speed-reader-comprehension-style';
            style.textContent = '#speed-reader-comprehension-modal::backdrop{background:rgba(15,23,42,.72);backdrop-filter:blur(4px)}';
            document.head.appendChild(style);
        }
        return dialog;
    }

    function buildButton(text, className) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = text;
        return button;
    }

    function closeDialog(dialog) {
        if (typeof dialog.close === 'function' && dialog.open) dialog.close();
        else dialog.removeAttribute('open');
        finishDialog();
    }

    function renderCustomSelfCheck(dialog, app, wpm) {
        dialog.textContent = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'p-6 md:p-8 text-slate-700';

        const title = document.createElement('h2');
        title.id = 'speed-reader-comprehension-title';
        title.className = 'text-xl font-black text-teal-800 mb-2';
        title.textContent = SPEED_READER_EVOLUTION_CONFIG.LABELS.CUSTOM_TITLE;

        const speed = document.createElement('p');
        speed.className = 'text-sm font-black text-teal-600 mb-5';
        speed.textContent = `今回のゲーム記録: ${wpm} WPM`;

        const prompt = document.createElement('div');
        prompt.className = 'bg-teal-50 border border-teal-100 rounded-2xl p-5 space-y-3 text-sm font-bold leading-relaxed';
        prompt.textContent = '';
        ['今の文章を、1文で説明できる？', 'いちばん大事だった言葉や出来事を1つ思い出せる？', '分からなかったところがあれば、戻ったり速度を下げたりしてOK！'].forEach((text) => {
            const p = document.createElement('p');
            p.textContent = `• ${text}`;
            prompt.appendChild(p);
        });

        const note = document.createElement('p');
        note.className = 'mt-4 text-xs text-slate-500 leading-relaxed';
        note.textContent = 'WPMはこのゲームで文章を表示・追跡した速さの記録です。読解力や一般的な動体視力そのものを測る数値ではありません。';

        const close = buildButton(SPEED_READER_EVOLUTION_CONFIG.LABELS.CLOSE, 'mt-6 w-full bg-teal-600 hover:bg-teal-500 text-white rounded-xl py-3 font-black transition');
        close.addEventListener('click', () => closeDialog(dialog));

        wrapper.appendChild(title);
        wrapper.appendChild(speed);
        wrapper.appendChild(prompt);
        wrapper.appendChild(note);
        wrapper.appendChild(close);
        dialog.appendChild(wrapper);
    }

    function renderQuiz(dialog, app, titleText, wpm, questions) {
        let questionIndex = 0;
        let score = 0;
        let resultSaved = false;

        const renderCurrent = () => {
            const item = questions[questionIndex];
            dialog.textContent = '';

            const wrapper = document.createElement('div');
            wrapper.className = 'p-6 md:p-8 text-slate-700';

            const title = document.createElement('h2');
            title.id = 'speed-reader-comprehension-title';
            title.className = 'text-xl font-black text-teal-800 mb-1';
            title.textContent = SPEED_READER_EVOLUTION_CONFIG.LABELS.TITLE;

            const sub = document.createElement('p');
            sub.className = 'text-xs text-slate-500 font-bold mb-5';
            sub.textContent = `${titleText} ／ ${wpm} WPM ／ ${questionIndex + 1} of ${questions.length}`;

            if (PIKALAB_ADAPTATION_TITLES.has(titleText)) {
                const adaptation = document.createElement('p');
                adaptation.className = 'mb-4 text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 font-bold';
                adaptation.textContent = '※ この「激闘篇」はPikaLab用のアレンジ文章。クイズも画面に出た文章だけから出題しているよ。';
                wrapper.appendChild(title);
                wrapper.appendChild(sub);
                wrapper.appendChild(adaptation);
            } else {
                wrapper.appendChild(title);
                wrapper.appendChild(sub);
            }

            const question = document.createElement('p');
            question.className = 'text-base md:text-lg font-black text-slate-800 leading-relaxed mb-4';
            question.textContent = item.q;

            const options = document.createElement('div');
            options.className = 'grid gap-2';

            const feedback = document.createElement('div');
            feedback.className = 'hidden mt-4 rounded-2xl p-4 text-sm font-bold leading-relaxed border';
            feedback.setAttribute('role', 'status');
            feedback.setAttribute('aria-live', 'polite');

            let answered = false;
            item.o.forEach((optionText, optionIndex) => {
                const button = buildButton(optionText, 'w-full text-left bg-slate-50 hover:bg-teal-50 border-2 border-slate-100 hover:border-teal-200 rounded-xl px-4 py-3 font-bold transition');
                button.addEventListener('click', () => {
                    if (answered) return;
                    answered = true;
                    const isCorrect = optionIndex === item.a;
                    if (isCorrect) score += 1;
                    options.querySelectorAll('button').forEach((candidate) => {
                        candidate.disabled = true;
                        candidate.classList.add('opacity-60');
                    });
                    button.classList.remove('opacity-60', 'border-slate-100');
                    button.classList.add(isCorrect ? 'border-emerald-400' : 'border-amber-400');

                    feedback.className = `mt-4 rounded-2xl p-4 text-sm font-bold leading-relaxed border ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`;
                    feedback.textContent = `${isCorrect ? '✨ せいかい！' : '🔍 おしい！'} ${item.e}`;

                    const next = buildButton(questionIndex < questions.length - 1 ? SPEED_READER_EVOLUTION_CONFIG.LABELS.NEXT : SPEED_READER_EVOLUTION_CONFIG.LABELS.RESULT, 'mt-3 w-full bg-teal-600 hover:bg-teal-500 text-white rounded-xl py-2.5 font-black transition');
                    next.addEventListener('click', () => {
                        if (questionIndex < questions.length - 1) {
                            questionIndex += 1;
                            renderCurrent();
                        } else {
                            renderResult();
                        }
                    }, { once: true });
                    feedback.appendChild(next);
                    next.focus();
                }, { once: true });
                options.appendChild(button);
            });

            wrapper.appendChild(question);
            wrapper.appendChild(options);
            wrapper.appendChild(feedback);
            dialog.appendChild(wrapper);
            if (dialog.open) options.querySelector('button')?.focus();
        };

        const renderResult = () => {
            if (resultSaved) return;
            resultSaved = true;
            saveComprehensionAttempt({
                title: titleText,
                wpm,
                score,
                total: questions.length,
                at: new Date().toISOString()
            });

            dialog.textContent = '';
            const wrapper = document.createElement('div');
            wrapper.className = 'p-6 md:p-8 text-center text-slate-700';

            const icon = document.createElement('div');
            icon.className = 'text-5xl mb-3';
            icon.textContent = score === questions.length ? '🚀' : score >= 2 ? '✨' : '🔍';

            const title = document.createElement('h2');
            title.id = 'speed-reader-comprehension-title';
            title.className = 'text-xl md:text-2xl font-black text-teal-800 mb-2';
            title.textContent = score === questions.length ? '速さも内容も追えた！' : '今日の「分かる速さ」を発見！';

            const stats = document.createElement('div');
            stats.className = 'grid grid-cols-2 gap-3 my-5';
            const speedCard = document.createElement('div');
            speedCard.className = 'bg-teal-50 border border-teal-100 rounded-2xl p-4';
            speedCard.innerHTML = `<span class="text-[10px] text-teal-600 font-black block">ゲーム記録</span><strong class="text-2xl text-teal-700">${wpm}</strong><span class="text-xs font-bold ml-1">WPM</span>`;
            const scoreCard = document.createElement('div');
            scoreCard.className = 'bg-indigo-50 border border-indigo-100 rounded-2xl p-4';
            scoreCard.innerHTML = `<span class="text-[10px] text-indigo-600 font-black block">内容チェック</span><strong class="text-2xl text-indigo-700">${score}/${questions.length}</strong>`;
            stats.appendChild(speedCard);
            stats.appendChild(scoreCard);

            const message = document.createElement('p');
            message.className = 'text-sm font-bold leading-relaxed text-slate-600';
            if (score === questions.length) {
                message.textContent = `${wpm} WPMで全問正解！ このゲームでは、速い表示を追いながら内容もつかめたね。もっと速くして遊ぶのも、この速さを自分の得意ペースにするのも自由！`;
            } else if (score >= 2) {
                message.textContent = 'かなり追えていた！ もう少しゆっくりなら全問いける？ それとも同じ速さでもう一度？ 自分で条件を変えて実験してみよう。';
            } else {
                message.textContent = '速さへの挑戦はちゃんと記録！ 今回は内容を追うのが難しかったみたい。少し速度を下げると、どこから分かりやすくなるか試してみよう。';
            }

            const scienceNote = document.createElement('p');
            scienceNote.className = 'mt-4 text-[11px] text-slate-500 bg-slate-50 rounded-xl p-3 leading-relaxed text-left';
            scienceNote.textContent = '🔬 科学メモ：速い表示を追えたことは、このゲームでの立派な記録。ただしWPMだけで一般的な読解力や動体視力の向上を判断することはできません。だからPikaLabでは「速さ」と「内容チェック」を両方見ます。';

            const bestWpm = getBestUnderstoodWpm();
            if (bestWpm > 0) {
                const best = document.createElement('p');
                best.className = 'mt-3 text-xs font-black text-teal-700';
                best.textContent = `🏅 全問正解できた最高ペース：${bestWpm} WPM`;
                wrapper.appendChild(icon);
                wrapper.appendChild(title);
                wrapper.appendChild(stats);
                wrapper.appendChild(message);
                wrapper.appendChild(scienceNote);
                wrapper.appendChild(best);
            } else {
                wrapper.appendChild(icon);
                wrapper.appendChild(title);
                wrapper.appendChild(stats);
                wrapper.appendChild(message);
                wrapper.appendChild(scienceNote);
            }

            const close = buildButton(SPEED_READER_EVOLUTION_CONFIG.LABELS.CLOSE, 'mt-6 w-full bg-teal-600 hover:bg-teal-500 text-white rounded-xl py-3 font-black transition');
            close.addEventListener('click', () => closeDialog(dialog));
            wrapper.appendChild(close);
            dialog.appendChild(wrapper);
            close.focus();
        };

        renderCurrent();
    }

    function showEvolutionResult(app) {
        const dialog = createDialog();
        activeDialogApp = app;
        const title = String(app?.state?.title || '').trim();
        const wpm = calculateAttemptWpm(app);
        const questions = QUIZZES[title];

        if (Array.isArray(questions) && questions.length > 0) {
            renderQuiz(dialog, app, title, wpm, questions.slice(0, SPEED_READER_EVOLUTION_CONFIG.QUIZ_COUNT));
        } else {
            renderCustomSelfCheck(dialog, app, wpm);
        }

        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    }

    function patchCompletionFeedback() {
        if (typeof SpeedReaderApp === 'undefined') {
            console.warn('Speed Reader evolution: SpeedReaderApp was not available.');
            return;
        }

        const original = SpeedReaderApp.prototype.showCompletionFeedback;
        if (typeof original !== 'function' || original.__pikalabEvolutionWrapped) return;

        function evolvedCompletionFeedback() {
            // 記録だけ共有し、非表示の旧結果画面・紙吹雪・フォーカスタイマーを作らない。
            if (original.call(this, { showLegacy: false }) !== false) showEvolutionResult(this);
        }
        evolvedCompletionFeedback.__pikalabEvolutionWrapped = true;
        SpeedReaderApp.prototype.showCompletionFeedback = evolvedCompletionFeedback;
    }

    function patchLibraryLabels() {
        if (typeof SpeedReaderApp === 'undefined') return;
        const original = SpeedReaderApp.prototype.renderLibrary;
        if (typeof original !== 'function' || original.__pikalabEvolutionWrapped) return;

        function evolvedRenderLibrary() {
            original.call(this);
            document.querySelectorAll('.lib-card span').forEach((badge) => {
                if (badge.textContent?.startsWith('推奨WPM:')) {
                    badge.textContent = badge.textContent.replace('推奨WPM:', 'スタート目安:');
                }
            });
        }
        evolvedRenderLibrary.__pikalabEvolutionWrapped = true;
        SpeedReaderApp.prototype.renderLibrary = evolvedRenderLibrary;
    }

    function patchStaticCopy() {
        const hint = document.getElementById('wpm-hint');
        if (hint) {
            const labels = hint.querySelectorAll('span');
            if (labels[0]) labels[0].textContent = '50 (ゆっくり)';
            if (labels[1]) labels[1].textContent = '400 (チャレンジ)';
            if (labels[2]) labels[2].textContent = '1000 (超速チャレンジ)';
        }

        const parentModal = document.getElementById('parents-modal');
        if (parentModal) {
            const headings = Array.from(parentModal.querySelectorAll('h3'));
            const aim = headings.find((heading) => heading.textContent?.includes('このアプリのねらい'))?.parentElement?.querySelector('p');
            const request = headings.find((heading) => heading.textContent?.includes('保護者様へのおねがい'))?.parentElement?.querySelector('p');
            const usage = headings.find((heading) => heading.textContent?.includes('おうちでの活用方法'))?.parentElement?.querySelector('p');

            if (aim) aim.textContent = '「スピードリーダー」は、文章を1〜3語ずつ高速表示して「どこまで追える？」に挑戦する読書ゲームです。速さそのものを楽しみながら、内蔵作品では最後に内容チェックを行い、「速さ」と「理解」を別々に確かめます。';
            if (request) request.textContent = '速い記録はゲームの達成として思い切りほめてください。同時に「どの速さなら内容まで分かった？」と聞いていただけると、子ども自身が自分に合うペースを考えるきっかけになります。読み直したり速度を下げたりすることも、正しい作戦です。';
            if (usage) usage.textContent = 'このゲームで速い表示を追えるようになること自体は楽しい上達です。一方で、WPMの上昇だけから一般的な読解力・認知能力・動体視力の向上を保証することはできません。内蔵作品の内容チェックと組み合わせて、条件を変えながら「自分はどこまで追える？」と実験する遊びとしてご活用ください。';
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            SPEED_READER_EVOLUTION_CONFIG,
            QUIZZES,
            calculateAttemptWpm
        };
        return;
    }

    patchCompletionFeedback();
    patchLibraryLabels();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchStaticCopy, { once: true });
    } else {
        patchStaticCopy();
    }
})();

