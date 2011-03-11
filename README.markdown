
# Info

![logo](http://img02.taobaocdn.com/tps/i2/T1k_p2XohxXXXXXXXX-492-96.png)

Sandbox - 一个好玩的脚本加载器.
 
- Created by [拔赤](http://jayli.github.com)
- License: [http://www.opensource.org/licenses/mit-license.php](http://www.opensource.org/licenses/mit-license.php)

# 理念

- 动态构建模块树
- 独特的代码组织风格
- 它很好玩

# 说明

- [sandbox-seed.js](https://github.com/jayli/sandbox/blob/master/core/sandbox-seed.js)	种子文件，实现了一种模块管理机制

又一个“脚本加载器”？对，这个seed文件实现了Loader的功能，处理脚本之间的依赖关系，加载过程中构建模块依赖关系，将模块于模块的调用关系耦合降到最低，例如，A依赖B，B的依赖对A是不透明的。因此，Sandbox和[controlJS](http://stevesouders.com/controljs/)相比，它是非侵入的，和[YUILoader](http://developer.yahoo.com/yui/3/)相比，它不必预先定义好依赖次序，和[yepnopejs](http://yepnopejs.com/)相比，没有繁杂的约定……

# Demo

- [Demo1](http://jayli.github.com/sandbox/examples/jq-tab.html)，主程序依赖了`tab.js`,`tab.js`依赖了`jquery.js`
- [Demo2](http://jayli.github.com/sandbox/examples/test.php.html)，依赖php环境，测试loader顺序

Demo2中，test.php中的依赖关系为

	test.php
		|
		|--1.js
			|
			|--2.js
			|	|
			|	|--jquery
			|
			|--3.js
				|
				|--4.js

Loading瀑布，脚本加载为串行，动态构建模块树,其中并行的两个js下载是2.js和3.js

![loading](http://jayli.github.com/sandbox/assets/loading.png)

# API

## 逻辑的启动

Sandbox对象是来自于sandbox-seed.js中的定义，始终存在的全局对象，类似jQuery的$。Sandbox类似[Kissy](http://docs.kissyui.com/)，采用弱沙箱来串接各个子模块逻辑。Sandbox提供一些方法成员，用来加载/执行主逻辑或者模块逻辑，最常用的方法是ready和add。
ready方法用于主逻辑的启动，表示“这段逻辑在依赖的模块都ready之后立即执行”，通常在页面中使用。用法：Sandbox.ready(callback,config,status).

callback:回调函数,回调参数为Sandbox

config:定义依赖的文件，格式为

	{
		requires:[
			'jsfile1.js','jsfile2.js','cssfile.css'
		]
	}

status:逻辑是否依赖domready，true时立即执行，false等待domready后执行，默认为false

	Sandbox.ready(function(S){//立即执行这段代码
		alert('hello world!');	
	},true);

等待domready后执行逻辑

	Sandbox.ready(function(S){//domready后执行这段逻辑，请求子逻辑也是domready之后，如果已经domready，立即执行
		alert('hello world!');	
	},{
		requires:[
			'1.js','2.js','3.css'
		]
	});

## 添加子模块

Sandbox提供add方法，用来添加模块，并指定该模块的依赖，用法：Sandbox.add(modulename,callback,config)。
add方法添加的模块可以依赖其他模块，任意模块的写法都使用Sandbox.add方法来添加，一个js文件中可以存在多个Sandbox.add的子模块，参数说明：

modulename：模块名称为了语义化一个模块，可以指定模块的名称，类型为字符串，可以留空

callback：回调函数，参数为Sandbox

config：该模块的依赖文件和其他配置，格式为

	{
		requires:[
			'jsfile1.js','jsfile2.js','cssfile.css'
		],
		auto:true //该逻辑是否可执行，默认为true
	}

添加子模块：

	Sandbox.add('tab',function(S){ //第一个参数可以省略
		//your code
	},{requires:[
		'jquery.js',
		'skin.css'
	]});

子模块的逻辑不执行：

	Sandbox.add(function(S){ 
		//your code,这里的代码无执行
	},{
		auto:false	
	});

## 定义命名空间

Sandbox提供namespace方法，用来生成一个命名空间，用法：

	Sandbox.namespace('S.SubModule');//创建S.SubModule
	Sandbox.namespace('a.b.c.d');//创建a.b.c.d

## 加载外部脚本

Sandbox可以直接调取外部脚本

	Sandbox.loadScript(url,callback);//只支持单url的场景
	Sandbox.loadCSS(url,callback);//不会等待url请求成功，直接执行回调

# 兼容浏览器
- IE 6+, Firefox 3+, Safari 4+, Chrome 2+, Opera 9+

Thanks for your reading!
