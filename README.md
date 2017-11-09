# 云途Websocket接口文档

---

版本号 | 时间 | 内容
:---:|:---:|:---:
V 1.0  | 2017-08-15 | 封装完成websocket接口，主要包括websocket的接口搭建、返回消息回调、发送消息、接口关闭等功能


---
## 一. 文档描述
>&emsp;&emsp;云途Websocket接口文档(以下简称本文档),描述的是websocket的接口api,详细描述各个api的功能和使用方法。
```
graph LR
    A[开启一个websocket通信]-->B{注册证书}
    B-->|订阅| C(订阅消息)
    B-->|通知| D(通知消息)
    B-->|发送| E(定向发送)
    B-->|心跳| F(发送心跳,自动)
    C --> G[关闭]
    D --> G[关闭]
    E --> G[关闭]
    F --> G[关闭]
```

## 二. 接口描述
### 1.ws(option) 全局变量，实例化一个新的websocket通信，自动连接、注册、订阅、发送消息、发送通知和心跳。
#### &emsp;&emsp;(1)参数：option(object)
- ip:需要连接的webcoket路径，默认端口号为8080
- variety:
    - "sub": 订阅类型
    - "resume": 重连类型
    - "update": 更新数字证书类型
    - "notify": 通知消息类型
    - "info": 定向发送类型
- subscribe: 订阅频道，需符合 '\*@\*\*@\*\*\*' 格式,只有订阅类型才需要，否则不会有任何影响
- content: 通知体内容，只有在通知类型或者定向发送类型才需要，否则不会有任何影响，须符合json格式
- notify: 通知消息特征,根据具体业务需要填写，只有在通知类型才需要，否则不会有任何影响
- send: 定向发送消息类型,根据具体业务需要填写，只有在定向发送类型才需要，否则不会有任何影响
- to: 定向发送消息到所需客户端id，根据具体业务需要填写，只有在定向发送类型才需要，否则不会有任何影响

#### &emsp;&emsp;(2)方法
1. on(type, callback):事件绑定，在一些事件完成后执行的回调函数

       1.'open': websocket通信服务打开事件
       2.'register': 注册回调
       3.'heart_beat': 心跳回调
       4.'resume': 重连回调
       5.'update': 更新证书回调
       6.'subscribe': 订阅消息回调
       7.'mesage': 其他所有消息都归于这一类
       
2. off(type, callback):事件注销，注销之前绑定的事件

3. *regSend(certicate):注册证书，certicate为注册证书体，须符合json格式，默认为之前实例化时候的证书，只有在websocket通信打开未注册使用才有效 __(不建议使用，建议直接实例化一个新的ws(option))__

4. resume(certificate):重连，certicate为注册证书体，须符合json格式，默认为之前实例化时候的证书，只有在websocket通信打开未注册使用才有效

5. update(certificate):更新注册证书，certicate为注册证书体，须符合json格式，默认为之前实例化时候的证书，只有在websocket通信打开未注册使用才有效

6. *subSend(subscribe):订阅消息，subscribe为订阅消息体，须符合字符串格式，默认为之前实例化时候的订阅，注册完后执行该函数，否则无法订阅 __(不建议使用，建议直接实例化一个新的ws(option))__

7. notify(content): 通知消息，content为通知消息体，须符合json格式，默认为之前实例化时候的通知消息体，注册完后执行该函数，否则无法通知

8. info(content): 发送消息，content为发送消息体，须符合json格式，默认为之前实例化时候的发送消息体，注册完后执行该函数，否则无法发送消息

9. *open(ip): 开启websocket通信 __(不建议使用，建议直接实例化一个新的ws(option))__

10. close(): 关闭websocket通信
