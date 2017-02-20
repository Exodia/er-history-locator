/**
 * @file history api 监听器对象
 * @author exodia(dengxinxin@baidu.com)
 */
import EventTarget from 'mini-event/EventTarget';
import events from 'er/events';

const ATTR = Symbol('attr');
const UPDATE_URL = Symbol('updateURL');

/**
 * 地址监听对象
 *
 * 该对象用于监听地址中的`url`变化，以及根据要求更新`url`值
 *
 * `locator`的基本工作流程：
 *
 * 1. 监听`url`的变化
 * 2. 当`url`变化时，如果确实发生变化（与上一次的值不同），则执行逻辑
 * 3. 触发{@link locator#event-redirect}事件
 */
export default class HistoryLocator extends EventTarget {

    /**
     * 设置配置项
     *
     * @param {Object} config 配置项
     * @param {string} [config.indexURL='/'] 索引路径
     * @param {string} [config.rootPath=''] 根路径
     */
    setConfig(config) {
        this[ATTR].config = config;
    }

    /**
     * 获取配置项
     *
     * @return {Object} 配置项
     */
    getConfig() {
        return this[ATTR].config;
    }

    /**
     * 设置 event bus
     *
     * @param {mini-event.EventTarget} eventBus 事件总线
     */
    setEventBus(eventBus) {
        this[ATTR].eventBus = eventBus;
    }

    /**
     * 获取 event bus
     *
     * @return {mini-event.EventTarget}
     */
    getEventBus() {
        return this[ATTR].eventBus;
    }

    /**
     * 构造函数
     *
     * @param {Object} config 配置项
     * @param {string} [config.indexURL='/'] 索引路径
     * @param {string} [config.rootPath=''] 根路径
     * @param {boolean} [hashCompatible=true] 是否兼容基于hash的er系统
     */
    constructor(config = {indexURL: '/', rootPath: ''}, hashCompatible = true) {
        super();
        let self = this;
        this[ATTR] = {
            config: config,
            startupTimer: null,
            currentLocation: '',
            hashCompatible: hashCompatible,
            // ie非edge系列不支持newURL属性
            hijackHashRedirect({newURL = location.hash}) {
                self.redirect(
                    newURL.slice(newURL.indexOf('#') + 1),
                    {replace: true}
                );
            },
            onPopstate({state}) {
                // hash兼容且无url的情况下，认为是hashchange导致的，直接放走让hijackHashRedirect来搞
                if (self[ATTR].hashCompatible && !state) {
                    return;
                }

                let url = state ? state.url : undefined;
                let referrer = self[ATTR].currentLocation;
                self[ATTR].currentLocation = url;
                if (url && referrer !== url) {
                    let redirectInfo = {url: sliceSearch(url), referrer: referrer};
                    self.fire('redirect', redirectInfo);
                    self.getEventBus().fire(
                        'redirect',
                        {
                            ...redirectInfo,
                            options: {}
                        }
                    );
                }
            }
        };
        this.setEventBus(events);
    }

    /**
     * 开始路由监听
     *
     * @param {boolean} [firstTime] 是否首次进入
     */
    start(firstTime = true) {
        if (this[ATTR].hashCompatible) {
            window.addEventListener('hashchange', this[ATTR].hijackHashRedirect, false);
        }
        window.addEventListener('popstate', this[ATTR].onPopstate, false);
        // 处理初次进入
        if (firstTime) {
            let initURL = location.pathname.slice(this.getConfig().rootPath.length);
            let options = {};
            // hash兼容的情况下，hash优先
            if (this[ATTR].hashCompatible && location.hash) {
                initURL = location.hash.slice(1);
                options = {replace: true};
            }
            this[ATTR].startupTimer = setTimeout(() => this.redirect(initURL, options), 0);
        }
    }

    /**
     * 停止路由监听
     */
    stop() {
        if (this[ATTR].startupTimer) {
            clearTimeout(this[ATTR].startupTimer);
            this[ATTR].startupTimer = null;
        }

        if (this[ATTR].hashCompatible) {
            document.removeEventListener('hashchange', this[ATTR].hijackHashRedirect, false);
        }

        window.removeEventListener('popstate', this[ATTR].onPopstate, false);
    }

    /**
     * 根据输入的URL，进行处理后获取真实应该跳转的URL地址
     *
     * @param {string | URL} url 重定向的地址
     * @return {string}
     */
    resolveURL(url) {
        // 当类型为URL时，使用`toString`可转为正常的url字符串
        url = url + '';

        // 未给定url时，指向起始页
        if (!url || url === '/') {

            url = this[ATTR].config.indexURL;
        }

        return url;
    }

    /**
     * 执行重定向逻辑
     *
     * @param {string | URL} url 重定向的地址
     * @param {meta.RedirectOption} [options] 额外附加的参数对象
     * @return {boolean} 是否应执行跳转
     */
    redirect(url, options = {}) {
        url = this.resolveURL(url);

        let referrer = this[ATTR].currentLocation;
        let isLocationChanged = this[UPDATE_URL](url, options);
        let shouldPerformRedirect = isLocationChanged || options.force;
        if (shouldPerformRedirect) {
            let redirectInfo = {url: sliceSearch(url), referrer: referrer};
            if (!options.silent) {
                /**
                 * URL跳转时触发
                 *
                 * @event redirect
                 * @param {Object} e 事件对象
                 * @param {string} e.url 当前的URL
                 */
                this.fire('redirect', redirectInfo);
            }

            this.getEventBus().fire(
                'redirect',
                {
                    ...redirectInfo,
                    options: options
                }
            );
        }

        return shouldPerformRedirect;
    }

    /**
     * 刷新当前地址
     */
    reload() {
        if (this[ATTR].currentLocation) {
            this.redirect(this[ATTR].currentLocation, {force: true});
        }
    }

    /**
     * 更新当前的`url`值，同时在历史记录中添加该项
     *
     * 如果url值与当前的地址相同则不会进行更新
     *
     * @private
     *
     * @param {string} url 需要进行更新的url值
     * @param {Object} options 配置项
     * @return {boolean} 如果地址有过变更则返回true
     */
    [UPDATE_URL](url, options = {}) {
        if (this[ATTR].hashCompatible) {
            url += location.search;
        }
        let changed = this[ATTR].currentLocation !== url;
        let method = options.replace ? 'replaceState' : 'pushState';
        // 存储当前信息
        if (changed) {
            let to = this.getConfig().rootPath + url;
            if (options.silent) {
                this.stop();
                window.history[method]({url}, '', to);
                this.start(false);
            }
            else {
                window.history[method]({url}, '', to);
            }
        }

        this[ATTR].currentLocation = url;
        return changed;
    }
}

/**
 * 创建一个基于historyLocator的启动函数
 *
 * @param {er.Controller} erController er controller
 * @param {er.Router} erRouter er router
 * @param {Object} [historyConfig] history locator 配置
 * @return {function()} 启动函数
 */
export function buildERStart(erController, erRouter, historyConfig) {
    return () => {
        let historyLocator = new HistoryLocator(historyConfig);

        erController.setLocator(historyLocator);
        erRouter.setLocator(historyLocator);

        erController.start();
        erRouter.start();
        historyLocator.start();
    };
}

// 切割 url 查询参数
function sliceSearch(url) {
    return url.includes('?') ? url.slice(0, url.indexOf('?')) : url;
}
