import { getOrCreateFile, setOrCreateFile } from './fileUtils'
import path from 'path'


export const FishingRod = {
    basePath: './',
    dict: { prob: '稀有度基准', poss: '成功概率', lowProb: '稀有度最低基准' },
    fishingRodList: [
        {
            lv: 1,
            name: '普通鱼竿',
            msg: '一个普通的鱼竿，钓鱼纯靠缘分',
            img: 'https://smmcat.cn/run/fish/rod/初级鱼竿.png',
            up: { prob: 0, poss: 0, lowProb: 0 },
            isMax: false,
            need: { '鲫鱼': 5, '生鱼': 5, '草鱼': 5 }
        },
        {
            lv: 2,
            name: '中级鱼竿',
            msg: '稍微有年头的鱼竿，稳重且可靠',
            img: 'https://smmcat.cn/run/fish/rod/中级鱼竿.png',
            up: { prob: 1, poss: 1, lowProb: 0 },
            isMax: false,
            need: { '乌龟': 5, '金枪鱼': 5, '八爪鱼': 5 }
        },
        {
            lv: 3,
            name: '高级鱼竿',
            msg: '高档舒适的材质，奢华且稳固的结构',
            img: 'https://smmcat.cn/run/fish/rod/高级鱼竿.png',
            up: { prob: 2, poss: 1, lowProb: 1 },
            isMax: false,
            need: { '澳洲金龟鲈鱼': 2, '蓝鳍金枪鱼': 2, '金龙鱼': 2 }
        },
        {
            lv: 4,
            name: '大师鱼竿',
            msg: '大师级工匠设计，炫彩的光芒无不吸引周围人的目光',
            img: 'https://smmcat.cn/run/fish/rod/大师鱼竿.png',
            up: { prob: 3, poss: 2, lowProb: 3 },
            isMax: true,
            need: null
        }
    ],
    // 获取鱼竿增益
    async getFishingRodUpValue(userId: string) {
        let data = JSON.parse(await getOrCreateFile(path.join(this.basePath, userId)));
        // 无数据 初始化
        if (!Object.keys(data).length) {
            data = await this.initFishingRodData(userId)
        }
        const index = this.fishingRodList.findIndex(item => item.name == data.use)
        return this.fishingRodList[index]
    },
    // 查看鱼竿仓库
    async getFishingRodInfo(userId: string) {
        let data = JSON.parse(await getOrCreateFile(path.join(this.basePath, userId)));
        // 无数据 初始化
        if (!Object.keys(data).length) {
            data = await this.initFishingRodData(userId)
        }
        return data
    },
    // 装备鱼竿
    async changeFishing(userId: string, rodName: string) {
        let data = JSON.parse(await getOrCreateFile(path.join(this.basePath, userId)));
        // 无数据 初始化
        if (!Object.keys(data).length) {
            data = await this.initFishingRodData(userId)
        }
        const temp = data.use;
        if (data.use == rodName) {
            return [false, `您已经在使用 ${rodName} ,无需再次装备`]
        }

        if (!data.have.includes(rodName)) {
            const haveMsg = data.have.length ? `\n目前仓库持有以下鱼竿：\n${data.have.map(item => item).join('\n')}` : ''
            return [false, `您未持有 ${rodName} 这个鱼竿！${haveMsg}`]
        }
        // 获取下标
        const index = data.have.findIndex(item => item == rodName);
        // 替换
        data.use = data.have.splice(index, 1)[0];
        data.have.push(rodName)
        await setOrCreateFile(path.join(this.basePath, userId), JSON.stringify(data))
        const nowIndex = this.fishingRodList.findIndex(item => item.name == rodName)
        const befoInfo = this.fishingRodList.findIndex(item => item.name == temp)
        const nowUseInfo = this.fishingRodList[nowIndex].up;
        const befoUseInfo = this.fishingRodList[befoInfo].up;
        const msg = Object.keys(nowUseInfo).map(item => {
            const mark = nowUseInfo[item] - befoUseInfo[item] >= 0 ? '[up↑]' : '[lost↓]'
            if (nowUseInfo[item] - befoUseInfo[item]) {
                return `${this.dict[item]}: ${mark}${Math.abs(nowUseInfo[item] - befoUseInfo[item])}`
            } else {
                return null
            }
        }).filter(item => item !== null).join('\n')
        return [true, `替换使用 ${rodName} 成功！\n${msg}`]
    },
    // 得到鱼竿
    async setFishingRod(userId: string, data) {
        await setOrCreateFile(path.join(this.basePath, userId), JSON.stringify(data))
    },
    // 初始化数据
    async initFishingRodData(userId) {
        const data = {
            use: '普通鱼竿',
            have: []
        }
        await setOrCreateFile(path.join(this.basePath, userId), JSON.stringify(data))
        return data
    }
}