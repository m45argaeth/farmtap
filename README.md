# 🌱 Tani Tap — Clicker Kebun (WAP)

Game bertani clicker/idle ringan, jalan 100% di browser (HTML + CSS + vanilla JS).
Semua progress disimpan lokal di `localStorage`.

## Cara main
1. Buka `index.html` di browser.
2. Klik kotak **tanah mentah** buat digarap (5 detik) → jadi **siap tanam**.
3. Pilih bibit di toko, klik kotak kosong buat **menanam**.
4. **Siram** di jendela 25% / 50% / 75% biar kualitas tetap tinggi.
5. **Panen** pas matang, lalu **Jual Semua** di gudang.

## Ekonomi & balancing
- **Tanaman**: Bayam, Sawi, Kangkung, Wortel, Cabai (makin tinggi level makin mahal & lama tapi cuan).
- **Kualitas**: ≥80 Premium ⭐⭐⭐ (×1.5), ≥50 Segar ⭐⭐ (×1.0), sisanya Layu ⭐ (×0.6).
- **Penyiram** (Dasar → Emas): tiap siram mempercepat tumbuh.
- **Pupuk** (Kandang → Super): mempercepat tumbuh + memberi **buffer kualitas**.

### Aturan waktu tumbuh (sudah diperbaiki)
- Pupuk memotong durasi awal hingga **-30%**.
- Siraman menambah potongan, **maks -30%** dari siraman saja.
- **Gabungan pupuk + siram dibatasi total -50%** dari waktu dasar.
- **Jendela siram dihitung dari durasi terencana saat tanam** (tetap, tidak geser saat disiram).

### Buffer kualitas pupuk (sudah diperbaiki)
- Tiap tanaman mulai dari kualitas 100.
- Telat siram = -20 kualitas per jendela.
- Bonus kualitas pupuk (+10) jadi **perisai**: menyerap penalti telat siram lebih dulu, jadi pupuk benar-benar menjaga kualitas.

## Level pemain (formula dibuka)
- `Level = floor(Reputasi / 12) + 1`.
- Tiap panen menambah Reputasi sebesar level tanaman.
- Bibit terkunci menampilkan level minimal di toko.

## Fitur baru
- **📅 Misi harian**: 3 misi acak harian (panen/siram/tanam/jual/visit). Klaim untuk koin/permata.
- **🔥 Login streak**: makin rajin login makin besar bonus; tiap 5 hari dapat permata.
- **📖 Koleksi (Pokedex)**: tiap jenis tanaman yang dipanen ke-discover. Tiap jenis +1% harga jual, lengkap = +10% & bonus permata.
- **💎 Permata**: mata uang premium dari misi/streak/koleksi. Dipakai buat **skip waktu** (tombol ⚡ di kotak) & dekorasi premium.
- **🤖 Otomatisasi**: **Springkler** (auto-siram, jaga kualitas walau ditinggal) & **Robot Panen** (auto-panen ke gudang).
- **📦 Gudang**: kapasitas terbatas, bisa di-upgrade bertingkat. Panen berhenti kalau gudang penuh.
- **🌷 Dekorasi**: hiasan kosmetik (pagar, jalan, pohon, bunga, kolam) yang nambah reputasi.
- **🌾 Sosial**: kunjungi kebun teman buat bantu siram (bonus harian) + **leaderboard**.

> Catatan: fitur sosial & leaderboard saat ini **simulasi lokal** (NPC), belum ada server/multiplayer beneran.

## Struktur file
- `index.html` — markup & layout.
- `styles.css` — tema & responsif (mobile-first WAP).
- `main.js` — seluruh logika game.

## Reset
Tombol **Reset** di pojok kanan atas menghapus save lokal.
