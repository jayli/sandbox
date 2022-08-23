	 _____                 _ _               
	/  ___|               | | |              
	\ `--.  __ _ _ __   __| | |__   _____  __
	 `--. \/ _` | '_ \ / _` | '_ \ / _ \ \/ /
	/\__/ / (_| | | | | (_| | |_) | (_) >  < 
	\____/ \__,_|_| |_|\__,_|_.__/ \___/_/\_\ 

Sandbox - 一个好玩的脚本加载器.
 
- Created by 拔赤
- License: MIT

# 理念

- 动态构建模块树
- 有特点的代码组织风格
- autoload

# 说明

- [sandbox.js](https://github.com/jayli/sandbox/blob/master/core/sandbox.js)	种子文件，实现了一种好玩的模块管理机制
- [slideshare](http://www.slideshare.net/lijing00333/javascript-autoload-8590158)  一些基本概念，请阅读这个ppt

又一个“脚本加载器”？对，这个seed文件实现了Loader的功能，处理脚本之间的依赖关系，将模块于模块的调用关系耦合降到最低，它是最简单的脚本加载器，例如，A依赖B，B的依赖对A是不透明的。因此，Sandbox和[controlJS](http://stevesouders.com/controljs/)相比，它是非侵入的，和[YUILoader](http://developer.yahoo.com/yui/3/)相比，它不必预先定义好依赖次序，和[yepnopejs](http://yepnopejs.com/)相比，没有对document.write的使用限制，和[seajs](http://seajs.com/)相比，不必去迎合commonJS的那些规定和教条……

# Demo

- [Demo1](http://jayli.github.com/sandbox/examples/jq-tab.html)，主程序依赖了`tab.js`,`tab.js`依赖了`jquery.js`
- [Demo2](http://jayli.github.com/sandbox/examples/test.php.html)，依赖php环境，测试loader顺序
- [Demo3](http://jayli.github.com/sandbox/examples/autoload/main.html)，[Demo4](http://jayli.github.com/sandbox/examples/autoload/test/mojo.html)，模拟php的autoload机制

Demo2中，test.php中的依赖关系为

```
test.php
  |
  |--1.js
  |	|
  |	|--2.js
  |	|	|
  |	|	|--jquery
  |	|
  |	|--3.js
  |		|
  |		|--4.js
  |
  |--5.js
```

Loading瀑布，脚本加载为串行(因为Loader在加载1.js文件完成之前无法知晓1.js依赖其他的js文件)，动态构建模块树,其中并行的两个js下载是2.js和3.js

![loading](http://jayli.github.com/sandbox/assets/loading.png)

# API

## 逻辑的启动

Sandbox对象是来自于sandbox-seed.js中的定义，始终存在的全局对象，类似jQuery的$。Sandbox类似[Kissy](http://docs.kissyui.com/)，采用弱沙箱来串接各个子模块逻辑。Sandbox提供一些方法成员，用来加载/执行主逻辑或者模块逻辑，最常用的方法是ready和add。
ready方法用于主逻辑的启动，表示“这段逻辑在依赖的模块都ready之后立即执行”，通常在页面中使用。用法：

```
Sandbox.ready(callback,config,status).
```

callback: 回调函数, 回调参数为Sandbox

config: 定义依赖的文件，格式为

```
{
  requires:[
    'jsfile1.js','jsfile2.js','cssfile.css'
  ]
}
```

status:逻辑是否依赖domready，true时立即执行，false等待domready后执行，默认为false

```
Sandbox.ready(function(S){//立即执行这段代码
  alert('hello world!');
},true);
```

等待domready后执行逻辑

```
Sandbox.ready(function(S){//domready后执行这段逻辑，请求子逻辑也是domready之后，如果已经domready，立即执行
  alert('hello world!');
},{
  requires:[
    '1.js','2.js','3.css'
  ]
});
```
## 添加子模块

Sandbox提供add方法，用来添加模块，并指定该模块的依赖，用法：Sandbox.add(modulename,callback,config)。
add方法添加的模块可以依赖其他模块，任意模块的写法都使用Sandbox.add方法来添加，一个js文件中可以存在多个Sandbox.add的子模块，参数说明：

modulename：模块名称为了语义化一个模块，可以指定模块的名称，类型为字符串，可以留空

callback：回调函数，参数为Sandbox

config：该模块的依赖文件和其他配置，格式为

```
{
  requires:[
    'jsfile1.js','jsfile2.js','cssfile.css'
  ],
  auto:true //该逻辑是否可执行，默认为true
}
```

添加子模块：

```
Sandbox.add('tab',function(S){ //第一个参数可以省略
  //your code
},{requires:[
  'jquery.js',
  'skin.css'
]});
```

子模块的逻辑不执行：

```
Sandbox.add(function(S){
  //your code,这里的代码无执行
},{
  auto:false
});
```

## 简单的脚本加载

Sandbox提供了一种简单加载外部脚本的方式`Sandbox.load('script1','script2',callback)`，callback可选.

load中的脚本为串行加载（css文件不串行），被加载的文件也会被执行Sandbox规则，依赖的依赖会被检测到

```
Sandbox.load('http://cdn/a.js', 'http://cdn/b.js',function(S){
  // your code
});
```

这种方式加载的js依然通过Sandbox的机制进行过滤，依赖的依赖也会被检测到

## 将Sandbox用作函数

Sandbox提供另外一种快捷用法，可以用来生成一个简单的闭包：

```
Sandbox(function(S{
  // your code
}, {requires:[]});
```

第二个参数可选，类似于直接调用Sandbox.ready，是依赖Domready的。

## 调用子模块

为了让程序组织更加灵活，Sandbox增加了use方法，可以让模块在装载的时候不用执行(通过配置auto参数)，在需要的时刻再执行子逻辑，实现逻辑类似YUI().use()，只是Sandbox.use没有和loader本身关联在一起，仅用作调用子逻辑。用法：Sandbox.use('modulename1','modulename2')，例如主程序调用了1.js：

```
Sandbox.ready(function(S){
  //主逻辑
},{requires:['1.js']});
```

1.js设置了不立即执行，并给定了逻辑的名称

```
Sandbox.add('modulename',function(S){
  //模块逻辑
}, {auto:false});
```

在需要的时刻调用这个逻辑：

```
Sandbox.use('modulename').ready(function(S){
  //执行子逻辑后的回调
});
```

## 定义命名空间

Sandbox提供namespace方法，用来生成一个命名空间，用法：

```
Sandbox.namespace('S.SubModule');//创建S.SubModule
Sandbox.namespace('a.b.c.d');//创建a.b.c.d
```

## 加载外部脚本

Sandbox可以直接调取外部脚本

```
Sandbox.loadScript(url,callback);//只支持单url的场景
Sandbox.loadCSS(url,callback);//不会等待url请求成功，直接执行回调
```

## autoload

Sandbox提供了另一个有意思的功能，就是autoload功能，熟悉PHP、Ruby和Python的同学对autoload不会陌生，就是通过代码分析来加载所需要的依赖文件，这种功能对于某个类库初学者来说非常有用，因为初学者不清楚用到的方法属于哪个模块，这时就需要用到autoload咯。

Sandbox的autoload写法模拟PHP的写法，`__autoload()`函数的内容和PHP约定稍有不同，不过不妨碍理解，用法如下，首先需要在全局定义`__autoload`函数，返回值是一个map，给出每个方法对应的文件：

```
function __autoload(){
  return {
    'MyClass1':'MyClass1.js',	
    'A.B.C.D':'MyClass1.js',	
    'MyClass2':'MyClass2.js',
    'X.Y.Z':'MyClass2.js'
  };
}
```

这时在写代码过程中，程序遇到未知的函数和变量，都会首先加载其对应的文件，以保证程序不会出错。

```
Sandbox.ready(function(S){
  MyClass1.init();
  MyClass2.init();
  A.B.C.D.init();
});
```

和PHP唯一的不同之处在于，PHP需要手写include方法来“阻塞式”引入文件，Sandbox只给出映射表即可，另外，Sandbox也不支持给`__autoload`传入参数，比如`__autoload($class_name)`

# 兼容浏览器
- IE 6+, Firefox 3+, Safari 4+, Chrome 2+, Opera 9+

Thanks for your reading!
