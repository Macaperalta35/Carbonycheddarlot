// Bluetooth Thermal Printer Service — ESC/POS via BLE
// Compatible: Chrome/Edge en Windows, macOS, Linux, Android
// No compatible con: Firefox, Safari (iOS/macOS) — restricción del sistema operativo

const PROFILES = [
  {
    name: 'Nordic UART',
    service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    char:    '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  },
  {
    name: 'Generic ESC/POS BLE',
    service: '000018f0-0000-1000-8000-00805f9b34fb',
    char:    '00002af1-0000-1000-8000-00805f9b34fb',
  },
  {
    name: 'Custom BLE Printer',
    service: '0000ff00-0000-1000-8000-00805f9b34fb',
    char:    '0000ff02-0000-1000-8000-00805f9b34fb',
  },
];

// Mapa de caracteres españoles → código ESC/POS (página de código 858/PC850)
const CHAR_MAP = {
  'á':0xA0,'é':0x82,'í':0xA1,'ó':0xA2,'ú':0xA3,
  'Á':0xB5,'É':0x90,'Í':0xD6,'Ó':0xE0,'Ú':0xE9,
  'ñ':0xA4,'Ñ':0xA5,'ü':0x81,'Ü':0x9A,
  '¡':0xAD,'¿':0xA8,'°':0xF8,
};

// Constructor de comandos ESC/POS
class Doc {
  constructor() { this.b = []; }

  raw(...bytes)   { this.b.push(...bytes.flat(Infinity)); return this; }

  txt(str) {
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (CHAR_MAP[ch] !== undefined) {
        this.b.push(CHAR_MAP[ch]);
      } else {
        const code = str.charCodeAt(i);
        this.b.push(code < 256 ? code : 0x3F); // '?' para chars no soportados
      }
    }
    return this;
  }

  lf()          { return this.raw(0x0A); }
  init()        { return this.raw(0x1B, 0x40); }
  align(n)      { return this.raw(0x1B, 0x61, n); } // 0=izq 1=centro 2=der
  bold(on)      { return this.raw(0x1B, 0x45, on ? 1 : 0); }
  dblSize(on)   { return this.raw(0x1D, 0x21, on ? 0x11 : 0x00); }
  feed(n = 3)   { return this.raw(0x1B, 0x64, n); }
  cut()         { return this.raw(0x1D, 0x56, 0x42, 0x00); }

  // Fila con texto izquierda y derecha (columnas)
  row(left, right, w = 32) {
    const r = String(right);
    const l = String(left).substring(0, w - r.length - 1);
    const sp = Math.max(1, w - l.length - r.length);
    return this.txt(l + ' '.repeat(sp) + r).lf();
  }

  sep(ch = '-', w = 32) { return this.txt(ch.repeat(w)).lf(); }

  build() { return new Uint8Array(this.b); }
}

// Formatea número CLP en ASCII seguro para impresora
function numCLP(n) {
  return '$' + Math.abs(Math.round(n)).toLocaleString('es-CL');
}

class BTPrinterService {
  constructor() {
    this.device    = null;
    this.char      = null;
    this.connected = false;
    this.name      = '';
    this.profile   = '';
    this._subs     = [];
  }

  // Verifica si el navegador soporta Web Bluetooth
  isSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  // Suscripción reactiva al estado de conexión
  subscribe(fn) {
    this._subs.push(fn);
    return () => { this._subs = this._subs.filter(s => s !== fn); };
  }

  _emit() {
    const state = { connected: this.connected, name: this.name, profile: this.profile };
    this._subs.forEach(fn => fn(state));
  }

