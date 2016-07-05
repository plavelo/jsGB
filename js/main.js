jsGB = {
  run_interval: 0,
  trace: '',
  frame: function() {
    var fclock = Z80.clock.m + 17556
    var t0 = new Date()
    do {
      if (Z80.halt) {
        Z80.r.m = 1
      } else {
        Z80.map[MMU.rb(Z80.r.pc++)]()
        Z80.r.pc &= 65535
      }
      if (Z80.r.ime && MMU.ie && MMU.if) {
        Z80.halt = 0
        Z80.r.ime = 0
        var ifired = MMU.ie & MMU.if

        if (ifired & 1) {
          MMU.if &= 0xFE
          Z80.ops.RST40()
        } else if (ifired & 2) {
          MMU.if &= 0xFD
          Z80.ops.RST48()
        } else if (ifired & 4) {
          MMU.if &= 0xFB
          Z80.ops.RST50()
        } else if (ifired & 8) {
          MMU.if &= 0xF7
          Z80.ops.RST58()
        } else if (ifired & 16) {
          MMU.if &= 0xEF
          Z80.ops.RST60()
        } else {
          Z80.r.ime = 1
        }
      }
      Z80.clock.m += Z80.r.m
      GPU.checkline()
      TIMER.inc()

      if (Z80.stop) {
        jsGB.pause()
        break
      }
    } while (Z80.clock.m < fclock)
    var t1 = new Date()
  },
  reset: function() {
    GPU.reset()
    MMU.reset()
    Z80.reset()
    KEY.reset()
    TIMER.reset()
    Z80.r.pc = 0x100
    Z80.r.sp = 0xFFFE
    Z80.r.hl = 0x014D
    Z80.r.a  = 0x01
    Z80.r.c  = 0x13
    Z80.r.e  = 0xD8
    MMU.inbios = 0
    MMU.load()

    document.getElementById('op_reset').onclick = jsGB.reset
    document.getElementById('op_run').onclick = jsGB.run
    document.getElementById('op_run').innerHTML = 'Run'

    jsGB.pause()
  },
  run: function() {
    Z80.stop = 0
    jsGB.run_interval = setInterval(jsGB.frame, 1)
    document.getElementById('op_run').innerHTML = 'Pause'
    document.getElementById('op_run').onclick = jsGB.pause
  },
  pause: function() {
    clearInterval(jsGB.run_interval)
    Z80.stop = 1
    document.getElementById('op_run').innerHTML = 'Run'
    document.getElementById('op_run').onclick = jsGB.run
  }
}

window.onload    = jsGB.reset
window.onkeydown = KEY.keydown
window.onkeyup   = KEY.keyup

function handleFileSelect(evt) {
  var files = evt.target.files

  var f = files[0]
  var fileType = f.type || 'n/a'
  var lastModifiedDate = f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a'
  document.getElementById('list').innerHTML = '<strong>' + f.name + '</strong> (' + fileType +  ') - ' + f.size + ' bytes, last modified: ' + lastModifiedDate

  var reader = new FileReader()
  reader.readAsArrayBuffer(f)

  reader.onload = function(evt) {
    if (evt.target.readyState == FileReader.DONE) {
      var buffer = evt.target.result
      var dataView = new DataView(buffer)
      MMU.rom = new Uint8Array (buffer)
    }
  }
}

document.getElementById('files').addEventListener('change', handleFileSelect, false)
