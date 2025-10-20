import { eventCommonData } from "./events";
import { fishCommonData } from "./fishData";
import { modifyArray } from "./utils";
import fs from 'fs/promises'
import path from 'path'

export const eventData = [];
export const fishData = [];
export const callCommonMsg = [""];

// 判断是否有对应节期数据
export async function checkFestivalData() {

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
            fishData.length = 0
            fishData.concat(fishCommonData.map(item => {
                if (addFish.some(i => i == item.name)) {
                    return { ...item, select: true }
                } else {
                    return item
                }
            }))
        } else {
            modifyArray(eventData, eventCommonData);
            modifyArray(fishData, fishCommonData);
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
        fishData.length = 0
        fishData.concat(fishCommonData.map(item => {
            if (addFish.some(i => i == item.name) || weekFish.some(i => i == item.name)) {
                return { ...item, select: true }
            } else {
                return item
            }
        }))
    } else {
        initData();
    }
}