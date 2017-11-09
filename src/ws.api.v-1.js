
/**
 * window 全局变量
 */
!function (window) {
    var
        //所有错误信息
        errmsg = {
            0x0000: '成功',
            0x0001: '错误的消息内容',
            0x0002: '错误的参数',
            0x0003: 'IP地址不可达',
            0x0004: '未初始化',
            0x0005: '证书未加载',
            0x0006: '服务不支持',
            0x0007: '错误的域',
            0x0008: '错误的类型',
            0x0009: '错误的订阅类型',
            0x0100: '其他错误',
            0x0110: '消息发送超时',
            0x0111: '消息处理异常',
            0x0200: 'SOCOKE错误',
            0x0201: '连接为空',
            0x0202: '连接超时',
            0x0203: '连接中断',
            0x0300: 'Json错误',
            0xFFFF: '未知错误',
            0x7000: '未指定错误',
            0x7001: '错误的客户端ID',
            0x7002: '客户端未注册',
            0x7003: '服务器拒绝',
            0x7004: '用户数限制',
            0x7005: '客户端已注册',
            0x7006: '无效的对方ID',
            0x7007: '数据内容过大',
            0x7008: '数据内容过大',
            0x7009: 'call_id字段为空',
            0x700A: '新证书和原证书不匹配',
            0x8000: '证书内容错误',
            0x8001: '无效的证书编号',
            0x8002: '证书连接地址格式错误',
            0x8003: '连接地址无权限',
            0x8004: '订阅类型格式错误',
            0x8005: '订阅类型无权限',
            0x8006: '通知类型格式错误',
            0x8007: '通知类型无权限',
            0x8008: '证书有效期格式错误',
            0x8009: '证书不在有效期',
            0x800A: '发送类型格式错误',
            0x800B: '发送类型无权限'
        },
        //websocket 定义
        socket = null,
        //心脏定时器
        timer = null,
        //版本信息
        core_version = '1.0',
        //浏览器WebSocket接口
        _WebSocket = window.WebSocket || window.WebKitWebSocket || window.MozWebSocket,
        //实例对象
        _ws = window.ws,
        //唯一标识
        _Guid = '',
        //回话标识
        _sessionId = '',
        //数字证书
        _certificate = {},
        //订阅消息
        _subscribe = '',
        //websocket注册体
        _register = {},
        //websocket重连体
        _resume = {},
        //websocket更新数字证书
        _update = {},
        //websocket连接心跳
        _heart = {},
        //订阅消息体
        _sub = {},
        //通知消息体
        _notify = {},
        //定向发送消息体
        _info = {},
        //方法集合
        _handlers = {

        },
        //返回具体内容
        ws = function (opt) {
            return new ws.fn.init(opt)
        };
    //实例对象的原型链
    ws.fn = ws.prototype = {
        // ws当前版本
        ws: core_version,
        //ws构造函数
        constructor: ws,
        //返回数据
        _data: {},

        //初始化ws
        init: function (opt) {
            var $wsUrl = opt.ip,  //实例的ip地址
                $ip = $wsUrl.split(':')[0],  //获得origin
                $port = $wsUrl.split(':')[1] || '8080',  //获得端口号，默认8080
                handlers = _handlers, //监听方法集合
                foo;  //方法转换函数
            switch (opt.variety) {
                case 'sub':
                    ws.variety = '订阅';
                    ws.certificate = _certificate = opt.certificate; //储存数字证书
                    ws.subscribe = _subscribe = opt.subscribe;  //储存订阅信息
                    break;
                case 'resume':
                    ws.variety = '重连';
                    ws.certificate = _certificate = opt.certificate; //储存数字证书
                    break;
                case 'update':
                    ws.variety = '更新';
                    ws.certificate = _certificate = opt.certificate; //储存数字证书
                    break;
                case 'notify':
                    ws.variety = '通知';
                    ws.certificate = _certificate = opt.certificate; //储存数字证书
                    ws._notify = _notify = opt.content; //通知体
                    ws._type = opt.notify;
                    break;
                case 'info':
                    ws.variety = '定向发送';
                    ws.certificate = _certificate = opt.certificate; //储存数字证书
                    ws._info = _info = opt.content; //储存数字证书
                    ws._type = opt.send;
                    ws._to = opt.to;
                    break;
                default:
                    console.error('请输入已有的api，如sub、resume、update、notify、info');
                    break;
            }
            //判断浏览器是否支持websocket
            if (_WebSocket) {
                socket = new _WebSocket('ws://' + $ip + ':' + $port);  //开启连接
                socket.onopen = function (res) {
                    _Guid = ws.fn.guid();
                    ws.fn._Guid = _Guid;
                    if (ws.variety == '订阅') {
                        ws.regSend();
                    } else if (ws.variety == '重连') {
                        ws.resume();
                    } else if (ws.variety == '通知') {
                        ws.regSend();
                    } else if (ws.variety == '定向发送') {
                        ws.regSend();
                    }
                    if (handlers['open']) {
                        foo = handlers['open'];
                        foo();
                    }
                };
                socket.onmessage = function (res) {
                    ws.fn._data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
                    if (ws.fn._data.info.result && ws.fn._data.info.result != 0) {
                        var result = ws.fn._data.info.result;
                        console.error(errmsg[result]);
                    }
                    if (ws.fn._data.method == 'REGISTER' && ws.fn._data.type == 'register_resp') {
                        _sessionId = ws.fn._data.info.session_id;
                        ws.sessionId = _sessionId;
                        if (ws.variety == '通知') ws.notify();
                        else if (ws.variety == '定向发送') ws.info();
                        else {
                            ws.subSend();
                        }
                        ws.fn.heartBeat();
                        if (handlers['register']) {
                            foo = handlers['register'];
                            foo();
                        }
                    } else if (ws.fn._data.method == 'REGISTER' && ws.fn._data.type == 'heart_beat') {
                        if (handlers['heart_beat']) {
                            foo = handlers['heart_beat'];
                            foo();
                        }
                    } else if (ws.fn._data.method == 'REGISTER' && ws.fn._data.type == 'resume_resp') {
                        if (handlers['resume']) {
                            foo = handlers['resume'];
                            foo();
                        }
                    } else if (ws.fn._data.method == 'REGISTER' && ws.fn._data.type == 'update_cer_resp') {
                        if (handlers['update']) {
                            foo = handlers['update'];
                            foo();
                        }
                    } else if (ws.fn._data.method == 'REGISTER' && ws.fn._data.type == 'subscribe_resp') {
                        if (handlers['subscribe']) {
                            foo = handlers['subscribe'];
                            foo();
                        }
                    } else {
                        if (handlers['message']) {
                            foo = handlers['message'];
                            foo(ws.fn._data.info);
                        }
                    }
                };
                socket.onclose = function (res) {
                    if (handlers['close']) {
                        foo = handlers['close'];
                        foo();
                    }
                };
                socket.onerror = function (res) {
                    if (handlers['error']) {
                        foo = handlers['error'];
                        foo();
                    }
                };
            } else {
                alert('你的浏览器不支持WebSocket，请尝试其他浏览器')
            }
        },
        //连接监听回调函数
        //type为open、message、close、error
        //callBack为回调函数
        // on: function (type, callBack) {
        //     handlers[type] = callBack;
        // },
        //注销监听回调函数
        //callBack为回调函数
        // off: function (type, callBack) {
        //     delete handlers[type];
        //     callBack();
        // },
        //发送消息函数
        send: function (req) {
            if (!socket || socket.readyState != 1) {
                console.error('连接已断开，请重新连接');
            } else {
                if (socket.bufferedAmount == 0) {
                    ws.fn.isJson(req) && socket.send(JSON.stringify(req));
                } else {
                    console.info('正在发送消息，请等候再发送!');
                }
            }
        },
        //连接关闭函数
        close: function (res) {
            if (socket.readyState == 1) socket.close();
        },
        guid: function () {
            function S4() {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            }
            return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
        },
        //判断是否符合json格式
        isJson: function (obj) {
            var isjson = typeof (obj) == "object" && Object.prototype.toString.call(obj).toLowerCase() == "[object object]" && !obj.length;
            return isjson;
        },
        //发送心跳
        heartBeat: function () {
            _heart = {
                'method': 'INFO',
                'from': _sessionId,
                'type': 'heart_beat',
                'call_id': _Guid
            };
            timer = setInterval(function () {
                if (socket.readyState == 1) {
                    ws.fn.send(_heart);
                } else {
                    clearInterval(timer);
                }
            }, 15000);
        },
    };
    ws.fn.init.prototype = ws.fn;

    ws.extend = ws.fn.extend = function () {
        var src, copyIsArray, copy, name, options, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;

        // Handle a deep copy situation
        if (typeof target === "boolean") {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if (typeof target !== "object" && !ws.isFunction(target)) {
            target = {};
        }

        // extend ws itself if only one argument is passed
        if (length === i) {
            target = this;
            --i;
        }

        for (; i < length; i++) {
            // Only deal with non-null/undefined values
            if ((options = arguments[i]) != null) {
                // Extend the base object
                for (name in options) {
                    src = target[name];
                    copy = options[name];

                    // Prevent never-ending loop
                    if (target === copy) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if (deep && copy && (ws.isPlainObject(copy) || (copyIsArray = ws.isArray(copy)))) {
                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && ws.isArray(src) ? src : [];

                        } else {
                            clone = src && ws.isPlainObject(src) ? src : {};
                        }

                        // Never move original objects, clone them
                        target[name] = ws.extend(deep, clone, copy);

                        // Don't bring in undefined values
                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    };
    ws.extend({
        isFunction: function (obj) {
            return ws.variety(obj) === "function";
        },
        type: function (obj) {
            if (obj == null) {
                return String(obj);
            }
            return typeof obj === "object" || typeof obj === "function" ?
                class2type[core_toString.call(obj)] || "object" :
                typeof obj;
        },
        isArray: Array.isArray || function (obj) {
            return jQuery.type(obj) === "array";
        },
        isPlainObject: function (obj) {
            // Must be an Object.
            // Because of IE, we also have to check the presence of the constructor property.
            // Make sure that DOM nodes and window objects don't pass through, as well
            if (!obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow(obj)) {
                return false;
            }

            try {
                // Not own constructor property must be Object
                if (obj.constructor &&
                    !core_hasOwn.call(obj, "constructor") &&
                    !core_hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
                    return false;
                }
            } catch (e) {
                // IE8,9 Will throw exceptions on certain host objects #9897
                return false;
            }

            // Own properties are enumerated firstly, so to speed up,
            // if last one is own, then all properties are own.

            var key;
            for (key in obj) { }

            return key === undefined || core_hasOwn.call(obj, key);
        },
    });
    ws.extend({
        //连接监听回调函数
        //type为open、message、close、error
        //callBack为回调函数
        on: function (type, callBack) {
            _handlers[type] = callBack;
        },
        //注销监听回调函数
        //callBack为回调函数
        off: function (type, callBack) {
            delete _handlers[type];
            callBack();
        },
        //注册消息
        regSend: function () {
            var cert;
            ws.certificate = arguments[0] || ws.certificate;
            try {
                if (typeof ws.certificate == "object") cert = ws.certificate;
                else cert = JSON.parse(ws.certificate);
                _register = {
                    'method': 'REGISTER',
                    'type': 'register_req',
                    'call_id': _Guid,
                    'info': {
                        'certificate': JSON.stringify(cert)
                    }
                };
                ws.fn.send(_register);
            }
            catch (err) {
                console.error('请输入符合json格式或json字符串格式的数字证书')
            }
        },
        //重连
        resume: function () {
            var cert;
            ws.certificate = arguments[0] || ws.certificate;
            try {
                if (typeof ws.certificate == "object") cert = ws.certificate;
                else cert = JSON.parse(ws.certificate);
                _resume = {
                    'method': 'REGISTER',
                    'type': 'resume_req',
                    'call_id': _Guid,
                    'info': {
                        'certificate': JSON.stringify(cert)
                    }
                };
                ws.fn.send(_resume);
            }
            catch (err) {
                console.error('请输入符合json格式或json字符串格式的数字证书')
            }
        },
        //更新证书
        update: function (new_cert) {
            var cert;
            ws.certificate = arguments[0] || new_cert;
            try {
                if (typeof ws.certificate == "object") cert = ws.certificate;
                else cert = JSON.parse(ws.certificate);
                _update = {
                    'method': 'REGISTER',
                    'type': 'update_cer_req',
                    'call_id': _Guid,
                    'info': {
                        'certificate': JSON.stringify(cert)
                    }
                };
                ws.fn.send(_update);
            }
            catch (err) {
                console.error('请输入符合json格式或json字符串格式的数字证书')
            }
        },
        //订阅消息
        subSend: function () {
            var subtxt = arguments[0] || ws.subscribe,
                subArray = subtxt.split(';');
            var flag = true;
            for (var i = subArray.length - 1; i >= 0; i--) {
                var new_subArray = subArray[i].split('@');
                if (new_subArray.length != 3) {
                    console.error('请输入正确的订阅信息');
                    flag = false;
                    break;
                }
            };
            if (flag) {
                _sub = {
                    'method': 'REGISTER',
                    'type': 'subscribe_req',
                    'from': _sessionId,
                    'call_id': _Guid,
                    'info': {
                        'subscribe': subtxt
                    }
                };
                ws.fn.send(_sub);
            }
        },
        //通知消息
        notify: function () {
            var cont = arguments[0] || ws._notify,
                t = arguments[1] || ws._type;
            if (!ws.fn.isJson(cont)) return console.error('请输入符合json格式或json字符串格式的数字证书');
            var not = {
                'method': 'NOTIFY',
                'type': t,
                'from': _sessionId,
                'call_id': _Guid,
                'info': cont
            };
            ws.fn.send(not);
        },
        //定向发送消息
        info: function () {
            var cont = arguments[0] || ws._info,
                t = arguments[1] || ws._type,
                to = arguments[2] || ws._to;
            if (!ws.fn.isJson(cont)) return console.error('请输入符合json格式或json字符串格式的数字证书');
            var inf = {
                'method': 'INFO',
                'type': t,
                'from': _sessionId,
                'to': to,
                'call_id': _Guid,
                'info': cont
            };
            ws.fn.send(inf);
        },
        //连接函数
        open: function (ip) {
            var $wsUrl = opt.ip,  //实例的ip地址
                $ip = $wsUrl.split(':')[0],  //获得origin
                $port = $wsUrl.split(':')[1] || '8080';  //获得端口号，默认8080

            if (socket == null || socket.readyState == 3) socket = new _WebSocket('ws://' + $ip + ':' + $port);  //开启连接
            else console.error('请先关闭之前连接')
        },
        //连接关闭函数
        close: function (res) {
            if (socket.readyState == 1) socket.close(); console.info('您已断开连接');
        },

    });

    // Expose ws to the global object
    window.ws = ws;
    if (typeof define === "function" && define.amd && define.amd.ws) {
        define("ws", [], function () { return ws; });
    }
}(window);

