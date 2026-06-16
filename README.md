# Tani Tap

Prototype awal game **clicker/idle kebun WAP-style** berdasarkan GDD Tani Tap.

## Isi MVP

- Lahan 2×4, 4 kotak awal terbuka dan 4 kotak bisa dibeli.
- Loop inti: garap tanah → tanam → siram → panen → jual → upgrade.
- Starter pack: 10 Bibit Bayam, Cangkul, Penyiram Dasar.
- Sistem kualitas 0–100 dengan tier Layu, Segar, Premium.
- Toko benih, penyiram, pupuk, dan lahan.
- Autosave memakai `localStorage` browser.

## Cara jalanin

Cukup buka `index.html` di browser.

Atau pakai server lokal sederhana:

```bash
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080`.

## Catatan pengembangan berikutnya

- Tambah backend akun/user agar idle progress tidak cuma lokal.
- Tambah misi harian, login streak, dan visit kebun teman.
- Tambah sprite ringan selain emoji kalau visual sudah final.
- Balancing durasi bisa dibuat lebih cepat untuk testing lewat config dev.
