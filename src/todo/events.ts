import { random, setSpecifiedQuantityFishData } from "./utils";

export type EventCommonData = {
    // 事件标题
    name?: string,
    // 操作的选项
    handle?: string[],
    // 改动钓鱼基准的值
    result?: number[] | number,
    // 当执行特殊操作 fn 时，是否有返回的文本
    closeFollow?: boolean,
    // 是否获得礼物与获得礼物的概率
    gift?: [string[], number],
    // 特殊执行操作
    fn?: (arr: any, poss: { poss: number, prob: number, lowProb: number }, select: string) => string
    // 配图
    img?: string,
    // 选项返回的随机文本
    msg?: string[][],
    // 是否为结局
    isEnd: boolean,
    // 是否为自由事件 （无需操作任何选项) 
    isFree?: boolean
}[]
export const eventCommonData: EventCommonData = [
    {
        name: "一个眼神呆滞的女生向你问格海娜学院往哪里走，虽然你也不知道在哪里。你总觉得该做点什么...",
        handle: ["在这条道的左边", "在这条道的右边", "不知道"],
        result: [-1, -1, -1],
        closeFollow: false,
        //  参数1 礼物内容 参数2 获得的概率 10/2
        gift: [["石锅拌饭", "卤肉饭", "水果鸡肉", "猪脚饭", "全家桶"], 3],
        img: "https://smmcat.cn/run/fish/event/64/枫香.png",
        msg: [
            ["女生高兴的走了，你却有点愧疚", "瞎指路是不好的！"],
            ["糟糕，右边似乎是格娜黑的地方", "女生虽然有点怀疑，还是就这样走了", "瞎指路确实是不好的！"],
            ["虽然抱歉，但是确实是这样...", "她还是谢谢了你，随即离开了..."]
        ],
        isEnd: false
    },
    {
        name: "噔噔噔噔~脑袋有问题的爆裂红魔族，登场！惠惠出现了！惠惠开始咏唱爆裂魔法了！她的魔杖前端指着……你钓鱼的鱼塘……眼看整塘鱼都要被爆裂魔法炸上天，你决定：\n(有极低概率触发特殊事件)",
        handle: ["对惠惠使用全力眼罩弹射", "把她一脚踹下池塘", "拽住衣角拼命阻止", "对惠惠使用中二话术来挫败她"],
        img: "",
        result: [1, -1, -1, 1],
        closeFollow: false,
        msg: [
            ["效果拔群，你成功守护了鱼塘！", "少女骂骂咧咧的跑开了，\n呼~终于暂时可以不被爆裂女打扰了"],
            ["你踢了个空。掉进池塘里....\n干劲下降了！", "在踢中的那一刻。\n没想到运动神经发达的惠惠，抓着你也一起掉进池塘里了"],
            ["你抓住的似乎不是衣角。失望的觉得好平...\n干劲下降，并挨了顿揍...", "似乎没有用。被打了一顿走了...可恶，干劲没了", `爆裂女的力气好大，拼命阻止总算让她放弃了，
但是你累的干劲下降了`],
            ["?!! 高高兴兴的成为了伙伴，然后跑开了。\n真好哄啊"]
        ],
        fn: function (arr, poss, select) {
            if (random(0, 100) < 5) {
                this.closeFollow = true;
                arr.push(...setSpecifiedQuantityFishData(10));
                poss.poss = poss.poss + 5;
                poss.prob = poss.prob + 5;
                return "[ex_up↑] 但获得了惠惠的同伴阿库娅的祝福，鱼塘增加了10条鱼！并且你此次钓鱼极大概率获得一条鱼";
            } else {
                return "";
            }
        },
        isEnd: false
    },
    {
        name: "噔噔噔噔~脑袋有问题的爆裂红魔族，登场！惠惠出现了！惠惠开始咏唱爆裂魔法了！她的魔杖前端指着……你钓鱼的鱼塘……眼看整塘鱼都要被爆裂魔法炸上天，你决定：\n(有极低概率触发特殊事件)",
        handle: ["对惠惠使用全力眼罩弹射", "把她一脚踹下池塘", "拽住衣角拼命阻止", "对惠惠使用中二话术来挫败她"],
        img: "",
        result: [-1, 1, 1, -1],
        closeFollow: false,
        msg: [
            ["糟糕，被格挡了。吃了少女一拳", "少女使用头击，你的肚子被打中。倒地不起..."],
            ["踢到水里的少女骂骂咧咧的跑开了。", "火遇到水，也总会湿掉打不着的。\n少女骂骂咧咧的跑掉了"],
            ["少女摔倒了，然后跑掉了。\n好吧，也算是能继续钓鱼了？", "拽着衣角打断施法，是个好的想法？至少在你靠近她背后之前\n她就已经脑补了奇怪的画面的跑开了"],
            ["可恶，斗不过她的中二病之术，自己的尴尬癌犯了。\n虽然她满意的走掉了", "和中二爆裂女比拼厨力简直是自讨苦吃...\n虽然她满意的走掉了"]
        ],
        fn: function (arr, poss, select) {
            if (random(0, 100) < 5) {
                arr.length = 0;
                this.closeFollow = true;
                arr.push(...setSpecifiedQuantityFishData(1));
                poss.poss = poss.poss + 3;
                poss.prob = poss.prob + 3;
                return "[ex_debuff↓] 轰隆！！！！一场畅快淋漓核爆让一切都结束了。鱼塘的鱼被炸的似乎还有一条...";
            } else {
                return "";
            }
        },
        isEnd: false
    },
    {
        name: "似乎有点犯困，你想着喝点什么...",
        handle: ["汽水", "咖啡", "红茶"],
        result: [1, -1, -1],
        closeFollow: false,
        msg: [
            ["汽水似乎是有能力的", "好像喝起来还挺过瘾"],
            ["咖啡对你来说有点苦", "喝起来有糖就好了..."],
            ['<img src="https://smmcat.cn/run/fish/event/64/浩二.png" /> 很奇怪，喝完怎么更困了...', '<img src="https://smmcat.cn/run/fish/event/64/浩二.png" /> 抿了一口，猛然想起来这个红茶是浩二哥给的', `<img src="https://smmcat.cn/run/fish/event/64/浩二.png" /> 喝完满脑子里总听到压力马斯捏的声音`]
        ],
        isEnd: false
    },
    {
        name: "似乎有点犯困，你想着喝点什么...",
        handle: ["汽水", "咖啡", "红茶"],
        result: [-1, 1, 1],
        closeFollow: false,
        msg: [
            ["果然...还是想试试咖啡呢", "汽水打开喷了一脸，慌忙处理了"],
            ["感觉还可以", "久违的苦涩，就像爱情"],
            ["红茶很优雅，隔壁的大小姐也爱喝", "高雅人士的必备", "不咸不淡，味道好极了"]
        ],
        isEnd: false
    },
    {
        name: "似乎有点犯困，你想着喝点什么...",
        handle: ["汽水", "咖啡", "红茶"],
        result: [-1, -1, 1],
        closeFollow: false,
        msg: [
            ["喝着的时候突然想着一个有趣的事情，从鼻子喷出乃了（", "这汽水没气了，太嫌弃了！"],
            ["想起来怕苦体质是拒绝的", "啊好苦啊，干劲下降了..."],
            ["经典，永不过时", "专为成功人士", "芜湖！干劲提升了~"]
        ],
        isEnd: false
    },
    {
        name: "来了一只招财猫，似乎对你或你的鱼有所兴趣。你决定：",
        handle: ["喵喵叫", "上勾拳", "讨好它"],
        result: [-1, 1, -1],
        img: "https://smmcat.cn/run/fish/event/64/猫.png",
        closeFollow: false,
        msg: [
            ["猫听了流泪，可以不用再叫了", "猫被你的怪叫吓跑了"],
            ["鱼没了可以再钓，但猫没了就可以一直钓鱼了", "似乎不被打扰是好事？"],
            ["...你并没有讨好成功", "讨好失败"]
        ],
        isEnd: false
    },
    {
        name: "天空没有任何云朵，但是鸟儿已经飞过...",
        isFree: true,
        result: 0,
        isEnd: false
    },
    {
        name: "这时候起了丝丝凉爽的风，你在享受着轻轻的水流声，等待的缘分。心情好多了;",
        isFree: true,
        result: 1,
        isEnd: false
    },
    {
        name: "一个长得像旺仔的人，正在被一群女学生追打，真是可怜啊",
        isFree: true,
        result: 0,
        isEnd: false
    },
    {
        name: "一群游行的学生，似乎都不支持 “胡须” 要将所有胖次都加上胡须图案的计划。啊哈...",
        isFree: true,
        result: 0,
        isEnd: false
    },
    {
        name: "来了一群蒙面的学生，头上写了编号，还有一个用的是纸袋？她们究竟要去做什么呢...",
        isFree: true,
        result: 0,
        isEnd: false
    },
    {
        name: "你喝了一口咖啡，精神多了。",
        isFree: true,
        result: 1,
        isEnd: false
    },
    {
        name: "来了一只招财猫，似乎对你或你的鱼有所兴趣。你决定：",
        handle: ["喵喵叫", "上勾拳", "赶跑它"],
        result: [-1, 1, 1],
        img: "https://smmcat.cn/run/fish/event/64/猫.png",
        closeFollow: false,
        msg: [
            ["猫听了流泪，可以不用再叫了", "猫被你的怪叫吓跑了"],
            ["鱼没了可以再钓，但猫没了就可以一直钓鱼了", "似乎不被打扰是好事？"],
            ["没有什么比钓鱼更重要的了", "果然是妨碍钓鱼的！"]
        ],
        isEnd: false
    },
    {
        name: "来了一只招财猫，似乎对你或你的鱼有所兴趣。你决定：",
        handle: ["喵喵叫", "上勾拳", "赶跑它"],
        result: [1, -1, -1],
        closeFollow: false,
        img: "https://smmcat.cn/run/fish/event/64/猫.png",
        msg: [
            ["猫听你讲故事，但一直纳闷说的是什么", "猫也回应着喵喵叫，被萌到的你似乎有了些信心"],
            ["做了一个错事...？", "猫跑的很快，但是似乎做错了什么"],
            ["好像猫猫也不坏嗯...", "似乎这样做有些不太好"]
        ],
        isEnd: false
    },
    {
        name: "来了一只招财猫，似乎对你或你的鱼有所兴趣。你决定：",
        handle: ["喵喵叫", "上勾拳", "讨好它"],
        result: [-1, -1, 3],
        closeFollow: false,
        img: "https://smmcat.cn/run/fish/event/64/猫.png",
        msg: [
            ["猫听了流泪，可以不用再叫了", "猫被你的怪叫吓跑了"],
            ["鱼没了可以再钓，但猫没了就可以一直钓鱼了", "似乎不被打扰是好事？"],
            ["讨好成功，猫猫很开心的告诉你它抓鱼的技巧", "猫猫表示很巴适的板"]
        ],
        fn: function (arr, poss, select) {
            if (select == "3") {
                poss.poss = poss.poss + 3;
                return "[up↑] 得到高级鱼的概率大幅度增加了！且成功概率大幅度提高！";
            }
            return "似乎失去了招财的机会";
        },
        isEnd: false
    },
    {
        name: "河边有个蜻蜓，它的颜色你看好像是...",
        handle: ["红色的", "蓝白色的", "看不清"],
        closeFollow: false,
        result: [1, -1, -1],
        msg: [
            ["大概是...红色的吧", "好像是红色的？", "是红色的！"],
            ["这个颜色总联想到别的东西"],
            ["看不清就是看不清嗯", "想看看不到，迷迷糊糊就像爱情"]
        ],
        isEnd: false
    },
    {
        name: "河边有个蜻蜓，它的颜色你看好像是...",
        handle: ["红色的", "蓝白色的", "看不清"],
        closeFollow: false,
        result: [-1, 0, 1],
        msg: [
            ["大概是个好兆头", "没准是好信息", "此刻似乎有些伤感"],
            ["应该不是什么hantai的东西嗯..."],
            ["看不清就是看不清嗯", "不看不看，专心钓鱼"]
        ],
        isEnd: false
    },
    {
        name: "来了一只熊，你决定...",
        img: "https://smmcat.cn/run/fish/event/64/熊.png",
        handle: ["尝试与它交流", "指条路给它", "假装无视"],
        closeFollow: false,
        result: [-1, 0, 0],
        msg: [
            ["熊聋拉着耳朵，无趣的跑开了。可恶...", "熊只顾着抓鱼，没时间理你。干劲下降...", "熊大叫一声，吓得你一哆嗦。很不悦的感觉"],
            ["指了一条路就这样走掉了"],
            ["熊过来了，熊走掉了...无事发生", "不知不觉熊已经不在了..."]
        ],
        fn: function (arr, poss, select) {
            if (random(0, 100) < 40) {
                this.closeFollow = true;
                poss.poss = poss.poss + 1;
                return "[up↑] 反正不知道怎么回事，总之钓鱼的成功率增加了";
            } else {
                return "[ask?] 似乎并没有任何事情发生...";
            }
        },
        isEnd: false
    },
    {
        name: "来了一只熊，你决定...",
        handle: ["尝试与它交流", "指条路给它", "假装无视"],
        closeFollow: false,
        img: "https://smmcat.cn/run/fish/event/64/熊.png",
        result: [0, 1, 0],
        msg: [
            ["熊在听，但是无视掉了你", "熊抓着鱼看了你一眼，继续抓鱼", "熊在蹭树，似乎妹听到"],
            ["熊似乎听懂了你的意思，挥手向你感谢，干劲提升了！"],
            ["熊呆了一会，突然暴走离开了", "熊下水洗了个澡，离开了"]
        ],
        fn: function (arr, poss, select) {
            if (random(0, 100) < 40) {
                this.closeFollow = true;
                poss.poss = poss.poss + 1;
                return "[up↑] 反正不知道怎么回事，总之钓鱼的成功率增加了";
            } else {
                return "[ask?] 似乎并没有任何事情发生...";
            }
        },
        isEnd: false
    },
    {
        name: "水面很安稳，似乎没有鱼儿上钩。你这个时候准备...",
        handle: ["撒点苹果", "撒点鱼饵", "撒点孜然"],
        img: "",
        closeFollow: false,
        result: [-1, 1, -1],
        msg: [
            ["睡着的鱼被惊醒，似乎吓跑了一些", "鱼表示个头太大，失望离开", "你似乎随机砸死了一只鱼"],
            ["好耶，似乎鱼塘的鱼儿增加了", "你的无心之举，引来了其他鱼塘的鱼儿"],
            ["虽然做了这样的事情，但是你总觉得哪里不对劲", "加了点孜然，还是有点淡"]
        ],
        fn: function (arr, poss, select) {
            if (select == "1") {
                arr.pop();
                return "[lost↓] 鱼塘丢失了一条鱼";
            } else if (select == "2") {
                const num = random(1, 3);
                const fishList = setSpecifiedQuantityFishData(num);
                arr.push(...fishList);
                return `[up↑] 鱼塘里增加了 ${num} 条鱼`;
            } else {
                return "[lost↓] 收益甚微";
            }
        },
        isEnd: false
    },
    {
        name: "水面很安稳，似乎没有鱼儿上钩。你这个时候准备...",
        handle: ["撒点苹果", "撒点鱼饵", "撒点孜然"],
        closeFollow: false,
        result: [1, -1, 1],
        msg: [
            ["似乎这样无意义的举动你挺期待的", "睡着的鱼被你砸的苹果惊醒了", "苹果の之力！"],
            ["你的鱼饵并没有作用，你似乎有些灰心", "鱼饵袋撕破了，掉了一地。你很心疼"],
            ["鱼表示准备吃点野味加餐", "似乎鱼吃了很上头?"]
        ],
        isEnd: false
    },
    {
        name: "你忽然看到什么顺着河漂了下来，仔细一看竟然是尸体，就在你很惊讶的时候，尸体转头看了看你，原来是僵尸小姐在假装溺尸。你打算...",
        handle: ["打个招呼", "吓唬一下", "喂，下面有鱼没？"],
        closeFollow: false,
        result: [1, -1, 1],
        msg: [
            ["僵尸小姐也对你打了打招呼，有人喜欢钓鱼，有人喜欢假装溺尸，大家都有自己的爱好呢", "可爱的僵尸娘说了句：你在钓鱼啊，那我先飘走咯~\n然后飘走了。真可爱呢..."],
            ["僵尸娘表示很生气，后果很严重", "僵尸娘很记仇，给你挂了一个诅咒。\n糟糕了..."],
            ["僵尸娘：...", "僵尸娘一脸嫌弃的看了你一眼...你莫名的兴奋了起来 ¿"]
        ],
        fn: function (arr, poss, select) {
            if (select == "3") {
                if (random(0, 100) < 70) {
                    this.closeFollow = true;
                    poss.poss = poss.poss + 1;
                    const fishMsg = arr.length ? arr.map((item) => item.name).slice(0, 4).filter((i) => i !== void 0).join("、") : "鱼塘里没有鱼哦...，但是有可爱的僵尸娘嗯！";
                    return `“[up↑] 我都看到了哦~”僵尸娘看着水下说到。
“看到了什么？”
` + fishMsg + "\n你似乎洞察一切，成功概率提升了！";
                }
                return ``;
            } else {
                return "无事发生后。你还是继续钓你的鱼...";
            }
        },
        isEnd: false
    },
    {
        name: "你忽然看到什么顺着河漂了下来，仔细一看竟然是尸体，就在你很惊讶的时候，尸体转头看了看你，原来是僵尸小姐在假装溺尸。你打算...",
        handle: ["打个招呼", "吓唬一下", "喂，下面有鱼没？"],
        closeFollow: false,
        result: [-1, 1, -1],
        msg: [
            ["僵尸娘一脸嫌弃着看着钓鱼佬，可恶", "似乎不是那么顺利..."],
            ["僵尸娘吓了一跳。表情是这样的：\n(*Φ皿Φ*)\n你瞬间上头。干劲提升", "僵尸娘既慌张又可爱的样子似乎让你找到了青春"],
            ["她似乎一脸不耐烦的说没有。", "她已经僵直着动不了了，他以为你在为难她"]
        ],
        isEnd: false
    },
    {
        name: "你看着水上忽然泛起涟漪，只听欢快的bgm响起，一位女神左手拿着银斧头右手拿着金斧头从水里长了出来，她悠悠问到“少年哟，你掉在河里的是这个金斧头，还是这个银斧头呢？”",
        handle: ["都不是", "金斧头", "银斧头", "都是"],
        closeFollow: false,
        result: [1, 0, 0, -1],
        msg: [
            ["“这样啊...”\n女神收回了斧头。\n“祝您钓到杂鱼~ 那么拜了个拜~”\n可恶...似乎被骂了。但是你莫名兴奋了起来 ¿", "“女神大人，我丢的是鱼。走开啦!”\n女神骂骂咧咧走开的样子让你看到了青春。"],
            ["金斧头是幸福的象征~"],
            ["银斧头是机遇的象征~(成功率下降但是钓鱼基数上升了)"],
            ["贪婪的钓鱼佬噢~你这样可是不对的！", "女神扬起了长发，说了一句：“what the FAT，左边的斧头是为了忘记你，右边的斧头是为了记住你。但是我又忘记了你，又失去了你”...\n什么鬼..."]
        ],
        fn: function (arr, poss, select) {
            if (select == "2") {
                poss.poss = poss.poss + 1;
                poss.lowProb = poss.lowProb - 1;
                return "[up↑] (你的钓鱼成功率上升但稀有度最低基准下降了)";
            } else if (select == "3") {
                poss.poss = poss.poss - 1;
                poss.lowProb = poss.lowProb + 1;
                return "[up↑] (你的钓鱼成功率下降但是稀有度最低基准上升了)";
            } else {
                return "[lost?] 似乎失去了什么机会...";
            }
        },
        isEnd: false
    },
    {
        name: "鱼竿有点动摇，似乎是个好兆头！",
        handle: ["挥杆", "再等等"],
        closeFollow: false,
        result: [1, -1],
        msg: [
            ["好机会！出货吧！", "你大喊一声：芜湖~ 随即挥杆", "爱情，爱情来了！"],
            ["似乎失去了一些机会", "好像失去了什么"]
        ],
        isEnd: true
    },
    {
        name: "鱼竿有点动摇，似乎是个好兆头！",
        handle: ["挥杆", "再等等"],
        closeFollow: false,
        result: [-2, 1],
        msg: [
            ["感觉上总觉得不对劲", "要来嘞（大力", "...有丝微妙的不对劲"],
            ["果然再等等是好的", "安静等待总是好事的"]
        ],
        isEnd: true
    }
];


