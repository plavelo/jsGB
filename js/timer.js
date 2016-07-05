TIMER = {
  div: 0,
  tma: 0,
  tima: 0,
  tac: 0,

  clock: {
    main: 0,
    sub: 0,
    div: 0
  },

  reset: function() {
    TIMER.div = 0;
    TIMER.sdiv = 0;
    TIMER.tma = 0;
    TIMER.tima = 0;
    TIMER.tac = 0;
    TIMER.clock.main = 0;
    TIMER.clock.sub = 0;
    TIMER.clock.div = 0;
  },
  step: function() {
    TIMER.tima++;
    TIMER.clock.main = 0;
    if (TIMER.tima > 255) {
      TIMER.tima = TIMER.tma
      MMU.if |= 4
    }
  },
  inc: function() {
    var oldclk = TIMER.clock.main
    TIMER.clock.sub += Z80._r.m;
    if (TIMER.clock.sub > 3) {
      TIMER.clock.main++
      TIMER.clock.sub -= 4
      TIMER.clock.div++
      if (TIMER.clock.div == 16) {
        TIMER.clock.div = 0
        TIMER.div++
        TIMER.div &= 255
      }
    }
    if (TIMER.tac & 4) {
      switch(TIMER.tac & 3) {
        case 0:
          if (TIMER.clock.main >= 64) {
            TIMER.step()
          }
          break
        case 1:
          if (TIMER.clock.main >= 1) {
            TIMER.step()
          }
          break
        case 2:
          if (TIMER.clock.main >=  4) {
            TIMER.step()
          }
          break
        case 3:
          if (TIMER.clock.main >= 16) {
            TIMER.step()
          }
          break
      }
    }
  },
  rb: function(addr) {
    switch(addr) {
      case 0xFF04: return TIMER.div
      case 0xFF05: return TIMER.tima
      case 0xFF06: return TIMER.tma
      case 0xFF07: return TIMER.tac
    }
  },
  wb: function(addr, val) {
    switch(addr) {
      case 0xFF04: TIMER.div = 0; break
      case 0xFF05: TIMER.tima = val; break
      case 0xFF06: TIMER.tma = val; break
      case 0xFF07: TIMER.tac = val & 7; break
    }
  }
}
