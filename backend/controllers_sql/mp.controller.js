const axios = require('axios');
const mpCtrl = {}
const paymentStatusCache = new Map();

mpCtrl.getPaymentlink = async (req, res) => {
    try {
        const url = "https://api.mercadopago.com/checkout/preferences";
        const body = req.body || {};
        const payment = await axios.post(url, body, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
            }
        });
        return res.status(200).json(payment.data);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: true, msg: "Failed to create payment" });
    }
}

mpCtrl.generateQRCode = async (req, res) => {
    try {
        const { amount, description, external_reference } = req.body;
        if (!amount || !description) return res.status(400).json({ error: true, msg: "Monto y descripción son requeridos" });

        const checkoutUrl = "https://api.mercadopago.com/checkout/preferences";
        const checkoutBody = {
            items: [
                {
                    id: external_reference || `item-${Date.now()}`,
                    title: description,
                    description: description,
                    quantity: 1,
                    unit_price: parseFloat(amount),
                    currency_id: "ARS"
                }
            ],
            external_reference: external_reference || `QR-${Date.now()}`,
            notification_url: `${process.env.WEBHOOK_BASE_URL}/api/mp/webhook`,
            back_urls: {
                success: `${process.env.WEBHOOK_BASE_URL}/success`,
                failure: `${process.env.WEBHOOK_BASE_URL}/failure`,
                pending: `${process.env.WEBHOOK_BASE_URL}/pending`
            },
            auto_return: "approved",
            payment_methods: { excluded_payment_types: [], excluded_payment_methods: [], installments: 1 },
            payer: { email: "test@test.com" }
        };

        const checkoutResponse = await axios.post(checkoutUrl, checkoutBody, { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.ACCESS_TOKEN}` } });

        const qrData = checkoutResponse.data.init_point;
        const sandboxLink = checkoutResponse.data.sandbox_init_point;

        return res.status(200).json({ success: true, data: { preference_id: checkoutResponse.data.id, external_reference: external_reference || `QR-${Date.now()}`, init_point: qrData, sandbox_init_point: sandboxLink }, qr_data: qrData, message: "QR generado exitosamente" });

    } catch (error) {
        console.log('Error generating QR:', error.response?.data || error.message);
        return res.status(500).json({ error: true, msg: "Error al generar código QR", details: error.response?.data || error.message });
    }
}

mpCtrl.generateStaticQR = async (req, res) => {
    try {
        const { name, category, store_id } = req.body;
        const url = "https://api.mercadopago.com/pos";
        const body = { name: name || "Punto de Venta Principal", fixed_amount: false, category: category || 621102, external_store_id: store_id || "STORE001", external_id: `POS${Date.now()}` };
        const posResponse = await axios.post(url, body, { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.ACCESS_TOKEN}` } });
        return res.status(200).json({ success: true, data: { pos_id: posResponse.data.id, external_id: posResponse.data.external_id, name: posResponse.data.name, qr_code: posResponse.data.qr.image, qr_template: posResponse.data.qr.template_document }, message: "QR estático generado exitosamente" });
    } catch (error) {
        console.log('Error static QR:', error.response?.data || error.message);
        return res.status(500).json({ error: true, msg: "Error al generar QR estático", details: error.response?.data || error.message });
    }
}

mpCtrl.listPOS = async (req, res) => {
    try {
        const url = "https://api.mercadopago.com/pos";
        const response = await axios.get(url, { headers: { "Authorization": `Bearer ${process.env.ACCESS_TOKEN}` } });
        return res.status(200).json({ success: true, pos_list: response.data.results || response.data });
    } catch (error) {
        console.log('Error list POS:', error.response?.data || error.message);
        return res.status(500).json({ error: true, msg: "Error al obtener lista de POS", details: error.response?.data || error.message });
    }
}

mpCtrl.checkQRPaymentStatus = async (req, res) => {
    try {
        const { external_reference } = req.params;
        const paymentsUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${external_reference}`;
        const paymentsResponse = await axios.get(paymentsUrl, { headers: { "Authorization": `Bearer ${process.env.ACCESS_TOKEN}` } });
        if (paymentStatusCache.has(external_reference)) {
            const cachedPayment = paymentStatusCache.get(external_reference);
            if (cachedPayment.status === 'approved') paymentStatusCache.delete(external_reference);
            return res.status(200).json({ success: true, payment_status: cachedPayment.status, ...cachedPayment.data });
        }
        if (paymentsResponse.data.results && paymentsResponse.data.results.length > 0) {
            const payment = paymentsResponse.data.results[0];
            return res.status(200).json({ success: true, payment_status: payment.status, payment_id: payment.id, amount: payment.transaction_amount, currency: payment.currency_id, payment_method: payment.payment_method_id, date_created: payment.date_created, external_reference: payment.external_reference });
        }
        const merchantOrderUrl = `https://api.mercadopago.com/merchant_orders/search?external_reference=${external_reference}`;
        const merchantResponse = await axios.get(merchantOrderUrl, { headers: { "Authorization": `Bearer ${process.env.ACCESS_TOKEN}` } });
        if (merchantResponse.data.elements && merchantResponse.data.elements.length > 0) {
            const order = merchantResponse.data.elements[0];
            const payments = order.payments;
            if (payments && payments.length > 0) {
                const payment = payments[0];
                return res.status(200).json({ success: true, payment_status: payment.status, payment_id: payment.id, amount: payment.transaction_amount, order_id: order.id, external_reference: order.external_reference });
            }
        }
        return res.status(200).json({ success: true, payment_status: "pending", message: "Pago aún no procesado" });
    } catch (error) {
        console.log('Error checking payment:', error.response?.data || error.message);
        return res.status(500).json({ error: true, msg: "Error al verificar estado del pago", details: error.response?.data || error.message });
    }
}

mpCtrl.webhook = async (req, res) => {
    try {
        const { action, data, type } = req.body;
        if (action === 'payment.created' || action === 'payment.updated' || type === 'payment') {
            const paymentId = data.id || data;
            const paymentUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;
            const paymentResponse = await axios.get(paymentUrl, { headers: { "Authorization": `Bearer ${process.env.ACCESS_TOKEN}` } });
            const payment = paymentResponse.data;
            if (payment.external_reference && payment.status) {
                paymentStatusCache.set(payment.external_reference, { status: payment.status, data: payment });
            }
        }
        if (action === 'merchant_order' || type === 'merchant_order') {
            const orderId = data.id || data;
            const orderUrl = `https://api.mercadopago.com/merchant_orders/${orderId}`;
            await axios.get(orderUrl, { headers: { "Authorization": `Bearer ${process.env.ACCESS_TOKEN}` } });
        }
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing webhook:', error.response?.data || error.message);
        res.status(200).send('OK');
    }
}

mpCtrl.getSubscriptionLink = async (req, res) => {
    try {
        const url = "https://api.mercadopago.com/preapproval";
        const body = { reason: "Suscripción de ejemplo", auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 10000, currency_id: "ARS" }, back_url: "http://localhost:4200/returnpath", payer_email: "payer_email@gmail.com@google.com" };
        const subscription = await axios.post(url, body, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.ACCESS_TOKEN}` } });
        return res.status(200).json(subscription.data);
    } catch (error) {
        console.log('Error creating subscription:', error.response?.data || error.message);
        return res.status(500).json({ error: true, msg: "Failed to create subscription" });
    }
}

module.exports = mpCtrl;
