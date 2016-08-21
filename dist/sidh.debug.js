var sidh = (function () {

// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = typeof window === 'object';
// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  throw 'NO_DYNAMIC_EXECUTION was set, cannot eval';
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      assert(args.length == sig.length-1);
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      assert(sig.length == 1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [null,null,null,null,null,null,null,null],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 1*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-1)/1] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) { var success = enlargeMemory(); if (!success) { DYNAMICTOP = ret;  return 0; } }; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*(+4294967296))) : ((+((low>>>0)))+((+((high|0)))*(+4294967296)))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}



Module["Runtime"] = Runtime;



//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    abort('NO_DYNAMIC_EXECUTION was set, cannot eval - ccall/cwrap are not functional');
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if ((!opts || !opts.async) && typeof EmterpreterAsync === 'object') {
      assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling ccall');
    }
    if (opts && opts.async) assert(!returnType, 'async ccalls cannot return values');
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  // NO_DYNAMIC_EXECUTION is on, so we can't use the fast version of cwrap.
  // Fall back to returning a bound version of ccall.
  cwrap = function cwrap(ident, returnType, argTypes) {
    return function() {
      Runtime.warnOnce('NO_DYNAMIC_EXECUTION was set, '
                     + 'using slow cwrap implementation');
      return ccall(ident, returnType, argTypes, arguments);
    }
  }
})();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module["setValue"] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module["getValue"] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module["allocate"] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if ((typeof _sbrk !== 'undefined' && !_sbrk.called) || !runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module["getMemory"] = getMemory;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module["AsciiToString"] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

function UTF8ArrayToString(u8Array, idx) {
  var u0, u1, u2, u3, u4, u5;

  var str = '';
  while (1) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    u0 = u8Array[idx++];
    if (!u0) return str;
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    u1 = u8Array[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    u2 = u8Array[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u3 = u8Array[idx++] & 63;
      if ((u0 & 0xF8) == 0xF0) {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
      } else {
        u4 = u8Array[idx++] & 63;
        if ((u0 & 0xFC) == 0xF8) {
          u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
        } else {
          u5 = u8Array[idx++] & 63;
          u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
        }
      }
    }
    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}
Module["UTF8ToString"] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module["UTF16ToString"] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF16"] = stringToUTF16;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}
Module["lengthBytesUTF16"] = lengthBytesUTF16;

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module["UTF32ToString"] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF32"] = stringToUTF32;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}
Module["lengthBytesUTF32"] = lengthBytesUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module["stackTrace"] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
  if (x % 4096 > 0) {
    x += (4096 - (x % 4096));
  }
  return x;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk


function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}

function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 52443072;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 104900000;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec (and given that TOTAL_STACK=' + TOTAL_STACK + ')');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer;



buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);


// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module["addOnInit"] = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module["intArrayToString"] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[((buffer++)>>0)]=array[i];
  }
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module["removeRunDependency"] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;



// === Body ===

var ASM_CONSTS = [function() { { return Module.getRandomValue(); } },
 function() { { if (Module.getRandomValue === undefined) { try { var window_ = "object" === typeof window ? window : self, crypto_ = typeof window_.crypto !== "undefined" ? window_.crypto : window_.msCrypto, randomValuesStandard = function() { var buf = new Uint32Array(1); crypto_.getRandomValues(buf); return buf[0] >>> 0; }; randomValuesStandard(); Module.getRandomValue = randomValuesStandard; } catch (e) { try { var crypto = require('crypto'), randomValueNodeJS = function() { var buf = crypto.randomBytes(4); return (buf[0] << 24 | buf[1] << 16 | buf[2] << 8 | buf[3]) >>> 0; }; randomValueNodeJS(); Module.getRandomValue = randomValueNodeJS; } catch (e) { throw 'No secure random number generator found'; } } } } }];

function _emscripten_asm_const_0(code) {
 return ASM_CONSTS[code]();
}



STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 6032;
  /* global initializers */  __ATINIT__.push();
  

/* memory initializer */ allocate([83,73,68,72,112,55,53,49,0,0,0,0,0,3,0,0,128,1,0,0,239,2,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,175,238,168,120,248,73,133,150,236,227,118,204,247,19,26,155,149,218,118,232,235,214,103,152,78,8,72,87,178,92,4,181,98,133,102,220,186,151,159,144,18,14,28,247,65,213,229,111,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,116,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,123,1,0,0,239,0,0,0,235,142,138,135,159,84,104,201,62,110,199,124,63,161,177,89,169,109,135,190,110,125,134,233,132,128,116,37,203,69,80,43,86,104,198,173,123,249,9,41,225,192,113,31,84,93,254,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,233,51,226,204,245,70,3,75,213,172,227,108,8,70,38,99,147,118,52,183,74,209,97,86,51,241,241,154,68,32,138,165,164,111,109,197,64,47,172,185,243,227,160,143,0,30,86,142,201,34,184,93,109,9,174,108,232,131,62,173,164,183,253,131,23,98,56,4,217,122,49,177,210,6,190,246,137,63,162,63,201,188,70,255,54,141,156,66,233,56,122,2,130,62,0,0,213,65,179,191,32,214,224,18,48,52,137,112,115,234,142,15,0,139,91,59,236,235,153,90,253,247,105,158,172,127,108,35,197,254,12,189,243,126,20,15,141,90,50,128,13,149,213,142,26,114,63,191,80,31,145,30,141,55,168,223,33,116,58,22,106,14,1,218,67,176,49,195,183,131,88,117,90,145,21,94,235,86,141,89,95,111,35,182,126,78,205,141,191,59,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,49,201,220,37,35,237,118,211,38,29,108,86,223,225,217,237,174,25,185,148,203,174,118,197,70,214,164,170,90,120,211,112,119,138,40,48,14,97,203,158,59,2,89,134,119,211,155,66,55,242,109,242,156,230,213,140,35,249,185,23,142,173,163,224,96,81,82,45,254,69,225,93,114,237,89,232,188,213,248,162,9,244,143,171,1,10,150,239,6,239,128,29,47,0,0,148,120,104,160,38,146,71,145,187,64,186,246,245,186,198,187,166,60,254,44,18,41,181,21,163,152,232,0,79,117,18,125,233,69,151,65,200,160,235,118,222,234,179,223,108,240,148,10,155,47,235,46,219,110,154,57,235,158,4,156,18,197,2,227,182,212,81,57,18,146,88,195,93,197,28,237,135,82,68,21,90,181,154,240,81,243,202,26,42,8,109,164,39,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,209,97,2,0,0,0,0,0,85,128,229,80,210,115,155,165,225,16,190,208,147,53,6,203,187,108,7,93,203,92,81,246,32,94,223,237,71,7,136,102,171,212,191,166,72,82,81,186,157,120,220,221,13,240,142,59,42,30,126,82,161,37,251,184,29,243,253,132,198,102,165,182,29,250,186,245,25,166,19,2,210,149,44,23,65,173,88,161,25,183,238,229,39,164,132,3,199,125,80,117,249,27,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,88,64,173,157,68,70,48,35,42,69,150,166,97,1,1,219,142,253,227,114,20,148,54,94,6,231,162,130,32,254,11,244,81,135,79,144,168,204,50,73,129,252,231,30,31,95,115,31,24,142,4,193,128,77,79,162,197,7,182,205,60,56,108,181,144,156,95,115,123,212,29,68,42,200,106,106,44,237,115,86,75,41,50,17,38,5,201,6,53,31,15,131,173,65,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,176,238,168,120,248,73,133,150,236,227,118,204,247,19,26,155,149,218,118,232,235,214,103,152,78,8,72,87,178,92,4,181,98,133,102,220,186,151,159,144,18,14,28,247,65,213,229,40,140,37,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,173,73,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,131,102,108,92,55,228,177,39,85,208,36,79,63,191,151,119,105,46,78,92,172,178,183,157,200,86,105,7,210,57,180,164,76,233,199,18,117,108,146,247,16,226,229,188,36,91,45,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,249,132,131,130,138,113,205,237,20,122,66,212,191,53,59,115,56,207,215,148,207,41,130,248,214,42,124,12,153,108,197,99,199,34,66,143,126,168,88,184,245,234,37,181,198,201,84,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,175,238,168,120,248,73,133,150,236,227,118,204,247,19,26,155,149,218,118,232,235,214,103,152,78,8,72,87,178,92,4,181,98,133,102,220,186,151,159,144,18,14,28,247,65,213,229,111,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,176,238,168,120,248,73,133,150,236,227,118,204,247,19,26,155,149,218,118,232,235,214,103,152,78,8,72,87,178,92,4,181,98,133,102,220,186,151,159,144,18,14,28,247,65,213,229,111,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,88,64,173,157,68,70,48,35,42,69,150,166,97,1,1,219,142,253,227,114,20,148,54,94,6,231,162,130,32,254,11,244,81,135,79,144,168,204,50,73,129,252,231,30,31,95,115,31,24,142,4,193,128,77,79,162,197,7,182,205,60,56,108,181,144,156,95,115,123,212,29,68,42,200,106,106,44,237,115,86,75,41,50,17,38,5,201,6,53,31,15,131,173,65,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,8,0,0,0,8,0,0,0,8,0,0,0,8,0,0,0,9,0,0,0,10,0,0,0,9,0,0,0,12,0,0,0,11,0,0,0,11,0,0,0,12,0,0,0,12,0,0,0,13,0,0,0,14,0,0,0,15,0,0,0,16,0,0,0,16,0,0,0,16,0,0,0,16,0,0,0,16,0,0,0,17,0,0,0,17,0,0,0,17,0,0,0,17,0,0,0,17,0,0,0,19,0,0,0,19,0,0,0,17,0,0,0,18,0,0,0,19,0,0,0,20,0,0,0,21,0,0,0,22,0,0,0,21,0,0,0,23,0,0,0,22,0,0,0,24,0,0,0,24,0,0,0,25,0,0,0,25,0,0,0,27,0,0,0,27,0,0,0,27,0,0,0,28,0,0,0,30,0,0,0,30,0,0,0,31,0,0,0,32,0,0,0,32,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,32,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,36,0,0,0,34,0,0,0,35,0,0,0,34,0,0,0,35,0,0,0,38,0,0,0,37,0,0,0,38,0,0,0,38,0,0,0,39,0,0,0,38,0,0,0,41,0,0,0,39,0,0,0,43,0,0,0,38,0,0,0,41,0,0,0,42,0,0,0,43,0,0,0,43,0,0,0,40,0,0,0,41,0,0,0,42,0,0,0,43,0,0,0,44,0,0,0,45,0,0,0,46,0,0,0,47,0,0,0,48,0,0,0,49,0,0,0,50,0,0,0,48,0,0,0,49,0,0,0,53,0,0,0,51,0,0,0,51,0,0,0,51,0,0,0,53,0,0,0,55,0,0,0,56,0,0,0,55,0,0,0,56,0,0,0,58,0,0,0,58,0,0,0,58,0,0,0,59,0,0,0,61,0,0,0,61,0,0,0,63,0,0,0,63,0,0,0,64,0,0,0,64,0,0,0,64,0,0,0,65,0,0,0,65,0,0,0,65,0,0,0,64,0,0,0,64,0,0,0,65,0,0,0,65,0,0,0,65,0,0,0,66,0,0,0,67,0,0,0,65,0,0,0,66,0,0,0,65,0,0,0,68,0,0,0,66,0,0,0,65,0,0,0,66,0,0,0,65,0,0,0,66,0,0,0,67,0,0,0,65,0,0,0,66,0,0,0,67,0,0,0,68,0,0,0,69,0,0,0,70,0,0,0,71,0,0,0,72,0,0,0,71,0,0,0,72,0,0,0,71,0,0,0,76,0,0,0,71,0,0,0,76,0,0,0,72,0,0,0,71,0,0,0,76,0,0,0,71,0,0,0,73,0,0,0,72,0,0,0,76,0,0,0,76,0,0,0,73,0,0,0,73,0,0,0,72,0,0,0,76,0,0,0,76,0,0,0,75,0,0,0,76,0,0,0,76,0,0,0,75,0,0,0,81,0,0,0,81,0,0,0,83,0,0,0,81,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,5,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,8,0,0,0,8,0,0,0,8,0,0,0,9,0,0,0,9,0,0,0,9,0,0,0,9,0,0,0,9,0,0,0,12,0,0,0,12,0,0,0,12,0,0,0,12,0,0,0,12,0,0,0,12,0,0,0,12,0,0,0,13,0,0,0,14,0,0,0,14,0,0,0,15,0,0,0,16,0,0,0,16,0,0,0,16,0,0,0,16,0,0,0,17,0,0,0,16,0,0,0,19,0,0,0,17,0,0,0,19,0,0,0,19,0,0,0,19,0,0,0,20,0,0,0,21,0,0,0,22,0,0,0,22,0,0,0,22,0,0,0,22,0,0,0,22,0,0,0,22,0,0,0,22,0,0,0,24,0,0,0,22,0,0,0,22,0,0,0,24,0,0,0,24,0,0,0,26,0,0,0,27,0,0,0,27,0,0,0,28,0,0,0,28,0,0,0,28,0,0,0,30,0,0,0,28,0,0,0,28,0,0,0,28,0,0,0,29,0,0,0,28,0,0,0,28,0,0,0,28,0,0,0,29,0,0,0,29,0,0,0,30,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,34,0,0,0,35,0,0,0,37,0,0,0,37,0,0,0,37,0,0,0,38,0,0,0,38,0,0,0,38,0,0,0,37,0,0,0,38,0,0,0,38,0,0,0,38,0,0,0,38,0,0,0,38,0,0,0,39,0,0,0,38,0,0,0,44,0,0,0,43,0,0,0,44,0,0,0,39,0,0,0,40,0,0,0,41,0,0,0,43,0,0,0,43,0,0,0,43,0,0,0,45,0,0,0,46,0,0,0,46,0,0,0,46,0,0,0,47,0,0,0,48,0,0,0,48,0,0,0,49,0,0,0,49,0,0,0,50,0,0,0,51,0,0,0,51,0,0,0,49,0,0,0,49,0,0,0,50,0,0,0,51,0,0,0,50,0,0,0,51,0,0,0,50,0,0,0,50,0,0,0,51,0,0,0,50,0,0,0,51,0,0,0,51,0,0,0,51,0,0,0,53,0,0,0,55,0,0,0,55,0,0,0,55,0,0,0,56,0,0,0,56,0,0,0,56,0,0,0,56,0,0,0,56,0,0,0,57,0,0,0,58,0,0,0,61,0,0,0,61,0,0,0,61,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,64,0,0,0,65,0,0,0,66,0,0,0,65,0,0,0,66,0,0,0,66,0,0,0,66,0,0,0,65,0,0,0,66,0,0,0,66,0,0,0,66,0,0,0,66,0,0,0,66,0,0,0,68,0,0,0,71,0,0,0,66,0,0,0,66,0,0,0,68,0,0,0,67,0,0,0,71,0,0,0,66,0,0,0,66,0,0,0,68,0,0,0,67,0,0,0,71,0,0,0,66,0,0,0,66,0,0,0,68,0,0,0,68,0,0,0,71,0,0,0,70,0,0,0,70,0,0,0,72,0,0,0,72,0,0,0,76,0,0,0,75,0,0,0,75,0,0,0,78,0,0,0,78,0,0,0,78,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,81,0,0,0,81,0,0,0,81,0,0,0,82,0,0,0,83,0,0,0,84,0,0,0,85,0,0,0,86,0,0,0,86,0,0,0,86,0,0,0,86,0,0,0,86,0,0,0,86,0,0,0,88,0,0,0,86,0,0,0,90,0,0,0,86,0,0,0,92,0,0,0,87,0,0,0,86,0,0,0,89,0,0,0,86,0,0,0,92,0,0,0,87,0,0,0,86,0,0,0,87,0,0,0,86,0,0,0,91,0,0,0,89,0,0,0,89,0,0,0,90,0,0,0,90,0,0,0,92,0,0,0,92,0,0,0,92,0,0,0,93,0,0,0,93,0,0,0,93,0,0,0,95,0,0,0,95,0,0,0,95,0,0,0,95,0,0,0,95,0,0,0,95,0,0,0,95,0,0,0,95,0,0,0,0,3,0,0,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,123,32,114,101,116,117,114,110,32,77,111,100,117,108,101,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,40,41,59,32,125,0,123,32,105,102,32,40,77,111,100,117,108,101,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,32,61,61,61,32,117,110,100,101,102,105,110,101,100,41,32,123,32,116,114,121,32,123,32,118,97,114,32,119,105,110,100,111,119,95,32,61,32,34,111,98,106,101,99,116,34,32,61,61,61,32,116,121,112,101,111,102,32,119,105,110,100,111,119,32,63,32,119,105,110,100,111,119,32,58,32,115,101,108,102,44,32,99,114,121,112,116,111,95,32,61,32,116,121,112,101,111,102,32,119,105,110,100,111,119,95,46,99,114,121,112,116,111,32,33,61,61,32,34,117,110,100,101,102,105,110,101,100,34,32,63,32,119,105,110,100,111,119,95,46,99,114,121,112,116,111,32,58,32,119,105,110,100,111,119,95,46,109,115,67,114,121,112,116,111,44,32,114,97,110,100,111,109,86,97,108,117,101,115,83,116,97,110,100,97,114,100,32,61,32,102,117,110,99,116,105,111,110,40,41,32,123,32,118,97,114,32,98,117,102,32,61,32,110,101,119,32,85,105,110,116,51,50,65,114,114,97,121,40,49,41,59,32,99,114,121,112,116,111,95,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,115,40,98,117,102,41,59,32,114,101,116,117,114,110,32,98,117,102,91,48,93,32,62,62,62,32,48,59,32,125,59,32,114,97,110,100,111,109,86,97,108,117,101,115,83,116,97,110,100,97,114,100,40,41,59,32,77,111,100,117,108,101,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,32,61,32,114,97,110,100,111,109,86,97,108,117,101,115,83,116,97,110,100,97,114,100,59,32,125,32,99,97,116,99,104,32,40,101,41,32,123,32,116,114,121,32,123,32,118,97,114,32,99,114,121,112,116,111,32,61,32,114,101,113,117,105,114,101,40,39,99,114,121,112,116,111,39,41,44,32,114,97,110,100,111,109,86,97,108,117,101,78,111,100,101,74,83,32,61,32,102,117,110,99,116,105,111,110,40,41,32,123,32,118,97,114,32,98,117,102,32,61,32,99,114,121,112,116,111,46,114,97,110,100,111,109,66,121,116,101,115,40,52,41,59,32,114,101,116,117,114,110,32,40,98,117,102,91,48,93,32,60,60,32,50,52,32,124,32,98,117,102,91,49,93,32,60,60,32,49,54,32,124,32,98,117,102,91,50,93,32,60,60,32,56,32,124,32,98,117,102,91,51,93,41,32,62,62,62,32,48,59,32,125,59,32,114,97,110,100,111,109,86,97,108,117,101,78,111,100,101,74,83,40,41,59,32,77,111,100,117,108,101,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,32,61,32,114,97,110,100,111,109,86,97,108,117,101,78,111,100,101,74,83,59,32,125,32,99,97,116,99,104,32,40,101,41,32,123,32,116,104,114,111,119,32,39,78,111,32,115,101,99,117,114,101,32,114,97,110,100,111,109,32,110,117,109,98,101,114,32,103,101,110,101,114,97,116,111,114,32,102,111,117,110,100,39,59,32,125,32,125,32,125,32,125,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);





/* no memory initializer */
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success) return -1 >>> 0; // sbrk failure code
      }
      return ret;  // Previous break location.
    }

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      else Module.printErr('failed to set errno from JS');
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 85: return totalMemory / PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 79:
          return 0;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

   
  Module["_memset"] = _memset;

  var _emscripten_asm_const=true;

  var _emscripten_asm_const_int=true;

  function _abort() {
      Module['abort']();
    }

  
  var PATH=undefined;
  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        console.error('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      } else if (mode == 2 /*EM_TIMING_SETIMMEDIATE*/) {
        if (!window['setImmediate']) {
          // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
          var setImmediates = [];
          var emscriptenMainLoopMessageId = '__emcc';
          function Browser_setImmediate_messageHandler(event) {
            if (event.source === window && event.data === emscriptenMainLoopMessageId) {
              event.stopPropagation();
              setImmediates.shift()();
            }
          }
          window.addEventListener("message", Browser_setImmediate_messageHandler, true);
          window['setImmediate'] = function Browser_emulated_setImmediate(func) {
            setImmediates.push(func);
            window.postMessage(emscriptenMainLoopMessageId, "*");
          }
        }
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
          window['setImmediate'](Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'immediate';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
        else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
        Browser.mainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true /* do not set timing and call scheduler, we will do it on the next lines */);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
          Browser.mainLoop.scheduler();
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          assert(typeof url == 'string', 'createObjectURL must return a url as a string');
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            assert(typeof url == 'string', 'createObjectURL must return a url as a string');
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas, vrDevice) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        Browser.vrDevice = vrDevice;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        if (typeof Browser.vrDevice === 'undefined') Browser.vrDevice = null;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
  
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
  
        if (vrDevice) {
          canvasContainer.requestFullScreen({ vrDisplay: vrDevice });
        } else {
          canvasContainer.requestFullScreen();
        }
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },allowAsyncCallbacks:true,queuedAsyncCallbacks:[],pauseAsyncCallbacks:function () {
        Browser.allowAsyncCallbacks = false;
      },resumeAsyncCallbacks:function () { // marks future callbacks as ok to execute, and synchronously runs any remaining ones right now
        Browser.allowAsyncCallbacks = true;
        if (Browser.queuedAsyncCallbacks.length > 0) {
          var callbacks = Browser.queuedAsyncCallbacks;
          Browser.queuedAsyncCallbacks = [];
          callbacks.forEach(function(func) {
            func();
          });
        }
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } // drop it on the floor otherwise, next interval will kick in
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
          // If this assert lands, it's likely because the browser doesn't support scrollX or pageXOffset
          // and we have no viable fallback.
          assert((typeof scrollX !== 'undefined') && (typeof scrollY !== 'undefined'), 'Unable to retrieve scroll position, mouse positions likely broken.');
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              var last = Browser.touches[touch.identifier];
              if (!last) last = coords;
              Browser.lastTouches[touch.identifier] = last;
              Browser.touches[touch.identifier] = coords;
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function _pthread_self() {
      //FIXME: assumes only a single thread
      return 0;
    }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) { Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
  Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) { return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes) }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");



var debug_table_iiii = ["0", "jsCall_iiii_0", "jsCall_iiii_1", "jsCall_iiii_2", "jsCall_iiii_3", "jsCall_iiii_4", "jsCall_iiii_5", "jsCall_iiii_6", "jsCall_iiii_7", "0", "0", "0", "0", "0", "0", "0", "0", "0", "_Validate_PKB", "_Validate_PKA", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
var debug_table_iiiii = ["0", "jsCall_iiiii_0", "jsCall_iiiii_1", "jsCall_iiiii_2", "jsCall_iiiii_3", "jsCall_iiiii_4", "jsCall_iiiii_5", "jsCall_iiiii_6", "jsCall_iiiii_7", "0", "0", "0", "0", "0", "0", "0", "0", "0", "_SecretAgreement_A", "_SecretAgreement_B", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
var debug_table_iii = ["0", "jsCall_iii_0", "jsCall_iii_1", "jsCall_iii_2", "jsCall_iii_3", "jsCall_iii_4", "jsCall_iii_5", "jsCall_iii_6", "jsCall_iii_7", "0", "0", "0", "0", "0", "0", "0", "0", "0", "_sidhjs_randombytes", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer '" + x + "' called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("This pointer might make sense in another type signature: iii: " + debug_table_iii[x] + "  iiiii: " + debug_table_iiiii[x] + "  "); abort(x) }

function nullFunc_iiiii(x) { Module["printErr"]("Invalid function pointer '" + x + "' called with signature 'iiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("This pointer might make sense in another type signature: iiii: " + debug_table_iiii[x] + "  iii: " + debug_table_iii[x] + "  "); abort(x) }

function nullFunc_iii(x) { Module["printErr"]("Invalid function pointer '" + x + "' called with signature 'iii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("This pointer might make sense in another type signature: iiii: " + debug_table_iiii[x] + "  iiiii: " + debug_table_iiiii[x] + "  "); abort(x) }

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function jsCall_iiii(index,a1,a2,a3) {
    return Runtime.functionPointers[index](a1,a2,a3);
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function jsCall_iiiii(index,a1,a2,a3,a4) {
    return Runtime.functionPointers[index](a1,a2,a3,a4);
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function jsCall_iii(index,a1,a2) {
    return Runtime.functionPointers[index](a1,a2);
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "nullFunc_iiii": nullFunc_iiii, "nullFunc_iiiii": nullFunc_iiiii, "nullFunc_iii": nullFunc_iii, "invoke_iiii": invoke_iiii, "jsCall_iiii": jsCall_iiii, "invoke_iiiii": invoke_iiiii, "jsCall_iiiii": jsCall_iiiii, "invoke_iii": invoke_iii, "jsCall_iii": jsCall_iii, "_emscripten_set_main_loop": _emscripten_set_main_loop, "_pthread_self": _pthread_self, "_abort": _abort, "___setErrNo": ___setErrNo, "_sbrk": _sbrk, "_time": _time, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_sysconf": _sysconf, "_emscripten_asm_const_0": _emscripten_asm_const_0, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'almost asm';
  
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var nullFunc_iiii=env.nullFunc_iiii;
  var nullFunc_iiiii=env.nullFunc_iiiii;
  var nullFunc_iii=env.nullFunc_iii;
  var invoke_iiii=env.invoke_iiii;
  var jsCall_iiii=env.jsCall_iiii;
  var invoke_iiiii=env.invoke_iiiii;
  var jsCall_iiiii=env.jsCall_iiiii;
  var invoke_iii=env.invoke_iii;
  var jsCall_iii=env.jsCall_iii;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var _pthread_self=env._pthread_self;
  var _abort=env._abort;
  var ___setErrNo=env.___setErrNo;
  var _sbrk=env._sbrk;
  var _time=env._time;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _sysconf=env._sysconf;
  var _emscripten_asm_const_0=env._emscripten_asm_const_0;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
  STACKTOP = (STACKTOP + 15)&-16;
if ((STACKTOP|0) >= (STACK_MAX|0)) abort();

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}
function establishStackSpace(stackBase, stackMax) {
  stackBase = stackBase|0;
  stackMax = stackMax|0;
  STACKTOP = stackBase;
  STACK_MAX = stackMax;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}

function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _randombytes_random() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = _emscripten_asm_const_0(0)|0; //@line 70 "libsodium/src/libsodium/randombytes/randombytes.c"
 return ($0|0); //@line 70 "libsodium/src/libsodium/randombytes/randombytes.c"
}
function _randombytes_stir() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 _emscripten_asm_const_0(1); //@line 85 "libsodium/src/libsodium/randombytes/randombytes.c"
 return; //@line 113 "libsodium/src/libsodium/randombytes/randombytes.c"
}
function _randombytes_buf($buf,$size) {
 $buf = $buf|0;
 $size = $size|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, $p = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $buf;
 $1 = $size;
 $2 = $0; //@line 151 "libsodium/src/libsodium/randombytes/randombytes.c"
 $p = $2; //@line 151 "libsodium/src/libsodium/randombytes/randombytes.c"
 $i = 0; //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
 while(1) {
  $3 = $i; //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
  $4 = $1; //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
  $5 = ($3>>>0)<($4>>>0); //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
  if (!($5)) {
   break;
  }
  $6 = (_randombytes_random()|0); //@line 155 "libsodium/src/libsodium/randombytes/randombytes.c"
  $7 = $6&255; //@line 155 "libsodium/src/libsodium/randombytes/randombytes.c"
  $8 = $i; //@line 155 "libsodium/src/libsodium/randombytes/randombytes.c"
  $9 = $p; //@line 155 "libsodium/src/libsodium/randombytes/randombytes.c"
  $10 = (($9) + ($8)|0); //@line 155 "libsodium/src/libsodium/randombytes/randombytes.c"
  HEAP8[$10>>0] = $7; //@line 155 "libsodium/src/libsodium/randombytes/randombytes.c"
  $11 = $i; //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
  $12 = (($11) + 1)|0; //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
  $i = $12; //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
 }
 STACKTOP = sp;return; //@line 158 "libsodium/src/libsodium/randombytes/randombytes.c"
}
function _SIDH_curve_initialize($pCurveIsogeny,$RandomBytesFunction,$pCurveIsogenyData) {
 $pCurveIsogeny = $pCurveIsogeny|0;
 $RandomBytesFunction = $RandomBytesFunction|0;
 $pCurveIsogenyData = $pCurveIsogenyData|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0;
 var $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $i = 0, $owords = 0, $pwords = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $pCurveIsogeny;
 $2 = $RandomBytesFunction;
 $3 = $pCurveIsogenyData;
 $4 = $1; //@line 22 "SIDH_v1.0/SIDH_setup.c"
 $5 = (_is_CurveIsogenyStruct_null($4)|0); //@line 22 "SIDH_v1.0/SIDH_setup.c"
 if ($5) {
  $0 = 6; //@line 23 "SIDH_v1.0/SIDH_setup.c"
  $135 = $0; //@line 53 "SIDH_v1.0/SIDH_setup.c"
  STACKTOP = sp;return ($135|0); //@line 53 "SIDH_v1.0/SIDH_setup.c"
 }
 $i = 0; //@line 26 "SIDH_v1.0/SIDH_setup.c"
 while(1) {
  $6 = $i; //@line 26 "SIDH_v1.0/SIDH_setup.c"
  $7 = ($6>>>0)<(8); //@line 26 "SIDH_v1.0/SIDH_setup.c"
  if (!($7)) {
   break;
  }
  $8 = $i; //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $9 = $3; //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $10 = (($9) + ($8)|0); //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $11 = HEAP8[$10>>0]|0; //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $12 = $i; //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $13 = $1; //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $14 = (($13) + ($12)|0); //@line 27 "SIDH_v1.0/SIDH_setup.c"
  HEAP8[$14>>0] = $11; //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $15 = $i; //@line 26 "SIDH_v1.0/SIDH_setup.c"
  $16 = (($15) + 1)|0; //@line 26 "SIDH_v1.0/SIDH_setup.c"
  $i = $16; //@line 26 "SIDH_v1.0/SIDH_setup.c"
 }
 $17 = $3; //@line 29 "SIDH_v1.0/SIDH_setup.c"
 $18 = ((($17)) + 12|0); //@line 29 "SIDH_v1.0/SIDH_setup.c"
 $19 = HEAP32[$18>>2]|0; //@line 29 "SIDH_v1.0/SIDH_setup.c"
 $20 = $1; //@line 29 "SIDH_v1.0/SIDH_setup.c"
 $21 = ((($20)) + 12|0); //@line 29 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$21>>2] = $19; //@line 29 "SIDH_v1.0/SIDH_setup.c"
 $22 = $3; //@line 30 "SIDH_v1.0/SIDH_setup.c"
 $23 = ((($22)) + 16|0); //@line 30 "SIDH_v1.0/SIDH_setup.c"
 $24 = HEAP32[$23>>2]|0; //@line 30 "SIDH_v1.0/SIDH_setup.c"
 $25 = $1; //@line 30 "SIDH_v1.0/SIDH_setup.c"
 $26 = ((($25)) + 16|0); //@line 30 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$26>>2] = $24; //@line 30 "SIDH_v1.0/SIDH_setup.c"
 $27 = $3; //@line 31 "SIDH_v1.0/SIDH_setup.c"
 $28 = ((($27)) + 20|0); //@line 31 "SIDH_v1.0/SIDH_setup.c"
 $29 = HEAP32[$28>>2]|0; //@line 31 "SIDH_v1.0/SIDH_setup.c"
 $30 = $1; //@line 31 "SIDH_v1.0/SIDH_setup.c"
 $31 = ((($30)) + 20|0); //@line 31 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$31>>2] = $29; //@line 31 "SIDH_v1.0/SIDH_setup.c"
 $32 = $3; //@line 32 "SIDH_v1.0/SIDH_setup.c"
 $33 = ((($32)) + 600|0); //@line 32 "SIDH_v1.0/SIDH_setup.c"
 $34 = HEAP32[$33>>2]|0; //@line 32 "SIDH_v1.0/SIDH_setup.c"
 $35 = $1; //@line 32 "SIDH_v1.0/SIDH_setup.c"
 $36 = ((($35)) + 36|0); //@line 32 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$36>>2] = $34; //@line 32 "SIDH_v1.0/SIDH_setup.c"
 $37 = $3; //@line 33 "SIDH_v1.0/SIDH_setup.c"
 $38 = ((($37)) + 704|0); //@line 33 "SIDH_v1.0/SIDH_setup.c"
 $39 = HEAP32[$38>>2]|0; //@line 33 "SIDH_v1.0/SIDH_setup.c"
 $40 = $1; //@line 33 "SIDH_v1.0/SIDH_setup.c"
 $41 = ((($40)) + 44|0); //@line 33 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$41>>2] = $39; //@line 33 "SIDH_v1.0/SIDH_setup.c"
 $42 = $3; //@line 34 "SIDH_v1.0/SIDH_setup.c"
 $43 = ((($42)) + 708|0); //@line 34 "SIDH_v1.0/SIDH_setup.c"
 $44 = HEAP32[$43>>2]|0; //@line 34 "SIDH_v1.0/SIDH_setup.c"
 $45 = $1; //@line 34 "SIDH_v1.0/SIDH_setup.c"
 $46 = ((($45)) + 48|0); //@line 34 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$46>>2] = $44; //@line 34 "SIDH_v1.0/SIDH_setup.c"
 $47 = $3; //@line 35 "SIDH_v1.0/SIDH_setup.c"
 $48 = ((($47)) + 1576|0); //@line 35 "SIDH_v1.0/SIDH_setup.c"
 $49 = HEAP32[$48>>2]|0; //@line 35 "SIDH_v1.0/SIDH_setup.c"
 $50 = $1; //@line 35 "SIDH_v1.0/SIDH_setup.c"
 $51 = ((($50)) + 64|0); //@line 35 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$51>>2] = $49; //@line 35 "SIDH_v1.0/SIDH_setup.c"
 $52 = $2; //@line 36 "SIDH_v1.0/SIDH_setup.c"
 $53 = $1; //@line 36 "SIDH_v1.0/SIDH_setup.c"
 $54 = ((($53)) + 84|0); //@line 36 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$54>>2] = $52; //@line 36 "SIDH_v1.0/SIDH_setup.c"
 $55 = $1; //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $56 = ((($55)) + 12|0); //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $57 = HEAP32[$56>>2]|0; //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $58 = (($57) + 32)|0; //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $59 = (($58) - 1)|0; //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $60 = (($59>>>0) / 32)&-1; //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $pwords = $60; //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $61 = $1; //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $62 = ((($61)) + 16|0); //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $63 = HEAP32[$62>>2]|0; //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $64 = (($63) + 32)|0; //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $65 = (($64) - 1)|0; //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $66 = (($65>>>0) / 32)&-1; //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $owords = $66; //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $67 = $3; //@line 40 "SIDH_v1.0/SIDH_setup.c"
 $68 = ((($67)) + 24|0); //@line 40 "SIDH_v1.0/SIDH_setup.c"
 $69 = $1; //@line 40 "SIDH_v1.0/SIDH_setup.c"
 $70 = ((($69)) + 24|0); //@line 40 "SIDH_v1.0/SIDH_setup.c"
 $71 = HEAP32[$70>>2]|0; //@line 40 "SIDH_v1.0/SIDH_setup.c"
 $72 = $pwords; //@line 40 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($68,$71,$72); //@line 40 "SIDH_v1.0/SIDH_setup.c"
 $73 = $3; //@line 41 "SIDH_v1.0/SIDH_setup.c"
 $74 = ((($73)) + 216|0); //@line 41 "SIDH_v1.0/SIDH_setup.c"
 $75 = $1; //@line 41 "SIDH_v1.0/SIDH_setup.c"
 $76 = ((($75)) + 28|0); //@line 41 "SIDH_v1.0/SIDH_setup.c"
 $77 = HEAP32[$76>>2]|0; //@line 41 "SIDH_v1.0/SIDH_setup.c"
 $78 = $pwords; //@line 41 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($74,$77,$78); //@line 41 "SIDH_v1.0/SIDH_setup.c"
 $79 = $3; //@line 42 "SIDH_v1.0/SIDH_setup.c"
 $80 = ((($79)) + 408|0); //@line 42 "SIDH_v1.0/SIDH_setup.c"
 $81 = $1; //@line 42 "SIDH_v1.0/SIDH_setup.c"
 $82 = ((($81)) + 32|0); //@line 42 "SIDH_v1.0/SIDH_setup.c"
 $83 = HEAP32[$82>>2]|0; //@line 42 "SIDH_v1.0/SIDH_setup.c"
 $84 = $pwords; //@line 42 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($80,$83,$84); //@line 42 "SIDH_v1.0/SIDH_setup.c"
 $85 = $3; //@line 43 "SIDH_v1.0/SIDH_setup.c"
 $86 = ((($85)) + 608|0); //@line 43 "SIDH_v1.0/SIDH_setup.c"
 $87 = $1; //@line 43 "SIDH_v1.0/SIDH_setup.c"
 $88 = ((($87)) + 40|0); //@line 43 "SIDH_v1.0/SIDH_setup.c"
 $89 = HEAP32[$88>>2]|0; //@line 43 "SIDH_v1.0/SIDH_setup.c"
 $90 = $owords; //@line 43 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($86,$89,$90); //@line 43 "SIDH_v1.0/SIDH_setup.c"
 $91 = $3; //@line 44 "SIDH_v1.0/SIDH_setup.c"
 $92 = ((($91)) + 712|0); //@line 44 "SIDH_v1.0/SIDH_setup.c"
 $93 = $1; //@line 44 "SIDH_v1.0/SIDH_setup.c"
 $94 = ((($93)) + 52|0); //@line 44 "SIDH_v1.0/SIDH_setup.c"
 $95 = HEAP32[$94>>2]|0; //@line 44 "SIDH_v1.0/SIDH_setup.c"
 $96 = $owords; //@line 44 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($92,$95,$96); //@line 44 "SIDH_v1.0/SIDH_setup.c"
 $97 = $3; //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $98 = ((($97)) + 808|0); //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $99 = $1; //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $100 = ((($99)) + 56|0); //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $101 = HEAP32[$100>>2]|0; //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $102 = $pwords; //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $103 = $102<<1; //@line 45 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($98,$101,$103); //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $104 = $3; //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $105 = ((($104)) + 1192|0); //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $106 = $1; //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $107 = ((($106)) + 60|0); //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $108 = HEAP32[$107>>2]|0; //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $109 = $pwords; //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $110 = $109<<1; //@line 46 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($105,$108,$110); //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $111 = $3; //@line 47 "SIDH_v1.0/SIDH_setup.c"
 $112 = ((($111)) + 1584|0); //@line 47 "SIDH_v1.0/SIDH_setup.c"
 $113 = $1; //@line 47 "SIDH_v1.0/SIDH_setup.c"
 $114 = ((($113)) + 68|0); //@line 47 "SIDH_v1.0/SIDH_setup.c"
 $115 = HEAP32[$114>>2]|0; //@line 47 "SIDH_v1.0/SIDH_setup.c"
 $116 = $pwords; //@line 47 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($112,$115,$116); //@line 47 "SIDH_v1.0/SIDH_setup.c"
 $117 = $3; //@line 48 "SIDH_v1.0/SIDH_setup.c"
 $118 = ((($117)) + 1776|0); //@line 48 "SIDH_v1.0/SIDH_setup.c"
 $119 = $1; //@line 48 "SIDH_v1.0/SIDH_setup.c"
 $120 = ((($119)) + 72|0); //@line 48 "SIDH_v1.0/SIDH_setup.c"
 $121 = HEAP32[$120>>2]|0; //@line 48 "SIDH_v1.0/SIDH_setup.c"
 $122 = $pwords; //@line 48 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($118,$121,$122); //@line 48 "SIDH_v1.0/SIDH_setup.c"
 $123 = $3; //@line 49 "SIDH_v1.0/SIDH_setup.c"
 $124 = ((($123)) + 1968|0); //@line 49 "SIDH_v1.0/SIDH_setup.c"
 $125 = $1; //@line 49 "SIDH_v1.0/SIDH_setup.c"
 $126 = ((($125)) + 76|0); //@line 49 "SIDH_v1.0/SIDH_setup.c"
 $127 = HEAP32[$126>>2]|0; //@line 49 "SIDH_v1.0/SIDH_setup.c"
 $128 = $pwords; //@line 49 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($124,$127,$128); //@line 49 "SIDH_v1.0/SIDH_setup.c"
 $129 = $3; //@line 50 "SIDH_v1.0/SIDH_setup.c"
 $130 = ((($129)) + 2160|0); //@line 50 "SIDH_v1.0/SIDH_setup.c"
 $131 = $1; //@line 50 "SIDH_v1.0/SIDH_setup.c"
 $132 = ((($131)) + 80|0); //@line 50 "SIDH_v1.0/SIDH_setup.c"
 $133 = HEAP32[$132>>2]|0; //@line 50 "SIDH_v1.0/SIDH_setup.c"
 $134 = $pwords; //@line 50 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($130,$133,$134); //@line 50 "SIDH_v1.0/SIDH_setup.c"
 $0 = 0; //@line 52 "SIDH_v1.0/SIDH_setup.c"
 $135 = $0; //@line 53 "SIDH_v1.0/SIDH_setup.c"
 STACKTOP = sp;return ($135|0); //@line 53 "SIDH_v1.0/SIDH_setup.c"
}
function _is_CurveIsogenyStruct_null($pCurveIsogeny) {
 $pCurveIsogeny = $pCurveIsogeny|0;
 var $$expand_i1_val = 0, $$expand_i1_val2 = 0, $$pre_trunc = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = sp + 4|0;
 $1 = $pCurveIsogeny;
 $2 = $1; //@line 119 "SIDH_v1.0/SIDH_setup.c"
 $3 = ($2|0)==(0|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
 if (!($3)) {
  $4 = $1; //@line 119 "SIDH_v1.0/SIDH_setup.c"
  $5 = ((($4)) + 24|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
  $6 = HEAP32[$5>>2]|0; //@line 119 "SIDH_v1.0/SIDH_setup.c"
  $7 = ($6|0)==(0|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
  if (!($7)) {
   $8 = $1; //@line 119 "SIDH_v1.0/SIDH_setup.c"
   $9 = ((($8)) + 28|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
   $10 = HEAP32[$9>>2]|0; //@line 119 "SIDH_v1.0/SIDH_setup.c"
   $11 = ($10|0)==(0|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
   if (!($11)) {
    $12 = $1; //@line 119 "SIDH_v1.0/SIDH_setup.c"
    $13 = ((($12)) + 32|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
    $14 = HEAP32[$13>>2]|0; //@line 119 "SIDH_v1.0/SIDH_setup.c"
    $15 = ($14|0)==(0|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
    if (!($15)) {
     $16 = $1; //@line 119 "SIDH_v1.0/SIDH_setup.c"
     $17 = ((($16)) + 40|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
     $18 = HEAP32[$17>>2]|0; //@line 119 "SIDH_v1.0/SIDH_setup.c"
     $19 = ($18|0)==(0|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
     if (!($19)) {
      $20 = $1; //@line 119 "SIDH_v1.0/SIDH_setup.c"
      $21 = ((($20)) + 52|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
      $22 = HEAP32[$21>>2]|0; //@line 119 "SIDH_v1.0/SIDH_setup.c"
      $23 = ($22|0)==(0|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
      if (!($23)) {
       $24 = $1; //@line 120 "SIDH_v1.0/SIDH_setup.c"
       $25 = ((($24)) + 56|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
       $26 = HEAP32[$25>>2]|0; //@line 120 "SIDH_v1.0/SIDH_setup.c"
       $27 = ($26|0)==(0|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
       if (!($27)) {
        $28 = $1; //@line 120 "SIDH_v1.0/SIDH_setup.c"
        $29 = ((($28)) + 60|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
        $30 = HEAP32[$29>>2]|0; //@line 120 "SIDH_v1.0/SIDH_setup.c"
        $31 = ($30|0)==(0|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
        if (!($31)) {
         $32 = $1; //@line 120 "SIDH_v1.0/SIDH_setup.c"
         $33 = ((($32)) + 68|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
         $34 = HEAP32[$33>>2]|0; //@line 120 "SIDH_v1.0/SIDH_setup.c"
         $35 = ($34|0)==(0|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
         if (!($35)) {
          $36 = $1; //@line 120 "SIDH_v1.0/SIDH_setup.c"
          $37 = ((($36)) + 72|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
          $38 = HEAP32[$37>>2]|0; //@line 120 "SIDH_v1.0/SIDH_setup.c"
          $39 = ($38|0)==(0|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
          if (!($39)) {
           $40 = $1; //@line 120 "SIDH_v1.0/SIDH_setup.c"
           $41 = ((($40)) + 76|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
           $42 = HEAP32[$41>>2]|0; //@line 120 "SIDH_v1.0/SIDH_setup.c"
           $43 = ($42|0)==(0|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
           if (!($43)) {
            $44 = $1; //@line 121 "SIDH_v1.0/SIDH_setup.c"
            $45 = ((($44)) + 80|0); //@line 121 "SIDH_v1.0/SIDH_setup.c"
            $46 = HEAP32[$45>>2]|0; //@line 121 "SIDH_v1.0/SIDH_setup.c"
            $47 = ($46|0)==(0|0); //@line 121 "SIDH_v1.0/SIDH_setup.c"
            if (!($47)) {
             $$expand_i1_val2 = 0; //@line 125 "SIDH_v1.0/SIDH_setup.c"
             HEAP8[$0>>0] = $$expand_i1_val2; //@line 125 "SIDH_v1.0/SIDH_setup.c"
             $$pre_trunc = HEAP8[$0>>0]|0; //@line 126 "SIDH_v1.0/SIDH_setup.c"
             $48 = $$pre_trunc&1; //@line 126 "SIDH_v1.0/SIDH_setup.c"
             STACKTOP = sp;return ($48|0); //@line 126 "SIDH_v1.0/SIDH_setup.c"
            }
           }
          }
         }
        }
       }
      }
     }
    }
   }
  }
 }
 $$expand_i1_val = 1; //@line 123 "SIDH_v1.0/SIDH_setup.c"
 HEAP8[$0>>0] = $$expand_i1_val; //@line 123 "SIDH_v1.0/SIDH_setup.c"
 $$pre_trunc = HEAP8[$0>>0]|0; //@line 126 "SIDH_v1.0/SIDH_setup.c"
 $48 = $$pre_trunc&1; //@line 126 "SIDH_v1.0/SIDH_setup.c"
 STACKTOP = sp;return ($48|0); //@line 126 "SIDH_v1.0/SIDH_setup.c"
}
function _SIDH_curve_allocate($CurveData) {
 $CurveData = $CurveData|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $obytes = 0, $pCurveIsogeny = 0, $pbytes = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $CurveData;
 $2 = $1; //@line 59 "SIDH_v1.0/SIDH_setup.c"
 $3 = ((($2)) + 12|0); //@line 59 "SIDH_v1.0/SIDH_setup.c"
 $4 = HEAP32[$3>>2]|0; //@line 59 "SIDH_v1.0/SIDH_setup.c"
 $5 = (($4) + 7)|0; //@line 59 "SIDH_v1.0/SIDH_setup.c"
 $6 = (($5>>>0) / 8)&-1; //@line 59 "SIDH_v1.0/SIDH_setup.c"
 $pbytes = $6; //@line 59 "SIDH_v1.0/SIDH_setup.c"
 $7 = $1; //@line 60 "SIDH_v1.0/SIDH_setup.c"
 $8 = ((($7)) + 16|0); //@line 60 "SIDH_v1.0/SIDH_setup.c"
 $9 = HEAP32[$8>>2]|0; //@line 60 "SIDH_v1.0/SIDH_setup.c"
 $10 = (($9) + 7)|0; //@line 60 "SIDH_v1.0/SIDH_setup.c"
 $11 = (($10>>>0) / 8)&-1; //@line 60 "SIDH_v1.0/SIDH_setup.c"
 $obytes = $11; //@line 60 "SIDH_v1.0/SIDH_setup.c"
 $pCurveIsogeny = 0; //@line 61 "SIDH_v1.0/SIDH_setup.c"
 $12 = (_calloc(1,88)|0); //@line 63 "SIDH_v1.0/SIDH_setup.c"
 $pCurveIsogeny = $12; //@line 63 "SIDH_v1.0/SIDH_setup.c"
 $13 = $pbytes; //@line 64 "SIDH_v1.0/SIDH_setup.c"
 $14 = (_calloc(1,$13)|0); //@line 64 "SIDH_v1.0/SIDH_setup.c"
 $15 = $pCurveIsogeny; //@line 64 "SIDH_v1.0/SIDH_setup.c"
 $16 = ((($15)) + 24|0); //@line 64 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$16>>2] = $14; //@line 64 "SIDH_v1.0/SIDH_setup.c"
 $17 = $pbytes; //@line 65 "SIDH_v1.0/SIDH_setup.c"
 $18 = (_calloc(1,$17)|0); //@line 65 "SIDH_v1.0/SIDH_setup.c"
 $19 = $pCurveIsogeny; //@line 65 "SIDH_v1.0/SIDH_setup.c"
 $20 = ((($19)) + 28|0); //@line 65 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$20>>2] = $18; //@line 65 "SIDH_v1.0/SIDH_setup.c"
 $21 = $pbytes; //@line 66 "SIDH_v1.0/SIDH_setup.c"
 $22 = (_calloc(1,$21)|0); //@line 66 "SIDH_v1.0/SIDH_setup.c"
 $23 = $pCurveIsogeny; //@line 66 "SIDH_v1.0/SIDH_setup.c"
 $24 = ((($23)) + 32|0); //@line 66 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$24>>2] = $22; //@line 66 "SIDH_v1.0/SIDH_setup.c"
 $25 = $obytes; //@line 67 "SIDH_v1.0/SIDH_setup.c"
 $26 = (_calloc(1,$25)|0); //@line 67 "SIDH_v1.0/SIDH_setup.c"
 $27 = $pCurveIsogeny; //@line 67 "SIDH_v1.0/SIDH_setup.c"
 $28 = ((($27)) + 40|0); //@line 67 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$28>>2] = $26; //@line 67 "SIDH_v1.0/SIDH_setup.c"
 $29 = $obytes; //@line 68 "SIDH_v1.0/SIDH_setup.c"
 $30 = (_calloc(1,$29)|0); //@line 68 "SIDH_v1.0/SIDH_setup.c"
 $31 = $pCurveIsogeny; //@line 68 "SIDH_v1.0/SIDH_setup.c"
 $32 = ((($31)) + 52|0); //@line 68 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$32>>2] = $30; //@line 68 "SIDH_v1.0/SIDH_setup.c"
 $33 = $pbytes; //@line 69 "SIDH_v1.0/SIDH_setup.c"
 $34 = $33<<1; //@line 69 "SIDH_v1.0/SIDH_setup.c"
 $35 = (_calloc(1,$34)|0); //@line 69 "SIDH_v1.0/SIDH_setup.c"
 $36 = $pCurveIsogeny; //@line 69 "SIDH_v1.0/SIDH_setup.c"
 $37 = ((($36)) + 56|0); //@line 69 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$37>>2] = $35; //@line 69 "SIDH_v1.0/SIDH_setup.c"
 $38 = $pbytes; //@line 70 "SIDH_v1.0/SIDH_setup.c"
 $39 = $38<<1; //@line 70 "SIDH_v1.0/SIDH_setup.c"
 $40 = (_calloc(1,$39)|0); //@line 70 "SIDH_v1.0/SIDH_setup.c"
 $41 = $pCurveIsogeny; //@line 70 "SIDH_v1.0/SIDH_setup.c"
 $42 = ((($41)) + 60|0); //@line 70 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$42>>2] = $40; //@line 70 "SIDH_v1.0/SIDH_setup.c"
 $43 = $pbytes; //@line 71 "SIDH_v1.0/SIDH_setup.c"
 $44 = (_calloc(1,$43)|0); //@line 71 "SIDH_v1.0/SIDH_setup.c"
 $45 = $pCurveIsogeny; //@line 71 "SIDH_v1.0/SIDH_setup.c"
 $46 = ((($45)) + 68|0); //@line 71 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$46>>2] = $44; //@line 71 "SIDH_v1.0/SIDH_setup.c"
 $47 = $pbytes; //@line 72 "SIDH_v1.0/SIDH_setup.c"
 $48 = (_calloc(1,$47)|0); //@line 72 "SIDH_v1.0/SIDH_setup.c"
 $49 = $pCurveIsogeny; //@line 72 "SIDH_v1.0/SIDH_setup.c"
 $50 = ((($49)) + 72|0); //@line 72 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$50>>2] = $48; //@line 72 "SIDH_v1.0/SIDH_setup.c"
 $51 = $pbytes; //@line 73 "SIDH_v1.0/SIDH_setup.c"
 $52 = (_calloc(1,$51)|0); //@line 73 "SIDH_v1.0/SIDH_setup.c"
 $53 = $pCurveIsogeny; //@line 73 "SIDH_v1.0/SIDH_setup.c"
 $54 = ((($53)) + 76|0); //@line 73 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$54>>2] = $52; //@line 73 "SIDH_v1.0/SIDH_setup.c"
 $55 = $pbytes; //@line 74 "SIDH_v1.0/SIDH_setup.c"
 $56 = (_calloc(1,$55)|0); //@line 74 "SIDH_v1.0/SIDH_setup.c"
 $57 = $pCurveIsogeny; //@line 74 "SIDH_v1.0/SIDH_setup.c"
 $58 = ((($57)) + 80|0); //@line 74 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$58>>2] = $56; //@line 74 "SIDH_v1.0/SIDH_setup.c"
 $59 = $pCurveIsogeny; //@line 76 "SIDH_v1.0/SIDH_setup.c"
 $60 = (_is_CurveIsogenyStruct_null($59)|0); //@line 76 "SIDH_v1.0/SIDH_setup.c"
 if ($60) {
  $0 = 0; //@line 77 "SIDH_v1.0/SIDH_setup.c"
  $62 = $0; //@line 80 "SIDH_v1.0/SIDH_setup.c"
  STACKTOP = sp;return ($62|0); //@line 80 "SIDH_v1.0/SIDH_setup.c"
 } else {
  $61 = $pCurveIsogeny; //@line 79 "SIDH_v1.0/SIDH_setup.c"
  $0 = $61; //@line 79 "SIDH_v1.0/SIDH_setup.c"
  $62 = $0; //@line 80 "SIDH_v1.0/SIDH_setup.c"
  STACKTOP = sp;return ($62|0); //@line 80 "SIDH_v1.0/SIDH_setup.c"
 }
 return (0)|0;
}
function _random_mod_order($random_digits,$AliceOrBob,$pCurveIsogeny) {
 $random_digits = $random_digits|0;
 $AliceOrBob = $AliceOrBob|0;
 $pCurveIsogeny = $pCurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $9 = 0, $Status = 0, $mask = 0, $nbytes = 0, $ntry = 0, $nwords = 0, $or$cond = 0, $order2 = 0, $t1 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 144|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t1 = sp + 56|0;
 $order2 = sp + 8|0;
 $1 = $random_digits;
 $2 = $AliceOrBob;
 $3 = $pCurveIsogeny;
 $ntry = 0; //@line 165 "SIDH_v1.0/SIDH_setup.c"
 dest=$t1; stop=dest+48|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0)); //@line 166 "SIDH_v1.0/SIDH_setup.c"
 dest=$order2; stop=dest+48|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0)); //@line 166 "SIDH_v1.0/SIDH_setup.c"
 $Status = 3; //@line 168 "SIDH_v1.0/SIDH_setup.c"
 $4 = $1; //@line 170 "SIDH_v1.0/SIDH_setup.c"
 $5 = ($4|0)==(0|0); //@line 170 "SIDH_v1.0/SIDH_setup.c"
 if (!($5)) {
  $6 = $3; //@line 170 "SIDH_v1.0/SIDH_setup.c"
  $7 = (_is_CurveIsogenyStruct_null($6)|0); //@line 170 "SIDH_v1.0/SIDH_setup.c"
  $8 = $2;
  $9 = ($8>>>0)>(1); //@line 170 "SIDH_v1.0/SIDH_setup.c"
  $or$cond = $7 | $9; //@line 170 "SIDH_v1.0/SIDH_setup.c"
  if (!($or$cond)) {
   $10 = $1; //@line 174 "SIDH_v1.0/SIDH_setup.c"
   _clear_words($10,12); //@line 174 "SIDH_v1.0/SIDH_setup.c"
   HEAP32[$t1>>2] = 2; //@line 175 "SIDH_v1.0/SIDH_setup.c"
   $11 = $2; //@line 176 "SIDH_v1.0/SIDH_setup.c"
   $12 = ($11|0)==(0); //@line 176 "SIDH_v1.0/SIDH_setup.c"
   $13 = $3; //@line 177 "SIDH_v1.0/SIDH_setup.c"
   if ($12) {
    $14 = ((($13)) + 36|0); //@line 177 "SIDH_v1.0/SIDH_setup.c"
    $15 = HEAP32[$14>>2]|0; //@line 177 "SIDH_v1.0/SIDH_setup.c"
    $16 = (($15) + 7)|0; //@line 177 "SIDH_v1.0/SIDH_setup.c"
    $17 = (($16>>>0) / 8)&-1; //@line 177 "SIDH_v1.0/SIDH_setup.c"
    $nbytes = $17; //@line 177 "SIDH_v1.0/SIDH_setup.c"
    $18 = $3; //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $19 = ((($18)) + 36|0); //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $20 = HEAP32[$19>>2]|0; //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $21 = (($20) + 32)|0; //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $22 = (($21) - 1)|0; //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $23 = (($22>>>0) / 32)&-1; //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $nwords = $23; //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $mask = 7; //@line 179 "SIDH_v1.0/SIDH_setup.c"
    $24 = $3; //@line 180 "SIDH_v1.0/SIDH_setup.c"
    $25 = ((($24)) + 40|0); //@line 180 "SIDH_v1.0/SIDH_setup.c"
    $26 = HEAP32[$25>>2]|0; //@line 180 "SIDH_v1.0/SIDH_setup.c"
    $27 = $nwords; //@line 180 "SIDH_v1.0/SIDH_setup.c"
    _copy_words($26,$order2,$27); //@line 180 "SIDH_v1.0/SIDH_setup.c"
    $28 = $nwords; //@line 181 "SIDH_v1.0/SIDH_setup.c"
    _mp_shiftr1($order2,$28); //@line 181 "SIDH_v1.0/SIDH_setup.c"
    $29 = $nwords; //@line 182 "SIDH_v1.0/SIDH_setup.c"
    (_mp_sub($order2,$t1,$order2,$29)|0); //@line 182 "SIDH_v1.0/SIDH_setup.c"
   } else {
    $30 = ((($13)) + 44|0); //@line 184 "SIDH_v1.0/SIDH_setup.c"
    $31 = HEAP32[$30>>2]|0; //@line 184 "SIDH_v1.0/SIDH_setup.c"
    $32 = (($31) + 7)|0; //@line 184 "SIDH_v1.0/SIDH_setup.c"
    $33 = (($32>>>0) / 8)&-1; //@line 184 "SIDH_v1.0/SIDH_setup.c"
    $nbytes = $33; //@line 184 "SIDH_v1.0/SIDH_setup.c"
    $34 = $3; //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $35 = ((($34)) + 44|0); //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $36 = HEAP32[$35>>2]|0; //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $37 = (($36) + 32)|0; //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $38 = (($37) - 1)|0; //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $39 = (($38>>>0) / 32)&-1; //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $nwords = $39; //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $mask = 3; //@line 186 "SIDH_v1.0/SIDH_setup.c"
    $40 = $nwords; //@line 187 "SIDH_v1.0/SIDH_setup.c"
    (_mp_sub(2360,$t1,$order2,$40)|0); //@line 187 "SIDH_v1.0/SIDH_setup.c"
   }
   while(1) {
    $41 = $ntry; //@line 191 "SIDH_v1.0/SIDH_setup.c"
    $42 = (($41) + 1)|0; //@line 191 "SIDH_v1.0/SIDH_setup.c"
    $ntry = $42; //@line 191 "SIDH_v1.0/SIDH_setup.c"
    $43 = $ntry; //@line 192 "SIDH_v1.0/SIDH_setup.c"
    $44 = ($43>>>0)>(100); //@line 192 "SIDH_v1.0/SIDH_setup.c"
    if ($44) {
     label = 8;
     break;
    }
    $45 = $3; //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $46 = ((($45)) + 84|0); //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $47 = HEAP32[$46>>2]|0; //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $48 = $nbytes; //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $49 = $1; //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $50 = (FUNCTION_TABLE_iii[$47 & 31]($48,$49)|0); //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $Status = $50; //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $51 = $Status; //@line 196 "SIDH_v1.0/SIDH_setup.c"
    $52 = ($51|0)!=(0); //@line 196 "SIDH_v1.0/SIDH_setup.c"
    if ($52) {
     label = 10;
     break;
    }
    $54 = $mask; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $55 = $54&255; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $56 = $nbytes; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $57 = (($56) - 1)|0; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $58 = $1; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $59 = (($58) + ($57)|0); //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $60 = HEAP8[$59>>0]|0; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $61 = $60&255; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $62 = $61 & $55; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $63 = $62&255; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    HEAP8[$59>>0] = $63; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $64 = $1; //@line 200 "SIDH_v1.0/SIDH_setup.c"
    $65 = $nwords; //@line 200 "SIDH_v1.0/SIDH_setup.c"
    $66 = (_mp_sub($order2,$64,$t1,$65)|0); //@line 200 "SIDH_v1.0/SIDH_setup.c"
    $67 = ($66|0)==(1); //@line 200 "SIDH_v1.0/SIDH_setup.c"
    if (!($67)) {
     label = 12;
     break;
    }
   }
   if ((label|0) == 8) {
    $0 = 9; //@line 193 "SIDH_v1.0/SIDH_setup.c"
    $81 = $0; //@line 212 "SIDH_v1.0/SIDH_setup.c"
    STACKTOP = sp;return ($81|0); //@line 212 "SIDH_v1.0/SIDH_setup.c"
   }
   else if ((label|0) == 10) {
    $53 = $Status; //@line 197 "SIDH_v1.0/SIDH_setup.c"
    $0 = $53; //@line 197 "SIDH_v1.0/SIDH_setup.c"
    $81 = $0; //@line 212 "SIDH_v1.0/SIDH_setup.c"
    STACKTOP = sp;return ($81|0); //@line 212 "SIDH_v1.0/SIDH_setup.c"
   }
   else if ((label|0) == 12) {
    _clear_words($t1,12); //@line 202 "SIDH_v1.0/SIDH_setup.c"
    HEAP32[$t1>>2] = 1; //@line 203 "SIDH_v1.0/SIDH_setup.c"
    $68 = $1; //@line 204 "SIDH_v1.0/SIDH_setup.c"
    $69 = $1; //@line 204 "SIDH_v1.0/SIDH_setup.c"
    $70 = $nwords; //@line 204 "SIDH_v1.0/SIDH_setup.c"
    (_mp_add($68,$t1,$69,$70)|0); //@line 204 "SIDH_v1.0/SIDH_setup.c"
    $71 = $1; //@line 205 "SIDH_v1.0/SIDH_setup.c"
    $72 = $nwords; //@line 205 "SIDH_v1.0/SIDH_setup.c"
    _copy_words($71,$t1,$72); //@line 205 "SIDH_v1.0/SIDH_setup.c"
    $73 = $1; //@line 206 "SIDH_v1.0/SIDH_setup.c"
    $74 = $nwords; //@line 206 "SIDH_v1.0/SIDH_setup.c"
    _mp_shiftl1($73,$74); //@line 206 "SIDH_v1.0/SIDH_setup.c"
    $75 = $2; //@line 207 "SIDH_v1.0/SIDH_setup.c"
    $76 = ($75|0)==(1); //@line 207 "SIDH_v1.0/SIDH_setup.c"
    if ($76) {
     $77 = $1; //@line 208 "SIDH_v1.0/SIDH_setup.c"
     $78 = $1; //@line 208 "SIDH_v1.0/SIDH_setup.c"
     $79 = $nwords; //@line 208 "SIDH_v1.0/SIDH_setup.c"
     (_mp_add($77,$t1,$78,$79)|0); //@line 208 "SIDH_v1.0/SIDH_setup.c"
    }
    $80 = $Status; //@line 211 "SIDH_v1.0/SIDH_setup.c"
    $0 = $80; //@line 211 "SIDH_v1.0/SIDH_setup.c"
    $81 = $0; //@line 212 "SIDH_v1.0/SIDH_setup.c"
    STACKTOP = sp;return ($81|0); //@line 212 "SIDH_v1.0/SIDH_setup.c"
   }
  }
 }
 $0 = 6; //@line 171 "SIDH_v1.0/SIDH_setup.c"
 $81 = $0; //@line 212 "SIDH_v1.0/SIDH_setup.c"
 STACKTOP = sp;return ($81|0); //@line 212 "SIDH_v1.0/SIDH_setup.c"
}
function _clear_words($mem,$nwords) {
 $mem = $mem|0;
 $nwords = $nwords|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, $v = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mem;
 $1 = $nwords;
 $2 = $0; //@line 262 "SIDH_v1.0/SIDH_setup.c"
 $v = $2; //@line 262 "SIDH_v1.0/SIDH_setup.c"
 $i = 0; //@line 264 "SIDH_v1.0/SIDH_setup.c"
 while(1) {
  $3 = $i; //@line 264 "SIDH_v1.0/SIDH_setup.c"
  $4 = $1; //@line 264 "SIDH_v1.0/SIDH_setup.c"
  $5 = ($3>>>0)<($4>>>0); //@line 264 "SIDH_v1.0/SIDH_setup.c"
  if (!($5)) {
   break;
  }
  $6 = $i; //@line 265 "SIDH_v1.0/SIDH_setup.c"
  $7 = $v; //@line 265 "SIDH_v1.0/SIDH_setup.c"
  $8 = (($7) + ($6<<2)|0); //@line 265 "SIDH_v1.0/SIDH_setup.c"
  HEAP32[$8>>2] = 0; //@line 265 "SIDH_v1.0/SIDH_setup.c"
  $9 = $i; //@line 264 "SIDH_v1.0/SIDH_setup.c"
  $10 = (($9) + 1)|0; //@line 264 "SIDH_v1.0/SIDH_setup.c"
  $i = $10; //@line 264 "SIDH_v1.0/SIDH_setup.c"
 }
 STACKTOP = sp;return; //@line 267 "SIDH_v1.0/SIDH_setup.c"
}
function _j_inv($A,$C,$jinv) {
 $A = $A|0;
 $C = $C|0;
 $jinv = $jinv|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $t0 = 0, $t1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 400|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 192|0;
 $t1 = sp;
 $0 = $A;
 $1 = $C;
 $2 = $jinv;
 $3 = $0; //@line 21 "SIDH_v1.0/ec_isogeny.c"
 $4 = $2; //@line 21 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($3,$4); //@line 21 "SIDH_v1.0/ec_isogeny.c"
 $5 = $1; //@line 22 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($5,$t1); //@line 22 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t1,$t1,$t0); //@line 23 "SIDH_v1.0/ec_isogeny.c"
 $6 = $2; //@line 24 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($6,$t0,$t0); //@line 24 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t0,$t1,$t0); //@line 25 "SIDH_v1.0/ec_isogeny.c"
 $7 = $2; //@line 26 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t0,$t1,$7); //@line 26 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t1,$t1); //@line 27 "SIDH_v1.0/ec_isogeny.c"
 $8 = $2; //@line 28 "SIDH_v1.0/ec_isogeny.c"
 $9 = $2; //@line 28 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($8,$t1,$9); //@line 28 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t0,$t0,$t0); //@line 29 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t0,$t0,$t0); //@line 30 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t0,$t1); //@line 31 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t0,$t1,$t0); //@line 32 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t0,$t0,$t0); //@line 33 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t0,$t0,$t0); //@line 34 "SIDH_v1.0/ec_isogeny.c"
 $10 = $2; //@line 35 "SIDH_v1.0/ec_isogeny.c"
 _fp2inv751_mont($10); //@line 35 "SIDH_v1.0/ec_isogeny.c"
 $11 = $2; //@line 36 "SIDH_v1.0/ec_isogeny.c"
 $12 = $2; //@line 36 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($11,$t0,$12); //@line 36 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 37 "SIDH_v1.0/ec_isogeny.c"
}
function _xDBLADD($P,$Q,$xPQ,$A24) {
 $P = $P|0;
 $Q = $Q|0;
 $xPQ = $xPQ|0;
 $A24 = $A24|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $t0 = 0, $t1 = 0, $t2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 592|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 384|0;
 $t1 = sp + 192|0;
 $t2 = sp;
 $0 = $P;
 $1 = $Q;
 $2 = $xPQ;
 $3 = $A24;
 $4 = $0; //@line 46 "SIDH_v1.0/ec_isogeny.c"
 $5 = $0; //@line 46 "SIDH_v1.0/ec_isogeny.c"
 $6 = ((($5)) + 192|0); //@line 46 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($4,$6,$t0); //@line 46 "SIDH_v1.0/ec_isogeny.c"
 $7 = $0; //@line 47 "SIDH_v1.0/ec_isogeny.c"
 $8 = $0; //@line 47 "SIDH_v1.0/ec_isogeny.c"
 $9 = ((($8)) + 192|0); //@line 47 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($7,$9,$t1); //@line 47 "SIDH_v1.0/ec_isogeny.c"
 $10 = $0; //@line 48 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t0,$10); //@line 48 "SIDH_v1.0/ec_isogeny.c"
 $11 = $1; //@line 49 "SIDH_v1.0/ec_isogeny.c"
 $12 = $1; //@line 49 "SIDH_v1.0/ec_isogeny.c"
 $13 = ((($12)) + 192|0); //@line 49 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($11,$13,$t2); //@line 49 "SIDH_v1.0/ec_isogeny.c"
 $14 = $1; //@line 50 "SIDH_v1.0/ec_isogeny.c"
 $15 = $1; //@line 50 "SIDH_v1.0/ec_isogeny.c"
 $16 = ((($15)) + 192|0); //@line 50 "SIDH_v1.0/ec_isogeny.c"
 $17 = $1; //@line 50 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($14,$16,$17); //@line 50 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t0,$t2,$t0); //@line 51 "SIDH_v1.0/ec_isogeny.c"
 $18 = $0; //@line 52 "SIDH_v1.0/ec_isogeny.c"
 $19 = ((($18)) + 192|0); //@line 52 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t1,$19); //@line 52 "SIDH_v1.0/ec_isogeny.c"
 $20 = $1; //@line 53 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t1,$20,$t1); //@line 53 "SIDH_v1.0/ec_isogeny.c"
 $21 = $0; //@line 54 "SIDH_v1.0/ec_isogeny.c"
 $22 = $0; //@line 54 "SIDH_v1.0/ec_isogeny.c"
 $23 = ((($22)) + 192|0); //@line 54 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($21,$23,$t2); //@line 54 "SIDH_v1.0/ec_isogeny.c"
 $24 = $0; //@line 55 "SIDH_v1.0/ec_isogeny.c"
 $25 = $0; //@line 55 "SIDH_v1.0/ec_isogeny.c"
 $26 = ((($25)) + 192|0); //@line 55 "SIDH_v1.0/ec_isogeny.c"
 $27 = $0; //@line 55 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($24,$26,$27); //@line 55 "SIDH_v1.0/ec_isogeny.c"
 $28 = $3; //@line 56 "SIDH_v1.0/ec_isogeny.c"
 $29 = $1; //@line 56 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t2,$28,$29); //@line 56 "SIDH_v1.0/ec_isogeny.c"
 $30 = $1; //@line 57 "SIDH_v1.0/ec_isogeny.c"
 $31 = ((($30)) + 192|0); //@line 57 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t0,$t1,$31); //@line 57 "SIDH_v1.0/ec_isogeny.c"
 $32 = $1; //@line 58 "SIDH_v1.0/ec_isogeny.c"
 $33 = $0; //@line 58 "SIDH_v1.0/ec_isogeny.c"
 $34 = ((($33)) + 192|0); //@line 58 "SIDH_v1.0/ec_isogeny.c"
 $35 = $0; //@line 58 "SIDH_v1.0/ec_isogeny.c"
 $36 = ((($35)) + 192|0); //@line 58 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($32,$34,$36); //@line 58 "SIDH_v1.0/ec_isogeny.c"
 $37 = $1; //@line 59 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t0,$t1,$37); //@line 59 "SIDH_v1.0/ec_isogeny.c"
 $38 = $0; //@line 60 "SIDH_v1.0/ec_isogeny.c"
 $39 = ((($38)) + 192|0); //@line 60 "SIDH_v1.0/ec_isogeny.c"
 $40 = $0; //@line 60 "SIDH_v1.0/ec_isogeny.c"
 $41 = ((($40)) + 192|0); //@line 60 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($39,$t2,$41); //@line 60 "SIDH_v1.0/ec_isogeny.c"
 $42 = $1; //@line 61 "SIDH_v1.0/ec_isogeny.c"
 $43 = ((($42)) + 192|0); //@line 61 "SIDH_v1.0/ec_isogeny.c"
 $44 = $1; //@line 61 "SIDH_v1.0/ec_isogeny.c"
 $45 = ((($44)) + 192|0); //@line 61 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($43,$45); //@line 61 "SIDH_v1.0/ec_isogeny.c"
 $46 = $1; //@line 62 "SIDH_v1.0/ec_isogeny.c"
 $47 = $1; //@line 62 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($46,$47); //@line 62 "SIDH_v1.0/ec_isogeny.c"
 $48 = $1; //@line 63 "SIDH_v1.0/ec_isogeny.c"
 $49 = ((($48)) + 192|0); //@line 63 "SIDH_v1.0/ec_isogeny.c"
 $50 = $2; //@line 63 "SIDH_v1.0/ec_isogeny.c"
 $51 = $1; //@line 63 "SIDH_v1.0/ec_isogeny.c"
 $52 = ((($51)) + 192|0); //@line 63 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($49,$50,$52); //@line 63 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 64 "SIDH_v1.0/ec_isogeny.c"
}
function _xDBL($P,$Q,$A24,$C24) {
 $P = $P|0;
 $Q = $Q|0;
 $A24 = $A24|0;
 $C24 = $C24|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $t0 = 0, $t1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 400|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 192|0;
 $t1 = sp;
 $0 = $P;
 $1 = $Q;
 $2 = $A24;
 $3 = $C24;
 $4 = $0; //@line 73 "SIDH_v1.0/ec_isogeny.c"
 $5 = $0; //@line 73 "SIDH_v1.0/ec_isogeny.c"
 $6 = ((($5)) + 192|0); //@line 73 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($4,$6,$t0); //@line 73 "SIDH_v1.0/ec_isogeny.c"
 $7 = $0; //@line 74 "SIDH_v1.0/ec_isogeny.c"
 $8 = $0; //@line 74 "SIDH_v1.0/ec_isogeny.c"
 $9 = ((($8)) + 192|0); //@line 74 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($7,$9,$t1); //@line 74 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t0,$t0); //@line 75 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t1,$t1); //@line 76 "SIDH_v1.0/ec_isogeny.c"
 $10 = $3; //@line 77 "SIDH_v1.0/ec_isogeny.c"
 $11 = $1; //@line 77 "SIDH_v1.0/ec_isogeny.c"
 $12 = ((($11)) + 192|0); //@line 77 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($10,$t0,$12); //@line 77 "SIDH_v1.0/ec_isogeny.c"
 $13 = $1; //@line 78 "SIDH_v1.0/ec_isogeny.c"
 $14 = ((($13)) + 192|0); //@line 78 "SIDH_v1.0/ec_isogeny.c"
 $15 = $1; //@line 78 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t1,$14,$15); //@line 78 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t1,$t0,$t1); //@line 79 "SIDH_v1.0/ec_isogeny.c"
 $16 = $2; //@line 80 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($16,$t1,$t0); //@line 80 "SIDH_v1.0/ec_isogeny.c"
 $17 = $1; //@line 81 "SIDH_v1.0/ec_isogeny.c"
 $18 = ((($17)) + 192|0); //@line 81 "SIDH_v1.0/ec_isogeny.c"
 $19 = $1; //@line 81 "SIDH_v1.0/ec_isogeny.c"
 $20 = ((($19)) + 192|0); //@line 81 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($18,$t0,$20); //@line 81 "SIDH_v1.0/ec_isogeny.c"
 $21 = $1; //@line 82 "SIDH_v1.0/ec_isogeny.c"
 $22 = ((($21)) + 192|0); //@line 82 "SIDH_v1.0/ec_isogeny.c"
 $23 = $1; //@line 82 "SIDH_v1.0/ec_isogeny.c"
 $24 = ((($23)) + 192|0); //@line 82 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($22,$t1,$24); //@line 82 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 83 "SIDH_v1.0/ec_isogeny.c"
}
function _xDBLe($P,$Q,$A,$C,$e) {
 $P = $P|0;
 $Q = $Q|0;
 $A = $A|0;
 $C = $C|0;
 $e = $e|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $A24den = 0, $A24num = 0, $i = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 416|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $A24num = sp + 200|0;
 $A24den = sp + 8|0;
 $0 = $P;
 $1 = $Q;
 $2 = $A;
 $3 = $C;
 $4 = $e;
 $5 = $3; //@line 93 "SIDH_v1.0/ec_isogeny.c"
 $6 = $3; //@line 93 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($5,$6,$A24num); //@line 93 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($A24num,$A24num,$A24den); //@line 94 "SIDH_v1.0/ec_isogeny.c"
 $7 = $2; //@line 95 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($A24num,$7,$A24num); //@line 95 "SIDH_v1.0/ec_isogeny.c"
 $8 = $0; //@line 96 "SIDH_v1.0/ec_isogeny.c"
 $9 = $1; //@line 96 "SIDH_v1.0/ec_isogeny.c"
 _copy_words($8,$9,96); //@line 96 "SIDH_v1.0/ec_isogeny.c"
 $i = 0; //@line 98 "SIDH_v1.0/ec_isogeny.c"
 while(1) {
  $10 = $i; //@line 98 "SIDH_v1.0/ec_isogeny.c"
  $11 = $4; //@line 98 "SIDH_v1.0/ec_isogeny.c"
  $12 = ($10|0)<($11|0); //@line 98 "SIDH_v1.0/ec_isogeny.c"
  if (!($12)) {
   break;
  }
  $13 = $1; //@line 99 "SIDH_v1.0/ec_isogeny.c"
  $14 = $1; //@line 99 "SIDH_v1.0/ec_isogeny.c"
  _xDBL($13,$14,$A24num,$A24den); //@line 99 "SIDH_v1.0/ec_isogeny.c"
  $15 = $i; //@line 98 "SIDH_v1.0/ec_isogeny.c"
  $16 = (($15) + 1)|0; //@line 98 "SIDH_v1.0/ec_isogeny.c"
  $i = $16; //@line 98 "SIDH_v1.0/ec_isogeny.c"
 }
 STACKTOP = sp;return; //@line 101 "SIDH_v1.0/ec_isogeny.c"
}
function _xADD($P,$Q,$xPQ) {
 $P = $P|0;
 $Q = $Q|0;
 $xPQ = $xPQ|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $t0 = 0, $t1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 400|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 192|0;
 $t1 = sp;
 $0 = $P;
 $1 = $Q;
 $2 = $xPQ;
 $3 = $0; //@line 110 "SIDH_v1.0/ec_isogeny.c"
 $4 = $0; //@line 110 "SIDH_v1.0/ec_isogeny.c"
 $5 = ((($4)) + 192|0); //@line 110 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($3,$5,$t0); //@line 110 "SIDH_v1.0/ec_isogeny.c"
 $6 = $0; //@line 111 "SIDH_v1.0/ec_isogeny.c"
 $7 = $0; //@line 111 "SIDH_v1.0/ec_isogeny.c"
 $8 = ((($7)) + 192|0); //@line 111 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($6,$8,$t1); //@line 111 "SIDH_v1.0/ec_isogeny.c"
 $9 = $1; //@line 112 "SIDH_v1.0/ec_isogeny.c"
 $10 = $1; //@line 112 "SIDH_v1.0/ec_isogeny.c"
 $11 = ((($10)) + 192|0); //@line 112 "SIDH_v1.0/ec_isogeny.c"
 $12 = $0; //@line 112 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($9,$11,$12); //@line 112 "SIDH_v1.0/ec_isogeny.c"
 $13 = $1; //@line 113 "SIDH_v1.0/ec_isogeny.c"
 $14 = $1; //@line 113 "SIDH_v1.0/ec_isogeny.c"
 $15 = ((($14)) + 192|0); //@line 113 "SIDH_v1.0/ec_isogeny.c"
 $16 = $0; //@line 113 "SIDH_v1.0/ec_isogeny.c"
 $17 = ((($16)) + 192|0); //@line 113 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($13,$15,$17); //@line 113 "SIDH_v1.0/ec_isogeny.c"
 $18 = $0; //@line 114 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t0,$18,$t0); //@line 114 "SIDH_v1.0/ec_isogeny.c"
 $19 = $0; //@line 115 "SIDH_v1.0/ec_isogeny.c"
 $20 = ((($19)) + 192|0); //@line 115 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t1,$20,$t1); //@line 115 "SIDH_v1.0/ec_isogeny.c"
 $21 = $0; //@line 116 "SIDH_v1.0/ec_isogeny.c"
 $22 = ((($21)) + 192|0); //@line 116 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t0,$t1,$22); //@line 116 "SIDH_v1.0/ec_isogeny.c"
 $23 = $0; //@line 117 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t0,$t1,$23); //@line 117 "SIDH_v1.0/ec_isogeny.c"
 $24 = $0; //@line 118 "SIDH_v1.0/ec_isogeny.c"
 $25 = ((($24)) + 192|0); //@line 118 "SIDH_v1.0/ec_isogeny.c"
 $26 = $0; //@line 118 "SIDH_v1.0/ec_isogeny.c"
 $27 = ((($26)) + 192|0); //@line 118 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($25,$27); //@line 118 "SIDH_v1.0/ec_isogeny.c"
 $28 = $0; //@line 119 "SIDH_v1.0/ec_isogeny.c"
 $29 = $0; //@line 119 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($28,$29); //@line 119 "SIDH_v1.0/ec_isogeny.c"
 $30 = $0; //@line 120 "SIDH_v1.0/ec_isogeny.c"
 $31 = ((($30)) + 192|0); //@line 120 "SIDH_v1.0/ec_isogeny.c"
 $32 = $2; //@line 120 "SIDH_v1.0/ec_isogeny.c"
 $33 = $0; //@line 120 "SIDH_v1.0/ec_isogeny.c"
 $34 = ((($33)) + 192|0); //@line 120 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($31,$32,$34); //@line 120 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 121 "SIDH_v1.0/ec_isogeny.c"
}
function _xDBLADD_basefield($P,$Q,$xPQ,$A24) {
 $P = $P|0;
 $Q = $Q|0;
 $xPQ = $xPQ|0;
 $A24 = $A24|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $7 = 0, $8 = 0, $9 = 0, $t0 = 0, $t1 = 0, $t2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 304|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 192|0;
 $t1 = sp + 96|0;
 $t2 = sp;
 $0 = $P;
 $1 = $Q;
 $2 = $xPQ;
 $3 = $A24;
 $4 = $0; //@line 152 "SIDH_v1.0/ec_isogeny.c"
 $5 = $0; //@line 152 "SIDH_v1.0/ec_isogeny.c"
 $6 = ((($5)) + 96|0); //@line 152 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($4,$6,$t0); //@line 152 "SIDH_v1.0/ec_isogeny.c"
 $7 = $0; //@line 153 "SIDH_v1.0/ec_isogeny.c"
 $8 = $0; //@line 153 "SIDH_v1.0/ec_isogeny.c"
 $9 = ((($8)) + 96|0); //@line 153 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($7,$9,$t1); //@line 153 "SIDH_v1.0/ec_isogeny.c"
 $10 = $0; //@line 154 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($t0,$10); //@line 154 "SIDH_v1.0/ec_isogeny.c"
 $11 = $1; //@line 155 "SIDH_v1.0/ec_isogeny.c"
 $12 = $1; //@line 155 "SIDH_v1.0/ec_isogeny.c"
 $13 = ((($12)) + 96|0); //@line 155 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($11,$13,$t2); //@line 155 "SIDH_v1.0/ec_isogeny.c"
 $14 = $1; //@line 156 "SIDH_v1.0/ec_isogeny.c"
 $15 = $1; //@line 156 "SIDH_v1.0/ec_isogeny.c"
 $16 = ((($15)) + 96|0); //@line 156 "SIDH_v1.0/ec_isogeny.c"
 $17 = $1; //@line 156 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($14,$16,$17); //@line 156 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($t0,$t2,$t0); //@line 157 "SIDH_v1.0/ec_isogeny.c"
 $18 = $0; //@line 158 "SIDH_v1.0/ec_isogeny.c"
 $19 = ((($18)) + 96|0); //@line 158 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($t1,$19); //@line 158 "SIDH_v1.0/ec_isogeny.c"
 $20 = $1; //@line 159 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($t1,$20,$t1); //@line 159 "SIDH_v1.0/ec_isogeny.c"
 $21 = $0; //@line 160 "SIDH_v1.0/ec_isogeny.c"
 $22 = $0; //@line 160 "SIDH_v1.0/ec_isogeny.c"
 $23 = ((($22)) + 96|0); //@line 160 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($21,$23,$t2); //@line 160 "SIDH_v1.0/ec_isogeny.c"
 $24 = $3; //@line 162 "SIDH_v1.0/ec_isogeny.c"
 $25 = HEAP32[$24>>2]|0; //@line 162 "SIDH_v1.0/ec_isogeny.c"
 $26 = ($25|0)==(1); //@line 162 "SIDH_v1.0/ec_isogeny.c"
 $27 = $0; //@line 163 "SIDH_v1.0/ec_isogeny.c"
 if ($26) {
  $28 = ((($27)) + 96|0); //@line 163 "SIDH_v1.0/ec_isogeny.c"
  $29 = $0; //@line 163 "SIDH_v1.0/ec_isogeny.c"
  $30 = ((($29)) + 96|0); //@line 163 "SIDH_v1.0/ec_isogeny.c"
  $31 = $0; //@line 163 "SIDH_v1.0/ec_isogeny.c"
  $32 = ((($31)) + 96|0); //@line 163 "SIDH_v1.0/ec_isogeny.c"
  _fpadd751($28,$30,$32); //@line 163 "SIDH_v1.0/ec_isogeny.c"
  $33 = $0; //@line 164 "SIDH_v1.0/ec_isogeny.c"
  $34 = $0; //@line 164 "SIDH_v1.0/ec_isogeny.c"
  $35 = ((($34)) + 96|0); //@line 164 "SIDH_v1.0/ec_isogeny.c"
  $36 = $0; //@line 164 "SIDH_v1.0/ec_isogeny.c"
  _fpmul751_mont($33,$35,$36); //@line 164 "SIDH_v1.0/ec_isogeny.c"
  $37 = $0; //@line 165 "SIDH_v1.0/ec_isogeny.c"
  $38 = ((($37)) + 96|0); //@line 165 "SIDH_v1.0/ec_isogeny.c"
  $39 = $0; //@line 165 "SIDH_v1.0/ec_isogeny.c"
  $40 = ((($39)) + 96|0); //@line 165 "SIDH_v1.0/ec_isogeny.c"
  _fpadd751($t2,$38,$40); //@line 165 "SIDH_v1.0/ec_isogeny.c"
 } else {
  $41 = $0; //@line 167 "SIDH_v1.0/ec_isogeny.c"
  $42 = ((($41)) + 96|0); //@line 167 "SIDH_v1.0/ec_isogeny.c"
  $43 = $0; //@line 167 "SIDH_v1.0/ec_isogeny.c"
  _fpmul751_mont($27,$42,$43); //@line 167 "SIDH_v1.0/ec_isogeny.c"
  $44 = $3; //@line 168 "SIDH_v1.0/ec_isogeny.c"
  $45 = $1; //@line 168 "SIDH_v1.0/ec_isogeny.c"
  _fpmul751_mont($44,$t2,$45); //@line 168 "SIDH_v1.0/ec_isogeny.c"
  $46 = $0; //@line 169 "SIDH_v1.0/ec_isogeny.c"
  $47 = ((($46)) + 96|0); //@line 169 "SIDH_v1.0/ec_isogeny.c"
  $48 = $1; //@line 169 "SIDH_v1.0/ec_isogeny.c"
  $49 = $0; //@line 169 "SIDH_v1.0/ec_isogeny.c"
  $50 = ((($49)) + 96|0); //@line 169 "SIDH_v1.0/ec_isogeny.c"
  _fpadd751($47,$48,$50); //@line 169 "SIDH_v1.0/ec_isogeny.c"
 }
 $51 = $1; //@line 172 "SIDH_v1.0/ec_isogeny.c"
 $52 = ((($51)) + 96|0); //@line 172 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($t0,$t1,$52); //@line 172 "SIDH_v1.0/ec_isogeny.c"
 $53 = $1; //@line 173 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($t0,$t1,$53); //@line 173 "SIDH_v1.0/ec_isogeny.c"
 $54 = $0; //@line 174 "SIDH_v1.0/ec_isogeny.c"
 $55 = ((($54)) + 96|0); //@line 174 "SIDH_v1.0/ec_isogeny.c"
 $56 = $0; //@line 174 "SIDH_v1.0/ec_isogeny.c"
 $57 = ((($56)) + 96|0); //@line 174 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($55,$t2,$57); //@line 174 "SIDH_v1.0/ec_isogeny.c"
 $58 = $1; //@line 175 "SIDH_v1.0/ec_isogeny.c"
 $59 = ((($58)) + 96|0); //@line 175 "SIDH_v1.0/ec_isogeny.c"
 $60 = $1; //@line 175 "SIDH_v1.0/ec_isogeny.c"
 $61 = ((($60)) + 96|0); //@line 175 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($59,$61); //@line 175 "SIDH_v1.0/ec_isogeny.c"
 $62 = $1; //@line 176 "SIDH_v1.0/ec_isogeny.c"
 $63 = $1; //@line 176 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($62,$63); //@line 176 "SIDH_v1.0/ec_isogeny.c"
 $64 = $1; //@line 177 "SIDH_v1.0/ec_isogeny.c"
 $65 = ((($64)) + 96|0); //@line 177 "SIDH_v1.0/ec_isogeny.c"
 $66 = $2; //@line 177 "SIDH_v1.0/ec_isogeny.c"
 $67 = $1; //@line 177 "SIDH_v1.0/ec_isogeny.c"
 $68 = ((($67)) + 96|0); //@line 177 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($65,$66,$68); //@line 177 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 178 "SIDH_v1.0/ec_isogeny.c"
}
function _ladder($x,$m,$P,$Q,$A24,$order_bits,$order_fullbits,$CurveIsogeny) {
 $x = $x|0;
 $m = $m|0;
 $P = $P|0;
 $Q = $Q|0;
 $A24 = $A24|0;
 $order_bits = $order_bits|0;
 $order_fullbits = $order_fullbits|0;
 $CurveIsogeny = $CurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $bit = 0;
 var $i = 0, $mask = 0, $owords = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $m;
 $2 = $P;
 $3 = $Q;
 $4 = $A24;
 $5 = $order_bits;
 $6 = $order_fullbits;
 $7 = $CurveIsogeny;
 $bit = 0; //@line 190 "SIDH_v1.0/ec_isogeny.c"
 $8 = $6; //@line 190 "SIDH_v1.0/ec_isogeny.c"
 $9 = (($8) + 32)|0; //@line 190 "SIDH_v1.0/ec_isogeny.c"
 $10 = (($9) - 1)|0; //@line 190 "SIDH_v1.0/ec_isogeny.c"
 $11 = (($10>>>0) / 32)&-1; //@line 190 "SIDH_v1.0/ec_isogeny.c"
 $owords = $11; //@line 190 "SIDH_v1.0/ec_isogeny.c"
 $12 = $7; //@line 195 "SIDH_v1.0/ec_isogeny.c"
 $13 = ((($12)) + 80|0); //@line 195 "SIDH_v1.0/ec_isogeny.c"
 $14 = HEAP32[$13>>2]|0; //@line 195 "SIDH_v1.0/ec_isogeny.c"
 $15 = $2; //@line 195 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($14,$15); //@line 195 "SIDH_v1.0/ec_isogeny.c"
 $16 = $2; //@line 196 "SIDH_v1.0/ec_isogeny.c"
 $17 = ((($16)) + 96|0); //@line 196 "SIDH_v1.0/ec_isogeny.c"
 _fpzero751($17); //@line 196 "SIDH_v1.0/ec_isogeny.c"
 $18 = $0; //@line 197 "SIDH_v1.0/ec_isogeny.c"
 $19 = $3; //@line 197 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($18,$19); //@line 197 "SIDH_v1.0/ec_isogeny.c"
 $20 = $7; //@line 198 "SIDH_v1.0/ec_isogeny.c"
 $21 = ((($20)) + 80|0); //@line 198 "SIDH_v1.0/ec_isogeny.c"
 $22 = HEAP32[$21>>2]|0; //@line 198 "SIDH_v1.0/ec_isogeny.c"
 $23 = $3; //@line 198 "SIDH_v1.0/ec_isogeny.c"
 $24 = ((($23)) + 96|0); //@line 198 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($22,$24); //@line 198 "SIDH_v1.0/ec_isogeny.c"
 $25 = $6; //@line 200 "SIDH_v1.0/ec_isogeny.c"
 $26 = $5; //@line 200 "SIDH_v1.0/ec_isogeny.c"
 $27 = (($25) - ($26))|0; //@line 200 "SIDH_v1.0/ec_isogeny.c"
 $i = $27; //@line 200 "SIDH_v1.0/ec_isogeny.c"
 while(1) {
  $28 = $i; //@line 200 "SIDH_v1.0/ec_isogeny.c"
  $29 = ($28|0)>(0); //@line 200 "SIDH_v1.0/ec_isogeny.c"
  if (!($29)) {
   break;
  }
  $30 = $1; //@line 201 "SIDH_v1.0/ec_isogeny.c"
  $31 = $owords; //@line 201 "SIDH_v1.0/ec_isogeny.c"
  _mp_shiftl1($30,$31); //@line 201 "SIDH_v1.0/ec_isogeny.c"
  $32 = $i; //@line 200 "SIDH_v1.0/ec_isogeny.c"
  $33 = (($32) + -1)|0; //@line 200 "SIDH_v1.0/ec_isogeny.c"
  $i = $33; //@line 200 "SIDH_v1.0/ec_isogeny.c"
 }
 $34 = $5; //@line 204 "SIDH_v1.0/ec_isogeny.c"
 $i = $34; //@line 204 "SIDH_v1.0/ec_isogeny.c"
 while(1) {
  $35 = $i; //@line 204 "SIDH_v1.0/ec_isogeny.c"
  $36 = ($35|0)>(0); //@line 204 "SIDH_v1.0/ec_isogeny.c"
  if (!($36)) {
   break;
  }
  $37 = $owords; //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $38 = (($37) - 1)|0; //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $39 = $1; //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $40 = (($39) + ($38<<2)|0); //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $41 = HEAP32[$40>>2]|0; //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $42 = $41 >>> 31; //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $bit = $42; //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $43 = $1; //@line 206 "SIDH_v1.0/ec_isogeny.c"
  $44 = $owords; //@line 206 "SIDH_v1.0/ec_isogeny.c"
  _mp_shiftl1($43,$44); //@line 206 "SIDH_v1.0/ec_isogeny.c"
  $45 = $bit; //@line 207 "SIDH_v1.0/ec_isogeny.c"
  $46 = (0 - ($45))|0; //@line 207 "SIDH_v1.0/ec_isogeny.c"
  $mask = $46; //@line 207 "SIDH_v1.0/ec_isogeny.c"
  $47 = $2; //@line 209 "SIDH_v1.0/ec_isogeny.c"
  $48 = $3; //@line 209 "SIDH_v1.0/ec_isogeny.c"
  $49 = $mask; //@line 209 "SIDH_v1.0/ec_isogeny.c"
  _swap_points_basefield($47,$48,$49); //@line 209 "SIDH_v1.0/ec_isogeny.c"
  $50 = $2; //@line 210 "SIDH_v1.0/ec_isogeny.c"
  $51 = $3; //@line 210 "SIDH_v1.0/ec_isogeny.c"
  $52 = $0; //@line 210 "SIDH_v1.0/ec_isogeny.c"
  $53 = $4; //@line 210 "SIDH_v1.0/ec_isogeny.c"
  _xDBLADD_basefield($50,$51,$52,$53); //@line 210 "SIDH_v1.0/ec_isogeny.c"
  $54 = $2; //@line 211 "SIDH_v1.0/ec_isogeny.c"
  $55 = $3; //@line 211 "SIDH_v1.0/ec_isogeny.c"
  $56 = $mask; //@line 211 "SIDH_v1.0/ec_isogeny.c"
  _swap_points_basefield($54,$55,$56); //@line 211 "SIDH_v1.0/ec_isogeny.c"
  $57 = $i; //@line 204 "SIDH_v1.0/ec_isogeny.c"
  $58 = (($57) + -1)|0; //@line 204 "SIDH_v1.0/ec_isogeny.c"
  $i = $58; //@line 204 "SIDH_v1.0/ec_isogeny.c"
 }
 STACKTOP = sp;return; //@line 213 "SIDH_v1.0/ec_isogeny.c"
}
function _secret_pt($P,$m,$AliceOrBob,$R,$CurveIsogeny) {
 $P = $P|0;
 $m = $m|0;
 $AliceOrBob = $AliceOrBob|0;
 $R = $R|0;
 $CurveIsogeny = $CurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $A24 = 0;
 var $Q = 0, $RX0 = 0, $RX1 = 0, $RZ0 = 0, $RZ1 = 0, $S = 0, $T = 0, $X0 = 0, $X1 = 0, $Z0 = 0, $Z1 = 0, $nbits = 0, $scalar = 0, $t0 = 0, $t1 = 0, $t2 = 0, $x = 0, $x1 = 0, $y = 0, $y1 = 0;
 var dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1088|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Q = sp + 864|0;
 $S = sp + 672|0;
 $T = sp + 480|0;
 $scalar = sp + 400|0;
 $t0 = sp + 304|0;
 $t1 = sp + 208|0;
 $t2 = sp + 112|0;
 $A24 = sp + 16|0;
 $1 = $P;
 $2 = $m;
 $3 = $AliceOrBob;
 $4 = $R;
 $5 = $CurveIsogeny;
 $X0 = $S; //@line 250 "SIDH_v1.0/ec_isogeny.c"
 $6 = ((($S)) + 96|0); //@line 250 "SIDH_v1.0/ec_isogeny.c"
 $Z0 = $6; //@line 250 "SIDH_v1.0/ec_isogeny.c"
 $X1 = $T; //@line 250 "SIDH_v1.0/ec_isogeny.c"
 $7 = ((($T)) + 96|0); //@line 250 "SIDH_v1.0/ec_isogeny.c"
 $Z1 = $7; //@line 250 "SIDH_v1.0/ec_isogeny.c"
 $8 = $1; //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $x = $8; //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $9 = $1; //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $10 = ((($9)) + 96|0); //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $y = $10; //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $x1 = $Q; //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $11 = ((($Q)) + 96|0); //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $y1 = $11; //@line 251 "SIDH_v1.0/ec_isogeny.c"
 dest=$A24; stop=dest+96|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0)); //@line 253 "SIDH_v1.0/ec_isogeny.c"
 $12 = $4; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $RX0 = $12; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $13 = $4; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $14 = ((($13)) + 96|0); //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $RX1 = $14; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $15 = $4; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $16 = ((($15)) + 192|0); //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $RZ0 = $16; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $17 = $4; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $18 = ((($17)) + 192|0); //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $19 = ((($18)) + 96|0); //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $RZ1 = $19; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $20 = $1; //@line 256 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($20,$Q); //@line 256 "SIDH_v1.0/ec_isogeny.c"
 $21 = $1; //@line 257 "SIDH_v1.0/ec_isogeny.c"
 $22 = ((($21)) + 96|0); //@line 257 "SIDH_v1.0/ec_isogeny.c"
 $23 = ((($Q)) + 96|0); //@line 257 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($22,$23); //@line 257 "SIDH_v1.0/ec_isogeny.c"
 _fpneg751($Q); //@line 258 "SIDH_v1.0/ec_isogeny.c"
 $24 = $3; //@line 260 "SIDH_v1.0/ec_isogeny.c"
 $25 = ($24|0)==(0); //@line 260 "SIDH_v1.0/ec_isogeny.c"
 do {
  if ($25) {
   $26 = $5; //@line 261 "SIDH_v1.0/ec_isogeny.c"
   $27 = ((($26)) + 36|0); //@line 261 "SIDH_v1.0/ec_isogeny.c"
   $28 = HEAP32[$27>>2]|0; //@line 261 "SIDH_v1.0/ec_isogeny.c"
   $nbits = $28; //@line 261 "SIDH_v1.0/ec_isogeny.c"
  } else {
   $29 = $3; //@line 262 "SIDH_v1.0/ec_isogeny.c"
   $30 = ($29|0)==(1); //@line 262 "SIDH_v1.0/ec_isogeny.c"
   if ($30) {
    $31 = $5; //@line 263 "SIDH_v1.0/ec_isogeny.c"
    $32 = ((($31)) + 44|0); //@line 263 "SIDH_v1.0/ec_isogeny.c"
    $33 = HEAP32[$32>>2]|0; //@line 263 "SIDH_v1.0/ec_isogeny.c"
    $nbits = $33; //@line 263 "SIDH_v1.0/ec_isogeny.c"
    break;
   }
   $0 = 6; //@line 265 "SIDH_v1.0/ec_isogeny.c"
   $98 = $0; //@line 310 "SIDH_v1.0/ec_isogeny.c"
   STACKTOP = sp;return ($98|0); //@line 310 "SIDH_v1.0/ec_isogeny.c"
  }
 } while(0);
 HEAP32[$A24>>2] = 1; //@line 269 "SIDH_v1.0/ec_isogeny.c"
 $34 = $2; //@line 270 "SIDH_v1.0/ec_isogeny.c"
 _copy_words($34,$scalar,12); //@line 270 "SIDH_v1.0/ec_isogeny.c"
 $35 = $nbits; //@line 271 "SIDH_v1.0/ec_isogeny.c"
 $36 = $5; //@line 271 "SIDH_v1.0/ec_isogeny.c"
 $37 = ((($36)) + 16|0); //@line 271 "SIDH_v1.0/ec_isogeny.c"
 $38 = HEAP32[$37>>2]|0; //@line 271 "SIDH_v1.0/ec_isogeny.c"
 $39 = $5; //@line 271 "SIDH_v1.0/ec_isogeny.c"
 _ladder($Q,$scalar,$S,$T,$A24,$35,$38,$39); //@line 271 "SIDH_v1.0/ec_isogeny.c"
 $40 = $x1; //@line 277 "SIDH_v1.0/ec_isogeny.c"
 $41 = $Z0; //@line 277 "SIDH_v1.0/ec_isogeny.c"
 $42 = $RX1; //@line 277 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($40,$41,$42); //@line 277 "SIDH_v1.0/ec_isogeny.c"
 $43 = $X0; //@line 278 "SIDH_v1.0/ec_isogeny.c"
 $44 = $x1; //@line 278 "SIDH_v1.0/ec_isogeny.c"
 $45 = $RX0; //@line 278 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($43,$44,$45); //@line 278 "SIDH_v1.0/ec_isogeny.c"
 $46 = $X0; //@line 279 "SIDH_v1.0/ec_isogeny.c"
 $47 = $RX1; //@line 279 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($46,$47,$t0); //@line 279 "SIDH_v1.0/ec_isogeny.c"
 $48 = $X0; //@line 280 "SIDH_v1.0/ec_isogeny.c"
 $49 = $RX1; //@line 280 "SIDH_v1.0/ec_isogeny.c"
 $50 = $RX1; //@line 280 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($48,$49,$50); //@line 280 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($t0,$t0); //@line 281 "SIDH_v1.0/ec_isogeny.c"
 $51 = $RX0; //@line 282 "SIDH_v1.0/ec_isogeny.c"
 $52 = $Z0; //@line 282 "SIDH_v1.0/ec_isogeny.c"
 $53 = $RX0; //@line 282 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($51,$52,$53); //@line 282 "SIDH_v1.0/ec_isogeny.c"
 $54 = $X1; //@line 283 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($t0,$54,$t0); //@line 283 "SIDH_v1.0/ec_isogeny.c"
 $55 = $RX0; //@line 284 "SIDH_v1.0/ec_isogeny.c"
 $56 = $RX1; //@line 284 "SIDH_v1.0/ec_isogeny.c"
 $57 = $RX0; //@line 284 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($55,$56,$57); //@line 284 "SIDH_v1.0/ec_isogeny.c"
 $58 = $y1; //@line 285 "SIDH_v1.0/ec_isogeny.c"
 $59 = $Z1; //@line 285 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($58,$59,$t2); //@line 285 "SIDH_v1.0/ec_isogeny.c"
 $60 = $y; //@line 286 "SIDH_v1.0/ec_isogeny.c"
 $61 = $Z0; //@line 286 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($60,$61,$t1); //@line 286 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($t2,$t2,$t2); //@line 287 "SIDH_v1.0/ec_isogeny.c"
 $62 = $Z0; //@line 288 "SIDH_v1.0/ec_isogeny.c"
 $63 = $RX1; //@line 288 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($t2,$62,$63); //@line 288 "SIDH_v1.0/ec_isogeny.c"
 $64 = $RX0; //@line 289 "SIDH_v1.0/ec_isogeny.c"
 $65 = $Z1; //@line 289 "SIDH_v1.0/ec_isogeny.c"
 $66 = $RX0; //@line 289 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($64,$65,$66); //@line 289 "SIDH_v1.0/ec_isogeny.c"
 $67 = $RX0; //@line 290 "SIDH_v1.0/ec_isogeny.c"
 $68 = $RX0; //@line 290 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($67,$t0,$68); //@line 290 "SIDH_v1.0/ec_isogeny.c"
 $69 = $RX1; //@line 291 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($t1,$69,$t1); //@line 291 "SIDH_v1.0/ec_isogeny.c"
 $70 = $RX1; //@line 292 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($70,$t0); //@line 292 "SIDH_v1.0/ec_isogeny.c"
 $71 = $RX1; //@line 293 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($t2,$71,$t2); //@line 293 "SIDH_v1.0/ec_isogeny.c"
 $72 = $RX0; //@line 294 "SIDH_v1.0/ec_isogeny.c"
 $73 = $RX1; //@line 294 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($t1,$72,$73); //@line 294 "SIDH_v1.0/ec_isogeny.c"
 $74 = $RX0; //@line 295 "SIDH_v1.0/ec_isogeny.c"
 $75 = $RZ0; //@line 295 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($t1,$74,$75); //@line 295 "SIDH_v1.0/ec_isogeny.c"
 $76 = $RX1; //@line 296 "SIDH_v1.0/ec_isogeny.c"
 $77 = $RX1; //@line 296 "SIDH_v1.0/ec_isogeny.c"
 $78 = $RX1; //@line 296 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($76,$77,$78); //@line 296 "SIDH_v1.0/ec_isogeny.c"
 $79 = $RX0; //@line 297 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($t1,$79,$t1); //@line 297 "SIDH_v1.0/ec_isogeny.c"
 $80 = $x; //@line 298 "SIDH_v1.0/ec_isogeny.c"
 $81 = $Z0; //@line 298 "SIDH_v1.0/ec_isogeny.c"
 $82 = $RX0; //@line 298 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($80,$81,$82); //@line 298 "SIDH_v1.0/ec_isogeny.c"
 $83 = $RZ0; //@line 299 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($t1,$83,$t1); //@line 299 "SIDH_v1.0/ec_isogeny.c"
 $84 = $X0; //@line 300 "SIDH_v1.0/ec_isogeny.c"
 $85 = $RX0; //@line 300 "SIDH_v1.0/ec_isogeny.c"
 $86 = $RZ0; //@line 300 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($84,$85,$86); //@line 300 "SIDH_v1.0/ec_isogeny.c"
 $87 = $X0; //@line 301 "SIDH_v1.0/ec_isogeny.c"
 $88 = $RX0; //@line 301 "SIDH_v1.0/ec_isogeny.c"
 $89 = $RX0; //@line 301 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($87,$88,$89); //@line 301 "SIDH_v1.0/ec_isogeny.c"
 $90 = $RZ0; //@line 302 "SIDH_v1.0/ec_isogeny.c"
 $91 = $RZ0; //@line 302 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($90,$91); //@line 302 "SIDH_v1.0/ec_isogeny.c"
 $92 = $RX0; //@line 303 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($t2,$92,$t2); //@line 303 "SIDH_v1.0/ec_isogeny.c"
 $93 = $RZ0; //@line 304 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($t2,$93,$t2); //@line 304 "SIDH_v1.0/ec_isogeny.c"
 $94 = $RZ0; //@line 305 "SIDH_v1.0/ec_isogeny.c"
 $95 = $RZ0; //@line 305 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($94,$t0,$95); //@line 305 "SIDH_v1.0/ec_isogeny.c"
 $96 = $RX0; //@line 306 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($t1,$t2,$96); //@line 306 "SIDH_v1.0/ec_isogeny.c"
 $97 = $RZ1; //@line 307 "SIDH_v1.0/ec_isogeny.c"
 _fpzero751($97); //@line 307 "SIDH_v1.0/ec_isogeny.c"
 $0 = 0; //@line 309 "SIDH_v1.0/ec_isogeny.c"
 $98 = $0; //@line 310 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return ($98|0); //@line 310 "SIDH_v1.0/ec_isogeny.c"
}
function _ladder_3_pt($xP,$xQ,$xPQ,$m,$AliceOrBob,$W,$A,$CurveIsogeny) {
 $xP = $xP|0;
 $xQ = $xQ|0;
 $xPQ = $xPQ|0;
 $m = $m|0;
 $AliceOrBob = $AliceOrBob|0;
 $W = $W|0;
 $A = $A|0;
 $CurveIsogeny = $CurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $8 = 0, $9 = 0, $A24 = 0, $A24num = 0, $U = 0, $V = 0;
 var $bit = 0, $constant1 = 0, $constant2 = 0, $fullbits = 0, $i = 0, $mask = 0, $nbits = 0, $temp_scalar = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1696|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $U = sp + 1272|0;
 $V = sp + 888|0;
 $A24 = sp + 696|0;
 $A24num = sp + 504|0;
 $constant1 = sp + 312|0;
 $constant2 = sp + 120|0;
 $temp_scalar = sp + 24|0;
 $1 = $xP;
 $2 = $xQ;
 $3 = $xPQ;
 $4 = $m;
 $5 = $AliceOrBob;
 $6 = $W;
 $7 = $A;
 $8 = $CurveIsogeny;
 _memset(($U|0),0,384)|0; //@line 317 "SIDH_v1.0/ec_isogeny.c"
 _memset(($V|0),0,384)|0; //@line 317 "SIDH_v1.0/ec_isogeny.c"
 _memset(($constant1|0),0,192)|0; //@line 318 "SIDH_v1.0/ec_isogeny.c"
 $bit = 0; //@line 320 "SIDH_v1.0/ec_isogeny.c"
 $9 = $8; //@line 320 "SIDH_v1.0/ec_isogeny.c"
 $10 = ((($9)) + 16|0); //@line 320 "SIDH_v1.0/ec_isogeny.c"
 $11 = HEAP32[$10>>2]|0; //@line 320 "SIDH_v1.0/ec_isogeny.c"
 $fullbits = $11; //@line 320 "SIDH_v1.0/ec_isogeny.c"
 $12 = $5; //@line 324 "SIDH_v1.0/ec_isogeny.c"
 $13 = ($12|0)==(0); //@line 324 "SIDH_v1.0/ec_isogeny.c"
 do {
  if ($13) {
   $14 = $8; //@line 325 "SIDH_v1.0/ec_isogeny.c"
   $15 = ((($14)) + 36|0); //@line 325 "SIDH_v1.0/ec_isogeny.c"
   $16 = HEAP32[$15>>2]|0; //@line 325 "SIDH_v1.0/ec_isogeny.c"
   $nbits = $16; //@line 325 "SIDH_v1.0/ec_isogeny.c"
  } else {
   $17 = $5; //@line 326 "SIDH_v1.0/ec_isogeny.c"
   $18 = ($17|0)==(1); //@line 326 "SIDH_v1.0/ec_isogeny.c"
   if ($18) {
    $19 = $8; //@line 327 "SIDH_v1.0/ec_isogeny.c"
    $20 = ((($19)) + 44|0); //@line 327 "SIDH_v1.0/ec_isogeny.c"
    $21 = HEAP32[$20>>2]|0; //@line 327 "SIDH_v1.0/ec_isogeny.c"
    $nbits = $21; //@line 327 "SIDH_v1.0/ec_isogeny.c"
    break;
   }
   $0 = 6; //@line 329 "SIDH_v1.0/ec_isogeny.c"
   $75 = $0; //@line 367 "SIDH_v1.0/ec_isogeny.c"
   STACKTOP = sp;return ($75|0); //@line 367 "SIDH_v1.0/ec_isogeny.c"
  }
 } while(0);
 $22 = $8; //@line 332 "SIDH_v1.0/ec_isogeny.c"
 $23 = ((($22)) + 80|0); //@line 332 "SIDH_v1.0/ec_isogeny.c"
 $24 = HEAP32[$23>>2]|0; //@line 332 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($24,$constant1); //@line 332 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($constant1,$constant1,$constant1); //@line 333 "SIDH_v1.0/ec_isogeny.c"
 $25 = $7; //@line 334 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($25,$constant1,$A24num); //@line 334 "SIDH_v1.0/ec_isogeny.c"
 _fp2div2_751($A24num,$A24); //@line 335 "SIDH_v1.0/ec_isogeny.c"
 _fp2div2_751($A24,$A24); //@line 336 "SIDH_v1.0/ec_isogeny.c"
 $26 = $8; //@line 339 "SIDH_v1.0/ec_isogeny.c"
 $27 = ((($26)) + 80|0); //@line 339 "SIDH_v1.0/ec_isogeny.c"
 $28 = HEAP32[$27>>2]|0; //@line 339 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($28,$U); //@line 339 "SIDH_v1.0/ec_isogeny.c"
 $29 = $2; //@line 340 "SIDH_v1.0/ec_isogeny.c"
 _fp2copy751($29,$V); //@line 340 "SIDH_v1.0/ec_isogeny.c"
 $30 = $8; //@line 341 "SIDH_v1.0/ec_isogeny.c"
 $31 = ((($30)) + 80|0); //@line 341 "SIDH_v1.0/ec_isogeny.c"
 $32 = HEAP32[$31>>2]|0; //@line 341 "SIDH_v1.0/ec_isogeny.c"
 $33 = ((($V)) + 192|0); //@line 341 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($32,$33); //@line 341 "SIDH_v1.0/ec_isogeny.c"
 $34 = $1; //@line 342 "SIDH_v1.0/ec_isogeny.c"
 $35 = $6; //@line 342 "SIDH_v1.0/ec_isogeny.c"
 _fp2copy751($34,$35); //@line 342 "SIDH_v1.0/ec_isogeny.c"
 $36 = $8; //@line 343 "SIDH_v1.0/ec_isogeny.c"
 $37 = ((($36)) + 80|0); //@line 343 "SIDH_v1.0/ec_isogeny.c"
 $38 = HEAP32[$37>>2]|0; //@line 343 "SIDH_v1.0/ec_isogeny.c"
 $39 = $6; //@line 343 "SIDH_v1.0/ec_isogeny.c"
 $40 = ((($39)) + 192|0); //@line 343 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($38,$40); //@line 343 "SIDH_v1.0/ec_isogeny.c"
 $41 = $6; //@line 344 "SIDH_v1.0/ec_isogeny.c"
 $42 = ((($41)) + 192|0); //@line 344 "SIDH_v1.0/ec_isogeny.c"
 $43 = ((($42)) + 96|0); //@line 344 "SIDH_v1.0/ec_isogeny.c"
 _fpzero751($43); //@line 344 "SIDH_v1.0/ec_isogeny.c"
 $44 = $4; //@line 345 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($44,$temp_scalar); //@line 345 "SIDH_v1.0/ec_isogeny.c"
 $45 = $fullbits; //@line 347 "SIDH_v1.0/ec_isogeny.c"
 $46 = $nbits; //@line 347 "SIDH_v1.0/ec_isogeny.c"
 $47 = (($45) - ($46))|0; //@line 347 "SIDH_v1.0/ec_isogeny.c"
 $i = $47; //@line 347 "SIDH_v1.0/ec_isogeny.c"
 while(1) {
  $48 = $i; //@line 347 "SIDH_v1.0/ec_isogeny.c"
  $49 = ($48|0)>(0); //@line 347 "SIDH_v1.0/ec_isogeny.c"
  if (!($49)) {
   break;
  }
  _mp_shiftl1($temp_scalar,12); //@line 348 "SIDH_v1.0/ec_isogeny.c"
  $50 = $i; //@line 347 "SIDH_v1.0/ec_isogeny.c"
  $51 = (($50) + -1)|0; //@line 347 "SIDH_v1.0/ec_isogeny.c"
  $i = $51; //@line 347 "SIDH_v1.0/ec_isogeny.c"
 }
 $52 = $nbits; //@line 351 "SIDH_v1.0/ec_isogeny.c"
 $i = $52; //@line 351 "SIDH_v1.0/ec_isogeny.c"
 while(1) {
  $53 = $i; //@line 351 "SIDH_v1.0/ec_isogeny.c"
  $54 = ($53|0)>(0); //@line 351 "SIDH_v1.0/ec_isogeny.c"
  if (!($54)) {
   break;
  }
  $55 = ((($temp_scalar)) + 44|0); //@line 352 "SIDH_v1.0/ec_isogeny.c"
  $56 = HEAP32[$55>>2]|0; //@line 352 "SIDH_v1.0/ec_isogeny.c"
  $57 = $56 >>> 31; //@line 352 "SIDH_v1.0/ec_isogeny.c"
  $bit = $57; //@line 352 "SIDH_v1.0/ec_isogeny.c"
  _mp_shiftl1($temp_scalar,12); //@line 353 "SIDH_v1.0/ec_isogeny.c"
  $58 = $bit; //@line 354 "SIDH_v1.0/ec_isogeny.c"
  $59 = (0 - ($58))|0; //@line 354 "SIDH_v1.0/ec_isogeny.c"
  $mask = $59; //@line 354 "SIDH_v1.0/ec_isogeny.c"
  $60 = $6; //@line 356 "SIDH_v1.0/ec_isogeny.c"
  $61 = $mask; //@line 356 "SIDH_v1.0/ec_isogeny.c"
  _swap_points($60,$U,$61); //@line 356 "SIDH_v1.0/ec_isogeny.c"
  $62 = $mask; //@line 357 "SIDH_v1.0/ec_isogeny.c"
  _swap_points($U,$V,$62); //@line 357 "SIDH_v1.0/ec_isogeny.c"
  $63 = $1; //@line 358 "SIDH_v1.0/ec_isogeny.c"
  $64 = $2; //@line 358 "SIDH_v1.0/ec_isogeny.c"
  $65 = $mask; //@line 358 "SIDH_v1.0/ec_isogeny.c"
  _select_f2elm($63,$64,$constant1,$65); //@line 358 "SIDH_v1.0/ec_isogeny.c"
  $66 = $2; //@line 359 "SIDH_v1.0/ec_isogeny.c"
  $67 = $3; //@line 359 "SIDH_v1.0/ec_isogeny.c"
  $68 = $mask; //@line 359 "SIDH_v1.0/ec_isogeny.c"
  _select_f2elm($66,$67,$constant2,$68); //@line 359 "SIDH_v1.0/ec_isogeny.c"
  $69 = $6; //@line 360 "SIDH_v1.0/ec_isogeny.c"
  _xADD($69,$U,$constant1); //@line 360 "SIDH_v1.0/ec_isogeny.c"
  _xDBLADD($U,$V,$constant2,$A24); //@line 361 "SIDH_v1.0/ec_isogeny.c"
  $70 = $mask; //@line 362 "SIDH_v1.0/ec_isogeny.c"
  _swap_points($U,$V,$70); //@line 362 "SIDH_v1.0/ec_isogeny.c"
  $71 = $6; //@line 363 "SIDH_v1.0/ec_isogeny.c"
  $72 = $mask; //@line 363 "SIDH_v1.0/ec_isogeny.c"
  _swap_points($71,$U,$72); //@line 363 "SIDH_v1.0/ec_isogeny.c"
  $73 = $i; //@line 351 "SIDH_v1.0/ec_isogeny.c"
  $74 = (($73) + -1)|0; //@line 351 "SIDH_v1.0/ec_isogeny.c"
  $i = $74; //@line 351 "SIDH_v1.0/ec_isogeny.c"
 }
 $0 = 0; //@line 366 "SIDH_v1.0/ec_isogeny.c"
 $75 = $0; //@line 367 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return ($75|0); //@line 367 "SIDH_v1.0/ec_isogeny.c"
}
function _get_4_isog($P,$A,$C,$coeff) {
 $P = $P|0;
 $A = $A|0;
 $C = $C|0;
 $coeff = $coeff|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $P;
 $1 = $A;
 $2 = $C;
 $3 = $coeff;
 $4 = $0; //@line 376 "SIDH_v1.0/ec_isogeny.c"
 $5 = $0; //@line 376 "SIDH_v1.0/ec_isogeny.c"
 $6 = ((($5)) + 192|0); //@line 376 "SIDH_v1.0/ec_isogeny.c"
 $7 = $3; //@line 376 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($4,$6,$7); //@line 376 "SIDH_v1.0/ec_isogeny.c"
 $8 = $0; //@line 377 "SIDH_v1.0/ec_isogeny.c"
 $9 = $3; //@line 377 "SIDH_v1.0/ec_isogeny.c"
 $10 = ((($9)) + 576|0); //@line 377 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($8,$10); //@line 377 "SIDH_v1.0/ec_isogeny.c"
 $11 = $0; //@line 378 "SIDH_v1.0/ec_isogeny.c"
 $12 = ((($11)) + 192|0); //@line 378 "SIDH_v1.0/ec_isogeny.c"
 $13 = $3; //@line 378 "SIDH_v1.0/ec_isogeny.c"
 $14 = ((($13)) + 768|0); //@line 378 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($12,$14); //@line 378 "SIDH_v1.0/ec_isogeny.c"
 $15 = $3; //@line 379 "SIDH_v1.0/ec_isogeny.c"
 $16 = $3; //@line 379 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($15,$16); //@line 379 "SIDH_v1.0/ec_isogeny.c"
 $17 = $3; //@line 380 "SIDH_v1.0/ec_isogeny.c"
 $18 = ((($17)) + 576|0); //@line 380 "SIDH_v1.0/ec_isogeny.c"
 $19 = $3; //@line 380 "SIDH_v1.0/ec_isogeny.c"
 $20 = ((($19)) + 768|0); //@line 380 "SIDH_v1.0/ec_isogeny.c"
 $21 = $3; //@line 380 "SIDH_v1.0/ec_isogeny.c"
 $22 = ((($21)) + 192|0); //@line 380 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($18,$20,$22); //@line 380 "SIDH_v1.0/ec_isogeny.c"
 $23 = $3; //@line 381 "SIDH_v1.0/ec_isogeny.c"
 $24 = ((($23)) + 576|0); //@line 381 "SIDH_v1.0/ec_isogeny.c"
 $25 = $3; //@line 381 "SIDH_v1.0/ec_isogeny.c"
 $26 = ((($25)) + 768|0); //@line 381 "SIDH_v1.0/ec_isogeny.c"
 $27 = $3; //@line 381 "SIDH_v1.0/ec_isogeny.c"
 $28 = ((($27)) + 384|0); //@line 381 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($24,$26,$28); //@line 381 "SIDH_v1.0/ec_isogeny.c"
 $29 = $3; //@line 382 "SIDH_v1.0/ec_isogeny.c"
 $30 = ((($29)) + 576|0); //@line 382 "SIDH_v1.0/ec_isogeny.c"
 $31 = $3; //@line 382 "SIDH_v1.0/ec_isogeny.c"
 $32 = ((($31)) + 576|0); //@line 382 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($30,$32); //@line 382 "SIDH_v1.0/ec_isogeny.c"
 $33 = $3; //@line 383 "SIDH_v1.0/ec_isogeny.c"
 $34 = ((($33)) + 768|0); //@line 383 "SIDH_v1.0/ec_isogeny.c"
 $35 = $3; //@line 383 "SIDH_v1.0/ec_isogeny.c"
 $36 = ((($35)) + 768|0); //@line 383 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($34,$36); //@line 383 "SIDH_v1.0/ec_isogeny.c"
 $37 = $3; //@line 384 "SIDH_v1.0/ec_isogeny.c"
 $38 = ((($37)) + 576|0); //@line 384 "SIDH_v1.0/ec_isogeny.c"
 $39 = $3; //@line 384 "SIDH_v1.0/ec_isogeny.c"
 $40 = ((($39)) + 576|0); //@line 384 "SIDH_v1.0/ec_isogeny.c"
 $41 = $1; //@line 384 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($38,$40,$41); //@line 384 "SIDH_v1.0/ec_isogeny.c"
 $42 = $3; //@line 385 "SIDH_v1.0/ec_isogeny.c"
 $43 = $3; //@line 385 "SIDH_v1.0/ec_isogeny.c"
 $44 = ((($43)) + 192|0); //@line 385 "SIDH_v1.0/ec_isogeny.c"
 $45 = $3; //@line 385 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($42,$44,$45); //@line 385 "SIDH_v1.0/ec_isogeny.c"
 $46 = $1; //@line 386 "SIDH_v1.0/ec_isogeny.c"
 $47 = $3; //@line 386 "SIDH_v1.0/ec_isogeny.c"
 $48 = ((($47)) + 768|0); //@line 386 "SIDH_v1.0/ec_isogeny.c"
 $49 = $1; //@line 386 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($46,$48,$49); //@line 386 "SIDH_v1.0/ec_isogeny.c"
 $50 = $3; //@line 387 "SIDH_v1.0/ec_isogeny.c"
 $51 = ((($50)) + 768|0); //@line 387 "SIDH_v1.0/ec_isogeny.c"
 $52 = $2; //@line 387 "SIDH_v1.0/ec_isogeny.c"
 _fp2copy751($51,$52); //@line 387 "SIDH_v1.0/ec_isogeny.c"
 $53 = $1; //@line 388 "SIDH_v1.0/ec_isogeny.c"
 $54 = $1; //@line 388 "SIDH_v1.0/ec_isogeny.c"
 $55 = $1; //@line 388 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($53,$54,$55); //@line 388 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 389 "SIDH_v1.0/ec_isogeny.c"
}
function _eval_4_isog($P,$coeff) {
 $P = $P|0;
 $coeff = $coeff|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $t0 = 0, $t1 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 400|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 192|0;
 $t1 = sp;
 $0 = $P;
 $1 = $coeff;
 $2 = $0; //@line 399 "SIDH_v1.0/ec_isogeny.c"
 $3 = $1; //@line 399 "SIDH_v1.0/ec_isogeny.c"
 $4 = $0; //@line 399 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($2,$3,$4); //@line 399 "SIDH_v1.0/ec_isogeny.c"
 $5 = $0; //@line 400 "SIDH_v1.0/ec_isogeny.c"
 $6 = ((($5)) + 192|0); //@line 400 "SIDH_v1.0/ec_isogeny.c"
 $7 = $1; //@line 400 "SIDH_v1.0/ec_isogeny.c"
 $8 = ((($7)) + 192|0); //@line 400 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($6,$8,$t0); //@line 400 "SIDH_v1.0/ec_isogeny.c"
 $9 = $0; //@line 401 "SIDH_v1.0/ec_isogeny.c"
 $10 = $0; //@line 401 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($9,$t0,$10); //@line 401 "SIDH_v1.0/ec_isogeny.c"
 $11 = $0; //@line 402 "SIDH_v1.0/ec_isogeny.c"
 $12 = ((($11)) + 192|0); //@line 402 "SIDH_v1.0/ec_isogeny.c"
 $13 = $1; //@line 402 "SIDH_v1.0/ec_isogeny.c"
 $14 = ((($13)) + 384|0); //@line 402 "SIDH_v1.0/ec_isogeny.c"
 $15 = $0; //@line 402 "SIDH_v1.0/ec_isogeny.c"
 $16 = ((($15)) + 192|0); //@line 402 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($12,$14,$16); //@line 402 "SIDH_v1.0/ec_isogeny.c"
 $17 = $0; //@line 403 "SIDH_v1.0/ec_isogeny.c"
 $18 = $0; //@line 403 "SIDH_v1.0/ec_isogeny.c"
 $19 = ((($18)) + 192|0); //@line 403 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($17,$19,$t0); //@line 403 "SIDH_v1.0/ec_isogeny.c"
 $20 = $0; //@line 404 "SIDH_v1.0/ec_isogeny.c"
 $21 = ((($20)) + 192|0); //@line 404 "SIDH_v1.0/ec_isogeny.c"
 $22 = $0; //@line 404 "SIDH_v1.0/ec_isogeny.c"
 $23 = $0; //@line 404 "SIDH_v1.0/ec_isogeny.c"
 $24 = ((($23)) + 192|0); //@line 404 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($21,$22,$24); //@line 404 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t0,$t0); //@line 405 "SIDH_v1.0/ec_isogeny.c"
 $25 = $0; //@line 406 "SIDH_v1.0/ec_isogeny.c"
 $26 = ((($25)) + 192|0); //@line 406 "SIDH_v1.0/ec_isogeny.c"
 $27 = $0; //@line 406 "SIDH_v1.0/ec_isogeny.c"
 $28 = ((($27)) + 192|0); //@line 406 "SIDH_v1.0/ec_isogeny.c"
 $29 = $0; //@line 406 "SIDH_v1.0/ec_isogeny.c"
 $30 = ((($29)) + 192|0); //@line 406 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($26,$28,$30); //@line 406 "SIDH_v1.0/ec_isogeny.c"
 $31 = $0; //@line 407 "SIDH_v1.0/ec_isogeny.c"
 $32 = ((($31)) + 192|0); //@line 407 "SIDH_v1.0/ec_isogeny.c"
 $33 = $0; //@line 407 "SIDH_v1.0/ec_isogeny.c"
 $34 = ((($33)) + 192|0); //@line 407 "SIDH_v1.0/ec_isogeny.c"
 $35 = $0; //@line 407 "SIDH_v1.0/ec_isogeny.c"
 $36 = ((($35)) + 192|0); //@line 407 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($32,$34,$36); //@line 407 "SIDH_v1.0/ec_isogeny.c"
 $37 = $0; //@line 408 "SIDH_v1.0/ec_isogeny.c"
 $38 = ((($37)) + 192|0); //@line 408 "SIDH_v1.0/ec_isogeny.c"
 $39 = $0; //@line 408 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($38,$t0,$39); //@line 408 "SIDH_v1.0/ec_isogeny.c"
 $40 = $0; //@line 409 "SIDH_v1.0/ec_isogeny.c"
 $41 = ((($40)) + 192|0); //@line 409 "SIDH_v1.0/ec_isogeny.c"
 $42 = $0; //@line 409 "SIDH_v1.0/ec_isogeny.c"
 $43 = ((($42)) + 192|0); //@line 409 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($41,$t0,$43); //@line 409 "SIDH_v1.0/ec_isogeny.c"
 $44 = $0; //@line 410 "SIDH_v1.0/ec_isogeny.c"
 $45 = ((($44)) + 192|0); //@line 410 "SIDH_v1.0/ec_isogeny.c"
 $46 = $1; //@line 410 "SIDH_v1.0/ec_isogeny.c"
 $47 = ((($46)) + 768|0); //@line 410 "SIDH_v1.0/ec_isogeny.c"
 $48 = $0; //@line 410 "SIDH_v1.0/ec_isogeny.c"
 $49 = ((($48)) + 192|0); //@line 410 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($45,$47,$49); //@line 410 "SIDH_v1.0/ec_isogeny.c"
 $50 = $1; //@line 411 "SIDH_v1.0/ec_isogeny.c"
 $51 = ((($50)) + 768|0); //@line 411 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t0,$51,$t0); //@line 411 "SIDH_v1.0/ec_isogeny.c"
 $52 = $0; //@line 412 "SIDH_v1.0/ec_isogeny.c"
 $53 = $1; //@line 412 "SIDH_v1.0/ec_isogeny.c"
 $54 = ((($53)) + 576|0); //@line 412 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($52,$54,$t1); //@line 412 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t0,$t1,$t0); //@line 413 "SIDH_v1.0/ec_isogeny.c"
 $55 = $0; //@line 414 "SIDH_v1.0/ec_isogeny.c"
 $56 = $0; //@line 414 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($55,$t0,$56); //@line 414 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 415 "SIDH_v1.0/ec_isogeny.c"
}
function _first_4_isog($P,$A,$Aout,$Cout,$CurveIsogeny) {
 $P = $P|0;
 $A = $A|0;
 $Aout = $Aout|0;
 $Cout = $Cout|0;
 $CurveIsogeny = $CurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $t0 = 0, $t1 = 0, $t2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 608|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 384|0;
 $t1 = sp + 192|0;
 $t2 = sp;
 $0 = $P;
 $1 = $A;
 $2 = $Aout;
 $3 = $Cout;
 $4 = $CurveIsogeny;
 _memset(($t0|0),0,192)|0; //@line 422 "SIDH_v1.0/ec_isogeny.c"
 $5 = $4; //@line 424 "SIDH_v1.0/ec_isogeny.c"
 $6 = ((($5)) + 80|0); //@line 424 "SIDH_v1.0/ec_isogeny.c"
 $7 = HEAP32[$6>>2]|0; //@line 424 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($7,$t0); //@line 424 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($t0,$t0,$t0); //@line 425 "SIDH_v1.0/ec_isogeny.c"
 $8 = $1; //@line 426 "SIDH_v1.0/ec_isogeny.c"
 $9 = $3; //@line 426 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($8,$t0,$9); //@line 426 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($t0,$t0,$t1); //@line 427 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($t0,$t1,$t0); //@line 428 "SIDH_v1.0/ec_isogeny.c"
 $10 = $0; //@line 429 "SIDH_v1.0/ec_isogeny.c"
 $11 = $0; //@line 429 "SIDH_v1.0/ec_isogeny.c"
 $12 = ((($11)) + 192|0); //@line 429 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($10,$12,$t1); //@line 429 "SIDH_v1.0/ec_isogeny.c"
 $13 = $0; //@line 430 "SIDH_v1.0/ec_isogeny.c"
 $14 = $0; //@line 430 "SIDH_v1.0/ec_isogeny.c"
 $15 = ((($14)) + 192|0); //@line 430 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($13,$15,$t2); //@line 430 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t1,$t1); //@line 431 "SIDH_v1.0/ec_isogeny.c"
 $16 = $1; //@line 432 "SIDH_v1.0/ec_isogeny.c"
 $17 = $2; //@line 432 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($16,$t0,$17); //@line 432 "SIDH_v1.0/ec_isogeny.c"
 $18 = $0; //@line 433 "SIDH_v1.0/ec_isogeny.c"
 $19 = $0; //@line 433 "SIDH_v1.0/ec_isogeny.c"
 $20 = ((($19)) + 192|0); //@line 433 "SIDH_v1.0/ec_isogeny.c"
 $21 = $0; //@line 433 "SIDH_v1.0/ec_isogeny.c"
 $22 = ((($21)) + 192|0); //@line 433 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($18,$20,$22); //@line 433 "SIDH_v1.0/ec_isogeny.c"
 $23 = $0; //@line 434 "SIDH_v1.0/ec_isogeny.c"
 $24 = ((($23)) + 192|0); //@line 434 "SIDH_v1.0/ec_isogeny.c"
 _fp2neg751($24); //@line 434 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t2,$t2); //@line 435 "SIDH_v1.0/ec_isogeny.c"
 $25 = $0; //@line 436 "SIDH_v1.0/ec_isogeny.c"
 $26 = ((($25)) + 192|0); //@line 436 "SIDH_v1.0/ec_isogeny.c"
 $27 = $3; //@line 436 "SIDH_v1.0/ec_isogeny.c"
 $28 = $0; //@line 436 "SIDH_v1.0/ec_isogeny.c"
 $29 = ((($28)) + 192|0); //@line 436 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($26,$27,$29); //@line 436 "SIDH_v1.0/ec_isogeny.c"
 $30 = $2; //@line 437 "SIDH_v1.0/ec_isogeny.c"
 $31 = $2; //@line 437 "SIDH_v1.0/ec_isogeny.c"
 $32 = $2; //@line 437 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($30,$31,$32); //@line 437 "SIDH_v1.0/ec_isogeny.c"
 $33 = $0; //@line 438 "SIDH_v1.0/ec_isogeny.c"
 $34 = ((($33)) + 192|0); //@line 438 "SIDH_v1.0/ec_isogeny.c"
 $35 = $0; //@line 438 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t1,$34,$35); //@line 438 "SIDH_v1.0/ec_isogeny.c"
 $36 = $0; //@line 439 "SIDH_v1.0/ec_isogeny.c"
 $37 = ((($36)) + 192|0); //@line 439 "SIDH_v1.0/ec_isogeny.c"
 $38 = $0; //@line 439 "SIDH_v1.0/ec_isogeny.c"
 $39 = ((($38)) + 192|0); //@line 439 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($37,$t2,$39); //@line 439 "SIDH_v1.0/ec_isogeny.c"
 $40 = $0; //@line 440 "SIDH_v1.0/ec_isogeny.c"
 $41 = $0; //@line 440 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($40,$t1,$41); //@line 440 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 441 "SIDH_v1.0/ec_isogeny.c"
}
function _xTPL($P,$Q,$A,$C) {
 $P = $P|0;
 $Q = $Q|0;
 $A = $A|0;
 $C = $C|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $t0 = 0;
 var $t1 = 0, $t2 = 0, $t3 = 0, $t4 = 0, $t5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1168|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 960|0;
 $t1 = sp + 768|0;
 $t2 = sp + 576|0;
 $t3 = sp + 384|0;
 $t4 = sp + 192|0;
 $t5 = sp;
 $0 = $P;
 $1 = $Q;
 $2 = $A;
 $3 = $C;
 $4 = $0; //@line 450 "SIDH_v1.0/ec_isogeny.c"
 $5 = $0; //@line 450 "SIDH_v1.0/ec_isogeny.c"
 $6 = ((($5)) + 192|0); //@line 450 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($4,$6,$t2); //@line 450 "SIDH_v1.0/ec_isogeny.c"
 $7 = $0; //@line 451 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($7,$t0); //@line 451 "SIDH_v1.0/ec_isogeny.c"
 $8 = $0; //@line 452 "SIDH_v1.0/ec_isogeny.c"
 $9 = ((($8)) + 192|0); //@line 452 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($9,$t1); //@line 452 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t2,$t2); //@line 453 "SIDH_v1.0/ec_isogeny.c"
 $10 = $3; //@line 454 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t0,$10,$t3); //@line 454 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t2,$t0,$t2); //@line 455 "SIDH_v1.0/ec_isogeny.c"
 $11 = $3; //@line 456 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t1,$11,$t4); //@line 456 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t2,$t1,$t2); //@line 457 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t3,$t4,$t5); //@line 458 "SIDH_v1.0/ec_isogeny.c"
 $12 = $2; //@line 459 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t2,$12,$t2); //@line 459 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t3,$t3,$t3); //@line 460 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t4,$t4,$t4); //@line 461 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t3,$t2,$t3); //@line 462 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t4,$t2,$t4); //@line 463 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t3,$t5,$t3); //@line 464 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t4,$t5,$t4); //@line 465 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t0,$t1,$t2); //@line 466 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t0,$t0,$t0); //@line 467 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t1,$t1,$t1); //@line 468 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t2,$t5,$t2); //@line 469 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t1,$t3,$t1); //@line 470 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t0,$t4,$t0); //@line 471 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t1,$t2,$t1); //@line 472 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t0,$t2,$t0); //@line 473 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t1,$t1); //@line 474 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t0,$t0); //@line 475 "SIDH_v1.0/ec_isogeny.c"
 $13 = $0; //@line 476 "SIDH_v1.0/ec_isogeny.c"
 $14 = $1; //@line 476 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($13,$t1,$14); //@line 476 "SIDH_v1.0/ec_isogeny.c"
 $15 = $0; //@line 477 "SIDH_v1.0/ec_isogeny.c"
 $16 = ((($15)) + 192|0); //@line 477 "SIDH_v1.0/ec_isogeny.c"
 $17 = $1; //@line 477 "SIDH_v1.0/ec_isogeny.c"
 $18 = ((($17)) + 192|0); //@line 477 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($16,$t0,$18); //@line 477 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 478 "SIDH_v1.0/ec_isogeny.c"
}
function _xTPLe($P,$Q,$A,$C,$e) {
 $P = $P|0;
 $Q = $Q|0;
 $A = $A|0;
 $C = $C|0;
 $e = $e|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $P;
 $1 = $Q;
 $2 = $A;
 $3 = $C;
 $4 = $e;
 $5 = $0; //@line 487 "SIDH_v1.0/ec_isogeny.c"
 $6 = $1; //@line 487 "SIDH_v1.0/ec_isogeny.c"
 _copy_words($5,$6,96); //@line 487 "SIDH_v1.0/ec_isogeny.c"
 $i = 0; //@line 489 "SIDH_v1.0/ec_isogeny.c"
 while(1) {
  $7 = $i; //@line 489 "SIDH_v1.0/ec_isogeny.c"
  $8 = $4; //@line 489 "SIDH_v1.0/ec_isogeny.c"
  $9 = ($7|0)<($8|0); //@line 489 "SIDH_v1.0/ec_isogeny.c"
  if (!($9)) {
   break;
  }
  $10 = $1; //@line 490 "SIDH_v1.0/ec_isogeny.c"
  $11 = $1; //@line 490 "SIDH_v1.0/ec_isogeny.c"
  $12 = $2; //@line 490 "SIDH_v1.0/ec_isogeny.c"
  $13 = $3; //@line 490 "SIDH_v1.0/ec_isogeny.c"
  _xTPL($10,$11,$12,$13); //@line 490 "SIDH_v1.0/ec_isogeny.c"
  $14 = $i; //@line 489 "SIDH_v1.0/ec_isogeny.c"
  $15 = (($14) + 1)|0; //@line 489 "SIDH_v1.0/ec_isogeny.c"
  $i = $15; //@line 489 "SIDH_v1.0/ec_isogeny.c"
 }
 STACKTOP = sp;return; //@line 492 "SIDH_v1.0/ec_isogeny.c"
}
function _get_3_isog($P,$A,$C) {
 $P = $P|0;
 $A = $A|0;
 $C = $C|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $t0 = 0;
 var $t1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 400|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 192|0;
 $t1 = sp;
 $0 = $P;
 $1 = $A;
 $2 = $C;
 $3 = $0; //@line 501 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($3,$t0); //@line 501 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t0,$t0,$t1); //@line 502 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t0,$t1,$t0); //@line 503 "SIDH_v1.0/ec_isogeny.c"
 $4 = $0; //@line 504 "SIDH_v1.0/ec_isogeny.c"
 $5 = ((($4)) + 192|0); //@line 504 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($5,$t1); //@line 504 "SIDH_v1.0/ec_isogeny.c"
 $6 = $1; //@line 505 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t1,$6); //@line 505 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t1,$t1,$t1); //@line 506 "SIDH_v1.0/ec_isogeny.c"
 $7 = $2; //@line 507 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($t1,$t1,$7); //@line 507 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t0,$t1,$t1); //@line 508 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t0,$t1,$t1); //@line 509 "SIDH_v1.0/ec_isogeny.c"
 $8 = $1; //@line 510 "SIDH_v1.0/ec_isogeny.c"
 $9 = $1; //@line 510 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($8,$t1,$9); //@line 510 "SIDH_v1.0/ec_isogeny.c"
 $10 = $1; //@line 511 "SIDH_v1.0/ec_isogeny.c"
 $11 = $1; //@line 511 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($10,$t1,$11); //@line 511 "SIDH_v1.0/ec_isogeny.c"
 $12 = $1; //@line 512 "SIDH_v1.0/ec_isogeny.c"
 $13 = $1; //@line 512 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($12,$t1,$13); //@line 512 "SIDH_v1.0/ec_isogeny.c"
 $14 = $0; //@line 513 "SIDH_v1.0/ec_isogeny.c"
 $15 = $0; //@line 513 "SIDH_v1.0/ec_isogeny.c"
 $16 = ((($15)) + 192|0); //@line 513 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($14,$16,$t1); //@line 513 "SIDH_v1.0/ec_isogeny.c"
 $17 = $2; //@line 514 "SIDH_v1.0/ec_isogeny.c"
 $18 = $2; //@line 514 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($17,$t1,$18); //@line 514 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 515 "SIDH_v1.0/ec_isogeny.c"
}
function _eval_3_isog($P,$Q) {
 $P = $P|0;
 $Q = $Q|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $t0 = 0, $t1 = 0, $t2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 592|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 384|0;
 $t1 = sp + 192|0;
 $t2 = sp;
 $0 = $P;
 $1 = $Q;
 $2 = $0; //@line 524 "SIDH_v1.0/ec_isogeny.c"
 $3 = $1; //@line 524 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($2,$3,$t0); //@line 524 "SIDH_v1.0/ec_isogeny.c"
 $4 = $0; //@line 525 "SIDH_v1.0/ec_isogeny.c"
 $5 = ((($4)) + 192|0); //@line 525 "SIDH_v1.0/ec_isogeny.c"
 $6 = $1; //@line 525 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($5,$6,$t1); //@line 525 "SIDH_v1.0/ec_isogeny.c"
 $7 = $0; //@line 526 "SIDH_v1.0/ec_isogeny.c"
 $8 = ((($7)) + 192|0); //@line 526 "SIDH_v1.0/ec_isogeny.c"
 $9 = $1; //@line 526 "SIDH_v1.0/ec_isogeny.c"
 $10 = ((($9)) + 192|0); //@line 526 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($8,$10,$t2); //@line 526 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t0,$t2,$t0); //@line 527 "SIDH_v1.0/ec_isogeny.c"
 $11 = $0; //@line 528 "SIDH_v1.0/ec_isogeny.c"
 $12 = $1; //@line 528 "SIDH_v1.0/ec_isogeny.c"
 $13 = ((($12)) + 192|0); //@line 528 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($11,$13,$t2); //@line 528 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($t1,$t2,$t1); //@line 529 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t0,$t0); //@line 530 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($t1,$t1); //@line 531 "SIDH_v1.0/ec_isogeny.c"
 $14 = $1; //@line 532 "SIDH_v1.0/ec_isogeny.c"
 $15 = $1; //@line 532 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($14,$t0,$15); //@line 532 "SIDH_v1.0/ec_isogeny.c"
 $16 = $1; //@line 533 "SIDH_v1.0/ec_isogeny.c"
 $17 = ((($16)) + 192|0); //@line 533 "SIDH_v1.0/ec_isogeny.c"
 $18 = $1; //@line 533 "SIDH_v1.0/ec_isogeny.c"
 $19 = ((($18)) + 192|0); //@line 533 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($17,$t1,$19); //@line 533 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 534 "SIDH_v1.0/ec_isogeny.c"
}
function _inv_4_way($z1,$z2,$z3,$z4) {
 $z1 = $z1|0;
 $z2 = $z2|0;
 $z3 = $z3|0;
 $z4 = $z4|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $t0 = 0, $t1 = 0, $t2 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 592|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 384|0;
 $t1 = sp + 192|0;
 $t2 = sp;
 $0 = $z1;
 $1 = $z2;
 $2 = $z3;
 $3 = $z4;
 $4 = $0; //@line 543 "SIDH_v1.0/ec_isogeny.c"
 $5 = $1; //@line 543 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($4,$5,$t0); //@line 543 "SIDH_v1.0/ec_isogeny.c"
 $6 = $2; //@line 544 "SIDH_v1.0/ec_isogeny.c"
 $7 = $3; //@line 544 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($6,$7,$t1); //@line 544 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t0,$t1,$t2); //@line 545 "SIDH_v1.0/ec_isogeny.c"
 _fp2inv751_mont($t2); //@line 546 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t0,$t2,$t0); //@line 547 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t1,$t2,$t1); //@line 548 "SIDH_v1.0/ec_isogeny.c"
 $8 = $2; //@line 549 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t0,$8,$t2); //@line 549 "SIDH_v1.0/ec_isogeny.c"
 $9 = $3; //@line 550 "SIDH_v1.0/ec_isogeny.c"
 $10 = $2; //@line 550 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($t0,$9,$10); //@line 550 "SIDH_v1.0/ec_isogeny.c"
 $11 = $3; //@line 551 "SIDH_v1.0/ec_isogeny.c"
 _fp2copy751($t2,$11); //@line 551 "SIDH_v1.0/ec_isogeny.c"
 $12 = $0; //@line 552 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($12,$t1,$t2); //@line 552 "SIDH_v1.0/ec_isogeny.c"
 $13 = $1; //@line 553 "SIDH_v1.0/ec_isogeny.c"
 $14 = $0; //@line 553 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($13,$t1,$14); //@line 553 "SIDH_v1.0/ec_isogeny.c"
 $15 = $1; //@line 554 "SIDH_v1.0/ec_isogeny.c"
 _fp2copy751($t2,$15); //@line 554 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 555 "SIDH_v1.0/ec_isogeny.c"
}
function _distort_and_diff($xP,$D,$CurveIsogeny) {
 $xP = $xP|0;
 $D = $D|0;
 $CurveIsogeny = $CurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $one = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $one = sp;
 $0 = $xP;
 $1 = $D;
 $2 = $CurveIsogeny;
 $3 = $2; //@line 564 "SIDH_v1.0/ec_isogeny.c"
 $4 = ((($3)) + 80|0); //@line 564 "SIDH_v1.0/ec_isogeny.c"
 $5 = HEAP32[$4>>2]|0; //@line 564 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($5,$one); //@line 564 "SIDH_v1.0/ec_isogeny.c"
 $6 = $0; //@line 565 "SIDH_v1.0/ec_isogeny.c"
 $7 = $1; //@line 565 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($6,$7); //@line 565 "SIDH_v1.0/ec_isogeny.c"
 $8 = $1; //@line 566 "SIDH_v1.0/ec_isogeny.c"
 $9 = $1; //@line 566 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($8,$one,$9); //@line 566 "SIDH_v1.0/ec_isogeny.c"
 $10 = $1; //@line 567 "SIDH_v1.0/ec_isogeny.c"
 $11 = $1; //@line 567 "SIDH_v1.0/ec_isogeny.c"
 $12 = ((($11)) + 96|0); //@line 567 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($10,$12); //@line 567 "SIDH_v1.0/ec_isogeny.c"
 $13 = $1; //@line 568 "SIDH_v1.0/ec_isogeny.c"
 _fpzero751($13); //@line 568 "SIDH_v1.0/ec_isogeny.c"
 $14 = $0; //@line 569 "SIDH_v1.0/ec_isogeny.c"
 $15 = $0; //@line 569 "SIDH_v1.0/ec_isogeny.c"
 $16 = $1; //@line 569 "SIDH_v1.0/ec_isogeny.c"
 $17 = ((($16)) + 192|0); //@line 569 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($14,$15,$17); //@line 569 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 570 "SIDH_v1.0/ec_isogeny.c"
}
function _fpcopy751($a,$c) {
 $a = $a|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $c;
 $i = 0; //@line 31 "SIDH_v1.0/fpx.c"
 while(1) {
  $2 = $i; //@line 31 "SIDH_v1.0/fpx.c"
  $3 = ($2>>>0)<(24); //@line 31 "SIDH_v1.0/fpx.c"
  if (!($3)) {
   break;
  }
  $4 = $i; //@line 32 "SIDH_v1.0/fpx.c"
  $5 = $0; //@line 32 "SIDH_v1.0/fpx.c"
  $6 = (($5) + ($4<<2)|0); //@line 32 "SIDH_v1.0/fpx.c"
  $7 = HEAP32[$6>>2]|0; //@line 32 "SIDH_v1.0/fpx.c"
  $8 = $i; //@line 32 "SIDH_v1.0/fpx.c"
  $9 = $1; //@line 32 "SIDH_v1.0/fpx.c"
  $10 = (($9) + ($8<<2)|0); //@line 32 "SIDH_v1.0/fpx.c"
  HEAP32[$10>>2] = $7; //@line 32 "SIDH_v1.0/fpx.c"
  $11 = $i; //@line 31 "SIDH_v1.0/fpx.c"
  $12 = (($11) + 1)|0; //@line 31 "SIDH_v1.0/fpx.c"
  $i = $12; //@line 31 "SIDH_v1.0/fpx.c"
 }
 STACKTOP = sp;return; //@line 33 "SIDH_v1.0/fpx.c"
}
function _fpzero751($a) {
 $a = $a|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $i = 0; //@line 40 "SIDH_v1.0/fpx.c"
 while(1) {
  $1 = $i; //@line 40 "SIDH_v1.0/fpx.c"
  $2 = ($1>>>0)<(24); //@line 40 "SIDH_v1.0/fpx.c"
  if (!($2)) {
   break;
  }
  $3 = $i; //@line 41 "SIDH_v1.0/fpx.c"
  $4 = $0; //@line 41 "SIDH_v1.0/fpx.c"
  $5 = (($4) + ($3<<2)|0); //@line 41 "SIDH_v1.0/fpx.c"
  HEAP32[$5>>2] = 0; //@line 41 "SIDH_v1.0/fpx.c"
  $6 = $i; //@line 40 "SIDH_v1.0/fpx.c"
  $7 = (($6) + 1)|0; //@line 40 "SIDH_v1.0/fpx.c"
  $i = $7; //@line 40 "SIDH_v1.0/fpx.c"
 }
 STACKTOP = sp;return; //@line 42 "SIDH_v1.0/fpx.c"
}
function _to_mont($a,$mc) {
 $a = $a|0;
 $mc = $mc|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $mc;
 $2 = $0; //@line 50 "SIDH_v1.0/fpx.c"
 $3 = $1; //@line 50 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($2,2840,$3); //@line 50 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 51 "SIDH_v1.0/fpx.c"
}
function _fpmul751_mont($ma,$mb,$mc) {
 $ma = $ma|0;
 $mb = $mb|0;
 $mc = $mc|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $temp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $temp = sp;
 $0 = $ma;
 $1 = $mb;
 $2 = $mc;
 _memset(($temp|0),0,192)|0; //@line 173 "SIDH_v1.0/fpx.c"
 $3 = $0; //@line 175 "SIDH_v1.0/fpx.c"
 $4 = $1; //@line 175 "SIDH_v1.0/fpx.c"
 _mp_mul($3,$4,$temp,24); //@line 175 "SIDH_v1.0/fpx.c"
 $5 = $2; //@line 176 "SIDH_v1.0/fpx.c"
 _rdc_mont($temp,$5); //@line 176 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 177 "SIDH_v1.0/fpx.c"
}
function _from_mont($ma,$c) {
 $ma = $ma|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $one = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $one = sp;
 $0 = $ma;
 $1 = $c;
 dest=$one; stop=dest+96|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0)); //@line 57 "SIDH_v1.0/fpx.c"
 HEAP32[$one>>2] = 1; //@line 59 "SIDH_v1.0/fpx.c"
 $2 = $0; //@line 60 "SIDH_v1.0/fpx.c"
 $3 = $1; //@line 60 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($2,$one,$3); //@line 60 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 61 "SIDH_v1.0/fpx.c"
}
function _copy_words($a,$c,$nwords) {
 $a = $a|0;
 $c = $c|0;
 $nwords = $nwords|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $c;
 $2 = $nwords;
 $i = 0; //@line 104 "SIDH_v1.0/fpx.c"
 while(1) {
  $3 = $i; //@line 104 "SIDH_v1.0/fpx.c"
  $4 = $2; //@line 104 "SIDH_v1.0/fpx.c"
  $5 = ($3>>>0)<($4>>>0); //@line 104 "SIDH_v1.0/fpx.c"
  if (!($5)) {
   break;
  }
  $6 = $i; //@line 105 "SIDH_v1.0/fpx.c"
  $7 = $0; //@line 105 "SIDH_v1.0/fpx.c"
  $8 = (($7) + ($6<<2)|0); //@line 105 "SIDH_v1.0/fpx.c"
  $9 = HEAP32[$8>>2]|0; //@line 105 "SIDH_v1.0/fpx.c"
  $10 = $i; //@line 105 "SIDH_v1.0/fpx.c"
  $11 = $1; //@line 105 "SIDH_v1.0/fpx.c"
  $12 = (($11) + ($10<<2)|0); //@line 105 "SIDH_v1.0/fpx.c"
  HEAP32[$12>>2] = $9; //@line 105 "SIDH_v1.0/fpx.c"
  $13 = $i; //@line 104 "SIDH_v1.0/fpx.c"
  $14 = (($13) + 1)|0; //@line 104 "SIDH_v1.0/fpx.c"
  $i = $14; //@line 104 "SIDH_v1.0/fpx.c"
 }
 STACKTOP = sp;return; //@line 107 "SIDH_v1.0/fpx.c"
}
function _mp_sub($a,$b,$c,$nwords) {
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 $nwords = $nwords|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $borrow = 0, $borrowReg = 0, $i = 0, $tempReg = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $b;
 $2 = $c;
 $3 = $nwords;
 $borrow = 0; //@line 112 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 114 "SIDH_v1.0/fpx.c"
 while(1) {
  $4 = $i; //@line 114 "SIDH_v1.0/fpx.c"
  $5 = $3; //@line 114 "SIDH_v1.0/fpx.c"
  $6 = ($4>>>0)<($5>>>0); //@line 114 "SIDH_v1.0/fpx.c"
  if (!($6)) {
   break;
  }
  $7 = $i; //@line 115 "SIDH_v1.0/fpx.c"
  $8 = $0; //@line 115 "SIDH_v1.0/fpx.c"
  $9 = (($8) + ($7<<2)|0); //@line 115 "SIDH_v1.0/fpx.c"
  $10 = HEAP32[$9>>2]|0; //@line 115 "SIDH_v1.0/fpx.c"
  $11 = $i; //@line 115 "SIDH_v1.0/fpx.c"
  $12 = $1; //@line 115 "SIDH_v1.0/fpx.c"
  $13 = (($12) + ($11<<2)|0); //@line 115 "SIDH_v1.0/fpx.c"
  $14 = HEAP32[$13>>2]|0; //@line 115 "SIDH_v1.0/fpx.c"
  $15 = (($10) - ($14))|0; //@line 115 "SIDH_v1.0/fpx.c"
  $tempReg = $15; //@line 115 "SIDH_v1.0/fpx.c"
  $16 = $i; //@line 115 "SIDH_v1.0/fpx.c"
  $17 = $0; //@line 115 "SIDH_v1.0/fpx.c"
  $18 = (($17) + ($16<<2)|0); //@line 115 "SIDH_v1.0/fpx.c"
  $19 = HEAP32[$18>>2]|0; //@line 115 "SIDH_v1.0/fpx.c"
  $20 = $i; //@line 115 "SIDH_v1.0/fpx.c"
  $21 = $1; //@line 115 "SIDH_v1.0/fpx.c"
  $22 = (($21) + ($20<<2)|0); //@line 115 "SIDH_v1.0/fpx.c"
  $23 = HEAP32[$22>>2]|0; //@line 115 "SIDH_v1.0/fpx.c"
  $24 = (_is_digit_lessthan_ct($19,$23)|0); //@line 115 "SIDH_v1.0/fpx.c"
  $25 = $borrow; //@line 115 "SIDH_v1.0/fpx.c"
  $26 = $tempReg; //@line 115 "SIDH_v1.0/fpx.c"
  $27 = (_is_digit_zero_ct($26)|0); //@line 115 "SIDH_v1.0/fpx.c"
  $28 = $25 & $27; //@line 115 "SIDH_v1.0/fpx.c"
  $29 = $24 | $28; //@line 115 "SIDH_v1.0/fpx.c"
  $borrowReg = $29; //@line 115 "SIDH_v1.0/fpx.c"
  $30 = $tempReg; //@line 115 "SIDH_v1.0/fpx.c"
  $31 = $borrow; //@line 115 "SIDH_v1.0/fpx.c"
  $32 = (($30) - ($31))|0; //@line 115 "SIDH_v1.0/fpx.c"
  $33 = $i; //@line 115 "SIDH_v1.0/fpx.c"
  $34 = $2; //@line 115 "SIDH_v1.0/fpx.c"
  $35 = (($34) + ($33<<2)|0); //@line 115 "SIDH_v1.0/fpx.c"
  HEAP32[$35>>2] = $32; //@line 115 "SIDH_v1.0/fpx.c"
  $36 = $borrowReg; //@line 115 "SIDH_v1.0/fpx.c"
  $borrow = $36; //@line 115 "SIDH_v1.0/fpx.c"
  $37 = $i; //@line 114 "SIDH_v1.0/fpx.c"
  $38 = (($37) + 1)|0; //@line 114 "SIDH_v1.0/fpx.c"
  $i = $38; //@line 114 "SIDH_v1.0/fpx.c"
 }
 $39 = $borrow; //@line 118 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return ($39|0); //@line 118 "SIDH_v1.0/fpx.c"
}
function _mp_add($a,$b,$c,$nwords) {
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 $nwords = $nwords|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $carry = 0, $i = 0, $tempReg = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $b;
 $2 = $c;
 $3 = $nwords;
 $carry = 0; //@line 124 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 126 "SIDH_v1.0/fpx.c"
 while(1) {
  $4 = $i; //@line 126 "SIDH_v1.0/fpx.c"
  $5 = $3; //@line 126 "SIDH_v1.0/fpx.c"
  $6 = ($4>>>0)<($5>>>0); //@line 126 "SIDH_v1.0/fpx.c"
  if (!($6)) {
   break;
  }
  $7 = $i; //@line 127 "SIDH_v1.0/fpx.c"
  $8 = $0; //@line 127 "SIDH_v1.0/fpx.c"
  $9 = (($8) + ($7<<2)|0); //@line 127 "SIDH_v1.0/fpx.c"
  $10 = HEAP32[$9>>2]|0; //@line 127 "SIDH_v1.0/fpx.c"
  $11 = $carry; //@line 127 "SIDH_v1.0/fpx.c"
  $12 = (($10) + ($11))|0; //@line 127 "SIDH_v1.0/fpx.c"
  $tempReg = $12; //@line 127 "SIDH_v1.0/fpx.c"
  $13 = $i; //@line 127 "SIDH_v1.0/fpx.c"
  $14 = $1; //@line 127 "SIDH_v1.0/fpx.c"
  $15 = (($14) + ($13<<2)|0); //@line 127 "SIDH_v1.0/fpx.c"
  $16 = HEAP32[$15>>2]|0; //@line 127 "SIDH_v1.0/fpx.c"
  $17 = $tempReg; //@line 127 "SIDH_v1.0/fpx.c"
  $18 = (($16) + ($17))|0; //@line 127 "SIDH_v1.0/fpx.c"
  $19 = $i; //@line 127 "SIDH_v1.0/fpx.c"
  $20 = $2; //@line 127 "SIDH_v1.0/fpx.c"
  $21 = (($20) + ($19<<2)|0); //@line 127 "SIDH_v1.0/fpx.c"
  HEAP32[$21>>2] = $18; //@line 127 "SIDH_v1.0/fpx.c"
  $22 = $tempReg; //@line 127 "SIDH_v1.0/fpx.c"
  $23 = $carry; //@line 127 "SIDH_v1.0/fpx.c"
  $24 = (_is_digit_lessthan_ct($22,$23)|0); //@line 127 "SIDH_v1.0/fpx.c"
  $25 = $i; //@line 127 "SIDH_v1.0/fpx.c"
  $26 = $2; //@line 127 "SIDH_v1.0/fpx.c"
  $27 = (($26) + ($25<<2)|0); //@line 127 "SIDH_v1.0/fpx.c"
  $28 = HEAP32[$27>>2]|0; //@line 127 "SIDH_v1.0/fpx.c"
  $29 = $tempReg; //@line 127 "SIDH_v1.0/fpx.c"
  $30 = (_is_digit_lessthan_ct($28,$29)|0); //@line 127 "SIDH_v1.0/fpx.c"
  $31 = $24 | $30; //@line 127 "SIDH_v1.0/fpx.c"
  $carry = $31; //@line 127 "SIDH_v1.0/fpx.c"
  $32 = $i; //@line 126 "SIDH_v1.0/fpx.c"
  $33 = (($32) + 1)|0; //@line 126 "SIDH_v1.0/fpx.c"
  $i = $33; //@line 126 "SIDH_v1.0/fpx.c"
 }
 $34 = $carry; //@line 130 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return ($34|0); //@line 130 "SIDH_v1.0/fpx.c"
}
function _mp_shiftr1($x,$nwords) {
 $x = $x|0;
 $nwords = $nwords|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $nwords;
 $i = 0; //@line 138 "SIDH_v1.0/fpx.c"
 while(1) {
  $2 = $i; //@line 138 "SIDH_v1.0/fpx.c"
  $3 = $1; //@line 138 "SIDH_v1.0/fpx.c"
  $4 = (($3) - 1)|0; //@line 138 "SIDH_v1.0/fpx.c"
  $5 = ($2>>>0)<($4>>>0); //@line 138 "SIDH_v1.0/fpx.c"
  if (!($5)) {
   break;
  }
  $6 = $i; //@line 139 "SIDH_v1.0/fpx.c"
  $7 = $0; //@line 139 "SIDH_v1.0/fpx.c"
  $8 = (($7) + ($6<<2)|0); //@line 139 "SIDH_v1.0/fpx.c"
  $9 = HEAP32[$8>>2]|0; //@line 139 "SIDH_v1.0/fpx.c"
  $10 = $9 >>> 1; //@line 139 "SIDH_v1.0/fpx.c"
  $11 = $i; //@line 139 "SIDH_v1.0/fpx.c"
  $12 = (($11) + 1)|0; //@line 139 "SIDH_v1.0/fpx.c"
  $13 = $0; //@line 139 "SIDH_v1.0/fpx.c"
  $14 = (($13) + ($12<<2)|0); //@line 139 "SIDH_v1.0/fpx.c"
  $15 = HEAP32[$14>>2]|0; //@line 139 "SIDH_v1.0/fpx.c"
  $16 = $15 << 31; //@line 139 "SIDH_v1.0/fpx.c"
  $17 = $10 ^ $16; //@line 139 "SIDH_v1.0/fpx.c"
  $18 = $i; //@line 139 "SIDH_v1.0/fpx.c"
  $19 = $0; //@line 139 "SIDH_v1.0/fpx.c"
  $20 = (($19) + ($18<<2)|0); //@line 139 "SIDH_v1.0/fpx.c"
  HEAP32[$20>>2] = $17; //@line 139 "SIDH_v1.0/fpx.c"
  $21 = $i; //@line 138 "SIDH_v1.0/fpx.c"
  $22 = (($21) + 1)|0; //@line 138 "SIDH_v1.0/fpx.c"
  $i = $22; //@line 138 "SIDH_v1.0/fpx.c"
 }
 $23 = $1; //@line 141 "SIDH_v1.0/fpx.c"
 $24 = (($23) - 1)|0; //@line 141 "SIDH_v1.0/fpx.c"
 $25 = $0; //@line 141 "SIDH_v1.0/fpx.c"
 $26 = (($25) + ($24<<2)|0); //@line 141 "SIDH_v1.0/fpx.c"
 $27 = HEAP32[$26>>2]|0; //@line 141 "SIDH_v1.0/fpx.c"
 $28 = $27 >>> 1; //@line 141 "SIDH_v1.0/fpx.c"
 HEAP32[$26>>2] = $28; //@line 141 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 142 "SIDH_v1.0/fpx.c"
}
function _mp_shiftl1($x,$nwords) {
 $x = $x|0;
 $nwords = $nwords|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $nwords;
 $2 = $1; //@line 149 "SIDH_v1.0/fpx.c"
 $3 = (($2) - 1)|0; //@line 149 "SIDH_v1.0/fpx.c"
 $i = $3; //@line 149 "SIDH_v1.0/fpx.c"
 while(1) {
  $4 = $i; //@line 149 "SIDH_v1.0/fpx.c"
  $5 = ($4|0)>(0); //@line 149 "SIDH_v1.0/fpx.c"
  if (!($5)) {
   break;
  }
  $6 = $i; //@line 150 "SIDH_v1.0/fpx.c"
  $7 = $0; //@line 150 "SIDH_v1.0/fpx.c"
  $8 = (($7) + ($6<<2)|0); //@line 150 "SIDH_v1.0/fpx.c"
  $9 = HEAP32[$8>>2]|0; //@line 150 "SIDH_v1.0/fpx.c"
  $10 = $9 << 1; //@line 150 "SIDH_v1.0/fpx.c"
  $11 = $i; //@line 150 "SIDH_v1.0/fpx.c"
  $12 = (($11) - 1)|0; //@line 150 "SIDH_v1.0/fpx.c"
  $13 = $0; //@line 150 "SIDH_v1.0/fpx.c"
  $14 = (($13) + ($12<<2)|0); //@line 150 "SIDH_v1.0/fpx.c"
  $15 = HEAP32[$14>>2]|0; //@line 150 "SIDH_v1.0/fpx.c"
  $16 = $15 >>> 31; //@line 150 "SIDH_v1.0/fpx.c"
  $17 = $10 ^ $16; //@line 150 "SIDH_v1.0/fpx.c"
  $18 = $i; //@line 150 "SIDH_v1.0/fpx.c"
  $19 = $0; //@line 150 "SIDH_v1.0/fpx.c"
  $20 = (($19) + ($18<<2)|0); //@line 150 "SIDH_v1.0/fpx.c"
  HEAP32[$20>>2] = $17; //@line 150 "SIDH_v1.0/fpx.c"
  $21 = $i; //@line 149 "SIDH_v1.0/fpx.c"
  $22 = (($21) + -1)|0; //@line 149 "SIDH_v1.0/fpx.c"
  $i = $22; //@line 149 "SIDH_v1.0/fpx.c"
 }
 $23 = $0; //@line 152 "SIDH_v1.0/fpx.c"
 $24 = HEAP32[$23>>2]|0; //@line 152 "SIDH_v1.0/fpx.c"
 $25 = $24 << 1; //@line 152 "SIDH_v1.0/fpx.c"
 HEAP32[$23>>2] = $25; //@line 152 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 153 "SIDH_v1.0/fpx.c"
}
function _fpsqr751_mont($ma,$mc) {
 $ma = $ma|0;
 $mc = $mc|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $temp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $temp = sp;
 $0 = $ma;
 $1 = $mc;
 _memset(($temp|0),0,192)|0; //@line 182 "SIDH_v1.0/fpx.c"
 $2 = $0; //@line 184 "SIDH_v1.0/fpx.c"
 $3 = $0; //@line 184 "SIDH_v1.0/fpx.c"
 _mp_mul($2,$3,$temp,24); //@line 184 "SIDH_v1.0/fpx.c"
 $4 = $1; //@line 185 "SIDH_v1.0/fpx.c"
 _rdc_mont($temp,$4); //@line 185 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 186 "SIDH_v1.0/fpx.c"
}
function _fpinv751_mont($a) {
 $a = $a|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $34 = 0, $35 = 0;
 var $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0;
 var $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0;
 var $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0;
 var $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $i = 0, $j = 0, $t = 0, $tt = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 2704|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t = sp + 104|0;
 $tt = sp + 8|0;
 $0 = $a;
 $1 = $0; //@line 195 "SIDH_v1.0/fpx.c"
 _fpsqr751_mont($1,$tt); //@line 195 "SIDH_v1.0/fpx.c"
 $2 = $0; //@line 196 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($2,$tt,$t); //@line 196 "SIDH_v1.0/fpx.c"
 $3 = ((($t)) + 96|0); //@line 197 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($t,$tt,$3); //@line 197 "SIDH_v1.0/fpx.c"
 $4 = ((($t)) + 96|0); //@line 198 "SIDH_v1.0/fpx.c"
 $5 = ((($t)) + 192|0); //@line 198 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($4,$tt,$5); //@line 198 "SIDH_v1.0/fpx.c"
 $6 = ((($t)) + 192|0); //@line 199 "SIDH_v1.0/fpx.c"
 $7 = ((($t)) + 288|0); //@line 199 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($6,$tt,$7); //@line 199 "SIDH_v1.0/fpx.c"
 $8 = ((($t)) + 288|0); //@line 200 "SIDH_v1.0/fpx.c"
 $9 = ((($t)) + 288|0); //@line 200 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($8,$tt,$9); //@line 200 "SIDH_v1.0/fpx.c"
 $i = 3; //@line 201 "SIDH_v1.0/fpx.c"
 while(1) {
  $10 = $i; //@line 201 "SIDH_v1.0/fpx.c"
  $11 = ($10>>>0)<=(8); //@line 201 "SIDH_v1.0/fpx.c"
  if (!($11)) {
   break;
  }
  $12 = $i; //@line 201 "SIDH_v1.0/fpx.c"
  $13 = (($t) + (($12*96)|0)|0); //@line 201 "SIDH_v1.0/fpx.c"
  $14 = $i; //@line 201 "SIDH_v1.0/fpx.c"
  $15 = (($14) + 1)|0; //@line 201 "SIDH_v1.0/fpx.c"
  $16 = (($t) + (($15*96)|0)|0); //@line 201 "SIDH_v1.0/fpx.c"
  _fpmul751_mont($13,$tt,$16); //@line 201 "SIDH_v1.0/fpx.c"
  $17 = $i; //@line 201 "SIDH_v1.0/fpx.c"
  $18 = (($17) + 1)|0; //@line 201 "SIDH_v1.0/fpx.c"
  $i = $18; //@line 201 "SIDH_v1.0/fpx.c"
 }
 $19 = ((($t)) + 864|0); //@line 202 "SIDH_v1.0/fpx.c"
 $20 = ((($t)) + 864|0); //@line 202 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($19,$tt,$20); //@line 202 "SIDH_v1.0/fpx.c"
 $i = 9; //@line 203 "SIDH_v1.0/fpx.c"
 while(1) {
  $21 = $i; //@line 203 "SIDH_v1.0/fpx.c"
  $22 = ($21>>>0)<=(20); //@line 203 "SIDH_v1.0/fpx.c"
  if (!($22)) {
   break;
  }
  $23 = $i; //@line 203 "SIDH_v1.0/fpx.c"
  $24 = (($t) + (($23*96)|0)|0); //@line 203 "SIDH_v1.0/fpx.c"
  $25 = $i; //@line 203 "SIDH_v1.0/fpx.c"
  $26 = (($25) + 1)|0; //@line 203 "SIDH_v1.0/fpx.c"
  $27 = (($t) + (($26*96)|0)|0); //@line 203 "SIDH_v1.0/fpx.c"
  _fpmul751_mont($24,$tt,$27); //@line 203 "SIDH_v1.0/fpx.c"
  $28 = $i; //@line 203 "SIDH_v1.0/fpx.c"
  $29 = (($28) + 1)|0; //@line 203 "SIDH_v1.0/fpx.c"
  $i = $29; //@line 203 "SIDH_v1.0/fpx.c"
 }
 $30 = ((($t)) + 2016|0); //@line 204 "SIDH_v1.0/fpx.c"
 $31 = ((($t)) + 2016|0); //@line 204 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($30,$tt,$31); //@line 204 "SIDH_v1.0/fpx.c"
 $i = 21; //@line 205 "SIDH_v1.0/fpx.c"
 while(1) {
  $32 = $i; //@line 205 "SIDH_v1.0/fpx.c"
  $33 = ($32>>>0)<=(24); //@line 205 "SIDH_v1.0/fpx.c"
  if (!($33)) {
   break;
  }
  $34 = $i; //@line 205 "SIDH_v1.0/fpx.c"
  $35 = (($t) + (($34*96)|0)|0); //@line 205 "SIDH_v1.0/fpx.c"
  $36 = $i; //@line 205 "SIDH_v1.0/fpx.c"
  $37 = (($36) + 1)|0; //@line 205 "SIDH_v1.0/fpx.c"
  $38 = (($t) + (($37*96)|0)|0); //@line 205 "SIDH_v1.0/fpx.c"
  _fpmul751_mont($35,$tt,$38); //@line 205 "SIDH_v1.0/fpx.c"
  $39 = $i; //@line 205 "SIDH_v1.0/fpx.c"
  $40 = (($39) + 1)|0; //@line 205 "SIDH_v1.0/fpx.c"
  $i = $40; //@line 205 "SIDH_v1.0/fpx.c"
 }
 $41 = ((($t)) + 2400|0); //@line 206 "SIDH_v1.0/fpx.c"
 $42 = ((($t)) + 2400|0); //@line 206 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($41,$tt,$42); //@line 206 "SIDH_v1.0/fpx.c"
 $43 = ((($t)) + 2400|0); //@line 207 "SIDH_v1.0/fpx.c"
 $44 = ((($t)) + 2496|0); //@line 207 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($43,$tt,$44); //@line 207 "SIDH_v1.0/fpx.c"
 $45 = $0; //@line 209 "SIDH_v1.0/fpx.c"
 _fpcopy751($45,$tt); //@line 209 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 210 "SIDH_v1.0/fpx.c"
 while(1) {
  $46 = $i; //@line 210 "SIDH_v1.0/fpx.c"
  $47 = ($46>>>0)<(6); //@line 210 "SIDH_v1.0/fpx.c"
  if (!($47)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 210 "SIDH_v1.0/fpx.c"
  $48 = $i; //@line 210 "SIDH_v1.0/fpx.c"
  $49 = (($48) + 1)|0; //@line 210 "SIDH_v1.0/fpx.c"
  $i = $49; //@line 210 "SIDH_v1.0/fpx.c"
 }
 $50 = ((($t)) + 1920|0); //@line 211 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($50,$tt,$tt); //@line 211 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 212 "SIDH_v1.0/fpx.c"
 while(1) {
  $51 = $i; //@line 212 "SIDH_v1.0/fpx.c"
  $52 = ($51>>>0)<(6); //@line 212 "SIDH_v1.0/fpx.c"
  if (!($52)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 212 "SIDH_v1.0/fpx.c"
  $53 = $i; //@line 212 "SIDH_v1.0/fpx.c"
  $54 = (($53) + 1)|0; //@line 212 "SIDH_v1.0/fpx.c"
  $i = $54; //@line 212 "SIDH_v1.0/fpx.c"
 }
 $55 = ((($t)) + 2304|0); //@line 213 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($55,$tt,$tt); //@line 213 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 214 "SIDH_v1.0/fpx.c"
 while(1) {
  $56 = $i; //@line 214 "SIDH_v1.0/fpx.c"
  $57 = ($56>>>0)<(6); //@line 214 "SIDH_v1.0/fpx.c"
  if (!($57)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 214 "SIDH_v1.0/fpx.c"
  $58 = $i; //@line 214 "SIDH_v1.0/fpx.c"
  $59 = (($58) + 1)|0; //@line 214 "SIDH_v1.0/fpx.c"
  $i = $59; //@line 214 "SIDH_v1.0/fpx.c"
 }
 $60 = ((($t)) + 1056|0); //@line 215 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($60,$tt,$tt); //@line 215 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 216 "SIDH_v1.0/fpx.c"
 while(1) {
  $61 = $i; //@line 216 "SIDH_v1.0/fpx.c"
  $62 = ($61>>>0)<(6); //@line 216 "SIDH_v1.0/fpx.c"
  if (!($62)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 216 "SIDH_v1.0/fpx.c"
  $63 = $i; //@line 216 "SIDH_v1.0/fpx.c"
  $64 = (($63) + 1)|0; //@line 216 "SIDH_v1.0/fpx.c"
  $i = $64; //@line 216 "SIDH_v1.0/fpx.c"
 }
 $65 = ((($t)) + 768|0); //@line 217 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($65,$tt,$tt); //@line 217 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 218 "SIDH_v1.0/fpx.c"
 while(1) {
  $66 = $i; //@line 218 "SIDH_v1.0/fpx.c"
  $67 = ($66>>>0)<(8); //@line 218 "SIDH_v1.0/fpx.c"
  if (!($67)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 218 "SIDH_v1.0/fpx.c"
  $68 = $i; //@line 218 "SIDH_v1.0/fpx.c"
  $69 = (($68) + 1)|0; //@line 218 "SIDH_v1.0/fpx.c"
  $i = $69; //@line 218 "SIDH_v1.0/fpx.c"
 }
 $70 = ((($t)) + 192|0); //@line 219 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($70,$tt,$tt); //@line 219 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 220 "SIDH_v1.0/fpx.c"
 while(1) {
  $71 = $i; //@line 220 "SIDH_v1.0/fpx.c"
  $72 = ($71>>>0)<(6); //@line 220 "SIDH_v1.0/fpx.c"
  if (!($72)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 220 "SIDH_v1.0/fpx.c"
  $73 = $i; //@line 220 "SIDH_v1.0/fpx.c"
  $74 = (($73) + 1)|0; //@line 220 "SIDH_v1.0/fpx.c"
  $i = $74; //@line 220 "SIDH_v1.0/fpx.c"
 }
 $75 = ((($t)) + 2208|0); //@line 221 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($75,$tt,$tt); //@line 221 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 222 "SIDH_v1.0/fpx.c"
 while(1) {
  $76 = $i; //@line 222 "SIDH_v1.0/fpx.c"
  $77 = ($76>>>0)<(6); //@line 222 "SIDH_v1.0/fpx.c"
  if (!($77)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 222 "SIDH_v1.0/fpx.c"
  $78 = $i; //@line 222 "SIDH_v1.0/fpx.c"
  $79 = (($78) + 1)|0; //@line 222 "SIDH_v1.0/fpx.c"
  $i = $79; //@line 222 "SIDH_v1.0/fpx.c"
 }
 $80 = ((($t)) + 192|0); //@line 223 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($80,$tt,$tt); //@line 223 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 224 "SIDH_v1.0/fpx.c"
 while(1) {
  $81 = $i; //@line 224 "SIDH_v1.0/fpx.c"
  $82 = ($81>>>0)<(9); //@line 224 "SIDH_v1.0/fpx.c"
  if (!($82)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 224 "SIDH_v1.0/fpx.c"
  $83 = $i; //@line 224 "SIDH_v1.0/fpx.c"
  $84 = (($83) + 1)|0; //@line 224 "SIDH_v1.0/fpx.c"
  $i = $84; //@line 224 "SIDH_v1.0/fpx.c"
 }
 $85 = ((($t)) + 192|0); //@line 225 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($85,$tt,$tt); //@line 225 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 226 "SIDH_v1.0/fpx.c"
 while(1) {
  $86 = $i; //@line 226 "SIDH_v1.0/fpx.c"
  $87 = ($86>>>0)<(10); //@line 226 "SIDH_v1.0/fpx.c"
  if (!($87)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 226 "SIDH_v1.0/fpx.c"
  $88 = $i; //@line 226 "SIDH_v1.0/fpx.c"
  $89 = (($88) + 1)|0; //@line 226 "SIDH_v1.0/fpx.c"
  $i = $89; //@line 226 "SIDH_v1.0/fpx.c"
 }
 $90 = ((($t)) + 1440|0); //@line 227 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($90,$tt,$tt); //@line 227 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 228 "SIDH_v1.0/fpx.c"
 while(1) {
  $91 = $i; //@line 228 "SIDH_v1.0/fpx.c"
  $92 = ($91>>>0)<(8); //@line 228 "SIDH_v1.0/fpx.c"
  if (!($92)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 228 "SIDH_v1.0/fpx.c"
  $93 = $i; //@line 228 "SIDH_v1.0/fpx.c"
  $94 = (($93) + 1)|0; //@line 228 "SIDH_v1.0/fpx.c"
  $i = $94; //@line 228 "SIDH_v1.0/fpx.c"
 }
 $95 = ((($t)) + 1248|0); //@line 229 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($95,$tt,$tt); //@line 229 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 230 "SIDH_v1.0/fpx.c"
 while(1) {
  $96 = $i; //@line 230 "SIDH_v1.0/fpx.c"
  $97 = ($96>>>0)<(8); //@line 230 "SIDH_v1.0/fpx.c"
  if (!($97)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 230 "SIDH_v1.0/fpx.c"
  $98 = $i; //@line 230 "SIDH_v1.0/fpx.c"
  $99 = (($98) + 1)|0; //@line 230 "SIDH_v1.0/fpx.c"
  $i = $99; //@line 230 "SIDH_v1.0/fpx.c"
 }
 $100 = ((($t)) + 2496|0); //@line 231 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($100,$tt,$tt); //@line 231 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 232 "SIDH_v1.0/fpx.c"
 while(1) {
  $101 = $i; //@line 232 "SIDH_v1.0/fpx.c"
  $102 = ($101>>>0)<(8); //@line 232 "SIDH_v1.0/fpx.c"
  if (!($102)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 232 "SIDH_v1.0/fpx.c"
  $103 = $i; //@line 232 "SIDH_v1.0/fpx.c"
  $104 = (($103) + 1)|0; //@line 232 "SIDH_v1.0/fpx.c"
  $i = $104; //@line 232 "SIDH_v1.0/fpx.c"
 }
 $105 = ((($t)) + 1920|0); //@line 233 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($105,$tt,$tt); //@line 233 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 234 "SIDH_v1.0/fpx.c"
 while(1) {
  $106 = $i; //@line 234 "SIDH_v1.0/fpx.c"
  $107 = ($106>>>0)<(6); //@line 234 "SIDH_v1.0/fpx.c"
  if (!($107)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 234 "SIDH_v1.0/fpx.c"
  $108 = $i; //@line 234 "SIDH_v1.0/fpx.c"
  $109 = (($108) + 1)|0; //@line 234 "SIDH_v1.0/fpx.c"
  $i = $109; //@line 234 "SIDH_v1.0/fpx.c"
 }
 $110 = ((($t)) + 1056|0); //@line 235 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($110,$tt,$tt); //@line 235 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 236 "SIDH_v1.0/fpx.c"
 while(1) {
  $111 = $i; //@line 236 "SIDH_v1.0/fpx.c"
  $112 = ($111>>>0)<(6); //@line 236 "SIDH_v1.0/fpx.c"
  if (!($112)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 236 "SIDH_v1.0/fpx.c"
  $113 = $i; //@line 236 "SIDH_v1.0/fpx.c"
  $114 = (($113) + 1)|0; //@line 236 "SIDH_v1.0/fpx.c"
  $i = $114; //@line 236 "SIDH_v1.0/fpx.c"
 }
 $115 = ((($t)) + 960|0); //@line 237 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($115,$tt,$tt); //@line 237 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 238 "SIDH_v1.0/fpx.c"
 while(1) {
  $116 = $i; //@line 238 "SIDH_v1.0/fpx.c"
  $117 = ($116>>>0)<(6); //@line 238 "SIDH_v1.0/fpx.c"
  if (!($117)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 238 "SIDH_v1.0/fpx.c"
  $118 = $i; //@line 238 "SIDH_v1.0/fpx.c"
  $119 = (($118) + 1)|0; //@line 238 "SIDH_v1.0/fpx.c"
  $i = $119; //@line 238 "SIDH_v1.0/fpx.c"
 }
 $120 = ((($t)) + 1344|0); //@line 239 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($120,$tt,$tt); //@line 239 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 240 "SIDH_v1.0/fpx.c"
 while(1) {
  $121 = $i; //@line 240 "SIDH_v1.0/fpx.c"
  $122 = ($121>>>0)<(6); //@line 240 "SIDH_v1.0/fpx.c"
  if (!($122)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 240 "SIDH_v1.0/fpx.c"
  $123 = $i; //@line 240 "SIDH_v1.0/fpx.c"
  $124 = (($123) + 1)|0; //@line 240 "SIDH_v1.0/fpx.c"
  $i = $124; //@line 240 "SIDH_v1.0/fpx.c"
 }
 $125 = ((($t)) + 384|0); //@line 241 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($125,$tt,$tt); //@line 241 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 242 "SIDH_v1.0/fpx.c"
 while(1) {
  $126 = $i; //@line 242 "SIDH_v1.0/fpx.c"
  $127 = ($126>>>0)<(10); //@line 242 "SIDH_v1.0/fpx.c"
  if (!($127)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 242 "SIDH_v1.0/fpx.c"
  $128 = $i; //@line 242 "SIDH_v1.0/fpx.c"
  $129 = (($128) + 1)|0; //@line 242 "SIDH_v1.0/fpx.c"
  $i = $129; //@line 242 "SIDH_v1.0/fpx.c"
 }
 $130 = ((($t)) + 1728|0); //@line 243 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($130,$tt,$tt); //@line 243 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 244 "SIDH_v1.0/fpx.c"
 while(1) {
  $131 = $i; //@line 244 "SIDH_v1.0/fpx.c"
  $132 = ($131>>>0)<(6); //@line 244 "SIDH_v1.0/fpx.c"
  if (!($132)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 244 "SIDH_v1.0/fpx.c"
  $133 = $i; //@line 244 "SIDH_v1.0/fpx.c"
  $134 = (($133) + 1)|0; //@line 244 "SIDH_v1.0/fpx.c"
  $i = $134; //@line 244 "SIDH_v1.0/fpx.c"
 }
 $135 = ((($t)) + 96|0); //@line 245 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($135,$tt,$tt); //@line 245 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 246 "SIDH_v1.0/fpx.c"
 while(1) {
  $136 = $i; //@line 246 "SIDH_v1.0/fpx.c"
  $137 = ($136>>>0)<(7); //@line 246 "SIDH_v1.0/fpx.c"
  if (!($137)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 246 "SIDH_v1.0/fpx.c"
  $138 = $i; //@line 246 "SIDH_v1.0/fpx.c"
  $139 = (($138) + 1)|0; //@line 246 "SIDH_v1.0/fpx.c"
  $i = $139; //@line 246 "SIDH_v1.0/fpx.c"
 }
 $140 = ((($t)) + 2112|0); //@line 247 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($140,$tt,$tt); //@line 247 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 248 "SIDH_v1.0/fpx.c"
 while(1) {
  $141 = $i; //@line 248 "SIDH_v1.0/fpx.c"
  $142 = ($141>>>0)<(10); //@line 248 "SIDH_v1.0/fpx.c"
  if (!($142)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 248 "SIDH_v1.0/fpx.c"
  $143 = $i; //@line 248 "SIDH_v1.0/fpx.c"
  $144 = (($143) + 1)|0; //@line 248 "SIDH_v1.0/fpx.c"
  $i = $144; //@line 248 "SIDH_v1.0/fpx.c"
 }
 $145 = ((($t)) + 576|0); //@line 249 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($145,$tt,$tt); //@line 249 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 250 "SIDH_v1.0/fpx.c"
 while(1) {
  $146 = $i; //@line 250 "SIDH_v1.0/fpx.c"
  $147 = ($146>>>0)<(7); //@line 250 "SIDH_v1.0/fpx.c"
  if (!($147)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 250 "SIDH_v1.0/fpx.c"
  $148 = $i; //@line 250 "SIDH_v1.0/fpx.c"
  $149 = (($148) + 1)|0; //@line 250 "SIDH_v1.0/fpx.c"
  $i = $149; //@line 250 "SIDH_v1.0/fpx.c"
 }
 $150 = ((($t)) + 2304|0); //@line 251 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($150,$tt,$tt); //@line 251 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 252 "SIDH_v1.0/fpx.c"
 while(1) {
  $151 = $i; //@line 252 "SIDH_v1.0/fpx.c"
  $152 = ($151>>>0)<(6); //@line 252 "SIDH_v1.0/fpx.c"
  if (!($152)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 252 "SIDH_v1.0/fpx.c"
  $153 = $i; //@line 252 "SIDH_v1.0/fpx.c"
  $154 = (($153) + 1)|0; //@line 252 "SIDH_v1.0/fpx.c"
  $i = $154; //@line 252 "SIDH_v1.0/fpx.c"
 }
 $155 = ((($t)) + 864|0); //@line 253 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($155,$tt,$tt); //@line 253 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 254 "SIDH_v1.0/fpx.c"
 while(1) {
  $156 = $i; //@line 254 "SIDH_v1.0/fpx.c"
  $157 = ($156>>>0)<(8); //@line 254 "SIDH_v1.0/fpx.c"
  if (!($157)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 254 "SIDH_v1.0/fpx.c"
  $158 = $i; //@line 254 "SIDH_v1.0/fpx.c"
  $159 = (($158) + 1)|0; //@line 254 "SIDH_v1.0/fpx.c"
  $i = $159; //@line 254 "SIDH_v1.0/fpx.c"
 }
 $160 = ((($t)) + 1728|0); //@line 255 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($160,$tt,$tt); //@line 255 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 256 "SIDH_v1.0/fpx.c"
 while(1) {
  $161 = $i; //@line 256 "SIDH_v1.0/fpx.c"
  $162 = ($161>>>0)<(6); //@line 256 "SIDH_v1.0/fpx.c"
  if (!($162)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 256 "SIDH_v1.0/fpx.c"
  $163 = $i; //@line 256 "SIDH_v1.0/fpx.c"
  $164 = (($163) + 1)|0; //@line 256 "SIDH_v1.0/fpx.c"
  $i = $164; //@line 256 "SIDH_v1.0/fpx.c"
 }
 $165 = ((($t)) + 1632|0); //@line 257 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($165,$tt,$tt); //@line 257 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 258 "SIDH_v1.0/fpx.c"
 while(1) {
  $166 = $i; //@line 258 "SIDH_v1.0/fpx.c"
  $167 = ($166>>>0)<(8); //@line 258 "SIDH_v1.0/fpx.c"
  if (!($167)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 258 "SIDH_v1.0/fpx.c"
  $168 = $i; //@line 258 "SIDH_v1.0/fpx.c"
  $169 = (($168) + 1)|0; //@line 258 "SIDH_v1.0/fpx.c"
  $i = $169; //@line 258 "SIDH_v1.0/fpx.c"
 }
 $170 = $0; //@line 259 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($170,$tt,$tt); //@line 259 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 260 "SIDH_v1.0/fpx.c"
 while(1) {
  $171 = $i; //@line 260 "SIDH_v1.0/fpx.c"
  $172 = ($171>>>0)<(10); //@line 260 "SIDH_v1.0/fpx.c"
  if (!($172)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 260 "SIDH_v1.0/fpx.c"
  $173 = $i; //@line 260 "SIDH_v1.0/fpx.c"
  $174 = (($173) + 1)|0; //@line 260 "SIDH_v1.0/fpx.c"
  $i = $174; //@line 260 "SIDH_v1.0/fpx.c"
 }
 $175 = ((($t)) + 1536|0); //@line 261 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($175,$tt,$tt); //@line 261 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 262 "SIDH_v1.0/fpx.c"
 while(1) {
  $176 = $i; //@line 262 "SIDH_v1.0/fpx.c"
  $177 = ($176>>>0)<(6); //@line 262 "SIDH_v1.0/fpx.c"
  if (!($177)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 262 "SIDH_v1.0/fpx.c"
  $178 = $i; //@line 262 "SIDH_v1.0/fpx.c"
  $179 = (($178) + 1)|0; //@line 262 "SIDH_v1.0/fpx.c"
  $i = $179; //@line 262 "SIDH_v1.0/fpx.c"
 }
 $180 = ((($t)) + 672|0); //@line 263 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($180,$tt,$tt); //@line 263 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 264 "SIDH_v1.0/fpx.c"
 while(1) {
  $181 = $i; //@line 264 "SIDH_v1.0/fpx.c"
  $182 = ($181>>>0)<(6); //@line 264 "SIDH_v1.0/fpx.c"
  if (!($182)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 264 "SIDH_v1.0/fpx.c"
  $183 = $i; //@line 264 "SIDH_v1.0/fpx.c"
  $184 = (($183) + 1)|0; //@line 264 "SIDH_v1.0/fpx.c"
  $i = $184; //@line 264 "SIDH_v1.0/fpx.c"
 }
 _fpmul751_mont($t,$tt,$tt); //@line 265 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 266 "SIDH_v1.0/fpx.c"
 while(1) {
  $185 = $i; //@line 266 "SIDH_v1.0/fpx.c"
  $186 = ($185>>>0)<(7); //@line 266 "SIDH_v1.0/fpx.c"
  if (!($186)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 266 "SIDH_v1.0/fpx.c"
  $187 = $i; //@line 266 "SIDH_v1.0/fpx.c"
  $188 = (($187) + 1)|0; //@line 266 "SIDH_v1.0/fpx.c"
  $i = $188; //@line 266 "SIDH_v1.0/fpx.c"
 }
 $189 = ((($t)) + 1152|0); //@line 267 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($189,$tt,$tt); //@line 267 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 268 "SIDH_v1.0/fpx.c"
 while(1) {
  $190 = $i; //@line 268 "SIDH_v1.0/fpx.c"
  $191 = ($190>>>0)<(7); //@line 268 "SIDH_v1.0/fpx.c"
  if (!($191)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 268 "SIDH_v1.0/fpx.c"
  $192 = $i; //@line 268 "SIDH_v1.0/fpx.c"
  $193 = (($192) + 1)|0; //@line 268 "SIDH_v1.0/fpx.c"
  $i = $193; //@line 268 "SIDH_v1.0/fpx.c"
 }
 $194 = ((($t)) + 1824|0); //@line 269 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($194,$tt,$tt); //@line 269 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 270 "SIDH_v1.0/fpx.c"
 while(1) {
  $195 = $i; //@line 270 "SIDH_v1.0/fpx.c"
  $196 = ($195>>>0)<(6); //@line 270 "SIDH_v1.0/fpx.c"
  if (!($196)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 270 "SIDH_v1.0/fpx.c"
  $197 = $i; //@line 270 "SIDH_v1.0/fpx.c"
  $198 = (($197) + 1)|0; //@line 270 "SIDH_v1.0/fpx.c"
  $i = $198; //@line 270 "SIDH_v1.0/fpx.c"
 }
 $199 = ((($t)) + 2112|0); //@line 271 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($199,$tt,$tt); //@line 271 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 272 "SIDH_v1.0/fpx.c"
 while(1) {
  $200 = $i; //@line 272 "SIDH_v1.0/fpx.c"
  $201 = ($200>>>0)<(6); //@line 272 "SIDH_v1.0/fpx.c"
  if (!($201)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 272 "SIDH_v1.0/fpx.c"
  $202 = $i; //@line 272 "SIDH_v1.0/fpx.c"
  $203 = (($202) + 1)|0; //@line 272 "SIDH_v1.0/fpx.c"
  $i = $203; //@line 272 "SIDH_v1.0/fpx.c"
 }
 $204 = ((($t)) + 2400|0); //@line 273 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($204,$tt,$tt); //@line 273 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 274 "SIDH_v1.0/fpx.c"
 while(1) {
  $205 = $i; //@line 274 "SIDH_v1.0/fpx.c"
  $206 = ($205>>>0)<(7); //@line 274 "SIDH_v1.0/fpx.c"
  if (!($206)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 274 "SIDH_v1.0/fpx.c"
  $207 = $i; //@line 274 "SIDH_v1.0/fpx.c"
  $208 = (($207) + 1)|0; //@line 274 "SIDH_v1.0/fpx.c"
  $i = $208; //@line 274 "SIDH_v1.0/fpx.c"
 }
 $209 = ((($t)) + 192|0); //@line 275 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($209,$tt,$tt); //@line 275 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 276 "SIDH_v1.0/fpx.c"
 while(1) {
  $210 = $i; //@line 276 "SIDH_v1.0/fpx.c"
  $211 = ($210>>>0)<(6); //@line 276 "SIDH_v1.0/fpx.c"
  if (!($211)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 276 "SIDH_v1.0/fpx.c"
  $212 = $i; //@line 276 "SIDH_v1.0/fpx.c"
  $213 = (($212) + 1)|0; //@line 276 "SIDH_v1.0/fpx.c"
  $i = $213; //@line 276 "SIDH_v1.0/fpx.c"
 }
 $214 = ((($t)) + 960|0); //@line 277 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($214,$tt,$tt); //@line 277 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 278 "SIDH_v1.0/fpx.c"
 while(1) {
  $215 = $i; //@line 278 "SIDH_v1.0/fpx.c"
  $216 = ($215>>>0)<(7); //@line 278 "SIDH_v1.0/fpx.c"
  if (!($216)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 278 "SIDH_v1.0/fpx.c"
  $217 = $i; //@line 278 "SIDH_v1.0/fpx.c"
  $218 = (($217) + 1)|0; //@line 278 "SIDH_v1.0/fpx.c"
  $i = $218; //@line 278 "SIDH_v1.0/fpx.c"
 }
 $219 = ((($t)) + 2112|0); //@line 279 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($219,$tt,$tt); //@line 279 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 280 "SIDH_v1.0/fpx.c"
 while(1) {
  $220 = $i; //@line 280 "SIDH_v1.0/fpx.c"
  $221 = ($220>>>0)<(8); //@line 280 "SIDH_v1.0/fpx.c"
  if (!($221)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 280 "SIDH_v1.0/fpx.c"
  $222 = $i; //@line 280 "SIDH_v1.0/fpx.c"
  $223 = (($222) + 1)|0; //@line 280 "SIDH_v1.0/fpx.c"
  $i = $223; //@line 280 "SIDH_v1.0/fpx.c"
 }
 $224 = ((($t)) + 1728|0); //@line 281 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($224,$tt,$tt); //@line 281 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 282 "SIDH_v1.0/fpx.c"
 while(1) {
  $225 = $i; //@line 282 "SIDH_v1.0/fpx.c"
  $226 = ($225>>>0)<(6); //@line 282 "SIDH_v1.0/fpx.c"
  if (!($226)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 282 "SIDH_v1.0/fpx.c"
  $227 = $i; //@line 282 "SIDH_v1.0/fpx.c"
  $228 = (($227) + 1)|0; //@line 282 "SIDH_v1.0/fpx.c"
  $i = $228; //@line 282 "SIDH_v1.0/fpx.c"
 }
 $229 = ((($t)) + 384|0); //@line 283 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($229,$tt,$tt); //@line 283 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 284 "SIDH_v1.0/fpx.c"
 while(1) {
  $230 = $i; //@line 284 "SIDH_v1.0/fpx.c"
  $231 = ($230>>>0)<(6); //@line 284 "SIDH_v1.0/fpx.c"
  if (!($231)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 284 "SIDH_v1.0/fpx.c"
  $232 = $i; //@line 284 "SIDH_v1.0/fpx.c"
  $233 = (($232) + 1)|0; //@line 284 "SIDH_v1.0/fpx.c"
  $i = $233; //@line 284 "SIDH_v1.0/fpx.c"
 }
 $234 = ((($t)) + 1344|0); //@line 285 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($234,$tt,$tt); //@line 285 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 286 "SIDH_v1.0/fpx.c"
 while(1) {
  $235 = $i; //@line 286 "SIDH_v1.0/fpx.c"
  $236 = ($235>>>0)<(7); //@line 286 "SIDH_v1.0/fpx.c"
  if (!($236)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 286 "SIDH_v1.0/fpx.c"
  $237 = $i; //@line 286 "SIDH_v1.0/fpx.c"
  $238 = (($237) + 1)|0; //@line 286 "SIDH_v1.0/fpx.c"
  $i = $238; //@line 286 "SIDH_v1.0/fpx.c"
 }
 $239 = ((($t)) + 1248|0); //@line 287 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($239,$tt,$tt); //@line 287 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 288 "SIDH_v1.0/fpx.c"
 while(1) {
  $240 = $i; //@line 288 "SIDH_v1.0/fpx.c"
  $241 = ($240>>>0)<(6); //@line 288 "SIDH_v1.0/fpx.c"
  if (!($241)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 288 "SIDH_v1.0/fpx.c"
  $242 = $i; //@line 288 "SIDH_v1.0/fpx.c"
  $243 = (($242) + 1)|0; //@line 288 "SIDH_v1.0/fpx.c"
  $i = $243; //@line 288 "SIDH_v1.0/fpx.c"
 }
 $244 = ((($t)) + 480|0); //@line 289 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($244,$tt,$tt); //@line 289 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 290 "SIDH_v1.0/fpx.c"
 while(1) {
  $245 = $i; //@line 290 "SIDH_v1.0/fpx.c"
  $246 = ($245>>>0)<(6); //@line 290 "SIDH_v1.0/fpx.c"
  if (!($246)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 290 "SIDH_v1.0/fpx.c"
  $247 = $i; //@line 290 "SIDH_v1.0/fpx.c"
  $248 = (($247) + 1)|0; //@line 290 "SIDH_v1.0/fpx.c"
  $i = $248; //@line 290 "SIDH_v1.0/fpx.c"
 }
 $249 = ((($t)) + 2208|0); //@line 291 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($249,$tt,$tt); //@line 291 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 292 "SIDH_v1.0/fpx.c"
 while(1) {
  $250 = $i; //@line 292 "SIDH_v1.0/fpx.c"
  $251 = ($250>>>0)<(6); //@line 292 "SIDH_v1.0/fpx.c"
  if (!($251)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 292 "SIDH_v1.0/fpx.c"
  $252 = $i; //@line 292 "SIDH_v1.0/fpx.c"
  $253 = (($252) + 1)|0; //@line 292 "SIDH_v1.0/fpx.c"
  $i = $253; //@line 292 "SIDH_v1.0/fpx.c"
 }
 $254 = ((($t)) + 2016|0); //@line 293 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($254,$tt,$tt); //@line 293 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 294 "SIDH_v1.0/fpx.c"
 while(1) {
  $255 = $i; //@line 294 "SIDH_v1.0/fpx.c"
  $256 = ($255>>>0)<(6); //@line 294 "SIDH_v1.0/fpx.c"
  if (!($256)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 294 "SIDH_v1.0/fpx.c"
  $257 = $i; //@line 294 "SIDH_v1.0/fpx.c"
  $258 = (($257) + 1)|0; //@line 294 "SIDH_v1.0/fpx.c"
  $i = $258; //@line 294 "SIDH_v1.0/fpx.c"
 }
 $259 = ((($t)) + 192|0); //@line 295 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($259,$tt,$tt); //@line 295 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 296 "SIDH_v1.0/fpx.c"
 while(1) {
  $260 = $i; //@line 296 "SIDH_v1.0/fpx.c"
  $261 = ($260>>>0)<(7); //@line 296 "SIDH_v1.0/fpx.c"
  if (!($261)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 296 "SIDH_v1.0/fpx.c"
  $262 = $i; //@line 296 "SIDH_v1.0/fpx.c"
  $263 = (($262) + 1)|0; //@line 296 "SIDH_v1.0/fpx.c"
  $i = $263; //@line 296 "SIDH_v1.0/fpx.c"
 }
 $264 = ((($t)) + 2208|0); //@line 297 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($264,$tt,$tt); //@line 297 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 298 "SIDH_v1.0/fpx.c"
 while(1) {
  $265 = $i; //@line 298 "SIDH_v1.0/fpx.c"
  $266 = ($265>>>0)<(8); //@line 298 "SIDH_v1.0/fpx.c"
  if (!($266)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 298 "SIDH_v1.0/fpx.c"
  $267 = $i; //@line 298 "SIDH_v1.0/fpx.c"
  $268 = (($267) + 1)|0; //@line 298 "SIDH_v1.0/fpx.c"
  $i = $268; //@line 298 "SIDH_v1.0/fpx.c"
 }
 $269 = ((($t)) + 1152|0); //@line 299 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($269,$tt,$tt); //@line 299 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 300 "SIDH_v1.0/fpx.c"
 while(1) {
  $270 = $i; //@line 300 "SIDH_v1.0/fpx.c"
  $271 = ($270>>>0)<(6); //@line 300 "SIDH_v1.0/fpx.c"
  if (!($271)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 300 "SIDH_v1.0/fpx.c"
  $272 = $i; //@line 300 "SIDH_v1.0/fpx.c"
  $273 = (($272) + 1)|0; //@line 300 "SIDH_v1.0/fpx.c"
  $i = $273; //@line 300 "SIDH_v1.0/fpx.c"
 }
 $274 = ((($t)) + 864|0); //@line 301 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($274,$tt,$tt); //@line 301 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 302 "SIDH_v1.0/fpx.c"
 while(1) {
  $275 = $i; //@line 302 "SIDH_v1.0/fpx.c"
  $276 = ($275>>>0)<(6); //@line 302 "SIDH_v1.0/fpx.c"
  if (!($276)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 302 "SIDH_v1.0/fpx.c"
  $277 = $i; //@line 302 "SIDH_v1.0/fpx.c"
  $278 = (($277) + 1)|0; //@line 302 "SIDH_v1.0/fpx.c"
  $i = $278; //@line 302 "SIDH_v1.0/fpx.c"
 }
 $279 = ((($t)) + 288|0); //@line 303 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($279,$tt,$tt); //@line 303 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 304 "SIDH_v1.0/fpx.c"
 while(1) {
  $280 = $i; //@line 304 "SIDH_v1.0/fpx.c"
  $281 = ($280>>>0)<(7); //@line 304 "SIDH_v1.0/fpx.c"
  if (!($281)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 304 "SIDH_v1.0/fpx.c"
  $282 = $i; //@line 304 "SIDH_v1.0/fpx.c"
  $283 = (($282) + 1)|0; //@line 304 "SIDH_v1.0/fpx.c"
  $i = $283; //@line 304 "SIDH_v1.0/fpx.c"
 }
 $284 = ((($t)) + 1248|0); //@line 305 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($284,$tt,$tt); //@line 305 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 306 "SIDH_v1.0/fpx.c"
 while(1) {
  $285 = $i; //@line 306 "SIDH_v1.0/fpx.c"
  $286 = ($285>>>0)<(7); //@line 306 "SIDH_v1.0/fpx.c"
  if (!($286)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 306 "SIDH_v1.0/fpx.c"
  $287 = $i; //@line 306 "SIDH_v1.0/fpx.c"
  $288 = (($287) + 1)|0; //@line 306 "SIDH_v1.0/fpx.c"
  $i = $288; //@line 306 "SIDH_v1.0/fpx.c"
 }
 $289 = ((($t)) + 1632|0); //@line 307 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($289,$tt,$tt); //@line 307 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 308 "SIDH_v1.0/fpx.c"
 while(1) {
  $290 = $i; //@line 308 "SIDH_v1.0/fpx.c"
  $291 = ($290>>>0)<(8); //@line 308 "SIDH_v1.0/fpx.c"
  if (!($291)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 308 "SIDH_v1.0/fpx.c"
  $292 = $i; //@line 308 "SIDH_v1.0/fpx.c"
  $293 = (($292) + 1)|0; //@line 308 "SIDH_v1.0/fpx.c"
  $i = $293; //@line 308 "SIDH_v1.0/fpx.c"
 }
 $294 = ((($t)) + 2496|0); //@line 309 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($294,$tt,$tt); //@line 309 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 310 "SIDH_v1.0/fpx.c"
 while(1) {
  $295 = $i; //@line 310 "SIDH_v1.0/fpx.c"
  $296 = ($295>>>0)<(8); //@line 310 "SIDH_v1.0/fpx.c"
  if (!($296)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 310 "SIDH_v1.0/fpx.c"
  $297 = $i; //@line 310 "SIDH_v1.0/fpx.c"
  $298 = (($297) + 1)|0; //@line 310 "SIDH_v1.0/fpx.c"
  $i = $298; //@line 310 "SIDH_v1.0/fpx.c"
 }
 $299 = ((($t)) + 480|0); //@line 311 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($299,$tt,$tt); //@line 311 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 312 "SIDH_v1.0/fpx.c"
 while(1) {
  $300 = $i; //@line 312 "SIDH_v1.0/fpx.c"
  $301 = ($300>>>0)<(8); //@line 312 "SIDH_v1.0/fpx.c"
  if (!($301)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 312 "SIDH_v1.0/fpx.c"
  $302 = $i; //@line 312 "SIDH_v1.0/fpx.c"
  $303 = (($302) + 1)|0; //@line 312 "SIDH_v1.0/fpx.c"
  $i = $303; //@line 312 "SIDH_v1.0/fpx.c"
 }
 $304 = ((($t)) + 768|0); //@line 313 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($304,$tt,$tt); //@line 313 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 314 "SIDH_v1.0/fpx.c"
 while(1) {
  $305 = $i; //@line 314 "SIDH_v1.0/fpx.c"
  $306 = ($305>>>0)<(8); //@line 314 "SIDH_v1.0/fpx.c"
  if (!($306)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 314 "SIDH_v1.0/fpx.c"
  $307 = $i; //@line 314 "SIDH_v1.0/fpx.c"
  $308 = (($307) + 1)|0; //@line 314 "SIDH_v1.0/fpx.c"
  $i = $308; //@line 314 "SIDH_v1.0/fpx.c"
 }
 $309 = ((($t)) + 1056|0); //@line 315 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($309,$tt,$tt); //@line 315 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 316 "SIDH_v1.0/fpx.c"
 while(1) {
  $310 = $i; //@line 316 "SIDH_v1.0/fpx.c"
  $311 = ($310>>>0)<(6); //@line 316 "SIDH_v1.0/fpx.c"
  if (!($311)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 316 "SIDH_v1.0/fpx.c"
  $312 = $i; //@line 316 "SIDH_v1.0/fpx.c"
  $313 = (($312) + 1)|0; //@line 316 "SIDH_v1.0/fpx.c"
  $i = $313; //@line 316 "SIDH_v1.0/fpx.c"
 }
 $314 = ((($t)) + 2112|0); //@line 317 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($314,$tt,$tt); //@line 317 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 318 "SIDH_v1.0/fpx.c"
 while(1) {
  $315 = $i; //@line 318 "SIDH_v1.0/fpx.c"
  $316 = ($315>>>0)<(7); //@line 318 "SIDH_v1.0/fpx.c"
  if (!($316)) {
   break;
  }
  _fpsqr751_mont($tt,$tt); //@line 318 "SIDH_v1.0/fpx.c"
  $317 = $i; //@line 318 "SIDH_v1.0/fpx.c"
  $318 = (($317) + 1)|0; //@line 318 "SIDH_v1.0/fpx.c"
  $i = $318; //@line 318 "SIDH_v1.0/fpx.c"
 }
 $j = 0; //@line 319 "SIDH_v1.0/fpx.c"
 while(1) {
  $319 = $j; //@line 319 "SIDH_v1.0/fpx.c"
  $320 = ($319>>>0)<(61); //@line 319 "SIDH_v1.0/fpx.c"
  if (!($320)) {
   break;
  }
  $321 = ((($t)) + 2496|0); //@line 320 "SIDH_v1.0/fpx.c"
  _fpmul751_mont($321,$tt,$tt); //@line 320 "SIDH_v1.0/fpx.c"
  $i = 0; //@line 321 "SIDH_v1.0/fpx.c"
  while(1) {
   $322 = $i; //@line 321 "SIDH_v1.0/fpx.c"
   $323 = ($322>>>0)<(6); //@line 321 "SIDH_v1.0/fpx.c"
   if (!($323)) {
    break;
   }
   _fpsqr751_mont($tt,$tt); //@line 321 "SIDH_v1.0/fpx.c"
   $324 = $i; //@line 321 "SIDH_v1.0/fpx.c"
   $325 = (($324) + 1)|0; //@line 321 "SIDH_v1.0/fpx.c"
   $i = $325; //@line 321 "SIDH_v1.0/fpx.c"
  }
  $326 = $j; //@line 319 "SIDH_v1.0/fpx.c"
  $327 = (($326) + 1)|0; //@line 319 "SIDH_v1.0/fpx.c"
  $j = $327; //@line 319 "SIDH_v1.0/fpx.c"
 }
 $328 = ((($t)) + 2400|0); //@line 323 "SIDH_v1.0/fpx.c"
 $329 = $0; //@line 323 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($328,$tt,$329); //@line 323 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 324 "SIDH_v1.0/fpx.c"
}
function _fp2copy751($a,$c) {
 $a = $a|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $c;
 $2 = $0; //@line 332 "SIDH_v1.0/fpx.c"
 $3 = $1; //@line 332 "SIDH_v1.0/fpx.c"
 _fpcopy751($2,$3); //@line 332 "SIDH_v1.0/fpx.c"
 $4 = $0; //@line 333 "SIDH_v1.0/fpx.c"
 $5 = ((($4)) + 96|0); //@line 333 "SIDH_v1.0/fpx.c"
 $6 = $1; //@line 333 "SIDH_v1.0/fpx.c"
 $7 = ((($6)) + 96|0); //@line 333 "SIDH_v1.0/fpx.c"
 _fpcopy751($5,$7); //@line 333 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 334 "SIDH_v1.0/fpx.c"
}
function _fp2neg751($a) {
 $a = $a|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $0; //@line 346 "SIDH_v1.0/fpx.c"
 _fpneg751($1); //@line 346 "SIDH_v1.0/fpx.c"
 $2 = $0; //@line 347 "SIDH_v1.0/fpx.c"
 $3 = ((($2)) + 96|0); //@line 347 "SIDH_v1.0/fpx.c"
 _fpneg751($3); //@line 347 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 348 "SIDH_v1.0/fpx.c"
}
function _fp2add751($a,$b,$c) {
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $b;
 $2 = $c;
 $3 = $0; //@line 353 "SIDH_v1.0/fpx.c"
 $4 = $1; //@line 353 "SIDH_v1.0/fpx.c"
 $5 = $2; //@line 353 "SIDH_v1.0/fpx.c"
 _fpadd751($3,$4,$5); //@line 353 "SIDH_v1.0/fpx.c"
 $6 = $0; //@line 354 "SIDH_v1.0/fpx.c"
 $7 = ((($6)) + 96|0); //@line 354 "SIDH_v1.0/fpx.c"
 $8 = $1; //@line 354 "SIDH_v1.0/fpx.c"
 $9 = ((($8)) + 96|0); //@line 354 "SIDH_v1.0/fpx.c"
 $10 = $2; //@line 354 "SIDH_v1.0/fpx.c"
 $11 = ((($10)) + 96|0); //@line 354 "SIDH_v1.0/fpx.c"
 _fpadd751($7,$9,$11); //@line 354 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 355 "SIDH_v1.0/fpx.c"
}
function _fp2sub751($a,$b,$c) {
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $b;
 $2 = $c;
 $3 = $0; //@line 360 "SIDH_v1.0/fpx.c"
 $4 = $1; //@line 360 "SIDH_v1.0/fpx.c"
 $5 = $2; //@line 360 "SIDH_v1.0/fpx.c"
 _fpsub751($3,$4,$5); //@line 360 "SIDH_v1.0/fpx.c"
 $6 = $0; //@line 361 "SIDH_v1.0/fpx.c"
 $7 = ((($6)) + 96|0); //@line 361 "SIDH_v1.0/fpx.c"
 $8 = $1; //@line 361 "SIDH_v1.0/fpx.c"
 $9 = ((($8)) + 96|0); //@line 361 "SIDH_v1.0/fpx.c"
 $10 = $2; //@line 361 "SIDH_v1.0/fpx.c"
 $11 = ((($10)) + 96|0); //@line 361 "SIDH_v1.0/fpx.c"
 _fpsub751($7,$9,$11); //@line 361 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 362 "SIDH_v1.0/fpx.c"
}
function _fp2div2_751($a,$c) {
 $a = $a|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $c;
 $2 = $0; //@line 367 "SIDH_v1.0/fpx.c"
 $3 = $1; //@line 367 "SIDH_v1.0/fpx.c"
 _fpdiv2_751($2,$3); //@line 367 "SIDH_v1.0/fpx.c"
 $4 = $0; //@line 368 "SIDH_v1.0/fpx.c"
 $5 = ((($4)) + 96|0); //@line 368 "SIDH_v1.0/fpx.c"
 $6 = $1; //@line 368 "SIDH_v1.0/fpx.c"
 $7 = ((($6)) + 96|0); //@line 368 "SIDH_v1.0/fpx.c"
 _fpdiv2_751($5,$7); //@line 368 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 369 "SIDH_v1.0/fpx.c"
}
function _fp2sqr751_mont($a,$c) {
 $a = $a|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $t1 = 0, $t2 = 0, $t3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 304|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t1 = sp + 192|0;
 $t2 = sp + 96|0;
 $t3 = sp;
 $0 = $a;
 $1 = $c;
 $2 = $0; //@line 376 "SIDH_v1.0/fpx.c"
 $3 = $0; //@line 376 "SIDH_v1.0/fpx.c"
 $4 = ((($3)) + 96|0); //@line 376 "SIDH_v1.0/fpx.c"
 (_mp_add($2,$4,$t1,24)|0); //@line 376 "SIDH_v1.0/fpx.c"
 $5 = $0; //@line 377 "SIDH_v1.0/fpx.c"
 $6 = $0; //@line 377 "SIDH_v1.0/fpx.c"
 $7 = ((($6)) + 96|0); //@line 377 "SIDH_v1.0/fpx.c"
 _fpsub751($5,$7,$t2); //@line 377 "SIDH_v1.0/fpx.c"
 $8 = $0; //@line 378 "SIDH_v1.0/fpx.c"
 $9 = $0; //@line 378 "SIDH_v1.0/fpx.c"
 (_mp_add($8,$9,$t3,24)|0); //@line 378 "SIDH_v1.0/fpx.c"
 $10 = $1; //@line 379 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($t1,$t2,$10); //@line 379 "SIDH_v1.0/fpx.c"
 $11 = $0; //@line 380 "SIDH_v1.0/fpx.c"
 $12 = ((($11)) + 96|0); //@line 380 "SIDH_v1.0/fpx.c"
 $13 = $1; //@line 380 "SIDH_v1.0/fpx.c"
 $14 = ((($13)) + 96|0); //@line 380 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($t3,$12,$14); //@line 380 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 381 "SIDH_v1.0/fpx.c"
}
function _fp2mul751_mont($a,$b,$c) {
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $borrow = 0, $i = 0, $mask = 0, $t1 = 0, $t2 = 0, $tempReg = 0, $tt1 = 0, $tt2 = 0, $tt3 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 800|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t1 = sp + 688|0;
 $t2 = sp + 592|0;
 $tt1 = sp + 400|0;
 $tt2 = sp + 208|0;
 $tt3 = sp + 16|0;
 $0 = $a;
 $1 = $b;
 $2 = $c;
 $3 = $0; //@line 391 "SIDH_v1.0/fpx.c"
 $4 = $1; //@line 391 "SIDH_v1.0/fpx.c"
 _mp_mul($3,$4,$tt1,24); //@line 391 "SIDH_v1.0/fpx.c"
 $5 = $0; //@line 392 "SIDH_v1.0/fpx.c"
 $6 = ((($5)) + 96|0); //@line 392 "SIDH_v1.0/fpx.c"
 $7 = $1; //@line 392 "SIDH_v1.0/fpx.c"
 $8 = ((($7)) + 96|0); //@line 392 "SIDH_v1.0/fpx.c"
 _mp_mul($6,$8,$tt2,24); //@line 392 "SIDH_v1.0/fpx.c"
 $9 = $0; //@line 393 "SIDH_v1.0/fpx.c"
 $10 = $0; //@line 393 "SIDH_v1.0/fpx.c"
 $11 = ((($10)) + 96|0); //@line 393 "SIDH_v1.0/fpx.c"
 (_mp_add($9,$11,$t1,24)|0); //@line 393 "SIDH_v1.0/fpx.c"
 $12 = $1; //@line 394 "SIDH_v1.0/fpx.c"
 $13 = $1; //@line 394 "SIDH_v1.0/fpx.c"
 $14 = ((($13)) + 96|0); //@line 394 "SIDH_v1.0/fpx.c"
 (_mp_add($12,$14,$t2,24)|0); //@line 394 "SIDH_v1.0/fpx.c"
 $15 = (_mp_sub($tt1,$tt2,$tt3,48)|0); //@line 395 "SIDH_v1.0/fpx.c"
 $borrow = $15; //@line 395 "SIDH_v1.0/fpx.c"
 $16 = $borrow; //@line 396 "SIDH_v1.0/fpx.c"
 $17 = (0 - ($16))|0; //@line 396 "SIDH_v1.0/fpx.c"
 $mask = $17; //@line 396 "SIDH_v1.0/fpx.c"
 $borrow = 0; //@line 397 "SIDH_v1.0/fpx.c"
 $i = 0; //@line 398 "SIDH_v1.0/fpx.c"
 while(1) {
  $18 = $i; //@line 398 "SIDH_v1.0/fpx.c"
  $19 = ($18>>>0)<(24); //@line 398 "SIDH_v1.0/fpx.c"
  if (!($19)) {
   break;
  }
  $20 = $i; //@line 399 "SIDH_v1.0/fpx.c"
  $21 = (24 + ($20))|0; //@line 399 "SIDH_v1.0/fpx.c"
  $22 = (($tt3) + ($21<<2)|0); //@line 399 "SIDH_v1.0/fpx.c"
  $23 = HEAP32[$22>>2]|0; //@line 399 "SIDH_v1.0/fpx.c"
  $24 = $borrow; //@line 399 "SIDH_v1.0/fpx.c"
  $25 = (($23) + ($24))|0; //@line 399 "SIDH_v1.0/fpx.c"
  $tempReg = $25; //@line 399 "SIDH_v1.0/fpx.c"
  $26 = $i; //@line 399 "SIDH_v1.0/fpx.c"
  $27 = (2456 + ($26<<2)|0); //@line 399 "SIDH_v1.0/fpx.c"
  $28 = HEAP32[$27>>2]|0; //@line 399 "SIDH_v1.0/fpx.c"
  $29 = $mask; //@line 399 "SIDH_v1.0/fpx.c"
  $30 = $28 & $29; //@line 399 "SIDH_v1.0/fpx.c"
  $31 = $tempReg; //@line 399 "SIDH_v1.0/fpx.c"
  $32 = (($30) + ($31))|0; //@line 399 "SIDH_v1.0/fpx.c"
  $33 = $i; //@line 399 "SIDH_v1.0/fpx.c"
  $34 = (24 + ($33))|0; //@line 399 "SIDH_v1.0/fpx.c"
  $35 = (($tt3) + ($34<<2)|0); //@line 399 "SIDH_v1.0/fpx.c"
  HEAP32[$35>>2] = $32; //@line 399 "SIDH_v1.0/fpx.c"
  $36 = $tempReg; //@line 399 "SIDH_v1.0/fpx.c"
  $37 = $borrow; //@line 399 "SIDH_v1.0/fpx.c"
  $38 = (_is_digit_lessthan_ct($36,$37)|0); //@line 399 "SIDH_v1.0/fpx.c"
  $39 = $i; //@line 399 "SIDH_v1.0/fpx.c"
  $40 = (24 + ($39))|0; //@line 399 "SIDH_v1.0/fpx.c"
  $41 = (($tt3) + ($40<<2)|0); //@line 399 "SIDH_v1.0/fpx.c"
  $42 = HEAP32[$41>>2]|0; //@line 399 "SIDH_v1.0/fpx.c"
  $43 = $tempReg; //@line 399 "SIDH_v1.0/fpx.c"
  $44 = (_is_digit_lessthan_ct($42,$43)|0); //@line 399 "SIDH_v1.0/fpx.c"
  $45 = $38 | $44; //@line 399 "SIDH_v1.0/fpx.c"
  $borrow = $45; //@line 399 "SIDH_v1.0/fpx.c"
  $46 = $i; //@line 398 "SIDH_v1.0/fpx.c"
  $47 = (($46) + 1)|0; //@line 398 "SIDH_v1.0/fpx.c"
  $i = $47; //@line 398 "SIDH_v1.0/fpx.c"
 }
 $48 = $2; //@line 401 "SIDH_v1.0/fpx.c"
 _rdc_mont($tt3,$48); //@line 401 "SIDH_v1.0/fpx.c"
 (_mp_add($tt1,$tt2,$tt1,48)|0); //@line 402 "SIDH_v1.0/fpx.c"
 _mp_mul($t1,$t2,$tt2,24); //@line 403 "SIDH_v1.0/fpx.c"
 (_mp_sub($tt2,$tt1,$tt2,48)|0); //@line 404 "SIDH_v1.0/fpx.c"
 $49 = $2; //@line 405 "SIDH_v1.0/fpx.c"
 $50 = ((($49)) + 96|0); //@line 405 "SIDH_v1.0/fpx.c"
 _rdc_mont($tt2,$50); //@line 405 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 406 "SIDH_v1.0/fpx.c"
}
function _to_fp2mont($a,$mc) {
 $a = $a|0;
 $mc = $mc|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $mc;
 $2 = $0; //@line 413 "SIDH_v1.0/fpx.c"
 $3 = $1; //@line 413 "SIDH_v1.0/fpx.c"
 _to_mont($2,$3); //@line 413 "SIDH_v1.0/fpx.c"
 $4 = $0; //@line 414 "SIDH_v1.0/fpx.c"
 $5 = ((($4)) + 96|0); //@line 414 "SIDH_v1.0/fpx.c"
 $6 = $1; //@line 414 "SIDH_v1.0/fpx.c"
 $7 = ((($6)) + 96|0); //@line 414 "SIDH_v1.0/fpx.c"
 _to_mont($5,$7); //@line 414 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 415 "SIDH_v1.0/fpx.c"
}
function _from_fp2mont($ma,$c) {
 $ma = $ma|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $ma;
 $1 = $c;
 $2 = $0; //@line 422 "SIDH_v1.0/fpx.c"
 $3 = $1; //@line 422 "SIDH_v1.0/fpx.c"
 _from_mont($2,$3); //@line 422 "SIDH_v1.0/fpx.c"
 $4 = $0; //@line 423 "SIDH_v1.0/fpx.c"
 $5 = ((($4)) + 96|0); //@line 423 "SIDH_v1.0/fpx.c"
 $6 = $1; //@line 423 "SIDH_v1.0/fpx.c"
 $7 = ((($6)) + 96|0); //@line 423 "SIDH_v1.0/fpx.c"
 _from_mont($5,$7); //@line 423 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 424 "SIDH_v1.0/fpx.c"
}
function _fp2inv751_mont($a) {
 $a = $a|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $t1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t1 = sp;
 $0 = $a;
 $1 = $0; //@line 431 "SIDH_v1.0/fpx.c"
 _fpsqr751_mont($1,$t1); //@line 431 "SIDH_v1.0/fpx.c"
 $2 = $0; //@line 432 "SIDH_v1.0/fpx.c"
 $3 = ((($2)) + 96|0); //@line 432 "SIDH_v1.0/fpx.c"
 $4 = ((($t1)) + 96|0); //@line 432 "SIDH_v1.0/fpx.c"
 _fpsqr751_mont($3,$4); //@line 432 "SIDH_v1.0/fpx.c"
 $5 = ((($t1)) + 96|0); //@line 433 "SIDH_v1.0/fpx.c"
 _fpadd751($t1,$5,$t1); //@line 433 "SIDH_v1.0/fpx.c"
 _fpinv751_mont($t1); //@line 434 "SIDH_v1.0/fpx.c"
 $6 = $0; //@line 435 "SIDH_v1.0/fpx.c"
 $7 = ((($6)) + 96|0); //@line 435 "SIDH_v1.0/fpx.c"
 _fpneg751($7); //@line 435 "SIDH_v1.0/fpx.c"
 $8 = $0; //@line 436 "SIDH_v1.0/fpx.c"
 $9 = $0; //@line 436 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($8,$t1,$9); //@line 436 "SIDH_v1.0/fpx.c"
 $10 = $0; //@line 437 "SIDH_v1.0/fpx.c"
 $11 = ((($10)) + 96|0); //@line 437 "SIDH_v1.0/fpx.c"
 $12 = $0; //@line 437 "SIDH_v1.0/fpx.c"
 $13 = ((($12)) + 96|0); //@line 437 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($11,$t1,$13); //@line 437 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 438 "SIDH_v1.0/fpx.c"
}
function _swap_points_basefield($P,$Q,$option) {
 $P = $P|0;
 $Q = $Q|0;
 $option = $option|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $8 = 0, $9 = 0, $i = 0, $temp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $P;
 $1 = $Q;
 $2 = $option;
 $i = 0; //@line 447 "SIDH_v1.0/fpx.c"
 while(1) {
  $3 = $i; //@line 447 "SIDH_v1.0/fpx.c"
  $4 = ($3>>>0)<(24); //@line 447 "SIDH_v1.0/fpx.c"
  if (!($4)) {
   break;
  }
  $5 = $2; //@line 448 "SIDH_v1.0/fpx.c"
  $6 = $i; //@line 448 "SIDH_v1.0/fpx.c"
  $7 = $0; //@line 448 "SIDH_v1.0/fpx.c"
  $8 = (($7) + ($6<<2)|0); //@line 448 "SIDH_v1.0/fpx.c"
  $9 = HEAP32[$8>>2]|0; //@line 448 "SIDH_v1.0/fpx.c"
  $10 = $i; //@line 448 "SIDH_v1.0/fpx.c"
  $11 = $1; //@line 448 "SIDH_v1.0/fpx.c"
  $12 = (($11) + ($10<<2)|0); //@line 448 "SIDH_v1.0/fpx.c"
  $13 = HEAP32[$12>>2]|0; //@line 448 "SIDH_v1.0/fpx.c"
  $14 = $9 ^ $13; //@line 448 "SIDH_v1.0/fpx.c"
  $15 = $5 & $14; //@line 448 "SIDH_v1.0/fpx.c"
  $temp = $15; //@line 448 "SIDH_v1.0/fpx.c"
  $16 = $temp; //@line 449 "SIDH_v1.0/fpx.c"
  $17 = $i; //@line 449 "SIDH_v1.0/fpx.c"
  $18 = $0; //@line 449 "SIDH_v1.0/fpx.c"
  $19 = (($18) + ($17<<2)|0); //@line 449 "SIDH_v1.0/fpx.c"
  $20 = HEAP32[$19>>2]|0; //@line 449 "SIDH_v1.0/fpx.c"
  $21 = $16 ^ $20; //@line 449 "SIDH_v1.0/fpx.c"
  $22 = $i; //@line 449 "SIDH_v1.0/fpx.c"
  $23 = $0; //@line 449 "SIDH_v1.0/fpx.c"
  $24 = (($23) + ($22<<2)|0); //@line 449 "SIDH_v1.0/fpx.c"
  HEAP32[$24>>2] = $21; //@line 449 "SIDH_v1.0/fpx.c"
  $25 = $temp; //@line 450 "SIDH_v1.0/fpx.c"
  $26 = $i; //@line 450 "SIDH_v1.0/fpx.c"
  $27 = $1; //@line 450 "SIDH_v1.0/fpx.c"
  $28 = (($27) + ($26<<2)|0); //@line 450 "SIDH_v1.0/fpx.c"
  $29 = HEAP32[$28>>2]|0; //@line 450 "SIDH_v1.0/fpx.c"
  $30 = $25 ^ $29; //@line 450 "SIDH_v1.0/fpx.c"
  $31 = $i; //@line 450 "SIDH_v1.0/fpx.c"
  $32 = $1; //@line 450 "SIDH_v1.0/fpx.c"
  $33 = (($32) + ($31<<2)|0); //@line 450 "SIDH_v1.0/fpx.c"
  HEAP32[$33>>2] = $30; //@line 450 "SIDH_v1.0/fpx.c"
  $34 = $2; //@line 451 "SIDH_v1.0/fpx.c"
  $35 = $i; //@line 451 "SIDH_v1.0/fpx.c"
  $36 = $0; //@line 451 "SIDH_v1.0/fpx.c"
  $37 = ((($36)) + 96|0); //@line 451 "SIDH_v1.0/fpx.c"
  $38 = (($37) + ($35<<2)|0); //@line 451 "SIDH_v1.0/fpx.c"
  $39 = HEAP32[$38>>2]|0; //@line 451 "SIDH_v1.0/fpx.c"
  $40 = $i; //@line 451 "SIDH_v1.0/fpx.c"
  $41 = $1; //@line 451 "SIDH_v1.0/fpx.c"
  $42 = ((($41)) + 96|0); //@line 451 "SIDH_v1.0/fpx.c"
  $43 = (($42) + ($40<<2)|0); //@line 451 "SIDH_v1.0/fpx.c"
  $44 = HEAP32[$43>>2]|0; //@line 451 "SIDH_v1.0/fpx.c"
  $45 = $39 ^ $44; //@line 451 "SIDH_v1.0/fpx.c"
  $46 = $34 & $45; //@line 451 "SIDH_v1.0/fpx.c"
  $temp = $46; //@line 451 "SIDH_v1.0/fpx.c"
  $47 = $temp; //@line 452 "SIDH_v1.0/fpx.c"
  $48 = $i; //@line 452 "SIDH_v1.0/fpx.c"
  $49 = $0; //@line 452 "SIDH_v1.0/fpx.c"
  $50 = ((($49)) + 96|0); //@line 452 "SIDH_v1.0/fpx.c"
  $51 = (($50) + ($48<<2)|0); //@line 452 "SIDH_v1.0/fpx.c"
  $52 = HEAP32[$51>>2]|0; //@line 452 "SIDH_v1.0/fpx.c"
  $53 = $47 ^ $52; //@line 452 "SIDH_v1.0/fpx.c"
  $54 = $i; //@line 452 "SIDH_v1.0/fpx.c"
  $55 = $0; //@line 452 "SIDH_v1.0/fpx.c"
  $56 = ((($55)) + 96|0); //@line 452 "SIDH_v1.0/fpx.c"
  $57 = (($56) + ($54<<2)|0); //@line 452 "SIDH_v1.0/fpx.c"
  HEAP32[$57>>2] = $53; //@line 452 "SIDH_v1.0/fpx.c"
  $58 = $temp; //@line 453 "SIDH_v1.0/fpx.c"
  $59 = $i; //@line 453 "SIDH_v1.0/fpx.c"
  $60 = $1; //@line 453 "SIDH_v1.0/fpx.c"
  $61 = ((($60)) + 96|0); //@line 453 "SIDH_v1.0/fpx.c"
  $62 = (($61) + ($59<<2)|0); //@line 453 "SIDH_v1.0/fpx.c"
  $63 = HEAP32[$62>>2]|0; //@line 453 "SIDH_v1.0/fpx.c"
  $64 = $58 ^ $63; //@line 453 "SIDH_v1.0/fpx.c"
  $65 = $i; //@line 453 "SIDH_v1.0/fpx.c"
  $66 = $1; //@line 453 "SIDH_v1.0/fpx.c"
  $67 = ((($66)) + 96|0); //@line 453 "SIDH_v1.0/fpx.c"
  $68 = (($67) + ($65<<2)|0); //@line 453 "SIDH_v1.0/fpx.c"
  HEAP32[$68>>2] = $64; //@line 453 "SIDH_v1.0/fpx.c"
  $69 = $i; //@line 447 "SIDH_v1.0/fpx.c"
  $70 = (($69) + 1)|0; //@line 447 "SIDH_v1.0/fpx.c"
  $i = $70; //@line 447 "SIDH_v1.0/fpx.c"
 }
 STACKTOP = sp;return; //@line 455 "SIDH_v1.0/fpx.c"
}
function _swap_points($P,$Q,$option) {
 $P = $P|0;
 $Q = $Q|0;
 $option = $option|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0;
 var $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0;
 var $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0;
 var $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0;
 var $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0;
 var $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $i = 0, $temp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $P;
 $1 = $Q;
 $2 = $option;
 $i = 0; //@line 464 "SIDH_v1.0/fpx.c"
 while(1) {
  $3 = $i; //@line 464 "SIDH_v1.0/fpx.c"
  $4 = ($3>>>0)<(24); //@line 464 "SIDH_v1.0/fpx.c"
  if (!($4)) {
   break;
  }
  $5 = $2; //@line 465 "SIDH_v1.0/fpx.c"
  $6 = $i; //@line 465 "SIDH_v1.0/fpx.c"
  $7 = $0; //@line 465 "SIDH_v1.0/fpx.c"
  $8 = (($7) + ($6<<2)|0); //@line 465 "SIDH_v1.0/fpx.c"
  $9 = HEAP32[$8>>2]|0; //@line 465 "SIDH_v1.0/fpx.c"
  $10 = $i; //@line 465 "SIDH_v1.0/fpx.c"
  $11 = $1; //@line 465 "SIDH_v1.0/fpx.c"
  $12 = (($11) + ($10<<2)|0); //@line 465 "SIDH_v1.0/fpx.c"
  $13 = HEAP32[$12>>2]|0; //@line 465 "SIDH_v1.0/fpx.c"
  $14 = $9 ^ $13; //@line 465 "SIDH_v1.0/fpx.c"
  $15 = $5 & $14; //@line 465 "SIDH_v1.0/fpx.c"
  $temp = $15; //@line 465 "SIDH_v1.0/fpx.c"
  $16 = $temp; //@line 466 "SIDH_v1.0/fpx.c"
  $17 = $i; //@line 466 "SIDH_v1.0/fpx.c"
  $18 = $0; //@line 466 "SIDH_v1.0/fpx.c"
  $19 = (($18) + ($17<<2)|0); //@line 466 "SIDH_v1.0/fpx.c"
  $20 = HEAP32[$19>>2]|0; //@line 466 "SIDH_v1.0/fpx.c"
  $21 = $16 ^ $20; //@line 466 "SIDH_v1.0/fpx.c"
  $22 = $i; //@line 466 "SIDH_v1.0/fpx.c"
  $23 = $0; //@line 466 "SIDH_v1.0/fpx.c"
  $24 = (($23) + ($22<<2)|0); //@line 466 "SIDH_v1.0/fpx.c"
  HEAP32[$24>>2] = $21; //@line 466 "SIDH_v1.0/fpx.c"
  $25 = $temp; //@line 467 "SIDH_v1.0/fpx.c"
  $26 = $i; //@line 467 "SIDH_v1.0/fpx.c"
  $27 = $1; //@line 467 "SIDH_v1.0/fpx.c"
  $28 = (($27) + ($26<<2)|0); //@line 467 "SIDH_v1.0/fpx.c"
  $29 = HEAP32[$28>>2]|0; //@line 467 "SIDH_v1.0/fpx.c"
  $30 = $25 ^ $29; //@line 467 "SIDH_v1.0/fpx.c"
  $31 = $i; //@line 467 "SIDH_v1.0/fpx.c"
  $32 = $1; //@line 467 "SIDH_v1.0/fpx.c"
  $33 = (($32) + ($31<<2)|0); //@line 467 "SIDH_v1.0/fpx.c"
  HEAP32[$33>>2] = $30; //@line 467 "SIDH_v1.0/fpx.c"
  $34 = $2; //@line 468 "SIDH_v1.0/fpx.c"
  $35 = $i; //@line 468 "SIDH_v1.0/fpx.c"
  $36 = $0; //@line 468 "SIDH_v1.0/fpx.c"
  $37 = ((($36)) + 192|0); //@line 468 "SIDH_v1.0/fpx.c"
  $38 = (($37) + ($35<<2)|0); //@line 468 "SIDH_v1.0/fpx.c"
  $39 = HEAP32[$38>>2]|0; //@line 468 "SIDH_v1.0/fpx.c"
  $40 = $i; //@line 468 "SIDH_v1.0/fpx.c"
  $41 = $1; //@line 468 "SIDH_v1.0/fpx.c"
  $42 = ((($41)) + 192|0); //@line 468 "SIDH_v1.0/fpx.c"
  $43 = (($42) + ($40<<2)|0); //@line 468 "SIDH_v1.0/fpx.c"
  $44 = HEAP32[$43>>2]|0; //@line 468 "SIDH_v1.0/fpx.c"
  $45 = $39 ^ $44; //@line 468 "SIDH_v1.0/fpx.c"
  $46 = $34 & $45; //@line 468 "SIDH_v1.0/fpx.c"
  $temp = $46; //@line 468 "SIDH_v1.0/fpx.c"
  $47 = $temp; //@line 469 "SIDH_v1.0/fpx.c"
  $48 = $i; //@line 469 "SIDH_v1.0/fpx.c"
  $49 = $0; //@line 469 "SIDH_v1.0/fpx.c"
  $50 = ((($49)) + 192|0); //@line 469 "SIDH_v1.0/fpx.c"
  $51 = (($50) + ($48<<2)|0); //@line 469 "SIDH_v1.0/fpx.c"
  $52 = HEAP32[$51>>2]|0; //@line 469 "SIDH_v1.0/fpx.c"
  $53 = $47 ^ $52; //@line 469 "SIDH_v1.0/fpx.c"
  $54 = $i; //@line 469 "SIDH_v1.0/fpx.c"
  $55 = $0; //@line 469 "SIDH_v1.0/fpx.c"
  $56 = ((($55)) + 192|0); //@line 469 "SIDH_v1.0/fpx.c"
  $57 = (($56) + ($54<<2)|0); //@line 469 "SIDH_v1.0/fpx.c"
  HEAP32[$57>>2] = $53; //@line 469 "SIDH_v1.0/fpx.c"
  $58 = $temp; //@line 470 "SIDH_v1.0/fpx.c"
  $59 = $i; //@line 470 "SIDH_v1.0/fpx.c"
  $60 = $1; //@line 470 "SIDH_v1.0/fpx.c"
  $61 = ((($60)) + 192|0); //@line 470 "SIDH_v1.0/fpx.c"
  $62 = (($61) + ($59<<2)|0); //@line 470 "SIDH_v1.0/fpx.c"
  $63 = HEAP32[$62>>2]|0; //@line 470 "SIDH_v1.0/fpx.c"
  $64 = $58 ^ $63; //@line 470 "SIDH_v1.0/fpx.c"
  $65 = $i; //@line 470 "SIDH_v1.0/fpx.c"
  $66 = $1; //@line 470 "SIDH_v1.0/fpx.c"
  $67 = ((($66)) + 192|0); //@line 470 "SIDH_v1.0/fpx.c"
  $68 = (($67) + ($65<<2)|0); //@line 470 "SIDH_v1.0/fpx.c"
  HEAP32[$68>>2] = $64; //@line 470 "SIDH_v1.0/fpx.c"
  $69 = $2; //@line 471 "SIDH_v1.0/fpx.c"
  $70 = $i; //@line 471 "SIDH_v1.0/fpx.c"
  $71 = $0; //@line 471 "SIDH_v1.0/fpx.c"
  $72 = ((($71)) + 96|0); //@line 471 "SIDH_v1.0/fpx.c"
  $73 = (($72) + ($70<<2)|0); //@line 471 "SIDH_v1.0/fpx.c"
  $74 = HEAP32[$73>>2]|0; //@line 471 "SIDH_v1.0/fpx.c"
  $75 = $i; //@line 471 "SIDH_v1.0/fpx.c"
  $76 = $1; //@line 471 "SIDH_v1.0/fpx.c"
  $77 = ((($76)) + 96|0); //@line 471 "SIDH_v1.0/fpx.c"
  $78 = (($77) + ($75<<2)|0); //@line 471 "SIDH_v1.0/fpx.c"
  $79 = HEAP32[$78>>2]|0; //@line 471 "SIDH_v1.0/fpx.c"
  $80 = $74 ^ $79; //@line 471 "SIDH_v1.0/fpx.c"
  $81 = $69 & $80; //@line 471 "SIDH_v1.0/fpx.c"
  $temp = $81; //@line 471 "SIDH_v1.0/fpx.c"
  $82 = $temp; //@line 472 "SIDH_v1.0/fpx.c"
  $83 = $i; //@line 472 "SIDH_v1.0/fpx.c"
  $84 = $0; //@line 472 "SIDH_v1.0/fpx.c"
  $85 = ((($84)) + 96|0); //@line 472 "SIDH_v1.0/fpx.c"
  $86 = (($85) + ($83<<2)|0); //@line 472 "SIDH_v1.0/fpx.c"
  $87 = HEAP32[$86>>2]|0; //@line 472 "SIDH_v1.0/fpx.c"
  $88 = $82 ^ $87; //@line 472 "SIDH_v1.0/fpx.c"
  $89 = $i; //@line 472 "SIDH_v1.0/fpx.c"
  $90 = $0; //@line 472 "SIDH_v1.0/fpx.c"
  $91 = ((($90)) + 96|0); //@line 472 "SIDH_v1.0/fpx.c"
  $92 = (($91) + ($89<<2)|0); //@line 472 "SIDH_v1.0/fpx.c"
  HEAP32[$92>>2] = $88; //@line 472 "SIDH_v1.0/fpx.c"
  $93 = $temp; //@line 473 "SIDH_v1.0/fpx.c"
  $94 = $i; //@line 473 "SIDH_v1.0/fpx.c"
  $95 = $1; //@line 473 "SIDH_v1.0/fpx.c"
  $96 = ((($95)) + 96|0); //@line 473 "SIDH_v1.0/fpx.c"
  $97 = (($96) + ($94<<2)|0); //@line 473 "SIDH_v1.0/fpx.c"
  $98 = HEAP32[$97>>2]|0; //@line 473 "SIDH_v1.0/fpx.c"
  $99 = $93 ^ $98; //@line 473 "SIDH_v1.0/fpx.c"
  $100 = $i; //@line 473 "SIDH_v1.0/fpx.c"
  $101 = $1; //@line 473 "SIDH_v1.0/fpx.c"
  $102 = ((($101)) + 96|0); //@line 473 "SIDH_v1.0/fpx.c"
  $103 = (($102) + ($100<<2)|0); //@line 473 "SIDH_v1.0/fpx.c"
  HEAP32[$103>>2] = $99; //@line 473 "SIDH_v1.0/fpx.c"
  $104 = $2; //@line 474 "SIDH_v1.0/fpx.c"
  $105 = $i; //@line 474 "SIDH_v1.0/fpx.c"
  $106 = $0; //@line 474 "SIDH_v1.0/fpx.c"
  $107 = ((($106)) + 192|0); //@line 474 "SIDH_v1.0/fpx.c"
  $108 = ((($107)) + 96|0); //@line 474 "SIDH_v1.0/fpx.c"
  $109 = (($108) + ($105<<2)|0); //@line 474 "SIDH_v1.0/fpx.c"
  $110 = HEAP32[$109>>2]|0; //@line 474 "SIDH_v1.0/fpx.c"
  $111 = $i; //@line 474 "SIDH_v1.0/fpx.c"
  $112 = $1; //@line 474 "SIDH_v1.0/fpx.c"
  $113 = ((($112)) + 192|0); //@line 474 "SIDH_v1.0/fpx.c"
  $114 = ((($113)) + 96|0); //@line 474 "SIDH_v1.0/fpx.c"
  $115 = (($114) + ($111<<2)|0); //@line 474 "SIDH_v1.0/fpx.c"
  $116 = HEAP32[$115>>2]|0; //@line 474 "SIDH_v1.0/fpx.c"
  $117 = $110 ^ $116; //@line 474 "SIDH_v1.0/fpx.c"
  $118 = $104 & $117; //@line 474 "SIDH_v1.0/fpx.c"
  $temp = $118; //@line 474 "SIDH_v1.0/fpx.c"
  $119 = $temp; //@line 475 "SIDH_v1.0/fpx.c"
  $120 = $i; //@line 475 "SIDH_v1.0/fpx.c"
  $121 = $0; //@line 475 "SIDH_v1.0/fpx.c"
  $122 = ((($121)) + 192|0); //@line 475 "SIDH_v1.0/fpx.c"
  $123 = ((($122)) + 96|0); //@line 475 "SIDH_v1.0/fpx.c"
  $124 = (($123) + ($120<<2)|0); //@line 475 "SIDH_v1.0/fpx.c"
  $125 = HEAP32[$124>>2]|0; //@line 475 "SIDH_v1.0/fpx.c"
  $126 = $119 ^ $125; //@line 475 "SIDH_v1.0/fpx.c"
  $127 = $i; //@line 475 "SIDH_v1.0/fpx.c"
  $128 = $0; //@line 475 "SIDH_v1.0/fpx.c"
  $129 = ((($128)) + 192|0); //@line 475 "SIDH_v1.0/fpx.c"
  $130 = ((($129)) + 96|0); //@line 475 "SIDH_v1.0/fpx.c"
  $131 = (($130) + ($127<<2)|0); //@line 475 "SIDH_v1.0/fpx.c"
  HEAP32[$131>>2] = $126; //@line 475 "SIDH_v1.0/fpx.c"
  $132 = $temp; //@line 476 "SIDH_v1.0/fpx.c"
  $133 = $i; //@line 476 "SIDH_v1.0/fpx.c"
  $134 = $1; //@line 476 "SIDH_v1.0/fpx.c"
  $135 = ((($134)) + 192|0); //@line 476 "SIDH_v1.0/fpx.c"
  $136 = ((($135)) + 96|0); //@line 476 "SIDH_v1.0/fpx.c"
  $137 = (($136) + ($133<<2)|0); //@line 476 "SIDH_v1.0/fpx.c"
  $138 = HEAP32[$137>>2]|0; //@line 476 "SIDH_v1.0/fpx.c"
  $139 = $132 ^ $138; //@line 476 "SIDH_v1.0/fpx.c"
  $140 = $i; //@line 476 "SIDH_v1.0/fpx.c"
  $141 = $1; //@line 476 "SIDH_v1.0/fpx.c"
  $142 = ((($141)) + 192|0); //@line 476 "SIDH_v1.0/fpx.c"
  $143 = ((($142)) + 96|0); //@line 476 "SIDH_v1.0/fpx.c"
  $144 = (($143) + ($140<<2)|0); //@line 476 "SIDH_v1.0/fpx.c"
  HEAP32[$144>>2] = $139; //@line 476 "SIDH_v1.0/fpx.c"
  $145 = $i; //@line 464 "SIDH_v1.0/fpx.c"
  $146 = (($145) + 1)|0; //@line 464 "SIDH_v1.0/fpx.c"
  $i = $146; //@line 464 "SIDH_v1.0/fpx.c"
 }
 STACKTOP = sp;return; //@line 478 "SIDH_v1.0/fpx.c"
}
function _select_f2elm($x,$y,$z,$option) {
 $x = $x|0;
 $y = $y|0;
 $z = $z|0;
 $option = $option|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $y;
 $2 = $z;
 $3 = $option;
 $i = 0; //@line 486 "SIDH_v1.0/fpx.c"
 while(1) {
  $4 = $i; //@line 486 "SIDH_v1.0/fpx.c"
  $5 = ($4>>>0)<(24); //@line 486 "SIDH_v1.0/fpx.c"
  if (!($5)) {
   break;
  }
  $6 = $3; //@line 487 "SIDH_v1.0/fpx.c"
  $7 = $i; //@line 487 "SIDH_v1.0/fpx.c"
  $8 = $0; //@line 487 "SIDH_v1.0/fpx.c"
  $9 = (($8) + ($7<<2)|0); //@line 487 "SIDH_v1.0/fpx.c"
  $10 = HEAP32[$9>>2]|0; //@line 487 "SIDH_v1.0/fpx.c"
  $11 = $i; //@line 487 "SIDH_v1.0/fpx.c"
  $12 = $1; //@line 487 "SIDH_v1.0/fpx.c"
  $13 = (($12) + ($11<<2)|0); //@line 487 "SIDH_v1.0/fpx.c"
  $14 = HEAP32[$13>>2]|0; //@line 487 "SIDH_v1.0/fpx.c"
  $15 = $10 ^ $14; //@line 487 "SIDH_v1.0/fpx.c"
  $16 = $6 & $15; //@line 487 "SIDH_v1.0/fpx.c"
  $17 = $i; //@line 487 "SIDH_v1.0/fpx.c"
  $18 = $0; //@line 487 "SIDH_v1.0/fpx.c"
  $19 = (($18) + ($17<<2)|0); //@line 487 "SIDH_v1.0/fpx.c"
  $20 = HEAP32[$19>>2]|0; //@line 487 "SIDH_v1.0/fpx.c"
  $21 = $16 ^ $20; //@line 487 "SIDH_v1.0/fpx.c"
  $22 = $i; //@line 487 "SIDH_v1.0/fpx.c"
  $23 = $2; //@line 487 "SIDH_v1.0/fpx.c"
  $24 = (($23) + ($22<<2)|0); //@line 487 "SIDH_v1.0/fpx.c"
  HEAP32[$24>>2] = $21; //@line 487 "SIDH_v1.0/fpx.c"
  $25 = $3; //@line 488 "SIDH_v1.0/fpx.c"
  $26 = $i; //@line 488 "SIDH_v1.0/fpx.c"
  $27 = $0; //@line 488 "SIDH_v1.0/fpx.c"
  $28 = ((($27)) + 96|0); //@line 488 "SIDH_v1.0/fpx.c"
  $29 = (($28) + ($26<<2)|0); //@line 488 "SIDH_v1.0/fpx.c"
  $30 = HEAP32[$29>>2]|0; //@line 488 "SIDH_v1.0/fpx.c"
  $31 = $i; //@line 488 "SIDH_v1.0/fpx.c"
  $32 = $1; //@line 488 "SIDH_v1.0/fpx.c"
  $33 = ((($32)) + 96|0); //@line 488 "SIDH_v1.0/fpx.c"
  $34 = (($33) + ($31<<2)|0); //@line 488 "SIDH_v1.0/fpx.c"
  $35 = HEAP32[$34>>2]|0; //@line 488 "SIDH_v1.0/fpx.c"
  $36 = $30 ^ $35; //@line 488 "SIDH_v1.0/fpx.c"
  $37 = $25 & $36; //@line 488 "SIDH_v1.0/fpx.c"
  $38 = $i; //@line 488 "SIDH_v1.0/fpx.c"
  $39 = $0; //@line 488 "SIDH_v1.0/fpx.c"
  $40 = ((($39)) + 96|0); //@line 488 "SIDH_v1.0/fpx.c"
  $41 = (($40) + ($38<<2)|0); //@line 488 "SIDH_v1.0/fpx.c"
  $42 = HEAP32[$41>>2]|0; //@line 488 "SIDH_v1.0/fpx.c"
  $43 = $37 ^ $42; //@line 488 "SIDH_v1.0/fpx.c"
  $44 = $i; //@line 488 "SIDH_v1.0/fpx.c"
  $45 = $2; //@line 488 "SIDH_v1.0/fpx.c"
  $46 = ((($45)) + 96|0); //@line 488 "SIDH_v1.0/fpx.c"
  $47 = (($46) + ($44<<2)|0); //@line 488 "SIDH_v1.0/fpx.c"
  HEAP32[$47>>2] = $43; //@line 488 "SIDH_v1.0/fpx.c"
  $48 = $i; //@line 486 "SIDH_v1.0/fpx.c"
  $49 = (($48) + 1)|0; //@line 486 "SIDH_v1.0/fpx.c"
  $i = $49; //@line 486 "SIDH_v1.0/fpx.c"
 }
 STACKTOP = sp;return; //@line 490 "SIDH_v1.0/fpx.c"
}
function _is_digit_lessthan_ct($x,$y) {
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $y;
 $2 = $0; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $3 = $0; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $4 = $1; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $5 = $3 ^ $4; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $6 = $0; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $7 = $1; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $8 = (($6) - ($7))|0; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $9 = $1; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $10 = $8 ^ $9; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $11 = $5 | $10; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $12 = $2 ^ $11; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $13 = $12 >>> 31; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 STACKTOP = sp;return ($13|0); //@line 82 "SIDH_v1.0/SIDH_internal.h"
}
function _is_digit_zero_ct($x) {
 $x = $x|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $0; //@line 77 "SIDH_v1.0/SIDH_internal.h"
 $2 = (_is_digit_nonzero_ct($1)|0); //@line 77 "SIDH_v1.0/SIDH_internal.h"
 $3 = 1 ^ $2; //@line 77 "SIDH_v1.0/SIDH_internal.h"
 STACKTOP = sp;return ($3|0); //@line 77 "SIDH_v1.0/SIDH_internal.h"
}
function _is_digit_nonzero_ct($x) {
 $x = $x|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $0; //@line 72 "SIDH_v1.0/SIDH_internal.h"
 $2 = $0; //@line 72 "SIDH_v1.0/SIDH_internal.h"
 $3 = (0 - ($2))|0; //@line 72 "SIDH_v1.0/SIDH_internal.h"
 $4 = $1 | $3; //@line 72 "SIDH_v1.0/SIDH_internal.h"
 $5 = $4 >>> 31; //@line 72 "SIDH_v1.0/SIDH_internal.h"
 STACKTOP = sp;return ($5|0); //@line 72 "SIDH_v1.0/SIDH_internal.h"
}
function _fpadd751($a,$b,$c) {
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $borrowReg = 0, $carry = 0, $i = 0, $mask = 0;
 var $tempReg = 0, $tempReg1 = 0, $tempReg2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $b;
 $2 = $c;
 $carry = 0; //@line 24 "SIDH_v1.0/generic/fp_generic.c"
 $i = 0; //@line 27 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $3 = $i; //@line 27 "SIDH_v1.0/generic/fp_generic.c"
  $4 = ($3>>>0)<(24); //@line 27 "SIDH_v1.0/generic/fp_generic.c"
  if (!($4)) {
   break;
  }
  $5 = $i; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $0; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $7 = (($6) + ($5<<2)|0); //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $8 = HEAP32[$7>>2]|0; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $9 = $carry; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $10 = (($8) + ($9))|0; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $tempReg = $10; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $11 = $i; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $12 = $1; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $13 = (($12) + ($11<<2)|0); //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $14 = HEAP32[$13>>2]|0; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $15 = $tempReg; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $16 = (($14) + ($15))|0; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $17 = $i; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $18 = $2; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $19 = (($18) + ($17<<2)|0); //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$19>>2] = $16; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $20 = $tempReg; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $21 = $carry; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $22 = (_is_digit_lessthan_ct69($20,$21)|0); //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $23 = $i; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $24 = $2; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $25 = (($24) + ($23<<2)|0); //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $26 = HEAP32[$25>>2]|0; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $27 = $tempReg; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $28 = (_is_digit_lessthan_ct69($26,$27)|0); //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $29 = $22 | $28; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $carry = $29; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $30 = $i; //@line 27 "SIDH_v1.0/generic/fp_generic.c"
  $31 = (($30) + 1)|0; //@line 27 "SIDH_v1.0/generic/fp_generic.c"
  $i = $31; //@line 27 "SIDH_v1.0/generic/fp_generic.c"
 }
 $carry = 0; //@line 31 "SIDH_v1.0/generic/fp_generic.c"
 $i = 0; //@line 32 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $32 = $i; //@line 32 "SIDH_v1.0/generic/fp_generic.c"
  $33 = ($32>>>0)<(24); //@line 32 "SIDH_v1.0/generic/fp_generic.c"
  if (!($33)) {
   break;
  }
  $34 = $i; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $35 = $2; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $36 = (($35) + ($34<<2)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $37 = HEAP32[$36>>2]|0; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $38 = $i; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $39 = (2456 + ($38<<2)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $40 = HEAP32[$39>>2]|0; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $41 = (($37) - ($40))|0; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $tempReg1 = $41; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $42 = $i; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $43 = $2; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $44 = (($43) + ($42<<2)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $45 = HEAP32[$44>>2]|0; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $46 = $i; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $47 = (2456 + ($46<<2)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $48 = HEAP32[$47>>2]|0; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $49 = (_is_digit_lessthan_ct69($45,$48)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $50 = $carry; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $51 = $tempReg1; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $52 = (_is_digit_zero_ct70($51)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $53 = $50 & $52; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $54 = $49 | $53; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $borrowReg = $54; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $55 = $tempReg1; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $56 = $carry; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $57 = (($55) - ($56))|0; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $58 = $i; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $59 = $2; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $60 = (($59) + ($58<<2)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$60>>2] = $57; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $61 = $borrowReg; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $carry = $61; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $62 = $i; //@line 32 "SIDH_v1.0/generic/fp_generic.c"
  $63 = (($62) + 1)|0; //@line 32 "SIDH_v1.0/generic/fp_generic.c"
  $i = $63; //@line 32 "SIDH_v1.0/generic/fp_generic.c"
 }
 $64 = $carry; //@line 35 "SIDH_v1.0/generic/fp_generic.c"
 $65 = (0 - ($64))|0; //@line 35 "SIDH_v1.0/generic/fp_generic.c"
 $mask = $65; //@line 35 "SIDH_v1.0/generic/fp_generic.c"
 $carry = 0; //@line 37 "SIDH_v1.0/generic/fp_generic.c"
 $i = 0; //@line 38 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $66 = $i; //@line 38 "SIDH_v1.0/generic/fp_generic.c"
  $67 = ($66>>>0)<(24); //@line 38 "SIDH_v1.0/generic/fp_generic.c"
  if (!($67)) {
   break;
  }
  $68 = $i; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $69 = $2; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $70 = (($69) + ($68<<2)|0); //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $71 = HEAP32[$70>>2]|0; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $72 = $carry; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $73 = (($71) + ($72))|0; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $tempReg2 = $73; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $74 = $i; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $75 = (2456 + ($74<<2)|0); //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $76 = HEAP32[$75>>2]|0; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $77 = $mask; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $78 = $76 & $77; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $79 = $tempReg2; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $80 = (($78) + ($79))|0; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $81 = $i; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $82 = $2; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $83 = (($82) + ($81<<2)|0); //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$83>>2] = $80; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $84 = $tempReg2; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $85 = $carry; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $86 = (_is_digit_lessthan_ct69($84,$85)|0); //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $87 = $i; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $88 = $2; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $89 = (($88) + ($87<<2)|0); //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $90 = HEAP32[$89>>2]|0; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $91 = $tempReg2; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $92 = (_is_digit_lessthan_ct69($90,$91)|0); //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $93 = $86 | $92; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $carry = $93; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $94 = $i; //@line 38 "SIDH_v1.0/generic/fp_generic.c"
  $95 = (($94) + 1)|0; //@line 38 "SIDH_v1.0/generic/fp_generic.c"
  $i = $95; //@line 38 "SIDH_v1.0/generic/fp_generic.c"
 }
 STACKTOP = sp;return; //@line 41 "SIDH_v1.0/generic/fp_generic.c"
}
function _fpsub751($a,$b,$c) {
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $7 = 0, $8 = 0, $9 = 0, $borrow = 0, $borrowReg = 0, $i = 0, $mask = 0, $tempReg = 0, $tempReg1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $b;
 $2 = $c;
 $borrow = 0; //@line 48 "SIDH_v1.0/generic/fp_generic.c"
 $i = 0; //@line 51 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $3 = $i; //@line 51 "SIDH_v1.0/generic/fp_generic.c"
  $4 = ($3>>>0)<(24); //@line 51 "SIDH_v1.0/generic/fp_generic.c"
  if (!($4)) {
   break;
  }
  $5 = $i; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $7 = (($6) + ($5<<2)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $8 = HEAP32[$7>>2]|0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $9 = $i; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $10 = $1; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $11 = (($10) + ($9<<2)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $12 = HEAP32[$11>>2]|0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $13 = (($8) - ($12))|0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $tempReg = $13; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $14 = $i; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $15 = $0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $16 = (($15) + ($14<<2)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $17 = HEAP32[$16>>2]|0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $18 = $i; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $19 = $1; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $20 = (($19) + ($18<<2)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $21 = HEAP32[$20>>2]|0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $22 = (_is_digit_lessthan_ct69($17,$21)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $23 = $borrow; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $24 = $tempReg; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $25 = (_is_digit_zero_ct70($24)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $26 = $23 & $25; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $27 = $22 | $26; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $borrowReg = $27; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $28 = $tempReg; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $29 = $borrow; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $30 = (($28) - ($29))|0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $31 = $i; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $32 = $2; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $33 = (($32) + ($31<<2)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$33>>2] = $30; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $34 = $borrowReg; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $borrow = $34; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $35 = $i; //@line 51 "SIDH_v1.0/generic/fp_generic.c"
  $36 = (($35) + 1)|0; //@line 51 "SIDH_v1.0/generic/fp_generic.c"
  $i = $36; //@line 51 "SIDH_v1.0/generic/fp_generic.c"
 }
 $37 = $borrow; //@line 54 "SIDH_v1.0/generic/fp_generic.c"
 $38 = (0 - ($37))|0; //@line 54 "SIDH_v1.0/generic/fp_generic.c"
 $mask = $38; //@line 54 "SIDH_v1.0/generic/fp_generic.c"
 $borrow = 0; //@line 56 "SIDH_v1.0/generic/fp_generic.c"
 $i = 0; //@line 57 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $39 = $i; //@line 57 "SIDH_v1.0/generic/fp_generic.c"
  $40 = ($39>>>0)<(24); //@line 57 "SIDH_v1.0/generic/fp_generic.c"
  if (!($40)) {
   break;
  }
  $41 = $i; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $42 = $2; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $43 = (($42) + ($41<<2)|0); //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $44 = HEAP32[$43>>2]|0; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $45 = $borrow; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $46 = (($44) + ($45))|0; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $tempReg1 = $46; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $47 = $i; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $48 = (2456 + ($47<<2)|0); //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $49 = HEAP32[$48>>2]|0; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $50 = $mask; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $51 = $49 & $50; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $52 = $tempReg1; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $53 = (($51) + ($52))|0; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $54 = $i; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $55 = $2; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $56 = (($55) + ($54<<2)|0); //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$56>>2] = $53; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $57 = $tempReg1; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $58 = $borrow; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $59 = (_is_digit_lessthan_ct69($57,$58)|0); //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $60 = $i; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $61 = $2; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $62 = (($61) + ($60<<2)|0); //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $63 = HEAP32[$62>>2]|0; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $64 = $tempReg1; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $65 = (_is_digit_lessthan_ct69($63,$64)|0); //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $66 = $59 | $65; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $borrow = $66; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $67 = $i; //@line 57 "SIDH_v1.0/generic/fp_generic.c"
  $68 = (($67) + 1)|0; //@line 57 "SIDH_v1.0/generic/fp_generic.c"
  $i = $68; //@line 57 "SIDH_v1.0/generic/fp_generic.c"
 }
 STACKTOP = sp;return; //@line 60 "SIDH_v1.0/generic/fp_generic.c"
}
function _fpneg751($a) {
 $a = $a|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $borrow = 0, $borrowReg = 0, $i = 0, $tempReg = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $borrow = 0; //@line 66 "SIDH_v1.0/generic/fp_generic.c"
 $i = 0; //@line 68 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $1 = $i; //@line 68 "SIDH_v1.0/generic/fp_generic.c"
  $2 = ($1>>>0)<(24); //@line 68 "SIDH_v1.0/generic/fp_generic.c"
  if (!($2)) {
   break;
  }
  $3 = $i; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $4 = (2456 + ($3<<2)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $5 = HEAP32[$4>>2]|0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $i; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $7 = $0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $8 = (($7) + ($6<<2)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $9 = HEAP32[$8>>2]|0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $10 = (($5) - ($9))|0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $tempReg = $10; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $11 = $i; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $12 = (2456 + ($11<<2)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $13 = HEAP32[$12>>2]|0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $14 = $i; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $15 = $0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $16 = (($15) + ($14<<2)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $17 = HEAP32[$16>>2]|0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $18 = (_is_digit_lessthan_ct69($13,$17)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $19 = $borrow; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $20 = $tempReg; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $21 = (_is_digit_zero_ct70($20)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $22 = $19 & $21; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $23 = $18 | $22; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $borrowReg = $23; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $24 = $tempReg; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $25 = $borrow; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $26 = (($24) - ($25))|0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $27 = $i; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $28 = $0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $29 = (($28) + ($27<<2)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$29>>2] = $26; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $30 = $borrowReg; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $borrow = $30; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $31 = $i; //@line 68 "SIDH_v1.0/generic/fp_generic.c"
  $32 = (($31) + 1)|0; //@line 68 "SIDH_v1.0/generic/fp_generic.c"
  $i = $32; //@line 68 "SIDH_v1.0/generic/fp_generic.c"
 }
 STACKTOP = sp;return; //@line 71 "SIDH_v1.0/generic/fp_generic.c"
}
function _fpdiv2_751($a,$c) {
 $a = $a|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $carry = 0, $i = 0, $mask = 0;
 var $tempReg = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $c;
 $carry = 0; //@line 78 "SIDH_v1.0/generic/fp_generic.c"
 $2 = $0; //@line 81 "SIDH_v1.0/generic/fp_generic.c"
 $3 = HEAP32[$2>>2]|0; //@line 81 "SIDH_v1.0/generic/fp_generic.c"
 $4 = $3 & 1; //@line 81 "SIDH_v1.0/generic/fp_generic.c"
 $5 = (0 - ($4))|0; //@line 81 "SIDH_v1.0/generic/fp_generic.c"
 $mask = $5; //@line 81 "SIDH_v1.0/generic/fp_generic.c"
 $i = 0; //@line 82 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $6 = $i; //@line 82 "SIDH_v1.0/generic/fp_generic.c"
  $7 = ($6>>>0)<(24); //@line 82 "SIDH_v1.0/generic/fp_generic.c"
  if (!($7)) {
   break;
  }
  $8 = $i; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $9 = $0; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $10 = (($9) + ($8<<2)|0); //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $11 = HEAP32[$10>>2]|0; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $12 = $carry; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $13 = (($11) + ($12))|0; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $tempReg = $13; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $14 = $i; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $15 = (2456 + ($14<<2)|0); //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $16 = HEAP32[$15>>2]|0; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $17 = $mask; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $18 = $16 & $17; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $19 = $tempReg; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $20 = (($18) + ($19))|0; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $21 = $i; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $22 = $1; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $23 = (($22) + ($21<<2)|0); //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$23>>2] = $20; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $24 = $tempReg; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $25 = $carry; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $26 = (_is_digit_lessthan_ct69($24,$25)|0); //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $27 = $i; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $28 = $1; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $29 = (($28) + ($27<<2)|0); //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $30 = HEAP32[$29>>2]|0; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $31 = $tempReg; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $32 = (_is_digit_lessthan_ct69($30,$31)|0); //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $33 = $26 | $32; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $carry = $33; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $34 = $i; //@line 82 "SIDH_v1.0/generic/fp_generic.c"
  $35 = (($34) + 1)|0; //@line 82 "SIDH_v1.0/generic/fp_generic.c"
  $i = $35; //@line 82 "SIDH_v1.0/generic/fp_generic.c"
 }
 $36 = $1; //@line 86 "SIDH_v1.0/generic/fp_generic.c"
 _mp_shiftr1($36,24); //@line 86 "SIDH_v1.0/generic/fp_generic.c"
 STACKTOP = sp;return; //@line 87 "SIDH_v1.0/generic/fp_generic.c"
}
function _digit_x_digit($a,$b,$c) {
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $9 = 0;
 var $ah = 0, $ahbh = 0, $ahbl = 0, $al = 0, $albh = 0, $albl = 0, $bh = 0, $bl = 0, $carry = 0, $mask_high = 0, $mask_low = 0, $res1 = 0, $res2 = 0, $res3 = 0, $temp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $b;
 $2 = $c;
 $mask_low = 65535; //@line 94 "SIDH_v1.0/generic/fp_generic.c"
 $mask_high = -65536; //@line 94 "SIDH_v1.0/generic/fp_generic.c"
 $3 = $0; //@line 96 "SIDH_v1.0/generic/fp_generic.c"
 $4 = $mask_low; //@line 96 "SIDH_v1.0/generic/fp_generic.c"
 $5 = $3 & $4; //@line 96 "SIDH_v1.0/generic/fp_generic.c"
 $al = $5; //@line 96 "SIDH_v1.0/generic/fp_generic.c"
 $6 = $0; //@line 97 "SIDH_v1.0/generic/fp_generic.c"
 $7 = $6 >>> 16; //@line 97 "SIDH_v1.0/generic/fp_generic.c"
 $ah = $7; //@line 97 "SIDH_v1.0/generic/fp_generic.c"
 $8 = $1; //@line 98 "SIDH_v1.0/generic/fp_generic.c"
 $9 = $mask_low; //@line 98 "SIDH_v1.0/generic/fp_generic.c"
 $10 = $8 & $9; //@line 98 "SIDH_v1.0/generic/fp_generic.c"
 $bl = $10; //@line 98 "SIDH_v1.0/generic/fp_generic.c"
 $11 = $1; //@line 99 "SIDH_v1.0/generic/fp_generic.c"
 $12 = $11 >>> 16; //@line 99 "SIDH_v1.0/generic/fp_generic.c"
 $bh = $12; //@line 99 "SIDH_v1.0/generic/fp_generic.c"
 $13 = $al; //@line 101 "SIDH_v1.0/generic/fp_generic.c"
 $14 = $bl; //@line 101 "SIDH_v1.0/generic/fp_generic.c"
 $15 = Math_imul($13, $14)|0; //@line 101 "SIDH_v1.0/generic/fp_generic.c"
 $albl = $15; //@line 101 "SIDH_v1.0/generic/fp_generic.c"
 $16 = $al; //@line 102 "SIDH_v1.0/generic/fp_generic.c"
 $17 = $bh; //@line 102 "SIDH_v1.0/generic/fp_generic.c"
 $18 = Math_imul($16, $17)|0; //@line 102 "SIDH_v1.0/generic/fp_generic.c"
 $albh = $18; //@line 102 "SIDH_v1.0/generic/fp_generic.c"
 $19 = $ah; //@line 103 "SIDH_v1.0/generic/fp_generic.c"
 $20 = $bl; //@line 103 "SIDH_v1.0/generic/fp_generic.c"
 $21 = Math_imul($19, $20)|0; //@line 103 "SIDH_v1.0/generic/fp_generic.c"
 $ahbl = $21; //@line 103 "SIDH_v1.0/generic/fp_generic.c"
 $22 = $ah; //@line 104 "SIDH_v1.0/generic/fp_generic.c"
 $23 = $bh; //@line 104 "SIDH_v1.0/generic/fp_generic.c"
 $24 = Math_imul($22, $23)|0; //@line 104 "SIDH_v1.0/generic/fp_generic.c"
 $ahbh = $24; //@line 104 "SIDH_v1.0/generic/fp_generic.c"
 $25 = $albl; //@line 105 "SIDH_v1.0/generic/fp_generic.c"
 $26 = $mask_low; //@line 105 "SIDH_v1.0/generic/fp_generic.c"
 $27 = $25 & $26; //@line 105 "SIDH_v1.0/generic/fp_generic.c"
 $28 = $2; //@line 105 "SIDH_v1.0/generic/fp_generic.c"
 HEAP32[$28>>2] = $27; //@line 105 "SIDH_v1.0/generic/fp_generic.c"
 $29 = $albl; //@line 107 "SIDH_v1.0/generic/fp_generic.c"
 $30 = $29 >>> 16; //@line 107 "SIDH_v1.0/generic/fp_generic.c"
 $res1 = $30; //@line 107 "SIDH_v1.0/generic/fp_generic.c"
 $31 = $ahbl; //@line 108 "SIDH_v1.0/generic/fp_generic.c"
 $32 = $mask_low; //@line 108 "SIDH_v1.0/generic/fp_generic.c"
 $33 = $31 & $32; //@line 108 "SIDH_v1.0/generic/fp_generic.c"
 $res2 = $33; //@line 108 "SIDH_v1.0/generic/fp_generic.c"
 $34 = $albh; //@line 109 "SIDH_v1.0/generic/fp_generic.c"
 $35 = $mask_low; //@line 109 "SIDH_v1.0/generic/fp_generic.c"
 $36 = $34 & $35; //@line 109 "SIDH_v1.0/generic/fp_generic.c"
 $res3 = $36; //@line 109 "SIDH_v1.0/generic/fp_generic.c"
 $37 = $res1; //@line 110 "SIDH_v1.0/generic/fp_generic.c"
 $38 = $res2; //@line 110 "SIDH_v1.0/generic/fp_generic.c"
 $39 = (($37) + ($38))|0; //@line 110 "SIDH_v1.0/generic/fp_generic.c"
 $40 = $res3; //@line 110 "SIDH_v1.0/generic/fp_generic.c"
 $41 = (($39) + ($40))|0; //@line 110 "SIDH_v1.0/generic/fp_generic.c"
 $temp = $41; //@line 110 "SIDH_v1.0/generic/fp_generic.c"
 $42 = $temp; //@line 111 "SIDH_v1.0/generic/fp_generic.c"
 $43 = $42 >>> 16; //@line 111 "SIDH_v1.0/generic/fp_generic.c"
 $carry = $43; //@line 111 "SIDH_v1.0/generic/fp_generic.c"
 $44 = $temp; //@line 112 "SIDH_v1.0/generic/fp_generic.c"
 $45 = $44 << 16; //@line 112 "SIDH_v1.0/generic/fp_generic.c"
 $46 = $2; //@line 112 "SIDH_v1.0/generic/fp_generic.c"
 $47 = HEAP32[$46>>2]|0; //@line 112 "SIDH_v1.0/generic/fp_generic.c"
 $48 = $47 ^ $45; //@line 112 "SIDH_v1.0/generic/fp_generic.c"
 HEAP32[$46>>2] = $48; //@line 112 "SIDH_v1.0/generic/fp_generic.c"
 $49 = $ahbl; //@line 114 "SIDH_v1.0/generic/fp_generic.c"
 $50 = $49 >>> 16; //@line 114 "SIDH_v1.0/generic/fp_generic.c"
 $res1 = $50; //@line 114 "SIDH_v1.0/generic/fp_generic.c"
 $51 = $albh; //@line 115 "SIDH_v1.0/generic/fp_generic.c"
 $52 = $51 >>> 16; //@line 115 "SIDH_v1.0/generic/fp_generic.c"
 $res2 = $52; //@line 115 "SIDH_v1.0/generic/fp_generic.c"
 $53 = $ahbh; //@line 116 "SIDH_v1.0/generic/fp_generic.c"
 $54 = $mask_low; //@line 116 "SIDH_v1.0/generic/fp_generic.c"
 $55 = $53 & $54; //@line 116 "SIDH_v1.0/generic/fp_generic.c"
 $res3 = $55; //@line 116 "SIDH_v1.0/generic/fp_generic.c"
 $56 = $res1; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $57 = $res2; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $58 = (($56) + ($57))|0; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $59 = $res3; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $60 = (($58) + ($59))|0; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $61 = $carry; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $62 = (($60) + ($61))|0; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $temp = $62; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $63 = $temp; //@line 118 "SIDH_v1.0/generic/fp_generic.c"
 $64 = $mask_low; //@line 118 "SIDH_v1.0/generic/fp_generic.c"
 $65 = $63 & $64; //@line 118 "SIDH_v1.0/generic/fp_generic.c"
 $66 = $2; //@line 118 "SIDH_v1.0/generic/fp_generic.c"
 $67 = ((($66)) + 4|0); //@line 118 "SIDH_v1.0/generic/fp_generic.c"
 HEAP32[$67>>2] = $65; //@line 118 "SIDH_v1.0/generic/fp_generic.c"
 $68 = $temp; //@line 119 "SIDH_v1.0/generic/fp_generic.c"
 $69 = $mask_high; //@line 119 "SIDH_v1.0/generic/fp_generic.c"
 $70 = $68 & $69; //@line 119 "SIDH_v1.0/generic/fp_generic.c"
 $carry = $70; //@line 119 "SIDH_v1.0/generic/fp_generic.c"
 $71 = $ahbh; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $72 = $mask_high; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $73 = $71 & $72; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $74 = $carry; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $75 = (($73) + ($74))|0; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $76 = $2; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $77 = ((($76)) + 4|0); //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $78 = HEAP32[$77>>2]|0; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $79 = $78 ^ $75; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 HEAP32[$77>>2] = $79; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 STACKTOP = sp;return; //@line 121 "SIDH_v1.0/generic/fp_generic.c"
}
function _mp_mul($a,$b,$c,$nwords) {
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 $nwords = $nwords|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $8 = 0, $9 = 0, $UV = 0, $carry = 0, $i = 0;
 var $j = 0, $tempReg = 0, $tempReg1 = 0, $u = 0, $v = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $UV = sp + 16|0;
 $0 = $a;
 $1 = $b;
 $2 = $c;
 $3 = $nwords;
 $carry = 0; //@line 128 "SIDH_v1.0/generic/fp_generic.c"
 $i = 0; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $4 = $i; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $5 = $3; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $5<<1; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $7 = ($4>>>0)<($6>>>0); //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  if (!($7)) {
   break;
  }
  $8 = $i; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $9 = $2; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $10 = (($9) + ($8<<2)|0); //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$10>>2] = 0; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $11 = $i; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $12 = (($11) + 1)|0; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $i = $12; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
 }
 $i = 0; //@line 132 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $13 = $i; //@line 132 "SIDH_v1.0/generic/fp_generic.c"
  $14 = $3; //@line 132 "SIDH_v1.0/generic/fp_generic.c"
  $15 = ($13>>>0)<($14>>>0); //@line 132 "SIDH_v1.0/generic/fp_generic.c"
  if (!($15)) {
   break;
  }
  $u = 0; //@line 133 "SIDH_v1.0/generic/fp_generic.c"
  $j = 0; //@line 134 "SIDH_v1.0/generic/fp_generic.c"
  while(1) {
   $16 = $j; //@line 134 "SIDH_v1.0/generic/fp_generic.c"
   $17 = $3; //@line 134 "SIDH_v1.0/generic/fp_generic.c"
   $18 = ($16>>>0)<($17>>>0); //@line 134 "SIDH_v1.0/generic/fp_generic.c"
   if (!($18)) {
    break;
   }
   $19 = $i; //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $20 = $0; //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $21 = (($20) + ($19<<2)|0); //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $22 = HEAP32[$21>>2]|0; //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $23 = $j; //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $24 = $1; //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $25 = (($24) + ($23<<2)|0); //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $26 = HEAP32[$25>>2]|0; //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   _digit_x_digit($22,$26,$UV); //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $27 = HEAP32[$UV>>2]|0; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $28 = (($27) + 0)|0; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $tempReg = $28; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $29 = $u; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $30 = $tempReg; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $31 = (($29) + ($30))|0; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $v = $31; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $32 = $tempReg; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $33 = (_is_digit_lessthan_ct69($32,0)|0); //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $34 = $v; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $35 = $tempReg; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $36 = (_is_digit_lessthan_ct69($34,$35)|0); //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $37 = $33 | $36; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $carry = $37; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $38 = ((($UV)) + 4|0); //@line 137 "SIDH_v1.0/generic/fp_generic.c"
   $39 = HEAP32[$38>>2]|0; //@line 137 "SIDH_v1.0/generic/fp_generic.c"
   $40 = $carry; //@line 137 "SIDH_v1.0/generic/fp_generic.c"
   $41 = (($39) + ($40))|0; //@line 137 "SIDH_v1.0/generic/fp_generic.c"
   $u = $41; //@line 137 "SIDH_v1.0/generic/fp_generic.c"
   $42 = $i; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $43 = $j; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $44 = (($42) + ($43))|0; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $45 = $2; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $46 = (($45) + ($44<<2)|0); //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $47 = HEAP32[$46>>2]|0; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $48 = (($47) + 0)|0; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $tempReg1 = $48; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $49 = $v; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $50 = $tempReg1; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $51 = (($49) + ($50))|0; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $v = $51; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $52 = $tempReg1; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $53 = (_is_digit_lessthan_ct69($52,0)|0); //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $54 = $v; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $55 = $tempReg1; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $56 = (_is_digit_lessthan_ct69($54,$55)|0); //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $57 = $53 | $56; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $carry = $57; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $58 = $u; //@line 139 "SIDH_v1.0/generic/fp_generic.c"
   $59 = $carry; //@line 139 "SIDH_v1.0/generic/fp_generic.c"
   $60 = (($58) + ($59))|0; //@line 139 "SIDH_v1.0/generic/fp_generic.c"
   $u = $60; //@line 139 "SIDH_v1.0/generic/fp_generic.c"
   $61 = $v; //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   $62 = $i; //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   $63 = $j; //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   $64 = (($62) + ($63))|0; //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   $65 = $2; //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   $66 = (($65) + ($64<<2)|0); //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   HEAP32[$66>>2] = $61; //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   $67 = $j; //@line 134 "SIDH_v1.0/generic/fp_generic.c"
   $68 = (($67) + 1)|0; //@line 134 "SIDH_v1.0/generic/fp_generic.c"
   $j = $68; //@line 134 "SIDH_v1.0/generic/fp_generic.c"
  }
  $69 = $u; //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  $70 = $3; //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  $71 = $i; //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  $72 = (($70) + ($71))|0; //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  $73 = $2; //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  $74 = (($73) + ($72<<2)|0); //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$74>>2] = $69; //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  $75 = $i; //@line 132 "SIDH_v1.0/generic/fp_generic.c"
  $76 = (($75) + 1)|0; //@line 132 "SIDH_v1.0/generic/fp_generic.c"
  $i = $76; //@line 132 "SIDH_v1.0/generic/fp_generic.c"
 }
 STACKTOP = sp;return; //@line 144 "SIDH_v1.0/generic/fp_generic.c"
}
function _rdc_mont($ma,$mc) {
 $ma = $ma|0;
 $mc = $mc|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, $UV = 0, $carry = 0, $count = 0, $i = 0, $j = 0, $mask = 0, $t = 0, $tempReg = 0, $tempReg1 = 0, $tempReg10 = 0, $tempReg2 = 0, $tempReg3 = 0, $tempReg4 = 0, $tempReg5 = 0, $tempReg6 = 0, $tempReg7 = 0, $tempReg8 = 0, $tempReg9 = 0;
 var $u = 0, $v = 0, $z = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $UV = sp + 160|0;
 $z = sp + 44|0;
 $0 = $ma;
 $1 = $mc;
 $count = 11; //@line 186 "SIDH_v1.0/generic/fp_generic.c"
 $t = 0; //@line 187 "SIDH_v1.0/generic/fp_generic.c"
 $u = 0; //@line 187 "SIDH_v1.0/generic/fp_generic.c"
 $v = 0; //@line 187 "SIDH_v1.0/generic/fp_generic.c"
 dest=$z; stop=dest+100|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0)); //@line 187 "SIDH_v1.0/generic/fp_generic.c"
 $i = 0; //@line 189 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $2 = $i; //@line 189 "SIDH_v1.0/generic/fp_generic.c"
  $3 = ($2>>>0)<(24); //@line 189 "SIDH_v1.0/generic/fp_generic.c"
  if (!($3)) {
   break;
  }
  $j = 0; //@line 190 "SIDH_v1.0/generic/fp_generic.c"
  while(1) {
   $4 = $j; //@line 190 "SIDH_v1.0/generic/fp_generic.c"
   $5 = $i; //@line 190 "SIDH_v1.0/generic/fp_generic.c"
   $6 = ($4>>>0)<($5>>>0); //@line 190 "SIDH_v1.0/generic/fp_generic.c"
   if (!($6)) {
    break;
   }
   $7 = $j; //@line 191 "SIDH_v1.0/generic/fp_generic.c"
   $8 = $i; //@line 191 "SIDH_v1.0/generic/fp_generic.c"
   $9 = (($8) - 11)|0; //@line 191 "SIDH_v1.0/generic/fp_generic.c"
   $10 = (($9) + 1)|0; //@line 191 "SIDH_v1.0/generic/fp_generic.c"
   $11 = ($7>>>0)<($10>>>0); //@line 191 "SIDH_v1.0/generic/fp_generic.c"
   if ($11) {
    $12 = $j; //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $13 = (($z) + ($12<<2)|0); //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $14 = HEAP32[$13>>2]|0; //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $15 = $i; //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $16 = $j; //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $17 = (($15) - ($16))|0; //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $18 = (2648 + ($17<<2)|0); //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $19 = HEAP32[$18>>2]|0; //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    _digit_x_digit($14,$19,$UV); //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $20 = HEAP32[$UV>>2]|0; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $21 = (($20) + 0)|0; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $tempReg = $21; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $22 = $v; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $23 = $tempReg; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $24 = (($22) + ($23))|0; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $v = $24; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $25 = $tempReg; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $26 = (_is_digit_lessthan_ct69($25,0)|0); //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $27 = $v; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $28 = $tempReg; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $29 = (_is_digit_lessthan_ct69($27,$28)|0); //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $30 = $26 | $29; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $carry = $30; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $31 = ((($UV)) + 4|0); //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $32 = HEAP32[$31>>2]|0; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $33 = $carry; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $34 = (($32) + ($33))|0; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $tempReg1 = $34; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $35 = $u; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $36 = $tempReg1; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $37 = (($35) + ($36))|0; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $u = $37; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $38 = $tempReg1; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $39 = $carry; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $40 = (_is_digit_lessthan_ct69($38,$39)|0); //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $41 = $u; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $42 = $tempReg1; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $43 = (_is_digit_lessthan_ct69($41,$42)|0); //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $44 = $40 | $43; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $carry = $44; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $45 = $carry; //@line 195 "SIDH_v1.0/generic/fp_generic.c"
    $46 = $t; //@line 195 "SIDH_v1.0/generic/fp_generic.c"
    $47 = (($46) + ($45))|0; //@line 195 "SIDH_v1.0/generic/fp_generic.c"
    $t = $47; //@line 195 "SIDH_v1.0/generic/fp_generic.c"
   }
   $48 = $j; //@line 190 "SIDH_v1.0/generic/fp_generic.c"
   $49 = (($48) + 1)|0; //@line 190 "SIDH_v1.0/generic/fp_generic.c"
   $j = $49; //@line 190 "SIDH_v1.0/generic/fp_generic.c"
  }
  $50 = $v; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $51 = (($50) + 0)|0; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $tempReg2 = $51; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $52 = $i; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $53 = $0; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $54 = (($53) + ($52<<2)|0); //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $55 = HEAP32[$54>>2]|0; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $56 = $tempReg2; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $57 = (($55) + ($56))|0; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $v = $57; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $58 = $tempReg2; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $59 = (_is_digit_lessthan_ct69($58,0)|0); //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $60 = $v; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $61 = $tempReg2; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $62 = (_is_digit_lessthan_ct69($60,$61)|0); //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $63 = $59 | $62; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $carry = $63; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $64 = $u; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $65 = $carry; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $66 = (($64) + ($65))|0; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $tempReg3 = $66; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $67 = $tempReg3; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $68 = (0 + ($67))|0; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $u = $68; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $69 = $tempReg3; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $70 = $carry; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $71 = (_is_digit_lessthan_ct69($69,$70)|0); //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $72 = $u; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $73 = $tempReg3; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $74 = (_is_digit_lessthan_ct69($72,$73)|0); //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $75 = $71 | $74; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $carry = $75; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $76 = $carry; //@line 200 "SIDH_v1.0/generic/fp_generic.c"
  $77 = $t; //@line 200 "SIDH_v1.0/generic/fp_generic.c"
  $78 = (($77) + ($76))|0; //@line 200 "SIDH_v1.0/generic/fp_generic.c"
  $t = $78; //@line 200 "SIDH_v1.0/generic/fp_generic.c"
  $79 = $v; //@line 201 "SIDH_v1.0/generic/fp_generic.c"
  $80 = $i; //@line 201 "SIDH_v1.0/generic/fp_generic.c"
  $81 = (($z) + ($80<<2)|0); //@line 201 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$81>>2] = $79; //@line 201 "SIDH_v1.0/generic/fp_generic.c"
  $82 = $u; //@line 202 "SIDH_v1.0/generic/fp_generic.c"
  $v = $82; //@line 202 "SIDH_v1.0/generic/fp_generic.c"
  $83 = $t; //@line 203 "SIDH_v1.0/generic/fp_generic.c"
  $u = $83; //@line 203 "SIDH_v1.0/generic/fp_generic.c"
  $t = 0; //@line 204 "SIDH_v1.0/generic/fp_generic.c"
  $84 = $i; //@line 189 "SIDH_v1.0/generic/fp_generic.c"
  $85 = (($84) + 1)|0; //@line 189 "SIDH_v1.0/generic/fp_generic.c"
  $i = $85; //@line 189 "SIDH_v1.0/generic/fp_generic.c"
 }
 $i = 24; //@line 207 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $86 = $i; //@line 207 "SIDH_v1.0/generic/fp_generic.c"
  $87 = ($86>>>0)<(47); //@line 207 "SIDH_v1.0/generic/fp_generic.c"
  if (!($87)) {
   break;
  }
  $88 = $count; //@line 208 "SIDH_v1.0/generic/fp_generic.c"
  $89 = ($88>>>0)>(0); //@line 208 "SIDH_v1.0/generic/fp_generic.c"
  if ($89) {
   $90 = $count; //@line 209 "SIDH_v1.0/generic/fp_generic.c"
   $91 = (($90) - 1)|0; //@line 209 "SIDH_v1.0/generic/fp_generic.c"
   $count = $91; //@line 209 "SIDH_v1.0/generic/fp_generic.c"
  }
  $92 = $i; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
  $93 = (($92) - 24)|0; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
  $94 = (($93) + 1)|0; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
  $j = $94; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
  while(1) {
   $95 = $j; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
   $96 = ($95>>>0)<(24); //@line 211 "SIDH_v1.0/generic/fp_generic.c"
   if (!($96)) {
    break;
   }
   $97 = $j; //@line 212 "SIDH_v1.0/generic/fp_generic.c"
   $98 = $count; //@line 212 "SIDH_v1.0/generic/fp_generic.c"
   $99 = (24 - ($98))|0; //@line 212 "SIDH_v1.0/generic/fp_generic.c"
   $100 = ($97>>>0)<($99>>>0); //@line 212 "SIDH_v1.0/generic/fp_generic.c"
   if ($100) {
    $101 = $j; //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $102 = (($z) + ($101<<2)|0); //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $103 = HEAP32[$102>>2]|0; //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $104 = $i; //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $105 = $j; //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $106 = (($104) - ($105))|0; //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $107 = (2648 + ($106<<2)|0); //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $108 = HEAP32[$107>>2]|0; //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    _digit_x_digit($103,$108,$UV); //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $109 = HEAP32[$UV>>2]|0; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $110 = (($109) + 0)|0; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $tempReg4 = $110; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $111 = $v; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $112 = $tempReg4; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $113 = (($111) + ($112))|0; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $v = $113; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $114 = $tempReg4; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $115 = (_is_digit_lessthan_ct69($114,0)|0); //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $116 = $v; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $117 = $tempReg4; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $118 = (_is_digit_lessthan_ct69($116,$117)|0); //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $119 = $115 | $118; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $carry = $119; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $120 = ((($UV)) + 4|0); //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $121 = HEAP32[$120>>2]|0; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $122 = $carry; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $123 = (($121) + ($122))|0; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $tempReg5 = $123; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $124 = $u; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $125 = $tempReg5; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $126 = (($124) + ($125))|0; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $u = $126; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $127 = $tempReg5; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $128 = $carry; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $129 = (_is_digit_lessthan_ct69($127,$128)|0); //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $130 = $u; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $131 = $tempReg5; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $132 = (_is_digit_lessthan_ct69($130,$131)|0); //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $133 = $129 | $132; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $carry = $133; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $134 = $carry; //@line 216 "SIDH_v1.0/generic/fp_generic.c"
    $135 = $t; //@line 216 "SIDH_v1.0/generic/fp_generic.c"
    $136 = (($135) + ($134))|0; //@line 216 "SIDH_v1.0/generic/fp_generic.c"
    $t = $136; //@line 216 "SIDH_v1.0/generic/fp_generic.c"
   }
   $137 = $j; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
   $138 = (($137) + 1)|0; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
   $j = $138; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
  }
  $139 = $v; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $140 = (($139) + 0)|0; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $tempReg6 = $140; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $141 = $i; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $142 = $0; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $143 = (($142) + ($141<<2)|0); //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $144 = HEAP32[$143>>2]|0; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $145 = $tempReg6; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $146 = (($144) + ($145))|0; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $v = $146; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $147 = $tempReg6; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $148 = (_is_digit_lessthan_ct69($147,0)|0); //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $149 = $v; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $150 = $tempReg6; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $151 = (_is_digit_lessthan_ct69($149,$150)|0); //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $152 = $148 | $151; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $carry = $152; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $153 = $u; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $154 = $carry; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $155 = (($153) + ($154))|0; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $tempReg7 = $155; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $156 = $tempReg7; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $157 = (0 + ($156))|0; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $u = $157; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $158 = $tempReg7; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $159 = $carry; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $160 = (_is_digit_lessthan_ct69($158,$159)|0); //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $161 = $u; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $162 = $tempReg7; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $163 = (_is_digit_lessthan_ct69($161,$162)|0); //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $164 = $160 | $163; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $carry = $164; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $165 = $carry; //@line 221 "SIDH_v1.0/generic/fp_generic.c"
  $166 = $t; //@line 221 "SIDH_v1.0/generic/fp_generic.c"
  $167 = (($166) + ($165))|0; //@line 221 "SIDH_v1.0/generic/fp_generic.c"
  $t = $167; //@line 221 "SIDH_v1.0/generic/fp_generic.c"
  $168 = $v; //@line 222 "SIDH_v1.0/generic/fp_generic.c"
  $169 = $i; //@line 222 "SIDH_v1.0/generic/fp_generic.c"
  $170 = (($169) - 24)|0; //@line 222 "SIDH_v1.0/generic/fp_generic.c"
  $171 = (($z) + ($170<<2)|0); //@line 222 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$171>>2] = $168; //@line 222 "SIDH_v1.0/generic/fp_generic.c"
  $172 = $u; //@line 223 "SIDH_v1.0/generic/fp_generic.c"
  $v = $172; //@line 223 "SIDH_v1.0/generic/fp_generic.c"
  $173 = $t; //@line 224 "SIDH_v1.0/generic/fp_generic.c"
  $u = $173; //@line 224 "SIDH_v1.0/generic/fp_generic.c"
  $t = 0; //@line 225 "SIDH_v1.0/generic/fp_generic.c"
  $174 = $i; //@line 207 "SIDH_v1.0/generic/fp_generic.c"
  $175 = (($174) + 1)|0; //@line 207 "SIDH_v1.0/generic/fp_generic.c"
  $i = $175; //@line 207 "SIDH_v1.0/generic/fp_generic.c"
 }
 $176 = $v; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $177 = (($176) + 0)|0; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $tempReg8 = $177; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $178 = $0; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $179 = ((($178)) + 188|0); //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $180 = HEAP32[$179>>2]|0; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $181 = $tempReg8; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $182 = (($180) + ($181))|0; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $v = $182; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $183 = $tempReg8; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $184 = (_is_digit_lessthan_ct69($183,0)|0); //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $185 = $v; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $186 = $tempReg8; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $187 = (_is_digit_lessthan_ct69($185,$186)|0); //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $188 = $184 | $187; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $carry = $188; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $189 = $u; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $190 = $carry; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $191 = (($189) + ($190))|0; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $tempReg9 = $191; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $192 = $tempReg9; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $193 = (0 + ($192))|0; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $u = $193; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $194 = $tempReg9; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $195 = $carry; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $196 = (_is_digit_lessthan_ct69($194,$195)|0); //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $197 = $u; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $198 = $tempReg9; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $199 = (_is_digit_lessthan_ct69($197,$198)|0); //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $200 = $196 | $199; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $carry = $200; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $201 = $carry; //@line 229 "SIDH_v1.0/generic/fp_generic.c"
 $202 = $t; //@line 229 "SIDH_v1.0/generic/fp_generic.c"
 $203 = (($202) + ($201))|0; //@line 229 "SIDH_v1.0/generic/fp_generic.c"
 $t = $203; //@line 229 "SIDH_v1.0/generic/fp_generic.c"
 $204 = $v; //@line 230 "SIDH_v1.0/generic/fp_generic.c"
 $205 = ((($z)) + 92|0); //@line 230 "SIDH_v1.0/generic/fp_generic.c"
 HEAP32[$205>>2] = $204; //@line 230 "SIDH_v1.0/generic/fp_generic.c"
 $206 = $u; //@line 231 "SIDH_v1.0/generic/fp_generic.c"
 $207 = ((($z)) + 96|0); //@line 231 "SIDH_v1.0/generic/fp_generic.c"
 HEAP32[$207>>2] = $206; //@line 231 "SIDH_v1.0/generic/fp_generic.c"
 $208 = $1; //@line 234 "SIDH_v1.0/generic/fp_generic.c"
 $209 = (_mp_sub($z,2456,$208,24)|0); //@line 234 "SIDH_v1.0/generic/fp_generic.c"
 $carry = $209; //@line 234 "SIDH_v1.0/generic/fp_generic.c"
 $210 = $carry; //@line 235 "SIDH_v1.0/generic/fp_generic.c"
 $211 = (0 - ($210))|0; //@line 235 "SIDH_v1.0/generic/fp_generic.c"
 $mask = $211; //@line 235 "SIDH_v1.0/generic/fp_generic.c"
 $carry = 0; //@line 237 "SIDH_v1.0/generic/fp_generic.c"
 $i = 0; //@line 238 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $212 = $i; //@line 238 "SIDH_v1.0/generic/fp_generic.c"
  $213 = ($212>>>0)<(24); //@line 238 "SIDH_v1.0/generic/fp_generic.c"
  if (!($213)) {
   break;
  }
  $214 = $i; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $215 = $1; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $216 = (($215) + ($214<<2)|0); //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $217 = HEAP32[$216>>2]|0; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $218 = $carry; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $219 = (($217) + ($218))|0; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $tempReg10 = $219; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $220 = $i; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $221 = (2456 + ($220<<2)|0); //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $222 = HEAP32[$221>>2]|0; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $223 = $mask; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $224 = $222 & $223; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $225 = $tempReg10; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $226 = (($224) + ($225))|0; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $227 = $i; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $228 = $1; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $229 = (($228) + ($227<<2)|0); //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$229>>2] = $226; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $230 = $tempReg10; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $231 = $carry; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $232 = (_is_digit_lessthan_ct69($230,$231)|0); //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $233 = $i; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $234 = $1; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $235 = (($234) + ($233<<2)|0); //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $236 = HEAP32[$235>>2]|0; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $237 = $tempReg10; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $238 = (_is_digit_lessthan_ct69($236,$237)|0); //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $239 = $232 | $238; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $carry = $239; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $240 = $i; //@line 238 "SIDH_v1.0/generic/fp_generic.c"
  $241 = (($240) + 1)|0; //@line 238 "SIDH_v1.0/generic/fp_generic.c"
  $i = $241; //@line 238 "SIDH_v1.0/generic/fp_generic.c"
 }
 STACKTOP = sp;return; //@line 242 "SIDH_v1.0/generic/fp_generic.c"
}
function _is_digit_lessthan_ct69($x,$y) {
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $y;
 $2 = $0; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $3 = $0; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $4 = $1; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $5 = $3 ^ $4; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $6 = $0; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $7 = $1; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $8 = (($6) - ($7))|0; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $9 = $1; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $10 = $8 ^ $9; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $11 = $5 | $10; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $12 = $2 ^ $11; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $13 = $12 >>> 31; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 STACKTOP = sp;return ($13|0); //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
}
function _is_digit_zero_ct70($x) {
 $x = $x|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $0; //@line 77 "SIDH_v1.0/generic/../SIDH_internal.h"
 $2 = (_is_digit_nonzero_ct71($1)|0); //@line 77 "SIDH_v1.0/generic/../SIDH_internal.h"
 $3 = 1 ^ $2; //@line 77 "SIDH_v1.0/generic/../SIDH_internal.h"
 STACKTOP = sp;return ($3|0); //@line 77 "SIDH_v1.0/generic/../SIDH_internal.h"
}
function _is_digit_nonzero_ct71($x) {
 $x = $x|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $0; //@line 72 "SIDH_v1.0/generic/../SIDH_internal.h"
 $2 = $0; //@line 72 "SIDH_v1.0/generic/../SIDH_internal.h"
 $3 = (0 - ($2))|0; //@line 72 "SIDH_v1.0/generic/../SIDH_internal.h"
 $4 = $1 | $3; //@line 72 "SIDH_v1.0/generic/../SIDH_internal.h"
 $5 = $4 >>> 31; //@line 72 "SIDH_v1.0/generic/../SIDH_internal.h"
 STACKTOP = sp;return ($5|0); //@line 72 "SIDH_v1.0/generic/../SIDH_internal.h"
}
function _KeyGeneration_A($pPrivateKeyA,$pPublicKeyA,$CurveIsogeny) {
 $pPrivateKeyA = $pPrivateKeyA|0;
 $pPublicKeyA = $pPublicKeyA|0;
 $CurveIsogeny = $CurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0;
 var $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0;
 var $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0;
 var $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $A = 0, $Aout = 0, $C = 0, $Cout = 0, $P = 0, $PublicKeyA = 0, $R = 0;
 var $Status = 0, $coeff = 0, $i = 0, $index = 0, $m = 0, $npts = 0, $or$cond = 0, $owords = 0, $phiD = 0, $phiP = 0, $phiQ = 0, $pts = 0, $pts_index = 0, $pwords = 0, $row = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 6624|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $P = sp + 6408|0;
 $R = sp + 6024|0;
 $phiP = sp + 5640|0;
 $phiQ = sp + 5256|0;
 $phiD = sp + 4872|0;
 $pts = sp + 1800|0;
 $pts_index = sp + 1744|0;
 $coeff = sp + 776|0;
 $A = sp + 584|0;
 $C = sp + 392|0;
 $Aout = sp + 200|0;
 $Cout = sp + 8|0;
 $1 = $pPrivateKeyA;
 $2 = $pPublicKeyA;
 $3 = $CurveIsogeny;
 $4 = $3; //@line 24 "SIDH_v1.0/kex.c"
 $5 = ((($4)) + 16|0); //@line 24 "SIDH_v1.0/kex.c"
 $6 = HEAP32[$5>>2]|0; //@line 24 "SIDH_v1.0/kex.c"
 $7 = (($6) + 32)|0; //@line 24 "SIDH_v1.0/kex.c"
 $8 = (($7) - 1)|0; //@line 24 "SIDH_v1.0/kex.c"
 $9 = (($8>>>0) / 32)&-1; //@line 24 "SIDH_v1.0/kex.c"
 $owords = $9; //@line 24 "SIDH_v1.0/kex.c"
 $10 = $3; //@line 24 "SIDH_v1.0/kex.c"
 $11 = ((($10)) + 12|0); //@line 24 "SIDH_v1.0/kex.c"
 $12 = HEAP32[$11>>2]|0; //@line 24 "SIDH_v1.0/kex.c"
 $13 = (($12) + 32)|0; //@line 24 "SIDH_v1.0/kex.c"
 $14 = (($13) - 1)|0; //@line 24 "SIDH_v1.0/kex.c"
 $15 = (($14>>>0) / 32)&-1; //@line 24 "SIDH_v1.0/kex.c"
 $pwords = $15; //@line 24 "SIDH_v1.0/kex.c"
 _memset(($phiP|0),0,384)|0; //@line 26 "SIDH_v1.0/kex.c"
 _memset(($phiQ|0),0,384)|0; //@line 26 "SIDH_v1.0/kex.c"
 _memset(($phiD|0),0,384)|0; //@line 26 "SIDH_v1.0/kex.c"
 $16 = $2; //@line 27 "SIDH_v1.0/kex.c"
 $PublicKeyA = $16; //@line 27 "SIDH_v1.0/kex.c"
 $index = 0; //@line 28 "SIDH_v1.0/kex.c"
 $npts = 0; //@line 28 "SIDH_v1.0/kex.c"
 _memset(($A|0),0,192)|0; //@line 29 "SIDH_v1.0/kex.c"
 _memset(($C|0),0,192)|0; //@line 29 "SIDH_v1.0/kex.c"
 $Status = 3; //@line 30 "SIDH_v1.0/kex.c"
 $17 = $1; //@line 32 "SIDH_v1.0/kex.c"
 $18 = ($17|0)==(0|0); //@line 32 "SIDH_v1.0/kex.c"
 $19 = $2;
 $20 = ($19|0)==(0|0); //@line 32 "SIDH_v1.0/kex.c"
 $or$cond = $18 | $20; //@line 32 "SIDH_v1.0/kex.c"
 if (!($or$cond)) {
  $21 = $3; //@line 32 "SIDH_v1.0/kex.c"
  $22 = (_is_CurveIsogenyStruct_null($21)|0); //@line 32 "SIDH_v1.0/kex.c"
  if (!($22)) {
   $23 = $1; //@line 37 "SIDH_v1.0/kex.c"
   $24 = $3; //@line 37 "SIDH_v1.0/kex.c"
   $25 = (_random_mod_order($23,0,$24)|0); //@line 37 "SIDH_v1.0/kex.c"
   $Status = $25; //@line 37 "SIDH_v1.0/kex.c"
   $26 = $Status; //@line 38 "SIDH_v1.0/kex.c"
   $27 = ($26|0)!=(0); //@line 38 "SIDH_v1.0/kex.c"
   if ($27) {
    $28 = $1; //@line 39 "SIDH_v1.0/kex.c"
    $29 = $owords; //@line 39 "SIDH_v1.0/kex.c"
    _clear_words($28,$29); //@line 39 "SIDH_v1.0/kex.c"
    $30 = $Status; //@line 40 "SIDH_v1.0/kex.c"
    $0 = $30; //@line 40 "SIDH_v1.0/kex.c"
    $152 = $0; //@line 123 "SIDH_v1.0/kex.c"
    STACKTOP = sp;return ($152|0); //@line 123 "SIDH_v1.0/kex.c"
   }
   $31 = $3; //@line 43 "SIDH_v1.0/kex.c"
   $32 = ((($31)) + 56|0); //@line 43 "SIDH_v1.0/kex.c"
   $33 = HEAP32[$32>>2]|0; //@line 43 "SIDH_v1.0/kex.c"
   _to_mont($33,$P); //@line 43 "SIDH_v1.0/kex.c"
   $34 = $3; //@line 44 "SIDH_v1.0/kex.c"
   $35 = ((($34)) + 56|0); //@line 44 "SIDH_v1.0/kex.c"
   $36 = HEAP32[$35>>2]|0; //@line 44 "SIDH_v1.0/kex.c"
   $37 = ((($36)) + 96|0); //@line 44 "SIDH_v1.0/kex.c"
   $38 = ((($P)) + 96|0); //@line 44 "SIDH_v1.0/kex.c"
   _to_mont($37,$38); //@line 44 "SIDH_v1.0/kex.c"
   $39 = $1; //@line 46 "SIDH_v1.0/kex.c"
   $40 = $3; //@line 46 "SIDH_v1.0/kex.c"
   $41 = (_secret_pt($P,$39,0,$R,$40)|0); //@line 46 "SIDH_v1.0/kex.c"
   $Status = $41; //@line 46 "SIDH_v1.0/kex.c"
   $42 = $Status; //@line 47 "SIDH_v1.0/kex.c"
   $43 = ($42|0)!=(0); //@line 47 "SIDH_v1.0/kex.c"
   if ($43) {
    $44 = $1; //@line 48 "SIDH_v1.0/kex.c"
    $45 = $owords; //@line 48 "SIDH_v1.0/kex.c"
    _clear_words($44,$45); //@line 48 "SIDH_v1.0/kex.c"
    $46 = $Status; //@line 49 "SIDH_v1.0/kex.c"
    $0 = $46; //@line 49 "SIDH_v1.0/kex.c"
    $152 = $0; //@line 123 "SIDH_v1.0/kex.c"
    STACKTOP = sp;return ($152|0); //@line 123 "SIDH_v1.0/kex.c"
   }
   $47 = $3; //@line 52 "SIDH_v1.0/kex.c"
   $48 = ((($47)) + 60|0); //@line 52 "SIDH_v1.0/kex.c"
   $49 = HEAP32[$48>>2]|0; //@line 52 "SIDH_v1.0/kex.c"
   $50 = $pwords; //@line 52 "SIDH_v1.0/kex.c"
   _copy_words($49,$phiP,$50); //@line 52 "SIDH_v1.0/kex.c"
   $51 = $3; //@line 53 "SIDH_v1.0/kex.c"
   $52 = ((($51)) + 80|0); //@line 53 "SIDH_v1.0/kex.c"
   $53 = HEAP32[$52>>2]|0; //@line 53 "SIDH_v1.0/kex.c"
   $54 = ((($phiP)) + 192|0); //@line 53 "SIDH_v1.0/kex.c"
   _fpcopy751($53,$54); //@line 53 "SIDH_v1.0/kex.c"
   _to_mont($phiP,$phiP); //@line 54 "SIDH_v1.0/kex.c"
   $55 = $pwords; //@line 55 "SIDH_v1.0/kex.c"
   _copy_words($phiP,$phiQ,$55); //@line 55 "SIDH_v1.0/kex.c"
   _fpneg751($phiQ); //@line 56 "SIDH_v1.0/kex.c"
   $56 = $3; //@line 57 "SIDH_v1.0/kex.c"
   $57 = ((($56)) + 80|0); //@line 57 "SIDH_v1.0/kex.c"
   $58 = HEAP32[$57>>2]|0; //@line 57 "SIDH_v1.0/kex.c"
   $59 = ((($phiQ)) + 192|0); //@line 57 "SIDH_v1.0/kex.c"
   _fpcopy751($58,$59); //@line 57 "SIDH_v1.0/kex.c"
   $60 = $3; //@line 58 "SIDH_v1.0/kex.c"
   _distort_and_diff($phiP,$phiD,$60); //@line 58 "SIDH_v1.0/kex.c"
   $61 = $3; //@line 60 "SIDH_v1.0/kex.c"
   $62 = ((($61)) + 28|0); //@line 60 "SIDH_v1.0/kex.c"
   $63 = HEAP32[$62>>2]|0; //@line 60 "SIDH_v1.0/kex.c"
   _fpcopy751($63,$A); //@line 60 "SIDH_v1.0/kex.c"
   $64 = $3; //@line 61 "SIDH_v1.0/kex.c"
   $65 = ((($64)) + 32|0); //@line 61 "SIDH_v1.0/kex.c"
   $66 = HEAP32[$65>>2]|0; //@line 61 "SIDH_v1.0/kex.c"
   _fpcopy751($66,$C); //@line 61 "SIDH_v1.0/kex.c"
   _to_mont($A,$A); //@line 62 "SIDH_v1.0/kex.c"
   _to_mont($C,$C); //@line 63 "SIDH_v1.0/kex.c"
   $67 = $3; //@line 65 "SIDH_v1.0/kex.c"
   _first_4_isog($phiP,$A,$Aout,$Cout,$67); //@line 65 "SIDH_v1.0/kex.c"
   $68 = $3; //@line 66 "SIDH_v1.0/kex.c"
   _first_4_isog($phiQ,$A,$Aout,$Cout,$68); //@line 66 "SIDH_v1.0/kex.c"
   $69 = $3; //@line 67 "SIDH_v1.0/kex.c"
   _first_4_isog($phiD,$A,$Aout,$Cout,$69); //@line 67 "SIDH_v1.0/kex.c"
   $70 = $3; //@line 68 "SIDH_v1.0/kex.c"
   _first_4_isog($R,$A,$A,$C,$70); //@line 68 "SIDH_v1.0/kex.c"
   $index = 0; //@line 70 "SIDH_v1.0/kex.c"
   $row = 1; //@line 71 "SIDH_v1.0/kex.c"
   while(1) {
    $71 = $row; //@line 71 "SIDH_v1.0/kex.c"
    $72 = ($71>>>0)<(185); //@line 71 "SIDH_v1.0/kex.c"
    if (!($72)) {
     break;
    }
    while(1) {
     $73 = $index; //@line 72 "SIDH_v1.0/kex.c"
     $74 = $row; //@line 72 "SIDH_v1.0/kex.c"
     $75 = (185 - ($74))|0; //@line 72 "SIDH_v1.0/kex.c"
     $76 = ($73>>>0)<($75>>>0); //@line 72 "SIDH_v1.0/kex.c"
     if (!($76)) {
      break;
     }
     $77 = $npts; //@line 73 "SIDH_v1.0/kex.c"
     $78 = (($pts) + (($77*384)|0)|0); //@line 73 "SIDH_v1.0/kex.c"
     _fp2copy751($R,$78); //@line 73 "SIDH_v1.0/kex.c"
     $79 = ((($R)) + 192|0); //@line 74 "SIDH_v1.0/kex.c"
     $80 = $npts; //@line 74 "SIDH_v1.0/kex.c"
     $81 = (($pts) + (($80*384)|0)|0); //@line 74 "SIDH_v1.0/kex.c"
     $82 = ((($81)) + 192|0); //@line 74 "SIDH_v1.0/kex.c"
     _fp2copy751($79,$82); //@line 74 "SIDH_v1.0/kex.c"
     $83 = $index; //@line 75 "SIDH_v1.0/kex.c"
     $84 = $npts; //@line 75 "SIDH_v1.0/kex.c"
     $85 = (($pts_index) + ($84<<2)|0); //@line 75 "SIDH_v1.0/kex.c"
     HEAP32[$85>>2] = $83; //@line 75 "SIDH_v1.0/kex.c"
     $86 = $npts; //@line 76 "SIDH_v1.0/kex.c"
     $87 = (($86) + 1)|0; //@line 76 "SIDH_v1.0/kex.c"
     $npts = $87; //@line 76 "SIDH_v1.0/kex.c"
     $88 = $index; //@line 77 "SIDH_v1.0/kex.c"
     $89 = (185 - ($88))|0; //@line 77 "SIDH_v1.0/kex.c"
     $90 = $row; //@line 77 "SIDH_v1.0/kex.c"
     $91 = (($89) - ($90))|0; //@line 77 "SIDH_v1.0/kex.c"
     $92 = (3032 + ($91<<2)|0); //@line 77 "SIDH_v1.0/kex.c"
     $93 = HEAP32[$92>>2]|0; //@line 77 "SIDH_v1.0/kex.c"
     $m = $93; //@line 77 "SIDH_v1.0/kex.c"
     $94 = $m; //@line 78 "SIDH_v1.0/kex.c"
     $95 = $94<<1; //@line 78 "SIDH_v1.0/kex.c"
     _xDBLe($R,$R,$A,$C,$95); //@line 78 "SIDH_v1.0/kex.c"
     $96 = $m; //@line 79 "SIDH_v1.0/kex.c"
     $97 = $index; //@line 79 "SIDH_v1.0/kex.c"
     $98 = (($97) + ($96))|0; //@line 79 "SIDH_v1.0/kex.c"
     $index = $98; //@line 79 "SIDH_v1.0/kex.c"
    }
    _get_4_isog($R,$A,$C,$coeff); //@line 81 "SIDH_v1.0/kex.c"
    $i = 0; //@line 83 "SIDH_v1.0/kex.c"
    while(1) {
     $99 = $i; //@line 83 "SIDH_v1.0/kex.c"
     $100 = $npts; //@line 83 "SIDH_v1.0/kex.c"
     $101 = ($99>>>0)<($100>>>0); //@line 83 "SIDH_v1.0/kex.c"
     if (!($101)) {
      break;
     }
     $102 = $i; //@line 84 "SIDH_v1.0/kex.c"
     $103 = (($pts) + (($102*384)|0)|0); //@line 84 "SIDH_v1.0/kex.c"
     _eval_4_isog($103,$coeff); //@line 84 "SIDH_v1.0/kex.c"
     $104 = $i; //@line 83 "SIDH_v1.0/kex.c"
     $105 = (($104) + 1)|0; //@line 83 "SIDH_v1.0/kex.c"
     $i = $105; //@line 83 "SIDH_v1.0/kex.c"
    }
    _eval_4_isog($phiP,$coeff); //@line 86 "SIDH_v1.0/kex.c"
    _eval_4_isog($phiQ,$coeff); //@line 87 "SIDH_v1.0/kex.c"
    _eval_4_isog($phiD,$coeff); //@line 88 "SIDH_v1.0/kex.c"
    $106 = $npts; //@line 90 "SIDH_v1.0/kex.c"
    $107 = (($106) - 1)|0; //@line 90 "SIDH_v1.0/kex.c"
    $108 = (($pts) + (($107*384)|0)|0); //@line 90 "SIDH_v1.0/kex.c"
    _fp2copy751($108,$R); //@line 90 "SIDH_v1.0/kex.c"
    $109 = $npts; //@line 91 "SIDH_v1.0/kex.c"
    $110 = (($109) - 1)|0; //@line 91 "SIDH_v1.0/kex.c"
    $111 = (($pts) + (($110*384)|0)|0); //@line 91 "SIDH_v1.0/kex.c"
    $112 = ((($111)) + 192|0); //@line 91 "SIDH_v1.0/kex.c"
    $113 = ((($R)) + 192|0); //@line 91 "SIDH_v1.0/kex.c"
    _fp2copy751($112,$113); //@line 91 "SIDH_v1.0/kex.c"
    $114 = $npts; //@line 92 "SIDH_v1.0/kex.c"
    $115 = (($114) - 1)|0; //@line 92 "SIDH_v1.0/kex.c"
    $116 = (($pts_index) + ($115<<2)|0); //@line 92 "SIDH_v1.0/kex.c"
    $117 = HEAP32[$116>>2]|0; //@line 92 "SIDH_v1.0/kex.c"
    $index = $117; //@line 92 "SIDH_v1.0/kex.c"
    $118 = $npts; //@line 93 "SIDH_v1.0/kex.c"
    $119 = (($118) - 1)|0; //@line 93 "SIDH_v1.0/kex.c"
    $npts = $119; //@line 93 "SIDH_v1.0/kex.c"
    $120 = $row; //@line 71 "SIDH_v1.0/kex.c"
    $121 = (($120) + 1)|0; //@line 71 "SIDH_v1.0/kex.c"
    $row = $121; //@line 71 "SIDH_v1.0/kex.c"
   }
   _get_4_isog($R,$A,$C,$coeff); //@line 96 "SIDH_v1.0/kex.c"
   _eval_4_isog($phiP,$coeff); //@line 97 "SIDH_v1.0/kex.c"
   _eval_4_isog($phiQ,$coeff); //@line 98 "SIDH_v1.0/kex.c"
   _eval_4_isog($phiD,$coeff); //@line 99 "SIDH_v1.0/kex.c"
   $122 = ((($phiP)) + 192|0); //@line 101 "SIDH_v1.0/kex.c"
   $123 = ((($phiQ)) + 192|0); //@line 101 "SIDH_v1.0/kex.c"
   $124 = ((($phiD)) + 192|0); //@line 101 "SIDH_v1.0/kex.c"
   _inv_4_way($C,$122,$123,$124); //@line 101 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($A,$C,$A); //@line 102 "SIDH_v1.0/kex.c"
   $125 = ((($phiP)) + 192|0); //@line 103 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($phiP,$125,$phiP); //@line 103 "SIDH_v1.0/kex.c"
   $126 = ((($phiQ)) + 192|0); //@line 104 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($phiQ,$126,$phiQ); //@line 104 "SIDH_v1.0/kex.c"
   $127 = ((($phiD)) + 192|0); //@line 105 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($phiD,$127,$phiD); //@line 105 "SIDH_v1.0/kex.c"
   $128 = $PublicKeyA; //@line 107 "SIDH_v1.0/kex.c"
   _from_fp2mont($A,$128); //@line 107 "SIDH_v1.0/kex.c"
   $129 = $PublicKeyA; //@line 108 "SIDH_v1.0/kex.c"
   $130 = ((($129)) + 192|0); //@line 108 "SIDH_v1.0/kex.c"
   _from_fp2mont($phiP,$130); //@line 108 "SIDH_v1.0/kex.c"
   $131 = $PublicKeyA; //@line 109 "SIDH_v1.0/kex.c"
   $132 = ((($131)) + 384|0); //@line 109 "SIDH_v1.0/kex.c"
   _from_fp2mont($phiQ,$132); //@line 109 "SIDH_v1.0/kex.c"
   $133 = $PublicKeyA; //@line 110 "SIDH_v1.0/kex.c"
   $134 = ((($133)) + 576|0); //@line 110 "SIDH_v1.0/kex.c"
   _from_fp2mont($phiD,$134); //@line 110 "SIDH_v1.0/kex.c"
   $135 = $pwords; //@line 113 "SIDH_v1.0/kex.c"
   $136 = $135<<2; //@line 113 "SIDH_v1.0/kex.c"
   _clear_words($R,$136); //@line 113 "SIDH_v1.0/kex.c"
   $137 = $pwords; //@line 114 "SIDH_v1.0/kex.c"
   $138 = $137<<2; //@line 114 "SIDH_v1.0/kex.c"
   _clear_words($phiP,$138); //@line 114 "SIDH_v1.0/kex.c"
   $139 = $pwords; //@line 115 "SIDH_v1.0/kex.c"
   $140 = $139<<2; //@line 115 "SIDH_v1.0/kex.c"
   _clear_words($phiQ,$140); //@line 115 "SIDH_v1.0/kex.c"
   $141 = $pwords; //@line 116 "SIDH_v1.0/kex.c"
   $142 = $141<<2; //@line 116 "SIDH_v1.0/kex.c"
   _clear_words($phiD,$142); //@line 116 "SIDH_v1.0/kex.c"
   $143 = $pwords; //@line 117 "SIDH_v1.0/kex.c"
   $144 = $143<<5; //@line 117 "SIDH_v1.0/kex.c"
   _clear_words($pts,$144); //@line 117 "SIDH_v1.0/kex.c"
   $145 = $pwords; //@line 118 "SIDH_v1.0/kex.c"
   $146 = $145<<1; //@line 118 "SIDH_v1.0/kex.c"
   _clear_words($A,$146); //@line 118 "SIDH_v1.0/kex.c"
   $147 = $pwords; //@line 119 "SIDH_v1.0/kex.c"
   $148 = $147<<1; //@line 119 "SIDH_v1.0/kex.c"
   _clear_words($C,$148); //@line 119 "SIDH_v1.0/kex.c"
   $149 = $pwords; //@line 120 "SIDH_v1.0/kex.c"
   $150 = ($149*10)|0; //@line 120 "SIDH_v1.0/kex.c"
   _clear_words($coeff,$150); //@line 120 "SIDH_v1.0/kex.c"
   $151 = $Status; //@line 122 "SIDH_v1.0/kex.c"
   $0 = $151; //@line 122 "SIDH_v1.0/kex.c"
   $152 = $0; //@line 123 "SIDH_v1.0/kex.c"
   STACKTOP = sp;return ($152|0); //@line 123 "SIDH_v1.0/kex.c"
  }
 }
 $0 = 6; //@line 33 "SIDH_v1.0/kex.c"
 $152 = $0; //@line 123 "SIDH_v1.0/kex.c"
 STACKTOP = sp;return ($152|0); //@line 123 "SIDH_v1.0/kex.c"
}
function _KeyGeneration_B($pPrivateKeyB,$pPublicKeyB,$CurveIsogeny) {
 $pPrivateKeyB = $pPrivateKeyB|0;
 $pPublicKeyB = $pPublicKeyB|0;
 $CurveIsogeny = $CurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0;
 var $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0;
 var $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0;
 var $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0;
 var $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $A = 0, $C = 0, $P = 0, $PublicKeyB = 0, $R = 0, $Status = 0, $i = 0, $index = 0, $m = 0, $npts = 0, $or$cond = 0, $owords = 0, $phiD = 0, $phiP = 0;
 var $phiQ = 0, $pts = 0, $pts_index = 0, $pwords = 0, $row = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 6064|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $P = sp + 5840|0;
 $R = sp + 5456|0;
 $phiP = sp + 5072|0;
 $phiQ = sp + 4688|0;
 $phiD = sp + 4304|0;
 $pts = sp + 464|0;
 $pts_index = sp + 400|0;
 $A = sp + 200|0;
 $C = sp + 8|0;
 $1 = $pPrivateKeyB;
 $2 = $pPublicKeyB;
 $3 = $CurveIsogeny;
 $4 = $3; //@line 132 "SIDH_v1.0/kex.c"
 $5 = ((($4)) + 16|0); //@line 132 "SIDH_v1.0/kex.c"
 $6 = HEAP32[$5>>2]|0; //@line 132 "SIDH_v1.0/kex.c"
 $7 = (($6) + 32)|0; //@line 132 "SIDH_v1.0/kex.c"
 $8 = (($7) - 1)|0; //@line 132 "SIDH_v1.0/kex.c"
 $9 = (($8>>>0) / 32)&-1; //@line 132 "SIDH_v1.0/kex.c"
 $owords = $9; //@line 132 "SIDH_v1.0/kex.c"
 $10 = $3; //@line 132 "SIDH_v1.0/kex.c"
 $11 = ((($10)) + 12|0); //@line 132 "SIDH_v1.0/kex.c"
 $12 = HEAP32[$11>>2]|0; //@line 132 "SIDH_v1.0/kex.c"
 $13 = (($12) + 32)|0; //@line 132 "SIDH_v1.0/kex.c"
 $14 = (($13) - 1)|0; //@line 132 "SIDH_v1.0/kex.c"
 $15 = (($14>>>0) / 32)&-1; //@line 132 "SIDH_v1.0/kex.c"
 $pwords = $15; //@line 132 "SIDH_v1.0/kex.c"
 _memset(($phiP|0),0,384)|0; //@line 134 "SIDH_v1.0/kex.c"
 _memset(($phiQ|0),0,384)|0; //@line 134 "SIDH_v1.0/kex.c"
 _memset(($phiD|0),0,384)|0; //@line 134 "SIDH_v1.0/kex.c"
 $16 = $2; //@line 135 "SIDH_v1.0/kex.c"
 $PublicKeyB = $16; //@line 135 "SIDH_v1.0/kex.c"
 $index = 0; //@line 136 "SIDH_v1.0/kex.c"
 $npts = 0; //@line 136 "SIDH_v1.0/kex.c"
 _memset(($A|0),0,192)|0; //@line 137 "SIDH_v1.0/kex.c"
 _memset(($C|0),0,192)|0; //@line 137 "SIDH_v1.0/kex.c"
 $Status = 3; //@line 138 "SIDH_v1.0/kex.c"
 $17 = $1; //@line 140 "SIDH_v1.0/kex.c"
 $18 = ($17|0)==(0|0); //@line 140 "SIDH_v1.0/kex.c"
 $19 = $2;
 $20 = ($19|0)==(0|0); //@line 140 "SIDH_v1.0/kex.c"
 $or$cond = $18 | $20; //@line 140 "SIDH_v1.0/kex.c"
 if (!($or$cond)) {
  $21 = $3; //@line 140 "SIDH_v1.0/kex.c"
  $22 = (_is_CurveIsogenyStruct_null($21)|0); //@line 140 "SIDH_v1.0/kex.c"
  if (!($22)) {
   $23 = $1; //@line 145 "SIDH_v1.0/kex.c"
   $24 = $3; //@line 145 "SIDH_v1.0/kex.c"
   $25 = (_random_mod_order($23,1,$24)|0); //@line 145 "SIDH_v1.0/kex.c"
   $Status = $25; //@line 145 "SIDH_v1.0/kex.c"
   $26 = $Status; //@line 146 "SIDH_v1.0/kex.c"
   $27 = ($26|0)!=(0); //@line 146 "SIDH_v1.0/kex.c"
   if ($27) {
    $28 = $1; //@line 147 "SIDH_v1.0/kex.c"
    $29 = $owords; //@line 147 "SIDH_v1.0/kex.c"
    _clear_words($28,$29); //@line 147 "SIDH_v1.0/kex.c"
    $30 = $Status; //@line 148 "SIDH_v1.0/kex.c"
    $0 = $30; //@line 148 "SIDH_v1.0/kex.c"
    $145 = $0; //@line 225 "SIDH_v1.0/kex.c"
    STACKTOP = sp;return ($145|0); //@line 225 "SIDH_v1.0/kex.c"
   }
   $31 = $3; //@line 151 "SIDH_v1.0/kex.c"
   $32 = ((($31)) + 60|0); //@line 151 "SIDH_v1.0/kex.c"
   $33 = HEAP32[$32>>2]|0; //@line 151 "SIDH_v1.0/kex.c"
   _to_mont($33,$P); //@line 151 "SIDH_v1.0/kex.c"
   $34 = $3; //@line 152 "SIDH_v1.0/kex.c"
   $35 = ((($34)) + 60|0); //@line 152 "SIDH_v1.0/kex.c"
   $36 = HEAP32[$35>>2]|0; //@line 152 "SIDH_v1.0/kex.c"
   $37 = ((($36)) + 96|0); //@line 152 "SIDH_v1.0/kex.c"
   $38 = ((($P)) + 96|0); //@line 152 "SIDH_v1.0/kex.c"
   _to_mont($37,$38); //@line 152 "SIDH_v1.0/kex.c"
   $39 = $1; //@line 154 "SIDH_v1.0/kex.c"
   $40 = $3; //@line 154 "SIDH_v1.0/kex.c"
   $41 = (_secret_pt($P,$39,1,$R,$40)|0); //@line 154 "SIDH_v1.0/kex.c"
   $Status = $41; //@line 154 "SIDH_v1.0/kex.c"
   $42 = $Status; //@line 155 "SIDH_v1.0/kex.c"
   $43 = ($42|0)!=(0); //@line 155 "SIDH_v1.0/kex.c"
   if ($43) {
    $44 = $1; //@line 156 "SIDH_v1.0/kex.c"
    $45 = $owords; //@line 156 "SIDH_v1.0/kex.c"
    _clear_words($44,$45); //@line 156 "SIDH_v1.0/kex.c"
    $46 = $Status; //@line 157 "SIDH_v1.0/kex.c"
    $0 = $46; //@line 157 "SIDH_v1.0/kex.c"
    $145 = $0; //@line 225 "SIDH_v1.0/kex.c"
    STACKTOP = sp;return ($145|0); //@line 225 "SIDH_v1.0/kex.c"
   }
   $47 = $3; //@line 160 "SIDH_v1.0/kex.c"
   $48 = ((($47)) + 56|0); //@line 160 "SIDH_v1.0/kex.c"
   $49 = HEAP32[$48>>2]|0; //@line 160 "SIDH_v1.0/kex.c"
   $50 = $pwords; //@line 160 "SIDH_v1.0/kex.c"
   _copy_words($49,$phiP,$50); //@line 160 "SIDH_v1.0/kex.c"
   $51 = $3; //@line 161 "SIDH_v1.0/kex.c"
   $52 = ((($51)) + 80|0); //@line 161 "SIDH_v1.0/kex.c"
   $53 = HEAP32[$52>>2]|0; //@line 161 "SIDH_v1.0/kex.c"
   $54 = ((($phiP)) + 192|0); //@line 161 "SIDH_v1.0/kex.c"
   _fpcopy751($53,$54); //@line 161 "SIDH_v1.0/kex.c"
   _to_mont($phiP,$phiP); //@line 162 "SIDH_v1.0/kex.c"
   $55 = $pwords; //@line 163 "SIDH_v1.0/kex.c"
   _copy_words($phiP,$phiQ,$55); //@line 163 "SIDH_v1.0/kex.c"
   _fpneg751($phiQ); //@line 164 "SIDH_v1.0/kex.c"
   $56 = $3; //@line 165 "SIDH_v1.0/kex.c"
   $57 = ((($56)) + 80|0); //@line 165 "SIDH_v1.0/kex.c"
   $58 = HEAP32[$57>>2]|0; //@line 165 "SIDH_v1.0/kex.c"
   $59 = ((($phiQ)) + 192|0); //@line 165 "SIDH_v1.0/kex.c"
   _fpcopy751($58,$59); //@line 165 "SIDH_v1.0/kex.c"
   $60 = $3; //@line 166 "SIDH_v1.0/kex.c"
   _distort_and_diff($phiP,$phiD,$60); //@line 166 "SIDH_v1.0/kex.c"
   $61 = $3; //@line 168 "SIDH_v1.0/kex.c"
   $62 = ((($61)) + 28|0); //@line 168 "SIDH_v1.0/kex.c"
   $63 = HEAP32[$62>>2]|0; //@line 168 "SIDH_v1.0/kex.c"
   _fpcopy751($63,$A); //@line 168 "SIDH_v1.0/kex.c"
   $64 = $3; //@line 169 "SIDH_v1.0/kex.c"
   $65 = ((($64)) + 32|0); //@line 169 "SIDH_v1.0/kex.c"
   $66 = HEAP32[$65>>2]|0; //@line 169 "SIDH_v1.0/kex.c"
   _fpcopy751($66,$C); //@line 169 "SIDH_v1.0/kex.c"
   _to_mont($A,$A); //@line 170 "SIDH_v1.0/kex.c"
   _to_mont($C,$C); //@line 171 "SIDH_v1.0/kex.c"
   $index = 0; //@line 173 "SIDH_v1.0/kex.c"
   $row = 1; //@line 174 "SIDH_v1.0/kex.c"
   while(1) {
    $67 = $row; //@line 174 "SIDH_v1.0/kex.c"
    $68 = ($67>>>0)<(239); //@line 174 "SIDH_v1.0/kex.c"
    if (!($68)) {
     break;
    }
    while(1) {
     $69 = $index; //@line 175 "SIDH_v1.0/kex.c"
     $70 = $row; //@line 175 "SIDH_v1.0/kex.c"
     $71 = (239 - ($70))|0; //@line 175 "SIDH_v1.0/kex.c"
     $72 = ($69>>>0)<($71>>>0); //@line 175 "SIDH_v1.0/kex.c"
     if (!($72)) {
      break;
     }
     $73 = $npts; //@line 176 "SIDH_v1.0/kex.c"
     $74 = (($pts) + (($73*384)|0)|0); //@line 176 "SIDH_v1.0/kex.c"
     _fp2copy751($R,$74); //@line 176 "SIDH_v1.0/kex.c"
     $75 = ((($R)) + 192|0); //@line 177 "SIDH_v1.0/kex.c"
     $76 = $npts; //@line 177 "SIDH_v1.0/kex.c"
     $77 = (($pts) + (($76*384)|0)|0); //@line 177 "SIDH_v1.0/kex.c"
     $78 = ((($77)) + 192|0); //@line 177 "SIDH_v1.0/kex.c"
     _fp2copy751($75,$78); //@line 177 "SIDH_v1.0/kex.c"
     $79 = $index; //@line 178 "SIDH_v1.0/kex.c"
     $80 = $npts; //@line 178 "SIDH_v1.0/kex.c"
     $81 = (($pts_index) + ($80<<2)|0); //@line 178 "SIDH_v1.0/kex.c"
     HEAP32[$81>>2] = $79; //@line 178 "SIDH_v1.0/kex.c"
     $82 = $npts; //@line 179 "SIDH_v1.0/kex.c"
     $83 = (($82) + 1)|0; //@line 179 "SIDH_v1.0/kex.c"
     $npts = $83; //@line 179 "SIDH_v1.0/kex.c"
     $84 = $index; //@line 180 "SIDH_v1.0/kex.c"
     $85 = (239 - ($84))|0; //@line 180 "SIDH_v1.0/kex.c"
     $86 = $row; //@line 180 "SIDH_v1.0/kex.c"
     $87 = (($85) - ($86))|0; //@line 180 "SIDH_v1.0/kex.c"
     $88 = (3772 + ($87<<2)|0); //@line 180 "SIDH_v1.0/kex.c"
     $89 = HEAP32[$88>>2]|0; //@line 180 "SIDH_v1.0/kex.c"
     $m = $89; //@line 180 "SIDH_v1.0/kex.c"
     $90 = $m; //@line 181 "SIDH_v1.0/kex.c"
     _xTPLe($R,$R,$A,$C,$90); //@line 181 "SIDH_v1.0/kex.c"
     $91 = $m; //@line 182 "SIDH_v1.0/kex.c"
     $92 = $index; //@line 182 "SIDH_v1.0/kex.c"
     $93 = (($92) + ($91))|0; //@line 182 "SIDH_v1.0/kex.c"
     $index = $93; //@line 182 "SIDH_v1.0/kex.c"
    }
    _get_3_isog($R,$A,$C); //@line 184 "SIDH_v1.0/kex.c"
    $i = 0; //@line 186 "SIDH_v1.0/kex.c"
    while(1) {
     $94 = $i; //@line 186 "SIDH_v1.0/kex.c"
     $95 = $npts; //@line 186 "SIDH_v1.0/kex.c"
     $96 = ($94>>>0)<($95>>>0); //@line 186 "SIDH_v1.0/kex.c"
     if (!($96)) {
      break;
     }
     $97 = $i; //@line 187 "SIDH_v1.0/kex.c"
     $98 = (($pts) + (($97*384)|0)|0); //@line 187 "SIDH_v1.0/kex.c"
     _eval_3_isog($R,$98); //@line 187 "SIDH_v1.0/kex.c"
     $99 = $i; //@line 186 "SIDH_v1.0/kex.c"
     $100 = (($99) + 1)|0; //@line 186 "SIDH_v1.0/kex.c"
     $i = $100; //@line 186 "SIDH_v1.0/kex.c"
    }
    _eval_3_isog($R,$phiP); //@line 189 "SIDH_v1.0/kex.c"
    _eval_3_isog($R,$phiQ); //@line 190 "SIDH_v1.0/kex.c"
    _eval_3_isog($R,$phiD); //@line 191 "SIDH_v1.0/kex.c"
    $101 = $npts; //@line 193 "SIDH_v1.0/kex.c"
    $102 = (($101) - 1)|0; //@line 193 "SIDH_v1.0/kex.c"
    $103 = (($pts) + (($102*384)|0)|0); //@line 193 "SIDH_v1.0/kex.c"
    _fp2copy751($103,$R); //@line 193 "SIDH_v1.0/kex.c"
    $104 = $npts; //@line 194 "SIDH_v1.0/kex.c"
    $105 = (($104) - 1)|0; //@line 194 "SIDH_v1.0/kex.c"
    $106 = (($pts) + (($105*384)|0)|0); //@line 194 "SIDH_v1.0/kex.c"
    $107 = ((($106)) + 192|0); //@line 194 "SIDH_v1.0/kex.c"
    $108 = ((($R)) + 192|0); //@line 194 "SIDH_v1.0/kex.c"
    _fp2copy751($107,$108); //@line 194 "SIDH_v1.0/kex.c"
    $109 = $npts; //@line 195 "SIDH_v1.0/kex.c"
    $110 = (($109) - 1)|0; //@line 195 "SIDH_v1.0/kex.c"
    $111 = (($pts_index) + ($110<<2)|0); //@line 195 "SIDH_v1.0/kex.c"
    $112 = HEAP32[$111>>2]|0; //@line 195 "SIDH_v1.0/kex.c"
    $index = $112; //@line 195 "SIDH_v1.0/kex.c"
    $113 = $npts; //@line 196 "SIDH_v1.0/kex.c"
    $114 = (($113) - 1)|0; //@line 196 "SIDH_v1.0/kex.c"
    $npts = $114; //@line 196 "SIDH_v1.0/kex.c"
    $115 = $row; //@line 174 "SIDH_v1.0/kex.c"
    $116 = (($115) + 1)|0; //@line 174 "SIDH_v1.0/kex.c"
    $row = $116; //@line 174 "SIDH_v1.0/kex.c"
   }
   _get_3_isog($R,$A,$C); //@line 199 "SIDH_v1.0/kex.c"
   _eval_3_isog($R,$phiP); //@line 200 "SIDH_v1.0/kex.c"
   _eval_3_isog($R,$phiQ); //@line 201 "SIDH_v1.0/kex.c"
   _eval_3_isog($R,$phiD); //@line 202 "SIDH_v1.0/kex.c"
   $117 = ((($phiP)) + 192|0); //@line 204 "SIDH_v1.0/kex.c"
   $118 = ((($phiQ)) + 192|0); //@line 204 "SIDH_v1.0/kex.c"
   $119 = ((($phiD)) + 192|0); //@line 204 "SIDH_v1.0/kex.c"
   _inv_4_way($C,$117,$118,$119); //@line 204 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($A,$C,$A); //@line 205 "SIDH_v1.0/kex.c"
   $120 = ((($phiP)) + 192|0); //@line 206 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($phiP,$120,$phiP); //@line 206 "SIDH_v1.0/kex.c"
   $121 = ((($phiQ)) + 192|0); //@line 207 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($phiQ,$121,$phiQ); //@line 207 "SIDH_v1.0/kex.c"
   $122 = ((($phiD)) + 192|0); //@line 208 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($phiD,$122,$phiD); //@line 208 "SIDH_v1.0/kex.c"
   $123 = $PublicKeyB; //@line 210 "SIDH_v1.0/kex.c"
   _from_fp2mont($A,$123); //@line 210 "SIDH_v1.0/kex.c"
   $124 = $PublicKeyB; //@line 211 "SIDH_v1.0/kex.c"
   $125 = ((($124)) + 192|0); //@line 211 "SIDH_v1.0/kex.c"
   _from_fp2mont($phiP,$125); //@line 211 "SIDH_v1.0/kex.c"
   $126 = $PublicKeyB; //@line 212 "SIDH_v1.0/kex.c"
   $127 = ((($126)) + 384|0); //@line 212 "SIDH_v1.0/kex.c"
   _from_fp2mont($phiQ,$127); //@line 212 "SIDH_v1.0/kex.c"
   $128 = $PublicKeyB; //@line 213 "SIDH_v1.0/kex.c"
   $129 = ((($128)) + 576|0); //@line 213 "SIDH_v1.0/kex.c"
   _from_fp2mont($phiD,$129); //@line 213 "SIDH_v1.0/kex.c"
   $130 = $pwords; //@line 216 "SIDH_v1.0/kex.c"
   $131 = $130<<2; //@line 216 "SIDH_v1.0/kex.c"
   _clear_words($R,$131); //@line 216 "SIDH_v1.0/kex.c"
   $132 = $pwords; //@line 217 "SIDH_v1.0/kex.c"
   $133 = $132<<2; //@line 217 "SIDH_v1.0/kex.c"
   _clear_words($phiP,$133); //@line 217 "SIDH_v1.0/kex.c"
   $134 = $pwords; //@line 218 "SIDH_v1.0/kex.c"
   $135 = $134<<2; //@line 218 "SIDH_v1.0/kex.c"
   _clear_words($phiQ,$135); //@line 218 "SIDH_v1.0/kex.c"
   $136 = $pwords; //@line 219 "SIDH_v1.0/kex.c"
   $137 = $136<<2; //@line 219 "SIDH_v1.0/kex.c"
   _clear_words($phiD,$137); //@line 219 "SIDH_v1.0/kex.c"
   $138 = $pwords; //@line 220 "SIDH_v1.0/kex.c"
   $139 = ($138*40)|0; //@line 220 "SIDH_v1.0/kex.c"
   _clear_words($pts,$139); //@line 220 "SIDH_v1.0/kex.c"
   $140 = $pwords; //@line 221 "SIDH_v1.0/kex.c"
   $141 = $140<<1; //@line 221 "SIDH_v1.0/kex.c"
   _clear_words($A,$141); //@line 221 "SIDH_v1.0/kex.c"
   $142 = $pwords; //@line 222 "SIDH_v1.0/kex.c"
   $143 = $142<<1; //@line 222 "SIDH_v1.0/kex.c"
   _clear_words($C,$143); //@line 222 "SIDH_v1.0/kex.c"
   $144 = $Status; //@line 224 "SIDH_v1.0/kex.c"
   $0 = $144; //@line 224 "SIDH_v1.0/kex.c"
   $145 = $0; //@line 225 "SIDH_v1.0/kex.c"
   STACKTOP = sp;return ($145|0); //@line 225 "SIDH_v1.0/kex.c"
  }
 }
 $0 = 6; //@line 141 "SIDH_v1.0/kex.c"
 $145 = $0; //@line 225 "SIDH_v1.0/kex.c"
 STACKTOP = sp;return ($145|0); //@line 225 "SIDH_v1.0/kex.c"
}
function _SecretAgreement_A($pPrivateKeyA,$pPublicKeyB,$pSharedSecretA,$CurveIsogeny) {
 $pPrivateKeyA = $pPrivateKeyA|0;
 $pPublicKeyB = $pPublicKeyB|0;
 $pSharedSecretA = $pSharedSecretA|0;
 $CurveIsogeny = $CurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0;
 var $97 = 0, $98 = 0, $99 = 0, $A = 0, $C = 0, $PKB2 = 0, $PKB3 = 0, $PKB4 = 0, $PublicKeyB = 0, $R = 0, $Status = 0, $coeff = 0, $i = 0, $index = 0, $jinv = 0, $m = 0, $npts = 0, $or$cond = 0, $or$cond3 = 0, $pts = 0;
 var $pts_index = 0, $pwords = 0, $row = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 5664|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $pts_index = sp + 5592|0;
 $R = sp + 5200|0;
 $pts = sp + 2128|0;
 $jinv = sp + 1928|0;
 $coeff = sp + 968|0;
 $A = sp + 776|0;
 $C = sp + 584|0;
 $PKB2 = sp + 392|0;
 $PKB3 = sp + 200|0;
 $PKB4 = sp + 8|0;
 $1 = $pPrivateKeyA;
 $2 = $pPublicKeyB;
 $3 = $pSharedSecretA;
 $4 = $CurveIsogeny;
 $5 = $4; //@line 235 "SIDH_v1.0/kex.c"
 $6 = ((($5)) + 12|0); //@line 235 "SIDH_v1.0/kex.c"
 $7 = HEAP32[$6>>2]|0; //@line 235 "SIDH_v1.0/kex.c"
 $8 = (($7) + 32)|0; //@line 235 "SIDH_v1.0/kex.c"
 $9 = (($8) - 1)|0; //@line 235 "SIDH_v1.0/kex.c"
 $10 = (($9>>>0) / 32)&-1; //@line 235 "SIDH_v1.0/kex.c"
 $pwords = $10; //@line 235 "SIDH_v1.0/kex.c"
 $index = 0; //@line 236 "SIDH_v1.0/kex.c"
 $npts = 0; //@line 236 "SIDH_v1.0/kex.c"
 $11 = $2; //@line 238 "SIDH_v1.0/kex.c"
 $PublicKeyB = $11; //@line 238 "SIDH_v1.0/kex.c"
 _memset(($C|0),0,192)|0; //@line 239 "SIDH_v1.0/kex.c"
 $Status = 3; //@line 240 "SIDH_v1.0/kex.c"
 $12 = $1; //@line 242 "SIDH_v1.0/kex.c"
 $13 = ($12|0)==(0|0); //@line 242 "SIDH_v1.0/kex.c"
 $14 = $2;
 $15 = ($14|0)==(0|0); //@line 242 "SIDH_v1.0/kex.c"
 $or$cond = $13 | $15; //@line 242 "SIDH_v1.0/kex.c"
 $16 = $3;
 $17 = ($16|0)==(0|0); //@line 242 "SIDH_v1.0/kex.c"
 $or$cond3 = $or$cond | $17; //@line 242 "SIDH_v1.0/kex.c"
 if (!($or$cond3)) {
  $18 = $4; //@line 242 "SIDH_v1.0/kex.c"
  $19 = (_is_CurveIsogenyStruct_null($18)|0); //@line 242 "SIDH_v1.0/kex.c"
  if (!($19)) {
   $20 = $PublicKeyB; //@line 246 "SIDH_v1.0/kex.c"
   _to_fp2mont($20,$A); //@line 246 "SIDH_v1.0/kex.c"
   $21 = $PublicKeyB; //@line 247 "SIDH_v1.0/kex.c"
   $22 = ((($21)) + 192|0); //@line 247 "SIDH_v1.0/kex.c"
   _to_fp2mont($22,$PKB2); //@line 247 "SIDH_v1.0/kex.c"
   $23 = $PublicKeyB; //@line 248 "SIDH_v1.0/kex.c"
   $24 = ((($23)) + 384|0); //@line 248 "SIDH_v1.0/kex.c"
   _to_fp2mont($24,$PKB3); //@line 248 "SIDH_v1.0/kex.c"
   $25 = $PublicKeyB; //@line 249 "SIDH_v1.0/kex.c"
   $26 = ((($25)) + 576|0); //@line 249 "SIDH_v1.0/kex.c"
   _to_fp2mont($26,$PKB4); //@line 249 "SIDH_v1.0/kex.c"
   $27 = $4; //@line 251 "SIDH_v1.0/kex.c"
   $28 = ((($27)) + 32|0); //@line 251 "SIDH_v1.0/kex.c"
   $29 = HEAP32[$28>>2]|0; //@line 251 "SIDH_v1.0/kex.c"
   _fpcopy751($29,$C); //@line 251 "SIDH_v1.0/kex.c"
   _to_mont($C,$C); //@line 252 "SIDH_v1.0/kex.c"
   $30 = $1; //@line 254 "SIDH_v1.0/kex.c"
   $31 = $4; //@line 254 "SIDH_v1.0/kex.c"
   $32 = (_ladder_3_pt($PKB2,$PKB3,$PKB4,$30,0,$R,$A,$31)|0); //@line 254 "SIDH_v1.0/kex.c"
   $Status = $32; //@line 254 "SIDH_v1.0/kex.c"
   $33 = $Status; //@line 255 "SIDH_v1.0/kex.c"
   $34 = ($33|0)!=(0); //@line 255 "SIDH_v1.0/kex.c"
   if ($34) {
    $35 = $Status; //@line 256 "SIDH_v1.0/kex.c"
    $0 = $35; //@line 256 "SIDH_v1.0/kex.c"
    $102 = $0; //@line 296 "SIDH_v1.0/kex.c"
    STACKTOP = sp;return ($102|0); //@line 296 "SIDH_v1.0/kex.c"
   }
   $36 = $4; //@line 258 "SIDH_v1.0/kex.c"
   _first_4_isog($R,$A,$A,$C,$36); //@line 258 "SIDH_v1.0/kex.c"
   $index = 0; //@line 260 "SIDH_v1.0/kex.c"
   $row = 1; //@line 261 "SIDH_v1.0/kex.c"
   while(1) {
    $37 = $row; //@line 261 "SIDH_v1.0/kex.c"
    $38 = ($37>>>0)<(185); //@line 261 "SIDH_v1.0/kex.c"
    if (!($38)) {
     break;
    }
    while(1) {
     $39 = $index; //@line 262 "SIDH_v1.0/kex.c"
     $40 = $row; //@line 262 "SIDH_v1.0/kex.c"
     $41 = (185 - ($40))|0; //@line 262 "SIDH_v1.0/kex.c"
     $42 = ($39>>>0)<($41>>>0); //@line 262 "SIDH_v1.0/kex.c"
     if (!($42)) {
      break;
     }
     $43 = $npts; //@line 263 "SIDH_v1.0/kex.c"
     $44 = (($pts) + (($43*384)|0)|0); //@line 263 "SIDH_v1.0/kex.c"
     _fp2copy751($R,$44); //@line 263 "SIDH_v1.0/kex.c"
     $45 = ((($R)) + 192|0); //@line 264 "SIDH_v1.0/kex.c"
     $46 = $npts; //@line 264 "SIDH_v1.0/kex.c"
     $47 = (($pts) + (($46*384)|0)|0); //@line 264 "SIDH_v1.0/kex.c"
     $48 = ((($47)) + 192|0); //@line 264 "SIDH_v1.0/kex.c"
     _fp2copy751($45,$48); //@line 264 "SIDH_v1.0/kex.c"
     $49 = $index; //@line 265 "SIDH_v1.0/kex.c"
     $50 = $npts; //@line 265 "SIDH_v1.0/kex.c"
     $51 = (($pts_index) + ($50<<2)|0); //@line 265 "SIDH_v1.0/kex.c"
     HEAP32[$51>>2] = $49; //@line 265 "SIDH_v1.0/kex.c"
     $52 = $npts; //@line 266 "SIDH_v1.0/kex.c"
     $53 = (($52) + 1)|0; //@line 266 "SIDH_v1.0/kex.c"
     $npts = $53; //@line 266 "SIDH_v1.0/kex.c"
     $54 = $index; //@line 267 "SIDH_v1.0/kex.c"
     $55 = (185 - ($54))|0; //@line 267 "SIDH_v1.0/kex.c"
     $56 = $row; //@line 267 "SIDH_v1.0/kex.c"
     $57 = (($55) - ($56))|0; //@line 267 "SIDH_v1.0/kex.c"
     $58 = (3032 + ($57<<2)|0); //@line 267 "SIDH_v1.0/kex.c"
     $59 = HEAP32[$58>>2]|0; //@line 267 "SIDH_v1.0/kex.c"
     $m = $59; //@line 267 "SIDH_v1.0/kex.c"
     $60 = $m; //@line 268 "SIDH_v1.0/kex.c"
     $61 = $60<<1; //@line 268 "SIDH_v1.0/kex.c"
     _xDBLe($R,$R,$A,$C,$61); //@line 268 "SIDH_v1.0/kex.c"
     $62 = $m; //@line 269 "SIDH_v1.0/kex.c"
     $63 = $index; //@line 269 "SIDH_v1.0/kex.c"
     $64 = (($63) + ($62))|0; //@line 269 "SIDH_v1.0/kex.c"
     $index = $64; //@line 269 "SIDH_v1.0/kex.c"
    }
    _get_4_isog($R,$A,$C,$coeff); //@line 271 "SIDH_v1.0/kex.c"
    $i = 0; //@line 273 "SIDH_v1.0/kex.c"
    while(1) {
     $65 = $i; //@line 273 "SIDH_v1.0/kex.c"
     $66 = $npts; //@line 273 "SIDH_v1.0/kex.c"
     $67 = ($65>>>0)<($66>>>0); //@line 273 "SIDH_v1.0/kex.c"
     if (!($67)) {
      break;
     }
     $68 = $i; //@line 274 "SIDH_v1.0/kex.c"
     $69 = (($pts) + (($68*384)|0)|0); //@line 274 "SIDH_v1.0/kex.c"
     _eval_4_isog($69,$coeff); //@line 274 "SIDH_v1.0/kex.c"
     $70 = $i; //@line 273 "SIDH_v1.0/kex.c"
     $71 = (($70) + 1)|0; //@line 273 "SIDH_v1.0/kex.c"
     $i = $71; //@line 273 "SIDH_v1.0/kex.c"
    }
    $72 = $npts; //@line 277 "SIDH_v1.0/kex.c"
    $73 = (($72) - 1)|0; //@line 277 "SIDH_v1.0/kex.c"
    $74 = (($pts) + (($73*384)|0)|0); //@line 277 "SIDH_v1.0/kex.c"
    _fp2copy751($74,$R); //@line 277 "SIDH_v1.0/kex.c"
    $75 = $npts; //@line 278 "SIDH_v1.0/kex.c"
    $76 = (($75) - 1)|0; //@line 278 "SIDH_v1.0/kex.c"
    $77 = (($pts) + (($76*384)|0)|0); //@line 278 "SIDH_v1.0/kex.c"
    $78 = ((($77)) + 192|0); //@line 278 "SIDH_v1.0/kex.c"
    $79 = ((($R)) + 192|0); //@line 278 "SIDH_v1.0/kex.c"
    _fp2copy751($78,$79); //@line 278 "SIDH_v1.0/kex.c"
    $80 = $npts; //@line 279 "SIDH_v1.0/kex.c"
    $81 = (($80) - 1)|0; //@line 279 "SIDH_v1.0/kex.c"
    $82 = (($pts_index) + ($81<<2)|0); //@line 279 "SIDH_v1.0/kex.c"
    $83 = HEAP32[$82>>2]|0; //@line 279 "SIDH_v1.0/kex.c"
    $index = $83; //@line 279 "SIDH_v1.0/kex.c"
    $84 = $npts; //@line 280 "SIDH_v1.0/kex.c"
    $85 = (($84) - 1)|0; //@line 280 "SIDH_v1.0/kex.c"
    $npts = $85; //@line 280 "SIDH_v1.0/kex.c"
    $86 = $row; //@line 261 "SIDH_v1.0/kex.c"
    $87 = (($86) + 1)|0; //@line 261 "SIDH_v1.0/kex.c"
    $row = $87; //@line 261 "SIDH_v1.0/kex.c"
   }
   _get_4_isog($R,$A,$C,$coeff); //@line 283 "SIDH_v1.0/kex.c"
   _j_inv($A,$C,$jinv); //@line 284 "SIDH_v1.0/kex.c"
   $88 = $3; //@line 285 "SIDH_v1.0/kex.c"
   _from_fp2mont($jinv,$88); //@line 285 "SIDH_v1.0/kex.c"
   $89 = $pwords; //@line 288 "SIDH_v1.0/kex.c"
   $90 = $89<<2; //@line 288 "SIDH_v1.0/kex.c"
   _clear_words($R,$90); //@line 288 "SIDH_v1.0/kex.c"
   $91 = $pwords; //@line 289 "SIDH_v1.0/kex.c"
   $92 = $91<<5; //@line 289 "SIDH_v1.0/kex.c"
   _clear_words($pts,$92); //@line 289 "SIDH_v1.0/kex.c"
   $93 = $pwords; //@line 290 "SIDH_v1.0/kex.c"
   $94 = $93<<1; //@line 290 "SIDH_v1.0/kex.c"
   _clear_words($A,$94); //@line 290 "SIDH_v1.0/kex.c"
   $95 = $pwords; //@line 291 "SIDH_v1.0/kex.c"
   $96 = $95<<1; //@line 291 "SIDH_v1.0/kex.c"
   _clear_words($C,$96); //@line 291 "SIDH_v1.0/kex.c"
   $97 = $pwords; //@line 292 "SIDH_v1.0/kex.c"
   $98 = $97<<1; //@line 292 "SIDH_v1.0/kex.c"
   _clear_words($jinv,$98); //@line 292 "SIDH_v1.0/kex.c"
   $99 = $pwords; //@line 293 "SIDH_v1.0/kex.c"
   $100 = ($99*10)|0; //@line 293 "SIDH_v1.0/kex.c"
   _clear_words($coeff,$100); //@line 293 "SIDH_v1.0/kex.c"
   $101 = $Status; //@line 295 "SIDH_v1.0/kex.c"
   $0 = $101; //@line 295 "SIDH_v1.0/kex.c"
   $102 = $0; //@line 296 "SIDH_v1.0/kex.c"
   STACKTOP = sp;return ($102|0); //@line 296 "SIDH_v1.0/kex.c"
  }
 }
 $0 = 6; //@line 243 "SIDH_v1.0/kex.c"
 $102 = $0; //@line 296 "SIDH_v1.0/kex.c"
 STACKTOP = sp;return ($102|0); //@line 296 "SIDH_v1.0/kex.c"
}
function _SecretAgreement_B($pPrivateKeyB,$pPublicKeyA,$pSharedSecretB,$CurveIsogeny) {
 $pPrivateKeyB = $pPrivateKeyB|0;
 $pPublicKeyA = $pPublicKeyA|0;
 $pSharedSecretB = $pSharedSecretB|0;
 $CurveIsogeny = $CurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $A = 0;
 var $C = 0, $PKA2 = 0, $PKA3 = 0, $PKA4 = 0, $PublicKeyA = 0, $R = 0, $Status = 0, $i = 0, $index = 0, $jinv = 0, $m = 0, $npts = 0, $or$cond = 0, $or$cond3 = 0, $pts = 0, $pts_index = 0, $pwords = 0, $row = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 5488|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $pts_index = sp + 5400|0;
 $R = sp + 5008|0;
 $pts = sp + 1168|0;
 $jinv = sp + 968|0;
 $A = sp + 776|0;
 $C = sp + 584|0;
 $PKA2 = sp + 392|0;
 $PKA3 = sp + 200|0;
 $PKA4 = sp + 8|0;
 $1 = $pPrivateKeyB;
 $2 = $pPublicKeyA;
 $3 = $pSharedSecretB;
 $4 = $CurveIsogeny;
 $5 = $4; //@line 306 "SIDH_v1.0/kex.c"
 $6 = ((($5)) + 12|0); //@line 306 "SIDH_v1.0/kex.c"
 $7 = HEAP32[$6>>2]|0; //@line 306 "SIDH_v1.0/kex.c"
 $8 = (($7) + 32)|0; //@line 306 "SIDH_v1.0/kex.c"
 $9 = (($8) - 1)|0; //@line 306 "SIDH_v1.0/kex.c"
 $10 = (($9>>>0) / 32)&-1; //@line 306 "SIDH_v1.0/kex.c"
 $pwords = $10; //@line 306 "SIDH_v1.0/kex.c"
 $index = 0; //@line 307 "SIDH_v1.0/kex.c"
 $npts = 0; //@line 307 "SIDH_v1.0/kex.c"
 $11 = $2; //@line 309 "SIDH_v1.0/kex.c"
 $PublicKeyA = $11; //@line 309 "SIDH_v1.0/kex.c"
 _memset(($C|0),0,192)|0; //@line 310 "SIDH_v1.0/kex.c"
 $Status = 3; //@line 311 "SIDH_v1.0/kex.c"
 $12 = $1; //@line 313 "SIDH_v1.0/kex.c"
 $13 = ($12|0)==(0|0); //@line 313 "SIDH_v1.0/kex.c"
 $14 = $2;
 $15 = ($14|0)==(0|0); //@line 313 "SIDH_v1.0/kex.c"
 $or$cond = $13 | $15; //@line 313 "SIDH_v1.0/kex.c"
 $16 = $3;
 $17 = ($16|0)==(0|0); //@line 313 "SIDH_v1.0/kex.c"
 $or$cond3 = $or$cond | $17; //@line 313 "SIDH_v1.0/kex.c"
 if (!($or$cond3)) {
  $18 = $4; //@line 313 "SIDH_v1.0/kex.c"
  $19 = (_is_CurveIsogenyStruct_null($18)|0); //@line 313 "SIDH_v1.0/kex.c"
  if (!($19)) {
   $20 = $PublicKeyA; //@line 317 "SIDH_v1.0/kex.c"
   _to_fp2mont($20,$A); //@line 317 "SIDH_v1.0/kex.c"
   $21 = $PublicKeyA; //@line 318 "SIDH_v1.0/kex.c"
   $22 = ((($21)) + 192|0); //@line 318 "SIDH_v1.0/kex.c"
   _to_fp2mont($22,$PKA2); //@line 318 "SIDH_v1.0/kex.c"
   $23 = $PublicKeyA; //@line 319 "SIDH_v1.0/kex.c"
   $24 = ((($23)) + 384|0); //@line 319 "SIDH_v1.0/kex.c"
   _to_fp2mont($24,$PKA3); //@line 319 "SIDH_v1.0/kex.c"
   $25 = $PublicKeyA; //@line 320 "SIDH_v1.0/kex.c"
   $26 = ((($25)) + 576|0); //@line 320 "SIDH_v1.0/kex.c"
   _to_fp2mont($26,$PKA4); //@line 320 "SIDH_v1.0/kex.c"
   $27 = $4; //@line 322 "SIDH_v1.0/kex.c"
   $28 = ((($27)) + 32|0); //@line 322 "SIDH_v1.0/kex.c"
   $29 = HEAP32[$28>>2]|0; //@line 322 "SIDH_v1.0/kex.c"
   _fpcopy751($29,$C); //@line 322 "SIDH_v1.0/kex.c"
   _to_mont($C,$C); //@line 323 "SIDH_v1.0/kex.c"
   $30 = $1; //@line 325 "SIDH_v1.0/kex.c"
   $31 = $4; //@line 325 "SIDH_v1.0/kex.c"
   $32 = (_ladder_3_pt($PKA2,$PKA3,$PKA4,$30,1,$R,$A,$31)|0); //@line 325 "SIDH_v1.0/kex.c"
   $Status = $32; //@line 325 "SIDH_v1.0/kex.c"
   $33 = $Status; //@line 326 "SIDH_v1.0/kex.c"
   $34 = ($33|0)!=(0); //@line 326 "SIDH_v1.0/kex.c"
   if ($34) {
    $35 = $Status; //@line 327 "SIDH_v1.0/kex.c"
    $0 = $35; //@line 327 "SIDH_v1.0/kex.c"
    $98 = $0; //@line 365 "SIDH_v1.0/kex.c"
    STACKTOP = sp;return ($98|0); //@line 365 "SIDH_v1.0/kex.c"
   }
   $index = 0; //@line 330 "SIDH_v1.0/kex.c"
   $row = 1; //@line 331 "SIDH_v1.0/kex.c"
   while(1) {
    $36 = $row; //@line 331 "SIDH_v1.0/kex.c"
    $37 = ($36>>>0)<(239); //@line 331 "SIDH_v1.0/kex.c"
    if (!($37)) {
     break;
    }
    while(1) {
     $38 = $index; //@line 332 "SIDH_v1.0/kex.c"
     $39 = $row; //@line 332 "SIDH_v1.0/kex.c"
     $40 = (239 - ($39))|0; //@line 332 "SIDH_v1.0/kex.c"
     $41 = ($38>>>0)<($40>>>0); //@line 332 "SIDH_v1.0/kex.c"
     if (!($41)) {
      break;
     }
     $42 = $npts; //@line 333 "SIDH_v1.0/kex.c"
     $43 = (($pts) + (($42*384)|0)|0); //@line 333 "SIDH_v1.0/kex.c"
     _fp2copy751($R,$43); //@line 333 "SIDH_v1.0/kex.c"
     $44 = ((($R)) + 192|0); //@line 334 "SIDH_v1.0/kex.c"
     $45 = $npts; //@line 334 "SIDH_v1.0/kex.c"
     $46 = (($pts) + (($45*384)|0)|0); //@line 334 "SIDH_v1.0/kex.c"
     $47 = ((($46)) + 192|0); //@line 334 "SIDH_v1.0/kex.c"
     _fp2copy751($44,$47); //@line 334 "SIDH_v1.0/kex.c"
     $48 = $index; //@line 335 "SIDH_v1.0/kex.c"
     $49 = $npts; //@line 335 "SIDH_v1.0/kex.c"
     $50 = (($pts_index) + ($49<<2)|0); //@line 335 "SIDH_v1.0/kex.c"
     HEAP32[$50>>2] = $48; //@line 335 "SIDH_v1.0/kex.c"
     $51 = $npts; //@line 336 "SIDH_v1.0/kex.c"
     $52 = (($51) + 1)|0; //@line 336 "SIDH_v1.0/kex.c"
     $npts = $52; //@line 336 "SIDH_v1.0/kex.c"
     $53 = $index; //@line 337 "SIDH_v1.0/kex.c"
     $54 = (239 - ($53))|0; //@line 337 "SIDH_v1.0/kex.c"
     $55 = $row; //@line 337 "SIDH_v1.0/kex.c"
     $56 = (($54) - ($55))|0; //@line 337 "SIDH_v1.0/kex.c"
     $57 = (3772 + ($56<<2)|0); //@line 337 "SIDH_v1.0/kex.c"
     $58 = HEAP32[$57>>2]|0; //@line 337 "SIDH_v1.0/kex.c"
     $m = $58; //@line 337 "SIDH_v1.0/kex.c"
     $59 = $m; //@line 338 "SIDH_v1.0/kex.c"
     _xTPLe($R,$R,$A,$C,$59); //@line 338 "SIDH_v1.0/kex.c"
     $60 = $m; //@line 339 "SIDH_v1.0/kex.c"
     $61 = $index; //@line 339 "SIDH_v1.0/kex.c"
     $62 = (($61) + ($60))|0; //@line 339 "SIDH_v1.0/kex.c"
     $index = $62; //@line 339 "SIDH_v1.0/kex.c"
    }
    _get_3_isog($R,$A,$C); //@line 341 "SIDH_v1.0/kex.c"
    $i = 0; //@line 343 "SIDH_v1.0/kex.c"
    while(1) {
     $63 = $i; //@line 343 "SIDH_v1.0/kex.c"
     $64 = $npts; //@line 343 "SIDH_v1.0/kex.c"
     $65 = ($63>>>0)<($64>>>0); //@line 343 "SIDH_v1.0/kex.c"
     if (!($65)) {
      break;
     }
     $66 = $i; //@line 344 "SIDH_v1.0/kex.c"
     $67 = (($pts) + (($66*384)|0)|0); //@line 344 "SIDH_v1.0/kex.c"
     _eval_3_isog($R,$67); //@line 344 "SIDH_v1.0/kex.c"
     $68 = $i; //@line 343 "SIDH_v1.0/kex.c"
     $69 = (($68) + 1)|0; //@line 343 "SIDH_v1.0/kex.c"
     $i = $69; //@line 343 "SIDH_v1.0/kex.c"
    }
    $70 = $npts; //@line 347 "SIDH_v1.0/kex.c"
    $71 = (($70) - 1)|0; //@line 347 "SIDH_v1.0/kex.c"
    $72 = (($pts) + (($71*384)|0)|0); //@line 347 "SIDH_v1.0/kex.c"
    _fp2copy751($72,$R); //@line 347 "SIDH_v1.0/kex.c"
    $73 = $npts; //@line 348 "SIDH_v1.0/kex.c"
    $74 = (($73) - 1)|0; //@line 348 "SIDH_v1.0/kex.c"
    $75 = (($pts) + (($74*384)|0)|0); //@line 348 "SIDH_v1.0/kex.c"
    $76 = ((($75)) + 192|0); //@line 348 "SIDH_v1.0/kex.c"
    $77 = ((($R)) + 192|0); //@line 348 "SIDH_v1.0/kex.c"
    _fp2copy751($76,$77); //@line 348 "SIDH_v1.0/kex.c"
    $78 = $npts; //@line 349 "SIDH_v1.0/kex.c"
    $79 = (($78) - 1)|0; //@line 349 "SIDH_v1.0/kex.c"
    $80 = (($pts_index) + ($79<<2)|0); //@line 349 "SIDH_v1.0/kex.c"
    $81 = HEAP32[$80>>2]|0; //@line 349 "SIDH_v1.0/kex.c"
    $index = $81; //@line 349 "SIDH_v1.0/kex.c"
    $82 = $npts; //@line 350 "SIDH_v1.0/kex.c"
    $83 = (($82) - 1)|0; //@line 350 "SIDH_v1.0/kex.c"
    $npts = $83; //@line 350 "SIDH_v1.0/kex.c"
    $84 = $row; //@line 331 "SIDH_v1.0/kex.c"
    $85 = (($84) + 1)|0; //@line 331 "SIDH_v1.0/kex.c"
    $row = $85; //@line 331 "SIDH_v1.0/kex.c"
   }
   _get_3_isog($R,$A,$C); //@line 353 "SIDH_v1.0/kex.c"
   _j_inv($A,$C,$jinv); //@line 354 "SIDH_v1.0/kex.c"
   $86 = $3; //@line 355 "SIDH_v1.0/kex.c"
   _from_fp2mont($jinv,$86); //@line 355 "SIDH_v1.0/kex.c"
   $87 = $pwords; //@line 358 "SIDH_v1.0/kex.c"
   $88 = $87<<2; //@line 358 "SIDH_v1.0/kex.c"
   _clear_words($R,$88); //@line 358 "SIDH_v1.0/kex.c"
   $89 = $pwords; //@line 359 "SIDH_v1.0/kex.c"
   $90 = ($89*40)|0; //@line 359 "SIDH_v1.0/kex.c"
   _clear_words($pts,$90); //@line 359 "SIDH_v1.0/kex.c"
   $91 = $pwords; //@line 360 "SIDH_v1.0/kex.c"
   $92 = $91<<1; //@line 360 "SIDH_v1.0/kex.c"
   _clear_words($A,$92); //@line 360 "SIDH_v1.0/kex.c"
   $93 = $pwords; //@line 361 "SIDH_v1.0/kex.c"
   $94 = $93<<1; //@line 361 "SIDH_v1.0/kex.c"
   _clear_words($C,$94); //@line 361 "SIDH_v1.0/kex.c"
   $95 = $pwords; //@line 362 "SIDH_v1.0/kex.c"
   $96 = $95<<1; //@line 362 "SIDH_v1.0/kex.c"
   _clear_words($jinv,$96); //@line 362 "SIDH_v1.0/kex.c"
   $97 = $Status; //@line 364 "SIDH_v1.0/kex.c"
   $0 = $97; //@line 364 "SIDH_v1.0/kex.c"
   $98 = $0; //@line 365 "SIDH_v1.0/kex.c"
   STACKTOP = sp;return ($98|0); //@line 365 "SIDH_v1.0/kex.c"
  }
 }
 $0 = 6; //@line 314 "SIDH_v1.0/kex.c"
 $98 = $0; //@line 365 "SIDH_v1.0/kex.c"
 STACKTOP = sp;return ($98|0); //@line 365 "SIDH_v1.0/kex.c"
}
function _random_fp2($f2value,$pCurveIsogeny) {
 $f2value = $f2value|0;
 $pCurveIsogeny = $pCurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $8 = 0, $9 = 0, $Status = 0;
 var $mask = 0, $nbytes = 0, $ntry = 0, $p751 = 0, $t1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t1 = sp + 104|0;
 $p751 = sp + 8|0;
 $1 = $f2value;
 $2 = $pCurveIsogeny;
 $ntry = 0; //@line 44 "SIDH_v1.0/validate.c"
 $Status = 3; //@line 47 "SIDH_v1.0/validate.c"
 $3 = $1; //@line 49 "SIDH_v1.0/validate.c"
 _clear_words($3,48); //@line 49 "SIDH_v1.0/validate.c"
 $4 = $2; //@line 50 "SIDH_v1.0/validate.c"
 $5 = ((($4)) + 24|0); //@line 50 "SIDH_v1.0/validate.c"
 $6 = HEAP32[$5>>2]|0; //@line 50 "SIDH_v1.0/validate.c"
 _fpcopy751($6,$p751); //@line 50 "SIDH_v1.0/validate.c"
 $7 = $2; //@line 51 "SIDH_v1.0/validate.c"
 $8 = ((($7)) + 20|0); //@line 51 "SIDH_v1.0/validate.c"
 $9 = HEAP32[$8>>2]|0; //@line 51 "SIDH_v1.0/validate.c"
 $10 = (($9) + 7)|0; //@line 51 "SIDH_v1.0/validate.c"
 $11 = (($10>>>0) / 8)&-1; //@line 51 "SIDH_v1.0/validate.c"
 $nbytes = $11; //@line 51 "SIDH_v1.0/validate.c"
 $12 = $nbytes; //@line 52 "SIDH_v1.0/validate.c"
 $13 = $12<<3; //@line 52 "SIDH_v1.0/validate.c"
 $14 = $2; //@line 52 "SIDH_v1.0/validate.c"
 $15 = ((($14)) + 20|0); //@line 52 "SIDH_v1.0/validate.c"
 $16 = HEAP32[$15>>2]|0; //@line 52 "SIDH_v1.0/validate.c"
 $17 = (($13) - ($16))|0; //@line 52 "SIDH_v1.0/validate.c"
 $18 = $17&255; //@line 52 "SIDH_v1.0/validate.c"
 $mask = $18; //@line 52 "SIDH_v1.0/validate.c"
 $19 = $mask; //@line 53 "SIDH_v1.0/validate.c"
 $20 = $19&255; //@line 53 "SIDH_v1.0/validate.c"
 $21 = 255 >> $20; //@line 53 "SIDH_v1.0/validate.c"
 $22 = $21&255; //@line 53 "SIDH_v1.0/validate.c"
 $mask = $22; //@line 53 "SIDH_v1.0/validate.c"
 while(1) {
  $23 = $ntry; //@line 56 "SIDH_v1.0/validate.c"
  $24 = (($23) + 1)|0; //@line 56 "SIDH_v1.0/validate.c"
  $ntry = $24; //@line 56 "SIDH_v1.0/validate.c"
  $25 = $ntry; //@line 57 "SIDH_v1.0/validate.c"
  $26 = ($25>>>0)>(100); //@line 57 "SIDH_v1.0/validate.c"
  if ($26) {
   label = 3;
   break;
  }
  $27 = $2; //@line 60 "SIDH_v1.0/validate.c"
  $28 = ((($27)) + 84|0); //@line 60 "SIDH_v1.0/validate.c"
  $29 = HEAP32[$28>>2]|0; //@line 60 "SIDH_v1.0/validate.c"
  $30 = $nbytes; //@line 60 "SIDH_v1.0/validate.c"
  $31 = $1; //@line 60 "SIDH_v1.0/validate.c"
  $32 = (FUNCTION_TABLE_iii[$29 & 31]($30,$31)|0); //@line 60 "SIDH_v1.0/validate.c"
  $Status = $32; //@line 60 "SIDH_v1.0/validate.c"
  $33 = $Status; //@line 61 "SIDH_v1.0/validate.c"
  $34 = ($33|0)!=(0); //@line 61 "SIDH_v1.0/validate.c"
  if ($34) {
   label = 5;
   break;
  }
  $36 = $mask; //@line 64 "SIDH_v1.0/validate.c"
  $37 = $36&255; //@line 64 "SIDH_v1.0/validate.c"
  $38 = $nbytes; //@line 64 "SIDH_v1.0/validate.c"
  $39 = (($38) - 1)|0; //@line 64 "SIDH_v1.0/validate.c"
  $40 = $1; //@line 64 "SIDH_v1.0/validate.c"
  $41 = (($40) + ($39)|0); //@line 64 "SIDH_v1.0/validate.c"
  $42 = HEAP8[$41>>0]|0; //@line 64 "SIDH_v1.0/validate.c"
  $43 = $42&255; //@line 64 "SIDH_v1.0/validate.c"
  $44 = $43 & $37; //@line 64 "SIDH_v1.0/validate.c"
  $45 = $44&255; //@line 64 "SIDH_v1.0/validate.c"
  HEAP8[$41>>0] = $45; //@line 64 "SIDH_v1.0/validate.c"
  $46 = $1; //@line 65 "SIDH_v1.0/validate.c"
  $47 = (_mp_sub($p751,$46,$t1,24)|0); //@line 65 "SIDH_v1.0/validate.c"
  $48 = ($47|0)==(1); //@line 65 "SIDH_v1.0/validate.c"
  if (!($48)) {
   label = 7;
   break;
  }
 }
 if ((label|0) == 3) {
  $0 = 9; //@line 58 "SIDH_v1.0/validate.c"
  $78 = $0; //@line 84 "SIDH_v1.0/validate.c"
  STACKTOP = sp;return ($78|0); //@line 84 "SIDH_v1.0/validate.c"
 }
 else if ((label|0) == 5) {
  $35 = $Status; //@line 62 "SIDH_v1.0/validate.c"
  $0 = $35; //@line 62 "SIDH_v1.0/validate.c"
  $78 = $0; //@line 84 "SIDH_v1.0/validate.c"
  STACKTOP = sp;return ($78|0); //@line 84 "SIDH_v1.0/validate.c"
 }
 else if ((label|0) == 7) {
  $ntry = 0; //@line 67 "SIDH_v1.0/validate.c"
  while(1) {
   $49 = $ntry; //@line 69 "SIDH_v1.0/validate.c"
   $50 = (($49) + 1)|0; //@line 69 "SIDH_v1.0/validate.c"
   $ntry = $50; //@line 69 "SIDH_v1.0/validate.c"
   $51 = $ntry; //@line 70 "SIDH_v1.0/validate.c"
   $52 = ($51>>>0)>(100); //@line 70 "SIDH_v1.0/validate.c"
   if ($52) {
    label = 9;
    break;
   }
   $53 = $2; //@line 73 "SIDH_v1.0/validate.c"
   $54 = ((($53)) + 84|0); //@line 73 "SIDH_v1.0/validate.c"
   $55 = HEAP32[$54>>2]|0; //@line 73 "SIDH_v1.0/validate.c"
   $56 = $nbytes; //@line 73 "SIDH_v1.0/validate.c"
   $57 = $1; //@line 73 "SIDH_v1.0/validate.c"
   $58 = ((($57)) + 96|0); //@line 73 "SIDH_v1.0/validate.c"
   $59 = (FUNCTION_TABLE_iii[$55 & 31]($56,$58)|0); //@line 73 "SIDH_v1.0/validate.c"
   $Status = $59; //@line 73 "SIDH_v1.0/validate.c"
   $60 = $Status; //@line 74 "SIDH_v1.0/validate.c"
   $61 = ($60|0)!=(0); //@line 74 "SIDH_v1.0/validate.c"
   if ($61) {
    label = 11;
    break;
   }
   $63 = $mask; //@line 77 "SIDH_v1.0/validate.c"
   $64 = $63&255; //@line 77 "SIDH_v1.0/validate.c"
   $65 = $nbytes; //@line 77 "SIDH_v1.0/validate.c"
   $66 = (($65) - 1)|0; //@line 77 "SIDH_v1.0/validate.c"
   $67 = $1; //@line 77 "SIDH_v1.0/validate.c"
   $68 = ((($67)) + 96|0); //@line 77 "SIDH_v1.0/validate.c"
   $69 = (($68) + ($66)|0); //@line 77 "SIDH_v1.0/validate.c"
   $70 = HEAP8[$69>>0]|0; //@line 77 "SIDH_v1.0/validate.c"
   $71 = $70&255; //@line 77 "SIDH_v1.0/validate.c"
   $72 = $71 & $64; //@line 77 "SIDH_v1.0/validate.c"
   $73 = $72&255; //@line 77 "SIDH_v1.0/validate.c"
   HEAP8[$69>>0] = $73; //@line 77 "SIDH_v1.0/validate.c"
   $74 = $1; //@line 78 "SIDH_v1.0/validate.c"
   $75 = ((($74)) + 96|0); //@line 78 "SIDH_v1.0/validate.c"
   $76 = (_mp_sub($p751,$75,$t1,24)|0); //@line 78 "SIDH_v1.0/validate.c"
   $77 = ($76|0)==(1); //@line 78 "SIDH_v1.0/validate.c"
   if (!($77)) {
    label = 13;
    break;
   }
  }
  if ((label|0) == 9) {
   $0 = 9; //@line 71 "SIDH_v1.0/validate.c"
   $78 = $0; //@line 84 "SIDH_v1.0/validate.c"
   STACKTOP = sp;return ($78|0); //@line 84 "SIDH_v1.0/validate.c"
  }
  else if ((label|0) == 11) {
   $62 = $Status; //@line 75 "SIDH_v1.0/validate.c"
   $0 = $62; //@line 75 "SIDH_v1.0/validate.c"
   $78 = $0; //@line 84 "SIDH_v1.0/validate.c"
   STACKTOP = sp;return ($78|0); //@line 84 "SIDH_v1.0/validate.c"
  }
  else if ((label|0) == 13) {
   _clear_words($t1,24); //@line 81 "SIDH_v1.0/validate.c"
   $0 = 0; //@line 83 "SIDH_v1.0/validate.c"
   $78 = $0; //@line 84 "SIDH_v1.0/validate.c"
   STACKTOP = sp;return ($78|0); //@line 84 "SIDH_v1.0/validate.c"
  }
 }
 return (0)|0;
}
function _Validate_PKA($pPublicKeyA,$valid,$CurveIsogeny) {
 $pPublicKeyA = $pPublicKeyA|0;
 $valid = $valid|0;
 $CurveIsogeny = $CurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $16 = 0;
 var $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0;
 var $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0;
 var $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0;
 var $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0;
 var $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $P = 0, $PKA = 0, $Q = 0, $Status = 0, $UP = 0, $UQ = 0, $alpha_denom = 0, $alpha_numer = 0, $alphad = 0;
 var $alphan = 0, $beta_denom = 0, $beta_numer = 0, $betad = 0, $betan = 0, $e = 0, $j = 0, $lambdaP = 0, $lambdaQ = 0, $ldP = 0, $ldQ = 0, $lnP = 0, $lnQ = 0, $one = 0, $rvalue = 0, $sq = 0, $sqP = 0, $sqQ = 0, $t0 = 0, $t1 = 0;
 var $t2 = 0, $t3 = 0, $t4 = 0, $t5 = 0, $t6 = 0, $t7 = 0, $uP = 0, $uPD = 0, $uQ = 0, $uQD = 0, $zero = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 8480|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $PKA = sp + 7696|0;
 $t0 = sp + 7504|0;
 $t1 = sp + 7312|0;
 $t2 = sp + 7120|0;
 $t3 = sp + 6928|0;
 $t4 = sp + 6736|0;
 $t5 = sp + 6544|0;
 $t6 = sp + 6352|0;
 $t7 = sp + 6160|0;
 $lambdaP = sp + 5968|0;
 $lambdaQ = sp + 5776|0;
 $lnQ = sp + 5584|0;
 $lnP = sp + 5392|0;
 $ldQ = sp + 5200|0;
 $ldP = sp + 5008|0;
 $uP = sp + 4816|0;
 $uQ = sp + 4624|0;
 $uPD = sp + 4432|0;
 $uQD = sp + 4240|0;
 $sqP = sp + 4048|0;
 $sqQ = sp + 3856|0;
 $sq = sp + 3664|0;
 $rvalue = sp + 3472|0;
 $alphan = sp + 3280|0;
 $betan = sp + 3088|0;
 $alphad = sp + 2896|0;
 $betad = sp + 2704|0;
 $alpha_numer = sp + 2512|0;
 $alpha_denom = sp + 2320|0;
 $beta_numer = sp + 2128|0;
 $beta_denom = sp + 1936|0;
 $one = sp + 1744|0;
 $zero = sp + 1552|0;
 $P = sp + 1168|0;
 $Q = sp + 784|0;
 $UP = sp + 400|0;
 $UQ = sp + 16|0;
 $1 = $pPublicKeyA;
 $2 = $valid;
 $3 = $CurveIsogeny;
 _memset(($uP|0),0,192)|0; //@line 313 "SIDH_v1.0/validate.c"
 _memset(($uQ|0),0,192)|0; //@line 313 "SIDH_v1.0/validate.c"
 _memset(($uPD|0),0,192)|0; //@line 313 "SIDH_v1.0/validate.c"
 _memset(($uQD|0),0,192)|0; //@line 313 "SIDH_v1.0/validate.c"
 _memset(($alpha_numer|0),0,192)|0; //@line 314 "SIDH_v1.0/validate.c"
 _memset(($alpha_denom|0),0,192)|0; //@line 314 "SIDH_v1.0/validate.c"
 _memset(($beta_numer|0),0,192)|0; //@line 314 "SIDH_v1.0/validate.c"
 _memset(($beta_denom|0),0,192)|0; //@line 314 "SIDH_v1.0/validate.c"
 _memset(($one|0),0,192)|0; //@line 314 "SIDH_v1.0/validate.c"
 _memset(($zero|0),0,192)|0; //@line 314 "SIDH_v1.0/validate.c"
 _memset(($P|0),0,384)|0; //@line 315 "SIDH_v1.0/validate.c"
 _memset(($Q|0),0,384)|0; //@line 315 "SIDH_v1.0/validate.c"
 $4 = $3; //@line 316 "SIDH_v1.0/validate.c"
 $5 = ((($4)) + 48|0); //@line 316 "SIDH_v1.0/validate.c"
 $6 = HEAP32[$5>>2]|0; //@line 316 "SIDH_v1.0/validate.c"
 $e = $6; //@line 316 "SIDH_v1.0/validate.c"
 $Status = 3; //@line 317 "SIDH_v1.0/validate.c"
 $7 = $3; //@line 320 "SIDH_v1.0/validate.c"
 $8 = (_random_fp2($rvalue,$7)|0); //@line 320 "SIDH_v1.0/validate.c"
 $Status = $8; //@line 320 "SIDH_v1.0/validate.c"
 $9 = $Status; //@line 321 "SIDH_v1.0/validate.c"
 $10 = ($9|0)!=(0); //@line 321 "SIDH_v1.0/validate.c"
 if ($10) {
  _clear_words($rvalue,48); //@line 322 "SIDH_v1.0/validate.c"
  $11 = $Status; //@line 323 "SIDH_v1.0/validate.c"
  $0 = $11; //@line 323 "SIDH_v1.0/validate.c"
  $150 = $0; //@line 487 "SIDH_v1.0/validate.c"
  STACKTOP = sp;return ($150|0); //@line 487 "SIDH_v1.0/validate.c"
 }
 $12 = $1; //@line 326 "SIDH_v1.0/validate.c"
 _to_fp2mont($12,$PKA); //@line 326 "SIDH_v1.0/validate.c"
 $13 = $1; //@line 327 "SIDH_v1.0/validate.c"
 $14 = ((($13)) + 192|0); //@line 327 "SIDH_v1.0/validate.c"
 $15 = ((($PKA)) + 192|0); //@line 327 "SIDH_v1.0/validate.c"
 _to_fp2mont($14,$15); //@line 327 "SIDH_v1.0/validate.c"
 $16 = $1; //@line 328 "SIDH_v1.0/validate.c"
 $17 = ((($16)) + 384|0); //@line 328 "SIDH_v1.0/validate.c"
 $18 = ((($PKA)) + 384|0); //@line 328 "SIDH_v1.0/validate.c"
 _to_fp2mont($17,$18); //@line 328 "SIDH_v1.0/validate.c"
 $19 = $1; //@line 329 "SIDH_v1.0/validate.c"
 $20 = ((($19)) + 576|0); //@line 329 "SIDH_v1.0/validate.c"
 $21 = ((($PKA)) + 576|0); //@line 329 "SIDH_v1.0/validate.c"
 _to_fp2mont($20,$21); //@line 329 "SIDH_v1.0/validate.c"
 $22 = ((($PKA)) + 192|0); //@line 331 "SIDH_v1.0/validate.c"
 _fp2copy751($22,$P); //@line 331 "SIDH_v1.0/validate.c"
 $23 = $3; //@line 332 "SIDH_v1.0/validate.c"
 $24 = ((($23)) + 80|0); //@line 332 "SIDH_v1.0/validate.c"
 $25 = HEAP32[$24>>2]|0; //@line 332 "SIDH_v1.0/validate.c"
 $26 = ((($P)) + 192|0); //@line 332 "SIDH_v1.0/validate.c"
 _fpcopy751($25,$26); //@line 332 "SIDH_v1.0/validate.c"
 $27 = ((($PKA)) + 384|0); //@line 333 "SIDH_v1.0/validate.c"
 _fp2copy751($27,$Q); //@line 333 "SIDH_v1.0/validate.c"
 $28 = $3; //@line 334 "SIDH_v1.0/validate.c"
 $29 = ((($28)) + 80|0); //@line 334 "SIDH_v1.0/validate.c"
 $30 = HEAP32[$29>>2]|0; //@line 334 "SIDH_v1.0/validate.c"
 $31 = ((($Q)) + 192|0); //@line 334 "SIDH_v1.0/validate.c"
 _fpcopy751($30,$31); //@line 334 "SIDH_v1.0/validate.c"
 $32 = $3; //@line 336 "SIDH_v1.0/validate.c"
 $33 = ((($32)) + 80|0); //@line 336 "SIDH_v1.0/validate.c"
 $34 = HEAP32[$33>>2]|0; //@line 336 "SIDH_v1.0/validate.c"
 _fpcopy751($34,$one); //@line 336 "SIDH_v1.0/validate.c"
 $35 = $3; //@line 337 "SIDH_v1.0/validate.c"
 $36 = ((($35)) + 80|0); //@line 337 "SIDH_v1.0/validate.c"
 $37 = HEAP32[$36>>2]|0; //@line 337 "SIDH_v1.0/validate.c"
 _fpcopy751($37,$uP); //@line 337 "SIDH_v1.0/validate.c"
 $38 = $3; //@line 338 "SIDH_v1.0/validate.c"
 $39 = ((($38)) + 80|0); //@line 338 "SIDH_v1.0/validate.c"
 $40 = HEAP32[$39>>2]|0; //@line 338 "SIDH_v1.0/validate.c"
 _fpcopy751($40,$uQ); //@line 338 "SIDH_v1.0/validate.c"
 $41 = $3; //@line 339 "SIDH_v1.0/validate.c"
 $42 = ((($41)) + 80|0); //@line 339 "SIDH_v1.0/validate.c"
 $43 = HEAP32[$42>>2]|0; //@line 339 "SIDH_v1.0/validate.c"
 _fpcopy751($43,$uPD); //@line 339 "SIDH_v1.0/validate.c"
 $44 = $3; //@line 340 "SIDH_v1.0/validate.c"
 $45 = ((($44)) + 80|0); //@line 340 "SIDH_v1.0/validate.c"
 $46 = HEAP32[$45>>2]|0; //@line 340 "SIDH_v1.0/validate.c"
 _fpcopy751($46,$uQD); //@line 340 "SIDH_v1.0/validate.c"
 $47 = $3; //@line 341 "SIDH_v1.0/validate.c"
 $48 = ((($47)) + 80|0); //@line 341 "SIDH_v1.0/validate.c"
 $49 = HEAP32[$48>>2]|0; //@line 341 "SIDH_v1.0/validate.c"
 _fpcopy751($49,$beta_numer); //@line 341 "SIDH_v1.0/validate.c"
 $50 = $3; //@line 342 "SIDH_v1.0/validate.c"
 $51 = ((($50)) + 80|0); //@line 342 "SIDH_v1.0/validate.c"
 $52 = HEAP32[$51>>2]|0; //@line 342 "SIDH_v1.0/validate.c"
 _fpcopy751($52,$beta_denom); //@line 342 "SIDH_v1.0/validate.c"
 $53 = ((($PKA)) + 192|0); //@line 344 "SIDH_v1.0/validate.c"
 _fp2add751($PKA,$53,$sqP); //@line 344 "SIDH_v1.0/validate.c"
 $54 = ((($PKA)) + 192|0); //@line 345 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($54,$sqP,$sqP); //@line 345 "SIDH_v1.0/validate.c"
 _fp2add751($one,$sqP,$sqP); //@line 346 "SIDH_v1.0/validate.c"
 $55 = ((($PKA)) + 384|0); //@line 347 "SIDH_v1.0/validate.c"
 _fp2add751($PKA,$55,$sqQ); //@line 347 "SIDH_v1.0/validate.c"
 $56 = ((($PKA)) + 384|0); //@line 348 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($56,$sqQ,$sqQ); //@line 348 "SIDH_v1.0/validate.c"
 _fp2add751($one,$sqQ,$sqQ); //@line 349 "SIDH_v1.0/validate.c"
 $57 = ((($PKA)) + 384|0); //@line 350 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($57,$sqQ,$sqQ); //@line 350 "SIDH_v1.0/validate.c"
 $58 = ((($PKA)) + 192|0); //@line 351 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($58,$sqP,$sqP); //@line 351 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($sqQ,$sqP,$sq); //@line 352 "SIDH_v1.0/validate.c"
 $j = 1; //@line 354 "SIDH_v1.0/validate.c"
 while(1) {
  $59 = $j; //@line 354 "SIDH_v1.0/validate.c"
  $60 = $e; //@line 354 "SIDH_v1.0/validate.c"
  $61 = ($59>>>0)<($60>>>0); //@line 354 "SIDH_v1.0/validate.c"
  _cube_indeterminant($alpha_numer,$beta_numer,$sq); //@line 355 "SIDH_v1.0/validate.c"
  _cube_indeterminant($alpha_denom,$beta_denom,$sq); //@line 356 "SIDH_v1.0/validate.c"
  if (!($61)) {
   break;
  }
  _TPLline($P,$Q,$PKA,$UP,$UQ,$alphan,$betan,$alphad,$betad); //@line 357 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($uP,$alphan,$alphan); //@line 359 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($uQD,$alphan,$alphan); //@line 360 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($uQ,$alphad,$alphad); //@line 361 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($uPD,$alphad,$alphad); //@line 362 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($uQD,$uPD,$t0); //@line 363 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($betan,$t0,$betan); //@line 364 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($betad,$t0,$betad); //@line 365 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($uP,$UP,$uP); //@line 366 "SIDH_v1.0/validate.c"
  $62 = ((($UP)) + 192|0); //@line 367 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($uPD,$62,$uPD); //@line 367 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($uQ,$UQ,$uQ); //@line 368 "SIDH_v1.0/validate.c"
  $63 = ((($UQ)) + 192|0); //@line 369 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($uQD,$63,$uQD); //@line 369 "SIDH_v1.0/validate.c"
  _line_indeterminant_TPL($alpha_numer,$beta_numer,$alphan,$betan,$sq); //@line 371 "SIDH_v1.0/validate.c"
  _line_indeterminant_TPL($alpha_denom,$beta_denom,$alphad,$betad,$sq); //@line 372 "SIDH_v1.0/validate.c"
  $64 = $j; //@line 354 "SIDH_v1.0/validate.c"
  $65 = (($64) + 1)|0; //@line 354 "SIDH_v1.0/validate.c"
  $j = $65; //@line 354 "SIDH_v1.0/validate.c"
 }
 $66 = ((($P)) + 192|0); //@line 378 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($PKA,$66,$t0); //@line 378 "SIDH_v1.0/validate.c"
 _fp2add751($P,$P,$t1); //@line 379 "SIDH_v1.0/validate.c"
 _fp2add751($P,$t1,$t1); //@line 380 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$t1,$t2); //@line 381 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$t2,$t1); //@line 382 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($P,$t1,$lambdaP); //@line 383 "SIDH_v1.0/validate.c"
 $67 = ((($P)) + 192|0); //@line 384 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($67,$t1); //@line 384 "SIDH_v1.0/validate.c"
 _fp2add751($lambdaP,$t1,$lambdaP); //@line 385 "SIDH_v1.0/validate.c"
 $68 = ((($P)) + 192|0); //@line 386 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t1,$68,$t1); //@line 386 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($sqP,$t1,$t0); //@line 387 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t1,$uPD,$t1); //@line 388 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($uP,$t3); //@line 389 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t0,$t3,$t0); //@line 390 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$t0,$t0); //@line 391 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t2,$t0,$t2); //@line 392 "SIDH_v1.0/validate.c"
 _fp2add751($t2,$t2,$t2); //@line 393 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($lambdaP,$uPD,$t3); //@line 394 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t3,$t4); //@line 395 "SIDH_v1.0/validate.c"
 $69 = (_is_equal_fp2($t2,$t4)|0); //@line 397 "SIDH_v1.0/validate.c"
 $70 = $2; //@line 397 "SIDH_v1.0/validate.c"
 $71 = $69&1; //@line 397 "SIDH_v1.0/validate.c"
 HEAP8[$70>>0] = $71; //@line 397 "SIDH_v1.0/validate.c"
 $72 = $2; //@line 398 "SIDH_v1.0/validate.c"
 $73 = HEAP8[$72>>0]|0; //@line 398 "SIDH_v1.0/validate.c"
 $74 = $73&1; //@line 398 "SIDH_v1.0/validate.c"
 $75 = $74&1; //@line 398 "SIDH_v1.0/validate.c"
 $76 = (_is_equal_fp2($t2,$zero)|0); //@line 398 "SIDH_v1.0/validate.c"
 $77 = $76 ^ 1; //@line 398 "SIDH_v1.0/validate.c"
 $78 = $77&1; //@line 398 "SIDH_v1.0/validate.c"
 $79 = $75 & $78; //@line 398 "SIDH_v1.0/validate.c"
 $80 = ($79|0)!=(0); //@line 398 "SIDH_v1.0/validate.c"
 $81 = $2; //@line 398 "SIDH_v1.0/validate.c"
 $82 = $80&1; //@line 398 "SIDH_v1.0/validate.c"
 HEAP8[$81>>0] = $82; //@line 398 "SIDH_v1.0/validate.c"
 $83 = ((($Q)) + 192|0); //@line 400 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($PKA,$83,$t5); //@line 400 "SIDH_v1.0/validate.c"
 _fp2add751($Q,$Q,$t6); //@line 401 "SIDH_v1.0/validate.c"
 _fp2add751($Q,$t6,$t6); //@line 402 "SIDH_v1.0/validate.c"
 _fp2add751($t5,$t6,$t2); //@line 403 "SIDH_v1.0/validate.c"
 _fp2add751($t2,$t5,$t6); //@line 404 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($Q,$t6,$lambdaQ); //@line 405 "SIDH_v1.0/validate.c"
 $84 = ((($Q)) + 192|0); //@line 406 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($84,$t6); //@line 406 "SIDH_v1.0/validate.c"
 _fp2add751($lambdaQ,$t6,$lambdaQ); //@line 407 "SIDH_v1.0/validate.c"
 $85 = ((($Q)) + 192|0); //@line 408 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($85,$t6,$t6); //@line 408 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($sqQ,$t6,$t5); //@line 409 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t6,$uQD,$t6); //@line 410 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($uQ,$t7); //@line 411 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t5,$t7,$t5); //@line 412 "SIDH_v1.0/validate.c"
 _fp2add751($t5,$t5,$t5); //@line 413 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t2,$t5,$t2); //@line 414 "SIDH_v1.0/validate.c"
 _fp2add751($t2,$t2,$t2); //@line 415 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($lambdaQ,$uQD,$t7); //@line 416 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t7,$t4); //@line 417 "SIDH_v1.0/validate.c"
 $86 = $2; //@line 419 "SIDH_v1.0/validate.c"
 $87 = HEAP8[$86>>0]|0; //@line 419 "SIDH_v1.0/validate.c"
 $88 = $87&1; //@line 419 "SIDH_v1.0/validate.c"
 $89 = $88&1; //@line 419 "SIDH_v1.0/validate.c"
 $90 = (_is_equal_fp2($t2,$t4)|0); //@line 419 "SIDH_v1.0/validate.c"
 $91 = $90&1; //@line 419 "SIDH_v1.0/validate.c"
 $92 = $89 & $91; //@line 419 "SIDH_v1.0/validate.c"
 $93 = ($92|0)!=(0); //@line 419 "SIDH_v1.0/validate.c"
 $94 = $2; //@line 419 "SIDH_v1.0/validate.c"
 $95 = $93&1; //@line 419 "SIDH_v1.0/validate.c"
 HEAP8[$94>>0] = $95; //@line 419 "SIDH_v1.0/validate.c"
 $96 = $2; //@line 420 "SIDH_v1.0/validate.c"
 $97 = HEAP8[$96>>0]|0; //@line 420 "SIDH_v1.0/validate.c"
 $98 = $97&1; //@line 420 "SIDH_v1.0/validate.c"
 $99 = $98&1; //@line 420 "SIDH_v1.0/validate.c"
 $100 = (_is_equal_fp2($t2,$zero)|0); //@line 420 "SIDH_v1.0/validate.c"
 $101 = $100 ^ 1; //@line 420 "SIDH_v1.0/validate.c"
 $102 = $101&1; //@line 420 "SIDH_v1.0/validate.c"
 $103 = $99 & $102; //@line 420 "SIDH_v1.0/validate.c"
 $104 = ($103|0)!=(0); //@line 420 "SIDH_v1.0/validate.c"
 $105 = $2; //@line 420 "SIDH_v1.0/validate.c"
 $106 = $104&1; //@line 420 "SIDH_v1.0/validate.c"
 HEAP8[$105>>0] = $106; //@line 420 "SIDH_v1.0/validate.c"
 $107 = ((($PKA)) + 384|0); //@line 422 "SIDH_v1.0/validate.c"
 $108 = ((($P)) + 192|0); //@line 422 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($107,$108,$lnQ); //@line 422 "SIDH_v1.0/validate.c"
 _fp2sub751($P,$lnQ,$lnQ); //@line 423 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t3,$lnQ,$lnQ); //@line 424 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($uPD,$lnQ,$lnQ); //@line 425 "SIDH_v1.0/validate.c"
 _fp2sub751($lnQ,$t0,$lnQ); //@line 426 "SIDH_v1.0/validate.c"
 $109 = ((($PKA)) + 192|0); //@line 427 "SIDH_v1.0/validate.c"
 $110 = ((($Q)) + 192|0); //@line 427 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($109,$110,$ldP); //@line 427 "SIDH_v1.0/validate.c"
 _fp2sub751($Q,$ldP,$ldP); //@line 428 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t7,$ldP,$ldP); //@line 429 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($uQD,$ldP,$ldP); //@line 430 "SIDH_v1.0/validate.c"
 _fp2sub751($ldP,$t5,$ldP); //@line 431 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($uP,$uQ,$lnP); //@line 432 "SIDH_v1.0/validate.c"
 _fp2add751($lnP,$lnP,$lnP); //@line 433 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($sqP,$lnP,$ldQ); //@line 434 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($lnP,$sqQ,$lnP); //@line 435 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($ldP,$uP,$ldP); //@line 436 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t1,$ldP,$ldP); //@line 437 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($lnQ,$uQ,$lnQ); //@line 438 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t6,$lnQ,$lnQ); //@line 439 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t1,$t6,$t1); //@line 440 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($lnP,$t1,$lnP); //@line 441 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($ldQ,$t1,$ldQ); //@line 442 "SIDH_v1.0/validate.c"
 _fp2copy751($alpha_numer,$t0); //@line 443 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($lnP,$t0,$alpha_numer); //@line 444 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($sqP,$alpha_numer,$alpha_numer); //@line 445 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($lnQ,$beta_numer,$t1); //@line 446 "SIDH_v1.0/validate.c"
 _fp2add751($alpha_numer,$t1,$alpha_numer); //@line 447 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t0,$sqQ,$t1); //@line 448 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t1,$lnQ,$t1); //@line 449 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($lnP,$beta_numer,$beta_numer); //@line 450 "SIDH_v1.0/validate.c"
 _fp2add751($t1,$beta_numer,$beta_numer); //@line 451 "SIDH_v1.0/validate.c"
 _fp2copy751($alpha_denom,$t0); //@line 452 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($ldP,$t0,$t1); //@line 453 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($sqP,$t1,$t1); //@line 454 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($beta_denom,$ldQ,$alpha_denom); //@line 455 "SIDH_v1.0/validate.c"
 _fp2add751($t1,$alpha_denom,$alpha_denom); //@line 456 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t0,$sqQ,$t1); //@line 457 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($ldQ,$t1,$t1); //@line 458 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($beta_denom,$ldP,$beta_denom); //@line 459 "SIDH_v1.0/validate.c"
 _fp2add751($t1,$beta_denom,$beta_denom); //@line 460 "SIDH_v1.0/validate.c"
 _fp2add751($alpha_numer,$alpha_denom,$t2); //@line 461 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t2,$t2); //@line 462 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($sqQ,$t2,$t2); //@line 463 "SIDH_v1.0/validate.c"
 _fp2add751($beta_numer,$beta_denom,$t4); //@line 464 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t4,$t4); //@line 465 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($sqP,$t4,$t4); //@line 466 "SIDH_v1.0/validate.c"
 $111 = $2; //@line 468 "SIDH_v1.0/validate.c"
 $112 = HEAP8[$111>>0]|0; //@line 468 "SIDH_v1.0/validate.c"
 $113 = $112&1; //@line 468 "SIDH_v1.0/validate.c"
 $114 = $113&1; //@line 468 "SIDH_v1.0/validate.c"
 $115 = (_is_equal_fp2($t2,$t4)|0); //@line 468 "SIDH_v1.0/validate.c"
 $116 = $115 ^ 1; //@line 468 "SIDH_v1.0/validate.c"
 $117 = $116&1; //@line 468 "SIDH_v1.0/validate.c"
 $118 = $114 & $117; //@line 468 "SIDH_v1.0/validate.c"
 $119 = ($118|0)!=(0); //@line 468 "SIDH_v1.0/validate.c"
 $120 = $2; //@line 468 "SIDH_v1.0/validate.c"
 $121 = $119&1; //@line 468 "SIDH_v1.0/validate.c"
 HEAP8[$120>>0] = $121; //@line 468 "SIDH_v1.0/validate.c"
 $122 = ((($PKA)) + 192|0); //@line 470 "SIDH_v1.0/validate.c"
 $123 = ((($PKA)) + 384|0); //@line 470 "SIDH_v1.0/validate.c"
 _fp2add751($122,$123,$t0); //@line 470 "SIDH_v1.0/validate.c"
 $124 = ((($PKA)) + 576|0); //@line 471 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($124,$t0,$t1); //@line 471 "SIDH_v1.0/validate.c"
 _fp2sub751($t1,$one,$t1); //@line 472 "SIDH_v1.0/validate.c"
 $125 = ((($PKA)) + 192|0); //@line 473 "SIDH_v1.0/validate.c"
 $126 = ((($PKA)) + 384|0); //@line 473 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($125,$126,$t2); //@line 473 "SIDH_v1.0/validate.c"
 _fp2add751($t1,$t2,$t1); //@line 474 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t1,$t1); //@line 475 "SIDH_v1.0/validate.c"
 $127 = ((($PKA)) + 576|0); //@line 476 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$127,$t0); //@line 476 "SIDH_v1.0/validate.c"
 _fp2add751($PKA,$t0,$t0); //@line 477 "SIDH_v1.0/validate.c"
 $128 = ((($PKA)) + 576|0); //@line 478 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t2,$128,$t2); //@line 478 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t0,$t2,$t0); //@line 479 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$t0,$t0); //@line 480 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$t0,$t0); //@line 481 "SIDH_v1.0/validate.c"
 $129 = $2; //@line 483 "SIDH_v1.0/validate.c"
 $130 = HEAP8[$129>>0]|0; //@line 483 "SIDH_v1.0/validate.c"
 $131 = $130&1; //@line 483 "SIDH_v1.0/validate.c"
 $132 = $131&1; //@line 483 "SIDH_v1.0/validate.c"
 $133 = (_is_equal_fp2($t0,$t1)|0); //@line 483 "SIDH_v1.0/validate.c"
 $134 = $133&1; //@line 483 "SIDH_v1.0/validate.c"
 $135 = $132 & $134; //@line 483 "SIDH_v1.0/validate.c"
 $136 = ($135|0)!=(0); //@line 483 "SIDH_v1.0/validate.c"
 $137 = $2; //@line 483 "SIDH_v1.0/validate.c"
 $138 = $136&1; //@line 483 "SIDH_v1.0/validate.c"
 HEAP8[$137>>0] = $138; //@line 483 "SIDH_v1.0/validate.c"
 $139 = $2; //@line 484 "SIDH_v1.0/validate.c"
 $140 = HEAP8[$139>>0]|0; //@line 484 "SIDH_v1.0/validate.c"
 $141 = $140&1; //@line 484 "SIDH_v1.0/validate.c"
 $142 = $141&1; //@line 484 "SIDH_v1.0/validate.c"
 $143 = $3; //@line 484 "SIDH_v1.0/validate.c"
 $144 = (_test_curve($PKA,$rvalue,$143)|0); //@line 484 "SIDH_v1.0/validate.c"
 $145 = $144&1; //@line 484 "SIDH_v1.0/validate.c"
 $146 = $142 & $145; //@line 484 "SIDH_v1.0/validate.c"
 $147 = ($146|0)!=(0); //@line 484 "SIDH_v1.0/validate.c"
 $148 = $2; //@line 484 "SIDH_v1.0/validate.c"
 $149 = $147&1; //@line 484 "SIDH_v1.0/validate.c"
 HEAP8[$148>>0] = $149; //@line 484 "SIDH_v1.0/validate.c"
 $0 = 0; //@line 486 "SIDH_v1.0/validate.c"
 $150 = $0; //@line 487 "SIDH_v1.0/validate.c"
 STACKTOP = sp;return ($150|0); //@line 487 "SIDH_v1.0/validate.c"
}
function _Validate_PKB($pPublicKeyB,$valid,$CurveIsogeny) {
 $pPublicKeyB = $pPublicKeyB|0;
 $valid = $valid|0;
 $CurveIsogeny = $CurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0;
 var $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0;
 var $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0;
 var $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0;
 var $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $P = 0, $PKB = 0, $Q = 0, $Status = 0, $UP = 0, $UQ = 0, $VP = 0, $VQ = 0, $alphaP = 0;
 var $alphaPi = 0, $alphaQ = 0, $alphaQi = 0, $betaP = 0, $betaPi = 0, $betaQ = 0, $betaQi = 0, $cP = 0, $cQ = 0, $e = 0, $fP = 0, $fQ = 0, $i = 0, $one = 0, $rvalue = 0, $t0 = 0, $t1 = 0, $t10 = 0, $t11 = 0, $t2 = 0;
 var $t3 = 0, $t4 = 0, $t5 = 0, $t6 = 0, $t7 = 0, $t8 = 0, $t9 = 0, $zero = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 7520|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $PKB = sp + 6736|0;
 $t0 = sp + 6544|0;
 $t1 = sp + 6352|0;
 $t2 = sp + 6160|0;
 $t3 = sp + 5968|0;
 $t4 = sp + 5776|0;
 $t5 = sp + 5584|0;
 $t6 = sp + 5392|0;
 $t7 = sp + 5200|0;
 $t8 = sp + 5008|0;
 $t9 = sp + 4816|0;
 $t10 = sp + 4624|0;
 $t11 = sp + 4432|0;
 $fP = sp + 4240|0;
 $fQ = sp + 4048|0;
 $UP = sp + 3856|0;
 $UQ = sp + 3664|0;
 $VP = sp + 3472|0;
 $VQ = sp + 3280|0;
 $rvalue = sp + 3088|0;
 $cP = sp + 2896|0;
 $cQ = sp + 2704|0;
 $alphaQi = sp + 2512|0;
 $betaPi = sp + 2320|0;
 $alphaPi = sp + 2128|0;
 $betaQi = sp + 1936|0;
 $alphaP = sp + 1744|0;
 $alphaQ = sp + 1552|0;
 $betaP = sp + 1360|0;
 $betaQ = sp + 1168|0;
 $one = sp + 976|0;
 $zero = sp + 784|0;
 $P = sp + 400|0;
 $Q = sp + 16|0;
 $1 = $pPublicKeyB;
 $2 = $valid;
 $3 = $CurveIsogeny;
 _memset(($fP|0),0,192)|0; //@line 494 "SIDH_v1.0/validate.c"
 _memset(($fQ|0),0,192)|0; //@line 494 "SIDH_v1.0/validate.c"
 _memset(($UP|0),0,192)|0; //@line 494 "SIDH_v1.0/validate.c"
 _memset(($UQ|0),0,192)|0; //@line 494 "SIDH_v1.0/validate.c"
 _memset(($VP|0),0,192)|0; //@line 494 "SIDH_v1.0/validate.c"
 _memset(($VQ|0),0,192)|0; //@line 494 "SIDH_v1.0/validate.c"
 _memset(($alphaP|0),0,192)|0; //@line 495 "SIDH_v1.0/validate.c"
 _memset(($alphaQ|0),0,192)|0; //@line 495 "SIDH_v1.0/validate.c"
 _memset(($betaP|0),0,192)|0; //@line 495 "SIDH_v1.0/validate.c"
 _memset(($betaQ|0),0,192)|0; //@line 495 "SIDH_v1.0/validate.c"
 _memset(($one|0),0,192)|0; //@line 495 "SIDH_v1.0/validate.c"
 _memset(($zero|0),0,192)|0; //@line 495 "SIDH_v1.0/validate.c"
 _memset(($P|0),0,384)|0; //@line 496 "SIDH_v1.0/validate.c"
 _memset(($Q|0),0,384)|0; //@line 496 "SIDH_v1.0/validate.c"
 $4 = $3; //@line 497 "SIDH_v1.0/validate.c"
 $5 = ((($4)) + 36|0); //@line 497 "SIDH_v1.0/validate.c"
 $6 = HEAP32[$5>>2]|0; //@line 497 "SIDH_v1.0/validate.c"
 $e = $6; //@line 497 "SIDH_v1.0/validate.c"
 $Status = 3; //@line 498 "SIDH_v1.0/validate.c"
 $7 = $3; //@line 501 "SIDH_v1.0/validate.c"
 $8 = (_random_fp2($rvalue,$7)|0); //@line 501 "SIDH_v1.0/validate.c"
 $Status = $8; //@line 501 "SIDH_v1.0/validate.c"
 $9 = $Status; //@line 502 "SIDH_v1.0/validate.c"
 $10 = ($9|0)!=(0); //@line 502 "SIDH_v1.0/validate.c"
 if ($10) {
  _clear_words($rvalue,48); //@line 503 "SIDH_v1.0/validate.c"
  $11 = $Status; //@line 504 "SIDH_v1.0/validate.c"
  $0 = $11; //@line 504 "SIDH_v1.0/validate.c"
  $170 = $0; //@line 711 "SIDH_v1.0/validate.c"
  STACKTOP = sp;return ($170|0); //@line 711 "SIDH_v1.0/validate.c"
 }
 $12 = $1; //@line 507 "SIDH_v1.0/validate.c"
 _to_fp2mont($12,$PKB); //@line 507 "SIDH_v1.0/validate.c"
 $13 = $1; //@line 508 "SIDH_v1.0/validate.c"
 $14 = ((($13)) + 192|0); //@line 508 "SIDH_v1.0/validate.c"
 $15 = ((($PKB)) + 192|0); //@line 508 "SIDH_v1.0/validate.c"
 _to_fp2mont($14,$15); //@line 508 "SIDH_v1.0/validate.c"
 $16 = $1; //@line 509 "SIDH_v1.0/validate.c"
 $17 = ((($16)) + 384|0); //@line 509 "SIDH_v1.0/validate.c"
 $18 = ((($PKB)) + 384|0); //@line 509 "SIDH_v1.0/validate.c"
 _to_fp2mont($17,$18); //@line 509 "SIDH_v1.0/validate.c"
 $19 = $1; //@line 510 "SIDH_v1.0/validate.c"
 $20 = ((($19)) + 576|0); //@line 510 "SIDH_v1.0/validate.c"
 $21 = ((($PKB)) + 576|0); //@line 510 "SIDH_v1.0/validate.c"
 _to_fp2mont($20,$21); //@line 510 "SIDH_v1.0/validate.c"
 $22 = ((($PKB)) + 192|0); //@line 512 "SIDH_v1.0/validate.c"
 _fp2copy751($22,$P); //@line 512 "SIDH_v1.0/validate.c"
 $23 = $3; //@line 513 "SIDH_v1.0/validate.c"
 $24 = ((($23)) + 80|0); //@line 513 "SIDH_v1.0/validate.c"
 $25 = HEAP32[$24>>2]|0; //@line 513 "SIDH_v1.0/validate.c"
 $26 = ((($P)) + 192|0); //@line 513 "SIDH_v1.0/validate.c"
 _fpcopy751($25,$26); //@line 513 "SIDH_v1.0/validate.c"
 $27 = ((($PKB)) + 384|0); //@line 514 "SIDH_v1.0/validate.c"
 _fp2copy751($27,$Q); //@line 514 "SIDH_v1.0/validate.c"
 $28 = $3; //@line 515 "SIDH_v1.0/validate.c"
 $29 = ((($28)) + 80|0); //@line 515 "SIDH_v1.0/validate.c"
 $30 = HEAP32[$29>>2]|0; //@line 515 "SIDH_v1.0/validate.c"
 $31 = ((($Q)) + 192|0); //@line 515 "SIDH_v1.0/validate.c"
 _fpcopy751($30,$31); //@line 515 "SIDH_v1.0/validate.c"
 $32 = ((($PKB)) + 192|0); //@line 516 "SIDH_v1.0/validate.c"
 _fp2copy751($32,$t0); //@line 516 "SIDH_v1.0/validate.c"
 $33 = ((($PKB)) + 384|0); //@line 517 "SIDH_v1.0/validate.c"
 _fp2copy751($33,$t1); //@line 517 "SIDH_v1.0/validate.c"
 $34 = $3; //@line 519 "SIDH_v1.0/validate.c"
 $35 = ((($34)) + 80|0); //@line 519 "SIDH_v1.0/validate.c"
 $36 = HEAP32[$35>>2]|0; //@line 519 "SIDH_v1.0/validate.c"
 _fpcopy751($36,$one); //@line 519 "SIDH_v1.0/validate.c"
 $37 = $3; //@line 520 "SIDH_v1.0/validate.c"
 $38 = ((($37)) + 80|0); //@line 520 "SIDH_v1.0/validate.c"
 $39 = HEAP32[$38>>2]|0; //@line 520 "SIDH_v1.0/validate.c"
 _fpcopy751($39,$fP); //@line 520 "SIDH_v1.0/validate.c"
 $40 = $3; //@line 521 "SIDH_v1.0/validate.c"
 $41 = ((($40)) + 80|0); //@line 521 "SIDH_v1.0/validate.c"
 $42 = HEAP32[$41>>2]|0; //@line 521 "SIDH_v1.0/validate.c"
 _fpcopy751($42,$fQ); //@line 521 "SIDH_v1.0/validate.c"
 $43 = $3; //@line 522 "SIDH_v1.0/validate.c"
 $44 = ((($43)) + 80|0); //@line 522 "SIDH_v1.0/validate.c"
 $45 = HEAP32[$44>>2]|0; //@line 522 "SIDH_v1.0/validate.c"
 _fpcopy751($45,$UP); //@line 522 "SIDH_v1.0/validate.c"
 $46 = $3; //@line 523 "SIDH_v1.0/validate.c"
 $47 = ((($46)) + 80|0); //@line 523 "SIDH_v1.0/validate.c"
 $48 = HEAP32[$47>>2]|0; //@line 523 "SIDH_v1.0/validate.c"
 _fpcopy751($48,$UQ); //@line 523 "SIDH_v1.0/validate.c"
 $49 = $3; //@line 524 "SIDH_v1.0/validate.c"
 $50 = ((($49)) + 80|0); //@line 524 "SIDH_v1.0/validate.c"
 $51 = HEAP32[$50>>2]|0; //@line 524 "SIDH_v1.0/validate.c"
 _fpcopy751($51,$VP); //@line 524 "SIDH_v1.0/validate.c"
 $52 = $3; //@line 525 "SIDH_v1.0/validate.c"
 $53 = ((($52)) + 80|0); //@line 525 "SIDH_v1.0/validate.c"
 $54 = HEAP32[$53>>2]|0; //@line 525 "SIDH_v1.0/validate.c"
 _fpcopy751($54,$VQ); //@line 525 "SIDH_v1.0/validate.c"
 $55 = $3; //@line 526 "SIDH_v1.0/validate.c"
 $56 = ((($55)) + 80|0); //@line 526 "SIDH_v1.0/validate.c"
 $57 = HEAP32[$56>>2]|0; //@line 526 "SIDH_v1.0/validate.c"
 _fpcopy751($57,$betaP); //@line 526 "SIDH_v1.0/validate.c"
 $58 = $3; //@line 527 "SIDH_v1.0/validate.c"
 $59 = ((($58)) + 80|0); //@line 527 "SIDH_v1.0/validate.c"
 $60 = HEAP32[$59>>2]|0; //@line 527 "SIDH_v1.0/validate.c"
 _fpcopy751($60,$betaQ); //@line 527 "SIDH_v1.0/validate.c"
 $61 = ((($PKB)) + 384|0); //@line 529 "SIDH_v1.0/validate.c"
 _fp2add751($PKB,$61,$cQ); //@line 529 "SIDH_v1.0/validate.c"
 $62 = ((($PKB)) + 192|0); //@line 530 "SIDH_v1.0/validate.c"
 _fp2add751($PKB,$62,$cP); //@line 530 "SIDH_v1.0/validate.c"
 $63 = ((($PKB)) + 384|0); //@line 531 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($cQ,$63,$cQ); //@line 531 "SIDH_v1.0/validate.c"
 $64 = ((($PKB)) + 192|0); //@line 532 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($cP,$64,$cP); //@line 532 "SIDH_v1.0/validate.c"
 _fp2add751($cQ,$one,$cQ); //@line 533 "SIDH_v1.0/validate.c"
 _fp2add751($cP,$one,$cP); //@line 534 "SIDH_v1.0/validate.c"
 $65 = ((($PKB)) + 384|0); //@line 535 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($cQ,$65,$cQ); //@line 535 "SIDH_v1.0/validate.c"
 $66 = ((($PKB)) + 192|0); //@line 536 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($cP,$66,$cP); //@line 536 "SIDH_v1.0/validate.c"
 $i = 1; //@line 538 "SIDH_v1.0/validate.c"
 while(1) {
  $67 = $i; //@line 538 "SIDH_v1.0/validate.c"
  $68 = $e; //@line 538 "SIDH_v1.0/validate.c"
  $69 = ($67>>>0)<($68>>>0); //@line 538 "SIDH_v1.0/validate.c"
  if (!($69)) {
   break;
  }
  _fp2sqr751_mont($P,$t2); //@line 539 "SIDH_v1.0/validate.c"
  $70 = ((($P)) + 192|0); //@line 540 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($70,$t11); //@line 540 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($Q,$t4); //@line 541 "SIDH_v1.0/validate.c"
  $71 = ((($Q)) + 192|0); //@line 542 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($71,$t10); //@line 542 "SIDH_v1.0/validate.c"
  _fp2sub751($t2,$t11,$t6); //@line 543 "SIDH_v1.0/validate.c"
  _fp2add751($t2,$t2,$betaPi); //@line 544 "SIDH_v1.0/validate.c"
  _fp2add751($t2,$t11,$t2); //@line 545 "SIDH_v1.0/validate.c"
  _fp2sub751($t4,$t10,$t7); //@line 546 "SIDH_v1.0/validate.c"
  _fp2add751($t4,$t4,$alphaQi); //@line 547 "SIDH_v1.0/validate.c"
  _fp2add751($t4,$t10,$t4); //@line 548 "SIDH_v1.0/validate.c"
  $72 = ((($P)) + 192|0); //@line 549 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($P,$72,$t3); //@line 549 "SIDH_v1.0/validate.c"
  $73 = ((($Q)) + 192|0); //@line 550 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($Q,$73,$t5); //@line 550 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($PKB,$t3,$t8); //@line 551 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($PKB,$t5,$t9); //@line 552 "SIDH_v1.0/validate.c"
  _fp2add751($t3,$t3,$t3); //@line 553 "SIDH_v1.0/validate.c"
  _fp2add751($t5,$t5,$t5); //@line 554 "SIDH_v1.0/validate.c"
  _fp2add751($betaPi,$t8,$betaPi); //@line 555 "SIDH_v1.0/validate.c"
  _fp2add751($t2,$t8,$t8); //@line 556 "SIDH_v1.0/validate.c"
  _fp2add751($alphaQi,$t9,$alphaQi); //@line 557 "SIDH_v1.0/validate.c"
  _fp2add751($t4,$t9,$t9); //@line 558 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($PKB,$t2,$t2); //@line 559 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($PKB,$t4,$t4); //@line 560 "SIDH_v1.0/validate.c"
  _fp2add751($betaPi,$t8,$betaPi); //@line 561 "SIDH_v1.0/validate.c"
  _fp2add751($alphaQi,$t9,$alphaQi); //@line 562 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($betaPi,$t1,$betaPi); //@line 563 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($alphaQi,$t0,$alphaQi); //@line 564 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($P,$t6,$t1); //@line 565 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($Q,$t7,$t0); //@line 566 "SIDH_v1.0/validate.c"
  _fp2sub751($t1,$betaPi,$t1); //@line 567 "SIDH_v1.0/validate.c"
  _fp2sub751($t0,$alphaQi,$t0); //@line 568 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($VP,$t1,$betaPi); //@line 569 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($VQ,$t0,$alphaQi); //@line 570 "SIDH_v1.0/validate.c"
  $74 = ((($Q)) + 192|0); //@line 571 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($74,$t10,$t10); //@line 571 "SIDH_v1.0/validate.c"
  $75 = ((($P)) + 192|0); //@line 572 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($75,$t11,$t11); //@line 572 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t10,$UQ,$t10); //@line 573 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t11,$UP,$t11); //@line 574 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($betaPi,$t10,$betaPi); //@line 575 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($alphaQi,$t11,$alphaQi); //@line 576 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t10,$t11,$t10); //@line 577 "SIDH_v1.0/validate.c"
  _fp2add751($t10,$t10,$t10); //@line 578 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($cQ,$t10,$alphaPi); //@line 579 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($cP,$t10,$betaQi); //@line 580 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($UQ,$t7,$UQ); //@line 581 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($UP,$t6,$UP); //@line 582 "SIDH_v1.0/validate.c"
  _fp2add751($t8,$t8,$t8); //@line 583 "SIDH_v1.0/validate.c"
  _fp2add751($t9,$t9,$t9); //@line 584 "SIDH_v1.0/validate.c"
  $76 = ((($P)) + 192|0); //@line 585 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t3,$t8,$76); //@line 585 "SIDH_v1.0/validate.c"
  $77 = ((($Q)) + 192|0); //@line 586 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t5,$t9,$77); //@line 586 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t8,$P,$t8); //@line 587 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t9,$Q,$t9); //@line 588 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($t6,$P); //@line 589 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($t7,$Q); //@line 590 "SIDH_v1.0/validate.c"
  _fp2add751($t4,$t5,$t4); //@line 591 "SIDH_v1.0/validate.c"
  _fp2add751($t5,$t4,$t4); //@line 592 "SIDH_v1.0/validate.c"
  _fp2add751($t2,$t3,$t2); //@line 593 "SIDH_v1.0/validate.c"
  _fp2add751($t3,$t2,$t2); //@line 594 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t4,$t5,$t4); //@line 595 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t2,$t3,$t2); //@line 596 "SIDH_v1.0/validate.c"
  _fp2add751($t4,$Q,$t4); //@line 597 "SIDH_v1.0/validate.c"
  _fp2add751($t2,$P,$t2); //@line 598 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($UQ,$t4,$UQ); //@line 599 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($UP,$t2,$UP); //@line 600 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($t9,$t9); //@line 601 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($t8,$t8); //@line 602 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($VQ,$t9,$VQ); //@line 603 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($VP,$t8,$VP); //@line 604 "SIDH_v1.0/validate.c"
  _fp2add751($VQ,$VQ,$VQ); //@line 605 "SIDH_v1.0/validate.c"
  _fp2add751($VP,$VP,$VP); //@line 606 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($alphaP,$t4); //@line 607 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($betaP,$t5); //@line 608 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($alphaP,$betaP,$t6); //@line 609 "SIDH_v1.0/validate.c"
  _fp2add751($t6,$t6,$t6); //@line 610 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t4,$cP,$t4); //@line 611 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t5,$cQ,$t5); //@line 612 "SIDH_v1.0/validate.c"
  _fp2add751($t4,$t5,$t4); //@line 613 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($alphaPi,$t4,$alphaP); //@line 614 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($betaPi,$t4,$betaP); //@line 615 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($betaPi,$t6,$t4); //@line 616 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t4,$cQ,$t4); //@line 617 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t6,$alphaPi,$t6); //@line 618 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($cP,$t6,$t6); //@line 619 "SIDH_v1.0/validate.c"
  _fp2add751($alphaP,$t4,$alphaP); //@line 620 "SIDH_v1.0/validate.c"
  _fp2add751($betaP,$t6,$betaP); //@line 621 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($alphaQ,$t4); //@line 622 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($betaQ,$t5); //@line 623 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($alphaQ,$betaQ,$t6); //@line 624 "SIDH_v1.0/validate.c"
  _fp2add751($t6,$t6,$t6); //@line 625 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t4,$cP,$t4); //@line 626 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t5,$cQ,$t5); //@line 627 "SIDH_v1.0/validate.c"
  _fp2add751($t4,$t5,$t4); //@line 628 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($alphaQi,$t4,$alphaQ); //@line 629 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($betaQi,$t4,$betaQ); //@line 630 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($betaPi,$t6,$t4); //@line 631 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($cQ,$t4,$t4); //@line 632 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t6,$betaQi,$t5); //@line 633 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t5,$cQ,$t5); //@line 634 "SIDH_v1.0/validate.c"
  _fp2add751($alphaQ,$t5,$alphaQ); //@line 635 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t6,$alphaQi,$t5); //@line 636 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($cP,$t5,$t5); //@line 637 "SIDH_v1.0/validate.c"
  _fp2add751($betaQ,$t5,$betaQ); //@line 638 "SIDH_v1.0/validate.c"
  $78 = ((($PKB)) + 192|0); //@line 639 "SIDH_v1.0/validate.c"
  $79 = ((($Q)) + 192|0); //@line 639 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($78,$79,$t0); //@line 639 "SIDH_v1.0/validate.c"
  $80 = ((($PKB)) + 384|0); //@line 640 "SIDH_v1.0/validate.c"
  $81 = ((($P)) + 192|0); //@line 640 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($80,$81,$t1); //@line 640 "SIDH_v1.0/validate.c"
  _fp2sub751($Q,$t0,$t2); //@line 641 "SIDH_v1.0/validate.c"
  _fp2sub751($P,$t1,$t3); //@line 642 "SIDH_v1.0/validate.c"
  $82 = ((($P)) + 192|0); //@line 643 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t2,$82,$t2); //@line 643 "SIDH_v1.0/validate.c"
  $83 = ((($Q)) + 192|0); //@line 644 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($t3,$83,$t3); //@line 644 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($alphaP,$t2,$alphaP); //@line 645 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($betaP,$t2,$betaP); //@line 646 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($alphaQ,$t3,$alphaQ); //@line 647 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($betaQ,$t3,$betaQ); //@line 648 "SIDH_v1.0/validate.c"
  $84 = $i; //@line 538 "SIDH_v1.0/validate.c"
  $85 = (($84) + 1)|0; //@line 538 "SIDH_v1.0/validate.c"
  $i = $85; //@line 538 "SIDH_v1.0/validate.c"
 }
 $86 = ((($PKB)) + 384|0); //@line 651 "SIDH_v1.0/validate.c"
 $87 = ((($P)) + 192|0); //@line 651 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($86,$87,$t2); //@line 651 "SIDH_v1.0/validate.c"
 $88 = ((($PKB)) + 192|0); //@line 652 "SIDH_v1.0/validate.c"
 $89 = ((($Q)) + 192|0); //@line 652 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($88,$89,$t3); //@line 652 "SIDH_v1.0/validate.c"
 _fp2sub751($P,$t2,$t2); //@line 653 "SIDH_v1.0/validate.c"
 _fp2sub751($Q,$t3,$t3); //@line 654 "SIDH_v1.0/validate.c"
 $90 = ((($Q)) + 192|0); //@line 655 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t2,$90,$t2); //@line 655 "SIDH_v1.0/validate.c"
 $91 = ((($P)) + 192|0); //@line 656 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t3,$91,$t3); //@line 656 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($alphaP,$t4); //@line 657 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($betaP,$t5); //@line 658 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($alphaP,$betaP,$t6); //@line 659 "SIDH_v1.0/validate.c"
 _fp2add751($t6,$t6,$t6); //@line 660 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($alphaQ,$t7); //@line 661 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($betaQ,$t8); //@line 662 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($alphaQ,$betaQ,$t9); //@line 663 "SIDH_v1.0/validate.c"
 _fp2add751($t9,$t9,$t9); //@line 664 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t4,$cP,$t4); //@line 665 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t5,$cQ,$t5); //@line 666 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t7,$cP,$t7); //@line 667 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t8,$cQ,$t8); //@line 668 "SIDH_v1.0/validate.c"
 _fp2add751($t4,$t5,$t4); //@line 669 "SIDH_v1.0/validate.c"
 _fp2add751($t7,$t8,$t7); //@line 670 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t2,$t4,$t4); //@line 671 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t3,$t7,$t7); //@line 672 "SIDH_v1.0/validate.c"
 _fp2sub751($t4,$t7,$t7); //@line 673 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t7,$t7); //@line 674 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t3,$t9,$t3); //@line 675 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t2,$t6,$t2); //@line 676 "SIDH_v1.0/validate.c"
 _fp2sub751($t3,$t2,$t3); //@line 677 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t3,$t3); //@line 678 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($cP,$t3,$t3); //@line 679 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($cQ,$t3,$t3); //@line 680 "SIDH_v1.0/validate.c"
 _fp2add751($one,$one,$t10); //@line 681 "SIDH_v1.0/validate.c"
 _fp2add751($t10,$t10,$t11); //@line 682 "SIDH_v1.0/validate.c"
 _fp2add751($t10,$PKB,$t10); //@line 683 "SIDH_v1.0/validate.c"
 $92 = ((($Q)) + 192|0); //@line 685 "SIDH_v1.0/validate.c"
 $93 = (_is_equal_fp2($92,$zero)|0); //@line 685 "SIDH_v1.0/validate.c"
 $94 = $93 ^ 1; //@line 685 "SIDH_v1.0/validate.c"
 $95 = $2; //@line 685 "SIDH_v1.0/validate.c"
 $96 = $94&1; //@line 685 "SIDH_v1.0/validate.c"
 HEAP8[$95>>0] = $96; //@line 685 "SIDH_v1.0/validate.c"
 _xDBL($Q,$Q,$t10,$t11); //@line 686 "SIDH_v1.0/validate.c"
 $97 = $2; //@line 687 "SIDH_v1.0/validate.c"
 $98 = HEAP8[$97>>0]|0; //@line 687 "SIDH_v1.0/validate.c"
 $99 = $98&1; //@line 687 "SIDH_v1.0/validate.c"
 $100 = $99&1; //@line 687 "SIDH_v1.0/validate.c"
 $101 = ((($Q)) + 192|0); //@line 687 "SIDH_v1.0/validate.c"
 $102 = (_is_equal_fp2($101,$zero)|0); //@line 687 "SIDH_v1.0/validate.c"
 $103 = $102&1; //@line 687 "SIDH_v1.0/validate.c"
 $104 = $100 & $103; //@line 687 "SIDH_v1.0/validate.c"
 $105 = ($104|0)!=(0); //@line 687 "SIDH_v1.0/validate.c"
 $106 = $2; //@line 687 "SIDH_v1.0/validate.c"
 $107 = $105&1; //@line 687 "SIDH_v1.0/validate.c"
 HEAP8[$106>>0] = $107; //@line 687 "SIDH_v1.0/validate.c"
 $108 = $2; //@line 689 "SIDH_v1.0/validate.c"
 $109 = HEAP8[$108>>0]|0; //@line 689 "SIDH_v1.0/validate.c"
 $110 = $109&1; //@line 689 "SIDH_v1.0/validate.c"
 $111 = $110&1; //@line 689 "SIDH_v1.0/validate.c"
 $112 = ((($P)) + 192|0); //@line 689 "SIDH_v1.0/validate.c"
 $113 = (_is_equal_fp2($112,$zero)|0); //@line 689 "SIDH_v1.0/validate.c"
 $114 = $113 ^ 1; //@line 689 "SIDH_v1.0/validate.c"
 $115 = $114&1; //@line 689 "SIDH_v1.0/validate.c"
 $116 = $111 & $115; //@line 689 "SIDH_v1.0/validate.c"
 $117 = ($116|0)!=(0); //@line 689 "SIDH_v1.0/validate.c"
 $118 = $2; //@line 689 "SIDH_v1.0/validate.c"
 $119 = $117&1; //@line 689 "SIDH_v1.0/validate.c"
 HEAP8[$118>>0] = $119; //@line 689 "SIDH_v1.0/validate.c"
 _xDBL($P,$P,$t10,$t11); //@line 690 "SIDH_v1.0/validate.c"
 $120 = $2; //@line 691 "SIDH_v1.0/validate.c"
 $121 = HEAP8[$120>>0]|0; //@line 691 "SIDH_v1.0/validate.c"
 $122 = $121&1; //@line 691 "SIDH_v1.0/validate.c"
 $123 = $122&1; //@line 691 "SIDH_v1.0/validate.c"
 $124 = ((($P)) + 192|0); //@line 691 "SIDH_v1.0/validate.c"
 $125 = (_is_equal_fp2($124,$zero)|0); //@line 691 "SIDH_v1.0/validate.c"
 $126 = $125&1; //@line 691 "SIDH_v1.0/validate.c"
 $127 = $123 & $126; //@line 691 "SIDH_v1.0/validate.c"
 $128 = ($127|0)!=(0); //@line 691 "SIDH_v1.0/validate.c"
 $129 = $2; //@line 691 "SIDH_v1.0/validate.c"
 $130 = $128&1; //@line 691 "SIDH_v1.0/validate.c"
 HEAP8[$129>>0] = $130; //@line 691 "SIDH_v1.0/validate.c"
 $131 = $2; //@line 692 "SIDH_v1.0/validate.c"
 $132 = HEAP8[$131>>0]|0; //@line 692 "SIDH_v1.0/validate.c"
 $133 = $132&1; //@line 692 "SIDH_v1.0/validate.c"
 $134 = $133&1; //@line 692 "SIDH_v1.0/validate.c"
 $135 = (_is_equal_fp2($t3,$t7)|0); //@line 692 "SIDH_v1.0/validate.c"
 $136 = $135 ^ 1; //@line 692 "SIDH_v1.0/validate.c"
 $137 = $136&1; //@line 692 "SIDH_v1.0/validate.c"
 $138 = $134 & $137; //@line 692 "SIDH_v1.0/validate.c"
 $139 = ($138|0)!=(0); //@line 692 "SIDH_v1.0/validate.c"
 $140 = $2; //@line 692 "SIDH_v1.0/validate.c"
 $141 = $139&1; //@line 692 "SIDH_v1.0/validate.c"
 HEAP8[$140>>0] = $141; //@line 692 "SIDH_v1.0/validate.c"
 $142 = ((($PKB)) + 192|0); //@line 694 "SIDH_v1.0/validate.c"
 $143 = ((($PKB)) + 384|0); //@line 694 "SIDH_v1.0/validate.c"
 _fp2add751($142,$143,$t0); //@line 694 "SIDH_v1.0/validate.c"
 $144 = ((($PKB)) + 576|0); //@line 695 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($144,$t0,$t1); //@line 695 "SIDH_v1.0/validate.c"
 _fp2sub751($t1,$one,$t1); //@line 696 "SIDH_v1.0/validate.c"
 $145 = ((($PKB)) + 192|0); //@line 697 "SIDH_v1.0/validate.c"
 $146 = ((($PKB)) + 384|0); //@line 697 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($145,$146,$t2); //@line 697 "SIDH_v1.0/validate.c"
 _fp2add751($t1,$t2,$t1); //@line 698 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t1,$t1); //@line 699 "SIDH_v1.0/validate.c"
 $147 = ((($PKB)) + 576|0); //@line 700 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$147,$t0); //@line 700 "SIDH_v1.0/validate.c"
 _fp2add751($PKB,$t0,$t0); //@line 701 "SIDH_v1.0/validate.c"
 $148 = ((($PKB)) + 576|0); //@line 702 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($148,$t2,$t2); //@line 702 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t0,$t2,$t0); //@line 703 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$t0,$t0); //@line 704 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$t0,$t0); //@line 705 "SIDH_v1.0/validate.c"
 $149 = $2; //@line 707 "SIDH_v1.0/validate.c"
 $150 = HEAP8[$149>>0]|0; //@line 707 "SIDH_v1.0/validate.c"
 $151 = $150&1; //@line 707 "SIDH_v1.0/validate.c"
 $152 = $151&1; //@line 707 "SIDH_v1.0/validate.c"
 $153 = (_is_equal_fp2($t0,$t1)|0); //@line 707 "SIDH_v1.0/validate.c"
 $154 = $153&1; //@line 707 "SIDH_v1.0/validate.c"
 $155 = $152 & $154; //@line 707 "SIDH_v1.0/validate.c"
 $156 = ($155|0)!=(0); //@line 707 "SIDH_v1.0/validate.c"
 $157 = $2; //@line 707 "SIDH_v1.0/validate.c"
 $158 = $156&1; //@line 707 "SIDH_v1.0/validate.c"
 HEAP8[$157>>0] = $158; //@line 707 "SIDH_v1.0/validate.c"
 $159 = $2; //@line 708 "SIDH_v1.0/validate.c"
 $160 = HEAP8[$159>>0]|0; //@line 708 "SIDH_v1.0/validate.c"
 $161 = $160&1; //@line 708 "SIDH_v1.0/validate.c"
 $162 = $161&1; //@line 708 "SIDH_v1.0/validate.c"
 $163 = $3; //@line 708 "SIDH_v1.0/validate.c"
 $164 = (_test_curve($PKB,$rvalue,$163)|0); //@line 708 "SIDH_v1.0/validate.c"
 $165 = $164&1; //@line 708 "SIDH_v1.0/validate.c"
 $166 = $162 & $165; //@line 708 "SIDH_v1.0/validate.c"
 $167 = ($166|0)!=(0); //@line 708 "SIDH_v1.0/validate.c"
 $168 = $2; //@line 708 "SIDH_v1.0/validate.c"
 $169 = $167&1; //@line 708 "SIDH_v1.0/validate.c"
 HEAP8[$168>>0] = $169; //@line 708 "SIDH_v1.0/validate.c"
 $0 = 0; //@line 710 "SIDH_v1.0/validate.c"
 $170 = $0; //@line 711 "SIDH_v1.0/validate.c"
 STACKTOP = sp;return ($170|0); //@line 711 "SIDH_v1.0/validate.c"
}
function _cube_indeterminant($a,$b,$sq) {
 $a = $a|0;
 $b = $b|0;
 $sq = $sq|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $t0 = 0, $t1 = 0, $t2 = 0, $t3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 784|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 576|0;
 $t1 = sp + 384|0;
 $t2 = sp + 192|0;
 $t3 = sp;
 $0 = $a;
 $1 = $b;
 $2 = $sq;
 $3 = $0; //@line 129 "SIDH_v1.0/validate.c"
 _fp2copy751($3,$t0); //@line 129 "SIDH_v1.0/validate.c"
 $4 = $1; //@line 130 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($4,$t1); //@line 130 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t0,$t2); //@line 131 "SIDH_v1.0/validate.c"
 $5 = $2; //@line 132 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($5,$t2,$t2); //@line 132 "SIDH_v1.0/validate.c"
 _fp2add751($t1,$t2,$t3); //@line 133 "SIDH_v1.0/validate.c"
 $6 = $0; //@line 134 "SIDH_v1.0/validate.c"
 _fp2add751($t1,$t3,$6); //@line 134 "SIDH_v1.0/validate.c"
 $7 = $0; //@line 135 "SIDH_v1.0/validate.c"
 $8 = $0; //@line 135 "SIDH_v1.0/validate.c"
 _fp2add751($t1,$7,$8); //@line 135 "SIDH_v1.0/validate.c"
 $9 = $0; //@line 136 "SIDH_v1.0/validate.c"
 $10 = $0; //@line 136 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t0,$9,$10); //@line 136 "SIDH_v1.0/validate.c"
 _fp2add751($t2,$t3,$t1); //@line 137 "SIDH_v1.0/validate.c"
 _fp2add751($t2,$t1,$t1); //@line 138 "SIDH_v1.0/validate.c"
 $11 = $1; //@line 139 "SIDH_v1.0/validate.c"
 $12 = $1; //@line 139 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($11,$t1,$12); //@line 139 "SIDH_v1.0/validate.c"
 STACKTOP = sp;return; //@line 140 "SIDH_v1.0/validate.c"
}
function _TPLline($P,$Q,$PK,$UP,$UQ,$alpha_numer,$beta_numer,$alpha_denom,$beta_denom) {
 $P = $P|0;
 $Q = $Q|0;
 $PK = $PK|0;
 $UP = $UP|0;
 $UQ = $UQ|0;
 $alpha_numer = $alpha_numer|0;
 $beta_numer = $beta_numer|0;
 $alpha_denom = $alpha_denom|0;
 $beta_denom = $beta_denom|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $19 = 0, $2 = 0;
 var $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0;
 var $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0;
 var $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0;
 var $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0;
 var $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $X = 0, $Z = 0, $l0P = 0, $l0Q = 0, $l1P = 0, $l1Q = 0, $l2P = 0, $l2Q = 0, $t0 = 0, $t1 = 0, $t2 = 0, $t3 = 0, $t4 = 0;
 var $t5 = 0, $t6 = 0, $x = 0, $z = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 3312|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $x = sp + 3072|0;
 $z = sp + 2880|0;
 $X = sp + 2688|0;
 $Z = sp + 2496|0;
 $t0 = sp + 2304|0;
 $t1 = sp + 2112|0;
 $t2 = sp + 1920|0;
 $t3 = sp + 1728|0;
 $t4 = sp + 1536|0;
 $t5 = sp + 1344|0;
 $t6 = sp + 1152|0;
 $l0P = sp + 960|0;
 $l1P = sp + 768|0;
 $l2P = sp + 576|0;
 $l0Q = sp + 384|0;
 $l1Q = sp + 192|0;
 $l2Q = sp;
 $0 = $P;
 $1 = $Q;
 $2 = $PK;
 $3 = $UP;
 $4 = $UQ;
 $5 = $alpha_numer;
 $6 = $beta_numer;
 $7 = $alpha_denom;
 $8 = $beta_denom;
 $9 = $0; //@line 162 "SIDH_v1.0/validate.c"
 _fp2copy751($9,$x); //@line 162 "SIDH_v1.0/validate.c"
 $10 = $0; //@line 163 "SIDH_v1.0/validate.c"
 $11 = ((($10)) + 192|0); //@line 163 "SIDH_v1.0/validate.c"
 _fp2copy751($11,$z); //@line 163 "SIDH_v1.0/validate.c"
 $12 = $1; //@line 164 "SIDH_v1.0/validate.c"
 _fp2copy751($12,$X); //@line 164 "SIDH_v1.0/validate.c"
 $13 = $1; //@line 165 "SIDH_v1.0/validate.c"
 $14 = ((($13)) + 192|0); //@line 165 "SIDH_v1.0/validate.c"
 _fp2copy751($14,$Z); //@line 165 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($x,$t0); //@line 167 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($z,$t1); //@line 168 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($x,$z,$t2); //@line 169 "SIDH_v1.0/validate.c"
 $15 = $2; //@line 170 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($15,$t2,$t3); //@line 170 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$t1,$t4); //@line 171 "SIDH_v1.0/validate.c"
 _fp2add751($t3,$t4,$t5); //@line 172 "SIDH_v1.0/validate.c"
 _fp2add751($t3,$t5,$t3); //@line 173 "SIDH_v1.0/validate.c"
 _fp2add751($t5,$t5,$t5); //@line 174 "SIDH_v1.0/validate.c"
 _fp2add751($t1,$t1,$l2P); //@line 175 "SIDH_v1.0/validate.c"
 _fp2add751($t1,$l2P,$l2P); //@line 176 "SIDH_v1.0/validate.c"
 _fp2add751($t3,$l2P,$l2P); //@line 177 "SIDH_v1.0/validate.c"
 _fp2add751($t5,$l2P,$l2P); //@line 178 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t0,$l2P,$l2P); //@line 179 "SIDH_v1.0/validate.c"
 $16 = $5; //@line 180 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t1,$16); //@line 180 "SIDH_v1.0/validate.c"
 $17 = $5; //@line 181 "SIDH_v1.0/validate.c"
 _fp2sub751($l2P,$17,$l2P); //@line 181 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$t3,$l1P); //@line 182 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$l1P,$l1P); //@line 183 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t5,$l1P,$l1P); //@line 184 "SIDH_v1.0/validate.c"
 _fp2sub751($l1P,$l2P,$l1P); //@line 185 "SIDH_v1.0/validate.c"
 _fp2add751($l1P,$l1P,$l1P); //@line 186 "SIDH_v1.0/validate.c"
 _fp2sub751($t0,$t1,$l0P); //@line 187 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t5,$l0P,$l0P); //@line 188 "SIDH_v1.0/validate.c"
 _fp2add751($l0P,$l0P,$l0P); //@line 189 "SIDH_v1.0/validate.c"
 _fp2sub751($l2P,$l0P,$l0P); //@line 190 "SIDH_v1.0/validate.c"
 $18 = $0; //@line 191 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($l0P,$18); //@line 191 "SIDH_v1.0/validate.c"
 $19 = $0; //@line 192 "SIDH_v1.0/validate.c"
 $20 = ((($19)) + 192|0); //@line 192 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($l2P,$20); //@line 192 "SIDH_v1.0/validate.c"
 $21 = $5; //@line 193 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($x,$t5,$21); //@line 193 "SIDH_v1.0/validate.c"
 $22 = $5; //@line 194 "SIDH_v1.0/validate.c"
 $23 = $5; //@line 194 "SIDH_v1.0/validate.c"
 $24 = $5; //@line 194 "SIDH_v1.0/validate.c"
 _fp2add751($22,$23,$24); //@line 194 "SIDH_v1.0/validate.c"
 $25 = $5; //@line 195 "SIDH_v1.0/validate.c"
 $26 = $5; //@line 195 "SIDH_v1.0/validate.c"
 $27 = $5; //@line 195 "SIDH_v1.0/validate.c"
 _fp2add751($25,$26,$27); //@line 195 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t0,$l0P,$t0); //@line 196 "SIDH_v1.0/validate.c"
 $28 = $2; //@line 197 "SIDH_v1.0/validate.c"
 $29 = ((($28)) + 384|0); //@line 197 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($l2P,$29,$t5); //@line 197 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t1,$t5,$t5); //@line 198 "SIDH_v1.0/validate.c"
 $30 = $6; //@line 199 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($l1P,$t2,$30); //@line 199 "SIDH_v1.0/validate.c"
 $31 = $6; //@line 200 "SIDH_v1.0/validate.c"
 $32 = $6; //@line 200 "SIDH_v1.0/validate.c"
 _fp2add751($t5,$31,$32); //@line 200 "SIDH_v1.0/validate.c"
 $33 = $2; //@line 201 "SIDH_v1.0/validate.c"
 $34 = ((($33)) + 384|0); //@line 201 "SIDH_v1.0/validate.c"
 $35 = $6; //@line 201 "SIDH_v1.0/validate.c"
 $36 = $6; //@line 201 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($34,$35,$36); //@line 201 "SIDH_v1.0/validate.c"
 $37 = $6; //@line 202 "SIDH_v1.0/validate.c"
 $38 = $6; //@line 202 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$37,$38); //@line 202 "SIDH_v1.0/validate.c"
 $39 = $6; //@line 203 "SIDH_v1.0/validate.c"
 _fp2neg751($39); //@line 203 "SIDH_v1.0/validate.c"
 $40 = $2; //@line 204 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($40,$t4,$t5); //@line 204 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t4,$t4); //@line 205 "SIDH_v1.0/validate.c"
 _fp2add751($t2,$t2,$t2); //@line 206 "SIDH_v1.0/validate.c"
 $41 = $3; //@line 207 "SIDH_v1.0/validate.c"
 _fp2add751($t2,$t5,$41); //@line 207 "SIDH_v1.0/validate.c"
 _fp2sub751($t5,$t2,$t5); //@line 208 "SIDH_v1.0/validate.c"
 $42 = $3; //@line 209 "SIDH_v1.0/validate.c"
 $43 = $3; //@line 209 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t2,$42,$43); //@line 209 "SIDH_v1.0/validate.c"
 $44 = $3; //@line 210 "SIDH_v1.0/validate.c"
 $45 = $3; //@line 210 "SIDH_v1.0/validate.c"
 _fp2add751($t4,$44,$45); //@line 210 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t2,$t5,$t2); //@line 211 "SIDH_v1.0/validate.c"
 _fp2add751($t2,$t4,$t2); //@line 212 "SIDH_v1.0/validate.c"
 _fp2add751($t4,$t4,$t4); //@line 213 "SIDH_v1.0/validate.c"
 _fp2add751($t2,$t4,$t2); //@line 214 "SIDH_v1.0/validate.c"
 $46 = $3; //@line 215 "SIDH_v1.0/validate.c"
 $47 = $3; //@line 215 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($46,$t2,$47); //@line 215 "SIDH_v1.0/validate.c"
 $48 = $3; //@line 216 "SIDH_v1.0/validate.c"
 $49 = $3; //@line 216 "SIDH_v1.0/validate.c"
 $50 = $3; //@line 216 "SIDH_v1.0/validate.c"
 _fp2add751($48,$49,$50); //@line 216 "SIDH_v1.0/validate.c"
 $51 = $3; //@line 217 "SIDH_v1.0/validate.c"
 $52 = $3; //@line 217 "SIDH_v1.0/validate.c"
 $53 = $3; //@line 217 "SIDH_v1.0/validate.c"
 _fp2add751($51,$52,$53); //@line 217 "SIDH_v1.0/validate.c"
 $54 = $3; //@line 218 "SIDH_v1.0/validate.c"
 $55 = $0; //@line 218 "SIDH_v1.0/validate.c"
 $56 = $3; //@line 218 "SIDH_v1.0/validate.c"
 _fp2sub751($54,$55,$56); //@line 218 "SIDH_v1.0/validate.c"
 $57 = $0; //@line 219 "SIDH_v1.0/validate.c"
 $58 = $0; //@line 219 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($57,$x,$58); //@line 219 "SIDH_v1.0/validate.c"
 $59 = $3; //@line 220 "SIDH_v1.0/validate.c"
 $60 = $0; //@line 220 "SIDH_v1.0/validate.c"
 $61 = ((($60)) + 192|0); //@line 220 "SIDH_v1.0/validate.c"
 $62 = $3; //@line 220 "SIDH_v1.0/validate.c"
 _fp2sub751($59,$61,$62); //@line 220 "SIDH_v1.0/validate.c"
 $63 = $3; //@line 221 "SIDH_v1.0/validate.c"
 _fp2neg751($63); //@line 221 "SIDH_v1.0/validate.c"
 $64 = $3; //@line 222 "SIDH_v1.0/validate.c"
 $65 = $3; //@line 222 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($l0P,$64,$65); //@line 222 "SIDH_v1.0/validate.c"
 $66 = $0; //@line 223 "SIDH_v1.0/validate.c"
 $67 = ((($66)) + 192|0); //@line 223 "SIDH_v1.0/validate.c"
 $68 = $3; //@line 223 "SIDH_v1.0/validate.c"
 $69 = ((($68)) + 192|0); //@line 223 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($67,$l2P,$69); //@line 223 "SIDH_v1.0/validate.c"
 $70 = $3; //@line 224 "SIDH_v1.0/validate.c"
 $71 = ((($70)) + 192|0); //@line 224 "SIDH_v1.0/validate.c"
 $72 = $3; //@line 224 "SIDH_v1.0/validate.c"
 $73 = ((($72)) + 192|0); //@line 224 "SIDH_v1.0/validate.c"
 $74 = $3; //@line 224 "SIDH_v1.0/validate.c"
 $75 = ((($74)) + 192|0); //@line 224 "SIDH_v1.0/validate.c"
 _fp2add751($71,$73,$75); //@line 224 "SIDH_v1.0/validate.c"
 $76 = $0; //@line 225 "SIDH_v1.0/validate.c"
 $77 = ((($76)) + 192|0); //@line 225 "SIDH_v1.0/validate.c"
 $78 = $0; //@line 225 "SIDH_v1.0/validate.c"
 $79 = ((($78)) + 192|0); //@line 225 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($77,$z,$79); //@line 225 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($X,$t0); //@line 226 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($Z,$t6); //@line 227 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($X,$Z,$t2); //@line 228 "SIDH_v1.0/validate.c"
 $80 = $2; //@line 229 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($80,$t2,$t3); //@line 229 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$t6,$t4); //@line 230 "SIDH_v1.0/validate.c"
 _fp2add751($t3,$t4,$t5); //@line 231 "SIDH_v1.0/validate.c"
 _fp2add751($t3,$t5,$t3); //@line 232 "SIDH_v1.0/validate.c"
 _fp2add751($t5,$t5,$t5); //@line 233 "SIDH_v1.0/validate.c"
 _fp2add751($t6,$t6,$l2Q); //@line 234 "SIDH_v1.0/validate.c"
 _fp2add751($t6,$l2Q,$l2Q); //@line 235 "SIDH_v1.0/validate.c"
 _fp2add751($t3,$l2Q,$l2Q); //@line 236 "SIDH_v1.0/validate.c"
 _fp2add751($t5,$l2Q,$l2Q); //@line 237 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t0,$l2Q,$l2Q); //@line 238 "SIDH_v1.0/validate.c"
 $81 = $7; //@line 239 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t6,$81); //@line 239 "SIDH_v1.0/validate.c"
 $82 = $7; //@line 240 "SIDH_v1.0/validate.c"
 _fp2sub751($l2Q,$82,$l2Q); //@line 240 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$t3,$l1Q); //@line 241 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$l1Q,$l1Q); //@line 242 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t5,$l1Q,$l1Q); //@line 243 "SIDH_v1.0/validate.c"
 _fp2sub751($l1Q,$l2Q,$l1Q); //@line 244 "SIDH_v1.0/validate.c"
 _fp2add751($l1Q,$l1Q,$l1Q); //@line 245 "SIDH_v1.0/validate.c"
 _fp2sub751($t0,$t6,$l0Q); //@line 246 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t5,$l0Q,$l0Q); //@line 247 "SIDH_v1.0/validate.c"
 _fp2add751($l0Q,$l0Q,$l0Q); //@line 248 "SIDH_v1.0/validate.c"
 _fp2sub751($l2Q,$l0Q,$l0Q); //@line 249 "SIDH_v1.0/validate.c"
 $83 = $1; //@line 250 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($l0Q,$83); //@line 250 "SIDH_v1.0/validate.c"
 $84 = $1; //@line 251 "SIDH_v1.0/validate.c"
 $85 = ((($84)) + 192|0); //@line 251 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($l2Q,$85); //@line 251 "SIDH_v1.0/validate.c"
 $86 = $7; //@line 252 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($X,$t5,$86); //@line 252 "SIDH_v1.0/validate.c"
 $87 = $7; //@line 253 "SIDH_v1.0/validate.c"
 $88 = $7; //@line 253 "SIDH_v1.0/validate.c"
 $89 = $7; //@line 253 "SIDH_v1.0/validate.c"
 _fp2add751($87,$88,$89); //@line 253 "SIDH_v1.0/validate.c"
 $90 = $7; //@line 254 "SIDH_v1.0/validate.c"
 $91 = $7; //@line 254 "SIDH_v1.0/validate.c"
 $92 = $7; //@line 254 "SIDH_v1.0/validate.c"
 _fp2add751($90,$91,$92); //@line 254 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t0,$l0Q,$t0); //@line 255 "SIDH_v1.0/validate.c"
 $93 = $2; //@line 256 "SIDH_v1.0/validate.c"
 $94 = ((($93)) + 192|0); //@line 256 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($l2Q,$94,$t5); //@line 256 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t6,$t5,$t5); //@line 257 "SIDH_v1.0/validate.c"
 $95 = $8; //@line 258 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($l1Q,$t2,$95); //@line 258 "SIDH_v1.0/validate.c"
 $96 = $8; //@line 259 "SIDH_v1.0/validate.c"
 $97 = $8; //@line 259 "SIDH_v1.0/validate.c"
 _fp2add751($t5,$96,$97); //@line 259 "SIDH_v1.0/validate.c"
 $98 = $2; //@line 260 "SIDH_v1.0/validate.c"
 $99 = ((($98)) + 192|0); //@line 260 "SIDH_v1.0/validate.c"
 $100 = $8; //@line 260 "SIDH_v1.0/validate.c"
 $101 = $8; //@line 260 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($99,$100,$101); //@line 260 "SIDH_v1.0/validate.c"
 $102 = $8; //@line 261 "SIDH_v1.0/validate.c"
 $103 = $8; //@line 261 "SIDH_v1.0/validate.c"
 _fp2add751($t0,$102,$103); //@line 261 "SIDH_v1.0/validate.c"
 $104 = $8; //@line 262 "SIDH_v1.0/validate.c"
 _fp2neg751($104); //@line 262 "SIDH_v1.0/validate.c"
 $105 = $2; //@line 263 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($105,$t4,$t5); //@line 263 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t4,$t4); //@line 264 "SIDH_v1.0/validate.c"
 _fp2add751($t2,$t2,$t2); //@line 265 "SIDH_v1.0/validate.c"
 $106 = $4; //@line 266 "SIDH_v1.0/validate.c"
 _fp2add751($t5,$t2,$106); //@line 266 "SIDH_v1.0/validate.c"
 _fp2sub751($t5,$t2,$t5); //@line 267 "SIDH_v1.0/validate.c"
 $107 = $4; //@line 268 "SIDH_v1.0/validate.c"
 $108 = $4; //@line 268 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($107,$t2,$108); //@line 268 "SIDH_v1.0/validate.c"
 $109 = $4; //@line 269 "SIDH_v1.0/validate.c"
 $110 = $4; //@line 269 "SIDH_v1.0/validate.c"
 _fp2add751($109,$t4,$110); //@line 269 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t2,$t5,$t2); //@line 270 "SIDH_v1.0/validate.c"
 _fp2add751($t4,$t2,$t2); //@line 271 "SIDH_v1.0/validate.c"
 _fp2add751($t4,$t4,$t4); //@line 272 "SIDH_v1.0/validate.c"
 _fp2add751($t2,$t4,$t2); //@line 273 "SIDH_v1.0/validate.c"
 $111 = $4; //@line 274 "SIDH_v1.0/validate.c"
 $112 = $4; //@line 274 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($111,$t2,$112); //@line 274 "SIDH_v1.0/validate.c"
 $113 = $4; //@line 275 "SIDH_v1.0/validate.c"
 $114 = $4; //@line 275 "SIDH_v1.0/validate.c"
 $115 = $4; //@line 275 "SIDH_v1.0/validate.c"
 _fp2add751($113,$114,$115); //@line 275 "SIDH_v1.0/validate.c"
 $116 = $4; //@line 276 "SIDH_v1.0/validate.c"
 $117 = $4; //@line 276 "SIDH_v1.0/validate.c"
 $118 = $4; //@line 276 "SIDH_v1.0/validate.c"
 _fp2add751($116,$117,$118); //@line 276 "SIDH_v1.0/validate.c"
 $119 = $4; //@line 277 "SIDH_v1.0/validate.c"
 $120 = $1; //@line 277 "SIDH_v1.0/validate.c"
 $121 = $4; //@line 277 "SIDH_v1.0/validate.c"
 _fp2sub751($119,$120,$121); //@line 277 "SIDH_v1.0/validate.c"
 $122 = $1; //@line 278 "SIDH_v1.0/validate.c"
 $123 = $1; //@line 278 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($122,$X,$123); //@line 278 "SIDH_v1.0/validate.c"
 $124 = $4; //@line 279 "SIDH_v1.0/validate.c"
 $125 = $1; //@line 279 "SIDH_v1.0/validate.c"
 $126 = ((($125)) + 192|0); //@line 279 "SIDH_v1.0/validate.c"
 $127 = $4; //@line 279 "SIDH_v1.0/validate.c"
 _fp2sub751($124,$126,$127); //@line 279 "SIDH_v1.0/validate.c"
 $128 = $4; //@line 280 "SIDH_v1.0/validate.c"
 _fp2neg751($128); //@line 280 "SIDH_v1.0/validate.c"
 $129 = $4; //@line 281 "SIDH_v1.0/validate.c"
 $130 = $4; //@line 281 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($l0Q,$129,$130); //@line 281 "SIDH_v1.0/validate.c"
 $131 = $1; //@line 282 "SIDH_v1.0/validate.c"
 $132 = ((($131)) + 192|0); //@line 282 "SIDH_v1.0/validate.c"
 $133 = $4; //@line 282 "SIDH_v1.0/validate.c"
 $134 = ((($133)) + 192|0); //@line 282 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($132,$l2Q,$134); //@line 282 "SIDH_v1.0/validate.c"
 $135 = $4; //@line 283 "SIDH_v1.0/validate.c"
 $136 = ((($135)) + 192|0); //@line 283 "SIDH_v1.0/validate.c"
 $137 = $4; //@line 283 "SIDH_v1.0/validate.c"
 $138 = ((($137)) + 192|0); //@line 283 "SIDH_v1.0/validate.c"
 $139 = $4; //@line 283 "SIDH_v1.0/validate.c"
 $140 = ((($139)) + 192|0); //@line 283 "SIDH_v1.0/validate.c"
 _fp2add751($136,$138,$140); //@line 283 "SIDH_v1.0/validate.c"
 $141 = $1; //@line 284 "SIDH_v1.0/validate.c"
 $142 = ((($141)) + 192|0); //@line 284 "SIDH_v1.0/validate.c"
 $143 = $1; //@line 284 "SIDH_v1.0/validate.c"
 $144 = ((($143)) + 192|0); //@line 284 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($142,$Z,$144); //@line 284 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t1,$t6,$t2); //@line 285 "SIDH_v1.0/validate.c"
 $145 = $0; //@line 286 "SIDH_v1.0/validate.c"
 $146 = ((($145)) + 192|0); //@line 286 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t6,$146,$t6); //@line 286 "SIDH_v1.0/validate.c"
 $147 = $1; //@line 287 "SIDH_v1.0/validate.c"
 $148 = ((($147)) + 192|0); //@line 287 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t1,$148,$t1); //@line 287 "SIDH_v1.0/validate.c"
 $149 = $7; //@line 288 "SIDH_v1.0/validate.c"
 $150 = $7; //@line 288 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($149,$Z,$150); //@line 288 "SIDH_v1.0/validate.c"
 $151 = $7; //@line 289 "SIDH_v1.0/validate.c"
 $152 = $1; //@line 289 "SIDH_v1.0/validate.c"
 $153 = ((($152)) + 192|0); //@line 289 "SIDH_v1.0/validate.c"
 $154 = $7; //@line 289 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($151,$153,$154); //@line 289 "SIDH_v1.0/validate.c"
 $155 = $5; //@line 290 "SIDH_v1.0/validate.c"
 $156 = $5; //@line 290 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($155,$z,$156); //@line 290 "SIDH_v1.0/validate.c"
 $157 = $5; //@line 291 "SIDH_v1.0/validate.c"
 $158 = $0; //@line 291 "SIDH_v1.0/validate.c"
 $159 = ((($158)) + 192|0); //@line 291 "SIDH_v1.0/validate.c"
 $160 = $5; //@line 291 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($157,$159,$160); //@line 291 "SIDH_v1.0/validate.c"
 $161 = $2; //@line 292 "SIDH_v1.0/validate.c"
 $162 = ((($161)) + 192|0); //@line 292 "SIDH_v1.0/validate.c"
 $163 = $1; //@line 292 "SIDH_v1.0/validate.c"
 $164 = ((($163)) + 192|0); //@line 292 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($162,$164,$t3); //@line 292 "SIDH_v1.0/validate.c"
 $165 = $1; //@line 293 "SIDH_v1.0/validate.c"
 _fp2sub751($t3,$165,$t3); //@line 293 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t3,$l2Q,$t3); //@line 294 "SIDH_v1.0/validate.c"
 $166 = $2; //@line 295 "SIDH_v1.0/validate.c"
 $167 = ((($166)) + 384|0); //@line 295 "SIDH_v1.0/validate.c"
 $168 = $0; //@line 295 "SIDH_v1.0/validate.c"
 $169 = ((($168)) + 192|0); //@line 295 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($167,$169,$t5); //@line 295 "SIDH_v1.0/validate.c"
 $170 = $0; //@line 296 "SIDH_v1.0/validate.c"
 _fp2sub751($t5,$170,$t5); //@line 296 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t5,$l2P,$t5); //@line 297 "SIDH_v1.0/validate.c"
 $171 = $5; //@line 298 "SIDH_v1.0/validate.c"
 $172 = $5; //@line 298 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($171,$t3,$172); //@line 298 "SIDH_v1.0/validate.c"
 $173 = $5; //@line 299 "SIDH_v1.0/validate.c"
 $174 = $5; //@line 299 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t2,$173,$174); //@line 299 "SIDH_v1.0/validate.c"
 $175 = $6; //@line 300 "SIDH_v1.0/validate.c"
 $176 = $6; //@line 300 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($175,$t3,$176); //@line 300 "SIDH_v1.0/validate.c"
 $177 = $6; //@line 301 "SIDH_v1.0/validate.c"
 $178 = $6; //@line 301 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t6,$177,$178); //@line 301 "SIDH_v1.0/validate.c"
 $179 = $7; //@line 302 "SIDH_v1.0/validate.c"
 $180 = $7; //@line 302 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($179,$t5,$180); //@line 302 "SIDH_v1.0/validate.c"
 $181 = $7; //@line 303 "SIDH_v1.0/validate.c"
 $182 = $7; //@line 303 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t2,$181,$182); //@line 303 "SIDH_v1.0/validate.c"
 $183 = $8; //@line 304 "SIDH_v1.0/validate.c"
 $184 = $8; //@line 304 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($183,$t5,$184); //@line 304 "SIDH_v1.0/validate.c"
 $185 = $8; //@line 305 "SIDH_v1.0/validate.c"
 $186 = $8; //@line 305 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t1,$185,$186); //@line 305 "SIDH_v1.0/validate.c"
 STACKTOP = sp;return; //@line 306 "SIDH_v1.0/validate.c"
}
function _line_indeterminant_TPL($a,$b,$c,$d,$sq) {
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 $d = $d|0;
 $sq = $sq|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $t0 = 0, $t1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 416|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 192|0;
 $t1 = sp;
 $0 = $a;
 $1 = $b;
 $2 = $c;
 $3 = $d;
 $4 = $sq;
 $5 = $0; //@line 147 "SIDH_v1.0/validate.c"
 $6 = $2; //@line 147 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($5,$6,$t0); //@line 147 "SIDH_v1.0/validate.c"
 $7 = $0; //@line 148 "SIDH_v1.0/validate.c"
 $8 = $3; //@line 148 "SIDH_v1.0/validate.c"
 $9 = $0; //@line 148 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($7,$8,$9); //@line 148 "SIDH_v1.0/validate.c"
 $10 = $1; //@line 149 "SIDH_v1.0/validate.c"
 $11 = $2; //@line 149 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($10,$11,$t1); //@line 149 "SIDH_v1.0/validate.c"
 $12 = $0; //@line 150 "SIDH_v1.0/validate.c"
 $13 = $0; //@line 150 "SIDH_v1.0/validate.c"
 _fp2add751($12,$t1,$13); //@line 150 "SIDH_v1.0/validate.c"
 $14 = $1; //@line 151 "SIDH_v1.0/validate.c"
 $15 = $3; //@line 151 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($14,$15,$t1); //@line 151 "SIDH_v1.0/validate.c"
 $16 = $4; //@line 152 "SIDH_v1.0/validate.c"
 $17 = $1; //@line 152 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t0,$16,$17); //@line 152 "SIDH_v1.0/validate.c"
 $18 = $1; //@line 153 "SIDH_v1.0/validate.c"
 $19 = $1; //@line 153 "SIDH_v1.0/validate.c"
 _fp2add751($18,$t1,$19); //@line 153 "SIDH_v1.0/validate.c"
 STACKTOP = sp;return; //@line 154 "SIDH_v1.0/validate.c"
}
function _is_equal_fp2($a,$b) {
 $a = $a|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $b;
 $2 = $0; //@line 35 "SIDH_v1.0/validate.c"
 $3 = $1; //@line 35 "SIDH_v1.0/validate.c"
 $4 = (_is_equal_fp($2,$3)|0); //@line 35 "SIDH_v1.0/validate.c"
 if (!($4)) {
  $10 = 0;
  STACKTOP = sp;return ($10|0); //@line 35 "SIDH_v1.0/validate.c"
 }
 $5 = $0; //@line 35 "SIDH_v1.0/validate.c"
 $6 = ((($5)) + 96|0); //@line 35 "SIDH_v1.0/validate.c"
 $7 = $1; //@line 35 "SIDH_v1.0/validate.c"
 $8 = ((($7)) + 96|0); //@line 35 "SIDH_v1.0/validate.c"
 $9 = (_is_equal_fp($6,$8)|0); //@line 35 "SIDH_v1.0/validate.c"
 $10 = $9;
 STACKTOP = sp;return ($10|0); //@line 35 "SIDH_v1.0/validate.c"
}
function _test_curve($A,$rvalue,$CurveIsogeny) {
 $A = $A|0;
 $rvalue = $rvalue|0;
 $CurveIsogeny = $CurveIsogeny|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $C = 0, $P1 = 0, $one = 0, $rP = 0, $t0 = 0, $t1 = 0, $valid_curve = 0, $zero = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1744|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $t0 = sp + 1536|0;
 $t1 = sp + 1344|0;
 $C = sp + 1152|0;
 $one = sp + 960|0;
 $zero = sp + 768|0;
 $rP = sp + 384|0;
 $P1 = sp;
 $0 = $A;
 $1 = $rvalue;
 $2 = $CurveIsogeny;
 _memset(($one|0),0,192)|0; //@line 89 "SIDH_v1.0/validate.c"
 _memset(($zero|0),0,192)|0; //@line 89 "SIDH_v1.0/validate.c"
 $3 = $2; //@line 93 "SIDH_v1.0/validate.c"
 $4 = ((($3)) + 80|0); //@line 93 "SIDH_v1.0/validate.c"
 $5 = HEAP32[$4>>2]|0; //@line 93 "SIDH_v1.0/validate.c"
 _fpcopy751($5,$one); //@line 93 "SIDH_v1.0/validate.c"
 $6 = $0; //@line 96 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($6,$t0); //@line 96 "SIDH_v1.0/validate.c"
 _fp2sub751($t0,$one,$t0); //@line 97 "SIDH_v1.0/validate.c"
 _fp2sub751($t0,$one,$t0); //@line 98 "SIDH_v1.0/validate.c"
 _fp2sub751($t0,$one,$t0); //@line 99 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($t0,$t1); //@line 100 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($t0,$t1,$t1); //@line 101 "SIDH_v1.0/validate.c"
 _fp2sub751($t0,$one,$t0); //@line 102 "SIDH_v1.0/validate.c"
 $7 = ((($t0)) + 96|0); //@line 103 "SIDH_v1.0/validate.c"
 _fpmul751_mont($t1,$7,$t1); //@line 103 "SIDH_v1.0/validate.c"
 $8 = ((($t1)) + 96|0); //@line 104 "SIDH_v1.0/validate.c"
 $9 = ((($t1)) + 96|0); //@line 104 "SIDH_v1.0/validate.c"
 _fpmul751_mont($8,$t0,$9); //@line 104 "SIDH_v1.0/validate.c"
 $10 = ((($t1)) + 96|0); //@line 106 "SIDH_v1.0/validate.c"
 $11 = (_is_equal_fp($t1,$10)|0); //@line 106 "SIDH_v1.0/validate.c"
 $12 = $11 ^ 1; //@line 106 "SIDH_v1.0/validate.c"
 $13 = $12&1; //@line 106 "SIDH_v1.0/validate.c"
 $valid_curve = $13; //@line 106 "SIDH_v1.0/validate.c"
 $14 = $1; //@line 109 "SIDH_v1.0/validate.c"
 _fp2copy751($14,$rP); //@line 109 "SIDH_v1.0/validate.c"
 $15 = ((($rP)) + 192|0); //@line 110 "SIDH_v1.0/validate.c"
 _fp2copy751($one,$15); //@line 110 "SIDH_v1.0/validate.c"
 _fp2copy751($one,$C); //@line 111 "SIDH_v1.0/validate.c"
 $16 = $0; //@line 113 "SIDH_v1.0/validate.c"
 _xDBLe($rP,$rP,$16,$C,1); //@line 113 "SIDH_v1.0/validate.c"
 $17 = $0; //@line 114 "SIDH_v1.0/validate.c"
 _xDBLe($rP,$P1,$17,$C,371); //@line 114 "SIDH_v1.0/validate.c"
 $18 = $0; //@line 115 "SIDH_v1.0/validate.c"
 _xTPLe($P1,$P1,$18,$C,239); //@line 115 "SIDH_v1.0/validate.c"
 $19 = ((($P1)) + 192|0); //@line 116 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($rP,$19,$rP); //@line 116 "SIDH_v1.0/validate.c"
 $20 = ((($rP)) + 192|0); //@line 117 "SIDH_v1.0/validate.c"
 $21 = ((($rP)) + 192|0); //@line 117 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($20,$P1,$21); //@line 117 "SIDH_v1.0/validate.c"
 $22 = ((($rP)) + 192|0); //@line 118 "SIDH_v1.0/validate.c"
 _fp2sub751($rP,$22,$rP); //@line 118 "SIDH_v1.0/validate.c"
 $23 = ((($P1)) + 192|0); //@line 119 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($rP,$23,$rP); //@line 119 "SIDH_v1.0/validate.c"
 $24 = $valid_curve; //@line 121 "SIDH_v1.0/validate.c"
 $25 = $24&1; //@line 121 "SIDH_v1.0/validate.c"
 if (!($25)) {
  $27 = 0;
  STACKTOP = sp;return ($27|0); //@line 121 "SIDH_v1.0/validate.c"
 }
 $26 = (_is_equal_fp2($rP,$zero)|0); //@line 121 "SIDH_v1.0/validate.c"
 $27 = $26;
 STACKTOP = sp;return ($27|0); //@line 121 "SIDH_v1.0/validate.c"
}
function _is_equal_fp($a,$b) {
 $a = $a|0;
 $b = $b|0;
 var $$expand_i1_val = 0, $$expand_i1_val2 = 0, $$pre_trunc = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = sp + 12|0;
 $1 = $a;
 $2 = $b;
 $i = 0; //@line 22 "SIDH_v1.0/validate.c"
 while(1) {
  $3 = $i; //@line 22 "SIDH_v1.0/validate.c"
  $4 = ($3>>>0)<(24); //@line 22 "SIDH_v1.0/validate.c"
  if (!($4)) {
   label = 6;
   break;
  }
  $5 = $i; //@line 23 "SIDH_v1.0/validate.c"
  $6 = $1; //@line 23 "SIDH_v1.0/validate.c"
  $7 = (($6) + ($5<<2)|0); //@line 23 "SIDH_v1.0/validate.c"
  $8 = HEAP32[$7>>2]|0; //@line 23 "SIDH_v1.0/validate.c"
  $9 = $i; //@line 23 "SIDH_v1.0/validate.c"
  $10 = $2; //@line 23 "SIDH_v1.0/validate.c"
  $11 = (($10) + ($9<<2)|0); //@line 23 "SIDH_v1.0/validate.c"
  $12 = HEAP32[$11>>2]|0; //@line 23 "SIDH_v1.0/validate.c"
  $13 = ($8|0)!=($12|0); //@line 23 "SIDH_v1.0/validate.c"
  if ($13) {
   label = 4;
   break;
  }
  $14 = $i; //@line 22 "SIDH_v1.0/validate.c"
  $15 = (($14) + 1)|0; //@line 22 "SIDH_v1.0/validate.c"
  $i = $15; //@line 22 "SIDH_v1.0/validate.c"
 }
 if ((label|0) == 4) {
  $$expand_i1_val = 0; //@line 24 "SIDH_v1.0/validate.c"
  HEAP8[$0>>0] = $$expand_i1_val; //@line 24 "SIDH_v1.0/validate.c"
  $$pre_trunc = HEAP8[$0>>0]|0; //@line 29 "SIDH_v1.0/validate.c"
  $16 = $$pre_trunc&1; //@line 29 "SIDH_v1.0/validate.c"
  STACKTOP = sp;return ($16|0); //@line 29 "SIDH_v1.0/validate.c"
 }
 else if ((label|0) == 6) {
  $$expand_i1_val2 = 1; //@line 28 "SIDH_v1.0/validate.c"
  HEAP8[$0>>0] = $$expand_i1_val2; //@line 28 "SIDH_v1.0/validate.c"
  $$pre_trunc = HEAP8[$0>>0]|0; //@line 29 "SIDH_v1.0/validate.c"
  $16 = $$pre_trunc&1; //@line 29 "SIDH_v1.0/validate.c"
  STACKTOP = sp;return ($16|0); //@line 29 "SIDH_v1.0/validate.c"
 }
 return (0)|0;
}
function _sidhjs_randombytes($nbytes,$random_array) {
 $nbytes = $nbytes|0;
 $random_array = $random_array|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $nbytes;
 $1 = $random_array;
 $2 = $1; //@line 15 "sidh.c"
 $3 = $0; //@line 15 "sidh.c"
 _randombytes_buf($2,$3); //@line 15 "sidh.c"
 STACKTOP = sp;return 0; //@line 16 "sidh.c"
}
function _sidhjs_init() {
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 _randombytes_stir(); //@line 20 "sidh.c"
 $0 = (_SIDH_curve_allocate(8)|0); //@line 22 "sidh.c"
 HEAP32[4736>>2] = $0; //@line 22 "sidh.c"
 $1 = HEAP32[4736>>2]|0; //@line 25 "sidh.c"
 $2 = (_SIDH_curve_initialize($1,18,8)|0); //@line 24 "sidh.c"
 return ($2|0); //@line 24 "sidh.c"
}
function _sidhjs_public_key_bytes() {
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[4728>>2]|0; //@line 32 "sidh.c"
 $1 = (($0) + 1)|0; //@line 32 "sidh.c"
 return ($1|0); //@line 32 "sidh.c"
}
function _sidhjs_private_key_bytes() {
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[4732>>2]|0; //@line 36 "sidh.c"
 $1 = (($0) + 1)|0; //@line 36 "sidh.c"
 return ($1|0); //@line 36 "sidh.c"
}
function _sidhjs_secret_bytes() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 192; //@line 40 "sidh.c"
}
function _sidhjs_keypair($is_alice,$public_key,$private_key) {
 $is_alice = $is_alice|0;
 $public_key = $public_key|0;
 $private_key = $private_key|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $status = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $is_alice;
 $1 = $public_key;
 $2 = $private_key;
 $3 = $0; //@line 50 "sidh.c"
 $4 = ($3|0)!=(0); //@line 50 "sidh.c"
 $5 = $2; //@line 51 "sidh.c"
 $6 = $1; //@line 51 "sidh.c"
 $7 = HEAP32[4736>>2]|0; //@line 51 "sidh.c"
 if ($4) {
  $8 = (_KeyGeneration_A($5,$6,$7)|0); //@line 51 "sidh.c"
  $status = $8; //@line 51 "sidh.c"
  $9 = HEAP32[4728>>2]|0; //@line 53 "sidh.c"
  $10 = $1; //@line 53 "sidh.c"
  $11 = (($10) + ($9)|0); //@line 53 "sidh.c"
  HEAP8[$11>>0] = 1; //@line 53 "sidh.c"
  $12 = HEAP32[4732>>2]|0; //@line 54 "sidh.c"
  $13 = $2; //@line 54 "sidh.c"
  $14 = (($13) + ($12)|0); //@line 54 "sidh.c"
  HEAP8[$14>>0] = 1; //@line 54 "sidh.c"
  $22 = $status; //@line 63 "sidh.c"
  STACKTOP = sp;return ($22|0); //@line 63 "sidh.c"
 } else {
  $15 = (_KeyGeneration_B($5,$6,$7)|0); //@line 57 "sidh.c"
  $status = $15; //@line 57 "sidh.c"
  $16 = HEAP32[4728>>2]|0; //@line 59 "sidh.c"
  $17 = $1; //@line 59 "sidh.c"
  $18 = (($17) + ($16)|0); //@line 59 "sidh.c"
  HEAP8[$18>>0] = 0; //@line 59 "sidh.c"
  $19 = HEAP32[4732>>2]|0; //@line 60 "sidh.c"
  $20 = $2; //@line 60 "sidh.c"
  $21 = (($20) + ($19)|0); //@line 60 "sidh.c"
  HEAP8[$21>>0] = 0; //@line 60 "sidh.c"
  $22 = $status; //@line 63 "sidh.c"
  STACKTOP = sp;return ($22|0); //@line 63 "sidh.c"
 }
 return (0)|0;
}
function _sidhjs_secret($public_key,$private_key,$secret) {
 $public_key = $public_key|0;
 $private_key = $private_key|0;
 $secret = $secret|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $is_private_alice = 0, $is_public_alice = 0, $or$cond = 0, $or$cond3 = 0, $secret_agreement = 0, $valid = 0, $validate = 0, $validate_status = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $valid = sp + 36|0;
 $1 = $public_key;
 $2 = $private_key;
 $3 = $secret;
 $4 = HEAP32[4728>>2]|0; //@line 75 "sidh.c"
 $5 = $1; //@line 75 "sidh.c"
 $6 = (($5) + ($4)|0); //@line 75 "sidh.c"
 $7 = HEAP8[$6>>0]|0; //@line 75 "sidh.c"
 $8 = $7&255; //@line 75 "sidh.c"
 $is_public_alice = $8; //@line 75 "sidh.c"
 $9 = HEAP32[4732>>2]|0; //@line 76 "sidh.c"
 $10 = $2; //@line 76 "sidh.c"
 $11 = (($10) + ($9)|0); //@line 76 "sidh.c"
 $12 = HEAP8[$11>>0]|0; //@line 76 "sidh.c"
 $13 = $12&255; //@line 76 "sidh.c"
 $is_private_alice = $13; //@line 76 "sidh.c"
 $14 = $is_public_alice; //@line 79 "sidh.c"
 $15 = ($14|0)!=(0); //@line 79 "sidh.c"
 $16 = $is_private_alice;
 $17 = ($16|0)!=(0); //@line 79 "sidh.c"
 $or$cond = $15 & $17; //@line 79 "sidh.c"
 if (!($or$cond)) {
  $18 = $is_public_alice; //@line 80 "sidh.c"
  $19 = ($18|0)!=(0); //@line 80 "sidh.c"
  $20 = $is_private_alice;
  $21 = ($20|0)!=(0); //@line 80 "sidh.c"
  $or$cond3 = $19 | $21; //@line 80 "sidh.c"
  if ($or$cond3) {
   $22 = $is_private_alice; //@line 85 "sidh.c"
   $23 = ($22|0)!=(0); //@line 85 "sidh.c"
   if ($23) {
    $validate = 18; //@line 86 "sidh.c"
    $secret_agreement = 18; //@line 87 "sidh.c"
   } else {
    $validate = 19; //@line 90 "sidh.c"
    $secret_agreement = 19; //@line 91 "sidh.c"
   }
   $24 = $validate; //@line 94 "sidh.c"
   $25 = $1; //@line 94 "sidh.c"
   $26 = HEAP32[4736>>2]|0; //@line 94 "sidh.c"
   $27 = (FUNCTION_TABLE_iiii[$24 & 31]($25,$valid,$26)|0); //@line 94 "sidh.c"
   $validate_status = $27; //@line 94 "sidh.c"
   $28 = $validate_status; //@line 96 "sidh.c"
   $29 = ($28|0)!=(0); //@line 96 "sidh.c"
   if ($29) {
    $30 = $validate_status; //@line 97 "sidh.c"
    $0 = $30; //@line 97 "sidh.c"
    $39 = $0; //@line 104 "sidh.c"
    STACKTOP = sp;return ($39|0); //@line 104 "sidh.c"
   }
   $31 = HEAP8[$valid>>0]|0; //@line 99 "sidh.c"
   $32 = $31&1; //@line 99 "sidh.c"
   if ($32) {
    $33 = $secret_agreement; //@line 103 "sidh.c"
    $34 = $2; //@line 103 "sidh.c"
    $35 = $1; //@line 103 "sidh.c"
    $36 = $3; //@line 103 "sidh.c"
    $37 = HEAP32[4736>>2]|0; //@line 103 "sidh.c"
    $38 = (FUNCTION_TABLE_iiiii[$33 & 31]($34,$35,$36,$37)|0); //@line 103 "sidh.c"
    $0 = $38; //@line 103 "sidh.c"
    $39 = $0; //@line 104 "sidh.c"
    STACKTOP = sp;return ($39|0); //@line 104 "sidh.c"
   } else {
    $0 = 8; //@line 100 "sidh.c"
    $39 = $0; //@line 104 "sidh.c"
    STACKTOP = sp;return ($39|0); //@line 104 "sidh.c"
   }
  }
 }
 $0 = 6; //@line 82 "sidh.c"
 $39 = $0; //@line 104 "sidh.c"
 STACKTOP = sp;return ($39|0); //@line 104 "sidh.c"
}
function ___errno_location() {
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[4740>>2]|0;
 $1 = ($0|0)==(0|0);
 if ($1) {
  $$0 = 4784;
 } else {
  $2 = (_pthread_self()|0);
  $3 = ((($2)) + 60|0);
  $4 = HEAP32[$3>>2]|0;
  $$0 = $4;
 }
 return ($$0|0);
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$3$i = 0, $$lcssa = 0, $$lcssa211 = 0, $$lcssa215 = 0, $$lcssa216 = 0, $$lcssa217 = 0, $$lcssa219 = 0, $$lcssa222 = 0, $$lcssa224 = 0, $$lcssa226 = 0, $$lcssa228 = 0, $$lcssa230 = 0, $$lcssa232 = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i22$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i23$iZ2D = 0;
 var $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi58$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre106 = 0, $$pre14$i$i = 0, $$pre43$i = 0, $$pre56$i$i = 0, $$pre57$i$i = 0, $$pre8$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i13$i = 0, $$sum$i14$i = 0, $$sum$i17$i = 0, $$sum$i19$i = 0;
 var $$sum$i2334 = 0, $$sum$i32 = 0, $$sum$i35 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i15$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum116$i = 0;
 var $$sum117$i = 0, $$sum118$i = 0, $$sum119$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum120$i = 0, $$sum121$i = 0, $$sum122$i = 0, $$sum123$i = 0, $$sum124$i = 0, $$sum125$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum15$i = 0, $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0;
 var $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i16$i = 0, $$sum2$i18$i = 0, $$sum2$i21$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0, $$sum25$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i27 = 0;
 var $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0, $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0;
 var $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0;
 var $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0;
 var $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0;
 var $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0;
 var $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0;
 var $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0;
 var $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0;
 var $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0;
 var $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0;
 var $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0;
 var $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0;
 var $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0;
 var $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0;
 var $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0;
 var $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0;
 var $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0;
 var $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0;
 var $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0;
 var $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0;
 var $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0;
 var $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0;
 var $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0;
 var $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0;
 var $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0;
 var $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0;
 var $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0;
 var $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0;
 var $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0;
 var $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0;
 var $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0;
 var $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0;
 var $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0;
 var $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0;
 var $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0;
 var $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0;
 var $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0;
 var $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0;
 var $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0;
 var $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0;
 var $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0;
 var $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0;
 var $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0;
 var $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0;
 var $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0;
 var $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0;
 var $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0;
 var $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0;
 var $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0;
 var $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0;
 var $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0;
 var $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0;
 var $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0;
 var $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0;
 var $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0;
 var $F5$0$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$029$i = 0, $K2$07$i$i = 0, $K8$051$i$i = 0, $R$0$i = 0, $R$0$i$i = 0, $R$0$i$i$lcssa = 0, $R$0$i$lcssa = 0, $R$0$i18 = 0, $R$0$i18$lcssa = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i$i$lcssa = 0, $RP$0$i$lcssa = 0;
 var $RP$0$i17 = 0, $RP$0$i17$lcssa = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i25$i = 0, $T$028$i = 0, $T$028$i$lcssa = 0, $T$050$i$i = 0, $T$050$i$i$lcssa = 0, $T$06$i$i = 0, $T$06$i$i$lcssa = 0, $br$0$ph$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0, $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0;
 var $not$$i = 0, $not$$i$i = 0, $not$$i26$i = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i30 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond3$i = 0, $or$cond5$i = 0, $or$cond57$i = 0, $or$cond6$i = 0, $or$cond8$i = 0, $or$cond9$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i$lcssa = 0, $rsize$0$i15 = 0, $rsize$1$i = 0;
 var $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$084$i = 0, $sp$084$i$lcssa = 0, $sp$183$i = 0, $sp$183$i$lcssa = 0, $ssize$0$$i = 0, $ssize$0$i = 0, $ssize$1$ph$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0, $t$1$i = 0, $t$2$ph$i = 0;
 var $t$2$v$3$i = 0, $t$230$i = 0, $tbase$255$i = 0, $tsize$0$ph$i = 0, $tsize$0323944$i = 0, $tsize$1$i = 0, $tsize$254$i = 0, $v$0$i = 0, $v$0$i$lcssa = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$3$ph$i = 0, $v$332$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   $2 = (($bytes) + 11)|0;
   $3 = $2 & -8;
   $4 = $1 ? 16 : $3;
   $5 = $4 >>> 3;
   $6 = HEAP32[4788>>2]|0;
   $7 = $6 >>> $5;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($5))|0;
    $13 = $12 << 1;
    $14 = (4828 + ($13<<2)|0);
    $$sum10 = (($13) + 2)|0;
    $15 = (4828 + ($$sum10<<2)|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = ((($16)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[4788>>2] = $22;
     } else {
      $23 = HEAP32[(4804)>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = ((($18)) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = ((($16)) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    return ($mem$0|0);
   }
   $34 = HEAP32[(4796)>>2]|0;
   $35 = ($4>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $5;
     $38 = 2 << $5;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = (4828 + ($65<<2)|0);
     $$sum4 = (($65) + 2)|0;
     $67 = (4828 + ($$sum4<<2)|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = ((($68)) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[4788>>2] = $74;
       $89 = $34;
      } else {
       $75 = HEAP32[(4804)>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = ((($70)) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[(4796)>>2]|0;
        $89 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($4))|0;
     $82 = $4 | 3;
     $83 = ((($68)) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($4)|0);
     $85 = $81 | 1;
     $$sum56 = $4 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $88 = ($89|0)==(0);
     if (!($88)) {
      $90 = HEAP32[(4808)>>2]|0;
      $91 = $89 >>> 3;
      $92 = $91 << 1;
      $93 = (4828 + ($92<<2)|0);
      $94 = HEAP32[4788>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[4788>>2] = $98;
       $$pre105 = (($92) + 2)|0;
       $$pre106 = (4828 + ($$pre105<<2)|0);
       $$pre$phiZ2D = $$pre106;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = (4828 + ($$sum9<<2)|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[(4804)>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = ((($F4$0)) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = ((($90)) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = ((($90)) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[(4796)>>2] = $81;
     HEAP32[(4808)>>2] = $84;
     $mem$0 = $69;
     return ($mem$0|0);
    }
    $106 = HEAP32[(4792)>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $4;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = (5092 + ($130<<2)|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = ((($132)) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($4))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = ((($t$0$i)) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = ((($t$0$i)) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        $rsize$0$i$lcssa = $rsize$0$i;$v$0$i$lcssa = $v$0$i;
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = ((($144)) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($4))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[(4804)>>2]|0;
     $150 = ($v$0$i$lcssa>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i$lcssa) + ($4)|0);
     $152 = ($v$0$i$lcssa>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = ((($v$0$i$lcssa)) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = ((($v$0$i$lcssa)) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i$lcssa|0);
     do {
      if ($157) {
       $167 = ((($v$0$i$lcssa)) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = ((($v$0$i$lcssa)) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;$RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;$RP$0$i = $167;
       }
       while(1) {
        $173 = ((($R$0$i)) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = ((($R$0$i)) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         $R$0$i$lcssa = $R$0$i;$RP$0$i$lcssa = $RP$0$i;
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i$lcssa>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i$lcssa>>2] = 0;
        $R$1$i = $R$0$i$lcssa;
        break;
       }
      } else {
       $158 = ((($v$0$i$lcssa)) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = ((($159)) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i$lcssa|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = ((($156)) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i$lcssa|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = ((($v$0$i$lcssa)) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = (5092 + ($182<<2)|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i$lcssa|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[(4792)>>2]|0;
         $189 = $188 & $187;
         HEAP32[(4792)>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[(4804)>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = ((($154)) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i$lcssa|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = ((($154)) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[(4804)>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = ((($R$1$i)) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = ((($v$0$i$lcssa)) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = ((($R$1$i)) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = ((($201)) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = ((($v$0$i$lcssa)) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[(4804)>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = ((($R$1$i)) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = ((($207)) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i$lcssa>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i$lcssa) + ($4))|0;
      $215 = $214 | 3;
      $216 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i$lcssa) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $4 | 3;
      $221 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i$lcssa | 1;
      $$sum$i35 = $4 | 4;
      $223 = (($v$0$i$lcssa) + ($$sum$i35)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i$lcssa) + ($4))|0;
      $224 = (($v$0$i$lcssa) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i$lcssa;
      $225 = HEAP32[(4796)>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[(4808)>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = (4828 + ($229<<2)|0);
       $231 = HEAP32[4788>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[4788>>2] = $235;
        $$pre$i = (($229) + 2)|0;
        $$pre8$i = (4828 + ($$pre$i<<2)|0);
        $$pre$phi$iZ2D = $$pre8$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = (4828 + ($$sum3$i<<2)|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[(4804)>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = ((($F1$0$i)) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = ((($227)) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = ((($227)) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[(4796)>>2] = $rsize$0$i$lcssa;
      HEAP32[(4808)>>2] = $151;
     }
     $243 = ((($v$0$i$lcssa)) + 8|0);
     $mem$0 = $243;
     return ($mem$0|0);
    }
   } else {
    $nb$0 = $4;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[(4792)>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = (($250) + 1048320)|0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = (($256) + 520192)|0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = (($261) + 245760)|0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = (14 - ($265))|0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = (($266) + ($268))|0;
       $270 = $269 << 1;
       $271 = (($269) + 7)|0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = (5092 + ($idx$0$i<<2)|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L123: do {
      if ($277) {
       $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
       label = 86;
      } else {
       $278 = ($idx$0$i|0)==(31);
       $279 = $idx$0$i >>> 1;
       $280 = (25 - ($279))|0;
       $281 = $278 ? 0 : $280;
       $282 = $246 << $281;
       $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $282;$t$0$i14 = $276;$v$0$i16 = 0;
       while(1) {
        $283 = ((($t$0$i14)) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($rsize$0$i15>>>0);
        if ($287) {
         $288 = ($285|0)==($246|0);
         if ($288) {
          $rsize$331$i = $286;$t$230$i = $t$0$i14;$v$332$i = $t$0$i14;
          label = 90;
          break L123;
         } else {
          $rsize$1$i = $286;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $289 = ((($t$0$i14)) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $sizebits$0$i >>> 31;
        $292 = (((($t$0$i14)) + 16|0) + ($291<<2)|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         label = 86;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     if ((label|0) == 86) {
      $298 = ($t$1$i|0)==(0|0);
      $299 = ($v$2$i|0)==(0|0);
      $or$cond$i = $298 & $299;
      if ($or$cond$i) {
       $300 = 2 << $idx$0$i;
       $301 = (0 - ($300))|0;
       $302 = $300 | $301;
       $303 = $247 & $302;
       $304 = ($303|0)==(0);
       if ($304) {
        $nb$0 = $246;
        break;
       }
       $305 = (0 - ($303))|0;
       $306 = $303 & $305;
       $307 = (($306) + -1)|0;
       $308 = $307 >>> 12;
       $309 = $308 & 16;
       $310 = $307 >>> $309;
       $311 = $310 >>> 5;
       $312 = $311 & 8;
       $313 = $312 | $309;
       $314 = $310 >>> $312;
       $315 = $314 >>> 2;
       $316 = $315 & 4;
       $317 = $313 | $316;
       $318 = $314 >>> $316;
       $319 = $318 >>> 1;
       $320 = $319 & 2;
       $321 = $317 | $320;
       $322 = $318 >>> $320;
       $323 = $322 >>> 1;
       $324 = $323 & 1;
       $325 = $321 | $324;
       $326 = $322 >>> $324;
       $327 = (($325) + ($326))|0;
       $328 = (5092 + ($327<<2)|0);
       $329 = HEAP32[$328>>2]|0;
       $t$2$ph$i = $329;$v$3$ph$i = 0;
      } else {
       $t$2$ph$i = $t$1$i;$v$3$ph$i = $v$2$i;
      }
      $330 = ($t$2$ph$i|0)==(0|0);
      if ($330) {
       $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$3$ph$i;
      } else {
       $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$3$ph$i;
       label = 90;
      }
     }
     if ((label|0) == 90) {
      while(1) {
       label = 0;
       $331 = ((($t$230$i)) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = ((($t$230$i)) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if (!($338)) {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $337;$v$332$i = $t$2$v$3$i;
        label = 90;
        continue;
       }
       $339 = ((($t$230$i)) + 20|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $340;$v$332$i = $t$2$v$3$i;
        label = 90;
       }
      }
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[(4796)>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[(4804)>>2]|0;
       $347 = ($v$3$lcssa$i>>>0)<($346>>>0);
       if ($347) {
        _abort();
        // unreachable;
       }
       $348 = (($v$3$lcssa$i) + ($246)|0);
       $349 = ($v$3$lcssa$i>>>0)<($348>>>0);
       if (!($349)) {
        _abort();
        // unreachable;
       }
       $350 = ((($v$3$lcssa$i)) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = ((($v$3$lcssa$i)) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = ((($v$3$lcssa$i)) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = ((($v$3$lcssa$i)) + 16|0);
          $368 = HEAP32[$367>>2]|0;
          $369 = ($368|0)==(0|0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $368;$RP$0$i17 = $367;
          }
         } else {
          $R$0$i18 = $365;$RP$0$i17 = $364;
         }
         while(1) {
          $370 = ((($R$0$i18)) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if (!($372)) {
           $R$0$i18 = $371;$RP$0$i17 = $370;
           continue;
          }
          $373 = ((($R$0$i18)) + 16|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if ($375) {
           $R$0$i18$lcssa = $R$0$i18;$RP$0$i17$lcssa = $RP$0$i17;
           break;
          } else {
           $R$0$i18 = $374;$RP$0$i17 = $373;
          }
         }
         $376 = ($RP$0$i17$lcssa>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17$lcssa>>2] = 0;
          $R$1$i20 = $R$0$i18$lcssa;
          break;
         }
        } else {
         $355 = ((($v$3$lcssa$i)) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = ((($356)) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = ((($353)) + 8|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$3$lcssa$i|0);
         if ($363) {
          HEAP32[$358>>2] = $353;
          HEAP32[$361>>2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $377 = ($351|0)==(0|0);
       do {
        if (!($377)) {
         $378 = ((($v$3$lcssa$i)) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = (5092 + ($379<<2)|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[(4792)>>2]|0;
           $386 = $385 & $384;
           HEAP32[(4792)>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[(4804)>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = ((($351)) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = ((($351)) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[(4804)>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = ((($R$1$i20)) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = ((($v$3$lcssa$i)) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = ((($R$1$i20)) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = ((($398)) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = ((($v$3$lcssa$i)) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[(4804)>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = ((($R$1$i20)) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = ((($404)) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L199: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2334 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2334)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = (4828 + ($424<<2)|0);
          $426 = HEAP32[4788>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          if ($429) {
           $430 = $426 | $427;
           HEAP32[4788>>2] = $430;
           $$pre$i25 = (($424) + 2)|0;
           $$pre43$i = (4828 + ($$pre$i25<<2)|0);
           $$pre$phi$i26Z2D = $$pre43$i;$F5$0$i = $425;
          } else {
           $$sum17$i = (($424) + 2)|0;
           $431 = (4828 + ($$sum17$i<<2)|0);
           $432 = HEAP32[$431>>2]|0;
           $433 = HEAP32[(4804)>>2]|0;
           $434 = ($432>>>0)<($433>>>0);
           if ($434) {
            _abort();
            // unreachable;
           } else {
            $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
           }
          }
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = ((($F5$0$i)) + 12|0);
          HEAP32[$435>>2] = $348;
          $$sum15$i = (($246) + 8)|0;
          $436 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$436>>2] = $F5$0$i;
          $$sum16$i = (($246) + 12)|0;
          $437 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$437>>2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438|0)==(0);
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = (($438) + 1048320)|0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = (($444) + 520192)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = (($449) + 245760)|0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = (14 - ($453))|0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = (($454) + ($456))|0;
           $458 = $457 << 1;
           $459 = (($457) + 7)|0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = (5092 + ($I7$0$i<<2)|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[(4792)>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[(4792)>>2] = $471;
          HEAP32[$463>>2] = $348;
          $$sum5$i = (($246) + 24)|0;
          $472 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$472>>2] = $463;
          $$sum6$i = (($246) + 12)|0;
          $473 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$473>>2] = $348;
          $$sum7$i = (($246) + 8)|0;
          $474 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$474>>2] = $348;
          break;
         }
         $475 = HEAP32[$463>>2]|0;
         $476 = ((($475)) + 4|0);
         $477 = HEAP32[$476>>2]|0;
         $478 = $477 & -8;
         $479 = ($478|0)==($rsize$3$lcssa$i|0);
         L217: do {
          if ($479) {
           $T$0$lcssa$i = $475;
          } else {
           $480 = ($I7$0$i|0)==(31);
           $481 = $I7$0$i >>> 1;
           $482 = (25 - ($481))|0;
           $483 = $480 ? 0 : $482;
           $484 = $rsize$3$lcssa$i << $483;
           $K12$029$i = $484;$T$028$i = $475;
           while(1) {
            $491 = $K12$029$i >>> 31;
            $492 = (((($T$028$i)) + 16|0) + ($491<<2)|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             $$lcssa232 = $492;$T$028$i$lcssa = $T$028$i;
             break;
            }
            $485 = $K12$029$i << 1;
            $486 = ((($487)) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L217;
            } else {
             $K12$029$i = $485;$T$028$i = $487;
            }
           }
           $494 = HEAP32[(4804)>>2]|0;
           $495 = ($$lcssa232>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$$lcssa232>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$028$i$lcssa;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L199;
           }
          }
         } while(0);
         $499 = ((($T$0$lcssa$i)) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[(4804)>>2]|0;
         $502 = ($500>>>0)>=($501>>>0);
         $not$$i = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = $502 & $not$$i;
         if ($503) {
          $504 = ((($500)) + 12|0);
          HEAP32[$504>>2] = $348;
          HEAP32[$499>>2] = $348;
          $$sum8$i = (($246) + 8)|0;
          $505 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$505>>2] = $500;
          $$sum9$i = (($246) + 12)|0;
          $506 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$506>>2] = $T$0$lcssa$i;
          $$sum10$i = (($246) + 24)|0;
          $507 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$507>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $508 = ((($v$3$lcssa$i)) + 8|0);
       $mem$0 = $508;
       return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[(4796)>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[(4808)>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[(4808)>>2] = $514;
   HEAP32[(4796)>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = ((($512)) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[(4796)>>2] = 0;
   HEAP32[(4808)>>2] = 0;
   $520 = $509 | 3;
   $521 = ((($512)) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = ((($512)) + 8|0);
  $mem$0 = $525;
  return ($mem$0|0);
 }
 $526 = HEAP32[(4800)>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[(4800)>>2] = $528;
  $529 = HEAP32[(4812)>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[(4812)>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = ((($529)) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = ((($529)) + 8|0);
  $mem$0 = $535;
  return ($mem$0|0);
 }
 $536 = HEAP32[5260>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[(5268)>>2] = $538;
    HEAP32[(5264)>>2] = $538;
    HEAP32[(5272)>>2] = -1;
    HEAP32[(5276)>>2] = -1;
    HEAP32[(5280)>>2] = 0;
    HEAP32[(5232)>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[5260>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[(5268)>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  return ($mem$0|0);
 }
 $552 = HEAP32[(5228)>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[(5220)>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   return ($mem$0|0);
  }
 }
 $558 = HEAP32[(5232)>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L258: do {
  if ($560) {
   $561 = HEAP32[(4812)>>2]|0;
   $562 = ($561|0)==(0|0);
   L260: do {
    if ($562) {
     label = 174;
    } else {
     $sp$0$i$i = (5236);
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = ((($sp$0$i$i)) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        $$lcssa228 = $sp$0$i$i;$$lcssa230 = $565;
        break;
       }
      }
      $569 = ((($sp$0$i$i)) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 174;
       break L260;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $594 = HEAP32[(4800)>>2]|0;
     $595 = (($548) - ($594))|0;
     $596 = $595 & $549;
     $597 = ($596>>>0)<(2147483647);
     if ($597) {
      $598 = (_sbrk(($596|0))|0);
      $599 = HEAP32[$$lcssa228>>2]|0;
      $600 = HEAP32[$$lcssa230>>2]|0;
      $601 = (($599) + ($600)|0);
      $602 = ($598|0)==($601|0);
      $$3$i = $602 ? $596 : 0;
      if ($602) {
       $603 = ($598|0)==((-1)|0);
       if ($603) {
        $tsize$0323944$i = $$3$i;
       } else {
        $tbase$255$i = $598;$tsize$254$i = $$3$i;
        label = 194;
        break L258;
       }
      } else {
       $br$0$ph$i = $598;$ssize$1$ph$i = $596;$tsize$0$ph$i = $$3$i;
       label = 184;
      }
     } else {
      $tsize$0323944$i = 0;
     }
    }
   } while(0);
   do {
    if ((label|0) == 174) {
     $572 = (_sbrk(0)|0);
     $573 = ($572|0)==((-1)|0);
     if ($573) {
      $tsize$0323944$i = 0;
     } else {
      $574 = $572;
      $575 = HEAP32[(5264)>>2]|0;
      $576 = (($575) + -1)|0;
      $577 = $576 & $574;
      $578 = ($577|0)==(0);
      if ($578) {
       $ssize$0$i = $550;
      } else {
       $579 = (($576) + ($574))|0;
       $580 = (0 - ($575))|0;
       $581 = $579 & $580;
       $582 = (($550) - ($574))|0;
       $583 = (($582) + ($581))|0;
       $ssize$0$i = $583;
      }
      $584 = HEAP32[(5220)>>2]|0;
      $585 = (($584) + ($ssize$0$i))|0;
      $586 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $587 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i30 = $586 & $587;
      if ($or$cond$i30) {
       $588 = HEAP32[(5228)>>2]|0;
       $589 = ($588|0)==(0);
       if (!($589)) {
        $590 = ($585>>>0)<=($584>>>0);
        $591 = ($585>>>0)>($588>>>0);
        $or$cond2$i = $590 | $591;
        if ($or$cond2$i) {
         $tsize$0323944$i = 0;
         break;
        }
       }
       $592 = (_sbrk(($ssize$0$i|0))|0);
       $593 = ($592|0)==($572|0);
       $ssize$0$$i = $593 ? $ssize$0$i : 0;
       if ($593) {
        $tbase$255$i = $572;$tsize$254$i = $ssize$0$$i;
        label = 194;
        break L258;
       } else {
        $br$0$ph$i = $592;$ssize$1$ph$i = $ssize$0$i;$tsize$0$ph$i = $ssize$0$$i;
        label = 184;
       }
      } else {
       $tsize$0323944$i = 0;
      }
     }
    }
   } while(0);
   L280: do {
    if ((label|0) == 184) {
     $604 = (0 - ($ssize$1$ph$i))|0;
     $605 = ($br$0$ph$i|0)!=((-1)|0);
     $606 = ($ssize$1$ph$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $605;
     $607 = ($545>>>0)>($ssize$1$ph$i>>>0);
     $or$cond6$i = $607 & $or$cond5$i;
     do {
      if ($or$cond6$i) {
       $608 = HEAP32[(5268)>>2]|0;
       $609 = (($547) - ($ssize$1$ph$i))|0;
       $610 = (($609) + ($608))|0;
       $611 = (0 - ($608))|0;
       $612 = $610 & $611;
       $613 = ($612>>>0)<(2147483647);
       if ($613) {
        $614 = (_sbrk(($612|0))|0);
        $615 = ($614|0)==((-1)|0);
        if ($615) {
         (_sbrk(($604|0))|0);
         $tsize$0323944$i = $tsize$0$ph$i;
         break L280;
        } else {
         $616 = (($612) + ($ssize$1$ph$i))|0;
         $ssize$2$i = $616;
         break;
        }
       } else {
        $ssize$2$i = $ssize$1$ph$i;
       }
      } else {
       $ssize$2$i = $ssize$1$ph$i;
      }
     } while(0);
     $617 = ($br$0$ph$i|0)==((-1)|0);
     if ($617) {
      $tsize$0323944$i = $tsize$0$ph$i;
     } else {
      $tbase$255$i = $br$0$ph$i;$tsize$254$i = $ssize$2$i;
      label = 194;
      break L258;
     }
    }
   } while(0);
   $618 = HEAP32[(5232)>>2]|0;
   $619 = $618 | 4;
   HEAP32[(5232)>>2] = $619;
   $tsize$1$i = $tsize$0323944$i;
   label = 191;
  } else {
   $tsize$1$i = 0;
   label = 191;
  }
 } while(0);
 if ((label|0) == 191) {
  $620 = ($550>>>0)<(2147483647);
  if ($620) {
   $621 = (_sbrk(($550|0))|0);
   $622 = (_sbrk(0)|0);
   $623 = ($621|0)!=((-1)|0);
   $624 = ($622|0)!=((-1)|0);
   $or$cond3$i = $623 & $624;
   $625 = ($621>>>0)<($622>>>0);
   $or$cond8$i = $625 & $or$cond3$i;
   if ($or$cond8$i) {
    $626 = $622;
    $627 = $621;
    $628 = (($626) - ($627))|0;
    $629 = (($nb$0) + 40)|0;
    $630 = ($628>>>0)>($629>>>0);
    $$tsize$1$i = $630 ? $628 : $tsize$1$i;
    if ($630) {
     $tbase$255$i = $621;$tsize$254$i = $$tsize$1$i;
     label = 194;
    }
   }
  }
 }
 if ((label|0) == 194) {
  $631 = HEAP32[(5220)>>2]|0;
  $632 = (($631) + ($tsize$254$i))|0;
  HEAP32[(5220)>>2] = $632;
  $633 = HEAP32[(5224)>>2]|0;
  $634 = ($632>>>0)>($633>>>0);
  if ($634) {
   HEAP32[(5224)>>2] = $632;
  }
  $635 = HEAP32[(4812)>>2]|0;
  $636 = ($635|0)==(0|0);
  L299: do {
   if ($636) {
    $637 = HEAP32[(4804)>>2]|0;
    $638 = ($637|0)==(0|0);
    $639 = ($tbase$255$i>>>0)<($637>>>0);
    $or$cond9$i = $638 | $639;
    if ($or$cond9$i) {
     HEAP32[(4804)>>2] = $tbase$255$i;
    }
    HEAP32[(5236)>>2] = $tbase$255$i;
    HEAP32[(5240)>>2] = $tsize$254$i;
    HEAP32[(5248)>>2] = 0;
    $640 = HEAP32[5260>>2]|0;
    HEAP32[(4824)>>2] = $640;
    HEAP32[(4820)>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $641 = $i$02$i$i << 1;
     $642 = (4828 + ($641<<2)|0);
     $$sum$i$i = (($641) + 3)|0;
     $643 = (4828 + ($$sum$i$i<<2)|0);
     HEAP32[$643>>2] = $642;
     $$sum1$i$i = (($641) + 2)|0;
     $644 = (4828 + ($$sum1$i$i<<2)|0);
     HEAP32[$644>>2] = $642;
     $645 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($645|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $645;
     }
    }
    $646 = (($tsize$254$i) + -40)|0;
    $647 = ((($tbase$255$i)) + 8|0);
    $648 = $647;
    $649 = $648 & 7;
    $650 = ($649|0)==(0);
    $651 = (0 - ($648))|0;
    $652 = $651 & 7;
    $653 = $650 ? 0 : $652;
    $654 = (($tbase$255$i) + ($653)|0);
    $655 = (($646) - ($653))|0;
    HEAP32[(4812)>>2] = $654;
    HEAP32[(4800)>>2] = $655;
    $656 = $655 | 1;
    $$sum$i13$i = (($653) + 4)|0;
    $657 = (($tbase$255$i) + ($$sum$i13$i)|0);
    HEAP32[$657>>2] = $656;
    $$sum2$i$i = (($tsize$254$i) + -36)|0;
    $658 = (($tbase$255$i) + ($$sum2$i$i)|0);
    HEAP32[$658>>2] = 40;
    $659 = HEAP32[(5276)>>2]|0;
    HEAP32[(4816)>>2] = $659;
   } else {
    $sp$084$i = (5236);
    while(1) {
     $660 = HEAP32[$sp$084$i>>2]|0;
     $661 = ((($sp$084$i)) + 4|0);
     $662 = HEAP32[$661>>2]|0;
     $663 = (($660) + ($662)|0);
     $664 = ($tbase$255$i|0)==($663|0);
     if ($664) {
      $$lcssa222 = $660;$$lcssa224 = $661;$$lcssa226 = $662;$sp$084$i$lcssa = $sp$084$i;
      label = 204;
      break;
     }
     $665 = ((($sp$084$i)) + 8|0);
     $666 = HEAP32[$665>>2]|0;
     $667 = ($666|0)==(0|0);
     if ($667) {
      break;
     } else {
      $sp$084$i = $666;
     }
    }
    if ((label|0) == 204) {
     $668 = ((($sp$084$i$lcssa)) + 12|0);
     $669 = HEAP32[$668>>2]|0;
     $670 = $669 & 8;
     $671 = ($670|0)==(0);
     if ($671) {
      $672 = ($635>>>0)>=($$lcssa222>>>0);
      $673 = ($635>>>0)<($tbase$255$i>>>0);
      $or$cond57$i = $673 & $672;
      if ($or$cond57$i) {
       $674 = (($$lcssa226) + ($tsize$254$i))|0;
       HEAP32[$$lcssa224>>2] = $674;
       $675 = HEAP32[(4800)>>2]|0;
       $676 = (($675) + ($tsize$254$i))|0;
       $677 = ((($635)) + 8|0);
       $678 = $677;
       $679 = $678 & 7;
       $680 = ($679|0)==(0);
       $681 = (0 - ($678))|0;
       $682 = $681 & 7;
       $683 = $680 ? 0 : $682;
       $684 = (($635) + ($683)|0);
       $685 = (($676) - ($683))|0;
       HEAP32[(4812)>>2] = $684;
       HEAP32[(4800)>>2] = $685;
       $686 = $685 | 1;
       $$sum$i17$i = (($683) + 4)|0;
       $687 = (($635) + ($$sum$i17$i)|0);
       HEAP32[$687>>2] = $686;
       $$sum2$i18$i = (($676) + 4)|0;
       $688 = (($635) + ($$sum2$i18$i)|0);
       HEAP32[$688>>2] = 40;
       $689 = HEAP32[(5276)>>2]|0;
       HEAP32[(4816)>>2] = $689;
       break;
      }
     }
    }
    $690 = HEAP32[(4804)>>2]|0;
    $691 = ($tbase$255$i>>>0)<($690>>>0);
    if ($691) {
     HEAP32[(4804)>>2] = $tbase$255$i;
     $755 = $tbase$255$i;
    } else {
     $755 = $690;
    }
    $692 = (($tbase$255$i) + ($tsize$254$i)|0);
    $sp$183$i = (5236);
    while(1) {
     $693 = HEAP32[$sp$183$i>>2]|0;
     $694 = ($693|0)==($692|0);
     if ($694) {
      $$lcssa219 = $sp$183$i;$sp$183$i$lcssa = $sp$183$i;
      label = 212;
      break;
     }
     $695 = ((($sp$183$i)) + 8|0);
     $696 = HEAP32[$695>>2]|0;
     $697 = ($696|0)==(0|0);
     if ($697) {
      $sp$0$i$i$i = (5236);
      break;
     } else {
      $sp$183$i = $696;
     }
    }
    if ((label|0) == 212) {
     $698 = ((($sp$183$i$lcssa)) + 12|0);
     $699 = HEAP32[$698>>2]|0;
     $700 = $699 & 8;
     $701 = ($700|0)==(0);
     if ($701) {
      HEAP32[$$lcssa219>>2] = $tbase$255$i;
      $702 = ((($sp$183$i$lcssa)) + 4|0);
      $703 = HEAP32[$702>>2]|0;
      $704 = (($703) + ($tsize$254$i))|0;
      HEAP32[$702>>2] = $704;
      $705 = ((($tbase$255$i)) + 8|0);
      $706 = $705;
      $707 = $706 & 7;
      $708 = ($707|0)==(0);
      $709 = (0 - ($706))|0;
      $710 = $709 & 7;
      $711 = $708 ? 0 : $710;
      $712 = (($tbase$255$i) + ($711)|0);
      $$sum112$i = (($tsize$254$i) + 8)|0;
      $713 = (($tbase$255$i) + ($$sum112$i)|0);
      $714 = $713;
      $715 = $714 & 7;
      $716 = ($715|0)==(0);
      $717 = (0 - ($714))|0;
      $718 = $717 & 7;
      $719 = $716 ? 0 : $718;
      $$sum113$i = (($719) + ($tsize$254$i))|0;
      $720 = (($tbase$255$i) + ($$sum113$i)|0);
      $721 = $720;
      $722 = $712;
      $723 = (($721) - ($722))|0;
      $$sum$i19$i = (($711) + ($nb$0))|0;
      $724 = (($tbase$255$i) + ($$sum$i19$i)|0);
      $725 = (($723) - ($nb$0))|0;
      $726 = $nb$0 | 3;
      $$sum1$i20$i = (($711) + 4)|0;
      $727 = (($tbase$255$i) + ($$sum1$i20$i)|0);
      HEAP32[$727>>2] = $726;
      $728 = ($720|0)==($635|0);
      L324: do {
       if ($728) {
        $729 = HEAP32[(4800)>>2]|0;
        $730 = (($729) + ($725))|0;
        HEAP32[(4800)>>2] = $730;
        HEAP32[(4812)>>2] = $724;
        $731 = $730 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $732 = (($tbase$255$i) + ($$sum42$i$i)|0);
        HEAP32[$732>>2] = $731;
       } else {
        $733 = HEAP32[(4808)>>2]|0;
        $734 = ($720|0)==($733|0);
        if ($734) {
         $735 = HEAP32[(4796)>>2]|0;
         $736 = (($735) + ($725))|0;
         HEAP32[(4796)>>2] = $736;
         HEAP32[(4808)>>2] = $724;
         $737 = $736 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $738 = (($tbase$255$i) + ($$sum40$i$i)|0);
         HEAP32[$738>>2] = $737;
         $$sum41$i$i = (($736) + ($$sum$i19$i))|0;
         $739 = (($tbase$255$i) + ($$sum41$i$i)|0);
         HEAP32[$739>>2] = $736;
         break;
        }
        $$sum2$i21$i = (($tsize$254$i) + 4)|0;
        $$sum114$i = (($$sum2$i21$i) + ($719))|0;
        $740 = (($tbase$255$i) + ($$sum114$i)|0);
        $741 = HEAP32[$740>>2]|0;
        $742 = $741 & 3;
        $743 = ($742|0)==(1);
        if ($743) {
         $744 = $741 & -8;
         $745 = $741 >>> 3;
         $746 = ($741>>>0)<(256);
         L332: do {
          if ($746) {
           $$sum3738$i$i = $719 | 8;
           $$sum124$i = (($$sum3738$i$i) + ($tsize$254$i))|0;
           $747 = (($tbase$255$i) + ($$sum124$i)|0);
           $748 = HEAP32[$747>>2]|0;
           $$sum39$i$i = (($tsize$254$i) + 12)|0;
           $$sum125$i = (($$sum39$i$i) + ($719))|0;
           $749 = (($tbase$255$i) + ($$sum125$i)|0);
           $750 = HEAP32[$749>>2]|0;
           $751 = $745 << 1;
           $752 = (4828 + ($751<<2)|0);
           $753 = ($748|0)==($752|0);
           do {
            if (!($753)) {
             $754 = ($748>>>0)<($755>>>0);
             if ($754) {
              _abort();
              // unreachable;
             }
             $756 = ((($748)) + 12|0);
             $757 = HEAP32[$756>>2]|0;
             $758 = ($757|0)==($720|0);
             if ($758) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $759 = ($750|0)==($748|0);
           if ($759) {
            $760 = 1 << $745;
            $761 = $760 ^ -1;
            $762 = HEAP32[4788>>2]|0;
            $763 = $762 & $761;
            HEAP32[4788>>2] = $763;
            break;
           }
           $764 = ($750|0)==($752|0);
           do {
            if ($764) {
             $$pre57$i$i = ((($750)) + 8|0);
             $$pre$phi58$i$iZ2D = $$pre57$i$i;
            } else {
             $765 = ($750>>>0)<($755>>>0);
             if ($765) {
              _abort();
              // unreachable;
             }
             $766 = ((($750)) + 8|0);
             $767 = HEAP32[$766>>2]|0;
             $768 = ($767|0)==($720|0);
             if ($768) {
              $$pre$phi58$i$iZ2D = $766;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $769 = ((($748)) + 12|0);
           HEAP32[$769>>2] = $750;
           HEAP32[$$pre$phi58$i$iZ2D>>2] = $748;
          } else {
           $$sum34$i$i = $719 | 24;
           $$sum115$i = (($$sum34$i$i) + ($tsize$254$i))|0;
           $770 = (($tbase$255$i) + ($$sum115$i)|0);
           $771 = HEAP32[$770>>2]|0;
           $$sum5$i$i = (($tsize$254$i) + 12)|0;
           $$sum116$i = (($$sum5$i$i) + ($719))|0;
           $772 = (($tbase$255$i) + ($$sum116$i)|0);
           $773 = HEAP32[$772>>2]|0;
           $774 = ($773|0)==($720|0);
           do {
            if ($774) {
             $$sum67$i$i = $719 | 16;
             $$sum122$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $784 = (($tbase$255$i) + ($$sum122$i)|0);
             $785 = HEAP32[$784>>2]|0;
             $786 = ($785|0)==(0|0);
             if ($786) {
              $$sum123$i = (($$sum67$i$i) + ($tsize$254$i))|0;
              $787 = (($tbase$255$i) + ($$sum123$i)|0);
              $788 = HEAP32[$787>>2]|0;
              $789 = ($788|0)==(0|0);
              if ($789) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $788;$RP$0$i$i = $787;
              }
             } else {
              $R$0$i$i = $785;$RP$0$i$i = $784;
             }
             while(1) {
              $790 = ((($R$0$i$i)) + 20|0);
              $791 = HEAP32[$790>>2]|0;
              $792 = ($791|0)==(0|0);
              if (!($792)) {
               $R$0$i$i = $791;$RP$0$i$i = $790;
               continue;
              }
              $793 = ((($R$0$i$i)) + 16|0);
              $794 = HEAP32[$793>>2]|0;
              $795 = ($794|0)==(0|0);
              if ($795) {
               $R$0$i$i$lcssa = $R$0$i$i;$RP$0$i$i$lcssa = $RP$0$i$i;
               break;
              } else {
               $R$0$i$i = $794;$RP$0$i$i = $793;
              }
             }
             $796 = ($RP$0$i$i$lcssa>>>0)<($755>>>0);
             if ($796) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i$lcssa>>2] = 0;
              $R$1$i$i = $R$0$i$i$lcssa;
              break;
             }
            } else {
             $$sum3536$i$i = $719 | 8;
             $$sum117$i = (($$sum3536$i$i) + ($tsize$254$i))|0;
             $775 = (($tbase$255$i) + ($$sum117$i)|0);
             $776 = HEAP32[$775>>2]|0;
             $777 = ($776>>>0)<($755>>>0);
             if ($777) {
              _abort();
              // unreachable;
             }
             $778 = ((($776)) + 12|0);
             $779 = HEAP32[$778>>2]|0;
             $780 = ($779|0)==($720|0);
             if (!($780)) {
              _abort();
              // unreachable;
             }
             $781 = ((($773)) + 8|0);
             $782 = HEAP32[$781>>2]|0;
             $783 = ($782|0)==($720|0);
             if ($783) {
              HEAP32[$778>>2] = $773;
              HEAP32[$781>>2] = $776;
              $R$1$i$i = $773;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $797 = ($771|0)==(0|0);
           if ($797) {
            break;
           }
           $$sum30$i$i = (($tsize$254$i) + 28)|0;
           $$sum118$i = (($$sum30$i$i) + ($719))|0;
           $798 = (($tbase$255$i) + ($$sum118$i)|0);
           $799 = HEAP32[$798>>2]|0;
           $800 = (5092 + ($799<<2)|0);
           $801 = HEAP32[$800>>2]|0;
           $802 = ($720|0)==($801|0);
           do {
            if ($802) {
             HEAP32[$800>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $803 = 1 << $799;
             $804 = $803 ^ -1;
             $805 = HEAP32[(4792)>>2]|0;
             $806 = $805 & $804;
             HEAP32[(4792)>>2] = $806;
             break L332;
            } else {
             $807 = HEAP32[(4804)>>2]|0;
             $808 = ($771>>>0)<($807>>>0);
             if ($808) {
              _abort();
              // unreachable;
             }
             $809 = ((($771)) + 16|0);
             $810 = HEAP32[$809>>2]|0;
             $811 = ($810|0)==($720|0);
             if ($811) {
              HEAP32[$809>>2] = $R$1$i$i;
             } else {
              $812 = ((($771)) + 20|0);
              HEAP32[$812>>2] = $R$1$i$i;
             }
             $813 = ($R$1$i$i|0)==(0|0);
             if ($813) {
              break L332;
             }
            }
           } while(0);
           $814 = HEAP32[(4804)>>2]|0;
           $815 = ($R$1$i$i>>>0)<($814>>>0);
           if ($815) {
            _abort();
            // unreachable;
           }
           $816 = ((($R$1$i$i)) + 24|0);
           HEAP32[$816>>2] = $771;
           $$sum3132$i$i = $719 | 16;
           $$sum119$i = (($$sum3132$i$i) + ($tsize$254$i))|0;
           $817 = (($tbase$255$i) + ($$sum119$i)|0);
           $818 = HEAP32[$817>>2]|0;
           $819 = ($818|0)==(0|0);
           do {
            if (!($819)) {
             $820 = ($818>>>0)<($814>>>0);
             if ($820) {
              _abort();
              // unreachable;
             } else {
              $821 = ((($R$1$i$i)) + 16|0);
              HEAP32[$821>>2] = $818;
              $822 = ((($818)) + 24|0);
              HEAP32[$822>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum120$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $823 = (($tbase$255$i) + ($$sum120$i)|0);
           $824 = HEAP32[$823>>2]|0;
           $825 = ($824|0)==(0|0);
           if ($825) {
            break;
           }
           $826 = HEAP32[(4804)>>2]|0;
           $827 = ($824>>>0)<($826>>>0);
           if ($827) {
            _abort();
            // unreachable;
           } else {
            $828 = ((($R$1$i$i)) + 20|0);
            HEAP32[$828>>2] = $824;
            $829 = ((($824)) + 24|0);
            HEAP32[$829>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $744 | $719;
         $$sum121$i = (($$sum9$i$i) + ($tsize$254$i))|0;
         $830 = (($tbase$255$i) + ($$sum121$i)|0);
         $831 = (($744) + ($725))|0;
         $oldfirst$0$i$i = $830;$qsize$0$i$i = $831;
        } else {
         $oldfirst$0$i$i = $720;$qsize$0$i$i = $725;
        }
        $832 = ((($oldfirst$0$i$i)) + 4|0);
        $833 = HEAP32[$832>>2]|0;
        $834 = $833 & -2;
        HEAP32[$832>>2] = $834;
        $835 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $836 = (($tbase$255$i) + ($$sum10$i$i)|0);
        HEAP32[$836>>2] = $835;
        $$sum11$i$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $837 = (($tbase$255$i) + ($$sum11$i$i)|0);
        HEAP32[$837>>2] = $qsize$0$i$i;
        $838 = $qsize$0$i$i >>> 3;
        $839 = ($qsize$0$i$i>>>0)<(256);
        if ($839) {
         $840 = $838 << 1;
         $841 = (4828 + ($840<<2)|0);
         $842 = HEAP32[4788>>2]|0;
         $843 = 1 << $838;
         $844 = $842 & $843;
         $845 = ($844|0)==(0);
         do {
          if ($845) {
           $846 = $842 | $843;
           HEAP32[4788>>2] = $846;
           $$pre$i22$i = (($840) + 2)|0;
           $$pre56$i$i = (4828 + ($$pre$i22$i<<2)|0);
           $$pre$phi$i23$iZ2D = $$pre56$i$i;$F4$0$i$i = $841;
          } else {
           $$sum29$i$i = (($840) + 2)|0;
           $847 = (4828 + ($$sum29$i$i<<2)|0);
           $848 = HEAP32[$847>>2]|0;
           $849 = HEAP32[(4804)>>2]|0;
           $850 = ($848>>>0)<($849>>>0);
           if (!($850)) {
            $$pre$phi$i23$iZ2D = $847;$F4$0$i$i = $848;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i23$iZ2D>>2] = $724;
         $851 = ((($F4$0$i$i)) + 12|0);
         HEAP32[$851>>2] = $724;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $852 = (($tbase$255$i) + ($$sum27$i$i)|0);
         HEAP32[$852>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $853 = (($tbase$255$i) + ($$sum28$i$i)|0);
         HEAP32[$853>>2] = $841;
         break;
        }
        $854 = $qsize$0$i$i >>> 8;
        $855 = ($854|0)==(0);
        do {
         if ($855) {
          $I7$0$i$i = 0;
         } else {
          $856 = ($qsize$0$i$i>>>0)>(16777215);
          if ($856) {
           $I7$0$i$i = 31;
           break;
          }
          $857 = (($854) + 1048320)|0;
          $858 = $857 >>> 16;
          $859 = $858 & 8;
          $860 = $854 << $859;
          $861 = (($860) + 520192)|0;
          $862 = $861 >>> 16;
          $863 = $862 & 4;
          $864 = $863 | $859;
          $865 = $860 << $863;
          $866 = (($865) + 245760)|0;
          $867 = $866 >>> 16;
          $868 = $867 & 2;
          $869 = $864 | $868;
          $870 = (14 - ($869))|0;
          $871 = $865 << $868;
          $872 = $871 >>> 15;
          $873 = (($870) + ($872))|0;
          $874 = $873 << 1;
          $875 = (($873) + 7)|0;
          $876 = $qsize$0$i$i >>> $875;
          $877 = $876 & 1;
          $878 = $877 | $874;
          $I7$0$i$i = $878;
         }
        } while(0);
        $879 = (5092 + ($I7$0$i$i<<2)|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $880 = (($tbase$255$i) + ($$sum12$i$i)|0);
        HEAP32[$880>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $881 = (($tbase$255$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $882 = (($tbase$255$i) + ($$sum14$i$i)|0);
        HEAP32[$882>>2] = 0;
        HEAP32[$881>>2] = 0;
        $883 = HEAP32[(4792)>>2]|0;
        $884 = 1 << $I7$0$i$i;
        $885 = $883 & $884;
        $886 = ($885|0)==(0);
        if ($886) {
         $887 = $883 | $884;
         HEAP32[(4792)>>2] = $887;
         HEAP32[$879>>2] = $724;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $888 = (($tbase$255$i) + ($$sum15$i$i)|0);
         HEAP32[$888>>2] = $879;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $889 = (($tbase$255$i) + ($$sum16$i$i)|0);
         HEAP32[$889>>2] = $724;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $890 = (($tbase$255$i) + ($$sum17$i$i)|0);
         HEAP32[$890>>2] = $724;
         break;
        }
        $891 = HEAP32[$879>>2]|0;
        $892 = ((($891)) + 4|0);
        $893 = HEAP32[$892>>2]|0;
        $894 = $893 & -8;
        $895 = ($894|0)==($qsize$0$i$i|0);
        L418: do {
         if ($895) {
          $T$0$lcssa$i25$i = $891;
         } else {
          $896 = ($I7$0$i$i|0)==(31);
          $897 = $I7$0$i$i >>> 1;
          $898 = (25 - ($897))|0;
          $899 = $896 ? 0 : $898;
          $900 = $qsize$0$i$i << $899;
          $K8$051$i$i = $900;$T$050$i$i = $891;
          while(1) {
           $907 = $K8$051$i$i >>> 31;
           $908 = (((($T$050$i$i)) + 16|0) + ($907<<2)|0);
           $903 = HEAP32[$908>>2]|0;
           $909 = ($903|0)==(0|0);
           if ($909) {
            $$lcssa = $908;$T$050$i$i$lcssa = $T$050$i$i;
            break;
           }
           $901 = $K8$051$i$i << 1;
           $902 = ((($903)) + 4|0);
           $904 = HEAP32[$902>>2]|0;
           $905 = $904 & -8;
           $906 = ($905|0)==($qsize$0$i$i|0);
           if ($906) {
            $T$0$lcssa$i25$i = $903;
            break L418;
           } else {
            $K8$051$i$i = $901;$T$050$i$i = $903;
           }
          }
          $910 = HEAP32[(4804)>>2]|0;
          $911 = ($$lcssa>>>0)<($910>>>0);
          if ($911) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$$lcssa>>2] = $724;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $912 = (($tbase$255$i) + ($$sum23$i$i)|0);
           HEAP32[$912>>2] = $T$050$i$i$lcssa;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $913 = (($tbase$255$i) + ($$sum24$i$i)|0);
           HEAP32[$913>>2] = $724;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $914 = (($tbase$255$i) + ($$sum25$i$i)|0);
           HEAP32[$914>>2] = $724;
           break L324;
          }
         }
        } while(0);
        $915 = ((($T$0$lcssa$i25$i)) + 8|0);
        $916 = HEAP32[$915>>2]|0;
        $917 = HEAP32[(4804)>>2]|0;
        $918 = ($916>>>0)>=($917>>>0);
        $not$$i26$i = ($T$0$lcssa$i25$i>>>0)>=($917>>>0);
        $919 = $918 & $not$$i26$i;
        if ($919) {
         $920 = ((($916)) + 12|0);
         HEAP32[$920>>2] = $724;
         HEAP32[$915>>2] = $724;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $921 = (($tbase$255$i) + ($$sum20$i$i)|0);
         HEAP32[$921>>2] = $916;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $922 = (($tbase$255$i) + ($$sum21$i$i)|0);
         HEAP32[$922>>2] = $T$0$lcssa$i25$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $923 = (($tbase$255$i) + ($$sum22$i$i)|0);
         HEAP32[$923>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $711 | 8;
      $924 = (($tbase$255$i) + ($$sum1819$i$i)|0);
      $mem$0 = $924;
      return ($mem$0|0);
     } else {
      $sp$0$i$i$i = (5236);
     }
    }
    while(1) {
     $925 = HEAP32[$sp$0$i$i$i>>2]|0;
     $926 = ($925>>>0)>($635>>>0);
     if (!($926)) {
      $927 = ((($sp$0$i$i$i)) + 4|0);
      $928 = HEAP32[$927>>2]|0;
      $929 = (($925) + ($928)|0);
      $930 = ($929>>>0)>($635>>>0);
      if ($930) {
       $$lcssa215 = $925;$$lcssa216 = $928;$$lcssa217 = $929;
       break;
      }
     }
     $931 = ((($sp$0$i$i$i)) + 8|0);
     $932 = HEAP32[$931>>2]|0;
     $sp$0$i$i$i = $932;
    }
    $$sum$i14$i = (($$lcssa216) + -47)|0;
    $$sum1$i15$i = (($$lcssa216) + -39)|0;
    $933 = (($$lcssa215) + ($$sum1$i15$i)|0);
    $934 = $933;
    $935 = $934 & 7;
    $936 = ($935|0)==(0);
    $937 = (0 - ($934))|0;
    $938 = $937 & 7;
    $939 = $936 ? 0 : $938;
    $$sum2$i16$i = (($$sum$i14$i) + ($939))|0;
    $940 = (($$lcssa215) + ($$sum2$i16$i)|0);
    $941 = ((($635)) + 16|0);
    $942 = ($940>>>0)<($941>>>0);
    $943 = $942 ? $635 : $940;
    $944 = ((($943)) + 8|0);
    $945 = (($tsize$254$i) + -40)|0;
    $946 = ((($tbase$255$i)) + 8|0);
    $947 = $946;
    $948 = $947 & 7;
    $949 = ($948|0)==(0);
    $950 = (0 - ($947))|0;
    $951 = $950 & 7;
    $952 = $949 ? 0 : $951;
    $953 = (($tbase$255$i) + ($952)|0);
    $954 = (($945) - ($952))|0;
    HEAP32[(4812)>>2] = $953;
    HEAP32[(4800)>>2] = $954;
    $955 = $954 | 1;
    $$sum$i$i$i = (($952) + 4)|0;
    $956 = (($tbase$255$i) + ($$sum$i$i$i)|0);
    HEAP32[$956>>2] = $955;
    $$sum2$i$i$i = (($tsize$254$i) + -36)|0;
    $957 = (($tbase$255$i) + ($$sum2$i$i$i)|0);
    HEAP32[$957>>2] = 40;
    $958 = HEAP32[(5276)>>2]|0;
    HEAP32[(4816)>>2] = $958;
    $959 = ((($943)) + 4|0);
    HEAP32[$959>>2] = 27;
    ;HEAP32[$944>>2]=HEAP32[(5236)>>2]|0;HEAP32[$944+4>>2]=HEAP32[(5236)+4>>2]|0;HEAP32[$944+8>>2]=HEAP32[(5236)+8>>2]|0;HEAP32[$944+12>>2]=HEAP32[(5236)+12>>2]|0;
    HEAP32[(5236)>>2] = $tbase$255$i;
    HEAP32[(5240)>>2] = $tsize$254$i;
    HEAP32[(5248)>>2] = 0;
    HEAP32[(5244)>>2] = $944;
    $960 = ((($943)) + 28|0);
    HEAP32[$960>>2] = 7;
    $961 = ((($943)) + 32|0);
    $962 = ($961>>>0)<($$lcssa217>>>0);
    if ($962) {
     $964 = $960;
     while(1) {
      $963 = ((($964)) + 4|0);
      HEAP32[$963>>2] = 7;
      $965 = ((($964)) + 8|0);
      $966 = ($965>>>0)<($$lcssa217>>>0);
      if ($966) {
       $964 = $963;
      } else {
       break;
      }
     }
    }
    $967 = ($943|0)==($635|0);
    if (!($967)) {
     $968 = $943;
     $969 = $635;
     $970 = (($968) - ($969))|0;
     $971 = HEAP32[$959>>2]|0;
     $972 = $971 & -2;
     HEAP32[$959>>2] = $972;
     $973 = $970 | 1;
     $974 = ((($635)) + 4|0);
     HEAP32[$974>>2] = $973;
     HEAP32[$943>>2] = $970;
     $975 = $970 >>> 3;
     $976 = ($970>>>0)<(256);
     if ($976) {
      $977 = $975 << 1;
      $978 = (4828 + ($977<<2)|0);
      $979 = HEAP32[4788>>2]|0;
      $980 = 1 << $975;
      $981 = $979 & $980;
      $982 = ($981|0)==(0);
      if ($982) {
       $983 = $979 | $980;
       HEAP32[4788>>2] = $983;
       $$pre$i$i = (($977) + 2)|0;
       $$pre14$i$i = (4828 + ($$pre$i$i<<2)|0);
       $$pre$phi$i$iZ2D = $$pre14$i$i;$F$0$i$i = $978;
      } else {
       $$sum4$i$i = (($977) + 2)|0;
       $984 = (4828 + ($$sum4$i$i<<2)|0);
       $985 = HEAP32[$984>>2]|0;
       $986 = HEAP32[(4804)>>2]|0;
       $987 = ($985>>>0)<($986>>>0);
       if ($987) {
        _abort();
        // unreachable;
       } else {
        $$pre$phi$i$iZ2D = $984;$F$0$i$i = $985;
       }
      }
      HEAP32[$$pre$phi$i$iZ2D>>2] = $635;
      $988 = ((($F$0$i$i)) + 12|0);
      HEAP32[$988>>2] = $635;
      $989 = ((($635)) + 8|0);
      HEAP32[$989>>2] = $F$0$i$i;
      $990 = ((($635)) + 12|0);
      HEAP32[$990>>2] = $978;
      break;
     }
     $991 = $970 >>> 8;
     $992 = ($991|0)==(0);
     if ($992) {
      $I1$0$i$i = 0;
     } else {
      $993 = ($970>>>0)>(16777215);
      if ($993) {
       $I1$0$i$i = 31;
      } else {
       $994 = (($991) + 1048320)|0;
       $995 = $994 >>> 16;
       $996 = $995 & 8;
       $997 = $991 << $996;
       $998 = (($997) + 520192)|0;
       $999 = $998 >>> 16;
       $1000 = $999 & 4;
       $1001 = $1000 | $996;
       $1002 = $997 << $1000;
       $1003 = (($1002) + 245760)|0;
       $1004 = $1003 >>> 16;
       $1005 = $1004 & 2;
       $1006 = $1001 | $1005;
       $1007 = (14 - ($1006))|0;
       $1008 = $1002 << $1005;
       $1009 = $1008 >>> 15;
       $1010 = (($1007) + ($1009))|0;
       $1011 = $1010 << 1;
       $1012 = (($1010) + 7)|0;
       $1013 = $970 >>> $1012;
       $1014 = $1013 & 1;
       $1015 = $1014 | $1011;
       $I1$0$i$i = $1015;
      }
     }
     $1016 = (5092 + ($I1$0$i$i<<2)|0);
     $1017 = ((($635)) + 28|0);
     HEAP32[$1017>>2] = $I1$0$i$i;
     $1018 = ((($635)) + 20|0);
     HEAP32[$1018>>2] = 0;
     HEAP32[$941>>2] = 0;
     $1019 = HEAP32[(4792)>>2]|0;
     $1020 = 1 << $I1$0$i$i;
     $1021 = $1019 & $1020;
     $1022 = ($1021|0)==(0);
     if ($1022) {
      $1023 = $1019 | $1020;
      HEAP32[(4792)>>2] = $1023;
      HEAP32[$1016>>2] = $635;
      $1024 = ((($635)) + 24|0);
      HEAP32[$1024>>2] = $1016;
      $1025 = ((($635)) + 12|0);
      HEAP32[$1025>>2] = $635;
      $1026 = ((($635)) + 8|0);
      HEAP32[$1026>>2] = $635;
      break;
     }
     $1027 = HEAP32[$1016>>2]|0;
     $1028 = ((($1027)) + 4|0);
     $1029 = HEAP32[$1028>>2]|0;
     $1030 = $1029 & -8;
     $1031 = ($1030|0)==($970|0);
     L459: do {
      if ($1031) {
       $T$0$lcssa$i$i = $1027;
      } else {
       $1032 = ($I1$0$i$i|0)==(31);
       $1033 = $I1$0$i$i >>> 1;
       $1034 = (25 - ($1033))|0;
       $1035 = $1032 ? 0 : $1034;
       $1036 = $970 << $1035;
       $K2$07$i$i = $1036;$T$06$i$i = $1027;
       while(1) {
        $1043 = $K2$07$i$i >>> 31;
        $1044 = (((($T$06$i$i)) + 16|0) + ($1043<<2)|0);
        $1039 = HEAP32[$1044>>2]|0;
        $1045 = ($1039|0)==(0|0);
        if ($1045) {
         $$lcssa211 = $1044;$T$06$i$i$lcssa = $T$06$i$i;
         break;
        }
        $1037 = $K2$07$i$i << 1;
        $1038 = ((($1039)) + 4|0);
        $1040 = HEAP32[$1038>>2]|0;
        $1041 = $1040 & -8;
        $1042 = ($1041|0)==($970|0);
        if ($1042) {
         $T$0$lcssa$i$i = $1039;
         break L459;
        } else {
         $K2$07$i$i = $1037;$T$06$i$i = $1039;
        }
       }
       $1046 = HEAP32[(4804)>>2]|0;
       $1047 = ($$lcssa211>>>0)<($1046>>>0);
       if ($1047) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$$lcssa211>>2] = $635;
        $1048 = ((($635)) + 24|0);
        HEAP32[$1048>>2] = $T$06$i$i$lcssa;
        $1049 = ((($635)) + 12|0);
        HEAP32[$1049>>2] = $635;
        $1050 = ((($635)) + 8|0);
        HEAP32[$1050>>2] = $635;
        break L299;
       }
      }
     } while(0);
     $1051 = ((($T$0$lcssa$i$i)) + 8|0);
     $1052 = HEAP32[$1051>>2]|0;
     $1053 = HEAP32[(4804)>>2]|0;
     $1054 = ($1052>>>0)>=($1053>>>0);
     $not$$i$i = ($T$0$lcssa$i$i>>>0)>=($1053>>>0);
     $1055 = $1054 & $not$$i$i;
     if ($1055) {
      $1056 = ((($1052)) + 12|0);
      HEAP32[$1056>>2] = $635;
      HEAP32[$1051>>2] = $635;
      $1057 = ((($635)) + 8|0);
      HEAP32[$1057>>2] = $1052;
      $1058 = ((($635)) + 12|0);
      HEAP32[$1058>>2] = $T$0$lcssa$i$i;
      $1059 = ((($635)) + 24|0);
      HEAP32[$1059>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1060 = HEAP32[(4800)>>2]|0;
  $1061 = ($1060>>>0)>($nb$0>>>0);
  if ($1061) {
   $1062 = (($1060) - ($nb$0))|0;
   HEAP32[(4800)>>2] = $1062;
   $1063 = HEAP32[(4812)>>2]|0;
   $1064 = (($1063) + ($nb$0)|0);
   HEAP32[(4812)>>2] = $1064;
   $1065 = $1062 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1066 = (($1063) + ($$sum$i32)|0);
   HEAP32[$1066>>2] = $1065;
   $1067 = $nb$0 | 3;
   $1068 = ((($1063)) + 4|0);
   HEAP32[$1068>>2] = $1067;
   $1069 = ((($1063)) + 8|0);
   $mem$0 = $1069;
   return ($mem$0|0);
  }
 }
 $1070 = (___errno_location()|0);
 HEAP32[$1070>>2] = 12;
 $mem$0 = 0;
 return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$lcssa = 0, $$pre = 0, $$pre$phi59Z2D = 0, $$pre$phi61Z2D = 0, $$pre$phiZ2D = 0, $$pre57 = 0, $$pre58 = 0, $$pre60 = 0, $$sum = 0, $$sum11 = 0, $$sum12 = 0, $$sum13 = 0, $$sum14 = 0, $$sum1718 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum22 = 0, $$sum23 = 0, $$sum24 = 0;
 var $$sum25 = 0, $$sum26 = 0, $$sum27 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0, $$sum31 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0;
 var $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0;
 var $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0;
 var $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0;
 var $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0;
 var $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0;
 var $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0;
 var $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0;
 var $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0;
 var $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0;
 var $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0;
 var $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $K19$052 = 0, $R$0 = 0, $R$0$lcssa = 0, $R$1 = 0;
 var $R7$0 = 0, $R7$0$lcssa = 0, $R7$1 = 0, $RP$0 = 0, $RP$0$lcssa = 0, $RP9$0 = 0, $RP9$0$lcssa = 0, $T$0$lcssa = 0, $T$051 = 0, $T$051$lcssa = 0, $cond = 0, $cond47 = 0, $not$ = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = ((($mem)) + -8|0);
 $2 = HEAP32[(4804)>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = ((($mem)) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[(4808)>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $103 = (($mem) + ($$sum3)|0);
    $104 = HEAP32[$103>>2]|0;
    $105 = $104 & 3;
    $106 = ($105|0)==(3);
    if (!($106)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[(4796)>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum20 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum20)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum30 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum30)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum31 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum31)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = (4828 + ($25<<2)|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = ((($22)) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[4788>>2]|0;
     $36 = $35 & $34;
     HEAP32[4788>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre60 = ((($24)) + 8|0);
     $$pre$phi61Z2D = $$pre60;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = ((($24)) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi61Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = ((($22)) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi61Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum22 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum22)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum23 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum23)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum25 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum25)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum24 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum24)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;$RP$0 = $60;
      }
     } else {
      $R$0 = $58;$RP$0 = $57;
     }
     while(1) {
      $63 = ((($R$0)) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = ((($R$0)) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       $R$0$lcssa = $R$0;$RP$0$lcssa = $RP$0;
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0$lcssa>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0$lcssa>>2] = 0;
      $R$1 = $R$0$lcssa;
      break;
     }
    } else {
     $$sum29 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum29)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = ((($49)) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = ((($46)) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum26 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum26)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = (5092 + ($72<<2)|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[(4792)>>2]|0;
      $79 = $78 & $77;
      HEAP32[(4792)>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[(4804)>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = ((($44)) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = ((($44)) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[(4804)>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = ((($R$1)) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum27 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum27)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = ((($R$1)) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = ((($91)) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum28 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum28)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[(4804)>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = ((($R$1)) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = ((($97)) + 24|0);
      HEAP32[$102>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $110 = ($p$0>>>0)<($9>>>0);
 if (!($110)) {
  _abort();
  // unreachable;
 }
 $$sum19 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum19)|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $112 & 1;
 $114 = ($113|0)==(0);
 if ($114) {
  _abort();
  // unreachable;
 }
 $115 = $112 & 2;
 $116 = ($115|0)==(0);
 if ($116) {
  $117 = HEAP32[(4812)>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[(4800)>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[(4800)>>2] = $120;
   HEAP32[(4812)>>2] = $p$0;
   $121 = $120 | 1;
   $122 = ((($p$0)) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[(4808)>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    return;
   }
   HEAP32[(4808)>>2] = 0;
   HEAP32[(4796)>>2] = 0;
   return;
  }
  $125 = HEAP32[(4808)>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[(4796)>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[(4796)>>2] = $128;
   HEAP32[(4808)>>2] = $p$0;
   $129 = $128 | 1;
   $130 = ((($p$0)) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum1718 = $8 | 4;
    $138 = (($mem) + ($$sum1718)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = (4828 + ($140<<2)|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[(4804)>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = ((($137)) + 12|0);
     $146 = HEAP32[$145>>2]|0;
     $147 = ($146|0)==($9|0);
     if (!($147)) {
      _abort();
      // unreachable;
     }
    }
    $148 = ($139|0)==($137|0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[4788>>2]|0;
     $152 = $151 & $150;
     HEAP32[4788>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre58 = ((($139)) + 8|0);
     $$pre$phi59Z2D = $$pre58;
    } else {
     $154 = HEAP32[(4804)>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = ((($139)) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi59Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = ((($137)) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi59Z2D>>2] = $137;
   } else {
    $$sum5 = (($8) + 16)|0;
    $160 = (($mem) + ($$sum5)|0);
    $161 = HEAP32[$160>>2]|0;
    $$sum67 = $8 | 4;
    $162 = (($mem) + ($$sum67)|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)==($9|0);
    do {
     if ($164) {
      $$sum9 = (($8) + 12)|0;
      $175 = (($mem) + ($$sum9)|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==(0|0);
      if ($177) {
       $$sum8 = (($8) + 8)|0;
       $178 = (($mem) + ($$sum8)|0);
       $179 = HEAP32[$178>>2]|0;
       $180 = ($179|0)==(0|0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $179;$RP9$0 = $178;
       }
      } else {
       $R7$0 = $176;$RP9$0 = $175;
      }
      while(1) {
       $181 = ((($R7$0)) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if (!($183)) {
        $R7$0 = $182;$RP9$0 = $181;
        continue;
       }
       $184 = ((($R7$0)) + 16|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if ($186) {
        $R7$0$lcssa = $R7$0;$RP9$0$lcssa = $RP9$0;
        break;
       } else {
        $R7$0 = $185;$RP9$0 = $184;
       }
      }
      $187 = HEAP32[(4804)>>2]|0;
      $188 = ($RP9$0$lcssa>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0$lcssa>>2] = 0;
       $R7$1 = $R7$0$lcssa;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[(4804)>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = ((($166)) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = ((($163)) + 8|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($9|0);
      if ($174) {
       HEAP32[$169>>2] = $163;
       HEAP32[$172>>2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $189 = ($161|0)==(0|0);
    if (!($189)) {
     $$sum12 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum12)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = (5092 + ($191<<2)|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond47 = ($R7$1|0)==(0|0);
      if ($cond47) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[(4792)>>2]|0;
       $198 = $197 & $196;
       HEAP32[(4792)>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[(4804)>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = ((($161)) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = ((($161)) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[(4804)>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = ((($R7$1)) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum13 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum13)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = ((($R7$1)) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = ((($210)) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum14 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum14)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[(4804)>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = ((($R7$1)) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = ((($216)) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = ((($p$0)) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[(4808)>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[(4796)>>2] = $133;
   return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = ((($p$0)) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = (4828 + ($233<<2)|0);
  $235 = HEAP32[4788>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[4788>>2] = $239;
   $$pre = (($233) + 2)|0;
   $$pre57 = (4828 + ($$pre<<2)|0);
   $$pre$phiZ2D = $$pre57;$F16$0 = $234;
  } else {
   $$sum11 = (($233) + 2)|0;
   $240 = (4828 + ($$sum11<<2)|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[(4804)>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = ((($F16$0)) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = ((($p$0)) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = ((($p$0)) + 12|0);
  HEAP32[$246>>2] = $234;
  return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247|0)==(0);
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = ($psize$1>>>0)>(16777215);
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = (($247) + 1048320)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = (($253) + 520192)|0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = (($258) + 245760)|0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = (14 - ($262))|0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = (($263) + ($265))|0;
   $267 = $266 << 1;
   $268 = (($266) + 7)|0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = (5092 + ($I18$0<<2)|0);
 $273 = ((($p$0)) + 28|0);
 HEAP32[$273>>2] = $I18$0;
 $274 = ((($p$0)) + 16|0);
 $275 = ((($p$0)) + 20|0);
 HEAP32[$275>>2] = 0;
 HEAP32[$274>>2] = 0;
 $276 = HEAP32[(4792)>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L199: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[(4792)>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = ((($p$0)) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = ((($p$0)) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = ((($p$0)) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ((($284)) + 4|0);
   $286 = HEAP32[$285>>2]|0;
   $287 = $286 & -8;
   $288 = ($287|0)==($psize$1|0);
   L202: do {
    if ($288) {
     $T$0$lcssa = $284;
    } else {
     $289 = ($I18$0|0)==(31);
     $290 = $I18$0 >>> 1;
     $291 = (25 - ($290))|0;
     $292 = $289 ? 0 : $291;
     $293 = $psize$1 << $292;
     $K19$052 = $293;$T$051 = $284;
     while(1) {
      $300 = $K19$052 >>> 31;
      $301 = (((($T$051)) + 16|0) + ($300<<2)|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       $$lcssa = $301;$T$051$lcssa = $T$051;
       break;
      }
      $294 = $K19$052 << 1;
      $295 = ((($296)) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $T$0$lcssa = $296;
       break L202;
      } else {
       $K19$052 = $294;$T$051 = $296;
      }
     }
     $303 = HEAP32[(4804)>>2]|0;
     $304 = ($$lcssa>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$$lcssa>>2] = $p$0;
      $305 = ((($p$0)) + 24|0);
      HEAP32[$305>>2] = $T$051$lcssa;
      $306 = ((($p$0)) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = ((($p$0)) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $308 = ((($T$0$lcssa)) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[(4804)>>2]|0;
   $311 = ($309>>>0)>=($310>>>0);
   $not$ = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = $311 & $not$;
   if ($312) {
    $313 = ((($309)) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = ((($p$0)) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = ((($p$0)) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = ((($p$0)) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[(4820)>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[(4820)>>2] = $318;
 $319 = ($318|0)==(0);
 if ($319) {
  $sp$0$in$i = (5244);
 } else {
  return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = ((($sp$0$i)) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[(4820)>>2] = -1;
 return;
}
function _calloc($n_elements,$elem_size) {
 $n_elements = $n_elements|0;
 $elem_size = $elem_size|0;
 var $$ = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $req$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n_elements|0)==(0);
 if ($0) {
  $req$0 = 0;
 } else {
  $1 = Math_imul($elem_size, $n_elements)|0;
  $2 = $elem_size | $n_elements;
  $3 = ($2>>>0)>(65535);
  if ($3) {
   $4 = (($1>>>0) / ($n_elements>>>0))&-1;
   $5 = ($4|0)==($elem_size|0);
   $$ = $5 ? $1 : -1;
   $req$0 = $$;
  } else {
   $req$0 = $1;
  }
 }
 $6 = (_malloc($req$0)|0);
 $7 = ($6|0)==(0|0);
 if ($7) {
  return ($6|0);
 }
 $8 = ((($6)) + -4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = $9 & 3;
 $11 = ($10|0)==(0);
 if ($11) {
  return ($6|0);
 }
 _memset(($6|0),0,($req$0|0))|0;
 return ($6|0);
}
function runPostSets() {
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _memcpy(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}

  
function dynCall_iiii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  return FUNCTION_TABLE_iiii[index&31](a1|0,a2|0,a3|0)|0;
}


function jsCall_iiii_0(a1,a2,a3) {
  a1=a1|0; a2=a2|0; a3=a3|0;
  return jsCall_iiii(0,a1|0,a2|0,a3|0)|0;
}



function jsCall_iiii_1(a1,a2,a3) {
  a1=a1|0; a2=a2|0; a3=a3|0;
  return jsCall_iiii(1,a1|0,a2|0,a3|0)|0;
}



function jsCall_iiii_2(a1,a2,a3) {
  a1=a1|0; a2=a2|0; a3=a3|0;
  return jsCall_iiii(2,a1|0,a2|0,a3|0)|0;
}



function jsCall_iiii_3(a1,a2,a3) {
  a1=a1|0; a2=a2|0; a3=a3|0;
  return jsCall_iiii(3,a1|0,a2|0,a3|0)|0;
}



function jsCall_iiii_4(a1,a2,a3) {
  a1=a1|0; a2=a2|0; a3=a3|0;
  return jsCall_iiii(4,a1|0,a2|0,a3|0)|0;
}



function jsCall_iiii_5(a1,a2,a3) {
  a1=a1|0; a2=a2|0; a3=a3|0;
  return jsCall_iiii(5,a1|0,a2|0,a3|0)|0;
}



function jsCall_iiii_6(a1,a2,a3) {
  a1=a1|0; a2=a2|0; a3=a3|0;
  return jsCall_iiii(6,a1|0,a2|0,a3|0)|0;
}



function jsCall_iiii_7(a1,a2,a3) {
  a1=a1|0; a2=a2|0; a3=a3|0;
  return jsCall_iiii(7,a1|0,a2|0,a3|0)|0;
}



function dynCall_iiiii(index,a1,a2,a3,a4) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  return FUNCTION_TABLE_iiiii[index&31](a1|0,a2|0,a3|0,a4|0)|0;
}


function jsCall_iiiii_0(a1,a2,a3,a4) {
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  return jsCall_iiiii(0,a1|0,a2|0,a3|0,a4|0)|0;
}



function jsCall_iiiii_1(a1,a2,a3,a4) {
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  return jsCall_iiiii(1,a1|0,a2|0,a3|0,a4|0)|0;
}



function jsCall_iiiii_2(a1,a2,a3,a4) {
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  return jsCall_iiiii(2,a1|0,a2|0,a3|0,a4|0)|0;
}



function jsCall_iiiii_3(a1,a2,a3,a4) {
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  return jsCall_iiiii(3,a1|0,a2|0,a3|0,a4|0)|0;
}



function jsCall_iiiii_4(a1,a2,a3,a4) {
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  return jsCall_iiiii(4,a1|0,a2|0,a3|0,a4|0)|0;
}



function jsCall_iiiii_5(a1,a2,a3,a4) {
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  return jsCall_iiiii(5,a1|0,a2|0,a3|0,a4|0)|0;
}



function jsCall_iiiii_6(a1,a2,a3,a4) {
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  return jsCall_iiiii(6,a1|0,a2|0,a3|0,a4|0)|0;
}



function jsCall_iiiii_7(a1,a2,a3,a4) {
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  return jsCall_iiiii(7,a1|0,a2|0,a3|0,a4|0)|0;
}



function dynCall_iii(index,a1,a2) {
  index = index|0;
  a1=a1|0; a2=a2|0;
  return FUNCTION_TABLE_iii[index&31](a1|0,a2|0)|0;
}


function jsCall_iii_0(a1,a2) {
  a1=a1|0; a2=a2|0;
  return jsCall_iii(0,a1|0,a2|0)|0;
}



function jsCall_iii_1(a1,a2) {
  a1=a1|0; a2=a2|0;
  return jsCall_iii(1,a1|0,a2|0)|0;
}



function jsCall_iii_2(a1,a2) {
  a1=a1|0; a2=a2|0;
  return jsCall_iii(2,a1|0,a2|0)|0;
}



function jsCall_iii_3(a1,a2) {
  a1=a1|0; a2=a2|0;
  return jsCall_iii(3,a1|0,a2|0)|0;
}



function jsCall_iii_4(a1,a2) {
  a1=a1|0; a2=a2|0;
  return jsCall_iii(4,a1|0,a2|0)|0;
}



function jsCall_iii_5(a1,a2) {
  a1=a1|0; a2=a2|0;
  return jsCall_iii(5,a1|0,a2|0)|0;
}



function jsCall_iii_6(a1,a2) {
  a1=a1|0; a2=a2|0;
  return jsCall_iii(6,a1|0,a2|0)|0;
}



function jsCall_iii_7(a1,a2) {
  a1=a1|0; a2=a2|0;
  return jsCall_iii(7,a1|0,a2|0)|0;
}


function b1(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(0);return 0;
}
function b2(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(9);return 0;
}
function b3(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(10);return 0;
}
function b4(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(11);return 0;
}
function b5(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(12);return 0;
}
function b6(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(13);return 0;
}
function b7(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(14);return 0;
}
function b8(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(15);return 0;
}
function b9(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(16);return 0;
}
function b10(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(17);return 0;
}
function b11(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(20);return 0;
}
function b12(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(21);return 0;
}
function b13(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(22);return 0;
}
function b14(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(23);return 0;
}
function b15(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(24);return 0;
}
function b16(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(25);return 0;
}
function b17(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(26);return 0;
}
function b18(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(27);return 0;
}
function b19(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(28);return 0;
}
function b20(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(29);return 0;
}
function b21(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(30);return 0;
}
function b22(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(31);return 0;
}
function b24(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(0);return 0;
}
function b25(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(9);return 0;
}
function b26(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(10);return 0;
}
function b27(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(11);return 0;
}
function b28(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(12);return 0;
}
function b29(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(13);return 0;
}
function b30(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(14);return 0;
}
function b31(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(15);return 0;
}
function b32(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(16);return 0;
}
function b33(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(17);return 0;
}
function b34(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(20);return 0;
}
function b35(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(21);return 0;
}
function b36(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(22);return 0;
}
function b37(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(23);return 0;
}
function b38(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(24);return 0;
}
function b39(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(25);return 0;
}
function b40(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(26);return 0;
}
function b41(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(27);return 0;
}
function b42(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(28);return 0;
}
function b43(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(29);return 0;
}
function b44(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(30);return 0;
}
function b45(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(31);return 0;
}
function b47(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(0);return 0;
}
function b48(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(9);return 0;
}
function b49(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(10);return 0;
}
function b50(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(11);return 0;
}
function b51(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(12);return 0;
}
function b52(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(13);return 0;
}
function b53(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(14);return 0;
}
function b54(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(15);return 0;
}
function b55(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(16);return 0;
}
function b56(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(17);return 0;
}
function b57(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(19);return 0;
}
function b58(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(20);return 0;
}
function b59(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(21);return 0;
}
function b60(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(22);return 0;
}
function b61(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(23);return 0;
}
function b62(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(24);return 0;
}
function b63(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(25);return 0;
}
function b64(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(26);return 0;
}
function b65(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(27);return 0;
}
function b66(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(28);return 0;
}
function b67(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(29);return 0;
}
function b68(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(30);return 0;
}
function b69(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(31);return 0;
}

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_iiii = [b1,jsCall_iiii_0,jsCall_iiii_1,jsCall_iiii_2,jsCall_iiii_3,jsCall_iiii_4,jsCall_iiii_5,jsCall_iiii_6,jsCall_iiii_7,b2,b3,b4,b5,b6,b7,b8,b9,b10,_Validate_PKB,_Validate_PKA,b11,b12,b13,b14,b15,b16,b17,b18,b19
,b20,b21,b22];
var FUNCTION_TABLE_iiiii = [b24,jsCall_iiiii_0,jsCall_iiiii_1,jsCall_iiiii_2,jsCall_iiiii_3,jsCall_iiiii_4,jsCall_iiiii_5,jsCall_iiiii_6,jsCall_iiiii_7,b25,b26,b27,b28,b29,b30,b31,b32,b33,_SecretAgreement_A,_SecretAgreement_B,b34,b35,b36,b37,b38,b39,b40,b41,b42
,b43,b44,b45];
var FUNCTION_TABLE_iii = [b47,jsCall_iii_0,jsCall_iii_1,jsCall_iii_2,jsCall_iii_3,jsCall_iii_4,jsCall_iii_5,jsCall_iii_6,jsCall_iii_7,b48,b49,b50,b51,b52,b53,b54,b55,b56,_sidhjs_randombytes,b57,b58,b59,b60,b61,b62,b63,b64,b65,b66
,b67,b68,b69];

  return { _sidhjs_secret: _sidhjs_secret, _free: _free, _sidhjs_public_key_bytes: _sidhjs_public_key_bytes, _sidhjs_private_key_bytes: _sidhjs_private_key_bytes, _sidhjs_secret_bytes: _sidhjs_secret_bytes, _memset: _memset, _malloc: _malloc, _memcpy: _memcpy, _sidhjs_keypair: _sidhjs_keypair, _sidhjs_init: _sidhjs_init, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, establishStackSpace: establishStackSpace, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_iiii: dynCall_iiii, dynCall_iiiii: dynCall_iiiii, dynCall_iii: dynCall_iii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var real__sidhjs_private_key_bytes = asm["_sidhjs_private_key_bytes"]; asm["_sidhjs_private_key_bytes"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__sidhjs_private_key_bytes.apply(null, arguments);
};

var real__free = asm["_free"]; asm["_free"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__free.apply(null, arguments);
};

var real__sidhjs_public_key_bytes = asm["_sidhjs_public_key_bytes"]; asm["_sidhjs_public_key_bytes"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__sidhjs_public_key_bytes.apply(null, arguments);
};

var real__sidhjs_secret = asm["_sidhjs_secret"]; asm["_sidhjs_secret"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__sidhjs_secret.apply(null, arguments);
};

var real__sidhjs_secret_bytes = asm["_sidhjs_secret_bytes"]; asm["_sidhjs_secret_bytes"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__sidhjs_secret_bytes.apply(null, arguments);
};

var real__malloc = asm["_malloc"]; asm["_malloc"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__malloc.apply(null, arguments);
};

var real__sidhjs_keypair = asm["_sidhjs_keypair"]; asm["_sidhjs_keypair"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__sidhjs_keypair.apply(null, arguments);
};

var real__sidhjs_init = asm["_sidhjs_init"]; asm["_sidhjs_init"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__sidhjs_init.apply(null, arguments);
};
var _sidhjs_private_key_bytes = Module["_sidhjs_private_key_bytes"] = asm["_sidhjs_private_key_bytes"];
var _free = Module["_free"] = asm["_free"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _sidhjs_public_key_bytes = Module["_sidhjs_public_key_bytes"] = asm["_sidhjs_public_key_bytes"];
var _sidhjs_secret = Module["_sidhjs_secret"] = asm["_sidhjs_secret"];
var _memset = Module["_memset"] = asm["_memset"];
var _sidhjs_secret_bytes = Module["_sidhjs_secret_bytes"] = asm["_sidhjs_secret_bytes"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _sidhjs_keypair = Module["_sidhjs_keypair"] = asm["_sidhjs_keypair"];
var _sidhjs_init = Module["_sidhjs_init"] = asm["_sidhjs_init"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
;

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.establishStackSpace = asm['establishStackSpace'];

Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];



// === Auto-generated postamble setup entry stuff ===


function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);


  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') implicitly called by end of main(), but noExitRuntime, so not exiting the runtime (you can use emscripten_force_exit, if you want to force a true shutdown)');
    return;
  }

  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)');
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}


// EMSCRIPTEN_GENERATED_FUNCTIONS: ["_memset","_memcpy"]


;

function dataReturn (returnValue, result) {
	if (returnValue === 0) {
		return result;
	}
	else {
		throw new Error('SIDH error: ' + returnValue);
	}
}

function dataResult (buffer, bytes) {
	return new Uint8Array(
		new Uint8Array(Module.HEAPU8.buffer, buffer, bytes)
	);
}

function dataFree (buffer) {
	try {
		Module._free(buffer);
	}
	catch (_) {}
}


Module._sidhjs_init();


var sidh	= {
	publicKeyLength: Module._sidhjs_public_key_bytes(),
	privateKeyLength: Module._sidhjs_private_key_bytes(),
	secretLength: Module._sidhjs_secret_bytes(),

	keyPair: function (isAlice) {
		if (typeof isAlice !== 'boolean') {
			throw 'Must specify whether this key pair is for Alice.';
		}

		var publicKeyBuffer		= Module._malloc(sidh.publicKeyLength);
		var privateKeyBuffer	= Module._malloc(sidh.privateKeyLength);

		try {
			var returnValue	= Module._sidhjs_keypair(
				isAlice ? 1 : 0,
				publicKeyBuffer,
				privateKeyBuffer
			);

			return dataReturn(returnValue, {
				publicKey: dataResult(publicKeyBuffer, sidh.publicKeyLength),
				privateKey: dataResult(privateKeyBuffer, sidh.privateKeyLength)
			});
		}
		finally {
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
		}
	},

	secret: function (publicKey, privateKey) {
		var publicKeyBuffer		= Module._malloc(sidh.publicKeyLength);
		var privateKeyBuffer	= Module._malloc(sidh.privateKeyLength);
		var secretBuffer		= Module._malloc(sidh.secretLength);

		Module.writeArrayToMemory(publicKey, publicKeyBuffer);
		Module.writeArrayToMemory(privateKey, privateKeyBuffer);

		try {
			var returnValue	= Module._sidhjs_secret(
				publicKeyBuffer,
				privateKeyBuffer,
				secretBuffer
			);

			return dataReturn(
				returnValue,
				dataResult(secretBuffer, sidh.secretLength)
			);
		}
		finally {
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
			dataFree(secretBuffer);
		}
	}
};



return sidh;

}());

self.sidh	= sidh;
//# sourceMappingURL=sidh.debug.js.map