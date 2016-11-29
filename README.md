# er-history-locator
locator base history api for er framework

## 使用方法

```javascript

import HistoryLocator, {buildERStart} from 'HistoryLocator';
import router from 'er/router';
import controller from 'er/controller';

const historyLocator = new HistoryLocator({indexURL: '/', rootPath: '/static/main.html'});
const start = buildERStart(controller, router, historyLocator);

// 启动 er
start();

```