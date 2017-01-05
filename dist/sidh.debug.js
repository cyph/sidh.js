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
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;

// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)

if (Module['ENVIRONMENT']) {
  if (Module['ENVIRONMENT'] === 'WEB') {
    ENVIRONMENT_IS_WEB = true;
  } else if (Module['ENVIRONMENT'] === 'WORKER') {
    ENVIRONMENT_IS_WORKER = true;
  } else if (Module['ENVIRONMENT'] === 'NODE') {
    ENVIRONMENT_IS_NODE = true;
  } else if (Module['ENVIRONMENT'] === 'SHELL') {
    ENVIRONMENT_IS_SHELL = true;
  } else {
    throw new Error('The provided Module[\'ENVIRONMENT\'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL.');
  }
} else {
  ENVIRONMENT_IS_WEB = typeof window === 'object';
  ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
  ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
  ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
}


if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = console.log;
  if (!Module['printErr']) Module['printErr'] = console.warn;

  var nodeFS;
  var nodePath;

  Module['read'] = function read(filename, binary) {
    if (!nodeFS) nodeFS = require('fs');
    if (!nodePath) nodePath = require('path');
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    return binary ? ret : ret.toString();
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
    Module['read'] = function read() { throw 'no read() available' };
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

  Module['readAsync'] = function readAsync(url, onload, onerror) {
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
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.warn(x);
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
  abort('NO_DYNAMIC_EXECUTION=1 was set, cannot eval');
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
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = undefined;



// {{PREAMBLE_ADDITIONS}}

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
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
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
      // optimize away arguments usage in common cases
      if (sig.length === 1) {
        sigCache[func] = function dynCall_wrapper() {
          return Runtime.dynCall(sig, func);
        };
      } else if (sig.length === 2) {
        sigCache[func] = function dynCall_wrapper(arg) {
          return Runtime.dynCall(sig, func, [arg]);
        };
      } else {
        // general case
        sigCache[func] = function dynCall_wrapper() {
          return Runtime.dynCall(sig, func, Array.prototype.slice.call(arguments));
        };
      }
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { assert(DYNAMICTOP_PTR);var ret = HEAP32[DYNAMICTOP_PTR>>2];var end = (((ret + size + 15)|0) & -16);HEAP32[DYNAMICTOP_PTR>>2] = end;if (end >= TOTAL_MEMORY) {var success = enlargeMemory();if (!success) {HEAP32[DYNAMICTOP_PTR>>2] = ret;return 0;}}return ret;},
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

var ABORT = 0; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

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
    abort('NO_DYNAMIC_EXECUTION=1 was set, cannot eval');
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
        var len = (str.length << 2) + 1;
        ret = Runtime.stackAlloc(len);
        stringToUTF8(str, ret, len);
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
    ret = [typeof _malloc === 'function' ? _malloc : Runtime.staticAlloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
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
  if (!runtimeInitialized) return Runtime.dynamicAlloc(size);
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

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;
function UTF8ArrayToString(u8Array, idx) {
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  while (u8Array[endPtr]) ++endPtr;

  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
  } else {
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

var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
function UTF16ToString(ptr) {
  assert(ptr % 2 == 0, 'Pointer passed to UTF16ToString must be aligned to two bytes!');
  var endPtr = ptr;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1;
  while (HEAP16[idx]) ++idx;
  endPtr = idx << 1;

  if (endPtr - ptr > 32 && UTF16Decoder) {
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  } else {
    var i = 0;

    var str = '';
    while (1) {
      var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
      if (codeUnit == 0) return str;
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
  }
}


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
  assert(outPtr % 2 == 0, 'Pointer passed to stringToUTF16 must be aligned to two bytes!');
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


// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}


function UTF32ToString(ptr) {
  assert(ptr % 4 == 0, 'Pointer passed to UTF32ToString must be aligned to four bytes!');
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
  assert(outPtr % 4 == 0, 'Pointer passed to stringToUTF32 must be aligned to four bytes!');
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


function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var s = func.substr(1);
      var len = lengthBytesUTF8(s)+1;
      var buf = _malloc(len);
      stringToUTF8(s, buf, len);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed
    } catch(e) {
      // ignore problems here
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
    // failure when using libcxxabi, don't demangle
    return func;
  }
  Runtime.warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  return func;
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
  var js = jsStackTrace();
  if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
  return demangleAll(js);
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
var buffer;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBuffer(buf) {
  Module['buffer'] = buffer = buf;
}

function updateGlobalBufferViews() {
  Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
  Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
  Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
}

var STATIC_BASE, STATICTOP, staticSealed; // static area
var STACK_BASE, STACKTOP, STACK_MAX; // stack area
var DYNAMIC_BASE, DYNAMICTOP_PTR; // dynamic area handled by sbrk

  STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
  staticSealed = false;


// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  assert((STACK_MAX & 3) == 0);
  HEAPU32[(STACK_MAX >> 2)-1] = 0x02135467;
  HEAPU32[(STACK_MAX >> 2)-2] = 0x89BACDFE;
}

function checkStackCookie() {
  if (HEAPU32[(STACK_MAX >> 2)-1] != 0x02135467 || HEAPU32[(STACK_MAX >> 2)-2] != 0x89BACDFE) {
    abort('Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x02135467, but received 0x' + HEAPU32[(STACK_MAX >> 2)-2].toString(16) + ' ' + HEAPU32[(STACK_MAX >> 2)-1].toString(16));
  }
  // Also test the global address 0 for integrity. This check is not compatible with SAFE_SPLIT_MEMORY though, since that mode already tests all address 0 accesses on its own.
  if (HEAP32[0] !== 0x63736d65 /* 'emsc' */) throw 'Runtime error: The application has corrupted its heap memory area (address zero)!';
}

function abortStackOverflow(allocSize) {
  abort('Stack overflow! Attempted to allocate ' + allocSize + ' bytes on the stack, but stack has only ' + (STACK_MAX - asm.stackSave() + allocSize) + ' bytes available!');
}

function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}


function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 32768;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 65536;

var WASM_PAGE_SIZE = 64 * 1024;

var totalMemory = WASM_PAGE_SIZE;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024;
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



// Use a provided buffer, if there is one, or else allocate a new one
if (Module['buffer']) {
  buffer = Module['buffer'];
  assert(buffer.byteLength === TOTAL_MEMORY, 'provided buffer should be ' + TOTAL_MEMORY + ' bytes, but it is ' + buffer.byteLength);
} else {
  // Use a WebAssembly memory where available
  {
    buffer = new ArrayBuffer(TOTAL_MEMORY);
  }
  assert(buffer.byteLength === TOTAL_MEMORY);
}
updateGlobalBufferViews();


function getTotalMemory() {
  return TOTAL_MEMORY;
}

// Endianness check (note: assumes compiler arch was little-endian)
  HEAP32[0] = 0x63736d65; /* 'emsc' */
HEAP16[1] = 0x6373;
if (HEAPU8[2] !== 0x73 || HEAPU8[3] !== 0x63) throw 'Runtime error: expected the system to be little-endian!';

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
  checkStackCookie();
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  checkStackCookie();
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  checkStackCookie();
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  checkStackCookie();
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

// Deprecated: This function should not be called because it is unsafe and does not provide
// a maximum length limit of how many bytes it is allowed to write. Prefer calling the
// function stringToUTF8Array() instead, which takes in a maximum length that can be used
// to be secure from out of bounds writes.
function writeStringToMemory(string, buffer, dontAddNull) {
  Runtime.warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');

  var lastChar, end;
  if (dontAddNull) {
    // stringToUTF8Array always appends null. If we don't want to do that, remember the
    // character that existed at the location where the null will be placed, and restore
    // that after the write (below).
    end = buffer + lengthBytesUTF8(string);
    lastChar = HEAP8[end];
  }
  stringToUTF8(string, buffer, Infinity);
  if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  HEAP8.set(array, buffer);    
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

if (!Math['trunc']) Math['trunc'] = function(x) {
  return x < 0 ? Math.ceil(x) : Math.floor(x);
};
Math.trunc = Math['trunc'];

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
var Math_round = Math.round;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;

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



var /* show errors on likely calls to FS when it was not included */ FS = {
  error: function() {
    abort('Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1');
  },
  init: function() { FS.error() },
  createDataFile: function() { FS.error() },
  createPreloadedFile: function() { FS.error() },
  createLazyFile: function() { FS.error() },
  open: function() { FS.error() },
  mkdev: function() { FS.error() },
  registerDevice: function() { FS.error() },
  analyzePath: function() { FS.error() },
  loadFilesFromDB: function() { FS.error() },

  ErrnoError: function ErrnoError() { FS.error() },
};
Module['FS_createDataFile'] = FS.createDataFile;
Module['FS_createPreloadedFile'] = FS.createPreloadedFile;


// === Body ===

var ASM_CONSTS = [function() { { return Module.getRandomValue(); } },
 function() { { if (Module.getRandomValue === undefined) { try { var window_ = "object" === typeof window ? window : self, crypto_ = typeof window_.crypto !== "undefined" ? window_.crypto : window_.msCrypto, randomValuesStandard = function() { var buf = new Uint32Array(1); crypto_.getRandomValues(buf); return buf[0] >>> 0; }; randomValuesStandard(); Module.getRandomValue = randomValuesStandard; } catch (e) { try { var crypto = require('crypto'), randomValueNodeJS = function() { var buf = crypto.randomBytes(4); return (buf[0] << 24 | buf[1] << 16 | buf[2] << 8 | buf[3]) >>> 0; }; randomValueNodeJS(); Module.getRandomValue = randomValueNodeJS; } catch (e) { throw 'No secure random number generator found'; } } } } }];

function _emscripten_asm_const_i(code) {
 return ASM_CONSTS[code]();
}

function _emscripten_asm_const_v(code) {
 return ASM_CONSTS[code]();
}



STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 6048;
  /* global initializers */  __ATINIT__.push();
  

/* memory initializer */ allocate([83,73,68,72,112,55,53,49,0,0,0,0,0,3,0,0,128,1,0,0,239,2,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,175,238,168,120,248,73,133,150,236,227,118,204,247,19,26,155,149,218,118,232,235,214,103,152,78,8,72,87,178,92,4,181,98,133,102,220,186,151,159,144,18,14,28,247,65,213,229,111,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,116,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,123,1,0,0,239,0,0,0,235,142,138,135,159,84,104,201,62,110,199,124,63,161,177,89,169,109,135,190,110,125,134,233,132,128,116,37,203,69,80,43,86,104,198,173,123,249,9,41,225,192,113,31,84,93,254,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,233,51,226,204,245,70,3,75,213,172,227,108,8,70,38,99,147,118,52,183,74,209,97,86,51,241,241,154,68,32,138,165,164,111,109,197,64,47,172,185,243,227,160,143,0,30,86,142,201,34,184,93,109,9,174,108,232,131,62,173,164,183,253,131,23,98,56,4,217,122,49,177,210,6,190,246,137,63,162,63,201,188,70,255,54,141,156,66,233,56,122,2,130,62,0,0,213,65,179,191,32,214,224,18,48,52,137,112,115,234,142,15,0,139,91,59,236,235,153,90,253,247,105,158,172,127,108,35,197,254,12,189,243,126,20,15,141,90,50,128,13,149,213,142,26,114,63,191,80,31,145,30,141,55,168,223,33,116,58,22,106,14,1,218,67,176,49,195,183,131,88,117,90,145,21,94,235,86,141,89,95,111,35,182,126,78,205,141,191,59,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,49,201,220,37,35,237,118,211,38,29,108,86,223,225,217,237,174,25,185,148,203,174,118,197,70,214,164,170,90,120,211,112,119,138,40,48,14,97,203,158,59,2,89,134,119,211,155,66,55,242,109,242,156,230,213,140,35,249,185,23,142,173,163,224,96,81,82,45,254,69,225,93,114,237,89,232,188,213,248,162,9,244,143,171,1,10,150,239,6,239,128,29,47,0,0,148,120,104,160,38,146,71,145,187,64,186,246,245,186,198,187,166,60,254,44,18,41,181,21,163,152,232,0,79,117,18,125,233,69,151,65,200,160,235,118,222,234,179,223,108,240,148,10,155,47,235,46,219,110,154,57,235,158,4,156,18,197,2,227,182,212,81,57,18,146,88,195,93,197,28,237,135,82,68,21,90,181,154,240,81,243,202,26,42,8,109,164,39,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,209,97,2,0,0,0,0,0,85,128,229,80,210,115,155,165,225,16,190,208,147,53,6,203,187,108,7,93,203,92,81,246,32,94,223,237,71,7,136,102,171,212,191,166,72,82,81,186,157,120,220,221,13,240,142,59,42,30,126,82,161,37,251,184,29,243,253,132,198,102,165,182,29,250,186,245,25,166,19,2,210,149,44,23,65,173,88,161,25,183,238,229,39,164,132,3,199,125,80,117,249,27,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,88,64,173,157,68,70,48,35,42,69,150,166,97,1,1,219,142,253,227,114,20,148,54,94,6,231,162,130,32,254,11,244,81,135,79,144,168,204,50,73,129,252,231,30,31,95,115,31,24,142,4,193,128,77,79,162,197,7,182,205,60,56,108,181,144,156,95,115,123,212,29,68,42,200,106,106,44,237,115,86,75,41,50,17,38,5,201,6,53,31,15,131,173,65,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,176,238,168,120,248,73,133,150,236,227,118,204,247,19,26,155,149,218,118,232,235,214,103,152,78,8,72,87,178,92,4,181,98,133,102,220,186,151,159,144,18,14,28,247,65,213,229,40,140,37,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,173,73,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,131,102,108,92,55,228,177,39,85,208,36,79,63,191,151,119,105,46,78,92,172,178,183,157,200,86,105,7,210,57,180,164,76,233,199,18,117,108,146,247,16,226,229,188,36,91,45,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,249,132,131,130,138,113,205,237,20,122,66,212,191,53,59,115,56,207,215,148,207,41,130,248,214,42,124,12,153,108,197,99,199,34,66,143,126,168,88,184,245,234,37,181,198,201,84,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,175,238,168,120,248,73,133,150,236,227,118,204,247,19,26,155,149,218,118,232,235,214,103,152,78,8,72,87,178,92,4,181,98,133,102,220,186,151,159,144,18,14,28,247,65,213,229,111,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,176,238,168,120,248,73,133,150,236,227,118,204,247,19,26,155,149,218,118,232,235,214,103,152,78,8,72,87,178,92,4,181,98,133,102,220,186,151,159,144,18,14,28,247,65,213,229,111,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,88,64,173,157,68,70,48,35,42,69,150,166,97,1,1,219,142,253,227,114,20,148,54,94,6,231,162,130,32,254,11,244,81,135,79,144,168,204,50,73,129,252,231,30,31,95,115,31,24,142,4,193,128,77,79,162,197,7,182,205,60,56,108,181,144,156,95,115,123,212,29,68,42,200,106,106,44,237,115,86,75,41,50,17,38,5,201,6,53,31,15,131,173,65,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,8,0,0,0,8,0,0,0,8,0,0,0,8,0,0,0,9,0,0,0,10,0,0,0,9,0,0,0,12,0,0,0,11,0,0,0,11,0,0,0,12,0,0,0,12,0,0,0,13,0,0,0,14,0,0,0,15,0,0,0,16,0,0,0,16,0,0,0,16,0,0,0,16,0,0,0,16,0,0,0,17,0,0,0,17,0,0,0,17,0,0,0,17,0,0,0,17,0,0,0,19,0,0,0,19,0,0,0,17,0,0,0,18,0,0,0,19,0,0,0,20,0,0,0,21,0,0,0,22,0,0,0,21,0,0,0,23,0,0,0,22,0,0,0,24,0,0,0,24,0,0,0,25,0,0,0,25,0,0,0,27,0,0,0,27,0,0,0,27,0,0,0,28,0,0,0,30,0,0,0,30,0,0,0,31,0,0,0,32,0,0,0,32,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,32,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,36,0,0,0,34,0,0,0,35,0,0,0,34,0,0,0,35,0,0,0,38,0,0,0,37,0,0,0,38,0,0,0,38,0,0,0,39,0,0,0,38,0,0,0,41,0,0,0,39,0,0,0,43,0,0,0,38,0,0,0,41,0,0,0,42,0,0,0,43,0,0,0,43,0,0,0,40,0,0,0,41,0,0,0,42,0,0,0,43,0,0,0,44,0,0,0,45,0,0,0,46,0,0,0,47,0,0,0,48,0,0,0,49,0,0,0,50,0,0,0,48,0,0,0,49,0,0,0,53,0,0,0,51,0,0,0,51,0,0,0,51,0,0,0,53,0,0,0,55,0,0,0,56,0,0,0,55,0,0,0,56,0,0,0,58,0,0,0,58,0,0,0,58,0,0,0,59,0,0,0,61,0,0,0,61,0,0,0,63,0,0,0,63,0,0,0,64,0,0,0,64,0,0,0,64,0,0,0,65,0,0,0,65,0,0,0,65,0,0,0,64,0,0,0,64,0,0,0,65,0,0,0,65,0,0,0,65,0,0,0,66,0,0,0,67,0,0,0,65,0,0,0,66,0,0,0,65,0,0,0,68,0,0,0,66,0,0,0,65,0,0,0,66,0,0,0,65,0,0,0,66,0,0,0,67,0,0,0,65,0,0,0,66,0,0,0,67,0,0,0,68,0,0,0,69,0,0,0,70,0,0,0,71,0,0,0,72,0,0,0,71,0,0,0,72,0,0,0,71,0,0,0,76,0,0,0,71,0,0,0,76,0,0,0,72,0,0,0,71,0,0,0,76,0,0,0,71,0,0,0,73,0,0,0,72,0,0,0,76,0,0,0,76,0,0,0,73,0,0,0,73,0,0,0,72,0,0,0,76,0,0,0,76,0,0,0,75,0,0,0,76,0,0,0,76,0,0,0,75,0,0,0,81,0,0,0,81,0,0,0,83,0,0,0,81,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,5,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,8,0,0,0,8,0,0,0,8,0,0,0,9,0,0,0,9,0,0,0,9,0,0,0,9,0,0,0,9,0,0,0,12,0,0,0,12,0,0,0,12,0,0,0,12,0,0,0,12,0,0,0,12,0,0,0,12,0,0,0,13,0,0,0,14,0,0,0,14,0,0,0,15,0,0,0,16,0,0,0,16,0,0,0,16,0,0,0,16,0,0,0,17,0,0,0,16,0,0,0,19,0,0,0,17,0,0,0,19,0,0,0,19,0,0,0,19,0,0,0,20,0,0,0,21,0,0,0,22,0,0,0,22,0,0,0,22,0,0,0,22,0,0,0,22,0,0,0,22,0,0,0,22,0,0,0,24,0,0,0,22,0,0,0,22,0,0,0,24,0,0,0,24,0,0,0,26,0,0,0,27,0,0,0,27,0,0,0,28,0,0,0,28,0,0,0,28,0,0,0,30,0,0,0,28,0,0,0,28,0,0,0,28,0,0,0,29,0,0,0,28,0,0,0,28,0,0,0,28,0,0,0,29,0,0,0,29,0,0,0,30,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,33,0,0,0,34,0,0,0,35,0,0,0,37,0,0,0,37,0,0,0,37,0,0,0,38,0,0,0,38,0,0,0,38,0,0,0,37,0,0,0,38,0,0,0,38,0,0,0,38,0,0,0,38,0,0,0,38,0,0,0,39,0,0,0,38,0,0,0,44,0,0,0,43,0,0,0,44,0,0,0,39,0,0,0,40,0,0,0,41,0,0,0,43,0,0,0,43,0,0,0,43,0,0,0,45,0,0,0,46,0,0,0,46,0,0,0,46,0,0,0,47,0,0,0,48,0,0,0,48,0,0,0,49,0,0,0,49,0,0,0,50,0,0,0,51,0,0,0,51,0,0,0,49,0,0,0,49,0,0,0,50,0,0,0,51,0,0,0,50,0,0,0,51,0,0,0,50,0,0,0,50,0,0,0,51,0,0,0,50,0,0,0,51,0,0,0,51,0,0,0,51,0,0,0,53,0,0,0,55,0,0,0,55,0,0,0,55,0,0,0,56,0,0,0,56,0,0,0,56,0,0,0,56,0,0,0,56,0,0,0,57,0,0,0,58,0,0,0,61,0,0,0,61,0,0,0,61,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,64,0,0,0,65,0,0,0,66,0,0,0,65,0,0,0,66,0,0,0,66,0,0,0,66,0,0,0,65,0,0,0,66,0,0,0,66,0,0,0,66,0,0,0,66,0,0,0,66,0,0,0,68,0,0,0,71,0,0,0,66,0,0,0,66,0,0,0,68,0,0,0,67,0,0,0,71,0,0,0,66,0,0,0,66,0,0,0,68,0,0,0,67,0,0,0,71,0,0,0,66,0,0,0,66,0,0,0,68,0,0,0,68,0,0,0,71,0,0,0,70,0,0,0,70,0,0,0,72,0,0,0,72,0,0,0,76,0,0,0,75,0,0,0,75,0,0,0,78,0,0,0,78,0,0,0,78,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,80,0,0,0,81,0,0,0,81,0,0,0,81,0,0,0,82,0,0,0,83,0,0,0,84,0,0,0,85,0,0,0,86,0,0,0,86,0,0,0,86,0,0,0,86,0,0,0,86,0,0,0,86,0,0,0,88,0,0,0,86,0,0,0,90,0,0,0,86,0,0,0,92,0,0,0,87,0,0,0,86,0,0,0,89,0,0,0,86,0,0,0,92,0,0,0,87,0,0,0,86,0,0,0,87,0,0,0,86,0,0,0,91,0,0,0,89,0,0,0,89,0,0,0,90,0,0,0,90,0,0,0,92,0,0,0,92,0,0,0,92,0,0,0,93,0,0,0,93,0,0,0,93,0,0,0,95,0,0,0,95,0,0,0,95,0,0,0,95,0,0,0,95,0,0,0,95,0,0,0,95,0,0,0,95,0,0,0,0,3,0,0,0,6,0,0,48,0,0,0,96,0,0,0,123,32,114,101,116,117,114,110,32,77,111,100,117,108,101,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,40,41,59,32,125,0,123,32,105,102,32,40,77,111,100,117,108,101,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,32,61,61,61,32,117,110,100,101,102,105,110,101,100,41,32,123,32,116,114,121,32,123,32,118,97,114,32,119,105,110,100,111,119,95,32,61,32,34,111,98,106,101,99,116,34,32,61,61,61,32,116,121,112,101,111,102,32,119,105,110,100,111,119,32,63,32,119,105,110,100,111,119,32,58,32,115,101,108,102,44,32,99,114,121,112,116,111,95,32,61,32,116,121,112,101,111,102,32,119,105,110,100,111,119,95,46,99,114,121,112,116,111,32,33,61,61,32,34,117,110,100,101,102,105,110,101,100,34,32,63,32,119,105,110,100,111,119,95,46,99,114,121,112,116,111,32,58,32,119,105,110,100,111,119,95,46,109,115,67,114,121,112,116,111,44,32,114,97,110,100,111,109,86,97,108,117,101,115,83,116,97,110,100,97,114,100,32,61,32,102,117,110,99,116,105,111,110,40,41,32,123,32,118,97,114,32,98,117,102,32,61,32,110,101,119,32,85,105,110,116,51,50,65,114,114,97,121,40,49,41,59,32,99,114,121,112,116,111,95,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,115,40,98,117,102,41,59,32,114,101,116,117,114,110,32,98,117,102,91,48,93,32,62,62,62,32,48,59,32,125,59,32,114,97,110,100,111,109,86,97,108,117,101,115,83,116,97,110,100,97,114,100,40,41,59,32,77,111,100,117,108,101,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,32,61,32,114,97,110,100,111,109,86,97,108,117,101,115,83,116,97,110,100,97,114,100,59,32,125,32,99,97,116,99,104,32,40,101,41,32,123,32,116,114,121,32,123,32,118,97,114,32,99,114,121,112,116,111,32,61,32,114,101,113,117,105,114,101,40,39,99,114,121,112,116,111,39,41,44,32,114,97,110,100,111,109,86,97,108,117,101,78,111,100,101,74,83,32,61,32,102,117,110,99,116,105,111,110,40,41,32,123,32,118,97,114,32,98,117,102,32,61,32,99,114,121,112,116,111,46,114,97,110,100,111,109,66,121,116,101,115,40,52,41,59,32,114,101,116,117,114,110,32,40,98,117,102,91,48,93,32,60,60,32,50,52,32,124,32,98,117,102,91,49,93,32,60,60,32,49,54,32,124,32,98,117,102,91,50,93,32,60,60,32,56,32,124,32,98,117,102,91,51,93,41,32,62,62,62,32,48,59,32,125,59,32,114,97,110,100,111,109,86,97,108,117,101,78,111,100,101,74,83,40,41,59,32,77,111,100,117,108,101,46,103,101,116,82,97,110,100,111,109,86,97,108,117,101,32,61,32,114,97,110,100,111,109,86,97,108,117,101,78,111,100,101,74,83,59,32,125,32,99,97,116,99,104,32,40,101,41,32,123,32,116,104,114,111,119,32,39,78,111,32,115,101,99,117,114,101,32,114,97,110,100,111,109,32,110,117,109,98,101,114,32,103,101,110,101,114,97,116,111,114,32,102,111,117,110,100,39,59,32,125,32,125,32,125,32,125,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);





/* no memory initializer */
var tempDoublePtr = STATICTOP; STATICTOP += 16;

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


  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      else Module.printErr('failed to set errno from JS');
      return value;
    } 
  Module["_sbrk"] = _sbrk;

   
  Module["_memset"] = _memset;

  var _emscripten_asm_const=true;

  var _emscripten_asm_const_int=true;

  function _abort() {
      Module['abort']();
    }

   
  Module["_pthread_self"] = _pthread_self;

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;
DYNAMICTOP_PTR = allocate(1, "i32", ALLOC_STATIC);

STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = Runtime.alignMemory(STACK_MAX);

HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;

staticSealed = true; // seal the static portion of memory

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

Module.asmLibraryArg = { "abort": abort, "assert": assert, "enlargeMemory": enlargeMemory, "getTotalMemory": getTotalMemory, "abortOnCannotGrowMemory": abortOnCannotGrowMemory, "abortStackOverflow": abortStackOverflow, "nullFunc_iiii": nullFunc_iiii, "nullFunc_iiiii": nullFunc_iiiii, "nullFunc_iii": nullFunc_iii, "invoke_iiii": invoke_iiii, "jsCall_iiii": jsCall_iiii, "invoke_iiiii": invoke_iiiii, "jsCall_iiiii": jsCall_iiiii, "invoke_iii": invoke_iii, "jsCall_iii": jsCall_iii, "_emscripten_asm_const_v": _emscripten_asm_const_v, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_abort": _abort, "___setErrNo": ___setErrNo, "_emscripten_asm_const_i": _emscripten_asm_const_i, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "DYNAMICTOP_PTR": DYNAMICTOP_PTR, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT };
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
  var DYNAMICTOP_PTR=env.DYNAMICTOP_PTR|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;
  var tempRet0 = 0;

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
  var Math_max=global.Math.max;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var enlargeMemory=env.enlargeMemory;
  var getTotalMemory=env.getTotalMemory;
  var abortOnCannotGrowMemory=env.abortOnCannotGrowMemory;
  var abortStackOverflow=env.abortStackOverflow;
  var nullFunc_iiii=env.nullFunc_iiii;
  var nullFunc_iiiii=env.nullFunc_iiiii;
  var nullFunc_iii=env.nullFunc_iii;
  var invoke_iiii=env.invoke_iiii;
  var jsCall_iiii=env.jsCall_iiii;
  var invoke_iiiii=env.invoke_iiiii;
  var jsCall_iiiii=env.jsCall_iiiii;
  var invoke_iii=env.invoke_iii;
  var jsCall_iii=env.jsCall_iii;
  var _emscripten_asm_const_v=env._emscripten_asm_const_v;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _abort=env._abort;
  var ___setErrNo=env.___setErrNo;
  var _emscripten_asm_const_i=env._emscripten_asm_const_i;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS

function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
  STACKTOP = (STACKTOP + 15)&-16;
  if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(size|0);

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

function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _sodium_compare($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $11 = $3; //@line 154 "libsodium/src/libsodium/sodium/utils.c"
 $6 = $11; //@line 153 "libsodium/src/libsodium/sodium/utils.c"
 $12 = $4; //@line 156 "libsodium/src/libsodium/sodium/utils.c"
 $7 = $12; //@line 155 "libsodium/src/libsodium/sodium/utils.c"
 $8 = 0; //@line 158 "libsodium/src/libsodium/sodium/utils.c"
 $9 = 1; //@line 159 "libsodium/src/libsodium/sodium/utils.c"
 $13 = $5; //@line 165 "libsodium/src/libsodium/sodium/utils.c"
 $10 = $13; //@line 165 "libsodium/src/libsodium/sodium/utils.c"
 while(1) {
  $14 = $10; //@line 166 "libsodium/src/libsodium/sodium/utils.c"
  $15 = ($14|0)!=(0); //@line 166 "libsodium/src/libsodium/sodium/utils.c"
  if (!($15)) {
   break;
  }
  $16 = $10; //@line 167 "libsodium/src/libsodium/sodium/utils.c"
  $17 = (($16) + -1)|0; //@line 167 "libsodium/src/libsodium/sodium/utils.c"
  $10 = $17; //@line 167 "libsodium/src/libsodium/sodium/utils.c"
  $18 = $10; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $19 = $7; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $20 = (($19) + ($18)|0); //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $21 = HEAP8[$20>>0]|0; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $22 = $21&255; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $23 = $10; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $24 = $6; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $25 = (($24) + ($23)|0); //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $26 = HEAP8[$25>>0]|0; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $27 = $26&255; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $28 = (($22) - ($27))|0; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $29 = $28 >> 8; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $30 = $9; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $31 = $30&255; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $32 = $29 & $31; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $33 = $8; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $34 = $33&255; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $35 = $34 | $32; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $36 = $35&255; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $8 = $36; //@line 168 "libsodium/src/libsodium/sodium/utils.c"
  $37 = $10; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $38 = $7; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $39 = (($38) + ($37)|0); //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $40 = HEAP8[$39>>0]|0; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $41 = $40&255; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $42 = $10; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $43 = $6; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $44 = (($43) + ($42)|0); //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $45 = HEAP8[$44>>0]|0; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $46 = $45&255; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $47 = $41 ^ $46; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $48 = (($47) - 1)|0; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $49 = $48 >> 8; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $50 = $9; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $51 = $50&255; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $52 = $51 & $49; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $53 = $52&255; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
  $9 = $53; //@line 169 "libsodium/src/libsodium/sodium/utils.c"
 }
 $54 = $8; //@line 171 "libsodium/src/libsodium/sodium/utils.c"
 $55 = $54&255; //@line 171 "libsodium/src/libsodium/sodium/utils.c"
 $56 = $8; //@line 171 "libsodium/src/libsodium/sodium/utils.c"
 $57 = $56&255; //@line 171 "libsodium/src/libsodium/sodium/utils.c"
 $58 = (($55) + ($57))|0; //@line 171 "libsodium/src/libsodium/sodium/utils.c"
 $59 = $9; //@line 171 "libsodium/src/libsodium/sodium/utils.c"
 $60 = $59&255; //@line 171 "libsodium/src/libsodium/sodium/utils.c"
 $61 = (($58) + ($60))|0; //@line 171 "libsodium/src/libsodium/sodium/utils.c"
 $62 = (($61) - 1)|0; //@line 171 "libsodium/src/libsodium/sodium/utils.c"
 STACKTOP = sp;return ($62|0); //@line 171 "libsodium/src/libsodium/sodium/utils.c"
}
function _randombytes_random() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = _emscripten_asm_const_i(0)|0; //@line 70 "libsodium/src/libsodium/randombytes/randombytes.c"
 return ($0|0); //@line 70 "libsodium/src/libsodium/randombytes/randombytes.c"
}
function _randombytes_stir() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 _emscripten_asm_const_v(1); //@line 85 "libsodium/src/libsodium/randombytes/randombytes.c"
 return; //@line 113 "libsodium/src/libsodium/randombytes/randombytes.c"
}
function _randombytes_buf($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $6 = $2; //@line 151 "libsodium/src/libsodium/randombytes/randombytes.c"
 $4 = $6; //@line 151 "libsodium/src/libsodium/randombytes/randombytes.c"
 $5 = 0; //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
 while(1) {
  $7 = $5; //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
  $8 = $3; //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
  $9 = ($7>>>0)<($8>>>0); //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
  if (!($9)) {
   break;
  }
  $10 = (_randombytes_random()|0); //@line 155 "libsodium/src/libsodium/randombytes/randombytes.c"
  $11 = $10&255; //@line 155 "libsodium/src/libsodium/randombytes/randombytes.c"
  $12 = $5; //@line 155 "libsodium/src/libsodium/randombytes/randombytes.c"
  $13 = $4; //@line 155 "libsodium/src/libsodium/randombytes/randombytes.c"
  $14 = (($13) + ($12)|0); //@line 155 "libsodium/src/libsodium/randombytes/randombytes.c"
  HEAP8[$14>>0] = $11; //@line 155 "libsodium/src/libsodium/randombytes/randombytes.c"
  $15 = $5; //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
  $16 = (($15) + 1)|0; //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
  $5 = $16; //@line 154 "libsodium/src/libsodium/randombytes/randombytes.c"
 }
 STACKTOP = sp;return; //@line 158 "libsodium/src/libsodium/randombytes/randombytes.c"
}
function _SIDH_curve_initialize($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0;
 var $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $10 = $4; //@line 22 "SIDH_v1.0/SIDH_setup.c"
 $11 = (_is_CurveIsogenyStruct_null($10)|0); //@line 22 "SIDH_v1.0/SIDH_setup.c"
 if ($11) {
  $3 = 6; //@line 23 "SIDH_v1.0/SIDH_setup.c"
  $141 = $3; //@line 53 "SIDH_v1.0/SIDH_setup.c"
  STACKTOP = sp;return ($141|0); //@line 53 "SIDH_v1.0/SIDH_setup.c"
 }
 $7 = 0; //@line 26 "SIDH_v1.0/SIDH_setup.c"
 while(1) {
  $12 = $7; //@line 26 "SIDH_v1.0/SIDH_setup.c"
  $13 = ($12>>>0)<(8); //@line 26 "SIDH_v1.0/SIDH_setup.c"
  if (!($13)) {
   break;
  }
  $14 = $7; //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $15 = $6; //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $16 = (($15) + ($14)|0); //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $17 = HEAP8[$16>>0]|0; //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $18 = $7; //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $19 = $4; //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $20 = (($19) + ($18)|0); //@line 27 "SIDH_v1.0/SIDH_setup.c"
  HEAP8[$20>>0] = $17; //@line 27 "SIDH_v1.0/SIDH_setup.c"
  $21 = $7; //@line 26 "SIDH_v1.0/SIDH_setup.c"
  $22 = (($21) + 1)|0; //@line 26 "SIDH_v1.0/SIDH_setup.c"
  $7 = $22; //@line 26 "SIDH_v1.0/SIDH_setup.c"
 }
 $23 = $6; //@line 29 "SIDH_v1.0/SIDH_setup.c"
 $24 = ((($23)) + 12|0); //@line 29 "SIDH_v1.0/SIDH_setup.c"
 $25 = HEAP32[$24>>2]|0; //@line 29 "SIDH_v1.0/SIDH_setup.c"
 $26 = $4; //@line 29 "SIDH_v1.0/SIDH_setup.c"
 $27 = ((($26)) + 12|0); //@line 29 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$27>>2] = $25; //@line 29 "SIDH_v1.0/SIDH_setup.c"
 $28 = $6; //@line 30 "SIDH_v1.0/SIDH_setup.c"
 $29 = ((($28)) + 16|0); //@line 30 "SIDH_v1.0/SIDH_setup.c"
 $30 = HEAP32[$29>>2]|0; //@line 30 "SIDH_v1.0/SIDH_setup.c"
 $31 = $4; //@line 30 "SIDH_v1.0/SIDH_setup.c"
 $32 = ((($31)) + 16|0); //@line 30 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$32>>2] = $30; //@line 30 "SIDH_v1.0/SIDH_setup.c"
 $33 = $6; //@line 31 "SIDH_v1.0/SIDH_setup.c"
 $34 = ((($33)) + 20|0); //@line 31 "SIDH_v1.0/SIDH_setup.c"
 $35 = HEAP32[$34>>2]|0; //@line 31 "SIDH_v1.0/SIDH_setup.c"
 $36 = $4; //@line 31 "SIDH_v1.0/SIDH_setup.c"
 $37 = ((($36)) + 20|0); //@line 31 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$37>>2] = $35; //@line 31 "SIDH_v1.0/SIDH_setup.c"
 $38 = $6; //@line 32 "SIDH_v1.0/SIDH_setup.c"
 $39 = ((($38)) + 600|0); //@line 32 "SIDH_v1.0/SIDH_setup.c"
 $40 = HEAP32[$39>>2]|0; //@line 32 "SIDH_v1.0/SIDH_setup.c"
 $41 = $4; //@line 32 "SIDH_v1.0/SIDH_setup.c"
 $42 = ((($41)) + 36|0); //@line 32 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$42>>2] = $40; //@line 32 "SIDH_v1.0/SIDH_setup.c"
 $43 = $6; //@line 33 "SIDH_v1.0/SIDH_setup.c"
 $44 = ((($43)) + 704|0); //@line 33 "SIDH_v1.0/SIDH_setup.c"
 $45 = HEAP32[$44>>2]|0; //@line 33 "SIDH_v1.0/SIDH_setup.c"
 $46 = $4; //@line 33 "SIDH_v1.0/SIDH_setup.c"
 $47 = ((($46)) + 44|0); //@line 33 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$47>>2] = $45; //@line 33 "SIDH_v1.0/SIDH_setup.c"
 $48 = $6; //@line 34 "SIDH_v1.0/SIDH_setup.c"
 $49 = ((($48)) + 708|0); //@line 34 "SIDH_v1.0/SIDH_setup.c"
 $50 = HEAP32[$49>>2]|0; //@line 34 "SIDH_v1.0/SIDH_setup.c"
 $51 = $4; //@line 34 "SIDH_v1.0/SIDH_setup.c"
 $52 = ((($51)) + 48|0); //@line 34 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$52>>2] = $50; //@line 34 "SIDH_v1.0/SIDH_setup.c"
 $53 = $6; //@line 35 "SIDH_v1.0/SIDH_setup.c"
 $54 = ((($53)) + 1576|0); //@line 35 "SIDH_v1.0/SIDH_setup.c"
 $55 = HEAP32[$54>>2]|0; //@line 35 "SIDH_v1.0/SIDH_setup.c"
 $56 = $4; //@line 35 "SIDH_v1.0/SIDH_setup.c"
 $57 = ((($56)) + 64|0); //@line 35 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$57>>2] = $55; //@line 35 "SIDH_v1.0/SIDH_setup.c"
 $58 = $5; //@line 36 "SIDH_v1.0/SIDH_setup.c"
 $59 = $4; //@line 36 "SIDH_v1.0/SIDH_setup.c"
 $60 = ((($59)) + 84|0); //@line 36 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$60>>2] = $58; //@line 36 "SIDH_v1.0/SIDH_setup.c"
 $61 = $4; //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $62 = ((($61)) + 12|0); //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $63 = HEAP32[$62>>2]|0; //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $64 = (($63) + 32)|0; //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $65 = (($64) - 1)|0; //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $66 = (($65>>>0) / 32)&-1; //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $8 = $66; //@line 38 "SIDH_v1.0/SIDH_setup.c"
 $67 = $4; //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $68 = ((($67)) + 16|0); //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $69 = HEAP32[$68>>2]|0; //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $70 = (($69) + 32)|0; //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $71 = (($70) - 1)|0; //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $72 = (($71>>>0) / 32)&-1; //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $9 = $72; //@line 39 "SIDH_v1.0/SIDH_setup.c"
 $73 = $6; //@line 40 "SIDH_v1.0/SIDH_setup.c"
 $74 = ((($73)) + 24|0); //@line 40 "SIDH_v1.0/SIDH_setup.c"
 $75 = $4; //@line 40 "SIDH_v1.0/SIDH_setup.c"
 $76 = ((($75)) + 24|0); //@line 40 "SIDH_v1.0/SIDH_setup.c"
 $77 = HEAP32[$76>>2]|0; //@line 40 "SIDH_v1.0/SIDH_setup.c"
 $78 = $8; //@line 40 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($74,$77,$78); //@line 40 "SIDH_v1.0/SIDH_setup.c"
 $79 = $6; //@line 41 "SIDH_v1.0/SIDH_setup.c"
 $80 = ((($79)) + 216|0); //@line 41 "SIDH_v1.0/SIDH_setup.c"
 $81 = $4; //@line 41 "SIDH_v1.0/SIDH_setup.c"
 $82 = ((($81)) + 28|0); //@line 41 "SIDH_v1.0/SIDH_setup.c"
 $83 = HEAP32[$82>>2]|0; //@line 41 "SIDH_v1.0/SIDH_setup.c"
 $84 = $8; //@line 41 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($80,$83,$84); //@line 41 "SIDH_v1.0/SIDH_setup.c"
 $85 = $6; //@line 42 "SIDH_v1.0/SIDH_setup.c"
 $86 = ((($85)) + 408|0); //@line 42 "SIDH_v1.0/SIDH_setup.c"
 $87 = $4; //@line 42 "SIDH_v1.0/SIDH_setup.c"
 $88 = ((($87)) + 32|0); //@line 42 "SIDH_v1.0/SIDH_setup.c"
 $89 = HEAP32[$88>>2]|0; //@line 42 "SIDH_v1.0/SIDH_setup.c"
 $90 = $8; //@line 42 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($86,$89,$90); //@line 42 "SIDH_v1.0/SIDH_setup.c"
 $91 = $6; //@line 43 "SIDH_v1.0/SIDH_setup.c"
 $92 = ((($91)) + 608|0); //@line 43 "SIDH_v1.0/SIDH_setup.c"
 $93 = $4; //@line 43 "SIDH_v1.0/SIDH_setup.c"
 $94 = ((($93)) + 40|0); //@line 43 "SIDH_v1.0/SIDH_setup.c"
 $95 = HEAP32[$94>>2]|0; //@line 43 "SIDH_v1.0/SIDH_setup.c"
 $96 = $9; //@line 43 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($92,$95,$96); //@line 43 "SIDH_v1.0/SIDH_setup.c"
 $97 = $6; //@line 44 "SIDH_v1.0/SIDH_setup.c"
 $98 = ((($97)) + 712|0); //@line 44 "SIDH_v1.0/SIDH_setup.c"
 $99 = $4; //@line 44 "SIDH_v1.0/SIDH_setup.c"
 $100 = ((($99)) + 52|0); //@line 44 "SIDH_v1.0/SIDH_setup.c"
 $101 = HEAP32[$100>>2]|0; //@line 44 "SIDH_v1.0/SIDH_setup.c"
 $102 = $9; //@line 44 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($98,$101,$102); //@line 44 "SIDH_v1.0/SIDH_setup.c"
 $103 = $6; //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $104 = ((($103)) + 808|0); //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $105 = $4; //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $106 = ((($105)) + 56|0); //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $107 = HEAP32[$106>>2]|0; //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $108 = $8; //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $109 = $108<<1; //@line 45 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($104,$107,$109); //@line 45 "SIDH_v1.0/SIDH_setup.c"
 $110 = $6; //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $111 = ((($110)) + 1192|0); //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $112 = $4; //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $113 = ((($112)) + 60|0); //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $114 = HEAP32[$113>>2]|0; //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $115 = $8; //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $116 = $115<<1; //@line 46 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($111,$114,$116); //@line 46 "SIDH_v1.0/SIDH_setup.c"
 $117 = $6; //@line 47 "SIDH_v1.0/SIDH_setup.c"
 $118 = ((($117)) + 1584|0); //@line 47 "SIDH_v1.0/SIDH_setup.c"
 $119 = $4; //@line 47 "SIDH_v1.0/SIDH_setup.c"
 $120 = ((($119)) + 68|0); //@line 47 "SIDH_v1.0/SIDH_setup.c"
 $121 = HEAP32[$120>>2]|0; //@line 47 "SIDH_v1.0/SIDH_setup.c"
 $122 = $8; //@line 47 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($118,$121,$122); //@line 47 "SIDH_v1.0/SIDH_setup.c"
 $123 = $6; //@line 48 "SIDH_v1.0/SIDH_setup.c"
 $124 = ((($123)) + 1776|0); //@line 48 "SIDH_v1.0/SIDH_setup.c"
 $125 = $4; //@line 48 "SIDH_v1.0/SIDH_setup.c"
 $126 = ((($125)) + 72|0); //@line 48 "SIDH_v1.0/SIDH_setup.c"
 $127 = HEAP32[$126>>2]|0; //@line 48 "SIDH_v1.0/SIDH_setup.c"
 $128 = $8; //@line 48 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($124,$127,$128); //@line 48 "SIDH_v1.0/SIDH_setup.c"
 $129 = $6; //@line 49 "SIDH_v1.0/SIDH_setup.c"
 $130 = ((($129)) + 1968|0); //@line 49 "SIDH_v1.0/SIDH_setup.c"
 $131 = $4; //@line 49 "SIDH_v1.0/SIDH_setup.c"
 $132 = ((($131)) + 76|0); //@line 49 "SIDH_v1.0/SIDH_setup.c"
 $133 = HEAP32[$132>>2]|0; //@line 49 "SIDH_v1.0/SIDH_setup.c"
 $134 = $8; //@line 49 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($130,$133,$134); //@line 49 "SIDH_v1.0/SIDH_setup.c"
 $135 = $6; //@line 50 "SIDH_v1.0/SIDH_setup.c"
 $136 = ((($135)) + 2160|0); //@line 50 "SIDH_v1.0/SIDH_setup.c"
 $137 = $4; //@line 50 "SIDH_v1.0/SIDH_setup.c"
 $138 = ((($137)) + 80|0); //@line 50 "SIDH_v1.0/SIDH_setup.c"
 $139 = HEAP32[$138>>2]|0; //@line 50 "SIDH_v1.0/SIDH_setup.c"
 $140 = $8; //@line 50 "SIDH_v1.0/SIDH_setup.c"
 _copy_words($136,$139,$140); //@line 50 "SIDH_v1.0/SIDH_setup.c"
 $3 = 0; //@line 52 "SIDH_v1.0/SIDH_setup.c"
 $141 = $3; //@line 53 "SIDH_v1.0/SIDH_setup.c"
 STACKTOP = sp;return ($141|0); //@line 53 "SIDH_v1.0/SIDH_setup.c"
}
function _is_CurveIsogenyStruct_null($0) {
 $0 = $0|0;
 var $$expand_i1_val = 0, $$expand_i1_val2 = 0, $$pre_trunc = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = sp + 4|0;
 $2 = $0;
 $3 = $2; //@line 119 "SIDH_v1.0/SIDH_setup.c"
 $4 = ($3|0)==(0|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
 if (!($4)) {
  $5 = $2; //@line 119 "SIDH_v1.0/SIDH_setup.c"
  $6 = ((($5)) + 24|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
  $7 = HEAP32[$6>>2]|0; //@line 119 "SIDH_v1.0/SIDH_setup.c"
  $8 = ($7|0)==(0|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
  if (!($8)) {
   $9 = $2; //@line 119 "SIDH_v1.0/SIDH_setup.c"
   $10 = ((($9)) + 28|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
   $11 = HEAP32[$10>>2]|0; //@line 119 "SIDH_v1.0/SIDH_setup.c"
   $12 = ($11|0)==(0|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
   if (!($12)) {
    $13 = $2; //@line 119 "SIDH_v1.0/SIDH_setup.c"
    $14 = ((($13)) + 32|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
    $15 = HEAP32[$14>>2]|0; //@line 119 "SIDH_v1.0/SIDH_setup.c"
    $16 = ($15|0)==(0|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
    if (!($16)) {
     $17 = $2; //@line 119 "SIDH_v1.0/SIDH_setup.c"
     $18 = ((($17)) + 40|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
     $19 = HEAP32[$18>>2]|0; //@line 119 "SIDH_v1.0/SIDH_setup.c"
     $20 = ($19|0)==(0|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
     if (!($20)) {
      $21 = $2; //@line 119 "SIDH_v1.0/SIDH_setup.c"
      $22 = ((($21)) + 52|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
      $23 = HEAP32[$22>>2]|0; //@line 119 "SIDH_v1.0/SIDH_setup.c"
      $24 = ($23|0)==(0|0); //@line 119 "SIDH_v1.0/SIDH_setup.c"
      if (!($24)) {
       $25 = $2; //@line 120 "SIDH_v1.0/SIDH_setup.c"
       $26 = ((($25)) + 56|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
       $27 = HEAP32[$26>>2]|0; //@line 120 "SIDH_v1.0/SIDH_setup.c"
       $28 = ($27|0)==(0|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
       if (!($28)) {
        $29 = $2; //@line 120 "SIDH_v1.0/SIDH_setup.c"
        $30 = ((($29)) + 60|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
        $31 = HEAP32[$30>>2]|0; //@line 120 "SIDH_v1.0/SIDH_setup.c"
        $32 = ($31|0)==(0|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
        if (!($32)) {
         $33 = $2; //@line 120 "SIDH_v1.0/SIDH_setup.c"
         $34 = ((($33)) + 68|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
         $35 = HEAP32[$34>>2]|0; //@line 120 "SIDH_v1.0/SIDH_setup.c"
         $36 = ($35|0)==(0|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
         if (!($36)) {
          $37 = $2; //@line 120 "SIDH_v1.0/SIDH_setup.c"
          $38 = ((($37)) + 72|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
          $39 = HEAP32[$38>>2]|0; //@line 120 "SIDH_v1.0/SIDH_setup.c"
          $40 = ($39|0)==(0|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
          if (!($40)) {
           $41 = $2; //@line 120 "SIDH_v1.0/SIDH_setup.c"
           $42 = ((($41)) + 76|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
           $43 = HEAP32[$42>>2]|0; //@line 120 "SIDH_v1.0/SIDH_setup.c"
           $44 = ($43|0)==(0|0); //@line 120 "SIDH_v1.0/SIDH_setup.c"
           if (!($44)) {
            $45 = $2; //@line 121 "SIDH_v1.0/SIDH_setup.c"
            $46 = ((($45)) + 80|0); //@line 121 "SIDH_v1.0/SIDH_setup.c"
            $47 = HEAP32[$46>>2]|0; //@line 121 "SIDH_v1.0/SIDH_setup.c"
            $48 = ($47|0)==(0|0); //@line 121 "SIDH_v1.0/SIDH_setup.c"
            if (!($48)) {
             $$expand_i1_val2 = 0; //@line 125 "SIDH_v1.0/SIDH_setup.c"
             HEAP8[$1>>0] = $$expand_i1_val2; //@line 125 "SIDH_v1.0/SIDH_setup.c"
             $$pre_trunc = HEAP8[$1>>0]|0; //@line 126 "SIDH_v1.0/SIDH_setup.c"
             $49 = $$pre_trunc&1; //@line 126 "SIDH_v1.0/SIDH_setup.c"
             STACKTOP = sp;return ($49|0); //@line 126 "SIDH_v1.0/SIDH_setup.c"
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
 HEAP8[$1>>0] = $$expand_i1_val; //@line 123 "SIDH_v1.0/SIDH_setup.c"
 $$pre_trunc = HEAP8[$1>>0]|0; //@line 126 "SIDH_v1.0/SIDH_setup.c"
 $49 = $$pre_trunc&1; //@line 126 "SIDH_v1.0/SIDH_setup.c"
 STACKTOP = sp;return ($49|0); //@line 126 "SIDH_v1.0/SIDH_setup.c"
}
function _SIDH_curve_allocate($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $2 = $0;
 $6 = $2; //@line 59 "SIDH_v1.0/SIDH_setup.c"
 $7 = ((($6)) + 12|0); //@line 59 "SIDH_v1.0/SIDH_setup.c"
 $8 = HEAP32[$7>>2]|0; //@line 59 "SIDH_v1.0/SIDH_setup.c"
 $9 = (($8) + 7)|0; //@line 59 "SIDH_v1.0/SIDH_setup.c"
 $10 = (($9>>>0) / 8)&-1; //@line 59 "SIDH_v1.0/SIDH_setup.c"
 $3 = $10; //@line 59 "SIDH_v1.0/SIDH_setup.c"
 $11 = $2; //@line 60 "SIDH_v1.0/SIDH_setup.c"
 $12 = ((($11)) + 16|0); //@line 60 "SIDH_v1.0/SIDH_setup.c"
 $13 = HEAP32[$12>>2]|0; //@line 60 "SIDH_v1.0/SIDH_setup.c"
 $14 = (($13) + 7)|0; //@line 60 "SIDH_v1.0/SIDH_setup.c"
 $15 = (($14>>>0) / 8)&-1; //@line 60 "SIDH_v1.0/SIDH_setup.c"
 $4 = $15; //@line 60 "SIDH_v1.0/SIDH_setup.c"
 $5 = 0; //@line 61 "SIDH_v1.0/SIDH_setup.c"
 $16 = (_calloc(1,88)|0); //@line 63 "SIDH_v1.0/SIDH_setup.c"
 $5 = $16; //@line 63 "SIDH_v1.0/SIDH_setup.c"
 $17 = $3; //@line 64 "SIDH_v1.0/SIDH_setup.c"
 $18 = (_calloc(1,$17)|0); //@line 64 "SIDH_v1.0/SIDH_setup.c"
 $19 = $5; //@line 64 "SIDH_v1.0/SIDH_setup.c"
 $20 = ((($19)) + 24|0); //@line 64 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$20>>2] = $18; //@line 64 "SIDH_v1.0/SIDH_setup.c"
 $21 = $3; //@line 65 "SIDH_v1.0/SIDH_setup.c"
 $22 = (_calloc(1,$21)|0); //@line 65 "SIDH_v1.0/SIDH_setup.c"
 $23 = $5; //@line 65 "SIDH_v1.0/SIDH_setup.c"
 $24 = ((($23)) + 28|0); //@line 65 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$24>>2] = $22; //@line 65 "SIDH_v1.0/SIDH_setup.c"
 $25 = $3; //@line 66 "SIDH_v1.0/SIDH_setup.c"
 $26 = (_calloc(1,$25)|0); //@line 66 "SIDH_v1.0/SIDH_setup.c"
 $27 = $5; //@line 66 "SIDH_v1.0/SIDH_setup.c"
 $28 = ((($27)) + 32|0); //@line 66 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$28>>2] = $26; //@line 66 "SIDH_v1.0/SIDH_setup.c"
 $29 = $4; //@line 67 "SIDH_v1.0/SIDH_setup.c"
 $30 = (_calloc(1,$29)|0); //@line 67 "SIDH_v1.0/SIDH_setup.c"
 $31 = $5; //@line 67 "SIDH_v1.0/SIDH_setup.c"
 $32 = ((($31)) + 40|0); //@line 67 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$32>>2] = $30; //@line 67 "SIDH_v1.0/SIDH_setup.c"
 $33 = $4; //@line 68 "SIDH_v1.0/SIDH_setup.c"
 $34 = (_calloc(1,$33)|0); //@line 68 "SIDH_v1.0/SIDH_setup.c"
 $35 = $5; //@line 68 "SIDH_v1.0/SIDH_setup.c"
 $36 = ((($35)) + 52|0); //@line 68 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$36>>2] = $34; //@line 68 "SIDH_v1.0/SIDH_setup.c"
 $37 = $3; //@line 69 "SIDH_v1.0/SIDH_setup.c"
 $38 = $37<<1; //@line 69 "SIDH_v1.0/SIDH_setup.c"
 $39 = (_calloc(1,$38)|0); //@line 69 "SIDH_v1.0/SIDH_setup.c"
 $40 = $5; //@line 69 "SIDH_v1.0/SIDH_setup.c"
 $41 = ((($40)) + 56|0); //@line 69 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$41>>2] = $39; //@line 69 "SIDH_v1.0/SIDH_setup.c"
 $42 = $3; //@line 70 "SIDH_v1.0/SIDH_setup.c"
 $43 = $42<<1; //@line 70 "SIDH_v1.0/SIDH_setup.c"
 $44 = (_calloc(1,$43)|0); //@line 70 "SIDH_v1.0/SIDH_setup.c"
 $45 = $5; //@line 70 "SIDH_v1.0/SIDH_setup.c"
 $46 = ((($45)) + 60|0); //@line 70 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$46>>2] = $44; //@line 70 "SIDH_v1.0/SIDH_setup.c"
 $47 = $3; //@line 71 "SIDH_v1.0/SIDH_setup.c"
 $48 = (_calloc(1,$47)|0); //@line 71 "SIDH_v1.0/SIDH_setup.c"
 $49 = $5; //@line 71 "SIDH_v1.0/SIDH_setup.c"
 $50 = ((($49)) + 68|0); //@line 71 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$50>>2] = $48; //@line 71 "SIDH_v1.0/SIDH_setup.c"
 $51 = $3; //@line 72 "SIDH_v1.0/SIDH_setup.c"
 $52 = (_calloc(1,$51)|0); //@line 72 "SIDH_v1.0/SIDH_setup.c"
 $53 = $5; //@line 72 "SIDH_v1.0/SIDH_setup.c"
 $54 = ((($53)) + 72|0); //@line 72 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$54>>2] = $52; //@line 72 "SIDH_v1.0/SIDH_setup.c"
 $55 = $3; //@line 73 "SIDH_v1.0/SIDH_setup.c"
 $56 = (_calloc(1,$55)|0); //@line 73 "SIDH_v1.0/SIDH_setup.c"
 $57 = $5; //@line 73 "SIDH_v1.0/SIDH_setup.c"
 $58 = ((($57)) + 76|0); //@line 73 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$58>>2] = $56; //@line 73 "SIDH_v1.0/SIDH_setup.c"
 $59 = $3; //@line 74 "SIDH_v1.0/SIDH_setup.c"
 $60 = (_calloc(1,$59)|0); //@line 74 "SIDH_v1.0/SIDH_setup.c"
 $61 = $5; //@line 74 "SIDH_v1.0/SIDH_setup.c"
 $62 = ((($61)) + 80|0); //@line 74 "SIDH_v1.0/SIDH_setup.c"
 HEAP32[$62>>2] = $60; //@line 74 "SIDH_v1.0/SIDH_setup.c"
 $63 = $5; //@line 76 "SIDH_v1.0/SIDH_setup.c"
 $64 = (_is_CurveIsogenyStruct_null($63)|0); //@line 76 "SIDH_v1.0/SIDH_setup.c"
 if ($64) {
  $1 = 0; //@line 77 "SIDH_v1.0/SIDH_setup.c"
  $66 = $1; //@line 80 "SIDH_v1.0/SIDH_setup.c"
  STACKTOP = sp;return ($66|0); //@line 80 "SIDH_v1.0/SIDH_setup.c"
 } else {
  $65 = $5; //@line 79 "SIDH_v1.0/SIDH_setup.c"
  $1 = $65; //@line 79 "SIDH_v1.0/SIDH_setup.c"
  $66 = $1; //@line 80 "SIDH_v1.0/SIDH_setup.c"
  STACKTOP = sp;return ($66|0); //@line 80 "SIDH_v1.0/SIDH_setup.c"
 }
 return (0)|0;
}
function _random_mod_order($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0;
 var $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0;
 var $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $or$cond = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 144|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(144|0);
 $10 = sp + 56|0;
 $11 = sp + 8|0;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = 0; //@line 165 "SIDH_v1.0/SIDH_setup.c"
 dest=$10; stop=dest+48|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0)); //@line 166 "SIDH_v1.0/SIDH_setup.c"
 dest=$11; stop=dest+48|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0)); //@line 166 "SIDH_v1.0/SIDH_setup.c"
 $13 = 3; //@line 168 "SIDH_v1.0/SIDH_setup.c"
 $14 = $4; //@line 170 "SIDH_v1.0/SIDH_setup.c"
 $15 = ($14|0)==(0|0); //@line 170 "SIDH_v1.0/SIDH_setup.c"
 if (!($15)) {
  $16 = $6; //@line 170 "SIDH_v1.0/SIDH_setup.c"
  $17 = (_is_CurveIsogenyStruct_null($16)|0); //@line 170 "SIDH_v1.0/SIDH_setup.c"
  $18 = $5; //@line 170 "SIDH_v1.0/SIDH_setup.c"
  $19 = ($18>>>0)>(1); //@line 170 "SIDH_v1.0/SIDH_setup.c"
  $or$cond = $17 | $19; //@line 170 "SIDH_v1.0/SIDH_setup.c"
  if (!($or$cond)) {
   $20 = $4; //@line 174 "SIDH_v1.0/SIDH_setup.c"
   _clear_words($20,12); //@line 174 "SIDH_v1.0/SIDH_setup.c"
   HEAP32[$10>>2] = 2; //@line 175 "SIDH_v1.0/SIDH_setup.c"
   $21 = $5; //@line 176 "SIDH_v1.0/SIDH_setup.c"
   $22 = ($21|0)==(0); //@line 176 "SIDH_v1.0/SIDH_setup.c"
   $23 = $6; //@line 177 "SIDH_v1.0/SIDH_setup.c"
   if ($22) {
    $24 = ((($23)) + 36|0); //@line 177 "SIDH_v1.0/SIDH_setup.c"
    $25 = HEAP32[$24>>2]|0; //@line 177 "SIDH_v1.0/SIDH_setup.c"
    $26 = (($25) + 7)|0; //@line 177 "SIDH_v1.0/SIDH_setup.c"
    $27 = (($26>>>0) / 8)&-1; //@line 177 "SIDH_v1.0/SIDH_setup.c"
    $8 = $27; //@line 177 "SIDH_v1.0/SIDH_setup.c"
    $28 = $6; //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $29 = ((($28)) + 36|0); //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $30 = HEAP32[$29>>2]|0; //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $31 = (($30) + 32)|0; //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $32 = (($31) - 1)|0; //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $33 = (($32>>>0) / 32)&-1; //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $9 = $33; //@line 178 "SIDH_v1.0/SIDH_setup.c"
    $12 = 7; //@line 179 "SIDH_v1.0/SIDH_setup.c"
    $34 = $6; //@line 180 "SIDH_v1.0/SIDH_setup.c"
    $35 = ((($34)) + 40|0); //@line 180 "SIDH_v1.0/SIDH_setup.c"
    $36 = HEAP32[$35>>2]|0; //@line 180 "SIDH_v1.0/SIDH_setup.c"
    $37 = $9; //@line 180 "SIDH_v1.0/SIDH_setup.c"
    _copy_words($36,$11,$37); //@line 180 "SIDH_v1.0/SIDH_setup.c"
    $38 = $9; //@line 181 "SIDH_v1.0/SIDH_setup.c"
    _mp_shiftr1($11,$38); //@line 181 "SIDH_v1.0/SIDH_setup.c"
    $39 = $9; //@line 182 "SIDH_v1.0/SIDH_setup.c"
    (_mp_sub($11,$10,$11,$39)|0); //@line 182 "SIDH_v1.0/SIDH_setup.c"
   } else {
    $40 = ((($23)) + 44|0); //@line 184 "SIDH_v1.0/SIDH_setup.c"
    $41 = HEAP32[$40>>2]|0; //@line 184 "SIDH_v1.0/SIDH_setup.c"
    $42 = (($41) + 7)|0; //@line 184 "SIDH_v1.0/SIDH_setup.c"
    $43 = (($42>>>0) / 8)&-1; //@line 184 "SIDH_v1.0/SIDH_setup.c"
    $8 = $43; //@line 184 "SIDH_v1.0/SIDH_setup.c"
    $44 = $6; //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $45 = ((($44)) + 44|0); //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $46 = HEAP32[$45>>2]|0; //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $47 = (($46) + 32)|0; //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $48 = (($47) - 1)|0; //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $49 = (($48>>>0) / 32)&-1; //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $9 = $49; //@line 185 "SIDH_v1.0/SIDH_setup.c"
    $12 = 3; //@line 186 "SIDH_v1.0/SIDH_setup.c"
    $50 = $9; //@line 187 "SIDH_v1.0/SIDH_setup.c"
    (_mp_sub(2360,$10,$11,$50)|0); //@line 187 "SIDH_v1.0/SIDH_setup.c"
   }
   while(1) {
    $51 = $7; //@line 191 "SIDH_v1.0/SIDH_setup.c"
    $52 = (($51) + 1)|0; //@line 191 "SIDH_v1.0/SIDH_setup.c"
    $7 = $52; //@line 191 "SIDH_v1.0/SIDH_setup.c"
    $53 = $7; //@line 192 "SIDH_v1.0/SIDH_setup.c"
    $54 = ($53>>>0)>(100); //@line 192 "SIDH_v1.0/SIDH_setup.c"
    if ($54) {
     label = 8;
     break;
    }
    $55 = $6; //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $56 = ((($55)) + 84|0); //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $57 = HEAP32[$56>>2]|0; //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $58 = $8; //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $59 = $4; //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $60 = (FUNCTION_TABLE_iii[$57 & 31]($58,$59)|0); //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $13 = $60; //@line 195 "SIDH_v1.0/SIDH_setup.c"
    $61 = $13; //@line 196 "SIDH_v1.0/SIDH_setup.c"
    $62 = ($61|0)!=(0); //@line 196 "SIDH_v1.0/SIDH_setup.c"
    if ($62) {
     label = 10;
     break;
    }
    $64 = $12; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $65 = $64&255; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $66 = $8; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $67 = (($66) - 1)|0; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $68 = $4; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $69 = (($68) + ($67)|0); //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $70 = HEAP8[$69>>0]|0; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $71 = $70&255; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $72 = $71 & $65; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $73 = $72&255; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    HEAP8[$69>>0] = $73; //@line 199 "SIDH_v1.0/SIDH_setup.c"
    $74 = $4; //@line 200 "SIDH_v1.0/SIDH_setup.c"
    $75 = $9; //@line 200 "SIDH_v1.0/SIDH_setup.c"
    $76 = (_mp_sub($11,$74,$10,$75)|0); //@line 200 "SIDH_v1.0/SIDH_setup.c"
    $77 = ($76|0)==(1); //@line 200 "SIDH_v1.0/SIDH_setup.c"
    if (!($77)) {
     label = 12;
     break;
    }
   }
   if ((label|0) == 8) {
    $3 = 9; //@line 193 "SIDH_v1.0/SIDH_setup.c"
    $91 = $3; //@line 212 "SIDH_v1.0/SIDH_setup.c"
    STACKTOP = sp;return ($91|0); //@line 212 "SIDH_v1.0/SIDH_setup.c"
   }
   else if ((label|0) == 10) {
    $63 = $13; //@line 197 "SIDH_v1.0/SIDH_setup.c"
    $3 = $63; //@line 197 "SIDH_v1.0/SIDH_setup.c"
    $91 = $3; //@line 212 "SIDH_v1.0/SIDH_setup.c"
    STACKTOP = sp;return ($91|0); //@line 212 "SIDH_v1.0/SIDH_setup.c"
   }
   else if ((label|0) == 12) {
    _clear_words($10,12); //@line 202 "SIDH_v1.0/SIDH_setup.c"
    HEAP32[$10>>2] = 1; //@line 203 "SIDH_v1.0/SIDH_setup.c"
    $78 = $4; //@line 204 "SIDH_v1.0/SIDH_setup.c"
    $79 = $4; //@line 204 "SIDH_v1.0/SIDH_setup.c"
    $80 = $9; //@line 204 "SIDH_v1.0/SIDH_setup.c"
    (_mp_add($78,$10,$79,$80)|0); //@line 204 "SIDH_v1.0/SIDH_setup.c"
    $81 = $4; //@line 205 "SIDH_v1.0/SIDH_setup.c"
    $82 = $9; //@line 205 "SIDH_v1.0/SIDH_setup.c"
    _copy_words($81,$10,$82); //@line 205 "SIDH_v1.0/SIDH_setup.c"
    $83 = $4; //@line 206 "SIDH_v1.0/SIDH_setup.c"
    $84 = $9; //@line 206 "SIDH_v1.0/SIDH_setup.c"
    _mp_shiftl1($83,$84); //@line 206 "SIDH_v1.0/SIDH_setup.c"
    $85 = $5; //@line 207 "SIDH_v1.0/SIDH_setup.c"
    $86 = ($85|0)==(1); //@line 207 "SIDH_v1.0/SIDH_setup.c"
    if ($86) {
     $87 = $4; //@line 208 "SIDH_v1.0/SIDH_setup.c"
     $88 = $4; //@line 208 "SIDH_v1.0/SIDH_setup.c"
     $89 = $9; //@line 208 "SIDH_v1.0/SIDH_setup.c"
     (_mp_add($87,$10,$88,$89)|0); //@line 208 "SIDH_v1.0/SIDH_setup.c"
    }
    $90 = $13; //@line 211 "SIDH_v1.0/SIDH_setup.c"
    $3 = $90; //@line 211 "SIDH_v1.0/SIDH_setup.c"
    $91 = $3; //@line 212 "SIDH_v1.0/SIDH_setup.c"
    STACKTOP = sp;return ($91|0); //@line 212 "SIDH_v1.0/SIDH_setup.c"
   }
  }
 }
 $3 = 6; //@line 171 "SIDH_v1.0/SIDH_setup.c"
 $91 = $3; //@line 212 "SIDH_v1.0/SIDH_setup.c"
 STACKTOP = sp;return ($91|0); //@line 212 "SIDH_v1.0/SIDH_setup.c"
}
function _clear_words($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $6 = $2; //@line 262 "SIDH_v1.0/SIDH_setup.c"
 $5 = $6; //@line 262 "SIDH_v1.0/SIDH_setup.c"
 $4 = 0; //@line 264 "SIDH_v1.0/SIDH_setup.c"
 while(1) {
  $7 = $4; //@line 264 "SIDH_v1.0/SIDH_setup.c"
  $8 = $3; //@line 264 "SIDH_v1.0/SIDH_setup.c"
  $9 = ($7>>>0)<($8>>>0); //@line 264 "SIDH_v1.0/SIDH_setup.c"
  if (!($9)) {
   break;
  }
  $10 = $4; //@line 265 "SIDH_v1.0/SIDH_setup.c"
  $11 = $5; //@line 265 "SIDH_v1.0/SIDH_setup.c"
  $12 = (($11) + ($10<<2)|0); //@line 265 "SIDH_v1.0/SIDH_setup.c"
  HEAP32[$12>>2] = 0; //@line 265 "SIDH_v1.0/SIDH_setup.c"
  $13 = $4; //@line 264 "SIDH_v1.0/SIDH_setup.c"
  $14 = (($13) + 1)|0; //@line 264 "SIDH_v1.0/SIDH_setup.c"
  $4 = $14; //@line 264 "SIDH_v1.0/SIDH_setup.c"
 }
 STACKTOP = sp;return; //@line 267 "SIDH_v1.0/SIDH_setup.c"
}
function _j_inv($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 400|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(400|0);
 $6 = sp + 192|0;
 $7 = sp;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $8 = $3; //@line 21 "SIDH_v1.0/ec_isogeny.c"
 $9 = $5; //@line 21 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($8,$9); //@line 21 "SIDH_v1.0/ec_isogeny.c"
 $10 = $4; //@line 22 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($10,$7); //@line 22 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($7,$7,$6); //@line 23 "SIDH_v1.0/ec_isogeny.c"
 $11 = $5; //@line 24 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($11,$6,$6); //@line 24 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($6,$7,$6); //@line 25 "SIDH_v1.0/ec_isogeny.c"
 $12 = $5; //@line 26 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($6,$7,$12); //@line 26 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($7,$7); //@line 27 "SIDH_v1.0/ec_isogeny.c"
 $13 = $5; //@line 28 "SIDH_v1.0/ec_isogeny.c"
 $14 = $5; //@line 28 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($13,$7,$14); //@line 28 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($6,$6,$6); //@line 29 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($6,$6,$6); //@line 30 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($6,$7); //@line 31 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($6,$7,$6); //@line 32 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($6,$6,$6); //@line 33 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($6,$6,$6); //@line 34 "SIDH_v1.0/ec_isogeny.c"
 $15 = $5; //@line 35 "SIDH_v1.0/ec_isogeny.c"
 _fp2inv751_mont($15); //@line 35 "SIDH_v1.0/ec_isogeny.c"
 $16 = $5; //@line 36 "SIDH_v1.0/ec_isogeny.c"
 $17 = $5; //@line 36 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($16,$6,$17); //@line 36 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 37 "SIDH_v1.0/ec_isogeny.c"
}
function _xDBLADD($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 592|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(592|0);
 $8 = sp + 384|0;
 $9 = sp + 192|0;
 $10 = sp;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 $11 = $4; //@line 46 "SIDH_v1.0/ec_isogeny.c"
 $12 = $4; //@line 46 "SIDH_v1.0/ec_isogeny.c"
 $13 = ((($12)) + 192|0); //@line 46 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($11,$13,$8); //@line 46 "SIDH_v1.0/ec_isogeny.c"
 $14 = $4; //@line 47 "SIDH_v1.0/ec_isogeny.c"
 $15 = $4; //@line 47 "SIDH_v1.0/ec_isogeny.c"
 $16 = ((($15)) + 192|0); //@line 47 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($14,$16,$9); //@line 47 "SIDH_v1.0/ec_isogeny.c"
 $17 = $4; //@line 48 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($8,$17); //@line 48 "SIDH_v1.0/ec_isogeny.c"
 $18 = $5; //@line 49 "SIDH_v1.0/ec_isogeny.c"
 $19 = $5; //@line 49 "SIDH_v1.0/ec_isogeny.c"
 $20 = ((($19)) + 192|0); //@line 49 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($18,$20,$10); //@line 49 "SIDH_v1.0/ec_isogeny.c"
 $21 = $5; //@line 50 "SIDH_v1.0/ec_isogeny.c"
 $22 = $5; //@line 50 "SIDH_v1.0/ec_isogeny.c"
 $23 = ((($22)) + 192|0); //@line 50 "SIDH_v1.0/ec_isogeny.c"
 $24 = $5; //@line 50 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($21,$23,$24); //@line 50 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($8,$10,$8); //@line 51 "SIDH_v1.0/ec_isogeny.c"
 $25 = $4; //@line 52 "SIDH_v1.0/ec_isogeny.c"
 $26 = ((($25)) + 192|0); //@line 52 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($9,$26); //@line 52 "SIDH_v1.0/ec_isogeny.c"
 $27 = $5; //@line 53 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($9,$27,$9); //@line 53 "SIDH_v1.0/ec_isogeny.c"
 $28 = $4; //@line 54 "SIDH_v1.0/ec_isogeny.c"
 $29 = $4; //@line 54 "SIDH_v1.0/ec_isogeny.c"
 $30 = ((($29)) + 192|0); //@line 54 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($28,$30,$10); //@line 54 "SIDH_v1.0/ec_isogeny.c"
 $31 = $4; //@line 55 "SIDH_v1.0/ec_isogeny.c"
 $32 = $4; //@line 55 "SIDH_v1.0/ec_isogeny.c"
 $33 = ((($32)) + 192|0); //@line 55 "SIDH_v1.0/ec_isogeny.c"
 $34 = $4; //@line 55 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($31,$33,$34); //@line 55 "SIDH_v1.0/ec_isogeny.c"
 $35 = $7; //@line 56 "SIDH_v1.0/ec_isogeny.c"
 $36 = $5; //@line 56 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($10,$35,$36); //@line 56 "SIDH_v1.0/ec_isogeny.c"
 $37 = $5; //@line 57 "SIDH_v1.0/ec_isogeny.c"
 $38 = ((($37)) + 192|0); //@line 57 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($8,$9,$38); //@line 57 "SIDH_v1.0/ec_isogeny.c"
 $39 = $5; //@line 58 "SIDH_v1.0/ec_isogeny.c"
 $40 = $4; //@line 58 "SIDH_v1.0/ec_isogeny.c"
 $41 = ((($40)) + 192|0); //@line 58 "SIDH_v1.0/ec_isogeny.c"
 $42 = $4; //@line 58 "SIDH_v1.0/ec_isogeny.c"
 $43 = ((($42)) + 192|0); //@line 58 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($39,$41,$43); //@line 58 "SIDH_v1.0/ec_isogeny.c"
 $44 = $5; //@line 59 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($8,$9,$44); //@line 59 "SIDH_v1.0/ec_isogeny.c"
 $45 = $4; //@line 60 "SIDH_v1.0/ec_isogeny.c"
 $46 = ((($45)) + 192|0); //@line 60 "SIDH_v1.0/ec_isogeny.c"
 $47 = $4; //@line 60 "SIDH_v1.0/ec_isogeny.c"
 $48 = ((($47)) + 192|0); //@line 60 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($46,$10,$48); //@line 60 "SIDH_v1.0/ec_isogeny.c"
 $49 = $5; //@line 61 "SIDH_v1.0/ec_isogeny.c"
 $50 = ((($49)) + 192|0); //@line 61 "SIDH_v1.0/ec_isogeny.c"
 $51 = $5; //@line 61 "SIDH_v1.0/ec_isogeny.c"
 $52 = ((($51)) + 192|0); //@line 61 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($50,$52); //@line 61 "SIDH_v1.0/ec_isogeny.c"
 $53 = $5; //@line 62 "SIDH_v1.0/ec_isogeny.c"
 $54 = $5; //@line 62 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($53,$54); //@line 62 "SIDH_v1.0/ec_isogeny.c"
 $55 = $5; //@line 63 "SIDH_v1.0/ec_isogeny.c"
 $56 = ((($55)) + 192|0); //@line 63 "SIDH_v1.0/ec_isogeny.c"
 $57 = $6; //@line 63 "SIDH_v1.0/ec_isogeny.c"
 $58 = $5; //@line 63 "SIDH_v1.0/ec_isogeny.c"
 $59 = ((($58)) + 192|0); //@line 63 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($56,$57,$59); //@line 63 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 64 "SIDH_v1.0/ec_isogeny.c"
}
function _xDBL($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 400|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(400|0);
 $8 = sp + 192|0;
 $9 = sp;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 $10 = $4; //@line 73 "SIDH_v1.0/ec_isogeny.c"
 $11 = $4; //@line 73 "SIDH_v1.0/ec_isogeny.c"
 $12 = ((($11)) + 192|0); //@line 73 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($10,$12,$8); //@line 73 "SIDH_v1.0/ec_isogeny.c"
 $13 = $4; //@line 74 "SIDH_v1.0/ec_isogeny.c"
 $14 = $4; //@line 74 "SIDH_v1.0/ec_isogeny.c"
 $15 = ((($14)) + 192|0); //@line 74 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($13,$15,$9); //@line 74 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($8,$8); //@line 75 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($9,$9); //@line 76 "SIDH_v1.0/ec_isogeny.c"
 $16 = $7; //@line 77 "SIDH_v1.0/ec_isogeny.c"
 $17 = $5; //@line 77 "SIDH_v1.0/ec_isogeny.c"
 $18 = ((($17)) + 192|0); //@line 77 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($16,$8,$18); //@line 77 "SIDH_v1.0/ec_isogeny.c"
 $19 = $5; //@line 78 "SIDH_v1.0/ec_isogeny.c"
 $20 = ((($19)) + 192|0); //@line 78 "SIDH_v1.0/ec_isogeny.c"
 $21 = $5; //@line 78 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($9,$20,$21); //@line 78 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($9,$8,$9); //@line 79 "SIDH_v1.0/ec_isogeny.c"
 $22 = $6; //@line 80 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($22,$9,$8); //@line 80 "SIDH_v1.0/ec_isogeny.c"
 $23 = $5; //@line 81 "SIDH_v1.0/ec_isogeny.c"
 $24 = ((($23)) + 192|0); //@line 81 "SIDH_v1.0/ec_isogeny.c"
 $25 = $5; //@line 81 "SIDH_v1.0/ec_isogeny.c"
 $26 = ((($25)) + 192|0); //@line 81 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($24,$8,$26); //@line 81 "SIDH_v1.0/ec_isogeny.c"
 $27 = $5; //@line 82 "SIDH_v1.0/ec_isogeny.c"
 $28 = ((($27)) + 192|0); //@line 82 "SIDH_v1.0/ec_isogeny.c"
 $29 = $5; //@line 82 "SIDH_v1.0/ec_isogeny.c"
 $30 = ((($29)) + 192|0); //@line 82 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($28,$9,$30); //@line 82 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 83 "SIDH_v1.0/ec_isogeny.c"
}
function _xDBLe($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 416|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(416|0);
 $10 = sp + 200|0;
 $11 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 $7 = $2;
 $8 = $3;
 $9 = $4;
 $13 = $8; //@line 93 "SIDH_v1.0/ec_isogeny.c"
 $14 = $8; //@line 93 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($13,$14,$10); //@line 93 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($10,$10,$11); //@line 94 "SIDH_v1.0/ec_isogeny.c"
 $15 = $7; //@line 95 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($10,$15,$10); //@line 95 "SIDH_v1.0/ec_isogeny.c"
 $16 = $5; //@line 96 "SIDH_v1.0/ec_isogeny.c"
 $17 = $6; //@line 96 "SIDH_v1.0/ec_isogeny.c"
 _copy_words($16,$17,96); //@line 96 "SIDH_v1.0/ec_isogeny.c"
 $12 = 0; //@line 98 "SIDH_v1.0/ec_isogeny.c"
 while(1) {
  $18 = $12; //@line 98 "SIDH_v1.0/ec_isogeny.c"
  $19 = $9; //@line 98 "SIDH_v1.0/ec_isogeny.c"
  $20 = ($18|0)<($19|0); //@line 98 "SIDH_v1.0/ec_isogeny.c"
  if (!($20)) {
   break;
  }
  $21 = $6; //@line 99 "SIDH_v1.0/ec_isogeny.c"
  $22 = $6; //@line 99 "SIDH_v1.0/ec_isogeny.c"
  _xDBL($21,$22,$10,$11); //@line 99 "SIDH_v1.0/ec_isogeny.c"
  $23 = $12; //@line 98 "SIDH_v1.0/ec_isogeny.c"
  $24 = (($23) + 1)|0; //@line 98 "SIDH_v1.0/ec_isogeny.c"
  $12 = $24; //@line 98 "SIDH_v1.0/ec_isogeny.c"
 }
 STACKTOP = sp;return; //@line 101 "SIDH_v1.0/ec_isogeny.c"
}
function _xADD($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 400|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(400|0);
 $6 = sp + 192|0;
 $7 = sp;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $8 = $3; //@line 110 "SIDH_v1.0/ec_isogeny.c"
 $9 = $3; //@line 110 "SIDH_v1.0/ec_isogeny.c"
 $10 = ((($9)) + 192|0); //@line 110 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($8,$10,$6); //@line 110 "SIDH_v1.0/ec_isogeny.c"
 $11 = $3; //@line 111 "SIDH_v1.0/ec_isogeny.c"
 $12 = $3; //@line 111 "SIDH_v1.0/ec_isogeny.c"
 $13 = ((($12)) + 192|0); //@line 111 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($11,$13,$7); //@line 111 "SIDH_v1.0/ec_isogeny.c"
 $14 = $4; //@line 112 "SIDH_v1.0/ec_isogeny.c"
 $15 = $4; //@line 112 "SIDH_v1.0/ec_isogeny.c"
 $16 = ((($15)) + 192|0); //@line 112 "SIDH_v1.0/ec_isogeny.c"
 $17 = $3; //@line 112 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($14,$16,$17); //@line 112 "SIDH_v1.0/ec_isogeny.c"
 $18 = $4; //@line 113 "SIDH_v1.0/ec_isogeny.c"
 $19 = $4; //@line 113 "SIDH_v1.0/ec_isogeny.c"
 $20 = ((($19)) + 192|0); //@line 113 "SIDH_v1.0/ec_isogeny.c"
 $21 = $3; //@line 113 "SIDH_v1.0/ec_isogeny.c"
 $22 = ((($21)) + 192|0); //@line 113 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($18,$20,$22); //@line 113 "SIDH_v1.0/ec_isogeny.c"
 $23 = $3; //@line 114 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($6,$23,$6); //@line 114 "SIDH_v1.0/ec_isogeny.c"
 $24 = $3; //@line 115 "SIDH_v1.0/ec_isogeny.c"
 $25 = ((($24)) + 192|0); //@line 115 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($7,$25,$7); //@line 115 "SIDH_v1.0/ec_isogeny.c"
 $26 = $3; //@line 116 "SIDH_v1.0/ec_isogeny.c"
 $27 = ((($26)) + 192|0); //@line 116 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($6,$7,$27); //@line 116 "SIDH_v1.0/ec_isogeny.c"
 $28 = $3; //@line 117 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($6,$7,$28); //@line 117 "SIDH_v1.0/ec_isogeny.c"
 $29 = $3; //@line 118 "SIDH_v1.0/ec_isogeny.c"
 $30 = ((($29)) + 192|0); //@line 118 "SIDH_v1.0/ec_isogeny.c"
 $31 = $3; //@line 118 "SIDH_v1.0/ec_isogeny.c"
 $32 = ((($31)) + 192|0); //@line 118 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($30,$32); //@line 118 "SIDH_v1.0/ec_isogeny.c"
 $33 = $3; //@line 119 "SIDH_v1.0/ec_isogeny.c"
 $34 = $3; //@line 119 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($33,$34); //@line 119 "SIDH_v1.0/ec_isogeny.c"
 $35 = $3; //@line 120 "SIDH_v1.0/ec_isogeny.c"
 $36 = ((($35)) + 192|0); //@line 120 "SIDH_v1.0/ec_isogeny.c"
 $37 = $5; //@line 120 "SIDH_v1.0/ec_isogeny.c"
 $38 = $3; //@line 120 "SIDH_v1.0/ec_isogeny.c"
 $39 = ((($38)) + 192|0); //@line 120 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($36,$37,$39); //@line 120 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 121 "SIDH_v1.0/ec_isogeny.c"
}
function _xDBLADD_basefield($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 304|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(304|0);
 $8 = sp + 192|0;
 $9 = sp + 96|0;
 $10 = sp;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 $11 = $4; //@line 152 "SIDH_v1.0/ec_isogeny.c"
 $12 = $4; //@line 152 "SIDH_v1.0/ec_isogeny.c"
 $13 = ((($12)) + 96|0); //@line 152 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($11,$13,$8); //@line 152 "SIDH_v1.0/ec_isogeny.c"
 $14 = $4; //@line 153 "SIDH_v1.0/ec_isogeny.c"
 $15 = $4; //@line 153 "SIDH_v1.0/ec_isogeny.c"
 $16 = ((($15)) + 96|0); //@line 153 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($14,$16,$9); //@line 153 "SIDH_v1.0/ec_isogeny.c"
 $17 = $4; //@line 154 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($8,$17); //@line 154 "SIDH_v1.0/ec_isogeny.c"
 $18 = $5; //@line 155 "SIDH_v1.0/ec_isogeny.c"
 $19 = $5; //@line 155 "SIDH_v1.0/ec_isogeny.c"
 $20 = ((($19)) + 96|0); //@line 155 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($18,$20,$10); //@line 155 "SIDH_v1.0/ec_isogeny.c"
 $21 = $5; //@line 156 "SIDH_v1.0/ec_isogeny.c"
 $22 = $5; //@line 156 "SIDH_v1.0/ec_isogeny.c"
 $23 = ((($22)) + 96|0); //@line 156 "SIDH_v1.0/ec_isogeny.c"
 $24 = $5; //@line 156 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($21,$23,$24); //@line 156 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($8,$10,$8); //@line 157 "SIDH_v1.0/ec_isogeny.c"
 $25 = $4; //@line 158 "SIDH_v1.0/ec_isogeny.c"
 $26 = ((($25)) + 96|0); //@line 158 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($9,$26); //@line 158 "SIDH_v1.0/ec_isogeny.c"
 $27 = $5; //@line 159 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($9,$27,$9); //@line 159 "SIDH_v1.0/ec_isogeny.c"
 $28 = $4; //@line 160 "SIDH_v1.0/ec_isogeny.c"
 $29 = $4; //@line 160 "SIDH_v1.0/ec_isogeny.c"
 $30 = ((($29)) + 96|0); //@line 160 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($28,$30,$10); //@line 160 "SIDH_v1.0/ec_isogeny.c"
 $31 = $7; //@line 162 "SIDH_v1.0/ec_isogeny.c"
 $32 = HEAP32[$31>>2]|0; //@line 162 "SIDH_v1.0/ec_isogeny.c"
 $33 = ($32|0)==(1); //@line 162 "SIDH_v1.0/ec_isogeny.c"
 $34 = $4; //@line 163 "SIDH_v1.0/ec_isogeny.c"
 if ($33) {
  $35 = ((($34)) + 96|0); //@line 163 "SIDH_v1.0/ec_isogeny.c"
  $36 = $4; //@line 163 "SIDH_v1.0/ec_isogeny.c"
  $37 = ((($36)) + 96|0); //@line 163 "SIDH_v1.0/ec_isogeny.c"
  $38 = $4; //@line 163 "SIDH_v1.0/ec_isogeny.c"
  $39 = ((($38)) + 96|0); //@line 163 "SIDH_v1.0/ec_isogeny.c"
  _fpadd751($35,$37,$39); //@line 163 "SIDH_v1.0/ec_isogeny.c"
  $40 = $4; //@line 164 "SIDH_v1.0/ec_isogeny.c"
  $41 = $4; //@line 164 "SIDH_v1.0/ec_isogeny.c"
  $42 = ((($41)) + 96|0); //@line 164 "SIDH_v1.0/ec_isogeny.c"
  $43 = $4; //@line 164 "SIDH_v1.0/ec_isogeny.c"
  _fpmul751_mont($40,$42,$43); //@line 164 "SIDH_v1.0/ec_isogeny.c"
  $44 = $4; //@line 165 "SIDH_v1.0/ec_isogeny.c"
  $45 = ((($44)) + 96|0); //@line 165 "SIDH_v1.0/ec_isogeny.c"
  $46 = $4; //@line 165 "SIDH_v1.0/ec_isogeny.c"
  $47 = ((($46)) + 96|0); //@line 165 "SIDH_v1.0/ec_isogeny.c"
  _fpadd751($10,$45,$47); //@line 165 "SIDH_v1.0/ec_isogeny.c"
 } else {
  $48 = $4; //@line 167 "SIDH_v1.0/ec_isogeny.c"
  $49 = ((($48)) + 96|0); //@line 167 "SIDH_v1.0/ec_isogeny.c"
  $50 = $4; //@line 167 "SIDH_v1.0/ec_isogeny.c"
  _fpmul751_mont($34,$49,$50); //@line 167 "SIDH_v1.0/ec_isogeny.c"
  $51 = $7; //@line 168 "SIDH_v1.0/ec_isogeny.c"
  $52 = $5; //@line 168 "SIDH_v1.0/ec_isogeny.c"
  _fpmul751_mont($51,$10,$52); //@line 168 "SIDH_v1.0/ec_isogeny.c"
  $53 = $4; //@line 169 "SIDH_v1.0/ec_isogeny.c"
  $54 = ((($53)) + 96|0); //@line 169 "SIDH_v1.0/ec_isogeny.c"
  $55 = $5; //@line 169 "SIDH_v1.0/ec_isogeny.c"
  $56 = $4; //@line 169 "SIDH_v1.0/ec_isogeny.c"
  $57 = ((($56)) + 96|0); //@line 169 "SIDH_v1.0/ec_isogeny.c"
  _fpadd751($54,$55,$57); //@line 169 "SIDH_v1.0/ec_isogeny.c"
 }
 $58 = $5; //@line 172 "SIDH_v1.0/ec_isogeny.c"
 $59 = ((($58)) + 96|0); //@line 172 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($8,$9,$59); //@line 172 "SIDH_v1.0/ec_isogeny.c"
 $60 = $5; //@line 173 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($8,$9,$60); //@line 173 "SIDH_v1.0/ec_isogeny.c"
 $61 = $4; //@line 174 "SIDH_v1.0/ec_isogeny.c"
 $62 = ((($61)) + 96|0); //@line 174 "SIDH_v1.0/ec_isogeny.c"
 $63 = $4; //@line 174 "SIDH_v1.0/ec_isogeny.c"
 $64 = ((($63)) + 96|0); //@line 174 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($62,$10,$64); //@line 174 "SIDH_v1.0/ec_isogeny.c"
 $65 = $5; //@line 175 "SIDH_v1.0/ec_isogeny.c"
 $66 = ((($65)) + 96|0); //@line 175 "SIDH_v1.0/ec_isogeny.c"
 $67 = $5; //@line 175 "SIDH_v1.0/ec_isogeny.c"
 $68 = ((($67)) + 96|0); //@line 175 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($66,$68); //@line 175 "SIDH_v1.0/ec_isogeny.c"
 $69 = $5; //@line 176 "SIDH_v1.0/ec_isogeny.c"
 $70 = $5; //@line 176 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($69,$70); //@line 176 "SIDH_v1.0/ec_isogeny.c"
 $71 = $5; //@line 177 "SIDH_v1.0/ec_isogeny.c"
 $72 = ((($71)) + 96|0); //@line 177 "SIDH_v1.0/ec_isogeny.c"
 $73 = $6; //@line 177 "SIDH_v1.0/ec_isogeny.c"
 $74 = $5; //@line 177 "SIDH_v1.0/ec_isogeny.c"
 $75 = ((($74)) + 96|0); //@line 177 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($72,$73,$75); //@line 177 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 178 "SIDH_v1.0/ec_isogeny.c"
}
function _ladder($0,$1,$2,$3,$4,$5,$6,$7) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 $5 = $5|0;
 $6 = $6|0;
 $7 = $7|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $70 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(48|0);
 $8 = $0;
 $9 = $1;
 $10 = $2;
 $11 = $3;
 $12 = $4;
 $13 = $5;
 $14 = $6;
 $15 = $7;
 $16 = 0; //@line 190 "SIDH_v1.0/ec_isogeny.c"
 $20 = $14; //@line 190 "SIDH_v1.0/ec_isogeny.c"
 $21 = (($20) + 32)|0; //@line 190 "SIDH_v1.0/ec_isogeny.c"
 $22 = (($21) - 1)|0; //@line 190 "SIDH_v1.0/ec_isogeny.c"
 $23 = (($22>>>0) / 32)&-1; //@line 190 "SIDH_v1.0/ec_isogeny.c"
 $17 = $23; //@line 190 "SIDH_v1.0/ec_isogeny.c"
 $24 = $15; //@line 195 "SIDH_v1.0/ec_isogeny.c"
 $25 = ((($24)) + 80|0); //@line 195 "SIDH_v1.0/ec_isogeny.c"
 $26 = HEAP32[$25>>2]|0; //@line 195 "SIDH_v1.0/ec_isogeny.c"
 $27 = $10; //@line 195 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($26,$27); //@line 195 "SIDH_v1.0/ec_isogeny.c"
 $28 = $10; //@line 196 "SIDH_v1.0/ec_isogeny.c"
 $29 = ((($28)) + 96|0); //@line 196 "SIDH_v1.0/ec_isogeny.c"
 _fpzero751($29); //@line 196 "SIDH_v1.0/ec_isogeny.c"
 $30 = $8; //@line 197 "SIDH_v1.0/ec_isogeny.c"
 $31 = $11; //@line 197 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($30,$31); //@line 197 "SIDH_v1.0/ec_isogeny.c"
 $32 = $15; //@line 198 "SIDH_v1.0/ec_isogeny.c"
 $33 = ((($32)) + 80|0); //@line 198 "SIDH_v1.0/ec_isogeny.c"
 $34 = HEAP32[$33>>2]|0; //@line 198 "SIDH_v1.0/ec_isogeny.c"
 $35 = $11; //@line 198 "SIDH_v1.0/ec_isogeny.c"
 $36 = ((($35)) + 96|0); //@line 198 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($34,$36); //@line 198 "SIDH_v1.0/ec_isogeny.c"
 $37 = $14; //@line 200 "SIDH_v1.0/ec_isogeny.c"
 $38 = $13; //@line 200 "SIDH_v1.0/ec_isogeny.c"
 $39 = (($37) - ($38))|0; //@line 200 "SIDH_v1.0/ec_isogeny.c"
 $19 = $39; //@line 200 "SIDH_v1.0/ec_isogeny.c"
 while(1) {
  $40 = $19; //@line 200 "SIDH_v1.0/ec_isogeny.c"
  $41 = ($40|0)>(0); //@line 200 "SIDH_v1.0/ec_isogeny.c"
  if (!($41)) {
   break;
  }
  $42 = $9; //@line 201 "SIDH_v1.0/ec_isogeny.c"
  $43 = $17; //@line 201 "SIDH_v1.0/ec_isogeny.c"
  _mp_shiftl1($42,$43); //@line 201 "SIDH_v1.0/ec_isogeny.c"
  $44 = $19; //@line 200 "SIDH_v1.0/ec_isogeny.c"
  $45 = (($44) + -1)|0; //@line 200 "SIDH_v1.0/ec_isogeny.c"
  $19 = $45; //@line 200 "SIDH_v1.0/ec_isogeny.c"
 }
 $46 = $13; //@line 204 "SIDH_v1.0/ec_isogeny.c"
 $19 = $46; //@line 204 "SIDH_v1.0/ec_isogeny.c"
 while(1) {
  $47 = $19; //@line 204 "SIDH_v1.0/ec_isogeny.c"
  $48 = ($47|0)>(0); //@line 204 "SIDH_v1.0/ec_isogeny.c"
  if (!($48)) {
   break;
  }
  $49 = $17; //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $50 = (($49) - 1)|0; //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $51 = $9; //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $52 = (($51) + ($50<<2)|0); //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $53 = HEAP32[$52>>2]|0; //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $54 = $53 >>> 31; //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $16 = $54; //@line 205 "SIDH_v1.0/ec_isogeny.c"
  $55 = $9; //@line 206 "SIDH_v1.0/ec_isogeny.c"
  $56 = $17; //@line 206 "SIDH_v1.0/ec_isogeny.c"
  _mp_shiftl1($55,$56); //@line 206 "SIDH_v1.0/ec_isogeny.c"
  $57 = $16; //@line 207 "SIDH_v1.0/ec_isogeny.c"
  $58 = (0 - ($57))|0; //@line 207 "SIDH_v1.0/ec_isogeny.c"
  $18 = $58; //@line 207 "SIDH_v1.0/ec_isogeny.c"
  $59 = $10; //@line 209 "SIDH_v1.0/ec_isogeny.c"
  $60 = $11; //@line 209 "SIDH_v1.0/ec_isogeny.c"
  $61 = $18; //@line 209 "SIDH_v1.0/ec_isogeny.c"
  _swap_points_basefield($59,$60,$61); //@line 209 "SIDH_v1.0/ec_isogeny.c"
  $62 = $10; //@line 210 "SIDH_v1.0/ec_isogeny.c"
  $63 = $11; //@line 210 "SIDH_v1.0/ec_isogeny.c"
  $64 = $8; //@line 210 "SIDH_v1.0/ec_isogeny.c"
  $65 = $12; //@line 210 "SIDH_v1.0/ec_isogeny.c"
  _xDBLADD_basefield($62,$63,$64,$65); //@line 210 "SIDH_v1.0/ec_isogeny.c"
  $66 = $10; //@line 211 "SIDH_v1.0/ec_isogeny.c"
  $67 = $11; //@line 211 "SIDH_v1.0/ec_isogeny.c"
  $68 = $18; //@line 211 "SIDH_v1.0/ec_isogeny.c"
  _swap_points_basefield($66,$67,$68); //@line 211 "SIDH_v1.0/ec_isogeny.c"
  $69 = $19; //@line 204 "SIDH_v1.0/ec_isogeny.c"
  $70 = (($69) + -1)|0; //@line 204 "SIDH_v1.0/ec_isogeny.c"
  $19 = $70; //@line 204 "SIDH_v1.0/ec_isogeny.c"
 }
 STACKTOP = sp;return; //@line 213 "SIDH_v1.0/ec_isogeny.c"
}
function _secret_pt($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0;
 var dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1088|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(1088|0);
 $12 = sp + 864|0;
 $13 = sp + 672|0;
 $14 = sp + 480|0;
 $23 = sp + 400|0;
 $24 = sp + 304|0;
 $25 = sp + 208|0;
 $26 = sp + 112|0;
 $27 = sp + 16|0;
 $6 = $0;
 $7 = $1;
 $8 = $2;
 $9 = $3;
 $10 = $4;
 $15 = $13; //@line 250 "SIDH_v1.0/ec_isogeny.c"
 $32 = ((($13)) + 96|0); //@line 250 "SIDH_v1.0/ec_isogeny.c"
 $16 = $32; //@line 250 "SIDH_v1.0/ec_isogeny.c"
 $17 = $14; //@line 250 "SIDH_v1.0/ec_isogeny.c"
 $33 = ((($14)) + 96|0); //@line 250 "SIDH_v1.0/ec_isogeny.c"
 $18 = $33; //@line 250 "SIDH_v1.0/ec_isogeny.c"
 $34 = $6; //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $19 = $34; //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $35 = $6; //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $36 = ((($35)) + 96|0); //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $20 = $36; //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $21 = $12; //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $37 = ((($12)) + 96|0); //@line 251 "SIDH_v1.0/ec_isogeny.c"
 $22 = $37; //@line 251 "SIDH_v1.0/ec_isogeny.c"
 dest=$27; stop=dest+96|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0)); //@line 253 "SIDH_v1.0/ec_isogeny.c"
 $38 = $9; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $28 = $38; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $39 = $9; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $40 = ((($39)) + 96|0); //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $29 = $40; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $41 = $9; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $42 = ((($41)) + 192|0); //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $30 = $42; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $43 = $9; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $44 = ((($43)) + 192|0); //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $45 = ((($44)) + 96|0); //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $31 = $45; //@line 254 "SIDH_v1.0/ec_isogeny.c"
 $46 = $6; //@line 256 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($46,$12); //@line 256 "SIDH_v1.0/ec_isogeny.c"
 $47 = $6; //@line 257 "SIDH_v1.0/ec_isogeny.c"
 $48 = ((($47)) + 96|0); //@line 257 "SIDH_v1.0/ec_isogeny.c"
 $49 = ((($12)) + 96|0); //@line 257 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($48,$49); //@line 257 "SIDH_v1.0/ec_isogeny.c"
 _fpneg751($12); //@line 258 "SIDH_v1.0/ec_isogeny.c"
 $50 = $8; //@line 260 "SIDH_v1.0/ec_isogeny.c"
 $51 = ($50|0)==(0); //@line 260 "SIDH_v1.0/ec_isogeny.c"
 do {
  if ($51) {
   $52 = $10; //@line 261 "SIDH_v1.0/ec_isogeny.c"
   $53 = ((($52)) + 36|0); //@line 261 "SIDH_v1.0/ec_isogeny.c"
   $54 = HEAP32[$53>>2]|0; //@line 261 "SIDH_v1.0/ec_isogeny.c"
   $11 = $54; //@line 261 "SIDH_v1.0/ec_isogeny.c"
  } else {
   $55 = $8; //@line 262 "SIDH_v1.0/ec_isogeny.c"
   $56 = ($55|0)==(1); //@line 262 "SIDH_v1.0/ec_isogeny.c"
   if ($56) {
    $57 = $10; //@line 263 "SIDH_v1.0/ec_isogeny.c"
    $58 = ((($57)) + 44|0); //@line 263 "SIDH_v1.0/ec_isogeny.c"
    $59 = HEAP32[$58>>2]|0; //@line 263 "SIDH_v1.0/ec_isogeny.c"
    $11 = $59; //@line 263 "SIDH_v1.0/ec_isogeny.c"
    break;
   }
   $5 = 6; //@line 265 "SIDH_v1.0/ec_isogeny.c"
   $124 = $5; //@line 310 "SIDH_v1.0/ec_isogeny.c"
   STACKTOP = sp;return ($124|0); //@line 310 "SIDH_v1.0/ec_isogeny.c"
  }
 } while(0);
 HEAP32[$27>>2] = 1; //@line 269 "SIDH_v1.0/ec_isogeny.c"
 $60 = $7; //@line 270 "SIDH_v1.0/ec_isogeny.c"
 _copy_words($60,$23,12); //@line 270 "SIDH_v1.0/ec_isogeny.c"
 $61 = $11; //@line 271 "SIDH_v1.0/ec_isogeny.c"
 $62 = $10; //@line 271 "SIDH_v1.0/ec_isogeny.c"
 $63 = ((($62)) + 16|0); //@line 271 "SIDH_v1.0/ec_isogeny.c"
 $64 = HEAP32[$63>>2]|0; //@line 271 "SIDH_v1.0/ec_isogeny.c"
 $65 = $10; //@line 271 "SIDH_v1.0/ec_isogeny.c"
 _ladder($12,$23,$13,$14,$27,$61,$64,$65); //@line 271 "SIDH_v1.0/ec_isogeny.c"
 $66 = $21; //@line 277 "SIDH_v1.0/ec_isogeny.c"
 $67 = $16; //@line 277 "SIDH_v1.0/ec_isogeny.c"
 $68 = $29; //@line 277 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($66,$67,$68); //@line 277 "SIDH_v1.0/ec_isogeny.c"
 $69 = $15; //@line 278 "SIDH_v1.0/ec_isogeny.c"
 $70 = $21; //@line 278 "SIDH_v1.0/ec_isogeny.c"
 $71 = $28; //@line 278 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($69,$70,$71); //@line 278 "SIDH_v1.0/ec_isogeny.c"
 $72 = $15; //@line 279 "SIDH_v1.0/ec_isogeny.c"
 $73 = $29; //@line 279 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($72,$73,$24); //@line 279 "SIDH_v1.0/ec_isogeny.c"
 $74 = $15; //@line 280 "SIDH_v1.0/ec_isogeny.c"
 $75 = $29; //@line 280 "SIDH_v1.0/ec_isogeny.c"
 $76 = $29; //@line 280 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($74,$75,$76); //@line 280 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($24,$24); //@line 281 "SIDH_v1.0/ec_isogeny.c"
 $77 = $28; //@line 282 "SIDH_v1.0/ec_isogeny.c"
 $78 = $16; //@line 282 "SIDH_v1.0/ec_isogeny.c"
 $79 = $28; //@line 282 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($77,$78,$79); //@line 282 "SIDH_v1.0/ec_isogeny.c"
 $80 = $17; //@line 283 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($24,$80,$24); //@line 283 "SIDH_v1.0/ec_isogeny.c"
 $81 = $28; //@line 284 "SIDH_v1.0/ec_isogeny.c"
 $82 = $29; //@line 284 "SIDH_v1.0/ec_isogeny.c"
 $83 = $28; //@line 284 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($81,$82,$83); //@line 284 "SIDH_v1.0/ec_isogeny.c"
 $84 = $22; //@line 285 "SIDH_v1.0/ec_isogeny.c"
 $85 = $18; //@line 285 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($84,$85,$26); //@line 285 "SIDH_v1.0/ec_isogeny.c"
 $86 = $20; //@line 286 "SIDH_v1.0/ec_isogeny.c"
 $87 = $16; //@line 286 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($86,$87,$25); //@line 286 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($26,$26,$26); //@line 287 "SIDH_v1.0/ec_isogeny.c"
 $88 = $16; //@line 288 "SIDH_v1.0/ec_isogeny.c"
 $89 = $29; //@line 288 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($26,$88,$89); //@line 288 "SIDH_v1.0/ec_isogeny.c"
 $90 = $28; //@line 289 "SIDH_v1.0/ec_isogeny.c"
 $91 = $18; //@line 289 "SIDH_v1.0/ec_isogeny.c"
 $92 = $28; //@line 289 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($90,$91,$92); //@line 289 "SIDH_v1.0/ec_isogeny.c"
 $93 = $28; //@line 290 "SIDH_v1.0/ec_isogeny.c"
 $94 = $28; //@line 290 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($93,$24,$94); //@line 290 "SIDH_v1.0/ec_isogeny.c"
 $95 = $29; //@line 291 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($25,$95,$25); //@line 291 "SIDH_v1.0/ec_isogeny.c"
 $96 = $29; //@line 292 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($96,$24); //@line 292 "SIDH_v1.0/ec_isogeny.c"
 $97 = $29; //@line 293 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($26,$97,$26); //@line 293 "SIDH_v1.0/ec_isogeny.c"
 $98 = $28; //@line 294 "SIDH_v1.0/ec_isogeny.c"
 $99 = $29; //@line 294 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($25,$98,$99); //@line 294 "SIDH_v1.0/ec_isogeny.c"
 $100 = $28; //@line 295 "SIDH_v1.0/ec_isogeny.c"
 $101 = $30; //@line 295 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($25,$100,$101); //@line 295 "SIDH_v1.0/ec_isogeny.c"
 $102 = $29; //@line 296 "SIDH_v1.0/ec_isogeny.c"
 $103 = $29; //@line 296 "SIDH_v1.0/ec_isogeny.c"
 $104 = $29; //@line 296 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($102,$103,$104); //@line 296 "SIDH_v1.0/ec_isogeny.c"
 $105 = $28; //@line 297 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($25,$105,$25); //@line 297 "SIDH_v1.0/ec_isogeny.c"
 $106 = $19; //@line 298 "SIDH_v1.0/ec_isogeny.c"
 $107 = $16; //@line 298 "SIDH_v1.0/ec_isogeny.c"
 $108 = $28; //@line 298 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($106,$107,$108); //@line 298 "SIDH_v1.0/ec_isogeny.c"
 $109 = $30; //@line 299 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($25,$109,$25); //@line 299 "SIDH_v1.0/ec_isogeny.c"
 $110 = $15; //@line 300 "SIDH_v1.0/ec_isogeny.c"
 $111 = $28; //@line 300 "SIDH_v1.0/ec_isogeny.c"
 $112 = $30; //@line 300 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($110,$111,$112); //@line 300 "SIDH_v1.0/ec_isogeny.c"
 $113 = $15; //@line 301 "SIDH_v1.0/ec_isogeny.c"
 $114 = $28; //@line 301 "SIDH_v1.0/ec_isogeny.c"
 $115 = $28; //@line 301 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($113,$114,$115); //@line 301 "SIDH_v1.0/ec_isogeny.c"
 $116 = $30; //@line 302 "SIDH_v1.0/ec_isogeny.c"
 $117 = $30; //@line 302 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($116,$117); //@line 302 "SIDH_v1.0/ec_isogeny.c"
 $118 = $28; //@line 303 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($26,$118,$26); //@line 303 "SIDH_v1.0/ec_isogeny.c"
 $119 = $30; //@line 304 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($26,$119,$26); //@line 304 "SIDH_v1.0/ec_isogeny.c"
 $120 = $30; //@line 305 "SIDH_v1.0/ec_isogeny.c"
 $121 = $30; //@line 305 "SIDH_v1.0/ec_isogeny.c"
 _fpmul751_mont($120,$24,$121); //@line 305 "SIDH_v1.0/ec_isogeny.c"
 $122 = $28; //@line 306 "SIDH_v1.0/ec_isogeny.c"
 _fpsub751($25,$26,$122); //@line 306 "SIDH_v1.0/ec_isogeny.c"
 $123 = $31; //@line 307 "SIDH_v1.0/ec_isogeny.c"
 _fpzero751($123); //@line 307 "SIDH_v1.0/ec_isogeny.c"
 $5 = 0; //@line 309 "SIDH_v1.0/ec_isogeny.c"
 $124 = $5; //@line 310 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return ($124|0); //@line 310 "SIDH_v1.0/ec_isogeny.c"
}
function _ladder_3_pt($0,$1,$2,$3,$4,$5,$6,$7) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 $5 = $5|0;
 $6 = $6|0;
 $7 = $7|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0;
 var $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1696|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(1696|0);
 $17 = sp + 1272|0;
 $18 = sp + 888|0;
 $19 = sp + 696|0;
 $20 = sp + 504|0;
 $21 = sp + 312|0;
 $22 = sp + 120|0;
 $23 = sp + 24|0;
 $9 = $0;
 $10 = $1;
 $11 = $2;
 $12 = $3;
 $13 = $4;
 $14 = $5;
 $15 = $6;
 $16 = $7;
 _memset(($17|0),0,384)|0; //@line 317 "SIDH_v1.0/ec_isogeny.c"
 _memset(($18|0),0,384)|0; //@line 317 "SIDH_v1.0/ec_isogeny.c"
 _memset(($21|0),0,192)|0; //@line 318 "SIDH_v1.0/ec_isogeny.c"
 $24 = 0; //@line 320 "SIDH_v1.0/ec_isogeny.c"
 $29 = $16; //@line 320 "SIDH_v1.0/ec_isogeny.c"
 $30 = ((($29)) + 16|0); //@line 320 "SIDH_v1.0/ec_isogeny.c"
 $31 = HEAP32[$30>>2]|0; //@line 320 "SIDH_v1.0/ec_isogeny.c"
 $26 = $31; //@line 320 "SIDH_v1.0/ec_isogeny.c"
 $32 = $13; //@line 324 "SIDH_v1.0/ec_isogeny.c"
 $33 = ($32|0)==(0); //@line 324 "SIDH_v1.0/ec_isogeny.c"
 do {
  if ($33) {
   $34 = $16; //@line 325 "SIDH_v1.0/ec_isogeny.c"
   $35 = ((($34)) + 36|0); //@line 325 "SIDH_v1.0/ec_isogeny.c"
   $36 = HEAP32[$35>>2]|0; //@line 325 "SIDH_v1.0/ec_isogeny.c"
   $25 = $36; //@line 325 "SIDH_v1.0/ec_isogeny.c"
  } else {
   $37 = $13; //@line 326 "SIDH_v1.0/ec_isogeny.c"
   $38 = ($37|0)==(1); //@line 326 "SIDH_v1.0/ec_isogeny.c"
   if ($38) {
    $39 = $16; //@line 327 "SIDH_v1.0/ec_isogeny.c"
    $40 = ((($39)) + 44|0); //@line 327 "SIDH_v1.0/ec_isogeny.c"
    $41 = HEAP32[$40>>2]|0; //@line 327 "SIDH_v1.0/ec_isogeny.c"
    $25 = $41; //@line 327 "SIDH_v1.0/ec_isogeny.c"
    break;
   }
   $8 = 6; //@line 329 "SIDH_v1.0/ec_isogeny.c"
   $95 = $8; //@line 367 "SIDH_v1.0/ec_isogeny.c"
   STACKTOP = sp;return ($95|0); //@line 367 "SIDH_v1.0/ec_isogeny.c"
  }
 } while(0);
 $42 = $16; //@line 332 "SIDH_v1.0/ec_isogeny.c"
 $43 = ((($42)) + 80|0); //@line 332 "SIDH_v1.0/ec_isogeny.c"
 $44 = HEAP32[$43>>2]|0; //@line 332 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($44,$21); //@line 332 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($21,$21,$21); //@line 333 "SIDH_v1.0/ec_isogeny.c"
 $45 = $15; //@line 334 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($45,$21,$20); //@line 334 "SIDH_v1.0/ec_isogeny.c"
 _fp2div2_751($20,$19); //@line 335 "SIDH_v1.0/ec_isogeny.c"
 _fp2div2_751($19,$19); //@line 336 "SIDH_v1.0/ec_isogeny.c"
 $46 = $16; //@line 339 "SIDH_v1.0/ec_isogeny.c"
 $47 = ((($46)) + 80|0); //@line 339 "SIDH_v1.0/ec_isogeny.c"
 $48 = HEAP32[$47>>2]|0; //@line 339 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($48,$17); //@line 339 "SIDH_v1.0/ec_isogeny.c"
 $49 = $10; //@line 340 "SIDH_v1.0/ec_isogeny.c"
 _fp2copy751($49,$18); //@line 340 "SIDH_v1.0/ec_isogeny.c"
 $50 = $16; //@line 341 "SIDH_v1.0/ec_isogeny.c"
 $51 = ((($50)) + 80|0); //@line 341 "SIDH_v1.0/ec_isogeny.c"
 $52 = HEAP32[$51>>2]|0; //@line 341 "SIDH_v1.0/ec_isogeny.c"
 $53 = ((($18)) + 192|0); //@line 341 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($52,$53); //@line 341 "SIDH_v1.0/ec_isogeny.c"
 $54 = $9; //@line 342 "SIDH_v1.0/ec_isogeny.c"
 $55 = $14; //@line 342 "SIDH_v1.0/ec_isogeny.c"
 _fp2copy751($54,$55); //@line 342 "SIDH_v1.0/ec_isogeny.c"
 $56 = $16; //@line 343 "SIDH_v1.0/ec_isogeny.c"
 $57 = ((($56)) + 80|0); //@line 343 "SIDH_v1.0/ec_isogeny.c"
 $58 = HEAP32[$57>>2]|0; //@line 343 "SIDH_v1.0/ec_isogeny.c"
 $59 = $14; //@line 343 "SIDH_v1.0/ec_isogeny.c"
 $60 = ((($59)) + 192|0); //@line 343 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($58,$60); //@line 343 "SIDH_v1.0/ec_isogeny.c"
 $61 = $14; //@line 344 "SIDH_v1.0/ec_isogeny.c"
 $62 = ((($61)) + 192|0); //@line 344 "SIDH_v1.0/ec_isogeny.c"
 $63 = ((($62)) + 96|0); //@line 344 "SIDH_v1.0/ec_isogeny.c"
 _fpzero751($63); //@line 344 "SIDH_v1.0/ec_isogeny.c"
 $64 = $12; //@line 345 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($64,$23); //@line 345 "SIDH_v1.0/ec_isogeny.c"
 $65 = $26; //@line 347 "SIDH_v1.0/ec_isogeny.c"
 $66 = $25; //@line 347 "SIDH_v1.0/ec_isogeny.c"
 $67 = (($65) - ($66))|0; //@line 347 "SIDH_v1.0/ec_isogeny.c"
 $28 = $67; //@line 347 "SIDH_v1.0/ec_isogeny.c"
 while(1) {
  $68 = $28; //@line 347 "SIDH_v1.0/ec_isogeny.c"
  $69 = ($68|0)>(0); //@line 347 "SIDH_v1.0/ec_isogeny.c"
  if (!($69)) {
   break;
  }
  _mp_shiftl1($23,12); //@line 348 "SIDH_v1.0/ec_isogeny.c"
  $70 = $28; //@line 347 "SIDH_v1.0/ec_isogeny.c"
  $71 = (($70) + -1)|0; //@line 347 "SIDH_v1.0/ec_isogeny.c"
  $28 = $71; //@line 347 "SIDH_v1.0/ec_isogeny.c"
 }
 $72 = $25; //@line 351 "SIDH_v1.0/ec_isogeny.c"
 $28 = $72; //@line 351 "SIDH_v1.0/ec_isogeny.c"
 while(1) {
  $73 = $28; //@line 351 "SIDH_v1.0/ec_isogeny.c"
  $74 = ($73|0)>(0); //@line 351 "SIDH_v1.0/ec_isogeny.c"
  if (!($74)) {
   break;
  }
  $75 = ((($23)) + 44|0); //@line 352 "SIDH_v1.0/ec_isogeny.c"
  $76 = HEAP32[$75>>2]|0; //@line 352 "SIDH_v1.0/ec_isogeny.c"
  $77 = $76 >>> 31; //@line 352 "SIDH_v1.0/ec_isogeny.c"
  $24 = $77; //@line 352 "SIDH_v1.0/ec_isogeny.c"
  _mp_shiftl1($23,12); //@line 353 "SIDH_v1.0/ec_isogeny.c"
  $78 = $24; //@line 354 "SIDH_v1.0/ec_isogeny.c"
  $79 = (0 - ($78))|0; //@line 354 "SIDH_v1.0/ec_isogeny.c"
  $27 = $79; //@line 354 "SIDH_v1.0/ec_isogeny.c"
  $80 = $14; //@line 356 "SIDH_v1.0/ec_isogeny.c"
  $81 = $27; //@line 356 "SIDH_v1.0/ec_isogeny.c"
  _swap_points($80,$17,$81); //@line 356 "SIDH_v1.0/ec_isogeny.c"
  $82 = $27; //@line 357 "SIDH_v1.0/ec_isogeny.c"
  _swap_points($17,$18,$82); //@line 357 "SIDH_v1.0/ec_isogeny.c"
  $83 = $9; //@line 358 "SIDH_v1.0/ec_isogeny.c"
  $84 = $10; //@line 358 "SIDH_v1.0/ec_isogeny.c"
  $85 = $27; //@line 358 "SIDH_v1.0/ec_isogeny.c"
  _select_f2elm($83,$84,$21,$85); //@line 358 "SIDH_v1.0/ec_isogeny.c"
  $86 = $10; //@line 359 "SIDH_v1.0/ec_isogeny.c"
  $87 = $11; //@line 359 "SIDH_v1.0/ec_isogeny.c"
  $88 = $27; //@line 359 "SIDH_v1.0/ec_isogeny.c"
  _select_f2elm($86,$87,$22,$88); //@line 359 "SIDH_v1.0/ec_isogeny.c"
  $89 = $14; //@line 360 "SIDH_v1.0/ec_isogeny.c"
  _xADD($89,$17,$21); //@line 360 "SIDH_v1.0/ec_isogeny.c"
  _xDBLADD($17,$18,$22,$19); //@line 361 "SIDH_v1.0/ec_isogeny.c"
  $90 = $27; //@line 362 "SIDH_v1.0/ec_isogeny.c"
  _swap_points($17,$18,$90); //@line 362 "SIDH_v1.0/ec_isogeny.c"
  $91 = $14; //@line 363 "SIDH_v1.0/ec_isogeny.c"
  $92 = $27; //@line 363 "SIDH_v1.0/ec_isogeny.c"
  _swap_points($91,$17,$92); //@line 363 "SIDH_v1.0/ec_isogeny.c"
  $93 = $28; //@line 351 "SIDH_v1.0/ec_isogeny.c"
  $94 = (($93) + -1)|0; //@line 351 "SIDH_v1.0/ec_isogeny.c"
  $28 = $94; //@line 351 "SIDH_v1.0/ec_isogeny.c"
 }
 $8 = 0; //@line 366 "SIDH_v1.0/ec_isogeny.c"
 $95 = $8; //@line 367 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return ($95|0); //@line 367 "SIDH_v1.0/ec_isogeny.c"
}
function _get_4_isog($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 $8 = $4; //@line 376 "SIDH_v1.0/ec_isogeny.c"
 $9 = $4; //@line 376 "SIDH_v1.0/ec_isogeny.c"
 $10 = ((($9)) + 192|0); //@line 376 "SIDH_v1.0/ec_isogeny.c"
 $11 = $7; //@line 376 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($8,$10,$11); //@line 376 "SIDH_v1.0/ec_isogeny.c"
 $12 = $4; //@line 377 "SIDH_v1.0/ec_isogeny.c"
 $13 = $7; //@line 377 "SIDH_v1.0/ec_isogeny.c"
 $14 = ((($13)) + 576|0); //@line 377 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($12,$14); //@line 377 "SIDH_v1.0/ec_isogeny.c"
 $15 = $4; //@line 378 "SIDH_v1.0/ec_isogeny.c"
 $16 = ((($15)) + 192|0); //@line 378 "SIDH_v1.0/ec_isogeny.c"
 $17 = $7; //@line 378 "SIDH_v1.0/ec_isogeny.c"
 $18 = ((($17)) + 768|0); //@line 378 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($16,$18); //@line 378 "SIDH_v1.0/ec_isogeny.c"
 $19 = $7; //@line 379 "SIDH_v1.0/ec_isogeny.c"
 $20 = $7; //@line 379 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($19,$20); //@line 379 "SIDH_v1.0/ec_isogeny.c"
 $21 = $7; //@line 380 "SIDH_v1.0/ec_isogeny.c"
 $22 = ((($21)) + 576|0); //@line 380 "SIDH_v1.0/ec_isogeny.c"
 $23 = $7; //@line 380 "SIDH_v1.0/ec_isogeny.c"
 $24 = ((($23)) + 768|0); //@line 380 "SIDH_v1.0/ec_isogeny.c"
 $25 = $7; //@line 380 "SIDH_v1.0/ec_isogeny.c"
 $26 = ((($25)) + 192|0); //@line 380 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($22,$24,$26); //@line 380 "SIDH_v1.0/ec_isogeny.c"
 $27 = $7; //@line 381 "SIDH_v1.0/ec_isogeny.c"
 $28 = ((($27)) + 576|0); //@line 381 "SIDH_v1.0/ec_isogeny.c"
 $29 = $7; //@line 381 "SIDH_v1.0/ec_isogeny.c"
 $30 = ((($29)) + 768|0); //@line 381 "SIDH_v1.0/ec_isogeny.c"
 $31 = $7; //@line 381 "SIDH_v1.0/ec_isogeny.c"
 $32 = ((($31)) + 384|0); //@line 381 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($28,$30,$32); //@line 381 "SIDH_v1.0/ec_isogeny.c"
 $33 = $7; //@line 382 "SIDH_v1.0/ec_isogeny.c"
 $34 = ((($33)) + 576|0); //@line 382 "SIDH_v1.0/ec_isogeny.c"
 $35 = $7; //@line 382 "SIDH_v1.0/ec_isogeny.c"
 $36 = ((($35)) + 576|0); //@line 382 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($34,$36); //@line 382 "SIDH_v1.0/ec_isogeny.c"
 $37 = $7; //@line 383 "SIDH_v1.0/ec_isogeny.c"
 $38 = ((($37)) + 768|0); //@line 383 "SIDH_v1.0/ec_isogeny.c"
 $39 = $7; //@line 383 "SIDH_v1.0/ec_isogeny.c"
 $40 = ((($39)) + 768|0); //@line 383 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($38,$40); //@line 383 "SIDH_v1.0/ec_isogeny.c"
 $41 = $7; //@line 384 "SIDH_v1.0/ec_isogeny.c"
 $42 = ((($41)) + 576|0); //@line 384 "SIDH_v1.0/ec_isogeny.c"
 $43 = $7; //@line 384 "SIDH_v1.0/ec_isogeny.c"
 $44 = ((($43)) + 576|0); //@line 384 "SIDH_v1.0/ec_isogeny.c"
 $45 = $5; //@line 384 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($42,$44,$45); //@line 384 "SIDH_v1.0/ec_isogeny.c"
 $46 = $7; //@line 385 "SIDH_v1.0/ec_isogeny.c"
 $47 = $7; //@line 385 "SIDH_v1.0/ec_isogeny.c"
 $48 = ((($47)) + 192|0); //@line 385 "SIDH_v1.0/ec_isogeny.c"
 $49 = $7; //@line 385 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($46,$48,$49); //@line 385 "SIDH_v1.0/ec_isogeny.c"
 $50 = $5; //@line 386 "SIDH_v1.0/ec_isogeny.c"
 $51 = $7; //@line 386 "SIDH_v1.0/ec_isogeny.c"
 $52 = ((($51)) + 768|0); //@line 386 "SIDH_v1.0/ec_isogeny.c"
 $53 = $5; //@line 386 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($50,$52,$53); //@line 386 "SIDH_v1.0/ec_isogeny.c"
 $54 = $7; //@line 387 "SIDH_v1.0/ec_isogeny.c"
 $55 = ((($54)) + 768|0); //@line 387 "SIDH_v1.0/ec_isogeny.c"
 $56 = $6; //@line 387 "SIDH_v1.0/ec_isogeny.c"
 _fp2copy751($55,$56); //@line 387 "SIDH_v1.0/ec_isogeny.c"
 $57 = $5; //@line 388 "SIDH_v1.0/ec_isogeny.c"
 $58 = $5; //@line 388 "SIDH_v1.0/ec_isogeny.c"
 $59 = $5; //@line 388 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($57,$58,$59); //@line 388 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 389 "SIDH_v1.0/ec_isogeny.c"
}
function _eval_4_isog($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 400|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(400|0);
 $4 = sp + 192|0;
 $5 = sp;
 $2 = $0;
 $3 = $1;
 $6 = $2; //@line 399 "SIDH_v1.0/ec_isogeny.c"
 $7 = $3; //@line 399 "SIDH_v1.0/ec_isogeny.c"
 $8 = $2; //@line 399 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($6,$7,$8); //@line 399 "SIDH_v1.0/ec_isogeny.c"
 $9 = $2; //@line 400 "SIDH_v1.0/ec_isogeny.c"
 $10 = ((($9)) + 192|0); //@line 400 "SIDH_v1.0/ec_isogeny.c"
 $11 = $3; //@line 400 "SIDH_v1.0/ec_isogeny.c"
 $12 = ((($11)) + 192|0); //@line 400 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($10,$12,$4); //@line 400 "SIDH_v1.0/ec_isogeny.c"
 $13 = $2; //@line 401 "SIDH_v1.0/ec_isogeny.c"
 $14 = $2; //@line 401 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($13,$4,$14); //@line 401 "SIDH_v1.0/ec_isogeny.c"
 $15 = $2; //@line 402 "SIDH_v1.0/ec_isogeny.c"
 $16 = ((($15)) + 192|0); //@line 402 "SIDH_v1.0/ec_isogeny.c"
 $17 = $3; //@line 402 "SIDH_v1.0/ec_isogeny.c"
 $18 = ((($17)) + 384|0); //@line 402 "SIDH_v1.0/ec_isogeny.c"
 $19 = $2; //@line 402 "SIDH_v1.0/ec_isogeny.c"
 $20 = ((($19)) + 192|0); //@line 402 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($16,$18,$20); //@line 402 "SIDH_v1.0/ec_isogeny.c"
 $21 = $2; //@line 403 "SIDH_v1.0/ec_isogeny.c"
 $22 = $2; //@line 403 "SIDH_v1.0/ec_isogeny.c"
 $23 = ((($22)) + 192|0); //@line 403 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($21,$23,$4); //@line 403 "SIDH_v1.0/ec_isogeny.c"
 $24 = $2; //@line 404 "SIDH_v1.0/ec_isogeny.c"
 $25 = ((($24)) + 192|0); //@line 404 "SIDH_v1.0/ec_isogeny.c"
 $26 = $2; //@line 404 "SIDH_v1.0/ec_isogeny.c"
 $27 = $2; //@line 404 "SIDH_v1.0/ec_isogeny.c"
 $28 = ((($27)) + 192|0); //@line 404 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($25,$26,$28); //@line 404 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($4,$4); //@line 405 "SIDH_v1.0/ec_isogeny.c"
 $29 = $2; //@line 406 "SIDH_v1.0/ec_isogeny.c"
 $30 = ((($29)) + 192|0); //@line 406 "SIDH_v1.0/ec_isogeny.c"
 $31 = $2; //@line 406 "SIDH_v1.0/ec_isogeny.c"
 $32 = ((($31)) + 192|0); //@line 406 "SIDH_v1.0/ec_isogeny.c"
 $33 = $2; //@line 406 "SIDH_v1.0/ec_isogeny.c"
 $34 = ((($33)) + 192|0); //@line 406 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($30,$32,$34); //@line 406 "SIDH_v1.0/ec_isogeny.c"
 $35 = $2; //@line 407 "SIDH_v1.0/ec_isogeny.c"
 $36 = ((($35)) + 192|0); //@line 407 "SIDH_v1.0/ec_isogeny.c"
 $37 = $2; //@line 407 "SIDH_v1.0/ec_isogeny.c"
 $38 = ((($37)) + 192|0); //@line 407 "SIDH_v1.0/ec_isogeny.c"
 $39 = $2; //@line 407 "SIDH_v1.0/ec_isogeny.c"
 $40 = ((($39)) + 192|0); //@line 407 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($36,$38,$40); //@line 407 "SIDH_v1.0/ec_isogeny.c"
 $41 = $2; //@line 408 "SIDH_v1.0/ec_isogeny.c"
 $42 = ((($41)) + 192|0); //@line 408 "SIDH_v1.0/ec_isogeny.c"
 $43 = $2; //@line 408 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($42,$4,$43); //@line 408 "SIDH_v1.0/ec_isogeny.c"
 $44 = $2; //@line 409 "SIDH_v1.0/ec_isogeny.c"
 $45 = ((($44)) + 192|0); //@line 409 "SIDH_v1.0/ec_isogeny.c"
 $46 = $2; //@line 409 "SIDH_v1.0/ec_isogeny.c"
 $47 = ((($46)) + 192|0); //@line 409 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($45,$4,$47); //@line 409 "SIDH_v1.0/ec_isogeny.c"
 $48 = $2; //@line 410 "SIDH_v1.0/ec_isogeny.c"
 $49 = ((($48)) + 192|0); //@line 410 "SIDH_v1.0/ec_isogeny.c"
 $50 = $3; //@line 410 "SIDH_v1.0/ec_isogeny.c"
 $51 = ((($50)) + 768|0); //@line 410 "SIDH_v1.0/ec_isogeny.c"
 $52 = $2; //@line 410 "SIDH_v1.0/ec_isogeny.c"
 $53 = ((($52)) + 192|0); //@line 410 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($49,$51,$53); //@line 410 "SIDH_v1.0/ec_isogeny.c"
 $54 = $3; //@line 411 "SIDH_v1.0/ec_isogeny.c"
 $55 = ((($54)) + 768|0); //@line 411 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($4,$55,$4); //@line 411 "SIDH_v1.0/ec_isogeny.c"
 $56 = $2; //@line 412 "SIDH_v1.0/ec_isogeny.c"
 $57 = $3; //@line 412 "SIDH_v1.0/ec_isogeny.c"
 $58 = ((($57)) + 576|0); //@line 412 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($56,$58,$5); //@line 412 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($4,$5,$4); //@line 413 "SIDH_v1.0/ec_isogeny.c"
 $59 = $2; //@line 414 "SIDH_v1.0/ec_isogeny.c"
 $60 = $2; //@line 414 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($59,$4,$60); //@line 414 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 415 "SIDH_v1.0/ec_isogeny.c"
}
function _first_4_isog($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 608|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(608|0);
 $10 = sp + 384|0;
 $11 = sp + 192|0;
 $12 = sp;
 $5 = $0;
 $6 = $1;
 $7 = $2;
 $8 = $3;
 $9 = $4;
 _memset(($10|0),0,192)|0; //@line 422 "SIDH_v1.0/ec_isogeny.c"
 $13 = $9; //@line 424 "SIDH_v1.0/ec_isogeny.c"
 $14 = ((($13)) + 80|0); //@line 424 "SIDH_v1.0/ec_isogeny.c"
 $15 = HEAP32[$14>>2]|0; //@line 424 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($15,$10); //@line 424 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($10,$10,$10); //@line 425 "SIDH_v1.0/ec_isogeny.c"
 $16 = $6; //@line 426 "SIDH_v1.0/ec_isogeny.c"
 $17 = $8; //@line 426 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($16,$10,$17); //@line 426 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($10,$10,$11); //@line 427 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($10,$11,$10); //@line 428 "SIDH_v1.0/ec_isogeny.c"
 $18 = $5; //@line 429 "SIDH_v1.0/ec_isogeny.c"
 $19 = $5; //@line 429 "SIDH_v1.0/ec_isogeny.c"
 $20 = ((($19)) + 192|0); //@line 429 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($18,$20,$11); //@line 429 "SIDH_v1.0/ec_isogeny.c"
 $21 = $5; //@line 430 "SIDH_v1.0/ec_isogeny.c"
 $22 = $5; //@line 430 "SIDH_v1.0/ec_isogeny.c"
 $23 = ((($22)) + 192|0); //@line 430 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($21,$23,$12); //@line 430 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($11,$11); //@line 431 "SIDH_v1.0/ec_isogeny.c"
 $24 = $6; //@line 432 "SIDH_v1.0/ec_isogeny.c"
 $25 = $7; //@line 432 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($24,$10,$25); //@line 432 "SIDH_v1.0/ec_isogeny.c"
 $26 = $5; //@line 433 "SIDH_v1.0/ec_isogeny.c"
 $27 = $5; //@line 433 "SIDH_v1.0/ec_isogeny.c"
 $28 = ((($27)) + 192|0); //@line 433 "SIDH_v1.0/ec_isogeny.c"
 $29 = $5; //@line 433 "SIDH_v1.0/ec_isogeny.c"
 $30 = ((($29)) + 192|0); //@line 433 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($26,$28,$30); //@line 433 "SIDH_v1.0/ec_isogeny.c"
 $31 = $5; //@line 434 "SIDH_v1.0/ec_isogeny.c"
 $32 = ((($31)) + 192|0); //@line 434 "SIDH_v1.0/ec_isogeny.c"
 _fp2neg751($32); //@line 434 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($12,$12); //@line 435 "SIDH_v1.0/ec_isogeny.c"
 $33 = $5; //@line 436 "SIDH_v1.0/ec_isogeny.c"
 $34 = ((($33)) + 192|0); //@line 436 "SIDH_v1.0/ec_isogeny.c"
 $35 = $8; //@line 436 "SIDH_v1.0/ec_isogeny.c"
 $36 = $5; //@line 436 "SIDH_v1.0/ec_isogeny.c"
 $37 = ((($36)) + 192|0); //@line 436 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($34,$35,$37); //@line 436 "SIDH_v1.0/ec_isogeny.c"
 $38 = $7; //@line 437 "SIDH_v1.0/ec_isogeny.c"
 $39 = $7; //@line 437 "SIDH_v1.0/ec_isogeny.c"
 $40 = $7; //@line 437 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($38,$39,$40); //@line 437 "SIDH_v1.0/ec_isogeny.c"
 $41 = $5; //@line 438 "SIDH_v1.0/ec_isogeny.c"
 $42 = ((($41)) + 192|0); //@line 438 "SIDH_v1.0/ec_isogeny.c"
 $43 = $5; //@line 438 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($11,$42,$43); //@line 438 "SIDH_v1.0/ec_isogeny.c"
 $44 = $5; //@line 439 "SIDH_v1.0/ec_isogeny.c"
 $45 = ((($44)) + 192|0); //@line 439 "SIDH_v1.0/ec_isogeny.c"
 $46 = $5; //@line 439 "SIDH_v1.0/ec_isogeny.c"
 $47 = ((($46)) + 192|0); //@line 439 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($45,$12,$47); //@line 439 "SIDH_v1.0/ec_isogeny.c"
 $48 = $5; //@line 440 "SIDH_v1.0/ec_isogeny.c"
 $49 = $5; //@line 440 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($48,$11,$49); //@line 440 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 441 "SIDH_v1.0/ec_isogeny.c"
}
function _xTPL($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1168|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(1168|0);
 $8 = sp + 960|0;
 $9 = sp + 768|0;
 $10 = sp + 576|0;
 $11 = sp + 384|0;
 $12 = sp + 192|0;
 $13 = sp;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 $14 = $4; //@line 450 "SIDH_v1.0/ec_isogeny.c"
 $15 = $4; //@line 450 "SIDH_v1.0/ec_isogeny.c"
 $16 = ((($15)) + 192|0); //@line 450 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($14,$16,$10); //@line 450 "SIDH_v1.0/ec_isogeny.c"
 $17 = $4; //@line 451 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($17,$8); //@line 451 "SIDH_v1.0/ec_isogeny.c"
 $18 = $4; //@line 452 "SIDH_v1.0/ec_isogeny.c"
 $19 = ((($18)) + 192|0); //@line 452 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($19,$9); //@line 452 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($10,$10); //@line 453 "SIDH_v1.0/ec_isogeny.c"
 $20 = $7; //@line 454 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($8,$20,$11); //@line 454 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($10,$8,$10); //@line 455 "SIDH_v1.0/ec_isogeny.c"
 $21 = $7; //@line 456 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($9,$21,$12); //@line 456 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($10,$9,$10); //@line 457 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($11,$12,$13); //@line 458 "SIDH_v1.0/ec_isogeny.c"
 $22 = $6; //@line 459 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($10,$22,$10); //@line 459 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($11,$11,$11); //@line 460 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($12,$12,$12); //@line 461 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($11,$10,$11); //@line 462 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($12,$10,$12); //@line 463 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($11,$13,$11); //@line 464 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($12,$13,$12); //@line 465 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($8,$9,$10); //@line 466 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($8,$8,$8); //@line 467 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($9,$9,$9); //@line 468 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($10,$13,$10); //@line 469 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($9,$11,$9); //@line 470 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($8,$12,$8); //@line 471 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($9,$10,$9); //@line 472 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($8,$10,$8); //@line 473 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($9,$9); //@line 474 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($8,$8); //@line 475 "SIDH_v1.0/ec_isogeny.c"
 $23 = $4; //@line 476 "SIDH_v1.0/ec_isogeny.c"
 $24 = $5; //@line 476 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($23,$9,$24); //@line 476 "SIDH_v1.0/ec_isogeny.c"
 $25 = $4; //@line 477 "SIDH_v1.0/ec_isogeny.c"
 $26 = ((($25)) + 192|0); //@line 477 "SIDH_v1.0/ec_isogeny.c"
 $27 = $5; //@line 477 "SIDH_v1.0/ec_isogeny.c"
 $28 = ((($27)) + 192|0); //@line 477 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($26,$8,$28); //@line 477 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 478 "SIDH_v1.0/ec_isogeny.c"
}
function _xTPLe($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $5 = $0;
 $6 = $1;
 $7 = $2;
 $8 = $3;
 $9 = $4;
 $11 = $5; //@line 487 "SIDH_v1.0/ec_isogeny.c"
 $12 = $6; //@line 487 "SIDH_v1.0/ec_isogeny.c"
 _copy_words($11,$12,96); //@line 487 "SIDH_v1.0/ec_isogeny.c"
 $10 = 0; //@line 489 "SIDH_v1.0/ec_isogeny.c"
 while(1) {
  $13 = $10; //@line 489 "SIDH_v1.0/ec_isogeny.c"
  $14 = $9; //@line 489 "SIDH_v1.0/ec_isogeny.c"
  $15 = ($13|0)<($14|0); //@line 489 "SIDH_v1.0/ec_isogeny.c"
  if (!($15)) {
   break;
  }
  $16 = $6; //@line 490 "SIDH_v1.0/ec_isogeny.c"
  $17 = $6; //@line 490 "SIDH_v1.0/ec_isogeny.c"
  $18 = $7; //@line 490 "SIDH_v1.0/ec_isogeny.c"
  $19 = $8; //@line 490 "SIDH_v1.0/ec_isogeny.c"
  _xTPL($16,$17,$18,$19); //@line 490 "SIDH_v1.0/ec_isogeny.c"
  $20 = $10; //@line 489 "SIDH_v1.0/ec_isogeny.c"
  $21 = (($20) + 1)|0; //@line 489 "SIDH_v1.0/ec_isogeny.c"
  $10 = $21; //@line 489 "SIDH_v1.0/ec_isogeny.c"
 }
 STACKTOP = sp;return; //@line 492 "SIDH_v1.0/ec_isogeny.c"
}
function _get_3_isog($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 400|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(400|0);
 $6 = sp + 192|0;
 $7 = sp;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $8 = $3; //@line 501 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($8,$6); //@line 501 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($6,$6,$7); //@line 502 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($6,$7,$6); //@line 503 "SIDH_v1.0/ec_isogeny.c"
 $9 = $3; //@line 504 "SIDH_v1.0/ec_isogeny.c"
 $10 = ((($9)) + 192|0); //@line 504 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($10,$7); //@line 504 "SIDH_v1.0/ec_isogeny.c"
 $11 = $4; //@line 505 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($7,$11); //@line 505 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($7,$7,$7); //@line 506 "SIDH_v1.0/ec_isogeny.c"
 $12 = $5; //@line 507 "SIDH_v1.0/ec_isogeny.c"
 _fp2add751($7,$7,$12); //@line 507 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($6,$7,$7); //@line 508 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($6,$7,$7); //@line 509 "SIDH_v1.0/ec_isogeny.c"
 $13 = $4; //@line 510 "SIDH_v1.0/ec_isogeny.c"
 $14 = $4; //@line 510 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($13,$7,$14); //@line 510 "SIDH_v1.0/ec_isogeny.c"
 $15 = $4; //@line 511 "SIDH_v1.0/ec_isogeny.c"
 $16 = $4; //@line 511 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($15,$7,$16); //@line 511 "SIDH_v1.0/ec_isogeny.c"
 $17 = $4; //@line 512 "SIDH_v1.0/ec_isogeny.c"
 $18 = $4; //@line 512 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($17,$7,$18); //@line 512 "SIDH_v1.0/ec_isogeny.c"
 $19 = $3; //@line 513 "SIDH_v1.0/ec_isogeny.c"
 $20 = $3; //@line 513 "SIDH_v1.0/ec_isogeny.c"
 $21 = ((($20)) + 192|0); //@line 513 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($19,$21,$7); //@line 513 "SIDH_v1.0/ec_isogeny.c"
 $22 = $5; //@line 514 "SIDH_v1.0/ec_isogeny.c"
 $23 = $5; //@line 514 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($22,$7,$23); //@line 514 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 515 "SIDH_v1.0/ec_isogeny.c"
}
function _eval_3_isog($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 592|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(592|0);
 $4 = sp + 384|0;
 $5 = sp + 192|0;
 $6 = sp;
 $2 = $0;
 $3 = $1;
 $7 = $2; //@line 524 "SIDH_v1.0/ec_isogeny.c"
 $8 = $3; //@line 524 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($7,$8,$4); //@line 524 "SIDH_v1.0/ec_isogeny.c"
 $9 = $2; //@line 525 "SIDH_v1.0/ec_isogeny.c"
 $10 = ((($9)) + 192|0); //@line 525 "SIDH_v1.0/ec_isogeny.c"
 $11 = $3; //@line 525 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($10,$11,$5); //@line 525 "SIDH_v1.0/ec_isogeny.c"
 $12 = $2; //@line 526 "SIDH_v1.0/ec_isogeny.c"
 $13 = ((($12)) + 192|0); //@line 526 "SIDH_v1.0/ec_isogeny.c"
 $14 = $3; //@line 526 "SIDH_v1.0/ec_isogeny.c"
 $15 = ((($14)) + 192|0); //@line 526 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($13,$15,$6); //@line 526 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($4,$6,$4); //@line 527 "SIDH_v1.0/ec_isogeny.c"
 $16 = $2; //@line 528 "SIDH_v1.0/ec_isogeny.c"
 $17 = $3; //@line 528 "SIDH_v1.0/ec_isogeny.c"
 $18 = ((($17)) + 192|0); //@line 528 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($16,$18,$6); //@line 528 "SIDH_v1.0/ec_isogeny.c"
 _fp2sub751($5,$6,$5); //@line 529 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($4,$4); //@line 530 "SIDH_v1.0/ec_isogeny.c"
 _fp2sqr751_mont($5,$5); //@line 531 "SIDH_v1.0/ec_isogeny.c"
 $19 = $3; //@line 532 "SIDH_v1.0/ec_isogeny.c"
 $20 = $3; //@line 532 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($19,$4,$20); //@line 532 "SIDH_v1.0/ec_isogeny.c"
 $21 = $3; //@line 533 "SIDH_v1.0/ec_isogeny.c"
 $22 = ((($21)) + 192|0); //@line 533 "SIDH_v1.0/ec_isogeny.c"
 $23 = $3; //@line 533 "SIDH_v1.0/ec_isogeny.c"
 $24 = ((($23)) + 192|0); //@line 533 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($22,$5,$24); //@line 533 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 534 "SIDH_v1.0/ec_isogeny.c"
}
function _inv_4_way($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 592|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(592|0);
 $8 = sp + 384|0;
 $9 = sp + 192|0;
 $10 = sp;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 $11 = $4; //@line 543 "SIDH_v1.0/ec_isogeny.c"
 $12 = $5; //@line 543 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($11,$12,$8); //@line 543 "SIDH_v1.0/ec_isogeny.c"
 $13 = $6; //@line 544 "SIDH_v1.0/ec_isogeny.c"
 $14 = $7; //@line 544 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($13,$14,$9); //@line 544 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($8,$9,$10); //@line 545 "SIDH_v1.0/ec_isogeny.c"
 _fp2inv751_mont($10); //@line 546 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($8,$10,$8); //@line 547 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($9,$10,$9); //@line 548 "SIDH_v1.0/ec_isogeny.c"
 $15 = $6; //@line 549 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($8,$15,$10); //@line 549 "SIDH_v1.0/ec_isogeny.c"
 $16 = $7; //@line 550 "SIDH_v1.0/ec_isogeny.c"
 $17 = $6; //@line 550 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($8,$16,$17); //@line 550 "SIDH_v1.0/ec_isogeny.c"
 $18 = $7; //@line 551 "SIDH_v1.0/ec_isogeny.c"
 _fp2copy751($10,$18); //@line 551 "SIDH_v1.0/ec_isogeny.c"
 $19 = $4; //@line 552 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($19,$9,$10); //@line 552 "SIDH_v1.0/ec_isogeny.c"
 $20 = $5; //@line 553 "SIDH_v1.0/ec_isogeny.c"
 $21 = $4; //@line 553 "SIDH_v1.0/ec_isogeny.c"
 _fp2mul751_mont($20,$9,$21); //@line 553 "SIDH_v1.0/ec_isogeny.c"
 $22 = $5; //@line 554 "SIDH_v1.0/ec_isogeny.c"
 _fp2copy751($10,$22); //@line 554 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 555 "SIDH_v1.0/ec_isogeny.c"
}
function _distort_and_diff($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(112|0);
 $6 = sp;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $7 = $5; //@line 564 "SIDH_v1.0/ec_isogeny.c"
 $8 = ((($7)) + 80|0); //@line 564 "SIDH_v1.0/ec_isogeny.c"
 $9 = HEAP32[$8>>2]|0; //@line 564 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($9,$6); //@line 564 "SIDH_v1.0/ec_isogeny.c"
 $10 = $3; //@line 565 "SIDH_v1.0/ec_isogeny.c"
 $11 = $4; //@line 565 "SIDH_v1.0/ec_isogeny.c"
 _fpsqr751_mont($10,$11); //@line 565 "SIDH_v1.0/ec_isogeny.c"
 $12 = $4; //@line 566 "SIDH_v1.0/ec_isogeny.c"
 $13 = $4; //@line 566 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($12,$6,$13); //@line 566 "SIDH_v1.0/ec_isogeny.c"
 $14 = $4; //@line 567 "SIDH_v1.0/ec_isogeny.c"
 $15 = $4; //@line 567 "SIDH_v1.0/ec_isogeny.c"
 $16 = ((($15)) + 96|0); //@line 567 "SIDH_v1.0/ec_isogeny.c"
 _fpcopy751($14,$16); //@line 567 "SIDH_v1.0/ec_isogeny.c"
 $17 = $4; //@line 568 "SIDH_v1.0/ec_isogeny.c"
 _fpzero751($17); //@line 568 "SIDH_v1.0/ec_isogeny.c"
 $18 = $3; //@line 569 "SIDH_v1.0/ec_isogeny.c"
 $19 = $3; //@line 569 "SIDH_v1.0/ec_isogeny.c"
 $20 = $4; //@line 569 "SIDH_v1.0/ec_isogeny.c"
 $21 = ((($20)) + 192|0); //@line 569 "SIDH_v1.0/ec_isogeny.c"
 _fpadd751($18,$19,$21); //@line 569 "SIDH_v1.0/ec_isogeny.c"
 STACKTOP = sp;return; //@line 570 "SIDH_v1.0/ec_isogeny.c"
}
function _fpcopy751($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = 0; //@line 31 "SIDH_v1.0/fpx.c"
 while(1) {
  $5 = $4; //@line 31 "SIDH_v1.0/fpx.c"
  $6 = ($5>>>0)<(24); //@line 31 "SIDH_v1.0/fpx.c"
  if (!($6)) {
   break;
  }
  $7 = $4; //@line 32 "SIDH_v1.0/fpx.c"
  $8 = $2; //@line 32 "SIDH_v1.0/fpx.c"
  $9 = (($8) + ($7<<2)|0); //@line 32 "SIDH_v1.0/fpx.c"
  $10 = HEAP32[$9>>2]|0; //@line 32 "SIDH_v1.0/fpx.c"
  $11 = $4; //@line 32 "SIDH_v1.0/fpx.c"
  $12 = $3; //@line 32 "SIDH_v1.0/fpx.c"
  $13 = (($12) + ($11<<2)|0); //@line 32 "SIDH_v1.0/fpx.c"
  HEAP32[$13>>2] = $10; //@line 32 "SIDH_v1.0/fpx.c"
  $14 = $4; //@line 31 "SIDH_v1.0/fpx.c"
  $15 = (($14) + 1)|0; //@line 31 "SIDH_v1.0/fpx.c"
  $4 = $15; //@line 31 "SIDH_v1.0/fpx.c"
 }
 STACKTOP = sp;return; //@line 33 "SIDH_v1.0/fpx.c"
}
function _fpzero751($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = 0; //@line 40 "SIDH_v1.0/fpx.c"
 while(1) {
  $3 = $2; //@line 40 "SIDH_v1.0/fpx.c"
  $4 = ($3>>>0)<(24); //@line 40 "SIDH_v1.0/fpx.c"
  if (!($4)) {
   break;
  }
  $5 = $2; //@line 41 "SIDH_v1.0/fpx.c"
  $6 = $1; //@line 41 "SIDH_v1.0/fpx.c"
  $7 = (($6) + ($5<<2)|0); //@line 41 "SIDH_v1.0/fpx.c"
  HEAP32[$7>>2] = 0; //@line 41 "SIDH_v1.0/fpx.c"
  $8 = $2; //@line 40 "SIDH_v1.0/fpx.c"
  $9 = (($8) + 1)|0; //@line 40 "SIDH_v1.0/fpx.c"
  $2 = $9; //@line 40 "SIDH_v1.0/fpx.c"
 }
 STACKTOP = sp;return; //@line 42 "SIDH_v1.0/fpx.c"
}
function _to_mont($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2; //@line 50 "SIDH_v1.0/fpx.c"
 $5 = $3; //@line 50 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($4,2840,$5); //@line 50 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 51 "SIDH_v1.0/fpx.c"
}
function _fpmul751_mont($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(208|0);
 $6 = sp;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 _memset(($6|0),0,192)|0; //@line 173 "SIDH_v1.0/fpx.c"
 $7 = $3; //@line 175 "SIDH_v1.0/fpx.c"
 $8 = $4; //@line 175 "SIDH_v1.0/fpx.c"
 _mp_mul($7,$8,$6,24); //@line 175 "SIDH_v1.0/fpx.c"
 $9 = $5; //@line 176 "SIDH_v1.0/fpx.c"
 _rdc_mont($6,$9); //@line 176 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 177 "SIDH_v1.0/fpx.c"
}
function _from_mont($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(112|0);
 $4 = sp;
 $2 = $0;
 $3 = $1;
 dest=$4; stop=dest+96|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0)); //@line 57 "SIDH_v1.0/fpx.c"
 HEAP32[$4>>2] = 1; //@line 59 "SIDH_v1.0/fpx.c"
 $5 = $2; //@line 60 "SIDH_v1.0/fpx.c"
 $6 = $3; //@line 60 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($5,$4,$6); //@line 60 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 61 "SIDH_v1.0/fpx.c"
}
function _copy_words($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = 0; //@line 104 "SIDH_v1.0/fpx.c"
 while(1) {
  $7 = $6; //@line 104 "SIDH_v1.0/fpx.c"
  $8 = $5; //@line 104 "SIDH_v1.0/fpx.c"
  $9 = ($7>>>0)<($8>>>0); //@line 104 "SIDH_v1.0/fpx.c"
  if (!($9)) {
   break;
  }
  $10 = $6; //@line 105 "SIDH_v1.0/fpx.c"
  $11 = $3; //@line 105 "SIDH_v1.0/fpx.c"
  $12 = (($11) + ($10<<2)|0); //@line 105 "SIDH_v1.0/fpx.c"
  $13 = HEAP32[$12>>2]|0; //@line 105 "SIDH_v1.0/fpx.c"
  $14 = $6; //@line 105 "SIDH_v1.0/fpx.c"
  $15 = $4; //@line 105 "SIDH_v1.0/fpx.c"
  $16 = (($15) + ($14<<2)|0); //@line 105 "SIDH_v1.0/fpx.c"
  HEAP32[$16>>2] = $13; //@line 105 "SIDH_v1.0/fpx.c"
  $17 = $6; //@line 104 "SIDH_v1.0/fpx.c"
  $18 = (($17) + 1)|0; //@line 104 "SIDH_v1.0/fpx.c"
  $6 = $18; //@line 104 "SIDH_v1.0/fpx.c"
 }
 STACKTOP = sp;return; //@line 107 "SIDH_v1.0/fpx.c"
}
function _mp_sub($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 $9 = 0; //@line 112 "SIDH_v1.0/fpx.c"
 $8 = 0; //@line 114 "SIDH_v1.0/fpx.c"
 while(1) {
  $12 = $8; //@line 114 "SIDH_v1.0/fpx.c"
  $13 = $7; //@line 114 "SIDH_v1.0/fpx.c"
  $14 = ($12>>>0)<($13>>>0); //@line 114 "SIDH_v1.0/fpx.c"
  if (!($14)) {
   break;
  }
  $15 = $8; //@line 115 "SIDH_v1.0/fpx.c"
  $16 = $4; //@line 115 "SIDH_v1.0/fpx.c"
  $17 = (($16) + ($15<<2)|0); //@line 115 "SIDH_v1.0/fpx.c"
  $18 = HEAP32[$17>>2]|0; //@line 115 "SIDH_v1.0/fpx.c"
  $19 = $8; //@line 115 "SIDH_v1.0/fpx.c"
  $20 = $5; //@line 115 "SIDH_v1.0/fpx.c"
  $21 = (($20) + ($19<<2)|0); //@line 115 "SIDH_v1.0/fpx.c"
  $22 = HEAP32[$21>>2]|0; //@line 115 "SIDH_v1.0/fpx.c"
  $23 = (($18) - ($22))|0; //@line 115 "SIDH_v1.0/fpx.c"
  $10 = $23; //@line 115 "SIDH_v1.0/fpx.c"
  $24 = $8; //@line 115 "SIDH_v1.0/fpx.c"
  $25 = $4; //@line 115 "SIDH_v1.0/fpx.c"
  $26 = (($25) + ($24<<2)|0); //@line 115 "SIDH_v1.0/fpx.c"
  $27 = HEAP32[$26>>2]|0; //@line 115 "SIDH_v1.0/fpx.c"
  $28 = $8; //@line 115 "SIDH_v1.0/fpx.c"
  $29 = $5; //@line 115 "SIDH_v1.0/fpx.c"
  $30 = (($29) + ($28<<2)|0); //@line 115 "SIDH_v1.0/fpx.c"
  $31 = HEAP32[$30>>2]|0; //@line 115 "SIDH_v1.0/fpx.c"
  $32 = (_is_digit_lessthan_ct($27,$31)|0); //@line 115 "SIDH_v1.0/fpx.c"
  $33 = $9; //@line 115 "SIDH_v1.0/fpx.c"
  $34 = $10; //@line 115 "SIDH_v1.0/fpx.c"
  $35 = (_is_digit_zero_ct($34)|0); //@line 115 "SIDH_v1.0/fpx.c"
  $36 = $33 & $35; //@line 115 "SIDH_v1.0/fpx.c"
  $37 = $32 | $36; //@line 115 "SIDH_v1.0/fpx.c"
  $11 = $37; //@line 115 "SIDH_v1.0/fpx.c"
  $38 = $10; //@line 115 "SIDH_v1.0/fpx.c"
  $39 = $9; //@line 115 "SIDH_v1.0/fpx.c"
  $40 = (($38) - ($39))|0; //@line 115 "SIDH_v1.0/fpx.c"
  $41 = $8; //@line 115 "SIDH_v1.0/fpx.c"
  $42 = $6; //@line 115 "SIDH_v1.0/fpx.c"
  $43 = (($42) + ($41<<2)|0); //@line 115 "SIDH_v1.0/fpx.c"
  HEAP32[$43>>2] = $40; //@line 115 "SIDH_v1.0/fpx.c"
  $44 = $11; //@line 115 "SIDH_v1.0/fpx.c"
  $9 = $44; //@line 115 "SIDH_v1.0/fpx.c"
  $45 = $8; //@line 114 "SIDH_v1.0/fpx.c"
  $46 = (($45) + 1)|0; //@line 114 "SIDH_v1.0/fpx.c"
  $8 = $46; //@line 114 "SIDH_v1.0/fpx.c"
 }
 $47 = $9; //@line 118 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return ($47|0); //@line 118 "SIDH_v1.0/fpx.c"
}
function _is_digit_lessthan_ct($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $5 = $2; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $6 = $3; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $7 = $5 ^ $6; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $8 = $2; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $9 = $3; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $10 = (($8) - ($9))|0; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $11 = $3; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $12 = $10 ^ $11; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $13 = $7 | $12; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $14 = $4 ^ $13; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 $15 = $14 >>> 31; //@line 82 "SIDH_v1.0/SIDH_internal.h"
 STACKTOP = sp;return ($15|0); //@line 82 "SIDH_v1.0/SIDH_internal.h"
}
function _is_digit_zero_ct($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1; //@line 77 "SIDH_v1.0/SIDH_internal.h"
 $3 = (_is_digit_nonzero_ct($2)|0); //@line 77 "SIDH_v1.0/SIDH_internal.h"
 $4 = 1 ^ $3; //@line 77 "SIDH_v1.0/SIDH_internal.h"
 STACKTOP = sp;return ($4|0); //@line 77 "SIDH_v1.0/SIDH_internal.h"
}
function _is_digit_nonzero_ct($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1; //@line 72 "SIDH_v1.0/SIDH_internal.h"
 $3 = $1; //@line 72 "SIDH_v1.0/SIDH_internal.h"
 $4 = (0 - ($3))|0; //@line 72 "SIDH_v1.0/SIDH_internal.h"
 $5 = $2 | $4; //@line 72 "SIDH_v1.0/SIDH_internal.h"
 $6 = $5 >>> 31; //@line 72 "SIDH_v1.0/SIDH_internal.h"
 STACKTOP = sp;return ($6|0); //@line 72 "SIDH_v1.0/SIDH_internal.h"
}
function _mp_add($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 $9 = 0; //@line 124 "SIDH_v1.0/fpx.c"
 $8 = 0; //@line 126 "SIDH_v1.0/fpx.c"
 while(1) {
  $11 = $8; //@line 126 "SIDH_v1.0/fpx.c"
  $12 = $7; //@line 126 "SIDH_v1.0/fpx.c"
  $13 = ($11>>>0)<($12>>>0); //@line 126 "SIDH_v1.0/fpx.c"
  if (!($13)) {
   break;
  }
  $14 = $8; //@line 127 "SIDH_v1.0/fpx.c"
  $15 = $4; //@line 127 "SIDH_v1.0/fpx.c"
  $16 = (($15) + ($14<<2)|0); //@line 127 "SIDH_v1.0/fpx.c"
  $17 = HEAP32[$16>>2]|0; //@line 127 "SIDH_v1.0/fpx.c"
  $18 = $9; //@line 127 "SIDH_v1.0/fpx.c"
  $19 = (($17) + ($18))|0; //@line 127 "SIDH_v1.0/fpx.c"
  $10 = $19; //@line 127 "SIDH_v1.0/fpx.c"
  $20 = $8; //@line 127 "SIDH_v1.0/fpx.c"
  $21 = $5; //@line 127 "SIDH_v1.0/fpx.c"
  $22 = (($21) + ($20<<2)|0); //@line 127 "SIDH_v1.0/fpx.c"
  $23 = HEAP32[$22>>2]|0; //@line 127 "SIDH_v1.0/fpx.c"
  $24 = $10; //@line 127 "SIDH_v1.0/fpx.c"
  $25 = (($23) + ($24))|0; //@line 127 "SIDH_v1.0/fpx.c"
  $26 = $8; //@line 127 "SIDH_v1.0/fpx.c"
  $27 = $6; //@line 127 "SIDH_v1.0/fpx.c"
  $28 = (($27) + ($26<<2)|0); //@line 127 "SIDH_v1.0/fpx.c"
  HEAP32[$28>>2] = $25; //@line 127 "SIDH_v1.0/fpx.c"
  $29 = $10; //@line 127 "SIDH_v1.0/fpx.c"
  $30 = $9; //@line 127 "SIDH_v1.0/fpx.c"
  $31 = (_is_digit_lessthan_ct($29,$30)|0); //@line 127 "SIDH_v1.0/fpx.c"
  $32 = $8; //@line 127 "SIDH_v1.0/fpx.c"
  $33 = $6; //@line 127 "SIDH_v1.0/fpx.c"
  $34 = (($33) + ($32<<2)|0); //@line 127 "SIDH_v1.0/fpx.c"
  $35 = HEAP32[$34>>2]|0; //@line 127 "SIDH_v1.0/fpx.c"
  $36 = $10; //@line 127 "SIDH_v1.0/fpx.c"
  $37 = (_is_digit_lessthan_ct($35,$36)|0); //@line 127 "SIDH_v1.0/fpx.c"
  $38 = $31 | $37; //@line 127 "SIDH_v1.0/fpx.c"
  $9 = $38; //@line 127 "SIDH_v1.0/fpx.c"
  $39 = $8; //@line 126 "SIDH_v1.0/fpx.c"
  $40 = (($39) + 1)|0; //@line 126 "SIDH_v1.0/fpx.c"
  $8 = $40; //@line 126 "SIDH_v1.0/fpx.c"
 }
 $41 = $9; //@line 130 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return ($41|0); //@line 130 "SIDH_v1.0/fpx.c"
}
function _mp_shiftr1($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = 0; //@line 138 "SIDH_v1.0/fpx.c"
 while(1) {
  $5 = $4; //@line 138 "SIDH_v1.0/fpx.c"
  $6 = $3; //@line 138 "SIDH_v1.0/fpx.c"
  $7 = (($6) - 1)|0; //@line 138 "SIDH_v1.0/fpx.c"
  $8 = ($5>>>0)<($7>>>0); //@line 138 "SIDH_v1.0/fpx.c"
  if (!($8)) {
   break;
  }
  $9 = $4; //@line 139 "SIDH_v1.0/fpx.c"
  $10 = $2; //@line 139 "SIDH_v1.0/fpx.c"
  $11 = (($10) + ($9<<2)|0); //@line 139 "SIDH_v1.0/fpx.c"
  $12 = HEAP32[$11>>2]|0; //@line 139 "SIDH_v1.0/fpx.c"
  $13 = $12 >>> 1; //@line 139 "SIDH_v1.0/fpx.c"
  $14 = $4; //@line 139 "SIDH_v1.0/fpx.c"
  $15 = (($14) + 1)|0; //@line 139 "SIDH_v1.0/fpx.c"
  $16 = $2; //@line 139 "SIDH_v1.0/fpx.c"
  $17 = (($16) + ($15<<2)|0); //@line 139 "SIDH_v1.0/fpx.c"
  $18 = HEAP32[$17>>2]|0; //@line 139 "SIDH_v1.0/fpx.c"
  $19 = $18 << 31; //@line 139 "SIDH_v1.0/fpx.c"
  $20 = $13 ^ $19; //@line 139 "SIDH_v1.0/fpx.c"
  $21 = $4; //@line 139 "SIDH_v1.0/fpx.c"
  $22 = $2; //@line 139 "SIDH_v1.0/fpx.c"
  $23 = (($22) + ($21<<2)|0); //@line 139 "SIDH_v1.0/fpx.c"
  HEAP32[$23>>2] = $20; //@line 139 "SIDH_v1.0/fpx.c"
  $24 = $4; //@line 138 "SIDH_v1.0/fpx.c"
  $25 = (($24) + 1)|0; //@line 138 "SIDH_v1.0/fpx.c"
  $4 = $25; //@line 138 "SIDH_v1.0/fpx.c"
 }
 $26 = $3; //@line 141 "SIDH_v1.0/fpx.c"
 $27 = (($26) - 1)|0; //@line 141 "SIDH_v1.0/fpx.c"
 $28 = $2; //@line 141 "SIDH_v1.0/fpx.c"
 $29 = (($28) + ($27<<2)|0); //@line 141 "SIDH_v1.0/fpx.c"
 $30 = HEAP32[$29>>2]|0; //@line 141 "SIDH_v1.0/fpx.c"
 $31 = $30 >>> 1; //@line 141 "SIDH_v1.0/fpx.c"
 HEAP32[$29>>2] = $31; //@line 141 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 142 "SIDH_v1.0/fpx.c"
}
function _mp_shiftl1($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $5 = $3; //@line 149 "SIDH_v1.0/fpx.c"
 $6 = (($5) - 1)|0; //@line 149 "SIDH_v1.0/fpx.c"
 $4 = $6; //@line 149 "SIDH_v1.0/fpx.c"
 while(1) {
  $7 = $4; //@line 149 "SIDH_v1.0/fpx.c"
  $8 = ($7|0)>(0); //@line 149 "SIDH_v1.0/fpx.c"
  if (!($8)) {
   break;
  }
  $9 = $4; //@line 150 "SIDH_v1.0/fpx.c"
  $10 = $2; //@line 150 "SIDH_v1.0/fpx.c"
  $11 = (($10) + ($9<<2)|0); //@line 150 "SIDH_v1.0/fpx.c"
  $12 = HEAP32[$11>>2]|0; //@line 150 "SIDH_v1.0/fpx.c"
  $13 = $12 << 1; //@line 150 "SIDH_v1.0/fpx.c"
  $14 = $4; //@line 150 "SIDH_v1.0/fpx.c"
  $15 = (($14) - 1)|0; //@line 150 "SIDH_v1.0/fpx.c"
  $16 = $2; //@line 150 "SIDH_v1.0/fpx.c"
  $17 = (($16) + ($15<<2)|0); //@line 150 "SIDH_v1.0/fpx.c"
  $18 = HEAP32[$17>>2]|0; //@line 150 "SIDH_v1.0/fpx.c"
  $19 = $18 >>> 31; //@line 150 "SIDH_v1.0/fpx.c"
  $20 = $13 ^ $19; //@line 150 "SIDH_v1.0/fpx.c"
  $21 = $4; //@line 150 "SIDH_v1.0/fpx.c"
  $22 = $2; //@line 150 "SIDH_v1.0/fpx.c"
  $23 = (($22) + ($21<<2)|0); //@line 150 "SIDH_v1.0/fpx.c"
  HEAP32[$23>>2] = $20; //@line 150 "SIDH_v1.0/fpx.c"
  $24 = $4; //@line 149 "SIDH_v1.0/fpx.c"
  $25 = (($24) + -1)|0; //@line 149 "SIDH_v1.0/fpx.c"
  $4 = $25; //@line 149 "SIDH_v1.0/fpx.c"
 }
 $26 = $2; //@line 152 "SIDH_v1.0/fpx.c"
 $27 = HEAP32[$26>>2]|0; //@line 152 "SIDH_v1.0/fpx.c"
 $28 = $27 << 1; //@line 152 "SIDH_v1.0/fpx.c"
 HEAP32[$26>>2] = $28; //@line 152 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 153 "SIDH_v1.0/fpx.c"
}
function _fpsqr751_mont($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(208|0);
 $4 = sp;
 $2 = $0;
 $3 = $1;
 _memset(($4|0),0,192)|0; //@line 182 "SIDH_v1.0/fpx.c"
 $5 = $2; //@line 184 "SIDH_v1.0/fpx.c"
 $6 = $2; //@line 184 "SIDH_v1.0/fpx.c"
 _mp_mul($5,$6,$4,24); //@line 184 "SIDH_v1.0/fpx.c"
 $7 = $3; //@line 185 "SIDH_v1.0/fpx.c"
 _rdc_mont($4,$7); //@line 185 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 186 "SIDH_v1.0/fpx.c"
}
function _fpinv751_mont($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0;
 var $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0;
 var $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0;
 var $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0;
 var $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0;
 var $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0;
 var $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0;
 var $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0;
 var $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0;
 var $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0;
 var $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0;
 var $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0;
 var $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0;
 var $333 = 0, $334 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 2704|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(2704|0);
 $2 = sp + 104|0;
 $3 = sp + 8|0;
 $1 = $0;
 $6 = $1; //@line 195 "SIDH_v1.0/fpx.c"
 _fpsqr751_mont($6,$3); //@line 195 "SIDH_v1.0/fpx.c"
 $7 = $1; //@line 196 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($7,$3,$2); //@line 196 "SIDH_v1.0/fpx.c"
 $8 = ((($2)) + 96|0); //@line 197 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($2,$3,$8); //@line 197 "SIDH_v1.0/fpx.c"
 $9 = ((($2)) + 96|0); //@line 198 "SIDH_v1.0/fpx.c"
 $10 = ((($2)) + 192|0); //@line 198 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($9,$3,$10); //@line 198 "SIDH_v1.0/fpx.c"
 $11 = ((($2)) + 192|0); //@line 199 "SIDH_v1.0/fpx.c"
 $12 = ((($2)) + 288|0); //@line 199 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($11,$3,$12); //@line 199 "SIDH_v1.0/fpx.c"
 $13 = ((($2)) + 288|0); //@line 200 "SIDH_v1.0/fpx.c"
 $14 = ((($2)) + 288|0); //@line 200 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($13,$3,$14); //@line 200 "SIDH_v1.0/fpx.c"
 $4 = 3; //@line 201 "SIDH_v1.0/fpx.c"
 while(1) {
  $15 = $4; //@line 201 "SIDH_v1.0/fpx.c"
  $16 = ($15>>>0)<=(8); //@line 201 "SIDH_v1.0/fpx.c"
  if (!($16)) {
   break;
  }
  $17 = $4; //@line 201 "SIDH_v1.0/fpx.c"
  $18 = (($2) + (($17*96)|0)|0); //@line 201 "SIDH_v1.0/fpx.c"
  $19 = $4; //@line 201 "SIDH_v1.0/fpx.c"
  $20 = (($19) + 1)|0; //@line 201 "SIDH_v1.0/fpx.c"
  $21 = (($2) + (($20*96)|0)|0); //@line 201 "SIDH_v1.0/fpx.c"
  _fpmul751_mont($18,$3,$21); //@line 201 "SIDH_v1.0/fpx.c"
  $22 = $4; //@line 201 "SIDH_v1.0/fpx.c"
  $23 = (($22) + 1)|0; //@line 201 "SIDH_v1.0/fpx.c"
  $4 = $23; //@line 201 "SIDH_v1.0/fpx.c"
 }
 $24 = ((($2)) + 864|0); //@line 202 "SIDH_v1.0/fpx.c"
 $25 = ((($2)) + 864|0); //@line 202 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($24,$3,$25); //@line 202 "SIDH_v1.0/fpx.c"
 $4 = 9; //@line 203 "SIDH_v1.0/fpx.c"
 while(1) {
  $26 = $4; //@line 203 "SIDH_v1.0/fpx.c"
  $27 = ($26>>>0)<=(20); //@line 203 "SIDH_v1.0/fpx.c"
  if (!($27)) {
   break;
  }
  $28 = $4; //@line 203 "SIDH_v1.0/fpx.c"
  $29 = (($2) + (($28*96)|0)|0); //@line 203 "SIDH_v1.0/fpx.c"
  $30 = $4; //@line 203 "SIDH_v1.0/fpx.c"
  $31 = (($30) + 1)|0; //@line 203 "SIDH_v1.0/fpx.c"
  $32 = (($2) + (($31*96)|0)|0); //@line 203 "SIDH_v1.0/fpx.c"
  _fpmul751_mont($29,$3,$32); //@line 203 "SIDH_v1.0/fpx.c"
  $33 = $4; //@line 203 "SIDH_v1.0/fpx.c"
  $34 = (($33) + 1)|0; //@line 203 "SIDH_v1.0/fpx.c"
  $4 = $34; //@line 203 "SIDH_v1.0/fpx.c"
 }
 $35 = ((($2)) + 2016|0); //@line 204 "SIDH_v1.0/fpx.c"
 $36 = ((($2)) + 2016|0); //@line 204 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($35,$3,$36); //@line 204 "SIDH_v1.0/fpx.c"
 $4 = 21; //@line 205 "SIDH_v1.0/fpx.c"
 while(1) {
  $37 = $4; //@line 205 "SIDH_v1.0/fpx.c"
  $38 = ($37>>>0)<=(24); //@line 205 "SIDH_v1.0/fpx.c"
  if (!($38)) {
   break;
  }
  $39 = $4; //@line 205 "SIDH_v1.0/fpx.c"
  $40 = (($2) + (($39*96)|0)|0); //@line 205 "SIDH_v1.0/fpx.c"
  $41 = $4; //@line 205 "SIDH_v1.0/fpx.c"
  $42 = (($41) + 1)|0; //@line 205 "SIDH_v1.0/fpx.c"
  $43 = (($2) + (($42*96)|0)|0); //@line 205 "SIDH_v1.0/fpx.c"
  _fpmul751_mont($40,$3,$43); //@line 205 "SIDH_v1.0/fpx.c"
  $44 = $4; //@line 205 "SIDH_v1.0/fpx.c"
  $45 = (($44) + 1)|0; //@line 205 "SIDH_v1.0/fpx.c"
  $4 = $45; //@line 205 "SIDH_v1.0/fpx.c"
 }
 $46 = ((($2)) + 2400|0); //@line 206 "SIDH_v1.0/fpx.c"
 $47 = ((($2)) + 2400|0); //@line 206 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($46,$3,$47); //@line 206 "SIDH_v1.0/fpx.c"
 $48 = ((($2)) + 2400|0); //@line 207 "SIDH_v1.0/fpx.c"
 $49 = ((($2)) + 2496|0); //@line 207 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($48,$3,$49); //@line 207 "SIDH_v1.0/fpx.c"
 $50 = $1; //@line 209 "SIDH_v1.0/fpx.c"
 _fpcopy751($50,$3); //@line 209 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 210 "SIDH_v1.0/fpx.c"
 while(1) {
  $51 = $4; //@line 210 "SIDH_v1.0/fpx.c"
  $52 = ($51>>>0)<(6); //@line 210 "SIDH_v1.0/fpx.c"
  if (!($52)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 210 "SIDH_v1.0/fpx.c"
  $53 = $4; //@line 210 "SIDH_v1.0/fpx.c"
  $54 = (($53) + 1)|0; //@line 210 "SIDH_v1.0/fpx.c"
  $4 = $54; //@line 210 "SIDH_v1.0/fpx.c"
 }
 $55 = ((($2)) + 1920|0); //@line 211 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($55,$3,$3); //@line 211 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 212 "SIDH_v1.0/fpx.c"
 while(1) {
  $56 = $4; //@line 212 "SIDH_v1.0/fpx.c"
  $57 = ($56>>>0)<(6); //@line 212 "SIDH_v1.0/fpx.c"
  if (!($57)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 212 "SIDH_v1.0/fpx.c"
  $58 = $4; //@line 212 "SIDH_v1.0/fpx.c"
  $59 = (($58) + 1)|0; //@line 212 "SIDH_v1.0/fpx.c"
  $4 = $59; //@line 212 "SIDH_v1.0/fpx.c"
 }
 $60 = ((($2)) + 2304|0); //@line 213 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($60,$3,$3); //@line 213 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 214 "SIDH_v1.0/fpx.c"
 while(1) {
  $61 = $4; //@line 214 "SIDH_v1.0/fpx.c"
  $62 = ($61>>>0)<(6); //@line 214 "SIDH_v1.0/fpx.c"
  if (!($62)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 214 "SIDH_v1.0/fpx.c"
  $63 = $4; //@line 214 "SIDH_v1.0/fpx.c"
  $64 = (($63) + 1)|0; //@line 214 "SIDH_v1.0/fpx.c"
  $4 = $64; //@line 214 "SIDH_v1.0/fpx.c"
 }
 $65 = ((($2)) + 1056|0); //@line 215 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($65,$3,$3); //@line 215 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 216 "SIDH_v1.0/fpx.c"
 while(1) {
  $66 = $4; //@line 216 "SIDH_v1.0/fpx.c"
  $67 = ($66>>>0)<(6); //@line 216 "SIDH_v1.0/fpx.c"
  if (!($67)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 216 "SIDH_v1.0/fpx.c"
  $68 = $4; //@line 216 "SIDH_v1.0/fpx.c"
  $69 = (($68) + 1)|0; //@line 216 "SIDH_v1.0/fpx.c"
  $4 = $69; //@line 216 "SIDH_v1.0/fpx.c"
 }
 $70 = ((($2)) + 768|0); //@line 217 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($70,$3,$3); //@line 217 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 218 "SIDH_v1.0/fpx.c"
 while(1) {
  $71 = $4; //@line 218 "SIDH_v1.0/fpx.c"
  $72 = ($71>>>0)<(8); //@line 218 "SIDH_v1.0/fpx.c"
  if (!($72)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 218 "SIDH_v1.0/fpx.c"
  $73 = $4; //@line 218 "SIDH_v1.0/fpx.c"
  $74 = (($73) + 1)|0; //@line 218 "SIDH_v1.0/fpx.c"
  $4 = $74; //@line 218 "SIDH_v1.0/fpx.c"
 }
 $75 = ((($2)) + 192|0); //@line 219 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($75,$3,$3); //@line 219 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 220 "SIDH_v1.0/fpx.c"
 while(1) {
  $76 = $4; //@line 220 "SIDH_v1.0/fpx.c"
  $77 = ($76>>>0)<(6); //@line 220 "SIDH_v1.0/fpx.c"
  if (!($77)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 220 "SIDH_v1.0/fpx.c"
  $78 = $4; //@line 220 "SIDH_v1.0/fpx.c"
  $79 = (($78) + 1)|0; //@line 220 "SIDH_v1.0/fpx.c"
  $4 = $79; //@line 220 "SIDH_v1.0/fpx.c"
 }
 $80 = ((($2)) + 2208|0); //@line 221 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($80,$3,$3); //@line 221 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 222 "SIDH_v1.0/fpx.c"
 while(1) {
  $81 = $4; //@line 222 "SIDH_v1.0/fpx.c"
  $82 = ($81>>>0)<(6); //@line 222 "SIDH_v1.0/fpx.c"
  if (!($82)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 222 "SIDH_v1.0/fpx.c"
  $83 = $4; //@line 222 "SIDH_v1.0/fpx.c"
  $84 = (($83) + 1)|0; //@line 222 "SIDH_v1.0/fpx.c"
  $4 = $84; //@line 222 "SIDH_v1.0/fpx.c"
 }
 $85 = ((($2)) + 192|0); //@line 223 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($85,$3,$3); //@line 223 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 224 "SIDH_v1.0/fpx.c"
 while(1) {
  $86 = $4; //@line 224 "SIDH_v1.0/fpx.c"
  $87 = ($86>>>0)<(9); //@line 224 "SIDH_v1.0/fpx.c"
  if (!($87)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 224 "SIDH_v1.0/fpx.c"
  $88 = $4; //@line 224 "SIDH_v1.0/fpx.c"
  $89 = (($88) + 1)|0; //@line 224 "SIDH_v1.0/fpx.c"
  $4 = $89; //@line 224 "SIDH_v1.0/fpx.c"
 }
 $90 = ((($2)) + 192|0); //@line 225 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($90,$3,$3); //@line 225 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 226 "SIDH_v1.0/fpx.c"
 while(1) {
  $91 = $4; //@line 226 "SIDH_v1.0/fpx.c"
  $92 = ($91>>>0)<(10); //@line 226 "SIDH_v1.0/fpx.c"
  if (!($92)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 226 "SIDH_v1.0/fpx.c"
  $93 = $4; //@line 226 "SIDH_v1.0/fpx.c"
  $94 = (($93) + 1)|0; //@line 226 "SIDH_v1.0/fpx.c"
  $4 = $94; //@line 226 "SIDH_v1.0/fpx.c"
 }
 $95 = ((($2)) + 1440|0); //@line 227 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($95,$3,$3); //@line 227 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 228 "SIDH_v1.0/fpx.c"
 while(1) {
  $96 = $4; //@line 228 "SIDH_v1.0/fpx.c"
  $97 = ($96>>>0)<(8); //@line 228 "SIDH_v1.0/fpx.c"
  if (!($97)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 228 "SIDH_v1.0/fpx.c"
  $98 = $4; //@line 228 "SIDH_v1.0/fpx.c"
  $99 = (($98) + 1)|0; //@line 228 "SIDH_v1.0/fpx.c"
  $4 = $99; //@line 228 "SIDH_v1.0/fpx.c"
 }
 $100 = ((($2)) + 1248|0); //@line 229 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($100,$3,$3); //@line 229 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 230 "SIDH_v1.0/fpx.c"
 while(1) {
  $101 = $4; //@line 230 "SIDH_v1.0/fpx.c"
  $102 = ($101>>>0)<(8); //@line 230 "SIDH_v1.0/fpx.c"
  if (!($102)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 230 "SIDH_v1.0/fpx.c"
  $103 = $4; //@line 230 "SIDH_v1.0/fpx.c"
  $104 = (($103) + 1)|0; //@line 230 "SIDH_v1.0/fpx.c"
  $4 = $104; //@line 230 "SIDH_v1.0/fpx.c"
 }
 $105 = ((($2)) + 2496|0); //@line 231 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($105,$3,$3); //@line 231 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 232 "SIDH_v1.0/fpx.c"
 while(1) {
  $106 = $4; //@line 232 "SIDH_v1.0/fpx.c"
  $107 = ($106>>>0)<(8); //@line 232 "SIDH_v1.0/fpx.c"
  if (!($107)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 232 "SIDH_v1.0/fpx.c"
  $108 = $4; //@line 232 "SIDH_v1.0/fpx.c"
  $109 = (($108) + 1)|0; //@line 232 "SIDH_v1.0/fpx.c"
  $4 = $109; //@line 232 "SIDH_v1.0/fpx.c"
 }
 $110 = ((($2)) + 1920|0); //@line 233 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($110,$3,$3); //@line 233 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 234 "SIDH_v1.0/fpx.c"
 while(1) {
  $111 = $4; //@line 234 "SIDH_v1.0/fpx.c"
  $112 = ($111>>>0)<(6); //@line 234 "SIDH_v1.0/fpx.c"
  if (!($112)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 234 "SIDH_v1.0/fpx.c"
  $113 = $4; //@line 234 "SIDH_v1.0/fpx.c"
  $114 = (($113) + 1)|0; //@line 234 "SIDH_v1.0/fpx.c"
  $4 = $114; //@line 234 "SIDH_v1.0/fpx.c"
 }
 $115 = ((($2)) + 1056|0); //@line 235 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($115,$3,$3); //@line 235 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 236 "SIDH_v1.0/fpx.c"
 while(1) {
  $116 = $4; //@line 236 "SIDH_v1.0/fpx.c"
  $117 = ($116>>>0)<(6); //@line 236 "SIDH_v1.0/fpx.c"
  if (!($117)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 236 "SIDH_v1.0/fpx.c"
  $118 = $4; //@line 236 "SIDH_v1.0/fpx.c"
  $119 = (($118) + 1)|0; //@line 236 "SIDH_v1.0/fpx.c"
  $4 = $119; //@line 236 "SIDH_v1.0/fpx.c"
 }
 $120 = ((($2)) + 960|0); //@line 237 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($120,$3,$3); //@line 237 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 238 "SIDH_v1.0/fpx.c"
 while(1) {
  $121 = $4; //@line 238 "SIDH_v1.0/fpx.c"
  $122 = ($121>>>0)<(6); //@line 238 "SIDH_v1.0/fpx.c"
  if (!($122)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 238 "SIDH_v1.0/fpx.c"
  $123 = $4; //@line 238 "SIDH_v1.0/fpx.c"
  $124 = (($123) + 1)|0; //@line 238 "SIDH_v1.0/fpx.c"
  $4 = $124; //@line 238 "SIDH_v1.0/fpx.c"
 }
 $125 = ((($2)) + 1344|0); //@line 239 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($125,$3,$3); //@line 239 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 240 "SIDH_v1.0/fpx.c"
 while(1) {
  $126 = $4; //@line 240 "SIDH_v1.0/fpx.c"
  $127 = ($126>>>0)<(6); //@line 240 "SIDH_v1.0/fpx.c"
  if (!($127)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 240 "SIDH_v1.0/fpx.c"
  $128 = $4; //@line 240 "SIDH_v1.0/fpx.c"
  $129 = (($128) + 1)|0; //@line 240 "SIDH_v1.0/fpx.c"
  $4 = $129; //@line 240 "SIDH_v1.0/fpx.c"
 }
 $130 = ((($2)) + 384|0); //@line 241 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($130,$3,$3); //@line 241 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 242 "SIDH_v1.0/fpx.c"
 while(1) {
  $131 = $4; //@line 242 "SIDH_v1.0/fpx.c"
  $132 = ($131>>>0)<(10); //@line 242 "SIDH_v1.0/fpx.c"
  if (!($132)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 242 "SIDH_v1.0/fpx.c"
  $133 = $4; //@line 242 "SIDH_v1.0/fpx.c"
  $134 = (($133) + 1)|0; //@line 242 "SIDH_v1.0/fpx.c"
  $4 = $134; //@line 242 "SIDH_v1.0/fpx.c"
 }
 $135 = ((($2)) + 1728|0); //@line 243 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($135,$3,$3); //@line 243 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 244 "SIDH_v1.0/fpx.c"
 while(1) {
  $136 = $4; //@line 244 "SIDH_v1.0/fpx.c"
  $137 = ($136>>>0)<(6); //@line 244 "SIDH_v1.0/fpx.c"
  if (!($137)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 244 "SIDH_v1.0/fpx.c"
  $138 = $4; //@line 244 "SIDH_v1.0/fpx.c"
  $139 = (($138) + 1)|0; //@line 244 "SIDH_v1.0/fpx.c"
  $4 = $139; //@line 244 "SIDH_v1.0/fpx.c"
 }
 $140 = ((($2)) + 96|0); //@line 245 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($140,$3,$3); //@line 245 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 246 "SIDH_v1.0/fpx.c"
 while(1) {
  $141 = $4; //@line 246 "SIDH_v1.0/fpx.c"
  $142 = ($141>>>0)<(7); //@line 246 "SIDH_v1.0/fpx.c"
  if (!($142)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 246 "SIDH_v1.0/fpx.c"
  $143 = $4; //@line 246 "SIDH_v1.0/fpx.c"
  $144 = (($143) + 1)|0; //@line 246 "SIDH_v1.0/fpx.c"
  $4 = $144; //@line 246 "SIDH_v1.0/fpx.c"
 }
 $145 = ((($2)) + 2112|0); //@line 247 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($145,$3,$3); //@line 247 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 248 "SIDH_v1.0/fpx.c"
 while(1) {
  $146 = $4; //@line 248 "SIDH_v1.0/fpx.c"
  $147 = ($146>>>0)<(10); //@line 248 "SIDH_v1.0/fpx.c"
  if (!($147)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 248 "SIDH_v1.0/fpx.c"
  $148 = $4; //@line 248 "SIDH_v1.0/fpx.c"
  $149 = (($148) + 1)|0; //@line 248 "SIDH_v1.0/fpx.c"
  $4 = $149; //@line 248 "SIDH_v1.0/fpx.c"
 }
 $150 = ((($2)) + 576|0); //@line 249 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($150,$3,$3); //@line 249 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 250 "SIDH_v1.0/fpx.c"
 while(1) {
  $151 = $4; //@line 250 "SIDH_v1.0/fpx.c"
  $152 = ($151>>>0)<(7); //@line 250 "SIDH_v1.0/fpx.c"
  if (!($152)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 250 "SIDH_v1.0/fpx.c"
  $153 = $4; //@line 250 "SIDH_v1.0/fpx.c"
  $154 = (($153) + 1)|0; //@line 250 "SIDH_v1.0/fpx.c"
  $4 = $154; //@line 250 "SIDH_v1.0/fpx.c"
 }
 $155 = ((($2)) + 2304|0); //@line 251 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($155,$3,$3); //@line 251 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 252 "SIDH_v1.0/fpx.c"
 while(1) {
  $156 = $4; //@line 252 "SIDH_v1.0/fpx.c"
  $157 = ($156>>>0)<(6); //@line 252 "SIDH_v1.0/fpx.c"
  if (!($157)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 252 "SIDH_v1.0/fpx.c"
  $158 = $4; //@line 252 "SIDH_v1.0/fpx.c"
  $159 = (($158) + 1)|0; //@line 252 "SIDH_v1.0/fpx.c"
  $4 = $159; //@line 252 "SIDH_v1.0/fpx.c"
 }
 $160 = ((($2)) + 864|0); //@line 253 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($160,$3,$3); //@line 253 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 254 "SIDH_v1.0/fpx.c"
 while(1) {
  $161 = $4; //@line 254 "SIDH_v1.0/fpx.c"
  $162 = ($161>>>0)<(8); //@line 254 "SIDH_v1.0/fpx.c"
  if (!($162)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 254 "SIDH_v1.0/fpx.c"
  $163 = $4; //@line 254 "SIDH_v1.0/fpx.c"
  $164 = (($163) + 1)|0; //@line 254 "SIDH_v1.0/fpx.c"
  $4 = $164; //@line 254 "SIDH_v1.0/fpx.c"
 }
 $165 = ((($2)) + 1728|0); //@line 255 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($165,$3,$3); //@line 255 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 256 "SIDH_v1.0/fpx.c"
 while(1) {
  $166 = $4; //@line 256 "SIDH_v1.0/fpx.c"
  $167 = ($166>>>0)<(6); //@line 256 "SIDH_v1.0/fpx.c"
  if (!($167)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 256 "SIDH_v1.0/fpx.c"
  $168 = $4; //@line 256 "SIDH_v1.0/fpx.c"
  $169 = (($168) + 1)|0; //@line 256 "SIDH_v1.0/fpx.c"
  $4 = $169; //@line 256 "SIDH_v1.0/fpx.c"
 }
 $170 = ((($2)) + 1632|0); //@line 257 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($170,$3,$3); //@line 257 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 258 "SIDH_v1.0/fpx.c"
 while(1) {
  $171 = $4; //@line 258 "SIDH_v1.0/fpx.c"
  $172 = ($171>>>0)<(8); //@line 258 "SIDH_v1.0/fpx.c"
  if (!($172)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 258 "SIDH_v1.0/fpx.c"
  $173 = $4; //@line 258 "SIDH_v1.0/fpx.c"
  $174 = (($173) + 1)|0; //@line 258 "SIDH_v1.0/fpx.c"
  $4 = $174; //@line 258 "SIDH_v1.0/fpx.c"
 }
 $175 = $1; //@line 259 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($175,$3,$3); //@line 259 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 260 "SIDH_v1.0/fpx.c"
 while(1) {
  $176 = $4; //@line 260 "SIDH_v1.0/fpx.c"
  $177 = ($176>>>0)<(10); //@line 260 "SIDH_v1.0/fpx.c"
  if (!($177)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 260 "SIDH_v1.0/fpx.c"
  $178 = $4; //@line 260 "SIDH_v1.0/fpx.c"
  $179 = (($178) + 1)|0; //@line 260 "SIDH_v1.0/fpx.c"
  $4 = $179; //@line 260 "SIDH_v1.0/fpx.c"
 }
 $180 = ((($2)) + 1536|0); //@line 261 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($180,$3,$3); //@line 261 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 262 "SIDH_v1.0/fpx.c"
 while(1) {
  $181 = $4; //@line 262 "SIDH_v1.0/fpx.c"
  $182 = ($181>>>0)<(6); //@line 262 "SIDH_v1.0/fpx.c"
  if (!($182)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 262 "SIDH_v1.0/fpx.c"
  $183 = $4; //@line 262 "SIDH_v1.0/fpx.c"
  $184 = (($183) + 1)|0; //@line 262 "SIDH_v1.0/fpx.c"
  $4 = $184; //@line 262 "SIDH_v1.0/fpx.c"
 }
 $185 = ((($2)) + 672|0); //@line 263 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($185,$3,$3); //@line 263 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 264 "SIDH_v1.0/fpx.c"
 while(1) {
  $186 = $4; //@line 264 "SIDH_v1.0/fpx.c"
  $187 = ($186>>>0)<(6); //@line 264 "SIDH_v1.0/fpx.c"
  if (!($187)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 264 "SIDH_v1.0/fpx.c"
  $188 = $4; //@line 264 "SIDH_v1.0/fpx.c"
  $189 = (($188) + 1)|0; //@line 264 "SIDH_v1.0/fpx.c"
  $4 = $189; //@line 264 "SIDH_v1.0/fpx.c"
 }
 _fpmul751_mont($2,$3,$3); //@line 265 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 266 "SIDH_v1.0/fpx.c"
 while(1) {
  $190 = $4; //@line 266 "SIDH_v1.0/fpx.c"
  $191 = ($190>>>0)<(7); //@line 266 "SIDH_v1.0/fpx.c"
  if (!($191)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 266 "SIDH_v1.0/fpx.c"
  $192 = $4; //@line 266 "SIDH_v1.0/fpx.c"
  $193 = (($192) + 1)|0; //@line 266 "SIDH_v1.0/fpx.c"
  $4 = $193; //@line 266 "SIDH_v1.0/fpx.c"
 }
 $194 = ((($2)) + 1152|0); //@line 267 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($194,$3,$3); //@line 267 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 268 "SIDH_v1.0/fpx.c"
 while(1) {
  $195 = $4; //@line 268 "SIDH_v1.0/fpx.c"
  $196 = ($195>>>0)<(7); //@line 268 "SIDH_v1.0/fpx.c"
  if (!($196)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 268 "SIDH_v1.0/fpx.c"
  $197 = $4; //@line 268 "SIDH_v1.0/fpx.c"
  $198 = (($197) + 1)|0; //@line 268 "SIDH_v1.0/fpx.c"
  $4 = $198; //@line 268 "SIDH_v1.0/fpx.c"
 }
 $199 = ((($2)) + 1824|0); //@line 269 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($199,$3,$3); //@line 269 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 270 "SIDH_v1.0/fpx.c"
 while(1) {
  $200 = $4; //@line 270 "SIDH_v1.0/fpx.c"
  $201 = ($200>>>0)<(6); //@line 270 "SIDH_v1.0/fpx.c"
  if (!($201)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 270 "SIDH_v1.0/fpx.c"
  $202 = $4; //@line 270 "SIDH_v1.0/fpx.c"
  $203 = (($202) + 1)|0; //@line 270 "SIDH_v1.0/fpx.c"
  $4 = $203; //@line 270 "SIDH_v1.0/fpx.c"
 }
 $204 = ((($2)) + 2112|0); //@line 271 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($204,$3,$3); //@line 271 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 272 "SIDH_v1.0/fpx.c"
 while(1) {
  $205 = $4; //@line 272 "SIDH_v1.0/fpx.c"
  $206 = ($205>>>0)<(6); //@line 272 "SIDH_v1.0/fpx.c"
  if (!($206)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 272 "SIDH_v1.0/fpx.c"
  $207 = $4; //@line 272 "SIDH_v1.0/fpx.c"
  $208 = (($207) + 1)|0; //@line 272 "SIDH_v1.0/fpx.c"
  $4 = $208; //@line 272 "SIDH_v1.0/fpx.c"
 }
 $209 = ((($2)) + 2400|0); //@line 273 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($209,$3,$3); //@line 273 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 274 "SIDH_v1.0/fpx.c"
 while(1) {
  $210 = $4; //@line 274 "SIDH_v1.0/fpx.c"
  $211 = ($210>>>0)<(7); //@line 274 "SIDH_v1.0/fpx.c"
  if (!($211)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 274 "SIDH_v1.0/fpx.c"
  $212 = $4; //@line 274 "SIDH_v1.0/fpx.c"
  $213 = (($212) + 1)|0; //@line 274 "SIDH_v1.0/fpx.c"
  $4 = $213; //@line 274 "SIDH_v1.0/fpx.c"
 }
 $214 = ((($2)) + 192|0); //@line 275 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($214,$3,$3); //@line 275 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 276 "SIDH_v1.0/fpx.c"
 while(1) {
  $215 = $4; //@line 276 "SIDH_v1.0/fpx.c"
  $216 = ($215>>>0)<(6); //@line 276 "SIDH_v1.0/fpx.c"
  if (!($216)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 276 "SIDH_v1.0/fpx.c"
  $217 = $4; //@line 276 "SIDH_v1.0/fpx.c"
  $218 = (($217) + 1)|0; //@line 276 "SIDH_v1.0/fpx.c"
  $4 = $218; //@line 276 "SIDH_v1.0/fpx.c"
 }
 $219 = ((($2)) + 960|0); //@line 277 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($219,$3,$3); //@line 277 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 278 "SIDH_v1.0/fpx.c"
 while(1) {
  $220 = $4; //@line 278 "SIDH_v1.0/fpx.c"
  $221 = ($220>>>0)<(7); //@line 278 "SIDH_v1.0/fpx.c"
  if (!($221)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 278 "SIDH_v1.0/fpx.c"
  $222 = $4; //@line 278 "SIDH_v1.0/fpx.c"
  $223 = (($222) + 1)|0; //@line 278 "SIDH_v1.0/fpx.c"
  $4 = $223; //@line 278 "SIDH_v1.0/fpx.c"
 }
 $224 = ((($2)) + 2112|0); //@line 279 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($224,$3,$3); //@line 279 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 280 "SIDH_v1.0/fpx.c"
 while(1) {
  $225 = $4; //@line 280 "SIDH_v1.0/fpx.c"
  $226 = ($225>>>0)<(8); //@line 280 "SIDH_v1.0/fpx.c"
  if (!($226)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 280 "SIDH_v1.0/fpx.c"
  $227 = $4; //@line 280 "SIDH_v1.0/fpx.c"
  $228 = (($227) + 1)|0; //@line 280 "SIDH_v1.0/fpx.c"
  $4 = $228; //@line 280 "SIDH_v1.0/fpx.c"
 }
 $229 = ((($2)) + 1728|0); //@line 281 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($229,$3,$3); //@line 281 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 282 "SIDH_v1.0/fpx.c"
 while(1) {
  $230 = $4; //@line 282 "SIDH_v1.0/fpx.c"
  $231 = ($230>>>0)<(6); //@line 282 "SIDH_v1.0/fpx.c"
  if (!($231)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 282 "SIDH_v1.0/fpx.c"
  $232 = $4; //@line 282 "SIDH_v1.0/fpx.c"
  $233 = (($232) + 1)|0; //@line 282 "SIDH_v1.0/fpx.c"
  $4 = $233; //@line 282 "SIDH_v1.0/fpx.c"
 }
 $234 = ((($2)) + 384|0); //@line 283 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($234,$3,$3); //@line 283 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 284 "SIDH_v1.0/fpx.c"
 while(1) {
  $235 = $4; //@line 284 "SIDH_v1.0/fpx.c"
  $236 = ($235>>>0)<(6); //@line 284 "SIDH_v1.0/fpx.c"
  if (!($236)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 284 "SIDH_v1.0/fpx.c"
  $237 = $4; //@line 284 "SIDH_v1.0/fpx.c"
  $238 = (($237) + 1)|0; //@line 284 "SIDH_v1.0/fpx.c"
  $4 = $238; //@line 284 "SIDH_v1.0/fpx.c"
 }
 $239 = ((($2)) + 1344|0); //@line 285 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($239,$3,$3); //@line 285 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 286 "SIDH_v1.0/fpx.c"
 while(1) {
  $240 = $4; //@line 286 "SIDH_v1.0/fpx.c"
  $241 = ($240>>>0)<(7); //@line 286 "SIDH_v1.0/fpx.c"
  if (!($241)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 286 "SIDH_v1.0/fpx.c"
  $242 = $4; //@line 286 "SIDH_v1.0/fpx.c"
  $243 = (($242) + 1)|0; //@line 286 "SIDH_v1.0/fpx.c"
  $4 = $243; //@line 286 "SIDH_v1.0/fpx.c"
 }
 $244 = ((($2)) + 1248|0); //@line 287 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($244,$3,$3); //@line 287 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 288 "SIDH_v1.0/fpx.c"
 while(1) {
  $245 = $4; //@line 288 "SIDH_v1.0/fpx.c"
  $246 = ($245>>>0)<(6); //@line 288 "SIDH_v1.0/fpx.c"
  if (!($246)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 288 "SIDH_v1.0/fpx.c"
  $247 = $4; //@line 288 "SIDH_v1.0/fpx.c"
  $248 = (($247) + 1)|0; //@line 288 "SIDH_v1.0/fpx.c"
  $4 = $248; //@line 288 "SIDH_v1.0/fpx.c"
 }
 $249 = ((($2)) + 480|0); //@line 289 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($249,$3,$3); //@line 289 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 290 "SIDH_v1.0/fpx.c"
 while(1) {
  $250 = $4; //@line 290 "SIDH_v1.0/fpx.c"
  $251 = ($250>>>0)<(6); //@line 290 "SIDH_v1.0/fpx.c"
  if (!($251)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 290 "SIDH_v1.0/fpx.c"
  $252 = $4; //@line 290 "SIDH_v1.0/fpx.c"
  $253 = (($252) + 1)|0; //@line 290 "SIDH_v1.0/fpx.c"
  $4 = $253; //@line 290 "SIDH_v1.0/fpx.c"
 }
 $254 = ((($2)) + 2208|0); //@line 291 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($254,$3,$3); //@line 291 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 292 "SIDH_v1.0/fpx.c"
 while(1) {
  $255 = $4; //@line 292 "SIDH_v1.0/fpx.c"
  $256 = ($255>>>0)<(6); //@line 292 "SIDH_v1.0/fpx.c"
  if (!($256)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 292 "SIDH_v1.0/fpx.c"
  $257 = $4; //@line 292 "SIDH_v1.0/fpx.c"
  $258 = (($257) + 1)|0; //@line 292 "SIDH_v1.0/fpx.c"
  $4 = $258; //@line 292 "SIDH_v1.0/fpx.c"
 }
 $259 = ((($2)) + 2016|0); //@line 293 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($259,$3,$3); //@line 293 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 294 "SIDH_v1.0/fpx.c"
 while(1) {
  $260 = $4; //@line 294 "SIDH_v1.0/fpx.c"
  $261 = ($260>>>0)<(6); //@line 294 "SIDH_v1.0/fpx.c"
  if (!($261)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 294 "SIDH_v1.0/fpx.c"
  $262 = $4; //@line 294 "SIDH_v1.0/fpx.c"
  $263 = (($262) + 1)|0; //@line 294 "SIDH_v1.0/fpx.c"
  $4 = $263; //@line 294 "SIDH_v1.0/fpx.c"
 }
 $264 = ((($2)) + 192|0); //@line 295 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($264,$3,$3); //@line 295 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 296 "SIDH_v1.0/fpx.c"
 while(1) {
  $265 = $4; //@line 296 "SIDH_v1.0/fpx.c"
  $266 = ($265>>>0)<(7); //@line 296 "SIDH_v1.0/fpx.c"
  if (!($266)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 296 "SIDH_v1.0/fpx.c"
  $267 = $4; //@line 296 "SIDH_v1.0/fpx.c"
  $268 = (($267) + 1)|0; //@line 296 "SIDH_v1.0/fpx.c"
  $4 = $268; //@line 296 "SIDH_v1.0/fpx.c"
 }
 $269 = ((($2)) + 2208|0); //@line 297 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($269,$3,$3); //@line 297 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 298 "SIDH_v1.0/fpx.c"
 while(1) {
  $270 = $4; //@line 298 "SIDH_v1.0/fpx.c"
  $271 = ($270>>>0)<(8); //@line 298 "SIDH_v1.0/fpx.c"
  if (!($271)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 298 "SIDH_v1.0/fpx.c"
  $272 = $4; //@line 298 "SIDH_v1.0/fpx.c"
  $273 = (($272) + 1)|0; //@line 298 "SIDH_v1.0/fpx.c"
  $4 = $273; //@line 298 "SIDH_v1.0/fpx.c"
 }
 $274 = ((($2)) + 1152|0); //@line 299 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($274,$3,$3); //@line 299 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 300 "SIDH_v1.0/fpx.c"
 while(1) {
  $275 = $4; //@line 300 "SIDH_v1.0/fpx.c"
  $276 = ($275>>>0)<(6); //@line 300 "SIDH_v1.0/fpx.c"
  if (!($276)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 300 "SIDH_v1.0/fpx.c"
  $277 = $4; //@line 300 "SIDH_v1.0/fpx.c"
  $278 = (($277) + 1)|0; //@line 300 "SIDH_v1.0/fpx.c"
  $4 = $278; //@line 300 "SIDH_v1.0/fpx.c"
 }
 $279 = ((($2)) + 864|0); //@line 301 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($279,$3,$3); //@line 301 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 302 "SIDH_v1.0/fpx.c"
 while(1) {
  $280 = $4; //@line 302 "SIDH_v1.0/fpx.c"
  $281 = ($280>>>0)<(6); //@line 302 "SIDH_v1.0/fpx.c"
  if (!($281)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 302 "SIDH_v1.0/fpx.c"
  $282 = $4; //@line 302 "SIDH_v1.0/fpx.c"
  $283 = (($282) + 1)|0; //@line 302 "SIDH_v1.0/fpx.c"
  $4 = $283; //@line 302 "SIDH_v1.0/fpx.c"
 }
 $284 = ((($2)) + 288|0); //@line 303 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($284,$3,$3); //@line 303 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 304 "SIDH_v1.0/fpx.c"
 while(1) {
  $285 = $4; //@line 304 "SIDH_v1.0/fpx.c"
  $286 = ($285>>>0)<(7); //@line 304 "SIDH_v1.0/fpx.c"
  if (!($286)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 304 "SIDH_v1.0/fpx.c"
  $287 = $4; //@line 304 "SIDH_v1.0/fpx.c"
  $288 = (($287) + 1)|0; //@line 304 "SIDH_v1.0/fpx.c"
  $4 = $288; //@line 304 "SIDH_v1.0/fpx.c"
 }
 $289 = ((($2)) + 1248|0); //@line 305 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($289,$3,$3); //@line 305 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 306 "SIDH_v1.0/fpx.c"
 while(1) {
  $290 = $4; //@line 306 "SIDH_v1.0/fpx.c"
  $291 = ($290>>>0)<(7); //@line 306 "SIDH_v1.0/fpx.c"
  if (!($291)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 306 "SIDH_v1.0/fpx.c"
  $292 = $4; //@line 306 "SIDH_v1.0/fpx.c"
  $293 = (($292) + 1)|0; //@line 306 "SIDH_v1.0/fpx.c"
  $4 = $293; //@line 306 "SIDH_v1.0/fpx.c"
 }
 $294 = ((($2)) + 1632|0); //@line 307 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($294,$3,$3); //@line 307 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 308 "SIDH_v1.0/fpx.c"
 while(1) {
  $295 = $4; //@line 308 "SIDH_v1.0/fpx.c"
  $296 = ($295>>>0)<(8); //@line 308 "SIDH_v1.0/fpx.c"
  if (!($296)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 308 "SIDH_v1.0/fpx.c"
  $297 = $4; //@line 308 "SIDH_v1.0/fpx.c"
  $298 = (($297) + 1)|0; //@line 308 "SIDH_v1.0/fpx.c"
  $4 = $298; //@line 308 "SIDH_v1.0/fpx.c"
 }
 $299 = ((($2)) + 2496|0); //@line 309 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($299,$3,$3); //@line 309 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 310 "SIDH_v1.0/fpx.c"
 while(1) {
  $300 = $4; //@line 310 "SIDH_v1.0/fpx.c"
  $301 = ($300>>>0)<(8); //@line 310 "SIDH_v1.0/fpx.c"
  if (!($301)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 310 "SIDH_v1.0/fpx.c"
  $302 = $4; //@line 310 "SIDH_v1.0/fpx.c"
  $303 = (($302) + 1)|0; //@line 310 "SIDH_v1.0/fpx.c"
  $4 = $303; //@line 310 "SIDH_v1.0/fpx.c"
 }
 $304 = ((($2)) + 480|0); //@line 311 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($304,$3,$3); //@line 311 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 312 "SIDH_v1.0/fpx.c"
 while(1) {
  $305 = $4; //@line 312 "SIDH_v1.0/fpx.c"
  $306 = ($305>>>0)<(8); //@line 312 "SIDH_v1.0/fpx.c"
  if (!($306)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 312 "SIDH_v1.0/fpx.c"
  $307 = $4; //@line 312 "SIDH_v1.0/fpx.c"
  $308 = (($307) + 1)|0; //@line 312 "SIDH_v1.0/fpx.c"
  $4 = $308; //@line 312 "SIDH_v1.0/fpx.c"
 }
 $309 = ((($2)) + 768|0); //@line 313 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($309,$3,$3); //@line 313 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 314 "SIDH_v1.0/fpx.c"
 while(1) {
  $310 = $4; //@line 314 "SIDH_v1.0/fpx.c"
  $311 = ($310>>>0)<(8); //@line 314 "SIDH_v1.0/fpx.c"
  if (!($311)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 314 "SIDH_v1.0/fpx.c"
  $312 = $4; //@line 314 "SIDH_v1.0/fpx.c"
  $313 = (($312) + 1)|0; //@line 314 "SIDH_v1.0/fpx.c"
  $4 = $313; //@line 314 "SIDH_v1.0/fpx.c"
 }
 $314 = ((($2)) + 1056|0); //@line 315 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($314,$3,$3); //@line 315 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 316 "SIDH_v1.0/fpx.c"
 while(1) {
  $315 = $4; //@line 316 "SIDH_v1.0/fpx.c"
  $316 = ($315>>>0)<(6); //@line 316 "SIDH_v1.0/fpx.c"
  if (!($316)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 316 "SIDH_v1.0/fpx.c"
  $317 = $4; //@line 316 "SIDH_v1.0/fpx.c"
  $318 = (($317) + 1)|0; //@line 316 "SIDH_v1.0/fpx.c"
  $4 = $318; //@line 316 "SIDH_v1.0/fpx.c"
 }
 $319 = ((($2)) + 2112|0); //@line 317 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($319,$3,$3); //@line 317 "SIDH_v1.0/fpx.c"
 $4 = 0; //@line 318 "SIDH_v1.0/fpx.c"
 while(1) {
  $320 = $4; //@line 318 "SIDH_v1.0/fpx.c"
  $321 = ($320>>>0)<(7); //@line 318 "SIDH_v1.0/fpx.c"
  if (!($321)) {
   break;
  }
  _fpsqr751_mont($3,$3); //@line 318 "SIDH_v1.0/fpx.c"
  $322 = $4; //@line 318 "SIDH_v1.0/fpx.c"
  $323 = (($322) + 1)|0; //@line 318 "SIDH_v1.0/fpx.c"
  $4 = $323; //@line 318 "SIDH_v1.0/fpx.c"
 }
 $5 = 0; //@line 319 "SIDH_v1.0/fpx.c"
 while(1) {
  $324 = $5; //@line 319 "SIDH_v1.0/fpx.c"
  $325 = ($324>>>0)<(61); //@line 319 "SIDH_v1.0/fpx.c"
  if (!($325)) {
   break;
  }
  $326 = ((($2)) + 2496|0); //@line 320 "SIDH_v1.0/fpx.c"
  _fpmul751_mont($326,$3,$3); //@line 320 "SIDH_v1.0/fpx.c"
  $4 = 0; //@line 321 "SIDH_v1.0/fpx.c"
  while(1) {
   $327 = $4; //@line 321 "SIDH_v1.0/fpx.c"
   $328 = ($327>>>0)<(6); //@line 321 "SIDH_v1.0/fpx.c"
   if (!($328)) {
    break;
   }
   _fpsqr751_mont($3,$3); //@line 321 "SIDH_v1.0/fpx.c"
   $329 = $4; //@line 321 "SIDH_v1.0/fpx.c"
   $330 = (($329) + 1)|0; //@line 321 "SIDH_v1.0/fpx.c"
   $4 = $330; //@line 321 "SIDH_v1.0/fpx.c"
  }
  $331 = $5; //@line 319 "SIDH_v1.0/fpx.c"
  $332 = (($331) + 1)|0; //@line 319 "SIDH_v1.0/fpx.c"
  $5 = $332; //@line 319 "SIDH_v1.0/fpx.c"
 }
 $333 = ((($2)) + 2400|0); //@line 323 "SIDH_v1.0/fpx.c"
 $334 = $1; //@line 323 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($333,$3,$334); //@line 323 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 324 "SIDH_v1.0/fpx.c"
}
function _fp2copy751($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2; //@line 332 "SIDH_v1.0/fpx.c"
 $5 = $3; //@line 332 "SIDH_v1.0/fpx.c"
 _fpcopy751($4,$5); //@line 332 "SIDH_v1.0/fpx.c"
 $6 = $2; //@line 333 "SIDH_v1.0/fpx.c"
 $7 = ((($6)) + 96|0); //@line 333 "SIDH_v1.0/fpx.c"
 $8 = $3; //@line 333 "SIDH_v1.0/fpx.c"
 $9 = ((($8)) + 96|0); //@line 333 "SIDH_v1.0/fpx.c"
 _fpcopy751($7,$9); //@line 333 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 334 "SIDH_v1.0/fpx.c"
}
function _fp2neg751($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1; //@line 346 "SIDH_v1.0/fpx.c"
 _fpneg751($2); //@line 346 "SIDH_v1.0/fpx.c"
 $3 = $1; //@line 347 "SIDH_v1.0/fpx.c"
 $4 = ((($3)) + 96|0); //@line 347 "SIDH_v1.0/fpx.c"
 _fpneg751($4); //@line 347 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 348 "SIDH_v1.0/fpx.c"
}
function _fp2add751($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $3; //@line 353 "SIDH_v1.0/fpx.c"
 $7 = $4; //@line 353 "SIDH_v1.0/fpx.c"
 $8 = $5; //@line 353 "SIDH_v1.0/fpx.c"
 _fpadd751($6,$7,$8); //@line 353 "SIDH_v1.0/fpx.c"
 $9 = $3; //@line 354 "SIDH_v1.0/fpx.c"
 $10 = ((($9)) + 96|0); //@line 354 "SIDH_v1.0/fpx.c"
 $11 = $4; //@line 354 "SIDH_v1.0/fpx.c"
 $12 = ((($11)) + 96|0); //@line 354 "SIDH_v1.0/fpx.c"
 $13 = $5; //@line 354 "SIDH_v1.0/fpx.c"
 $14 = ((($13)) + 96|0); //@line 354 "SIDH_v1.0/fpx.c"
 _fpadd751($10,$12,$14); //@line 354 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 355 "SIDH_v1.0/fpx.c"
}
function _fp2sub751($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $3; //@line 360 "SIDH_v1.0/fpx.c"
 $7 = $4; //@line 360 "SIDH_v1.0/fpx.c"
 $8 = $5; //@line 360 "SIDH_v1.0/fpx.c"
 _fpsub751($6,$7,$8); //@line 360 "SIDH_v1.0/fpx.c"
 $9 = $3; //@line 361 "SIDH_v1.0/fpx.c"
 $10 = ((($9)) + 96|0); //@line 361 "SIDH_v1.0/fpx.c"
 $11 = $4; //@line 361 "SIDH_v1.0/fpx.c"
 $12 = ((($11)) + 96|0); //@line 361 "SIDH_v1.0/fpx.c"
 $13 = $5; //@line 361 "SIDH_v1.0/fpx.c"
 $14 = ((($13)) + 96|0); //@line 361 "SIDH_v1.0/fpx.c"
 _fpsub751($10,$12,$14); //@line 361 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 362 "SIDH_v1.0/fpx.c"
}
function _fp2div2_751($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2; //@line 367 "SIDH_v1.0/fpx.c"
 $5 = $3; //@line 367 "SIDH_v1.0/fpx.c"
 _fpdiv2_751($4,$5); //@line 367 "SIDH_v1.0/fpx.c"
 $6 = $2; //@line 368 "SIDH_v1.0/fpx.c"
 $7 = ((($6)) + 96|0); //@line 368 "SIDH_v1.0/fpx.c"
 $8 = $3; //@line 368 "SIDH_v1.0/fpx.c"
 $9 = ((($8)) + 96|0); //@line 368 "SIDH_v1.0/fpx.c"
 _fpdiv2_751($7,$9); //@line 368 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 369 "SIDH_v1.0/fpx.c"
}
function _fp2sqr751_mont($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 304|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(304|0);
 $4 = sp + 192|0;
 $5 = sp + 96|0;
 $6 = sp;
 $2 = $0;
 $3 = $1;
 $7 = $2; //@line 376 "SIDH_v1.0/fpx.c"
 $8 = $2; //@line 376 "SIDH_v1.0/fpx.c"
 $9 = ((($8)) + 96|0); //@line 376 "SIDH_v1.0/fpx.c"
 (_mp_add($7,$9,$4,24)|0); //@line 376 "SIDH_v1.0/fpx.c"
 $10 = $2; //@line 377 "SIDH_v1.0/fpx.c"
 $11 = $2; //@line 377 "SIDH_v1.0/fpx.c"
 $12 = ((($11)) + 96|0); //@line 377 "SIDH_v1.0/fpx.c"
 _fpsub751($10,$12,$5); //@line 377 "SIDH_v1.0/fpx.c"
 $13 = $2; //@line 378 "SIDH_v1.0/fpx.c"
 $14 = $2; //@line 378 "SIDH_v1.0/fpx.c"
 (_mp_add($13,$14,$6,24)|0); //@line 378 "SIDH_v1.0/fpx.c"
 $15 = $3; //@line 379 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($4,$5,$15); //@line 379 "SIDH_v1.0/fpx.c"
 $16 = $2; //@line 380 "SIDH_v1.0/fpx.c"
 $17 = ((($16)) + 96|0); //@line 380 "SIDH_v1.0/fpx.c"
 $18 = $3; //@line 380 "SIDH_v1.0/fpx.c"
 $19 = ((($18)) + 96|0); //@line 380 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($6,$17,$19); //@line 380 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 381 "SIDH_v1.0/fpx.c"
}
function _fp2mul751_mont($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 800|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(800|0);
 $6 = sp + 688|0;
 $7 = sp + 592|0;
 $8 = sp + 400|0;
 $9 = sp + 208|0;
 $10 = sp + 16|0;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $15 = $3; //@line 391 "SIDH_v1.0/fpx.c"
 $16 = $4; //@line 391 "SIDH_v1.0/fpx.c"
 _mp_mul($15,$16,$8,24); //@line 391 "SIDH_v1.0/fpx.c"
 $17 = $3; //@line 392 "SIDH_v1.0/fpx.c"
 $18 = ((($17)) + 96|0); //@line 392 "SIDH_v1.0/fpx.c"
 $19 = $4; //@line 392 "SIDH_v1.0/fpx.c"
 $20 = ((($19)) + 96|0); //@line 392 "SIDH_v1.0/fpx.c"
 _mp_mul($18,$20,$9,24); //@line 392 "SIDH_v1.0/fpx.c"
 $21 = $3; //@line 393 "SIDH_v1.0/fpx.c"
 $22 = $3; //@line 393 "SIDH_v1.0/fpx.c"
 $23 = ((($22)) + 96|0); //@line 393 "SIDH_v1.0/fpx.c"
 (_mp_add($21,$23,$6,24)|0); //@line 393 "SIDH_v1.0/fpx.c"
 $24 = $4; //@line 394 "SIDH_v1.0/fpx.c"
 $25 = $4; //@line 394 "SIDH_v1.0/fpx.c"
 $26 = ((($25)) + 96|0); //@line 394 "SIDH_v1.0/fpx.c"
 (_mp_add($24,$26,$7,24)|0); //@line 394 "SIDH_v1.0/fpx.c"
 $27 = (_mp_sub($8,$9,$10,48)|0); //@line 395 "SIDH_v1.0/fpx.c"
 $13 = $27; //@line 395 "SIDH_v1.0/fpx.c"
 $28 = $13; //@line 396 "SIDH_v1.0/fpx.c"
 $29 = (0 - ($28))|0; //@line 396 "SIDH_v1.0/fpx.c"
 $11 = $29; //@line 396 "SIDH_v1.0/fpx.c"
 $13 = 0; //@line 397 "SIDH_v1.0/fpx.c"
 $12 = 0; //@line 398 "SIDH_v1.0/fpx.c"
 while(1) {
  $30 = $12; //@line 398 "SIDH_v1.0/fpx.c"
  $31 = ($30>>>0)<(24); //@line 398 "SIDH_v1.0/fpx.c"
  if (!($31)) {
   break;
  }
  $32 = $12; //@line 399 "SIDH_v1.0/fpx.c"
  $33 = (24 + ($32))|0; //@line 399 "SIDH_v1.0/fpx.c"
  $34 = (($10) + ($33<<2)|0); //@line 399 "SIDH_v1.0/fpx.c"
  $35 = HEAP32[$34>>2]|0; //@line 399 "SIDH_v1.0/fpx.c"
  $36 = $13; //@line 399 "SIDH_v1.0/fpx.c"
  $37 = (($35) + ($36))|0; //@line 399 "SIDH_v1.0/fpx.c"
  $14 = $37; //@line 399 "SIDH_v1.0/fpx.c"
  $38 = $12; //@line 399 "SIDH_v1.0/fpx.c"
  $39 = (2456 + ($38<<2)|0); //@line 399 "SIDH_v1.0/fpx.c"
  $40 = HEAP32[$39>>2]|0; //@line 399 "SIDH_v1.0/fpx.c"
  $41 = $11; //@line 399 "SIDH_v1.0/fpx.c"
  $42 = $40 & $41; //@line 399 "SIDH_v1.0/fpx.c"
  $43 = $14; //@line 399 "SIDH_v1.0/fpx.c"
  $44 = (($42) + ($43))|0; //@line 399 "SIDH_v1.0/fpx.c"
  $45 = $12; //@line 399 "SIDH_v1.0/fpx.c"
  $46 = (24 + ($45))|0; //@line 399 "SIDH_v1.0/fpx.c"
  $47 = (($10) + ($46<<2)|0); //@line 399 "SIDH_v1.0/fpx.c"
  HEAP32[$47>>2] = $44; //@line 399 "SIDH_v1.0/fpx.c"
  $48 = $14; //@line 399 "SIDH_v1.0/fpx.c"
  $49 = $13; //@line 399 "SIDH_v1.0/fpx.c"
  $50 = (_is_digit_lessthan_ct($48,$49)|0); //@line 399 "SIDH_v1.0/fpx.c"
  $51 = $12; //@line 399 "SIDH_v1.0/fpx.c"
  $52 = (24 + ($51))|0; //@line 399 "SIDH_v1.0/fpx.c"
  $53 = (($10) + ($52<<2)|0); //@line 399 "SIDH_v1.0/fpx.c"
  $54 = HEAP32[$53>>2]|0; //@line 399 "SIDH_v1.0/fpx.c"
  $55 = $14; //@line 399 "SIDH_v1.0/fpx.c"
  $56 = (_is_digit_lessthan_ct($54,$55)|0); //@line 399 "SIDH_v1.0/fpx.c"
  $57 = $50 | $56; //@line 399 "SIDH_v1.0/fpx.c"
  $13 = $57; //@line 399 "SIDH_v1.0/fpx.c"
  $58 = $12; //@line 398 "SIDH_v1.0/fpx.c"
  $59 = (($58) + 1)|0; //@line 398 "SIDH_v1.0/fpx.c"
  $12 = $59; //@line 398 "SIDH_v1.0/fpx.c"
 }
 $60 = $5; //@line 401 "SIDH_v1.0/fpx.c"
 _rdc_mont($10,$60); //@line 401 "SIDH_v1.0/fpx.c"
 (_mp_add($8,$9,$8,48)|0); //@line 402 "SIDH_v1.0/fpx.c"
 _mp_mul($6,$7,$9,24); //@line 403 "SIDH_v1.0/fpx.c"
 (_mp_sub($9,$8,$9,48)|0); //@line 404 "SIDH_v1.0/fpx.c"
 $61 = $5; //@line 405 "SIDH_v1.0/fpx.c"
 $62 = ((($61)) + 96|0); //@line 405 "SIDH_v1.0/fpx.c"
 _rdc_mont($9,$62); //@line 405 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 406 "SIDH_v1.0/fpx.c"
}
function _to_fp2mont($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2; //@line 413 "SIDH_v1.0/fpx.c"
 $5 = $3; //@line 413 "SIDH_v1.0/fpx.c"
 _to_mont($4,$5); //@line 413 "SIDH_v1.0/fpx.c"
 $6 = $2; //@line 414 "SIDH_v1.0/fpx.c"
 $7 = ((($6)) + 96|0); //@line 414 "SIDH_v1.0/fpx.c"
 $8 = $3; //@line 414 "SIDH_v1.0/fpx.c"
 $9 = ((($8)) + 96|0); //@line 414 "SIDH_v1.0/fpx.c"
 _to_mont($7,$9); //@line 414 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 415 "SIDH_v1.0/fpx.c"
}
function _from_fp2mont($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2; //@line 422 "SIDH_v1.0/fpx.c"
 $5 = $3; //@line 422 "SIDH_v1.0/fpx.c"
 _from_mont($4,$5); //@line 422 "SIDH_v1.0/fpx.c"
 $6 = $2; //@line 423 "SIDH_v1.0/fpx.c"
 $7 = ((($6)) + 96|0); //@line 423 "SIDH_v1.0/fpx.c"
 $8 = $3; //@line 423 "SIDH_v1.0/fpx.c"
 $9 = ((($8)) + 96|0); //@line 423 "SIDH_v1.0/fpx.c"
 _from_mont($7,$9); //@line 423 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 424 "SIDH_v1.0/fpx.c"
}
function _fp2inv751_mont($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(208|0);
 $2 = sp;
 $1 = $0;
 $3 = $1; //@line 431 "SIDH_v1.0/fpx.c"
 _fpsqr751_mont($3,$2); //@line 431 "SIDH_v1.0/fpx.c"
 $4 = $1; //@line 432 "SIDH_v1.0/fpx.c"
 $5 = ((($4)) + 96|0); //@line 432 "SIDH_v1.0/fpx.c"
 $6 = ((($2)) + 96|0); //@line 432 "SIDH_v1.0/fpx.c"
 _fpsqr751_mont($5,$6); //@line 432 "SIDH_v1.0/fpx.c"
 $7 = ((($2)) + 96|0); //@line 433 "SIDH_v1.0/fpx.c"
 _fpadd751($2,$7,$2); //@line 433 "SIDH_v1.0/fpx.c"
 _fpinv751_mont($2); //@line 434 "SIDH_v1.0/fpx.c"
 $8 = $1; //@line 435 "SIDH_v1.0/fpx.c"
 $9 = ((($8)) + 96|0); //@line 435 "SIDH_v1.0/fpx.c"
 _fpneg751($9); //@line 435 "SIDH_v1.0/fpx.c"
 $10 = $1; //@line 436 "SIDH_v1.0/fpx.c"
 $11 = $1; //@line 436 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($10,$2,$11); //@line 436 "SIDH_v1.0/fpx.c"
 $12 = $1; //@line 437 "SIDH_v1.0/fpx.c"
 $13 = ((($12)) + 96|0); //@line 437 "SIDH_v1.0/fpx.c"
 $14 = $1; //@line 437 "SIDH_v1.0/fpx.c"
 $15 = ((($14)) + 96|0); //@line 437 "SIDH_v1.0/fpx.c"
 _fpmul751_mont($13,$2,$15); //@line 437 "SIDH_v1.0/fpx.c"
 STACKTOP = sp;return; //@line 438 "SIDH_v1.0/fpx.c"
}
function _swap_points_basefield($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0;
 var $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $7 = 0; //@line 447 "SIDH_v1.0/fpx.c"
 while(1) {
  $8 = $7; //@line 447 "SIDH_v1.0/fpx.c"
  $9 = ($8>>>0)<(24); //@line 447 "SIDH_v1.0/fpx.c"
  if (!($9)) {
   break;
  }
  $10 = $5; //@line 448 "SIDH_v1.0/fpx.c"
  $11 = $7; //@line 448 "SIDH_v1.0/fpx.c"
  $12 = $3; //@line 448 "SIDH_v1.0/fpx.c"
  $13 = (($12) + ($11<<2)|0); //@line 448 "SIDH_v1.0/fpx.c"
  $14 = HEAP32[$13>>2]|0; //@line 448 "SIDH_v1.0/fpx.c"
  $15 = $7; //@line 448 "SIDH_v1.0/fpx.c"
  $16 = $4; //@line 448 "SIDH_v1.0/fpx.c"
  $17 = (($16) + ($15<<2)|0); //@line 448 "SIDH_v1.0/fpx.c"
  $18 = HEAP32[$17>>2]|0; //@line 448 "SIDH_v1.0/fpx.c"
  $19 = $14 ^ $18; //@line 448 "SIDH_v1.0/fpx.c"
  $20 = $10 & $19; //@line 448 "SIDH_v1.0/fpx.c"
  $6 = $20; //@line 448 "SIDH_v1.0/fpx.c"
  $21 = $6; //@line 449 "SIDH_v1.0/fpx.c"
  $22 = $7; //@line 449 "SIDH_v1.0/fpx.c"
  $23 = $3; //@line 449 "SIDH_v1.0/fpx.c"
  $24 = (($23) + ($22<<2)|0); //@line 449 "SIDH_v1.0/fpx.c"
  $25 = HEAP32[$24>>2]|0; //@line 449 "SIDH_v1.0/fpx.c"
  $26 = $21 ^ $25; //@line 449 "SIDH_v1.0/fpx.c"
  $27 = $7; //@line 449 "SIDH_v1.0/fpx.c"
  $28 = $3; //@line 449 "SIDH_v1.0/fpx.c"
  $29 = (($28) + ($27<<2)|0); //@line 449 "SIDH_v1.0/fpx.c"
  HEAP32[$29>>2] = $26; //@line 449 "SIDH_v1.0/fpx.c"
  $30 = $6; //@line 450 "SIDH_v1.0/fpx.c"
  $31 = $7; //@line 450 "SIDH_v1.0/fpx.c"
  $32 = $4; //@line 450 "SIDH_v1.0/fpx.c"
  $33 = (($32) + ($31<<2)|0); //@line 450 "SIDH_v1.0/fpx.c"
  $34 = HEAP32[$33>>2]|0; //@line 450 "SIDH_v1.0/fpx.c"
  $35 = $30 ^ $34; //@line 450 "SIDH_v1.0/fpx.c"
  $36 = $7; //@line 450 "SIDH_v1.0/fpx.c"
  $37 = $4; //@line 450 "SIDH_v1.0/fpx.c"
  $38 = (($37) + ($36<<2)|0); //@line 450 "SIDH_v1.0/fpx.c"
  HEAP32[$38>>2] = $35; //@line 450 "SIDH_v1.0/fpx.c"
  $39 = $5; //@line 451 "SIDH_v1.0/fpx.c"
  $40 = $7; //@line 451 "SIDH_v1.0/fpx.c"
  $41 = $3; //@line 451 "SIDH_v1.0/fpx.c"
  $42 = ((($41)) + 96|0); //@line 451 "SIDH_v1.0/fpx.c"
  $43 = (($42) + ($40<<2)|0); //@line 451 "SIDH_v1.0/fpx.c"
  $44 = HEAP32[$43>>2]|0; //@line 451 "SIDH_v1.0/fpx.c"
  $45 = $7; //@line 451 "SIDH_v1.0/fpx.c"
  $46 = $4; //@line 451 "SIDH_v1.0/fpx.c"
  $47 = ((($46)) + 96|0); //@line 451 "SIDH_v1.0/fpx.c"
  $48 = (($47) + ($45<<2)|0); //@line 451 "SIDH_v1.0/fpx.c"
  $49 = HEAP32[$48>>2]|0; //@line 451 "SIDH_v1.0/fpx.c"
  $50 = $44 ^ $49; //@line 451 "SIDH_v1.0/fpx.c"
  $51 = $39 & $50; //@line 451 "SIDH_v1.0/fpx.c"
  $6 = $51; //@line 451 "SIDH_v1.0/fpx.c"
  $52 = $6; //@line 452 "SIDH_v1.0/fpx.c"
  $53 = $7; //@line 452 "SIDH_v1.0/fpx.c"
  $54 = $3; //@line 452 "SIDH_v1.0/fpx.c"
  $55 = ((($54)) + 96|0); //@line 452 "SIDH_v1.0/fpx.c"
  $56 = (($55) + ($53<<2)|0); //@line 452 "SIDH_v1.0/fpx.c"
  $57 = HEAP32[$56>>2]|0; //@line 452 "SIDH_v1.0/fpx.c"
  $58 = $52 ^ $57; //@line 452 "SIDH_v1.0/fpx.c"
  $59 = $7; //@line 452 "SIDH_v1.0/fpx.c"
  $60 = $3; //@line 452 "SIDH_v1.0/fpx.c"
  $61 = ((($60)) + 96|0); //@line 452 "SIDH_v1.0/fpx.c"
  $62 = (($61) + ($59<<2)|0); //@line 452 "SIDH_v1.0/fpx.c"
  HEAP32[$62>>2] = $58; //@line 452 "SIDH_v1.0/fpx.c"
  $63 = $6; //@line 453 "SIDH_v1.0/fpx.c"
  $64 = $7; //@line 453 "SIDH_v1.0/fpx.c"
  $65 = $4; //@line 453 "SIDH_v1.0/fpx.c"
  $66 = ((($65)) + 96|0); //@line 453 "SIDH_v1.0/fpx.c"
  $67 = (($66) + ($64<<2)|0); //@line 453 "SIDH_v1.0/fpx.c"
  $68 = HEAP32[$67>>2]|0; //@line 453 "SIDH_v1.0/fpx.c"
  $69 = $63 ^ $68; //@line 453 "SIDH_v1.0/fpx.c"
  $70 = $7; //@line 453 "SIDH_v1.0/fpx.c"
  $71 = $4; //@line 453 "SIDH_v1.0/fpx.c"
  $72 = ((($71)) + 96|0); //@line 453 "SIDH_v1.0/fpx.c"
  $73 = (($72) + ($70<<2)|0); //@line 453 "SIDH_v1.0/fpx.c"
  HEAP32[$73>>2] = $69; //@line 453 "SIDH_v1.0/fpx.c"
  $74 = $7; //@line 447 "SIDH_v1.0/fpx.c"
  $75 = (($74) + 1)|0; //@line 447 "SIDH_v1.0/fpx.c"
  $7 = $75; //@line 447 "SIDH_v1.0/fpx.c"
 }
 STACKTOP = sp;return; //@line 455 "SIDH_v1.0/fpx.c"
}
function _swap_points($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $16 = 0, $17 = 0;
 var $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0;
 var $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0;
 var $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0;
 var $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0;
 var $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $7 = 0; //@line 464 "SIDH_v1.0/fpx.c"
 while(1) {
  $8 = $7; //@line 464 "SIDH_v1.0/fpx.c"
  $9 = ($8>>>0)<(24); //@line 464 "SIDH_v1.0/fpx.c"
  if (!($9)) {
   break;
  }
  $10 = $5; //@line 465 "SIDH_v1.0/fpx.c"
  $11 = $7; //@line 465 "SIDH_v1.0/fpx.c"
  $12 = $3; //@line 465 "SIDH_v1.0/fpx.c"
  $13 = (($12) + ($11<<2)|0); //@line 465 "SIDH_v1.0/fpx.c"
  $14 = HEAP32[$13>>2]|0; //@line 465 "SIDH_v1.0/fpx.c"
  $15 = $7; //@line 465 "SIDH_v1.0/fpx.c"
  $16 = $4; //@line 465 "SIDH_v1.0/fpx.c"
  $17 = (($16) + ($15<<2)|0); //@line 465 "SIDH_v1.0/fpx.c"
  $18 = HEAP32[$17>>2]|0; //@line 465 "SIDH_v1.0/fpx.c"
  $19 = $14 ^ $18; //@line 465 "SIDH_v1.0/fpx.c"
  $20 = $10 & $19; //@line 465 "SIDH_v1.0/fpx.c"
  $6 = $20; //@line 465 "SIDH_v1.0/fpx.c"
  $21 = $6; //@line 466 "SIDH_v1.0/fpx.c"
  $22 = $7; //@line 466 "SIDH_v1.0/fpx.c"
  $23 = $3; //@line 466 "SIDH_v1.0/fpx.c"
  $24 = (($23) + ($22<<2)|0); //@line 466 "SIDH_v1.0/fpx.c"
  $25 = HEAP32[$24>>2]|0; //@line 466 "SIDH_v1.0/fpx.c"
  $26 = $21 ^ $25; //@line 466 "SIDH_v1.0/fpx.c"
  $27 = $7; //@line 466 "SIDH_v1.0/fpx.c"
  $28 = $3; //@line 466 "SIDH_v1.0/fpx.c"
  $29 = (($28) + ($27<<2)|0); //@line 466 "SIDH_v1.0/fpx.c"
  HEAP32[$29>>2] = $26; //@line 466 "SIDH_v1.0/fpx.c"
  $30 = $6; //@line 467 "SIDH_v1.0/fpx.c"
  $31 = $7; //@line 467 "SIDH_v1.0/fpx.c"
  $32 = $4; //@line 467 "SIDH_v1.0/fpx.c"
  $33 = (($32) + ($31<<2)|0); //@line 467 "SIDH_v1.0/fpx.c"
  $34 = HEAP32[$33>>2]|0; //@line 467 "SIDH_v1.0/fpx.c"
  $35 = $30 ^ $34; //@line 467 "SIDH_v1.0/fpx.c"
  $36 = $7; //@line 467 "SIDH_v1.0/fpx.c"
  $37 = $4; //@line 467 "SIDH_v1.0/fpx.c"
  $38 = (($37) + ($36<<2)|0); //@line 467 "SIDH_v1.0/fpx.c"
  HEAP32[$38>>2] = $35; //@line 467 "SIDH_v1.0/fpx.c"
  $39 = $5; //@line 468 "SIDH_v1.0/fpx.c"
  $40 = $7; //@line 468 "SIDH_v1.0/fpx.c"
  $41 = $3; //@line 468 "SIDH_v1.0/fpx.c"
  $42 = ((($41)) + 192|0); //@line 468 "SIDH_v1.0/fpx.c"
  $43 = (($42) + ($40<<2)|0); //@line 468 "SIDH_v1.0/fpx.c"
  $44 = HEAP32[$43>>2]|0; //@line 468 "SIDH_v1.0/fpx.c"
  $45 = $7; //@line 468 "SIDH_v1.0/fpx.c"
  $46 = $4; //@line 468 "SIDH_v1.0/fpx.c"
  $47 = ((($46)) + 192|0); //@line 468 "SIDH_v1.0/fpx.c"
  $48 = (($47) + ($45<<2)|0); //@line 468 "SIDH_v1.0/fpx.c"
  $49 = HEAP32[$48>>2]|0; //@line 468 "SIDH_v1.0/fpx.c"
  $50 = $44 ^ $49; //@line 468 "SIDH_v1.0/fpx.c"
  $51 = $39 & $50; //@line 468 "SIDH_v1.0/fpx.c"
  $6 = $51; //@line 468 "SIDH_v1.0/fpx.c"
  $52 = $6; //@line 469 "SIDH_v1.0/fpx.c"
  $53 = $7; //@line 469 "SIDH_v1.0/fpx.c"
  $54 = $3; //@line 469 "SIDH_v1.0/fpx.c"
  $55 = ((($54)) + 192|0); //@line 469 "SIDH_v1.0/fpx.c"
  $56 = (($55) + ($53<<2)|0); //@line 469 "SIDH_v1.0/fpx.c"
  $57 = HEAP32[$56>>2]|0; //@line 469 "SIDH_v1.0/fpx.c"
  $58 = $52 ^ $57; //@line 469 "SIDH_v1.0/fpx.c"
  $59 = $7; //@line 469 "SIDH_v1.0/fpx.c"
  $60 = $3; //@line 469 "SIDH_v1.0/fpx.c"
  $61 = ((($60)) + 192|0); //@line 469 "SIDH_v1.0/fpx.c"
  $62 = (($61) + ($59<<2)|0); //@line 469 "SIDH_v1.0/fpx.c"
  HEAP32[$62>>2] = $58; //@line 469 "SIDH_v1.0/fpx.c"
  $63 = $6; //@line 470 "SIDH_v1.0/fpx.c"
  $64 = $7; //@line 470 "SIDH_v1.0/fpx.c"
  $65 = $4; //@line 470 "SIDH_v1.0/fpx.c"
  $66 = ((($65)) + 192|0); //@line 470 "SIDH_v1.0/fpx.c"
  $67 = (($66) + ($64<<2)|0); //@line 470 "SIDH_v1.0/fpx.c"
  $68 = HEAP32[$67>>2]|0; //@line 470 "SIDH_v1.0/fpx.c"
  $69 = $63 ^ $68; //@line 470 "SIDH_v1.0/fpx.c"
  $70 = $7; //@line 470 "SIDH_v1.0/fpx.c"
  $71 = $4; //@line 470 "SIDH_v1.0/fpx.c"
  $72 = ((($71)) + 192|0); //@line 470 "SIDH_v1.0/fpx.c"
  $73 = (($72) + ($70<<2)|0); //@line 470 "SIDH_v1.0/fpx.c"
  HEAP32[$73>>2] = $69; //@line 470 "SIDH_v1.0/fpx.c"
  $74 = $5; //@line 471 "SIDH_v1.0/fpx.c"
  $75 = $7; //@line 471 "SIDH_v1.0/fpx.c"
  $76 = $3; //@line 471 "SIDH_v1.0/fpx.c"
  $77 = ((($76)) + 96|0); //@line 471 "SIDH_v1.0/fpx.c"
  $78 = (($77) + ($75<<2)|0); //@line 471 "SIDH_v1.0/fpx.c"
  $79 = HEAP32[$78>>2]|0; //@line 471 "SIDH_v1.0/fpx.c"
  $80 = $7; //@line 471 "SIDH_v1.0/fpx.c"
  $81 = $4; //@line 471 "SIDH_v1.0/fpx.c"
  $82 = ((($81)) + 96|0); //@line 471 "SIDH_v1.0/fpx.c"
  $83 = (($82) + ($80<<2)|0); //@line 471 "SIDH_v1.0/fpx.c"
  $84 = HEAP32[$83>>2]|0; //@line 471 "SIDH_v1.0/fpx.c"
  $85 = $79 ^ $84; //@line 471 "SIDH_v1.0/fpx.c"
  $86 = $74 & $85; //@line 471 "SIDH_v1.0/fpx.c"
  $6 = $86; //@line 471 "SIDH_v1.0/fpx.c"
  $87 = $6; //@line 472 "SIDH_v1.0/fpx.c"
  $88 = $7; //@line 472 "SIDH_v1.0/fpx.c"
  $89 = $3; //@line 472 "SIDH_v1.0/fpx.c"
  $90 = ((($89)) + 96|0); //@line 472 "SIDH_v1.0/fpx.c"
  $91 = (($90) + ($88<<2)|0); //@line 472 "SIDH_v1.0/fpx.c"
  $92 = HEAP32[$91>>2]|0; //@line 472 "SIDH_v1.0/fpx.c"
  $93 = $87 ^ $92; //@line 472 "SIDH_v1.0/fpx.c"
  $94 = $7; //@line 472 "SIDH_v1.0/fpx.c"
  $95 = $3; //@line 472 "SIDH_v1.0/fpx.c"
  $96 = ((($95)) + 96|0); //@line 472 "SIDH_v1.0/fpx.c"
  $97 = (($96) + ($94<<2)|0); //@line 472 "SIDH_v1.0/fpx.c"
  HEAP32[$97>>2] = $93; //@line 472 "SIDH_v1.0/fpx.c"
  $98 = $6; //@line 473 "SIDH_v1.0/fpx.c"
  $99 = $7; //@line 473 "SIDH_v1.0/fpx.c"
  $100 = $4; //@line 473 "SIDH_v1.0/fpx.c"
  $101 = ((($100)) + 96|0); //@line 473 "SIDH_v1.0/fpx.c"
  $102 = (($101) + ($99<<2)|0); //@line 473 "SIDH_v1.0/fpx.c"
  $103 = HEAP32[$102>>2]|0; //@line 473 "SIDH_v1.0/fpx.c"
  $104 = $98 ^ $103; //@line 473 "SIDH_v1.0/fpx.c"
  $105 = $7; //@line 473 "SIDH_v1.0/fpx.c"
  $106 = $4; //@line 473 "SIDH_v1.0/fpx.c"
  $107 = ((($106)) + 96|0); //@line 473 "SIDH_v1.0/fpx.c"
  $108 = (($107) + ($105<<2)|0); //@line 473 "SIDH_v1.0/fpx.c"
  HEAP32[$108>>2] = $104; //@line 473 "SIDH_v1.0/fpx.c"
  $109 = $5; //@line 474 "SIDH_v1.0/fpx.c"
  $110 = $7; //@line 474 "SIDH_v1.0/fpx.c"
  $111 = $3; //@line 474 "SIDH_v1.0/fpx.c"
  $112 = ((($111)) + 192|0); //@line 474 "SIDH_v1.0/fpx.c"
  $113 = ((($112)) + 96|0); //@line 474 "SIDH_v1.0/fpx.c"
  $114 = (($113) + ($110<<2)|0); //@line 474 "SIDH_v1.0/fpx.c"
  $115 = HEAP32[$114>>2]|0; //@line 474 "SIDH_v1.0/fpx.c"
  $116 = $7; //@line 474 "SIDH_v1.0/fpx.c"
  $117 = $4; //@line 474 "SIDH_v1.0/fpx.c"
  $118 = ((($117)) + 192|0); //@line 474 "SIDH_v1.0/fpx.c"
  $119 = ((($118)) + 96|0); //@line 474 "SIDH_v1.0/fpx.c"
  $120 = (($119) + ($116<<2)|0); //@line 474 "SIDH_v1.0/fpx.c"
  $121 = HEAP32[$120>>2]|0; //@line 474 "SIDH_v1.0/fpx.c"
  $122 = $115 ^ $121; //@line 474 "SIDH_v1.0/fpx.c"
  $123 = $109 & $122; //@line 474 "SIDH_v1.0/fpx.c"
  $6 = $123; //@line 474 "SIDH_v1.0/fpx.c"
  $124 = $6; //@line 475 "SIDH_v1.0/fpx.c"
  $125 = $7; //@line 475 "SIDH_v1.0/fpx.c"
  $126 = $3; //@line 475 "SIDH_v1.0/fpx.c"
  $127 = ((($126)) + 192|0); //@line 475 "SIDH_v1.0/fpx.c"
  $128 = ((($127)) + 96|0); //@line 475 "SIDH_v1.0/fpx.c"
  $129 = (($128) + ($125<<2)|0); //@line 475 "SIDH_v1.0/fpx.c"
  $130 = HEAP32[$129>>2]|0; //@line 475 "SIDH_v1.0/fpx.c"
  $131 = $124 ^ $130; //@line 475 "SIDH_v1.0/fpx.c"
  $132 = $7; //@line 475 "SIDH_v1.0/fpx.c"
  $133 = $3; //@line 475 "SIDH_v1.0/fpx.c"
  $134 = ((($133)) + 192|0); //@line 475 "SIDH_v1.0/fpx.c"
  $135 = ((($134)) + 96|0); //@line 475 "SIDH_v1.0/fpx.c"
  $136 = (($135) + ($132<<2)|0); //@line 475 "SIDH_v1.0/fpx.c"
  HEAP32[$136>>2] = $131; //@line 475 "SIDH_v1.0/fpx.c"
  $137 = $6; //@line 476 "SIDH_v1.0/fpx.c"
  $138 = $7; //@line 476 "SIDH_v1.0/fpx.c"
  $139 = $4; //@line 476 "SIDH_v1.0/fpx.c"
  $140 = ((($139)) + 192|0); //@line 476 "SIDH_v1.0/fpx.c"
  $141 = ((($140)) + 96|0); //@line 476 "SIDH_v1.0/fpx.c"
  $142 = (($141) + ($138<<2)|0); //@line 476 "SIDH_v1.0/fpx.c"
  $143 = HEAP32[$142>>2]|0; //@line 476 "SIDH_v1.0/fpx.c"
  $144 = $137 ^ $143; //@line 476 "SIDH_v1.0/fpx.c"
  $145 = $7; //@line 476 "SIDH_v1.0/fpx.c"
  $146 = $4; //@line 476 "SIDH_v1.0/fpx.c"
  $147 = ((($146)) + 192|0); //@line 476 "SIDH_v1.0/fpx.c"
  $148 = ((($147)) + 96|0); //@line 476 "SIDH_v1.0/fpx.c"
  $149 = (($148) + ($145<<2)|0); //@line 476 "SIDH_v1.0/fpx.c"
  HEAP32[$149>>2] = $144; //@line 476 "SIDH_v1.0/fpx.c"
  $150 = $7; //@line 464 "SIDH_v1.0/fpx.c"
  $151 = (($150) + 1)|0; //@line 464 "SIDH_v1.0/fpx.c"
  $7 = $151; //@line 464 "SIDH_v1.0/fpx.c"
 }
 STACKTOP = sp;return; //@line 478 "SIDH_v1.0/fpx.c"
}
function _select_f2elm($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 $8 = 0; //@line 486 "SIDH_v1.0/fpx.c"
 while(1) {
  $9 = $8; //@line 486 "SIDH_v1.0/fpx.c"
  $10 = ($9>>>0)<(24); //@line 486 "SIDH_v1.0/fpx.c"
  if (!($10)) {
   break;
  }
  $11 = $7; //@line 487 "SIDH_v1.0/fpx.c"
  $12 = $8; //@line 487 "SIDH_v1.0/fpx.c"
  $13 = $4; //@line 487 "SIDH_v1.0/fpx.c"
  $14 = (($13) + ($12<<2)|0); //@line 487 "SIDH_v1.0/fpx.c"
  $15 = HEAP32[$14>>2]|0; //@line 487 "SIDH_v1.0/fpx.c"
  $16 = $8; //@line 487 "SIDH_v1.0/fpx.c"
  $17 = $5; //@line 487 "SIDH_v1.0/fpx.c"
  $18 = (($17) + ($16<<2)|0); //@line 487 "SIDH_v1.0/fpx.c"
  $19 = HEAP32[$18>>2]|0; //@line 487 "SIDH_v1.0/fpx.c"
  $20 = $15 ^ $19; //@line 487 "SIDH_v1.0/fpx.c"
  $21 = $11 & $20; //@line 487 "SIDH_v1.0/fpx.c"
  $22 = $8; //@line 487 "SIDH_v1.0/fpx.c"
  $23 = $4; //@line 487 "SIDH_v1.0/fpx.c"
  $24 = (($23) + ($22<<2)|0); //@line 487 "SIDH_v1.0/fpx.c"
  $25 = HEAP32[$24>>2]|0; //@line 487 "SIDH_v1.0/fpx.c"
  $26 = $21 ^ $25; //@line 487 "SIDH_v1.0/fpx.c"
  $27 = $8; //@line 487 "SIDH_v1.0/fpx.c"
  $28 = $6; //@line 487 "SIDH_v1.0/fpx.c"
  $29 = (($28) + ($27<<2)|0); //@line 487 "SIDH_v1.0/fpx.c"
  HEAP32[$29>>2] = $26; //@line 487 "SIDH_v1.0/fpx.c"
  $30 = $7; //@line 488 "SIDH_v1.0/fpx.c"
  $31 = $8; //@line 488 "SIDH_v1.0/fpx.c"
  $32 = $4; //@line 488 "SIDH_v1.0/fpx.c"
  $33 = ((($32)) + 96|0); //@line 488 "SIDH_v1.0/fpx.c"
  $34 = (($33) + ($31<<2)|0); //@line 488 "SIDH_v1.0/fpx.c"
  $35 = HEAP32[$34>>2]|0; //@line 488 "SIDH_v1.0/fpx.c"
  $36 = $8; //@line 488 "SIDH_v1.0/fpx.c"
  $37 = $5; //@line 488 "SIDH_v1.0/fpx.c"
  $38 = ((($37)) + 96|0); //@line 488 "SIDH_v1.0/fpx.c"
  $39 = (($38) + ($36<<2)|0); //@line 488 "SIDH_v1.0/fpx.c"
  $40 = HEAP32[$39>>2]|0; //@line 488 "SIDH_v1.0/fpx.c"
  $41 = $35 ^ $40; //@line 488 "SIDH_v1.0/fpx.c"
  $42 = $30 & $41; //@line 488 "SIDH_v1.0/fpx.c"
  $43 = $8; //@line 488 "SIDH_v1.0/fpx.c"
  $44 = $4; //@line 488 "SIDH_v1.0/fpx.c"
  $45 = ((($44)) + 96|0); //@line 488 "SIDH_v1.0/fpx.c"
  $46 = (($45) + ($43<<2)|0); //@line 488 "SIDH_v1.0/fpx.c"
  $47 = HEAP32[$46>>2]|0; //@line 488 "SIDH_v1.0/fpx.c"
  $48 = $42 ^ $47; //@line 488 "SIDH_v1.0/fpx.c"
  $49 = $8; //@line 488 "SIDH_v1.0/fpx.c"
  $50 = $6; //@line 488 "SIDH_v1.0/fpx.c"
  $51 = ((($50)) + 96|0); //@line 488 "SIDH_v1.0/fpx.c"
  $52 = (($51) + ($49<<2)|0); //@line 488 "SIDH_v1.0/fpx.c"
  HEAP32[$52>>2] = $48; //@line 488 "SIDH_v1.0/fpx.c"
  $53 = $8; //@line 486 "SIDH_v1.0/fpx.c"
  $54 = (($53) + 1)|0; //@line 486 "SIDH_v1.0/fpx.c"
  $8 = $54; //@line 486 "SIDH_v1.0/fpx.c"
 }
 STACKTOP = sp;return; //@line 490 "SIDH_v1.0/fpx.c"
}
function _fpadd751($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0;
 var $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(48|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $7 = 0; //@line 24 "SIDH_v1.0/generic/fp_generic.c"
 $6 = 0; //@line 27 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $13 = $6; //@line 27 "SIDH_v1.0/generic/fp_generic.c"
  $14 = ($13>>>0)<(24); //@line 27 "SIDH_v1.0/generic/fp_generic.c"
  if (!($14)) {
   break;
  }
  $15 = $6; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $16 = $3; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $17 = (($16) + ($15<<2)|0); //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $18 = HEAP32[$17>>2]|0; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $19 = $7; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $20 = (($18) + ($19))|0; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $9 = $20; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $21 = $6; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $22 = $4; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $23 = (($22) + ($21<<2)|0); //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $24 = HEAP32[$23>>2]|0; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $25 = $9; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $26 = (($24) + ($25))|0; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $27 = $6; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $28 = $5; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $29 = (($28) + ($27<<2)|0); //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$29>>2] = $26; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $30 = $9; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $31 = $7; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $32 = (_is_digit_lessthan_ct_59($30,$31)|0); //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $33 = $6; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $34 = $5; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $35 = (($34) + ($33<<2)|0); //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $36 = HEAP32[$35>>2]|0; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $37 = $9; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $38 = (_is_digit_lessthan_ct_59($36,$37)|0); //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $39 = $32 | $38; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $7 = $39; //@line 28 "SIDH_v1.0/generic/fp_generic.c"
  $40 = $6; //@line 27 "SIDH_v1.0/generic/fp_generic.c"
  $41 = (($40) + 1)|0; //@line 27 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $41; //@line 27 "SIDH_v1.0/generic/fp_generic.c"
 }
 $7 = 0; //@line 31 "SIDH_v1.0/generic/fp_generic.c"
 $6 = 0; //@line 32 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $42 = $6; //@line 32 "SIDH_v1.0/generic/fp_generic.c"
  $43 = ($42>>>0)<(24); //@line 32 "SIDH_v1.0/generic/fp_generic.c"
  if (!($43)) {
   break;
  }
  $44 = $6; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $45 = $5; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $46 = (($45) + ($44<<2)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $47 = HEAP32[$46>>2]|0; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $48 = $6; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $49 = (2456 + ($48<<2)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $50 = HEAP32[$49>>2]|0; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $51 = (($47) - ($50))|0; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $10 = $51; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $52 = $6; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $53 = $5; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $54 = (($53) + ($52<<2)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $55 = HEAP32[$54>>2]|0; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $56 = $6; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $57 = (2456 + ($56<<2)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $58 = HEAP32[$57>>2]|0; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $59 = (_is_digit_lessthan_ct_59($55,$58)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $60 = $7; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $61 = $10; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $62 = (_is_digit_zero_ct_60($61)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $63 = $60 & $62; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $64 = $59 | $63; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $11 = $64; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $65 = $10; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $66 = $7; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $67 = (($65) - ($66))|0; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $68 = $6; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $69 = $5; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $70 = (($69) + ($68<<2)|0); //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$70>>2] = $67; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $71 = $11; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $7 = $71; //@line 33 "SIDH_v1.0/generic/fp_generic.c"
  $72 = $6; //@line 32 "SIDH_v1.0/generic/fp_generic.c"
  $73 = (($72) + 1)|0; //@line 32 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $73; //@line 32 "SIDH_v1.0/generic/fp_generic.c"
 }
 $74 = $7; //@line 35 "SIDH_v1.0/generic/fp_generic.c"
 $75 = (0 - ($74))|0; //@line 35 "SIDH_v1.0/generic/fp_generic.c"
 $8 = $75; //@line 35 "SIDH_v1.0/generic/fp_generic.c"
 $7 = 0; //@line 37 "SIDH_v1.0/generic/fp_generic.c"
 $6 = 0; //@line 38 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $76 = $6; //@line 38 "SIDH_v1.0/generic/fp_generic.c"
  $77 = ($76>>>0)<(24); //@line 38 "SIDH_v1.0/generic/fp_generic.c"
  if (!($77)) {
   break;
  }
  $78 = $6; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $79 = $5; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $80 = (($79) + ($78<<2)|0); //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $81 = HEAP32[$80>>2]|0; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $82 = $7; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $83 = (($81) + ($82))|0; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $12 = $83; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $84 = $6; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $85 = (2456 + ($84<<2)|0); //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $86 = HEAP32[$85>>2]|0; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $87 = $8; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $88 = $86 & $87; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $89 = $12; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $90 = (($88) + ($89))|0; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $91 = $6; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $92 = $5; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $93 = (($92) + ($91<<2)|0); //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$93>>2] = $90; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $94 = $12; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $95 = $7; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $96 = (_is_digit_lessthan_ct_59($94,$95)|0); //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $97 = $6; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $98 = $5; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $99 = (($98) + ($97<<2)|0); //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $100 = HEAP32[$99>>2]|0; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $101 = $12; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $102 = (_is_digit_lessthan_ct_59($100,$101)|0); //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $103 = $96 | $102; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $7 = $103; //@line 39 "SIDH_v1.0/generic/fp_generic.c"
  $104 = $6; //@line 38 "SIDH_v1.0/generic/fp_generic.c"
  $105 = (($104) + 1)|0; //@line 38 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $105; //@line 38 "SIDH_v1.0/generic/fp_generic.c"
 }
 STACKTOP = sp;return; //@line 41 "SIDH_v1.0/generic/fp_generic.c"
}
function _is_digit_lessthan_ct_59($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $5 = $2; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $6 = $3; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $7 = $5 ^ $6; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $8 = $2; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $9 = $3; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $10 = (($8) - ($9))|0; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $11 = $3; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $12 = $10 ^ $11; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $13 = $7 | $12; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $14 = $4 ^ $13; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 $15 = $14 >>> 31; //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
 STACKTOP = sp;return ($15|0); //@line 82 "SIDH_v1.0/generic/../SIDH_internal.h"
}
function _is_digit_zero_ct_60($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1; //@line 77 "SIDH_v1.0/generic/../SIDH_internal.h"
 $3 = (_is_digit_nonzero_ct_61($2)|0); //@line 77 "SIDH_v1.0/generic/../SIDH_internal.h"
 $4 = 1 ^ $3; //@line 77 "SIDH_v1.0/generic/../SIDH_internal.h"
 STACKTOP = sp;return ($4|0); //@line 77 "SIDH_v1.0/generic/../SIDH_internal.h"
}
function _is_digit_nonzero_ct_61($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1; //@line 72 "SIDH_v1.0/generic/../SIDH_internal.h"
 $3 = $1; //@line 72 "SIDH_v1.0/generic/../SIDH_internal.h"
 $4 = (0 - ($3))|0; //@line 72 "SIDH_v1.0/generic/../SIDH_internal.h"
 $5 = $2 | $4; //@line 72 "SIDH_v1.0/generic/../SIDH_internal.h"
 $6 = $5 >>> 31; //@line 72 "SIDH_v1.0/generic/../SIDH_internal.h"
 STACKTOP = sp;return ($6|0); //@line 72 "SIDH_v1.0/generic/../SIDH_internal.h"
}
function _fpsub751($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0;
 var $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(48|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $7 = 0; //@line 48 "SIDH_v1.0/generic/fp_generic.c"
 $6 = 0; //@line 51 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $12 = $6; //@line 51 "SIDH_v1.0/generic/fp_generic.c"
  $13 = ($12>>>0)<(24); //@line 51 "SIDH_v1.0/generic/fp_generic.c"
  if (!($13)) {
   break;
  }
  $14 = $6; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $15 = $3; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $16 = (($15) + ($14<<2)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $17 = HEAP32[$16>>2]|0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $18 = $6; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $19 = $4; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $20 = (($19) + ($18<<2)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $21 = HEAP32[$20>>2]|0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $22 = (($17) - ($21))|0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $9 = $22; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $23 = $6; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $24 = $3; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $25 = (($24) + ($23<<2)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $26 = HEAP32[$25>>2]|0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $27 = $6; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $28 = $4; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $29 = (($28) + ($27<<2)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $30 = HEAP32[$29>>2]|0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $31 = (_is_digit_lessthan_ct_59($26,$30)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $32 = $7; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $33 = $9; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $34 = (_is_digit_zero_ct_60($33)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $35 = $32 & $34; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $36 = $31 | $35; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $10 = $36; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $37 = $9; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $38 = $7; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $39 = (($37) - ($38))|0; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $40 = $6; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $41 = $5; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $42 = (($41) + ($40<<2)|0); //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$42>>2] = $39; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $43 = $10; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $7 = $43; //@line 52 "SIDH_v1.0/generic/fp_generic.c"
  $44 = $6; //@line 51 "SIDH_v1.0/generic/fp_generic.c"
  $45 = (($44) + 1)|0; //@line 51 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $45; //@line 51 "SIDH_v1.0/generic/fp_generic.c"
 }
 $46 = $7; //@line 54 "SIDH_v1.0/generic/fp_generic.c"
 $47 = (0 - ($46))|0; //@line 54 "SIDH_v1.0/generic/fp_generic.c"
 $8 = $47; //@line 54 "SIDH_v1.0/generic/fp_generic.c"
 $7 = 0; //@line 56 "SIDH_v1.0/generic/fp_generic.c"
 $6 = 0; //@line 57 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $48 = $6; //@line 57 "SIDH_v1.0/generic/fp_generic.c"
  $49 = ($48>>>0)<(24); //@line 57 "SIDH_v1.0/generic/fp_generic.c"
  if (!($49)) {
   break;
  }
  $50 = $6; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $51 = $5; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $52 = (($51) + ($50<<2)|0); //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $53 = HEAP32[$52>>2]|0; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $54 = $7; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $55 = (($53) + ($54))|0; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $11 = $55; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $56 = $6; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $57 = (2456 + ($56<<2)|0); //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $58 = HEAP32[$57>>2]|0; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $59 = $8; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $60 = $58 & $59; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $61 = $11; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $62 = (($60) + ($61))|0; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $63 = $6; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $64 = $5; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $65 = (($64) + ($63<<2)|0); //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$65>>2] = $62; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $66 = $11; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $67 = $7; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $68 = (_is_digit_lessthan_ct_59($66,$67)|0); //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $69 = $6; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $70 = $5; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $71 = (($70) + ($69<<2)|0); //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $72 = HEAP32[$71>>2]|0; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $73 = $11; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $74 = (_is_digit_lessthan_ct_59($72,$73)|0); //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $75 = $68 | $74; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $7 = $75; //@line 58 "SIDH_v1.0/generic/fp_generic.c"
  $76 = $6; //@line 57 "SIDH_v1.0/generic/fp_generic.c"
  $77 = (($76) + 1)|0; //@line 57 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $77; //@line 57 "SIDH_v1.0/generic/fp_generic.c"
 }
 STACKTOP = sp;return; //@line 60 "SIDH_v1.0/generic/fp_generic.c"
}
function _fpneg751($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $1 = $0;
 $3 = 0; //@line 66 "SIDH_v1.0/generic/fp_generic.c"
 $2 = 0; //@line 68 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $6 = $2; //@line 68 "SIDH_v1.0/generic/fp_generic.c"
  $7 = ($6>>>0)<(24); //@line 68 "SIDH_v1.0/generic/fp_generic.c"
  if (!($7)) {
   break;
  }
  $8 = $2; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $9 = (2456 + ($8<<2)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $10 = HEAP32[$9>>2]|0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $11 = $2; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $12 = $1; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $13 = (($12) + ($11<<2)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $14 = HEAP32[$13>>2]|0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $15 = (($10) - ($14))|0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $4 = $15; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $16 = $2; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $17 = (2456 + ($16<<2)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $18 = HEAP32[$17>>2]|0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $19 = $2; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $20 = $1; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $21 = (($20) + ($19<<2)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $22 = HEAP32[$21>>2]|0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $23 = (_is_digit_lessthan_ct_59($18,$22)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $24 = $3; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $25 = $4; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $26 = (_is_digit_zero_ct_60($25)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $27 = $24 & $26; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $28 = $23 | $27; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $5 = $28; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $29 = $4; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $30 = $3; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $31 = (($29) - ($30))|0; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $32 = $2; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $33 = $1; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $34 = (($33) + ($32<<2)|0); //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$34>>2] = $31; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $35 = $5; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $3 = $35; //@line 69 "SIDH_v1.0/generic/fp_generic.c"
  $36 = $2; //@line 68 "SIDH_v1.0/generic/fp_generic.c"
  $37 = (($36) + 1)|0; //@line 68 "SIDH_v1.0/generic/fp_generic.c"
  $2 = $37; //@line 68 "SIDH_v1.0/generic/fp_generic.c"
 }
 STACKTOP = sp;return; //@line 71 "SIDH_v1.0/generic/fp_generic.c"
}
function _fpdiv2_751($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $2 = $0;
 $3 = $1;
 $5 = 0; //@line 78 "SIDH_v1.0/generic/fp_generic.c"
 $8 = $2; //@line 81 "SIDH_v1.0/generic/fp_generic.c"
 $9 = HEAP32[$8>>2]|0; //@line 81 "SIDH_v1.0/generic/fp_generic.c"
 $10 = $9 & 1; //@line 81 "SIDH_v1.0/generic/fp_generic.c"
 $11 = (0 - ($10))|0; //@line 81 "SIDH_v1.0/generic/fp_generic.c"
 $6 = $11; //@line 81 "SIDH_v1.0/generic/fp_generic.c"
 $4 = 0; //@line 82 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $12 = $4; //@line 82 "SIDH_v1.0/generic/fp_generic.c"
  $13 = ($12>>>0)<(24); //@line 82 "SIDH_v1.0/generic/fp_generic.c"
  if (!($13)) {
   break;
  }
  $14 = $4; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $15 = $2; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $16 = (($15) + ($14<<2)|0); //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $17 = HEAP32[$16>>2]|0; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $18 = $5; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $19 = (($17) + ($18))|0; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $7 = $19; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $20 = $4; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $21 = (2456 + ($20<<2)|0); //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $22 = HEAP32[$21>>2]|0; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $23 = $6; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $24 = $22 & $23; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $25 = $7; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $26 = (($24) + ($25))|0; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $27 = $4; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $28 = $3; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $29 = (($28) + ($27<<2)|0); //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$29>>2] = $26; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $30 = $7; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $31 = $5; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $32 = (_is_digit_lessthan_ct_59($30,$31)|0); //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $33 = $4; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $34 = $3; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $35 = (($34) + ($33<<2)|0); //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $36 = HEAP32[$35>>2]|0; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $37 = $7; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $38 = (_is_digit_lessthan_ct_59($36,$37)|0); //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $39 = $32 | $38; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $5 = $39; //@line 83 "SIDH_v1.0/generic/fp_generic.c"
  $40 = $4; //@line 82 "SIDH_v1.0/generic/fp_generic.c"
  $41 = (($40) + 1)|0; //@line 82 "SIDH_v1.0/generic/fp_generic.c"
  $4 = $41; //@line 82 "SIDH_v1.0/generic/fp_generic.c"
 }
 $42 = $3; //@line 86 "SIDH_v1.0/generic/fp_generic.c"
 _mp_shiftr1($42,24); //@line 86 "SIDH_v1.0/generic/fp_generic.c"
 STACKTOP = sp;return; //@line 87 "SIDH_v1.0/generic/fp_generic.c"
}
function _digit_x_digit($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0;
 var $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0;
 var $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(80|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $19 = 65535; //@line 94 "SIDH_v1.0/generic/fp_generic.c"
 $20 = -65536; //@line 94 "SIDH_v1.0/generic/fp_generic.c"
 $21 = $3; //@line 96 "SIDH_v1.0/generic/fp_generic.c"
 $22 = $19; //@line 96 "SIDH_v1.0/generic/fp_generic.c"
 $23 = $21 & $22; //@line 96 "SIDH_v1.0/generic/fp_generic.c"
 $6 = $23; //@line 96 "SIDH_v1.0/generic/fp_generic.c"
 $24 = $3; //@line 97 "SIDH_v1.0/generic/fp_generic.c"
 $25 = $24 >>> 16; //@line 97 "SIDH_v1.0/generic/fp_generic.c"
 $7 = $25; //@line 97 "SIDH_v1.0/generic/fp_generic.c"
 $26 = $4; //@line 98 "SIDH_v1.0/generic/fp_generic.c"
 $27 = $19; //@line 98 "SIDH_v1.0/generic/fp_generic.c"
 $28 = $26 & $27; //@line 98 "SIDH_v1.0/generic/fp_generic.c"
 $8 = $28; //@line 98 "SIDH_v1.0/generic/fp_generic.c"
 $29 = $4; //@line 99 "SIDH_v1.0/generic/fp_generic.c"
 $30 = $29 >>> 16; //@line 99 "SIDH_v1.0/generic/fp_generic.c"
 $9 = $30; //@line 99 "SIDH_v1.0/generic/fp_generic.c"
 $31 = $6; //@line 101 "SIDH_v1.0/generic/fp_generic.c"
 $32 = $8; //@line 101 "SIDH_v1.0/generic/fp_generic.c"
 $33 = Math_imul($31, $32)|0; //@line 101 "SIDH_v1.0/generic/fp_generic.c"
 $11 = $33; //@line 101 "SIDH_v1.0/generic/fp_generic.c"
 $34 = $6; //@line 102 "SIDH_v1.0/generic/fp_generic.c"
 $35 = $9; //@line 102 "SIDH_v1.0/generic/fp_generic.c"
 $36 = Math_imul($34, $35)|0; //@line 102 "SIDH_v1.0/generic/fp_generic.c"
 $12 = $36; //@line 102 "SIDH_v1.0/generic/fp_generic.c"
 $37 = $7; //@line 103 "SIDH_v1.0/generic/fp_generic.c"
 $38 = $8; //@line 103 "SIDH_v1.0/generic/fp_generic.c"
 $39 = Math_imul($37, $38)|0; //@line 103 "SIDH_v1.0/generic/fp_generic.c"
 $13 = $39; //@line 103 "SIDH_v1.0/generic/fp_generic.c"
 $40 = $7; //@line 104 "SIDH_v1.0/generic/fp_generic.c"
 $41 = $9; //@line 104 "SIDH_v1.0/generic/fp_generic.c"
 $42 = Math_imul($40, $41)|0; //@line 104 "SIDH_v1.0/generic/fp_generic.c"
 $14 = $42; //@line 104 "SIDH_v1.0/generic/fp_generic.c"
 $43 = $11; //@line 105 "SIDH_v1.0/generic/fp_generic.c"
 $44 = $19; //@line 105 "SIDH_v1.0/generic/fp_generic.c"
 $45 = $43 & $44; //@line 105 "SIDH_v1.0/generic/fp_generic.c"
 $46 = $5; //@line 105 "SIDH_v1.0/generic/fp_generic.c"
 HEAP32[$46>>2] = $45; //@line 105 "SIDH_v1.0/generic/fp_generic.c"
 $47 = $11; //@line 107 "SIDH_v1.0/generic/fp_generic.c"
 $48 = $47 >>> 16; //@line 107 "SIDH_v1.0/generic/fp_generic.c"
 $15 = $48; //@line 107 "SIDH_v1.0/generic/fp_generic.c"
 $49 = $13; //@line 108 "SIDH_v1.0/generic/fp_generic.c"
 $50 = $19; //@line 108 "SIDH_v1.0/generic/fp_generic.c"
 $51 = $49 & $50; //@line 108 "SIDH_v1.0/generic/fp_generic.c"
 $16 = $51; //@line 108 "SIDH_v1.0/generic/fp_generic.c"
 $52 = $12; //@line 109 "SIDH_v1.0/generic/fp_generic.c"
 $53 = $19; //@line 109 "SIDH_v1.0/generic/fp_generic.c"
 $54 = $52 & $53; //@line 109 "SIDH_v1.0/generic/fp_generic.c"
 $17 = $54; //@line 109 "SIDH_v1.0/generic/fp_generic.c"
 $55 = $15; //@line 110 "SIDH_v1.0/generic/fp_generic.c"
 $56 = $16; //@line 110 "SIDH_v1.0/generic/fp_generic.c"
 $57 = (($55) + ($56))|0; //@line 110 "SIDH_v1.0/generic/fp_generic.c"
 $58 = $17; //@line 110 "SIDH_v1.0/generic/fp_generic.c"
 $59 = (($57) + ($58))|0; //@line 110 "SIDH_v1.0/generic/fp_generic.c"
 $10 = $59; //@line 110 "SIDH_v1.0/generic/fp_generic.c"
 $60 = $10; //@line 111 "SIDH_v1.0/generic/fp_generic.c"
 $61 = $60 >>> 16; //@line 111 "SIDH_v1.0/generic/fp_generic.c"
 $18 = $61; //@line 111 "SIDH_v1.0/generic/fp_generic.c"
 $62 = $10; //@line 112 "SIDH_v1.0/generic/fp_generic.c"
 $63 = $62 << 16; //@line 112 "SIDH_v1.0/generic/fp_generic.c"
 $64 = $5; //@line 112 "SIDH_v1.0/generic/fp_generic.c"
 $65 = HEAP32[$64>>2]|0; //@line 112 "SIDH_v1.0/generic/fp_generic.c"
 $66 = $65 ^ $63; //@line 112 "SIDH_v1.0/generic/fp_generic.c"
 HEAP32[$64>>2] = $66; //@line 112 "SIDH_v1.0/generic/fp_generic.c"
 $67 = $13; //@line 114 "SIDH_v1.0/generic/fp_generic.c"
 $68 = $67 >>> 16; //@line 114 "SIDH_v1.0/generic/fp_generic.c"
 $15 = $68; //@line 114 "SIDH_v1.0/generic/fp_generic.c"
 $69 = $12; //@line 115 "SIDH_v1.0/generic/fp_generic.c"
 $70 = $69 >>> 16; //@line 115 "SIDH_v1.0/generic/fp_generic.c"
 $16 = $70; //@line 115 "SIDH_v1.0/generic/fp_generic.c"
 $71 = $14; //@line 116 "SIDH_v1.0/generic/fp_generic.c"
 $72 = $19; //@line 116 "SIDH_v1.0/generic/fp_generic.c"
 $73 = $71 & $72; //@line 116 "SIDH_v1.0/generic/fp_generic.c"
 $17 = $73; //@line 116 "SIDH_v1.0/generic/fp_generic.c"
 $74 = $15; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $75 = $16; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $76 = (($74) + ($75))|0; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $77 = $17; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $78 = (($76) + ($77))|0; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $79 = $18; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $80 = (($78) + ($79))|0; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $10 = $80; //@line 117 "SIDH_v1.0/generic/fp_generic.c"
 $81 = $10; //@line 118 "SIDH_v1.0/generic/fp_generic.c"
 $82 = $19; //@line 118 "SIDH_v1.0/generic/fp_generic.c"
 $83 = $81 & $82; //@line 118 "SIDH_v1.0/generic/fp_generic.c"
 $84 = $5; //@line 118 "SIDH_v1.0/generic/fp_generic.c"
 $85 = ((($84)) + 4|0); //@line 118 "SIDH_v1.0/generic/fp_generic.c"
 HEAP32[$85>>2] = $83; //@line 118 "SIDH_v1.0/generic/fp_generic.c"
 $86 = $10; //@line 119 "SIDH_v1.0/generic/fp_generic.c"
 $87 = $20; //@line 119 "SIDH_v1.0/generic/fp_generic.c"
 $88 = $86 & $87; //@line 119 "SIDH_v1.0/generic/fp_generic.c"
 $18 = $88; //@line 119 "SIDH_v1.0/generic/fp_generic.c"
 $89 = $14; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $90 = $20; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $91 = $89 & $90; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $92 = $18; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $93 = (($91) + ($92))|0; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $94 = $5; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $95 = ((($94)) + 4|0); //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $96 = HEAP32[$95>>2]|0; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 $97 = $96 ^ $93; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 HEAP32[$95>>2] = $97; //@line 120 "SIDH_v1.0/generic/fp_generic.c"
 STACKTOP = sp;return; //@line 121 "SIDH_v1.0/generic/fp_generic.c"
}
function _mp_mul($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0;
 var $85 = 0, $86 = 0, $87 = 0, $88 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(64|0);
 $12 = sp + 16|0;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 $13 = 0; //@line 128 "SIDH_v1.0/generic/fp_generic.c"
 $8 = 0; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $16 = $8; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $17 = $7; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $18 = $17<<1; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $19 = ($16>>>0)<($18>>>0); //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  if (!($19)) {
   break;
  }
  $20 = $8; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $21 = $6; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $22 = (($21) + ($20<<2)|0); //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$22>>2] = 0; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $23 = $8; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $24 = (($23) + 1)|0; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
  $8 = $24; //@line 130 "SIDH_v1.0/generic/fp_generic.c"
 }
 $8 = 0; //@line 132 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $25 = $8; //@line 132 "SIDH_v1.0/generic/fp_generic.c"
  $26 = $7; //@line 132 "SIDH_v1.0/generic/fp_generic.c"
  $27 = ($25>>>0)<($26>>>0); //@line 132 "SIDH_v1.0/generic/fp_generic.c"
  if (!($27)) {
   break;
  }
  $10 = 0; //@line 133 "SIDH_v1.0/generic/fp_generic.c"
  $9 = 0; //@line 134 "SIDH_v1.0/generic/fp_generic.c"
  while(1) {
   $28 = $9; //@line 134 "SIDH_v1.0/generic/fp_generic.c"
   $29 = $7; //@line 134 "SIDH_v1.0/generic/fp_generic.c"
   $30 = ($28>>>0)<($29>>>0); //@line 134 "SIDH_v1.0/generic/fp_generic.c"
   if (!($30)) {
    break;
   }
   $31 = $8; //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $32 = $4; //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $33 = (($32) + ($31<<2)|0); //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $34 = HEAP32[$33>>2]|0; //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $35 = $9; //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $36 = $5; //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $37 = (($36) + ($35<<2)|0); //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $38 = HEAP32[$37>>2]|0; //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   _digit_x_digit($34,$38,$12); //@line 135 "SIDH_v1.0/generic/fp_generic.c"
   $39 = HEAP32[$12>>2]|0; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $40 = (($39) + 0)|0; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $14 = $40; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $41 = $10; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $42 = $14; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $43 = (($41) + ($42))|0; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $11 = $43; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $44 = $14; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $45 = (_is_digit_lessthan_ct_59($44,0)|0); //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $46 = $11; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $47 = $14; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $48 = (_is_digit_lessthan_ct_59($46,$47)|0); //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $49 = $45 | $48; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $13 = $49; //@line 136 "SIDH_v1.0/generic/fp_generic.c"
   $50 = ((($12)) + 4|0); //@line 137 "SIDH_v1.0/generic/fp_generic.c"
   $51 = HEAP32[$50>>2]|0; //@line 137 "SIDH_v1.0/generic/fp_generic.c"
   $52 = $13; //@line 137 "SIDH_v1.0/generic/fp_generic.c"
   $53 = (($51) + ($52))|0; //@line 137 "SIDH_v1.0/generic/fp_generic.c"
   $10 = $53; //@line 137 "SIDH_v1.0/generic/fp_generic.c"
   $54 = $8; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $55 = $9; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $56 = (($54) + ($55))|0; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $57 = $6; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $58 = (($57) + ($56<<2)|0); //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $59 = HEAP32[$58>>2]|0; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $60 = (($59) + 0)|0; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $15 = $60; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $61 = $11; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $62 = $15; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $63 = (($61) + ($62))|0; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $11 = $63; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $64 = $15; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $65 = (_is_digit_lessthan_ct_59($64,0)|0); //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $66 = $11; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $67 = $15; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $68 = (_is_digit_lessthan_ct_59($66,$67)|0); //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $69 = $65 | $68; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $13 = $69; //@line 138 "SIDH_v1.0/generic/fp_generic.c"
   $70 = $10; //@line 139 "SIDH_v1.0/generic/fp_generic.c"
   $71 = $13; //@line 139 "SIDH_v1.0/generic/fp_generic.c"
   $72 = (($70) + ($71))|0; //@line 139 "SIDH_v1.0/generic/fp_generic.c"
   $10 = $72; //@line 139 "SIDH_v1.0/generic/fp_generic.c"
   $73 = $11; //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   $74 = $8; //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   $75 = $9; //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   $76 = (($74) + ($75))|0; //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   $77 = $6; //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   $78 = (($77) + ($76<<2)|0); //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   HEAP32[$78>>2] = $73; //@line 140 "SIDH_v1.0/generic/fp_generic.c"
   $79 = $9; //@line 134 "SIDH_v1.0/generic/fp_generic.c"
   $80 = (($79) + 1)|0; //@line 134 "SIDH_v1.0/generic/fp_generic.c"
   $9 = $80; //@line 134 "SIDH_v1.0/generic/fp_generic.c"
  }
  $81 = $10; //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  $82 = $7; //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  $83 = $8; //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  $84 = (($82) + ($83))|0; //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  $85 = $6; //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  $86 = (($85) + ($84<<2)|0); //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$86>>2] = $81; //@line 142 "SIDH_v1.0/generic/fp_generic.c"
  $87 = $8; //@line 132 "SIDH_v1.0/generic/fp_generic.c"
  $88 = (($87) + 1)|0; //@line 132 "SIDH_v1.0/generic/fp_generic.c"
  $8 = $88; //@line 132 "SIDH_v1.0/generic/fp_generic.c"
 }
 STACKTOP = sp;return; //@line 144 "SIDH_v1.0/generic/fp_generic.c"
}
function _rdc_mont($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0;
 var $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0;
 var $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0;
 var $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0;
 var $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0;
 var $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0;
 var $262 = 0, $263 = 0, $264 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0;
 var $97 = 0, $98 = 0, $99 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(208|0);
 $9 = sp + 160|0;
 $13 = sp + 44|0;
 $2 = $0;
 $3 = $1;
 $7 = 11; //@line 186 "SIDH_v1.0/generic/fp_generic.c"
 $10 = 0; //@line 187 "SIDH_v1.0/generic/fp_generic.c"
 $11 = 0; //@line 187 "SIDH_v1.0/generic/fp_generic.c"
 $12 = 0; //@line 187 "SIDH_v1.0/generic/fp_generic.c"
 dest=$13; stop=dest+100|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0)); //@line 187 "SIDH_v1.0/generic/fp_generic.c"
 $4 = 0; //@line 189 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $25 = $4; //@line 189 "SIDH_v1.0/generic/fp_generic.c"
  $26 = ($25>>>0)<(24); //@line 189 "SIDH_v1.0/generic/fp_generic.c"
  if (!($26)) {
   break;
  }
  $5 = 0; //@line 190 "SIDH_v1.0/generic/fp_generic.c"
  while(1) {
   $27 = $5; //@line 190 "SIDH_v1.0/generic/fp_generic.c"
   $28 = $4; //@line 190 "SIDH_v1.0/generic/fp_generic.c"
   $29 = ($27>>>0)<($28>>>0); //@line 190 "SIDH_v1.0/generic/fp_generic.c"
   if (!($29)) {
    break;
   }
   $30 = $5; //@line 191 "SIDH_v1.0/generic/fp_generic.c"
   $31 = $4; //@line 191 "SIDH_v1.0/generic/fp_generic.c"
   $32 = (($31) - 11)|0; //@line 191 "SIDH_v1.0/generic/fp_generic.c"
   $33 = (($32) + 1)|0; //@line 191 "SIDH_v1.0/generic/fp_generic.c"
   $34 = ($30>>>0)<($33>>>0); //@line 191 "SIDH_v1.0/generic/fp_generic.c"
   if ($34) {
    $35 = $5; //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $36 = (($13) + ($35<<2)|0); //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $37 = HEAP32[$36>>2]|0; //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $38 = $4; //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $39 = $5; //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $40 = (($38) - ($39))|0; //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $41 = (2648 + ($40<<2)|0); //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $42 = HEAP32[$41>>2]|0; //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    _digit_x_digit($37,$42,$9); //@line 192 "SIDH_v1.0/generic/fp_generic.c"
    $43 = HEAP32[$9>>2]|0; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $44 = (($43) + 0)|0; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $14 = $44; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $45 = $12; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $46 = $14; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $47 = (($45) + ($46))|0; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $12 = $47; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $48 = $14; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $49 = (_is_digit_lessthan_ct_59($48,0)|0); //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $50 = $12; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $51 = $14; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $52 = (_is_digit_lessthan_ct_59($50,$51)|0); //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $53 = $49 | $52; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $6 = $53; //@line 193 "SIDH_v1.0/generic/fp_generic.c"
    $54 = ((($9)) + 4|0); //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $55 = HEAP32[$54>>2]|0; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $56 = $6; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $57 = (($55) + ($56))|0; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $15 = $57; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $58 = $11; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $59 = $15; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $60 = (($58) + ($59))|0; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $11 = $60; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $61 = $15; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $62 = $6; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $63 = (_is_digit_lessthan_ct_59($61,$62)|0); //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $64 = $11; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $65 = $15; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $66 = (_is_digit_lessthan_ct_59($64,$65)|0); //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $67 = $63 | $66; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $6 = $67; //@line 194 "SIDH_v1.0/generic/fp_generic.c"
    $68 = $6; //@line 195 "SIDH_v1.0/generic/fp_generic.c"
    $69 = $10; //@line 195 "SIDH_v1.0/generic/fp_generic.c"
    $70 = (($69) + ($68))|0; //@line 195 "SIDH_v1.0/generic/fp_generic.c"
    $10 = $70; //@line 195 "SIDH_v1.0/generic/fp_generic.c"
   }
   $71 = $5; //@line 190 "SIDH_v1.0/generic/fp_generic.c"
   $72 = (($71) + 1)|0; //@line 190 "SIDH_v1.0/generic/fp_generic.c"
   $5 = $72; //@line 190 "SIDH_v1.0/generic/fp_generic.c"
  }
  $73 = $12; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $74 = (($73) + 0)|0; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $16 = $74; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $75 = $4; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $76 = $2; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $77 = (($76) + ($75<<2)|0); //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $78 = HEAP32[$77>>2]|0; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $79 = $16; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $80 = (($78) + ($79))|0; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $12 = $80; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $81 = $16; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $82 = (_is_digit_lessthan_ct_59($81,0)|0); //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $83 = $12; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $84 = $16; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $85 = (_is_digit_lessthan_ct_59($83,$84)|0); //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $86 = $82 | $85; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $86; //@line 198 "SIDH_v1.0/generic/fp_generic.c"
  $87 = $11; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $88 = $6; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $89 = (($87) + ($88))|0; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $17 = $89; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $90 = $17; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $91 = (0 + ($90))|0; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $11 = $91; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $92 = $17; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $93 = $6; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $94 = (_is_digit_lessthan_ct_59($92,$93)|0); //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $95 = $11; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $96 = $17; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $97 = (_is_digit_lessthan_ct_59($95,$96)|0); //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $98 = $94 | $97; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $98; //@line 199 "SIDH_v1.0/generic/fp_generic.c"
  $99 = $6; //@line 200 "SIDH_v1.0/generic/fp_generic.c"
  $100 = $10; //@line 200 "SIDH_v1.0/generic/fp_generic.c"
  $101 = (($100) + ($99))|0; //@line 200 "SIDH_v1.0/generic/fp_generic.c"
  $10 = $101; //@line 200 "SIDH_v1.0/generic/fp_generic.c"
  $102 = $12; //@line 201 "SIDH_v1.0/generic/fp_generic.c"
  $103 = $4; //@line 201 "SIDH_v1.0/generic/fp_generic.c"
  $104 = (($13) + ($103<<2)|0); //@line 201 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$104>>2] = $102; //@line 201 "SIDH_v1.0/generic/fp_generic.c"
  $105 = $11; //@line 202 "SIDH_v1.0/generic/fp_generic.c"
  $12 = $105; //@line 202 "SIDH_v1.0/generic/fp_generic.c"
  $106 = $10; //@line 203 "SIDH_v1.0/generic/fp_generic.c"
  $11 = $106; //@line 203 "SIDH_v1.0/generic/fp_generic.c"
  $10 = 0; //@line 204 "SIDH_v1.0/generic/fp_generic.c"
  $107 = $4; //@line 189 "SIDH_v1.0/generic/fp_generic.c"
  $108 = (($107) + 1)|0; //@line 189 "SIDH_v1.0/generic/fp_generic.c"
  $4 = $108; //@line 189 "SIDH_v1.0/generic/fp_generic.c"
 }
 $4 = 24; //@line 207 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $109 = $4; //@line 207 "SIDH_v1.0/generic/fp_generic.c"
  $110 = ($109>>>0)<(47); //@line 207 "SIDH_v1.0/generic/fp_generic.c"
  if (!($110)) {
   break;
  }
  $111 = $7; //@line 208 "SIDH_v1.0/generic/fp_generic.c"
  $112 = ($111>>>0)>(0); //@line 208 "SIDH_v1.0/generic/fp_generic.c"
  if ($112) {
   $113 = $7; //@line 209 "SIDH_v1.0/generic/fp_generic.c"
   $114 = (($113) - 1)|0; //@line 209 "SIDH_v1.0/generic/fp_generic.c"
   $7 = $114; //@line 209 "SIDH_v1.0/generic/fp_generic.c"
  }
  $115 = $4; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
  $116 = (($115) - 24)|0; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
  $117 = (($116) + 1)|0; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
  $5 = $117; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
  while(1) {
   $118 = $5; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
   $119 = ($118>>>0)<(24); //@line 211 "SIDH_v1.0/generic/fp_generic.c"
   if (!($119)) {
    break;
   }
   $120 = $5; //@line 212 "SIDH_v1.0/generic/fp_generic.c"
   $121 = $7; //@line 212 "SIDH_v1.0/generic/fp_generic.c"
   $122 = (24 - ($121))|0; //@line 212 "SIDH_v1.0/generic/fp_generic.c"
   $123 = ($120>>>0)<($122>>>0); //@line 212 "SIDH_v1.0/generic/fp_generic.c"
   if ($123) {
    $124 = $5; //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $125 = (($13) + ($124<<2)|0); //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $126 = HEAP32[$125>>2]|0; //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $127 = $4; //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $128 = $5; //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $129 = (($127) - ($128))|0; //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $130 = (2648 + ($129<<2)|0); //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $131 = HEAP32[$130>>2]|0; //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    _digit_x_digit($126,$131,$9); //@line 213 "SIDH_v1.0/generic/fp_generic.c"
    $132 = HEAP32[$9>>2]|0; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $133 = (($132) + 0)|0; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $18 = $133; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $134 = $12; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $135 = $18; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $136 = (($134) + ($135))|0; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $12 = $136; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $137 = $18; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $138 = (_is_digit_lessthan_ct_59($137,0)|0); //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $139 = $12; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $140 = $18; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $141 = (_is_digit_lessthan_ct_59($139,$140)|0); //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $142 = $138 | $141; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $6 = $142; //@line 214 "SIDH_v1.0/generic/fp_generic.c"
    $143 = ((($9)) + 4|0); //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $144 = HEAP32[$143>>2]|0; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $145 = $6; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $146 = (($144) + ($145))|0; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $19 = $146; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $147 = $11; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $148 = $19; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $149 = (($147) + ($148))|0; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $11 = $149; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $150 = $19; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $151 = $6; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $152 = (_is_digit_lessthan_ct_59($150,$151)|0); //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $153 = $11; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $154 = $19; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $155 = (_is_digit_lessthan_ct_59($153,$154)|0); //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $156 = $152 | $155; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $6 = $156; //@line 215 "SIDH_v1.0/generic/fp_generic.c"
    $157 = $6; //@line 216 "SIDH_v1.0/generic/fp_generic.c"
    $158 = $10; //@line 216 "SIDH_v1.0/generic/fp_generic.c"
    $159 = (($158) + ($157))|0; //@line 216 "SIDH_v1.0/generic/fp_generic.c"
    $10 = $159; //@line 216 "SIDH_v1.0/generic/fp_generic.c"
   }
   $160 = $5; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
   $161 = (($160) + 1)|0; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
   $5 = $161; //@line 211 "SIDH_v1.0/generic/fp_generic.c"
  }
  $162 = $12; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $163 = (($162) + 0)|0; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $20 = $163; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $164 = $4; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $165 = $2; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $166 = (($165) + ($164<<2)|0); //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $167 = HEAP32[$166>>2]|0; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $168 = $20; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $169 = (($167) + ($168))|0; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $12 = $169; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $170 = $20; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $171 = (_is_digit_lessthan_ct_59($170,0)|0); //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $172 = $12; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $173 = $20; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $174 = (_is_digit_lessthan_ct_59($172,$173)|0); //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $175 = $171 | $174; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $175; //@line 219 "SIDH_v1.0/generic/fp_generic.c"
  $176 = $11; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $177 = $6; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $178 = (($176) + ($177))|0; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $21 = $178; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $179 = $21; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $180 = (0 + ($179))|0; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $11 = $180; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $181 = $21; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $182 = $6; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $183 = (_is_digit_lessthan_ct_59($181,$182)|0); //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $184 = $11; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $185 = $21; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $186 = (_is_digit_lessthan_ct_59($184,$185)|0); //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $187 = $183 | $186; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $187; //@line 220 "SIDH_v1.0/generic/fp_generic.c"
  $188 = $6; //@line 221 "SIDH_v1.0/generic/fp_generic.c"
  $189 = $10; //@line 221 "SIDH_v1.0/generic/fp_generic.c"
  $190 = (($189) + ($188))|0; //@line 221 "SIDH_v1.0/generic/fp_generic.c"
  $10 = $190; //@line 221 "SIDH_v1.0/generic/fp_generic.c"
  $191 = $12; //@line 222 "SIDH_v1.0/generic/fp_generic.c"
  $192 = $4; //@line 222 "SIDH_v1.0/generic/fp_generic.c"
  $193 = (($192) - 24)|0; //@line 222 "SIDH_v1.0/generic/fp_generic.c"
  $194 = (($13) + ($193<<2)|0); //@line 222 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$194>>2] = $191; //@line 222 "SIDH_v1.0/generic/fp_generic.c"
  $195 = $11; //@line 223 "SIDH_v1.0/generic/fp_generic.c"
  $12 = $195; //@line 223 "SIDH_v1.0/generic/fp_generic.c"
  $196 = $10; //@line 224 "SIDH_v1.0/generic/fp_generic.c"
  $11 = $196; //@line 224 "SIDH_v1.0/generic/fp_generic.c"
  $10 = 0; //@line 225 "SIDH_v1.0/generic/fp_generic.c"
  $197 = $4; //@line 207 "SIDH_v1.0/generic/fp_generic.c"
  $198 = (($197) + 1)|0; //@line 207 "SIDH_v1.0/generic/fp_generic.c"
  $4 = $198; //@line 207 "SIDH_v1.0/generic/fp_generic.c"
 }
 $199 = $12; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $200 = (($199) + 0)|0; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $22 = $200; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $201 = $2; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $202 = ((($201)) + 188|0); //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $203 = HEAP32[$202>>2]|0; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $204 = $22; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $205 = (($203) + ($204))|0; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $12 = $205; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $206 = $22; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $207 = (_is_digit_lessthan_ct_59($206,0)|0); //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $208 = $12; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $209 = $22; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $210 = (_is_digit_lessthan_ct_59($208,$209)|0); //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $211 = $207 | $210; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $6 = $211; //@line 227 "SIDH_v1.0/generic/fp_generic.c"
 $212 = $11; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $213 = $6; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $214 = (($212) + ($213))|0; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $23 = $214; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $215 = $23; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $216 = (0 + ($215))|0; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $11 = $216; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $217 = $23; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $218 = $6; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $219 = (_is_digit_lessthan_ct_59($217,$218)|0); //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $220 = $11; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $221 = $23; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $222 = (_is_digit_lessthan_ct_59($220,$221)|0); //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $223 = $219 | $222; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $6 = $223; //@line 228 "SIDH_v1.0/generic/fp_generic.c"
 $224 = $6; //@line 229 "SIDH_v1.0/generic/fp_generic.c"
 $225 = $10; //@line 229 "SIDH_v1.0/generic/fp_generic.c"
 $226 = (($225) + ($224))|0; //@line 229 "SIDH_v1.0/generic/fp_generic.c"
 $10 = $226; //@line 229 "SIDH_v1.0/generic/fp_generic.c"
 $227 = $12; //@line 230 "SIDH_v1.0/generic/fp_generic.c"
 $228 = ((($13)) + 92|0); //@line 230 "SIDH_v1.0/generic/fp_generic.c"
 HEAP32[$228>>2] = $227; //@line 230 "SIDH_v1.0/generic/fp_generic.c"
 $229 = $11; //@line 231 "SIDH_v1.0/generic/fp_generic.c"
 $230 = ((($13)) + 96|0); //@line 231 "SIDH_v1.0/generic/fp_generic.c"
 HEAP32[$230>>2] = $229; //@line 231 "SIDH_v1.0/generic/fp_generic.c"
 $231 = $3; //@line 234 "SIDH_v1.0/generic/fp_generic.c"
 $232 = (_mp_sub($13,2456,$231,24)|0); //@line 234 "SIDH_v1.0/generic/fp_generic.c"
 $6 = $232; //@line 234 "SIDH_v1.0/generic/fp_generic.c"
 $233 = $6; //@line 235 "SIDH_v1.0/generic/fp_generic.c"
 $234 = (0 - ($233))|0; //@line 235 "SIDH_v1.0/generic/fp_generic.c"
 $8 = $234; //@line 235 "SIDH_v1.0/generic/fp_generic.c"
 $6 = 0; //@line 237 "SIDH_v1.0/generic/fp_generic.c"
 $4 = 0; //@line 238 "SIDH_v1.0/generic/fp_generic.c"
 while(1) {
  $235 = $4; //@line 238 "SIDH_v1.0/generic/fp_generic.c"
  $236 = ($235>>>0)<(24); //@line 238 "SIDH_v1.0/generic/fp_generic.c"
  if (!($236)) {
   break;
  }
  $237 = $4; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $238 = $3; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $239 = (($238) + ($237<<2)|0); //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $240 = HEAP32[$239>>2]|0; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $241 = $6; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $242 = (($240) + ($241))|0; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $24 = $242; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $243 = $4; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $244 = (2456 + ($243<<2)|0); //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $245 = HEAP32[$244>>2]|0; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $246 = $8; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $247 = $245 & $246; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $248 = $24; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $249 = (($247) + ($248))|0; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $250 = $4; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $251 = $3; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $252 = (($251) + ($250<<2)|0); //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  HEAP32[$252>>2] = $249; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $253 = $24; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $254 = $6; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $255 = (_is_digit_lessthan_ct_59($253,$254)|0); //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $256 = $4; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $257 = $3; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $258 = (($257) + ($256<<2)|0); //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $259 = HEAP32[$258>>2]|0; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $260 = $24; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $261 = (_is_digit_lessthan_ct_59($259,$260)|0); //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $262 = $255 | $261; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $6 = $262; //@line 239 "SIDH_v1.0/generic/fp_generic.c"
  $263 = $4; //@line 238 "SIDH_v1.0/generic/fp_generic.c"
  $264 = (($263) + 1)|0; //@line 238 "SIDH_v1.0/generic/fp_generic.c"
  $4 = $264; //@line 238 "SIDH_v1.0/generic/fp_generic.c"
 }
 STACKTOP = sp;return; //@line 242 "SIDH_v1.0/generic/fp_generic.c"
}
function _KeyGeneration_A($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0;
 var $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0;
 var $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 6624|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(6624|0);
 $9 = sp + 6408|0;
 $10 = sp + 6024|0;
 $11 = sp + 5640|0;
 $12 = sp + 5256|0;
 $13 = sp + 4872|0;
 $14 = sp + 1800|0;
 $20 = sp + 1744|0;
 $22 = sp + 776|0;
 $23 = sp + 584|0;
 $24 = sp + 392|0;
 $25 = sp + 200|0;
 $26 = sp + 8|0;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $28 = $6; //@line 24 "SIDH_v1.0/kex.c"
 $29 = ((($28)) + 16|0); //@line 24 "SIDH_v1.0/kex.c"
 $30 = HEAP32[$29>>2]|0; //@line 24 "SIDH_v1.0/kex.c"
 $31 = (($30) + 32)|0; //@line 24 "SIDH_v1.0/kex.c"
 $32 = (($31) - 1)|0; //@line 24 "SIDH_v1.0/kex.c"
 $33 = (($32>>>0) / 32)&-1; //@line 24 "SIDH_v1.0/kex.c"
 $7 = $33; //@line 24 "SIDH_v1.0/kex.c"
 $34 = $6; //@line 24 "SIDH_v1.0/kex.c"
 $35 = ((($34)) + 12|0); //@line 24 "SIDH_v1.0/kex.c"
 $36 = HEAP32[$35>>2]|0; //@line 24 "SIDH_v1.0/kex.c"
 $37 = (($36) + 32)|0; //@line 24 "SIDH_v1.0/kex.c"
 $38 = (($37) - 1)|0; //@line 24 "SIDH_v1.0/kex.c"
 $39 = (($38>>>0) / 32)&-1; //@line 24 "SIDH_v1.0/kex.c"
 $8 = $39; //@line 24 "SIDH_v1.0/kex.c"
 _memset(($11|0),0,384)|0; //@line 26 "SIDH_v1.0/kex.c"
 _memset(($12|0),0,384)|0; //@line 26 "SIDH_v1.0/kex.c"
 _memset(($13|0),0,384)|0; //@line 26 "SIDH_v1.0/kex.c"
 $40 = $5; //@line 27 "SIDH_v1.0/kex.c"
 $15 = $40; //@line 27 "SIDH_v1.0/kex.c"
 $19 = 0; //@line 28 "SIDH_v1.0/kex.c"
 $21 = 0; //@line 28 "SIDH_v1.0/kex.c"
 _memset(($23|0),0,192)|0; //@line 29 "SIDH_v1.0/kex.c"
 _memset(($24|0),0,192)|0; //@line 29 "SIDH_v1.0/kex.c"
 $27 = 3; //@line 30 "SIDH_v1.0/kex.c"
 $41 = $4; //@line 32 "SIDH_v1.0/kex.c"
 $42 = ($41|0)==(0|0); //@line 32 "SIDH_v1.0/kex.c"
 $43 = $5; //@line 32 "SIDH_v1.0/kex.c"
 $44 = ($43|0)==(0|0); //@line 32 "SIDH_v1.0/kex.c"
 $or$cond = $42 | $44; //@line 32 "SIDH_v1.0/kex.c"
 if (!($or$cond)) {
  $45 = $6; //@line 32 "SIDH_v1.0/kex.c"
  $46 = (_is_CurveIsogenyStruct_null($45)|0); //@line 32 "SIDH_v1.0/kex.c"
  if (!($46)) {
   $47 = $4; //@line 37 "SIDH_v1.0/kex.c"
   $48 = $6; //@line 37 "SIDH_v1.0/kex.c"
   $49 = (_random_mod_order($47,0,$48)|0); //@line 37 "SIDH_v1.0/kex.c"
   $27 = $49; //@line 37 "SIDH_v1.0/kex.c"
   $50 = $27; //@line 38 "SIDH_v1.0/kex.c"
   $51 = ($50|0)!=(0); //@line 38 "SIDH_v1.0/kex.c"
   if ($51) {
    $52 = $4; //@line 39 "SIDH_v1.0/kex.c"
    $53 = $7; //@line 39 "SIDH_v1.0/kex.c"
    _clear_words($52,$53); //@line 39 "SIDH_v1.0/kex.c"
    $54 = $27; //@line 40 "SIDH_v1.0/kex.c"
    $3 = $54; //@line 40 "SIDH_v1.0/kex.c"
    $176 = $3; //@line 123 "SIDH_v1.0/kex.c"
    STACKTOP = sp;return ($176|0); //@line 123 "SIDH_v1.0/kex.c"
   }
   $55 = $6; //@line 43 "SIDH_v1.0/kex.c"
   $56 = ((($55)) + 56|0); //@line 43 "SIDH_v1.0/kex.c"
   $57 = HEAP32[$56>>2]|0; //@line 43 "SIDH_v1.0/kex.c"
   _to_mont($57,$9); //@line 43 "SIDH_v1.0/kex.c"
   $58 = $6; //@line 44 "SIDH_v1.0/kex.c"
   $59 = ((($58)) + 56|0); //@line 44 "SIDH_v1.0/kex.c"
   $60 = HEAP32[$59>>2]|0; //@line 44 "SIDH_v1.0/kex.c"
   $61 = ((($60)) + 96|0); //@line 44 "SIDH_v1.0/kex.c"
   $62 = ((($9)) + 96|0); //@line 44 "SIDH_v1.0/kex.c"
   _to_mont($61,$62); //@line 44 "SIDH_v1.0/kex.c"
   $63 = $4; //@line 46 "SIDH_v1.0/kex.c"
   $64 = $6; //@line 46 "SIDH_v1.0/kex.c"
   $65 = (_secret_pt($9,$63,0,$10,$64)|0); //@line 46 "SIDH_v1.0/kex.c"
   $27 = $65; //@line 46 "SIDH_v1.0/kex.c"
   $66 = $27; //@line 47 "SIDH_v1.0/kex.c"
   $67 = ($66|0)!=(0); //@line 47 "SIDH_v1.0/kex.c"
   if ($67) {
    $68 = $4; //@line 48 "SIDH_v1.0/kex.c"
    $69 = $7; //@line 48 "SIDH_v1.0/kex.c"
    _clear_words($68,$69); //@line 48 "SIDH_v1.0/kex.c"
    $70 = $27; //@line 49 "SIDH_v1.0/kex.c"
    $3 = $70; //@line 49 "SIDH_v1.0/kex.c"
    $176 = $3; //@line 123 "SIDH_v1.0/kex.c"
    STACKTOP = sp;return ($176|0); //@line 123 "SIDH_v1.0/kex.c"
   }
   $71 = $6; //@line 52 "SIDH_v1.0/kex.c"
   $72 = ((($71)) + 60|0); //@line 52 "SIDH_v1.0/kex.c"
   $73 = HEAP32[$72>>2]|0; //@line 52 "SIDH_v1.0/kex.c"
   $74 = $8; //@line 52 "SIDH_v1.0/kex.c"
   _copy_words($73,$11,$74); //@line 52 "SIDH_v1.0/kex.c"
   $75 = $6; //@line 53 "SIDH_v1.0/kex.c"
   $76 = ((($75)) + 80|0); //@line 53 "SIDH_v1.0/kex.c"
   $77 = HEAP32[$76>>2]|0; //@line 53 "SIDH_v1.0/kex.c"
   $78 = ((($11)) + 192|0); //@line 53 "SIDH_v1.0/kex.c"
   _fpcopy751($77,$78); //@line 53 "SIDH_v1.0/kex.c"
   _to_mont($11,$11); //@line 54 "SIDH_v1.0/kex.c"
   $79 = $8; //@line 55 "SIDH_v1.0/kex.c"
   _copy_words($11,$12,$79); //@line 55 "SIDH_v1.0/kex.c"
   _fpneg751($12); //@line 56 "SIDH_v1.0/kex.c"
   $80 = $6; //@line 57 "SIDH_v1.0/kex.c"
   $81 = ((($80)) + 80|0); //@line 57 "SIDH_v1.0/kex.c"
   $82 = HEAP32[$81>>2]|0; //@line 57 "SIDH_v1.0/kex.c"
   $83 = ((($12)) + 192|0); //@line 57 "SIDH_v1.0/kex.c"
   _fpcopy751($82,$83); //@line 57 "SIDH_v1.0/kex.c"
   $84 = $6; //@line 58 "SIDH_v1.0/kex.c"
   _distort_and_diff($11,$13,$84); //@line 58 "SIDH_v1.0/kex.c"
   $85 = $6; //@line 60 "SIDH_v1.0/kex.c"
   $86 = ((($85)) + 28|0); //@line 60 "SIDH_v1.0/kex.c"
   $87 = HEAP32[$86>>2]|0; //@line 60 "SIDH_v1.0/kex.c"
   _fpcopy751($87,$23); //@line 60 "SIDH_v1.0/kex.c"
   $88 = $6; //@line 61 "SIDH_v1.0/kex.c"
   $89 = ((($88)) + 32|0); //@line 61 "SIDH_v1.0/kex.c"
   $90 = HEAP32[$89>>2]|0; //@line 61 "SIDH_v1.0/kex.c"
   _fpcopy751($90,$24); //@line 61 "SIDH_v1.0/kex.c"
   _to_mont($23,$23); //@line 62 "SIDH_v1.0/kex.c"
   _to_mont($24,$24); //@line 63 "SIDH_v1.0/kex.c"
   $91 = $6; //@line 65 "SIDH_v1.0/kex.c"
   _first_4_isog($11,$23,$25,$26,$91); //@line 65 "SIDH_v1.0/kex.c"
   $92 = $6; //@line 66 "SIDH_v1.0/kex.c"
   _first_4_isog($12,$23,$25,$26,$92); //@line 66 "SIDH_v1.0/kex.c"
   $93 = $6; //@line 67 "SIDH_v1.0/kex.c"
   _first_4_isog($13,$23,$25,$26,$93); //@line 67 "SIDH_v1.0/kex.c"
   $94 = $6; //@line 68 "SIDH_v1.0/kex.c"
   _first_4_isog($10,$23,$23,$24,$94); //@line 68 "SIDH_v1.0/kex.c"
   $19 = 0; //@line 70 "SIDH_v1.0/kex.c"
   $17 = 1; //@line 71 "SIDH_v1.0/kex.c"
   while(1) {
    $95 = $17; //@line 71 "SIDH_v1.0/kex.c"
    $96 = ($95>>>0)<(185); //@line 71 "SIDH_v1.0/kex.c"
    if (!($96)) {
     break;
    }
    while(1) {
     $97 = $19; //@line 72 "SIDH_v1.0/kex.c"
     $98 = $17; //@line 72 "SIDH_v1.0/kex.c"
     $99 = (185 - ($98))|0; //@line 72 "SIDH_v1.0/kex.c"
     $100 = ($97>>>0)<($99>>>0); //@line 72 "SIDH_v1.0/kex.c"
     if (!($100)) {
      break;
     }
     $101 = $21; //@line 73 "SIDH_v1.0/kex.c"
     $102 = (($14) + (($101*384)|0)|0); //@line 73 "SIDH_v1.0/kex.c"
     _fp2copy751($10,$102); //@line 73 "SIDH_v1.0/kex.c"
     $103 = ((($10)) + 192|0); //@line 74 "SIDH_v1.0/kex.c"
     $104 = $21; //@line 74 "SIDH_v1.0/kex.c"
     $105 = (($14) + (($104*384)|0)|0); //@line 74 "SIDH_v1.0/kex.c"
     $106 = ((($105)) + 192|0); //@line 74 "SIDH_v1.0/kex.c"
     _fp2copy751($103,$106); //@line 74 "SIDH_v1.0/kex.c"
     $107 = $19; //@line 75 "SIDH_v1.0/kex.c"
     $108 = $21; //@line 75 "SIDH_v1.0/kex.c"
     $109 = (($20) + ($108<<2)|0); //@line 75 "SIDH_v1.0/kex.c"
     HEAP32[$109>>2] = $107; //@line 75 "SIDH_v1.0/kex.c"
     $110 = $21; //@line 76 "SIDH_v1.0/kex.c"
     $111 = (($110) + 1)|0; //@line 76 "SIDH_v1.0/kex.c"
     $21 = $111; //@line 76 "SIDH_v1.0/kex.c"
     $112 = $19; //@line 77 "SIDH_v1.0/kex.c"
     $113 = (185 - ($112))|0; //@line 77 "SIDH_v1.0/kex.c"
     $114 = $17; //@line 77 "SIDH_v1.0/kex.c"
     $115 = (($113) - ($114))|0; //@line 77 "SIDH_v1.0/kex.c"
     $116 = (3032 + ($115<<2)|0); //@line 77 "SIDH_v1.0/kex.c"
     $117 = HEAP32[$116>>2]|0; //@line 77 "SIDH_v1.0/kex.c"
     $18 = $117; //@line 77 "SIDH_v1.0/kex.c"
     $118 = $18; //@line 78 "SIDH_v1.0/kex.c"
     $119 = $118<<1; //@line 78 "SIDH_v1.0/kex.c"
     _xDBLe($10,$10,$23,$24,$119); //@line 78 "SIDH_v1.0/kex.c"
     $120 = $18; //@line 79 "SIDH_v1.0/kex.c"
     $121 = $19; //@line 79 "SIDH_v1.0/kex.c"
     $122 = (($121) + ($120))|0; //@line 79 "SIDH_v1.0/kex.c"
     $19 = $122; //@line 79 "SIDH_v1.0/kex.c"
    }
    _get_4_isog($10,$23,$24,$22); //@line 81 "SIDH_v1.0/kex.c"
    $16 = 0; //@line 83 "SIDH_v1.0/kex.c"
    while(1) {
     $123 = $16; //@line 83 "SIDH_v1.0/kex.c"
     $124 = $21; //@line 83 "SIDH_v1.0/kex.c"
     $125 = ($123>>>0)<($124>>>0); //@line 83 "SIDH_v1.0/kex.c"
     if (!($125)) {
      break;
     }
     $126 = $16; //@line 84 "SIDH_v1.0/kex.c"
     $127 = (($14) + (($126*384)|0)|0); //@line 84 "SIDH_v1.0/kex.c"
     _eval_4_isog($127,$22); //@line 84 "SIDH_v1.0/kex.c"
     $128 = $16; //@line 83 "SIDH_v1.0/kex.c"
     $129 = (($128) + 1)|0; //@line 83 "SIDH_v1.0/kex.c"
     $16 = $129; //@line 83 "SIDH_v1.0/kex.c"
    }
    _eval_4_isog($11,$22); //@line 86 "SIDH_v1.0/kex.c"
    _eval_4_isog($12,$22); //@line 87 "SIDH_v1.0/kex.c"
    _eval_4_isog($13,$22); //@line 88 "SIDH_v1.0/kex.c"
    $130 = $21; //@line 90 "SIDH_v1.0/kex.c"
    $131 = (($130) - 1)|0; //@line 90 "SIDH_v1.0/kex.c"
    $132 = (($14) + (($131*384)|0)|0); //@line 90 "SIDH_v1.0/kex.c"
    _fp2copy751($132,$10); //@line 90 "SIDH_v1.0/kex.c"
    $133 = $21; //@line 91 "SIDH_v1.0/kex.c"
    $134 = (($133) - 1)|0; //@line 91 "SIDH_v1.0/kex.c"
    $135 = (($14) + (($134*384)|0)|0); //@line 91 "SIDH_v1.0/kex.c"
    $136 = ((($135)) + 192|0); //@line 91 "SIDH_v1.0/kex.c"
    $137 = ((($10)) + 192|0); //@line 91 "SIDH_v1.0/kex.c"
    _fp2copy751($136,$137); //@line 91 "SIDH_v1.0/kex.c"
    $138 = $21; //@line 92 "SIDH_v1.0/kex.c"
    $139 = (($138) - 1)|0; //@line 92 "SIDH_v1.0/kex.c"
    $140 = (($20) + ($139<<2)|0); //@line 92 "SIDH_v1.0/kex.c"
    $141 = HEAP32[$140>>2]|0; //@line 92 "SIDH_v1.0/kex.c"
    $19 = $141; //@line 92 "SIDH_v1.0/kex.c"
    $142 = $21; //@line 93 "SIDH_v1.0/kex.c"
    $143 = (($142) - 1)|0; //@line 93 "SIDH_v1.0/kex.c"
    $21 = $143; //@line 93 "SIDH_v1.0/kex.c"
    $144 = $17; //@line 71 "SIDH_v1.0/kex.c"
    $145 = (($144) + 1)|0; //@line 71 "SIDH_v1.0/kex.c"
    $17 = $145; //@line 71 "SIDH_v1.0/kex.c"
   }
   _get_4_isog($10,$23,$24,$22); //@line 96 "SIDH_v1.0/kex.c"
   _eval_4_isog($11,$22); //@line 97 "SIDH_v1.0/kex.c"
   _eval_4_isog($12,$22); //@line 98 "SIDH_v1.0/kex.c"
   _eval_4_isog($13,$22); //@line 99 "SIDH_v1.0/kex.c"
   $146 = ((($11)) + 192|0); //@line 101 "SIDH_v1.0/kex.c"
   $147 = ((($12)) + 192|0); //@line 101 "SIDH_v1.0/kex.c"
   $148 = ((($13)) + 192|0); //@line 101 "SIDH_v1.0/kex.c"
   _inv_4_way($24,$146,$147,$148); //@line 101 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($23,$24,$23); //@line 102 "SIDH_v1.0/kex.c"
   $149 = ((($11)) + 192|0); //@line 103 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($11,$149,$11); //@line 103 "SIDH_v1.0/kex.c"
   $150 = ((($12)) + 192|0); //@line 104 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($12,$150,$12); //@line 104 "SIDH_v1.0/kex.c"
   $151 = ((($13)) + 192|0); //@line 105 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($13,$151,$13); //@line 105 "SIDH_v1.0/kex.c"
   $152 = $15; //@line 107 "SIDH_v1.0/kex.c"
   _from_fp2mont($23,$152); //@line 107 "SIDH_v1.0/kex.c"
   $153 = $15; //@line 108 "SIDH_v1.0/kex.c"
   $154 = ((($153)) + 192|0); //@line 108 "SIDH_v1.0/kex.c"
   _from_fp2mont($11,$154); //@line 108 "SIDH_v1.0/kex.c"
   $155 = $15; //@line 109 "SIDH_v1.0/kex.c"
   $156 = ((($155)) + 384|0); //@line 109 "SIDH_v1.0/kex.c"
   _from_fp2mont($12,$156); //@line 109 "SIDH_v1.0/kex.c"
   $157 = $15; //@line 110 "SIDH_v1.0/kex.c"
   $158 = ((($157)) + 576|0); //@line 110 "SIDH_v1.0/kex.c"
   _from_fp2mont($13,$158); //@line 110 "SIDH_v1.0/kex.c"
   $159 = $8; //@line 113 "SIDH_v1.0/kex.c"
   $160 = $159<<2; //@line 113 "SIDH_v1.0/kex.c"
   _clear_words($10,$160); //@line 113 "SIDH_v1.0/kex.c"
   $161 = $8; //@line 114 "SIDH_v1.0/kex.c"
   $162 = $161<<2; //@line 114 "SIDH_v1.0/kex.c"
   _clear_words($11,$162); //@line 114 "SIDH_v1.0/kex.c"
   $163 = $8; //@line 115 "SIDH_v1.0/kex.c"
   $164 = $163<<2; //@line 115 "SIDH_v1.0/kex.c"
   _clear_words($12,$164); //@line 115 "SIDH_v1.0/kex.c"
   $165 = $8; //@line 116 "SIDH_v1.0/kex.c"
   $166 = $165<<2; //@line 116 "SIDH_v1.0/kex.c"
   _clear_words($13,$166); //@line 116 "SIDH_v1.0/kex.c"
   $167 = $8; //@line 117 "SIDH_v1.0/kex.c"
   $168 = $167<<5; //@line 117 "SIDH_v1.0/kex.c"
   _clear_words($14,$168); //@line 117 "SIDH_v1.0/kex.c"
   $169 = $8; //@line 118 "SIDH_v1.0/kex.c"
   $170 = $169<<1; //@line 118 "SIDH_v1.0/kex.c"
   _clear_words($23,$170); //@line 118 "SIDH_v1.0/kex.c"
   $171 = $8; //@line 119 "SIDH_v1.0/kex.c"
   $172 = $171<<1; //@line 119 "SIDH_v1.0/kex.c"
   _clear_words($24,$172); //@line 119 "SIDH_v1.0/kex.c"
   $173 = $8; //@line 120 "SIDH_v1.0/kex.c"
   $174 = ($173*10)|0; //@line 120 "SIDH_v1.0/kex.c"
   _clear_words($22,$174); //@line 120 "SIDH_v1.0/kex.c"
   $175 = $27; //@line 122 "SIDH_v1.0/kex.c"
   $3 = $175; //@line 122 "SIDH_v1.0/kex.c"
   $176 = $3; //@line 123 "SIDH_v1.0/kex.c"
   STACKTOP = sp;return ($176|0); //@line 123 "SIDH_v1.0/kex.c"
  }
 }
 $3 = 6; //@line 33 "SIDH_v1.0/kex.c"
 $176 = $3; //@line 123 "SIDH_v1.0/kex.c"
 STACKTOP = sp;return ($176|0); //@line 123 "SIDH_v1.0/kex.c"
}
function _KeyGeneration_B($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0;
 var $96 = 0, $97 = 0, $98 = 0, $99 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 6064|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(6064|0);
 $9 = sp + 5840|0;
 $10 = sp + 5456|0;
 $11 = sp + 5072|0;
 $12 = sp + 4688|0;
 $13 = sp + 4304|0;
 $14 = sp + 464|0;
 $20 = sp + 400|0;
 $22 = sp + 200|0;
 $23 = sp + 8|0;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $25 = $6; //@line 132 "SIDH_v1.0/kex.c"
 $26 = ((($25)) + 16|0); //@line 132 "SIDH_v1.0/kex.c"
 $27 = HEAP32[$26>>2]|0; //@line 132 "SIDH_v1.0/kex.c"
 $28 = (($27) + 32)|0; //@line 132 "SIDH_v1.0/kex.c"
 $29 = (($28) - 1)|0; //@line 132 "SIDH_v1.0/kex.c"
 $30 = (($29>>>0) / 32)&-1; //@line 132 "SIDH_v1.0/kex.c"
 $7 = $30; //@line 132 "SIDH_v1.0/kex.c"
 $31 = $6; //@line 132 "SIDH_v1.0/kex.c"
 $32 = ((($31)) + 12|0); //@line 132 "SIDH_v1.0/kex.c"
 $33 = HEAP32[$32>>2]|0; //@line 132 "SIDH_v1.0/kex.c"
 $34 = (($33) + 32)|0; //@line 132 "SIDH_v1.0/kex.c"
 $35 = (($34) - 1)|0; //@line 132 "SIDH_v1.0/kex.c"
 $36 = (($35>>>0) / 32)&-1; //@line 132 "SIDH_v1.0/kex.c"
 $8 = $36; //@line 132 "SIDH_v1.0/kex.c"
 _memset(($11|0),0,384)|0; //@line 134 "SIDH_v1.0/kex.c"
 _memset(($12|0),0,384)|0; //@line 134 "SIDH_v1.0/kex.c"
 _memset(($13|0),0,384)|0; //@line 134 "SIDH_v1.0/kex.c"
 $37 = $5; //@line 135 "SIDH_v1.0/kex.c"
 $15 = $37; //@line 135 "SIDH_v1.0/kex.c"
 $19 = 0; //@line 136 "SIDH_v1.0/kex.c"
 $21 = 0; //@line 136 "SIDH_v1.0/kex.c"
 _memset(($22|0),0,192)|0; //@line 137 "SIDH_v1.0/kex.c"
 _memset(($23|0),0,192)|0; //@line 137 "SIDH_v1.0/kex.c"
 $24 = 3; //@line 138 "SIDH_v1.0/kex.c"
 $38 = $4; //@line 140 "SIDH_v1.0/kex.c"
 $39 = ($38|0)==(0|0); //@line 140 "SIDH_v1.0/kex.c"
 $40 = $5; //@line 140 "SIDH_v1.0/kex.c"
 $41 = ($40|0)==(0|0); //@line 140 "SIDH_v1.0/kex.c"
 $or$cond = $39 | $41; //@line 140 "SIDH_v1.0/kex.c"
 if (!($or$cond)) {
  $42 = $6; //@line 140 "SIDH_v1.0/kex.c"
  $43 = (_is_CurveIsogenyStruct_null($42)|0); //@line 140 "SIDH_v1.0/kex.c"
  if (!($43)) {
   $44 = $4; //@line 145 "SIDH_v1.0/kex.c"
   $45 = $6; //@line 145 "SIDH_v1.0/kex.c"
   $46 = (_random_mod_order($44,1,$45)|0); //@line 145 "SIDH_v1.0/kex.c"
   $24 = $46; //@line 145 "SIDH_v1.0/kex.c"
   $47 = $24; //@line 146 "SIDH_v1.0/kex.c"
   $48 = ($47|0)!=(0); //@line 146 "SIDH_v1.0/kex.c"
   if ($48) {
    $49 = $4; //@line 147 "SIDH_v1.0/kex.c"
    $50 = $7; //@line 147 "SIDH_v1.0/kex.c"
    _clear_words($49,$50); //@line 147 "SIDH_v1.0/kex.c"
    $51 = $24; //@line 148 "SIDH_v1.0/kex.c"
    $3 = $51; //@line 148 "SIDH_v1.0/kex.c"
    $166 = $3; //@line 225 "SIDH_v1.0/kex.c"
    STACKTOP = sp;return ($166|0); //@line 225 "SIDH_v1.0/kex.c"
   }
   $52 = $6; //@line 151 "SIDH_v1.0/kex.c"
   $53 = ((($52)) + 60|0); //@line 151 "SIDH_v1.0/kex.c"
   $54 = HEAP32[$53>>2]|0; //@line 151 "SIDH_v1.0/kex.c"
   _to_mont($54,$9); //@line 151 "SIDH_v1.0/kex.c"
   $55 = $6; //@line 152 "SIDH_v1.0/kex.c"
   $56 = ((($55)) + 60|0); //@line 152 "SIDH_v1.0/kex.c"
   $57 = HEAP32[$56>>2]|0; //@line 152 "SIDH_v1.0/kex.c"
   $58 = ((($57)) + 96|0); //@line 152 "SIDH_v1.0/kex.c"
   $59 = ((($9)) + 96|0); //@line 152 "SIDH_v1.0/kex.c"
   _to_mont($58,$59); //@line 152 "SIDH_v1.0/kex.c"
   $60 = $4; //@line 154 "SIDH_v1.0/kex.c"
   $61 = $6; //@line 154 "SIDH_v1.0/kex.c"
   $62 = (_secret_pt($9,$60,1,$10,$61)|0); //@line 154 "SIDH_v1.0/kex.c"
   $24 = $62; //@line 154 "SIDH_v1.0/kex.c"
   $63 = $24; //@line 155 "SIDH_v1.0/kex.c"
   $64 = ($63|0)!=(0); //@line 155 "SIDH_v1.0/kex.c"
   if ($64) {
    $65 = $4; //@line 156 "SIDH_v1.0/kex.c"
    $66 = $7; //@line 156 "SIDH_v1.0/kex.c"
    _clear_words($65,$66); //@line 156 "SIDH_v1.0/kex.c"
    $67 = $24; //@line 157 "SIDH_v1.0/kex.c"
    $3 = $67; //@line 157 "SIDH_v1.0/kex.c"
    $166 = $3; //@line 225 "SIDH_v1.0/kex.c"
    STACKTOP = sp;return ($166|0); //@line 225 "SIDH_v1.0/kex.c"
   }
   $68 = $6; //@line 160 "SIDH_v1.0/kex.c"
   $69 = ((($68)) + 56|0); //@line 160 "SIDH_v1.0/kex.c"
   $70 = HEAP32[$69>>2]|0; //@line 160 "SIDH_v1.0/kex.c"
   $71 = $8; //@line 160 "SIDH_v1.0/kex.c"
   _copy_words($70,$11,$71); //@line 160 "SIDH_v1.0/kex.c"
   $72 = $6; //@line 161 "SIDH_v1.0/kex.c"
   $73 = ((($72)) + 80|0); //@line 161 "SIDH_v1.0/kex.c"
   $74 = HEAP32[$73>>2]|0; //@line 161 "SIDH_v1.0/kex.c"
   $75 = ((($11)) + 192|0); //@line 161 "SIDH_v1.0/kex.c"
   _fpcopy751($74,$75); //@line 161 "SIDH_v1.0/kex.c"
   _to_mont($11,$11); //@line 162 "SIDH_v1.0/kex.c"
   $76 = $8; //@line 163 "SIDH_v1.0/kex.c"
   _copy_words($11,$12,$76); //@line 163 "SIDH_v1.0/kex.c"
   _fpneg751($12); //@line 164 "SIDH_v1.0/kex.c"
   $77 = $6; //@line 165 "SIDH_v1.0/kex.c"
   $78 = ((($77)) + 80|0); //@line 165 "SIDH_v1.0/kex.c"
   $79 = HEAP32[$78>>2]|0; //@line 165 "SIDH_v1.0/kex.c"
   $80 = ((($12)) + 192|0); //@line 165 "SIDH_v1.0/kex.c"
   _fpcopy751($79,$80); //@line 165 "SIDH_v1.0/kex.c"
   $81 = $6; //@line 166 "SIDH_v1.0/kex.c"
   _distort_and_diff($11,$13,$81); //@line 166 "SIDH_v1.0/kex.c"
   $82 = $6; //@line 168 "SIDH_v1.0/kex.c"
   $83 = ((($82)) + 28|0); //@line 168 "SIDH_v1.0/kex.c"
   $84 = HEAP32[$83>>2]|0; //@line 168 "SIDH_v1.0/kex.c"
   _fpcopy751($84,$22); //@line 168 "SIDH_v1.0/kex.c"
   $85 = $6; //@line 169 "SIDH_v1.0/kex.c"
   $86 = ((($85)) + 32|0); //@line 169 "SIDH_v1.0/kex.c"
   $87 = HEAP32[$86>>2]|0; //@line 169 "SIDH_v1.0/kex.c"
   _fpcopy751($87,$23); //@line 169 "SIDH_v1.0/kex.c"
   _to_mont($22,$22); //@line 170 "SIDH_v1.0/kex.c"
   _to_mont($23,$23); //@line 171 "SIDH_v1.0/kex.c"
   $19 = 0; //@line 173 "SIDH_v1.0/kex.c"
   $17 = 1; //@line 174 "SIDH_v1.0/kex.c"
   while(1) {
    $88 = $17; //@line 174 "SIDH_v1.0/kex.c"
    $89 = ($88>>>0)<(239); //@line 174 "SIDH_v1.0/kex.c"
    if (!($89)) {
     break;
    }
    while(1) {
     $90 = $19; //@line 175 "SIDH_v1.0/kex.c"
     $91 = $17; //@line 175 "SIDH_v1.0/kex.c"
     $92 = (239 - ($91))|0; //@line 175 "SIDH_v1.0/kex.c"
     $93 = ($90>>>0)<($92>>>0); //@line 175 "SIDH_v1.0/kex.c"
     if (!($93)) {
      break;
     }
     $94 = $21; //@line 176 "SIDH_v1.0/kex.c"
     $95 = (($14) + (($94*384)|0)|0); //@line 176 "SIDH_v1.0/kex.c"
     _fp2copy751($10,$95); //@line 176 "SIDH_v1.0/kex.c"
     $96 = ((($10)) + 192|0); //@line 177 "SIDH_v1.0/kex.c"
     $97 = $21; //@line 177 "SIDH_v1.0/kex.c"
     $98 = (($14) + (($97*384)|0)|0); //@line 177 "SIDH_v1.0/kex.c"
     $99 = ((($98)) + 192|0); //@line 177 "SIDH_v1.0/kex.c"
     _fp2copy751($96,$99); //@line 177 "SIDH_v1.0/kex.c"
     $100 = $19; //@line 178 "SIDH_v1.0/kex.c"
     $101 = $21; //@line 178 "SIDH_v1.0/kex.c"
     $102 = (($20) + ($101<<2)|0); //@line 178 "SIDH_v1.0/kex.c"
     HEAP32[$102>>2] = $100; //@line 178 "SIDH_v1.0/kex.c"
     $103 = $21; //@line 179 "SIDH_v1.0/kex.c"
     $104 = (($103) + 1)|0; //@line 179 "SIDH_v1.0/kex.c"
     $21 = $104; //@line 179 "SIDH_v1.0/kex.c"
     $105 = $19; //@line 180 "SIDH_v1.0/kex.c"
     $106 = (239 - ($105))|0; //@line 180 "SIDH_v1.0/kex.c"
     $107 = $17; //@line 180 "SIDH_v1.0/kex.c"
     $108 = (($106) - ($107))|0; //@line 180 "SIDH_v1.0/kex.c"
     $109 = (3772 + ($108<<2)|0); //@line 180 "SIDH_v1.0/kex.c"
     $110 = HEAP32[$109>>2]|0; //@line 180 "SIDH_v1.0/kex.c"
     $18 = $110; //@line 180 "SIDH_v1.0/kex.c"
     $111 = $18; //@line 181 "SIDH_v1.0/kex.c"
     _xTPLe($10,$10,$22,$23,$111); //@line 181 "SIDH_v1.0/kex.c"
     $112 = $18; //@line 182 "SIDH_v1.0/kex.c"
     $113 = $19; //@line 182 "SIDH_v1.0/kex.c"
     $114 = (($113) + ($112))|0; //@line 182 "SIDH_v1.0/kex.c"
     $19 = $114; //@line 182 "SIDH_v1.0/kex.c"
    }
    _get_3_isog($10,$22,$23); //@line 184 "SIDH_v1.0/kex.c"
    $16 = 0; //@line 186 "SIDH_v1.0/kex.c"
    while(1) {
     $115 = $16; //@line 186 "SIDH_v1.0/kex.c"
     $116 = $21; //@line 186 "SIDH_v1.0/kex.c"
     $117 = ($115>>>0)<($116>>>0); //@line 186 "SIDH_v1.0/kex.c"
     if (!($117)) {
      break;
     }
     $118 = $16; //@line 187 "SIDH_v1.0/kex.c"
     $119 = (($14) + (($118*384)|0)|0); //@line 187 "SIDH_v1.0/kex.c"
     _eval_3_isog($10,$119); //@line 187 "SIDH_v1.0/kex.c"
     $120 = $16; //@line 186 "SIDH_v1.0/kex.c"
     $121 = (($120) + 1)|0; //@line 186 "SIDH_v1.0/kex.c"
     $16 = $121; //@line 186 "SIDH_v1.0/kex.c"
    }
    _eval_3_isog($10,$11); //@line 189 "SIDH_v1.0/kex.c"
    _eval_3_isog($10,$12); //@line 190 "SIDH_v1.0/kex.c"
    _eval_3_isog($10,$13); //@line 191 "SIDH_v1.0/kex.c"
    $122 = $21; //@line 193 "SIDH_v1.0/kex.c"
    $123 = (($122) - 1)|0; //@line 193 "SIDH_v1.0/kex.c"
    $124 = (($14) + (($123*384)|0)|0); //@line 193 "SIDH_v1.0/kex.c"
    _fp2copy751($124,$10); //@line 193 "SIDH_v1.0/kex.c"
    $125 = $21; //@line 194 "SIDH_v1.0/kex.c"
    $126 = (($125) - 1)|0; //@line 194 "SIDH_v1.0/kex.c"
    $127 = (($14) + (($126*384)|0)|0); //@line 194 "SIDH_v1.0/kex.c"
    $128 = ((($127)) + 192|0); //@line 194 "SIDH_v1.0/kex.c"
    $129 = ((($10)) + 192|0); //@line 194 "SIDH_v1.0/kex.c"
    _fp2copy751($128,$129); //@line 194 "SIDH_v1.0/kex.c"
    $130 = $21; //@line 195 "SIDH_v1.0/kex.c"
    $131 = (($130) - 1)|0; //@line 195 "SIDH_v1.0/kex.c"
    $132 = (($20) + ($131<<2)|0); //@line 195 "SIDH_v1.0/kex.c"
    $133 = HEAP32[$132>>2]|0; //@line 195 "SIDH_v1.0/kex.c"
    $19 = $133; //@line 195 "SIDH_v1.0/kex.c"
    $134 = $21; //@line 196 "SIDH_v1.0/kex.c"
    $135 = (($134) - 1)|0; //@line 196 "SIDH_v1.0/kex.c"
    $21 = $135; //@line 196 "SIDH_v1.0/kex.c"
    $136 = $17; //@line 174 "SIDH_v1.0/kex.c"
    $137 = (($136) + 1)|0; //@line 174 "SIDH_v1.0/kex.c"
    $17 = $137; //@line 174 "SIDH_v1.0/kex.c"
   }
   _get_3_isog($10,$22,$23); //@line 199 "SIDH_v1.0/kex.c"
   _eval_3_isog($10,$11); //@line 200 "SIDH_v1.0/kex.c"
   _eval_3_isog($10,$12); //@line 201 "SIDH_v1.0/kex.c"
   _eval_3_isog($10,$13); //@line 202 "SIDH_v1.0/kex.c"
   $138 = ((($11)) + 192|0); //@line 204 "SIDH_v1.0/kex.c"
   $139 = ((($12)) + 192|0); //@line 204 "SIDH_v1.0/kex.c"
   $140 = ((($13)) + 192|0); //@line 204 "SIDH_v1.0/kex.c"
   _inv_4_way($23,$138,$139,$140); //@line 204 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($22,$23,$22); //@line 205 "SIDH_v1.0/kex.c"
   $141 = ((($11)) + 192|0); //@line 206 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($11,$141,$11); //@line 206 "SIDH_v1.0/kex.c"
   $142 = ((($12)) + 192|0); //@line 207 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($12,$142,$12); //@line 207 "SIDH_v1.0/kex.c"
   $143 = ((($13)) + 192|0); //@line 208 "SIDH_v1.0/kex.c"
   _fp2mul751_mont($13,$143,$13); //@line 208 "SIDH_v1.0/kex.c"
   $144 = $15; //@line 210 "SIDH_v1.0/kex.c"
   _from_fp2mont($22,$144); //@line 210 "SIDH_v1.0/kex.c"
   $145 = $15; //@line 211 "SIDH_v1.0/kex.c"
   $146 = ((($145)) + 192|0); //@line 211 "SIDH_v1.0/kex.c"
   _from_fp2mont($11,$146); //@line 211 "SIDH_v1.0/kex.c"
   $147 = $15; //@line 212 "SIDH_v1.0/kex.c"
   $148 = ((($147)) + 384|0); //@line 212 "SIDH_v1.0/kex.c"
   _from_fp2mont($12,$148); //@line 212 "SIDH_v1.0/kex.c"
   $149 = $15; //@line 213 "SIDH_v1.0/kex.c"
   $150 = ((($149)) + 576|0); //@line 213 "SIDH_v1.0/kex.c"
   _from_fp2mont($13,$150); //@line 213 "SIDH_v1.0/kex.c"
   $151 = $8; //@line 216 "SIDH_v1.0/kex.c"
   $152 = $151<<2; //@line 216 "SIDH_v1.0/kex.c"
   _clear_words($10,$152); //@line 216 "SIDH_v1.0/kex.c"
   $153 = $8; //@line 217 "SIDH_v1.0/kex.c"
   $154 = $153<<2; //@line 217 "SIDH_v1.0/kex.c"
   _clear_words($11,$154); //@line 217 "SIDH_v1.0/kex.c"
   $155 = $8; //@line 218 "SIDH_v1.0/kex.c"
   $156 = $155<<2; //@line 218 "SIDH_v1.0/kex.c"
   _clear_words($12,$156); //@line 218 "SIDH_v1.0/kex.c"
   $157 = $8; //@line 219 "SIDH_v1.0/kex.c"
   $158 = $157<<2; //@line 219 "SIDH_v1.0/kex.c"
   _clear_words($13,$158); //@line 219 "SIDH_v1.0/kex.c"
   $159 = $8; //@line 220 "SIDH_v1.0/kex.c"
   $160 = ($159*40)|0; //@line 220 "SIDH_v1.0/kex.c"
   _clear_words($14,$160); //@line 220 "SIDH_v1.0/kex.c"
   $161 = $8; //@line 221 "SIDH_v1.0/kex.c"
   $162 = $161<<1; //@line 221 "SIDH_v1.0/kex.c"
   _clear_words($22,$162); //@line 221 "SIDH_v1.0/kex.c"
   $163 = $8; //@line 222 "SIDH_v1.0/kex.c"
   $164 = $163<<1; //@line 222 "SIDH_v1.0/kex.c"
   _clear_words($23,$164); //@line 222 "SIDH_v1.0/kex.c"
   $165 = $24; //@line 224 "SIDH_v1.0/kex.c"
   $3 = $165; //@line 224 "SIDH_v1.0/kex.c"
   $166 = $3; //@line 225 "SIDH_v1.0/kex.c"
   STACKTOP = sp;return ($166|0); //@line 225 "SIDH_v1.0/kex.c"
  }
 }
 $3 = 6; //@line 141 "SIDH_v1.0/kex.c"
 $166 = $3; //@line 225 "SIDH_v1.0/kex.c"
 STACKTOP = sp;return ($166|0); //@line 225 "SIDH_v1.0/kex.c"
}
function _SecretAgreement_A($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0;
 var $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0;
 var $99 = 0, $or$cond = 0, $or$cond3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 5664|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(5664|0);
 $14 = sp + 5592|0;
 $16 = sp + 5200|0;
 $17 = sp + 2128|0;
 $19 = sp + 1928|0;
 $20 = sp + 968|0;
 $21 = sp + 776|0;
 $22 = sp + 584|0;
 $23 = sp + 392|0;
 $24 = sp + 200|0;
 $25 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 $7 = $2;
 $8 = $3;
 $27 = $8; //@line 235 "SIDH_v1.0/kex.c"
 $28 = ((($27)) + 12|0); //@line 235 "SIDH_v1.0/kex.c"
 $29 = HEAP32[$28>>2]|0; //@line 235 "SIDH_v1.0/kex.c"
 $30 = (($29) + 32)|0; //@line 235 "SIDH_v1.0/kex.c"
 $31 = (($30) - 1)|0; //@line 235 "SIDH_v1.0/kex.c"
 $32 = (($31>>>0) / 32)&-1; //@line 235 "SIDH_v1.0/kex.c"
 $9 = $32; //@line 235 "SIDH_v1.0/kex.c"
 $13 = 0; //@line 236 "SIDH_v1.0/kex.c"
 $15 = 0; //@line 236 "SIDH_v1.0/kex.c"
 $33 = $6; //@line 238 "SIDH_v1.0/kex.c"
 $18 = $33; //@line 238 "SIDH_v1.0/kex.c"
 _memset(($22|0),0,192)|0; //@line 239 "SIDH_v1.0/kex.c"
 $26 = 3; //@line 240 "SIDH_v1.0/kex.c"
 $34 = $5; //@line 242 "SIDH_v1.0/kex.c"
 $35 = ($34|0)==(0|0); //@line 242 "SIDH_v1.0/kex.c"
 $36 = $6; //@line 242 "SIDH_v1.0/kex.c"
 $37 = ($36|0)==(0|0); //@line 242 "SIDH_v1.0/kex.c"
 $or$cond = $35 | $37; //@line 242 "SIDH_v1.0/kex.c"
 $38 = $7; //@line 242 "SIDH_v1.0/kex.c"
 $39 = ($38|0)==(0|0); //@line 242 "SIDH_v1.0/kex.c"
 $or$cond3 = $or$cond | $39; //@line 242 "SIDH_v1.0/kex.c"
 if (!($or$cond3)) {
  $40 = $8; //@line 242 "SIDH_v1.0/kex.c"
  $41 = (_is_CurveIsogenyStruct_null($40)|0); //@line 242 "SIDH_v1.0/kex.c"
  if (!($41)) {
   $42 = $18; //@line 246 "SIDH_v1.0/kex.c"
   _to_fp2mont($42,$21); //@line 246 "SIDH_v1.0/kex.c"
   $43 = $18; //@line 247 "SIDH_v1.0/kex.c"
   $44 = ((($43)) + 192|0); //@line 247 "SIDH_v1.0/kex.c"
   _to_fp2mont($44,$23); //@line 247 "SIDH_v1.0/kex.c"
   $45 = $18; //@line 248 "SIDH_v1.0/kex.c"
   $46 = ((($45)) + 384|0); //@line 248 "SIDH_v1.0/kex.c"
   _to_fp2mont($46,$24); //@line 248 "SIDH_v1.0/kex.c"
   $47 = $18; //@line 249 "SIDH_v1.0/kex.c"
   $48 = ((($47)) + 576|0); //@line 249 "SIDH_v1.0/kex.c"
   _to_fp2mont($48,$25); //@line 249 "SIDH_v1.0/kex.c"
   $49 = $8; //@line 251 "SIDH_v1.0/kex.c"
   $50 = ((($49)) + 32|0); //@line 251 "SIDH_v1.0/kex.c"
   $51 = HEAP32[$50>>2]|0; //@line 251 "SIDH_v1.0/kex.c"
   _fpcopy751($51,$22); //@line 251 "SIDH_v1.0/kex.c"
   _to_mont($22,$22); //@line 252 "SIDH_v1.0/kex.c"
   $52 = $5; //@line 254 "SIDH_v1.0/kex.c"
   $53 = $8; //@line 254 "SIDH_v1.0/kex.c"
   $54 = (_ladder_3_pt($23,$24,$25,$52,0,$16,$21,$53)|0); //@line 254 "SIDH_v1.0/kex.c"
   $26 = $54; //@line 254 "SIDH_v1.0/kex.c"
   $55 = $26; //@line 255 "SIDH_v1.0/kex.c"
   $56 = ($55|0)!=(0); //@line 255 "SIDH_v1.0/kex.c"
   if ($56) {
    $57 = $26; //@line 256 "SIDH_v1.0/kex.c"
    $4 = $57; //@line 256 "SIDH_v1.0/kex.c"
    $124 = $4; //@line 296 "SIDH_v1.0/kex.c"
    STACKTOP = sp;return ($124|0); //@line 296 "SIDH_v1.0/kex.c"
   }
   $58 = $8; //@line 258 "SIDH_v1.0/kex.c"
   _first_4_isog($16,$21,$21,$22,$58); //@line 258 "SIDH_v1.0/kex.c"
   $13 = 0; //@line 260 "SIDH_v1.0/kex.c"
   $11 = 1; //@line 261 "SIDH_v1.0/kex.c"
   while(1) {
    $59 = $11; //@line 261 "SIDH_v1.0/kex.c"
    $60 = ($59>>>0)<(185); //@line 261 "SIDH_v1.0/kex.c"
    if (!($60)) {
     break;
    }
    while(1) {
     $61 = $13; //@line 262 "SIDH_v1.0/kex.c"
     $62 = $11; //@line 262 "SIDH_v1.0/kex.c"
     $63 = (185 - ($62))|0; //@line 262 "SIDH_v1.0/kex.c"
     $64 = ($61>>>0)<($63>>>0); //@line 262 "SIDH_v1.0/kex.c"
     if (!($64)) {
      break;
     }
     $65 = $15; //@line 263 "SIDH_v1.0/kex.c"
     $66 = (($17) + (($65*384)|0)|0); //@line 263 "SIDH_v1.0/kex.c"
     _fp2copy751($16,$66); //@line 263 "SIDH_v1.0/kex.c"
     $67 = ((($16)) + 192|0); //@line 264 "SIDH_v1.0/kex.c"
     $68 = $15; //@line 264 "SIDH_v1.0/kex.c"
     $69 = (($17) + (($68*384)|0)|0); //@line 264 "SIDH_v1.0/kex.c"
     $70 = ((($69)) + 192|0); //@line 264 "SIDH_v1.0/kex.c"
     _fp2copy751($67,$70); //@line 264 "SIDH_v1.0/kex.c"
     $71 = $13; //@line 265 "SIDH_v1.0/kex.c"
     $72 = $15; //@line 265 "SIDH_v1.0/kex.c"
     $73 = (($14) + ($72<<2)|0); //@line 265 "SIDH_v1.0/kex.c"
     HEAP32[$73>>2] = $71; //@line 265 "SIDH_v1.0/kex.c"
     $74 = $15; //@line 266 "SIDH_v1.0/kex.c"
     $75 = (($74) + 1)|0; //@line 266 "SIDH_v1.0/kex.c"
     $15 = $75; //@line 266 "SIDH_v1.0/kex.c"
     $76 = $13; //@line 267 "SIDH_v1.0/kex.c"
     $77 = (185 - ($76))|0; //@line 267 "SIDH_v1.0/kex.c"
     $78 = $11; //@line 267 "SIDH_v1.0/kex.c"
     $79 = (($77) - ($78))|0; //@line 267 "SIDH_v1.0/kex.c"
     $80 = (3032 + ($79<<2)|0); //@line 267 "SIDH_v1.0/kex.c"
     $81 = HEAP32[$80>>2]|0; //@line 267 "SIDH_v1.0/kex.c"
     $12 = $81; //@line 267 "SIDH_v1.0/kex.c"
     $82 = $12; //@line 268 "SIDH_v1.0/kex.c"
     $83 = $82<<1; //@line 268 "SIDH_v1.0/kex.c"
     _xDBLe($16,$16,$21,$22,$83); //@line 268 "SIDH_v1.0/kex.c"
     $84 = $12; //@line 269 "SIDH_v1.0/kex.c"
     $85 = $13; //@line 269 "SIDH_v1.0/kex.c"
     $86 = (($85) + ($84))|0; //@line 269 "SIDH_v1.0/kex.c"
     $13 = $86; //@line 269 "SIDH_v1.0/kex.c"
    }
    _get_4_isog($16,$21,$22,$20); //@line 271 "SIDH_v1.0/kex.c"
    $10 = 0; //@line 273 "SIDH_v1.0/kex.c"
    while(1) {
     $87 = $10; //@line 273 "SIDH_v1.0/kex.c"
     $88 = $15; //@line 273 "SIDH_v1.0/kex.c"
     $89 = ($87>>>0)<($88>>>0); //@line 273 "SIDH_v1.0/kex.c"
     if (!($89)) {
      break;
     }
     $90 = $10; //@line 274 "SIDH_v1.0/kex.c"
     $91 = (($17) + (($90*384)|0)|0); //@line 274 "SIDH_v1.0/kex.c"
     _eval_4_isog($91,$20); //@line 274 "SIDH_v1.0/kex.c"
     $92 = $10; //@line 273 "SIDH_v1.0/kex.c"
     $93 = (($92) + 1)|0; //@line 273 "SIDH_v1.0/kex.c"
     $10 = $93; //@line 273 "SIDH_v1.0/kex.c"
    }
    $94 = $15; //@line 277 "SIDH_v1.0/kex.c"
    $95 = (($94) - 1)|0; //@line 277 "SIDH_v1.0/kex.c"
    $96 = (($17) + (($95*384)|0)|0); //@line 277 "SIDH_v1.0/kex.c"
    _fp2copy751($96,$16); //@line 277 "SIDH_v1.0/kex.c"
    $97 = $15; //@line 278 "SIDH_v1.0/kex.c"
    $98 = (($97) - 1)|0; //@line 278 "SIDH_v1.0/kex.c"
    $99 = (($17) + (($98*384)|0)|0); //@line 278 "SIDH_v1.0/kex.c"
    $100 = ((($99)) + 192|0); //@line 278 "SIDH_v1.0/kex.c"
    $101 = ((($16)) + 192|0); //@line 278 "SIDH_v1.0/kex.c"
    _fp2copy751($100,$101); //@line 278 "SIDH_v1.0/kex.c"
    $102 = $15; //@line 279 "SIDH_v1.0/kex.c"
    $103 = (($102) - 1)|0; //@line 279 "SIDH_v1.0/kex.c"
    $104 = (($14) + ($103<<2)|0); //@line 279 "SIDH_v1.0/kex.c"
    $105 = HEAP32[$104>>2]|0; //@line 279 "SIDH_v1.0/kex.c"
    $13 = $105; //@line 279 "SIDH_v1.0/kex.c"
    $106 = $15; //@line 280 "SIDH_v1.0/kex.c"
    $107 = (($106) - 1)|0; //@line 280 "SIDH_v1.0/kex.c"
    $15 = $107; //@line 280 "SIDH_v1.0/kex.c"
    $108 = $11; //@line 261 "SIDH_v1.0/kex.c"
    $109 = (($108) + 1)|0; //@line 261 "SIDH_v1.0/kex.c"
    $11 = $109; //@line 261 "SIDH_v1.0/kex.c"
   }
   _get_4_isog($16,$21,$22,$20); //@line 283 "SIDH_v1.0/kex.c"
   _j_inv($21,$22,$19); //@line 284 "SIDH_v1.0/kex.c"
   $110 = $7; //@line 285 "SIDH_v1.0/kex.c"
   _from_fp2mont($19,$110); //@line 285 "SIDH_v1.0/kex.c"
   $111 = $9; //@line 288 "SIDH_v1.0/kex.c"
   $112 = $111<<2; //@line 288 "SIDH_v1.0/kex.c"
   _clear_words($16,$112); //@line 288 "SIDH_v1.0/kex.c"
   $113 = $9; //@line 289 "SIDH_v1.0/kex.c"
   $114 = $113<<5; //@line 289 "SIDH_v1.0/kex.c"
   _clear_words($17,$114); //@line 289 "SIDH_v1.0/kex.c"
   $115 = $9; //@line 290 "SIDH_v1.0/kex.c"
   $116 = $115<<1; //@line 290 "SIDH_v1.0/kex.c"
   _clear_words($21,$116); //@line 290 "SIDH_v1.0/kex.c"
   $117 = $9; //@line 291 "SIDH_v1.0/kex.c"
   $118 = $117<<1; //@line 291 "SIDH_v1.0/kex.c"
   _clear_words($22,$118); //@line 291 "SIDH_v1.0/kex.c"
   $119 = $9; //@line 292 "SIDH_v1.0/kex.c"
   $120 = $119<<1; //@line 292 "SIDH_v1.0/kex.c"
   _clear_words($19,$120); //@line 292 "SIDH_v1.0/kex.c"
   $121 = $9; //@line 293 "SIDH_v1.0/kex.c"
   $122 = ($121*10)|0; //@line 293 "SIDH_v1.0/kex.c"
   _clear_words($20,$122); //@line 293 "SIDH_v1.0/kex.c"
   $123 = $26; //@line 295 "SIDH_v1.0/kex.c"
   $4 = $123; //@line 295 "SIDH_v1.0/kex.c"
   $124 = $4; //@line 296 "SIDH_v1.0/kex.c"
   STACKTOP = sp;return ($124|0); //@line 296 "SIDH_v1.0/kex.c"
  }
 }
 $4 = 6; //@line 243 "SIDH_v1.0/kex.c"
 $124 = $4; //@line 296 "SIDH_v1.0/kex.c"
 STACKTOP = sp;return ($124|0); //@line 296 "SIDH_v1.0/kex.c"
}
function _SecretAgreement_B($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0;
 var $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $or$cond = 0, $or$cond3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 5488|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(5488|0);
 $14 = sp + 5400|0;
 $16 = sp + 5008|0;
 $17 = sp + 1168|0;
 $19 = sp + 968|0;
 $20 = sp + 776|0;
 $21 = sp + 584|0;
 $22 = sp + 392|0;
 $23 = sp + 200|0;
 $24 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 $7 = $2;
 $8 = $3;
 $26 = $8; //@line 306 "SIDH_v1.0/kex.c"
 $27 = ((($26)) + 12|0); //@line 306 "SIDH_v1.0/kex.c"
 $28 = HEAP32[$27>>2]|0; //@line 306 "SIDH_v1.0/kex.c"
 $29 = (($28) + 32)|0; //@line 306 "SIDH_v1.0/kex.c"
 $30 = (($29) - 1)|0; //@line 306 "SIDH_v1.0/kex.c"
 $31 = (($30>>>0) / 32)&-1; //@line 306 "SIDH_v1.0/kex.c"
 $9 = $31; //@line 306 "SIDH_v1.0/kex.c"
 $13 = 0; //@line 307 "SIDH_v1.0/kex.c"
 $15 = 0; //@line 307 "SIDH_v1.0/kex.c"
 $32 = $6; //@line 309 "SIDH_v1.0/kex.c"
 $18 = $32; //@line 309 "SIDH_v1.0/kex.c"
 _memset(($21|0),0,192)|0; //@line 310 "SIDH_v1.0/kex.c"
 $25 = 3; //@line 311 "SIDH_v1.0/kex.c"
 $33 = $5; //@line 313 "SIDH_v1.0/kex.c"
 $34 = ($33|0)==(0|0); //@line 313 "SIDH_v1.0/kex.c"
 $35 = $6; //@line 313 "SIDH_v1.0/kex.c"
 $36 = ($35|0)==(0|0); //@line 313 "SIDH_v1.0/kex.c"
 $or$cond = $34 | $36; //@line 313 "SIDH_v1.0/kex.c"
 $37 = $7; //@line 313 "SIDH_v1.0/kex.c"
 $38 = ($37|0)==(0|0); //@line 313 "SIDH_v1.0/kex.c"
 $or$cond3 = $or$cond | $38; //@line 313 "SIDH_v1.0/kex.c"
 if (!($or$cond3)) {
  $39 = $8; //@line 313 "SIDH_v1.0/kex.c"
  $40 = (_is_CurveIsogenyStruct_null($39)|0); //@line 313 "SIDH_v1.0/kex.c"
  if (!($40)) {
   $41 = $18; //@line 317 "SIDH_v1.0/kex.c"
   _to_fp2mont($41,$20); //@line 317 "SIDH_v1.0/kex.c"
   $42 = $18; //@line 318 "SIDH_v1.0/kex.c"
   $43 = ((($42)) + 192|0); //@line 318 "SIDH_v1.0/kex.c"
   _to_fp2mont($43,$22); //@line 318 "SIDH_v1.0/kex.c"
   $44 = $18; //@line 319 "SIDH_v1.0/kex.c"
   $45 = ((($44)) + 384|0); //@line 319 "SIDH_v1.0/kex.c"
   _to_fp2mont($45,$23); //@line 319 "SIDH_v1.0/kex.c"
   $46 = $18; //@line 320 "SIDH_v1.0/kex.c"
   $47 = ((($46)) + 576|0); //@line 320 "SIDH_v1.0/kex.c"
   _to_fp2mont($47,$24); //@line 320 "SIDH_v1.0/kex.c"
   $48 = $8; //@line 322 "SIDH_v1.0/kex.c"
   $49 = ((($48)) + 32|0); //@line 322 "SIDH_v1.0/kex.c"
   $50 = HEAP32[$49>>2]|0; //@line 322 "SIDH_v1.0/kex.c"
   _fpcopy751($50,$21); //@line 322 "SIDH_v1.0/kex.c"
   _to_mont($21,$21); //@line 323 "SIDH_v1.0/kex.c"
   $51 = $5; //@line 325 "SIDH_v1.0/kex.c"
   $52 = $8; //@line 325 "SIDH_v1.0/kex.c"
   $53 = (_ladder_3_pt($22,$23,$24,$51,1,$16,$20,$52)|0); //@line 325 "SIDH_v1.0/kex.c"
   $25 = $53; //@line 325 "SIDH_v1.0/kex.c"
   $54 = $25; //@line 326 "SIDH_v1.0/kex.c"
   $55 = ($54|0)!=(0); //@line 326 "SIDH_v1.0/kex.c"
   if ($55) {
    $56 = $25; //@line 327 "SIDH_v1.0/kex.c"
    $4 = $56; //@line 327 "SIDH_v1.0/kex.c"
    $119 = $4; //@line 365 "SIDH_v1.0/kex.c"
    STACKTOP = sp;return ($119|0); //@line 365 "SIDH_v1.0/kex.c"
   }
   $13 = 0; //@line 330 "SIDH_v1.0/kex.c"
   $11 = 1; //@line 331 "SIDH_v1.0/kex.c"
   while(1) {
    $57 = $11; //@line 331 "SIDH_v1.0/kex.c"
    $58 = ($57>>>0)<(239); //@line 331 "SIDH_v1.0/kex.c"
    if (!($58)) {
     break;
    }
    while(1) {
     $59 = $13; //@line 332 "SIDH_v1.0/kex.c"
     $60 = $11; //@line 332 "SIDH_v1.0/kex.c"
     $61 = (239 - ($60))|0; //@line 332 "SIDH_v1.0/kex.c"
     $62 = ($59>>>0)<($61>>>0); //@line 332 "SIDH_v1.0/kex.c"
     if (!($62)) {
      break;
     }
     $63 = $15; //@line 333 "SIDH_v1.0/kex.c"
     $64 = (($17) + (($63*384)|0)|0); //@line 333 "SIDH_v1.0/kex.c"
     _fp2copy751($16,$64); //@line 333 "SIDH_v1.0/kex.c"
     $65 = ((($16)) + 192|0); //@line 334 "SIDH_v1.0/kex.c"
     $66 = $15; //@line 334 "SIDH_v1.0/kex.c"
     $67 = (($17) + (($66*384)|0)|0); //@line 334 "SIDH_v1.0/kex.c"
     $68 = ((($67)) + 192|0); //@line 334 "SIDH_v1.0/kex.c"
     _fp2copy751($65,$68); //@line 334 "SIDH_v1.0/kex.c"
     $69 = $13; //@line 335 "SIDH_v1.0/kex.c"
     $70 = $15; //@line 335 "SIDH_v1.0/kex.c"
     $71 = (($14) + ($70<<2)|0); //@line 335 "SIDH_v1.0/kex.c"
     HEAP32[$71>>2] = $69; //@line 335 "SIDH_v1.0/kex.c"
     $72 = $15; //@line 336 "SIDH_v1.0/kex.c"
     $73 = (($72) + 1)|0; //@line 336 "SIDH_v1.0/kex.c"
     $15 = $73; //@line 336 "SIDH_v1.0/kex.c"
     $74 = $13; //@line 337 "SIDH_v1.0/kex.c"
     $75 = (239 - ($74))|0; //@line 337 "SIDH_v1.0/kex.c"
     $76 = $11; //@line 337 "SIDH_v1.0/kex.c"
     $77 = (($75) - ($76))|0; //@line 337 "SIDH_v1.0/kex.c"
     $78 = (3772 + ($77<<2)|0); //@line 337 "SIDH_v1.0/kex.c"
     $79 = HEAP32[$78>>2]|0; //@line 337 "SIDH_v1.0/kex.c"
     $12 = $79; //@line 337 "SIDH_v1.0/kex.c"
     $80 = $12; //@line 338 "SIDH_v1.0/kex.c"
     _xTPLe($16,$16,$20,$21,$80); //@line 338 "SIDH_v1.0/kex.c"
     $81 = $12; //@line 339 "SIDH_v1.0/kex.c"
     $82 = $13; //@line 339 "SIDH_v1.0/kex.c"
     $83 = (($82) + ($81))|0; //@line 339 "SIDH_v1.0/kex.c"
     $13 = $83; //@line 339 "SIDH_v1.0/kex.c"
    }
    _get_3_isog($16,$20,$21); //@line 341 "SIDH_v1.0/kex.c"
    $10 = 0; //@line 343 "SIDH_v1.0/kex.c"
    while(1) {
     $84 = $10; //@line 343 "SIDH_v1.0/kex.c"
     $85 = $15; //@line 343 "SIDH_v1.0/kex.c"
     $86 = ($84>>>0)<($85>>>0); //@line 343 "SIDH_v1.0/kex.c"
     if (!($86)) {
      break;
     }
     $87 = $10; //@line 344 "SIDH_v1.0/kex.c"
     $88 = (($17) + (($87*384)|0)|0); //@line 344 "SIDH_v1.0/kex.c"
     _eval_3_isog($16,$88); //@line 344 "SIDH_v1.0/kex.c"
     $89 = $10; //@line 343 "SIDH_v1.0/kex.c"
     $90 = (($89) + 1)|0; //@line 343 "SIDH_v1.0/kex.c"
     $10 = $90; //@line 343 "SIDH_v1.0/kex.c"
    }
    $91 = $15; //@line 347 "SIDH_v1.0/kex.c"
    $92 = (($91) - 1)|0; //@line 347 "SIDH_v1.0/kex.c"
    $93 = (($17) + (($92*384)|0)|0); //@line 347 "SIDH_v1.0/kex.c"
    _fp2copy751($93,$16); //@line 347 "SIDH_v1.0/kex.c"
    $94 = $15; //@line 348 "SIDH_v1.0/kex.c"
    $95 = (($94) - 1)|0; //@line 348 "SIDH_v1.0/kex.c"
    $96 = (($17) + (($95*384)|0)|0); //@line 348 "SIDH_v1.0/kex.c"
    $97 = ((($96)) + 192|0); //@line 348 "SIDH_v1.0/kex.c"
    $98 = ((($16)) + 192|0); //@line 348 "SIDH_v1.0/kex.c"
    _fp2copy751($97,$98); //@line 348 "SIDH_v1.0/kex.c"
    $99 = $15; //@line 349 "SIDH_v1.0/kex.c"
    $100 = (($99) - 1)|0; //@line 349 "SIDH_v1.0/kex.c"
    $101 = (($14) + ($100<<2)|0); //@line 349 "SIDH_v1.0/kex.c"
    $102 = HEAP32[$101>>2]|0; //@line 349 "SIDH_v1.0/kex.c"
    $13 = $102; //@line 349 "SIDH_v1.0/kex.c"
    $103 = $15; //@line 350 "SIDH_v1.0/kex.c"
    $104 = (($103) - 1)|0; //@line 350 "SIDH_v1.0/kex.c"
    $15 = $104; //@line 350 "SIDH_v1.0/kex.c"
    $105 = $11; //@line 331 "SIDH_v1.0/kex.c"
    $106 = (($105) + 1)|0; //@line 331 "SIDH_v1.0/kex.c"
    $11 = $106; //@line 331 "SIDH_v1.0/kex.c"
   }
   _get_3_isog($16,$20,$21); //@line 353 "SIDH_v1.0/kex.c"
   _j_inv($20,$21,$19); //@line 354 "SIDH_v1.0/kex.c"
   $107 = $7; //@line 355 "SIDH_v1.0/kex.c"
   _from_fp2mont($19,$107); //@line 355 "SIDH_v1.0/kex.c"
   $108 = $9; //@line 358 "SIDH_v1.0/kex.c"
   $109 = $108<<2; //@line 358 "SIDH_v1.0/kex.c"
   _clear_words($16,$109); //@line 358 "SIDH_v1.0/kex.c"
   $110 = $9; //@line 359 "SIDH_v1.0/kex.c"
   $111 = ($110*40)|0; //@line 359 "SIDH_v1.0/kex.c"
   _clear_words($17,$111); //@line 359 "SIDH_v1.0/kex.c"
   $112 = $9; //@line 360 "SIDH_v1.0/kex.c"
   $113 = $112<<1; //@line 360 "SIDH_v1.0/kex.c"
   _clear_words($20,$113); //@line 360 "SIDH_v1.0/kex.c"
   $114 = $9; //@line 361 "SIDH_v1.0/kex.c"
   $115 = $114<<1; //@line 361 "SIDH_v1.0/kex.c"
   _clear_words($21,$115); //@line 361 "SIDH_v1.0/kex.c"
   $116 = $9; //@line 362 "SIDH_v1.0/kex.c"
   $117 = $116<<1; //@line 362 "SIDH_v1.0/kex.c"
   _clear_words($19,$117); //@line 362 "SIDH_v1.0/kex.c"
   $118 = $25; //@line 364 "SIDH_v1.0/kex.c"
   $4 = $118; //@line 364 "SIDH_v1.0/kex.c"
   $119 = $4; //@line 365 "SIDH_v1.0/kex.c"
   STACKTOP = sp;return ($119|0); //@line 365 "SIDH_v1.0/kex.c"
  }
 }
 $4 = 6; //@line 314 "SIDH_v1.0/kex.c"
 $119 = $4; //@line 365 "SIDH_v1.0/kex.c"
 STACKTOP = sp;return ($119|0); //@line 365 "SIDH_v1.0/kex.c"
}
function _random_fp2($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0;
 var $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(224|0);
 $7 = sp + 104|0;
 $8 = sp + 8|0;
 $3 = $0;
 $4 = $1;
 $5 = 0; //@line 44 "SIDH_v1.0/validate.c"
 $10 = 3; //@line 47 "SIDH_v1.0/validate.c"
 $11 = $3; //@line 49 "SIDH_v1.0/validate.c"
 _clear_words($11,48); //@line 49 "SIDH_v1.0/validate.c"
 $12 = $4; //@line 50 "SIDH_v1.0/validate.c"
 $13 = ((($12)) + 24|0); //@line 50 "SIDH_v1.0/validate.c"
 $14 = HEAP32[$13>>2]|0; //@line 50 "SIDH_v1.0/validate.c"
 _fpcopy751($14,$8); //@line 50 "SIDH_v1.0/validate.c"
 $15 = $4; //@line 51 "SIDH_v1.0/validate.c"
 $16 = ((($15)) + 20|0); //@line 51 "SIDH_v1.0/validate.c"
 $17 = HEAP32[$16>>2]|0; //@line 51 "SIDH_v1.0/validate.c"
 $18 = (($17) + 7)|0; //@line 51 "SIDH_v1.0/validate.c"
 $19 = (($18>>>0) / 8)&-1; //@line 51 "SIDH_v1.0/validate.c"
 $6 = $19; //@line 51 "SIDH_v1.0/validate.c"
 $20 = $6; //@line 52 "SIDH_v1.0/validate.c"
 $21 = $20<<3; //@line 52 "SIDH_v1.0/validate.c"
 $22 = $4; //@line 52 "SIDH_v1.0/validate.c"
 $23 = ((($22)) + 20|0); //@line 52 "SIDH_v1.0/validate.c"
 $24 = HEAP32[$23>>2]|0; //@line 52 "SIDH_v1.0/validate.c"
 $25 = (($21) - ($24))|0; //@line 52 "SIDH_v1.0/validate.c"
 $26 = $25&255; //@line 52 "SIDH_v1.0/validate.c"
 $9 = $26; //@line 52 "SIDH_v1.0/validate.c"
 $27 = $9; //@line 53 "SIDH_v1.0/validate.c"
 $28 = $27&255; //@line 53 "SIDH_v1.0/validate.c"
 $29 = 255 >> $28; //@line 53 "SIDH_v1.0/validate.c"
 $30 = $29&255; //@line 53 "SIDH_v1.0/validate.c"
 $9 = $30; //@line 53 "SIDH_v1.0/validate.c"
 while(1) {
  $31 = $5; //@line 56 "SIDH_v1.0/validate.c"
  $32 = (($31) + 1)|0; //@line 56 "SIDH_v1.0/validate.c"
  $5 = $32; //@line 56 "SIDH_v1.0/validate.c"
  $33 = $5; //@line 57 "SIDH_v1.0/validate.c"
  $34 = ($33>>>0)>(100); //@line 57 "SIDH_v1.0/validate.c"
  if ($34) {
   label = 3;
   break;
  }
  $35 = $4; //@line 60 "SIDH_v1.0/validate.c"
  $36 = ((($35)) + 84|0); //@line 60 "SIDH_v1.0/validate.c"
  $37 = HEAP32[$36>>2]|0; //@line 60 "SIDH_v1.0/validate.c"
  $38 = $6; //@line 60 "SIDH_v1.0/validate.c"
  $39 = $3; //@line 60 "SIDH_v1.0/validate.c"
  $40 = (FUNCTION_TABLE_iii[$37 & 31]($38,$39)|0); //@line 60 "SIDH_v1.0/validate.c"
  $10 = $40; //@line 60 "SIDH_v1.0/validate.c"
  $41 = $10; //@line 61 "SIDH_v1.0/validate.c"
  $42 = ($41|0)!=(0); //@line 61 "SIDH_v1.0/validate.c"
  if ($42) {
   label = 5;
   break;
  }
  $44 = $9; //@line 64 "SIDH_v1.0/validate.c"
  $45 = $44&255; //@line 64 "SIDH_v1.0/validate.c"
  $46 = $6; //@line 64 "SIDH_v1.0/validate.c"
  $47 = (($46) - 1)|0; //@line 64 "SIDH_v1.0/validate.c"
  $48 = $3; //@line 64 "SIDH_v1.0/validate.c"
  $49 = (($48) + ($47)|0); //@line 64 "SIDH_v1.0/validate.c"
  $50 = HEAP8[$49>>0]|0; //@line 64 "SIDH_v1.0/validate.c"
  $51 = $50&255; //@line 64 "SIDH_v1.0/validate.c"
  $52 = $51 & $45; //@line 64 "SIDH_v1.0/validate.c"
  $53 = $52&255; //@line 64 "SIDH_v1.0/validate.c"
  HEAP8[$49>>0] = $53; //@line 64 "SIDH_v1.0/validate.c"
  $54 = $3; //@line 65 "SIDH_v1.0/validate.c"
  $55 = (_mp_sub($8,$54,$7,24)|0); //@line 65 "SIDH_v1.0/validate.c"
  $56 = ($55|0)==(1); //@line 65 "SIDH_v1.0/validate.c"
  if (!($56)) {
   label = 7;
   break;
  }
 }
 if ((label|0) == 3) {
  $2 = 9; //@line 58 "SIDH_v1.0/validate.c"
  $86 = $2; //@line 84 "SIDH_v1.0/validate.c"
  STACKTOP = sp;return ($86|0); //@line 84 "SIDH_v1.0/validate.c"
 }
 else if ((label|0) == 5) {
  $43 = $10; //@line 62 "SIDH_v1.0/validate.c"
  $2 = $43; //@line 62 "SIDH_v1.0/validate.c"
  $86 = $2; //@line 84 "SIDH_v1.0/validate.c"
  STACKTOP = sp;return ($86|0); //@line 84 "SIDH_v1.0/validate.c"
 }
 else if ((label|0) == 7) {
  $5 = 0; //@line 67 "SIDH_v1.0/validate.c"
  while(1) {
   $57 = $5; //@line 69 "SIDH_v1.0/validate.c"
   $58 = (($57) + 1)|0; //@line 69 "SIDH_v1.0/validate.c"
   $5 = $58; //@line 69 "SIDH_v1.0/validate.c"
   $59 = $5; //@line 70 "SIDH_v1.0/validate.c"
   $60 = ($59>>>0)>(100); //@line 70 "SIDH_v1.0/validate.c"
   if ($60) {
    label = 9;
    break;
   }
   $61 = $4; //@line 73 "SIDH_v1.0/validate.c"
   $62 = ((($61)) + 84|0); //@line 73 "SIDH_v1.0/validate.c"
   $63 = HEAP32[$62>>2]|0; //@line 73 "SIDH_v1.0/validate.c"
   $64 = $6; //@line 73 "SIDH_v1.0/validate.c"
   $65 = $3; //@line 73 "SIDH_v1.0/validate.c"
   $66 = ((($65)) + 96|0); //@line 73 "SIDH_v1.0/validate.c"
   $67 = (FUNCTION_TABLE_iii[$63 & 31]($64,$66)|0); //@line 73 "SIDH_v1.0/validate.c"
   $10 = $67; //@line 73 "SIDH_v1.0/validate.c"
   $68 = $10; //@line 74 "SIDH_v1.0/validate.c"
   $69 = ($68|0)!=(0); //@line 74 "SIDH_v1.0/validate.c"
   if ($69) {
    label = 11;
    break;
   }
   $71 = $9; //@line 77 "SIDH_v1.0/validate.c"
   $72 = $71&255; //@line 77 "SIDH_v1.0/validate.c"
   $73 = $6; //@line 77 "SIDH_v1.0/validate.c"
   $74 = (($73) - 1)|0; //@line 77 "SIDH_v1.0/validate.c"
   $75 = $3; //@line 77 "SIDH_v1.0/validate.c"
   $76 = ((($75)) + 96|0); //@line 77 "SIDH_v1.0/validate.c"
   $77 = (($76) + ($74)|0); //@line 77 "SIDH_v1.0/validate.c"
   $78 = HEAP8[$77>>0]|0; //@line 77 "SIDH_v1.0/validate.c"
   $79 = $78&255; //@line 77 "SIDH_v1.0/validate.c"
   $80 = $79 & $72; //@line 77 "SIDH_v1.0/validate.c"
   $81 = $80&255; //@line 77 "SIDH_v1.0/validate.c"
   HEAP8[$77>>0] = $81; //@line 77 "SIDH_v1.0/validate.c"
   $82 = $3; //@line 78 "SIDH_v1.0/validate.c"
   $83 = ((($82)) + 96|0); //@line 78 "SIDH_v1.0/validate.c"
   $84 = (_mp_sub($8,$83,$7,24)|0); //@line 78 "SIDH_v1.0/validate.c"
   $85 = ($84|0)==(1); //@line 78 "SIDH_v1.0/validate.c"
   if (!($85)) {
    label = 13;
    break;
   }
  }
  if ((label|0) == 9) {
   $2 = 9; //@line 71 "SIDH_v1.0/validate.c"
   $86 = $2; //@line 84 "SIDH_v1.0/validate.c"
   STACKTOP = sp;return ($86|0); //@line 84 "SIDH_v1.0/validate.c"
  }
  else if ((label|0) == 11) {
   $70 = $10; //@line 75 "SIDH_v1.0/validate.c"
   $2 = $70; //@line 75 "SIDH_v1.0/validate.c"
   $86 = $2; //@line 84 "SIDH_v1.0/validate.c"
   STACKTOP = sp;return ($86|0); //@line 84 "SIDH_v1.0/validate.c"
  }
  else if ((label|0) == 13) {
   _clear_words($7,24); //@line 81 "SIDH_v1.0/validate.c"
   $2 = 0; //@line 83 "SIDH_v1.0/validate.c"
   $86 = $2; //@line 84 "SIDH_v1.0/validate.c"
   STACKTOP = sp;return ($86|0); //@line 84 "SIDH_v1.0/validate.c"
  }
 }
 return (0)|0;
}
function _Validate_PKA($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0;
 var $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0;
 var $190 = 0, $191 = 0, $192 = 0, $193 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0;
 var $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0;
 var $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0;
 var $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0;
 var $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 8480|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(8480|0);
 $7 = sp + 7696|0;
 $8 = sp + 7504|0;
 $9 = sp + 7312|0;
 $10 = sp + 7120|0;
 $11 = sp + 6928|0;
 $12 = sp + 6736|0;
 $13 = sp + 6544|0;
 $14 = sp + 6352|0;
 $15 = sp + 6160|0;
 $16 = sp + 5968|0;
 $17 = sp + 5776|0;
 $18 = sp + 5584|0;
 $19 = sp + 5392|0;
 $20 = sp + 5200|0;
 $21 = sp + 5008|0;
 $22 = sp + 4816|0;
 $23 = sp + 4624|0;
 $24 = sp + 4432|0;
 $25 = sp + 4240|0;
 $26 = sp + 4048|0;
 $27 = sp + 3856|0;
 $28 = sp + 3664|0;
 $29 = sp + 3472|0;
 $30 = sp + 3280|0;
 $31 = sp + 3088|0;
 $32 = sp + 2896|0;
 $33 = sp + 2704|0;
 $34 = sp + 2512|0;
 $35 = sp + 2320|0;
 $36 = sp + 2128|0;
 $37 = sp + 1936|0;
 $38 = sp + 1744|0;
 $39 = sp + 1552|0;
 $40 = sp + 1168|0;
 $41 = sp + 784|0;
 $42 = sp + 400|0;
 $43 = sp + 16|0;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 _memset(($22|0),0,192)|0; //@line 313 "SIDH_v1.0/validate.c"
 _memset(($23|0),0,192)|0; //@line 313 "SIDH_v1.0/validate.c"
 _memset(($24|0),0,192)|0; //@line 313 "SIDH_v1.0/validate.c"
 _memset(($25|0),0,192)|0; //@line 313 "SIDH_v1.0/validate.c"
 _memset(($34|0),0,192)|0; //@line 314 "SIDH_v1.0/validate.c"
 _memset(($35|0),0,192)|0; //@line 314 "SIDH_v1.0/validate.c"
 _memset(($36|0),0,192)|0; //@line 314 "SIDH_v1.0/validate.c"
 _memset(($37|0),0,192)|0; //@line 314 "SIDH_v1.0/validate.c"
 _memset(($38|0),0,192)|0; //@line 314 "SIDH_v1.0/validate.c"
 _memset(($39|0),0,192)|0; //@line 314 "SIDH_v1.0/validate.c"
 _memset(($40|0),0,384)|0; //@line 315 "SIDH_v1.0/validate.c"
 _memset(($41|0),0,384)|0; //@line 315 "SIDH_v1.0/validate.c"
 $47 = $6; //@line 316 "SIDH_v1.0/validate.c"
 $48 = ((($47)) + 48|0); //@line 316 "SIDH_v1.0/validate.c"
 $49 = HEAP32[$48>>2]|0; //@line 316 "SIDH_v1.0/validate.c"
 $45 = $49; //@line 316 "SIDH_v1.0/validate.c"
 $46 = 3; //@line 317 "SIDH_v1.0/validate.c"
 $50 = $6; //@line 320 "SIDH_v1.0/validate.c"
 $51 = (_random_fp2($29,$50)|0); //@line 320 "SIDH_v1.0/validate.c"
 $46 = $51; //@line 320 "SIDH_v1.0/validate.c"
 $52 = $46; //@line 321 "SIDH_v1.0/validate.c"
 $53 = ($52|0)!=(0); //@line 321 "SIDH_v1.0/validate.c"
 if ($53) {
  _clear_words($29,48); //@line 322 "SIDH_v1.0/validate.c"
  $54 = $46; //@line 323 "SIDH_v1.0/validate.c"
  $3 = $54; //@line 323 "SIDH_v1.0/validate.c"
  $193 = $3; //@line 487 "SIDH_v1.0/validate.c"
  STACKTOP = sp;return ($193|0); //@line 487 "SIDH_v1.0/validate.c"
 }
 $55 = $4; //@line 326 "SIDH_v1.0/validate.c"
 _to_fp2mont($55,$7); //@line 326 "SIDH_v1.0/validate.c"
 $56 = $4; //@line 327 "SIDH_v1.0/validate.c"
 $57 = ((($56)) + 192|0); //@line 327 "SIDH_v1.0/validate.c"
 $58 = ((($7)) + 192|0); //@line 327 "SIDH_v1.0/validate.c"
 _to_fp2mont($57,$58); //@line 327 "SIDH_v1.0/validate.c"
 $59 = $4; //@line 328 "SIDH_v1.0/validate.c"
 $60 = ((($59)) + 384|0); //@line 328 "SIDH_v1.0/validate.c"
 $61 = ((($7)) + 384|0); //@line 328 "SIDH_v1.0/validate.c"
 _to_fp2mont($60,$61); //@line 328 "SIDH_v1.0/validate.c"
 $62 = $4; //@line 329 "SIDH_v1.0/validate.c"
 $63 = ((($62)) + 576|0); //@line 329 "SIDH_v1.0/validate.c"
 $64 = ((($7)) + 576|0); //@line 329 "SIDH_v1.0/validate.c"
 _to_fp2mont($63,$64); //@line 329 "SIDH_v1.0/validate.c"
 $65 = ((($7)) + 192|0); //@line 331 "SIDH_v1.0/validate.c"
 _fp2copy751($65,$40); //@line 331 "SIDH_v1.0/validate.c"
 $66 = $6; //@line 332 "SIDH_v1.0/validate.c"
 $67 = ((($66)) + 80|0); //@line 332 "SIDH_v1.0/validate.c"
 $68 = HEAP32[$67>>2]|0; //@line 332 "SIDH_v1.0/validate.c"
 $69 = ((($40)) + 192|0); //@line 332 "SIDH_v1.0/validate.c"
 _fpcopy751($68,$69); //@line 332 "SIDH_v1.0/validate.c"
 $70 = ((($7)) + 384|0); //@line 333 "SIDH_v1.0/validate.c"
 _fp2copy751($70,$41); //@line 333 "SIDH_v1.0/validate.c"
 $71 = $6; //@line 334 "SIDH_v1.0/validate.c"
 $72 = ((($71)) + 80|0); //@line 334 "SIDH_v1.0/validate.c"
 $73 = HEAP32[$72>>2]|0; //@line 334 "SIDH_v1.0/validate.c"
 $74 = ((($41)) + 192|0); //@line 334 "SIDH_v1.0/validate.c"
 _fpcopy751($73,$74); //@line 334 "SIDH_v1.0/validate.c"
 $75 = $6; //@line 336 "SIDH_v1.0/validate.c"
 $76 = ((($75)) + 80|0); //@line 336 "SIDH_v1.0/validate.c"
 $77 = HEAP32[$76>>2]|0; //@line 336 "SIDH_v1.0/validate.c"
 _fpcopy751($77,$38); //@line 336 "SIDH_v1.0/validate.c"
 $78 = $6; //@line 337 "SIDH_v1.0/validate.c"
 $79 = ((($78)) + 80|0); //@line 337 "SIDH_v1.0/validate.c"
 $80 = HEAP32[$79>>2]|0; //@line 337 "SIDH_v1.0/validate.c"
 _fpcopy751($80,$22); //@line 337 "SIDH_v1.0/validate.c"
 $81 = $6; //@line 338 "SIDH_v1.0/validate.c"
 $82 = ((($81)) + 80|0); //@line 338 "SIDH_v1.0/validate.c"
 $83 = HEAP32[$82>>2]|0; //@line 338 "SIDH_v1.0/validate.c"
 _fpcopy751($83,$23); //@line 338 "SIDH_v1.0/validate.c"
 $84 = $6; //@line 339 "SIDH_v1.0/validate.c"
 $85 = ((($84)) + 80|0); //@line 339 "SIDH_v1.0/validate.c"
 $86 = HEAP32[$85>>2]|0; //@line 339 "SIDH_v1.0/validate.c"
 _fpcopy751($86,$24); //@line 339 "SIDH_v1.0/validate.c"
 $87 = $6; //@line 340 "SIDH_v1.0/validate.c"
 $88 = ((($87)) + 80|0); //@line 340 "SIDH_v1.0/validate.c"
 $89 = HEAP32[$88>>2]|0; //@line 340 "SIDH_v1.0/validate.c"
 _fpcopy751($89,$25); //@line 340 "SIDH_v1.0/validate.c"
 $90 = $6; //@line 341 "SIDH_v1.0/validate.c"
 $91 = ((($90)) + 80|0); //@line 341 "SIDH_v1.0/validate.c"
 $92 = HEAP32[$91>>2]|0; //@line 341 "SIDH_v1.0/validate.c"
 _fpcopy751($92,$36); //@line 341 "SIDH_v1.0/validate.c"
 $93 = $6; //@line 342 "SIDH_v1.0/validate.c"
 $94 = ((($93)) + 80|0); //@line 342 "SIDH_v1.0/validate.c"
 $95 = HEAP32[$94>>2]|0; //@line 342 "SIDH_v1.0/validate.c"
 _fpcopy751($95,$37); //@line 342 "SIDH_v1.0/validate.c"
 $96 = ((($7)) + 192|0); //@line 344 "SIDH_v1.0/validate.c"
 _fp2add751($7,$96,$26); //@line 344 "SIDH_v1.0/validate.c"
 $97 = ((($7)) + 192|0); //@line 345 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($97,$26,$26); //@line 345 "SIDH_v1.0/validate.c"
 _fp2add751($38,$26,$26); //@line 346 "SIDH_v1.0/validate.c"
 $98 = ((($7)) + 384|0); //@line 347 "SIDH_v1.0/validate.c"
 _fp2add751($7,$98,$27); //@line 347 "SIDH_v1.0/validate.c"
 $99 = ((($7)) + 384|0); //@line 348 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($99,$27,$27); //@line 348 "SIDH_v1.0/validate.c"
 _fp2add751($38,$27,$27); //@line 349 "SIDH_v1.0/validate.c"
 $100 = ((($7)) + 384|0); //@line 350 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($100,$27,$27); //@line 350 "SIDH_v1.0/validate.c"
 $101 = ((($7)) + 192|0); //@line 351 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($101,$26,$26); //@line 351 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($27,$26,$28); //@line 352 "SIDH_v1.0/validate.c"
 $44 = 1; //@line 354 "SIDH_v1.0/validate.c"
 while(1) {
  $102 = $44; //@line 354 "SIDH_v1.0/validate.c"
  $103 = $45; //@line 354 "SIDH_v1.0/validate.c"
  $104 = ($102>>>0)<($103>>>0); //@line 354 "SIDH_v1.0/validate.c"
  _cube_indeterminant($34,$36,$28); //@line 355 "SIDH_v1.0/validate.c"
  _cube_indeterminant($35,$37,$28); //@line 356 "SIDH_v1.0/validate.c"
  if (!($104)) {
   break;
  }
  _TPLline($40,$41,$7,$42,$43,$30,$31,$32,$33); //@line 357 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($22,$30,$30); //@line 359 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($25,$30,$30); //@line 360 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($23,$32,$32); //@line 361 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($24,$32,$32); //@line 362 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($25,$24,$8); //@line 363 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($31,$8,$31); //@line 364 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($33,$8,$33); //@line 365 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($22,$42,$22); //@line 366 "SIDH_v1.0/validate.c"
  $105 = ((($42)) + 192|0); //@line 367 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($24,$105,$24); //@line 367 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($23,$43,$23); //@line 368 "SIDH_v1.0/validate.c"
  $106 = ((($43)) + 192|0); //@line 369 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($25,$106,$25); //@line 369 "SIDH_v1.0/validate.c"
  _line_indeterminant_TPL($34,$36,$30,$31,$28); //@line 371 "SIDH_v1.0/validate.c"
  _line_indeterminant_TPL($35,$37,$32,$33,$28); //@line 372 "SIDH_v1.0/validate.c"
  $107 = $44; //@line 354 "SIDH_v1.0/validate.c"
  $108 = (($107) + 1)|0; //@line 354 "SIDH_v1.0/validate.c"
  $44 = $108; //@line 354 "SIDH_v1.0/validate.c"
 }
 $109 = ((($40)) + 192|0); //@line 378 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($7,$109,$8); //@line 378 "SIDH_v1.0/validate.c"
 _fp2add751($40,$40,$9); //@line 379 "SIDH_v1.0/validate.c"
 _fp2add751($40,$9,$9); //@line 380 "SIDH_v1.0/validate.c"
 _fp2add751($8,$9,$10); //@line 381 "SIDH_v1.0/validate.c"
 _fp2add751($8,$10,$9); //@line 382 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($40,$9,$16); //@line 383 "SIDH_v1.0/validate.c"
 $110 = ((($40)) + 192|0); //@line 384 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($110,$9); //@line 384 "SIDH_v1.0/validate.c"
 _fp2add751($16,$9,$16); //@line 385 "SIDH_v1.0/validate.c"
 $111 = ((($40)) + 192|0); //@line 386 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($9,$111,$9); //@line 386 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($26,$9,$8); //@line 387 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($9,$24,$9); //@line 388 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($22,$11); //@line 389 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($8,$11,$8); //@line 390 "SIDH_v1.0/validate.c"
 _fp2add751($8,$8,$8); //@line 391 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($10,$8,$10); //@line 392 "SIDH_v1.0/validate.c"
 _fp2add751($10,$10,$10); //@line 393 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($16,$24,$11); //@line 394 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($11,$12); //@line 395 "SIDH_v1.0/validate.c"
 $112 = (_is_equal_fp2($10,$12)|0); //@line 397 "SIDH_v1.0/validate.c"
 $113 = $5; //@line 397 "SIDH_v1.0/validate.c"
 $114 = $112&1; //@line 397 "SIDH_v1.0/validate.c"
 HEAP8[$113>>0] = $114; //@line 397 "SIDH_v1.0/validate.c"
 $115 = $5; //@line 398 "SIDH_v1.0/validate.c"
 $116 = HEAP8[$115>>0]|0; //@line 398 "SIDH_v1.0/validate.c"
 $117 = $116&1; //@line 398 "SIDH_v1.0/validate.c"
 $118 = $117&1; //@line 398 "SIDH_v1.0/validate.c"
 $119 = (_is_equal_fp2($10,$39)|0); //@line 398 "SIDH_v1.0/validate.c"
 $120 = $119 ^ 1; //@line 398 "SIDH_v1.0/validate.c"
 $121 = $120&1; //@line 398 "SIDH_v1.0/validate.c"
 $122 = $118 & $121; //@line 398 "SIDH_v1.0/validate.c"
 $123 = ($122|0)!=(0); //@line 398 "SIDH_v1.0/validate.c"
 $124 = $5; //@line 398 "SIDH_v1.0/validate.c"
 $125 = $123&1; //@line 398 "SIDH_v1.0/validate.c"
 HEAP8[$124>>0] = $125; //@line 398 "SIDH_v1.0/validate.c"
 $126 = ((($41)) + 192|0); //@line 400 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($7,$126,$13); //@line 400 "SIDH_v1.0/validate.c"
 _fp2add751($41,$41,$14); //@line 401 "SIDH_v1.0/validate.c"
 _fp2add751($41,$14,$14); //@line 402 "SIDH_v1.0/validate.c"
 _fp2add751($13,$14,$10); //@line 403 "SIDH_v1.0/validate.c"
 _fp2add751($10,$13,$14); //@line 404 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($41,$14,$17); //@line 405 "SIDH_v1.0/validate.c"
 $127 = ((($41)) + 192|0); //@line 406 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($127,$14); //@line 406 "SIDH_v1.0/validate.c"
 _fp2add751($17,$14,$17); //@line 407 "SIDH_v1.0/validate.c"
 $128 = ((($41)) + 192|0); //@line 408 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($128,$14,$14); //@line 408 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($27,$14,$13); //@line 409 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($14,$25,$14); //@line 410 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($23,$15); //@line 411 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($13,$15,$13); //@line 412 "SIDH_v1.0/validate.c"
 _fp2add751($13,$13,$13); //@line 413 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($10,$13,$10); //@line 414 "SIDH_v1.0/validate.c"
 _fp2add751($10,$10,$10); //@line 415 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($17,$25,$15); //@line 416 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($15,$12); //@line 417 "SIDH_v1.0/validate.c"
 $129 = $5; //@line 419 "SIDH_v1.0/validate.c"
 $130 = HEAP8[$129>>0]|0; //@line 419 "SIDH_v1.0/validate.c"
 $131 = $130&1; //@line 419 "SIDH_v1.0/validate.c"
 $132 = $131&1; //@line 419 "SIDH_v1.0/validate.c"
 $133 = (_is_equal_fp2($10,$12)|0); //@line 419 "SIDH_v1.0/validate.c"
 $134 = $133&1; //@line 419 "SIDH_v1.0/validate.c"
 $135 = $132 & $134; //@line 419 "SIDH_v1.0/validate.c"
 $136 = ($135|0)!=(0); //@line 419 "SIDH_v1.0/validate.c"
 $137 = $5; //@line 419 "SIDH_v1.0/validate.c"
 $138 = $136&1; //@line 419 "SIDH_v1.0/validate.c"
 HEAP8[$137>>0] = $138; //@line 419 "SIDH_v1.0/validate.c"
 $139 = $5; //@line 420 "SIDH_v1.0/validate.c"
 $140 = HEAP8[$139>>0]|0; //@line 420 "SIDH_v1.0/validate.c"
 $141 = $140&1; //@line 420 "SIDH_v1.0/validate.c"
 $142 = $141&1; //@line 420 "SIDH_v1.0/validate.c"
 $143 = (_is_equal_fp2($10,$39)|0); //@line 420 "SIDH_v1.0/validate.c"
 $144 = $143 ^ 1; //@line 420 "SIDH_v1.0/validate.c"
 $145 = $144&1; //@line 420 "SIDH_v1.0/validate.c"
 $146 = $142 & $145; //@line 420 "SIDH_v1.0/validate.c"
 $147 = ($146|0)!=(0); //@line 420 "SIDH_v1.0/validate.c"
 $148 = $5; //@line 420 "SIDH_v1.0/validate.c"
 $149 = $147&1; //@line 420 "SIDH_v1.0/validate.c"
 HEAP8[$148>>0] = $149; //@line 420 "SIDH_v1.0/validate.c"
 $150 = ((($7)) + 384|0); //@line 422 "SIDH_v1.0/validate.c"
 $151 = ((($40)) + 192|0); //@line 422 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($150,$151,$18); //@line 422 "SIDH_v1.0/validate.c"
 _fp2sub751($40,$18,$18); //@line 423 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($11,$18,$18); //@line 424 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($24,$18,$18); //@line 425 "SIDH_v1.0/validate.c"
 _fp2sub751($18,$8,$18); //@line 426 "SIDH_v1.0/validate.c"
 $152 = ((($7)) + 192|0); //@line 427 "SIDH_v1.0/validate.c"
 $153 = ((($41)) + 192|0); //@line 427 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($152,$153,$21); //@line 427 "SIDH_v1.0/validate.c"
 _fp2sub751($41,$21,$21); //@line 428 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($15,$21,$21); //@line 429 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($25,$21,$21); //@line 430 "SIDH_v1.0/validate.c"
 _fp2sub751($21,$13,$21); //@line 431 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($22,$23,$19); //@line 432 "SIDH_v1.0/validate.c"
 _fp2add751($19,$19,$19); //@line 433 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($26,$19,$20); //@line 434 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($19,$27,$19); //@line 435 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($21,$22,$21); //@line 436 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($9,$21,$21); //@line 437 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($18,$23,$18); //@line 438 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($14,$18,$18); //@line 439 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($9,$14,$9); //@line 440 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($19,$9,$19); //@line 441 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($20,$9,$20); //@line 442 "SIDH_v1.0/validate.c"
 _fp2copy751($34,$8); //@line 443 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($19,$8,$34); //@line 444 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($26,$34,$34); //@line 445 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($18,$36,$9); //@line 446 "SIDH_v1.0/validate.c"
 _fp2add751($34,$9,$34); //@line 447 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($8,$27,$9); //@line 448 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($9,$18,$9); //@line 449 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($19,$36,$36); //@line 450 "SIDH_v1.0/validate.c"
 _fp2add751($9,$36,$36); //@line 451 "SIDH_v1.0/validate.c"
 _fp2copy751($35,$8); //@line 452 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($21,$8,$9); //@line 453 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($26,$9,$9); //@line 454 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($37,$20,$35); //@line 455 "SIDH_v1.0/validate.c"
 _fp2add751($9,$35,$35); //@line 456 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($8,$27,$9); //@line 457 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($20,$9,$9); //@line 458 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($37,$21,$37); //@line 459 "SIDH_v1.0/validate.c"
 _fp2add751($9,$37,$37); //@line 460 "SIDH_v1.0/validate.c"
 _fp2add751($34,$35,$10); //@line 461 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($10,$10); //@line 462 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($27,$10,$10); //@line 463 "SIDH_v1.0/validate.c"
 _fp2add751($36,$37,$12); //@line 464 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($12,$12); //@line 465 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($26,$12,$12); //@line 466 "SIDH_v1.0/validate.c"
 $154 = $5; //@line 468 "SIDH_v1.0/validate.c"
 $155 = HEAP8[$154>>0]|0; //@line 468 "SIDH_v1.0/validate.c"
 $156 = $155&1; //@line 468 "SIDH_v1.0/validate.c"
 $157 = $156&1; //@line 468 "SIDH_v1.0/validate.c"
 $158 = (_is_equal_fp2($10,$12)|0); //@line 468 "SIDH_v1.0/validate.c"
 $159 = $158 ^ 1; //@line 468 "SIDH_v1.0/validate.c"
 $160 = $159&1; //@line 468 "SIDH_v1.0/validate.c"
 $161 = $157 & $160; //@line 468 "SIDH_v1.0/validate.c"
 $162 = ($161|0)!=(0); //@line 468 "SIDH_v1.0/validate.c"
 $163 = $5; //@line 468 "SIDH_v1.0/validate.c"
 $164 = $162&1; //@line 468 "SIDH_v1.0/validate.c"
 HEAP8[$163>>0] = $164; //@line 468 "SIDH_v1.0/validate.c"
 $165 = ((($7)) + 192|0); //@line 470 "SIDH_v1.0/validate.c"
 $166 = ((($7)) + 384|0); //@line 470 "SIDH_v1.0/validate.c"
 _fp2add751($165,$166,$8); //@line 470 "SIDH_v1.0/validate.c"
 $167 = ((($7)) + 576|0); //@line 471 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($167,$8,$9); //@line 471 "SIDH_v1.0/validate.c"
 _fp2sub751($9,$38,$9); //@line 472 "SIDH_v1.0/validate.c"
 $168 = ((($7)) + 192|0); //@line 473 "SIDH_v1.0/validate.c"
 $169 = ((($7)) + 384|0); //@line 473 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($168,$169,$10); //@line 473 "SIDH_v1.0/validate.c"
 _fp2add751($9,$10,$9); //@line 474 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($9,$9); //@line 475 "SIDH_v1.0/validate.c"
 $170 = ((($7)) + 576|0); //@line 476 "SIDH_v1.0/validate.c"
 _fp2add751($8,$170,$8); //@line 476 "SIDH_v1.0/validate.c"
 _fp2add751($7,$8,$8); //@line 477 "SIDH_v1.0/validate.c"
 $171 = ((($7)) + 576|0); //@line 478 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($10,$171,$10); //@line 478 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($8,$10,$8); //@line 479 "SIDH_v1.0/validate.c"
 _fp2add751($8,$8,$8); //@line 480 "SIDH_v1.0/validate.c"
 _fp2add751($8,$8,$8); //@line 481 "SIDH_v1.0/validate.c"
 $172 = $5; //@line 483 "SIDH_v1.0/validate.c"
 $173 = HEAP8[$172>>0]|0; //@line 483 "SIDH_v1.0/validate.c"
 $174 = $173&1; //@line 483 "SIDH_v1.0/validate.c"
 $175 = $174&1; //@line 483 "SIDH_v1.0/validate.c"
 $176 = (_is_equal_fp2($8,$9)|0); //@line 483 "SIDH_v1.0/validate.c"
 $177 = $176&1; //@line 483 "SIDH_v1.0/validate.c"
 $178 = $175 & $177; //@line 483 "SIDH_v1.0/validate.c"
 $179 = ($178|0)!=(0); //@line 483 "SIDH_v1.0/validate.c"
 $180 = $5; //@line 483 "SIDH_v1.0/validate.c"
 $181 = $179&1; //@line 483 "SIDH_v1.0/validate.c"
 HEAP8[$180>>0] = $181; //@line 483 "SIDH_v1.0/validate.c"
 $182 = $5; //@line 484 "SIDH_v1.0/validate.c"
 $183 = HEAP8[$182>>0]|0; //@line 484 "SIDH_v1.0/validate.c"
 $184 = $183&1; //@line 484 "SIDH_v1.0/validate.c"
 $185 = $184&1; //@line 484 "SIDH_v1.0/validate.c"
 $186 = $6; //@line 484 "SIDH_v1.0/validate.c"
 $187 = (_test_curve($7,$29,$186)|0); //@line 484 "SIDH_v1.0/validate.c"
 $188 = $187&1; //@line 484 "SIDH_v1.0/validate.c"
 $189 = $185 & $188; //@line 484 "SIDH_v1.0/validate.c"
 $190 = ($189|0)!=(0); //@line 484 "SIDH_v1.0/validate.c"
 $191 = $5; //@line 484 "SIDH_v1.0/validate.c"
 $192 = $190&1; //@line 484 "SIDH_v1.0/validate.c"
 HEAP8[$191>>0] = $192; //@line 484 "SIDH_v1.0/validate.c"
 $3 = 0; //@line 486 "SIDH_v1.0/validate.c"
 $193 = $3; //@line 487 "SIDH_v1.0/validate.c"
 STACKTOP = sp;return ($193|0); //@line 487 "SIDH_v1.0/validate.c"
}
function _cube_indeterminant($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 784|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(784|0);
 $6 = sp + 576|0;
 $7 = sp + 384|0;
 $8 = sp + 192|0;
 $9 = sp;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $10 = $3; //@line 129 "SIDH_v1.0/validate.c"
 _fp2copy751($10,$6); //@line 129 "SIDH_v1.0/validate.c"
 $11 = $4; //@line 130 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($11,$7); //@line 130 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($6,$8); //@line 131 "SIDH_v1.0/validate.c"
 $12 = $5; //@line 132 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($12,$8,$8); //@line 132 "SIDH_v1.0/validate.c"
 _fp2add751($7,$8,$9); //@line 133 "SIDH_v1.0/validate.c"
 $13 = $3; //@line 134 "SIDH_v1.0/validate.c"
 _fp2add751($7,$9,$13); //@line 134 "SIDH_v1.0/validate.c"
 $14 = $3; //@line 135 "SIDH_v1.0/validate.c"
 $15 = $3; //@line 135 "SIDH_v1.0/validate.c"
 _fp2add751($7,$14,$15); //@line 135 "SIDH_v1.0/validate.c"
 $16 = $3; //@line 136 "SIDH_v1.0/validate.c"
 $17 = $3; //@line 136 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($6,$16,$17); //@line 136 "SIDH_v1.0/validate.c"
 _fp2add751($8,$9,$7); //@line 137 "SIDH_v1.0/validate.c"
 _fp2add751($8,$7,$7); //@line 138 "SIDH_v1.0/validate.c"
 $18 = $4; //@line 139 "SIDH_v1.0/validate.c"
 $19 = $4; //@line 139 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($18,$7,$19); //@line 139 "SIDH_v1.0/validate.c"
 STACKTOP = sp;return; //@line 140 "SIDH_v1.0/validate.c"
}
function _TPLline($0,$1,$2,$3,$4,$5,$6,$7,$8) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 $5 = $5|0;
 $6 = $6|0;
 $7 = $7|0;
 $8 = $8|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0;
 var $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0;
 var $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0;
 var $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0;
 var $37 = 0, $38 = 0, $39 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0;
 var $57 = 0, $58 = 0, $59 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0;
 var $77 = 0, $78 = 0, $79 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0;
 var $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 3312|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(3312|0);
 $18 = sp + 3072|0;
 $19 = sp + 2880|0;
 $20 = sp + 2688|0;
 $21 = sp + 2496|0;
 $22 = sp + 2304|0;
 $23 = sp + 2112|0;
 $24 = sp + 1920|0;
 $25 = sp + 1728|0;
 $26 = sp + 1536|0;
 $27 = sp + 1344|0;
 $28 = sp + 1152|0;
 $29 = sp + 960|0;
 $30 = sp + 768|0;
 $31 = sp + 576|0;
 $32 = sp + 384|0;
 $33 = sp + 192|0;
 $34 = sp;
 $9 = $0;
 $10 = $1;
 $11 = $2;
 $12 = $3;
 $13 = $4;
 $14 = $5;
 $15 = $6;
 $16 = $7;
 $17 = $8;
 $35 = $9; //@line 162 "SIDH_v1.0/validate.c"
 _fp2copy751($35,$18); //@line 162 "SIDH_v1.0/validate.c"
 $36 = $9; //@line 163 "SIDH_v1.0/validate.c"
 $37 = ((($36)) + 192|0); //@line 163 "SIDH_v1.0/validate.c"
 _fp2copy751($37,$19); //@line 163 "SIDH_v1.0/validate.c"
 $38 = $10; //@line 164 "SIDH_v1.0/validate.c"
 _fp2copy751($38,$20); //@line 164 "SIDH_v1.0/validate.c"
 $39 = $10; //@line 165 "SIDH_v1.0/validate.c"
 $40 = ((($39)) + 192|0); //@line 165 "SIDH_v1.0/validate.c"
 _fp2copy751($40,$21); //@line 165 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($18,$22); //@line 167 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($19,$23); //@line 168 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($18,$19,$24); //@line 169 "SIDH_v1.0/validate.c"
 $41 = $11; //@line 170 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($41,$24,$25); //@line 170 "SIDH_v1.0/validate.c"
 _fp2add751($22,$23,$26); //@line 171 "SIDH_v1.0/validate.c"
 _fp2add751($25,$26,$27); //@line 172 "SIDH_v1.0/validate.c"
 _fp2add751($25,$27,$25); //@line 173 "SIDH_v1.0/validate.c"
 _fp2add751($27,$27,$27); //@line 174 "SIDH_v1.0/validate.c"
 _fp2add751($23,$23,$31); //@line 175 "SIDH_v1.0/validate.c"
 _fp2add751($23,$31,$31); //@line 176 "SIDH_v1.0/validate.c"
 _fp2add751($25,$31,$31); //@line 177 "SIDH_v1.0/validate.c"
 _fp2add751($27,$31,$31); //@line 178 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($22,$31,$31); //@line 179 "SIDH_v1.0/validate.c"
 $42 = $14; //@line 180 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($23,$42); //@line 180 "SIDH_v1.0/validate.c"
 $43 = $14; //@line 181 "SIDH_v1.0/validate.c"
 _fp2sub751($31,$43,$31); //@line 181 "SIDH_v1.0/validate.c"
 _fp2add751($22,$25,$30); //@line 182 "SIDH_v1.0/validate.c"
 _fp2add751($22,$30,$30); //@line 183 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($27,$30,$30); //@line 184 "SIDH_v1.0/validate.c"
 _fp2sub751($30,$31,$30); //@line 185 "SIDH_v1.0/validate.c"
 _fp2add751($30,$30,$30); //@line 186 "SIDH_v1.0/validate.c"
 _fp2sub751($22,$23,$29); //@line 187 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($27,$29,$29); //@line 188 "SIDH_v1.0/validate.c"
 _fp2add751($29,$29,$29); //@line 189 "SIDH_v1.0/validate.c"
 _fp2sub751($31,$29,$29); //@line 190 "SIDH_v1.0/validate.c"
 $44 = $9; //@line 191 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($29,$44); //@line 191 "SIDH_v1.0/validate.c"
 $45 = $9; //@line 192 "SIDH_v1.0/validate.c"
 $46 = ((($45)) + 192|0); //@line 192 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($31,$46); //@line 192 "SIDH_v1.0/validate.c"
 $47 = $14; //@line 193 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($18,$27,$47); //@line 193 "SIDH_v1.0/validate.c"
 $48 = $14; //@line 194 "SIDH_v1.0/validate.c"
 $49 = $14; //@line 194 "SIDH_v1.0/validate.c"
 $50 = $14; //@line 194 "SIDH_v1.0/validate.c"
 _fp2add751($48,$49,$50); //@line 194 "SIDH_v1.0/validate.c"
 $51 = $14; //@line 195 "SIDH_v1.0/validate.c"
 $52 = $14; //@line 195 "SIDH_v1.0/validate.c"
 $53 = $14; //@line 195 "SIDH_v1.0/validate.c"
 _fp2add751($51,$52,$53); //@line 195 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($22,$29,$22); //@line 196 "SIDH_v1.0/validate.c"
 $54 = $11; //@line 197 "SIDH_v1.0/validate.c"
 $55 = ((($54)) + 384|0); //@line 197 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($31,$55,$27); //@line 197 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($23,$27,$27); //@line 198 "SIDH_v1.0/validate.c"
 $56 = $15; //@line 199 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($30,$24,$56); //@line 199 "SIDH_v1.0/validate.c"
 $57 = $15; //@line 200 "SIDH_v1.0/validate.c"
 $58 = $15; //@line 200 "SIDH_v1.0/validate.c"
 _fp2add751($27,$57,$58); //@line 200 "SIDH_v1.0/validate.c"
 $59 = $11; //@line 201 "SIDH_v1.0/validate.c"
 $60 = ((($59)) + 384|0); //@line 201 "SIDH_v1.0/validate.c"
 $61 = $15; //@line 201 "SIDH_v1.0/validate.c"
 $62 = $15; //@line 201 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($60,$61,$62); //@line 201 "SIDH_v1.0/validate.c"
 $63 = $15; //@line 202 "SIDH_v1.0/validate.c"
 $64 = $15; //@line 202 "SIDH_v1.0/validate.c"
 _fp2add751($22,$63,$64); //@line 202 "SIDH_v1.0/validate.c"
 $65 = $15; //@line 203 "SIDH_v1.0/validate.c"
 _fp2neg751($65); //@line 203 "SIDH_v1.0/validate.c"
 $66 = $11; //@line 204 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($66,$26,$27); //@line 204 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($26,$26); //@line 205 "SIDH_v1.0/validate.c"
 _fp2add751($24,$24,$24); //@line 206 "SIDH_v1.0/validate.c"
 $67 = $12; //@line 207 "SIDH_v1.0/validate.c"
 _fp2add751($24,$27,$67); //@line 207 "SIDH_v1.0/validate.c"
 _fp2sub751($27,$24,$27); //@line 208 "SIDH_v1.0/validate.c"
 $68 = $12; //@line 209 "SIDH_v1.0/validate.c"
 $69 = $12; //@line 209 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($24,$68,$69); //@line 209 "SIDH_v1.0/validate.c"
 $70 = $12; //@line 210 "SIDH_v1.0/validate.c"
 $71 = $12; //@line 210 "SIDH_v1.0/validate.c"
 _fp2add751($26,$70,$71); //@line 210 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($24,$27,$24); //@line 211 "SIDH_v1.0/validate.c"
 _fp2add751($24,$26,$24); //@line 212 "SIDH_v1.0/validate.c"
 _fp2add751($26,$26,$26); //@line 213 "SIDH_v1.0/validate.c"
 _fp2add751($24,$26,$24); //@line 214 "SIDH_v1.0/validate.c"
 $72 = $12; //@line 215 "SIDH_v1.0/validate.c"
 $73 = $12; //@line 215 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($72,$24,$73); //@line 215 "SIDH_v1.0/validate.c"
 $74 = $12; //@line 216 "SIDH_v1.0/validate.c"
 $75 = $12; //@line 216 "SIDH_v1.0/validate.c"
 $76 = $12; //@line 216 "SIDH_v1.0/validate.c"
 _fp2add751($74,$75,$76); //@line 216 "SIDH_v1.0/validate.c"
 $77 = $12; //@line 217 "SIDH_v1.0/validate.c"
 $78 = $12; //@line 217 "SIDH_v1.0/validate.c"
 $79 = $12; //@line 217 "SIDH_v1.0/validate.c"
 _fp2add751($77,$78,$79); //@line 217 "SIDH_v1.0/validate.c"
 $80 = $12; //@line 218 "SIDH_v1.0/validate.c"
 $81 = $9; //@line 218 "SIDH_v1.0/validate.c"
 $82 = $12; //@line 218 "SIDH_v1.0/validate.c"
 _fp2sub751($80,$81,$82); //@line 218 "SIDH_v1.0/validate.c"
 $83 = $9; //@line 219 "SIDH_v1.0/validate.c"
 $84 = $9; //@line 219 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($83,$18,$84); //@line 219 "SIDH_v1.0/validate.c"
 $85 = $12; //@line 220 "SIDH_v1.0/validate.c"
 $86 = $9; //@line 220 "SIDH_v1.0/validate.c"
 $87 = ((($86)) + 192|0); //@line 220 "SIDH_v1.0/validate.c"
 $88 = $12; //@line 220 "SIDH_v1.0/validate.c"
 _fp2sub751($85,$87,$88); //@line 220 "SIDH_v1.0/validate.c"
 $89 = $12; //@line 221 "SIDH_v1.0/validate.c"
 _fp2neg751($89); //@line 221 "SIDH_v1.0/validate.c"
 $90 = $12; //@line 222 "SIDH_v1.0/validate.c"
 $91 = $12; //@line 222 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($29,$90,$91); //@line 222 "SIDH_v1.0/validate.c"
 $92 = $9; //@line 223 "SIDH_v1.0/validate.c"
 $93 = ((($92)) + 192|0); //@line 223 "SIDH_v1.0/validate.c"
 $94 = $12; //@line 223 "SIDH_v1.0/validate.c"
 $95 = ((($94)) + 192|0); //@line 223 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($93,$31,$95); //@line 223 "SIDH_v1.0/validate.c"
 $96 = $12; //@line 224 "SIDH_v1.0/validate.c"
 $97 = ((($96)) + 192|0); //@line 224 "SIDH_v1.0/validate.c"
 $98 = $12; //@line 224 "SIDH_v1.0/validate.c"
 $99 = ((($98)) + 192|0); //@line 224 "SIDH_v1.0/validate.c"
 $100 = $12; //@line 224 "SIDH_v1.0/validate.c"
 $101 = ((($100)) + 192|0); //@line 224 "SIDH_v1.0/validate.c"
 _fp2add751($97,$99,$101); //@line 224 "SIDH_v1.0/validate.c"
 $102 = $9; //@line 225 "SIDH_v1.0/validate.c"
 $103 = ((($102)) + 192|0); //@line 225 "SIDH_v1.0/validate.c"
 $104 = $9; //@line 225 "SIDH_v1.0/validate.c"
 $105 = ((($104)) + 192|0); //@line 225 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($103,$19,$105); //@line 225 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($20,$22); //@line 226 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($21,$28); //@line 227 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($20,$21,$24); //@line 228 "SIDH_v1.0/validate.c"
 $106 = $11; //@line 229 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($106,$24,$25); //@line 229 "SIDH_v1.0/validate.c"
 _fp2add751($22,$28,$26); //@line 230 "SIDH_v1.0/validate.c"
 _fp2add751($25,$26,$27); //@line 231 "SIDH_v1.0/validate.c"
 _fp2add751($25,$27,$25); //@line 232 "SIDH_v1.0/validate.c"
 _fp2add751($27,$27,$27); //@line 233 "SIDH_v1.0/validate.c"
 _fp2add751($28,$28,$34); //@line 234 "SIDH_v1.0/validate.c"
 _fp2add751($28,$34,$34); //@line 235 "SIDH_v1.0/validate.c"
 _fp2add751($25,$34,$34); //@line 236 "SIDH_v1.0/validate.c"
 _fp2add751($27,$34,$34); //@line 237 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($22,$34,$34); //@line 238 "SIDH_v1.0/validate.c"
 $107 = $16; //@line 239 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($28,$107); //@line 239 "SIDH_v1.0/validate.c"
 $108 = $16; //@line 240 "SIDH_v1.0/validate.c"
 _fp2sub751($34,$108,$34); //@line 240 "SIDH_v1.0/validate.c"
 _fp2add751($22,$25,$33); //@line 241 "SIDH_v1.0/validate.c"
 _fp2add751($22,$33,$33); //@line 242 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($27,$33,$33); //@line 243 "SIDH_v1.0/validate.c"
 _fp2sub751($33,$34,$33); //@line 244 "SIDH_v1.0/validate.c"
 _fp2add751($33,$33,$33); //@line 245 "SIDH_v1.0/validate.c"
 _fp2sub751($22,$28,$32); //@line 246 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($27,$32,$32); //@line 247 "SIDH_v1.0/validate.c"
 _fp2add751($32,$32,$32); //@line 248 "SIDH_v1.0/validate.c"
 _fp2sub751($34,$32,$32); //@line 249 "SIDH_v1.0/validate.c"
 $109 = $10; //@line 250 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($32,$109); //@line 250 "SIDH_v1.0/validate.c"
 $110 = $10; //@line 251 "SIDH_v1.0/validate.c"
 $111 = ((($110)) + 192|0); //@line 251 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($34,$111); //@line 251 "SIDH_v1.0/validate.c"
 $112 = $16; //@line 252 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($20,$27,$112); //@line 252 "SIDH_v1.0/validate.c"
 $113 = $16; //@line 253 "SIDH_v1.0/validate.c"
 $114 = $16; //@line 253 "SIDH_v1.0/validate.c"
 $115 = $16; //@line 253 "SIDH_v1.0/validate.c"
 _fp2add751($113,$114,$115); //@line 253 "SIDH_v1.0/validate.c"
 $116 = $16; //@line 254 "SIDH_v1.0/validate.c"
 $117 = $16; //@line 254 "SIDH_v1.0/validate.c"
 $118 = $16; //@line 254 "SIDH_v1.0/validate.c"
 _fp2add751($116,$117,$118); //@line 254 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($22,$32,$22); //@line 255 "SIDH_v1.0/validate.c"
 $119 = $11; //@line 256 "SIDH_v1.0/validate.c"
 $120 = ((($119)) + 192|0); //@line 256 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($34,$120,$27); //@line 256 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($28,$27,$27); //@line 257 "SIDH_v1.0/validate.c"
 $121 = $17; //@line 258 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($33,$24,$121); //@line 258 "SIDH_v1.0/validate.c"
 $122 = $17; //@line 259 "SIDH_v1.0/validate.c"
 $123 = $17; //@line 259 "SIDH_v1.0/validate.c"
 _fp2add751($27,$122,$123); //@line 259 "SIDH_v1.0/validate.c"
 $124 = $11; //@line 260 "SIDH_v1.0/validate.c"
 $125 = ((($124)) + 192|0); //@line 260 "SIDH_v1.0/validate.c"
 $126 = $17; //@line 260 "SIDH_v1.0/validate.c"
 $127 = $17; //@line 260 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($125,$126,$127); //@line 260 "SIDH_v1.0/validate.c"
 $128 = $17; //@line 261 "SIDH_v1.0/validate.c"
 $129 = $17; //@line 261 "SIDH_v1.0/validate.c"
 _fp2add751($22,$128,$129); //@line 261 "SIDH_v1.0/validate.c"
 $130 = $17; //@line 262 "SIDH_v1.0/validate.c"
 _fp2neg751($130); //@line 262 "SIDH_v1.0/validate.c"
 $131 = $11; //@line 263 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($131,$26,$27); //@line 263 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($26,$26); //@line 264 "SIDH_v1.0/validate.c"
 _fp2add751($24,$24,$24); //@line 265 "SIDH_v1.0/validate.c"
 $132 = $13; //@line 266 "SIDH_v1.0/validate.c"
 _fp2add751($27,$24,$132); //@line 266 "SIDH_v1.0/validate.c"
 _fp2sub751($27,$24,$27); //@line 267 "SIDH_v1.0/validate.c"
 $133 = $13; //@line 268 "SIDH_v1.0/validate.c"
 $134 = $13; //@line 268 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($133,$24,$134); //@line 268 "SIDH_v1.0/validate.c"
 $135 = $13; //@line 269 "SIDH_v1.0/validate.c"
 $136 = $13; //@line 269 "SIDH_v1.0/validate.c"
 _fp2add751($135,$26,$136); //@line 269 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($24,$27,$24); //@line 270 "SIDH_v1.0/validate.c"
 _fp2add751($26,$24,$24); //@line 271 "SIDH_v1.0/validate.c"
 _fp2add751($26,$26,$26); //@line 272 "SIDH_v1.0/validate.c"
 _fp2add751($24,$26,$24); //@line 273 "SIDH_v1.0/validate.c"
 $137 = $13; //@line 274 "SIDH_v1.0/validate.c"
 $138 = $13; //@line 274 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($137,$24,$138); //@line 274 "SIDH_v1.0/validate.c"
 $139 = $13; //@line 275 "SIDH_v1.0/validate.c"
 $140 = $13; //@line 275 "SIDH_v1.0/validate.c"
 $141 = $13; //@line 275 "SIDH_v1.0/validate.c"
 _fp2add751($139,$140,$141); //@line 275 "SIDH_v1.0/validate.c"
 $142 = $13; //@line 276 "SIDH_v1.0/validate.c"
 $143 = $13; //@line 276 "SIDH_v1.0/validate.c"
 $144 = $13; //@line 276 "SIDH_v1.0/validate.c"
 _fp2add751($142,$143,$144); //@line 276 "SIDH_v1.0/validate.c"
 $145 = $13; //@line 277 "SIDH_v1.0/validate.c"
 $146 = $10; //@line 277 "SIDH_v1.0/validate.c"
 $147 = $13; //@line 277 "SIDH_v1.0/validate.c"
 _fp2sub751($145,$146,$147); //@line 277 "SIDH_v1.0/validate.c"
 $148 = $10; //@line 278 "SIDH_v1.0/validate.c"
 $149 = $10; //@line 278 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($148,$20,$149); //@line 278 "SIDH_v1.0/validate.c"
 $150 = $13; //@line 279 "SIDH_v1.0/validate.c"
 $151 = $10; //@line 279 "SIDH_v1.0/validate.c"
 $152 = ((($151)) + 192|0); //@line 279 "SIDH_v1.0/validate.c"
 $153 = $13; //@line 279 "SIDH_v1.0/validate.c"
 _fp2sub751($150,$152,$153); //@line 279 "SIDH_v1.0/validate.c"
 $154 = $13; //@line 280 "SIDH_v1.0/validate.c"
 _fp2neg751($154); //@line 280 "SIDH_v1.0/validate.c"
 $155 = $13; //@line 281 "SIDH_v1.0/validate.c"
 $156 = $13; //@line 281 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($32,$155,$156); //@line 281 "SIDH_v1.0/validate.c"
 $157 = $10; //@line 282 "SIDH_v1.0/validate.c"
 $158 = ((($157)) + 192|0); //@line 282 "SIDH_v1.0/validate.c"
 $159 = $13; //@line 282 "SIDH_v1.0/validate.c"
 $160 = ((($159)) + 192|0); //@line 282 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($158,$34,$160); //@line 282 "SIDH_v1.0/validate.c"
 $161 = $13; //@line 283 "SIDH_v1.0/validate.c"
 $162 = ((($161)) + 192|0); //@line 283 "SIDH_v1.0/validate.c"
 $163 = $13; //@line 283 "SIDH_v1.0/validate.c"
 $164 = ((($163)) + 192|0); //@line 283 "SIDH_v1.0/validate.c"
 $165 = $13; //@line 283 "SIDH_v1.0/validate.c"
 $166 = ((($165)) + 192|0); //@line 283 "SIDH_v1.0/validate.c"
 _fp2add751($162,$164,$166); //@line 283 "SIDH_v1.0/validate.c"
 $167 = $10; //@line 284 "SIDH_v1.0/validate.c"
 $168 = ((($167)) + 192|0); //@line 284 "SIDH_v1.0/validate.c"
 $169 = $10; //@line 284 "SIDH_v1.0/validate.c"
 $170 = ((($169)) + 192|0); //@line 284 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($168,$21,$170); //@line 284 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($23,$28,$24); //@line 285 "SIDH_v1.0/validate.c"
 $171 = $9; //@line 286 "SIDH_v1.0/validate.c"
 $172 = ((($171)) + 192|0); //@line 286 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($28,$172,$28); //@line 286 "SIDH_v1.0/validate.c"
 $173 = $10; //@line 287 "SIDH_v1.0/validate.c"
 $174 = ((($173)) + 192|0); //@line 287 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($23,$174,$23); //@line 287 "SIDH_v1.0/validate.c"
 $175 = $16; //@line 288 "SIDH_v1.0/validate.c"
 $176 = $16; //@line 288 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($175,$21,$176); //@line 288 "SIDH_v1.0/validate.c"
 $177 = $16; //@line 289 "SIDH_v1.0/validate.c"
 $178 = $10; //@line 289 "SIDH_v1.0/validate.c"
 $179 = ((($178)) + 192|0); //@line 289 "SIDH_v1.0/validate.c"
 $180 = $16; //@line 289 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($177,$179,$180); //@line 289 "SIDH_v1.0/validate.c"
 $181 = $14; //@line 290 "SIDH_v1.0/validate.c"
 $182 = $14; //@line 290 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($181,$19,$182); //@line 290 "SIDH_v1.0/validate.c"
 $183 = $14; //@line 291 "SIDH_v1.0/validate.c"
 $184 = $9; //@line 291 "SIDH_v1.0/validate.c"
 $185 = ((($184)) + 192|0); //@line 291 "SIDH_v1.0/validate.c"
 $186 = $14; //@line 291 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($183,$185,$186); //@line 291 "SIDH_v1.0/validate.c"
 $187 = $11; //@line 292 "SIDH_v1.0/validate.c"
 $188 = ((($187)) + 192|0); //@line 292 "SIDH_v1.0/validate.c"
 $189 = $10; //@line 292 "SIDH_v1.0/validate.c"
 $190 = ((($189)) + 192|0); //@line 292 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($188,$190,$25); //@line 292 "SIDH_v1.0/validate.c"
 $191 = $10; //@line 293 "SIDH_v1.0/validate.c"
 _fp2sub751($25,$191,$25); //@line 293 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($25,$34,$25); //@line 294 "SIDH_v1.0/validate.c"
 $192 = $11; //@line 295 "SIDH_v1.0/validate.c"
 $193 = ((($192)) + 384|0); //@line 295 "SIDH_v1.0/validate.c"
 $194 = $9; //@line 295 "SIDH_v1.0/validate.c"
 $195 = ((($194)) + 192|0); //@line 295 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($193,$195,$27); //@line 295 "SIDH_v1.0/validate.c"
 $196 = $9; //@line 296 "SIDH_v1.0/validate.c"
 _fp2sub751($27,$196,$27); //@line 296 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($27,$31,$27); //@line 297 "SIDH_v1.0/validate.c"
 $197 = $14; //@line 298 "SIDH_v1.0/validate.c"
 $198 = $14; //@line 298 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($197,$25,$198); //@line 298 "SIDH_v1.0/validate.c"
 $199 = $14; //@line 299 "SIDH_v1.0/validate.c"
 $200 = $14; //@line 299 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($24,$199,$200); //@line 299 "SIDH_v1.0/validate.c"
 $201 = $15; //@line 300 "SIDH_v1.0/validate.c"
 $202 = $15; //@line 300 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($201,$25,$202); //@line 300 "SIDH_v1.0/validate.c"
 $203 = $15; //@line 301 "SIDH_v1.0/validate.c"
 $204 = $15; //@line 301 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($28,$203,$204); //@line 301 "SIDH_v1.0/validate.c"
 $205 = $16; //@line 302 "SIDH_v1.0/validate.c"
 $206 = $16; //@line 302 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($205,$27,$206); //@line 302 "SIDH_v1.0/validate.c"
 $207 = $16; //@line 303 "SIDH_v1.0/validate.c"
 $208 = $16; //@line 303 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($24,$207,$208); //@line 303 "SIDH_v1.0/validate.c"
 $209 = $17; //@line 304 "SIDH_v1.0/validate.c"
 $210 = $17; //@line 304 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($209,$27,$210); //@line 304 "SIDH_v1.0/validate.c"
 $211 = $17; //@line 305 "SIDH_v1.0/validate.c"
 $212 = $17; //@line 305 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($23,$211,$212); //@line 305 "SIDH_v1.0/validate.c"
 STACKTOP = sp;return; //@line 306 "SIDH_v1.0/validate.c"
}
function _line_indeterminant_TPL($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 416|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(416|0);
 $10 = sp + 192|0;
 $11 = sp;
 $5 = $0;
 $6 = $1;
 $7 = $2;
 $8 = $3;
 $9 = $4;
 $12 = $5; //@line 147 "SIDH_v1.0/validate.c"
 $13 = $7; //@line 147 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($12,$13,$10); //@line 147 "SIDH_v1.0/validate.c"
 $14 = $5; //@line 148 "SIDH_v1.0/validate.c"
 $15 = $8; //@line 148 "SIDH_v1.0/validate.c"
 $16 = $5; //@line 148 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($14,$15,$16); //@line 148 "SIDH_v1.0/validate.c"
 $17 = $6; //@line 149 "SIDH_v1.0/validate.c"
 $18 = $7; //@line 149 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($17,$18,$11); //@line 149 "SIDH_v1.0/validate.c"
 $19 = $5; //@line 150 "SIDH_v1.0/validate.c"
 $20 = $5; //@line 150 "SIDH_v1.0/validate.c"
 _fp2add751($19,$11,$20); //@line 150 "SIDH_v1.0/validate.c"
 $21 = $6; //@line 151 "SIDH_v1.0/validate.c"
 $22 = $8; //@line 151 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($21,$22,$11); //@line 151 "SIDH_v1.0/validate.c"
 $23 = $9; //@line 152 "SIDH_v1.0/validate.c"
 $24 = $6; //@line 152 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($10,$23,$24); //@line 152 "SIDH_v1.0/validate.c"
 $25 = $6; //@line 153 "SIDH_v1.0/validate.c"
 $26 = $6; //@line 153 "SIDH_v1.0/validate.c"
 _fp2add751($25,$11,$26); //@line 153 "SIDH_v1.0/validate.c"
 STACKTOP = sp;return; //@line 154 "SIDH_v1.0/validate.c"
}
function _is_equal_fp2($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2; //@line 35 "SIDH_v1.0/validate.c"
 $5 = $3; //@line 35 "SIDH_v1.0/validate.c"
 $6 = (_is_equal_fp($4,$5)|0); //@line 35 "SIDH_v1.0/validate.c"
 if (!($6)) {
  $12 = 0;
  STACKTOP = sp;return ($12|0); //@line 35 "SIDH_v1.0/validate.c"
 }
 $7 = $2; //@line 35 "SIDH_v1.0/validate.c"
 $8 = ((($7)) + 96|0); //@line 35 "SIDH_v1.0/validate.c"
 $9 = $3; //@line 35 "SIDH_v1.0/validate.c"
 $10 = ((($9)) + 96|0); //@line 35 "SIDH_v1.0/validate.c"
 $11 = (_is_equal_fp($8,$10)|0); //@line 35 "SIDH_v1.0/validate.c"
 $12 = $11;
 STACKTOP = sp;return ($12|0); //@line 35 "SIDH_v1.0/validate.c"
}
function _test_curve($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1744|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(1744|0);
 $6 = sp + 1536|0;
 $7 = sp + 1344|0;
 $8 = sp + 1152|0;
 $9 = sp + 960|0;
 $10 = sp + 768|0;
 $11 = sp + 384|0;
 $12 = sp;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 _memset(($9|0),0,192)|0; //@line 89 "SIDH_v1.0/validate.c"
 _memset(($10|0),0,192)|0; //@line 89 "SIDH_v1.0/validate.c"
 $14 = $5; //@line 93 "SIDH_v1.0/validate.c"
 $15 = ((($14)) + 80|0); //@line 93 "SIDH_v1.0/validate.c"
 $16 = HEAP32[$15>>2]|0; //@line 93 "SIDH_v1.0/validate.c"
 _fpcopy751($16,$9); //@line 93 "SIDH_v1.0/validate.c"
 $17 = $3; //@line 96 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($17,$6); //@line 96 "SIDH_v1.0/validate.c"
 _fp2sub751($6,$9,$6); //@line 97 "SIDH_v1.0/validate.c"
 _fp2sub751($6,$9,$6); //@line 98 "SIDH_v1.0/validate.c"
 _fp2sub751($6,$9,$6); //@line 99 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($6,$7); //@line 100 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($6,$7,$7); //@line 101 "SIDH_v1.0/validate.c"
 _fp2sub751($6,$9,$6); //@line 102 "SIDH_v1.0/validate.c"
 $18 = ((($6)) + 96|0); //@line 103 "SIDH_v1.0/validate.c"
 _fpmul751_mont($7,$18,$7); //@line 103 "SIDH_v1.0/validate.c"
 $19 = ((($7)) + 96|0); //@line 104 "SIDH_v1.0/validate.c"
 $20 = ((($7)) + 96|0); //@line 104 "SIDH_v1.0/validate.c"
 _fpmul751_mont($19,$6,$20); //@line 104 "SIDH_v1.0/validate.c"
 $21 = ((($7)) + 96|0); //@line 106 "SIDH_v1.0/validate.c"
 $22 = (_is_equal_fp($7,$21)|0); //@line 106 "SIDH_v1.0/validate.c"
 $23 = $22 ^ 1; //@line 106 "SIDH_v1.0/validate.c"
 $24 = $23&1; //@line 106 "SIDH_v1.0/validate.c"
 $13 = $24; //@line 106 "SIDH_v1.0/validate.c"
 $25 = $4; //@line 109 "SIDH_v1.0/validate.c"
 _fp2copy751($25,$11); //@line 109 "SIDH_v1.0/validate.c"
 $26 = ((($11)) + 192|0); //@line 110 "SIDH_v1.0/validate.c"
 _fp2copy751($9,$26); //@line 110 "SIDH_v1.0/validate.c"
 _fp2copy751($9,$8); //@line 111 "SIDH_v1.0/validate.c"
 $27 = $3; //@line 113 "SIDH_v1.0/validate.c"
 _xDBLe($11,$11,$27,$8,1); //@line 113 "SIDH_v1.0/validate.c"
 $28 = $3; //@line 114 "SIDH_v1.0/validate.c"
 _xDBLe($11,$12,$28,$8,371); //@line 114 "SIDH_v1.0/validate.c"
 $29 = $3; //@line 115 "SIDH_v1.0/validate.c"
 _xTPLe($12,$12,$29,$8,239); //@line 115 "SIDH_v1.0/validate.c"
 $30 = ((($12)) + 192|0); //@line 116 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($11,$30,$11); //@line 116 "SIDH_v1.0/validate.c"
 $31 = ((($11)) + 192|0); //@line 117 "SIDH_v1.0/validate.c"
 $32 = ((($11)) + 192|0); //@line 117 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($31,$12,$32); //@line 117 "SIDH_v1.0/validate.c"
 $33 = ((($11)) + 192|0); //@line 118 "SIDH_v1.0/validate.c"
 _fp2sub751($11,$33,$11); //@line 118 "SIDH_v1.0/validate.c"
 $34 = ((($12)) + 192|0); //@line 119 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($11,$34,$11); //@line 119 "SIDH_v1.0/validate.c"
 $35 = $13; //@line 121 "SIDH_v1.0/validate.c"
 $36 = $35&1; //@line 121 "SIDH_v1.0/validate.c"
 if (!($36)) {
  $38 = 0;
  STACKTOP = sp;return ($38|0); //@line 121 "SIDH_v1.0/validate.c"
 }
 $37 = (_is_equal_fp2($11,$10)|0); //@line 121 "SIDH_v1.0/validate.c"
 $38 = $37;
 STACKTOP = sp;return ($38|0); //@line 121 "SIDH_v1.0/validate.c"
}
function _is_equal_fp($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$expand_i1_val = 0, $$expand_i1_val2 = 0, $$pre_trunc = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = sp + 12|0;
 $3 = $0;
 $4 = $1;
 $5 = 0; //@line 22 "SIDH_v1.0/validate.c"
 while(1) {
  $6 = $5; //@line 22 "SIDH_v1.0/validate.c"
  $7 = ($6>>>0)<(24); //@line 22 "SIDH_v1.0/validate.c"
  if (!($7)) {
   label = 6;
   break;
  }
  $8 = $5; //@line 23 "SIDH_v1.0/validate.c"
  $9 = $3; //@line 23 "SIDH_v1.0/validate.c"
  $10 = (($9) + ($8<<2)|0); //@line 23 "SIDH_v1.0/validate.c"
  $11 = HEAP32[$10>>2]|0; //@line 23 "SIDH_v1.0/validate.c"
  $12 = $5; //@line 23 "SIDH_v1.0/validate.c"
  $13 = $4; //@line 23 "SIDH_v1.0/validate.c"
  $14 = (($13) + ($12<<2)|0); //@line 23 "SIDH_v1.0/validate.c"
  $15 = HEAP32[$14>>2]|0; //@line 23 "SIDH_v1.0/validate.c"
  $16 = ($11|0)!=($15|0); //@line 23 "SIDH_v1.0/validate.c"
  if ($16) {
   label = 4;
   break;
  }
  $17 = $5; //@line 22 "SIDH_v1.0/validate.c"
  $18 = (($17) + 1)|0; //@line 22 "SIDH_v1.0/validate.c"
  $5 = $18; //@line 22 "SIDH_v1.0/validate.c"
 }
 if ((label|0) == 4) {
  $$expand_i1_val = 0; //@line 24 "SIDH_v1.0/validate.c"
  HEAP8[$2>>0] = $$expand_i1_val; //@line 24 "SIDH_v1.0/validate.c"
  $$pre_trunc = HEAP8[$2>>0]|0; //@line 29 "SIDH_v1.0/validate.c"
  $19 = $$pre_trunc&1; //@line 29 "SIDH_v1.0/validate.c"
  STACKTOP = sp;return ($19|0); //@line 29 "SIDH_v1.0/validate.c"
 }
 else if ((label|0) == 6) {
  $$expand_i1_val2 = 1; //@line 28 "SIDH_v1.0/validate.c"
  HEAP8[$2>>0] = $$expand_i1_val2; //@line 28 "SIDH_v1.0/validate.c"
  $$pre_trunc = HEAP8[$2>>0]|0; //@line 29 "SIDH_v1.0/validate.c"
  $19 = $$pre_trunc&1; //@line 29 "SIDH_v1.0/validate.c"
  STACKTOP = sp;return ($19|0); //@line 29 "SIDH_v1.0/validate.c"
 }
 return (0)|0;
}
function _Validate_PKB($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0;
 var $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0;
 var $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0;
 var $209 = 0, $21 = 0, $210 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0;
 var $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0;
 var $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0;
 var $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0;
 var $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 7520|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(7520|0);
 $7 = sp + 6736|0;
 $8 = sp + 6544|0;
 $9 = sp + 6352|0;
 $10 = sp + 6160|0;
 $11 = sp + 5968|0;
 $12 = sp + 5776|0;
 $13 = sp + 5584|0;
 $14 = sp + 5392|0;
 $15 = sp + 5200|0;
 $16 = sp + 5008|0;
 $17 = sp + 4816|0;
 $18 = sp + 4624|0;
 $19 = sp + 4432|0;
 $20 = sp + 4240|0;
 $21 = sp + 4048|0;
 $22 = sp + 3856|0;
 $23 = sp + 3664|0;
 $24 = sp + 3472|0;
 $25 = sp + 3280|0;
 $26 = sp + 3088|0;
 $27 = sp + 2896|0;
 $28 = sp + 2704|0;
 $29 = sp + 2512|0;
 $30 = sp + 2320|0;
 $31 = sp + 2128|0;
 $32 = sp + 1936|0;
 $33 = sp + 1744|0;
 $34 = sp + 1552|0;
 $35 = sp + 1360|0;
 $36 = sp + 1168|0;
 $37 = sp + 976|0;
 $38 = sp + 784|0;
 $39 = sp + 400|0;
 $40 = sp + 16|0;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 _memset(($20|0),0,192)|0; //@line 494 "SIDH_v1.0/validate.c"
 _memset(($21|0),0,192)|0; //@line 494 "SIDH_v1.0/validate.c"
 _memset(($22|0),0,192)|0; //@line 494 "SIDH_v1.0/validate.c"
 _memset(($23|0),0,192)|0; //@line 494 "SIDH_v1.0/validate.c"
 _memset(($24|0),0,192)|0; //@line 494 "SIDH_v1.0/validate.c"
 _memset(($25|0),0,192)|0; //@line 494 "SIDH_v1.0/validate.c"
 _memset(($33|0),0,192)|0; //@line 495 "SIDH_v1.0/validate.c"
 _memset(($34|0),0,192)|0; //@line 495 "SIDH_v1.0/validate.c"
 _memset(($35|0),0,192)|0; //@line 495 "SIDH_v1.0/validate.c"
 _memset(($36|0),0,192)|0; //@line 495 "SIDH_v1.0/validate.c"
 _memset(($37|0),0,192)|0; //@line 495 "SIDH_v1.0/validate.c"
 _memset(($38|0),0,192)|0; //@line 495 "SIDH_v1.0/validate.c"
 _memset(($39|0),0,384)|0; //@line 496 "SIDH_v1.0/validate.c"
 _memset(($40|0),0,384)|0; //@line 496 "SIDH_v1.0/validate.c"
 $44 = $6; //@line 497 "SIDH_v1.0/validate.c"
 $45 = ((($44)) + 36|0); //@line 497 "SIDH_v1.0/validate.c"
 $46 = HEAP32[$45>>2]|0; //@line 497 "SIDH_v1.0/validate.c"
 $42 = $46; //@line 497 "SIDH_v1.0/validate.c"
 $43 = 3; //@line 498 "SIDH_v1.0/validate.c"
 $47 = $6; //@line 501 "SIDH_v1.0/validate.c"
 $48 = (_random_fp2($26,$47)|0); //@line 501 "SIDH_v1.0/validate.c"
 $43 = $48; //@line 501 "SIDH_v1.0/validate.c"
 $49 = $43; //@line 502 "SIDH_v1.0/validate.c"
 $50 = ($49|0)!=(0); //@line 502 "SIDH_v1.0/validate.c"
 if ($50) {
  _clear_words($26,48); //@line 503 "SIDH_v1.0/validate.c"
  $51 = $43; //@line 504 "SIDH_v1.0/validate.c"
  $3 = $51; //@line 504 "SIDH_v1.0/validate.c"
  $210 = $3; //@line 711 "SIDH_v1.0/validate.c"
  STACKTOP = sp;return ($210|0); //@line 711 "SIDH_v1.0/validate.c"
 }
 $52 = $4; //@line 507 "SIDH_v1.0/validate.c"
 _to_fp2mont($52,$7); //@line 507 "SIDH_v1.0/validate.c"
 $53 = $4; //@line 508 "SIDH_v1.0/validate.c"
 $54 = ((($53)) + 192|0); //@line 508 "SIDH_v1.0/validate.c"
 $55 = ((($7)) + 192|0); //@line 508 "SIDH_v1.0/validate.c"
 _to_fp2mont($54,$55); //@line 508 "SIDH_v1.0/validate.c"
 $56 = $4; //@line 509 "SIDH_v1.0/validate.c"
 $57 = ((($56)) + 384|0); //@line 509 "SIDH_v1.0/validate.c"
 $58 = ((($7)) + 384|0); //@line 509 "SIDH_v1.0/validate.c"
 _to_fp2mont($57,$58); //@line 509 "SIDH_v1.0/validate.c"
 $59 = $4; //@line 510 "SIDH_v1.0/validate.c"
 $60 = ((($59)) + 576|0); //@line 510 "SIDH_v1.0/validate.c"
 $61 = ((($7)) + 576|0); //@line 510 "SIDH_v1.0/validate.c"
 _to_fp2mont($60,$61); //@line 510 "SIDH_v1.0/validate.c"
 $62 = ((($7)) + 192|0); //@line 512 "SIDH_v1.0/validate.c"
 _fp2copy751($62,$39); //@line 512 "SIDH_v1.0/validate.c"
 $63 = $6; //@line 513 "SIDH_v1.0/validate.c"
 $64 = ((($63)) + 80|0); //@line 513 "SIDH_v1.0/validate.c"
 $65 = HEAP32[$64>>2]|0; //@line 513 "SIDH_v1.0/validate.c"
 $66 = ((($39)) + 192|0); //@line 513 "SIDH_v1.0/validate.c"
 _fpcopy751($65,$66); //@line 513 "SIDH_v1.0/validate.c"
 $67 = ((($7)) + 384|0); //@line 514 "SIDH_v1.0/validate.c"
 _fp2copy751($67,$40); //@line 514 "SIDH_v1.0/validate.c"
 $68 = $6; //@line 515 "SIDH_v1.0/validate.c"
 $69 = ((($68)) + 80|0); //@line 515 "SIDH_v1.0/validate.c"
 $70 = HEAP32[$69>>2]|0; //@line 515 "SIDH_v1.0/validate.c"
 $71 = ((($40)) + 192|0); //@line 515 "SIDH_v1.0/validate.c"
 _fpcopy751($70,$71); //@line 515 "SIDH_v1.0/validate.c"
 $72 = ((($7)) + 192|0); //@line 516 "SIDH_v1.0/validate.c"
 _fp2copy751($72,$8); //@line 516 "SIDH_v1.0/validate.c"
 $73 = ((($7)) + 384|0); //@line 517 "SIDH_v1.0/validate.c"
 _fp2copy751($73,$9); //@line 517 "SIDH_v1.0/validate.c"
 $74 = $6; //@line 519 "SIDH_v1.0/validate.c"
 $75 = ((($74)) + 80|0); //@line 519 "SIDH_v1.0/validate.c"
 $76 = HEAP32[$75>>2]|0; //@line 519 "SIDH_v1.0/validate.c"
 _fpcopy751($76,$37); //@line 519 "SIDH_v1.0/validate.c"
 $77 = $6; //@line 520 "SIDH_v1.0/validate.c"
 $78 = ((($77)) + 80|0); //@line 520 "SIDH_v1.0/validate.c"
 $79 = HEAP32[$78>>2]|0; //@line 520 "SIDH_v1.0/validate.c"
 _fpcopy751($79,$20); //@line 520 "SIDH_v1.0/validate.c"
 $80 = $6; //@line 521 "SIDH_v1.0/validate.c"
 $81 = ((($80)) + 80|0); //@line 521 "SIDH_v1.0/validate.c"
 $82 = HEAP32[$81>>2]|0; //@line 521 "SIDH_v1.0/validate.c"
 _fpcopy751($82,$21); //@line 521 "SIDH_v1.0/validate.c"
 $83 = $6; //@line 522 "SIDH_v1.0/validate.c"
 $84 = ((($83)) + 80|0); //@line 522 "SIDH_v1.0/validate.c"
 $85 = HEAP32[$84>>2]|0; //@line 522 "SIDH_v1.0/validate.c"
 _fpcopy751($85,$22); //@line 522 "SIDH_v1.0/validate.c"
 $86 = $6; //@line 523 "SIDH_v1.0/validate.c"
 $87 = ((($86)) + 80|0); //@line 523 "SIDH_v1.0/validate.c"
 $88 = HEAP32[$87>>2]|0; //@line 523 "SIDH_v1.0/validate.c"
 _fpcopy751($88,$23); //@line 523 "SIDH_v1.0/validate.c"
 $89 = $6; //@line 524 "SIDH_v1.0/validate.c"
 $90 = ((($89)) + 80|0); //@line 524 "SIDH_v1.0/validate.c"
 $91 = HEAP32[$90>>2]|0; //@line 524 "SIDH_v1.0/validate.c"
 _fpcopy751($91,$24); //@line 524 "SIDH_v1.0/validate.c"
 $92 = $6; //@line 525 "SIDH_v1.0/validate.c"
 $93 = ((($92)) + 80|0); //@line 525 "SIDH_v1.0/validate.c"
 $94 = HEAP32[$93>>2]|0; //@line 525 "SIDH_v1.0/validate.c"
 _fpcopy751($94,$25); //@line 525 "SIDH_v1.0/validate.c"
 $95 = $6; //@line 526 "SIDH_v1.0/validate.c"
 $96 = ((($95)) + 80|0); //@line 526 "SIDH_v1.0/validate.c"
 $97 = HEAP32[$96>>2]|0; //@line 526 "SIDH_v1.0/validate.c"
 _fpcopy751($97,$35); //@line 526 "SIDH_v1.0/validate.c"
 $98 = $6; //@line 527 "SIDH_v1.0/validate.c"
 $99 = ((($98)) + 80|0); //@line 527 "SIDH_v1.0/validate.c"
 $100 = HEAP32[$99>>2]|0; //@line 527 "SIDH_v1.0/validate.c"
 _fpcopy751($100,$36); //@line 527 "SIDH_v1.0/validate.c"
 $101 = ((($7)) + 384|0); //@line 529 "SIDH_v1.0/validate.c"
 _fp2add751($7,$101,$28); //@line 529 "SIDH_v1.0/validate.c"
 $102 = ((($7)) + 192|0); //@line 530 "SIDH_v1.0/validate.c"
 _fp2add751($7,$102,$27); //@line 530 "SIDH_v1.0/validate.c"
 $103 = ((($7)) + 384|0); //@line 531 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($28,$103,$28); //@line 531 "SIDH_v1.0/validate.c"
 $104 = ((($7)) + 192|0); //@line 532 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($27,$104,$27); //@line 532 "SIDH_v1.0/validate.c"
 _fp2add751($28,$37,$28); //@line 533 "SIDH_v1.0/validate.c"
 _fp2add751($27,$37,$27); //@line 534 "SIDH_v1.0/validate.c"
 $105 = ((($7)) + 384|0); //@line 535 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($28,$105,$28); //@line 535 "SIDH_v1.0/validate.c"
 $106 = ((($7)) + 192|0); //@line 536 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($27,$106,$27); //@line 536 "SIDH_v1.0/validate.c"
 $41 = 1; //@line 538 "SIDH_v1.0/validate.c"
 while(1) {
  $107 = $41; //@line 538 "SIDH_v1.0/validate.c"
  $108 = $42; //@line 538 "SIDH_v1.0/validate.c"
  $109 = ($107>>>0)<($108>>>0); //@line 538 "SIDH_v1.0/validate.c"
  if (!($109)) {
   break;
  }
  _fp2sqr751_mont($39,$10); //@line 539 "SIDH_v1.0/validate.c"
  $110 = ((($39)) + 192|0); //@line 540 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($110,$19); //@line 540 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($40,$12); //@line 541 "SIDH_v1.0/validate.c"
  $111 = ((($40)) + 192|0); //@line 542 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($111,$18); //@line 542 "SIDH_v1.0/validate.c"
  _fp2sub751($10,$19,$14); //@line 543 "SIDH_v1.0/validate.c"
  _fp2add751($10,$10,$30); //@line 544 "SIDH_v1.0/validate.c"
  _fp2add751($10,$19,$10); //@line 545 "SIDH_v1.0/validate.c"
  _fp2sub751($12,$18,$15); //@line 546 "SIDH_v1.0/validate.c"
  _fp2add751($12,$12,$29); //@line 547 "SIDH_v1.0/validate.c"
  _fp2add751($12,$18,$12); //@line 548 "SIDH_v1.0/validate.c"
  $112 = ((($39)) + 192|0); //@line 549 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($39,$112,$11); //@line 549 "SIDH_v1.0/validate.c"
  $113 = ((($40)) + 192|0); //@line 550 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($40,$113,$13); //@line 550 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($7,$11,$16); //@line 551 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($7,$13,$17); //@line 552 "SIDH_v1.0/validate.c"
  _fp2add751($11,$11,$11); //@line 553 "SIDH_v1.0/validate.c"
  _fp2add751($13,$13,$13); //@line 554 "SIDH_v1.0/validate.c"
  _fp2add751($30,$16,$30); //@line 555 "SIDH_v1.0/validate.c"
  _fp2add751($10,$16,$16); //@line 556 "SIDH_v1.0/validate.c"
  _fp2add751($29,$17,$29); //@line 557 "SIDH_v1.0/validate.c"
  _fp2add751($12,$17,$17); //@line 558 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($7,$10,$10); //@line 559 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($7,$12,$12); //@line 560 "SIDH_v1.0/validate.c"
  _fp2add751($30,$16,$30); //@line 561 "SIDH_v1.0/validate.c"
  _fp2add751($29,$17,$29); //@line 562 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($30,$9,$30); //@line 563 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($29,$8,$29); //@line 564 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($39,$14,$9); //@line 565 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($40,$15,$8); //@line 566 "SIDH_v1.0/validate.c"
  _fp2sub751($9,$30,$9); //@line 567 "SIDH_v1.0/validate.c"
  _fp2sub751($8,$29,$8); //@line 568 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($24,$9,$30); //@line 569 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($25,$8,$29); //@line 570 "SIDH_v1.0/validate.c"
  $114 = ((($40)) + 192|0); //@line 571 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($114,$18,$18); //@line 571 "SIDH_v1.0/validate.c"
  $115 = ((($39)) + 192|0); //@line 572 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($115,$19,$19); //@line 572 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($18,$23,$18); //@line 573 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($19,$22,$19); //@line 574 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($30,$18,$30); //@line 575 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($29,$19,$29); //@line 576 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($18,$19,$18); //@line 577 "SIDH_v1.0/validate.c"
  _fp2add751($18,$18,$18); //@line 578 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($28,$18,$31); //@line 579 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($27,$18,$32); //@line 580 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($23,$15,$23); //@line 581 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($22,$14,$22); //@line 582 "SIDH_v1.0/validate.c"
  _fp2add751($16,$16,$16); //@line 583 "SIDH_v1.0/validate.c"
  _fp2add751($17,$17,$17); //@line 584 "SIDH_v1.0/validate.c"
  $116 = ((($39)) + 192|0); //@line 585 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($11,$16,$116); //@line 585 "SIDH_v1.0/validate.c"
  $117 = ((($40)) + 192|0); //@line 586 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($13,$17,$117); //@line 586 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($16,$39,$16); //@line 587 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($17,$40,$17); //@line 588 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($14,$39); //@line 589 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($15,$40); //@line 590 "SIDH_v1.0/validate.c"
  _fp2add751($12,$13,$12); //@line 591 "SIDH_v1.0/validate.c"
  _fp2add751($13,$12,$12); //@line 592 "SIDH_v1.0/validate.c"
  _fp2add751($10,$11,$10); //@line 593 "SIDH_v1.0/validate.c"
  _fp2add751($11,$10,$10); //@line 594 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($12,$13,$12); //@line 595 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($10,$11,$10); //@line 596 "SIDH_v1.0/validate.c"
  _fp2add751($12,$40,$12); //@line 597 "SIDH_v1.0/validate.c"
  _fp2add751($10,$39,$10); //@line 598 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($23,$12,$23); //@line 599 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($22,$10,$22); //@line 600 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($17,$17); //@line 601 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($16,$16); //@line 602 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($25,$17,$25); //@line 603 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($24,$16,$24); //@line 604 "SIDH_v1.0/validate.c"
  _fp2add751($25,$25,$25); //@line 605 "SIDH_v1.0/validate.c"
  _fp2add751($24,$24,$24); //@line 606 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($33,$12); //@line 607 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($35,$13); //@line 608 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($33,$35,$14); //@line 609 "SIDH_v1.0/validate.c"
  _fp2add751($14,$14,$14); //@line 610 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($12,$27,$12); //@line 611 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($13,$28,$13); //@line 612 "SIDH_v1.0/validate.c"
  _fp2add751($12,$13,$12); //@line 613 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($31,$12,$33); //@line 614 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($30,$12,$35); //@line 615 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($30,$14,$12); //@line 616 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($12,$28,$12); //@line 617 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($14,$31,$14); //@line 618 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($27,$14,$14); //@line 619 "SIDH_v1.0/validate.c"
  _fp2add751($33,$12,$33); //@line 620 "SIDH_v1.0/validate.c"
  _fp2add751($35,$14,$35); //@line 621 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($34,$12); //@line 622 "SIDH_v1.0/validate.c"
  _fp2sqr751_mont($36,$13); //@line 623 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($34,$36,$14); //@line 624 "SIDH_v1.0/validate.c"
  _fp2add751($14,$14,$14); //@line 625 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($12,$27,$12); //@line 626 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($13,$28,$13); //@line 627 "SIDH_v1.0/validate.c"
  _fp2add751($12,$13,$12); //@line 628 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($29,$12,$34); //@line 629 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($32,$12,$36); //@line 630 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($30,$14,$12); //@line 631 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($28,$12,$12); //@line 632 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($14,$32,$13); //@line 633 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($13,$28,$13); //@line 634 "SIDH_v1.0/validate.c"
  _fp2add751($34,$13,$34); //@line 635 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($14,$29,$13); //@line 636 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($27,$13,$13); //@line 637 "SIDH_v1.0/validate.c"
  _fp2add751($36,$13,$36); //@line 638 "SIDH_v1.0/validate.c"
  $118 = ((($7)) + 192|0); //@line 639 "SIDH_v1.0/validate.c"
  $119 = ((($40)) + 192|0); //@line 639 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($118,$119,$8); //@line 639 "SIDH_v1.0/validate.c"
  $120 = ((($7)) + 384|0); //@line 640 "SIDH_v1.0/validate.c"
  $121 = ((($39)) + 192|0); //@line 640 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($120,$121,$9); //@line 640 "SIDH_v1.0/validate.c"
  _fp2sub751($40,$8,$10); //@line 641 "SIDH_v1.0/validate.c"
  _fp2sub751($39,$9,$11); //@line 642 "SIDH_v1.0/validate.c"
  $122 = ((($39)) + 192|0); //@line 643 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($10,$122,$10); //@line 643 "SIDH_v1.0/validate.c"
  $123 = ((($40)) + 192|0); //@line 644 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($11,$123,$11); //@line 644 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($33,$10,$33); //@line 645 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($35,$10,$35); //@line 646 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($34,$11,$34); //@line 647 "SIDH_v1.0/validate.c"
  _fp2mul751_mont($36,$11,$36); //@line 648 "SIDH_v1.0/validate.c"
  $124 = $41; //@line 538 "SIDH_v1.0/validate.c"
  $125 = (($124) + 1)|0; //@line 538 "SIDH_v1.0/validate.c"
  $41 = $125; //@line 538 "SIDH_v1.0/validate.c"
 }
 $126 = ((($7)) + 384|0); //@line 651 "SIDH_v1.0/validate.c"
 $127 = ((($39)) + 192|0); //@line 651 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($126,$127,$10); //@line 651 "SIDH_v1.0/validate.c"
 $128 = ((($7)) + 192|0); //@line 652 "SIDH_v1.0/validate.c"
 $129 = ((($40)) + 192|0); //@line 652 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($128,$129,$11); //@line 652 "SIDH_v1.0/validate.c"
 _fp2sub751($39,$10,$10); //@line 653 "SIDH_v1.0/validate.c"
 _fp2sub751($40,$11,$11); //@line 654 "SIDH_v1.0/validate.c"
 $130 = ((($40)) + 192|0); //@line 655 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($10,$130,$10); //@line 655 "SIDH_v1.0/validate.c"
 $131 = ((($39)) + 192|0); //@line 656 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($11,$131,$11); //@line 656 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($33,$12); //@line 657 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($35,$13); //@line 658 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($33,$35,$14); //@line 659 "SIDH_v1.0/validate.c"
 _fp2add751($14,$14,$14); //@line 660 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($34,$15); //@line 661 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($36,$16); //@line 662 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($34,$36,$17); //@line 663 "SIDH_v1.0/validate.c"
 _fp2add751($17,$17,$17); //@line 664 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($12,$27,$12); //@line 665 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($13,$28,$13); //@line 666 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($15,$27,$15); //@line 667 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($16,$28,$16); //@line 668 "SIDH_v1.0/validate.c"
 _fp2add751($12,$13,$12); //@line 669 "SIDH_v1.0/validate.c"
 _fp2add751($15,$16,$15); //@line 670 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($10,$12,$12); //@line 671 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($11,$15,$15); //@line 672 "SIDH_v1.0/validate.c"
 _fp2sub751($12,$15,$15); //@line 673 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($15,$15); //@line 674 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($11,$17,$11); //@line 675 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($10,$14,$10); //@line 676 "SIDH_v1.0/validate.c"
 _fp2sub751($11,$10,$11); //@line 677 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($11,$11); //@line 678 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($27,$11,$11); //@line 679 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($28,$11,$11); //@line 680 "SIDH_v1.0/validate.c"
 _fp2add751($37,$37,$18); //@line 681 "SIDH_v1.0/validate.c"
 _fp2add751($18,$18,$19); //@line 682 "SIDH_v1.0/validate.c"
 _fp2add751($18,$7,$18); //@line 683 "SIDH_v1.0/validate.c"
 $132 = ((($40)) + 192|0); //@line 685 "SIDH_v1.0/validate.c"
 $133 = (_is_equal_fp2($132,$38)|0); //@line 685 "SIDH_v1.0/validate.c"
 $134 = $133 ^ 1; //@line 685 "SIDH_v1.0/validate.c"
 $135 = $5; //@line 685 "SIDH_v1.0/validate.c"
 $136 = $134&1; //@line 685 "SIDH_v1.0/validate.c"
 HEAP8[$135>>0] = $136; //@line 685 "SIDH_v1.0/validate.c"
 _xDBL($40,$40,$18,$19); //@line 686 "SIDH_v1.0/validate.c"
 $137 = $5; //@line 687 "SIDH_v1.0/validate.c"
 $138 = HEAP8[$137>>0]|0; //@line 687 "SIDH_v1.0/validate.c"
 $139 = $138&1; //@line 687 "SIDH_v1.0/validate.c"
 $140 = $139&1; //@line 687 "SIDH_v1.0/validate.c"
 $141 = ((($40)) + 192|0); //@line 687 "SIDH_v1.0/validate.c"
 $142 = (_is_equal_fp2($141,$38)|0); //@line 687 "SIDH_v1.0/validate.c"
 $143 = $142&1; //@line 687 "SIDH_v1.0/validate.c"
 $144 = $140 & $143; //@line 687 "SIDH_v1.0/validate.c"
 $145 = ($144|0)!=(0); //@line 687 "SIDH_v1.0/validate.c"
 $146 = $5; //@line 687 "SIDH_v1.0/validate.c"
 $147 = $145&1; //@line 687 "SIDH_v1.0/validate.c"
 HEAP8[$146>>0] = $147; //@line 687 "SIDH_v1.0/validate.c"
 $148 = $5; //@line 689 "SIDH_v1.0/validate.c"
 $149 = HEAP8[$148>>0]|0; //@line 689 "SIDH_v1.0/validate.c"
 $150 = $149&1; //@line 689 "SIDH_v1.0/validate.c"
 $151 = $150&1; //@line 689 "SIDH_v1.0/validate.c"
 $152 = ((($39)) + 192|0); //@line 689 "SIDH_v1.0/validate.c"
 $153 = (_is_equal_fp2($152,$38)|0); //@line 689 "SIDH_v1.0/validate.c"
 $154 = $153 ^ 1; //@line 689 "SIDH_v1.0/validate.c"
 $155 = $154&1; //@line 689 "SIDH_v1.0/validate.c"
 $156 = $151 & $155; //@line 689 "SIDH_v1.0/validate.c"
 $157 = ($156|0)!=(0); //@line 689 "SIDH_v1.0/validate.c"
 $158 = $5; //@line 689 "SIDH_v1.0/validate.c"
 $159 = $157&1; //@line 689 "SIDH_v1.0/validate.c"
 HEAP8[$158>>0] = $159; //@line 689 "SIDH_v1.0/validate.c"
 _xDBL($39,$39,$18,$19); //@line 690 "SIDH_v1.0/validate.c"
 $160 = $5; //@line 691 "SIDH_v1.0/validate.c"
 $161 = HEAP8[$160>>0]|0; //@line 691 "SIDH_v1.0/validate.c"
 $162 = $161&1; //@line 691 "SIDH_v1.0/validate.c"
 $163 = $162&1; //@line 691 "SIDH_v1.0/validate.c"
 $164 = ((($39)) + 192|0); //@line 691 "SIDH_v1.0/validate.c"
 $165 = (_is_equal_fp2($164,$38)|0); //@line 691 "SIDH_v1.0/validate.c"
 $166 = $165&1; //@line 691 "SIDH_v1.0/validate.c"
 $167 = $163 & $166; //@line 691 "SIDH_v1.0/validate.c"
 $168 = ($167|0)!=(0); //@line 691 "SIDH_v1.0/validate.c"
 $169 = $5; //@line 691 "SIDH_v1.0/validate.c"
 $170 = $168&1; //@line 691 "SIDH_v1.0/validate.c"
 HEAP8[$169>>0] = $170; //@line 691 "SIDH_v1.0/validate.c"
 $171 = $5; //@line 692 "SIDH_v1.0/validate.c"
 $172 = HEAP8[$171>>0]|0; //@line 692 "SIDH_v1.0/validate.c"
 $173 = $172&1; //@line 692 "SIDH_v1.0/validate.c"
 $174 = $173&1; //@line 692 "SIDH_v1.0/validate.c"
 $175 = (_is_equal_fp2($11,$15)|0); //@line 692 "SIDH_v1.0/validate.c"
 $176 = $175 ^ 1; //@line 692 "SIDH_v1.0/validate.c"
 $177 = $176&1; //@line 692 "SIDH_v1.0/validate.c"
 $178 = $174 & $177; //@line 692 "SIDH_v1.0/validate.c"
 $179 = ($178|0)!=(0); //@line 692 "SIDH_v1.0/validate.c"
 $180 = $5; //@line 692 "SIDH_v1.0/validate.c"
 $181 = $179&1; //@line 692 "SIDH_v1.0/validate.c"
 HEAP8[$180>>0] = $181; //@line 692 "SIDH_v1.0/validate.c"
 $182 = ((($7)) + 192|0); //@line 694 "SIDH_v1.0/validate.c"
 $183 = ((($7)) + 384|0); //@line 694 "SIDH_v1.0/validate.c"
 _fp2add751($182,$183,$8); //@line 694 "SIDH_v1.0/validate.c"
 $184 = ((($7)) + 576|0); //@line 695 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($184,$8,$9); //@line 695 "SIDH_v1.0/validate.c"
 _fp2sub751($9,$37,$9); //@line 696 "SIDH_v1.0/validate.c"
 $185 = ((($7)) + 192|0); //@line 697 "SIDH_v1.0/validate.c"
 $186 = ((($7)) + 384|0); //@line 697 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($185,$186,$10); //@line 697 "SIDH_v1.0/validate.c"
 _fp2add751($9,$10,$9); //@line 698 "SIDH_v1.0/validate.c"
 _fp2sqr751_mont($9,$9); //@line 699 "SIDH_v1.0/validate.c"
 $187 = ((($7)) + 576|0); //@line 700 "SIDH_v1.0/validate.c"
 _fp2add751($8,$187,$8); //@line 700 "SIDH_v1.0/validate.c"
 _fp2add751($7,$8,$8); //@line 701 "SIDH_v1.0/validate.c"
 $188 = ((($7)) + 576|0); //@line 702 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($188,$10,$10); //@line 702 "SIDH_v1.0/validate.c"
 _fp2mul751_mont($8,$10,$8); //@line 703 "SIDH_v1.0/validate.c"
 _fp2add751($8,$8,$8); //@line 704 "SIDH_v1.0/validate.c"
 _fp2add751($8,$8,$8); //@line 705 "SIDH_v1.0/validate.c"
 $189 = $5; //@line 707 "SIDH_v1.0/validate.c"
 $190 = HEAP8[$189>>0]|0; //@line 707 "SIDH_v1.0/validate.c"
 $191 = $190&1; //@line 707 "SIDH_v1.0/validate.c"
 $192 = $191&1; //@line 707 "SIDH_v1.0/validate.c"
 $193 = (_is_equal_fp2($8,$9)|0); //@line 707 "SIDH_v1.0/validate.c"
 $194 = $193&1; //@line 707 "SIDH_v1.0/validate.c"
 $195 = $192 & $194; //@line 707 "SIDH_v1.0/validate.c"
 $196 = ($195|0)!=(0); //@line 707 "SIDH_v1.0/validate.c"
 $197 = $5; //@line 707 "SIDH_v1.0/validate.c"
 $198 = $196&1; //@line 707 "SIDH_v1.0/validate.c"
 HEAP8[$197>>0] = $198; //@line 707 "SIDH_v1.0/validate.c"
 $199 = $5; //@line 708 "SIDH_v1.0/validate.c"
 $200 = HEAP8[$199>>0]|0; //@line 708 "SIDH_v1.0/validate.c"
 $201 = $200&1; //@line 708 "SIDH_v1.0/validate.c"
 $202 = $201&1; //@line 708 "SIDH_v1.0/validate.c"
 $203 = $6; //@line 708 "SIDH_v1.0/validate.c"
 $204 = (_test_curve($7,$26,$203)|0); //@line 708 "SIDH_v1.0/validate.c"
 $205 = $204&1; //@line 708 "SIDH_v1.0/validate.c"
 $206 = $202 & $205; //@line 708 "SIDH_v1.0/validate.c"
 $207 = ($206|0)!=(0); //@line 708 "SIDH_v1.0/validate.c"
 $208 = $5; //@line 708 "SIDH_v1.0/validate.c"
 $209 = $207&1; //@line 708 "SIDH_v1.0/validate.c"
 HEAP8[$208>>0] = $209; //@line 708 "SIDH_v1.0/validate.c"
 $3 = 0; //@line 710 "SIDH_v1.0/validate.c"
 $210 = $3; //@line 711 "SIDH_v1.0/validate.c"
 STACKTOP = sp;return ($210|0); //@line 711 "SIDH_v1.0/validate.c"
}
function _sidhjs_randombytes($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3; //@line 19 "sidh.c"
 $5 = $2; //@line 19 "sidh.c"
 _randombytes_buf($4,$5); //@line 19 "sidh.c"
 STACKTOP = sp;return 0; //@line 20 "sidh.c"
}
function _sidhjs_init() {
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 _randombytes_stir(); //@line 24 "sidh.c"
 $0 = (_SIDH_curve_allocate(8)|0); //@line 26 "sidh.c"
 HEAP32[1372] = $0; //@line 26 "sidh.c"
 $1 = HEAP32[1372]|0; //@line 29 "sidh.c"
 $2 = (_SIDH_curve_initialize($1,18,8)|0); //@line 28 "sidh.c"
 return ($2|0); //@line 28 "sidh.c"
}
function _sidhjs_public_key_bytes_base() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1182]|0; //@line 36 "sidh.c"
 return ($0|0); //@line 36 "sidh.c"
}
function _sidhjs_public_key_bytes() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1183]|0; //@line 40 "sidh.c"
 return ($0|0); //@line 40 "sidh.c"
}
function _sidhjs_private_key_bytes_base() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1184]|0; //@line 44 "sidh.c"
 return ($0|0); //@line 44 "sidh.c"
}
function _sidhjs_private_key_bytes() {
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1183]|0; //@line 48 "sidh.c"
 $1 = HEAP32[1185]|0; //@line 48 "sidh.c"
 $2 = (($0) + ($1))|0; //@line 48 "sidh.c"
 return ($2|0); //@line 48 "sidh.c"
}
function _sidhjs_secret_bytes() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 192; //@line 52 "sidh.c"
}
function _sidhjs_keypair_base($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $6; //@line 61 "sidh.c"
 $8 = ($7|0)!=(0); //@line 61 "sidh.c"
 $9 = $5; //@line 62 "sidh.c"
 $10 = $4; //@line 62 "sidh.c"
 $11 = HEAP32[1372]|0; //@line 62 "sidh.c"
 if ($8) {
  $12 = (_KeyGeneration_A($9,$10,$11)|0); //@line 62 "sidh.c"
  $3 = $12; //@line 62 "sidh.c"
  $14 = $3; //@line 67 "sidh.c"
  STACKTOP = sp;return ($14|0); //@line 67 "sidh.c"
 } else {
  $13 = (_KeyGeneration_B($9,$10,$11)|0); //@line 65 "sidh.c"
  $3 = $13; //@line 65 "sidh.c"
  $14 = $3; //@line 67 "sidh.c"
  STACKTOP = sp;return ($14|0); //@line 67 "sidh.c"
 }
 return (0)|0;
}
function _sidhjs_keypair($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $6 = $3; //@line 73 "sidh.c"
 $7 = $4; //@line 73 "sidh.c"
 $8 = (_sidhjs_keypair_base($6,$7,1)|0); //@line 73 "sidh.c"
 $5 = $8; //@line 73 "sidh.c"
 $9 = $5; //@line 75 "sidh.c"
 $10 = ($9|0)!=(0); //@line 75 "sidh.c"
 if ($10) {
  $11 = $5; //@line 76 "sidh.c"
  $2 = $11; //@line 76 "sidh.c"
  $27 = $2; //@line 96 "sidh.c"
  STACKTOP = sp;return ($27|0); //@line 96 "sidh.c"
 }
 $12 = $3; //@line 80 "sidh.c"
 $13 = HEAP32[1182]|0; //@line 80 "sidh.c"
 $14 = (($12) + ($13)|0); //@line 80 "sidh.c"
 $15 = $4; //@line 81 "sidh.c"
 $16 = HEAP32[1184]|0; //@line 81 "sidh.c"
 $17 = (($15) + ($16)|0); //@line 81 "sidh.c"
 $18 = (_sidhjs_keypair_base($14,$17,0)|0); //@line 79 "sidh.c"
 $5 = $18; //@line 79 "sidh.c"
 $19 = $5; //@line 85 "sidh.c"
 $20 = ($19|0)!=(0); //@line 85 "sidh.c"
 if ($20) {
  $21 = $5; //@line 86 "sidh.c"
  $2 = $21; //@line 86 "sidh.c"
  $27 = $2; //@line 96 "sidh.c"
  STACKTOP = sp;return ($27|0); //@line 96 "sidh.c"
 } else {
  $22 = $4; //@line 90 "sidh.c"
  $23 = HEAP32[1185]|0; //@line 90 "sidh.c"
  $24 = (($22) + ($23)|0); //@line 90 "sidh.c"
  $25 = $3; //@line 91 "sidh.c"
  $26 = HEAP32[1183]|0; //@line 92 "sidh.c"
  _memcpy(($24|0),($25|0),($26|0))|0; //@line 89 "sidh.c"
  $2 = 0; //@line 95 "sidh.c"
  $27 = $2; //@line 96 "sidh.c"
  STACKTOP = sp;return ($27|0); //@line 96 "sidh.c"
 }
 return (0)|0;
}
function _sidhjs_secret_base($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(48|0);
 $13 = sp + 36|0;
 $6 = $0;
 $7 = $1;
 $8 = $2;
 $9 = $3;
 $10 = $4;
 $15 = $9; //@line 109 "sidh.c"
 $16 = ($15|0)!=(0); //@line 109 "sidh.c"
 if ($16) {
  $11 = 18; //@line 110 "sidh.c"
  $12 = 18; //@line 111 "sidh.c"
 } else {
  $11 = 19; //@line 114 "sidh.c"
  $12 = 19; //@line 115 "sidh.c"
 }
 $17 = $10; //@line 118 "sidh.c"
 $18 = ($17|0)!=(0); //@line 118 "sidh.c"
 if ($18) {
  $19 = $11; //@line 120 "sidh.c"
  $20 = $6; //@line 120 "sidh.c"
  $21 = HEAP32[1372]|0; //@line 120 "sidh.c"
  $22 = (FUNCTION_TABLE_iiii[$19 & 31]($20,$13,$21)|0); //@line 120 "sidh.c"
  $14 = $22; //@line 120 "sidh.c"
  $23 = $14; //@line 122 "sidh.c"
  $24 = ($23|0)!=(0); //@line 122 "sidh.c"
  if ($24) {
   $25 = $14; //@line 123 "sidh.c"
   $5 = $25; //@line 123 "sidh.c"
   $34 = $5; //@line 131 "sidh.c"
   STACKTOP = sp;return ($34|0); //@line 131 "sidh.c"
  }
  $26 = HEAP8[$13>>0]|0; //@line 125 "sidh.c"
  $27 = $26&1; //@line 125 "sidh.c"
  if (!($27)) {
   $5 = 8; //@line 126 "sidh.c"
   $34 = $5; //@line 131 "sidh.c"
   STACKTOP = sp;return ($34|0); //@line 131 "sidh.c"
  }
 }
 $28 = $12; //@line 130 "sidh.c"
 $29 = $7; //@line 130 "sidh.c"
 $30 = $6; //@line 130 "sidh.c"
 $31 = $8; //@line 130 "sidh.c"
 $32 = HEAP32[1372]|0; //@line 130 "sidh.c"
 $33 = (FUNCTION_TABLE_iiiii[$28 & 31]($29,$30,$31,$32)|0); //@line 130 "sidh.c"
 $5 = $33; //@line 130 "sidh.c"
 $34 = $5; //@line 131 "sidh.c"
 STACKTOP = sp;return ($34|0); //@line 131 "sidh.c"
}
function _sidhjs_secret($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $8 = $4; //@line 139 "sidh.c"
 $9 = $5; //@line 140 "sidh.c"
 $10 = HEAP32[1185]|0; //@line 140 "sidh.c"
 $11 = (($9) + ($10)|0); //@line 140 "sidh.c"
 $12 = HEAP32[1183]|0; //@line 141 "sidh.c"
 $13 = (_sodium_compare($8,$11,$12)|0); //@line 138 "sidh.c"
 $7 = $13; //@line 138 "sidh.c"
 $14 = $7; //@line 144 "sidh.c"
 $15 = ($14|0)==(1); //@line 144 "sidh.c"
 do {
  if ($15) {
   $16 = HEAP32[1182]|0; //@line 145 "sidh.c"
   $17 = $4; //@line 145 "sidh.c"
   $18 = (($17) + ($16)|0); //@line 145 "sidh.c"
   $4 = $18; //@line 145 "sidh.c"
  } else {
   $19 = $7; //@line 147 "sidh.c"
   $20 = ($19|0)==(-1); //@line 147 "sidh.c"
   if ($20) {
    $7 = 0; //@line 148 "sidh.c"
    $21 = HEAP32[1184]|0; //@line 149 "sidh.c"
    $22 = $5; //@line 149 "sidh.c"
    $23 = (($22) + ($21)|0); //@line 149 "sidh.c"
    $5 = $23; //@line 149 "sidh.c"
    break;
   }
   $3 = 6; //@line 152 "sidh.c"
   $29 = $3; //@line 162 "sidh.c"
   STACKTOP = sp;return ($29|0); //@line 162 "sidh.c"
  }
 } while(0);
 $24 = $4; //@line 156 "sidh.c"
 $25 = $5; //@line 157 "sidh.c"
 $26 = $6; //@line 158 "sidh.c"
 $27 = $7; //@line 159 "sidh.c"
 $28 = (_sidhjs_secret_base($24,$25,$26,$27,1)|0); //@line 155 "sidh.c"
 $3 = $28; //@line 155 "sidh.c"
 $29 = $3; //@line 162 "sidh.c"
 STACKTOP = sp;return ($29|0); //@line 162 "sidh.c"
}
function ___errno_location() {
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1373]|0;
 $1 = ($0|0)==(0|0);
 if ($1) {
  $$0 = 5536;
 } else {
  $2 = (_pthread_self()|0);
  $3 = ((($2)) + 64|0);
  $4 = HEAP32[$3>>2]|0;
  $$0 = $4;
 }
 return ($$0|0);
}
function _malloc($0) {
 $0 = $0|0;
 var $$$0190$i = 0, $$$0191$i = 0, $$$4349$i = 0, $$$i = 0, $$0 = 0, $$0$i$i = 0, $$0$i$i$i = 0, $$0$i17$i = 0, $$0$i18$i = 0, $$01$i$i = 0, $$0187$i = 0, $$0189$i = 0, $$0190$i = 0, $$0191$i = 0, $$0197 = 0, $$0199 = 0, $$0206$i$i = 0, $$0207$i$i = 0, $$0211$i$i = 0, $$0212$i$i = 0;
 var $$024370$i = 0, $$0286$i$i = 0, $$0287$i$i = 0, $$0288$i$i = 0, $$0294$i$i = 0, $$0295$i$i = 0, $$0340$i = 0, $$0342$i = 0, $$0343$i = 0, $$0345$i = 0, $$0351$i = 0, $$0356$i = 0, $$0357$$i = 0, $$0357$i = 0, $$0359$i = 0, $$0360$i = 0, $$0366$i = 0, $$1194$i = 0, $$1196$i = 0, $$124469$i = 0;
 var $$1290$i$i = 0, $$1292$i$i = 0, $$1341$i = 0, $$1346$i = 0, $$1361$i = 0, $$1368$i = 0, $$1372$i = 0, $$2247$ph$i = 0, $$2253$ph$i = 0, $$2353$i = 0, $$3$i = 0, $$3$i$i = 0, $$3$i201 = 0, $$3348$i = 0, $$3370$i = 0, $$4$lcssa$i = 0, $$413$i = 0, $$4349$lcssa$i = 0, $$434912$i = 0, $$4355$$4$i = 0;
 var $$4355$ph$i = 0, $$435511$i = 0, $$5256$i = 0, $$723947$i = 0, $$748$i = 0, $$not$i = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i19$i = 0, $$pre$i205 = 0, $$pre$i208 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i20$iZ2D = 0, $$pre$phi$i206Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi10$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre9$i$i = 0, $1 = 0;
 var $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0;
 var $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0;
 var $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0;
 var $1053 = 0, $1054 = 0, $1055 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0;
 var $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0;
 var $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0;
 var $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0;
 var $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0;
 var $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0;
 var $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0;
 var $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0;
 var $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0;
 var $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0;
 var $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0;
 var $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0;
 var $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0;
 var $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0;
 var $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0;
 var $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0;
 var $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0;
 var $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0;
 var $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0;
 var $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0;
 var $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0;
 var $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0;
 var $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0;
 var $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0;
 var $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0;
 var $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0;
 var $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0;
 var $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0;
 var $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0;
 var $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0;
 var $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0;
 var $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0;
 var $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0;
 var $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0;
 var $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0;
 var $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0;
 var $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0;
 var $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0;
 var $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0;
 var $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0;
 var $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0;
 var $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0;
 var $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0;
 var $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0;
 var $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0;
 var $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0;
 var $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0;
 var $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0;
 var $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0;
 var $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $cond$i = 0, $cond$i$i = 0, $cond$i204 = 0, $exitcond$i$i = 0, $not$$i$i = 0, $not$$i22$i = 0;
 var $not$7$i = 0, $or$cond$i = 0, $or$cond$i211 = 0, $or$cond1$i = 0, $or$cond1$i210 = 0, $or$cond10$i = 0, $or$cond11$i = 0, $or$cond12$i = 0, $or$cond2$i = 0, $or$cond5$i = 0, $or$cond50$i = 0, $or$cond7$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = sp;
 $2 = ($0>>>0)<(245);
 do {
  if ($2) {
   $3 = ($0>>>0)<(11);
   $4 = (($0) + 11)|0;
   $5 = $4 & -8;
   $6 = $3 ? 16 : $5;
   $7 = $6 >>> 3;
   $8 = HEAP32[1385]|0;
   $9 = $8 >>> $7;
   $10 = $9 & 3;
   $11 = ($10|0)==(0);
   if (!($11)) {
    $12 = $9 & 1;
    $13 = $12 ^ 1;
    $14 = (($13) + ($7))|0;
    $15 = $14 << 1;
    $16 = (5580 + ($15<<2)|0);
    $17 = ((($16)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ((($18)) + 8|0);
    $20 = HEAP32[$19>>2]|0;
    $21 = ($16|0)==($20|0);
    do {
     if ($21) {
      $22 = 1 << $14;
      $23 = $22 ^ -1;
      $24 = $8 & $23;
      HEAP32[1385] = $24;
     } else {
      $25 = HEAP32[(5556)>>2]|0;
      $26 = ($20>>>0)<($25>>>0);
      if ($26) {
       _abort();
       // unreachable;
      }
      $27 = ((($20)) + 12|0);
      $28 = HEAP32[$27>>2]|0;
      $29 = ($28|0)==($18|0);
      if ($29) {
       HEAP32[$27>>2] = $16;
       HEAP32[$17>>2] = $20;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $30 = $14 << 3;
    $31 = $30 | 3;
    $32 = ((($18)) + 4|0);
    HEAP32[$32>>2] = $31;
    $33 = (($18) + ($30)|0);
    $34 = ((($33)) + 4|0);
    $35 = HEAP32[$34>>2]|0;
    $36 = $35 | 1;
    HEAP32[$34>>2] = $36;
    $$0 = $19;
    STACKTOP = sp;return ($$0|0);
   }
   $37 = HEAP32[(5548)>>2]|0;
   $38 = ($6>>>0)>($37>>>0);
   if ($38) {
    $39 = ($9|0)==(0);
    if (!($39)) {
     $40 = $9 << $7;
     $41 = 2 << $7;
     $42 = (0 - ($41))|0;
     $43 = $41 | $42;
     $44 = $40 & $43;
     $45 = (0 - ($44))|0;
     $46 = $44 & $45;
     $47 = (($46) + -1)|0;
     $48 = $47 >>> 12;
     $49 = $48 & 16;
     $50 = $47 >>> $49;
     $51 = $50 >>> 5;
     $52 = $51 & 8;
     $53 = $52 | $49;
     $54 = $50 >>> $52;
     $55 = $54 >>> 2;
     $56 = $55 & 4;
     $57 = $53 | $56;
     $58 = $54 >>> $56;
     $59 = $58 >>> 1;
     $60 = $59 & 2;
     $61 = $57 | $60;
     $62 = $58 >>> $60;
     $63 = $62 >>> 1;
     $64 = $63 & 1;
     $65 = $61 | $64;
     $66 = $62 >>> $64;
     $67 = (($65) + ($66))|0;
     $68 = $67 << 1;
     $69 = (5580 + ($68<<2)|0);
     $70 = ((($69)) + 8|0);
     $71 = HEAP32[$70>>2]|0;
     $72 = ((($71)) + 8|0);
     $73 = HEAP32[$72>>2]|0;
     $74 = ($69|0)==($73|0);
     do {
      if ($74) {
       $75 = 1 << $67;
       $76 = $75 ^ -1;
       $77 = $8 & $76;
       HEAP32[1385] = $77;
       $98 = $77;
      } else {
       $78 = HEAP32[(5556)>>2]|0;
       $79 = ($73>>>0)<($78>>>0);
       if ($79) {
        _abort();
        // unreachable;
       }
       $80 = ((($73)) + 12|0);
       $81 = HEAP32[$80>>2]|0;
       $82 = ($81|0)==($71|0);
       if ($82) {
        HEAP32[$80>>2] = $69;
        HEAP32[$70>>2] = $73;
        $98 = $8;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $83 = $67 << 3;
     $84 = (($83) - ($6))|0;
     $85 = $6 | 3;
     $86 = ((($71)) + 4|0);
     HEAP32[$86>>2] = $85;
     $87 = (($71) + ($6)|0);
     $88 = $84 | 1;
     $89 = ((($87)) + 4|0);
     HEAP32[$89>>2] = $88;
     $90 = (($87) + ($84)|0);
     HEAP32[$90>>2] = $84;
     $91 = ($37|0)==(0);
     if (!($91)) {
      $92 = HEAP32[(5560)>>2]|0;
      $93 = $37 >>> 3;
      $94 = $93 << 1;
      $95 = (5580 + ($94<<2)|0);
      $96 = 1 << $93;
      $97 = $98 & $96;
      $99 = ($97|0)==(0);
      if ($99) {
       $100 = $98 | $96;
       HEAP32[1385] = $100;
       $$pre = ((($95)) + 8|0);
       $$0199 = $95;$$pre$phiZ2D = $$pre;
      } else {
       $101 = ((($95)) + 8|0);
       $102 = HEAP32[$101>>2]|0;
       $103 = HEAP32[(5556)>>2]|0;
       $104 = ($102>>>0)<($103>>>0);
       if ($104) {
        _abort();
        // unreachable;
       } else {
        $$0199 = $102;$$pre$phiZ2D = $101;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $92;
      $105 = ((($$0199)) + 12|0);
      HEAP32[$105>>2] = $92;
      $106 = ((($92)) + 8|0);
      HEAP32[$106>>2] = $$0199;
      $107 = ((($92)) + 12|0);
      HEAP32[$107>>2] = $95;
     }
     HEAP32[(5548)>>2] = $84;
     HEAP32[(5560)>>2] = $87;
     $$0 = $72;
     STACKTOP = sp;return ($$0|0);
    }
    $108 = HEAP32[(5544)>>2]|0;
    $109 = ($108|0)==(0);
    if ($109) {
     $$0197 = $6;
    } else {
     $110 = (0 - ($108))|0;
     $111 = $108 & $110;
     $112 = (($111) + -1)|0;
     $113 = $112 >>> 12;
     $114 = $113 & 16;
     $115 = $112 >>> $114;
     $116 = $115 >>> 5;
     $117 = $116 & 8;
     $118 = $117 | $114;
     $119 = $115 >>> $117;
     $120 = $119 >>> 2;
     $121 = $120 & 4;
     $122 = $118 | $121;
     $123 = $119 >>> $121;
     $124 = $123 >>> 1;
     $125 = $124 & 2;
     $126 = $122 | $125;
     $127 = $123 >>> $125;
     $128 = $127 >>> 1;
     $129 = $128 & 1;
     $130 = $126 | $129;
     $131 = $127 >>> $129;
     $132 = (($130) + ($131))|0;
     $133 = (5844 + ($132<<2)|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = ((($134)) + 4|0);
     $136 = HEAP32[$135>>2]|0;
     $137 = $136 & -8;
     $138 = (($137) - ($6))|0;
     $$0189$i = $134;$$0190$i = $134;$$0191$i = $138;
     while(1) {
      $139 = ((($$0189$i)) + 16|0);
      $140 = HEAP32[$139>>2]|0;
      $141 = ($140|0)==(0|0);
      if ($141) {
       $142 = ((($$0189$i)) + 20|0);
       $143 = HEAP32[$142>>2]|0;
       $144 = ($143|0)==(0|0);
       if ($144) {
        break;
       } else {
        $146 = $143;
       }
      } else {
       $146 = $140;
      }
      $145 = ((($146)) + 4|0);
      $147 = HEAP32[$145>>2]|0;
      $148 = $147 & -8;
      $149 = (($148) - ($6))|0;
      $150 = ($149>>>0)<($$0191$i>>>0);
      $$$0191$i = $150 ? $149 : $$0191$i;
      $$$0190$i = $150 ? $146 : $$0190$i;
      $$0189$i = $146;$$0190$i = $$$0190$i;$$0191$i = $$$0191$i;
     }
     $151 = HEAP32[(5556)>>2]|0;
     $152 = ($$0190$i>>>0)<($151>>>0);
     if ($152) {
      _abort();
      // unreachable;
     }
     $153 = (($$0190$i) + ($6)|0);
     $154 = ($$0190$i>>>0)<($153>>>0);
     if (!($154)) {
      _abort();
      // unreachable;
     }
     $155 = ((($$0190$i)) + 24|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ((($$0190$i)) + 12|0);
     $158 = HEAP32[$157>>2]|0;
     $159 = ($158|0)==($$0190$i|0);
     do {
      if ($159) {
       $169 = ((($$0190$i)) + 20|0);
       $170 = HEAP32[$169>>2]|0;
       $171 = ($170|0)==(0|0);
       if ($171) {
        $172 = ((($$0190$i)) + 16|0);
        $173 = HEAP32[$172>>2]|0;
        $174 = ($173|0)==(0|0);
        if ($174) {
         $$3$i = 0;
         break;
        } else {
         $$1194$i = $173;$$1196$i = $172;
        }
       } else {
        $$1194$i = $170;$$1196$i = $169;
       }
       while(1) {
        $175 = ((($$1194$i)) + 20|0);
        $176 = HEAP32[$175>>2]|0;
        $177 = ($176|0)==(0|0);
        if (!($177)) {
         $$1194$i = $176;$$1196$i = $175;
         continue;
        }
        $178 = ((($$1194$i)) + 16|0);
        $179 = HEAP32[$178>>2]|0;
        $180 = ($179|0)==(0|0);
        if ($180) {
         break;
        } else {
         $$1194$i = $179;$$1196$i = $178;
        }
       }
       $181 = ($$1196$i>>>0)<($151>>>0);
       if ($181) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$$1196$i>>2] = 0;
        $$3$i = $$1194$i;
        break;
       }
      } else {
       $160 = ((($$0190$i)) + 8|0);
       $161 = HEAP32[$160>>2]|0;
       $162 = ($161>>>0)<($151>>>0);
       if ($162) {
        _abort();
        // unreachable;
       }
       $163 = ((($161)) + 12|0);
       $164 = HEAP32[$163>>2]|0;
       $165 = ($164|0)==($$0190$i|0);
       if (!($165)) {
        _abort();
        // unreachable;
       }
       $166 = ((($158)) + 8|0);
       $167 = HEAP32[$166>>2]|0;
       $168 = ($167|0)==($$0190$i|0);
       if ($168) {
        HEAP32[$163>>2] = $158;
        HEAP32[$166>>2] = $161;
        $$3$i = $158;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $182 = ($156|0)==(0|0);
     do {
      if (!($182)) {
       $183 = ((($$0190$i)) + 28|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = (5844 + ($184<<2)|0);
       $186 = HEAP32[$185>>2]|0;
       $187 = ($$0190$i|0)==($186|0);
       if ($187) {
        HEAP32[$185>>2] = $$3$i;
        $cond$i = ($$3$i|0)==(0|0);
        if ($cond$i) {
         $188 = 1 << $184;
         $189 = $188 ^ -1;
         $190 = $108 & $189;
         HEAP32[(5544)>>2] = $190;
         break;
        }
       } else {
        $191 = HEAP32[(5556)>>2]|0;
        $192 = ($156>>>0)<($191>>>0);
        if ($192) {
         _abort();
         // unreachable;
        }
        $193 = ((($156)) + 16|0);
        $194 = HEAP32[$193>>2]|0;
        $195 = ($194|0)==($$0190$i|0);
        if ($195) {
         HEAP32[$193>>2] = $$3$i;
        } else {
         $196 = ((($156)) + 20|0);
         HEAP32[$196>>2] = $$3$i;
        }
        $197 = ($$3$i|0)==(0|0);
        if ($197) {
         break;
        }
       }
       $198 = HEAP32[(5556)>>2]|0;
       $199 = ($$3$i>>>0)<($198>>>0);
       if ($199) {
        _abort();
        // unreachable;
       }
       $200 = ((($$3$i)) + 24|0);
       HEAP32[$200>>2] = $156;
       $201 = ((($$0190$i)) + 16|0);
       $202 = HEAP32[$201>>2]|0;
       $203 = ($202|0)==(0|0);
       do {
        if (!($203)) {
         $204 = ($202>>>0)<($198>>>0);
         if ($204) {
          _abort();
          // unreachable;
         } else {
          $205 = ((($$3$i)) + 16|0);
          HEAP32[$205>>2] = $202;
          $206 = ((($202)) + 24|0);
          HEAP32[$206>>2] = $$3$i;
          break;
         }
        }
       } while(0);
       $207 = ((($$0190$i)) + 20|0);
       $208 = HEAP32[$207>>2]|0;
       $209 = ($208|0)==(0|0);
       if (!($209)) {
        $210 = HEAP32[(5556)>>2]|0;
        $211 = ($208>>>0)<($210>>>0);
        if ($211) {
         _abort();
         // unreachable;
        } else {
         $212 = ((($$3$i)) + 20|0);
         HEAP32[$212>>2] = $208;
         $213 = ((($208)) + 24|0);
         HEAP32[$213>>2] = $$3$i;
         break;
        }
       }
      }
     } while(0);
     $214 = ($$0191$i>>>0)<(16);
     if ($214) {
      $215 = (($$0191$i) + ($6))|0;
      $216 = $215 | 3;
      $217 = ((($$0190$i)) + 4|0);
      HEAP32[$217>>2] = $216;
      $218 = (($$0190$i) + ($215)|0);
      $219 = ((($218)) + 4|0);
      $220 = HEAP32[$219>>2]|0;
      $221 = $220 | 1;
      HEAP32[$219>>2] = $221;
     } else {
      $222 = $6 | 3;
      $223 = ((($$0190$i)) + 4|0);
      HEAP32[$223>>2] = $222;
      $224 = $$0191$i | 1;
      $225 = ((($153)) + 4|0);
      HEAP32[$225>>2] = $224;
      $226 = (($153) + ($$0191$i)|0);
      HEAP32[$226>>2] = $$0191$i;
      $227 = ($37|0)==(0);
      if (!($227)) {
       $228 = HEAP32[(5560)>>2]|0;
       $229 = $37 >>> 3;
       $230 = $229 << 1;
       $231 = (5580 + ($230<<2)|0);
       $232 = 1 << $229;
       $233 = $8 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $8 | $232;
        HEAP32[1385] = $235;
        $$pre$i = ((($231)) + 8|0);
        $$0187$i = $231;$$pre$phi$iZ2D = $$pre$i;
       } else {
        $236 = ((($231)) + 8|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[(5556)>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$0187$i = $237;$$pre$phi$iZ2D = $236;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $228;
       $240 = ((($$0187$i)) + 12|0);
       HEAP32[$240>>2] = $228;
       $241 = ((($228)) + 8|0);
       HEAP32[$241>>2] = $$0187$i;
       $242 = ((($228)) + 12|0);
       HEAP32[$242>>2] = $231;
      }
      HEAP32[(5548)>>2] = $$0191$i;
      HEAP32[(5560)>>2] = $153;
     }
     $243 = ((($$0190$i)) + 8|0);
     $$0 = $243;
     STACKTOP = sp;return ($$0|0);
    }
   } else {
    $$0197 = $6;
   }
  } else {
   $244 = ($0>>>0)>(4294967231);
   if ($244) {
    $$0197 = -1;
   } else {
    $245 = (($0) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[(5544)>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $$0197 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $$0356$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $$0356$i = 31;
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
       $$0356$i = $274;
      }
     }
     $275 = (5844 + ($$0356$i<<2)|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L123: do {
      if ($277) {
       $$2353$i = 0;$$3$i201 = 0;$$3348$i = $249;
       label = 86;
      } else {
       $278 = ($$0356$i|0)==(31);
       $279 = $$0356$i >>> 1;
       $280 = (25 - ($279))|0;
       $281 = $278 ? 0 : $280;
       $282 = $246 << $281;
       $$0340$i = 0;$$0345$i = $249;$$0351$i = $276;$$0357$i = $282;$$0360$i = 0;
       while(1) {
        $283 = ((($$0351$i)) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($$0345$i>>>0);
        if ($287) {
         $288 = ($286|0)==(0);
         if ($288) {
          $$413$i = $$0351$i;$$434912$i = 0;$$435511$i = $$0351$i;
          label = 90;
          break L123;
         } else {
          $$1341$i = $$0351$i;$$1346$i = $286;
         }
        } else {
         $$1341$i = $$0340$i;$$1346$i = $$0345$i;
        }
        $289 = ((($$0351$i)) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $$0357$i >>> 31;
        $292 = (((($$0351$i)) + 16|0) + ($291<<2)|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond1$i = $294 | $295;
        $$1361$i = $or$cond1$i ? $$0360$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $296&1;
        $298 = $297 ^ 1;
        $$0357$$i = $$0357$i << $298;
        if ($296) {
         $$2353$i = $$1361$i;$$3$i201 = $$1341$i;$$3348$i = $$1346$i;
         label = 86;
         break;
        } else {
         $$0340$i = $$1341$i;$$0345$i = $$1346$i;$$0351$i = $293;$$0357$i = $$0357$$i;$$0360$i = $$1361$i;
        }
       }
      }
     } while(0);
     if ((label|0) == 86) {
      $299 = ($$2353$i|0)==(0|0);
      $300 = ($$3$i201|0)==(0|0);
      $or$cond$i = $299 & $300;
      if ($or$cond$i) {
       $301 = 2 << $$0356$i;
       $302 = (0 - ($301))|0;
       $303 = $301 | $302;
       $304 = $247 & $303;
       $305 = ($304|0)==(0);
       if ($305) {
        $$0197 = $246;
        break;
       }
       $306 = (0 - ($304))|0;
       $307 = $304 & $306;
       $308 = (($307) + -1)|0;
       $309 = $308 >>> 12;
       $310 = $309 & 16;
       $311 = $308 >>> $310;
       $312 = $311 >>> 5;
       $313 = $312 & 8;
       $314 = $313 | $310;
       $315 = $311 >>> $313;
       $316 = $315 >>> 2;
       $317 = $316 & 4;
       $318 = $314 | $317;
       $319 = $315 >>> $317;
       $320 = $319 >>> 1;
       $321 = $320 & 2;
       $322 = $318 | $321;
       $323 = $319 >>> $321;
       $324 = $323 >>> 1;
       $325 = $324 & 1;
       $326 = $322 | $325;
       $327 = $323 >>> $325;
       $328 = (($326) + ($327))|0;
       $329 = (5844 + ($328<<2)|0);
       $330 = HEAP32[$329>>2]|0;
       $$4355$ph$i = $330;
      } else {
       $$4355$ph$i = $$2353$i;
      }
      $331 = ($$4355$ph$i|0)==(0|0);
      if ($331) {
       $$4$lcssa$i = $$3$i201;$$4349$lcssa$i = $$3348$i;
      } else {
       $$413$i = $$3$i201;$$434912$i = $$3348$i;$$435511$i = $$4355$ph$i;
       label = 90;
      }
     }
     if ((label|0) == 90) {
      while(1) {
       label = 0;
       $332 = ((($$435511$i)) + 4|0);
       $333 = HEAP32[$332>>2]|0;
       $334 = $333 & -8;
       $335 = (($334) - ($246))|0;
       $336 = ($335>>>0)<($$434912$i>>>0);
       $$$4349$i = $336 ? $335 : $$434912$i;
       $$4355$$4$i = $336 ? $$435511$i : $$413$i;
       $337 = ((($$435511$i)) + 16|0);
       $338 = HEAP32[$337>>2]|0;
       $339 = ($338|0)==(0|0);
       if (!($339)) {
        $$413$i = $$4355$$4$i;$$434912$i = $$$4349$i;$$435511$i = $338;
        label = 90;
        continue;
       }
       $340 = ((($$435511$i)) + 20|0);
       $341 = HEAP32[$340>>2]|0;
       $342 = ($341|0)==(0|0);
       if ($342) {
        $$4$lcssa$i = $$4355$$4$i;$$4349$lcssa$i = $$$4349$i;
        break;
       } else {
        $$413$i = $$4355$$4$i;$$434912$i = $$$4349$i;$$435511$i = $341;
        label = 90;
       }
      }
     }
     $343 = ($$4$lcssa$i|0)==(0|0);
     if ($343) {
      $$0197 = $246;
     } else {
      $344 = HEAP32[(5548)>>2]|0;
      $345 = (($344) - ($246))|0;
      $346 = ($$4349$lcssa$i>>>0)<($345>>>0);
      if ($346) {
       $347 = HEAP32[(5556)>>2]|0;
       $348 = ($$4$lcssa$i>>>0)<($347>>>0);
       if ($348) {
        _abort();
        // unreachable;
       }
       $349 = (($$4$lcssa$i) + ($246)|0);
       $350 = ($$4$lcssa$i>>>0)<($349>>>0);
       if (!($350)) {
        _abort();
        // unreachable;
       }
       $351 = ((($$4$lcssa$i)) + 24|0);
       $352 = HEAP32[$351>>2]|0;
       $353 = ((($$4$lcssa$i)) + 12|0);
       $354 = HEAP32[$353>>2]|0;
       $355 = ($354|0)==($$4$lcssa$i|0);
       do {
        if ($355) {
         $365 = ((($$4$lcssa$i)) + 20|0);
         $366 = HEAP32[$365>>2]|0;
         $367 = ($366|0)==(0|0);
         if ($367) {
          $368 = ((($$4$lcssa$i)) + 16|0);
          $369 = HEAP32[$368>>2]|0;
          $370 = ($369|0)==(0|0);
          if ($370) {
           $$3370$i = 0;
           break;
          } else {
           $$1368$i = $369;$$1372$i = $368;
          }
         } else {
          $$1368$i = $366;$$1372$i = $365;
         }
         while(1) {
          $371 = ((($$1368$i)) + 20|0);
          $372 = HEAP32[$371>>2]|0;
          $373 = ($372|0)==(0|0);
          if (!($373)) {
           $$1368$i = $372;$$1372$i = $371;
           continue;
          }
          $374 = ((($$1368$i)) + 16|0);
          $375 = HEAP32[$374>>2]|0;
          $376 = ($375|0)==(0|0);
          if ($376) {
           break;
          } else {
           $$1368$i = $375;$$1372$i = $374;
          }
         }
         $377 = ($$1372$i>>>0)<($347>>>0);
         if ($377) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$$1372$i>>2] = 0;
          $$3370$i = $$1368$i;
          break;
         }
        } else {
         $356 = ((($$4$lcssa$i)) + 8|0);
         $357 = HEAP32[$356>>2]|0;
         $358 = ($357>>>0)<($347>>>0);
         if ($358) {
          _abort();
          // unreachable;
         }
         $359 = ((($357)) + 12|0);
         $360 = HEAP32[$359>>2]|0;
         $361 = ($360|0)==($$4$lcssa$i|0);
         if (!($361)) {
          _abort();
          // unreachable;
         }
         $362 = ((($354)) + 8|0);
         $363 = HEAP32[$362>>2]|0;
         $364 = ($363|0)==($$4$lcssa$i|0);
         if ($364) {
          HEAP32[$359>>2] = $354;
          HEAP32[$362>>2] = $357;
          $$3370$i = $354;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $378 = ($352|0)==(0|0);
       do {
        if ($378) {
         $470 = $247;
        } else {
         $379 = ((($$4$lcssa$i)) + 28|0);
         $380 = HEAP32[$379>>2]|0;
         $381 = (5844 + ($380<<2)|0);
         $382 = HEAP32[$381>>2]|0;
         $383 = ($$4$lcssa$i|0)==($382|0);
         if ($383) {
          HEAP32[$381>>2] = $$3370$i;
          $cond$i204 = ($$3370$i|0)==(0|0);
          if ($cond$i204) {
           $384 = 1 << $380;
           $385 = $384 ^ -1;
           $386 = $247 & $385;
           HEAP32[(5544)>>2] = $386;
           $470 = $386;
           break;
          }
         } else {
          $387 = HEAP32[(5556)>>2]|0;
          $388 = ($352>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = ((($352)) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($$4$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $$3370$i;
          } else {
           $392 = ((($352)) + 20|0);
           HEAP32[$392>>2] = $$3370$i;
          }
          $393 = ($$3370$i|0)==(0|0);
          if ($393) {
           $470 = $247;
           break;
          }
         }
         $394 = HEAP32[(5556)>>2]|0;
         $395 = ($$3370$i>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = ((($$3370$i)) + 24|0);
         HEAP32[$396>>2] = $352;
         $397 = ((($$4$lcssa$i)) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = ((($$3370$i)) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = ((($398)) + 24|0);
            HEAP32[$402>>2] = $$3370$i;
            break;
           }
          }
         } while(0);
         $403 = ((($$4$lcssa$i)) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if ($405) {
          $470 = $247;
         } else {
          $406 = HEAP32[(5556)>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = ((($$3370$i)) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = ((($404)) + 24|0);
           HEAP32[$409>>2] = $$3370$i;
           $470 = $247;
           break;
          }
         }
        }
       } while(0);
       $410 = ($$4349$lcssa$i>>>0)<(16);
       do {
        if ($410) {
         $411 = (($$4349$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = ((($$4$lcssa$i)) + 4|0);
         HEAP32[$413>>2] = $412;
         $414 = (($$4$lcssa$i) + ($411)|0);
         $415 = ((($414)) + 4|0);
         $416 = HEAP32[$415>>2]|0;
         $417 = $416 | 1;
         HEAP32[$415>>2] = $417;
        } else {
         $418 = $246 | 3;
         $419 = ((($$4$lcssa$i)) + 4|0);
         HEAP32[$419>>2] = $418;
         $420 = $$4349$lcssa$i | 1;
         $421 = ((($349)) + 4|0);
         HEAP32[$421>>2] = $420;
         $422 = (($349) + ($$4349$lcssa$i)|0);
         HEAP32[$422>>2] = $$4349$lcssa$i;
         $423 = $$4349$lcssa$i >>> 3;
         $424 = ($$4349$lcssa$i>>>0)<(256);
         if ($424) {
          $425 = $423 << 1;
          $426 = (5580 + ($425<<2)|0);
          $427 = HEAP32[1385]|0;
          $428 = 1 << $423;
          $429 = $427 & $428;
          $430 = ($429|0)==(0);
          if ($430) {
           $431 = $427 | $428;
           HEAP32[1385] = $431;
           $$pre$i205 = ((($426)) + 8|0);
           $$0366$i = $426;$$pre$phi$i206Z2D = $$pre$i205;
          } else {
           $432 = ((($426)) + 8|0);
           $433 = HEAP32[$432>>2]|0;
           $434 = HEAP32[(5556)>>2]|0;
           $435 = ($433>>>0)<($434>>>0);
           if ($435) {
            _abort();
            // unreachable;
           } else {
            $$0366$i = $433;$$pre$phi$i206Z2D = $432;
           }
          }
          HEAP32[$$pre$phi$i206Z2D>>2] = $349;
          $436 = ((($$0366$i)) + 12|0);
          HEAP32[$436>>2] = $349;
          $437 = ((($349)) + 8|0);
          HEAP32[$437>>2] = $$0366$i;
          $438 = ((($349)) + 12|0);
          HEAP32[$438>>2] = $426;
          break;
         }
         $439 = $$4349$lcssa$i >>> 8;
         $440 = ($439|0)==(0);
         if ($440) {
          $$0359$i = 0;
         } else {
          $441 = ($$4349$lcssa$i>>>0)>(16777215);
          if ($441) {
           $$0359$i = 31;
          } else {
           $442 = (($439) + 1048320)|0;
           $443 = $442 >>> 16;
           $444 = $443 & 8;
           $445 = $439 << $444;
           $446 = (($445) + 520192)|0;
           $447 = $446 >>> 16;
           $448 = $447 & 4;
           $449 = $448 | $444;
           $450 = $445 << $448;
           $451 = (($450) + 245760)|0;
           $452 = $451 >>> 16;
           $453 = $452 & 2;
           $454 = $449 | $453;
           $455 = (14 - ($454))|0;
           $456 = $450 << $453;
           $457 = $456 >>> 15;
           $458 = (($455) + ($457))|0;
           $459 = $458 << 1;
           $460 = (($458) + 7)|0;
           $461 = $$4349$lcssa$i >>> $460;
           $462 = $461 & 1;
           $463 = $462 | $459;
           $$0359$i = $463;
          }
         }
         $464 = (5844 + ($$0359$i<<2)|0);
         $465 = ((($349)) + 28|0);
         HEAP32[$465>>2] = $$0359$i;
         $466 = ((($349)) + 16|0);
         $467 = ((($466)) + 4|0);
         HEAP32[$467>>2] = 0;
         HEAP32[$466>>2] = 0;
         $468 = 1 << $$0359$i;
         $469 = $470 & $468;
         $471 = ($469|0)==(0);
         if ($471) {
          $472 = $470 | $468;
          HEAP32[(5544)>>2] = $472;
          HEAP32[$464>>2] = $349;
          $473 = ((($349)) + 24|0);
          HEAP32[$473>>2] = $464;
          $474 = ((($349)) + 12|0);
          HEAP32[$474>>2] = $349;
          $475 = ((($349)) + 8|0);
          HEAP32[$475>>2] = $349;
          break;
         }
         $476 = HEAP32[$464>>2]|0;
         $477 = ($$0359$i|0)==(31);
         $478 = $$0359$i >>> 1;
         $479 = (25 - ($478))|0;
         $480 = $477 ? 0 : $479;
         $481 = $$4349$lcssa$i << $480;
         $$0342$i = $481;$$0343$i = $476;
         while(1) {
          $482 = ((($$0343$i)) + 4|0);
          $483 = HEAP32[$482>>2]|0;
          $484 = $483 & -8;
          $485 = ($484|0)==($$4349$lcssa$i|0);
          if ($485) {
           label = 148;
           break;
          }
          $486 = $$0342$i >>> 31;
          $487 = (((($$0343$i)) + 16|0) + ($486<<2)|0);
          $488 = $$0342$i << 1;
          $489 = HEAP32[$487>>2]|0;
          $490 = ($489|0)==(0|0);
          if ($490) {
           label = 145;
           break;
          } else {
           $$0342$i = $488;$$0343$i = $489;
          }
         }
         if ((label|0) == 145) {
          $491 = HEAP32[(5556)>>2]|0;
          $492 = ($487>>>0)<($491>>>0);
          if ($492) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$487>>2] = $349;
           $493 = ((($349)) + 24|0);
           HEAP32[$493>>2] = $$0343$i;
           $494 = ((($349)) + 12|0);
           HEAP32[$494>>2] = $349;
           $495 = ((($349)) + 8|0);
           HEAP32[$495>>2] = $349;
           break;
          }
         }
         else if ((label|0) == 148) {
          $496 = ((($$0343$i)) + 8|0);
          $497 = HEAP32[$496>>2]|0;
          $498 = HEAP32[(5556)>>2]|0;
          $499 = ($497>>>0)>=($498>>>0);
          $not$7$i = ($$0343$i>>>0)>=($498>>>0);
          $500 = $499 & $not$7$i;
          if ($500) {
           $501 = ((($497)) + 12|0);
           HEAP32[$501>>2] = $349;
           HEAP32[$496>>2] = $349;
           $502 = ((($349)) + 8|0);
           HEAP32[$502>>2] = $497;
           $503 = ((($349)) + 12|0);
           HEAP32[$503>>2] = $$0343$i;
           $504 = ((($349)) + 24|0);
           HEAP32[$504>>2] = 0;
           break;
          } else {
           _abort();
           // unreachable;
          }
         }
        }
       } while(0);
       $505 = ((($$4$lcssa$i)) + 8|0);
       $$0 = $505;
       STACKTOP = sp;return ($$0|0);
      } else {
       $$0197 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $506 = HEAP32[(5548)>>2]|0;
 $507 = ($506>>>0)<($$0197>>>0);
 if (!($507)) {
  $508 = (($506) - ($$0197))|0;
  $509 = HEAP32[(5560)>>2]|0;
  $510 = ($508>>>0)>(15);
  if ($510) {
   $511 = (($509) + ($$0197)|0);
   HEAP32[(5560)>>2] = $511;
   HEAP32[(5548)>>2] = $508;
   $512 = $508 | 1;
   $513 = ((($511)) + 4|0);
   HEAP32[$513>>2] = $512;
   $514 = (($511) + ($508)|0);
   HEAP32[$514>>2] = $508;
   $515 = $$0197 | 3;
   $516 = ((($509)) + 4|0);
   HEAP32[$516>>2] = $515;
  } else {
   HEAP32[(5548)>>2] = 0;
   HEAP32[(5560)>>2] = 0;
   $517 = $506 | 3;
   $518 = ((($509)) + 4|0);
   HEAP32[$518>>2] = $517;
   $519 = (($509) + ($506)|0);
   $520 = ((($519)) + 4|0);
   $521 = HEAP32[$520>>2]|0;
   $522 = $521 | 1;
   HEAP32[$520>>2] = $522;
  }
  $523 = ((($509)) + 8|0);
  $$0 = $523;
  STACKTOP = sp;return ($$0|0);
 }
 $524 = HEAP32[(5552)>>2]|0;
 $525 = ($524>>>0)>($$0197>>>0);
 if ($525) {
  $526 = (($524) - ($$0197))|0;
  HEAP32[(5552)>>2] = $526;
  $527 = HEAP32[(5564)>>2]|0;
  $528 = (($527) + ($$0197)|0);
  HEAP32[(5564)>>2] = $528;
  $529 = $526 | 1;
  $530 = ((($528)) + 4|0);
  HEAP32[$530>>2] = $529;
  $531 = $$0197 | 3;
  $532 = ((($527)) + 4|0);
  HEAP32[$532>>2] = $531;
  $533 = ((($527)) + 8|0);
  $$0 = $533;
  STACKTOP = sp;return ($$0|0);
 }
 $534 = HEAP32[1503]|0;
 $535 = ($534|0)==(0);
 if ($535) {
  HEAP32[(6020)>>2] = 4096;
  HEAP32[(6016)>>2] = 4096;
  HEAP32[(6024)>>2] = -1;
  HEAP32[(6028)>>2] = -1;
  HEAP32[(6032)>>2] = 0;
  HEAP32[(5984)>>2] = 0;
  $536 = $1;
  $537 = $536 & -16;
  $538 = $537 ^ 1431655768;
  HEAP32[$1>>2] = $538;
  HEAP32[1503] = $538;
  $542 = 4096;
 } else {
  $$pre$i208 = HEAP32[(6020)>>2]|0;
  $542 = $$pre$i208;
 }
 $539 = (($$0197) + 48)|0;
 $540 = (($$0197) + 47)|0;
 $541 = (($542) + ($540))|0;
 $543 = (0 - ($542))|0;
 $544 = $541 & $543;
 $545 = ($544>>>0)>($$0197>>>0);
 if (!($545)) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $546 = HEAP32[(5980)>>2]|0;
 $547 = ($546|0)==(0);
 if (!($547)) {
  $548 = HEAP32[(5972)>>2]|0;
  $549 = (($548) + ($544))|0;
  $550 = ($549>>>0)<=($548>>>0);
  $551 = ($549>>>0)>($546>>>0);
  $or$cond1$i210 = $550 | $551;
  if ($or$cond1$i210) {
   $$0 = 0;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $552 = HEAP32[(5984)>>2]|0;
 $553 = $552 & 4;
 $554 = ($553|0)==(0);
 L255: do {
  if ($554) {
   $555 = HEAP32[(5564)>>2]|0;
   $556 = ($555|0)==(0|0);
   L257: do {
    if ($556) {
     label = 172;
    } else {
     $$0$i17$i = (5988);
     while(1) {
      $557 = HEAP32[$$0$i17$i>>2]|0;
      $558 = ($557>>>0)>($555>>>0);
      if (!($558)) {
       $559 = ((($$0$i17$i)) + 4|0);
       $560 = HEAP32[$559>>2]|0;
       $561 = (($557) + ($560)|0);
       $562 = ($561>>>0)>($555>>>0);
       if ($562) {
        break;
       }
      }
      $563 = ((($$0$i17$i)) + 8|0);
      $564 = HEAP32[$563>>2]|0;
      $565 = ($564|0)==(0|0);
      if ($565) {
       label = 172;
       break L257;
      } else {
       $$0$i17$i = $564;
      }
     }
     $588 = (($541) - ($524))|0;
     $589 = $588 & $543;
     $590 = ($589>>>0)<(2147483647);
     if ($590) {
      $591 = (_sbrk(($589|0))|0);
      $592 = HEAP32[$$0$i17$i>>2]|0;
      $593 = HEAP32[$559>>2]|0;
      $594 = (($592) + ($593)|0);
      $595 = ($591|0)==($594|0);
      if ($595) {
       $596 = ($591|0)==((-1)|0);
       if (!($596)) {
        $$723947$i = $589;$$748$i = $591;
        label = 190;
        break L255;
       }
      } else {
       $$2247$ph$i = $591;$$2253$ph$i = $589;
       label = 180;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 172) {
     $566 = (_sbrk(0)|0);
     $567 = ($566|0)==((-1)|0);
     if (!($567)) {
      $568 = $566;
      $569 = HEAP32[(6016)>>2]|0;
      $570 = (($569) + -1)|0;
      $571 = $570 & $568;
      $572 = ($571|0)==(0);
      $573 = (($570) + ($568))|0;
      $574 = (0 - ($569))|0;
      $575 = $573 & $574;
      $576 = (($575) - ($568))|0;
      $577 = $572 ? 0 : $576;
      $$$i = (($577) + ($544))|0;
      $578 = HEAP32[(5972)>>2]|0;
      $579 = (($$$i) + ($578))|0;
      $580 = ($$$i>>>0)>($$0197>>>0);
      $581 = ($$$i>>>0)<(2147483647);
      $or$cond$i211 = $580 & $581;
      if ($or$cond$i211) {
       $582 = HEAP32[(5980)>>2]|0;
       $583 = ($582|0)==(0);
       if (!($583)) {
        $584 = ($579>>>0)<=($578>>>0);
        $585 = ($579>>>0)>($582>>>0);
        $or$cond2$i = $584 | $585;
        if ($or$cond2$i) {
         break;
        }
       }
       $586 = (_sbrk(($$$i|0))|0);
       $587 = ($586|0)==($566|0);
       if ($587) {
        $$723947$i = $$$i;$$748$i = $566;
        label = 190;
        break L255;
       } else {
        $$2247$ph$i = $586;$$2253$ph$i = $$$i;
        label = 180;
       }
      }
     }
    }
   } while(0);
   L274: do {
    if ((label|0) == 180) {
     $597 = (0 - ($$2253$ph$i))|0;
     $598 = ($$2247$ph$i|0)!=((-1)|0);
     $599 = ($$2253$ph$i>>>0)<(2147483647);
     $or$cond7$i = $599 & $598;
     $600 = ($539>>>0)>($$2253$ph$i>>>0);
     $or$cond10$i = $600 & $or$cond7$i;
     do {
      if ($or$cond10$i) {
       $601 = HEAP32[(6020)>>2]|0;
       $602 = (($540) - ($$2253$ph$i))|0;
       $603 = (($602) + ($601))|0;
       $604 = (0 - ($601))|0;
       $605 = $603 & $604;
       $606 = ($605>>>0)<(2147483647);
       if ($606) {
        $607 = (_sbrk(($605|0))|0);
        $608 = ($607|0)==((-1)|0);
        if ($608) {
         (_sbrk(($597|0))|0);
         break L274;
        } else {
         $609 = (($605) + ($$2253$ph$i))|0;
         $$5256$i = $609;
         break;
        }
       } else {
        $$5256$i = $$2253$ph$i;
       }
      } else {
       $$5256$i = $$2253$ph$i;
      }
     } while(0);
     $610 = ($$2247$ph$i|0)==((-1)|0);
     if (!($610)) {
      $$723947$i = $$5256$i;$$748$i = $$2247$ph$i;
      label = 190;
      break L255;
     }
    }
   } while(0);
   $611 = HEAP32[(5984)>>2]|0;
   $612 = $611 | 4;
   HEAP32[(5984)>>2] = $612;
   label = 187;
  } else {
   label = 187;
  }
 } while(0);
 if ((label|0) == 187) {
  $613 = ($544>>>0)<(2147483647);
  if ($613) {
   $614 = (_sbrk(($544|0))|0);
   $615 = (_sbrk(0)|0);
   $616 = ($614|0)!=((-1)|0);
   $617 = ($615|0)!=((-1)|0);
   $or$cond5$i = $616 & $617;
   $618 = ($614>>>0)<($615>>>0);
   $or$cond11$i = $618 & $or$cond5$i;
   if ($or$cond11$i) {
    $619 = $615;
    $620 = $614;
    $621 = (($619) - ($620))|0;
    $622 = (($$0197) + 40)|0;
    $$not$i = ($621>>>0)>($622>>>0);
    if ($$not$i) {
     $$723947$i = $621;$$748$i = $614;
     label = 190;
    }
   }
  }
 }
 if ((label|0) == 190) {
  $623 = HEAP32[(5972)>>2]|0;
  $624 = (($623) + ($$723947$i))|0;
  HEAP32[(5972)>>2] = $624;
  $625 = HEAP32[(5976)>>2]|0;
  $626 = ($624>>>0)>($625>>>0);
  if ($626) {
   HEAP32[(5976)>>2] = $624;
  }
  $627 = HEAP32[(5564)>>2]|0;
  $628 = ($627|0)==(0|0);
  do {
   if ($628) {
    $629 = HEAP32[(5556)>>2]|0;
    $630 = ($629|0)==(0|0);
    $631 = ($$748$i>>>0)<($629>>>0);
    $or$cond12$i = $630 | $631;
    if ($or$cond12$i) {
     HEAP32[(5556)>>2] = $$748$i;
    }
    HEAP32[(5988)>>2] = $$748$i;
    HEAP32[(5992)>>2] = $$723947$i;
    HEAP32[(6000)>>2] = 0;
    $632 = HEAP32[1503]|0;
    HEAP32[(5576)>>2] = $632;
    HEAP32[(5572)>>2] = -1;
    $$01$i$i = 0;
    while(1) {
     $633 = $$01$i$i << 1;
     $634 = (5580 + ($633<<2)|0);
     $635 = ((($634)) + 12|0);
     HEAP32[$635>>2] = $634;
     $636 = ((($634)) + 8|0);
     HEAP32[$636>>2] = $634;
     $637 = (($$01$i$i) + 1)|0;
     $exitcond$i$i = ($637|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $$01$i$i = $637;
     }
    }
    $638 = (($$723947$i) + -40)|0;
    $639 = ((($$748$i)) + 8|0);
    $640 = $639;
    $641 = $640 & 7;
    $642 = ($641|0)==(0);
    $643 = (0 - ($640))|0;
    $644 = $643 & 7;
    $645 = $642 ? 0 : $644;
    $646 = (($$748$i) + ($645)|0);
    $647 = (($638) - ($645))|0;
    HEAP32[(5564)>>2] = $646;
    HEAP32[(5552)>>2] = $647;
    $648 = $647 | 1;
    $649 = ((($646)) + 4|0);
    HEAP32[$649>>2] = $648;
    $650 = (($646) + ($647)|0);
    $651 = ((($650)) + 4|0);
    HEAP32[$651>>2] = 40;
    $652 = HEAP32[(6028)>>2]|0;
    HEAP32[(5568)>>2] = $652;
   } else {
    $$024370$i = (5988);
    while(1) {
     $653 = HEAP32[$$024370$i>>2]|0;
     $654 = ((($$024370$i)) + 4|0);
     $655 = HEAP32[$654>>2]|0;
     $656 = (($653) + ($655)|0);
     $657 = ($$748$i|0)==($656|0);
     if ($657) {
      label = 200;
      break;
     }
     $658 = ((($$024370$i)) + 8|0);
     $659 = HEAP32[$658>>2]|0;
     $660 = ($659|0)==(0|0);
     if ($660) {
      break;
     } else {
      $$024370$i = $659;
     }
    }
    if ((label|0) == 200) {
     $661 = ((($$024370$i)) + 12|0);
     $662 = HEAP32[$661>>2]|0;
     $663 = $662 & 8;
     $664 = ($663|0)==(0);
     if ($664) {
      $665 = ($627>>>0)>=($653>>>0);
      $666 = ($627>>>0)<($$748$i>>>0);
      $or$cond50$i = $666 & $665;
      if ($or$cond50$i) {
       $667 = (($655) + ($$723947$i))|0;
       HEAP32[$654>>2] = $667;
       $668 = HEAP32[(5552)>>2]|0;
       $669 = ((($627)) + 8|0);
       $670 = $669;
       $671 = $670 & 7;
       $672 = ($671|0)==(0);
       $673 = (0 - ($670))|0;
       $674 = $673 & 7;
       $675 = $672 ? 0 : $674;
       $676 = (($627) + ($675)|0);
       $677 = (($$723947$i) - ($675))|0;
       $678 = (($677) + ($668))|0;
       HEAP32[(5564)>>2] = $676;
       HEAP32[(5552)>>2] = $678;
       $679 = $678 | 1;
       $680 = ((($676)) + 4|0);
       HEAP32[$680>>2] = $679;
       $681 = (($676) + ($678)|0);
       $682 = ((($681)) + 4|0);
       HEAP32[$682>>2] = 40;
       $683 = HEAP32[(6028)>>2]|0;
       HEAP32[(5568)>>2] = $683;
       break;
      }
     }
    }
    $684 = HEAP32[(5556)>>2]|0;
    $685 = ($$748$i>>>0)<($684>>>0);
    if ($685) {
     HEAP32[(5556)>>2] = $$748$i;
     $749 = $$748$i;
    } else {
     $749 = $684;
    }
    $686 = (($$748$i) + ($$723947$i)|0);
    $$124469$i = (5988);
    while(1) {
     $687 = HEAP32[$$124469$i>>2]|0;
     $688 = ($687|0)==($686|0);
     if ($688) {
      label = 208;
      break;
     }
     $689 = ((($$124469$i)) + 8|0);
     $690 = HEAP32[$689>>2]|0;
     $691 = ($690|0)==(0|0);
     if ($691) {
      $$0$i$i$i = (5988);
      break;
     } else {
      $$124469$i = $690;
     }
    }
    if ((label|0) == 208) {
     $692 = ((($$124469$i)) + 12|0);
     $693 = HEAP32[$692>>2]|0;
     $694 = $693 & 8;
     $695 = ($694|0)==(0);
     if ($695) {
      HEAP32[$$124469$i>>2] = $$748$i;
      $696 = ((($$124469$i)) + 4|0);
      $697 = HEAP32[$696>>2]|0;
      $698 = (($697) + ($$723947$i))|0;
      HEAP32[$696>>2] = $698;
      $699 = ((($$748$i)) + 8|0);
      $700 = $699;
      $701 = $700 & 7;
      $702 = ($701|0)==(0);
      $703 = (0 - ($700))|0;
      $704 = $703 & 7;
      $705 = $702 ? 0 : $704;
      $706 = (($$748$i) + ($705)|0);
      $707 = ((($686)) + 8|0);
      $708 = $707;
      $709 = $708 & 7;
      $710 = ($709|0)==(0);
      $711 = (0 - ($708))|0;
      $712 = $711 & 7;
      $713 = $710 ? 0 : $712;
      $714 = (($686) + ($713)|0);
      $715 = $714;
      $716 = $706;
      $717 = (($715) - ($716))|0;
      $718 = (($706) + ($$0197)|0);
      $719 = (($717) - ($$0197))|0;
      $720 = $$0197 | 3;
      $721 = ((($706)) + 4|0);
      HEAP32[$721>>2] = $720;
      $722 = ($714|0)==($627|0);
      do {
       if ($722) {
        $723 = HEAP32[(5552)>>2]|0;
        $724 = (($723) + ($719))|0;
        HEAP32[(5552)>>2] = $724;
        HEAP32[(5564)>>2] = $718;
        $725 = $724 | 1;
        $726 = ((($718)) + 4|0);
        HEAP32[$726>>2] = $725;
       } else {
        $727 = HEAP32[(5560)>>2]|0;
        $728 = ($714|0)==($727|0);
        if ($728) {
         $729 = HEAP32[(5548)>>2]|0;
         $730 = (($729) + ($719))|0;
         HEAP32[(5548)>>2] = $730;
         HEAP32[(5560)>>2] = $718;
         $731 = $730 | 1;
         $732 = ((($718)) + 4|0);
         HEAP32[$732>>2] = $731;
         $733 = (($718) + ($730)|0);
         HEAP32[$733>>2] = $730;
         break;
        }
        $734 = ((($714)) + 4|0);
        $735 = HEAP32[$734>>2]|0;
        $736 = $735 & 3;
        $737 = ($736|0)==(1);
        if ($737) {
         $738 = $735 & -8;
         $739 = $735 >>> 3;
         $740 = ($735>>>0)<(256);
         L326: do {
          if ($740) {
           $741 = ((($714)) + 8|0);
           $742 = HEAP32[$741>>2]|0;
           $743 = ((($714)) + 12|0);
           $744 = HEAP32[$743>>2]|0;
           $745 = $739 << 1;
           $746 = (5580 + ($745<<2)|0);
           $747 = ($742|0)==($746|0);
           do {
            if (!($747)) {
             $748 = ($742>>>0)<($749>>>0);
             if ($748) {
              _abort();
              // unreachable;
             }
             $750 = ((($742)) + 12|0);
             $751 = HEAP32[$750>>2]|0;
             $752 = ($751|0)==($714|0);
             if ($752) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $753 = ($744|0)==($742|0);
           if ($753) {
            $754 = 1 << $739;
            $755 = $754 ^ -1;
            $756 = HEAP32[1385]|0;
            $757 = $756 & $755;
            HEAP32[1385] = $757;
            break;
           }
           $758 = ($744|0)==($746|0);
           do {
            if ($758) {
             $$pre9$i$i = ((($744)) + 8|0);
             $$pre$phi10$i$iZ2D = $$pre9$i$i;
            } else {
             $759 = ($744>>>0)<($749>>>0);
             if ($759) {
              _abort();
              // unreachable;
             }
             $760 = ((($744)) + 8|0);
             $761 = HEAP32[$760>>2]|0;
             $762 = ($761|0)==($714|0);
             if ($762) {
              $$pre$phi10$i$iZ2D = $760;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $763 = ((($742)) + 12|0);
           HEAP32[$763>>2] = $744;
           HEAP32[$$pre$phi10$i$iZ2D>>2] = $742;
          } else {
           $764 = ((($714)) + 24|0);
           $765 = HEAP32[$764>>2]|0;
           $766 = ((($714)) + 12|0);
           $767 = HEAP32[$766>>2]|0;
           $768 = ($767|0)==($714|0);
           do {
            if ($768) {
             $778 = ((($714)) + 16|0);
             $779 = ((($778)) + 4|0);
             $780 = HEAP32[$779>>2]|0;
             $781 = ($780|0)==(0|0);
             if ($781) {
              $782 = HEAP32[$778>>2]|0;
              $783 = ($782|0)==(0|0);
              if ($783) {
               $$3$i$i = 0;
               break;
              } else {
               $$1290$i$i = $782;$$1292$i$i = $778;
              }
             } else {
              $$1290$i$i = $780;$$1292$i$i = $779;
             }
             while(1) {
              $784 = ((($$1290$i$i)) + 20|0);
              $785 = HEAP32[$784>>2]|0;
              $786 = ($785|0)==(0|0);
              if (!($786)) {
               $$1290$i$i = $785;$$1292$i$i = $784;
               continue;
              }
              $787 = ((($$1290$i$i)) + 16|0);
              $788 = HEAP32[$787>>2]|0;
              $789 = ($788|0)==(0|0);
              if ($789) {
               break;
              } else {
               $$1290$i$i = $788;$$1292$i$i = $787;
              }
             }
             $790 = ($$1292$i$i>>>0)<($749>>>0);
             if ($790) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$$1292$i$i>>2] = 0;
              $$3$i$i = $$1290$i$i;
              break;
             }
            } else {
             $769 = ((($714)) + 8|0);
             $770 = HEAP32[$769>>2]|0;
             $771 = ($770>>>0)<($749>>>0);
             if ($771) {
              _abort();
              // unreachable;
             }
             $772 = ((($770)) + 12|0);
             $773 = HEAP32[$772>>2]|0;
             $774 = ($773|0)==($714|0);
             if (!($774)) {
              _abort();
              // unreachable;
             }
             $775 = ((($767)) + 8|0);
             $776 = HEAP32[$775>>2]|0;
             $777 = ($776|0)==($714|0);
             if ($777) {
              HEAP32[$772>>2] = $767;
              HEAP32[$775>>2] = $770;
              $$3$i$i = $767;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $791 = ($765|0)==(0|0);
           if ($791) {
            break;
           }
           $792 = ((($714)) + 28|0);
           $793 = HEAP32[$792>>2]|0;
           $794 = (5844 + ($793<<2)|0);
           $795 = HEAP32[$794>>2]|0;
           $796 = ($714|0)==($795|0);
           do {
            if ($796) {
             HEAP32[$794>>2] = $$3$i$i;
             $cond$i$i = ($$3$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $797 = 1 << $793;
             $798 = $797 ^ -1;
             $799 = HEAP32[(5544)>>2]|0;
             $800 = $799 & $798;
             HEAP32[(5544)>>2] = $800;
             break L326;
            } else {
             $801 = HEAP32[(5556)>>2]|0;
             $802 = ($765>>>0)<($801>>>0);
             if ($802) {
              _abort();
              // unreachable;
             }
             $803 = ((($765)) + 16|0);
             $804 = HEAP32[$803>>2]|0;
             $805 = ($804|0)==($714|0);
             if ($805) {
              HEAP32[$803>>2] = $$3$i$i;
             } else {
              $806 = ((($765)) + 20|0);
              HEAP32[$806>>2] = $$3$i$i;
             }
             $807 = ($$3$i$i|0)==(0|0);
             if ($807) {
              break L326;
             }
            }
           } while(0);
           $808 = HEAP32[(5556)>>2]|0;
           $809 = ($$3$i$i>>>0)<($808>>>0);
           if ($809) {
            _abort();
            // unreachable;
           }
           $810 = ((($$3$i$i)) + 24|0);
           HEAP32[$810>>2] = $765;
           $811 = ((($714)) + 16|0);
           $812 = HEAP32[$811>>2]|0;
           $813 = ($812|0)==(0|0);
           do {
            if (!($813)) {
             $814 = ($812>>>0)<($808>>>0);
             if ($814) {
              _abort();
              // unreachable;
             } else {
              $815 = ((($$3$i$i)) + 16|0);
              HEAP32[$815>>2] = $812;
              $816 = ((($812)) + 24|0);
              HEAP32[$816>>2] = $$3$i$i;
              break;
             }
            }
           } while(0);
           $817 = ((($811)) + 4|0);
           $818 = HEAP32[$817>>2]|0;
           $819 = ($818|0)==(0|0);
           if ($819) {
            break;
           }
           $820 = HEAP32[(5556)>>2]|0;
           $821 = ($818>>>0)<($820>>>0);
           if ($821) {
            _abort();
            // unreachable;
           } else {
            $822 = ((($$3$i$i)) + 20|0);
            HEAP32[$822>>2] = $818;
            $823 = ((($818)) + 24|0);
            HEAP32[$823>>2] = $$3$i$i;
            break;
           }
          }
         } while(0);
         $824 = (($714) + ($738)|0);
         $825 = (($738) + ($719))|0;
         $$0$i18$i = $824;$$0286$i$i = $825;
        } else {
         $$0$i18$i = $714;$$0286$i$i = $719;
        }
        $826 = ((($$0$i18$i)) + 4|0);
        $827 = HEAP32[$826>>2]|0;
        $828 = $827 & -2;
        HEAP32[$826>>2] = $828;
        $829 = $$0286$i$i | 1;
        $830 = ((($718)) + 4|0);
        HEAP32[$830>>2] = $829;
        $831 = (($718) + ($$0286$i$i)|0);
        HEAP32[$831>>2] = $$0286$i$i;
        $832 = $$0286$i$i >>> 3;
        $833 = ($$0286$i$i>>>0)<(256);
        if ($833) {
         $834 = $832 << 1;
         $835 = (5580 + ($834<<2)|0);
         $836 = HEAP32[1385]|0;
         $837 = 1 << $832;
         $838 = $836 & $837;
         $839 = ($838|0)==(0);
         do {
          if ($839) {
           $840 = $836 | $837;
           HEAP32[1385] = $840;
           $$pre$i19$i = ((($835)) + 8|0);
           $$0294$i$i = $835;$$pre$phi$i20$iZ2D = $$pre$i19$i;
          } else {
           $841 = ((($835)) + 8|0);
           $842 = HEAP32[$841>>2]|0;
           $843 = HEAP32[(5556)>>2]|0;
           $844 = ($842>>>0)<($843>>>0);
           if (!($844)) {
            $$0294$i$i = $842;$$pre$phi$i20$iZ2D = $841;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i20$iZ2D>>2] = $718;
         $845 = ((($$0294$i$i)) + 12|0);
         HEAP32[$845>>2] = $718;
         $846 = ((($718)) + 8|0);
         HEAP32[$846>>2] = $$0294$i$i;
         $847 = ((($718)) + 12|0);
         HEAP32[$847>>2] = $835;
         break;
        }
        $848 = $$0286$i$i >>> 8;
        $849 = ($848|0)==(0);
        do {
         if ($849) {
          $$0295$i$i = 0;
         } else {
          $850 = ($$0286$i$i>>>0)>(16777215);
          if ($850) {
           $$0295$i$i = 31;
           break;
          }
          $851 = (($848) + 1048320)|0;
          $852 = $851 >>> 16;
          $853 = $852 & 8;
          $854 = $848 << $853;
          $855 = (($854) + 520192)|0;
          $856 = $855 >>> 16;
          $857 = $856 & 4;
          $858 = $857 | $853;
          $859 = $854 << $857;
          $860 = (($859) + 245760)|0;
          $861 = $860 >>> 16;
          $862 = $861 & 2;
          $863 = $858 | $862;
          $864 = (14 - ($863))|0;
          $865 = $859 << $862;
          $866 = $865 >>> 15;
          $867 = (($864) + ($866))|0;
          $868 = $867 << 1;
          $869 = (($867) + 7)|0;
          $870 = $$0286$i$i >>> $869;
          $871 = $870 & 1;
          $872 = $871 | $868;
          $$0295$i$i = $872;
         }
        } while(0);
        $873 = (5844 + ($$0295$i$i<<2)|0);
        $874 = ((($718)) + 28|0);
        HEAP32[$874>>2] = $$0295$i$i;
        $875 = ((($718)) + 16|0);
        $876 = ((($875)) + 4|0);
        HEAP32[$876>>2] = 0;
        HEAP32[$875>>2] = 0;
        $877 = HEAP32[(5544)>>2]|0;
        $878 = 1 << $$0295$i$i;
        $879 = $877 & $878;
        $880 = ($879|0)==(0);
        if ($880) {
         $881 = $877 | $878;
         HEAP32[(5544)>>2] = $881;
         HEAP32[$873>>2] = $718;
         $882 = ((($718)) + 24|0);
         HEAP32[$882>>2] = $873;
         $883 = ((($718)) + 12|0);
         HEAP32[$883>>2] = $718;
         $884 = ((($718)) + 8|0);
         HEAP32[$884>>2] = $718;
         break;
        }
        $885 = HEAP32[$873>>2]|0;
        $886 = ($$0295$i$i|0)==(31);
        $887 = $$0295$i$i >>> 1;
        $888 = (25 - ($887))|0;
        $889 = $886 ? 0 : $888;
        $890 = $$0286$i$i << $889;
        $$0287$i$i = $890;$$0288$i$i = $885;
        while(1) {
         $891 = ((($$0288$i$i)) + 4|0);
         $892 = HEAP32[$891>>2]|0;
         $893 = $892 & -8;
         $894 = ($893|0)==($$0286$i$i|0);
         if ($894) {
          label = 278;
          break;
         }
         $895 = $$0287$i$i >>> 31;
         $896 = (((($$0288$i$i)) + 16|0) + ($895<<2)|0);
         $897 = $$0287$i$i << 1;
         $898 = HEAP32[$896>>2]|0;
         $899 = ($898|0)==(0|0);
         if ($899) {
          label = 275;
          break;
         } else {
          $$0287$i$i = $897;$$0288$i$i = $898;
         }
        }
        if ((label|0) == 275) {
         $900 = HEAP32[(5556)>>2]|0;
         $901 = ($896>>>0)<($900>>>0);
         if ($901) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$896>>2] = $718;
          $902 = ((($718)) + 24|0);
          HEAP32[$902>>2] = $$0288$i$i;
          $903 = ((($718)) + 12|0);
          HEAP32[$903>>2] = $718;
          $904 = ((($718)) + 8|0);
          HEAP32[$904>>2] = $718;
          break;
         }
        }
        else if ((label|0) == 278) {
         $905 = ((($$0288$i$i)) + 8|0);
         $906 = HEAP32[$905>>2]|0;
         $907 = HEAP32[(5556)>>2]|0;
         $908 = ($906>>>0)>=($907>>>0);
         $not$$i22$i = ($$0288$i$i>>>0)>=($907>>>0);
         $909 = $908 & $not$$i22$i;
         if ($909) {
          $910 = ((($906)) + 12|0);
          HEAP32[$910>>2] = $718;
          HEAP32[$905>>2] = $718;
          $911 = ((($718)) + 8|0);
          HEAP32[$911>>2] = $906;
          $912 = ((($718)) + 12|0);
          HEAP32[$912>>2] = $$0288$i$i;
          $913 = ((($718)) + 24|0);
          HEAP32[$913>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       }
      } while(0);
      $1044 = ((($706)) + 8|0);
      $$0 = $1044;
      STACKTOP = sp;return ($$0|0);
     } else {
      $$0$i$i$i = (5988);
     }
    }
    while(1) {
     $914 = HEAP32[$$0$i$i$i>>2]|0;
     $915 = ($914>>>0)>($627>>>0);
     if (!($915)) {
      $916 = ((($$0$i$i$i)) + 4|0);
      $917 = HEAP32[$916>>2]|0;
      $918 = (($914) + ($917)|0);
      $919 = ($918>>>0)>($627>>>0);
      if ($919) {
       break;
      }
     }
     $920 = ((($$0$i$i$i)) + 8|0);
     $921 = HEAP32[$920>>2]|0;
     $$0$i$i$i = $921;
    }
    $922 = ((($918)) + -47|0);
    $923 = ((($922)) + 8|0);
    $924 = $923;
    $925 = $924 & 7;
    $926 = ($925|0)==(0);
    $927 = (0 - ($924))|0;
    $928 = $927 & 7;
    $929 = $926 ? 0 : $928;
    $930 = (($922) + ($929)|0);
    $931 = ((($627)) + 16|0);
    $932 = ($930>>>0)<($931>>>0);
    $933 = $932 ? $627 : $930;
    $934 = ((($933)) + 8|0);
    $935 = ((($933)) + 24|0);
    $936 = (($$723947$i) + -40)|0;
    $937 = ((($$748$i)) + 8|0);
    $938 = $937;
    $939 = $938 & 7;
    $940 = ($939|0)==(0);
    $941 = (0 - ($938))|0;
    $942 = $941 & 7;
    $943 = $940 ? 0 : $942;
    $944 = (($$748$i) + ($943)|0);
    $945 = (($936) - ($943))|0;
    HEAP32[(5564)>>2] = $944;
    HEAP32[(5552)>>2] = $945;
    $946 = $945 | 1;
    $947 = ((($944)) + 4|0);
    HEAP32[$947>>2] = $946;
    $948 = (($944) + ($945)|0);
    $949 = ((($948)) + 4|0);
    HEAP32[$949>>2] = 40;
    $950 = HEAP32[(6028)>>2]|0;
    HEAP32[(5568)>>2] = $950;
    $951 = ((($933)) + 4|0);
    HEAP32[$951>>2] = 27;
    ;HEAP32[$934>>2]=HEAP32[(5988)>>2]|0;HEAP32[$934+4>>2]=HEAP32[(5988)+4>>2]|0;HEAP32[$934+8>>2]=HEAP32[(5988)+8>>2]|0;HEAP32[$934+12>>2]=HEAP32[(5988)+12>>2]|0;
    HEAP32[(5988)>>2] = $$748$i;
    HEAP32[(5992)>>2] = $$723947$i;
    HEAP32[(6000)>>2] = 0;
    HEAP32[(5996)>>2] = $934;
    $$0$i$i = $935;
    while(1) {
     $952 = ((($$0$i$i)) + 4|0);
     HEAP32[$952>>2] = 7;
     $953 = ((($952)) + 4|0);
     $954 = ($953>>>0)<($918>>>0);
     if ($954) {
      $$0$i$i = $952;
     } else {
      break;
     }
    }
    $955 = ($933|0)==($627|0);
    if (!($955)) {
     $956 = $933;
     $957 = $627;
     $958 = (($956) - ($957))|0;
     $959 = HEAP32[$951>>2]|0;
     $960 = $959 & -2;
     HEAP32[$951>>2] = $960;
     $961 = $958 | 1;
     $962 = ((($627)) + 4|0);
     HEAP32[$962>>2] = $961;
     HEAP32[$933>>2] = $958;
     $963 = $958 >>> 3;
     $964 = ($958>>>0)<(256);
     if ($964) {
      $965 = $963 << 1;
      $966 = (5580 + ($965<<2)|0);
      $967 = HEAP32[1385]|0;
      $968 = 1 << $963;
      $969 = $967 & $968;
      $970 = ($969|0)==(0);
      if ($970) {
       $971 = $967 | $968;
       HEAP32[1385] = $971;
       $$pre$i$i = ((($966)) + 8|0);
       $$0211$i$i = $966;$$pre$phi$i$iZ2D = $$pre$i$i;
      } else {
       $972 = ((($966)) + 8|0);
       $973 = HEAP32[$972>>2]|0;
       $974 = HEAP32[(5556)>>2]|0;
       $975 = ($973>>>0)<($974>>>0);
       if ($975) {
        _abort();
        // unreachable;
       } else {
        $$0211$i$i = $973;$$pre$phi$i$iZ2D = $972;
       }
      }
      HEAP32[$$pre$phi$i$iZ2D>>2] = $627;
      $976 = ((($$0211$i$i)) + 12|0);
      HEAP32[$976>>2] = $627;
      $977 = ((($627)) + 8|0);
      HEAP32[$977>>2] = $$0211$i$i;
      $978 = ((($627)) + 12|0);
      HEAP32[$978>>2] = $966;
      break;
     }
     $979 = $958 >>> 8;
     $980 = ($979|0)==(0);
     if ($980) {
      $$0212$i$i = 0;
     } else {
      $981 = ($958>>>0)>(16777215);
      if ($981) {
       $$0212$i$i = 31;
      } else {
       $982 = (($979) + 1048320)|0;
       $983 = $982 >>> 16;
       $984 = $983 & 8;
       $985 = $979 << $984;
       $986 = (($985) + 520192)|0;
       $987 = $986 >>> 16;
       $988 = $987 & 4;
       $989 = $988 | $984;
       $990 = $985 << $988;
       $991 = (($990) + 245760)|0;
       $992 = $991 >>> 16;
       $993 = $992 & 2;
       $994 = $989 | $993;
       $995 = (14 - ($994))|0;
       $996 = $990 << $993;
       $997 = $996 >>> 15;
       $998 = (($995) + ($997))|0;
       $999 = $998 << 1;
       $1000 = (($998) + 7)|0;
       $1001 = $958 >>> $1000;
       $1002 = $1001 & 1;
       $1003 = $1002 | $999;
       $$0212$i$i = $1003;
      }
     }
     $1004 = (5844 + ($$0212$i$i<<2)|0);
     $1005 = ((($627)) + 28|0);
     HEAP32[$1005>>2] = $$0212$i$i;
     $1006 = ((($627)) + 20|0);
     HEAP32[$1006>>2] = 0;
     HEAP32[$931>>2] = 0;
     $1007 = HEAP32[(5544)>>2]|0;
     $1008 = 1 << $$0212$i$i;
     $1009 = $1007 & $1008;
     $1010 = ($1009|0)==(0);
     if ($1010) {
      $1011 = $1007 | $1008;
      HEAP32[(5544)>>2] = $1011;
      HEAP32[$1004>>2] = $627;
      $1012 = ((($627)) + 24|0);
      HEAP32[$1012>>2] = $1004;
      $1013 = ((($627)) + 12|0);
      HEAP32[$1013>>2] = $627;
      $1014 = ((($627)) + 8|0);
      HEAP32[$1014>>2] = $627;
      break;
     }
     $1015 = HEAP32[$1004>>2]|0;
     $1016 = ($$0212$i$i|0)==(31);
     $1017 = $$0212$i$i >>> 1;
     $1018 = (25 - ($1017))|0;
     $1019 = $1016 ? 0 : $1018;
     $1020 = $958 << $1019;
     $$0206$i$i = $1020;$$0207$i$i = $1015;
     while(1) {
      $1021 = ((($$0207$i$i)) + 4|0);
      $1022 = HEAP32[$1021>>2]|0;
      $1023 = $1022 & -8;
      $1024 = ($1023|0)==($958|0);
      if ($1024) {
       label = 304;
       break;
      }
      $1025 = $$0206$i$i >>> 31;
      $1026 = (((($$0207$i$i)) + 16|0) + ($1025<<2)|0);
      $1027 = $$0206$i$i << 1;
      $1028 = HEAP32[$1026>>2]|0;
      $1029 = ($1028|0)==(0|0);
      if ($1029) {
       label = 301;
       break;
      } else {
       $$0206$i$i = $1027;$$0207$i$i = $1028;
      }
     }
     if ((label|0) == 301) {
      $1030 = HEAP32[(5556)>>2]|0;
      $1031 = ($1026>>>0)<($1030>>>0);
      if ($1031) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$1026>>2] = $627;
       $1032 = ((($627)) + 24|0);
       HEAP32[$1032>>2] = $$0207$i$i;
       $1033 = ((($627)) + 12|0);
       HEAP32[$1033>>2] = $627;
       $1034 = ((($627)) + 8|0);
       HEAP32[$1034>>2] = $627;
       break;
      }
     }
     else if ((label|0) == 304) {
      $1035 = ((($$0207$i$i)) + 8|0);
      $1036 = HEAP32[$1035>>2]|0;
      $1037 = HEAP32[(5556)>>2]|0;
      $1038 = ($1036>>>0)>=($1037>>>0);
      $not$$i$i = ($$0207$i$i>>>0)>=($1037>>>0);
      $1039 = $1038 & $not$$i$i;
      if ($1039) {
       $1040 = ((($1036)) + 12|0);
       HEAP32[$1040>>2] = $627;
       HEAP32[$1035>>2] = $627;
       $1041 = ((($627)) + 8|0);
       HEAP32[$1041>>2] = $1036;
       $1042 = ((($627)) + 12|0);
       HEAP32[$1042>>2] = $$0207$i$i;
       $1043 = ((($627)) + 24|0);
       HEAP32[$1043>>2] = 0;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    }
   }
  } while(0);
  $1045 = HEAP32[(5552)>>2]|0;
  $1046 = ($1045>>>0)>($$0197>>>0);
  if ($1046) {
   $1047 = (($1045) - ($$0197))|0;
   HEAP32[(5552)>>2] = $1047;
   $1048 = HEAP32[(5564)>>2]|0;
   $1049 = (($1048) + ($$0197)|0);
   HEAP32[(5564)>>2] = $1049;
   $1050 = $1047 | 1;
   $1051 = ((($1049)) + 4|0);
   HEAP32[$1051>>2] = $1050;
   $1052 = $$0197 | 3;
   $1053 = ((($1048)) + 4|0);
   HEAP32[$1053>>2] = $1052;
   $1054 = ((($1048)) + 8|0);
   $$0 = $1054;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $1055 = (___errno_location()|0);
 HEAP32[$1055>>2] = 12;
 $$0 = 0;
 STACKTOP = sp;return ($$0|0);
}
function _free($0) {
 $0 = $0|0;
 var $$0211$i = 0, $$0211$in$i = 0, $$0381 = 0, $$0382 = 0, $$0394 = 0, $$0401 = 0, $$1 = 0, $$1380 = 0, $$1385 = 0, $$1388 = 0, $$1396 = 0, $$1400 = 0, $$2 = 0, $$3 = 0, $$3398 = 0, $$pre = 0, $$pre$phi439Z2D = 0, $$pre$phi441Z2D = 0, $$pre$phiZ2D = 0, $$pre438 = 0;
 var $$pre440 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
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
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0;
 var $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0;
 var $99 = 0, $cond418 = 0, $cond419 = 0, $not$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ($0|0)==(0|0);
 if ($1) {
  return;
 }
 $2 = ((($0)) + -8|0);
 $3 = HEAP32[(5556)>>2]|0;
 $4 = ($2>>>0)<($3>>>0);
 if ($4) {
  _abort();
  // unreachable;
 }
 $5 = ((($0)) + -4|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = $6 & 3;
 $8 = ($7|0)==(1);
 if ($8) {
  _abort();
  // unreachable;
 }
 $9 = $6 & -8;
 $10 = (($2) + ($9)|0);
 $11 = $6 & 1;
 $12 = ($11|0)==(0);
 do {
  if ($12) {
   $13 = HEAP32[$2>>2]|0;
   $14 = ($7|0)==(0);
   if ($14) {
    return;
   }
   $15 = (0 - ($13))|0;
   $16 = (($2) + ($15)|0);
   $17 = (($13) + ($9))|0;
   $18 = ($16>>>0)<($3>>>0);
   if ($18) {
    _abort();
    // unreachable;
   }
   $19 = HEAP32[(5560)>>2]|0;
   $20 = ($16|0)==($19|0);
   if ($20) {
    $105 = ((($10)) + 4|0);
    $106 = HEAP32[$105>>2]|0;
    $107 = $106 & 3;
    $108 = ($107|0)==(3);
    if (!($108)) {
     $$1 = $16;$$1380 = $17;
     break;
    }
    HEAP32[(5548)>>2] = $17;
    $109 = $106 & -2;
    HEAP32[$105>>2] = $109;
    $110 = $17 | 1;
    $111 = ((($16)) + 4|0);
    HEAP32[$111>>2] = $110;
    $112 = (($16) + ($17)|0);
    HEAP32[$112>>2] = $17;
    return;
   }
   $21 = $13 >>> 3;
   $22 = ($13>>>0)<(256);
   if ($22) {
    $23 = ((($16)) + 8|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = ((($16)) + 12|0);
    $26 = HEAP32[$25>>2]|0;
    $27 = $21 << 1;
    $28 = (5580 + ($27<<2)|0);
    $29 = ($24|0)==($28|0);
    if (!($29)) {
     $30 = ($24>>>0)<($3>>>0);
     if ($30) {
      _abort();
      // unreachable;
     }
     $31 = ((($24)) + 12|0);
     $32 = HEAP32[$31>>2]|0;
     $33 = ($32|0)==($16|0);
     if (!($33)) {
      _abort();
      // unreachable;
     }
    }
    $34 = ($26|0)==($24|0);
    if ($34) {
     $35 = 1 << $21;
     $36 = $35 ^ -1;
     $37 = HEAP32[1385]|0;
     $38 = $37 & $36;
     HEAP32[1385] = $38;
     $$1 = $16;$$1380 = $17;
     break;
    }
    $39 = ($26|0)==($28|0);
    if ($39) {
     $$pre440 = ((($26)) + 8|0);
     $$pre$phi441Z2D = $$pre440;
    } else {
     $40 = ($26>>>0)<($3>>>0);
     if ($40) {
      _abort();
      // unreachable;
     }
     $41 = ((($26)) + 8|0);
     $42 = HEAP32[$41>>2]|0;
     $43 = ($42|0)==($16|0);
     if ($43) {
      $$pre$phi441Z2D = $41;
     } else {
      _abort();
      // unreachable;
     }
    }
    $44 = ((($24)) + 12|0);
    HEAP32[$44>>2] = $26;
    HEAP32[$$pre$phi441Z2D>>2] = $24;
    $$1 = $16;$$1380 = $17;
    break;
   }
   $45 = ((($16)) + 24|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ((($16)) + 12|0);
   $48 = HEAP32[$47>>2]|0;
   $49 = ($48|0)==($16|0);
   do {
    if ($49) {
     $59 = ((($16)) + 16|0);
     $60 = ((($59)) + 4|0);
     $61 = HEAP32[$60>>2]|0;
     $62 = ($61|0)==(0|0);
     if ($62) {
      $63 = HEAP32[$59>>2]|0;
      $64 = ($63|0)==(0|0);
      if ($64) {
       $$3 = 0;
       break;
      } else {
       $$1385 = $63;$$1388 = $59;
      }
     } else {
      $$1385 = $61;$$1388 = $60;
     }
     while(1) {
      $65 = ((($$1385)) + 20|0);
      $66 = HEAP32[$65>>2]|0;
      $67 = ($66|0)==(0|0);
      if (!($67)) {
       $$1385 = $66;$$1388 = $65;
       continue;
      }
      $68 = ((($$1385)) + 16|0);
      $69 = HEAP32[$68>>2]|0;
      $70 = ($69|0)==(0|0);
      if ($70) {
       break;
      } else {
       $$1385 = $69;$$1388 = $68;
      }
     }
     $71 = ($$1388>>>0)<($3>>>0);
     if ($71) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$$1388>>2] = 0;
      $$3 = $$1385;
      break;
     }
    } else {
     $50 = ((($16)) + 8|0);
     $51 = HEAP32[$50>>2]|0;
     $52 = ($51>>>0)<($3>>>0);
     if ($52) {
      _abort();
      // unreachable;
     }
     $53 = ((($51)) + 12|0);
     $54 = HEAP32[$53>>2]|0;
     $55 = ($54|0)==($16|0);
     if (!($55)) {
      _abort();
      // unreachable;
     }
     $56 = ((($48)) + 8|0);
     $57 = HEAP32[$56>>2]|0;
     $58 = ($57|0)==($16|0);
     if ($58) {
      HEAP32[$53>>2] = $48;
      HEAP32[$56>>2] = $51;
      $$3 = $48;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $72 = ($46|0)==(0|0);
   if ($72) {
    $$1 = $16;$$1380 = $17;
   } else {
    $73 = ((($16)) + 28|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = (5844 + ($74<<2)|0);
    $76 = HEAP32[$75>>2]|0;
    $77 = ($16|0)==($76|0);
    if ($77) {
     HEAP32[$75>>2] = $$3;
     $cond418 = ($$3|0)==(0|0);
     if ($cond418) {
      $78 = 1 << $74;
      $79 = $78 ^ -1;
      $80 = HEAP32[(5544)>>2]|0;
      $81 = $80 & $79;
      HEAP32[(5544)>>2] = $81;
      $$1 = $16;$$1380 = $17;
      break;
     }
    } else {
     $82 = HEAP32[(5556)>>2]|0;
     $83 = ($46>>>0)<($82>>>0);
     if ($83) {
      _abort();
      // unreachable;
     }
     $84 = ((($46)) + 16|0);
     $85 = HEAP32[$84>>2]|0;
     $86 = ($85|0)==($16|0);
     if ($86) {
      HEAP32[$84>>2] = $$3;
     } else {
      $87 = ((($46)) + 20|0);
      HEAP32[$87>>2] = $$3;
     }
     $88 = ($$3|0)==(0|0);
     if ($88) {
      $$1 = $16;$$1380 = $17;
      break;
     }
    }
    $89 = HEAP32[(5556)>>2]|0;
    $90 = ($$3>>>0)<($89>>>0);
    if ($90) {
     _abort();
     // unreachable;
    }
    $91 = ((($$3)) + 24|0);
    HEAP32[$91>>2] = $46;
    $92 = ((($16)) + 16|0);
    $93 = HEAP32[$92>>2]|0;
    $94 = ($93|0)==(0|0);
    do {
     if (!($94)) {
      $95 = ($93>>>0)<($89>>>0);
      if ($95) {
       _abort();
       // unreachable;
      } else {
       $96 = ((($$3)) + 16|0);
       HEAP32[$96>>2] = $93;
       $97 = ((($93)) + 24|0);
       HEAP32[$97>>2] = $$3;
       break;
      }
     }
    } while(0);
    $98 = ((($92)) + 4|0);
    $99 = HEAP32[$98>>2]|0;
    $100 = ($99|0)==(0|0);
    if ($100) {
     $$1 = $16;$$1380 = $17;
    } else {
     $101 = HEAP32[(5556)>>2]|0;
     $102 = ($99>>>0)<($101>>>0);
     if ($102) {
      _abort();
      // unreachable;
     } else {
      $103 = ((($$3)) + 20|0);
      HEAP32[$103>>2] = $99;
      $104 = ((($99)) + 24|0);
      HEAP32[$104>>2] = $$3;
      $$1 = $16;$$1380 = $17;
      break;
     }
    }
   }
  } else {
   $$1 = $2;$$1380 = $9;
  }
 } while(0);
 $113 = ($$1>>>0)<($10>>>0);
 if (!($113)) {
  _abort();
  // unreachable;
 }
 $114 = ((($10)) + 4|0);
 $115 = HEAP32[$114>>2]|0;
 $116 = $115 & 1;
 $117 = ($116|0)==(0);
 if ($117) {
  _abort();
  // unreachable;
 }
 $118 = $115 & 2;
 $119 = ($118|0)==(0);
 if ($119) {
  $120 = HEAP32[(5564)>>2]|0;
  $121 = ($10|0)==($120|0);
  if ($121) {
   $122 = HEAP32[(5552)>>2]|0;
   $123 = (($122) + ($$1380))|0;
   HEAP32[(5552)>>2] = $123;
   HEAP32[(5564)>>2] = $$1;
   $124 = $123 | 1;
   $125 = ((($$1)) + 4|0);
   HEAP32[$125>>2] = $124;
   $126 = HEAP32[(5560)>>2]|0;
   $127 = ($$1|0)==($126|0);
   if (!($127)) {
    return;
   }
   HEAP32[(5560)>>2] = 0;
   HEAP32[(5548)>>2] = 0;
   return;
  }
  $128 = HEAP32[(5560)>>2]|0;
  $129 = ($10|0)==($128|0);
  if ($129) {
   $130 = HEAP32[(5548)>>2]|0;
   $131 = (($130) + ($$1380))|0;
   HEAP32[(5548)>>2] = $131;
   HEAP32[(5560)>>2] = $$1;
   $132 = $131 | 1;
   $133 = ((($$1)) + 4|0);
   HEAP32[$133>>2] = $132;
   $134 = (($$1) + ($131)|0);
   HEAP32[$134>>2] = $131;
   return;
  }
  $135 = $115 & -8;
  $136 = (($135) + ($$1380))|0;
  $137 = $115 >>> 3;
  $138 = ($115>>>0)<(256);
  do {
   if ($138) {
    $139 = ((($10)) + 8|0);
    $140 = HEAP32[$139>>2]|0;
    $141 = ((($10)) + 12|0);
    $142 = HEAP32[$141>>2]|0;
    $143 = $137 << 1;
    $144 = (5580 + ($143<<2)|0);
    $145 = ($140|0)==($144|0);
    if (!($145)) {
     $146 = HEAP32[(5556)>>2]|0;
     $147 = ($140>>>0)<($146>>>0);
     if ($147) {
      _abort();
      // unreachable;
     }
     $148 = ((($140)) + 12|0);
     $149 = HEAP32[$148>>2]|0;
     $150 = ($149|0)==($10|0);
     if (!($150)) {
      _abort();
      // unreachable;
     }
    }
    $151 = ($142|0)==($140|0);
    if ($151) {
     $152 = 1 << $137;
     $153 = $152 ^ -1;
     $154 = HEAP32[1385]|0;
     $155 = $154 & $153;
     HEAP32[1385] = $155;
     break;
    }
    $156 = ($142|0)==($144|0);
    if ($156) {
     $$pre438 = ((($142)) + 8|0);
     $$pre$phi439Z2D = $$pre438;
    } else {
     $157 = HEAP32[(5556)>>2]|0;
     $158 = ($142>>>0)<($157>>>0);
     if ($158) {
      _abort();
      // unreachable;
     }
     $159 = ((($142)) + 8|0);
     $160 = HEAP32[$159>>2]|0;
     $161 = ($160|0)==($10|0);
     if ($161) {
      $$pre$phi439Z2D = $159;
     } else {
      _abort();
      // unreachable;
     }
    }
    $162 = ((($140)) + 12|0);
    HEAP32[$162>>2] = $142;
    HEAP32[$$pre$phi439Z2D>>2] = $140;
   } else {
    $163 = ((($10)) + 24|0);
    $164 = HEAP32[$163>>2]|0;
    $165 = ((($10)) + 12|0);
    $166 = HEAP32[$165>>2]|0;
    $167 = ($166|0)==($10|0);
    do {
     if ($167) {
      $178 = ((($10)) + 16|0);
      $179 = ((($178)) + 4|0);
      $180 = HEAP32[$179>>2]|0;
      $181 = ($180|0)==(0|0);
      if ($181) {
       $182 = HEAP32[$178>>2]|0;
       $183 = ($182|0)==(0|0);
       if ($183) {
        $$3398 = 0;
        break;
       } else {
        $$1396 = $182;$$1400 = $178;
       }
      } else {
       $$1396 = $180;$$1400 = $179;
      }
      while(1) {
       $184 = ((($$1396)) + 20|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if (!($186)) {
        $$1396 = $185;$$1400 = $184;
        continue;
       }
       $187 = ((($$1396)) + 16|0);
       $188 = HEAP32[$187>>2]|0;
       $189 = ($188|0)==(0|0);
       if ($189) {
        break;
       } else {
        $$1396 = $188;$$1400 = $187;
       }
      }
      $190 = HEAP32[(5556)>>2]|0;
      $191 = ($$1400>>>0)<($190>>>0);
      if ($191) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$$1400>>2] = 0;
       $$3398 = $$1396;
       break;
      }
     } else {
      $168 = ((($10)) + 8|0);
      $169 = HEAP32[$168>>2]|0;
      $170 = HEAP32[(5556)>>2]|0;
      $171 = ($169>>>0)<($170>>>0);
      if ($171) {
       _abort();
       // unreachable;
      }
      $172 = ((($169)) + 12|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($10|0);
      if (!($174)) {
       _abort();
       // unreachable;
      }
      $175 = ((($166)) + 8|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==($10|0);
      if ($177) {
       HEAP32[$172>>2] = $166;
       HEAP32[$175>>2] = $169;
       $$3398 = $166;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $192 = ($164|0)==(0|0);
    if (!($192)) {
     $193 = ((($10)) + 28|0);
     $194 = HEAP32[$193>>2]|0;
     $195 = (5844 + ($194<<2)|0);
     $196 = HEAP32[$195>>2]|0;
     $197 = ($10|0)==($196|0);
     if ($197) {
      HEAP32[$195>>2] = $$3398;
      $cond419 = ($$3398|0)==(0|0);
      if ($cond419) {
       $198 = 1 << $194;
       $199 = $198 ^ -1;
       $200 = HEAP32[(5544)>>2]|0;
       $201 = $200 & $199;
       HEAP32[(5544)>>2] = $201;
       break;
      }
     } else {
      $202 = HEAP32[(5556)>>2]|0;
      $203 = ($164>>>0)<($202>>>0);
      if ($203) {
       _abort();
       // unreachable;
      }
      $204 = ((($164)) + 16|0);
      $205 = HEAP32[$204>>2]|0;
      $206 = ($205|0)==($10|0);
      if ($206) {
       HEAP32[$204>>2] = $$3398;
      } else {
       $207 = ((($164)) + 20|0);
       HEAP32[$207>>2] = $$3398;
      }
      $208 = ($$3398|0)==(0|0);
      if ($208) {
       break;
      }
     }
     $209 = HEAP32[(5556)>>2]|0;
     $210 = ($$3398>>>0)<($209>>>0);
     if ($210) {
      _abort();
      // unreachable;
     }
     $211 = ((($$3398)) + 24|0);
     HEAP32[$211>>2] = $164;
     $212 = ((($10)) + 16|0);
     $213 = HEAP32[$212>>2]|0;
     $214 = ($213|0)==(0|0);
     do {
      if (!($214)) {
       $215 = ($213>>>0)<($209>>>0);
       if ($215) {
        _abort();
        // unreachable;
       } else {
        $216 = ((($$3398)) + 16|0);
        HEAP32[$216>>2] = $213;
        $217 = ((($213)) + 24|0);
        HEAP32[$217>>2] = $$3398;
        break;
       }
      }
     } while(0);
     $218 = ((($212)) + 4|0);
     $219 = HEAP32[$218>>2]|0;
     $220 = ($219|0)==(0|0);
     if (!($220)) {
      $221 = HEAP32[(5556)>>2]|0;
      $222 = ($219>>>0)<($221>>>0);
      if ($222) {
       _abort();
       // unreachable;
      } else {
       $223 = ((($$3398)) + 20|0);
       HEAP32[$223>>2] = $219;
       $224 = ((($219)) + 24|0);
       HEAP32[$224>>2] = $$3398;
       break;
      }
     }
    }
   }
  } while(0);
  $225 = $136 | 1;
  $226 = ((($$1)) + 4|0);
  HEAP32[$226>>2] = $225;
  $227 = (($$1) + ($136)|0);
  HEAP32[$227>>2] = $136;
  $228 = HEAP32[(5560)>>2]|0;
  $229 = ($$1|0)==($228|0);
  if ($229) {
   HEAP32[(5548)>>2] = $136;
   return;
  } else {
   $$2 = $136;
  }
 } else {
  $230 = $115 & -2;
  HEAP32[$114>>2] = $230;
  $231 = $$1380 | 1;
  $232 = ((($$1)) + 4|0);
  HEAP32[$232>>2] = $231;
  $233 = (($$1) + ($$1380)|0);
  HEAP32[$233>>2] = $$1380;
  $$2 = $$1380;
 }
 $234 = $$2 >>> 3;
 $235 = ($$2>>>0)<(256);
 if ($235) {
  $236 = $234 << 1;
  $237 = (5580 + ($236<<2)|0);
  $238 = HEAP32[1385]|0;
  $239 = 1 << $234;
  $240 = $238 & $239;
  $241 = ($240|0)==(0);
  if ($241) {
   $242 = $238 | $239;
   HEAP32[1385] = $242;
   $$pre = ((($237)) + 8|0);
   $$0401 = $237;$$pre$phiZ2D = $$pre;
  } else {
   $243 = ((($237)) + 8|0);
   $244 = HEAP32[$243>>2]|0;
   $245 = HEAP32[(5556)>>2]|0;
   $246 = ($244>>>0)<($245>>>0);
   if ($246) {
    _abort();
    // unreachable;
   } else {
    $$0401 = $244;$$pre$phiZ2D = $243;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $$1;
  $247 = ((($$0401)) + 12|0);
  HEAP32[$247>>2] = $$1;
  $248 = ((($$1)) + 8|0);
  HEAP32[$248>>2] = $$0401;
  $249 = ((($$1)) + 12|0);
  HEAP32[$249>>2] = $237;
  return;
 }
 $250 = $$2 >>> 8;
 $251 = ($250|0)==(0);
 if ($251) {
  $$0394 = 0;
 } else {
  $252 = ($$2>>>0)>(16777215);
  if ($252) {
   $$0394 = 31;
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
   $272 = $$2 >>> $271;
   $273 = $272 & 1;
   $274 = $273 | $270;
   $$0394 = $274;
  }
 }
 $275 = (5844 + ($$0394<<2)|0);
 $276 = ((($$1)) + 28|0);
 HEAP32[$276>>2] = $$0394;
 $277 = ((($$1)) + 16|0);
 $278 = ((($$1)) + 20|0);
 HEAP32[$278>>2] = 0;
 HEAP32[$277>>2] = 0;
 $279 = HEAP32[(5544)>>2]|0;
 $280 = 1 << $$0394;
 $281 = $279 & $280;
 $282 = ($281|0)==(0);
 do {
  if ($282) {
   $283 = $279 | $280;
   HEAP32[(5544)>>2] = $283;
   HEAP32[$275>>2] = $$1;
   $284 = ((($$1)) + 24|0);
   HEAP32[$284>>2] = $275;
   $285 = ((($$1)) + 12|0);
   HEAP32[$285>>2] = $$1;
   $286 = ((($$1)) + 8|0);
   HEAP32[$286>>2] = $$1;
  } else {
   $287 = HEAP32[$275>>2]|0;
   $288 = ($$0394|0)==(31);
   $289 = $$0394 >>> 1;
   $290 = (25 - ($289))|0;
   $291 = $288 ? 0 : $290;
   $292 = $$2 << $291;
   $$0381 = $292;$$0382 = $287;
   while(1) {
    $293 = ((($$0382)) + 4|0);
    $294 = HEAP32[$293>>2]|0;
    $295 = $294 & -8;
    $296 = ($295|0)==($$2|0);
    if ($296) {
     label = 130;
     break;
    }
    $297 = $$0381 >>> 31;
    $298 = (((($$0382)) + 16|0) + ($297<<2)|0);
    $299 = $$0381 << 1;
    $300 = HEAP32[$298>>2]|0;
    $301 = ($300|0)==(0|0);
    if ($301) {
     label = 127;
     break;
    } else {
     $$0381 = $299;$$0382 = $300;
    }
   }
   if ((label|0) == 127) {
    $302 = HEAP32[(5556)>>2]|0;
    $303 = ($298>>>0)<($302>>>0);
    if ($303) {
     _abort();
     // unreachable;
    } else {
     HEAP32[$298>>2] = $$1;
     $304 = ((($$1)) + 24|0);
     HEAP32[$304>>2] = $$0382;
     $305 = ((($$1)) + 12|0);
     HEAP32[$305>>2] = $$1;
     $306 = ((($$1)) + 8|0);
     HEAP32[$306>>2] = $$1;
     break;
    }
   }
   else if ((label|0) == 130) {
    $307 = ((($$0382)) + 8|0);
    $308 = HEAP32[$307>>2]|0;
    $309 = HEAP32[(5556)>>2]|0;
    $310 = ($308>>>0)>=($309>>>0);
    $not$ = ($$0382>>>0)>=($309>>>0);
    $311 = $310 & $not$;
    if ($311) {
     $312 = ((($308)) + 12|0);
     HEAP32[$312>>2] = $$1;
     HEAP32[$307>>2] = $$1;
     $313 = ((($$1)) + 8|0);
     HEAP32[$313>>2] = $308;
     $314 = ((($$1)) + 12|0);
     HEAP32[$314>>2] = $$0382;
     $315 = ((($$1)) + 24|0);
     HEAP32[$315>>2] = 0;
     break;
    } else {
     _abort();
     // unreachable;
    }
   }
  }
 } while(0);
 $316 = HEAP32[(5572)>>2]|0;
 $317 = (($316) + -1)|0;
 HEAP32[(5572)>>2] = $317;
 $318 = ($317|0)==(0);
 if ($318) {
  $$0211$in$i = (5996);
 } else {
  return;
 }
 while(1) {
  $$0211$i = HEAP32[$$0211$in$i>>2]|0;
  $319 = ($$0211$i|0)==(0|0);
  $320 = ((($$0211$i)) + 8|0);
  if ($319) {
   break;
  } else {
   $$0211$in$i = $320;
  }
 }
 HEAP32[(5572)>>2] = -1;
 return;
}
function _calloc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$ = 0, $$0 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($0|0)==(0);
 if ($2) {
  $$0 = 0;
 } else {
  $3 = Math_imul($1, $0)|0;
  $4 = $1 | $0;
  $5 = ($4>>>0)>(65535);
  if ($5) {
   $6 = (($3>>>0) / ($0>>>0))&-1;
   $7 = ($6|0)==($1|0);
   $$ = $7 ? $3 : -1;
   $$0 = $$;
  } else {
   $$0 = $3;
  }
 }
 $8 = (_malloc($$0)|0);
 $9 = ($8|0)==(0|0);
 if ($9) {
  return ($8|0);
 }
 $10 = ((($8)) + -4|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = $11 & 3;
 $13 = ($12|0)==(0);
 if ($13) {
  return ($8|0);
 }
 _memset(($8|0),0,($$0|0))|0;
 return ($8|0);
}
function runPostSets() {
}
function _sbrk(increment) {
    increment = increment|0;
    var oldDynamicTop = 0;
    var oldDynamicTopOnChange = 0;
    var newDynamicTop = 0;
    var totalMemory = 0;
    increment = ((increment + 15) & -16)|0;
    oldDynamicTop = HEAP32[DYNAMICTOP_PTR>>2]|0;
    newDynamicTop = oldDynamicTop + increment | 0;

    if (((increment|0) > 0 & (newDynamicTop|0) < (oldDynamicTop|0)) // Detect and fail if we would wrap around signed 32-bit int.
      | (newDynamicTop|0) < 0) { // Also underflow, sbrk() should be able to be used to subtract.
      abortOnCannotGrowMemory()|0;
      ___setErrNo(12);
      return -1;
    }

    HEAP32[DYNAMICTOP_PTR>>2] = newDynamicTop;
    totalMemory = getTotalMemory()|0;
    if ((newDynamicTop|0) > (totalMemory|0)) {
      if ((enlargeMemory()|0) == 0) {
        ___setErrNo(12);
        HEAP32[DYNAMICTOP_PTR>>2] = oldDynamicTop;
        return -1;
      }
    }
    return oldDynamicTop|0;
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
function _pthread_self() {
    return 0;
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

  return { _sbrk: _sbrk, _sidhjs_secret: _sidhjs_secret, _free: _free, _pthread_self: _pthread_self, _sidhjs_public_key_bytes: _sidhjs_public_key_bytes, _sidhjs_private_key_bytes: _sidhjs_private_key_bytes, _sidhjs_secret_bytes: _sidhjs_secret_bytes, _memset: _memset, _malloc: _malloc, _memcpy: _memcpy, _sidhjs_secret_base: _sidhjs_secret_base, _sidhjs_keypair: _sidhjs_keypair, _sidhjs_init: _sidhjs_init, _sidhjs_private_key_bytes_base: _sidhjs_private_key_bytes_base, _sidhjs_keypair_base: _sidhjs_keypair_base, _sidhjs_public_key_bytes_base: _sidhjs_public_key_bytes_base, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, establishStackSpace: establishStackSpace, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_iiii: dynCall_iiii, dynCall_iiiii: dynCall_iiiii, dynCall_iii: dynCall_iii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);

var real__malloc = asm["_malloc"]; asm["_malloc"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__malloc.apply(null, arguments);
};

var real__pthread_self = asm["_pthread_self"]; asm["_pthread_self"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__pthread_self.apply(null, arguments);
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

var real__sbrk = asm["_sbrk"]; asm["_sbrk"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__sbrk.apply(null, arguments);
};

var real__sidhjs_private_key_bytes = asm["_sidhjs_private_key_bytes"]; asm["_sidhjs_private_key_bytes"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__sidhjs_private_key_bytes.apply(null, arguments);
};

var real__sidhjs_secret_base = asm["_sidhjs_secret_base"]; asm["_sidhjs_secret_base"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__sidhjs_secret_base.apply(null, arguments);
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

var real__sidhjs_private_key_bytes_base = asm["_sidhjs_private_key_bytes_base"]; asm["_sidhjs_private_key_bytes_base"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__sidhjs_private_key_bytes_base.apply(null, arguments);
};

var real__sidhjs_keypair_base = asm["_sidhjs_keypair_base"]; asm["_sidhjs_keypair_base"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__sidhjs_keypair_base.apply(null, arguments);
};

var real__sidhjs_public_key_bytes_base = asm["_sidhjs_public_key_bytes_base"]; asm["_sidhjs_public_key_bytes_base"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__sidhjs_public_key_bytes_base.apply(null, arguments);
};
var _malloc = Module["_malloc"] = asm["_malloc"];
var _pthread_self = Module["_pthread_self"] = asm["_pthread_self"];
var _free = Module["_free"] = asm["_free"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _sidhjs_public_key_bytes = Module["_sidhjs_public_key_bytes"] = asm["_sidhjs_public_key_bytes"];
var _sidhjs_secret = Module["_sidhjs_secret"] = asm["_sidhjs_secret"];
var _sidhjs_secret_bytes = Module["_sidhjs_secret_bytes"] = asm["_sidhjs_secret_bytes"];
var _memset = Module["_memset"] = asm["_memset"];
var _sbrk = Module["_sbrk"] = asm["_sbrk"];
var _sidhjs_private_key_bytes = Module["_sidhjs_private_key_bytes"] = asm["_sidhjs_private_key_bytes"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _sidhjs_secret_base = Module["_sidhjs_secret_base"] = asm["_sidhjs_secret_base"];
var _sidhjs_keypair = Module["_sidhjs_keypair"] = asm["_sidhjs_keypair"];
var _sidhjs_init = Module["_sidhjs_init"] = asm["_sidhjs_init"];
var _sidhjs_private_key_bytes_base = Module["_sidhjs_private_key_bytes_base"] = asm["_sidhjs_private_key_bytes_base"];
var _sidhjs_keypair_base = Module["_sidhjs_keypair_base"] = asm["_sidhjs_keypair_base"];
var _sidhjs_public_key_bytes_base = Module["_sidhjs_public_key_bytes_base"] = asm["_sidhjs_public_key_bytes_base"];
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

  writeStackCookie();

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
  checkStackCookie();
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
    process['exit'](status);
  } else if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
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


// EMSCRIPTEN_GENERATED_FUNCTIONS: ["_sbrk","_memset","_pthread_self","_memcpy"]


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
	publicKeyBytes: Module._sidhjs_public_key_bytes(),
	privateKeyBytes: Module._sidhjs_private_key_bytes(),
	bytes: Module._sidhjs_secret_bytes(),

	/* Backwards compatibility */
	publicKeyLength: Module._sidhjs_public_key_bytes(),
	privateKeyLength: Module._sidhjs_private_key_bytes(),
	secretLength: Module._sidhjs_secret_bytes(),

	keyPair: function () {
		var publicKeyBuffer		= Module._malloc(sidh.publicKeyBytes);
		var privateKeyBuffer	= Module._malloc(sidh.privateKeyBytes);

		try {
			var returnValue	= Module._sidhjs_keypair(
				publicKeyBuffer,
				privateKeyBuffer
			);

			return dataReturn(returnValue, {
				publicKey: dataResult(publicKeyBuffer, sidh.publicKeyBytes),
				privateKey: dataResult(privateKeyBuffer, sidh.privateKeyBytes)
			});
		}
		finally {
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
		}
	},

	secret: function (publicKey, privateKey) {
		var publicKeyBuffer		= Module._malloc(sidh.publicKeyBytes);
		var privateKeyBuffer	= Module._malloc(sidh.privateKeyBytes);
		var secretBuffer		= Module._malloc(sidh.bytes);

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
				dataResult(secretBuffer, sidh.bytes)
			);
		}
		finally {
			dataFree(publicKeyBuffer);
			dataFree(privateKeyBuffer);
			dataFree(secretBuffer);
		}
	},

	base: {
		publicKeyBytes: Module._sidhjs_public_key_bytes_base(),
		privateKeyBytes: Module._sidhjs_private_key_bytes_base(),
		bytes: Module._sidhjs_secret_bytes(),

		keyPair: function (isAlice) {
			var publicKeyBuffer		= Module._malloc(sidh.base.publicKeyBytes);
			var privateKeyBuffer	= Module._malloc(sidh.base.privateKeyBytes);

			try {
				var returnValue	= Module._sidhjs_keypair_base(
					publicKeyBuffer,
					privateKeyBuffer,
					isAlice ? 1 : 0
				);

				return dataReturn(returnValue, {
					publicKey: dataResult(publicKeyBuffer, sidh.base.publicKeyBytes),
					privateKey: dataResult(privateKeyBuffer, sidh.base.privateKeyBytes)
				});
			}
			finally {
				dataFree(publicKeyBuffer);
				dataFree(privateKeyBuffer);
			}
		},

		secret: function (publicKey, privateKey, isAlice, shouldValidate) {
			var publicKeyBuffer		= Module._malloc(sidh.base.publicKeyBytes);
			var privateKeyBuffer	= Module._malloc(sidh.base.privateKeyBytes);
			var secretBuffer		= Module._malloc(sidh.base.bytes);

			Module.writeArrayToMemory(publicKey, publicKeyBuffer);
			Module.writeArrayToMemory(privateKey, privateKeyBuffer);

			try {
				var returnValue	= Module._sidhjs_secret_base(
					publicKeyBuffer,
					privateKeyBuffer,
					secretBuffer,
					isAlice ? 1 : 0,
					shouldValidate ? 1 : 0
				);

				return dataReturn(
					returnValue,
					dataResult(secretBuffer, sidh.base.bytes)
				);
			}
			finally {
				dataFree(publicKeyBuffer);
				dataFree(privateKeyBuffer);
				dataFree(secretBuffer);
			}
		}
	}
};



return sidh;

}());


if (typeof module !== 'undefined' && module.exports) {
	sidh.sidh		= sidh;
	module.exports	= sidh;
}
else {
	self.sidh		= sidh;
}

//# sourceMappingURL=sidh.debug.js.map