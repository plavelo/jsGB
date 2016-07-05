GPU = {
  vram: [],
  oam: [],
  reg: [],
  tilemap: [],
  objdata: [],
  objdatasorted: [],
  palette: {'bg':[], 'obj0':[], 'obj1':[]},
  scanrow: [],

  curline: 0,
  curscan: 0,
  linemode: 0,
  modeclocks: 0,

  yscrl: 0,
  xscrl: 0,
  raster: 0,
  ints: 0,

  lcdon: 0,
  bgon: 0,
  objon: 0,
  winon: 0,

  objsize: 0,

  bgtilebase: 0x0000,
  bgmapbase: 0x1800,
  wintilebase: 0x1800,
  reset: function() {
    for (let i=0; i<8192; i++) {
      GPU.vram[i] = 0
    }
    for (let i=0; i<160; i++) {
      GPU.oam[i] = 0
    }
    for (let i=0; i<4; i++) {
      GPU.palette.bg[i] = 255
      GPU.palette.obj0[i] = 255
      GPU.palette.obj1[i] = 255
    }
    for (let i=0; i<512; i++) {
      GPU.tilemap[i] = []
      for (let j=0;j<8;j++) {
        GPU.tilemap[i][j] = []
        for (let k=0; k<8; k++) {
          GPU.tilemap[i][j][k] = 0
        }
      }
    }

    let c = document.getElementById('screen')
    if (c && c.getContext) {
      GPU.canvas = c.getContext('2d')
      if (!GPU.canvas) {
        throw new Error('GPU: Canvas context could not be created.');
      } else {
        if (GPU.canvas.createImageData) {
          GPU.scrn = GPU.canvas.createImageData(160,144);
        } else if (GPU.canvas.getImageData) {
          GPU.scrn = GPU.canvas.getImageData(0,0,160,144);
        } else {
          GPU.scrn = {'width': 160, 'height': 144, 'data': new Array(160 * 144 * 4)}
        }
        for (let i=0; i<GPU.scrn.data.length; i++) {
          GPU.scrn.data[i] = 255
        }
        GPU.canvas.putImageData(GPU.scrn, 0, 0)
      }
    }

    GPU.curline = 0
    GPU.curscan = 0
    GPU.linemode = 2
    GPU.modeclocks = 0
    GPU.yscrl = 0
    GPU.xscrl = 0
    GPU.raster = 0
    GPU.ints = 0

    GPU.lcdon = 0
    GPU.bgon = 0
    GPU.objon = 0
    GPU.winon = 0

    GPU.objsize = 0
    for (let i=0; i<160; i++) {
      GPU.scanrow[i] = 0
    }

    for (let i=0; i<40; i++) {
      GPU.objdata[i] = {'y': -16, 'x': -8, 'tile': 0, 'palette': 0, 'yflip': 0, 'xflip': 0, 'prio': 0, 'num': i}
    }

    GPU.bgtilebase = 0x0000
    GPU.bgmapbase = 0x1800
    GPU.wintilebase = 0x1800
  },
  checkline: function() {
    GPU.modeclocks += Z80.r.m
    switch(GPU.linemode) {
      // In hblank
      case 0:
        if (GPU.modeclocks >= 51) {
          // End of hblank for last scanline; render screen
          if (GPU.curline == 143) {
            GPU.linemode = 1
            GPU.canvas.putImageData(GPU.scrn, 0, 0)
            MMU.if |= 1
          } else {
            GPU.linemode = 2
          }
          GPU.curline++
          GPU.curscan += 640
          GPU.modeclocks = 0
        }
        break
      // In vblank
      case 1:
        if (GPU.modeclocks >= 114) {
          GPU.modeclocks = 0
          GPU.curline++
          if (GPU.curline > 153) {
            GPU.curline = 0
            GPU.curscan = 0
            GPU.linemode = 2
          }
        }
        break
      // In OAM-read mode
      case 2:
        if (GPU.modeclocks >= 20) {
          GPU.modeclocks = 0
          GPU.linemode = 3
        }
        break
      // In VRAM-read mode
      case 3:
        // Render scanline at end of allotted time
        if (GPU.modeclocks >= 43) {
          GPU.modeclocks = 0
          GPU.linemode = 0
          if (GPU.lcdon) {
            if (GPU.bgon) {
              var linebase = GPU.curscan
              var mapbase = GPU.bgmapbase + ((((GPU.curline + GPU.yscrl) & 255) >> 3) << 5)
              var y = (GPU.curline + GPU.yscrl) & 7
              var x = GPU.xscrl & 7
              var t = (GPU.xscrl >> 3) & 31
              var pixel
              var w = 160

              if (GPU.bgtilebase) {
                var tile = GPU.vram[mapbase + t]
                if (tile < 128) {
                  tile=256+tile;
                }
                var tilerow = GPU.tilemap[tile][y]
                do {
                  GPU.scanrow[160 - x] = tilerow[x]
                  GPU.scrn.data[linebase + 3] = GPU.palette.bg[tilerow[x]]
                  x++
                  if (x == 8) {
                    t = (t + 1) & 31
                    x = 0
                    tile = GPU.vram[mapbase + t]
                    if (tile < 128) {
                      tile = 256 + tile
                      tilerow = GPU.tilemap[tile][y]
                    }
                  }
                  linebase += 4
                } while(--w)
              } else {
                var tilerow = GPU.tilemap[GPU.vram[mapbase + t]][y]
                do {
                  GPU.scanrow[160 - x] = tilerow[x]
                  GPU.scrn.data[linebase + 3] = GPU.palette.bg[tilerow[x]]
                  x++
                  if (x == 8) {
                    t = (t + 1) & 31
                    x = 0
                    tilerow = GPU.tilemap[GPU.vram[mapbase + t]][y]
                  }
                  linebase += 4
                } while(--w)
              }
            }
            if (GPU.objon) {
              var cnt = 0
              if (GPU.objsize) {
                for (var i=0; i<40; i++) {
                }
              } else {
                var tilerow
                var obj
                var pal
                var pixel
                var x
                var linebase = GPU.curscan
                for (var i=0; i<40; i++) {
                  obj = GPU.objdatasorted[i]
                  if (obj.y <= GPU.curline && (obj.y + 8) > GPU.curline) {
                    if (obj.yflip) {
                      tilerow = GPU.tilemap[obj.tile][7 - (GPU.curline - obj.y)]
                    } else {
                      tilerow = GPU.tilemap[obj.tile][GPU.curline-obj.y]
                    }
                    if (obj.palette) {
                      pal = GPU.palette.obj1
                    } else {
                      pal = GPU.palette.obj0
                    }
                    linebase = (GPU.curline * 160 + obj.x) * 4
                    if (obj.xflip) {
                      for (x=0; x<8; x++) {
                        if (obj.x+x >=0 && obj.x+x < 160) {
                          if (tilerow[7 - x] && (obj.prio || !GPU.scanrow[x])) {
                            GPU.scrn.data[linebase + 3] = pal[tilerow[7 - x]]
                          }
                        }
                        linebase += 4
                      }
                    } else {
                      for (x=0; x<8; x++) {
                        if (obj.x + x >=0 && obj.x + x < 160) {
                          if (tilerow[x] && (obj.prio || !GPU.scanrow[x])) {
                            GPU.scrn.data[linebase + 3] = pal[tilerow[x]]
                          }
                        }
                        linebase += 4
                      }
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
        break
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
    if (obj<40) {
        switch (addr & 3) {
          case 0: {
            GPU.objdata[obj].y = val - 16
            break
          }
          case 1: {
            GPU.objdata[obj].x = val - 8
            break
          }
          case 2:
            if (GPU.objsize) {
              GPU.objdata[obj].tile = (val & 0xFE)
            } else {
              GPU.objdata[obj].tile = val
            }
            break
          case 3: {
            GPU.objdata[obj].palette = (val & 0x10) ? 1 : 0
            GPU.objdata[obj].xflip = (val & 0x20) ? 1 : 0
            GPU.objdata[obj].yflip = (val & 0x40) ? 1 : 0
            GPU.objdata[obj].prio = (val & 0x80) ? 1 : 0
            break
          }
        }
    }
    GPU.objdatasorted = GPU.objdata
    GPU.objdatasorted.sort(function(a, b) {
      if (a.x > b.x) {
        return -1
      }
      if (a.num > b.num) {
        return -1
      }
    })
  },
  rb: function(addr) {
    var gaddr = addr - 0xFF40
    switch(gaddr) {
      case 0:
        return (GPU.lcdon ? 0x80 : 0) |
               ((GPU.bgtilebase == 0x0000) ? 0x10 : 0) |
               ((GPU.bgmapbase == 0x1C00) ? 0x08 : 0) |
               (GPU.objsize ? 0x04 : 0) |
               (GPU.objon ? 0x02 : 0) |
               (GPU.bgon ? 0x01 : 0)
      case 1:
        return (GPU.curline == GPU.raster ? 4 : 0) | GPU.linemode
      case 2:
        return GPU.yscrl
      case 3:
        return GPU.xscrl
      case 4:
        return GPU.curline
      case 5:
        return GPU.raster
      default:
        return GPU.reg[gaddr]
    }
  },
  wb: function(addr, val) {
    var gaddr = addr - 0xFF40
    GPU.reg[gaddr] = val
    switch (gaddr) {
      case 0:
        GPU.lcdon = (val & 0x80) ? 1 : 0
        GPU.bgtilebase = (val & 0x10) ? 0x0000 : 0x0800
        GPU.bgmapbase = (val & 0x08) ? 0x1C00 : 0x1800
        GPU.objsize = (val & 0x04) ? 1 : 0
        GPU.objon = (val & 0x02) ? 1 : 0
        GPU.bgon = (val & 0x01) ? 1 : 0
        break
      case 2:
        GPU.yscrl = val
        break
      case 3:
        GPU.xscrl = val
        break
      case 5:
        GPU.raster = val
      // OAM DMA
      case 6:
        var v
        for (var i=0; i<160; i++) {
          v = MMU.rb((val << 8) + i)
          GPU.oam[i] = v
          GPU.updateoam(0xFE00 + i, v)
        }
        break
      // BG palette mapping
      case 7:
        for (var i=0; i<4; i++) {
          switch((val >> (i * 2)) & 3) {
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
          switch ((val >> (i * 2)) & 3) {
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
          switch ((val >> (i * 2)) & 3) {
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
        break
    }
  }
}
