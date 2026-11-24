import { CtQuestion, LearningScenario } from '../types/game';

export const LEARNING_SCENARIOS: LearningScenario[] = [
  {
    id: 'basket',
    title: 'Lemparan 3-Poin Basket',
    tagline: 'Lintasan Proyektil & Titik Puncak Maksimum',
    emoji: '🏀',
    badgeColor: '#FF5A36',
    story:
      'Saat pemain melempar bola basket dari tinggi bahu 2 meter, gravitasi menarik bola sehingga lintasannya membentuk parabola terbuka ke bawah (a < 0). Agar bola masuk ring dengan mulus melewati tangan lawan, titik puncak harus cukup tinggi.',
    equationLabel: 'h(x) = ax² + bx + c',
    defaultA: -0.25,
    defaultB: 2.0,
    defaultC: 2.0,
    minA: -0.6,
    maxA: -0.1,
    minB: 0.5,
    maxB: 3.5,
    minC: 0.5,
    maxC: 4.0,
    xLabel: 'Jarak Mendatar x (m)',
    yLabel: 'Ketinggian Bola h (m)',
    pillars: [
      {
        pillar: 'Dekomposisi',
        description:
          'Pecah lemparan jadi 3 komponen: kelengkungan gravitasi (a), dorongan sudut lempar (b), dan tinggi awal tangan pelempar (c).',
        formulaHint: 'c = h(0) = tinggi awal bola',
      },
      {
        pillar: 'Pengenalan Pola',
        description:
          'Karena bola naik lalu turun, koefisien a selalu negatif (a < 0). Semakin besar |a|, lintasan semakin curam & sempit.',
        formulaHint: 'a < 0 → Kurva terbuka ke bawah (puncak maksimum)',
      },
      {
        pillar: 'Abstraksi',
        description:
          'Abaikan warna bola, angin kecil, dan putaran bola; fokus pada koordinat (x, h) dan titik puncak (xp, yp) saja.',
        formulaHint: 'h(x) = a(x - xp)² + yp',
      },
      {
        pillar: 'Algoritma',
        description:
          '1) Cek tinggi awal c → 2) Hitung jarak puncak xp = -b/2a → 3) Substitusi xp untuk tinggi maksimum yp → 4) Cocokkan tinggi bola di posisi ring.',
        formulaHint: 'xp = -b / (2a),  yp = h(xp)',
      },
    ],
  },
  {
    id: 'fountain',
    title: 'Air Mancur Taman Kota',
    tagline: 'Sumbu Simetri & Titik Jatuh (Akar)',
    emoji: '⛲',
    badgeColor: '#1D63DC',
    story:
      'Arsitek taman merancang semprotan air mancur agar jatuh tepat ke dalam kolam penampung tanpa membasahi trotoar. Sifat simetri parabola membuat jarak dari nosel ke puncak sama persis dengan jarak dari puncak ke titik jatuh pada ketinggian yang sama!',
    equationLabel: 'y(x) = ax² + bx + c',
    defaultA: -0.5,
    defaultB: 3.0,
    defaultC: 0.5,
    minA: -0.9,
    maxA: -0.15,
    minB: 1.0,
    maxB: 4.5,
    minC: 0.0,
    maxC: 2.5,
    xLabel: 'Jarak dari Nosel x (m)',
    yLabel: 'Tinggi Semburan y (m)',
    pillars: [
      {
        pillar: 'Dekomposisi',
        description:
          'Pisahkan masalah desain air mancur menjadi posisi nosel (0, c), titik puncak semprotan (xp, yp), dan titik jatuh di permukaan kolam (y = 0).',
        formulaHint: 'Titik jatuh di tanah: y(x) = 0',
      },
      {
        pillar: 'Pengenalan Pola',
        description:
          'Kurva kiri dan kanan simetris terhadap garis x = xp! Jika nosel di x = 0 (tinggi 0) dan puncak di x = 3, air pasti mendarat di x = 6.',
        formulaHint: 'Simetri: x₂ = 2 · xp (saat c = 0)',
      },
      {
        pillar: 'Abstraksi',
        description:
          'Tetesan air dimodelkan sebagai satu garis kurva kuadrat mulus sehingga debit dan luas kolam mudah dihitung matematis.',
        formulaHint: 'D = b² - 4ac > 0 → memotong kolam di 2 titik',
      },
      {
        pillar: 'Algoritma',
        description:
          '1) Tentukan tinggi puncak yp → 2) Hitung D = b² - 4ac → 3) Cari akar x₁, x₂ dengan rumus ABC untuk menentukan lebar minimum kolam.',
        formulaHint: 'x₁,₂ = (-b ± √D) / (2a)',
      },
    ],
  },
  {
    id: 'bridge',
    title: 'Kabel Jembatan Gantung',
    tagline: 'Parabola Terbuka ke Atas (a > 0) & Definit Positif',
    emoji: '🌉',
    badgeColor: '#10B981',
    story:
      'Kabel utama jembatan gantung melengkung ke bawah lalu naik kembali ke menara seberang, membentuk parabola terbuka ke atas (a > 0). Insinyur harus memastikan titik terendah kabel (minimum) tetap aman di atas permukaan sungai (D < 0)!',
    equationLabel: 'y(x) = ax² + bx + c',
    defaultA: 0.25,
    defaultB: -2.0,
    defaultC: 5.0,
    minA: 0.1,
    maxA: 0.6,
    minB: -3.5,
    maxB: -0.5,
    minC: 2.5,
    maxC: 7.0,
    xLabel: 'Bentang Jembatan x (×10 m)',
    yLabel: 'Tinggi Kabel dari Sungai y (m)',
    pillars: [
      {
        pillar: 'Dekomposisi',
        description:
          'Uraikan jembatan menjadi tinggi menara kiri c, kekencangan kabel a, serta koordinat titik terendah kabel di tengah jembatan (xp, yp).',
        formulaHint: 'a > 0 → Kurva terbuka ke atas (titik minimum)',
      },
      {
        pillar: 'Pengenalan Pola',
        description:
          'Jika a > 0 dan diskriminan D < 0, maka seluruh kabel selalu berada di atas sumbu-X (y > 0) — disebut Definit Positif! Jembatan aman dari air.',
        formulaHint: 'a > 0 dan D < 0 → Kabel tidak menyentuh sungai',
      },
      {
        pillar: 'Abstraksi',
        description:
          'Struktur baja kompleks disederhanakan menjadi lengkungan kuadrat tunggal untuk menghitung panjang kawat vertikal penyangga jalan.',
        formulaHint: 'Jarak aman sungai = yp = -D / (4a)',
      },
      {
        pillar: 'Algoritma',
        description:
          '1) Pastikan a > 0 → 2) Cari tengah jembatan xp = -b/2a → 3) Hitung tinggi minimum yp → 4) Verifikasi yp > 0 (atau D < 0) agar kapal bisa melintas.',
        formulaHint: 'Jika yp ≤ 0, kabel menyentuh sungai (bahaya!)',
      },
    ],
  },
  {
    id: 'profit',
    title: 'Laba Usaha Kantin Sekolah',
    tagline: 'Optimasi Keuntungan Maksimum & Titik Impas (BEP)',
    emoji: '📊',
    badgeColor: '#F59E0B',
    story:
      'Tim kewirausahaan SMK menjual paket bento sekolah. Jika produksi terlalu sedikit, biaya tetap membuat rugi; jika terlalu banyak, bahan sisa dan diskon menurunkan laba. Fungsi kuadrat membantu mencari jumlah produksi paling untung!',
    equationLabel: 'L(x) = ax² + bx + c',
    defaultA: -0.5,
    defaultB: 4.0,
    defaultC: -2.0,
    minA: -0.9,
    maxA: -0.15,
    minB: 1.5,
    maxB: 5.5,
    minC: -4.0,
    maxC: 0.0,
    xLabel: 'Jumlah Paket x (×10 porsi)',
    yLabel: 'Keuntungan L (×Rp10 rb)',
    pillars: [
      {
        pillar: 'Dekomposisi',
        description:
          'Pisahkan fungsi laba menjadi biaya tetap awal c (negatif saat x = 0), pendapatan naik b·x, dan penyusutan efisiensi a·x².',
        formulaHint: 'c < 0 → Biaya modal awal sebelum jualan',
      },
      {
        pillar: 'Pengenalan Pola',
        description:
          'Dua titik potong sumbu-X (L = 0) adalah Titik Impas (Break-Even Point). Di antara kedua titik itulah usaha meraih untung (L > 0)!',
        formulaHint: 'D > 0 → Ada zona untung di antara 2 titik impas',
      },
      {
        pillar: 'Abstraksi',
        description:
          'Ragam menu dan operasional harian dirangkum ke dalam hubungan tunggal antara kuantitas x dan laba bersih L(x).',
        formulaHint: 'Laba Maksimum tercapai saat x = xp',
      },
      {
        pillar: 'Algoritma',
        description:
          '1) Susun fungsi L(x) → 2) Hitung produksi optimal xp = -b/2a → 3) Hitung laba puncak yp = L(xp) → 4) Cek D > 0 agar usaha layak jalan.',
        formulaHint: 'Jika D < 0 dan a < 0 → Usaha selalu rugi!',
      },
    ],
  },
];

