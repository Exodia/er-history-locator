# er-history-locator
locator base history api for er framework

## 安装
edp import er-history-locator

## 使用方法

```javascript

import {buildERStart} from 'HistoryLocator';
import er from 'er';
import router from 'er/router';
import controller from 'er/controller';

let start = er.start;
if(typeof window.history.pushState === 'function') {
  start = buildERStart(controller, router, {indexURL: '/', rootPath: '/static/main.html'});
}

// 启动 er
start();
```
