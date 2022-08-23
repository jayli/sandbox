/*! Sandbox.js (Sandbox :: a funny js Loader)
v1.0 (c) Jayli (bachi@taobao.com)
MIT License
http://github.com/jayli/sandbox

   _____                 _ _
  /  ___|               | | |
  \ `--.  __ _ _ __   __| | |__   _____  __
   `--. \/ _` | '_ \ / _` | '_ \ / _ \ \/ /
  /\__/ / (_| | | | | (_| | |_) | (_) >  <
  \____/ \__,_|_| |_|\__,_|_.__/ \___/_/\_\

*/

(function(exports) {

var mix = function(o, a) {
  for (var i in a) {
    o[i] = a[i];
  }
};

/*
 * shortcut of Sandbox.ready
 * Sandbox(arguments) == Sandbox.ready(arguments)
 */
var S = function() {
  arguments.callee.ready.apply(arguments.callee,arguments);
};

mix(S,{
  /*
   * _autoload 函数，模仿PHP的__autoload
   */
  _autoload : function() {
    if (typeof window.__autoload == 'undefined') {
      return false;
    } else {
      return true;
    }
  },

  /*
   * php autoload机制的模拟
   * function __autoload($class_name){
   *    include $class_name.'.php';
   * }
   */
  _parseAutoload : function(code) {
    var that = this;
    if (!that._autoload()) return [];

    var map = __autoload();

    var removeComments = function(code) {
      return code
        .replace(/(?:^|\n|\r)\s*\/\*[\s\S]*?\*\/\s*(?:\r|\n|$)/g, '\n')
        .replace(/(?:^|\n|\r)\s*\/\/.*(?:\r|\n|$)/g, '\n');
    };
    var trim = function(s) {
      return s.replace(/(^\s*)|(\s*$)/g, "");
    };

    code = removeComments(code);

    var pattern,i;
    var ret = [], match;

    for (i in map) {
      var str = i.replace('.','\\.');
      pattern = new RegExp('[^.]\\b'+str+'\\s*','g');

      while ((match = pattern.exec(code))) {
        var f = trim(match[0]);
        if (f && map[f]) {
          if (that._checkLoaded(map[f])) continue;
          ret.push(map[f]);
        }
      }
    }

    return ret;
  },

  /*
   * 全局模块树，动态构建
   * 格式：
   *  'mojo-name':{
   *    fullpath:'',
   *    callback:foo,
   *    requires:[]
   *  }
   * @property
   * @type object
   * @default {}
   */
  _Mojos: {},

  /*
   * 增加一个模块到_Mojos中
   * 参数格式：
   *  {
   *    mojoname:
   *    fullpath:
   *    callback:
   *    requires:
   *    attached:   执行过后就设置为true
   *  }
   * @method _addMojo
   * @param o 要增加的object
   * @private
   */
  _addMojo: function(o){
    var that = this;
    that._Mojos[o.mojoname]          = {};
    that._Mojos[o.mojoname].fullpath = o.fullpath;
    that._Mojos[o.mojoname].auto     = o.auto;
    that._Mojos[o.mojoname].attached = false;
    that._Mojos[o.mojoname].callback = o.callback;
    that._Mojos[o.mojoname].requires = o.requires;
  },

  /*
   * 使用add添加模块的代码
   * @method add
   * @interface
   * @param mojoname 模块名称, 可以为空
   * @param callback 回调
   * @param config 配置，包含requires:[]，成员为外部脚本的fullpath
   * @static
   */
  add: function(mojoname,callback,config) {
    var that = this,
      o = {};

    if (typeof mojoname == 'function') {
      var config = callback,
        callback = mojoname,
        mojoname = 'K_' + Math.random().toString().replace('.','');
    }

    o.mojoname = mojoname;
    o.callback = callback;
    o.fullpath = that._RuntimeScript;

    var config = config || {},
      requires = config.requires ? config.requires : [],
      auto = (typeof config.auto != 'undefined') ? config.auto : true;   //默认都是自动加载

    o.requires = requires;
    o.auto = auto;
    that._addMojo(o);

    return this;
  },

  /*
   * namespace
   * yui的namespace在闭包中对上下文要求太苛刻，重写之，只判断是否存在，不做类型处理
   * @method namespace
   * @param string 命名空间串
   * @static
   */
  namespace: function() {
    var a = arguments, o = null, d;
    for (var i = 0; i < a.length; i++) {
      d = ("" + a[i]).split(".");
      var _win = this;
      //默认根
      if (/^(S|Sandbox|SB)$/.test(d[0])) {
        var j = 1,
          _win = this;
      } else {
        var j = 0,
          _win = window;
      }
      for (; j < d.length; j++) {
        if (typeof _win[d[j]] === 'undefined') _win[d[j]] = {};
        _win = _win[d[j]];
      }
    }
    return _win;
  },

  /*
   * 遍历_Mojos，计算当前未加载的脚本，并加载之，JS文件是从前到后依次串行加载
   * @method _loadUnloaded
   * @param callback 加载完成的回调
   * @private
   */
  _loadUnloaded: function(callback) {
    var that = this,
      _a = [];
    for (var i in that._Mojos) {
      var _req = that._Mojos[i].requires;
      for (var j = 0; j < _req.length; j++) {
        if (!that._checkLoaded(_req[j])) {
          _a.push(_req[j]);
        }
      }
    }
    _a = that.distinct(_a);

    var recursion = function() {
      if (_a.length == 0) {
        callback(that);
        return false;
      };
      var _item  = _a.reverse().pop();
      _a = _a.reverse();
      that.loadScript(_item,recursion);
    };
    recursion();
  },

  /*
   * 检查文件是否已经加载,已经加载return true否则return false
   * @method _checkLoaded
   * @param fullpath 传入要检查的文件fullpath
   * @private
   */
  _checkLoaded: function(fullpath) {
    var that = this;
    if (that.inArray(fullpath,that._LoadQueue)) return true;
    else return false;
  },

  /*
   * 检查是否还有需要加载的脚本,true，加载完全，若返回一个脚本的fullpath，说明还有未加载的
   * @method _checkAllLoaded
   * @private
   */
  _checkAllLoaded: function() {
    var that = this;
    for (var i in that._Mojos) {
      var _req = that._Mojos[i].requires;
      for (var j in _req) {
        if (that._checkLoaded(_req[j]) == false) {
          return _req[j];
        }
      }
    }
    return true;
  },

  /*
   * 已经装载的模块名称
   */
  _Uses:[],

  /*
   * 创建执行模块回调的顺序存储到_ExeQueue中,一定是在脚本完全加载后执行
   * TODO 并未用到树遍历，只是粗糙的偏等计算并去重，有待进一步改进
   * @method _buildExeQueue
   * @private
   */
  _buildExeQueue: function() {
    var that = this,
      _a = [];
    for (var i in that._Mojos) {
      _a.push(that._Mojos[i].fullpath);
      var _req = that._Mojos[i].requires;
      for (var j in _req) {
        _a.push(_req[j]);
      }
    }
    _a = that.distinct(_a);

    that._ExeQueue = [];
    for (var i in _a) {
      for (var j in that._Mojos) {
        if (_a[i] == that._Mojos[j].fullpath &&
            (that._Mojos[j].auto == true || that.inArray(j,that._Uses))) {
          that._ExeQueue.push(j);
        }
      }
    }
    that._reorder();
  },

  /*
   * 重新排序_ExeQueue，如果不排序，同一个文件中的mojo执行顺序是倒序的
   * @method
   * @private
   */
  _reorder : function(){
    var that = this;
    for (var i = 0;i < that._LoadQueue.length; i++) {
      var _a = [],  //[2,4,7]
        _ta = [],   //['m1','m2','m3']
        fullpath = that._LoadQueue[i];
      for (var j = 0; j < that._ExeQueue.length; j++) {
        var mojoname = that._ExeQueue[j];
        if (that._Mojos[mojoname].fullpath == fullpath) {
          _a.push(j);
          _ta.push(mojoname);
        }
      }
      //这个文件中只有一个mojo，不用对_ExeQueue倒序，继续下一个循环
      if (_a.length <= 1) {
        continue;
      } else {
        _a.reverse();
        for (var k = 0; k < _a.length; k++) {
          var index = _a[k],
            mname = _ta[k];
          that._ExeQueue[index] = mname;
        }
      }
    }
  },

  /*
   * 已经loaded的脚本文件存储在这里
   * 类似：
   *    ['1.js','2.js']
   * @property
   * @private
   * @type []
   */
  _LoadQueue : [],

  /*
   * 执行模块的回调的顺序,这里的mojo-name是模块定义的时候指定的名称,重复的名称会被覆盖
   * 类似：
   *    ['mojo-name','mojo-name-1']
   * @property
   * @private
   * @type []
   */
  _ExeQueue : [],

  /*
   * 根据模块树，按照顺序执行模块树中的回调
   * @method _runConstructors
   * @private
   */
  _runConstructors : function() {
    var that = this;
    that._buildExeQueue();
    var _a = that._ExeQueue.reverse();
    for (var i = 0; i < _a.length; i++) {
      if (that._Mojos[_a[i]].attached) {
        continue;
      }
      that._Mojos[_a[i]].attached = true;
      var callback = that._Mojos[_a[i]].callback;

      var ret = that._parseAutoload(callback.toString());
      if (ret.length == 0 || callback.done) {
        callback(that);
      } else {
        // TODO: 目前是依赖DomReady，是否去掉这个依赖?
        that.ready(callback,{
          requires:ret
        });
      }
      callback.done = true;
    }
  },

  /*
   * 当前文件的依赖的script fullpath
   * @property
   * @private
   * @type string
   */
  _RuntimeScript: '',

  /*
   * 主线程执行的队列，用于存放多个ready沙箱的回调
   * item格式为：
   *    {callback:callback,requires:requires}
   * @property
   * @static
   * @type []
   */
  DoQueue: [],

  /*
   * 开启沙箱
   * @method ready
   * @interface
   * @param callback 回调
   * @param config 配置，包含requires:[]，成员为外部脚本的fullpath,可以为空
   * @param status 是否立即发起请求，不等domready,true:立即执行,不等domready,默认为false，
   * @static
   */
  ready: function(callback,config,status) {
    var that = this;
    if (typeof config == 'boolean') {
      arguments.callee.apply(this,[callback,{requires:[]},config]);
      return this;
    }
    var status = typeof status == 'undefined' ? false : true;
    if (typeof config != 'undefined') {
      var requires = config.requires;
    } else {
      var requires = [];
    }
    if (that.domReady || status) {
      that.run(requires,callback);
      return this;
    }
    that.DoQueue.push({callback:callback,requires:requires});
    return this;
  },

  /*
   * 如果add的逻辑没有立即执行，则通过use调用模块名字来执行
   * @method use
   * @param {string} 类似YUI的use()，但没有最后的回调，通过ready()来写回调
   * @public
   */
  use : function(){
    var that = this;
    var a = arguments;
    for (var i = 0;i < a.length; i++) {
      if (that.domReady) {
        that.run(that._Mojos[a[i]].requires,that._Mojos[a[i]].callback);
      } else {
        that._Uses.push(a[i]);
      }
    }

    return this;
  },

  /*
   * 主线程开始调用各自的沙箱回调
   * @method run
   * @param a 主线程依赖的模块数组
   * @param callback 回调
   * @private
   */
  run: function(a,callback) {
    var that = this;
    var requires = that.distinct(a ? a : []).concat().reverse();
    var recursion = function() {
      if (requires.length == 0) {
        if (that._checkAllLoaded() == true) {
          that._runConstructors();
          var ret = that._parseAutoload(callback.toString());
          if (ret.length == 0 || callback.done) {
            callback(that);
          } else {
            // TODO: 此处为依赖DomReady，是否要去掉这个依赖?
            that.ready(callback,{
              requires:ret
            });
          }
          callback.done = true;
        } else {
          that._loadUnloaded(recursion);
        }
    
        return false;
      }
      that.loadScript(requires.pop(),recursion);
    };
    recursion();

    return this;
  },

  /*
   * 正在下载中(包括下载完成)的脚本
   * @type []
   */
  _loadingQueue: [],

  /*
   * load脚本
   * TODO opera 10+下有bug
   * @method loadScript
   * @param url 脚本fullpath
   * @param callback 回调
   * @private
   */
  loadScript: function(url, callback) {
    var that = this;
    that._RuntimeScript = url;
    if (that.inArray(url,that._LoadQueue)) {
      callback();
      return false;
    }

    if (url instanceof Array) {

      if (url.length == 1) {
        that.loadScript.apply(that,[url[0],callback]);
        return false;
      }

      var _url = url.reverse().pop();
      url = url.reverse();

      that.loadScript(_url, function() {
        that.loadScript.apply(that,[url,callback]);
      });

      return false;
    }


    //bugfix 只有在load完成后才算已经加载，因此要在回调中push到'已完成'
    //that._LoadQueue.push(url);

    //bugfix 如果当前脚本是正在下载中的脚本，直接退出
    //TODO 如果请求失败，这里将陷入死循环
    if (that.inArray(url,that._loadingQueue)) {
      setTimeout(function() {
        that.loadScript.apply(that,[url,callback]);
      }, 100);
      return;
    }
    that._loadingQueue.push(url);

    //如果是css
    if (/\.css$/i.test(url)) {
      that.loadCSS(url);
      that._LoadQueue.push(url);
      callback();
      return false;
    }

    var script = document.createElement("script")
      script.type = "text/javascript";

      if (script.readyState) {  //IE
      script.onreadystatechange = function() {
         if(script.readyState == "loaded" ||
            script.readyState == "complete") {
          script.onreadystatechange = null;
          that._LoadQueue.push(url);
          callback();
         }
      };
    } else {  //Others
      script.onload = function() {
        //if(typeof log  != 'undefined')log('load script ok: '+url);
        that._LoadQueue.push(url);
        callback();
       };
     }

     script.src = url;
     document.getElementsByTagName("head")[0].appendChild(script);
  },

  /*
   * load样式
   * @method loadCSS
   * @param url 脚本fullpath
   * @private
   */
  loadCSS : function(url) {
    var cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.rev = "stylesheet";
    cssLink.type = "text/css";
    cssLink.media = "screen";
    cssLink.href = url;
    document.getElementsByTagName("head")[0].appendChild(cssLink);
  },

  /*
   * load 函数,仅用于加载外部脚本之用，串行加载脚本，一种快捷用法，考虑到安全第一（非性能），依赖DomReady
   * @mathod load
   * @param Sandbox.load('script-url1','script-url2'...function(S){})
   * @public
   */
  load : function() {
    var that = this;
    // a:js,b:css
    var a = [], b = [];
    var _cb = arguments[arguments.length - 1];
    var cb = (typeof _cb) == 'function' ? _cb : new Function;

    for (var i = 0 ; i < arguments.length; i++) {
      if (typeof arguments[i] == 'string') {
        if (/\.css$/i.test(arguments[i])) {
          that.loadCSS(arguments[i]);
        } else {
          a.push(arguments[i]);
        }
      }
    }

    var I = 0;

    var loadnext = function() {

      if (I == a.length - 1) {
        var _cb = cb;
      } else {
        var _cb = loadnext;
      }
  
      that.ready(_cb, {
        requires:[
          a[I]
        ]
      });

      I++ ;
    };

    loadnext();

    return this;

    /*
    for(var i = 0 ;i < a.length;i++){
      that.ready( i == 0?cb:new Function , {
        requires:[
      
        ]
      });
    }
    */

    // TODO: 是否真的需要依赖DomReady?
    /*
    that.ready(cb,{
      requires:a
    });

    */
  },

  /*
   * 给数组去重,前向去重，若有重复，去掉前面的重复值,保留后面的
   * @method  distinct
   * @param { array } 需要执行去重操作的数组
   * @return { array } 返回去重后的数组
   */
  distinct: function(A) {
    var that = this;
    if (!(A instanceof Array) || A.length <=1 ) return A;
    var a = [], b=[];
    for (var i = 1; i < A.length; i++) {
      for (var j = 0; j < i; j++) {
        if (that.inArray(j,b)) continue;
        if (A[j] == A[i]) {
          b.push(j);
        }
      }
    }
    for (var i = 0; i < A.length;i++) {
      if (that.inArray(i,b)) continue;
      a.push(A[i]);
    }
    return a;
  },

  /*
  * 判断数值是否存在数组中
  * @param { value } v : 要匹配的数值
  * @param { array } a : 存在的数组
  */
  inArray : function(v, a) {
    var o = false;
    for (var i=0, m = a.length; i < m; i++) {
      if (a[i] == v) {
        o = true;
        break;
      }
    }
    return o;
  },

  /*
   * 浏览器判断，来自yui3
   * @property
   * @static
   */
  UA : function() {

    var numberfy = function(s) {
        var c = 0;
        return parseFloat(s.replace(/\./g, function() {
          return (c++ == 1) ? '' : '.';
        }));
      },

      nav = navigator,

      o = {
        ie: 0,
        opera: 0,
        gecko: 0,
        webkit: 0,
        mobile: null,
        air: 0,
        caja: nav.cajaVersion,
        secure: false,
        os: null
      },

      ua = nav && nav.userAgent,
      loc = window.location,
      href = loc && loc.href,
      m;

    o.secure = href && (href.toLowerCase().indexOf("https") === 0);
    if (ua) {

      if ((/windows|win32/i).test(ua)) {
        o.os = 'windows';
      } else if ((/macintosh/i).test(ua)) {
        o.os = 'macintosh';
      }

      // Modern KHTML browsers should qualify as Safari X-Grade
      if ((/KHTML/).test(ua)) {
        o.webkit=1;
      }
      // Modern WebKit browsers are at least X-Grade
      m = ua.match(/AppleWebKit\/([^\s]*)/);
      if (m&&m[1]) {
        o.webkit = numberfy(m[1]);

        // Mobile browser check
        if (/ Mobile\//.test(ua)) {
          o.mobile = "Apple"; // iPhone or iPod Touch
        } else {
          m = ua.match(/NokiaN[^\/]*|Android \d\.\d|webOS\/\d\.\d/);
          if (m) {
            o.mobile = m[0]; // Nokia N-series, Android, webOS, ex: NokiaN95
          }
        }

        m = ua.match(/AdobeAIR\/([^\s]*)/);
        if (m) {
          o.air = m[0]; // Adobe AIR 1.0 or better
        }

      }

      if (!o.webkit) { // not webkit
        // @todo check Opera/8.01 (J2ME/MIDP; Opera Mini/2.0.4509/1316; fi; U; ssr)
        m = ua.match(/Opera[\s\/]([^\s]*)/);
        if (m&&m[1]) {
          o.opera = numberfy(m[1]);
          m = ua.match(/Opera Mini[^;]*/);
          if (m) {
            o.mobile = m[0]; // ex: Opera Mini/2.0.4509/1316
          }
        } else { // not opera or webkit
          m = ua.match(/MSIE\s([^;]*)/);
          if (m&&m[1]) {
            o.ie = numberfy(m[1]);
          } else { // not opera, webkit, or ie
            m = ua.match(/Gecko\/([^\s]*)/);
            if (m) {
              o.gecko = 1; // Gecko detected, look for revision
              m = ua.match(/rv:([^\s\)]*)/);
              if (m&&m[1]) {
                o.gecko = numberfy(m[1]);
              }
            }
          }
        }
      }
    }

    return o;
  }(),

  /*
   * 脚本装载之初，默认DomReady为false
   */
  domReady: false,

  /*
   * onDomReady
   * @param onReady 回调
   * @param config 配置项，包含requires:[]，成员为脚本地址
   */
  onDOMContentLoaded: function(onready,config) {
    var that = this;
    var Browser = that.UA;
    this.conf = {enableMozDOMReady:true};
    if ( config )
      for ( var p in config)
        this.conf[p] = config[p];

    var isReady = false;
    function doReady(){
      if( isReady ) return;
      isReady = true;
      that.domReady = isReady;
      onready();
    }
    /*IE*/
    if( Browser.ie ){
       if (self !== self.top) {
        document.onreadystatechange = function() {
          if (document.readyState == 'complete') {
            document.onreadystatechange = null;
            doReady();
          }
        };
       } else {
        (function(){
          if ( isReady ) return;
          try {
            document.documentElement.doScroll("left");
          } catch( error ) {
          // bugfix: IE下检测DomReady的setTimeout由0改为50，防止跳出"停止脚本"的提示
            setTimeout( arguments.callee, 50 );
            return;
          }
          doReady();
        })();

       }//else over

       window.attachEvent('onload',doReady);
    }
    /*Webkit*/
    else if (Browser.webkit && Browser.version < 525) {
        (function(){
         if( isReady ) return;
         if (/loaded|complete/.test(document.readyState))
           doReady();
         else
           setTimeout( arguments.callee, 10 );
        })();
        window.addEventListener('load',doReady,false);
    }
    /*FF Opera 高版webkit 其他*/
    else {
        if ( !Browser.ff || Browser.version != 2 || this.conf.enableMozDOMReady)
         document.addEventListener( "DOMContentLoaded", function(){
           document.removeEventListener( "DOMContentLoaded", arguments.callee, false );
           doReady();
         }, false );
        window.addEventListener('load',doReady,false);
    }

  }//DOMContentLoaded end

});

// 全局启动入口
S.onDOMContentLoaded(function() {
  for (var i = 0 ;i < S.DoQueue.length;i++) {
    var SD = S.DoQueue[i];
    S.run(SD.requires,SD.callback);
  }

});

// 全局导出
exports.Sandbox = S;

}(this));

/*
 * TODO LIST:
 *    1,封装CommonJS适配器
 *    2,NodeJS兼容
 *    3,补充测试用例
 */
