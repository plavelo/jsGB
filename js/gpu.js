GPU = {
  vram: [],
  oam: [],
  reg: [],
  tilemap: [],
  spritemap: [],
  palette: {'bg':[], 'obj0':[], 'obj1':[]},
  scanrow: [],

  scanline: 0,
  gpumode: 0,
  ticks: 0,

  scrollY: 0,
  scrollX: 0,
  raster: 0,

  control: 0,

  reset: function() {
    for (var i=0; i<8192; i++) {
      GPU.vram[i] = 0
    }
    for (var i=0; i<160; i++) {
      GPU.oam[i] = 0
    }
    for (var i=0; i<4; i++) {
      GPU.palette.bg[i] = 255
      GPU.palette.obj0[i] = 255
      GPU.palette.obj1[i] = 255
    }
    for (var i=0; i<512; i++) {
      GPU.tilemap[i] = []
      for (var j=0; j<8; j++) {
        GPU.tilemap[i][j] = []
        for (var k=0; k<8; k++) {
          GPU.tilemap[i][j][k] = 0
        }
      }
    }

    var c = document.getElementById('screen')
    if (c && c.getContext) {
      GPU.canvas = c.getContext('2d')
      if (!GPU.canvas) {
        throw new Error('GPU: Canvas context could not be created.')
      } else {
        if (GPU.canvas.createImageData) {
          GPU.screen = GPU.canvas.createImageData(160,144)
        } else if (GPU.canvas.getImageData) {
          GPU.screen = GPU.canvas.getImageData(0,0,160,144)
        } else {
          GPU.screen = {'width': 160, 'height': 144, 'data': new Array(160 * 144 * 4)}
        }
        for (var i=0; i<GPU.screen.data.length; i++) {
          GPU.screen.data[i] = 255
        }
        GPU.canvas.putImageData(GPU.screen, 0, 0)
      }
    }

    GPU.scanline = 0
    GPU.gpumode = 2
    GPU.ticks = 0
    GPU.scrollY = 0
    GPU.scrollX = 0
    GPU.raster = 0

    for (var i=0; i<160; i++) {
      GPU.scanrow[i] = 0
    }

    for (var i=0; i<40; i++) {
      GPU.spritemap[i] = {'y': -16, 'x': -8, 'tile': 0, 'palette': 0, 'yflip': 0, 'xflip': 0, 'prio': 0, 'num': i}
    }
  },
  checkline: function() {
    GPU.ticks += Z80.r.m
    switch (GPU.gpumode) {
      // In hblank
      case 0: {
        if (GPU.ticks >= 51) {
          // End of hblank for last scanline; render screen
          if (GPU.scanline == 143) {
            GPU.gpumode = 1
            GPU.canvas.putImageData(GPU.screen, 0, 0)
            MMU.if |= 1
          } else {
            GPU.gpumode = 2
          }
          GPU.scanline++
          GPU.ticks = 0
        }
        break
      }
      // In vblank
      case 1: {
        if (GPU.ticks >= 114) {
          GPU.ticks = 0
          GPU.scanline++
          if (GPU.scanline > 153) {
            GPU.scanline = 0
            GPU.gpumode = 2
          }
        }
        break
      }
      // In OAM-read mode
      case 2: {
        if (GPU.ticks >= 20) {
          GPU.ticks = 0
          GPU.gpumode = 3
        }
        break
      }
      // In VRAM-read mode
      case 3: {
        // Render scanline at end of allotted time
        if (GPU.ticks >= 43) {
          GPU.ticks = 0
          GPU.gpumode = 0
          if (!(GPU.control & 0x80)) { // check lcdon
            break
          }
          if ((GPU.control & 0x01)) { // check bgon
            var pixelOffset = GPU.scanline * 160 * 4
            var mapOffset = ((GPU.control & 0x08) ? 0x1C00 : 0x1800) + ((((GPU.scanline + GPU.scrollY) & 255) >> 3) << 5)
            var y = (GPU.scanline + GPU.scrollY) & 7
            var x = GPU.scrollX & 7
            var lineOffset = (GPU.scrollX >> 3) & 31
            var bgtilebase = (GPU.control & 0x10) ? 0x0000 : 0x0800
            var tile = GPU.vram[mapOffset + lineOffset]
            if (bgtilebase && tile < 128) {
              tile += 256
            }
            var tilerow = GPU.tilemap[tile][y]
            for (var i=0; i<160; i++) {
              GPU.scanrow[160 - x] = tilerow[x]
              GPU.screen.data[pixelOffset + 3] = GPU.palette.bg[tilerow[x]]
              x++
              if (x == 8) {
                lineOffset = (lineOffset + 1) & 31
                x = 0
                tile = GPU.vram[mapOffset + lineOffset]
                if (bgtilebase && tile < 128) {
                  tile = 256 + tile
                }
                tilerow = GPU.tilemap[tile][y]
              }
              pixelOffset += 4
            }
          }
          if ((GPU.control & 0x02)) { // check objon
            var cnt = 0
            if (!(GPU.control & 0x04)) { // check objsize
              var tilerow
              var sprite
              var pal
              var x
              var pixelOffset = GPU.scanline * 160 * 4
              for (var i=0; i<40; i++) {
                sprite = GPU.spritemap[i]
                if (sprite.y <= GPU.scanline && (sprite.y + 8) > GPU.scanline) {
                  if (sprite.yflip) {
                    tilerow = GPU.tilemap[sprite.tile][7 - (GPU.scanline - sprite.y)]
                  } else {
                    tilerow = GPU.tilemap[sprite.tile][GPU.scanline - sprite.y]
                  }
                  if (sprite.palette) {
                    pal = GPU.palette.obj1
                  } else {
                    pal = GPU.palette.obj0
                  }
                  pixelOffset = (GPU.scanline * 160 + sprite.x) * 4
                  for (var x=0; x<8; x++) {
                    if (sprite.x + x >=0 && sprite.x + x < 160) {
                      var color = sprite.xflip ? tilerow[7 - x] : tilerow[x]
                      if (color && (sprite.prio || !GPU.scanrow[x])) {
                        GPU.screen.data[pixelOffset + 3] = pal[color]
                      }
                    }
                    pixelOffset += 4
                  }
                  cnt++
                  if (cnt > 10) {
                    break
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  // Takes a value written to VRAM, and updates the
  // internal tile data set
  updatetile: function(addr, val) {
    var saddr = addr
    if (addr & 1) {
      saddr--
      addr--
    }
    // Work out which tile and row was updated
    var tile = (addr >> 4) & 511
    var y = (addr >> 1) & 7
    var sx
    // Find bit index for this pixel
    for (var x=0; x<8; x++) {
      sx = 1 << (7 - x)
      // Update tile set
      GPU.tilemap[tile][y][x] = ((GPU.vram[saddr] & sx) ? 1 : 0) | ((GPU.vram[saddr + 1] & sx) ? 2 : 0)
    }
  },
  updateoam: function(addr, val) {
    addr -= 0xFE00
    var obj = addr >> 2
    if (obj < 40) {
      switch (addr & 3) {
        case 0: {
          GPU.spritemap[obj].y = val - 16
          break
        }
        case 1: {
          GPU.spritemap[obj].x = val - 8
          break
        }
        case 2: {
          if (GPU.control & 0x04) { // check sprite size
            GPU.spritemap[obj].tile = (val & 0xFE)
          } else {
            GPU.spritemap[obj].tile = val
          }
          break
        }
        case 3: {
          GPU.spritemap[obj].palette = (val & 0x10) ? 1 : 0
          GPU.spritemap[obj].xflip = (val & 0x20) ? 1 : 0
          GPU.spritemap[obj].yflip = (val & 0x40) ? 1 : 0
          GPU.spritemap[obj].prio = (val & 0x80) ? 1 : 0
        }
      }
    }
  },
  rb: function(addr) {
    var gaddr = addr - 0xFF40
    switch(gaddr) {
      case 0:
        return GPU.control
      case 1:
        return (GPU.scanline == GPU.raster ? 4 : 0) | GPU.gpumode
      case 2:
        return GPU.scrollY
      case 3:
        return GPU.scrollX
      case 4:
        return GPU.scanline
      case 5:
        return GPU.raster
      default:
        return GPU.reg[gaddr]
    }
  },
  wb: function(address, value) {
    var gaddr = address - 0xFF40
    GPU.reg[gaddr] = value
    switch (gaddr) {
      case 0:
        GPU.control = value
        break
      case 2:
        GPU.scrollY = value
        break
      case 3:
        GPU.scrollX = value
        break
      case 5:
        GPU.raster = value
      // OAM DMA
      case 6:
        var v
        for (var i=0; i<160; i++) {
          v = MMU.rb((value << 8) + i)
          GPU.oam[i] = v
          GPU.updateoam(0xFE00 + i, v)
        }
        break
      // BG palette mapping
      case 7:
        for (var i=0; i<4; i++) {
          switch((value >> (i * 2)) & 3) {
            case 0:
              GPU.palette.bg[i] = 255
              break
            case 1:
              GPU.palette.bg[i] = 192
              break
            case 2:
              GPU.palette.bg[i] = 96
              break
            case 3:
              GPU.palette.bg[i] = 0
              break
          }
        }
        break
      // OBJ0 palette mapping
      case 8:
        for (var i=0; i<4; i++) {
          switch ((value >> (i * 2)) & 3) {
            case 0:
              GPU.palette.obj0[i] = 255
              break
            case 1:
              GPU.palette.obj0[i] = 192
              break
            case 2:
              GPU.palette.obj0[i] = 96
              break
            case 3:
              GPU.palette.obj0[i] = 0
              break
          }
        }
        break
      // OBJ1 palette mapping
      case 9:
        for (var i=0; i<4; i++) {
          switch ((value >> (i * 2)) & 3) {
            case 0:
              GPU.palette.obj1[i] = 255
              break
            case 1:
              GPU.palette.obj1[i] = 192
              break
            case 2:
              GPU.palette.obj1[i] = 96
              break
            case 3:
              GPU.palette.obj1[i] = 0
              break
          }
        }
    }
  }
}
