# Star Courier 星航快递

一个很小的浏览器街机游戏，用纯 HTML、CSS、JavaScript 写成。没有构建步骤，适合直接发布到 GitHub Pages。

## 本地试玩

直接用浏览器打开 `index.html`，或者运行：

```bash
python3 -m http.server 4173
```

然后访问：

```text
http://localhost:4173
```

## 操作

- `WASD` 或方向键：移动
- `Space`：加速
- `P`：暂停
- 触屏：使用屏幕按钮，或在游戏区域拖动

## 发布到 GitHub Pages

1. 新建一个 GitHub 仓库，例如 `star-courier`。
2. 把 `index.html`、`styles.css`、`game.js`、`README.md` 上传到仓库根目录。
3. 进入仓库的 `Settings` -> `Pages`。
4. `Source` 选择 `Deploy from a branch`。
5. 分支选择 `main`，目录选择 `/root`，保存。
6. 等一分钟左右，打开 GitHub 显示的 Pages 链接即可试玩。

## 可改的地方

- 在 `index.html` 里改标题和文案。
- 在 `styles.css` 里改颜色和布局。
- 在 `game.js` 里调 `spawnTimer`、`hazardTimer` 和碎片速度来改变难度。