  // Conectar a impresora BLE
  async connect() {
    if (!this.isSupported()) {
      throw new Error(
        'Web Bluetooth no está disponible en este navegador.\n' +
        'Usa Google Chrome o Microsoft Edge en Windows, macOS, Linux o Android.\n' +
        'No es compatible con Firefox ni Safari (iOS/macOS).'
      );
    }

    this.device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PROFILES.map(p => p.service),
    });

    this.device.addEventListener('gattserverdisconnected', () => {
      this.connected = false;
      this.char = null;
      this._emit();
    });

    const server = await this.device.gatt.connect();

    for (const p of PROFILES) {
      try {
        const svc  = await server.getPrimaryService(p.service);
        this.char  = await svc.getCharacteristic(p.char);
        this.connected = true;
        this.name      = this.device.name || 'Impresora BLE';
        this.profile   = p.name;
        this._emit();
        return;
      } catch (_) { /* prueba el siguiente perfil */ }
    }

    await this.device.gatt.disconnect();
    throw new Error(
      'El dispositivo Bluetooth seleccionado no es una impresora ESC/POS BLE compatible.\n' +
      'Perfiles soportados: Nordic UART (6E400001), Generic ESC/POS (18F0), Custom BLE (FF00).'
    );
  }

  async disconnect() {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    this.connected = false;
    this.char      = null;
    this.device    = null;
    this.name      = '';
    this.profile   = '';
    this._emit();
  }

  // Envía datos en chunks de 100 bytes (límite BLE MTU)
  async _send(data) {
    if (!this.char) throw new Error('Sin conexión a impresora. Conecta primero.');
    for (let i = 0; i < data.length; i += 100) {
      await this.char.writeValueWithoutResponse(data.slice(i, i + 100));
      await new Promise(r => setTimeout(r, 40));
    }
  }

  // Imprime boleta de venta
  async printReceipt(order, W = 32) {
    const now  = new Date();
    const date = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const doc = new Doc();
    doc.init()
      .align(1).bold(true).dblSize(true)
      .txt('CARBON & CHEDDAR').lf()
      .dblSize(false).txt('Lota, Chile').lf()
      .bold(false).align(0)
      .sep('=', W)
      .bold(true).txt(`PEDIDO #${order.number}`).bold(false).lf()
      .txt(`${order.type}${order.table ? ' ' + order.table : ''}`).lf()
      .txt(`${date}  ${time}`).lf()
      .sep('-', W);

    order.items.forEach(item => {
      const base  = item.price * item.qty;
      const disc  = Math.round(base * ((item.itemDiscountPercent || 0) / 100));
      const total = base - disc;
      doc.row(`${item.name} x${item.qty}`, numCLP(total), W);
      if (disc > 0) {
        doc.row(`  Desc. -${item.itemDiscountPercent}%`, `-${numCLP(disc)}`, W);
      }
    });

    doc.sep('-', W);
    if ((order.discount || 0) > 0) {
      doc.row('Desc. general:', `-${numCLP(order.discount)}`, W);
    }

    doc.bold(true).row('TOTAL:', numCLP(order.total), W).bold(false)
      .txt(`Pago: ${order.paymentMethod}`).lf();

    if (order.paymentMethod === 'Efectivo' && order.cashReceived) {
      doc.row('Vuelto:', numCLP(order.cashReceived - order.total), W);
    }

    if (order.notes) {
      doc.sep('-', W).txt(`Notas: ${order.notes}`).lf();
    }

    doc.sep('=', W)
      .align(1)
      .txt('Precios incluyen 19% IVA').lf()
      .txt('Gracias por su preferencia!').lf()
      .feed(4).cut();

    await this._send(doc.build());
  }

  // Imprime comprobante de egreso
  async printEgreso(egreso, W = 32) {
    const doc = new Doc();
    doc.init()
      .align(1).bold(true).dblSize(true).txt('CARBON & CHEDDAR').lf()
      .dblSize(false).txt('Comprobante de Egreso').lf()
      .bold(false).align(0)
      .sep('=', W)
      .row('Fecha:', egreso.date, W)
      .row('Categoria:', egreso.category.split('/')[0].trim(), W)
      .row('Pago:', egreso.paymentMethod, W)
      .sep('-', W)
      .txt(`Desc: ${egreso.description}`).lf();

    if (egreso.supplier) doc.txt(`Proveedor: ${egreso.supplier}`).lf();

    doc.sep('-', W)
      .bold(true).row('MONTO:', numCLP(egreso.amount), W).bold(false)
      .sep('=', W)
      .align(1).txt('Carbon & Cheddar POS').lf()
      .feed(4).cut();

    await this._send(doc.build());
  }

  // Imprime informe de turno (texto plano)
  async printShiftReport(lines, W = 40) {
    const doc = new Doc();
    doc.init()
      .align(1).bold(true).dblSize(true).txt('CARBON & CHEDDAR').lf()
      .dblSize(false).txt('Entrega de Turno').lf()
      .bold(false).align(0).sep('=', W);

    lines.split('\n').forEach(line => {
      doc.txt(line.substring(0, W)).lf();
    });

    doc.feed(4).cut();
    await this._send(doc.build());
  }
}

export const btPrinter = new BTPrinterService();
