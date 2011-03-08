## Sandbox

A module-based javascript seed.
 
- Created by [拔赤](http://jayli.github.com)
- License: http://www.opensource.org/licenses/mit-license.php

## 理念

- 动态构建模块树
- 独特的代码组织风格
- 它很好玩

## 说明

- [Demo](http://jayli.github.com/sandbox/examples/jq-tab.html)
- [sandbox-seed.js](https://github.com/jayli/sandbox/blob/master/core/sandbox-seed.js)	种子文件，实现了一种模块管理机制

## 兼容浏览器
- IE 6+, Firefox 3+, Safari 4+, Chrome 2+, Opera 9+

Thanks for your reading!

## Useage

参照[Demo](http://jayli.github.com/sandbox/examples/jq-tab.html)，主程序依赖了`tab.js`,`tab.js`依赖了`jquery.js`

主程序
	Sandbox.ready(function(S){
		S.Demo.init();
	},{requires:['js/tab.js']});

`tab.js`

	Sandbox.add('tab',function(S){
		S.namespace('S.Demo');
		S.Demo.init = function(){
			//YourCode...
		};
	},{requires:[
		'jquery.js',
		'skin.css'
	]});
