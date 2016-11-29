# er-history-locator
locator base history api for er framework

## 使用方法

```javascript

import HistoryLocator, {buildERStart} from 'HistoryLocator';
import er from 'er';
import router from 'er/router';
import controller from 'er/controller';

let start = er.start;
if(typeof window.history.pushState === 'function') {
  const historyLocator = new HistoryLocator({indexURL: '/', rootPath: '/static/main.html'});
  start = buildERStart(controller, router, historyLocator);
}

// 启动 er
start();
```
