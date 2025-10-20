import { Context, Schema, h } from 'koishi'
import type { } from 'koishi-plugin-monetary'
import fs from 'fs/promises'
import path from 'path'
import { getOrCreateFile, setOrCreateFile } from './fileUtils';
import { FishingRod } from './fishingRod'
import crypto from 'crypto';
import { cooking } from './cooking';


export const name = 'smmcat-fishtime'

export interface Config {
  fishpondRefreshTime: number;
  atQQ: boolean;
  fishData: string;
  achieveData: string;
  userInfoData: string;
  historyData: string;
  propsData: string;
  fishingRodData: string;
  cookingData: string;
  configData: string;
  debug: boolean;
  waitingTimeMax: number;
  waitingTimeMin: number;
  totalEventMax: number;
  totalEventMin: number;
  totalRandomFishpondMax: number;
  totalRandomFishpondMin: number;
  discardEvent: boolean;
}

export const Config: Schema<Config> = Schema.object({
  fishpondRefreshTime: Schema.number().default(36e5).description("鱼塘刷新时间 (毫秒)"),
  atQQ: Schema.boolean().default(false).description("回复消息附带 @发送者 [兼容操作]"),
  fishData: Schema.string().default("./data/fishData/data.json").description("玩家仓库数据存放路径"),
  achieveData: Schema.string().default("./data/fishData/achieveData.json").description("玩家成就数据存放路径"),
  userInfoData: Schema.string().default("./data/fishData/userInfoData.json").description("玩家统计数据存放路径"),
  historyData: Schema.string().default("./data/fishData/historyData.json").description("玩家历史总钓鱼数据存放路径"),
  propsData: Schema.string().default("./data/fishData/propsData.json").description("玩家道具数据的存放路径"),
  fishingRodData: Schema.string().default("./data/fishData/fishingRodData").description("玩家鱼竿数据文件夹的存放路径"),
  cookingData: Schema.string().default("./data/fishData/cookingData").description("玩家烹饪数据文件夹的存放路径"),
  configData: Schema.string().default("./data/fishData/config").description("钓鱼配置放置的项文件夹"),
  debug: Schema.boolean().default(false).description("动态显示基准与成功率状态信息"),
  waitingTimeMax: Schema.number().default(3e4).description("每次事件触发的最长等待时间[毫秒]"),
  waitingTimeMin: Schema.number().default(1e4).description("每次事件触发的最短等待时间[毫秒]"),
  totalEventMax: Schema.number().default(4).description("每轮钓鱼最多触发事件的总数量"),
  totalEventMin: Schema.number().default(2).description("每轮钓鱼最少触发事件的总数量"),
  totalRandomFishpondMax: Schema.number().default(20).description("群内鱼塘刷新后最大存在的鱼"),
  totalRandomFishpondMin: Schema.number().default(5).description("群内鱼塘刷新后最少存在的鱼"),
  discardEvent: Schema.boolean().default(false).description("弃用随机事件，时间一到直接获得结局")
})

export const inject = ['monetary', 'database'];

