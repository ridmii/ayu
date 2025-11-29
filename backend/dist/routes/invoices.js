"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Order_1 = __importDefault(require("../models/Order"));
const Invoice_1 = __importDefault(require("../models/Invoice"));
const auth_1 = require("../middleware/auth");
// If the repo includes a base64-exporting font helper, write it to tmp and return path.
function tryWriteBase64FontToTmp() {
    try {
        const notoModulePath = path_1.default.join(__dirname, '..', '..', 'assets', 'fonts', 'noto-base64.js');
        if (!fs_1.default.existsSync(notoModulePath))
            return null;
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const noto = require(notoModulePath);
        let maybeB64 = null;
        if (typeof noto === 'string')
            maybeB64 = noto;
        else if (noto && typeof noto === 'object')
            maybeB64 = noto.base64 || noto.default || noto.noto || null;
        if (!maybeB64 || typeof maybeB64 !== 'string' || maybeB64.length < 100)
            return null;
        const b64 = maybeB64.replace(/\r|\n/g, '');
        const tmpDir = path_1.default.join(__dirname, '..', '..', 'tmp');
        if (!fs_1.default.existsSync(tmpDir))
            fs_1.default.mkdirSync(tmpDir, { recursive: true });
        const outPath = path_1.default.join(tmpDir, `noto-embedded-${Date.now()}.ttf`);
        fs_1.default.writeFileSync(outPath, Buffer.from(b64, 'base64'));
        return outPath;
    }
    catch (e) {
        console.warn('tryWriteBase64FontToTmp failed:', e && e.message);
        return null;
    }
}
function generatePdfWithChromium(html, fontPath) {
    return __awaiter(this, void 0, void 0, function* () {
        // Dynamic require so package isn't mandatory unless used
        let puppeteer;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            puppeteer = require('puppeteer');
        }
        catch (err) {
            throw new Error('puppeteer not installed. Run `npm install puppeteer` to enable HTML->PDF rendering.');
        }
        // Embed font as base64 if provided (use font/ttf MIME which Chromium accepts)
        let fontDataUrl = '';
        let fontB64Length = 0;
        if (fontPath && fs_1.default.existsSync(fontPath)) {
            const fontBuf = fs_1.default.readFileSync(fontPath);
            const b64 = fontBuf.toString('base64');
            fontDataUrl = `data:font/ttf;base64,${b64}`;
            fontB64Length = b64.length;
        }
        // If a font file wasn't available on disk, allow loading a base64 export
        // from `backend/assets/fonts/noto-base64.js` if the user placed it there.
        if (!fontDataUrl) {
            try {
                const notoModulePath = path_1.default.join(__dirname, '..', '..', 'assets', 'fonts', 'noto-base64.js');
                if (fs_1.default.existsSync(notoModulePath)) {
                    // require the module which may export a string or object { base64: '...' }
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const noto = require(notoModulePath);
                    let maybeB64 = null;
                    if (typeof noto === 'string')
                        maybeB64 = noto;
                    else if (noto && typeof noto === 'object')
                        maybeB64 = noto.base64 || noto.default || noto.noto || null;
                    if (maybeB64 && typeof maybeB64 === 'string' && maybeB64.length > 100) {
                        const b64 = maybeB64.replace(/\r|\n/g, '');
                        fontDataUrl = `data:font/ttf;base64,${b64}`;
                        fontB64Length = b64.length;
                        console.info('Loaded base64 font from noto-base64.js, length=', fontB64Length);
                    }
                    else {
                        console.warn('noto-base64.js present but did not export a valid base64 string');
                    }
                }
            }
            catch (e) {
                console.warn('Failed to load noto-base64.js:', e && e.message);
            }
        }
        const fontFaceCss = fontDataUrl
            ? `@font-face{font-family: 'SinhalaLocal'; src: url('${fontDataUrl}') format('truetype'); font-weight: normal; font-style: normal;}`
            : '';
        // Normalize HTML to NFC to help complex-script shaping
        const normalizedHtml = typeof html === 'string' ? html.normalize('NFC') : html;
        // Force the Sinhala font for all text elements to encourage correct shaping
        const fullHtml = `<!doctype html>
  <html lang="si"><head><meta charset="utf-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <style>
    ${fontFaceCss}
    html,body,* { font-family: ${fontDataUrl ? "'SinhalaLocal', 'Noto Sans Sinhala', sans-serif" : "'Noto Sans Sinhala', sans-serif"}; direction: ltr; }
    body { margin: 24px; }
    h1 { font-size: 18px; }
    p, li { font-size: 12px; }
  </style>
  </head><body>${normalizedHtml}</body></html>`;
        // Puppeteer launch options - include flags that help with font rendering and Windows
        const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=medium'];
        const baseLaunchOptions = {
            args: launchArgs,
            headless: true,
            defaultViewport: null,
            ignoreHTTPSErrors: true,
        };
        // Try to launch Puppeteer; if it fails, retry with a system Chrome executable path
        let browser = null;
        const tryLaunch = (opts) => __awaiter(this, void 0, void 0, function* () {
            try {
                return yield puppeteer.launch(opts);
            }
            catch (err) {
                console.warn('puppeteer.launch failed with opts:', !!(opts && opts.executablePath), err && err.message);
                throw err;
            }
        });
        try {
            if (process.env.PUPPETEER_EXECUTABLE_PATH)
                baseLaunchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            browser = yield tryLaunch(baseLaunchOptions);
        }
        catch (firstErr) {
            // Common Windows Chrome locations to try as a fallback
            const commonPaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
            ];
            for (const p of commonPaths) {
                if (fs_1.default.existsSync(p)) {
                    try {
                        console.info('Retrying puppeteer.launch with executablePath=', p);
                        browser = yield tryLaunch(Object.assign(Object.assign({}, baseLaunchOptions), { executablePath: p }));
                        break;
                    }
                    catch (e) {
                        // continue to next
                    }
                }
            }
            if (!browser) {
                // as last resort, try again without any executablePath
                try {
                    browser = yield tryLaunch(baseLaunchOptions);
                }
                catch (e) {
                    throw firstErr; // rethrow the original error
                }
            }
        }
        try {
            const page = yield browser.newPage();
            // ensure correct encoding and wait for fonts to be loaded
            yield page.setContent(fullHtml, { waitUntil: 'networkidle0' });
            try {
                // wait for document fonts to be ready if available
                yield page.evaluate(() => __awaiter(this, void 0, void 0, function* () {
                    const d = document;
                    if (d.fonts && d.fonts.ready) {
                        try {
                            yield d.fonts.ready;
                        }
                        catch (err) { /* ignore */ }
                    }
                }));
            }
            catch (e) {
                // ignore evaluate errors but log
                console.warn('Warning waiting for document.fonts.ready:', e && e.message);
            }
            // diagnostic logging
            console.info('generatePdfWithChromium: fontB64Length=', fontB64Length, ' usingExecutable=', !!(baseLaunchOptions && baseLaunchOptions.executablePath));
            const pdf = yield page.pdf({ format: 'A4', printBackground: true });
            // For debugging: write a copy of the HTML and font (if present) into a temp folder
            try {
                const tmpDir = path_1.default.join(__dirname, '..', '..', 'tmp');
                if (!fs_1.default.existsSync(tmpDir))
                    fs_1.default.mkdirSync(tmpDir, { recursive: true });
                const ts = Date.now();
                fs_1.default.writeFileSync(path_1.default.join(tmpDir, `invoice-debug-${ts}.html`), fullHtml, 'utf8');
                if (fontPath && fs_1.default.existsSync(fontPath)) {
                    try {
                        fs_1.default.copyFileSync(fontPath, path_1.default.join(tmpDir, `embedded-font-${ts}.ttf`));
                    }
                    catch (e) { /* noop */ }
                }
            }
            catch (e) {
                console.warn('Failed to write debug artifacts:', e && e.message);
            }
            return pdf;
        }
        finally {
            try {
                yield browser.close();
            }
            catch (e) { /* ignore close errors */ }
        }
    });
}
const router = express_1.default.Router();
// Generate invoice
router.post('/generate', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId, paymentMethod } = req.body;
    try {
        const order = yield Order_1.default.findById(orderId).populate('customer');
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        const customer = order.customer;
        if (!customer)
            return res.status(404).json({ error: 'Customer not found' });
        // Compute totals from order items so invoice logic is consistent
        const subtotal = (order.items || []).reduce((s, it) => s + ((it.quantity || 0) * (it.unitPrice || 0)), 0);
        const pending = (order.pendingPayments || 0);
        const includePending = !!order.pendingPaid;
        const totalAmount = subtotal + (includePending ? pending : 0);
        const invoice = new Invoice_1.default({
            orderId,
            customerId: order.customer,
            totalAmount,
            pendingAmount: pending,
            paymentMethod,
            isPersonalized: !!order.personalized,
            // store whether pending was paid at invoice time
            paidPending: includePending,
        });
        yield invoice.save();
        // Generate PDF
        const doc = new pdfkit_1.default();
        // Try to register a Sinhala-capable font so Sinhala characters render correctly.
        // Place a TTF (e.g. NotoSansSinhala-Regular.ttf) at backend/assets/fonts/ or set SINHALA_FONT_PATH env var.
        try {
            let fontPath = process.env.SINHALA_FONT_PATH || path_1.default.join(__dirname, '..', '..', 'assets', 'fonts', 'NotoSansSinhala-Regular.ttf');
            console.info('Checking Sinhala font path:', fontPath);
            let fontToRegister = fontPath;
            if (!fs_1.default.existsSync(fontToRegister)) {
                // try to write base64-exported font to tmp and register that
                const tmpFont = tryWriteBase64FontToTmp();
                if (tmpFont) {
                    console.info('Using embedded base64 font for PDFKit at', tmpFont);
                    fontToRegister = tmpFont;
                }
            }
            if (fs_1.default.existsSync(fontToRegister)) {
                console.info('Sinhala font found, registering for PDF output');
                doc.registerFont('Sinhala', fontToRegister);
                doc.font('Sinhala');
            }
            else {
                console.info('Sinhala font not found at path:', fontPath);
                if (process.env.SINHALA_FONT_PATH) {
                    console.warn('SINHALA_FONT_PATH is set but file not found:', process.env.SINHALA_FONT_PATH);
                }
                // Let PDFKit fall back to the default font
            }
        }
        catch (err) {
            console.warn('Failed to register Sinhala font for invoice PDF:', err);
        }
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const pdfData = Buffer.concat(buffers);
                // send PDF directly so browser renders it correctly (prevents binary-as-text issues)
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice._id}.pdf`);
                res.setHeader('Content-Length', String(pdfData.length));
                res.send(pdfData);
            }
            catch (err) {
                console.error('Failed to send generated PDF:', err);
                res.status(500).json({ error: 'Failed to generate PDF' });
            }
        }));
        // If configured to use Chromium/html rendering, prefer it because complex scripts
        // like Sinhala require proper shaping that PDFKit cannot provide.
        const fontPath = process.env.SINHALA_FONT_PATH || path_1.default.join(__dirname, '..', '..', 'assets', 'fonts', 'NotoSansSinhala-Regular.ttf');
        const useChromium = process.env.PDF_RENDERER === 'chromium' || process.env.USE_CHROMIUM_PDF === 'true' || (fontPath && fs_1.default.existsSync(fontPath));
        console.info('Invoice renderer decision: useChromium=', useChromium, ' fontPath=', fontPath);
        if (useChromium) {
            // Build HTML invoice
            const itemsHtml = (order.items || []).map((it) => `<li>${it.productName} - Qty: ${it.quantity} ${it.unit ? '(' + it.unit + ')' : ''}</li>`).join('');
            // Show subtotal + pending (mark pending as Paid when includePending)
            const pendingLabel = `${pending} LKR${includePending ? ' (Paid)' : ''}`;
            const html = `<h1>Invoice for ${customer.name}</h1>
          <p>Order ID: ${orderId}</p>
          <p>Subtotal: ${subtotal} LKR</p>
          <p>Pending Payments: ${pendingLabel}</p>
          <p><strong>TOTAL: ${totalAmount} LKR</strong></p>
          <p>Payment Method: ${paymentMethod}</p>
          <h3>Items</h3><ul>${itemsHtml}</ul>`;
            try {
                console.info('Attempting Chromium-based PDF generation');
                const pdfBuf = yield generatePdfWithChromium(html, fontPath);
                console.info('Chromium PDF generated, size=', pdfBuf.length);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice._id}.pdf`);
                res.setHeader('Content-Length', String(pdfBuf.length));
                return res.send(pdfBuf);
            }
            catch (err) {
                console.warn('Chromium PDF generation failed or puppeteer not installed:', err.message || err);
                // fall back to PDFKit below
            }
        }
        // Use the registered font if available; PDFKit will fall back otherwise.
        console.info('Falling back to PDFKit renderer; registered fonts:', Object.keys(doc._fontFamilies || {}));
        doc.fontSize(14).text(`Invoice for ${customer.name}`);
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Order ID: ${orderId}`);
        doc.text(`Subtotal: ${subtotal} LKR`);
        doc.text(`Pending Payments: ${pending} LKR${includePending ? ' (Paid)' : ''}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(`TOTAL: ${totalAmount} LKR`);
        doc.text(`Payment Method: ${paymentMethod}`);
        doc.end();
        console.info('PDFKit PDF generation triggered (buffers will be sent on end event)');
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate invoice' });
    }
}));
// Get invoices (exclude personalized for non-admins)
router.get('/', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const invoices = yield Invoice_1.default.find({ isPersonalized: false }).populate('orderId customerId');
        res.json(invoices);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
}));
// Get all invoices for admin (including personalized)
router.get('/admin', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const invoices = yield Invoice_1.default.find().populate('orderId customerId');
        res.json(invoices);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
}));
// Temporary test endpoint to generate invoice PDF without admin auth.
// Enabled only when ENABLE_TEST_INVOICE=true in env to avoid accidental exposure.
router.get('/generate-test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (process.env.ENABLE_TEST_INVOICE !== 'true') {
        return res.status(403).json({ error: 'Test invoice generation disabled' });
    }
    const orderId = String(req.query.orderId || '');
    const paymentMethod = String(req.query.paymentMethod || 'card');
    if (!orderId)
        return res.status(400).json({ error: 'orderId query param required' });
    try {
        const order = yield Order_1.default.findById(orderId).populate('customer');
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        const customer = order.customer;
        const subtotal = (order.items || []).reduce((s, it) => s + ((it.quantity || 0) * (it.unitPrice || 0)), 0);
        const pending = (order.pendingPayments || 0);
        const includePending = !!order.pendingPaid;
        const totalAmount = subtotal + (includePending ? pending : 0);
        // reuse the same PDF generation logic as POST /generate
        const invoice = new Invoice_1.default({ orderId, customerId: order.customer, totalAmount, pendingAmount: pending, paymentMethod, isPersonalized: !!order.personalized, paidPending: includePending });
        yield invoice.save();
        // decide renderer as in main route
        const fontPath = process.env.SINHALA_FONT_PATH || path_1.default.join(__dirname, '..', '..', 'assets', 'fonts', 'NotoSansSinhala-Regular.ttf');
        const useChromium = process.env.PDF_RENDERER === 'chromium' || process.env.USE_CHROMIUM_PDF === 'true' || (fontPath && fs_1.default.existsSync(fontPath));
        console.info('Test generate: useChromium=', useChromium, ' fontPath=', fontPath);
        if (useChromium) {
            const itemsHtml = (order.items || []).map((it) => `<li>${it.productName} - Qty: ${it.quantity} ${it.unit ? '(' + it.unit + ')' : ''}</li>`).join('');
            const pendingLabel = `${pending} LKR${includePending ? ' (Paid)' : ''}`;
            const html = `<h1>Invoice for ${customer.name}</h1><p>Order ID: ${orderId}</p><p>Subtotal: ${subtotal} LKR</p><p>Pending Payments: ${pendingLabel}</p><p><strong>TOTAL: ${totalAmount} LKR</strong></p><p>Payment Method: ${paymentMethod}</p><h3>Items</h3><ul>${itemsHtml}</ul>`;
            try {
                const pdfBuf = yield generatePdfWithChromium(html, fontPath);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice._id}.pdf`);
                res.setHeader('Content-Length', String(pdfBuf.length));
                return res.send(pdfBuf);
            }
            catch (err) {
                console.warn('Test: Chromium PDF generation failed:', err.message || err);
            }
        }
        // Fallback to PDFKit
        const doc = new pdfkit_1.default();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice._id}.pdf`);
            res.setHeader('Content-Length', String(pdfData.length));
            res.send(pdfData);
        });
        try {
            let fontToRegister = fontPath;
            if (!fs_1.default.existsSync(fontToRegister)) {
                const tmpFont = tryWriteBase64FontToTmp();
                if (tmpFont) {
                    console.info('Test: using embedded base64 font at', tmpFont);
                    fontToRegister = tmpFont;
                }
            }
            if (fs_1.default.existsSync(fontToRegister)) {
                doc.registerFont('Sinhala', fontToRegister);
                doc.font('Sinhala');
            }
        }
        catch (e) {
            console.warn('Test: failed to register font', e);
        }
        doc.fontSize(14).text(`Invoice for ${customer.name}`);
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Order ID: ${orderId}`);
        doc.text(`Subtotal: ${subtotal} LKR`);
        doc.text(`Pending Payments: ${pending} LKR${includePending ? ' (Paid)' : ''}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(`TOTAL: ${totalAmount} LKR`);
        doc.text(`Payment Method: ${paymentMethod}`);
        doc.end();
    }
    catch (error) {
        console.error('Test invoice generation failed:', error);
        res.status(500).json({ error: 'Failed to generate test invoice' });
    }
}));
exports.default = router;
