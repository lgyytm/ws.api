
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
        core_version = '1.0',
        //浏览器WebSocket接口
        _WebSocket = window.WebSocket || window.WebKitWebSocket || window.MozWebSocket;
    //实例对象的原型链
    function _ws(opt) {
        // ws当前版本
        this._version = core_version;
        //返回数据
        this._data = {};
        //方法集合
        this._handlers = {};
        //websocket 定义
        this._socket = null;
        //心脏定时器
        this._timer = null;
        //socket状态
        this._state = '';
        this.opt = opt;

        var ws = this;
        //初始化ws
        ws.init = function () {
            var $wsUrl = opt.ip,  //实例的ip地址
                $ip = $wsUrl.split(':')[0],  //获得origin
                $port = $wsUrl.split(':')[1] || '8080',  //获得端口号，默认8080
                handlers = this._handlers, //监听方法集合
                foo;  //方法转换函数
            switch (opt.variety) {
                case 'link':
                    ws.variety = '连接';
                    break;
                case 'sub':
                    ws.variety = '订阅';
                    ws.certificate = opt.certificate; //储存数字证书
                    ws.subscribe = opt.subscribe;  //储存订阅信息
                    break;
                case 'resume':
                    ws.variety = '重连';
                    ws.certificate = opt.certificate; //储存数字证书
                    break;
                case 'update':
                    ws.variety = '更新';
                    ws.certificate = opt.certificate; //储存数字证书
                    break;
                case 'notify':
                    ws.variety = '通知';
                    ws.certificate = opt.certificate; //储存数字证书
                    ws._notify = opt.content; //通知体
                    ws._type = opt.type;
                    break;
                case 'info':
                    ws.variety = '定向发送';
                    ws.certificate = opt.certificate; //储存数字证书
                    ws._info = opt.content; //储存数字证书
                    ws._type = opt.type;
                    ws._to = opt.to;
                    break;
                default:
                    console.error('请输入已有的api，如link、sub、resume、update、notify、info');
                    break;
            }
            //判断浏览器是否支持websocket
            if (_WebSocket) {
                ws.socket = new _WebSocket('ws://' + $ip + ':' + $port);  //开启连接
                ws.socket.onopen = function (res) {
                    ws._state = '已连接'
                    ws._Guid = ws.guid();
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
                        foo('open');
                    }
                };
                ws.socket.onmessage = function (res) {
                    ws._state = '已连接,接收消息中'
                    ws._data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
                    if (ws._data.info.result && ws._data.info.result != 0) {
                        var result = ws._data.info.result;
                        console.error(errmsg[result]);
                    }
                    if (ws._data.method == 'REGISTER' && ws._data.type == 'register_resp') {
                        ws._sessionId = ws._data.info.session_id;
                        if (ws.variety == '通知') ws.notify();
                        else if (ws.variety == '定向发送') ws.info();
                        else {
                            ws.subSend();
                        }
                        ws.heartBeat();
                        if (handlers['register']) {
                            foo = handlers['register'];
                            foo('register');
                        }
                    } else if (ws._data.method == 'REGISTER' && ws._data.type == 'heart_beat') {
                        if (handlers['heart_beat']) {
                            foo = handlers['heart_beat'];
                            foo('heart_beat');
                        }
                    } else if (ws._data.method == 'REGISTER' && ws._data.type == 'resume_resp') {
                        if (handlers['resume']) {
                            foo = handlers['resume'];
                            foo('resume');
                        }
                    } else if (ws._data.method == 'REGISTER' && ws._data.type == 'update_cer_resp') {
                        if (handlers['update']) {
                            foo = handlers['update'];
                            foo('update');
                        }
                    } else if (ws._data.method == 'REGISTER' && ws._data.type == 'subscribe_resp') {
                        if (handlers['subscribe']) {
                            foo = handlers['subscribe'];
                            foo('subscribe');
                        }
                    } else {
                        if (handlers['message']) {
                            foo = handlers['message'];
                            foo(ws._data.info);
                        }
                    }
                };
                ws.socket.onclose = function (res) {
                    ws._state = '已关闭'
                    if (handlers['close']) {
                        foo = handlers['close'];
                        foo();
                    }
                };
                ws.socket.onerror = function (res) {
                    ws._state = '出现错误'
                    if (handlers['error']) {
                        foo = handlers['error'];
                        foo(res);
                    }
                };
            } else {
                alert('你的浏览器不支持WebSocket，请尝试其他浏览器')
            }
        };
        //发送消息函数
        ws.send = function (req) {
            if (!ws.socket || ws.socket.readyState != 1) {
                console.error('连接已断开，请重新连接');
            } else {
                if (ws.socket.bufferedAmount == 0) {
                    ws.isJson(req) && ws.socket.send(JSON.stringify(req));
                } else {
                    console.info('正在发送消息，请等候再发送!');
                }
            }
        };
        //连接关闭函数
        ws.close = function (res) {
            if (ws.socket.readyState == 1) ws.socket.close();
        };
        ws.guid = function () {
            function S4() {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            }
            return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
        };
        //判断是否符合json格式
        ws.isJson = function (obj) {
            var isjson = typeof (obj) == "object" && Object.prototype.toString.call(obj).toLowerCase() == "[object object]" && !obj.length;
            return isjson;
        };
        //发送心跳
        ws.heartBeat = function () {
            ws._heart = {
                'method': 'INFO',
                'from': ws._sessionId,
                'type': 'heart_beat',
                'call_id': ws._Guid
            };
            ws._timer = setInterval(function () {
                if (ws.socket.readyState == 1) {
                    ws.send(ws._heart);
                } else {
                    clearInterval(ws.timer);
                }
            }, 15000);
        };
    };

    _ws.extend = function () {
        var obj = arguments[0];
        if (obj && typeof obj === 'object') {
            for (var i in obj) {
                _ws.prototype[i] = obj[i];
            }
        }
    };
    _ws.extend({
        isFunction: function (obj) {
            return _ws.variety(obj) === "function";
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
    //连接监听回调函数
    //type为open、message、close、error
    //callBack为回调函数
    _ws.prototype.on = function (type, callBack) {
        this._handlers[type] = callBack;
    };
    //注销听回调函数
    //callBack为回调函数
    _ws.prototype.off = function (type, callBack) {
        delete this._handlers[type];
        callBack();
    };
    //注册消息
    _ws.prototype.regSend = function () {
        var cert;
        this.certificate = arguments[0] || this.certificate;
        try {
            if (typeof this.certificate == "object") cert = this.certificate;
            else cert = JSON.parse(this.certificate);
            var register = {
                'method': 'REGISTER',
                'type': 'register_req',
                'call_id': this._Guid,
                'info': {
                    'certificate': JSON.stringify(cert)
                }
            };
            this.send(register);
        }
        catch (err) {
            console.error('请输入符合json格式或json字符串格式的数字证书')
        }
    };
    //重连
    _ws.prototype.resume = function () {
        var cert;
        this.certificate = arguments[0] || this.certificate;
        try {
            if (typeof this.certificate == "object") cert = this.certificate;
            else cert = JSON.parse(this.certificate);
            var resume = {
                'method': 'REGISTER',
                'type': 'resume_req',
                'call_id': this._Guid,
                'info': {
                    'certificate': JSON.stringify(cert)
                }
            };
            this.send(resume);
        }
        catch (err) {
            console.error('请输入符合json格式或json字符串格式的数字证书')
        }
    };
    //更新证书
    _ws.prototype.update = function (new_cert) {
        var cert;
        this.certificate = arguments[0] || new_cert;
        try {
            if (typeof this.certificate == "object") cert = this.certificate;
            else cert = JSON.parse(this.certificate);
            var update = {
                'method': 'REGISTER',
                'type': 'update_cer_req',
                'call_id': this._Guid,
                'info': {
                    'certificate': JSON.stringify(cert)
                }
            };
            this.send(update);
        }
        catch (err) {
            console.error('请输入符合json格式或json字符串格式的数字证书')
        }
    };
    //订阅消息
    _ws.prototype.subSend = function () {
        var subtxt = arguments[0] || this.subscribe,
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
            var _sub = {
                'method': 'REGISTER',
                'type': 'subscribe_req',
                'from': this._sessionId,
                'call_id': this._Guid,
                'info': {
                    'subscribe': subtxt
                }
            };
            this.send(_sub);
        }
    };
    //通知消息
    _ws.prototype.notify = function () {
        var cont = arguments[0] || this._notify,
            t = arguments[1] || this._type;
        if (!this.isJson(cont)) return console.error('请输入符合json格式或json字符串格式的数字证书');
        var not = {
            'method': 'NOTIFY',
            'type': t,
            'from': this._sessionId,
            'call_id': this._Guid,
            'info': cont
        };
        this.send(not);
    };
    //定向发送消息
    _ws.prototype.info = function () {
        var cont = arguments[0] || this._info,
            t = arguments[1] || this._type,
            to = arguments[2] || this._to;
        if (!this.isJson(cont)) return console.error('请输入符合json格式或json字符串格式的数字证书');
        var inf = {
            'method': 'INFO',
            'type': t,
            'from': this._sessionId,
            'to': to,
            'call_id': this._Guid,
            'info': cont
        };
        this.send(inf);
    };
    //连接函数
    _ws.prototype.open = function (ip) {
        var $wsUrl = ip,  //实例的ip地址
            $ip = $wsUrl.split(':')[0],  //获得origin
            $port = $wsUrl.split(':')[1] || '8080';  //获得端口号，默认8080

        if (this.socket == null || this.socket.readyState == 3) this.socket = new _WebSocket('ws://' + $ip + ':' + $port);  //开启连接
        else console.error('请先关闭之前连接')
    };
    //连接关闭函数
    _ws.prototype.close = function (res) {
        if (this.socket.readyState == 1) this.socket.close(); console.info('您已断开连接');
    };

    // Expose ws to the global object
    window.$ws = function (opt) {
        var s = new _ws(opt);
        s.init();
        return s;
    }
    if (typeof define === "function" && define.amd && define.amd.$ws) {
        define("$ws", [], function () { return ws; });
    }
}(window);

