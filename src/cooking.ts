import path from 'path';
import crypto from 'crypto';
import { h, Session } from 'koishi';

export const cooking = {
    config: {},
    propsCommonData: [],
    tool: {},
    upper: 1,
    dict: [],
    gift: ["爱丽丝天妇罗", "快乐水"],
    cookingDict: {
        "烤鱼": {
            need: [{ name: "草鱼", num: 1 }],
            success: 5,
            useTime: 1,
            msg: "简单粗暴且快速的烹饪方法，将鱼的鲜香和炭火的焦香交织，吃完感觉就上瘾！但小心别烤糊"
        },
        "炸鱼条": {
            need: [{ name: "鲫鱼", num: 2 }],
            success: 8,
            useTime: 3,
            msg: "裹上玉米面下油锅，香糯甜嫩都体现的淋漓尽致。金灿灿的看着都有食欲，就是比较费时..."
        },
        "鱼汤": {
            need: [{ name: "鲤鱼", num: 2 }],
            success: 8,
            useTime: 3,
            msg: "高端的食材往往需要简单的烹饪，不加任何调料的十全大补汤。就是会比较费事"
        },
        "清蒸多宝鱼": {
            need: [{ name: "多宝鱼", num: 2 }],
            success: 9,
            useTime: 4,
            msg: "用清蒸的方法可以最大限度的保持多宝鱼的营养，做法简单；就是比较费时。"
        }
    },

    initCooking(config: any, propsCommonData: any[], tool: any) {
        this.config = config;
        this.propsCommonData = propsCommonData;
        this.tool = tool;
        this.dict = Object.keys(this.cookingDict);
    },

    async startCooking(userId: string, foodName: string, session: Session, at: string) {
        const upath = this.config.cookingData;
        const usercookData = await this.tool.getBaseDirStoreData(path.join(upath, userId));

        if (Object.keys(usercookData).length >= this.upper) {
            return { code: false, msg: `[×] 当前锅里正在进行烹饪，目前只能同时烹饪${this.upper}个菜，还不能做别的菜噢~` };
        }

        if (!this.dict.includes(foodName)) {
            return {
                code: false,
                msg: `[×] 未找到这道${foodName}的菜谱。目前只有以下菜谱：\n\n${this.dict.map((item) => item).join("\n")}`
            };
        }

        const fishUpath = this.config.fishData;
        const fishData = await this.tool.getBaseDirStoreData(path.join(fishUpath));

        if (!fishData[userId]) {
            fishData[userId] = {};
        }

        const itemCooking = this.cookingDict[foodName];
        const type = itemCooking.need.every((item) => {
            return fishData[userId][item.name] && fishData[userId][item.name] >= item.num;
        });

        const needMsg = itemCooking.need.map((item) => {
            return `${item.name}: (${fishData[userId][item.name] ? fishData[userId][item.name] : 0}/${item.num})`;
        });

        const fooditem = this.propsCommonData.find((item) => item.name == foodName);

        if (!type) {
            return {
                code: false,
                msg: `${h.image(fooditem.img)}\n[×] 缺少所需要烹饪的鱼类：\n${needMsg}`
            };
        }

        await session.send(`${at}${h.image(fooditem.img)}\n${itemCooking.msg}\n预计需要${this.cookingDict[foodName].useTime}小时，成功率${this.cookingDict[foodName].success * 10}%\n您准备打算做 ${foodName} 吗？(10秒内回复"是"，开始制作)\n${needMsg}`);

        const action = await session.prompt(10000);
        if (action !== "是") return;

        itemCooking.need.forEach((item) => {
            fishData[userId][item.name] -= item.num;
            if (fishData[userId][item.name] < 1) {
                delete fishData[userId][item.name];
            }
        });

        usercookData[+new Date()] = { ...this.cookingDict[foodName], name: foodName };

        await this.tool.setBaseDirStoreData(path.join(fishUpath), fishData);
        await this.tool.setBaseDirStoreData(path.join(upath, userId), usercookData);

        return {
            code: true,
            msg: `[√] 您消耗了 ${itemCooking.need.map((item) => {
                return `${item.num}条${item.name}`;
            }).join("、")}，开始制作 ${foodName}\n预计时间：${itemCooking.useTime}小时`
        };
    },

    async getCooking(userId: string) {
        const upath = this.config.cookingData;
        const usercookData = await this.tool.getBaseDirStoreData(path.join(upath, userId));
        const nowTime = +new Date();
        const timeList = Object.keys(usercookData);

        if (!timeList.length) {
            return { code: false, msg: "你还没有烹饪任何菜呢..." };
        }

        const readyList = timeList.filter((item) => nowTime - Number(item) > usercookData[item].useTime * 3600000);

        if (!readyList.length) {
            const cookMsg = timeList.map((item) => {
                const needTime = Math.floor((usercookData[item].useTime * 3600000 - (nowTime - Number(item))) / 1000);
                const hh = Math.floor(needTime / 3600);
                const m = Math.floor(needTime % 3600 / 60);
                const s = needTime % 60;
                return "【" + usercookData[item].name + `】: 预计还要 ${hh ? hh + "小时" : ""}${m ? m + "分" : ""}${s + "秒"}`;
            }).join("\n");

            return {
                code: false,
                msg: `暂时还没有烹饪完成的菜，请耐心等待...\n\n${cookMsg}`
            };
        }

        const getCookFood = [];
        const msg = [];

        readyList.forEach((item) => {
            if (random(0, 100) > usercookData[item].success * 10) {
                msg.push(`[×] 烹饪 ${usercookData[item].name} 失败...`);
                random(0, 100) < 80 && getCookFood.push("黑暗料理");
            } else {
                getCookFood.push(usercookData[item].name);
                let tok = `[√] 烹饪 ${usercookData[item].name} `;
                if (random(0, 100) < 10) {
                    const gift = this.gift[random(0, this.gift.length)];
                    tok += "大成功！！额外获得了" + gift + "！";
                    getCookFood.push(gift);
                } else {
                    tok += "成功!";
                }
                msg.push(tok);
            }
            delete usercookData[item];
        });

        const propData = await this.tool.getBaseDirStoreData(this.config.propsData);
        if (!propData[userId]) {
            propData[userId] = { have: {}, use: {} };
        }

        getCookFood.forEach((food) => {
            if (!propData[userId].have[food]) {
                propData[userId].have[food] = 1;
            } else {
                propData[userId].have[food]++;
            }
        });

        await this.tool.setBaseDirStoreData(this.config.propsData, propData);
        await this.tool.setBaseDirStoreData(path.join(upath, userId), usercookData);

        const resultMsg = msg.map((item) => item).join("\n") + "\n\n" + (getCookFood.length ? `你获得了${getCookFood}` : "你什么也没获得");
        return { code: true, msg: resultMsg };
    }
};

function random(min: number, max: number) {
    const randomBuffer = crypto.randomBytes(4);
    const randomNumber = randomBuffer.readUInt32LE(0) / 4294967296;
    return Math.floor(min + randomNumber * (max - min));
}