export function apply(ctx: Context, config: Config) {

  FishingRod.basePath = config.fishingRodData

  class FileOperationQueue {
    queue: any[];
    running: boolean;
    constructor() {
      this.queue = []
      this.running = false
    }
    async add(operation) {
      return new Promise((resolve, reject) => {
        this.queue.push({ operation, resolve, reject })
        if (!this.running) {
          this.process()
        }
      })
    }
    async process() {
      if (this.queue.length === 0) {
        this.running = false
        return
      }
      this.running = true
      const { operation, resolve, reject } = this.queue.shift()
      try {
        const result = await operation()
        resolve(result)
      } catch (error) {
        reject(error)
      }
      this.process()
    }
  }

  const FileQueue = new FileOperationQueue()

  // 写入 koishi 下的目标路径文件
  async function setBaseDirStoreData(upath: string, data: object) {
    FileQueue.add(() => setOrCreateFile(path.join(ctx.baseDir, upath), JSON.stringify(data)))
    return await FileQueue.process();
  }

  // 获取 koishi 下的目标路径文件
  async function getBaseDirStoreData(upath: string) {
    const jsonData = await FileQueue.add(() => getOrCreateFile(path.join(ctx.baseDir, upath))) as unknown as string
    return JSON.parse(jsonData);
  }
  ctx
    .command('钓鱼')

  ctx.command('钓鱼/钓鱼说明', '简单介绍下钓鱼游戏').action(async ({ session }) => {
    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    const msg = `
钓鱼游戏是比较细节向的游戏了，是一种以 "事件驱动" 为特色的游戏;

【钓鱼操作】
在游戏中，会有各种事件发生，你可以选择使用 /钓鱼操作 下标 来操作它，也可以忽略它。
每个事件都可能会影响最终的收获；或者给予一些增益效果。

【钓鱼隐藏分】
影响钓鱼的结果有如下几个：成功概率、初始稀有度基准、初始稀有度下限，这些并不会在界面上显示，但是它是存在的！
    

【钓鱼临时属性】
通过事件或者使用道具可以累加对应属性。其中：
[成功概率] 最终是否成功钓到鱼的准则
[初始稀有度基准] 是否能钓到更高难度的鱼
[初始稀有度] 最低会钓到什么样低难度的鱼

【钓鱼鱼竿】
玩家都有一个普通鱼竿，通过 升级鱼竿 获得更高概率捕获大鱼的可能！
不过升级鱼竿不是靠积分，玩家仍然要通过捕获到关键的鱼去进行升级鱼竿操作

【钓鱼道具】
道具目前只能在特殊事件中获得。会相应增加初始的属性。但是不可同时叠加使用；

【结尾】
最后，不要担心失败。多多体验和研究这游戏的特色和对应攻略吧~
    `

    await session.send(at + msg);
  })

  ctx.command('钓鱼/开始钓鱼', '开始钓鱼吧').userFields(['id']).action(async ({ session }) => {
    let at = "";
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`;
    }
    const temp = getguildData(session.guildId);
    if (temp.isPlay(session.userId)) {
      await session.send(at + "你已经在钓鱼了...");
      return;
    }
    temp.initFishpond();
    if (!temp.fishpond.length) {
      await session.send(at + "当前鱼塘似乎没有鱼，你确定还要钓鱼吗？\n若是确定，请在 10秒 内发送： 是");
      let affirm = await session.prompt(1e4);
      if (affirm?.trim() !== "是") {
        return;
      }
    }
    try {
      await ctx.monetary.cost(Number(session.user.id), 5);
    } catch (error) {
      await session.send(at + "积分不足够买鱼饵，你可以尝试游玩别的游戏获取积分");
      return;
    }
    await temp.addPlay(session, at);
    await session.send(at + "你花费了 5 积分买了鱼饵，挥动了鱼竿，开始了钓鱼。");
    upUserInfoSotreData.upFishTime(session.userId);
    const len = temp.playUser[session.userId].timer.length;
    for (let index = 0; index < len; index++) {
      if (index < len - 1) {
        temp.playUser[session.userId].eventFn[index] = () => {
          return new Promise((resolve, rejects) => {
            ++temp.playUser[session.userId].index;
            temp.playUser[session.userId].timer[index] = setTimeout(async () => {
              temp.playUser[session.userId].eventFn[index] = eventData[temp.playUser[session.userId].eventIndex[index]];
              await session.send(at + (temp.playUser[session.userId].eventFn[index].img ? `<img src="${temp.playUser[session.userId].eventFn[index].img}"/> 

` : "") + (temp.playUser[session.userId].head ? `[${temp.playUser[session.userId].head}]` : "") + temp.playUser[session.userId].eventFn[index].name + "\n\n" + (temp.playUser[session.userId].eventFn[index].handle ? temp.playUser[session.userId].eventFn[index].handle.map((item, index2) => {
                return `${index2 + 1}. ${item}`;
              }).join("\n") + "\n\n 请选择你的操作：在事件持续期间可发送 /钓鱼操作 下标" : ""));
              if (temp.playUser[session.userId].eventFn[index].isFree) {
                if (temp.playUser[session.userId].eventFn[index].result) {
                  const dict = { 0: "钓鱼成功率", 1: "捕获大鱼的可能性" };
                  const target = random(0, 2);
                  if (target) {
                    temp.playUser[session.userId].poss += temp.playUser[session.userId].eventFn[index].result;
                  } else {
                    temp.playUser[session.userId].prob += temp.playUser[session.userId].eventFn[index].result;
                  }
                  await session.send(temp.playUser[session.userId].eventFn[index].result > 0 ? `[up↑] ${dict[target]}上升` : `[debuff↓] ${dict[target]}下降`);
                }
              }
              if (config.debug) {
                await session.send(`成功可性：${temp.playUser[session.userId].poss} 基准：${temp.playUser[session.userId].prob}`);
              }
              resolve(true);
            }, random(config.waitingTimeMin, config.waitingTimeMax));
          });
        };
      } else {
        temp.playUser[session.userId].eventFn[index] = () => {
          return new Promise((resolve, rejects) => {
            ++temp.playUser[session.userId].index;
            temp.playUser[session.userId].timer[index] = setTimeout(async () => {
              temp.playUser[session.userId].startEvent = false;
              temp.playUser[session.userId].eventFn[index] = eventOverData[random(0, eventOverData.length)];
              await session.send(at + (temp.playUser[session.userId].eventFn[index].img ? `<img src="${temp.playUser[session.userId].eventFn[index].img}"/> 

` : "") + (temp.playUser[session.userId].head ? `[${temp.playUser[session.userId].head}]
` : "") + temp.playUser[session.userId].eventFn[index].name + "\n\n" + temp.playUser[session.userId].eventFn[index].msg[0][random(0, temp.playUser[session.userId].eventFn[index].msg.length)]);
              if (config.debug) {
                await session.send(`成功可性：${temp.playUser[session.userId].poss} 基准：${temp.playUser[session.userId].prob}`);
              }
              const fish = checkOverTimeFn(temp.playUser[session.userId].eventFn[index], 0, temp.playUser[session.userId], temp.fishpond);
              if (fish) {
                await setFishingHistory(session.userId, fish.name);
                await setHistoryStoreData(session.userId, fish.name, session);
                await upUserInfoSotreData.upSuccessTime(session.userId);
                if (fish.hard > 6)
                  await upUserInfoSotreData.upNiceTime(session.userId);
                temp.removeFishItem(fish.name);
                const msg = at + `${fish.img ? `<img src="${fish.img}" />
` : ""}你成功钓到了 ${fish.name}` + (fish.msg ? `

${fish.msg}` : "");
                await session.send(msg);
              } else {
                await session.send(at + `很遗憾，你什么也没钓到`);
              }
              temp.clearUserPlay(session.userId);
              resolve(false);
            }, random(config.waitingTimeMin, config.waitingTimeMax));
          });
        };
      }
    }
    const eventLen = temp.playUser[session.userId].eventFn.length;
    for (let i = 0; i < eventLen; i++) {
      if (!temp.isPlay(session.userId))
        break;
      temp.playUser[session.userId].startEvent = await temp.playUser[session.userId].eventFn[i]();
    }
  })

  ctx.command('钓鱼/查看鱼塘', '查看群鱼塘的信息').action(async ({ session }) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    // 获取单群信息
    const temp = getguildData(session.guildId);

    temp.initFishpond() && await session.send(at + '隔了一段时间，鱼塘内容刷新了');
    const msg = temp.getNowFishPondInfo()
    await session.send(at + msg);
  });

  ctx.command('钓鱼/钓鱼成就', '查看钓鱼成就').action(async ({ session }) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    const data = await getBaseDirStoreData(config.achieveData);

    // 检查错误
    await checkAchieveLegitmacy(data, session, at)

    if (!data[session.userId]) {
      data[session.userId] = { possess: [], take: '' }
      await setBaseDirStoreData(config.achieveData, data);
      await session.send(at + '你还没有任何成就')
      return
    }

    if (!Object.keys(data[session.userId].possess).length) {
      await session.send(at + '你还没有任何成就')
      return
    }

    const userData = data[session.userId];

    const msg = `你的成就如下:${userData.take ? `\n\n[当前佩戴]\n${userData.take}\n\n` : '\n\n'}` + `[持有总成就]\n` + data[session.userId].possess.map(item => {
      return `${item}`
    }).join('\n')
    await session.send(at + msg);
  });

  ctx.command('钓鱼/钓鱼历史', '查看钓鱼总记录').action(async ({ session }) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    const data = await getBaseDirStoreData(config.historyData);

    // 不存在用户数据
    if (!data[session.userId]) {
      // 初始化用户数据
      data[session.userId] = {}
      await setBaseDirStoreData(config.historyData, data);
    }

    // 获取用户历史记录
    const userData = data[session.userId];

    if (!Object.keys(userData).length) {
      await session.send('历史记录中查看后发现，似乎您还没有钓出任何一条鱼...');
      return
    }

    const fishNumber = Object.values(userData);
    // 检查成就
    await markAchieveFn(session.userId, session, data);

    const msg = `您的钓鱼历史记录如下：\n\n` + Object.keys(userData).map((item, index) => {
      return `${item} x${fishNumber[index]}`
    }).join('\n');

    await session.send(at + msg);

  });

  ctx.command('钓鱼/查看成就 <achievement>', '查看钓鱼的对应成就称号').action(async ({ session }, achievement) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    const queryAchieve = achievement?.trim();

    if (!queryAchieve) {
      await session.send(at + `你还没标注查看哪个成就信息，请按格式发送：\n\n 例如：/查看成就 ${achieveList[0].name}`)
      return
    }

    const info = achieveList.find(item => item.name == queryAchieve);

    if (!info) {
      await session.send('未找到该成就信息');
      return
    }

    const msg = `找到该成就的信息：\n\n[${info.name}]\n描述：${info.info}\n获得条件：${info.need.map(item => {
      return `${item.name}>=${item.num}条`
    }).join('、')}`
    await session.send(at + msg);

  });

  ctx.command('钓鱼/钓鱼佩戴 <title>', '佩戴或卸下钓鱼的成就').action(async ({ session }, title) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    const queryAchieve = title?.trim();

    const achieveData = await getBaseDirStoreData(config.achieveData);

    // 初始化
    if (!achieveData[session.userId]) {
      achieveData[session.userId] = {}
      achieveData[session.userId]['take'] = ''
      achieveData[session.userId]['possess'] = []
      await setBaseDirStoreData(config.achieveData, achieveData);
    }

    // 检查错误
    await checkAchieveLegitmacy(achieveData, session, at)

    if (!queryAchieve) {
      if (!achieveData[session.userId].take) {
        await session.send(at + `您目前还没有选择对应的成就来佩戴，\n\n您可以发送 /钓鱼成就 来查看您当前获得的成就。\n之后使用 /钓鱼成就 成就名 来佩戴目前已获得的成就`);
        return
      }
      achieveData[session.userId].take = ''
      await setBaseDirStoreData(config.achieveData, achieveData);
      await session.send(at + `成功卸下当前成就`);
      return
    }

    const type = achieveData[session.userId].possess.find(item => item == queryAchieve);
    if (!type) {
      await session.send(at + '抱歉，似乎未持有该成就。\n\n您可以发送 /钓鱼成就 来查看您当前获得的成就。')
    } else {
      achieveData[session.userId].take = queryAchieve
      await setBaseDirStoreData(config.achieveData, achieveData);
      const info = achieveList.find(item => item.name == queryAchieve);
      await session.send(at + `佩戴成就 [${queryAchieve}] 成功。${info ? `\n\n${info.info}` : ''}`);
    }

  });

  // 检索称号是否有误
  async function checkAchieveLegitmacy(achieveData, session, at) {
    const achieveMap = achieveList.map(item => item.name)
    const errtakeAchieve = achieveData[session.userId]['take'] ? !achieveMap.includes(achieveData[session.userId]['take']) : false
    const errachieveList = achieveData[session.userId]['possess'].filter(item => !achieveMap.includes(item))
    const takeTemp = achieveData[session.userId]['take']
    if (errtakeAchieve) {
      achieveData[session.userId]['take'] = ''
    }
    if (errachieveList.length) {
      achieveData[session.userId]['possess'] = achieveData[session.userId]['possess'].filter(item => achieveMap.includes(item))
    }
    if (errtakeAchieve || errachieveList.length) {
      session.send(`检测存在错误称号 ${takeTemp},${errachieveList}。\n已移除`)
      await setBaseDirStoreData(config.achieveData, achieveData);
    }
  }

  // 成就系统
  const achieveList = [
    {
      name: "杂鱼大叔",
      msg: ["怎么了杂鱼大叔~♥ 你已经钓满十条杂鱼了哦~\n 果然要给你一下奖励呢！", "对于经常钓到杂鱼的大叔的嘉奖。继续努力吧~ 杂鱼大叔"],
      info: "佩戴后，钓鱼的收获环节会增加两倍钓到 杂鱼 的概率",
      need: [{ name: "杂鱼", num: 10 }],
      upProb: [{ name: "杂鱼", up: 2 }]
    },
    {
      name: "多宝鱼专家",
      msg: ["多次成功钓上多宝鱼，你已经充分有捕获它的经验了！", "你已经掌握了捕捞多宝鱼的技巧"],
      info: "佩戴后，钓鱼的收获环节会增加两倍钓到 多宝鱼 的概率",
      need: [{ name: "多宝鱼", num: 10 }],
      upProb: [{ name: "多宝鱼", up: 2 }]
    },
    {
      name: "入门专家",
      msg: ["餐桌上常见的鱼，你已经出的习以为常了。掌握了这门技术", "你已经掌握了捕捞常见的鱼的技巧"],
      info: "佩戴后，钓鱼的收获环节会增加两倍钓到 鲤鱼、生鱼、鲫鱼 的概率",
      need: [{ name: "鲤鱼", num: 10 }, { name: "生鱼", num: 10 }, { name: "鲫鱼", num: 10 }],
      upProb: [{ name: "鲤鱼", up: 2 }, { name: "生鱼", up: 2 }, { name: "鲫鱼", up: 2 }]
    },
    {
      name: "龟男",
      msg: ["钓到了不少乌龟了,做的好!已经不错了"],
      info: "佩戴后，钓鱼的收获环节会增加三倍钓到 乌龟 的概率",
      need: [{ name: "乌龟", num: 10 }],
      upProb: [{ name: "乌龟", up: 3 }]
    },
    {
      name: "KFC推销员",
      msg: ["看你钓了不少KFC鱼，想必也是特意这样做的吧？那就送你这个称号吧！", "失败是成功之母；VW50，你就是成功支付！\n\n嗯！既然你愿意这样钓这么多这条鱼，应该也有你的想法！送你了，这个称号！"],
      info: "佩戴后，钓鱼的收获环节会增加两倍钓到 VW50鱼 的概率",
      need: [{ name: "VW50鱼", num: 10 }],
      upProb: [{ name: "VW50鱼", up: 2 }]
    }
  ]

  // 获取用户称号佩戴信息
  async function getStoreAchieveTakeData(userId) {
    const data = await getBaseDirStoreData(config.achieveData);

    // 初始化
    if (!data[userId]) {
      data[userId] = { possess: [], take: '' }
      await setBaseDirStoreData(config.achieveData, data);
    }

    return data[userId].take
  }

  ctx.command('钓鱼/钓鱼统计', '查看用户个人记录信息').action(async ({ session }) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    const data = await getBaseDirStoreData(config.userInfoData);

    // 字典
    const dictionaries = { fishTime: '钓鱼次数', successTime: '成功次数', niceTime: '高价值捕获次数' }


    // 初始化信息
    if (!data[session.userId]) {
      data[session.userId] = {
        record: {
          fishTime: 0,
          successTime: 0,
          niceTime: 0
        }
      }
      await setBaseDirStoreData(config.userInfoData, data);
    }

    const userData = data[session.userId];
    let call = ''
    let isOver = false;

    if (userData.record.fishTime == 0 && userData.record.successTime == 0 && userData.record.niceTime == 0) {
      isOver = true;
      const msg = ["嘿，似乎你才刚刚开始接触钓鱼的萌新对吧~", "找到你了，美味的萌新！"]
      call = msg[random(0, msg.length)]
    }

    if (!isOver) {
      if (userData.record.fishTime > 50) {
        const msg = ["看起来你已经掌握且适应了，", "没错，你就是钓鱼佬了！"]
        call = msg[random(0, msg.length)]
      } else if (userData.record.fishTime > 10) {
        const msg = ["你已经初步了解钓鱼的操作了，", "你开始学会钓鱼了，", "你坚持到现在已经很不错了，"]
        call = msg[random(0, msg.length)]
      } else if (userData.record.fishTime < 10) {
        const msg = ["你是刚接触钓鱼游戏的玩家，", "你似乎还是一个太熟悉操作的新人，"]
        call = msg[random(0, msg.length)]
      } else if (userData.record.fishTime < 10) {
        const msg = ["你是刚接触钓鱼游戏的玩家，", "你似乎还是一个太熟悉操作的新人，"]
        call = msg[random(0, msg.length)]
      }
    }

    if (!isOver) {
      const gl = (userData.record.successTime / userData.record.fishTime);
      if (gl > 0.8) {
        const msg = ["并且你这出货率有点离谱...", "还有这成功率有些离谱啊。"]
        call = call + msg[random(0, msg.length)]
      } else if (gl > 0.6) {
        const msg = ["而且看起来还挺欧的，", "并且你的成功率还挺高啊！"]
        call = call + msg[random(0, msg.length)]
      } else if (gl > 0.3) {
        const msg = ["并且你的成功率一般，", "并且看这数据成功率还行，"]
        call = call + msg[random(0, msg.length)]
      } else if (gl < 0.3) {
        const msg = ["话说看这成功率有点非啊，", "但我猜你一定是非洲人，成功率有些低，"]
        call = call + msg[random(0, msg.length)]
      }
    }

    if (!isOver) {
      if (userData.record.niceTime > 30) {
        const msg = ["最后，看你也出了很多稀有度高的鱼了", "嘛，也出了很多稀有度高的鱼，某方面看已经遥遥领先了。"]
        call = call + msg[random(0, msg.length)]
      } else if (userData.record.niceTime > 10) {
        const msg = ["至此，我看你也是起码出了十条以上的高难度鱼了，可喜可贺", "就算这样，稀有度的鱼你也算是遇到了些。还不错嗯~"]
        call = call + msg[random(0, msg.length)]
      } else if (userData.record.niceTime > 1) {
        const msg = ["依我看你也捕获了几条高难度鱼的，加油。", "最后，我看你也捕获了几条高难度的鱼。不错！"]
        call = call + msg[random(0, msg.length)]
      } else if (userData.record.niceTime < 1) {
        const msg = ["看到最后，好像你还没捕获成功一条高难度的鱼，可别灰心啊。", "说了那么多，也还是没有抓到一条高难度鱼的杂鱼大叔，向着零的突破加油吧~♥"]
        call = call + msg[random(0, msg.length)]
      }
    }

    const describeNameList = Object.keys(userData.record);
    const describeValueList = Object.values(userData.record);
    const msg = `你的统计信息如下：\n\n` + call + `\n\n` + describeValueList.map((item, index) => {
      return `${dictionaries[describeNameList[index]]}: ${item}次`
    }).join('\n');

    await session.send(at + msg);
  })

  // 用户本地统计信息
  const upUserInfoSotreData = {
    initData: {
      record: {
        fishTime: 0,
        successTime: 0,
        niceTime: 0
      }
    },
    upFishTime: async function (userId: any, time: number = 1) {
      const store = await getBaseDirStoreData(config.userInfoData);
      if (!store[userId]) store[userId] = this.initData;
      const userData = store[userId];

      userData.record.fishTime = userData.record.fishTime + time;
      await setBaseDirStoreData(config.userInfoData, store);
    },
    upSuccessTime: async function (userId: any, time: number = 1) {
      const store = await getBaseDirStoreData(config.userInfoData);
      if (!store[userId]) store[userId] = this.initData;
      const userData = store[userId];
      userData.record.successTime = userData.record.successTime + time;
      await setBaseDirStoreData(config.userInfoData, store);
    },
    upNiceTime: async function (userId: any, time: number = 1) {
      const store = await getBaseDirStoreData(config.userInfoData);
      if (!store[userId]) store[userId] = this.initData;
      const userData = store[userId];
      userData.record.niceTime = userData.record.niceTime + time;
      await setBaseDirStoreData(config.userInfoData, store);
    }
  }

  ctx.command('钓鱼/查看鱼类 <fish>', '查看鱼类的信息').action(async ({ session }, fish) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    const queryFish = fish?.trim();

    if (!queryFish) {
      await session.send(at + `你还没标注查看哪条鱼的信息的，请按格式发送：\n\n 例如：/查看鱼类 ${fishData[0].name}`)
      return
    }
    const info = fishData.find(item => item.name == queryFish);

    if (!info) {
      await session.send(at + '未查到该鱼信息');
      return
    }

    // 过滤不可选鱼
    const filterFishData = fishData.filter(item => item.select !== false);
    const prob = Math.floor((info.prob / filterFishData.reduce((sum: number, acc: any) => sum + acc.prob, 0)) * 100)
    await session.send(at + `${info.img ? `<img src="${info.img}" />` + '\n' : ''}获取到该鱼信息成功：${info.info ? `\n\n ${info.info}` : ''}\n\n【${info.name}】\n出现概率: ${info.select ? prob + '%' : '暂无'}\n捕获难度: ${info.hard} [${formatHard(info.hard)}]\n售出价格: ${info.price || ''}\n品质: ${info.quality || ''}`);
  })

  ctx.command('钓鱼/钓鱼库存', '查看用户收获的鱼类库存总计').action(async ({ session }) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    // 获取单群信息
    const temp = getguildData(session.guildId);
    const msg = await temp.getUserFshHistory(session.userId)
    await session.send(at + msg);
  });

  ctx.command('钓鱼/结束钓鱼', '停止钓鱼').action(async ({ session }) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    // 获取单群信息
    const temp = getguildData(session.guildId);

    if (!temp.playUser[session.userId]) {
      await session.send('你还没有钓鱼呢');
      return
    }

    temp.clearUserPlay(session.userId);

    // 记录回退 钓鱼次数
    await upUserInfoSotreData.upFishTime(session.userId, -1);
    await session.send(at + '已结束钓鱼');

  });

  ctx.command("钓鱼道具", '查看自己持有的道具').action(async ({ session }) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    const propsData = await getBaseDirStoreData(config.propsData);

    if (!propsData[session.userId]) {
      propsData[session.userId] = { have: {}, use: {} }
      await setBaseDirStoreData(config.propsData, propsData);
    }

    const info = propsData[session.userId].have;

    if (!Object.keys(info).length) {
      await session.send(at + '你未持有任何道具');
      return
    }

    const propsNameList = Object.keys(info);
    const propsNumList = Object.values(info);
    const msg = `你当前持有如下道具：\n\n` + propsNameList.map((item, index) => {
      return `${item} x${propsNumList[index]}`
    }).join('\n')

    await session.send(at + msg);
  })

  // 最后出货的计算 事件 选择 数据 鱼塘
  function checkOverTimeFn(eventFn, select, playData, fishpond) {

    // 最后一次操作 改变概率
    playData.prob = playData.prob + eventFn.result[select]

    if (playData.prob < playData.lowProb) {
      playData.prob = playData.lowProb
    }

    // 过滤出货项
    let data = fishpond.filter(item => playData.prob >= item.hard && playData.lowProb <= item.hard);

    // 计算佩戴的成就加成
    if (playData.head) {
      const _filter = achieveList.find(item => item.name == playData.head);
      const info = _filter && _filter.upProb;
      if (info) {
        info.forEach(item => {
          const filterData = data.filter(i => i.name == item.name)
          if (filterData.length) {
            const obj = filterData[0]; // 要复制的对象
            const count = Math.floor(filterData.length * item.up) - filterData.length; // 要复制的数量
            if (count >= 1) {
              data = [...data, ...Array.from({ length: count }, () => ({ ...obj }))];
            }
          }
        })
      }
    }


    // 没有鱼 返回空
    if (!data.length) return '';
    // 概率钓鱼失败
    if (random(0, 10) > playData.poss) return '';

    // 返回一条鱼的信息
    return data[random(0, data.length)];
  }

  function formatHard(num) {
    if (num > 10) {
      return '巨难'
    } else if (num > 5) {
      return '困难'
    } else if (num > 3) {
      return '一般'
    } else if (num >= 1) {
      return '简单'
    } else {
      return '???'
    }
  }

  ctx.command('钓鱼/查看道具 <props>', '查看对应钓鱼道具中的说明').action(async ({ session }, props) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    const operate = props?.trim();

    if (!operate) {
      await session.send(at + `请输入道具名，例如格式为\n /查看道具 xxx`);
      return
    }

    const info = propsCommonData.find(item => item.name == operate);

    if (!info) {
      await session.send(at + `没有找到名为 ${operate} 的道具`);
      return
    }

    // 字典
    const dictList = { poss: '成功概率', prob: '初始稀有度基准', lowProb: '初始稀有度下限' }

    const msg = at + `${info.img ? `<img src="${info.img}"/>` : ''}` + `以下是该道具的信息：\n\n道具名：${info.name}\n说明：${info.info}`

    await session.send(msg);
  })

  ctx.command('钓鱼/钓鱼操作 <uindex>', '对钓鱼发生的事件做出操作').action(async ({ session }, uindex) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    const temp = getguildData(session.guildId);
    if (!temp.isPlay(session.userId)) {
      await session.send(at + '你还没开始钓鱼呢...');
      return
    }
    if (!temp.playUser[session.userId].startEvent) {
      await session.send(at + (temp.playUser[session.userId].head ? `[${temp.playUser[session.userId].head}]\n` : '') + '没有可选事件');
      return
    }

    const operate = Number(uindex?.trim());
    // // 用户输入非字符
    if (isNaN(operate) || !operate) {
      await session.send(at + (temp.playUser[session.userId].head ? `[${temp.playUser[session.userId].head}]\n` : '') + '操作有误，请发送指定下标的操作:\n\n 例如： /钓鱼操作 1');
      return
    }

    // 当前事件
    const noweventFn = eventData[temp.playUser[session.userId].eventIndex[temp.playUser[session.userId].index - 1]]

    // 用户输入超过下标
    if (operate > noweventFn.handle.length) {
      await session.send(at + (temp.playUser[session.userId].head ? `[${temp.playUser[session.userId].head}]\n` : '') + '下标大于可选项，请重新操作');
      return
    }

    // 影响增益
    temp.playUser[session.userId].prob = temp.playUser[session.userId].prob + noweventFn.result[operate - 1];

    // 存在事件?
    if (noweventFn.fn) {
      const fnMsg = noweventFn.fn(temp.fishpond, temp.playUser[session.userId], operate);
      await session.send(at + (temp.playUser[session.userId].head && fnMsg ? `[${temp.playUser[session.userId].head}]\n` : '') + fnMsg)
    }

    // 存在礼物?
    if (noweventFn.gift) {
      const isGetGift = random(0, 10) <= noweventFn.gift[1];
      if (isGetGift) {
        const gift = noweventFn.gift[0][random(0, noweventFn.gift[0].length)]
        await session.send(at + await propsFn.getPropsData(session.userId, gift));
      }
    }

    const selectIndex = random(0, noweventFn.msg[operate - 1].length);
    const linkMsg = (noweventFn.result[operate - 1] == 0 ? '[nothing?] ' : (noweventFn.result[operate - 1] > 0 ? '[up↑] ' : '[debuff↓] ')) + noweventFn.msg[operate - 1][selectIndex];


    if (!noweventFn.closeFollow) {
      await session.send(at + (temp.playUser[session.userId].head ? `[${temp.playUser[session.userId].head}]\n` : '') + linkMsg);
    }

    // 防抖
    temp.playUser[session.userId].startEvent = false;

    // 是否结局
    if (noweventFn.isEnd && operate == 1) {
      const fish = checkOverTimeFn(noweventFn, 0, temp.playUser[session.userId], temp.fishpond);

      if (fish) {
        // 记录到本地用户仓库
        await setFishingHistory(session.userId, fish.name);
        // 记录到本地历史记录
        await setHistoryStoreData(session.userId, fish.name, session);
        // 去掉对应鱼
        temp.removeFishItem(fish.name);

        // 记录成功次数
        await upUserInfoSotreData.upSuccessTime(session.userId);
        if (fish.hard > 6) await upUserInfoSotreData.upNiceTime(session.userId);

        await session.send(at + `${fish.img ? `<img src="${fish.img}" />` + '\n' : ''}你成功钓到了 ${fish.name}` + (fish.msg ? `\n\n${fish.msg}` : ''));
      } else {
        await session.send(at + `很遗憾，你什么也没钓到`);
      }

      temp.clearUserPlay(session.userId);
    }
  })

  ctx.command('钓鱼/钓鱼卖出 <goal> <num:number>', '卖出自己库存的鱼').userFields(['id']).action(async ({ session }, goal, num) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    if (!goal) {
      await session.send(at + `请输入具体需要卖出的鱼类，例如 /钓鱼卖出 ${fishCommonData[0].name}\n批量卖出请在后面加数值`);
      return
    }

    // 单个售卖
    if (!num) {
      const operate = goal?.trim();

      if (!fishData.some(item => item.name == operate)) {
        await session.send(at + `似乎没有找到名为 ${operate} 对应的售卖的信息`);
        return
      }

      const data = await getFishingInventoryData(session.userId);

      if (!data[operate]) {
        await session.send(at + `您的库存不存在 ${operate}`);
        return
      }

      data[operate] = data[operate] - 1;
      // 卖出后若小于 0 删除对应内容
      if (!data[operate]) delete data[operate];

      // 结账
      const momery = fishData.find(item => item.name == operate).price;
      await ctx.monetary.gain(Number(session.user.id), momery);
      // 记录
      await putFishingHistory(session.userId, data);
      await session.send(at + `你卖出了${operate}, 获得了 ${momery} 积分`)
    }
    // 批量售卖
    else {
      const operate = goal?.trim();
      const sellNum = Math.abs(Math.floor(num));

      if (!fishData.some(item => item.name == operate)) {
        await session.send(at + `似乎没有找到名为 ${operate} 对应的售卖的信息`);
        return
      }

      const data = await getFishingInventoryData(session.userId);

      if (!data[operate]) {
        await session.send(at + `您的库存不存在 ${operate}`);
        return
      }

      if (sellNum > data[operate]) {
        await session.send(at + `您打算卖出的 ${operate} 数量大于你仓库目前仅存的，\n目前您仓库存在的 ${operate} 数量为 ${data[operate]} 条`);
        return
      }

      data[operate] = data[operate] - sellNum;
      // 卖出后若小于 0 删除对应内容
      if (!data[operate]) delete data[operate];
      // 结账
      const momery = fishData.find(item => item.name == operate).price * sellNum;
      await ctx.monetary.gain(Number(session.user.id), momery);
      // 记录
      await putFishingHistory(session.userId, data);
      await session.send(at + `你卖出了${sellNum}条 ${operate}, 获得了 ${momery} 积分`)
    }
  })

  ctx
    .command('钓鱼/钓鱼鱼竿')
    .action(async ({ session }) => {
      let at = ''
      if (config.atQQ) {
        at = `<at id="${session.userId}" />`
      }
      const data = await FishingRod.getFishingRodInfo(session.userId);
      const msg = `您的当前鱼竿信息如下：\n[正在使用]\n${data.use}\n\n[鱼竿仓库]\n${data.have.length ? data.have.map(item => item).join('\n') : '无'}\n\n发送 /鱼竿替换 鱼竿名 可替换仓库中存在的鱼竿`
      await session.send(at + msg)
    })

  ctx
    .command('钓鱼/查看鱼竿 <rodName>')
    .action(async ({ session }, rodName) => {
      let at = ''
      if (config.atQQ) {
        at = `<at id="${session.userId}" />`
      }
      if (!rodName?.trim()) {
        await session.send(at + `请输入目前存在的鱼竿名字。例如：/查看鱼竿 ${FishingRod.fishingRodList[0].name}`)
        return
      }

      const info = FishingRod.fishingRodList.find(item => rodName?.trim() == item.name);
      const upMsg = Object.keys(info.up).map(item => {
        if (info.up[item] !== 0) {
          return `${FishingRod.dict[item]} 提高 ${info.up[item]}`
        } else {
          return null
        }
      }).filter(item => item !== null).join('\n')
      const msg = `${h.image(info.img)}\n【${info.name}】\n${info.msg}\n增益效果：\n${upMsg ? upMsg : '无'}`
      await session.send(at + msg)
    })

  ctx
    .command('钓鱼/鱼竿替换 <rodName>','替换你当前的鱼竿')
    .action(async ({ session }, rodName) => {
      let at = ''
      if (config.atQQ) {
        at = `<at id="${session.userId}" />`
      }
      if (!rodName?.trim()) {
        await session.send(at + `请输入在仓库中存在并需要替换的鱼竿名字。\n例如：/鱼竿替换 ${FishingRod.fishingRodList[0].name}`)
        return
      }
      const result = await FishingRod.changeFishing(session.userId, rodName.trim())
      if (result[0]) {
        await session.send(at + '[√] ' + result[1])
      } else {
        await session.send(at + '[×] ' + result[1])
      }
    })

  ctx
    .command('钓鱼/升级鱼竿','升级你持有的鱼竿!')
    .action(async ({ session }) => {
      let at = ''
      if (config.atQQ) {
        at = `<at id="${session.userId}" />`
      }
      const data = await FishingRod.getFishingRodInfo(session.userId);
      const bastLv = [data.use, ...data.have]
      const upLv = FishingRod.fishingRodList.map(item => {
        if (bastLv.includes(item.name)) {
          return item.lv
        } else {
          return null
        }
      }).filter(item => item !== null).sort((a, b) => b - a)[0]



      const upRod = FishingRod.fishingRodList.find(item => item.lv == upLv)
      const afterRod = FishingRod.fishingRodList.find(item => item.lv == upLv + 1)

      if (!afterRod) {
        await session.send(at + h.image(upRod.img) + `您目前的 ${upRod.name} 已经是目前最顶级的了...`)
        return
      }

      const userInfo = await getFishingInventoryData(session.userId);

      let type = true;
      let msg = ''
      Object.keys(upRod.need).forEach(item => {
        if (userInfo[item] && upRod.need[item] <= userInfo[item]) {
          msg += `${item} (${userInfo[item]}/${upRod.need[item]}) [√]\n`
        } else {
          msg += `${item} (${userInfo[item] ? userInfo[item] : '0'}/${upRod.need[item]}) [×]\n`
          type = false
        }
      })

      if (!type) {
        await session.send(at + `升级计划如下：\n\n[${upRod.name}] => [${afterRod.name}]\n\n尚未满足进阶条件,目前你持有的鱼和升级鱼竿需要的鱼如下：\n\n${msg}`)
        return
      }

      await session.send(`${msg}\n 条件已满足，请确认是否兑换鱼竿？如果是，请在 30 秒内发送： 是`)
      const ack = await session.prompt(30000)
      if (ack?.trim() == '是') {
        Object.keys(upRod.need).forEach(item => {
          userInfo[item] = userInfo[item] - upRod.need[item]
          if (userInfo[item] == 0) {
            delete userInfo[item]
          }
        })
        await putFishingHistory(session.userId, userInfo);
        data.have.push(afterRod.name)
        await FishingRod.setFishingRod(session.userId, data);
        await session.send(`升级至 ${afterRod.name} 成功。请在仓库查看\n旧鱼竿仍然保留和携带，请及时更换。`)
      }
    })

  ctx.command('钓鱼/我的积分', '查看自己的所有积分').userFields(['id']).action(async ({ session }) => {

    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    // 获取当前用户id
    const uid = session.user.id;
    // 从数据表中取值
    const [data] = await ctx.database.get('monetary', { uid })

    if (!data) {
      const num = random(20, 100);
      ctx.monetary.gain(uid, num);
      await session.send(at + `您可能是首次使用Bot，已给予您初始积分: ${num} 点数`);
      return
    }

    await session.send(at + `您当前积分为：${data.value.toString()} 点数，该点数为通用货币`);
  })


  // 覆盖数据
  async function putFishingHistory(userId, data) {
    const jsonData = await getBaseDirStoreData(config.fishData);
    jsonData[userId] = data;

    await setBaseDirStoreData(config.fishData, jsonData)
  }


  const callList = {};
  function getguildData(guildId) {
    const info = guildId || "1000";
    if (!callList[info])
      callList[info] = {
        fishpond: [],
        // 鱼塘
        lastInitFishPondTime: 0,
        // 上一次刷新记录
        playUser: {},
        // 正在游玩的用户
        // 初始化鱼塘
        initFishpond: function () {
          if (+/* @__PURE__ */ new Date() - this.lastInitFishPondTime > config.fishpondRefreshTime) {
            this.fishpond = setSpecifiedQuantityFishData(random(config.totalRandomFishpondMin, config.totalRandomFishpondMax));
            this.lastInitFishPondTime = +/* @__PURE__ */ new Date();
            return true;
          }
          return false;
        },
        // 移除对应鱼
        removeFishItem: function (fishName) {
          const index = this.fishpond.findIndex((item) => item.name == fishName);
          if (index !== -1) {
            this.fishpond.splice(index, 1);
          }
        },
        // 查看当前鱼塘信息
        getNowFishPondInfo: function () {
          if (!this.fishpond.length)
            return "当前群内鱼塘似乎还没有鱼";
          return "当前群鱼塘里存在的鱼有：\n\n" + formatFishInfoMsg(this.fishpond);
        },
        // 获取用户钓鱼记录
        getUserFshHistory: async function (userId) {
          const data = await getFishingInventoryData(userId);
          const fishName = Object.keys(data);
          const fishNum = Object.values(data);
          const total = fishNum.reduce((acc: number, curr: number) => acc + curr, 0);
          if (!fishName.length)
            return "你的库存还没有鱼呢，快去钓些吧~";
          return `您一共钓到了 ${total} 条鱼。以下是具体信息

${fishName.map((item, index) => {
            return `${item} x${fishNum[index]}`;
          }).join("\n")}`;
        },
        // 判断用户是否正在游戏
        isPlay: function (userId) {
          if (this.playUser[userId])
            return true;
          return false;
        },
        // 添加游玩用户
        addPlay: async function (session, at) {
          let randomList = randomTimerList();
          if (config.discardEvent) {
            randomList = [null];
          }
          const propsUp = await propsFn.checkUsePropsData(session.userId, true);
          const fishimgRod = await FishingRod.getFishingRodUpValue(session.userId);
          let prob = 4;
          let poss = 6;
          let lowProb = 0;
          if (config.discardEvent) {
            poss = random(1, 8);
          }
          if (propsUp) {
            prob = prob + (propsUp.prob ? Math.floor(prob * propsUp.prob * 0.1) : 0);
            poss = poss + (propsUp.poss ? Math.floor(poss * propsUp.poss * 0.1) : 0);
            lowProb = lowProb + propsUp.lowProb ? propsUp.lowProb : 0;
            await session.send(at + `${propsUp.img ? `<img src="${propsUp.img}" />` : ""}[↑up] 啊咧，这位似乎有道具 ${propsUp.name} 加持噢~`);
          }
          if (!Object.values(fishimgRod.up).every((item) => item == 0)) {
            prob = prob + (fishimgRod.up.prob ? fishimgRod.up.prob : 0);
            poss = poss + (fishimgRod.up.poss ? fishimgRod.up.poss : 0);
            lowProb = lowProb + (fishimgRod.up.lowProb ? fishimgRod.up.lowProb : 0);
            await session.send(at + `${fishimgRod.img ? `<img src="${fishimgRod.img}" />` : ""}目前使用的是带增益的 ${fishimgRod.name}`);
          } else {
            await session.send(at + `${fishimgRod.img ? `<img src="${fishimgRod.img}" />` : ""}目前使用的是 ${fishimgRod.name}`);
          }
          this.playUser[session.userId] = {
            timer: [...randomList],
            eventFn: [...randomList],
            index: -1,
            startEvent: false,
            eventIndex: randomEventIndexList([...randomList]),
            prob,
            // 稀有度基准
            poss,
            // 成功概率
            lowProb,
            // 稀有度最低基准
            head: await getStoreAchieveTakeData(session.userId)
          };
        },
        // 结束游戏 - 初始化用户信息
        clearUserPlay(userId) {
          this.playUser[userId]?.timer.forEach((item) => {
            clearTimeout(item);
          });
          delete this.playUser[userId];
        }
      };
    return callList[info];
  }
  // 创建随机下标的事件队列
  function randomEventIndexList(arr) {
    for (let i = 0; i < eventData.length; i++) {
      arr[i] = i;
    }
    // 打乱下标
    for (let i = 1; i < arr.length; i++) {
      const random = Math.floor(Math.random() * (i + 1));
      //交换两个数组
      [arr[i], arr[random]] = [arr[random], arr[i]];
    }
    return arr;
  }

  // 创建随机数量的定时器队列
  function randomTimerList() {
    const num = random(config.totalEventMin, config.totalEventMax);
    const arr = []
    for (let index = 0; index <= num; index++) {
      arr.push(null)
    }
    return arr;
  }

  // 事件名 事件选项 操作结果 是否结局
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
  let eventData = [];
  let fishData = [];
  let callMsg = [];
  const callCommonMsg = [""];

  type EventCommonData = {
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
  const eventCommonData: EventCommonData = [
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
  const fishCommonData = [
    { select: true, name: '鲫鱼', prob: 0.4, price: 5, hard: 1, img: 'https://smmcat.cn/run/fish/item/64/鲫鱼.png', quality: '常见' },
    { select: true, name: '生鱼', prob: 0.4, price: 8, hard: 2, img: 'https://smmcat.cn/run/fish/item/64/生鱼.png', quality: '常见' },
    { select: true, name: '鲤鱼', prob: 0.4, price: 5, hard: 1, img: 'https://smmcat.cn/run/fish/item/64/鲤鱼.png', quality: '常见' },
    { select: true, name: '草鱼', prob: 0.4, price: 6, hard: 3, img: 'https://smmcat.cn/run/fish/item/64/草鱼.png', quality: '常见' },
    { select: true, name: '罗非鱼', prob: 0.4, price: 8, hard: 2, img: 'https://smmcat.cn/run/fish/item/64/罗非鱼.png', quality: '常见' },
    { select: true, name: '八爪鱼', prob: 0.2, price: 45, hard: 8, img: 'https://smmcat.cn/run/fish/item/64/八爪鱼.png', quality: '稀有' },
    { select: true, name: '大黄鱼', prob: 0.2, price: 30, hard: 7, img: 'https://smmcat.cn/run/fish/item/64/大黄鱼.png', quality: '稀有' },
    { select: true, name: '多宝鱼', prob: 0.4, price: 15, hard: 4, img: 'https://smmcat.cn/run/fish/item/64/多宝鱼.png', quality: '一般' },
    { select: true, name: '蓝鳍金枪鱼', prob: 0.1, price: 120, hard: 10, img: 'https://smmcat.cn/run/fish/item/64/蓝鳍金枪鱼.png', quality: '极品' },
    { select: true, name: '澳洲金龟鲈鱼', prob: 0.1, price: 140, hard: 10, img: 'https://smmcat.cn/run/fish/item/64/澳洲金龟鲈鱼.png', quality: '极品' },
    { select: true, name: '鲍鱼', prob: 0.1, price: 50, hard: 6, img: 'https://smmcat.cn/run/fish/item/64/鲍鱼.png', quality: '稀有' },
    { select: true, name: '鲶鱼', prob: 0.4, price: 20, hard: 5, img: 'https://smmcat.cn/run/fish/item/64/鲶鱼.png', quality: '一般' },
    { select: true, name: '鞋子', prob: 0.6, price: 1, hard: 1, img: 'https://smmcat.cn/run/fish/item/64/鞋子.png', quality: '常见' },
    { select: true, name: '杂鱼', prob: 0.7, price: 1, hard: 1, img: 'https://smmcat.cn/run/fish/item/64/杂鱼.png', quality: '常见', msg: '♥ 真是杂鱼大叔呢 ♥，果然杂鱼大叔只能钓杂鱼嗯 ♥~', info: '杂鱼~♥ 杂鱼~♥' },
    { select: false, name: 'VW50鱼', prob: 0.4, price: 50, hard: 4, img: 'https://smmcat.cn/run/fish/item/64/VW50鱼.png', quality: '限定', msg: '这鱼似乎有很重要的事情要告诉你...但是被你打断了', info: '只在周四出现' },
    { select: false, name: '乌龟', prob: 0.3, price: 100, hard: 4, img: 'https://smmcat.cn/run/fish/item/64/乌龟.png', quality: '限定', info: '只在周五出现' },
    { select: false, name: '金龙鱼', prob: 0.1, price: 300, hard: 10, img: 'https://smmcat.cn/run/fish/item/64/金龙鱼.png', quality: '限定', info: '只在周六出现' },
    { select: false, name: '金枪鱼', prob: 0.1, price: 200, hard: 8, img: 'https://smmcat.cn/run/fish/item/64/金枪鱼.png', quality: '限定', info: '只在周日出现' },
    { select: false, name: '鞭炮鱼', prob: 0.6, price: 10, hard: 1, img: 'https://smmcat.cn/run/fish/item/64/鞭炮鱼.png', quality: '限定', msg: '钓出的一瞬间发出了鞭炮的声音，可喜可贺', info: '新春限定 出现在春节期间' },
    { select: false, name: '红包鱼', prob: 0.6, price: 100, hard: 4, img: 'https://smmcat.cn/run/fish/item/64/红包鱼.png', quality: '限定', msg: '恭喜发财~', info: '新春限定 出现在春节期间' },
    { select: false, name: '年年鱼', prob: 0.2, price: 300, hard: 7, img: 'https://smmcat.cn/run/fish/item/64/年年鱼.png', quality: '限定', msg: '年年有余！年年有鱼！', info: '新春限定 出现在春节期间' },
    { select: false, name: '黄金杂鱼', prob: 0.6, price: 10, hard: 1, img: 'https://smmcat.cn/run/fish/item/64/黄金杂鱼.png', quality: '限定', msg: '这次是 pro 版的杂鱼哟', info: '最爱你的 杂~鱼~！' },
    { select: false, name: 'shigma', prob: 0.2, price: 1, hard: 1, quality: '限定', img: 'https://smmcat.cn/run/fish/item/64/shigma.png', msg: '钓到个啥鬼东西？看着就扎手', info: '只在周一出现\n话说...这么一个矢量几何的东西怎么会在海里...' },
    { select: true, name: "青鱼", prob: 0.1, price: 100, hard: 10, img: "https://smmcat.cn/run/fish/item/64/青鱼.png", quality: "极品" },
    { select: true, name: "石斑鱼", prob: 0.3, price: 55, hard: 8, img: "https://smmcat.cn/run/fish/item/64/石斑鱼.png", msg: "高档酒店的最爱", quality: "稀有" }
  ]


  const propsCommonData = [
    {
      name: "石锅拌饭",
      info: "在接下来三次钓鱼初始成功率额外提高 20% - 50%",
      time: 3,
      up: { poss: [2, 5] },
      img: "https://smmcat.cn/run/fish/props/64/石锅拌饭.png",
      select: true,
      msg: ["香酥石锅，满足味蕾。", "饭香石锅，口感极佳。", "锅热食香，舌尖满足。"]
    },
    {
      name: "卤肉饭",
      info: "在接下来二次钓鱼初始成功率额外提高 10% - 30%",
      time: 2,
      up: { poss: [1, 3] },
      img: "https://smmcat.cn/run/fish/props/64/卤肉饭.png",
      select: true,
      msg: ["香糯肉香，舌尖回味。", "肉香飘溢，快乐满盘。", "爽滑快舔，舌尖满足。"]
    },
    {
      name: "水果鸡肉",
      info: "在接下来五次钓鱼初始成功率额外提高 20% - 40%",
      time: 5,
      up: { poss: [2, 4] },
      img: "https://smmcat.cn/run/fish/props/64/水果鸡肉.png",
      select: true,
      msg: ["香糯肉香，舌尖回味。", "肉香飘溢，快乐满盘。", "爽滑快舔，舌尖满足。"]
    },
    {
      name: "快乐水",
      info: "在接下来的1次钓鱼成功率提高至 1000%",
      time: 1,
      up: { poss: [100, 100] },
      img: "https://smmcat.cn/run/fish/props/64/快乐水.png",
      select: true,
      msg: ["为什么不是可口可乐？", "再来包薯片！", "碳酸激爽！畅快淋漓"]
    },
    {
      name: "猪脚饭",
      info: "在接下来二次钓鱼初始成功率额外提高 70% - 100%",
      time: 2,
      up: { poss: [7, 10] },
      img: "https://smmcat.cn/run/fish/props/64/猪脚饭.png",
      select: true,
      msg: ["阿姨，可唔可以再离一碗靓汤？", "好食，猪手饭太靓咗", "呢个猪手饭好食！"]
    },
    {
      name: "全家桶",
      info: "在接下来二次钓鱼获得稀有度的下限提高 2-4",
      time: 2,
      up: { lowProb: [2, 4] },
      img: "https://smmcat.cn/run/fish/props/64/全家桶.png",
      select: true,
      msg: ["好耶！是一直梦寐以求的快乐！", "肥仔快乐套餐，太棒了！", "这正是我期待的！"]
    },
    {
      name: "寿司",
      info: "在接下来二次钓鱼获得初始稀有度基准提高 2-4",
      time: 2,
      up: { prob: [2, 4] },
      img: "https://smmcat.cn/run/fish/props/64/寿司.png",
      select: true,
      msg: ["アイスティーしかなかったけどいいかな?", "ほら見とけよ見とけよ～", "アァッ！ハァッ！イキスギィ！イクイクイク…アッ…", "やりますねぇ！", "夜行きましょうね～", "お前の事が好きだったんだよ！"]
    },
    {
      name: "酱猪肘",
      info: "在接下来二次钓鱼获得初始稀有度基准提高 2-3，初始成功率额外提高 20% - 30%",
      time: 2,
      up: { prob: [2, 3], poss: [2, 3] },
      img: "https://smmcat.cn/run/fish/props/64/酱猪肘.png",
      select: true,
      msg: ["香甜滑嫩。连写脚本都有力气了"]
    },
    {
      name: "烤红薯",
      info: "在接下来三次钓鱼初始成功率额外提高 30% - 40%",
      time: 2,
      up: { poss: [3, 4] },
      img: "https://smmcat.cn/run/fish/props/64/烤红薯.png",
      select: true,
      msg: ["香香的，就像是兄弟给的！", "美味且热乎，真是钓鱼和露营必备啊"]
    },
    {
      name: "爱丽丝天妇罗",
      info: "在接下来两次钓鱼初始成功率额外提高 60% - 80%",
      time: 2,
      up: { poss: [6, 8] },
      img: "https://smmcat.cn/run/fish/props/64/爱丽丝天妇罗.png",
      select: true,
      msg: ["这...这东西能吃吗？", "太可爱了，吃起来一定很好吃吧", "一口下去嘎嘣脆！是鸡肉与牛肉的味道"]
    },
    {
      name: "烤鱼",
      info: "在接下来四次钓鱼初始成功率额外提高 10% - 20%",
      time: 4,
      up: { poss: [1, 2] },
      img: "https://smmcat.cn/run/fish/props/64/烤鱼.png",
      select: true,
      msg: ["简简单单，暴力美食", "炭火和柠檬配烤鱼，香啊！"]
    },
    {
      name: "炸鱼条",
      info: "在接下来四次钓鱼获得稀有度的下限提高 1-2",
      time: 4,
      up: { lowProb: [1, 2] },
      img: "https://smmcat.cn/run/fish/props/64/炸鱼条.png",
      select: true,
      msg: ["费了不少时间做的，就是香！", "金灿灿的，看起来就有食欲", "玉米面去炸鱼，又脆又香"]
    },
    {
      name: "鱼汤",
      info: "在接下来四次钓鱼获得初始稀有度基准提高 1-2",
      time: 4,
      up: { poss: [1, 2] },
      img: "https://smmcat.cn/run/fish/props/64/鱼汤.png",
      select: true,
      msg: ["简简单单一顿饭，鲜香味美", "纯粹的工艺，香甜的汤汁", "精华都在汤里，香味都在碗里"]
    },
    {
      name: "黑暗料理",
      info: "在接下来的一次钓鱼成功率下降 10% ，获得稀有度的下限提高 1-2",
      time: 1,
      up: { poss: [-1, -2], lowProb: [1, 2] },
      img: "https://smmcat.cn/run/fish/props/64/黑暗料理.png",
      select: true,
      msg: ["兄弟们奥里给，干了！咳...", "能做成炭黑质感，也不知道它经历了什么...", "这厨师大概不是烹饪，是把食材炭化", "真怕吃完就窜西"]
    },
    {
      name: "清蒸多宝鱼",
      info: "在接下来的三次钓鱼成功率提升20% - 30%，获得稀有度的下限提高 1-2",
      time: 3,
      up: { poss: [2, 3], lowProb: [1, 2] },
      img: "https://smmcat.cn/run/fish/props/64/清蒸多宝鱼.png",
      select: true,
      msg: ["香嫩爽口的鱼肉，还没有刺！", "爽滑在舌间，鲜香在口齿", "软糯香甜，口感美味", "鱼肉鲜嫩,清淡可口！"]
    },
    {
      name: "粘稠牛奶",
      info: "这...这的确是牛奶(确信)，喝完后在接下来的三次钓鱼成功率提升30%",
      time: 3,
      up: { poss: [3, 3] },
      img: "https://smmcat.cn/run/fish/props/64/粘稠牛奶.png",
      select: true,
      msg: ["令人兴奋的味道...", "喝完感觉挺有劲?", "...怪怪的,但是味道还行"]
    },
    {
      name: "乌龟汤",
      info: "十全的补品，复杂的工艺，汤鲜味美，爽滑的乌龟肉在唇齿间歌唱。喝使用后在接下来的五次钓鱼成功率提升 20%-30%，稀有度下限提高 1-2，初始稀有度基准提高 2-3",
      time: 5,
      up: { poss: [2, 3], lowProb: [1, 2], prob: [2, 3] },
      img: "https://smmcat.cn/run/fish/props/64/乌龟汤.png",
      select: true,
      msg: ["爽滑慢舔的肉,暴风吸入", "喝完浑身是劲哇", "女子口葛口哇!!"]
    }
  ]

  ctx.command('钓鱼/钓鱼使用 <goods>', '使用钓鱼道具').action(async ({ session }, goods) => {

    const temp = getguildData(session.guildId);
    let at = ''
    if (config.atQQ) {
      at = `<at id="${session.userId}" />`
    }

    if (temp.isPlay(session.userId)) {
      await session.send(at + '请在开始钓鱼前使用。');
      return
    }

    const operate = goods?.trim();
    const msg = await propsFn.addPtopsData(session.userId, operate);
    await session.send(at + msg);
  })

  const propsFn = {
    //  判断是否有持有 道具buff 是否扣除时效
    checkUsePropsData: async function (userId, isUse = false) {
      const data = await getBaseDirStoreData(config.propsData);
      if (!data[userId]) {
        data[userId] = { have: {}, use: {} };
        await setBaseDirStoreData(config.propsData, data);
      }
      if (!Object.keys(data[userId].use).length) {
        return null;
      }
      if (!isUse) {
        return data[userId].use;
      } else {
        const name2 = Object.keys(data[userId].use)[0];
        data[userId].use[name2].timer = data[userId].use[name2].timer - 1;
        const buff = data[userId].use[name2];
        if (data[userId].use[name2].timer <= 0) {
          delete data[userId].use[name2];
        }
        await setBaseDirStoreData(config.propsData, data);
        return buff;
      }
    },
    // 使用道具
    addPtopsData: async function (userId, propsName) {
      const propsInfo = propsCommonData.find((item) => item.name == propsName);
      const dictList = { poss: "成功概率", prob: "初始稀有度基准", lowProb: "初始稀有度下限" };
      if (!propsInfo) {
        return "没有这个道具的信息";
      }
      const data = await getBaseDirStoreData(config.propsData);
      if (!data[userId]) {
        data[userId] = { have: {}, use: {} };
        await setBaseDirStoreData(config.propsData, data);
      }
      if (Object.keys(data[userId].use).length) {
        const dictName = Object.keys(dictList);
        const usedPropsName = Object.keys(data[userId].use)[0];
        const msg = `${data[userId].use[usedPropsName].img ? `<img src="${data[userId].use[usedPropsName].img}" />` : ""}你已持有 buff，该buff 来自：

[${usedPropsName}]
剩余持续时间：${data[userId].use[usedPropsName].timer}
增益信息：
${dictName.map((item) => {
          if (!data[userId].use[usedPropsName][item]) {
            return null;
          } else {
            return `${dictList[item]}：${data[userId].use[usedPropsName][item] > 0 ? `[↑up]` : `[↓debuff]`}` + (dictList[item] == dictList.poss ? `${data[userId].use[usedPropsName][item] * 10}%` : `${data[userId].use[usedPropsName][item]}`);
          }
        }).filter((item) => item !== null).join("\n")}`;
        return msg;
      }
      if (!data[userId].have[propsName]) {
        return `你并没有 ${propsName}`;
      }
      if (data[userId].have[propsName] > 1) {
        data[userId].have[propsName] = data[userId].have[propsName] - 1;
      } else {
        delete data[userId].have[propsName];
      }
      const selPropName = Object.keys(propsInfo.up);
      const upList = selPropName.reduce(function (obj, item) {
        const min = propsInfo.up[item][0];
        const max = propsInfo.up[item][1];
        obj[item] = random(min, max);
        return obj;
      }, {});
      const temp = {
        timer: propsInfo.time,
        name: propsInfo.name,
        img: propsInfo.img,
        info: propsInfo.info,
        ...upList
      };
      data[userId].use[propsName] = temp;
      const upNameList = Object.keys(upList);
      const upNumList = Object.values(upList);
      const buffInfo = upNameList.map((item, index) => {
        return `${dictList[item]}：${Number(upNumList[index]) > 0 ? `[↑up]` : `[↓debuff]`}` + (dictList[item] == dictList.poss ? `${Number(upNumList[index]) * 10}%` : `${Number(upNumList[index])}`);
      }).join("\n");
      await setBaseDirStoreData(config.propsData, data);
      return (propsInfo.img ? `<img src="${propsInfo.img}" />` : "") + `使用 ${propsName} 成功！

 ${propsInfo.msg[random(0, propsInfo.msg.length)]}
${buffInfo}`;
    },
    getPropsData: async function (userId, propsName) {
      const data = await getBaseDirStoreData(config.propsData);
      if (!data[userId]) {
        data[userId] = { have: {}, use: {} };
        await setBaseDirStoreData(config.propsData, data);
      }
      if (propsCommonData.some((item) => item.name == propsName)) {
        if (data[userId].have[propsName]) {
          data[userId].have[propsName] = data[userId].have[propsName] + 1;
        } else {
          data[userId].have[propsName] = 1;
        }
        await setBaseDirStoreData(config.propsData, data);
        return `[🎁] 你从刚刚的事件中获得了 ${propsName}`;
      }
      return "";
    }
  };

  ctx.on('ready', () => {
    cooking.initCooking(config, propsCommonData, { setBaseDirStoreData, getBaseDirStoreData })
  })

  // 周期性执行
  ctx.setInterval(() => {
    checkFestivalData();
  }, 600000);

  // 初始化
  checkFestivalData();

  // 判断是否有对应节期数据
  async function checkFestivalData() {

    // 读取周数据
    const weekDate = JSON.parse(await fs.readFile(path.join(__dirname, './week.json'), 'utf-8'));
    const timer = new Date().getDay();
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][timer];


    // 是否存在周活动
    function initData() {
      if (weekDate[week]) {
        const weekEvnetFn = weekDate[week].eventFn || false;
        const addFish = weekDate[week].addFish || []
        if (weekEvnetFn) {
          modifyArray(eventData, [...eventCommonData, ...weekEvnetFn])
        } else {
          modifyArray(eventData, eventCommonData);
        };

        // 添加可能出现的鱼类
        fishData = fishCommonData.map(item => {
          if (addFish.some(i => i == item.name)) {
            return { ...item, select: true }
          } else {
            return item
          }
        })
      } else {
        modifyArray(eventData, eventCommonData);
        modifyArray(fishData, fishCommonData);
        modifyArray(callMsg, callCommonMsg);
      }
    }

    let festiva = { festival: false };
    // try {
    //   // 读取网络数据
    //   festiva = await ctx.http.get('http://1.15.99.237:3005/api/today');
    // } catch (error) {
    //   initData();
    // }

    // 读取活动数据
    const festivaData = JSON.parse(await fs.readFile(path.join(__dirname, './day.json'), 'utf-8'));
    const info = festiva.festival ? festivaData['春节'] : false
    const weekInfo = weekDate[week] || false

    if (info && weekInfo) {
      const festivaFn = info.eventFn || false;
      const addFish = info.addFish || [];
      const weekFn = weekInfo.eventFn || false;
      const weekFish = weekInfo.addFish || [];

      // 添加额外事件
      if (festivaFn && weekFn) {
        modifyArray(eventData, [...eventCommonData, ...festivaFn, ...weekFn]);
      } else if (weekFn) {
        modifyArray(eventData, [...eventData, ...weekFn])
      } else {
        modifyArray(eventData, eventCommonData);
      }

      // 添加可能出现的鱼类
      fishData = fishCommonData.map(item => {
        if (addFish.some(i => i == item.name) || weekFish.some(i => i == item.name)) {
          return { ...item, select: true }
        } else {
          return item
        }
      })
      // 添加节日消息
      callMsg = info.msg ? info.msg : [""];
    } else {
      initData();
    }
  }




  // function random(min, max) {
  //   return Math.floor(Math.random() * (max - min) + min);
  // }

  function random(min: number, max: number): number {
    const randomBuffer: Buffer = crypto.randomBytes(4);
    const randomNumber: number = randomBuffer.readUInt32LE(0) / 0x100000000;
    return Math.floor(min + randomNumber * (max - min));
  }

  // 鱼塘信息格式化
  function formatFishInfoMsg(arr) {
    const data = {}
    arr.forEach(item => {
      if (!data[item.name]) {
        data[item.name] = { num: 1, quality: item.quality };
      } else {
        data[item.name].num = data[item.name].num + 1
      }
    });

    const fishName = Object.keys(data);
    const fishNum: any = Object.values(data);
    const total = fishNum.reduce((acc: number, curr: any) => acc + curr.num, 0);

    return fishName.map((item, index) => {
      return `[${fishNum[index].quality
        }]${item} x${fishNum[index].num}`
    }).join('\n') + `\n\n 鱼塘目前总共存在 ${total} 条鱼`
  }

  async function getFishingInventoryData(userId: any) {
    // 获取数据
    const data = await getBaseDirStoreData(config.fishData);
    // 初始化
    if (!data[userId]) {
      data[userId] = {}
    }

    return data[userId]
  }

  async function setFishingHistory(userId: any, fishInfo: any) {
    const data = await getBaseDirStoreData(config.fishData);
    // 初始化
    if (!data[userId]) data[userId] = {}

    if (typeof fishInfo == 'string') {
      // 增加单个信息
      if (!data[userId][fishInfo]) {
        data[userId][fishInfo] = 1;
      } else {
        data[userId][fishInfo] = data[userId][fishInfo] + 1
      }
    } else if (typeof fishInfo == 'object') {
      // 增加多个信息
      fishInfo.forEach(item => {
        if (!data[userId][item]) {
          data[userId][item] = 1;
        } else {
          data[userId][item] = data[userId][item] + 1
        }
      })
    }

    await setBaseDirStoreData(config.fishData, data);
  }

  // 总鱼数量的历史记录
  async function setHistoryStoreData(userId: any, fishInfo: any, session: any) {
    const data = await getBaseDirStoreData(config.historyData);
    // 初始化
    if (!data[userId]) data[userId] = {}

    if (typeof fishInfo == 'string') {
      // 增加单个信息
      if (!data[userId][fishInfo]) {
        data[userId][fishInfo] = 1;
      } else {
        data[userId][fishInfo] = data[userId][fishInfo] + 1
      }
    }

    // 检查成就
    await markAchieveFn(userId, session, data);
    // 存储历史记录
    await setBaseDirStoreData(config.historyData, data);
  }

  // 判断是否完成 成就
  async function markAchieveFn(userId: any, session: any, historyData: any = null) {

    // 获取本地成就数据
    const achieveData = await getBaseDirStoreData(config.achieveData);

    // 判断是否传入 钓鱼历史记录
    if (!historyData) {
      // 本地传入赋值
      historyData = await getBaseDirStoreData(config.historyData);
    }

    // 初始化成就数据
    if (!achieveData[userId]) {
      achieveData[userId] = { possess: [], take: '' }
      await setBaseDirStoreData(config.achieveData, achieveData);
    }

    // 初始化钓鱼历史数据
    if (!historyData[userId]) {
      historyData[userId] = {}
      await setBaseDirStoreData(config.historyData, historyData);
    }

    // 获取用户钓鱼历史记录
    const userHistoryData = historyData[userId];
    // 获取用户成就信息
    const userAchieveData = achieveData[userId].possess;

    // 过滤已完成成就
    const filterAchieveList = achieveList.filter(item => {
      return !userAchieveData.includes(item.name);
    })

    const getNewAchieveData = []
    const getNewAchieveMsg = []

    // 遍历成就数据
    filterAchieveList.forEach(item => {
      let isReach = true;
      item.need.forEach(i => {
        if (!userHistoryData[i.name] || userHistoryData[i.name] < i.num) {
          isReach = false;
        }
      })
      // 满足条件
      if (isReach) {
        getNewAchieveData.push(item.name);
        getNewAchieveMsg.push(item.msg[random(0, item.msg.length)])
      }
    })

    // 如果有新成就
    if (getNewAchieveData.length) {

      let at = ''
      if (config.atQQ) {
        at = `< at id = "${session.userId}" /> `
      }

      // 拼合成就
      achieveData[userId].possess = [...userAchieveData, ...getNewAchieveData];

      // 更新成就数据
      await setBaseDirStoreData(config.achieveData, achieveData);

      // 消息格式化
      let msg = `刚刚获得新成就：${getNewAchieveData.map(item => {
        return `${item}`
      }).join(' 和 ')
        } `

      if (getNewAchieveMsg.length) {
        msg += '\n\n' + getNewAchieveMsg.map(item => item).join('\n')
      }

      await session.send(at + msg);
    }
  }

  // 随机获取规定数量的鱼群
  function setSpecifiedQuantityFishData(num) {
    const arr = []
    const filterFishData = fishData.filter(item => item.select !== false)
    for (let i = 0; i < num; i++) {
      arr.push(getRandomFish(filterFishData));
    }
    return arr;
  }

  ctx.command('钓鱼/钓鱼烹饪 <cookingName>', '使用鱼进行烹饪制作道具')
    .action(async ({ session }, cookingName) => {
      let at = ''
      if (config.atQQ) {
        at = `<at id="${session.userId}" />`
      }

      if (!cookingName) {
        await session.send(`${at}[?] 请10秒内输入需要烹饪的菜，例如：烤鱼\n目前只有以下菜谱：\n\n${cooking.dict.map((item) => item).join("\n")
          }`)
        cookingName = await session.prompt(10000)
        if (!cookingName) return
      }

      const result = await cooking.startCooking(session.userId, cookingName, session, at)
      if (!result) return
      if (!result.code) {
        await session.send(at + result.msg)
        return
      }
      await session.send(at + result.msg)
    })

  ctx.command('钓鱼/烹饪收获', '收获已完成的烹饪道具')
    .action(async ({ session }) => {
      const result = await cooking.getCooking(session.userId)
      let at = ""
      if (config.atQQ) {
        at = `<at id="${session.userId}" />`
      }
      if (!result.code) {
        await session.send(at + result.msg)
        return
      }
      await session.send(at + result.msg)
    })

  function getRandomFish(arr) {
    // 计算总概率
    let totalProb = 0;
    for (let i = 0; i < arr.length; i++) {
      totalProb += arr[i].prob;
    }

    // 生成随机数，确定落在哪个区间
    const randomNum = Math.random() * totalProb;

    // 根据随机数确定返回值
    let accumulatedProb = 0;
    for (let i = 0; i < arr.length; i++) {
      accumulatedProb += arr[i].prob;
      if (randomNum <= accumulatedProb) {
        return { name: arr[i].name, price: arr[i].price, quality: arr[i].quality, hard: arr[i].hard, msg: arr[i].msg ? arr[i].msg : '', img: arr[i].img ? arr[i].img : '' };
      }
    }
  }

  function modifyArray(arr1, arr2) {
    arr1.splice(0, arr1.length);
    arr2.forEach((item, index) => {
      arr1[index] = item;
    });
  }
}
