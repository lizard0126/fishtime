import crypto from 'crypto';
import { fishData } from './regularTasks';

export function modifyArray(arr1, arr2) {
    arr1.splice(0, arr1.length);
    arr2.forEach((item, index) => {
        arr1[index] = item;
    });
}


export function random(min: number, max: number): number {
    const randomBuffer: Buffer = crypto.randomBytes(4);
    const randomNumber: number = randomBuffer.readUInt32LE(0) / 0x100000000;
    return Math.floor(min + randomNumber * (max - min));
}

// 随机获取规定数量的鱼群
export function setSpecifiedQuantityFishData(num) {
    const arr = []
    const filterFishData = fishData.filter(item => item.select !== false)
    for (let i = 0; i < num; i++) {
        arr.push(getRandomFish(filterFishData));
    }
    return arr;
}

// 获取随机一条鱼
export function getRandomFish(arr) {
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