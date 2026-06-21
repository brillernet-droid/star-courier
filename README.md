# Star Courier: Rift Arena

一个纯 HTML、CSS、JavaScript 写成的浏览器对战小游戏。无需构建步骤，适合直接发布到 GitHub Pages。

线上试玩：

```text
https://brillernet-droid.github.io/star-courier/
```

## 当前版本

- 单人 AI：P1 对 AI，P1 会自动射击，主要负责走位和技能
- 双人同屏：P1 和 P2 共用键盘
- 三类机体：突袭型「疾影」、防御型「堡垒」、控场型「脉冲」
- 三种玩法：决斗、占点、抢晶
- 战斗系统：自动瞄准、普通射击、职业技能、能量晶、陨石干扰、限时胜负结算

## 本地试玩

直接打开 `index.html`，或者运行：

```bash
python3 -m http.server 4173
```

然后访问：

```text
http://localhost:4173
```

## 操作

- P1：`WASD` 移动，`Space` 射击，`Shift` 技能；单人模式也可以用方向键或拖动画面移动
- P2：方向键移动，`Enter` 射击，`/` 技能
- `P`：暂停

## 发布到 GitHub Pages

仓库已经配置为从 `main` 分支根目录发布。推送到 GitHub 后，GitHub Pages 会自动更新。