export const CT_QUESTION_BANK: CtQuestion[] = [
  // DEKOMPOSISI
  {
    id: 'q-dek-1',
    pillar: 'Dekomposisi',
    theme: 'basket',
    contextBadge: '🏀 Lemparan Basket',
    prompt: 'Grafik lintasan bola basket memiliki persamaan h(x) = -0,5x² + 3x + 2. Berapakah ketinggian awal bola saat dilempar (x = 0)?',
    graph: { a: -0.5, b: 3, c: 2, highlightYIntercept: true, xMin: -1, xMax: 8, yMin: -1, yMax: 8 },
    options: ['2 meter', '3 meter', '6,5 meter', '0,5 meter'],
    correctIndex: 0,
    explanation: 'Tinggi awal terjadi saat x = 0, yaitu nilai konstanta c = 2 meter (titik potong sumbu-Y).',
  },
  {
    id: 'q-dek-2',
    pillar: 'Dekomposisi',
    theme: 'bridge',
    contextBadge: '🌉 Kabel Jembatan',
    prompt: 'Pada model kabel jembatan y = 0,25x² - 2x + 5, komponen manakah yang menyatakan tinggi menara jembatan di titik x = 0?',
    graph: { a: 0.25, b: -2, c: 5, highlightYIntercept: true, xMin: -1, xMax: 9, yMin: -1, yMax: 7 },
    options: ['Koefisien a = 0,25', 'Koefisien b = -2', 'Konstanta c = 5', 'Diskriminan D = -1'],
    correctIndex: 2,
    explanation: 'Saat x = 0, y(0) = c = 5. Jadi konstanta c langsung menunjukkan tinggi menara kiri di sumbu-Y!',
  },
  {
    id: 'q-dek-3',
    pillar: 'Dekomposisi',
    theme: 'profit',
    contextBadge: '📊 Laba Kantin SMK',
    prompt: 'Fungsi keuntungan kantin L(x) = -x² + 6x - 5 (dalam puluh ribu). Mengapa nilai konstanta c = -5 bernilai negatif?',
    graph: { a: -1, b: 6, c: -5, highlightYIntercept: true, xMin: -1, xMax: 7, yMin: -6, yMax: 6 },
    options: [
      'Menunjukkan biaya tetap / modal awal sebelum ada penjualan',
      'Menunjukkan keuntungan maksimum kantin',
      'Menunjukkan jumlah pembeli maksimum',
      'Menunjukkan grafik terbuka ke atas',
    ],
    correctIndex: 0,
    explanation: 'Saat x = 0 (belum ada barang terjual), L(0) = -5 artinya ada beban biaya modal awal sebesar Rp50.000.',
  },
  {
    id: 'q-dek-4',
    pillar: 'Dekomposisi',
    theme: 'fountain',
    contextBadge: '⛲ Air Mancur Taman',
    prompt: 'Dari bentuk puncak y = -0,5(x - 4)² + 6, koordinat titik puncak tertinggi semburan air mancur adalah...',
    graph: { a: -0.5, b: 4, c: -2, highlightVertex: true, xMin: -1, xMax: 9, yMin: -2, yMax: 8 },
    options: ['(-4, 6)', '(4, 6)', '(4, -6)', '(6, 4)'],
    correctIndex: 1,
    explanation: 'Pada bentuk puncak y = a(x - xp)² + yp, titik puncaknya langsung terbaca sebagai (xp, yp) = (4, 6).',
  },
  {
    id: 'q-dek-5',
    pillar: 'Dekomposisi',
    theme: 'rocket',
    contextBadge: '🚀 Roket Air IPA',
    prompt: 'Lintasan roket air dimodelkan h(t) = -2t² + 8t. Jika diuraikan, koefisien a, b, dan c berturut-turut adalah...',
    graph: { a: -2, b: 8, c: 0, highlightVertex: true, xMin: -1, xMax: 6, yMin: -1, yMax: 9 },
    options: ['a = -2, b = 8, c = 1', 'a = 2, b = 8, c = 0', 'a = -2, b = 8, c = 0', 'a = 8, b = -2, c = 0'],
    correctIndex: 2,
    explanation: 'Karena tidak ada suku konstanta tertulis, maka c = 0 (roket meluncur tepat dari permukaan tanah).',
  },

  // PENGENALAN POLA
  {
    id: 'q-pola-1',
    pillar: 'Pengenalan Pola',
    theme: 'bridge',
    contextBadge: '🌉 Kabel Jembatan Aman',
    prompt: 'Amati grafik kabel jembatan ini! Ia terbuka ke atas dan tidak pernah menyentuh sumbu-X (air sungai). Pola tanda a dan D yang benar adalah...',
    graph: { a: 0.3, b: -2.4, c: 6.3, hideEquation: true, xMin: -1, xMax: 9, yMin: -1, yMax: 8 },
    options: ['a > 0 dan D < 0', 'a > 0 dan D > 0', 'a < 0 dan D < 0', 'a < 0 dan D = 0'],
    correctIndex: 0,
    explanation: 'Terbuka ke atas berarti a > 0; tidak memotong sumbu-X berarti akar imajiner sehingga D < 0 (Definit Positif)!',
  },
  {
    id: 'q-pola-2',
    pillar: 'Pengenalan Pola',
    theme: 'fountain',
    contextBadge: '⛲ Pola Simetri Air',
    prompt: 'Air mancur keluar dari tanah di x = 0 dan mencapai tinggi puncak di x = 3,5 m. Dengan pola simetri parabola, di jarak berapa air menyentuh tanah lagi?',
    graph: { a: -0.4, b: 2.8, c: 0, highlightVertex: true, highlightRoots: true, hideEquation: true, xMin: -1, xMax: 9, yMin: -1, yMax: 7 },
    options: ['x = 5,5 m', 'x = 6,0 m', 'x = 7,0 m', 'x = 8,0 m'],
    correctIndex: 2,
    explanation: 'Parabola selalu simetris terhadap x = xp! Karena jarak kiri 0 ke 3,5 adalah 3,5 m, jarak kanan juga 3,5 m → 3,5 + 3,5 = 7,0 m.',
  },
  {
    id: 'q-pola-3',
    pillar: 'Pengenalan Pola',
    theme: 'basket',
    contextBadge: '🏀 Pengaruh Koefisien a',
    prompt: 'Grafik f(x) = -2x² + 8x dibanding g(x) = -0,5x² + 2x. Pola manakah yang benar tentang bentuk kedua lengkungan?',
    graph: { a: -0.5, b: 3, c: 0, hideEquation: true, xMin: -1, xMax: 7, yMin: -1, yMax: 7 },
    options: [
      'f(x) lebih sempit/curam karena |a| = 2 lebih besar dari 0,5',
      'f(x) terbuka ke atas sedangkan g(x) ke bawah',
      'g(x) lebih sempit karena 0,5 lebih kecil dari 2',
      'Keduanya memiliki lebar lengkungan yang sama persis',
    ],
    correctIndex: 0,
    explanation: 'Semakin besar nilai mutlak |a|, parabola semakin kurus/curam; semakin kecil |a|, lengkungan semakin melebar.',
  },
  {
    id: 'q-pola-4',
    pillar: 'Pengenalan Pola',
    theme: 'profit',
    contextBadge: '📊 Pola Diskriminan D',
    prompt: 'Kurva keuntungan usaha tepat menyinggung sumbu-X hanya di 1 titik puncaknya (terbuka ke bawah). Nilai Diskriminan D adalah...',
    graph: { a: -0.4, b: 3.2, c: -6.4, highlightRoots: true, hideEquation: true, xMin: -1, xMax: 9, yMin: -5, yMax: 3 },
    options: ['D > 0 (memotong 2 titik)', 'D = 0 (menyinggung 1 titik)', 'D < 0 (melayang)', 'Tidak dapat ditentukan'],
    correctIndex: 1,
    explanation: 'Grafik menyinggung sumbu-X tepat di 1 titik (akar kembar) selalu memiliki pola Diskriminan D = 0.',
  },
  {
    id: 'q-pola-5',
    pillar: 'Pengenalan Pola',
    theme: 'rocket',
    contextBadge: '🚀 Memotong Sumbu-X',
    prompt: 'Amati grafik lintasan roket air di layar! Terbuka ke bawah dan memotong sumbu-X di 2 titik berbeda. Pola a dan D adalah...',
    graph: { a: -0.5, b: 3.5, c: -1.5, highlightRoots: true, hideEquation: true, xMin: -1, xMax: 8, yMin: -2, yMax: 6 },
    options: ['a > 0 dan D > 0', 'a < 0 dan D = 0', 'a < 0 dan D > 0', 'a < 0 dan D < 0'],
    correctIndex: 2,
    explanation: 'Melengkung ke bawah → a < 0. Memotong sumbu-X di 2 titik nyata → Diskriminan D > 0!',
  },
  {
    id: 'q-pola-6',
    pillar: 'Pengenalan Pola',
    theme: 'bridge',
    contextBadge: '🌉 Pergeseran Sumbu Simetri',
    prompt: 'Pada parabola terbuka ke atas (a > 0) dengan puncak berada di sebelah KANAN sumbu-Y (xp > 0), bagaimana tanda koefisien b?',
    graph: { a: 0.4, b: -3.2, c: 7.4, highlightVertex: true, hideEquation: true, xMin: -1, xMax: 9, yMin: -1, yMax: 8 },
    options: ['b < 0 (tanda b berlawanan dengan a)', 'b > 0 (tanda b sama dengan a)', 'b = 0 (puncak di sumbu-Y)', 'b selalu sama dengan c'],
    correctIndex: 0,
    explanation: 'Ingat rumus xp = -b / (2a). Supaya xp > 0 saat a > 0, maka -b harus positif → artinya b < 0!',
  },

  // ABSTRAKSI
  {
    id: 'q-abs-1',
    pillar: 'Abstraksi',
    theme: 'basket',
    contextBadge: '🏀 Pemodelan Lemparan',
    prompt: 'Bola dilempar dari tanah (0,0) mencapai tinggi maksimum 4 m saat jarak mendatar 2 m. Model fungsi kuadrat paling tepat adalah...',
    graph: { a: -1, b: 4, c: 0, highlightVertex: true, hideEquation: true, xMin: -1, xMax: 6, yMin: -1, yMax: 6 },
    options: ['h(x) = -(x - 2)² + 4', 'h(x) = (x - 2)² + 4', 'h(x) = -(x + 2)² + 4', 'h(x) = -(x - 4)² + 2'],
    correctIndex: 0,
    explanation: 'Puncak di (2, 4) dan terbuka ke bawah → h(x) = a(x - 2)² + 4. Substitusi (0,0): 0 = 4a + 4 → a = -1!',
  },
  {
    id: 'q-abs-2',
    pillar: 'Abstraksi',
    theme: 'fountain',
    contextBadge: '⛲ Pemodelan Nosel',
    prompt: 'Air mancur memancar dari (0, 0) dan jatuh di (6, 0). Jika di abstraksikan dalam bentuk faktor pembuat nol, fungsinya berbentuk...',
    graph: { a: -0.5, b: 3, c: 0, highlightRoots: true, hideEquation: true, xMin: -1, xMax: 8, yMin: -1, yMax: 6 },
    options: ['y = a · x(x + 6) dengan a < 0', 'y = a · x(x - 6) dengan a < 0', 'y = a · (x - 6)² dengan a > 0', 'y = a · x(x - 6) dengan a > 0'],
    correctIndex: 1,
    explanation: 'Akar-akar di x₁ = 0 dan x₂ = 6 memberi y = a(x - 0)(x - 6) = a·x(x - 6), dengan a < 0 karena melengkung ke atas lalu turun.',
  },
  {
    id: 'q-abs-3',
    pillar: 'Abstraksi',
    theme: 'profit',
    contextBadge: '📊 Pemodelan Bisnis',
    prompt: 'Manakah informasi yang BOLEH diabaikan (proses abstraksi CT) saat membuat model fungsi kuadrat tinggi lemparan peluru?',
    graph: { a: -0.35, b: 2.8, c: 1.5, highlightVertex: true, xMin: -1, xMax: 9, yMin: -1, yMax: 8 },
    options: [
      'Ketinggian awal tangan pelempar (c)',
      'Jarak mendatar puncak (xp)',
      'Warna seragam dan merek sepatu atlet',
      'Tinggi maksimum peluru (yp)',
    ],
    correctIndex: 2,
    explanation: 'Abstraksi CT menyaring detail tidak relevan (warna baju/sepatu) agar fokus pada variabel matematis (x, y, a, b, c).',
  },
  {
    id: 'q-abs-4',
    pillar: 'Abstraksi',
    theme: 'bridge',
    contextBadge: '🌉 Model Kabel Minimum',
    prompt: 'Kabel jembatan melengkung terbuka ke atas dengan titik terendah di (3, 2) dan melewati (5, 4). Nilai koefisien a adalah...',
    graph: { a: 0.5, b: -3, c: 6.5, highlightVertex: true, hideEquation: true, xMin: -1, xMax: 7, yMin: -1, yMax: 8 },
    options: ['a = 0,5', 'a = -0,5', 'a = 1', 'a = 2'],
    correctIndex: 0,
    explanation: 'Model: y = a(x - 3)² + 2. Masukkan titik (5, 4): 4 = a(5 - 3)² + 2 → 2 = 4a → a = 0,5!',
  },

  // ALGORITMA
  {
    id: 'q-alg-1',
    pillar: 'Algoritma',
    theme: 'rocket',
    contextBadge: '🚀 Hitung Sumbu Simetri',
    prompt: 'Roket air meluncur sesuai h(t) = -t² + 8t + 1. Pada detik ke berapa (xp) roket mencapai titik tertinggi?',
    graph: { a: -1, b: 8, c: 1, highlightVertex: true, xMin: -1, xMax: 9, yMin: -1, yMax: 18 },
    options: ['t = 2 detik', 't = 4 detik', 't = 8 detik', 't = 16 detik'],
    correctIndex: 1,
    explanation: 'Algoritma sumbu simetri: xp = -b / (2a) = -8 / (2 × -1) = -8 / -2 = 4 detik!',
  },
  {
    id: 'q-alg-2',
    pillar: 'Algoritma',
    theme: 'profit',
    contextBadge: '📊 Hitung Laba Maksimum',
    prompt: 'Keuntungan harian stan bazar mengikuti L(x) = -x² + 6x + 3 (dalam puluh ribu). Berapakah laba maksimumnya (yp)?',
    graph: { a: -1, b: 6, c: 3, highlightVertex: true, xMin: -1, xMax: 7, yMin: -1, yMax: 14 },
    options: ['Rp90.000 (yp = 9)', 'Rp120.000 (yp = 12)', 'Rp60.000 (yp = 6)', 'Rp150.000 (yp = 15)'],
    correctIndex: 1,
    explanation: 'Langkah 1: xp = -6 / (2 × -1) = 3. Langkah 2: yp = -(3)² + 6(3) + 3 = -9 + 18 + 3 = 12 (Rp120.000)!',
  },
  {
    id: 'q-alg-3',
    pillar: 'Algoritma',
    theme: 'bridge',
    contextBadge: '🌉 Hitung Titik Terendah',
    prompt: 'Kabel jembatan memiliki persamaan y = x² - 6x + 11. Berapa meter ketinggian minimum kabel dari permukaan sungai?',
    graph: { a: 1, b: -6, c: 11, highlightVertex: true, xMin: -1, xMax: 7, yMin: -1, yMax: 12 },
    options: ['1 meter', '2 meter', '3 meter', '5 meter'],
    correctIndex: 1,
    explanation: 'Langkah 1: xp = -(-6)/(2·1) = 3. Langkah 2: yp = 3² - 6(3) + 11 = 9 - 18 + 11 = 2 meter!',
  },
  {
    id: 'q-alg-4',
    pillar: 'Algoritma',
    theme: 'fountain',
    contextBadge: '⛲ Cek Diskriminan',
    prompt: 'Diketahui fungsi f(x) = x² - 4x + 4. Hitung Diskriminan D = b² - 4ac dan tentukan jumlah titik potong sumbu-X!',
    graph: { a: 1, b: -4, c: 4, highlightRoots: true, xMin: -1, xMax: 6, yMin: -1, yMax: 7 },
    options: ['D = 0 (1 titik singgung)', 'D = 16 (2 titik potong)', 'D = -16 (tidak memotong)', 'D = 8 (2 titik potong)'],
    correctIndex: 0,
    explanation: 'D = (-4)² - 4(1)(4) = 16 - 16 = 0. Karena D = 0, kurva menyinggung sumbu-X tepat di 1 titik (2, 0).',
  },
  {
    id: 'q-alg-5',
    pillar: 'Algoritma',
    theme: 'basket',
    contextBadge: '🏀 Cek Ketinggian Ring',
    prompt: 'Lintasan bola adalah h(x) = -0,5x² + 4x + 1. Berapakah tinggi bola saat melewati jarak x = 2 meter?',
    graph: { a: -0.5, b: 4, c: 1, xMin: -1, xMax: 9, yMin: -1, yMax: 10 },
    options: ['5 meter', '7 meter', '8 meter', '9 meter'],
    correctIndex: 1,
    explanation: 'Substitusi x = 2: h(2) = -0,5(2²) + 4(2) + 1 = -0,5(4) + 8 + 1 = -2 + 9 = 7 meter!',
  },
  {
    id: 'q-alg-6',
    pillar: 'Algoritma',
    theme: 'rocket',
    contextBadge: '🚀 Waktu Kembali ke Tanah',
    prompt: 'Roket mainan terbang dengan h(t) = -t² + 5t. Pada detik ke berapa roket mendarat kembali di tanah (h = 0)?',
    graph: { a: -1, b: 5, c: 0, highlightRoots: true, xMin: -1, xMax: 7, yMin: -1, yMax: 8 },
    options: ['t = 2,5 detik', 't = 5 detik', 't = 10 detik', 't = 4 detik'],
    correctIndex: 1,
    explanation: 'Faktorkan h(t) = 0 → t(-t + 5) = 0 → t = 0 (awal) atau t = 5 detik (saat mendarat)!',
  },
  {
    id: 'q-alg-7',
    pillar: 'Algoritma',
    theme: 'profit',
    contextBadge: '📊 Hitung Sumbu Simetri',
    prompt: 'Fungsi laba kedai kopi siswa L(x) = -2x² + 12x - 10. Berapa paket x yang harus dijual agar laba maksimum?',
    graph: { a: -2, b: 12, c: -10, highlightVertex: true, xMin: -1, xMax: 7, yMin: -4, yMax: 10 },
    options: ['x = 2 paket', 'x = 3 paket', 'x = 6 paket', 'x = 4 paket'],
    correctIndex: 1,
    explanation: 'Sumbu simetri xp = -b / (2a) = -12 / (2 × -2) = -12 / -4 = 3 paket!',
  },
];

/** Shuffle array using Fisher-Yates and randomize option ordering while preserving correctIndex */
export function buildShuffledQuestions(): CtQuestion[] {
  const copy = [...CT_QUESTION_BANK];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.map((q) => {
    const indexed = q.options.map((text, idx) => ({ text, isCorrect: idx === q.correctIndex }));
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
    }
    return {
      ...q,
      options: indexed.map((item) => item.text),
      correctIndex: indexed.findIndex((item) => item.isCorrect),
    };
  });
}
