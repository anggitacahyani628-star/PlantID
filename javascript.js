// ============================================================
// PLANTID - Integrasi Model Teachable Machine
// ============================================================

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/R_smT9Pah/";

let model = null;
let maxPredictions = 0;
let selectedFile = null;

// ---- Elemen DOM ----
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const uploadPlaceholder = document.getElementById("uploadPlaceholder");
const previewContainer = document.getElementById("previewContainer");
const imagePreview = document.getElementById("imagePreview");
const btnRemove = document.getElementById("btnRemove");
const btnAnalyze = document.getElementById("btnAnalyze");

const resultBlank = document.getElementById("resultBlank");
const resultLoading = document.getElementById("resultLoading");
const loadingStatus = document.getElementById("loadingStatus");
const progressBar = document.getElementById("progressBar");
const resultOutput = document.getElementById("resultOutput");

const resultConfidence = document.getElementById("resultConfidence");
const resultPlantName = document.getElementById("resultPlantName");
const resultStatusColor = document.getElementById("resultStatusColor");
const resultCaraMenanam = document.getElementById("resultCaraMenanam");
const resultWaktuPanen = document.getElementById("resultWaktuPanen");
const resultRecommendations = document.getElementById("resultRecommendations");
const btnReset = document.getElementById("btnReset");

// Info tambahan per jenis tanaman (informasi umum budidaya, BUKAN hasil deteksi penyakit AI,
// karena model saat ini hanya mengklasifikasi JENIS tanaman, bukan penyakitnya)
const plantInfo = {
    "padi": {
        display: "Padi (Oryza sativa)",
        caraMenanam: [
            "Rendam benih padi 24 jam lalu semai di lahan pembibitan selama 15-25 hari.",
            "Olah lahan sawah (bajak & garu), pastikan tergenang air dangkal sebelum tanam.",
            "Pindahkan bibit ke lahan utama dengan jarak tanam sekitar 20x20 cm.",
            "Jaga ketinggian air sawah sesuai fase pertumbuhan dan lakukan pemupukan bertahap."
        ],
        waktuPanen: "Sekitar 110-130 hari setelah tanam (tergantung varietas), ditandai bulir menguning dan merunduk.",
        tips: [
            "Pastikan lahan memiliki drainase dan sirkulasi air yang baik.",
            "Lakukan pemupukan nitrogen secara terkendali, tidak berlebihan.",
            "Amati daun secara rutin untuk deteksi dini gejala penyakit."
        ]
    },
    "tomat": {
        display: "Tomat (Solanum lycopersicum)",
        caraMenanam: [
            "Semai benih tomat di media persemaian selama 3-4 minggu hingga muncul 4-5 daun sejati.",
            "Siapkan lahan/polybag dengan tanah gembur bercampur pupuk kandang/kompos.",
            "Pindahkan bibit ke lahan dengan jarak tanam sekitar 50x60 cm.",
            "Pasang ajir (tiang penyangga) saat tanaman mulai tumbuh tinggi agar tidak roboh."
        ],
        waktuPanen: "Sekitar 70-90 hari setelah tanam, saat buah berubah warna dari hijau ke kuning/merah.",
        tips: [
            "Jaga jarak tanam agar sirkulasi udara antar tanaman baik.",
            "Siram secara teratur namun hindari genangan air di sekitar akar.",
            "Periksa daun dan buah secara berkala untuk tanda-tanda hama."
        ]
    },
    "cabai": {
        display: "Cabai (Capsicum sp.)",
        caraMenanam: [
            "Semai benih cabai di tray semai selama 3-4 minggu sampai bibit cukup kuat.",
            "Siapkan bedengan/polybag dengan campuran tanah, pupuk kandang, dan sekam.",
            "Pindahkan bibit ke lahan dengan jarak tanam sekitar 50x60 cm, gunakan mulsa plastik.",
            "Lakukan penyiraman rutin dan pemupukan susulan setiap 2 minggu sekali."
        ],
        waktuPanen: "Sekitar 75-90 hari setelah tanam, saat buah cabai berubah warna cerah (merah/hijau tua) dan mengkilap.",
        tips: [
            "Gunakan mulsa untuk menjaga kelembapan tanah di sekitar tanaman.",
            "Rotasi tanaman secara berkala untuk mengurangi risiko penyakit tanah.",
            "Pantau munculnya kutu daun yang dapat menyebarkan virus mosaik."
        ]
    }
};

// ---- Load model saat halaman dibuka ----
async function loadModel() {
    try {
        const modelURL = MODEL_URL + "model.json";
        const metadataURL = MODEL_URL + "metadata.json";
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        console.log("Model PlantID berhasil dimuat:", maxPredictions, "kelas");
    } catch (err) {
        console.error("Gagal memuat model:", err);
    }
}
loadModel();

// ---- Klik dropzone untuk membuka file picker ----
// (file-input-hidden sudah menutupi seluruh dropzone via CSS, jadi klik native sudah berfungsi.
//  Listener di bawah menangani perubahan file baik dari klik maupun drag & drop.)

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelected(file);
});

// ---- Drag & drop ----
["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add("drag-over");
    });
});

["dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove("drag-over");
    });
});

dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
});

// ---- Saat file dipilih ----
function handleFileSelected(file) {
    if (!file.type.startsWith("image/")) {
        alert("Mohon unggah file gambar (JPG/PNG).");
        return;
    }

    selectedFile = file;
    const objectUrl = URL.createObjectURL(file);
    imagePreview.src = objectUrl;

    uploadPlaceholder.classList.add("hidden");
    previewContainer.classList.remove("hidden");

    btnAnalyze.disabled = false;
    btnAnalyze.classList.remove("disabled");

    // Reset panel hasil ke kondisi awal setiap kali ganti gambar
    resultOutput.classList.add("hidden");
    resultLoading.classList.add("hidden");
    resultBlank.classList.remove("hidden");
}

// ---- Hapus gambar ----
btnRemove.addEventListener("click", (e) => {
    e.stopPropagation();
    resetUploader();
});

function resetUploader() {
    selectedFile = null;
    fileInput.value = "";
    imagePreview.src = "";

    previewContainer.classList.add("hidden");
    uploadPlaceholder.classList.remove("hidden");

    btnAnalyze.disabled = true;
    btnAnalyze.classList.add("disabled");
}

// ---- Klik "Analisis Tanaman" ----
btnAnalyze.addEventListener("click", async () => {
    if (!selectedFile || !model) {
        alert("Gambar belum dipilih atau model belum siap. Coba lagi sebentar.");
        return;
    }

    // Tampilkan loading state
    resultBlank.classList.add("hidden");
    resultOutput.classList.add("hidden");
    resultLoading.classList.remove("hidden");

    animateProgress();

    // Beri jeda kecil supaya animasi loading terlihat natural
    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
        const predictions = await model.predict(imagePreview);
        predictions.sort((a, b) => b.probability - a.probability);
        showResult(predictions);
    } catch (err) {
        console.error("Gagal melakukan prediksi:", err);
        alert("Terjadi kesalahan saat menganalisis gambar. Coba gambar lain.");
        resultLoading.classList.add("hidden");
        resultBlank.classList.remove("hidden");
    }
});

function animateProgress() {
    progressBar.style.width = "0%";
    let progress = 0;
    const messages = [
        "Membaca gambar tanaman...",
        "Mengekstrak fitur visual...",
        "Mencocokkan dengan model AI..."
    ];
    let msgIndex = 0;
    loadingStatus.textContent = messages[0];

    const interval = setInterval(() => {
        progress += 20;
        progressBar.style.width = Math.min(progress, 95) + "%";

        if (progress % 40 === 0 && msgIndex < messages.length - 1) {
            msgIndex++;
            loadingStatus.textContent = messages[msgIndex];
        }

        if (progress >= 95) clearInterval(interval);
    }, 150);
}

// ---- Tampilkan hasil prediksi ----
function showResult(predictions) {
    const top = predictions[0];
    const className = top.className.toLowerCase().trim();
    const confidencePercent = (top.probability * 100).toFixed(1);

    const info = plantInfo[className] || {
        display: top.className,
        caraMenanam: [],
        waktuPanen: "Informasi belum tersedia untuk jenis tanaman ini.",
        tips: []
    };

    resultConfidence.textContent = confidencePercent + "% Match";
    resultPlantName.textContent = info.display;
    resultStatusColor.style.backgroundColor = "var(--primary-light)"; // netral (identifikasi, bukan diagnosis penyakit)

    // Cara Menanam
    resultCaraMenanam.innerHTML = "";
    if (info.caraMenanam && info.caraMenanam.length > 0) {
        info.caraMenanam.forEach((langkah) => {
            const li = document.createElement("li");
            li.textContent = langkah;
            resultCaraMenanam.appendChild(li);
        });
    } else {
        const li = document.createElement("li");
        li.textContent = "Panduan menanam belum tersedia untuk jenis tanaman ini.";
        resultCaraMenanam.appendChild(li);
    }

    // Waktu Panen
    resultWaktuPanen.textContent = info.waktuPanen;

    // Tips tambahan
    resultRecommendations.innerHTML = "";
    if (info.tips && info.tips.length > 0) {
        info.tips.forEach((tip) => {
            const li = document.createElement("li");
            li.textContent = tip;
            resultRecommendations.appendChild(li);
        });
    } else {
        const li = document.createElement("li");
        li.textContent = "Belum ada tips tambahan untuk jenis tanaman ini.";
        resultRecommendations.appendChild(li);
    }

    resultLoading.classList.add("hidden");
    resultOutput.classList.remove("hidden");
}

// ---- Tombol "Identifikasi Gambar Lain" ----
btnReset.addEventListener("click", () => {
    resultOutput.classList.add("hidden");
    resultBlank.classList.remove("hidden");
    resetUploader();
});

// ============================================================
// NAVBAR MOBILE TOGGLE (fitur UI yang sudah ada di HTML sebelumnya)
// ============================================================
const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
        menuToggle.classList.toggle("active");
        navMenu.classList.toggle("active");
    });

    navMenu.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
            menuToggle.classList.remove("active");
            navMenu.classList.remove("active");
        });
    });
}