export // 事件名 事件选项 操作结果 是否结局
  const eventOverData = [
    {
      name: "鱼竿在猛烈晃动，是时候了...",
      handle: ["收杆"],
      result: [2],
      msg: [
        ["好像钓到了什么", "看看钓到了什么"]
      ],
      isEnd: true
    },
    {
      name: "鱼竿在轻微晃动，是时候了...",
      handle: ["收杆"],
      result: [0],
      msg: [
        ["好像钓到了什么", "看看钓到了什么"]
      ],
      isEnd: true
    },
    {
      name: "鱼竿在剧烈晃动，是时候了...",
      handle: ["收杆"],
      result: [1],
      msg: [
        ["好像钓到了什么", "看看钓到了什么"]
      ],
      isEnd: true
    },
    {
      name: "鱼竿在剧烈晃动，是时候了...",
      handle: ["收杆"],
      result: [1],
      msg: [
        ["好像钓到了什么", "看看钓到了什么"]
      ],
      isEnd: true
    },
    {
      name: "鱼竿在剧烈晃动，是时候了...",
      handle: ["收杆"],
      result: [1],
      msg: [
        ["好像钓到了什么", "看看钓到了什么"]
      ],
      isEnd: true
    },
    {
      name: "鱼跑了",
      handle: ["收杆"],
      result: [-99],
      msg: [
        ["就像失去的爱情...", "失望离场"]
      ],
      isEnd: true
    }
  ];