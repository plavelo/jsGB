KEY = {
  keys: [0xF,0xF],
  colidx: 0,

  LEFT   : 37,
  UP     : 38,
  RIGHT  : 39,
  DOWN   : 40,
  A      : 90,
  B      : 88,
  START  : 13,
  SELECT : 32,

  reset: function() {
    KEY.keys = [0xF, 0xF]
    KEY.colidx = 0
  },
  rb: function() {
    switch(KEY.colidx) {
      case 0x00:
        return 0x00
      case 0x10:
        return KEY.keys[0]
      case 0x20:
        return KEY.keys[1]
      default:
        return 0x00
    }
  },
  wb: function(v) {
    KEY.colidx = v & 0x30
  },
  keydown: function(e) {
    switch(e.keyCode) {
      case KEY.RIGHT : KEY.keys[1] &= 0xE; break
      case KEY.LEFT  : KEY.keys[1] &= 0xD; break
      case KEY.UP    : KEY.keys[1] &= 0xB; break
      case KEY.DOWN  : KEY.keys[1] &= 0x7; break
      case KEY.A     : KEY.keys[0] &= 0xE; break
      case KEY.B     : KEY.keys[0] &= 0xD; break
      case KEY.SELECT: KEY.keys[0] &= 0xB; break
      case KEY.START : KEY.keys[0] &= 0x7; break
    }
  },
  keyup: function(e) {
    switch(e.keyCode) {
      case KEY.RIGHT : KEY.keys[1] |= 0x1; break
      case KEY.LEFT  : KEY.keys[1] |= 0x2; break
      case KEY.UP    : KEY.keys[1] |= 0x4; break
      case KEY.DOWN  : KEY.keys[1] |= 0x8; break
      case KEY.A     : KEY.keys[0] |= 0x1; break
      case KEY.B     : KEY.keys[0] |= 0x2; break
      case KEY.SELECT: KEY.keys[0] |= 0x4; break
      case KEY.START : KEY.keys[0] |= 0x8; break
    }
  }
}
