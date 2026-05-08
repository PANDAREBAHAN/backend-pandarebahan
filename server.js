const express = require('express');
const cors = require('cors');
const midtransClient = require('midtrans-client');

const app = express();

// Biar web HTML kita bisa ngobrol sama server ini
app.use(cors());
app.use(express.json());


// ==========================================
// 1. ENDPOINT MIDTRANS (PAYMENT GATEWAY)
// ==========================================
let snap = new midtransClient.Snap({
    isProduction: false, // False berarti masih mode Testing (Sandbox)
    serverKey: 'Mid-server-TtLa2g1X0tUW437u2NNIawF8',
    clientKey: 'Mid-client-FCtODPFpS64NOZtP'
});

app.post('/buat-transaksi', (req, res) => {
    let parameter = {
        "transaction_details": {
            "order_id": req.body.orderId,
            "gross_amount": req.body.totalHarga
        },
        "customer_details": {
            "first_name": "Pelanggan",
            "email": req.body.email
        }
    };

    snap.createTransaction(parameter)
        .then((transaction) => {
            res.json({ token: transaction.token });
        })
        .catch((error) => {
            console.error("Error dari Midtrans:", error);
            res.status(500).json({ error: error.message }); 
        });
});


// ==========================================
// 2. ENDPOINT RAJAONGKIR (CEK ONGKIR ASLI)
// ==========================================
app.post('/cek-ongkir', async (req, res) => {
    const { destinationCityId, weight, courier } = req.body;

    try {
        const response = await fetch('https://api.rajaongkir.com/starter/cost', {
            method: 'POST',
            headers: {
                // ⚠️ GANTI PAKAI API KEY RAJAONGKIR (SHIPPING COST) KAMU DI SINI
                'key': '8Sd6AvWMd364accbb75c3ec9gEXQF2jX', 
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'origin': '114', // 114 adalah ID Kota Depok (Markas PandaRebahan)
                'destination': destinationCityId, 
                'weight': weight, // Berat paket dalam gram
                'courier': courier // Pilihan: jne, pos, atau tiki
            })
        });

        const data = await response.json();

        // Cek kalau RajaOngkir merespon dengan sukses (Code 200)
        if (data.rajaongkir.status.code === 200) {
            // Kita ambil harga servis pertama (biasanya Reguler / yg paling umum)
            const hasil = data.rajaongkir.results[0].costs[0];
            res.json({
                success: true,
                ongkir: hasil.cost[0].value,
                estimasi: hasil.cost[0].etd + " Hari"
            });
        } else {
            console.error("Error dari server RajaOngkir:", data.rajaongkir.status.description);
            res.status(400).json({ error: data.rajaongkir.status.description });
        }
    } catch (error) {
        console.error("Gagal Request ke API RajaOngkir:", error);
        res.status(500).json({ error: "Gagal nembak API Ekspedisi" });
    }
});


// ==========================================
// 3. ENDPOINT MOCK API (GENERATE RESI OTOMATIS)
// ==========================================
app.post('/buat-resi', (req, res) => {
    const { orderId, kurirDipilih } = req.body;
    
    console.log(`Memanggil kurir ${kurirDipilih} untuk order ${orderId}...`);

    // Kita bikin simulasi loading 1.5 detik seolah-olah lagi nunggu balasan dari server logistik asli
    setTimeout(() => {
        let prefix = "BTSP"; 
        if(kurirDipilih.includes("JNE")) prefix = "01";
        else if(kurirDipilih.includes("POS")) prefix = "POS";
        else if(kurirDipilih.includes("TIKI")) prefix = "03";

        // Bikin nomor resi acak ala-ala sistem asli
        const fakeResi = prefix + Math.floor(1000000000 + Math.random() * 9000000000);

        // Balikin respon persis kayak format JSON
        res.json({
            success: true,
            message: "Order successfully created via Mock API",
            resi_asli: fakeResi,
            status: "allocated"
        });
        
        console.log(`[SUKSES] Resi berhasil digenerate: ${fakeResi}`);
    }, 1500); 
});


// ==========================================
// NYALAIN SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server Backend PandaRebahan udah jalan di port ${PORT}`);
});